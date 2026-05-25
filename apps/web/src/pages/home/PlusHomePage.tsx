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

// ─── Static Data ──────────────────────────────────────────────────────────────

const STORY_ITEMS: StoryItem[] = [
  { uid: 'self', displayName: 'قصتك', isSelf: true },
  { uid: 'ps1',  displayName: 'نادين' },
  { uid: 'ps2',  displayName: 'كريم'  },
  { uid: 'ps3',  displayName: 'لمى'   },
  { uid: 'ps4',  displayName: 'فهد'   },
  { uid: 'ps5',  displayName: 'رنا'   },
];

const EXCLUSIVE_ITEMS: ContentItem[] = [
  { id: 'pe1', title: 'أسرار النجاح',       meta: 'حصري بلس',     playCount: '3.1M', countryFlag: '🇸🇦', tag: 'حصري',   exclusive: true },
  { id: 'pe2', title: 'مع المبدعين',        meta: 'بودكاست أسبوعي', playCount: '1.9M', countryFlag: '🇦🇪', tag: 'جديد',   exclusive: true },
  { id: 'pe3', title: 'ليالي الشعر',        meta: 'قراءة شعرية',   playCount: '870K', countryFlag: '🇸🇦', exclusive: true },
  { id: 'pe4', title: 'رحلة التأمل اليومي', meta: 'تأمل صوتي',     playCount: '620K', countryFlag: '🇪🇬', tag: 'رائج',   exclusive: true },
];

const TRENDING_ITEMS: ContentItem[] = [
  { id: 'pt1', title: 'قصص ملهمة',    meta: 'بودكاست أسبوعي', playCount: '2.4M', countryFlag: '🇸🇦', tag: 'رائج' },
  { id: 'pt2', title: 'عالم المعرفة', meta: 'مقالات صوتية',   playCount: '1.8M', countryFlag: '🇦🇪' },
  { id: 'pt3', title: 'شعر الليل',    meta: 'قراءة شعرية',   playCount: '730K', countryFlag: '🇸🇦', tag: 'جديد' },
];

const TOP_CREATORS: CreatorItem[] = [
  { uid: 'pc1', displayName: 'أحمد عادل', handle: '@aadel',  followerLabel: '980K متابع', specialty: 'بودكاست حصري', countryFlag: '🇸🇦', plusVerified: true },
  { uid: 'pc2', displayName: 'سارة ملك',  handle: '@smalek', followerLabel: '1.2M متابع', specialty: 'قصص بلس',      countryFlag: '🇦🇪', plusVerified: true },
  { uid: 'pc3', displayName: 'خالد نور',  handle: '@knour',  followerLabel: '650K متابع', specialty: 'تأمل',          countryFlag: '🇸🇦', plusVerified: true },
];

const EXCLUSIVE_ROOMS: RoomItem[] = [
  { id: 'pr1', title: 'غرفة المبدعين — بلس', host: 'أحمد عادل', listeners: '1.4K', live: true  },
  { id: 'pr2', title: 'قراءة جماعية مباشرة', host: 'سارة ملك',  listeners: '890',  live: true  },
  { id: 'pr3', title: 'جلسة تأمل صباحية',    host: 'خالد نور',  listeners: '2.1K', live: false },
];

const PLAYLISTS: PlaylistItem[] = [
  { id: 'pp1', title: 'أفضل بلس هذا الأسبوع', tag: 'حصري بلس', trackCount: '14 قطعة' },
  { id: 'pp2', title: 'أجواء التركيز — بلس',  tag: 'استرخاء',  trackCount: '9 قطع'  },
];

const FOLLOWING: CreatorItem[] = [
  { uid: 'pf1', displayName: 'نادين حسن', followerLabel: 'نشرت محتوى حصراً للمشتركين' },
  { uid: 'pf2', displayName: 'فارس خليل', followerLabel: 'آخر نشاط منذ ساعة' },
];

// ─── Filter Options ───────────────────────────────────────────────────────────

const STATUS_OPTIONS: FilterOption[] = [
  { value: 'new',       label: 'جديد'       },
  { value: 'trending',  label: 'رائج'       },
  { value: 'exclusive', label: 'حصري'       },
  { value: 'saved',     label: 'محفوظ'      },
  { value: 'unplayed',  label: 'لم يُشغَّل' },
];

const CATEGORY_OPTIONS: FilterOption[] = [
  { value: 'podcast',    label: 'بودكاست' },
  { value: 'story',      label: 'قصص'     },
  { value: 'poetry',     label: 'شعر'     },
  { value: 'meditation', label: 'تأمل'    },
  { value: 'interview',  label: 'حوارات'  },
  { value: 'comedy',     label: 'كوميديا' },
];

const COUNTRY_OPTIONS: FilterOption[] = [
  { value: 'sa', label: '🇸🇦 السعودية' },
  { value: 'ae', label: '🇦🇪 الإمارات' },
  { value: 'eg', label: '🇪🇬 مصر'      },
  { value: 'kw', label: '🇰🇼 الكويت'   },
  { value: 'jo', label: '🇯🇴 الأردن'   },
  { value: 'ma', label: '🇲🇦 المغرب'   },
];

const SORT_OPTIONS: FilterOption[] = [
  { value: 'latest',    label: 'الأحدث'          },
  { value: 'popular',   label: 'الأكثر استماعاً' },
  { value: 'exclusive', label: 'الحصري أولاً'    },
  { value: 'following', label: 'من تتابعهم'      },
  { value: 'suggested', label: 'المقترح لك'      },
];

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
  const [statuses,   setStatuses]   = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [countries,  setCountries]  = useState<string[]>([]);
  const [sortOrders, setSortOrders] = useState<string[]>([]);

  function toggle(setter: React.Dispatch<React.SetStateAction<string[]>>) {
    return (v: string) =>
      setter(prev => prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v]);
  }

  return (
    <main className="php" aria-label="الرئيسية — بلس">

      {/* ── Stories ──────────────────────────────────────────────────────────── */}
      <section aria-label="القصص السريعة">
        <div className="php-story-row">
          {STORY_ITEMS.map(item => (
            <button key={item.uid} className="php-story-item"
                    aria-label={item.isSelf ? 'إضافة قصة' : `قصة ${item.displayName}`}>
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
      <section aria-label="اشتراك بلس">
        <div className="php-hero">
          <div className="php-hero__glow" aria-hidden="true" />
          <div>
            <p className="php-hero__eyebrow">SOUND PLUS</p>
            <p className="php-hero__headline">محتوى حصري بلا حدود — بلا إعلانات</p>
            <p className="php-hero__sub">آلاف الساعات الصوتية الحصرية من أبرز المبدعين</p>
          </div>
          <button className="php-hero__cta" aria-label="اشترك في بلس الآن">
            اشترك الآن
          </button>
        </div>
      </section>

      {/* ── Search + Smart Filters ───────────────────────────────────────────── */}
      <section aria-label="بحث وتصفية">
        <div className="php-search">
          <input id="php-search-input" className="php-search__input"
                 type="search" placeholder="ابحث في محتوى بلس..."
                 autoComplete="off" dir="rtl" />
          <span className="php-search__icon"><IconSearch /></span>
        </div>

        <div className="php-filters" style={{ marginTop: 'var(--space-3)' }}>
          <FilterDropdown label="الحالة"   options={STATUS_OPTIONS}   values={statuses}
            onToggle={toggle(setStatuses)}   onClear={() => setStatuses([])}
            defaultLabel="الكل" ariaLabel="تصفية حسب الحالة" />
          <FilterDropdown label="التصنيف"  options={CATEGORY_OPTIONS} values={categories}
            onToggle={toggle(setCategories)} onClear={() => setCategories([])}
            defaultLabel="الكل" ariaLabel="تصفية حسب التصنيف" />
          <FilterDropdown label="البلد"    options={COUNTRY_OPTIONS}  values={countries}
            onToggle={toggle(setCountries)}  onClear={() => setCountries([])}
            defaultLabel="الكل" ariaLabel="تصفية حسب البلد" />
          <FilterDropdown label="الترتيب" options={SORT_OPTIONS}     values={sortOrders}
            onToggle={toggle(setSortOrders)} onClear={() => setSortOrders([])}
            defaultLabel="الأحدث" ariaLabel="تصفية حسب الترتيب" />
        </div>

        <SelectedChips groups={[
          { filterId: 'status',    options: STATUS_OPTIONS,   values: statuses,   onRemove: toggle(setStatuses)   },
          { filterId: 'category',  options: CATEGORY_OPTIONS, values: categories, onRemove: toggle(setCategories) },
          { filterId: 'country',   options: COUNTRY_OPTIONS,  values: countries,  onRemove: toggle(setCountries)  },
          { filterId: 'sortOrder', options: SORT_OPTIONS,     values: sortOrders, onRemove: toggle(setSortOrders) },
        ]} />

        <button className="php-subpage-btn" type="button" aria-label="استعراض أصناف بلس">
          <span>استعراض الأصناف</span>
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
            محتوى حصري
            <span className="php-section__title-badge">PLUS</span>
          </h2>
          <button className="php-section__see-all" aria-label="عرض كل المحتوى الحصري">عرض الكل</button>
        </div>
        <div className="php-h-scroll">
          {EXCLUSIVE_ITEMS.map(item => (
            <article key={item.id} className="php-content-card php-content-card--exclusive"
                     aria-label={item.title}>
              <div className="php-content-card__cover">
                <CoverFallback height={118} />
                <div className="php-content-card__cover-overlay" />
                {item.tag && <span className="php-content-card__tag">{item.tag}</span>}
                {item.exclusive && <span className="php-content-card__lock" aria-label="محتوى حصري">🔒</span>}
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
            مبدعو بلس
            <span className="php-section__title-badge">PLUS</span>
          </h2>
          <button className="php-section__see-all" aria-label="عرض كل مبدعي بلس">عرض الكل</button>
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
                      <span className="php-plus-badge" aria-label="مبدع بلس">✦ PLUS</span>
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
                متابعة
              </button>
            </article>
          ))}
        </div>
      </section>

      {/* ── Exclusive Rooms ───────────────────────────────────────────────────── */}
      <section aria-labelledby="php-rooms-heading">
        <div className="php-section__header">
          <h2 id="php-rooms-heading" className="php-section__title">غرف بلس الحصرية</h2>
          <button className="php-section__see-all" aria-label="عرض كل الغرف">عرض الكل</button>
        </div>
        <div className="php-h-scroll">
          {EXCLUSIVE_ROOMS.map(room => (
            <div key={room.id} className="php-room-card" role="article" aria-label={room.title}>
              <p className="php-room-card__title">{room.title}</p>
              <div className="php-room-card__meta">
                {room.live && <span className="php-room-card__live-dot" aria-hidden="true" />}
                <span>{room.host} · {room.listeners} مستمع</span>
              </div>
              <button className="php-room-card__join"
                      aria-label={`انضم إلى ${room.title}`}>
                {room.live ? 'انضم الآن ←' : 'استمع ←'}
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* ── Sponsor / Ad Block ───────────────────────────────────────────────── */}
      <section aria-label="إعلان">
        <div className="php-sponsor">
          <span className="php-sponsor__label">إعلان</span>
          <div className="php-sponsor__logo" aria-hidden="true">🎙</div>
          <div className="php-sponsor__body">
            <p className="php-sponsor__name">استوديو الصوت المحترف</p>
            <p className="php-sponsor__tagline">معدات تسجيل للمبدعين — توصيل سريع</p>
          </div>
          <button className="php-sponsor__cta" aria-label="تسوق الآن">تسوق الآن</button>
        </div>
      </section>

      {/* ── Trending (non-exclusive) ──────────────────────────────────────────── */}
      <section aria-labelledby="php-trending-heading">
        <div className="php-section__header">
          <h2 id="php-trending-heading" className="php-section__title">الرائج الآن</h2>
          <button className="php-section__see-all" aria-label="عرض كل الرائج">عرض الكل</button>
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
          <h2 id="php-playlists-heading" className="php-section__title">قوائم التشغيل</h2>
          <button className="php-section__see-all" aria-label="عرض كل القوائم">عرض الكل</button>
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
          <h2 id="php-following-heading" className="php-section__title">مبدعون تتابعهم</h2>
          <button className="php-section__see-all" aria-label="عرض من تتابعهم">عرض الكل</button>
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
