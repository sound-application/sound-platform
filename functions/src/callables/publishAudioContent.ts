/**
 * Sound Platform — publishAudioContent Callable Cloud Function
 * ==============================================================
 * Phase:   8-B (Audio Recording + Upload + Storage Attachment)
 * Updated: 2026-05-27
 *
 * WHAT THIS FUNCTION DOES:
 *   Publishes a completed audio draft as a content item.
 *   Creates contentItems/{auto-id} from drafts/{uid}/drafts/{draftId}.
 *
 * CALLER CONTRACT:
 *   Input:  PublishAudioContentRequest { draftId, deleteDraftAfterPublish? }
 *   Output: PublishAudioContentResponse { contentId, status }
 *   Auth:   required — throws unauthenticated if not signed in
 *
 * VALIDATION:
 *   - Verifies the draft exists and belongs to the caller.
 *   - Validates required publish fields: title, world, kind.
 *   - Validates world×kind combination.
 *   - Checks user capabilities via users/{uid} for publishing permission.
 *   - Reads publicProfiles/{uid} to build OwnerSnapshot.
 *
 * DATA WRITES:
 *   - Creates contentItems/{contentId} via Admin SDK.
 *   - Optionally deletes drafts/{uid}/drafts/{draftId} if requested.
 *
 * DATA READS:
 *   - drafts/{uid}/drafts/{draftId}  — the source draft
 *   - users/{uid}                     — capabilities check
 *   - publicProfiles/{uid}            — owner snapshot
 *
 * IMPORTANT CONSTRAINTS:
 *   - Radio normal publishing is BLOCKED. radioMoment requires radio_creator.
 *   - Tournament submissions are open (no special capability for participants).
 *   - Music publishing requires music_creator capability.
 *   - No upload/transcoding in this phase — audioAsset is left undefined.
 *   - Music rights workflow is NOT implemented (placeholder only).
 *
 * INFINITE LOOP PREVENTION:
 *   Callable (HTTPS trigger). No Firestore watches. Writes to contentItems,
 *   which has no triggers in this phase. No loops possible.
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import type {
  PublishAudioContentRequest,
  PublishAudioContentResponse,
  AudioDraftDoc,
  OwnerSnapshot,
} from '@sound/shared';
import {
  canPublishAudioKindToWorld,
  createAudioContentFromDraft,
} from '@sound/shared';

// ── Admin Firestore ────────────────────────────────────────────────────────────
const db = admin.firestore();

// ── Playlist Side-Effects (extracted for idempotent re-use) ────────────────────
//
// Called by both the normal publish path and the retry-recovery path.
// Idempotent: checks for existing items/playlists before writing.
// Non-blocking caller: failures are caught at the call site.
//
async function runPlaylistSideEffects(
  firestore: FirebaseFirestore.Firestore,
  uid: string,
  draft: AudioDraftDoc,
  contentId: string,
  contentRef: FirebaseFirestore.DocumentReference,
  owner: OwnerSnapshot,
): Promise<void> {
  if (draft.playlistIntent === 'existing' && draft.playlistId) {
    // Add published content to existing playlist
    const playlistRef = firestore.collection('playlists').doc(draft.playlistId);
    const playlistSnap = await playlistRef.get();
    if (playlistSnap.exists && playlistSnap.data()?.ownerUid === uid) {
      const itemRef = playlistRef.collection('items').doc(contentId);
      const itemSnap = await itemRef.get();
      if (!itemSnap.exists) {
        const plBatch = firestore.batch();
        const nowPl = new Date().toISOString();
        plBatch.set(itemRef, {
          playlistId: draft.playlistId,
          contentId,
          ownerUid: uid,
          addedByUid: uid,
          addedAt: nowPl,
          sortOrder: (playlistSnap.data()?.itemCount ?? 0) + 1,
          contentSnapshot: {
            title: draft.title || '',
            ownerUid: uid,
            ownerDisplayName: owner.ownerDisplayName,
            coverPath: draft.coverAsset?.storagePath,
            durationMs: draft.audioAsset?.durationMs,
            kind: draft.kind,
            world: draft.world,
          },
        });
        plBatch.update(playlistRef, {
          itemCount: admin.firestore.FieldValue.increment(1),
          lastItemAddedAt: nowPl,
          updatedAt: nowPl,
        });
        const plRefDoc = firestore.collection('users').doc(uid)
          .collection('playlistRefs').doc(draft.playlistId);
        plBatch.update(plRefDoc, {
          itemCount: admin.firestore.FieldValue.increment(1),
          updatedAt: nowPl,
        });
        // Set playlistId on the contentItem for linkback
        plBatch.update(contentRef, { playlistId: draft.playlistId });
        await plBatch.commit();
        functions.logger.info(
          `[publishAudioContent] Added ${contentId} to existing playlist ${draft.playlistId}`,
          { uid, contentId, playlistId: draft.playlistId },
        );
      }
    }
  } else if (draft.playlistIntent === 'new' && draft.newPlaylistName) {
    // Create new playlist and add content
    const newPlRef = firestore.collection('playlists').doc();
    const newPlId = newPlRef.id;
    const nowPl = new Date().toISOString();
    const plDoc = {
      playlistId: newPlId,
      ownerUid: uid,
      ownerSnapshot: owner,
      title: draft.newPlaylistName,
      visibility: 'onlyMe' as const,
      source: 'audioPublish' as const,
      world: draft.world,
      itemCount: 1,
      firstItemIds: [contentId],
      createdAt: nowPl,
      updatedAt: nowPl,
      lastItemAddedAt: nowPl,
      status: 'active' as const,
    };
    const itemDoc = {
      playlistId: newPlId,
      contentId,
      ownerUid: uid,
      addedByUid: uid,
      addedAt: nowPl,
      sortOrder: 1,
      contentSnapshot: {
        title: draft.title || '',
        ownerUid: uid,
        ownerDisplayName: owner.ownerDisplayName,
        coverPath: draft.coverAsset?.storagePath,
        durationMs: draft.audioAsset?.durationMs,
        kind: draft.kind,
        world: draft.world,
      },
    };
    const plRefData = {
      playlistId: newPlId,
      title: draft.newPlaylistName,
      visibility: 'onlyMe' as const,
      itemCount: 1,
      createdAt: nowPl,
      updatedAt: nowPl,
    };
    const plBatch = firestore.batch();
    plBatch.set(newPlRef, plDoc);
    plBatch.set(newPlRef.collection('items').doc(contentId), itemDoc);
    plBatch.set(
      firestore.collection('users').doc(uid).collection('playlistRefs').doc(newPlId),
      plRefData,
    );
    // Also update the contentItem with the new playlistId
    plBatch.update(contentRef, { playlistId: newPlId });
    await plBatch.commit();
    functions.logger.info(
      `[publishAudioContent] Created playlist ${newPlId} and added ${contentId}`,
      { uid, contentId, playlistId: newPlId },
    );
  }
}

// ─── Callable ──────────────────────────────────────────────────────────────────

export const publishAudioContent = functions
  .region('us-central1')
  .https.onCall(
    async (
      data: PublishAudioContentRequest,
      context: functions.https.CallableContext,
    ): Promise<PublishAudioContentResponse> => {
      // ── 1. Auth check ──────────────────────────────────────────────────────
      if (!context.auth) {
        throw new functions.https.HttpsError(
          'unauthenticated',
          'Authentication required to publish content.',
        );
      }

      const uid = context.auth.uid;

      // ── 2. Validate draftId ────────────────────────────────────────────────
      if (!data.draftId || typeof data.draftId !== 'string') {
        throw new functions.https.HttpsError(
          'invalid-argument',
          'draftId is required.',
        );
      }

      // ── 3. Read draft and verify ownership ─────────────────────────────────
      const draftRef = db.collection('drafts').doc(uid)
        .collection('drafts').doc(data.draftId);
      const draftSnap = await draftRef.get();

      if (!draftSnap.exists) {
        throw new functions.https.HttpsError(
          'not-found',
          `Draft ${data.draftId} not found.`,
        );
      }

      const draft = draftSnap.data() as AudioDraftDoc;

      if (draft.ownerUid !== uid) {
        throw new functions.https.HttpsError(
          'permission-denied',
          'You can only publish your own drafts.',
        );
      }

      // ── 3b. Duplicate-publish protection ───────────────────────────────
      // If the draft was already published, check if playlist side-effects
      // completed. If not, re-run them. Then return the existing content ID.
      if (draft.targetContentId) {
        const existingContentId = draft.targetContentId;

        // Check if playlist side-effects need recovery
        if (
          draft.playlistIntent === 'new' || draft.playlistIntent === 'existing'
        ) {
          const existingContent = await db.collection('contentItems').doc(existingContentId).get();
          const existingData = existingContent.data();
          if (existingData && !existingData.playlistId) {
            // Playlist side-effects didn't complete — build owner snapshot for recovery
            const recoveryProfileDoc = await db.collection('publicProfiles').doc(uid).get();
            const recoveryProfileData = recoveryProfileDoc.data();
            const recoveryOwner: OwnerSnapshot = {
              ownerUsername: recoveryProfileData?.generalProfile?.username ?? '',
              ownerDisplayName: recoveryProfileData?.generalProfile?.displayName ?? '',
              ownerAvatarUrl: recoveryProfileData?.generalProfile?.avatarUrl,
            };
            try {
              await runPlaylistSideEffects(
                db, uid, draft, existingContentId,
                db.collection('contentItems').doc(existingContentId),
                recoveryOwner,
              );
            } catch (recoverErr) {
              functions.logger.error(
                `[publishAudioContent] Playlist recovery failed (non-blocking)`,
                { uid, contentId: existingContentId, error: recoverErr },
              );
            }
          }
        }

        functions.logger.info(
          `[publishAudioContent] Draft ${data.draftId} already published as ${existingContentId}, returning existing.`,
          { uid, contentId: existingContentId, draftId: data.draftId },
        );
        return {
          contentId: existingContentId,
          status: 'readyForUpload',
        };
      }

      // ── 4. Validate required publish fields ────────────────────────────────
      if (!draft.title) {
        throw new functions.https.HttpsError(
          'failed-precondition',
          'Draft title is required for publishing.',
        );
      }
      if (!draft.world) {
        throw new functions.https.HttpsError(
          'failed-precondition',
          'Draft world is required for publishing.',
        );
      }
      if (!draft.kind) {
        throw new functions.https.HttpsError(
          'failed-precondition',
          'Draft kind (audio type) is required for publishing.',
        );
      }

      // ── 4b. Require audio asset (Phase 8-B) ────────────────────────────────
      if (!draft.audioAsset || draft.audioAsset.uploadStatus !== 'uploaded') {
        throw new functions.https.HttpsError(
          'failed-precondition',
          'Draft must have an uploaded audio asset before publishing. Record or upload audio first.',
        );
      }

      // ── 4c. Validate preview readiness (Phase 8-L.1) ─────────────────────
      // If any audio processing stages are enabled, their previews must be ready.
      const hasEditEnabled = draft.editConfig?.enabled;
      const hasEffectsEnabled = draft.effectsConfig?.enabled;
      const hasMixingEnabled = draft.mixingConfig?.enabled;

      if (hasEditEnabled || hasEffectsEnabled || hasMixingEnabled) {
        const pa = draft.previewAssets;
        if (hasEditEnabled && pa?.edit?.status !== 'ready') {
          throw new functions.https.HttpsError(
            'failed-precondition',
            'يجب معاينة القص قبل النشر (Edit preview must be ready before publishing).',
          );
        }
        if (hasEffectsEnabled && pa?.effects?.status !== 'ready') {
          throw new functions.https.HttpsError(
            'failed-precondition',
            'يجب معاينة المؤثرات قبل النشر (Effects preview must be ready before publishing).',
          );
        }
        if (hasMixingEnabled && pa?.mixing?.status !== 'ready') {
          throw new functions.https.HttpsError(
            'failed-precondition',
            'يجب معاينة المكساج قبل النشر (Mixing preview must be ready before publishing).',
          );
        }
      }

      // ── 5. Check publishing capability ─────────────────────────────────────
      // Read user's capabilities from users/{uid}
      const userDoc = await db.collection('users').doc(uid).get();
      const userCapabilities = userDoc.exists
        ? (userDoc.data()?.capabilities as Record<string, boolean> | undefined)
        : undefined;

      const publishCheck = canPublishAudioKindToWorld(
        draft.world,
        draft.kind,
        userCapabilities,
      );

      if (!publishCheck.allowed) {
        throw new functions.https.HttpsError(
          'permission-denied',
          publishCheck.reason ?? 'Publishing not allowed for this world/kind combination.',
        );
      }

      // ── 6. Build owner snapshot from publicProfiles ────────────────────────
      const profileDoc = await db.collection('publicProfiles').doc(uid).get();
      const profileData = profileDoc.data();

      const owner: OwnerSnapshot = {
        ownerUsername: profileData?.generalProfile?.username ?? '',
        ownerDisplayName: profileData?.generalProfile?.displayName ?? '',
        ownerAvatarUrl: profileData?.generalProfile?.avatarUrl,
      };

      // ── 7. Create content document ─────────────────────────────────────────
      const contentRef = db.collection('contentItems').doc(); // auto-ID
      const contentId = contentRef.id;
      const now = new Date().toISOString();

      const contentDoc = createAudioContentFromDraft(draft, owner, contentId, now);

      // Phase 8-L.1: If we have an approved preview, instantly promote it to the final master
      const latestPreview = draft.previewAssets?.mixing
        ?? draft.previewAssets?.effects
        ?? draft.previewAssets?.edit;
      if (latestPreview?.status === 'ready' && latestPreview.storagePath) {
        const destPath = `audioProcessed/${uid}/${contentId}/master/master.m4a`;
        await admin.storage().bucket().file(latestPreview.storagePath).copy(destPath);
        
        const [meta] = await admin.storage().bucket().file(latestPreview.storagePath).getMetadata();
        
        contentDoc.contentProcessingStatus = 'ready';
        contentDoc.processedAudio = {
          storagePath: destPath,
          mimeType: latestPreview.mimeType || 'audio/mp4',
          durationMs: latestPreview.durationMs || 0,
          sizeBytes: meta.size ? Number(meta.size) : 0,
          createdAt: now,
          sourceOriginalPath: draft.audioAsset?.storagePath || '',
        };
        
        functions.logger.info(`[publishAudioContent] Instantly published using preview ${latestPreview.storagePath}`, { contentId });
      }

      // ── 8. Write content + optionally delete draft (batch) ─────────────────
      const batch = db.batch();
      batch.set(contentRef, contentDoc);

      if (data.deleteDraftAfterPublish) {
        batch.delete(draftRef);
      } else {
        // Mark draft as linked to published content
        batch.update(draftRef, {
          targetContentId: contentId,
          status: 'readyForUpload',
          updatedAt: now,
          lastSavedAt: now,
        });
      }

      await batch.commit();

      // ── 9. Playlist side-effects (Phase 8-I) ───────────────────────────────
      // Delegated to extracted function for idempotent re-use on retry.
      // Non-blocking — playlist failure does not fail the publish.
      try {
        await runPlaylistSideEffects(db, uid, draft, contentId, contentRef, owner);
      } catch (playlistErr) {
        // Playlist failure is non-blocking — content is still published
        functions.logger.error(
          `[publishAudioContent] Playlist side-effect failed (non-blocking)`,
          { uid, contentId, error: playlistErr },
        );
      }

      functions.logger.info(
        `[publishAudioContent] Published content ${contentId} from draft ${data.draftId} for user ${uid}`,
        {
          uid,
          contentId,
          draftId: data.draftId,
          world: draft.world,
          kind: draft.kind,
          deletedDraft: data.deleteDraftAfterPublish ?? false,
        },
      );

      return {
        contentId,
        status: contentDoc.status,
      };
    },
  );
