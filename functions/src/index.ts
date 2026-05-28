/**
 * Sound Platform — Cloud Functions Entry Point
 * ===============================================
 * Phase:   8-A (Audio Content Core Foundation)
 * Updated: 2026-05-27
 *
 * Exports (Phase 8-A additions):
 *   createAudioDraft    — HTTPS callable.
 *                         Creates drafts/{uid}/drafts/{auto-id}.
 *                         Input:  CreateAudioDraftRequest
 *                         Output: CreateAudioDraftResponse { draftId }
 *                         Auth:   required
 *
 *   updateAudioDraft    — HTTPS callable.
 *                         Updates drafts/{uid}/drafts/{draftId}.
 *                         Input:  UpdateAudioDraftRequest
 *                         Output: UpdateAudioDraftResponse { updatedAt }
 *                         Auth:   required
 *
 *   publishAudioContent — HTTPS callable.
 *                         Publishes draft → contentItems/{auto-id}.
 *                         Validates world×kind, checks capabilities, builds owner snapshot.
 *                         Input:  PublishAudioContentRequest { draftId }
 *                         Output: PublishAudioContentResponse { contentId, status }
 *                         Auth:   required
 *
 * Exports (Phase 7.1):
 *   getProfileForViewer — HTTPS callable.
 *                         Returns a viewer-filtered profile for the authenticated caller.
 *                         Enforces: followers / friends / onlyMe / block.
 *                         Input:  { targetKey: string } or { targetUid: string } (legacy)
 *                         Output: GetProfileForViewerResponse (includes resolvedTargetUid)
 *                         Auth:   required (throws unauthenticated if missing)
 *                         Reads:  publicProfiles, usernames, privacySettings, follows, blocks
 *                         Writes: NONE
 *                         Username resolution: publicProfiles/{key} → usernames/{normalized}
 *
 * Exports (Phase 6-B):
 *   onFollowWrite       — triggered on follows/{uid}/following/{targetUid} write.
 *                         Mirrors follow events into followers/ subcollection.
 *                         Increments/decrements follower/following counts atomically.
 *
 * Exports (Phase 5-C / 7.1):
 *   onUserCreate        — triggered when a new Firebase Auth user is created.
 *                         Creates users/{uid}, publicProfiles/{uid}, privacySettings/{uid},
 *                         usernames/{normalizedUsername} atomically via batch write.
 *
 *   onUserProfileUpdate — triggered on every write to users/{uid}.
 *                         Rebuilds publicProfiles/{uid} using section-level
 *                         privacy filtering. Handles create, update, delete.
 *                         Phase 7.1: syncs usernames/{normalized} on username change.
 *
 * Architecture constraints:
 *   - users/{uid} is NEVER readable by other users via client SDK.
 *   - publicProfiles/{uid} contains only public-safe fields (static, viewer-agnostic).
 *   - publicProfiles/{uid} is only writable via Admin SDK.
 *   - getProfileForViewer adds viewer-aware filtering on top of publicProfiles.
 *   - usernames/{normalizedUsername} maps username → UID (Phase 7.1).
 *   - contentItems/{contentId} is the audio content storage collection (Phase 8-A).
 *   - drafts/{uid}/drafts/{draftId} is the audio draft storage collection (Phase 8-A).
 *   - No upload/transcoding/media pipeline functions yet (Phase 8-B).
 *
 * Infinite loop prevention:
 *   - onUserProfileUpdate watches users/{uid} and writes publicProfiles/{uid}.
 *   - These are different collections — no recursive trigger.
 *   - getProfileForViewer is a callable — no Firestore watches, no writes.
 *   - Audio callables (create/update/publish) are callables — no watches, targeted writes.
 */

import * as admin from 'firebase-admin';

// ─── Admin SDK initialisation (project-wide, idempotent) ─────────────────────
// ignoreUndefinedProperties: optional TypeScript fields (undefined) are dropped
// from Firestore writes instead of throwing "Cannot use undefined as a Firestore value".
if (admin.apps.length === 0) {
  admin.initializeApp();
}
admin.firestore().settings({ ignoreUndefinedProperties: true });

// ─── Phase 5-C / 6-B / 7.1 — Profile & Social ──────────────────────────────
export { onUserCreate }         from './triggers/onUserCreate';
export { onUserProfileUpdate }  from './triggers/onUserProfileUpdate';
export { onFollowWrite }        from './triggers/onFollowWrite';
export { getProfileForViewer }  from './callables/getProfileForViewer';

// ─── Phase 8-A — Audio Content Core ─────────────────────────────────────────
export { createAudioDraft }     from './callables/createAudioDraft';
export { updateAudioDraft }     from './callables/updateAudioDraft';
export { publishAudioContent }  from './callables/publishAudioContent';

// ─── Phase 8-D — Audio Playback ─────────────────────────────────────────────
export { getAudioPlaybackUrl }  from './callables/getAudioPlaybackUrl';

// ─── Phase 8-F — Real Audio Processing Worker ───────────────────────────
export { onAudioContentPublished } from './triggers/onAudioContentPublished';
