# Checkpoint — Phase 5-E: Live Pages Complete
**Date:** 2026-05-18  
**Status:** Safe exit. No running commands.

---

## 1. Deployment Scope

| Item | Value |
|---|---|
| Repo | `C:\Users\akram\Downloads\Sound\sound-platform` |
| Firebase project | `sound-platform-dev` |
| Live URL | `https://sound-platform-dev.web.app` |
| Deploy target | `--only hosting` (static frontend only) |
| Database writes | None |
| Migrations | None |
| Seed scripts | None |
| Functions deploy | None in today's screen work |

**Prove scope before every deploy:**
cwd · repo path · .firebaserc · Firebase project · changed files · deploy target · confirm no DB write unless approved.

---

## 2. Accepted Architecture Rule

- Small screen/page files attached to global connectors.
- No mega-files for new world-specific screens.
- One real screen = one focused file.
- Shared shell / nav / providers stay global.
- Many files are acceptable — bug blast radius stays inside one screen.

---

## 3. Accepted Navigation

- `selectedWorld` + `selectedBottomTab` model (WorldNavContext).
- Switching worlds preserves the bottom tab.
- Bottom active state matches URL.
- Direct URLs restore both world and tab.
- **لايف** is a tab, not a world.
- **مسابقات** is a world — never بطولات.

---

## 4. Accepted Live Pages

All five world Live surfaces accepted:

| World | Status | Notes |
|---|---|---|
| عام (General) | ✓ Accepted | Standard live-room structure |
| بلس (Plus) | ✓ Accepted | Same structure as General + permission gate |
| موسيقى (Music) | ✓ Accepted | Events / concerts / listening parties |
| راديو (Radio) | ✓ Accepted | World-level on-air / schedule surface |
| مسابقات (Tournaments) | ✓ Accepted | Competition / voting / bracket activity |

**Standard filter row (all Live pages):**
```
الحالة | التصنيف | البلد | الترتيب
```

**Smart dropdown behavior accepted:**
- Search inside dropdown
- Multi-select
- Selected chips with X below filters
- استعراض الأصناف button under chips
- RTL option alignment
- 3px radius
- No chip strips

**Files introduced this phase:**
```
apps/web/src/pages/live/MusicLivePage.tsx
apps/web/src/pages/live/MusicLivePage.css
apps/web/src/pages/live/TournamentsLivePage.tsx
apps/web/src/pages/live/TournamentsLivePage.css
apps/web/src/pages/LivePage.tsx        ← routing hub (modified, not rewritten)
apps/web/src/pages/LivePage.css        ← shared structural classes
apps/web/src/components/FilterDropdown.tsx
apps/web/src/components/FilterDropdown.css
```

---

## 5. Next Priority — World-Scoped Home Pages

- Home pages are **not accepted** — all worlds still show the same Home content.
- Next work: world-scoped Home behavior, one world at a time.
- New world Home screens must be **separate page/component files**.
- Use old/new screen source material as content inventory, not just visual inspiration.
- Live implementation is accepted enough to move on; not necessarily final polish.

**Suggested order:**
1. عام Home
2. موسيقى Home
3. راديو Home
4. بلس Home
5. مسابقات Home

---

## 6. Unresolved Reminders

| Item | State |
|---|---|
| Me pages — world-scoped content/tabs | Deferred (owner header controls accepted) |
| Full privacy UI | Incomplete |
| EditProfilePage — old privacy normalization | Compatibility shim still present |
| Real backend data wiring | Future work |
| Audio upload / copyright / temp entity flow | Future work |
| Admin configurability | Planned / groundwork only |
