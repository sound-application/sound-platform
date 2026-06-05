/**
 * Sound Platform — Live World Selector Page
 * Phase: 2F
 * 
 * Entry point to all live flows. Blocks live creation until a world is selected.
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAppConfig } from '../../contexts/ConfigContext';
import './LiveWorldSelectorPage.css';
import i18n from '../../i18n';
const t = (key: any, options?: any) => i18n.t(key, options) as any as string;

// Mock data for world descriptions
const getWorldOptions = (t: any) => [
  {
    id: 'general',
    name: t('liveWorld.general.name', t('liveworldselector:thePublicWorld')),
    desc: t('liveWorld.general.desc', t('liveworldselector:reachesAllUsers24mListeners')),
    icon: 'public',
    bg: 'rgba(245, 158, 11, 0.2)', // amber-500/20
    iconColor: 'var(--color-primary, #ffecb9)',
    isLocked: false
  },
  {
    id: 'music',
    name: t('liveWorld.music.name', t('liveworldselector:theWorldOfMusic')),
    desc: t('liveWorld.music.desc', t('liveworldselector:specializedMusicContent870Thousand')),
    icon: 'music_note',
    bg: 'rgba(139, 92, 246, 0.2)', // violet-500/20
    iconColor: '#c4b5fd', // violet-300
    isLocked: false
  },
  {
    id: 'radio',
    name: t('liveWorld.radio.name', t('liveworldselector:radioWorld')),
    desc: t('liveWorld.radio.desc', t('liveworldselector:radioChannelsAndPrograms540Thousand')),
    icon: 'radio',
    bg: 'rgba(239, 68, 68, 0.2)', // red-500/20
    iconColor: '#fca5a5', // red-300
    isLocked: false
  },
  {
    id: 'plus',
    name: t('liveWorld.plus.name', t('liveworldselector:plusWorld')),
    desc: t('liveWorld.plus.desc', t('liveworldselector:exclusiveContentForSubscribers')),
    icon: 'diamond',
    bg: 'rgba(234, 179, 8, 0.2)', // yellow-500/20
    iconColor: '#fde047', // yellow-300
    isLocked: true // Locked based on user subscription (mocked)
  }
];

export function LiveWorldSelectorPage() {
  const { t } = useTranslation(['create', 'home']);
  const navigate = useNavigate();
  const { isWorldEnabled } = useAppConfig();
  
  const [selectedWorld, setSelectedWorld] = useState<string>('general');
  const worldOptions = getWorldOptions(t || t);

  // Filter out completely disabled worlds via ConfigContext
  const availableWorlds = worldOptions.filter(w => isWorldEnabled(w.id));

  const handleStart = () => {
    // Navigate to actual live creation flow passing the selected world
    navigate(`/create/live?world=${selectedWorld}`);
  };

  return (
    <div className="live-world-selector" aria-label={t('liveWorld.pageLabel', t('liveworldselector:chooseABroadcastWorld'))}>
      {/* Dimmed background content */}
      <div className="lws-bg">
        <div className="lws-bg__dim">
          <div className="lws-bg__gradient"></div>
        </div>
        <div className="lws-bg__content">
          <span className="material-symbols-outlined lws-bg__icon" style={{ fontVariationSettings: "'FILL' 1" }}>
            mic
          </span>
          <p className="lws-bg__text">{t('liveWorld.readyToBroadcast', t('liveworldselector:readyForLiveStreaming'))}</p>
        </div>
      </div>

      {/* Bottom Sheet */}
      <div className="lws-bottom-sheet" role="dialog" aria-modal="true" aria-labelledby="lws-title">
        <div className="lws-handle" aria-hidden="true"></div>

        {/* Live indicator banner */}
        <div className="lws-header">
          <span className="lws-header__badge">{t('liveWorld.badgeLive', 'LIVE')}</span>
          <h2 id="lws-title" className="lws-header__title">{t('liveWorld.title', t('liveworldselector:chooseAStreamingWorld'))}</h2>
        </div>
        <p className="lws-desc">{t('liveWorld.subtitle', t('liveworldselector:yourLiveBroadcastWillAppearToThisWorldsF'))}</p>

        <div className="lws-worlds" role="radiogroup" aria-label={t('liveWorld.worldList', t('liveworldselector:listOfAvailableWorlds'))}>
          {availableWorlds.map(w => {
            const isSelected = selectedWorld === w.id;
            return (
              <button
                key={w.id}
                className={`lws-world-card ${isSelected ? 'is-selected' : ''}`}
                disabled={w.isLocked}
                aria-checked={isSelected}
                role="radio"
                onClick={() => !w.isLocked && setSelectedWorld(w.id)}
              >
                <div className="lws-world-card__icon-box" style={{ background: w.bg }}>
                  <span className="material-symbols-outlined lws-world-card__icon" style={{ color: w.iconColor, fontVariationSettings: "'FILL' 1" }}>
                    {w.icon}
                  </span>
                </div>
                <div className="lws-world-card__info">
                  <p className="lws-world-card__name">{w.name}</p>
                  <p className="lws-world-card__meta">{w.desc}</p>
                </div>
                
                {w.isLocked ? (
                  <span className="material-symbols-outlined lws-world-card__lock" aria-label={t('liveWorld.locked', t('liveworldselector:closed'))}>
                    lock
                  </span>
                ) : isSelected ? (
                  <div className="lws-world-card__check" aria-hidden="true">
                    <span className="material-symbols-outlined lws-world-card__check-icon">check</span>
                  </div>
                ) : (
                  <div className="lws-world-card__uncheck" aria-hidden="true"></div>
                )}
              </button>
            );
          })}
        </div>

        {/* CTA */}
        <div className="lws-cta-wrap">
          <button className="lws-cta" onClick={handleStart} aria-label={t('liveWorld.startBroadcast', t('liveworldselector:startBroadcastingInTheSelectedWorld'))}>
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
              stream
            </span>
            {t('liveWorld.startBroadcastSelected', `ابدأ البث في العالَم ${availableWorlds.find(w => w.id === selectedWorld)?.name.replace(t('liveworldselector:alam'), '').trim()}`)}
          </button>
        </div>
      </div>
    </div>
  );
}
