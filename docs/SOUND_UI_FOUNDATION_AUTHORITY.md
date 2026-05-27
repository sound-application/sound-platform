# SOUND UI FOUNDATION AUTHORITY

**Version:** 2026-05-19
**Status:** SOURCE OF TRUTH — overrides all previous Me matrices and phase docs
**Supersedes:** `ME_PAGES_AUTHORITY_MATRIX.md` (all versions)
**Rule:** No TSX or CSS edits until Akram approves this file.

---

## 1. LOCKED WORLDS

These five worlds are fixed. Do not add, remove, or rename them.

| Key | Label |
|-----|-------|
| general | عام |
| plus | بلس |
| music | موسيقى |
| radio | راديو |
| tournaments | مسابقات |

World selector token order (exact, immutable):

```
عام | بلس | موسيقى | راديو | مسابقات
```

---

## 2. LOCKED BOTTOM NAVIGATION

Five tabs, exact order, exact labels:

```
الرئيسية | اكتشف | إنشاء | لايف | أنا
```

| Position | Label |
|----------|-------|
| 1 | الرئيسية |
| 2 | اكتشف |
| 3 | إنشاء |
| 4 | لايف |
| 5 | أنا |

**Allowed locked navigation labels only:**

World labels:
`عام | بلس | موسيقى | راديو | مسابقات`

Bottom navigation labels:
`الرئيسية | اكتشف | إنشاء | لايف | أنا`

Rule:
Only the labels above may be used for global world navigation and bottom navigation. Do not use legacy or competing labels from old screens.

---

## 3. HOME PER WORLD

Home is world-scoped. Changing the selected world changes all Home content.

**Global Home rules:**
- Stories or quick circles appear where relevant.
- Search appears in Home.
- Categories are multi-select, start with الكل.
- Countries are multi-select, start with الكل.
- Active filters affect all content sections below.
- When filters are active, show a CTA to open the filtered category landing page.
- Every content section has عرض الكل.
- Ads can appear between sections.

### عام

- Stories / quick circles
- Search
- Categories
- Countries
- Trending now
- Top creators
- Recommended for you
- Playlists / lists
- Rising creators
- Creators you follow
- Random creators
- Ads between sections

### بلس

- Same as عام (all sections above)
- New releases
- Rising artists
- Artists you follow
- Random artists
- Ads between sections

### موسيقى

- Stories
- Artist / music circles
- Search
- Genres / categories
- Countries
- Trending songs now
- Recommended for you
- Rising artists
- Albums
- Selected playlists
- New releases
- Artists you follow
- Random artists
- Rights / availability note when needed
- Ads between sections

### راديو

- Stories
- Search
- Categories
- Countries
- Live now / current broadcast hero
- My station
- Station list
- Recommended stations
- Scheduled programs
- New stations
- Rising stations
- Stations you follow
- Random stations
- Request / add station card
- Ads between sections

### مسابقات

- Stories
- Search
- Categories
- Countries
- Featured tournament
- Summary stats strip
- Status tabs
- Active tournaments
- Upcoming tournaments
- My joined tournaments
- Winners / results
- Active registration
- Active voting
- Recommended tournaments
- Random tournaments
- Old tournaments
- Sponsor cards
- Ads between sections

---

## 4. DISCOVER

Discover is the shorts surface. It is world-scoped.

### Sub-navigation (locked, 4 tabs, all worlds)

```
اكتشف | لك | المتابعة | الرائج
```

### Rules

- World-scoped shorts feed.
- A short can be standalone or related to long audio.
- If a short is cut from long audio, the relation is automatic.
- No mini-player unless the user opens the full related audio.
- Side action rail is language-direction aware.

### Side action rail (per item)

| Action | Element |
|--------|---------|
| Creator avatar + follow | Follow toggle |
| Like | Favorite |
| Comment | Comment |
| Save | Bookmark |
| Repost | Repeat |
| Share | Share |
| Gift | Gift |

### Item metadata shown

- Title
- Caption / description
- Creator name
- Username (LTR-isolated)
- Listens / views count
- Duration

### World-specific content types

| World | Content types |
|-------|--------------|
| عام | Stories, podcast clips, poetry, meditation, education, comedy |
| بلس | Premium / general Plus content previews |
| موسيقى | Music clips, song previews, artist clips |
| راديو | Station / program previews, radio moments |
| مسابقات | Tournament submissions, voting moments, winner clips, challenge previews |

---

## 5. CREATE

Create is global. It is not world-scoped.
Shows all possible creation types across all worlds.
Allowed options are enabled. Unavailable options remain visible but disabled with a clear reason.

### Actions

| Action | Gate rule |
|--------|----------|
| Story | Open |
| Long audio / podcast | Open |
| Short content | Open |
| Playlist | Open |
| Live | Permission / package gate |
| On Road | Permission gate |
| Song | Music permission + rights / artist / company logic |
| Album | Music permission |
| Rights / production company | Music permission, gated |
| Radio station request | Admin gate — request only, no normal publishing |
| Create competition | Competitions permission |
| Submit to competition | Open to registered participants |

### Rules

- All options remain visible when locked; show reason for lock.
- Creation flow asks for target world when relevant.
- Radio = station request / setup only, no normal publish flow.
- Music upload requires rights / artist / production company logic.
- Competitions use their own submission flow.
- First step is basic content information.
- Optional steps can be skipped; skipping saves as draft.
- Flow ends with publish or save draft.

---

## 6. LIVE PER WORLD

Live is world-scoped.

### عام

- General audio live rooms
- Live now
- Followed creators live
- Recommended live rooms
- Categories
- Countries
- Search
- Create live CTA if allowed
- Ads / sponsor cards

### بلس

- Same structure as عام
- Viewing is open to all Plus users
- Creating Plus live requires Plus capability (permission gate)

### موسيقى

- Concert / event-style live only
- Music permission required to create
- Current events
- Upcoming events
- Followed artists
- Recommended music events
- Genres / categories
- Countries

### راديو

- No normal live creation by users
- Live = current radio broadcast / scheduled program
- On-air programs
- Active schedule windows
- Followed stations live / current
- Recommended current programs
- Message button only if an active scheduled program is running AND messages are enabled

### مسابقات

- Tournament live events
- Active broadcasts
- Active voting
- Active registration
- Live leaderboard / results
- Joined tournament updates
- Recommended tournament events
- Sponsor cards

---

## 7. ME — GLOBAL RULES

Me is world-scoped but shares a global profile identity.

### Static header — present in every world

- Cover image
- Badges
- Social links
- Profile image with story ring
- Status update
- Listening now
- Name + verification badge
- Username (LTR-isolated)
- Bio
- Message button (other-profile view only)
- Follow button (other-profile view only)
- World-scoped stats: Following | Followers | Likes | Listens

### Privacy and display rules

- Every profile field, tab, and item follows user privacy settings.
- Empty tabs do not appear.
- Filters apply where useful.
- Category filters come from actual tab data, not global categories.
- Listening now is clickable and can switch world instantly if the content belongs to another world.
- Badges and social links sit in opposite corners of the cover and switch sides by language direction.

### UI Foundation Mode

During UI/UX foundation implementation, all intended owner/full-capability tabs and filter controls must be visible so the product inventory can be reviewed before backend modules are wired.

Production behavior comes later:
- permissions may lock or hide tabs,
- privacy may hide tabs/items,
- empty viewer tabs may disappear,
- real data will populate filters.

Do not remove UI inventory during foundation because schema/data/permissions are not ready yet.

---

## 8. ME PER WORLD

### عام and بلس (shared tab set)

**Creator tabs:**

| Tab | Notes |
|-----|-------|
| المحتوى | General audio, podcast clips, shorts via filters |
| بودكاست | Podcast-specific view |
| ترنداتي | My Trends |

**Viewer / activity tabs:**

| Tab | Notes |
|-----|-------|
| مزاجي | My Mood |
| المحفوظات | Saved |
| الإعادات | Reposts |
| الرحلات / الجلسات | On Road / Sessions |
| المفضلة | Favorites |
| السجل | History |
| الاشتراكات | Subscriptions |

---

### راديو

**Tab 1 — إذاعتي (always first, always default, for every user):**
- If the user has station permission → shows station management panel.
- If the user does not have station permission → shows a request / eligibility panel.
- `إذاعتي` is never hidden. It is always rendered as the first and default tab regardless of permission level.

**Station management tabs** (visible only when station permission is granted):

| Tab | Notes |
|-----|-------|
| البرامج | Programs |
| فريق العمل | Team Work |
| الجدول | Schedule |
| تواصل معنا | Contact Us |
| من نحن | About Us |
| أعلن معنا | Advertise With Us |

**Viewer / activity tabs** (always shown for all users):

| Tab | Notes |
|-----|-------|
| المفضلة | Favorites |
| المحفوظات | Saved |
| الإعادات | Repost |
| سجل الاستماع | Listening History |

**Rules:**
- One user = one station.
- On Road tab does not exist in Radio world.
- إذاعتي is always tab 1 and the default tab for every Radio Me user.

---

### موسيقى

**Creator tabs:**

| Tab | Notes |
|-----|-------|
| أغاني | Songs; can have multiple artists |
| ألبومات | Albums |
| شركات الإنتاج | Media Production Companies; songs can have multiple |
| ترنداتي | My Trends |

**Viewer / activity tabs:**

| Tab | Notes |
|-----|-------|
| مزاجي | My Mood |
| المحفوظات | Saved |
| الإعادات | Repost |
| الاشتراكات | Subscriptions |
| الرحلات / الجلسات | On Road / Sessions |
| المفضلة | Favorites |
| الأخيرة | Recent |
| سجل الاستماع | Listening History |

**Special rules:**
- Songs can have multiple artists.
- Songs can have multiple production companies.
- Temporary hidden artist / company entities exist for unregistered parties.
- Rights / ownership is a core domain model, not just UI decoration.

---

### مسابقات

**Allowed مسابقات vocabulary — only these labels may appear in UI:**

```
مسابقة · مسابقات · مسابقاتي
الإدارة النشطة · المشاركات المستلمة · التصويت والتحكيم
النتائج / الفائزون · الدعوات / المسابقات المغلقة
المسابقات المنضم لها · مشاركاتي · التصويت الآن · أصواتي
الجوائز / الميداليات · المحفوظات · المفضلة · الإعادات · السجل · الاشتراكات
```

> Any label not in this list must not be used in مسابقات UI. Legacy competing vocabulary from old documentation must not be rendered.

**Organizer tabs** (role-gated):

| Tab | Role required |
|-----|--------------|
| مسابقاتي | Organizer |
| الإدارة النشطة | Organizer / admin |
| المشاركات المستلمة | Organizer / admin |
| التصويت والتحكيم | Organizer / jury |
| النتائج / الفائزون | Organizer |
| الدعوات / المسابقات المغلقة | Organizer |

**Participant / viewer tabs** (always shown):

| Tab | Notes |
|-----|-------|
| المسابقات المنضم لها | Joined Tournaments |
| مشاركاتي | My Submissions |
| التصويت الآن | Voting Now |
| أصواتي | My Votes |
| الجوائز / الميداليات | Awards / Medals |
| المحفوظات | Saved |
| المفضلة | Favorites |
| الإعادات | Reposts |
| السجل | History |
| الاشتراكات | Subscriptions |

---

## 9. SCHEMA GAPS

Do not delete UI requirements because of schema gaps. Mark gaps as `// SCHEMA GAP` in code.

| Gap | Affected file | Notes |
|-----|--------------|-------|
| radioProfile.stationPermission | RadioMePage.tsx | Not in publicProfiles/{uid} |
| radioProfile.stationInfo | RadioMePage.tsx | Not in publicProfiles/{uid} |
| radioProfile.programsCount | RadioMePage.tsx | Not in publicProfiles/{uid} |
| tournamentsProfile (full namespace) | TournamentsMePage.tsx | Not in publicProfiles/{uid} |
| tournamentsProfile.roles[] | TournamentsMePage.tsx | Role-gating blocked |
| tournamentsProfile.competitionsCreatedCount | TournamentsMePage.tsx | Stats gap |
| tournamentsProfile.awardsCount | TournamentsMePage.tsx | Stats gap |
| tournamentsProfile.juryTasksCount | TournamentsMePage.tsx | Jury tab data gap |
| generalProfile.likesCount | All Me pages | Not yet in schema |
| musicProfile.* | MusicMePage.tsx | Falls back to generalProfile |

---

## 10. IMPLEMENTATION RULES (permanent)

1. This file overrides all previous Me matrices and phase documents.
2. Do not infer new tabs that are not listed in this map.
3. Do not rename labels unless Akram explicitly approves the change.
4. Do not mix world concepts.
5. If schema lacks fields, mark `// SCHEMA GAP` in code. Do not delete the UI requirement.
6. The full intended UI inventory must exist before backend modules and permissions are fully wired.
7. Work proceeds page by page after Akram approves this authority file.
8. Empty tabs must not appear to viewers.
9. Creation flows must remain world-contextual but must not be forced gateways.
10. Arabic product labels are exact tokens. Do not improve, translate, or substitute them.

---

*Last updated: 2026-05-19 | Source: Sound Codex Memory — full_system_map_2026-05-15.md, FULL_HANDOFF_TO_NEW_PROJECT_CHAT_2026-05-16.md, project_knowledge.md*

## 11. AUDIO MODULE CREATION FLOW AUTHORITY

**Status:** SOURCE OF TRUTH from 2026-05-27 owner correction. Overrides older audio-flow notes.

Canonical flow:

`Info -> Publish Details -> Cover (optional) -> Captions setup (optional) -> AutoCue (optional) -> Record/Upload -> Review -> Effects (optional) -> Mixing (optional) -> Final Preview with edit-back links -> Review Details -> Publish Result -> Audio Detail Player`

Rules:

- Create Hub may route into audio creation, but the audio flow itself owns the full sequence above.
- Recording/upload is the first media-capture step, not the second screen overall.
- Publish Details must happen before media capture so the item is defined before the creator records/uploads.
- AutoCue must be before recording and must support reading script/lyrics during capture.
- AutoCue recording mode changes the recorder layout: script/lyrics main, waveform/timer controls lower/smaller.
- Cover and captions setup are optional but visible; skipping saves the draft and advances only one step.
- Final Preview must be listener-realistic and must allow going back to edit previous sections.
- Publish Result must link to Audio Detail Player when the item is published or available for playback.
- Do not remove required UI inventory because schema or backend pieces are unfinished; mark schema/backend gaps clearly.
