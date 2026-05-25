/**
 * PlusDiscoverPage.tsx
 *
 * DESIGN AUTHORITY: general_discover_locked_arabic_tokens/code.html
 * WORLD: بلس  — same feed mechanism, Plus gold color tokens.
 *
 * LOCKED RULES (do not break):
 *   - Sub-nav visual order: اكتشف | لك | المتابعة | الرائج
 *   - No world nav on this page (AppHeader world strip is the authority)
 *   - No filter chip strips
 *   - 3 px border-radius for cards; 9999px for pills
 *   - RTL root; dir="ltr" on handles only
 *   - Typography: Alexandria → Cairo → sans-serif
 *   - Dark premium glass-morphism (no light theme)
 *   - Forbidden: مباشر, بطولات, استكشاف, لقطات, البث, جلسة
 *
 * CSS strategy: identical layout to GeneralDiscoverPage.css,
 * only color tokens differ (gdp-primary → gold #eec200, surface → #171309).
 * Class prefix: pdp- to avoid collision.
 */

import React, { useState, useCallback } from 'react';
import './PlusDiscoverPage.css';

// ─── Types ────────────────────────────────────────────────────────────────────

interface FeedItem {
  id: string;
  bgImage: string;
  bgAlt: string;
  category: string;
  title: string;
  description: string;
  creatorName: string;
  creatorHandle: string;
  listens: string;
  duration: string;
  likes: string;
  comments: string;
  avatarImage: string;
  avatarAlt: string;
}

// ─── Static feed data ─────────────────────────────────────────────────────────

const FEED_ITEMS: FeedItem[] = [
  {
    id: 'p1',
    bgImage:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuCS9to8gno-KMZxuSeaS_k8y_7LJtdbmqhPIorbh-0dwOcUtpvUJRZpAViIpXYx-6Zs_QVmjGSGJwX2d9GX0mggXxmcX2R5jXMD6FuoOfNqNOM83YACmVlgKKO7f-L_vuAbDqOCytVkDgaLcIOds2yd9HbzNWewiU4a9HUnBLA2fq6IOMOUc9K3rI5nJB2846GFiERAtxdaW2ODqNIBk67HmuHAtL388gEfdLUVOhtPDk9O0EH0zTFQeUwna1NqkIj_iNE6jI039YKX',
    bgAlt: 'ميكروفون استوديو احترافي على خلفية داكنة دافئة',
    category: 'ثقافة',
    title: 'أثر الصوت في الذاكرة',
    description: 'دقيقة عن كيف يترك الصوت بصمة دائمة في الذاكرة البشرية',
    creatorName: 'منصة إثراء',
    creatorHandle: '@ithra.voice',
    listens: '٢٤٨ ألف استماع',
    duration: 'مدة ٠:٤٥',
    likes: '٢٤.٥ك',
    comments: '٨٤٢',
    avatarImage:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuA2qHr5C5QGp0Q3uUeRhbgB0lejCNaO4UegUWuNgX2I20h5AgZZsGf2Be0pPxuewxjLmgdTwCJ75tQHfP93LMCgPErSmgAJdUtZzdVPkfFy_x4S84ZuoYMRFBZ9YOLsjiqD2z9DHdU7F2oO94psoCMMas9exXCB4qznISuwGGTjgKX-GradVYn6yHbMHgVPNIDV9Z99OCroyuA5SfN3v5IfoUxXUiqmasiLVw4qW1QewpJYLAnP_1fLeRp_4W6k4eiRYNySPTBGvX2n',
    avatarAlt: 'شعار منصة إثراء',
  },
  {
    id: 'p2',
    bgImage:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuBNK3ytSH36YPuK5Y5uGUD1hNKqL885wssu5FS0uMxxunZi9NEUjnw9yXKcR3o3Cz8dmHiZOkToVNYvbAW-cXuUWhrIPcbLZVBE0Ahx1xzkUJZbCI7NlCCSdAaEBnLXSUKbKqeJ8URgfMjCbQbchqdlRy02ePlq3MK6eFSvjWaEOvomD3nbRcesyvbMkMe3fIicMwvqvdW3Jht44wZAzUkMXJUHttoqhpY0LiGco-L9U81UZBZfR_LSI3rn08Ad9pT1I3x5I3KP8umF',
    bgAlt: 'خلفية داكنة ذهبية لحفل موسيقي',
    category: 'فن',
    title: 'مسرح بلا جمهور',
    description: 'تجربة صوتية حصرية من كواليس المسرح الوطني',
    creatorName: 'دار الأوبرا',
    creatorHandle: '@opera.house',
    listens: '١١٥ ألف استماع',
    duration: 'مدة ١:١٠',
    likes: '١٨.٢ك',
    comments: '٦٢٣',
    avatarImage:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuBNK3ytSH36YPuK5Y5uGUD1hNKqL885wssu5FS0uMxxunZi9NEUjnw9yXKcR3o3Cz8dmHiZOkToVNYvbAW-cXuUWhrIPcbLZVBE0Ahx1xzkUJZbCI7NlCCSdAaEBnLXSUKbKqeJ8URgfMjCbQbchqdlRy02ePlq3MK6eFSvjWaEOvomD3nbRcesyvbMkMe3fIicMwvqvdW3Jht44wZAzUkMXJUHttoqhpY0LiGco-L9U81UZBZfR_LSI3rn08Ad9pT1I3x5I3KP8umF',
    avatarAlt: 'شعار دار الأوبرا',
  },
  {
    id: 'p3',
    bgImage:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuCS9to8gno-KMZxuSeaS_k8y_7LJtdbmqhPIorbh-0dwOcUtpvUJRZpAViIpXYx-6Zs_QVmjGSGJwX2d9GX0mggXxmcX2R5jXMD6FuoOfNqNOM83YACmVlgKKO7f-L_vuAbDqOCytVkDgaLcIOds2yd9HbzNWewiU4a9HUnBLA2fq6IOMOUc9K3rI5nJB2846GFiERAtxdaW2ODqNIBk67HmuHAtL388gEfdLUVOhtPDk9O0EH0zTFQeUwna1NqkIj_iNE6jI039YKX',
    bgAlt: 'لقطة فنية داكنة لميكروفون ذهبي',
    category: 'حوار',
    title: 'صوت الحكمة',
    description: 'حلقة خاصة مع أحد أبرز مفكري القرن الواحد والعشرين',
    creatorName: 'راشد الغامدي',
    creatorHandle: '@rashed.ghamdi',
    listens: '٨٩ ألف استماع',
    duration: 'مدة ١:٤٠',
    likes: '٩.٤ك',
    comments: '٣١٧',
    avatarImage:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuA2qHr5C5QGp0Q3uUeRhbgB0lejCNaO4UegUWuNgX2I20h5AgZZsGf2Be0pPxuewxjLmgdTwCJ75tQHfP93LMCgPErSmgAJdUtZzdVPkfFy_x4S84ZuoYMRFBZ9YOLsjiqD2z9DHdU7F2oO94psoCMMas9exXCB4qznISuwGGTjgKX-GradVYn6yHbMHgVPNIDV9Z99OCroyuA5SfN3v5IfoUxXUiqmasiLVw4qW1QewpJYLAnP_1fLeRp_4W6k4eiRYNySPTBGvX2n',
    avatarAlt: 'صورة راشد الغامدي',
  },
];

// ─── Sub-nav ───────────────────────────────────────────────────────────────────
// Visual order: اكتشف | لك | المتابعة | الرائج
// pill is dir=ltr so DOM order = visual order.
const SUB_NAV_LABELS = ['اكتشف', 'لك', 'المتابعة', 'الرائج'] as const;
type SubNavItem = (typeof SUB_NAV_LABELS)[number];

// ─── Progress dots ─────────────────────────────────────────────────────────────

interface DotsProps { total: number; active: number; }

const FeedDots: React.FC<DotsProps> = ({ total, active }) => (
  <div className="pdp-progress" aria-hidden="true">
    {Array.from({ length: total }).map((_, i) => (
      <div key={i} className={`pdp-dot${i === active ? ' pdp-dot--active' : ''}`} />
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
  <div className="pdp-rail">
    {/* Avatar + follow */}
    <div className="pdp-avatar-wrap">
      <img src={item.avatarImage} alt={item.avatarAlt} className="pdp-avatar" />
      <button
        className={`pdp-follow-btn${followed ? ' pdp-follow-btn--following' : ''}`}
        aria-label={followed ? 'إلغاء المتابعة' : 'متابعة المبدع'}
        aria-pressed={followed}
        onClick={onFollow}
      >
        <span className="pdp-follow-icon-box">
          <span className="material-symbols-outlined">
            {followed ? 'check' : 'add'}
          </span>
        </span>
      </button>
    </div>

    {/* دعم */}
    <button className="pdp-action-btn" aria-label="دعم">
      <span className="pdp-action-icon-box">
        <span className="material-symbols-outlined pdp-action-icon">volunteer_activism</span>
      </span>
      <span className="pdp-action-label">دعم</span>
    </button>

    {/* Like */}
    <button
      className="pdp-action-btn"
      aria-label={liked ? 'إلغاء الإعجاب' : 'إعجاب'}
      aria-pressed={liked}
      onClick={onLike}
    >
      <span className="pdp-action-icon-box">
        <span className={`material-symbols-outlined pdp-action-icon${liked ? ' pdp-action-icon--active' : ''}`}>
          favorite
        </span>
      </span>
      <span className="pdp-action-label">{item.likes}</span>
    </button>

    {/* Comments */}
    <button className="pdp-action-btn" aria-label="التعليقات">
      <span className="pdp-action-icon-box">
        <span className="material-symbols-outlined pdp-action-icon">chat_bubble</span>
      </span>
      <span className="pdp-action-label">{item.comments}</span>
    </button>

    {/* Save */}
    <button
      className="pdp-action-btn"
      aria-label={saved ? 'إلغاء الحفظ' : 'حفظ'}
      aria-pressed={saved}
      onClick={onSave}
    >
      <span className="pdp-action-icon-box">
        <span className={`material-symbols-outlined pdp-action-icon${saved ? ' pdp-action-icon--active' : ''}`}>
          bookmark
        </span>
      </span>
      <span className="pdp-action-label">حفظ</span>
    </button>

    {/* Share */}
    <button className="pdp-action-btn" aria-label="مشاركة">
      <span className="pdp-action-icon-box">
        <span className="material-symbols-outlined pdp-action-icon">share</span>
      </span>
      <span className="pdp-action-label">مشاركة</span>
    </button>
  </div>
);

// ─── Content info block ────────────────────────────────────────────────────────

interface InfoBlockProps { item: FeedItem; }

const InfoBlock: React.FC<InfoBlockProps> = ({ item }) => (
  <div className="pdp-info">
    {/* Category chip */}
    <div className="pdp-category-chip">
      <span>{item.category}</span>
    </div>

    {/* Title */}
    <h2 className="pdp-title">{item.title}</h2>

    {/* Description */}
    <p className="pdp-description">{item.description}</p>

    {/* Creator row */}
    <div className="pdp-creator-row">
      <span className="pdp-creator-name">{item.creatorName}</span>
      <span className="pdp-creator-handle" dir="ltr">{item.creatorHandle}</span>
    </div>

    {/* Metadata */}
    <div className="pdp-meta-row">
      <span className="material-symbols-outlined pdp-meta-icon">headphones</span>
      <span className="pdp-meta-text" dir="rtl">
        {item.listens} • {item.duration}
      </span>
    </div>

    {/* Hashtags */}
    <div className="pdp-meta-row">
      <span className="pdp-meta-text">{`#صوت #ثقافة`}</span>
    </div>

    {/* CTA */}
    <button className="pdp-cta-btn" aria-label="استمع للعمل الكامل">
      <span className="material-symbols-outlined pdp-cta-icon">play_arrow</span>
      <span className="pdp-cta-text">استمع للعمل الكامل</span>
    </button>
  </div>
);

// ─── Main page ─────────────────────────────────────────────────────────────────

const PlusDiscoverPage: React.FC = () => {
  const [subNav, setSubNav] = useState<SubNavItem>('لك');
  const [feedIndex, setFeedIndex] = useState(0);
  const [liked,    setLiked]    = useState(false);
  const [saved,    setSaved]    = useState(false);
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
    <div className="pdp-root" dir="rtl" lang="ar">
      {/* ── Background media layer ──────────────────────────────────────────── */}
      <div className="pdp-bg">
        <img
          src={currentItem.bgImage}
          alt={currentItem.bgAlt}
          className="pdp-bg-image"
          key={currentItem.id}
        />
        <div className="pdp-story-gradient" />
        <div className="pdp-side-gradient" />
        {/* Plus warm tint overlay */}
        <div className="pdp-plus-tint" />
      </div>

      {/* ── Feed position dots ──────────────────────────────────────────────── */}
      <FeedDots total={FEED_ITEMS.length} active={feedIndex} />

      {/* ── Main content ────────────────────────────────────────────────────── */}
      <main className="pdp-main">

        {/* Discover sub-nav */}
        <div className="pdp-subnav-cluster">
          <div className="pdp-glass-pill" role="tablist" aria-label="تصفية الاكتشاف">
            {SUB_NAV_LABELS.map(label => (
              <button
                key={label}
                role="tab"
                aria-selected={label === subNav}
                className={`pdp-pill-btn${label === subNav ? ' pdp-pill-btn--active' : ''}`}
                onClick={() => setSubNav(label)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Flex spacer */}
        <div className="pdp-spacer" aria-hidden="true" />

        {/* Lower: info block */}
        <div className="pdp-lower">
          <InfoBlock item={currentItem} />
        </div>
      </main>

      {/* Rail — absolute, vertically centered on right edge */}
      <ActionRail
        item={currentItem}
        liked={liked}
        saved={saved}
        followed={followed}
        onLike={handleLike}
        onSave={handleSave}
        onFollow={handleFollow}
      />

      {/* ── Invisible hit-area nav (swipe prep) ─────────────────────────────── */}
      <button
        className="pdp-nav-hit pdp-nav-hit--next"
        aria-label="العنصر التالي في الموجز"
        onClick={goNext}
      />
      <button
        className="pdp-nav-hit pdp-nav-hit--prev"
        aria-label="العنصر السابق في الموجز"
        onClick={goPrev}
      />
    </div>
  );
};

export { PlusDiscoverPage };
export default PlusDiscoverPage;
