/**
 * Sound Platform — onUserCreate Cloud Function
 * ===============================================
 * Phase:   5-B (User Lifecycle & Public Profile Projection)
 * Updated: 2026-05-14 (5-B-1 fix: ignoreUndefinedProperties hoisted to index.ts)
 *
 * Trigger: Firebase Auth user.onCreate (Gen 1 API — works with firebase-functions v5)
 *
 * On each new Firebase Auth user creation:
 *   1. Creates users/{uid}          — private internal document (owner/admin/CF only)
 *   2. Creates publicProfiles/{uid} — public-safe projection (any authenticated user)
 *
 * PRIVACY RULES (Phase 4-H-2):
 *   users/{uid}:
 *     - NEVER readable by other users via Firestore client SDK.
 *     - Contains: role, capabilities, restrictions, email, kycStatus, walletId, etc.
 *   publicProfiles/{uid}:
 *     - Contains ONLY: uid, generalProfile section, meta timestamps.
 *     - NO email, role, capabilities, restrictions, wallet, internal flags.
 *
 * Both documents are written atomically in a single Firestore batch.
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import type { UserRecord } from 'firebase-admin/auth';
import type {
  UserPrivateDoc,
  PublicProfileDoc,
  GeneralProfileSection,
  PrivacySettings,
  ConsumerActivity,
} from '@sound/shared';

// ─── Firestore reference (Admin SDK initialised + settings applied in index.ts) ────
// ignoreUndefinedProperties is set in index.ts — do NOT re-set here.
const db = admin.firestore();

// ─── Default Privacy Settings ────────────────────────────────────────────────

const DEFAULT_PRIVACY: PrivacySettings = {
  generalProfile:            'public',
  mood:                      'public',
  listeningActivity:         'public',
  followedRadioStations:     'public',
  followedRadioStationLists: 'public',
  musicPlaylists:            'public',
  savedItems:                'private',
  storyViews:                'private',
  activityStatus:            'public',
  pinnedContent:             'public',
  achievements:              'public',
  following:                 'public',
  followers:                 'public',
  directMessages:            'followers',
  plusCreatorContent:        'public',
  musicCreatorContent:       'public',
  radioCreatorContent:       'public',
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
    // Contains ONLY public-safe fields.
    // NO email, role, capabilities, restrictions, wallet, internal flags.
    //
    const generalSection: GeneralProfileSection = {
      username:     resolvedUsername,
      displayName:  resolvedDisplayName,
      avatarUrl:    resolvedAvatarUrl,
      isVerified:   false,
      socialLinks:  {},
      followersCount: 0,
      followingCount: 0,
      postsCount:     0,
      listensCount:   0,
      joinedAt:       now,
      badges:         [],
      // Capability flags (all false for new users)
      isPlusCreator:  false,
      isMusicCreator: false,
      isRadioCreator: false,
    };

    const publicDoc: PublicProfileDoc = {
      uid,
      generalProfile: generalSection,
      // Optional sections start absent (privacy 'public' means they'll be added
      // by future profile update trigger as data accumulates).
      lastUpdatedAt: now,
    };

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
