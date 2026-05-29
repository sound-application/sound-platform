/**
 * Sound Platform — App Routes
 * ============================
 * Phase: 5-D (World + Tab Routing)
 *
 * URL model:  /:worldId/:tab
 *
 *   worldId  — one of: general | plus | music | radio | tournaments
 *   tab      — one of: home | discover | live | create | me
 *
 * Examples:
 *   /general/home         → General Home
 *   /plus/home            → Plus Home
 *   /music/live           → Music Live
 *   /radio/live           → Radio Live / on-air schedule
 *   /tournaments/discover → Tournaments Discover
 *   /radio/me             → Radio Me (world-scoped profile)
 *
 * Invariants:
 *   - "live" is a bottom TAB, not a world. /live is forbidden as a top-level route.
 *   - مباشر and بطولات are forbidden substitutes (enforced by lockedLabels.ts).
 *   - World-agnostic routes: /profile/:uid, /settings/**, /login, /signup
 *   - / redirects to /general/home.
 *   - /me redirects to /:lastWorld/me (defaults to /general/me).
 *
 * Direct URL restoration: both world and tab come from URL params, so
 * any bookmark or shared link restores the exact state.
 *
 * Browser back/forward: handled automatically by React Router — each
 * /:worldId/:tab URL is a distinct history entry.
 */

import React, { Suspense } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { AppLayout } from '../layouts/AppLayout';
import { LoadingScreen } from '../components/LoadingScreen';

// ─── Page imports ─────────────────────────────────────────────────────────────
import { HomePage }           from '../pages/HomePage';
import { GeneralHomePage }    from '../pages/GeneralHomePage';
import { PlusHomePage }       from '../pages/home/PlusHomePage';
import { MusicHomePage }      from '../pages/home/MusicHomePage';
import { RadioHomePage }        from '../pages/home/RadioHomePage';
import { TournamentsHomePage }  from '../pages/home/TournamentsHomePage';
import { DiscoverPage }         from '../pages/DiscoverPage';
import { GeneralDiscoverPage }  from '../pages/discover/GeneralDiscoverPage';
import { PlusDiscoverPage }     from '../pages/discover/PlusDiscoverPage';
import { MusicDiscoverPage }    from '../pages/discover/MusicDiscoverPage';
import { RadioDiscoverPage }        from '../pages/discover/RadioDiscoverPage';
import { TournamentsDiscoverPage }  from '../pages/discover/TournamentsDiscoverPage';
import { LivePage }           from '../pages/LivePage';
import { ProfilePage }        from '../pages/ProfilePage';
import { GeneralMePage }      from '../pages/me/GeneralMePage';
import { PlusMePage }         from '../pages/me/PlusMePage';
import { MusicMePage }        from '../pages/me/MusicMePage';
import { RadioMePage }        from '../pages/me/RadioMePage';
import { TournamentsMePage }  from '../pages/me/TournamentsMePage';
import { GlobalCreateHubPage } from '../pages/create/GlobalCreateHubPage';
import { SettingsPage }       from '../pages/SettingsPage';
import { EditProfilePage }    from '../pages/EditProfilePage';
import { PrivacySettingsPage } from '../pages/PrivacySettingsPage';
import { NotFoundPage }       from '../pages/NotFoundPage';
import { LoginPage }          from '../pages/LoginPage';
import { SignUpPage }         from '../pages/SignUpPage';
import { AudioCreatePage }    from '../pages/create/AudioCreatePage';
import { AudioDetailPage }    from '../pages/AudioDetailPage';
import { PlaylistDetailPage } from '../pages/PlaylistDetailPage';

// ─── Protected Route ─────────────────────────────────────────────────────────

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { authState } = useAuth();
  const location = useLocation();
  if (authState.status === 'loading') return <LoadingScreen message="جاري التحقق من الجلسة..." />;
  // Pass the requested location in state so LoginPage can redirect back after sign-in.
  if (authState.status === 'signed-out')
    return <Navigate to="/login" state={{ from: location }} replace />;
  return <>{children}</>;
}

// ─── Router ──────────────────────────────────────────────────────────────────

export function AppRouter() {
  const { authState } = useAuth();

  if (authState.status === 'loading') {
    return <LoadingScreen message="جاري تحميل Sound..." />;
  }

  return (
    <Suspense fallback={<LoadingScreen message="جاري التحميل..." />}>
      <Routes>
        {/* ── Public auth routes ──────────────────────────────────────── */}
        <Route path="/login"  element={<LoginPage />} />
        <Route path="/signup" element={<SignUpPage />} />

        {/* ── Protected app shell ─────────────────────────────────────── */}
        <Route
          element={
            <RequireAuth>
              <AppLayout />
            </RequireAuth>
          }
        >
          {/* ── Root redirect ────────────────────────────────────────── */}
          {/* / → /general/home */}
          <Route index element={<Navigate to="/general/home" replace />} />

          {/* ── Audio creation flow (Phase 8-C) ────────────────────── */}
          <Route path="create/audio" element={<AudioCreatePage />} />

          {/* ── Audio Detail Player (Phase 8-C) ──────────────────────── */}
          <Route path="audio/:contentId" element={<AudioDetailPage />} />

          {/* ── Playlist Detail (Phase 8-I) ──────────────────────── */}
          <Route path="playlist/:playlistId" element={<PlaylistDetailPage />} />

          {/* ── World + Tab routes: /:worldId/:tab ────────────────────── */}
          {/*
           * WorldNavProvider (inside AppLayout) reads :worldId and :tab from
           * these params and provides them to AppHeader + BottomNav.
           *
           * /general/home → GeneralHomePage  (world-scoped, dedicated file)
           * /:worldId/home → HomePage        (all other worlds — generic fallback)
           * Each world will eventually get its own home page file.
           */}

          {/* ── عام (General) world — scoped home ──────────────────────────── */}
          <Route path="general">
            <Route index element={<Navigate to="home" replace />} />
            <Route path="home"     element={<GeneralHomePage />} />
            <Route path="discover" element={<GeneralDiscoverPage />} />
            <Route path="live"     element={<LivePage />} />
            <Route path="create"   element={<GlobalCreateHubPage />} />
            <Route path="me"       element={<GeneralMePage />} />
          </Route>

          {/* ── بلس (Plus) world — scoped home ─────────────────────────────── */}
          <Route path="plus">
            <Route index element={<Navigate to="home" replace />} />
            <Route path="home"     element={<PlusHomePage />} />
            <Route path="discover" element={<PlusDiscoverPage />} />
            <Route path="live"     element={<LivePage />} />
            <Route path="create"   element={<GlobalCreateHubPage />} />
            <Route path="me"       element={<PlusMePage />} />
          </Route>

          {/* ── موسيقى (Music) world — scoped home ─────────────────────────── */}
          <Route path="music">
            <Route index element={<Navigate to="home" replace />} />
            <Route path="home"     element={<MusicHomePage />} />
            <Route path="discover" element={<MusicDiscoverPage />} />
            <Route path="live"     element={<LivePage />} />
            <Route path="create"   element={<GlobalCreateHubPage />} />
            <Route path="me"       element={<MusicMePage />} />
          </Route>

          {/* ── راديو (Radio) world — scoped home ──────────────────────────── */}
          <Route path="radio">
            <Route index element={<Navigate to="home" replace />} />
            <Route path="home"     element={<RadioHomePage />} />
            <Route path="discover" element={<RadioDiscoverPage />} />
            <Route path="live"     element={<LivePage />} />
            <Route path="create"   element={<GlobalCreateHubPage />} />
            <Route path="me"       element={<RadioMePage />} />
          </Route>

          {/* ── مسابقات (Tournaments) world — scoped home ───────────────────── */}
          <Route path="tournaments">
            <Route index element={<Navigate to="home" replace />} />
            <Route path="home"     element={<TournamentsHomePage />} />
            <Route path="discover" element={<TournamentsDiscoverPage />} />
            <Route path="live"     element={<LivePage />} />
            <Route path="create"   element={<GlobalCreateHubPage />} />
            <Route path="me"       element={<TournamentsMePage />} />
          </Route>

          {/* ── All other worlds — generic home fallback ────────────────────── */}
          <Route path=":worldId">
            <Route index element={<Navigate to="home" replace />} />
            <Route path="home"     element={<HomePage />} />
            <Route path="discover" element={<DiscoverPage />} />
            <Route path="live"     element={<LivePage />} />
            <Route path="create"   element={<GlobalCreateHubPage />} />
            {/* /me shortcut — redirects to /:worldId/me */}
            <Route path="me"       element={<ProfilePage isSelf />} />
          </Route>

          {/* ── /me shortcut without world → /general/me ─────────────── */}
          <Route path="me" element={<Navigate to="/general/me" replace />} />

          {/* ── World-agnostic: public profile ───────────────────────── */}
          <Route path="profile/:uid" element={<ProfilePage />} />

          {/* ── World-agnostic: settings subtree ─────────────────────── */}
          <Route path="settings"                 element={<SettingsPage />} />
          <Route path="settings/edit-profile"    element={<EditProfilePage />} />
          <Route path="settings/privacy"         element={<PrivacySettingsPage />} />
        </Route>

        {/* ── Fallback ─────────────────────────────────────────────────── */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}
