/**
 * Sound Platform — Settings Page (Shell)
 * Phase: 5-A
 *
 * Settings reads the owner's OWN users/{uid} doc (owner-allowed per rules).
 * This is the ONLY page that may eventually read users/{uid} on the client.
 * All other profile rendering must use publicProfiles/{uid}.
 *
 * In Phase 5-A, no actual reads are performed — shell placeholder only.
 */

import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { EmptyState } from '../components/EmptyState';
import './Page.css';

export function SettingsPage() {
  const { currentUser } = useAuth();

  return (
    <div className="page">
      <h1 className="page__title">الإعدادات</h1>
      <EmptyState
        icon="⚙️"
        title="الإعدادات"
        description={
          currentUser
            ? `الحساب: ${currentUser.email ?? currentUser.uid}`
            : 'جاري التحقق...'
        }
      />
    </div>
  );
}
