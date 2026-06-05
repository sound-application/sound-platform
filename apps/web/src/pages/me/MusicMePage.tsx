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
import i18n from "i18next";

const t = (key: any, options?: any) => i18n.t(key, options) as any as string;


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
    id: 'songs', label: t('musicme:songs'),
    filters: [
      { key: 'status',   label: t('musicme:theCondition'),    options: opts([t('musicme:manifesto'),t('musicme:draft'),t('musicme:archived')]) },
      { key: 'category', label: t('musicme:classification'),   options: opts([t('musicme:bob'),t('musicme:rock'),t('musicme:gulf'),t('musicme:classic'),t('musicme:electronic')]) },
      { key: 'country',  label: t('musicme:country'),     options: opts([t('musicme:saudiArabia'),t('musicme:egypt'),t('musicme:theUae'),t('musicme:kuwait'),t('musicme:morocco')]) },
      { key: 'sort',     label: t('musicme:ranking'),   options: opts([t('musicme:latest'),t('musicme:oldest'),t('musicme:mostListenedTo'),t('musicme:mostLiked')]) },
    ],
  },
  {
    id: 'albums', label: t('musicme:albums'),
    filters: [
      { key: 'status', label: t('musicme:theCondition'),  options: opts([t('musicme:manifesto'),t('musicme:draft'),t('musicme:archived')]) },
      { key: 'year',   label: t('musicme:sunnah'),   options: opts(['2025','2024','2023','2022',t('musicme:oldest1')]) },
      { key: 'sort',   label: t('musicme:ranking'), options: opts([t('musicme:latest'),t('musicme:oldest'),t('musicme:mostListenedTo')]) },
    ],
  },
  {
    id: 'labels', label: t('musicme:productionCompanies'),
    filters: [
      { key: 'status', label: t('musicme:theCondition'),   options: opts([t('musicme:active1'),t('musicme:ex')]) },
      { key: 'sort',   label: t('musicme:ranking'),  options: opts([t('musicme:latest'),t('musicme:oldest')]) },
    ],
  },
  {
    id: 'trends', label: t('musicme:myTrends'),
    filters: [
      { key: 'period',   label: t('musicme:period'),     options: opts([t('musicme:today'),t('musicme:thisWeek'),t('musicme:thisMonth')]) },
      { key: 'category', label: t('musicme:classification'),    options: opts([t('musicme:bob'),t('musicme:rock'),t('musicme:gulf'),t('musicme:classic')]) },
      { key: 'sort',     label: t('musicme:ranking'),    options: opts([t('musicme:mostListenedTo'),t('musicme:mostLiked')]) },
    ],
  },
  {
    id: 'mood', label: t('musicme:myMood'),
    filters: [
      { key: 'mood',   label: t('musicme:mood1'),         options: opts([t('musicme:calm'),t('musicme:active'),t('musicme:center'),t('musicme:cheerful'),t('musicme:sad')]) },
      { key: 'type',   label: t('musicme:contentType'),     options: opts([t('musicme:music1'),t('musicme:itsAPodcast'),t('musicme:phonetics')]) },
      { key: 'sort',   label: t('musicme:ranking'),         options: opts([t('musicme:latest'),t('musicme:mostListenedTo')]) },
    ],
  },
  {
    id: 'saved', label: t('musicme:archives'),
    filters: [
      { key: 'type', label: t('musicme:contentType'), options: opts([t('musicme:song'),t('musicme:album'),t('musicme:itsAPodcast')]) },
      { key: 'cat',  label: t('musicme:classification'),     options: opts([t('musicme:bob'),t('musicme:gulf'),t('musicme:classic')]) },
      { key: 'sort', label: t('musicme:ranking'),     options: opts([t('musicme:latest'),t('musicme:oldest')]) },
    ],
  },
  {
    id: 'reposts', label: t('musicme:replays'),
    filters: [
      { key: 'type', label: t('musicme:contentType'), options: opts([t('musicme:song'),t('musicme:album')]) },
      { key: 'sort', label: t('musicme:ranking'),     options: opts([t('musicme:latest'),t('musicme:oldest')]) },
    ],
  },
  {
    id: 'subscriptions', label: t('musicme:subscriptions'),
    filters: [
      { key: 'type', label: t('musicme:subscriptionType'), options: opts([t('musicme:artist'),t('musicme:album'),t('musicme:channel')]) },
      { key: 'sort', label: t('musicme:ranking'),      options: opts([t('musicme:latest'),t('musicme:oldest')]) },
    ],
  },
  {
    id: 'journeys', label: t('musicme:tripssessions'),
    filters: [
      { key: 'type', label: t('musicme:sessionType'), options: opts([t('musicme:aTrip'),t('musicme:mood'),t('musicme:customized')]) },
      { key: 'sort', label: t('musicme:ranking'),    options: opts([t('musicme:latest'),t('musicme:oldest'),t('musicme:theLongest')]) },
    ],
  },
  {
    id: 'liked', label: t('musicme:favorites'),
    filters: [
      { key: 'type', label: t('musicme:contentType'), options: opts([t('musicme:song'),t('musicme:album'),t('musicme:itsAPodcast')]) },
      { key: 'cat',  label: t('musicme:classification'),     options: opts([t('musicme:bob'),t('musicme:gulf'),t('musicme:classic')]) },
      { key: 'sort', label: t('musicme:ranking'),     options: opts([t('musicme:latest'),t('musicme:oldest'),t('musicme:mostListenedTo')]) },
    ],
  },
  {
    id: 'recent', label: t('musicme:theLast'),
    filters: [
      { key: 'type', label: t('musicme:contentType'), options: opts([t('musicme:song'),t('musicme:album'),t('musicme:artist')]) },
      { key: 'date', label: t('musicme:theDate'),     options: opts([t('musicme:today'),t('musicme:thisWeek'),t('musicme:thisMonth')]) },
      { key: 'sort', label: t('musicme:ranking'),     options: opts([t('musicme:latest'),t('musicme:oldest')]) },
    ],
  },
  {
    id: 'history', label: t('musicme:listeningRecord'),
    filters: [
      { key: 'type', label: t('musicme:contentType'), options: opts([t('musicme:song'),t('musicme:album'),t('musicme:itsAPodcast')]) },
      { key: 'date', label: t('musicme:theDate'),     options: opts([t('musicme:today'),t('musicme:thisWeek'),t('musicme:thisMonth'),t('musicme:oldest1')]) },
      { key: 'sort', label: t('musicme:ranking'),     options: opts([t('musicme:latest'),t('musicme:oldest')]) },
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
    return <LoadingScreen message={t('musicme:loadingYourProfile')} />;
  }

  if (profileState.status === 'error') {
    return (
      <div className="mme-page">
        <EmptyState icon="⚠️" title={t('musicme:anErrorOccurred')} description={profileState.message} />
      </div>
    );
  }

  if (profileState.status === 'not-found') {
    return (
      <div className="mme-page">
        <EmptyState
          icon="👤"
          title={t('musicme:yourProfileIsNotReadyYet')}
          description={t('musicme:yourPublicProfileWillBeCreatedAutomatica')}
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
  const displayName  = musicProfile?.displayName ?? t('musicme:soundUser');
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
              {t('musicme:reliable')}</span>
          )}
          <span className="mme-badge mme-badge--world">{t('musicme:music')}</span>
        </div>

        {/* Controls — left side (RTL end) */}
        <div className="mme-header-btns">
          <button
            id="mme-settings-btn"
            className="mme-hdr-btn"
            aria-label={t('musicme:settings')}
            type="button"
            onClick={() => navigate('/settings')}
          >
            <span className="material-symbols-outlined" aria-hidden="true" dir="ltr">settings</span>
          </button>
          <button
            id="mme-notifications-btn"
            className="mme-hdr-btn"
            aria-label={t('musicme:notifications')}
            type="button"
          >
            <span className="material-symbols-outlined" aria-hidden="true" dir="ltr">notifications</span>
          </button>
          <button
            id="mme-inbox-btn"
            className="mme-hdr-btn"
            aria-label={t('musicme:messages')}
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
              <span className="mme-verified-icon" aria-label={t('musicme:reliable')}>
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
            aria-label={t('musicme:statusUpdate')}
          >
            <span className="material-symbols-outlined" aria-hidden="true" dir="ltr">edit_note</span>
            <span className="mme-status-pill__text">{t('musicme:addAStatusUpdate')}</span>
          </button>

          {/* Listening-now presence */}
          <div className="mme-listening-now" aria-label={t('musicme:listenNow')}>
            <span className="mme-listening-dot" aria-hidden="true" />
            <span className="mme-listening-label">{t('musicme:listenNow')}</span>
            <span className="mme-listening-track">—</span>
          </div>

        </div>
      </div>

      {/* ── Stats ──────────────────────────────────────────────────────── */}
      <div className="mme-stats">
        {[
          { value: followers, label: t('musicme:followers') },
          { value: following, label: t('musicme:heContinues')   },
          { value: listens,   label: t('musicme:toListen')  },
          { value: likes,     label: t('musicme:wonder')   },
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
          {t('musicme:editProfile')}</button>
        <button
          id="mme-share-btn"
          className="mme-btn mme-btn--ghost"
          type="button"
          aria-label={t('musicme:shareFile')}
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
          <span className="mme-social__hint">{t('musicme:addYourLinksInEditProfile')}</span>
        )}
      </div>

      {/* ── Content Tabs ────────────────────────────────────────────────── */}
      <nav
        className="mme-tabs"
        role="tablist"
        aria-label={t('musicme:musicFileContent')}
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
        <div className="mme-filters" role="group" aria-label={t('musicme:contentFilters')}>
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
    songs:         <EmptyState icon="🎵" title={t('musicme:sheHasntPublishedAnySongsYet')} description={t('musicme:startPublishingYourSongsInTheMusicWorld')} action={{ label: t('musicme:createContent'), onClick: () => navigate('/music/create') }} />,
    albums:        <EmptyState icon="💿" title={t('musicme:thereAreNoAlbums')} description={t('musicme:createYourFirstMusicAlbum')} action={{ label: t('musicme:createAnAlbum'), disabled: true, disabledReason: t('musicme:almost') }} />,
    labels:        <EmptyState icon="🏢" title={t('musicme:thereAreNoProductionCompaniesAssociated')} description={t('musicme:productionCompaniesAssociatedWithYourCon')} />,
    trends:        <EmptyState icon="🔥" title={t('musicme:thereAreNoTrendsYet')} description={t('musicme:yourHitSongsWillAppearHere')} />,
    mood:          <EmptyState icon="🎭" title={t('musicme:noMoodListsYet')} description={t('musicme:saveMoodListsFromPlatformContent')} />,
    saved:         <EmptyState icon="🔖" title={t('musicme:noHistory')} description={t('musicme:saveTheContentYouWantToReturnTo')} />,
    reposts:       <EmptyState icon="🔄" title={t('musicme:thereAreNoReplays')} description={t('musicme:theContentYouRepostWillAppearHere')} />,
    subscriptions: <EmptyState icon="⭐" title={t('musicme:thereAreNoSubscriptionsYet')} description={t('musicme:yourSubscriptionsAndMembershipsWillAppea')} />,
    journeys:      <EmptyState icon="🛣️" title={t('musicme:thereAreNoFlightsYet')} description={t('musicme:hearingsOnTheRoadWillAppearHere')} />,
    liked:         <EmptyState icon="❤️" title={t('musicme:thereAreNoFavoritesYet')} description={t('musicme:contentYouLikedWillAppearHere')} />,
    recent:        <EmptyState icon="🕐" title={t('musicme:thereIsNoRecentContent')} description={t('musicme:yourLastListenWillAppearHere')} />,
    history:       <EmptyState icon="📋" title={t('musicme:theListeningRecordIsEmpty')} description={t('musicme:theContentYouListenedToWillAppearHere')} />,
  };
  return <>{PANELS[tab] ?? null}</>;
}
