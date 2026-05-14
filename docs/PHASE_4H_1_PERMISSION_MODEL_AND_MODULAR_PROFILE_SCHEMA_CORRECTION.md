# Phase 4-H-1: Permission Model and Modular Profile Schema Correction

**Phase:** 4-H-1  
**Date:** 2026-05-14  
**Status:** COMPLETE  
**Project:** `sound-platform-dev`  
**Project Root:** `C:\Users\akram\Downloads\Sound\sound-platform`

---

## 1. Purpose

This document records the corrections made to the Sound platform's permission model,
profile schema, and Firebase security rules before Phase 5-A (App Shell) begins.

These corrections resolve discrepancies between the product model (as clarified) and
the earlier Phase 4-G rules and schema assumptions.

---

## 2. Core Model Corrections

### 2.1 Viewing vs. Publishing — The Key Distinction

| Dimension | Correct Model | Previous (Incorrect) Assumption |
|-----------|--------------|--------------------------------|
| **Viewing published content** | Available to **any authenticated user** regardless of world | Implied Plus might require subscription to view |
| **Plus content** | Anyone can VIEW it if published; only PUBLISHING requires plus_creator | Was ambiguous — implied Plus was a viewer gate |
| **Plus live** | Anyone can view; only hosting requires plus_creator | Unclear |
| **General world** | Creation/publishing open by default for normal users | Partially correct |
| **General live** | Any user can host; restricted only by bans/violations | Correct |
| **Music live** | Music world has NO native live mode | Not documented |

### 2.2 Read Gates (Exhaustive List)

The ONLY gates on reading/viewing published content are:
1. Authentication (`isAuth()`)
2. `status == 'published'` (enforced in Firestore rules)
3. Privacy settings (enforced by Cloud Function projection layer)
4. Moderation / block state (enforced server-side by Cloud Function)

**World destination is NOT a read gate.**

### 2.3 Write / Publish Gates

| World | Content Type | Required Capability |
|-------|-------------|---------------------|
| General | audio, video, image, text, poll, question, link, story | None (open by default) |
| General | liveSession | None (open; restricted only by account bans) |
| General | song, album | `music_creator` |
| Plus | audio, video, image, text, story | `plus_creator` |
| Plus | liveSession | `plus_creator` |
| Music | song, album | `music_creator` |
| Music | liveSession | **Not supported** (Music has no native live mode) |
| Radio | radioStation, radioShow, radioEpisode | `radio_creator` |
| Live | liveSession | None (hub entry point; world of session determines capability) |

All capability checks are enforced by Cloud Functions. Firestore rules do not attempt
client-side capability verification — the rules only enforce structural safety and
server-only collection protection.

---

## 3. Profile Model Correction

### 3.1 Previous Assumption
Profile was treated as a fixed user type (creator, listener, etc.).

### 3.2 Corrected Model

A profile is **not a fixed type**. Every account starts from a **normal audio-first
base profile** (`BaseProfile`). Capability modules are added on top.

```
BaseProfile (all users)
   └── + PlusCreatorModule    → PlusCapableProfile
   └── + MusicCreatorModule   → MusicCapableProfile
   └── + RadioCreatorModule   → RadioCapableProfile
   └── + all modules          → SuperProfile
```

### 3.3 BaseProfile Fields (Required on All Profiles)

**Identity:** uid, username, displayName, avatarUrl, coverUrl, isVerified, verificationBadgeType  
**Bio:** bio, location, websiteUrl, mood, socialLinks  
**Counters:** followersCount, followingCount, likesCount, postsCount, listensCount  
**Activity:** latestActivity, joinedAt, activityStatus  
**Published content (creator-owned):** posts, stories, audioContent, liveSessions, reposts, replies, comments, pinnedContent  
**Consumer activity (all privacy-controlled):** latestListenedItem, latestListenedRadioStation, latestListenedSong, latestListenedList, followedRadioStations, followedRadioStationLists, listenedMusicLists, songPlaylists, publicPlaylists, privatePlaylists, savedItems, totalListeningTimeSecs  
**Gamification:** badges, achievements, points, gifts  
**Subscriptions:** subscriptions  
**Privacy controls:** PrivacySettings (listeningActivity, following, followers, savedItems, storyViews, activityStatus, pinnedContent, achievements, directMessages)  
**System (CF-managed):** isMinor, guardianUid, isBlocked, isMuted, isBanned  
**UI actions (computed):** canFollow, canMessage, canReport, canBlock, canMute

### 3.4 Capability Modules

| Module | Adds to Profile |
|--------|----------------|
| `PlusCreatorModule` | plusContent, plusLiveSessions, plusLists |
| `MusicCreatorModule` | uploadedSongs, albums, musicPlaylists, musicLists |
| `RadioCreatorModule` | ownedRadioStations, radioShows, radioEpisodes, radioLists |

### 3.5 Consumer vs. Creator Separation

| Type | Examples |
|------|---------|
| **Consumer activity** | followed/listened/saved items, listening time, followed stations |
| **Creator-owned content** | published posts, audio, live sessions, owned stations |

Both are always individually privacy-controlled.

---

## 4. Firebase Security Rules Changes

### 4.1 Changes Made (local only — not deployed)

| Rule | Change |
|------|--------|
| `users/{uid}` read | Changed from owner+admin only → any authenticated user (privacy enforced by CF projection) |
| `channels/{channelId}` comment | Added explicit comment: world does NOT restrict reading |
| `content/{contentId}` comment | Added explicit comment: Plus/Music/Radio content readable when published |
| `liveSessions/{sessionId}` | Added new canonical collection (replacing legacy `sessions/`) |
| Phase tag | Updated 4-G → 4-H-1 |
| Header comments | Added permission model correction section |
| New collections | Added rules for: `worlds/`, `storyTypes/`, `roles/`, `permissions/`, `supportCategories/`, `competitionDimensions/`, `childPermissionDefaults/`, `featureFlags/` |
| `users` update protection | Added `capabilities`, `restrictions`, `isBanned` to protected field list |

### 4.2 Rules NOT Deployed

> The updated `firestore.rules` file is **local only**. It has **not been deployed** to `sound-platform-dev`.
> Deployment of updated rules will happen in a separate phase with explicit user approval.

### 4.3 Storage Rules

Storage rules are **unchanged** — the storage model is correct and does not need correction.

---

## 5. TypeScript Schema Files Created/Updated

| File | Action | Purpose |
|------|--------|---------|
| `packages/shared/src/profile.ts` | **Created** | BaseProfile + capability module types |
| `packages/shared/src/permissions.ts` | **Created** | PermissionKey, CapabilityModule, WorldPublishingRules |
| `packages/shared/src/content.ts` | **Created** | ContentDoc, LiveSessionDoc types |
| `packages/shared/src/index.ts` | **Updated** | Exports all new modules |

**Typecheck result:** ✅ Zero errors on `packages/shared` and `scripts/`.

---

## 6. Seed Script Assessment

The seed script (`scripts/seed-dev.ts`) is **unchanged** — the data it seeds is correct
for the corrected model:
- `worlds/*` — world configuration definitions ✅
- `roles/*` — role definitions ✅
- `permissions/defaults` — default permission matrix ✅
- `storyTypes/*` — story type catalog ✅
- `packages/*` — subscription package definitions ✅
- `featureFlags/defaults` — feature flag defaults ✅
- `supportCategories/defaults` — support category catalog ✅
- `competitionDimensions/defaults` — competition scoring dimensions ✅
- `childPermissionDefaults/global` — child permission defaults ✅

No re-seeding is needed. The seed data is structurally correct.

---

## 7. Safety Boundaries — All Maintained

| Boundary | Status |
|---------|--------|
| Development project only | ✅ |
| No production project | ✅ |
| No real user data | ✅ |
| No real payment data | ✅ |
| No billing enabled | ✅ |
| No Cloud Functions deployed | ✅ |
| No Hosting deployed | ✅ |
| No Firebase rules deployed | ✅ (local-only changes) |
| No secrets in repo | ✅ |

---

## 8. Next Recommended Phase

### Phase 5-A: First App Shell Implementation

The permission model, profile schema, and Firebase infrastructure are now fully
documented and corrected. The project is ready for app implementation.

**Phase 5-A will implement:**
- React Native / Next.js app shell scaffold
- Firebase Authentication flow (sign up / sign in)
- Navigation scaffold (world tabs + bottom nav)
- Connection to local Firebase emulators
- Basic screen routing using the corrected profile model

**Pre-conditions met:**
- ✅ Firebase dev project active (`sound-platform-dev`)
- ✅ Firestore + Storage rules deployed (Phase 4-H)
- ✅ Emulator seed data available (Phase 4-H)
- ✅ Permission model corrected (Phase 4-H-1)
- ✅ Profile schema types defined (Phase 4-H-1)
- ✅ GitHub up to date
