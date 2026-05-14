# Phase 5-C-2: Dedicated Privacy Settings UI

**Status:** ✅ DEPLOYED AND VERIFIED LIVE  
**Date:** 2026-05-14  
**Firebase project:** sound-platform-dev  
**Live URL:** https://sound-platform-dev.web.app

---

## 1. Objective

Create a dedicated privacy settings page at `/settings/privacy` that gives users a
single, clear place to control section-level visibility for all 12 profile sections —
decoupled from the Edit Profile flow.

---

## 2. Files Created / Modified

### New Files
| File | Purpose |
|---|---|
| `apps/web/src/pages/PrivacySettingsPage.tsx` | Dedicated privacy control page |
| `apps/web/src/pages/PrivacySettingsPage.css` | Dark-mode RTL styles |

### Modified Files
| File | Change |
|---|---|
| `apps/web/src/pages/SettingsPage.tsx` | Added "إعدادات الخصوصية" menu item (enabled, route=/settings/privacy) |
| `apps/web/src/router/AppRouter.tsx` | Added `/settings/privacy` route + import |

---

## 3. Privacy Sections Controlled (all 12)

| Key | Label | Group |
|---|---|---|
| `generalProfile` | الملف العام | هوية |
| `mood` | الحالة المزاجية | هوية |
| `activityStatus` | حالة النشاط | هوية |
| `pinnedContent` | المحتوى المثبَّت | هوية |
| `achievements` | الإنجازات والشارات | هوية |
| `listeningActivity` | نشاط الاستماع | نشاط |
| `followedRadioStations` | محطات الراديو المتابَعة | نشاط |
| `followedRadioStationLists` | قوائم الراديو المتابَعة | نشاط |
| `musicPlaylists` | قوائم التشغيل | نشاط |
| `plusCreatorContent` | محتوى Plus | منشئ |
| `musicCreatorContent` | محتوى الموسيقى | منشئ |
| `radioCreatorContent` | محتوى الراديو | منشئ |

**Note:** `generalProfile` is shown with `alwaysPublic=true` — the segmented
control is visually disabled because the general section is always visible.

---

## 4. Privacy Model (Phase 4-H-2 — Enforced)

```
✅ Reads from:   users/{currentUser.uid}  (usePrivateProfile hook, owner-only)
✅ Writes to:    users/{currentUser.uid}  (only privacy.* dot-path fields)
❌ NEVER reads:  users/{otherUid}         (Firestore rules deny)
❌ NEVER writes: publicProfiles/{uid}     (Cloud Function only — rules deny)
```

The write payload is EXCLUSIVELY `privacy.*` dot-path fields:
```
privacy.generalProfile, privacy.mood, privacy.activityStatus,
privacy.listeningActivity, privacy.followedRadioStations,
privacy.followedRadioStationLists, privacy.musicPlaylists,
privacy.pinnedContent, privacy.achievements,
privacy.plusCreatorContent, privacy.musicCreatorContent,
privacy.radioCreatorContent
```

No other fields of `users/{uid}` are touched.

---

## 5. UI Features

- **Segmented 3-way control** per section: عام 🌐 / المتابعون 👥 / أنا فقط 🔒
- **Color-coded** active states: green (public), yellow (followers), red (private)
- **Grouped sections**: Identity / Activity / Creator
- **Sync notice**: explains 5–10 second Cloud Function sync latency
- **Privacy legend**: at top of page showing all 3 levels
- **Save state machine**: idle → saving → saved / error
- **Success/error banners** with specific messages
- **"View Public Profile" button**: quick jump to `/me` to verify projection
- **Back button**: navigates to previous route
- **Fully RTL** and **mobile-responsive**

---

## 6. Sync Verification Flow

When user saves:
1. `updateDoc(users/{uid}, { 'privacy.*': ... })` fires.
2. `onUserProfileUpdate` Cloud Function triggers (Gen1, europe-west1).
3. `buildPublicProfileFromUser` rebuilds `publicProfiles/{uid}` from scratch.
4. Sections with `privacy: 'private'` or `privacy: 'followers'` are **absent** from the projection — not empty, not null, fully absent.
5. `publicProfiles/{uid}` is updated within ~5–10 seconds.

---

## 7. Route Map (updated)

```
/settings                →  SettingsPage (hub — 2 enabled items now)
/settings/edit-profile   →  EditProfilePage (basic info + mood)
/settings/privacy        →  PrivacySettingsPage  ← NEW
/settings/account        →  coming soon
/settings/notifications  →  coming soon
/settings/plus           →  coming soon
```

---

## 8. Validation Results

| Check | Result |
|---|---|
| `firebase login:list` | akrammoftahyt@gmail.com ✅ |
| `firebase use` | sound-platform-dev ✅ |
| `npx tsc --noEmit` | 0 errors ✅ |
| `npm run build` | 97 modules, no warnings ✅ |
| Secret scan | No secrets found ✅ |
| `firebase deploy --only hosting` | Deploy complete ✅ |
| Git commit | feat: add dedicated privacy settings page ✅ |
| GitHub push | ✅ |

---

## 9. Next Steps

1. **Phase 5-C-3** (optional): Avatar / cover image upload to Firebase Storage.
2. **Phase 5-D**: Capability-gated publishing logic (Cloud Function permission checks).
3. **Phase 5-E**: Legacy Stitch screen migration to new app shell.
