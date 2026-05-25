/**
 * Sound Platform — Home Page
 * Phase: 5-B
 *
 * Cross-world aggregated feed — the first screen after authentication.
 * All authenticated users can view this screen regardless of world or capability.
 *
 * Architecture notes:
 * ─────────────────────────────────────────────────────────────────────────────
 * Static representative data is used in Phase 5-B.
 * Each data constant is typed and isolated so backend data can replace it
 * without touching component structure. When a section has no data,
 * it is conditionally omitted from the render — nothing collapses visually
 * with a broken empty div.
 *
 * Section visibility rules:
 *   - Stories row:    hidden when storyItems.length === 0
 *   - Trending:       hidden when trendingItems.length === 0
 *   - Top Creators:   hidden when topCreators.length === 0
 *   - Rising:         hidden when risingCreators.length === 0
 *   - Following:      hidden when followingCreators.length === 0
 *   - Playlists:      hidden when playlists.length === 0
 *   - Plus banner:    always shown (editorial — not capability-gated)
 *
 * Locked design rules:
 *   - border-radius: 3px on all cards and controls
 *   - No emoji in section headings
 *   - No مباشر / بطولات labels
 *   - RTL layout; usernames/handles isolated LTR inside dir="ltr" spans
 *   - Filtering uses compact glass FilterDropdown component, not chip strips or native select
 */

import React, { useState } from 'react';
import './HomePage.css';
import { FilterDropdown, SelectedChips, type FilterOption } from '../components/FilterDropdown';

// ─── Types ─────────────────────────────────────────────────────────────────────
// Each type represents one future backend document shape.
// Replace static arrays below with live Firestore data when feed service is ready.

interface StoryItem {
  uid: string;
  displayName: string;
  avatarUrl?: string;
  isSelf?: boolean;
}

interface ContentItem {
  id: string;
  title: string;
  meta: string;                // e.g. "بودكاست أسبوعي" / "قائمة تشغيل"
  coverUrl?: string;
  playCount?: string;          // e.g. "2.4M استماع"
}

interface CreatorItem {
  uid: string;
  displayName: string;
  handle?: string;             // LTR — rendered inside dir="ltr"
  followerLabel?: string;      // e.g. "980K متابع"
  avatarUrl?: string;
}

interface PlaylistItem {
  id: string;
  title: string;
  tag: string;                 // e.g. "تم اختيارها لك"
  coverUrl?: string;
}

// ─── Static Representative Data ────────────────────────────────────────────────
// Replace with useHomeFeed() hook or similar when backend is ready.

const STORY_ITEMS: StoryItem[] = [
  { uid: 'self', displayName: 'قصتك', isSelf: true },
  { uid: 'u1', displayName: 'لينا',  avatarUrl: '' },
  { uid: 'u2', displayName: 'سامر', avatarUrl: '' },
  { uid: 'u3', displayName: 'نور',  avatarUrl: '' },
  { uid: 'u4', displayName: 'ريم',  avatarUrl: '' },
  { uid: 'u5', displayName: 'عمر',  avatarUrl: '' },
];

const TRENDING_ITEMS: ContentItem[] = [
  { id: 't1', title: 'قصص ملهمة',      meta: 'بودكاست أسبوعي',      playCount: '2.4M استماع' },
  { id: 't2', title: 'عالم المعرفة',    meta: 'مقالات صوتية',         playCount: '1.8M استماع' },
  { id: 't3', title: 'لحظات الصمت',    meta: 'بودكاست تأمل',         playCount: '940K استماع' },
];

const RECOMMENDED_ITEMS: ContentItem[] = [
  { id: 'r1', title: 'لحظات الصمت',    meta: 'بودكاست تأمل' },
  { id: 'r2', title: 'قصص من التاريخ', meta: 'وثائقي صوتي' },
  { id: 'r3', title: 'عالم التقنية',   meta: 'مراجعات تقنية' },
  { id: 'r4', title: 'الإبداع اليومي', meta: 'قصص قصيرة' },
];

const TOP_CREATORS: CreatorItem[] = [
  { uid: 'c1', displayName: 'أحمد عادل',  followerLabel: '980K متابع' },
  { uid: 'c2', displayName: 'سارة ملك',   followerLabel: '1.2M متابع' },
  { uid: 'c3', displayName: 'خالد نور',   followerLabel: '650K متابع' },
  { uid: 'c4', displayName: 'دينا علي',   followerLabel: '420K متابع' },
];

const RISING_CREATORS: CreatorItem[] = [
  { uid: 'r1', displayName: 'ليلى'  },
  { uid: 'r2', displayName: 'عمران' },
  { uid: 'r3', displayName: 'مايا'  },
  { uid: 'r4', displayName: 'ياسين' },
  { uid: 'r5', displayName: 'دينا'  },
];

const FOLLOWING_CREATORS: CreatorItem[] = [
  { uid: 'f1', displayName: 'هنا إبراهيم', handle: '@hana',  followerLabel: 'محتوى حصري جديد متاح الآن' },
  { uid: 'f2', displayName: 'فارس خليل',   handle: '@fares', followerLabel: 'آخر نشاط منذ ساعة' },
];

const PLAYLISTS: PlaylistItem[] = [
  { id: 'p1', title: 'أفضل ما في الأسبوع',       tag: 'تم اختيارها لك'  },
  { id: 'p2', title: 'أجواء التركيز',             tag: 'استرخاء'          },
];

// ─── Small SVG icons (avoids icon-system dep in Phase 5-B) ────────────────────
const IconSearch = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
       strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
       width="16" height="16" aria-hidden="true">
    <circle cx="11" cy="11" r="7" />
    <line x1="16.5" y1="16.5" x2="22" y2="22" />
  </svg>
);

const IconPlay = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14" aria-hidden="true">
    <path d="M8 5v14l11-7z" />
  </svg>
);

const IconChevronLeft = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
       strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
       width="14" height="14" aria-hidden="true">
    <polyline points="15 18 9 12 15 6" />
  </svg>
);

// ─── Static filter options ─────────────────────────────────────────────────────
const CONTENT_TYPE_OPTIONS: FilterOption[] = [
  { value: 'story',      label: 'قصص'      },
  { value: 'podcast',    label: 'بودكاست'  },
  { value: 'poetry',     label: 'شعر'      },
  { value: 'meditation', label: 'تأمل'     },
  { value: 'music',      label: 'موسيقى'   },
];

const SORT_ORDER_OPTIONS: FilterOption[] = [
  { value: 'latest',    label: 'الأحدث'            },
  { value: 'popular',   label: 'الأكثر استماعاً'    },
  { value: 'shared',    label: 'الأكثر مشاركة'     },
  { value: 'saved',     label: 'الأكثر حفظاً'       },
  { value: 'comments',  label: 'الأكثر تعليقاً'    },
  { value: 'rising',    label: 'الأكثر صعوداً'     },
  { value: 'nearby',    label: 'الأقرب لك'         },
  { value: 'following', label: 'من تتابعهم'       },
  { value: 'suggested', label: 'المقترح لك'        },
];

// ─── Avatar placeholder (initials) ────────────────────────────────────────────
function AvatarFallback({ name, size = 60 }: { name: string; size?: number }) {
  const initial = name.trim().charAt(0);
  return (
    <div
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: 'rgba(124,58,237,0.18)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: size * 0.35,
        fontWeight: 700,
        color: 'var(--color-brand-light)',
        userSelect: 'none',
      }}
    >
      {initial}
    </div>
  );
}

// ─── Cover placeholder ─────────────────────────────────────────────────────────
function CoverFallback({ height = 120 }: { height?: number }) {
  return (
    <div
      aria-hidden="true"
      style={{
        width: '100%',
        height,
        background: 'linear-gradient(135deg, rgba(124,92,252,0.15) 0%, rgba(20,20,30,0.95) 100%)',
      }}
    />
  );
}

// ─── Component ────────────────────────────────────────────────────────────────
export function HomePage() {
  // Filter state — multi-select string arrays
  const [contentTypes, setContentTypes] = useState<string[]>([]);
  const [sortOrders,   setSortOrders]   = useState<string[]>([]);

  function toggleContentType(v: string) {
    setContentTypes((prev) =>
      prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]
    );
  }
  function toggleSortOrder(v: string) {
    setSortOrders((prev) =>
      prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]
    );
  }

  // Section visibility — driven by data presence.
  // In the backend-integrated version, these will be `|| isLoading` for skeleton state.
  const hasStories   = STORY_ITEMS.length > 0;
  const hasTrending  = TRENDING_ITEMS.length > 0;
  const hasRecommend = RECOMMENDED_ITEMS.length > 0;
  const hasTopCreators    = TOP_CREATORS.length > 0;
  const hasRising    = RISING_CREATORS.length > 0;
  const hasFollowing = FOLLOWING_CREATORS.length > 0;
  const hasPlaylists = PLAYLISTS.length > 0;

  return (
    <main className="home-page" aria-label="الرئيسية">

      {/* ── Stories / Quick Circles ──────────────────────────────────────────── */}
      {hasStories && (
        <section aria-label="القصص">
          <div className="story-row">
            {STORY_ITEMS.map((item) => (
              <button
                key={item.uid}
                className="story-item"
                aria-label={item.isSelf ? 'إضافة قصة' : `قصة ${item.displayName}`}
              >
                {item.isSelf ? (
                  <div className="story-ring story-ring--self" style={{ width: 60, height: 60, position: 'relative' }}>
                    <AvatarFallback name={item.displayName} size={56} />
                    <span className="story-ring__add" aria-hidden="true">+</span>
                  </div>
                ) : (
                  <div className="story-ring">
                    <div className="story-ring__inner">
                      {item.avatarUrl
                        ? <img className="story-ring__avatar" src={item.avatarUrl} alt={item.displayName} />
                        : <AvatarFallback name={item.displayName} size={56} />
                      }
                    </div>
                  </div>
                )}
                <span className="story-item__name">{item.displayName}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* ── Search + Smart Filters ──────────────────────────────────────────── */}
      <section aria-label="بحث وتصفية">
        <div className="home-search">
          <input
            id="home-search-input"
            className="home-search__input"
            type="search"
            placeholder="ابحث عن صوت، قصة، بودكاست..."
            autoComplete="off"
            dir="rtl"
          />
          <span className="home-search__icon">
            <IconSearch />
          </span>
        </div>

        {/* Smart compact glass dropdowns — DESIGN.md filter_controls rule */}
        <div className="home-filters" style={{ marginTop: 'var(--space-3)' }}>
          <FilterDropdown
            label="نوع المحتوى"
            options={CONTENT_TYPE_OPTIONS}
            values={contentTypes}
            onToggle={toggleContentType}
            onClear={() => setContentTypes([])}
            defaultLabel="الكل"
            ariaLabel="تصفية حسب نوع المحتوى"
          />
          <FilterDropdown
            label="الترتيب"
            options={SORT_ORDER_OPTIONS}
            values={sortOrders}
            onToggle={toggleSortOrder}
            onClear={() => setSortOrders([])}
            defaultLabel="الأحدث"
            ariaLabel="تصفية حسب الترتيب"
          />
        </div>
        {/* Selected filter chips — appear below filter row, each has X remove */}
        <SelectedChips
          groups={[
            {
              filterId: 'contentType',
              options:  CONTENT_TYPE_OPTIONS,
              values:   contentTypes,
              onRemove: toggleContentType,
            },
            {
              filterId: 'sortOrder',
              options:  SORT_ORDER_OPTIONS,
              values:   sortOrders,
              onRemove: toggleSortOrder,
            },
          ]}
        />

        {/* Subpage CTA — outside the dropdown, under the selected chips */}
        <button
          className="fd-subpage-btn"
          type="button"
          onClick={() => { /* navigate to /discover later */ }}
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

      {/* ── Trending Now ────────────────────────────────────────────────────── */}
      {hasTrending && (
        <section aria-labelledby="trending-heading">
          <div className="home-section__header">
            <h2 id="trending-heading" className="home-section__title">الرائج الآن</h2>
            <button className="home-section__see-all" aria-label="عرض كل الرائج">عرض الكل</button>
          </div>
          <div className="h-scroll">
            {TRENDING_ITEMS.map((item) => (
              <article key={item.id} className="content-card" aria-label={item.title}>
                <div className="content-card__cover">
                  <CoverFallback height={120} />
                  <div className="content-card__cover-overlay" />
                  {item.playCount && (
                    <div className="content-card__play-stat">
                      <IconPlay />
                      <span>{item.playCount}</span>
                    </div>
                  )}
                </div>
                <div className="content-card__body">
                  <p className="content-card__title">{item.title}</p>
                  <p className="content-card__meta">{item.meta}</p>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* ── Top Creators ────────────────────────────────────────────────────── */}
      {hasTopCreators && (
        <section aria-labelledby="top-creators-heading">
          <div className="home-section__header">
            <h2 id="top-creators-heading" className="home-section__title">أفضل المبدعين</h2>
            <button className="home-section__see-all" aria-label="عرض كل المبدعين">عرض الكل</button>
          </div>
          <div className="creator-grid">
            {TOP_CREATORS.map((creator) => (
              <article key={creator.uid} className="creator-card" aria-label={`ملف ${creator.displayName}`}>
                <AvatarFallback name={creator.displayName} size={64} />
                <div>
                  <p className="creator-card__name">{creator.displayName}</p>
                  {creator.followerLabel && (
                    <p className="creator-card__followers">{creator.followerLabel}</p>
                  )}
                </div>
                <button className="creator-card__follow-btn" aria-label={`متابعة ${creator.displayName}`}>
                  متابعة
                </button>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* ── Plus Banner — editorial section, not a marketing hero ──────────── */}
      <section aria-label="اشتراك بلس">
        <div className="plus-banner" role="complementary">
          <div className="plus-banner__text">
            <p className="plus-banner__eyebrow">بلس</p>
            <p className="plus-banner__headline">استمتع بتجربة صوتية بلا إعلانات مع اشتراك بلس</p>
          </div>
          <button className="plus-banner__cta" aria-label="اشترك في بلس الآن">
            اشترك الآن
          </button>
        </div>
      </section>

      {/* ── Recommended for You ─────────────────────────────────────────────── */}
      {hasRecommend && (
        <section aria-labelledby="recommended-heading">
          <div className="home-section__header">
            <h2 id="recommended-heading" className="home-section__title">مقترح لك</h2>
            <button className="home-section__see-all" aria-label="عرض كل المقترحات">عرض الكل</button>
          </div>
          <div className="h-scroll">
            {RECOMMENDED_ITEMS.map((item) => (
              <article key={item.id} className="content-card" aria-label={item.title}>
                <div className="content-card__cover">
                  <CoverFallback height={120} />
                  <div className="content-card__cover-overlay" />
                </div>
                <div className="content-card__body">
                  <p className="content-card__title">{item.title}</p>
                  <p className="content-card__meta">{item.meta}</p>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* ── Playlists ───────────────────────────────────────────────────────── */}
      {hasPlaylists && (
        <section aria-labelledby="playlists-heading">
          <div className="home-section__header">
            <h2 id="playlists-heading" className="home-section__title">قوائم التشغيل</h2>
            <button className="home-section__see-all" aria-label="عرض كل القوائم">عرض الكل</button>
          </div>
          <div className="playlist-grid">
            {PLAYLISTS.map((pl) => (
              <article key={pl.id} className="playlist-card" aria-label={pl.title}>
                <CoverFallback height={140} />
                <div className="playlist-card__overlay">
                  <span className="playlist-card__tag">{pl.tag}</span>
                  <p className="playlist-card__title">{pl.title}</p>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* ── Rising Creators ─────────────────────────────────────────────────── */}
      {hasRising && (
        <section aria-labelledby="rising-heading">
          <div className="home-section__header">
            <h2 id="rising-heading" className="home-section__title">مبدعون صاعدون</h2>
            <button className="home-section__see-all" aria-label="عرض كل المبدعين الصاعدين">عرض الكل</button>
          </div>
          <div className="rising-row">
            {RISING_CREATORS.map((creator) => (
              <button key={creator.uid} className="rising-item" aria-label={creator.displayName}>
                <AvatarFallback name={creator.displayName} size={56} />
                <span className="rising-item__name">{creator.displayName}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* ── Creators You Follow ─────────────────────────────────────────────── */}
      {hasFollowing && (
        <section aria-labelledby="following-heading">
          <div className="home-section__header">
            <h2 id="following-heading" className="home-section__title">مبدعون تتابعهم</h2>
            <button className="home-section__see-all" aria-label="عرض كل من تتابعهم">عرض الكل</button>
          </div>
          <div className="follow-list">
            {FOLLOWING_CREATORS.map((creator) => (
              <article key={creator.uid} className="follow-item" aria-label={`ملف ${creator.displayName}`}>
                <AvatarFallback name={creator.displayName} size={44} />
                <div className="follow-item__info">
                  <p className="follow-item__name">{creator.displayName}</p>
                  {creator.handle && (
                    <p className="follow-item__status">
                      <span dir="ltr" style={{ fontFamily: 'monospace', fontSize: 11 }}>
                        {creator.handle}
                      </span>
                      {creator.followerLabel && (
                        <span> · {creator.followerLabel}</span>
                      )}
                    </p>
                  )}
                  {!creator.handle && creator.followerLabel && (
                    <p className="follow-item__status">{creator.followerLabel}</p>
                  )}
                </div>
                {/* New-content indicator — driven by backend unread flag in future */}
                <span className="follow-item__indicator" aria-hidden="true" />
                <span className="follow-item__chevron" aria-hidden="true">
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
