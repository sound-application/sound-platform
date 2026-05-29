/**
 * Sound Platform — onAudioContentPublished Cloud Function
 * ========================================================
 * Phase:   8-G (Audio Captions Pipeline Foundation)
 * Updated: 2026-05-28
 *
 * Trigger: Firestore document written on contentItems/{contentId}
 *
 * Fires when a content item is published with an audio asset.
 * Runs the REAL processing pipeline:
 *   1. Mark as processing
 *   2. Download original from Storage to /tmp
 *   3. Probe input (validate audio, get metadata)
 *   4. Transcode to AAC/M4A at 128kbps, 44.1kHz (loudnorm best-effort)
 *   5. Extract real waveform peaks from transcoded audio
 *   6. Upload master.m4a to audioProcessed/{uid}/{contentId}/master/
 *   7. Upload waveform.json to audioProcessed/{uid}/{contentId}/waveform/
 *   8. Update Firestore: processedAudio, waveform, status=ready
 *
 * IDEMPOTENCY:
 *   - Only runs when contentProcessingStatus === 'uploaded'
 *   - Skips if processing already started (processing/ready/failed/originalFallback)
 *   - The trigger writes back to the same document, but the idempotency check
 *     prevents infinite re-trigger loops
 *
 * FAILURE:
 *   - Sets contentProcessingStatus = 'failed' with safe error message
 *   - Original upload is NOT deleted — original fallback remains available
 *   - /tmp files cleaned up in finally block
 *
 * RESOURCE CONFIG:
 *   - Memory: 1 GiB (audio transcoding + PCM waveform extraction)
 *   - Timeout: 540s (9 min max for event-driven v2 functions)
 */

import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import * as admin from 'firebase-admin';
import * as logger from 'firebase-functions/logger';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';
import { probeAudio, transcodeToAAC, extractWaveformPeaks, transcodeWithEffects, applyMixingMaster, applyTrimCut } from '../processing/audioProcessor';

// ── Types from shared ────────────────────────────────────────────────────
import type { ProcessedAudioMeta, WaveformData, AudioEffectsConfig, AudioMixingConfig, AudioEditConfig } from '@sound/shared';
import { buildEffectsChain, getRequestedFilterIds, getMixingMasterOps, buildMixingFFmpegChain } from '@sound/shared';

// ── Provider registry ──────────────────────────────────────────────────
import { resolveProvider } from '../helpers/providerRegistry';

export const onAudioContentPublished = onDocumentWritten(
  {
    document: 'contentItems/{contentId}',
    memory: '1GiB',
    timeoutSeconds: 540,
  },
  async (event) => {
    const contentId = event.params.contentId;
    const afterSnap = event.data?.after;

    // ── Guard: document must exist after the write ────────────────────────
    if (!afterSnap?.exists) {
      return;
    }

    const data = afterSnap.data();
    if (!data) return;

    // ── Guard: must be published with an audio asset ─────────────────────
    if (data.status !== 'published') return;

    const storagePath = data.audioAsset?.storagePath as string | undefined;
    if (!storagePath) return;

    // ── IDEMPOTENCY: only process when status is 'uploaded' ──────────────
    if (data.contentProcessingStatus !== 'uploaded') return;

    const ownerUid = data.ownerUid as string;
    const db = admin.firestore();
    const storage = admin.storage();
    const docRef = db.collection('contentItems').doc(contentId);
    const bucket = storage.bucket();

    // Temp file paths
    const tmpDir = os.tmpdir();
    const originalExt = path.extname(storagePath) || '.audio';
    const tmpOriginal = path.join(tmpDir, `${contentId}_original${originalExt}`);
    const tmpMaster = path.join(tmpDir, `${contentId}_master.m4a`);

    try {
      // ── Step 1: Mark as processing ─────────────────────────────────────
      const processingStartedAt = new Date().toISOString();
      logger.info(`[8F-pipeline] ${contentId}: processing started.`, { storagePath });
      await docRef.update({
        contentProcessingStatus: 'processing',
        processingStartedAt,
      });

      // ── Step 2: Download original from Storage to /tmp ─────────────────
      logger.info(`[8F-pipeline] ${contentId}: downloading original.`);
      await bucket.file(storagePath).download({ destination: tmpOriginal });

      const originalStat = fs.statSync(tmpOriginal);
      logger.info(`[8F-pipeline] ${contentId}: downloaded ${originalStat.size} bytes.`);

      if (originalStat.size === 0) {
        throw new Error('Downloaded file is empty (0 bytes).');
      }

      // ── Step 3: Probe input ────────────────────────────────────────────
      logger.info(`[8F-pipeline] ${contentId}: probing input.`);
      const probe = await probeAudio(tmpOriginal);
      logger.info(`[8F-pipeline] ${contentId}: probe result.`, {
        durationMs: probe.durationMs,
        codec: probe.codec,
        sampleRate: probe.sampleRate,
        channels: probe.channels,
        bitrate: probe.bitrate,
        format: probe.formatName,
      });

      // Validate: must have audio data
      if (probe.durationMs < 100) {
        throw new Error(`Audio too short or unreadable: ${probe.durationMs}ms.`);
      }

      // ── Step 3b: Trim/Cut (Phase 8-L) ──────────────────────────────────────
      // Processing order: original → trim/cut → effects → mixing → waveform
      // If trim/cut is enabled and FAILS, the pipeline STOPS.
      // User intent: publishing the uncut original after edit failure is misleading.
      const editConfig = data.editConfig as AudioEditConfig | undefined;
      let editResult: { editApplied: boolean; editedDurationMs?: number; error?: string } | null = null;

      if (editConfig?.enabled) {
        const hasTrim = (editConfig.trimStartMs && editConfig.trimStartMs > 0) ||
                        (editConfig.trimEndMs && editConfig.trimEndMs > 0 && editConfig.trimEndMs < probe.durationMs);
        const hasCuts = editConfig.cuts && editConfig.cuts.length > 0;

        if (hasTrim || hasCuts) {
          const tmpTrimmed = path.join(tmpDir, `${contentId}_trimmed.m4a`);
          logger.info(`[8L-pipeline] ${contentId}: applying trim/cut edits.`, {
            trimStartMs: editConfig.trimStartMs,
            trimEndMs: editConfig.trimEndMs,
            cuts: editConfig.cuts?.length ?? 0,
          });

          const trimConfig = {
            trimStartMs: editConfig.trimStartMs,
            trimEndMs: editConfig.trimEndMs && editConfig.trimEndMs < probe.durationMs ? editConfig.trimEndMs : undefined,
            cuts: editConfig.cuts,
          };
          editResult = await applyTrimCut(tmpOriginal, tmpTrimmed, trimConfig);

          if (editResult.editApplied) {
            // Replace original with trimmed version for subsequent pipeline steps
            fs.copyFileSync(tmpTrimmed, tmpOriginal);
            fs.unlinkSync(tmpTrimmed);
            // Update probe duration to reflect trimmed audio
            probe.durationMs = editResult.editedDurationMs ?? probe.durationMs;
            logger.info(`[8L-pipeline] ${contentId}: trim/cut applied. New duration: ${probe.durationMs}ms.`);
          } else {
            // CRITICAL: Trim/cut failure STOPS the pipeline.
            // Do NOT fall back to unedited original.
            logger.error(`[8L-pipeline] ${contentId}: trim/cut FAILED. Stopping pipeline.`, {
              error: editResult.error,
            });
            const failTimestamp = new Date().toISOString();
            await docRef.update({
              contentProcessingStatus: 'failed',
              processingCompletedAt: failTimestamp,
              'editConfig.editStatus': 'failed',
              'editConfig.appliedAt': failTimestamp,
              'editConfig.processingError': (editResult.error || 'فشل قص/تعديل الصوت').slice(0, 500),
            });
            // Clean up temp files
            try { if (fs.existsSync(tmpTrimmed)) fs.unlinkSync(tmpTrimmed); } catch { /* ignore */ }
            return; // STOP pipeline
          }
        } else {
          // Edit enabled but no actual trim/cut values
          logger.info(`[8L-pipeline] ${contentId}: edit enabled but no trim/cut values specified.`);
          editResult = { editApplied: false };
        }
      }

      // ── Step 4: Transcode to AAC/M4A (with effects if configured) ──────
      const effectsConfig = data.effectsConfig as AudioEffectsConfig | undefined;
      const effectsChain = effectsConfig?.enabled ? buildEffectsChain(effectsConfig) : null;
      const requestedFilterIds = effectsConfig?.enabled ? getRequestedFilterIds(effectsConfig) : [];

      let transcode;
      let effectsResult: { effectsApplied: boolean; appliedFilters: string[]; skippedFilters: string[]; effectsError?: string } | null = null;

      if (effectsChain) {
        // Effects enabled — use effects transcoder
        logger.info(`[8J-pipeline] ${contentId}: transcoding with effects.`, {
          mode: effectsConfig!.mode,
          presetId: effectsConfig!.selectedPresetId,
          filterCount: requestedFilterIds.length,
        });
        const result = await transcodeWithEffects(tmpOriginal, tmpMaster, effectsChain, requestedFilterIds);
        transcode = result;
        effectsResult = {
          effectsApplied: result.effectsApplied,
          appliedFilters: result.appliedFilters,
          skippedFilters: result.skippedFilters,
          effectsError: result.effectsError,
        };
      } else {
        // No effects — base transcode (Phase 8-F path, unchanged)
        logger.info(`[8F-pipeline] ${contentId}: transcoding to AAC/M4A.`);
        transcode = await transcodeToAAC(tmpOriginal, tmpMaster);
      }

      logger.info(`[8F-pipeline] ${contentId}: transcode complete.`, {
        sizeBytes: transcode.sizeBytes,
        durationMs: transcode.durationMs,
        codec: transcode.codec,
        bitrate: transcode.bitrate,
        loudnessLufs: transcode.loudnessLufs,
        effectsApplied: effectsResult?.effectsApplied ?? false,
      });

      // ── Step 4b: Mixing master adjustments (Phase 8-K) ──────────────────
      // Order: original → effects → mixing/master adjustments → waveform → upload
      // Only renders voice-only ops (volume, gain, fades).
      // Multi-track mixing with actual layers is deferred.
      const mixingConfig = data.mixingConfig as AudioMixingConfig | undefined;
      let mixingResult: { mixApplied: boolean; appliedOperations: string[]; error?: string } | null = null;

      if (mixingConfig?.enabled) {
        const mixOps = getMixingMasterOps(mixingConfig);

        if (mixOps.hasRenderableOps) {
          const mixChain = buildMixingFFmpegChain(mixOps, transcode.durationMs);
          if (mixChain) {
            logger.info(`[8K-pipeline] ${contentId}: applying mixing master adjustments.`, {
              operations: mixOps.operationLabels,
              chain: mixChain,
              hasDeferredLayers: mixOps.hasDeferredLayers,
            });
            mixingResult = await applyMixingMaster(tmpMaster, mixChain, mixOps.operationLabels);
          } else {
            logger.info(`[8K-pipeline] ${contentId}: mixing enabled but filter chain is empty.`);
            mixingResult = { mixApplied: false, appliedOperations: [], error: undefined };
          }
        } else {
          logger.info(`[8K-pipeline] ${contentId}: mixing enabled but no renderable ops.`, {
            hasDeferredLayers: mixOps.hasDeferredLayers,
          });
          mixingResult = { mixApplied: false, appliedOperations: [] };
        }
      }

      // ── Step 5: Extract real waveform peaks ────────────────────────────
      logger.info(`[8F-pipeline] ${contentId}: extracting waveform.`);
      const peaks = await extractWaveformPeaks(tmpMaster, 200);
      logger.info(`[8F-pipeline] ${contentId}: waveform extracted (${peaks.length} peaks).`);

      // ── Step 6: Upload master.m4a ──────────────────────────────────────
      const masterStoragePath = `audioProcessed/${ownerUid}/${contentId}/master/master.m4a`;
      logger.info(`[8F-pipeline] ${contentId}: uploading master.`, { masterStoragePath });
      await bucket.upload(tmpMaster, {
        destination: masterStoragePath,
        metadata: {
          contentType: 'audio/mp4',
          metadata: {
            processedBy: 'phase-8F-pipeline',
            sourceOriginalPath: storagePath,
            processedAt: new Date().toISOString(),
          },
        },
      });

      // ── Step 7: Upload waveform.json ───────────────────────────────────
      const waveformStoragePath = `audioProcessed/${ownerUid}/${contentId}/waveform/waveform.json`;
      const waveformJson = JSON.stringify({ peaks, pointsCount: peaks.length, sampleRate: 8000 });
      const tmpWaveform = path.join(tmpDir, `${contentId}_waveform.json`);
      fs.writeFileSync(tmpWaveform, waveformJson, 'utf-8');
      await bucket.upload(tmpWaveform, {
        destination: waveformStoragePath,
        metadata: {
          contentType: 'application/json',
          metadata: { processedBy: 'phase-8F-pipeline' },
        },
      });

      // ── Step 8: Update Firestore ───────────────────────────────────────
      const processingCompletedAt = new Date().toISOString();

      const processedAudio: ProcessedAudioMeta = {
        storagePath: masterStoragePath,
        mimeType: transcode.mimeType,
        sizeBytes: transcode.sizeBytes,
        durationMs: transcode.durationMs,
        bitrate: transcode.bitrate,
        codec: transcode.codec,
        loudnessLufs: transcode.loudnessLufs,
        createdAt: processingCompletedAt,
        sourceOriginalPath: storagePath,
      };

      const waveform: WaveformData = {
        status: 'ready',
        peaks,
        pointsCount: peaks.length,
        sampleRate: 8000,
        synthetic: false,
        generatedAt: processingCompletedAt,
      };

      const firestoreUpdate: Record<string, unknown> = {
        contentProcessingStatus: 'ready',
        processingCompletedAt,
        processedAudio,
        waveform,
        moderationStatus: 'approved', // dev auto-approve
      };

      // Phase 8-J: Write effects applied status
      if (effectsResult) {
        const effectsAppliedAt = new Date().toISOString();
        if (effectsResult.effectsApplied) {
          firestoreUpdate['effectsConfig.appliedStatus'] = 'applied';
          firestoreUpdate['effectsConfig.appliedAt'] = effectsAppliedAt;
          firestoreUpdate['effectsConfig.appliedFilters'] = effectsResult.appliedFilters;
          firestoreUpdate['effectsConfig.skippedFilters'] = [];
        } else {
          // Effects failed but base processing succeeded — content is still ready
          firestoreUpdate['effectsConfig.appliedStatus'] = 'failed';
          firestoreUpdate['effectsConfig.appliedAt'] = effectsAppliedAt;
          firestoreUpdate['effectsConfig.appliedFilters'] = [];
          firestoreUpdate['effectsConfig.skippedFilters'] = effectsResult.skippedFilters;
          firestoreUpdate['effectsConfig.processingError'] = effectsResult.effectsError?.slice(0, 500) || 'فشل تطبيق المؤثرات';
        }
      } else if (effectsConfig?.enabled) {
        firestoreUpdate['effectsConfig.appliedStatus'] = 'notApplied';
      }

      // Phase 8-K: Write mixing render status
      if (mixingResult) {
        const mixRenderedAt = new Date().toISOString();
        if (mixingResult.mixApplied) {
          firestoreUpdate['mixingConfig.renderStatus'] = 'applied';
          firestoreUpdate['mixingConfig.renderedAt'] = mixRenderedAt;
          firestoreUpdate['mixingConfig.appliedOperations'] = mixingResult.appliedOperations;
        } else if (mixingResult.error) {
          // Mixing failed but base/effects processing succeeded — content still ready
          firestoreUpdate['mixingConfig.renderStatus'] = 'failed';
          firestoreUpdate['mixingConfig.renderedAt'] = mixRenderedAt;
          firestoreUpdate['mixingConfig.appliedOperations'] = [];
          firestoreUpdate['mixingConfig.processingError'] = mixingResult.error.slice(0, 500);
        } else {
          // No renderable ops (settings saved but no volume/fade changes, or only deferred layers)
          firestoreUpdate['mixingConfig.renderStatus'] = 'pending';
        }
      } else if (mixingConfig?.enabled) {
        firestoreUpdate['mixingConfig.renderStatus'] = 'pending';
      }

      // Phase 8-L: Write edit status
      if (editResult) {
        const editTimestamp = new Date().toISOString();
        if (editResult.editApplied) {
          firestoreUpdate['editConfig.editStatus'] = 'applied';
          firestoreUpdate['editConfig.appliedAt'] = editTimestamp;
          firestoreUpdate['editConfig.editedDurationMs'] = editResult.editedDurationMs;
        } else {
          // No renderable edits (edit enabled but no trim/cut values)
          firestoreUpdate['editConfig.editStatus'] = 'pending';
        }
      } else if (editConfig?.enabled) {
        firestoreUpdate['editConfig.editStatus'] = 'pending';
      }

      await docRef.update(firestoreUpdate);

      logger.info(
        `[8F-pipeline] ${contentId}: audio processing COMPLETE. ` +
        `status=ready, source=processed, waveform=real (${peaks.length} peaks), ` +
        `master=${transcode.sizeBytes} bytes, duration=${transcode.durationMs}ms.`,
      );

      // ── Phase 8-G: Captions pipeline ──────────────────────────────────────
      // Run AFTER audio processing succeeds.
      // Captions failure does NOT change contentProcessingStatus.

      // Phase 8-H.1: If creator authored captions, skip provider pipeline entirely.
      // Creator captions are already set to 'ready' by createAudioContentFromDraft.
      if (data.captionsData?.segments?.length) {
        logger.info(
          `[8G-captions] ${contentId}: creator-authored captions present ` +
          `(${data.captionsData.segments.length} segments, source=${data.captionsData.source}). ` +
          `Skipping provider pipeline.`,
        );
      } else {
        const captionsRequested = data.captionsProcessing?.status === 'requested';

      if (captionsRequested) {
        logger.info(`[8G-captions] ${contentId}: captions requested, starting pipeline.`);

        try {
          const captionsStartedAt = new Date().toISOString();
          await docRef.update({
            'captionsProcessing.status': 'processing',
            'captionsProcessing.startedAt': captionsStartedAt,
            'captionsProcessing.style': data.captionsSetup?.style || 'standard',
          });

          // ── Provider check via registry ─────────────────────────────
          // Phase 8-H.0: use provider registry instead of hardcoded check.
          // To activate: seed providerConfigs + set env vars.
          const providerResult = await resolveProvider('audio.transcription');

          if (!providerResult.available) {
            await docRef.update({
              'captionsProcessing.status': 'pendingProvider',
              'captionsProcessing.completedAt': new Date().toISOString(),
              'captionsProcessing.error': providerResult.errorMessage || 'مزود النسخ غير متوفر حالياً',
              'captionsProcessing.errorCode': providerResult.errorCode || 'PROVIDER_CONFIG_MISSING',
            });

            logger.info(
              `[8G-captions] ${contentId}: provider not available. ` +
              `status=${providerResult.status}, errorCode=${providerResult.errorCode}. ` +
              `Audio remains ready.`,
            );
          } else {
            // ── Future: real transcription ──────────────────────────────
            // Provider is configured. Implement actual transcription here:
            // 1. Read processed audio from Storage
            // 2. Send to providerResult.selectedProvider (e.g. google-stt)
            // 3. Parse segments/cues
            // 4. Write VTT/JSON to audioProcessed/{uid}/{contentId}/captions/
            // 5. Update captionsProcessing.status = 'ready' + captionsAsset
            logger.info(
              `[8G-captions] ${contentId}: provider ${providerResult.selectedProvider?.providerId} found ` +
              `(fallback=${providerResult.isFallback}) — transcription not yet implemented.`,
            );

            // For now, mark as pendingProvider until transcription code is written
            await docRef.update({
              'captionsProcessing.status': 'pendingProvider',
              'captionsProcessing.completedAt': new Date().toISOString(),
              'captionsProcessing.error': 'كود التفريغ الصوتي غير مُفعّل بعد',
              'captionsProcessing.errorCode': 'TRANSCRIPTION_NOT_IMPLEMENTED',
            });
          }
        } catch (captionsErr) {
          // Captions failure does NOT affect audio processing status
          const captionsError = captionsErr instanceof Error ? captionsErr.message : String(captionsErr);
          logger.error(`[8G-captions] ${contentId}: captions FAILED.`, { error: captionsError.slice(0, 300) });

          try {
            await docRef.update({
              'captionsProcessing.status': 'failed',
              'captionsProcessing.completedAt': new Date().toISOString(),
              'captionsProcessing.error': captionsError.slice(0, 500),
              'captionsProcessing.errorCode': 'CAPTIONS_PROCESSING_ERROR',
            });
          } catch { /* ignore nested error */ }
        }
      } else {
        logger.info(`[8G-captions] ${contentId}: captions not requested, skipping.`);
      }
      } // end else (no creator-authored captions)

    } catch (err) {
      // ── Error handling ──────────────────────────────────────────────────
      const errorMessage = err instanceof Error ? err.message : String(err);
      const safeError = errorMessage.slice(0, 500); // truncate for Firestore
      logger.error(`[8F-pipeline] ${contentId}: processing FAILED.`, { error: safeError });

      try {
        await docRef.update({
          contentProcessingStatus: 'failed',
          processingCompletedAt: new Date().toISOString(),
          'audioAsset.processingError': safeError,
        });
      } catch (updateErr) {
        logger.error(`[8F-pipeline] ${contentId}: failed to update error status.`, updateErr);
      }

    } finally {
      // ── Cleanup /tmp files ──────────────────────────────────────────────
      for (const tmpFile of [tmpOriginal, tmpMaster]) {
        try { fs.unlinkSync(tmpFile); } catch { /* ignore — may not exist */ }
      }
      // waveform json temp
      const tmpWaveform = path.join(tmpDir, `${contentId}_waveform.json`);
      try { fs.unlinkSync(tmpWaveform); } catch { /* ignore */ }
    }
  },
);
