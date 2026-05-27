/**
 * Sound Platform — Audio Detail Player Page
 * ===========================================
 * Phase:   8-C (Complete Audio Creation Flow Foundation)
 * Updated: 2026-05-27
 *
 * Route: /audio/:contentId
 *
 * Reads contentItems/{contentId} from Firestore and displays:
 *   - Cover (or default placeholder)
 *   - Title, owner, world, kind, category
 *   - Duration, audience, country
 *   - Audio state: honest "playback pipeline pending" if no signed URL
 *   - Action bar (like/save/share — placeholder, no backend wiring)
 *
 * State 13 of the canonical audio flow.
 *
 * IMPORTANT: Does NOT fake playback.
 * If signed URL is not available, shows honest pending state.
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { formatDuration, formatFileSize } from '../lib/audioDuration';
import type { AudioContentDoc } from '@sound/shared';
import app from '../lib/firebase';
import './Page.css';
import './AudioDetailPage.css';

const db = getFirestore(app);

export function AudioDetailPage() {
  const { contentId } = useParams<{ contentId: string }>();
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [item, setItem] = useState<AudioContentDoc | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  // Determine playback availability
  const audioAsset = item.audioAsset;
  const canPlay = audioAsset?.playbackUrl && audioAsset?.processingStatus === 'done';

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

  return (
    <main className="page adp-page" dir="rtl">
      {/* ── Cover / Hero ──────────────────────────────────────── */}
      <div className="adp-hero">
        {item.coverAsset?.storagePath ? (
          <div className="adp-hero__cover adp-hero__cover--default">
            <span className="material-symbols-outlined">music_note</span>
          </div>
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
        {canPlay ? (
          <audio controls src={audioAsset!.playbackUrl!} className="adp-player__audio" />
        ) : (
          <div className="adp-player__pending">
            <span className="material-symbols-outlined adp-player__pending-icon">hourglass_top</span>
            <h3>جاري معالجة الصوت...</h3>
            <p>
              الصوت غير متوفر للتشغيل حالياً.
              <br />
              خط المعالجة (الترميز، الموجة الصوتية، التحقق) لم يكتمل بعد.
            </p>
            {audioAsset && (
              <div className="adp-player__asset-info">
                {audioAsset.originalFileName && <span>📄 {audioAsset.originalFileName}</span>}
                {audioAsset.durationMs ? <span>⏱️ {formatDuration(audioAsset.durationMs)}</span> : null}
                {audioAsset.sizeBytes ? <span>📦 {formatFileSize(audioAsset.sizeBytes)}</span> : null}
                <span>📊 المعالجة: {audioAsset.processingStatus ?? 'قيد الانتظار'}</span>
              </div>
            )}
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
