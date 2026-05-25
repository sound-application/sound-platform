/**
 * Sound Platform — Plus Me Page
 * ==============================
 * Route: /plus/me
 * World: بلس (Plus) — gold accent (#f59e0b / #fbbf24)
 * Authority: SOUND_UI_FOUNDATION_AUTHORITY.md (2026-05-19)
 *
 * Owner-only surface. No follow / message-to-self.
 *
 * UI Foundation Mode — all tabs and filter controls visible.
 *
 * 10 tabs per authority (shared with عام):
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
import './PlusMePage.css';

// ─── Tab Definition ────────────────────────────────────────────────────────────

type PlusTab =
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

interface PlusTabDef {
  id: PlusTab;
  label: string;
  filters: FilterDef[];
}

function opts(labels: string[]): FilterOption[] {
  return labels.map(l => ({ value: l, label: l }));
}

const PLUS_TABS: PlusTabDef[] = [
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

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

// ─── Root Component ────────────────────────────────────────────────────────────

export function PlusMePage() {
  const { currentUser } = useAuth();
  const profileState    = usePublicProfile(currentUser?.uid ?? null);

  if (profileState.status === 'loading') {
    return <LoadingScreen message="جاري تحميل ملفك الشخصي..." />;
  }

  if (profileState.status === 'error') {
    return (
      <div className="pme-page">
        <EmptyState icon="⚠️" title="حدث خطأ" description={profileState.message} />
      </div>
    );
  }

  if (profileState.status === 'not-found') {
    return (
      <div className="pme-page">
        <EmptyState
          icon="👤"
          title="ملفك الشخصي ليس جاهزاً بعد"
          description="سيتم إنشاء ملفك الشخصي العام تلقائياً"
        />
      </div>
    );
  }

  return <PlusMeLoaded profile={profileState.profile} />;
}

// ─── Loaded View ──────────────────────────────────────────────────────────────

function PlusMeLoaded({ profile }: { profile: PublicProfileDoc }) {
  const navigate                        = useNavigate();
  const [activeTab, setActiveTab]       = useState<PlusTab>('content');
  const [filterValues, setFilterValues] = useState<Record<string, Record<string, string[]>>>({});

  const handleTabChange = useCallback((id: PlusTab) => {
    setActiveTab(id);
    setFilterValues(prev => ({ ...prev, [id]: {} }));
  }, []);

  const currentTabDef = PLUS_TABS.find((t) => t.id === activeTab)!;

  const getValues = (filterKey: string): string[] =>
    filterValues[activeTab]?.[filterKey] ?? [];

  const handleToggle = useCallback((filterKey: string, value: string) => {
    setFilterValues(prev => {
      const tab  = prev[activeTab] ?? {};
      const cur  = tab[filterKey] ?? [];
      const next = cur.includes(value) ? cur.filter(v => v !== value) : [...cur, value];
      return { ...prev, [activeTab]: { ...tab, [filterKey]: next } };
    });
  }, [activeTab]);

  const handleClear = useCallback((filterKey: string) => {
    setFilterValues(prev => {
      const tab = prev[activeTab] ?? {};
      return { ...prev, [activeTab]: { ...tab, [filterKey]: [] } };
    });
  }, [activeTab]);

  const plusProfile = (profile as any).plusProfile ?? (profile as any).generalProfile;
  const displayName = plusProfile?.displayName ?? 'مستخدم Sound';
  const username    = plusProfile?.username    ?? null;
  const bio         = plusProfile?.bio         ?? null;
  const avatarUrl   = plusProfile?.avatarUrl   ?? null;
  const isVerified  = plusProfile?.isVerified  ?? false;
  const socialLinks = plusProfile?.socialLinks ?? null;
  const hasLinks    = socialLinks && Object.keys(socialLinks).length > 0;

  const followers = fmt(plusProfile?.followersCount ?? 0);
  const following = fmt(plusProfile?.followingCount ?? 0);
  const listens   = fmt(plusProfile?.listensCount   ?? 0);
  const likes     = fmt(0);

  return (
    <div className="pme-page">

      {/* ── Cover — extends behind header glass ────────────────────────── */}
      <div className="pme-cover" aria-hidden="true">
        <div className="pme-cover__fade" />
      </div>

      {/* ── Header utility controls — glass pill row ───────────────────── */}
      <div className="pme-header-controls">
        {/* Badges — right side (RTL start) */}
        <div className="pme-header-badges">
          {isVerified && (
            <span className="pme-badge pme-badge--verified">
              <span className="material-symbols-outlined" aria-hidden="true" dir="ltr">verified</span>
              موثق
            </span>
          )}
          <span className="pme-badge pme-badge--world">✦ بلس</span>
        </div>

        {/* Controls — left side (RTL end) */}
        <div className="pme-header-btns">
          <button
            id="pme-settings-btn"
            className="pme-hdr-btn"
            aria-label="الإعدادات"
            type="button"
            onClick={() => navigate('/settings')}
          >
            <span className="material-symbols-outlined" aria-hidden="true" dir="ltr">settings</span>
          </button>
          <button
            id="pme-notifications-btn"
            className="pme-hdr-btn"
            aria-label="الإشعارات"
            type="button"
          >
            <span className="material-symbols-outlined" aria-hidden="true" dir="ltr">notifications</span>
          </button>
          <button
            id="pme-inbox-btn"
            className="pme-hdr-btn"
            aria-label="الرسائل"
            type="button"
          >
            <span className="material-symbols-outlined" aria-hidden="true" dir="ltr">mail</span>
          </button>
        </div>
      </div>

      {/* ── Identity block ─────────────────────────────────────────────── */}
      <div className="pme-identity">

        {/* Avatar with animated gold story ring */}
        <div className="pme-avatar-wrap">
          <div className="pme-avatar-ring" aria-hidden="true" />
          <div className="pme-avatar">
            {avatarUrl ? (
              <img src={avatarUrl} alt={displayName} />
            ) : (
              <span className="pme-avatar__initial" aria-hidden="true">
                {displayName.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
        </div>

        {/* Text identity */}
        <div className="pme-identity__text">

          {/* Display name + verification */}
          <div className="pme-identity__name-row">
            <h1 className="pme-display-name">{displayName}</h1>
            {isVerified && (
              <span className="pme-verified-icon" aria-label="موثق">
                <span className="material-symbols-outlined" aria-hidden="true" dir="ltr">verified</span>
              </span>
            )}
          </div>

          {/* Username — LTR-isolated */}
          {username && (
            <p className="pme-username" dir="ltr">@{username}</p>
          )}

          {/* Bio */}
          {bio && <p className="pme-bio">{bio}</p>}

          {/* Status pill */}
          <button
            id="pme-status-btn"
            className="pme-status-pill"
            type="button"
            aria-label="تحديث الحالة"
          >
            <span className="material-symbols-outlined" aria-hidden="true" dir="ltr">edit_note</span>
            <span className="pme-status-pill__text">أضف تحديثاً للحالة…</span>
          </button>

          {/* Listening-now presence */}
          <div className="pme-listening-now" aria-label="أستمع الآن">
            <span className="pme-listening-dot" aria-hidden="true" />
            <span className="pme-listening-label">أستمع الآن</span>
            <span className="pme-listening-track">—</span>
          </div>

        </div>
      </div>

      {/* ── Stats ──────────────────────────────────────────────────────── */}
      <div className="pme-stats">
        {[
          { value: followers, label: 'متابعون' },
          { value: following, label: 'يتابع'   },
          { value: listens,   label: 'استماع'  },
          { value: likes,     label: 'إعجاب'   },
        ].map((s) => (
          <div key={s.label} className="pme-stat">
            <span className="pme-stat__value">{s.value}</span>
            <span className="pme-stat__label">{s.label}</span>
          </div>
        ))}
      </div>

      {/* ── Edit profile + share ────────────────────────────────────────── */}
      <div className="pme-actions">
        <button
          id="pme-edit-profile-btn"
          className="pme-btn pme-btn--edit"
          type="button"
          onClick={() => navigate('/settings/edit-profile')}
        >
          <span className="material-symbols-outlined" aria-hidden="true" dir="ltr">edit</span>
          تعديل الملف الشخصي
        </button>
        <button
          id="pme-share-btn"
          className="pme-btn pme-btn--ghost"
          type="button"
          aria-label="مشاركة الملف"
        >
          <span className="material-symbols-outlined" aria-hidden="true" dir="ltr">share</span>
        </button>
      </div>

      {/* ── Social links ────────────────────────────────────────────────── */}
      <div className="pme-social">
        {hasLinks ? (
          Object.entries(socialLinks!).map(([platform, url]) => {
            const icon = SOCIAL_ICON[platform.toLowerCase()] ?? 'link';
            return (
              <a
                key={platform}
                href={typeof url === 'string' ? url : '#'}
                className="pme-social__link"
                target="_blank"
                rel="noopener noreferrer"
                aria-label={platform}
              >
                <span className="material-symbols-outlined" aria-hidden="true" dir="ltr">{icon}</span>
              </a>
            );
          })
        ) : (
          <span className="pme-social__hint">أضف روابطك في تعديل الملف الشخصي</span>
        )}
      </div>

      {/* ── Content Tabs ────────────────────────────────────────────────── */}
      <nav
        className="pme-tabs"
        role="tablist"
        aria-label="محتوى ملف بلس"
      >
        {PLUS_TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            id={`pme-tab-${t.id}`}
            aria-selected={activeTab === t.id}
            aria-controls={`pme-panel-${t.id}`}
            className={`pme-tab${activeTab === t.id ? ' pme-tab--active' : ''}`}
            onClick={() => handleTabChange(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {/* ── Smart Filter Dropdowns ────────────────────────────────────────── */}
      {currentTabDef.filters.length > 0 && (
        <div className="pme-filters" role="group" aria-label="فلاتر المحتوى">
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
        id={`pme-panel-${activeTab}`}
        aria-labelledby={`pme-tab-${activeTab}`}
        className="pme-panel"
      >
        <PlusTabPanel tab={activeTab} navigate={navigate} />
      </div>

    </div>
  );
}

// ─── Tab Panel Content ────────────────────────────────────────────────────────

function PlusTabPanel({
  tab,
  navigate,
}: {
  tab: PlusTab;
  navigate: ReturnType<typeof useNavigate>;
}) {
  switch (tab) {
    case 'content':
      return (
        <EmptyState
          icon="🎙️"
          title="لم تنشر أي محتوى بعد"
          description="ابدأ بنشر محتواك على بلس"
          action={{ label: 'إنشاء محتوى', onClick: () => navigate('/plus/create') }}
        />
      );
    case 'podcast':
      return (
        <EmptyState
          icon="🎧"
          title="لا توجد حلقات بودكاست بعد"
          description="انشر أول حلقة بودكاست على بلس"
          action={{ label: 'إنشاء بودكاست', onClick: () => navigate('/plus/create') }}
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
