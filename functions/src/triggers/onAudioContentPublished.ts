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
import { probeAudio, transcodeToAAC, extractWaveformPeaks } from '../processing/audioProcessor';

// ── Types from shared ────────────────────────────────────────────────────────
import type { ProcessedAudioMeta, WaveformData } from '@sound/shared';

// ── Provider registry ──────────────────────────────────────────────────────
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

      // ── Step 4: Transcode to AAC/M4A ──────────────────────────────────
      logger.info(`[8F-pipeline] ${contentId}: transcoding to AAC/M4A.`);
      const transcode = await transcodeToAAC(tmpOriginal, tmpMaster);
      logger.info(`[8F-pipeline] ${contentId}: transcode complete.`, {
        sizeBytes: transcode.sizeBytes,
        durationMs: transcode.durationMs,
        codec: transcode.codec,
        bitrate: transcode.bitrate,
        loudnessLufs: transcode.loudnessLufs,
      });

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

      await docRef.update({
        contentProcessingStatus: 'ready',
        processingCompletedAt,
        processedAudio,
        waveform,
        moderationStatus: 'approved', // dev auto-approve
      });

      logger.info(
        `[8F-pipeline] ${contentId}: audio processing COMPLETE. ` +
        `status=ready, source=processed, waveform=real (${peaks.length} peaks), ` +
        `master=${transcode.sizeBytes} bytes, duration=${transcode.durationMs}ms.`,
      );

      // ── Phase 8-G: Captions pipeline ──────────────────────────────────────
      // Run AFTER audio processing succeeds.
      // Captions failure does NOT change contentProcessingStatus.
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
