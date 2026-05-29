/**
 * Sound Platform — Audio Detail Player Page
 * ===========================================
 * Phase:   8-E (Audio Processing Pipeline Foundation)
 * Updated: 2026-05-28
 *
 * Route: /audio/:contentId
 *
 * Features:
 *   - Full-width hero with cover, waveform overlay, badge, play overlay
 *   - Content info with title + metadata row (icons)
 *   - Creator row with avatar, name, handle, follow button
 *   - Premium 5-button player controls
 *   - 6-item action row
 *   - Description section
 *   - Captions preview
 *   - Queue + Comments placeholders
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
import type { AudioContentDoc, WaveformData, ContentProcessingStatus } from '@sound/shared';
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

// ── Relative time ago ─────────────────────────────────────────────────────────
function timeAgo(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'الآن';
  if (mins < 60) return `منذ ${mins} دقيقة`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `منذ ${hrs} ساعة`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `منذ ${days} يوم`;
  const months = Math.floor(days / 30);
  return `منذ ${months} شهر`;
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

  // Phase 8-E: Processing pipeline state
  const [audioSource, setAudioSource] = useState<'processed' | 'original' | 'none'>('none');
  const [processingStatus, setProcessingStatus] = useState<ContentProcessingStatus | undefined>();
  const [waveformData, setWaveformData] = useState<WaveformData | undefined>();
  const [captionsStatus, setCaptionsStatus] = useState<string | undefined>();

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
        if (resp.playbackUrl) {
          setPlaybackUrl(resp.playbackUrl);
        }
        if (resp.expiresAt) {
          setPlaybackExpiry(resp.expiresAt);
        }
        // Phase 8-E enrichments
        setAudioSource(resp.source || 'original');
        setProcessingStatus(resp.processingStatus);
        setWaveformData(resp.waveform);
        setCaptionsStatus(resp.captionsStatus);
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

  // ── Skip forward/back ─────────────────────────────────────────────────
  const skipForward = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = Math.min(audio.duration, audio.currentTime + 5);
  }, []);

  const skipBack = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = Math.max(0, audio.currentTime - 5);
  }, []);

  // ── Retry playback URL ─────────────────────────────────────────────────
  const retryPlayback = useCallback(async () => {
    if (!contentId) return;
    setPlaybackError(null);
    setPlayerState('loading');
    setPlaybackLoading(true);
    try {
      const result = await callGetAudioPlaybackUrl({ contentId });
      const resp = result.data;
      if (resp.playbackUrl) setPlaybackUrl(resp.playbackUrl);
      if (resp.expiresAt) setPlaybackExpiry(resp.expiresAt);
      setAudioSource(resp.source || 'original');
      setProcessingStatus(resp.processingStatus);
      setWaveformData(resp.waveform);
      setCaptionsStatus(resp.captionsStatus);
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

  // Audience label
  const audienceLabels: Record<string, string> = {
    public: 'عام', followers: 'المتابعين', following: 'المتابَعين',
    friends: 'الأصدقاء', onlyMe: 'أنا فقط',
  };
  const audienceLabel = audienceLabels[item.audience] || item.audience;

  // Country label
  const countryDisplay = item.countryMode === 'all'
    ? 'جميع الدول'
    : item.countryCodes?.join(', ') || item.countryLabel || '—';

  // Player icon helper
  const getPlayerIcon = () => {
    switch (playerState) {
      case 'loading': case 'buffering': return null;
      case 'playing': return 'pause';
      case 'ended': return 'replay';
      default: return 'play_arrow';
    }
  };

  const isPlayerLoading = playerState === 'loading' || playerState === 'buffering';

  return (
    <main className="page adp-page" dir="rtl">
      {/* Hidden audio element */}
      {playbackUrl && (
        <audio ref={audioRef} src={playbackUrl} preload="metadata" style={{ display: 'none' }} />
      )}

      {/* ── 1. Hero Section ─────────────────────────────────────── */}
      <div className="adp-hero">
        {coverUrl ? (
          <img src={coverUrl} alt="غلاف" className="adp-hero__cover" />
        ) : (
          <div className="adp-hero__cover adp-hero__cover--default">
            <span className="material-symbols-outlined">music_note</span>
          </div>
        )}

        {/* Gradient overlay */}
        <div className="adp-hero__gradient" />

        {/* Waveform bars — dynamic from peaks data or static fallback */}
        <div className="adp-hero__waveform">
          {waveformData?.peaks && waveformData.peaks.length > 0 ? (
            <>
              {waveformData.peaks.filter((_, i) => i % Math.max(1, Math.floor(waveformData.peaks!.length / 40)) === 0).map((peak, i) => (
                <div
                  key={i}
                  className="adp-hero__waveform-bar adp-hero__waveform-bar--dynamic"
                  style={{ height: `${Math.max(8, peak * 100)}%` }}
                />
              ))}
              {waveformData.synthetic && (
                <span className="adp-waveform-label">تقريبي</span>
              )}
            </>
          ) : (
            Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="adp-hero__waveform-bar" />
            ))
          )}
        </div>

        {/* Badge */}
        <div className="adp-hero__badge">
          <span className="material-symbols-outlined">graphic_eq</span>
          صوت كامل
        </div>

        {/* Play overlay button */}
        {playbackUrl ? (
          <button
            className={`adp-hero__play${isPlayerLoading ? ' adp-hero__play--loading' : ''}`}
            onClick={togglePlay}
            disabled={playerState === 'loading'}
            aria-label={playerState === 'playing' ? 'إيقاف' : 'تشغيل'}
          >
            {isPlayerLoading ? (
              <div className="adp-hero__play-spinner" />
            ) : (
              <span className="material-symbols-outlined">{getPlayerIcon()}</span>
            )}
          </button>
        ) : (
          <button className="adp-hero__play adp-hero__play--loading" disabled aria-label="جاري التحميل">
            <div className="adp-hero__play-spinner" />
          </button>
        )}
      </div>

      {/* ── 2. Content Info Section ─────────────────────────────── */}
      <div className="adp-info">
        <h1 className="adp-info__title">{item.title}</h1>
        <div className="adp-info__meta">
          {item.categoryLabel && (
            <span className="adp-info__meta-item">
              <span className="material-symbols-outlined">category</span>
              {item.categoryLabel}
              {item.subcategoryLabel && ` / ${item.subcategoryLabel}`}
            </span>
          )}
          <span className="adp-info__meta-item">
            <span className="material-symbols-outlined">public</span>
            {audienceLabel}
          </span>
          {(audioAsset?.durationMs || duration > 0) && (
            <span className="adp-info__meta-item">
              <span className="material-symbols-outlined">schedule</span>
              {formatDuration(audioAsset?.durationMs || duration)}
            </span>
          )}
          {(item.countryMode || item.countryLabel) && (
            <span className="adp-info__meta-item">
              <span className="material-symbols-outlined">location_on</span>
              {countryDisplay}
            </span>
          )}
          <span className="adp-info__meta-item">
            <span className="material-symbols-outlined">headphones</span>
            {item.listensCount}
          </span>
          {item.publishedAt && (
            <span className="adp-info__meta-item">
              <span className="material-symbols-outlined">history</span>
              {timeAgo(item.publishedAt)}
            </span>
          )}
          {audioAsset?.sourceType && (
            <span className="adp-info__meta-item">
              <span className="material-symbols-outlined">
                {audioAsset.sourceType === 'recorded' ? 'mic' : 'upload_file'}
              </span>
              {audioAsset.sourceType === 'recorded' ? 'مسجّل' : 'مرفوع'}
            </span>
          )}
        </div>
      </div>

      {/* ── 3. Creator Row ──────────────────────────────────────── */}
      <div className="adp-creator">
        {item.owner?.ownerAvatarUrl ? (
          <img
            src={item.owner.ownerAvatarUrl}
            alt="صورة المنشئ"
            className="adp-creator__avatar"
          />
        ) : (
          <div className="adp-creator__avatar--default">
            <span className="material-symbols-outlined">person</span>
          </div>
        )}
        <div className="adp-creator__info">
          <p className="adp-creator__name">
            {item.owner?.ownerDisplayName || 'مستخدم'}
          </p>
          {item.owner?.ownerUsername && (
            <p className="adp-creator__handle">@{item.owner.ownerUsername}</p>
          )}
        </div>
        <button className="adp-creator__follow" disabled>
          متابعة
        </button>
      </div>

      {/* ── 4. Player Controls ──────────────────────────────────── */}
      <div className="adp-player">
        {/* Player ready — controls visible */}
        {playbackUrl && (
          <>
            {/* Progress bar */}
            <div className="adp-player__progress" ref={progressRef} onClick={handleSeek}>
              <div className="adp-player__bar" style={{ width: `${progressPct}%` }} />
              <div className="adp-player__thumb" style={{ right: `${progressPct}%` }} />
            </div>

            {/* Times */}
            <div className="adp-player__times">
              <span className="adp-player__time">{fmtTime(currentTime)}</span>
              <span className="adp-player__time">
                {duration > 0 ? fmtTime(duration) : (audioAsset?.durationMs ? fmtTime(audioAsset.durationMs) : '--:--')}
              </span>
            </div>

            {/* Control buttons */}
            <div className="adp-player__controls">
              <button className="adp-player__btn" aria-label="التالي">
                <span className="material-symbols-outlined">skip_next</span>
              </button>
              <button className="adp-player__btn" onClick={skipForward} aria-label="تقديم ٥ ثواني">
                <span className="material-symbols-outlined">forward_5</span>
              </button>
              <button
                className={`adp-player__btn adp-player__btn--main${isPlayerLoading ? ' adp-player__btn--main-loading' : ''}`}
                onClick={togglePlay}
                disabled={playerState === 'loading'}
                aria-label={playerState === 'playing' ? 'إيقاف' : 'تشغيل'}
              >
                {isPlayerLoading ? (
                  <div className="adp-player__btn-spinner" />
                ) : (
                  <span className="material-symbols-outlined">{getPlayerIcon()}</span>
                )}
              </button>
              <button className="adp-player__btn" onClick={skipBack} aria-label="ترجيع ٥ ثواني">
                <span className="material-symbols-outlined">replay_5</span>
              </button>
              <button className="adp-player__btn" aria-label="السابق">
                <span className="material-symbols-outlined">skip_previous</span>
              </button>
            </div>

            {/* Expiry note */}
            {playbackExpiry && (
              <p className="adp-expiry-note">
                <span className="material-symbols-outlined">timer</span>
                رابط تشغيل مؤقت — صالح حتى {new Date(playbackExpiry).toLocaleTimeString('ar')}
              </p>
            )}

            {/* Phase 8-E: Source indicator chip */}
            {audioSource === 'original' && (
              <div className="adp-source-chip">
                <span className="material-symbols-outlined">info</span>
                المصدر الأصلي — المعالجة لم تكتمل بعد
              </div>
            )}
            {audioSource === 'processed' && (
              <div className="adp-source-chip adp-source-chip--ready">
                <span className="material-symbols-outlined">verified</span>
                معالَج
              </div>
            )}
          </>
        )}

        {/* Loading signed URL */}
        {!playbackUrl && playbackLoading && (
          <div className="adp-player__loading">
            <div className="adp-spinner" />
            <p>جاري تحميل رابط التشغيل...</p>
          </div>
        )}

        {/* Playback error */}
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

        {/* No audio asset — processing */}
        {!playbackUrl && !playbackLoading && !playbackError && !hasAudio && (
          <div className="adp-pending">
            <span className="material-symbols-outlined adp-pending__icon">hourglass_top</span>
            <h3>جاري معالجة الصوت...</h3>
            <p>الصوت غير متوفر للتشغيل حالياً.<br />خط المعالجة لم يكتمل بعد.</p>
          </div>
        )}

        {/* Phase 8-E: Processing states when audio exists but source is 'none' */}
        {audioSource === 'none' && !playbackLoading && !playbackError && hasAudio && currentUser && (
          <div className="adp-pending">
            <span className="material-symbols-outlined adp-pending__icon">
              {processingStatus === 'failed' ? 'error' : 'hourglass_top'}
            </span>
            <h3>
              {processingStatus === 'queued' && 'في الانتظار...'}
              {processingStatus === 'processing' && 'جاري المعالجة...'}
              {processingStatus === 'failed' && 'فشلت المعالجة'}
              {(!processingStatus || processingStatus === 'uploaded') && 'جاري التجهيز...'}
            </h3>
            {processingStatus === 'failed' && (
              <button className="adp-btn adp-btn--ghost" onClick={retryPlayback}>
                <span className="material-symbols-outlined">refresh</span> إعادة المحاولة
              </button>
            )}
          </div>
        )}

        {/* Has audio but not logged in */}
        {!playbackUrl && !playbackLoading && !playbackError && hasAudio && !currentUser && (
          <div className="adp-pending">
            <span className="material-symbols-outlined adp-pending__icon">lock</span>
            <h3>يجب تسجيل الدخول</h3>
            <p>سجّل دخولك للاستماع إلى هذا المحتوى.</p>
          </div>
        )}
      </div>

      {/* ── 5. Action Row ───────────────────────────────────────── */}
      <div className="adp-actions">
        <button className="adp-action">
          <span className="material-symbols-outlined">favorite</span>
          <span>أعجبني</span>
        </button>
        <button className="adp-action">
          <span className="material-symbols-outlined">chat_bubble</span>
          <span>تعليق</span>
        </button>
        <button className="adp-action">
          <span className="material-symbols-outlined">ios_share</span>
          <span>مشاركة</span>
        </button>
        <button className="adp-action">
          <span className="material-symbols-outlined">bookmark</span>
          <span>حفظ</span>
        </button>
        <button className="adp-action adp-action--secondary">
          <span className="material-symbols-outlined">flare</span>
          <span>في مزاجي</span>
        </button>
        <button className="adp-action">
          <span className="material-symbols-outlined">send</span>
          <span>لصديق</span>
        </button>
      </div>

      {/* ── 6. Description Section ──────────────────────────────── */}
      {(item.caption || item.description) && (
        <div className="adp-glass-card adp-description">
          <h3 className="adp-section-title">عن الصوت</h3>
          <p className="adp-description__text">
            {item.description || item.caption}
          </p>
        </div>
      )}

      {/* ── 7. Captions Preview ───────────────────────────────── */}
      {(item.captionsData?.segments?.length || item.captionsSetup?.enabled) && (
        <div className="adp-glass-card adp-captions">
          <h3 className="adp-section-title">النص</h3>

          {/* Phase 8-H.1: Creator-authored captions take priority */}
          {item.captionsData?.segments?.length ? (
            <>
              <div className="adp-captions__header">
                <span className={`adp-captions__source-chip adp-captions__source-chip--${item.captionsData.source}`}>
                  <span className="material-symbols-outlined">
                    {item.captionsData.source === 'manual' ? 'edit_note'
                      : item.captionsData.source === 'uploaded' ? 'upload_file'
                      : item.captionsData.source === 'autoCue' ? 'teleprompter'
                      : item.captionsData.source === 'generated' ? 'auto_awesome'
                      : 'edit'}
                  </span>
                  {item.captionsData.source === 'manual' ? 'نص يدوي'
                    : item.captionsData.source === 'uploaded' ? 'ملف مرفوع'
                    : item.captionsData.source === 'autoCue' ? 'نص الملقن'
                    : item.captionsData.source === 'generated' ? 'توليد تلقائي'
                    : 'نص معدّل'}
                </span>
                <span className="adp-captions__count">
                  {item.captionsData.segments.length} مقطع
                  {item.captionsData.segments[0]?.startMs !== undefined ? '' : ' · غير متزامن'}
                </span>
              </div>
              <div className="adp-captions__segments">
                {item.captionsData.segments.map((seg) => (
                  <div key={seg.id} className="adp-captions__segment">
                    {seg.startMs !== undefined && (
                      <span className="adp-captions__seg-time">
                        {Math.floor(seg.startMs / 1000)}s
                      </span>
                    )}
                    <span className="adp-captions__seg-text">{seg.text}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            /* Fall through to provider pipeline status */
            <>
              {captionsStatus === 'requested' || captionsStatus === 'queued' || captionsStatus === 'processing' ? (
                <p className="adp-captions__quote adp-captions__quote--pending">
                  <span className="material-symbols-outlined">pending</span>
                  {captionsStatus === 'processing' ? 'جاري إنشاء النص' : 'في قائمة الانتظار'}
                </p>
              ) : captionsStatus === 'pendingProvider' ? (
                <div className="adp-captions__quote adp-captions__quote--pending-provider">
                  <span className="material-symbols-outlined">schedule</span>
                  <div>
                    <strong>مزود النسخ غير مفعل حالياً</strong>
                    <br />
                    <span className="adp-captions__sub">سيتم إنشاء النص تلقائياً بعد تفعيل مزود التفريغ الصوتي.</span>
                  </div>
                </div>
              ) : captionsStatus === 'failed' ? (
                <p className="adp-captions__quote adp-captions__quote--failed">
                  <span className="material-symbols-outlined">error_outline</span>
                  تعذر إنشاء النص
                </p>
              ) : captionsStatus === 'ready' ? (
                <>
                  <p className="adp-captions__quote adp-captions__quote--ready">
                    <span className="material-symbols-outlined">subtitles</span>
                    النص جاهز
                  </p>
                  <button className="adp-captions__link">عرض النص الكامل</button>
                </>
              ) : (
                <p className="adp-captions__quote adp-captions__quote--pending">
                  <span className="material-symbols-outlined">pending</span>
                  في انتظار المعالجة...
                </p>
              )}
            </>
          )}
        </div>
      )}

      {/* ── 7b. Playlist Placement (Phase 8-I) ─────────────────────── */}
      {item.playlistId && (
        <div className="adp-glass-card adp-playlist-link">
          <span className="material-symbols-outlined adp-playlist-link__icon">queue_music</span>
          <span className="adp-playlist-link__label">ضمن قائمة تشغيل</span>
          <button
            className="adp-playlist-link__btn"
            onClick={() => navigate(`/playlist/${item.playlistId}`)}
            type="button"
          >
            {item.newPlaylistName || 'عرض القائمة'}
            <span className="material-symbols-outlined" style={{ fontSize: '0.9rem' }}>arrow_back</span>
          </button>
        </div>
      )}

      {/* ── 7c. Effects Info (Phase 8-J) ──────────────────────────── */}
      {item.effectsConfig?.enabled && (
        <div className="adp-glass-card adp-effects-info">
          <h3 className="adp-section-title">
            <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>tune</span>
            المؤثرات الصوتية
          </h3>
          <div className="adp-effects-info__row">
            <span className="adp-effects-info__label">النوع:</span>
            <span>{item.effectsConfig.mode === 'preset' ? item.effectsConfig.selectedPresetLabel || 'إعداد مسبق' : 'تحكم يدوي'}</span>
          </div>
          <div className="adp-effects-info__row">
            <span className="adp-effects-info__label">الحالة:</span>
            {item.effectsConfig.appliedStatus === 'applied' ? (
              <span className="adp-effects-info__badge adp-effects-info__badge--applied">
                <span className="material-symbols-outlined" style={{ fontSize: '0.8rem' }}>check_circle</span>
                تم التطبيق
              </span>
            ) : item.effectsConfig.appliedStatus === 'failed' ? (
              <span className="adp-effects-info__badge adp-effects-info__badge--failed">
                <span className="material-symbols-outlined" style={{ fontSize: '0.8rem' }}>error_outline</span>
                فشل التطبيق
              </span>
            ) : item.effectsConfig.appliedStatus === 'pending' ? (
              <span className="adp-effects-info__badge adp-effects-info__badge--pending">
                <span className="material-symbols-outlined" style={{ fontSize: '0.8rem' }}>pending</span>
                قيد المعالجة
              </span>
            ) : (
              <span className="adp-effects-info__badge">
                <span className="material-symbols-outlined" style={{ fontSize: '0.8rem' }}>schedule</span>
                في الانتظار
              </span>
            )}
          </div>
          {item.effectsConfig.appliedFilters && item.effectsConfig.appliedFilters.length > 0 && (
            <div className="adp-effects-info__row">
              <span className="adp-effects-info__label">الفلاتر:</span>
              <span>{item.effectsConfig.appliedFilters.join('، ')}</span>
            </div>
          )}
          {item.effectsConfig.processingError && (
            <p className="adp-effects-info__error">
              <span className="material-symbols-outlined" style={{ fontSize: '0.8rem' }}>warning</span>
              {item.effectsConfig.processingError}
            </p>
          )}
        </div>
      )}

      {/* ── 8. Queue Section ────────────────────────────────────── */}
      <div className="adp-glass-card adp-queue">
        <h3 className="adp-section-title">التالي</h3>
        <p className="adp-queue__count">0 ملفات</p>
        <p className="adp-queue__empty">لا توجد عناصر في قائمة التشغيل</p>
      </div>

      {/* ── 9. Comments Section ─────────────────────────────────── */}
      <div className="adp-glass-card adp-comments">
        <h3 className="adp-section-title">التعليقات</h3>
        <p className="adp-comments__empty">لا توجد تعليقات بعد</p>
      </div>

      {/* ── Back ──────────────────────────────────────────────── */}
      <div style={{ padding: '0 1rem' }}>
        <button className="adp-btn adp-btn--ghost" onClick={() => navigate(-1)}>
          <span className="material-symbols-outlined">arrow_forward</span> رجوع
        </button>
      </div>
    </main>
  );
}
