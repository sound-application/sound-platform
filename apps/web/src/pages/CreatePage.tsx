/**
 * Sound Platform — Create Page (Shell)
 * Phase: 5-A
 *
 * Entry point for content creation.
 * All create actions are DISABLED in Phase 5-A:
 *   - Cloud Functions not deployed — no server-side capability checks.
 *   - No Firestore writes are performed from this shell.
 *
 * CAPABILITY MODEL (Phase 4-H-1):
 *   General publishing: open by default (no capability needed).
 *   Plus content:       requires Plus capability (CF-enforced).
 *   Music content:      requires Music capability (CF-enforced).
 *   Radio station:      requires Radio capability (CF-enforced).
 *   Live session:       destination-world capability (CF-enforced).
 *
 * UI RULE: Never fake a working publish flow.
 *          Show disabled buttons with explanations. Period.
 */

import React from 'react';
import { EmptyState } from '../components/EmptyState';
import './Page.css';
import './CreatePage.css';

// ─── Create Option ────────────────────────────────────────────────────────────
type CreateOption = {
  icon: string;
  title: string;
  description: string;
  world: string;
  worldColor: string;
  disabled: boolean;
  disabledReason: string;
};

const CREATE_OPTIONS: CreateOption[] = [
  {
    icon: '✍️',
    title: 'منشور عام',
    description: 'شارك فكرة أو تجربة في العالم العام',
    world: 'عام',
    worldColor: 'var(--color-world-general)',
    disabled: true,
    disabledReason: 'قريباً — يتطلب تفعيل الخدمات',
  },
  {
    icon: '⭐',
    title: 'محتوى Plus',
    description: 'أنشئ محتوى Plus حصرياً',
    world: 'Plus',
    worldColor: 'var(--color-world-plus)',
    disabled: true,
    disabledReason: 'يتطلب صلاحية Plus — قريباً',
  },
  {
    icon: '🎸',
    title: 'محتوى موسيقي',
    description: 'انشر موسيقاك أو تسجيلاتك',
    world: 'موسيقى',
    worldColor: 'var(--color-world-music)',
    disabled: true,
    disabledReason: 'يتطلب صلاحية موسيقى — قريباً',
  },
  {
    icon: '📻',
    title: 'إذاعة',
    description: 'أنشئ محطة راديو خاصة بك',
    world: 'راديو',
    worldColor: 'var(--color-world-radio)',
    disabled: true,
    disabledReason: 'يتطلب صلاحية راديو — قريباً',
  },
  {
    icon: '📡',
    title: 'بث مباشر',
    description: 'ابدأ جلسة مباشرة في أي عالم',
    world: 'مباشر',
    worldColor: 'var(--color-world-live)',
    disabled: true,
    disabledReason: 'قريباً',
  },
];

export function CreatePage() {
  return (
    <div className="page">
      <h1 className="page__title">إنشاء</h1>
      <p className="create-page__note text-secondary">
        خيارات الإنشاء ستُفعَّل بعد نشر خدمات التحقق من الصلاحيات
      </p>
      <div className="create-page__options">
        {CREATE_OPTIONS.map((opt) => (
          <button
            key={opt.title}
            className="create-option"
            disabled={opt.disabled}
            aria-disabled={opt.disabled}
            title={opt.disabledReason}
          >
            <span
              className="create-option__world-badge"
              style={{ color: opt.worldColor }}
            >
              {opt.world}
            </span>
            <span className="create-option__icon" aria-hidden="true">{opt.icon}</span>
            <span className="create-option__title">{opt.title}</span>
            <span className="create-option__description">{opt.description}</span>
            <span className="create-option__disabled-note">🔒 {opt.disabledReason}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
