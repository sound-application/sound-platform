/**
 * Sound Platform — Profile Page (Shell)
 * ========================================
 * Phase: 5-A
 *
 * PRIVACY MODEL (mandatory — Phase 4-H-2):
 *   ✅ Reads from:  publicProfiles/{uid}  (public projection)
 *   ❌ NEVER reads: users/{uid}           (private — Firestore rules deny)
 *
 * The profile is section-based. Sections absent from publicProfiles
 * are privacy-hidden by the owner — show absent sections as hidden,
 * not as "not found".
 *
 * Profile tabs:
 *   general | listening | playlists | plus | music | radio | live
 */

import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { usePublicProfile } from '../hooks/usePublicProfile';
import { LoadingScreen } from '../components/LoadingScreen';
import { EmptyState } from '../components/EmptyState';
import './ProfilePage.css';
import './Page.css';

// ─── Profile Tabs ─────────────────────────────────────────────────────────────
// These map to PrivacySection keys from packages/shared/src/profile.ts.
// Sections the owner has hidden will simply not be present in publicProfiles.

type ProfileTab = 'general' | 'listening' | 'playlists' | 'plus' | 'music' | 'radio' | 'live';

const TABS: { id: ProfileTab; label: string }[] = [
  { id: 'general',   label: 'عام'      },
  { id: 'listening', label: 'استماع'   },
  { id: 'playlists', label: 'قوائم'    },
  { id: 'plus',      label: 'Plus'     },
  { id: 'music',     label: 'موسيقى'   },
  { id: 'radio',     label: 'راديو'    },
  { id: 'live',      label: 'مباشر'    },
];

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  /** true when this is the /me route (own profile) */
  isSelf?: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ProfilePage({ isSelf = false }: Props) {
  const { uid: routeUid }  = useParams<{ uid: string }>();
  const { currentUser }    = useAuth();
  const [activeTab, setActiveTab] = useState<ProfileTab>('general');

  // Determine whose profile to load.
  // isSelf → use own uid. Otherwise use route param.
  const targetUid = isSelf ? (currentUser?.uid ?? null) : (routeUid ?? null);

  // ✅ Only ever read from publicProfiles — never users/{uid}
  const profileState = usePublicProfile(targetUid);

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (profileState.status === 'loading') {
    return <LoadingScreen message="جاري تحميل الملف الشخصي..." />;
  }

  // ── Error ───────────────────────────────────────────────────────────────────
  if (profileState.status === 'error') {
    return (
      <div className="page">
        <EmptyState
          icon="⚠️"
          title="حدث خطأ"
          description={profileState.message}
        />
      </div>
    );
  }

  // ── Not found ───────────────────────────────────────────────────────────────
  // publicProfiles/{uid} does not exist yet — CF projection not yet deployed.
  if (profileState.status === 'not-found') {
    return (
      <div className="page">
        <EmptyState
          icon="👤"
          title={isSelf ? 'ملفك الشخصي ليس جاهزاً بعد' : 'الملف الشخصي غير متاح'}
          description={
            isSelf
              ? 'سيتم إنشاء ملفك الشخصي العام تلقائياً — ميزة قريباً'
              : 'لم يتم العثور على هذا الملف الشخصي أو أنه خاص'
          }
        />
      </div>
    );
  }

  // ── Loaded ──────────────────────────────────────────────────────────────────
  const profile = profileState.profile;

  return (
    <div className="page profile-page">

      {/* Header */}
      <div className="profile-page__header">
        <div className="profile-page__avatar">
          {profile.generalProfile?.avatarUrl ? (
            <img src={profile.generalProfile.avatarUrl} alt={profile.generalProfile.displayName ?? ''} />
          ) : (
            <span className="profile-page__avatar-initial" aria-hidden="true">
              {(profile.generalProfile?.displayName ?? '؟').charAt(0).toUpperCase()}
            </span>
          )}
        </div>
        <div className="profile-page__info">
          <h1 className="profile-page__display-name">
            {profile.generalProfile?.displayName ?? 'مستخدم Sound'}
          </h1>
          {profile.generalProfile?.bio && (
            <p className="profile-page__bio">{profile.generalProfile.bio}</p>
          )}
        </div>
      </div>

      {/* Tabs */}
      <nav className="profile-page__tabs" role="tablist" aria-label="أقسام الملف الشخصي">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={activeTab === tab.id}
            id={`profile-tab-${tab.id}`}
            aria-controls={`profile-panel-${tab.id}`}
            className={`profile-page__tab${activeTab === tab.id ? ' profile-page__tab--active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {/* Tab Panels */}
      <div
        role="tabpanel"
        id={`profile-panel-${activeTab}`}
        aria-labelledby={`profile-tab-${activeTab}`}
        className="profile-page__panel"
      >
        <ProfileTabContent tab={activeTab} profile={profile} isSelf={isSelf} />
      </div>
    </div>
  );
}

// ─── Tab Content ──────────────────────────────────────────────────────────────

import type { PublicProfileDoc } from '@sound/shared';

function ProfileTabContent({
  tab,
  profile,
  isSelf,
}: {
  tab: ProfileTab;
  profile: PublicProfileDoc;
  isSelf: boolean;
}) {
  switch (tab) {
    case 'general':
      return profile.generalProfile ? (
        <div className="profile-page__section">
          <p className="text-secondary">{profile.generalProfile.bio ?? 'لا توجد سيرة ذاتية'}</p>
        </div>
      ) : (
        <PrivacyHidden />
      );

    case 'listening':
      return profile.listeningActivity ? (
        <EmptyState icon="🎧" title="لا يوجد نشاط استماع حالياً" />
      ) : (
        <PrivacyHidden />
      );

    case 'playlists':
      return profile.musicPlaylists ? (
        <EmptyState icon="🎵" title="لا توجد قوائم تشغيل بعد" />
      ) : (
        <PrivacyHidden />
      );

    case 'plus':
      return profile.plusCreatorContent ? (
        <EmptyState
          icon="⭐"
          title="لا يوجد محتوى Plus بعد"
          action={{
            label: 'نشر محتوى Plus',
            disabled: true,
            disabledReason: 'يتطلب صلاحية Plus — قريباً',
          }}
        />
      ) : (
        <PrivacyHidden />
      );

    case 'music':
      return profile.musicCreatorContent ? (
        <EmptyState
          icon="🎸"
          title="لا يوجد محتوى موسيقي بعد"
          action={{
            label: 'نشر محتوى موسيقي',
            disabled: true,
            disabledReason: 'يتطلب صلاحية إنشاء موسيقى — قريباً',
          }}
        />
      ) : (
        <PrivacyHidden />
      );

    case 'radio':
      return profile.radioCreatorContent ? (
        <EmptyState
          icon="📻"
          title="لا توجد إذاعات بعد"
          action={{
            label: 'إنشاء إذاعة',
            disabled: true,
            disabledReason: 'يتطلب صلاحية راديو — قريباً',
          }}
        />
      ) : (
        <PrivacyHidden />
      );

    case 'live':
      return (
        <EmptyState
          icon="📡"
          title="لا توجد جلسات مباشرة"
          action={{
            label: 'ابدأ بثاً مباشراً',
            disabled: true,
            disabledReason: 'قريباً',
          }}
        />
      );

    default:
      return null;
  }
}

// ─── Privacy Hidden ───────────────────────────────────────────────────────────
// A section absent from publicProfiles is privacy-hidden, not missing.
// Do NOT show "not found" — that would leak existence.

function PrivacyHidden() {
  return (
    <div className="profile-page__section profile-page__section--hidden">
      <span className="profile-page__privacy-icon" aria-hidden="true">🔒</span>
      <p className="text-muted">هذا القسم خاص</p>
    </div>
  );
}
