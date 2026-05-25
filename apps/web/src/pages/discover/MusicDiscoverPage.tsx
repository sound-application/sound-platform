/**
 * MusicDiscoverPage.tsx
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
 *   - World accent: Music Emerald (#1db97c)
 *   - Forbidden: مباشر, بطولات, استكشاف, لقطات, البث, جلسة
 */

import React, { useState, useCallback } from 'react';
import './MusicDiscoverPage.css';

// ─── Types ─────────────────────────────────────────────────────────────────────

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

// ─── Static feed data — Music world ────────────────────────────────────────────

const FEED_ITEMS: FeedItem[] = [
  {
    id: 'm1',
    bgImage:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuCS9to8gno-KMZxuSeaS_k8y_7LJtdbmqhPIorbh-0dwOcUtpvUJRZpAViIpXYx-6Zs_QVmjGSGJwX2d9GX0mggXxmcX2R5jXMD6FuoOfNqNOM83YACmVlgKKO7f-L_vuAbDqOCytVkDgaLcIOds2yd9HbzNWewiU4a9HUnBLA2fq6IOMOUc9K3rI5nJB2846GFiERAtxdaW2ODqNIBk67HmuHAtL388gEfdLUVOhtPDk9O0EH0zTFQeUwna1NqkIj_iNE6jI039YKX',
    bgAlt: 'استوديو تسجيل موسيقي مع إضاءة خضراء داكنة',
    category: 'موسيقى',
    title: 'عزف بلا حدود',
    description: 'ألبوم موسيقي جديد يمزج بين أصوات العود والإلكترونيات الحديثة',
    creatorName: 'ليلى نجم',
    creatorHandle: '@layla.najm',
    listens: '٣١٢ ألف استماع',
    duration: 'مدة ٣:٢٨',
    likes: '١٨ك',
    comments: '٦٧٢',
    avatarImage:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuA2qHr5C5QGp0Q3uUeRhbgB0lejCNaO4UegUWuNgX2I20h5AgZZsGf2Be0pPxuewxjLmgdTwCJ75tQHfP93LMCgPErSmgAJdUtZzdVPkfFy_x4S84ZuoYMRFBZ9YOLsjiqD2z9DHdU7F2oO94psoCMMas9exXCB4qznISuwGGTjgKX-GradVYn6yHbMHgVPNIDV9Z99OCroyuA5SfN3v5IfoUxXUiqmasiLVw4qW1QewpJYLAnP_1fLeRp_4W6k4eiRYNySPTBGvX2n',
    avatarAlt: 'صورة الفنانة ليلى نجم',
  },
  {
    id: 'm2',
    bgImage:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuBNK3ytSH36YPuK5Y5uGUD1hNKqL885wssu5FS0uMxxunZi9NEUjnw9yXKcR3o3Cz8dmHiZOkToVNYvbAW-cXuUWhrIPcbLZVBE0Ahx1xzkUJZbCI7NlCCSdAaEBnLXSUKbKqeJ8URgfMjCbQbchqdlRy02ePlq3MK6eFSvjWaEOvomD3nbRcesyvbMkMe3fIicMwvqvdW3Jht44wZAzUkMXJUHttoqhpY0LiGco-L9U81UZBZfR_LSI3rn08Ad9pT1I3x5I3KP8umF',
    bgAlt: 'خلفية موسيقية داكنة مع أضواء خضراء',
    category: 'أغاني',
    title: 'صوت الروح',
    description: 'أغنية تجريبية تُعيد تفسير الموسيقى الشعبية بأسلوب معاصر',
    creatorName: 'خالد الطيب',
    creatorHandle: '@khaled.tayyib',
    listens: '٢٢٤ ألف استماع',
    duration: 'مدة ٤:١٥',
    likes: '١١ك',
    comments: '٤٩٠',
    avatarImage:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuBNK3ytSH36YPuK5Y5uGUD1hNKqL885wssu5FS0uMxxunZi9NEUjnw9yXKcR3o3Cz8dmHiZOkToVNYvbAW-cXuUWhrIPcbLZVBE0Ahx1xzkUJZbCI7NlCCSdAaEBnLXSUKbKqeJ8URgfMjCbQbchqdlRy02ePlq3MK6eFSvjWaEOvomD3nbRcesyvbMkMe3fIicMwvqvdW3Jht44wZAzUkMXJUHttoqhpY0LiGco-L9U81UZBZfR_LSI3rn08Ad9pT1I3x5I3KP8umF',
    avatarAlt: 'صورة الفنان خالد الطيب',
  },
  {
    id: 'm3',
    bgImage:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuCS9to8gno-KMZxuSeaS_k8y_7LJtdbmqhPIorbh-0dwOcUtpvUJRZpAViIpXYx-6Zs_QVmjGSGJwX2d9GX0mggXxmcX2R5jXMD6FuoOfNqNOM83YACmVlgKKO7f-L_vuAbDqOCytVkDgaLcIOds2yd9HbzNWewiU4a9HUnBLA2fq6IOMOUc9K3rI5nJB2846GFiERAtxdaW2ODqNIBk67HmuHAtL388gEfdLUVOhtPDk9O0EH0zTFQeUwna1NqkIj_iNE6jI039YKX',
    bgAlt: 'أدوات موسيقية في استوديو فني',
    category: 'فيوجن',
    title: 'جسر الأصوات',
    description: 'تجربة صوتية تجمع بين الموسيقى الكلاسيكية والبيت العربي',
    creatorName: 'منى الشمري',
    creatorHandle: '@mona.shammari',
    listens: '١٣٥ ألف استماع',
    duration: 'مدة ٥:٠٢',
    likes: '٧.٤ك',
    comments: '٣١٨',
    avatarImage:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuA2qHr5C5QGp0Q3uUeRhbgB0lejCNaO4UegUWuNgX2I20h5AgZZsGf2Be0pPxuewxjLmgdTwCJ75tQHfP93LMCgPErSmgAJdUtZzdVPkfFy_x4S84ZuoYMRFBZ9YOLsjiqD2z9DHdU7F2oO94psoCMMas9exXCB4qznISuwGGTjgKX-GradVYn6yHbMHgVPNIDV9Z99OCroyuA5SfN3v5IfoUxXUiqmasiLVw4qW1QewpJYLAnP_1fLeRp_4W6k4eiRYNySPTBGvX2n',
    avatarAlt: 'صورة الفنانة منى الشمري',
  },
];

// ─── Sub-nav ───────────────────────────────────────────────────────────────────
// Required visual order:  اكتشف | لك | المتابعة | الرائج
// Rendered in natural order; mdp-glass-pill uses direction:ltr so DOM=visual order.
const SUB_NAV_LABELS = ['اكتشف', 'لك', 'المتابعة', 'الرائج'] as const;
type SubNavItem = (typeof SUB_NAV_LABELS)[number];

// ─── Progress dots ──────────────────────────────────────────────────────────────

interface DotsProps { total: number; active: number; }

const FeedDots: React.FC<DotsProps> = ({ total, active }) => (
  <div className="mdp-progress" aria-hidden="true">
    {Array.from({ length: total }).map((_, i) => (
      <div key={i} className={`mdp-dot${i === active ? ' mdp-dot--active' : ''}`} />
    ))}
  </div>
);

// ─── Action rail ────────────────────────────────────────────────────────────────

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
  <div className="mdp-rail">
    {/* Avatar + follow */}
    <div className="mdp-avatar-wrap">
      <img src={item.avatarImage} alt={item.avatarAlt} className="mdp-avatar" />
      <button
        className={`mdp-follow-btn${followed ? ' mdp-follow-btn--following' : ''}`}
        aria-label={followed ? 'إلغاء المتابعة' : 'متابعة الفنان'}
        aria-pressed={followed}
        onClick={onFollow}
      >
        <span className="mdp-follow-icon-box">
          <span className="material-symbols-outlined">
            {followed ? 'check' : 'add'}
          </span>
        </span>
      </button>
    </div>

    {/* Like */}
    <button
      className="mdp-action-btn"
      aria-label={liked ? 'إلغاء الإعجاب' : 'إعجاب'}
      aria-pressed={liked}
      onClick={onLike}
    >
      <span className="mdp-action-icon-box">
        <span className={`material-symbols-outlined mdp-action-icon${liked ? ' mdp-action-icon--active' : ''}`}>
          favorite
        </span>
      </span>
      <span className="mdp-action-label">{item.likes}</span>
    </button>

    {/* Comments */}
    <button className="mdp-action-btn" aria-label="التعليقات">
      <span className="mdp-action-icon-box">
        <span className="material-symbols-outlined mdp-action-icon">chat_bubble</span>
      </span>
      <span className="mdp-action-label">{item.comments}</span>
    </button>

    {/* Save */}
    <button
      className="mdp-action-btn"
      aria-label={saved ? 'إلغاء الحفظ' : 'حفظ'}
      aria-pressed={saved}
      onClick={onSave}
    >
      <span className="mdp-action-icon-box">
        <span className={`material-symbols-outlined mdp-action-icon${saved ? ' mdp-action-icon--active' : ''}`}>
          bookmark
        </span>
      </span>
      <span className="mdp-action-label">حفظ</span>
    </button>

    {/* Repost */}
    <button className="mdp-action-btn" aria-label="إعادة نشر">
      <span className="mdp-action-icon-box">
        <span className="material-symbols-outlined mdp-action-icon">repeat</span>
      </span>
      <span className="mdp-action-label">إعادة</span>
    </button>

    {/* Share */}
    <button className="mdp-action-btn" aria-label="مشاركة">
      <span className="mdp-action-icon-box">
        <span className="material-symbols-outlined mdp-action-icon">share</span>
      </span>
      <span className="mdp-action-label">مشاركة</span>
    </button>

    {/* Gift */}
    <button className="mdp-action-btn" aria-label="إرسال هدية">
      <span className="mdp-action-icon-box">
        <span className="material-symbols-outlined mdp-action-icon">card_giftcard</span>
      </span>
      <span className="mdp-action-label">هدية</span>
    </button>
  </div>
);

// ─── Content info block ─────────────────────────────────────────────────────────
// CTA is part of this block so it always flows below the metadata — never overlaps.

interface InfoBlockProps { item: FeedItem; }

const InfoBlock: React.FC<InfoBlockProps> = ({ item }) => (
  <div className="mdp-info">
    {/* Category chip */}
    <div className="mdp-category-chip">
      <span>{item.category}</span>
    </div>

    {/* Title */}
    <h2 className="mdp-title">{item.title}</h2>

    {/* Description */}
    <p className="mdp-description">{item.description}</p>

    {/* Creator row */}
    <div className="mdp-creator-row">
      <span className="mdp-creator-name">{item.creatorName}</span>
      <span className="mdp-creator-handle" dir="ltr">{item.creatorHandle}</span>
    </div>

    {/* Metadata */}
    <div className="mdp-meta-row">
      <span className="material-symbols-outlined mdp-meta-icon">music_note</span>
      <span className="mdp-meta-text" dir="rtl">
        {item.listens} • {item.duration}
      </span>
    </div>

    {/* CTA — in flow, always below metadata, never overlaps */}
    <button className="mdp-cta-btn" aria-label="استمع للمقطوعة كاملة">
      <span className="material-symbols-outlined mdp-cta-icon">play_arrow</span>
      <span className="mdp-cta-text">استمع للمقطوعة كاملة</span>
    </button>
  </div>
);

// ─── Main page ──────────────────────────────────────────────────────────────────

const MusicDiscoverPage: React.FC = () => {
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
    <div className="mdp-root" dir="rtl" lang="ar">
      {/* ── Background media layer ──────────────────────────────────────────── */}
      <div className="mdp-bg">
        <img
          src={currentItem.bgImage}
          alt={currentItem.bgAlt}
          className="mdp-bg-image"
          key={currentItem.id}
        />
        <div className="mdp-story-gradient" />
        <div className="mdp-side-gradient" />
        <div className="mdp-music-tint" />
      </div>

      {/* ── Feed position dots ───────────────────────────────────────────────── */}
      <FeedDots total={FEED_ITEMS.length} active={feedIndex} />

      {/* ── Main content ─────────────────────────────────────────────────────── */}
      <main className="mdp-main">

        {/* Discover sub-nav — the ONLY nav element on this page */}
        {/* Visual order: اكتشف | لك | المتابعة | الرائج — pill is dir=ltr */}
        <div className="mdp-subnav-cluster">
          <div className="mdp-glass-pill" role="tablist" aria-label="تصفية الاكتشاف">
            {SUB_NAV_LABELS.map(label => (
              <button
                key={label}
                role="tab"
                aria-selected={label === subNav}
                className={`mdp-pill-btn${label === subNav ? ' mdp-pill-btn--active' : ''}`}
                onClick={() => setSubNav(label)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Flex spacer — pushes lower section to the bottom */}
        <div className="mdp-spacer" aria-hidden="true" />

        {/* Lower: info block only — rail is absolutely positioned on right */}
        <div className="mdp-lower">
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

      {/* ── Invisible hit-area nav (a11y, swipe prep) ───────────────────────── */}
      <button
        className="mdp-nav-hit mdp-nav-hit--next"
        aria-label="المقطوعة التالية"
        onClick={goNext}
      />
      <button
        className="mdp-nav-hit mdp-nav-hit--prev"
        aria-label="المقطوعة السابقة"
        onClick={goPrev}
      />
    </div>
  );
};

export { MusicDiscoverPage };
export default MusicDiscoverPage;
