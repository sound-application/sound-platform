/**
 * GeneralDiscoverPage.tsx
 *
 * DESIGN AUTHORITY: general_discover_locked_arabic_tokens/code.html
 * Layout: Full-screen immersive feed — NOT a category/grid/filter page.
 *
 * LOCKED RULES (do not break):
 *   - Sub-nav visual order: اكتشف | لك | المتابعة | الرائج
 *   - No world nav on this page (AppHeader world strip is the authority)
 *   - No filter chip strips on this page
 *   - No Home/Live-style dropdowns
 *   - 3 px border-radius for cards; 9999px for pills
 *   - RTL root; dir="ltr" on handles only
 *   - Typography: Alexandria → Cairo → sans-serif
 *   - Dark premium glass-morphism (no light theme)
 *   - Forbidden: مباشر, بطولات, استكشاف, لقطات, البث, جلسة
 */

import React, { useState, useCallback } from 'react';
import './GeneralDiscoverPage.css';
import i18n from "i18next";

const t = (key: any, options?: any) => i18n.t(key, options) as any as string;


// ─── Types ────────────────────────────────────────────────────────────────────

interface FeedItem {
  id: string;
  bgImage: string;
  bgAlt: string;
  category: string;
  title: string;
  description: string;
  creatorName: string;
  creatorHandle: string; // always rendered LTR-isolated
  listens: string;
  duration: string;
  likes: string;
  comments: string;
  avatarImage: string;
  avatarAlt: string;
}

// ─── Static feed data (placeholder until useDiscoverFeed hook is ready) ───────

const FEED_ITEMS: FeedItem[] = [
  {
    id: 'f1',
    bgImage:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuCS9to8gno-KMZxuSeaS_k8y_7LJtdbmqhPIorbh-0dwOcUtpvUJRZpAViIpXYx-6Zs_QVmjGSGJwX2d9GX0mggXxmcX2R5jXMD6FuoOfNqNOM83YACmVlgKKO7f-L_vuAbDqOCytVkDgaLcIOds2yd9HbzNWewiU4a9HUnBLA2fq6IOMOUc9K3rI5nJB2846GFiERAtxdaW2ODqNIBk67HmuHAtL388gEfdLUVOhtPDk9O0EH0zTFQeUwna1NqkIj_iNE6jI039YKX',
    bgAlt: t('generaldiscover:professionalStudioMicrophoneOnDarkBackgr'),
    category: t('generaldiscover:stories'),
    title: t('generaldiscover:midnightsTale'),
    description: t('generaldiscover:aShortAudioStoryFromAPodcastThatTellsThe'),
    creatorName: t('generaldiscover:ahmedSaeed'),
    creatorHandle: '@ahmed.voice',
    listens: t('generaldiscover:245ThousandListens'),
    duration: t('generaldiscover:duration045'),
    likes: t('generaldiscover:key212'),
    comments: t('generaldiscover:key1683'),
    avatarImage:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuA2qHr5C5QGp0Q3uUeRhbgB0lejCNaO4UegUWuNgX2I20h5AgZZsGf2Be0pPxuewxjLmgdTwCJ75tQHfP93LMCgPErSmgAJdUtZzdVPkfFy_x4S84ZuoYMRFBZ9YOLsjiqD2z9DHdU7F2oO94psoCMMas9exXCB4qznISuwGGTjgKX-GradVYn6yHbMHgVPNIDV9Z99OCroyuA5SfN3v5IfoUxXUiqmasiLVw4qW1QewpJYLAnP_1fLeRp_4W6k4eiRYNySPTBGvX2n',
    avatarAlt: t('generaldiscover:imageOfTheCreativeAhmedSaeed'),
  },
  {
    id: 'f2',
    bgImage:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuBNK3ytSH36YPuK5Y5uGUD1hNKqL885wssu5FS0uMxxunZi9NEUjnw9yXKcR3o3Cz8dmHiZOkToVNYvbAW-cXuUWhrIPcbLZVBE0Ahx1xzkUJZbCI7NlCCSdAaEBnLXSUKbKqeJ8URgfMjCbQbchqdlRy02ePlq3MK6eFSvjWaEOvomD3nbRcesyvbMkMe3fIicMwvqvdW3Jht44wZAzUkMXJUHttoqhpY0LiGco-L9U81UZBZfR_LSI3rn08Ad9pT1I3x5I3KP8umF',
    bgAlt: t('generaldiscover:nightCityWallpaperWithBlueLighting'),
    category: t('generaldiscover:itsAPodcast'),
    title: t('generaldiscover:voicesFromThePast'),
    description: t('generaldiscover:anAudioJourneyThroughTheHistoryOfArabicM'),
    creatorName: t('generaldiscover:sarahPrince'),
    creatorHandle: '@sara.amir',
    listens: t('generaldiscover:189ThousandListens'),
    duration: t('generaldiscover:duration120'),
    likes: t('generaldiscover:key6946'),
    comments: t('generaldiscover:key1358'),
    avatarImage:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuBNK3ytSH36YPuK5Y5uGUD1hNKqL885wssu5FS0uMxxunZi9NEUjnw9yXKcR3o3Cz8dmHiZOkToVNYvbAW-cXuUWhrIPcbLZVBE0Ahx1xzkUJZbCI7NlCCSdAaEBnLXSUKbKqeJ8URgfMjCbQbchqdlRy02ePlq3MK6eFSvjWaEOvomD3nbRcesyvbMkMe3fIicMwvqvdW3Jht44wZAzUkMXJUHttoqhpY0LiGco-L9U81UZBZfR_LSI3rn08Ad9pT1I3x5I3KP8umF',
    avatarAlt: t('generaldiscover:imageOfTheCreativeSarahAlamir'),
  },
  {
    id: 'f3',
    bgImage:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuCS9to8gno-KMZxuSeaS_k8y_7LJtdbmqhPIorbh-0dwOcUtpvUJRZpAViIpXYx-6Zs_QVmjGSGJwX2d9GX0mggXxmcX2R5jXMD6FuoOfNqNOM83YACmVlgKKO7f-L_vuAbDqOCytVkDgaLcIOds2yd9HbzNWewiU4a9HUnBLA2fq6IOMOUc9K3rI5nJB2846GFiERAtxdaW2ODqNIBk67HmuHAtL388gEfdLUVOhtPDk9O0EH0zTFQeUwna1NqkIj_iNE6jI039YKX',
    bgAlt: t('generaldiscover:darkArtisticShotOfAMicrophone'),
    category: t('generaldiscover:contemplation'),
    title: t('generaldiscover:aQuietMoment'),
    description: t('generaldiscover:anAudioMeditationSessionToClearTheMindAn'),
    creatorName: t('generaldiscover:omarAlrashid'),
    creatorHandle: '@omar.rashid',
    listens: t('generaldiscover:97ThousandListens'),
    duration: t('generaldiscover:duration200'),
    likes: t('generaldiscover:key5900'),
    comments: t('generaldiscover:key3651'),
    avatarImage:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuA2qHr5C5QGp0Q3uUeRhbgB0lejCNaO4UegUWuNgX2I20h5AgZZsGf2Be0pPxuewxjLmgdTwCJ75tQHfP93LMCgPErSmgAJdUtZzdVPkfFy_x4S84ZuoYMRFBZ9YOLsjiqD2z9DHdU7F2oO94psoCMMas9exXCB4qznISuwGGTjgKX-GradVYn6yHbMHgVPNIDV9Z99OCroyuA5SfN3v5IfoUxXUiqmasiLVw4qW1QewpJYLAnP_1fLeRp_4W6k4eiRYNySPTBGvX2n',
    avatarAlt: t('generaldiscover:imageOfTheCreativeOmarAlrashid'),
  },
];

// ─── Sub-nav ───────────────────────────────────────────────────────────────────
// Required visual order:  اكتشف | لك | المتابعة | الرائج
//
// The page root is, so RTL flex renders DOM children right→left.
// To achieve the exact visual order above we reverse the DOM array:
// DOM:    الرائج , المتابعة , لك , اكتشف
// RTL:    اكتشف  |   لك    | المتابعة | الرائج   ✓
//
// The active state comparison is still by label value — unaffected by order.
const SUB_NAV_LABELS = [t('generaldiscover:findOut'), t('generaldiscover:forYou'), t('generaldiscover:followUp'), t('generaldiscover:trending')] as const;
type SubNavItem = (typeof SUB_NAV_LABELS)[number];
// Rendered in natural order; gdp-glass-pill uses direction:ltr so DOM=visual order.

// ─── Progress dots ─────────────────────────────────────────────────────────────

interface DotsProps { total: number; active: number; }

const FeedDots: React.FC<DotsProps> = ({ total, active }) => (
  <div className="gdp-progress" aria-hidden="true">
    {Array.from({ length: total }).map((_, i) => (
      <div key={i} className={`gdp-dot${i === active ? ' gdp-dot--active' : ''}`} />
    ))}
  </div>
);

// ─── Action rail ───────────────────────────────────────────────────────────────

interface ActionRailProps {
  item: FeedItem;
  liked: boolean;
  saved: boolean;
  followed: boolean;
  onLike: () => void;
  onSave: () => void;
  onFollow: () => void;
}

const ActionRail: React.FC<ActionRailProps> = ({
  item, liked, saved, followed, onLike, onSave, onFollow,
}) => (
  <div className="gdp-rail">
    {/* Avatar + follow */}
    <div className="gdp-avatar-wrap">
      <img src={item.avatarImage} alt={item.avatarAlt} className="gdp-avatar" />
      <button
        className={`gdp-follow-btn${followed ? ' gdp-follow-btn--following' : ''}`}
        aria-label={followed ? t('generaldiscover:unfollow') : t('generaldiscover:followTheCreator')}
        aria-pressed={followed}
        onClick={onFollow}
      >
        {/* icon-box ensures the + / ✓ is grid-centered, not baseline-aligned */}
        <span className="gdp-follow-icon-box">
          <span className="material-symbols-outlined">
            {followed ? 'check' : 'add'}
          </span>
        </span>
      </button>
    </div>

    {/* Like */}
    <button
      className="gdp-action-btn"
      aria-label={liked ? t('generaldiscover:unlike') : t('generaldiscover:wonder')}
      aria-pressed={liked}
      onClick={onLike}
    >
      <span className="gdp-action-icon-box">
        <span className={`material-symbols-outlined gdp-action-icon${liked ? ' gdp-action-icon--active' : ''}`}>
          favorite
        </span>
      </span>
      <span className="gdp-action-label">{item.likes}</span>
    </button>

    {/* Comments */}
    <button className="gdp-action-btn" aria-label={t('generaldiscover:comments')}>
      <span className="gdp-action-icon-box">
        <span className="material-symbols-outlined gdp-action-icon">chat_bubble</span>
      </span>
      <span className="gdp-action-label">{item.comments}</span>
    </button>

    {/* Save */}
    <button
      className="gdp-action-btn"
      aria-label={saved ? t('generaldiscover:cancelSaving') : t('generaldiscover:keep')}
      aria-pressed={saved}
      onClick={onSave}
    >
      <span className="gdp-action-icon-box">
        <span className={`material-symbols-outlined gdp-action-icon${saved ? ' gdp-action-icon--active' : ''}`}>
          bookmark
        </span>
      </span>
      <span className="gdp-action-label">{t('generaldiscover:keep')}</span>
    </button>

    {/* Repost */}
    <button className="gdp-action-btn" aria-label={t('generaldiscover:repost')}>
      <span className="gdp-action-icon-box">
        <span className="material-symbols-outlined gdp-action-icon">repeat</span>
      </span>
      <span className="gdp-action-label">{t('generaldiscover:re')}</span>
    </button>

    {/* Share */}
    <button className="gdp-action-btn" aria-label={t('generaldiscover:sharing')}>
      <span className="gdp-action-icon-box">
        <span className="material-symbols-outlined gdp-action-icon">share</span>
      </span>
      <span className="gdp-action-label">{t('generaldiscover:sharing')}</span>
    </button>

    {/* Gift */}
    <button className="gdp-action-btn" aria-label={t('generaldiscover:sendAGift')}>
      <span className="gdp-action-icon-box">
        <span className="material-symbols-outlined gdp-action-icon">card_giftcard</span>
      </span>
      <span className="gdp-action-label">{t('generaldiscover:gift')}</span>
    </button>
  </div>
);

// ─── Content info block ────────────────────────────────────────────────────────
// CTA is part of this block so it always flows below the metadata — never overlaps.

interface InfoBlockProps { item: FeedItem; }

const InfoBlock: React.FC<InfoBlockProps> = ({ item }) => (
  <div className="gdp-info">
    {/* Category chip */}
    <div className="gdp-category-chip">
      <span>{item.category}</span>
    </div>

    {/* Title */}
    <h2 className="gdp-title">{item.title}</h2>

    {/* Description */}
    <p className="gdp-description">{item.description}</p>

    {/* Creator row */}
    <div className="gdp-creator-row">
      <span className="gdp-creator-name">{item.creatorName}</span>
      <span className="gdp-creator-handle" dir="ltr">{item.creatorHandle}</span>
    </div>

    {/* Metadata */}
    <div className="gdp-meta-row">
      <span className="material-symbols-outlined gdp-meta-icon">headphones</span>
      <span className="gdp-meta-text">
        {item.listens} • {item.duration}
      </span>
    </div>

    {/* CTA — in flow, always below metadata, never overlaps */}
    <button className="gdp-cta-btn" aria-label={t('generaldiscover:listenToTheFullWork')}>
      <span className="material-symbols-outlined gdp-cta-icon">play_arrow</span>
      <span className="gdp-cta-text">{t('generaldiscover:listenToTheFullWork')}</span>
    </button>
  </div>
);

// ─── Main page ─────────────────────────────────────────────────────────────────

const GeneralDiscoverPage: React.FC = () => {
  const [subNav, setSubNav] = useState<SubNavItem>(t('generaldiscover:forYou'));
  const [feedIndex, setFeedIndex] = useState(0);
  const [liked,   setLiked]   = useState(false);
  const [saved,   setSaved]   = useState(false);
  const [followed, setFollowed] = useState(false);

  const currentItem = FEED_ITEMS[feedIndex] as FeedItem;

  const handleLike   = useCallback(() => setLiked(v => !v), []);
  const handleSave   = useCallback(() => setSaved(v => !v), []);
  const handleFollow = useCallback(() => setFollowed(v => !v), []);

  const resetItemState = useCallback(() => {
    setLiked(false);
    setSaved(false);
    setFollowed(false);
  }, []);

  const goNext = useCallback(() => {
    setFeedIndex(i => (i + 1) % FEED_ITEMS.length);
    resetItemState();
  }, [resetItemState]);

  const goPrev = useCallback(() => {
    setFeedIndex(i => (i - 1 + FEED_ITEMS.length) % FEED_ITEMS.length);
    resetItemState();
  }, [resetItemState]);

  return (
    <div className="gdp-root" lang="ar">
      {/* ── Background media layer ──────────────────────────────────────────── */}
      <div className="gdp-bg">
        <img
          src={currentItem.bgImage}
          alt={currentItem.bgAlt}
          className="gdp-bg-image"
          key={currentItem.id}
        />
        <div className="gdp-story-gradient" />
        <div className="gdp-side-gradient" />
      </div>

      {/* ── Feed position dots ──────────────────────────────────────────────── */}
      <FeedDots total={FEED_ITEMS.length} active={feedIndex} />

      {/* ── Main content ────────────────────────────────────────────────────── */}
      <main className="gdp-main">

        {/* Discover sub-nav — the ONLY nav element on this page */}
        {/* Visual order: اكتشف | لك | المتابعة | الرائج — pill is dir=ltr */}
        <div className="gdp-subnav-cluster">
          <div className="gdp-glass-pill" role="tablist" aria-label={t('generaldiscover:filterDiscovery')}>
            {SUB_NAV_LABELS.map(label => (
              <button
                key={label}
                role="tab"
                aria-selected={label === subNav}
                className={`gdp-pill-btn${label === subNav ? ' gdp-pill-btn--active' : ''}`}
                onClick={() => setSubNav(label)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Flex spacer — pushes lower section to the bottom */}
        <div className="gdp-spacer" aria-hidden="true" />

        {/* Lower: info block only — rail is absolutely positioned on right */}
        <div className="gdp-lower">
          <InfoBlock item={currentItem} />
        </div>
      </main>

      {/* Rail — absolute, vertically centered on right edge of full screen */}
      <ActionRail
        item={currentItem}
        liked={liked}
        saved={saved}
        followed={followed}
        onLike={handleLike}
        onSave={handleSave}
        onFollow={handleFollow}
      />

      {/* ── Invisible hit-area nav (a11y, swipe prep) ──────────────────────── */}
      <button
        className="gdp-nav-hit gdp-nav-hit--next"
        aria-label={t('generaldiscover:nextItemInTheSummary')}
        onClick={goNext}
      />
      <button
        className="gdp-nav-hit gdp-nav-hit--prev"
        aria-label={t('generaldiscover:previousItemInSummary')}
        onClick={goPrev}
      />
    </div>
  );
};

export { GeneralDiscoverPage };
export default GeneralDiscoverPage;
