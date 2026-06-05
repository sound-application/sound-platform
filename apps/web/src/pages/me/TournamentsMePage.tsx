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
import i18n from "i18next";

const t = (key: any, options?: any) => i18n.t(key, options) as any as string;


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
  { id: 'my-competitions',      label: t('tournamentsme:competitions2'),
    filters: [
      { key:'status',  label:t('tournamentsme:theCondition'),  options: opts([t('tournamentsme:active'),t('tournamentsme:itsOver'),t('tournamentsme:coming')]) },
      { key:'role',    label:t('tournamentsme:theRole'),   options: opts([t('tournamentsme:constructor1'),t('tournamentsme:participant'),t('tournamentsme:careful')]) },
      { key:'sort',    label:t('tournamentsme:ranking'), options: opts([t('tournamentsme:latest'),t('tournamentsme:oldest'),t('tournamentsme:mostShared')]) },
    ],
  },
  // 2 — الإدارة النشطة  (organizer/admin)
  { id: 'active-management',    label: t('tournamentsme:activeManagement'),
    role: ['organizer','admin'],
    filters: [
      { key:'status', label:t('tournamentsme:theCondition'),   options: opts([t('tournamentsme:ongoing'),t('tournamentsme:waiting'),t('tournamentsme:closed')]) },
      { key:'stage',  label:t('tournamentsme:stage'),  options: opts([t('tournamentsme:registration'),t('tournamentsme:vote1'),t('tournamentsme:conclusion')]) },
      { key:'sort',   label:t('tournamentsme:ranking'),  options: opts([t('tournamentsme:latest'),t('tournamentsme:mostShared')]) },
    ],
  },
  // 3 — المشاركات المستلمة  (organizer/admin)
  { id: 'received-submissions', label: t('tournamentsme:postsReceived'),
    role: ['organizer','admin'],
    filters: [
      { key:'status',   label:t('tournamentsme:theCondition'),  options: opts([t('tournamentsme:underReview'),t('tournamentsme:acceptable'),t('tournamentsme:rejected')]) },
      { key:'category', label:t('tournamentsme:category'),   options: opts([t('tournamentsme:voice'),t('tournamentsme:music'),t('tournamentsme:radio')]) },
      { key:'sort',     label:t('tournamentsme:ranking'), options: opts([t('tournamentsme:latest'),t('tournamentsme:oldest')]) },
    ],
  },
  // 4 — التصويت والتحكيم  (jury)
  { id: 'jury-tasks',           label: t('tournamentsme:votingAndArbitration'),
    role: 'jury',
    filters: [
      { key:'status',      label:t('tournamentsme:theCondition'),    options: opts([t('tournamentsme:suspended'),t('tournamentsme:complete')]) },
      { key:'competition', label:t('tournamentsme:contest'),  options: opts([t('tournamentsme:everyone')]) },
      { key:'sort',        label:t('tournamentsme:ranking'),   options: opts([t('tournamentsme:latest'),t('tournamentsme:oldest')]) },
    ],
  },
  // 5 — النتائج / الفائزون  (organizer/admin)
  { id: 'results',              label: t('tournamentsme:resultswinners'),
    role: ['organizer','admin'],
    filters: [
      { key:'competition', label:t('tournamentsme:contest'), options: opts([t('tournamentsme:everyone')]) },
      { key:'category',    label:t('tournamentsme:category'),    options: opts([t('tournamentsme:everyone'),t('tournamentsme:voice'),t('tournamentsme:music')]) },
      { key:'sort',        label:t('tournamentsme:ranking'),  options: opts([t('tournamentsme:latest'),t('tournamentsme:oldest')]) },
    ],
  },
  // 6 — الدعوات / المسابقات المغلقة  (organizer/admin)
  { id: 'invitations',          label: t('tournamentsme:invitationsclosedContests'),
    role: ['organizer','admin'],
    filters: [
      { key:'status', label:t('tournamentsme:theCondition'),  options: opts([t('tournamentsme:new'),t('tournamentsme:acceptable'),t('tournamentsme:rejected')]) },
      { key:'sort',   label:t('tournamentsme:ranking'), options: opts([t('tournamentsme:latest'),t('tournamentsme:oldest')]) },
    ],
  },
  // 7 — المسابقات المنضم لها
  { id: 'joined',               label: t('tournamentsme:competitionsJoined'),
    filters: [
      { key:'status',   label:t('tournamentsme:theCondition'),  options: opts([t('tournamentsme:active'),t('tournamentsme:itsOver')]) },
      { key:'category', label:t('tournamentsme:category'),   options: opts([t('tournamentsme:everyone'),t('tournamentsme:voice'),t('tournamentsme:music'),t('tournamentsme:radio')]) },
      { key:'sort',     label:t('tournamentsme:ranking'), options: opts([t('tournamentsme:latest'),t('tournamentsme:oldest')]) },
    ],
  },
  // 8 — مشاركاتي
  { id: 'my-submissions',       label: t('tournamentsme:myPosts'),
    filters: [
      { key:'status',      label:t('tournamentsme:theCondition'),    options: opts([t('tournamentsme:acceptable'),t('tournamentsme:underReview'),t('tournamentsme:rejected')]) },
      { key:'competition', label:t('tournamentsme:contest'),  options: opts([t('tournamentsme:everyone')]) },
      { key:'sort',        label:t('tournamentsme:ranking'),   options: opts([t('tournamentsme:latest'),t('tournamentsme:oldest')]) },
    ],
  },
  // 9 — التصويت الآن
  { id: 'vote-now',             label: t('tournamentsme:voteNow'),
    filters: [
      { key:'category', label:t('tournamentsme:category'),    options: opts([t('tournamentsme:everyone'),t('tournamentsme:voice'),t('tournamentsme:music')]) },
      { key:'stage',    label:t('tournamentsme:stage'),  options: opts([t('tournamentsme:theFirst'),t('tournamentsme:final')]) },
      { key:'sort',     label:t('tournamentsme:ranking'),  options: opts([t('tournamentsme:latest'),t('tournamentsme:mostVoted')]) },
    ],
  },
  // 10 — أصواتي
  { id: 'my-votes',             label: t('tournamentsme:myVotes'),
    filters: [
      { key:'competition', label:t('tournamentsme:contest'), options: opts([t('tournamentsme:everyone')]) },
      { key:'sort',        label:t('tournamentsme:ranking'),  options: opts([t('tournamentsme:latest'),t('tournamentsme:oldest')]) },
    ],
  },
  // 11 — الجوائز / الميداليات
  { id: 'awards',               label: t('tournamentsme:awardsmedals'),
    filters: [
      { key:'type',        label:t('tournamentsme:prizeType'), options: opts([t('tournamentsme:golden'),t('tournamentsme:silver'),t('tournamentsme:bronze'),t('tournamentsme:discretionary')]) },
      { key:'competition', label:t('tournamentsme:contest'),    options: opts([t('tournamentsme:everyone')]) },
      { key:'sort',        label:t('tournamentsme:ranking'),     options: opts([t('tournamentsme:latest'),t('tournamentsme:oldest')]) },
    ],
  },
  // 12 — المحفوظات
  { id: 'saved',                label: t('tournamentsme:archives'),
    filters: [
      { key:'type', label:t('tournamentsme:contentType'), options: opts([t('tournamentsme:everyone'),t('tournamentsme:aRace'),t('tournamentsme:theProcess')]) },
      { key:'sort', label:t('tournamentsme:ranking'),    options: opts([t('tournamentsme:latest'),t('tournamentsme:oldest')]) },
    ],
  },
  // 13 — المفضلة
  { id: 'liked',                label: t('tournamentsme:favorites'),
    filters: [
      { key:'type', label:t('tournamentsme:contentType'), options: opts([t('tournamentsme:everyone'),t('tournamentsme:aRace'),t('tournamentsme:theProcess'),t('tournamentsme:aResult')]) },
      { key:'sort', label:t('tournamentsme:ranking'),    options: opts([t('tournamentsme:latest'),t('tournamentsme:oldest')]) },
    ],
  },
  // 14 — الإعادات
  { id: 'reposts',              label: t('tournamentsme:replays'),
    filters: [
      { key:'competition', label:t('tournamentsme:contest'), options: opts([t('tournamentsme:everyone')]) },
      { key:'sort',        label:t('tournamentsme:ranking'),  options: opts([t('tournamentsme:latest'),t('tournamentsme:oldest')]) },
    ],
  },
  // 15 — السجل
  { id: 'history',              label: t('tournamentsme:record'),
    filters: [
      { key:'type', label:t('tournamentsme:typeOfActivity'), options: opts([t('tournamentsme:everyone'),t('tournamentsme:sharing'),t('tournamentsme:vote'),t('tournamentsme:arbitration'),t('tournamentsme:victory')]) },
      { key:'sort', label:t('tournamentsme:ranking'),   options: opts([t('tournamentsme:latest'),t('tournamentsme:oldest')]) },
    ],
  },
  // 16 — الاشتراكات
  { id: 'subscriptions',        label: t('tournamentsme:subscriptions'),
    filters: [
      { key:'type', label:t('tournamentsme:subscriptionType'), options: opts([t('tournamentsme:everyone'),t('tournamentsme:aRace'),t('tournamentsme:constructor1')]) },
      { key:'sort', label:t('tournamentsme:ranking'),      options: opts([t('tournamentsme:latest'),t('tournamentsme:oldest')]) },
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

  if (profileState.status === 'loading') return <LoadingScreen message={t('tournamentsme:loadingYourProfile')} />;
  if (profileState.status === 'error')   return <div className="tme-page"><EmptyState icon="⚠️" title={t('tournamentsme:anErrorOccurred')} description={profileState.message} /></div>;
  if (profileState.status === 'not-found') return (
    <div className="tme-page">
      <EmptyState icon="👤" title={t('tournamentsme:yourProfileIsNotReadyYet')} description={t('tournamentsme:yourPublicProfileWillBeCreatedAutomatica')} />
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

  const displayName = tp?.displayName ?? t('tournamentsme:soundUser');
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
              <span className="material-symbols-outlined" aria-hidden="true" dir="ltr">verified</span>{t('tournamentsme:reliable')}</span>
          )}
          <span className="tme-badge tme-badge--world">{t('tournamentsme:competitions1')}</span>
          {userRoles.includes('organizer') && <span className="tme-badge tme-badge--role">{t('tournamentsme:organized')}</span>}
          {userRoles.includes('admin')     && <span className="tme-badge tme-badge--role">{t('tournamentsme:boss')}</span>}
          {userRoles.includes('jury')      && <span className="tme-badge tme-badge--role">{t('tournamentsme:tight')}</span>}
        </div>
        <div className="tme-header-btns">
          <button id="tme-settings-btn" className="tme-hdr-btn" aria-label={t('tournamentsme:settings')} type="button" onClick={() => navigate('/settings')}>
            <span className="material-symbols-outlined" aria-hidden="true" dir="ltr">settings</span>
          </button>
          <button id="tme-notifications-btn" className="tme-hdr-btn" aria-label={t('tournamentsme:notifications')} type="button">
            <span className="material-symbols-outlined" aria-hidden="true" dir="ltr">notifications</span>
          </button>
          <button id="tme-inbox-btn" className="tme-hdr-btn" aria-label={t('tournamentsme:messages')} type="button">
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
              <span className="tme-verified-icon" aria-label={t('tournamentsme:reliable')}>
                <span className="material-symbols-outlined" aria-hidden="true" dir="ltr">verified</span>
              </span>
            )}
          </div>
          {username && <p className="tme-username"><span dir="ltr">@{username}</span></p>}
          {bio && <p className="tme-bio">{bio}</p>}
          <button id="tme-status-btn" className="tme-status-pill" type="button" aria-label={t('tournamentsme:statusUpdate')}>
            <span className="material-symbols-outlined" aria-hidden="true" dir="ltr">edit_note</span>
            <span className="tme-status-pill__text">{t('tournamentsme:addAStatusUpdate')}</span>
          </button>
          <div className="tme-listening-now" aria-label={t('tournamentsme:listenNow')}>
            <span className="tme-listening-dot" aria-hidden="true" />
            <span className="tme-listening-label">{t('tournamentsme:listenNow')}</span>
            <span className="tme-listening-track">—</span>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="tme-stats">
        {[
          {value:followers,   label:t('tournamentsme:followers')},
          {value:following,   label:t('tournamentsme:heContinues')},
          {value:competitions,label:t('tournamentsme:competitions')},
          {value:awards,      label:t('tournamentsme:awards')},
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
          <span className="material-symbols-outlined" aria-hidden="true" dir="ltr">edit</span>{t('tournamentsme:editProfile')}</button>
        <button
          id="tme-share-btn"
          className="tme-btn tme-btn--ghost"
          type="button"
          aria-label={t('tournamentsme:shareFile')}
          onClick={async () => {
            if (!username) return;
            const url = `${window.location.origin}/tournaments/user/${username}`;
            if (navigator.share) {
              try { await navigator.share({ title: t('tournamentsme:shareFile'), url }); } catch (e) {}
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
      <div className="tme-social">
        {hasLinks
          ? Object.entries(socialLinks!).map(([pl, url]) => (
              <a key={pl} href={typeof url==='string'?url:'#'} className="tme-social__link" target="_blank" rel="noopener noreferrer" aria-label={pl}>
                <span className="material-symbols-outlined" aria-hidden="true" dir="ltr">{SOCIAL_ICON[pl.toLowerCase()]??'link'}</span>
              </a>
            ))
          : <span className="tme-social__hint">{t('tournamentsme:addYourLinksInEditProfile')}</span>}
      </div>

      {/* Tabs */}
      <nav className="tme-tabs" role="tablist" aria-label={t('tournamentsme:competitionFileContent')}>
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
        <div className="tme-filters" aria-label={t('tournamentsme:contentFilters')}>
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
    'my-competitions':      <EmptyState icon="🏆" title={t('tournamentsme:thereAreNoCompetitionsYet')} description={t('tournamentsme:contestsYouCreatedOrParticipatedInWillAp')} action={{label:t('tournamentsme:exploreCompetitions'), onClick:()=>navigate('/tournaments/home')}} />,
    'active-management':    <EmptyState icon="⚙️" title={t('tournamentsme:thereAreNoActiveContestsToRun')} description={t('tournamentsme:contestsYouAreCurrentlyRunningWillAppear')} />,
    'received-submissions': <EmptyState icon="📥" title={t('tournamentsme:noEntriesReceived')} description={t('tournamentsme:contestantsEntriesInYourContestsWillAppe')} />,
    'jury-tasks':           <EmptyState icon="⚖️" title={t('tournamentsme:thereAreNoPendingJudgingAssignments')} description={t('tournamentsme:yourDutiesAsAJuryMemberWillAppearHere')} />,
    'results':              <EmptyState icon="📊" title={t('tournamentsme:noResultsYet')} description={t('tournamentsme:contestResultsWillAppearHere')} />,
    'invitations':          <EmptyState icon="✉️" title={t('tournamentsme:noInvitations')} description={t('tournamentsme:closedInvitationsAndContestsWillAppearHe')} />,
    'joined':               <EmptyState icon="🔗" title={t('tournamentsme:youHaveNotJoinedAnyCompetitionYet')} description={t('tournamentsme:contestsYouHaveJoinedWillAppearHere')} action={{label:t('tournamentsme:exploreCompetitions'), onClick:()=>navigate('/tournaments/home')}} />,
    'my-submissions':       <EmptyState icon="📤" title={t('tournamentsme:sheHasNotParticipatedInAnyCompetitionYet')} description={t('tournamentsme:yourEntriesInTheCompetitionsWillAppearHe')} action={{label:t('tournamentsme:exploreCompetitions'), onClick:()=>navigate('/tournaments/home')}} />,
    'vote-now':             <EmptyState icon="🗳️" title={t('tournamentsme:thereAreNoActiveVotesRightNow')} description={t('tournamentsme:contestsOpenForVotingWillAppearHere')} />,
    'my-votes':             <EmptyState icon="✅" title={t('tournamentsme:youHaventVotedYet')} description={t('tournamentsme:businessesYouVotedForWillAppearHere')} />,
    'awards':               <EmptyState icon="🎖️" title={t('tournamentsme:thereAreNoPrizesYet')} description={t('tournamentsme:yourAwardsAndMedalsWillAppearHere')} />,
    'saved':                <EmptyState icon="🔖" title={t('tournamentsme:noHistory')} description={t('tournamentsme:saveTheContentYouWantToReturnTo')} />,
    'liked':                <EmptyState icon="❤️" title={t('tournamentsme:thereAreNoFavoritesYet')} description={t('tournamentsme:theContentYouLikedWillAppearHere')} />,
    'reposts':              <EmptyState icon="🔄" title={t('tournamentsme:thereAreNoReplays')} description={t('tournamentsme:theContentYouRepostWillAppearHere')} />,
    'history':              <EmptyState icon="🕐" title={t('tournamentsme:theActivityLogIsEmpty')} description={t('tournamentsme:yourActivityInCompetitionsWillAppearHere')} />,
    'subscriptions':        <EmptyState icon="🔔" title={t('tournamentsme:thereAreNoSubscriptionsYet')} description={t('tournamentsme:contestsAndCreatorsYouveSignedUpWithWill')} />,
  };
  return <>{PANELS[tab] ?? null}</>;
}



