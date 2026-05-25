# Sound Platform — Pre-Modules Architecture Audit
**Date**: 2026-05-25  
**Branch**: main  
**Firebase project**: sound-platform-dev  
**Status**: UI Foundation complete. Zero backend modules started. Audit only — no code changed.

---

## Safe Start Confirmation

| Check | Result |
|-------|--------|
| Repo root | `C:\Users\akram\Downloads\Sound\sound-platform` ✅ |
| Branch | `main` ✅ |
| `.firebaserc` default | `sound-platform-dev` ✅ |
| No commands running | ✅ |
| No code changes made | ✅ |
| No deploy triggered | ✅ |

`git status`: 28 modified tracked files + 17 untracked new files — all UI foundation work, uncommitted but live via `dist/`.

---

## 1. Current Accepted UI Foundation

### Home × 5 worlds ✅
| World | File | Data state |
|-------|------|-----------|
| عام | GeneralHomePage.tsx | Placeholder |
| بلس | home/PlusHomePage.tsx | Placeholder |
| موسيقى | home/MusicHomePage.tsx | Placeholder |
| راديو | home/RadioHomePage.tsx | Placeholder |
| مسابقات | home/TournamentsHomePage.tsx | Placeholder |

### Discover × 5 worlds ✅
All placeholder — no real shorts/feed queries wired.

### Live × 5 worlds ✅
- عام / بلس / راديو → LivePage.tsx (generic fallback — not premium)
- موسيقى → live/MusicLivePage.tsx
- مسابقات → live/TournamentsLivePage.tsx

### Me × 5 worlds ✅
| World | File | Key tabs |
|-------|------|---------|
| عام | me/GeneralMePage.tsx | المحتوى · ترنداتي · مزاجي · المحفوظات · الإعادات · الرحلات/الجلسات · الاشتراكات |
| بلس | me/PlusMePage.tsx | Same as عام |
| موسيقى | me/MusicMePage.tsx | أغاني · ألبومات · شركات الإنتاج · مزاجي · سجل الاستماع |
| راديو | me/RadioMePage.tsx | إذاعتي (always first) · البرامج · الجدول · فريق العمل |
| مسابقات | me/TournamentsMePage.tsx | 16 tabs: مسابقاتي · الإدارة النشطة · التصويت والتحكيم · الجوائز/الميداليات |

### Global Create Hub ✅
- create/GlobalCreateHubPage.tsx — 10+ creation types
- On Road world-gated: عام / بلس / موسيقى only (راديو and مسابقات excluded)
- Radio = request-only card

### Account Control Hub ✅
- components/account/AccountControlHub.tsx
- 6 sections: الحساب · الخصوصية · النشاط والمحتوى · الميزات والباقة · الدعم · الإدارة
- Opens from AppHeader avatar, no route change

### Privacy Center Foundation ✅
- 13 privacy groups, 5 option models (Audience / Contact / Toggle / Approval / Location)
- ALL local useState only — zero Firestore reads or writes
- الأطفال والوصي: static server badge, `pointer-events: none`, non-interactive

### App Shell ✅
- AppHeader: 5-tab world pill + avatar → hub
- BottomNav: 5 glass pills, world-color-aware via `color-mix(var(--color-brand))`
- WorldNavContext: world + tab routing
- Canonical world colors in `global.css [data-world]`

---

## 2. Screen → Module Mapping

### HOME `/:worldId/home`
| Field | Value |
|-------|-------|
| Files | GeneralHomePage, PlusHomePage, MusicHomePage, RadioHomePage, TournamentsHomePage |
| Required module | Feed / Recommendation service |
| Required collections | `contentItems/{id}`, `publicProfiles/{uid}`, `follows/{uid}/following`, `categories/{categoryId}` |
| Required permissions | `view_published_content` — open to all authenticated users |
| UI assumptions | All carousels (Trending, For You, Top Creators) are placeholder mock data |
| Schema gaps | No feed query, no category taxonomy collection, no trending algorithm, no country field on content |

### DISCOVER `/:worldId/discover`
| Field | Value |
|-------|-------|
| Files | GeneralDiscoverPage, PlusDiscoverPage, MusicDiscoverPage, RadioDiscoverPage, TournamentsDiscoverPage |
| Required module | Shorts / Discover feed service |
| Required collections | `contentItems/{id}` [type=short], `discoverFeed/{uid}` (personalised cache) |
| Required permissions | `view_published_content` — open |
| UI assumptions | Vertical swipe feed is fully placeholder — no real items |
| Schema gaps | No shorts collection, no world-scoped feed index, no swipe/skip signal tracking, 4 sub-tabs need separate query logic |

### LIVE `/:worldId/live`
| Field | Value |
|-------|-------|
| Files | LivePage (fallback), MusicLivePage, TournamentsLivePage |
| Required module | Live Audio service (Agora / LiveKit — undecided) |
| Required collections | `liveRooms/{roomId}`, `liveRooms/{roomId}/speakers`, `liveRooms/{roomId}/comments`, `liveRooms/{roomId}/gifts` |
| Required permissions | `view_live_sessions` (open), `create_live_general`, `organize_tournament` |
| UI assumptions | No real-time connection, no room list, no audio player |
| Schema gaps | Full `liveRooms` collection missing. No room creation flow. No replay model. RTC provider not selected. |

### ME `/:worldId/me`
| Field | Value |
|-------|-------|
| Files | GeneralMePage, PlusMePage, MusicMePage, RadioMePage, TournamentsMePage |
| Required module | Profile service, PublicProfile projection, Content service |
| Required collections | `users/{uid}`, `publicProfiles/{uid}`, `contentItems` (owner filter), `savedItems/{uid}`, `reposts/{uid}`, `follows/{uid}` |
| Required permissions | `view_profiles` (open), `manage_radio_station` (radio tabs), `organize_tournament` (organizer tabs) |
| UI assumptions | All tab content is placeholder — tabs visible per authority file but data is empty |
| Schema gaps | `radioProfile.stationPermission` absent from publicProfiles. `tournamentsProfile.*` namespace missing. `musicProfile.*` falls back to generalProfile. |

### GLOBAL CREATE HUB `/:worldId/create`
| Field | Value |
|-------|-------|
| File | create/GlobalCreateHubPage.tsx |
| Required module | Content publishing service + Media pipeline |
| Required collections | `contentItems/{id}`, `drafts/{uid}/drafts/{draftId}`, `stories/{uid}/active/{storyId}`, `radioRequests/{requestId}` |
| Required permissions | `publish_to_general`, `publish_to_plus`, `upload_music`, `organize_tournament` |
| UI assumptions | All creation cards are UI-only — no actual creation or upload flow exists |
| Schema gaps | No draft model, no upload endpoint, no audio pipeline, no recording session state |

### ON ROAD / الرحلات `(Create card + Me tab)`
| Field | Value |
|-------|-------|
| Required module | On Road / Sessions service |
| Required collections | `sessions/{sessionId}`, `sessions/{sessionId}/waypoints/{waypointId}` |
| Required permissions | `publish_to_general` / `publish_to_plus` / `upload_music` (world-gated) |
| UI assumptions | Location precision UI exists (دقيق / المدينة فقط / مخفي) — zero GPS or location API wired |
| Schema gaps | `sessions` collection entirely missing. No location stream model. راديو and مسابقات correctly excluded. |

### ACCOUNT CONTROL HUB `(modal overlay, no route)`
| Field | Value |
|-------|-------|
| File | AccountControlHub.tsx |
| Required module | Auth service, Profile service |
| Required collections | `users/{uid}` (name/avatar read), `publicProfiles/{uid}` (world read) |
| Required permissions | Authenticated user only |
| Schema gaps | Sign-out works. Edit profile needs confirmed `users/{uid}` write. Remaining sections show "قريباً". |

### PRIVACY CENTER `(nested panel inside Account Control Hub)`
| Field | Value |
|-------|-------|
| File | AccountControlHub.tsx — PrivacyCenterPanel |
| Required module | Privacy service |
| Required collections | `privacySettings/{uid}` (proposed — does not exist yet) |
| Required permissions | Owner only |
| UI assumptions | ALL 13 groups are `useState` local only — zero reads or writes |
| Schema gaps | `privacySettings/{uid}` collection does not exist. `PrivacySettings` type exists in `packages/shared/profile.ts` but no Firestore document. |

---

## 3. Core Backend Modules Needed

### M01 — Auth / Profile / PublicProfile ⚠️ CRITICAL PREREQUISITE
Cloud Functions scaffold exists (`onUserCreate`, `onUserProfileUpdate`). `publicProfiles/{uid}` is built but limited to basic fields. Real-time profile reads not wired to UI. Username and avatar display from FirebaseAuth object only — no Firestore fields projected. Privacy-filtered projection currently binary (public / onlyMe only).

**Needs**: Complete `users/{uid}` → `publicProfiles/{uid}` projection. Real display name, avatar URL, bio, username, world-scoped stats, follower/following counts.

### M02 — Privacy Schema
`PrivacySettings` type is fully defined in `packages/shared/profile.ts`. UI has 13 groups. Zero Firestore reads or writes. `buildPublicProfile` only gates on `public` audience.

**Needs**: `privacySettings/{uid}` collection. Privacy Center → Firestore write. `buildPublicProfile` must respect `followers`, `friends`, `custom`, `onlyMe` audiences per section.

### M03 — Social Graph (follow / block / mute)
No follow collection exists. Follow button on profiles has no backend. Block/mute have no collections. Privacy enforcement for `followers` audience cannot work until this exists.

**Needs**: `follows/{uid}/following/{targetUid}`, `follows/{uid}/followers/{sourceUid}`, `blocks/{uid}/blocked/{targetUid}`, `mutes/{uid}/muted/{targetUid}`.

### M04 — ContentItems Base Model
`ContentTypeId` is defined in `permissions.ts`. No `contentItems` Firestore collection exists. No schema for title / description / category / country / world / type / privacy / audio asset reference.

**Needs**: `contentItems/{contentId}` with full metadata. `drafts/{uid}/drafts/{draftId}`.

### M05 — Upload / Record / Media Pipeline
Infrastructure doc describes 10-step pipeline. Zero implemented. No upload endpoint, no temp storage, no transcoder, no CDN URL generation, no waveform, no captions transcription.

**Needs**: Cloud Storage bucket + upload policy. Cloud Run or Cloud Function transcoder trigger. CDN URL resolver. Waveform generator.

### M06 — Stories
Story creation cards visible in Create Hub. No `stories` collection. No story expiry (24h TTL). No story viewer tracking. No story ring on profiles.

**Needs**: `stories/{uid}/active/{storyId}`. Cloud Function for 24h expiry. Story ring projection in `publicProfiles`.

### M07 — Shorts / Discover Feed
Discover UI exists for all 5 worlds. No data. No For You algorithm. No Following feed query. No Trending feed. No signal tracking.

**Needs**: `contentItems` filtered by `type=short` and `world`. Feed index per world. Listen/skip/save signal capture.

### M08 — Playlists / قوائمي
Concept in SRS. No collection. No default-playlist creation on signup. No privacy-per-playlist. No item reorder.

**Needs**: `playlists/{uid}/lists/{playlistId}`, `playlistItems/{playlistId}/items/{itemId}`.

### M09 — Mood / مزاجي ⚠️ PRODUCT DECISION NEEDED
مزاجي tab exists. Description says "mood playlists built from others' content." Unclear model: auto-generated from listen history? User-assembled curation? Needs product decision before schema is created.

**Needs**: Product clarification first. Then likely: `moodPlaylists/{uid}/lists/{playlistId}` with `sourceContentId` references to others' items.

### M10 — Saved / المحفوظات
Tab in Me. Privacy group exists in Privacy Center. No collection. No save mutation.

**Needs**: `savedItems/{uid}/items/{contentId}`.

### M11 — Reposts / الإعادات
Tab in Me. Privacy group exists. No collection. No repost mutation.

**Needs**: `reposts/{uid}/items/{contentId}`.

### M12 — Subscriptions / الاشتراكات
Tab in Me. Defined as content from followed accounts. No query exists. Requires M03 (follows graph) and M04 (contentItems).

**Needs**: Subscription feed = `contentItems` query where `owner IN follows/{uid}/following`. No separate collection needed — it is a derived query.

### M13 — On Road / الرحلات / الجلسات
Create card with world gate. Me tab in General / Plus / Music. Location precision in privacy group. No sessions collection. No GPS integration.

**Needs**: `sessions/{sessionId}` with waypoints, world, privacy, participants. Location API integration (native GPS in React Native — web GPS is a polyfill only).

### M14 — Live
MusicLivePage and TournamentsLivePage implemented (UI). General / Plus / Radio use fallback. No `liveRooms` collection. No RTC provider selected. No real-time connection.

**Needs**: RTC provider decision (Agora vs LiveKit vs Twilio). `liveRooms/{roomId}` + sub-collections. Guest request, gift, comment, replay models.

### M15 — Radio Station Request + Station Profile + Station Player
RadioMePage shows إذاعتي tab. Request card in Create Hub. No `radioRequests` or `radioStations` collection. No OnNet integration. No stream player.

**Needs**: `radioRequests/{requestId}`, `radioStations/{stationId}`, `radioStations/{stationId}/programs`. OnNet API contract must be established first.

### M16 — Competitions / Tournaments
TournamentsMePage with 16 tabs. Create hub card. No `competitions` collection. No submissions, votes, jury scores, prizes, leaderboard.

**Needs**: `competitions/{competitionId}`, `competitionSubmissions/{competitionId}/submissions/{uid}`, `votes/{competitionId}/audience/{uid}`, `juryScores/{competitionId}/jury/{uid}`.

### M17 — Music Rights / Artists / Production Companies
MusicMePage has أغاني / ألبومات / شركات الإنتاج tabs. No music rights model. No artist entity. No production company entity. Songs can have multiple artists + multiple companies.

**Needs**: `musicArtists/{artistId}`, `productionCompanies/{companyId}`, `songRights/{songId}/artists`. Legal review required for rights ownership model.

### M18 — Ads / Promote (Phase 4)
SRS section 15. No ad collections. Entire module missing. Must wait for content + user models.

**Needs**: `adCampaigns/{campaignId}`, `adPlacements`, `adImpressions`, `adClicks`. Phase 4 per infra plan.

### M19 — Wallet / Gifts / Points (Phase 3)
SRS section 14. Privacy groups for gifts/points exist. No wallet collection. No gift transactions. No payout.

**Needs**: `wallets/{uid}`, `walletTransactions/{uid}/transactions/{txId}`, `payoutRequests/{requestId}`. Payment compliance review required.

### M20 — Notifications / Messages
Account Hub has notification and messaging sections (marked قريباً). No `/notifications` or `/messages` routes. No collections.

**Needs**: `notifications/{uid}/items/{notifId}`, `conversations/{conversationId}/messages/{msgId}`, `conversationMembers/{conversationId}/members/{uid}`.

### M21 — Search / Categories / Countries
Search button in AppHeader goes nowhere. Category filter chips in Home are placeholder. No search index.

**Needs**: `categories/{categoryId}`, `subcategories/{subcategoryId}`, `countries/{countryCode}`. Search requires dedicated search service (OpenSearch / Meilisearch / Algolia) — Firestore cannot do full-text search.

### M22 — Admin Config / Permissions / Feature Flags
SRS section 18. Permission model typed in `packages/shared`. No admin dashboard route. No feature flag collection. No permission override system.

**Needs**: `adminConfig/global`, `featureFlags/{flagId}`, `modifiedUserOverrides/{uid}`, `moderationQueue/{itemId}`.

---

## 4. Collection Draft Map

### Identity & Auth
| Collection | Purpose | Owner | Read | Write | Key screens |
|-----------|---------|-------|------|-------|------------|
| `users/{uid}` | Private: raw profile, capabilities, restrictions, privacy config | Firebase Auth uid | Owner + Admin SDK only | Owner (edit profile) + Admin SDK | Account Hub, Settings, Edit Profile |
| `publicProfiles/{uid}` | Public projection — built by Cloud Function | Cloud Function | Any authenticated | Cloud Function (Admin SDK) only | All profile views, Me pages, Home carousels |
| `privacySettings/{uid}` | Full 13-section privacy settings map | Firebase Auth uid | Owner only | Owner only | Privacy Center |

### Social Graph
| Collection | Purpose | Owner | Read | Write | Key screens |
|-----------|---------|-------|------|-------|------------|
| `follows/{uid}/following/{targetUid}` | Users this person follows | uid | Any authenticated | Owner only | Me/Subscriptions, Profile follow button |
| `follows/{uid}/followers/{sourceUid}` | Users following this person | uid | Any authenticated | Cloud Function only (triggered by follow) | Profile follower count |
| `blocks/{uid}/blocked/{targetUid}` | Blocked accounts list | uid | Owner only | Owner only | Privacy Center / block section |
| `mutes/{uid}/muted/{targetUid}` | Muted accounts list | uid | Owner only | Owner only | Privacy Center / mute section |

### Content
| Collection | Purpose | Owner | Read | Write | Key screens |
|-----------|---------|-------|------|-------|------------|
| `contentItems/{contentId}` | All published content: audio, video, shorts | Creator uid | Any authenticated (moderation-filtered) | Owner + admin | Home carousels, Discover feed, Me tabs |
| `drafts/{uid}/drafts/{draftId}` | Unpublished creation drafts | Creator uid | Owner only | Owner only | Create Hub (save/resume draft) |
| `stories/{uid}/active/{storyId}` | Active stories — 24h TTL | Creator uid | Privacy-gated | Owner + Cloud Function (expiry) | Home stories ring, Me ring |

### Playlists & Saved
| Collection | Purpose | Owner | Read | Write | Key screens |
|-----------|---------|-------|------|-------|------------|
| `playlists/{uid}/lists/{playlistId}` | User playlists | uid | Privacy-gated | Owner only | Me/المحفوظات, Me/مزاجي, Create playlist |
| `playlistItems/{playlistId}/items` | Items in a playlist | Playlist owner | Inherits playlist privacy | Owner only | Playlist detail |
| `savedItems/{uid}/items/{contentId}` | Bookmarked/saved content | uid | Owner only (always private) | Owner only | Me/المحفوظات tab |
| `reposts/{uid}/items/{contentId}` | Reposted content references | uid | Privacy-gated | Owner only | Me/الإعادات tab |

### Sessions (On Road)
| Collection | Purpose | Owner | Read | Write | Key screens |
|-----------|---------|-------|------|-------|------------|
| `sessions/{sessionId}` | On Road / الرحلات session metadata | Creator uid | Privacy + world-gated | Owner only | Me/الرحلات tab, Create On Road |
| `sessions/{sessionId}/waypoints/{id}` | GPS waypoints — precision-controlled per privacy | Session owner | Location-precision-gated | Owner only (location API) | Session detail map |

### Live
| Collection | Purpose | Owner | Read | Write | Key screens |
|-----------|---------|-------|------|-------|------------|
| `liveRooms/{roomId}` | Live room metadata + state | Host uid | Any authenticated | Host + Cloud Function | Live pages, Home live section |
| `liveRooms/{roomId}/speakers` | Active speaker list | roomId | Any authenticated | Cloud Function (RTC events) | Live room player |
| `liveRooms/{roomId}/comments` | Real-time comments | roomId | Any authenticated | Authenticated users | Live comments overlay |
| `liveRooms/{roomId}/gifts` | Gift events | roomId | Any authenticated | Cloud Function (wallet trigger) | Live gifts display |

### Radio
| Collection | Purpose | Owner | Read | Write | Key screens |
|-----------|---------|-------|------|-------|------------|
| `radioStations/{stationId}` | Station metadata + stream URL | `radio_creator` uid | Any authenticated | `radio_creator` + admin | Radio Home, RadioMePage/إذاعتي |
| `radioRequests/{requestId}` | Station creation requests (OnNet flow) | Applicant uid | Owner + admin | Owner (create) + admin (approve/reject) | Create Hub radio card |
| `radioFollowers/{stationId}/followers/{uid}` | Station followers | stationId | Any authenticated | Authenticated user | Station profile, follower count |

### Competitions
| Collection | Purpose | Owner | Read | Write | Key screens |
|-----------|---------|-------|------|-------|------------|
| `competitions/{competitionId}` | Tournament metadata | `tournament_organizer` uid | Any authenticated | Organizer + admin | TournamentsHome, TournamentsMePage |
| `competitionSubmissions/{competitionId}/submissions/{uid}` | Participant submissions | Participant uid | Organizer + jury + participant | Participant (during submission window) | TournamentsMePage/مشاركاتي |
| `votes/{competitionId}/audience/{uid}` | Public audience votes | Voter uid | Any authenticated | Auth user — 1 per uid | TournamentsMePage/التصويت الآن |
| `juryScores/{competitionId}/jury/{uid}` | Jury scoring | Jury uid | Organizer + admin | `competition_jury` capability | TournamentsMePage/التصويت والتحكيم |

### Music Rights
| Collection | Purpose | Owner | Read | Write | Key screens |
|-----------|---------|-------|------|-------|------------|
| `musicArtists/{artistId}` | Artist profiles (registered or ghost) | `music_creator` / admin | Any authenticated | `music_creator` + admin | MusicMePage/أغاني, song metadata |
| `productionCompanies/{companyId}` | Production company entities | Company owner | Any authenticated | Company owner + admin | MusicMePage/شركات الإنتاج |
| `songRights/{songId}/artists` | Multi-artist rights links per song | Song owner | Any authenticated | Song owner + admin | Song detail, rights management |

### Economy
| Collection | Purpose | Owner | Read | Write | Key screens |
|-----------|---------|-------|------|-------|------------|
| `wallets/{uid}` | Points balance, credits | uid | Owner only | Cloud Function (Admin SDK) only | AccountHub/الميزات, wallet page |
| `walletTransactions/{uid}/transactions/{txId}` | All debit/credit events | uid | Owner + admin | Cloud Function only | Earnings dashboard |
| `payoutRequests/{requestId}` | Creator payout requests | Creator uid | Owner + admin | Owner (create) + admin (approve) | Creator earnings, payout flow |

### Notifications & Messages
| Collection | Purpose | Owner | Read | Write | Key screens |
|-----------|---------|-------|------|-------|------------|
| `notifications/{uid}/items/{notifId}` | User notification items | uid | Owner only | Cloud Function only | Notifications page (not yet routed) |
| `conversations/{conversationId}` | DM conversation metadata | Participants | Participants only | Participants + Cloud Function | Messages page (not yet routed) |
| `conversations/{conversationId}/messages/{msgId}` | Individual messages | conversationId | Participants only | Participants | Message thread |

### Admin & Config
| Collection | Purpose | Owner | Read | Write | Key screens |
|-----------|---------|-------|------|-------|------------|
| `adminConfig/global` | Global platform config | System | Admin only | Admin only | Admin dashboard |
| `featureFlags/{flagId}` | Feature flag toggles | System | Any authenticated (read enabled) | Admin only | All feature-gated UI |
| `modifiedUserOverrides/{uid}` | Per-user permission overrides | Admin | Owner + admin | Admin only | Admin user management |
| `moderationQueue/{itemId}` | Content awaiting moderation | System | Admin + moderators | Cloud Function | Admin moderation page |
| `categories/{categoryId}` | Content categories per world | System | Any authenticated | Admin only | Home filters, Create metadata |

---

## 5. Permission + Gate Matrix

| Permission (SRS) | Capability required | Current UI gate | Enforcement state |
|-----------------|--------------------|-----------------|--------------------|
| `publish_to_general` | null — open | Create Hub cards (audio, clip, story) | Visible — no backend enforcement |
| `publish_to_plus` | `plus_creator` | Create Hub — بلس cards (locked) | Locked card shown — no capability check |
| `upload_music` | `music_creator` | Create Hub — أغنية, ألبوم | Locked card shown — no capability check |
| `create_live_general` | null — open, eligibility-gated | Create Hub — بث مباشر | Locked card — no live backend |
| `create_live_plus` | `plus_creator` | Create Hub — بث بلس | Locked card |
| `organize_tournament` | `tournament_organizer` | Create Hub — مسابقة | Locked card |
| `enter_competition` | null — open | Create Hub — مشاركة في مسابقة | Visible — no submission flow |
| `score_competition_jury` | `competition_jury` | TournamentsMePage/التصويت والتحكيم | Tab visible — data empty |
| `manage_radio_station` | `radio_creator` | Create Hub — طلب راديو / RadioMePage/إذاعتي | Request card only / tab shown |
| `create_song_playlist` | `plus_creator` (per SRS) | Create Hub — قائمة تشغيل | Visible — no playlist backend |
| `view_creator_analytics` | null after first publish | Me pages — analytics tabs | Tab visible — no data |
| `request_payout` | eligibility-gated | AccountHub/الميزات | قريباً badge |
| `manage_child_permissions` | Guardian role | Privacy Center/الأطفال والوصي | Server badge only — non-interactive |
| `manage_admin_config` | Admin role | AccountHub/الإدارة | قريباً badge |

---

## 6. Privacy Enforcement Plan

### Current state of all 13 privacy groups

| Group | UI state | Client enforcement | Server enforcement |
|-------|----------|-------------------|-------------------|
| الملف والهوية | Local useState | Not applied | Needed — `buildPublicProfile` must check |
| القصص ودائرة الصورة | Local useState | Not applied | Needed — stories projection must check |
| الاستماع الآن | Local useState | Not applied | Needed — `listeningActivity` section projection |
| مزاجي | Local useState | Not applied | Needed — mood section projection |
| المحفوظات | Local useState | Not applied | `savedItems` always excluded from publicProfiles ✅ (partial) |
| الإعادات | Local useState | Not applied | Needed — reposts projection |
| الاشتراكات | Local useState | Not applied | Needed — subscription feed filter |
| الرحلات / الجلسات | Local useState | Not applied | Needed — sessions collection privacy + location precision |
| الرسائل والتواصل | Local useState | Not applied | Needed — DM permission check + follow request mode |
| الهدايا والنقاط | Local useState | Not applied | Needed — wallet/gift permission check |
| الظهور في اكتشف | Local useState | Not applied | Needed — feed inclusion flag on contentItems |
| الأطفال والوصي | Server badge (non-clickable) ✅ | Intentionally server-only | Guardian enforcement module — future |
| الحظر والكتم | Management badge | Not applied | Needed — block/mute graph server-enforced |

### Items that MUST be server-enforced (client cannot be trusted)
- Block / mute filtering — must filter feed server-side
- Guardian / child content restrictions — age bands, guardian approval
- Privacy audience enforcement beyond `public` (followers / friends / custom)
- Wallet and gift transactions — always server-side mutations
- Permission and capability checks for creation
- Competition jury score weighting — cannot be client-computed
- Music rights ownership — legal domain, server only

---

## 7. Data Dependency Priority

Recommended implementation order:

| Priority | Module | Justification |
|----------|--------|---------------|
| 1 | Auth / Profile / PublicProfile | Every UI screen reads profile. Unblocks everything. |
| 2 | Privacy schema | Privacy Center must write. buildPublicProfile must enforce. Depends on M01. |
| 3 | Social graph (follow / block / mute) | Privacy `followers` audience meaningless without this. Subscriptions need follows. |
| 4 | ContentItems base model | Foundation for all Home/Discover/Me real data. No feed without this. |
| 5 | Saved / Reposts / Playlists | Social consumption layer. Depends on M03 + M04. |
| 6 | Stories | 24h TTL. Story ring on profiles. Depends on M01 + M04. |
| 7 | Discover shorts feed | Needs contentItems[type=short] + feed index. Depends on M04. |
| 8 | Create publishing flows | Upload pipeline + draft model. Depends on M04 + M05. |
| 9 | On Road sessions | Location precision. Depends on M01 + M03. RN GPS needed for full implementation. |
| 10 | Live | Requires RTC provider decision first. Depends on M01 + M04. |
| 11 | Radio | Requires OnNet API contract. Depends on M01. |
| 12 | Competitions | Complex voting/jury logic. Depends on M01 + M04. |
| 13 | Music rights | Legal complexity. Depends on M01 + M04. |
| 14 | Ads / Promote | Needs content + user models first. Phase 4 per infra plan. |
| 15 | Wallet / Gifts / Points | Financial compliance. Phase 3 per infra plan. |
| 16 | Notifications / Messages | Needs social graph. Depends on M03 + M04. |
| 17 | Admin config | Can start basic version early but full capability needs all modules. |

This ranking is consistent with the infra doc phasing (Phase 1: Auth/Profile/basic feed; Phase 2: advanced editing; Phase 3: Live/Competitions/Monetization; Phase 4: Radio/Ads).

---

## 8. Risk / Gap List

### CRITICAL — Resolve before any module starts

**R01 — Uncommitted working tree**  
All UI foundation work (20+ new files, 28 modified files) is untracked or uncommitted. Must `git add -A && git commit` before backend module work begins to create a clean "UI foundation complete" baseline.

**R02 — users/{uid} write flow unconfirmed**  
Edit Profile page exists but end-to-end Firestore write is not confirmed working. Privacy Center cannot save without a proven write path.

**R03 — Privacy enforcement is binary only**  
`buildPublicProfile` currently gates only on `public` vs hidden. Users who set `followers` audience will see their data silently hidden (projected as absent). When follower gating is needed, the builder must be updated first.

### HIGH — Schema and product ambiguity

**R04 — مزاجي data model undefined**  
Is مزاجي auto-generated from listen history? User-curated from others' content? The UI says "mood playlists from others' content" but no collection model exists and no product decision has been made. **Do not build until product decision is confirmed.**

**R05 — Plus subscription model missing**  
`plus_creator` capability is referenced in dozens of permission checks but no subscription/package collection exists. How does a user obtain `plus_creator`? Package purchase flow is not designed.

**R06 — Music rights legal complexity**  
Songs can have multiple artists + multiple production companies. Unregistered artist "ghost entities" are needed. This is a legal domain model requiring legal review before schema design.

**R07 — Radio = OnNet external integration**  
Radio is an external system integration, not a standard Firestore CRUD. Requires an API contract with OnNet before any radio backend can be built.

### MEDIUM — UI screens accepted but data missing

**R08 — 3 Live worlds use generic fallback**  
General / Plus / Radio live pages use `LivePage.tsx` fallback. Not premium experiences. Must not be upgraded until live backend and RTC provider are decided.

**R09 — profile/:uid has limited data binding**  
Other users' profiles render mostly placeholder data. Depends on M01 (publicProfiles projection).

**R10 — No /search route**  
Search button in AppHeader goes nowhere. Search requires a dedicated search service — Firestore cannot do full-text search.

**R11 — No /notifications and /messages routes**  
Account Hub sections exist but routes are absent.

**R12 — Category taxonomy missing**  
Home category filter chips are placeholder. No `categories` collection.

### LOW — Wording and platform notes

**R13 — "Channel" vocabulary in infra doc**  
Infrastructure doc uses `channels` + `channel_members`. UI foundation does not use "channel" anywhere. Clarify: is Channel a separate entity or just a creator profile?

**R14 — Age/gender targeting policy update (2026-05-12)**  
Infra doc section 8 has a superseding note allowing age/gender targeting where policy permits, controlled by admin per feature. Ensure recommendation and ad systems respect this admin toggle. Original blanket ban is retired.

**R15 — React Native end-goal**  
Current web stack will be ported to React Native. All business logic in `packages/shared` is portable. CSS glass effects, `color-mix()`, `backdrop-filter`, and web-specific APIs will need native equivalents. Mark web-only implementations with `// WEB ONLY — RN needs native equivalent`.

---

## 9. Do-Not-Build-Yet List

| Module / Feature | Reason to wait |
|-----------------|---------------|
| Discover feed algorithm | Needs `contentItems` + user interaction signal collection first |
| مزاجي / Mood playlists | Product decision on data model needed before schema |
| On Road GPS location stream | Needs React Native + native location permissions — web GPS is a polyfill |
| Live rooms | RTC provider selection (Agora vs LiveKit) must happen first |
| Radio OnNet integration | External API contract with OnNet required |
| Competition voting logic | Needs `competitions` + `submissions` collections first |
| Music rights management | Legal review required before schema design |
| Ads system | Phase 4 — needs all content + user models first |
| Wallet / gifts | Phase 3 — payment compliance review required |
| Push notifications | FCM setup + notification server needed after core content |
| Guardian / child enforcement | Most complex legal compliance module — last |
| Plus subscription purchase | Payment provider decision (Stripe / HyperPay / etc.) required |
| Admin dashboard (full) | Basic version can start early; full capability needs all modules |

---

## 10. Recommended First Implementation Task

> **"Profile + PublicProfile + Privacy schema foundation."**

### Exact scope:

1. **Wire Edit Profile → `users/{uid}`** — confirm display name, username, bio, avatar URL, country write to Firestore
2. **Confirm `onUserProfileUpdate` rebuilds `publicProfiles/{uid}`** — full projection including display name, avatar, bio, username, world stats, follower/following count
3. **Wire Me page header and `profile/:uid` to READ `publicProfiles/{uid}`** — show real data instead of AuthContext object
4. **Create `privacySettings/{uid}` document on first Privacy Center save** — all 13 sections with defaults
5. **Wire Privacy Center → Firestore write** — Privacy Center save button must persist settings
6. **Update `buildPublicProfile` to enforce `followers` / `onlyMe` / `friends` / `custom` audiences** — not just public binary
7. **Commit entire working tree before starting** — clean baseline commit

### Why this is the only correct first task:
- Every other module (social graph, content, subscriptions, stories, feed) needs a real `publicProfiles/{uid}` to render user data
- Privacy enforcement is meaningless until `privacySettings/{uid}` exists and `buildPublicProfile` respects it
- All 22 backend modules listed in Section 3 depend on M01 and M02 being complete

---

## Final Report Summary

| Item | Value |
|------|-------|
| Audit file | `docs/PRE_MODULES_ARCHITECTURE_AUDIT_2026-05-25.md` |
| Code changes made | **NONE** |
| Deploy triggered | **NONE** |
| Backend changes made | **NONE** |
| Collections created | **NONE** |
| Modules mapped | 22 (M01–M22) |
| Collections proposed | 38 (draft map — not created) |
| Critical risks | 3 (uncommitted tree, write flow, binary privacy) |
| High risks | 4 (مزاجي model, Plus subscription, music rights, OnNet) |
| Recommended first task | Profile + PublicProfile + Privacy schema foundation |
| React Native note | `packages/shared` is portable. CSS glass effects need RN equivalents. Mark web-only APIs. |

---

*Audit written: 2026-05-25 | Sound Platform pre-modules baseline | No code changed | No deploy | No backend changes*
