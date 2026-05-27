/**
 * Sound Platform — Audio Detail Player Page
 * ===========================================
 * Phase:   8-D.1 (Audio Playback Polish + Cover Fix)
 * Updated: 2026-05-28
 *
 * Route: /audio/:contentId
 *
 * Features:
 *   - Cover loaded from coverAsset.storagePath via public Storage reads
 *   - Custom premium audio player (no native browser controls)
 *   - Play/pause, seekable progress bar, time display
 *   - Loading, buffering, error, ended states
 *   - Source type badge and signed URL expiry note
 *   - Metadata details, action bar (placeholder)
 *
 * State 13 of the canonical audio flow.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { getStorage, ref, getDownloadURL } from 'firebase/storage';
import { useAuth } from '../contexts/AuthContext';
import { formatDuration, formatFileSize } from '../lib/audioDuration';
import { callGetAudioPlaybackUrl } from '../lib/callables';
import type { AudioContentDoc } from '@sound/shared';
import app from '../lib/firebase';
import './Page.css';
import './AudioDetailPage.css';

const db = getFirestore(app);
const storage = getStorage(app);

// ── Time formatter for player ─────────────────────────────────────────────────
function fmtTime(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// ── Player state enum ─────────────────────────────────────────────────────────
type PlayerState = 'loading' | 'ready' | 'playing' | 'paused' | 'buffering' | 'ended' | 'error';

export function AudioDetailPage() {
  const { contentId } = useParams<{ contentId: string }>();
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  // Content state
  const [loading, setLoading] = useState(true);
  const [item, setItem] = useState<AudioContentDoc | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Cover URL state
  const [coverUrl, setCoverUrl] = useState<string | null>(null);

  // Playback state
  const [playbackUrl, setPlaybackUrl] = useState<string | null>(null);
  const [playbackError, setPlaybackError] = useState<string | null>(null);
  const [playbackExpiry, setPlaybackExpiry] = useState<string | null>(null);
  const [playbackLoading, setPlaybackLoading] = useState(false);

  // Player state
  const [playerState, setPlayerState] = useState<PlayerState>('loading');
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const audioRef = useRef<HTMLAudioElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  // ── Load content item ──────────────────────────────────────────────────
  useEffect(() => {
    if (!contentId) return;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const snap = await getDoc(doc(db, 'contentItems', contentId));
        if (!snap.exists()) {
          setError('المحتوى غير موجود.');
          setItem(null);
        } else {
          const data = snap.data() as AudioContentDoc;
          setItem({ ...data, id: snap.id });
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'فشل تحميل المحتوى.';
        setError(msg);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [contentId]);

  // ── Load cover image (public read) ─────────────────────────────────────
  useEffect(() => {
    if (!item?.coverAsset?.storagePath) { setCoverUrl(null); return; }
    const loadCover = async () => {
      try {
        const coverRef = ref(storage, item.coverAsset!.storagePath!);
        const url = await getDownloadURL(coverRef);
        setCoverUrl(url);
      } catch {
        setCoverUrl(null);
      }
    };
    loadCover();
  }, [item?.coverAsset?.storagePath]);

  // ── Request signed playback URL ────────────────────────────────────────
  useEffect(() => {
    if (!item || !contentId || !currentUser) return;
    if (!item.audioAsset?.storagePath) return;

    const fetchPlaybackUrl = async () => {
      setPlaybackLoading(true);
      setPlaybackError(null);
      setPlayerState('loading');
      try {
        const result = await callGetAudioPlaybackUrl({ contentId });
        const resp = result.data;
        setPlaybackUrl(resp.playbackUrl);
        setPlaybackExpiry(resp.expiresAt);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'فشل تحميل رابط التشغيل.';
        setPlaybackError(msg);
        setPlayerState('error');
      } finally {
        setPlaybackLoading(false);
      }
    };
    fetchPlaybackUrl();
  }, [item, contentId, currentUser]);

  // ── Audio event handlers ───────────────────────────────────────────────
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onLoadedMetadata = () => {
      setDuration(audio.duration * 1000);
      setPlayerState('ready');
    };
    const onTimeUpdate = () => setCurrentTime(audio.currentTime * 1000);
    const onPlaying = () => setPlayerState('playing');
    const onPause = () => {
      if (!audio.ended) setPlayerState('paused');
    };
    const onWaiting = () => setPlayerState('buffering');
    const onEnded = () => { setPlayerState('ended'); setCurrentTime(audio.duration * 1000); };
    const onError = () => setPlayerState('error');

    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('playing', onPlaying);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('waiting', onWaiting);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('error', onError);

    return () => {
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('playing', onPlaying);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('waiting', onWaiting);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('error', onError);
    };
  }, [playbackUrl]);

  // ── Play/pause toggle ─────────────────────────────────────────────────
  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playerState === 'ended') {
      audio.currentTime = 0;
      audio.play();
    } else if (audio.paused) {
      audio.play();
    } else {
      audio.pause();
    }
  }, [playerState]);

  // ── Seek on progress bar click ─────────────────────────────────────────
  const handleSeek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    const bar = progressRef.current;
    if (!audio || !bar || !duration) return;
    const rect = bar.getBoundingClientRect();
    // RTL: right edge = 0, left edge = 1
    const clickRatio = (rect.right - e.clientX) / rect.width;
    const clampedRatio = Math.max(0, Math.min(1, clickRatio));
    audio.currentTime = clampedRatio * (duration / 1000);
  }, [duration]);

  // ── Retry playback URL ─────────────────────────────────────────────────
  const retryPlayback = useCallback(async () => {
    if (!contentId) return;
    setPlaybackError(null);
    setPlayerState('loading');
    setPlaybackLoading(true);
    try {
      const result = await callGetAudioPlaybackUrl({ contentId });
      setPlaybackUrl(result.data.playbackUrl);
      setPlaybackExpiry(result.data.expiresAt);
    } catch (err: unknown) {
      setPlaybackError(err instanceof Error ? err.message : 'فشل.');
      setPlayerState('error');
    } finally {
      setPlaybackLoading(false);
    }
  }, [contentId]);

  // ── Computed values ────────────────────────────────────────────────────
  const progressPct = duration > 0 ? (currentTime / duration) * 100 : 0;
  const audioAsset = item?.audioAsset;
  const hasAudio = !!audioAsset?.storagePath;

  // ── Loading state ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <main className="page adp-page" dir="rtl">
        <div className="adp-loading">
          <div className="adp-spinner" />
          <p>جاري التحميل...</p>
        </div>
      </main>
    );
  }

  // ── Error / not found ──────────────────────────────────────────────────
  if (error || !item) {
    return (
      <main className="page adp-page" dir="rtl">
        <div className="adp-error">
          <span className="material-symbols-outlined adp-error__icon">error</span>
          <h2>{error || 'المحتوى غير موجود'}</h2>
          <button className="adp-btn adp-btn--ghost" onClick={() => navigate(-1)}>
            <span className="material-symbols-outlined">arrow_forward</span> رجوع
          </button>
        </div>
      </main>
    );
  }

  // World/kind labels
  const worldLabel = item.world === 'plus' ? 'بلس' : 'عام';
  const kindLabels: Record<string, string> = {
    longAudio: 'صوت طويل', podcast: 'بودكاست', shortAudio: 'مقطع قصير',
    song: 'أغنية', albumTrack: 'مسار ألبوم', radioMoment: 'لحظة إذاعية',
    tournamentSubmissionAudio: 'مشاركة مسابقة',
  };

  // Player icon
  const getPlayerIcon = () => {
    switch (playerState) {
      case 'loading': case 'buffering': return null; // spinner shown instead
      case 'playing': return 'pause';
      case 'ended': return 'replay';
      default: return 'play_arrow';
    }
  };

  return (
    <main className="page adp-page" dir="rtl">
      {/* ── Cover / Hero ──────────────────────────────────────── */}
      <div className="adp-hero">
        {coverUrl ? (
          <img src={coverUrl} alt="غلاف" className="adp-hero__cover" />
        ) : (
          <div className="adp-hero__cover adp-hero__cover--default">
            <span className="material-symbols-outlined">music_note</span>
          </div>
        )}
      </div>

      {/* ── Title + owner ─────────────────────────────────────── */}
      <div className="adp-head">
        <h1 className="adp-head__title">{item.title}</h1>
        <p className="adp-head__owner">
          {item.owner?.ownerDisplayName || item.owner?.ownerUsername || 'مستخدم'}
        </p>
        {item.caption && <p className="adp-head__caption">{item.caption}</p>}
      </div>

      {/* ── Badges ────────────────────────────────────────────── */}
      <div className="adp-badges">
        <span className="adp-badge">{worldLabel}</span>
        <span className="adp-badge">{kindLabels[item.kind] ?? item.kind}</span>
        {item.categoryLabel && <span className="adp-badge">{item.categoryLabel}</span>}
        {item.isExplicit && <span className="adp-badge adp-badge--explicit">E</span>}
        <span className="adp-badge adp-badge--status">{item.status}</span>
      </div>

      {/* ── Custom Audio Player ───────────────────────────────── */}
      <div className="adp-player">
        {/* Hidden audio element */}
        {playbackUrl && (
          <audio ref={audioRef} src={playbackUrl} preload="metadata" style={{ display: 'none' }} />
        )}

        {/* Case 1: Signed URL ready — custom player */}
        {playbackUrl && (
          <div className="adp-custom-player">
            {/* Player controls row */}
            <div className="adp-player-controls">
              <button
                className={`adp-play-btn ${playerState === 'loading' || playerState === 'buffering' ? 'adp-play-btn--loading' : ''}`}
                onClick={togglePlay}
                disabled={playerState === 'loading'}
                aria-label={playerState === 'playing' ? 'إيقاف' : 'تشغيل'}
              >
                {playerState === 'loading' || playerState === 'buffering' ? (
                  <div className="adp-play-btn__spinner" />
                ) : (
                  <span className="material-symbols-outlined">{getPlayerIcon()}</span>
                )}
              </button>
              <div className="adp-player-info">
                <p className="adp-player-info__title">{item.title}</p>
                {audioAsset?.sourceType && (
                  <span className="adp-source-badge">
                    {audioAsset.sourceType === 'recorded' ? '🎤 مسجّل' : '📁 مرفوع'}
                  </span>
                )}
              </div>
            </div>

            {/* Progress bar */}
            <div className="adp-progress-bar" ref={progressRef} onClick={handleSeek}>
              <div className="adp-progress-bar__track">
                <div className="adp-progress-bar__fill" style={{ width: `${progressPct}%` }} />
                <div className="adp-progress-bar__thumb" style={{ right: `${progressPct}%` }} />
              </div>
            </div>

            {/* Time display */}
            <div className="adp-time-row">
              <span className="adp-time">{fmtTime(currentTime)}</span>
              <span className="adp-time">{duration > 0 ? fmtTime(duration) : (audioAsset?.durationMs ? fmtTime(audioAsset.durationMs) : '--:--')}</span>
            </div>

            {/* Expiry note */}
            {playbackExpiry && (
              <p className="adp-expiry-note">
                <span className="material-symbols-outlined">timer</span>
                رابط تشغيل مؤقت — صالح حتى {new Date(playbackExpiry).toLocaleTimeString('ar')}
              </p>
            )}
          </div>
        )}

        {/* Case 2: Loading signed URL */}
        {!playbackUrl && playbackLoading && (
          <div className="adp-player__loading">
            <div className="adp-spinner" />
            <p>جاري تحميل رابط التشغيل...</p>
          </div>
        )}

        {/* Case 3: Playback error */}
        {!playbackUrl && !playbackLoading && playbackError && (
          <div className="adp-player__error">
            <span className="material-symbols-outlined">error_outline</span>
            <h3>فشل تحميل التشغيل</h3>
            <p>{playbackError}</p>
            <button className="adp-btn adp-btn--ghost" onClick={retryPlayback}>
              <span className="material-symbols-outlined">refresh</span> إعادة المحاولة
            </button>
          </div>
        )}

        {/* Case 4: No audio asset */}
        {!playbackUrl && !playbackLoading && !playbackError && !hasAudio && (
          <div className="adp-player__pending">
            <span className="material-symbols-outlined adp-player__pending-icon">hourglass_top</span>
            <h3>جاري معالجة الصوت...</h3>
            <p>الصوت غير متوفر للتشغيل حالياً.<br />خط المعالجة لم يكتمل بعد.</p>
          </div>
        )}

        {/* Case 5: Has audio but not logged in */}
        {!playbackUrl && !playbackLoading && !playbackError && hasAudio && !currentUser && (
          <div className="adp-player__pending">
            <span className="material-symbols-outlined adp-player__pending-icon">lock</span>
            <h3>يجب تسجيل الدخول</h3>
            <p>سجّل دخولك للاستماع إلى هذا المحتوى.</p>
          </div>
        )}
      </div>

      {/* ── Metadata details ──────────────────────────────────── */}
      <div className="adp-details">
        {audioAsset?.durationMs ? (
          <div className="adp-details__row"><span>المدة:</span> {formatDuration(audioAsset.durationMs)}</div>
        ) : null}
        <div className="adp-details__row"><span>الجمهور:</span> {item.audience}</div>
        {item.language && <div className="adp-details__row"><span>اللغة:</span> {item.language}</div>}
        {item.countryMode && (
          <div className="adp-details__row"><span>الدول:</span> {item.countryMode === 'all' ? 'جميع الدول' : item.countryCodes?.join(', ') || '—'}</div>
        )}
        {item.ageSuitability && (
          <div className="adp-details__row"><span>الفئة العمرية:</span> {item.ageSuitability === 'everyone' ? 'الجميع' : item.ageSuitability === 'teen' ? '+13' : '+18'}</div>
        )}
        {item.tags && item.tags.length > 0 && (
          <div className="adp-details__row"><span>الوسوم:</span> {item.tags.join(', ')}</div>
        )}
        <div className="adp-details__row"><span>تاريخ النشر:</span> {item.publishedAt ? new Date(item.publishedAt).toLocaleDateString('ar') : '—'}</div>
      </div>

      {/* ── Action bar (placeholder) ──────────────────────────── */}
      <div className="adp-actions">
        <button className="adp-action" disabled>
          <span className="material-symbols-outlined">favorite</span>
          <span>{item.likesCount}</span>
        </button>
        <button className="adp-action" disabled>
          <span className="material-symbols-outlined">bookmark</span>
          <span>{item.savesCount}</span>
        </button>
        <button className="adp-action" disabled>
          <span className="material-symbols-outlined">share</span>
          <span>{item.sharesCount}</span>
        </button>
        <button className="adp-action" disabled>
          <span className="material-symbols-outlined">chat_bubble</span>
          <span>{item.commentsCount}</span>
        </button>
      </div>

      {/* ── Back ──────────────────────────────────────────────── */}
      <button className="adp-btn adp-btn--ghost" onClick={() => navigate(-1)}>
        <span className="material-symbols-outlined">arrow_forward</span> رجوع
      </button>
    </main>
  );
}
