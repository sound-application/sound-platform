/**
 * TournamentsDiscoverPage.tsx
 *
 * DESIGN AUTHORITY: GeneralDiscoverPage — exact structural clone.
 * Prefix: tdp-   Accent: #f59e0b (amber-gold)   World: مسابقات
 *
 * LOCKED RULES (identical to GeneralDiscoverPage):
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
import './TournamentsDiscoverPage.css';
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

// ─── Static feed data (مسابقات-specific) ─────────────────────────────────────

const FEED_ITEMS: FeedItem[] = [
  {
    id: 't1',
    bgImage:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuCS9to8gno-KMZxuSeaS_k8y_7LJtdbmqhPIorbh-0dwOcUtpvUJRZpAViIpXYx-6Zs_QVmjGSGJwX2d9GX0mggXxmcX2R5jXMD6FuoOfNqNOM83YACmVlgKKO7f-L_vuAbDqOCytVkDgaLcIOds2yd9HbzNWewiU4a9HUnBLA2fq6IOMOUc9K3rI5nJB2846GFiERAtxdaW2ODqNIBk67HmuHAtL388gEfdLUVOhtPDk9O0EH0zTFQeUwna1NqkIj_iNE6jI039YKX',
    bgAlt: t('tournamentsdiscover:aStageIlluminatedWithGoldenLightsForACre'),
    category: t('tournamentsdiscover:poetry'),
    title: t('tournamentsdiscover:soundsOfSpringTheFinalStage'),
    description: t('tournamentsdiscover:aSpecialEntryInTheGreatAudioPoetryContes'),
    creatorName: t('tournamentsdiscover:salmaAlHarithi'),
    creatorHandle: '@salma.harithi',
    listens: t('tournamentsdiscover:42ThousandVotes'),
    duration: t('tournamentsdiscover:endsIn8Hours'),
    likes: t('tournamentsdiscover:key7832'),
    comments: t('tournamentsdiscover:key1384'),
    avatarImage:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuA2qHr5C5QGp0Q3uUeRhbgB0lejCNaO4UegUWuNgX2I20h5AgZZsGf2Be0pPxuewxjLmgdTwCJ75tQHfP93LMCgPErSmgAJdUtZzdVPkfFy_x4S84ZuoYMRFBZ9YOLsjiqD2z9DHdU7F2oO94psoCMMas9exXCB4qznISuwGGTjgKX-GradVYn6yHbMHgVPNIDV9Z99OCroyuA5SfN3v5IfoUxXUiqmasiLVw4qW1QewpJYLAnP_1fLeRp_4W6k4eiRYNySPTBGvX2n',
    avatarAlt: t('tournamentsdiscover:participantPhotoSalmaAlHarithi'),
  },
  {
    id: 't2',
    bgImage:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuBNK3ytSH36YPuK5Y5uGUD1hNKqL885wssu5FS0uMxxunZi9NEUjnw9yXKcR3o3Cz8dmHiZOkToVNYvbAW-cXuUWhrIPcbLZVBE0Ahx1xzkUJZbCI7NlCCSdAaEBnLXSUKbKqeJ8URgfMjCbQbchqdlRy02ePlq3MK6eFSvjWaEOvomD3nbRcesyvbMkMe3fIicMwvqvdW3Jht44wZAzUkMXJUHttoqhpY0LiGco-L9U81UZBZfR_LSI3rn08Ad9pT1I3x5I3KP8umF',
    bgAlt: t('tournamentsdiscover:dramaticLightingOfAMicrophoneInAnAudioSt'),
    category: t('tournamentsdiscover:audioStory'),
    title: t('tournamentsdiscover:dreamtellersQuarterFinals'),
    description: t('tournamentsdiscover:bestShortAudioStoryContestListenAndVoteF'),
    creatorName: t('tournamentsdiscover:faresAlnajjar'),
    creatorHandle: '@faris.najjar',
    listens: t('tournamentsdiscover:28ThousandVotes'),
    duration: t('tournamentsdiscover:expiresIn2Days'),
    likes: t('tournamentsdiscover:key5900'),
    comments: t('tournamentsdiscover:key796'),
    avatarImage:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuBNK3ytSH36YPuK5Y5uGUD1hNKqL885wssu5FS0uMxxunZi9NEUjnw9yXKcR3o3Cz8dmHiZOkToVNYvbAW-cXuUWhrIPcbLZVBE0Ahx1xzkUJZbCI7NlCCSdAaEBnLXSUKbKqeJ8URgfMjCbQbchqdlRy02ePlq3MK6eFSvjWaEOvomD3nbRcesyvbMkMe3fIicMwvqvdW3Jht44wZAzUkMXJUHttoqhpY0LiGco-L9U81UZBZfR_LSI3rn08Ad9pT1I3x5I3KP8umF',
    avatarAlt: t('tournamentsdiscover:photoOfParticipantFaresAlnajjar'),
  },
  {
    id: 't3',
    bgImage:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuCS9to8gno-KMZxuSeaS_k8y_7LJtdbmqhPIorbh-0dwOcUtpvUJRZpAViIpXYx-6Zs_QVmjGSGJwX2d9GX0mggXxmcX2R5jXMD6FuoOfNqNOM83YACmVlgKKO7f-L_vuAbDqOCytVkDgaLcIOds2yd9HbzNWewiU4a9HUnBLA2fq6IOMOUc9K3rI5nJB2846GFiERAtxdaW2ODqNIBk67HmuHAtL388gEfdLUVOhtPDk9O0EH0zTFQeUwna1NqkIj_iNE6jI039YKX',
    bgAlt: t('tournamentsdiscover:aGoldMedalAndStageLightsInARecitationCom'),
    category: t('tournamentsdiscover:recitation'),
    title: t('tournamentsdiscover:arabVoiceAwardsFirstRound'),
    description: t('tournamentsdiscover:annualAudioRecitationContestDiscoverTheP'),
    creatorName: t('tournamentsdiscover:yasmineAlbakry'),
    creatorHandle: '@yasmine.bakri',
    listens: t('tournamentsdiscover:55ThousandVotes'),
    duration: t('tournamentsdiscover:expiresIn3Days'),
    likes: t('tournamentsdiscover:key8959'),
    comments: t('tournamentsdiscover:key9918'),
    avatarImage:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuA2qHr5C5QGp0Q3uUeRhbgB0lejCNaO4UegUWuNgX2I20h5AgZZsGf2Be0pPxuewxjLmgdTwCJ75tQHfP93LMCgPErSmgAJdUtZzdVPkfFy_x4S84ZuoYMRFBZ9YOLsjiqD2z9DHdU7F2oO94psoCMMas9exXCB4qznISuwGGTjgKX-GradVYn6yHbMHgVPNIDV9Z99OCroyuA5SfN3v5IfoUxXUiqmasiLVw4qW1QewpJYLAnP_1fLeRp_4W6k4eiRYNySPTBGvX2n',
    avatarAlt: t('tournamentsdiscover:participantPhotoYasmineAlbakri'),
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
const SUB_NAV_LABELS = [t('tournamentsdiscover:findOut'), t('tournamentsdiscover:forYou'), t('tournamentsdiscover:followUp'), t('tournamentsdiscover:trending')] as const;
type SubNavItem = (typeof SUB_NAV_LABELS)[number];
// Rendered in natural order; tdp-glass-pill uses direction:ltr so DOM=visual order.

// ─── Progress dots ─────────────────────────────────────────────────────────────

interface DotsProps { total: number; active: number; }

const FeedDots: React.FC<DotsProps> = ({ total, active }) => (
  <div className="tdp-progress" aria-hidden="true">
    {Array.from({ length: total }).map((_, i) => (
      <div key={i} className={`tdp-dot${i === active ? ' tdp-dot--active' : ''}`} />
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
  <div className="tdp-rail">
    {/* Avatar + follow */}
    <div className="tdp-avatar-wrap">
      <img src={item.avatarImage} alt={item.avatarAlt} className="tdp-avatar" />
      <button
        className={`tdp-follow-btn${followed ? ' tdp-follow-btn--following' : ''}`}
        aria-label={followed ? t('tournamentsdiscover:unfollow') : t('tournamentsdiscover:followTheParticipant')}
        aria-pressed={followed}
        onClick={onFollow}
      >
        {/* icon-box ensures the + / ✓ is grid-centered, not baseline-aligned */}
        <span className="tdp-follow-icon-box">
          <span className="material-symbols-outlined">
            {followed ? 'check' : 'add'}
          </span>
        </span>
      </button>
    </div>

    {/* Like */}
    <button
      className="tdp-action-btn"
      aria-label={liked ? t('tournamentsdiscover:unlike') : t('tournamentsdiscover:wonder')}
      aria-pressed={liked}
      onClick={onLike}
    >
      <span className="tdp-action-icon-box">
        <span className={`material-symbols-outlined tdp-action-icon${liked ? ' tdp-action-icon--active' : ''}`}>
          favorite
        </span>
      </span>
      <span className="tdp-action-label">{item.likes}</span>
    </button>

    {/* Comments */}
    <button className="tdp-action-btn" aria-label={t('tournamentsdiscover:comments')}>
      <span className="tdp-action-icon-box">
        <span className="material-symbols-outlined tdp-action-icon">chat_bubble</span>
      </span>
      <span className="tdp-action-label">{item.comments}</span>
    </button>

    {/* Save */}
    <button
      className="tdp-action-btn"
      aria-label={saved ? t('tournamentsdiscover:cancelSaving') : t('tournamentsdiscover:keep')}
      aria-pressed={saved}
      onClick={onSave}
    >
      <span className="tdp-action-icon-box">
        <span className={`material-symbols-outlined tdp-action-icon${saved ? ' tdp-action-icon--active' : ''}`}>
          bookmark
        </span>
      </span>
      <span className="tdp-action-label">{t('tournamentsdiscover:keep')}</span>
    </button>

    {/* Repost */}
    <button className="tdp-action-btn" aria-label={t('tournamentsdiscover:repost')}>
      <span className="tdp-action-icon-box">
        <span className="material-symbols-outlined tdp-action-icon">repeat</span>
      </span>
      <span className="tdp-action-label">{t('tournamentsdiscover:re')}</span>
    </button>

    {/* Share */}
    <button className="tdp-action-btn" aria-label={t('tournamentsdiscover:sharing')}>
      <span className="tdp-action-icon-box">
        <span className="material-symbols-outlined tdp-action-icon">share</span>
      </span>
      <span className="tdp-action-label">{t('tournamentsdiscover:sharing')}</span>
    </button>

    {/* Gift */}
    <button className="tdp-action-btn" aria-label={t('tournamentsdiscover:sendAGift')}>
      <span className="tdp-action-icon-box">
        <span className="material-symbols-outlined tdp-action-icon">card_giftcard</span>
      </span>
      <span className="tdp-action-label">{t('tournamentsdiscover:gift')}</span>
    </button>
  </div>
);

// ─── Content info block ────────────────────────────────────────────────────────
// CTA is part of this block so it always flows below the metadata — never overlaps.

interface InfoBlockProps { item: FeedItem; }

const InfoBlock: React.FC<InfoBlockProps> = ({ item }) => (
  <div className="tdp-info">
    {/* Category chip */}
    <div className="tdp-category-chip">
      <span>{item.category}</span>
    </div>

    {/* Title */}
    <h2 className="tdp-title">{item.title}</h2>

    {/* Description */}
    <p className="tdp-description">{item.description}</p>

    {/* Creator row */}
    <div className="tdp-creator-row">
      <span className="tdp-creator-name">{item.creatorName}</span>
      <span className="tdp-creator-handle" dir="ltr">{item.creatorHandle}</span>
    </div>

    {/* Metadata */}
    <div className="tdp-meta-row">
      <span className="material-symbols-outlined tdp-meta-icon">emoji_events</span>
      <span className="tdp-meta-text">
        {item.listens} • {item.duration}
      </span>
    </div>

    {/* CTA — in flow, always below metadata, never overlaps */}
    <button className="tdp-cta-btn" aria-label={t('tournamentsdiscover:voteNow')}>
      <span className="material-symbols-outlined tdp-cta-icon">how_to_vote</span>
      <span className="tdp-cta-text">{t('tournamentsdiscover:voteNow')}</span>
    </button>
  </div>
);

// ─── Main page ─────────────────────────────────────────────────────────────────

const TournamentsDiscoverPage: React.FC = () => {
  const [subNav, setSubNav] = useState<SubNavItem>(t('tournamentsdiscover:forYou'));
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
    <div className="tdp-root" lang="ar">
      {/* ── Background media layer ──────────────────────────────────────────── */}
      <div className="tdp-bg">
        <img
          src={currentItem.bgImage}
          alt={currentItem.bgAlt}
          className="tdp-bg-image"
          key={currentItem.id}
        />
        <div className="tdp-story-gradient" />
        <div className="tdp-side-gradient" />
      </div>

      {/* ── Feed position dots ──────────────────────────────────────────────── */}
      <FeedDots total={FEED_ITEMS.length} active={feedIndex} />

      {/* ── Main content ────────────────────────────────────────────────────── */}
      <main className="tdp-main">

        {/* Discover sub-nav — the ONLY nav element on this page */}
        {/* Visual order: اكتشف | لك | المتابعة | الرائج — pill is dir=ltr */}
        <div className="tdp-subnav-cluster">
          <div className="tdp-glass-pill" role="tablist" aria-label={t('tournamentsdiscover:filterDiscovery')}>
            {SUB_NAV_LABELS.map(label => (
              <button
                key={label}
                role="tab"
                aria-selected={label === subNav}
                className={`tdp-pill-btn${label === subNav ? ' tdp-pill-btn--active' : ''}`}
                onClick={() => setSubNav(label)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Flex spacer — pushes lower section to the bottom */}
        <div className="tdp-spacer" aria-hidden="true" />

        {/* Lower: info block only — rail is absolutely positioned on right */}
        <div className="tdp-lower">
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
        className="tdp-nav-hit tdp-nav-hit--next"
        aria-label={t('tournamentsdiscover:nextItemInTheSummary')}
        onClick={goNext}
      />
      <button
        className="tdp-nav-hit tdp-nav-hit--prev"
        aria-label={t('tournamentsdiscover:previousItemInSummary')}
        onClick={goPrev}
      />
    </div>
  );
};

export { TournamentsDiscoverPage };
export default TournamentsDiscoverPage;
