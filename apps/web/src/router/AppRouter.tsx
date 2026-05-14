/**
 * Sound Platform — App Routes
 * ============================
 * Phase: 5-A (Online App Shell)
 *
 * Route definitions for the main app shell.
 * All routes are lazy-importable as pages grow.
 *
 * WORLDS (navigation context):
 *   /              → Home feed (cross-world aggregated)
 *   /discover      → Discover (cross-world)
 *   /live          → Live sessions (any world, auth read)
 *   /profile/:uid  → Public profile (reads publicProfiles/{uid} ONLY)
 *   /me            → Own profile (reads own publicProfiles/{uid})
 *   /settings      → Settings (reads own users/{uid} — owner allowed)
 *   /create        → Create entry point (shell only — no live CF yet)
 *
 * WORLD ROUTING:
 *   /world/general → General world feed
 *   /world/plus    → Plus world feed
 *   /world/music   → Music world feed
 *   /world/radio   → Radio world feed
 *
 * AUTH:
 *   /login         → Login page
 *   /signup        → Sign-up page
 */

import React, { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { AppLayout } from '../layouts/AppLayout';
import { LoadingScreen } from '../components/LoadingScreen';

// ─── Page imports (inline for now — lazy as app grows) ───────────────────────
import { HomePage }          from '../pages/HomePage';
import { DiscoverPage }      from '../pages/DiscoverPage';
import { LivePage }          from '../pages/LivePage';
import { ProfilePage }       from '../pages/ProfilePage';
import { CreatePage }        from '../pages/CreatePage';
import { SettingsPage }      from '../pages/SettingsPage';
import { EditProfilePage }      from '../pages/EditProfilePage';
import { PrivacySettingsPage }  from '../pages/PrivacySettingsPage';
import { WorldPage }         from '../pages/WorldPage';
import { LoginPage }         from '../pages/LoginPage';
import { SignUpPage }        from '../pages/SignUpPage';
import { NotFoundPage }      from '../pages/NotFoundPage';

// ─── Protected Route ─────────────────────────────────────────────────────────

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { authState } = useAuth();
  if (authState.status === 'loading') return <LoadingScreen message="جاري التحقق من الجلسة..." />;
  if (authState.status === 'signed-out') return <Navigate to="/login" replace />;
  return <>{children}</>;
}

// ─── Router ──────────────────────────────────────────────────────────────────

export function AppRouter() {
  const { authState } = useAuth();

  // Hold the entire app while Firebase resolves the initial auth state.
  // This prevents a flash of the login screen for returning users.
  if (authState.status === 'loading') {
    return <LoadingScreen message="جاري تحميل Sound..." />;
  }

  return (
    <Suspense fallback={<LoadingScreen message="جاري التحميل..." />}>
      <Routes>
        {/* ── Public auth routes ─────────────────────────────────────── */}
        <Route path="/login"  element={<LoginPage />} />
        <Route path="/signup" element={<SignUpPage />} />

        {/* ── Protected app shell ────────────────────────────────────── */}
        <Route
          element={
            <RequireAuth>
              <AppLayout />
            </RequireAuth>
          }
        >
          <Route index element={<HomePage />} />
          <Route path="discover"          element={<DiscoverPage />} />
          <Route path="live"              element={<LivePage />} />
          <Route path="profile/:uid"      element={<ProfilePage />} />
          <Route path="me"                element={<ProfilePage isSelf />} />
          <Route path="create"                    element={<CreatePage />} />
          <Route path="settings"                  element={<SettingsPage />} />
          <Route path="settings/edit-profile"     element={<EditProfilePage />} />
          <Route path="settings/privacy"           element={<PrivacySettingsPage />} />
          <Route path="world/:worldId"            element={<WorldPage />} />
        </Route>

        {/* ── Fallback ───────────────────────────────────────────────── */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}
