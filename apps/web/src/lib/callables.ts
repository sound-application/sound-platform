/**
 * Sound Platform — Typed Firebase Callable Wrappers
 * ==================================================
 * Phase:   8-B (Audio Recording + Upload + Storage Attachment)
 * Updated: 2026-05-27
 *
 * Centralized callable wrappers using the existing pattern from useViewerProfile.
 * Each callable is typed with its Request/Response from @sound/shared.
 *
 * Region: us-central1 (must match deployed Cloud Functions).
 */

import { getFunctions, httpsCallable } from 'firebase/functions';
import type {
  CreateAudioDraftRequest,
  CreateAudioDraftResponse,
  UpdateAudioDraftRequest,
  UpdateAudioDraftResponse,
  PublishAudioContentRequest,
  PublishAudioContentResponse,
  GetAudioPlaybackUrlRequest,
  GetAudioPlaybackUrlResponse,
  CreatePlaylistRequest,
  CreatePlaylistResponse,
  UpdatePlaylistRequest,
  UpdatePlaylistResponse,
  AddToPlaylistRequest,
  AddToPlaylistResponse,
  RemoveFromPlaylistRequest,
  RemoveFromPlaylistResponse,
  GetUserPlaylistsRequest,
  GetUserPlaylistsResponse,
  RenderDraftPreviewRequest,
  RenderDraftPreviewResponse,
} from '@sound/shared';
import app from './firebase';

// ── Functions instance (us-central1 to match deployed region) ────────────────
const functions = getFunctions(app, 'us-central1');

// ── Audio Draft Callables ────────────────────────────────────────────────────

export const callCreateAudioDraft = httpsCallable<
  CreateAudioDraftRequest,
  CreateAudioDraftResponse
>(functions, 'createAudioDraft');

export const callUpdateAudioDraft = httpsCallable<
  UpdateAudioDraftRequest,
  UpdateAudioDraftResponse
>(functions, 'updateAudioDraft');

export const callPublishAudioContent = httpsCallable<
  PublishAudioContentRequest,
  PublishAudioContentResponse
>(functions, 'publishAudioContent');

// ── Audio Playback Callables (Phase 8-D) ─────────────────────────────────────

export const callGetAudioPlaybackUrl = httpsCallable<
  GetAudioPlaybackUrlRequest,
  GetAudioPlaybackUrlResponse
>(functions, 'getAudioPlaybackUrl');

// ── Playlist Callables (Phase 8-I) ───────────────────────────────────────────

export const callCreatePlaylist = httpsCallable<
  CreatePlaylistRequest,
  CreatePlaylistResponse
>(functions, 'createPlaylist');

export const callUpdatePlaylist = httpsCallable<
  UpdatePlaylistRequest,
  UpdatePlaylistResponse
>(functions, 'updatePlaylist');

export const callAddToPlaylist = httpsCallable<
  AddToPlaylistRequest,
  AddToPlaylistResponse
>(functions, 'addToPlaylist');

export const callRemoveFromPlaylist = httpsCallable<
  RemoveFromPlaylistRequest,
  RemoveFromPlaylistResponse
>(functions, 'removeFromPlaylist');

export const callGetUserPlaylists = httpsCallable<
  GetUserPlaylistsRequest,
  GetUserPlaylistsResponse
>(functions, 'getUserPlaylists');

// ── Draft Render Pipeline Callables (Phase 8-L.1) ───────────────────────────

export const callRenderDraftPreview = httpsCallable<
  RenderDraftPreviewRequest,
  RenderDraftPreviewResponse
>(functions, 'renderAudioDraftPreview', { timeout: 300000 });

