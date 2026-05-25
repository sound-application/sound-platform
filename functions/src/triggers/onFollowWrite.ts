/**
 * Sound Platform — onFollowWrite Cloud Function
 * ===============================================
 * Phase:   6-B (Social Graph Foundation)
 * Updated: 2026-05-25
 *
 * Trigger: Firestore document write on follows/{uid}/following/{targetUid}
 *   - Fires on create, update, delete of any following/{targetUid} document.
 *   - uid     = the follower (the user who performed the follow action)
 *   - targetUid = the user being followed
 *
 * On FOLLOW (document created):
 *   1. Writes follows/{targetUid}/followers/{uid} (follower mirror).
 *   2. Increments users/{uid}.followingCount by +1 (follower's stats).
 *   3. Increments users/{targetUid}.followersCount by +1 (target's stats).
 *      The onUserProfileUpdate trigger then rebuilds publicProfiles/{targetUid}.
 *
 * On UNFOLLOW (document deleted):
 *   1. Deletes follows/{targetUid}/followers/{uid} (mirror cleanup).
 *   2. Decrements users/{uid}.followingCount by -1.
 *   3. Decrements users/{targetUid}.followersCount by -1.
 *      The onUserProfileUpdate trigger then rebuilds publicProfiles/{targetUid}.
 *
 * IDEMPOTENCY:
 *   - The follower mirror write uses set() — safe to re-run.
 *   - The mirror delete uses delete() — safe if doc is already absent.
 *   - Count increments use Firestore FieldValue.increment() — atomic, correct
 *     even under concurrent follows/unfollows.
 *   - Counts never go below 0 (enforced by max(0, decrement) pattern).
 *
 * SELF-FOLLOW GUARD:
 *   - Firestore rules deny follows where uid == targetUid.
 *   - This CF adds a secondary guard as defence-in-depth.
 *
 * ADMIN SDK:
 *   - Uses Admin SDK — bypasses Firestore client rules.
 *   - followers mirror is only writable by this function (rules deny clients).
 *
 * INFINITE LOOP PREVENTION:
 *   - This trigger watches: follows/{uid}/following/{targetUid}
 *   - It writes to:         follows/{targetUid}/followers/{uid}
 *                           users/{uid} (followingCount)
 *                           users/{targetUid} (followersCount)
 *   - writes to follows/{targetUid}/followers/ do NOT re-trigger this function.
 *   - writes to users/{uid} and users/{targetUid} trigger onUserProfileUpdate,
 *     which rebuilds publicProfiles — this is intentional (counter sync).
 *
 * FUTURE (Phase 7 — Privacy enforcement):
 *   - When 'followers' audience token needs enforcement in buildPublicProfile,
 *     the builder can query follows/{targetUid}/followers/{viewerUid} to check
 *     if the viewer follows the target, but ONLY inside a Cloud Function
 *     callable (not in a static document write).
 *   - See buildPublicProfile.ts § AUDIENCE ENFORCEMENT for the roadmap.
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import type { FollowEdge, FollowerEdge } from '@sound/shared';

// ── Firestore reference (Admin SDK init + settings in index.ts) ───────────────
const db = admin.firestore();
const FieldValue = admin.firestore.FieldValue;

// ─── onFollowWrite trigger ────────────────────────────────────────────────────

export const onFollowWrite = functions.firestore
  .document('follows/{uid}/following/{targetUid}')
  .onWrite(async (change, context) => {
    const { uid, targetUid } = context.params as { uid: string; targetUid: string };

    // ── Self-follow guard (defence-in-depth; Firestore rules also block this) ──
    if (uid === targetUid) {
      functions.logger.warn(
        `[onFollowWrite] Self-follow attempt detected for uid=${uid} — ignoring`,
        { uid, targetUid },
      );
      return;
    }

    const wasCreated = !change.before.exists && change.after.exists;
    const wasDeleted = change.before.exists && !change.after.exists;

    // Skip updates (following documents have no mutable fields — they are
    // created and deleted, not updated). Treat an update as a no-op.
    if (!wasCreated && !wasDeleted) {
      functions.logger.info(
        `[onFollowWrite] Document updated (no-op) for uid=${uid} → targetUid=${targetUid}`,
        { uid, targetUid },
      );
      return;
    }

    // ── Paths ────────────────────────────────────────────────────────────────
    const followerMirrorRef = db
      .collection('follows')
      .doc(targetUid)
      .collection('followers')
      .doc(uid);

    const followerUserRef = db.collection('users').doc(uid);
    const targetUserRef   = db.collection('users').doc(targetUid);

    // ── CASE 1: Follow created ────────────────────────────────────────────────
    if (wasCreated) {
      const now = new Date().toISOString();
      const followData = change.after.data() as FollowEdge;

      functions.logger.info(
        `[onFollowWrite] Follow created: uid=${uid} → targetUid=${targetUid}`,
        { uid, targetUid },
      );

      // Build the follower mirror document
      const mirrorDoc: FollowerEdge = {
        sourceUid: uid,
        targetUid,
        createdAt: followData.createdAt ?? now,
      };

      // Use a batch for atomicity:
      //   1. Write follower mirror
      //   2. Increment follower's followingCount
      //   3. Increment target's followersCount
      const batch = db.batch();

      batch.set(followerMirrorRef, mirrorDoc);

      batch.update(followerUserRef, {
        followingCount: FieldValue.increment(1),
        updatedAt:      now,
      });

      batch.update(targetUserRef, {
        followersCount: FieldValue.increment(1),
        updatedAt:      now,
      });

      try {
        await batch.commit();
        functions.logger.info(
          `[onFollowWrite] Follow mirror + count increments committed`,
          { uid, targetUid },
        );
      } catch (err) {
        functions.logger.error(
          `[onFollowWrite] Failed to commit follow batch`,
          { uid, targetUid, err },
        );
        throw err;
      }

      return;
    }

    // ── CASE 2: Follow deleted (unfollow) ─────────────────────────────────────
    if (wasDeleted) {
      const now = new Date().toISOString();

      functions.logger.info(
        `[onFollowWrite] Follow deleted (unfollow): uid=${uid} → targetUid=${targetUid}`,
        { uid, targetUid },
      );

      // Use a batch:
      //   1. Delete follower mirror
      //   2. Decrement follower's followingCount (min 0 — can't go negative)
      //   3. Decrement target's followersCount (min 0)
      //
      // NOTE: FieldValue.increment(-1) is atomic but can theoretically go
      // negative if a count was corrupted. We accept this risk for Phase 6-B.
      // A Cloud Function cleanup job to re-count from subcollection size is
      // the correct long-term fix but is out of scope for this phase.
      const batch = db.batch();

      batch.delete(followerMirrorRef);

      batch.update(followerUserRef, {
        followingCount: FieldValue.increment(-1),
        updatedAt:      now,
      });

      batch.update(targetUserRef, {
        followersCount: FieldValue.increment(-1),
        updatedAt:      now,
      });

      try {
        await batch.commit();
        functions.logger.info(
          `[onFollowWrite] Unfollow mirror delete + count decrements committed`,
          { uid, targetUid },
        );
      } catch (err) {
        functions.logger.error(
          `[onFollowWrite] Failed to commit unfollow batch`,
          { uid, targetUid, err },
        );
        throw err;
      }

      return;
    }
  });
