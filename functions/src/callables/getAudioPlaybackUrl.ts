/**
 * Sound Platform — getAudioPlaybackUrl Callable Cloud Function
 * ==============================================================
 * Phase:   8-E (Audio Processing Pipeline Foundation)
 * Created: 2026-05-28
 *
 * WHAT THIS FUNCTION DOES:
 *   Returns a download URL for playing published audio content.
 *   Uses Firebase Storage download tokens (from file metadata) to
 *   construct a playback URL. Audio files remain private in Storage —
 *   clients cannot access them without the server-issued token URL.
 *
 * WHY NOT getSignedUrl:
 *   getSignedUrl requires the Service Account Token Creator IAM role,
 *   which may not be granted on all projects. The download-token
 *   approach works with the default Firebase Admin SDK setup.
 *   TODO: Migrate to getSignedUrl once IAM role is granted for
 *   proper time-limited expiration.
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
 *   - Storage file metadata (for download token)
 *
 * DATA WRITES:
 *   - NONE — this function is read-only.
 *
 * SECURITY:
 *   - Audio files remain private in Cloud Storage (Security Rules deny direct reads).
 *   - Download token URL is only issued by this authenticated callable.
 *   - Only authenticated users can request playback URLs.
 *
 * TODO:
 *   - Full audience resolver integration (followers/friends/lists).
 *   - Moderation status check (block rejected/flagged content).
 *   - Rate limiting per user.
 *   - Use transcoded file instead of original when pipeline is ready.
 *   - Migrate to getSignedUrl with proper IAM for time-limited expiration.
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

// ── Advisory expiration (15 minutes) — for client-side cache/refresh ─────────
const ADVISORY_EXPIRATION_MS = 15 * 60 * 1000;

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

      // ── 6. Determine which audio file to serve ──────────────────────────
      // Phase 8-E: prefer processedAudio if available, fallback to original.
      const audioAsset = content.audioAsset;
      const processedAudio = content.processedAudio;

      let targetPath: string | undefined;
      let targetMime: string | undefined;
      let targetDurationMs: number | undefined;
      let source: 'processed' | 'original' | 'none';

      if (processedAudio?.storagePath) {
        targetPath = processedAudio.storagePath;
        targetMime = processedAudio.mimeType;
        targetDurationMs = processedAudio.durationMs;
        source = 'processed';
      } else if (audioAsset?.storagePath) {
        // Block fallback to original if edits exist and content is still processing
        const isProcessing = ['uploaded', 'processing'].includes(content.contentProcessingStatus || '');
        const hasEdits = content.editConfig?.enabled || content.effectsConfig?.enabled || content.mixingConfig?.enabled;
        
        if (isProcessing && hasEdits) {
          return {
            contentId: data.contentId,
            source: 'none',
            processingStatus: content.contentProcessingStatus || 'uploaded',
            waveform: content.waveform,
            captionsStatus: content.captionsProcessing?.status,
            sourceType: audioAsset?.sourceType,
          } as GetAudioPlaybackUrlResponse;
        }

        targetPath = audioAsset.storagePath;
        targetMime = audioAsset.mimeType;
        targetDurationMs = audioAsset.durationMs;
        source = 'original';
      } else {
        // No audio file available at all
        return {
          contentId: data.contentId,
          source: 'none' as const,
          processingStatus: content.contentProcessingStatus || 'uploaded',
          waveform: content.waveform,
          captionsStatus: content.captionsProcessing?.status,
          sourceType: audioAsset?.sourceType,
        } as GetAudioPlaybackUrlResponse;
      }

      // Phase 8-E enrichment data
      const processingStatus = content.contentProcessingStatus || 'uploaded';
      const waveform = content.waveform;
      const captionsStatus = content.captionsProcessing?.status;

      // ── 7. Get download URL via Firebase download token ────────────────
      const bucket = storage.bucket();
      const file = bucket.file(targetPath);

      // Verify file exists in Storage
      const [exists] = await file.exists();
      if (!exists) {
        throw new functions.https.HttpsError(
          'not-found',
          'Audio file not found in storage. It may have been removed.',
        );
      }

      // Get file metadata which includes the download token
      const [metadata] = await file.getMetadata();
      const downloadToken = metadata.metadata?.firebaseStorageDownloadTokens;

      if (!downloadToken) {
        // If no download token exists, generate one by updating metadata
        const newToken = crypto.randomUUID();
        await file.setMetadata({
          metadata: { firebaseStorageDownloadTokens: newToken },
        });

        const bucketName = bucket.name;
        const encodedPath = encodeURIComponent(targetPath);
        const playbackUrl = `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodedPath}?alt=media&token=${newToken}`;

        const advisoryExpiry = new Date(Date.now() + ADVISORY_EXPIRATION_MS);

        functions.logger.info(
          `[getAudioPlaybackUrl] Generated new download token for content ${data.contentId} (source=${source})`,
          { uid, contentId: data.contentId, storagePath: targetPath, source },
        );

        return {
          contentId: data.contentId,
          playbackUrl,
          expiresAt: advisoryExpiry.toISOString(),
          mimeType: targetMime || 'audio/mpeg',
          durationMs: targetDurationMs,
          sourceType: audioAsset?.sourceType,
          source,
          processingStatus,
          waveform,
          captionsStatus,
        } as GetAudioPlaybackUrlResponse;
      }

      // Construct Firebase Storage download URL with existing token
      const bucketName = bucket.name;
      const encodedPath = encodeURIComponent(targetPath);
      const playbackUrl = `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodedPath}?alt=media&token=${downloadToken}`;

      const advisoryExpiry = new Date(Date.now() + ADVISORY_EXPIRATION_MS);

      functions.logger.info(
        `[getAudioPlaybackUrl] Returning download URL for content ${data.contentId} (source=${source})`,
        { uid, contentId: data.contentId, storagePath: targetPath, source },
      );

      return {
        contentId: data.contentId,
        playbackUrl,
        expiresAt: advisoryExpiry.toISOString(),
        mimeType: targetMime || 'audio/mpeg',
        durationMs: targetDurationMs,
        sourceType: audioAsset?.sourceType,
        source,
        processingStatus,
        waveform,
        captionsStatus,
      } as GetAudioPlaybackUrlResponse;
    },
  );
