/**
 * Sound Platform — Username Normalization & Index Types
 * ======================================================
 * Phase:   7.1 (Username-Aware Profile Links)
 * Created: 2026-05-27
 *
 * NORMALIZATION RULES:
 *   1. Trim whitespace.
 *   2. Remove leading '@' (users may copy-paste @handle links).
 *   3. Lowercase.
 *   4. Replace spaces with '_'.
 *   5. Keep only [a-z0-9_].
 *   6. Collapse consecutive '_' to a single '_'.
 *   7. Remove leading/trailing '_'.
 *   8. Return null if the result is empty.
 *
 * CONSISTENCY:
 *   These rules match EditProfilePage's inline normalizer:
 *     e.target.value.replace(/\s/g, '_').toLowerCase()
 *   plus additional safety (strip @, remove invalid chars, collapse _).
 *
 * USAGE:
 *   - Cloud Functions: normalize before indexing / looking up.
 *   - Client: normalize route params before sending to callable.
 *
 * FIRESTORE COLLECTION:
 *   usernames/{normalizedUsername}  →  UsernameDoc
 *   - Read:  any authenticated user (availability check, profile resolution).
 *   - Write: Cloud Function only (Admin SDK).
 */

// ─── Username Normalization ───────────────────────────────────────────────────

/**
 * normalizeUsername — produces the canonical index key for a username.
 *
 * @param raw  The raw input string (route param, form input, or stored value).
 * @returns    The normalized key, or null if the input is empty/invalid.
 *
 * Examples:
 *   normalizeUsername('@Akram_NCbI2J')  → 'akram_ncbi2j'
 *   normalizeUsername('  user name  ')  → 'user_name'
 *   normalizeUsername('___')            → null
 *   normalizeUsername('')               → null
 *   normalizeUsername('@')              → null
 */
export function normalizeUsername(raw: string): string | null {
  if (!raw) return null;

  const normalized = raw
    .trim()
    .replace(/^@+/, '')        // strip leading @
    .toLowerCase()
    .replace(/\s+/g, '_')      // spaces → underscore
    .replace(/[^a-z0-9_]/g, '') // keep only allowed chars
    .replace(/_+/g, '_')       // collapse consecutive _
    .replace(/^_|_$/g, '');    // trim leading/trailing _

  return normalized.length > 0 ? normalized : null;
}

// ─── UsernameDoc (usernames/{normalizedUsername}) ──────────────────────────────

/**
 * UsernameDoc — the document stored at usernames/{normalizedUsername}.
 *
 * Maps a normalized username to its owning Firebase UID.
 * Used by getProfileForViewer for username → UID resolution.
 *
 * WRITES:
 *   - onUserCreate:          creates the initial doc in the atomic batch.
 *   - onUserProfileUpdate:   syncs when users/{uid}.username changes.
 *   - backfillUsernames.ts:  one-time migration for existing users.
 *
 * READS:
 *   - getProfileForViewer:   resolves username → uid for profile lookup.
 *   - Client (future):       username availability check on edit.
 */
export interface UsernameDoc {
  /** Firebase UID of the user who owns this username */
  uid: string;
  /** Original username as stored in users/{uid}.username (may have mixed case) */
  username: string;
  /** Normalized username — matches the document ID */
  normalizedUsername: string;
  /** ISO timestamp — when this index entry was first created */
  createdAt: string;
  /** ISO timestamp — when this index entry was last updated */
  updatedAt: string;
}
