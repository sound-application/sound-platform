/**
 * Sound Platform — updatePlaylist Callable Cloud Function
 * =========================================================
 * Phase:   8-I (Playlist Foundation)
 * Created: 2026-05-29
 *
 * WHAT THIS FUNCTION DOES:
 *   Updates metadata on an existing playlist.
 *   Optionally syncs denormalized fields to users/{uid}/playlistRefs/{playlistId}.
 *
 * CALLER CONTRACT:
 *   Input:  UpdatePlaylistRequest { playlistId, title?, description?, visibility?, tags? }
 *   Output: UpdatePlaylistResponse { success: true }
 *   Auth:   required — throws unauthenticated if not signed in
 *
 * VALIDATION:
 *   - playlistId is required.
 *   - Verifies the playlist exists and belongs to the caller.
 *
 * DATA WRITES:
 *   - Updates playlists/{playlistId} via batch write.
 *   - Updates users/{uid}/playlistRefs/{playlistId} if title or visibility changed.
 *
 * DATA READS:
 *   - playlists/{playlistId} — ownership check + current data.
 *
 * INFINITE LOOP PREVENTION:
 *   Callable (HTTPS trigger). No Firestore watches. Single batch write, no loops.
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import type {
  UpdatePlaylistRequest,
  UpdatePlaylistResponse,
  PlaylistDoc,
} from '@sound/shared';

// ── Admin Firestore ────────────────────────────────────────────────────────────
const db = admin.firestore();

// ─── Callable ──────────────────────────────────────────────────────────────────

export const updatePlaylist = functions
  .region('us-central1')
  .https.onCall(
    async (
      data: UpdatePlaylistRequest,
      context: functions.https.CallableContext,
    ): Promise<UpdatePlaylistResponse> => {
      // ── 1. Auth check ──────────────────────────────────────────────────────
      if (!context.auth) {
        throw new functions.https.HttpsError(
          'unauthenticated',
          'Authentication required to update a playlist.',
        );
      }

      const uid = context.auth.uid;

      // ── 2. Validate playlistId ─────────────────────────────────────────────
      if (!data.playlistId || typeof data.playlistId !== 'string') {
        throw new functions.https.HttpsError(
          'invalid-argument',
          'playlistId is required.',
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
          'You can only update your own playlists.',
        );
      }

      // ── 4. Build update payload ────────────────────────────────────────────
      const now = new Date().toISOString();
      const updates: Record<string, unknown> = { updatedAt: now };

      if (data.title !== undefined)       updates.title = data.title;
      if (data.description !== undefined) updates.description = data.description;
      if (data.visibility !== undefined)  updates.visibility = data.visibility;
      if (data.tags !== undefined)        updates.tags = data.tags;

      // ── 5. Batch write — playlist + ref sync ───────────────────────────────
      const batch = db.batch();
      batch.update(playlistRef, updates);

      // Sync denormalized fields to playlistRef if title or visibility changed
      const refNeedsSync = data.title !== undefined || data.visibility !== undefined;
      if (refNeedsSync) {
        const refRef = db.collection('users').doc(uid)
          .collection('playlistRefs').doc(data.playlistId);
        const refUpdates: Record<string, unknown> = { updatedAt: now };
        if (data.title !== undefined)      refUpdates.title = data.title;
        if (data.visibility !== undefined) refUpdates.visibility = data.visibility;
        batch.update(refRef, refUpdates);
      }

      await batch.commit();

      functions.logger.info(
        `[updatePlaylist] Updated playlist ${data.playlistId} for user ${uid}`,
        { uid, playlistId: data.playlistId, updatedFields: Object.keys(updates) },
      );

      return { success: true };
    },
  );
