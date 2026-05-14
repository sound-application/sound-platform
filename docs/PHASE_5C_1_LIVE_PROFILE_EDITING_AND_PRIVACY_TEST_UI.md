# Phase 5-C-1: Live Profile Editing and Privacy Test UI

**Status:** ✅ DEPLOYED AND VERIFIED LIVE  
**Date:** 2026-05-14  
**Firebase project:** sound-platform-dev  
**Live URL:** https://sound-platform-dev.web.app

---

## 1. Objective

Add a minimal, secure live UI that lets the authenticated owner:
1. Read their own private profile data from `users/{uid}`.
2. Edit basic fields (displayName, username, bio, mood).
3. Configure section-level privacy settings (mood, activityStatus, listeningActivity, musicPlaylists, radioCreatorContent, plusCreatorContent).
4. Save changes to `users/{uid}` — triggering `onUserProfileUpdate` to auto-sync `publicProfiles/{uid}`.

---

## 2. Files Created / Modified

### New Files
| File | Purpose |
|---|---|
| `apps/web/src/hooks/usePrivateProfile.ts` | Owner-only Firestore listener for `users/{uid}` |
| `apps/web/src/pages/EditProfilePage.tsx` | Edit Profile form component |
| `apps/web/src/pages/EditProfilePage.css` | Design-system-aligned styles |
| `apps/web/src/pages/SettingsPage.css` | Styles for Settings hub menu |

### Modified Files
| File | Change |
|---|---|
| `apps/web/src/pages/SettingsPage.tsx` | Upgraded from placeholder to real settings menu hub |
| `apps/web/src/router/AppRouter.tsx` | Added `/settings/edit-profile` route + `EditProfilePage` import |

---

## 3. Privacy Model (Phase 4-H-2 — Enforced)

```
┌─────────────────────────────────────────────────────────────────┐
│  users/{uid}             PRIVATE                                │
│  - Read:  owner only (Firestore rules)                          │
│  - Write: owner (non-server-only fields only, rules enforced)   │
│  - usePrivateProfile hook reads this for EditProfilePage ONLY   │
│                                                                 │
│  publicProfiles/{uid}    PUBLIC PROJECTION                      │
│  - Read:  any authenticated user                                │
│  - Write: Cloud Function ONLY (rules deny client writes)        │
│  - Updated automatically by onUserProfileUpdate trigger         │
│                                                                 │
│  NEVER: read users/{uid} for public profile rendering           │
│  NEVER: write publicProfiles/{uid} from client                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 4. Editable Fields

| Field | Firestore path | Notes |
|---|---|---|
| displayName | `displayName` | Required, max 50 chars |
| username | `username` | Required, min 3, lowercase+underscore |
| bio | `bio` | Optional, max 200 chars |
| mood | `mood` | Optional, max 80 chars |
| Mood privacy | `privacy.mood` | `public` / `followers` / `private` |
| Activity status privacy | `privacy.activityStatus` | Same options |
| Listening activity privacy | `privacy.listeningActivity` | Same options |
| Music playlists privacy | `privacy.musicPlaylists` | Same options |
| Radio creator content privacy | `privacy.radioCreatorContent` | Same options |
| Plus creator content privacy | `privacy.plusCreatorContent` | Same options |

### Server-Only Fields (NEVER touched by this UI)
`role`, `capabilities`, `restrictions`, `walletId`, `kycStatus`, `isMinor`, `isBanned`,
`accountType`, `createdAt`, `guardianUid`, `bannedAt`, `suspendedAt`, `deletedAt`

Firestore rules enforce this independently — the `update` rule blocks any write
that touches these fields even if the UI tried.

---

## 5. Privacy Sync Verification (Live Test)

### Test performed by browser subagent:
1. Navigated to `/settings` → clicked "تعديل الملف الشخصي".
2. On `/settings/edit-profile`:
   - Form pre-populated from `users/{uid}` via `usePrivateProfile` hook.
   - Updated displayName and bio.
   - Set mood privacy to `private` → saved → confirmed mood disappeared from `/me` (publicProfiles) within ~7 seconds.
   - Reset mood privacy to `public` → saved → confirmed mood reappeared in `/me`.
3. `onUserProfileUpdate` Cloud Function triggered correctly on every `users/{uid}` write.

### Sync latency observed: ~5–10 seconds (Gen1 Firestore trigger, europe-west1).

---

## 6. Route Map

```
/settings                →  SettingsPage (hub menu)
/settings/edit-profile   →  EditProfilePage (owner edit + privacy config)
```

Both routes require auth (`RequireAuth` wrapper in `AppRouter`).

---

## 7. UX Features

- **Sync notice**: Warns user that public profile updates after 5–10 seconds (sets correct expectations for CF latency).
- **Private mood warning**: When mood privacy is set to `private`, a yellow hint renders inline explaining the section will disappear from the public profile.
- **Save state machine**: `idle → saving → saved | error` with spinner and banner feedback.
- **"View Public Profile" button**: Quick navigation to `/me` to verify the public projection after saving.
- **Back button**: Returns to previous route (`navigate(-1)`).
- **Responsive**: Two-column privacy grid collapses to single column on mobile.
- **RTL**: Fully RTL-first, matching the platform's Arabic design direction.

---

## 8. Next Steps

1. **Phase 5-C-2** (optional): Avatar/cover image upload to Firebase Storage.
2. **Phase 5-D**: Capability-gated publishing logic (Cloud Function permission checks).
3. **Phase 5-E**: Legacy Stitch screen migration to current app shell.
