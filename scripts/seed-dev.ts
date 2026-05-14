/**
 * Sound Platform — Dev Seed Script (PLACEHOLDER)
 * ================================================
 * Phase:   4-G
 * Target:  sound-platform-dev (Firebase emulator by default)
 * Updated: 2026-05-14
 *
 * STATUS: PLACEHOLDER ONLY — no real writes implemented yet.
 *
 * This script will be implemented in Phase 4-H.
 * It creates safe, fake development data in the Firestore
 * emulator (or the dev project with explicit flag).
 *
 * SAFETY GUARDS (to be enforced when implemented):
 *   1. Check process.env.FIREBASE_PROJECT_ID contains '-dev'
 *   2. Check process.env.NODE_ENV === 'development'
 *   3. If SEED_TARGET=firebase, prompt for confirmation
 *   4. All writes use set({ merge: true }) — idempotent
 *   5. No real credentials, no real user data, no payment data
 *
 * SEED COLLECTIONS PLANNED:
 *   - adminConfig/global           → platform configuration
 *   - adminConfig/featureFlags     → feature flag defaults
 *   - adminConfig/worlds           → five worlds definition
 *   - adminConfig/roles            → role definitions
 *   - adminConfig/permissions      → permission matrix
 *   - packages/{id}                → Spark / General / Plus
 *   - reportReasons/{id}           → content/user report reasons
 *   - radioStations/{id}           → sample radio stations
 *   - users/dev-superadmin-001     → first dev super-admin placeholder
 *   - users/dev-creator-001..005   → fake dev creators
 *   - users/dev-listener-001..005  → fake dev listeners
 *   - channels/{id}                → fake dev channels
 *   - content/{id}                 → fake dev episodes and shorts
 *
 * NOT SEEDED (server-only, never seeded from client):
 *   - wallet/                      → managed by Cloud Functions
 *   - paymentOrders/               → managed by Cloud Functions
 *   - payoutRequests/              → managed by Cloud Functions
 *   - auditLog/                    → append-only, Cloud Function only
 *   - kycDocuments/                → Cloud Function / admin only
 *   - moderationQueue/             → Cloud Function only
 *   - childGuardianLinks/          → Cloud Function only
 */

// TODO (Phase 4-H): Implement actual seed functions
// import { initializeApp } from 'firebase-admin/app';
// import { getFirestore } from 'firebase-admin/firestore';
// import { seedAdminConfig } from '../firebase/seed/seed-admin-config';
// import { seedPackages } from '../firebase/seed/seed-packages';
// import { seedReportReasons } from '../firebase/seed/seed-report-reasons';
// import { seedDevUsers } from '../firebase/seed/seed-dev-users';
// import { seedDevChannels } from '../firebase/seed/seed-dev-channels';
// import { seedDevContent } from '../firebase/seed/seed-dev-content';

async function main(): Promise<void> {
  console.log('=================================================');
  console.log('Sound Platform — Dev Seed Script');
  console.log('STATUS: PLACEHOLDER — not yet implemented.');
  console.log('Implementation target: Phase 4-H.');
  console.log('=================================================');
  // Implementation will go here in Phase 4-H.
  // Do NOT add real credentials or data here.
}

main().catch((err) => {
  console.error('Seed script error:', err);
  process.exit(1);
});
