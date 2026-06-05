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
import i18n from "i18next";

const t = (key: any, options?: any) => i18n.t(key, options) as any as string;


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
    id: 'content', label: t('plusme:content'),
    filters: [
      { key: 'type',     label: t('plusme:contentType'), options: opts([t('plusme:itsAPodcast'),t('plusme:audioEssay'),t('plusme:interview'),t('plusme:registration'),t('plusme:short')]) },
      { key: 'status',   label: t('plusme:theCondition'),       options: opts([t('plusme:manifesto'),t('plusme:draft'),t('plusme:archived')]) },
      { key: 'category', label: t('plusme:classification'),      options: opts([t('plusme:culture'),t('plusme:technique'),t('plusme:sports'),t('plusme:entertainment'),t('plusme:news')]) },
      { key: 'sort',     label: t('plusme:ranking'),      options: opts([t('plusme:latest'),t('plusme:oldest'),t('plusme:mostListenedTo'),t('plusme:mostLiked')]) },
    ],
  },
  {
    id: 'podcast', label: t('plusme:itsAPodcast'),
    filters: [
      { key: 'status',   label: t('plusme:theCondition'),   options: opts([t('plusme:manifesto'),t('plusme:draft'),t('plusme:archived')]) },
      { key: 'category', label: t('plusme:classification'), options: opts([t('plusme:culture'),t('plusme:technique'),t('plusme:sports'),t('plusme:entertainment'),t('plusme:news')]) },
      { key: 'sort',     label: t('plusme:ranking'), options: opts([t('plusme:latest'),t('plusme:oldest'),t('plusme:mostListenedTo')]) },
    ],
  },
  {
    id: 'trends', label: t('plusme:myTrends'),
    filters: [
      { key: 'period', label: t('plusme:period'),      options: opts([t('plusme:today'),t('plusme:thisWeek'),t('plusme:thisMonth')]) },
      { key: 'type',   label: t('plusme:contentType'), options: opts([t('plusme:itsAPodcast'),t('plusme:short'),t('plusme:articles')]) },
      { key: 'sort',   label: t('plusme:ranking'),     options: opts([t('plusme:mostListenedTo'),t('plusme:mostLiked'),t('plusme:mostShared')]) },
    ],
  },
  {
    id: 'mood', label: t('plusme:myMood'),
    filters: [
      { key: 'mood',   label: t('plusme:moodpurpose'), options: opts([t('plusme:calm'),t('plusme:active1'),t('plusme:center'),t('plusme:cheerful'),t('plusme:sad')]) },
      { key: 'type',   label: t('plusme:contentType'),     options: opts([t('plusme:music'),t('plusme:itsAPodcast'),t('plusme:phonetics')]) },
      { key: 'source', label: t('plusme:sourceworld'), options: opts([t('plusme:general'),t('plusme:plus1'),t('plusme:music'),t('plusme:radio')]) },
      { key: 'sort',   label: t('plusme:ranking'),         options: opts([t('plusme:latest'),t('plusme:mostListenedTo')]) },
    ],
  },
  {
    id: 'saved', label: t('plusme:archives'),
    filters: [
      { key: 'type', label: t('plusme:contentType'), options: opts([t('plusme:itsAPodcast'),t('plusme:music'),t('plusme:radio'),t('plusme:articles')]) },
      { key: 'cat',  label: t('plusme:classification'),     options: opts([t('plusme:culture'),t('plusme:technique'),t('plusme:entertainment')]) },
      { key: 'sort', label: t('plusme:ranking'),     options: opts([t('plusme:latest'),t('plusme:oldest')]) },
    ],
  },
  {
    id: 'reposts', label: t('plusme:replays'),
    filters: [
      { key: 'type', label: t('plusme:contentType'), options: opts([t('plusme:itsAPodcast'),t('plusme:music'),t('plusme:articles')]) },
      { key: 'sort', label: t('plusme:ranking'),     options: opts([t('plusme:latest'),t('plusme:oldest')]) },
    ],
  },
  {
    id: 'journeys', label: t('plusme:tripssessions'),
    filters: [
      { key: 'type', label: t('plusme:tripType'), options: opts([t('plusme:onTheRoad'),t('plusme:hearing'),t('plusme:mixed')]) },
      { key: 'date', label: t('plusme:theDate'),    options: opts([t('plusme:today'),t('plusme:thisWeek'),t('plusme:thisMonth'),t('plusme:oldest1')]) },
      { key: 'sort', label: t('plusme:ranking'),   options: opts([t('plusme:latest'),t('plusme:oldest')]) },
    ],
  },
  {
    id: 'liked', label: t('plusme:favorites'),
    filters: [
      { key: 'type', label: t('plusme:contentType'), options: opts([t('plusme:itsAPodcast'),t('plusme:music'),t('plusme:radio'),t('plusme:phonetics')]) },
      { key: 'cat',  label: t('plusme:classification'),     options: opts([t('plusme:culture'),t('plusme:technique'),t('plusme:entertainment'),t('plusme:sports')]) },
      { key: 'sort', label: t('plusme:ranking'),     options: opts([t('plusme:latest'),t('plusme:oldest'),t('plusme:mostListenedTo')]) },
    ],
  },
  {
    id: 'history', label: t('plusme:record'),
    filters: [
      { key: 'type', label: t('plusme:contentType'), options: opts([t('plusme:itsAPodcast'),t('plusme:music'),t('plusme:radio')]) },
      { key: 'date', label: t('plusme:theDate'),     options: opts([t('plusme:today'),t('plusme:thisWeek'),t('plusme:thisMonth'),t('plusme:oldest1')]) },
      { key: 'sort', label: t('plusme:ranking'),     options: opts([t('plusme:latest'),t('plusme:oldest')]) },
    ],
  },
  {
    id: 'subscriptions', label: t('plusme:subscriptions'),
    filters: [
      { key: 'subType', label: t('plusme:subscriptionType'), options: opts([t('plusme:citizen'),t('plusme:annual'),t('plusme:lifelong')]) },
      { key: 'status',  label: t('plusme:theCondition'),        options: opts([t('plusme:active'),t('plusme:theEnd'),t('plusme:canceled')]) },
      { key: 'sort',    label: t('plusme:ranking'),       options: opts([t('plusme:latest'),t('plusme:oldest'),t('plusme:endDate')]) },
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
    return <LoadingScreen message={t('plusme:loadingYourProfile')} />;
  }

  if (profileState.status === 'error') {
    return (
      <div className="pme-page">
        <EmptyState icon="⚠️" title={t('plusme:anErrorOccurred')} description={profileState.message} />
      </div>
    );
  }

  if (profileState.status === 'not-found') {
    return (
      <div className="pme-page">
        <EmptyState
          icon="👤"
          title={t('plusme:yourProfileIsNotReadyYet')}
          description={t('plusme:yourPublicProfileWillBeCreatedAutomatica')}
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
  const displayName = plusProfile?.displayName ?? t('plusme:soundUser');
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
              {t('plusme:reliable')}</span>
          )}
          <span className="pme-badge pme-badge--world">{t('plusme:plus')}</span>
        </div>

        {/* Controls — left side (RTL end) */}
        <div className="pme-header-btns">
          <button
            id="pme-settings-btn"
            className="pme-hdr-btn"
            aria-label={t('plusme:settings')}
            type="button"
            onClick={() => navigate('/settings')}
          >
            <span className="material-symbols-outlined" aria-hidden="true" dir="ltr">settings</span>
          </button>
          <button
            id="pme-notifications-btn"
            className="pme-hdr-btn"
            aria-label={t('plusme:notifications')}
            type="button"
          >
            <span className="material-symbols-outlined" aria-hidden="true" dir="ltr">notifications</span>
          </button>
          <button
            id="pme-inbox-btn"
            className="pme-hdr-btn"
            aria-label={t('plusme:messages')}
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
              <span className="pme-verified-icon" aria-label={t('plusme:reliable')}>
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
            aria-label={t('plusme:statusUpdate')}
          >
            <span className="material-symbols-outlined" aria-hidden="true" dir="ltr">edit_note</span>
            <span className="pme-status-pill__text">{t('plusme:addAStatusUpdate')}</span>
          </button>

          {/* Listening-now presence */}
          <div className="pme-listening-now" aria-label={t('plusme:listenNow')}>
            <span className="pme-listening-dot" aria-hidden="true" />
            <span className="pme-listening-label">{t('plusme:listenNow')}</span>
            <span className="pme-listening-track">—</span>
          </div>

        </div>
      </div>

      {/* ── Stats ──────────────────────────────────────────────────────── */}
      <div className="pme-stats">
        {[
          { value: followers, label: t('plusme:followers') },
          { value: following, label: t('plusme:heContinues')   },
          { value: listens,   label: t('plusme:toListen')  },
          { value: likes,     label: t('plusme:wonder')   },
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
          {t('plusme:editProfile')}</button>
        <button
          id="pme-share-btn"
          className="pme-btn pme-btn--ghost"
          type="button"
          aria-label={t('plusme:shareFile')}
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
          <span className="pme-social__hint">{t('plusme:addYourLinksInEditProfile')}</span>
        )}
      </div>

      {/* ── Content Tabs ────────────────────────────────────────────────── */}
      <nav
        className="pme-tabs"
        role="tablist"
        aria-label={t('plusme:plusFileContent')}
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
        <div className="pme-filters" role="group" aria-label={t('plusme:contentFilters')}>
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
          title={t('plusme:youHaventPostedAnyContentYet')}
          description={t('plusme:startPublishingYourContentOnPlus')}
          action={{ label: t('plusme:createContent'), onClick: () => navigate('/plus/create') }}
        />
      );
    case 'podcast':
      return (
        <EmptyState
          icon="🎧"
          title={t('plusme:thereAreNoPodcastEpisodesYet')}
          description={t('plusme:publishYourFirstPodcastEpisodeOnPlus')}
          action={{ label: t('plusme:createAPodcast'), onClick: () => navigate('/plus/create') }}
        />
      );
    case 'trends':
      return (
        <EmptyState
          icon="📈"
          title={t('plusme:thereAreNoTrendsYet')}
          description={t('plusme:yourPopularContentWillAppearHere')}
        />
      );
    case 'mood':
      return (
        <EmptyState
          icon="🎭"
          title={t('plusme:noMoodListsYet')}
          description={t('plusme:createListsThatExpressYourMoodAndThought')}
        />
      );
    case 'saved':
      return (
        <EmptyState
          icon="🔖"
          title={t('plusme:noHistory')}
          description={t('plusme:saveTheContentYouWantToReturnTo')}
        />
      );
    case 'reposts':
      return (
        <EmptyState
          icon="🔄"
          title={t('plusme:thereAreNoReplays')}
          description={t('plusme:theContentYouRepostWillAppearHere')}
        />
      );
    case 'journeys':
      return (
        <EmptyState
          icon="🚗"
          title={t('plusme:noTripsOrSessionsYet')}
          description={t('plusme:hearingsOnTheRoadWillAppearHere')}
        />
      );
    case 'liked':
      return (
        <EmptyState
          icon="❤️"
          title={t('plusme:thereAreNoFavoritesYet')}
          description={t('plusme:contentYouLikedWillAppearHere')}
        />
      );
    case 'history':
      return (
        <EmptyState
          icon="🕐"
          title={t('plusme:theListeningRecordIsEmpty')}
          description={t('plusme:theContentYouListenedToWillAppearHere')}
        />
      );
    case 'subscriptions':
      return (
        <EmptyState
          icon="⭐"
          title={t('plusme:thereAreNoSubscriptionsYet')}
          description={t('plusme:yourSubscriptionsAndMembershipsWillAppea')}
        />
      );
    default:
      return null;
  }
}
