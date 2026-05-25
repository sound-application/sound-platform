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
  { id: 'explore',   label: 'اكتشف'    },
  { id: 'foryou',    label: 'لك'       },
  { id: 'following', label: 'المتابعة' },
  { id: 'trending',  label: 'الرائج'   },
];

// ─── Category Chips ───────────────────────────────────────────────────────────

const CATEGORY_CHIPS: CategoryChip[] = [
  { id: 'all',       label: 'الكل'     },
  { id: 'poetry',    label: 'شعر'      },
  { id: 'story',     label: 'قصص'      },
  { id: 'podcast',   label: 'بودكاست'  },
  { id: 'quran',     label: 'تلاوة'    },
  { id: 'comedy',    label: 'كوميديا'  },
  { id: 'kids',      label: 'أطفال'    },
  { id: 'meditation',label: 'تأمل'     },
];

// ─── Static Representative Data ───────────────────────────────────────────────

const FEATURED: FeaturedItem = {
  id: 'feat-1',
  title: 'حديث المساء',
  creatorName: 'نورة منصور',
  creatorHandle: '@noura.voice',
  categoryLabel: 'ثقافة',
  playCount: '84K',
  durationLabel: '38 دقيقة',
};

const TRENDING_CARDS: ContentCard[] = [
  { id: 'tc1', title: 'قهوة الصباح',  meta: 'بودكاست أسبوعي', playCount: '84K',  countryFlag: '🇸🇦', tag: 'رائج' },
  { id: 'tc2', title: 'قصص المدن',    meta: 'وثائقي صوتي',    playCount: '19K',  countryFlag: '🇦🇪', tag: 'رائج' },
  { id: 'tc3', title: 'شعر الليل',    meta: 'قراءة شعرية',    playCount: '55K',  countryFlag: '🇸🇦' },
  { id: 'tc4', title: 'نافذة التاريخ',meta: 'قصص تاريخية',   playCount: '31K',  countryFlag: '🇪🇬' },
];

const SUGGESTED_LIST: ListItem[] = [
  { id: 'sl1', title: 'نقاش التقنية',   meta: 'خالد أيمن',  durationLabel: '22 دقيقة' },
  { id: 'sl2', title: 'حكايات الطريق',  meta: 'فهد الراوي', durationLabel: '17 دقيقة' },
  { id: 'sl3', title: 'لحظات هادئة',    meta: 'ريم الحلو',  durationLabel: '9 دقائق'  },
];

const TOP_CREATORS: CreatorItem[] = [
  { uid: 'dc1', displayName: 'أحمد السالمي',  handle: '@alsalmi.sound', followerLabel: '1.2M متابع',  specialty: 'ثقافة', countryFlag: '🇸🇦' },
  { uid: 'dc2', displayName: 'عبير العلمان',  handle: '@abeer.voice',   followerLabel: '890K متابع',  specialty: 'قصص',   countryFlag: '🇰🇼' },
];

const PLAYLISTS: PlaylistCard[] = [
  { id: 'dp1', title: 'مختارات الثقافة', tag: 'محررة',      trackCount: '14 قطعة' },
  { id: 'dp2', title: 'أصوات المساء',    tag: 'مقترحة لك',  trackCount: '9 قطع'   },
];

const RISING_CREATORS: CreatorItem[] = [
  { uid: 'drc1', displayName: 'ريان منصور', countryFlag: '🇸🇦' },
  { uid: 'drc2', displayName: 'لبان أحمد',  countryFlag: '🇦🇪' },
  { uid: 'drc3', displayName: 'سند الحارثي',countryFlag: '🇸🇦' },
  { uid: 'drc4', displayName: 'نجلاء بدر',  countryFlag: '🇪🇬' },
];

const RANDOM_CARDS: RandomCard[] = [
  { id: 'rnd1', title: 'مقهى الإبداع',   meta: 'قصص قصيرة',   accentColor: '#7c3aed' },
  { id: 'rnd2', title: 'رحلة صوتية',     meta: 'وثائقي صوتي', accentColor: '#0e7490' },
];

// ─── Filter Options ────────────────────────────────────────────────────────────

const WORLD_OPTIONS: FilterOption[] = [
  { value: 'general',     label: 'عام'      },
  { value: 'plus',        label: 'بلس'      },
  { value: 'music',       label: 'موسيقى'   },
  { value: 'radio',       label: 'راديو'    },
];

const SORT_OPTIONS: FilterOption[] = [
  { value: 'popular',  label: 'الأكثر استماعاً' },
  { value: 'latest',   label: 'الأحدث'           },
  { value: 'rising',   label: 'الأكثر صعوداً'    },
  { value: 'shared',   label: 'الأكثر مشاركة'    },
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
    <main className="gdp" dir="rtl" aria-label="اكتشف — عام">

      {/* ── Locked Sub-Navigation: اكتشف | لك | المتابعة | الرائج ─────────── */}
      <nav className="gdp-sub-nav" aria-label="تبويبات الاكتشاف" role="tablist">
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
      <section className="gdp-context-bar" aria-label="السياق الحالي">
        <div className="gdp-context-bar__info">
          <span className="gdp-context-bar__label">السياق الحالي</span>
          <div className="gdp-context-bar__values">
            <span className="gdp-context-bar__chip">عام</span>
            <span className="gdp-context-bar__chip">ثقافة</span>
            <span className="gdp-context-bar__chip gdp-context-bar__chip--dim">السعودية</span>
          </div>
        </div>
        <div className="gdp-context-bar__filters">
          <FilterDropdown
            label="العالم"
            options={WORLD_OPTIONS}
            values={worlds}
            onToggle={toggleWorld}
            onClear={() => setWorlds([])}
            defaultLabel="عام"
            ariaLabel="تصفية حسب العالم"
          />
          <FilterDropdown
            label="الترتيب"
            options={SORT_OPTIONS}
            values={sortOrders}
            onToggle={toggleSort}
            onClear={() => setSortOrders([])}
            defaultLabel="الأحدث"
            ariaLabel="تصفية حسب الترتيب"
          />
        </div>
      </section>

      {/* ── Category Chips ──────────────────────────────────────────────────── */}
      <section aria-label="أصناف التصنيف">
        <div className="gdp-chips-row" role="listbox" aria-label="اختر صنفاً">
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
          <h2 id="gdp-featured-heading" className="gdp-section__title">مميز في التصنيف</h2>
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
            <span>استماع</span>
          </button>
        </article>
      </section>

      {/* ── Trending in Category ─────────────────────────────────────────────── */}
      <section aria-labelledby="gdp-trending-heading">
        <div className="gdp-section__header">
          <h2 id="gdp-trending-heading" className="gdp-section__title">الرائج في التصنيف</h2>
          <button className="gdp-section__see-all" aria-label="عرض كل الرائج">عرض الكل</button>
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
          <h2 id="gdp-suggested-heading" className="gdp-section__title">مقترح لك</h2>
          <button className="gdp-section__see-all" aria-label="عرض كل المقترحات">عرض الكل</button>
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
          <h2 id="gdp-creators-heading" className="gdp-section__title">أفضل المنشئين في التصنيف</h2>
          <button className="gdp-section__see-all" aria-label="عرض كل المنشئين">عرض الكل</button>
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
                متابعة
              </button>
            </article>
          ))}
        </div>
      </section>

      {/* ── Sponsor / Promo Banner ───────────────────────────────────────────── */}
      <section aria-label="عرض ترويجي" className="gdp-promo-wrapper">
        <div className="gdp-promo" role="complementary">
          <span className="gdp-promo__badge">SPONSOR</span>
          <div className="gdp-promo__body">
            <p className="gdp-promo__headline">مساحة رعاية داخل التصنيف</p>
            <p className="gdp-promo__sub">إعلان مناسب للسياق الحالي</p>
          </div>
          <button className="gdp-promo__cta" aria-label="تفاصيل العرض الترويجي">
            تفاصيل
          </button>
        </div>
      </section>

      {/* ── Playlists from Category ──────────────────────────────────────────── */}
      <section aria-labelledby="gdp-playlists-heading">
        <div className="gdp-section__header">
          <h2 id="gdp-playlists-heading" className="gdp-section__title">قوائم من التصنيف</h2>
          <button className="gdp-section__see-all" aria-label="عرض كل القوائم">عرض الكل</button>
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
          <h2 id="gdp-rising-heading" className="gdp-section__title">منشئون صاعدون</h2>
          <button className="gdp-section__see-all" aria-label="عرض كل المنشئين الصاعدين">عرض الكل</button>
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
          <h2 id="gdp-random-heading" className="gdp-section__title">اكتشاف عشوائي</h2>
          <button className="gdp-random-refresh" aria-label="تحديث الاكتشاف العشوائي">
            <IconShuffle />
            <span>تحديث</span>
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
      <section className="gdp-empty-request" aria-label="طلب تصنيف جديد">
        <div className="gdp-empty-request__inner">
          <p className="gdp-empty-request__text">
            لم تجد تصنيفاً مناسباً؟ يمكنك طلب تصنيف جديد أو اقتراح تصنيف فرعي.
          </p>
          <button className="gdp-empty-request__btn" aria-label="طلب تصنيف جديد">
            <IconChevronLeft />
            طلب تصنيف
          </button>
        </div>
      </section>

    </main>
  );
}
