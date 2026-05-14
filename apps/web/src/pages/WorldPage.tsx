/**
 * Sound Platform — World Page (Shell)
 * Phase: 5-A
 *
 * Shows content from a specific world: general, plus, music, radio.
 * Viewing published content in any world is open to all authenticated users.
 * Plus is NOT a viewer gate.
 */

import React from 'react';
import { useParams } from 'react-router-dom';
import { EmptyState } from '../components/EmptyState';
import './Page.css';

const WORLD_META: Record<string, { label: string; icon: string; color: string; description: string }> = {
  general: { label: 'العالم العام', icon: '🌍', color: 'var(--color-world-general)', description: 'محتوى عام مفتوح للجميع' },
  plus:    { label: 'عالم Plus',    icon: '⭐', color: 'var(--color-world-plus)',    description: 'محتوى Plus — مفتوح للمشاهدة لجميع المستخدمين' },
  music:   { label: 'عالم الموسيقى', icon: '🎵', color: 'var(--color-world-music)', description: 'محتوى موسيقي منشور' },
  radio:   { label: 'عالم الراديو',  icon: '📻', color: 'var(--color-world-radio)', description: 'إذاعات ومحطات راديو' },
};

export function WorldPage() {
  const { worldId } = useParams<{ worldId: string }>();
  const meta = worldId ? WORLD_META[worldId] : undefined;

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
