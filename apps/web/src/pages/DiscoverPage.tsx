/**
 * Sound Platform — Discover Page (Shell)
 * Phase: 5-A
 */

import React from 'react';
import { EmptyState } from '../components/EmptyState';
import './Page.css';

export function DiscoverPage() {
  return (
    <div className="page">
      <h1 className="page__title">اكتشف</h1>
      <EmptyState
        icon="🔍"
        title="اكتشف محتوى جديداً"
        description="تصفح المحتوى المنشور عبر جميع عوالم Sound"
      />
    </div>
  );
}
