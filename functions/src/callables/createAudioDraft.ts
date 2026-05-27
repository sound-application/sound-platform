/**
 * Sound Platform — createAudioDraft Callable Cloud Function
 * ===========================================================
 * Phase:   8-A (Audio Content Core Foundation)
 * Updated: 2026-05-27
 *
 * WHAT THIS FUNCTION DOES:
 *   Creates a new audio draft in drafts/{uid}/drafts/{auto-id}.
 *   The draft starts nearly empty and is progressively filled through
 *   the creation wizard (info → record → effects → publish).
 *
 * CALLER CONTRACT:
 *   Input:  CreateAudioDraftRequest (all fields optional)
 *   Output: CreateAudioDraftResponse { draftId: string }
 *   Auth:   required — throws unauthenticated if not signed in
 *
 * VALIDATION:
 *   - If world AND kind are both provided, validates the combination.
 *   - If only one is provided, accepts it (validation at publish time).
 *   - No capability check — drafts are free to create in any world.
 *     Capability is checked at publish time only.
 *
 * DATA WRITES:
 *   - Creates drafts/{uid}/drafts/{draftId} via Admin SDK.
 *
 * DATA READS:
 *   - None.
 *
 * INFINITE LOOP PREVENTION:
 *   Callable (HTTPS trigger). No Firestore watches. Single write, no loops.
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import type { CreateAudioDraftRequest, CreateAudioDraftResponse } from '@sound/shared';
import { createEmptyAudioDraft, validateAudioWorldKind } from '@sound/shared';

// ── Admin Firestore ────────────────────────────────────────────────────────────
const db = admin.firestore();

// ─── Callable ──────────────────────────────────────────────────────────────────

export const createAudioDraft = functions
  .region('us-central1')
  .https.onCall(
    async (
      data: CreateAudioDraftRequest,
      context: functions.https.CallableContext,
    ): Promise<CreateAudioDraftResponse> => {
      // ── 1. Auth check ──────────────────────────────────────────────────────
      if (!context.auth) {
        throw new functions.https.HttpsError(
          'unauthenticated',
          'Authentication required to create a draft.',
        );
      }

      const uid = context.auth.uid;
      const now = new Date().toISOString();

      // ── 2. Validate world×kind if both provided ────────────────────────────
      if (data.world && data.kind) {
        if (!validateAudioWorldKind(data.world, data.kind)) {
          throw new functions.https.HttpsError(
            'invalid-argument',
            `Audio kind "${data.kind}" is not valid for world "${data.world}".`,
          );
        }
      }

      // ── 3. Generate draft ID ───────────────────────────────────────────────
      const draftRef = db.collection('drafts').doc(uid)
        .collection('drafts').doc(); // auto-ID
      const draftId = draftRef.id;

      // ── 4. Build draft document ────────────────────────────────────────────
      const draft = createEmptyAudioDraft(uid, draftId, now);

      // Apply optional fields from request
      if (data.world)         draft.world = data.world;
      if (data.kind)          draft.kind = data.kind;
      if (data.title)         draft.title = data.title;
      if (data.caption)       draft.caption = data.caption;
      if (data.description)   draft.description = data.description;
      if (data.categoryId)    draft.categoryId = data.categoryId;
      if (data.categoryLabel) draft.categoryLabel = data.categoryLabel;
      if (data.countryCode)   draft.countryCode = data.countryCode;
      if (data.countryLabel)  draft.countryLabel = data.countryLabel;
      if (data.language)      draft.language = data.language;
      if (data.tags)          draft.tags = data.tags;
      if (data.audience)      draft.audience = data.audience;
      if (typeof data.isExplicit === 'boolean') draft.isExplicit = data.isExplicit;

      // ── 5. Write to Firestore ──────────────────────────────────────────────
      await draftRef.set(draft);

      functions.logger.info(
        `[createAudioDraft] Created draft ${draftId} for user ${uid}`,
        { uid, draftId, world: data.world, kind: data.kind },
      );

      return { draftId };
    },
  );
