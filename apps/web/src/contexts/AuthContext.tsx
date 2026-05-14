/**
 * Sound Platform — Auth Context
 * ==============================
 * Phase: 5-A (Online App Shell)
 *
 * Provides the current Firebase Auth user to the React tree.
 * Three states: loading → signed-out → signed-in.
 *
 * The raw Firebase User object is stored. The app MUST NOT
 * attempt to read users/{uid} for public profile UI — use
 * publicProfiles/{uid} via usePublicProfile() instead.
 */

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
} from 'react';
import type { User } from 'firebase/auth';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../lib/firebase';

// ─── Types ────────────────────────────────────────────────────────────────────

export type AuthState =
  | { status: 'loading' }
  | { status: 'signed-out' }
  | { status: 'signed-in'; user: User };

interface AuthContextValue {
  authState: AuthState;
  /** Convenience: current user or null */
  currentUser: User | null;
  /** True while Firebase is resolving the session */
  isLoading: boolean;
  /** True once signed in */
  isSignedIn: boolean;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>({ status: 'loading' });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setAuthState({ status: 'signed-in', user });
      } else {
        setAuthState({ status: 'signed-out' });
      }
    });
    return unsubscribe;
  }, []);

  const value: AuthContextValue = {
    authState,
    currentUser: authState.status === 'signed-in' ? authState.user : null,
    isLoading:   authState.status === 'loading',
    isSignedIn:  authState.status === 'signed-in',
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}
