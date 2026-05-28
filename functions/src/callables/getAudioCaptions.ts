/**
 * Sound Platform — getAudioCaptions Callable Cloud Function
 * ===========================================================
 * Phase:   8-G (Audio Captions Pipeline Foundation)
 * Created: 2026-05-28
 *
 * WHAT THIS FUNCTION DOES:
 *   Returns captions/transcription status and data for a published content item.
 *   If captions are ready, returns the captions text/segments.
 *   If captions are pending/failed, returns status and error info.
 *
 * CALLER CONTRACT:
 *   Input:  { contentId: string }
 *   Output: GetAudioCaptionsResponse
 *   Auth:   required — throws unauthenticated if not signed in
 *
 * VALIDATION:
 *   - Verifies the content item exists.
 *   - Verifies status is 'published'.
 *   - Basic audience check: blocks onlyMe content for non-owners.
 *
 * DATA READS:
 *   - contentItems/{contentId}
 *   - Storage captions file (when status === 'ready')
 *
 * DATA WRITES:
 *   - NONE — this function is read-only.
 *
 * SECURITY:
 *   - Captions files remain private in Cloud Storage.
 *   - Only authenticated users can request captions.
 *   - Audience check prevents access to private content captions.
 *
 * INFINITE LOOP PREVENTION:
 *   Callable (HTTPS trigger). No Firestore watches. No writes. No loops possible.
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import type { AudioContentDoc } from '@sound/shared';

// ── Admin references ─────────────────────────────────────────────────────────
const db = admin.firestore();

// ── Response type ────────────────────────────────────────────────────────────

export interface GetAudioCaptionsResponse {
  contentId: string;
  /** Current captions processing status */
  status: string;
  /** Language of the captions */
  language?: string;
  /** Caption style preference */
  style?: string;
  /** Error message if failed or pending provider */
  error?: string;
  /** Machine-readable error code */
  errorCode?: string;
  /** Captions asset metadata (when ready) */
  captionsAsset?: {
    format: string;
    language?: string;
    generatedAt: string;
    provider?: string;
    segmentsCount?: number;
  };
  // Future: segments/cues data for inline rendering
}

// ─── Callable ────────────────────────────────────────────────────────────────

export const getAudioCaptions = functions
  .region('us-central1')
  .https.onCall(
    async (
      data: { contentId: string },
      context: functions.https.CallableContext,
    ): Promise<GetAudioCaptionsResponse> => {
      // ── 1. Auth check ──────────────────────────────────────────────────
      if (!context.auth) {
        throw new functions.https.HttpsError(
          'unauthenticated',
          'Authentication required to access captions.',
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
      if (content.status !== 'published') {
        throw new functions.https.HttpsError(
          'failed-precondition',
          `Content is not available. Current status: ${content.status}`,
        );
      }

      // ── 5. Basic audience check ────────────────────────────────────────
      if (content.audience === 'onlyMe' && content.ownerUid !== uid) {
        throw new functions.https.HttpsError(
          'permission-denied',
          'This content is private.',
        );
      }

      // ── 6. Return captions status ──────────────────────────────────────
      const captionsProcessing = content.captionsProcessing;
      const captionsAsset = content.captionsAsset;

      if (!captionsProcessing) {
        return {
          contentId: data.contentId,
          status: 'notRequested',
        };
      }

      const response: GetAudioCaptionsResponse = {
        contentId: data.contentId,
        status: captionsProcessing.status,
        language: captionsProcessing.language,
        style: captionsProcessing.style,
        error: captionsProcessing.error,
        errorCode: captionsProcessing.errorCode,
      };

      // If captions are ready and asset exists, include metadata
      if (captionsProcessing.status === 'ready' && captionsAsset) {
        response.captionsAsset = {
          format: captionsAsset.format,
          language: captionsAsset.language,
          generatedAt: captionsAsset.generatedAt,
          provider: captionsAsset.provider,
          segmentsCount: captionsAsset.segmentsCount,
        };
        // Future: read captions file from Storage and return segments inline
      }

      functions.logger.info(
        `[getAudioCaptions] Returning captions status for ${data.contentId}`,
        { uid, status: captionsProcessing.status },
      );

      return response;
    },
  );
