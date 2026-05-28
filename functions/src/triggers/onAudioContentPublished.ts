/**
 * Sound Platform — onAudioContentPublished Cloud Function
 * ========================================================
 * Phase:   8-E (Audio Processing Pipeline Foundation)
 * Updated: 2026-05-28
 *
 * Trigger: Firestore document written on contentItems/{contentId}
 *
 * Fires when a content item is published with an audio asset.
 * Runs the processing pipeline:
 *   1. Mark as queued
 *   2. Generate synthetic waveform (real extraction deferred)
 *   3. Set captions processing status
 *   4. Auto-approve moderation (dev phase)
 *   5. Mark as originalFallback (NOT ready — no real transcoding)
 *
 * IDEMPOTENCY:
 *   - Only runs when contentProcessingStatus === 'uploaded'
 *   - Skips if processing already started (queued/processing/ready/failed/originalFallback)
 *   - The trigger writes back to the same document, but the idempotency check
 *     prevents infinite re-trigger loops
 */

import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import * as admin from 'firebase-admin';
import * as logger from 'firebase-functions/logger';
import { generateSyntheticWaveform } from '@sound/shared';

export const onAudioContentPublished = onDocumentWritten(
  'contentItems/{contentId}',
  async (event) => {
    const contentId = event.params.contentId;
    const afterSnap = event.data?.after;

    // ── Guard: document must exist after the write ────────────────────────
    if (!afterSnap?.exists) {
      logger.info(`[8E-pipeline] ${contentId}: document deleted, skipping.`);
      return;
    }

    const data = afterSnap.data();
    if (!data) return;

    // ── Guard: must be published with an audio asset ─────────────────────
    if (data.status !== 'published') {
      return;
    }

    if (!data.audioAsset?.storagePath) {
      logger.info(`[8E-pipeline] ${contentId}: no audioAsset.storagePath, skipping.`);
      return;
    }

    // ── IDEMPOTENCY: only process when status is 'uploaded' ──────────────
    // This prevents infinite loops: after we update the doc, the trigger
    // fires again, but contentProcessingStatus is no longer 'uploaded'.
    if (data.contentProcessingStatus !== 'uploaded') {
      return;
    }

    const db = admin.firestore();
    const docRef = db.collection('contentItems').doc(contentId);
    const now = new Date().toISOString();

    try {
      // ── Step 1: Mark as queued ───────────────────────────────────────────
      logger.info(`[8E-pipeline] ${contentId}: processing started.`);
      await docRef.update({
        contentProcessingStatus: 'queued',
        processingStartedAt: now,
      });

      // ── Step 2: Generate synthetic waveform ─────────────────────────────
      // Real waveform extraction (FFmpeg/audiowaveform) is deferred.
      // Synthetic waveform is clearly marked as synthetic: true.
      const waveform = generateSyntheticWaveform(contentId, 200);
      logger.info(`[8E-pipeline] ${contentId}: synthetic waveform generated (${waveform.pointsCount} peaks).`);

      // ── Step 3: Captions processing status ──────────────────────────────
      // If captions were requested, leave as 'requested' (no AI provider yet).
      // If not requested, leave as 'notRequested'.
      // No mutation needed — already set by createAudioContentFromDraft.

      // ── Step 4: Auto-approve moderation (dev phase) ─────────────────────
      // In production, this would be replaced by AI moderation + human review.
      const moderationStatus = 'approved';

      // ── Step 5: Final update — mark as originalFallback ─────────────────
      // NOT 'ready' — real transcoding has not happened.
      // processedAudio remains undefined/null — no transcoded file exists.
      const completedAt = new Date().toISOString();
      await docRef.update({
        contentProcessingStatus: 'originalFallback',
        processingCompletedAt: completedAt,
        waveform,
        moderationStatus,
        // processedAudio: NOT set — original upload is the only playable source
      });

      logger.info(
        `[8E-pipeline] ${contentId}: processing complete. ` +
        `status=originalFallback, waveform=synthetic, moderation=approved.`,
      );
    } catch (err) {
      // ── Error handling ────────────────────────────────────────────────
      const errorMessage = err instanceof Error ? err.message : String(err);
      logger.error(`[8E-pipeline] ${contentId}: processing FAILED.`, err);

      try {
        await docRef.update({
          contentProcessingStatus: 'failed',
          processingCompletedAt: new Date().toISOString(),
          'audioAsset.processingError': errorMessage,
        });
      } catch (updateErr) {
        logger.error(`[8E-pipeline] ${contentId}: failed to update error status.`, updateErr);
      }
    }
  },
);
