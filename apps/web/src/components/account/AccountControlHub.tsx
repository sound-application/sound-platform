/**
 * Sound Platform — Account Control Hub
 * Phase: 5-G (Privacy Foundation — UI-only inventory, 13 groups)
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

import React, { useEffect, useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signOut as firebaseSignOut } from 'firebase/auth';
import { useAuth } from '../../contexts/AuthContext';
import { useWorldNav } from '../../contexts/WorldNavContext';
import { LOCKED_WORLDS } from '../../constants/lockedLabels';
import { auth } from '../../lib/firebase';
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

// SCHEMA GAP: privacy settings are not yet in Firestore; these are UI-only defaults.
// Server-side enforcement comes later. The UI inventory must still be complete now.
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
  /** True for rows that are enforced server-side only — not editable from UI yet.
   *  Renders as a static info badge instead of selectable chips. */
  serverEnforced?: boolean;
}

interface PrivacyGroup {
  heading: string;
  rows: PrivacyRow[];
}

const AUDIENCE_OPTIONS: PrivacyOption[] = [
  { id: 'public', label: 'عام' },
  { id: 'followers', label: 'المتابعون' },
  { id: 'following', label: 'من أتابعهم' },
  { id: 'friends', label: 'الأصدقاء' },
  { id: 'specific-list', label: 'قائمة محددة' },
  { id: 'except-selected', label: 'قائمة / أصدقاء باستثناء' },
  { id: 'manual-selected', label: 'أشخاص محددون' },
  { id: 'only-me', label: 'أنا فقط' },
];

const CONTACT_OPTIONS: PrivacyOption[] = [
  { id: 'everyone', label: 'الجميع' },
  { id: 'followers', label: 'المتابعون' },
  { id: 'following', label: 'من أتابعهم' },
  { id: 'friends', label: 'الأصدقاء' },
  { id: 'off', label: 'إيقاف' },
];

const TOGGLE_OPTIONS: PrivacyOption[] = [
  { id: 'on', label: 'مفعل' },
  { id: 'off', label: 'متوقف' },
];

const APPROVAL_OPTIONS: PrivacyOption[] = [
  { id: 'auto', label: 'تلقائي' },
  { id: 'manual', label: 'موافقة يدوية' },
];

const LOCATION_OPTIONS: PrivacyOption[] = [
  { id: 'exact', label: 'دقيق' },
  { id: 'city', label: 'المدينة فقط' },
  { id: 'hidden', label: 'مخفي' },
];

const MANAGEMENT_OPTIONS: PrivacyOption[] = [
  { id: 'manage', label: 'إدارة' },
];

const SERVER_OPTIONS: PrivacyOption[] = [
  { id: 'server', label: 'تطبيق من الخادم' },
];

const PRIVACY_GROUPS: PrivacyGroup[] = [
  {
    heading: 'الملف والهوية',
    rows: [
      { id: 'profile-visibility', label: 'من يرى ملفي الشخصي', desc: 'الصورة والاسم والنبذة والبيانات الأساسية', value: 'public', options: AUDIENCE_OPTIONS },
      { id: 'profile-stats', label: 'إظهار الإحصائيات', desc: 'المتابعون والمتابعة والإعجابات والاستماعات', value: 'followers', options: AUDIENCE_OPTIONS },
      { id: 'social-links', label: 'الروابط الاجتماعية', desc: 'الروابط التي تظهر في الملف الشخصي', value: 'public', options: AUDIENCE_OPTIONS },
      { id: 'badges', label: 'الشارات والتحقق', desc: 'شارات التحقق والجوائز والإنجازات', value: 'public', options: AUDIENCE_OPTIONS },
    ],
  },
  {
    heading: 'القصص ودائرة الصورة',
    rows: [
      { id: 'stories-visibility', label: 'من يرى القصص', desc: 'القصص التي تظهر كدائرة حول صورة الملف', value: 'followers', options: AUDIENCE_OPTIONS },
      { id: 'story-ring', label: 'إظهار دائرة القصة', desc: 'إظهار وجود قصة نشطة حول صورة الملف الشخصي', value: 'followers', options: AUDIENCE_OPTIONS },
      { id: 'story-replies', label: 'الرد على القصص', desc: 'من يستطيع الرد أو التفاعل مع القصة', value: 'friends', options: CONTACT_OPTIONS },
    ],
  },
  {
    heading: 'الاستماع الآن',
    rows: [
      { id: 'listening-now', label: 'من يرى الاستماع الآن', desc: 'المحتوى الذي تستمع إليه حالياً وقد ينقل الزائر لعالمه', value: 'followers', options: AUDIENCE_OPTIONS },
      { id: 'listening-world-switch', label: 'السماح بالانتقال من الاستماع الآن', desc: 'إذا كان المحتوى في عالم آخر يمكن فتحه مباشرة', value: 'on', options: TOGGLE_OPTIONS },
    ],
  },
  {
    heading: 'مزاجي',
    rows: [
      { id: 'mood-visibility', label: 'من يرى مزاجي', desc: 'قوائمك المزاجية المبنية من محتوى الآخرين', value: 'followers', options: AUDIENCE_OPTIONS },
      { id: 'mood-source', label: 'ظهور مصدر المحتوى داخل مزاجي', desc: 'إظهار صاحب المحتوى الأصلي داخل قوائم مزاجي', value: 'on', options: TOGGLE_OPTIONS },
    ],
  },
  {
    heading: 'المحفوظات',
    rows: [
      { id: 'saved-visibility', label: 'من يرى المحفوظات', desc: 'المحتوى الذي حفظته للاستماع لاحقاً', value: 'only-me', options: AUDIENCE_OPTIONS },
      { id: 'saved-lists', label: 'قوائم المحفوظات', desc: 'قوائم محتوى الآخرين المحفوظة عندك', value: 'only-me', options: AUDIENCE_OPTIONS },
    ],
  },
  {
    heading: 'الإعادات',
    rows: [
      { id: 'reposts-visibility', label: 'من يرى الإعادات', desc: 'المحتوى الذي أعدت نشره أو مشاركته', value: 'public', options: AUDIENCE_OPTIONS },
    ],
  },
  {
    heading: 'الاشتراكات',
    rows: [
      { id: 'subscriptions-visibility', label: 'من يرى الاشتراكات', desc: 'المحتوى القادم من الحسابات التي تتابعها', value: 'followers', options: AUDIENCE_OPTIONS },
    ],
  },
  {
    heading: 'الرحلات / الجلسات',
    rows: [
      { id: 'sessions-visibility', label: 'من يرى الرحلات / الجلسات', desc: 'جلسات On Road والمسارات المرتبطة بها', value: 'friends', options: AUDIENCE_OPTIONS },
      { id: 'sessions-location', label: 'دقة الموقع داخل الرحلات', desc: 'هل يظهر الموقع بدقة أم كمدينة فقط أم يخفى', value: 'city', options: LOCATION_OPTIONS },
    ],
  },
  {
    heading: 'الرسائل والتواصل',
    rows: [
      { id: 'messages', label: 'من يستطيع مراسلتي', desc: 'الرسائل المباشرة وطلبات التواصل', value: 'followers', options: CONTACT_OPTIONS },
      { id: 'follow-requests', label: 'طلبات المتابعة', desc: 'الموافقة التلقائية أو اليدوية على المتابعة', value: 'auto', options: APPROVAL_OPTIONS },
      { id: 'group-invites', label: 'دعوات المجموعات', desc: 'من يستطيع دعوتك لمحادثة جماعية', value: 'friends', options: CONTACT_OPTIONS },
    ],
  },
  {
    heading: 'الهدايا والنقاط',
    rows: [
      { id: 'receive-gifts', label: 'استقبال الهدايا', desc: 'من يستطيع إرسال هدايا افتراضية لك', value: 'followers', options: CONTACT_OPTIONS },
      { id: 'receive-points', label: 'استقبال النقاط', desc: 'السماح باستقبال نقاط من أعضاء آخرين', value: 'followers', options: CONTACT_OPTIONS },
      { id: 'points-balance', label: 'إظهار رصيد النقاط', desc: 'إظهار رصيد نقاطك على الملف الشخصي', value: 'only-me', options: AUDIENCE_OPTIONS },
    ],
  },
  {
    heading: 'الظهور في اكتشف',
    rows: [
      { id: 'discover-profile', label: 'الظهور في اكتشف', desc: 'ظهور ملفك ومحتواك في توصيات اكتشف', value: 'on', options: TOGGLE_OPTIONS },
      { id: 'follow-suggestions', label: 'اقتراحات المتابعة', desc: 'ظهورك كاقتراح متابعة للمستخدمين', value: 'on', options: TOGGLE_OPTIONS },
    ],
  },
  {
    heading: 'الأطفال والوصي',
    rows: [
      {
        id: 'guardian-enforcement',
        label: 'تطبيق إعدادات الوصي',
        desc: 'إعدادات الطفل والوصي يطبقها الخادم — ليست إعداداً في الواجهة فقط',
        value: 'server',
        options: SERVER_OPTIONS,
        serverEnforced: true,
      },
      {
        id: 'child-stories',
        label: 'وصول الطفل للقصص',
        desc: 'القصص المتاحة للأطفال تخضع لمراجعة العمر وإعدادات الوصي من الخادم',
        value: 'server',
        options: SERVER_OPTIONS,
        serverEnforced: true,
      },
      {
        id: 'child-messages',
        label: 'رسائل وحسابات الأطفال',
        desc: 'المتابعة والرسائل والهدايا والمسابقات تخضع للوصي وتُطبَّق من الخادم',
        value: 'server',
        options: SERVER_OPTIONS,
        serverEnforced: true,
      },
    ],
  },
  {
    heading: 'الحظر والكتم',
    rows: [
      { id: 'blocked-accounts', label: 'الحسابات المحظورة', desc: 'المستخدمون الذين حظرتهم تماماً', value: 'manage', options: MANAGEMENT_OPTIONS },
      { id: 'muted-accounts', label: 'الحسابات المكتومة', desc: 'المستخدمون الذين كتمت محتواهم أو محتوى معين منهم', value: 'manage', options: MANAGEMENT_OPTIONS },
    ],
  },
];

// ═══ Privacy Center Panel ════════════════════════════════════════════════════

function PrivacyCenterPanel({ onBack }: { onBack: () => void }) {
  const [values, setValues] = useState<Record<string, string>>(() => {
    return PRIVACY_GROUPS.reduce<Record<string, string>>((acc, group) => {
      group.rows.forEach((row) => {
        acc[row.id] = row.value;
      });
      return acc;
    }, {});
  });

  const setPrivacyValue = (rowId: string, value: string) => {
    setValues((current) => ({ ...current, [rowId]: value }));
  };

  return (
    <div className="ach-privacy-panel" role="region" aria-label="مركز الخصوصية">
      {/* Header */}
      <div className="ach-privacy-panel__header">
        <button
          className="ach-privacy-panel__back"
          onClick={onBack}
          aria-label="العودة إلى قائمة الحساب"
          type="button"
        >
          <span className="material-symbols-outlined" aria-hidden="true">arrow_forward</span>
        </button>
        <div>
          <p className="ach-privacy-panel__title">مركز الخصوصية</p>
          <p className="ach-privacy-panel__subtitle">إعدادات أولية — الحفظ يتطلب اتصال الخادم</p>
        </div>
      </div>

      {/* Body */}
      <div className="ach-privacy-panel__body">
        {/* Foundation note */}
        <div className="ach-privacy-note">
          <span className="material-symbols-outlined" aria-hidden="true">info</span>
          <span>
            هذه إعدادات أولية — القيم المعروضة هي حالة مرجعية للواجهة.
            التحديثات الفعلية ستُحفظ في قاعدة البيانات بعد تفعيل مرحلة الخصوصية.
          </span>
        </div>

        {/* Privacy groups */}
        {PRIVACY_GROUPS.map((group) => (
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
                      <span className="ach-privacy-server-badge" aria-label="يطبقه الخادم">
                        <span className="material-symbols-outlined" aria-hidden="true">dns</span>
                        الخادم
                      </span>
                    </div>
                  );
                }

                return (
                  <div key={row.id} className="ach-privacy-row">
                    <div className="ach-privacy-row__text">
                      <span className="ach-privacy-row__label">{row.label}</span>
                      <span className="ach-privacy-row__desc">{row.desc}</span>
                      <div className="ach-privacy-row__options" aria-label={`${row.label} options`}>
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
  const sections: HubSection[] = [

    /* ── الحساب ─────────────────────────────────────────────────────────── */
    {
      heading: 'الحساب',
      items: [
        {
          icon: 'manage_accounts',
          label: 'تعديل الملف الشخصي',
          desc: 'الصورة والاسم والمعلومات الشخصية',
          route: '/settings/edit-profile',
        },
        {
          icon: 'settings',
          label: 'إعدادات الحساب',
          desc: 'البريد وكلمة المرور والإعدادات العامة',
          route: '/settings',
        },
        {
          icon: 'lock',
          label: 'الأمان وتسجيل الدخول',
          desc: 'الأجهزة النشطة والمصادقة الثنائية',
          soon: true,
        },
        {
          icon: 'language',
          label: 'اللغة والمنطقة',
          desc: 'العربية، المنطقة الزمنية',
          soon: true,
        },
        {
          icon: 'accessibility',
          label: 'إمكانية الوصول',
          desc: 'حجم النص والتباين والترجمة',
          soon: true,
        },
        {
          icon: 'logout',
          label: 'تسجيل الخروج',
          danger: true,
          onClick: handleSignOut,
        },
      ],
    },

    /* ── الخصوصية ───────────────────────────────────────────────────────── */
    {
      heading: 'الخصوصية',
      items: [
        {
          icon: 'shield',
          label: 'مركز الخصوصية',
          desc: 'عرض وتعديل كل إعدادات الخصوصية',
          onClick: () => setPrivacyOpen(true),
        },
        { icon: 'person_search', label: 'من يرى ملفي', soon: true },
        { icon: 'auto_stories', label: 'من يرى القصص', soon: true },
        { icon: 'hearing', label: 'من يرى حالة الاستماع الآن', soon: true },
        { icon: 'mood', label: 'من يرى مزاجي', soon: true },
        { icon: 'bookmarks', label: 'من يرى المحفوظات', soon: true },
        { icon: 'repeat', label: 'من يرى الإعادات', soon: true },
        { icon: 'subscriptions', label: 'من يرى الاشتراكات', soon: true },
        { icon: 'route', label: 'من يرى الرحلات / الجلسات', soon: true },
        { icon: 'bar_chart', label: 'إظهار / إخفاء الإحصائيات', soon: true },
        { icon: 'forum', label: 'الرسائل والتواصل', soon: true },
        { icon: 'redeem', label: 'الهدايا والنقاط', soon: true },
        { icon: 'explore', label: 'الظهور في اكتشف', soon: true },
        { icon: 'block', label: 'الحظر والكتم', soon: true },
      ],
    },

    /* ── النشاط والتواصل ─────────────────────────────────────────────────── */
    {
      heading: 'النشاط والتواصل',
      items: [
        { icon: 'inbox', label: 'الرسائل / الوارد', soon: true },
        { icon: 'notifications', label: 'الإشعارات', soon: true },
        { icon: 'comment', label: 'التعليقات والردود', soon: true },
        { icon: 'people', label: 'المتابعون والمتابعة', soon: true },
        { icon: 'flag', label: 'البلاغات التي أرسلتها', soon: true },
        { icon: 'person_off', label: 'المستخدمون المحظورون', soon: true },
      ],
    },

    /* ── الاشتراكات والمال ──────────────────────────────────────────────── */
    {
      heading: 'الاشتراكات والمال',
      items: [
        { icon: 'workspace_premium', label: 'الباقات والاشتراكات', soon: true },
        { icon: 'account_balance_wallet', label: 'المحفظة', soon: true },
        { icon: 'trending_up', label: 'الأرباح', soon: true },
        { icon: 'payments', label: 'السحب والمدفوعات', soon: true },
        { icon: 'redeem', label: 'الهدايا والنقاط', soon: true },
      ],
    },

    /* ── الإعلانات ──────────────────────────────────────────────────────── */
    {
      heading: 'الإعلانات',
      items: [
        { icon: 'campaign', label: 'إعلاناتي', soon: true },
        { icon: 'add_circle', label: 'إنشاء إعلان', soon: true },
        { icon: 'info', label: 'لماذا أرى هذا الإعلان', soon: true },
        { icon: 'report', label: 'بلاغات الإعلانات', soon: true },
      ],
    },

    /* ── الراديو ────────────────────────────────────────────────────────── */
    {
      heading: 'الراديو',
      items: [
        { icon: 'radio', label: 'طلبات الإذاعة', soon: true },
        { icon: 'broadcast_on_personal', label: 'إذاعتي', soon: true },
        { icon: 'contact_phone', label: 'تواصل المحطة', soon: true },
        { icon: 'ad_units', label: 'أعلن معنا', soon: true },
        { icon: 'mail', label: 'رسائل البرامج', soon: true },
      ],
    },

    /* ── الموسيقى والحقوق ───────────────────────────────────────────────── */
    {
      heading: 'الموسيقى والحقوق',
      items: [
        { icon: 'gavel', label: 'حقوق الموسيقى', soon: true },
        { icon: 'business', label: 'شركات الإنتاج', soon: true },
        { icon: 'group', label: 'الفنانين والمساهمين', soon: true },
        { icon: 'rate_review', label: 'مراجعات الحقوق', soon: true },
        { icon: 'verified', label: 'حالة الأهلية الموسيقية', soon: true },
      ],
    },

    /* ── المسابقات ──────────────────────────────────────────────────────── */
    {
      heading: 'المسابقات',
      items: [
        { icon: 'emoji_events', label: 'مسابقاتي', soon: true },
        { icon: 'lock_open', label: 'الدعوات / المسابقات المغلقة', soon: true },
        { icon: 'how_to_vote', label: 'التصويت والتحكيم', soon: true },
        { icon: 'military_tech', label: 'الجوائز / الميداليات', soon: true },
        { icon: 'assignment_turned_in', label: 'مشاركاتي', soon: true },
      ],
    },

    /* ── الدعم والثقة ───────────────────────────────────────────────────── */
    {
      heading: 'الدعم والثقة',
      items: [
        { icon: 'help', label: 'مركز المساعدة', soon: true },
        { icon: 'support_agent', label: 'تواصل مع الدعم', soon: true },
        { icon: 'receipt_long', label: 'التذاكر والاعتراضات', soon: true },
        { icon: 'bug_report', label: 'الإبلاغ عن مشكلة', soon: true },
        { icon: 'policy', label: 'شروط وسياسات', soon: true },
      ],
    },
  ];

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
          <span className="ach-item__badge-soon" aria-label="قريباً">قريباً</span>
        )}
        {!item.soon && !item.danger && (
          <span className="material-symbols-outlined ach-item__chevron" aria-hidden="true">
            chevron_left
          </span>
        )}
      </button>
    );
  };

  // ── World label ────────────────────────────────────────────────────────────
  const worldLabel = LOCKED_WORLDS[world as keyof typeof LOCKED_WORLDS] ?? world;

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
        aria-label="قائمة الحساب والتحكم"
      >
        {/* Sheet top header */}
        <div className="ach-sheet__header">
          <p className="ach-sheet__title">الحساب والإعدادات</p>
          <button
            className="ach-sheet__close"
            type="button"
            onClick={onClose}
            aria-label="إغلاق قائمة الحساب"
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
                  <img src={currentUser.photoURL} alt={currentUser.displayName ?? 'صورة'} />
                ) : (
                  <span className="ach-profile__avatar-initial">
                    {(currentUser?.displayName ?? currentUser?.email ?? 'م').charAt(0).toUpperCase()}
                  </span>
                )}
              </div>

              <div className="ach-profile__info">
                <p className="ach-profile__name">
                  {currentUser?.displayName ?? 'مستخدم Sound'}
                  {/* SCHEMA GAP: verification badge from publicProfiles */}
                  <span className="ach-profile__badge" aria-label="شارة التحقق">
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
                  aria-label="عرض ملفي الشخصي"
                >
                  عرض ملفي
                </button>
                <button
                  type="button"
                  className="ach-profile__btn ach-profile__btn--edit"
                  onClick={() => go('/settings/edit-profile')}
                  aria-label="تعديل الملف الشخصي"
                >
                  تعديل الملف
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
            <PrivacyCenterPanel onBack={() => setPrivacyOpen(false)} />
          )}

        </div>
      </div>
    </>
  );
}
