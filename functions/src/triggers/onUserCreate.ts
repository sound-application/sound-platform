/**
 * Sound Platform — onUserCreate Cloud Function
 * ===============================================
 * Phase:   5-C-3 (Privacy Audience Model Upgrade)
 * Updated: 2026-05-14 (5-C-3: upgraded to multi-select audience model)
 *
 * Trigger: Firebase Auth user.onCreate (Gen 1 API — works with firebase-functions v5)
 *
 * On each new Firebase Auth user creation:
 *   1. Creates users/{uid}          — private internal document (owner/admin/CF only)
 *   2. Creates publicProfiles/{uid} — public-safe projection via shared builder
 *
 * PRIVACY RULES (Phase 4-H-2):
 *   users/{uid}:
 *     - NEVER readable by other users via Firestore client SDK.
 *     - Contains: role, capabilities, restrictions, email, kycStatus, walletId, etc.
 *   publicProfiles/{uid}:
 *     - Built by buildPublicProfileFromUser() — full section-level privacy filtering.
 *     - NO email, role, capabilities, restrictions, wallet, internal flags.
 *
 * Both documents are written atomically in a single Firestore batch.
 *
 * Phase 5-C note:
 *   publicProfiles/{uid} is now also rebuilt on every users/{uid} write by
 *   onUserProfileUpdate. onUserCreate seeds the initial state; subsequent
 *   profile edits flow through onUserProfileUpdate.
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import type { UserRecord } from 'firebase-admin/auth';
import type {
  UserPrivateDoc,
  PrivacySettings,
  SectionPrivacy,
  ConsumerActivity,
} from '@sound/shared';
import { buildPublicProfileFromUser } from '../helpers/buildPublicProfile';

// ─── Firestore reference (Admin SDK initialised + settings applied in index.ts) ────
// ignoreUndefinedProperties is set in index.ts — do NOT re-set here.
const db = admin.firestore();

// ─── Default Privacy Settings ────────────────────────────────────────────────

// ─── Default Privacy Settings (Phase 5-C-3: SectionPrivacy object format) ───────

/** Shorthand constructors for common audience configs. */
const PUB:  SectionPrivacy = { audiences: ['public'] };
const FOL:  SectionPrivacy = { audiences: ['followers'] };
const PRIV: SectionPrivacy = { audiences: ['onlyMe'] };

const DEFAULT_PRIVACY: PrivacySettings = {
  generalProfile:            PUB,
  mood:                      PUB,
  listeningActivity:         PUB,
  followedRadioStations:     PUB,
  followedRadioStationLists: PUB,
  musicPlaylists:            PUB,
  savedItems:                PRIV,
  storyViews:                PRIV,
  activityStatus:            PUB,
  pinnedContent:             PUB,
  achievements:              PUB,
  following:                 PUB,
  followers:                 PUB,
  directMessages:            FOL,
  plusCreatorContent:        PUB,
  musicCreatorContent:       PUB,
  radioCreatorContent:       PUB,
};

// ─── Default Consumer Activity ────────────────────────────────────────────────

const DEFAULT_CONSUMER_ACTIVITY: ConsumerActivity = {
  followedRadioStations:      [],
  followedRadioStationLists:  [],
  listenedMusicLists:         [],
  songPlaylists:              [],
  publicPlaylists:            [],
  privatePlaylists:           [],
  savedItems:                 [],
  totalListeningTimeSecs:     0,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Derives a readable display name from the Auth user record. */
function deriveDisplayName(user: UserRecord): string {
  if (user.displayName && user.displayName.trim().length > 0) {
    return user.displayName.trim();
  }
  if (user.email) {
    // Use email prefix — readable but does not expose full email
    return user.email.split('@')[0] ?? 'Sound User';
  }
  if (user.phoneNumber) {
    return `User_${user.uid.slice(0, 6)}`;
  }
  return `User_${user.uid.slice(0, 6)}`;
}

/** Derives a unique username placeholder from the Auth user record. */
function deriveUsername(user: UserRecord): string {
  const displayName = deriveDisplayName(user);
  const base = displayName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 16);
  // Short UID suffix ensures uniqueness
  const suffix = user.uid.slice(0, 6);
  return `${base || 'user'}_${suffix}`;
}

// ─── onUserCreate trigger ─────────────────────────────────────────────────────

export const onUserCreate = functions.auth.user().onCreate(
  async (user: UserRecord): Promise<void> => {
    const { uid, email, displayName, photoURL } = user;
    const now = new Date().toISOString();

    functions.logger.info(`[onUserCreate] New user: ${uid}`, {
      uid,
      hasEmail: !!email,
      hasDisplayName: !!displayName,
      hasPhotoURL: !!photoURL,
    });

    const resolvedDisplayName = deriveDisplayName(user);
    const resolvedUsername    = deriveUsername(user);
    const resolvedAvatarUrl   = photoURL ?? undefined;

    // ── 1. Private user document (users/{uid}) ────────────────────────────────
    //
    // NEVER expose this document to other users.
    // Contains: role, capabilities, restrictions, email, kycStatus, walletId.
    //
    const privateDoc: UserPrivateDoc = {
      // Identity
      uid,
      username:    resolvedUsername,
      displayName: resolvedDisplayName,
      avatarUrl:   resolvedAvatarUrl,

      // Verification (new users are not verified)
      isVerified:          false,

      // Bio (blank by default — owner fills later)
      bio:         undefined,
      location:    undefined,
      websiteUrl:  undefined,
      mood:        undefined,
      socialLinks: {},

      // Counters (all zero on create)
      followersCount: 0,
      followingCount: 0,
      likesCount:     0,
      postsCount:     0,
      listensCount:   0,

      // Timestamps
      joinedAt:       now,
      latestActivity: now,

      // Status
      activityStatus: 'offline',

      // Creator-owned content (empty)
      posts:        [],
      stories:      [],
      audioContent: [],
      liveSessions: [],
      reposts:      [],
      replies:      [],
      comments:     [],
      pinnedContent: undefined,

      // Consumer activity (empty)
      consumerActivity: DEFAULT_CONSUMER_ACTIVITY,

      // Gamification (empty)
      badges:       [],
      achievements: [],
      points:       0,
      gifts:        [],

      // Subscriptions (empty)
      subscriptions: [],

      // Privacy (default: public for most sections)
      privacy: DEFAULT_PRIVACY,

      // Capabilities (all disabled — granted only by admin/package)
      capabilities: {},

      // System fields (safe defaults — admin SDK can override)
      isMinor:    false,
      isBanned:   false,
      createdAt:  now,

      // Role (listener by default — Cloud Function/admin promotes)
      role:        'listener',
      accountType: 'normal',

      // Wallet / KYC — not set on create (server-only fields)
      walletId:  undefined,
      kycStatus: undefined,
    };

    // ── 2. Public profile projection (publicProfiles/{uid}) ───────────────────
    //
    // Uses the shared buildPublicProfileFromUser helper (Phase 5-C).
    // Full section-level privacy filtering applied automatically.
    // Contains ONLY public-safe fields — NO email, role, capabilities, etc.
    //
    const publicDoc = buildPublicProfileFromUser(privateDoc, now);

    // ── 3. Atomic batch write ─────────────────────────────────────────────────
    const batch = db.batch();

    batch.set(
      db.collection('users').doc(uid),
      privateDoc,
      { merge: false }, // full write — not merge — to ensure clean initial state
    );

    batch.set(
      db.collection('publicProfiles').doc(uid),
      publicDoc,
      { merge: false },
    );

    await batch.commit();

    functions.logger.info(`[onUserCreate] Created users/${uid} and publicProfiles/${uid}`, { uid });
  }
);
