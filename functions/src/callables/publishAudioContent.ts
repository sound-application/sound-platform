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
      // If the draft was already published, return the existing content ID
      // instead of creating a duplicate contentItems document.
      if (draft.targetContentId) {
        functions.logger.info(
          `[publishAudioContent] Draft ${data.draftId} already published as ${draft.targetContentId}, returning existing.`,
          { uid, contentId: draft.targetContentId, draftId: data.draftId },
        );
        return {
          contentId: draft.targetContentId,
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
