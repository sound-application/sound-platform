/**
 * Sound Platform — Music Me Page
 * ================================
 * Route: /music/me
 * World: موسيقى (Music) — emerald accent (#10b981)
 * Authority: SOUND_UI_FOUNDATION_AUTHORITY.md (2026-05-19)
 *
 * Owner-only surface. No follow / message-to-self.
 *
 * 12 tabs — authority §8 موسيقى:
 *   أغاني | ألبومات | شركات الإنتاج | ترنداتي
 *   مزاجي | المحفوظات | الإعادات | الاشتراكات
 *   الرحلات / الجلسات | المفضلة | الأخيرة | سجل الاستماع
 *
 * UI Foundation Mode: all tabs visible regardless of schema/data readiness.
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
import './MusicMePage.css';

// ─── Tab Definition ────────────────────────────────────────────────────────────

// Authority §8 موسيقى — exact 12-tab order
type MusicTab =
  | 'songs'         // أغاني
  | 'albums'        // ألبومات
  | 'labels'        // شركات الإنتاج
  | 'trends'        // ترنداتي
  | 'mood'          // مزاجي
  | 'saved'         // المحفوظات
  | 'reposts'       // الإعادات
  | 'subscriptions' // الاشتراكات
  | 'journeys'      // الرحلات / الجلسات
  | 'liked'         // المفضلة
  | 'recent'        // الأخيرة
  | 'history';      // سجل الاستماع

interface FilterDef {
  key: string;
  label: string;
  options: FilterOption[];
}

interface MusicTabDef {
  id: MusicTab;
  label: string;
  filters: FilterDef[];
}

function opts(labels: string[]): FilterOption[] {
  return labels.map(l => ({ value: l, label: l }));
}

// Authority §8 موسيقى — 12-tab order (UI Foundation Mode: all visible)
const MUSIC_TABS: MusicTabDef[] = [
  {
    id: 'songs', label: 'أغاني',
    filters: [
      { key: 'status',   label: 'الحالة',    options: opts(['منشور','مسودة','مؤرشف']) },
      { key: 'category', label: 'التصنيف',   options: opts(['بوب','روك','خليجي','كلاسيك','إلكترونية']) },
      { key: 'country',  label: 'البلد',     options: opts(['السعودية','مصر','الإمارات','الكويت','المغرب']) },
      { key: 'sort',     label: 'الترتيب',   options: opts(['الأحدث','الأقدم','الأكثر استماعاً','الأكثر إعجاباً']) },
    ],
  },
  {
    id: 'albums', label: 'ألبومات',
    filters: [
      { key: 'status', label: 'الحالة',  options: opts(['منشور','مسودة','مؤرشف']) },
      { key: 'year',   label: 'السنة',   options: opts(['2025','2024','2023','2022','أقدم']) },
      { key: 'sort',   label: 'الترتيب', options: opts(['الأحدث','الأقدم','الأكثر استماعاً']) },
    ],
  },
  {
    id: 'labels', label: 'شركات الإنتاج',
    filters: [
      { key: 'status', label: 'الحالة',   options: opts(['نشط','سابق']) },
      { key: 'sort',   label: 'الترتيب',  options: opts(['الأحدث','الأقدم']) },
    ],
  },
  {
    id: 'trends', label: 'ترنداتي',
    filters: [
      { key: 'period',   label: 'الفترة',     options: opts(['اليوم','هذا الأسبوع','هذا الشهر']) },
      { key: 'category', label: 'التصنيف',    options: opts(['بوب','روك','خليجي','كلاسيك']) },
      { key: 'sort',     label: 'الترتيب',    options: opts(['الأكثر استماعاً','الأكثر إعجاباً']) },
    ],
  },
  {
    id: 'mood', label: 'مزاجي',
    filters: [
      { key: 'mood',   label: 'المزاج',         options: opts(['هادئ','نشيط','مركّز','مرح','حزين']) },
      { key: 'type',   label: 'نوع المحتوى',     options: opts(['موسيقى','بودكاست','صوتيات']) },
      { key: 'sort',   label: 'الترتيب',         options: opts(['الأحدث','الأكثر استماعاً']) },
    ],
  },
  {
    id: 'saved', label: 'المحفوظات',
    filters: [
      { key: 'type', label: 'نوع المحتوى', options: opts(['أغنية','ألبوم','بودكاست']) },
      { key: 'cat',  label: 'التصنيف',     options: opts(['بوب','خليجي','كلاسيك']) },
      { key: 'sort', label: 'الترتيب',     options: opts(['الأحدث','الأقدم']) },
    ],
  },
  {
    id: 'reposts', label: 'الإعادات',
    filters: [
      { key: 'type', label: 'نوع المحتوى', options: opts(['أغنية','ألبوم']) },
      { key: 'sort', label: 'الترتيب',     options: opts(['الأحدث','الأقدم']) },
    ],
  },
  {
    id: 'subscriptions', label: 'الاشتراكات',
    filters: [
      { key: 'type', label: 'نوع الاشتراك', options: opts(['فنان','ألبوم','قناة']) },
      { key: 'sort', label: 'الترتيب',      options: opts(['الأحدث','الأقدم']) },
    ],
  },
  {
    id: 'journeys', label: 'الرحلات / الجلسات',
    filters: [
      { key: 'type', label: 'نوع الجلسة', options: opts(['رحلة','مزاج','مخصصة']) },
      { key: 'sort', label: 'الترتيب',    options: opts(['الأحدث','الأقدم','الأطول']) },
    ],
  },
  {
    id: 'liked', label: 'المفضلة',
    filters: [
      { key: 'type', label: 'نوع المحتوى', options: opts(['أغنية','ألبوم','بودكاست']) },
      { key: 'cat',  label: 'التصنيف',     options: opts(['بوب','خليجي','كلاسيك']) },
      { key: 'sort', label: 'الترتيب',     options: opts(['الأحدث','الأقدم','الأكثر استماعاً']) },
    ],
  },
  {
    id: 'recent', label: 'الأخيرة',
    filters: [
      { key: 'type', label: 'نوع المحتوى', options: opts(['أغنية','ألبوم','فنان']) },
      { key: 'date', label: 'التاريخ',     options: opts(['اليوم','هذا الأسبوع','هذا الشهر']) },
      { key: 'sort', label: 'الترتيب',     options: opts(['الأحدث','الأقدم']) },
    ],
  },
  {
    id: 'history', label: 'سجل الاستماع',
    filters: [
      { key: 'type', label: 'نوع المحتوى', options: opts(['أغنية','ألبوم','بودكاست']) },
      { key: 'date', label: 'التاريخ',     options: opts(['اليوم','هذا الأسبوع','هذا الشهر','أقدم']) },
      { key: 'sort', label: 'الترتيب',     options: opts(['الأحدث','الأقدم']) },
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

export function MusicMePage() {
  const { currentUser } = useAuth();
  const profileState    = usePublicProfile(currentUser?.uid ?? null);

  if (profileState.status === 'loading') {
    return <LoadingScreen message="جاري تحميل ملفك الشخصي..." />;
  }

  if (profileState.status === 'error') {
    return (
      <div className="mme-page">
        <EmptyState icon="⚠️" title="حدث خطأ" description={profileState.message} />
      </div>
    );
  }

  if (profileState.status === 'not-found') {
    return (
      <div className="mme-page">
        <EmptyState
          icon="👤"
          title="ملفك الشخصي ليس جاهزاً بعد"
          description="سيتم إنشاء ملفك الشخصي العام تلقائياً"
        />
      </div>
    );
  }

  return <MusicMeLoaded profile={profileState.profile} />;
}

// ─── Loaded View ──────────────────────────────────────────────────────────────

function MusicMeLoaded({ profile }: { profile: PublicProfileDoc }) {
  const navigate                        = useNavigate();
  const [activeTab, setActiveTab]       = useState<MusicTab>('songs'); // authority default: first tab
  const [filterValues, setFilterValues] = useState<Record<string, Record<string, string[]>>>({});

  const handleTabChange = useCallback((id: MusicTab) => {
    setActiveTab(id);
    setFilterValues(prev => ({ ...prev, [id]: {} }));
  }, []);

  const currentTabDef = MUSIC_TABS.find((t) => t.id === activeTab)!;

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

  const musicProfile = (profile as any).musicProfile ?? (profile as any).generalProfile;
  const displayName  = musicProfile?.displayName ?? 'مستخدم Sound';
  const username     = musicProfile?.username    ?? null;
  const bio          = musicProfile?.bio         ?? null;
  const avatarUrl    = musicProfile?.avatarUrl   ?? null;
  const isVerified   = musicProfile?.isVerified  ?? false;
  const socialLinks  = musicProfile?.socialLinks ?? null;
  const hasLinks     = socialLinks && Object.keys(socialLinks).length > 0;

  const followers = fmt(musicProfile?.followersCount ?? 0);
  const following = fmt(musicProfile?.followingCount ?? 0);
  const listens   = fmt(musicProfile?.listensCount   ?? 0);
  const likes     = fmt(0);

  return (
    <div className="mme-page">

      {/* ── Cover — extends behind header glass ────────────────────────── */}
      <div className="mme-cover" aria-hidden="true">
        <div className="mme-cover__fade" />
      </div>

      {/* ── Header utility controls — glass pill row ───────────────────── */}
      <div className="mme-header-controls">
        {/* Badges — right side (RTL start) */}
        <div className="mme-header-badges">
          {isVerified && (
            <span className="mme-badge mme-badge--verified">
              <span className="material-symbols-outlined" aria-hidden="true" dir="ltr">verified</span>
              موثق
            </span>
          )}
          <span className="mme-badge mme-badge--world">♪ موسيقى</span>
        </div>

        {/* Controls — left side (RTL end) */}
        <div className="mme-header-btns">
          <button
            id="mme-settings-btn"
            className="mme-hdr-btn"
            aria-label="الإعدادات"
            type="button"
            onClick={() => navigate('/settings')}
          >
            <span className="material-symbols-outlined" aria-hidden="true" dir="ltr">settings</span>
          </button>
          <button
            id="mme-notifications-btn"
            className="mme-hdr-btn"
            aria-label="الإشعارات"
            type="button"
          >
            <span className="material-symbols-outlined" aria-hidden="true" dir="ltr">notifications</span>
          </button>
          <button
            id="mme-inbox-btn"
            className="mme-hdr-btn"
            aria-label="الرسائل"
            type="button"
          >
            <span className="material-symbols-outlined" aria-hidden="true" dir="ltr">mail</span>
          </button>
        </div>
      </div>

      {/* ── Identity block ─────────────────────────────────────────────── */}
      <div className="mme-identity">

        {/* Avatar with animated emerald story ring */}
        <div className="mme-avatar-wrap">
          <div className="mme-avatar-ring" aria-hidden="true" />
          <div className="mme-avatar">
            {avatarUrl ? (
              <img src={avatarUrl} alt={displayName} />
            ) : (
              <span className="mme-avatar__initial" aria-hidden="true">
                {displayName.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
        </div>

        {/* Text identity */}
        <div className="mme-identity__text">

          {/* Display name + verification */}
          <div className="mme-identity__name-row">
            <h1 className="mme-display-name">{displayName}</h1>
            {isVerified && (
              <span className="mme-verified-icon" aria-label="موثق">
                <span className="material-symbols-outlined" aria-hidden="true" dir="ltr">verified</span>
              </span>
            )}
          </div>

          {/* Username — LTR-isolated */}
          {username && (
            <p className="mme-username" dir="ltr">@{username}</p>
          )}

          {/* Bio */}
          {bio && <p className="mme-bio">{bio}</p>}

          {/* Status pill */}
          <button
            id="mme-status-btn"
            className="mme-status-pill"
            type="button"
            aria-label="تحديث الحالة"
          >
            <span className="material-symbols-outlined" aria-hidden="true" dir="ltr">edit_note</span>
            <span className="mme-status-pill__text">أضف تحديثاً للحالة…</span>
          </button>

          {/* Listening-now presence */}
          <div className="mme-listening-now" aria-label="أستمع الآن">
            <span className="mme-listening-dot" aria-hidden="true" />
            <span className="mme-listening-label">أستمع الآن</span>
            <span className="mme-listening-track">—</span>
          </div>

        </div>
      </div>

      {/* ── Stats ──────────────────────────────────────────────────────── */}
      <div className="mme-stats">
        {[
          { value: followers, label: 'متابعون' },
          { value: following, label: 'يتابع'   },
          { value: listens,   label: 'استماع'  },
          { value: likes,     label: 'إعجاب'   },
        ].map((s) => (
          <div key={s.label} className="mme-stat">
            <span className="mme-stat__value">{s.value}</span>
            <span className="mme-stat__label">{s.label}</span>
          </div>
        ))}
      </div>

      {/* ── Edit profile + share ────────────────────────────────────────── */}
      <div className="mme-actions">
        <button
          id="mme-edit-profile-btn"
          className="mme-btn mme-btn--edit"
          type="button"
          onClick={() => navigate('/settings/edit-profile')}
        >
          <span className="material-symbols-outlined" aria-hidden="true" dir="ltr">edit</span>
          تعديل الملف الشخصي
        </button>
        <button
          id="mme-share-btn"
          className="mme-btn mme-btn--ghost"
          type="button"
          aria-label="مشاركة الملف"
        >
          <span className="material-symbols-outlined" aria-hidden="true" dir="ltr">share</span>
        </button>
      </div>

      {/* ── Social links ────────────────────────────────────────────────── */}
      <div className="mme-social">
        {hasLinks ? (
          Object.entries(socialLinks!).map(([platform, url]) => {
            const icon = SOCIAL_ICON[platform.toLowerCase()] ?? 'link';
            return (
              <a
                key={platform}
                href={typeof url === 'string' ? url : '#'}
                className="mme-social__link"
                target="_blank"
                rel="noopener noreferrer"
                aria-label={platform}
              >
                <span className="material-symbols-outlined" aria-hidden="true" dir="ltr">{icon}</span>
              </a>
            );
          })
        ) : (
          <span className="mme-social__hint">أضف روابطك في تعديل الملف الشخصي</span>
        )}
      </div>

      {/* ── Content Tabs ────────────────────────────────────────────────── */}
      <nav
        className="mme-tabs"
        role="tablist"
        aria-label="محتوى ملف موسيقى"
      >
        {MUSIC_TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            id={`mme-tab-${t.id}`}
            aria-selected={activeTab === t.id}
            aria-controls={`mme-panel-${t.id}`}
            className={`mme-tab${activeTab === t.id ? ' mme-tab--active' : ''}`}
            onClick={() => handleTabChange(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {/* ── Smart Filter Dropdowns ───────────────────────────────────────── */}
      {currentTabDef.filters.length > 0 && (
        <div className="mme-filters" role="group" aria-label="فلاتر المحتوى">
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
        id={`mme-panel-${activeTab}`}
        aria-labelledby={`mme-tab-${activeTab}`}
        className="mme-panel"
      >
        <MusicTabPanel tab={activeTab} navigate={navigate} />
      </div>

    </div>
  );
}

// ─── Tab Panel Content ────────────────────────────────────────────────────────

function MusicTabPanel({ tab, navigate }: { tab: MusicTab; navigate: ReturnType<typeof useNavigate> }) {
  const PANELS: Record<MusicTab, React.ReactNode> = {
    songs:         <EmptyState icon="🎵" title="لم تنشر أي أغاني بعد" description="ابدأ بنشر أغانيك في عالم الموسيقى" action={{ label: 'إنشاء محتوى', onClick: () => navigate('/music/create') }} />,
    albums:        <EmptyState icon="💿" title="لا توجد ألبومات" description="أنشئ أول ألبوم موسيقي لك" action={{ label: 'إنشاء ألبوم', disabled: true, disabledReason: 'قريباً' }} />,
    labels:        <EmptyState icon="🏢" title="لا توجد شركات إنتاج مرتبطة" description="شركات الإنتاج المرتبطة بمحتواك ستظهر هنا" />,
    trends:        <EmptyState icon="🔥" title="لا توجد تريندات بعد" description="أغانيك الرائجة ستظهر هنا" />,
    mood:          <EmptyState icon="🎭" title="لا توجد قوائم مزاجية بعد" description="احفظ قوائم المزاج من محتوى المنصة" />,
    saved:         <EmptyState icon="🔖" title="لا يوجد محفوظات" description="احفظ المحتوى الذي تريد الرجوع إليه" />,
    reposts:       <EmptyState icon="🔄" title="لا توجد إعادات" description="المحتوى الذي تعيد نشره سيظهر هنا" />,
    subscriptions: <EmptyState icon="⭐" title="لا توجد اشتراكات بعد" description="اشتراكاتك وعضوياتك ستظهر هنا" />,
    journeys:      <EmptyState icon="🛣️" title="لا توجد رحلات بعد" description="جلسات الاستماع على الطريق ستظهر هنا" />,
    liked:         <EmptyState icon="❤️" title="لا يوجد مفضلة بعد" description="المحتوى الذي أعجبك سيظهر هنا" />,
    recent:        <EmptyState icon="🕐" title="لا يوجد محتوى حديث" description="آخر ما استمعت إليه سيظهر هنا" />,
    history:       <EmptyState icon="📋" title="سجل الاستماع فارغ" description="المحتوى الذي استمعت إليه سيظهر هنا" />,
  };
  return <>{PANELS[tab] ?? null}</>;
}
