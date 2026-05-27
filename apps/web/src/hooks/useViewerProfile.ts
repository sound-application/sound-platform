/**
 * Sound Platform — useViewerProfile hook
 * ==========================================
 * Phase:   7.1 (Username-Aware Profile Links)
 * Updated: 2026-05-27
 *
 * Calls the getProfileForViewer Cloud Function callable.
 * Returns a viewer-filtered profile and the viewer's social state
 * (isFollower, isMutual, targetBlockedViewer, viewerBlockedTarget).
 *
 * Used by ProfilePage for all non-self profile views.
 * Self-view continues to use usePublicProfile (onSnapshot, real-time).
 *
 * Phase 7.1: accepts targetKey which may be a Firebase UID or a username.
 * The callable resolves the key server-side (see getProfileForViewer).
 *
 * WHY NOT REAL-TIME (onSnapshot)?
 *   Viewer-aware filtering cannot be done with client-side onSnapshot because:
 *   1. The client cannot read privacySettings/{uid} (rules deny non-owner reads).
 *   2. Audience enforcement requires server-side social graph checks.
 *   The callable runs server-side with Admin SDK access to all required collections.
 *   A real-time update can be added in Phase 8+ if needed (e.g., Firestore onCall
 *   with polling or a push notification trigger).
 *
 * CACHE POLICY:
 *   Loads once per mount or targetKey change.
 *   Re-fetches when targetKey changes (navigation between profiles).
 *   Does NOT re-fetch when the viewer's follow state changes — ProfilePage
 *   must call refetch() after follow/unfollow to update the visible sections.
 *
 * REACT NATIVE NOTE:
 *   httpsCallable is compatible with @react-native-firebase/functions.
 *   Only the import path changes: from 'firebase/functions' → from '@react-native-firebase/functions'.
 *   The hook logic is portable.
 */

import { useState, useEffect, useCallback } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import type {
  GetProfileForViewerRequest,
  GetProfileForViewerResponse,
} from '@sound/shared';
import app from '../lib/firebase';

// ─── Hook State ────────────────────────────────────────────────────────────────

export type ViewerProfileState =
  | { status: 'loading' }
  | { status: 'blocked'; targetKey: string }
  | { status: 'not-found' }
  | { status: 'error'; message: string }
  | { status: 'loaded'; result: GetProfileForViewerResponse };

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * useViewerProfile(targetKey)
 *
 * Calls getProfileForViewer callable and returns the viewer-filtered result.
 *
 * @param targetKey - The profile key (UID or username). Pass null to skip.
 * @returns ViewerProfileState + refetch() function.
 *
 * refetch() — re-calls the callable. Use after a follow/unfollow action
 * to update the visible sections for newly gated content.
 */
export function useViewerProfile(
  targetKey: string | null | undefined,
): ViewerProfileState & { refetch: () => void } {
  const [state, setState] = useState<ViewerProfileState>({ status: 'loading' });
  const [version, setVersion] = useState(0);

  // refetch — increments version to trigger a re-fetch
  const refetch = useCallback(() => setVersion((v) => v + 1), []);

  useEffect(() => {
    if (!targetKey) {
      setState({ status: 'loading' });
      return;
    }

    let cancelled = false;
    setState({ status: 'loading' });

    const functions = getFunctions(app, 'us-central1');
    const callable  = httpsCallable<GetProfileForViewerRequest, GetProfileForViewerResponse>(
      functions,
      'getProfileForViewer',
    );

    callable({ targetKey })
      .then((result) => {
        if (cancelled) return;
        const data = result.data;

        if (data.isBlocked) {
          setState({ status: 'blocked', targetKey });
          return;
        }

        if (!data.profile?.generalProfile) {
          setState({ status: 'not-found' });
          return;
        }

        setState({ status: 'loaded', result: data });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const code    = (err as { code?: string }).code;
        const message = (err as { message?: string }).message ?? 'حدث خطأ غير متوقع';

        if (code === 'functions/not-found') {
          setState({ status: 'not-found' });
          return;
        }

        console.error('[useViewerProfile] callable error:', err);
        setState({ status: 'error', message });
      });

    return () => { cancelled = true; };
  }, [targetKey, version]);

  return { ...state, refetch };
}

