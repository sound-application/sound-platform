/**
 * Sound Platform — Discover Page (Shell)
 * Phase: 5-A + i18n
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { EmptyState } from '../components/EmptyState';
import './Page.css';

export function DiscoverPage() {
  const { t } = useTranslation('discover');

  return (
    <div className="page">
      <h1 className="page__title">{t('title')}</h1>
      <EmptyState
        icon="🔍"
        title={t('emptyStateTitle')}
        description={t('emptyStateDesc')}
      />
    </div>
  );
}
