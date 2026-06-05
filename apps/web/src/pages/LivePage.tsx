/**
 * Sound Platform — Live Tab Page
 * Phase: 5-E (World-Scoped Live) + i18n
 *
 * Reads `world` from WorldNavContext (/:worldId/live).
 * Renders a distinct live surface per world:
 *   عام        — general Sound live rooms
 *   بلس        — inherits GeneralLive structure (+ permission gate)
 *   موسيقى     — music events / concert / listening parties
 *   راديو      — on-air schedule
 *   مسابقات    — tournament live / voting / leaderboard
 *
 * Data: representative static arrays — each typed for backend wiring.
 * Section visibility: hidden when array is empty (no broken empty divs).
 *
 * Locked rules:
 *   لايف label · 3px radius · Alexandria/Cairo · dark tokens
 *   Forbidden: مباشر · بطولات · no top-level /live route
 *   No chip strips — smart FilterDropdown only
 *   No emoji placeholder cards
 */

import React, { useState, useCallback, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import i18n from 'i18next';

const t = (key: any, options?: any) => i18n.t(key, options) as any as string;

import { TFunction } from 'i18next';
import { useWorldNav } from '../contexts/WorldNavContext';
import { FilterDropdown, SelectedChips, type FilterOption } from '../components/FilterDropdown';
import { MusicLivePage } from './live/MusicLivePage';
import { TournamentsLivePage } from './live/TournamentsLivePage';
import './LivePage.css';

// ─── Types ───────────────────────────────────────────────────────────────────

interface LiveRoom {
  id: string;
  title: string;
  host: string;
  category: string;
  categoryId: string;
  speakers: number;
  listeners: string;
  isFollowed?: boolean;
  isGuestOpen?: boolean; // host accepts guest requests
  isFeatured?: boolean;
  avatarInitials: string; // two-letter host initials, no emoji
  avatarColor: string;    // CSS color for the avatar bg
}

// ─── Static data ─────────────────────────────────────────────────────────────

// General Live filter options
const getGenStatusOptions = (t: TFunction): FilterOption[] => [
  { value: 'live_now',   label: t('filters.status.live_now') },
  { value: 'guest_open', label: t('filters.status.guest_open') },
  { value: 'following',  label: t('filters.status.following') },
  { value: 'nearby',     label: t('filters.status.nearby') },
];

const getGenCategoryOptions = (t: TFunction): FilterOption[] => [
  { value: 'culture',  label: t('filters.category.culture') },
  { value: 'poetry',   label: t('filters.category.poetry') },
  { value: 'podcast',  label: t('filters.category.podcast') },
  { value: 'stories',  label: t('filters.category.stories') },
  { value: 'dev',      label: t('filters.category.dev') },
  { value: 'debates',  label: t('filters.category.debates') },
];

const getGenCountryOptions = (t: TFunction): FilterOption[] => [
  { value: 'sa',   label: t('filters.country.sa') },
  { value: 'eg',   label: t('filters.country.eg') },
  { value: 'ae',   label: t('filters.country.ae') },
  { value: 'kw',   label: t('filters.country.kw') },
  { value: 'jo',   label: t('filters.country.jo') },
  { value: 'intl', label: t('filters.country.intl') },
];

const getGenSortOptions = (t: TFunction): FilterOption[] => [
  { value: 'newest',      label: t('filters.sort.newest') },
  { value: 'most_heard',  label: t('filters.sort.most_heard') },
  { value: 'most_active', label: t('filters.sort.most_active') },
  { value: 'following',   label: t('filters.sort.following') },
  { value: 'suggested',   label: t('filters.sort.suggested') },
];

const getGENERAL_ROOMS = (t: any): LiveRoom[]  => [
  { id: 'g1', title: t('live:eveningTalk'), host: t('live:nouraMansour'), category: t('live:culture'), categoryId: 'culture', speakers: 6, listeners: '8.4K', isFollowed: true, isGuestOpen: true, isFeatured: true, avatarInitials: t('live:damp'), avatarColor: '#7c3aed' },
  { id: 'g2', title: t('live:hairOnTheAir'), host: t('live:badrAlmutairi'), category: t('live:filters.category.poetry'), categoryId: 'poetry', speakers: 5, listeners: '1.2K', isFollowed: true, isGuestOpen: false, isFeatured: true, avatarInitials: t('live:theBomb'), avatarColor: '#0891b2' },
  { id: 'g3', title: t('live:questionsAboutTheAudioIndustry'), host: t('live:rahafAli'), category: t('live:filters.category.podcast'), categoryId: 'podcast', speakers: 8, listeners: '2.1K', isFollowed: false, isGuestOpen: true, isFeatured: true, avatarInitials: t('live:ra'), avatarColor: '#059669' },
  { id: 'g4', title: t('live:aSpaceForEmergingCreatives'), host: t('live:faisalKamal'), category: t('live:development'), categoryId: 'dev', speakers: 3, listeners: '450', isFollowed: false, isGuestOpen: false, isFeatured: true, avatarInitials: t('live:unscrew'), avatarColor: '#d97706' },
  { id: 'g5', title: t('live:talesFromThePast'), host: t('live:fahdAlrawi'), category: t('live:filters.category.stories'), categoryId: 'stories', speakers: 2, listeners: '900', isFollowed: true, isGuestOpen: false, avatarInitials: t('live:oven'), avatarColor: '#be185d' },
  { id: 'g6', title: t('live:digitalArtPodcast'), host: t('live:yassinFahd'), category: t('live:filters.category.podcast'), categoryId: 'podcast', speakers: 2, listeners: '670', isFollowed: false, isGuestOpen: true, avatarInitials: t('live:yf'), avatarColor: '#1d4ed8' },
];

// Plus rooms
const getPLUS_ROOMS = (t: any): LiveRoom[]  => [
  { id: 'p1', title: t('live:advancedCreatorsSession'), host: t('live:sarahAlahmadi'), category: t('live:creativity'), categoryId: 'creative', speakers: 8, listeners: '12.3K', isFollowed: true, isGuestOpen: true, isFeatured: true, avatarInitials: t('live:iWill'), avatarColor: '#b45309' },
  { id: 'p2', title: t('live:exclusiveWritersInterview'), host: t('live:omarAlfaisal'), category: t('live:literature'), categoryId: 'literature', speakers: 5, listeners: '4.7K', isFollowed: false, isGuestOpen: false, isFeatured: true, avatarInitials: t('live:pardon'), avatarColor: '#7c3aed' },
  { id: 'p3', title: t('live:audioRecordingWorkshop'), host: t('live:lamaAljasser'), category: t('live:technique'), categoryId: 'tech', speakers: 3, listeners: '2.9K', isFollowed: true, isGuestOpen: true, isFeatured: true, avatarInitials: t('live:lodge'), avatarColor: '#0891b2' },
  { id: 'p4', title: t('live:deepPhilosophicalDiscussion'), host: t('live:karimNasr'), category: t('live:toThink'), categoryId: 'philosophy', speakers: 6, listeners: '1.8K', isFollowed: false, isGuestOpen: true, avatarInitials: t('live:be'), avatarColor: '#059669' },
  { id: 'p5', title: t('live:classicPoetryNight'), host: t('live:reemAlsultan'), category: t('live:filters.category.poetry'), categoryId: 'poetry', speakers: 4, listeners: '3.2K', isFollowed: true, isGuestOpen: false, avatarInitials: t('live:juice'), avatarColor: '#be185d' },
  { id: 'p6', title: t('live:studioPlusLiveRecording'), host: t('live:faresAlotaibi'), category: t('live:filters.category.music'), categoryId: 'music', speakers: 2, listeners: '5.1K', isFollowed: false, isGuestOpen: false, avatarInitials: t('live:fa'), avatarColor: '#d97706' },
];

const getPlusStatusOptions = (t: TFunction): FilterOption[] => [
  { value: 'live_now',   label: t('filters.status.live_now') },
  { value: 'guest_open', label: t('filters.status.guest_open') },
  { value: 'following',  label: t('filters.status.following') },
  { value: 'exclusive',  label: t('filters.status.exclusive') },
];

const getPlusCategoryOptions = (t: TFunction): FilterOption[] => [
  { value: 'creative',    label: t('filters.category.creative') },
  { value: 'literature',  label: t('filters.category.literature') },
  { value: 'tech',        label: t('filters.category.tech') },
  { value: 'philosophy',  label: t('filters.category.philosophy') },
  { value: 'poetry',      label: t('filters.category.poetry') },
  { value: 'music',       label: t('filters.category.music') },
];

const getPlusCountryOptions = (t: TFunction): FilterOption[] => [
  { value: 'sa',   label: t('filters.country.sa') },
  { value: 'eg',   label: t('filters.country.eg') },
  { value: 'ae',   label: t('filters.country.ae') },
  { value: 'kw',   label: t('filters.country.kw') },
  { value: 'jo',   label: t('filters.country.jo') },
  { value: 'intl', label: t('filters.country.intl') },
];

const getPlusSortOptions = (t: TFunction): FilterOption[] => [
  { value: 'newest',      label: t('filters.sort.newest') },
  { value: 'most_heard',  label: t('filters.sort.most_heard') },
  { value: 'exclusive',   label: t('filters.sort.exclusive') },
  { value: 'following',   label: t('filters.sort.following') },
  { value: 'top_rated',   label: t('filters.sort.top_rated') },
];

// Radio static data
interface RadioStation {
  id: string;
  name: string;
  program: string;
  category: string;
  categoryId: string;
  country: string;
  countryId: string;
  listeners: string;
  isLive: boolean;
  isSaved?: boolean;
  isFollowed?: boolean;
  avatarInitials: string;
  avatarColor: string;
  onAirStatus: 'live' | 'recorded' | 'upcoming';
  nextProgram?: string;
  nextTime?: string;
}

const getRadioCategoryOptions = (t: TFunction): FilterOption[] => [
  { value: 'news',     label: t('filters.category.news') },
  { value: 'culture',  label: t('filters.category.culture') },
  { value: 'quran',    label: t('filters.category.quran') },
  { value: 'music',    label: t('filters.category.music') },
  { value: 'sports',   label: t('filters.category.sports') },
  { value: 'stories',  label: t('filters.category.radio_stories') },
  { value: 'podcast',  label: t('filters.category.radio_podcast') },
  { value: 'kids',     label: t('filters.category.kids') },
];

const getRadioCountryOptions = (t: TFunction): FilterOption[] => [
  { value: 'sa',  label: t('filters.country.sa') },
  { value: 'eg',  label: t('filters.country.eg') },
  { value: 'ae',  label: t('filters.country.ae') },
  { value: 'kw',  label: t('filters.country.kw') },
  { value: 'jo',  label: t('filters.country.jo') },
  { value: 'ma',  label: t('filters.country.ma') },
  { value: 'intl', label: t('filters.country.radio_intl') },
];

const getRadioStatusOptions = (t: TFunction): FilterOption[] => [
  { value: 'live',     label: t('filters.status.live') },
  { value: 'recorded', label: t('filters.status.recorded') },
  { value: 'upcoming', label: t('filters.status.upcoming') },
];

const getRadioSortOptions = (t: TFunction): FilterOption[] => [
  { value: 'most_listened', label: t('filters.sort.most_listened') },
  { value: 'on_air',        label: t('filters.sort.on_air') },
  { value: 'nearest',       label: t('filters.sort.nearest') },
  { value: 'newest',        label: t('filters.sort.radio_newest') },
  { value: 'most_followed', label: t('filters.sort.most_followed') },
  { value: 'upcoming',      label: t('filters.sort.upcoming') },
];

const getRADIO_STATIONS = (t: any): RadioStation[]  => [
  { id: 'r1', name: t('live:voiceOfArabsRadio'), program: t('live:eveningStories'), category: t('live:culture'), categoryId: 'culture', country: t('live:egypt'), countryId: 'eg', listeners: '18K', isLive: true, isSaved: true, isFollowed: true, avatarInitials: t('live:saa'), avatarColor: '#7c3aed', onAirStatus: 'live', nextProgram: t('live:eveningNews'), nextTime: '21:00' },
  { id: 'r2', name: t('live:holyQuranRadio'), program: t('live:morningRecitations'), category: t('live:theQuran'), categoryId: 'quran', country: t('live:saudiArabia'), countryId: 'sa', listeners: '120K', isLive: true, isSaved: false, isFollowed: true, avatarInitials: t('live:cc'), avatarColor: '#059669', onAirStatus: 'live', nextProgram: t('live:heStudiedJurisprudence'), nextTime: '08:00' },
  { id: 'r3', name: t('live:riyadhWave'), program: t('live:periodicAnalysis'), category: t('live:sports'), categoryId: 'sports', country: t('live:saudiArabia'), countryId: 'sa', listeners: '42K', isLive: false, isSaved: false, isFollowed: false, avatarInitials: t('live:die'), avatarColor: '#0891b2', onAirStatus: 'recorded', nextProgram: t('live:sportsNews'), nextTime: '18:00' },
  { id: 'r4', name: t('live:radioStories'), program: t('live:oneThousandAndOneNights'), category: t('live:tales'), categoryId: 'stories', country: t('live:jordan'), countryId: 'jo', listeners: '5.2K', isLive: false, isSaved: true, isFollowed: false, avatarInitials: t('live:reh'), avatarColor: '#be185d', onAirStatus: 'recorded' },
  { id: 'r5', name: t('live:nightsOfRapture'), program: t('live:calthosomes'), category: t('live:filters.category.music'), categoryId: 'music', country: t('live:egypt'), countryId: 'eg', listeners: '15K', isLive: true, isSaved: false, isFollowed: true, avatarInitials: t('live:lat'), avatarColor: '#d97706', onAirStatus: 'live', nextProgram: t('live:fayrouziyat'), nextTime: '22:00' },
  { id: 'r6', name: t('live:roadRadio'), program: t('live:trafficCondition'), category: t('live:news'), categoryId: 'news', country: t('live:theUae'), countryId: 'ae', listeners: '25K', isLive: true, isSaved: false, isFollowed: false, avatarInitials: t('live:blood'), avatarColor: '#1d4ed8', onAirStatus: 'live' },
  { id: 'r7', name: t('live:kidsFm'), program: t('live:littleStories'), category: t('live:children'), categoryId: 'kids', country: t('live:saudiArabia'), countryId: 'sa', listeners: '8K', isLive: false, isSaved: false, isFollowed: false, avatarInitials: t('live:af'), avatarColor: '#9333ea', onAirStatus: 'upcoming', nextProgram: t('live:littleStories'), nextTime: '16:00' },
  { id: 'r8', name: t('live:eveningTalk'), program: t('live:openDialogue'), category: t('live:culture'), categoryId: 'culture', country: t('live:kuwait'), countryId: 'kw', listeners: '3.5K', isLive: false, isSaved: true, isFollowed: true, avatarInitials: t('live:fatherinlaw'), avatarColor: '#0891b2', onAirStatus: 'recorded' },
];

// ─── Avatar (initials-based, no emoji) ───────────────────────────────────────

function RoomAvatar({
  initials,
  color,
  animated,
}: {
  initials: string;
  color: string;
  animated?: boolean;
}) {
  return (
    <div className="room-avatar" style={{ '--avatar-color': color } as React.CSSProperties}>
      <span className="room-avatar__initials">{initials}</span>
      {animated && (
        <div className="room-avatar__waveform" aria-hidden="true">
          <div className="room-avatar__wave-bar" />
          <div className="room-avatar__wave-bar" />
          <div className="room-avatar__wave-bar" />
          <div className="room-avatar__wave-bar" />
        </div>
      )}
    </div>
  );
}

// ─── Room row card ────────────────────────────────────────────────────────────

function RoomRow({ room, t }: { room: LiveRoom; t: TFunction }) {
  return (
    <article className="room-row" aria-label={room.title}>
      <RoomAvatar
        initials={room.avatarInitials}
        color={room.avatarColor}
        animated
      />
      <div className="room-row__info">
        <p className="room-row__title">{room.title}</p>
        <p className="room-row__meta">{room.host} · {room.category}</p>
        <div className="room-row__stats">
          <span className="room-row__stat">
            <svg className="room-row__stat-icon" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" />
            </svg>
            {room.speakers} {t('meta.speakers')}
          </span>
          <span className="room-row__stat room-row__stat--listeners">
            <svg className="room-row__stat-icon" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217z" clipRule="evenodd" />
            </svg>
            {room.listeners}
          </span>
          {room.isGuestOpen && (
            <span className="room-row__badge room-row__badge--guest">{t('badges.guestRequest')}</span>
          )}
        </div>
      </div>
      <button className="room-row__join-btn" aria-label={`${t('actions.join')} ${room.title}`}>
        {t('actions.join')}
      </button>
    </article>
  );
}

// ─── Featured carousel card (full hero structure) ─────────────────────────────

function FeaturedCard({ room, plusMode, t }: { room: LiveRoom; plusMode?: boolean; t: TFunction }) {
  return (
    <div className="live-feat-card" aria-label={`${t('sections.featuredRooms')}: ${room.title}`}>
      {/* Live pulse badge */}
      <div className={`live-hero__badge${plusMode ? ' live-hero__badge--plus' : ''}`} aria-live="polite">
        <span className="live-hero__pulse" aria-hidden="true" />
        {plusMode ? t('badges.plusLive') : t('badges.live')}
      </div>

      {/* Category tag — absolute positioned inside the card */}
      <span className="live-hero__category">{room.category}</span>

      {/* Main body */}
      <div className="live-hero__body">
        <RoomAvatar initials={room.avatarInitials} color={room.avatarColor} animated />
        <div className="live-hero__text">
          <h2 className="live-hero__title">{room.title}</h2>
          <p className="live-hero__host">{room.host}</p>
          <div className="live-hero__meta">
            <span className="live-hero__meta-item">
              <svg className="live-hero__meta-icon" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
              </svg>
              {room.speakers} {t('meta.speakers')}
            </span>
            <span className="live-hero__meta-item live-hero__meta-item--cyan">
              <svg className="live-hero__meta-icon" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217z" clipRule="evenodd" />
              </svg>
              {room.listeners} {t('meta.listeners')}
            </span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="live-hero__actions">
        <button className="live-hero__join-btn" aria-label={`${t('actions.join')} ${room.title}`}>
          {t('actions.join')}
        </button>
        {room.isGuestOpen && (
          <button className="live-hero__guest-btn" aria-label={t('actions.guestRequestAria')}>
            {t('actions.guestRequest')}
          </button>
        )}
        <button className="live-hero__preview-btn" aria-label={t('actions.previewAria')}>
          {t('actions.preview')}
        </button>
      </div>
    </div>
  );
}

// ─── Featured carousel ────────────────────────────────────────────────────────

function FeaturedCarousel({ rooms, plusMode, t }: { rooms: LiveRoom[]; plusMode?: boolean; t: TFunction }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const scroll = (dir: 'prev' | 'next') => {
    const el = trackRef.current;
    if (!el) return;
    el.scrollBy({ left: dir === 'next' ? -280 : 280, behavior: 'smooth' });
  };
  if (rooms.length === 0) return null;
  return (
    <section className={`live-carousel${plusMode ? ' live-carousel--plus' : ''}`} aria-label={t('sections.featuredRooms')}>
      <div className="live-section__header" style={{ padding: '0 1rem' }}>
        <h2 className="live-section__title">
          {t('sections.featuredRooms')}
          {plusMode && <span className="live-section__plus-badge">{t('badges.plus')}</span>}
        </h2>
        <div className="live-carousel__nav" aria-label={t('sections.featuredRooms')}>
          <button className="live-carousel__btn" onClick={() => scroll('prev')} aria-label={t('actions.prev')}>
            <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16"><path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" /></svg>
          </button>
          <button className="live-carousel__btn" onClick={() => scroll('next')} aria-label={t('actions.next')}>
            <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16"><path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
          </button>
        </div>
      </div>
      <div className="live-carousel__track" ref={trackRef}>
        {rooms.map((room) => (
          <FeaturedCard key={room.id} room={room} plusMode={plusMode} t={t} />
        ))}
      </div>
    </section>
  );
}

// ─── Sponsor / ad block ───────────────────────────────────────────────────────

function SponsorBlock({ t }: { t: TFunction }) {
  return (
    <div className="live-sponsor" role="complementary" aria-label={t('sponsors.tagSponsorship')}>
      <span className="live-sponsor__tag">{t('sponsors.tagSponsorship')}</span>
      <div className="live-sponsor__body">
        <div className="live-sponsor__icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15v-4H7l5-8v4h4l-5 8z" />
          </svg>
        </div>
        <div className="live-sponsor__text">
          <p className="live-sponsor__name">{t('sponsors.proName')}</p>
          <p className="live-sponsor__desc">{t('sponsors.proDesc')}</p>
        </div>
      </div>
      <button className="live-sponsor__cta" aria-label={t('sponsors.proName')}>{t('sponsors.proAction')}</button>
    </div>
  );
}

// ─── General Live ─────────────────────────────────────────────────────────────

function GeneralLive({ t }: { t: TFunction }) {
  const [searchQuery, setSearchQuery]     = useState<string>('');
  const [selStatuses, setSelStatuses]     = useState<string[]>([]);
  const [selCategories, setSelCategories] = useState<string[]>([]);
  const [selCountries, setSelCountries]   = useState<string[]>([]);
  const [selSorts, setSelSorts]           = useState<string[]>([]);

  const toggleStatus   = useCallback((v: string) => setSelStatuses(p   => p.includes(v) ? p.filter(x => x !== v) : [...p, v]), []);
  const toggleCategory = useCallback((v: string) => setSelCategories(p => p.includes(v) ? p.filter(x => x !== v) : [...p, v]), []);
  const toggleCountry  = useCallback((v: string) => setSelCountries(p  => p.includes(v) ? p.filter(x => x !== v) : [...p, v]), []);
  const toggleSort     = useCallback((v: string) => setSelSorts(p      => p.includes(v) ? p.filter(x => x !== v) : [...p, v]), []);

  const genStatusOptions = useMemo(() => getGenStatusOptions(t), [t]);
  const genCategoryOptions = useMemo(() => getGenCategoryOptions(t), [t]);
  const genCountryOptions = useMemo(() => getGenCountryOptions(t), [t]);
  const genSortOptions = useMemo(() => getGenSortOptions(t), [t]);

  // Derived lists
  const q = searchQuery.trim().toLowerCase();
  const rooms = getGENERAL_ROOMS(t).filter((r) => {
    const statOk   = selStatuses.length === 0   || (selStatuses.includes('live_now') && true) || (selStatuses.includes('guest_open') ? r.isGuestOpen : false) || (selStatuses.includes('following') ? r.isFollowed : false);
    const catOk    = selCategories.length === 0 || selCategories.includes(r.categoryId);
    const searchOk = !q ||
      r.title.toLowerCase().includes(q) ||
      r.host.toLowerCase().includes(q) ||
      r.category.toLowerCase().includes(q);
    const rawStatOk = selStatuses.length === 0 || selStatuses.some(s =>
      s === 'live_now'   ? true :
      s === 'guest_open' ? r.isGuestOpen :
      s === 'following'  ? r.isFollowed :
      true
    );
    return rawStatOk && catOk && searchOk;
  });

  const featuredRoom = rooms.find((r) => r.isFeatured) ?? rooms[0];
  const activeRooms = rooms.filter((r) => r.id !== featuredRoom?.id);
  const followedRooms = rooms.filter((r) => r.isFollowed && r.id !== featuredRoom?.id);
  const guestRooms = rooms.filter((r) => r.isGuestOpen && r.id !== featuredRoom?.id);

  return (
    <>
      {/* ── Search bar ── */}
      <div className="live-search-wrap">
        <div className="live-search">
          <svg className="live-search__icon" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" width="16" height="16">
            <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
          </svg>
          <input
            id="live-search-input"
            className="live-search__input"
            type="search"
           
            placeholder={t('search.general.placeholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label={t('search.general.ariaLabel')}
            autoComplete="off"
          />
          {searchQuery && (
            <button
              className="live-search__clear"
              onClick={() => setSearchQuery('')}
              aria-label={t('search.clearAria')}
            >✕</button>
          )}
        </div>
      </div>

      {/* ── Filter area (centered, safe padding) ── */}
      <div className="live-filter-area">
        {/* Filter row */}
        <div className="live-filters" role="group" aria-label={t('search.general.ariaLabel')}>
          <FilterDropdown label={t('filters.status.label')}   options={genStatusOptions}   values={selStatuses}   onToggle={toggleStatus}   onClear={() => setSelStatuses([])}   ariaLabel={t('filters.status.ariaLabel')} />
          <FilterDropdown label={t('filters.category.label')}  options={genCategoryOptions} values={selCategories} onToggle={toggleCategory} onClear={() => setSelCategories([])} ariaLabel={t('filters.category.ariaLabel')} />
          <FilterDropdown label={t('filters.country.label')}    options={genCountryOptions}  values={selCountries}  onToggle={toggleCountry}  onClear={() => setSelCountries([])}  ariaLabel={t('filters.country.ariaLabel')} />
          <FilterDropdown label={t('filters.sort.label')}  options={genSortOptions}     values={selSorts}      onToggle={toggleSort}     onClear={() => setSelSorts([])}     ariaLabel={t('filters.sort.ariaLabel')} />
        </div>

        {/* Selected chip tags */}
        <SelectedChips
          groups={[
            { filterId: 'gen-stat',  options: genStatusOptions,   values: selStatuses,   onRemove: toggleStatus },
            { filterId: 'gen-cat',   options: genCategoryOptions, values: selCategories, onRemove: toggleCategory },
            { filterId: 'gen-ctry',  options: genCountryOptions,  values: selCountries,  onRemove: toggleCountry },
            { filterId: 'gen-sort',  options: genSortOptions,     values: selSorts,      onRemove: toggleSort },
          ]}
        />

        {/* Browse-categories subpage button — always visible under chips */}
        <button
          className="fd-subpage-btn live-browse-btn"
          aria-label={t('actions.browseCategories')}
          onClick={() => { /* navigate to categories subpage */ }}
        >
          <svg width="13" height="13" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zm0 8a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zm6-6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zm0 8a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
          </svg>
          {t('actions.browseCategories')}
        </button>
      </div>

      {/* ── Featured carousel ── */}
      <FeaturedCarousel rooms={rooms.filter((r) => r.isFeatured)} t={t} />

      {/* ── Sponsor block ── */}
      <SponsorBlock t={t} />

      {/* ── Create Live CTA ── */}
      <div className="live-create-cta" role="region" aria-label={t('createCTA.generalTitle')}>
        <div className="live-create-cta__icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="currentColor" width="28" height="28">
            <path d="M12 2a4 4 0 100 8 4 4 0 000-8zm0 10c-4.418 0-8 1.79-8 4v2h16v-2c0-2.21-3.582-4-8-4z" />
            <path d="M19 3h-2v2h-2v2h2v2h2V7h2V5h-2z" />
          </svg>
        </div>
        <div className="live-create-cta__text">
          <p className="live-create-cta__label">
            {t('createCTA.generalTitle')}
            <span className="live-create-cta__eligibility">{t('createCTA.eligibility')}</span>
          </p>
          <p className="live-create-cta__hint">{t('createCTA.generalHint')}</p>
        </div>
        <button className="live-create-cta__btn" aria-label={t('createCTA.generalTitle')}>
          {t('actions.create')}
        </button>
      </div>

      {/* ── Active rooms ── */}
      {activeRooms.length > 0 && (
        <section aria-labelledby="active-rooms-heading" className="live-section">
          <div className="live-section__header">
            <h2 id="active-rooms-heading" className="live-section__title">{t('sections.activeRooms')}</h2>
            <button className="live-section__see-all" aria-label={t('actions.seeAll')}>
              {t('actions.seeAll')}
            </button>
          </div>
          <div className="room-list">
            {activeRooms.map((room) => (
              <RoomRow key={room.id} room={room} t={t} />
            ))}
          </div>
        </section>
      )}

      {/* ── From following ── */}
      {followedRooms.length > 0 && (
        <section aria-labelledby="following-rooms-heading" className="live-section">
          <div className="live-section__header">
            <h2 id="following-rooms-heading" className="live-section__title">{t('sections.followingRooms')}</h2>
          </div>
          <div className="room-list">
            {followedRooms.map((room) => (
              <RoomRow key={room.id} room={room} t={t} />
            ))}
          </div>
        </section>
      )}

      {/* ── Open for guest requests ── */}
      {guestRooms.length > 0 && (
        <section aria-labelledby="guest-rooms-heading" className="live-section">
          <div className="live-section__header">
            <h2 id="guest-rooms-heading" className="live-section__title">{t('sections.guestOpenRooms')}</h2>
          </div>
          <div className="room-list">
            {guestRooms.map((room) => (
              <RoomRow key={room.id} room={room} t={t} />
            ))}
          </div>
        </section>
      )}

      {/* ── Empty state when filters yield nothing ── */}
      {rooms.length === 0 && (
        <div className="live-empty" role="status">
          <p>{t('emptyStates.noGeneralRooms')}</p>
          <button
            className="live-empty__reset"
            onClick={() => { setSelStatuses([]); setSelCategories([]); setSelCountries([]); setSelSorts([]); }}
          >
            {t('actions.reset')}
          </button>
        </div>
      )}

      {/* ── Footer note ── */}
      <p className="live-footer-note">
        {t('footerNotes.general')}
      </p>
    </>
  );
}

// ─── Plus Live ────────────────────────────────────────────────────────────────
// Shares identical page structure with GeneralLive.
// Differentiated by: Plus room data · gold accent · permission-gated create CTA.
// Replace `hasCreatePermission` with real auth/subscription check when wired.

function PlusSponsorBlock({ t }: { t: TFunction }) {
  return (
    <div className="live-sponsor live-sponsor--plus" role="complementary" aria-label={t('sponsors.tagPlus')}>
      <span className="live-sponsor__tag">{t('sponsors.tagPlus')}</span>
      <div className="live-sponsor__body">
        <div className="live-sponsor__icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
        </div>
        <div className="live-sponsor__text">
          <p className="live-sponsor__name">{t('sponsors.plusName')}</p>
          <p className="live-sponsor__desc">{t('sponsors.plusDesc')}</p>
        </div>
      </div>
      <button className="live-sponsor__cta live-sponsor__cta--plus" aria-label={t('sponsors.plusName')}>{t('actions.subscribe')}</button>
    </div>
  );
}

function PlusCreateCTA({ hasPermission, t }: { hasPermission: boolean; t: TFunction }) {
  if (hasPermission) {
    return (
      <div className="live-create-cta live-create-cta--plus" role="region" aria-label={t('createCTA.plusTitle')}>
        <div className="live-create-cta__icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="currentColor" width="28" height="28">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            <path d="M19 3h-2v2h-2v2h2v2h2V7h2V5h-2z" />
          </svg>
        </div>
        <div className="live-create-cta__text">
          <p className="live-create-cta__label">
            {t('createCTA.plusTitle')}
            <span className="live-create-cta__eligibility live-create-cta__eligibility--plus">{t('createCTA.plusSubscriber')}</span>
          </p>
          <p className="live-create-cta__hint">{t('createCTA.plusHint')}</p>
        </div>
        <button className="live-create-cta__btn live-create-cta__btn--plus" aria-label={t('createCTA.plusTitle')}>
          {t('actions.create')}
        </button>
      </div>
    );
  }
  // No permission — show upgrade gate in same CTA block shape
  return (
    <div className="live-create-cta live-create-cta--locked" role="region" aria-label={t('createCTA.plusLockedTitle')}>
      <div className="live-create-cta__icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="currentColor" width="28" height="28">
          <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" />
        </svg>
      </div>
      <div className="live-create-cta__text">
        <p className="live-create-cta__label">{t('createCTA.plusLockedTitle')}</p>
        <p className="live-create-cta__hint">{t('createCTA.plusLockedHint')}</p>
      </div>
      <button className="live-create-cta__btn live-create-cta__btn--upgrade" aria-label={t('actions.upgrade')}>
        {t('actions.upgrade')}
      </button>
    </div>
  );
}

function PlusLive({ t }: { t: TFunction }) {
  // TODO: replace with real auth/subscription selector
  const hasCreatePermission = false;

  const [searchQuery, setSearchQuery]     = useState<string>('');
  const [selStatuses, setSelStatuses]     = useState<string[]>([]);
  const [selCategories, setSelCategories] = useState<string[]>([]);
  const [selCountries, setSelCountries]   = useState<string[]>([]);
  const [selSorts, setSelSorts]           = useState<string[]>([]);

  const toggleStatus   = useCallback((v: string) => setSelStatuses(p   => p.includes(v) ? p.filter(x => x !== v) : [...p, v]), []);
  const toggleCategory = useCallback((v: string) => setSelCategories(p => p.includes(v) ? p.filter(x => x !== v) : [...p, v]), []);
  const toggleCountry  = useCallback((v: string) => setSelCountries(p  => p.includes(v) ? p.filter(x => x !== v) : [...p, v]), []);
  const toggleSort     = useCallback((v: string) => setSelSorts(p      => p.includes(v) ? p.filter(x => x !== v) : [...p, v]), []);

  const plusStatusOptions = useMemo(() => getPlusStatusOptions(t), [t]);
  const plusCategoryOptions = useMemo(() => getPlusCategoryOptions(t), [t]);
  const plusCountryOptions = useMemo(() => getPlusCountryOptions(t), [t]);
  const plusSortOptions = useMemo(() => getPlusSortOptions(t), [t]);

  const q = searchQuery.trim().toLowerCase();
  const rooms = getPLUS_ROOMS(t).filter((r) => {
    const statOk   = selStatuses.length === 0 || selStatuses.some(s =>
      s === 'live_now'   ? true :
      s === 'guest_open' ? r.isGuestOpen :
      s === 'following'  ? r.isFollowed :
      true
    );
    const catOk    = selCategories.length === 0 || selCategories.includes(r.categoryId);
    const searchOk = !q ||
      r.title.toLowerCase().includes(q) ||
      r.host.toLowerCase().includes(q) ||
      r.category.toLowerCase().includes(q);
    return statOk && catOk && searchOk;
  });

  const featuredRooms = rooms.filter((r) => r.isFeatured);
  const featuredFirst = featuredRooms[0] ?? rooms[0];
  const activeRooms   = rooms.filter((r) => r.id !== featuredFirst?.id);
  const followedRooms = rooms.filter((r) => r.isFollowed && r.id !== featuredFirst?.id);
  const guestRooms    = rooms.filter((r) => r.isGuestOpen && r.id !== featuredFirst?.id);

  return (
    <>
      {/* ── Search bar ── */}
      <div className="live-search-wrap">
        <div className="live-search live-search--plus">
          <svg className="live-search__icon" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" width="16" height="16">
            <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
          </svg>
          <input
            id="plus-live-search-input"
            className="live-search__input"
            type="search"
           
            placeholder={t('search.plus.placeholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label={t('search.plus.ariaLabel')}
            autoComplete="off"
          />
          {searchQuery && (
            <button className="live-search__clear" onClick={() => setSearchQuery('')} aria-label={t('search.clearAria')}>✕</button>
          )}
        </div>
      </div>

      {/* ── Filter area ── */}
      <div className="live-filter-area">
        <div className="live-filters" role="group" aria-label={t('search.plus.ariaLabel')}>
          <FilterDropdown label={t('filters.status.label')}  options={plusStatusOptions}   values={selStatuses}   onToggle={toggleStatus}   onClear={() => setSelStatuses([])}   ariaLabel={t('filters.status.ariaLabel')} />
          <FilterDropdown label={t('filters.category.label')} options={plusCategoryOptions} values={selCategories} onToggle={toggleCategory} onClear={() => setSelCategories([])} ariaLabel={t('filters.category.ariaLabel')} />
          <FilterDropdown label={t('filters.country.label')}   options={plusCountryOptions}  values={selCountries}  onToggle={toggleCountry}  onClear={() => setSelCountries([])}  ariaLabel={t('filters.country.ariaLabel')} />
          <FilterDropdown label={t('filters.sort.label')} options={plusSortOptions}     values={selSorts}      onToggle={toggleSort}     onClear={() => setSelSorts([])}     ariaLabel={t('filters.sort.ariaLabel')} />
        </div>
        <SelectedChips
          groups={[
            { filterId: 'plus-stat', options: plusStatusOptions,   values: selStatuses,   onRemove: toggleStatus },
            { filterId: 'plus-cat',  options: plusCategoryOptions, values: selCategories, onRemove: toggleCategory },
            { filterId: 'plus-ctry', options: plusCountryOptions,  values: selCountries,  onRemove: toggleCountry },
            { filterId: 'plus-sort', options: plusSortOptions,     values: selSorts,      onRemove: toggleSort },
          ]}
        />
        <button
          className="fd-subpage-btn live-browse-btn"
          aria-label={t('actions.browseCategories')}
          onClick={() => {}}
        >
          <svg width="13" height="13" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zm0 8a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zm6-6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zm0 8a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
          </svg>
          {t('actions.browseCategories')}
        </button>
      </div>

      {/* ── Featured carousel ── */}
      <FeaturedCarousel rooms={featuredRooms} plusMode t={t} />

      {/* ── Plus sponsor block ── */}
      <PlusSponsorBlock t={t} />

      {/* ── Create / access CTA ── */}
      <PlusCreateCTA hasPermission={hasCreatePermission} t={t} />

      {/* ── Active Plus rooms ── */}
      {activeRooms.length > 0 && (
        <section aria-labelledby="plus-active-heading" className="live-section">
          <div className="live-section__header">
            <h2 id="plus-active-heading" className="live-section__title">
              {t('sections.plusActiveRooms')}
              <span className="live-section__plus-badge">{t('badges.plus')}</span>
            </h2>
            <button className="live-section__see-all" aria-label={t('actions.seeAll')}>{t('actions.seeAll')}</button>
          </div>
          <div className="room-list">
            {activeRooms.map((room) => <RoomRow key={room.id} room={room} t={t} />)}
          </div>
        </section>
      )}

      {/* ── From following ── */}
      {followedRooms.length > 0 && (
        <section aria-labelledby="plus-following-heading" className="live-section">
          <div className="live-section__header">
            <h2 id="plus-following-heading" className="live-section__title">{t('sections.plusFollowingRooms')}</h2>
          </div>
          <div className="room-list">
            {followedRooms.map((room) => <RoomRow key={room.id} room={room} t={t} />)}
          </div>
        </section>
      )}

      {/* ── Open for guest requests ── */}
      {guestRooms.length > 0 && (
        <section aria-labelledby="plus-guest-heading" className="live-section">
          <div className="live-section__header">
            <h2 id="plus-guest-heading" className="live-section__title">{t('sections.guestOpenRooms')}</h2>
          </div>
          <div className="room-list">
            {guestRooms.map((room) => <RoomRow key={room.id} room={room} t={t} />)}
          </div>
        </section>
      )}

      {/* ── Empty state ── */}
      {rooms.length === 0 && (
        <div className="live-empty" role="status">
          <p>{t('emptyStates.noPlusRooms')}</p>
          <button className="live-empty__reset" onClick={() => { setSelStatuses([]); setSelCategories([]); setSelCountries([]); setSelSorts([]); }}>
            {t('actions.reset')}
          </button>
        </div>
      )}

      <p className="live-footer-note">
        {t('footerNotes.plus')}
      </p>
    </>
  );
}

// ─── Music Live (next phase) ──────────────────────────────────────────────────

function MusicLive({ t }: { t: TFunction }) {
  return (
    <div className="live-coming-soon" role="status">
      <p className="live-coming-soon__title">{t('comingSoon.musicTitle')}</p>
      <p className="live-coming-soon__hint">{t('comingSoon.musicHint')}</p>
    </div>
  );
}

// ─── Radio station card (hero-style for on-air carousel) ─────────────────────

function RadioHeroCard({ station, t }: { station: RadioStation; t: TFunction }) {
  return (
    <div className="radio-hero-card" aria-label={`${station.name} — ${station.program}`}>
      {/* On-air badge */}
      {station.isLive ? (
        <div className="live-hero__badge radio-hero__badge--live" aria-live="polite">
          <span className="live-hero__pulse" aria-hidden="true" />
          {t('badges.onAir')}
        </div>
      ) : station.onAirStatus === 'upcoming' ? (
        <div className="radio-hero__badge--upcoming">{t('badges.upcoming')} {station.nextTime}</div>
      ) : (
        <div className="radio-hero__badge--recorded">{t('badges.recorded')}</div>
      )}

      <span className="live-hero__category">{station.category}</span>

      <div className="live-hero__body">
        <RoomAvatar initials={station.avatarInitials} color={station.avatarColor} animated={station.isLive} />
        <div className="live-hero__text">
          <h2 className="live-hero__title">{station.name}</h2>
          <p className="radio-hero__program">{station.program}</p>
          <div className="live-hero__meta">
            <span className="live-hero__meta-item">
              <svg className="live-hero__meta-icon" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217z" clipRule="evenodd" />
              </svg>
              {station.listeners} {t('meta.listeners')}
            </span>
            <span className="live-hero__meta-item live-hero__meta-item--cyan">
              {station.country}
            </span>
          </div>
          {station.nextProgram && (
            <p className="radio-hero__next">{t('meta.next')} {station.nextProgram} · {station.nextTime}</p>
          )}
        </div>
      </div>

      <div className="live-hero__actions">
        <button className="radio-hero__listen-btn" aria-label={`${t('actions.listenNow')} ${station.name}`}>
          {station.isLive ? t('actions.listenNow') : t('actions.play')}
        </button>
        <button className="live-hero__preview-btn radio-hero__bookmark-btn" aria-label={t('actions.saveAria')}>
          {station.isSaved ? t('actions.saved') : t('actions.save')}
        </button>
      </div>
    </div>
  );
}

// ─── Radio station list row ───────────────────────────────────────────────────

function RadioStationRow({ station, t }: { station: RadioStation; t: TFunction }) {
  return (
    <article className="radio-station-row" aria-label={station.name}>
      <div className="radio-station-row__logo" style={{ '--avatar-color': station.avatarColor } as React.CSSProperties}>
        <span className="radio-station-row__initials">{station.avatarInitials}</span>
        {station.isLive && <span className="radio-station-row__live-dot" aria-hidden="true" />}
      </div>
      <div className="radio-station-row__info">
        <div className="radio-station-row__name-row">
          <span className="radio-station-row__name">{station.name}</span>
          {station.isLive && <span className="radio-station-row__badge">{t('badges.liveEn')}</span>}
        </div>
        <p className="radio-station-row__program">{station.program}</p>
        <p className="radio-station-row__meta">
          {station.category} · {station.country} · {station.listeners} {t('meta.listeners')}
        </p>
      </div>
      <div className="radio-station-row__actions">
        <button className="radio-station-row__action" aria-label={t('actions.save')}>
          <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18">
            <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" />
          </svg>
        </button>
        <button className="radio-station-row__action" aria-label={t('actions.shareAria')}>
          <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18">
            <path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" />
          </svg>
        </button>
      </div>
    </article>
  );
}

// ─── Radio Live ───────────────────────────────────────────────────────────────

function RadioLive({ t }: { t: TFunction }) {
  const [searchQuery, setSearchQuery]     = useState<string>('');
  const [selCategories, setSelCategories] = useState<string[]>([]);
  const [selCountries, setSelCountries]   = useState<string[]>([]);
  const [selStatuses, setSelStatuses]     = useState<string[]>([]);
  const [selSorts, setSelSorts]           = useState<string[]>([]);
  const [myTab, setMyTab]                 = useState<string>('saved');
  const carouselRef = useRef<HTMLDivElement>(null);

  const toggleCat     = useCallback((v: string) => setSelCategories(p => p.includes(v) ? p.filter(x => x !== v) : [...p, v]), []);
  const toggleCountry = useCallback((v: string) => setSelCountries(p => p.includes(v) ? p.filter(x => x !== v) : [...p, v]), []);
  const toggleStatus  = useCallback((v: string) => setSelStatuses(p => p.includes(v) ? p.filter(x => x !== v) : [...p, v]), []);
  const toggleSort    = useCallback((v: string) => setSelSorts(p => p.includes(v) ? p.filter(x => x !== v) : [...p, v]), []);

  const radioCategoryOptions = useMemo(() => getRadioCategoryOptions(t), [t]);
  const radioCountryOptions = useMemo(() => getRadioCountryOptions(t), [t]);
  const radioStatusOptions = useMemo(() => getRadioStatusOptions(t), [t]);
  const radioSortOptions = useMemo(() => getRadioSortOptions(t), [t]);

  const MY_STATION_TABS = useMemo(() => [
    { id: 'saved',    label: t('sections.radioTabs.saved') },
    { id: 'followed', label: t('sections.radioTabs.followed') },
    { id: 'popular',  label: t('sections.radioTabs.popular') },
  ], [t]);

  const q = searchQuery.trim().toLowerCase();
  const filtered = getRADIO_STATIONS(t).filter(s => {
    const catOk    = selCategories.length === 0 || selCategories.includes(s.categoryId);
    const ctryOk   = selCountries.length === 0  || selCountries.includes(s.countryId);
    const statOk   = selStatuses.length === 0   || selStatuses.includes(s.onAirStatus);
    const searchOk = !q || s.name.toLowerCase().includes(q) || s.program.toLowerCase().includes(q) || s.category.toLowerCase().includes(q);
    return catOk && ctryOk && statOk && searchOk;
  });

  const onAirNow  = filtered.filter(s => s.isLive);
  const otherStations = filtered.filter(s => !s.isLive);

  // My-stations derived list
  const myStations = getRADIO_STATIONS(t).filter(s =>
    myTab === 'saved'    ? s.isSaved :
    myTab === 'followed' ? s.isFollowed :
    true
  ).slice(0, 3);

  const scrollCarousel = (dir: 'prev' | 'next') => {
    carouselRef.current?.scrollBy({ left: dir === 'next' ? -300 : 300, behavior: 'smooth' });
  };

  return (
    <>
      {/* ── Search bar ── */}
      <div className="live-search-wrap">
        <div className="live-search live-search--radio">
          <svg className="live-search__icon" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" width="16" height="16">
            <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
          </svg>
          <input
            id="radio-live-search"
            className="live-search__input"
            type="search"
            placeholder={t('search.radio.placeholder')}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            aria-label={t('search.radio.ariaLabel')}
            autoComplete="off"
          />
          {searchQuery && (
            <button className="live-search__clear" onClick={() => setSearchQuery('')} aria-label={t('search.clearAria')}>✕</button>
          )}
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="live-filter-area">
        <div className="live-filters" role="group" aria-label={t('search.radio.ariaLabel')}>
          <FilterDropdown label={t('filters.status.label')}   options={radioStatusOptions}   values={selStatuses}   onToggle={toggleStatus}  onClear={() => setSelStatuses([])}   ariaLabel={t('filters.status.ariaLabel')} />
          <FilterDropdown label={t('filters.category.label')}  options={radioCategoryOptions} values={selCategories} onToggle={toggleCat}     onClear={() => setSelCategories([])} ariaLabel={t('filters.category.ariaLabel')} />
          <FilterDropdown label={t('filters.country.label')}    options={radioCountryOptions}  values={selCountries}  onToggle={toggleCountry} onClear={() => setSelCountries([])}  ariaLabel={t('filters.country.ariaLabel')} />
          <FilterDropdown label={t('filters.sort.label')}  options={radioSortOptions}     values={selSorts}      onToggle={toggleSort}    onClear={() => setSelSorts([])}      ariaLabel={t('filters.sort.ariaLabelRadio')} />
        </div>

        <SelectedChips groups={[
          { filterId: 'rad-stat', options: radioStatusOptions,   values: selStatuses,   onRemove: toggleStatus },
          { filterId: 'rad-cat',  options: radioCategoryOptions, values: selCategories, onRemove: toggleCat },
          { filterId: 'rad-ctry', options: radioCountryOptions,  values: selCountries,  onRemove: toggleCountry },
          { filterId: 'rad-sort', options: radioSortOptions,     values: selSorts,      onRemove: toggleSort },
        ]} />

        <button className="fd-subpage-btn live-browse-btn" aria-label={t('actions.browseCategories')} onClick={() => {}}>
          <svg width="13" height="13" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zm0 8a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zm6-6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zm0 8a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
          </svg>
          {t('actions.browseCategories')}
        </button>
      </div>

      {/* ── On-Air Now carousel ── */}
      {onAirNow.length > 0 && (
        <section className="live-carousel radio-carousel" aria-label={t('sections.onAirNow')}>
          <div className="live-section__header" style={{ padding: '0 1rem' }}>
            <h2 className="live-section__title radio-section__title">
              {t('sections.onAirNow')}
              <span className="radio-on-air-dot" aria-hidden="true" />
            </h2>
            <div className="live-carousel__nav">
              <button className="live-carousel__btn" onClick={() => scrollCarousel('prev')} aria-label={t('actions.prev')}>
                <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16"><path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" /></svg>
              </button>
              <button className="live-carousel__btn" onClick={() => scrollCarousel('next')} aria-label={t('actions.next')}>
                <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16"><path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
              </button>
            </div>
          </div>
          <div className="live-carousel__track" ref={carouselRef}>
            {onAirNow.map(s => <RadioHeroCard key={s.id} station={s} t={t} />)}
          </div>
        </section>
      )}

      {/* ── My Stations ── */}
      <section className="radio-my-stations" aria-label={t('sections.myStations')}>
        <h2 className="live-section__title radio-section__title">{t('sections.myStations')}</h2>
        <div className="radio-my-tabs" role="tablist">
          {MY_STATION_TABS.map(tab => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={myTab === tab.id}
              className={`radio-my-tab${myTab === tab.id ? ' radio-my-tab--active' : ''}`}
              onClick={() => setMyTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
        {myStations.length > 0 ? (
          <div className="radio-station-list">
            {myStations.map(s => <RadioStationRow key={s.id} station={s} t={t} />)}
          </div>
        ) : (
          <p className="radio-my-empty">{t('emptyStates.noMyStations')}</p>
        )}
      </section>

      {/* ── All stations ── */}
      {otherStations.length > 0 && (
        <section aria-labelledby="all-stations-heading" className="live-section">
          <div className="live-section__header">
            <h2 id="all-stations-heading" className="live-section__title radio-section__title">{t('sections.allStations')}</h2>
            <button className="live-section__see-all">{t('actions.seeAll')}</button>
          </div>
          <div className="radio-station-list">
            {otherStations.map(s => <RadioStationRow key={s.id} station={s} t={t} />)}
          </div>
        </section>
      )}

      {/* ── Empty state ── */}
      {filtered.length === 0 && (
        <div className="live-empty" role="status">
          <p>{t('emptyStates.noRadioStations')}</p>
          <button className="live-empty__reset" onClick={() => { setSelCategories([]); setSelCountries([]); setSelStatuses([]); setSearchQuery(''); }}>
            {t('actions.reset')}
          </button>
        </div>
      )}

      {/* ── Request station CTA ── */}
      <div className="radio-request-cta" role="complementary" aria-label={t('sponsors.radioTitle')}>
        <div className="radio-request-cta__icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="currentColor" width="32" height="32">
            <path d="M3.24 6.15C2.51 6.43 2 7.17 2 8v12c0 1.1.89 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2H8.3l8.26-3.34L15.88 1 3.24 6.15zM12 19c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3z" />
          </svg>
        </div>
        <div className="radio-request-cta__text">
          <p className="radio-request-cta__title">{t('sponsors.radioTitle')}</p>
          <p className="radio-request-cta__hint">{t('sponsors.radioHint')}</p>
        </div>
        <button className="radio-request-cta__btn" aria-label={t('sponsors.radioTitle')}>{t('sponsors.radioAction')}</button>
      </div>

      <p className="live-footer-note">
        {t('footerNotes.radio')}
      </p>
    </>
  );
}

// ─── Tournaments stub removed — now routed to TournamentsLivePage ─────────────

// ─── Page ─────────────────────────────────────────────────────────────────────

export function LivePage() {  const { world } = useWorldNav();
  const { t } = useTranslation(['live', 'home']);

  const metaMap: Record<string, { title: string; subtitle: string }> = {
    general:     { title: t('worldMeta.general.title'),       subtitle: t('worldMeta.general.subtitle') },
    plus:        { title: t('worldMeta.plus.title'),          subtitle: t('worldMeta.plus.subtitle') },
    music:       { title: t('worldMeta.music.title'),         subtitle: t('worldMeta.music.subtitle') },
    radio:       { title: t('worldMeta.radio.title'),         subtitle: t('worldMeta.radio.subtitle') },
    tournaments: { title: t('worldMeta.tournaments.title'),   subtitle: t('worldMeta.tournaments.subtitle') },
  };

  const meta = (metaMap[world] ?? metaMap['general'])!;

  return (
    <main className="live-page" aria-label={meta.title}>
      <header className="live-page__header">
        <div>
          <h1 className="live-page__title">{meta.title}</h1>
          <p className="live-page__subtitle">{meta.subtitle}</p>
        </div>
      </header>

      {world === 'general'     && <GeneralLive t={t} />}
      {world === 'plus'        && <PlusLive t={t} />}
      {world === 'music'       && <MusicLivePage />}
      {world === 'radio'       && <RadioLive t={t} />}
      {world === 'tournaments' && <TournamentsLivePage />}
    </main>
  );
}
