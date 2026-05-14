/**
 * Sound Platform — Cloud Functions Entry Point
 * ===============================================
 * Phase:   5-B (User Lifecycle & Public Profile Projection)
 * Updated: 2026-05-14 (5-B-1 fix: ignoreUndefinedProperties)
 *
 * Exports:
 *   onUserCreate — triggered when a new Firebase Auth user is created.
 *                  Creates users/{uid} (private) and publicProfiles/{uid} (public projection).
 *
 * Constraints:
 *   - No publishing functions yet.
 *   - No content creation functions yet.
 *   - No capability-mutation functions yet.
 *   - users/{uid} is NEVER readable by other users via client SDK.
 *   - publicProfiles/{uid} contains only public-safe fields.
 */

import * as admin from 'firebase-admin';

// ─── Admin SDK initialisation (project-wide, idempotent) ─────────────────────
// ignoreUndefinedProperties: optional TypeScript fields (undefined) are dropped
// from Firestore writes instead of throwing "Cannot use undefined as a Firestore value".
if (admin.apps.length === 0) {
  admin.initializeApp();
}
admin.firestore().settings({ ignoreUndefinedProperties: true });

export { onUserCreate } from './triggers/onUserCreate';
