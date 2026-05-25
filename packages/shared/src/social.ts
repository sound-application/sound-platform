/**
 * Sound Platform — Social Graph Types
 * ======================================
 * Phase:   6-B (Social Graph Foundation: Follow / Block / Mute)
 * Updated: 2026-05-25
 *
 * COLLECTION STRUCTURE:
 *   follows/{uid}/following/{targetUid}  — user → who they follow
 *   follows/{uid}/followers/{sourceUid}  — user → who follows them (CF mirror)
 *   blocks/{uid}/blocked/{targetUid}     — user → who they blocked
 *   mutes/{uid}/muted/{targetUid}        — user → who they muted
 *
 * WRITE RULES:
 *   following/{targetUid}  → owner writes; Firestore rules enforce self-follow block
 *   followers/{sourceUid}  → Cloud Function (Admin SDK) only; Firestore rules deny client writes
 *   blocked/{targetUid}    → owner writes
 *   muted/{targetUid}      → owner writes
 *
 * FUTURE ENFORCEMENT (Phase 7+):
 *   - followers graph enables 'followers' audience enforcement in buildPublicProfile.
 *   - blocked users must be filtered from public profile reads via a viewer-aware
 *     resolver (Cloud Function callable — not via publicProfiles static doc).
 *   - muted users are filtered from feed queries (not from profile reads).
 *
 * REACT NATIVE NOTE:
 *   These types are portable — no web-only dependencies.
 *   Cloud Functions and Rules are backend-only; client code uses these types.
 */

// ─── Follow Edge ─────────────────────────────────────────────────────────────

/**
 * FollowEdge — document at follows/{sourceUid}/following/{targetUid}
 *
 * Created by the follower (sourceUid) when they follow someone.
 * Firestore rules: owner (sourceUid) can create/delete.
 * The Cloud Function onFollowWrite mirrors it into
 * follows/{targetUid}/followers/{sourceUid}.
 */
export interface FollowEdge {
  /** UID of the user who is following (= the subcollection owner uid) */
  sourceUid: string;
  /** UID of the user being followed (= the document id) */
  targetUid: string;
  /**
   * ISO timestamp when the follow was created.
   * Set on the client and verified by the Cloud Function.
   */
  createdAt: string;
}

// ─── Follower Mirror Edge ────────────────────────────────────────────────────

/**
 * FollowerEdge — document at follows/{targetUid}/followers/{sourceUid}
 *
 * Mirror written by the Cloud Function onFollowWrite.
 * CLIENTS CANNOT WRITE THIS. Firestore rules deny all client writes.
 *
 * Why a separate document?
 *   Enables efficient "who follows me" queries without requiring
 *   a full scan of all users' following lists.
 *   Also allows follower count to be tracked per-user cleanly.
 */
export interface FollowerEdge {
  /** UID of the user who is following (= the document id) */
  sourceUid: string;
  /** UID of the user being followed (= the subcollection owner uid) */
  targetUid: string;
  /**
   * ISO timestamp when the follower mirror was created by the Cloud Function.
   * May differ slightly from FollowEdge.createdAt due to CF latency.
   */
  createdAt: string;
}

// ─── Block Edge ──────────────────────────────────────────────────────────────

/**
 * BlockEdge — document at blocks/{sourceUid}/blocked/{targetUid}
 *
 * Created by the blocker (sourceUid) when they block someone.
 * Owner (sourceUid) can read and write.
 * No other user can read this — block lists are private.
 *
 * FUTURE ENFORCEMENT (Phase 7+):
 *   - Blocked users should not be able to see the blocker's content/profile.
 *   - This requires a viewer-aware resolver (Cloud Function callable) that
 *     checks blocks/{viewerUid}/blocked collection before returning profile data.
 *   - Cannot be enforced via static publicProfiles documents.
 *   - Feed filtering: contentItems queries must exclude blocked users' content.
 *     This is a server-side aggregation or query filter — not a client filter.
 *
 * WHAT WE DO NOT ENFORCE YET (Phase 6-B):
 *   - Block does not yet prevent viewing a profile via publicProfiles/{uid}.
 *     The static publicProfiles document is readable by all authenticated users.
 *   - Block does not yet prevent content from appearing in feeds.
 *   - Block DOES prevent the blocked user from appearing in your follows list
 *     (as a future query filter — not yet implemented).
 */
export interface BlockEdge {
  /** UID of the user who is blocking (= the subcollection owner uid) */
  sourceUid: string;
  /** UID of the user being blocked (= the document id) */
  targetUid: string;
  /** ISO timestamp when the block was created */
  createdAt: string;
  /**
   * Optional reason for the block.
   * Populated if the block was triggered by a report.
   * null if the user blocked manually without a reason.
   */
  reason?: string | null;
}

// ─── Mute Edge ───────────────────────────────────────────────────────────────

/**
 * MuteEdge — document at mutes/{sourceUid}/muted/{targetUid}
 *
 * Created by the muter (sourceUid) when they mute someone.
 * Owner (sourceUid) can read and write.
 * No other user can read this — mute lists are private.
 *
 * MUTE vs BLOCK:
 *   Mute: owner cannot see the muted user's content in feeds/messages.
 *         The muted user CAN still see the owner's content and profile.
 *   Block: mutual — neither can see the other's content (via enforcement).
 *
 * FUTURE ENFORCEMENT (Phase 7+):
 *   - Muted users' content must be excluded from feed queries.
 *     Done via server-side query filter — not client-side filtering.
 *   - Muted users' messages must be auto-hidden in conversations.
 *   - Muted users can still follow the muter (mute is not mutual).
 *
 * WHAT WE DO NOT ENFORCE YET (Phase 6-B):
 *   - Mute does not yet filter feed queries (no contentItems collection yet).
 *   - Mute does not yet hide messages (no messages collection yet).
 *   - Mute data IS stored and rules ARE enforced.
 */
export interface MuteEdge {
  /** UID of the user who is muting (= the subcollection owner uid) */
  sourceUid: string;
  /** UID of the user being muted (= the document id) */
  targetUid: string;
  /** ISO timestamp when the mute was created */
  createdAt: string;
  /**
   * Scope of the mute — what content is muted.
   * 'all' (default) = all content and messages from this user.
   * 'content' = only feed content, not messages.
   * 'messages' = only messages, not content.
   *
   * Future: 'stories' = only stories muted.
   * Phase 6-B: only 'all' is used. 'content' and 'messages' reserved.
   */
  muteScope: 'all' | 'content' | 'messages';
}

// ─── Social Count Update ──────────────────────────────────────────────────────

/**
 * SocialCountUpdate — the shape of the increment written to users/{uid}
 * by the onFollowWrite Cloud Function.
 *
 * Uses Firestore FieldValue.increment() under the hood in the CF.
 * Typed here for documentation clarity.
 */
export interface SocialCountUpdate {
  /** followingCount delta: +1 on follow, -1 on unfollow */
  followingCount: number;
  /** followersCount delta (written to the target's users/{uid}) */
  followersCount: number;
}
