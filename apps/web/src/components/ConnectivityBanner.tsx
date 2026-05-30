/**
 * Sound Platform — Connectivity Banner
 * Phase: 5-A + i18n
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { useFirebaseConnectivity } from '../hooks/useFirebaseConnectivity';
import './ConnectivityBanner.css';

export function ConnectivityBanner() {
  const { t } = useTranslation('common');
  const status = useFirebaseConnectivity();

  if (status === 'online' || status === 'checking') return null;

  return (
    <div className="connectivity-banner" role="alert" aria-live="assertive">
      <span className="connectivity-banner__icon" aria-hidden="true">⚠️</span>
      <span>{t('connectivity.offlineDetail', 'لا يوجد اتصال بالإنترنت — بعض المحتوى قد لا يكون متاحاً الآن')}</span>
    </div>
  );
}
