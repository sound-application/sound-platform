/**
 * Sound Platform — Dev Seed Script
 * ==================================
 * Phase:   4-H
 * Updated: 2026-05-14
 *
 * TARGETS:
 *   - Default: Firestore Emulator (port 18080) — NO credentials needed.
 *   - Real dev project: set SEED_TARGET=firebase (guarded by project ID check).
 *
 * SAFETY GUARDS:
 *   1. If SEED_TARGET=firebase → checks FIREBASE_PROJECT_ID === 'sound-platform-dev'.
 *   2. If project ID check fails → exits immediately, writes nothing.
 *   3. All writes use set({ merge: true }) — fully idempotent.
 *   4. No real user data, no wallet data, no payment data, no secrets.
 *   5. No service account JSON ever referenced.
 *
 * USAGE:
 *   # Seed the local emulator (default, safe, no credentials):
 *   FIRESTORE_EMULATOR_HOST=127.0.0.1:18080 npx tsx scripts/seed-dev.ts
 *
 *   # Seed the real dev project (requires Firebase CLI login):
 *   SEED_TARGET=firebase FIREBASE_PROJECT_ID=sound-platform-dev npx tsx scripts/seed-dev.ts
 *
 * NOT SEEDED (server-only, never written from client-side tools):
 *   - wallet/            → Cloud Function managed
 *   - paymentOrders/     → Cloud Function managed
 *   - payoutRequests/    → Cloud Function managed
 *   - auditLog/          → append-only, Cloud Function only
 *   - kycDocuments/      → Cloud Function / admin only
 *   - moderationQueue/   → Cloud Function only
 *   - childGuardianLinks/→ Cloud Function only
 *   - Real user accounts → no real emails, no real UIDs
 */

import { initializeApp, cert, applicationDefault, App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';

// ─── Safety Guard ────────────────────────────────────────────────────────────

const SEED_TARGET = process.env.SEED_TARGET ?? 'emulator';
const ALLOWED_PROJECT_ID = 'sound-platform-dev';

if (SEED_TARGET === 'firebase') {
  const projectId = process.env.FIREBASE_PROJECT_ID ?? '';
  if (projectId !== ALLOWED_PROJECT_ID) {
    console.error('❌ SAFETY GUARD: SEED_TARGET=firebase but FIREBASE_PROJECT_ID is not sound-platform-dev.');
    console.error(`   Got: "${projectId}"`);
    console.error('   Set FIREBASE_PROJECT_ID=sound-platform-dev to proceed.');
    process.exit(1);
  }
  console.log(`✅ Safety guard passed — targeting real dev project: ${projectId}`);
} else {
  console.log('✅ Targeting Firestore Emulator — no credentials needed.');
  // Ensure emulator host is set
  if (!process.env.FIRESTORE_EMULATOR_HOST) {
    process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:18080';
    console.log('   Auto-set FIRESTORE_EMULATOR_HOST=127.0.0.1:18080');
  }
}

// ─── App Initialization ───────────────────────────────────────────────────────

let app: App;
if (SEED_TARGET === 'firebase') {
  // Use Application Default Credentials (Firebase CLI login).
  // No service account JSON — uses firebase CLI's cached credentials.
  app = initializeApp({ projectId: ALLOWED_PROJECT_ID }, 'seed');
} else {
  // Emulator mode — no credentials needed.
  app = initializeApp({ projectId: ALLOWED_PROJECT_ID }, 'seed');
}

const db: Firestore = getFirestore(app);

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function seed(path: string, data: Record<string, unknown>): Promise<void> {
  const parts = path.split('/');
  if (parts.length % 2 !== 0) {
    throw new Error(`Invalid document path (must be collection/doc): ${path}`);
  }
  const ref = db.doc(path);
  await ref.set({ ...data, _seeded: true, _seededAt: new Date().toISOString() }, { merge: true });
  console.log(`  ✅ ${path}`);
}

// ─── Seed Data ────────────────────────────────────────────────────────────────

async function seedAdminConfig(): Promise<void> {
  console.log('\n📁 adminConfig/');

  await seed('adminConfig/global', {
    platformName: 'Sound',
    platformNameAr: 'صوت',
    defaultLanguage: 'ar',
    supportedLanguages: ['ar', 'en'],
    maintenanceMode: false,
    minimumAppVersion: '1.0.0',
    defaultRegion: 'EG',
    supportEmail: 'support@sound-dev.invalid',
    termsVersion: '1.0',
    privacyVersion: '1.0',
    env: 'development',
  });

  await seed('featureFlags/defaults', {
    competitions: true,
    liveSessions: true,
    radioStations: true,
    contentBoost: false,
    adCampaigns: false,
    payoutEnabled: false,
    kycRequired: false,
    childAccounts: false,
    guardianApproval: false,
    onNetIntegration: false,
    autoModeration: false,
  });
}

async function seedWorlds(): Promise<void> {
  console.log('\n📁 worlds/');

  await seed('worlds/general', {
    nameAr: 'عام',
    nameEn: 'General',
    slug: 'general',
    icon: 'world_general',
    sortOrder: 1,
    isActive: true,
    description: 'المحتوى العام للمنصة',
  });

  await seed('worlds/plus', {
    nameAr: 'بلس',
    nameEn: 'Plus',
    slug: 'plus',
    icon: 'world_plus',
    sortOrder: 2,
    isActive: true,
    description: 'محتوى بلس الحصري',
  });

  await seed('worlds/music', {
    nameAr: 'موسيقى',
    nameEn: 'Music',
    slug: 'music',
    icon: 'world_music',
    sortOrder: 3,
    isActive: true,
    description: 'عالم الموسيقى',
  });

  await seed('worlds/radio', {
    nameAr: 'راديو',
    nameEn: 'Radio',
    slug: 'radio',
    icon: 'world_radio',
    sortOrder: 4,
    isActive: true,
    description: 'محطات الراديو',
  });

  // NOTE: لايف is the bottom navigation tab label for the Live tab.
  // It is NOT a world. Do not seed a 'live' world document.
  // The five worlds are: general, plus, music, radio, tournaments.
  await seed('worlds/tournaments', {
    nameAr: 'مسابقات',
    nameEn: 'Tournaments',
    slug: 'tournaments',
    icon: 'world_tournaments',
    sortOrder: 5,
    isActive: true,
    description: 'البطولات والتصويت والفائزين',
  });
}

async function seedPackages(): Promise<void> {
  console.log('\n📁 packages/');

  await seed('packages/free', {
    nameAr: 'مجاني',
    nameEn: 'Free',
    slug: 'free',
    price: 0,
    currency: 'EGP',
    interval: null,
    features: ['basic_streaming', 'limited_downloads'],
    isActive: true,
    sortOrder: 1,
  });

  await seed('packages/plus', {
    nameAr: 'بلس',
    nameEn: 'Plus',
    slug: 'plus',
    price: 0,       // TBD — placeholder for dev
    currency: 'EGP',
    interval: 'monthly',
    features: ['unlimited_streaming', 'offline_downloads', 'exclusive_content'],
    isActive: true,
    sortOrder: 2,
  });

  await seed('packages/creator', {
    nameAr: 'منشئ المحتوى',
    nameEn: 'Creator',
    slug: 'creator',
    price: 0,       // TBD — placeholder for dev
    currency: 'EGP',
    interval: 'monthly',
    features: ['publish_content', 'analytics', 'monetization'],
    isActive: true,
    sortOrder: 3,
  });
}

async function seedStoryTypes(): Promise<void> {
  console.log('\n📁 storyTypes/');

  const types: Array<{ id: string; nameAr: string; nameEn: string; icon: string }> = [
    { id: 'audio',    nameAr: 'صوتي',          nameEn: 'Audio',    icon: 'type_audio' },
    { id: 'video',    nameAr: 'مرئي',           nameEn: 'Video',    icon: 'type_video' },
    { id: 'image',    nameAr: 'صورة',           nameEn: 'Image',    icon: 'type_image' },
    { id: 'text',     nameAr: 'نص',             nameEn: 'Text',     icon: 'type_text' },
    { id: 'poll',     nameAr: 'استطلاع',        nameEn: 'Poll',     icon: 'type_poll' },
    { id: 'question', nameAr: 'سؤال',           nameEn: 'Question', icon: 'type_question' },
    { id: 'link',     nameAr: 'رابط',           nameEn: 'Link',     icon: 'type_link' },
    { id: 'template', nameAr: 'قالب',           nameEn: 'Template', icon: 'type_template' },
  ];

  for (const t of types) {
    await seed(`storyTypes/${t.id}`, {
      nameAr: t.nameAr,
      nameEn: t.nameEn,
      icon: t.icon,
      isActive: true,
    });
  }
}

async function seedRoles(): Promise<void> {
  console.log('\n📁 roles/');

  const roles: Array<{ id: string; nameAr: string; nameEn: string; level: number }> = [
    { id: 'super_admin',         nameAr: 'مشرف أعلى',          nameEn: 'Super Admin',          level: 100 },
    { id: 'admin',               nameAr: 'مشرف',               nameEn: 'Admin',                level: 90 },
    { id: 'moderator',           nameAr: 'مراقب',              nameEn: 'Moderator',            level: 70 },
    { id: 'radio_station_owner', nameAr: 'صاحب محطة راديو',    nameEn: 'Radio Station Owner',  level: 50 },
    { id: 'company_account',     nameAr: 'حساب شركة',          nameEn: 'Company Account',      level: 50 },
    { id: 'artist',              nameAr: 'فنان',               nameEn: 'Artist',               level: 40 },
    { id: 'creator',             nameAr: 'منشئ محتوى',         nameEn: 'Creator',              level: 30 },
    { id: 'user',                nameAr: 'مستخدم',             nameEn: 'User',                 level: 10 },
    { id: 'guardian',            nameAr: 'ولي أمر',            nameEn: 'Guardian',             level: 15 },
    { id: 'child',               nameAr: 'طفل',                nameEn: 'Child',                level: 5  },
  ];

  for (const r of roles) {
    await seed(`roles/${r.id}`, {
      nameAr: r.nameAr,
      nameEn: r.nameEn,
      level: r.level,
      isActive: true,
    });
  }
}

async function seedPermissions(): Promise<void> {
  console.log('\n📁 permissions/');

  await seed('permissions/defaults', {
    'platform.config.write':    { super_admin: true,  admin: false, moderator: false, creator: false, user: false },
    'content.publish':          { super_admin: true,  admin: true,  moderator: false, creator: true,  user: false },
    'content.moderate':         { super_admin: true,  admin: true,  moderator: true,  creator: false, user: false },
    'competition.jury':         { super_admin: true,  admin: true,  moderator: true,  creator: false, user: false },
    'wallet.view.own':          { super_admin: true,  admin: true,  moderator: false, creator: true,  user: false },
    'payout.request':           { super_admin: true,  admin: true,  moderator: false, creator: true,  user: false },
    'child.approve':            { super_admin: true,  admin: true,  moderator: false, creator: false, user: false },
    'report.submit':            { super_admin: true,  admin: true,  moderator: true,  creator: true,  user: true  },
  });
}

async function seedReportReasons(): Promise<void> {
  console.log('\n📁 reportReasons/');

  await seed('reportReasons/defaults', {
    reasons: [
      { id: 'inappropriate_content', labelAr: 'محتوى غير لائق',             labelEn: 'Inappropriate Content',  sortOrder: 1 },
      { id: 'harassment',            labelAr: 'تحرش أو مضايقة',             labelEn: 'Harassment',             sortOrder: 2 },
      { id: 'spam',                  labelAr: 'محتوى مزعج',                  labelEn: 'Spam',                   sortOrder: 3 },
      { id: 'misinformation',        labelAr: 'معلومات مضللة',              labelEn: 'Misinformation',         sortOrder: 4 },
      { id: 'copyright',             labelAr: 'انتهاك حقوق الملكية',         labelEn: 'Copyright Violation',    sortOrder: 5 },
      { id: 'minor_safety',          labelAr: 'محتوى يهدد سلامة الأطفال',   labelEn: 'Child Safety',           sortOrder: 6 },
      { id: 'hate_speech',           labelAr: 'خطاب كراهية',                labelEn: 'Hate Speech',            sortOrder: 7 },
      { id: 'other',                 labelAr: 'سبب آخر',                    labelEn: 'Other',                  sortOrder: 8 },
    ],
  });
}

async function seedSupportCategories(): Promise<void> {
  console.log('\n📁 supportCategories/');

  await seed('supportCategories/defaults', {
    categories: [
      { id: 'account',   labelAr: 'مشكلة في الحساب',  labelEn: 'Account Issue',    sortOrder: 1 },
      { id: 'payment',   labelAr: 'مشكلة في الدفع',   labelEn: 'Payment Issue',    sortOrder: 2 },
      { id: 'content',   labelAr: 'محتوى',            labelEn: 'Content',          sortOrder: 3 },
      { id: 'technical', labelAr: 'مشكلة تقنية',      labelEn: 'Technical Issue',  sortOrder: 4 },
      { id: 'other',     labelAr: 'أخرى',             labelEn: 'Other',            sortOrder: 5 },
    ],
  });
}

async function seedCompetitionDimensions(): Promise<void> {
  console.log('\n📁 competitionDimensions/');

  await seed('competitionDimensions/defaults', {
    dimensions: [
      { id: 'vocal_quality',   labelAr: 'جودة الصوت',       labelEn: 'Vocal Quality',     maxScore: 10, sortOrder: 1 },
      { id: 'creativity',      labelAr: 'الإبداع',          labelEn: 'Creativity',        maxScore: 10, sortOrder: 2 },
      { id: 'authenticity',    labelAr: 'الأصالة',          labelEn: 'Authenticity',      maxScore: 10, sortOrder: 3 },
      { id: 'technique',       labelAr: 'التقنية',          labelEn: 'Technique',         maxScore: 10, sortOrder: 4 },
      { id: 'emotional_impact',labelAr: 'التأثير العاطفي',  labelEn: 'Emotional Impact',  maxScore: 10, sortOrder: 5 },
    ],
  });
}

async function seedChildPermissionDefaults(): Promise<void> {
  console.log('\n📁 childPermissionDefaults/');

  await seed('childPermissionDefaults/global', {
    canPublishContent: false,
    canParticipateInCompetitions: false,
    canJoinLiveSessions: false,
    canSendGifts: false,
    canRequestPayout: false,
    contentFilterLevel: 'strict',
    requiresGuardianApprovalForPurchases: true,
    requiresGuardianApprovalForPublishing: true,
    requiresGuardianApprovalForLiveSessions: true,
  });
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log('=================================================');
  console.log('Sound Platform — Dev Seed Script');
  console.log(`Target: ${SEED_TARGET === 'firebase' ? `Firebase project: ${ALLOWED_PROJECT_ID}` : 'Firestore Emulator'}`);
  console.log('=================================================');
  console.log('\n⚠️  WARNING: This script writes FAKE DEV DATA ONLY.');
  console.log('   No real user data. No payment data. No secrets.\n');

  await seedAdminConfig();
  await seedWorlds();
  await seedPackages();
  await seedStoryTypes();
  await seedRoles();
  await seedPermissions();
  await seedReportReasons();
  await seedSupportCategories();
  await seedCompetitionDimensions();
  await seedChildPermissionDefaults();

  console.log('\n=================================================');
  console.log('✅ Dev seed complete.');
  console.log('=================================================\n');
}

main().catch((err: unknown) => {
  console.error('\n❌ Seed script error:', err);
  process.exit(1);
});
