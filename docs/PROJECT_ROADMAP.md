# Sound Project Roadmap

**Date:** 2026-05-27
**Status:** Active roadmap.

## Roadmap Order

1. **Phase 8-C — Audio Creation Flow Completion**
   - Full metadata, cover, captions setup, AutoCue, recording modes, final preview, review details, publish result.

2. **Phase 8-D — Audio Detail Player And Playback**
   - View published audio item, authorized playback, owner/actions/queue.

3. **Phase 8-E — Audio Processing Pipeline**
   - Scan, transcode, normalize, waveform, captions transcription, moderation, CDN/signed playback.

4. **Phase 8-F — Drafts And Resume**
   - Unified drafts, edit metadata, resume flow, draft status.

5. **Phase 9 — Content Surfaces & Stories**
   - Me tabs real content, Home audio sections, Discover feed, subscriptions/following content.
   - **Stories**: Ephemeral 24h content integration (Audio, Video, Image, Text, Polls, etc.) linked to social identity.

6. **Phase 9-B — Super Admin Dashboard**
   - God-mode Web Admin panel (`apps/admin`): manage users, configure dynamic categories/worlds, content moderation, app theme/colors, and localization.

7. **Phase 10 — Library & Sessions**
   - Playlists, Saved, Reposts, Mood.
   - **Sessions (جلسات)**: Intelligent audio queue generator based on time/context, pulling strictly from General, Plus, or Music worlds.

8. **Phase 11 — Music Rights Expansion**
   - Artists, production companies, song/album rights.

9. **Phase 12 — Live / Radio / Competitions Expansion**
   - Dedicated modules after core audio content is stable.

10. **Phase 13 — Monetization, Ads, Wallet, Gifts**
    - Financial modules after content and playback are reliable.

## Roadmap Rule

Do not build feed/discovery/monetization around audio until audio item creation, playback, and processing are usable end-to-end.

## Recent Milestones (Updated 2026-06-03)

- **Audio Editing Flow & Preview Engine Fixed**: Draft updates (cuts/trims) correctly synchronize to Firestore before previewing, and React rendering is now stable via `crypto.randomUUID()`.
- **RTL UI Polished**: Audio Editing toggles natively support standard Arabic right-to-left UI.
- **Translation Extraction Pipeline Complete**: AST-based translation scripts (e.g., `fix_all_locales.py`) stabilize cross-module Arabic string management.