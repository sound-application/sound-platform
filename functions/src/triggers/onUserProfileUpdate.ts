/**
 * Sound Platform — onUserProfileUpdate Cloud Function
 * =====================================================
 * Phase:   7.1 (Username-Aware Profile Links)
 * Updated: 2026-05-27
 *
 * Trigger: Firestore document write on users/{uid}
 *   - Fires on create, update, delete of any users/{uid} document.
 *
 * On each write to users/{uid}:
 *   1. Reads the updated UserPrivateDoc.
 *   2. Builds the privacy-filtered publicProfiles/{uid} projection.
 *   3. Writes (merge: false — full replace) to publicProfiles/{uid}.
 *
 * On delete (users/{uid} removed):
 *   - Deletes publicProfiles/{uid} to avoid orphaned public documents.
 *
 * INFINITE LOOP PREVENTION:
 *   - This trigger watches users/{uid}.
 *   - It WRITES to publicProfiles/{uid} — a DIFFERENT collection.
 *   - Writes to publicProfiles/{uid} do NOT fire this trigger.
 *   - There is NO recursive loop.
 *
 * PRIVACY MODEL (Phase 4-H-2):
 *   - See buildPublicProfile.ts for the full section-by-section filter.
 *   - Fields NEVER included: email, role, capabilities, restrictions,
 *     walletId, kycStatus, isMinor, isBanned, privacy settings,
 *     savedItems, storyViews, privatePlaylists, raw consumerActivity.
 *
 * ADMIN SDK WRITES (publicProfiles/{uid}):
 *   - Uses Admin SDK — bypasses Firestore client rules.
 *   - publicProfiles/{uid} client write is DENIED by Firestore rules.
 *   - Only Cloud Functions (Admin SDK) can write publicProfiles.
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import type { UserPrivateDoc, UsernameDoc } from '@sound/shared';
import { buildPublicProfileFromUser } from '../helpers/buildPublicProfile';
import { normalizeUsername } from '@sound/shared';

// ── Firestore reference (Admin SDK init + settings in index.ts) ──────────────
const db = admin.firestore();

// ── Write-amplification guard ──────────────────────────────────────────────────────────

/**
 * Fields in users/{uid} that affect the publicProfiles/{uid} projection.
 * Writes that touch ONLY fields outside this set (e.g. latestActivity heartbeat,
 * points balance, isBanned flag, system timestamps) skip the expensive rebuild.
 */
const PROFILE_RELEVANT_FIELDS = new Set([
  'username', 'displayName', 'avatarUrl', 'coverUrl',
  'isVerified', 'verificationBadgeType',
  'bio', 'location', 'websiteUrl', 'mood', 'socialLinks',
  'followersCount', 'followingCount', 'postsCount', 'listensCount',
  'badges', 'achievements', 'activityStatus', 'pinnedContent',
  'privacy', 'capabilities', 'consumerActivity',
]);

/**
 * Returns true if any field that affects the public projection changed
 * between the before and after snapshots.
 * Uses JSON serialisation for deep comparison — acceptable given the small
 * size of the checked fields and the cost saving on the write side.
 */
function hasPublicRelevantChange(
  before: Record<string, unknown>,
  after:  Record<string, unknown>,
): boolean {
  for (const field of PROFILE_RELEVANT_FIELDS) {
    if (JSON.stringify(before[field]) !== JSON.stringify(after[field])) {
      return true;
    }
  }
  return false;
}

// ─── onUserProfileUpdate trigger ──────────────────────────────────────────────

export const onUserProfileUpdate = functions.firestore
  .document('users/{uid}')
  .onWrite(async (change, context) => {
    const { uid } = context.params as { uid: string };
    const now = new Date().toISOString();

    // ── Case 1: Document deleted — remove public projection ──────────────────
    if (!change.after.exists) {
      functions.logger.info(
        `[onUserProfileUpdate] users/${uid} deleted — removing publicProfiles/${uid}`,
        { uid },
      );
      try {
        await db.collection('publicProfiles').doc(uid).delete();
        functions.logger.info(
          `[onUserProfileUpdate] Deleted publicProfiles/${uid}`,
          { uid },
        );
      } catch (err) {
        functions.logger.error(
          `[onUserProfileUpdate] Failed to delete publicProfiles/${uid}`,
          { uid, err },
        );
        throw err;
      }
      return;
    }

    // ── Case 2: Document created or updated — rebuild projection ─────────────
    const userData = change.after.data() as UserPrivateDoc | undefined;

    if (!userData) {
      functions.logger.warn(
        `[onUserProfileUpdate] users/${uid} has no data after write — skipping`,
        { uid },
      );
      return;
    }

    // ── Write-amplification guard ─────────────────────────────────────────────
    // Skip projection rebuild if no public-profile-relevant fields changed.
    // Heartbeat fields (latestActivity), points balance, ban timestamps, content
    // ID arrays (posts, stories, etc.) do NOT affect the public projection.
    if (change.before.exists) {
      const beforeData = change.before.data() as Record<string, unknown>;
      const afterData  = change.after.data()  as Record<string, unknown>;
      if (!hasPublicRelevantChange(beforeData, afterData)) {
        functions.logger.info(
          `[onUserProfileUpdate] No public-relevant field changes for ${uid} — skipping projection rebuild`,
          { uid },
        );
        return;
      }
    }

    functions.logger.info(
      `[onUserProfileUpdate] Rebuilding publicProfiles/${uid}`,
      {
        uid,
        isCreate: !change.before.exists,
        hasPrivacy: !!userData.privacy,
      },
    );

    // Build the privacy-filtered projection using shared helper.
    // buildPublicProfileFromUser applies all section-level privacy gates.
    const publicDoc = buildPublicProfileFromUser(userData, now);

    try {
      // Full replace — not merge. Ensures deleted private sections are removed
      // from the public projection when the user changes their privacy settings.
      await db.collection('publicProfiles').doc(uid).set(publicDoc, { merge: false });

      functions.logger.info(
        `[onUserProfileUpdate] Updated publicProfiles/${uid}`,
        { uid },
      );
    } catch (err) {
      functions.logger.error(
        `[onUserProfileUpdate] Failed to write publicProfiles/${uid}`,
        { uid, err },
      );
      throw err;
    }

    // ── Username index sync (Phase 7.1) ───────────────────────────────────
    // When users/{uid}.username changes, sync the usernames/{normalized} index.
    //
    // LIMITATION: The client update to users/{uid}.username has already landed
    // when this trigger fires. If the new username conflicts with another user's
    // index entry, the trigger logs a warning but cannot roll back the write.
    // This is a best-effort guard. Collisions are rare because deriveUsername
    // appends a 6-char UID suffix. A future Phase could add pre-validation
    // via a callable (checkUsernameAvailability) before the client write.
    if (change.before.exists) {
      const beforeUsername = (change.before.data() as Record<string, unknown>).username as string | undefined;
      const afterUsername  = userData.username;

      if (beforeUsername && afterUsername && beforeUsername !== afterUsername) {
        const oldNormalized = normalizeUsername(beforeUsername);
        const newNormalized = normalizeUsername(afterUsername);

        if (oldNormalized !== newNormalized && newNormalized) {
          functions.logger.info(
            `[onUserProfileUpdate] Username changed for ${uid}: "${beforeUsername}" → "${afterUsername}"`,
            { uid, oldNormalized, newNormalized },
          );

          try {
            // Check if the new username is already taken by another user
            const existingSnap = await db.collection('usernames').doc(newNormalized).get();
            if (existingSnap.exists) {
              const existingDoc = existingSnap.data() as UsernameDoc;
              if (existingDoc.uid !== uid) {
                // Another user owns this username — do NOT overwrite
                functions.logger.error(
                  `[onUserProfileUpdate] Username conflict: "${newNormalized}" already belongs to uid ${existingDoc.uid}. Cannot assign to ${uid}.`,
                  { uid, newNormalized, conflictUid: existingDoc.uid },
                );
                // Skip — the trigger cannot roll back the users/{uid} write.
                // The old username index remains valid. The user's display
                // username in users/{uid} is now mismatched with the index.
                // A manual fix or callable-based rename is needed.
                return;
              }
              // Same user — username doc already exists for this uid (idempotent)
            }

            // Create new username index entry
            const newDoc: UsernameDoc = {
              uid,
              username: afterUsername,
              normalizedUsername: newNormalized,
              createdAt: existingSnap.exists ? ((existingSnap.data() as UsernameDoc).createdAt ?? now) : now,
              updatedAt: now,
            };
            await db.collection('usernames').doc(newNormalized).set(newDoc, { merge: false });

            functions.logger.info(
              `[onUserProfileUpdate] Created usernames/${newNormalized} for uid ${uid}`,
              { uid, newNormalized },
            );

            // Delete old username index entry (only if it still belongs to this uid)
            if (oldNormalized && oldNormalized !== newNormalized) {
              const oldSnap = await db.collection('usernames').doc(oldNormalized).get();
              if (oldSnap.exists) {
                const oldDoc = oldSnap.data() as UsernameDoc;
                if (oldDoc.uid === uid) {
                  await db.collection('usernames').doc(oldNormalized).delete();
                  functions.logger.info(
                    `[onUserProfileUpdate] Deleted old usernames/${oldNormalized} for uid ${uid}`,
                    { uid, oldNormalized },
                  );
                } else {
                  functions.logger.warn(
                    `[onUserProfileUpdate] Old username "${oldNormalized}" now belongs to uid ${oldDoc.uid} — not deleting`,
                    { uid, oldNormalized, ownerUid: oldDoc.uid },
                  );
                }
              }
            }
          } catch (err) {
            functions.logger.error(
              `[onUserProfileUpdate] Failed to sync usernames index for ${uid}`,
              { uid, err },
            );
            // Non-fatal — publicProfiles was already updated above.
            // The usernames index is best-effort in this trigger.
          }
        }
      }
    }
  });
