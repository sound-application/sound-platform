/**
 * Sound Platform — Privacy Settings Page
 * =========================================
 * Phase:   5-C-2 (Dedicated Privacy Settings UI)
 * Updated: 2026-05-14
 *
 * PRIVACY MODEL (Phase 4-H-2 — MANDATORY):
 *   ✅ Reads from:   users/{currentUser.uid}     — owner-allowed by Firestore rules
 *   ✅ Writes to:    users/{currentUser.uid}      — only privacy.* dot-path fields
 *   ❌ NEVER reads:  users/{otherUid}             — denied by rules
 *   ❌ NEVER writes: publicProfiles/{uid}         — Cloud Function only (rules deny)
 *
 * PUBLIC SYNC:
 *   onUserProfileUpdate Cloud Function fires on every users/{uid} write.
 *   It reads privacy settings and rebuilds publicProfiles/{uid} accordingly.
 *   Hidden sections are ABSENT from publicProfiles — not just empty.
 *   Latency: ~5–10 seconds (Gen1 Firestore trigger, europe-west1).
 *
 * SECTIONS CONTROLLED (all 12 PrivacySection values supported here):
 *   generalProfile, mood, listeningActivity, followedRadioStations,
 *   followedRadioStationLists, musicPlaylists, activityStatus,
 *   pinnedContent, achievements, plusCreatorContent,
 *   musicCreatorContent, radioCreatorContent
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, updateDoc } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { usePrivateProfile } from '../hooks/usePrivateProfile';
import { db } from '../lib/firebase';
import { LoadingScreen } from '../components/LoadingScreen';
import type { PrivacyLevel, PrivacySettings } from '@sound/shared';
import './PrivacySettingsPage.css';
import './Page.css';

// ─── Types ────────────────────────────────────────────────────────────────────

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

/**
 * Local form state — mirrors only the privacy sub-fields.
 * Server-only fields are never loaded into this state.
 */
type LocalPrivacy = {
  generalProfile: PrivacyLevel;
  mood: PrivacyLevel;
  activityStatus: PrivacyLevel;
  listeningActivity: PrivacyLevel;
  followedRadioStations: PrivacyLevel;
  followedRadioStationLists: PrivacyLevel;
  musicPlaylists: PrivacyLevel;
  pinnedContent: PrivacyLevel;
  achievements: PrivacyLevel;
  plusCreatorContent: PrivacyLevel;
  musicCreatorContent: PrivacyLevel;
  radioCreatorContent: PrivacyLevel;
};

const DEFAULT_PRIVACY: LocalPrivacy = {
  generalProfile:           'public',
  mood:                     'public',
  activityStatus:           'public',
  listeningActivity:        'public',
  followedRadioStations:    'public',
  followedRadioStationLists:'public',
  musicPlaylists:           'public',
  pinnedContent:            'public',
  achievements:             'public',
  plusCreatorContent:       'public',
  musicCreatorContent:      'public',
  radioCreatorContent:      'public',
};

// ─── Section Definitions ──────────────────────────────────────────────────────

interface SectionDef {
  key: keyof LocalPrivacy;
  icon: string;
  label: string;
  desc: string;
  group: 'identity' | 'activity' | 'content' | 'creator';
  /** If true, always shown even when privacy=private */
  alwaysPublic?: boolean;
}

const PRIVACY_SECTIONS: SectionDef[] = [
  // ── Identity ──────────────────────────────────────────────────────────
  {
    key: 'generalProfile',
    icon: '👤',
    label: 'الملف العام',
    desc: 'الاسم، النبذة، الصورة، الإحصائيات',
    group: 'identity',
    alwaysPublic: true,
  },
  {
    key: 'mood',
    icon: '🎭',
    label: 'الحالة المزاجية',
    desc: 'وصف حالتك الحالية',
    group: 'identity',
  },
  {
    key: 'activityStatus',
    icon: '📍',
    label: 'حالة النشاط',
    desc: 'متصل / غير متصل',
    group: 'identity',
  },
  {
    key: 'pinnedContent',
    icon: '📌',
    label: 'المحتوى المثبَّت',
    desc: 'العنصر الذي ثبَّته في ملفك',
    group: 'identity',
  },
  {
    key: 'achievements',
    icon: '🏆',
    label: 'الإنجازات والشارات',
    desc: 'شاراتك ونقاط الإنجاز',
    group: 'identity',
  },

  // ── Activity ──────────────────────────────────────────────────────────
  {
    key: 'listeningActivity',
    icon: '🎧',
    label: 'نشاط الاستماع',
    desc: 'آخر ما استمعت إليه، إجمالي الوقت',
    group: 'activity',
  },
  {
    key: 'followedRadioStations',
    icon: '📻',
    label: 'محطات الراديو المتابَعة',
    desc: 'قائمة المحطات التي تتابعها',
    group: 'activity',
  },
  {
    key: 'followedRadioStationLists',
    icon: '📋',
    label: 'قوائم الراديو المتابَعة',
    desc: 'قوائم المحطات التي تتابعها',
    group: 'activity',
  },
  {
    key: 'musicPlaylists',
    icon: '🎵',
    label: 'قوائم التشغيل',
    desc: 'القوائم الموسيقية العامة',
    group: 'activity',
  },

  // ── Creator ───────────────────────────────────────────────────────────
  {
    key: 'plusCreatorContent',
    icon: '⭐',
    label: 'محتوى Plus',
    desc: 'المحتوى الحصري الذي تنشره',
    group: 'creator',
  },
  {
    key: 'musicCreatorContent',
    icon: '🎼',
    label: 'محتوى الموسيقى',
    desc: 'الأغاني والألبومات التي تنشرها',
    group: 'creator',
  },
  {
    key: 'radioCreatorContent',
    icon: '🎙️',
    label: 'محتوى الراديو',
    desc: 'محطاتك، برامجك، وحلقاتك',
    group: 'creator',
  },
];

const GROUP_LABELS: Record<SectionDef['group'], string> = {
  identity: '👤 الهوية والحضور',
  activity: '🎧 النشاط والتفاعل',
  content:  '📦 المحتوى',
  creator:  '🎙️ محتوى المنشئ',
};

// ─── Privacy Options ──────────────────────────────────────────────────────────

const PRIVACY_OPTIONS: { value: PrivacyLevel; label: string; icon: string; color: string }[] = [
  { value: 'public',    label: 'عام',          icon: '🌐', color: 'public'    },
  { value: 'followers', label: 'المتابعون',    icon: '👥', color: 'followers' },
  { value: 'private',   label: 'أنا فقط',      icon: '🔒', color: 'private'   },
];

// ─── Component ────────────────────────────────────────────────────────────────

export function PrivacySettingsPage() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const uid = currentUser?.uid ?? null;

  // ── Read own private document (owner-only) ────────────────────────────────
  const profileState = usePrivateProfile(uid);

  // ── Local form state ──────────────────────────────────────────────────────
  const [privacy, setPrivacy] = useState<LocalPrivacy>(DEFAULT_PRIVACY);
  const [initialized, setInitialized] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  // ── Populate from private doc when loaded ──────────────────────────────────
  useEffect(() => {
    if (profileState.status === 'loaded' && !initialized) {
      const p: PrivacySettings = profileState.data.privacy;
      setPrivacy({
        generalProfile:            p.generalProfile            ?? 'public',
        mood:                      p.mood                      ?? 'public',
        activityStatus:            p.activityStatus            ?? 'public',
        listeningActivity:         p.listeningActivity         ?? 'public',
        followedRadioStations:     p.followedRadioStations     ?? 'public',
        followedRadioStationLists: p.followedRadioStationLists ?? 'public',
        musicPlaylists:            p.musicPlaylists            ?? 'public',
        pinnedContent:             p.pinnedContent             ?? 'public',
        achievements:              p.achievements              ?? 'public',
        plusCreatorContent:        p.plusCreatorContent        ?? 'public',
        musicCreatorContent:       p.musicCreatorContent       ?? 'public',
        radioCreatorContent:       p.radioCreatorContent       ?? 'public',
      });
      setInitialized(true);
    }
  }, [profileState, initialized]);

  // ── Section change handler ────────────────────────────────────────────────
  function handleSectionChange(key: keyof LocalPrivacy, value: PrivacyLevel) {
    setPrivacy(prev => ({ ...prev, [key]: value }));
    if (saveState === 'saved' || saveState === 'error') setSaveState('idle');
  }

  // ── Save handler ──────────────────────────────────────────────────────────
  async function handleSave() {
    if (!uid) return;
    setSaveState('saving');
    setErrorMessage('');

    try {
      // ✅ Write ONLY to users/{currentUser.uid} — privacy.* dot-paths only
      // ❌ NEVER write to publicProfiles/{uid} — Cloud Function handles sync
      const userRef = doc(db, 'users', uid);
      await updateDoc(userRef, {
        'privacy.generalProfile':            privacy.generalProfile,
        'privacy.mood':                      privacy.mood,
        'privacy.activityStatus':            privacy.activityStatus,
        'privacy.listeningActivity':         privacy.listeningActivity,
        'privacy.followedRadioStations':     privacy.followedRadioStations,
        'privacy.followedRadioStationLists': privacy.followedRadioStationLists,
        'privacy.musicPlaylists':            privacy.musicPlaylists,
        'privacy.pinnedContent':             privacy.pinnedContent,
        'privacy.achievements':              privacy.achievements,
        'privacy.plusCreatorContent':        privacy.plusCreatorContent,
        'privacy.musicCreatorContent':       privacy.musicCreatorContent,
        'privacy.radioCreatorContent':       privacy.radioCreatorContent,
      });
      setSaveState('saved');
    } catch (err: unknown) {
      console.error('[PrivacySettingsPage] Failed to update privacy settings:', err);
      const msg = err instanceof Error ? err.message : 'حدث خطأ غير متوقع';
      setErrorMessage(msg);
      setSaveState('error');
    }
  }

  // ─── Loading states ───────────────────────────────────────────────────────

  if (!uid) return <LoadingScreen message="جاري التحقق من الجلسة..." />;
  if (profileState.status === 'loading') return <LoadingScreen message="جاري تحميل إعدادات الخصوصية..." />;

  if (profileState.status === 'error') {
    return (
      <div className="page privacy-settings-page">
        <div className="privacy-settings__error-banner" role="alert">
          ⚠️ فشل تحميل البيانات: {profileState.message}
        </div>
      </div>
    );
  }

  if (profileState.status === 'not-found') {
    return (
      <div className="page privacy-settings-page">
        <div className="privacy-settings__error-banner" role="alert">
          ⚠️ لم يتم العثور على ملفك الشخصي — يرجى المحاولة لاحقاً
        </div>
      </div>
    );
  }

  // ─── Group sections ───────────────────────────────────────────────────────

  const groups: SectionDef['group'][] = ['identity', 'activity', 'creator'];
  const grouped = groups.map(g => ({
    group: g,
    label: GROUP_LABELS[g],
    sections: PRIVACY_SECTIONS.filter(s => s.group === g),
  }));

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="page privacy-settings-page">

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="privacy-settings__header">
        <button
          className="privacy-settings__back-btn"
          onClick={() => navigate(-1)}
          aria-label="العودة"
          id="privacy-settings-back-btn"
        >
          ←
        </button>
        <div className="privacy-settings__header-text">
          <h1 className="privacy-settings__title">إعدادات الخصوصية</h1>
          <p className="privacy-settings__subtitle">
            تحكَّم في من يستطيع رؤية كل قسم من ملفك الشخصي
          </p>
        </div>
      </div>

      {/* ── Sync notice ───────────────────────────────────────────────────── */}
      <div className="privacy-settings__sync-notice" role="note">
        <span className="privacy-settings__sync-icon">⏱</span>
        <span>
          بعد الحفظ، تُطبَّق التغييرات على ملفك العام خلال{' '}
          <strong>5–10 ثوان</strong> عبر نظام المزامنة.
        </span>
      </div>

      {/* ── Privacy level legend ───────────────────────────────────────────── */}
      <div className="privacy-settings__legend" aria-label="توضيح مستويات الخصوصية">
        {PRIVACY_OPTIONS.map(opt => (
          <div key={opt.value} className={`privacy-settings__legend-item privacy-settings__legend-item--${opt.color}`}>
            <span className="privacy-settings__legend-icon">{opt.icon}</span>
            <span className="privacy-settings__legend-label">{opt.label}</span>
          </div>
        ))}
      </div>

      {/* ── Section groups ────────────────────────────────────────────────── */}
      {grouped.map(({ group, label, sections }) => (
        <section key={group} className="privacy-settings__group">
          <h2 className="privacy-settings__group-title">{label}</h2>

          <div className="privacy-settings__section-list">
            {sections.map(sec => (
              <div key={sec.key} className="privacy-settings__section-row">

                {/* Label side */}
                <div className="privacy-settings__section-label">
                  <span className="privacy-settings__section-icon" aria-hidden="true">
                    {sec.icon}
                  </span>
                  <div className="privacy-settings__section-text">
                    <span className="privacy-settings__section-name">{sec.label}</span>
                    <span className="privacy-settings__section-desc">{sec.desc}</span>
                  </div>
                </div>

                {/* Segmented control */}
                <PrivacySegmented
                  id={`privacy-${sec.key}`}
                  value={privacy[sec.key]}
                  onChange={v => handleSectionChange(sec.key, v)}
                  disabled={sec.alwaysPublic}
                />

              </div>
            ))}
          </div>
        </section>
      ))}

      {/* ── Feedback banners ──────────────────────────────────────────────── */}
      {saveState === 'error' && errorMessage && (
        <div className="privacy-settings__banner privacy-settings__banner--error" role="alert">
          ⚠️ {errorMessage}
        </div>
      )}

      {saveState === 'saved' && (
        <div className="privacy-settings__banner privacy-settings__banner--success" role="status">
          ✅ تم حفظ إعدادات الخصوصية — سيتم تحديث ملفك العام خلال 5–10 ثوان
        </div>
      )}

      {/* ── Actions ───────────────────────────────────────────────────────── */}
      <div className="privacy-settings__actions">
        <button
          type="button"
          className="privacy-settings__btn privacy-settings__btn--secondary"
          onClick={() => navigate('/me')}
          id="privacy-settings-view-public-btn"
        >
          👁 عرض الملف العام
        </button>
        <button
          type="button"
          className={`privacy-settings__btn privacy-settings__btn--primary${saveState === 'saving' ? ' privacy-settings__btn--loading' : ''}`}
          onClick={handleSave}
          disabled={saveState === 'saving'}
          id="privacy-settings-save-btn"
        >
          {saveState === 'saving' ? (
            <><span className="privacy-settings__spinner" aria-hidden="true" /> جاري الحفظ...</>
          ) : (
            'حفظ التغييرات'
          )}
        </button>
      </div>

    </div>
  );
}

// ─── PrivacySegmented ─────────────────────────────────────────────────────────
// Three-option segmented control (عام / المتابعون / أنا فقط)

function PrivacySegmented({
  id,
  value,
  onChange,
  disabled,
}: {
  id: string;
  value: PrivacyLevel;
  onChange: (v: PrivacyLevel) => void;
  disabled?: boolean;
}) {
  return (
    <div
      className={`privacy-seg${disabled ? ' privacy-seg--disabled' : ''}`}
      role="group"
      aria-label="مستوى الخصوصية"
    >
      {PRIVACY_OPTIONS.map(opt => (
        <button
          key={opt.value}
          type="button"
          id={`${id}-${opt.value}`}
          className={`privacy-seg__btn privacy-seg__btn--${opt.color}${value === opt.value ? ' privacy-seg__btn--active' : ''}`}
          onClick={() => !disabled && onChange(opt.value)}
          aria-pressed={value === opt.value}
          disabled={disabled}
          title={disabled ? 'هذا القسم دائماً مرئي للعموم' : opt.label}
        >
          <span className="privacy-seg__icon">{opt.icon}</span>
          <span className="privacy-seg__label">{opt.label}</span>
        </button>
      ))}
    </div>
  );
}
