/**
 * Sound Platform — Viewer-Aware Profile Resolver Types
 * ======================================================
 * Phase:   7 (Viewer-Aware Privacy Resolver)
 * Updated: 2026-05-25
 *
 * These types define the contract between the getProfileForViewer
 * Cloud Function callable and the ProfilePage client.
 *
 * DESIGN PRINCIPLES:
 *   1. The response contains NO raw privacySettings document.
 *   2. The response contains NO raw users/{uid} private fields.
 *   3. The profile field is a filtered PublicProfileDoc — sections
 *      absent when the viewer is not entitled to see them.
 *   4. viewerState carries the derived social relationship facts
 *      so the client can correctly render follow/block/mute states.
 *   5. hiddenSections is optional debug info (stripped in prod if desired).
 *
 * REACT NATIVE NOTE:
 *   These types have no web-only dependencies.
 *   The callable is invoked via firebase/functions httpsCallable —
 *   compatible with @react-native-firebase/functions in RN.
 */

import type { PublicProfileDoc } from './profile';

// ─── Request ──────────────────────────────────────────────────────────────────

/**
 * GetProfileForViewerRequest — the input data passed to the callable.
 *
 * Only targetUid is required. viewerUid is inferred from request.auth.uid
 * by the Cloud Function — the client MUST NOT pass viewerUid.
 */
export interface GetProfileForViewerRequest {
  /** UID of the profile to load and filter for the caller */
  targetUid: string;
}

// ─── Viewer State ─────────────────────────────────────────────────────────────

/**
 * ViewerState — the social relationship between the viewer and the target.
 *
 * Computed by the Cloud Function using the social graph collections.
 * The client uses this to render the follow button, message button,
 * block/mute state, and any viewer-specific UI signals.
 *
 * PHASE 7 enforcement:
 *   - isSelf:              always accurate (viewerUid === targetUid)
 *   - isFollower:          follows/{viewerUid}/following/{targetUid} exists
 *   - isMutual:            isFollower AND target follows viewer back
 *   - targetBlockedViewer: blocks/{targetUid}/blocked/{viewerUid} exists
 *   - viewerBlockedTarget: blocks/{viewerUid}/blocked/{targetUid} exists
 *
 * PHASE 9 (future — not implemented here):
 *   - isInCustomList:      viewer is in a custom audience list of the target
 */
export interface ViewerState {
  /** true if viewerUid === targetUid */
  isSelf: boolean;
  /**
   * true if viewerUid follows targetUid.
   * Source: follows/{viewerUid}/following/{targetUid} doc exists.
   */
  isFollower: boolean;
  /**
   * true if both users follow each other (mutual follow).
   * Source: isFollower AND follows/{targetUid}/following/{viewerUid} exists.
   * Used to gate 'friends' audience.
   */
  isMutual: boolean;
  /**
   * true if the target has blocked the viewer.
   * Source: blocks/{targetUid}/blocked/{viewerUid} exists.
   * When true, the response profile is minimal (blocked profile stub).
   */
  targetBlockedViewer: boolean;
  /**
   * true if the viewer has blocked the target.
   * Source: blocks/{viewerUid}/blocked/{targetUid} exists.
   * When true, the response includes a limited stub with block state flagged.
   */
  viewerBlockedTarget: boolean;
}

// ─── Response ─────────────────────────────────────────────────────────────────

/**
 * GetProfileForViewerResponse — the data returned by the callable.
 *
 * profile: A filtered PublicProfileDoc.
 *   - All sections are viewer-filtered.
 *   - Sections the viewer cannot see are ABSENT (undefined).
 *   - No raw privacySettings. No raw users/{uid} private fields.
 *
 * viewerState: The derived social relationship facts.
 *   - Client uses these to render the correct follow/block state.
 *
 * hiddenSections: Optional list of section keys hidden from the viewer.
 *   - Useful for debugging audience enforcement.
 *   - May be stripped from production responses if desired.
 *   - NEVER includes the reason (audience value) — just the key.
 *
 * isBlocked: Convenience flag — true if targetBlockedViewer.
 *   - When true, profile contains only the minimal blocked stub.
 *   - Client should show a "This account is not available" state.
 */
export interface GetProfileForViewerResponse {
  /** Viewer-filtered profile data */
  profile: PublicProfileDoc;
  /** Social relationship state between viewer and target */
  viewerState: ViewerState;
  /**
   * Section keys hidden from the viewer due to privacy settings.
   * Present only when at least one section was hidden.
   * Debug-only in Phase 7 — may be removed in Phase 8+.
   */
  hiddenSections?: string[];
  /**
   * true if the target has blocked the viewer.
   * When true, profile is a minimal stub (displayName, uid, isBlocked=true).
   */
  isBlocked: boolean;
}

// ─── Blocked Profile Stub ────────────────────────────────────────────────────

/**
 * blockedProfileStub — the minimal profile returned when a viewer is blocked.
 *
 * Returns only the target's uid. Everything else is stripped.
 * The client renders a "This account is not available" / "محظور" state.
 *
 * Why uid only?
 *   Even the displayName could be used to confirm the identity of the blocker.
 *   We return uid so the client can at least render a consistent empty state
 *   without leaking any personal information about the blocking user.
 */
export function makeBlockedProfileStub(targetUid: string): PublicProfileDoc {
  return {
    uid: targetUid,
    // generalProfile is required by the type but we use a minimal placeholder
    generalProfile: {
      username:              '',
      displayName:           '',
      avatarUrl:             undefined,
      coverUrl:              undefined,
      isVerified:            false,
      bio:                   undefined,
      location:              undefined,
      websiteUrl:            undefined,
      socialLinks:           {},
      followersCount:        0,
      followingCount:        0,
      postsCount:            0,
      listensCount:          0,
      joinedAt:              '',
      badges:                [],
      isPlusCreator:         false,
      isMusicCreator:        false,
      isRadioCreator:        false,
      isTournamentsCreator:  false,
      // Viewer-relative computed flag
      isBlocked:             true,
    },
    lastUpdatedAt: new Date().toISOString(),
  };
}
