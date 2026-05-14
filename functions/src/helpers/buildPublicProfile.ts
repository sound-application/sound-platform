/**
 * Sound Platform — Public Profile Projection Builder
 * ====================================================
 * Phase:   5-C (Profile Update Sync)
 * Updated: 2026-05-14
 *
 * Shared helper used by:
 *   - onUserCreate      (builds initial projection on signup)
 *   - onUserProfileUpdate (rebuilds projection on users/{uid} write)
 *
 * PRIVACY MODEL (Phase 4-H-2):
 *
 *   publicProfiles/{uid} is built section-by-section from users/{uid}.
 *   Each section is included ONLY if its PrivacyLevel is 'public'.
 *   'followers' and 'private' sections are ABSENT from the projection
 *   (follower-gated reads are not yet implemented — Phase 5-D+).
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
  PrivacySettings,
  PrivacyLevel,
} from '@sound/shared';

// ─── Privacy Gate ─────────────────────────────────────────────────────────────

/**
 * Returns true if the privacy level permits public projection inclusion.
 * Phase 5-C: only 'public' sections are included.
 * 'followers' support is a Phase 5-D+ concern.
 */
export function isSectionPublic(
  privacy: PrivacySettings,
  section: keyof PrivacySettings,
): boolean {
  const level: PrivacyLevel = privacy[section] ?? 'private';
  return level === 'public';
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
 *   - Only include optional sections if privacy === 'public'.
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
    // avatarUrl / coverUrl: undefined is dropped by ignoreUndefinedProperties
    avatarUrl:    user.avatarUrl,
    coverUrl:     user.coverUrl,
    isVerified:   user.isVerified,
    // verificationBadgeType: optional — undefined dropped cleanly
    verificationBadgeType: user.verificationBadgeType,
    // bio / location / websiteUrl: owner-editable, publicly visible in general section
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
    isPlusCreator:  user.capabilities?.plus_creator === true,
    isMusicCreator: user.capabilities?.music_creator === true,
    isRadioCreator: user.capabilities?.radio_creator === true,
  };

  // Start building the public doc — general is always present
  const publicDoc: PublicProfileDoc = {
    uid:            user.uid,
    generalProfile: generalSection,
    lastUpdatedAt:  now,
  };

  // ── 2. Mood section ──────────────────────────────────────────────────────────
  if (isSectionPublic(privacy, 'mood') && user.mood) {
    const moodSection: MoodSection = { mood: user.mood };
    publicDoc.mood = moodSection;
  }

  // ── 3. Activity status section ───────────────────────────────────────────────
  if (isSectionPublic(privacy, 'activityStatus')) {
    const activitySection: ActivityStatusSection = {
      activityStatus: user.activityStatus,
    };
    publicDoc.activityStatus = activitySection;
  }

  // ── 4. Listening activity section ────────────────────────────────────────────
  // Subset of consumerActivity — only safe, non-private listening refs.
  // savedItems and storyViews are NEVER included regardless of privacy.
  if (isSectionPublic(privacy, 'listeningActivity')) {
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
  if (isSectionPublic(privacy, 'followedRadioStations')) {
    const section: FollowedRadioStationsSection = {
      followedRadioStations: user.consumerActivity.followedRadioStations ?? [],
    };
    publicDoc.followedRadioStations = section;
  }

  // ── 6. Followed radio station lists section ──────────────────────────────────
  if (isSectionPublic(privacy, 'followedRadioStationLists')) {
    const section: FollowedRadioStationListsSection = {
      followedRadioStationLists: user.consumerActivity.followedRadioStationLists ?? [],
    };
    publicDoc.followedRadioStationLists = section;
  }

  // ── 7. Music playlists section ───────────────────────────────────────────────
  // Only public playlists and song playlists — privatePlaylists NEVER included.
  if (isSectionPublic(privacy, 'musicPlaylists')) {
    const section: MusicPlaylistsSection = {
      songPlaylists:   user.consumerActivity.songPlaylists   ?? [],
      publicPlaylists: user.consumerActivity.publicPlaylists ?? [],
    };
    publicDoc.musicPlaylists = section;
  }

  // ── 8. Pinned content section ─────────────────────────────────────────────────
  if (isSectionPublic(privacy, 'pinnedContent') && user.pinnedContent) {
    const section: PinnedContentSection = { pinnedContent: user.pinnedContent };
    publicDoc.pinnedContent = section;
  }

  // ── 9. Achievements section ───────────────────────────────────────────────────
  if (isSectionPublic(privacy, 'achievements')) {
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
    isSectionPublic(privacy, 'plusCreatorContent')
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
    isSectionPublic(privacy, 'musicCreatorContent')
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
    isSectionPublic(privacy, 'radioCreatorContent')
  ) {
    const section: RadioCreatorContentSection = {
      ownedRadioStations: [],
      radioShows:         [],
      radioEpisodes:      [],
      radioLists:         [],
    };
    publicDoc.radioCreatorContent = section;
  }

  return publicDoc;
}
