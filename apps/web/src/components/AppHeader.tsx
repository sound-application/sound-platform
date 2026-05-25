/**
 * Sound Platform — App Header
 * Phase: 5-F (+ AccountControlHub)
 *
 * Two-element fixed header:
 *
 *   ┌─────────────────────────────────────────┐  ← top bar (56px)
 *   │ [avatar]     S O U N D     [🔍]          │
 *   └─────────────────────────────────────────┘
 *   ┌─────────────────────────────────────────┐  ← world strip (48px)
 *   │  عام  بلس  موسيقى  راديو  مسابقات       │
 *   └─────────────────────────────────────────┘
 *
 * Avatar behavior (Phase 5-F):
 *   - Tapping the avatar opens AccountControlHub — a full-screen glass sheet.
 *   - It does NOT navigate to /:world/me directly any more.
 *   - عرض ملفي inside the hub navigates to /:world/me.
 *   - Opening / closing the hub does NOT change the current URL.
 *
 * World tab rules:
 *   - Locked order: general | plus | music | radio | tournaments
 *   - Locked Arabic labels — do not use Plus (Latin), مداح, or عطولان
 *   - World tabs are NEVER hidden by capability
 *   - Clicking a world tab calls switchWorld(id), which navigates to
 *     /:newWorld/:currentTab — preserving the active bottom tab.
 *
 * Active state:
 *   - Active world comes from useWorldNav().world (derived from URL).
 *   - The active indicator uses CSS var(--world-color) for the accent line.
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useWorldNav } from '../contexts/WorldNavContext';
import { LOCKED_WORLDS, WORLD_ORDER } from '../constants/lockedLabels';
import { AccountControlHub } from './account/AccountControlHub';
import './AppHeader.css';

// ═══ World color map ══════════════════════════════════════════════════════════
const WORLD_COLOR: Record<string, string> = {
  general:     'var(--color-world-general)',
  plus:        'var(--color-world-plus)',
  music:       'var(--color-world-music)',
  radio:       'var(--color-world-radio)',
  tournaments: 'var(--color-world-tournaments)',
};

const WORLDS = WORLD_ORDER.map((id) => ({
  id,
  label: LOCKED_WORLDS[id],
  color: WORLD_COLOR[id],
}));

// ═══ Component ════════════════════════════════════════════════════════════════

export function AppHeader() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  // useWorldNav() reads (world, tab) from URL and exposes navigation helpers.
  // switchWorld(id) navigates to /:newWorld/:currentTab — tab is preserved.
  const { world: activeWorld, switchWorld } = useWorldNav();

  // AccountControlHub open state — lives here so it doesn't affect routing.
  const [hubOpen, setHubOpen] = useState(false);
  const openHub  = () => setHubOpen(true);
  const closeHub = () => setHubOpen(false);

  return (
    <>
      {/* ── Top Bar: avatar | SOUND | search ──────────────────────────────── */}
      <header className="app-header" role="banner">
        {/* Avatar / profile — screen-left (RTL: physical left = logical start) */}
        <div className="app-header__user">
          {currentUser ? (
            <button
              className="app-header__avatar"
              aria-label="فتح قائمة الحساب"
              aria-expanded={hubOpen}
              aria-controls="account-control-hub"
              type="button"
              onClick={openHub}
            >
              {currentUser.photoURL ? (
                <img src={currentUser.photoURL} alt={currentUser.displayName ?? 'صورة'} />
              ) : (
                <span className="app-header__avatar-initial">
                  {(currentUser.displayName ?? currentUser.email ?? 'م').charAt(0).toUpperCase()}
                </span>
              )}
            </button>
          ) : (
            <button
              className="app-header__sign-in-btn"
              type="button"
              onClick={() => navigate('/login')}
            >
              دخول
            </button>
          )}
        </div>

        {/* Wordmark — centered */}
        <button
          className="app-header__wordmark"
          aria-label="Sound — الرئيسية"
          type="button"
          onClick={() => navigate(`/${activeWorld}/home`)}
        >
          SOUND
        </button>

        {/* Search — screen-right */}
        <button
          className="app-header__search-btn"
          aria-label="بحث"
          type="button"
          onClick={() => navigate(`/${activeWorld}/discover`)}
        >
          <span className="app-header__search-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                 width="20" height="20" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <line x1="16.5" y1="16.5" x2="22" y2="22" />
            </svg>
          </span>
        </button>
      </header>

      {/* ── World Strip ────────────────────────────────────────────────────── */}
      <nav
        className="app-header__world-strip"
        aria-label="عوالم Sound"
        role="navigation"
      >
        {/* Glass pill — visually matches the Discover subnav pill exactly */}
        <div className="app-header__world-pill">
          {WORLDS.map((w) => (
            <button
              key={w.id}
              type="button"
              className={`app-header__world-tab${activeWorld === w.id ? ' app-header__world-tab--active' : ''}`}
              style={{ '--world-color': w.color } as React.CSSProperties}
              aria-pressed={activeWorld === w.id}
              aria-label={`عالم ${w.label}`}
              onClick={() => switchWorld(w.id)}
            >
              {w.label}
            </button>
          ))}
        </div>
      </nav>

      {/* ── Account Control Hub ────────────────────────────────────────────── */}
      {hubOpen && (
        <div id="account-control-hub">
          <AccountControlHub onClose={closeHub} />
        </div>
      )}
    </>
  );
}
