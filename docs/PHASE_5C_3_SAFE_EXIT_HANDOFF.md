# Phase 5-C-3 Safe Exit & Handoff

**Document type:** Safe Exit Checkpoint  
**Created:** 2026-05-14  
**Last completed phase:** Phase 5-C-3 — Privacy Audience Model Upgrade  

---

## 🔴 Stop Point

This is a clean, committed, deployed stop point after Phase 5-C-3.  
**Do NOT continue to Phase 5-D without reading this document first.**

---

## Live Environment

| Item | Value |
|------|-------|
| **Live URL** | https://sound-platform-dev.web.app |
| **Firebase Project** | `sound-platform-dev` |
| **Firebase Account** | akrammoftahyt@gmail.com |
| **GitHub Repo** | https://github.com/sound-application/sound-platform |
| **Branch** | `main` |
| **Emulator** | NOT used — online-first |

---

## What Is Currently Working ✅

### Infrastructure
- Firebase Authentication (Email/Password) — enabled and working
- Firestore rules — deployed (Phase 4-H-3)
- Storage rules — deployed (Phase 4-H-3)
- `.env.local` — gitignored, not committed, present locally

### Cloud Functions (us-central1, Node.js 20)
- `onUserCreate` — Auth trigger, creates `users/{uid}` + `publicProfiles/{uid}` on signup
- `onUserProfileUpdate` — Firestore trigger, rebuilds `publicProfiles/{uid}` on every `users/{uid}` write

### Web App Pages (all protected routes)
- `/login` — Firebase Auth Email/Password login
- `/signup` — Firebase Auth Email/Password signup
- `/` — Home shell (empty state, no content yet)
- `/worlds/:worldId` — World shell (empty state)
- `/create` — Create shell (all options disabled — no publishing yet)
- `/profile/:uid` — Public profile viewer (reads `publicProfiles/{uid}` only)
- `/settings` — Settings hub
- `/settings/edit-profile` — Edit private profile fields (writes `users/{uid}`)
- `/settings/privacy` — **Multi-select privacy audience UI** (Phase 5-C-3)

### Privacy Model (Phase 5-C-3)
- **Schema:** Each section stores `{ audiences: PrivacyAudience[], customListIds?: string[] }`
- **6 audiences:** `public` | `friends` | `followers` | `following` | `custom` | `onlyMe`
- **Exclusive:** `public` and `onlyMe` clear all others on selection
- **Combinable:** `friends`, `followers`, `following`, `custom` stack freely
- **Backward compat:** `migratePrivacyLevel()` normalizes legacy string values on read
- **Public gate:** Only `audiences: ['public']` sections appear in `publicProfiles/{uid}`
- **Projection:** `publicProfiles/{uid}` auto-rebuilt by `onUserProfileUpdate` in ~5–10s

### Data Architecture
- `users/{uid}` — private, owner/admin/Cloud Function only
- `publicProfiles/{uid}` — public-safe projection, Cloud Function rebuilt only
- Client NEVER reads `users/{otherUid}` or writes `publicProfiles/{uid}`

---

## What Is NOT Started Yet ❌

| Feature | Phase | Notes |
|---------|-------|-------|
| Gated reads (followers-only, friends-only) | Phase 5-D+ | Non-public audiences currently produce absent sections |
| Custom audience list management UI | Future | `customListIds` stored but no list-builder UI |
| Capability-gated content publishing | Phase 5-D | No CF capability checks deployed yet |
| Plus creator publishing | Phase 5-D | Gate: `capabilities.plus_creator === true` |
| Music creator publishing | Phase 5-D | Gate: `capabilities.music_creator === true` |
| Radio creator publishing | Phase 5-D | Gate: `capabilities.radio_creator === true` |
| Stitch screen migration | Phase 5-E | Old screens in `Sound Screens/` — reference only |
| Node.js 22 upgrade | Pre-decommission | Node 20 deprecated; decommission 2026-10-30 |

---

## Known Advisories

- **Node.js 20 deprecated** 2026-04-30 — decommission 2026-10-30. Upgrade to Node 22 before that date.
- **firebase-functions package outdated** — upgrade before Node 22 migration.
- Both advisories are non-blocking for current development.

---

## Key File Locations

| File | Purpose |
|------|---------|
| `packages/shared/src/profile.ts` | `PrivacyAudience`, `SectionPrivacy`, `PrivacySettings`, `migratePrivacyLevel`, `isPubliclyVisible` |
| `functions/src/helpers/buildPublicProfile.ts` | `isSectionPublic()` — public projection gate |
| `functions/src/triggers/onUserCreate.ts` | Default `SectionPrivacy` objects for new users |
| `functions/src/triggers/onUserProfileUpdate.ts` | Rebuilds `publicProfiles/{uid}` on write |
| `apps/web/src/pages/PrivacySettingsPage.tsx` | Multi-select audience chip UI |
| `apps/web/src/pages/PrivacySettingsPage.css` | Chip styles, color tokens, projection dot |
| `docs/PHASE_5C_3_PRIVACY_AUDIENCE_MODEL_UPGRADE.md` | Full technical change log |

---

## Next Recommended Step

### Phase 5-C-4: Live Privacy Audience Verification

**Goal:** Verify that the Phase 5-C-3 multi-select audience model is behaving correctly end-to-end on the live environment.

**Verification tasks:**
1. Sign in to https://sound-platform-dev.web.app
2. Navigate to `/settings/privacy`
3. Set a section to `الأصدقاء + المتابعون` (non-public combination)
4. Save and wait ~10 seconds
5. Verify `publicProfiles/{uid}` does NOT contain that section (via Firebase Console)
6. Set the section back to `عام` (public)
7. Save and wait ~10 seconds
8. Verify `publicProfiles/{uid}` DOES contain that section
9. Verify projection dot in UI correctly reflects public vs. hidden state
10. Verify backward-compat: check if old string-format documents in Firestore still display correctly

**Only after Phase 5-C-4:**
- **Phase 5-D:** Capability-Gated Publishing

---

## Exact Restart Instruction

> When resuming, paste this to the assistant:

```
Start Phase 5-C-4: Live Privacy Audience Verification

Goal:
Verify the Phase 5-C-3 multi-select audience model end-to-end on the live environment.

Last safe exit: docs/PHASE_5C_3_SAFE_EXIT_HANDOFF.md
Last completed phase: Phase 5-C-3
Firebase project: sound-platform-dev
Required account: akrammoftahyt@gmail.com
Live URL: https://sound-platform-dev.web.app

Strict rules:
- Do NOT open browser auth flows.
- Do NOT switch Firebase accounts.
- Do NOT use emulator.
- Do NOT deploy functions or hosting unless a bug is found.
- Do NOT start Phase 5-D.
- Do NOT implement publishing.
- Do NOT enable billing.
```

---

## Git State at Exit

| Item | Value |
|------|-------|
| Branch | `main` |
| Latest commit | `docs: add safe exit handoff after privacy upgrade` |
| Push status | ✅ Pushed to `origin/main` |
| Uncommitted changes | None |
| Untracked files | None |
