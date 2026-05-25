# Sound Platform — Pre-Modules Foundation Checkpoint
**Date**: 2026-05-20
**Branch**: `main`
**Firebase project**: `sound-platform-dev`
**Live URL**: https://sound-platform-dev.web.app
**Last deploy**: hosting only — `firebase deploy --only hosting --project sound-platform-dev`
**Status**: UI Foundation complete. Backend modules not yet started.

---

## Safe Exit Checks

| Check | Result |
|-------|--------|
| Repo root | `C:\Users\akram\Downloads\Sound\sound-platform` ✅ |
| Branch | `main` ✅ |
| `.firebaserc` default | `sound-platform-dev` ✅ |
| Last deploy scope | `--only hosting` ✅ — no Functions/Firestore/rules deployed today |
| Firebase Functions changes | Modified locally but NOT deployed this session ✅ |
| Firestore schema changes | None this session ✅ |
| Background tasks still running | None ✅ |

### git status --short (untracked new files are UI foundation work not yet committed)

Modified (M): AppHeader, BottomNav, AppLayout, pages/*, router/AppRouter.tsx, global.css, firebase.json, functions/src/*, packages/shared/*, scripts/seed-dev.ts

Untracked (??): FilterDropdown, account/AccountControlHub, constants/, WorldNavContext, pages/discover/, pages/home/, pages/live/, pages/me/, pages/create/, GeneralHomePage, docs/checkpoints, qa_hub.cjs

> RECOMMENDATION: `git add -A && git commit -m "feat(5-G): UI foundation complete — all screens, nav, privacy, world colors"` before starting backend modules.

---

## 1. Accepted Foundation Screens

### Home × 5 worlds
| World | File | Status |
|-------|------|--------|
| عام | GeneralHomePage.tsx | ✅ |
| بلس | home/PlusHomePage.tsx | ✅ |
| موسيقى | home/MusicHomePage.tsx | ✅ |
| راديو | home/RadioHomePage.tsx | ✅ |
| مسابقات | home/TournamentsHomePage.tsx | ✅ |

### Discover × 5 worlds
| World | File | Status |
|-------|------|--------|
| عام | discover/GeneralDiscoverPage.tsx | ✅ |
| بلس | discover/PlusDiscoverPage.tsx | ✅ |
| موسيقى | discover/MusicDiscoverPage.tsx | ✅ |
| راديو | discover/RadioDiscoverPage.tsx | ✅ |
| مسابقات | discover/TournamentsDiscoverPage.tsx | ✅ |

### Live × 5 worlds
| World | File | Status |
|-------|------|--------|
| عام | LivePage.tsx (fallback) | ✅ functional |
| بلس | LivePage.tsx (fallback) | ✅ functional |
| موسيقى | live/MusicLivePage.tsx | ✅ accepted |
| راديو | LivePage.tsx (fallback) | ✅ functional |
| مسابقات | live/TournamentsLivePage.tsx | ✅ accepted |

### Me × 5 worlds
| World | File | Tabs |
|-------|------|------|
| عام | me/GeneralMePage.tsx | المحتوى · بودكاست · ترنداتي · مزاجي · المحفوظات · الإعادات · الرحلات/الجلسات · المفضلة · السجل · الاشتراكات |
| بلس | me/PlusMePage.tsx | Same as عام |
| موسيقى | me/MusicMePage.tsx | أغاني · ألبومات · شركات الإنتاج · ترنداتي · مزاجي · المحفوظات · الإعادات · الاشتراكات · الرحلات/الجلسات · المفضلة · الأخيرة · سجل الاستماع |
| راديو | me/RadioMePage.tsx | إذاعتي (always first) · البرامج · فريق العمل · الجدول · تواصل معنا · من نحن · أعلن معنا · المفضلة · المحفوظات · الإعادات · سجل الاستماع |
| مسابقات | me/TournamentsMePage.tsx | 16 tabs: مسابقاتي · الإدارة النشطة · المشاركات المستلمة · التصويت والتحكيم · النتائج/الفائزون · الدعوات/المغلقة · المنضم لها · مشاركاتي · التصويت الآن · أصواتي · الجوائز/الميداليات · المحفوظات · المفضلة · الإعادات · السجل · الاشتراكات |

### Global Create Hub
- File: create/GlobalCreateHubPage.tsx ✅
- All 10+ creation types visible (locked items show reason)
- On Road / الرحلات asks for target world (عام / بلس / موسيقى only — راديو and مسابقات excluded)
- Radio = request-only card

### Account Control Hub + Profile Avatar Menu
- Files: components/account/AccountControlHub.tsx + .css ✅
- Opens from AppHeader avatar — no route change
- 6 hub sections: الحساب · الخصوصية · النشاط والمحتوى · الميزات والباقة · الدعم · الإدارة
- Escape/backdrop/close all close hub
- Privacy Center opens inline as nested panel (no route change)

### Privacy Center Foundation
- 13 privacy groups fully implemented ✅
- 5 option models: Audience · Contact · Toggle · Approval · Location ✅
- All values local UI state only — zero Firestore writes ✅
- Foundation note shown: "هذه إعدادات أولية"
- الأطفال والوصي: static server badge, non-clickable, pointer-events: none ✅
- مزاجي = mood playlists from others' content (not daily status) ✅
- الاشتراكات = content from followed/subscribed accounts ✅
- دقة الموقع داخل الرحلات: دقيق / المدينة فقط / مخفي ✅

---

## 2. Accepted Shell / Global Systems

| System | File(s) | Status |
|--------|---------|--------|
| World navigation 5-tab pill | AppHeader.tsx + AppHeader.css | ✅ |
| Bottom navigation 5 glass pills | BottomNav.tsx + BottomNav.css | ✅ |
| World color token inheritance | global.css [data-world] | ✅ |
| WorldNavContext (world + tab routing) | contexts/WorldNavContext.tsx | ✅ |
| AppLayout shell + data-world root | layouts/AppLayout.tsx | ✅ |
| Glass premium navigation | All nav CSS | ✅ |
| FilterDropdown smart filters | FilterDropdown.tsx/.css | ✅ |
| Locked labels constants | constants/lockedLabels.ts | ✅ |
| RTL-first layout | global.css direction:rtl | ✅ |
| Material Symbols RTL icon fix | global.css | ✅ |
| UI Foundation Mode | All Me pages — full tab inventory | ✅ |

### Canonical World Color Table (LOCKED — do not change)
| World | --color-brand | Visual |
|-------|--------------|--------|
| عام (general) | #7c5cfc | Purple |
| بلس (plus) | #f59e0b | Gold |
| موسيقى (music) | #10b981 | Emerald |
| راديو (radio) | #ef4444 | Red |
| مسابقات (tournaments) | #f97316 | Orange (distinct from plus) |

Color flow: AppLayout[data-world] → global.css remaps --color-brand → all components inherit automatically.
BottomNav uses color-mix(var(--color-brand)) — no per-component color maps.

---

## 3. Recent Accepted Fixes (this session — 2026-05-20)

| Fix | Files | Result |
|-----|-------|--------|
| Plus vs Tournaments color | global.css | tournaments #f59e0b → #f97316 ✅ |
| BottomNav inherits world color | BottomNav.css | Removed private [data-world] map; color-mix(--color-brand) ✅ |
| General explicit [data-world] override | global.css | --color-brand: #7c5cfc (was falling back to root #7c3aed) ✅ |
| Music BottomNav was blue | BottomNav.css | Was rgb(59,130,246) — now emerald #10b981 ✅ |
| Radio BottomNav was green | BottomNav.css | Was rgb(34,197,94) — now red #ef4444 ✅ |
| Privacy Foundation 13 groups | AccountControlHub.tsx/.css | Full inventory, server badge ✅ |
| On Road creation card | GlobalCreateHubPage.tsx | World-gate: عام/بلس/موسيقى only ✅ |
| Radio Me — إذاعتي always first | RadioMePage.tsx | Correct tab order ✅ |
| Tournaments Me — 16 tabs | TournamentsMePage.tsx | Correct vocabulary only ✅ |
| Me tabs from authority | GeneralMePage/PlusMePage/MusicMePage | Authority-file tab sets ✅ |

---

## 4. Remaining Before Backend Modules

AUDIT ONLY. Do not fix until real QA bug or backend module is ready.

### Screen Polish Gaps
- General Live, Plus Live, Radio Live → generic LivePage.tsx fallback (no world-specific premium component)
- Radio Home → lacks real station list / schedule UI (placeholder layout)
- CategoryDiscoveryPage.tsx → may need polish after real filter data arrives

### Routing Gaps
- /general/live, /plus/live, /radio/live → fallback, not premium
- profile/:uid → ProfilePage.tsx has limited data binding
- No /notifications route
- No /wallet or /earnings route
- No /messages route
- No /search page (search button exists in AppHeader but goes nowhere)

### Privacy / Schema Gaps (SCHEMA GAP markers in code)
- All 13 privacy groups: UI-only local state, no Firestore reads/writes
- radioProfile.stationPermission — not in publicProfiles/{uid}
- tournamentsProfile.* — entire namespace missing from schema
- generalProfile.likesCount — not yet in schema
- musicProfile.* — falls back to generalProfile
- Guardian/child enforcement — future server module

### Real Data Gaps
- Home feed: all sections are placeholder content (no real queries)
- Discover: shorts feed is placeholder
- Me tabs: all tab content is placeholder (no content queries)
- Listening Now: static/mock
- Stories: no story model or upload flow
- مزاجي mood playlists: no data model
- Reposts / محفوظات / المفضلة: no read layer

### Permission Gates (UI visible, not enforced)
- Create → Live: permission gate shown but not enforced
- Create → Radio station: card shown, no real request flow
- Create → Song/Album: music permission shown, not enforced
- Create → Competition: competitions permission shown, not enforced
- Radio Me → Station management: stationPermission always missing → always shows eligibility panel
- Tournaments Me → Organizer tabs: role-gating blocked by missing tournamentsProfile.roles[]

### Module Connectors Missing
- No real-time listeners (live rooms, active sessions)
- No audio player / mini-player
- No gift/points transaction handler
- No follow/unfollow mutation
- No like/save/repost mutation
- No comment system

### Admin / Runtime Config Gaps
- No feature-flag system wired to UI
- No admin dashboard route
- No content moderation queue
- Ads system not started
- Monetization / wallet not started
- No push notifications

---

## 5. Do Not Touch Again Unless Real QA Bug

| Surface | Rule |
|---------|------|
| Home pages (all 5) | LOCKED. Section inventory matches authority. |
| Discover pages (all 5) | LOCKED. Subnav: اكتشف · لك · المتابعة · الرائج. |
| Live pages (Music + Tournaments) | LOCKED. Others use fallback — do not add more without backend. |
| Me tab inventory (all 5 worlds) | LOCKED. Exact tabs from SOUND_UI_FOUNDATION_AUTHORITY.md. |
| Global Create Hub inventory | LOCKED. 10+ creation types with correct world-gates. |
| Account Control Hub inventory | LOCKED. 6 sections + Privacy Center. |
| Privacy Center 13 groups | LOCKED. All option models. Server badge on child controls. |
| Global navigation labels | IMMUTABLE. عام · بلس · موسيقى · راديو · مسابقات and الرئيسية · اكتشف · إنشاء · لايف · أنا |
| World color tokens | LOCKED in global.css. No per-component overrides. |
| BottomNav pill design | LOCKED. Glass pills, flush to screen, no independent color maps. |

---

## 6. Backend / Modules Starting Point

### Tier 1 — Auth & Profile (prerequisite for everything)
- Real-time auth state → profile data sync to publicProfiles/{uid}
- Display name / avatar / bio / username read layer
- Privacy-filtered public profile projection (Cloud Functions scaffold exists)
- Follow / unfollow graph

### Tier 2 — Content Modules
- Audio content model: upload, metadata, categories, world
- Short content (Discover clips)
- Story model + upload
- Playlist model (مزاجي mood playlists + custom playlists)
- Subscriptions feed (content from followed accounts)

### Tier 3 — Social Layer
- Like / save / repost / bookmark mutations
- Comment system
- Messages / DMs + follow requests
- Gifts + points transactions
- Notifications

### Tier 4 — World-Specific Modules
- On Road / الرحلات — session model, location precision, world-gate
- Radio — station request/approval, programs, schedule (OnNet integration)
- Music rights — artist/production company, rights ownership
- Competitions — create, submit, vote, jury, winners, leaderboard

### Tier 5 — Platform Layer
- Admin dashboard (users, permissions, content moderation, feature flags)
- Ads / promote system
- Monetization / wallet / payouts
- Push notifications
- Analytics / observability

---

## 7. Recommended Next Session Start

**"Pre-modules architecture audit: map UI screens to required backend collections/services without editing code."**

Specifically:
1. publicProfiles/{uid} — what fields are currently written vs. what UI screens need
2. Content collection shape for Home feed queries per world
3. Discover feed / shorts collection
4. Me page tab data sources (saved, reposts, mood, sessions, history)
5. Follow graph collection
6. Privacy settings collection location
7. Session/On Road model
8. Story model

Output: a collection-level data model document listing, per UI screen, what reads/writes/listeners are needed. This becomes the input for Tier 1 and Tier 2 backend module work.

---

## Checkpoint Summary

| Item | Value |
|------|-------|
| Checkpoint file | docs/checkpoint_2026-05-20_pre_modules_foundation.md |
| Git working tree | Uncommitted — recommend commit before modules |
| Last commit | 76ded8e — docs: add safe exit handoff after privacy upgrade |
| Deploy status | Live at https://sound-platform-dev.web.app ✅ |
| Functions deployed | NOT this session (last functions deploy was 5-C) |
| Critical blocker | None |
| Recommended next | Pre-modules architecture audit (no code edits) |

---

*Checkpoint written: 2026-05-20 | Sound Platform Phase 5-G complete | UI Foundation accepted*