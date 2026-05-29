/**
 * Sound Platform — Playlist Detail Page
 * =======================================
 * Phase:   8-I (Playlist Foundation)
 * Created: 2026-05-29
 *
 * Route: /playlist/:playlistId
 *
 * Features:
 *   - Playlist header with title, description, owner, visibility badge
 *   - Item count and total duration
 *   - List of playlist items with snapshots
 *   - Each item links to /audio/:contentId
 *   - Uses existing app shell
 *
 * Design reference: sound_playlist_details_reorder screen
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getFirestore, doc, getDoc, collection, getDocs, query, orderBy } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import type { PlaylistDoc, PlaylistItemDoc } from '@sound/shared';
import app from '../lib/firebase';
import './Page.css';
import './PlaylistDetailPage.css';

const db = getFirestore(app);

export function PlaylistDetailPage() {
  const { playlistId } = useParams<{ playlistId: string }>();
  const navigate = useNavigate();
  const { authState } = useAuth();

  const [playlist, setPlaylist] = useState<PlaylistDoc | null>(null);
  const [items, setItems] = useState<PlaylistItemDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!playlistId || authState.status !== 'signed-in') return;

    async function loadPlaylist() {
      try {
        setLoading(true);
        setError('');

        // Load playlist doc
        const plSnap = await getDoc(doc(db, 'playlists', playlistId!));
        if (!plSnap.exists()) {
          setError('القائمة غير موجودة أو تم حذفها.');
          setLoading(false);
          return;
        }

        const plData = plSnap.data() as PlaylistDoc;
        setPlaylist(plData);

        // Load items
        const itemsQuery = query(
          collection(db, 'playlists', playlistId!, 'items'),
          orderBy('sortOrder', 'asc'),
        );
        const itemsSnap = await getDocs(itemsQuery);
        const loadedItems: PlaylistItemDoc[] = [];
        itemsSnap.forEach((d) => {
          loadedItems.push(d.data() as PlaylistItemDoc);
        });
        setItems(loadedItems);
      } catch (err) {
        console.error('[PlaylistDetailPage] Error loading playlist:', err);
        setError('تعذر تحميل القائمة.');
      } finally {
        setLoading(false);
      }
    }

    loadPlaylist();
  }, [playlistId, authState.status]);

  // ── Loading state ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="pldp-loading">
        <span className="material-symbols-outlined pldp-loading__icon">progress_activity</span>
        <span>جارٍ تحميل القائمة...</span>
      </div>
    );
  }

  // ── Error state ────────────────────────────────────────────────────────────
  if (error || !playlist) {
    return (
      <div className="pldp-error">
        <span className="material-symbols-outlined">error_outline</span>
        <p>{error || 'القائمة غير متاحة.'}</p>
        <button className="pldp-back-btn" onClick={() => navigate(-1)} type="button">
          <span className="material-symbols-outlined">arrow_forward</span>
          رجوع
        </button>
      </div>
    );
  }

  // ── Visibility label ───────────────────────────────────────────────────────
  const visLabel = {
    public: 'عامة',
    followers: 'المتابعين',
    friends: 'الأصدقاء',
    onlyMe: 'خاصة',
  }[playlist.visibility] || 'خاصة';

  return (
    <div className="pldp">
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="pldp-header">
        <button className="pldp-header__back" onClick={() => navigate(-1)} type="button">
          <span className="material-symbols-outlined">arrow_forward</span>
        </button>
        <div className="pldp-header__info">
          <h1 className="pldp-header__title">{playlist.title}</h1>
          <div className="pldp-header__meta">
            <span className="pldp-vis-badge">{visLabel}</span>
            <span>{playlist.itemCount} مقطع</span>
            {playlist.totalDurationMs && (
              <span>{Math.round(playlist.totalDurationMs / 60000)} دقيقة</span>
            )}
          </div>
        </div>
      </div>

      {/* ── Description ───────────────────────────────────────────────────── */}
      {playlist.description && (
        <div className="pldp-glass-card pldp-desc">
          <p>{playlist.description}</p>
        </div>
      )}

      {/* ── Owner ─────────────────────────────────────────────────────────── */}
      <div className="pldp-glass-card pldp-owner">
        <span className="material-symbols-outlined pldp-owner__icon">person</span>
        <span className="pldp-owner__name">
          {playlist.ownerSnapshot?.ownerDisplayName || 'مستخدم'}
        </span>
      </div>

      {/* ── Items list ────────────────────────────────────────────────────── */}
      <div className="pldp-items">
        <h2 className="pldp-items__title">المقاطع</h2>
        {items.length === 0 ? (
          <div className="pldp-items__empty">
            <span className="material-symbols-outlined">queue_music</span>
            <span>لا توجد مقاطع في هذه القائمة بعد.</span>
          </div>
        ) : (
          <div className="pldp-items__list">
            {items.map((item, idx) => (
              <button
                key={item.contentId}
                className="pldp-item"
                onClick={() => navigate(`/audio/${item.contentId}`)}
                type="button"
              >
                <span className="pldp-item__num">{idx + 1}</span>
                <div className="pldp-item__info">
                  <span className="pldp-item__title">{item.contentSnapshot.title}</span>
                  <span className="pldp-item__meta">
                    {item.contentSnapshot.ownerDisplayName && (
                      <span>{item.contentSnapshot.ownerDisplayName}</span>
                    )}
                    {item.contentSnapshot.durationMs && (
                      <span>{Math.floor(item.contentSnapshot.durationMs / 60000)}:{String(Math.floor((item.contentSnapshot.durationMs % 60000) / 1000)).padStart(2, '0')}</span>
                    )}
                    {item.contentSnapshot.kind && (
                      <span className="pldp-item__kind">{item.contentSnapshot.kind}</span>
                    )}
                  </span>
                </div>
                <span className="material-symbols-outlined pldp-item__play">play_arrow</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
