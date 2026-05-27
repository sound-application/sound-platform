/**
 * Sound Platform — Backfill Usernames Index
 * ============================================
 * Phase:   7.1 (Username-Aware Profile Links)
 * Created: 2026-05-27
 *
 * One-time migration script for existing users.
 * Reads all users/{uid} documents and creates usernames/{normalizedUsername}
 * index entries for any users missing from the index.
 *
 * USAGE:
 *   Dry-run (default — reads only, no writes):
 *     npx tsx scripts/backfillUsernames.ts
 *
 *   Write mode (creates missing index entries):
 *     npx tsx scripts/backfillUsernames.ts --write
 *
 * REQUIREMENTS:
 *   - Firebase Admin SDK with application default credentials.
 *   - GOOGLE_APPLICATION_CREDENTIALS env var set, OR run from a machine
 *     with gcloud auth configured for the target project.
 *   - The .firebaserc default project must be correct (sound-platform-dev).
 *
 * CONFLICT HANDLING:
 *   If usernames/{normalized} already exists with a DIFFERENT uid,
 *   the conflict is logged and the entry is SKIPPED (not overwritten).
 *   Manual resolution is needed for conflicts.
 *
 * IDEMPOTENT:
 *   Safe to run multiple times. Existing correct entries are skipped.
 */

import * as admin from 'firebase-admin';

// ─── Inline normalizeUsername (avoids needing full shared package build) ──────
function normalizeUsername(raw: string): string | null {
  if (!raw) return null;
  const normalized = raw
    .trim()
    .replace(/^@+/, '')
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
  return normalized.length > 0 ? normalized : null;
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const writeMode = process.argv.includes('--write');

  console.log(`\n🔧 Backfill Usernames Index`);
  console.log(`   Mode: ${writeMode ? '✏️  WRITE (will create documents)' : '👀 DRY-RUN (read only)'}`);
  console.log('');

  // Initialize Admin SDK
  admin.initializeApp();
  const db = admin.firestore();

  // Read all users
  console.log('📖 Reading all users/... documents...');
  const usersSnap = await db.collection('users').get();
  console.log(`   Found ${usersSnap.size} user(s).\n`);

  let created = 0;
  let skipped = 0;
  let conflicts = 0;
  let noUsername = 0;
  let errors = 0;

  for (const userDoc of usersSnap.docs) {
    const uid = userDoc.id;
    const data = userDoc.data();
    const username = data.username as string | undefined;

    if (!username) {
      console.log(`  ⏭️  ${uid} — no username field, skipping`);
      noUsername++;
      continue;
    }

    const normalized = normalizeUsername(username);
    if (!normalized) {
      console.log(`  ⚠️  ${uid} — username "${username}" normalizes to empty, skipping`);
      noUsername++;
      continue;
    }

    try {
      const existingSnap = await db.collection('usernames').doc(normalized).get();

      if (existingSnap.exists) {
        const existingData = existingSnap.data() as { uid: string };
        if (existingData.uid === uid) {
          console.log(`  ✅ ${uid} — usernames/${normalized} already exists (correct)`);
          skipped++;
        } else {
          console.log(`  ❌ ${uid} — CONFLICT: usernames/${normalized} belongs to ${existingData.uid}`);
          conflicts++;
        }
        continue;
      }

      // Entry doesn't exist — create it
      if (writeMode) {
        const now = new Date().toISOString();
        await db.collection('usernames').doc(normalized).set({
          uid,
          username,
          normalizedUsername: normalized,
          createdAt: now,
          updatedAt: now,
        });
        console.log(`  ✏️  ${uid} — created usernames/${normalized}`);
      } else {
        console.log(`  🔍 ${uid} — WOULD create usernames/${normalized} (dry-run)`);
      }
      created++;
    } catch (err) {
      console.error(`  💥 ${uid} — error processing: ${err}`);
      errors++;
    }
  }

  // Summary
  console.log(`\n${'─'.repeat(60)}`);
  console.log(`📊 Backfill Summary:`);
  console.log(`   Total users:     ${usersSnap.size}`);
  console.log(`   ${writeMode ? 'Created' : 'Would create'}:     ${created}`);
  console.log(`   Already correct: ${skipped}`);
  console.log(`   Conflicts:       ${conflicts}`);
  console.log(`   No username:     ${noUsername}`);
  console.log(`   Errors:          ${errors}`);
  console.log(`   Mode:            ${writeMode ? 'WRITE' : 'DRY-RUN'}`);

  if (!writeMode && created > 0) {
    console.log(`\n💡 To apply changes, run with --write flag:`);
    console.log(`   npx tsx scripts/backfillUsernames.ts --write`);
  }

  console.log('');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
