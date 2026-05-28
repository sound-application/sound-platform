/**
 * Sound Platform — Audio Content Helpers
 * ========================================
 * Phase:   8-A (Audio Content Core Foundation)
 * Updated: 2026-05-27
 *
 * Small, testable validation and factory helpers for the audio content module.
 * Used by:
 *   - Cloud Functions (createAudioDraft, updateAudioDraft, publishAudioContent)
 *   - Client-side pre-validation (optional — server is always authoritative)
 *
 * IMPORTANT: All permission checks are authoritative SERVER-SIDE ONLY.
 *   These helpers express the rules; Cloud Functions enforce them.
 */

import type { WorldId, CapabilityModule } from './permissions';
import type {
  AudioContentKind,
  AudioContentDoc,
  AudioDraftDoc,
  OwnerSnapshot,
} from './content';

// ─── World × Kind Validation ─────────────────────────────────────────────────

/**
 * VALID_WORLD_KINDS — defines which AudioContentKind values are valid
 * for each world.
 *
 * Rules from SRS + UI Authority:
 *   general:     longAudio, podcast, shortAudio (open publishing)
 *   plus:        longAudio, podcast, shortAudio (requires plus_creator)
 *   music:       song, albumTrack (requires music_creator)
 *   radio:       radioMoment (station system only — NOT normal publishing)
 *   tournaments: tournamentSubmissionAudio (competition flow, not normal publishing)
 */
export const VALID_WORLD_KINDS: Record<WorldId, AudioContentKind[]> = {
  general:     ['longAudio', 'podcast', 'shortAudio'],
  plus:        ['longAudio', 'podcast', 'shortAudio'],
  music:       ['song', 'albumTrack'],
  radio:       ['radioMoment'],
  tournaments: ['tournamentSubmissionAudio'],
};

/**
 * validateAudioWorldKind — checks if the given kind is valid for the given world.
 *
 * @param world - Target world ID
 * @param kind  - Audio content kind
 * @returns true if the combination is valid
 */
export function validateAudioWorldKind(
  world: WorldId,
  kind: AudioContentKind,
): boolean {
  const allowedKinds = VALID_WORLD_KINDS[world];
  if (!allowedKinds) return false;
  return allowedKinds.includes(kind);
}

// ─── Publishing Permission Check ─────────────────────────────────────────────

/**
 * WORLD_REQUIRED_CAPABILITY — maps each world to the capability required
 * to publish audio content into it.
 *
 * null = open publishing (no special capability needed, only account-level restrictions).
 *
 * Radio and tournaments have special rules:
 *   - Radio:       radioMoment requires radio_creator (station system only).
 *                  Normal publishing to radio is BLOCKED — no user can upload
 *                  arbitrary audio to the radio world.
 *   - Tournaments: tournamentSubmissionAudio is open for registered participants,
 *                  but tournament MANAGEMENT requires tournament_organizer.
 *                  Phase 8-A treats submissions as open (null capability).
 */
export const WORLD_REQUIRED_CAPABILITY: Record<WorldId, CapabilityModule | null> = {
  general:     null,
  plus:        'plus_creator',
  music:       'music_creator',
  radio:       'radio_creator',
  tournaments: null, // submissions are open; organizer gating is separate
};

export interface PublishCheckResult {
  allowed: boolean;
  reason?: string;
}

/**
 * canPublishAudioKindToWorld — checks if a user with the given capabilities
 * is allowed to publish a specific kind to a specific world.
 *
 * @param world        - Target world
 * @param kind         - Audio content kind
 * @param capabilities - User's capability map (from users/{uid}.capabilities)
 * @returns PublishCheckResult with allowed flag and optional reason
 */
export function canPublishAudioKindToWorld(
  world: WorldId,
  kind: AudioContentKind,
  capabilities?: Record<string, boolean> | null,
): PublishCheckResult {
  // 1. Check world/kind combination is valid
  if (!validateAudioWorldKind(world, kind)) {
    return {
      allowed: false,
      reason: `Audio kind "${kind}" is not valid for world "${world}".`,
    };
  }

  // 2. Check capability requirement
  const requiredCapability = WORLD_REQUIRED_CAPABILITY[world];

  if (requiredCapability === null) {
    // Open publishing — no capability needed
    return { allowed: true };
  }

  // Check if user has the required capability
  const hasCapability = capabilities?.[requiredCapability] === true;

  if (!hasCapability) {
    return {
      allowed: false,
      reason: `Publishing "${kind}" to "${world}" requires the "${requiredCapability}" capability.`,
    };
  }

  return { allowed: true };
}

// ─── Draft Factory ───────────────────────────────────────────────────────────

/**
 * createEmptyAudioDraft — factory for a blank draft with timestamps set.
 *
 * Used by the createAudioDraft callable to initialize a new draft document.
 * All content fields start empty/undefined; the user fills them through
 * the creation wizard.
 *
 * @param ownerUid - Firebase UID of the draft owner
 * @param draftId  - Server-generated document ID
 * @param now      - ISO timestamp string
 * @returns AudioDraftDoc ready to write to drafts/{uid}/drafts/{draftId}
 */
export function createEmptyAudioDraft(
  ownerUid: string,
  draftId: string,
  now: string,
): AudioDraftDoc {
  return {
    draftId,
    ownerUid,
    status: 'draft',
    createdAt: now,
    updatedAt: now,
    lastSavedAt: now,
  };
}

// ─── Draft → Content Conversion ──────────────────────────────────────────────

/**
 * createAudioContentFromDraft — converts a completed draft into a publishable
 * AudioContentDoc.
 *
 * Used by the publishAudioContent callable.
 *
 * @param draft     - The completed draft document
 * @param owner     - Denormalized owner snapshot from publicProfiles
 * @param contentId - Server-generated content document ID
 * @param now       - ISO timestamp string
 * @returns AudioContentDoc ready to write to contentItems/{contentId}
 *
 * @throws Error if required fields (title, world, kind) are missing
 */
export function createAudioContentFromDraft(
  draft: AudioDraftDoc,
  owner: OwnerSnapshot,
  contentId: string,
  now: string,
): AudioContentDoc {
  if (!draft.title) {
    throw new Error('Draft title is required for publishing.');
  }
  if (!draft.world) {
    throw new Error('Draft world is required for publishing.');
  }
  if (!draft.kind) {
    throw new Error('Draft kind is required for publishing.');
  }

  return {
    id: contentId,
    ownerUid: draft.ownerUid,
    owner,

    world: draft.world,
    kind: draft.kind,

    title: draft.title,
    caption: draft.caption,
    description: draft.description,

    categoryId: draft.categoryId,
    categoryLabel: draft.categoryLabel,
    subcategoryId: draft.subcategoryId,
    subcategoryLabel: draft.subcategoryLabel,
    countryMode: draft.countryMode,
    countryCodes: draft.countryCodes,
    countryCode: draft.countryCode,
    countryLabel: draft.countryLabel,
    language: draft.language,
    tags: draft.tags ?? [],

    audience: draft.audience ?? 'public',
    status: 'published',
    moderationStatus: 'pending',
    isExplicit: draft.isExplicit ?? false,
    ageSuitability: draft.ageSuitability,
    publishToggles: draft.publishToggles,
    coverAsset: draft.coverAsset,
    captionsSetup: draft.captionsSetup,
    autoCue: draft.autoCue,

    // Phase 8-D.2 fields
    isChildContent: draft.isChildContent,
    placementFeed: draft.placementFeed,
    playlistIntent: draft.playlistIntent,
    playlistId: draft.playlistId,
    newPlaylistName: draft.newPlaylistName,

    // Audio asset — copied from draft (attached during recording/upload)
    audioAsset: draft.audioAsset,

    // All counters start at zero
    listensCount: 0,
    likesCount: 0,
    savesCount: 0,
    repostsCount: 0,
    commentsCount: 0,
    sharesCount: 0,

    createdAt: now,
    updatedAt: now,
    publishedAt: now,
  };
}

// ─── Metadata Normalizer ─────────────────────────────────────────────────────

/**
 * normalizeAudioMetadata — ensures all counter fields default to 0,
 * tags defaults to [], and timestamps are valid.
 *
 * Used when reading documents from Firestore that may have missing fields
 * due to schema evolution.
 *
 * @param doc - Partial AudioContentDoc from Firestore
 * @returns AudioContentDoc with all required fields normalized
 */
export function normalizeAudioMetadata(
  doc: Partial<AudioContentDoc> & { id: string; ownerUid: string },
): AudioContentDoc {
  return {
    ...doc,
    owner: doc.owner ?? { ownerUsername: '', ownerDisplayName: '' },
    world: doc.world ?? 'general',
    kind: doc.kind ?? 'longAudio',
    title: doc.title ?? '',
    tags: doc.tags ?? [],
    audience: doc.audience ?? 'public',
    status: doc.status ?? 'draft',
    moderationStatus: doc.moderationStatus ?? 'pending',
    isExplicit: doc.isExplicit ?? false,
    listensCount: doc.listensCount ?? 0,
    likesCount: doc.likesCount ?? 0,
    savesCount: doc.savesCount ?? 0,
    repostsCount: doc.repostsCount ?? 0,
    commentsCount: doc.commentsCount ?? 0,
    sharesCount: doc.sharesCount ?? 0,
    createdAt: doc.createdAt ?? new Date().toISOString(),
    updatedAt: doc.updatedAt ?? new Date().toISOString(),
  } as AudioContentDoc;
}
