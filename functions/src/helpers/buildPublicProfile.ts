/**
 * Sound Platform — Public Profile Projection Builder
 * ====================================================
 * Phase:   6-B (Social Graph Foundation)
 * Updated: 2026-05-25
 *   - Updated audience enforcement comments to reflect social graph existence.
 *   - follows/{uid}/following/{targetUid} collection NOW EXISTS (Phase 6-B).
 *   - 'followers' audience enforcement is NOW POSSIBLE in a viewer-aware callable.
 *   - Static publicProfiles document remains permissive (no viewer context).
 *   - See Phase 7 roadmap in onFollowWrite.ts.
 *
 * Previous Phase: 6-A (Privacy schema foundation — 2026-05-25)
 *
 * Shared helper used by:
 *   - onUserCreate      (builds initial projection on signup)
 *   - onUserProfileUpdate (rebuilds projection on users/{uid} write)
 *
 * PRIVACY MODEL (Phase 5-C-3):
 *
 *   publicProfiles/{uid} is built section-by-section from users/{uid}.
 *   Each section is included ONLY if its audiences array includes 'public'.
 *   All other audience combos (onlyMe, followers, friends, following, custom)
 *   are ABSENT from the projection (no partial/gated reads yet — Phase 5-D+).
 *
 *   Legacy string values ('public' / 'followers' / 'private') written before
 *   Phase 5-C-3 are normalized via migratePrivacyLevel() before gating.
 *
 *   Fields NEVER included in publicProfiles regardless of privacy:
 *     - email, role, capabilities, restrictions
 *     - walletId, kycStatus, isMinor, guardianUid
 *     - isBanned, bannedAt, suspendedAt, deletedAt
 *     - privacy settings object (internal)
 *     - savedItems (always private)
 *     - storyViews (always private)
 *     - privatePlaylists (always private)
 *     - raw consumerActivity (only safe sub-fields are projected)
 *
 *  Infinite loop prevention:
 *    - onUserProfileUpdate watches users/{uid}
 *    - it WRITES to publicProfiles/{uid}
 *    - publicProfiles/{uid} is a DIFFERENT collection — no loop.
 *    - onUserProfileUpdate does NOT watch publicProfiles/{uid}.
 */

import type {
  UserPrivateDoc,
  PublicProfileDoc,
  GeneralProfileSection,
  MoodSection,
  ActivityStatusSection,
  ListeningActivitySection,
  FollowedRadioStationsSection,
  FollowedRadioStationListsSection,
  MusicPlaylistsSection,
  PinnedContentSection,
  AchievementsSection,
  PlusCreatorContentSection,
  MusicCreatorContentSection,
  RadioCreatorContentSection,
  TournamentsOrganizerContentSection,
  JoinedTournamentsSection,
  TournamentSubmissionsSection,
  VotingActivitySection,
  AwardsAndMedalsSection,
  PrivacySettings,
  SectionPrivacy,
} from '@sound/shared';
import { migratePrivacyLevel, isPubliclyVisible } from '@sound/shared';

// ─── Privacy Gate ─────────────────────────────────────────────────────────────

/**
 * AUDIENCE ENFORCEMENT (Phase 6-B):
 *
 *   'public'   → ENFORCED. Section IS included in publicProfiles.
 *   'onlyMe'   → ENFORCED. Section is NEVER included in publicProfiles.
 *
 *   'followers' → SOCIAL GRAPH NOW EXISTS (Phase 6-B). Data is available at
 *                  follows/{uid}/following/{targetUid}.
 *                  HOWEVER: publicProfiles/{uid} is a STATIC document — it has
 *                  no viewer context. Enforcing 'followers' requires knowing
 *                  whether the viewer follows the profile owner, which cannot
 *                  be done in a document write triggered by profile changes.
 *
 *                  PHASE 7 PLAN:
 *                    Implement a Cloud Function callable getProfileForViewer(targetUid)
 *                    that:
 *                      1. Reads publicProfiles/{targetUid}
 *                      2. Checks follows/{viewerUid}/following/{targetUid} exists
 *                      3. Returns sections gated on 'followers' ONLY if viewer follows
 *                    Until then: permissive fallback (show section to all authenticated).
 *
 *   'friends'   → Requires mutual-follow check (A follows B AND B follows A).
 *                  Social graph exists but mutual-follow flag is not yet computed.
 *                  PHASE 7: compute mutual-follow flag in onFollowWrite CF.
 *                  Permissive fallback until then.
 *
 *   'following' → Requires outgoing-follow graph. Same graph as above but reversed.
 *                  PHASE 7: same resolver as 'followers'.
 *                  Permissive fallback until then.
 *
 *   'custom'    → Requires audienceLists collection (not yet created).
 *                  // PHASE 9: enforce when audienceLists collection exists.
 *                  Permissive fallback until then.
 *
 * WHY PERMISSIVE FALLBACK FOR STATIC DOCUMENTS?
 *   publicProfiles/{uid} is written once per profile change, with no viewer context.
 *   Making unenforceable audience tokens behave as 'onlyMe' would permanently hide
 *   content from users who set 'followers' audience but have no followers yet.
 *   The correct enforcement is via a viewer-aware callable (Phase 7), not a static doc.
 *
 * NEVER invent fake social graph data to simulate enforcement.
 */

/**
 * isSectionVisibleToPublic — audience-aware gate for Phase 6-A.
 *
 * Returns true if the section should appear in publicProfiles/{uid}.
 * Handles 'onlyMe' as a hard block, 'public' as a hard allow,
 * and deferred audience tokens as permissive (see enforcement comments above).
 *
 * Replaces the simple `isSectionPublic()` binary check for new call sites.
 * The old `isSectionPublic()` is still exported for backward compatibility.
 */
export function isSectionVisibleToPublic(
  privacy: PrivacySettings,
  section: keyof PrivacySettings,
): boolean {
  const raw = privacy[section] as SectionPrivacy | string | undefined;
  const sp = migratePrivacyLevel(raw as Parameters<typeof migratePrivacyLevel>[0]);

  // Hard block — onlyMe is always enforced
  if (sp.audiences.includes('onlyMe')) return false;

  // Hard allow — public is always enforced
  if (sp.audiences.includes('public')) return true;

  // Deferred audience tokens (followers, friends, following, custom):
  // Social graph enforcement is not yet implemented (Phase 6-A).
  // Permissive fallback — show section until enforcement is ready.
  // PHASE 7: replace this return with graph-based check for 'followers'/'friends'.
  // PHASE 9: replace this return with list-based check for 'custom'.
  return true; // permissive fallback — PHASE 7/9 will restrict this
}

/**
 * Returns true if the section's SectionPrivacy config permits public
 * projection inclusion (audiences includes 'public').
 *
 * Phase 5-C-3: migrates legacy string values on the fly so documents
 * written before the audience-model upgrade continue to work correctly.
 *
 * @deprecated Prefer isSectionVisibleToPublic() for new call sites.
 *   This function only checks for exact 'public' membership — it does not
 *   apply the deferred-audience permissive fallback. Kept for compatibility.
 */
export function isSectionPublic(
  privacy: PrivacySettings,
  section: keyof PrivacySettings,
): boolean {
  const raw = privacy[section] as SectionPrivacy | string | undefined;
  const sp = migratePrivacyLevel(raw as Parameters<typeof migratePrivacyLevel>[0]);
  return isPubliclyVisible(sp);
}


// ─── Main Builder ─────────────────────────────────────────────────────────────

/**
 * buildPublicProfileFromUser — constructs the publicProfiles/{uid} document
 * from a UserPrivateDoc, applying section-level privacy filtering.
 *
 * @param user        - The full users/{uid} private document.
 * @param now         - ISO timestamp (caller provides to keep logs consistent).
 * @returns PublicProfileDoc ready to write to publicProfiles/{uid}.
 *
 * IMPORTANT:
 *   - Never include email, role, capabilities, wallet, kycStatus, restrictions.
 *   - Never include privacy settings object itself.
 *   - Never include savedItems or storyViews.
 *   - Only include optional sections if isSectionVisibleToPublic() returns true.
 *     Phase 6-A: 'public'=include, 'onlyMe'=exclude, others=include (permissive).
 */
export function buildPublicProfileFromUser(
  user: UserPrivateDoc,
  now: string,
): PublicProfileDoc {
  const { privacy, capabilities } = user;

  // ── 1. General section — always included (the profile is visible) ───────────
  // Contains: identity, counters, creator flags. No private fields.
  const generalSection: GeneralProfileSection = {
    username:     user.username,
    displayName:  user.displayName,
    avatarUrl:    user.avatarUrl,
    coverUrl:     user.coverUrl,
    isVerified:   user.isVerified,
    verificationBadgeType: user.verificationBadgeType,
    bio:          user.bio,
    location:     user.location,
    websiteUrl:   user.websiteUrl,
    socialLinks:  user.socialLinks ?? {},
    followersCount: user.followersCount,
    followingCount: user.followingCount,
    postsCount:     user.postsCount,
    listensCount:   user.listensCount,
    joinedAt:       user.joinedAt,
    badges:         user.badges ?? [],
    // Capability flags — derived from capabilities map, never raw map exposed
    isPlusCreator:       user.capabilities?.plus_creator         === true,
    isMusicCreator:      user.capabilities?.music_creator        === true,
    isRadioCreator:      user.capabilities?.radio_creator        === true,
    isTournamentsCreator: user.capabilities?.tournament_organizer === true,
  };

  // Start building the public doc — general is always present
  const publicDoc: PublicProfileDoc = {
    uid:            user.uid,
    generalProfile: generalSection,
    lastUpdatedAt:  now,
  };

  // ── 2. Mood section ──────────────────────────────────────────────────────────
  if (isSectionVisibleToPublic(privacy, 'mood') && user.mood) {
    const moodSection: MoodSection = { mood: user.mood };
    publicDoc.mood = moodSection;
  }

  // ── 3. Activity status section ───────────────────────────────────────────────
  if (isSectionVisibleToPublic(privacy, 'activityStatus')) {
    const activitySection: ActivityStatusSection = {
      activityStatus: user.activityStatus,
    };
    publicDoc.activityStatus = activitySection;
  }

  // ── 4. Listening activity section ────────────────────────────────────────────
  // Subset of consumerActivity — only safe, non-private listening refs.
  // savedItems and storyViews are NEVER included regardless of privacy.
  if (isSectionVisibleToPublic(privacy, 'listeningActivity')) {
    const ca = user.consumerActivity;
    const listeningSection: ListeningActivitySection = {
      latestListenedItem:        ca.latestListenedItem,
      latestListenedSong:        ca.latestListenedSong,
      latestListenedRadioStation: ca.latestListenedRadioStation,
      latestListenedList:        ca.latestListenedList,
      totalListeningTimeSecs:    ca.totalListeningTimeSecs,
    };
    publicDoc.listeningActivity = listeningSection;
  }

  // ── 5. Followed radio stations section ───────────────────────────────────────
  if (isSectionVisibleToPublic(privacy, 'followedRadioStations')) {
    const section: FollowedRadioStationsSection = {
      followedRadioStations: user.consumerActivity.followedRadioStations ?? [],
    };
    publicDoc.followedRadioStations = section;
  }

  // ── 6. Followed radio station lists section ──────────────────────────────────
  if (isSectionVisibleToPublic(privacy, 'followedRadioStationLists')) {
    const section: FollowedRadioStationListsSection = {
      followedRadioStationLists: user.consumerActivity.followedRadioStationLists ?? [],
    };
    publicDoc.followedRadioStationLists = section;
  }

  // ── 7. Music playlists section ───────────────────────────────────────────────
  // Only public playlists and song playlists — privatePlaylists NEVER included.
  if (isSectionVisibleToPublic(privacy, 'musicPlaylists')) {
    const section: MusicPlaylistsSection = {
      songPlaylists:   user.consumerActivity.songPlaylists   ?? [],
      publicPlaylists: user.consumerActivity.publicPlaylists ?? [],
    };
    publicDoc.musicPlaylists = section;
  }

  // ── 8. Pinned content section ─────────────────────────────────────────────────
  if (isSectionVisibleToPublic(privacy, 'pinnedContent') && user.pinnedContent) {
    const section: PinnedContentSection = { pinnedContent: user.pinnedContent };
    publicDoc.pinnedContent = section;
  }

  // ── 9. Achievements section ───────────────────────────────────────────────────
  if (isSectionVisibleToPublic(privacy, 'achievements')) {
    const section: AchievementsSection = {
      badges:       user.badges       ?? [],
      achievements: user.achievements ?? [],
    };
    publicDoc.achievements = section;
  }

  // ── 10. Plus creator content section ─────────────────────────────────────────
  // Only included if: capability is active AND privacy allows.
  // NOTE: Plus is NOT a viewer gate. Viewing is open. This section controls
  // whether the creator's Plus content list is shown on their profile.
  if (
    capabilities?.plus_creator === true &&
    isSectionVisibleToPublic(privacy, 'plusCreatorContent')
  ) {
    // Content IDs come from the private doc (plus module data).
    // Phase 5-C: The plus module content fields are not yet on UserPrivateDoc
    // (they're on PlusCreatorModule). Emit an empty-but-present section to
    // signal the capability is active. Will be populated by Phase 5-D publishing.
    const section: PlusCreatorContentSection = {
      plusContent:      [],
      plusLiveSessions: [],
      plusLists:        [],
    };
    publicDoc.plusCreatorContent = section;
  }

  // ── 11. Music creator content section ────────────────────────────────────────
  if (
    capabilities?.music_creator === true &&
    isSectionVisibleToPublic(privacy, 'musicCreatorContent')
  ) {
    const section: MusicCreatorContentSection = {
      uploadedSongs:  [],
      albums:         [],
      musicPlaylists: [],
      musicLists:     [],
    };
    publicDoc.musicCreatorContent = section;
  }

  // ── 12. Radio creator content section ────────────────────────────────────────
  if (
    capabilities?.radio_creator === true &&
    isSectionVisibleToPublic(privacy, 'radioCreatorContent')
  ) {
    const section: RadioCreatorContentSection = {
      ownedRadioStations: [],
      radioShows:         [],
      radioEpisodes:      [],
      radioLists:         [],
    };
    publicDoc.radioCreatorContent = section;
  }

  // ── 13. Tournaments organizer content section ──────────────────────────────────
  // RULE: Included only if capability is active AND privacy allows.
  // This is an owner/management section — the CF will backfill IDs from the
  // tournaments collection. Empty arrays on first projection are correct.
  if (
    capabilities?.tournament_organizer === true &&
    isSectionVisibleToPublic(privacy, 'tournamentsOrganizerContent')
  ) {
    const u = user as unknown as Record<string, unknown>;
    const section: TournamentsOrganizerContentSection = {
      organizedTournamentIds: (u['organizedTournamentIds'] as string[] | undefined) ?? [],
      activeTournamentIds:    (u['activeTournamentIds']    as string[] | undefined) ?? [],
    };
    publicDoc.tournamentsOrganizerContent = section;
  }

  // ── 14. Joined tournaments section ───────────────────────────────────────────────
  // RULE: Viewer-facing. Only projected when the user has actually joined tournaments.
  // An empty list is NOT projected — it would create an empty viewer tab.
  // Owner empty-state management belongs in private owner UI, not publicProfiles.
  {
    const joinedIds = (user as unknown as Record<string, unknown>)['joinedTournamentIds'] as string[] | undefined;
    if (
      isSectionVisibleToPublic(privacy, 'joinedTournaments') &&
      Array.isArray(joinedIds) && joinedIds.length > 0
    ) {
      publicDoc.joinedTournaments = { joinedTournamentIds: joinedIds };
    }
  }

  // ── 15. Tournament submissions section ────────────────────────────────────────
  // RULE: Viewer-facing. Only projected when the user has real submitted entries.
  {
    const submissionIds = (user as unknown as Record<string, unknown>)['submissionIds'] as string[] | undefined;
    if (
      isSectionVisibleToPublic(privacy, 'tournamentSubmissions') &&
      Array.isArray(submissionIds) && submissionIds.length > 0
    ) {
      publicDoc.tournamentSubmissions = { submissionIds };
    }
  }

  // ── 16. Voting activity section ────────────────────────────────────────────────
  // RULE: Viewer-facing. Only projected when the user has actually voted (count > 0).
  {
    const voteCount = (user as unknown as Record<string, unknown>)['publicVoteCount'] as number | undefined;
    if (
      isSectionVisibleToPublic(privacy, 'votingActivity') &&
      typeof voteCount === 'number' && voteCount > 0
    ) {
      publicDoc.votingActivity = { publicVoteCount: voteCount };
    }
  }

  // ── 17. Awards and medals section ──────────────────────────────────────────────
  // RULE: Viewer-facing. Only projected when the user has won at least one award.
  {
    const awardIds = (user as unknown as Record<string, unknown>)['awardIds'] as string[] | undefined;
    if (
      isSectionVisibleToPublic(privacy, 'awardsAndMedals') &&
      Array.isArray(awardIds) && awardIds.length > 0
    ) {
      publicDoc.awardsAndMedals = { awardIds };
    }
  }

  return publicDoc;
}
