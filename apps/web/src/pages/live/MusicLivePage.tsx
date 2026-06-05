/**
 * Sound Platform — Music Live Page  (Phase 5-E)
 * world === "music"
 * Locked rules: 3px radius · Alexandria/Cairo · dark tokens · RTL
 * No emoji placeholders · No مباشر label · No auto-play · Arrow nav only
 *
 * Uses LivePage.css for all structural classes.
 * MusicLivePage.css adds only music-specific accent colours and hero-card skin.
 */

import React, { useState, useCallback, useRef } from 'react';
import { FilterDropdown, SelectedChips, type FilterOption } from '../../components/FilterDropdown';
import '../LivePage.css';
import './MusicLivePage.css';
import { useTranslation } from 'react-i18next';
import i18n from 'i18next';

const t = (key: any, options?: any) => i18n.t(key, options) as any as string;


// ─── Filter options ────────────────────────────────────────────────────────────

const getMUSIC_STATUS_OPTIONS = (t: any): FilterOption[]  => [
  { value: 'live_now',   label: t('musiclive:playingNow') },
  { value: 'concert',   label: t('musiclive:liveConcert') },
  { value: 'listening', label: t('musiclive:hearing') },
  { value: 'upcoming',  label: t('profile.emptyStates.soon') },
  { value: 'following', label: t('musiclive:whoIFollow') },
];
const MUSIC_CATEGORY_OPTIONS: FilterOption[] = [
  { value: 'arabic_pop', label: t('musiclive:arabicPop') },
  { value: 'tarab',      label: t('musiclive:rapture') },
  { value: 'rap',        label: t('musiclive:rap') },
  { value: 'khaleeji',  label: t('musiclive:gulf') },
  { value: 'masri',     label: t('musiclive:egypt1') },
  { value: 'acoustic',  label: t('musiclive:acoustic') },
  { value: 'indie',     label: t('musiclive:dew') },
  { value: 'electronic',label: t('musiclive:electronic') },
];
const MUSIC_COUNTRY_OPTIONS: FilterOption[] = [
  { value: 'sa', label: t('musiclive:saudiArabia') },
  { value: 'eg', label: t('musiclive:egypt') },
  { value: 'ae', label: t('musiclive:theUae') },
  { value: 'jo', label: t('musiclive:jordan') },
  { value: 'ma', label: t('musiclive:morocco') },
  { value: 'lb', label: t('musiclive:lebanon') },
  { value: 'kw', label: t('musiclive:kuwait') },
];
const MUSIC_SORT_OPTIONS: FilterOption[] = [
  { value: 'listeners_desc', label: t('musiclive:highestListening') },
  { value: 'live_now',       label: t('musiclive:playingNow') },
  { value: 'newest',         label: t('musiclive:latestAddition') },
  { value: 'following',      label: t('musiclive:whoIFollow') },
  { value: 'upcoming',       label: t('musiclive:upcomingEvents') },
  { value: 'top_artists',    label: t('musiclive:theMostFamousArtists') },
];

// ─── Types ─────────────────────────────────────────────────────────────────────

interface MusicEvent {
  id: string;
  title: string;
  artist: string;
  artistHandle: string;
  category: string;
  country: string;
  listeners: string;
  eventType: 'concert' | 'listening_party' | 'artist_event' | 'jam';
  isFeatured?: boolean;
  isFollowed?: boolean;
  coverInitials: string;
  coverColor: string;
  accentColor: string;
  startTime?: string;
  isLive: boolean;
}

// ─── Mock Data ─────────────────────────────────────────────────────────────────

const ALL_EVENTS: MusicEvent[] = [
  {
    id: 'me1', title: t('musiclive:springParty'), artist: t('musiclive:lian'), artistHandle: 'layan@',
    category: t('musiclive:arabicPop'), country: t('musiclive:saudiArabia'), listeners: '12.4K',
    eventType: 'concert', isFeatured: true,
    coverInitials: t('musiclive:forMe'), coverColor: '#1a0a2e', accentColor: '#a855f7', isLive: true,
  },
  {
    id: 'me2', title: t('musiclive:gulfNightSession'), artist: t('musiclive:faisalAlamer'), artistHandle: 'faisalamir@',
    category: t('musiclive:gulf'), country: t('musiclive:kuwait'), listeners: '8.1K',
    eventType: 'listening_party', isFeatured: true, isFollowed: true,
    coverInitials: t('musiclive:in'), coverColor: '#071a10', accentColor: '#22c55e', isLive: true,
  },
  {
    id: 'me3', title: t('musiclive:acousticFromTheHeart'), artist: t('musiclive:zaidAliraqi'), artistHandle: 'zaydiq@',
    category: t('musiclive:acoustic'), country: t('musiclive:jordan'), listeners: '5.7K',
    eventType: 'concert', isFeatured: true,
    coverInitials: t('musiclive:like'), coverColor: '#1a120a', accentColor: '#f59e0b', isLive: true,
  },
  {
    id: 'me4', title: t('musiclive:raptureInTheNight'), artist: t('musiclive:nouraAlhamd'), artistHandle: 'norah_h@',
    category: t('musiclive:rapture'), country: t('musiclive:egypt'), listeners: '9.3K',
    eventType: 'artist_event', isFollowed: true,
    coverInitials: t('musiclive:so'), coverColor: '#1a0808', accentColor: '#ef4444', isLive: true,
  },
  {
    id: 'me5', title: t('musiclive:egyptianRapNight'), artist: t('musiclive:adamKhaled'), artistHandle: 'adam_k@',
    category: t('musiclive:rap'), country: t('musiclive:egypt'), listeners: '14.2K',
    eventType: 'concert',
    coverInitials: t('musiclive:add'), coverColor: '#080818', accentColor: '#3b82f6', isLive: true,
  },
  {
    id: 'me6', title: t('musiclive:calmMoodWithLight'), artist: t('musiclive:others'), artistHandle: 'nour@',
    category: t('musiclive:dew'), country: t('musiclive:morocco'), listeners: '3.2K',
    eventType: 'listening_party', isFollowed: true,
    coverInitials: t('musiclive:male'), coverColor: '#081218', accentColor: '#22d3ee', isLive: true,
  },
  {
    id: 'me7', title: t('musiclive:electronicWithDjFahd'), artist: t('musiclive:djFahd'), artistHandle: 'djfahad@',
    category: t('musiclive:electronic'), country: t('musiclive:theUae'), listeners: '7.8K',
    eventType: 'artist_event', isFollowed: true,
    coverInitials: t('musiclive:are'), coverColor: '#0e0a1a', accentColor: '#8b5cf6',
    isLive: false, startTime: t('musiclive:1000Pm'),
  },
  {
    id: 'me8', title: t('musiclive:oudAndSpeechSession'), artist: t('musiclive:samerAdel'), artistHandle: 'samir_a@',
    category: t('musiclive:rapture'), country: t('musiclive:lebanon'), listeners: '2.9K',
    eventType: 'jam', isFollowed: true,
    coverInitials: t('musiclive:right'), coverColor: '#180f0a', accentColor: '#d97706', isLive: true,
  },
];

const FEATURED  = ALL_EVENTS.filter(e => e.isFeatured);
const ACTIVE    = ALL_EVENTS.filter(e => e.isLive && !e.isFeatured);
const PARTIES   = ALL_EVENTS.filter(e => e.eventType === 'listening_party');
const FOLLOWING = ALL_EVENTS.filter(e => e.isFollowed);

const EVENT_TYPE_LABEL: Record<MusicEvent['eventType'], string> = {
  concert:        t('musiclive:aParty'),
  listening_party:t('musiclive:hearing'),
  artist_event:   t('musiclive:artisticEvent'),
  jam:            t('musiclive:musicSession'),
};

// ─── Music Hero Card — uses live-feat-card skeleton + music skin ───────────────

function MusicHeroCard({ event }: { event: MusicEvent }) {
  const { t } = useTranslation(['profile', 'home']);
  return (
    <div
      className="live-feat-card music-hero-card"
      style={{ background: `linear-gradient(160deg, ${event.coverColor} 0%, #0d0c0a 100%)` }}
      aria-label={`فعالية مميزة: ${event.title}`}
    >
      {/* accent glow overlay */}
      <div
        className="music-hero__glow"
        style={{ background: `radial-gradient(ellipse at 75% 25%, ${event.accentColor}38 0%, transparent 68%)` }}
        aria-hidden="true"
      />

      {/* top badges row */}
      <div className="music-hero__top">
        {event.isLive ? (
          <span className="live-hero__badge music-live-badge">
            <span className="live-hero__pulse" aria-hidden="true" />
            {t('musiclive:live')}</span>
        ) : (
          <span className="music-upcoming-badge">{t('musiclive:almost')}{event.startTime}</span>
        )}
        <span
          className="music-cat-tag"
          style={{ borderColor: `${event.accentColor}55`, color: event.accentColor }}
        >
          {event.category}
        </span>
      </div>

      {/* spacer */}
      <div className="music-hero__spacer" aria-hidden="true" />

      {/* bottom overlay — mirrors live-hero__body / live-hero__actions */}
      <div className="music-hero__overlay">
        <h3 className="live-hero__title">{event.title}</h3>

        <div className="live-hero__body" style={{ marginBottom: '0.5rem' }}>
          <div
            className="room-avatar"
            style={{ '--avatar-color': `${event.accentColor}25` } as React.CSSProperties}
            aria-hidden="true"
          >
            <span className="room-avatar__initials" style={{ color: event.accentColor }}>
              {event.coverInitials[0]}
            </span>
          </div>
          <div className="live-hero__text">
            <p className="live-hero__host">{event.artist} · {event.artistHandle}</p>
            <div className="live-hero__meta">
              <span className="live-hero__meta-item live-hero__meta-item--cyan">
                <svg className="live-hero__meta-icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
                </svg>
                {event.listeners} {t('musiclive:theListener')}</span>
              <span className="live-hero__meta-item">
                {EVENT_TYPE_LABEL[event.eventType]}
              </span>
              <span className="live-hero__meta-item">{event.country}</span>
            </div>
          </div>
        </div>

        <div className="live-hero__actions">
          <button
            className="live-hero__join-btn"
            style={{ background: event.accentColor, borderColor: event.accentColor }}
            aria-label={`انضمام إلى ${event.title}`}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M8 5v14l11-7z"/>
            </svg>
            {t('musiclive:integration')}</button>
          <button className="live-hero__preview-btn">{t('musiclive:preview')}</button>
        </div>
      </div>
    </div>
  );
}

// ─── Music Event Row — uses room-row skeleton + music skin ─────────────────────

function MusicEventRow({ event }: { event: MusicEvent }) {
  const { t } = useTranslation('profile');
  return (
    <article className="room-row music-event-row" role="listitem">
      {/* cover thumbnail — replaces room-avatar */}
      <div
        className="room-avatar music-event-cover"
        style={{
          background: `linear-gradient(135deg, ${event.coverColor} 0%, ${event.accentColor}66 100%)`,
          '--avatar-color': event.accentColor,
        } as React.CSSProperties}
        aria-hidden="true"
      >
        <span className="room-avatar__initials" style={{ color: event.accentColor }}>
          {event.coverInitials}
        </span>
        {event.isLive && (
          <span className="room-avatar__waveform" aria-hidden="true">
            {[0, 0.2, 0.1, 0.3].map((d, i) => (
              <span
                key={i}
                className="room-avatar__wave-bar"
                style={{ animationDelay: `${d}s`, background: event.accentColor }}
              />
            ))}
          </span>
        )}
      </div>

      {/* body */}
      <div className="room-row__info">
        <p className="room-row__title">{event.title}</p>
        <p className="room-row__meta">{event.artist} · {event.category}</p>
        <div className="room-row__stats">
          <span className="room-row__stat room-row__stat--listeners">
            <svg className="room-row__stat-icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
            </svg>
            {event.listeners}
          </span>
          <span className="room-row__stat">{event.country}</span>
          {event.isLive
            ? <span className="room-row__badge room-row__badge--live">{t('musiclive:live')}</span>
            : <span className="room-row__badge room-row__badge--guest">{event.startTime}</span>
          }
        </div>
      </div>

      <button
        className="room-row__join-btn"
        style={{ borderColor: `${event.accentColor}55`, color: event.accentColor }}
        aria-label={`انضمام إلى ${event.title}`}
      >
        {t('musiclive:integration')}</button>
    </article>
  );
}

// ─── Music Ad card — uses live-sponsor skeleton ────────────────────────────────

function MusicAdCard() {
  const { t } = useTranslation('profile');
  return (
    <div className="live-sponsor music-ad" role="complementary" aria-label={t('musiclive:advertisement')}>
      <span className="live-sponsor__tag">{t('musiclive:advertisement')}</span>
      <div className="live-sponsor__body">
        <div className="live-sponsor__icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22">
            <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
          </svg>
        </div>
        <div className="live-sponsor__text">
          <p className="live-sponsor__name">Sound Studio</p>
          <p className="live-sponsor__desc">{t('musiclive:recordYourMusicProfessionallyInstantDist')}</p>
        </div>
      </div>
      <button className="live-sponsor__cta" aria-label={t('musiclive:discoverSoundStudio')}>{t('musiclive:findOut')}</button>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export function MusicLivePage() {  // Filter state
  const [statusValues,   setStatusValues]   = useState<string[]>([]);
  const [categoryValues, setCategoryValues] = useState<string[]>([]);
  const [countryValues,  setCountryValues]  = useState<string[]>([]);
  const [sortValues,     setSortValues]     = useState<string[]>([]);

  const toggleStatus   = useCallback((v: string) => setStatusValues(p   => p.includes(v) ? p.filter(x => x !== v) : [...p, v]), []);
  const toggleCategory = useCallback((v: string) => setCategoryValues(p => p.includes(v) ? p.filter(x => x !== v) : [...p, v]), []);
  const toggleCountry  = useCallback((v: string) => setCountryValues(p  => p.includes(v) ? p.filter(x => x !== v) : [...p, v]), []);
  const toggleSort     = useCallback((v: string) => setSortValues(p     => p.includes(v) ? p.filter(x => x !== v) : [...p, v]), []);

  const chipGroups = [
    { filterId: 'mus-stat',  options: getMUSIC_STATUS_OPTIONS(t),   values: statusValues,   onRemove: (v: string) => setStatusValues(p   => p.filter(x => x !== v)) },
    { filterId: 'mus-cat',   options: MUSIC_CATEGORY_OPTIONS, values: categoryValues, onRemove: (v: string) => setCategoryValues(p => p.filter(x => x !== v)) },
    { filterId: 'mus-ctry',  options: MUSIC_COUNTRY_OPTIONS,  values: countryValues,  onRemove: (v: string) => setCountryValues(p  => p.filter(x => x !== v)) },
    { filterId: 'mus-sort',  options: MUSIC_SORT_OPTIONS,     values: sortValues,     onRemove: (v: string) => setSortValues(p     => p.filter(x => x !== v)) },
  ];

  // Search
  const [searchQuery, setSearchQuery] = useState('');

  // Carousel — manual arrow nav only, no auto-play
  const trackRef = useRef<HTMLDivElement>(null);
  const scroll = (dir: 'prev' | 'next') => {
    const el = trackRef.current;
    if (!el) return;
    // RTL: next = scroll right (negative scrollLeft direction), prev = scroll left
    el.scrollBy({ left: dir === 'next' ? -300 : 300, behavior: 'smooth' });
  };

  return (
    <>
      {/* ── Search ────────────────────────────────────────────────────────── */}
      <div className="live-search-wrap" role="search">
        <div className="live-search">
          <svg className="live-search__icon" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
          </svg>
          <input
            id="music-live-search-input"
            className="live-search__input"
            type="search"
            placeholder={t('musiclive:searchLiveMusic')}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
           
            aria-label={t('musiclive:searchMusicEvents')}
            autoComplete="off"
          />
          {searchQuery && (
            <button className="live-search__clear" type="button" onClick={() => setSearchQuery('')} aria-label={t('musiclive:clearSearch')}>✕</button>
          )}
        </div>
      </div>

      {/* ── 4-Filter Row ──────────────────────────────────────────────────── */}
      <div className="live-filter-area">
        <div className="live-filters" role="group" aria-label={t('musiclive:musicEventFilters')}>
          <FilterDropdown label={t('musiclive:theCondition')}   options={getMUSIC_STATUS_OPTIONS(t)}   values={statusValues}   onToggle={toggleStatus}   onClear={() => setStatusValues([])}   ariaLabel={t('musiclive:filterByStatus')} />
          <FilterDropdown label={t('musiclive:classification')} options={MUSIC_CATEGORY_OPTIONS} values={categoryValues} onToggle={toggleCategory} onClear={() => setCategoryValues([])} ariaLabel={t('musiclive:filterByCategory')} />
          <FilterDropdown label={t('musiclive:country')}    options={MUSIC_COUNTRY_OPTIONS}  values={countryValues}  onToggle={toggleCountry}  onClear={() => setCountryValues([])}  ariaLabel={t('musiclive:filterByCountry')} />
          <FilterDropdown label={t('live:filters.sort.label')} options={MUSIC_SORT_OPTIONS}     values={sortValues}     onToggle={toggleSort}     onClear={() => setSortValues([])}     ariaLabel={t('musiclive:arrangingEvents')} />
        </div>

        <SelectedChips groups={chipGroups} />

        <button className="fd-subpage-btn live-browse-btn" type="button" aria-label={t('musiclive:reviewOfMusicalGenres')}>
          <svg width="13" height="13" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zm0 8a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zm6-6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zm0 8a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
          </svg>
          {t('home.search.browseCategories')}
        </button>
      </div>

      {/* ── Featured Hero Carousel — uses live-carousel skeleton ────────── */}
      {FEATURED.length > 0 && (
        <section className="live-carousel" aria-label={t('musiclive:featuredEvents')}>
          <div className="live-section__header" style={{ padding: '0 1rem' }}>
            <h2 className="live-section__title">{t('musiclive:specialEvents')}</h2>
            <div className="live-carousel__nav" aria-label={t('musiclive:browseFeaturedEvents')}>
              {/* RTL: السابق → right chevron scrolls track rightward */}
              <button className="live-carousel__btn" onClick={() => scroll('prev')} aria-label={t('musiclive:thePrevious')}>
                <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
              </button>
              <button className="live-carousel__btn" onClick={() => scroll('next')} aria-label={t('musiclive:theNext')}>
                <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
                  <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
          <div className="live-carousel__track" ref={trackRef}>
            {FEATURED.map(event => (
              <MusicHeroCard key={event.id} event={event} />
            ))}
          </div>
        </section>
      )}

      {/* ── فعاليات الآن ──────────────────────────────────────────────────── */}
      {ACTIVE.length > 0 && (
        <section className="live-section" aria-label={t('musiclive:activeMusicEvents')}>
          <div className="live-section__header">
            <h2 className="live-section__title">{t('musiclive:eventsNow')}</h2>
            <button className="live-section__see-all">{t('home:viewAll')}</button>
          </div>
          <div className="room-list">
            {ACTIVE.map(event => <MusicEventRow key={event.id} event={event} />)}
          </div>
        </section>
      )}

      {/* ── Ad card — uses live-sponsor skeleton ──────────────────────────── */}
      <MusicAdCard />

      {/* ── جلسات الاستماع ────────────────────────────────────────────────── */}
      {PARTIES.length > 0 && (
        <section className="live-section" aria-label={t('musiclive:hearings')}>
          <div className="live-section__header">
            <h2 className="live-section__title">{t('musiclive:hearings')}</h2>
            <button className="live-section__see-all">{t('home:viewAll')}</button>
          </div>
          <div className="room-list">
            {PARTIES.map(event => <MusicEventRow key={event.id} event={event} />)}
          </div>
        </section>
      )}

      {/* ── من فنانين أتابعهم ─────────────────────────────────────────────── */}
      {FOLLOWING.length > 0 && (
        <section className="live-section" aria-label={t('musiclive:fromArtistsYouFollow')}>
          <div className="live-section__header">
            <h2 className="live-section__title">{t('musiclive:fromArtistsIFollow')}</h2>
          </div>
          <div className="room-list">
            {FOLLOWING.map(event => <MusicEventRow key={event.id} event={event} />)}
          </div>
        </section>
      )}

      {/* ── Create CTA — uses live-create-cta skeleton ────────────────────── */}
      <div className="live-create-cta music-cta" role="region" aria-label={t('musiclive:createAMusicEvent')}>
        <div className="live-create-cta__icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="currentColor" width="28" height="28">
            <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
          </svg>
        </div>
        <div className="live-create-cta__text">
          <p className="live-create-cta__label">
            {t('musiclive:doYouWantToStartAMusicEvent')}<span className="live-create-cta__eligibility">{t('musiclive:accordingToEligibility')}</span>
          </p>
          <p className="live-create-cta__hint">{t('musiclive:shareYourMusicDirectlyWithTheCommunity')}</p>
        </div>
        <button className="live-create-cta__btn music-cta__btn" aria-label={t('musiclive:createAMusicEvent')}>
          {t('musiclive:construction')}</button>
      </div>

      <p className="live-footer-note">
        {t('musiclive:liveMusicEventsAreAvailableToListenersFo')}</p>
    </>
  );
}
