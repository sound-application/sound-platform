/**
 * Sound Platform — Bottom Navigation
 * Phase: 5-A
 *
 * Mobile-first tab bar: Home, Discover, Live, Create, Profile.
 * Create is capability-aware — shows as disabled placeholder (no CF yet).
 */

import React from 'react';
import { NavLink } from 'react-router-dom';
import './BottomNav.css';

// ─── Nav Items ────────────────────────────────────────────────────────────────
type NavItem = {
  to: string;
  label: string;
  icon: string;        // emoji placeholder — replace with icon system in Phase 5-B
  disabled?: boolean;  // true = capability gate placeholder (no CF yet)
  ariaLabel?: string;
};

const NAV_ITEMS: NavItem[] = [
  { to: '/',        label: 'الرئيسية', icon: '🏠' },
  { to: '/discover', label: 'اكتشف',   icon: '🔍' },
  // ── Create: shown but disabled ──────────────────────────────────────────────
  // Real capability enforcement requires Cloud Functions (not deployed yet).
  // Phase 5-A: render as disabled placeholder to avoid fake interactions.
  {
    to:       '/create',
    label:    'إنشاء',
    icon:     '＋',
    disabled: false,   // enabled as shell page (no write actions inside)
    ariaLabel: 'إنشاء محتوى',
  },
  { to: '/live',    label: 'مباشر',   icon: '📡' },
  { to: '/me',      label: 'أنا',     icon: '👤' },
];

export function BottomNav() {
  return (
    <nav className="bottom-nav" aria-label="التنقل الرئيسي">
      {NAV_ITEMS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          aria-label={item.ariaLabel ?? item.label}
          aria-disabled={item.disabled}
          className={({ isActive }) =>
            `bottom-nav__item${isActive ? ' bottom-nav__item--active' : ''}${
              item.disabled ? ' bottom-nav__item--disabled' : ''
            }`
          }
          onClick={item.disabled ? (e) => e.preventDefault() : undefined}
        >
          <span className="bottom-nav__icon" aria-hidden="true">{item.icon}</span>
          <span className="bottom-nav__label">{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
