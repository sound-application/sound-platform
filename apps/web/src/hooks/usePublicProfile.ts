/**
 * Sound Platform — Public Profile Hook
 * =====================================
 * Phase: 5-A (Online App Shell)
 *
 * PRIVACY MODEL (Phase 4-H-2 — mandatory):
 *   ✅ Reads from:   publicProfiles/{uid}   (public projection, auth-readable)
 *   ❌ NEVER reads:  users/{uid}            (private — Firestore rules deny this)
 *
 * The publicProfiles document is built section-by-section by Cloud Functions,
 * respecting the owner's per-section privacy settings.
 * Sections absent from the document are privacy-hidden — treat as undefined.
 *
 * CF projection triggers are not yet deployed (Phase 5-A shell).
 * Until then, publicProfiles documents must be seeded manually or will be empty.
 */

import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { PublicProfileDoc } from '@sound/shared';

// ─── Hook States ──────────────────────────────────────────────────────────────

export type PublicProfileState =
  | { status: 'loading' }
  | { status: 'not-found' }
  | { status: 'error'; message: string }
  | { status: 'loaded'; profile: PublicProfileDoc };

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * usePublicProfile — subscribe to a user's public profile projection.
 *
 * @param uid - The uid of the profile to load.
 *              Pass null/undefined to skip (returns loading state).
 *
 * IMPORTANT: This reads from publicProfiles/{uid}, NEVER users/{uid}.
 */
export function usePublicProfile(uid: string | null | undefined): PublicProfileState {
  const [state, setState] = useState<PublicProfileState>({ status: 'loading' });

  useEffect(() => {
    if (!uid) {
      setState({ status: 'loading' });
      return;
    }

    // ✅ Correct path: publicProfiles (public projection)
    // ❌ Forbidden:    users (private — ruled denied for non-owner)
    const ref = doc(db, 'publicProfiles', uid);

    const unsubscribe = onSnapshot(
      ref,
      (snap) => {
        if (!snap.exists()) {
          setState({ status: 'not-found' });
          return;
        }
        setState({
          status: 'loaded',
          profile: snap.data() as PublicProfileDoc,
        });
      },
      (err) => {
        console.error('[usePublicProfile] Firestore error:', err);
        setState({ status: 'error', message: err.message });
      },
    );

    return unsubscribe;
  }, [uid]);

  return state;
}
