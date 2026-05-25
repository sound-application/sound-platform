/**
 * Sound Platform — Modular Profile Schema
 * =========================================
 * Phase:   6-A (Profile + PublicProfile + Privacy schema foundation)
 * Updated: 2026-05-25
 *
 * CHANGELOG (Phase 6-A):
 *   - Added PrivacySettingsDoc — dedicated document at privacySettings/{uid}
 *     for the AccountControlHub Privacy Center persistence layer.
 *   - Added createDefaultPrivacySettingsDoc() factory (used by onUserCreate).
 *   - Audience model comments clarified — server-side enforcement roadmap noted.
 *
 * Original Phase:   5-D (World Model + Tournaments Privacy Alignment)
 * Originally:       2026-05-17
 *
 * WORLD MODEL (authoritative):
 *   Five worlds: general | plus | music | radio | tournaments
 *   Live (لايف) is a BOTTOM TAB scoped by the user's active world.
 *   Live is NOT a world and must never appear as a WorldId value.
 *
 * DOCUMENT SPLIT (Phase 4-H-2):
 *   users/{uid}          -> PRIVATE. Owner + admin readable only.
 *                           Contains raw profile data, settings, capabilities,
 *                           restrictions, consumer activity, privacy config.
 *   publicProfiles/{uid} -> PUBLIC PROJECTION. Any authenticated user can read.
 *                           Built section-by-section by Cloud Function.
 *                           Only contains what owner has made visible.
 *
 * EMPTY-SECTION RULE:
 *   Viewer-facing sections are projected ONLY when real content exists.
 *   Owner/management sections may project empty for CTA purposes.
 *   See buildPublicProfile.ts for per-section projection rules.
 *
 * SEPARATION:
 *   - Consumer activity  -> what the user listened to / saved / followed
 *   - Creator ownership  -> what the user published / owns / manages
 *   Both are individually privacy-controlled sections in the public projection.
 */

// ─── Privacy Control (Phase 5-C-3: Multi-select Audience Model) ──────────────────

/**
 * PrivacySection — identifies each independently privacy-controlled section
 * of a public profile. Each section has its own SectionPrivacy config.
 */
export type PrivacySection =
  | 'generalProfile'              // username, bio, avatar, social counters
  | 'mood'                        // current mood string
  | 'listeningActivity'           // latest listened item / total time
  | 'followedRadioStations'       // followed radio stations list
  | 'followedRadioStationLists'   // followed radio station lists
  | 'musicPlaylists'              // music playlists owned/followed
  | 'savedItems'                  // bookmarked/saved items
  | 'storyViews'                  // story view activity
  | 'activityStatus'              // online / offline / hidden
  | 'pinnedContent'               // pinned item on profile
  | 'achievements'                // badges / gamification
  | 'following'                   // who the user follows
  | 'followers'                   // follower list
  | 'directMessages'              // DM permission
  | 'plusCreatorContent'          // Plus world published content
  | 'musicCreatorContent'         // Music world content (songs, albums)
  | 'radioCreatorContent'         // Radio stations / shows owned
  // ── Tournaments sections (مسابقات world — added Phase 5-D schema correction) ───────────────
  | 'tournamentsOrganizerContent' // tournaments created/managed by this user
  | 'joinedTournaments'           // tournaments this user participated in
  | 'tournamentSubmissions'       // competition entries/submissions
  | 'votingActivity'              // public voting activity (my votes)
  | 'awardsAndMedals';            // winner badges / competition medals

/**
 * PrivacyAudience — the atomic audience token (Phase 5-C-3).
 *
 * - 'public'   : visible to everyone (exclusive — clears all others)
 * - 'friends'  : mutual followers (future gate)
 * - 'followers': users that follow me
 * - 'following': users I follow
 * - 'custom'   : a custom named list (IDs stored in customListIds)
 * - 'onlyMe'   : only the owner — fully private (exclusive — clears all others)
 */
export type PrivacyAudience =
  | 'public'
  | 'friends'
  | 'followers'
  | 'following'
  | 'custom'
  | 'onlyMe';

/**
 * SectionPrivacy — per-section audience configuration (Phase 5-C-3).
 *
 * audiences is an ordered array of PrivacyAudience tokens.
 * Exclusive tokens ('public', 'onlyMe') are always stored alone.
 * Non-exclusive tokens can be combined freely.
 *
 * Examples:
 *   { audiences: ['public'] }                              → everyone
 *   { audiences: ['onlyMe'] }                              → only owner
 *   { audiences: ['friends', 'followers'] }                → combined
 *   { audiences: ['custom'], customListIds: ['listA'] }    → named list
 */
export interface SectionPrivacy {
  audiences: PrivacyAudience[];
  /** IDs of custom audience lists (used when 'custom' is selected). */
  customListIds?: string[];
}

/** Full privacy settings map — one SectionPrivacy per PrivacySection. */
export type PrivacySettings = { [K in PrivacySection]: SectionPrivacy };

/**
 * @deprecated Legacy single-string privacy level (Phase ≤5-C-2).
 * Only used for migration. New code must use SectionPrivacy.
 */
export type PrivacyLevel = 'public' | 'followers' | 'private';

/**
 * migratePrivacyLevel — normalizes a stored value (old string OR new object)
 * into a canonical SectionPrivacy object (Phase 5-C-3).
 *
 * Use this when reading from Firestore documents that may have been written
 * before the Phase 5-C-3 upgrade.
 */
export function migratePrivacyLevel(
  raw: PrivacyLevel | SectionPrivacy | undefined,
  fallback: SectionPrivacy = { audiences: ['public'] },
): SectionPrivacy {
  if (!raw) return fallback;
  if (typeof raw === 'object' && 'audiences' in raw) return raw as SectionPrivacy;
  // Legacy string migration
  if (raw === 'public')    return { audiences: ['public'] };
  if (raw === 'followers') return { audiences: ['followers'] };
  if (raw === 'private')   return { audiences: ['onlyMe'] };
  return fallback;
}

/** Returns true if a SectionPrivacy config allows public projection. */
export function isPubliclyVisible(sp: SectionPrivacy | undefined): boolean {
  if (!sp) return false;
  return sp.audiences.includes('public');
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

// ─── Private User Document (users/{uid}) ─────────────────────────────────────

/**
 * UserPrivateDoc — the internal document stored at users/{uid}.
 *
 * NEVER readable by other users via client SDK.
 * Readable only by: owner, admin, Cloud Functions (Admin SDK).
 *
 * Capability modules are stored as a flat capabilities map.
 * Restrictions are stored as an array of ActiveRestriction objects.
 */
export interface UserPrivateDoc {
  // Identity
  uid: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  coverUrl?: string;

  // Verification
  isVerified: boolean;
  verificationBadgeType?: 'creator' | 'artist' | 'radio' | 'company' | 'official';

  // Bio (owner-editable)
  bio?: string;
  location?: string;
  websiteUrl?: string;
  mood?: string;
  socialLinks: Record<string, string>;

  // Counters (updated by Cloud Function aggregation)
  followersCount: number;
  followingCount: number;
  likesCount: number;
  postsCount: number;
  listensCount: number;

  // Timestamps
  joinedAt: string;
  latestActivity?: string;

  // Status
  activityStatus: 'online' | 'offline' | 'hidden';

  // Creator-owned content IDs (per capability module)
  posts: string[];
  stories: string[];
  audioContent: string[];
  liveSessions: string[];
  reposts: string[];
  replies: string[];
  comments: string[];
  pinnedContent?: string;

  // Consumer activity (raw, privacy-controlled in public projection)
  consumerActivity: ConsumerActivity;

  // Gamification
  badges: string[];
  achievements: string[];
  points: number;
  gifts: string[];

  // Subscriptions
  subscriptions: string[];

  // Privacy settings — one level per section
  privacy: PrivacySettings;

  // Capability modules (granted by CF only)
  capabilities: {
    plus_creator?: true;
    music_creator?: true;
    radio_creator?: true;
    tournament_organizer?: true; // Can create/manage tournaments (مسابقات world)
    competition_jury?: true;
    ads_creator?: true;
    promoter?: true;
  };

  // System fields (all set by Cloud Function / Admin SDK only)
  isMinor: boolean;
  guardianUid?: string;
  isBanned: boolean;
  bannedAt?: string;
  suspendedAt?: string;
  deletedAt?: string;
  createdAt: string;

  // Role (set by Cloud Function / Admin SDK only)
  role: 'superAdmin' | 'admin' | 'moderator' | 'creator' | 'listener';
  /**
   * @deprecated Legacy rigid account type. Use the capabilities map for all new logic.
   * Kept for backward compatibility only — do not write new product logic against this field.
   * New users receive 'normal'. Do not write 'plus', 'music', or 'radio' for new users.
   * Migration: this field will be removed after all existing documents are migrated.
   */
  accountType?: 'normal' | 'plus' | 'music' | 'radio';
  walletId?: string; // server-only reference
  kycStatus?: 'pending' | 'approved' | 'rejected'; // server-only
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
 *
 * Radio station schema note:
 *   - Each radioStation document has an ownerProfileId field
 *     pointing to the uid of the profile that created/owns it.
 *   - Each radioStation has a contactPage subcollection with
 *     contact config (social links, station email, form config).
 *   - Radio player comments are stored in radioStations/{id}/playerComments.
 *   - Live broadcast messages route to the notifications inbox of
 *     the ownerProfileId profile (handled by Cloud Function).
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




// ─── BaseProfile type alias (capability composition base) ────────────────────

/**
 * BaseProfile — the base set of fields common to all profile capability views.
 * Used as the foundation for capability module intersection types.
 * Represents the public-facing identity portion (does NOT include private fields).
 */
export interface BaseProfile {
  uid: string; // present in API responses as the lookup key only
  username: string;
  displayName: string;
  avatarUrl?: string;
  coverUrl?: string;
  isVerified: boolean;
  verificationBadgeType?: 'creator' | 'artist' | 'radio' | 'company' | 'official';
  bio?: string;
  location?: string;
  websiteUrl?: string;
  mood?: string;
  socialLinks: Record<string, string>;
  followersCount: number;
  followingCount: number;
  likesCount: number;
  postsCount: number;
  listensCount: number;
  joinedAt: string;
  activityStatus: 'online' | 'offline' | 'hidden';
  badges: string[];
  pinnedContent?: string;
  // Computed viewer-relative flags (not stored, set by CF at read time)
  isBlocked?: boolean;
  isMuted?: boolean;
  canFollow?: boolean;
  canMessage?: boolean;
  canReport?: boolean;
  canBlock?: boolean;
  canMute?: boolean;
}

/** Composed profile types (capability intersection) */
export type NormalProfile = BaseProfile;
export type PlusCapableProfile = BaseProfile & PlusCreatorModule;
export type MusicCapableProfile = BaseProfile & MusicCreatorModule;
export type RadioCapableProfile = BaseProfile & RadioCreatorModule;
export type SuperProfile = BaseProfile & PlusCreatorModule & MusicCreatorModule & RadioCreatorModule;

export type Profile =
  | NormalProfile
  | PlusCapableProfile
  | MusicCapableProfile
  | RadioCapableProfile
  | SuperProfile;

// ─── Capability Guards ────────────────────────────────────────────────────────

export function hasPlusCapability(p: Profile): p is PlusCapableProfile | SuperProfile {
  return 'plusEnabled' in p && (p as PlusCreatorModule).plusEnabled === true;
}

export function hasMusicCapability(p: Profile): p is MusicCapableProfile | SuperProfile {
  return 'musicEnabled' in p && (p as MusicCreatorModule).musicEnabled === true;
}

export function hasRadioCapability(p: Profile): p is RadioCapableProfile | SuperProfile {
  return 'radioEnabled' in p && (p as RadioCreatorModule).radioEnabled === true;
}

// ─── Public Profile Document (publicProfiles/{uid}) ──────────────────────────

/**
 * PublicProfileSection — each independently privacy-controlled block
 * that may appear in a publicProfiles/{uid} document.
 * The Cloud Function includes a section only if its PrivacyLevel permits
 * the viewing user. Privacy-hidden sections are ABSENT (not null/empty).
 */

/** General section — always present if profile is not fully private. */
export interface GeneralProfileSection {
  username: string;
  displayName: string;
  avatarUrl?: string;
  coverUrl?: string;
  isVerified: boolean;
  verificationBadgeType?: BaseProfile['verificationBadgeType'];
  bio?: string;
  location?: string;
  websiteUrl?: string;
  socialLinks: Record<string, string>;
  followersCount: number;
  followingCount: number;
  postsCount: number;
  listensCount: number;
  joinedAt: string;
  badges: string[];
  isPlusCreator: boolean;
  isMusicCreator: boolean;
  isRadioCreator: boolean;
  isTournamentsCreator: boolean; // has tournament_organizer capability
  // Viewer-relative computed flags
  isBlocked?: boolean;
  isMuted?: boolean;
  canFollow?: boolean;
  canMessage?: boolean;
  canReport?: boolean;
  canBlock?: boolean;
  canMute?: boolean;
}

/** Mood section (privacy-controlled). */
export interface MoodSection {
  mood: string;
}

/** Activity status section (privacy-controlled). */
export interface ActivityStatusSection {
  activityStatus: 'online' | 'offline' | 'hidden';
}

/** Listening activity section (privacy-controlled). */
export interface ListeningActivitySection {
  latestListenedItem?: ListenedItemRef;
  latestListenedSong?: ListenedItemRef;
  latestListenedRadioStation?: ListenedItemRef;
  latestListenedList?: ListenedItemRef;
  totalListeningTimeSecs?: number;
}

/** Followed radio stations section (privacy-controlled). */
export interface FollowedRadioStationsSection {
  followedRadioStations: FollowedRef[];
}

/** Followed radio station lists section (privacy-controlled). */
export interface FollowedRadioStationListsSection {
  followedRadioStationLists: FollowedRef[];
}

/** Music playlists section (privacy-controlled). */
export interface MusicPlaylistsSection {
  songPlaylists: FollowedRef[];
  publicPlaylists: FollowedRef[];
}

/** Pinned content section (privacy-controlled). */
export interface PinnedContentSection {
  pinnedContent: string;
}

/** Achievements section (privacy-controlled). */
export interface AchievementsSection {
  badges: string[];
  achievements: string[];
}

/** Plus creator content section (privacy-controlled, only if has plus_creator capability). */
export interface PlusCreatorContentSection {
  plusContent: string[];       // Content IDs published in Plus world
  plusLiveSessions: string[];  // Live session IDs in Plus world
  plusLists: string[];         // Plus-world playlist IDs
}

/** Music creator content section (privacy-controlled, only if has music_creator capability). */
export interface MusicCreatorContentSection {
  uploadedSongs: string[];
  albums: string[];
  musicPlaylists: string[];
  musicLists: string[];
}

/** Radio creator content section (privacy-controlled, only if has radio_creator capability). */
export interface RadioCreatorContentSection {
  ownedRadioStations: string[];
  radioShows: string[];
  radioEpisodes: string[];
  radioLists: string[];
}

// ── Tournaments Sections (مسابقات world — Phase 5-D schema correction) ──────────────────────────

/** Tournaments organizer content section (privacy-controlled, only if has tournament_organizer capability). */
export interface TournamentsOrganizerContentSection {
  organizedTournamentIds: string[]; // tournament IDs created/managed by this user
  activeTournamentIds: string[];    // currently active tournament IDs
}

/** Joined tournaments section (privacy-controlled). */
export interface JoinedTournamentsSection {
  joinedTournamentIds: string[]; // tournament IDs user has participated in
}

/** Tournament submissions section (privacy-controlled). */
export interface TournamentSubmissionsSection {
  submissionIds: string[]; // competition entry IDs submitted by this user
}

/** Voting activity section (privacy-controlled). */
export interface VotingActivitySection {
  publicVoteCount: number; // total number of public votes cast
}

/** Awards and medals section (privacy-controlled). */
export interface AwardsAndMedalsSection {
  awardIds: string[]; // badge/medal IDs won in tournaments
}

/**
 * PublicProfileDoc — the document stored at publicProfiles/{uid}.
 *
 * Built section-by-section by Cloud Function.
 * Each optional section is included ONLY if the viewer's relationship
 * satisfies the owner's PrivacyLevel for that section.
 * Privacy-hidden sections are absent from the document entirely.
 */
export interface PublicProfileDoc {
  uid: string;
  // generalProfile is always present (else the profile is fully private / not found)
  generalProfile: GeneralProfileSection;
  // Optional sections — present only when privacy allows
  mood?: MoodSection;
  activityStatus?: ActivityStatusSection;
  listeningActivity?: ListeningActivitySection;
  followedRadioStations?: FollowedRadioStationsSection;
  followedRadioStationLists?: FollowedRadioStationListsSection;
  musicPlaylists?: MusicPlaylistsSection;
  pinnedContent?: PinnedContentSection;
  achievements?: AchievementsSection;
  // Creator content sections — present only if capability active AND privacy allows
  plusCreatorContent?: PlusCreatorContentSection;
  musicCreatorContent?: MusicCreatorContentSection;
  radioCreatorContent?: RadioCreatorContentSection;
  // Tournaments sections — present only if capability/participation exists AND privacy allows
  tournamentsOrganizerContent?: TournamentsOrganizerContentSection;
  joinedTournaments?: JoinedTournamentsSection;
  tournamentSubmissions?: TournamentSubmissionsSection;
  votingActivity?: VotingActivitySection;
  awardsAndMedals?: AwardsAndMedalsSection;
  // Meta
  lastUpdatedAt: string; // ISO — when the CF last rebuilt this projection
}

// ─── Privacy Settings Document (privacySettings/{uid}) ───────────────────────

/**
 * PrivacySettingsDoc — the document stored at privacySettings/{uid}.
 *
 * SEPARATION OF CONCERNS:
 *   users/{uid}.privacy        → drives publicProfiles projection (PrivacySettings map).
 *   privacySettings/{uid}      → stores the full AccountControlHub Privacy Center state.
 *
 * Why two documents?
 *   - users/{uid} is owner-only. Embedding 30+ UI privacy fields there would
 *     bloat every profile read and Cloud Function trigger.
 *   - privacySettings/{uid} is a separate, focused document: owner reads/writes,
 *     admin reads. Cloud Functions sync selected fields back to users/{uid}.privacy
 *     for publicProfiles projection.
 *
 * AUDIENCE ENFORCEMENT (Phase 6-A status):
 *   - 'public'    → fully enforced (publicProfiles projection gate).
 *   - 'only-me'   → fully enforced (section absent from publicProfiles).
 *   - 'followers' → STORED but NOT yet enforced. Social graph (follows collection)
 *                   does not exist. Treated as 'public' until follows module is built.
 *                   Comment: // PHASE 7: enforce after follows module
 *   - 'friends'   → STORED but NOT yet enforced. Treated as 'followers' fallback.
 *                   Comment: // PHASE 7: enforce after follows module
 *   - 'following' → STORED but NOT yet enforced. Same as 'friends'.
 *   - 'custom'    → STORED but NOT yet enforced. No custom lists collection yet.
 *                   Comment: // PHASE 9: enforce after lists module
 *   Enforcement is done in buildPublicProfile.ts — see comments there.
 *
 * UI row IDs match AccountControlHub PRIVACY_GROUPS row.id values exactly.
 * Values are string tokens matching the option IDs in PrivacyOption arrays.
 *
 * serverEnforced rows (الأطفال والوصي) are NOT stored here — they are
 * server-only and never written by the client.
 */
export interface PrivacySettingsDoc {
  uid: string;

  // ── الملف والهوية ─────────────────────────────────────────────────────────
  'profile-visibility':  string; // audience
  'profile-stats':       string; // audience
  'social-links':        string; // audience
  'badges':              string; // audience

  // ── القصص ودائرة الصورة ──────────────────────────────────────────────────
  'stories-visibility':  string; // audience
  'story-ring':          string; // audience
  'story-replies':       string; // contact

  // ── الاستماع الآن ─────────────────────────────────────────────────────────
  'listening-now':              string; // audience
  'listening-world-switch':     string; // toggle

  // ── مزاجي ────────────────────────────────────────────────────────────────
  'mood-visibility': string; // audience
  'mood-source':     string; // toggle

  // ── المحفوظات ─────────────────────────────────────────────────────────────
  'saved-visibility': string; // audience
  'saved-lists':      string; // audience

  // ── الإعادات ──────────────────────────────────────────────────────────────
  'reposts-visibility': string; // audience

  // ── الاشتراكات ────────────────────────────────────────────────────────────
  'subscriptions-visibility': string; // audience

  // ── الرحلات / الجلسات ────────────────────────────────────────────────────
  'sessions-visibility': string; // audience
  'sessions-location':   string; // location-precision

  // ── الرسائل والتواصل ─────────────────────────────────────────────────────
  'messages':       string; // contact
  'follow-requests': string; // approval
  'group-invites':  string; // contact

  // ── الهدايا والنقاط ───────────────────────────────────────────────────────
  'receive-gifts':   string; // contact
  'receive-points':  string; // contact
  'points-balance':  string; // audience

  // ── الظهور في اكتشف ──────────────────────────────────────────────────────
  'discover-profile':   string; // toggle
  'follow-suggestions': string; // toggle

  // ── الحظر والكتم ─────────────────────────────────────────────────────────
  'blocked-accounts': string; // management
  'muted-accounts':   string; // management

  // ── Meta ──────────────────────────────────────────────────────────────────
  updatedAt: string; // ISO — when the owner last saved their privacy settings
  createdAt: string; // ISO — when this document was first created (onUserCreate)
}

/**
 * createDefaultPrivacySettingsDoc — builds the safe default PrivacySettingsDoc.
 *
 * Called by onUserCreate to initialize privacySettings/{uid}.
 * Defaults match the PRIVACY_GROUPS constant in AccountControlHub.tsx.
 */
export function createDefaultPrivacySettingsDoc(uid: string, now: string): PrivacySettingsDoc {
  return {
    uid,

    // الملف والهوية
    'profile-visibility': 'public',
    'profile-stats':      'followers',
    'social-links':       'public',
    'badges':             'public',

    // القصص ودائرة الصورة
    'stories-visibility': 'followers',
    'story-ring':         'followers',
    'story-replies':      'friends',

    // الاستماع الآن
    'listening-now':           'followers',
    'listening-world-switch':  'on',

    // مزاجي
    'mood-visibility': 'followers',
    'mood-source':     'on',

    // المحفوظات
    'saved-visibility': 'only-me',
    'saved-lists':      'only-me',

    // الإعادات
    'reposts-visibility': 'public',

    // الاشتراكات
    'subscriptions-visibility': 'followers',

    // الرحلات / الجلسات
    'sessions-visibility': 'friends',
    'sessions-location':   'city',

    // الرسائل والتواصل
    'messages':        'followers',
    'follow-requests': 'auto',
    'group-invites':   'friends',

    // الهدايا والنقاط
    'receive-gifts':  'followers',
    'receive-points': 'followers',
    'points-balance': 'only-me',

    // الظهور في اكتشف
    'discover-profile':   'on',
    'follow-suggestions': 'on',

    // الحظر والكتم
    'blocked-accounts': 'manage',
    'muted-accounts':   'manage',

    // Meta
    createdAt: now,
    updatedAt: now,
  };
}

