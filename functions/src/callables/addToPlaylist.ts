/**
 * Sound Platform — addToPlaylist Callable Cloud Function
 * ========================================================
 * Phase:   8-I (Playlist Foundation)
 * Created: 2026-05-29
 *
 * WHAT THIS FUNCTION DOES:
 *   Adds a published content item to a playlist.
 *   Creates playlists/{playlistId}/items/{contentId} and increments counters.
 *
 * CALLER CONTRACT:
 *   Input:  AddToPlaylistRequest { playlistId, contentId }
 *   Output: AddToPlaylistResponse { added: boolean }
 *   Auth:   required — throws unauthenticated if not signed in
 *
 * VALIDATION:
 *   - playlistId and contentId are required.
 *   - Verifies the playlist exists and belongs to the caller.
 *   - Verifies the content item exists and is published.
 *
 * IDEMPOTENCY:
 *   - If the item already exists in the playlist, returns { added: false }.
 *
 * DATA WRITES:
 *   - Creates playlists/{playlistId}/items/{contentId} via batch write.
 *   - Increments playlists/{playlistId}.itemCount via FieldValue.increment(1).
 *   - Updates playlists/{playlistId}.lastItemAddedAt and updatedAt.
 *   - Updates users/{uid}/playlistRefs/{playlistId}.itemCount and updatedAt.
 *
 * DATA READS:
 *   - playlists/{playlistId}                   — ownership check
 *   - contentItems/{contentId}                  — existence + status check
 *   - playlists/{playlistId}/items/{contentId}  — idempotency check
 *
 * INFINITE LOOP PREVENTION:
 *   Callable (HTTPS trigger). No Firestore watches. Single batch write, no loops.
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import type {
  AddToPlaylistRequest,
  AddToPlaylistResponse,
  PlaylistDoc,
  PlaylistItemDoc,
  PlaylistItemContentSnapshot,
  AudioContentDoc,
} from '@sound/shared';

// ── Admin Firestore ────────────────────────────────────────────────────────────
const db = admin.firestore();

// ─── Callable ──────────────────────────────────────────────────────────────────

export const addToPlaylist = functions
  .region('us-central1')
  .https.onCall(
    async (
      data: AddToPlaylistRequest,
      context: functions.https.CallableContext,
    ): Promise<AddToPlaylistResponse> => {
      // ── 1. Auth check ──────────────────────────────────────────────────────
      if (!context.auth) {
        throw new functions.https.HttpsError(
          'unauthenticated',
          'Authentication required to add items to a playlist.',
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
          'You can only add items to your own playlists.',
        );
      }

      // ── 4. Read content item and verify status ─────────────────────────────
      const contentRef = db.collection('contentItems').doc(data.contentId);
      const contentSnap = await contentRef.get();

      if (!contentSnap.exists) {
        throw new functions.https.HttpsError(
          'not-found',
          `Content item ${data.contentId} not found.`,
        );
      }

      const content = contentSnap.data() as AudioContentDoc;

      if (content.status !== 'published') {
        throw new functions.https.HttpsError(
          'failed-precondition',
          'Only published content can be added to a playlist.',
        );
      }

      // ── 5. Idempotency check — already in playlist? ────────────────────────
      const itemRef = playlistRef.collection('items').doc(data.contentId);
      const itemSnap = await itemRef.get();

      if (itemSnap.exists) {
        functions.logger.info(
          `[addToPlaylist] Content ${data.contentId} already in playlist ${data.playlistId}, skipping.`,
          { uid, playlistId: data.playlistId, contentId: data.contentId },
        );
        return { added: false };
      }

      // ── 6. Build content snapshot ──────────────────────────────────────────
      const contentSnapshot: PlaylistItemContentSnapshot = {
        title: content.title,
        ownerUid: content.ownerUid,
        ownerDisplayName: content.owner?.ownerDisplayName,
        coverPath: content.coverAsset?.storagePath,
        durationMs: content.audioAsset?.durationMs,
        kind: content.kind,
        world: content.world,
      };

      // ── 7. Build playlist item document ────────────────────────────────────
      const now = new Date().toISOString();

      const playlistItemDoc: PlaylistItemDoc = {
        playlistId: data.playlistId,
        contentId: data.contentId,
        ownerUid: uid,
        addedByUid: uid,
        addedAt: now,
        sortOrder: playlist.itemCount,
        contentSnapshot,
      };

      // ── 8. Batch write — item + counters + ref sync ────────────────────────
      const batch = db.batch();

      // Create the item doc
      batch.set(itemRef, playlistItemDoc);

      // Atomically increment itemCount + update timestamps on playlist
      batch.update(playlistRef, {
        itemCount: admin.firestore.FieldValue.increment(1),
        lastItemAddedAt: now,
        updatedAt: now,
      });

      // Sync itemCount + updatedAt on playlistRef
      const refRef = db.collection('users').doc(uid)
        .collection('playlistRefs').doc(data.playlistId);
      batch.update(refRef, {
        itemCount: admin.firestore.FieldValue.increment(1),
        updatedAt: now,
      });

      await batch.commit();

      functions.logger.info(
        `[addToPlaylist] Added content ${data.contentId} to playlist ${data.playlistId} for user ${uid}`,
        { uid, playlistId: data.playlistId, contentId: data.contentId },
      );

      return { added: true };
    },
  );
