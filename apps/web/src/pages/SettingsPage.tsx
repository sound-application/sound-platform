/**
 * Sound Platform — Settings Page (i18n)
 * ================================
 * Phase: 5-C-2 + i18n (Language Switcher)
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { SUPPORTED_LANGUAGES } from '../i18n';
import './SettingsPage.css';
import './Page.css';

// ─── Component ────────────────────────────────────────────────────────────────

export function SettingsPage() {
  const { t, i18n } = useTranslation('settings');
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const SETTINGS_ITEMS = [
    {
      id: 'edit-profile',
      icon: '✏️',
      label: t('editProfile.label'),
      desc: t('editProfile.desc'),
      route: '/settings/edit-profile',
      enabled: true,
    },
    {
      id: 'privacy',
      icon: '🔐',
      label: t('privacy.label'),
      desc: t('privacy.desc'),
      route: '/settings/privacy',
      enabled: true,
    },
    {
      id: 'account',
      icon: '🔑',
      label: t('account.label'),
      desc: t('account.desc'),
      route: '/settings/account',
      enabled: false,
      badge: t('comingSoon'),
    },
    {
      id: 'notifications',
      icon: '🔔',
      label: t('notifications.label'),
      desc: t('notifications.desc'),
      route: '/settings/notifications',
      enabled: false,
      badge: t('comingSoon'),
    },
    {
      id: 'plus',
      icon: '⭐',
      label: t('plusSubscription.label'),
      desc: t('plusSubscription.desc'),
      route: '/settings/plus',
      enabled: false,
      badge: t('comingSoon'),
    },
  ];

  const handleLanguageChange = (langCode: string) => {
    i18n.changeLanguage(langCode);
  };

  return (
    <div className="page settings-page">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="settings-page__header">
        <h1 className="settings-page__title">{t('title')}</h1>
        {currentUser?.email && (
          <p className="settings-page__account">
            {currentUser.email}
          </p>
        )}
      </div>

      {/* ── Language Switcher ──────────────────────────────────────────── */}
      <section className="settings-page__section" aria-label={t('language.label')}>
        <h2 className="settings-page__section-title">{t('language.label')}</h2>
        <div className="settings-page__language-grid">
          {SUPPORTED_LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              type="button"
              className={`settings-page__lang-btn${i18n.language === lang.code ? ' settings-page__lang-btn--active' : ''}`}
              onClick={() => handleLanguageChange(lang.code)}
              aria-pressed={i18n.language === lang.code}
              dir={lang.dir}
            >
              {lang.label}
            </button>
          ))}
        </div>
      </section>

      {/* ── Menu list ────────────────────────────────────────────────────── */}
      <nav className="settings-page__menu" aria-label={t('menuLabel')}>
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
              <span className="material-symbols-outlined settings-page__item-arrow" aria-hidden="true">chevron_left</span>
            )}
          </button>
        ))}
      </nav>

    </div>
  );
}
