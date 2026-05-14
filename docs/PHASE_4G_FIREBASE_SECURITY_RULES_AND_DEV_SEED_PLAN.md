# Phase 4-G: Firebase Security Rules and Initial Dev Seed Plan

**Date:** 2026-05-14  
**Phase:** 4-G — Firebase Security Rules and Initial Dev Seed Plan  
**Status:** COMPLETE (rules prepared locally, not yet deployed)

---

## Firebase Services Verified

| Service | Status | Notes |
|---------|--------|-------|
| Firebase Project | ✅ Active | `sound-platform-dev` (Project #176645260774) |
| Firebase Authentication | ✅ Enabled | Email/Password provider configured |
| Cloud Firestore | ✅ Initialized | Region: `europe-west1`, deny-all rules |
| Cloud Storage | ✅ Active | Bucket activated via Firebase Console (Phase 4-G-1). Verified via deploy dry-run: `firebasestorage.googleapis.com` API enabled and rules compile successfully. Rules are local only — not yet deployed. |
| Billing | ❌ Not enabled | Spark free plan — confirmed |
| Production project | ❌ Does not exist | Dev only |

---

## Current Local Config State (Pre-Phase 4-G)

| File | State Before 4-G |
|------|-----------------|
| `.firebaserc` | `sound-platform-dev` as default + dev alias |
| `firebase.json` | Custom emulator ports, `europe-west1`, correct paths |
| `firebase/rules/firestore.rules` | Flat deny-all only |
| `firebase/rules/storage.rules` | Flat deny-all with comments only |
| `firebase/indexes/firestore.indexes.json` | Empty `{"indexes":[],"fieldOverrides":[]}` |

---

## Security Rules Strategy

### Core Principles

1. **Default deny everything** — any collection or path not explicitly matched is denied.
2. **Sensitive collections are permanently server-only** — wallet, payment, payout, audit, KYC, moderation, adminConfig, childGuardianLinks are inaccessible from any client SDK under any rule.
3. **Cloud Functions own all writes to sensitive data** via the Admin SDK (which bypasses client rules entirely).
4. **Published-gate on public content** — channels, episodes, and content are only readable by authenticated users when `status == 'published'`.
5. **Owner isolation** — users can only read/write their own documents. Sensitive fields within a user document (role, walletId, kycStatus, isMinor, guardianUid) are protected from client writes.
6. **Children and guardian approval** — no client-side bypass permitted; all guardian approval flows are Cloud Function only.
7. **Signed URLs for media** — audio files are never directly client-readable. Cloud Functions generate time-limited signed URLs.

### Firestore Collection Access Matrix

| Collection | Client Read | Client Write | Server Read | Server Write |
|---|---|---|---|---|
| `users/{uid}` | Owner + Admin only | Owner (non-sensitive fields only) | ✅ | ✅ |
| `usernames/{username}` | Any auth user | ❌ CF only | ✅ | ✅ |
| `channels/{channelId}` | Auth + published | ❌ CF only | ✅ | ✅ |
| `channels/.../episodes/` | Auth + published | ❌ CF only | ✅ | ✅ |
| `content/{contentId}` | Auth + published | ❌ CF only | ✅ | ✅ |
| `competitions/{id}` | Auth + published | ❌ CF only | ✅ | ✅ |
| `competitions/.../entries/` | Auth + published | ❌ CF only | ✅ | ✅ |
| `competitions/.../scores/` | ❌ | ❌ CF only | ✅ | ✅ |
| `sessions/{sessionId}` | Any auth user | ❌ CF only | ✅ | ✅ |
| `notifications/{uid}/items/` | Owner only | Owner (mark-read only) | ✅ | ✅ |
| `follows/{followId}` | Any auth user | Owner (own follow only) | ✅ | ✅ |
| `playlists/{playlistId}` | Owner + public flag | Owner (non-sensitive) | ✅ | ✅ |
| `points/{uid}` | Owner only | ❌ NEVER client-writable | ✅ | ✅ |
| `radioStations/{id}` | Any auth user | ❌ CF only | ✅ | ✅ |
| `packages/{id}` | Any auth user | ❌ CF only | ✅ | ✅ |
| `reportReasons/{id}` | Any auth user | ❌ CF only | ✅ | ✅ |
| `reports/{reportId}` | ❌ | Create (owner uid only) | ✅ | ✅ |
| **`wallet/{uid}`** | ❌ NEVER | ❌ NEVER | ✅ | ✅ |
| **`paymentOrders/{id}`** | ❌ NEVER | ❌ NEVER | ✅ | ✅ |
| **`payoutRequests/{id}`** | ❌ NEVER | ❌ NEVER | ✅ | ✅ |
| **`auditLog/{id}`** | ❌ NEVER | ❌ NEVER | ✅ | ✅ |
| **`adminConfig/{id}`** | ❌ NEVER | ❌ NEVER | ✅ | ✅ |
| **`kycDocuments/{uid}`** | ❌ NEVER | ❌ NEVER | ✅ | ✅ |
| **`moderationQueue/{id}`** | ❌ NEVER | ❌ NEVER | ✅ | ✅ |
| **`childGuardianLinks/{id}`** | ❌ NEVER | ❌ NEVER | ✅ | ✅ |

### Storage Path Access Matrix

| Path | Client Read | Client Write | Server Read/Write |
|------|-------------|--------------|-------------------|
| `uploads/{uid}/temp/{file}` | ❌ | Owner (50MB max) | ✅ |
| `media/channels/{id}/{file}` | Any auth user | ❌ CF only | ✅ |
| `media/episodes/{...}/{file}` | ❌ Signed URL only | ❌ CF only | ✅ |
| `media/content/{id}/{file}` | ❌ Signed URL only | ❌ CF only | ✅ |
| `avatars/{uid}/{file}` | Any auth user | ❌ CF only | ✅ |
| `media/competitions/{id}/{file}` | Any auth user | ❌ CF only | ✅ |
| **`kyc/{uid}/{file}`** | ❌ NEVER | ❌ NEVER | ✅ |
| **`payment-receipts/{id}/{file}`** | ❌ NEVER | ❌ NEVER | ✅ |
| **`payout-docs/{id}/{file}`** | ❌ NEVER | ❌ NEVER | ✅ |
| **`admin-exports/{file}`** | ❌ NEVER | ❌ NEVER | ✅ |
| **`moderation-captures/{id}/{file}`** | ❌ NEVER | ❌ NEVER | ✅ |

---

## Initial Dev Seed Plan

> **Status: PLAN ONLY — no data written yet. Implementation in Phase 4-H.**

### Seed Collection: `adminConfig/global`

```jsonc
{
  "platformName": "Sound",
  "defaultLanguage": "ar",
  "supportedLanguages": ["ar", "en"],
  "maintenanceMode": false,
  "minimumAppVersion": "1.0.0",
  "defaultRegion": "EG",
  "supportEmail": "support@sound-dev.invalid",
  "termsVersion": "1.0",
  "privacyVersion": "1.0"
}
```

### Seed Collection: `adminConfig/featureFlags`

```jsonc
{
  "competitions": true,
  "liveSessions": true,
  "radioStations": true,
  "contentBoost": false,
  "adCampaigns": false,
  "payoutEnabled": false,
  "kycRequired": false,
  "childAccounts": false,
  "guardianApproval": false,
  "onNetIntegration": false,
  "autoModeration": false
}
```

### Seed Collection: `adminConfig/worlds`

Five worlds aligned with the SRS product definition:

| World | ID | Description |
|-------|----|-------------|
| لقطات (Shorts) | `world_shorts` | Short-form audio clips |
| القنوات (Channels) | `world_channels` | Long-form audio channels and podcasts |
| المسابقات (Competitions) | `world_competitions` | Audio competitions with jury voting |
| الجلسة (Sessions) | `world_sessions` | Live audio sessions and voice rooms |
| الراديو (Radio) | `world_radio` | Radio station discovery (display only) |

### Seed Collection: `packages/{id}`

| Package | ID | Price | Description |
|---------|-----|-------|-------------|
| Spark (Free) | `pkg_spark` | 0 | Basic access, ad-supported |
| General | `pkg_general` | TBD | Standard paid plan |
| Plus | `pkg_plus` | TBD | Premium with exclusive features |

### Seed Collection: `adminConfig/roles`

```jsonc
["superAdmin", "admin", "moderator", "creator", "listener", "guest"]
```

### Seed Collection: `adminConfig/permissions`

Key permission matrix (abbreviated):

| Permission | superAdmin | admin | moderator | creator | listener |
|-----------|-----------|-------|-----------|---------|----------|
| `platform.config.write` | ✅ | ❌ | ❌ | ❌ | ❌ |
| `content.moderate` | ✅ | ✅ | ✅ | ❌ | ❌ |
| `content.publish` | ✅ | ✅ | ❌ | ✅ | ❌ |
| `wallet.view.own` | ✅ | ✅ | ❌ | ✅ | ❌ |
| `payout.request` | ✅ | ✅ | ❌ | ✅ | ❌ |
| `competition.jury` | ✅ | ✅ | ✅ | ❌ | ❌ |
| `child.approve` | ✅ | ✅ | ❌ | ❌ | ❌ |

### Seed Collection: `reportReasons/{id}`

Default report reasons for content and users:

- `reason_inappropriate_content` — محتوى غير لائق
- `reason_harassment` — تحرش أو مضايقة
- `reason_spam` — محتوى مزعج
- `reason_misinformation` — معلومات مضللة
- `reason_copyright` — انتهاك حقوق الملكية
- `reason_minor_safety` — محتوى يهدد سلامة الأطفال
- `reason_hate_speech` — خطاب كراهية
- `reason_other` — سبب آخر

### Seed Collection: `adminConfig/storyTypes`

Story/content category types seeded for dev:

- `type_episode` — حلقة (full episode)
- `type_short` — لقطة (short clip)
- `type_trailer` — تشويق (trailer)
- `type_radio_clip` — مقطع راديو

### Seed Collection: `adminConfig/supportCategories`

- `support_account` — مشكلة في الحساب
- `support_payment` — مشكلة في الدفع
- `support_content` — محتوى
- `support_technical` — مشكلة تقنية
- `support_other` — أخرى

### Seed Collection: `adminConfig/competitionDimensions`

Jury evaluation dimensions for competitions:

- `dim_vocal_quality` — جودة الصوت
- `dim_creativity` — الإبداع
- `dim_authenticity` — الأصالة
- `dim_technique` — التقنية
- `dim_emotional_impact` — التأثير العاطفي

### Seed Collection: `adminConfig/childDefaults`

Default permissions for child accounts (before guardian approval):

```jsonc
{
  "canPublishContent": false,
  "canParticipateInCompetitions": false,
  "canJoinLiveSessions": false,
  "canSendGifts": false,
  "canRequestPayout": false,
  "contentFilterLevel": "strict",
  "requiresGuardianApprovalForPurchases": true
}
```

### Dev Seed User: Super Admin Placeholder

```jsonc
{
  "uid": "dev-superadmin-001",
  "email": "superadmin@sound-dev.invalid",
  "displayName": "Dev Super Admin",
  "role": "superAdmin",
  "accountType": "admin",
  "isDevAccount": true
}
```

> ⚠️ This account exists **emulator-only** and is never seeded to the real Firebase project.

### What Will NOT Be Seeded

| Collection/Data | Reason |
|----------------|--------|
| `wallet/` | Cloud Function managed — no seed data |
| `paymentOrders/` | No real PSP in dev phase |
| `payoutRequests/` | No real payout in dev phase |
| `auditLog/` | Append-only — generated by operations |
| `kycDocuments/` | No real identity documents ever in dev |
| Real user emails/phones | Privacy — all seed users use `.invalid` domains |
| Real audio files | Media seeding deferred to Phase 4-H+ |
| Real radio stream URLs | Deferred until OnNet integration decision |

---

## Rules Deployment Status

| Rules File | Local Status | Deployed to Firebase? |
|---|---|---|
| `firebase/rules/firestore.rules` | ✅ Phase 4-G draft complete | ❌ NOT YET DEPLOYED |
| `firebase/rules/storage.rules` | ✅ Phase 4-G draft complete | ❌ NOT YET DEPLOYED |

> Rules deployment requires explicit approval in Phase 4-H.

---

## Next Steps — Phase 4-H

1. ✅ ~~Activate Cloud Storage bucket via Firebase Console~~ — **COMPLETE (Phase 4-G-1)**.
2. Validate Firestore rules locally using Firebase Rules Playground or emulator.
3. Deploy rules to `sound-platform-dev` after validation (explicit approval required).
4. Implement seed scripts in `firebase/seed/`.
5. Run seed scripts against local emulator first, then optionally against dev project.
6. Add composite Firestore indexes for known query patterns.
