/**
 * Sound Platform — Locked Product Labels
 *
 * These are brand-identity strings that define the product's navigation
 * and world structure. They are IMMUTABLE:
 *
 *   - Must NOT be sourced from Firestore, admin overrides, or runtime config.
 *   - Must NOT be translated, swapped, or aliased in any UI layer.
 *   - Must NOT be replaced by entries in FORBIDDEN_NAV_SUBSTITUTES.
 *
 * Any admin configurability system (fonts, colors, system text, i18n) must
 * explicitly exclude these keys from its override surface.
 *
 * See: admin_configurability_plan.md
 */

// ─── Bottom Navigation (5 locked tabs) ───────────────────────────────────────
export const LOCKED_NAV = {
  home:     'الرئيسية',
  discover: 'اكتشف',
  create:   'إنشاء',
  live:     'لايف',
  profile:  'أنا',
} as const;

export type LockedNavKey = keyof typeof LOCKED_NAV;

// ─── World Navigation (5 locked worlds, locked order) ────────────────────────
export const LOCKED_WORLDS = {
  general:     'عام',
  plus:        'بلس',
  music:       'موسيقى',
  radio:       'راديو',
  tournaments: 'مسابقات',
} as const;

export type LockedWorldKey = keyof typeof LOCKED_WORLDS;

/**
 * Locked world order — used by AppHeader WorldNav strip.
 * Do not reorder. Do not add مباشر or بطولات.
 */
export const WORLD_ORDER: LockedWorldKey[] = [
  'general',
  'plus',
  'music',
  'radio',
  'tournaments',
];

// ─── Forbidden Nav Substitutes ────────────────────────────────────────────────
/**
 * These terms must never appear in UI as label substitutes for any
 * LOCKED_NAV or LOCKED_WORLDS entry.
 *
 *   مباشر  → forbidden substitute for 'لايف'
 *   بطولات → forbidden substitute for 'مسابقات'
 *   Plus   → forbidden substitute for 'بلس'
 *   استكشاف→ forbidden substitute for 'اكتشف'
 *   بث     → forbidden standalone substitute for 'لايف' feature label
 *
 * Note: جلسة is a normal Arabic word and is NOT forbidden.
 * "جلسة لايف" (a live session) is a valid descriptive phrase.
 * Only مباشر as a nav/product label substitute is forbidden.
 */
export const FORBIDDEN_NAV_SUBSTITUTES = [
  'مباشر',
  'بطولات',
  'Plus',
  'استكشاف',
] as const;

export type ForbiddenSubstitute = typeof FORBIDDEN_NAV_SUBSTITUTES[number];
