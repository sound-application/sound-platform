import i18n from '../i18n';
const tWrapper = (key: any, options?: any) => i18n.t(key, options) as any as string;
/**
 * Sound Platform — useFollowState hook
 * ========================================
 * Phase:   6-B (Social Graph Foundation)
 * Updated: 2026-05-25
 *
 * Watches follows/{currentUid}/following/{targetUid} and provides:
 *   - isFollowing: boolean — whether currentUid follows targetUid
 *   - isLoading:  boolean — initial load is pending
 *   - isSaving:   boolean — a follow/unfollow write is in flight
 *   - error:      string | null — last write error message
 *   - toggle():   toggles follow/unfollow
 *
 * RULES:
 *   - Returns a no-op if currentUid == targetUid (self-follow guard).
 *   - Returns a no-op if either uid is null/undefined.
 *   - Does not build the follower count locally — the Cloud Function handles that.
 *
 * REACT NATIVE NOTE:
 *   This hook uses firebase/firestore (Modular SDK) which is compatible with
 *   React Native via @react-native-firebase or firebase JS SDK in RN.
 *   WEB ONLY: onSnapshot from firebase/firestore works in both web and RN.
 */

import { useEffect, useState, useCallback } from 'react';
import {
  doc,
  onSnapshot,
  setDoc,
  deleteDoc,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { FollowEdge } from '@sound/shared';

// ─── Types ────────────────────────────────────────────────────────────────────

export type FollowState = {
  /** true if currentUid follows targetUid */
  isFollowing: boolean;
  /** true while waiting for the first Firestore snapshot */
  isLoading: boolean;
  /** true while a follow/unfollow write is in flight */
  isSaving: boolean;
  /** last error message from a failed write, or null */
  error: string | null;
  /** toggle follow/unfollow — idempotent */
  toggle: () => Promise<void>;
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * useFollowState(currentUid, targetUid)
 *
 * @param currentUid  The currently signed-in user's uid (null = not authed)
 * @param targetUid   The profile being viewed (null = unknown)
 */
export function useFollowState(
  currentUid: string | null | undefined,
  targetUid:  string | null | undefined,
): FollowState {
  const [isFollowing, setIsFollowing] = useState(false);
  const [isLoading,   setIsLoading]   = useState(true);
  const [isSaving,    setIsSaving]    = useState(false);
  const [error,       setError]       = useState<string | null>(null);

  // ── Self-follow / null guard ─────────────────────────────────────────────
  const valid = Boolean(currentUid && targetUid && currentUid !== targetUid);

  // ── Real-time follow state from Firestore ─────────────────────────────────
  useEffect(() => {
    if (!valid || !currentUid || !targetUid) {
      setIsFollowing(false);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    const ref = doc(db, 'follows', currentUid, 'following', targetUid);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        setIsFollowing(snap.exists());
        setIsLoading(false);
      },
      (err) => {
        console.error('[useFollowState] Firestore snapshot error:', err);
        // Don't surface the read error in the UI — just assume not following
        setIsFollowing(false);
        setIsLoading(false);
      },
    );

    return unsub;
  }, [currentUid, targetUid, valid]);

  // ── toggle() ──────────────────────────────────────────────────────────────
  const toggle = useCallback(async () => {
    if (!valid || !currentUid || !targetUid) return;
    if (isSaving) return; // debounce concurrent clicks

    setIsSaving(true);
    setError(null);

    const ref = doc(db, 'follows', currentUid, 'following', targetUid);

    try {
      if (isFollowing) {
        // Unfollow — delete the edge document
        await deleteDoc(ref);
      } else {
        // Follow — create the edge document
        const edge: FollowEdge = {
          sourceUid: currentUid,
          targetUid,
          createdAt: new Date().toISOString(),
        };
        await setDoc(ref, edge);
      }
      // Optimistic update is not needed — onSnapshot will update isFollowing
    } catch (err: unknown) {
      console.error('[useFollowState] toggle error:', err);
      const msg = err instanceof Error ? err.message : tWrapper('usefollowstate:anErrorOccurredWhile');
      setError(msg);
    } finally {
      setIsSaving(false);
    }
  }, [currentUid, targetUid, valid, isFollowing, isSaving]);

  // ── No-op result if not valid ────────────────────────────────────────────
  if (!valid) {
    return {
      isFollowing: false,
      isLoading: false,
      isSaving: false,
      error: null,
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      toggle: async () => {},
    };
  }

  return { isFollowing, isLoading, isSaving, error, toggle };
}
