# Provider Registry

> Phase 8-H.0 — Provider Registry Foundation

## Why

The Sound Platform depends on multiple external providers (transcription, AI generation, payments, search, etc.). Instead of hardcoding provider-specific logic and secret checks in feature code, all provider-dependent features go through a centralized **Provider Registry**.

This ensures:
- **No secret leaks** — API keys live in environment variables, never in Firestore or shared types.
- **Provider flexibility** — switch between providers (e.g. Google STT → OpenAI Whisper) by updating config, not code.
- **Honest status** — features know exactly why a provider is unavailable (missing config, missing secrets, disabled, error).
- **Admin-ready** — future Admin/API Control Center can manage providers through this registry.

## Architecture

```
┌──────────────────────┐
│  Feature Code        │
│  (e.g. captions)     │
└──────────┬───────────┘
           │ resolveProvider('audio.transcription')
           ▼
┌──────────────────────┐     ┌─────────────────────┐
│  Provider Resolver   │────▶│  Firestore          │
│  (providerRegistry)  │     │  providerConfigs/   │
└──────────┬───────────┘     │  {featureId}        │
           │                 └─────────────────────┘
           │ checks process.env
           ▼
┌──────────────────────┐
│  Environment Vars    │
│  (Cloud Functions)   │
│  GOOGLE_STT_API_KEY  │
│  OPENAI_API_KEY      │
│  etc.                │
└──────────────────────┘
```

## No Secrets in Firestore

**CRITICAL**: `providerConfigs/{featureId}` documents store only:
- Provider metadata (name, label)
- **Secret names** (env var names like `GOOGLE_STT_API_KEY`)
- Status, timestamps, notes

They NEVER store actual API keys or secret values.

The resolver checks `process.env[secretName]` for existence only — it never reads, returns, or logs secret values.

## Firestore Collection

### `providerConfigs/{featureId}`

| Field | Type | Description |
|---|---|---|
| `featureId` | string | Feature ID (doc ID) |
| `enabled` | boolean | Whether this feature is enabled |
| `primaryProvider` | ProviderEntry | Primary provider config |
| `fallbackProviders` | ProviderEntry[] | Ordered fallback providers |
| `status` | string | configured / disabled / missingSecrets / missingConfig / providerError |
| `updatedAt` | string | ISO timestamp |
| `updatedBy` | string | UID or system identifier |
| `lastCheckedAt` | string? | Last resolver check |
| `lastErrorCode` | string? | Last error code |
| `lastErrorMessage` | string? | Last safe error message |
| `notes` | string? | Admin notes |

### `ProviderEntry` (embedded)

| Field | Type | Description |
|---|---|---|
| `providerId` | string | e.g. `google-stt`, `openai-whisper` |
| `label` | string | Human-readable name |
| `requiredSecrets` | string[] | Env var names that must be set |
| `optionalSecrets` | string[]? | Optional env var names |

## Known Feature IDs

| Feature ID | Primary Provider | Required Secrets | Used By |
|---|---|---|---|
| `audio.transcription` | Google STT | `GOOGLE_STT_API_KEY` | Captions pipeline (Phase 8-G) |
| `ai.cover` | OpenAI DALL-E | `OPENAI_API_KEY` | AI cover generation |
| `ai.script` | OpenAI GPT | `OPENAI_API_KEY` | AI script generation |
| `content.moderation` | Google Perspective | `PERSPECTIVE_API_KEY` | Content moderation |
| `search.indexing` | Algolia | `ALGOLIA_APP_ID`, `ALGOLIA_API_KEY` | Search |
| `notifications.push` | Firebase FCM | *(none — uses project creds)* | Push notifications |
| `payments.primary` | Stripe | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | Payments |
| `maps.geocoding` | Google Maps | `GOOGLE_MAPS_API_KEY` | Location services |
| `live.rtc` | Agora | `AGORA_APP_ID`, `AGORA_APP_CERTIFICATE` | Live sessions |

## Resolver Behavior

```typescript
const result = await resolveProvider('audio.transcription');
```

Resolution order:
1. Read `providerConfigs/audio.transcription` from Firestore
2. If missing → `{ available: false, status: 'missingConfig', errorCode: 'PROVIDER_CONFIG_MISSING' }`
3. If `enabled === false` → `{ available: false, status: 'disabled', errorCode: 'PROVIDER_DISABLED' }`
4. Check primary provider's `requiredSecrets` against `process.env`
5. If primary has all secrets → `{ available: true, selectedProvider: primary }`
6. Check each fallback provider in order
7. If any fallback has all secrets → `{ available: true, selectedProvider: fallback, isFallback: true }`
8. If none → `{ available: false, status: 'missingSecrets', errorCode: 'PROVIDER_SECRET_MISSING' }`

## How Captions Use It

In `onAudioContentPublished.ts`, after audio processing succeeds:

```typescript
const result = await resolveProvider('audio.transcription');

if (!result.available) {
  // → captionsProcessing.status = 'pendingProvider'
  // → captionsProcessing.errorCode = result.errorCode
  // Audio remains contentProcessingStatus = 'ready'
}
```

## How Future Providers Plug In

1. **Add config**: seed or admin UI creates `providerConfigs/{featureId}`
2. **Set env vars**: add API key to Cloud Functions environment
3. **Implement feature code**: use `resolveProvider(featureId)` to get the provider
4. **Call provider API**: use `result.selectedProvider.providerId` to dispatch

## Seed Script

```bash
npx ts-node scripts/seed-provider-configs.ts
```

Creates default disabled/missingSecrets configs for all known features.
Idempotent — skips existing documents.

## Firestore Rules

All client access denied:

```
match /providerConfigs/{featureId} {
  allow read: if false;
  allow write: if false;
}
```

Only Cloud Functions can read/write via Admin SDK.

## Future: Admin API Control Center

The provider registry is designed to be managed by a future Admin module:
- Admin UI reads `providerConfigs` via a server callable
- Admin can enable/disable features
- Admin can change primary/fallback providers
- Secret management happens in Cloud Console, not in the app
- Provider status is visible in the admin dashboard
