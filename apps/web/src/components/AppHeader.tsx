/**
 * Sound Platform — App Header (i18n)
 * Phase: 5-F (+ AccountControlHub)
 *
 * Two-element fixed header:
 *
 *   ┌─────────────────────────────────────────┐  ← top bar (56px)
 *   │ [avatar]     S O U N D     [🔍]          │
 *   └─────────────────────────────────────────┘
 *   ┌─────────────────────────────────────────┐  ← world strip (48px)
 *   │  General  Plus  Music  Radio  Tournaments │
 *   └─────────────────────────────────────────┘
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useWorldNav } from '../contexts/WorldNavContext';
import { WORLD_ORDER } from '../constants/lockedLabels';
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

// ═══ Component ════════════════════════════════════════════════════════════════

export function AppHeader() {
  const { t } = useTranslation('common');
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const { world: activeWorld, switchWorld } = useWorldNav();
  const [hubOpen, setHubOpen] = useState(false);
  const openHub  = () => setHubOpen(true);
  const closeHub = () => setHubOpen(false);

  const WORLDS = WORLD_ORDER.map((id) => ({
    id,
    label: t(`worlds.${id}`),
    color: WORLD_COLOR[id],
  }));

  return (
    <>
      {/* ── Top Bar: avatar | SOUND | search ──────────────────────────────── */}
      <header className="app-header" role="banner">
        {/* Avatar / profile */}
        <div className="app-header__user">
          {currentUser ? (
            <button
              className="app-header__avatar"
              aria-label={t('header.openAccountMenu')}
              aria-expanded={hubOpen}
              aria-controls="account-control-hub"
              type="button"
              onClick={openHub}
            >
              {currentUser.photoURL ? (
                <img src={currentUser.photoURL} alt={currentUser.displayName ?? t('header.photo')} />
              ) : (
                <span className="app-header__avatar-initial">
                  {(currentUser.displayName ?? currentUser.email ?? t('header.defaultInitial')).charAt(0).toUpperCase()}
                </span>
              )}
            </button>
          ) : (
            <button
              className="app-header__sign-in-btn"
              type="button"
              onClick={() => navigate('/login')}
            >
              {t('header.signIn')}
            </button>
          )}
        </div>

        {/* Wordmark — centered */}
        <button
          className="app-header__wordmark"
          aria-label={t('header.soundHome')}
          type="button"
          onClick={() => navigate(`/${activeWorld}/home`)}
        >
          SOUND
        </button>

        {/* Search */}
        <button
          className="app-header__search-btn"
          aria-label={t('header.search')}
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
        aria-label={t('worlds.soundWorlds')}
        role="navigation"
      >
        <div className="app-header__world-pill">
          {WORLDS.map((w) => (
            <button
              key={w.id}
              type="button"
              className={`app-header__world-tab${activeWorld === w.id ? ' app-header__world-tab--active' : ''}`}
              style={{ '--world-color': w.color } as React.CSSProperties}
              aria-pressed={activeWorld === w.id}
              aria-label={t('worlds.worldLabel', { name: w.label })}
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
