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

import React, { useState } from 'react';
import './GeneralHomePage.css';
import { FilterDropdown, SelectedChips, type FilterOption } from '../components/FilterDropdown';

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
// Replace with useGeneralHomeFeed() or equivalent when backend is ready.

const STORY_ITEMS: StoryItem[] = [
  { uid: 'self',  displayName: 'قصتك',   isSelf: true },
  { uid: 'su1',   displayName: 'لينا'   },
  { uid: 'su2',   displayName: 'سامر'   },
  { uid: 'su3',   displayName: 'نور'    },
  { uid: 'su4',   displayName: 'ريم'    },
  { uid: 'su5',   displayName: 'عمر'    },
  { uid: 'su6',   displayName: 'هنا'    },
];

const TRENDING_ITEMS: ContentItem[] = [
  { id: 'gt1', title: 'قصص ملهمة',       meta: 'بودكاست أسبوعي',   playCount: '2.4M',  countryFlag: '🇸🇦', tag: 'رائج' },
  { id: 'gt2', title: 'عالم المعرفة',     meta: 'مقالات صوتية',     playCount: '1.8M',  countryFlag: '🇦🇪', tag: 'رائج' },
  { id: 'gt3', title: 'لحظات الصمت',     meta: 'بودكاست تأمل',     playCount: '940K',  countryFlag: '🇪🇬' },
  { id: 'gt4', title: 'شعر الليل',        meta: 'قراءة شعرية',      playCount: '730K',  countryFlag: '🇸🇦', tag: 'جديد' },
];

const RECOMMENDED_ITEMS: ContentItem[] = [
  { id: 'gr1', title: 'لحظات الصمت',     meta: 'بودكاست تأمل',     durationLabel: '18 دقيقة' },
  { id: 'gr2', title: 'قصص من التاريخ',  meta: 'وثائقي صوتي',      durationLabel: '31 دقيقة' },
  { id: 'gr3', title: 'عالم التقنية',    meta: 'مراجعات تقنية',    durationLabel: '22 دقيقة' },
  { id: 'gr4', title: 'الإبداع اليومي', meta: 'قصص قصيرة',         durationLabel: '9 دقائق'  },
];

const TOP_CREATORS: CreatorItem[] = [
  { uid: 'gc1', displayName: 'أحمد عادل',   handle: '@aadel',   followerLabel: '980K متابع',  specialty: 'بودكاست', countryFlag: '🇸🇦' },
  { uid: 'gc2', displayName: 'سارة ملك',    handle: '@smalek',  followerLabel: '1.2M متابع',  specialty: 'قصص',     countryFlag: '🇦🇪' },
  { uid: 'gc3', displayName: 'خالد نور',    handle: '@knour',   followerLabel: '650K متابع',  specialty: 'تأمل',    countryFlag: '🇸🇦' },
  { uid: 'gc4', displayName: 'دينا علي',    handle: '@dali',    followerLabel: '420K متابع',  specialty: 'شعر',     countryFlag: '🇪🇬' },
];

const RISING_CREATORS: CreatorItem[] = [
  { uid: 'grc1', displayName: 'ليلى'   },
  { uid: 'grc2', displayName: 'عمران'  },
  { uid: 'grc3', displayName: 'مايا'   },
  { uid: 'grc4', displayName: 'ياسين'  },
  { uid: 'grc5', displayName: 'دينا'   },
];

const FOLLOWING_CREATORS: CreatorItem[] = [
  { uid: 'gf1', displayName: 'هنا إبراهيم', handle: '@hana',  followerLabel: 'محتوى حصري جديد متاح الآن' },
  { uid: 'gf2', displayName: 'فارس خليل',   handle: '@fares', followerLabel: 'آخر نشاط منذ ساعة'         },
];

const PLAYLISTS: PlaylistItem[] = [
  { id: 'gp1', title: 'أفضل ما في الأسبوع',   tag: 'مختارة لك',   trackCount: '12 قطعة'  },
  { id: 'gp2', title: 'أجواء التركيز',          tag: 'استرخاء',     trackCount: '8 قطع'   },
];

// ─── Filter Options — الحالة | التصنيف | البلد | الترتيب ─────────────────────
// Axis order is locked by UX spec: do not reorder.

const STATUS_OPTIONS: FilterOption[] = [
  { value: 'new',        label: 'جديد'       },
  { value: 'trending',   label: 'رائج'       },
  { value: 'featured',   label: 'مميز'       },
  { value: 'saved',      label: 'محفوظ'      },
  { value: 'unplayed',   label: 'لم يُشغَّل' },
];

const CATEGORY_OPTIONS: FilterOption[] = [
  { value: 'story',      label: 'قصص'        },
  { value: 'podcast',    label: 'بودكاست'    },
  { value: 'poetry',     label: 'شعر'        },
  { value: 'meditation', label: 'تأمل'       },
  { value: 'quran',      label: 'تلاوة'      },
  { value: 'comedy',     label: 'كوميديا'    },
  { value: 'kids',       label: 'أطفال'      },
];

const COUNTRY_OPTIONS: FilterOption[] = [
  { value: 'sa',   label: '🇸🇦 السعودية'     },
  { value: 'ae',   label: '🇦🇪 الإمارات'     },
  { value: 'eg',   label: '🇪🇬 مصر'          },
  { value: 'kw',   label: '🇰🇼 الكويت'       },
  { value: 'jo',   label: '🇯🇴 الأردن'        },
  { value: 'ma',   label: '🇲🇦 المغرب'        },
  { value: 'dz',   label: '🇩🇿 الجزائر'      },
];

const SORT_OPTIONS: FilterOption[] = [
  { value: 'latest',    label: 'الأحدث'            },
  { value: 'popular',   label: 'الأكثر استماعاً'   },
  { value: 'shared',    label: 'الأكثر مشاركة'    },
  { value: 'saved',     label: 'الأكثر حفظاً'      },
  { value: 'rising',    label: 'الأكثر صعوداً'    },
  { value: 'following', label: 'من تتابعهم'        },
  { value: 'suggested', label: 'المقترح لك'        },
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

  return (
    <main className="ghp" aria-label="الرئيسية — عام">

      {/* ── Stories / Quick Circles ──────────────────────────────────────────── */}
      {hasStories && (
        <section aria-label="القصص السريعة">
          <div className="ghp-story-row">
            {STORY_ITEMS.map((item) => (
              <button
                key={item.uid}
                className="ghp-story-item"
                aria-label={item.isSelf ? 'إضافة قصة' : `قصة ${item.displayName}`}
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
      <section aria-label="بحث وتصفية">

        {/* Search bar */}
        <div className="ghp-search">
          <input
            id="ghp-search-input"
            className="ghp-search__input"
            type="search"
            placeholder="ابحث عن صوت، قصة، بودكاست..."
            autoComplete="off"
            dir="rtl"
          />
          <span className="ghp-search__icon">
            <IconSearch />
          </span>
        </div>

        {/* Four-axis filter dropdowns */}
        <div className="ghp-filters" style={{ marginTop: 'var(--space-3)' }}>
          <FilterDropdown
            label="الحالة"
            options={STATUS_OPTIONS}
            values={statuses}
            onToggle={toggle(setStatuses)}
            onClear={() => setStatuses([])}
            defaultLabel="الكل"
            ariaLabel="تصفية حسب الحالة"
          />
          <FilterDropdown
            label="التصنيف"
            options={CATEGORY_OPTIONS}
            values={categories}
            onToggle={toggle(setCategories)}
            onClear={() => setCategories([])}
            defaultLabel="الكل"
            ariaLabel="تصفية حسب التصنيف"
          />
          <FilterDropdown
            label="البلد"
            options={COUNTRY_OPTIONS}
            values={countries}
            onToggle={toggle(setCountries)}
            onClear={() => setCountries([])}
            defaultLabel="الكل"
            ariaLabel="تصفية حسب البلد"
          />
          <FilterDropdown
            label="الترتيب"
            options={SORT_OPTIONS}
            values={sortOrders}
            onToggle={toggle(setSortOrders)}
            onClear={() => setSortOrders([])}
            defaultLabel="الأحدث"
            ariaLabel="تصفية حسب الترتيب"
          />
        </div>

        {/* Selected filter chips — each has X remove button */}
        <SelectedChips
          groups={[
            { filterId: 'status',    options: STATUS_OPTIONS,   values: statuses,   onRemove: toggle(setStatuses)   },
            { filterId: 'category',  options: CATEGORY_OPTIONS, values: categories, onRemove: toggle(setCategories) },
            { filterId: 'country',   options: COUNTRY_OPTIONS,  values: countries,  onRemove: toggle(setCountries)  },
            { filterId: 'sortOrder', options: SORT_OPTIONS,     values: sortOrders, onRemove: toggle(setSortOrders) },
          ]}
        />

        {/* CTA — browse categories subpage */}
        <button
          className="ghp-subpage-btn"
          type="button"
          onClick={() => { /* navigate to /general/discover */ }}
          aria-label="استعراض الأصناف"
        >
          <span>استعراض الأصناف</span>
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
            <h2 id="ghp-trending-heading" className="ghp-section__title">الرائج الآن</h2>
            <button className="ghp-section__see-all" aria-label="عرض كل الرائج">عرض الكل</button>
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
            <h2 id="ghp-top-creators-heading" className="ghp-section__title">أبرز المبدعين</h2>
            <button className="ghp-section__see-all" aria-label="عرض كل المبدعين">عرض الكل</button>
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
                  aria-label={`متابعة ${creator.displayName}`}
                >
                  متابعة
                </button>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* ── Plus Banner — editorial, not capability-gated ────────────────────── */}
      <section aria-label="اشتراك بلس">
        <div className="ghp-plus-banner" role="complementary">
          <div className="ghp-plus-banner__text">
            <p className="ghp-plus-banner__eyebrow">بلس</p>
            <p className="ghp-plus-banner__headline">استمتع بتجربة صوتية بلا إعلانات مع اشتراك بلس</p>
          </div>
          <button className="ghp-plus-banner__cta" aria-label="اشترك في بلس الآن">
            اشترك الآن
          </button>
        </div>
      </section>

      {/* ── Recommended for You ──────────────────────────────────────────────── */}
      {hasRecommend && (
        <section aria-labelledby="ghp-recommended-heading">
          <div className="ghp-section__header">
            <h2 id="ghp-recommended-heading" className="ghp-section__title">مقترح لك</h2>
            <button className="ghp-section__see-all" aria-label="عرض كل المقترحات">عرض الكل</button>
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
            <h2 id="ghp-playlists-heading" className="ghp-section__title">قوائم التشغيل</h2>
            <button className="ghp-section__see-all" aria-label="عرض كل القوائم">عرض الكل</button>
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
            <h2 id="ghp-rising-heading" className="ghp-section__title">مبدعون صاعدون</h2>
            <button className="ghp-section__see-all" aria-label="عرض كل المبدعين الصاعدين">عرض الكل</button>
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
            <h2 id="ghp-following-heading" className="ghp-section__title">مبدعون تتابعهم</h2>
            <button className="ghp-section__see-all" aria-label="عرض كل من تتابعهم">عرض الكل</button>
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
