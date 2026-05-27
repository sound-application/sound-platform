# Audio Module Authority

**Date:** 2026-05-27
**Status:** SOURCE OF TRUTH for Sound audio creation, publishing, and item playback.
**Owner correction:** Akram approved the canonical sequence below. Do not replace it with older SRS wording.

## Canonical Audio Creation Flow

1. **Info**
   - title
   - description/caption
   - target world
   - audio kind

2. **Publish Details**
   - category
   - optional subcategory
   - tags
   - language
   - country targeting: all countries / one country / up to four countries
   - age suitability
   - audience/privacy
   - comments, gifts, sharing, schedule toggles

3. **Cover (optional)**
   - upload image
   - camera image
   - AI cover generation
   - skip with temporary/default cover

4. **Captions setup (optional)**
   - enable/disable auto captions
   - caption language/style
   - note: actual transcript review happens after audio exists

5. **AutoCue (optional)**
   - write/paste script or lyrics
   - import from description
   - AI-generated script draft
   - clear script
   - scroll speed: slow / medium / fast
   - font size: small / medium / large
   - reading mode: line by line / paragraph by paragraph
   - start delay
   - current-line highlight
   - preview while recording
   - paid by default, admin-configurable unlock

6. **Record/Upload**
   - normal mode: waveform-first recorder/uploader
   - AutoCue mode: script/lyrics-first recorder, waveform/timer controls lower and smaller
   - MediaRecorder capture or file upload
   - duration extraction
   - Storage upload to owner/draft-scoped staging path

7. **Review**
   - playback
   - duration
   - replace/re-record
   - confirm audio source

8. **Effects (optional)**
   - enhancement
   - noise reduction
   - EQ/filter stack
   - package/admin gated

9. **Mixing (optional)**
   - bed music
   - extra tracks
   - loudness target
   - package/admin gated

10. **Final Preview with edit-back links**
    - realistic listener-facing preview
    - cover, title, owner, duration, captions/waveform state
    - edit links back to each previous section

11. **Review Details**
    - final checklist
    - metadata complete
    - audio uploaded
    - cover state
    - captions state
    - privacy/audience
    - moderation/publish consequences

12. **Publish Result**
    - published / pending review / processing / failed
    - open item
    - view draft
    - share
    - edit when allowed

13. **Audio Detail Player**
    - authorized playback
    - cover
    - waveform
    - captions when available
    - owner block
    - like/save/repost/share/comment/gift actions
    - queue/up-next

## Required Audio Item Fields

- `id`, `ownerUid`, owner snapshot
- `world`, `kind`
- `title`, `caption`, `description`
- `categoryId`, `categoryLabel`
- `subcategoryId`, `subcategoryLabel`
- `tags[]`
- `language`
- `countryMode`, `countryCodes[]`, country labels/snapshots
- `ageSuitability`, `isExplicit`
- `audience`, audience list references when custom
- publish toggles: comments, gifts, sharing, schedule
- `audioAsset`: original file name, storage path, MIME type, size, duration, source type, upload status
- processing statuses: scan, transcode, loudness, waveform, transcript, moderation, CDN/publish
- `coverAsset`: source type, storage path, AI provider/prompt when applicable
- `captions`: setup preference, transcript path/status, editable segments
- `autoCue`: enabled, script text, source, scroll speed, font size, reading mode, start delay, current-line highlight
- counters: listens, likes, saves, reposts, comments, shares
- relations: source audio, parent content, album, competition, radio station when applicable

## Current Implementation Status

Phase 8-A and 8-B are foundations only:

- done: draft creation, draft update, publish callable, basic record/upload, Storage upload, audio asset attachment;
- missing: full metadata UI, cover, captions, AutoCue, effects, mixing, final preview, review details, audio detail player, processing pipeline, signed playback.

## Next Required Phase

**Phase 8-C — Audio Creation Flow Completion** must implement the canonical flow above before expanding feeds/discovery around audio content.