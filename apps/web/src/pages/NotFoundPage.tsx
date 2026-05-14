/**
 * Sound Platform — 404 Not Found Page
 * Phase: 5-A
 */

import React from 'react';
import { Link } from 'react-router-dom';
import './Page.css';
import './AuthPage.css';

export function NotFoundPage() {
  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1 className="auth-card__title" style={{ fontSize: 'var(--font-size-3xl)' }}>404</h1>
        <p className="auth-card__subtitle">الصفحة غير موجودة</p>
        <Link
          to="/"
          style={{
            display: 'inline-block',
            marginTop: 'var(--space-4)',
            padding: 'var(--space-2) var(--space-5)',
            borderRadius: 'var(--radius-full)',
            background: 'var(--color-brand)',
            color: '#fff',
            fontWeight: 600,
            fontSize: 'var(--font-size-sm)',
          }}
        >
          العودة للرئيسية
        </Link>
      </div>
    </div>
  );
}
