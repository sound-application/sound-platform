# Sound Project Plan

**Date:** 2026-05-27
**Status:** Active implementation plan.

## Completed Foundation

- UI foundation and app shell.
- Profile / PublicProfile / Privacy Center.
- Social graph: follow, followers mirror, block/mute schema.
- Viewer-aware privacy resolver.
- Username profile links.
- Audio Phase 8-A: content/draft schema and publish callables.
- Audio Phase 8-B: recording/upload/storage attachment.

## Active Module Priority

The audio module is the active priority because it is a core platform module and unlocks real content, feeds, discovery, profiles, and playback.

## Phase 8-C — Audio Creation Flow Completion

Implement the canonical flow:

`Info -> Publish Details -> Cover (optional) -> Captions setup (optional) -> AutoCue (optional) -> Record/Upload -> Review -> Effects (optional) -> Mixing (optional) -> Final Preview with edit-back links -> Review Details -> Publish Result -> Audio Detail Player`

Required deliverables:

- full Publish Details form;
- full visibility/audience choices;
- country mode with all/one/up-to-four;
- category/subcategory/tags/language;
- cover step;
- captions setup step;
- AutoCue setup and AutoCue recording mode;
- optional effects/mixing placeholders with gates;
- final preview and review details;
- publish result with open item;
- audio detail player route with basic authorized playback strategy.

## Phase 8-D — Audio Playback And Item Surface

- `AudioDetailPage` reads `contentItems/{contentId}`.
- authorized playback URL callable;
- cover, waveform placeholder, captions placeholder;
- owner/action/queue UI.

## Phase 8-E — Processing Pipeline

- scan/validation;
- transcode;
- loudness normalization;
- waveform generation;
- caption transcription;
- moderation;
- CDN/signed playback.

## Phase 8-F — Drafts And Resume

- unified drafts screen;
- resume by currentStep;
- edit draft metadata;
- draft status/details.

## Deferred Until Audio Core Is Stable

- Home feed real audio queries;
- Discover audio/short feed;
- ads around audio;
- monetization/gifts;
- advanced recommendation.