/**
 * Sound Platform — Audio Create Page (Canonical 12-Step Wizard)
 * ==============================================================
 * Phase:   8-D.2 (Enhanced Audio Creation Flow)
 * Updated: 2026-05-28
 *
 * Canonical flow (13 states, 12 in-wizard + exit to detail player):
 *   1.  Info — title, description, world, kind
 *   2.  Publish Details — category, subcategory, tags, language, country, age,
 *       child content, audience, placement, playlist, toggles
 *   3.  Cover (optional) — upload / camera / AI / skip
 *   4.  Captions setup (optional) — enable, language, style
 *   5.  AutoCue (optional) — script, speed, font, mode, delay, highlight
 *   6.  Record / Upload — normal or AutoCue mode
 *   7.  Review — playback, replace, confirm
 *   8.  Effects (optional, gated placeholder)
 *   9.  Mixing (optional, gated placeholder)
 *   10. Final Preview — listener-style + edit-back links
 *   11. Review Details — checklist
 *   12. Publish Result — success/pending/fail + open item
 *
 * Route: /create/audio
 * Query: ?source=record|upload → pre-selects tab in step 6
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { ref as storageRef, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useAudioRecorder } from '../../hooks/useAudioRecorder';
import { useAudioUpload } from '../../hooks/useAudioUpload';
import {
  callCreateAudioDraft,
  callUpdateAudioDraft,
  callPublishAudioContent,
  callGetUserPlaylists,
  callRenderDraftPreview,
} from '../../lib/callables';
import {
  extractAudioDuration,
  formatDuration,
  formatFileSize,
} from '../../lib/audioDuration';
import type {
  AudioAssetMeta,
  AudioContentKind,
  AudienceType,
  CountryMode,
  AgeSuitability,
  CoverAsset,
  CaptionsSetup,
  CaptionsData,
  CaptionSegment,
  CaptionSource,
  AutoCueConfig,
  PublishToggles,
  PlacementFeed,
  PlaylistIntent,
  AudioEffectsConfig,
  AudioEffectFilterSetting,
  AudioEffectFilterId,
  AudioEffectPresetId,
  AudioMixingConfig,
  AudioMixTrack,
  AudioMixPresetId,
  AudioEditConfig,
  AudioCutSegment,
  AudioSfxItem,
  PreviewStage,
  PreviewStatus,
  AudioDraftPreviewAssets,
} from '@sound/shared';
import { AUDIO_PRESETS, AUDIO_FILTERS, MIXING_PRESETS as MIXING_PRESET_DEFS, createDefaultTracks, dbToPercent, percentToDb } from '@sound/shared';
import type { PlaylistDoc } from '@sound/shared';
import { parseSRT, parseVTT, splitTextToSegments } from '../../utils/captionsParsers';
import type { WorldId } from '@sound/shared';
import '../Page.css';
import './AudioCreatePage.css';

// ── Step enum ─────────────────────────────────────────────────────────────────

type WizardStep = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

const STEP_LABELS: Record<WizardStep, string> = {
  1: 'المعلومات',
  2: 'تفاصيل النشر',
  3: 'الغلاف',
  4: 'الترجمة',
  5: 'الملقن',
  6: 'التسجيل',
  7: 'المراجعة',
  8: 'المؤثرات',
  9: 'المكساج',
  10: 'المعاينة',
  11: 'التأكيد',
  12: 'النتيجة',
};

const ALL_STEPS: WizardStep[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
type Step6Tab = 'record' | 'upload';

// ── Constants ─────────────────────────────────────────────────────────────────

const WORLDS: { key: WorldId; label: string; note: string }[] = [
  { key: 'general', label: 'عام', note: 'محتوى صوتي مفتوح للجميع' },
  { key: 'plus', label: 'بلس', note: 'محتوى حصري للمشتركين' },
];

const KINDS_BY_WORLD: Record<string, { key: AudioContentKind; label: string }[]> = {
  general: [
    { key: 'longAudio', label: 'صوت طويل' },
    { key: 'podcast', label: 'بودكاست' },
    { key: 'shortAudio', label: 'مقطع قصير' },
  ],
  plus: [
    { key: 'longAudio', label: 'صوت طويل' },
    { key: 'podcast', label: 'بودكاست' },
    { key: 'shortAudio', label: 'مقطع قصير' },
  ],
};

const CATEGORIES = [
  { id: 'culture', label: 'ثقافة' },
  { id: 'entertainment', label: 'ترفيه' },
  { id: 'education', label: 'تعليم' },
  { id: 'religion', label: 'ديني' },
  { id: 'sports', label: 'رياضة' },
  { id: 'news', label: 'أخبار' },
  { id: 'technology', label: 'تقنية' },
  { id: 'other', label: 'أخرى' },
];

const SUBCATEGORIES_BY_CATEGORY: Record<string, { id: string; label: string }[]> = {
  culture: [
    { id: 'creativity', label: 'إبداع وهدوء' },
    { id: 'visual_arts', label: 'فنون بصرية' },
    { id: 'literature', label: 'أدب وشعر' },
  ],
  entertainment: [
    { id: 'comedy', label: 'كوميديا' },
    { id: 'drama', label: 'دراما' },
    { id: 'talk_shows', label: 'برامج حوارية' },
  ],
  education: [
    { id: 'science', label: 'علوم' },
    { id: 'technology', label: 'تقنية' },
    { id: 'languages', label: 'لغات' },
  ],
  religion: [
    { id: 'quran', label: 'قرآن' },
    { id: 'lectures', label: 'دروس ومحاضرات' },
    { id: 'stories', label: 'قصص دينية' },
  ],
  sports: [
    { id: 'football', label: 'كرة قدم' },
    { id: 'fitness', label: 'لياقة وصحة' },
    { id: 'analysis', label: 'تحليل رياضي' },
  ],
  news: [
    { id: 'local', label: 'محلي' },
    { id: 'international', label: 'دولي' },
    { id: 'economy', label: 'اقتصاد' },
  ],
  technology: [
    { id: 'ai', label: 'ذكاء اصطناعي' },
    { id: 'programming', label: 'برمجة' },
    { id: 'reviews', label: 'مراجعات' },
  ],
};

const AUDIENCE_OPTIONS: { key: AudienceType; label: string; icon: string }[] = [
  { key: 'public', label: 'عام — الجميع', icon: 'visibility' },
  { key: 'followers', label: 'المتابعون فقط', icon: 'group' },
  { key: 'following', label: 'من أتابعهم فقط', icon: 'person_add' },
  { key: 'friends', label: 'الأصدقاء فقط', icon: 'handshake' },
  { key: 'specificList', label: 'قائمة محددة', icon: 'list' },
  { key: 'listExcept', label: 'الجميع عدا قائمة', icon: 'block' },
  { key: 'selectedPeople', label: 'أشخاص مختارون', icon: 'person_search' },
  { key: 'onlyMe', label: 'أنا فقط', icon: 'person' },
];

const LANGUAGES = [
  { code: 'ar', label: 'العربية' },
  { code: 'en', label: 'English' },
  { code: 'fr', label: 'Français' },
  { code: 'es', label: 'Español' },
  { code: 'other', label: 'أخرى' },
];

// ── Effects: AUDIO_PRESETS + AUDIO_FILTERS imported from @sound/shared ──
// ── Mixing: MIXING_PRESET_DEFS + createDefaultTracks imported from @sound/shared ──

// Mixing source options for background music
const MUSIC_SOURCE_OPTIONS = [
  { id: 'none', label: 'بدون موسيقى', icon: 'music_off', available: true },
  { id: 'uploaded', label: 'رفع من الجهاز', icon: 'upload_file', available: true },
  { id: 'library', label: 'مكتبة Sound', icon: 'library_music', available: false },
];

// SFX source options — separate from music to avoid wrong labels
const SFX_SOURCE_OPTIONS = [
  { id: 'none', label: 'بدون مؤثرات', icon: 'music_off', available: true },
  { id: 'uploaded', label: 'رفع من الجهاز', icon: 'upload_file', available: true },
  { id: 'library', label: 'مكتبة ساوند — قريباً', icon: 'library_music', available: false },
];

/** Max SFX items — configurable, generous default */
const MAX_SFX_ITEMS = 50;

// ── Page Component ───────────────────────────────────────────────────────────

export function AudioCreatePage() {
  const { currentUser } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const uid = currentUser?.uid ?? '';

  // ── Wizard state ──────────────────────────────────────────────────────────
  const [step, setStep] = useState<WizardStep>(1);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [draftId, setDraftId] = useState<string | null>(null);

  // ── Step 1: Info ──────────────────────────────────────────────────────────
  const [title, setTitle] = useState('');
  const [caption, setCaption] = useState('');
  const [world, setWorld] = useState<WorldId>('general');
  const [kind, setKind] = useState<AudioContentKind>('longAudio');

  // ── Step 2: Publish Details ───────────────────────────────────────────────
  const [categoryId, setCategoryId] = useState('');
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [subcategoryId, setSubcategoryId] = useState('');
  const [subcategoryOpen, setSubcategoryOpen] = useState(false);
  const [tags, setTags] = useState('');
  const [language, setLanguage] = useState('ar');
  const [languageOpen, setLanguageOpen] = useState(false);
  const [countryMode, setCountryMode] = useState<CountryMode>('all');
  const [countryCodes, setCountryCodes] = useState('');
  const [ageSuitability, setAgeSuitability] = useState<AgeSuitability>('everyone');
  const [isExplicit, setIsExplicit] = useState(false);
  const [isChildContent, setIsChildContent] = useState(false);
  const [audience, setAudience] = useState<AudienceType>('public');
  const [placementFeed, setPlacementFeed] = useState<PlacementFeed>('main');
  const [playlistIntent, setPlaylistIntent] = useState<PlaylistIntent>('none');
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [selectedPlaylistId, setSelectedPlaylistId] = useState('');
  const [userPlaylists, setUserPlaylists] = useState<PlaylistDoc[]>([]);
  const [playlistsLoaded, setPlaylistsLoaded] = useState(false);
  const [playlistsLoading, setPlaylistsLoading] = useState(false);
  const [playlistDropdownOpen, setPlaylistDropdownOpen] = useState(false);
  const [commentsEnabled, setCommentsEnabled] = useState(true);
  const [giftsEnabled, setGiftsEnabled] = useState(true);
  const [sharingEnabled, setSharingEnabled] = useState(true);

  // ── Step 3: Cover ─────────────────────────────────────────────────────────
  const [coverAsset, setCoverAsset] = useState<CoverAsset | null>(null);
  const [coverPreviewUrl, setCoverPreviewUrl] = useState<string | null>(null);
  const [coverUploading, setCoverUploading] = useState(false);
  const [coverProgress, setCoverProgress] = useState(0);
  const [coverError, setCoverError] = useState<string | null>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  // ── Step 4: Captions ──────────────────────────────────────────────────────
  const [captionsEnabled, setCaptionsEnabled] = useState(false);
  const [captionLang, setCaptionLang] = useState('ar');
  const [captionLangOpen, setCaptionLangOpen] = useState(false);
  const [captionStyle, setCaptionStyle] = useState<'standard' | 'karaoke' | 'subtitles'>('standard');
  // Phase 8-H.1: Creator-authored captions
  const [captionSource, setCaptionSource] = useState<CaptionSource>('manual');
  const [captionSegments, setCaptionSegments] = useState<CaptionSegment[]>([]);
  const [captionRawText, setCaptionRawText] = useState('');
  const [captionUploadedFile, setCaptionUploadedFile] = useState('');
  const captionFileRef = useRef<HTMLInputElement>(null);

  // ── Step 5: AutoCue ───────────────────────────────────────────────────────
  const [autoCueEnabled, setAutoCueEnabled] = useState(false);
  const [scriptText, setScriptText] = useState('');
  const [scrollSpeed, setScrollSpeed] = useState<'slow' | 'medium' | 'fast'>('medium');
  const [fontSize, setFontSize] = useState<'small' | 'medium' | 'large'>('medium');
  const [readingMode, setReadingMode] = useState<'lineByLine' | 'paragraphByParagraph'>('lineByLine');
  const [startDelay, setStartDelay] = useState(3);
  const [highlightLine, setHighlightLine] = useState(true);

  // ── Step 6: Record / Upload ───────────────────────────────────────────────
  const sourceParam = searchParams.get('source');
  const [tab, setTab] = useState<Step6Tab>(sourceParam === 'upload' ? 'upload' : 'record');
  const recorder = useAudioRecorder();
  const uploader = useAudioUpload();
  const [audioAsset, setAudioAsset] = useState<AudioAssetMeta | null>(null);
  const [attaching, setAttaching] = useState(false);
  const [attachError, setAttachError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileDurationMs, setFileDurationMs] = useState<number | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Step 8: Effects ────────────────────────────────────────────────────────
  const [effectsEnabled, setEffectsEnabled] = useState(false);
  const [effectsMode, setEffectsMode] = useState<'preset' | 'manual'>('preset');
  const [selectedPresetId, setSelectedPresetId] = useState<AudioEffectPresetId | null>(null);
  const [manualFilters, setManualFilters] = useState<AudioEffectFilterSetting[]>(
    AUDIO_FILTERS.map(f => ({ filterId: f.id, enabled: false, intensity: f.defaultIntensity }))
  );

  const updateFilter = (filterId: AudioEffectFilterId, updates: Partial<AudioEffectFilterSetting>) => {
    setManualFilters(prev => prev.map(f => f.filterId === filterId ? { ...f, ...updates } : f));
  };

  const resetEffects = () => {
    setEffectsEnabled(false);
    setEffectsMode('preset');
    setSelectedPresetId(null);
    setManualFilters(AUDIO_FILTERS.map(f => ({ filterId: f.id, enabled: false, intensity: f.defaultIntensity })));
    // Clear stale preview state for effects and downstream
    setPreviewAssets(prev => { const next = { ...prev }; delete next.effects; delete next.mixing; delete next.final; return next; });
    setPreviewUrls(prev => { const next = { ...prev }; delete next.effects; delete next.mixing; delete next.final; return next; });
  };

  // Build effectsConfig for saving
  const buildEffectsConfig = (): AudioEffectsConfig | undefined => {
    if (!effectsEnabled) return undefined;
    const preset = AUDIO_PRESETS.find(p => p.id === selectedPresetId);
    return {
      enabled: true,
      mode: effectsMode,
      selectedPresetId: effectsMode === 'preset' ? selectedPresetId ?? undefined : undefined,
      selectedPresetLabel: effectsMode === 'preset' ? preset?.label : undefined,
      filters: effectsMode === 'manual'
        ? manualFilters.filter(f => f.enabled)
        : [],
    };
  };

  // ── Step 9: Mixing ───────────────────────────────────────────────────────
  const [mixingEnabled, setMixingEnabled] = useState(false);
  const [mixingMode, setMixingMode] = useState<'preset' | 'manual'>('preset');
  const [selectedMixPresetId, setSelectedMixPresetId] = useState<AudioMixPresetId | null>(null);
  const [mixTracks, setMixTracks] = useState<AudioMixTrack[]>(createDefaultTracks());
  const [autoDuckEnabled, setAutoDuckEnabled] = useState(false);
  const [masterFadeInMs, setMasterFadeInMs] = useState(0);
  const [masterFadeOutMs, setMasterFadeOutMs] = useState(0);
  const [masterGainDb, setMasterGainDb] = useState(0);

  const updateMixTrack = (trackId: string, updates: Partial<AudioMixTrack>) => {
    setMixTracks(prev => prev.map(t => t.id === trackId ? { ...t, ...updates } : t));
  };

  const applyMixPreset = (presetId: AudioMixPresetId) => {
    const preset = MIXING_PRESET_DEFS.find(p => p.id === presetId);
    if (!preset) return;
    setSelectedMixPresetId(presetId);
    setMixingMode('preset');
    setAutoDuckEnabled(preset.autoDuck);
    setMasterFadeInMs(preset.fadeInMs);
    setMasterFadeOutMs(preset.fadeOutMs);
    setMasterGainDb(preset.masterGainDb);
    setMixTracks(prev => prev.map(t => {
      if (t.type === 'voice') return { ...t, volumeDb: preset.voiceDb };
      if (t.type === 'musicBed') return { ...t, volumeDb: preset.musicDb, duckUnderVoice: preset.autoDuck };
      if (t.type === 'sfx') return { ...t, volumeDb: preset.sfxDb };
      return t;
    }));
  };

  const resetMixing = () => {
    setMixingEnabled(false);
    setMixingMode('preset');
    setSelectedMixPresetId(null);
    setMixTracks(createDefaultTracks());
    setAutoDuckEnabled(false);
    setMasterFadeInMs(0);
    setMasterFadeOutMs(0);
    setMasterGainDb(0);
    // Clear stale preview state for mixing and downstream
    setPreviewAssets(prev => { const next = { ...prev }; delete next.mixing; delete next.final; return next; });
    setPreviewUrls(prev => { const next = { ...prev }; delete next.mixing; delete next.final; return next; });
  };

  const buildMixingConfig = (): AudioMixingConfig | undefined => {
    if (!mixingEnabled) return undefined;
    const preset = MIXING_PRESET_DEFS.find(p => p.id === selectedMixPresetId);
    return {
      enabled: true,
      mode: mixingMode,
      selectedPresetId: mixingMode === 'preset' ? selectedMixPresetId ?? undefined : undefined,
      selectedPresetLabel: mixingMode === 'preset' ? preset?.label : undefined,
      tracks: mixTracks,
      autoDuckEnabled,
      fadeInMs: masterFadeInMs,
      fadeOutMs: masterFadeOutMs,
      masterGainDb,
      sfxItems: sfxItems.length > 0 ? sfxItems : undefined,
    };
  };

  // ── Step 7: Trim/Cut editing (Phase 8-L) ────────────────────────────────
  const [editEnabled, setEditEnabled] = useState(false);
  const [trimStartMs, setTrimStartMs] = useState(0);
  const [trimEndMs, setTrimEndMs] = useState(0); // 0 = use original end
  const [editCuts, setEditCuts] = useState<AudioCutSegment[]>([]);

  // Phase 8-L.1: Client-side waveform + preview playback
  const [waveformPeaks, setWaveformPeaks] = useState<number[]>([]);
  const [waveformLoading, setWaveformLoading] = useState(false);
  const waveformAudioRef = useRef<HTMLAudioElement>(null);
  const [wfPlaying, setWfPlaying] = useState(false);
  const [wfCurrentMs, setWfCurrentMs] = useState(0);
  const wfAnimRef = useRef<number>(0);
  const [wfDragging, setWfDragging] = useState(false);
  const waveformTimelineRef = useRef<HTMLDivElement>(null);

  const originalDurationMs = audioAsset?.durationMs || 0;

  // ── Phase 8-L.1: Draft Render Pipeline Preview ──────────────────────────
  const [previewAssets, setPreviewAssets] = useState<Partial<AudioDraftPreviewAssets>>({});
  const [renderingStage, setRenderingStage] = useState<PreviewStage | null>(null);
  const [previewUrls, setPreviewUrls] = useState<Record<string, string>>({});

  /** Call backend to render a stage preview. Returns playback URL. */
  const renderPreview = async (stage: PreviewStage) => {
    if (!draftId) return;
    setRenderingStage(stage);
    try {
      const result = await callRenderDraftPreview({ draftId, stage });
      const resp = result.data;
      setPreviewAssets(prev => ({
        ...prev,
        [stage]: { stage, status: resp.status, storagePath: '', durationMs: resp.durationMs, error: resp.error },
      }));
      if (resp.status === 'ready' && resp.playbackUrl) {
        setPreviewUrls(prev => ({ ...prev, [stage]: resp.playbackUrl! }));
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setPreviewAssets(prev => ({
        ...prev,
        [stage]: { stage, status: 'failed' as PreviewStatus, storagePath: '', error: msg },
      }));
    } finally {
      setRenderingStage(null);
    }
  };

  /** Get the best preview playback URL, falling back to original */
  const getPreviewPlaybackUrl = (): string | null => {
    if (mixingEnabled && previewUrls.mixing) return previewUrls.mixing;
    if (effectsEnabled && previewUrls.effects) return previewUrls.effects;
    if (editEnabled && previewUrls.edit) return previewUrls.edit;
    return previewAudioUrl; // fallback to original audio
  };

  const getStagePreviewStatus = (stage: PreviewStage): PreviewStatus => {
    return (previewAssets[stage]?.status as PreviewStatus) || 'idle';
  };

  /** Estimate edited duration given trim + cuts */
  const estimateEditedDuration = (origDur: number, tStart: number, tEnd: number, cuts: AudioCutSegment[]): number => {
    const effectiveEnd = tEnd > 0 && tEnd < origDur ? tEnd : origDur;
    const effectiveStart = tStart > 0 ? Math.min(tStart, effectiveEnd) : 0;
    let duration = effectiveEnd - effectiveStart;
    for (const cut of cuts) {
      const cStart = Math.max(cut.startMs, effectiveStart);
      const cEnd = Math.min(cut.endMs, effectiveEnd);
      if (cEnd > cStart) duration -= (cEnd - cStart);
    }
    return Math.max(0, duration);
  };

  const editedDurationMs = editEnabled
    ? estimateEditedDuration(originalDurationMs, trimStartMs, trimEndMs, editCuts)
    : originalDurationMs;

  const addCut = () => {
    if (editCuts.length >= 1) return; // Phase 8-L: max 1 cut
    const mid = Math.floor(originalDurationMs / 2);
    const cutLen = Math.min(5000, Math.floor(originalDurationMs / 4));
    setEditCuts([{
      id: `cut_${Date.now()}`,
      startMs: Math.max(0, mid - Math.floor(cutLen / 2)),
      endMs: Math.min(originalDurationMs, mid + Math.floor(cutLen / 2)),
    }]);
  };

  const removeCut = (cutId: string) => {
    setEditCuts(prev => prev.filter(c => c.id !== cutId));
  };

  const updateCut = (cutId: string, updates: Partial<AudioCutSegment>) => {
    setEditCuts(prev => prev.map(c => c.id === cutId ? { ...c, ...updates } : c));
  };

  const resetEdits = () => {
    setEditEnabled(false);
    setTrimStartMs(0);
    setTrimEndMs(0);
    setEditCuts([]);
    // Clear stale preview state for edit and all downstream
    setPreviewAssets(prev => { const next = { ...prev }; delete next.edit; delete next.effects; delete next.mixing; delete next.final; return next; });
    setPreviewUrls(prev => { const next = { ...prev }; delete next.edit; delete next.effects; delete next.mixing; delete next.final; return next; });
  };

  const buildEditConfig = (): AudioEditConfig | undefined => {
    if (!editEnabled) return undefined;
    const hasTrim = trimStartMs > 0 || (trimEndMs > 0 && trimEndMs < originalDurationMs);
    const hasCuts = editCuts.length > 0;
    if (!hasTrim && !hasCuts) return undefined; // enabled but nothing set
    return {
      enabled: true,
      trimStartMs: trimStartMs > 0 ? trimStartMs : undefined,
      trimEndMs: trimEndMs > 0 && trimEndMs < originalDurationMs ? trimEndMs : undefined,
      cuts: hasCuts ? editCuts : undefined,
      originalDurationMs,
      editedDurationMs,
    };
  };

  // ── Phase 8-L.1: Client-side waveform generation ──────────────────────────
  useEffect(() => {
    const audioUrl = recorder.audioUrl || (selectedFile ? URL.createObjectURL(selectedFile) : null);
    if (!audioUrl) { setWaveformPeaks([]); return; }
    let cancelled = false;
    const needsRevoke = !recorder.audioUrl && !!selectedFile;
    setWaveformLoading(true);
    (async () => {
      try {
        const resp = await fetch(audioUrl);
        const buf = await resp.arrayBuffer();
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const decoded = await ctx.decodeAudioData(buf);
        if (cancelled) { ctx.close(); return; }
        const data = decoded.getChannelData(0);
        const peakCount = 200;
        const blockSize = Math.floor(data.length / peakCount);
        const peaks: number[] = [];
        for (let i = 0; i < peakCount; i++) {
          let sum = 0;
          const start = i * blockSize;
          for (let j = 0; j < blockSize; j++) sum += Math.abs(data[start + j] || 0);
          peaks.push(sum / blockSize);
        }
        const maxPeak = Math.max(...peaks, 0.001);
        setWaveformPeaks(peaks.map(p => p / maxPeak));
        ctx.close();
      } catch { /* ignore decode errors */ }
      if (!cancelled) setWaveformLoading(false);
    })();
    return () => { cancelled = true; if (needsRevoke) URL.revokeObjectURL(audioUrl); };
  }, [recorder.audioUrl, selectedFile]);

  // ── Trim/cut-aware playback (client-side preview) ──────────────────────────
  const effectiveStart = editEnabled && trimStartMs > 0 ? trimStartMs : 0;
  const effectiveEnd = editEnabled && trimEndMs > 0 && trimEndMs < originalDurationMs ? trimEndMs : originalDurationMs;

  /** Check if a given ms is inside a cut region */
  const isInsideCut = useCallback((ms: number): AudioCutSegment | null => {
    if (!editEnabled) return null;
    for (const cut of editCuts) {
      if (ms >= cut.startMs && ms < cut.endMs) return cut;
    }
    return null;
  }, [editEnabled, editCuts]);

  /** Waveform playback tick — handles trim bounds + cut skipping */
  const wfTick = useCallback(() => {
    const audio = waveformAudioRef.current;
    if (!audio || audio.paused) return;
    const curMs = audio.currentTime * 1000;
    // Stop at trim end
    if (curMs >= effectiveEnd) {
      audio.pause();
      setWfPlaying(false);
      setWfCurrentMs(effectiveEnd);
      return;
    }
    // Skip cut region
    const cut = isInsideCut(curMs);
    if (cut) {
      audio.currentTime = cut.endMs / 1000;
      setWfCurrentMs(cut.endMs);
    } else {
      setWfCurrentMs(curMs);
    }
    wfAnimRef.current = requestAnimationFrame(wfTick);
  }, [effectiveEnd, isInsideCut]);

  const toggleWfPlayback = useCallback(() => {
    const audio = waveformAudioRef.current;
    if (!audio) return;
    if (audio.paused) {
      // Start from trim start if at beginning or past end
      if (audio.currentTime * 1000 < effectiveStart || audio.currentTime * 1000 >= effectiveEnd) {
        audio.currentTime = effectiveStart / 1000;
      }
      // Skip if starting inside a cut
      const cut = isInsideCut(audio.currentTime * 1000);
      if (cut) audio.currentTime = cut.endMs / 1000;
      audio.play();
      setWfPlaying(true);
      wfAnimRef.current = requestAnimationFrame(wfTick);
    } else {
      audio.pause();
      setWfPlaying(false);
      cancelAnimationFrame(wfAnimRef.current);
    }
  }, [effectiveStart, effectiveEnd, isInsideCut, wfTick]);

  // Cleanup animation frame on unmount
  useEffect(() => () => cancelAnimationFrame(wfAnimRef.current), []);

  // ── Phase 8-L.1: SFX items state ──────────────────────────────────────────
  const [sfxItems, setSfxItems] = useState<AudioSfxItem[]>([]);
  const sfxFileRef = useRef<HTMLInputElement>(null);
  const [sfxUploading, setSfxUploading] = useState(false);

  // ── Phase 8-L.1: Music bed upload state ───────────────────────────────────
  const musicFileRef = useRef<HTMLInputElement>(null);
  const [musicUploading, setMusicUploading] = useState(false);
  const [musicUploadProgress, setMusicUploadProgress] = useState(0);

  /** Handle music bed file selection + upload to Storage */
  const handleMusicUpload = async (file: File) => {
    if (!currentUser || !draftId || musicUploading) return;
    setMusicUploading(true);
    setMusicUploadProgress(0);
    try {
      const path = `audioMixAssets/${currentUser.uid}/${draftId}/music/${file.name}`;
      const sRef = storageRef(storage, path);
      const task = uploadBytesResumable(sRef, file);
      task.on('state_changed', snap => setMusicUploadProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)));
      await task;
      // Get duration via Web Audio
      let durMs: number | undefined;
      try {
        const url = URL.createObjectURL(file);
        const audio = new Audio(url);
        await new Promise<void>((res, rej) => { audio.onloadedmetadata = () => res(); audio.onerror = () => rej(); });
        durMs = Math.round(audio.duration * 1000);
        URL.revokeObjectURL(url);
      } catch { /* ignore */ }
      // Update the music bed track
      const musicTrack = mixTracks.find(t => t.type === 'musicBed');
      if (musicTrack) {
        updateMixTrack(musicTrack.id, {
          storagePath: path,
          fileName: file.name,
          mimeType: file.type,
          sizeBytes: file.size,
          durationMs: durMs,
          sourceType: 'uploaded',
          enabled: true,
        });
      }
    } catch (err) {
      console.error('Music upload failed:', err);
    } finally {
      setMusicUploading(false);
      setMusicUploadProgress(0);
    }
  };

  /** Remove music bed file */
  const removeMusicUpload = () => {
    const musicTrack = mixTracks.find(t => t.type === 'musicBed');
    if (musicTrack) {
      updateMixTrack(musicTrack.id, {
        storagePath: undefined,
        fileName: undefined,
        mimeType: undefined,
        sizeBytes: undefined,
        durationMs: undefined,
        sourceType: 'none',
        enabled: false,
      });
    }
  };

  /** Handle SFX file selection + upload */
  const handleSfxUpload = async (file: File) => {
    if (!currentUser || !draftId || sfxUploading || sfxItems.length >= MAX_SFX_ITEMS) return;
    setSfxUploading(true);
    try {
      const sfxId = `sfx_${Date.now()}`;
      const path = `audioMixAssets/${currentUser.uid}/${draftId}/sfx/${sfxId}_${file.name}`;
      const sRef = storageRef(storage, path);
      await uploadBytesResumable(sRef, file);
      // Get duration
      let durMs: number | undefined;
      try {
        const url = URL.createObjectURL(file);
        const audio = new Audio(url);
        await new Promise<void>((res, rej) => { audio.onloadedmetadata = () => res(); audio.onerror = () => rej(); });
        durMs = Math.round(audio.duration * 1000);
        URL.revokeObjectURL(url);
      } catch { /* ignore */ }
      const newItem: AudioSfxItem = {
        id: sfxId,
        fileName: file.name,
        storagePath: path,
        mimeType: file.type,
        sizeBytes: file.size,
        durationMs: durMs,
        startMs: 0,
        volumeDb: 0,
        enabled: true,
      };
      setSfxItems(prev => [...prev, newItem]);
    } catch (err) {
      console.error('SFX upload failed:', err);
    } finally {
      setSfxUploading(false);
    }
  };

  /** Remove SFX item */
  const removeSfxItem = (sfxId: string) => {
    setSfxItems(prev => prev.filter(s => s.id !== sfxId));
  };

  /** Update SFX item */
  const updateSfxItem = (sfxId: string, updates: Partial<AudioSfxItem>) => {
    setSfxItems(prev => prev.map(s => s.id === sfxId ? { ...s, ...updates } : s));
  };

  /** Format ms to mm:ss.S */
  /** Format ms to mm:ss.mmm for SFX timing display */
  const formatMsToTimeInput = (ms: number): string => {
    const totalMs = Math.max(0, Math.round(ms));
    const min = Math.floor(totalMs / 60000);
    const sec = Math.floor((totalMs % 60000) / 1000);
    const millis = totalMs % 1000;
    return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}.${String(millis).padStart(3, '0')}`;
  };

  /** Parse mm:ss.mmm to ms */
  const parseTimeInputToMs = (val: string): number => {
    const parts = val.split(':');
    if (parts.length === 2) {
      const min = parseInt(parts[0] ?? '0') || 0;
      const secParts = (parts[1] ?? '0').split('.');
      const sec = parseInt(secParts[0] ?? '0') || 0;
      const msStr = (secParts[1] ?? '0').padEnd(3, '0').slice(0, 3);
      const millis = parseInt(msStr) || 0;
      return Math.max(0, min * 60000 + Math.min(sec, 59) * 1000 + Math.min(millis, 999));
    }
    const sec = parseFloat(val) || 0;
    return Math.max(0, Math.round(sec * 1000));
  };

  // ── Step 10: Preview playback ──────────────────────────────────────────────
  const previewAudioRef = useRef<HTMLAudioElement>(null);
  const [previewPlaying, setPreviewPlaying] = useState(false);

  // Compute preview audio URL: recording blob URL or file object URL
  const previewAudioUrl = React.useMemo(() => {
    if (recorder.audioUrl) return recorder.audioUrl;
    if (selectedFile) return URL.createObjectURL(selectedFile);
    return null;
  }, [recorder.audioUrl, selectedFile]);

  // Cleanup file object URL on unmount
  useEffect(() => {
    return () => {
      if (selectedFile && previewAudioUrl && !recorder.audioUrl) {
        URL.revokeObjectURL(previewAudioUrl);
      }
    };
  }, [previewAudioUrl, selectedFile, recorder.audioUrl]);

  const togglePreviewPlayback = () => {
    const audio = previewAudioRef.current;
    if (!audio) return;
    if (audio.paused) {
      // Trim/cut-aware: start from trimStart if needed
      if (editEnabled && trimStartMs > 0 && audio.currentTime * 1000 < trimStartMs) {
        audio.currentTime = trimStartMs / 1000;
      }
      audio.play();
      setPreviewPlaying(true);
    } else {
      audio.pause();
      setPreviewPlaying(false);
    }
  };

  // Trim/cut-aware timeupdate for Final Preview
  useEffect(() => {
    const audio = previewAudioRef.current;
    if (!audio || !editEnabled) return;
    const handler = () => {
      const curMs = audio.currentTime * 1000;
      // Stop at trim end
      if (effectiveEnd > 0 && curMs >= effectiveEnd) {
        audio.pause();
        setPreviewPlaying(false);
        return;
      }
      // Skip cut
      const cut = isInsideCut(curMs);
      if (cut) audio.currentTime = cut.endMs / 1000;
    };
    audio.addEventListener('timeupdate', handler);
    return () => audio.removeEventListener('timeupdate', handler);
  }, [editEnabled, effectiveEnd, isInsideCut]);

  // ── Step 12: Publish ──────────────────────────────────────────────────────
  const [publishing, setPublishing] = useState(false);
  const [publishResult, setPublishResult] = useState<{ contentId: string; status: string } | null>(null);
  const [publishError, setPublishError] = useState<string | null>(null);

  // ── Update kind when world changes ────────────────────────────────────────
  useEffect(() => {
    const kinds = KINDS_BY_WORLD[world];
    if (kinds && kinds.length > 0 && !kinds.some((k) => k.key === kind)) {
      setKind(kinds[0]!.key);
    }
  }, [world, kind]);

  // ── Reset subcategory when category changes ───────────────────────────────
  useEffect(() => {
    setSubcategoryId('');
  }, [categoryId]);

  // ── Save draft helper ─────────────────────────────────────────────────────
  const saveDraft = async (nextStep: WizardStep) => {
    setSaving(true);
    setSaveError(null);
    try {
      const publishToggles: PublishToggles = { commentsEnabled, giftsEnabled, sharingEnabled };
      const captionsSetup: CaptionsSetup = { enabled: captionsEnabled, language: captionLang, style: captionStyle };
      const autoCueConfig: AutoCueConfig = {
        enabled: autoCueEnabled,
        scriptText: scriptText || undefined,
        scriptSource: 'manual',
        scrollSpeed,
        fontSize,
        readingMode,
        startDelaySec: startDelay,
        highlightCurrentLine: highlightLine,
      };

      const payload = {
        title: title.trim(),
        caption: caption.trim() || undefined,
        world,
        kind,
        categoryId: categoryId || undefined,
        categoryLabel: CATEGORIES.find((c) => c.id === categoryId)?.label,
        subcategoryId: subcategoryId || undefined,
        subcategoryLabel: SUBCATEGORIES_BY_CATEGORY[categoryId]?.find((s) => s.id === subcategoryId)?.label,
        language,
        tags: tags.trim() ? tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
        countryMode,
        countryCodes: countryMode !== 'all' && countryCodes.trim()
          ? countryCodes.split(',').map((c) => c.trim()).filter(Boolean)
          : [],
        ageSuitability,
        isExplicit,
        isChildContent,
        placementFeed,
        playlistIntent,
        playlistId: selectedPlaylistId || undefined,
        newPlaylistName: newPlaylistName || undefined,
        audience,
        publishToggles,
        coverAsset: coverAsset ?? undefined,
        captionsSetup,
        // Phase 8-H.1: Include creator-authored captions data
        captionsData: captionsEnabled && captionSegments.length > 0
          ? {
              source: captionSource,
              language: captionLang,
              style: captionStyle,
              segments: captionSegments,
              rawText: captionRawText || undefined,
              uploadedFileName: captionUploadedFile || undefined,
              uploadedFormat: captionUploadedFile?.endsWith('.srt') ? 'srt' as const
                : captionUploadedFile?.endsWith('.vtt') ? 'vtt' as const
                : undefined,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            } as CaptionsData
          : undefined,
        autoCue: autoCueConfig,
        effectsConfig: buildEffectsConfig(),
        mixingConfig: buildMixingConfig(),
        editConfig: buildEditConfig(),
        currentStep: String(nextStep),
      };

      if (draftId) {
        await callUpdateAudioDraft({ draftId, ...payload });
      } else {
        const result = await callCreateAudioDraft(payload);
        setDraftId(result.data.draftId);
      }
      setStep(nextStep);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'فشل حفظ المسودة.';
      setSaveError(msg);
    } finally {
      setSaving(false);
    }
  };

  // ── Step 6: Handle recording upload ─────────────────────────────────────
  const handleUploadRecording = () => {
    if (!recorder.audioBlob || !draftId || !uid) return;
    const ext = recorder.mimeType?.includes('webm') ? 'webm'
      : recorder.mimeType?.includes('mp4') ? 'mp4'
      : recorder.mimeType?.includes('ogg') ? 'ogg' : 'webm';
    const fileName = `recording_${Date.now()}.${ext}`;
    const mime = recorder.mimeType ?? 'audio/webm';
    uploader.uploadAudio(recorder.audioBlob, uid, draftId, fileName, mime);
  };

  // ── Step 6: Handle file selection ──────────────────────────────────────
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileError(null);
    setFileDurationMs(null);
    if (!file.type.startsWith('audio/')) {
      setFileError('يجب أن يكون الملف من نوع صوتي (audio/*).');
      setSelectedFile(null);
      return;
    }
    setSelectedFile(file);
    try {
      const dur = await extractAudioDuration(file);
      setFileDurationMs(dur);
    } catch {
      setFileDurationMs(null);
    }
  };

  const handleUploadFile = () => {
    if (!selectedFile || !draftId || !uid) return;
    uploader.uploadAudio(selectedFile, uid, draftId, selectedFile.name, selectedFile.type);
  };

  // ── Step 6: Attach uploaded asset ──────────────────────────────────────
  useEffect(() => {
    if (uploader.state !== 'done' || !uploader.storagePath || !draftId || audioAsset) return;
    const attach = async () => {
      setAttaching(true);
      setAttachError(null);
      try {
        const blob = tab === 'record' ? recorder.audioBlob : selectedFile;
        const mime = tab === 'record' ? (recorder.mimeType ?? 'audio/webm') : (selectedFile?.type ?? 'audio/unknown');
        const fileName = tab === 'record' ? `recording_${Date.now()}` : (selectedFile?.name ?? 'unknown');
        let durationMs = 0;
        if (tab === 'record' && recorder.elapsedMs > 0) { durationMs = recorder.elapsedMs; }
        else if (tab === 'upload' && fileDurationMs) { durationMs = fileDurationMs; }
        else if (blob) { try { durationMs = await extractAudioDuration(blob); } catch { durationMs = 0; } }

        const asset: AudioAssetMeta = {
          assetId: `${draftId}_audio`,
          storagePath: uploader.storagePath!,
          originalFileName: fileName,
          mimeType: mime,
          sizeBytes: blob?.size ?? 0,
          durationMs,
          sourceType: tab === 'record' ? 'recorded' : 'uploaded',
          uploadStatus: 'uploaded',
          uploadedAt: new Date().toISOString(),
          processingStatus: 'pending',
          waveformStatus: 'pending',
          transcriptStatus: 'pending',
        };
        await callUpdateAudioDraft({ draftId, audioAsset: asset, currentStep: '7' });
        setAudioAsset(asset);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'فشل ربط الملف الصوتي بالمسودة.';
        setAttachError(msg);
      } finally {
        setAttaching(false);
      }
    };
    attach();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uploader.state, uploader.storagePath, draftId]);

  // ── Cover file select → upload to Storage ─────────────────────────────────
  const handleCoverSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;

    // Show local preview immediately
    const url = URL.createObjectURL(file);
    setCoverPreviewUrl(url);
    setCoverError(null);

    // Must have a draft to upload
    if (!draftId || !uid) {
      setCoverError('يجب حفظ المسودة أولاً لرفع الغلاف.');
      return;
    }

    // Upload to Storage
    const coverPath = `audioUploads/${uid}/${draftId}/original/cover_${file.name}`;
    const fileRef = storageRef(storage, coverPath);
    setCoverUploading(true);
    setCoverProgress(0);

    const task = uploadBytesResumable(fileRef, file, {
      contentType: file.type,
      customMetadata: { uploadedBy: uid, draftId, purpose: 'cover' },
    });

    task.on(
      'state_changed',
      (snap) => setCoverProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
      (err) => {
        setCoverUploading(false);
        setCoverError(err.message || 'فشل رفع الغلاف.');
      },
      async () => {
        // Upload done → build coverAsset with storagePath
        const asset: CoverAsset = {
          sourceType: 'uploaded',
          storagePath: coverPath,
          uploadedAt: new Date().toISOString(),
        };
        setCoverAsset(asset);
        setCoverUploading(false);
        setCoverProgress(100);

        // Persist to draft
        try {
          await callUpdateAudioDraft({ draftId, coverAsset: asset, currentStep: '3' });
        } catch {
          // Non-fatal — cover is uploaded, will be saved on next step transition
        }
      },
    );
  };

  // ── Publish handler ────────────────────────────────────────────────────
  const handlePublish = async () => {
    if (!draftId || !audioAsset) return;
    // Guard: if already published, just navigate to result
    if (publishResult) { setStep(12); return; }
    setPublishing(true);
    setPublishError(null);
    try {
      const result = await callPublishAudioContent({ draftId, deleteDraftAfterPublish: false });
      setPublishResult({ contentId: result.data.contentId, status: result.data.status });
      setStep(12);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'فشل النشر.';
      setPublishError(msg);
    } finally {
      setPublishing(false);
    }
  };

  // ── Helper: generate decorative waveform bars ─────────────────────────────
  const waveformBars = Array.from({ length: 40 }, (_, i) => {
    const h = 20 + Math.sin(i * 0.5) * 30 + Math.random() * 50;
    return Math.round(h);
  });

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <main className="page acp-page" dir="rtl">
      {/* ── Step rail ───────────────────────────────────────────────── */}
      <nav className="acp-rail" aria-label="خطوات الإنشاء">
        {ALL_STEPS.map((s) => (
          <div
            key={s}
            className={`acp-rail__dot ${step === s ? 'acp-rail__dot--active' : ''} ${step > s ? 'acp-rail__dot--done' : ''}`}
          >
            <span className="acp-rail__num">
              {step > s ? <span className="material-symbols-outlined">check</span> : s}
            </span>
            <span className="acp-rail__label">{STEP_LABELS[s]}</span>
          </div>
        ))}
      </nav>

      {/* ═══════════════ STEP 1: INFO ═══════════════════════════════ */}
      {step === 1 && (
        <section className="acp-section">
          <h1 className="acp-section__title">
            <span className="material-symbols-outlined" aria-hidden="true">edit_note</span>
            معلومات المحتوى الصوتي
          </h1>
          <div className="acp-form">
            <label className="acp-label">
              العنوان <span className="acp-required">*</span>
              <input type="text" className="acp-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="عنوان التسجيل أو الحلقة..." maxLength={200} autoFocus />
            </label>
            <label className="acp-label">
              الوصف / التوضيح
              <textarea className="acp-textarea" value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="وصف مختصر..." maxLength={1000} rows={3} />
            </label>
            <label className="acp-label">
              العالم
              <div className="acp-chips">
                {WORLDS.map((w) => (
                  <button key={w.key} className={`acp-chip ${world === w.key ? 'acp-chip--selected' : ''}`} onClick={() => setWorld(w.key)} type="button" title={w.note}>{w.label}</button>
                ))}
              </div>
            </label>
            <label className="acp-label">
              نوع المحتوى
              <div className="acp-chips">
                {(KINDS_BY_WORLD[world] ?? []).map((k) => (
                  <button key={k.key} className={`acp-chip ${kind === k.key ? 'acp-chip--selected' : ''}`} onClick={() => setKind(k.key)} type="button">{k.label}</button>
                ))}
              </div>
            </label>
            {saveError && <p className="acp-error">{saveError}</p>}
            <button className="acp-btn acp-btn--primary" onClick={() => { if (!title.trim()) { setSaveError('العنوان مطلوب.'); return; } saveDraft(2); }} disabled={saving || !title.trim()}>
              {saving ? <><span className="acp-spinner" aria-hidden="true" /> جاري الحفظ...</> : <><span className="material-symbols-outlined" aria-hidden="true">arrow_back</span> التالي</>}
            </button>
          </div>
        </section>
      )}

      {/* ═══════════════ STEP 2: PUBLISH DETAILS ═══════════════════ */}
      {step === 2 && (
        <section className="acp-section">
          <h1 className="acp-section__title">
            <span className="material-symbols-outlined" aria-hidden="true">tune</span>
            تفاصيل النشر
          </h1>
          <div className="acp-form">
            {/* Category — glass dropdown */}
            <div className="acp-label">
              التصنيف
              <div className="acp-glass-dropdown">
                <button className="acp-glass-dropdown__trigger" onClick={() => { setCategoryOpen(!categoryOpen); setSubcategoryOpen(false); }} type="button">
                  <span>{categoryId ? CATEGORIES.find((c) => c.id === categoryId)?.label : 'اختر التصنيف...'}</span>
                  <span className="material-symbols-outlined">{categoryOpen ? 'expand_less' : 'expand_more'}</span>
                </button>
                {categoryOpen && (
                  <div className="acp-glass-dropdown__menu">
                    {CATEGORIES.map((c) => (
                      <button key={c.id} className={`acp-glass-dropdown__option ${categoryId === c.id ? 'acp-glass-dropdown__option--selected' : ''}`} onClick={() => { setCategoryId(c.id); setCategoryOpen(false); }} type="button">{c.label}</button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Subcategory — glass dropdown, only when category selected */}
            {categoryId && SUBCATEGORIES_BY_CATEGORY[categoryId] && (
              <div className="acp-label">
                التصنيف الفرعي
                <div className="acp-glass-dropdown">
                  <button className="acp-glass-dropdown__trigger" onClick={() => { setSubcategoryOpen(!subcategoryOpen); setCategoryOpen(false); }} type="button">
                    <span>{subcategoryId ? SUBCATEGORIES_BY_CATEGORY[categoryId]?.find((s) => s.id === subcategoryId)?.label : 'اختر التصنيف الفرعي...'}</span>
                    <span className="material-symbols-outlined">{subcategoryOpen ? 'expand_less' : 'expand_more'}</span>
                  </button>
                  {subcategoryOpen && (
                    <div className="acp-glass-dropdown__menu">
                      {SUBCATEGORIES_BY_CATEGORY[categoryId]!.map((sc) => (
                        <button key={sc.id} className={`acp-glass-dropdown__option ${subcategoryId === sc.id ? 'acp-glass-dropdown__option--selected' : ''}`} onClick={() => { setSubcategoryId(sc.id); setSubcategoryOpen(false); }} type="button">{sc.label}</button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            <label className="acp-label">
              الوسوم (مفصولة بفواصل)
              <input type="text" className="acp-input" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="بودكاست, تقنية, حوار..." />
            </label>

            {/* Language — glass dropdown */}
            <div className="acp-label">
              اللغة
              <div className="acp-glass-dropdown">
                <button className="acp-glass-dropdown__trigger" onClick={() => setLanguageOpen(!languageOpen)} type="button">
                  <span>{LANGUAGES.find((l) => l.code === language)?.label}</span>
                  <span className="material-symbols-outlined">{languageOpen ? 'expand_less' : 'expand_more'}</span>
                </button>
                {languageOpen && (
                  <div className="acp-glass-dropdown__menu">
                    {LANGUAGES.map((l) => (
                      <button key={l.code} className={`acp-glass-dropdown__option ${language === l.code ? 'acp-glass-dropdown__option--selected' : ''}`} onClick={() => { setLanguage(l.code); setLanguageOpen(false); }} type="button">{l.label}</button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <label className="acp-label">
              الدول المستهدفة
              <div className="acp-chips">
                {(['all', 'one', 'upToFour'] as CountryMode[]).map((m) => (
                  <button key={m} className={`acp-chip ${countryMode === m ? 'acp-chip--selected' : ''}`} onClick={() => setCountryMode(m)} type="button">
                    {m === 'all' ? 'جميع الدول' : m === 'one' ? 'دولة واحدة' : 'حتى ٤ دول'}
                  </button>
                ))}
              </div>
            </label>
            {countryMode !== 'all' && (
              <label className="acp-label">
                رموز الدول (مفصولة بفواصل)
                <input type="text" className="acp-input" value={countryCodes} onChange={(e) => setCountryCodes(e.target.value)} placeholder="SA, AE, EG, KW" maxLength={20} />
              </label>
            )}

            {/* Age suitability */}
            <label className="acp-label">
              الفئة العمرية
              <div className="acp-chips">
                {([{ k: 'everyone' as const, l: 'الجميع' }, { k: 'teen' as const, l: '+13 مراهقين' }, { k: 'mature' as const, l: '+18 بالغين' }]).map((a) => (
                  <button key={a.k} className={`acp-chip ${ageSuitability === a.k ? 'acp-chip--selected' : ''}`} onClick={() => setAgeSuitability(a.k)} type="button">{a.l}</button>
                ))}
              </div>
            </label>

            <label className="acp-label acp-label--row">
              <input type="checkbox" checked={isExplicit} onChange={(e) => setIsExplicit(e.target.checked)} />
              محتوى صريح (Explicit)
            </label>

            {/* Child content toggle */}
            <div className="acp-toggle-row">
              <span className="material-symbols-outlined">child_care</span>
              <span>محتوى أطفال</span>
              <button className={`acp-toggle ${isChildContent ? 'acp-toggle--on' : ''}`} onClick={() => setIsChildContent(!isChildContent)} type="button">
                <span className="acp-toggle__knob" />
              </button>
            </div>

            {/* Audience — card list with icons */}
            <div className="acp-label">
              الجمهور / الخصوصية
              <div className="acp-audience-list">
                {AUDIENCE_OPTIONS.map((a) => (
                  <button key={a.key} className={`acp-audience-item ${audience === a.key ? 'acp-audience-item--selected' : ''}`} onClick={() => setAudience(a.key)} type="button">
                    <span className="material-symbols-outlined">{a.icon}</span>
                    {a.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Placement feed */}
            <div className="acp-label">
              موضع النشر
              <div className="acp-cards-row">
                <button className={`acp-card-btn ${placementFeed === 'main' ? 'acp-card-btn--selected' : ''}`} onClick={() => setPlacementFeed('main')} type="button">
                  <span className="material-symbols-outlined">home</span>
                  <span>الرئيسية</span>
                </button>
                <button className={`acp-card-btn ${placementFeed === 'shorts' ? 'acp-card-btn--selected' : ''}`} onClick={() => setPlacementFeed('shorts')} type="button">
                  <span className="material-symbols-outlined">movie</span>
                  <span>لقطات</span>
                </button>
              </div>
            </div>

            {/* Playlist intent (Phase 8-I) */}
            <div className="acp-label">
              قائمة التشغيل
              <div className="acp-playlist-cards">
                <button className={`acp-playlist-card ${playlistIntent === 'none' ? 'acp-playlist-card--selected' : ''}`} onClick={() => { setPlaylistIntent('none'); setSelectedPlaylistId(''); setNewPlaylistName(''); setPlaylistDropdownOpen(false); }} type="button">
                  <span className="material-symbols-outlined">playlist_remove</span>
                  بدون قائمة
                </button>
                <button className={`acp-playlist-card ${playlistIntent === 'existing' ? 'acp-playlist-card--selected' : ''}`} onClick={async () => { setPlaylistIntent('existing'); setNewPlaylistName(''); if (!playlistsLoaded && !playlistsLoading) { setPlaylistsLoading(true); try { const res = await callGetUserPlaylists({}); setUserPlaylists(res.data.playlists || []); setPlaylistsLoaded(true); } catch { setUserPlaylists([]); setPlaylistsLoaded(true); } finally { setPlaylistsLoading(false); } } setPlaylistDropdownOpen(true); }} type="button">
                  <span className="material-symbols-outlined">playlist_add</span>
                  إضافة لقائمة موجودة
                </button>
                <button className={`acp-playlist-card ${playlistIntent === 'new' ? 'acp-playlist-card--selected' : ''}`} onClick={() => { setPlaylistIntent('new'); setSelectedPlaylistId(''); setPlaylistDropdownOpen(false); }} type="button">
                  <span className="material-symbols-outlined">queue_music</span>
                  إنشاء قائمة جديدة
                </button>
              </div>

              {/* Existing playlist dropdown */}
              {playlistIntent === 'existing' && (
                <div className="acp-playlist-select">
                  {playlistsLoading ? (
                    <div className="acp-playlist-loading">
                      <span className="material-symbols-outlined acp-spin">progress_activity</span>
                      <span>جارٍ تحميل القوائم...</span>
                    </div>
                  ) : userPlaylists.length === 0 ? (
                    <div className="acp-playlist-empty">
                      <span className="material-symbols-outlined">info</span>
                      <span>لا توجد قوائم تشغيل بعد. يمكنك إنشاء قائمة جديدة.</span>
                    </div>
                  ) : (
                    <div className="acp-glass-dropdown">
                      <button className="acp-glass-dropdown__trigger" onClick={() => setPlaylistDropdownOpen(!playlistDropdownOpen)} type="button">
                        <span>{selectedPlaylistId ? userPlaylists.find(p => p.playlistId === selectedPlaylistId)?.title || 'قائمة غير معروفة' : 'اختر قائمة تشغيل...'}</span>
                        <span className="material-symbols-outlined">{playlistDropdownOpen ? 'expand_less' : 'expand_more'}</span>
                      </button>
                      {playlistDropdownOpen && (
                        <div className="acp-glass-dropdown__menu">
                          {userPlaylists.map((pl) => (
                            <button key={pl.playlistId} className={`acp-glass-dropdown__item ${selectedPlaylistId === pl.playlistId ? 'acp-glass-dropdown__item--selected' : ''}`} onClick={() => { setSelectedPlaylistId(pl.playlistId); setPlaylistDropdownOpen(false); }} type="button">
                              <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>queue_music</span>
                              <span className="acp-playlist-item-info">
                                <span className="acp-playlist-item-title">{pl.title}</span>
                                <span className="acp-playlist-item-meta">{pl.itemCount} مقطع · {pl.visibility === 'public' ? 'عامة' : 'خاصة'}</span>
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* New playlist name input */}
              {playlistIntent === 'new' && (
                <div className="acp-playlist-new-input">
                  <input
                    type="text"
                    className="acp-input"
                    placeholder="اسم القائمة الجديدة..."
                    value={newPlaylistName}
                    onChange={(e) => setNewPlaylistName(e.target.value)}
                    maxLength={80}
                    autoFocus
                  />
                </div>
              )}
            </div>

            <div className="acp-toggles-group">
              <h3 className="acp-toggles-group__title">إعدادات النشر</h3>
              <label className="acp-label acp-label--row"><input type="checkbox" checked={commentsEnabled} onChange={(e) => setCommentsEnabled(e.target.checked)} /> السماح بالتعليقات</label>
              <label className="acp-label acp-label--row"><input type="checkbox" checked={giftsEnabled} onChange={(e) => setGiftsEnabled(e.target.checked)} /> السماح بالهدايا</label>
              <label className="acp-label acp-label--row"><input type="checkbox" checked={sharingEnabled} onChange={(e) => setSharingEnabled(e.target.checked)} /> السماح بالمشاركة</label>

              {/* Schedule — disabled with gate badge */}
              <div className="acp-toggle-row" style={{ opacity: 0.5, cursor: 'not-allowed' }}>
                <span className="material-symbols-outlined">schedule_send</span>
                <span>جدولة النشر</span>
                <span className="acp-gate-badge">حسب الباقة</span>
                <button className="acp-toggle acp-toggle--disabled" disabled type="button">
                  <span className="acp-toggle__knob" />
                </button>
              </div>
            </div>

            {saveError && <p className="acp-error">{saveError}</p>}
            <div className="acp-nav-row">
              <button className="acp-btn acp-btn--ghost" onClick={() => setStep(1)} type="button">
                <span className="material-symbols-outlined" aria-hidden="true">arrow_forward</span> رجوع
              </button>
              <button className="acp-btn acp-btn--primary" onClick={() => saveDraft(3)} disabled={saving}>
                {saving ? <><span className="acp-spinner" aria-hidden="true" /> جاري الحفظ...</> : <><span className="material-symbols-outlined" aria-hidden="true">arrow_back</span> التالي</>}
              </button>
            </div>
          </div>
        </section>
      )}

      {/* ═══════════════ STEP 3: COVER (OPTIONAL) ═════════════════ */}
      {step === 3 && (
        <section className="acp-section">
          <h1 className="acp-section__title">
            <span className="material-symbols-outlined" aria-hidden="true">image</span>
            غلاف المحتوى
            <span className="acp-badge acp-badge--optional">اختياري</span>
          </h1>
          <div className="acp-form">
            {coverPreviewUrl && (
              <div className="acp-cover-preview">
                <img src={coverPreviewUrl} alt="معاينة الغلاف" className="acp-cover-preview__img" />
              </div>
            )}
            {coverUploading && (
              <div className="acp-progress">
                <div className="acp-progress__bar">
                  <div className="acp-progress__fill" style={{ width: `${coverProgress}%` }} />
                </div>
                <p className="acp-progress__text">جاري رفع الغلاف... {coverProgress}%</p>
              </div>
            )}
            {coverError && <p className="acp-error">{coverError}</p>}
            {coverAsset?.storagePath && !coverUploading && (
              <p className="acp-hint">
                <span className="material-symbols-outlined acp-hint__icon" aria-hidden="true">check_circle</span>
                تم رفع الغلاف بنجاح.
              </p>
            )}
            <div className="acp-cover-actions">
              <button className="acp-btn acp-btn--outline" onClick={() => coverInputRef.current?.click()} type="button" disabled={coverUploading}>
                <span className="material-symbols-outlined" aria-hidden="true">upload</span> {coverUploading ? 'جاري الرفع...' : 'رفع صورة'}
              </button>
              <input ref={coverInputRef} type="file" accept="image/*" onChange={handleCoverSelect} className="acp-file-input" tabIndex={-1} />
              <button className="acp-btn acp-btn--outline acp-btn--gated" disabled type="button">
                <span className="material-symbols-outlined" aria-hidden="true">photo_camera</span> كاميرا
                <span className="acp-gate-badge">قريباً</span>
              </button>
              <button className="acp-btn acp-btn--outline acp-btn--gated" disabled type="button">
                <span className="material-symbols-outlined" aria-hidden="true">auto_awesome</span> غلاف ذكي (AI)
                <span className="acp-gate-badge">مدفوع</span>
              </button>
            </div>
            {!coverPreviewUrl && (
              <p className="acp-hint">سيتم استخدام غلاف افتراضي إذا تخطيت هذه الخطوة.</p>
            )}
            <div className="acp-nav-row">
              <button className="acp-btn acp-btn--ghost" onClick={() => setStep(2)} type="button">
                <span className="material-symbols-outlined" aria-hidden="true">arrow_forward</span> رجوع
              </button>
              <button className="acp-btn acp-btn--ghost" onClick={() => setStep(4)} type="button">تخطي</button>
              <button className="acp-btn acp-btn--primary" onClick={() => saveDraft(4)} disabled={saving || coverUploading}>
                {saving ? 'حفظ...' : 'التالي'}
              </button>
            </div>
          </div>
        </section>
      )}

      {/* ═══════════════ STEP 4: CAPTIONS (OPTIONAL) ══════════════ */}
      {step === 4 && (
        <section className="acp-section">
          <h1 className="acp-section__title">
            <span className="material-symbols-outlined" aria-hidden="true">subtitles</span>
            إعداد الترجمة والنصوص
            <span className="acp-badge acp-badge--optional">اختياري</span>
          </h1>
          <div className="acp-form">
            <label className="acp-label acp-label--row acp-toggle-main">
              <input type="checkbox" checked={captionsEnabled} onChange={(e) => setCaptionsEnabled(e.target.checked)} />
              <span>تفعيل النصوص / الترجمة</span>
            </label>
            {captionsEnabled && (
              <>
                {/* Caption source mode selector */}
                <label className="acp-label">مصدر النص</label>
                <div className="acp-chips">
                  {([
                    { k: 'manual' as CaptionSource, l: 'كتابة يدوية', icon: 'edit_note' },
                    { k: 'uploaded' as CaptionSource, l: 'رفع ملف', icon: 'upload_file' },
                    { k: 'autoCue' as CaptionSource, l: 'استيراد من الملقن', icon: 'teleprompter' },
                    { k: 'generated' as CaptionSource, l: 'توليد تلقائي', icon: 'auto_awesome' },
                  ]).map((s) => (
                    <button
                      key={s.k}
                      className={`acp-chip ${captionSource === s.k ? 'acp-chip--selected' : ''} ${s.k === 'generated' ? 'acp-chip--disabled' : ''}`}
                      onClick={() => s.k !== 'generated' && setCaptionSource(s.k)}
                      type="button"
                      disabled={s.k === 'generated'}
                    >
                      <span className="material-symbols-outlined acp-chip__icon">{s.icon}</span>
                      {s.l}
                      {s.k === 'generated' && <span className="acp-badge acp-badge--soon">قريباً</span>}
                    </button>
                  ))}
                </div>

                {/* ── Manual mode ── */}
                {captionSource === 'manual' && (
                  <div className="acp-captions-editor">
                    <label className="acp-label">اكتب النص (كل سطر = مقطع واحد)</label>
                    <textarea
                      className="acp-textarea acp-textarea--captions"
                      rows={8}
                      dir="auto"
                      placeholder="اكتب النص هنا...
كل سطر سيصبح مقطع منفصل"
                      value={captionRawText}
                      onChange={(e) => {
                        setCaptionRawText(e.target.value);
                        setCaptionSegments(splitTextToSegments(e.target.value));
                      }}
                    />
                    {captionSegments.length > 0 && (
                      <p className="acp-hint">
                        <span className="material-symbols-outlined acp-hint__icon">segment</span>
                        {captionSegments.length} مقطع — بدون توقيت (نص غير متزامن)
                      </p>
                    )}
                  </div>
                )}

                {/* ── Upload mode ── */}
                {captionSource === 'uploaded' && (
                  <div className="acp-captions-editor">
                    <label className="acp-label">ارفع ملف ترجمة (SRT أو VTT)</label>
                    <input
                      ref={captionFileRef}
                      type="file"
                      accept=".srt,.vtt"
                      className="acp-file-input"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        setCaptionUploadedFile(file.name);
                        const reader = new FileReader();
                        reader.onload = () => {
                          const text = reader.result as string;
                          setCaptionRawText(text);
                          const ext = file.name.toLowerCase();
                          if (ext.endsWith('.srt')) {
                            setCaptionSegments(parseSRT(text));
                          } else if (ext.endsWith('.vtt')) {
                            setCaptionSegments(parseVTT(text));
                          } else {
                            setCaptionSegments(splitTextToSegments(text));
                          }
                        };
                        reader.readAsText(file);
                      }}
                    />
                    {captionUploadedFile && (
                      <p className="acp-hint">
                        <span className="material-symbols-outlined acp-hint__icon">description</span>
                        {captionUploadedFile}
                      </p>
                    )}
                    {captionSegments.length > 0 && (
                      <div className="acp-captions-preview">
                        <p className="acp-hint">
                          <span className="material-symbols-outlined acp-hint__icon">segment</span>
                          {captionSegments.length} مقطع
                          {captionSegments[0]?.startMs !== undefined ? ' — مع توقيت' : ' — بدون توقيت'}
                        </p>
                        <div className="acp-captions-preview__list">
                          {captionSegments.slice(0, 5).map((seg) => (
                            <div key={seg.id} className="acp-captions-preview__seg">
                              {seg.startMs !== undefined && (
                                <span className="acp-captions-preview__time">
                                  {Math.floor(seg.startMs / 1000)}s
                                </span>
                              )}
                              <span className="acp-captions-preview__text">{seg.text}</span>
                            </div>
                          ))}
                          {captionSegments.length > 5 && (
                            <p className="acp-hint">و{captionSegments.length - 5} مقطع آخر...</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* ── AutoCue import mode ── */}
                {captionSource === 'autoCue' && (
                  <div className="acp-captions-editor">
                    {scriptText ? (
                      <>
                        <p className="acp-hint">
                          <span className="material-symbols-outlined acp-hint__icon">teleprompter</span>
                          يمكنك استيراد نص الملقن كنص ترجمة
                        </p>
                        <button
                          className="acp-btn acp-btn--ghost"
                          type="button"
                          onClick={() => {
                            setCaptionRawText(scriptText);
                            setCaptionSegments(splitTextToSegments(scriptText));
                          }}
                        >
                          <span className="material-symbols-outlined">content_copy</span>
                          استيراد نص الملقن
                        </button>
                        {captionSegments.length > 0 && (
                          <p className="acp-hint">
                            <span className="material-symbols-outlined acp-hint__icon">check_circle</span>
                            تم استيراد {captionSegments.length} مقطع (بدون توقيت)
                          </p>
                        )}
                      </>
                    ) : (
                      <p className="acp-hint">
                        <span className="material-symbols-outlined acp-hint__icon">info</span>
                        لا يوجد نص ملقن. أضف نص الملقن في الخطوة 5 أولاً.
                      </p>
                    )}
                  </div>
                )}

                {/* ── Generated mode (gated) ── */}
                {captionSource === 'generated' && (
                  <div className="acp-captions-editor">
                    <p className="acp-hint">
                      <span className="material-symbols-outlined acp-hint__icon">auto_awesome</span>
                      قريباً — يتطلب مزود تفريغ صوتي
                    </p>
                  </div>
                )}

                {/* Language + Style selectors (shared across modes) */}
                <div className="acp-label">
                  لغة النص
                  <div className="acp-glass-dropdown">
                    <button className="acp-glass-dropdown__trigger" onClick={() => setCaptionLangOpen(!captionLangOpen)} type="button">
                      <span>{LANGUAGES.find((l) => l.code === captionLang)?.label}</span>
                      <span className="material-symbols-outlined">{captionLangOpen ? 'expand_less' : 'expand_more'}</span>
                    </button>
                    {captionLangOpen && (
                      <div className="acp-glass-dropdown__menu">
                        {LANGUAGES.map((l) => (
                          <button key={l.code} className={`acp-glass-dropdown__option ${captionLang === l.code ? 'acp-glass-dropdown__option--selected' : ''}`} onClick={() => { setCaptionLang(l.code); setCaptionLangOpen(false); }} type="button">{l.label}</button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <label className="acp-label">
                  نمط العرض
                  <div className="acp-chips">
                    {([{ k: 'standard' as const, l: 'عادي' }, { k: 'karaoke' as const, l: 'كاريوكي' }, { k: 'subtitles' as const, l: 'ترجمة سفلية' }]).map((s) => (
                      <button key={s.k} className={`acp-chip ${captionStyle === s.k ? 'acp-chip--selected' : ''}`} onClick={() => setCaptionStyle(s.k)} type="button">{s.l}</button>
                    ))}
                  </div>
                </label>
              </>
            )}
            <div className="acp-nav-row">
              <button className="acp-btn acp-btn--ghost" onClick={() => setStep(3)} type="button">
                <span className="material-symbols-outlined" aria-hidden="true">arrow_forward</span> رجوع
              </button>
              <button className="acp-btn acp-btn--ghost" onClick={() => setStep(5)} type="button">تخطي</button>
              <button className="acp-btn acp-btn--primary" onClick={() => saveDraft(5)} disabled={saving}>
                {saving ? 'حفظ...' : 'التالي'}
              </button>
            </div>
          </div>
        </section>
      )}

      {/* ═══════════════ STEP 5: AUTOCUE (OPTIONAL) ═══════════════ */}
      {step === 5 && (
        <section className="acp-section">
          <h1 className="acp-section__title">
            <span className="material-symbols-outlined" aria-hidden="true">teleprompter</span>
            الملقن (AutoCue)
            <span className="acp-badge acp-badge--optional">اختياري</span>
          </h1>
          <div className="acp-form">
            <div className="acp-gate-banner">
              <span className="material-symbols-outlined" aria-hidden="true">workspace_premium</span>
              <span>ميزة مدفوعة — متاحة لمشتركي الحزم المتقدمة أو بتفعيل إداري.</span>
            </div>
            <label className="acp-label acp-label--row acp-toggle-main">
              <input type="checkbox" checked={autoCueEnabled} onChange={(e) => setAutoCueEnabled(e.target.checked)} />
              <span>تفعيل الملقن أثناء التسجيل</span>
            </label>
            {autoCueEnabled && (
              <>
                <label className="acp-label">
                  النص / كلمات الأغنية
                  <textarea className="acp-textarea acp-textarea--script" value={scriptText} onChange={(e) => setScriptText(e.target.value)} placeholder="اكتب أو الصق النص هنا..." rows={8} />
                </label>
                <div className="acp-autocue-actions">
                  <button className="acp-btn acp-btn--outline acp-btn--sm" onClick={() => setScriptText(caption)} type="button" disabled={!caption}>نسخ من الوصف</button>
                  <button className="acp-btn acp-btn--outline acp-btn--sm acp-btn--gated" disabled type="button">
                    توليد ذكي (AI) <span className="acp-gate-badge">مدفوع</span>
                  </button>
                  <button className="acp-btn acp-btn--outline acp-btn--sm" onClick={() => setScriptText('')} type="button">مسح</button>
                </div>
                <div className="acp-autocue-settings">
                  <label className="acp-label">
                    سرعة التمرير
                    <div className="acp-chips">
                      {([{ k: 'slow' as const, l: 'بطيء' }, { k: 'medium' as const, l: 'متوسط' }, { k: 'fast' as const, l: 'سريع' }]).map((s) => (
                        <button key={s.k} className={`acp-chip ${scrollSpeed === s.k ? 'acp-chip--selected' : ''}`} onClick={() => setScrollSpeed(s.k)} type="button">{s.l}</button>
                      ))}
                    </div>
                  </label>
                  <label className="acp-label">
                    حجم الخط
                    <div className="acp-chips">
                      {([{ k: 'small' as const, l: 'صغير' }, { k: 'medium' as const, l: 'متوسط' }, { k: 'large' as const, l: 'كبير' }]).map((s) => (
                        <button key={s.k} className={`acp-chip ${fontSize === s.k ? 'acp-chip--selected' : ''}`} onClick={() => setFontSize(s.k)} type="button">{s.l}</button>
                      ))}
                    </div>
                  </label>
                  <label className="acp-label">
                    وضع القراءة
                    <div className="acp-chips">
                      <button className={`acp-chip ${readingMode === 'lineByLine' ? 'acp-chip--selected' : ''}`} onClick={() => setReadingMode('lineByLine')} type="button">سطر بسطر</button>
                      <button className={`acp-chip ${readingMode === 'paragraphByParagraph' ? 'acp-chip--selected' : ''}`} onClick={() => setReadingMode('paragraphByParagraph')} type="button">فقرة بفقرة</button>
                    </div>
                  </label>
                  <label className="acp-label">
                    تأخير البداية (ثوان)
                    <input type="number" className="acp-input acp-input--narrow" value={startDelay} onChange={(e) => setStartDelay(Number(e.target.value))} min={0} max={30} />
                  </label>
                  <label className="acp-label acp-label--row">
                    <input type="checkbox" checked={highlightLine} onChange={(e) => setHighlightLine(e.target.checked)} />
                    تمييز السطر الحالي
                  </label>
                </div>
              </>
            )}
            <div className="acp-nav-row">
              <button className="acp-btn acp-btn--ghost" onClick={() => setStep(4)} type="button">
                <span className="material-symbols-outlined" aria-hidden="true">arrow_forward</span> رجوع
              </button>
              <button className="acp-btn acp-btn--ghost" onClick={() => setStep(6)} type="button">تخطي</button>
              <button className="acp-btn acp-btn--primary" onClick={() => saveDraft(6)} disabled={saving}>
                {saving ? 'حفظ...' : 'التالي'}
              </button>
            </div>
          </div>
        </section>
      )}

      {/* ═══════════════ STEP 6: RECORD / UPLOAD ═══════════════════ */}
      {step === 6 && (
        <section className="acp-section">
          <h1 className="acp-section__title">
            <span className="material-symbols-outlined" aria-hidden="true">mic</span>
            التسجيل أو الرفع
          </h1>

          {/* AutoCue banner */}
          {autoCueEnabled && scriptText && (
            <div className="acp-autocue-banner">
              <span className="material-symbols-outlined" aria-hidden="true">teleprompter</span>
              <span>وضع الملقن مفعّل — النص سيظهر أثناء التسجيل</span>
            </div>
          )}

          {/* Tab switcher */}
          <div className="acp-tabs">
            <button className={`acp-tab ${tab === 'record' ? 'acp-tab--active' : ''}`} onClick={() => setTab('record')} type="button">
              <span className="material-symbols-outlined" aria-hidden="true">mic</span> تسجيل
            </button>
            <button className={`acp-tab ${tab === 'upload' ? 'acp-tab--active' : ''}`} onClick={() => setTab('upload')} type="button">
              <span className="material-symbols-outlined" aria-hidden="true">upload_file</span> رفع ملف
            </button>
          </div>

          {/* ── Record tab ──────────────────────────────────────── */}
          {tab === 'record' && (
            <div className={`acp-record-panel ${autoCueEnabled && scriptText ? 'acp-record-panel--autocue' : ''}`}>
              {/* AutoCue script view */}
              {autoCueEnabled && scriptText && (
                <div className="acp-script-surface">
                  <div className={`acp-script-surface__text acp-script-surface__text--${fontSize}`}>
                    {scriptText.split('\n').map((line, i) => (
                      <p key={i} className="acp-script-surface__line">{line || '\u00A0'}</p>
                    ))}
                  </div>
                </div>
              )}

              {/* Recording controls */}
              <div className={autoCueEnabled && scriptText ? 'acp-record-controls--compact' : ''}>
                {recorder.state === 'idle' && (
                  <button className="acp-record-btn" onClick={recorder.startRecording} type="button">
                    <span className="material-symbols-outlined acp-record-btn__icon">mic</span>
                    <span>ابدأ التسجيل</span>
                  </button>
                )}
                {recorder.state === 'requesting' && (
                  <div className="acp-record-status"><span className="acp-spinner" /><p>جاري طلب إذن الميكروفون...</p></div>
                )}
                {recorder.state === 'recording' && (
                  <div className="acp-record-live">
                    <div className="acp-record-pulse" />
                    <p className="acp-record-time">{formatDuration(recorder.elapsedMs)}</p>
                    <button className="acp-btn acp-btn--danger" onClick={recorder.stopRecording} type="button">
                      <span className="material-symbols-outlined" aria-hidden="true">stop_circle</span> إيقاف
                    </button>
                  </div>
                )}
                {recorder.state === 'stopped' && recorder.audioUrl && (
                  <div className="acp-record-preview">
                    <audio controls src={recorder.audioUrl} className="acp-audio-player" />
                    <div className="acp-record-preview__info">
                      <span>المدة: {formatDuration(recorder.elapsedMs)}</span>
                      {recorder.audioBlob && <span>الحجم: {formatFileSize(recorder.audioBlob.size)}</span>}
                    </div>
                    <div className="acp-record-preview__actions">
                      <button className="acp-btn acp-btn--primary" onClick={handleUploadRecording} disabled={uploader.state === 'uploading' || uploader.state === 'done'} type="button">
                        <span className="material-symbols-outlined" aria-hidden="true">cloud_upload</span> رفع التسجيل
                      </button>
                      <button className="acp-btn acp-btn--ghost" onClick={recorder.reset} disabled={uploader.state === 'uploading'} type="button">إعادة التسجيل</button>
                    </div>
                  </div>
                )}
                {recorder.state === 'error' && (
                  <div className="acp-error-box">
                    <span className="material-symbols-outlined">error</span>
                    <p>{recorder.errorMessage}</p>
                    <button className="acp-btn acp-btn--ghost" onClick={recorder.reset} type="button">حاول مجدداً</button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Upload tab ─────────────────────────────────────── */}
          {tab === 'upload' && (
            <div className="acp-upload-panel">
              {!selectedFile && (
                <div className="acp-drop-zone" onClick={() => fileInputRef.current?.click()} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}>
                  <span className="material-symbols-outlined acp-drop-zone__icon">audio_file</span>
                  <p>اختر ملفاً صوتياً</p>
                  <p className="acp-drop-zone__hint">MP3, WAV, AAC, OGG, WebM — حتى 100MB</p>
                  <input ref={fileInputRef} type="file" accept="audio/*" onChange={handleFileSelect} className="acp-file-input" tabIndex={-1} />
                </div>
              )}
              {fileError && <div className="acp-error-box"><span className="material-symbols-outlined">error</span><p>{fileError}</p></div>}
              {selectedFile && (
                <div className="acp-file-info">
                  <span className="material-symbols-outlined acp-file-info__icon">audio_file</span>
                  <div className="acp-file-info__details">
                    <p className="acp-file-info__name">{selectedFile.name}</p>
                    <div className="acp-file-info__meta">
                      <span>{formatFileSize(selectedFile.size)}</span>
                      {fileDurationMs && <span>{formatDuration(fileDurationMs)}</span>}
                    </div>
                  </div>
                  <div className="acp-file-info__actions">
                    <button className="acp-btn acp-btn--primary" onClick={handleUploadFile} disabled={uploader.state === 'uploading' || uploader.state === 'done'} type="button">
                      <span className="material-symbols-outlined" aria-hidden="true">cloud_upload</span> رفع الملف
                    </button>
                    <button className="acp-btn acp-btn--ghost" onClick={() => { setSelectedFile(null); setFileDurationMs(null); uploader.reset(); if (fileInputRef.current) fileInputRef.current.value = ''; }} disabled={uploader.state === 'uploading'} type="button">تغيير الملف</button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Upload progress ────────────────────────────────── */}
          {uploader.state === 'uploading' && (
            <div className="acp-progress">
              <div className="acp-progress__bar"><div className="acp-progress__fill" style={{ width: `${uploader.progress}%` }} /></div>
              <p className="acp-progress__text">جاري الرفع... {uploader.progress}%</p>
              <button className="acp-btn acp-btn--ghost acp-btn--sm" onClick={uploader.cancel} type="button">إلغاء</button>
            </div>
          )}
          {attaching && <div className="acp-progress"><span className="acp-spinner" /><p className="acp-progress__text">جاري ربط الملف بالمسودة...</p></div>}
          {uploader.state === 'error' && <div className="acp-error-box"><span className="material-symbols-outlined">error</span><p>{uploader.errorMessage}</p></div>}
          {attachError && <div className="acp-error-box"><span className="material-symbols-outlined">error</span><p>{attachError}</p></div>}

          {/* ── Asset attached ─────────────────────────────────── */}
          {audioAsset && (
            <div className="acp-success-box">
              <span className="material-symbols-outlined">check_circle</span>
              <p>تم ربط الملف الصوتي بالمسودة بنجاح!</p>
              <div className="acp-asset-summary">
                <span className="acp-asset-summary__item">
                  <span className="material-symbols-outlined">description</span> {audioAsset.originalFileName}
                </span>
                {audioAsset.durationMs ? <span className="acp-asset-summary__item"><span className="material-symbols-outlined">schedule</span> {formatDuration(audioAsset.durationMs)}</span> : null}
                {audioAsset.sizeBytes ? <span className="acp-asset-summary__item"><span className="material-symbols-outlined">inventory_2</span> {formatFileSize(audioAsset.sizeBytes)}</span> : null}
              </div>
              <button className="acp-btn acp-btn--primary" onClick={() => setStep(7)} type="button">
                <span className="material-symbols-outlined" aria-hidden="true">arrow_back</span> متابعة
              </button>
            </div>
          )}

          {/* Back button */}
          {!audioAsset && (
            <button className="acp-btn acp-btn--ghost acp-back" onClick={() => setStep(5)} type="button">
              <span className="material-symbols-outlined" aria-hidden="true">arrow_forward</span> رجوع
            </button>
          )}
        </section>
      )}

      {/* ═══════════════ STEP 7: REVIEW ═══════════════════════════ */}
      {step === 7 && (
        <section className="acp-section">
          <h1 className="acp-section__title">
            <span className="material-symbols-outlined" aria-hidden="true">preview</span>
            مراجعة وتعديل الصوت
          </h1>
          <div className="acp-form">
            {audioAsset ? (
              <div className="acp-review-audio">
                <div className="acp-review__item"><span>الملف:</span> <strong>{audioAsset.originalFileName}</strong></div>
                {audioAsset.durationMs ? <div className="acp-review__item"><span>المدة:</span> {formatDuration(audioAsset.durationMs)}</div> : null}
                {audioAsset.sizeBytes ? <div className="acp-review__item"><span>الحجم:</span> {formatFileSize(audioAsset.sizeBytes)}</div> : null}
                <div className="acp-review__item">
                  <span>المصدر:</span>
                  <span className="material-symbols-outlined" style={{ fontSize: '0.9rem' }}>{audioAsset.sourceType === 'recorded' ? 'mic' : 'upload_file'}</span>
                  {audioAsset.sourceType === 'recorded' ? ' مسجّل' : ' مرفوع'}
                </div>
                <div className="acp-review__item">
                  <span>الحالة:</span>
                  <span className="material-symbols-outlined" style={{ fontSize: '0.9rem', color: '#22c55e' }}>check_circle</span>
                  مرفوع
                </div>
              </div>
            ) : (
              <div className="acp-warning-box">
                <span className="material-symbols-outlined">warning</span>
                <p>لا يوجد ملف صوتي. ارجع للخطوة السابقة.</p>
              </div>
            )}

            {/* ── Phase 8-L.1: Waveform Timeline + Preview ─────────────── */}
            {audioAsset && previewAudioUrl && (
              <div className="acp-waveform-card" id="waveform-timeline">
                {/* Hidden audio element for trim/cut-aware preview */}
                <audio ref={waveformAudioRef} src={previewAudioUrl} preload="metadata" style={{ display: 'none' }}
                  onEnded={() => { setWfPlaying(false); cancelAnimationFrame(wfAnimRef.current); }} />

                {waveformLoading ? (
                  <div className="acp-waveform-loading">
                    <span className="acp-spinner" aria-hidden="true" />
                    جاري تحليل الموجة الصوتية...
                  </div>
                ) : waveformPeaks.length > 0 ? (
                  <>
                    {/* SVG Waveform */}
                    <div className="acp-waveform-timeline"
                      ref={waveformTimelineRef}
                      onClick={(e) => {
                        if (!originalDurationMs || wfDragging) return;
                        const rect = e.currentTarget.getBoundingClientRect();
                        const x = e.clientX - rect.left;
                        const pct = Math.max(0, Math.min(1, x / rect.width));
                        const seekMs = pct * originalDurationMs;
                        if (waveformAudioRef.current) {
                          waveformAudioRef.current.currentTime = seekMs / 1000;
                          setWfCurrentMs(seekMs);
                        }
                      }}
                      onMouseDown={(e) => {
                        if (!originalDurationMs) return;
                        e.preventDefault();
                        setWfDragging(true);
                        const rect = e.currentTarget.getBoundingClientRect();
                        const seek = (clientX: number) => {
                          const x = clientX - rect.left;
                          const pct = Math.max(0, Math.min(1, x / rect.width));
                          const seekMs = pct * originalDurationMs;
                          if (waveformAudioRef.current) {
                            waveformAudioRef.current.currentTime = seekMs / 1000;
                            setWfCurrentMs(seekMs);
                          }
                        };
                        seek(e.clientX);
                        const onMove = (ev: MouseEvent) => seek(ev.clientX);
                        const onUp = () => {
                          setWfDragging(false);
                          document.removeEventListener('mousemove', onMove);
                          document.removeEventListener('mouseup', onUp);
                        };
                        document.addEventListener('mousemove', onMove);
                        document.addEventListener('mouseup', onUp);
                      }}
                      onTouchStart={(e) => {
                        if (!originalDurationMs) return;
                        setWfDragging(true);
                        const rect = e.currentTarget.getBoundingClientRect();
                        const seek = (clientX: number) => {
                          const x = clientX - rect.left;
                          const pct = Math.max(0, Math.min(1, x / rect.width));
                          const seekMs = pct * originalDurationMs;
                          if (waveformAudioRef.current) {
                            waveformAudioRef.current.currentTime = seekMs / 1000;
                            setWfCurrentMs(seekMs);
                          }
                        };
                        const t0 = e.touches[0];
                        if (t0) seek(t0.clientX);
                        const onMove = (ev: TouchEvent) => { const t = ev.touches[0]; if (t) seek(t.clientX); };
                        const onEnd = () => {
                          setWfDragging(false);
                          document.removeEventListener('touchmove', onMove);
                          document.removeEventListener('touchend', onEnd);
                        };
                        document.addEventListener('touchmove', onMove, { passive: true });
                        document.addEventListener('touchend', onEnd);
                      }}
                      style={{ cursor: wfDragging ? 'grabbing' : 'pointer' }}
                    >
                      <svg viewBox="0 0 200 100" preserveAspectRatio="none">
                        {waveformPeaks.map((peak, i) => {
                          const barMs = (i / 200) * originalDurationMs;
                          const isTrimmedOut = editEnabled && (barMs < effectiveStart || barMs > effectiveEnd);
                          const isCut = editEnabled && editCuts.some(c => barMs >= c.startMs && barMs < c.endMs);
                          const barH = Math.max(2, peak * 80);
                          const y = 50 - barH / 2;
                          let fill = 'url(#wfGrad)';
                          let opacity = 1;
                          if (isTrimmedOut) { fill = '#444'; opacity = 0.3; }
                          else if (isCut) { fill = '#ef4444'; opacity = 0.4; }
                          return <rect key={i} x={i} y={y} width={0.6} height={barH} rx={0.3} fill={fill} opacity={opacity} />;
                        })}
                        <defs>
                          <linearGradient id="wfGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#e5c76b" />
                            <stop offset="100%" stopColor="#22d3ee" />
                          </linearGradient>
                        </defs>
                      </svg>
                      {/* Playhead */}
                      {originalDurationMs > 0 && (
                        <div className="acp-waveform-timeline__playhead"
                          style={{ left: `${(wfCurrentMs / originalDurationMs) * 100}%` }} />
                      )}
                    </div>

                    {/* Controls */}
                    <div className="acp-waveform-controls">
                      <span className="acp-waveform-controls__time">{formatDuration(wfCurrentMs)}</span>
                      <button type="button" className="acp-waveform-controls__skip"
                        onClick={() => {
                          if (waveformAudioRef.current) {
                            const t = Math.max(effectiveStart / 1000, waveformAudioRef.current.currentTime - 10);
                            waveformAudioRef.current.currentTime = t;
                            setWfCurrentMs(t * 1000);
                          }
                        }}>-10</button>
                      <button type="button" className="acp-waveform-controls__play" onClick={toggleWfPlayback} aria-label={wfPlaying ? 'إيقاف' : 'تشغيل'}>
                        <span className="material-symbols-outlined">{wfPlaying ? 'pause' : 'play_arrow'}</span>
                      </button>
                      <button type="button" className="acp-waveform-controls__skip"
                        onClick={() => {
                          if (waveformAudioRef.current) {
                            const t = Math.min(effectiveEnd / 1000, waveformAudioRef.current.currentTime + 10);
                            waveformAudioRef.current.currentTime = t;
                            setWfCurrentMs(t * 1000);
                          }
                        }}>+10</button>
                      <span className="acp-waveform-controls__time">{formatDuration(editEnabled ? editedDurationMs : originalDurationMs)}</span>
                    </div>

                    {/* Phase 8-L.1: Edit preview render button */}
                    {editEnabled && (
                      <div className="acp-render-preview-panel">
                        <button
                          type="button"
                          className="acp-btn acp-btn--accent acp-btn--sm"
                          onClick={() => renderPreview('edit')}
                          disabled={renderingStage === 'edit'}
                        >
                          {renderingStage === 'edit' ? (
                            <><span className="material-symbols-outlined acp-spin">progress_activity</span> جاري معالجة المعاينة...</>
                          ) : getStagePreviewStatus('edit') === 'ready' ? (
                            <><span className="material-symbols-outlined">check_circle</span> ✓ المعاينة جاهزة — إعادة المعاينة</>
                          ) : getStagePreviewStatus('edit') === 'failed' ? (
                            <><span className="material-symbols-outlined">error</span> فشلت المعاينة — إعادة المحاولة</>
                          ) : getStagePreviewStatus('edit') === 'dirty' ? (
                            <><span className="material-symbols-outlined">warning</span> الإعدادات تغيرت — أعد المعاينة</>
                          ) : (
                            <><span className="material-symbols-outlined">play_circle</span> معاينة القص</>
                          )}
                        </button>
                        {previewUrls.edit && (
                          <audio controls src={previewUrls.edit} className="acp-preview-audio" />
                        )}
                        {previewAssets.edit?.status === 'failed' && previewAssets.edit?.error && (
                          <p className="acp-error-text">{previewAssets.edit.error}</p>
                        )}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="acp-waveform-loading">
                    <span className="material-symbols-outlined">graphic_eq</span>
                    لم يتمكن من تحليل الموجة الصوتية
                  </div>
                )}
              </div>
            )}

            {/* ── Phase 8-L: Trim/Cut Editor ──────────────────────────── */}
            {audioAsset && audioAsset.durationMs && audioAsset.durationMs > 0 && (
              <div className="acp-edit-panel" id="audio-edit-panel">
                <div className="acp-edit-panel__header">
                  <div className="acp-edit-panel__title-row">
                    <span className="material-symbols-outlined">content_cut</span>
                    <span>قص وتعديل الصوت</span>
                    <span className="acp-badge acp-badge--optional">اختياري</span>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={editEnabled}
                    className={`acp-toggle-switch ${editEnabled ? 'acp-toggle-switch--on' : ''}`}
                    onClick={() => setEditEnabled(!editEnabled)}
                  >
                    <span className="acp-toggle-switch__thumb" />
                  </button>
                </div>

                {editEnabled && (
                  <div className="acp-edit-controls">
                    {/* Trim start */}
                    <div className="acp-edit-control" id="edit-trim-start">
                      <div className="acp-edit-control__label">
                        <span className="material-symbols-outlined">first_page</span>
                        قص البداية
                      </div>
                      <input
                        type="range"
                        className="acp-edit-control__slider"
                        min={0}
                        max={Math.max(0, (trimEndMs > 0 ? trimEndMs : originalDurationMs) - 1000)}
                        step={100}
                        value={trimStartMs}
                        onChange={e => setTrimStartMs(Number(e.target.value))}
                      />
                      <div className="acp-edit-control__value">
                        {formatDuration(trimStartMs)}
                      </div>
                    </div>

                    {/* Trim end */}
                    <div className="acp-edit-control" id="edit-trim-end">
                      <div className="acp-edit-control__label">
                        <span className="material-symbols-outlined">last_page</span>
                        قص النهاية
                      </div>
                      <input
                        type="range"
                        className="acp-edit-control__slider"
                        min={Math.max(1000, trimStartMs + 1000)}
                        max={originalDurationMs}
                        step={100}
                        value={trimEndMs > 0 ? trimEndMs : originalDurationMs}
                        onChange={e => {
                          const v = Number(e.target.value);
                          setTrimEndMs(v >= originalDurationMs ? 0 : v);
                        }}
                      />
                      <div className="acp-edit-control__value">
                        {formatDuration(trimEndMs > 0 ? trimEndMs : originalDurationMs)}
                      </div>
                    </div>

                    {/* Middle cut */}
                    <div className="acp-edit-cut-section" id="edit-middle-cut">
                      <div className="acp-edit-cut-section__header">
                        <span className="material-symbols-outlined">content_cut</span>
                        <span>حذف مقطع من المنتصف</span>
                        <span className="acp-hint">(حد أقصى: 1)</span>
                      </div>
                      {editCuts.map(cut => (
                        <div key={cut.id} className="acp-edit-cut-card">
                          <div className="acp-edit-cut-card__row">
                            <div className="acp-edit-cut-card__field">
                              <span className="acp-edit-cut-card__field-label">من:</span>
                              <input
                                type="range"
                                className="acp-edit-control__slider"
                                min={trimStartMs}
                                max={Math.max(trimStartMs, cut.endMs - 500)}
                                step={100}
                                value={cut.startMs}
                                onChange={e => updateCut(cut.id, { startMs: Number(e.target.value) })}
                              />
                              <span className="acp-edit-control__value">{formatDuration(cut.startMs)}</span>
                            </div>
                            <div className="acp-edit-cut-card__field">
                              <span className="acp-edit-cut-card__field-label">إلى:</span>
                              <input
                                type="range"
                                className="acp-edit-control__slider"
                                min={Math.min(cut.startMs + 500, trimEndMs > 0 ? trimEndMs : originalDurationMs)}
                                max={trimEndMs > 0 ? trimEndMs : originalDurationMs}
                                step={100}
                                value={cut.endMs}
                                onChange={e => updateCut(cut.id, { endMs: Number(e.target.value) })}
                              />
                              <span className="acp-edit-control__value">{formatDuration(cut.endMs)}</span>
                            </div>
                          </div>
                          <button type="button" className="acp-btn acp-btn--ghost acp-btn--sm" onClick={() => removeCut(cut.id)}>
                            <span className="material-symbols-outlined">delete</span> إزالة القص
                          </button>
                        </div>
                      ))}
                      {editCuts.length === 0 && (
                        <button type="button" className="acp-btn acp-btn--outline acp-btn--sm" onClick={addCut}>
                          <span className="material-symbols-outlined">add</span> إضافة قص
                        </button>
                      )}
                    </div>

                    {/* Duration summary */}
                    <div className="acp-edit-duration-summary">
                      <div className="acp-edit-duration-summary__row">
                        <span className="material-symbols-outlined">schedule</span>
                        <span>المدة الأصلية:</span>
                        <strong>{formatDuration(originalDurationMs)}</strong>
                      </div>
                      <div className="acp-edit-duration-summary__row acp-edit-duration-summary__row--edited">
                        <span className="material-symbols-outlined">timer</span>
                        <span>المدة بعد التعديل:</span>
                        <strong>{formatDuration(editedDurationMs)}</strong>
                      </div>
                    </div>

                    {/* Reset button */}
                    <button type="button" className="acp-btn acp-btn--ghost acp-btn--sm" onClick={resetEdits}>
                      <span className="material-symbols-outlined">restart_alt</span> إعادة ضبط التعديلات
                    </button>
                  </div>
                )}
              </div>
            )}

            <div className="acp-nav-row">
              <button className="acp-btn acp-btn--ghost" onClick={() => { setAudioAsset(null); uploader.reset(); recorder.reset(); setStep(6); }} type="button">
                <span className="material-symbols-outlined" aria-hidden="true">refresh</span> إعادة التسجيل / الرفع
              </button>
              <button className="acp-btn acp-btn--primary" onClick={() => saveDraft(8)} disabled={!audioAsset} type="button">
                <span className="material-symbols-outlined" aria-hidden="true">arrow_back</span> تأكيد ومتابعة
              </button>
            </div>
          </div>
        </section>
      )}

      {/* ═══════════════ STEP 8: EFFECTS (Phase 8-J) ═════════════════ */}
      {step === 8 && (
        <section className="acp-section">
          <h1 className="acp-section__title">
            <span className="material-symbols-outlined" aria-hidden="true">tune</span>
            المؤثرات الصوتية
            <span className="acp-badge acp-badge--optional">اختياري</span>
          </h1>
          <div className="acp-form">
            {/* Enable/disable toggle */}
            <div className="acp-effects-toggle-row">
              <label className="acp-effects-toggle" id="effects-master-toggle">
                <span>تفعيل المؤثرات الصوتية</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={effectsEnabled}
                  className={`acp-toggle-switch ${effectsEnabled ? 'acp-toggle-switch--on' : ''}`}
                  onClick={() => setEffectsEnabled(!effectsEnabled)}
                >
                  <span className="acp-toggle-switch__thumb" />
                </button>
              </label>
            </div>

            {effectsEnabled && (
              <>
                {/* Mode selector cards */}
                <div className="acp-effects-mode-row" id="effects-mode-selector">
                  <button
                    type="button"
                    className={`acp-effects-mode-card ${effectsMode === 'preset' ? 'acp-effects-mode-card--selected' : ''}`}
                    onClick={() => setEffectsMode('preset')}
                  >
                    <span className="material-symbols-outlined">auto_awesome</span>
                    <span className="acp-effects-mode-card__label">إعدادات مسبقة</span>
                    <span className="acp-effects-mode-card__desc">اختر من الأنماط الجاهزة</span>
                  </button>
                  <button
                    type="button"
                    className={`acp-effects-mode-card ${effectsMode === 'manual' ? 'acp-effects-mode-card--selected' : ''}`}
                    onClick={() => setEffectsMode('manual')}
                  >
                    <span className="material-symbols-outlined">tune</span>
                    <span className="acp-effects-mode-card__label">تحكم يدوي</span>
                    <span className="acp-effects-mode-card__desc">تعديل كل فلتر على حدة</span>
                  </button>
                </div>

                {/* Preset mode: grid of preset cards */}
                {effectsMode === 'preset' && (
                  <div className="acp-presets-grid" id="effects-presets-grid">
                    {AUDIO_PRESETS.map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        className={`acp-preset-card ${selectedPresetId === preset.id ? 'acp-preset-card--selected' : ''}`}
                        onClick={() => setSelectedPresetId(selectedPresetId === preset.id ? null : preset.id)}
                      >
                        <span className="material-symbols-outlined acp-preset-card__icon">{preset.icon}</span>
                        <span className="acp-preset-card__label">{preset.label}</span>
                        <span className="acp-preset-card__desc">{preset.description}</span>
                        {selectedPresetId === preset.id && (
                          <span className="material-symbols-outlined acp-preset-card__check">check_circle</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}

                {/* Manual mode: filter rows with toggles and sliders */}
                {effectsMode === 'manual' && (
                  <div className="acp-filters-list" id="effects-filters-list">
                    {AUDIO_FILTERS.map((filterDef) => {
                      const setting = manualFilters.find(f => f.filterId === filterDef.id);
                      const isEnabled = setting?.enabled ?? false;
                      const intensity = setting?.intensity ?? filterDef.defaultIntensity;
                      return (
                        <div key={filterDef.id} className={`acp-filter-row ${isEnabled ? 'acp-filter-row--active' : ''}`}>
                          <div className="acp-filter-row__header">
                            <span className="material-symbols-outlined acp-filter-row__icon">{filterDef.icon}</span>
                            <div className="acp-filter-row__info">
                              <span className="acp-filter-row__label">{filterDef.label}</span>
                              <span className="acp-filter-row__desc">{filterDef.description}</span>
                            </div>
                            <button
                              type="button"
                              role="switch"
                              aria-checked={isEnabled}
                              className={`acp-toggle-switch acp-toggle-switch--sm ${isEnabled ? 'acp-toggle-switch--on' : ''}`}
                              onClick={() => updateFilter(filterDef.id, { enabled: !isEnabled })}
                            >
                              <span className="acp-toggle-switch__thumb" />
                            </button>
                          </div>
                          {isEnabled && (
                            <div className="acp-filter-row__slider">
                              <input
                                type="range"
                                min={0}
                                max={100}
                                value={intensity}
                                onChange={(e) => updateFilter(filterDef.id, { intensity: Number(e.target.value) })}
                                className="acp-range-slider"
                              />
                              <span className="acp-filter-row__value">{intensity}%</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Phase 8-L.1: Effects preview render button */}
                <div className="acp-render-preview-panel">
                  <button
                    type="button"
                    className="acp-btn acp-btn--accent acp-btn--sm"
                    onClick={() => renderPreview('effects')}
                    disabled={renderingStage === 'effects' || (editEnabled && getStagePreviewStatus('edit') !== 'ready')}
                  >
                    {renderingStage === 'effects' ? (
                      <><span className="material-symbols-outlined acp-spin">progress_activity</span> جاري معالجة المعاينة...</>
                    ) : getStagePreviewStatus('effects') === 'ready' ? (
                      <><span className="material-symbols-outlined">check_circle</span> ✓ المعاينة جاهزة — إعادة المعاينة</>
                    ) : getStagePreviewStatus('effects') === 'failed' ? (
                      <><span className="material-symbols-outlined">error</span> فشلت المعاينة — إعادة المحاولة</>
                    ) : getStagePreviewStatus('effects') === 'dirty' ? (
                      <><span className="material-symbols-outlined">warning</span> الإعدادات تغيرت — أعد المعاينة</>
                    ) : (
                      <><span className="material-symbols-outlined">play_circle</span> معاينة المؤثرات</>
                    )}
                  </button>
                  {editEnabled && getStagePreviewStatus('edit') !== 'ready' && (
                    <p className="acp-hint">يجب معاينة القص أولاً</p>
                  )}
                  {previewUrls.effects && (
                    <audio controls src={previewUrls.effects} className="acp-preview-audio" />
                  )}
                  {previewAssets.effects?.status === 'failed' && previewAssets.effects?.error && (
                    <p className="acp-error-text">{previewAssets.effects.error}</p>
                  )}
                </div>

                {/* Reset button */}
                <button type="button" className="acp-btn acp-btn--ghost acp-btn--sm" onClick={resetEffects}>
                  <span className="material-symbols-outlined" aria-hidden="true">restart_alt</span>
                  إعادة تعيين المؤثرات
                </button>
              </>
            )}

            {!effectsEnabled && (
              <p className="acp-hint">
                <span className="material-symbols-outlined acp-hint__icon" aria-hidden="true">info</span>
                لن يتم تطبيق أي مؤثرات صوتية. يمكنك تخطي هذه الخطوة.
              </p>
            )}

            <div className="acp-nav-row">
              <button className="acp-btn acp-btn--ghost" onClick={() => setStep(7)} type="button">
                <span className="material-symbols-outlined" aria-hidden="true">arrow_forward</span> رجوع
              </button>
              <button className="acp-btn acp-btn--primary" onClick={() => saveDraft(9)} disabled={saving} type="button">
                {effectsEnabled ? 'التالي' : 'تخطي'} <span className="material-symbols-outlined" aria-hidden="true">arrow_back</span>
              </button>
            </div>
          </div>
        </section>
      )}

      {/* ═══════════════ STEP 9: MIXING (GATED) ══════════════════ */}
      {step === 9 && (
        <section className="acp-section">
          <h1 className="acp-section__title">
            <span className="material-symbols-outlined" aria-hidden="true">graphic_eq</span>
            مكساج الصوت
            <span className="acp-badge acp-badge--optional">اختياري</span>
          </h1>
          <div className="acp-form">
            {/* Master enable toggle */}
            <div className="acp-fx-toggle-row">
              <div className="acp-fx-toggle-row__info">
                <span className="material-symbols-outlined">graphic_eq</span>
                <div>
                  <span className="acp-fx-toggle-row__title">تفعيل المكساج</span>
                  <span className="acp-fx-toggle-row__desc">اضبط طبقات الصوت والموسيقى قبل الحفظ</span>
                </div>
              </div>
              <label className="acp-toggle">
                <input type="checkbox" checked={mixingEnabled} onChange={e => setMixingEnabled(e.target.checked)} />
                <span className="acp-toggle__track" />
              </label>
            </div>

            {mixingEnabled && (
              <>
                {/* Track visualization */}
                <div className="acp-tracks">
                  {mixTracks.map(track => (
                    <div className="acp-track-row" key={track.id}>
                      <span className="acp-track-row__label">{track.label}</span>
                      <div
                        className={`acp-track-row__bar acp-track-row__bar--${track.type === 'voice' ? 'voice' : track.type === 'musicBed' ? 'music' : 'effects'}`}
                        style={{ width: `${Math.max(0, dbToPercent(track.volumeDb))}%`, opacity: track.muted ? 0.2 : 0.7 }}
                      />
                    </div>
                  ))}
                </div>

                {/* Layer tracks section */}
                <div className="acp-mix-layers">
                  <h3 className="acp-mix-layers__title">
                    <span className="material-symbols-outlined">layers</span> الطبقات
                  </h3>
                  {mixTracks.map(track => (
                    <div className="acp-mix-track-card" key={track.id}>
                      <div className="acp-mix-track-card__header">
                        <span className="acp-mix-track-card__name">{track.label}</span>
                        <div className="acp-mix-track-card__actions">
                          <button
                            className={`acp-mix-icon-btn ${track.muted ? 'acp-mix-icon-btn--active' : ''}`}
                            type="button"
                            onClick={() => updateMixTrack(track.id, { muted: !track.muted })}
                            title={track.muted ? 'إلغاء الكتم' : 'كتم'}
                          >
                            <span className="material-symbols-outlined">{track.muted ? 'volume_off' : 'volume_up'}</span>
                          </button>
                        </div>
                      </div>
                      <div className="acp-mix-track-card__slider">
                        <input
                          type="range"
                          className="acp-range-slider"
                          min={0}
                          max={130}
                          value={dbToPercent(track.volumeDb)}
                          onChange={e => updateMixTrack(track.id, { volumeDb: percentToDb(Number(e.target.value)) })}
                        />
                        <span className="acp-mix-track-card__value">{dbToPercent(track.volumeDb)}%</span>
                      </div>
                      {/* Source selector for non-voice tracks */}
                      {track.type === 'musicBed' && (
                        <div className="acp-mix-track-card__source">
                          {MUSIC_SOURCE_OPTIONS.map(opt => (
                            <button
                              key={opt.id}
                              className={`acp-playlist-card ${track.sourceType === opt.id ? 'acp-playlist-card--selected' : ''} ${!opt.available && opt.id !== 'none' ? 'acp-playlist-card--gated' : ''}`}
                              type="button"
                              onClick={() => opt.available ? updateMixTrack(track.id, { sourceType: opt.id as AudioMixTrack['sourceType'], enabled: opt.id !== 'none' }) : undefined}
                              disabled={!opt.available && opt.id !== 'none'}
                            >
                              <span className="material-symbols-outlined">{opt.icon}</span>
                              {opt.label}
                              {!opt.available && opt.id !== 'none' && <span className="acp-gate-badge">قريباً</span>}
                            </button>
                          ))}
                          {/* Music bed upload area */}
                          {track.sourceType === 'uploaded' && (
                            <div className="acp-music-upload">
                              <input ref={musicFileRef} type="file" accept="audio/*" style={{ display: 'none' }}
                                onChange={e => { const f = e.target.files?.[0]; if (f) handleMusicUpload(f); e.target.value = ''; }} />
                              {track.storagePath ? (
                                <>
                                  <div className="acp-music-upload__file-info">
                                    <span className="material-symbols-outlined">audio_file</span>
                                    {track.fileName || 'ملف موسيقى'}
                                  </div>
                                  {track.durationMs && <div className="acp-music-upload__meta">{formatDuration(track.durationMs)} · {track.sizeBytes ? formatFileSize(track.sizeBytes) : ''}</div>}
                                  <button type="button" className="acp-music-upload__remove" onClick={removeMusicUpload}>
                                    <span className="material-symbols-outlined" style={{ fontSize: '0.8rem' }}>delete</span> إزالة
                                  </button>
                                </>
                              ) : (
                                <button type="button" className="acp-sfx-add-btn" onClick={() => musicFileRef.current?.click()} disabled={musicUploading}>
                                  <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>{musicUploading ? 'hourglass_empty' : 'upload_file'}</span>
                                  {musicUploading ? `جاري الرفع... ${musicUploadProgress}%` : 'اختر ملف موسيقى'}
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                      {/* SFX track — show source selector but disable library */}
                      {track.type === 'sfx' && (
                        <div className="acp-mix-track-card__source">
                          {SFX_SOURCE_OPTIONS.map(opt => (
                            <button
                              key={opt.id}
                              className={`acp-playlist-card ${track.sourceType === opt.id ? 'acp-playlist-card--selected' : ''}`}
                              type="button"
                              onClick={() => opt.available && updateMixTrack(track.id, { sourceType: opt.id as AudioMixTrack['sourceType'], enabled: opt.id !== 'none' })}
                              disabled={!opt.available}
                            >
                              <span className="material-symbols-outlined">{opt.icon}</span>
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* ── Phase 8-L.1: SFX Items Section ─────────────────────── */}
                {mixTracks.some(t => t.type === 'sfx' && t.sourceType === 'uploaded') && (
                  <div className="acp-sfx-section">
                    <div className="acp-sfx-section__header">
                      <span className="acp-sfx-section__title">
                        <span className="material-symbols-outlined">music_note</span>
                        مؤثرات صوتية ({sfxItems.length}/{MAX_SFX_ITEMS})
                      </span>
                      <input ref={sfxFileRef} type="file" accept="audio/*" style={{ display: 'none' }}
                        onChange={e => { const f = e.target.files?.[0]; if (f) handleSfxUpload(f); e.target.value = ''; }} />
                      <button type="button" className="acp-sfx-add-btn"
                        onClick={() => sfxFileRef.current?.click()}
                        disabled={sfxItems.length >= MAX_SFX_ITEMS || sfxUploading}>
                        <span className="material-symbols-outlined" style={{ fontSize: '0.9rem' }}>{sfxUploading ? 'hourglass_empty' : 'add'}</span>
                        {sfxUploading ? 'جاري الرفع...' : 'إضافة مؤثر'}
                      </button>
                    </div>
                    {sfxItems.map(sfx => (
                      <div className="acp-sfx-card" key={sfx.id}>
                        <div className="acp-sfx-card__header">
                          <span className="acp-sfx-card__name">
                            <span className="material-symbols-outlined" style={{ fontSize: '0.9rem', verticalAlign: 'middle', marginLeft: '0.25rem' }}>audio_file</span>
                            {sfx.fileName}
                          </span>
                          <button type="button" className="acp-sfx-card__remove" onClick={() => removeSfxItem(sfx.id)} title="إزالة">
                            <span className="material-symbols-outlined">close</span>
                          </button>
                        </div>
                        <div className="acp-sfx-card__controls">
                          <div className="acp-sfx-card__field">
                            <span className="acp-sfx-card__field-label">التوقيت (دقيقة:ثانية.ملي ثانية)</span>
                            <input type="text" className="acp-sfx-card__time-input"
                              value={formatMsToTimeInput(sfx.startMs)}
                              onChange={e => updateSfxItem(sfx.id, { startMs: parseTimeInputToMs(e.target.value) })}
                              placeholder="00:00.000" />
                          </div>
                          <div className="acp-sfx-card__slider">
                            <span className="acp-sfx-card__field-label">الصوت</span>
                            <input type="range" className="acp-range-slider" min={-20} max={6}
                              value={sfx.volumeDb} onChange={e => updateSfxItem(sfx.id, { volumeDb: Number(e.target.value) })} />
                            <span className="acp-sfx-card__slider-value">{sfx.volumeDb > 0 ? '+' : ''}{sfx.volumeDb}dB</span>
                          </div>
                          <label className="acp-toggle acp-toggle--sm">
                            <input type="checkbox" checked={sfx.enabled} onChange={e => updateSfxItem(sfx.id, { enabled: e.target.checked })} />
                            <span className="acp-toggle__track" />
                          </label>
                        </div>
                      </div>
                    ))}
                    {sfxItems.length === 0 && (
                      <p className="acp-hint" style={{ textAlign: 'center' }}>
                        <span className="material-symbols-outlined acp-hint__icon">info</span>
                        ارفع ملفات مؤثرات صوتية وحدد التوقيت الدقيق لكل مؤثر
                      </p>
                    )}
                  </div>
                )}

                {/* Advanced tools */}
                <div className="acp-mix-advanced">
                  <h3 className="acp-mix-layers__title">
                    <span className="material-symbols-outlined">tune</span> أدوات متقدمة
                  </h3>
                  <div className="acp-mix-tools-grid">
                    {/* Auto-duck toggle */}
                    <div className="acp-mix-tool-card">
                      <div className="acp-mix-tool-card__header">
                        <span className="material-symbols-outlined">hearing</span>
                        <span>خفض الموسيقى</span>
                      </div>
                      <span className="acp-mix-tool-card__desc">تلقائياً أثناء الكلام</span>
                      <label className="acp-toggle acp-toggle--sm">
                        <input type="checkbox" checked={autoDuckEnabled} onChange={e => setAutoDuckEnabled(e.target.checked)} />
                        <span className="acp-toggle__track" />
                      </label>
                      {autoDuckEnabled && (
                        <span className="acp-mix-tool-card__note">
                          <span className="material-symbols-outlined" style={{ fontSize: '0.7rem' }}>schedule</span>
                          مؤجل — يتطلب مسار موسيقى
                        </span>
                      )}
                    </div>

                    {/* Fade In */}
                    <div className="acp-mix-tool-card">
                      <div className="acp-mix-tool-card__header">
                        <span className="material-symbols-outlined">signal_cellular_alt</span>
                        <span>Fade In</span>
                      </div>
                      <span className="acp-mix-tool-card__desc">تدرج دخول</span>
                      <div className="acp-mix-tool-card__control">
                        <input
                          type="range" className="acp-range-slider" min={0} max={5000} step={100}
                          value={masterFadeInMs} onChange={e => setMasterFadeInMs(Number(e.target.value))}
                        />
                        <span className="acp-mix-tool-card__value">{(masterFadeInMs / 1000).toFixed(1)}ث</span>
                      </div>
                    </div>

                    {/* Fade Out */}
                    <div className="acp-mix-tool-card">
                      <div className="acp-mix-tool-card__header">
                        <span className="material-symbols-outlined">signal_cellular_alt</span>
                        <span>Fade Out</span>
                      </div>
                      <span className="acp-mix-tool-card__desc">تدرج خروج</span>
                      <div className="acp-mix-tool-card__control">
                        <input
                          type="range" className="acp-range-slider" min={0} max={5000} step={100}
                          value={masterFadeOutMs} onChange={e => setMasterFadeOutMs(Number(e.target.value))}
                        />
                        <span className="acp-mix-tool-card__value">{(masterFadeOutMs / 1000).toFixed(1)}ث</span>
                      </div>
                    </div>

                    {/* Master Gain */}
                    <div className="acp-mix-tool-card">
                      <div className="acp-mix-tool-card__header">
                        <span className="material-symbols-outlined">volume_up</span>
                        <span>مستوى الماستر</span>
                      </div>
                      <span className="acp-mix-tool-card__desc">معايرة المستوى العام</span>
                      <div className="acp-mix-tool-card__control">
                        <input
                          type="range" className="acp-range-slider" min={-20} max={6}
                          value={masterGainDb} onChange={e => setMasterGainDb(Number(e.target.value))}
                        />
                        <span className="acp-mix-tool-card__value">{masterGainDb > 0 ? '+' : ''}{masterGainDb}dB</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Presets */}
                <div className="acp-mix-presets">
                  <h3 className="acp-mix-layers__title">
                    <span className="material-symbols-outlined">auto_awesome</span> قوالب جاهزة
                  </h3>
                  <div className="acp-chips">
                    {MIXING_PRESET_DEFS.map(preset => (
                      <button
                        key={preset.id}
                        className={`acp-chip ${selectedMixPresetId === preset.id ? 'acp-chip--active' : ''}`}
                        type="button"
                        onClick={() => applyMixPreset(preset.id)}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '0.85rem' }}>{preset.icon}</span>
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>

                <p className="acp-hint">
                  <span className="material-symbols-outlined acp-hint__icon" aria-hidden="true">info</span>
                  اضغط معاينة المكساج لسماع النتيجة قبل النشر. الملف الأصلي يبقى محفوظاً.
                </p>

                {/* Reset button */}
                <button className="acp-btn acp-btn--ghost acp-btn--sm" onClick={resetMixing} type="button">
                  <span className="material-symbols-outlined">restart_alt</span> إعادة ضبط
                </button>
              </>
            )}

            {/* Phase 8-L.1: Mixing preview render button */}
            {mixingEnabled && (
              <div className="acp-render-preview-panel">
                <button
                  type="button"
                  className="acp-btn acp-btn--accent acp-btn--sm"
                  onClick={() => renderPreview('mixing')}
                  disabled={renderingStage === 'mixing' || (effectsEnabled && getStagePreviewStatus('effects') !== 'ready') || (editEnabled && !effectsEnabled && getStagePreviewStatus('edit') !== 'ready')}
                >
                  {renderingStage === 'mixing' ? (
                    <><span className="material-symbols-outlined acp-spin">progress_activity</span> جاري معالجة المعاينة...</>
                  ) : getStagePreviewStatus('mixing') === 'ready' ? (
                    <><span className="material-symbols-outlined">check_circle</span> ✓ المعاينة جاهزة — إعادة المعاينة</>
                  ) : getStagePreviewStatus('mixing') === 'failed' ? (
                    <><span className="material-symbols-outlined">error</span> فشلت المعاينة — إعادة المحاولة</>
                  ) : getStagePreviewStatus('mixing') === 'dirty' ? (
                    <><span className="material-symbols-outlined">warning</span> الإعدادات تغيرت — أعد المعاينة</>
                  ) : (
                    <><span className="material-symbols-outlined">play_circle</span> معاينة المكساج</>
                  )}
                </button>
                {effectsEnabled && getStagePreviewStatus('effects') !== 'ready' && (
                  <p className="acp-hint">يجب معاينة المؤثرات أولاً</p>
                )}
                {!effectsEnabled && editEnabled && getStagePreviewStatus('edit') !== 'ready' && (
                  <p className="acp-hint">يجب معاينة القص أولاً</p>
                )}
                {previewUrls.mixing && (
                  <audio controls src={previewUrls.mixing} className="acp-preview-audio" />
                )}
                {previewAssets.mixing?.status === 'failed' && previewAssets.mixing?.error && (
                  <p className="acp-error-text">{previewAssets.mixing.error}</p>
                )}
              </div>
            )}

            <div className="acp-nav-row">
              <button className="acp-btn acp-btn--ghost" onClick={() => setStep(8)} type="button">
                <span className="material-symbols-outlined" aria-hidden="true">arrow_forward</span> رجوع
              </button>
              <button className="acp-btn acp-btn--primary" onClick={() => saveDraft(10)} disabled={saving} type="button">
                <span className="material-symbols-outlined" aria-hidden="true">{mixingEnabled ? 'save' : 'skip_previous'}</span>
                {saving ? 'جاري الحفظ...' : mixingEnabled ? 'حفظ المكساج' : 'تخطي'}
              </button>
            </div>
          </div>
        </section>
      )}

      {/* ═══════════════ STEP 10: FINAL PREVIEW ══════════════════ */}
      {step === 10 && (
        <section className="acp-section">
          <h1 className="acp-section__title">
            <span className="material-symbols-outlined" aria-hidden="true">visibility</span>
            المعاينة النهائية
          </h1>

          {/* Preview card with cover, play overlay, timer */}
          <div className="acp-preview-card">
            <div className="acp-preview-card__cover-wrap">
              {coverPreviewUrl ? (
                <img src={coverPreviewUrl} alt="غلاف" className="acp-preview-card__cover" />
              ) : (
                <div className="acp-preview-card__cover--default">
                  <span className="material-symbols-outlined">music_note</span>
                </div>
              )}
              {previewAudioUrl && (
                <>
                  <audio
                    ref={previewAudioRef}
                    src={previewAudioUrl}
                    onEnded={() => setPreviewPlaying(false)}
                    style={{ display: 'none' }}
                  />
                  <button
                    className={`acp-preview-card__play-overlay${previewPlaying ? ' acp-preview-card__play-overlay--playing' : ''}`}
                    onClick={togglePreviewPlayback}
                    type="button"
                    aria-label={previewPlaying ? 'إيقاف' : 'تشغيل'}
                  >
                    <span className="material-symbols-outlined">
                      {previewPlaying ? 'pause' : 'play_arrow'}
                    </span>
                  </button>
                </>
              )}
              {!previewAudioUrl && (
                <div className="acp-preview-card__play-overlay acp-preview-card__play-overlay--disabled">
                  <span className="material-symbols-outlined">play_arrow</span>
                </div>
              )}
              {audioAsset?.durationMs ? (
                <span className="acp-preview-card__timer-badge">{formatDuration(editEnabled ? editedDurationMs : audioAsset.durationMs)}</span>
              ) : null}
            </div>
            <div className="acp-preview-card__body">
              <h2 className="acp-preview-card__title">{title || 'بدون عنوان'}</h2>
              <p className="acp-preview-card__owner">{currentUser?.displayName || 'المؤلف'}</p>
              <div className="acp-preview-card__meta">
                <span className="acp-preview-card__badge">{WORLDS.find((w) => w.key === world)?.label}</span>
                <span className="acp-preview-card__badge">{(KINDS_BY_WORLD[world] ?? []).find((k) => k.key === kind)?.label}</span>
                {categoryId && <span className="acp-preview-card__badge">{CATEGORIES.find((c) => c.id === categoryId)?.label}</span>}
              </div>
            </div>
          </div>

          {/* Mini waveform + preview hint */}
          {waveformPeaks.length > 0 && (
            <div className="acp-preview-waveform-mini">
              <svg viewBox="0 0 200 32" preserveAspectRatio="none">
                {waveformPeaks.map((peak, i) => {
                  const barH = Math.max(1, peak * 24);
                  const y = 16 - barH / 2;
                  return <rect key={i} x={i} y={y} width={0.6} height={barH} rx={0.2} fill="url(#wfGradMini)" opacity={0.7} />;
                })}
                <defs>
                  <linearGradient id="wfGradMini" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#e5c76b" />
                    <stop offset="100%" stopColor="#22d3ee" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
          )}

          {(editEnabled || effectsEnabled || mixingEnabled) && (
            <div className="acp-render-preview-panel">
              {(() => {
                const previewUrl = getPreviewPlaybackUrl();
                const anyDirty = (editEnabled && getStagePreviewStatus('edit') !== 'ready') ||
                  (effectsEnabled && getStagePreviewStatus('effects') !== 'ready') ||
                  (mixingEnabled && getStagePreviewStatus('mixing') !== 'ready');
                return (
                  <>
                    {previewUrl ? (
                      <>
                        <div className="acp-waveform-hint">
                          <span className="material-symbols-outlined">check_circle</span>
                          المعاينة النهائية — هذا هو الصوت الذي سيتم نشره
                        </div>
                        <audio controls src={previewUrl} className="acp-preview-audio" />
                      </>
                    ) : (
                      <div className="acp-waveform-hint">
                        <span className="material-symbols-outlined">warning</span>
                        يجب معاينة كل مرحلة قبل النشر
                      </div>
                    )}
                    {anyDirty && (
                      <p className="acp-hint">
                        <span className="material-symbols-outlined acp-hint__icon">warning</span>
                        بعض المراحل تحتاج إعادة معاينة
                      </p>
                    )}
                  </>
                );
              })()}
            </div>
          )}

          {/* Preview tabs (visual only) */}
          <div className="acp-preview-tabs">
            <button className={`acp-preview-tab ${placementFeed === 'main' || placementFeed === 'both' ? 'acp-preview-tab--active' : ''}`} type="button">
              <span className="material-symbols-outlined">home</span> الرئيسية
            </button>
            <button className={`acp-preview-tab ${placementFeed === 'shorts' || placementFeed === 'both' ? 'acp-preview-tab--active' : ''}`} type="button">
              <span className="material-symbols-outlined">movie</span> لقطات
            </button>
          </div>

          {/* Bento grid — publish summary */}
          <div className="acp-bento-grid">
            <div className="acp-bento-cell">
              <div className="acp-bento-cell__label">
                <span className="material-symbols-outlined">public</span> نطاق النشر
              </div>
              <span className="acp-bento-cell__value">{WORLDS.find((w) => w.key === world)?.label}</span>
            </div>
            <div className="acp-bento-cell">
              <div className="acp-bento-cell__label">
                <span className="material-symbols-outlined">visibility</span> الخصوصية
              </div>
              <span className="acp-bento-cell__value">{AUDIENCE_OPTIONS.find((a) => a.key === audience)?.label}</span>
            </div>
            <div className="acp-bento-cell">
              <div className="acp-bento-cell__label">
                <span className="material-symbols-outlined">category</span> القسم
              </div>
              <span className="acp-bento-cell__value">{CATEGORIES.find((c) => c.id === categoryId)?.label || '—'}</span>
            </div>
            <div className="acp-bento-cell">
              <div className="acp-bento-cell__label">
                <span className="material-symbols-outlined">segment</span> القسم الفرعي
              </div>
              <span className="acp-bento-cell__value">{SUBCATEGORIES_BY_CATEGORY[categoryId]?.find((s) => s.id === subcategoryId)?.label || '—'}</span>
            </div>
            <div className="acp-bento-cell">
              <div className="acp-bento-cell__label">
                <span className="material-symbols-outlined">face</span> العمر المناسب
              </div>
              <span className="acp-bento-cell__value">{ageSuitability === 'everyone' ? 'الجميع' : ageSuitability === 'teen' ? '+13' : '+18'}</span>
            </div>
            <div className="acp-bento-cell">
              <div className="acp-bento-cell__label">
                <span className="material-symbols-outlined">language</span> البلد
              </div>
              <span className="acp-bento-cell__value">{countryMode === 'all' ? 'جميع الدول' : countryCodes || '—'}</span>
            </div>
          </div>

          {/* Status chips */}
          <div className="acp-status-chips">
            <span className={`acp-status-chip ${captionsEnabled ? 'acp-status-chip--ok' : 'acp-status-chip--skip'}`}>
              <span className="material-symbols-outlined">{captionsEnabled ? 'check_circle' : 'skip_next'}</span>
              الكابشن: {captionsEnabled ? 'جاهز' : 'تم التخطي'}
            </span>
            <span className={`acp-status-chip ${coverAsset ? 'acp-status-chip--ok' : 'acp-status-chip--skip'}`}>
              <span className="material-symbols-outlined">{coverAsset ? 'check_circle' : 'image'}</span>
              الغلاف: {coverAsset ? 'جاهز' : 'افتراضي'}
            </span>
            <span className={`acp-status-chip ${effectsEnabled ? 'acp-status-chip--ok' : 'acp-status-chip--skip'}`}>
              <span className="material-symbols-outlined">{effectsEnabled ? 'check_circle' : 'skip_next'}</span>
              المؤثرات: {effectsEnabled
                ? (effectsMode === 'preset' && selectedPresetId
                    ? AUDIO_PRESETS.find(p => p.id === selectedPresetId)?.label ?? 'إعداد مسبق'
                    : effectsMode === 'manual'
                      ? `${manualFilters.filter(f => f.enabled).length} فلاتر`
                      : 'مفعّل')
                : 'تم التخطي'}
            </span>
            <span className={`acp-status-chip ${mixingEnabled ? 'acp-status-chip--done' : 'acp-status-chip--skip'}`}>
              <span className="material-symbols-outlined">{mixingEnabled ? 'graphic_eq' : 'skip_next'}</span>
              {mixingEnabled
                ? `المكساج: ${selectedMixPresetId
                    ? MIXING_PRESET_DEFS.find(p => p.id === selectedMixPresetId)?.label || 'مخصص'
                    : 'ضبط يدوي'}`
                : 'المكساج: تم التخطي'}
            </span>
            <span className={`acp-status-chip ${editEnabled ? 'acp-status-chip--done' : 'acp-status-chip--skip'}`}>
              <span className="material-symbols-outlined">{editEnabled ? 'content_cut' : 'skip_next'}</span>
              {editEnabled
                ? `القص: ${formatDuration(editedDurationMs)}`
                : 'القص: تم التخطي'}
            </span>
          </div>

          {/* Safety / review checklist */}
          <div className="acp-safety-list">
            <h3 className="acp-safety-list__title">قائمة التحقق</h3>
            <div className="acp-safety-item">
              <span className="material-symbols-outlined">check</span>
              المحتوى يتوافق مع سياسة الاستخدام
            </div>
            <div className="acp-safety-item">
              <span className="material-symbols-outlined">check</span>
              لا يحتوي على مواد محمية بحقوق ملكية
            </div>
            <div className="acp-safety-item">
              <span className="material-symbols-outlined">check</span>
              الفئة العمرية مناسبة للمحتوى
            </div>
          </div>

          {/* Edit-back links */}
          <div className="acp-editback">
            <h3 className="acp-editback__title">تعديل الأقسام</h3>
            <div className="acp-editback__links">
              <button className="acp-editback__link" onClick={() => setStep(1)}><span className="material-symbols-outlined">edit_note</span> المعلومات</button>
              <button className="acp-editback__link" onClick={() => setStep(2)}><span className="material-symbols-outlined">tune</span> تفاصيل النشر</button>
              <button className="acp-editback__link" onClick={() => setStep(3)}><span className="material-symbols-outlined">image</span> الغلاف</button>
              <button className="acp-editback__link" onClick={() => setStep(4)}><span className="material-symbols-outlined">subtitles</span> الترجمة</button>
              <button className="acp-editback__link" onClick={() => setStep(5)}><span className="material-symbols-outlined">teleprompter</span> الملقن</button>
              <button className="acp-editback__link" onClick={() => { setAudioAsset(null); uploader.reset(); recorder.reset(); setStep(6); }}><span className="material-symbols-outlined">mic</span> التسجيل</button>
            </div>
          </div>

          {/* Bottom navigation */}
          <div className="acp-nav-row">
            <button className="acp-btn acp-btn--ghost" onClick={() => setStep(9)} type="button">
              <span className="material-symbols-outlined" aria-hidden="true">arrow_forward</span> رجوع
            </button>
            <button className="acp-btn acp-btn--primary" onClick={() => saveDraft(11)} disabled={saving} type="button">
              {saving ? <><span className="acp-spinner" aria-hidden="true" /> حفظ...</> : <><span className="material-symbols-outlined" aria-hidden="true">publish</span> تأكيد النشر</>}
            </button>
          </div>
        </section>
      )}

      {/* ═══════════════ STEP 11: REVIEW DETAILS ═════════════════ */}
      {step === 11 && (
        <section className="acp-section">
          <h1 className="acp-section__title">
            <span className="material-symbols-outlined" aria-hidden="true">fact_check</span>
            مراجعة التفاصيل والنشر
          </h1>
          <div className="acp-form">
            {/* ── Readiness checklist ──────────────────────────────── */}
            <div className="acp-checklist">
              <div className={`acp-checklist__item ${title ? 'acp-checklist__item--ok' : 'acp-checklist__item--fail'}`}>
                <span className="material-symbols-outlined">{title ? 'check_circle' : 'cancel'}</span> العنوان
              </div>
              <div className={`acp-checklist__item ${audioAsset ? 'acp-checklist__item--ok' : 'acp-checklist__item--fail'}`}>
                <span className="material-symbols-outlined">{audioAsset ? 'check_circle' : 'cancel'}</span> الملف الصوتي
              </div>
              <div className={`acp-checklist__item ${coverAsset ? 'acp-checklist__item--ok' : 'acp-checklist__item--warn'}`}>
                <span className="material-symbols-outlined">{coverAsset ? 'check_circle' : 'info'}</span> الغلاف {!coverAsset && '(افتراضي)'}
              </div>
            </div>

            {/* ── Info card ────────────────────────────────────────── */}
            <div className="acp-rd-card">
              <h3 className="acp-rd-card__title"><span className="material-symbols-outlined">edit_note</span> المعلومات</h3>
              <div className="acp-rd-card__row"><span>العنوان:</span> <strong>{title || '—'}</strong></div>
              {caption && <div className="acp-rd-card__row"><span>الوصف:</span> {caption}</div>}
              <div className="acp-rd-card__row"><span>العالم:</span> {WORLDS.find((w) => w.key === world)?.label}</div>
              <div className="acp-rd-card__row"><span>النوع:</span> {(KINDS_BY_WORLD[world] ?? []).find((k) => k.key === kind)?.label}</div>
            </div>

            {/* ── Publish Details card ─────────────────────────────── */}
            <div className="acp-rd-card">
              <h3 className="acp-rd-card__title"><span className="material-symbols-outlined">tune</span> تفاصيل النشر</h3>
              <div className="acp-rd-card__row"><span>التصنيف:</span> {CATEGORIES.find((c) => c.id === categoryId)?.label || '— لم يُحدد —'}</div>
              {subcategoryId && <div className="acp-rd-card__row"><span>الفرعي:</span> {SUBCATEGORIES_BY_CATEGORY[categoryId]?.find((s) => s.id === subcategoryId)?.label || '—'}</div>}
              <div className="acp-rd-card__row"><span>الوسوم:</span> {tags || '— بدون وسوم —'}</div>
              <div className="acp-rd-card__row"><span>اللغة:</span> {LANGUAGES.find((l) => l.code === language)?.label}</div>
              <div className="acp-rd-card__row"><span>الدول:</span> {countryMode === 'all' ? 'جميع الدول' : countryCodes || '—'}</div>
              <div className="acp-rd-card__row"><span>الفئة العمرية:</span> {ageSuitability === 'everyone' ? 'الجميع' : ageSuitability === 'teen' ? '+13 مراهقين' : '+18 بالغين'}</div>
              <div className="acp-rd-card__row"><span>محتوى صريح:</span> {isExplicit ? 'نعم' : 'لا'}</div>
              <div className="acp-rd-card__row"><span>محتوى أطفال:</span> {isChildContent ? 'نعم' : 'لا'}</div>
              <div className="acp-rd-card__row"><span>موضع النشر:</span> {placementFeed === 'main' ? 'الرئيسية' : placementFeed === 'shorts' ? 'لقطات' : 'كلاهما'}</div>
            </div>

            {/* ── Audience card ────────────────────────────────────── */}
            <div className="acp-rd-card">
              <h3 className="acp-rd-card__title"><span className="material-symbols-outlined">group</span> الجمهور والإعدادات</h3>
              <div className="acp-rd-card__row"><span>الجمهور:</span> {AUDIENCE_OPTIONS.find((a) => a.key === audience)?.label}</div>
              <div className="acp-rd-card__row">
                <span>التعليقات:</span>
                <span className="material-symbols-outlined" style={{ color: commentsEnabled ? '#22c55e' : '#ef4444' }}>{commentsEnabled ? 'check_circle' : 'cancel'}</span>
                {commentsEnabled ? 'مسموحة' : 'مغلقة'}
              </div>
              <div className="acp-rd-card__row">
                <span>الهدايا:</span>
                <span className="material-symbols-outlined" style={{ color: giftsEnabled ? '#22c55e' : '#ef4444' }}>{giftsEnabled ? 'check_circle' : 'cancel'}</span>
                {giftsEnabled ? 'مسموحة' : 'مغلقة'}
              </div>
              <div className="acp-rd-card__row">
                <span>المشاركة:</span>
                <span className="material-symbols-outlined" style={{ color: sharingEnabled ? '#22c55e' : '#ef4444' }}>{sharingEnabled ? 'check_circle' : 'cancel'}</span>
                {sharingEnabled ? 'مسموحة' : 'مغلقة'}
              </div>
            </div>

            {/* ── Cover card ───────────────────────────────────────── */}
            <div className="acp-rd-card">
              <h3 className="acp-rd-card__title"><span className="material-symbols-outlined">image</span> الغلاف</h3>
              <div className="acp-rd-card__row">
                <span>الحالة:</span>
                {coverAsset ? (
                  <>
                    <span className="material-symbols-outlined" style={{ color: '#22c55e' }}>
                      {coverAsset.sourceType === 'uploaded' ? 'image' : coverAsset.sourceType === 'ai' ? 'auto_awesome' : 'image'}
                    </span>
                    {coverAsset.sourceType === 'uploaded' ? 'صورة مرفوعة' : coverAsset.sourceType === 'ai' ? 'غلاف ذكي (مقفل)' : 'مرفوع'}
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined">image</span>
                    افتراضي — لم يُرفق غلاف
                  </>
                )}
              </div>
            </div>

            {/* ── Captions card ────────────────────────────────────── */}
            <div className="acp-rd-card">
              <h3 className="acp-rd-card__title"><span className="material-symbols-outlined">subtitles</span> الترجمة</h3>
              <div className="acp-rd-card__row">
                <span>الحالة:</span>
                <span className="material-symbols-outlined" style={{ color: captionsEnabled ? '#22c55e' : '#94a3b8' }}>
                  {captionsEnabled ? 'check_circle' : 'skip_next'}
                </span>
                {captionsEnabled ? 'مفعّلة' : 'تم التخطي'}
              </div>
              {captionsEnabled && <div className="acp-rd-card__row"><span>اللغة:</span> {LANGUAGES.find((l) => l.code === captionLang)?.label}</div>}
              {captionsEnabled && <div className="acp-rd-card__row"><span>النمط:</span> {captionStyle === 'standard' ? 'عادي' : captionStyle === 'karaoke' ? 'كاريوكي' : 'ترجمة سفلية'}</div>}
            </div>

            {/* ── AutoCue card ─────────────────────────────────────── */}
            <div className="acp-rd-card">
              <h3 className="acp-rd-card__title"><span className="material-symbols-outlined">teleprompter</span> الملقن</h3>
              <div className="acp-rd-card__row">
                <span>الحالة:</span>
                <span className="material-symbols-outlined" style={{ color: autoCueEnabled ? '#22c55e' : '#94a3b8' }}>
                  {autoCueEnabled ? 'check_circle' : 'skip_next'}
                </span>
                {autoCueEnabled ? 'مفعّل' : 'تم التخطي'}
              </div>
              {autoCueEnabled && (
                <>
                  <div className="acp-rd-card__row"><span>مصدر النص:</span> يدوي</div>
                  <div className="acp-rd-card__row"><span>السرعة:</span> {scrollSpeed === 'slow' ? 'بطيء' : scrollSpeed === 'medium' ? 'متوسط' : 'سريع'}</div>
                  <div className="acp-rd-card__row"><span>حجم الخط:</span> {fontSize === 'small' ? 'صغير' : fontSize === 'medium' ? 'متوسط' : 'كبير'}</div>
                  <div className="acp-rd-card__row"><span>وضع القراءة:</span> {readingMode === 'lineByLine' ? 'سطر بسطر' : 'فقرة بفقرة'}</div>
                  <div className="acp-rd-card__row"><span>تأخير البداية:</span> {startDelay} ثوان</div>
                  <div className="acp-rd-card__row"><span>تمييز السطر:</span> {highlightLine ? 'مفعّل' : 'معطّل'}</div>
                  {scriptText && <div className="acp-rd-card__row acp-rd-card__row--script"><span>معاينة النص:</span> <em>{scriptText.length > 120 ? scriptText.slice(0, 120) + '...' : scriptText}</em></div>}
                </>
              )}
            </div>

            {/* ── Audio card ───────────────────────────────────────── */}
            <div className="acp-rd-card">
              <h3 className="acp-rd-card__title"><span className="material-symbols-outlined">mic</span> الصوت</h3>
              {audioAsset ? (
                <>
                  <div className="acp-rd-card__row"><span>الملف:</span> {audioAsset.originalFileName}</div>
                  <div className="acp-rd-card__row">
                    <span>المصدر:</span>
                    <span className="material-symbols-outlined">{audioAsset.sourceType === 'recorded' ? 'mic' : 'upload_file'}</span>
                    {audioAsset.sourceType === 'recorded' ? 'مسجّل' : 'مرفوع'}
                  </div>
                  {audioAsset.durationMs ? <div className="acp-rd-card__row"><span>المدة:</span> {formatDuration(audioAsset.durationMs)}</div> : null}
                  {audioAsset.sizeBytes ? <div className="acp-rd-card__row"><span>الحجم:</span> {formatFileSize(audioAsset.sizeBytes)}</div> : null}
                  <div className="acp-rd-card__row"><span>النوع:</span> {audioAsset.mimeType}</div>
                </>
              ) : (
                <div className="acp-rd-card__row acp-rd-card__row--warn">
                  <span className="material-symbols-outlined">cancel</span> لا يوجد ملف صوتي — لا يمكن النشر.
                </div>
              )}
            </div>

            {/* ── Effects & Mixing card ────────────────────────────── */}
            <div className="acp-rd-card">
              <h3 className="acp-rd-card__title"><span className="material-symbols-outlined">tune</span> المؤثرات والمكساج</h3>
              <div className="acp-rd-card__row">
                <span>المؤثرات:</span>
                {effectsEnabled ? (
                  <>
                    <span className="material-symbols-outlined" style={{ color: 'var(--accent-teal, #2dd4bf)' }}>check_circle</span>
                    {effectsMode === 'preset' && selectedPresetId
                      ? AUDIO_PRESETS.find(p => p.id === selectedPresetId)?.label ?? 'إعداد مسبق'
                      : effectsMode === 'manual'
                        ? `${manualFilters.filter(f => f.enabled).length} فلاتر يدوية`
                        : 'مفعّل'}
                    <span className="acp-hint" style={{ fontSize: '0.75rem', display: 'block', marginTop: '0.25rem' }}>
                      المعاينة متاحة
                    </span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined" style={{ color: '#94a3b8' }}>skip_next</span>
                    تم التخطي — لم يتم تطبيق أي معالجة
                  </>
                )}
              </div>
              <div className="acp-rd-card__row">
                <span>المكساج:</span>
                {mixingEnabled ? (
                  <>
                    <span className="material-symbols-outlined" style={{ color: 'var(--accent-teal, #2dd4bf)' }}>check_circle</span>
                    {selectedMixPresetId
                      ? MIXING_PRESET_DEFS.find(p => p.id === selectedMixPresetId)?.label ?? 'مخصص'
                      : 'ضبط يدوي'}
                    <span className="acp-hint" style={{ fontSize: '0.75rem', display: 'block', marginTop: '0.25rem' }}>
                      صوتك: {dbToPercent(mixTracks.find(t => t.type === 'voice')?.volumeDb ?? 0)}%
                      {masterFadeInMs > 0 && ` · Fade In: ${(masterFadeInMs/1000).toFixed(1)}ث`}
                      {masterFadeOutMs > 0 && ` · Fade Out: ${(masterFadeOutMs/1000).toFixed(1)}ث`}
                      {masterGainDb !== 0 && ` · ماستر: ${masterGainDb > 0 ? '+' : ''}${masterGainDb}dB`}
                      {autoDuckEnabled && ' · خفض تلقائي (مؤجل)'}
                      {mixTracks.find(t => t.type === 'musicBed' && t.storagePath) && ` · موسيقى: ${mixTracks.find(t => t.type === 'musicBed')?.fileName || 'مرفوعة'}`}
                      {sfxItems.length > 0 && ` · مؤثرات: ${sfxItems.filter(s => s.enabled).length} مؤثر`}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined" style={{ color: '#94a3b8' }}>skip_next</span>
                    تم التخطي — لم يتم تطبيق أي خلط
                  </>
                )}
              </div>
              <div className="acp-rd-card__row">
                <span>القص والتعديل:</span>
                {editEnabled ? (
                  <>
                    <span className="material-symbols-outlined" style={{ color: 'var(--accent-teal, #2dd4bf)' }}>check_circle</span>
                    قص مفعّل
                    <span className="acp-hint" style={{ fontSize: '0.75rem', display: 'block', marginTop: '0.25rem' }}>
                      {trimStartMs > 0 && `بداية: ${formatDuration(trimStartMs)}`}
                      {trimStartMs > 0 && (trimEndMs > 0 || editCuts.length > 0) && ' · '}
                      {trimEndMs > 0 && trimEndMs < originalDurationMs && `نهاية: ${formatDuration(trimEndMs)}`}
                      {trimEndMs > 0 && editCuts.length > 0 && ' · '}
                      {editCuts.length > 0 && `${editCuts.length} مقطع محذوف`}
                      {` · المدة: ${formatDuration(editedDurationMs)}`}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined" style={{ color: '#94a3b8' }}>skip_next</span>
                    لم يتم تطبيق أي قص
                  </>
                )}
              </div>
            </div>

            {/* ── Moderation notice ────────────────────────────────── */}
            <div className="acp-publish-notice">
              <span className="material-symbols-outlined" aria-hidden="true">gavel</span>
              <p>بالنشر، أنت توافق على أن المحتوى يتوافق مع سياسة الاستخدام. المحتوى قد يخضع لمراجعة فريق الإشراف قبل الظهور العلني.</p>
            </div>
            {publishError && <p className="acp-error">{publishError}</p>}
            <div className="acp-nav-row">
              <button className="acp-btn acp-btn--ghost" onClick={() => setStep(10)} type="button">
                <span className="material-symbols-outlined" aria-hidden="true">arrow_forward</span> رجوع
              </button>
              <button className="acp-btn acp-btn--primary acp-btn--lg" onClick={handlePublish} disabled={publishing || !audioAsset} type="button">
                {publishing ? <><span className="acp-spinner" aria-hidden="true" /> جاري النشر...</> : <><span className="material-symbols-outlined" aria-hidden="true">publish</span> نشر المحتوى</>}
              </button>
            </div>
          </div>
        </section>
      )}

      {/* ═══════════════ STEP 12: PUBLISH RESULT ═════════════════ */}
      {step === 12 && publishResult && (
        <section className="acp-section">
          {/* Hero section with animated ping */}
          <div className="acp-publish-hero">
            <div className="acp-publish-hero__icon-wrap">
              <span className="acp-publish-hero__ping" />
              <span className="material-symbols-outlined">check_circle</span>
            </div>
            <h2>تم إرسال الصوت</h2>
            <p className="acp-publish-hero__subtitle">سنخبرك بحالة النشر فوراً</p>
          </div>

          {/* Status card */}
          <div className="acp-status-card">
            <span className="acp-status-card__badge">
              <span className="material-symbols-outlined">hourglass_empty</span>
              قيد المراجعة
            </span>
            <p className="acp-status-card__desc">
              تم استلام المحتوى بنجاح. سيتم مراجعته وفقاً لسياسة الاستخدام قبل النشر العلني.
            </p>
            <div className="acp-reason-chips">
              {categoryId && <span className="acp-reason-chip">{CATEGORIES.find((c) => c.id === categoryId)?.label}</span>}
              <span className="acp-reason-chip">{ageSuitability === 'everyone' ? 'الجميع' : ageSuitability === 'teen' ? '+13' : '+18'}</span>
              <span className="acp-reason-chip">{WORLDS.find((w) => w.key === world)?.label}</span>
              <span className="acp-reason-chip">مراجعة تلقائية</span>
            </div>
          </div>

          {/* Post summary card */}
          <div className="acp-post-summary">
            {coverPreviewUrl ? (
              <img src={coverPreviewUrl} alt="غلاف" className="acp-post-summary__cover" />
            ) : (
              <div className="acp-post-summary__cover--default">
                <span className="material-symbols-outlined">music_note</span>
              </div>
            )}
            <div className="acp-post-summary__body">
              <h3 className="acp-post-summary__title">{title || 'بدون عنوان'}</h3>
              <div className="acp-post-summary__meta">
                {audioAsset?.durationMs ? (
                  <span className="acp-post-summary__meta-item">
                    <span className="material-symbols-outlined">schedule</span>
                    {formatDuration(audioAsset.durationMs)}
                  </span>
                ) : null}
                <span className="acp-post-summary__meta-item">
                  <span className="material-symbols-outlined">{captionsEnabled ? 'subtitles' : 'subtitles_off'}</span>
                  {captionsEnabled ? 'ترجمة' : 'بدون ترجمة'}
                </span>
                <span className="acp-post-summary__meta-item">
                  <span className="material-symbols-outlined">{AUDIENCE_OPTIONS.find((a) => a.key === audience)?.icon || 'visibility'}</span>
                  {AUDIENCE_OPTIONS.find((a) => a.key === audience)?.label}
                </span>
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div className="acp-timeline">
            <div className="acp-timeline__step acp-timeline__step--done">
              <div className="acp-timeline__dot"><span className="material-symbols-outlined">check</span></div>
              <div className="acp-timeline__info"><p className="acp-timeline__info-label">تم رفع الملف الصوتي</p></div>
            </div>
            <div className="acp-timeline__step acp-timeline__step--done">
              <div className="acp-timeline__dot"><span className="material-symbols-outlined">check</span></div>
              <div className="acp-timeline__info"><p className="acp-timeline__info-label">تم حفظ البيانات</p></div>
            </div>
            <div className="acp-timeline__step acp-timeline__step--active">
              <div className="acp-timeline__dot"><span className="material-symbols-outlined">hourglass_empty</span></div>
              <div className="acp-timeline__info"><p className="acp-timeline__info-label">جاري الفحص والمعالجة</p></div>
            </div>
            <div className="acp-timeline__step acp-timeline__step--pending">
              <div className="acp-timeline__dot"><span className="material-symbols-outlined">schedule</span></div>
              <div className="acp-timeline__info"><p className="acp-timeline__info-label">النشر العلني</p></div>
            </div>
          </div>

          {/* Info note */}
          <div className="acp-publish-notice acp-publish-notice--info">
            <span className="material-symbols-outlined" aria-hidden="true">info</span>
            <p>بعض الحسابات تتمتع بميزة النشر الفوري. حالة النشر يمكن متابعتها من صفحة المحتوى.</p>
          </div>

          {/* Action buttons */}
          <div className="acp-nav-row" style={{ justifyContent: 'center' }}>
            <button className="acp-btn acp-btn--primary" onClick={() => navigate(`/audio/${publishResult.contentId}`)} type="button">
              <span className="material-symbols-outlined" aria-hidden="true">play_circle</span> عرض المسودة
            </button>
            <button className="acp-btn acp-btn--ghost" onClick={() => navigate(-1)} type="button">
              <span className="material-symbols-outlined" aria-hidden="true">arrow_forward</span> رجوع
            </button>
            <button className="acp-btn acp-btn--ghost" onClick={() => navigate('/create/audio')} type="button">
              <span className="material-symbols-outlined" aria-hidden="true">add</span> إنشاء محتوى جديد
            </button>
          </div>
        </section>
      )}
    </main>
  );
}
