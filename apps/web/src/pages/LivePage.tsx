/**
 * Sound Platform — Live Page (Shell)
 * Phase: 5-A
 *
 * Live sessions from any world.
 * Viewing live is open to all authenticated users.
 * CREATING live requires destination-world capability (CF not deployed yet).
 */

import React from 'react';
import { EmptyState } from '../components/EmptyState';
import './Page.css';

export function LivePage() {
  return (
    <div className="page">
      <h1 className="page__title">مباشر</h1>
      <EmptyState
        icon="📡"
        title="لا توجد جلسات مباشرة الآن"
        description="الجلسات المباشرة من جميع العوالم ستظهر هنا"
        action={{
          label: 'ابدأ بثاً مباشراً',
          disabled: true,
          // Real capability check happens in Cloud Functions (not deployed yet).
          // Phase 5-A: create action is disabled — no write path available.
          disabledReason: 'بث مباشر غير متاح بعد — قريباً',
        }}
      />
    </div>
  );
}
