/**
 * Sound Platform — Loading Screen
 * Phase: 5-A
 */

import React from 'react';
import './LoadingScreen.css';

interface Props {
  message?: string;
}

export function LoadingScreen({ message = 'جاري التحميل...' }: Props) {
  return (
    <div className="loading-screen" role="status" aria-live="polite">
      <div className="loading-screen__logo">
        <span className="loading-screen__wordmark">Sound</span>
        <div className="loading-screen__pulse" aria-hidden="true" />
      </div>
      <p className="loading-screen__message">{message}</p>
    </div>
  );
}
