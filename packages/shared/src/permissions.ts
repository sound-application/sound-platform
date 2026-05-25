/**
 * Sound Platform — Permission Model
 * =====================================
 * Phase:   4-H-1
 * Updated: 2026-05-17 (world model correction — tournaments replaces live)
 *
 * WORLD MODEL (five worlds, one app):
 *   عام (general) | بلس (plus) | موسيقى (music) | راديو (radio) | مسابقات (tournaments)
 *   Live (لايف) is a bottom navigation TAB scoped by the selected world.
 *   Live is NOT a world. The fifth world is tournaments (مسابقات).
 *
 * CORE PRINCIPLES:
 *
 * 1. VIEWING is broadly available — gated only by: auth, published status,
 *    privacy settings, moderation/blocks.
 *    Plus is NOT a viewer gate. Any authenticated user can view Plus content
 *    if it is published and privacy/moderation allows it.
 *
 * 2. CREATION/PUBLISHING is permission-gated by:
 *    - Destination world
 *    - Content type
 *    - Capability module entitlements
 *    - Account restrictions (bans, violations, temp blocks)
 *
 * 3. GENERAL WORLD creation is open by default for normal users.
 *    General live rooms need no special permission unless account is restricted.
 *
 * 4. PLUS WORLD publishing requires plus_creator capability.
 *    Plus live rooms require plus_creator capability.
 *
 * 5. MUSIC WORLD: uploading songs/albums requires music_creator.
 *    Music Live exists as event/concert-style experiences — NOT generic chat rooms.
 *    Music Live creation requires music_creator capability.
 *
 * 6. RADIO WORLD: adding radio stations requires radio_creator capability.
 *    Radio Live tab shows current on-air broadcasts and scheduled programs.
 *    Normal Sound-native live room creation is DISABLED in the Radio world.
 *
 * 7. TOURNAMENTS WORLD: creating/managing tournaments requires tournament_organizer capability.
 *    Any authenticated user can submit competition entries (open tournaments).
 *    Tournament Live shows tournament broadcast/voting events.
 *
 * All permission checks are AUTHORITATIVE SERVER-SIDE ONLY.
 */

/**
 * WorldId — the five fixed worlds of the Sound platform.
 *
 * IMPORTANT: 'live' is NOT a world. Live is a bottom tab scoped by the selected world.
 * The fifth world is 'tournaments' (مسابقات).
 */
export type WorldId = 'general' | 'plus' | 'music' | 'radio' | 'tournaments';

export type ContentTypeId =
  | 'audio' | 'video' | 'image' | 'text' | 'poll' | 'question' | 'link'
  | 'template' | 'story' | 'song' | 'album' | 'liveSession'
  | 'radioStation' | 'radioShow' | 'radioEpisode'
  | 'tournament'        // A tournament created by a tournament_organizer (مسابقات world)
  | 'competitionEntry'; // A submission/entry to a tournament

/**
 * CapabilityModule — entitlement modules that can be added to a profile.
 * Granted by package subscription, admin override, or verification.
 */
export type CapabilityModule =
  | 'plus_creator'         // Can publish content/live into Plus world
  | 'music_creator'        // Can upload songs, create albums, music live events
  | 'radio_creator'        // Can add/manage radio stations, radio shows/episodes
  | 'tournament_organizer' // Can create and manage tournaments (مسابقات world)
  | 'competition_jury'     // Can score competition entries as jury member
  | 'ads_creator'          // Can create ad campaigns
  | 'promoter';            // Can promote/boost content

/**
 * PermissionKey — granular action permissions resolved server-side.
 *
 * View permissions are broadly available (auth + moderation only).
 * Creation permissions are capability + restriction gated.
 */
export type PermissionKey =
  // Viewing / Interaction (broadly available)
  | 'view_published_content'
  | 'view_live_sessions'
  | 'view_profiles'
  | 'view_competitions'
  | 'interact_like'
  | 'interact_comment'
  | 'interact_share'
  | 'interact_save'
  | 'interact_follow'
  | 'interact_gift'
  // Reporting & Safety
  | 'report_content'
  | 'appeal_moderation'
  // General World Creation (open by default, restricted by bans/violations)
  | 'publish_to_general'
  | 'create_story_general'
  | 'create_live_general'
  // Plus World Creation (requires plus_creator capability)
  | 'publish_to_plus'
  | 'create_live_plus'
  | 'create_plus_list'
  // Music Capability (requires music_creator capability)
  | 'upload_music'
  | 'create_album'
  | 'create_song_playlist'
  // Radio Capability (requires radio_creator capability)
  | 'manage_radio_station'
  | 'create_radio_show'
  | 'publish_radio_episode'
  // Competition / Tournaments (مسابقات world)
  | 'enter_competition'
  | 'vote_competition_public'
  | 'score_competition_jury'
  | 'organize_tournament'        // Requires tournament_organizer capability
  | 'manage_tournament_entries'  // Requires tournament_organizer capability
  | 'publish_tournament_results' // Requires tournament_organizer capability
  // Wallet & Economy
  | 'view_own_wallet'
  | 'request_payout'
  | 'purchase_points'
  // Ads & Promotion
  | 'create_ad_campaign'
  | 'promote_content'
  // Admin / Moderation
  | 'moderate_content'
  | 'manage_admin_config'
  | 'review_payouts'
  | 'review_music_rights'
  | 'manage_users'
  // Child / Guardian
  | 'access_child_features'
  | 'manage_child_permissions';

/**
 * WorldPublishingRule — which content types can be published to each world
 * and what capability is required.
 *
 * null requiredCapability = open by default (restricted only by account status/bans).
 */
export interface WorldPublishingRule {
  worldId: WorldId;
  contentType: ContentTypeId;
  requiredCapability: CapabilityModule | null;
  note?: string;
}

export const WORLD_PUBLISHING_RULES: WorldPublishingRule[] = [
  // ── General World — open by default ──────────────────────────────────────────
  { worldId: 'general', contentType: 'audio',       requiredCapability: null, note: 'Open by default' },
  { worldId: 'general', contentType: 'video',       requiredCapability: null },
  { worldId: 'general', contentType: 'image',       requiredCapability: null },
  { worldId: 'general', contentType: 'text',        requiredCapability: null },
  { worldId: 'general', contentType: 'poll',        requiredCapability: null },
  { worldId: 'general', contentType: 'question',    requiredCapability: null },
  { worldId: 'general', contentType: 'link',        requiredCapability: null },
  { worldId: 'general', contentType: 'story',       requiredCapability: null },
  { worldId: 'general', contentType: 'liveSession', requiredCapability: null, note: 'General live rooms open by default; restricted only by account bans' },
  { worldId: 'general', contentType: 'song',        requiredCapability: 'music_creator', note: 'Music profiles can publish songs to General world' },
  { worldId: 'general', contentType: 'album',       requiredCapability: 'music_creator' },

  // ── Plus World — viewing is open to all; publishing requires plus_creator ────
  { worldId: 'plus', contentType: 'audio',          requiredCapability: 'plus_creator' },
  { worldId: 'plus', contentType: 'video',          requiredCapability: 'plus_creator' },
  { worldId: 'plus', contentType: 'image',          requiredCapability: 'plus_creator' },
  { worldId: 'plus', contentType: 'text',           requiredCapability: 'plus_creator' },
  { worldId: 'plus', contentType: 'story',          requiredCapability: 'plus_creator' },
  { worldId: 'plus', contentType: 'liveSession',    requiredCapability: 'plus_creator', note: 'Plus live rooms require Plus publishing capability' },

  // ── Music World — Music Live is event/concert-style, NOT generic chat rooms ──
  { worldId: 'music', contentType: 'song',          requiredCapability: 'music_creator' },
  { worldId: 'music', contentType: 'album',         requiredCapability: 'music_creator' },
  { worldId: 'music', contentType: 'liveSession',   requiredCapability: 'music_creator', note: 'Music Live is event/concert-style experience, not a generic live room. Requires music_creator capability.' },

  // ── Radio World — NO Sound-native live creation ───────────────────────────────
  // Radio Live tab shows current on-air broadcasts and scheduled programs through
  // the radio system. Normal live room creation is disabled in the Radio world.
  { worldId: 'radio', contentType: 'radioStation',  requiredCapability: 'radio_creator', note: 'Adding radio stations requires radio_creator capability' },
  { worldId: 'radio', contentType: 'radioShow',     requiredCapability: 'radio_creator' },
  { worldId: 'radio', contentType: 'radioEpisode',  requiredCapability: 'radio_creator' },

  // ── Tournaments World (مسابقات) ───────────────────────────────────────────────
  { worldId: 'tournaments', contentType: 'tournament',       requiredCapability: 'tournament_organizer', note: 'Creating and managing tournaments requires tournament_organizer capability' },
  { worldId: 'tournaments', contentType: 'competitionEntry', requiredCapability: null, note: 'Any user can submit an entry to an open tournament (subject to tournament eligibility rules)' },
  { worldId: 'tournaments', contentType: 'liveSession',      requiredCapability: 'tournament_organizer', note: 'Tournament broadcast/voting events require tournament_organizer capability' },
];

/** Resolved permissions for a user — computed server-side only. */
export type ResolvedPermissions = { [K in PermissionKey]: boolean };

/** Types of restrictions that override capability-based permissions. */
export type AccountRestriction =
  | 'ban_publishing' | 'ban_live' | 'ban_comments' | 'ban_following'
  | 'ban_gifts' | 'temp_block_24h' | 'temp_block_7d' | 'full_ban';

export interface ActiveRestriction {
  type: AccountRestriction;
  reason: string;
  appliedAt: string;
  expiresAt?: string;
  appliedBy: string; // Admin UID, set by Cloud Function only
}
