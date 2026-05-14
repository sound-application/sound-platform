/**
 * Sound Platform — Cloud Functions Entry Point
 * ===============================================
 * Phase:   5-C (Profile Update Sync & Privacy-Filtered Public Projection)
 * Updated: 2026-05-14
 *
 * Exports:
 *   onUserCreate         — triggered when a new Firebase Auth user is created.
 *                          Creates users/{uid} (private) and publicProfiles/{uid}
 *                          (public projection) atomically via batch write.
 *
 *   onUserProfileUpdate  — triggered on every write to users/{uid}.
 *                          Rebuilds publicProfiles/{uid} using section-level
 *                          privacy filtering. Handles create, update, delete.
 *
 * Constraints:
 *   - No publishing functions yet (Phase 5-D+).
 *   - No content creation functions yet.
 *   - No capability-mutation functions yet.
 *   - users/{uid} is NEVER readable by other users via client SDK.
 *   - publicProfiles/{uid} contains only public-safe fields.
 *   - publicProfiles/{uid} is only writable via Admin SDK (Cloud Functions).
 *
 * Infinite loop prevention:
 *   - onUserProfileUpdate watches users/{uid} and writes publicProfiles/{uid}.
 *   - These are different collections — no recursive trigger.
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
