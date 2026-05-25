/**
 * Sound Platform — Profile Page
 * ================================
 * Phase:   7 (Viewer-Aware Privacy Resolver)
 * Updated: 2026-05-25
 *
 * Source material:
 *   - New Screens: music_me_profile_sound_authority/code.html (only usable export)
 *   - Old Screens: sound_artist_profile/code.html
 *   - Authority:   DESIGN.md + sound_takeover_report.md
 *
 * PRIVACY MODEL (Phase 7 — mandatory):
 *   Self view (✔):   usePublicProfile — onSnapshot on publicProfiles/{uid} (real-time).
 *   Other view (✔):  useViewerProfile — callable getProfileForViewer (viewer-filtered).
 *   NEVER reads users/{uid} (private — Firestore rules deny).
 *   NEVER reads privacySettings/{uid} from client (owner-only — rules deny).
 *
 * Tab computation rules:
 *   - Viewer-facing tabs appear ONLY when the section is projected AND non-empty.
 *   - Owner/management tabs may appear with a real empty-state CTA.
 *   - 'live' is NEVER a profile tab — it is the bottom nav لايف item.
 *   - Forbidden labels: بطولات, مباشر, بث, جلسة, لقطات, استكشاف.
 *   - مسابقات is the correct label for the tournaments world and tab.
 */

import React, { useState, useMemo, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { usePublicProfile } from '../hooks/usePublicProfile';
import { useViewerProfile } from '../hooks/useViewerProfile';
import { useFollowState } from '../hooks/useFollowState';
import type { PublicProfileDoc, ViewerState } from '@sound/shared';
import { LoadingScreen } from '../components/LoadingScreen';
import { EmptyState } from '../components/EmptyState';
import './ProfilePage.css';
import './Page.css';

// ─── Tab Definition ───────────────────────────────────────────────────────────
// Tabs are computed from publicProfiles data, not a fixed static list.
// Each tab has a visibility rule checked at render time.

type ProfileTab =
  | 'general'
  | 'listening'
  | 'playlists'
  | 'plus'
  | 'music'
  | 'radio'
  | 'tournaments';

interface TabDef {
  id: ProfileTab;
  /** Arabic label — must match DESIGN.md locked tokens where applicable */
  label: string;
  /**
   * Whether this tab should be visible.
   * viewer: only if section exists (projected + non-empty by privacy model)
   * owner:  may show even if empty, if a real management CTA exists
   */
  visible: (profile: PublicProfileDoc, isSelf: boolean) => boolean;
}

const TAB_DEFS: TabDef[] = [
  {
    id: 'general',
    label: 'عام',
    // Always show: every profile has at minimum a displayName.
    visible: (p) => Boolean(p.generalProfile),
  },
  {
    id: 'listening',
    label: 'استماع',
    // Viewer: show only if listeningActivity is projected (privacy-allowed + has data).
    // Owner: show with management CTA if section exists.
    visible: (p, isSelf) => isSelf ? true : Boolean(p.listeningActivity),
  },
  {
    id: 'playlists',
    label: 'قوائم',
    visible: (p, isSelf) => isSelf ? true : Boolean(p.musicPlaylists),
  },
  {
    id: 'plus',
    label: 'Plus',
    visible: (p, isSelf) => isSelf ? Boolean(p.plusCreatorContent) : Boolean(p.plusCreatorContent),
  },
  {
    id: 'music',
    label: 'موسيقى',
    // Owner: show with empty-state CTA if they have music capability (plusCreatorContent or musicCreatorContent projected).
    // Viewer: only if musicCreatorContent is projected.
    visible: (p, isSelf) => isSelf
      ? Boolean(p.musicCreatorContent)
      : Boolean(p.musicCreatorContent),
  },
  {
    id: 'radio',
    label: 'راديو',
    visible: (p, isSelf) => isSelf
      ? Boolean(p.radioCreatorContent)
      : Boolean(p.radioCreatorContent),
  },
  {
    id: 'tournaments',
    // ✅ مسابقات — the correct locked label for tournaments
    // ❌ FORBIDDEN: بطولات
    label: 'مسابقات',
    visible: (p, isSelf) => isSelf
      ? Boolean(p.tournamentsOrganizerContent || p.joinedTournaments || p.awardsAndMedals)
      : Boolean(p.tournamentsOrganizerContent || p.joinedTournaments || p.awardsAndMedals),
  },
];

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  /** true when this is the /me route (own profile) */
  isSelf?: boolean;
}

// ─── Component ─────────────────────────────────────────────────────────────────
//
// ROUTING SPLIT (Phase 7):
//   isSelf=true  → ProfilePageSelf  → usePublicProfile (onSnapshot, real-time)
//   isSelf=false → ProfilePageOther → useViewerProfile (callable, viewer-filtered)
//
// WHY SPLIT?
//   Self-view reads publicProfiles/{uid} directly (real-time, no CF roundtrip).
//   Other-view uses the callable to apply viewer-aware audience gates.
//   Keeping them separate preserves the Rules of Hooks constraint
//   (both hooks are always called in their respective components).

export function ProfilePage({ isSelf = false }: Props) {
  const { uid: routeUid } = useParams<{ uid: string }>();
  const { currentUser }   = useAuth();
  const targetUid = isSelf ? (currentUser?.uid ?? null) : (routeUid ?? null);

  if (isSelf) {
    return <ProfilePageSelf selfUid={targetUid} currentUser={currentUser} />;
  }
  return <ProfilePageOther targetUid={targetUid} currentUid={currentUser?.uid ?? null} />;
}

// ─── Self View (usePublicProfile — real-time) ──────────────────────────────────

function ProfilePageSelf({
  selfUid,
  currentUser,
}: {
  selfUid: string | null;
  currentUser: { uid: string } | null;
}) {
  const profileState = usePublicProfile(selfUid);

  if (profileState.status === 'loading') {
    return <LoadingScreen message="جاري تحميل الملف الشخصي..." />;
  }
  if (profileState.status === 'error') {
    return (
      <div className="page">
        <EmptyState icon="⚠️" title="حدث خطأ" description={profileState.message} />
      </div>
    );
  }
  if (profileState.status === 'not-found') {
    return (
      <div className="page">
        <EmptyState
          icon="👤"
          title="ملفك الشخصي ليس جاهزاً بعد"
          description="سيتم إنشاء ملفك الشخصي العام تلقائياً"
        />
      </div>
    );
  }
  return (
    <ProfileLoaded
      profile={profileState.profile}
      isSelf={true}
      currentUid={currentUser?.uid ?? null}
    />
  );
}

// ─── Other-User View (useViewerProfile — caller-filtered) ─────────────────────

function ProfilePageOther({
  targetUid,
  currentUid,
}: {
  targetUid: string | null;
  currentUid: string | null;
}) {
  const { status, refetch, ...rest } = useViewerProfile(targetUid);

  if (status === 'loading') {
    return <LoadingScreen message="جاري تحميل الملف الشخصي..." />;
  }

  // ── Blocked state ────────────────────────────────────────────────────────────
  // The target has blocked this viewer. Do not reveal any profile data.
  if (status === 'blocked') {
    return (
      <div className="page">
        <EmptyState
          icon="🚫"
          title="هذا الحساب غير متاح"
          description="تعذر عرض هذا الملف الشخصي."
        />
      </div>
    );
  }

  if (status === 'error') {
    const errorState = rest as { message: string };
    return (
      <div className="page">
        <EmptyState icon="⚠️" title="حدث خطأ" description={errorState.message} />
      </div>
    );
  }

  if (status === 'not-found') {
    return (
      <div className="page">
        <EmptyState
          icon="👤"
          title="الملف الشخصي غير متاح"
          description="لم يتم العثور على هذا الملف الشخصي أو أنه خاص"
        />
      </div>
    );
  }

  // status === 'loaded'
  const loadedState = rest as { result: import('@sound/shared').GetProfileForViewerResponse };
  const { profile, viewerState } = loadedState.result;

  return (
    <ProfileLoaded
      profile={profile}
      isSelf={false}
      currentUid={currentUid}
      viewerState={viewerState}
      onFollowToggled={refetch}
    />
  );
}

// ─── Loaded View ──────────────────────────────────────────────────────────────
// Separated to keep hook ordering clean.
// Receives optional viewerState from getProfileForViewer (other-view)
// and optional onFollowToggled callback to trigger refetch after follow change.

function ProfileLoaded({
  profile,
  isSelf,
  currentUid,
  viewerState,
  onFollowToggled,
}: {
  profile: PublicProfileDoc;
  isSelf: boolean;
  currentUid: string | null;
  /** Viewer social state — provided by getProfileForViewer for other-view */
  viewerState?: ViewerState;
  /** Called after follow/unfollow to refresh viewer-filtered data */
  onFollowToggled?: () => void;
}) {
  // ── Follow state — real Firestore onSnapshot via useFollowState ─────────
  // Hook is always called (Rules of Hooks) but returns no-op when isSelf.
  const targetUid = profile.uid ?? null;
  const followState = useFollowState(
    isSelf ? null : currentUid,  // null disables hook for self-view
    isSelf ? null : targetUid,
  );

  // ── Refetch after follow toggle (Phase 7) ────────────────────────────────
  // When the viewer follows/unfollows, the callable may return different sections
  // (e.g. if 'followers' audience unlocks more content after following).
  // We call onFollowToggled() which increments the version in useViewerProfile.
  const handleFollowToggle = useCallback(async () => {
    await followState.toggle();
    if (onFollowToggled) {
      // Small delay to let the CF mirror write complete before refetch.
      // The onFollowWrite CF is near-instant but not synchronous.
      setTimeout(onFollowToggled, 1500);
    }
  }, [followState, onFollowToggled]);
  
  // Compute visible tabs from current projection data.
  const visibleTabs = useMemo(
    () => TAB_DEFS.filter((t) => t.visible(profile, isSelf)),
    [profile, isSelf],
  );

  // Default to first visible tab (usually 'general').
  const [activeTab, setActiveTab] = useState<ProfileTab>(
    () => visibleTabs[0]?.id ?? 'general',
  );

  // If the active tab becomes invisible after a data change, fall back.
  const currentTab =
    visibleTabs.find((t) => t.id === activeTab)?.id ?? visibleTabs[0]?.id ?? 'general';

  const general = profile.generalProfile;
  const displayName = general?.displayName ?? 'مستخدم Sound';
  const username    = general?.username ?? null;
  const bio         = general?.bio ?? null;
  const avatarUrl   = general?.avatarUrl ?? null;

  return (
    <div className="page profile-page">

      {/* ── Cover / Hero Area ──────────────────────────────────────────── */}
      <div className="profile-page__cover">
        <div className="profile-page__cover-overlay" />

        {/* Badges row (top-right in RTL = visual start) */}
        <div className="profile-page__cover-badges">
          {general?.isVerified && (
            <span className="profile-page__badge profile-page__badge--verified">
              <span className="material-symbols-outlined" aria-hidden="true" dir="ltr">verified</span>
              موثق
            </span>
          )}
        </div>

        {/* Cover-level actions (top-left in RTL = visual end) */}
        <div className="profile-page__cover-actions">
          {/* Always visible: share */}
          <button className="profile-page__cover-btn" aria-label="مشاركة" type="button">
            <span className="material-symbols-outlined" aria-hidden="true" dir="ltr">share</span>
          </button>
          {/* Owner-only: notifications, inbox, settings */}
          {isSelf && (
            <>
              <button
                id="profile-notifications-btn"
                className="profile-page__cover-btn"
                aria-label="الإشعارات"
                type="button"
              >
                <span className="material-symbols-outlined" aria-hidden="true" dir="ltr">notifications</span>
              </button>
              <button
                id="profile-inbox-btn"
                className="profile-page__cover-btn"
                aria-label="صندوق الرسائل"
                type="button"
              >
                <span className="material-symbols-outlined" aria-hidden="true" dir="ltr">mail</span>
              </button>
              <button
                id="profile-settings-btn"
                className="profile-page__cover-btn"
                aria-label="الإعدادات"
                type="button"
              >
                <span className="material-symbols-outlined" aria-hidden="true" dir="ltr">settings</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── Avatar + Identity ─────────────────────────────────────────── */}
      <div className="profile-page__identity">
        {/* Avatar with active-ring and optional live dot */}
        <div className="profile-page__avatar-wrap">
          <div className="profile-page__avatar active-ring">
            {avatarUrl ? (
              <img src={avatarUrl} alt={displayName} />
            ) : (
              <span className="profile-page__avatar-initial" aria-hidden="true">
                {displayName.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
        </div>

        <div className="profile-page__identity-text">
          <h1 className="profile-page__display-name">{displayName}</h1>

          {/* Username — must be LTR-isolated: @handle, never handle@ */}
          {username && (
            <p className="profile-page__username" dir="ltr">@{username}</p>
          )}

          {bio && <p className="profile-page__bio">{bio}</p>}
        </div>
      </div>

      {/* ── Stats Grid ────────────────────────────────────────────────── */}
      <ProfileStats profile={profile} />

      {/* ── Viewer Actions: follow + message — NEVER shown to owner ─── */}
      {!isSelf && (
        <div className="profile-page__actions">
          <button
            id="profile-follow-btn"
            className={[
              'profile-page__action-btn profile-page__action-btn--primary',
              followState.isFollowing ? 'profile-page__action-btn--following' : '',
            ].join(' ').trim()}
            type="button"
            onClick={handleFollowToggle}
            disabled={followState.isLoading || followState.isSaving}
            aria-label={followState.isFollowing ? 'إلغاء المتابعة' : 'متابعة'}
            aria-pressed={followState.isFollowing}
          >
            {followState.isLoading
              ? '...'
              : followState.isSaving
              ? '...'
              : followState.isFollowing
              ? 'إلغاء المتابعة'
              : 'متابعة'}
          </button>
          {/* Error toast — minimal, non-blocking */}
          {followState.error && (
            <span className="profile-page__follow-error" role="alert" aria-live="polite">
              {followState.error}
            </span>
          )}
          <button
            id="profile-message-btn"
            className="profile-page__action-btn profile-page__action-btn--secondary"
            type="button"
          >
            رسالة
          </button>
        </div>
      )}

      {/* ── Owner Actions: edit profile — NEVER shown to viewer ──────── */}
      {isSelf && (
        <div className="profile-page__actions">
          <button
            id="profile-edit-btn"
            className="profile-page__action-btn profile-page__action-btn--secondary profile-page__action-btn--with-icon"
            type="button"
          >
            <span className="material-symbols-outlined" aria-hidden="true" dir="ltr">edit</span>
            تعديل الملف الشخصي
          </button>
        </div>
      )}

      {/* ── Listening Now status (owner only — ready for audio context) ─ */}
      {isSelf && (
        <div className="profile-page__listening-now" aria-label="أستمع الآن">
          <span className="profile-page__listening-dot" aria-hidden="true" />
          <span className="profile-page__listening-label">أستمع الآن</span>
          <span className="profile-page__listening-track">—</span>
        </div>
      )}

      {/* ── Social Links (owner: always if links exist; viewer: only if projected) */}
      <ProfileSocialLinks profile={profile} isSelf={isSelf} />

      {/* ── Tabs (computed from data) ──────────────────────────────────── */}
      {visibleTabs.length > 0 && (
        <nav
          className="profile-page__tabs"
          role="tablist"
          aria-label="أقسام الملف الشخصي"
        >
          {visibleTabs.map((tab) => (
            <button
              key={tab.id}
              role="tab"
              id={`profile-tab-${tab.id}`}
              aria-selected={currentTab === tab.id}
              aria-controls={`profile-panel-${tab.id}`}
              className={`profile-page__tab${currentTab === tab.id ? ' profile-page__tab--active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      )}

      {/* ── Tab Panel ─────────────────────────────────────────────────── */}
      <div
        role="tabpanel"
        id={`profile-panel-${currentTab}`}
        aria-labelledby={`profile-tab-${currentTab}`}
        className="profile-page__panel"
      >
        <ProfileTabContent tab={currentTab} profile={profile} isSelf={isSelf} />
      </div>

    </div>
  );
}

// ─── Stats Grid ───────────────────────────────────────────────────────────────
// World-adaptive: each world shows its own counters.
//
//  General / Plus:   متابع | استماع
//  Music:            متابع | استماع | أغنية | ألبومات
//  Radio:            متابع | استماع | إذاعات | حلقات
//  Tournaments:      متابع | استماع | مسابقات | جوائز
//
// All values come from the typed publicProfiles projection — no casts.

function ProfileStats({ profile }: { profile: PublicProfileDoc }) {
  const general      = profile.generalProfile;
  const music        = profile.musicCreatorContent;
  const radio        = profile.radioCreatorContent;
  const tournaments  = profile.tournamentsOrganizerContent;
  const awards       = profile.awardsAndMedals;

  const stats: { label: string; value: string }[] = [];

  // ── Universal: followers + listens (always on generalProfile) ───────────────
  stats.push({ label: 'متابع',  value: formatCount(general.followersCount) });
  stats.push({ label: 'استماع', value: formatCount(general.listensCount) });

  // ── Music world: songs + albums ─────────────────────────────────────────────
  if (music) {
    stats.push({ label: 'أغنية',   value: formatCount(music.uploadedSongs.length) });
    stats.push({ label: 'ألبومات', value: formatCount(music.albums.length) });
    return <StatsRow stats={stats} />;
  }

  // ── Radio world: stations + episodes ────────────────────────────────────────
  if (radio) {
    stats.push({ label: 'إذاعات', value: formatCount(radio.ownedRadioStations.length) });
    stats.push({ label: 'حلقات',  value: formatCount(radio.radioEpisodes.length) });
    return <StatsRow stats={stats} />;
  }

  // ── Tournaments world: organized + awards ───────────────────────────────────
  if (tournaments || awards) {
    stats.push({
      label: 'مسابقات',
      value: formatCount(tournaments?.organizedTournamentIds.length ?? 0),
    });
    stats.push({
      label: 'جوائز',
      value: formatCount(awards?.awardIds.length ?? 0),
    });
    return <StatsRow stats={stats} />;
  }

  // ── General / Plus: followers + listens only ─────────────────────────────────
  return <StatsRow stats={stats} />;
}

function StatsRow({ stats }: { stats: { label: string; value: string }[] }) {
  return (
    <div className="profile-page__stats">
      {stats.map((s) => (
        <div key={s.label} className="profile-page__stat">
          <span className="profile-page__stat-value">{s.value}</span>
          <span className="profile-page__stat-label">{s.label}</span>
        </div>
      ))}
    </div>
  );
}

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

// ─── Social Links ─────────────────────────────────────────────────────────────
// Owner: always render the block if any link exists (add-link CTA if empty).
// Viewer: only render if generalProfile.socialLinks is present in the projection.
//
// PRIVACY NOTE: socialLinks lives on generalProfile — if generalProfile is
// absent from the projection, the viewer cannot see social links at all.

const SOCIAL_ICON_MAP: Record<string, string> = {
  instagram:  'photo_camera',
  twitter:    'tag',          // X / Twitter
  x:          'tag',
  youtube:    'smart_display',
  spotify:    'music_note',
  soundcloud: 'volume_up',
  tiktok:     'music_video',
  website:    'language',
  link:       'link',
};

function ProfileSocialLinks({
  profile,
  isSelf,
}: {
  profile: PublicProfileDoc;
  isSelf: boolean;
}) {
  const links = profile.generalProfile?.socialLinks ?? null;
  const hasLinks = links && Object.keys(links).length > 0;

  // Viewer: hide entirely if not projected
  if (!isSelf && !hasLinks) return null;

  // Owner with no links: show a muted placeholder
  if (!hasLinks) {
    if (!isSelf) return null;
    return (
      <div className="profile-page__social-links profile-page__social-links--empty">
        <span className="profile-page__social-hint">أضف روابطك الاجتماعية في تعديل الملف الشخصي</span>
      </div>
    );
  }

  return (
    <div className="profile-page__social-links">
      {Object.entries(links).map(([platform, url]) => {
        const icon = SOCIAL_ICON_MAP[platform.toLowerCase()] ?? 'link';
        return (
          <a
            key={platform}
            href={typeof url === 'string' ? url : '#'}
            className="profile-page__social-link"
            target="_blank"
            rel="noopener noreferrer"
            aria-label={platform}
          >
            <span className="material-symbols-outlined" aria-hidden="true" dir="ltr">{icon}</span>
          </a>
        );
      })}
    </div>
  );
}

// ─── Tab Content ──────────────────────────────────────────────────────────────

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
          <p className="text-secondary">
            {profile.generalProfile.bio ?? 'لا توجد سيرة ذاتية'}
          </p>
        </div>
      ) : (
        <PrivacyHidden />
      );

    case 'listening':
      return profile.listeningActivity ? (
        <EmptyState icon="🎧" title="لا يوجد نشاط استماع حالياً" />
      ) : isSelf ? (
        <EmptyState icon="🎧" title="نشاط الاستماع" description="ستظهر هنا أغانيك وبرامجك الأخيرة" />
      ) : (
        <PrivacyHidden />
      );

    case 'playlists':
      return profile.musicPlaylists ? (
        <EmptyState icon="🎵" title="لا توجد قوائم تشغيل بعد" />
      ) : isSelf ? (
        <EmptyState
          icon="🎵"
          title="قوائم التشغيل"
          action={{ label: 'إنشاء قائمة', disabled: true, disabledReason: 'قريباً' }}
        />
      ) : (
        <PrivacyHidden />
      );

    case 'plus':
      return profile.plusCreatorContent ? (
        <EmptyState icon="⭐" title="لا يوجد محتوى Plus بعد" />
      ) : isSelf ? (
        <EmptyState
          icon="⭐"
          title="محتوى Plus"
          action={{ label: 'نشر محتوى Plus', disabled: true, disabledReason: 'يتطلب صلاحية Plus — قريباً' }}
        />
      ) : (
        <PrivacyHidden />
      );

    case 'music':
      return profile.musicCreatorContent ? (
        <EmptyState icon="🎸" title="لا يوجد محتوى موسيقي بعد" />
      ) : isSelf ? (
        <EmptyState
          icon="🎸"
          title="المحتوى الموسيقي"
          action={{ label: 'نشر موسيقى', disabled: true, disabledReason: 'يتطلب صلاحية إنشاء موسيقى — قريباً' }}
        />
      ) : (
        <PrivacyHidden />
      );

    case 'radio':
      return profile.radioCreatorContent ? (
        <EmptyState icon="📻" title="لا توجد إذاعات بعد" />
      ) : isSelf ? (
        <EmptyState
          icon="📻"
          title="الإذاعة"
          action={{ label: 'إنشاء إذاعة', disabled: true, disabledReason: 'يتطلب صلاحية راديو — قريباً' }}
        />
      ) : (
        <PrivacyHidden />
      );

    case 'tournaments':
      // ✅ مسابقات — correct label. ❌ بطولات — forbidden.
      return (
        profile.tournamentsOrganizerContent ||
        profile.joinedTournaments ||
        profile.awardsAndMedals
      ) ? (
        <EmptyState icon="🏆" title="لا توجد مسابقات بعد" />
      ) : isSelf ? (
        <EmptyState
          icon="🏆"
          title="المسابقات"
          action={{ label: 'استعراض المسابقات', disabled: true, disabledReason: 'قريباً' }}
        />
      ) : (
        <PrivacyHidden />
      );

    default:
      return null;
  }
}

// ─── Privacy Hidden ───────────────────────────────────────────────────────────
// A section absent from publicProfiles is privacy-hidden, NOT missing/not-found.
// Do NOT show "not found" — that would leak existence information.

function PrivacyHidden() {
  return (
    <div className="profile-page__section profile-page__section--hidden">
      <span className="profile-page__privacy-icon" aria-hidden="true">🔒</span>
      <p className="text-muted">هذا القسم خاص</p>
    </div>
  );
}
