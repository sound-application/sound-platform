/**
 * Sound Platform — Bottom Navigation (i18n)
 * Phase: 5-H (Simple Glass Pills)
 *
 * 5 separate rounded glass pills.
 * Active pill is taller / elevated.
 * Inactive pills are shorter, sitting lower.
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { useWorldNav, type WorldTab } from '../contexts/WorldNavContext';
import './BottomNav.css';

// ─── Icons ────────────────────────────────────────────────────────────────────

const IconHome = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H5a1 1 0 01-1-1V9.5z" />
    <path d="M9 21V12h6v9" />
  </svg>
);
const IconDiscover = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);
const IconCreate = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="9" />
    <line x1="12" y1="8" x2="12" y2="16" />
    <line x1="8" y1="12" x2="16" y2="12" />
  </svg>
);
const IconLive = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M6.3 6.3a8 8 0 000 11.4" />
    <path d="M17.7 6.3a8 8 0 010 11.4" />
  </svg>
);
const IconMe = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="8" r="4" />
    <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
  </svg>
);

// ─── Nav items ────────────────────────────────────────────────────────────────

const NAV_ITEM_DEFS: { tab: WorldTab; tKey: string; Icon: React.FC }[] = [
  { tab: 'home',     tKey: 'nav.home',     Icon: IconHome },
  { tab: 'discover', tKey: 'nav.discover',  Icon: IconDiscover },
  { tab: 'create',   tKey: 'nav.create',    Icon: IconCreate },
  { tab: 'live',     tKey: 'nav.live',      Icon: IconLive },
  { tab: 'me',       tKey: 'nav.profile',   Icon: IconMe },
];

// ─── Component ────────────────────────────────────────────────────────────────

export function BottomNav() {
  const { t } = useTranslation('common');
  const { tab: activeTab, switchTab } = useWorldNav();

  return (
    <nav className="bottom-nav" aria-label={t('nav.mainNav')}>
      <div className="bottom-nav__bar">
        {NAV_ITEM_DEFS.map(({ tab, tKey, Icon }) => {
          const isActive = activeTab === tab;
          const label = t(tKey);
          return (
            <button
              key={tab}
              type="button"
              className={`bottom-nav__pill${isActive ? ' bottom-nav__pill--active' : ''}`}
              aria-label={label}
              aria-pressed={isActive}
              onClick={() => switchTab(tab)}
            >
              <span className="bottom-nav__icon"><Icon /></span>
              <span className="bottom-nav__label">{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
