/**
 * Sound Platform — App Config Types
 * ===================================
 * Defines the runtime configuration models for world/feature toggles.
 */

import { type WorldId } from './permissions';

/**
 * World runtime configuration.
 * Collection: `worlds`
 * Document ID: e.g. "plus", "music"
 */
export interface WorldConfigDoc {
  /** The id of the world (matches document ID) */
  id: WorldId;
  /** Whether the world is visible and enabled */
  enabled: boolean;
  /** Optional reason explaining why it is disabled (admin override) */
  disabledReason?: string;
}

/**
 * Feature flag runtime configuration.
 * Collection: `featureFlags`
 * Document ID: e.g. "autocue", "mixing", "effects"
 */
export interface FeatureFlagDoc {
  /** The id of the feature (matches document ID) */
  id: string;
  /** Whether the feature is enabled */
  enabled: boolean;
}

// ─── Collection Names ────────────────────────────────────────────────────────
export const COL_WORLDS = 'worlds';
export const COL_FEATURE_FLAGS = 'featureFlags';
