# Phase 5-C: Profile Update Sync & Privacy-Filtered Public Projection

## Summary

Phase 5-C implements the `onUserProfileUpdate` Cloud Function that automatically
synchronizes changes from `users/{uid}` (private) into `publicProfiles/{uid}`
(public projection) using strict section-level privacy filtering.

## Status: COMPLETE ✅

| Item | Status |
|------|--------|
| `buildPublicProfileFromUser` helper | ✅ Implemented |
| `onUserProfileUpdate` function | ✅ Deployed live |
| `onUserCreate` refactored | ✅ Uses shared builder |
| TypeScript typecheck | ✅ 0 errors |
| Build | ✅ 0 errors |
| Secret scan | ✅ Clean |
| Deployment | ✅ sound-platform-dev |
| Live trigger verification | ✅ Verified |
| Git push | ✅ Committed |

---

## Architecture

### Files Changed

| File | Change |
|------|--------|
| `functions/src/helpers/buildPublicProfile.ts` | **NEW** — shared privacy-filtered projection builder |
| `functions/src/triggers/onUserProfileUpdate.ts` | **NEW** — Firestore trigger on `users/{uid}` |
| `functions/src/triggers/onUserCreate.ts` | **REFACTORED** — uses shared builder, removed duplication |
| `functions/src/index.ts` | **UPDATED** — exports `onUserProfileUpdate` |

---

## Trigger Behaviour

```
users/{uid} write (create / update / delete)
        │
        ▼
onUserProfileUpdate (Gen 1 Firestore trigger)
        │
        ├── [deleted] → delete publicProfiles/{uid}
        │
        └── [create/update] → buildPublicProfileFromUser(userData, now)
                                        │
                                        ▼
                             publicProfiles/{uid}.set(publicDoc, { merge: false })
```

**Infinite loop prevention:**
- `onUserProfileUpdate` watches `users/{uid}`
- It writes to `publicProfiles/{uid}` — a **different collection**
- There is **no recursive trigger**. Verified by architecture review.

---

## Privacy Filtering — Section Map

| Section | Privacy Key | Default | Included in publicProfiles |
|---------|-------------|---------|---------------------------|
| General profile | `generalProfile` | `public` | ✅ Always |
| Mood | `mood` | `public` | ✅ If `public` |
| Activity status | `activityStatus` | `public` | ✅ If `public` |
| Listening activity | `listeningActivity` | `public` | ✅ If `public` |
| Followed stations | `followedRadioStations` | `public` | ✅ If `public` |
| Followed lists | `followedRadioStationLists` | `public` | ✅ If `public` |
| Music playlists | `musicPlaylists` | `public` | ✅ If `public` (public+song only) |
| Pinned content | `pinnedContent` | `public` | ✅ If `public` |
| Achievements | `achievements` | `public` | ✅ If `public` |
| Plus creator | `plusCreatorContent` | `public` | ✅ If `public` + capability |
| Music creator | `musicCreatorContent` | `public` | ✅ If `public` + capability |
| Radio creator | `radioCreatorContent` | `public` | ✅ If `public` + capability |
| Saved items | `savedItems` | `private` | ❌ NEVER |
| Story views | `storyViews` | `private` | ❌ NEVER |
| Private playlists | — | — | ❌ NEVER |
| email / role / capabilities | — | — | ❌ NEVER |
| walletId / kycStatus | — | — | ❌ NEVER |
| isBanned / restrictions | — | — | ❌ NEVER |
| Privacy settings object | — | — | ❌ NEVER |

---

## Live Verification

Trigger test performed on `users/e6LFSL9V8uQR60qi7uBcFc9YOBs1`:

- **Write to `users/{uid}` at:** `2026-05-14T08:43:40.694Z`
- **`publicProfiles/{uid}` updated at:** `2026-05-14T08:43:47.710Z`
- **Latency:** ~7 seconds (normal for Gen 1 triggers)

publicProfiles document confirmed to contain:
- `uid` ✅
- `generalProfile` (username, displayName, isVerified, counters, creator flags) ✅
- `activityStatus` ✅ (privacy = `public`)
- `listeningActivity` ✅ (privacy = `public`)
- `followedRadioStations` ✅ (privacy = `public`)
- `followedRadioStationLists` ✅ (privacy = `public`)
- `musicPlaylists` ✅ (privacy = `public`)
- `achievements` ✅ (privacy = `public`)
- `lastUpdatedAt` ✅

**NOT present (correctly excluded):**
- `email` ❌
- `role` ❌
- `capabilities` (raw map) ❌
- `savedItems` ❌
- `privacy` (settings) ❌
- `isBanned` ❌
- `walletId` ❌

---

## Next Steps

- **Phase 5-D:** Capability-gated publishing logic (server-side permission checks)
- **Phase 5-E:** Screen migration from legacy Stitch files
- **Node 22 migration:** Required before 2026-10-30 (Node 20 deprecated 2026-04-30)
