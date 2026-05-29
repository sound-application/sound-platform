/**
 * Sound Platform — effectsPresets
 * ================================
 * Phase:   8-J (Sound Effects Presets + Manual Filter Controls)
 * Created: 2026-05-29
 *
 * Contains preset definitions, filter metadata, and FFmpeg filter chain builders.
 * Shared between frontend (display) and backend (processing).
 *
 * DESIGN PRINCIPLES:
 *   - Conservative settings — avoid extreme distortion
 *   - All FFmpeg filters are standard built-ins (loudnorm, acompressor, equalizer,
 *     highpass, bandreject, aecho, alimiter) available in ffmpeg-static
 *   - Every preset ends with loudnorm for consistent output level
 *   - "صوت تلاوة قرآن" is clarity + gentle ambience only — no content alteration
 */

import type {
  AudioEffectPresetId,
  AudioEffectFilterId,
  AudioEffectFilterSetting,
  AudioEffectsConfig,
} from './content';

// ── Preset Definitions ───────────────────────────────────────────────────────

export interface PresetDefinition {
  id: AudioEffectPresetId;
  label: string;
  description: string;
  icon: string; // Material Symbols icon name
  /** FFmpeg -af filter chain string for this preset */
  ffmpegChain: string;
}

export const AUDIO_PRESETS: PresetDefinition[] = [
  {
    id: 'radio',
    label: 'صوت إذاعي',
    description: 'صوت نظيف وقوي كصوت الراديو',
    icon: 'radio',
    ffmpegChain: 'highpass=f=80,acompressor=threshold=-20dB:ratio=4:attack=5:release=50,equalizer=f=3000:width_type=o:width=2:g=3,loudnorm=I=-16:TP=-1.5:LRA=11',
  },
  {
    id: 'podcast',
    label: 'بودكاست',
    description: 'وضوح ممتاز للمحادثات والحوارات',
    icon: 'podcasts',
    ffmpegChain: 'highpass=f=60,acompressor=threshold=-18dB:ratio=3:attack=10:release=100,loudnorm=I=-16:TP=-1.5:LRA=11',
  },
  {
    id: 'deep',
    label: 'صوت عميق',
    description: 'تعزيز خفيف للجهير والجسم الصوتي',
    icon: 'graphic_eq',
    ffmpegChain: 'equalizer=f=200:width_type=o:width=2:g=4,equalizer=f=100:width_type=o:width=1:g=2,loudnorm=I=-16:TP=-1.5:LRA=11',
  },
  {
    id: 'sharp',
    label: 'صوت حاد وواضح',
    description: 'وضوح عالي وحدة بالترددات العلوية',
    icon: 'hearing',
    ffmpegChain: 'equalizer=f=4000:width_type=o:width=2:g=3,equalizer=f=8000:width_type=o:width=1:g=2,highpass=f=100,loudnorm=I=-16:TP=-1.5:LRA=11',
  },
  {
    id: 'warm',
    label: 'صوت دافئ',
    description: 'دفء في المنتصف مع تخفيف الحدة',
    icon: 'local_fire_department',
    ffmpegChain: 'equalizer=f=250:width_type=o:width=2:g=3,equalizer=f=8000:width_type=o:width=1:g=-2,loudnorm=I=-16:TP=-1.5:LRA=11',
  },
  {
    id: 'tv',
    label: 'صوت تلفزيوني',
    description: 'معالجة احترافية كالبث التلفزيوني',
    icon: 'tv',
    ffmpegChain: 'highpass=f=80,acompressor=threshold=-16dB:ratio=5:attack=3:release=40,equalizer=f=2500:width_type=o:width=2:g=2,alimiter=limit=0.95,loudnorm=I=-16:TP=-1.5:LRA=11',
  },
  {
    id: 'lightReverb',
    label: 'صوت مع ريفيرب خفيف',
    description: 'صدى غرفة خفيف لعمق طبيعي',
    icon: 'surround_sound',
    ffmpegChain: 'aecho=0.8:0.7:40:0.3,loudnorm=I=-16:TP=-1.5:LRA=11',
  },
  {
    id: 'delay',
    label: 'صوت مع تأخير',
    description: 'تأثير صدى خفيف متكرر',
    icon: 'timelapse',
    ffmpegChain: 'aecho=0.8:0.5:250|500:0.3|0.15,loudnorm=I=-16:TP=-1.5:LRA=11',
  },
  {
    id: 'quranRecitation',
    label: 'صوت تلاوة قرآن',
    description: 'وضوح الصوت مع أجواء هادئة ومريحة',
    icon: 'auto_awesome',
    ffmpegChain: 'equalizer=f=3000:width_type=o:width=2:g=2,aecho=0.8:0.75:30:0.2,loudnorm=I=-16:TP=-1.5:LRA=11',
  },
  {
    id: 'poetryRecital',
    label: 'صوت إلقاء شعر',
    description: 'وضوح مع بيئة صوتية معبّرة',
    icon: 'edit_note',
    ffmpegChain: 'aecho=0.8:0.7:35:0.25,equalizer=f=2500:width_type=o:width=2:g=2,loudnorm=I=-16:TP=-1.5:LRA=11',
  },
  {
    id: 'sessions',
    label: 'صوت جلسات',
    description: 'دفء طبيعي مع أجواء غرفة',
    icon: 'groups',
    ffmpegChain: 'aecho=0.8:0.65:50:0.35,equalizer=f=200:width_type=o:width=2:g=2,loudnorm=I=-16:TP=-1.5:LRA=11',
  },
];

// ── Manual Filter Definitions ────────────────────────────────────────────────

export interface FilterDefinition {
  id: AudioEffectFilterId;
  label: string;
  description: string;
  icon: string;
  /** Default intensity (0-100) when first enabled */
  defaultIntensity: number;
}

export const AUDIO_FILTERS: FilterDefinition[] = [
  {
    id: 'normalize',
    label: 'تطبيع الصوت',
    description: 'ضبط مستوى الصوت العام',
    icon: 'tune',
    defaultIntensity: 60,
  },
  {
    id: 'compressor',
    label: 'ضاغط ديناميك',
    description: 'توحيد مستوى الصوت',
    icon: 'compress',
    defaultIntensity: 50,
  },
  {
    id: 'noiseReduction',
    label: 'إزالة الضوضاء',
    description: 'تصفية الأصوات المنخفضة غير المرغوبة',
    icon: 'noise_aware',
    defaultIntensity: 40,
  },
  {
    id: 'deesser',
    label: 'تخفيف الحدة',
    description: 'تقليل أصوات السين والشين الحادة',
    icon: 'hearing_disabled',
    defaultIntensity: 40,
  },
  {
    id: 'clarity',
    label: 'وضوح الصوت',
    description: 'تعزيز ترددات الوضوح والحضور',
    icon: 'visibility',
    defaultIntensity: 50,
  },
  {
    id: 'bassBoost',
    label: 'تعزيز الجهير',
    description: 'تقوية الترددات المنخفضة',
    icon: 'speaker',
    defaultIntensity: 40,
  },
  {
    id: 'warmth',
    label: 'دفء الصوت',
    description: 'إضافة دفء للترددات المتوسطة',
    icon: 'local_fire_department',
    defaultIntensity: 45,
  },
  {
    id: 'treble',
    label: 'حدة عالية',
    description: 'تعزيز الترددات العالية',
    icon: 'music_note',
    defaultIntensity: 40,
  },
  {
    id: 'reverb',
    label: 'صدى',
    description: 'محاكاة صدى غرفة',
    icon: 'surround_sound',
    defaultIntensity: 35,
  },
  {
    id: 'echoDelay',
    label: 'تأخير',
    description: 'صدى متكرر خفيف',
    icon: 'timelapse',
    defaultIntensity: 30,
  },
  {
    id: 'limiter',
    label: 'محدد الصوت',
    description: 'منع تجاوز الذروة الصوتية',
    icon: 'vertical_align_center',
    defaultIntensity: 50,
  },
];

// ── FFmpeg Filter Chain Builder (for manual filters) ─────────────────────────

/**
 * Build a single FFmpeg filter string for a given filter setting.
 * Intensity is 0–100 and maps to conservative parameter ranges.
 *
 * Returns null if the filter is not enabled or intensity is 0.
 */
export function buildFilterString(setting: AudioEffectFilterSetting): string | null {
  if (!setting.enabled || setting.intensity <= 0) return null;

  const i = setting.intensity;

  switch (setting.filterId) {
    case 'normalize': {
      // I from -24 (gentle) to -14 (aggressive) — default -16 at intensity 60
      const targetI = -24 + (i * 0.1);
      return `loudnorm=I=${targetI.toFixed(1)}:TP=-1.5:LRA=11`;
    }
    case 'compressor': {
      // threshold -30→-20 dB, ratio 2→6
      const threshold = -30 + (i * 0.1);
      const ratio = 2 + (i * 0.04);
      return `acompressor=threshold=${threshold.toFixed(0)}dB:ratio=${ratio.toFixed(1)}:attack=5:release=50`;
    }
    case 'noiseReduction': {
      // highpass cutoff 60→300 Hz
      const freq = 60 + (i * 2.4);
      return `highpass=f=${Math.round(freq)}`;
    }
    case 'deesser': {
      // bandreject at sibilance frequency, width 200→3000
      const width = 200 + (i * 28);
      return `bandreject=f=7000:width_type=h:w=${Math.round(width)}`;
    }
    case 'clarity': {
      // presence EQ boost at 3.5kHz, gain 0→5 dB
      const gain = i * 0.05;
      return `equalizer=f=3500:width_type=o:width=2:g=${gain.toFixed(1)}`;
    }
    case 'bassBoost': {
      // low shelf at 150Hz, gain 0→6 dB
      const gain = i * 0.06;
      return `equalizer=f=150:width_type=o:width=1:g=${gain.toFixed(1)}`;
    }
    case 'warmth': {
      // mid-low at 250Hz, gain 0→4 dB
      const gain = i * 0.04;
      return `equalizer=f=250:width_type=o:width=2:g=${gain.toFixed(1)}`;
    }
    case 'treble': {
      // high shelf at 8kHz, gain 0→5 dB
      const gain = i * 0.05;
      return `equalizer=f=8000:width_type=o:width=1:g=${gain.toFixed(1)}`;
    }
    case 'reverb': {
      // aecho-based room — delay 20→80ms, decay 0.1→0.5
      const delayMs = 20 + (i * 0.6);
      const decay = 0.1 + (i * 0.004);
      return `aecho=0.8:${(0.5 + i * 0.003).toFixed(2)}:${Math.round(delayMs)}:${decay.toFixed(2)}`;
    }
    case 'echoDelay': {
      // aecho delay — 100→500ms, decay 0.1→0.4
      const delayMs = 100 + (i * 4);
      const decay = 0.1 + (i * 0.003);
      return `aecho=0.8:0.5:${Math.round(delayMs)}:${decay.toFixed(2)}`;
    }
    case 'limiter': {
      // limit 1.0→0.7
      const limit = 1.0 - (i * 0.003);
      return `alimiter=limit=${limit.toFixed(2)}`;
    }
    default:
      return null;
  }
}

/**
 * Build the full FFmpeg -af chain from an AudioEffectsConfig.
 * Returns null if no effects are enabled.
 *
 * For preset mode: returns the preset's pre-built chain.
 * For manual mode: builds from individual filter settings.
 */
export function buildEffectsChain(config: AudioEffectsConfig): string | null {
  if (!config.enabled) return null;

  if (config.mode === 'preset' && config.selectedPresetId) {
    const preset = AUDIO_PRESETS.find(p => p.id === config.selectedPresetId);
    return preset?.ffmpegChain ?? null;
  }

  if (config.mode === 'manual') {
    const filterStrings: string[] = [];
    let hasLoudnorm = false;

    for (const setting of config.filters) {
      if (!setting.enabled) continue;
      const fs = buildFilterString(setting);
      if (fs) {
        filterStrings.push(fs);
        if (setting.filterId === 'normalize') hasLoudnorm = true;
      }
    }

    if (filterStrings.length === 0) return null;

    // Always end with loudnorm if not already included
    if (!hasLoudnorm) {
      filterStrings.push('loudnorm=I=-16:TP=-1.5:LRA=11');
    }

    return filterStrings.join(',');
  }

  return null;
}

/**
 * Get the list of filter IDs from an effects config.
 * Used to track which filters were requested.
 */
export function getRequestedFilterIds(config: AudioEffectsConfig): string[] {
  if (!config.enabled) return [];

  if (config.mode === 'preset' && config.selectedPresetId) {
    return [config.selectedPresetId];
  }

  return config.filters
    .filter(f => f.enabled)
    .map(f => f.filterId);
}

/** Valid filter IDs for validation */
export const VALID_FILTER_IDS: AudioEffectFilterId[] = [
  'normalize', 'compressor', 'noiseReduction', 'deesser', 'clarity',
  'bassBoost', 'warmth', 'treble', 'reverb', 'echoDelay', 'limiter',
];

/** Valid preset IDs for validation */
export const VALID_PRESET_IDS: AudioEffectPresetId[] = [
  'radio', 'podcast', 'deep', 'sharp', 'warm', 'tv',
  'lightReverb', 'delay', 'quranRecitation', 'poetryRecital', 'sessions',
];
