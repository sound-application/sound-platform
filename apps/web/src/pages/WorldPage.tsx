/**
 * Sound Platform — World Page (Shell)
 * Phase: 5-B
 *
 * Shows content from a specific world: general | plus | music | radio | tournaments.
 * Viewing published content in any world is open to all authenticated users.
 * Plus (بلس) is NOT a viewer gate — all users can view Plus-world content.
 *
 * Locked world labels (must not be renamed):
 *   عام | بلس | موسيقى | راديو | مسابقات
 * مباشر and بطولات are forbidden replacements.
 */

import React from 'react';
import { useParams } from 'react-router-dom';
import { EmptyState } from '../components/EmptyState';
import { LOCKED_WORLDS, type LockedWorldKey } from '../constants/lockedLabels';
import './Page.css';
import i18n from "i18next";

const t = (key: any, options?: any) => i18n.t(key, options) as any as string;


// Type guard: narrows string → LockedWorldKey so WORLD_META can be indexed safely.
function isLockedWorldKey(id: string): id is LockedWorldKey {
  return id in LOCKED_WORLDS;
}

// Keys must match LockedWorldKey — TypeScript will error if they drift from lockedLabels.ts.
const WORLD_META: Record<LockedWorldKey, { label: string; icon: string; color: string; description: string }> = {
  general:     { label: t('world:publicScientist'),         icon: '🌍', color: 'var(--color-world-general)',     description: t('world:publicContentIsOpenToEveryone') },
  plus:        { label: t('world:worldPlus'),         icon: '⭐', color: 'var(--color-world-plus)',        description: t('world:plusContentOpenForViewingByAllUsers') },
  music:       { label: t('world:theWorldOfMusic'),    icon: '🎵', color: 'var(--color-world-music)',       description: t('world:publishedMusicContent') },
  radio:       { label: t('world:radioWorld'),     icon: '📻', color: 'var(--color-world-radio)',       description: t('world:scheduledBroadcastsAndRadioStations') },
  tournaments: { label: t('world:worldOfCompetitions'),   icon: '',   color: 'var(--color-world-tournaments)', description: t('world:vocalCompetitionsAndCreativeChallenges') },
};

export function WorldPage() {
  const { worldId } = useParams<{ worldId: string }>();
  const meta = worldId && isLockedWorldKey(worldId) ? WORLD_META[worldId] : undefined;

  if (!meta) {
    return (
      <div className="page">
        <EmptyState icon="❓" title={t('world:unknownWorld')} />
      </div>
    );
  }

  return (
    <div className="page">
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-6)' }}>
        <span style={{ fontSize: '1.75rem' }} aria-hidden="true">{meta.icon}</span>
        <div>
          <h1 className="page__title" style={{ marginBottom: 'var(--space-1)', color: meta.color }}>
            {meta.label}
          </h1>
          <p className="text-secondary" style={{ fontSize: 'var(--font-size-sm)' }}>
            {meta.description}
          </p>
        </div>
      </div>
      <EmptyState
        icon={meta.icon}
        title={t('world:thereIsNoContentYet')}
        description={t('world:publishedContentWillAppearHereWhenAvaila')}
      />
    </div>
  );
}
