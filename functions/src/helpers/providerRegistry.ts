/**
 * Sound Platform — Provider Registry Resolver
 * ==============================================
 * Phase:   8-H.0 (Provider Registry Foundation)
 * Created: 2026-05-29
 *
 * Backend helper for resolving which provider to use for a given feature.
 * Reads providerConfigs/{featureId} from Firestore, then checks
 * process.env for required secrets.
 *
 * SECURITY:
 *   - Never returns or logs secret values.
 *   - Only checks whether env vars exist (truthy check), not their values.
 *   - Logs safe provider selection info for debugging.
 *
 * Usage:
 *   const result = await resolveProvider('audio.transcription');
 *   if (!result.available) {
 *     // handle: result.status, result.errorCode
 *   }
 */

import * as admin from 'firebase-admin';
import * as logger from 'firebase-functions/logger';
import type {
  ProviderFeatureId,
  ProviderConfigDoc,
  ProviderResolveResult,
  ProviderEntry,
} from '@sound/shared';
import { PROVIDER_ERROR_CODES } from '@sound/shared';

// ── Firestore reference ──────────────────────────────────────────────────────

const getConfigRef = (featureId: ProviderFeatureId) =>
  admin.firestore().collection('providerConfigs').doc(featureId);

// ── Secret checker ───────────────────────────────────────────────────────────

/**
 * Check if all required env vars for a provider are set.
 * Only checks existence (truthy), never reads or logs values.
 */
function hasRequiredSecrets(provider: ProviderEntry): boolean {
  for (const secretName of provider.requiredSecrets) {
    if (!process.env[secretName]) {
      return false;
    }
  }
  return true;
}

/**
 * Return the list of missing secret names for a provider.
 * Safe to log — these are env var names, not values.
 */
function getMissingSecrets(provider: ProviderEntry): string[] {
  return provider.requiredSecrets.filter(name => !process.env[name]);
}

// ── resolveProvider ──────────────────────────────────────────────────────────

/**
 * Resolve which provider to use for a given feature.
 *
 * Resolution order:
 * 1. Read providerConfigs/{featureId} from Firestore
 * 2. If document missing → missingConfig
 * 3. If disabled → disabled
 * 4. Check primary provider's required env vars
 * 5. If primary has all secrets → return primary
 * 6. Check fallback providers in order
 * 7. If any fallback has all secrets → return that fallback
 * 8. If none have secrets → missingSecrets
 *
 * @param featureId - The feature to resolve (e.g. 'audio.transcription')
 * @returns ProviderResolveResult
 */
export async function resolveProvider(
  featureId: ProviderFeatureId,
): Promise<ProviderResolveResult> {
  const tag = `[providerRegistry] ${featureId}`;

  try {
    // 1. Read config document
    const snap = await getConfigRef(featureId).get();

    if (!snap.exists) {
      logger.info(`${tag}: config document not found.`);
      return {
        available: false,
        status: 'missingConfig',
        isFallback: false,
        featureId,
        errorCode: PROVIDER_ERROR_CODES.CONFIG_MISSING,
        errorMessage: `No provider configuration found for ${featureId}.`,
      };
    }

    const config = snap.data() as ProviderConfigDoc;

    // 2. Check if disabled
    if (!config.enabled) {
      logger.info(`${tag}: feature disabled.`);

      // Update lastCheckedAt
      await snap.ref.update({
        lastCheckedAt: new Date().toISOString(),
        status: 'disabled',
      });

      return {
        available: false,
        status: 'disabled',
        isFallback: false,
        featureId,
        errorCode: PROVIDER_ERROR_CODES.DISABLED,
        errorMessage: `Feature ${featureId} is disabled.`,
      };
    }

    // 3. Check primary provider secrets
    const primary = config.primaryProvider;
    if (hasRequiredSecrets(primary)) {
      logger.info(`${tag}: primary provider ready.`, {
        providerId: primary.providerId,
      });

      // Update status to configured
      await snap.ref.update({
        lastCheckedAt: new Date().toISOString(),
        status: 'configured',
        lastErrorCode: admin.firestore.FieldValue.delete(),
        lastErrorMessage: admin.firestore.FieldValue.delete(),
      });

      return {
        available: true,
        status: 'configured',
        selectedProvider: primary,
        isFallback: false,
        featureId,
      };
    }

    const primaryMissing = getMissingSecrets(primary);
    logger.info(`${tag}: primary provider missing secrets.`, {
      providerId: primary.providerId,
      missingSecrets: primaryMissing,
    });

    // 4. Check fallback providers
    for (const fallback of config.fallbackProviders || []) {
      if (hasRequiredSecrets(fallback)) {
        logger.info(`${tag}: fallback provider ready.`, {
          providerId: fallback.providerId,
        });

        await snap.ref.update({
          lastCheckedAt: new Date().toISOString(),
          status: 'configured',
          lastErrorCode: admin.firestore.FieldValue.delete(),
          lastErrorMessage: admin.firestore.FieldValue.delete(),
        });

        return {
          available: true,
          status: 'configured',
          selectedProvider: fallback,
          isFallback: true,
          featureId,
        };
      }
    }

    // 5. No provider has required secrets
    const errorMessage =
      `No configured provider for ${featureId}. ` +
      `Primary (${primary.providerId}) missing: ${primaryMissing.join(', ')}.`;

    logger.warn(`${tag}: no provider has required secrets.`, {
      primaryMissing,
    });

    await snap.ref.update({
      lastCheckedAt: new Date().toISOString(),
      status: 'missingSecrets',
      lastErrorCode: PROVIDER_ERROR_CODES.SECRET_MISSING,
      lastErrorMessage: errorMessage,
    });

    return {
      available: false,
      status: 'missingSecrets',
      isFallback: false,
      featureId,
      errorCode: PROVIDER_ERROR_CODES.SECRET_MISSING,
      errorMessage,
    };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    logger.error(`${tag}: resolver error.`, { error: errorMessage.slice(0, 300) });

    return {
      available: false,
      status: 'providerError',
      isFallback: false,
      featureId,
      errorCode: PROVIDER_ERROR_CODES.PROVIDER_ERROR,
      errorMessage: `Provider resolution error: ${errorMessage.slice(0, 200)}`,
    };
  }
}

// ── assertProviderConfigured ─────────────────────────────────────────────────

/**
 * Convenience wrapper: resolves provider and throws if not available.
 * Use when a feature absolutely requires a provider to proceed.
 */
export async function assertProviderConfigured(
  featureId: ProviderFeatureId,
): Promise<ProviderResolveResult & { available: true }> {
  const result = await resolveProvider(featureId);

  if (!result.available) {
    throw new Error(
      `Provider not configured for ${featureId}: ${result.errorCode} — ${result.errorMessage}`,
    );
  }

  return result as ProviderResolveResult & { available: true };
}

// ── getProviderConfig ────────────────────────────────────────────────────────

/**
 * Read the raw provider config document without resolving secrets.
 * Returns null if document does not exist.
 */
export async function getProviderConfig(
  featureId: ProviderFeatureId,
): Promise<ProviderConfigDoc | null> {
  const snap = await getConfigRef(featureId).get();
  if (!snap.exists) return null;
  return snap.data() as ProviderConfigDoc;
}
