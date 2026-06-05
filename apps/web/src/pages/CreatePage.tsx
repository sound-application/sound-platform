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
import { useTranslation } from 'react-i18next';
import i18n from "i18next";

const t = (key: any, options?: any) => i18n.t(key, options) as any as string;


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

const getCREATE_OPTIONS = (t: any): CreateOption[]  => [
  {
    icon: '✍️',
    title: t('create:publicPost'),
    description: t('create:shareAnIdeaOrExperienceInThePublicWorld'),
    world: t('profile.tabs.general'),
    worldColor: 'var(--color-world-general)',
    disabled: true,
    disabledReason: t('create:comingSoonRequiresActivationOfServices'),
  },
  {
    icon: '⭐',
    title: t('profile.emptyStates.plusTitle'),
    description: t('create:createExclusivePlusContent'),
    world: 'Plus',
    worldColor: 'var(--color-world-plus)',
    disabled: true,
    disabledReason: t('profile.emptyStates.requiresPlus'),
  },
  {
    icon: '🎸',
    title: t('create:musicContent'),
    description: t('create:publishYourMusicOrRecordings'),
    world: t('profile.tabs.music'),
    worldColor: 'var(--color-world-music)',
    disabled: true,
    disabledReason: t('create:requiresMusicValidityComingSoon'),
  },
  {
    icon: '📻',
    title: t('create:broadcast'),
    description: t('create:createYourOwnRadioStation'),
    world: t('profile.tabs.radio'),
    worldColor: 'var(--color-world-radio)',
    disabled: true,
    disabledReason: t('profile.emptyStates.requiresRadio'),
  },
  {
    icon: '📡',
    title: t('create:liveSession'),
    // Live is a tab, not a world. Creation is world-scoped by destination.
    // لايف is the correct locked bottom tab label. مباشر is forbidden as a world label.
    description: t('create:startALiveSessionTypeIsDeterminedByTheCh'),
    world: t('create:live'),
    worldColor: 'var(--color-accent)',
    disabled: true,
    disabledReason: t('profile.emptyStates.soon'),
  },
  {
    icon: '🏆',
    title: t('create:championship'),
    description: t('create:createAVocalTournamentOrRunAVoteandwinEx'),
    world: t('profile.tabs.tournaments'),
    worldColor: 'var(--color-world-tournaments, var(--color-accent))',
    disabled: true,
    disabledReason: t('create:requiresTournamentOrganizerAuthorization'),
  },
];

export function CreatePage() {
  const { t } = useTranslation('home');
  return (
    <div className="page">
      <h1 className="page__title">{t('create:construction')}</h1>
      <p className="create-page__note text-secondary">
        {t('create:creationOptionsWillBeActivatedAfterVerif')}</p>
      <div className="create-page__options">
        {getCREATE_OPTIONS(t).map((opt) => (
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
