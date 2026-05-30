/**
 * Sound Platform — Locked Product Labels (i18n)
 *
 * These are brand-identity strings that define the product's navigation
 * and world structure. They are translated per language via i18n.
 *
 * The key structure (home, discover, general, plus, etc.) is immutable.
 * Only the display labels change per language.
 */

// ─── Bottom Navigation (5 locked tabs) ───────────────────────────────────────
/** Translation keys for bottom nav — consumers use t(`common:nav.${key}`) */
export const LOCKED_NAV_KEYS = {
  home:     'nav.home',
  discover: 'nav.discover',
  create:   'nav.create',
  live:     'nav.live',
  profile:  'nav.profile',
} as const;

export type LockedNavKey = keyof typeof LOCKED_NAV_KEYS;

// ─── World Navigation (5 locked worlds, locked order) ────────────────────────
/** Translation keys for world tabs — consumers use t(`common:worlds.${key}`) */
export const LOCKED_WORLD_KEYS = {
  general:     'worlds.general',
  plus:        'worlds.plus',
  music:       'worlds.music',
  radio:       'worlds.radio',
  tournaments: 'worlds.tournaments',
} as const;

export type LockedWorldKey = keyof typeof LOCKED_WORLD_KEYS;

/**
 * Locked world order — used by AppHeader WorldNav strip.
 * Do not reorder.
 */
export const WORLD_ORDER: LockedWorldKey[] = [
  'general',
  'plus',
  'music',
  'radio',
  'tournaments',
];

// ─── Backward compatibility ──────────────────────────────────────────────────
// Legacy exports for files not yet migrated to useTranslation.
// These return Arabic fallback values only. Migrate consumers to use t() instead.
export const LOCKED_NAV = {
  home:     'الرئيسية',
  discover: 'اكتشف',
  create:   'إنشاء',
  live:     'لايف',
  profile:  'أنا',
} as const;

export const LOCKED_WORLDS = {
  general:     'عام',
  plus:        'بلس',
  music:       'موسيقى',
  radio:       'راديو',
  tournaments: 'مسابقات',
} as const;

// ─── Forbidden Nav Substitutes ────────────────────────────────────────────────
export const FORBIDDEN_NAV_SUBSTITUTES = [
  'مباشر',
  'بطولات',
  'Plus',
  'استكشاف',
] as const;

export type ForbiddenSubstitute = typeof FORBIDDEN_NAV_SUBSTITUTES[number];
