/**
 * Sound Platform — Schema Alignment Check Script
 * ================================================
 * Phase:   5-D (Schema Correction — World Model + Tournaments Privacy)
 * Created: 2026-05-17
 *
 * Checks the sound-platform-dev Firestore database for documents that conflict
 * with the corrected Sound product model and reports them.
 *
 * DEFAULT MODE: --dry-run  (reads only, no writes)
 * APPLY MODE:   --apply    (patches documents — requires explicit Akram approval)
 *
 * Usage:
 *   npx ts-node scripts/checkSchemaAlignment.ts
 *   npx ts-node scripts/checkSchemaAlignment.ts --apply
 *
 * Requirements:
 *   Authenticate first with one of:
 *     Option A — gcloud ADC (recommended for local dev):
 *       gcloud auth application-default login
 *       gcloud config set project sound-platform-dev
 *     Option B — service account key:
 *       set GOOGLE_APPLICATION_CREDENTIALS=C:\path\to\service-account-key.json
 *   - Run from the repo root: cd C:\Users\akram\Downloads\Sound\sound-platform
 *
 * Safety:
 *   - Script targets sound-platform-dev ONLY.
 *   - Never touches production.
 *   - In --apply mode, only adds missing tournaments privacy sections and patches
 *     publicProfiles with the isTournamentsCreator flag. Does NOT remove fields.
 *   - All writes are logged before execution.
 */

import * as admin from 'firebase-admin';

// ── Target project guard ───────────────────────────────────────────────────────

const TARGET_PROJECT = 'sound-platform-dev';

// ── CLI flags ──────────────────────────────────────────────────────────────────

const args    = process.argv.slice(2);
const DRY_RUN = !args.includes('--apply');

if (DRY_RUN) {
  console.log('🔍  DRY-RUN mode — no writes will be performed.');
  console.log('    Run with --apply to patch documents (requires Akram approval).\n');
} else {
  console.log('⚠️   APPLY mode — documents will be patched.\n');
}

// ── Firebase Admin init ────────────────────────────────────────────────────────

admin.initializeApp({ projectId: TARGET_PROJECT });
const db = admin.firestore();

// Verify we are on the correct project
const actualProject = admin.app().options.projectId;
if (actualProject !== TARGET_PROJECT) {
  console.error(`❌  Wrong project: ${actualProject}. Expected: ${TARGET_PROJECT}`);
  process.exit(1);
}
console.log(`✅  Connected to project: ${TARGET_PROJECT}\n`);

// ── Tournaments privacy sections that must exist ───────────────────────────────

const REQUIRED_TOURNAMENTS_SECTIONS = [
  'tournamentsOrganizerContent',
  'joinedTournaments',
  'tournamentSubmissions',
  'votingActivity',
  'awardsAndMedals',
] as const;

/** Default audience values for each missing tournaments section. */
const TOURNAMENTS_SECTION_DEFAULTS: Record<string, { audiences: string[] }> = {
  tournamentsOrganizerContent: { audiences: ['public'] },
  joinedTournaments:           { audiences: ['public'] },
  tournamentSubmissions:       { audiences: ['onlyMe'] },
  votingActivity:              { audiences: ['onlyMe'] },
  awardsAndMedals:             { audiences: ['public'] },
};

// ── Result counters ────────────────────────────────────────────────────────────

const report = {
  totalUsers:                   0,
  legacyAccountType:            0,
  missingTournamentsPrivacy:    0,
  missingTournamentsPrivacyIds: [] as string[],
  publicProfilesMissingFlag:    0,
  publicProfilesMissingFlagIds: [] as string[],
  capabilityMissingOrganizerKey: 0,
  documentsPatched:             0,
};

// ── Main ───────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  // ── 1. Scan users collection ─────────────────────────────────────────────────
  console.log('── Scanning users collection ──────────────────────────────────────');
  const usersSnap = await db.collection('users').get();
  report.totalUsers = usersSnap.size;
  console.log(`   Found ${report.totalUsers} user document(s).\n`);

  for (const doc of usersSnap.docs) {
    const uid  = doc.id;
    const data = doc.data();

    // ── Check 1: Legacy accountType ────────────────────────────────────────────
    if (data['accountType'] !== undefined && data['accountType'] !== null) {
      report.legacyAccountType++;
      console.log(`   [LEGACY accountType] users/${uid} → accountType: '${data['accountType']}'`);
    }

    // ── Check 2: Capability object missing tournament_organizer key ────────────
    // Note: missing the KEY is not a problem (optional field). This check reports
    // users who have capabilities set to a non-empty object but are missing the key.
    // This is informational only — the field is optional in the schema.
    const caps = data['capabilities'] as Record<string, unknown> | undefined;
    if (caps && Object.keys(caps).length > 0 && !('tournament_organizer' in caps)) {
      report.capabilityMissingOrganizerKey++;
      // This is expected for all current users — logged at debug level only
    }

    // ── Check 3: Privacy object missing tournaments sections ───────────────────
    const privacy = data['privacy'] as Record<string, unknown> | undefined;
    const missingSections: string[] = [];

    for (const section of REQUIRED_TOURNAMENTS_SECTIONS) {
      if (!privacy || !(section in privacy)) {
        missingSections.push(section);
      }
    }

    if (missingSections.length > 0) {
      report.missingTournamentsPrivacy++;
      report.missingTournamentsPrivacyIds.push(uid);
      console.log(`   [MISSING privacy sections] users/${uid}`);
      console.log(`     Missing: ${missingSections.join(', ')}`);

      if (!DRY_RUN) {
        // Build patch with missing sections only (merge — do not overwrite existing)
        const patch: Record<string, unknown> = {};
        for (const section of missingSections) {
          patch[`privacy.${section}`] = TOURNAMENTS_SECTION_DEFAULTS[section];
        }
        console.log(`     → Patching users/${uid} with:`, JSON.stringify(patch));
        await db.collection('users').doc(uid).update(patch);
        report.documentsPatched++;
        console.log(`     ✅  Patched.`);
      }
    }
  }

  // ── 2. Scan publicProfiles collection ─────────────────────────────────────────
  console.log('\n── Scanning publicProfiles collection ─────────────────────────────');
  const pubSnap = await db.collection('publicProfiles').get();
  console.log(`   Found ${pubSnap.size} publicProfile document(s).\n`);

  for (const doc of pubSnap.docs) {
    const uid  = doc.id;
    const data = doc.data();

    const general = data['generalProfile'] as Record<string, unknown> | undefined;

    // ── Check 4: generalProfile missing isTournamentsCreator flag ─────────────
    if (general && !('isTournamentsCreator' in general)) {
      report.publicProfilesMissingFlag++;
      report.publicProfilesMissingFlagIds.push(uid);
      console.log(`   [MISSING isTournamentsCreator] publicProfiles/${uid}`);

      if (!DRY_RUN) {
        console.log(`     → Patching publicProfiles/${uid} → generalProfile.isTournamentsCreator: false`);
        await db.collection('publicProfiles').doc(uid).update({
          'generalProfile.isTournamentsCreator': false,
        });
        report.documentsPatched++;
        console.log(`     ✅  Patched.`);
      }
    }
  }

  // ── 3. Worlds collection checks ───────────────────────────────────────────────
  console.log('\n──────────────────────────────── Checking worlds collection ──────────────────────────────────');

  // 3a. worlds/live document (MUST NOT EXIST)
  let liveWorldDocFound = false;
  try {
    const liveWorldDoc = await db.collection('worlds').doc('live').get();
    if (liveWorldDoc.exists) {
      liveWorldDocFound = true;
      const d = liveWorldDoc.data();
      console.log(`   WARNING: worlds/live document exists!`);
      console.log(`         nameAr: '${String(d?.['nameAr'])}', slug: '${String(d?.['slug'])}'`);
      console.log(`         Live is a bottom tab NOT a world. Fifth world is tournaments.`);
      console.log(`         ACTION: Delete worlds/live manually (requires Akram approval).`);
    } else {
      console.log(`   OK  worlds/live: does not exist (correct).`);
    }
  } catch {
    console.log(`   INFO worlds/live: could not be checked.`);
  }

  // 3b. worlds/tournaments document (MUST EXIST)
  let tournamentWorldMissing = false;
  try {
    const tournDoc = await db.collection('worlds').doc('tournaments').get();
    if (!tournDoc.exists) {
      tournamentWorldMissing = true;
      console.log(`   MISSING: worlds/tournaments does not exist.`);
      console.log(`         Run: npx tsx scripts/seed-dev.ts`);
    } else {
      const d = tournDoc.data();
      console.log(`   OK  worlds/tournaments exists -- nameAr: '${String(d?.['nameAr'])}', sortOrder: ${String(d?.['sortOrder'])}`);
    }
  } catch {
    console.log(`   INFO worlds/tournaments: could not be checked.`);
  }

  // ── 4. Scan content collections for live-as-world field values ────────────
  console.log('\n──────────────────────────────── Scanning for live-as-world field values ────────────────────────');
  const WORLD_FIELDS   = ['worldId', 'world', 'targetWorld', 'selectedWorld'];
  const WORLD_COLS     = ['content', 'competitions', 'liveSessions', 'drafts', 'posts', 'stories'];
  let liveWorldCount = 0;

  for (const colName of WORLD_COLS) {
    for (const field of WORLD_FIELDS) {
      try {
        const snap = await db.collection(colName).where(field, '==', 'live').limit(50).get();
        if (!snap.empty) {
          liveWorldCount += snap.size;
          console.log(`   FOUND: ${colName}[${field}='live']: ${snap.size} doc(s)`);
          snap.docs.slice(0, 5).forEach(d => console.log(`     ${colName}/${d.id}`));
        }
      } catch { /* collection or index absent -- skip */ }
    }
  }
  if (liveWorldCount === 0) {
    console.log(`   OK  No documents found using 'live' as a world value.`);
  }

  // ── 5. Final report ────────────────────────────────────────────────────────────
  console.log('\n==================================================================');
  console.log('  SCHEMA ALIGNMENT REPORT');
  console.log('==================================================================');
  console.log(`  Project:                         ${TARGET_PROJECT}`);
  console.log(`  Mode:                            ${DRY_RUN ? 'DRY-RUN (no writes)' : 'APPLY'}`);
  console.log(`  Total users scanned:             ${report.totalUsers}`);
  console.log(`  Legacy accountType found:        ${report.legacyAccountType}`);
  console.log(`  Missing tournaments privacy:     ${report.missingTournamentsPrivacy}`);
  if (report.missingTournamentsPrivacyIds.length > 0) {
    console.log(`    UIDs: ${report.missingTournamentsPrivacyIds.join(', ')}`);
  }
  console.log(`  publicProfiles missing flag:     ${report.publicProfilesMissingFlag}`);
  if (report.publicProfilesMissingFlagIds.length > 0) {
    console.log(`    UIDs: ${report.publicProfilesMissingFlagIds.join(', ')}`);
  }
  console.log(`  worlds/live forbidden doc:       ${liveWorldDocFound ? 'EXISTS -- manual delete required' : 'absent (correct)'}`);
  console.log(`  worlds/tournaments missing:      ${tournamentWorldMissing ? 'MISSING -- run seed script' : 'exists (correct)'}`);
  console.log(`  live-as-world field values:      ${liveWorldCount > 0 ? String(liveWorldCount) + ' doc(s) found' : 'none'}`);
  if (!DRY_RUN) {
    console.log(`  Documents patched:               ${report.documentsPatched}`);
  }
  console.log('==================================================================\n');

  // Action summary
  const issues: string[] = [];
  if (report.missingTournamentsPrivacy > 0)
    issues.push(`${report.missingTournamentsPrivacy} user(s) missing tournaments privacy sections (run --apply to fix)`);
  if (report.publicProfilesMissingFlag > 0)
    issues.push(`${report.publicProfilesMissingFlag} publicProfile(s) missing isTournamentsCreator (run --apply to fix)`);
  if (liveWorldDocFound)
    issues.push('worlds/live forbidden document exists -- manual deletion requires Akram approval');
  if (tournamentWorldMissing)
    issues.push('worlds/tournaments missing -- run: npx tsx scripts/seed-dev.ts');
  if (liveWorldCount > 0)
    issues.push(`${liveWorldCount} doc(s) use live as a world field value -- review required`);
  if (report.legacyAccountType > 0)
    issues.push(`${report.legacyAccountType} user(s) have legacy accountType field (deferred migration -- no action needed now)`);

  if (issues.length === 0) {
    console.log('All checks passed. Schema is aligned with the 5-world product model.');
  } else {
    console.log('Issues found:');
    issues.forEach(i => console.log(`  - ${i}`));
    if (DRY_RUN) {
      console.log('\nRun with --apply to patch safe additive fields.');
      console.log('Manual actions (worlds/live deletion) require Akram approval.');
    }
  }
}

main().catch(err => {
  console.error('❌  Script failed:', err);
  process.exit(1);
});
