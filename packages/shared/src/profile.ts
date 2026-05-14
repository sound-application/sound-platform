/**
 * Sound Platform — Modular Profile Schema
 * =========================================
 * Phase:   4-H-1
 * Updated: 2026-05-14
 *
 * ARCHITECTURE:
 *   A profile is NOT a fixed user type. Every profile starts from
 *   a normal audio-first base profile (BaseProfile). Capability
 *   modules are then added on top, making the profile Plus-capable,
 *   Music-capable, Radio-capable, etc.
 *
 *   There is NO separate "creator account" type — capabilities are
 *   additive modules, checked server-side against the user's
 *   active entitlements and permissions.
 *
 * SEPARATION:
 *   - Consumer activity  → what the user has listened to / saved / followed
 *   - Creator ownership → what the user has published / owns / manages
 *   Both are always privacy-controlled individually.
 */

// ─── Privacy Control ─────────────────────────────────────────────────────────

/** Controls who can see a specific profile section. */
export type PrivacyLevel = 'public' | 'followers' | 'private';

export interface PrivacySettings {
  /** Who can see listening activity (songs, playlists, stations) */
  listeningActivity: PrivacyLevel;
  /** Who can see followed accounts / channels */
  following: PrivacyLevel;
  /** Who can see followers list */
  followers: PrivacyLevel;
  /** Who can see saved items */
  savedItems: PrivacyLevel;
  /** Who can see story views */
  storyViews: PrivacyLevel;
  /** Who can see online/activity status */
  activityStatus: PrivacyLevel;
  /** Who can see pinned content */
  pinnedContent: PrivacyLevel;
  /** Who can see points / achievements */
  achievements: PrivacyLevel;
  /** Allow direct messages from */
  directMessages: PrivacyLevel;
}

// ─── Listening & Consumer Activity ───────────────────────────────────────────

/** A reference to a recently listened/consumed item. */
export interface ListenedItemRef {
  id: string;
  type: 'episode' | 'song' | 'radioStation' | 'playlist' | 'liveSession';
  title: string;
  coverUrl?: string;
  /** ISO timestamp of last listen event */
  listenedAt: string;
}

/** A reference to a followed entity (user, channel, station, playlist). */
export interface FollowedRef {
  id: string;
  type: 'user' | 'channel' | 'radioStation' | 'playlist';
  displayName: string;
  avatarUrl?: string;
}

/** Consumer activity section of a profile — always privacy-controlled. */
export interface ConsumerActivity {
  /** Last item the user listened to */
  latestListenedItem?: ListenedItemRef;
  /** Last radio station the user tuned into */
  latestListenedRadioStation?: ListenedItemRef;
  /** Last song the user listened to */
  latestListenedSong?: ListenedItemRef;
  /** Most recently used playlist */
  latestListenedList?: ListenedItemRef;
  /** Radio stations the user follows */
  followedRadioStations: FollowedRef[];
  /** Radio station lists/playlists the user follows */
  followedRadioStationLists: FollowedRef[];
  /** Music playlists / lists the user has listened to or saved */
  listenedMusicLists: FollowedRef[];
  /** User-created song playlists */
  songPlaylists: FollowedRef[];
  /** Publicly shared playlists */
  publicPlaylists: FollowedRef[];
  /** Private playlists (owner-only visibility) */
  privatePlaylists: FollowedRef[];
  /** Items the user has saved */
  savedItems: FollowedRef[];
  /** Total accumulated listening time in seconds */
  totalListeningTimeSecs: number;
}

// ─── Base Profile (Audio-First, Normal User) ─────────────────────────────────

/**
 * BaseProfile — the foundation every Sound account starts from.
 *
 * This is a normal, audio-first, privacy-aware profile.
 * All capability modules (Plus, Music, Radio) extend this.
 */
export interface BaseProfile {
  // Identity
  uid: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  coverUrl?: string;

  // Verification & trust
  isVerified: boolean;
  verificationBadgeType?: 'creator' | 'artist' | 'radio' | 'company' | 'official';

  // Bio
  bio?: string;
  location?: string;
  websiteUrl?: string;
  mood?: string;

  // Social links
  socialLinks: {
    instagram?: string;
    twitter?: string;
    youtube?: string;
    tiktok?: string;
    [key: string]: string | undefined;
  };

  // Social counters
  followersCount: number;
  followingCount: number;
  likesCount: number;
  postsCount: number;
  listensCount: number;

  // Activity
  latestActivity?: string; // ISO timestamp
  joinedAt: string;        // ISO timestamp
  activityStatus: 'online' | 'offline' | 'hidden';

  // Published content (creator-owned items — always visible to owner, privacy-gated for others)
  posts: string[];        // IDs of published posts
  stories: string[];      // IDs of active stories
  audioContent: string[]; // IDs of published audio content
  liveSessions: string[]; // IDs of past live sessions (public if published)
  reposts: string[];      // IDs of reposted content
  replies: string[];      // IDs of replies/comments
  comments: string[];     // IDs of comments on others' content
  pinnedContent?: string; // ID of pinned item

  // Consumer activity (all privacy-controlled)
  consumerActivity: ConsumerActivity;

  // Gamification
  badges: string[];       // Badge/achievement IDs
  achievements: string[]; // Achievement IDs
  points: number;         // Current points balance
  gifts: string[];        // Gift IDs received

  // Subscriptions
  subscriptions: string[]; // Active package subscription IDs

  // Privacy controls
  privacy: PrivacySettings;

  // System
  isMinor: boolean;
  guardianUid?: string;  // Set by Cloud Function only if isMinor
  isBlocked: boolean;    // Computed — true if viewer has blocked this profile
  isMuted: boolean;      // Computed — true if viewer has muted this profile
  isBanned: boolean;     // Set by Cloud Function only

  // UI action state (computed at read-time, not stored)
  canFollow?: boolean;
  canMessage?: boolean;
  canReport?: boolean;
  canBlock?: boolean;
  canMute?: boolean;
}

// ─── Capability Modules ───────────────────────────────────────────────────────

/**
 * PlusCreatorModule — added to a profile when the user has Plus publishing capability.
 *
 * NOTE: Plus is NOT a viewer gate. Any user can VIEW Plus content if it is published
 * and allowed by privacy/moderation. Plus capability controls CREATION and PUBLISHING
 * into Plus-world content only.
 */
export interface PlusCreatorModule {
  plusEnabled: true;
  /** IDs of content published into Plus world */
  plusContent: string[];
  /** IDs of live sessions hosted in Plus world */
  plusLiveSessions: string[];
  /** IDs of Plus-world playlists/lists owned by this user */
  plusLists: string[];
}

/**
 * MusicCreatorModule — added to a profile when the user has Music publishing capability.
 *
 * Music publishing requires music capability entitlement (granted via admin or package).
 * Music profiles can publish content into General or Plus depending on their capabilities.
 * Music world itself has no native live mode.
 */
export interface MusicCreatorModule {
  musicEnabled: true;
  /** IDs of uploaded songs owned by this profile */
  uploadedSongs: string[];
  /** IDs of albums owned by this profile */
  albums: string[];
  /** IDs of song playlists owned by this profile */
  musicPlaylists: string[];
  /** IDs of music lists owned by this profile */
  musicLists: string[];
}

/**
 * RadioCreatorModule — added to a profile when the user has Radio capability.
 *
 * Adding radio stations requires radio capability entitlement.
 * Radio profiles can publish content into General or Plus depending on capabilities.
 */
export interface RadioCreatorModule {
  radioEnabled: true;
  /** IDs of radio stations owned/managed by this profile */
  ownedRadioStations: string[];
  /** IDs of radio shows created by this profile */
  radioShows: string[];
  /** IDs of radio episodes created by this profile */
  radioEpisodes: string[];
  /** IDs of radio playlists / lists managed by this profile */
  radioLists: string[];
}

// ─── Composed Profile Types ───────────────────────────────────────────────────

/** 1. Normal profile — base audio-first profile only. */
export type NormalProfile = BaseProfile;

/** 2. Plus-capable profile — normal + Plus creator module. */
export type PlusCapableProfile = BaseProfile & PlusCreatorModule;

/** 3. Music-capable profile — normal + Music creator module. */
export type MusicCapableProfile = BaseProfile & MusicCreatorModule;

/** 4. Radio-capable profile — normal + Radio creator module. */
export type RadioCapableProfile = BaseProfile & RadioCreatorModule;

/**
 * 5. Super profile — all modules enabled simultaneously.
 *    A user can hold multiple capability modules at once.
 */
export type SuperProfile = BaseProfile & PlusCreatorModule & MusicCreatorModule & RadioCreatorModule;

/**
 * Profile — the discriminated union of all possible profile states.
 * The active capabilities are determined by the user's entitlements,
 * resolved server-side only. The UI renders sections conditionally
 * based on the capabilities present in the API response.
 */
export type Profile =
  | NormalProfile
  | PlusCapableProfile
  | MusicCapableProfile
  | RadioCapableProfile
  | SuperProfile;

// ─── Profile Capability Guards ────────────────────────────────────────────────

export function hasPlusCapability(p: Profile): p is PlusCapableProfile | SuperProfile {
  return 'plusEnabled' in p && p.plusEnabled === true;
}

export function hasMusicCapability(p: Profile): p is MusicCapableProfile | SuperProfile {
  return 'musicEnabled' in p && p.musicEnabled === true;
}

export function hasRadioCapability(p: Profile): p is RadioCapableProfile | SuperProfile {
  return 'radioEnabled' in p && p.radioEnabled === true;
}

// ─── Public Profile Projection ────────────────────────────────────────────────

/**
 * PublicProfileProjection — the safe public-facing subset of a profile.
 * Returned by the Cloud Function /profile endpoint when the viewer
 * is NOT the owner. Privacy settings determine which fields are included.
 *
 * NEVER expose: uid (raw), isMinor, guardianUid, isBanned, wallet data,
 * private playlists, billing info, device sessions.
 */
export interface PublicProfileProjection {
  username: string;
  displayName: string;
  avatarUrl?: string;
  coverUrl?: string;
  isVerified: boolean;
  verificationBadgeType?: BaseProfile['verificationBadgeType'];
  bio?: string;
  location?: string;
  websiteUrl?: string;
  mood?: string;
  followersCount: number;
  followingCount: number;
  postsCount: number;
  listensCount: number;
  joinedAt: string;
  activityStatus: 'online' | 'offline' | 'hidden';
  badges: string[];
  // Capability flags (no sensitive data)
  isPlusCreator: boolean;
  isMusicCreator: boolean;
  isRadioCreator: boolean;
}
