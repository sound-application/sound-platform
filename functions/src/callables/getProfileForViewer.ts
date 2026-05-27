/**
 * Sound Platform — getProfileForViewer Callable Cloud Function
 * =============================================================
 * Phase:   7.1 (Username-Aware Profile Links)
 * Updated: 2026-05-27
 *
 * WHAT THIS FUNCTION DOES:
 *   Returns a viewer-filtered profile for the authenticated caller.
 *   Unlike publicProfiles/{uid} (a static document with no viewer context),
 *   this callable knows who the caller is and applies the correct audience
 *   gates for 'followers', 'friends', 'onlyMe', and block enforcement.
 *
 * CALLER CONTRACT (Phase 7.1):
 *   Input:  { targetKey: string } OR { targetUid: string } (legacy)
 *   Output: GetProfileForViewerResponse
 *   Auth:   required — throws unauthenticated if not signed in
 *
 *   targetKey may be:
 *     - A Firebase UID (resolved via publicProfiles/{key} existence check).
 *     - A username/handle (resolved via usernames/{normalizedKey} lookup).
 *     - A username with leading '@' (stripped by normalizeUsername).
 *
 * RESOLUTION ORDER (Phase 7.1):
 *   1. normalizeUsername(targetKey) — strip @, lowercase, etc.
 *   2. publicProfiles/{rawKey} exists? → treat rawKey as UID.
 *   3. usernames/{normalizedKey} exists? → extract uid.
 *   4. Neither → throw not-found.
 *
 * DATA READS (all Admin SDK — bypasses Firestore client rules):
 *   1. publicProfiles/{targetUid}          — base projection (safe public fields)
 *   2. usernames/{normalizedKey}           — username → UID resolution (Phase 7.1)
 *   3. privacySettings/{targetUid}         — raw per-section privacy config
 *   4. follows/{viewerUid}/following/{targetUid}  — does viewer follow target?
 *   5. follows/{targetUid}/following/{viewerUid}  — does target follow viewer?
 *   6. blocks/{targetUid}/blocked/{viewerUid}     — has target blocked viewer?
 *   7. blocks/{viewerUid}/blocked/{targetUid}     — has viewer blocked target?
 *
 * AUDIENCE ENFORCEMENT:
 *   'public'    → always visible
 *   'onlyMe'    → visible only if viewer === target (isSelf)
 *   'followers' → visible if viewer follows target (isFollower)
 *   'friends'   → visible if mutual follow (isMutual)
 *   'following' → visible if viewer follows target (same as followers for now;
 *                  'following' means "shown to people I follow", which maps to
 *                  the viewer needing to follow the target — same as 'followers')
 *   'custom'    → NOT enforced in Phase 7 (no audienceLists collection yet).
 *                  Falls back to: if isFollower → show, else hide.
 *                  // PHASE 9: enforce when audienceLists collection exists.
 *   unknown     → hide (safest fallback)
 *
 * BLOCK ENFORCEMENT:
 *   targetBlockedViewer → return minimal blocked stub. All sections stripped.
 *   viewerBlockedTarget → return limited public view of target (viewer blocked them,
 *                         but target's public sections remain accessible).
 *                         Client renders a "You have blocked this user" banner.
 *
 * SELF-VIEW:
 *   If viewerUid === resolvedTargetUid, return all sections from publicProfiles as-is.
 *   The owner sees everything in their public projection.
 *   (Raw users/{uid} private fields are NOT exposed — publicProfiles is used.)
 *
 * INFINITE LOOP PREVENTION:
 *   This is a callable (HTTPS trigger). It does NOT watch any Firestore path.
 *   It READS from Firestore but makes NO WRITES. No loops possible.
 *
 * ADMIN SDK:
 *   All Firestore reads use Admin SDK — bypasses client rules.
 *   privacySettings/{uid} is only readable via Admin SDK or owner.
 *   This function reads it as admin — correct for a server-side resolver.
 *
 * REACT NATIVE:
 *   This callable is invoked via firebase/functions httpsCallable.
 *   Compatible with @react-native-firebase/functions.
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import type {
  PublicProfileDoc,
  PrivacySettingsDoc,
  GetProfileForViewerRequest,
  GetProfileForViewerResponse,
  ViewerState,
  UsernameDoc,
} from '@sound/shared';
import { makeBlockedProfileStub, normalizeUsername } from '@sound/shared';

// ── Admin Firestore ────────────────────────────────────────────────────────────
const db = admin.firestore();

// ─── Audience Gate (viewer-aware) ─────────────────────────────────────────────

/**
 * The mapping from PrivacySettingsDoc string values to structured audience tokens.
 *
 * PrivacySettingsDoc stores raw string values (e.g. 'public', 'followers', 'only-me').
 * This function maps those string tokens to the canonical PrivacyAudience values
 * used in SectionPrivacy (from profile.ts).
 *
 * NOTE: 'only-me' (hyphenated) is used in PrivacySettingsDoc (AccountControlHub).
 *       'onlyMe' (camelCase) is used in SectionPrivacy (profile.ts).
 *       Both must be treated as the same audience — fully private.
 */
function normalizeAudience(raw: string | undefined): string {
  if (!raw) return 'unknown';
  const normalized = raw.toLowerCase().trim();
  // Normalize 'only-me' → 'onlyme' for comparison
  if (normalized === 'only-me' || normalized === 'onlyme') return 'onlyMe';
  if (normalized === 'public') return 'public';
  if (normalized === 'followers') return 'followers';
  if (normalized === 'friends') return 'friends';
  if (normalized === 'following') return 'following';
  if (normalized === 'custom') return 'custom';
  return 'unknown';
}

/**
 * isSectionVisibleForViewer — Phase 7 viewer-aware audience gate.
 *
 * Returns true if the viewer is entitled to see the section.
 *
 * @param audience  - Normalized audience token from privacySettings
 * @param isSelf    - Viewer is the profile owner
 * @param isFollower - Viewer follows the target
 * @param isMutual  - Both follow each other
 */
function isSectionVisibleForViewer(
  audience: string,
  isSelf:     boolean,
  isFollower: boolean,
  isMutual:   boolean,
): boolean {
  switch (audience) {
    case 'public':
      return true;
    case 'onlyMe':
      return isSelf;
    case 'followers':
      // Viewer must follow the target
      return isSelf || isFollower;
    case 'friends':
      // Mutual follow (A follows B AND B follows A)
      return isSelf || isMutual;
    case 'following':
      // 'following' means "show to people I follow" — same graph check as followers
      // (from the target's perspective, the viewer needs to be someone the target follows,
      //  i.e. the viewer follows the target → maps to isFollower from the viewer's POV)
      // Simplified: treat as followers gate for Phase 7.
      return isSelf || isFollower;
    case 'custom':
      // Phase 9: enforce audienceLists collection.
      // For now: treat as followers gate (more restrictive than 'public', less than 'onlyMe').
      // PHASE 9: check audienceLists/{targetUid}/lists/{listId}/members/{viewerUid}.
      return isSelf || isFollower;
    default:
      // Unknown audience value — safest behavior is hide
      return false;
  }
}

// ─── Section-to-privacySettings Key Map ───────────────────────────────────────

/**
 * Maps a PublicProfileDoc section key to the corresponding PrivacySettingsDoc key.
 *
 * The PrivacySettingsDoc stores per-row values for the AccountControlHub Privacy Center.
 * The resolver uses these values to determine section visibility for the viewer.
 *
 * Sections with no mapping use the 'public' fallback (always visible).
 *
 * NOTE: 'generalProfile' maps to 'profile-visibility'.
 *       'listeningActivity' maps to 'listening-now'.
 *       'activityStatus' is included in general — not independently gated here.
 *       Sections without a clear mapping default to showing (permissive).
 */
const SECTION_TO_PRIVACY_KEY: Partial<Record<keyof PublicProfileDoc, keyof PrivacySettingsDoc>> = {
  generalProfile:              'profile-visibility',
  mood:                        'mood-visibility',
  listeningActivity:           'listening-now',
  followedRadioStations:       'subscriptions-visibility',
  followedRadioStationLists:   'subscriptions-visibility',
  musicPlaylists:              'saved-lists',
  activityStatus:              'profile-visibility', // activityStatus follows profile gate
  pinnedContent:               'profile-visibility', // pinned content follows profile gate
  achievements:                'badges',
  plusCreatorContent:          'profile-visibility',
  musicCreatorContent:         'profile-visibility',
  radioCreatorContent:         'profile-visibility',
  tournamentsOrganizerContent: 'profile-visibility',
  joinedTournaments:           'profile-visibility',
  tournamentSubmissions:       'profile-visibility',
  votingActivity:              'profile-visibility',
  awardsAndMedals:             'badges',
};

// ─── Profile Section Filter ────────────────────────────────────────────────────

/**
 * filterProfileForViewer — applies section-level audience gates.
 *
 * Reads each optional section from the base publicProfiles document.
 * For each section, determines the audience from privacySettings.
 * If the viewer is not entitled, the section is removed (undefined).
 *
 * @param base         - The base publicProfiles/{uid} document
 * @param privacy      - The raw privacySettings/{uid} document
 * @param isSelf       - Viewer is the profile owner
 * @param isFollower   - Viewer follows the target
 * @param isMutual     - Both follow each other
 * @returns Filtered profile + list of hidden section keys
 */
function filterProfileForViewer(
  base:       PublicProfileDoc,
  privacy:    PrivacySettingsDoc,
  isSelf:     boolean,
  isFollower: boolean,
  isMutual:   boolean,
): { filtered: PublicProfileDoc; hiddenSections: string[] } {
  const hidden: string[] = [];

  // Helper: check one optional section
  function gateSection<K extends keyof PublicProfileDoc>(
    key: K,
  ): PublicProfileDoc[K] | undefined {
    const value = base[key];
    if (value === undefined) return undefined; // not in base projection — skip

    const privacyKey = SECTION_TO_PRIVACY_KEY[key];
    const rawAudience = privacyKey ? (privacy[privacyKey] as string | undefined) : 'public';
    const audience = normalizeAudience(rawAudience);

    const visible = isSectionVisibleForViewer(audience, isSelf, isFollower, isMutual);
    if (!visible) {
      hidden.push(key);
      return undefined;
    }
    return value;
  }

  // generalProfile always present if the profile is not blocked/missing
  // Apply profile-visibility gate to it
  const profileAudience = normalizeAudience(privacy['profile-visibility']);
  const profileVisible = isSectionVisibleForViewer(profileAudience, isSelf, isFollower, isMutual);

  if (!profileVisible) {
    // Entire profile is private to this viewer
    hidden.push('generalProfile');
    return {
      filtered: {
        uid:            base.uid,
        generalProfile: {
          ...base.generalProfile,
          // Strip sensitive fields from the minimal stub
          bio:         undefined,
          location:    undefined,
          websiteUrl:  undefined,
          socialLinks: {},
          // Keep identity visible (displayName, username for private profile state)
        },
        lastUpdatedAt: base.lastUpdatedAt,
      },
      hiddenSections: hidden,
    };
  }

  const filtered: PublicProfileDoc = {
    uid:            base.uid,
    generalProfile: base.generalProfile,
    lastUpdatedAt:  base.lastUpdatedAt,

    // Optional sections — each independently gated
    mood:                        gateSection('mood'),
    activityStatus:              gateSection('activityStatus'),
    listeningActivity:           gateSection('listeningActivity'),
    followedRadioStations:       gateSection('followedRadioStations'),
    followedRadioStationLists:   gateSection('followedRadioStationLists'),
    musicPlaylists:              gateSection('musicPlaylists'),
    pinnedContent:               gateSection('pinnedContent'),
    achievements:                gateSection('achievements'),
    plusCreatorContent:          gateSection('plusCreatorContent'),
    musicCreatorContent:         gateSection('musicCreatorContent'),
    radioCreatorContent:         gateSection('radioCreatorContent'),
    tournamentsOrganizerContent: gateSection('tournamentsOrganizerContent'),
    joinedTournaments:           gateSection('joinedTournaments'),
    tournamentSubmissions:       gateSection('tournamentSubmissions'),
    votingActivity:              gateSection('votingActivity'),
    awardsAndMedals:             gateSection('awardsAndMedals'),
  };

  return { filtered, hiddenSections: hidden };
}

// ─── Callable ─────────────────────────────────────────────────────────────────

export const getProfileForViewer = functions.https.onCall(
  async (data: GetProfileForViewerRequest, context): Promise<GetProfileForViewerResponse> => {

    // ── Auth guard ─────────────────────────────────────────────────────────────────
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'Authentication required to view profiles.',
      );
    }

    const viewerUid = context.auth.uid;

    // ── Input validation (Phase 7.1: targetKey or legacy targetUid) ──────────
    const rawKey = ((data?.targetKey ?? data?.targetUid) ?? '').toString().trim();
    if (!rawKey) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'targetKey (or targetUid) is required and must be a non-empty string.',
      );
    }

    functions.logger.info(
      `[getProfileForViewer] viewerUid=${viewerUid} rawKey=${rawKey}`,
      { viewerUid, rawKey },
    );

    // ── Resolve targetKey → canonical Firebase UID (Phase 7.1) ───────────────
    //
    // Resolution order:
    //   1. Check if publicProfiles/{rawKey} exists → rawKey is a UID.
    //   2. Normalize rawKey and lookup usernames/{normalizedKey} → get uid.
    //   3. Neither → not-found.
    //
    // This approach is UID-first: existing UID links work with a single read.
    // Username links cost one extra read (the usernames lookup).

    let targetUid: string;
    let publicProfileSnap: FirebaseFirestore.DocumentSnapshot;

    // Step 1: Try rawKey as a UID
    const uidCheckSnap = await db.collection('publicProfiles').doc(rawKey).get();

    if (uidCheckSnap.exists) {
      // rawKey is a valid UID — use it directly
      targetUid = rawKey;
      publicProfileSnap = uidCheckSnap;
      functions.logger.info(
        `[getProfileForViewer] Resolved rawKey as UID: ${targetUid}`,
        { rawKey, targetUid },
      );
    } else {
      // Step 2: Try rawKey as a username
      const normalized = normalizeUsername(rawKey);
      if (!normalized) {
        throw new functions.https.HttpsError(
          'not-found',
          'Profile not found.',
        );
      }

      const usernameSnap = await db.collection('usernames').doc(normalized).get();
      if (!usernameSnap.exists) {
        throw new functions.https.HttpsError(
          'not-found',
          'Profile not found.',
        );
      }

      const usernameDoc = usernameSnap.data() as UsernameDoc;
      targetUid = usernameDoc.uid;

      functions.logger.info(
        `[getProfileForViewer] Resolved username "${normalized}" → UID: ${targetUid}`,
        { rawKey, normalized, targetUid },
      );

      // Load the actual profile for the resolved UID
      publicProfileSnap = await db.collection('publicProfiles').doc(targetUid).get();
      if (!publicProfileSnap.exists) {
        // Username index points to a UID with no public profile — stale data
        functions.logger.warn(
          `[getProfileForViewer] Username "${normalized}" maps to UID ${targetUid} but publicProfiles/${targetUid} missing`,
          { normalized, targetUid },
        );
        throw new functions.https.HttpsError(
          'not-found',
          'Profile not found or has been removed.',
        );
      }
    }

    // ── Self-view fast path ─────────────────────────────────────────────────────
    // Owner sees all sections from their own public projection.
    // No need to load privacySettings or social graph checks.
    if (viewerUid === targetUid) {
      const profile = publicProfileSnap.data() as PublicProfileDoc;
      return {
        profile,
        viewerState: {
          isSelf:              true,
          isFollower:          false,
          isMutual:            false,
          targetBlockedViewer: false,
          viewerBlockedTarget: false,
        },
        isBlocked: false,
        resolvedTargetUid: targetUid,
        hiddenSections: [],
      };
    }

    // ── Parallel reads: block checks (both directions) ────────────────────
    // These must be checked BEFORE loading the full profile.
    // If the target has blocked the viewer, we return a minimal stub immediately.
    const [
      targetBlockedViewerSnap,
      viewerBlockedTargetSnap,
    ] = await Promise.all([
      db.collection('blocks').doc(targetUid).collection('blocked').doc(viewerUid).get(),
      db.collection('blocks').doc(viewerUid).collection('blocked').doc(targetUid).get(),
    ]);

    const targetBlockedViewer = targetBlockedViewerSnap.exists;
    const viewerBlockedTarget = viewerBlockedTargetSnap.exists;

    // ── Block enforcement — target blocked viewer ─────────────────────────
    if (targetBlockedViewer) {
      functions.logger.info(
        `[getProfileForViewer] Target ${targetUid} has blocked viewer ${viewerUid} — returning stub`,
        { viewerUid, targetUid },
      );
      return {
        profile: makeBlockedProfileStub(targetUid),
        viewerState: {
          isSelf:              false,
          isFollower:          false,
          isMutual:            false,
          targetBlockedViewer: true,
          viewerBlockedTarget,
        },
        isBlocked: true,
        resolvedTargetUid: targetUid,
        hiddenSections: [],
      };
    }

    // ── Load privacy + follow graph ─────────────────────────────────────────
    // publicProfileSnap is already loaded from the resolution step above.
    const [
      privacySettingsSnap,
      viewerFollowsTargetSnap,
    ] = await Promise.all([
      db.collection('privacySettings').doc(targetUid).get(),
      db.collection('follows').doc(viewerUid).collection('following').doc(targetUid).get(),
    ]);

    const baseProfile = publicProfileSnap.data() as PublicProfileDoc;
    const isFollower  = viewerFollowsTargetSnap.exists;

    // ── Mutual-follow check (only if viewer follows target) ───────────────
    let isMutual = false;
    if (isFollower) {
      const targetFollowsViewerSnap = await db
        .collection('follows')
        .doc(targetUid)
        .collection('following')
        .doc(viewerUid)
        .get();
      isMutual = targetFollowsViewerSnap.exists;
    }

    // ── Privacy-settings gate ─────────────────────────────────────────────
    // If privacySettings document is missing, use permissive defaults.
    // This can happen if the CF hasn't written it yet (new user race condition).
    let privacy: PrivacySettingsDoc | null = privacySettingsSnap.exists
      ? (privacySettingsSnap.data() as PrivacySettingsDoc)
      : null;

    if (!privacy) {
      functions.logger.warn(
        `[getProfileForViewer] No privacySettings for ${targetUid} — using permissive defaults`,
        { targetUid },
      );
    }

    // ── Apply section filters ─────────────────────────────────────────────
    let filtered: PublicProfileDoc;
    let hiddenSections: string[];

    if (!privacy) {
      // No privacy settings — return base projection as-is (permissive fallback)
      filtered = baseProfile;
      hiddenSections = [];
    } else {
      const result = filterProfileForViewer(
        baseProfile,
        privacy,
        false, // not self
        isFollower,
        isMutual,
      );
      filtered = result.filtered;
      hiddenSections = result.hiddenSections;
    }

    // ── Build viewerState ─────────────────────────────────────────────────────
    const viewerState: ViewerState = {
      isSelf:              false,
      isFollower,
      isMutual,
      targetBlockedViewer: false,  // already handled above — if we reach here, not blocked
      viewerBlockedTarget,
    };

    functions.logger.info(
      `[getProfileForViewer] Resolved profile for viewer=${viewerUid} target=${targetUid}`,
      {
        viewerUid,
        targetUid,
        isFollower,
        isMutual,
        viewerBlockedTarget,
        hiddenCount: hiddenSections.length,
      },
    );

    return {
      profile: filtered,
      viewerState,
      isBlocked: false,
      resolvedTargetUid: targetUid,
      hiddenSections,
    };
  },
);
