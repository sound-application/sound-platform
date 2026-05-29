/**
 * Sound Platform — removeFromPlaylist Callable Cloud Function
 * =============================================================
 * Phase:   8-I (Playlist Foundation)
 * Created: 2026-05-29
 *
 * WHAT THIS FUNCTION DOES:
 *   Removes a content item from a playlist.
 *   Deletes playlists/{playlistId}/items/{contentId} and decrements counters.
 *
 * CALLER CONTRACT:
 *   Input:  RemoveFromPlaylistRequest { playlistId, contentId }
 *   Output: RemoveFromPlaylistResponse { removed: boolean }
 *   Auth:   required — throws unauthenticated if not signed in
 *
 * VALIDATION:
 *   - playlistId and contentId are required.
 *   - Verifies the playlist exists and belongs to the caller.
 *
 * IDEMPOTENCY:
 *   - If the item does not exist in the playlist, returns { removed: false }.
 *
 * DATA WRITES:
 *   - Deletes playlists/{playlistId}/items/{contentId} via batch write.
 *   - Decrements playlists/{playlistId}.itemCount via FieldValue.increment(-1).
 *   - Updates playlists/{playlistId}.updatedAt.
 *   - Updates users/{uid}/playlistRefs/{playlistId}.itemCount and updatedAt.
 *
 * DATA READS:
 *   - playlists/{playlistId}                   — ownership check
 *   - playlists/{playlistId}/items/{contentId}  — existence check
 *
 * INFINITE LOOP PREVENTION:
 *   Callable (HTTPS trigger). No Firestore watches. Single batch write, no loops.
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import type {
  RemoveFromPlaylistRequest,
  RemoveFromPlaylistResponse,
  PlaylistDoc,
} from '@sound/shared';

// ── Admin Firestore ────────────────────────────────────────────────────────────
const db = admin.firestore();

// ─── Callable ──────────────────────────────────────────────────────────────────

export const removeFromPlaylist = functions
  .region('us-central1')
  .https.onCall(
    async (
      data: RemoveFromPlaylistRequest,
      context: functions.https.CallableContext,
    ): Promise<RemoveFromPlaylistResponse> => {
      // ── 1. Auth check ──────────────────────────────────────────────────────
      if (!context.auth) {
        throw new functions.https.HttpsError(
          'unauthenticated',
          'Authentication required to remove items from a playlist.',
        );
      }

      const uid = context.auth.uid;

      // ── 2. Validate required fields ────────────────────────────────────────
      if (!data.playlistId || typeof data.playlistId !== 'string') {
        throw new functions.https.HttpsError(
          'invalid-argument',
          'playlistId is required.',
        );
      }
      if (!data.contentId || typeof data.contentId !== 'string') {
        throw new functions.https.HttpsError(
          'invalid-argument',
          'contentId is required.',
        );
      }

      // ── 3. Read playlist and verify ownership ──────────────────────────────
      const playlistRef = db.collection('playlists').doc(data.playlistId);
      const playlistSnap = await playlistRef.get();

      if (!playlistSnap.exists) {
        throw new functions.https.HttpsError(
          'not-found',
          `Playlist ${data.playlistId} not found.`,
        );
      }

      const playlist = playlistSnap.data() as PlaylistDoc;

      if (playlist.ownerUid !== uid) {
        throw new functions.https.HttpsError(
          'permission-denied',
          'You can only remove items from your own playlists.',
        );
      }

      // ── 4. Idempotency check — item exists in playlist? ────────────────────
      const itemRef = playlistRef.collection('items').doc(data.contentId);
      const itemSnap = await itemRef.get();

      if (!itemSnap.exists) {
        functions.logger.info(
          `[removeFromPlaylist] Content ${data.contentId} not in playlist ${data.playlistId}, skipping.`,
          { uid, playlistId: data.playlistId, contentId: data.contentId },
        );
        return { removed: false };
      }

      // ── 5. Batch write — delete item + decrement counters + ref sync ───────
      const now = new Date().toISOString();
      const batch = db.batch();

      // Delete the item doc
      batch.delete(itemRef);

      // Atomically decrement itemCount + update timestamp on playlist
      batch.update(playlistRef, {
        itemCount: admin.firestore.FieldValue.increment(-1),
        updatedAt: now,
      });

      // Sync itemCount + updatedAt on playlistRef
      const refRef = db.collection('users').doc(uid)
        .collection('playlistRefs').doc(data.playlistId);
      batch.update(refRef, {
        itemCount: admin.firestore.FieldValue.increment(-1),
        updatedAt: now,
      });

      await batch.commit();

      functions.logger.info(
        `[removeFromPlaylist] Removed content ${data.contentId} from playlist ${data.playlistId} for user ${uid}`,
        { uid, playlistId: data.playlistId, contentId: data.contentId },
      );

      return { removed: true };
    },
  );
