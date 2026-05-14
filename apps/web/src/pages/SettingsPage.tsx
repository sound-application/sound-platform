/**
 * Sound Platform — Settings Page
 * ================================
 * Phase: 5-C-2 (Dedicated Privacy Settings UI)
 *
 * Settings hub that links to sub-pages.
 * The actual profile edit reads/writes users/{uid} (owner-allowed).
 * Public profile rendering always uses publicProfiles/{uid}.
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './SettingsPage.css';
import './Page.css';

// ─── Settings menu items ──────────────────────────────────────────────────────

const SETTINGS_ITEMS = [
  {
    id: 'edit-profile',
    icon: '✏️',
    label: 'تعديل الملف الشخصي',
    desc: 'الاسم، النبذة، الحالة المزاجية',
    route: '/settings/edit-profile',
    enabled: true,
  },
  {
    id: 'privacy',
    icon: '🔐',
    label: 'إعدادات الخصوصية',
    desc: 'تحكَّم في من يرى كل قسم من ملفك',
    route: '/settings/privacy',
    enabled: true,
  },
  {
    id: 'account',
    icon: '🔑',
    label: 'الحساب والأمان',
    desc: 'البريد الإلكتروني وكلمة المرور',
    route: '/settings/account',
    enabled: false,
    badge: 'قريباً',
  },
  {
    id: 'notifications',
    icon: '🔔',
    label: 'الإشعارات',
    desc: 'إدارة تفضيلات الإشعارات',
    route: '/settings/notifications',
    enabled: false,
    badge: 'قريباً',
  },
  {
    id: 'plus',
    icon: '⭐',
    label: 'اشتراك Plus',
    desc: 'إدارة الاشتراك وإمكانيات النشر',
    route: '/settings/plus',
    enabled: false,
    badge: 'قريباً',
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

export function SettingsPage() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="page settings-page">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="settings-page__header">
        <h1 className="settings-page__title">الإعدادات</h1>
        {currentUser?.email && (
          <p className="settings-page__account" dir="ltr">
            {currentUser.email}
          </p>
        )}
      </div>

      {/* ── Menu list ────────────────────────────────────────────────────── */}
      <nav className="settings-page__menu" aria-label="قائمة الإعدادات">
        {SETTINGS_ITEMS.map(item => (
          <button
            key={item.id}
            id={`settings-item-${item.id}`}
            className={`settings-page__item${item.enabled ? '' : ' settings-page__item--disabled'}`}
            onClick={() => item.enabled && navigate(item.route)}
            disabled={!item.enabled}
            aria-label={item.label}
          >
            <span className="settings-page__item-icon" aria-hidden="true">
              {item.icon}
            </span>
            <span className="settings-page__item-content">
              <span className="settings-page__item-label">{item.label}</span>
              <span className="settings-page__item-desc">{item.desc}</span>
            </span>
            {item.badge ? (
              <span className="settings-page__badge">{item.badge}</span>
            ) : (
              <span className="settings-page__item-arrow" aria-hidden="true">←</span>
            )}
          </button>
        ))}
      </nav>

    </div>
  );
}
