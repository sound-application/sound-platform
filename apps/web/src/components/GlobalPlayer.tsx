import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { usePlayer } from '../contexts/PlayerContext';
import './GlobalPlayer.css';

export function GlobalPlayer() {
  const { currentTrack, queue, playerState, togglePlay, nextTrack, prevTrack, closePlayer } = usePlayer();
  const location = useLocation();
  const navigate = useNavigate();

  // The Half-CD only shows if we have a track AND we are NOT on the detail page.
  const isAudioDetailPage = location.pathname.startsWith('/audio/');
  if (!currentTrack || isAudioDetailPage) {
    return null;
  }

  const isPlaying = playerState === 'playing';
  const isBuffering = playerState === 'loading' || playerState === 'buffering';

  return (
    <div className="global-player-container">
      {/* 1. The Half-CD */}
      <div 
        className="global-player-cd-wrapper" 
        onClick={() => navigate(`/audio/${currentTrack.id}`)}
        title="العودة إلى المشغل"
      >
        <div className={`global-player-cd ${isPlaying ? 'spinning' : ''}`}>
          <div 
            className="cd-art" 
            style={{ backgroundImage: `url(${currentTrack.coverUrl || '/default-cover.png'})` }}
          >
            <div className="cd-hole" />
          </div>
        </div>
      </div>

      {/* 2. Vertical Controls Panel */}
      <div className="global-player-controls">
        <button 
          className="gpc-btn gpc-play" 
          onClick={togglePlay}
          disabled={playerState === 'error' || playerState === 'loading'}
          title={isPlaying ? 'إيقاف مؤقت' : 'تشغيل'}
        >
          {isBuffering ? (
            <div className="gpc-spinner" />
          ) : (
            <span className="material-symbols-outlined">{isPlaying ? 'pause' : 'play_arrow'}</span>
          )}
        </button>

        {queue.length > 0 && (
          <>
            <button className="gpc-btn" onClick={nextTrack} title="المقطع التالي">
              <span className="material-symbols-outlined">skip_next</span>
            </button>
            <button className="gpc-btn" onClick={prevTrack} title="المقطع السابق">
              <span className="material-symbols-outlined">skip_previous</span>
            </button>
          </>
        )}

        <button className="gpc-btn gpc-close" onClick={closePlayer} title="إغلاق المشغل">
          <span className="material-symbols-outlined">close</span>
        </button>
      </div>

      {/* 3. Track Info Tooltip (Shows on hover) */}
      <div className="gpc-track-info">
        <div className="gpc-track-title">{currentTrack.title}</div>
        <div className="gpc-track-author">{currentTrack.authorName}</div>
      </div>
    </div>
  );
}
