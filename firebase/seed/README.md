# Firebase Dev Seed Data

This directory contains seed scripts for populating the `sound-platform-dev` Firestore database with safe, fake development-only data.

## Safety Rules

- **Never run against production.** Scripts check for `NODE_ENV=development` and the project ID containing `-dev`.
- **No real user data.** All seed users are clearly fake (e.g., `dev-user-001@sound-dev.invalid`).
- **No real payment data.** Wallet balances are placeholder values only.
- **No real API keys or secrets.** Scripts use the local Firebase emulator by default.
- **Idempotent.** All seed scripts use `set({ merge: true })` — safe to run multiple times.

## Execution Order

Run scripts in this order when seeding a fresh dev environment:

```
1. seed-admin-config.ts    → adminConfig/global, feature flags, worlds
2. seed-packages.ts        → packages collection (Spark, General, Plus)
3. seed-roles.ts           → roles and permissions
4. seed-report-reasons.ts  → reportReasons collection
5. seed-radio-stations.ts  → radioStations collection (sample stations)
6. seed-dev-users.ts       → fake dev users (emulator only)
7. seed-dev-channels.ts    → fake channels for dev users
8. seed-dev-content.ts     → fake episodes/shorts for dev channels
```

## Running Seeds

```bash
# Always target emulator (default)
npx ts-node scripts/seed-dev.ts

# To run against real dev project (requires explicit flag + dev project check)
SEED_TARGET=firebase npx ts-node scripts/seed-dev.ts
```

## Adding New Seed Scripts

1. Create a new file in `firebase/seed/`.
2. Export an async `seed()` function.
3. Import and call it from `scripts/seed-dev.ts`.
4. Add it to the execution order above.
