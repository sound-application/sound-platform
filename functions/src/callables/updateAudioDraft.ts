/**
 * Sound Platform — updateAudioDraft Callable Cloud Function
 * ===========================================================
 * Phase:   8-B (Audio Recording + Upload + Storage Attachment)
 * Updated: 2026-05-27
 *
 * WHAT THIS FUNCTION DOES:
 *   Updates an existing audio draft in drafts/{uid}/drafts/{draftId}.
 *   Used by the creation wizard to progressively save draft metadata
 *   as the user moves through info → record → effects → publish steps.
 *
 * CALLER CONTRACT:
 *   Input:  UpdateAudioDraftRequest { draftId, ...fields }
 *   Output: UpdateAudioDraftResponse { updatedAt: string }
 *   Auth:   required — throws unauthenticated if not signed in
 *
 * VALIDATION:
 *   - Verifies the draft exists and belongs to the caller.
 *   - If world AND kind are both set (including existing values), validates combination.
 *   - Does NOT allow changing ownerUid or createdAt.
 *
 * DATA WRITES:
 *   - Updates drafts/{uid}/drafts/{draftId} via Admin SDK.
 *
 * DATA READS:
 *   - Reads drafts/{uid}/drafts/{draftId} to verify ownership.
 *
 * INFINITE LOOP PREVENTION:
 *   Callable (HTTPS trigger). No Firestore watches. Single write, no loops.
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import type {
  UpdateAudioDraftRequest,
  UpdateAudioDraftResponse,
  AudioDraftDoc,
  AudioAssetMeta,
} from '@sound/shared';
import { validateAudioWorldKind } from '@sound/shared';

// ── Admin Firestore ────────────────────────────────────────────────────────────
const db = admin.firestore();

// ─── Callable ──────────────────────────────────────────────────────────────────

export const updateAudioDraft = functions
  .region('us-central1')
  .https.onCall(
    async (
      data: UpdateAudioDraftRequest,
      context: functions.https.CallableContext,
    ): Promise<UpdateAudioDraftResponse> => {
      // ── 1. Auth check ──────────────────────────────────────────────────────
      if (!context.auth) {
        throw new functions.https.HttpsError(
          'unauthenticated',
          'Authentication required to update a draft.',
        );
      }

      const uid = context.auth.uid;

      // ── 2. Validate draftId is provided ────────────────────────────────────
      if (!data.draftId || typeof data.draftId !== 'string') {
        throw new functions.https.HttpsError(
          'invalid-argument',
          'draftId is required.',
        );
      }

      // ── 3. Read existing draft and verify ownership ────────────────────────
      const draftRef = db.collection('drafts').doc(uid)
        .collection('drafts').doc(data.draftId);
      const draftSnap = await draftRef.get();

      if (!draftSnap.exists) {
        throw new functions.https.HttpsError(
          'not-found',
          `Draft ${data.draftId} not found.`,
        );
      }

      const existing = draftSnap.data() as AudioDraftDoc;

      if (existing.ownerUid !== uid) {
        throw new functions.https.HttpsError(
          'permission-denied',
          'You can only update your own drafts.',
        );
      }

      // ── 4. Validate world×kind if both will be set ─────────────────────────
      const effectiveWorld = data.world ?? existing.world;
      const effectiveKind = data.kind ?? existing.kind;

      if (effectiveWorld && effectiveKind) {
        if (!validateAudioWorldKind(effectiveWorld, effectiveKind)) {
          throw new functions.https.HttpsError(
            'invalid-argument',
            `Audio kind "${effectiveKind}" is not valid for world "${effectiveWorld}".`,
          );
        }
      }

      // ── 5. Build update payload ────────────────────────────────────────────
      const now = new Date().toISOString();
      const update: Record<string, unknown> = {
        updatedAt: now,
        lastSavedAt: now,
      };

      // Only include fields that were provided in the request
      if (data.world !== undefined)            update.world = data.world;
      if (data.kind !== undefined)             update.kind = data.kind;
      if (data.title !== undefined)            update.title = data.title;
      if (data.caption !== undefined)          update.caption = data.caption;
      if (data.description !== undefined)      update.description = data.description;
      if (data.categoryId !== undefined)       update.categoryId = data.categoryId;
      if (data.categoryLabel !== undefined)    update.categoryLabel = data.categoryLabel;
      if (data.subcategoryId !== undefined)    update.subcategoryId = data.subcategoryId;
      if (data.subcategoryLabel !== undefined) update.subcategoryLabel = data.subcategoryLabel;
      if (data.countryMode !== undefined)      update.countryMode = data.countryMode;
      if (data.countryCodes !== undefined)     update.countryCodes = data.countryCodes;
      if (data.countryCode !== undefined)      update.countryCode = data.countryCode;
      if (data.countryLabel !== undefined)     update.countryLabel = data.countryLabel;
      if (data.language !== undefined)         update.language = data.language;
      if (data.tags !== undefined)             update.tags = data.tags;
      if (data.audience !== undefined)         update.audience = data.audience;
      if (data.isExplicit !== undefined)       update.isExplicit = data.isExplicit;
      if (data.ageSuitability !== undefined)   update.ageSuitability = data.ageSuitability;
      if (data.publishToggles !== undefined)   update.publishToggles = data.publishToggles;
      if (data.coverAsset !== undefined)       update.coverAsset = data.coverAsset;
      if (data.captionsSetup !== undefined)    update.captionsSetup = data.captionsSetup;
      if (data.autoCue !== undefined)          update.autoCue = data.autoCue;
      if (data.isChildContent !== undefined)  update.isChildContent = data.isChildContent;
      if (data.placementFeed !== undefined)   update.placementFeed = data.placementFeed;
      if (data.playlistIntent !== undefined)  update.playlistIntent = data.playlistIntent;
      if (data.playlistId !== undefined)      update.playlistId = data.playlistId;
      if (data.newPlaylistName !== undefined) update.newPlaylistName = data.newPlaylistName;
      if (data.currentStep !== undefined)      update.currentStep = data.currentStep;

      // ── 5b. Handle audioAsset attachment (Phase 8-B) ────────────────────────
      if (data.audioAsset !== undefined) {
        const asset = data.audioAsset as AudioAssetMeta;

        // Validate storagePath belongs to this user
        if (asset.storagePath && !asset.storagePath.startsWith(`audioUploads/${uid}/`)) {
          throw new functions.https.HttpsError(
            'invalid-argument',
            'Audio asset storagePath must be under your own audioUploads directory.',
          );
        }

        // Validate uploadStatus is 'uploaded'
        if (asset.uploadStatus !== 'uploaded') {
          throw new functions.https.HttpsError(
            'invalid-argument',
            'Audio asset uploadStatus must be "uploaded" when attaching to a draft.',
          );
        }

        // Force server-only processing fields to pending
        const sanitizedAsset: AudioAssetMeta = {
          ...asset,
          processingStatus: 'pending',
          waveformStatus: 'pending',
          transcriptStatus: 'pending',
        };

        update.audioAsset = sanitizedAsset;
        update.audioAssetId = sanitizedAsset.assetId || null;
      }

      // ── 6. Write update to Firestore ───────────────────────────────────────
      await draftRef.update(update);

      functions.logger.info(
        `[updateAudioDraft] Updated draft ${data.draftId} for user ${uid}`,
        { uid, draftId: data.draftId, fieldsUpdated: Object.keys(update) },
      );

      return { updatedAt: now };
    },
  );
