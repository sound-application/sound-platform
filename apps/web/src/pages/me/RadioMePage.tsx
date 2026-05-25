/**
 * Sound Platform — Radio Me Page
 * Route: /radio/me  |  Accent: #ef4444
 * Authority: SOUND_UI_FOUNDATION_AUTHORITY.md (2026-05-19)
 *
 * TAB ORDER (11 tabs — ALL visible in UI Foundation Mode):
 *   1  إذاعتي       ← ALWAYS first, ALWAYS default active
 *   2  البرامج      3  فريق العمل   4  الجدول
 *   5  تواصل معنا   6  من نحن       7  أعلن معنا
 *   8  المفضلة      9  المحفوظات    10 الإعادات   11 سجل الاستماع
 *
 * UI FOUNDATION MODE: all tabs visible regardless of stationPermission.
 * Permission logic is deferred to PANEL content only (إذاعتي shows CTA if no station).
 *
 * إذاعتي tab content:
 *   - WITH stationPermission  → station management panel
 *   - WITHOUT stationPermission → eligibility/request panel (طلب إنشاء إذاعة)
 *
 * SCHEMA GAPS:
 *   radioProfile.stationPermission  // not yet in publicProfiles/{uid}
 *   radioProfile.stationInfo        // not yet in publicProfiles/{uid}
 *   radioProfile.programsCount      // not yet in publicProfiles/{uid}
 */

import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { usePublicProfile } from '../../hooks/usePublicProfile';
import { LoadingScreen } from '../../components/LoadingScreen';
import { EmptyState } from '../../components/EmptyState';
import { FilterDropdown, type FilterOption } from '../../components/FilterDropdown';
import type { PublicProfileDoc } from '@sound/shared';
import './RadioMePage.css';

// ─── Types ─────────────────────────────────────────────────────────────────────
type RadioOwnerMgmtTab = 'programs' | 'schedule' | 'team' | 'about' | 'contact' | 'advertise';
type RadioTab = 'station' | RadioOwnerMgmtTab | 'liked' | 'saved' | 'reposts' | 'listen-history';

interface FilterDef { key: string; label: string; options: FilterOption[]; }

interface RadioTabDef {
  id: RadioTab;
  label: string;
  group: 'station' | 'management' | 'listener';
  filters: FilterDef[];
}

function opts(labels: string[]): FilterOption[] {
  return labels.map(l => ({ value: l, label: l }));
}

// ─── Tab registry — 11 tabs, exact authority order ────────────────────────────
// UI FOUNDATION MODE: all tabs listed here will be rendered unconditionally.
// Permission gating applies only inside panel content, NOT to tab visibility.
const RADIO_TABS: RadioTabDef[] = [
  // 1 — إذاعتي  (always first)
  { id: 'station',   label: 'إذاعتي',    group: 'station', filters: [
    { key: 'status',  label: 'الحالة',      options: opts(['نشطة','موقوفة','في المراجعة']) },
    { key: 'type',    label: 'نوع الإذاعة', options: opts(['عامة','متخصصة','دينية','رياضية','إخبارية']) },
    { key: 'country', label: 'البلد',        options: opts(['الكل','السعودية','الإمارات','مصر','الكويت']) },
    { key: 'sort',    label: 'الترتيب',     options: opts(['الأحدث','الأقدم','الأكثر استماعاً']) },
  ]},
  // 2 — البرامج
  { id: 'programs',  label: 'البرامج',    group: 'management', filters: [
    { key: 'progType', label: 'نوع البرنامج', options: opts(['حواري','إخباري','ترفيهي','ديني','رياضي']) },
    { key: 'status',   label: 'الحالة',       options: opts(['نشط','مؤرشف','مسودة']) },
    { key: 'sort',     label: 'الترتيب',      options: opts(['الأحدث','الأقدم','الأكثر استماعاً']) },
  ]},
  // 3 — فريق العمل
  { id: 'team',      label: 'فريق العمل', group: 'management', filters: [
    { key: 'role',   label: 'الدور',   options: opts(['مذيع','منتج','مهندس صوت','محرر','مراسل']) },
    { key: 'status', label: 'الحالة', options: opts(['نشط','غير نشط']) },
    { key: 'sort',   label: 'الترتيب', options: opts(['الأحدث','الأقدم']) },
  ]},
  // 4 — الجدول
  { id: 'schedule',  label: 'الجدول',    group: 'management', filters: [
    { key: 'period', label: 'الفترة الزمنية', options: opts(['صباح','ظهر','مساء','ليل']) },
    { key: 'day',    label: 'اليوم',          options: opts(['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت']) },
    { key: 'sort',   label: 'الترتيب',        options: opts(['الأقرب','الأبعد']) },
  ]},
  // 5 — تواصل معنا
  { id: 'contact',   label: 'تواصل معنا', group: 'management', filters: [
    { key: 'type',   label: 'نوع التواصل', options: opts(['استفسار','شكوى','اقتراح','إعلان','أخرى']) },
    { key: 'status', label: 'الحالة',      options: opts(['جديد','قيد المعالجة','مغلق']) },
    { key: 'sort',   label: 'الترتيب',     options: opts(['الأحدث','الأقدم']) },
  ]},
  // 6 — من نحن
  { id: 'about',     label: 'من نحن',     group: 'management', filters: [
    { key: 'section', label: 'القسم',        options: opts(['الرؤية','الفريق','التاريخ','الجوائز']) },
    { key: 'status',  label: 'الحالة',       options: opts(['منشور','مسودة']) },
    { key: 'updated', label: 'آخر تحديث',    options: opts(['هذا الأسبوع','هذا الشهر','هذه السنة']) },
  ]},
  // 7 — أعلن معنا
  { id: 'advertise', label: 'أعلن معنا',  group: 'management', filters: [
    { key: 'adType',  label: 'نوع الإعلان', options: opts(['صوتي','رعاية','بانر','برنامج مموّل']) },
    { key: 'status',  label: 'الحالة',      options: opts(['متاح','محجوز','منتهي']) },
    { key: 'budget',  label: 'الميزانية',   options: opts(['أقل من 1000','1000-5000','أكثر من 5000']) },
    { key: 'sort',    label: 'الترتيب',     options: opts(['الأحدث','الأقدم']) },
  ]},
  // 8 — المفضلة
  { id: 'liked',     label: 'المفضلة',    group: 'listener', filters: [
    { key: 'type',    label: 'نوع المحتوى', options: opts(['برنامج','حلقة','تسجيل']) },
    { key: 'station', label: 'المحطة',      options: opts(['جميع المحطات','المتابعة فقط']) },
    { key: 'sort',    label: 'الترتيب',     options: opts(['الأحدث','الأقدم']) },
  ]},
  // 9 — المحفوظات
  { id: 'saved',     label: 'المحفوظات',  group: 'listener', filters: [
    { key: 'type',    label: 'نوع المحتوى', options: opts(['برنامج','حلقة','تسجيل']) },
    { key: 'station', label: 'المحطة',      options: opts(['جميع المحطات','المتابعة فقط']) },
    { key: 'sort',    label: 'الترتيب',     options: opts(['الأحدث','الأقدم']) },
  ]},
  // 10 — الإعادات
  { id: 'reposts',   label: 'الإعادات',   group: 'listener', filters: [
    { key: 'station', label: 'المحطة',  options: opts(['جميع المحطات','المتابعة فقط']) },
    { key: 'sort',    label: 'الترتيب', options: opts(['الأحدث','الأقدم']) },
  ]},
  // 11 — سجل الاستماع
  { id: 'listen-history', label: 'سجل الاستماع', group: 'listener', filters: [
    { key: 'station',  label: 'المحطة',   options: opts(['جميع المحطات','المتابعة فقط']) },
    { key: 'category', label: 'التصنيف', options: opts(['إخباري','ترفيهي','ديني','ثقافي','رياضي']) },
    { key: 'sort',     label: 'الترتيب', options: opts(['الأحدث','الأقدم']) },
  ]},
];

const SOCIAL_ICON: Record<string, string> = {
  instagram: 'photo_camera', twitter: 'tag', x: 'tag',
  youtube: 'smart_display', spotify: 'music_note', soundcloud: 'volume_up',
  tiktok: 'music_video', website: 'language', link: 'link',
};

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

// ─── Root ─────────────────────────────────────────────────────────────────────
export function RadioMePage() {
  const { currentUser } = useAuth();
  const profileState = usePublicProfile(currentUser?.uid ?? null);

  if (profileState.status === 'loading') return <LoadingScreen message="جاري تحميل ملفك الشخصي..." />;
  if (profileState.status === 'error') return (
    <div className="rme-page"><EmptyState icon="⚠️" title="حدث خطأ" description={profileState.message} /></div>
  );
  if (profileState.status === 'not-found') return (
    <div className="rme-page">
      <EmptyState icon="👤" title="ملفك الشخصي ليس جاهزاً بعد" description="سيتم إنشاء ملفك الشخصي العام تلقائياً" />
    </div>
  );
  return <RadioMeLoaded profile={profileState.profile} />;
}

// ─── Loaded View ──────────────────────────────────────────────────────────────
function RadioMeLoaded({ profile }: { profile: PublicProfileDoc }) {
  const navigate = useNavigate();
  const rp = (profile as any).radioProfile ?? (profile as any).generalProfile;

  // SCHEMA GAP: stationPermission not yet in publicProfiles/{uid}
  const isStationOwner: boolean = !!(rp as any)?.stationPermission;

  const [activeTab, setActiveTab]       = useState<RadioTab>('station');
  const [filterValues, setFilterValues] = useState<Record<string, Record<string, string[]>>>({});

  const handleTabChange = useCallback((id: RadioTab) => {
    setActiveTab(id);
    setFilterValues(prev => ({ ...prev, [id]: {} }));
  }, []);

  const currentTabDef = RADIO_TABS.find(t => t.id === activeTab)!;

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

  const displayName = rp?.displayName ?? 'مستخدم Sound';
  const username    = rp?.username    ?? null;
  const bio         = rp?.bio         ?? null;
  const avatarUrl   = rp?.avatarUrl   ?? null;
  const isVerified  = rp?.isVerified  ?? false;
  const socialLinks = rp?.socialLinks ?? null;
  const hasLinks    = socialLinks && Object.keys(socialLinks).length > 0;

  const followers = fmt(rp?.followersCount ?? 0);
  const following = fmt(rp?.followingCount ?? 0);
  const listens   = fmt(rp?.listensCount   ?? 0);
  const likes     = fmt(0);

  // UI FOUNDATION MODE: render ALL tabs unconditionally so the full inventory
  // is visible for product review. Permission logic lives inside panel content
  // only (إذاعتي shows a request CTA when isStationOwner is false).
  // TODO: re-enable permission filter after backend schema is ready.
  const visibleTabs = RADIO_TABS; // all 11 tabs always visible

  return (
    <div className="rme-page">

      <div className="rme-cover" aria-hidden="true"><div className="rme-cover__fade" /></div>

      {/* Header controls */}
      <div className="rme-header-controls">
        <div className="rme-header-badges">
          {isVerified && (
            <span className="rme-badge rme-badge--verified">
              <span className="material-symbols-outlined" aria-hidden="true" dir="ltr">verified</span>موثق
            </span>
          )}
          <span className="rme-badge rme-badge--world">📻 راديو</span>
          {isStationOwner && <span className="rme-badge rme-badge--owner">مالك محطة</span>}
        </div>
        <div className="rme-header-btns">
          <button id="rme-settings-btn" className="rme-hdr-btn" aria-label="الإعدادات" type="button" onClick={() => navigate('/settings')}>
            <span className="material-symbols-outlined" aria-hidden="true" dir="ltr">settings</span>
          </button>
          <button id="rme-notifications-btn" className="rme-hdr-btn" aria-label="الإشعارات" type="button">
            <span className="material-symbols-outlined" aria-hidden="true" dir="ltr">notifications</span>
          </button>
          <button id="rme-inbox-btn" className="rme-hdr-btn" aria-label="الرسائل" type="button">
            <span className="material-symbols-outlined" aria-hidden="true" dir="ltr">mail</span>
          </button>
        </div>
      </div>

      {/* Identity */}
      <div className="rme-identity">
        <div className="rme-avatar-wrap">
          <div className="rme-avatar-ring" aria-hidden="true" />
          <div className="rme-avatar">
            {avatarUrl
              ? <img src={avatarUrl} alt={displayName} />
              : <span className="rme-avatar__initial" aria-hidden="true">{displayName.charAt(0).toUpperCase()}</span>}
          </div>
        </div>
        <div className="rme-identity__text">
          <div className="rme-identity__name-row">
            <h1 className="rme-display-name">{displayName}</h1>
            {isVerified && (
              <span className="rme-verified-icon" aria-label="موثق">
                <span className="material-symbols-outlined" aria-hidden="true" dir="ltr">verified</span>
              </span>
            )}
          </div>
          {username && <p className="rme-username" dir="ltr">@{username}</p>}
          {bio && <p className="rme-bio">{bio}</p>}
          <button id="rme-status-btn" className="rme-status-pill" type="button" aria-label="تحديث الحالة">
            <span className="material-symbols-outlined" aria-hidden="true" dir="ltr">edit_note</span>
            <span className="rme-status-pill__text">أضف تحديثاً للحالة…</span>
          </button>
          <div className="rme-listening-now" aria-label="أستمع الآن">
            <span className="rme-listening-dot" aria-hidden="true" />
            <span className="rme-listening-label">أستمع الآن</span>
            <span className="rme-listening-track">—</span>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="rme-stats">
        {[
          { value: followers, label: 'متابعون' },
          { value: following, label: 'يتابع'   },
          { value: listens,   label: 'استماع'  },
          { value: likes,     label: 'إعجاب'   },
        ].map(s => (
          <div key={s.label} className="rme-stat">
            <span className="rme-stat__value">{s.value}</span>
            <span className="rme-stat__label">{s.label}</span>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="rme-actions">
        <button id="rme-edit-profile-btn" className="rme-btn rme-btn--edit" type="button" onClick={() => navigate('/settings/edit-profile')}>
          <span className="material-symbols-outlined" aria-hidden="true" dir="ltr">edit</span>تعديل الملف الشخصي
        </button>
        <button id="rme-share-btn" className="rme-btn rme-btn--ghost" type="button" aria-label="مشاركة الملف">
          <span className="material-symbols-outlined" aria-hidden="true" dir="ltr">share</span>
        </button>
      </div>

      {/* Social links */}
      <div className="rme-social">
        {hasLinks
          ? Object.entries(socialLinks!).map(([pl, url]) => (
              <a key={pl} href={typeof url === 'string' ? url : '#'} className="rme-social__link" target="_blank" rel="noopener noreferrer" aria-label={pl}>
                <span className="material-symbols-outlined" aria-hidden="true" dir="ltr">{SOCIAL_ICON[pl.toLowerCase()] ?? 'link'}</span>
              </a>
            ))
          : <span className="rme-social__hint">أضف روابطك في تعديل الملف الشخصي</span>}
      </div>

      {/* Tabs — إذاعتي is ALWAYS tab #1 */}
      <nav className="rme-tabs" role="tablist" aria-label="محتوى ملف راديو">
        {visibleTabs.map(t => (
          <button
            key={t.id}
            role="tab"
            id={`rme-tab-${t.id}`}
            aria-selected={activeTab === t.id}
            aria-controls={`rme-panel-${t.id}`}
            className={[
              'rme-tab',
              activeTab === t.id ? 'rme-tab--active' : '',
              t.group === 'management' ? 'rme-tab--management' : '',
            ].join(' ').trim()}
            onClick={() => handleTabChange(t.id)}
          >{t.label}</button>
        ))}
      </nav>

      {/* Smart Filter Dropdowns */}
      {currentTabDef.filters.length > 0 && (
        <div className="rme-filters" role="group" aria-label="فلاتر المحتوى">
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

      {/* Panel */}
      <div role="tabpanel" id={`rme-panel-${activeTab}`} aria-labelledby={`rme-tab-${activeTab}`} className="rme-panel">
        <RadioTabPanel tab={activeTab} isStationOwner={isStationOwner} navigate={navigate} />
      </div>

    </div>
  );
}

// ─── Panel ─────────────────────────────────────────────────────────────────────
// إذاعتي panel: content depends on isStationOwner — NOT the tab's visibility.
function RadioTabPanel({
  tab,
  isStationOwner,
  navigate,
}: {
  tab: RadioTab;
  isStationOwner: boolean;
  navigate: ReturnType<typeof useNavigate>;
}) {
  // إذاعتي: bifurcated content
  if (tab === 'station') {
    if (isStationOwner) {
      // Owner → station management panel
      return (
        <EmptyState
          icon="📻"
          title="إذاعتك"
          description="أضف معلومات محطتك الإذاعية لتظهر هنا"
          action={{ label: 'إعداد الإذاعة', onClick: () => navigate('/radio/create') }}
        />
      );
    }
    // No permission → eligibility / request panel (inside the tab, not above it)
    return (
      <div className="rme-station-cta">
        <span className="material-symbols-outlined rme-station-cta__icon" aria-hidden="true" dir="ltr">radio</span>
        <div className="rme-station-cta__body">
          <strong className="rme-station-cta__title">هل تريد إنشاء إذاعتك الخاصة؟</strong>
          <p className="rme-station-cta__desc">
            تقدّم بطلب الحصول على صلاحية محطة راديو. سيراجع فريق Sound طلبك وسيتم إخطارك عند الموافقة.
          </p>
          <div className="rme-station-cta__actions">
            <button id="rme-request-station-btn" className="rme-btn rme-btn--request" type="button">
              <span className="material-symbols-outlined" aria-hidden="true" dir="ltr">add_circle</span>
              طلب إنشاء إذاعة
            </button>
            <button id="rme-request-permission-btn" className="rme-btn rme-btn--ghost-red" type="button">
              طلب صلاحية محطة
            </button>
          </div>
          <p className="rme-station-cta__note">
            {/* SCHEMA GAP: approval status not yet in publicProfiles/{uid} */}
            تتم المراجعة من قِبل الإدارة. معظم الطلبات تُراجع خلال 3-5 أيام عمل.
          </p>
        </div>
      </div>
    );
  }

  // All other tabs
  const PANELS: Partial<Record<RadioTab, React.ReactNode>> = {
    programs:     <EmptyState icon="🎙️" title="لم تنشئ أي برامج بعد" description="ابدأ بإنشاء برنامجك الإذاعي الأول" action={{ label: 'إنشاء برنامج', onClick: () => navigate('/radio/create') }} />,
    schedule:     <EmptyState icon="📅" title="الجدول الإذاعي فارغ" description="أضف أوقات بثّ برامجك هنا" />,
    team:         <EmptyState icon="👥" title="لا يوجد فريق عمل بعد" description="أضف أعضاء فريق المحطة" />,
    about:        <EmptyState icon="ℹ️" title="لم تُضف معلومات عن المحطة بعد" description="عرّف بمحطتك في قسم تعديل الملف الشخصي" />,
    contact:      <EmptyState icon="📬" title="بيانات التواصل غير مكتملة" description="أضف طرق التواصل الخاصة بمحطتك" />,
    advertise:    <EmptyState icon="📣" title="صفحة الإعلانات فارغة" description="أضف تفاصيل خيارات الإعلان في محطتك" />,
    liked:          <EmptyState icon="❤️" title="لا يوجد مفضلة بعد" description="البرامج التي أعجبتك ستظهر هنا" />,
    saved:          <EmptyState icon="🔖" title="لا يوجد محفوظات" description="احفظ البرامج التي تريد الرجوع إليها" />,
    reposts:        <EmptyState icon="🔄" title="لا توجد إعادات" description="المحتوى الذي تعيد نشره سيظهر هنا" />,
    'listen-history': <EmptyState icon="🕐" title="سجل الاستماع فارغ" description="البرامج التي استمعت إليها ستظهر هنا" />,
  };
  return <>{PANELS[tab] ?? null}</>;
}
