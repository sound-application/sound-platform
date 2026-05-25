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
import './EditProfilePage.css';
import './Page.css';

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
  // Privacy section levels
  privacyMood: PrivacyLevel;
  privacyActivityStatus: PrivacyLevel;
  privacyListeningActivity: PrivacyLevel;
  privacyMusicPlaylists: PrivacyLevel;
  privacyRadioCreatorContent: PrivacyLevel;
  privacyPlusCreatorContent: PrivacyLevel;
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

// ─── Privacy Select ───────────────────────────────────────────────────────────

const PRIVACY_OPTIONS: { value: PrivacyLevel; label: string }[] = [
  { value: 'public',    label: '🌐 عام — مرئي للجميع' },
  { value: 'followers', label: '👥 المتابعون فقط' },
  { value: 'private',   label: '🔒 خاص — مخفي' },
];

// ─── Component ────────────────────────────────────────────────────────────────

export function EditProfilePage() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
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
    if (!trimmedName) { setErrorMessage('الاسم المعروض مطلوب'); setSaveState('error'); return; }
    if (!trimmedUsername) { setErrorMessage('اسم المستخدم مطلوب'); setSaveState('error'); return; }
    if (trimmedUsername.length < 3) { setErrorMessage('اسم المستخدم يجب أن يكون 3 أحرف على الأقل'); setSaveState('error'); return; }

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
      const msg = err instanceof Error ? err.message : 'حدث خطأ';
      setErrorMessage(msg);
      setSaveState('error');
    }
  }

  // ─── Loading ─────────────────────────────────────────────────────────────────
  if (!uid) {
    return <LoadingScreen message="جاري التحقق من الجلسة..." />;
  }

  if (profileState.status === 'loading') {
    return <LoadingScreen message="جاري تحميل بيانات الملف الشخصي..." />;
  }

  if (profileState.status === 'error') {
    return (
      <div className="page edit-profile-page">
        <div className="edit-profile__error-banner" role="alert">
          ⚠️ فشل تحميل البيانات: {profileState.message}
        </div>
      </div>
    );
  }

  if (profileState.status === 'not-found') {
    return (
      <div className="page edit-profile-page">
        <div className="edit-profile__error-banner" role="alert">
          ⚠️ لم يتم العثور على ملفك الشخصي — يرجى المحاولة لاحقاً
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
          aria-label="العودة"
          id="edit-profile-back-btn"
        >
          ←
        </button>
        <h1 className="edit-profile__title">تعديل الملف الشخصي</h1>
      </div>

      {/* ── Sync notice ──────────────────────────────────────────────────── */}
      <div className="edit-profile__sync-notice" role="note">
        <span className="edit-profile__sync-icon">⏱</span>
        <span>
          بعد الحفظ، يُحدَّث الملف الشخصي العام تلقائياً خلال <strong>5–10 ثوان</strong> عبر نظام المزامنة.
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
            المعلومات الأساسية
          </h2>

          <div className="edit-profile__field">
            <label className="edit-profile__label" htmlFor="edit-displayName">
              الاسم المعروض <span className="edit-profile__required">*</span>
            </label>
            <input
              id="edit-displayName"
              className="edit-profile__input"
              type="text"
              value={fields.displayName}
              onChange={e => setField('displayName', e.target.value)}
              placeholder="اسمك كما يظهر للآخرين"
              maxLength={50}
              required
              dir="auto"
            />
          </div>

          <div className="edit-profile__field">
            <label className="edit-profile__label" htmlFor="edit-username">
              اسم المستخدم <span className="edit-profile__required">*</span>
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
              أحرف إنجليزية صغيرة، أرقام، وشرطة سفلية فقط
            </p>
          </div>

          <div className="edit-profile__field">
            <label className="edit-profile__label" htmlFor="edit-bio">
              نبذة شخصية
            </label>
            <textarea
              id="edit-bio"
              className="edit-profile__textarea"
              value={fields.bio}
              onChange={e => setField('bio', e.target.value)}
              placeholder="اكتب نبذة قصيرة عنك..."
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
            الحالة المزاجية
          </h2>

          <div className="edit-profile__field">
            <label className="edit-profile__label" htmlFor="edit-mood">
              وصف الحالة
            </label>
            <input
              id="edit-mood"
              className="edit-profile__input"
              type="text"
              value={fields.mood}
              onChange={e => setField('mood', e.target.value)}
              placeholder="مثال: أستمع إلى موسيقى الجاز 🎷"
              maxLength={80}
              dir="auto"
            />
          </div>

          <div className="edit-profile__field">
            <label className="edit-profile__label" htmlFor="edit-privacy-mood">
              من يرى حالتك المزاجية؟
            </label>
            <PrivacySelect
              id="edit-privacy-mood"
              value={fields.privacyMood}
              onChange={v => setField('privacyMood', v)}
            />
            {fields.privacyMood === 'private' && (
              <p className="edit-profile__hint edit-profile__hint--private">
                🔒 حالتك المزاجية ستُخفى من ملفك الشخصي العام بعد الحفظ
              </p>
            )}
          </div>
        </section>

        {/* ── Section: Privacy Settings ────────────────────────────────────── */}
        <section className="edit-profile__section">
          <h2 className="edit-profile__section-title">
            <span className="edit-profile__section-icon">🔐</span>
            إعدادات الخصوصية
          </h2>
          <p className="edit-profile__section-desc">
            حدد من يستطيع رؤية كل قسم من ملفك الشخصي.
            الأقسام المخفية تختفي كلياً من العرض العام.
          </p>

          <div className="edit-profile__privacy-grid">

            <div className="edit-profile__privacy-row">
              <div className="edit-profile__privacy-label">
                <span className="edit-profile__privacy-icon">📍</span>
                <span>حالة النشاط</span>
                <span className="edit-profile__privacy-desc">(متصل / غير متصل)</span>
              </div>
              <PrivacySelect
                id="edit-privacy-activityStatus"
                value={fields.privacyActivityStatus}
                onChange={v => setField('privacyActivityStatus', v)}
              />
            </div>

            <div className="edit-profile__privacy-row">
              <div className="edit-profile__privacy-label">
                <span className="edit-profile__privacy-icon">🎧</span>
                <span>نشاط الاستماع</span>
                <span className="edit-profile__privacy-desc">(آخر ما استمعت إليه)</span>
              </div>
              <PrivacySelect
                id="edit-privacy-listeningActivity"
                value={fields.privacyListeningActivity}
                onChange={v => setField('privacyListeningActivity', v)}
              />
            </div>

            <div className="edit-profile__privacy-row">
              <div className="edit-profile__privacy-label">
                <span className="edit-profile__privacy-icon">🎵</span>
                <span>قوائم التشغيل</span>
                <span className="edit-profile__privacy-desc">(القوائم العامة)</span>
              </div>
              <PrivacySelect
                id="edit-privacy-musicPlaylists"
                value={fields.privacyMusicPlaylists}
                onChange={v => setField('privacyMusicPlaylists', v)}
              />
            </div>

            <div className="edit-profile__privacy-row">
              <div className="edit-profile__privacy-label">
                <span className="edit-profile__privacy-icon">📻</span>
                <span>محتوى الراديو</span>
                <span className="edit-profile__privacy-desc">(المحطات والبرامج)</span>
              </div>
              <PrivacySelect
                id="edit-privacy-radioCreatorContent"
                value={fields.privacyRadioCreatorContent}
                onChange={v => setField('privacyRadioCreatorContent', v)}
              />
            </div>

            <div className="edit-profile__privacy-row">
              <div className="edit-profile__privacy-label">
                <span className="edit-profile__privacy-icon">⭐</span>
                <span>محتوى Plus</span>
                <span className="edit-profile__privacy-desc">(المحتوى الحصري)</span>
              </div>
              <PrivacySelect
                id="edit-privacy-plusCreatorContent"
                value={fields.privacyPlusCreatorContent}
                onChange={v => setField('privacyPlusCreatorContent', v)}
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
            ✅ تم الحفظ — سيتم تحديث ملفك العام خلال 5–10 ثوان
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
            عرض الملف العام
          </button>
          <button
            type="submit"
            className={`edit-profile__btn edit-profile__btn--primary${saveState === 'saving' ? ' edit-profile__btn--loading' : ''}`}
            disabled={saveState === 'saving'}
            id="edit-profile-save-btn"
          >
            {saveState === 'saving' ? (
              <><span className="edit-profile__spinner" aria-hidden="true" /> جاري الحفظ...</>
            ) : (
              'حفظ التغييرات'
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
}: {
  id: string;
  value: PrivacyLevel;
  onChange: (v: PrivacyLevel) => void;
}) {
  return (
    <select
      id={id}
      className="edit-profile__select"
      value={value}
      onChange={e => onChange(e.target.value as PrivacyLevel)}
    >
      {PRIVACY_OPTIONS.map(opt => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}
