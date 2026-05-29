/**
 * Sound Platform — createPlaylist Callable Cloud Function
 * =========================================================
 * Phase:   8-I (Playlist Foundation)
 * Created: 2026-05-29
 *
 * WHAT THIS FUNCTION DOES:
 *   Creates a new playlist document and its denormalized ref.
 *   Writes playlists/{playlistId} and users/{uid}/playlistRefs/{playlistId}.
 *
 * CALLER CONTRACT:
 *   Input:  CreatePlaylistRequest { title, description?, visibility?, world?, tags?, source? }
 *   Output: CreatePlaylistResponse { playlistId }
 *   Auth:   required — throws unauthenticated if not signed in
 *
 * VALIDATION:
 *   - title is required and must be a non-empty string.
 *
 * DATA WRITES:
 *   - Creates playlists/{playlistId} via batch write.
 *   - Creates users/{uid}/playlistRefs/{playlistId} via batch write.
 *
 * DATA READS:
 *   - publicProfiles/{uid} — owner snapshot for denormalization.
 *
 * INFINITE LOOP PREVENTION:
 *   Callable (HTTPS trigger). No Firestore watches. Single batch write, no loops.
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import type {
  CreatePlaylistRequest,
  CreatePlaylistResponse,
  PlaylistDoc,
  PlaylistRefDoc,
  OwnerSnapshot,
} from '@sound/shared';

// ── Admin Firestore ────────────────────────────────────────────────────────────
const db = admin.firestore();

// ─── Callable ──────────────────────────────────────────────────────────────────

export const createPlaylist = functions
  .region('us-central1')
  .https.onCall(
    async (
      data: CreatePlaylistRequest,
      context: functions.https.CallableContext,
    ): Promise<CreatePlaylistResponse> => {
      // ── 1. Auth check ──────────────────────────────────────────────────────
      if (!context.auth) {
        throw new functions.https.HttpsError(
          'unauthenticated',
          'Authentication required to create a playlist.',
        );
      }

      const uid = context.auth.uid;

      // ── 2. Validate title ──────────────────────────────────────────────────
      if (!data.title || typeof data.title !== 'string' || data.title.trim().length === 0) {
        throw new functions.https.HttpsError(
          'invalid-argument',
          'title is required and must be a non-empty string.',
        );
      }

      const now = new Date().toISOString();

      // ── 3. Build owner snapshot from publicProfiles ────────────────────────
      const profileDoc = await db.collection('publicProfiles').doc(uid).get();
      const profileData = profileDoc.data();

      const ownerSnapshot: OwnerSnapshot = {
        ownerUsername: profileData?.generalProfile?.username ?? '',
        ownerDisplayName: profileData?.generalProfile?.displayName ?? '',
        ownerAvatarUrl: profileData?.generalProfile?.avatarUrl,
      };

      // ── 4. Generate playlist ID ────────────────────────────────────────────
      const playlistRef = db.collection('playlists').doc(); // auto-ID
      const playlistId = playlistRef.id;

      // ── 5. Build playlist document ─────────────────────────────────────────
      const playlistDoc: PlaylistDoc = {
        playlistId,
        ownerUid: uid,
        ownerSnapshot,
        title: data.title.trim(),
        description: data.description,
        visibility: data.visibility ?? 'onlyMe',
        source: data.source ?? 'manual',
        world: data.world,
        tags: data.tags,
        itemCount: 0,
        createdAt: now,
        updatedAt: now,
        status: 'active',
      };

      // ── 6. Build playlist ref document ─────────────────────────────────────
      const playlistRefDoc: PlaylistRefDoc = {
        playlistId,
        title: playlistDoc.title,
        visibility: playlistDoc.visibility,
        itemCount: 0,
        createdAt: now,
        updatedAt: now,
      };

      // ── 7. Batch write — playlist + ref ────────────────────────────────────
      const batch = db.batch();
      batch.set(playlistRef, playlistDoc);
      batch.set(
        db.collection('users').doc(uid).collection('playlistRefs').doc(playlistId),
        playlistRefDoc,
      );

      await batch.commit();

      functions.logger.info(
        `[createPlaylist] Created playlist ${playlistId} for user ${uid}`,
        { uid, playlistId, title: playlistDoc.title, visibility: playlistDoc.visibility },
      );

      return { playlistId };
    },
  );
