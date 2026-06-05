# Sound Project Structure

**Date:** 2026-05-27
**Status:** Living project-structure reference.

## Repository

`C:\Users\akram\Downloads\Sound\sound-platform`

- `apps/web` — current web client, Firebase-hosted.
- `functions` — Firebase Cloud Functions callables/triggers.
- `packages/shared` — shared TypeScript contracts used by web and functions.
- `firebase/rules` — Firestore and Storage rules.
- `docs` — implementation authority, phase reports, module authority files.
- `scripts` — build, vendor, seed, migration, and audit scripts.

## External Project Files

`C:\Users\akram\Downloads\Sound\project files`

- `02_SRS.md` — product/system requirements source.
- `03_INFRASTRUCTURE.md` — infrastructure source.
- `05_WORKING_RULES_AND_KB.md` — working rules and agent knowledge base.
- `06_CURRENT_STATE_AND_NEXT_STEPS.md` — current state and next-step tracker.
- numbered phase docs — product/project planning history.

## Audio Module Locations

- Web creation UI: `apps/web/src/pages/create/AudioCreatePage.tsx`.
- Audio creation CSS: `apps/web/src/pages/create/AudioCreatePage.css`.
- Create Hub routing: `apps/web/src/pages/create/GlobalCreateHubPage.tsx`.
- Shared audio contracts: `packages/shared/src/content.ts` and `packages/shared/src/audioHelpers.ts`.
- Audio callables: `functions/src/callables/createAudioDraft.ts`, `updateAudioDraft.ts`, `publishAudioContent.ts`.
- Storage upload rules: `firebase/rules/storage.rules`.
- Firestore content/draft rules: `firebase/rules/firestore.rules`.

## Required Future Audio Surfaces

- `apps/web/src/pages/audio/AudioDetailPage.tsx` — audio detail player.
- `apps/web/src/pages/create/audio-flow/` or equivalent — separated flow steps when the wizard grows beyond one file.
- `functions/src/callables/getAudioPlaybackUrl.ts` — authorized signed playback URL.
- `functions/src/triggers/onAudioUploadFinalize.ts` — processing trigger when introduced.
- `packages/shared/src/audioProcessing.ts` — processing job/status contracts when introduced.

## Scripts and Tooling (Updated 2026-06-03)

- `scripts/fix_all_locales.py`, `scripts/update_i18n_index.js`, `scripts/patch_i18n.js`: Automation scripts that traverse `.tsx` UI files to extract hardcoded Arabic strings, generate translation keys, and automatically sync `apps/web/public/locales/ar/translation.json`.