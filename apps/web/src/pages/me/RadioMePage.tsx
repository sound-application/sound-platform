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
import i18n from "i18next";

const t = (key: any, options?: any) => i18n.t(key, options) as any as string;


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
  { id: 'station',   label: t('radiome:myRadio'),    group: 'station', filters: [
    { key: 'status',  label: t('radiome:theCondition'),      options: opts([t('radiome:active1'),t('radiome:suspended'),t('radiome:inTheReview')]) },
    { key: 'type',    label: t('radiome:radioType'), options: opts([t('radiome:general'),t('radiome:specialized'),t('radiome:religious1'),t('radiome:sports'),t('radiome:informative')]) },
    { key: 'country', label: t('radiome:country'),        options: opts([t('radiome:everyone'),t('radiome:saudiArabia'),t('radiome:theUae'),t('radiome:egypt'),t('radiome:kuwait')]) },
    { key: 'sort',    label: t('radiome:ranking'),     options: opts([t('radiome:latest'),t('radiome:oldest'),t('radiome:mostListenedTo')]) },
  ]},
  // 2 — البرامج
  { id: 'programs',  label: t('radiome:programs'),    group: 'management', filters: [
    { key: 'progType', label: t('radiome:programType'), options: opts([t('radiome:apostle'),t('radiome:news'),t('radiome:entertaining'),t('radiome:religious'),t('radiome:athlete')]) },
    { key: 'status',   label: t('radiome:theCondition'),       options: opts([t('radiome:active'),t('radiome:archived'),t('radiome:draft')]) },
    { key: 'sort',     label: t('radiome:ranking'),      options: opts([t('radiome:latest'),t('radiome:oldest'),t('radiome:mostListenedTo')]) },
  ]},
  // 3 — فريق العمل
  { id: 'team',      label: t('radiome:workTeam'), group: 'management', filters: [
    { key: 'role',   label: t('radiome:theRole'),   options: opts([t('radiome:announcer'),t('radiome:project'),t('radiome:soundEngineer'),t('radiome:editor'),t('radiome:reporter')]) },
    { key: 'status', label: t('radiome:theCondition'), options: opts([t('radiome:active'),t('radiome:inactive')]) },
    { key: 'sort',   label: t('radiome:ranking'), options: opts([t('radiome:latest'),t('radiome:oldest')]) },
  ]},
  // 4 — الجدول
  { id: 'schedule',  label: t('radiome:table'),    group: 'management', filters: [
    { key: 'period', label: t('radiome:timePeriod'), options: opts([t('radiome:morning'),t('radiome:back'),t('radiome:evening'),t('radiome:night')]) },
    { key: 'day',    label: t('radiome:today'),          options: opts([t('radiome:sunday'),t('radiome:monday'),t('radiome:tuesday'),t('radiome:wednesday'),t('radiome:thursday'),t('radiome:friday'),t('radiome:saturday')]) },
    { key: 'sort',   label: t('radiome:ranking'),        options: opts([t('radiome:theClosest'),t('radiome:farthest')]) },
  ]},
  // 5 — تواصل معنا
  { id: 'contact',   label: t('radiome:contactUs'), group: 'management', filters: [
    { key: 'type',   label: t('radiome:typeOfCommunication'), options: opts([t('radiome:inquiry'),t('radiome:complaint'),t('radiome:suggestion'),t('radiome:advertisement'),t('radiome:other')]) },
    { key: 'status', label: t('radiome:theCondition'),      options: opts([t('radiome:new'),t('radiome:inProcess'),t('radiome:closed')]) },
    { key: 'sort',   label: t('radiome:ranking'),     options: opts([t('radiome:latest'),t('radiome:oldest')]) },
  ]},
  // 6 — من نحن
  { id: 'about',     label: t('radiome:whoAreWe'),     group: 'management', filters: [
    { key: 'section', label: t('radiome:section'),        options: opts([t('radiome:vision'),t('radiome:team'),t('radiome:theDate'),t('radiome:awards')]) },
    { key: 'status',  label: t('radiome:theCondition'),       options: opts([t('radiome:manifesto'),t('radiome:draft')]) },
    { key: 'updated', label: t('radiome:latestUpdate'),    options: opts([t('radiome:thisWeek'),t('radiome:thisMonth'),t('radiome:thisYear')]) },
  ]},
  // 7 — أعلن معنا
  { id: 'advertise', label: t('radiome:advertiseWithUs'),  group: 'management', filters: [
    { key: 'adType',  label: t('radiome:adType'), options: opts([t('radiome:myVoice'),t('radiome:nursing'),t('radiome:banner'),t('radiome:fundedProgram')]) },
    { key: 'status',  label: t('radiome:theCondition'),      options: opts([t('radiome:available'),t('radiome:reserved'),t('radiome:theEnd')]) },
    { key: 'budget',  label: t('radiome:budget'),   options: opts([t('radiome:lessThan1000'),'1000-5000',t('radiome:moreThan5000')]) },
    { key: 'sort',    label: t('radiome:ranking'),     options: opts([t('radiome:latest'),t('radiome:oldest')]) },
  ]},
  // 8 — المفضلة
  { id: 'liked',     label: t('radiome:favorites'),    group: 'listener', filters: [
    { key: 'type',    label: t('radiome:contentType'), options: opts([t('radiome:program'),t('radiome:episode'),t('radiome:registration')]) },
    { key: 'station', label: t('radiome:theStation'),      options: opts([t('radiome:allStations'),t('radiome:followOnly')]) },
    { key: 'sort',    label: t('radiome:ranking'),     options: opts([t('radiome:latest'),t('radiome:oldest')]) },
  ]},
  // 9 — المحفوظات
  { id: 'saved',     label: t('radiome:archives'),  group: 'listener', filters: [
    { key: 'type',    label: t('radiome:contentType'), options: opts([t('radiome:program'),t('radiome:episode'),t('radiome:registration')]) },
    { key: 'station', label: t('radiome:theStation'),      options: opts([t('radiome:allStations'),t('radiome:followOnly')]) },
    { key: 'sort',    label: t('radiome:ranking'),     options: opts([t('radiome:latest'),t('radiome:oldest')]) },
  ]},
  // 10 — الإعادات
  { id: 'reposts',   label: t('radiome:replays'),   group: 'listener', filters: [
    { key: 'station', label: t('radiome:theStation'),  options: opts([t('radiome:allStations'),t('radiome:followOnly')]) },
    { key: 'sort',    label: t('radiome:ranking'), options: opts([t('radiome:latest'),t('radiome:oldest')]) },
  ]},
  // 11 — سجل الاستماع
  { id: 'listen-history', label: t('radiome:listeningRecord'), group: 'listener', filters: [
    { key: 'station',  label: t('radiome:theStation'),   options: opts([t('radiome:allStations'),t('radiome:followOnly')]) },
    { key: 'category', label: t('radiome:classification'), options: opts([t('radiome:news'),t('radiome:entertaining'),t('radiome:religious'),t('radiome:cultural'),t('radiome:athlete')]) },
    { key: 'sort',     label: t('radiome:ranking'), options: opts([t('radiome:latest'),t('radiome:oldest')]) },
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

  if (profileState.status === 'loading') return <LoadingScreen message={t('radiome:loadingYourProfile')} />;
  if (profileState.status === 'error') return (
    <div className="rme-page"><EmptyState icon="⚠️" title={t('radiome:anErrorOccurred')} description={profileState.message} /></div>
  );
  if (profileState.status === 'not-found') return (
    <div className="rme-page">
      <EmptyState icon="👤" title={t('radiome:yourProfileIsNotReadyYet')} description={t('radiome:yourPublicProfileWillBeCreatedAutomatica')} />
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

  const displayName = rp?.displayName ?? t('radiome:soundUser');
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
              <span className="material-symbols-outlined" aria-hidden="true" dir="ltr">verified</span>{t('radiome:reliable')}</span>
          )}
          <span className="rme-badge rme-badge--world">{t('radiome:radio')}</span>
          {isStationOwner && <span className="rme-badge rme-badge--owner">{t('radiome:stationOwner')}</span>}
        </div>
        <div className="rme-header-btns">
          <button id="rme-settings-btn" className="rme-hdr-btn" aria-label={t('radiome:settings')} type="button" onClick={() => navigate('/settings')}>
            <span className="material-symbols-outlined" aria-hidden="true" dir="ltr">settings</span>
          </button>
          <button id="rme-notifications-btn" className="rme-hdr-btn" aria-label={t('radiome:notifications')} type="button">
            <span className="material-symbols-outlined" aria-hidden="true" dir="ltr">notifications</span>
          </button>
          <button id="rme-inbox-btn" className="rme-hdr-btn" aria-label={t('radiome:messages')} type="button">
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
              <span className="rme-verified-icon" aria-label={t('radiome:reliable')}>
                <span className="material-symbols-outlined" aria-hidden="true" dir="ltr">verified</span>
              </span>
            )}
          </div>
          {username && <p className="rme-username"><span dir="ltr">@{username}</span></p>}
          {bio && <p className="rme-bio">{bio}</p>}
          <button id="rme-status-btn" className="rme-status-pill" type="button" aria-label={t('radiome:statusUpdate')}>
            <span className="material-symbols-outlined" aria-hidden="true" dir="ltr">edit_note</span>
            <span className="rme-status-pill__text">{t('radiome:addAStatusUpdate')}</span>
          </button>
          <div className="rme-listening-now" aria-label={t('radiome:listenNow')}>
            <span className="rme-listening-dot" aria-hidden="true" />
            <span className="rme-listening-label">{t('radiome:listenNow')}</span>
            <span className="rme-listening-track">—</span>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="rme-stats">
        {[
          { value: followers, label: t('radiome:followers') },
          { value: following, label: t('radiome:heContinues')   },
          { value: listens,   label: t('radiome:toListen')  },
          { value: likes,     label: t('radiome:wonder')   },
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
          <span className="material-symbols-outlined" aria-hidden="true" dir="ltr">edit</span>{t('radiome:editProfile')}</button>
        <button
          id="rme-share-btn"
          className="rme-btn rme-btn--ghost"
          type="button"
          aria-label={t('radiome:shareFile')}
          onClick={async () => {
            if (!username) return;
            const url = `${window.location.origin}/radio/user/${username}`;
            if (navigator.share) {
              try { await navigator.share({ title: t('radiome:shareFile'), url }); } catch (e) {}
            } else {
              await navigator.clipboard.writeText(url);
              alert('تم نسخ الرابط بنجاح!');
            }
          }}
        >
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
          : <span className="rme-social__hint">{t('radiome:addYourLinksInEditProfile')}</span>}
      </div>

      {/* Tabs — إذاعتي is ALWAYS tab #1 */}
      <nav className="rme-tabs" role="tablist" aria-label={t('radiome:radioFileContent')}>
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
        <div className="rme-filters" role="group" aria-label={t('radiome:contentFilters')}>
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
          title={t('radiome:yourRadio')}
          description={t('radiome:addYourRadioStationInformationToAppearHe')}
          action={{ label: t('radiome:radioPreparation'), onClick: () => navigate('/radio/create') }}
        />
      );
    }
    // No permission → eligibility / request panel (inside the tab, not above it)
    return (
      <div className="rme-station-cta">
        <span className="material-symbols-outlined rme-station-cta__icon" aria-hidden="true" dir="ltr">radio</span>
        <div className="rme-station-cta__body">
          <strong className="rme-station-cta__title">{t('radiome:doYouWantToCreateYourOwnRadio')}</strong>
          <p className="rme-station-cta__desc">
            {t('radiome:applyForRadioStationAuthorizationTheSoun')}</p>
          <div className="rme-station-cta__actions">
            <button id="rme-request-station-btn" className="rme-btn rme-btn--request" type="button">
              <span className="material-symbols-outlined" aria-hidden="true" dir="ltr">add_circle</span>
              {t('radiome:requestToCreateARadioStation')}</button>
            <button id="rme-request-permission-btn" className="rme-btn rme-btn--ghost-red" type="button">
              {t('radiome:stationValidityRequest')}</button>
          </div>
          <p className="rme-station-cta__note">
            {/* SCHEMA GAP: approval status not yet in publicProfiles/{uid} */}
            {t('radiome:reviewedByManagementMostRequestsAreProce')}</p>
        </div>
      </div>
    );
  }

  // All other tabs
  const PANELS: Partial<Record<RadioTab, React.ReactNode>> = {
    programs:     <EmptyState icon="🎙️" title={t('radiome:youHaventCreatedAnyProgramsYet')} description={t('radiome:startCreatingYourFirstRadioShow')} action={{ label: t('radiome:createAProgram'), onClick: () => navigate('/radio/create') }} />,
    schedule:     <EmptyState icon="📅" title={t('radiome:theRadioScheduleIsEmpty')} description={t('radiome:addYourShowsBroadcastTimesHere')} />,
    team:         <EmptyState icon="👥" title={t('radiome:thereIsNoWorkingTeamYet')} description={t('radiome:addStationTeamMembers')} />,
    about:        <EmptyState icon="ℹ️" title={t('radiome:noInformationAboutTheStationHasBeenAdded')} description={t('radiome:introduceYourStationInTheEditProfileSect')} />,
    contact:      <EmptyState icon="📬" title={t('radiome:contactInformationIsIncomplete')} description={t('radiome:addContactMethodsForYourStation')} />,
    advertise:    <EmptyState icon="📣" title={t('radiome:theAdsPageIsEmpty')} description={t('radiome:addDetailsOfYourStationsAdvertisingOptio')} />,
    liked:          <EmptyState icon="❤️" title={t('radiome:thereAreNoFavoritesYet')} description={t('radiome:theProgramsYouLikedWillAppearHere')} />,
    saved:          <EmptyState icon="🔖" title={t('radiome:noHistory')} description={t('radiome:saveTheProgramsYouWantToReturnTo')} />,
    reposts:        <EmptyState icon="🔄" title={t('radiome:thereAreNoReplays')} description={t('radiome:theContentYouRepostWillAppearHere')} />,
    'listen-history': <EmptyState icon="🕐" title={t('radiome:theListeningRecordIsEmpty')} description={t('radiome:theProgramsYouListenedToWillAppearHere')} />,
  };
  return <>{PANELS[tab] ?? null}</>;
}



