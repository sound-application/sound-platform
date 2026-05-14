/**
 * Sound Platform — Privacy Settings Page
 * =========================================
 * Phase:   5-C-3 (Privacy Audience Model Upgrade)
 * Updated: 2026-05-14
 *
 * PRIVACY MODEL (Phase 5-C-3 — MANDATORY):
 *   ✅ Reads from:   users/{currentUser.uid}     — owner-allowed by Firestore rules
 *   ✅ Writes to:    users/{currentUser.uid}      — only privacy.* dot-path fields
 *   ❌ NEVER reads:  users/{otherUid}             — denied by rules
 *   ❌ NEVER writes: publicProfiles/{uid}         — Cloud Function only (rules deny)
 *
 * AUDIENCE MODEL (Phase 5-C-3):
 *   Each section stores { audiences: PrivacyAudience[], customListIds?: string[] }
 *
 *   Exclusive audiences (clear all others when selected):
 *     - 'public'  → everyone
 *     - 'onlyMe'  → fully private
 *
 *   Combinable audiences (can be combined freely):
 *     - 'friends'   → mutual followers
 *     - 'followers' → users who follow me
 *     - 'following' → users I follow
 *     - 'custom'    → named custom list (customListIds)
 *
 * PUBLIC SYNC:
 *   onUserProfileUpdate Cloud Function fires on every users/{uid} write.
 *   Only sections with audiences=['public'] appear in publicProfiles/{uid}.
 *   All other combos produce ABSENT sections in the public projection.
 *   Latency: ~5–10 seconds (Gen1 Firestore trigger, europe-west1).
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, updateDoc } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { usePrivateProfile } from '../hooks/usePrivateProfile';
import { db } from '../lib/firebase';
import { LoadingScreen } from '../components/LoadingScreen';
import type { PrivacyAudience, SectionPrivacy } from '@sound/shared';
import { migratePrivacyLevel } from '@sound/shared';
import './PrivacySettingsPage.css';
import './Page.css';

// ─── Types ────────────────────────────────────────────────────────────────────

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

/** Local form state — mirrors only the privacy sub-fields. */
type LocalPrivacyKey =
  | 'generalProfile'
  | 'mood'
  | 'activityStatus'
  | 'listeningActivity'
  | 'followedRadioStations'
  | 'followedRadioStationLists'
  | 'musicPlaylists'
  | 'pinnedContent'
  | 'achievements'
  | 'plusCreatorContent'
  | 'musicCreatorContent'
  | 'radioCreatorContent';

type LocalPrivacy = Record<LocalPrivacyKey, SectionPrivacy>;

const PUBLIC_SP:  SectionPrivacy = { audiences: ['public'] };
const ONLY_ME_SP: SectionPrivacy = { audiences: ['onlyMe'] };

const DEFAULT_PRIVACY: LocalPrivacy = {
  generalProfile:            PUBLIC_SP,
  mood:                      PUBLIC_SP,
  activityStatus:            PUBLIC_SP,
  listeningActivity:         PUBLIC_SP,
  followedRadioStations:     PUBLIC_SP,
  followedRadioStationLists: PUBLIC_SP,
  musicPlaylists:            PUBLIC_SP,
  pinnedContent:             PUBLIC_SP,
  achievements:              PUBLIC_SP,
  plusCreatorContent:        PUBLIC_SP,
  musicCreatorContent:       PUBLIC_SP,
  radioCreatorContent:       PUBLIC_SP,
};

// ─── Audience Definitions ─────────────────────────────────────────────────────

interface AudienceDef {
  value: PrivacyAudience;
  label: string;
  icon: string;
  exclusive: boolean;   // true = clears all others on select
  colorClass: string;
}

const AUDIENCES: AudienceDef[] = [
  { value: 'public',    label: 'عام',           icon: '🌐', exclusive: true,  colorClass: 'aud--public'    },
  { value: 'friends',   label: 'الأصدقاء',      icon: '🤝', exclusive: false, colorClass: 'aud--friends'   },
  { value: 'followers', label: 'المتابعون',      icon: '👥', exclusive: false, colorClass: 'aud--followers' },
  { value: 'following', label: 'المتابَعون',     icon: '🔔', exclusive: false, colorClass: 'aud--following' },
  { value: 'custom',    label: 'قائمة مخصصة',   icon: '📋', exclusive: false, colorClass: 'aud--custom'    },
  { value: 'onlyMe',    label: 'أنا فقط',       icon: '🔒', exclusive: true,  colorClass: 'aud--onlyme'    },
];

// ─── Section Definitions ──────────────────────────────────────────────────────

interface SectionDef {
  key: LocalPrivacyKey;
  icon: string;
  label: string;
  desc: string;
  group: 'identity' | 'activity' | 'creator';
  alwaysPublic?: boolean;
}

const PRIVACY_SECTIONS: SectionDef[] = [
  // ── Identity ──────────────────────────────────────────────────────────
  { key: 'generalProfile',           icon: '👤', label: 'الملف العام',                desc: 'الاسم، النبذة، الصورة، الإحصائيات',     group: 'identity', alwaysPublic: true },
  { key: 'mood',                     icon: '🎭', label: 'الحالة المزاجية',           desc: 'وصف حالتك الحالية',                      group: 'identity' },
  { key: 'activityStatus',           icon: '📍', label: 'حالة النشاط',               desc: 'متصل / غير متصل',                        group: 'identity' },
  { key: 'pinnedContent',            icon: '📌', label: 'المحتوى المثبَّت',           desc: 'العنصر الذي ثبَّته في ملفك',            group: 'identity' },
  { key: 'achievements',             icon: '🏆', label: 'الإنجازات والشارات',         desc: 'شاراتك ونقاط الإنجاز',                  group: 'identity' },
  // ── Activity ──────────────────────────────────────────────────────────
  { key: 'listeningActivity',        icon: '🎧', label: 'نشاط الاستماع',             desc: 'آخر ما استمعت إليه، إجمالي الوقت',      group: 'activity' },
  { key: 'followedRadioStations',    icon: '📻', label: 'محطات الراديو المتابَعة',   desc: 'قائمة المحطات التي تتابعها',            group: 'activity' },
  { key: 'followedRadioStationLists',icon: '📋', label: 'قوائم الراديو المتابَعة',   desc: 'قوائم المحطات التي تتابعها',            group: 'activity' },
  { key: 'musicPlaylists',           icon: '🎵', label: 'قوائم التشغيل',             desc: 'القوائم الموسيقية العامة',               group: 'activity' },
  // ── Creator ───────────────────────────────────────────────────────────
  { key: 'plusCreatorContent',       icon: '⭐', label: 'محتوى Plus',               desc: 'المحتوى الحصري الذي تنشره',              group: 'creator' },
  { key: 'musicCreatorContent',      icon: '🎼', label: 'محتوى الموسيقى',           desc: 'الأغاني والألبومات التي تنشرها',         group: 'creator' },
  { key: 'radioCreatorContent',      icon: '🎙️', label: 'محتوى الراديو',            desc: 'محطاتك، برامجك، وحلقاتك',              group: 'creator' },
];

const GROUP_LABELS: Record<SectionDef['group'], string> = {
  identity: '👤 الهوية والحضور',
  activity: '🎧 النشاط والتفاعل',
  creator:  '🎙️ محتوى المنشئ',
};

// ─── Audience toggle logic ────────────────────────────────────────────────────

function toggleAudience(current: SectionPrivacy, toggled: PrivacyAudience): SectionPrivacy {
  const def = AUDIENCES.find(a => a.value === toggled)!;

  // If already selected: deselect (but keep at least one audience)
  if (current.audiences.includes(toggled)) {
    const remaining = current.audiences.filter(a => a !== toggled);
    // Never allow empty — fall back to onlyMe if everything removed
    if (remaining.length === 0) return ONLY_ME_SP;
    return { ...current, audiences: remaining };
  }

  // Exclusive: clear all others
  if (def.exclusive) {
    return toggled === 'custom'
      ? { audiences: [toggled], customListIds: current.customListIds ?? [] }
      : { audiences: [toggled] };
  }

  // Combinable: remove any existing exclusive tokens, add new one
  const nonExclusive = current.audiences.filter(a => {
    const d = AUDIENCES.find(x => x.value === a);
    return d ? !d.exclusive : true;
  });
  return { ...current, audiences: [...nonExclusive, toggled] };
}

/** Returns a human-readable summary of the current SectionPrivacy. */
function summarizeAudiences(sp: SectionPrivacy): string {
  if (sp.audiences.length === 0) return 'أنا فقط';
  const labels = sp.audiences.map(a => AUDIENCES.find(d => d.value === a)?.label ?? a);
  return labels.join(' + ');
}

/** Returns true if section would appear in publicProfiles. */
function isPublicProjected(sp: SectionPrivacy): boolean {
  return sp.audiences.includes('public');
}

// ─── Component ────────────────────────────────────────────────────────────────

export function PrivacySettingsPage() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const uid = currentUser?.uid ?? null;

  const profileState = usePrivateProfile(uid);
  const [privacy, setPrivacy] = useState<LocalPrivacy>(DEFAULT_PRIVACY);
  const [initialized, setInitialized] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  // ── Populate from private doc when loaded ────────────────────────────────
  useEffect(() => {
    if (profileState.status === 'loaded' && !initialized) {
      const p = profileState.data.privacy;
      setPrivacy({
        generalProfile:            migratePrivacyLevel(p.generalProfile            as Parameters<typeof migratePrivacyLevel>[0]),
        mood:                      migratePrivacyLevel(p.mood                      as Parameters<typeof migratePrivacyLevel>[0]),
        activityStatus:            migratePrivacyLevel(p.activityStatus            as Parameters<typeof migratePrivacyLevel>[0]),
        listeningActivity:         migratePrivacyLevel(p.listeningActivity         as Parameters<typeof migratePrivacyLevel>[0]),
        followedRadioStations:     migratePrivacyLevel(p.followedRadioStations     as Parameters<typeof migratePrivacyLevel>[0]),
        followedRadioStationLists: migratePrivacyLevel(p.followedRadioStationLists as Parameters<typeof migratePrivacyLevel>[0]),
        musicPlaylists:            migratePrivacyLevel(p.musicPlaylists            as Parameters<typeof migratePrivacyLevel>[0]),
        pinnedContent:             migratePrivacyLevel(p.pinnedContent             as Parameters<typeof migratePrivacyLevel>[0]),
        achievements:              migratePrivacyLevel(p.achievements              as Parameters<typeof migratePrivacyLevel>[0]),
        plusCreatorContent:        migratePrivacyLevel(p.plusCreatorContent        as Parameters<typeof migratePrivacyLevel>[0]),
        musicCreatorContent:       migratePrivacyLevel(p.musicCreatorContent       as Parameters<typeof migratePrivacyLevel>[0]),
        radioCreatorContent:       migratePrivacyLevel(p.radioCreatorContent       as Parameters<typeof migratePrivacyLevel>[0]),
      });
      setInitialized(true);
    }
  }, [profileState, initialized]);

  // ── Audience toggle handler ───────────────────────────────────────────────
  function handleToggle(key: LocalPrivacyKey, audience: PrivacyAudience) {
    setPrivacy(prev => ({
      ...prev,
      [key]: toggleAudience(prev[key], audience),
    }));
    if (saveState === 'saved' || saveState === 'error') setSaveState('idle');
  }

  // ── Save handler ─────────────────────────────────────────────────────────
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

  // ─── Loading / error states ───────────────────────────────────────────────

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

      {/* ── Header ──────────────────────────────────────────────────────────── */}
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
            اختَر الجمهور الذي يرى كل قسم من ملفك — يمكن دمج أكثر من خيار
          </p>
        </div>
      </div>

      {/* ── Sync notice ─────────────────────────────────────────────────────── */}
      <div className="privacy-settings__sync-notice" role="note">
        <span className="privacy-settings__sync-icon">⏱</span>
        <span>
          بعد الحفظ، تُطبَّق التغييرات على ملفك العام خلال{' '}
          <strong>5–10 ثوان</strong> عبر نظام المزامنة.
          فقط <strong>«عام»</strong> يُظهر القسم في ملفك المرئي للجميع.
        </span>
      </div>

      {/* ── Audience legend ──────────────────────────────────────────────────── */}
      <div className="privacy-settings__legend" aria-label="توضيح خيارات الجمهور">
        {AUDIENCES.map(a => (
          <div key={a.value} className={`privacy-settings__legend-item ${a.colorClass}`}>
            <span className="privacy-settings__legend-icon">{a.icon}</span>
            <span className="privacy-settings__legend-label">{a.label}</span>
            {a.exclusive && (
              <span className="privacy-settings__legend-badge">حصري</span>
            )}
          </div>
        ))}
      </div>

      {/* ── Section groups ────────────────────────────────────────────────────── */}
      {grouped.map(({ group, label, sections }) => (
        <section key={group} className="privacy-settings__group">
          <h2 className="privacy-settings__group-title">{label}</h2>

          <div className="privacy-settings__section-list">
            {sections.map(sec => {
              const sp = privacy[sec.key];
              const isPublic = isPublicProjected(sp);

              return (
                <div key={sec.key} className="privacy-settings__section-row">

                  {/* Label + projection indicator */}
                  <div className="privacy-settings__section-label">
                    <span className="privacy-settings__section-icon" aria-hidden="true">
                      {sec.icon}
                    </span>
                    <div className="privacy-settings__section-text">
                      <div className="privacy-settings__section-name-row">
                        <span className="privacy-settings__section-name">{sec.label}</span>
                        {sec.alwaysPublic ? (
                          <span className="privacy-settings__always-public-badge">دائماً عام</span>
                        ) : (
                          <span className={`privacy-settings__projection-dot ${isPublic ? 'dot--public' : 'dot--hidden'}`}
                            title={isPublic ? 'مرئي في ملفك العام' : 'مخفي من ملفك العام'}
                          />
                        )}
                      </div>
                      <span className="privacy-settings__section-desc">{sec.desc}</span>
                      {!sec.alwaysPublic && (
                        <span className="privacy-settings__section-summary">
                          {summarizeAudiences(sp)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Audience chip grid */}
                  {!sec.alwaysPublic && (
                    <AudienceChips
                      id={`privacy-${sec.key}`}
                      value={sp}
                      onToggle={(aud) => handleToggle(sec.key, aud)}
                    />
                  )}

                </div>
              );
            })}
          </div>
        </section>
      ))}

      {/* ── Feedback banners ────────────────────────────────────────────────── */}
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

      {/* ── Actions ─────────────────────────────────────────────────────────── */}
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

// ─── AudienceChips ─────────────────────────────────────────────────────────────
// Multi-select chip row for audience selection.
// Exclusive chips clear all others; combinable chips stack.

function AudienceChips({
  id,
  value,
  onToggle,
}: {
  id: string;
  value: SectionPrivacy;
  onToggle: (aud: PrivacyAudience) => void;
}) {
  return (
    <div className="audience-chips" role="group" aria-label="اختيار الجمهور" id={id}>
      {AUDIENCES.map(def => {
        const active = value.audiences.includes(def.value);
        return (
          <button
            key={def.value}
            type="button"
            id={`${id}-${def.value}`}
            className={`audience-chip ${def.colorClass}${active ? ' audience-chip--active' : ''}${def.exclusive ? ' audience-chip--exclusive' : ''}`}
            onClick={() => onToggle(def.value)}
            aria-pressed={active}
            title={def.exclusive ? `${def.label} (حصري — يلغي باقي الخيارات)` : def.label}
          >
            <span className="audience-chip__icon">{def.icon}</span>
            <span className="audience-chip__label">{def.label}</span>
            {def.exclusive && <span className="audience-chip__dot" />}
          </button>
        );
      })}
    </div>
  );
}
