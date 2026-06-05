/**
 * Sound Platform — Global Create Hub
 * Phase: 5-E rev 4 + i18n
 *
 * RULE: Action-first. World is a suggestion only, never a gate.
 *
 * 12 actions:
 *   رفع ملف              → content-type first (صوت عام / بلس / موسيقى)
 *   تسجيل صوت            → destinations: عام | بلس only
 *   لايف                  → عام | بلس | موسيقى | مسابقات  (no Radio)
 *   شورت / مقطع قصير     → short-form discover content (its own action)
 *   الرحلات / الجلسات    → On Road / Sessions — world selector (عام|بلس|موسيقى ONLY) first
 *   موسيقى                → أغنية | ألبوم | فنان | حقوق (gated)
 *   راديو                 → permission/package gated — request-only flows
 *   مسابقة                → مسابقات-only 4-step wizard
 *   إعلان / ترويج        → campaign setup first; world targeting = multi-select LATER
 *   قصة                   → global social — no forced world
 *   تحديث الحالة          → global social — no forced world
 *   ماذا تستمع الآن      → global social — no forced world
 *
 * Authority: docs/SOUND_UI_FOUNDATION_AUTHORITY.md — CREATE section
 * SRS §20 Sessions And World Selection: world must be chosen before session config.
 * Valid On Road target worlds: عام | بلس | موسيقى  (راديو and مسابقات are NOT valid)
 *
 * Scope: no Firestore writes, no CF, no migrations. Hosting deploy only.
 */

import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { TFunction } from 'i18next';
import { useWorldNav } from '../../contexts/WorldNavContext';
import { LOCKED_WORLDS, type LockedWorldKey } from '../../constants/lockedLabels';
import '../Page.css';
import './GlobalCreateHubPage.css';

import i18n from '../../i18n';
const t = (key: any, options?: any) => i18n.t(key, options) as any as string;

// ─── Types ─────────────────────────────────────────────────────────────────

type CreateTypeId =
  | 'upload' | 'record' | 'live' | 'short' | 'sessions'
  | 'music'  | 'radio'  | 'competition'
  | 'ads'    | 'story'  | 'status' | 'listening';

interface ContextStep {
  icon: string;
  label: string;
  note?: string;
  gated?: boolean;
  /** If present, clicking this step navigates to this route (Phase 8-B) */
  action?: string;
}

// ─── World accents ──────────────────────────────────────────────────────────

const W: Record<LockedWorldKey, string> = {
  general:     'var(--color-world-general)',
  plus:        'var(--color-world-plus)',
  music:       'var(--color-world-music)',
  radio:       'var(--color-world-radio)',
  tournaments: 'var(--color-world-tournaments)',
};

// ─── Factory functions ──────────────────────────────────────────────────────

const getSessionWorlds = (t: TFunction): { key: string; label: string; note: string }[] => [
  { key: 'general',  label: t('sessionWorlds.general.label'),     note: t('sessionWorlds.general.note') },
  { key: 'plus',     label: t('sessionWorlds.plus.label'),        note: t('sessionWorlds.plus.note') },
  { key: 'music',    label: t('sessionWorlds.music.label'),       note: t('sessionWorlds.music.note') },
];

interface CreateType {
  id: CreateTypeId;
  icon: string;
  label: string;
  tagline: string;
  accentVar: string;
  panelHeading: string;
  gateNote?: string;
  steps: ContextStep[];
}

const getCreateTypes = (t: TFunction): CreateType[] => [
  // ── Creation tools ──────────────────────────────────────────────────────
  {
    id: 'upload',
    icon: 'upload_file',
    label: t('createTypes.upload.label'),
    tagline: t('createTypes.upload.tagline'),
    accentVar: W.general,
    panelHeading: t('createTypes.upload.panelHeading'),
    steps: [
      { icon: 'record_voice_over', label: t('createTypes.upload.steps.general.label'), note: t('createTypes.upload.steps.general.note'), action: '/create/audio?source=upload' },
      { icon: 'workspace_premium', label: t('createTypes.upload.steps.plus.label'),    note: t('createTypes.upload.steps.plus.note'), action: '/create/audio?source=upload' },
      { icon: 'music_note',        label: t('createTypes.upload.steps.music.label'),   note: t('createTypes.upload.steps.music.note') },
    ],
  },
  {
    id: 'record',
    icon: 'mic',
    label: t('createTypes.record.label'),
    tagline: t('createTypes.record.tagline'),
    accentVar: W.general,
    panelHeading: t('createTypes.record.panelHeading'),
    steps: [
      { icon: 'public',            label: t('createTypes.record.steps.general.label'), note: t('createTypes.record.steps.general.note'), action: '/create/audio?source=record' },
      { icon: 'workspace_premium', label: t('createTypes.record.steps.plus.label'),    note: t('createTypes.record.steps.plus.note'), action: '/create/audio?source=record' },
    ],
  },
  {
    id: 'live',
    icon: 'sensors',
    label: t('createTypes.live.label'),
    tagline: t('createTypes.live.tagline'),
    accentVar: W.general,
    panelHeading: t('createTypes.live.panelHeading'),
    steps: [
      { icon: 'public',       label: t('createTypes.live.steps.general.label'),      note: t('createTypes.live.steps.general.note') },
      { icon: 'star',         label: t('createTypes.live.steps.plus.label'),         note: t('createTypes.live.steps.plus.note') },
      { icon: 'music_note',   label: t('createTypes.live.steps.music.label'),        note: t('createTypes.live.steps.music.note') },
      { icon: 'emoji_events', label: t('createTypes.live.steps.competitions.label'), note: t('createTypes.live.steps.competitions.note') },
    ],
  },
  {
    id: 'short',
    icon: 'slow_motion_video',
    label: t('createTypes.short.label'),
    tagline: t('createTypes.short.tagline'),
    accentVar: W.general,
    panelHeading: t('createTypes.short.panelHeading'),
    steps: [
      { icon: 'video_file',    label: t('createTypes.short.steps.upload.label'),  note: t('createTypes.short.steps.upload.note') },
      { icon: 'mic',           label: t('createTypes.short.steps.record.label'),  note: t('createTypes.short.steps.record.note') },
      { icon: 'auto_awesome',  label: t('createTypes.short.steps.effects.label'), note: t('createTypes.short.steps.effects.note') },
      { icon: 'tag',           label: t('createTypes.short.steps.tags.label'),    note: t('createTypes.short.steps.tags.note') },
    ],
  },
  // ── On Road / Sessions ─────────────────────────────────────────────────────
  {
    id: 'sessions',
    icon: 'route',
    label: t('createTypes.sessions.label'),
    tagline: t('createTypes.sessions.tagline'),
    accentVar: W.general,
    panelHeading: t('createTypes.sessions.panelHeading'),
    gateNote: t('createTypes.sessions.gateNote'),
    steps: [
      { icon: 'description',   label: t('createTypes.sessions.steps.details.label'),  note: t('createTypes.sessions.steps.details.note') },
      { icon: 'tune',          label: t('createTypes.sessions.steps.type.label'),     note: t('createTypes.sessions.steps.type.note') },
      { icon: 'lock_person',   label: t('createTypes.sessions.steps.privacy.label'),  note: t('createTypes.sessions.steps.privacy.note') },
      { icon: 'location_on',   label: t('createTypes.sessions.steps.location.label'), note: t('createTypes.sessions.steps.location.note') },
      { icon: 'play_circle',   label: t('createTypes.sessions.steps.start.label'),    note: t('createTypes.sessions.steps.start.note') },
    ],
  },
  // ── Specialised worlds ───────────────────────────────────────────────────
  {
    id: 'music',
    icon: 'library_music',
    label: t('createTypes.music.label'),
    tagline: t('createTypes.music.tagline'),
    accentVar: W.music,
    panelHeading: t('createTypes.music.panelHeading'),
    steps: [
      { icon: 'music_note',  label: t('createTypes.music.steps.song.label'),    note: t('createTypes.music.steps.song.note') },
      { icon: 'album',       label: t('createTypes.music.steps.album.label'),   note: t('createTypes.music.steps.album.note') },
      { icon: 'person_pin',  label: t('createTypes.music.steps.artists.label'), note: t('createTypes.music.steps.artists.note') },
      { icon: 'gavel',       label: t('createTypes.music.steps.label.label'),   note: t('createTypes.music.steps.label.note'), gated: true },
    ],
  },
  {
    id: 'radio',
    icon: 'radio',
    label: t('createTypes.radio.label'),
    tagline: t('createTypes.radio.tagline'),
    accentVar: W.radio,
    panelHeading: t('createTypes.radio.panelHeading'),
    gateNote: t('createTypes.radio.gateNote'),
    steps: [
      { icon: 'add_business',    label: t('createTypes.radio.steps.request.label'),    note: t('createTypes.radio.steps.request.note'), gated: true },
      { icon: 'verified_user',   label: t('createTypes.radio.steps.permission.label'), note: t('createTypes.radio.steps.permission.note'), gated: true },
      { icon: 'support_agent',   label: t('createTypes.radio.steps.contact.label'),    note: t('createTypes.radio.steps.contact.note') },
    ],
  },
  {
    id: 'competition',
    icon: 'emoji_events',
    label: t('createTypes.competition.label'),
    tagline: t('createTypes.competition.tagline'),
    accentVar: W.tournaments,
    panelHeading: t('createTypes.competition.panelHeading'),
    steps: [
      { icon: 'add_circle',   label: t('createTypes.competition.steps.create.label'), note: t('createTypes.competition.steps.create.note') },
      { icon: 'how_to_reg',   label: t('createTypes.competition.steps.open.label'),   note: t('createTypes.competition.steps.open.note') },
      { icon: 'how_to_vote',  label: t('createTypes.competition.steps.voting.label'), note: t('createTypes.competition.steps.voting.note') },
      { icon: 'group',        label: t('createTypes.competition.steps.invite.label'), note: t('createTypes.competition.steps.invite.note') },
    ],
  },
  // ── Promotion ────────────────────────────────────────────────────────────
  {
    id: 'ads',
    icon: 'campaign',
    label: t('createTypes.ads.label'),
    tagline: t('createTypes.ads.tagline'),
    accentVar: W.general,
    panelHeading: t('createTypes.ads.panelHeading'),
    steps: [
      { icon: 'edit_note',       label: t('createTypes.ads.steps.title.label'),     note: t('createTypes.ads.steps.title.note') },
      { icon: 'category',        label: t('createTypes.ads.steps.type.label'),      note: t('createTypes.ads.steps.type.note') },
      { icon: 'language',        label: t('createTypes.ads.steps.targeting.label'), note: t('createTypes.ads.steps.targeting.note') },
      { icon: 'payments',        label: t('createTypes.ads.steps.budget.label'),    note: t('createTypes.ads.steps.budget.note') },
    ],
  },
  // ── Social / Identity layer ──────────────────────────────────────────────
  {
    id: 'story',
    icon: 'auto_stories',
    label: t('createTypes.story.label'),
    tagline: t('createTypes.story.tagline'),
    accentVar: W.general,
    panelHeading: t('createTypes.story.panelHeading'),
    steps: [
      { icon: 'image',         label: t('createTypes.story.steps.media.label'),    note: t('createTypes.story.steps.media.note') },
      { icon: 'mic',           label: t('createTypes.story.steps.audio.label'),    note: t('createTypes.story.steps.audio.note') },
      { icon: 'lock_person',   label: t('createTypes.story.steps.audience.label'), note: t('createTypes.story.steps.audience.note') },
    ],
  },
  {
    id: 'status',
    icon: 'edit_square',
    label: t('createTypes.status.label'),
    tagline: t('createTypes.status.tagline'),
    accentVar: W.general,
    panelHeading: t('createTypes.status.panelHeading'),
    steps: [
      { icon: 'mood',          label: t('createTypes.status.steps.text.label'),     note: t('createTypes.status.steps.text.note') },
      { icon: 'music_note',    label: t('createTypes.status.steps.music.label'),    note: t('createTypes.status.steps.music.note') },
      { icon: 'timer',         label: t('createTypes.status.steps.duration.label'), note: t('createTypes.status.steps.duration.note') },
    ],
  },
  {
    id: 'listening',
    icon: 'headphones',
    label: t('createTypes.listening.label'),
    tagline: t('createTypes.listening.tagline'),
    accentVar: W.music,
    panelHeading: t('createTypes.listening.panelHeading'),
    steps: [
      { icon: 'search',        label: t('createTypes.listening.steps.search.label'), note: t('createTypes.listening.steps.search.note') },
      { icon: 'share',         label: t('createTypes.listening.steps.share.label'),  note: t('createTypes.listening.steps.share.note') },
      { icon: 'person_add',    label: t('createTypes.listening.steps.invite.label'), note: t('createTypes.listening.steps.invite.note') },
    ],
  },
];

// ─── Group metadata ─────────────────────────────────────────────────────────
// Visual section dividers in the grid

const getGroups = (t: TFunction): { heading: string; ids: CreateTypeId[] }[] => [
  { heading: t('groups.creationTools'),     ids: ['upload', 'record', 'live', 'short', 'sessions'] },
  { heading: t('groups.specializedWorlds'), ids: ['music', 'radio', 'competition'] },
  { heading: t('groups.promotion'),         ids: ['ads'] },
  { heading: t('groups.socialIdentity'),    ids: ['story', 'status', 'listening'] },
];

// ─── World → suggested action map ──────────────────────────────────────────

const WORLD_SUGGESTIONS: Partial<Record<LockedWorldKey, CreateTypeId[]>> = {
  general:     ['upload', 'record', 'live', 'short', 'sessions', 'story'],
  plus:        ['record', 'upload', 'live', 'sessions'],
  music:       ['music', 'upload', 'live', 'sessions', 'listening'],
  radio:       ['radio', 'live'],
  tournaments: ['competition', 'live'],
};

// ─── ActionPanel ─────────────────────────────────────────────────────────────

function ActionPanel({ type, onNavigate, t, sessionWorlds }: { type: CreateType; onNavigate: (path: string) => void; t: TFunction; sessionWorlds: { key: string; label: string; note: string }[] }) {
  return (
    <div
      className="gch-panel"
      role="group"
      aria-label={type.panelHeading}
      style={{ '--panel-accent': type.accentVar } as React.CSSProperties}
    >
      {type.gateNote && (
        <p className="gch-panel__gate-note">
          <span className="material-symbols-outlined gch-panel__gate-icon" aria-hidden="true">lock</span>
          {type.gateNote}
        </p>
      )}

      <p className="gch-panel__heading">{type.panelHeading}</p>

      {/* Sessions: world selector block FIRST (عام | بلس | موسيقى only) */}
      {type.id === 'sessions' && (
        <>
          <ul className="gch-panel__steps gch-sessions-worlds" role="list" aria-label={t('createTypes.sessions.panelHeading')}>
            {sessionWorlds.map((w) => (
              <li key={w.key} className="gch-step gch-step--world">
                <span className="material-symbols-outlined gch-step__icon" aria-hidden="true">language</span>
                <span className="gch-step__text">
                  <span className="gch-step__label">{w.label}</span>
                  <span className="gch-step__note">{w.note}</span>
                </span>
                <span className="material-symbols-outlined gch-step__chevron" aria-hidden="true">chevron_left</span>
              </li>
            ))}
          </ul>
          <p className="gch-panel__sessions-rule">
            <span className="material-symbols-outlined" aria-hidden="true" style={{ fontSize: '0.85rem', verticalAlign: 'middle' }}>info</span>
            &nbsp;{t('messages.sessionsRule')}
          </p>
          <p className="gch-panel__heading" style={{ marginTop: '0.5rem' }}>{t('messages.setupStepsAfterWorld')}</p>
        </>
      )}

      <ul className="gch-panel__steps" role="list">
        {type.steps.map((step) => (
          <li
            key={step.label}
            className={[
              'gch-step',
              step.gated ? 'gch-step--gated' : '',
              step.action ? 'gch-step--actionable' : '',
            ].filter(Boolean).join(' ')}
            onClick={step.action ? () => onNavigate(step.action!) : undefined}
            role={step.action ? 'button' : undefined}
            tabIndex={step.action ? 0 : undefined}
            onKeyDown={step.action ? (e: React.KeyboardEvent) => { if (e.key === 'Enter') onNavigate(step.action!); } : undefined}
          >
            <span className="material-symbols-outlined gch-step__icon" aria-hidden="true">
              {step.icon}
            </span>
            <span className="gch-step__text">
              <span className="gch-step__label">{step.label}</span>
              {step.note && <span className="gch-step__note">{step.note}</span>}
            </span>
            {step.gated && (
              <span className="material-symbols-outlined gch-step__lock" aria-label={t('globalcreatehub:requiresValidity')}>
                lock
              </span>
            )}
          </li>
        ))}
      </ul>

      {/* Ads-specific multi-world targeting note */}
      {type.id === 'ads' && (
        <p className="gch-panel__ads-note">
          <span className="material-symbols-outlined" aria-hidden="true" style={{ fontSize: '0.9rem', verticalAlign: 'middle' }}>info</span>
          &nbsp;{t('messages.adsNote')}
          <br />
          <span className="gch-panel__worlds-chips">
            {Object.entries(LOCKED_WORLDS).map(([key, label]) => (
              <span key={key} className="gch-panel__world-chip">{label}</span>
            ))}
          </span>
        </p>
      )}

      <p className="gch-panel__coming-soon">{t('messages.comingSoon')}</p>
    </div>
  );
}

// ─── CreateCard ──────────────────────────────────────────────────────────────

function CreateCard({
  type,
  isSelected,
  isSuggested,
  onSelect,
  onNavigate,
  t,
  sessionWorlds,
}: {
  type: CreateType;
  isSelected: boolean;
  isSuggested: boolean;
  onSelect: (id: CreateTypeId) => void;
  onNavigate: (path: string) => void;
  t: TFunction;
  sessionWorlds: { key: string; label: string; note: string }[];
}) {
  return (
    <div
      className={[
        'gch-card',
        isSelected  ? 'gch-card--open'     : '',
        isSuggested ? 'gch-card--suggested' : '',
      ].filter(Boolean).join(' ')}
      style={{ '--card-accent': type.accentVar } as React.CSSProperties}
    >
      <button
        className="gch-card__trigger"
        onClick={() => onSelect(type.id)}
        aria-expanded={isSelected}
        aria-label={type.label}
      >
        <span className="gch-card__icon-wrap" aria-hidden="true">
          <span className="material-symbols-outlined gch-card__icon">{type.icon}</span>
        </span>

        <span className="gch-card__body">
          <span className="gch-card__label">{type.label}</span>
          <span className="gch-card__tagline">{type.tagline}</span>
        </span>

        {isSuggested && !isSelected && (
          <span className="gch-card__badge" aria-label={t('badges.suggested')}>{t('badges.suggested')}</span>
        )}

        <span className="material-symbols-outlined gch-card__chevron" aria-hidden="true">
          {isSelected ? 'expand_less' : 'expand_more'}
        </span>
      </button>

      {isSelected && <ActionPanel type={type} onNavigate={onNavigate} t={t} sessionWorlds={sessionWorlds} />}
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export function GlobalCreateHubPage() {
  const { world } = useWorldNav();
  const navigate = useNavigate();
  const { t } = useTranslation('createHub');
  const [openId, setOpenId] = useState<CreateTypeId | null>(null);

  const toggle = (id: CreateTypeId) =>
    setOpenId((prev) => (prev === id ? null : id));

  const suggestions = WORLD_SUGGESTIONS[world] ?? [];

  const createTypes = useMemo(() => getCreateTypes(t), [t]);
  const groups = useMemo(() => getGroups(t), [t]);
  const sessionWorlds = useMemo(() => getSessionWorlds(t), [t]);

  const typeMap = Object.fromEntries(createTypes.map((tItem) => [tItem.id, tItem])) as Record<CreateTypeId, CreateType>;

  return (
    <main className="page gch-page">

      <header className="gch-header">
        <h1 className="gch-header__title">{t('header.title')}</h1>
        <p className="gch-header__subtitle">{t('header.subtitle')}</p>
        <div className="gch-header__world-pill" aria-live="polite">
          <span className="material-symbols-outlined gch-header__world-icon" aria-hidden="true">public</span>
          {t('header.currentWorld')}&nbsp;
          <strong
            className="gch-header__world-name"
            style={{ color: `var(--color-world-${world})` }}
          >
            {LOCKED_WORLDS[world]}
          </strong>
          &nbsp;{t('header.suggestedOnly')}
        </div>
      </header>

      <div className="gch-sections">
        {groups.map((group) => (
          <section key={group.heading} className="gch-section">
            <h2 className="gch-section__heading">{group.heading}</h2>
            <div className="gch-grid">
              {group.ids.map((id) => {
                const type = typeMap[id];
                return (
                  <CreateCard
                    key={id}
                    type={type}
                    isSelected={openId === id}
                    isSuggested={suggestions.includes(id)}
                    onSelect={toggle}
                    onNavigate={navigate}
                    t={t}
                    sessionWorlds={sessionWorlds}
                  />
                );
              })}
            </div>
          </section>
        ))}
      </div>

      <p className="gch-phase-note text-muted">
        {t('messages.phaseNote')}
      </p>
    </main>
  );
}
