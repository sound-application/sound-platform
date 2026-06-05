/**
 * Sound Platform — Account Control Hub
 * Phase: 5-G (Privacy Foundation — UI-only inventory, 13 groups) + i18n
 *
 * Full-screen glass sheet that opens from the AppHeader avatar button.
 * Contains 9 account-management sections + an inline Privacy Center panel.
 *
 * Architecture:
 *   AppHeader avatar → AccountControlHub (modal sheet, z-200)
 *   Privacy Center is an inner panel — no route change, no navigation.
 *   All other navigating items use navigate() and close the hub.
 *
 * Authority: docs/SOUND_UI_FOUNDATION_AUTHORITY.md
 * SRS: project files/02_SRS.md — Privacy, Account, Monetization sections
 *
 * Scope: UI-only. No Firestore writes, no Cloud Functions, no auth logic.
 * Backend placeholders are marked // SCHEMA GAP or // COMING SOON.
 */

import React, { useEffect, useCallback, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { TFunction } from 'i18next';
import { signOut as firebaseSignOut } from 'firebase/auth';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import { useWorldNav } from '../../contexts/WorldNavContext';
import { LOCKED_WORLDS } from '../../constants/lockedLabels';
import { auth, db } from '../../lib/firebase';
import './AccountControlHub.css';

// ═══ Types ═══════════════════════════════════════════════════════════════════

interface HubItem {
  icon: string;
  label: string;
  desc?: string;
  route?: string;
  onClick?: () => void;
  danger?: boolean;
  soon?: boolean;
}

interface HubSection {
  heading: string;
  items: HubItem[];
}

// ═══ Privacy Center placeholder values ═══════════════════════════════════════

interface PrivacyOption {
  id: string;
  label: string;
}

interface PrivacyRow {
  id: string;
  label: string;
  desc: string;
  value: string;
  options: PrivacyOption[];
  serverEnforced?: boolean;
}

interface PrivacyGroup {
  heading: string;
  rows: PrivacyRow[];
}

// ── Helpers to get translated static data ──

const getAudienceOptions = (t: TFunction): PrivacyOption[] => [
  { id: 'public', label: t('options.public') },
  { id: 'followers', label: t('options.followers') },
  { id: 'following', label: t('options.following') },
  { id: 'friends', label: t('options.friends') },
  { id: 'specific-list', label: t('options.specificList') },
  { id: 'except-selected', label: t('options.exceptSelected') },
  { id: 'manual-selected', label: t('options.manualSelected') },
  { id: 'only-me', label: t('options.onlyMe') },
];

const getContactOptions = (t: TFunction): PrivacyOption[] => [
  { id: 'everyone', label: t('options.everyone') },
  { id: 'followers', label: t('options.followers') },
  { id: 'following', label: t('options.following') },
  { id: 'friends', label: t('options.friends') },
  { id: 'off', label: t('options.off') },
];

const getToggleOptions = (t: TFunction): PrivacyOption[] => [
  { id: 'on', label: t('options.on') },
  { id: 'off', label: t('options.offToggle') },
];

const getApprovalOptions = (t: TFunction): PrivacyOption[] => [
  { id: 'auto', label: t('options.auto') },
  { id: 'manual', label: t('options.manual') },
];

const getLocationOptions = (t: TFunction): PrivacyOption[] => [
  { id: 'exact', label: t('options.exact') },
  { id: 'city', label: t('options.city') },
  { id: 'hidden', label: t('options.hidden') },
];

const getManagementOptions = (t: TFunction): PrivacyOption[] => [
  { id: 'manage', label: t('options.manage') },
];

const getServerOptions = (t: TFunction): PrivacyOption[] => [
  { id: 'server', label: t('options.server') },
];

const getPrivacyGroups = (t: TFunction): PrivacyGroup[] => [
  {
    heading: t('privacyGroups.profileAndIdentity.heading'),
    rows: [
      { id: 'profile-visibility', label: t('privacyGroups.profileAndIdentity.profileVisibility.label'), desc: t('privacyGroups.profileAndIdentity.profileVisibility.desc'), value: 'public', options: getAudienceOptions(t) },
      { id: 'profile-stats', label: t('privacyGroups.profileAndIdentity.profileStats.label'), desc: t('privacyGroups.profileAndIdentity.profileStats.desc'), value: 'followers', options: getAudienceOptions(t) },
      { id: 'social-links', label: t('privacyGroups.profileAndIdentity.socialLinks.label'), desc: t('privacyGroups.profileAndIdentity.socialLinks.desc'), value: 'public', options: getAudienceOptions(t) },
      { id: 'badges', label: t('privacyGroups.profileAndIdentity.badges.label'), desc: t('privacyGroups.profileAndIdentity.badges.desc'), value: 'public', options: getAudienceOptions(t) },
    ],
  },
  {
    heading: t('privacyGroups.storiesAndRing.heading'),
    rows: [
      { id: 'stories-visibility', label: t('privacyGroups.storiesAndRing.storiesVisibility.label'), desc: t('privacyGroups.storiesAndRing.storiesVisibility.desc'), value: 'followers', options: getAudienceOptions(t) },
      { id: 'story-ring', label: t('privacyGroups.storiesAndRing.storyRing.label'), desc: t('privacyGroups.storiesAndRing.storyRing.desc'), value: 'followers', options: getAudienceOptions(t) },
      { id: 'story-replies', label: t('privacyGroups.storiesAndRing.storyReplies.label'), desc: t('privacyGroups.storiesAndRing.storyReplies.desc'), value: 'friends', options: getContactOptions(t) },
    ],
  },
  {
    heading: t('privacyGroups.listeningNow.heading'),
    rows: [
      { id: 'listening-now', label: t('privacyGroups.listeningNow.listeningNow.label'), desc: t('privacyGroups.listeningNow.listeningNow.desc'), value: 'followers', options: getAudienceOptions(t) },
      { id: 'listening-world-switch', label: t('privacyGroups.listeningNow.listeningWorldSwitch.label'), desc: t('privacyGroups.listeningNow.listeningWorldSwitch.desc'), value: 'on', options: getToggleOptions(t) },
    ],
  },
  {
    heading: t('privacyGroups.mood.heading'),
    rows: [
      { id: 'mood-visibility', label: t('privacyGroups.mood.moodVisibility.label'), desc: t('privacyGroups.mood.moodVisibility.desc'), value: 'followers', options: getAudienceOptions(t) },
      { id: 'mood-source', label: t('privacyGroups.mood.moodSource.label'), desc: t('privacyGroups.mood.moodSource.desc'), value: 'on', options: getToggleOptions(t) },
    ],
  },
  {
    heading: t('privacyGroups.saved.heading'),
    rows: [
      { id: 'saved-visibility', label: t('privacyGroups.saved.savedVisibility.label'), desc: t('privacyGroups.saved.savedVisibility.desc'), value: 'only-me', options: getAudienceOptions(t) },
      { id: 'saved-lists', label: t('privacyGroups.saved.savedLists.label'), desc: t('privacyGroups.saved.savedLists.desc'), value: 'only-me', options: getAudienceOptions(t) },
    ],
  },
  {
    heading: t('privacyGroups.reposts.heading'),
    rows: [
      { id: 'reposts-visibility', label: t('privacyGroups.reposts.repostsVisibility.label'), desc: t('privacyGroups.reposts.repostsVisibility.desc'), value: 'public', options: getAudienceOptions(t) },
    ],
  },
  {
    heading: t('privacyGroups.subscriptions.heading'),
    rows: [
      { id: 'subscriptions-visibility', label: t('privacyGroups.subscriptions.subscriptionsVisibility.label'), desc: t('privacyGroups.subscriptions.subscriptionsVisibility.desc'), value: 'followers', options: getAudienceOptions(t) },
    ],
  },
  {
    heading: t('privacyGroups.sessions.heading'),
    rows: [
      { id: 'sessions-visibility', label: t('privacyGroups.sessions.sessionsVisibility.label'), desc: t('privacyGroups.sessions.sessionsVisibility.desc'), value: 'friends', options: getAudienceOptions(t) },
      { id: 'sessions-location', label: t('privacyGroups.sessions.sessionsLocation.label'), desc: t('privacyGroups.sessions.sessionsLocation.desc'), value: 'city', options: getLocationOptions(t) },
    ],
  },
  {
    heading: t('privacyGroups.messages.heading'),
    rows: [
      { id: 'messages', label: t('privacyGroups.messages.messages.label'), desc: t('privacyGroups.messages.messages.desc'), value: 'followers', options: getContactOptions(t) },
      { id: 'follow-requests', label: t('privacyGroups.messages.followRequests.label'), desc: t('privacyGroups.messages.followRequests.desc'), value: 'auto', options: getApprovalOptions(t) },
      { id: 'group-invites', label: t('privacyGroups.messages.groupInvites.label'), desc: t('privacyGroups.messages.groupInvites.desc'), value: 'friends', options: getContactOptions(t) },
    ],
  },
  {
    heading: t('privacyGroups.giftsAndPoints.heading'),
    rows: [
      { id: 'receive-gifts', label: t('privacyGroups.giftsAndPoints.receiveGifts.label'), desc: t('privacyGroups.giftsAndPoints.receiveGifts.desc'), value: 'followers', options: getContactOptions(t) },
      { id: 'receive-points', label: t('privacyGroups.giftsAndPoints.receivePoints.label'), desc: t('privacyGroups.giftsAndPoints.receivePoints.desc'), value: 'followers', options: getContactOptions(t) },
      { id: 'points-balance', label: t('privacyGroups.giftsAndPoints.pointsBalance.label'), desc: t('privacyGroups.giftsAndPoints.pointsBalance.desc'), value: 'only-me', options: getAudienceOptions(t) },
    ],
  },
  {
    heading: t('privacyGroups.discover.heading'),
    rows: [
      { id: 'discover-profile', label: t('privacyGroups.discover.discoverProfile.label'), desc: t('privacyGroups.discover.discoverProfile.desc'), value: 'on', options: getToggleOptions(t) },
      { id: 'follow-suggestions', label: t('privacyGroups.discover.followSuggestions.label'), desc: t('privacyGroups.discover.followSuggestions.desc'), value: 'on', options: getToggleOptions(t) },
    ],
  },
  {
    heading: t('privacyGroups.guardian.heading'),
    rows: [
      {
        id: 'guardian-enforcement',
        label: t('privacyGroups.guardian.guardianEnforcement.label'),
        desc: t('privacyGroups.guardian.guardianEnforcement.desc'),
        value: 'server',
        options: getServerOptions(t),
        serverEnforced: true,
      },
      {
        id: 'child-stories',
        label: t('privacyGroups.guardian.childStories.label'),
        desc: t('privacyGroups.guardian.childStories.desc'),
        value: 'server',
        options: getServerOptions(t),
        serverEnforced: true,
      },
      {
        id: 'child-messages',
        label: t('privacyGroups.guardian.childMessages.label'),
        desc: t('privacyGroups.guardian.childMessages.desc'),
        value: 'server',
        options: getServerOptions(t),
        serverEnforced: true,
      },
    ],
  },
  {
    heading: t('privacyGroups.blocking.heading'),
    rows: [
      { id: 'blocked-accounts', label: t('privacyGroups.blocking.blockedAccounts.label'), desc: t('privacyGroups.blocking.blockedAccounts.desc'), value: 'manage', options: getManagementOptions(t) },
      { id: 'muted-accounts', label: t('privacyGroups.blocking.mutedAccounts.label'), desc: t('privacyGroups.blocking.mutedAccounts.desc'), value: 'manage', options: getManagementOptions(t) },
    ],
  },
];


// ═══ Privacy Center Panel ════════════════════════════════════════════════════

type PrivacySaveState = 'idle' | 'loading' | 'saving' | 'saved' | 'error';

function PrivacyCenterPanel({ onBack, uid }: { onBack: () => void; uid: string | null }) {
  const { t } = useTranslation('account');
  const groups = useMemo(() => getPrivacyGroups(t), [t]);

  // Local state initialised from PRIVACY_GROUPS defaults.
  // Overwritten once Firestore data loads.
  const [values, setValues] = useState<Record<string, string>>(() => {
    return groups.reduce<Record<string, string>>((acc, group) => {
      group.rows.forEach((row) => {
        acc[row.id] = row.value;
      });
      return acc;
    }, {});
  });

  const [saveState, setSaveState] = useState<PrivacySaveState>('loading');
  const [errorMsg, setErrorMsg] = useState('');

  // ── Load from privacySettings/{uid} ─────────────────────────────────────
  useEffect(() => {
    if (!uid) { setSaveState('idle'); return; }

    const ref = doc(db, 'privacySettings', uid);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data() as Record<string, string>;
          // Merge Firestore values over defaults — unknown keys are ignored
          setValues((prev) => {
            const merged = { ...prev };
            Object.keys(prev).forEach((k) => {
              if (typeof data[k] === 'string') {
                merged[k] = data[k];
              }
            });
            return merged;
          });
        }
        // If doc doesn't exist yet, keep defaults — it will be created on first save
        setSaveState('idle');
      },
      (err) => {
        console.error('[PrivacyCenterPanel] Firestore load error:', err);
        setSaveState('error');
        setErrorMsg(err.message);
      },
    );
    return unsub;
  }, [uid]);

  // ── Set a single row value ───────────────────────────────────────────────
  const setPrivacyValue = (rowId: string, value: string) => {
    setValues((current) => ({ ...current, [rowId]: value }));
    // Clear saved state when user edits
    if (saveState === 'saved') setSaveState('idle');
  };

  // ── Save to privacySettings/{uid} ───────────────────────────────────────
  const handleSave = useCallback(async () => {
    if (!uid) return;
    setSaveState('saving');
    setErrorMsg('');
    try {
      const ref = doc(db, 'privacySettings', uid);
      await setDoc(ref, {
        ...values,
        uid,
        updatedAt: new Date().toISOString(),
      }, { merge: true }); // merge: true so createdAt is not overwritten
      setSaveState('saved');
    } catch (err: unknown) {
      console.error('[PrivacyCenterPanel] Firestore save error:', err);
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setErrorMsg(msg);
      setSaveState('error');
    }
  }, [uid, values]);


  return (
    <div className="ach-privacy-panel" role="region" aria-label={t('privacyCenter.title')}>
      {/* Header */}
      <div className="ach-privacy-panel__header">
        <button
          className="ach-privacy-panel__back"
          onClick={onBack}
          aria-label={t('privacyCenter.backAria')}
          type="button"
        >
          <span className="material-symbols-outlined" aria-hidden="true">arrow_forward</span>
        </button>
        <div>
          <p className="ach-privacy-panel__title">{t('privacyCenter.title')}</p>
          <p className="ach-privacy-panel__subtitle">
            {saveState === 'loading' && t('privacyCenter.subtitle.loading')}
            {saveState === 'saving' && t('privacyCenter.subtitle.saving')}
            {saveState === 'saved'  && t('privacyCenter.subtitle.saved')}
            {saveState === 'error'  && t('privacyCenter.subtitle.error', { error: errorMsg })}
            {saveState === 'idle'   && t('privacyCenter.subtitle.idle')}
          </p>
        </div>
        {/* Save button in header */}
        <button
          type="button"
          className="ach-privacy-save-btn"
          onClick={handleSave}
          disabled={saveState === 'saving' || saveState === 'loading' || !uid}
          aria-label={t('privacyCenter.saveAria')}
        >
          {saveState === 'saving' ? t('privacyCenter.saving') : t('privacyCenter.save')}
        </button>
      </div>

      {/* Body */}
      <div className="ach-privacy-panel__body">
        {/* Foundation note — shown while loading or on first use */}
        {saveState === 'loading' && (
          <div className="ach-privacy-note">
            <span className="material-symbols-outlined" aria-hidden="true">sync</span>
            <span>{t('privacyCenter.loadNote')}</span>
          </div>
        )}

        {/* Privacy groups */}
        {groups.map((group) => (
          <section key={group.heading} className="ach-section">
            <h3 className="ach-section__heading">{group.heading}</h3>
            <div className="ach-list">
              {group.rows.map((row) => {
                const activeValue = values[row.id] ?? row.value;
                const activeLabel = row.options.find((option) => option.id === activeValue)?.label ?? activeValue;

                /* Server-enforced rows: static badge — not clickable */
                if (row.serverEnforced) {
                  return (
                    <div key={row.id} className="ach-privacy-row ach-privacy-row--server">
                      <div className="ach-privacy-row__text">
                        <span className="ach-privacy-row__label">{row.label}</span>
                        <span className="ach-privacy-row__desc">{row.desc}</span>
                      </div>
                      <span className="ach-privacy-server-badge" aria-label={t('privacyCenter.serverBadgeAria')}>
                        <span className="material-symbols-outlined" aria-hidden="true">dns</span>
                        {t('privacyCenter.serverBadge')}
                      </span>
                    </div>
                  );
                }

                return (
                  <div key={row.id} className="ach-privacy-row">
                    <div className="ach-privacy-row__text">
                      <span className="ach-privacy-row__label">{row.label}</span>
                      <span className="ach-privacy-row__desc">{row.desc}</span>
                      <div className="ach-privacy-row__options" aria-label={t('privacyCenter.optionsAria', { label: row.label })}>
                        {row.options.map((option) => (
                          <button
                            key={option.id}
                            type="button"
                            className={`ach-privacy-option${activeValue === option.id ? ' ach-privacy-option--active' : ''}`}
                            onClick={() => setPrivacyValue(row.id, option.id)}
                            aria-pressed={activeValue === option.id}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="ach-privacy-row__value">
                      {activeLabel}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

// ═══ Main Component ══════════════════════════════════════════════════════════

interface AccountControlHubProps {
  onClose: () => void;
}

export function AccountControlHub({ onClose }: AccountControlHubProps) {
  const { t, i18n } = useTranslation(['account', 'common']);
  const { currentUser } = useAuth();
  const { world } = useWorldNav();
  const navigate = useNavigate();
  const [privacyOpen, setPrivacyOpen] = useState(false);

  // ── Escape key & focus trap ──────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (privacyOpen) { setPrivacyOpen(false); }
        else { onClose(); }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose, privacyOpen]);

  // ── Navigation helper: navigate then close hub ───────────────────────────
  const go = useCallback((route: string) => {
    navigate(route);
    onClose();
  }, [navigate, onClose]);

  // ── Sign out ─────────────────────────────────────────────────────────────
  const handleSignOut = useCallback(async () => {
    try { await firebaseSignOut(auth); }
    catch { /* silent */ }
    onClose();
  }, [onClose]);

  // ── Section definitions ──────────────────────────────────────────────────
  const sections: HubSection[] = useMemo(() => [

    /* ── Account ─────────────────────────────────────────────────────────── */
    {
      heading: t('sections.account.heading'),
      items: [
        {
          icon: 'manage_accounts',
          label: t('sections.account.editProfile.label'),
          desc: t('sections.account.editProfile.desc'),
          route: '/settings/edit-profile',
        },
        {
          icon: 'settings',
          label: t('sections.account.settings.label'),
          desc: t('sections.account.settings.desc'),
          route: '/settings',
        },
        {
          icon: 'lock',
          label: t('sections.account.security.label'),
          desc: t('sections.account.security.desc'),
          soon: true,
        },
        {
          icon: 'language',
          label: t('sections.account.language.label'),
          desc: t('sections.account.language.desc'),
          route: '/settings',
        },
        {
          icon: 'accessibility',
          label: t('sections.account.accessibility.label'),
          desc: t('sections.account.accessibility.desc'),
          soon: true,
        },
        {
          icon: 'logout',
          label: t('sections.account.logout.label'),
          danger: true,
          onClick: handleSignOut,
        },
      ],
    },

    /* ── Privacy ───────────────────────────────────────────────────────── */
    {
      heading: t('sections.privacy.heading'),
      items: [
        {
          icon: 'shield',
          label: t('sections.privacy.center.label'),
          desc: t('sections.privacy.center.desc'),
          onClick: () => setPrivacyOpen(true),
        },
        { icon: 'person_search', label: t('sections.privacy.profileVisibility.label'), soon: true },
        { icon: 'auto_stories', label: t('sections.privacy.storiesVisibility.label'), soon: true },
        { icon: 'hearing', label: t('sections.privacy.listeningVisibility.label'), soon: true },
        { icon: 'mood', label: t('sections.privacy.moodVisibility.label'), soon: true },
        { icon: 'bookmarks', label: t('sections.privacy.savedVisibility.label'), soon: true },
        { icon: 'repeat', label: t('sections.privacy.repostsVisibility.label'), soon: true },
        { icon: 'subscriptions', label: t('sections.privacy.subscriptionsVisibility.label'), soon: true },
        { icon: 'route', label: t('sections.privacy.sessionsVisibility.label'), soon: true },
        { icon: 'bar_chart', label: t('sections.privacy.statsVisibility.label'), soon: true },
        { icon: 'forum', label: t('sections.privacy.messages.label'), soon: true },
        { icon: 'redeem', label: t('sections.privacy.gifts.label'), soon: true },
        { icon: 'explore', label: t('sections.privacy.discover.label'), soon: true },
        { icon: 'block', label: t('sections.privacy.blocking.label'), soon: true },
      ],
    },

    /* ── Activity ─────────────────────────────────────────────────── */
    {
      heading: t('sections.activity.heading'),
      items: [
        { icon: 'inbox', label: t('sections.activity.inbox.label'), soon: true },
        { icon: 'notifications', label: t('sections.activity.notifications.label'), soon: true },
        { icon: 'comment', label: t('sections.activity.comments.label'), soon: true },
        { icon: 'people', label: t('sections.activity.followers.label'), soon: true },
        { icon: 'flag', label: t('sections.activity.reports.label'), soon: true },
        { icon: 'person_off', label: t('sections.activity.blocked.label'), soon: true },
      ],
    },

    /* ── Monetization ──────────────────────────────────────────────── */
    {
      heading: t('sections.monetization.heading'),
      items: [
        { icon: 'workspace_premium', label: t('sections.monetization.subscriptions.label'), soon: true },
        { icon: 'account_balance_wallet', label: t('sections.monetization.wallet.label'), soon: true },
        { icon: 'trending_up', label: t('sections.monetization.earnings.label'), soon: true },
        { icon: 'payments', label: t('sections.monetization.payments.label'), soon: true },
        { icon: 'redeem', label: t('sections.monetization.gifts.label'), soon: true },
      ],
    },

    /* ── Ads ──────────────────────────────────────────────────────── */
    {
      heading: t('sections.ads.heading'),
      items: [
        { icon: 'campaign', label: t('sections.ads.myAds.label'), soon: true },
        { icon: 'add_circle', label: t('sections.ads.createAd.label'), soon: true },
        { icon: 'info', label: t('sections.ads.whyAd.label'), soon: true },
        { icon: 'report', label: t('sections.ads.reportAd.label'), soon: true },
      ],
    },

    /* ── Radio ────────────────────────────────────────────────────────── */
    {
      heading: t('sections.radio.heading'),
      items: [
        { icon: 'radio', label: t('sections.radio.requests.label'), soon: true },
        { icon: 'broadcast_on_personal', label: t('sections.radio.myStation.label'), soon: true },
        { icon: 'contact_phone', label: t('sections.radio.contact.label'), soon: true },
        { icon: 'ad_units', label: t('sections.radio.advertise.label'), soon: true },
        { icon: 'mail', label: t('sections.radio.messages.label'), soon: true },
      ],
    },

    /* ── Music ───────────────────────────────────────────────── */
    {
      heading: t('sections.music.heading'),
      items: [
        { icon: 'gavel', label: t('sections.music.rights.label'), soon: true },
        { icon: 'business', label: t('sections.music.labels.label'), soon: true },
        { icon: 'group', label: t('sections.music.artists.label'), soon: true },
        { icon: 'rate_review', label: t('sections.music.reviews.label'), soon: true },
        { icon: 'verified', label: t('sections.music.eligibility.label'), soon: true },
      ],
    },

    /* ── Tournaments ──────────────────────────────────────────────────────── */
    {
      heading: t('sections.tournaments.heading'),
      items: [
        { icon: 'emoji_events', label: t('sections.tournaments.myTournaments.label'), soon: true },
        { icon: 'lock_open', label: t('sections.tournaments.invites.label'), soon: true },
        { icon: 'how_to_vote', label: t('sections.tournaments.voting.label'), soon: true },
        { icon: 'military_tech', label: t('sections.tournaments.awards.label'), soon: true },
        { icon: 'assignment_turned_in', label: t('sections.tournaments.entries.label'), soon: true },
      ],
    },

    /* ── Support ───────────────────────────────────────────────────── */
    {
      heading: t('sections.support.heading'),
      items: [
        { icon: 'help', label: t('sections.support.helpCenter.label'), soon: true },
        { icon: 'support_agent', label: t('sections.support.contact.label'), soon: true },
        { icon: 'receipt_long', label: t('sections.support.tickets.label'), soon: true },
        { icon: 'bug_report', label: t('sections.support.reportBug.label'), soon: true },
        { icon: 'policy', label: t('sections.support.policy.label'), soon: true },
      ],
    },
  ], [t, handleSignOut]);

  // ── Render item ────────────────────────────────────────────────────────────
  const renderItem = (item: HubItem, idx: number) => {
    const isDisabled = item.soon && !item.route && !item.onClick && !item.danger;
    const handleClick = () => {
      if (item.onClick) { item.onClick(); return; }
      if (item.route)   { go(item.route); return; }
    };

    return (
      <button
        key={idx}
        type="button"
        className={[
          'ach-item',
          item.danger   ? 'ach-item--danger'   : '',
          isDisabled    ? 'ach-item--disabled'  : '',
        ].filter(Boolean).join(' ')}
        onClick={isDisabled ? undefined : handleClick}
        disabled={isDisabled}
        aria-label={item.label}
      >
        <span className="material-symbols-outlined ach-item__icon" aria-hidden="true">
          {item.icon}
        </span>
        <span className="ach-item__text">
          <span className="ach-item__label">{item.label}</span>
          {item.desc && <span className="ach-item__desc">{item.desc}</span>}
        </span>
        {item.soon && (
          <span className="ach-item__badge-soon" aria-label={t('hub.soonBadge')}>{t('hub.soonBadge')}</span>
        )}
        {!item.soon && !item.danger && (
          <span className="material-symbols-outlined ach-item__chevron" aria-hidden="true">
            {i18n.dir() === 'rtl' ? 'chevron_left' : 'chevron_right'}
          </span>
        )}
      </button>
    );
  };

  // ── World label ────────────────────────────────────────────────────────────
  const worldLabel = t(`worlds.${world}`, { ns: 'common', defaultValue: LOCKED_WORLDS[world as keyof typeof LOCKED_WORLDS] ?? world });

  // ── Main render ────────────────────────────────────────────────────────────
  return (
    <>
      {/* Backdrop */}
      <div
        className="ach-backdrop"
        aria-hidden="true"
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        className="ach-sheet"
        role="dialog"
        aria-modal="true"
        aria-label={t('hub.sheetAria')}
      >
        {/* Sheet top header */}
        <div className="ach-sheet__header">
          <p className="ach-sheet__title">{t('hub.sheetTitle')}</p>
          <button
            className="ach-sheet__close"
            type="button"
            onClick={onClose}
            aria-label={t('hub.closeAria')}
          >
            <span className="material-symbols-outlined" aria-hidden="true">close</span>
          </button>
        </div>

        {/* Inner: relative container holds nested panel */}
        <div className="ach-sheet__inner">

          {/* ── Main scrollable body ── */}
          <div className="ach-body" aria-hidden={privacyOpen ? 'true' : 'false'}>

            {/* Profile summary */}
            <div className="ach-profile">
              <div className="ach-profile__avatar">
                {currentUser?.photoURL ? (
                  <img src={currentUser.photoURL} alt={currentUser.displayName ?? t('hub.defaultName')} />
                ) : (
                  <span className="ach-profile__avatar-initial">
                    {(currentUser?.displayName ?? currentUser?.email ?? 'U').charAt(0).toUpperCase()}
                  </span>
                )}
              </div>

              <div className="ach-profile__info">
                <p className="ach-profile__name">
                  {currentUser?.displayName ?? t('hub.defaultName')}
                  {/* SCHEMA GAP: verification badge from publicProfiles */}
                  <span className="ach-profile__badge" aria-label={t('hub.badgeAria')}>
                    <span className="material-symbols-outlined" style={{ fontSize: '14px' }} aria-hidden="true">
                      verified
                    </span>
                  </span>
                </p>
                <p className="ach-profile__username" dir="ltr">
                  {currentUser?.email ?? '@username'}
                </p>
                <span className="ach-profile__world-pill">
                  <span className="material-symbols-outlined" style={{ fontSize: '10px' }} aria-hidden="true">
                    public
                  </span>
                  {worldLabel}
                </span>
              </div>

              <div className="ach-profile__actions">
                <button
                  type="button"
                  className="ach-profile__btn ach-profile__btn--view"
                  onClick={() => go(`/${world}/me`)}
                  aria-label={t('hub.viewProfileAria')}
                >
                  {t('hub.viewProfile')}
                </button>
                <button
                  type="button"
                  className="ach-profile__btn ach-profile__btn--edit"
                  onClick={() => go('/settings/edit-profile')}
                  aria-label={t('hub.editProfileAria')}
                >
                  {t('hub.editProfile')}
                </button>
              </div>
            </div>

            {/* Account sections */}
            {sections.map((section) => (
              <section key={section.heading} className="ach-section">
                <h2 className="ach-section__heading">{section.heading}</h2>
                <div className="ach-list" role="list">
                  {section.items.map((item, i) => renderItem(item, i))}
                </div>
              </section>
            ))}

          </div>

          {/* ── Privacy Center nested panel ── */}
          {privacyOpen && (
            <PrivacyCenterPanel onBack={() => setPrivacyOpen(false)} uid={currentUser?.uid ?? null} />
          )}

        </div>
      </div>
    </>
  );
}
