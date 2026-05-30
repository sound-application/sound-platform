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
import { probeAudio, transcodeToAAC, extractWaveformPeaks, transcodeWithEffects, applyMixingMaster, applyTrimCut, mixMultiTrack } from '../processing/audioProcessor';
import type { MultiTrackLayer } from '../processing/audioProcessor';

// ── Types from shared ────────────────────────────────────────────────────
import type { ProcessedAudioMeta, WaveformData, AudioEffectsConfig, AudioMixingConfig, AudioEditConfig, AudioSfxItem } from '@sound/shared';
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
        durationMs: probe.durationMs, codec: probe.codec, sampleRate: probe.sampleRate,
      });

      if (probe.durationMs < 100) {
        throw new Error(`Audio too short or unreadable: ${probe.durationMs}ms.`);
      }

      // ── Phase 8-L.1: Check for approved preview ─────────────────────────
      const finalPreviewPath = data.finalPreviewStoragePath as string | undefined;
      const editConfig = data.editConfig as AudioEditConfig | undefined;
      const effectsConfig = data.effectsConfig as AudioEffectsConfig | undefined;
      const mixingConfig = data.mixingConfig as AudioMixingConfig | undefined;

      // Result trackers
      let editResult: { editApplied: boolean; editedDurationMs?: number; error?: string } | null = null;
      let effectsResult: { effectsApplied: boolean; appliedFilters: string[]; skippedFilters: string[]; effectsError?: string } | null = null;
      let mixingResult: { mixApplied: boolean; appliedOperations: string[]; error?: string } | null = null;
      let multiTrackResult: { mixApplied: boolean; layersMixed: number; layersFailed: string[]; error?: string } | null = null;
      let masterDurationMs = probe.durationMs;
      let masterSizeBytes = 0;
      let masterCodec = 'aac';

      if (finalPreviewPath) {
        // ── PREVIEW PATH: User already heard and approved this audio ──────
        const tmpPreview = path.join(tmpDir, `${contentId}_preview.m4a`);
        logger.info(`[8L1-pipeline] ${contentId}: using approved preview as source.`, { finalPreviewPath });
        await bucket.file(finalPreviewPath).download({ destination: tmpPreview });

        const transcode = await transcodeToAAC(tmpPreview, tmpMaster);
        masterDurationMs = transcode.durationMs;
        masterSizeBytes = transcode.sizeBytes;
        masterCodec = transcode.codec || 'aac';
        logger.info(`[8L1-pipeline] ${contentId}: preview transcoded to master.`, { durationMs: masterDurationMs });
        try { fs.unlinkSync(tmpPreview); } catch { /* ignore */ }

        // Mark all enabled stages as 'applied' since preview included them
        if (editConfig?.enabled) editResult = { editApplied: true, editedDurationMs: masterDurationMs };
        if (effectsConfig?.enabled) effectsResult = { effectsApplied: true, appliedFilters: [], skippedFilters: [] };
        if (mixingConfig?.enabled) mixingResult = { mixApplied: true, appliedOperations: ['preview-baked'] };

      } else {
        // ── NORMAL PATH: No preview — process from original ───────────────

        // ── Step 3b: Trim/Cut (Phase 8-L) ─────────────────────────────────
        if (editConfig?.enabled) {
          const hasTrim = (editConfig.trimStartMs && editConfig.trimStartMs > 0) ||
                          (editConfig.trimEndMs && editConfig.trimEndMs > 0 && editConfig.trimEndMs < probe.durationMs);
          const hasCuts = editConfig.cuts && editConfig.cuts.length > 0;

          if (hasTrim || hasCuts) {
            const tmpTrimmed = path.join(tmpDir, `${contentId}_trimmed.m4a`);
            logger.info(`[8L-pipeline] ${contentId}: applying trim/cut edits.`);
            editResult = await applyTrimCut(tmpOriginal, tmpTrimmed, {
              trimStartMs: editConfig.trimStartMs,
              trimEndMs: editConfig.trimEndMs && editConfig.trimEndMs < probe.durationMs ? editConfig.trimEndMs : undefined,
              cuts: editConfig.cuts,
            });
            if (editResult.editApplied) {
              fs.copyFileSync(tmpTrimmed, tmpOriginal);
              fs.unlinkSync(tmpTrimmed);
              probe.durationMs = editResult.editedDurationMs ?? probe.durationMs;
            } else {
              logger.error(`[8L-pipeline] ${contentId}: trim/cut FAILED. Stopping pipeline.`);
              await docRef.update({
                contentProcessingStatus: 'failed',
                processingCompletedAt: new Date().toISOString(),
                'editConfig.editStatus': 'failed',
                'editConfig.processingError': (editResult.error || 'Trim/cut failed').slice(0, 500),
              });
              return;
            }
          } else {
            editResult = { editApplied: false };
          }
        }

        // ── Step 4: Transcode to AAC (with effects if configured) ─────────
        const effectsChain = effectsConfig?.enabled ? buildEffectsChain(effectsConfig) : null;
        const requestedFilterIds = effectsConfig?.enabled ? getRequestedFilterIds(effectsConfig) : [];

        if (effectsChain) {
          logger.info(`[8J-pipeline] ${contentId}: transcoding with effects.`);
          const result = await transcodeWithEffects(tmpOriginal, tmpMaster, effectsChain, requestedFilterIds);
          masterDurationMs = result.durationMs;
          masterSizeBytes = result.sizeBytes;
          masterCodec = result.codec || 'aac';
          effectsResult = {
            effectsApplied: result.effectsApplied,
            appliedFilters: result.appliedFilters,
            skippedFilters: result.skippedFilters,
            effectsError: result.effectsError,
          };
        } else {
          logger.info(`[8F-pipeline] ${contentId}: transcoding to AAC/M4A.`);
          const result = await transcodeToAAC(tmpOriginal, tmpMaster);
          masterDurationMs = result.durationMs;
          masterSizeBytes = result.sizeBytes;
          masterCodec = result.codec || 'aac';
        }

        // ── Step 4b: Mixing master adjustments (Phase 8-K) ────────────────
        if (mixingConfig?.enabled) {
          const mixOps = getMixingMasterOps(mixingConfig);
          if (mixOps.hasRenderableOps) {
            const mixChain = buildMixingFFmpegChain(mixOps, masterDurationMs);
            if (mixChain) {
              logger.info(`[8K-pipeline] ${contentId}: applying mixing master adjustments.`);
              mixingResult = await applyMixingMaster(tmpMaster, mixChain, mixOps.operationLabels);
            }
          }
          if (!mixingResult) {
            mixingResult = { mixApplied: false, appliedOperations: [] };
          }
        }

        // ── Step 4c: Multi-track mixing — music bed + SFX (Phase 8-L.1) ──
        if (mixingConfig?.enabled) {
          const layers: MultiTrackLayer[] = [];
          const musicTrack = (mixingConfig.tracks || []).find(
            (t) => t.type === 'musicBed' && t.sourceType === 'uploaded' && t.storagePath && t.enabled,
          );
          if (musicTrack?.storagePath) {
            try {
              const musicLocal = path.join(tmpDir, `${contentId}_music.m4a`);
              await bucket.file(musicTrack.storagePath).download({ destination: musicLocal });
              layers.push({ localPath: musicLocal, type: 'musicBed', volumeDb: musicTrack.volumeDb ?? 0, startMs: musicTrack.startMs ?? 0, label: musicTrack.fileName || 'music bed' });
            } catch (err) { logger.warn(`[8L1-pipeline] Failed to download music bed.`, { error: err }); }
          }
          const sfxItems = (mixingConfig.sfxItems || []).filter((s: AudioSfxItem) => s.enabled && s.storagePath);
          for (const sfx of sfxItems) {
            try {
              const sfxLocal = path.join(tmpDir, `${contentId}_sfx_${sfx.id}.m4a`);
              await bucket.file(sfx.storagePath).download({ destination: sfxLocal });
              layers.push({ localPath: sfxLocal, type: 'sfx', volumeDb: sfx.volumeDb ?? 0, startMs: sfx.startMs ?? 0, label: sfx.label || sfx.id });
            } catch (err) { logger.warn(`[8L1-pipeline] Failed to download SFX.`, { id: sfx.id, error: err }); }
          }
          if (layers.length > 0) {
            multiTrackResult = await mixMultiTrack(tmpMaster, layers);
          }
        }
      } // end preview vs normal path

      // Re-stat master for final size
      const masterStat = fs.statSync(tmpMaster);
      masterSizeBytes = masterStat.size;

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
        mimeType: 'audio/mp4',
        sizeBytes: masterSizeBytes,
        durationMs: masterDurationMs,
        bitrate: Math.round((masterSizeBytes * 8) / (masterDurationMs / 1000)),
        codec: masterCodec,
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
          firestoreUpdate['mixingConfig.renderStatus'] = 'failed';
          firestoreUpdate['mixingConfig.renderedAt'] = mixRenderedAt;
          firestoreUpdate['mixingConfig.appliedOperations'] = [];
          firestoreUpdate['mixingConfig.processingError'] = mixingResult.error.slice(0, 500);
        } else {
          firestoreUpdate['mixingConfig.renderStatus'] = 'pending';
        }
      } else if (mixingConfig?.enabled) {
        firestoreUpdate['mixingConfig.renderStatus'] = 'pending';
      }

      // Phase 8-L.1: Write multi-track mix result
      if (multiTrackResult) {
        if (multiTrackResult.mixApplied) {
          const existingOps = (firestoreUpdate['mixingConfig.appliedOperations'] as string[]) || [];
          firestoreUpdate['mixingConfig.appliedOperations'] = [
            ...existingOps,
            `multi-track: ${multiTrackResult.layersMixed} layer(s) mixed`,
          ];
          if (firestoreUpdate['mixingConfig.renderStatus'] === 'pending') {
            firestoreUpdate['mixingConfig.renderStatus'] = 'applied';
            firestoreUpdate['mixingConfig.renderedAt'] = new Date().toISOString();
          }
        } else if (multiTrackResult.error) {
          const existingErr = (firestoreUpdate['mixingConfig.processingError'] as string) || '';
          firestoreUpdate['mixingConfig.processingError'] =
            (existingErr ? existingErr + '; ' : '') + `multi-track failed: ${multiTrackResult.error.slice(0, 300)}`;
          if (firestoreUpdate['mixingConfig.renderStatus'] !== 'applied') {
            firestoreUpdate['mixingConfig.renderStatus'] = 'failed';
          }
        }
      }

      // Phase 8-L: Write edit status
      if (editResult) {
        const editTimestamp = new Date().toISOString();
        if (editResult.editApplied) {
          firestoreUpdate['editConfig.editStatus'] = 'applied';
          firestoreUpdate['editConfig.appliedAt'] = editTimestamp;
          firestoreUpdate['editConfig.editedDurationMs'] = editResult.editedDurationMs;
        } else {
          firestoreUpdate['editConfig.editStatus'] = 'pending';
        }
      } else if (editConfig?.enabled) {
        firestoreUpdate['editConfig.editStatus'] = 'pending';
      }

      await docRef.update(firestoreUpdate);

      logger.info(
        `[8F-pipeline] ${contentId}: audio processing COMPLETE. ` +
        `status=ready, master=${masterSizeBytes} bytes, duration=${masterDurationMs}ms.`,
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
