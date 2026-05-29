/**
 * Sound Platform — mixingPresets
 * ================================
 * Phase:   8-K (Audio Mixing Foundation)
 * Created: 2026-05-29
 *
 * Contains mixing preset definitions, default track configurations,
 * and FFmpeg filter builders for master adjustments.
 *
 * Shared between frontend (display) and backend (processing).
 *
 * DESIGN PRINCIPLES:
 *   - Foundation only — no full DAW yet
 *   - Voice-only rendering: volume, master gain, fade in/out
 *   - Music bed / SFX / ambient tracks are intent/settings only until
 *     a library or upload feature is available
 *   - Auto-ducking is stored as intent, not rendered without secondary tracks
 *   - All FFmpeg filters are standard built-ins (volume, afade)
 */

import type {
  AudioMixPresetId,
  AudioMixTrack,
  AudioMixingConfig,
} from './content';

// ── Default Track Templates ──────────────────────────────────────────────────

/** Create default voice track */
export function createDefaultVoiceTrack(): AudioMixTrack {
  return {
    id: 'voice',
    type: 'voice',
    label: 'صوتك',
    enabled: true,
    sourceType: 'none',
    volumeDb: 0,
    muted: false,
    fadeInMs: 0,
    fadeOutMs: 0,
    loop: false,
    duckUnderVoice: false,
  };
}

/** Create default music bed track */
export function createDefaultMusicTrack(): AudioMixTrack {
  return {
    id: 'musicBed',
    type: 'musicBed',
    label: 'موسيقى خلفية',
    enabled: false,
    sourceType: 'none',
    volumeDb: -18,
    muted: false,
    fadeInMs: 500,
    fadeOutMs: 1000,
    loop: true,
    duckUnderVoice: true,
  };
}

/** Create default SFX track */
export function createDefaultSfxTrack(): AudioMixTrack {
  return {
    id: 'sfx',
    type: 'sfx',
    label: 'مؤثرات صوتية',
    enabled: false,
    sourceType: 'none',
    volumeDb: -20,
    muted: false,
    fadeInMs: 0,
    fadeOutMs: 0,
    loop: false,
    duckUnderVoice: false,
  };
}

/** Get all 3 default tracks */
export function createDefaultTracks(): AudioMixTrack[] {
  return [createDefaultVoiceTrack(), createDefaultMusicTrack(), createDefaultSfxTrack()];
}

// ── Mixing Preset Definitions ────────────────────────────────────────────────

export interface MixingPresetDefinition {
  id: AudioMixPresetId;
  label: string;
  description: string;
  icon: string;
  /** Voice volume dB */
  voiceDb: number;
  /** Music bed volume dB */
  musicDb: number;
  /** SFX volume dB */
  sfxDb: number;
  autoDuck: boolean;
  fadeInMs: number;
  fadeOutMs: number;
  masterGainDb: number;
}

export const MIXING_PRESETS: MixingPresetDefinition[] = [
  {
    id: 'podcast',
    label: 'بودكاست',
    description: 'صوت واضح مع موسيقى خلفية خفيفة',
    icon: 'podcasts',
    voiceDb: 0,
    musicDb: -18,
    sfxDb: -24,
    autoDuck: true,
    fadeInMs: 500,
    fadeOutMs: 1000,
    masterGainDb: 0,
  },
  {
    id: 'radio',
    label: 'راديو',
    description: 'صوت قوي بأسلوب البث الإذاعي',
    icon: 'radio',
    voiceDb: 0,
    musicDb: -15,
    sfxDb: -20,
    autoDuck: true,
    fadeInMs: 200,
    fadeOutMs: 500,
    masterGainDb: 0,
  },
  {
    id: 'story',
    label: 'قصة قصيرة',
    description: 'سرد درامي مع بيئة صوتية',
    icon: 'auto_stories',
    voiceDb: -2,
    musicDb: -12,
    sfxDb: -15,
    autoDuck: true,
    fadeInMs: 1000,
    fadeOutMs: 2000,
    masterGainDb: 0,
  },
  {
    id: 'meditation',
    label: 'تأمل',
    description: 'هدوء وسكينة مع موسيقى مريحة',
    icon: 'self_improvement',
    voiceDb: -3,
    musicDb: -8,
    sfxDb: -20,
    autoDuck: false,
    fadeInMs: 2000,
    fadeOutMs: 3000,
    masterGainDb: 0,
  },
  {
    id: 'lightMusic',
    label: 'موسيقى خفيفة',
    description: 'موسيقى بارزة مع صوت واضح',
    icon: 'music_note',
    voiceDb: 0,
    musicDb: -10,
    sfxDb: -20,
    autoDuck: true,
    fadeInMs: 500,
    fadeOutMs: 1000,
    masterGainDb: 0,
  },
  {
    id: 'competition',
    label: 'مسابقة',
    description: 'صوت حيوي ونشط مع مؤثرات',
    icon: 'emoji_events',
    voiceDb: 0,
    musicDb: -20,
    sfxDb: -18,
    autoDuck: true,
    fadeInMs: 300,
    fadeOutMs: 500,
    masterGainDb: 0,
  },
];

// ── Valid IDs for Validation ─────────────────────────────────────────────────

export const VALID_MIX_PRESET_IDS: AudioMixPresetId[] = [
  'podcast', 'radio', 'story', 'meditation', 'lightMusic', 'competition',
];

export const VALID_MIX_LAYER_TYPES = ['voice', 'musicBed', 'sfx', 'ambient'] as const;

// ── FFmpeg Master Adjustments Builder ────────────────────────────────────────

/**
 * Determine which voice-only operations are renderable from the mixing config.
 * Only returns operations that actually change the output (non-zero values).
 */
export interface MixingMasterOps {
  /** Voice volume dB adjustment (0 means no change) */
  voiceVolumeDb: number;
  /** Master gain dB (0 means no change) */
  masterGainDb: number;
  /** Master fade in ms (0 means none) */
  fadeInMs: number;
  /** Master fade out ms (0 means none) */
  fadeOutMs: number;
  /** Human-readable list of operations that will be applied */
  operationLabels: string[];
  /** Whether there's anything to render */
  hasRenderableOps: boolean;
  /** Whether secondary layers exist but can't be rendered yet */
  hasDeferredLayers: boolean;
}

export function getMixingMasterOps(config: AudioMixingConfig): MixingMasterOps {
  const voiceTrack = config.tracks.find(t => t.type === 'voice');
  const voiceVolumeDb = voiceTrack && !voiceTrack.muted ? voiceTrack.volumeDb : 0;
  const masterGainDb = config.masterGainDb ?? 0;
  const fadeInMs = config.fadeInMs ?? 0;
  const fadeOutMs = config.fadeOutMs ?? 0;

  const operationLabels: string[] = [];
  if (voiceVolumeDb !== 0) operationLabels.push('voiceVolume');
  if (masterGainDb !== 0) operationLabels.push('masterGain');
  if (fadeInMs > 0) operationLabels.push('fadeIn');
  if (fadeOutMs > 0) operationLabels.push('fadeOut');

  // Check for deferred layers (have settings but no actual asset)
  const hasDeferredLayers = config.tracks.some(
    t => t.type !== 'voice' && t.enabled && !t.storagePath,
  );

  return {
    voiceVolumeDb,
    masterGainDb,
    fadeInMs,
    fadeOutMs,
    operationLabels,
    hasRenderableOps: operationLabels.length > 0,
    hasDeferredLayers,
  };
}

/**
 * Build FFmpeg -af filter chain for master adjustments.
 * Requires durationMs for fade out calculation.
 *
 * Returns null if no adjustments needed.
 */
export function buildMixingFFmpegChain(ops: MixingMasterOps, durationMs: number): string | null {
  if (!ops.hasRenderableOps) return null;

  const filters: string[] = [];

  // Voice volume + master gain combined as volume filter
  const totalGainDb = ops.voiceVolumeDb + ops.masterGainDb;
  if (totalGainDb !== 0) {
    filters.push(`volume=${totalGainDb}dB`);
  }

  // Fade in
  if (ops.fadeInMs > 0) {
    const fadeInSec = ops.fadeInMs / 1000;
    filters.push(`afade=t=in:d=${fadeInSec.toFixed(2)}`);
  }

  // Fade out (requires knowing total duration)
  if (ops.fadeOutMs > 0 && durationMs > 0) {
    const fadeOutSec = ops.fadeOutMs / 1000;
    const startSec = Math.max(0, (durationMs / 1000) - fadeOutSec);
    filters.push(`afade=t=out:st=${startSec.toFixed(2)}:d=${fadeOutSec.toFixed(2)}`);
  }

  return filters.length > 0 ? filters.join(',') : null;
}

/**
 * Convert dB to display percentage (0% = -40dB, 100% = 0dB).
 * Values above 0dB map to >100%.
 */
export function dbToPercent(db: number): number {
  return Math.round(((db + 40) / 40) * 100);
}

/**
 * Convert display percentage back to dB.
 */
export function percentToDb(pct: number): number {
  return Math.round(((pct / 100) * 40) - 40);
}
