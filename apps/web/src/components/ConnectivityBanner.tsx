/**
 * Sound Platform — Connectivity Banner
 * Phase: 5-A
 * Shows a warning bar when the app cannot reach Firebase online services.
 */

import React from 'react';
import { useFirebaseConnectivity } from '../hooks/useFirebaseConnectivity';
import './ConnectivityBanner.css';

export function ConnectivityBanner() {
  const status = useFirebaseConnectivity();

  if (status === 'online' || status === 'checking') return null;

  return (
    <div className="connectivity-banner" role="alert" aria-live="assertive">
      <span className="connectivity-banner__icon" aria-hidden="true">⚠️</span>
      <span>
        لا يوجد اتصال بالإنترنت — بعض المحتوى قد لا يكون متاحاً الآن
      </span>
    </div>
  );
}
