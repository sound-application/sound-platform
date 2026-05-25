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

// ─── Filter options ────────────────────────────────────────────────────────────

const MUSIC_STATUS_OPTIONS: FilterOption[] = [
  { value: 'live_now',   label: 'يعزف الآن' },
  { value: 'concert',   label: 'حفلة مباشرة' },
  { value: 'listening', label: 'جلسة استماع' },
  { value: 'upcoming',  label: 'قريباً' },
  { value: 'following', label: 'من أتابعهم' },
];
const MUSIC_CATEGORY_OPTIONS: FilterOption[] = [
  { value: 'arabic_pop', label: 'عربي بوب' },
  { value: 'tarab',      label: 'طرب' },
  { value: 'rap',        label: 'راب' },
  { value: 'khaleeji',  label: 'خليجي' },
  { value: 'masri',     label: 'مصري' },
  { value: 'acoustic',  label: 'أكوستيك' },
  { value: 'indie',     label: 'إندي' },
  { value: 'electronic',label: 'إلكتروني' },
];
const MUSIC_COUNTRY_OPTIONS: FilterOption[] = [
  { value: 'sa', label: 'السعودية' },
  { value: 'eg', label: 'مصر' },
  { value: 'ae', label: 'الإمارات' },
  { value: 'jo', label: 'الأردن' },
  { value: 'ma', label: 'المغرب' },
  { value: 'lb', label: 'لبنان' },
  { value: 'kw', label: 'الكويت' },
];
const MUSIC_SORT_OPTIONS: FilterOption[] = [
  { value: 'listeners_desc', label: 'الأعلى استماعاً' },
  { value: 'live_now',       label: 'يعزف الآن' },
  { value: 'newest',         label: 'الأحدث إضافة' },
  { value: 'following',      label: 'من أتابعهم' },
  { value: 'upcoming',       label: 'الفعاليات القادمة' },
  { value: 'top_artists',    label: 'أشهر الفنانين' },
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
    id: 'me1', title: 'حفلة الربيع', artist: 'ليان', artistHandle: 'layan@',
    category: 'عربي بوب', country: 'السعودية', listeners: '12.4K',
    eventType: 'concert', isFeatured: true,
    coverInitials: 'لي', coverColor: '#1a0a2e', accentColor: '#a855f7', isLive: true,
  },
  {
    id: 'me2', title: 'جلسة ليل خليجي', artist: 'فيصل العامر', artistHandle: 'faisalamir@',
    category: 'خليجي', country: 'الكويت', listeners: '8.1K',
    eventType: 'listening_party', isFeatured: true, isFollowed: true,
    coverInitials: 'في', coverColor: '#071a10', accentColor: '#22c55e', isLive: true,
  },
  {
    id: 'me3', title: 'أكوستيك من القلب', artist: 'زيد العراقي', artistHandle: 'zaydiq@',
    category: 'أكوستيك', country: 'الأردن', listeners: '5.7K',
    eventType: 'concert', isFeatured: true,
    coverInitials: 'زي', coverColor: '#1a120a', accentColor: '#f59e0b', isLive: true,
  },
  {
    id: 'me4', title: 'طرب في الليل', artist: 'نورة الحمد', artistHandle: 'norah_h@',
    category: 'طرب', country: 'مصر', listeners: '9.3K',
    eventType: 'artist_event', isFollowed: true,
    coverInitials: 'نو', coverColor: '#1a0808', accentColor: '#ef4444', isLive: true,
  },
  {
    id: 'me5', title: 'ليلة راب مصري', artist: 'آدم خالد', artistHandle: 'adam_k@',
    category: 'راب', country: 'مصر', listeners: '14.2K',
    eventType: 'concert',
    coverInitials: 'آد', coverColor: '#080818', accentColor: '#3b82f6', isLive: true,
  },
  {
    id: 'me6', title: 'مزاج هادئ مع نور', artist: 'نور', artistHandle: 'nour@',
    category: 'إندي', country: 'المغرب', listeners: '3.2K',
    eventType: 'listening_party', isFollowed: true,
    coverInitials: 'نر', coverColor: '#081218', accentColor: '#22d3ee', isLive: true,
  },
  {
    id: 'me7', title: 'إلكتروني مع DJ فهد', artist: 'DJ فهد', artistHandle: 'djfahad@',
    category: 'إلكتروني', country: 'الإمارات', listeners: '7.8K',
    eventType: 'artist_event', isFollowed: true,
    coverInitials: 'دي', coverColor: '#0e0a1a', accentColor: '#8b5cf6',
    isLive: false, startTime: '10:00 م',
  },
  {
    id: 'me8', title: 'جلسة عود وكلام', artist: 'سامر عادل', artistHandle: 'samir_a@',
    category: 'طرب', country: 'لبنان', listeners: '2.9K',
    eventType: 'jam', isFollowed: true,
    coverInitials: 'سم', coverColor: '#180f0a', accentColor: '#d97706', isLive: true,
  },
];

const FEATURED  = ALL_EVENTS.filter(e => e.isFeatured);
const ACTIVE    = ALL_EVENTS.filter(e => e.isLive && !e.isFeatured);
const PARTIES   = ALL_EVENTS.filter(e => e.eventType === 'listening_party');
const FOLLOWING = ALL_EVENTS.filter(e => e.isFollowed);

const EVENT_TYPE_LABEL: Record<MusicEvent['eventType'], string> = {
  concert:        'حفلة',
  listening_party:'جلسة استماع',
  artist_event:   'فعالية فنية',
  jam:            'جلسة موسيقية',
};

// ─── Music Hero Card — uses live-feat-card skeleton + music skin ───────────────

function MusicHeroCard({ event }: { event: MusicEvent }) {
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
            لايف
          </span>
        ) : (
          <span className="music-upcoming-badge">قريباً · {event.startTime}</span>
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
                {event.listeners} مستمع
              </span>
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
            انضمام
          </button>
          <button className="live-hero__preview-btn">معاينة</button>
        </div>
      </div>
    </div>
  );
}

// ─── Music Event Row — uses room-row skeleton + music skin ─────────────────────

function MusicEventRow({ event }: { event: MusicEvent }) {
  return (
    <article className="room-row music-event-row" role="listitem" dir="rtl">
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
            ? <span className="room-row__badge room-row__badge--live">لايف</span>
            : <span className="room-row__badge room-row__badge--guest">{event.startTime}</span>
          }
        </div>
      </div>

      <button
        className="room-row__join-btn"
        style={{ borderColor: `${event.accentColor}55`, color: event.accentColor }}
        aria-label={`انضمام إلى ${event.title}`}
      >
        انضمام
      </button>
    </article>
  );
}

// ─── Music Ad card — uses live-sponsor skeleton ────────────────────────────────

function MusicAdCard() {
  return (
    <div className="live-sponsor music-ad" role="complementary" aria-label="إعلان">
      <span className="live-sponsor__tag">إعلان</span>
      <div className="live-sponsor__body">
        <div className="live-sponsor__icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22">
            <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
          </svg>
        </div>
        <div className="live-sponsor__text">
          <p className="live-sponsor__name">Sound Studio</p>
          <p className="live-sponsor__desc">سجّل موسيقاك احترافياً · توزيع فوري · متاح الآن</p>
        </div>
      </div>
      <button className="live-sponsor__cta" aria-label="اكتشف Sound Studio">اكتشف</button>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export function MusicLivePage() {
  // Filter state
  const [statusValues,   setStatusValues]   = useState<string[]>([]);
  const [categoryValues, setCategoryValues] = useState<string[]>([]);
  const [countryValues,  setCountryValues]  = useState<string[]>([]);
  const [sortValues,     setSortValues]     = useState<string[]>([]);

  const toggleStatus   = useCallback((v: string) => setStatusValues(p   => p.includes(v) ? p.filter(x => x !== v) : [...p, v]), []);
  const toggleCategory = useCallback((v: string) => setCategoryValues(p => p.includes(v) ? p.filter(x => x !== v) : [...p, v]), []);
  const toggleCountry  = useCallback((v: string) => setCountryValues(p  => p.includes(v) ? p.filter(x => x !== v) : [...p, v]), []);
  const toggleSort     = useCallback((v: string) => setSortValues(p     => p.includes(v) ? p.filter(x => x !== v) : [...p, v]), []);

  const chipGroups = [
    { filterId: 'mus-stat',  options: MUSIC_STATUS_OPTIONS,   values: statusValues,   onRemove: (v: string) => setStatusValues(p   => p.filter(x => x !== v)) },
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
            placeholder="ابحث في لايف موسيقى"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            dir="rtl"
            aria-label="بحث في فعاليات موسيقى"
            autoComplete="off"
          />
          {searchQuery && (
            <button className="live-search__clear" type="button" onClick={() => setSearchQuery('')} aria-label="مسح البحث">✕</button>
          )}
        </div>
      </div>

      {/* ── 4-Filter Row ──────────────────────────────────────────────────── */}
      <div className="live-filter-area">
        <div className="live-filters" role="group" aria-label="فلاتر فعاليات موسيقى">
          <FilterDropdown label="الحالة"   options={MUSIC_STATUS_OPTIONS}   values={statusValues}   onToggle={toggleStatus}   onClear={() => setStatusValues([])}   ariaLabel="تصفية حسب الحالة" />
          <FilterDropdown label="التصنيف" options={MUSIC_CATEGORY_OPTIONS} values={categoryValues} onToggle={toggleCategory} onClear={() => setCategoryValues([])} ariaLabel="تصفية حسب التصنيف" />
          <FilterDropdown label="البلد"    options={MUSIC_COUNTRY_OPTIONS}  values={countryValues}  onToggle={toggleCountry}  onClear={() => setCountryValues([])}  ariaLabel="تصفية حسب البلد" />
          <FilterDropdown label="الترتيب" options={MUSIC_SORT_OPTIONS}     values={sortValues}     onToggle={toggleSort}     onClear={() => setSortValues([])}     ariaLabel="ترتيب الفعاليات" />
        </div>

        <SelectedChips groups={chipGroups} />

        <button className="fd-subpage-btn live-browse-btn" type="button" aria-label="استعراض الأصناف الموسيقية">
          <svg width="13" height="13" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zm0 8a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zm6-6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zm0 8a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
          </svg>
          استعراض الأصناف
        </button>
      </div>

      {/* ── Featured Hero Carousel — uses live-carousel skeleton ────────── */}
      {FEATURED.length > 0 && (
        <section className="live-carousel" aria-label="الفعاليات المميزة">
          <div className="live-section__header" style={{ padding: '0 1rem' }}>
            <h2 className="live-section__title">فعاليات مميزة</h2>
            <div className="live-carousel__nav" aria-label="تصفح الفعاليات المميزة">
              {/* RTL: السابق → right chevron scrolls track rightward */}
              <button className="live-carousel__btn" onClick={() => scroll('prev')} aria-label="السابق">
                <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
              </button>
              <button className="live-carousel__btn" onClick={() => scroll('next')} aria-label="التالي">
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
        <section className="live-section" aria-label="فعاليات موسيقية نشطة">
          <div className="live-section__header">
            <h2 className="live-section__title">فعاليات الآن</h2>
            <button className="live-section__see-all">عرض الكل</button>
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
        <section className="live-section" aria-label="جلسات الاستماع">
          <div className="live-section__header">
            <h2 className="live-section__title">جلسات الاستماع</h2>
            <button className="live-section__see-all">عرض الكل</button>
          </div>
          <div className="room-list">
            {PARTIES.map(event => <MusicEventRow key={event.id} event={event} />)}
          </div>
        </section>
      )}

      {/* ── من فنانين أتابعهم ─────────────────────────────────────────────── */}
      {FOLLOWING.length > 0 && (
        <section className="live-section" aria-label="من فنانين تتابعهم">
          <div className="live-section__header">
            <h2 className="live-section__title">من فنانين أتابعهم</h2>
          </div>
          <div className="room-list">
            {FOLLOWING.map(event => <MusicEventRow key={event.id} event={event} />)}
          </div>
        </section>
      )}

      {/* ── Create CTA — uses live-create-cta skeleton ────────────────────── */}
      <div className="live-create-cta music-cta" role="region" aria-label="إنشاء فعالية موسيقية">
        <div className="live-create-cta__icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="currentColor" width="28" height="28">
            <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
          </svg>
        </div>
        <div className="live-create-cta__text">
          <p className="live-create-cta__label">
            هل تريد بدء فعالية موسيقية؟
            <span className="live-create-cta__eligibility">حسب الأهلية</span>
          </p>
          <p className="live-create-cta__hint">شارك موسيقاك مع المجتمع مباشرة</p>
        </div>
        <button className="live-create-cta__btn music-cta__btn" aria-label="إنشاء فعالية موسيقية">
          إنشاء
        </button>
      </div>

      <p className="live-footer-note">
        فعاليات موسيقى لايف متاحة للمستمعين مجاناً. الإنشاء حسب أهلية الحساب وإعدادات المحتوى.
      </p>
    </>
  );
}
