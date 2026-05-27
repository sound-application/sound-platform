/**
 * Sound Platform — getAudioPlaybackUrl Callable Cloud Function
 * ==============================================================
 * Phase:   8-D (Audio Playback Foundation)
 * Created: 2026-05-28
 *
 * WHAT THIS FUNCTION DOES:
 *   Returns a temporary signed URL for playing published audio content.
 *   The signed URL expires after 15 minutes. Audio files in Storage remain
 *   private — clients NEVER access them directly.
 *
 * CALLER CONTRACT:
 *   Input:  GetAudioPlaybackUrlRequest { contentId }
 *   Output: GetAudioPlaybackUrlResponse { contentId, playbackUrl, expiresAt, mimeType, durationMs?, sourceType? }
 *   Auth:   required — throws unauthenticated if not signed in
 *
 * VALIDATION:
 *   - Verifies the content item exists.
 *   - Verifies status is 'published' (or 'readyForUpload' in dev phase).
 *   - Verifies audioAsset.storagePath exists.
 *   - Basic audience check: blocks onlyMe content for non-owners.
 *
 * DATA READS:
 *   - contentItems/{contentId}
 *
 * DATA WRITES:
 *   - NONE — this function is read-only.
 *
 * SECURITY:
 *   - Audio files remain private in Cloud Storage.
 *   - Signed URL expires after 15 minutes.
 *   - Only authenticated users can request playback URLs.
 *
 * TODO:
 *   - Full audience resolver integration (followers/friends/lists).
 *   - Moderation status check (block rejected/flagged content).
 *   - Rate limiting per user.
 *   - Use transcoded file instead of original when pipeline is ready.
 *
 * INFINITE LOOP PREVENTION:
 *   Callable (HTTPS trigger). No Firestore watches. No writes. No loops possible.
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import type {
  GetAudioPlaybackUrlRequest,
  GetAudioPlaybackUrlResponse,
  AudioContentDoc,
} from '@sound/shared';

// ── Admin references ─────────────────────────────────────────────────────────
const db = admin.firestore();
const storage = admin.storage();

// ── Signed URL expiration (15 minutes) ───────────────────────────────────────
const SIGNED_URL_EXPIRATION_MS = 15 * 60 * 1000;

// ─── Callable ────────────────────────────────────────────────────────────────

export const getAudioPlaybackUrl = functions
  .region('us-central1')
  .https.onCall(
    async (
      data: GetAudioPlaybackUrlRequest,
      context: functions.https.CallableContext,
    ): Promise<GetAudioPlaybackUrlResponse> => {
      // ── 1. Auth check ──────────────────────────────────────────────────
      if (!context.auth) {
        throw new functions.https.HttpsError(
          'unauthenticated',
          'Authentication required to access audio playback.',
        );
      }

      const uid = context.auth.uid;

      // ── 2. Validate contentId ──────────────────────────────────────────
      if (!data.contentId || typeof data.contentId !== 'string') {
        throw new functions.https.HttpsError(
          'invalid-argument',
          'contentId is required.',
        );
      }

      // ── 3. Read content item ───────────────────────────────────────────
      const contentRef = db.collection('contentItems').doc(data.contentId);
      const contentSnap = await contentRef.get();

      if (!contentSnap.exists) {
        throw new functions.https.HttpsError(
          'not-found',
          `Content item ${data.contentId} not found.`,
        );
      }

      const content = contentSnap.data() as AudioContentDoc;

      // ── 4. Status check ────────────────────────────────────────────────
      // In Phase 8-D, allow 'published' and 'readyForUpload' (dev phase —
      // content may be in readyForUpload before transcoding pipeline exists).
      const playableStatuses = ['published', 'readyForUpload'];
      if (!playableStatuses.includes(content.status)) {
        throw new functions.https.HttpsError(
          'failed-precondition',
          `Content is not available for playback. Current status: ${content.status}`,
        );
      }

      // ── 5. Basic audience check ────────────────────────────────────────
      // TODO: Full audience resolver integration (followers/friends/lists)
      // For now: only block onlyMe content for non-owners.
      if (content.audience === 'onlyMe' && content.ownerUid !== uid) {
        throw new functions.https.HttpsError(
          'permission-denied',
          'This content is private.',
        );
      }

      // ── 6. Verify audio asset ──────────────────────────────────────────
      const audioAsset = content.audioAsset;

      if (!audioAsset?.storagePath) {
        throw new functions.https.HttpsError(
          'failed-precondition',
          'Content has no audio file attached. Audio may still be processing.',
        );
      }

      // ── 7. Generate signed URL ─────────────────────────────────────────
      const bucket = storage.bucket();
      const file = bucket.file(audioAsset.storagePath);

      // Verify file exists in Storage before generating URL
      const [exists] = await file.exists();
      if (!exists) {
        throw new functions.https.HttpsError(
          'not-found',
          'Audio file not found in storage. It may have been removed.',
        );
      }

      const expiresAt = new Date(Date.now() + SIGNED_URL_EXPIRATION_MS);

      const [signedUrl] = await file.getSignedUrl({
        action: 'read',
        expires: expiresAt,
        // Content type for proper browser handling
        contentType: audioAsset.mimeType || 'audio/mpeg',
      });

      functions.logger.info(
        `[getAudioPlaybackUrl] Generated signed URL for content ${data.contentId}`,
        {
          uid,
          contentId: data.contentId,
          storagePath: audioAsset.storagePath,
          expiresAt: expiresAt.toISOString(),
        },
      );

      return {
        contentId: data.contentId,
        playbackUrl: signedUrl,
        expiresAt: expiresAt.toISOString(),
        mimeType: audioAsset.mimeType || 'audio/mpeg',
        durationMs: audioAsset.durationMs,
        sourceType: audioAsset.sourceType,
      };
    },
  );
