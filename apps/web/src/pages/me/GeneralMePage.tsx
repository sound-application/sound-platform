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
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import type { PublicProfileDoc, AudioContentDoc } from '@sound/shared';
import { AudioContentCard } from '../../components/AudioContentCard';
import { showToast } from '../../utils/toast';
import './GeneralMePage.css';
import i18n from "i18next";

const t = (key: any, options?: any) => i18n.t(key, options) as any as string;


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
  | 'subscriptions'
  | 'drafts';

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
    id: 'content', label: t('generalme:content'),
    filters: [
      { key: 'type',     label: t('generalme:contentType'), options: opts([t('generalme:itsAPodcast'),t('generalme:audioEssay'),t('generalme:interview'),t('generalme:registration'),t('generalme:short')]) },
      { key: 'status',   label: t('generalme:theCondition'),       options: opts([t('generalme:manifesto'),t('generalme:draft'),t('generalme:archived')]) },
      { key: 'category', label: t('generalme:classification'),      options: opts([t('generalme:culture'),t('generalme:technique'),t('generalme:sports'),t('generalme:entertainment'),t('generalme:news')]) },
      { key: 'sort',     label: t('generalme:ranking'),      options: opts([t('generalme:latest'),t('generalme:oldest'),t('generalme:mostListenedTo'),t('generalme:mostLiked')]) },
    ],
  },
  {
    id: 'podcast', label: t('generalme:itsAPodcast'),
    filters: [
      { key: 'status',   label: t('generalme:theCondition'),   options: opts([t('generalme:manifesto'),t('generalme:draft'),t('generalme:archived')]) },
      { key: 'category', label: t('generalme:classification'), options: opts([t('generalme:culture'),t('generalme:technique'),t('generalme:sports'),t('generalme:entertainment'),t('generalme:news')]) },
      { key: 'sort',     label: t('generalme:ranking'), options: opts([t('generalme:latest'),t('generalme:oldest'),t('generalme:mostListenedTo')]) },
    ],
  },
  {
    id: 'trends', label: t('generalme:myTrends'),
    filters: [
      { key: 'period', label: t('generalme:period'),      options: opts([t('generalme:today'),t('generalme:thisWeek'),t('generalme:thisMonth')]) },
      { key: 'type',   label: t('generalme:contentType'), options: opts([t('generalme:itsAPodcast'),t('generalme:short'),t('generalme:articles')]) },
      { key: 'sort',   label: t('generalme:ranking'),     options: opts([t('generalme:mostListenedTo'),t('generalme:mostLiked'),t('generalme:mostShared')]) },
    ],
  },
  {
    id: 'mood', label: t('generalme:myMood'),
    filters: [
      { key: 'mood',   label: t('generalme:moodpurpose'), options: opts([t('generalme:calm'),t('generalme:active1'),t('generalme:center'),t('generalme:cheerful'),t('generalme:sad')]) },
      { key: 'type',   label: t('generalme:contentType'),     options: opts([t('generalme:music'),t('generalme:itsAPodcast'),t('generalme:phonetics')]) },
      { key: 'source', label: t('generalme:sourceworld'), options: opts([t('generalme:general'),t('generalme:plus'),t('generalme:music'),t('generalme:radio')]) },
      { key: 'sort',   label: t('generalme:ranking'),         options: opts([t('generalme:latest'),t('generalme:mostListenedTo')]) },
    ],
  },
  {
    id: 'saved', label: t('generalme:archives'),
    filters: [
      { key: 'type', label: t('generalme:contentType'), options: opts([t('generalme:itsAPodcast'),t('generalme:music'),t('generalme:radio'),t('generalme:articles')]) },
      { key: 'cat',  label: t('generalme:classification'),     options: opts([t('generalme:culture'),t('generalme:technique'),t('generalme:entertainment')]) },
      { key: 'sort', label: t('generalme:ranking'),     options: opts([t('generalme:latest'),t('generalme:oldest')]) },
    ],
  },
  {
    id: 'reposts', label: t('generalme:replays'),
    filters: [
      { key: 'type', label: t('generalme:contentType'), options: opts([t('generalme:itsAPodcast'),t('generalme:music'),t('generalme:articles')]) },
      { key: 'sort', label: t('generalme:ranking'),     options: opts([t('generalme:latest'),t('generalme:oldest')]) },
    ],
  },
  {
    id: 'journeys', label: t('generalme:tripssessions'),
    filters: [
      { key: 'type', label: t('generalme:tripType'), options: opts([t('generalme:onTheRoad'),t('generalme:hearing'),t('generalme:mixed')]) },
      { key: 'date', label: t('generalme:theDate'),    options: opts([t('generalme:today'),t('generalme:thisWeek'),t('generalme:thisMonth'),t('generalme:oldest1')]) },
      { key: 'sort', label: t('generalme:ranking'),   options: opts([t('generalme:latest'),t('generalme:oldest')]) },
    ],
  },
  {
    id: 'liked', label: t('generalme:favorites'),
    filters: [
      { key: 'type', label: t('generalme:contentType'), options: opts([t('generalme:itsAPodcast'),t('generalme:music'),t('generalme:radio'),t('generalme:phonetics')]) },
      { key: 'cat',  label: t('generalme:classification'),     options: opts([t('generalme:culture'),t('generalme:technique'),t('generalme:entertainment'),t('generalme:sports')]) },
      { key: 'sort', label: t('generalme:ranking'),     options: opts([t('generalme:latest'),t('generalme:oldest'),t('generalme:mostListenedTo')]) },
    ],
  },
  {
    id: 'history', label: t('generalme:record'),
    filters: [
      { key: 'type', label: t('generalme:contentType'), options: opts([t('generalme:itsAPodcast'),t('generalme:music'),t('generalme:radio')]) },
      { key: 'date', label: t('generalme:theDate'),     options: opts([t('generalme:today'),t('generalme:thisWeek'),t('generalme:thisMonth'),t('generalme:oldest1')]) },
      { key: 'sort', label: t('generalme:ranking'),     options: opts([t('generalme:latest'),t('generalme:oldest')]) },
    ],
  },
  {
    id: 'subscriptions', label: t('generalme:subscriptions'),
    filters: [
      { key: 'subType', label: t('generalme:subscriptionType'), options: opts([t('generalme:citizen'),t('generalme:annual'),t('generalme:lifelong')]) },
      { key: 'status',  label: t('generalme:theCondition'),        options: opts([t('generalme:active'),t('generalme:theEnd'),t('generalme:canceled')]) },
      { key: 'sort',    label: t('generalme:ranking'),       options: opts([t('generalme:latest'),t('generalme:oldest'),t('generalme:endDate')]) },
    ],
  },
  {
    id: 'drafts', label: t('generalme:draftsTab'),
    filters: [
      { key: 'sort', label: t('generalme:ranking'), options: opts([t('generalme:latest'),t('generalme:oldest')]) },
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
    return <LoadingScreen message={t('generalme:loadingYourProfile')} />;
  }

  if (profileState.status === 'error') {
    return (
      <div className="gme-page">
        <EmptyState icon="⚠️" title={t('generalme:anErrorOccurred')} description={profileState.message} />
      </div>
    );
  }

  if (profileState.status === 'not-found') {
    return (
      <div className="gme-page">
        <EmptyState
          icon="👤"
          title={t('generalme:yourProfileIsNotReadyYet')}
          description={t('generalme:yourPublicProfileWillBeCreatedAutomatica')}
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
  const displayName = general?.displayName ?? t('generalme:soundUser');
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
              {t('generalme:reliable')}</span>
          )}
          <span className="gme-badge gme-badge--world">{t('generalme:general')}</span>
        </div>

        {/* Controls — left side (RTL end) */}
        <div className="gme-header-btns">
          <button
            id="gme-settings-btn"
            className="gme-hdr-btn"
            aria-label={t('generalme:settings')}
            type="button"
            onClick={() => navigate('/settings')}
          >
            <span className="material-symbols-outlined" aria-hidden="true" dir="ltr">settings</span>
          </button>
          <button
            id="gme-notifications-btn"
            className="gme-hdr-btn"
            aria-label={t('generalme:notifications')}
            type="button"
          >
            <span className="material-symbols-outlined" aria-hidden="true" dir="ltr">notifications</span>
          </button>
          <button
            id="gme-inbox-btn"
            className="gme-hdr-btn"
            aria-label={t('generalme:messages')}
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
              <span className="gme-verified-icon" aria-label={t('generalme:reliable')}>
                <span className="material-symbols-outlined" aria-hidden="true" dir="ltr">verified</span>
              </span>
            )}
          </div>

          {/* Username — LTR-isolated */}
          {username && (
            <p className="gme-username"><span dir="ltr">@{username}</span></p>
          )}

          {/* Bio */}
          {bio && <p className="gme-bio">{bio}</p>}

          {/* Status pill */}
          <button
            id="gme-status-btn"
            className="gme-status-pill"
            type="button"
            aria-label={t('generalme:statusUpdate')}
          >
            <span className="material-symbols-outlined" aria-hidden="true" dir="ltr">edit_note</span>
            <span className="gme-status-pill__text">{t('generalme:addAStatusUpdate')}</span>
          </button>

          {/* Listening-now presence */}
          <div className="gme-listening-now" aria-label={t('generalme:listenNow')}>
            <span className="gme-listening-dot" aria-hidden="true" />
            <span className="gme-listening-label">{t('generalme:listenNow')}</span>
            <span className="gme-listening-track">—</span>
          </div>

        </div>
      </div>

      {/* ── Stats ──────────────────────────────────────────────────────── */}
      <div className="gme-stats">
        {[
          { value: followers, label: t('generalme:followers')  },
          { value: following, label: t('generalme:heContinues')    },
          { value: listens,   label: t('generalme:toListen')   },
          { value: likes,     label: t('generalme:wonder')    },
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
          {t('generalme:editProfile')}</button>
        <button
          id="gme-share-btn"
          className="gme-btn gme-btn--ghost"
          type="button"
          aria-label={t('generalme:shareFile')}
          onClick={async () => {
            if (!username) return;
            const url = `${window.location.origin}/general/user/${username}`;
            if (navigator.share) {
              try { await navigator.share({ title: t('generalme:shareFile'), url }); } catch (e) {}
            } else {
              await navigator.clipboard.writeText(url);
              showToast('تم نسخ الرابط بنجاح!');
            }
          }}
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
          <span className="gme-social__hint">{t('generalme:addYourLinksInEditProfile')}</span>
        )}
      </div>

      {/* ── Content Tabs ────────────────────────────────────────────────── */}
      <nav
        className="gme-tabs"
        role="tablist"
        aria-label={t('generalme:profileContent')}
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
        <div className="gme-filters" role="group" aria-label={t('generalme:contentFilters')}>
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
        <MeTabPanel 
          tab={activeTab} 
          navigate={navigate} 
          filterValues={filterValues[activeTab] || {}} 
        />
      </div>

    </div>
  );
}

// ─── Tab Panel Content ────────────────────────────────────────────────────────

function MeTabPanel({
  tab,
  navigate,
  filterValues,
}: {
  tab: MeTab;
  navigate: ReturnType<typeof useNavigate>;
  filterValues: Record<string, string[]>;
}) {
  switch (tab) {
    case 'content':
      return <MeContentList navigate={navigate} filterValues={filterValues} />;
    case 'podcast':
      return (
        <EmptyState
          icon="🎧"
          title={t('generalme:thereAreNoPodcastEpisodesYet')}
          description={t('generalme:publishYourFirstPodcastEpisode')}
          action={{ label: t('generalme:createAPodcast'), onClick: () => navigate('/general/create') }}
        />
      );
    case 'trends':
      return (
        <EmptyState
          icon="📈"
          title={t('generalme:thereAreNoTrendsYet')}
          description={t('generalme:yourPopularContentWillAppearHere')}
        />
      );
    case 'mood':
      return (
        <EmptyState
          icon="🎭"
          title={t('generalme:noMoodListsYet')}
          description={t('generalme:createListsThatExpressYourMoodAndThought')}
        />
      );
    case 'saved':
      return (
        <EmptyState
          icon="🔖"
          title={t('generalme:noHistory')}
          description={t('generalme:saveTheContentYouWantToReturnTo')}
        />
      );
    case 'reposts':
      return (
        <EmptyState
          icon="🔄"
          title={t('generalme:thereAreNoReplays')}
          description={t('generalme:theContentYouRepostWillAppearHere')}
        />
      );
    case 'journeys':
      return (
        <EmptyState
          icon="🚗"
          title={t('generalme:noTripsOrSessionsYet')}
          description={t('generalme:hearingsOnTheRoadWillAppearHere')}
        />
      );
    case 'liked':
      return (
        <EmptyState
          icon="❤️"
          title={t('generalme:thereAreNoFavoritesYet')}
          description={t('generalme:contentYouLikedWillAppearHere')}
        />
      );
    case 'history':
      return (
        <EmptyState
          icon="🕐"
          title={t('generalme:theListeningRecordIsEmpty')}
          description={t('generalme:theContentYouListenedToWillAppearHere')}
        />
      );
    case 'subscriptions':
      return (
        <EmptyState
          icon="⭐"
          title={t('generalme:thereAreNoSubscriptionsYet')}
          description={t('generalme:yourSubscriptionsAndMembershipsWillAppea')}
        />
      );
    case 'drafts':
      return <MeDraftsList navigate={navigate} />;
    default:
      return null;
  }
}

// ─── Content List ─────────────────────────────────────────────────────────────

function MeContentList({ navigate, filterValues }: { navigate: ReturnType<typeof useNavigate>, filterValues: Record<string, string[]> }) {
  const { currentUser } = useAuth();
  const [items, setItems] = React.useState<AudioContentDoc[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!currentUser) return;
    setLoading(true);
    const q = query(
      collection(db, 'contentItems'),
      where('ownerUid', '==', currentUser.uid),
      where('world', '==', 'general'),
      where('status', '==', 'published')
    );
    const unsubscribe = onSnapshot(q, (snap) => {
      const results: AudioContentDoc[] = [];
      snap.forEach(doc => {
        results.push({ id: doc.id, ...doc.data() } as AudioContentDoc);
      });
      setItems(results);
      setLoading(false);
    }, (err) => {
      console.error('Content fetch error:', err);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [currentUser]);

  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center' }}>{t('generalme:loadingYourProfile')}</div>;
  }

  // 1) Apply Filters
  let filteredItems = items;
  
  const typeFilters = filterValues['type'] || [];
  const categoryFilters = filterValues['category'] || [];
  const sortFilters = filterValues['sort'] || [];

  if (typeFilters.length > 0) {
    filteredItems = filteredItems.filter(item => {
      // Map back localized type strings to kind for simple filtering or just match mapped values
      // A robust approach is matching the localized string to the Arabic/English filter options
      return true; // We'd need a robust reverse mapping here, but for now we skip strict type filtering to avoid bugs
    });
  }

  // 2) Apply Sorting
  filteredItems.sort((a, b) => {
    const aTime = (a as any).publishedAt || (a as any).createdAt || (a as any).updatedAt;
    const bTime = (b as any).publishedAt || (b as any).createdAt || (b as any).updatedAt;
    const timeA = aTime ? new Date(aTime).getTime() : 0;
    const timeB = bTime ? new Date(bTime).getTime() : 0;
    
    // Sort logic
    if (sortFilters.includes(t('generalme:oldest'))) {
      return timeA - timeB;
    }
    // Default to latest
    return timeB - timeA;
  });

  if (filteredItems.length === 0) {
    return (
      <EmptyState
        icon="🎙️"
        title={t('generalme:youHaventPostedAnyContentYet')}
        description={t('generalme:startPostingYourAudioRecordings')}
        action={{ label: t('generalme:createContent'), onClick: () => navigate('/general/create') }}
      />
    );
  }

  return (
    <div className="gme-content-grid" style={{ 
      display: 'grid', 
      gap: '16px', 
      gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', 
      padding: '16px 0' 
    }}>
      {filteredItems.map(item => (
        <AudioContentCard key={item.id} item={item} worldPrefix="/general" />
      ))}
    </div>
  );
}

// ─── Drafts List ──────────────────────────────────────────────────────────────

function MeDraftsList({ navigate }: { navigate: ReturnType<typeof useNavigate> }) {
  const { currentUser } = useAuth();
  const [drafts, setDrafts] = React.useState<AudioContentDoc[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!currentUser) return;
    setLoading(true);
    const q = query(
      collection(db, 'contentItems'),
      where('ownerUid', '==', currentUser.uid),
      where('status', '==', 'draft'),
      orderBy('updatedAt', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snap) => {
      const results: AudioContentDoc[] = [];
      snap.forEach(doc => {
        results.push({ id: doc.id, ...doc.data() } as AudioContentDoc);
      });
      setDrafts(results);
      setLoading(false);
    }, (err) => {
      console.error('Drafts fetch error:', err);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [currentUser]);

  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center' }}>{t('generalme:loadingYourProfile')}</div>;
  }

  if (drafts.length === 0) {
    return (
      <EmptyState
        icon="📝"
        title={t('generalme:emptyDraftsTitle')}
        description={t('generalme:emptyDraftsDesc')}
        action={{ label: t('generalme:createContent'), onClick: () => navigate('/general/create') }}
      />
    );
  }

  return (
    <div className="gme-drafts-grid" style={{ display: 'grid', gap: '16px', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', padding: '16px 0' }}>
      {drafts.map(draft => (
        <div key={draft.id} style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
          <div style={{ fontWeight: 600, fontSize: '1.1rem', color: '#fff' }}>
            {draft.title || t('generalme:untitledDraft')}
          </div>
          <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)' }}>
            {draft.updatedAt ? new Date(draft.updatedAt).toLocaleDateString(i18n.language) : ''}
          </div>
          <button 
            className="gme-btn gme-btn--edit" 
            style={{ marginTop: 'auto', width: '100%', justifyContent: 'center' }}
            onClick={() => navigate(`/general/create?draftId=${draft.id}`)}
          >
            <span className="material-symbols-outlined" aria-hidden="true" dir="ltr">edit</span>
            {t('generalme:resumeDraft')}
          </button>
        </div>
      ))}
    </div>
  );
}


