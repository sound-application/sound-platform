/**
 * Sound Platform — General Discover Page  (عام + اكتشف)
 * ======================================================
 * Phase: 5-F (General Discover)
 *
 * Route: /general/discover
 *
 * Design authority: category_discovery_sound_authority/screen.png
 * Design judge:     DESIGN.md
 *
 * Locked sub-nav (IMMUTABLE):
 *   اكتشف | لك | المتابعة | الرائج
 *
 * Locked design rules:
 *   - border-radius: 3px on ALL cards and controls
 *   - Fonts: Alexandria → Cairo fallback  (--font-sans)
 *   - Direction: RTL throughout; handles/usernames wrapped in dir="ltr"
 *   - Forbidden: مباشر / بطولات / استكشاف / لقطات / البث / جلسة
 *   - Filter strips are NOT used; dropdowns only
 *   - Static data typed for future backend injection
 */

import React, { useState } from 'react';
import './CategoryDiscoveryPage.css';
import { FilterDropdown, type FilterOption } from '../../components/FilterDropdown';
import i18n from "i18next";

const t = (key: any, options?: any) => i18n.t(key, options) as any as string;


// ─── Types ────────────────────────────────────────────────────────────────────

interface DiscoverTab {
  id: string;
  label: string;
}

interface CategoryChip {
  id: string;
  label: string;
}

interface FeaturedItem {
  id: string;
  title: string;
  creatorName: string;
  creatorHandle: string;   // LTR
  categoryLabel: string;
  playCount: string;
  durationLabel: string;
}

interface ContentCard {
  id: string;
  title: string;
  meta: string;
  playCount?: string;
  durationLabel?: string;
  tag?: string;
  countryFlag?: string;
}

interface ListItem {
  id: string;
  title: string;
  meta: string;
  durationLabel?: string;
}

interface CreatorItem {
  uid: string;
  displayName: string;
  handle?: string;         // LTR
  followerLabel?: string;
  specialty?: string;
  countryFlag?: string;
}

interface PlaylistCard {
  id: string;
  title: string;
  tag: string;
  trackCount?: string;
}

interface RandomCard {
  id: string;
  title: string;
  meta: string;
  accentColor?: string;
}

// ─── Locked Sub-Navigation ────────────────────────────────────────────────────

const DISCOVER_TABS: DiscoverTab[] = [
  { id: 'explore',   label: t('categorydiscovery:findOut')    },
  { id: 'foryou',    label: t('categorydiscovery:forYou')       },
  { id: 'following', label: t('categorydiscovery:followUp') },
  { id: 'trending',  label: t('categorydiscovery:trending')   },
];

// ─── Category Chips ───────────────────────────────────────────────────────────

const CATEGORY_CHIPS: CategoryChip[] = [
  { id: 'all',       label: t('categorydiscovery:everyone')     },
  { id: 'poetry',    label: t('categorydiscovery:poetry')      },
  { id: 'story',     label: t('categorydiscovery:stories')      },
  { id: 'podcast',   label: t('categorydiscovery:itsAPodcast')  },
  { id: 'quran',     label: t('categorydiscovery:recitation')    },
  { id: 'comedy',    label: t('categorydiscovery:comedy')  },
  { id: 'kids',      label: t('categorydiscovery:children')    },
  { id: 'meditation',label: t('categorydiscovery:contemplation')     },
];

// ─── Static Representative Data ───────────────────────────────────────────────

const FEATURED: FeaturedItem = {
  id: 'feat-1',
  title: t('categorydiscovery:eveningTalk'),
  creatorName: t('categorydiscovery:nouraMansour'),
  creatorHandle: '@noura.voice',
  categoryLabel: t('categorydiscovery:culture'),
  playCount: '84K',
  durationLabel: t('categorydiscovery:38Minutes'),
};

const TRENDING_CARDS: ContentCard[] = [
  { id: 'tc1', title: t('categorydiscovery:morningCoffee'),  meta: t('categorydiscovery:weeklyPodcast'), playCount: '84K',  countryFlag: '🇸🇦', tag: t('categorydiscovery:common') },
  { id: 'tc2', title: t('categorydiscovery:citiesStories'),    meta: t('categorydiscovery:audioDocumentary'),    playCount: '19K',  countryFlag: '🇦🇪', tag: t('categorydiscovery:common') },
  { id: 'tc3', title: t('categorydiscovery:nightPoetry'),    meta: t('categorydiscovery:poetryReading'),    playCount: '55K',  countryFlag: '🇸🇦' },
  { id: 'tc4', title: t('categorydiscovery:historyWindow'),meta: t('categorydiscovery:historicalStories'),   playCount: '31K',  countryFlag: '🇪🇬' },
];

const SUGGESTED_LIST: ListItem[] = [
  { id: 'sl1', title: t('categorydiscovery:technologyDiscussion'),   meta: t('categorydiscovery:khaledAyman'),  durationLabel: t('categorydiscovery:22Minutes') },
  { id: 'sl2', title: t('categorydiscovery:roadTales'),  meta: t('categorydiscovery:fahdAlrawi'), durationLabel: t('categorydiscovery:17Minutes') },
  { id: 'sl3', title: t('categorydiscovery:quietMoments'),    meta: t('categorydiscovery:reemAlhelou'),  durationLabel: t('categorydiscovery:9Minutes')  },
];

const TOP_CREATORS: CreatorItem[] = [
  { uid: 'dc1', displayName: t('categorydiscovery:ahmedAlsalmi'),  handle: '@alsalmi.sound', followerLabel: t('categorydiscovery:12mFollowers'),  specialty: t('categorydiscovery:culture'), countryFlag: '🇸🇦' },
  { uid: 'dc2', displayName: t('categorydiscovery:abeerAlalman'),  handle: '@abeer.voice',   followerLabel: t('categorydiscovery:890kFollowers'),  specialty: t('categorydiscovery:stories'),   countryFlag: '🇰🇼' },
];

const PLAYLISTS: PlaylistCard[] = [
  { id: 'dp1', title: t('categorydiscovery:cultureSelections'), tag: t('categorydiscovery:edited'),      trackCount: t('categorydiscovery:14Pieces') },
  { id: 'dp2', title: t('categorydiscovery:eveningSounds'),    tag: t('categorydiscovery:suggestedForYou1'),  trackCount: t('categorydiscovery:9Pieces')   },
];

const RISING_CREATORS: CreatorItem[] = [
  { uid: 'drc1', displayName: t('categorydiscovery:rayanMansour'), countryFlag: '🇸🇦' },
  { uid: 'drc2', displayName: t('categorydiscovery:lubanAhmed'),  countryFlag: '🇦🇪' },
  { uid: 'drc3', displayName: t('categorydiscovery:sanadAlharithi'),countryFlag: '🇸🇦' },
  { uid: 'drc4', displayName: t('categorydiscovery:naglaaBadr'),  countryFlag: '🇪🇬' },
];

const RANDOM_CARDS: RandomCard[] = [
  { id: 'rnd1', title: t('categorydiscovery:creativityCaf'),   meta: t('categorydiscovery:shortStories'),   accentColor: '#7c3aed' },
  { id: 'rnd2', title: t('categorydiscovery:audioJourney'),     meta: t('categorydiscovery:audioDocumentary'), accentColor: '#0e7490' },
];

// ─── Filter Options ────────────────────────────────────────────────────────────

const WORLD_OPTIONS: FilterOption[] = [
  { value: 'general',     label: t('categorydiscovery:general')      },
  { value: 'plus',        label: t('categorydiscovery:plus')      },
  { value: 'music',       label: t('categorydiscovery:music')   },
  { value: 'radio',       label: t('categorydiscovery:radio')    },
];

const SORT_OPTIONS: FilterOption[] = [
  { value: 'popular',  label: t('categorydiscovery:mostListenedTo') },
  { value: 'latest',   label: t('categorydiscovery:latest')           },
  { value: 'rising',   label: t('categorydiscovery:theMostUp')    },
  { value: 'shared',   label: t('categorydiscovery:mostShared')    },
];

// ─── Micro Icons ───────────────────────────────────────────────────────────────

const IconPlay = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14" aria-hidden="true">
    <path d="M8 5v14l11-7z" />
  </svg>
);

const IconHeadphones = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
       strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
       width="13" height="13" aria-hidden="true">
    <path d="M3 18v-6a9 9 0 0118 0v6" />
    <path d="M21 19a2 2 0 01-2 2h-1a2 2 0 01-2-2v-3a2 2 0 012-2h3zM3 19a2 2 0 002 2h1a2 2 0 002-2v-3a2 2 0 00-2-2H3z" />
  </svg>
);

const IconShuffle = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
       strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
       width="14" height="14" aria-hidden="true">
    <polyline points="16 3 21 3 21 8" />
    <line x1="4" y1="20" x2="21" y2="3" />
    <polyline points="21 16 21 21 16 21" />
    <line x1="15" y1="15" x2="21" y2="21" />
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

function AvatarFallback({ name, size = 48 }: { name: string; size?: number }) {
  const initial = name.trim().charAt(0);
  return (
    <div
      aria-hidden="true"
      className="gdp-avatar-fallback"
      style={{ width: size, height: size, fontSize: size * 0.38 }}
    >
      {initial}
    </div>
  );
}

function CoverFallback({ height = 120, accent }: { height?: number; accent?: string }) {
  return (
    <div
      aria-hidden="true"
      className="gdp-cover-fallback"
      style={{
        height,
        background: accent
          ? `linear-gradient(135deg, ${accent}33 0%, rgba(14,14,16,0.95) 100%)`
          : undefined,
      }}
    />
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function CategoryDiscoveryPage() {
  const [activeTab,    setActiveTab]    = useState('explore');
  const [activeChip,   setActiveChip]   = useState('all');
  const [worlds,       setWorlds]       = useState<string[]>(['general']);
  const [sortOrders,   setSortOrders]   = useState<string[]>([]);

  function toggleWorld(v: string) {
    setWorlds(prev => prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v]);
  }
  function toggleSort(v: string) {
    setSortOrders(prev => prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v]);
  }

  return (
    <main className="gdp" aria-label={t('categorydiscovery:discoverGeneral')}>

      {/* ── Locked Sub-Navigation: اكتشف | لك | المتابعة | الرائج ─────────── */}
      <nav className="gdp-sub-nav" aria-label={t('categorydiscovery:discoveryTabs')} role="tablist">
        {DISCOVER_TABS.map(tab => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={activeTab === tab.id}
            className={`gdp-sub-nav__item${activeTab === tab.id ? ' gdp-sub-nav__item--active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
            id={`gdp-tab-${tab.id}`}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {/* ── Context Bar ─────────────────────────────────────────────────────── */}
      <section className="gdp-context-bar" aria-label={t('categorydiscovery:currentContext')}>
        <div className="gdp-context-bar__info">
          <span className="gdp-context-bar__label">{t('categorydiscovery:currentContext')}</span>
          <div className="gdp-context-bar__values">
            <span className="gdp-context-bar__chip">{t('categorydiscovery:general')}</span>
            <span className="gdp-context-bar__chip">{t('categorydiscovery:culture')}</span>
            <span className="gdp-context-bar__chip gdp-context-bar__chip--dim">{t('categorydiscovery:saudiArabia')}</span>
          </div>
        </div>
        <div className="gdp-context-bar__filters">
          <FilterDropdown
            label={t('categorydiscovery:theWorld')}
            options={WORLD_OPTIONS}
            values={worlds}
            onToggle={toggleWorld}
            onClear={() => setWorlds([])}
            defaultLabel={t('categorydiscovery:general')}
            ariaLabel={t('categorydiscovery:filterByWorld')}
          />
          <FilterDropdown
            label={t('categorydiscovery:ranking')}
            options={SORT_OPTIONS}
            values={sortOrders}
            onToggle={toggleSort}
            onClear={() => setSortOrders([])}
            defaultLabel={t('categorydiscovery:latest')}
            ariaLabel={t('categorydiscovery:filterBySort')}
          />
        </div>
      </section>

      {/* ── Category Chips ──────────────────────────────────────────────────── */}
      <section aria-label={t('categorydiscovery:classificationItems')}>
        <div className="gdp-chips-row" role="listbox" aria-label={t('categorydiscovery:chooseACategory')}>
          {CATEGORY_CHIPS.map(chip => (
            <button
              key={chip.id}
              role="option"
              aria-selected={activeChip === chip.id}
              className={`gdp-chip${activeChip === chip.id ? ' gdp-chip--active' : ''}`}
              onClick={() => setActiveChip(chip.id)}
              id={`gdp-chip-${chip.id}`}
            >
              {chip.label}
            </button>
          ))}
        </div>
      </section>

      {/* ── Featured / Hero ──────────────────────────────────────────────────── */}
      <section aria-labelledby="gdp-featured-heading">
        <div className="gdp-section__header">
          <h2 id="gdp-featured-heading" className="gdp-section__title">{t('categorydiscovery:featuredInTheClassification')}</h2>
        </div>
        <article className="gdp-hero" aria-label={FEATURED.title}>
          <div className="gdp-hero__cover">
            <CoverFallback height={200} />
            <div className="gdp-hero__overlay" />
            <span className="gdp-hero__cat-chip">{FEATURED.categoryLabel}</span>
          </div>
          <div className="gdp-hero__body">
            <h3 className="gdp-hero__title">{FEATURED.title}</h3>
            <p className="gdp-hero__creator">
              {FEATURED.creatorName}
              <span className="gdp-hero__handle" dir="ltr">{FEATURED.creatorHandle}</span>
            </p>
            <div className="gdp-hero__meta">
              <span><IconHeadphones />{FEATURED.playCount}</span>
              <span>{FEATURED.durationLabel}</span>
            </div>
          </div>
          <button className="gdp-hero__cta" aria-label={`استماع — ${FEATURED.title}`}>
            <IconPlay />
            <span>{t('categorydiscovery:toListen')}</span>
          </button>
        </article>
      </section>

      {/* ── Trending in Category ─────────────────────────────────────────────── */}
      <section aria-labelledby="gdp-trending-heading">
        <div className="gdp-section__header">
          <h2 id="gdp-trending-heading" className="gdp-section__title">{t('categorydiscovery:popularInTheCategory')}</h2>
          <button className="gdp-section__see-all" aria-label={t('categorydiscovery:viewAllTrending')}>{t('categorydiscovery:viewAll')}</button>
        </div>
        <div className="gdp-card-grid">
          {TRENDING_CARDS.map(card => (
            <article key={card.id} className="gdp-card" aria-label={card.title}>
              <div className="gdp-card__cover">
                <CoverFallback height={104} />
                <div className="gdp-card__cover-overlay" />
                {card.tag && <span className="gdp-card__tag">{card.tag}</span>}
                {card.playCount && (
                  <div className="gdp-card__stat">
                    <IconHeadphones />
                    <span>{card.playCount}</span>
                  </div>
                )}
              </div>
              <div className="gdp-card__body">
                <p className="gdp-card__title">{card.title}</p>
                <p className="gdp-card__meta">
                  {card.countryFlag && <span aria-hidden="true">{card.countryFlag}</span>}
                  {card.meta}
                </p>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* ── Suggested for You ────────────────────────────────────────────────── */}
      <section aria-labelledby="gdp-suggested-heading">
        <div className="gdp-section__header">
          <h2 id="gdp-suggested-heading" className="gdp-section__title">{t('categorydiscovery:suggestedForYou')}</h2>
          <button className="gdp-section__see-all" aria-label={t('categorydiscovery:viewAllSuggestions')}>{t('categorydiscovery:viewAll')}</button>
        </div>
        <div className="gdp-list">
          {SUGGESTED_LIST.map(item => (
            <article key={item.id} className="gdp-list-item" aria-label={item.title}>
              <div className="gdp-list-item__cover">
                <CoverFallback height={52} />
              </div>
              <div className="gdp-list-item__info">
                <p className="gdp-list-item__title">{item.title}</p>
                <p className="gdp-list-item__meta">
                  {item.meta}
                  {item.durationLabel && <span className="gdp-list-item__dur"> · {item.durationLabel}</span>}
                </p>
              </div>
              <button className="gdp-list-item__play" aria-label={`تشغيل ${item.title}`}>
                <IconPlay />
              </button>
            </article>
          ))}
        </div>
      </section>

      {/* ── Top Creators in Category ─────────────────────────────────────────── */}
      <section aria-labelledby="gdp-creators-heading">
        <div className="gdp-section__header">
          <h2 id="gdp-creators-heading" className="gdp-section__title">{t('categorydiscovery:topRatedCreators')}</h2>
          <button className="gdp-section__see-all" aria-label={t('categorydiscovery:viewAllCreators')}>{t('categorydiscovery:viewAll')}</button>
        </div>
        <div className="gdp-creator-list">
          {TOP_CREATORS.map(creator => (
            <article key={creator.uid} className="gdp-creator-row" aria-label={`ملف ${creator.displayName}`}>
              <AvatarFallback name={creator.displayName} size={48} />
              <div className="gdp-creator-row__info">
                <p className="gdp-creator-row__name">
                  {creator.countryFlag && <span aria-hidden="true">{creator.countryFlag} </span>}
                  {creator.displayName}
                </p>
                {creator.handle && (
                  <p className="gdp-creator-row__handle" dir="ltr">{creator.handle}</p>
                )}
                {creator.followerLabel && (
                  <p className="gdp-creator-row__followers">{creator.followerLabel}</p>
                )}
              </div>
              <button className="gdp-creator-row__follow" aria-label={`متابعة ${creator.displayName}`}>
                {t('categorydiscovery:tracking')}</button>
            </article>
          ))}
        </div>
      </section>

      {/* ── Sponsor / Promo Banner ───────────────────────────────────────────── */}
      <section aria-label={t('categorydiscovery:promotion')} className="gdp-promo-wrapper">
        <div className="gdp-promo" role="complementary">
          <span className="gdp-promo__badge">SPONSOR</span>
          <div className="gdp-promo__body">
            <p className="gdp-promo__headline">{t('categorydiscovery:careSpaceWithinTheClassification')}</p>
            <p className="gdp-promo__sub">{t('categorydiscovery:anAdAppropriateToTheCurrentContext')}</p>
          </div>
          <button className="gdp-promo__cta" aria-label={t('categorydiscovery:promotionDetails')}>
            {t('categorydiscovery:details')}</button>
        </div>
      </section>

      {/* ── Playlists from Category ──────────────────────────────────────────── */}
      <section aria-labelledby="gdp-playlists-heading">
        <div className="gdp-section__header">
          <h2 id="gdp-playlists-heading" className="gdp-section__title">{t('categorydiscovery:listsOfClassification')}</h2>
          <button className="gdp-section__see-all" aria-label={t('categorydiscovery:viewAllListings')}>{t('categorydiscovery:viewAll')}</button>
        </div>
        <div className="gdp-card-grid">
          {PLAYLISTS.map(pl => (
            <article key={pl.id} className="gdp-playlist-card" aria-label={pl.title}>
              <CoverFallback height={128} />
              <div className="gdp-playlist-card__overlay">
                <span className="gdp-playlist-card__tag">{pl.tag}</span>
                <p className="gdp-playlist-card__title">{pl.title}</p>
                {pl.trackCount && <p className="gdp-playlist-card__count">{pl.trackCount}</p>}
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* ── Rising Creators ──────────────────────────────────────────────────── */}
      <section aria-labelledby="gdp-rising-heading">
        <div className="gdp-section__header">
          <h2 id="gdp-rising-heading" className="gdp-section__title">{t('categorydiscovery:risingCreators')}</h2>
          <button className="gdp-section__see-all" aria-label={t('categorydiscovery:viewAllRisingCreators')}>{t('categorydiscovery:viewAll')}</button>
        </div>
        <div className="gdp-rising-grid">
          {RISING_CREATORS.map(creator => (
            <button
              key={creator.uid}
              className="gdp-rising-item"
              aria-label={creator.displayName}
            >
              <AvatarFallback name={creator.displayName} size={52} />
              <span className="gdp-rising-item__name">
                {creator.countryFlag && <span aria-hidden="true">{creator.countryFlag} </span>}
                {creator.displayName}
              </span>
              <span className="gdp-rising-item__follow-badge">+</span>
            </button>
          ))}
        </div>
      </section>

      {/* ── Random Discovery ─────────────────────────────────────────────────── */}
      <section aria-labelledby="gdp-random-heading">
        <div className="gdp-section__header">
          <h2 id="gdp-random-heading" className="gdp-section__title">{t('categorydiscovery:randomDiscovery')}</h2>
          <button className="gdp-random-refresh" aria-label={t('categorydiscovery:randomDetectionUpdate')}>
            <IconShuffle />
            <span>{t('categorydiscovery:toUpdate')}</span>
          </button>
        </div>
        <div className="gdp-card-grid">
          {RANDOM_CARDS.map(card => (
            <article key={card.id} className="gdp-card" aria-label={card.title}>
              <div className="gdp-card__cover">
                <CoverFallback height={104} accent={card.accentColor} />
                <div className="gdp-card__cover-overlay" />
              </div>
              <div className="gdp-card__body">
                <p className="gdp-card__title">{card.title}</p>
                <p className="gdp-card__meta">{card.meta}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* ── Empty / Request Banner ───────────────────────────────────────────── */}
      <section className="gdp-empty-request" aria-label={t('categorydiscovery:requestANewClassification')}>
        <div className="gdp-empty-request__inner">
          <p className="gdp-empty-request__text">
            {t('categorydiscovery:didntFindASuitableCategoryYouCanRequestA')}</p>
          <button className="gdp-empty-request__btn" aria-label={t('categorydiscovery:requestANewClassification')}>
            <IconChevronLeft />
            {t('categorydiscovery:classificationRequest')}</button>
        </div>
      </section>

    </main>
  );
}
