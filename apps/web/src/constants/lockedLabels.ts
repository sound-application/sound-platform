import i18n from '../i18n';
const tWrapper = (key: any, options?: any) => i18n.t(key, options) as any as string;
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
  home:     tWrapper('lockedlabels:home'),
  discover: tWrapper('lockedlabels:findOut'),
  create:   tWrapper('lockedlabels:construction'),
  live:     tWrapper('lockedlabels:live'),
  profile:  tWrapper('lockedlabels:i'),
} as const;

export const LOCKED_WORLDS = {
  general:     tWrapper('lockedlabels:general'),
  plus:        tWrapper('lockedlabels:plus'),
  music:       tWrapper('lockedlabels:music'),
  radio:       tWrapper('lockedlabels:radio'),
  tournaments: tWrapper('lockedlabels:contests'),
} as const;

// ─── Forbidden Nav Substitutes ────────────────────────────────────────────────
export const FORBIDDEN_NAV_SUBSTITUTES = [
  tWrapper('lockedlabels:direct'),
  tWrapper('lockedlabels:championships'),
  'Plus',
  tWrapper('lockedlabels:exploration'),
] as const;

export type ForbiddenSubstitute = typeof FORBIDDEN_NAV_SUBSTITUTES[number];
