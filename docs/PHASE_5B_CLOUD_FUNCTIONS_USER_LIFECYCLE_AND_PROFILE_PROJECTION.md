# Phase 5-B: Cloud Functions — User Lifecycle & Public Profile Projection

**Date:** 2026-05-14  
**Firebase Project:** sound-platform-dev  
**Firebase Account:** akrammoftahyt@gmail.com  
**Live App:** https://sound-platform-dev.web.app  
**Status:** ✅ DEPLOYED AND LIVE

---

## Overview

Phase 5-B implements the first Cloud Functions layer for the Sound platform. Every new Firebase Auth user registration now automatically triggers:

1. Creation of `users/{uid}` — private internal document (owner/admin/server only)
2. Creation of `publicProfiles/{uid}` — public-safe projection (any authenticated user)

This enables the Phase 5-A web shell to render real public profiles while keeping all private user data strictly server-side.

---

## Deployed Functions

| Function | Trigger | Runtime | Location | Version |
|---|---|---|---|---|
| `onUserCreate` | `providers/firebase.auth/eventTypes/user.create` | Node.js 20 | us-central1 | v1 |

---

## Privacy Architecture (Phase 4-H-2 Compliance)

### `users/{uid}` — PRIVATE DOCUMENT

- Readable ONLY by: owner (uid match), admin role, Cloud Functions (Admin SDK)
- NEVER accessible to other users via Firestore client SDK
- Contains:
  - `uid`, `username`, `displayName`, `avatarUrl`
  - `isVerified`, `bio`, `location`, `websiteUrl`, `mood`, `socialLinks`
  - `followersCount`, `followingCount`, `likesCount`, `postsCount`, `listensCount`
  - `joinedAt`, `latestActivity`, `activityStatus`
  - `posts`, `stories`, `audioContent`, `liveSessions`, `reposts`, `replies`, `comments`, `pinnedContent`
  - `consumerActivity` (followed stations, playlists, saved items, listening time)
  - `badges`, `achievements`, `points`, `gifts`
  - `subscriptions`
  - `privacy` (full `PrivacySettings` per section)
  - `capabilities` (all disabled — granted only by admin or package)
  - `isMinor`, `isBanned`, `createdAt`
  - `role`, `accountType`
  - `walletId` (undefined until set)
  - `kycStatus` (undefined until verified)

### `publicProfiles/{uid}` — PUBLIC PROJECTION

- Readable by: any authenticated user
- NEVER writable by client SDK (Cloud Functions / Admin SDK only)
- Contains ONLY:
  - `uid`
  - `generalProfile` section:
    - `username`, `displayName`, `avatarUrl`, `isVerified`
    - `socialLinks`, `followersCount`, `followingCount`, `postsCount`, `listensCount`
    - `joinedAt`, `badges`
    - `isPlusCreator`, `isMusicCreator`, `isRadioCreator` (all false on create)
  - `lastUpdatedAt`
- DOES NOT contain: email, role, capabilities, restrictions, walletId, kycStatus, internal flags, consumerActivity

---

## Default Values on User Creation

### Capabilities
All capabilities are initialized to empty object `{}` — no permissions granted on create. Capabilities are granted only by:
- Admin action
- Package purchase (future phase)
- Server-side promotion

### Default Privacy Settings
| Section | Default |
|---|---|
| generalProfile | public |
| mood | public |
| listeningActivity | public |
| followedRadioStations | public |
| followedRadioStationLists | public |
| musicPlaylists | public |
| savedItems | **private** |
| storyViews | **private** |
| activityStatus | public |
| pinnedContent | public |
| achievements | public |
| following | public |
| followers | public |
| directMessages | followers |
| plusCreatorContent | public |
| musicCreatorContent | public |
| radioCreatorContent | public |

### Account Role
- All new users start as `role: 'listener'`, `accountType: 'normal'`
- Admin SDK / admin action required to promote role

---

## File Changes

### New Files
- `functions/src/index.ts` — Cloud Functions entry point (exports `onUserCreate`)
- `functions/src/triggers/onUserCreate.ts` — Auth trigger implementation

### Modified Files
- `functions/package.json` — Updated `main` to `lib/functions/src/index.js`, Node engine to `20`
- `functions/tsconfig.json` — Added `@sound/shared` path alias, included shared package source

### Unchanged
- `firebase/rules/firestore.rules` — Privacy rules already correct from Phase 4-H-3
- `apps/web/` — No client changes needed (already uses `publicProfiles/{uid}`)
- `firebase.json` — Functions source already points to `functions/`

---

## Build & Typecheck Results

```
TypeScript: TYPECHECK:0  (zero errors)
Build:      npm run build — SUCCESS
Secret scan: CLEAN
```

---

## Deployment Log

### Attempt 1 — FAILED (IAM)
```
Error: Build failed: Access to bucket gcf-sources-176645260774-us-central1 denied.
You must grant Storage Object Viewer permission to
176645260774-compute@developer.gserviceaccount.com.
```

**Root cause:** First-time Cloud Functions deployment — Cloud Build default Compute Engine service account lacked `Storage Object Viewer` on the GCF sources bucket.

**Fix:** Granted `Storage Object Viewer` role to `176645260774-compute@developer.gserviceaccount.com` via GCP IAM Console → IAM & Admin → project `sound-platform-dev`.

### Attempt 2 — SUCCESS
```
functions[onUserCreate(us-central1)] Successful update operation.
```

### Cleanup Policy
```
Configuring cleanup policy for repository in us-central1.
Images older than 1 days will be automatically deleted.
Configured cleanup policy for repository in us-central1.
Deploy complete!
```

---

## Runtime Deprecation Notice

> Node.js 20 was deprecated on 2026-04-30. Decommission date: 2026-10-30.

**Action required before 2026-10-30:** Upgrade engine in `functions/package.json` to Node.js 22 and re-deploy.

---

## Verification

```
firebase functions:list --project sound-platform-dev

┌──────────────┬─────────┬──────────────────────────────────────────────────┬─────────────┬────────┬──────────┐
│ Function     │ Version │ Trigger                                          │ Location    │ Memory │ Runtime  │
├──────────────┼─────────┼──────────────────────────────────────────────────┼─────────────┼────────┼──────────┤
│ onUserCreate │ v1      │ providers/firebase.auth/eventTypes/user.create   │ us-central1 │ 256    │ nodejs20 │
└──────────────┴─────────┴──────────────────────────────────────────────────┴─────────────┴────────┴──────────┘
```

---

## What Happens on Sign-Up (Live Flow)

1. User registers at https://sound-platform-dev.web.app
2. Firebase Auth creates the Auth user record
3. `onUserCreate` Cloud Function fires automatically (triggered by `user.create` event)
4. Function atomically writes (Firestore batch):
   - `users/{uid}` — full private document with all defaults
   - `publicProfiles/{uid}` — public projection with general profile section only
5. Web app reads from `publicProfiles/{uid}` only — privacy maintained

---

## Known Issues / Advisory Notes

- **Node 20 deprecation:** Upgrade to Node 22 before 2026-10-30 to avoid disruption.
- **firebase-functions version:** Package reports an outdated version warning. Non-blocking. Upgrade to latest firebase-functions before Node 22 migration (breaking changes expected).
- **Function region:** Deployed to `us-central1` (default). Future consideration: deploy to `europe-west1` for lower latency to target regions.

---

## Next Steps

- **Phase 5-C:** Profile update trigger — sync `users/{uid}` changes to `publicProfiles/{uid}` projection
- **Phase 5-D:** Capability-gated publishing flows (requires Cloud Functions capability check)
- **Phase 5-E:** Screen migration from old Stitch screens

---

## References

- Phase 4-H-2: `docs/PHASE_4H_2_PROFILE_PRIVACY_CORRECTION.md`
- Phase 4-H-3: `docs/PHASE_4H_3_ONLINE_RULES_DEPLOYMENT_AND_PRIVACY_VERIFICATION.md`
- Phase 5-A-1: `docs/PHASE_5A_1_ONLINE_WEB_HOSTING_DEPLOYMENT_REPORT.md`
- Phase 5-A-2: `docs/PHASE_5A_2_ONLINE_AUTH_CONFIGURATION_REPAIR.md`
- Shared types: `packages/shared/src/profile.ts`, `packages/shared/src/permissions.ts`
- Function source: `functions/src/triggers/onUserCreate.ts`
