/**
 * Sound Platform — Playlist Schema
 * ==================================
 * Phase:   8-I (Playlist Foundation)
 * Created: 2026-05-29
 *
 * Collections:
 *   playlists/{playlistId}                          — main playlist document
 *   playlists/{playlistId}/items/{contentId}         — playlist items subcollection
 *   users/{uid}/playlistRefs/{playlistId}            — denormalized ref for fast owner queries
 *
 * All writes go through backend callables for atomicity / consistency.
 */

import type { WorldId } from './permissions';
import type { OwnerSnapshot } from './content';

// ─── Playlist Visibility ─────────────────────────────────────────────────────
//
// Controls who can see the playlist:
//   public    — any authenticated user
//   followers — owner's followers (deferred — treated as onlyMe for now)
//   friends   — mutual follows (deferred — treated as onlyMe for now)
//   onlyMe    — owner only
//
export type PlaylistVisibility = 'public' | 'followers' | 'friends' | 'onlyMe';

// ─── Playlist Source ─────────────────────────────────────────────────────────
//
// How the playlist was created:
//   manual       — standalone creation
//   audioPublish — created during audio publish flow
//   auto         — system-generated (e.g., "all content" default)
//
export type PlaylistSource = 'manual' | 'audioPublish' | 'auto';

// ─── Playlist Status ─────────────────────────────────────────────────────────

export type PlaylistStatus = 'active' | 'archived';

// ─── Cover Asset ─────────────────────────────────────────────────────────────

export interface PlaylistCoverAsset {
  storagePath: string;
  url?: string;
  mimeType?: string;
}

// ─── Playlist Document ───────────────────────────────────────────────────────
//
// Stored in: playlists/{playlistId}
//
export interface PlaylistDoc {
  /** Document ID (matches Firestore doc ID) */
  playlistId: string;

  /** Firebase UID of the playlist owner */
  ownerUid: string;

  /** Denormalized owner info for display */
  ownerSnapshot: OwnerSnapshot;

  /** Playlist title */
  title: string;

  /** Optional description */
  description?: string;

  /** Optional cover image */
  coverAsset?: PlaylistCoverAsset;

  /** Visibility level */
  visibility: PlaylistVisibility;

  /** How this playlist was created */
  source: PlaylistSource;

  /** Target world (optional, for world-scoped browsing) */
  world?: WorldId;

  /** Category ID */
  category?: string;

  /** Subcategory ID */
  subcategoryId?: string;

  /** Subcategory label snapshot */
  subcategoryLabel?: string;

  /** User-defined tags */
  tags?: string[];

  // ── Computed / Server-managed ──────────────────────────────────────────────

  /** Number of items in the playlist (server-managed) */
  itemCount: number;

  /** Total duration of all items in ms (server-updated) */
  totalDurationMs?: number;

  /** First 4 content IDs for cover collage rendering */
  firstItemIds?: string[];

  /** ISO timestamp — when the playlist was created */
  createdAt: string;

  /** ISO timestamp — last update to playlist metadata */
  updatedAt: string;

  /** ISO timestamp — last time an item was added */
  lastItemAddedAt?: string;

  /** Active or archived */
  status: PlaylistStatus;
}

// ─── Playlist Item Document ──────────────────────────────────────────────────
//
// Stored in: playlists/{playlistId}/items/{contentId}
//
export interface PlaylistItemContentSnapshot {
  title: string;
  ownerUid: string;
  ownerDisplayName?: string;
  coverPath?: string;
  durationMs?: number;
  kind?: string;
  world?: WorldId;
}

export interface PlaylistItemDoc {
  /** Parent playlist ID */
  playlistId: string;

  /** Content item ID (also used as the document ID) */
  contentId: string;

  /** Owner of the playlist (for rule checks) */
  ownerUid: string;

  /** UID of the user who added this item */
  addedByUid: string;

  /** ISO timestamp — when the item was added */
  addedAt: string;

  /** Sort order for manual ordering */
  sortOrder: number;

  /** Denormalized content snapshot for list rendering */
  contentSnapshot: PlaylistItemContentSnapshot;
}

// ─── Playlist Ref (Denormalized) ─────────────────────────────────────────────
//
// Stored in: users/{uid}/playlistRefs/{playlistId}
// Used for fast "get my playlists" queries without scanning all playlists.
//
export interface PlaylistRefDoc {
  playlistId: string;
  title: string;
  visibility: PlaylistVisibility;
  itemCount: number;
  createdAt: string;
  updatedAt: string;
}

// ─── Request / Response Types ────────────────────────────────────────────────

export interface CreatePlaylistRequest {
  title: string;
  description?: string;
  visibility?: PlaylistVisibility;
  world?: WorldId;
  tags?: string[];
  source?: PlaylistSource;
}

export interface CreatePlaylistResponse {
  playlistId: string;
}

export interface UpdatePlaylistRequest {
  playlistId: string;
  title?: string;
  description?: string;
  visibility?: PlaylistVisibility;
  tags?: string[];
}

export interface UpdatePlaylistResponse {
  success: boolean;
}

export interface AddToPlaylistRequest {
  playlistId: string;
  contentId: string;
}

export interface AddToPlaylistResponse {
  added: boolean;
}

export interface RemoveFromPlaylistRequest {
  playlistId: string;
  contentId: string;
}

export interface RemoveFromPlaylistResponse {
  removed: boolean;
}

export interface GetUserPlaylistsRequest {
  /** No fields needed — uses auth context */
}

export interface GetUserPlaylistsResponse {
  playlists: PlaylistDoc[];
}
