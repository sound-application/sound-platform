/**
 * Sound Platform — Home Page (Shell)
 * Phase: 5-A
 *
 * Cross-world aggregated feed placeholder.
 * No reads in Phase 5-A — feed query service not yet implemented.
 */

import React from 'react';
import { EmptyState } from '../components/EmptyState';
import './Page.css';

export function HomePage() {
  return (
    <div className="page">
      <h1 className="page__title">الرئيسية</h1>
      <EmptyState
        icon="🎵"
        title="مرحباً بك في Sound"
        description="محتواك المخصص من جميع العوالم سيظهر هنا قريباً"
      />
    </div>
  );
}
