# Phase 4-H-2: Profile Privacy Correction (Addendum to 4-H-1)

**Phase:** 4-H-2  
**Date:** 2026-05-14  
**Status:** COMPLETE  
**Amends:** PHASE_4H_1_PERMISSION_MODEL_AND_MODULAR_PROFILE_SCHEMA_CORRECTION.md  
**Project:** `sound-platform-dev`

---

## 1. Problem with Phase 4-H-1

Phase 4-H-1 incorrectly allowed `users/{uid}` to be readable by **any authenticated user**,
reasoning that a Cloud Function projection layer would filter sensitive fields before they reached
clients. This is insufficient:

- **Rule-level exposure is the attack surface.** If the rule allows raw document reads, a client
  can read the full `users/{uid}` document directly, bypassing any Cloud Function layer entirely.
- **`users/{uid}` contains sensitive fields** that must never reach other users: role, capabilities,
  restrictions, isBanned, kycStatus, walletId, guardianUid, isMinor, privacy config, raw consumer
  activity, internal flags.

---

## 2. Correct Two-Document Model

### Collection: `users/{uid}` — PRIVATE

| Property | Value |
|----------|-------|
| Readable by | Owner, Admin, Cloud Functions (Admin SDK) |
| Other users | **Denied** — must use `publicProfiles/{uid}` |
| Contents | Raw profile data, capabilities map, restrictions, privacy settings, consumer activity, internal system flags |
| Written by | Owner (non-sensitive fields only), Cloud Functions (sensitive fields) |

### Collection: `publicProfiles/{uid}` — PUBLIC PROJECTION

| Property | Value |
|----------|-------|
| Readable by | Any authenticated user |
| Written by | Cloud Function only (`onUserUpdate`, `onPrivacyChange` triggers) |
| Contents | Section-based projection of what the owner has made visible |
| Privacy-hidden sections | **Absent from document entirely** (not null/empty) |

---

## 3. Public Profile Sections (Each Independently Privacy-Controlled)

Each section is included in `publicProfiles/{uid}` **only if** the viewing user satisfies
the owner's `PrivacyLevel` for that section (`public` | `followers` | `private`).

| Section Key | Content |
|-------------|---------|
| `generalProfile` | username, bio, avatar, social counters, verification, capability flags |
| `mood` | current mood string |
| `activityStatus` | online / offline / hidden |
| `listeningActivity` | latest listened item, song, station, list, total listening time |
| `followedRadioStations` | list of followed radio stations |
| `followedRadioStationLists` | list of followed radio station lists/playlists |
| `musicPlaylists` | owned song playlists, public playlists |
| `pinnedContent` | pinned content item ID |
| `achievements` | badges and achievement IDs |
| `plusCreatorContent` | Plus world content IDs, live sessions, lists *(only if has plus_creator)* |
| `musicCreatorContent` | Uploaded songs, albums, music playlists *(only if has music_creator)* |
| `radioCreatorContent` | Owned stations, radio shows, episodes, lists *(only if has radio_creator)* |

---

## 4. Consumer vs. Creator Separation

| Type | Stored in | Examples |
|------|----------|---------|
| Consumer activity | `users/{uid}.consumerActivity` (private raw) → `publicProfiles/{uid}.listeningActivity` etc. (projected) | Followed stations, latest listened, playlists |
| Creator-owned content | `users/{uid}.posts/audioContent/liveSessions` etc. (private IDs) → `publicProfiles/{uid}.plusCreatorContent` etc. (projected IDs) | Published posts, songs, radio stations |

Both types are individually privacy-controlled per section.

---

## 5. Radio-Specific Corrections

| Aspect | Model |
|--------|-------|
| Station ownership | `radioStations/{id}.ownerProfileId` → uid of the owning profile |
| Contact page | `radioStations/{id}/contactPage/{docId}` subcollection (publicly readable) |
| Radio comments | `radioStations/{id}/playerComments/{commentId}` — display inside radio player, NOT general comment feed |
| Live broadcast messages | Cloud Function routes them to `notifications/{ownerProfileId}/items/` — owner's inbox |

---

## 6. Remaining Correct Principles (Unchanged from 4-H-1)

| Principle | Status |
|-----------|--------|
| Plus is NOT a viewer gate | ✅ Unchanged |
| General world creation is open by default | ✅ Unchanged |
| General live requires no special permission unless restricted | ✅ Unchanged |
| Plus live requires plus_creator capability | ✅ Unchanged |
| Music world has no native live mode | ✅ Unchanged |
| Radio stations require radio_creator capability | ✅ Unchanged |
| Any user can view live sessions if published | ✅ Unchanged |
| All capability checks are server-side (Cloud Function) only | ✅ Unchanged |

---

## 7. TypeScript Schema Changes (Phase 4-H-2)

| File | Change |
|------|--------|
| `packages/shared/src/profile.ts` | `PrivacySettings` changed from `interface` to `type { [K in PrivacySection]: PrivacyLevel }` |
| | Added `PrivacySection` union type (17 independently-controlled sections) |
| | `BaseProfile` (flat) → `UserPrivateDoc` (the `users/{uid}` internal document) |
| | Added `PublicProfileDoc` as the `publicProfiles/{uid}` document type |
| | Added per-section interfaces: `GeneralProfileSection`, `MoodSection`, `ActivityStatusSection`, `ListeningActivitySection`, `FollowedRadioStationsSection`, `FollowedRadioStationListsSection`, `MusicPlaylistsSection`, `PinnedContentSection`, `AchievementsSection`, `PlusCreatorContentSection`, `MusicCreatorContentSection`, `RadioCreatorContentSection` |
| | `BaseProfile` now serves as the capability-composition base (public-facing identity portion) |
| | `PublicProfileProjection` (flat) removed; replaced by section-based `PublicProfileDoc` |

**Typecheck result:** ✅ Zero errors

---

## 8. Firestore Rules Changes (Phase 4-H-2)

| Rule | Change |
|------|--------|
| `users/{uid}` read | Reverted to owner + admin only (Phase 4-H-1 broadening reversed) |
| `publicProfiles/{uid}` | New collection — readable by any authenticated user; write: CF only |
| `radioStations/{stationId}` | Expanded with `ownerProfileId` + `contactConfig` schema notes |
| `radioStations/{id}/playerComments/` | New subcollection — read: any auth user; create: auth user; update/delete: CF only |
| `radioStations/{id}/contactPage/` | New subcollection — read: any auth user; write: CF only |
| Phase tag | Updated 4-H-1 → 4-H-2 |
| Header comments | Updated to reflect two-document profile model and radio specifics |

**Rules are local only — not yet deployed to `sound-platform-dev`.**

---

## 9. Safety Boundaries — All Maintained

All boundaries from Phase 4-H-1 remain in force. No new boundaries were added or relaxed.

---

## 10. Next Step

Phase 5-A (App Shell Implementation) may now begin safely.

The Firestore privacy boundary is correct:
- Other users **cannot** read raw private profile documents.
- Profile data for other users flows only through `publicProfiles/{uid}`, which is built
  and maintained by Cloud Functions with per-section privacy enforcement.
