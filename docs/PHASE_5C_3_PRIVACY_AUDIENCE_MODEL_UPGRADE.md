# Phase 5-C-3: Privacy Audience Model Upgrade

**Status:** ✅ Deployed  
**Date:** 2026-05-14  
**Live URL:** https://sound-platform-dev.web.app

---

## Summary

Upgraded the privacy configuration system from a single-choice 3-option model (`public` / `followers` / `private`) to a flexible **multi-select audience-based** configuration with 6 audience types.

---

## Changes

### 1. `packages/shared/src/profile.ts`

| Added | Description |
|-------|-------------|
| `PrivacyAudience` | Union type: `public \| friends \| followers \| following \| custom \| onlyMe` |
| `SectionPrivacy`  | Object: `{ audiences: PrivacyAudience[], customListIds?: string[] }` |
| `PrivacySettings` | Map of `PrivacySection → SectionPrivacy` (replaces old string map) |
| `migratePrivacyLevel()` | Normalizes old string values to `SectionPrivacy` on read (backward compat) |
| `isPubliclyVisible()` | Returns true if `audiences.includes('public')` |
| `PrivacyLevel` | Marked `@deprecated` — kept for migration reference only |

### 2. `functions/src/helpers/buildPublicProfile.ts`

- `isSectionPublic()` now calls `migratePrivacyLevel()` → `isPubliclyVisible()`
- Legacy string documents (`'public'` / `'followers'` / `'private'`) continue to work via on-the-fly migration
- No behavioral change for new documents using `audiences: ['public']`

### 3. `functions/src/triggers/onUserCreate.ts`

- `DEFAULT_PRIVACY` now uses `SectionPrivacy` object format
- `{ audiences: ['public'] }` replaces `'public'`
- `{ audiences: ['onlyMe'] }` replaces `'private'`
- `{ audiences: ['followers'] }` replaces `'followers'`

### 4. `apps/web/src/pages/PrivacySettingsPage.tsx`

- **Replaced** 3-way segmented control with multi-select **audience chip grid**
- 6 chips per section: عام / الأصدقاء / المتابعون / المتابَعون / قائمة مخصصة / أنا فقط
- **Exclusive chips** (`public`, `onlyMe`) clear all others on selection
- **Combinable chips** (`friends`, `followers`, `following`, `custom`) stack freely
- Section rows show:
  - **Projection dot** (green = public-visible / grey = hidden from public)
  - **Summary line** showing the current audience combination
  - **"دائماً عام"** badge for locked sections (generalProfile)
- Uses `migratePrivacyLevel()` when reading to handle legacy string values
- Writes `SectionPrivacy` objects to `users/{uid}.privacy.*`

### 5. `apps/web/src/pages/PrivacySettingsPage.css`

- New `.audience-chips` grid layout
- `.audience-chip` base + 6 color-coded active variants
- `.privacy-settings__projection-dot` indicator (green glow / grey)
- `.privacy-settings__section-summary` line
- `.privacy-settings__legend-badge` "حصري" label for exclusive audiences

---

## Audience Behavior Matrix

| Audience   | Exclusive | Public Projection? |
|------------|-----------|-------------------|
| `public`   | ✅ Yes    | ✅ Yes            |
| `friends`  | ❌ No     | ❌ No (Phase 5-D+)|
| `followers`| ❌ No     | ❌ No (Phase 5-D+)|
| `following`| ❌ No     | ❌ No (Phase 5-D+)|
| `custom`   | ❌ No     | ❌ No (Phase 5-D+)|
| `onlyMe`   | ✅ Yes    | ❌ No             |

> **Phase 5-D note:** Gated reads (followers-only, friends-only) are NOT implemented yet.
> Non-public sections are fully **absent** from `publicProfiles/{uid}` until Phase 5-D.

---

## Backward Compatibility

Existing user documents written with old string values (`'public'`, `'followers'`, `'private'`) are migrated transparently:

| Old value    | New `SectionPrivacy`             |
|-------------|-----------------------------------|
| `'public'`  | `{ audiences: ['public'] }`       |
| `'followers'`| `{ audiences: ['followers'] }`   |
| `'private'` | `{ audiences: ['onlyMe'] }`       |

Migration happens in two places:
1. **Client** (`PrivacySettingsPage`) — `migratePrivacyLevel()` on load
2. **Server** (`buildPublicProfile.ts`) — `migratePrivacyLevel()` before gate check

---

## Deployment Verification

- `npx tsc --noEmit` → **0 errors** in all 3 packages (shared, functions, web)
- `firebase deploy --only functions` → `onUserCreate` ✅, `onUserProfileUpdate` ✅
- `firebase deploy --only hosting` → `sound-platform-dev.web.app` ✅

---

## Next Step: Phase 5-D

Capability-gated publishing. Server-side permission checks (Plus / Music / Radio creator entitlements) before allowing content to enter specific world feeds.
