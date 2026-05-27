/**
 * Sound Platform — Cloud Functions Entry Point
 * ===============================================
 * Phase:   7.1 (Username-Aware Profile Links)
 * Updated: 2026-05-27
 *
 * Exports (Phase 7.1 additions):
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
 *   - No publishing, content creation, or capability-mutation functions yet.
 *
 * Infinite loop prevention:
 *   - onUserProfileUpdate watches users/{uid} and writes publicProfiles/{uid}.
 *   - These are different collections — no recursive trigger.
 *   - getProfileForViewer is a callable — no Firestore watches, no writes.
 */

import * as admin from 'firebase-admin';

// ─── Admin SDK initialisation (project-wide, idempotent) ─────────────────────
// ignoreUndefinedProperties: optional TypeScript fields (undefined) are dropped
// from Firestore writes instead of throwing "Cannot use undefined as a Firestore value".
if (admin.apps.length === 0) {
  admin.initializeApp();
}
admin.firestore().settings({ ignoreUndefinedProperties: true });

export { onUserCreate }         from './triggers/onUserCreate';
export { onUserProfileUpdate }  from './triggers/onUserProfileUpdate';
export { onFollowWrite }        from './triggers/onFollowWrite';
export { getProfileForViewer }  from './callables/getProfileForViewer';
