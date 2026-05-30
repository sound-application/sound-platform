/**
 * Sound Platform — Loading Screen
 * Phase: 5-A + i18n
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import './LoadingScreen.css';

interface Props {
  message?: string;
}

export function LoadingScreen({ message }: Props) {
  const { t } = useTranslation('common');
  return (
    <div className="loading-screen" role="status" aria-live="polite">
      <div className="loading-screen__logo">
        <span className="loading-screen__wordmark">Sound</span>
        <div className="loading-screen__pulse" aria-hidden="true" />
      </div>
      <p className="loading-screen__message">{message ?? t('actions.loading')}</p>
    </div>
  );
}
