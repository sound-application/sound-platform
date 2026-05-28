/**
 * Sound Platform — Seed Provider Configs
 * ========================================
 * Phase:   8-H.0 (Provider Registry Foundation)
 * Created: 2026-05-29
 *
 * Seeds providerConfigs/{featureId} documents with default disabled configs.
 * Safe to run multiple times — only creates documents that don't already exist.
 *
 * Usage:
 *   npx ts-node scripts/seed-provider-configs.ts
 *   (or via firebase-admin with project credentials)
 *
 * SECURITY:
 *   - No API keys or secrets written.
 *   - Only metadata and env var names.
 */

import * as admin from 'firebase-admin';

// Initialize with default project credentials
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

interface SeedConfig {
  featureId: string;
  enabled: boolean;
  primaryProvider: {
    providerId: string;
    label: string;
    requiredSecrets: string[];
  };
  fallbackProviders: Array<{
    providerId: string;
    label: string;
    requiredSecrets: string[];
  }>;
  notes: string;
}

const DEFAULT_CONFIGS: SeedConfig[] = [
  {
    featureId: 'audio.transcription',
    enabled: false,
    primaryProvider: {
      providerId: 'google-stt',
      label: 'Google Speech-to-Text',
      requiredSecrets: ['GOOGLE_STT_API_KEY'],
    },
    fallbackProviders: [
      {
        providerId: 'openai-whisper',
        label: 'OpenAI Whisper API',
        requiredSecrets: ['OPENAI_API_KEY'],
      },
    ],
    notes: 'Audio transcription for captions. Phase 8-G uses this.',
  },
  {
    featureId: 'ai.cover',
    enabled: false,
    primaryProvider: {
      providerId: 'openai-dalle',
      label: 'OpenAI DALL-E',
      requiredSecrets: ['OPENAI_API_KEY'],
    },
    fallbackProviders: [
      {
        providerId: 'stability-ai',
        label: 'Stability AI',
        requiredSecrets: ['STABILITY_API_KEY'],
      },
    ],
    notes: 'AI-generated cover art for audio content.',
  },
  {
    featureId: 'ai.script',
    enabled: false,
    primaryProvider: {
      providerId: 'openai-gpt',
      label: 'OpenAI GPT',
      requiredSecrets: ['OPENAI_API_KEY'],
    },
    fallbackProviders: [
      {
        providerId: 'google-gemini',
        label: 'Google Gemini',
        requiredSecrets: ['GOOGLE_GEMINI_API_KEY'],
      },
    ],
    notes: 'AI-generated scripts and descriptions.',
  },
  {
    featureId: 'content.moderation',
    enabled: false,
    primaryProvider: {
      providerId: 'google-perspective',
      label: 'Google Perspective API',
      requiredSecrets: ['PERSPECTIVE_API_KEY'],
    },
    fallbackProviders: [],
    notes: 'Content moderation for text, audio, and images.',
  },
  {
    featureId: 'search.indexing',
    enabled: false,
    primaryProvider: {
      providerId: 'algolia',
      label: 'Algolia',
      requiredSecrets: ['ALGOLIA_APP_ID', 'ALGOLIA_API_KEY'],
    },
    fallbackProviders: [
      {
        providerId: 'typesense',
        label: 'Typesense',
        requiredSecrets: ['TYPESENSE_API_KEY', 'TYPESENSE_HOST'],
      },
    ],
    notes: 'Search indexing for content discovery.',
  },
  {
    featureId: 'notifications.push',
    enabled: false,
    primaryProvider: {
      providerId: 'firebase-fcm',
      label: 'Firebase Cloud Messaging',
      requiredSecrets: [], // FCM uses default Firebase project credentials
    },
    fallbackProviders: [],
    notes: 'Push notifications. FCM uses default project credentials — no extra secrets needed.',
  },
  {
    featureId: 'payments.primary',
    enabled: false,
    primaryProvider: {
      providerId: 'stripe',
      label: 'Stripe',
      requiredSecrets: ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET'],
    },
    fallbackProviders: [],
    notes: 'Payment processing for subscriptions and gifts.',
  },
  {
    featureId: 'maps.geocoding',
    enabled: false,
    primaryProvider: {
      providerId: 'google-maps',
      label: 'Google Maps Platform',
      requiredSecrets: ['GOOGLE_MAPS_API_KEY'],
    },
    fallbackProviders: [],
    notes: 'Geocoding and location services.',
  },
  {
    featureId: 'live.rtc',
    enabled: false,
    primaryProvider: {
      providerId: 'agora',
      label: 'Agora.io',
      requiredSecrets: ['AGORA_APP_ID', 'AGORA_APP_CERTIFICATE'],
    },
    fallbackProviders: [
      {
        providerId: 'livekit',
        label: 'LiveKit',
        requiredSecrets: ['LIVEKIT_API_KEY', 'LIVEKIT_API_SECRET', 'LIVEKIT_URL'],
      },
    ],
    notes: 'Real-time communication for live audio sessions.',
  },
];

async function seedProviderConfigs() {
  const now = new Date().toISOString();
  let created = 0;
  let skipped = 0;

  for (const config of DEFAULT_CONFIGS) {
    const docRef = db.collection('providerConfigs').doc(config.featureId);
    const snap = await docRef.get();

    if (snap.exists) {
      console.log(`  SKIP  ${config.featureId} (already exists)`);
      skipped++;
      continue;
    }

    await docRef.set({
      featureId: config.featureId,
      enabled: config.enabled,
      primaryProvider: config.primaryProvider,
      fallbackProviders: config.fallbackProviders,
      status: 'missingSecrets',
      updatedAt: now,
      updatedBy: 'seed-script',
      notes: config.notes,
    });

    console.log(`  CREATE  ${config.featureId}`);
    created++;
  }

  console.log(`\nDone. Created: ${created}, Skipped: ${skipped}`);
}

// Run
seedProviderConfigs()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Seed error:', err);
    process.exit(1);
  });
