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

// Type guard: narrows string → LockedWorldKey so WORLD_META can be indexed safely.
function isLockedWorldKey(id: string): id is LockedWorldKey {
  return id in LOCKED_WORLDS;
}

// Keys must match LockedWorldKey — TypeScript will error if they drift from lockedLabels.ts.
const WORLD_META: Record<LockedWorldKey, { label: string; icon: string; color: string; description: string }> = {
  general:     { label: 'عالم عام',         icon: '🌍', color: 'var(--color-world-general)',     description: 'محتوى عام مفتوح للجميع' },
  plus:        { label: 'عالم بلس',         icon: '⭐', color: 'var(--color-world-plus)',        description: 'محتوى بلس — مفتوح للمشاهدة لجميع المستخدمين' },
  music:       { label: 'عالم الموسيقى',    icon: '🎵', color: 'var(--color-world-music)',       description: 'محتوى موسيقي منشور' },
  radio:       { label: 'عالم الراديو',     icon: '📻', color: 'var(--color-world-radio)',       description: 'إذاعات ومحطات راديو مجدولة' },
  tournaments: { label: 'عالم المسابقات',   icon: '',   color: 'var(--color-world-tournaments)', description: 'مسابقات صوتية وتحديات إبداعية' },
};

export function WorldPage() {
  const { worldId } = useParams<{ worldId: string }>();
  const meta = worldId && isLockedWorldKey(worldId) ? WORLD_META[worldId] : undefined;

  if (!meta) {
    return (
      <div className="page">
        <EmptyState icon="❓" title="عالم غير معروف" />
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
        title="لا يوجد محتوى بعد"
        description="سيظهر المحتوى المنشور هنا عند توفره"
      />
    </div>
  );
}
