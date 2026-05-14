/**
 * Sound Platform — Cloud Functions Entry Point
 * ===============================================
 * Phase:   5-B (User Lifecycle & Public Profile Projection)
 * Updated: 2026-05-14
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

export { onUserCreate } from './triggers/onUserCreate';
