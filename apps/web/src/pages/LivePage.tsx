/**
 * Sound Platform — Live Tab Page
 * Phase: 5-E (World-Scoped Live)
 *
 * Reads `world` from WorldNavContext (/:worldId/live).
 * Renders a distinct live surface per world:
 *   عام        — general Sound live rooms  ← IMPLEMENTED THIS PHASE
 *   بلس        — inherits GeneralLive structure (+ permission gate)  ← next phase
 *   موسيقى     — music events / concert / listening parties          ← next phase
 *   راديو      — on-air schedule                                     ← next phase
 *   مسابقات    — tournament live / voting / leaderboard              ← next phase
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

import React, { useState, useCallback, useRef } from 'react';
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

// ─── General Live filter options ────────────────────────────────────────────

const GEN_STATUS_OPTIONS: FilterOption[] = [
  { value: 'live_now',   label: 'لايف الآن' },
  { value: 'guest_open', label: 'يستقبل ضيوف' },
  { value: 'following',  label: 'من أتابعهم' },
  { value: 'nearby',     label: 'قريب مني' },
];

const GEN_CATEGORY_OPTIONS: FilterOption[] = [
  { value: 'culture',  label: 'ثقافة' },
  { value: 'poetry',   label: 'شعر' },
  { value: 'podcast',  label: 'بودكاست' },
  { value: 'stories',  label: 'قصص' },
  { value: 'dev',      label: 'تقنية' },
  { value: 'debates',  label: 'نقاشات' },
];

const GEN_COUNTRY_OPTIONS: FilterOption[] = [
  { value: 'sa',   label: 'السعودية' },
  { value: 'eg',   label: 'مصر' },
  { value: 'ae',   label: 'الإمارات' },
  { value: 'kw',   label: 'الكويت' },
  { value: 'jo',   label: 'الأردن' },
  { value: 'intl', label: 'عالمي' },
];

const GEN_SORT_OPTIONS: FilterOption[] = [
  { value: 'newest',      label: 'الأحدث' },
  { value: 'most_heard',  label: 'الأكثر استماعاً' },
  { value: 'most_active', label: 'الأكثر تفاعلاً' },
  { value: 'following',   label: 'من أتابعهم' },
  { value: 'suggested',   label: 'المقترح لك' },
];

const GENERAL_ROOMS: LiveRoom[] = [
  {
    id: 'g1',
    title: 'حديث المساء',
    host: 'نورة منصور',
    category: 'ثقافة',
    categoryId: 'culture',
    speakers: 6,
    listeners: '8.4K',
    isFollowed: true,
    isGuestOpen: true,
    isFeatured: true,
    avatarInitials: 'نم',
    avatarColor: '#7c3aed',
  },
  {
    id: 'g2',
    title: 'شعر على الهواء',
    host: 'بدر المطيري',
    category: 'شعر',
    categoryId: 'poetry',
    speakers: 5,
    listeners: '1.2K',
    isFollowed: true,
    isGuestOpen: false,
    isFeatured: true,
    avatarInitials: 'بم',
    avatarColor: '#0891b2',
  },
  {
    id: 'g3',
    title: 'أسئلة عن صناعة الصوت',
    host: 'رهف علي',
    category: 'بودكاست',
    categoryId: 'podcast',
    speakers: 8,
    listeners: '2.1K',
    isFollowed: false,
    isGuestOpen: true,
    isFeatured: true,
    avatarInitials: 'رع',
    avatarColor: '#059669',
  },
  {
    id: 'g4',
    title: 'مساحة مبدعين صاعدين',
    host: 'فيصل كمال',
    category: 'تطوير',
    categoryId: 'dev',
    speakers: 3,
    listeners: '450',
    isFollowed: false,
    isGuestOpen: false,
    isFeatured: true,
    avatarInitials: 'فك',
    avatarColor: '#d97706',
  },
  {
    id: 'g5',
    title: 'حكايات من الماضي',
    host: 'فهد الراوي',
    category: 'قصص',
    categoryId: 'stories',
    speakers: 2,
    listeners: '900',
    isFollowed: true,
    isGuestOpen: false,
    avatarInitials: 'فر',
    avatarColor: '#be185d',
  },
  {
    id: 'g6',
    title: 'بودكاست الفن الرقمي',
    host: 'ياسين فهد',
    category: 'بودكاست',
    categoryId: 'podcast',
    speakers: 2,
    listeners: '670',
    isFollowed: false,
    isGuestOpen: true,
    avatarInitials: 'يف',
    avatarColor: '#1d4ed8',
  },
];

// ─── Plus rooms static data ─────────────────────────────────────────────────

const PLUS_ROOMS: LiveRoom[] = [
  {
    id: 'p1',
    title: 'جلسة المبدعين المتقدمة',
    host: 'سارة الأحمدي',
    category: 'إبداع',
    categoryId: 'creative',
    speakers: 8,
    listeners: '12.3K',
    isFollowed: true,
    isGuestOpen: true,
    isFeatured: true,
    avatarInitials: 'سأ',
    avatarColor: '#b45309',
  },
  {
    id: 'p2',
    title: 'حوار الكُتَّاب الحصري',
    host: 'عمر الفيصل',
    category: 'أدب',
    categoryId: 'literature',
    speakers: 5,
    listeners: '4.7K',
    isFollowed: false,
    isGuestOpen: false,
    isFeatured: true,
    avatarInitials: 'عف',
    avatarColor: '#7c3aed',
  },
  {
    id: 'p3',
    title: 'ورشة التسجيل الصوتي',
    host: 'لمى الجاسر',
    category: 'تقنية',
    categoryId: 'tech',
    speakers: 3,
    listeners: '2.9K',
    isFollowed: true,
    isGuestOpen: true,
    isFeatured: true,
    avatarInitials: 'لج',
    avatarColor: '#0891b2',
  },
  {
    id: 'p4',
    title: 'نقاش فلسفي عميق',
    host: 'كريم نصر',
    category: 'فكر',
    categoryId: 'philosophy',
    speakers: 6,
    listeners: '1.8K',
    isFollowed: false,
    isGuestOpen: true,
    avatarInitials: 'كن',
    avatarColor: '#059669',
  },
  {
    id: 'p5',
    title: 'ليلة الشعر الكلاسيكي',
    host: 'ريم السلطان',
    category: 'شعر',
    categoryId: 'poetry',
    speakers: 4,
    listeners: '3.2K',
    isFollowed: true,
    isGuestOpen: false,
    avatarInitials: 'رس',
    avatarColor: '#be185d',
  },
  {
    id: 'p6',
    title: 'استوديو بلس — التسجيل المباشر',
    host: 'فارس العتيبي',
    category: 'موسيقى',
    categoryId: 'music',
    speakers: 2,
    listeners: '5.1K',
    isFollowed: false,
    isGuestOpen: false,
    avatarInitials: 'فع',
    avatarColor: '#d97706',
  },
];

// ─── Plus Live filter options ──────────────────────────────────────────────

const PLUS_STATUS_OPTIONS: FilterOption[] = [
  { value: 'live_now',   label: 'لايف الآن' },
  { value: 'guest_open', label: 'يستقبل ضيوف' },
  { value: 'following',  label: 'من أتابعهم' },
  { value: 'exclusive',  label: 'حصري بلس' },
];

const PLUS_CATEGORY_OPTIONS: FilterOption[] = [
  { value: 'creative',    label: 'إبداع' },
  { value: 'literature',  label: 'أدب' },
  { value: 'tech',        label: 'تقنية' },
  { value: 'philosophy',  label: 'فكر' },
  { value: 'poetry',      label: 'شعر' },
  { value: 'music',       label: 'موسيقى' },
];

const PLUS_COUNTRY_OPTIONS: FilterOption[] = [
  { value: 'sa',   label: 'السعودية' },
  { value: 'eg',   label: 'مصر' },
  { value: 'ae',   label: 'الإمارات' },
  { value: 'kw',   label: 'الكويت' },
  { value: 'jo',   label: 'الأردن' },
  { value: 'intl', label: 'عالمي' },
];

const PLUS_SORT_OPTIONS: FilterOption[] = [
  { value: 'newest',      label: 'الأحدث' },
  { value: 'most_heard',  label: 'الأكثر استماعاً' },
  { value: 'exclusive',   label: 'الحصري أولاً' },
  { value: 'following',   label: 'من أتابعهم' },
  { value: 'top_rated',   label: 'الأعلى تقييماً' },
];

// ─── Radio static data ───────────────────────────────────────────────────────

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

const RADIO_CATEGORY_OPTIONS: FilterOption[] = [
  { value: 'news',     label: 'أخبار' },
  { value: 'culture',  label: 'ثقافة' },
  { value: 'quran',    label: 'قرآن' },
  { value: 'music',    label: 'موسيقى' },
  { value: 'sports',   label: 'رياضة' },
  { value: 'stories',  label: 'حكايات' },
  { value: 'podcast',  label: 'بودكاست إذاعي' },
  { value: 'kids',     label: 'أطفال' },
];

const RADIO_COUNTRY_OPTIONS: FilterOption[] = [
  { value: 'sa',  label: 'السعودية' },
  { value: 'eg',  label: 'مصر' },
  { value: 'ae',  label: 'الإمارات' },
  { value: 'kw',  label: 'الكويت' },
  { value: 'jo',  label: 'الأردن' },
  { value: 'ma',  label: 'المغرب' },
  { value: 'intl', label: 'دولية' },
];

const RADIO_STATUS_OPTIONS: FilterOption[] = [
  { value: 'live',     label: 'على الهواء الآن' },
  { value: 'recorded', label: 'مسجل' },
  { value: 'upcoming', label: 'قريباً' },
];

const RADIO_SORT_OPTIONS: FilterOption[] = [
  { value: 'most_listened', label: 'الأعلى استماعاً' },
  { value: 'on_air',        label: 'على الهواء الآن' },
  { value: 'nearest',       label: 'الأقرب لك' },
  { value: 'newest',        label: 'الأحدث إضافة' },
  { value: 'most_followed', label: 'الأكثر متابعة' },
  { value: 'upcoming',      label: 'البرامج القادمة' },
];

const RADIO_STATIONS: RadioStation[] = [
  {
    id: 'r1',
    name: 'إذاعة صوت العرب',
    program: 'مساء الحكايات',
    category: 'ثقافة', categoryId: 'culture',
    country: 'مصر', countryId: 'eg',
    listeners: '18K',
    isLive: true, isSaved: true, isFollowed: true,
    avatarInitials: 'صع', avatarColor: '#7c3aed',
    onAirStatus: 'live',
    nextProgram: 'أخبار المساء', nextTime: '21:00',
  },
  {
    id: 'r2',
    name: 'إذاعة القرآن الكريم',
    program: 'تلاوات الصباح',
    category: 'قرآن', categoryId: 'quran',
    country: 'السعودية', countryId: 'sa',
    listeners: '120K',
    isLive: true, isSaved: false, isFollowed: true,
    avatarInitials: 'قك', avatarColor: '#059669',
    onAirStatus: 'live',
    nextProgram: 'درس الفقه', nextTime: '08:00',
  },
  {
    id: 'r3',
    name: 'موجة الرياض',
    program: 'تحليل الدوري',
    category: 'رياضة', categoryId: 'sports',
    country: 'السعودية', countryId: 'sa',
    listeners: '42K',
    isLive: false, isSaved: false, isFollowed: false,
    avatarInitials: 'مر', avatarColor: '#0891b2',
    onAirStatus: 'recorded',
    nextProgram: 'أخبار الرياضة', nextTime: '18:00',
  },
  {
    id: 'r4',
    name: 'راديو الحكايات',
    program: 'ألف ليلة وليلة',
    category: 'حكايات', categoryId: 'stories',
    country: 'الأردن', countryId: 'jo',
    listeners: '5.2K',
    isLive: false, isSaved: true, isFollowed: false,
    avatarInitials: 'رح', avatarColor: '#be185d',
    onAirStatus: 'recorded',
  },
  {
    id: 'r5',
    name: 'ليالي الطرب',
    program: 'كلثوميات',
    category: 'موسيقى', categoryId: 'music',
    country: 'مصر', countryId: 'eg',
    listeners: '15K',
    isLive: true, isSaved: false, isFollowed: true,
    avatarInitials: 'لط', avatarColor: '#d97706',
    onAirStatus: 'live',
    nextProgram: 'فيروزيات', nextTime: '22:00',
  },
  {
    id: 'r6',
    name: 'راديو الطريق',
    program: 'حالة المرور',
    category: 'أخبار', categoryId: 'news',
    country: 'الإمارات', countryId: 'ae',
    listeners: '25K',
    isLive: true, isSaved: false, isFollowed: false,
    avatarInitials: 'رط', avatarColor: '#1d4ed8',
    onAirStatus: 'live',
  },
  {
    id: 'r7',
    name: 'أطفال FM',
    program: 'حواديت الصغار',
    category: 'أطفال', categoryId: 'kids',
    country: 'السعودية', countryId: 'sa',
    listeners: '8K',
    isLive: false, isSaved: false, isFollowed: false,
    avatarInitials: 'أف', avatarColor: '#9333ea',
    onAirStatus: 'upcoming',
    nextProgram: 'حواديت الصغار', nextTime: '16:00',
  },
  {
    id: 'r8',
    name: 'حديث المساء',
    program: 'حوار مفتوح',
    category: 'ثقافة', categoryId: 'culture',
    country: 'الكويت', countryId: 'kw',
    listeners: '3.5K',
    isLive: false, isSaved: true, isFollowed: true,
    avatarInitials: 'حم', avatarColor: '#0891b2',
    onAirStatus: 'recorded',
  },
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

function RoomRow({ room }: { room: LiveRoom }) {
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
            {room.speakers} متحدثين
          </span>
          <span className="room-row__stat room-row__stat--listeners">
            <svg className="room-row__stat-icon" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
            {room.listeners}
          </span>
          {room.isGuestOpen && (
            <span className="room-row__badge room-row__badge--guest">طلب ضيف</span>
          )}
        </div>
      </div>
      <button className="room-row__join-btn" aria-label={`انضمام إلى ${room.title}`}>
        انضمام
      </button>
    </article>
  );
}

// ─── Featured carousel card (full hero structure) ─────────────────────────────

function FeaturedCard({ room, plusMode }: { room: LiveRoom; plusMode?: boolean }) {
  return (
    <div className="live-feat-card" aria-label={`غرفة مميزة: ${room.title}`}>
      {/* Live pulse badge */}
      <div className={`live-hero__badge${plusMode ? ' live-hero__badge--plus' : ''}`} aria-live="polite">
        <span className="live-hero__pulse" aria-hidden="true" />
        {plusMode ? 'بلس لايف' : 'لايف'}
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
              {room.speakers} متحدثين
            </span>
            <span className="live-hero__meta-item live-hero__meta-item--cyan">
              <svg className="live-hero__meta-icon" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217z" clipRule="evenodd" />
              </svg>
              {room.listeners} مستمع
            </span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="live-hero__actions">
        <button className="live-hero__join-btn" aria-label={`انضمام إلى ${room.title}`}>
          انضمام
        </button>
        {room.isGuestOpen && (
          <button className="live-hero__guest-btn" aria-label="طلب انضمام كضيف">
            طلب ضيف
          </button>
        )}
        <button className="live-hero__preview-btn" aria-label="معاينة الغرفة">
          معاينة
        </button>
      </div>
    </div>
  );
}

// ─── Featured carousel ────────────────────────────────────────────────────────

function FeaturedCarousel({ rooms, plusMode }: { rooms: LiveRoom[]; plusMode?: boolean }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const scroll = (dir: 'prev' | 'next') => {
    const el = trackRef.current;
    if (!el) return;
    el.scrollBy({ left: dir === 'next' ? -280 : 280, behavior: 'smooth' });
  };
  if (rooms.length === 0) return null;
  return (
    <section className={`live-carousel${plusMode ? ' live-carousel--plus' : ''}`} aria-label="غرف مميزة">
      <div className="live-section__header" style={{ padding: '0 1rem' }}>
        <h2 className="live-section__title">
          غرف مميزة
          {plusMode && <span className="live-section__plus-badge">بلس</span>}
        </h2>
        <div className="live-carousel__nav" aria-label="تصفح الغرف المميزة">
          <button className="live-carousel__btn" onClick={() => scroll('prev')} aria-label="السابق">
            <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16"><path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" /></svg>
          </button>
          <button className="live-carousel__btn" onClick={() => scroll('next')} aria-label="التالي">
            <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16"><path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
          </button>
        </div>
      </div>
      <div className="live-carousel__track" ref={trackRef}>
        {rooms.map((room) => (
          <FeaturedCard key={room.id} room={room} plusMode={plusMode} />
        ))}
      </div>
    </section>
  );
}

// ─── Sponsor / ad block ───────────────────────────────────────────────────────

function SponsorBlock() {
  return (
    <div className="live-sponsor" role="complementary" aria-label="رعاية">
      <span className="live-sponsor__tag">رعاية</span>
      <div className="live-sponsor__body">
        <div className="live-sponsor__icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15v-4H7l5-8v4h4l-5 8z" />
          </svg>
        </div>
        <div className="live-sponsor__text">
          <p className="live-sponsor__name">Sound Pro</p>
          <p className="live-sponsor__desc">ارفع صوتك — اشترك الآن واحصل على أدوات البث المتقدمة</p>
        </div>
      </div>
      <button className="live-sponsor__cta" aria-label="اكتشف Sound Pro">اكتشف</button>
    </div>
  );
}

// ─── (SelectedChips imported from FilterDropdown — no local duplicate) ───────

// ─── General Live ─────────────────────────────────────────────────────────────

function GeneralLive() {
  const [searchQuery, setSearchQuery]     = useState<string>('');
  const [selStatuses, setSelStatuses]     = useState<string[]>([]);
  const [selCategories, setSelCategories] = useState<string[]>([]);
  const [selCountries, setSelCountries]   = useState<string[]>([]);
  const [selSorts, setSelSorts]           = useState<string[]>([]);

  const toggleStatus   = useCallback((v: string) => setSelStatuses(p   => p.includes(v) ? p.filter(x => x !== v) : [...p, v]), []);
  const toggleCategory = useCallback((v: string) => setSelCategories(p => p.includes(v) ? p.filter(x => x !== v) : [...p, v]), []);
  const toggleCountry  = useCallback((v: string) => setSelCountries(p  => p.includes(v) ? p.filter(x => x !== v) : [...p, v]), []);
  const toggleSort     = useCallback((v: string) => setSelSorts(p      => p.includes(v) ? p.filter(x => x !== v) : [...p, v]), []);

  // Derived lists
  const q = searchQuery.trim().toLowerCase();
  const rooms = GENERAL_ROOMS.filter((r) => {
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
            dir="rtl"
            placeholder="ابحث في لايف عام"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="بحث في لايف عام"
            autoComplete="off"
          />
          {searchQuery && (
            <button
              className="live-search__clear"
              onClick={() => setSearchQuery('')}
              aria-label="مسح البحث"
            >✕</button>
          )}
        </div>
      </div>

      {/* ── Filter area (centered, safe padding) ── */}
      <div className="live-filter-area">
        {/* Filter row */}
        <div className="live-filters" role="group" aria-label="تصفية الغرف">
          <FilterDropdown label="الحالة"   options={GEN_STATUS_OPTIONS}   values={selStatuses}   onToggle={toggleStatus}   onClear={() => setSelStatuses([])}   ariaLabel="تصفية حسب الحالة" />
          <FilterDropdown label="التصنيف"  options={GEN_CATEGORY_OPTIONS} values={selCategories} onToggle={toggleCategory} onClear={() => setSelCategories([])} ariaLabel="تصفية حسب التصنيف" />
          <FilterDropdown label="البلد"    options={GEN_COUNTRY_OPTIONS}  values={selCountries}  onToggle={toggleCountry}  onClear={() => setSelCountries([])}  ariaLabel="تصفية حسب البلد" />
          <FilterDropdown label="الترتيب"  options={GEN_SORT_OPTIONS}     values={selSorts}      onToggle={toggleSort}     onClear={() => setSelSorts([])}     ariaLabel="ترتيب الغرف" />
        </div>

        {/* Selected chip tags */}
        <SelectedChips
          groups={[
            { filterId: 'gen-stat',  options: GEN_STATUS_OPTIONS,   values: selStatuses,   onRemove: toggleStatus },
            { filterId: 'gen-cat',   options: GEN_CATEGORY_OPTIONS, values: selCategories, onRemove: toggleCategory },
            { filterId: 'gen-ctry',  options: GEN_COUNTRY_OPTIONS,  values: selCountries,  onRemove: toggleCountry },
            { filterId: 'gen-sort',  options: GEN_SORT_OPTIONS,     values: selSorts,      onRemove: toggleSort },
          ]}
        />

        {/* Browse-categories subpage button — always visible under chips */}
        <button
          className="fd-subpage-btn live-browse-btn"
          aria-label="استعراض أصناف الغرف"
          onClick={() => { /* navigate to categories subpage */ }}
        >
          <svg width="13" height="13" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zm0 8a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zm6-6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zm0 8a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
          </svg>
          استعراض الأصناف
        </button>
      </div>

      {/* ── Featured carousel ── */}
      <FeaturedCarousel rooms={rooms.filter((r) => r.isFeatured)} />

      {/* ── Sponsor block ── */}
      <SponsorBlock />

      {/* ── Create Live CTA ── */}
      <div className="live-create-cta" role="region" aria-label="إنشاء جلسة لايف">
        <div className="live-create-cta__icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="currentColor" width="28" height="28">
            <path d="M12 2a4 4 0 100 8 4 4 0 000-8zm0 10c-4.418 0-8 1.79-8 4v2h16v-2c0-2.21-3.582-4-8-4z" />
            <path d="M19 3h-2v2h-2v2h2v2h2V7h2V5h-2z" />
          </svg>
        </div>
        <div className="live-create-cta__text">
          <p className="live-create-cta__label">
            هل تريد بدء لايف؟
            <span className="live-create-cta__eligibility">حسب الأهلية</span>
          </p>
          <p className="live-create-cta__hint">شارك أفكارك وصوتك مع المجتمع الآن</p>
        </div>
        <button className="live-create-cta__btn" aria-label="إنشاء جلسة لايف">
          إنشاء
        </button>
      </div>

      {/* ── Active rooms ── */}
      {activeRooms.length > 0 && (
        <section aria-labelledby="active-rooms-heading" className="live-section">
          <div className="live-section__header">
            <h2 id="active-rooms-heading" className="live-section__title">غرف نشطة</h2>
            <button className="live-section__see-all" aria-label="عرض كل الغرف النشطة">
              عرض الكل
            </button>
          </div>
          <div className="room-list">
            {activeRooms.map((room) => (
              <RoomRow key={room.id} room={room} />
            ))}
          </div>
        </section>
      )}

      {/* ── From following ── */}
      {followedRooms.length > 0 && (
        <section aria-labelledby="following-rooms-heading" className="live-section">
          <div className="live-section__header">
            <h2 id="following-rooms-heading" className="live-section__title">من أتابعهم</h2>
          </div>
          <div className="room-list">
            {followedRooms.map((room) => (
              <RoomRow key={room.id} room={room} />
            ))}
          </div>
        </section>
      )}

      {/* ── Open for guest requests ── */}
      {guestRooms.length > 0 && (
        <section aria-labelledby="guest-rooms-heading" className="live-section">
          <div className="live-section__header">
            <h2 id="guest-rooms-heading" className="live-section__title">مفتوحة للضيوف</h2>
          </div>
          <div className="room-list">
            {guestRooms.map((room) => (
              <RoomRow key={room.id} room={room} />
            ))}
          </div>
        </section>
      )}

      {/* ── Empty state when filters yield nothing ── */}
      {rooms.length === 0 && (
        <div className="live-empty" role="status">
          <p>لا توجد غرف تطابق الفلاتر المختارة</p>
          <button
            className="live-empty__reset"
            onClick={() => { setSelStatuses([]); setSelCategories([]); setSelCountries([]); setSelSorts([]); }}
          >
            إعادة الضبط
          </button>
        </div>
      )}

      {/* ── Footer note ── */}
      <p className="live-footer-note">
        يمكنك الاستماع لأي لايف عام. طلب الانضمام كضيف يعتمد على إعدادات المضيف وأهلية الحساب.
      </p>
    </>
  );
}

// ─── Plus Live ────────────────────────────────────────────────────────────────
// Shares identical page structure with GeneralLive.
// Differentiated by: Plus room data · gold accent · permission-gated create CTA.
// Replace `hasCreatePermission` with real auth/subscription check when wired.

function PlusSponsorBlock() {
  return (
    <div className="live-sponsor live-sponsor--plus" role="complementary" aria-label="رعاية">
      <span className="live-sponsor__tag">بلس</span>
      <div className="live-sponsor__body">
        <div className="live-sponsor__icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
        </div>
        <div className="live-sponsor__text">
          <p className="live-sponsor__name">Sound Plus</p>
          <p className="live-sponsor__desc">انضم إلى بلس واستمتع بغرف حصرية وأدوات بث متقدمة</p>
        </div>
      </div>
      <button className="live-sponsor__cta live-sponsor__cta--plus" aria-label="اشترك في بلس">اشترك</button>
    </div>
  );
}

function PlusCreateCTA({ hasPermission }: { hasPermission: boolean }) {
  if (hasPermission) {
    return (
      <div className="live-create-cta live-create-cta--plus" role="region" aria-label="إنشاء جلسة بلس لايف">
        <div className="live-create-cta__icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="currentColor" width="28" height="28">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            <path d="M19 3h-2v2h-2v2h2v2h2V7h2V5h-2z" />
          </svg>
        </div>
        <div className="live-create-cta__text">
          <p className="live-create-cta__label">
            ابدأ لايف بلس
            <span className="live-create-cta__eligibility live-create-cta__eligibility--plus">مشترك بلس</span>
          </p>
          <p className="live-create-cta__hint">أنشئ غرفة حصرية لجمهور بلس</p>
        </div>
        <button className="live-create-cta__btn live-create-cta__btn--plus" aria-label="إنشاء لايف بلس">
          إنشاء
        </button>
      </div>
    );
  }
  // No permission — show upgrade gate in same CTA block shape
  return (
    <div className="live-create-cta live-create-cta--locked" role="region" aria-label="الوصول إلى لايف بلس">
      <div className="live-create-cta__icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="currentColor" width="28" height="28">
          <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" />
        </svg>
      </div>
      <div className="live-create-cta__text">
        <p className="live-create-cta__label">إنشاء لايف بلس</p>
        <p className="live-create-cta__hint">يتطلب اشتراك بلس نشط لبدء غرفة حصرية</p>
      </div>
      <button className="live-create-cta__btn live-create-cta__btn--upgrade" aria-label="ترقية إلى بلس">
        ترقية
      </button>
    </div>
  );
}

function PlusLive() {
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

  const q = searchQuery.trim().toLowerCase();
  const rooms = PLUS_ROOMS.filter((r) => {
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
            dir="rtl"
            placeholder="ابحث في لايف بلس"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="بحث في لايف بلس"
            autoComplete="off"
          />
          {searchQuery && (
            <button className="live-search__clear" onClick={() => setSearchQuery('')} aria-label="مسح البحث">✕</button>
          )}
        </div>
      </div>

      {/* ── Filter area ── */}
      <div className="live-filter-area">
        <div className="live-filters" role="group" aria-label="تصفية غرف بلس">
          <FilterDropdown label="الحالة"  options={PLUS_STATUS_OPTIONS}   values={selStatuses}   onToggle={toggleStatus}   onClear={() => setSelStatuses([])}   ariaLabel="تصفية حسب الحالة" />
          <FilterDropdown label="التصنيف" options={PLUS_CATEGORY_OPTIONS} values={selCategories} onToggle={toggleCategory} onClear={() => setSelCategories([])} ariaLabel="تصفية حسب التصنيف" />
          <FilterDropdown label="البلد"   options={PLUS_COUNTRY_OPTIONS}  values={selCountries}  onToggle={toggleCountry}  onClear={() => setSelCountries([])}  ariaLabel="تصفية حسب البلد" />
          <FilterDropdown label="الترتيب" options={PLUS_SORT_OPTIONS}     values={selSorts}      onToggle={toggleSort}     onClear={() => setSelSorts([])}     ariaLabel="ترتيب غرف بلس" />
        </div>
        <SelectedChips
          groups={[
            { filterId: 'plus-stat', options: PLUS_STATUS_OPTIONS,   values: selStatuses,   onRemove: toggleStatus },
            { filterId: 'plus-cat',  options: PLUS_CATEGORY_OPTIONS, values: selCategories, onRemove: toggleCategory },
            { filterId: 'plus-ctry', options: PLUS_COUNTRY_OPTIONS,  values: selCountries,  onRemove: toggleCountry },
            { filterId: 'plus-sort', options: PLUS_SORT_OPTIONS,     values: selSorts,      onRemove: toggleSort },
          ]}
        />
        <button
          className="fd-subpage-btn live-browse-btn"
          aria-label="استعراض أصناف غرف بلس"
          onClick={() => {}}
        >
          <svg width="13" height="13" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zm0 8a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zm6-6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zm0 8a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
          </svg>
          استعراض الأصناف
        </button>
      </div>

      {/* ── Featured carousel ── */}
      <FeaturedCarousel rooms={featuredRooms} plusMode />

      {/* ── Plus sponsor block ── */}
      <PlusSponsorBlock />

      {/* ── Create / access CTA ── */}
      <PlusCreateCTA hasPermission={hasCreatePermission} />

      {/* ── Active Plus rooms ── */}
      {activeRooms.length > 0 && (
        <section aria-labelledby="plus-active-heading" className="live-section">
          <div className="live-section__header">
            <h2 id="plus-active-heading" className="live-section__title">
              غرف بلس النشطة
              <span className="live-section__plus-badge">بلس</span>
            </h2>
            <button className="live-section__see-all" aria-label="عرض كل غرف بلس">عرض الكل</button>
          </div>
          <div className="room-list">
            {activeRooms.map((room) => <RoomRow key={room.id} room={room} />)}
          </div>
        </section>
      )}

      {/* ── From following ── */}
      {followedRooms.length > 0 && (
        <section aria-labelledby="plus-following-heading" className="live-section">
          <div className="live-section__header">
            <h2 id="plus-following-heading" className="live-section__title">من أتابعهم — بلس</h2>
          </div>
          <div className="room-list">
            {followedRooms.map((room) => <RoomRow key={room.id} room={room} />)}
          </div>
        </section>
      )}

      {/* ── Open for guest requests ── */}
      {guestRooms.length > 0 && (
        <section aria-labelledby="plus-guest-heading" className="live-section">
          <div className="live-section__header">
            <h2 id="plus-guest-heading" className="live-section__title">مفتوحة للضيوف</h2>
          </div>
          <div className="room-list">
            {guestRooms.map((room) => <RoomRow key={room.id} room={room} />)}
          </div>
        </section>
      )}

      {/* ── Empty state ── */}
      {rooms.length === 0 && (
        <div className="live-empty" role="status">
          <p>لا توجد غرف بلس تطابق الفلاتر المختارة</p>
          <button className="live-empty__reset" onClick={() => { setSelStatuses([]); setSelCategories([]); setSelCountries([]); setSelSorts([]); }}>
            إعادة الضبط
          </button>
        </div>
      )}

      <p className="live-footer-note">
        غرف بلس حصرية للمشتركين. يمكنك الاستماع والانضمام كضيف حسب إعدادات المضيف وحالة اشتراكك.
      </p>
    </>
  );
}

// ─── Music Live (next phase) ──────────────────────────────────────────────────

function MusicLive() {
  return (
    <div className="live-coming-soon" role="status">
      <p className="live-coming-soon__title">لايف موسيقى</p>
      <p className="live-coming-soon__hint">قريباً — حفلات وجلسات استماع</p>
    </div>
  );
}

// ─── Radio station card (hero-style for on-air carousel) ─────────────────────

function RadioHeroCard({ station }: { station: RadioStation }) {
  return (
    <div className="radio-hero-card" aria-label={`${station.name} — ${station.program}`}>
      {/* On-air badge */}
      {station.isLive ? (
        <div className="live-hero__badge radio-hero__badge--live" aria-live="polite">
          <span className="live-hero__pulse" aria-hidden="true" />
          على الهواء
        </div>
      ) : station.onAirStatus === 'upcoming' ? (
        <div className="radio-hero__badge--upcoming">قريباً {station.nextTime}</div>
      ) : (
        <div className="radio-hero__badge--recorded">مسجل</div>
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
              {station.listeners} مستمع
            </span>
            <span className="live-hero__meta-item live-hero__meta-item--cyan">
              {station.country}
            </span>
          </div>
          {station.nextProgram && (
            <p className="radio-hero__next">التالي: {station.nextProgram} · {station.nextTime}</p>
          )}
        </div>
      </div>

      <div className="live-hero__actions">
        <button className="radio-hero__listen-btn" aria-label={`استمع إلى ${station.name}`}>
          {station.isLive ? 'استمع الآن' : 'تشغيل'}
        </button>
        <button className="live-hero__preview-btn radio-hero__bookmark-btn" aria-label="حفظ المحطة">
          {station.isSaved ? 'محفوظة' : 'حفظ'}
        </button>
      </div>
    </div>
  );
}

// ─── Radio station list row ───────────────────────────────────────────────────

function RadioStationRow({ station }: { station: RadioStation }) {
  return (
    <article className="radio-station-row" aria-label={station.name}>
      <div className="radio-station-row__logo" style={{ '--avatar-color': station.avatarColor } as React.CSSProperties}>
        <span className="radio-station-row__initials">{station.avatarInitials}</span>
        {station.isLive && <span className="radio-station-row__live-dot" aria-hidden="true" />}
      </div>
      <div className="radio-station-row__info">
        <div className="radio-station-row__name-row">
          <span className="radio-station-row__name">{station.name}</span>
          {station.isLive && <span className="radio-station-row__badge">LIVE</span>}
        </div>
        <p className="radio-station-row__program">{station.program}</p>
        <p className="radio-station-row__meta">
          {station.category} · {station.country} · {station.listeners} مستمع
        </p>
      </div>
      <div className="radio-station-row__actions">
        <button className="radio-station-row__action" aria-label="حفظ">
          <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18">
            <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" />
          </svg>
        </button>
        <button className="radio-station-row__action" aria-label="مشاركة">
          <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18">
            <path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" />
          </svg>
        </button>
      </div>
    </article>
  );
}

// ─── Radio Live ───────────────────────────────────────────────────────────────

const MY_STATION_TABS = [
  { id: 'saved',    label: 'المحفوظة' },
  { id: 'followed', label: 'أتابعها' },
  { id: 'popular',  label: 'الأكثر استماعاً' },
];

function RadioLive() {
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

  const q = searchQuery.trim().toLowerCase();
  const filtered = RADIO_STATIONS.filter(s => {
    const catOk    = selCategories.length === 0 || selCategories.includes(s.categoryId);
    const ctryOk   = selCountries.length === 0  || selCountries.includes(s.countryId);
    const statOk   = selStatuses.length === 0   || selStatuses.includes(s.onAirStatus);
    const searchOk = !q || s.name.toLowerCase().includes(q) || s.program.toLowerCase().includes(q) || s.category.toLowerCase().includes(q);
    return catOk && ctryOk && statOk && searchOk;
  });

  const onAirNow  = filtered.filter(s => s.isLive);
  const otherStations = filtered.filter(s => !s.isLive);

  // My-stations derived list
  const myStations = RADIO_STATIONS.filter(s =>
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
            type="search" dir="rtl"
            placeholder="ابحث في إذاعات راديو"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            aria-label="بحث في إذاعات راديو"
            autoComplete="off"
          />
          {searchQuery && (
            <button className="live-search__clear" onClick={() => setSearchQuery('')} aria-label="مسح البحث">✕</button>
          )}
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="live-filter-area">
        <div className="live-filters" role="group" aria-label="تصفية الإذاعات">
          <FilterDropdown label="الحالة"   options={RADIO_STATUS_OPTIONS}   values={selStatuses}   onToggle={toggleStatus}  onClear={() => setSelStatuses([])}   ariaLabel="تصفية حسب الحالة" />
          <FilterDropdown label="التصنيف"  options={RADIO_CATEGORY_OPTIONS} values={selCategories} onToggle={toggleCat}     onClear={() => setSelCategories([])} ariaLabel="تصفية حسب التصنيف" />
          <FilterDropdown label="البلد"    options={RADIO_COUNTRY_OPTIONS}  values={selCountries}  onToggle={toggleCountry} onClear={() => setSelCountries([])}  ariaLabel="تصفية حسب البلد" />
          <FilterDropdown label="الترتيب"  options={RADIO_SORT_OPTIONS}     values={selSorts}      onToggle={toggleSort}    onClear={() => setSelSorts([])}      ariaLabel="ترتيب الإذاعات" />
        </div>

        <SelectedChips groups={[
          { filterId: 'rad-stat', options: RADIO_STATUS_OPTIONS,   values: selStatuses,   onRemove: toggleStatus },
          { filterId: 'rad-cat',  options: RADIO_CATEGORY_OPTIONS, values: selCategories, onRemove: toggleCat },
          { filterId: 'rad-ctry', options: RADIO_COUNTRY_OPTIONS,  values: selCountries,  onRemove: toggleCountry },
          { filterId: 'rad-sort', options: RADIO_SORT_OPTIONS,     values: selSorts,      onRemove: toggleSort },
        ]} />

        <button className="fd-subpage-btn live-browse-btn" aria-label="استعراض أقسام الإذاعات" onClick={() => {}}>
          <svg width="13" height="13" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zm0 8a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zm6-6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zm0 8a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
          </svg>
          استعراض الأصناف
        </button>
      </div>

      {/* ── On-Air Now carousel ── */}
      {onAirNow.length > 0 && (
        <section className="live-carousel radio-carousel" aria-label="على الهواء الآن">
          <div className="live-section__header" style={{ padding: '0 1rem' }}>
            <h2 className="live-section__title radio-section__title">
              على الهواء الآن
              <span className="radio-on-air-dot" aria-hidden="true" />
            </h2>
            <div className="live-carousel__nav">
              <button className="live-carousel__btn" onClick={() => scrollCarousel('prev')} aria-label="السابق">
                <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16"><path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" /></svg>
              </button>
              <button className="live-carousel__btn" onClick={() => scrollCarousel('next')} aria-label="التالي">
                <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16"><path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
              </button>
            </div>
          </div>
          <div className="live-carousel__track" ref={carouselRef}>
            {onAirNow.map(s => <RadioHeroCard key={s.id} station={s} />)}
          </div>
        </section>
      )}

      {/* ── My Stations ── */}
      <section className="radio-my-stations" aria-label="محطاتي">
        <h2 className="live-section__title radio-section__title">محطاتي</h2>
        <div className="radio-my-tabs" role="tablist">
          {MY_STATION_TABS.map(t => (
            <button
              key={t.id}
              role="tab"
              aria-selected={myTab === t.id}
              className={`radio-my-tab${myTab === t.id ? ' radio-my-tab--active' : ''}`}
              onClick={() => setMyTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>
        {myStations.length > 0 ? (
          <div className="radio-station-list">
            {myStations.map(s => <RadioStationRow key={s.id} station={s} />)}
          </div>
        ) : (
          <p className="radio-my-empty">لا توجد محطات في هذه القائمة</p>
        )}
      </section>

      {/* ── All stations ── */}
      {otherStations.length > 0 && (
        <section aria-labelledby="all-stations-heading" className="live-section">
          <div className="live-section__header">
            <h2 id="all-stations-heading" className="live-section__title radio-section__title">كل الإذاعات</h2>
            <button className="live-section__see-all">عرض الكل</button>
          </div>
          <div className="radio-station-list">
            {otherStations.map(s => <RadioStationRow key={s.id} station={s} />)}
          </div>
        </section>
      )}

      {/* ── Empty state ── */}
      {filtered.length === 0 && (
        <div className="live-empty" role="status">
          <p>لا توجد إذاعات تطابق البحث أو الفلاتر المختارة</p>
          <button className="live-empty__reset" onClick={() => { setSelCategories([]); setSelCountries([]); setSelStatuses([]); setSearchQuery(''); }}>
            إعادة الضبط
          </button>
        </div>
      )}

      {/* ── Request station CTA ── */}
      <div className="radio-request-cta" role="complementary" aria-label="طلب إنشاء إذاعة">
        <div className="radio-request-cta__icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="currentColor" width="32" height="32">
            <path d="M3.24 6.15C2.51 6.43 2 7.17 2 8v12c0 1.1.89 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2H8.3l8.26-3.34L15.88 1 3.24 6.15zM12 19c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3z" />
          </svg>
        </div>
        <div className="radio-request-cta__text">
          <p className="radio-request-cta__title">هل لديك إذاعة أو جهة إعلامية؟</p>
          <p className="radio-request-cta__hint">يتم الطلب عبر مراجعة وتواصل مع شريك إذاعي معتمد</p>
        </div>
        <button className="radio-request-cta__btn" aria-label="طلب إنشاء إذاعة">طلب إنشاء</button>
      </div>

      <p className="live-footer-note">
        إذاعات راديو مباشرة وشريكة داخل Sound. الاستماع مجاني للجميع.
      </p>
    </>
  );
}

// ─── Tournaments stub removed — now routed to TournamentsLivePage ─────────────

// ─── World titles ─────────────────────────────────────────────────────────────

const WORLD_META: Record<string, { title: string; subtitle: string }> = {
  general:     { title: 'لايف',       subtitle: 'غرف صوتية مباشرة من المجتمع' },
  plus:        { title: 'لايف — بلس', subtitle: 'غرف حصرية لمبدعي بلس' },
  music:       { title: 'لايف — موسيقى', subtitle: 'حفلات وجلسات استماع وفعاليات موسيقية' },
  radio:       { title: 'لايف — راديو',  subtitle: 'البث المباشر والبرامج المجدولة' },
  tournaments: { title: 'لايف — مسابقات', subtitle: 'نشاط المسابقات الجاري' },
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export function LivePage() {
  const { world } = useWorldNav();
  const meta = (WORLD_META[world] ?? WORLD_META['general'])!;

  return (
    <main className="live-page" aria-label="لايف" dir="rtl">
      <header className="live-page__header">
        <div>
          <h1 className="live-page__title">{meta.title}</h1>
          <p className="live-page__subtitle">{meta.subtitle}</p>
        </div>
      </header>

      {world === 'general'     && <GeneralLive />}
      {world === 'plus'        && <PlusLive />}
      {world === 'music'       && <MusicLivePage />}
      {world === 'radio'       && <RadioLive />}
      {world === 'tournaments' && <TournamentsLivePage />}
    </main>
  );
}
