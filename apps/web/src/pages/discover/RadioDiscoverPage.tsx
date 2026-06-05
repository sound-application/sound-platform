/**
 * RadioDiscoverPage.tsx — Radio world Discover feed.
 * Clone of GeneralDiscoverPage. Prefix: rdp-. Accent: #e53935 (crimson).
 * No world nav · No filters · Subnav: اكتشف|لك|المتابعة|الرائج
 */
import React, { useState, useCallback } from 'react';
import './RadioDiscoverPage.css';
import i18n from "i18next";

const t = (key: any, options?: any) => i18n.t(key, options) as any as string;


interface FeedItem {
  id: string; bgImage: string; bgAlt: string;
  category: string; title: string; description: string;
  creatorName: string; creatorHandle: string;
  listens: string; duration: string;
  likes: string; comments: string;
  avatarImage: string; avatarAlt: string;
}

const FEED_ITEMS: FeedItem[] = [
  {
    id: 'r1',
    bgImage: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCS9to8gno-KMZxuSeaS_k8y_7LJtdbmqhPIorbh-0dwOcUtpvUJRZpAViIpXYx-6Zs_QVmjGSGJwX2d9GX0mggXxmcX2R5jXMD6FuoOfNqNOM83YACmVlgKKO7f-L_vuAbDqOCytVkDgaLcIOds2yd9HbzNWewiU4a9HUnBLA2fq6IOMOUc9K3rI5nJB2846GFiERAtxdaW2ODqNIBk67HmuHAtL388gEfdLUVOhtPDk9O0EH0zTFQeUwna1NqkIj_iNE6jI039YKX',
    bgAlt: t('radiodiscover:radioStudioWithBroadcastMicrophoneAndRed'),
    category: t('radiodiscover:news'),
    title: t('radiodiscover:eveningBulletin'),
    description: t('radiodiscover:comprehensiveNewsCoverageOfTheMostPromin'),
    creatorName: t('radiodiscover:voiceOfArabsRadio'),
    creatorHandle: '@sawt.alarab',
    listens: t('radiodiscover:128ThousandListeners'),
    duration: t('radiodiscover:onAirNow'),
    likes: t('radiodiscover:key1351'), comments: t('radiodiscover:key34'),
    avatarImage: 'https://lh3.googleusercontent.com/aida-public/AB6AXuA2qHr5C5QGp0Q3uUeRhbgB0lejCNaO4UegUWuNgX2I20h5AgZZsGf2Be0pPxuewxjLmgdTwCJ75tQHfP93LMCgPErSmgAJdUtZzdVPkfFy_x4S84ZuoYMRFBZ9YOLsjiqD2z9DHdU7F2oO94psoCMMas9exXCB4qznISuwGGTjgKX-GradVYn6yHbMHgVPNIDV9Z99OCroyuA5SfN3v5IfoUxXUiqmasiLVw4qW1QewpJYLAnP_1fLeRp_4W6k4eiRYNySPTBGvX2n',
    avatarAlt: t('radiodiscover:voiceOfArabRadioLogo'),
  },
  {
    id: 'r2',
    bgImage: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBNK3ytSH36YPuK5Y5uGUD1hNKqL885wssu5FS0uMxxunZi9NEUjnw9yXKcR3o3Cz8dmHiZOkToVNYvbAW-cXuUWhrIPcbLZVBE0Ahx1xzkUJZbCI7NlCCSdAaEBnLXSUKbKqeJ8URgfMjCbQbchqdlRy02ePlq3MK6eFSvjWaEOvomD3nbRcesyvbMkMe3fIicMwvqvdW3Jht44wZAzUkMXJUHttoqhpY0LiGco-L9U81UZBZfR_LSI3rn08Ad9pT1I3x5I3KP8umF',
    bgAlt: t('radiodiscover:broadcasterInRadioStudioWithBannerOnAir'),
    category: t('radiodiscover:dialogues'),
    title: t('radiodiscover:guestOfTheWeek'),
    description: t('radiodiscover:anExtensiveDialogueWithAProminentCultura'),
    creatorName: t('radiodiscover:networkRadio'),
    creatorHandle: '@radio.shabaka',
    listens: t('radiodiscover:76ThousandListeners'),
    duration: t('radiodiscover:duration130'),
    likes: t('radiodiscover:key7572'), comments: t('radiodiscover:key7189'),
    avatarImage: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBNK3ytSH36YPuK5Y5uGUD1hNKqL885wssu5FS0uMxxunZi9NEUjnw9yXKcR3o3Cz8dmHiZOkToVNYvbAW-cXuUWhrIPcbLZVBE0Ahx1xzkUJZbCI7NlCCSdAaEBnLXSUKbKqeJ8URgfMjCbQbchqdlRy02ePlq3MK6eFSvjWaEOvomD3nbRcesyvbMkMe3fIicMwvqvdW3Jht44wZAzUkMXJUHttoqhpY0LiGco-L9U81UZBZfR_LSI3rn08Ad9pT1I3x5I3KP8umF',
    avatarAlt: t('radiodiscover:networkRadioLogo'),
  },
  {
    id: 'r3',
    bgImage: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCS9to8gno-KMZxuSeaS_k8y_7LJtdbmqhPIorbh-0dwOcUtpvUJRZpAViIpXYx-6Zs_QVmjGSGJwX2d9GX0mggXxmcX2R5jXMD6FuoOfNqNOM83YACmVlgKKO7f-L_vuAbDqOCytVkDgaLcIOds2yd9HbzNWewiU4a9HUnBLA2fq6IOMOUc9K3rI5nJB2846GFiERAtxdaW2ODqNIBk67HmuHAtL388gEfdLUVOhtPDk9O0EH0zTFQeUwna1NqkIj_iNE6jI039YKX',
    bgAlt: t('radiodiscover:radioConsoleWithSoundWavesAndStudioLight'),
    category: t('radiodiscover:culture'),
    title: t('radiodiscover:creativitySpace'),
    description: t('radiodiscover:aWeeklyProgramHostingTheMostProminentLit'),
    creatorName: t('radiodiscover:amwajFm'),
    creatorHandle: '@amwaj.fm',
    listens: t('radiodiscover:94ThousandListeners'),
    duration: t('radiodiscover:duration055'),
    likes: t('radiodiscover:key7247'), comments: t('radiodiscover:key6328'),
    avatarImage: 'https://lh3.googleusercontent.com/aida-public/AB6AXuA2qHr5C5QGp0Q3uUeRhbgB0lejCNaO4UegUWuNgX2I20h5AgZZsGf2Be0pPxuewxjLmgdTwCJ75tQHfP93LMCgPErSmgAJdUtZzdVPkfFy_x4S84ZuoYMRFBZ9YOLsjiqD2z9DHdU7F2oO94psoCMMas9exXCB4qznISuwGGTjgKX-GradVYn6yHbMHgVPNIDV9Z99OCroyuA5SfN3v5IfoUxXUiqmasiLVw4qW1QewpJYLAnP_1fLeRp_4W6k4eiRYNySPTBGvX2n',
    avatarAlt: t('radiodiscover:amwajFmLogo'),
  },
];

const SUB_NAV_LABELS = [t('radiodiscover:findOut'), t('radiodiscover:forYou'), t('radiodiscover:followUp'), t('radiodiscover:trending')] as const;
type SubNavItem = (typeof SUB_NAV_LABELS)[number];

const FeedDots: React.FC<{ total: number; active: number }> = ({ total, active }) => (
  <div className="rdp-progress" aria-hidden="true">
    {Array.from({ length: total }).map((_, i) => (
      <div key={i} className={`rdp-dot${i === active ? ' rdp-dot--active' : ''}`} />
    ))}
  </div>
);

interface RailProps {
  item: FeedItem; liked: boolean; saved: boolean; followed: boolean;
  onLike: () => void; onSave: () => void; onFollow: () => void;
}

const ActionRail: React.FC<RailProps> = ({ item, liked, saved, followed, onLike, onSave, onFollow }) => (
  <div className="rdp-rail">
    <div className="rdp-avatar-wrap">
      <img src={item.avatarImage} alt={item.avatarAlt} className="rdp-avatar" />
      <button
        className={`rdp-follow-btn${followed ? ' rdp-follow-btn--following' : ''}`}
        aria-label={followed ? t('radiodiscover:unfollow') : t('radiodiscover:followTheStation')}
        aria-pressed={followed}
        onClick={onFollow}
      >
        <span className="rdp-follow-icon-box">
          <span className="material-symbols-outlined">{followed ? 'check' : 'add'}</span>
        </span>
      </button>
    </div>

    <button className="rdp-action-btn" aria-label={liked ? t('radiodiscover:unlike') : t('radiodiscover:wonder')} aria-pressed={liked} onClick={onLike}>
      <span className="rdp-action-icon-box">
        <span className={`material-symbols-outlined rdp-action-icon${liked ? ' rdp-action-icon--active' : ''}`}>favorite</span>
      </span>
      <span className="rdp-action-label">{item.likes}</span>
    </button>

    <button className="rdp-action-btn" aria-label={t('radiodiscover:comments')}>
      <span className="rdp-action-icon-box">
        <span className="material-symbols-outlined rdp-action-icon">chat_bubble</span>
      </span>
      <span className="rdp-action-label">{item.comments}</span>
    </button>

    <button className="rdp-action-btn" aria-label={saved ? t('radiodiscover:cancelSaving') : t('radiodiscover:keep')} aria-pressed={saved} onClick={onSave}>
      <span className="rdp-action-icon-box">
        <span className={`material-symbols-outlined rdp-action-icon${saved ? ' rdp-action-icon--active' : ''}`}>bookmark</span>
      </span>
      <span className="rdp-action-label">{t('radiodiscover:keep')}</span>
    </button>

    <button className="rdp-action-btn" aria-label={t('radiodiscover:repost')}>
      <span className="rdp-action-icon-box">
        <span className="material-symbols-outlined rdp-action-icon">repeat</span>
      </span>
      <span className="rdp-action-label">{t('radiodiscover:re')}</span>
    </button>

    <button className="rdp-action-btn" aria-label={t('radiodiscover:sharing')}>
      <span className="rdp-action-icon-box">
        <span className="material-symbols-outlined rdp-action-icon">share</span>
      </span>
      <span className="rdp-action-label">{t('radiodiscover:sharing')}</span>
    </button>

    <button className="rdp-action-btn" aria-label={t('radiodiscover:sendAGift')}>
      <span className="rdp-action-icon-box">
        <span className="material-symbols-outlined rdp-action-icon">card_giftcard</span>
      </span>
      <span className="rdp-action-label">{t('radiodiscover:gift')}</span>
    </button>
  </div>
);

const InfoBlock: React.FC<{ item: FeedItem }> = ({ item }) => (
  <div className="rdp-info">
    <div className="rdp-category-chip"><span>{item.category}</span></div>
    <h2 className="rdp-title">{item.title}</h2>
    <p className="rdp-description">{item.description}</p>
    <div className="rdp-creator-row">
      <span className="rdp-creator-name">{item.creatorName}</span>
      <span className="rdp-creator-handle" dir="ltr">{item.creatorHandle}</span>
    </div>
    <div className="rdp-meta-row">
      <span className="material-symbols-outlined rdp-meta-icon">radio</span>
      <span className="rdp-meta-text">{item.listens} • {item.duration}</span>
    </div>
    <button className="rdp-cta-btn" aria-label={t('radiodiscover:listenNow')}>
      <span className="material-symbols-outlined rdp-cta-icon">graphic_eq</span>
      <span className="rdp-cta-text">{t('radiodiscover:listenNow')}</span>
    </button>
  </div>
);

const RadioDiscoverPage: React.FC = () => {
  const [subNav,    setSubNav]    = useState<SubNavItem>(t('radiodiscover:forYou'));
  const [feedIndex, setFeedIndex] = useState(0);
  const [liked,     setLiked]     = useState(false);
  const [saved,     setSaved]     = useState(false);
  const [followed,  setFollowed]  = useState(false);

  const currentItem = FEED_ITEMS[feedIndex] as FeedItem;

  const handleLike   = useCallback(() => setLiked(v => !v), []);
  const handleSave   = useCallback(() => setSaved(v => !v), []);
  const handleFollow = useCallback(() => setFollowed(v => !v), []);

  const resetItemState = useCallback(() => {
    setLiked(false); setSaved(false); setFollowed(false);
  }, []);

  const goNext = useCallback(() => {
    setFeedIndex(i => (i + 1) % FEED_ITEMS.length); resetItemState();
  }, [resetItemState]);

  const goPrev = useCallback(() => {
    setFeedIndex(i => (i - 1 + FEED_ITEMS.length) % FEED_ITEMS.length); resetItemState();
  }, [resetItemState]);

  return (
    <div className="rdp-root" lang="ar">
      <div className="rdp-bg">
        <img src={currentItem.bgImage} alt={currentItem.bgAlt} className="rdp-bg-image" key={currentItem.id} />
        <div className="rdp-story-gradient" />
        <div className="rdp-side-gradient" />
        <div className="rdp-radio-tint" />
      </div>

      <FeedDots total={FEED_ITEMS.length} active={feedIndex} />

      <main className="rdp-main">
        <div className="rdp-subnav-cluster">
          <div className="rdp-glass-pill" role="tablist" aria-label={t('radiodiscover:filterDiscovery')}>
            {SUB_NAV_LABELS.map(label => (
              <button
                key={label} role="tab"
                aria-selected={label === subNav}
                className={`rdp-pill-btn${label === subNav ? ' rdp-pill-btn--active' : ''}`}
                onClick={() => setSubNav(label)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="rdp-spacer" aria-hidden="true" />

        <div className="rdp-lower">
          <InfoBlock item={currentItem} />
        </div>
      </main>

      <ActionRail
        item={currentItem} liked={liked} saved={saved} followed={followed}
        onLike={handleLike} onSave={handleSave} onFollow={handleFollow}
      />

      <button className="rdp-nav-hit rdp-nav-hit--next" aria-label={t('radiodiscover:nextProgramme')} onClick={goNext} />
      <button className="rdp-nav-hit rdp-nav-hit--prev" aria-label={t('radiodiscover:previousProgramme')} onClick={goPrev} />
    </div>
  );
};

export { RadioDiscoverPage };
export default RadioDiscoverPage;
