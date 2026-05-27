/**
 * Sound Platform — Audio Detail Player Page
 * ===========================================
 * Phase:   8-D (Audio Playback Foundation)
 * Updated: 2026-05-28
 *
 * Route: /audio/:contentId
 *
 * Reads contentItems/{contentId} from Firestore and displays:
 *   - Cover (public image URL or default placeholder)
 *   - Title, owner, world, kind, category
 *   - Duration, audience, country
 *   - Real audio playback via signed URL from getAudioPlaybackUrl callable
 *   - Action bar (like/save/share — placeholder, no backend wiring)
 *
 * State 13 of the canonical audio flow.
 *
 * PLAYBACK:
 *   - Calls getAudioPlaybackUrl Cloud Function to get a temporary signed URL.
 *   - Signed URL expires after 15 minutes.
 *   - Audio files remain PRIVATE in Storage — no direct reads.
 *   - Falls back to honest pending state if no audio asset or callable fails.
 */

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { getStorage, ref, getDownloadURL } from 'firebase/storage';
import { useAuth } from '../contexts/AuthContext';
import { formatDuration, formatFileSize } from '../lib/audioDuration';
import { callGetAudioPlaybackUrl } from '../lib/callables';
import type { AudioContentDoc, GetAudioPlaybackUrlResponse } from '@sound/shared';
import app from '../lib/firebase';
import './Page.css';
import './AudioDetailPage.css';

const db = getFirestore(app);
const storage = getStorage(app);

export function AudioDetailPage() {
  const { contentId } = useParams<{ contentId: string }>();
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [item, setItem] = useState<AudioContentDoc | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Playback state
  const [playbackLoading, setPlaybackLoading] = useState(false);
  const [playbackUrl, setPlaybackUrl] = useState<string | null>(null);
  const [playbackMime, setPlaybackMime] = useState<string>('audio/mpeg');
  const [playbackError, setPlaybackError] = useState<string | null>(null);
  const [playbackExpiry, setPlaybackExpiry] = useState<string | null>(null);

  // Cover URL state
  const [coverUrl, setCoverUrl] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement>(null);

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
        // Cover not available — fall back to default
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
      try {
        const result = await callGetAudioPlaybackUrl({ contentId });
        const resp = result.data;
        setPlaybackUrl(resp.playbackUrl);
        setPlaybackMime(resp.mimeType);
        setPlaybackExpiry(resp.expiresAt);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'فشل تحميل رابط التشغيل.';
        setPlaybackError(msg);
      } finally {
        setPlaybackLoading(false);
      }
    };
    fetchPlaybackUrl();
  }, [item, contentId, currentUser]);

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
    longAudio: 'صوت طويل',
    podcast: 'بودكاست',
    shortAudio: 'مقطع قصير',
    song: 'أغنية',
    albumTrack: 'مسار ألبوم',
    radioMoment: 'لحظة إذاعية',
    tournamentSubmissionAudio: 'مشاركة مسابقة',
  };

  const audioAsset = item.audioAsset;
  const hasAudio = !!audioAsset?.storagePath;

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

      {/* ── Player area ───────────────────────────────────────── */}
      <div className="adp-player">
        {/* Case 1: Signed URL ready — real playback */}
        {playbackUrl && (
          <div className="adp-player__live">
            <audio
              ref={audioRef}
              controls
              src={playbackUrl}
              className="adp-player__audio"
            />
            {audioAsset?.durationMs ? (
              <p className="adp-player__duration">
                ⏱️ {formatDuration(audioAsset.durationMs)}
                {audioAsset.sourceType && (
                  <span> — {audioAsset.sourceType === 'recorded' ? '🎤 مسجّل' : '📁 مرفوع'}</span>
                )}
              </p>
            ) : null}
            <p className="adp-player__expiry">
              <span className="material-symbols-outlined">timer</span>
              رابط تشغيل مؤقت — صالح حتى {playbackExpiry ? new Date(playbackExpiry).toLocaleTimeString('ar') : '—'}
            </p>
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
            <button
              className="adp-btn adp-btn--ghost"
              onClick={() => {
                setPlaybackError(null);
                setPlaybackLoading(true);
                callGetAudioPlaybackUrl({ contentId: contentId! })
                  .then((r) => {
                    setPlaybackUrl(r.data.playbackUrl);
                    setPlaybackMime(r.data.mimeType);
                    setPlaybackExpiry(r.data.expiresAt);
                  })
                  .catch((e) => setPlaybackError(e instanceof Error ? e.message : 'فشل تحميل رابط التشغيل.'))
                  .finally(() => setPlaybackLoading(false));
              }}
            >
              <span className="material-symbols-outlined">refresh</span> إعادة المحاولة
            </button>
          </div>
        )}

        {/* Case 4: No audio asset at all */}
        {!playbackUrl && !playbackLoading && !playbackError && !hasAudio && (
          <div className="adp-player__pending">
            <span className="material-symbols-outlined adp-player__pending-icon">hourglass_top</span>
            <h3>جاري معالجة الصوت...</h3>
            <p>
              الصوت غير متوفر للتشغيل حالياً.
              <br />
              خط المعالجة (الترميز، الموجة الصوتية، التحقق) لم يكتمل بعد.
            </p>
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
