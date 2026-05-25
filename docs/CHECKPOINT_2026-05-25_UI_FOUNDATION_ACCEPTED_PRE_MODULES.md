# Sound Platform — UI Foundation Accepted: Pre-Modules Checkpoint
**Date**: 2026-05-25  
**Branch**: main  
**Firebase project**: sound-platform-dev  
**Live URL**: https://sound-platform-dev.web.app  
**Commit message**: `checkpoint: accept UI foundation before backend modules`

---

> [!IMPORTANT]
> **No backend modules are implemented yet.**  
> This checkpoint captures only the accepted UI foundation baseline.  
> Backend module work begins after this commit.

> [!CAUTION]
> **Do not rework accepted UI foundation screens unless Akram explicitly reopens them.**  
> All surfaces listed below are locked. Any change requires explicit approval.

---

## Platform Identity

| Property | Value |
|----------|-------|
| Platform | Sound — Arabic-first audio social platform |
| Primary language | Arabic RTL |
| Target platform | React Native (current web is the pre-RN foundation) |
| Five worlds | **عام \| بلس \| موسيقى \| راديو \| مسابقات** |
| Bottom navigation | **الرئيسية \| اكتشف \| إنشاء \| لايف \| أنا** |
| World color system | Canonical in `global.css [data-world]` — all components inherit via `--color-brand` |

### Canonical World Colors (locked — do not change)

| World | `--color-brand` | `--color-brand-light` |
|-------|----------------|-----------------------|
| عام (general) | `#7c5cfc` | `#c4b5fd` |
| بلس (plus) | `#f59e0b` | `#fbbf24` |
| موسيقى (music) | `#10b981` | `#6ee7b7` |
| راديو (radio) | `#ef4444` | `#fca5a5` |
| مسابقات (tournaments) | `#f97316` | `#fdba74` |

---

## Accepted UI Foundation Surfaces

### App Shell — Global Systems ✅ LOCKED

| Component | File(s) | Status |
|-----------|---------|--------|
| AppHeader — world 5-tab pill + avatar | `AppHeader.tsx` + `AppHeader.css` | ✅ Accepted |
| BottomNav — 5 glass pills, world-color-aware | `BottomNav.tsx` + `BottomNav.css` | ✅ Accepted |
| AppLayout — `data-world` root, RTL | `AppLayout.tsx` + `AppLayout.css` | ✅ Accepted |
| WorldNavContext — world + tab routing | `contexts/WorldNavContext.tsx` | ✅ Accepted |
| AppRouter — 44 routes, 5 worlds × 5 tabs | `router/AppRouter.tsx` | ✅ Accepted |
| Global design tokens | `styles/global.css` | ✅ Accepted |
| FilterDropdown smart filters | `FilterDropdown.tsx` + `FilterDropdown.css` | ✅ Accepted |
| Locked labels constants | `constants/lockedLabels.ts` | ✅ Accepted |

### Home × 5 Worlds ✅ LOCKED

| World | File | Data state |
|-------|------|-----------|
| عام | `pages/GeneralHomePage.tsx` | Placeholder — no real feed |
| بلس | `pages/home/PlusHomePage.tsx` | Placeholder |
| موسيقى | `pages/home/MusicHomePage.tsx` | Placeholder |
| راديو | `pages/home/RadioHomePage.tsx` | Placeholder |
| مسابقات | `pages/home/TournamentsHomePage.tsx` | Placeholder |

### Discover × 5 Worlds ✅ LOCKED

| World | File | Data state |
|-------|------|-----------|
| عام | `pages/discover/GeneralDiscoverPage.tsx` | Placeholder |
| بلس | `pages/discover/PlusDiscoverPage.tsx` | Placeholder |
| موسيقى | `pages/discover/MusicDiscoverPage.tsx` | Placeholder |
| راديو | `pages/discover/RadioDiscoverPage.tsx` | Placeholder |
| مسابقات | `pages/discover/TournamentsDiscoverPage.tsx` | Placeholder |

Subnav tabs (all worlds): **اكتشف · لك · المتابعة · الرائج**

### Live × 5 Worlds ✅ LOCKED

| World | File | Notes |
|-------|------|-------|
| عام | `pages/LivePage.tsx` (fallback) | Generic — no premium component yet |
| بلس | `pages/LivePage.tsx` (fallback) | Generic |
| موسيقى | `pages/live/MusicLivePage.tsx` | ✅ World-specific |
| راديو | `pages/LivePage.tsx` (fallback) | Generic |
| مسابقات | `pages/live/TournamentsLivePage.tsx` | ✅ World-specific |

### Me × 5 Worlds ✅ LOCKED

| World | File | Key tabs |
|-------|------|---------|
| عام | `pages/me/GeneralMePage.tsx` | المحتوى · ترنداتي · مزاجي · المحفوظات · الإعادات · الرحلات/الجلسات · الاشتراكات |
| بلس | `pages/me/PlusMePage.tsx` | Same as عام |
| موسيقى | `pages/me/MusicMePage.tsx` | أغاني · ألبومات · شركات الإنتاج · مزاجي · سجل الاستماع |
| راديو | `pages/me/RadioMePage.tsx` | إذاعتي (always first) · البرامج · الجدول · فريق العمل |
| مسابقات | `pages/me/TournamentsMePage.tsx` | 16 tabs — مسابقاتي · التصويت والتحكيم · الجوائز/الميداليات |

All Me tab inventories are authoritative per `docs/SOUND_UI_FOUNDATION_AUTHORITY.md`.  
**Tab vocabulary is locked. Do not rename, remove, or reorder tabs.**

### Global Create Hub ✅ LOCKED

| File | Notes |
|------|-------|
| `pages/create/GlobalCreateHubPage.tsx` | All creation types with world gates |

- 10+ creation types with lock/reason display
- On Road world-gated: **عام / بلس / موسيقى** only — راديو and مسابقات excluded
- Radio = request-only card (no direct creation)
- All creation cards are UI-only — no upload or recording flow yet

### Account Control Hub ✅ LOCKED

| File | Notes |
|------|-------|
| `components/account/AccountControlHub.tsx` | Modal overlay from AppHeader avatar |
| `components/account/AccountControlHub.css` | Premium glass styling |

- Opens from AppHeader avatar — **no route change**
- 6 sections: الحساب · الخصوصية · النشاط والمحتوى · الميزات والباقة · الدعم · الإدارة
- Escape / backdrop / close button all close the hub
- Privacy Center opens inline as nested panel

### Privacy Center Foundation ✅ LOCKED

- 13 privacy groups — full Sound privacy inventory
- 5 option models: Audience · Contact · Toggle · Approval · Location
- **ALL local `useState` only — zero Firestore reads or writes**
- Foundation note displayed: "هذه إعدادات أولية"
- الأطفال والوصي rows: static server badge, `pointer-events: none`, non-interactive

**Privacy groups (all 13):**  
الملف والهوية · القصص ودائرة الصورة · الاستماع الآن · مزاجي · المحفوظات · الإعادات · الاشتراكات · الرحلات / الجلسات · الرسائل والتواصل · الهدايا والنقاط · الظهور في اكتشف · الأطفال والوصي · الحظر والكتم

---

## Confirmed Shared Types (packages/shared)

| File | Contents |
|------|---------|
| `packages/shared/src/profile.ts` | `UserPrivateDoc`, `PublicProfileDoc`, `PrivacySettings`, `SectionPrivacy`, 21 `PrivacySection` values, migration helpers |
| `packages/shared/src/permissions.ts` | `WorldId`, `ContentTypeId`, `CapabilityModule`, `PermissionKey`, `WORLD_PUBLISHING_RULES`, `ActiveRestriction` |

---

## Confirmed Firebase / Functions State

| Item | Status |
|------|--------|
| Firebase project | `sound-platform-dev` |
| Firestore rules | Previously deployed — unchanged this session |
| Cloud Functions | `onUserCreate` + `onUserProfileUpdate` — modified locally, **not deployed this session** |
| Hosting | `apps/web/dist` — last deployed 2026-05-20 (Phase 5-G privacy foundation) |
| Last `--only hosting` deploy | 2026-05-20 |

---

## What Is NOT Implemented (No Backend Modules Yet)

| Area | State |
|------|-------|
| Home feed | Placeholder — no `contentItems` collection |
| Discover shorts feed | Placeholder — no shorts collection or index |
| Privacy settings save | Local state only — no `privacySettings/{uid}` collection |
| Follow / unfollow | No `follows` collection |
| Saved / Reposts | No `savedItems` or `reposts` collections |
| Stories | No `stories` collection |
| On Road sessions | No `sessions` collection |
| Live rooms | No `liveRooms` collection — no RTC provider selected |
| Radio stations | No `radioStations` or `radioRequests` collections |
| Competitions | No `competitions` collection |
| Audio upload | No media pipeline |
| Wallet / gifts | No `wallets` collection |
| Notifications / messages | No collections — no routes |
| Search | No search index — search button goes nowhere |
| Admin dashboard | No admin routes |

---

## Accepted Fixes Included in This Checkpoint

| Fix | Files |
|-----|-------|
| Plus vs Tournaments color separation | `global.css` — tournaments `#f97316` ≠ plus `#f59e0b` |
| BottomNav unified world color | `BottomNav.css` — `color-mix(var(--color-brand))`, no private color map |
| General world explicit `[data-world]` override | `global.css` |
| Privacy Foundation — 13 groups | `AccountControlHub.tsx/.css` |
| On Road creation card with world gate | `GlobalCreateHubPage.tsx` |
| Radio Me — إذاعتي always first tab | `RadioMePage.tsx` |
| Tournaments Me — 16 tabs, locked vocabulary | `TournamentsMePage.tsx` |
| Music Me — أغاني/ألبومات/شركات الإنتاج | `MusicMePage.tsx` |
| World color inheritance audit | `AppHeader.css`, `BottomNav.css`, `global.css` |

---

## Confirmed Next Backend Task

> **Profile + PublicProfile + Privacy schema foundation**

### Scope of next task:
1. Wire Edit Profile → `users/{uid}` Firestore write (display name, username, bio, avatar URL, country)
2. Confirm `onUserProfileUpdate` Cloud Function rebuilds `publicProfiles/{uid}` with full field set
3. Wire Me page header and `profile/:uid` to READ `publicProfiles/{uid}` — real data
4. Create `privacySettings/{uid}` document on first Privacy Center save
5. Wire Privacy Center → Firestore save
6. Update `buildPublicProfile` to enforce `followers` / `onlyMe` / `friends` / `custom` audiences

**Authority**: `docs/PRE_MODULES_ARCHITECTURE_AUDIT_2026-05-25.md` — Section 10

---

## Surface Lock Table

| Surface | Lock status |
|---------|-------------|
| Home pages (all 5) | 🔒 LOCKED |
| Discover pages (all 5) | 🔒 LOCKED |
| Live pages (Music + Tournaments specific) | 🔒 LOCKED |
| Live pages (General / Plus / Radio fallback) | 🔒 LOCKED — upgrade only after backend ready |
| Me tab inventory (all 5 worlds) | 🔒 LOCKED — tab vocabulary immutable |
| Global Create Hub inventory | 🔒 LOCKED |
| Account Control Hub — 6 sections | 🔒 LOCKED |
| Privacy Center — 13 groups + 5 option models | 🔒 LOCKED |
| Global navigation labels | 🔒 IMMUTABLE — عام·بلس·موسيقى·راديو·مسابقات and الرئيسية·اكتشف·إنشاء·لايف·أنا |
| World color tokens | 🔒 LOCKED in `global.css` — no per-component overrides |
| BottomNav pill design | 🔒 LOCKED — glass pills, no independent color maps |

---

*Checkpoint written: 2026-05-25 | Sound Platform — UI Foundation complete | Pre-backend-modules baseline*
