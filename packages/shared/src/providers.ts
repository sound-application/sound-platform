/**
 * Sound Platform — Provider Registry Types
 * ==========================================
 * Phase:   8-H.0 (Provider Registry Foundation)
 * Created: 2026-05-29
 *
 * Shared types for the backend provider registry.
 * Any provider-dependent feature (transcription, AI cover, moderation, etc.)
 * goes through the provider registry instead of hardcoding provider logic.
 *
 * SECURITY:
 *   - No secret values (API keys, tokens) in these types or Firestore docs.
 *   - Only secret *names* (env var names) are stored for the resolver to check.
 *   - Actual secrets live in Cloud Functions environment variables or Secret Manager.
 */

// ─── Feature IDs ─────────────────────────────────────────────────────────────
//
// Each provider-dependent feature has a unique dot-namespaced ID.
// Used as the document ID in providerConfigs/{featureId}.
//

export type ProviderFeatureId =
  | 'audio.transcription'
  | 'ai.cover'
  | 'ai.script'
  | 'content.moderation'
  | 'search.indexing'
  | 'notifications.push'
  | 'payments.primary'
  | 'maps.geocoding'
  | 'live.rtc';

/** All known feature IDs for iteration/validation */
export const PROVIDER_FEATURE_IDS: ProviderFeatureId[] = [
  'audio.transcription',
  'ai.cover',
  'ai.script',
  'content.moderation',
  'search.indexing',
  'notifications.push',
  'payments.primary',
  'maps.geocoding',
  'live.rtc',
];

// ─── Provider Config Status ──────────────────────────────────────────────────

export type ProviderConfigStatus =
  | 'configured'      // provider is fully configured and ready
  | 'disabled'        // explicitly disabled by admin
  | 'missingSecrets'  // required env vars / secrets not found
  | 'missingConfig'   // providerConfigs document does not exist
  | 'providerError';  // provider exists but last check failed

// ─── Provider Entry ──────────────────────────────────────────────────────────
//
// Describes a single provider option for a feature.
// A feature may have a primary and multiple fallback providers.
//

export interface ProviderEntry {
  /** Provider identifier (e.g. 'google-stt', 'openai-whisper', 'stripe') */
  providerId: string;

  /** Human-readable label */
  label: string;

  /**
   * Environment variable names that must be set for this provider to work.
   * The resolver checks process.env for these — never stores actual values.
   */
  requiredSecrets: string[];

  /**
   * Optional environment variable names for enhanced functionality.
   * Provider still works without these, but with reduced features.
   */
  optionalSecrets?: string[];
}

// ─── Provider Config Document ────────────────────────────────────────────────
//
// Stored in: providerConfigs/{featureId}
//
// Contains metadata only — NO secret values.
// Cloud Functions resolver reads this + checks process.env for secrets.
//

export interface ProviderConfigDoc {
  /** Feature ID (matches Firestore doc ID) */
  featureId: ProviderFeatureId;

  /** Whether this feature is enabled */
  enabled: boolean;

  /** Primary provider for this feature */
  primaryProvider: ProviderEntry;

  /** Ordered fallback providers (tried if primary is missing secrets) */
  fallbackProviders: ProviderEntry[];

  /** Current computed status */
  status: ProviderConfigStatus;

  /** ISO timestamp — last time config was updated */
  updatedAt: string;

  /** UID or identifier of who last updated */
  updatedBy: string;

  /** ISO timestamp — last time resolver checked this config */
  lastCheckedAt?: string;

  /** Last error code from provider check (e.g. 'SECRET_MISSING') */
  lastErrorCode?: string;

  /** Last error message from provider check (safe, no secrets) */
  lastErrorMessage?: string;

  /** Admin notes about this provider config */
  notes?: string;
}

// ─── Resolver Result ─────────────────────────────────────────────────────────
//
// Returned by resolveProvider() — tells the caller whether a provider
// is available and which one to use.
//

export interface ProviderResolveResult {
  /** Whether a usable provider was found */
  available: boolean;

  /** Status of the resolution */
  status: ProviderConfigStatus;

  /** The selected provider (if available) */
  selectedProvider?: ProviderEntry;

  /** Whether this is a fallback provider (not primary) */
  isFallback: boolean;

  /** Feature ID that was resolved */
  featureId: ProviderFeatureId;

  /** Machine-readable error code for callers */
  errorCode?: string;

  /** Human-readable safe error message */
  errorMessage?: string;
}

// ─── Error Codes ─────────────────────────────────────────────────────────────
//
// Standardized error codes for provider resolution failures.
// Used in captionsProcessing.errorCode and similar fields.
//

export const PROVIDER_ERROR_CODES = {
  CONFIG_MISSING: 'PROVIDER_CONFIG_MISSING',
  DISABLED: 'PROVIDER_DISABLED',
  SECRET_MISSING: 'PROVIDER_SECRET_MISSING',
  PROVIDER_ERROR: 'PROVIDER_ERROR',
} as const;

export type ProviderErrorCode = typeof PROVIDER_ERROR_CODES[keyof typeof PROVIDER_ERROR_CODES];
