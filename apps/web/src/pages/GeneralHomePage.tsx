/**
 * Sound Platform — General Home Page  (عام + الرئيسية)
 * =====================================================
 * Phase: 5-E (World-Scoped Feeds)
 *
 * Dedicated screen for the /general/home route.
 * Worlds عام، بلس، موسيقى، راديو، مسابقات each get their own screen file.
 * This file must NOT be merged with other world home pages.
 *
 * Design constraints (LOCKED):
 *   - border-radius: 3px on all cards and controls
 *   - Fonts: Alexandria → Cairo fallback  (--font-sans)
 *   - Direction: RTL throughout; handles/usernames wrapped in dir="ltr"
 *   - No مباشر / بطولات labels anywhere in this file
 *   - No chip filter strips; use FilterDropdown + SelectedChips only
 *   - No horizontal chip scroll for worlds — that is AppHeader's domain
 *
 * Filter structure (الحالة | التصنيف | البلد | الترتيب):
 *   These four axis labels are locked by UX spec. Do not reorder or rename.
 *
 * Static data: all constants are typed so future backend injection
 * can replace the array without touching component structure.
 */

import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { TFunction } from 'i18next';
import './GeneralHomePage.css';
import { FilterDropdown, SelectedChips, type FilterOption } from '../components/FilterDropdown';

import i18n from '../i18n';
const t = (key: any, options?: any) => i18n.t(key, options) as any as string;

// ─── Types ────────────────────────────────────────────────────────────────────
// Shapes mirror intended Firestore document projections.

interface StoryItem {
  uid: string;
  displayName: string;
  avatarUrl?: string;
  isSelf?: boolean;
}

interface ContentItem {
  id: string;
  title: string;
  meta: string;            // e.g. "بودكاست" / "قصة قصيرة"
  countryFlag?: string;    // ISO emoji flag e.g. "🇸🇦"
  playCount?: string;      // e.g. "2.4M استماع"
  durationLabel?: string;  // e.g. "18 دقيقة"
  tag?: string;            // e.g. "جديد" / "رائج"
}

interface CreatorItem {
  uid: string;
  displayName: string;
  handle?: string;         // LTR — rendered inside dir="ltr"
  followerLabel?: string;  // e.g. "980K متابع"
  specialty?: string;      // e.g. "بودكاست | قصص"
  countryFlag?: string;
}

interface PlaylistItem {
  id: string;
  title: string;
  tag: string;
  trackCount?: string;     // e.g. "12 قطعة"
}

// ─── Static Representative Data ───────────────────────────────────────────────
// Will be moved inside the component to use the reactive t() function

// ─── Filter Options — الحالة | التصنيف | البلد | الترتيب ─────────────────────
// Axis order is locked by UX spec: do not reorder.

const getStatusOptions = (t: TFunction): FilterOption[] => [
  { value: 'new',        label: t('statusOptions.new') },
  { value: 'trending',   label: t('statusOptions.trending') },
  { value: 'featured',   label: t('statusOptions.featured') },
  { value: 'saved',      label: t('statusOptions.saved') },
  { value: 'unplayed',   label: t('statusOptions.unplayed') },
];

const getCategoryOptions = (t: TFunction): FilterOption[] => [
  { value: 'story',      label: t('categoryOptions.story') },
  { value: 'podcast',    label: t('categoryOptions.podcast') },
  { value: 'poetry',     label: t('categoryOptions.poetry') },
  { value: 'meditation', label: t('categoryOptions.meditation') },
  { value: 'quran',      label: t('categoryOptions.quran') },
  { value: 'comedy',     label: t('categoryOptions.comedy') },
  { value: 'kids',       label: t('categoryOptions.kids') },
];

const getCountryOptions = (t: TFunction): FilterOption[] => [
  { value: 'sa',   label: t('saudiArabia')     }, // Keep as is or translate if needed. Assuming emojis and Arabic names.
  { value: 'ae',   label: t('emirates')     },
  { value: 'eg',   label: t('egypt')          },
  { value: 'kw',   label: t('kuwait')       },
  { value: 'jo',   label: t('jordan')        },
  { value: 'ma',   label: t('morocco')        },
  { value: 'dz',   label: t('algeria')      },
];

const getSortOptions = (t: TFunction): FilterOption[] => [
  { value: 'latest',    label: t('sortOptions.latest') },
  { value: 'popular',   label: t('sortOptions.popular') },
  { value: 'shared',    label: t('sortOptions.shared') },
  { value: 'saved',     label: t('sortOptions.saved') },
  { value: 'rising',    label: t('sortOptions.rising') },
  { value: 'following', label: t('sortOptions.following') },
  { value: 'suggested', label: t('sortOptions.suggested') },
];

// ─── Micro Icons ───────────────────────────────────────────────────────────────
const IconSearch = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
       strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
       width="16" height="16" aria-hidden="true">
    <circle cx="11" cy="11" r="7" />
    <line x1="16.5" y1="16.5" x2="22" y2="22" />
  </svg>
);

const IconPlay = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" width="13" height="13" aria-hidden="true">
    <path d="M8 5v14l11-7z" />
  </svg>
);

const IconChevronLeft = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
       strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
       width="13" height="13" aria-hidden="true">
    <polyline points="15 18 9 12 15 6" />
  </svg>
);

// ─── Sub-components ────────────────────────────────────────────────────────────

function AvatarFallback({ name, size = 56 }: { name: string; size?: number }) {
  const initial = name.trim().charAt(0);
  return (
    <div
      aria-hidden="true"
      className="ghp-avatar-fallback"
      style={{ width: size, height: size, fontSize: size * 0.38 }}
    >
      {initial}
    </div>
  );
}

function CoverFallback({ height = 120 }: { height?: number }) {
  return (
    <div
      aria-hidden="true"
      className="ghp-cover-fallback"
      style={{ height }}
    />
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function GeneralHomePage() {
  const { t } = useTranslation('generalhome');
  
  const STORY_ITEMS: StoryItem[] = useMemo(() => [
    { uid: 'self',  displayName: t('yourStory'),   isSelf: true },
    { uid: 'su1',   displayName: t('lena')   },
    { uid: 'su2',   displayName: t('samer')   },
    { uid: 'su3',   displayName: t('others')    },
    { uid: 'su4',   displayName: t('reem')    },
    { uid: 'su5',   displayName: t('age')    },
    { uid: 'su6',   displayName: t('here')    },
  ], [t]);

  const TRENDING_ITEMS: ContentItem[] = useMemo(() => [
    { id: 'gt1', title: t('inspiringStories'),       meta: t('weeklyPodcast'),   playCount: '2.4M',  countryFlag: '🇸🇦', tag: t('common') },
    { id: 'gt2', title: t('theWorldOfKnowledge'),     meta: t('audioArticles'),     playCount: '1.8M',  countryFlag: '🇦🇪', tag: t('common') },
    { id: 'gt3', title: t('momentsOfSilence'),     meta: t('meditationPodcast'),     playCount: '940K',  countryFlag: '🇪🇬' },
    { id: 'gt4', title: t('nightPoetry'),        meta: t('poetryReading'),      playCount: '730K',  countryFlag: '🇸🇦', tag: t('new') },
  ], [t]);

  const RECOMMENDED_ITEMS: ContentItem[] = useMemo(() => [
    { id: 'gr1', title: t('momentsOfSilence'),     meta: t('meditationPodcast'),     durationLabel: t('18Minutes') },
    { id: 'gr2', title: t('storiesFromHistory'),  meta: t('audioDocumentary'),      durationLabel: t('31Minutes') },
    { id: 'gr3', title: t('theWorldOfTechnology'),    meta: t('technicalReviews'),    durationLabel: t('22Minutes') },
    { id: 'gr4', title: t('dailyCreativity'), meta: t('shortStories'),         durationLabel: t('9Minutes')  },
  ], [t]);

  const TOP_CREATORS: CreatorItem[] = useMemo(() => [
    { uid: 'gc1', displayName: t('ahmedAdel'),   handle: '@aadel',   followerLabel: t('980kFollowers'),  specialty: t('itsAPodcast'), countryFlag: '🇸🇦' },
    { uid: 'gc2', displayName: t('sarahMalak'),    handle: '@smalek',  followerLabel: t('12mFollowers'),  specialty: t('stories'),     countryFlag: '🇦🇪' },
    { uid: 'gc3', displayName: t('khaledNour'),    handle: '@knour',   followerLabel: t('650kFollowers'),  specialty: t('contemplation'),    countryFlag: '🇸🇦' },
    { uid: 'gc4', displayName: t('dinaAli'),    handle: '@dali',    followerLabel: t('420kFollowers'),  specialty: t('poetry'),     countryFlag: '🇪🇬' },
  ], [t]);

  const RISING_CREATORS: CreatorItem[] = useMemo(() => [
    { uid: 'grc1', displayName: t('layla')   },
    { uid: 'grc2', displayName: t('imran')  },
    { uid: 'grc3', displayName: t('maya')   },
    { uid: 'grc4', displayName: t('yasin')  },
    { uid: 'grc5', displayName: t('dina')   },
  ], [t]);

  const FOLLOWING_CREATORS: CreatorItem[] = useMemo(() => [
    { uid: 'gf1', displayName: t('hereIsIbrahim'), handle: '@hana',  followerLabel: t('newExclusiveContentAvailableNow') },
    { uid: 'gf2', displayName: t('faresKhalil'),   handle: '@fares', followerLabel: t('lastActivityAnHourAgo')         },
  ], [t]);

  const PLAYLISTS: PlaylistItem[] = useMemo(() => [
    { id: 'gp1', title: t('bestOfTheWeek'),   tag: t('selectedForYou'),   trackCount: t('12Pieces')  },
    { id: 'gp2', title: t('atmosphereOfFocus'),          tag: t('relaxation'),     trackCount: t('8Pieces')   },
  ], [t]);

  // Filter state — each axis is independent multi-select
  const [statuses,    setStatuses]    = useState<string[]>([]);
  const [categories,  setCategories]  = useState<string[]>([]);
  const [countries,   setCountries]   = useState<string[]>([]);
  const [sortOrders,  setSortOrders]  = useState<string[]>([]);

  function toggle(setter: React.Dispatch<React.SetStateAction<string[]>>) {
    return (v: string) =>
      setter((prev) => (prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]));
  }

  // Section visibility — driven by data presence
  const hasStories    = STORY_ITEMS.length > 0;
  const hasTrending   = TRENDING_ITEMS.length > 0;
  const hasRecommend  = RECOMMENDED_ITEMS.length > 0;
  const hasTopCreators = TOP_CREATORS.length > 0;
  const hasRising     = RISING_CREATORS.length > 0;
  const hasFollowing  = FOLLOWING_CREATORS.length > 0;
  const hasPlaylists  = PLAYLISTS.length > 0;

  const statusOptions = useMemo(() => getStatusOptions(t), [t]);
  const categoryOptions = useMemo(() => getCategoryOptions(t), [t]);
  const countryOptions = useMemo(() => getCountryOptions(t), [t]);
  const sortOptions = useMemo(() => getSortOptions(t), [t]);

  return (
    <main className="ghp" aria-label={t('homeGeneral')}>

      {/* ── Stories / Quick Circles ──────────────────────────────────────────── */}
      {hasStories && (
        <section aria-label={t('sections.quickStories')}>
          <div className="ghp-story-row">
            {STORY_ITEMS.map((item) => (
              <button
                key={item.uid}
                className="ghp-story-item"
                aria-label={item.isSelf ? t('actions.addStory') : t('actions.storyOf', { name: item.displayName })}
              >
                {item.isSelf ? (
                  <div className="ghp-story-ring ghp-story-ring--self">
                    <AvatarFallback name={item.displayName} size={52} />
                    <span className="ghp-story-ring__add" aria-hidden="true">+</span>
                  </div>
                ) : (
                  <div className="ghp-story-ring">
                    <div className="ghp-story-ring__inner">
                      {item.avatarUrl
                        ? <img className="ghp-story-ring__avatar" src={item.avatarUrl} alt={item.displayName} />
                        : <AvatarFallback name={item.displayName} size={52} />
                      }
                    </div>
                  </div>
                )}
                <span className="ghp-story-item__name">{item.displayName}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* ── Search + Smart Filters (الحالة | التصنيف | البلد | الترتيب) ────── */}
      <section aria-label={t('sections.searchAndFilter')}>

        {/* Search bar */}
        <div className="ghp-search">
          <input
            id="ghp-search-input"
            className="ghp-search__input"
            type="search"
            placeholder={t('actions.searchPlaceholder')}
            autoComplete="off"
          />
          <span className="ghp-search__icon">
            <IconSearch />
          </span>
        </div>

        {/* Four-axis filter dropdowns */}
        <div className="ghp-filters" style={{ marginTop: 'var(--space-3)' }}>
          <FilterDropdown
            label={t('filters.status')}
            options={statusOptions}
            values={statuses}
            onToggle={toggle(setStatuses)}
            onClear={() => setStatuses([])}
            defaultLabel={t('filters.all')}
            ariaLabel={`تصفية حسب ${t('filters.status')}`}
          />
          <FilterDropdown
            label={t('filters.category')}
            options={categoryOptions}
            values={categories}
            onToggle={toggle(setCategories)}
            onClear={() => setCategories([])}
            defaultLabel={t('filters.all')}
            ariaLabel={`تصفية حسب ${t('filters.category')}`}
          />
          <FilterDropdown
            label={t('filters.country')}
            options={countryOptions}
            values={countries}
            onToggle={toggle(setCountries)}
            onClear={() => setCountries([])}
            defaultLabel={t('filters.all')}
            ariaLabel={`تصفية حسب ${t('filters.country')}`}
          />
          <FilterDropdown
            label={t('filters.sort')}
            options={sortOptions}
            values={sortOrders}
            onToggle={toggle(setSortOrders)}
            onClear={() => setSortOrders([])}
            defaultLabel={t('sortOptions.latest')}
            ariaLabel={`تصفية حسب ${t('filters.sort')}`}
          />
        </div>

        {/* Selected filter chips — each has X remove button */}
        <SelectedChips
          groups={[
            { filterId: 'status',    options: statusOptions,   values: statuses,   onRemove: toggle(setStatuses)   },
            { filterId: 'category',  options: categoryOptions, values: categories, onRemove: toggle(setCategories) },
            { filterId: 'country',   options: countryOptions,  values: countries,  onRemove: toggle(setCountries)  },
            { filterId: 'sortOrder', options: sortOptions,     values: sortOrders, onRemove: toggle(setSortOrders) },
          ]}
        />

        {/* CTA — browse categories subpage */}
        <button
          className="ghp-subpage-btn"
          type="button"
          onClick={() => { /* navigate to /general/discover */ }}
          aria-label={t('actions.browseCategories')}
        >
          <span>{t('actions.browseCategories')}</span>
          <svg viewBox="0 0 16 16" fill="none" width="11" height="11" aria-hidden="true">
            <path
              d="M6 3H3a1 1 0 00-1 1v9a1 1 0 001 1h9a1 1 0 001-1V10M10 2h4m0 0v4m0-4L7 9"
              stroke="currentColor" strokeWidth="1.5"
              strokeLinecap="round" strokeLinejoin="round"
            />
          </svg>
        </button>
      </section>

      {/* ── Trending Now ─────────────────────────────────────────────────────── */}
      {hasTrending && (
        <section aria-labelledby="ghp-trending-heading">
          <div className="ghp-section__header">
            <h2 id="ghp-trending-heading" className="ghp-section__title">{t('sections.trendingNow')}</h2>
            <button className="ghp-section__see-all" aria-label={t('actions.seeAll')}>{t('actions.seeAll')}</button>
          </div>
          <div className="ghp-h-scroll">
            {TRENDING_ITEMS.map((item) => (
              <article key={item.id} className="ghp-content-card" aria-label={item.title}>
                <div className="ghp-content-card__cover">
                  <CoverFallback height={118} />
                  <div className="ghp-content-card__cover-overlay" />
                  {item.tag && (
                    <span className="ghp-content-card__tag">{item.tag}</span>
                  )}
                  {item.playCount && (
                    <div className="ghp-content-card__play-stat">
                      <IconPlay />
                      <span>{item.playCount}</span>
                    </div>
                  )}
                </div>
                <div className="ghp-content-card__body">
                  <p className="ghp-content-card__title">{item.title}</p>
                  <p className="ghp-content-card__meta">
                    {item.countryFlag && (
                      <span className="ghp-content-card__flag" aria-hidden="true">{item.countryFlag}</span>
                    )}
                    {item.meta}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* ── Top Creators ─────────────────────────────────────────────────────── */}
      {hasTopCreators && (
        <section aria-labelledby="ghp-top-creators-heading">
          <div className="ghp-section__header">
            <h2 id="ghp-top-creators-heading" className="ghp-section__title">{t('sections.topCreators')}</h2>
            <button className="ghp-section__see-all" aria-label={t('actions.seeAll')}>{t('actions.seeAll')}</button>
          </div>
          <div className="ghp-creator-grid">
            {TOP_CREATORS.map((creator) => (
              <article key={creator.uid} className="ghp-creator-card" aria-label={`ملف ${creator.displayName}`}>
                <div className="ghp-creator-card__left">
                  <AvatarFallback name={creator.displayName} size={52} />
                  <div>
                    <p className="ghp-creator-card__name">
                      {creator.countryFlag && (
                        <span className="ghp-creator-card__flag" aria-hidden="true">{creator.countryFlag}</span>
                      )}
                      {creator.displayName}
                    </p>
                    {creator.followerLabel && (
                      <p className="ghp-creator-card__followers">{creator.followerLabel}</p>
                    )}
                    {creator.specialty && (
                      <p className="ghp-creator-card__specialty">{creator.specialty}</p>
                    )}
                  </div>
                </div>
                <button
                  className="ghp-creator-card__follow-btn"
                  aria-label={t('actions.follow')}
                >
                  {t('actions.follow')}
                </button>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* ── Plus Banner — editorial, not capability-gated ────────────────────── */}
      <section aria-label={t('sections.plusSubscription')}>
        <div className="ghp-plus-banner" role="complementary">
          <div className="ghp-plus-banner__text">
            <p className="ghp-plus-banner__eyebrow">{t('plusBanner.eyebrow')}</p>
            <p className="ghp-plus-banner__headline">{t('plusBanner.headline')}</p>
          </div>
          <button className="ghp-plus-banner__cta" aria-label={t('actions.subscribeNow')}>
            {t('actions.subscribeNow')}
          </button>
        </div>
      </section>

      {/* ── Recommended for You ──────────────────────────────────────────────── */}
      {hasRecommend && (
        <section aria-labelledby="ghp-recommended-heading">
          <div className="ghp-section__header">
            <h2 id="ghp-recommended-heading" className="ghp-section__title">{t('sections.recommended')}</h2>
            <button className="ghp-section__see-all" aria-label={t('actions.seeAll')}>{t('actions.seeAll')}</button>
          </div>
          <div className="ghp-h-scroll">
            {RECOMMENDED_ITEMS.map((item) => (
              <article key={item.id} className="ghp-content-card" aria-label={item.title}>
                <div className="ghp-content-card__cover">
                  <CoverFallback height={118} />
                  <div className="ghp-content-card__cover-overlay" />
                  {item.durationLabel && (
                    <div className="ghp-content-card__duration">{item.durationLabel}</div>
                  )}
                </div>
                <div className="ghp-content-card__body">
                  <p className="ghp-content-card__title">{item.title}</p>
                  <p className="ghp-content-card__meta">{item.meta}</p>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* ── Playlists ────────────────────────────────────────────────────────── */}
      {hasPlaylists && (
        <section aria-labelledby="ghp-playlists-heading">
          <div className="ghp-section__header">
            <h2 id="ghp-playlists-heading" className="ghp-section__title">{t('sections.playlists')}</h2>
            <button className="ghp-section__see-all" aria-label={t('actions.seeAll')}>{t('actions.seeAll')}</button>
          </div>
          <div className="ghp-playlist-grid">
            {PLAYLISTS.map((pl) => (
              <article key={pl.id} className="ghp-playlist-card" aria-label={pl.title}>
                <CoverFallback height={136} />
                <div className="ghp-playlist-card__overlay">
                  <span className="ghp-playlist-card__tag">{pl.tag}</span>
                  <p className="ghp-playlist-card__title">{pl.title}</p>
                  {pl.trackCount && (
                    <p className="ghp-playlist-card__count">{pl.trackCount}</p>
                  )}
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* ── Rising Creators ──────────────────────────────────────────────────── */}
      {hasRising && (
        <section aria-labelledby="ghp-rising-heading">
          <div className="ghp-section__header">
            <h2 id="ghp-rising-heading" className="ghp-section__title">{t('sections.risingCreators')}</h2>
            <button className="ghp-section__see-all" aria-label={t('actions.seeAll')}>{t('actions.seeAll')}</button>
          </div>
          <div className="ghp-rising-row">
            {RISING_CREATORS.map((creator) => (
              <button key={creator.uid} className="ghp-rising-item" aria-label={creator.displayName}>
                <AvatarFallback name={creator.displayName} size={52} />
                <span className="ghp-rising-item__name">{creator.displayName}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* ── Creators You Follow ──────────────────────────────────────────────── */}
      {hasFollowing && (
        <section aria-labelledby="ghp-following-heading">
          <div className="ghp-section__header">
            <h2 id="ghp-following-heading" className="ghp-section__title">{t('sections.followingCreators')}</h2>
            <button className="ghp-section__see-all" aria-label={t('actions.seeAll')}>{t('actions.seeAll')}</button>
          </div>
          <div className="ghp-follow-list">
            {FOLLOWING_CREATORS.map((creator) => (
              <article key={creator.uid} className="ghp-follow-item" aria-label={`ملف ${creator.displayName}`}>
                <AvatarFallback name={creator.displayName} size={42} />
                <div className="ghp-follow-item__info">
                  <p className="ghp-follow-item__name">{creator.displayName}</p>
                  {creator.handle && (
                    <p className="ghp-follow-item__status">
                      <span dir="ltr" style={{ fontFamily: 'monospace', fontSize: 11 }}>
                        {creator.handle}
                      </span>
                      {creator.followerLabel && (
                        <span> · {creator.followerLabel}</span>
                      )}
                    </p>
                  )}
                  {!creator.handle && creator.followerLabel && (
                    <p className="ghp-follow-item__status">{creator.followerLabel}</p>
                  )}
                </div>
                <span className="ghp-follow-item__indicator" aria-hidden="true" />
                <span className="ghp-follow-item__chevron" aria-hidden="true">
                  <IconChevronLeft />
                </span>
              </article>
            ))}
          </div>
        </section>
      )}

    </main>
  );
}
