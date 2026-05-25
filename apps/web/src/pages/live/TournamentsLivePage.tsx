/**
 * Sound Platform — مسابقات Live Page (Phase 5-E)
 * world === "tournaments"
 * Locked: 3px radius · Alexandria/Cairo · dark tokens · RTL
 * Structural classes from LivePage.css only. No بطولات.
 */

import React, { useState, useCallback, useRef } from 'react';
import { FilterDropdown, SelectedChips, type FilterOption } from '../../components/FilterDropdown';
import '../LivePage.css';
import './TournamentsLivePage.css';

// ─── Filter options ────────────────────────────────────────────────────────────

const COMP_STATUS_OPTIONS: FilterOption[] = [
  { value: 'live_now',   label: 'يجري الآن' },
  { value: 'voting',     label: 'تصويت مفتوح' },
  { value: 'final',      label: 'المرحلة النهائية' },
  { value: 'upcoming',   label: 'قريباً' },
  { value: 'following',  label: 'من أتابعهم' },
];

const COMP_CATEGORY_OPTIONS: FilterOption[] = [
  { value: 'poetry',    label: 'شعر' },
  { value: 'voice',     label: 'صوت' },
  { value: 'music',     label: 'موسيقى' },
  { value: 'story',     label: 'قصة' },
  { value: 'comedy',    label: 'كوميديا' },
  { value: 'debate',    label: 'نقاش' },
  { value: 'quiz',      label: 'مسابقة معرفة' },
];

const COMP_COUNTRY_OPTIONS: FilterOption[] = [
  { value: 'sa',   label: 'السعودية' },
  { value: 'eg',   label: 'مصر' },
  { value: 'ae',   label: 'الإمارات' },
  { value: 'kw',   label: 'الكويت' },
  { value: 'jo',   label: 'الأردن' },
  { value: 'intl', label: 'عالمي' },
];

const COMP_SORT_OPTIONS: FilterOption[] = [
  { value: 'viewers_desc', label: 'الأعلى مشاهدةً' },
  { value: 'live_now',     label: 'يجري الآن' },
  { value: 'votes_desc',   label: 'الأكثر تصويتاً' },
  { value: 'final_stage',  label: 'المراحل النهائية' },
  { value: 'following',    label: 'من أتابعهم' },
  { value: 'newest',       label: 'الأحدث إضافة' },
];

// ─── Types ─────────────────────────────────────────────────────────────────────

interface Competition {
  id: string;
  title: string;
  host: string;
  hostHandle: string;
  category: string;
  country: string;
  viewers: string;
  votes?: string;
  stage: 'final' | 'semi' | 'voting' | 'qualifying';
  isFeatured?: boolean;
  isFollowed?: boolean;
  isLive: boolean;
  startTime?: string;
  coverInitials: string;
  coverColor: string;
  accentColor: string;
  participantsCount?: number;
}

// ─── Mock data ─────────────────────────────────────────────────────────────────

const ALL_COMPS: Competition[] = [
  {
    id: 'c1', title: 'نهائي مسابقة الشعر الخليجي', host: 'منصة ساوند', hostHandle: 'sound@',
    category: 'شعر', country: 'السعودية', viewers: '18.2K', votes: '4.1K',
    stage: 'final', isFeatured: true, isLive: true,
    coverInitials: 'شع', coverColor: '#1a0a2e', accentColor: '#a855f7', participantsCount: 8,
  },
  {
    id: 'c2', title: 'تحدي الأصوات الذهبية', host: 'نادي الأصوات', hostHandle: 'voices_club@',
    category: 'صوت', country: 'مصر', viewers: '12.7K', votes: '2.9K',
    stage: 'semi', isFeatured: true, isLive: true,
    coverInitials: 'أص', coverColor: '#071a10', accentColor: '#22c55e', participantsCount: 16,
  },
  {
    id: 'c3', title: 'مسابقة القصة القصيرة', host: 'دار القصة', hostHandle: 'story_house@',
    category: 'قصة', country: 'الأردن', viewers: '6.3K',
    stage: 'voting', isFeatured: true, isLive: true,
    coverInitials: 'قص', coverColor: '#1a120a', accentColor: '#f59e0b', participantsCount: 24,
  },
  {
    id: 'c4', title: 'كأس الكوميديا الصوتية', host: 'كوميكس لايف', hostHandle: 'comix_live@',
    category: 'كوميديا', country: 'الكويت', viewers: '9.1K',
    stage: 'qualifying', isFollowed: true, isLive: true,
    coverInitials: 'كم', coverColor: '#1a0808', accentColor: '#ef4444', participantsCount: 32,
  },
  {
    id: 'c5', title: 'تحدي الموسيقى العربية', host: 'موسيقانا', hostHandle: 'musiqa_na@',
    category: 'موسيقى', country: 'لبنان', viewers: '7.5K', votes: '1.8K',
    stage: 'semi', isFollowed: true, isLive: true,
    coverInitials: 'مو', coverColor: '#080818', accentColor: '#3b82f6', participantsCount: 12,
  },
  {
    id: 'c6', title: 'نقاش الأسبوع الكبير', host: 'منتدى الرأي', hostHandle: 'raay_forum@',
    category: 'نقاش', country: 'الإمارات', viewers: '5.2K',
    stage: 'qualifying', isFollowed: true, isLive: false, startTime: '9:00 م',
    coverInitials: 'نق', coverColor: '#0e0a1a', accentColor: '#8b5cf6', participantsCount: 6,
  },
];

const FEATURED  = ALL_COMPS.filter(c => c.isFeatured);
const ACTIVE    = ALL_COMPS.filter(c => c.isLive && !c.isFeatured);
const FOLLOWING = ALL_COMPS.filter(c => c.isFollowed);

const STAGE_LABEL: Record<Competition['stage'], string> = {
  final:      'المرحلة النهائية',
  semi:       'نصف النهائي',
  voting:     'تصويت مفتوح',
  qualifying: 'التصفيات',
};

const STAGE_CLASS: Record<Competition['stage'], string> = {
  final:      'comp-stage--final',
  semi:       'comp-stage--semi',
  voting:     'comp-stage--voting',
  qualifying: 'comp-stage--qualify',
};

// ─── Competition Hero Card ─────────────────────────────────────────────────────

function CompHeroCard({ comp }: { comp: Competition }) {
  return (
    <div
      className="live-feat-card comp-hero-card"
      style={{ background: `linear-gradient(160deg, ${comp.coverColor} 0%, #0d0c0a 100%)` }}
      aria-label={`مسابقة مميزة: ${comp.title}`}
    >
      <div
        className="comp-hero__glow"
        style={{ background: `radial-gradient(ellipse at 75% 25%, ${comp.accentColor}38 0%, transparent 68%)` }}
        aria-hidden="true"
      />

      <div className="comp-hero__top">
        {comp.isLive ? (
          <span className="live-hero__badge comp-live-badge">
            <span className="live-hero__pulse" aria-hidden="true" />
            لايف
          </span>
        ) : (
          <span className="comp-upcoming-badge">قريباً · {comp.startTime}</span>
        )}
        <span className={`comp-stage-tag ${STAGE_CLASS[comp.stage]}`}>
          {STAGE_LABEL[comp.stage]}
        </span>
      </div>

      <div className="comp-hero__spacer" aria-hidden="true" />

      <div className="comp-hero__overlay">
        <h3 className="live-hero__title">{comp.title}</h3>

        <div className="live-hero__body" style={{ marginBottom: '0.5rem' }}>
          <div
            className="room-avatar"
            style={{ '--avatar-color': `${comp.accentColor}25` } as React.CSSProperties}
            aria-hidden="true"
          >
            <span className="room-avatar__initials" style={{ color: comp.accentColor }}>
              {comp.coverInitials[0]}
            </span>
          </div>
          <div className="live-hero__text">
            <p className="live-hero__host">{comp.host} · {comp.hostHandle}</p>
            <div className="live-hero__meta">
              <span className="live-hero__meta-item live-hero__meta-item--cyan">
                <svg className="live-hero__meta-icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                </svg>
                {comp.viewers} مشاهد
              </span>
              {comp.votes && <span className="live-hero__meta-item">{comp.votes} صوت</span>}
              {comp.participantsCount && (
                <span className="live-hero__meta-item">{comp.participantsCount} مشارك</span>
              )}
            </div>
          </div>
        </div>

        <div className="live-hero__actions">
          <button
            className="live-hero__join-btn"
            style={{ background: comp.accentColor, borderColor: comp.accentColor }}
            aria-label={`مشاهدة ${comp.title}`}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M8 5v14l11-7z"/>
            </svg>
            مشاهدة
          </button>
          {comp.stage === 'voting' && (
            <button className="live-hero__preview-btn comp-vote-btn" aria-label="تصويت">
              تصويت
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Competition Row ───────────────────────────────────────────────────────────

function CompRow({ comp }: { comp: Competition }) {
  return (
    <article className="room-row comp-row" role="listitem" dir="rtl">
      <div
        className="room-avatar comp-row__cover"
        style={{
          background: `linear-gradient(135deg, ${comp.coverColor} 0%, ${comp.accentColor}55 100%)`,
          '--avatar-color': comp.accentColor,
        } as React.CSSProperties}
        aria-hidden="true"
      >
        <span className="room-avatar__initials" style={{ color: comp.accentColor }}>
          {comp.coverInitials}
        </span>
      </div>

      <div className="room-row__info">
        <p className="room-row__title">{comp.title}</p>
        <p className="room-row__meta">{comp.host} · {comp.category}</p>
        <div className="room-row__stats">
          <span className="room-row__stat room-row__stat--listeners">
            <svg className="room-row__stat-icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5z"/>
            </svg>
            {comp.viewers}
          </span>
          <span className={`comp-stage-tag comp-stage-tag--sm ${STAGE_CLASS[comp.stage]}`}>
            {STAGE_LABEL[comp.stage]}
          </span>
          {comp.isLive
            ? <span className="room-row__badge room-row__badge--live">لايف</span>
            : <span className="room-row__badge room-row__badge--guest">{comp.startTime}</span>
          }
        </div>
      </div>

      <button
        className="room-row__join-btn"
        style={{ borderColor: `${comp.accentColor}55`, color: comp.accentColor }}
        aria-label={`مشاهدة ${comp.title}`}
      >
        {comp.stage === 'voting' ? 'تصويت' : 'مشاهدة'}
      </button>
    </article>
  );
}

// ─── Ad card ──────────────────────────────────────────────────────────────────

function CompAdCard() {
  return (
    <div className="live-sponsor comp-ad" role="complementary" aria-label="إعلان">
      <span className="live-sponsor__tag">إعلان</span>
      <div className="live-sponsor__body">
        <div className="live-sponsor__icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22">
            <path d="M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v1c0 2.55 1.92 4.63 4.39 4.94A5.01 5.01 0 0011 15.9V18H9v2h6v-2h-2v-2.1a5.01 5.01 0 003.61-2.96C19.08 12.63 21 10.55 21 8V7c0-1.1-.9-2-2-2z"/>
          </svg>
        </div>
        <div className="live-sponsor__text">
          <p className="live-sponsor__name">Sound مسابقات برو</p>
          <p className="live-sponsor__desc">أنشئ مسابقتك الخاصة · جمهور مباشر · جوائز حقيقية</p>
        </div>
      </div>
      <button className="live-sponsor__cta" aria-label="اكتشف Sound مسابقات برو">اكتشف</button>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export function TournamentsLivePage() {
  const [statusValues,   setStatusValues]   = useState<string[]>([]);
  const [categoryValues, setCategoryValues] = useState<string[]>([]);
  const [countryValues,  setCountryValues]  = useState<string[]>([]);
  const [sortValues,     setSortValues]     = useState<string[]>([]);

  const toggleStatus   = useCallback((v: string) => setStatusValues(p   => p.includes(v) ? p.filter(x => x !== v) : [...p, v]), []);
  const toggleCategory = useCallback((v: string) => setCategoryValues(p => p.includes(v) ? p.filter(x => x !== v) : [...p, v]), []);
  const toggleCountry  = useCallback((v: string) => setCountryValues(p  => p.includes(v) ? p.filter(x => x !== v) : [...p, v]), []);
  const toggleSort     = useCallback((v: string) => setSortValues(p     => p.includes(v) ? p.filter(x => x !== v) : [...p, v]), []);

  const chipGroups = [
    { filterId: 'cp-stat', options: COMP_STATUS_OPTIONS,   values: statusValues,   onRemove: (v: string) => setStatusValues(p   => p.filter(x => x !== v)) },
    { filterId: 'cp-cat',  options: COMP_CATEGORY_OPTIONS, values: categoryValues, onRemove: (v: string) => setCategoryValues(p => p.filter(x => x !== v)) },
    { filterId: 'cp-cty',  options: COMP_COUNTRY_OPTIONS,  values: countryValues,  onRemove: (v: string) => setCountryValues(p  => p.filter(x => x !== v)) },
    { filterId: 'cp-srt',  options: COMP_SORT_OPTIONS,     values: sortValues,     onRemove: (v: string) => setSortValues(p     => p.filter(x => x !== v)) },
  ];

  const [searchQuery, setSearchQuery] = useState('');

  const trackRef = useRef<HTMLDivElement>(null);
  const scroll = (dir: 'prev' | 'next') => {
    const el = trackRef.current;
    if (!el) return;
    el.scrollBy({ left: dir === 'next' ? -300 : 300, behavior: 'smooth' });
  };

  return (
    <>
      {/* ── Search ─────────────────────────────────────────────────────────── */}
      <div className="live-search-wrap" role="search">
        <div className="live-search">
          <svg className="live-search__icon" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
          </svg>
          <input
            id="comp-live-search-input"
            className="live-search__input"
            type="search"
            placeholder="ابحث في مسابقات لايف"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            dir="rtl"
            aria-label="بحث في مسابقات"
            autoComplete="off"
          />
          {searchQuery && (
            <button className="live-search__clear" type="button" onClick={() => setSearchQuery('')} aria-label="مسح البحث">✕</button>
          )}
        </div>
      </div>

      {/* ── 4-Filter Row ────────────────────────────────────────────────────── */}
      <div className="live-filter-area">
        <div className="live-filters" role="group" aria-label="فلاتر مسابقات لايف">
          <FilterDropdown label="الحالة"   options={COMP_STATUS_OPTIONS}   values={statusValues}   onToggle={toggleStatus}   onClear={() => setStatusValues([])}   ariaLabel="تصفية حسب الحالة" />
          <FilterDropdown label="التصنيف" options={COMP_CATEGORY_OPTIONS} values={categoryValues} onToggle={toggleCategory} onClear={() => setCategoryValues([])} ariaLabel="تصفية حسب التصنيف" />
          <FilterDropdown label="البلد"    options={COMP_COUNTRY_OPTIONS}  values={countryValues}  onToggle={toggleCountry}  onClear={() => setCountryValues([])}  ariaLabel="تصفية حسب البلد" />
          <FilterDropdown label="الترتيب" options={COMP_SORT_OPTIONS}     values={sortValues}     onToggle={toggleSort}     onClear={() => setSortValues([])}     ariaLabel="ترتيب المسابقات" />
        </div>

        <SelectedChips groups={chipGroups} />

        <button className="fd-subpage-btn live-browse-btn" type="button" aria-label="استعراض أصناف المسابقات">
          <svg width="13" height="13" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zm0 8a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zm6-6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zm0 8a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
          </svg>
          استعراض الأصناف
        </button>
      </div>

      {/* ── Featured Carousel ────────────────────────────────────────────────── */}
      {FEATURED.length > 0 && (
        <section className="live-carousel" aria-label="المسابقات المميزة">
          <div className="live-section__header" style={{ padding: '0 1rem' }}>
            <h2 className="live-section__title">مسابقات مميزة</h2>
            <div className="live-carousel__nav" aria-label="تصفح المسابقات">
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
            {FEATURED.map(comp => <CompHeroCard key={comp.id} comp={comp} />)}
          </div>
        </section>
      )}

      {/* ── يجري الآن ───────────────────────────────────────────────────────── */}
      {ACTIVE.length > 0 && (
        <section className="live-section" aria-label="مسابقات تجري الآن">
          <div className="live-section__header">
            <h2 className="live-section__title">يجري الآن</h2>
            <button className="live-section__see-all">عرض الكل</button>
          </div>
          <div className="room-list">
            {ACTIVE.map(comp => <CompRow key={comp.id} comp={comp} />)}
          </div>
        </section>
      )}

      {/* ── Ad card ──────────────────────────────────────────────────────────── */}
      <CompAdCard />

      {/* ── من أتابعهم ──────────────────────────────────────────────────────── */}
      {FOLLOWING.length > 0 && (
        <section className="live-section" aria-label="مسابقات من أتابعهم">
          <div className="live-section__header">
            <h2 className="live-section__title">من أتابعهم</h2>
          </div>
          <div className="room-list">
            {FOLLOWING.map(comp => <CompRow key={comp.id} comp={comp} />)}
          </div>
        </section>
      )}

      {/* ── Create CTA ───────────────────────────────────────────────────────── */}
      <div className="live-create-cta comp-cta" role="region" aria-label="إنشاء مسابقة">
        <div className="live-create-cta__icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="currentColor" width="28" height="28">
            <path d="M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v1c0 2.55 1.92 4.63 4.39 4.94A5.01 5.01 0 0011 15.9V18H9v2h6v-2h-2v-2.1a5.01 5.01 0 003.61-2.96C19.08 12.63 21 10.55 21 8V7c0-1.1-.9-2-2-2z"/>
          </svg>
        </div>
        <div className="live-create-cta__text">
          <p className="live-create-cta__label">
            هل تريد إنشاء مسابقة؟
            <span className="live-create-cta__eligibility">حسب الأهلية</span>
          </p>
          <p className="live-create-cta__hint">افتح التصويت وشارك جمهورك مباشرة</p>
        </div>
        <button className="live-create-cta__btn comp-cta__btn" aria-label="إنشاء مسابقة">
          إنشاء
        </button>
      </div>

      <p className="live-footer-note">
        مسابقات لايف مفتوحة للمشاهدة والتصويت للجميع. الإنشاء حسب أهلية الحساب.
      </p>
    </>
  );
}
