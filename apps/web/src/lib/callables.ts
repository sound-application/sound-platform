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
