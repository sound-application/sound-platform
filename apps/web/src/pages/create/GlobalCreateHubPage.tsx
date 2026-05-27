/**
 * Sound Platform — Global Create Hub
 * Phase: 5-E rev 4
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

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWorldNav } from '../../contexts/WorldNavContext';
import { LOCKED_WORLDS, type LockedWorldKey } from '../../constants/lockedLabels';
import '../Page.css';
import './GlobalCreateHubPage.css';

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

/** worlds allowed as On Road / Session targets — راديو and مسابقات excluded */
const SESSION_WORLDS: { key: string; label: string; note: string }[] = [
  { key: 'general',  label: 'عام',     note: 'جلسة عامة مفتوحة للجميع' },
  { key: 'plus',     label: 'بلس',     note: 'جلسة حصرية لمشتركي بلس' },
  { key: 'music',    label: 'موسيقى',  note: 'جلسة موسيقية مع محتوى صوتي' },
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

// ─── World accents ──────────────────────────────────────────────────────────

const W: Record<LockedWorldKey, string> = {
  general:     'var(--color-world-general)',
  plus:        'var(--color-world-plus)',
  music:       'var(--color-world-music)',
  radio:       'var(--color-world-radio)',
  tournaments: 'var(--color-world-tournaments)',
};

// ─── Action definitions ─────────────────────────────────────────────────────

const CREATE_TYPES: CreateType[] = [
  // ── Creation tools ──────────────────────────────────────────────────────
  {
    id: 'upload',
    icon: 'upload_file',
    label: 'رفع ملف',
    tagline: 'ارفع ملفاً صوتياً — حدد النوع أولاً',
    accentVar: W.general,
    panelHeading: 'ما نوع المحتوى؟',
    steps: [
      { icon: 'record_voice_over', label: 'صوت عام',          note: 'بودكاست، قراءة، حديث', action: '/create/audio?source=upload' },
      { icon: 'workspace_premium', label: 'محتوى بلس',        note: 'محتوى حصري للمشتركين', action: '/create/audio?source=upload' },
      { icon: 'music_note',        label: 'موسيقى / أغنية',   note: 'يفتح تدفق الحقوق والنشر الموسيقي' },
    ],
  },
  {
    id: 'record',
    icon: 'mic',
    label: 'تسجيل صوت',
    tagline: 'سجّل مباشرة من الميكروفون',
    accentVar: W.general,
    panelHeading: 'وجهة التسجيل',
    steps: [
      { icon: 'public',            label: 'صوت عام',          note: 'ينشر في عالم عام', action: '/create/audio?source=record' },
      { icon: 'workspace_premium', label: 'محتوى بلس',        note: 'ينشر حصرياً لمشتركي بلس', action: '/create/audio?source=record' },
    ],
  },
  {
    id: 'live',
    icon: 'sensors',
    label: 'لايف',
    tagline: 'ابدأ جلسة بث مباشر — اختر نوع اللايف',
    accentVar: W.general,
    panelHeading: 'نوع اللايف',
    steps: [
      { icon: 'public',       label: 'عام لايف',        note: 'جلسة مفتوحة في عالم عام' },
      { icon: 'star',         label: 'بلس لايف',        note: 'جلسة حصرية لمشتركي بلس' },
      { icon: 'music_note',   label: 'موسيقى لايف',     note: 'فعالية موسيقية أو حفلة' },
      { icon: 'emoji_events', label: 'مسابقات لايف',    note: 'فعالية مسابقة أو تصويت' },
    ],
  },
  {
    id: 'short',
    icon: 'slow_motion_video',
    label: 'شورت / مقطع قصير',
    tagline: 'مقطع قصير للاكتشاف — ليس قصة ولا منشوراً',
    accentVar: W.general,
    panelHeading: 'إعدادات الشورت',
    steps: [
      { icon: 'video_file',    label: 'تحميل مقطع',       note: 'رفع مقطع صوتي / مرئي قصير' },
      { icon: 'mic',           label: 'تسجيل مقطع',       note: 'تسجيل مباشر من الجهاز' },
      { icon: 'auto_awesome',  label: 'إضافة التأثيرات',  note: 'موسيقى خلفية، تأثيرات صوتية' },
      { icon: 'tag',           label: 'الوسوم والاكتشاف', note: 'تحديد الجمهور والتصنيف' },
    ],
  },
  // ── On Road / Sessions ─────────────────────────────────────────────────────
  // SRS §20: world selection (عام | بلس | موسيقى ONLY) must come before session config.
  // راديو and مسابقات are NOT valid On Road target worlds.
  // Permission gate: visible in UI Foundation Mode with lock reason.
  {
    id: 'sessions',
    icon: 'route',
    label: 'الرحلات / الجلسات',
    tagline: 'ابدأ جلسة On Road — اختر العالم أولاً',
    accentVar: W.general,
    panelHeading: 'اختر عالم الجلسة',
    gateNote: 'الرحلات / الجلسات — يتطلب صلاحية أو تفعيل الوحدة. مرئي في وضع تأسيس الواجهة.',
    steps: [
      // Steps shown AFTER world selection
      { icon: 'description',   label: 'تفاصيل الجلسة',          note: 'العنوان والوصف والتصنيف' },
      { icon: 'tune',          label: 'نوع الجلسة',              note: 'مفتوحة، مغلقة، أو على الطريق' },
      { icon: 'lock_person',   label: 'الخصوصية والجمهور',       note: 'من يرى هذه الجلسة؟' },
      { icon: 'location_on',   label: 'الموقع / المسار إن وجد',  note: 'إضافة مسار جغرافي اختياري' },
      { icon: 'play_circle',   label: 'بدء أو جدولة',            note: 'ابدأ الآن أو حدد موعداً لاحقاً' },
    ],
  },
  // ── Specialised worlds ───────────────────────────────────────────────────
  {
    id: 'music',
    icon: 'library_music',
    label: 'موسيقى',
    tagline: 'أطلق موسيقاك — حدد نوع الإصدار',
    accentVar: W.music,
    panelHeading: 'نوع الإصدار الموسيقي',
    steps: [
      { icon: 'music_note',  label: 'أغنية',              note: 'إصدار مقطوعة واحدة' },
      { icon: 'album',       label: 'ألبوم',              note: 'إصدار مجموعة مقطوعات' },
      { icon: 'person_pin',  label: 'فنان / مشاركون',    note: 'إدارة الفنانين والمساهمين' },
      { icon: 'gavel',       label: 'شركة إنتاج / حقوق', note: 'تدفق الحقوق والنشر الموسيقي', gated: true },
    ],
  },
  {
    id: 'radio',
    icon: 'radio',
    label: 'راديو',
    tagline: 'إنشاء إذاعة يتطلب صلاحية أو حزمة',
    accentVar: W.radio,
    panelHeading: 'طلبات راديو',
    gateNote: 'راديو مغلق — يتطلب موافقة إدارية أو حزمة مؤهِّلة',
    steps: [
      { icon: 'add_business',    label: 'طلب إنشاء إذاعة',           note: 'قدِّم طلباً لفتح محطتك', gated: true },
      { icon: 'verified_user',   label: 'طلب صلاحية محطة',           note: 'رفع وثائق التأهيل', gated: true },
      { icon: 'support_agent',   label: 'طلب برنامج / تواصل مع محطة', note: 'تقديم عرض برنامج لمحطة قائمة' },
    ],
  },
  {
    id: 'competition',
    icon: 'emoji_events',
    label: 'مسابقة',
    tagline: 'أنشئ مسابقة صوتية في عالم مسابقات',
    accentVar: W.tournaments,
    panelHeading: 'خطوات إنشاء المسابقة',
    steps: [
      { icon: 'add_circle',   label: 'إنشاء مسابقة',          note: 'اضبط العنوان والقواعد' },
      { icon: 'how_to_reg',   label: 'فتح التسجيل',            note: 'استقبال طلبات المشاركة' },
      { icon: 'how_to_vote',  label: 'إعداد التصويت',          note: 'ضبط آلية التصويت والمراحل' },
      { icon: 'group',        label: 'دعوة لجنة / مشاركين',   note: 'إضافة محكمين ومشاركين' },
    ],
  },
  // ── Promotion ────────────────────────────────────────────────────────────
  {
    id: 'ads',
    icon: 'campaign',
    label: 'إعلان / ترويج',
    tagline: 'أعدّ حملتك — ستختار عوالم الاستهداف لاحقاً',
    accentVar: W.general,
    panelHeading: 'خطوات إعداد الحملة',
    steps: [
      { icon: 'edit_note',       label: 'عنوان الحملة والهدف',              note: 'ما الذي تريد الترويج له؟' },
      { icon: 'category',        label: 'نوع الإعلان',                       note: 'صوتي، مرئي، ترويج منشور' },
      { icon: 'language',        label: 'عوالم الاستهداف (متعدد)',          note: 'اختر أكثر من عالم عند إعداد الحملة' },
      { icon: 'payments',        label: 'الميزانية والجدول الزمني',         note: 'حدد المبلغ والفترة الزمنية' },
    ],
  },
  // ── Social / Identity layer ──────────────────────────────────────────────
  {
    id: 'story',
    icon: 'auto_stories',
    label: 'قصة',
    tagline: 'قصة تختفي بعد 24 ساعة — لا ترتبط بعالم',
    accentVar: W.general,
    panelHeading: 'إعدادات القصة',
    steps: [
      { icon: 'image',         label: 'صورة أو مقطع',          note: 'محتوى مرئي للقصة' },
      { icon: 'mic',           label: 'صوت / ملاحظة صوتية',    note: 'تسجيل صوتي مرفق' },
      { icon: 'lock_person',   label: 'جمهور القصة',            note: 'من يرى هذه القصة؟' },
    ],
  },
  {
    id: 'status',
    icon: 'edit_square',
    label: 'تحديث الحالة',
    tagline: 'حدّث حالتك على ملفك الشخصي — عالمك هويتك',
    accentVar: W.general,
    panelHeading: 'نوع الحالة',
    steps: [
      { icon: 'mood',          label: 'حالة نصية',             note: 'ما الذي يدور في ذهنك؟' },
      { icon: 'music_note',    label: 'حالة موسيقية',          note: 'أغنية تعبّر عن حالتك' },
      { icon: 'timer',         label: 'مدة الحالة',            note: 'ساعة، يوم، حتى تُحذف' },
    ],
  },
  {
    id: 'listening',
    icon: 'headphones',
    label: 'ماذا تستمع الآن',
    tagline: 'شارك ما تستمع إليه — هوية اجتماعية عالمية',
    accentVar: W.music,
    panelHeading: 'مشاركة الاستماع',
    steps: [
      { icon: 'search',        label: 'ابحث عن تسجيل',         note: 'صوت، أغنية، بودكاست...' },
      { icon: 'share',         label: 'شارك على ملفك',         note: 'يظهر لمتابعيك فوراً' },
      { icon: 'person_add',    label: 'دعوة للاستماع المشترك', note: 'شارك صديقاً في الجلسة' },
    ],
  },
];

// ─── Group metadata ─────────────────────────────────────────────────────────
// Visual section dividers in the grid

const GROUPS: { heading: string; ids: CreateTypeId[] }[] = [
  { heading: 'أدوات الإنشاء',     ids: ['upload', 'record', 'live', 'short', 'sessions'] },
  { heading: 'عوالم متخصصة',      ids: ['music', 'radio', 'competition'] },
  { heading: 'ترويج',              ids: ['ads'] },
  { heading: 'هوية اجتماعية',     ids: ['story', 'status', 'listening'] },
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

function ActionPanel({ type, onNavigate }: { type: CreateType; onNavigate: (path: string) => void }) {
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
          <ul className="gch-panel__steps gch-sessions-worlds" role="list" aria-label="اختر عالم الجلسة">
            {SESSION_WORLDS.map((w) => (
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
            &nbsp;راديو ومسابقات ليسا وجهات صالحة لجلسات On Road.
          </p>
          <p className="gch-panel__heading" style={{ marginTop: '0.5rem' }}>خطوات الإعداد بعد اختيار العالم</p>
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
              <span className="material-symbols-outlined gch-step__lock" aria-label="يتطلب صلاحية">
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
          &nbsp;استهداف متعدد العوالم — يمكنك اختيار أكثر من عالم عند إعداد الحملة.
          <br />
          <span className="gch-panel__worlds-chips">
            {Object.entries(LOCKED_WORLDS).map(([key, label]) => (
              <span key={key} className="gch-panel__world-chip">{label}</span>
            ))}
          </span>
        </p>
      )}

      <p className="gch-panel__coming-soon">قريباً — يُفعَّل بعد نشر خدمات التحقق</p>
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
}: {
  type: CreateType;
  isSelected: boolean;
  isSuggested: boolean;
  onSelect: (id: CreateTypeId) => void;
  onNavigate: (path: string) => void;
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
          <span className="gch-card__badge" aria-label="مقترح حسب عالمك الحالي">مقترح</span>
        )}

        <span className="material-symbols-outlined gch-card__chevron" aria-hidden="true">
          {isSelected ? 'expand_less' : 'expand_more'}
        </span>
      </button>

      {isSelected && <ActionPanel type={type} onNavigate={onNavigate} />}
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export function GlobalCreateHubPage() {
  const { world } = useWorldNav();
  const navigate = useNavigate();
  const [openId, setOpenId] = useState<CreateTypeId | null>(null);

  const toggle = (id: CreateTypeId) =>
    setOpenId((prev) => (prev === id ? null : id));

  const suggestions = WORLD_SUGGESTIONS[world] ?? [];
  const typeMap = Object.fromEntries(CREATE_TYPES.map((t) => [t.id, t])) as Record<CreateTypeId, CreateType>;

  return (
    <main className="page gch-page" dir="rtl">

      <header className="gch-header">
        <h1 className="gch-header__title">إنشاء</h1>
        <p className="gch-header__subtitle">ماذا تريد أن تنشئ اليوم؟</p>
        <div className="gch-header__world-pill" aria-live="polite">
          <span className="material-symbols-outlined gch-header__world-icon" aria-hidden="true">public</span>
          عالمك الحالي:&nbsp;
          <strong
            className="gch-header__world-name"
            style={{ color: `var(--color-world-${world})` }}
          >
            {LOCKED_WORLDS[world]}
          </strong>
          &nbsp;— مقترح فقط، ليس إلزامياً
        </div>
      </header>

      <div className="gch-sections">
        {GROUPS.map((group) => (
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
                  />
                );
              })}
            </div>
          </section>
        ))}
      </div>

      <p className="gch-phase-note text-muted">
        🔒 جميع خيارات الإنشاء ستُفعَّل تدريجياً بعد نشر خدمات التحقق من الصلاحيات.
      </p>
    </main>
  );
}
