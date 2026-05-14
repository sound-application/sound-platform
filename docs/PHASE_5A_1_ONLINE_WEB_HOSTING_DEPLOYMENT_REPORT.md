# Phase 5-A-1: Online Web Hosting Deployment Report

**Date:** 2026-05-14  
**Phase:** 5-A-1  
**Status:** ✅ DEPLOYED

---

## Deployment Summary

| Item | Value |
|---|---|
| **Hosting URL** | https://sound-platform-dev.web.app |
| **Alternate URL** | https://sound-platform-dev.firebaseapp.com |
| **Firebase Project** | sound-platform-dev |
| **Region** | europe-west1 |
| **Build Tool** | Vite 6.4.2 |
| **Build Result** | ✅ SUCCESS — 91 modules, 0 errors, 0 TS errors |
| **Deploy Result** | ✅ SUCCESS — 5 files uploaded |
| **Cloud Functions Deployed** | ❌ NO — not deployed in this phase |
| **Firestore Rules Changed** | ❌ NO — rules unchanged from Phase 4-H-3 |
| **Storage Rules Changed** | ❌ NO — rules unchanged from Phase 4-H-3 |
| **Seed Data Written** | ❌ NO — no Firestore writes by deployment |
| **Emulator Used** | ❌ NO — online-first; VITE_APP_ENV=dev |
| **.env.local Committed** | ❌ NO — gitignored via `*.local` rule |
| **Billing Enabled** | ❌ NO — Spark plan only |
| **Old Stitch Screens Deployed** | ❌ NO — only apps/web/dist deployed |

---

## Build Artifacts

```
apps/web/dist/
├── index.html                       0.97 kB  (gzip: 0.53 kB)
└── assets/
    ├── index-c77niMo6.css          13.01 kB  (gzip:  2.99 kB)
    ├── index-DMdNx4ad.js           21.33 kB  (gzip:  6.50 kB)
    ├── vendor-react-Djw6WYsA.js   165.28 kB  (gzip: 54.06 kB)
    └── vendor-firebase-ComTJ23f.js 511.63 kB  (gzip: 121.29 kB)
```

**Chunk splitting:** Firebase SDK and React are in separate vendor chunks for optimal browser caching.

---

## Changes Made in This Phase

### 1. `firebase.json` — Hosting Configuration
- Changed `"public"` from `"public"` to `"apps/web/dist"`
- Added SPA rewrite: all non-asset requests → `/index.html` (enables client-side routing)
- Added cache headers:
  - `/assets/**` → `max-age=31536000, immutable` (long-cache for hashed assets)
  - `/index.html` → `no-cache` (always fetch fresh shell)

### 2. `apps/web/vite.config.ts` — Build Optimisation
- Added `build.rollupOptions.output.manualChunks` to split:
  - `vendor-firebase` → Firebase SDK (app, auth, firestore, storage)
  - `vendor-react` → React, ReactDOM, React Router
- Set `chunkSizeWarningLimit: 600` (Firebase SDK is large by design)

### 3. `.gitignore` — Build Output Excluded
- Added `apps/web/dist/` to prevent build artifacts from being committed

---

## Firebase Hosting Configuration (firebase.json)

```json
"hosting": {
  "public": "apps/web/dist",
  "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
  "rewrites": [{ "source": "**", "destination": "/index.html" }],
  "headers": [
    { "source": "/assets/**", "headers": [{ "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }] },
    { "source": "/index.html", "headers": [{ "key": "Cache-Control", "value": "no-cache, no-store, must-revalidate" }] }
  ]
}
```

---

## Privacy & Safety Verification

| Check | Status |
|---|---|
| `users/{uid}` never read client-side | ✅ ENFORCED — only `usePublicProfile` hook touches `publicProfiles/{uid}` |
| `publicProfiles/{uid}` used for public UI | ✅ ENFORCED |
| Create actions disabled | ✅ All create buttons disabled; no write ops |
| Auth pages accessible | ✅ `/login`, `/signup` reachable |
| Shell pages accessible | ✅ `/`, `/worlds/general`, `/worlds/plus`, `/worlds/music`, `/worlds/radio`, `/create`, `/settings` |
| No CF deployed | ✅ `publicProfiles` documents not yet populated — empty states shown correctly |
| Firebase config values | ✅ Web-safe public identifiers only (not secrets) |

---

## Git Tracking

| Item | Status |
|---|---|
| `.env.local` tracked | ❌ NOT tracked — gitignored (`*.local` rule) |
| `apps/web/dist/` tracked | ❌ NOT tracked — gitignored |
| Secret scan (staged) | ✅ CLEAN — 0 matches |

---

## What the App Shows At Launch

Since Cloud Functions are not deployed, `publicProfiles/{uid}` documents are empty. The deployed shell correctly handles this:

- **Home page** → Empty state (no content yet)
- **World pages** → Empty state per world
- **Profile page** → Privacy-hidden state (profile not found / empty projection)
- **Create page** → All options visible but **disabled** with `🔒` indicator
- **Login / Sign-Up** → Functional Firebase Auth forms
- **Connectivity banner** → Shown if network drops

---

## Known Limitations (Phase 5-A)

| Limitation | Resolution |
|---|---|
| `publicProfiles/{uid}` empty — profile page shows empty state | Phase 5-B: Cloud Function `onUserCreate` will populate projection |
| Create actions disabled | Phase 5-B/C: CF-enforced capability checks |
| No content feed | Phase 5-C: Publishing flow |
| Firebase vendor chunk is 512 kB (121 kB gzipped) | Acceptable — Firebase SDK is large; chunked for browser caching |

---

## Next Recommended Phase

**Phase 5-B: Cloud Functions — User Lifecycle & Profile Projection**

Goals:
1. Deploy `onUserCreate` trigger → creates initial `publicProfiles/{uid}` from `users/{uid}` general section
2. Deploy `onProfileUpdate` trigger → syncs `publicProfiles/{uid}` when owner updates profile
3. Enable real profile rendering in the deployed app shell

> **Do not deploy production project.**  
> **Do not enable billing.**  
> **Target: sound-platform-dev only.**
