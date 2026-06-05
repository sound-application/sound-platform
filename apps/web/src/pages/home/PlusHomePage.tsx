/**
 * Sound Platform — Plus Home Page (بلس + الرئيسية)
 * Phase: 5-E (World-Scoped Feeds)
 * Route: /plus/home
 *
 * Design rules (LOCKED):
 *   - 3px border-radius
 *   - Alexandria/Cairo fonts
 *   - RTL layout; handles in dir="ltr"
 *   - No مباشر / بطولات
 *   - Filters: الحالة | التصنيف | البلد | الترتيب (locked order)
 *   - Plus accent: gold #f59e0b / #fbbf24
 */

import React, { useState } from 'react';
import './PlusHomePage.css';
import { FilterDropdown, SelectedChips, type FilterOption } from '../../components/FilterDropdown';
import { useTranslation } from 'react-i18next';

// ─── Types ────────────────────────────────────────────────────────────────────

interface StoryItem  { uid: string; displayName: string; isSelf?: boolean; }
interface ContentItem {
  id: string; title: string; meta: string;
  countryFlag?: string; playCount?: string;
  tag?: string; exclusive?: boolean;
}
interface CreatorItem {
  uid: string; displayName: string; handle?: string;
  followerLabel?: string; specialty?: string;
  countryFlag?: string; plusVerified?: boolean;
}
interface RoomItem   { id: string; title: string; host: string; listeners: string; live?: boolean; }
interface PlaylistItem { id: string; title: string; tag: string; trackCount?: string; }



// ─── Micro Icons ──────────────────────────────────────────────────────────────

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

// ─── Sub-components ───────────────────────────────────────────────────────────

function AvatarFallback({ name, size = 56 }: { name: string; size?: number }) {
  return (
    <div className="php-avatar-fallback" aria-hidden="true"
         style={{ width: size, height: size, fontSize: size * 0.38 }}>
      {name.trim().charAt(0)}
    </div>
  );
}

function CoverFallback({ height = 120 }: { height?: number }) {
  return <div className="php-cover-fallback" aria-hidden="true" style={{ height }} />;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function PlusHomePage() {
  const { t } = useTranslation();

  // ─── Static Data ──────────────────────────────────────────────────────────────

  const STORY_ITEMS: StoryItem[] = [
    { uid: 'self', displayName: t('plushome:yourStory'), isSelf: true },
    { uid: 'ps1',  displayName: t('plushome:nadine') },
    { uid: 'ps2',  displayName: t('plushome:generous')  },
    { uid: 'ps3',  displayName: t('plushome:lama')   },
    { uid: 'ps4',  displayName: t('plushome:fahad')   },
    { uid: 'ps5',  displayName: t('plushome:rana')   },
  ];

  const EXCLUSIVE_ITEMS: ContentItem[] = [
    { id: 'pe1', title: t('plushome:secretsOfSuccess'),       meta: t('plushome:exclusivePlus'),     playCount: '3.1M', countryFlag: '🇸🇦', tag: t('plushome:exclusive'),   exclusive: true },
    { id: 'pe2', title: t('plushome:withTheCreators'),        meta: t('plushome:weeklyPodcast'), playCount: '1.9M', countryFlag: '🇦🇪', tag: t('plushome:new'),   exclusive: true },
    { id: 'pe3', title: t('plushome:poetryNights'),        meta: t('plushome:poetryReading'),   playCount: '870K', countryFlag: '🇸🇦', exclusive: true },
    { id: 'pe4', title: t('plushome:dailyMeditationJourney'), meta: t('plushome:audioMeditation'),     playCount: '620K', countryFlag: '🇪🇬', tag: t('plushome:common'),   exclusive: true },
  ];

  const TRENDING_ITEMS: ContentItem[] = [
    { id: 'pt1', title: t('plushome:inspiringStories'),    meta: t('plushome:weeklyPodcast'), playCount: '2.4M', countryFlag: '🇸🇦', tag: t('plushome:common') },
    { id: 'pt2', title: t('plushome:theWorldOfKnowledge'), meta: t('plushome:audioArticles'),   playCount: '1.8M', countryFlag: '🇦🇪' },
    { id: 'pt3', title: t('plushome:nightPoetry'),    meta: t('plushome:poetryReading'),   playCount: '730K', countryFlag: '🇸🇦', tag: t('plushome:new') },
  ];

  const TOP_CREATORS: CreatorItem[] = [
    { uid: 'pc1', displayName: t('plushome:ahmedAdel'), handle: '@aadel',  followerLabel: t('plushome:980kFollowers'), specialty: t('plushome:exclusivePodcast'), countryFlag: '🇸🇦', plusVerified: true },
    { uid: 'pc2', displayName: t('plushome:sarahMalak'),  handle: '@smalek', followerLabel: t('plushome:12mFollowers'), specialty: t('plushome:storiesPlus'),      countryFlag: '🇦🇪', plusVerified: true },
    { uid: 'pc3', displayName: t('plushome:khaledNour'),  handle: '@knour',  followerLabel: t('plushome:650kFollowers'), specialty: t('plushome:contemplation'),          countryFlag: '🇸🇦', plusVerified: true },
  ];

  const EXCLUSIVE_ROOMS: RoomItem[] = [
    { id: 'pr1', title: t('plushome:creatorsRoomPlus'), host: t('plushome:ahmedAdel'), listeners: '1.4K', live: true  },
    { id: 'pr2', title: t('plushome:liveGroupReading'), host: t('plushome:sarahMalak'),  listeners: '890',  live: true  },
    { id: 'pr3', title: t('plushome:morningMeditationSession'),    host: t('plushome:khaledNour'),  listeners: '2.1K', live: false },
  ];

  const PLAYLISTS: PlaylistItem[] = [
    { id: 'pp1', title: t('plushome:bestPlusThisWeek'), tag: t('plushome:exclusivePlus'), trackCount: t('plushome:14Pieces') },
    { id: 'pp2', title: t('plushome:atmosphereOfFocusPlus'),  tag: t('plushome:relaxation'),  trackCount: t('plushome:9Pieces')  },
  ];

  const FOLLOWING: CreatorItem[] = [
    { uid: 'pf1', displayName: t('plushome:nadineHassan'), followerLabel: t('plushome:publishedContentExclusivelyForSubscriber') },
    { uid: 'pf2', displayName: t('plushome:faresKhalil'), followerLabel: t('plushome:lastActivityAnHourAgo') },
  ];

  // ─── Filter Options ───────────────────────────────────────────────────────────

  const STATUS_OPTIONS: FilterOption[] = [
    { value: 'new',       label: t('plushome:new')       },
    { value: 'trending',  label: t('plushome:common')       },
    { value: 'exclusive', label: t('plushome:exclusive')       },
    { value: 'saved',     label: t('plushome:safe')      },
    { value: 'unplayed',  label: t('plushome:notTurnedOn') },
  ];

  const CATEGORY_OPTIONS: FilterOption[] = [
    { value: 'podcast',    label: t('plushome:itsAPodcast') },
    { value: 'story',      label: t('plushome:stories')     },
    { value: 'poetry',     label: t('plushome:poetry')     },
    { value: 'meditation', label: t('plushome:contemplation')    },
    { value: 'interview',  label: t('plushome:dialogues')  },
    { value: 'comedy',     label: t('plushome:comedy') },
  ];

  const COUNTRY_OPTIONS: FilterOption[] = [
    { value: 'sa', label: t('plushome:saudiArabia') },
    { value: 'ae', label: t('plushome:emirates') },
    { value: 'eg', label: t('plushome:egypt')      },
    { value: 'kw', label: t('plushome:kuwait')   },
    { value: 'jo', label: t('plushome:jordan')   },
    { value: 'ma', label: t('plushome:morocco')   },
  ];

  const SORT_OPTIONS: FilterOption[] = [
    { value: 'latest',    label: t('plushome:latest')          },
    { value: 'popular',   label: t('plushome:mostListenedTo') },
    { value: 'exclusive', label: t('plushome:exclusiveFirst')    },
    { value: 'following', label: t('plushome:whoDoYouFollow')      },
    { value: 'suggested', label: t('plushome:suggestedForYou')      },
  ];

  const [statuses,   setStatuses]   = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [countries,  setCountries]  = useState<string[]>([]);
  const [sortOrders, setSortOrders] = useState<string[]>([]);

  function toggle(setter: React.Dispatch<React.SetStateAction<string[]>>) {
    return (v: string) =>
      setter(prev => prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v]);
  }

  return (
    <main className="php" aria-label={t('plushome:homePlus')}>

      {/* ── Stories ──────────────────────────────────────────────────────────── */}
      <section aria-label={t('plushome:quickStories')}>
        <div className="php-story-row">
          {STORY_ITEMS.map(item => (
            <button key={item.uid} className="php-story-item"
                    aria-label={item.isSelf ? t('plushome:addAStory') : `قصة ${item.displayName}`}>
              {item.isSelf ? (
                <div className="php-story-ring php-story-ring--self">
                  <AvatarFallback name={item.displayName} size={52} />
                  <span className="php-story-ring__add" aria-hidden="true">+</span>
                </div>
              ) : (
                <div className="php-story-ring">
                  <div className="php-story-ring__inner">
                    <AvatarFallback name={item.displayName} size={52} />
                  </div>
                </div>
              )}
              <span className="php-story-item__name">{item.displayName}</span>
            </button>
          ))}
        </div>
      </section>

      {/* ── Plus Hero CTA ────────────────────────────────────────────────────── */}
      <section aria-label={t('plushome:plusSubscription')}>
        <div className="php-hero">
          <div className="php-hero__glow" aria-hidden="true" />
          <div>
            <p className="php-hero__eyebrow">SOUND PLUS</p>
            <p className="php-hero__headline">{t('plushome:unlimitedExclusiveContentNoAds')}</p>
            <p className="php-hero__sub">{t('plushome:thousandsOfHoursOfExclusiveAudioFromLead')}</p>
          </div>
          <button className="php-hero__cta" aria-label={t('plushome:subscribeToPlusNow')}>
            {t('plushome:subscribeNow')}</button>
        </div>
      </section>

      {/* ── Search + Smart Filters ───────────────────────────────────────────── */}
      <section aria-label={t('plushome:searchAndFilter')}>
        <div className="php-search">
          <input id="php-search-input" className="php-search__input"
                 type="search" placeholder={t('plushome:searchPlusContent')}
                 autoComplete="off" dir="rtl" />
          <span className="php-search__icon"><IconSearch /></span>
        </div>

        <div className="php-filters" style={{ marginTop: 'var(--space-3)' }}>
          <FilterDropdown label={t('plushome:theCondition')}   options={STATUS_OPTIONS}   values={statuses}
            onToggle={toggle(setStatuses)}   onClear={() => setStatuses([])}
            defaultLabel={t('plushome:everyone')} ariaLabel={t('plushome:filterByStatus')} />
          <FilterDropdown label={t('plushome:classification')}  options={CATEGORY_OPTIONS} values={categories}
            onToggle={toggle(setCategories)} onClear={() => setCategories([])}
            defaultLabel={t('plushome:everyone')} ariaLabel={t('plushome:filterByCategory')} />
          <FilterDropdown label={t('plushome:country')}    options={COUNTRY_OPTIONS}  values={countries}
            onToggle={toggle(setCountries)}  onClear={() => setCountries([])}
            defaultLabel={t('plushome:everyone')} ariaLabel={t('plushome:filterByCountry')} />
          <FilterDropdown label={t('plushome:ranking')} options={SORT_OPTIONS}     values={sortOrders}
            onToggle={toggle(setSortOrders)} onClear={() => setSortOrders([])}
            defaultLabel={t('plushome:latest')} ariaLabel={t('plushome:filterBySort')} />
        </div>

        <SelectedChips groups={[
          { filterId: 'status',    options: STATUS_OPTIONS,   values: statuses,   onRemove: toggle(setStatuses)   },
          { filterId: 'category',  options: CATEGORY_OPTIONS, values: categories, onRemove: toggle(setCategories) },
          { filterId: 'country',   options: COUNTRY_OPTIONS,  values: countries,  onRemove: toggle(setCountries)  },
          { filterId: 'sortOrder', options: SORT_OPTIONS,     values: sortOrders, onRemove: toggle(setSortOrders) },
        ]} />

        <button className="php-subpage-btn" type="button" aria-label={t('plushome:plusItemsReview')}>
          <span>{t('plushome:browseItems')}</span>
          <svg viewBox="0 0 16 16" fill="none" width="11" height="11" aria-hidden="true">
            <path d="M6 3H3a1 1 0 00-1 1v9a1 1 0 001 1h9a1 1 0 001-1V10M10 2h4m0 0v4m0-4L7 9"
                  stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </section>

      {/* ── Exclusive Content ────────────────────────────────────────────────── */}
      <section aria-labelledby="php-exclusive-heading">
        <div className="php-section__header">
          <h2 id="php-exclusive-heading" className="php-section__title">
            {t('plushome:exclusiveContent')}
            <span className="php-section__title-badge">PLUS</span>
          </h2>
          <button className="php-section__see-all" aria-label={t('plushome:viewAllExclusiveContent')}>{t('plushome:viewAll')}</button>
        </div>
        <div className="php-h-scroll">
          {EXCLUSIVE_ITEMS.map(item => (
            <article key={item.id} className="php-content-card php-content-card--exclusive"
                     aria-label={item.title}>
              <div className="php-content-card__cover">
                <CoverFallback height={118} />
                <div className="php-content-card__cover-overlay" />
                {item.tag && <span className="php-content-card__tag">{item.tag}</span>}
                {item.exclusive && <span className="php-content-card__lock" aria-label={t('plushome:exclusiveContent')}>🔒</span>}
                {item.playCount && (
                  <div className="php-content-card__play-stat">
                    <IconPlay /><span>{item.playCount}</span>
                  </div>
                )}
              </div>
              <div className="php-content-card__body">
                <p className="php-content-card__title">{item.title}</p>
                <p className="php-content-card__meta">
                  {item.countryFlag && <span aria-hidden="true">{item.countryFlag}</span>}
                  {item.meta}
                </p>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* ── Premium Creators ─────────────────────────────────────────────────── */}
      <section aria-labelledby="php-creators-heading">
        <div className="php-section__header">
          <h2 id="php-creators-heading" className="php-section__title">
            {t('plushome:innovatorsPlus')}
            <span className="php-section__title-badge">PLUS</span>
          </h2>
          <button className="php-section__see-all" aria-label={t('plushome:viewAllCreatorsPlus')}>{t('plushome:viewAll')}</button>
        </div>
        <div className="php-creator-grid">
          {TOP_CREATORS.map(creator => (
            <article key={creator.uid}
                     className={`php-creator-card${creator.plusVerified ? ' php-creator-card--plus' : ''}`}
                     aria-label={`ملف ${creator.displayName}`}>
              <div className="php-creator-card__left">
                <AvatarFallback name={creator.displayName} size={52} />
                <div>
                  <p className="php-creator-card__name">
                    {creator.countryFlag && <span aria-hidden="true">{creator.countryFlag}</span>}
                    {creator.displayName}
                    {creator.plusVerified && (
                      <span className="php-plus-badge" aria-label={t('plushome:creativePlus')}>✦ PLUS</span>
                    )}
                  </p>
                  {creator.followerLabel && (
                    <p className="php-creator-card__followers">{creator.followerLabel}</p>
                  )}
                  {creator.specialty && (
                    <p className="php-creator-card__specialty">{creator.specialty}</p>
                  )}
                </div>
              </div>
              <button className="php-creator-card__follow-btn"
                      aria-label={`متابعة ${creator.displayName}`}>
                {t('plushome:tracking')}
              </button>
            </article>
          ))}
        </div>
      </section>

      {/* ── Exclusive Rooms ───────────────────────────────────────────────────── */}
      <section aria-labelledby="php-rooms-heading">
        <div className="php-section__header">
          <h2 id="php-rooms-heading" className="php-section__title">{t('plushome:exclusivePlusRooms')}</h2>
          <button className="php-section__see-all" aria-label={t('plushome:viewAllRooms')}>{t('plushome:viewAll')}</button>
        </div>
        <div className="php-h-scroll">
          {EXCLUSIVE_ROOMS.map(room => (
            <div key={room.id} className="php-room-card" role="article" aria-label={room.title}>
              <p className="php-room-card__title">{room.title}</p>
              <div className="php-room-card__meta">
                {room.live && <span className="php-room-card__live-dot" aria-hidden="true" />}
                <span>{room.host} · {room.listeners} {t('plushome:theListener')}</span>
              </div>
              <button className="php-room-card__join"
                      aria-label={`انضم إلى ${room.title}`}>
                {room.live ? t('plushome:joinNow') : t('plushome:listen')}
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* ── Sponsor / Ad Block ───────────────────────────────────────────────── */}
      <section aria-label={t('plushome:advertisement')}>
        <div className="php-sponsor">
          <span className="php-sponsor__label">{t('plushome:advertisement')}</span>
          <div className="php-sponsor__logo" aria-hidden="true">🎙</div>
          <div className="php-sponsor__body">
            <p className="php-sponsor__name">{t('plushome:professionalAudioStudio')}</p>
            <p className="php-sponsor__tagline">{t('plushome:recordingEquipmentForCreativesFastDelive')}</p>
          </div>
          <button className="php-sponsor__cta" aria-label={t('plushome:shopNow')}>{t('plushome:shopNow')}</button>
        </div>
      </section>

      {/* ── Trending (non-exclusive) ──────────────────────────────────────────── */}
      <section aria-labelledby="php-trending-heading">
        <div className="php-section__header">
          <h2 id="php-trending-heading" className="php-section__title">{t('plushome:popularNow')}</h2>
          <button className="php-section__see-all" aria-label={t('plushome:viewAllTrending')}>{t('plushome:viewAll')}</button>
        </div>
        <div className="php-h-scroll">
          {TRENDING_ITEMS.map(item => (
            <article key={item.id} className="php-content-card" aria-label={item.title}>
              <div className="php-content-card__cover">
                <CoverFallback height={118} />
                <div className="php-content-card__cover-overlay" />
                {item.tag && <span className="php-content-card__tag">{item.tag}</span>}
                {item.playCount && (
                  <div className="php-content-card__play-stat">
                    <IconPlay /><span>{item.playCount}</span>
                  </div>
                )}
              </div>
              <div className="php-content-card__body">
                <p className="php-content-card__title">{item.title}</p>
                <p className="php-content-card__meta">
                  {item.countryFlag && <span aria-hidden="true">{item.countryFlag}</span>}
                  {item.meta}
                </p>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* ── Playlists ────────────────────────────────────────────────────────── */}
      <section aria-labelledby="php-playlists-heading">
        <div className="php-section__header">
          <h2 id="php-playlists-heading" className="php-section__title">{t('plushome:playlists')}</h2>
          <button className="php-section__see-all" aria-label={t('plushome:viewAllListings')}>{t('plushome:viewAll')}</button>
        </div>
        <div className="php-playlist-grid">
          {PLAYLISTS.map(pl => (
            <article key={pl.id} className="php-playlist-card" aria-label={pl.title}>
              <CoverFallback height={136} />
              <div className="php-playlist-card__overlay">
                <span className="php-playlist-card__tag">{pl.tag}</span>
                <p className="php-playlist-card__title">{pl.title}</p>
                {pl.trackCount && <p className="php-playlist-card__count">{pl.trackCount}</p>}
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* ── Following Activity ────────────────────────────────────────────────── */}
      <section aria-labelledby="php-following-heading">
        <div className="php-section__header">
          <h2 id="php-following-heading" className="php-section__title">{t('plushome:creatorsYouFollow')}</h2>
          <button className="php-section__see-all" aria-label={t('plushome:showWhoYouFollow')}>{t('plushome:viewAll')}</button>
        </div>
        <div className="php-follow-list">
          {FOLLOWING.map(creator => (
            <article key={creator.uid} className="php-follow-item"
                     aria-label={`نشاط ${creator.displayName}`}>
              <AvatarFallback name={creator.displayName} size={42} />
              <div className="php-follow-item__info">
                <p className="php-follow-item__name">{creator.displayName}</p>
                {creator.followerLabel && (
                  <p className="php-follow-item__status">{creator.followerLabel}</p>
                )}
              </div>
              <span className="php-follow-item__indicator" aria-hidden="true" />
              <span className="php-follow-item__chevron" aria-hidden="true">
                <IconChevronLeft />
              </span>
            </article>
          ))}
        </div>
      </section>

    </main>
  );
}
