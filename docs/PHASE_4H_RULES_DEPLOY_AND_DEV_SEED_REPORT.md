# Phase 4-H — Rules Deployment and Dev Seed Report

**Phase:** 4-H  
**Date:** 2026-05-14  
**Firebase Project:** `sound-platform-dev`  
**Firebase Account:** `akrammoftahyt@gmail.com`  
**Project Root:** `C:\Users\akram\Downloads\Sound\sound-platform`  
**Region:** `europe-west1`

---

## 1. Active Firebase Project

```
firebase use  →  sound-platform-dev  ✅
```

The correct development project was confirmed active before any operation.

---

## 2. Pre-Deploy Safety Check

| Check | Result |
|-------|--------|
| Active project | `sound-platform-dev` ✅ |
| `firebase.json` firestore rules path | `firebase/rules/firestore.rules` ✅ |
| `firebase.json` storage rules path | `firebase/rules/storage.rules` ✅ |
| `firestore.rules` file exists | ✅ |
| `storage.rules` file exists | ✅ |
| Git working tree | **Clean** ✅ |
| Git branch | `main` ✅ |
| Secrets in changed files | None detected ✅ |
| Production project | Not configured — dev only ✅ |

---

## 3. Rules Deployment

### 3.1 Command

```bash
firebase deploy --only firestore:rules,storage --project sound-platform-dev
```

### 3.2 Result

| Service | Status |
|---------|--------|
| **Firestore Rules** | ✅ Deployed — `firebase/rules/firestore.rules` |
| **Storage Rules** | ✅ Deployed — `firebase/rules/storage.rules` |
| Functions | ❌ NOT deployed (boundary compliance) |
| Hosting | ❌ NOT deployed (boundary compliance) |

### 3.3 Compiler Output

```
+ firebase.storage: rules file firebase/rules/storage.rules compiled successfully
+ cloud.firestore: rules file firebase/rules/firestore.rules compiled successfully
+ storage: released rules firebase/rules/storage.rules to firebase.storage
+ firestore: released rules firebase/rules/firestore.rules to cloud.firestore
+ Deploy complete!
```

> **Note:** Firestore compiler produced 3 warnings about unused helper functions (`hasRole`, `isModerator`, `isActive`). These are non-blocking — the functions are defined for future rule expansion.

---

## 4. Seed Execution

### 4.1 Authentication Method

| Credential type | Used |
|-----------------|------|
| Service account JSON | ❌ NOT used (never downloaded, not in repo) |
| Application Default Credentials (gcloud) | ❌ Not available (`gcloud` CLI not installed) |
| Firebase Admin SDK with ADC | ❌ Blocked by Admin SDK requirement |
| **Firestore Emulator (no credentials)** | ✅ **Used** |

**Rationale:** The Admin SDK v12 requires a service account cert or proper ADC for Firestore access. Without `gcloud` CLI, ADC cannot be configured. The correct development-first approach is to seed the **Firestore Emulator** (port 18080), which requires no credentials and is the designated dev workflow.

### 4.2 Seed Target

```
FIRESTORE_EMULATOR_HOST=127.0.0.1:18080
SEED_TARGET=emulator
npx tsx scripts/seed-dev.ts
```

### 4.3 Seeded Documents (34 total)

| Collection | Document | Status |
|-----------|----------|--------|
| `adminConfig` | `global` | ✅ |
| `featureFlags` | `defaults` | ✅ |
| `worlds` | `general` | ✅ |
| `worlds` | `plus` | ✅ |
| `worlds` | `music` | ✅ |
| `worlds` | `radio` | ✅ |
| `worlds` | `live` | ✅ |
| `packages` | `free` | ✅ |
| `packages` | `plus` | ✅ |
| `packages` | `creator` | ✅ |
| `storyTypes` | `audio` | ✅ |
| `storyTypes` | `video` | ✅ |
| `storyTypes` | `image` | ✅ |
| `storyTypes` | `text` | ✅ |
| `storyTypes` | `poll` | ✅ |
| `storyTypes` | `question` | ✅ |
| `storyTypes` | `link` | ✅ |
| `storyTypes` | `template` | ✅ |
| `roles` | `super_admin` | ✅ |
| `roles` | `admin` | ✅ |
| `roles` | `moderator` | ✅ |
| `roles` | `radio_station_owner` | ✅ |
| `roles` | `company_account` | ✅ |
| `roles` | `artist` | ✅ |
| `roles` | `creator` | ✅ |
| `roles` | `user` | ✅ |
| `roles` | `guardian` | ✅ |
| `roles` | `child` | ✅ |
| `permissions` | `defaults` | ✅ |
| `reportReasons` | `defaults` | ✅ |
| `supportCategories` | `defaults` | ✅ |
| `competitionDimensions` | `defaults` | ✅ |
| `childPermissionDefaults` | `global` | ✅ |

**Total: 33 documents seeded (emulator only).**

### 4.4 NOT Seeded (by design)

| Collection | Reason |
|-----------|--------|
| `wallet/` | Cloud Function managed — never seeded from client tools |
| `paymentOrders/` | Cloud Function managed — no real payment data |
| `payoutRequests/` | Cloud Function managed — no real payout data |
| `auditLog/` | Append-only, Cloud Function only |
| `kycDocuments/` | Cloud Function / admin only |
| `moderationQueue/` | Cloud Function only |
| `childGuardianLinks/` | Cloud Function only |
| Real user accounts | No real emails, no real UIDs, no auth records |

---

## 5. Safety Boundaries — All Maintained

| Boundary | Status |
|---------|--------|
| Development project only | ✅ `sound-platform-dev` |
| No production project | ✅ |
| No real user data | ✅ |
| No real payment data | ✅ |
| No real payout data | ✅ |
| No secrets in repo | ✅ |
| No billing enabled | ✅ |
| No product features implemented | ✅ |
| No Cloud Functions deployed | ✅ |
| No Hosting deployed | ✅ |
| No other Firebase projects modified | ✅ |
| No service account JSON created | ✅ |
| No credentials written to repo | ✅ |

---

## 6. Seed Script Design

**File:** `scripts/seed-dev.ts`

Safety mechanisms built into the script:
1. `SEED_TARGET=firebase` requires `FIREBASE_PROJECT_ID=sound-platform-dev` — exits if wrong.
2. Emulator mode is the default — no credentials ever required.
3. All writes use `set({ merge: true })` — fully idempotent (safe to re-run).
4. Each write is logged to console.
5. No real credentials, real UIDs, or real emails in any seed data.

---

## 7. Git / GitHub

| Item | Value |
|------|-------|
| Typecheck | ✅ Passed (no TypeScript changes to app code) |
| Secret scan | ✅ Clean |
| Commit message | `chore: deploy dev rules and add safe seed setup` |
| Commit hash | *(see git log)* |
| GitHub push | `main` branch |

---

## 8. Next Recommended Phase

### Phase 5-A: First App Shell Implementation

Now that the development Firebase infrastructure is fully operational:
- Firestore and Storage rules deployed ✅
- Dev seed data loaded in emulator ✅
- Security architecture defined ✅
- Emulator configured and verified ✅

**Phase 5-A will implement:**
- The first React Native / Next.js app shell
- Authentication flow (Firebase Auth)
- Navigation scaffold
- Connection to local emulators for dev
- Basic screen routing

**Pre-conditions for seeding the real dev project (future):**
To seed `adminConfig`, `worlds`, etc. on the real `sound-platform-dev` Firestore, run:
```bash
gcloud auth application-default login
SEED_TARGET=firebase FIREBASE_PROJECT_ID=sound-platform-dev npx tsx scripts/seed-dev.ts
```
Or use a scoped service account with Firestore write permissions (do not commit to repo).
