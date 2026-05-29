/**
 * Sound Platform — getUserPlaylists Callable Cloud Function
 * ===========================================================
 * Phase:   8-I (Playlist Foundation)
 * Created: 2026-05-29
 *
 * WHAT THIS FUNCTION DOES:
 *   Returns all active playlists for the authenticated user.
 *   Reads users/{uid}/playlistRefs to find playlist IDs, then fetches
 *   full PlaylistDoc from playlists/{playlistId} for each.
 *
 * CALLER CONTRACT:
 *   Input:  GetUserPlaylistsRequest (empty — uses auth uid)
 *   Output: GetUserPlaylistsResponse { playlists: PlaylistDoc[] }
 *   Auth:   required — throws unauthenticated if not signed in
 *
 * VALIDATION:
 *   - None beyond auth check.
 *
 * DATA WRITES:
 *   - None.
 *
 * DATA READS:
 *   - users/{uid}/playlistRefs        — all ref docs for the user
 *   - playlists/{playlistId}           — full playlist docs (one per ref)
 *
 * INFINITE LOOP PREVENTION:
 *   Callable (HTTPS trigger). No Firestore watches. Read-only, no loops.
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import type {
  GetUserPlaylistsRequest,
  GetUserPlaylistsResponse,
  PlaylistDoc,
} from '@sound/shared';

// ── Admin Firestore ────────────────────────────────────────────────────────────
const db = admin.firestore();

// ─── Callable ──────────────────────────────────────────────────────────────────

export const getUserPlaylists = functions
  .region('us-central1')
  .https.onCall(
    async (
      _data: GetUserPlaylistsRequest,
      context: functions.https.CallableContext,
    ): Promise<GetUserPlaylistsResponse> => {
      // ── 1. Auth check ──────────────────────────────────────────────────────
      if (!context.auth) {
        throw new functions.https.HttpsError(
          'unauthenticated',
          'Authentication required to get playlists.',
        );
      }

      const uid = context.auth.uid;

      // ── 2. Read playlist refs ──────────────────────────────────────────────
      const refsSnap = await db
        .collection('users').doc(uid)
        .collection('playlistRefs')
        .get();

      if (refsSnap.empty) {
        functions.logger.info(
          `[getUserPlaylists] No playlists found for user ${uid}`,
          { uid },
        );
        return { playlists: [] };
      }

      // ── 3. Fetch full playlist docs ────────────────────────────────────────
      const playlistIds = refsSnap.docs.map((doc) => doc.id);

      const playlistSnaps = await Promise.all(
        playlistIds.map((id) => db.collection('playlists').doc(id).get()),
      );

      // ── 4. Filter to active playlists only ─────────────────────────────────
      const playlists: PlaylistDoc[] = [];

      for (const snap of playlistSnaps) {
        if (!snap.exists) continue;
        const data = snap.data() as PlaylistDoc;
        if (data.status === 'active') {
          playlists.push(data);
        }
      }

      functions.logger.info(
        `[getUserPlaylists] Returning ${playlists.length} active playlists for user ${uid}`,
        { uid, total: playlistIds.length, active: playlists.length },
      );

      return { playlists };
    },
  );
