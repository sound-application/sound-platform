import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { doc, onSnapshot } from 'firebase/firestore';
import { ref, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { callGetAudioPlaybackUrl } from '../lib/callables';
import type { AudioContentDoc } from '@sound/shared';
import { usePlayer } from '../contexts/PlayerContext';
import { useCategories } from '../hooks/useCategories';
import './Page.css';
import './AudioDetailPage.css';

function formatTime(ms: number) {
  if (isNaN(ms) || ms < 0) return '00:00';
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

export function AudioDetailPage() {
  const { contentId } = useParams<{ contentId: string }>();
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation('player');

  const [loading, setLoading] = useState(true);
  const [item, setItem] = useState<AudioContentDoc | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [playbackUrl, setPlaybackUrl] = useState<string | null>(null);
  const [playbackLoading, setPlaybackLoading] = useState(false);
  
  const [isSaved, setIsSaved] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [showCaptions, setShowCaptions] = useState(true);

  const { currentTrack, playerState, currentTime, duration, playTrack, togglePlay, seek, nextTrack, prevTrack } = usePlayer();
  const progressRef = useRef<HTMLDivElement>(null);

  const { categoryOptions, getSubcategoryOptions } = useCategories(item?.world || 'general');

  // 1. Fetch document
  useEffect(() => {
    if (!contentId) return;
    setLoading(true);
    const unsubscribe = onSnapshot(doc(db, 'contentItems', contentId), (snap) => {
      if (snap.exists()) setItem({ ...(snap.data() as AudioContentDoc), id: snap.id });
      else setError(t('not_found', 'المحتوى غير موجود'));
      setLoading(false);
    }, (err) => {
      setError(err.message);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [contentId]);

  // 2. Fetch cover image
  useEffect(() => {
    if (!item?.coverAsset?.storagePath) return;
    getDownloadURL(ref(storage, item.coverAsset.storagePath)).then(setCoverUrl).catch(console.error);
  }, [item?.coverAsset?.storagePath]);

  // 3. Fetch signed URL
  useEffect(() => {
    if (!item || !contentId || !currentUser || !item.audioAsset?.storagePath) return;
    setPlaybackLoading(true);
    callGetAudioPlaybackUrl({ contentId }).then(res => {
      if (res.data.playbackUrl) {
        setPlaybackUrl(res.data.playbackUrl);
        setError(null);
      }
    }).catch(err => {
      console.error(err);
      setError(err.message || t('error_loading_audio', 'حدث خطأ أثناء تحميل الصوت'));
    }).finally(() => setPlaybackLoading(false));
  }, [item, contentId, currentUser]);

  const handlePlayClick = () => {
    if (currentTrack?.id === item?.id) {
      togglePlay();
    } else if (item && playbackUrl) {
      playTrack({
        id: item.id,
        title: item.title,
        coverUrl: coverUrl || undefined,
        authorName: item.owner?.ownerDisplayName || t('default_user', 'مستخدم'),
        playbackUrl
      });
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement> | React.PointerEvent<HTMLDivElement>) => {
    if (!progressRef.current || !duration) return;
    const rect = progressRef.current.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    seek(ratio * duration);
  };

  const handleSkipForward = () => seek(Math.min(duration, currentTime + 5000));
  const handleSkipBack = () => seek(Math.max(0, currentTime - 5000));

  if (loading) return <div style={{padding: 40, textAlign: 'center'}}>{t('loading')}</div>;
  if (!item) return <div style={{padding: 40, textAlign: 'center'}}>{error || t('not_found')}</div>;
  // If there's an error but we have the item, we still render the item so the player isn't hidden.

  const isCurrent = currentTrack?.id === item.id;
  const isPlaying = isCurrent && playerState === 'playing';
  const progressPct = duration > 0 ? (currentTime / duration) * 100 : 0;
  // Check if captions/lyrics exist
  const hasCaptions = Boolean(item.captionsData || item.captionsAsset);
  const isMusic = item.kind === 'song' || item.kind === 'albumTrack';

  // Map audio kind to Arabic labels
  const kindLabels: Record<string, string> = {
    song: t('kind_song'),
    albumTrack: t('kind_album_track'),
    podcast: t('kind_podcast'),
    longAudio: t('kind_long_audio'),
    shortAudio: t('kind_short_audio')
  };
  const kindLabel = kindLabels[item.kind] || t('kind_audio');

  const resolvedCategoryLabel = categoryOptions.find(c => c.id === item.categoryId)?.label || item.categoryLabel;
  const resolvedSubcategoryLabel = getSubcategoryOptions(item.categoryId || '').find(s => s.id === item.subcategoryId)?.label || item.subcategoryLabel;

  return (
    <div className="adp-page" dir={i18n.dir()}>
      {/* Immersive Full-Bleed Background (Fixed to go behind World Navigator) */}
      <div className="adp-bg">
        <img src={coverUrl || '/default-cover.png'} alt="Cover Background" className="adp-bg-image" />
      </div>

      <div className="adp-content">
        {/* Header (No title) */}
        <header className="adp-header">
          <button className="adp-header-btn" onClick={() => navigate(-1)} title={t('back')}>
            <span className="material-symbols-outlined">{i18n.dir() === 'rtl' ? 'arrow_forward' : 'arrow_back'}</span>
          </button>
          <button className="adp-header-btn" title={t('report')}>
            <span className="material-symbols-outlined">flag</span>
          </button>
        </header>

        {/* Captions Preview Area */}
        {showCaptions && (
          <div className={`adp-captions-preview caption-style-${item.captionsSetup?.style || item.captionsData?.style || 'standard'}`}>
            <div className="adp-captions-text">
              {!hasCaptions
                ? (isMusic ? t('no_lyrics') : t('no_captions'))
                : (item.captionsData?.segments?.[0]?.text || (isMusic ? t('lyrics_preview') : t('captions_preview')))
              }
            </div>
          </div>
        )}

        {/* Player Area (pushed to bottom) */}
        <div className="adp-player-area">
          {/* Metadata */}
          <div className="adp-meta">
            <div className="adp-meta-category">
              {kindLabel} 
              {resolvedCategoryLabel && ` • ${resolvedCategoryLabel}`} 
              {resolvedSubcategoryLabel && ` • ${resolvedSubcategoryLabel}`}
            </div>

            <h2 className="adp-title">{item.title}</h2>
            
            <div className="adp-author-row">
              <span className="adp-artist">{item.owner?.ownerDisplayName || t('default_user', 'مستخدم')}</span>
              {(item.owner as any)?.isVerified && (
                <span className="material-symbols-outlined verified-badge">verified</span>
              )}
              <span className="adp-username" dir="ltr">@{item.owner?.ownerUsername || 'user'}</span>
            </div>

            <div className="adp-stats-row">
              <span>{item.listensCount || 0} {t('stat_listens')}</span>
              <span>•</span>
              <span>{item.likesCount || 0} {t('stat_likes')}</span>
              <span>•</span>
              <span>{item.commentsCount || 0} {t('stat_comments')}</span>
              <span>•</span>
              <span>{formatTime(item.processedAudio?.durationMs || item.editConfig?.editedDurationMs || item.audioAsset?.durationMs || duration)}</span>
            </div>

            {(item.caption || item.description) && (
              <p className="adp-description">{item.caption || item.description}</p>
            )}
            {!item.caption && !item.description && (
              <p className="adp-description" style={{ opacity: 0.5, fontStyle: 'italic' }}>{t('no_description')}</p>
            )}
          </div>

          {/* Progress */}
          <div className="adp-progress">
            <div className="adp-progress-bar-bg" onPointerDown={handleSeek} ref={progressRef} dir="ltr">
              <div className="adp-progress-fill" style={{ width: `${isCurrent ? progressPct : 0}%` }} />
            </div>
            <div className="adp-progress-times" dir="ltr">
              <span>{isCurrent ? formatTime(currentTime) : '00:00'}</span>
              <span>{isCurrent ? formatTime(duration) : '00:00'}</span>
            </div>
          </div>

          {/* Controls - Left side is Prev, Right side is Next. LTR forced. */}
          <div className="adp-controls">
            <button className="adp-ctrl-btn" onClick={prevTrack} title={t('prev_track', 'المقطع السابق')}>
              <span className="material-symbols-outlined">skip_previous</span>
            </button>
            <button className="adp-ctrl-btn" onClick={handleSkipBack} title={t('rewind_5s', 'إرجاع 5 ثوان')}>
              <span className="material-symbols-outlined">replay_5</span>
            </button>
            
            <button className="adp-play-btn" onClick={handlePlayClick} disabled={playbackLoading}>
              <span className="material-symbols-outlined">{isPlaying ? 'pause' : 'play_arrow'}</span>
            </button>

            <button className="adp-ctrl-btn" onClick={handleSkipForward} title={t('forward_5s', 'تقديم 5 ثوان')}>
              <span className="material-symbols-outlined">forward_5</span>
            </button>
            <button className="adp-ctrl-btn" onClick={nextTrack} title={t('next_track', 'المقطع التالي')}>
              <span className="material-symbols-outlined">skip_next</span>
            </button>
          </div>

          {/* Waveform below controls (dynamic world colors) */}
          <div className="adp-waveform">
            {Array.from({length: 40}).map((_, i) => (
              <div 
                key={i} 
                className="adp-wave-bar" 
                style={{ 
                  height: `${isPlaying ? Math.random() * 30 + 10 : 4}px`,
                  transition: 'height 0.2s ease'
                }} 
              />
            ))}
          </div>

          {/* Processing Banner directly under waveform */}
          {(item.contentProcessingStatus === 'processing' || item.contentProcessingStatus === 'uploaded') && (
            <div className="adp-processing-banner" style={{ textAlign: 'center', color: '#ffb300', padding: '10px', fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              <span className="material-symbols-outlined acp-spin">progress_activity</span>
              <span>{t('processing_audio', 'جاري معالجة الصوت لتطبيق التعديلات... يرجى الانتظار')}</span>
            </div>
          )}

          {/* Error Banner if playback URL failed but not due to processing */}
          {error && item.contentProcessingStatus !== 'processing' && item.contentProcessingStatus !== 'uploaded' && (
            <div className="adp-processing-banner" style={{ textAlign: 'center', color: '#ef5350', padding: '10px', fontSize: '0.9rem' }}>
              {error}
            </div>
          )}

          {/* Actions - 8 buttons in a 4x2 grid */}
          <div className="adp-actions">
            <button className="adp-action-item">
              <span className="material-symbols-outlined">favorite_border</span> 
              {t('like')}
            </button>
            <button className={`adp-action-item ${isFavorite ? 'active' : ''}`} onClick={() => setIsFavorite(!isFavorite)}>
              <span className="material-symbols-outlined">{isFavorite ? 'star' : 'star_border'}</span> 
              {t('favorite')}
            </button>
            <button className="adp-action-item">
              <span className="material-symbols-outlined">playlist_add</span> 
              {t('mood')}
            </button>
            <button className="adp-action-item">
              <span className="material-symbols-outlined">repeat</span> 
              {t('repost')}
            </button>
            
            {/* Row 2 */}
            <button className="adp-action-item">
              <span className="material-symbols-outlined">redeem</span> 
              {t('gift')}
            </button>
            <button className={`adp-action-item ${isSaved ? 'active' : ''}`} onClick={() => setIsSaved(!isSaved)}>
              <span className="material-symbols-outlined">{isSaved ? 'bookmark' : 'bookmark_border'}</span> 
              {t('save')}
            </button>
            <button className="adp-action-item" onClick={() => setShowCaptions(!showCaptions)}>
              <span className="material-symbols-outlined">closed_caption</span> 
              {t('captions')}
            </button>
            <button className="adp-action-item">
              <span className="material-symbols-outlined">download_for_offline</span> 
              {t('offline')}
            </button>
          </div>

          {/* Comments */}
          <div className="adp-comments">
            <div className="adp-comments-header">
              <span className="material-symbols-outlined">chat_bubble_outline</span> {t('comments_title')}
            </div>
            <div className="adp-comments-empty">
              {t('no_comments')}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
