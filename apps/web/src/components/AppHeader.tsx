/**
 * Sound Platform — App Header
 * Phase: 5-A
 *
 * Top header bar: wordmark + world switcher tabs + user avatar.
 * World tabs are navigation placeholders — feeds are not yet implemented.
 */

import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './AppHeader.css';

// ─── World Navigation Items ───────────────────────────────────────────────────
// Each world has an ID (route param) and a color token.
// Capability checks for CREATING in a world happen server-side (CF).
// These tabs only gate navigation — all authenticated users can view any world.
const WORLDS = [
  { id: 'general', label: 'عام',    color: 'var(--color-world-general)' },
  { id: 'plus',    label: 'Plus',   color: 'var(--color-world-plus)'    },
  { id: 'music',   label: 'موسيقى', color: 'var(--color-world-music)'   },
  { id: 'radio',   label: 'راديو',  color: 'var(--color-world-radio)'   },
] as const;

export function AppHeader() {
  const { currentUser } = useAuth();

  return (
    <header className="app-header" role="banner">
      {/* Wordmark */}
      <NavLink to="/" className="app-header__wordmark">
        Sound
      </NavLink>

      {/* World tabs */}
      <nav className="app-header__worlds" aria-label="عوالم Sound">
        {WORLDS.map((w) => (
          <NavLink
            key={w.id}
            to={`/world/${w.id}`}
            className={({ isActive }) =>
              `app-header__world-tab${isActive ? ' app-header__world-tab--active' : ''}`
            }
            style={{ '--world-color': w.color } as React.CSSProperties}
          >
            {w.label}
          </NavLink>
        ))}
      </nav>

      {/* User avatar / sign-in */}
      <div className="app-header__user">
        {currentUser ? (
          <NavLink
            to="/me"
            className="app-header__avatar"
            aria-label="ملفك الشخصي"
          >
            {currentUser.photoURL ? (
              <img src={currentUser.photoURL} alt={currentUser.displayName ?? 'أنت'} />
            ) : (
              <span className="app-header__avatar-initial">
                {(currentUser.displayName ?? currentUser.email ?? '؟').charAt(0).toUpperCase()}
              </span>
            )}
          </NavLink>
        ) : (
          <NavLink to="/login" className="app-header__sign-in-btn">
            تسجيل الدخول
          </NavLink>
        )}
      </div>
    </header>
  );
}
