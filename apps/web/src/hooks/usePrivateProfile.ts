/**
 * Sound Platform — usePrivateProfile Hook
 * ==========================================
 * Phase:   5-C-1 (Live Profile Editing)
 * Updated: 2026-05-14
 *
 * PRIVACY RULES (Phase 4-H-2 — MANDATORY):
 *   ✅ Reads from:  users/{currentUser.uid}  — owner is allowed by Firestore rules
 *   ❌ NEVER reads: users/{otherUid}         — denied by Firestore rules
 *   ❌ NEVER used:  for public profile rendering → use usePublicProfile instead
 *
 * This hook is ONLY for the authenticated owner reading their own private doc.
 * It must NEVER be called with another user's uid.
 *
 * Used by: EditProfilePage (owner edits own profile fields)
 * NOT used by: ProfilePage, any public rendering, any other user lookup
 */

import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { UserPrivateDoc } from '@sound/shared';

// ─── Hook States ──────────────────────────────────────────────────────────────

export type PrivateProfileState =
  | { status: 'loading' }
  | { status: 'not-found' }
  | { status: 'error'; message: string }
  | { status: 'loaded'; data: UserPrivateDoc };

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * usePrivateProfile — subscribe to the current owner's own private doc.
 *
 * @param uid - The CURRENT user's own uid. NEVER another user's uid.
 *              Pass null/undefined to skip (returns loading state).
 *
 * IMPORTANT:
 *   - This reads users/{uid} which is only allowed for the document owner.
 *   - If called with another user's uid, Firestore rules will reject it.
 *   - This hook must only be mounted inside owner-authenticated contexts.
 */
export function usePrivateProfile(uid: string | null | undefined): PrivateProfileState {
  const [state, setState] = useState<PrivateProfileState>({ status: 'loading' });

  useEffect(() => {
    if (!uid) {
      setState({ status: 'loading' });
      return;
    }

    // ✅ Owner reading own private document — allowed by Firestore rules
    // ❌ This path is DENIED for any other uid (Firestore rules enforce this)
    const ref = doc(db, 'users', uid);

    const unsubscribe = onSnapshot(
      ref,
      (snap) => {
        if (!snap.exists()) {
          setState({ status: 'not-found' });
          return;
        }
        setState({
          status: 'loaded',
          data: snap.data() as UserPrivateDoc,
        });
      },
      (err) => {
        console.error('[usePrivateProfile] Firestore error:', err);
        setState({ status: 'error', message: err.message });
      },
    );

    return unsubscribe;
  }, [uid]);

  return state;
}
