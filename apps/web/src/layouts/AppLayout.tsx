/**
 * Sound Platform — App Layout
 * ============================
 * Phase: 5-D (World + Tab routing)
 *
 * Shell layout wrapping all authenticated routes.
 * WorldNavProvider must wrap the shell so AppHeader, BottomNav, and
 * any page can read/set (world, tab) via useWorldNav().
 *
 * Layout hierarchy:
 *   AppLayout
 *   └─ WorldNavProvider   ← reads :worldId + :tab from URL
 *      └─ AppShell        ← sets data-world on root div
 *         ├─ ConnectivityBanner
 *         ├─ AppHeader        ← uses useWorldNav() for world strip active state
 *         ├─ <main> Outlet   ← receives active page component
 *         └─ BottomNav        ← uses useWorldNav() for tab active state
 */
import React from 'react';
import { useLocation, Outlet } from 'react-router-dom';
import { WorldNavProvider, useWorldNav } from '../contexts/WorldNavContext';
import { ConnectivityBanner } from '../components/ConnectivityBanner';
import { BottomNav }          from '../components/BottomNav';
import { AppHeader }          from '../components/AppHeader';
import { PlayerProvider, usePlayer } from '../contexts/PlayerContext';
import { GlobalPlayer }       from '../components/GlobalPlayer';
import './AppLayout.css';

/**
 * Inner shell — must live INSIDE WorldNavProvider so useWorldNav() works.
 * Sets data-world="<worldId>" on the root div so CSS can scope brand colors:
 *   [data-world="plus"]  → gold tokens
 *   [data-world="music"] → emerald tokens
 *   etc. (see global.css)
 */
function AppShell() {
  const location  = useLocation();
  const { world } = useWorldNav();

  return (
    <div className="app-layout" data-world={world}>
      <ConnectivityBanner />
      <AppHeader />
      <main className="app-layout__main">
        {/* key on the div (not on Outlet) forces React to destroy + recreate
            the entire page component subtree when pathname changes.
            Outlet itself is a React Router context consumer and ignores key. */}
        <div key={location.pathname} className="app-layout__page-container">
          <Outlet />
        </div>
      </main>
      <GlobalPlayer />
      <BottomNav />
    </div>
  );
}

export function AppLayout() {
  return (
    <WorldNavProvider>
      <PlayerProvider>
        <AppShell />
      </PlayerProvider>
    </WorldNavProvider>
  );
}
