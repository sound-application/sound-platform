/**
 * Sound Platform — onUserProfileUpdate Cloud Function
 * =====================================================
 * Phase:   5-C (Profile Update Sync & Privacy-Filtered Public Projection)
 * Updated: 2026-05-14
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
import type { UserPrivateDoc } from '@sound/shared';
import { buildPublicProfileFromUser } from '../helpers/buildPublicProfile';

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
  });
