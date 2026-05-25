/**
 * Sound Platform — Tournaments Me Page
 * Route: /tournaments/me  |  Accent: #f59e0b
 * Authority: SOUND_UI_FOUNDATION_AUTHORITY.md (2026-05-19)
 *
 * LANGUAGE RULE — PERMANENT:
 *   Use ONLY allowed مسابقات vocabulary from the authority file.
 *   Any label not in the authority list must not be used.
 *
 * 16 tabs (authority order):
 *   1  مسابقاتي
 *   2  الإدارة النشطة*       3  المشاركات المستلمة*
 *   4  التصويت والتحكيم°    5  النتائج / الفائزون*
 *   6  الدعوات / المسابقات المغلقة*
 *   7  المسابقات المنضم لها  8  مشاركاتي
 *   9  التصويت الآن          10 أصواتي
 *   11 الجوائز / الميداليات  12 المحفوظات
 *   13 المفضلة               14 الإعادات
 *   15 السجل                 16 الاشتراكات
 *
 *   * organizer/admin only   ° jury only
 *
 * SCHEMA GAPS:
 *   tournamentsProfile                          // not in publicProfiles/{uid}
 *   tournamentsProfile.roles[]                  // role-gating (organizer, admin, jury)
 *   tournamentsProfile.competitionsCreatedCount // stats
 *   tournamentsProfile.awardsCount              // stats
 *   tournamentsProfile.juryTasksCount           // jury tab data
 */

import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { usePublicProfile } from '../../hooks/usePublicProfile';
import { LoadingScreen } from '../../components/LoadingScreen';
import { EmptyState } from '../../components/EmptyState';
import { FilterDropdown, type FilterOption } from '../../components/FilterDropdown';
import type { PublicProfileDoc } from '@sound/shared';
import './TournamentsMePage.css';

// ─── Types ─────────────────────────────────────────────────────────────────────
type TournamentTab =
  | 'my-competitions'      // مسابقاتي
  | 'active-management'    // الإدارة النشطة             (organizer/admin)
  | 'received-submissions' // المشاركات المستلمة         (organizer/admin)
  | 'jury-tasks'           // التصويت والتحكيم           (jury)
  | 'results'              // النتائج / الفائزون         (organizer)
  | 'invitations'          // الدعوات / المسابقات المغلقة (organizer)
  | 'joined'               // المسابقات المنضم لها
  | 'my-submissions'       // مشاركاتي
  | 'vote-now'             // التصويت الآن
  | 'my-votes'             // أصواتي
  | 'awards'               // الجوائز / الميداليات
  | 'saved'                // المحفوظات
  | 'liked'                // المفضلة
  | 'reposts'              // الإعادات
  | 'history'              // السجل
  | 'subscriptions';       // الاشتراكات

type TournamentRole = 'organizer' | 'admin' | 'jury';

interface FilterDef { key: string; label: string; options: FilterOption[]; }

interface TournamentTabDef {
  id: TournamentTab;
  label: string;
  role?: TournamentRole | TournamentRole[];
  filters: FilterDef[];
}

function opts(labels: string[]): FilterOption[] {
  return labels.map(l => ({ value: l, label: l }));
}

// ─── Tab registry — 16 tabs, exact authority order ────────────────────────────
const TOURNAMENT_TABS: TournamentTabDef[] = [
  // 1 — مسابقاتي
  { id: 'my-competitions',      label: 'مسابقاتي',
    filters: [
      { key:'status',  label:'الحالة',  options: opts(['نشطة','انتهت','قادمة']) },
      { key:'role',    label:'الدور',   options: opts(['منشئ','مشارك','مراقب']) },
      { key:'sort',    label:'الترتيب', options: opts(['الأحدث','الأقدم','الأكثر مشاركة']) },
    ],
  },
  // 2 — الإدارة النشطة  (organizer/admin)
  { id: 'active-management',    label: 'الإدارة النشطة',
    role: ['organizer','admin'],
    filters: [
      { key:'status', label:'الحالة',   options: opts(['جارية','في انتظار','مغلقة']) },
      { key:'stage',  label:'المرحلة',  options: opts(['التسجيل','التصويت','الختام']) },
      { key:'sort',   label:'الترتيب',  options: opts(['الأحدث','الأكثر مشاركة']) },
    ],
  },
  // 3 — المشاركات المستلمة  (organizer/admin)
  { id: 'received-submissions', label: 'المشاركات المستلمة',
    role: ['organizer','admin'],
    filters: [
      { key:'status',   label:'الحالة',  options: opts(['قيد المراجعة','مقبولة','مرفوضة']) },
      { key:'category', label:'الفئة',   options: opts(['صوت','موسيقى','راديو']) },
      { key:'sort',     label:'الترتيب', options: opts(['الأحدث','الأقدم']) },
    ],
  },
  // 4 — التصويت والتحكيم  (jury)
  { id: 'jury-tasks',           label: 'التصويت والتحكيم',
    role: 'jury',
    filters: [
      { key:'status',      label:'الحالة',    options: opts(['معلقة','مكتملة']) },
      { key:'competition', label:'المسابقة',  options: opts(['الكل']) },
      { key:'sort',        label:'الترتيب',   options: opts(['الأحدث','الأقدم']) },
    ],
  },
  // 5 — النتائج / الفائزون  (organizer/admin)
  { id: 'results',              label: 'النتائج / الفائزون',
    role: ['organizer','admin'],
    filters: [
      { key:'competition', label:'المسابقة', options: opts(['الكل']) },
      { key:'category',    label:'الفئة',    options: opts(['الكل','صوت','موسيقى']) },
      { key:'sort',        label:'الترتيب',  options: opts(['الأحدث','الأقدم']) },
    ],
  },
  // 6 — الدعوات / المسابقات المغلقة  (organizer/admin)
  { id: 'invitations',          label: 'الدعوات / المسابقات المغلقة',
    role: ['organizer','admin'],
    filters: [
      { key:'status', label:'الحالة',  options: opts(['جديدة','مقبولة','مرفوضة']) },
      { key:'sort',   label:'الترتيب', options: opts(['الأحدث','الأقدم']) },
    ],
  },
  // 7 — المسابقات المنضم لها
  { id: 'joined',               label: 'المسابقات المنضم لها',
    filters: [
      { key:'status',   label:'الحالة',  options: opts(['نشطة','انتهت']) },
      { key:'category', label:'الفئة',   options: opts(['الكل','صوت','موسيقى','راديو']) },
      { key:'sort',     label:'الترتيب', options: opts(['الأحدث','الأقدم']) },
    ],
  },
  // 8 — مشاركاتي
  { id: 'my-submissions',       label: 'مشاركاتي',
    filters: [
      { key:'status',      label:'الحالة',    options: opts(['مقبولة','قيد المراجعة','مرفوضة']) },
      { key:'competition', label:'المسابقة',  options: opts(['الكل']) },
      { key:'sort',        label:'الترتيب',   options: opts(['الأحدث','الأقدم']) },
    ],
  },
  // 9 — التصويت الآن
  { id: 'vote-now',             label: 'التصويت الآن',
    filters: [
      { key:'category', label:'الفئة',    options: opts(['الكل','صوت','موسيقى']) },
      { key:'stage',    label:'المرحلة',  options: opts(['الأولى','النهائية']) },
      { key:'sort',     label:'الترتيب',  options: opts(['الأحدث','الأكثر تصويتاً']) },
    ],
  },
  // 10 — أصواتي
  { id: 'my-votes',             label: 'أصواتي',
    filters: [
      { key:'competition', label:'المسابقة', options: opts(['الكل']) },
      { key:'sort',        label:'الترتيب',  options: opts(['الأحدث','الأقدم']) },
    ],
  },
  // 11 — الجوائز / الميداليات
  { id: 'awards',               label: 'الجوائز / الميداليات',
    filters: [
      { key:'type',        label:'نوع الجائزة', options: opts(['ذهبية','فضية','برونزية','تقديرية']) },
      { key:'competition', label:'المسابقة',    options: opts(['الكل']) },
      { key:'sort',        label:'الترتيب',     options: opts(['الأحدث','الأقدم']) },
    ],
  },
  // 12 — المحفوظات
  { id: 'saved',                label: 'المحفوظات',
    filters: [
      { key:'type', label:'نوع المحتوى', options: opts(['الكل','مسابقة','عمل']) },
      { key:'sort', label:'الترتيب',    options: opts(['الأحدث','الأقدم']) },
    ],
  },
  // 13 — المفضلة
  { id: 'liked',                label: 'المفضلة',
    filters: [
      { key:'type', label:'نوع المحتوى', options: opts(['الكل','مسابقة','عمل','نتيجة']) },
      { key:'sort', label:'الترتيب',    options: opts(['الأحدث','الأقدم']) },
    ],
  },
  // 14 — الإعادات
  { id: 'reposts',              label: 'الإعادات',
    filters: [
      { key:'competition', label:'المسابقة', options: opts(['الكل']) },
      { key:'sort',        label:'الترتيب',  options: opts(['الأحدث','الأقدم']) },
    ],
  },
  // 15 — السجل
  { id: 'history',              label: 'السجل',
    filters: [
      { key:'type', label:'نوع النشاط', options: opts(['الكل','مشاركة','تصويت','تحكيم','فوز']) },
      { key:'sort', label:'الترتيب',   options: opts(['الأحدث','الأقدم']) },
    ],
  },
  // 16 — الاشتراكات
  { id: 'subscriptions',        label: 'الاشتراكات',
    filters: [
      { key:'type', label:'نوع الاشتراك', options: opts(['الكل','مسابقة','منشئ']) },
      { key:'sort', label:'الترتيب',      options: opts(['الأحدث','الأقدم']) },
    ],
  },
];

const SOCIAL_ICON: Record<string, string> = {
  instagram:'photo_camera', twitter:'tag', x:'tag',
  youtube:'smart_display', spotify:'music_note', soundcloud:'volume_up',
  tiktok:'music_video', website:'language', link:'link',
};

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n/1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n/1_000).toFixed(1)}K`;
  return String(n);
}

function hasRole(userRoles: TournamentRole[], required: TournamentRole | TournamentRole[]): boolean {
  const list = Array.isArray(required) ? required : [required];
  return list.some(r => userRoles.includes(r));
}

// ─── Root ─────────────────────────────────────────────────────────────────────
export function TournamentsMePage() {
  const { currentUser } = useAuth();
  const profileState = usePublicProfile(currentUser?.uid ?? null);

  if (profileState.status === 'loading') return <LoadingScreen message="جاري تحميل ملفك الشخصي..." />;
  if (profileState.status === 'error')   return <div className="tme-page"><EmptyState icon="⚠️" title="حدث خطأ" description={profileState.message} /></div>;
  if (profileState.status === 'not-found') return (
    <div className="tme-page">
      <EmptyState icon="👤" title="ملفك الشخصي ليس جاهزاً بعد" description="سيتم إنشاء ملفك الشخصي العام تلقائياً" />
    </div>
  );
  return <TournamentsMeLoaded profile={profileState.profile} />;
}

// ─── Loaded View ──────────────────────────────────────────────────────────────
function TournamentsMeLoaded({ profile }: { profile: PublicProfileDoc }) {
  const navigate = useNavigate();

  // SCHEMA GAP: tournamentsProfile not yet in publicProfiles/{uid}
  const tp = (profile as any).tournamentsProfile ?? (profile as any).generalProfile;

  // SCHEMA GAP: roles[] not yet in publicProfiles/{uid}
  const userRoles: TournamentRole[] = (tp as any)?.roles ?? []; // SCHEMA GAP

  const [activeTab, setActiveTab] = useState<TournamentTab>('my-competitions');
  const [filterValues, setFilterValues] = useState<Record<string, Record<string, string[]>>>({});

  const handleTabChange = useCallback((id: TournamentTab) => {
    setActiveTab(id);
    setFilterValues(prev => ({ ...prev, [id]: {} }));
  }, []);

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

  const displayName = tp?.displayName ?? 'مستخدم Sound';
  const username    = tp?.username    ?? null;
  const bio         = tp?.bio         ?? null;
  const avatarUrl   = tp?.avatarUrl   ?? null;
  const isVerified  = tp?.isVerified  ?? false;
  const socialLinks = tp?.socialLinks ?? null;
  const hasLinks    = socialLinks && Object.keys(socialLinks).length > 0;

  const followers     = fmt(tp?.followersCount ?? 0);
  const following     = fmt(tp?.followingCount ?? 0);
  // SCHEMA GAP: competitionsCreatedCount, awardsCount not in schema
  const competitions  = fmt((tp as any)?.competitionsCreatedCount ?? 0); // SCHEMA GAP
  const awards        = fmt((tp as any)?.awardsCount ?? 0);              // SCHEMA GAP

  // UI FOUNDATION MODE — show every tab in the authority inventory.
  // Role-gating (organizer / admin / jury) is intentionally bypassed here
  // so the product inventory can be reviewed before tournamentsProfile.roles[]
  // is live in the Firestore schema.  Re-enable the filter after schema backfill.
  // SCHEMA GAP: tournamentsProfile.roles[] — enable gate when ready:
  //   const visibleTabs = TOURNAMENT_TABS.filter(t =>
  //     !t.role || hasRole(userRoles, t.role as TournamentRole | TournamentRole[])
  //   );
  const visibleTabs = TOURNAMENT_TABS; // UI Foundation Mode: all tabs visible

  const activeTabDef = TOURNAMENT_TABS.find(t => t.id === activeTab);
  const activeFilters = activeTabDef?.filters ?? [];

  return (
    <div className="tme-page">

      <div className="tme-cover" aria-hidden="true"><div className="tme-cover__fade" /></div>

      {/* Header controls */}
      <div className="tme-header-controls">
        <div className="tme-header-badges">
          {isVerified && (
            <span className="tme-badge tme-badge--verified">
              <span className="material-symbols-outlined" aria-hidden="true" dir="ltr">verified</span>موثق
            </span>
          )}
          <span className="tme-badge tme-badge--world">🏆 مسابقات</span>
          {userRoles.includes('organizer') && <span className="tme-badge tme-badge--role">منظم</span>}
          {userRoles.includes('admin')     && <span className="tme-badge tme-badge--role">مدير</span>}
          {userRoles.includes('jury')      && <span className="tme-badge tme-badge--role">محكّم</span>}
        </div>
        <div className="tme-header-btns">
          <button id="tme-settings-btn" className="tme-hdr-btn" aria-label="الإعدادات" type="button" onClick={() => navigate('/settings')}>
            <span className="material-symbols-outlined" aria-hidden="true" dir="ltr">settings</span>
          </button>
          <button id="tme-notifications-btn" className="tme-hdr-btn" aria-label="الإشعارات" type="button">
            <span className="material-symbols-outlined" aria-hidden="true" dir="ltr">notifications</span>
          </button>
          <button id="tme-inbox-btn" className="tme-hdr-btn" aria-label="الرسائل" type="button">
            <span className="material-symbols-outlined" aria-hidden="true" dir="ltr">mail</span>
          </button>
        </div>
      </div>

      {/* Identity */}
      <div className="tme-identity">
        <div className="tme-avatar-wrap">
          <div className="tme-avatar-ring" aria-hidden="true" />
          <div className="tme-avatar">
            {avatarUrl
              ? <img src={avatarUrl} alt={displayName} />
              : <span className="tme-avatar__initial" aria-hidden="true">{displayName.charAt(0).toUpperCase()}</span>}
          </div>
        </div>
        <div className="tme-identity__text">
          <div className="tme-identity__name-row">
            <h1 className="tme-display-name">{displayName}</h1>
            {isVerified && (
              <span className="tme-verified-icon" aria-label="موثق">
                <span className="material-symbols-outlined" aria-hidden="true" dir="ltr">verified</span>
              </span>
            )}
          </div>
          {username && <p className="tme-username" dir="ltr">@{username}</p>}
          {bio && <p className="tme-bio">{bio}</p>}
          <button id="tme-status-btn" className="tme-status-pill" type="button" aria-label="تحديث الحالة">
            <span className="material-symbols-outlined" aria-hidden="true" dir="ltr">edit_note</span>
            <span className="tme-status-pill__text">أضف تحديثاً للحالة…</span>
          </button>
          <div className="tme-listening-now" aria-label="أستمع الآن">
            <span className="tme-listening-dot" aria-hidden="true" />
            <span className="tme-listening-label">أستمع الآن</span>
            <span className="tme-listening-track">—</span>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="tme-stats">
        {[
          {value:followers,   label:'متابعون'},
          {value:following,   label:'يتابع'},
          {value:competitions,label:'مسابقات'},
          {value:awards,      label:'جوائز'},
        ].map(s=>(
          <div key={s.label} className="tme-stat">
            <span className="tme-stat__value">{s.value}</span>
            <span className="tme-stat__label">{s.label}</span>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="tme-actions">
        <button id="tme-edit-profile-btn" className="tme-btn tme-btn--edit" type="button" onClick={() => navigate('/settings/edit-profile')}>
          <span className="material-symbols-outlined" aria-hidden="true" dir="ltr">edit</span>تعديل الملف الشخصي
        </button>
        <button id="tme-share-btn" className="tme-btn tme-btn--ghost" type="button" aria-label="مشاركة الملف">
          <span className="material-symbols-outlined" aria-hidden="true" dir="ltr">share</span>
        </button>
      </div>

      {/* Social links */}
      <div className="tme-social">
        {hasLinks
          ? Object.entries(socialLinks!).map(([pl, url]) => (
              <a key={pl} href={typeof url==='string'?url:'#'} className="tme-social__link" target="_blank" rel="noopener noreferrer" aria-label={pl}>
                <span className="material-symbols-outlined" aria-hidden="true" dir="ltr">{SOCIAL_ICON[pl.toLowerCase()]??'link'}</span>
              </a>
            ))
          : <span className="tme-social__hint">أضف روابطك في تعديل الملف الشخصي</span>}
      </div>

      {/* Tabs */}
      <nav className="tme-tabs" role="tablist" aria-label="محتوى ملف مسابقات">
        {visibleTabs.map(t => (
          <button
            key={t.id}
            role="tab"
            id={`tme-tab-${t.id}`}
            aria-selected={activeTab === t.id}
            aria-controls={`tme-panel-${t.id}`}
            className={['tme-tab', activeTab===t.id?'tme-tab--active':'', t.role?'tme-tab--gated':''].join(' ').trim()}
            onClick={() => handleTabChange(t.id)}
          >{t.label}</button>
        ))}
      </nav>

      {/* Smart FilterDropdown controls */}
      {activeFilters.length > 0 && (
        <div className="tme-filters" aria-label="فلاتر المحتوى">
          {activeFilters.map(f => (
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
      <div role="tabpanel" id={`tme-panel-${activeTab}`} aria-labelledby={`tme-tab-${activeTab}`} className="tme-panel">
        <TournamentsTabPanel tab={activeTab} navigate={navigate} />
      </div>

    </div>
  );
}

// ─── Panel ────────────────────────────────────────────────────────────────────
function TournamentsTabPanel({ tab, navigate }: { tab: TournamentTab; navigate: ReturnType<typeof useNavigate> }) {
  const PANELS: Record<TournamentTab, React.ReactNode> = {
    'my-competitions':      <EmptyState icon="🏆" title="لا توجد مسابقات بعد" description="المسابقات التي أنشأتها أو شاركت فيها ستظهر هنا" action={{label:'استكشف المسابقات', onClick:()=>navigate('/tournaments/home')}} />,
    'active-management':    <EmptyState icon="⚙️" title="لا توجد مسابقات نشطة تديرها" description="المسابقات التي تديرها حالياً ستظهر هنا" />,
    'received-submissions': <EmptyState icon="📥" title="لا توجد مشاركات مستلمة" description="مشاركات المتسابقين في مسابقاتك ستظهر هنا" />,
    'jury-tasks':           <EmptyState icon="⚖️" title="لا توجد مهام تحكيم معلقة" description="مهامك كعضو في لجنة التحكيم ستظهر هنا" />,
    'results':              <EmptyState icon="📊" title="لا توجد نتائج بعد" description="نتائج المسابقات ستظهر هنا" />,
    'invitations':          <EmptyState icon="✉️" title="لا توجد دعوات" description="دعوات ومسابقات مغلقة ستظهر هنا" />,
    'joined':               <EmptyState icon="🔗" title="لم تنضم لأي مسابقة بعد" description="المسابقات التي انضممت إليها ستظهر هنا" action={{label:'استكشف المسابقات', onClick:()=>navigate('/tournaments/home')}} />,
    'my-submissions':       <EmptyState icon="📤" title="لم تشارك في أي مسابقة بعد" description="مشاركاتك في المسابقات ستظهر هنا" action={{label:'استكشف المسابقات', onClick:()=>navigate('/tournaments/home')}} />,
    'vote-now':             <EmptyState icon="🗳️" title="لا توجد تصويتات نشطة الآن" description="المسابقات المفتوحة للتصويت ستظهر هنا" />,
    'my-votes':             <EmptyState icon="✅" title="لم تصوّت بعد" description="الأعمال التي صوّتت لها ستظهر هنا" />,
    'awards':               <EmptyState icon="🎖️" title="لا توجد جوائز بعد" description="جوائزك وميدالياتك ستظهر هنا" />,
    'saved':                <EmptyState icon="🔖" title="لا يوجد محفوظات" description="احفظ المحتوى الذي تريد الرجوع إليه" />,
    'liked':                <EmptyState icon="❤️" title="لا يوجد مفضلة بعد" description="المحتوى الذي أعجبك ستظهر هنا" />,
    'reposts':              <EmptyState icon="🔄" title="لا توجد إعادات" description="المحتوى الذي تعيد نشره سيظهر هنا" />,
    'history':              <EmptyState icon="🕐" title="سجل النشاط فارغ" description="نشاطك في المسابقات سيظهر هنا" />,
    'subscriptions':        <EmptyState icon="🔔" title="لا توجد اشتراكات بعد" description="المسابقات والمنشئون الذين اشتركت معهم سيظهرون هنا" />,
  };
  return <>{PANELS[tab] ?? null}</>;
}
