/**
 * Sound Platform — General Me Page
 * ==================================
 * Route: /general/me
 * World: عام (General) — purple accent (#7c3aed)
 * Authority: SOUND_UI_FOUNDATION_AUTHORITY.md (2026-05-19)
 *
 * Owner-only surface. No follow / message-to-self.
 *
 * UI Foundation Mode — all tabs and filter controls visible.
 *
 * 10 tabs per authority:
 *   المحتوى | بودكاست | ترنداتي | مزاجي | المحفوظات
 *   الإعادات | الرحلات / الجلسات | المفضلة | السجل | الاشتراكات
 *
 * Privacy model:
 *   ✅ Reads publicProfiles/{uid}
 *   ❌ Never reads users/{uid}
 */

import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { usePublicProfile } from '../../hooks/usePublicProfile';
import { LoadingScreen } from '../../components/LoadingScreen';
import { EmptyState } from '../../components/EmptyState';
import { FilterDropdown, type FilterOption } from '../../components/FilterDropdown';
import type { PublicProfileDoc } from '@sound/shared';
import './GeneralMePage.css';

// ─── Tab Definition ────────────────────────────────────────────────────────────

type MeTab =
  | 'content'
  | 'podcast'
  | 'trends'
  | 'mood'
  | 'saved'
  | 'reposts'
  | 'journeys'
  | 'liked'
  | 'history'
  | 'subscriptions';

interface FilterDef {
  key: string;
  label: string;
  options: FilterOption[];
}

interface MeTabDef {
  id: MeTab;
  label: string;
  filters: FilterDef[];
}

// ─── Filter option helpers ─────────────────────────────────────────────────────
function opts(labels: string[]): FilterOption[] {
  return labels.map(l => ({ value: l, label: l }));
}

const ME_TABS: MeTabDef[] = [
  {
    id: 'content', label: 'المحتوى',
    filters: [
      { key: 'type',     label: 'نوع المحتوى', options: opts(['بودكاست','مقال صوتي','مقابلة','تسجيل','قصيرة']) },
      { key: 'status',   label: 'الحالة',       options: opts(['منشور','مسودة','مؤرشف']) },
      { key: 'category', label: 'التصنيف',      options: opts(['ثقافة','تقنية','رياضة','ترفيه','أخبار']) },
      { key: 'sort',     label: 'الترتيب',      options: opts(['الأحدث','الأقدم','الأكثر استماعاً','الأكثر إعجاباً']) },
    ],
  },
  {
    id: 'podcast', label: 'بودكاست',
    filters: [
      { key: 'status',   label: 'الحالة',   options: opts(['منشور','مسودة','مؤرشف']) },
      { key: 'category', label: 'التصنيف', options: opts(['ثقافة','تقنية','رياضة','ترفيه','أخبار']) },
      { key: 'sort',     label: 'الترتيب', options: opts(['الأحدث','الأقدم','الأكثر استماعاً']) },
    ],
  },
  {
    id: 'trends', label: 'ترنداتي',
    filters: [
      { key: 'period', label: 'الفترة',      options: opts(['اليوم','هذا الأسبوع','هذا الشهر']) },
      { key: 'type',   label: 'نوع المحتوى', options: opts(['بودكاست','قصيرة','مقالات']) },
      { key: 'sort',   label: 'الترتيب',     options: opts(['الأكثر استماعاً','الأكثر إعجاباً','الأكثر مشاركة']) },
    ],
  },
  {
    id: 'mood', label: 'مزاجي',
    filters: [
      { key: 'mood',   label: 'المزاج / الغرض', options: opts(['هادئ','نشيط','مركّز','مرح','حزين']) },
      { key: 'type',   label: 'نوع المحتوى',     options: opts(['موسيقى','بودكاست','صوتيات']) },
      { key: 'source', label: 'المصدر / العالم', options: opts(['عام','بلس','موسيقى','راديو']) },
      { key: 'sort',   label: 'الترتيب',         options: opts(['الأحدث','الأكثر استماعاً']) },
    ],
  },
  {
    id: 'saved', label: 'المحفوظات',
    filters: [
      { key: 'type', label: 'نوع المحتوى', options: opts(['بودكاست','موسيقى','راديو','مقالات']) },
      { key: 'cat',  label: 'التصنيف',     options: opts(['ثقافة','تقنية','ترفيه']) },
      { key: 'sort', label: 'الترتيب',     options: opts(['الأحدث','الأقدم']) },
    ],
  },
  {
    id: 'reposts', label: 'الإعادات',
    filters: [
      { key: 'type', label: 'نوع المحتوى', options: opts(['بودكاست','موسيقى','مقالات']) },
      { key: 'sort', label: 'الترتيب',     options: opts(['الأحدث','الأقدم']) },
    ],
  },
  {
    id: 'journeys', label: 'الرحلات / الجلسات',
    filters: [
      { key: 'type', label: 'نوع الرحلة', options: opts(['على الطريق','جلسة استماع','مختلطة']) },
      { key: 'date', label: 'التاريخ',    options: opts(['اليوم','هذا الأسبوع','هذا الشهر','أقدم']) },
      { key: 'sort', label: 'الترتيب',   options: opts(['الأحدث','الأقدم']) },
    ],
  },
  {
    id: 'liked', label: 'المفضلة',
    filters: [
      { key: 'type', label: 'نوع المحتوى', options: opts(['بودكاست','موسيقى','راديو','صوتيات']) },
      { key: 'cat',  label: 'التصنيف',     options: opts(['ثقافة','تقنية','ترفيه','رياضة']) },
      { key: 'sort', label: 'الترتيب',     options: opts(['الأحدث','الأقدم','الأكثر استماعاً']) },
    ],
  },
  {
    id: 'history', label: 'السجل',
    filters: [
      { key: 'type', label: 'نوع المحتوى', options: opts(['بودكاست','موسيقى','راديو']) },
      { key: 'date', label: 'التاريخ',     options: opts(['اليوم','هذا الأسبوع','هذا الشهر','أقدم']) },
      { key: 'sort', label: 'الترتيب',     options: opts(['الأحدث','الأقدم']) },
    ],
  },
  {
    id: 'subscriptions', label: 'الاشتراكات',
    filters: [
      { key: 'subType', label: 'نوع الاشتراك', options: opts(['شهري','سنوي','مدى الحياة']) },
      { key: 'status',  label: 'الحالة',        options: opts(['نشط','منتهي','مُلغى']) },
      { key: 'sort',    label: 'الترتيب',       options: opts(['الأحدث','الأقدم','تاريخ الانتهاء']) },
    ],
  },
];

// ─── Social icon map ───────────────────────────────────────────────────────────

const SOCIAL_ICON: Record<string, string> = {
  instagram:  'photo_camera',
  twitter:    'tag',
  x:          'tag',
  youtube:    'smart_display',
  spotify:    'music_note',
  soundcloud: 'volume_up',
  tiktok:     'music_video',
  website:    'language',
  link:       'link',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

// ─── Root Component ────────────────────────────────────────────────────────────

export function GeneralMePage() {
  const { currentUser } = useAuth();
  const profileState    = usePublicProfile(currentUser?.uid ?? null);

  if (profileState.status === 'loading') {
    return <LoadingScreen message="جاري تحميل ملفك الشخصي..." />;
  }

  if (profileState.status === 'error') {
    return (
      <div className="gme-page">
        <EmptyState icon="⚠️" title="حدث خطأ" description={profileState.message} />
      </div>
    );
  }

  if (profileState.status === 'not-found') {
    return (
      <div className="gme-page">
        <EmptyState
          icon="👤"
          title="ملفك الشخصي ليس جاهزاً بعد"
          description="سيتم إنشاء ملفك الشخصي العام تلقائياً"
        />
      </div>
    );
  }

  return <GeneralMeLoaded profile={profileState.profile} />;
}

// ─── Loaded View ──────────────────────────────────────────────────────────────

function GeneralMeLoaded({ profile }: { profile: PublicProfileDoc }) {
  const navigate              = useNavigate();
  const [activeTab, setActiveTab] = useState<MeTab>('content');

  // Per-tab, per-filter multi-select state: { tabId: { filterKey: string[] } }
  const [filterValues, setFilterValues] = useState<Record<string, Record<string, string[]>>>({});

  // Reset filters when tab changes
  const handleTabChange = useCallback((id: MeTab) => {
    setActiveTab(id);
    setFilterValues(prev => ({ ...prev, [id]: {} }));
  }, []);

  const currentTabDef = ME_TABS.find((t) => t.id === activeTab)!;

  const getValues = (filterKey: string): string[] =>
    filterValues[activeTab]?.[filterKey] ?? [];

  const handleToggle = useCallback((filterKey: string, value: string) => {
    setFilterValues(prev => {
      const tab   = prev[activeTab] ?? {};
      const cur   = tab[filterKey] ?? [];
      const next  = cur.includes(value) ? cur.filter(v => v !== value) : [...cur, value];
      return { ...prev, [activeTab]: { ...tab, [filterKey]: next } };
    });
  }, [activeTab]);

  const handleClear = useCallback((filterKey: string) => {
    setFilterValues(prev => {
      const tab = prev[activeTab] ?? {};
      return { ...prev, [activeTab]: { ...tab, [filterKey]: [] } };
    });
  }, [activeTab]);

  const general     = profile.generalProfile;
  const displayName = general?.displayName ?? 'مستخدم Sound';
  const username    = general?.username    ?? null;
  const bio         = general?.bio         ?? null;
  const avatarUrl   = general?.avatarUrl   ?? null;
  const isVerified  = general?.isVerified  ?? false;
  const socialLinks = general?.socialLinks ?? null;
  const hasLinks    = socialLinks && Object.keys(socialLinks).length > 0;

  const followers = fmt(general?.followersCount ?? 0);
  const following = fmt(general?.followingCount ?? 0);
  const listens   = fmt(general?.listensCount   ?? 0);
  const likes     = fmt(0); // likesCount — add to schema later

  return (
    <div className="gme-page">

      {/* ── Cover — extends behind header glass ────────────────────────── */}
      <div className="gme-cover" aria-hidden="true">
        <div className="gme-cover__fade" />
      </div>

      {/* ── Header utility controls — glass pill row ───────────────────── */}
      <div className="gme-header-controls">
        {/* Badges — right side (RTL start) */}
        <div className="gme-header-badges">
          {isVerified && (
            <span className="gme-badge gme-badge--verified">
              <span className="material-symbols-outlined" aria-hidden="true" dir="ltr">verified</span>
              موثق
            </span>
          )}
          <span className="gme-badge gme-badge--world">عام</span>
        </div>

        {/* Controls — left side (RTL end) */}
        <div className="gme-header-btns">
          <button
            id="gme-settings-btn"
            className="gme-hdr-btn"
            aria-label="الإعدادات"
            type="button"
            onClick={() => navigate('/settings')}
          >
            <span className="material-symbols-outlined" aria-hidden="true" dir="ltr">settings</span>
          </button>
          <button
            id="gme-notifications-btn"
            className="gme-hdr-btn"
            aria-label="الإشعارات"
            type="button"
          >
            <span className="material-symbols-outlined" aria-hidden="true" dir="ltr">notifications</span>
          </button>
          <button
            id="gme-inbox-btn"
            className="gme-hdr-btn"
            aria-label="الرسائل"
            type="button"
          >
            <span className="material-symbols-outlined" aria-hidden="true" dir="ltr">mail</span>
          </button>
        </div>
      </div>

      {/* ── Identity block ─────────────────────────────────────────────── */}
      <div className="gme-identity">

        {/* Avatar with animated story ring */}
        <div className="gme-avatar-wrap">
          <div className="gme-avatar-ring" aria-hidden="true" />
          <div className="gme-avatar">
            {avatarUrl ? (
              <img src={avatarUrl} alt={displayName} />
            ) : (
              <span className="gme-avatar__initial" aria-hidden="true">
                {displayName.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
        </div>

        {/* Text identity */}
        <div className="gme-identity__text">

          {/* Display name + verification */}
          <div className="gme-identity__name-row">
            <h1 className="gme-display-name">{displayName}</h1>
            {isVerified && (
              <span className="gme-verified-icon" aria-label="موثق">
                <span className="material-symbols-outlined" aria-hidden="true" dir="ltr">verified</span>
              </span>
            )}
          </div>

          {/* Username — LTR-isolated */}
          {username && (
            <p className="gme-username" dir="ltr">@{username}</p>
          )}

          {/* Bio */}
          {bio && <p className="gme-bio">{bio}</p>}

          {/* Status pill */}
          <button
            id="gme-status-btn"
            className="gme-status-pill"
            type="button"
            aria-label="تحديث الحالة"
          >
            <span className="material-symbols-outlined" aria-hidden="true" dir="ltr">edit_note</span>
            <span className="gme-status-pill__text">أضف تحديثاً للحالة…</span>
          </button>

          {/* Listening-now presence */}
          <div className="gme-listening-now" aria-label="أستمع الآن">
            <span className="gme-listening-dot" aria-hidden="true" />
            <span className="gme-listening-label">أستمع الآن</span>
            <span className="gme-listening-track">—</span>
          </div>

        </div>
      </div>

      {/* ── Stats ──────────────────────────────────────────────────────── */}
      <div className="gme-stats">
        {[
          { value: followers, label: 'متابعون'  },
          { value: following, label: 'يتابع'    },
          { value: listens,   label: 'استماع'   },
          { value: likes,     label: 'إعجاب'    },
        ].map((s) => (
          <div key={s.label} className="gme-stat">
            <span className="gme-stat__value">{s.value}</span>
            <span className="gme-stat__label">{s.label}</span>
          </div>
        ))}
      </div>

      {/* ── Edit profile + share ────────────────────────────────────────── */}
      <div className="gme-actions">
        <button
          id="gme-edit-profile-btn"
          className="gme-btn gme-btn--edit"
          type="button"
          onClick={() => navigate('/settings/edit-profile')}
        >
          <span className="material-symbols-outlined" aria-hidden="true" dir="ltr">edit</span>
          تعديل الملف الشخصي
        </button>
        <button
          id="gme-share-btn"
          className="gme-btn gme-btn--ghost"
          type="button"
          aria-label="مشاركة الملف"
        >
          <span className="material-symbols-outlined" aria-hidden="true" dir="ltr">share</span>
        </button>
      </div>

      {/* ── Social links ────────────────────────────────────────────────── */}
      <div className="gme-social">
        {hasLinks ? (
          Object.entries(socialLinks!).map(([platform, url]) => {
            const icon = SOCIAL_ICON[platform.toLowerCase()] ?? 'link';
            return (
              <a
                key={platform}
                href={typeof url === 'string' ? url : '#'}
                className="gme-social__link"
                target="_blank"
                rel="noopener noreferrer"
                aria-label={platform}
              >
                <span className="material-symbols-outlined" aria-hidden="true" dir="ltr">{icon}</span>
              </a>
            );
          })
        ) : (
          <span className="gme-social__hint">أضف روابطك في تعديل الملف الشخصي</span>
        )}
      </div>

      {/* ── Content Tabs ────────────────────────────────────────────────── */}
      <nav
        className="gme-tabs"
        role="tablist"
        aria-label="محتوى الملف الشخصي"
      >
        {ME_TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            id={`gme-tab-${t.id}`}
            aria-selected={activeTab === t.id}
            aria-controls={`gme-panel-${t.id}`}
            className={`gme-tab${activeTab === t.id ? ' gme-tab--active' : ''}`}
            onClick={() => handleTabChange(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {/* ── Smart Filter Dropdowns ────────────────────────────────────────── */}
      {currentTabDef.filters.length > 0 && (
        <div className="gme-filters" role="group" aria-label="فلاتر المحتوى">
          {currentTabDef.filters.map((f) => (
            <FilterDropdown
              key={`${activeTab}-${f.key}`}
              label={f.label}
              options={f.options}
              values={getValues(f.key)}
              onToggle={(v) => handleToggle(f.key, v)}
              onClear={() => handleClear(f.key)}
            />
          ))}
        </div>
      )}

      {/* ── Tab Panel ───────────────────────────────────────────────────── */}
      <div
        role="tabpanel"
        id={`gme-panel-${activeTab}`}
        aria-labelledby={`gme-tab-${activeTab}`}
        className="gme-panel"
      >
        <MeTabPanel tab={activeTab} navigate={navigate} />
      </div>

    </div>
  );
}

// ─── Tab Panel Content ────────────────────────────────────────────────────────

function MeTabPanel({
  tab,
  navigate,
}: {
  tab: MeTab;
  navigate: ReturnType<typeof useNavigate>;
}) {
  switch (tab) {
    case 'content':
      return (
        <EmptyState
          icon="🎙️"
          title="لم تنشر أي محتوى بعد"
          description="ابدأ بنشر تسجيلاتك الصوتية"
          action={{ label: 'إنشاء محتوى', onClick: () => navigate('/general/create') }}
        />
      );
    case 'podcast':
      return (
        <EmptyState
          icon="🎧"
          title="لا توجد حلقات بودكاست بعد"
          description="انشر أول حلقة بودكاست"
          action={{ label: 'إنشاء بودكاست', onClick: () => navigate('/general/create') }}
        />
      );
    case 'trends':
      return (
        <EmptyState
          icon="📈"
          title="لا توجد ترندات بعد"
          description="محتواك الرائج سيظهر هنا"
        />
      );
    case 'mood':
      return (
        <EmptyState
          icon="🎭"
          title="لا توجد قوائم مزاجية بعد"
          description="أنشئ قوائم تعبر عن مزاجك وأفكارك"
        />
      );
    case 'saved':
      return (
        <EmptyState
          icon="🔖"
          title="لا يوجد محفوظات"
          description="احفظ المحتوى الذي تريد الرجوع إليه"
        />
      );
    case 'reposts':
      return (
        <EmptyState
          icon="🔄"
          title="لا توجد إعادات"
          description="المحتوى الذي تعيد نشره سيظهر هنا"
        />
      );
    case 'journeys':
      return (
        <EmptyState
          icon="🚗"
          title="لا توجد رحلات أو جلسات بعد"
          description="جلسات الاستماع على الطريق ستظهر هنا"
        />
      );
    case 'liked':
      return (
        <EmptyState
          icon="❤️"
          title="لا يوجد مفضلة بعد"
          description="المحتوى الذي أعجبك سيظهر هنا"
        />
      );
    case 'history':
      return (
        <EmptyState
          icon="🕐"
          title="سجل الاستماع فارغ"
          description="المحتوى الذي استمعت إليه سيظهر هنا"
        />
      );
    case 'subscriptions':
      return (
        <EmptyState
          icon="⭐"
          title="لا توجد اشتراكات بعد"
          description="اشتراكاتك وعضوياتك ستظهر هنا"
        />
      );
    default:
      return null;
  }
}
