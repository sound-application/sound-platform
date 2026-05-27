# Sound Architecture

This outlines the high-level architecture of the Sound Platform.

## Monorepo Structure

- `apps/web` — Firebase-hosted web app.
- `functions` — Firebase Cloud Functions.
- `packages/shared` — shared TypeScript contracts and helpers.
- `firebase/rules` — Firestore and Storage security rules.
- `docs` — implementation authority and phase reports.
- `scripts` — build/migration/seed tooling.

## Apps

- Web: active implementation target.
- Mobile: future React Native target.
- Admin: future admin application.

## Backend

- Firebase Auth.
- Firestore.
- Firebase Storage.
- Firebase Cloud Functions.

## Current Core Modules

- Profile/PublicProfile.
- Privacy settings and viewer-aware resolver.
- Social graph.
- Audio content foundation.

## Audio Module Architecture

Authoritative audio module docs:

- `docs/AUDIO_MODULE_AUTHORITY.md`
- `docs/PROJECT_PLAN.md`
- `docs/PROJECT_ROADMAP.md`

Audio content uses:

- `contentItems/{contentId}` for published audio content.
- `drafts/{uid}/drafts/{draftId}` for progressive creation state.
- Firebase Storage staging paths for uploads.
- Cloud Functions for draft creation/update/publish and future authorized playback/processing.

Canonical audio creation flow:

`Info -> Publish Details -> Cover (optional) -> Captions setup (optional) -> AutoCue (optional) -> Record/Upload -> Review -> Effects (optional) -> Mixing (optional) -> Final Preview -> Review Details -> Publish Result -> Audio Detail Player`