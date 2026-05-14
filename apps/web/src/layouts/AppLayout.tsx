/**
 * Sound Platform — App Layout
 * ============================
 * Phase: 5-A
 *
 * Shell layout wrapping authenticated routes.
 * Contains: top header, main content area, bottom nav.
 * Outlet renders the active page route.
 */

import React from 'react';
import { Outlet } from 'react-router-dom';
import { ConnectivityBanner } from '../components/ConnectivityBanner';
import { BottomNav }          from '../components/BottomNav';
import { AppHeader }          from '../components/AppHeader';
import './AppLayout.css';

export function AppLayout() {
  return (
    <div className="app-layout">
      <ConnectivityBanner />
      <AppHeader />
      <main className="app-layout__main">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}
