import React from 'react';
import { useNavigate } from 'react-router-dom';
import type { AudioContentDoc } from '@sound/shared';
import './AudioContentCard.css';
import i18n from 'i18next';
import { useTranslation } from 'react-i18next';
import { storage } from '../lib/firebase';

export interface AudioContentCardProps {
  item: AudioContentDoc;
  worldPrefix?: string;
}

function formatDuration(ms?: number) {
  if (!ms) return '0:00';
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function AudioContentCard({ item, worldPrefix = '/general' }: AudioContentCardProps) {
  const navigate = useNavigate();
  const { i18n } = useTranslation();

  // Basic styling based on world
  const accentColors: Record<string, string> = {
    '/general': '#7c3aed', // Purple
    '/plus': '#eab308', // Gold
    '/music': '#ef4444', // Red
    '/radio': '#3b82f6', // Blue
    '/tournaments': '#f97316', // Orange
  };

  const accentColor = accentColors[worldPrefix] || '#7c3aed';

  const handleClick = () => {
    // Navigate to the global audio player
    navigate(`/audio/${item.id}`);
  };

  const getLocalizedLabel = (id: string | undefined, fallback: string) => {
    if (!id) return fallback;
    
    const normalizedId = id.toLowerCase();
    
    // Map backend English category/kind IDs to local strings
    const arabicMap: Record<string, string> = {
      longaudio: 'مقطع طويل',
      shortaudio: 'مقطع قصير',
      podcast: 'بودكاست',
      music: 'موسيقى',
      radio: 'راديو',
      tournament: 'مسابقة',
      comedy: 'كوميديا',
      education: 'تعليم',
      culture: 'ثقافة',
      fiction: 'خيال',
      business: 'أعمال',
      kids: 'أطفال',
      news: 'أخبار',
      health: 'صحة',
      sports: 'رياضة',
      technology: 'تكنولوجيا',
      arts: 'فنون',
      history: 'تاريخ',
      religion: 'دين',
      documentary: 'وثائقي',
    };
    
    const englishMap: Record<string, string> = {
      longaudio: 'Long Audio',
      shortaudio: 'Short',
      podcast: 'Podcast',
      music: 'Music',
      radio: 'Radio',
      tournament: 'Tournament',
      comedy: 'Comedy',
      education: 'Education',
      culture: 'Culture',
      fiction: 'Fiction',
      business: 'Business',
      kids: 'Kids',
      news: 'News',
      health: 'Health',
      sports: 'Sports',
      technology: 'Technology',
      arts: 'Arts',
      history: 'History',
      religion: 'Religion',
      documentary: 'Documentary',
    };
    
    if (i18n.language?.startsWith('ar')) return arabicMap[normalizedId] || fallback;
    return englishMap[normalizedId] || fallback;
  };

  let typeText = '';
  if (item.kind) {
    let rawFallback = item.kind === 'longAudio' ? (i18n.language?.startsWith('ar') ? 'مقطع طويل' : 'Long Audio') : item.kind;
    typeText = getLocalizedLabel(item.kind, rawFallback);
  }

  let catText = '';
  if (item.categoryId) {
    catText = getLocalizedLabel(item.categoryId, item.categoryLabel || item.categoryId);
  }

  // If no kind and no categoryId, maybe use old fallback logic
  if (!typeText && !catText) {
    let rawFallback = item.categoryLabel || 'Audio';
    catText = getLocalizedLabel(undefined, rawFallback);
  }

  const [asyncCoverUrl, setAsyncCoverUrl] = React.useState<string | null>(null);

  // Robust cover resolution
  let coverUrl = '';
  if (typeof item.coverAsset === 'string') {
    coverUrl = item.coverAsset;
  } else if ((item.coverAsset as any)?.downloadUrl) {
    coverUrl = (item.coverAsset as any).downloadUrl;
  } else if ((item as any).coverPath && (item as any).coverPath.startsWith('http')) {
    coverUrl = (item as any).coverPath;
  } else if ((item as any).coverUrl) {
    coverUrl = (item as any).coverUrl;
  } else if (asyncCoverUrl) {
    coverUrl = asyncCoverUrl;
  }

  React.useEffect(() => {
    if (coverUrl) return; // already resolved synchronously
    
    let pathToResolve = '';
    if (item.coverAsset?.storagePath) {
      pathToResolve = item.coverAsset.storagePath;
    } else if ((item as any).coverPath && !(item as any).coverPath.startsWith('http')) {
      pathToResolve = (item as any).coverPath;
    }

    if (pathToResolve) {
      import('firebase/storage').then(({ ref, getDownloadURL }) => {
        getDownloadURL(ref(storage, pathToResolve))
          .then((url) => setAsyncCoverUrl(url))
          .catch((err) => console.warn('Failed to resolve cover URL:', err));
      });
    }
  }, [item, storage, coverUrl]);

  const [imageError, setImageError] = React.useState(false);

  return (
    <div className="sound-audio-card" onClick={handleClick} role="button" tabIndex={0}>
      <div className="sound-audio-card__cover" style={{ backgroundColor: accentColor }}>
        {coverUrl && !imageError ? (
          <img 
            src={coverUrl} 
            alt={item.title} 
            loading="lazy" 
            onError={() => setImageError(true)}
          />
        ) : (
          <span className="material-symbols-outlined sound-audio-card__placeholder-icon">
            graphic_eq
          </span>
        )}
        <div className="sound-audio-card__duration">
          {formatDuration((item as any).durationMs || item.audioAsset?.durationMs || item.processedAudio?.durationMs)}
        </div>
      </div>

      <div className="sound-audio-card__info">
        <h3 className="sound-audio-card__title">{item.title}</h3>
        {item.caption && <p className="sound-audio-card__caption">{item.caption}</p>}
        
        <div className="sound-audio-card__meta">
          <span className="sound-audio-card__date">
            {new Date(item.publishedAt || item.updatedAt).toLocaleDateString(i18n.language)}
          </span>
          <div className="sound-audio-card__tags">
            {typeText && <span className="sound-audio-card__category">{typeText}</span>}
            {catText && <span className="sound-audio-card__category">{catText}</span>}
          </div>
        </div>

        <div className="sound-audio-card__stats">
          <div className="sound-audio-card__stat">
            <span className="material-symbols-outlined">play_arrow</span>
            <span>{item.listensCount || 0}</span>
          </div>
          <div className="sound-audio-card__stat">
            <span className="material-symbols-outlined">favorite</span>
            <span>{item.likesCount || 0}</span>
          </div>
          <div className="sound-audio-card__stat">
            <span className="material-symbols-outlined">chat_bubble</span>
            <span>{item.commentsCount || 0}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
