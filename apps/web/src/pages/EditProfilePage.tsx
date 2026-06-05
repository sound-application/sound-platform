/**
 * Sound Platform — Edit Profile Page
 * =====================================
 * Phase:   5-C-1 (Live Profile Editing & Privacy Test UI)
 * Updated: 2026-05-14
 *
 * PRIVACY MODEL (Phase 4-H-2 — MANDATORY):
 *   ✅ Reads from:   users/{currentUser.uid}     — owner-allowed by Firestore rules
 *   ✅ Writes to:    users/{currentUser.uid}      — owner-allowed by Firestore rules
 *   ❌ NEVER reads:  users/{otherUid}             — denied by rules
 *   ❌ NEVER writes: publicProfiles/{uid}         — Cloud Function only (rules deny)
 *
 * EDITABLE FIELDS (safe, non-server-only):
 *   Basic:  displayName, username, bio
 *   Mood:   mood value (string), mood privacy level
 *   Privacy sections: activityStatus, listeningActivity, musicPlaylists,
 *                     radioCreatorContent, plusCreatorContent
 *
 * NEVER EXPOSED IN UI:
 *   role, capabilities, restrictions, walletId, kycStatus,
 *   isMinor, isBanned, accountType, createdAt, guardianUid
 *
 * FIRESTORE RULE NOTE:
 *   The update rule in firestore.rules blocks any write that touches
 *   server-only fields. This UI only sends the editable subset.
 *
 * PUBLIC SYNC NOTE:
 *   After saving to users/{uid}, the Cloud Function onUserProfileUpdate
 *   fires automatically (Gen1 Firestore trigger, ~5–10s latency).
 *   The public profile page (publicProfiles/{uid}) updates automatically.
 *   If mood privacy is set to 'private', mood disappears from publicProfiles.
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, updateDoc } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { usePrivateProfile } from '../hooks/usePrivateProfile';
import { db } from '../lib/firebase';
import { LoadingScreen } from '../components/LoadingScreen';
import type { PrivacyLevel, SectionPrivacy } from '@sound/shared';
import { useTranslation, Trans } from 'react-i18next';
import { TFunction } from 'i18next';
import './EditProfilePage.css';
import './Page.css';

import i18n from '../i18n';
const t = (key: any, options?: any) => i18n.t(key, options) as any as string;

// ─── Privacy Level Normalizer ─────────────────────────────────────────────────
// The privacy model was upgraded to SectionPrivacy (audiences array) in Phase 5-C-3.
// EditProfilePage still uses the simpler 3-option PrivacyLevel for its UI controls.
// This helper extracts a PrivacyLevel from SectionPrivacy for the form state.
// On save, the string is written directly — onUserCreate / buildPublicProfile
// interpret it via the isSectionPublic() helper.
function normalizePrivacyLevel(section: SectionPrivacy | PrivacyLevel | undefined): PrivacyLevel {
  if (!section) return 'public';
  // Legacy string format
  if (typeof section === 'string') return section as PrivacyLevel;
  // New SectionPrivacy format: { audiences: string[] }
  if (typeof section === 'object' && Array.isArray((section as SectionPrivacy).audiences)) {
    const audiences = (section as SectionPrivacy).audiences;
    if (audiences.includes('onlyMe'))    return 'private';
    if (audiences.includes('followers')) return 'followers';
    return 'public';
  }
  return 'public';
}

// ─── Form State ───────────────────────────────────────────────────────────────
// Only the fields the owner can edit. Never includes server-only fields.

interface EditableFields {
  displayName: string;
  username: string;
  bio: string;
  mood: string;
  socialLinks: Record<string, string>;
  // Privacy section levels
  privacyMood: PrivacyLevel;
  privacyActivityStatus: PrivacyLevel;
  privacyListeningActivity: PrivacyLevel;
  privacyMusicPlaylists: PrivacyLevel;
  privacyRadioCreatorContent: PrivacyLevel;
  privacyPlusCreatorContent: PrivacyLevel;
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

const getPrivacyOptions = (t: TFunction): { value: PrivacyLevel; label: string }[] => [
  { value: 'public',    label: t('privacyLevels.public') },
  { value: 'followers', label: t('privacyLevels.followers') },
  { value: 'private',   label: t('privacyLevels.private') },
];

// ─── Component ────────────────────────────────────────────────────────────────

export function EditProfilePage() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation('editProfile');
  const uid = currentUser?.uid ?? null;

  // ── Read own private document (owner-only) ─────────────────────────────────
  // ✅ This reads users/{currentUser.uid} — owner-allowed by Firestore rules
  const profileState = usePrivateProfile(uid);

  // ── Form state ─────────────────────────────────────────────────────────────
  const [fields, setFields] = useState<EditableFields>({
    displayName: '',
    username: '',
    bio: '',
    mood: '',
    socialLinks: {},
    privacyMood: 'public',
    privacyActivityStatus: 'public',
    privacyListeningActivity: 'public',
    privacyMusicPlaylists: 'public',
    privacyRadioCreatorContent: 'public',
    privacyPlusCreatorContent: 'public',
  });
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [initialized, setInitialized] = useState(false);

  // ── Populate form when private doc loads ───────────────────────────────────
  useEffect(() => {
    if (profileState.status === 'loaded' && !initialized) {
      const d = profileState.data;
      setFields({
        displayName:               d.displayName ?? '',
        username:                  d.username ?? '',
        bio:                       d.bio ?? '',
        mood:                      d.mood ?? '',
        socialLinks:               d.socialLinks ?? {},
        privacyMood:               normalizePrivacyLevel(d.privacy.mood),
        privacyActivityStatus:     normalizePrivacyLevel(d.privacy.activityStatus),
        privacyListeningActivity:  normalizePrivacyLevel(d.privacy.listeningActivity),
        privacyMusicPlaylists:     normalizePrivacyLevel(d.privacy.musicPlaylists),
        privacyRadioCreatorContent:normalizePrivacyLevel(d.privacy.radioCreatorContent),
        privacyPlusCreatorContent: normalizePrivacyLevel(d.privacy.plusCreatorContent),
      });
      setInitialized(true);
    }
  }, [profileState, initialized]);

  // ── Field helpers ──────────────────────────────────────────────────────────

  function setField<K extends keyof EditableFields>(key: K, value: EditableFields[K]) {
    setFields(prev => ({ ...prev, [key]: value }));
    if (saveState === 'saved' || saveState === 'error') setSaveState('idle');
  }

  // ── Save handler ───────────────────────────────────────────────────────────
  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!uid) return;

    // Validation
    const trimmedName = fields.displayName.trim();
    const trimmedUsername = fields.username.trim();
    if (!trimmedName) { setErrorMessage(t('errors.displayNameRequired')); setSaveState('error'); return; }
    if (!trimmedUsername) { setErrorMessage(t('errors.usernameRequired')); setSaveState('error'); return; }
    if (trimmedUsername.length < 3) { setErrorMessage(t('errors.usernameMinLength')); setSaveState('error'); return; }

    setSaveState('saving');
    setErrorMessage('');

    try {
      // ✅ Write ONLY to users/{currentUser.uid}
      // ❌ NEVER write to publicProfiles/{uid} — Cloud Function handles sync
      //
      // The update includes ONLY the safe, non-server-only fields.
      // Firestore rules block any attempt to touch server-only fields.
      const userRef = doc(db, 'users', uid);

      await updateDoc(userRef, {
        // Basic fields
        displayName: trimmedName,
        username:    trimmedUsername,
        bio:         fields.bio.trim() || null,
        mood:        fields.mood.trim() || null,
        socialLinks: fields.socialLinks,

        // Privacy settings — only the sections in scope for this phase
        // Other privacy sections are left unchanged (they're not in the diff)
        'privacy.mood':                fields.privacyMood,
        'privacy.activityStatus':      fields.privacyActivityStatus,
        'privacy.listeningActivity':   fields.privacyListeningActivity,
        'privacy.musicPlaylists':      fields.privacyMusicPlaylists,
        'privacy.radioCreatorContent': fields.privacyRadioCreatorContent,
        'privacy.plusCreatorContent':  fields.privacyPlusCreatorContent,
      });

      setSaveState('saved');
    } catch (err: unknown) {
      console.error('[EditProfilePage] Failed to update users/{uid}:', err);
      const msg = err instanceof Error ? err.message : t('errors.genericError');
      setErrorMessage(msg);
      setSaveState('error');
    }
  }

  // ─── Loading ─────────────────────────────────────────────────────────────────
  if (!uid) {
    return <LoadingScreen message={t('loading.session')} />;
  }

  if (profileState.status === 'loading') {
    return <LoadingScreen message={t('loading.profile')} />;
  }

  if (profileState.status === 'error') {
    return (
      <div className="page edit-profile-page">
        <div className="edit-profile__error-banner" role="alert">
          {t('errors.loadFailed')} {profileState.message}
        </div>
      </div>
    );
  }

  if (profileState.status === 'not-found') {
    return (
      <div className="page edit-profile-page">
        <div className="edit-profile__error-banner" role="alert">
          {t('errors.notFound')}
        </div>
      </div>
    );
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="page edit-profile-page">

      {/* ── Page header ─────────────────────────────────────────────────── */}
      <div className="edit-profile__header">
        <button
          className="edit-profile__back-btn"
          onClick={() => navigate(-1)}
          aria-label={t('back')}
          id="edit-profile-back-btn"
        >
          ←
        </button>
        <h1 className="edit-profile__title">{t('title')}</h1>
      </div>

      {/* ── Sync notice ──────────────────────────────────────────────────── */}
      <div className="edit-profile__sync-notice" role="note">
        <span className="edit-profile__sync-icon">⏱</span>
        <span>
          <Trans i18nKey="syncNotice" t={t}>
            {t('editprofile:afterSavingThePublicProfileIsAutomatical')}<strong>{t('editprofile:510Seconds')}</strong> {t('editprofile:viaSynchronizationSystem')}</Trans>
        </span>
      </div>

      {/* ── Form ─────────────────────────────────────────────────────────── */}
      <form
        className="edit-profile__form"
        onSubmit={handleSave}
        noValidate
        id="edit-profile-form"
      >

        {/* ── Section: Basic Info ─────────────────────────────────────────── */}
        <section className="edit-profile__section">
          <h2 className="edit-profile__section-title">
            <span className="edit-profile__section-icon">👤</span>
            {t('sections.basicInfo.title')}
          </h2>

          <div className="edit-profile__field">
            <label className="edit-profile__label" htmlFor="edit-displayName">
              {t('sections.basicInfo.displayName')} <span className="edit-profile__required">*</span>
            </label>
            <input
              id="edit-displayName"
              className="edit-profile__input"
              type="text"
              value={fields.displayName}
              onChange={e => setField('displayName', e.target.value)}
              placeholder={t('sections.basicInfo.displayNamePlaceholder')}
              maxLength={50}
              required
              dir="auto"
            />
          </div>

          <div className="edit-profile__field">
            <label className="edit-profile__label" htmlFor="edit-username">
              {t('sections.basicInfo.username')} <span className="edit-profile__required">*</span>
            </label>
            <div className="edit-profile__input-prefix-wrap">
              <span className="edit-profile__input-prefix">@</span>
              <input
                id="edit-username"
                className="edit-profile__input edit-profile__input--prefixed"
                type="text"
                value={fields.username}
                onChange={e => setField('username', e.target.value.replace(/\s/g, '_').toLowerCase())}
                placeholder="username"
                maxLength={30}
                required
                dir="ltr"
              />
            </div>
            <p className="edit-profile__hint">
              {t('sections.basicInfo.usernameHint')}
            </p>
          </div>

          <div className="edit-profile__field">
            <label className="edit-profile__label" htmlFor="edit-bio">
              {t('sections.basicInfo.bio')}
            </label>
            <textarea
              id="edit-bio"
              className="edit-profile__textarea"
              value={fields.bio}
              onChange={e => setField('bio', e.target.value)}
              placeholder={t('sections.basicInfo.bioPlaceholder')}
              maxLength={200}
              rows={3}
              dir="auto"
            />
            <p className="edit-profile__hint">
              {fields.bio.length}/200
            </p>
          </div>
        </section>

        {/* ── Section: Mood ───────────────────────────────────────────────── */}
        <section className="edit-profile__section">
          <h2 className="edit-profile__section-title">
            <span className="edit-profile__section-icon">🎭</span>
            {t('sections.mood.title')}
          </h2>

          <div className="edit-profile__field">
            <label className="edit-profile__label" htmlFor="edit-mood">
              {t('sections.mood.description')}
            </label>
            <input
              id="edit-mood"
              className="edit-profile__input"
              type="text"
              value={fields.mood}
              onChange={e => setField('mood', e.target.value)}
              placeholder={t('sections.mood.placeholder')}
              maxLength={80}
              dir="auto"
            />
          </div>

          <div className="edit-profile__field">
            <label className="edit-profile__label" htmlFor="edit-privacy-mood">
              {t('sections.mood.whoCanSee')}
            </label>
            <PrivacySelect
              id="edit-privacy-mood"
              value={fields.privacyMood}
              onChange={v => setField('privacyMood', v)}
              t={t}
            />
            {fields.privacyMood === 'private' && (
              <p className="edit-profile__hint edit-profile__hint--private">
                {t('sections.mood.hiddenNotice')}
              </p>
            )}
          </div>
        </section>

        {/* ── Section: Social Links ─────────────────────────────────────────────────────────── */}
        <section className="edit-profile__section">
          <h2 className="edit-profile__section-title">
            <span className="edit-profile__section-icon">🔗</span>
            {t('editprofile:socialLinks') || 'Social Links'}
          </h2>
          <p className="edit-profile__section-desc">
            {t('editprofile:socialLinksDesc') || 'Add your other platforms to your public profile.'}
          </p>

          <div className="edit-profile__social-grid">
            {['Instagram', 'Twitter', 'X', 'YouTube', 'TikTok', 'Facebook', 'LinkedIn', 'Website'].map(platform => {
              const key = platform.toLowerCase();
              return (
                <div className="edit-profile__field" key={key}>
                  <label className="edit-profile__label" htmlFor={`edit-social-${key}`}>
                    {platform}
                  </label>
                  <input
                    id={`edit-social-${key}`}
                    className="edit-profile__input"
                    type="url"
                    value={fields.socialLinks[key] || ''}
                    onChange={e => setField('socialLinks', { ...fields.socialLinks, [key]: e.target.value })}
                    placeholder={`https://${key}.com/username`}
                    dir="ltr"
                  />
                </div>
              );
            })}
          </div>
        </section>

        {/* ── Section: Privacy Settings ────────────────────────────────────── */}
        <section className="edit-profile__section">
          <h2 className="edit-profile__section-title">
            <span className="edit-profile__section-icon">🔐</span>
            {t('sections.privacy.title')}
          </h2>
          <p className="edit-profile__section-desc">
            {t('sections.privacy.description')}
          </p>

          <div className="edit-profile__privacy-grid">

            <div className="edit-profile__privacy-row">
              <div className="edit-profile__privacy-label">
                <span className="edit-profile__privacy-icon">📍</span>
                <span>{t('sections.privacy.activityStatus')}</span>
                <span className="edit-profile__privacy-desc">{t('sections.privacy.activityStatusDesc')}</span>
              </div>
              <PrivacySelect
                id="edit-privacy-activityStatus"
                value={fields.privacyActivityStatus}
                onChange={v => setField('privacyActivityStatus', v)}
                t={t}
              />
            </div>

            <div className="edit-profile__privacy-row">
              <div className="edit-profile__privacy-label">
                <span className="edit-profile__privacy-icon">🎧</span>
                <span>{t('sections.privacy.listeningActivity')}</span>
                <span className="edit-profile__privacy-desc">{t('sections.privacy.listeningActivityDesc')}</span>
              </div>
              <PrivacySelect
                id="edit-privacy-listeningActivity"
                value={fields.privacyListeningActivity}
                onChange={v => setField('privacyListeningActivity', v)}
                t={t}
              />
            </div>

            <div className="edit-profile__privacy-row">
              <div className="edit-profile__privacy-label">
                <span className="edit-profile__privacy-icon">🎵</span>
                <span>{t('sections.privacy.playlists')}</span>
                <span className="edit-profile__privacy-desc">{t('sections.privacy.playlistsDesc')}</span>
              </div>
              <PrivacySelect
                id="edit-privacy-musicPlaylists"
                value={fields.privacyMusicPlaylists}
                onChange={v => setField('privacyMusicPlaylists', v)}
                t={t}
              />
            </div>

            <div className="edit-profile__privacy-row">
              <div className="edit-profile__privacy-label">
                <span className="edit-profile__privacy-icon">📻</span>
                <span>{t('sections.privacy.radioContent')}</span>
                <span className="edit-profile__privacy-desc">{t('sections.privacy.radioContentDesc')}</span>
              </div>
              <PrivacySelect
                id="edit-privacy-radioCreatorContent"
                value={fields.privacyRadioCreatorContent}
                onChange={v => setField('privacyRadioCreatorContent', v)}
                t={t}
              />
            </div>

            <div className="edit-profile__privacy-row">
              <div className="edit-profile__privacy-label">
                <span className="edit-profile__privacy-icon">⭐</span>
                <span>{t('sections.privacy.plusContent')}</span>
                <span className="edit-profile__privacy-desc">{t('sections.privacy.plusContentDesc')}</span>
              </div>
              <PrivacySelect
                id="edit-privacy-plusCreatorContent"
                value={fields.privacyPlusCreatorContent}
                onChange={v => setField('privacyPlusCreatorContent', v)}
                t={t}
              />
            </div>

          </div>
        </section>

        {/* ── Save feedback ─────────────────────────────────────────────────── */}
        {saveState === 'error' && errorMessage && (
          <div className="edit-profile__banner edit-profile__banner--error" role="alert">
            ⚠️ {errorMessage}
          </div>
        )}

        {saveState === 'saved' && (
          <div className="edit-profile__banner edit-profile__banner--success" role="status">
            {t('actions.saved')}
          </div>
        )}

        {/* ── Actions ───────────────────────────────────────────────────────── */}
        <div className="edit-profile__actions">
          <button
            type="button"
            className="edit-profile__btn edit-profile__btn--secondary"
            onClick={() => navigate('/me')}
            id="edit-profile-view-public-btn"
          >
            {t('actions.viewPublicProfile')}
          </button>
          <button
            type="submit"
            className={`edit-profile__btn edit-profile__btn--primary${saveState === 'saving' ? ' edit-profile__btn--loading' : ''}`}
            disabled={saveState === 'saving'}
            id="edit-profile-save-btn"
          >
            {saveState === 'saving' ? (
              <><span className="edit-profile__spinner" aria-hidden="true" /> {t('actions.saving')}</>
            ) : (
              t('actions.saveChanges')
            )}
          </button>
        </div>

      </form>
    </div>
  );
}

// ─── PrivacySelect ────────────────────────────────────────────────────────────

function PrivacySelect({
  id,
  value,
  onChange,
  t,
}: {
  id: string;
  value: PrivacyLevel;
  onChange: (v: PrivacyLevel) => void;
  t: TFunction;
}) {
  const options = getPrivacyOptions(t);
  return (
    <select
      id={id}
      className="edit-profile__select"
      value={value}
      onChange={e => onChange(e.target.value as PrivacyLevel)}
    >
      {options.map(opt => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}
