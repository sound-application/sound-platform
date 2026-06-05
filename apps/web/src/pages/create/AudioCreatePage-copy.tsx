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

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useCategories } from '../../hooks/useCategories';
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
  callCreatePlaylist,
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

const useAudioOptions = (t: any) => {
  const WORLDS: { key: string; label: string }[] = [
    { key: 'general', label: t('world_general', 'عام') },
    { key: 'plus', label: t('world_plus', 'بلس') },
    { key: 'music', label: t('world_music', 'موسيقى') }
  ];

  const KINDS_BY_WORLD: Record<string, { key: any; label: string }[]> = {
    general: [
      { key: 'shortAudio', label: t('kind_shortAudio', 'مقطع قصير') },
      { key: 'longAudio', label: t('kind_longAudio', 'صوت طويل') },
      { key: 'podcast', label: t('kind_podcast', 'بودكاست') }
    ],
    plus: [
      { key: 'shortAudio', label: t('kind_shortAudio', 'مقطع قصير') },
      { key: 'longAudio', label: t('kind_longAudio', 'صوت طويل') },
      { key: 'podcast', label: t('kind_podcast', 'بودكاست') }
    ],
    music: [
      { key: 'song', label: t('kind_song', 'أغنية') },
      { key: 'albumTrack', label: t('kind_album_track', 'مقطع ألبوم') }
    ]
  };

  const CATEGORIES = [
    { id: 'culture', label: t('cat_culture', 'ثقافة') },
    { id: 'entertainment', label: t('cat_entertainment', 'ترفيه') },
    { id: 'education', label: t('cat_education', 'تعليم') },
    { id: 'religion', label: t('cat_religion', 'ديني') },
    { id: 'sports', label: t('cat_sports', 'رياضة') },
    { id: 'news', label: t('cat_news', 'أخبار') },
    { id: 'technology', label: t('cat_technology', 'تقنية') },
    { id: 'other', label: t('cat_other', 'أخرى') },
  ];

  const SUBCATEGORIES_BY_CATEGORY: Record<string, { id: string; label: string }[]> = {
    culture: [
      { id: 'creativity', label: t('subcat_creativity', 'إبداع وهدوء') },
      { id: 'visual_arts', label: t('subcat_visual_arts', 'فنون بصرية') },
      { id: 'literature', label: t('subcat_literature', 'أدب وشعر') },
    ],
    entertainment: [
      { id: 'comedy', label: t('subcat_comedy', 'كوميديا') },
      { id: 'drama', label: t('subcat_drama', 'دراما') },
      { id: 'talk_shows', label: t('subcat_talk_shows', 'برامج حوارية') },
    ],
    education: [
      { id: 'science', label: t('subcat_science', 'علوم') },
      { id: 'technology', label: t('subcat_technology_edu', 'تقنية') },
      { id: 'languages', label: t('subcat_languages', 'لغات') },
    ],
    religion: [
      { id: 'quran', label: t('subcat_quran', 'قرآن') },
      { id: 'lectures', label: t('subcat_lectures', 'دروس ومحاضرات') },
      { id: 'stories', label: t('subcat_stories', 'قصص دينية') },
    ],
    sports: [
      { id: 'football', label: t('subcat_football', 'كرة قدم') },
      { id: 'fitness', label: t('subcat_fitness', 'لياقة وصحة') },
      { id: 'analysis', label: t('subcat_analysis', 'تحليل رياضي') },
    ],
    news: [
      { id: 'local', label: t('subcat_local', 'محلي') },
      { id: 'international', label: t('subcat_international', 'دولي') },
      { id: 'economy', label: t('subcat_economy', 'اقتصاد') },
    ],
    technology: [
      { id: 'ai', label: t('subcat_ai', 'ذكاء اصطناعي') },
      { id: 'programming', label: t('subcat_programming', 'برمجة') },
      { id: 'reviews', label: t('subcat_reviews', 'مراجعات') },
    ],
  };

  const AUDIENCE_OPTIONS: { key: AudienceType; label: string; icon: string }[] = [
    { key: 'public', label: t('audience_public', 'عام — الجميع'), icon: 'visibility' },
    { key: 'followers', label: t('audience_followers', 'المتابعون فقط'), icon: 'group' },
    { key: 'following', label: t('audience_following', 'من أتابعهم فقط'), icon: 'person_add' },
    { key: 'friends', label: t('audience_friends', 'الأصدقاء فقط'), icon: 'handshake' },
    { key: 'specificList', label: t('audience_specificList', 'قائمة محددة'), icon: 'list' },
    { key: 'listExcept', label: t('audience_listExcept', 'الجميع عدا قائمة'), icon: 'block' },
    { key: 'selectedPeople', label: t('audience_selectedPeople', 'أشخاص مختارون'), icon: 'person_search' },
    { key: 'onlyMe', label: t('audience_onlyMe', 'أنا فقط'), icon: 'person' },
  ];

  const LANGUAGES = [
    { code: 'ar', label: t('lang_ar', 'العربية') },
    { code: 'en', label: 'English' },
    { code: 'fr', label: 'Français' },
    { code: 'es', label: 'Español' },
    { code: 'other', label: t('lang_other', 'أخرى') },
  ];

  const MUSIC_SOURCE_OPTIONS = [
    { id: 'none', label: t('music_none', 'بدون موسيقى'), icon: 'music_off', available: true },
    { id: 'uploaded', label: t('music_uploaded', 'رفع من الجهاز'), icon: 'upload_file', available: true },
    { id: 'library', label: t('music_library', 'مكتبة Sound'), icon: 'library_music', available: false },
  ];

  const SFX_SOURCE_OPTIONS = [
    { id: 'none', label: t('sfx_none', 'بدون مؤثرات'), icon: 'music_off', available: true },
    { id: 'uploaded', label: t('sfx_uploaded', 'رفع من الجهاز'), icon: 'upload_file', available: true },
    { id: 'library', label: t('sfx_library', 'مكتبة ساوند — قريباً'), icon: 'library_music', available: false },
  ];

  return { WORLDS, KINDS_BY_WORLD, CATEGORIES, SUBCATEGORIES_BY_CATEGORY, AUDIENCE_OPTIONS, LANGUAGES, MUSIC_SOURCE_OPTIONS, SFX_SOURCE_OPTIONS };
};

/** Max SFX items — configurable, generous default */
const MAX_SFX_ITEMS = 50;

/** Format ms to mm:ss.mmm for SFX and Trim timing display */
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

const TimeInputControl = ({ valueMs, onChange }: { valueMs: number; onChange: (ms: number) => void }) => {
  const [localStr, setLocalStr] = useState<string | null>(null);
  
  useEffect(() => {
    setLocalStr(formatMsToTimeInput(valueMs));
  }, [valueMs]);

  return (
    <input
      type="text"
      dir="ltr"
      className="acp-input acp-input--sm"
      style={{ width: '90px', fontFamily: 'monospace', textAlign: 'center' }}
      value={localStr !== null ? localStr : formatMsToTimeInput(valueMs)}
      onChange={e => setLocalStr(e.target.value)}
      onBlur={() => {
        if (localStr) onChange(parseTimeInputToMs(localStr));
      }}
      onKeyDown={e => {
        if (e.key === 'Enter' && localStr) {
          onChange(parseTimeInputToMs(localStr));
          e.currentTarget.blur();
        }
      }}
      placeholder="00:00.000"
    />
  );
};

// ── Page Component ───────────────────────────────────────────────────────────

export function AudioCreatePage() {
  const { t, i18n } = useTranslation('audiocreate');
  const { WORLDS, KINDS_BY_WORLD, CATEGORIES, SUBCATEGORIES_BY_CATEGORY, AUDIENCE_OPTIONS, LANGUAGES, MUSIC_SOURCE_OPTIONS, SFX_SOURCE_OPTIONS } = useAudioOptions(t);
  const { currentUser } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const uid = currentUser?.uid ?? '';

  const iconNext = i18n.dir() === 'rtl' ? 'arrow_back' : 'arrow_forward';
  const iconPrev = i18n.dir() === 'rtl' ? 'arrow_forward' : 'arrow_back';

  const STEP_LABELS: Record<number, string> = {
    1: t('step1_info', 'المعلومات'),
    2: t('step2_publish', 'تفاصيل النشر'),
    3: t('step3_cover', 'الغلاف'),
    4: t('step4_captions', 'الترجمة'),
    5: t('step5_prompter', 'الملقن'),
    6: t('step6_recording', 'التسجيل'),
    7: t('step7_review', 'المراجعة'),
    8: t('step8_effects', 'المؤثرات'),
    9: t('step9_mixing', 'المكساج'),
    10: t('step10_preview', 'المعاينة'),
    11: t('step11_confirm', 'التأكيد'),
    12: t('step12_result', 'النتيجة'),
  };



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

  const { categoryOptions, getSubcategoryOptions } = useCategories(world);

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

  useEffect(() => {
    if (currentUser && !playlistsLoaded && !playlistsLoading) {
      setPlaylistsLoading(true);
      callGetUserPlaylists({})
        .then((res: any) => {
          setUserPlaylists(res.data.playlists || []);
          setPlaylistsLoaded(true);
        })
        .catch(() => {
          setUserPlaylists([]);
          setPlaylistsLoaded(true);
        })
        .finally(() => {
          setPlaylistsLoading(false);
        });
    }
  }, [currentUser, playlistsLoaded, playlistsLoading, callGetUserPlaylists]);
  const [playlistDropdownOpen, setPlaylistDropdownOpen] = useState(false);
  const [newPlaylistVisibility, setNewPlaylistVisibility] = useState<AudienceType>('public');
  const [privacyDropdownOpen, setPrivacyDropdownOpen] = useState(false);
  const [playlistCreating, setPlaylistCreating] = useState(false);
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
  const [isCutsSaved, setIsCutsSaved] = useState(true); // Phase 8-L.2 Guard

  // Phase 8-L.1: Client-side waveform + preview playback
  const [waveformPeaks, setWaveformPeaks] = useState<number[]>([]);
  const [waveformLoading, setWaveformLoading] = useState(false);
  const waveformAudioRef = useRef<HTMLAudioElement>(null);
  const [wfPlaying, setWfPlaying] = useState(false);
  const [wfCurrentMs, setWfCurrentMs] = useState(0);
  const [waveformDurationMs, setWaveformDurationMs] = useState<number | null>(null);
  const wfAnimRef = useRef<number>(0);
  const [wfDragging, setWfDragging] = useState(false);
  const [wfHoverMs, setWfHoverMs] = useState<number | null>(null);
  const [wfHoverX, setWfHoverX] = useState(0);
  const waveformTimelineRef = useRef<HTMLDivElement>(null);

  const originalDurationMs = audioAsset?.durationMs || 0;

  // ── Phase 8-L.1: Draft Render Pipeline Preview ──────────────────────────
  const [previewAssets, setPreviewAssets] = useState<Partial<AudioDraftPreviewAssets>>({});
  const [renderingStage, setRenderingStage] = useState<PreviewStage | null>(null);
  const [previewUrls, setPreviewUrls] = useState<Record<string, string>>({});

  //  Phase 8-L.2: Sequential Audio Handoff 
  // Determine which audio the user is currently working on based on the step.
  const getWorkingAudioUrl = () => {
    // In Mixing (Step 9), the "base" is Effects output.
    if (step >= 9 && previewUrls.effects) return previewUrls.effects;
    // In Effects (Step 8), the "base" is Edit output.
    if (step >= 8 && previewUrls.edit) return previewUrls.edit;
    // In Edit (Step 7), or if previews don't exist, we work on the original audio.
    return recorder.audioUrl || (selectedFile ? URL.createObjectURL(selectedFile) : null);
  };

  const workingDurationMs = useMemo(() => {
    if (step >= 9 && previewAssets.effects?.durationMs) return previewAssets.effects.durationMs;
    if (step >= 8 && previewAssets.edit?.durationMs) return previewAssets.edit.durationMs;
    return originalDurationMs;
  }, [step, previewAssets.edit?.durationMs, previewAssets.effects?.durationMs, originalDurationMs]);

  /** Call backend to render a stage preview. Returns playback URL. */
  const renderPreview = async (stage: PreviewStage) => {
    if (!draftId) return;
    setRenderingStage(stage);
    try {
      // MAJOR FIX: Ensure all current config states are pushed to backend BEFORE telling the backend to render them!
      const payload = {
        editConfig: buildEditConfig(),
        effectsConfig: buildEffectsConfig(),
        mixingConfig: buildMixingConfig(),
      };
      await callUpdateAudioDraft({ draftId, ...payload });

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

  /** Get the best preview playback URL.
   * If any stage is enabled, only return a rendered preview URL.
   * Fall back to original audio ONLY when no stages are enabled.
   */
  const getPreviewPlaybackUrl = (): string | null => {
    const anyStageEnabled = editEnabled || effectsEnabled || mixingEnabled;
    // Check rendered previews in priority order
    if (mixingEnabled && previewUrls.mixing) return previewUrls.mixing;
    if (effectsEnabled && previewUrls.effects) return previewUrls.effects;
    if (editEnabled && previewUrls.edit) return previewUrls.edit;
    // If any stage is enabled but no preview URL exists, return null (render required)
    if (anyStageEnabled) return null;
    // No stages enabled — original audio is the preview
    return recorder.audioUrl || (selectedFile ? URL.createObjectURL(selectedFile) : null);
  };

  const getStagePreviewStatus = (stage: PreviewStage): PreviewStatus => {
    return (previewAssets[stage]?.status as PreviewStatus) || 'idle';
  };

  /** Estimate edited duration given trim + cuts */
  const estimateEditedDuration = (origDur: number, tStart: number, tEnd: number, cuts: AudioCutSegment[]): number => {
    const effectiveEnd = tEnd > 0 && tEnd < origDur ? tEnd : origDur;
    const effectiveStart = tStart > 0 ? Math.min(tStart, effectiveEnd) : 0;
    let duration = effectiveEnd - effectiveStart;
    
    // Merge overlapping cuts first so they don't exponentially shrink the duration
    const sortedCuts = [...cuts].sort((a, b) => a.startMs - b.startMs);
    const mergedCuts: {startMs: number, endMs: number}[] = [];
    
    for (const cut of sortedCuts) {
      if (mergedCuts.length === 0) {
        mergedCuts.push({startMs: cut.startMs, endMs: cut.endMs});
      } else {
        const last = mergedCuts[mergedCuts.length - 1];
        if (cut.startMs <= last!.endMs) {
          last!.endMs = Math.max(last!.endMs, cut.endMs);
        } else {
          mergedCuts.push({startMs: cut.startMs, endMs: cut.endMs});
        }
      }
    }

    for (const cut of mergedCuts) {
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
    setIsCutsSaved(false);
    const cutLen = Math.min(5000, Math.floor(originalDurationMs / 4));
    
    // Place new cuts after existing cuts to prevent exact overlaps
    let startPoint = Math.floor(originalDurationMs / 2) - Math.floor(cutLen / 2);
    if (editCuts.length > 0) {
      const maxEnd = Math.max(...editCuts.map(c => c.endMs));
      startPoint = maxEnd + 1000; // Place 1 second after the last cut
      if (startPoint + cutLen > originalDurationMs) {
        startPoint = 0; // Wrap to beginning if we run out of space
      }
    }
    
    setEditCuts(prev => [...prev, {
      id: `cut_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      startMs: Math.max(0, startPoint),
      endMs: Math.min(originalDurationMs, startPoint + cutLen),
    }]);
  };

  const removeCut = (cutId: string) => {
    setIsCutsSaved(false);
    setEditCuts(prev => prev.filter(c => c.id !== cutId));
  };

  const updateCut = (cutId: string, updates: Partial<AudioCutSegment>) => {
    setIsCutsSaved(false);
    setEditCuts(prev => prev.map(c => c.id === cutId ? { ...c, ...updates } : c));
  };

  const resetEdits = () => {
    setEditEnabled(false);
    setTrimStartMs(0);
    setTrimEndMs(0);
    setEditCuts([]);
    setIsCutsSaved(true);
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
    const audioUrl = getWorkingAudioUrl();
    if (!audioUrl) { setWaveformPeaks([]); return; }
    let cancelled = false;
    const needsRevoke = audioUrl.startsWith('blob:');
    setWaveformLoading(true);
    (async () => {
      try {
        const resp = await fetch(audioUrl);
        const buf = await resp.arrayBuffer();
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const decoded = await ctx.decodeAudioData(buf);
        if (cancelled) { ctx.close(); return; }
        setWaveformDurationMs(decoded.duration * 1000);
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
  }, [step, previewUrls.edit, previewUrls.effects, recorder.audioUrl, selectedFile]);

  // ── Trim/cut-aware playback (client-side preview) ──────────────────────────
  const effectiveStart = (step === 7 && editEnabled && trimStartMs > 0) ? trimStartMs : 0;
  const effectiveEnd = (step === 7 && editEnabled && trimEndMs > 0 && trimEndMs < originalDurationMs) ? trimEndMs : (waveformDurationMs || workingDurationMs);

  /** Check if a given ms is inside a cut region */
  const isInsideCut = useCallback((ms: number): AudioCutSegment | null => {
    if (step !== 7 || !editEnabled) return null;
    for (const cut of editCuts) {
      if (ms >= cut.startMs && ms < cut.endMs) return cut;
    }
    return null;
  }, [step, editEnabled, editCuts]);

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
    if (!audio || step !== 7 || !editEnabled) return;
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
  }, [step, editEnabled, effectiveEnd, isInsideCut]);

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
        // Fire-and-forget update to improve navigation speed
        callUpdateAudioDraft({ draftId, ...payload }).catch(err => {
          console.error('Background save error:', err);
        });
        setStep(nextStep);
      } else {
        const result = await callCreateAudioDraft(payload);
        setDraftId(result.data.draftId);
        setStep(nextStep);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t('draftSaveFailed', 'فشل حفظ المسودة.');
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
      setFileError(t('fileMustBeAudio', 'يجب أن يكون الملف من نوع صوتي (audio/*).'));
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
        // Reset trim and cuts when a new audio file is attached to prevent out-of-bounds ghost cuts
        const resetEditConfig = { trimStartMs: 0, trimEndMs: 0, cuts: [], enabled: false };
        await callUpdateAudioDraft({ draftId, audioAsset: asset, editConfig: resetEditConfig, currentStep: '7' });
        setAudioAsset(asset);
        setTrimStartMs(0);
        setTrimEndMs(0);
        setEditCuts([]);
        setEditEnabled(false);
        setIsCutsSaved(false);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : t('attachFailed', 'فشل ربط الملف الصوتي بالمسودة.');
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
      setCoverError(t('saveDraftFirstForCover', 'يجب حفظ المسودة أولاً لرفع الغلاف.'));
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
        setCoverError(err.message || t('coverUploadFailed', 'فشل رفع الغلاف.'));
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
      // Force a final synchronous save to ensure all edit/mixing/effects payloads are committed
      // before the backend publish function reads the draft. This fixes the race condition where
      // rapid clicks on "Next -> Publish" could cause the publish to read the old draft.
      const finalPayload = {
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
        publishToggles: { commentsEnabled, giftsEnabled, sharingEnabled },
        coverAsset: coverAsset ?? undefined,
        captionsSetup: { enabled: captionsEnabled, language: captionLang, style: captionStyle },
        autoCue: {
          enabled: autoCueEnabled,
          scriptText: scriptText || undefined,
          scriptSource: 'manual' as const,
          scrollSpeed,
          fontSize,
          readingMode,
          startDelaySec: startDelay,
          highlightCurrentLine: highlightLine,
        },
        effectsConfig: buildEffectsConfig(),
        mixingConfig: buildMixingConfig(),
        editConfig: buildEditConfig(),
      };
      await callUpdateAudioDraft({ draftId, ...finalPayload });

      const result = await callPublishAudioContent({ draftId, deleteDraftAfterPublish: false });
      setPublishResult({ contentId: result.data.contentId, status: result.data.status });
      setStep(12);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t('publishFailed', 'فشل النشر.');
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
    <main className="page acp-page" dir={i18n.dir()}>
      {/* ── Step rail ───────────────────────────────────────────────── */}
      <nav className="acp-rail" aria-label={t('creationSteps')}>
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
            {t('audioContentInformation')}
          </h1>
          <div className="acp-form">
            <label className="acp-label">
              {t('theAddress')} <span className="acp-required">*</span>
              <input type="text" className="acp-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t('titleOfRecordingOrEpisode')} maxLength={200} autoFocus />
            </label>
            <label className="acp-label">
              {t('descriptionClarification')}
              <textarea className="acp-textarea" value={caption} onChange={(e) => setCaption(e.target.value)} placeholder={t('briefDescription')} maxLength={1000} rows={3} />
            </label>
            <label className="acp-label">
              {t('world1')}
              <div className="acp-chips">
                {WORLDS.map((w) => (
                  <button key={w.key} className={`acp-chip ${world === w.key ? 'acp-chip--selected' : ''}`} onClick={() => setWorld(w.key as WorldId)} type="button">{w.label}</button>
                ))}
              </div>
            </label>
            <label className="acp-label">
              {t('typeOfContent')}
              <div className="acp-chips">
                {(KINDS_BY_WORLD[world] ?? []).map((k) => (
                  <button key={k.key} className={`acp-chip ${kind === k.key ? 'acp-chip--selected' : ''}`} onClick={() => setKind(k.key as AudioContentKind)} type="button">{k.label}</button>
                ))}
              </div>
            </label>
            {saveError && <p className="acp-error">{saveError}</p>}
            <button className="acp-btn acp-btn--primary" onClick={() => { if (!title.trim()) { setSaveError(t('addressIsRequired')); return; } saveDraft(2); }} disabled={saving || !title.trim()}>
              {saving ? <><span className="acp-spinner" aria-hidden="true" /> {t('saving')}</> : <><span className="material-symbols-outlined" aria-hidden="true">{iconNext}</span> {t('theNext')}</>}
            </button>
          </div>
        </section>
      )}

      {/* ═══════════════ STEP 2: PUBLISH DETAILS ═══════════════════ */}
      {step === 2 && (
        <section className="acp-section">
          <h1 className="acp-section__title">
            <span className="material-symbols-outlined" aria-hidden="true">tune</span>
            {t('publicationDetails')}
          </h1>
          <div className="acp-form">
            {/* Category — glass dropdown */}
            <div className="acp-label">
              {t('classification')}
              <div className="acp-glass-dropdown">
                <button className="acp-glass-dropdown__trigger" onClick={() => { setCategoryOpen(!categoryOpen); setSubcategoryOpen(false); }} type="button">
                  <span>{categoryId ? categoryOptions.find((c) => c.id === categoryId)?.label : t('chooseACategory')}</span>
                  <span className="material-symbols-outlined">{categoryOpen ? 'expand_less' : 'expand_more'}</span>
                </button>
                {categoryOpen && (
                  <div className="acp-glass-dropdown__menu">
                    {categoryOptions.map((c) => (
                      <button key={c.id} className={`acp-glass-dropdown__option ${categoryId === c.id ? 'acp-glass-dropdown__option--selected' : ''}`} onClick={() => { setCategoryId(c.id); setCategoryOpen(false); }} type="button">{c.label}</button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Subcategory — glass dropdown, only when category selected */}
            {categoryId && getSubcategoryOptions(categoryId).length > 0 && (
              <div className="acp-label">
                {t('subclassification')}
                <div className="acp-glass-dropdown">
                  <button className="acp-glass-dropdown__trigger" onClick={() => { setSubcategoryOpen(!subcategoryOpen); setCategoryOpen(false); }} type="button">
                    <span>{subcategoryId ? getSubcategoryOptions(categoryId)?.find((s) => s.id === subcategoryId)?.label : t('chooseASubcategory')}</span>
                    <span className="material-symbols-outlined">{subcategoryOpen ? 'expand_less' : 'expand_more'}</span>
                  </button>
                  {subcategoryOpen && (
                    <div className="acp-glass-dropdown__menu">
                      {getSubcategoryOptions(categoryId).map((sc) => (
                        <button key={sc.id} className={`acp-glass-dropdown__option ${subcategoryId === sc.id ? 'acp-glass-dropdown__option--selected' : ''}`} onClick={() => { setSubcategoryId(sc.id); setSubcategoryOpen(false); }} type="button">{sc.label}</button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            <label className="acp-label">
              {t('tagsSeparatedByCommas')}
              <input type="text" className="acp-input" value={tags} onChange={(e) => setTags(e.target.value)} placeholder={t('podcastTechnologyDialogue')} />
            </label>

            {/* Language — glass dropdown */}
            <div className="acp-label">
              {t('language')}
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
              {t('targetCountries')}
              <div className="acp-chips">
                {(['all', 'one', 'upToFour'] as CountryMode[]).map((m) => (
                  <button key={m} className={`acp-chip ${countryMode === m ? 'acp-chip--selected' : ''}`} onClick={() => setCountryMode(m)} type="button">
                    {m === 'all' ? t('allCountries') : m === 'one' ? t('oneCountry') : t('upToCountries')}
                  </button>
                ))}
              </div>
            </label>
            {countryMode !== 'all' && (
              <label className="acp-label">
                {t('countryCodesSeparatedByCommas')}
                <input type="text" className="acp-input" value={countryCodes} onChange={(e) => setCountryCodes(e.target.value)} placeholder="SA, AE, EG, KW" maxLength={20} />
              </label>
            )}

            {/* Age suitability */}
            <label className="acp-label">
              {t('ageGroup')}
              <div className="acp-chips">
                {([{ k: 'everyone' as const, l: t('generalEveryone') }, { k: 'teen' as const, l: t('teenagers13') }, { k: 'mature' as const, l: t('adults18') }]).map((a) => (
                  <button key={a.k} className={`acp-chip ${ageSuitability === a.k ? 'acp-chip--selected' : ''}`} onClick={() => setAgeSuitability(a.k)} type="button">{a.l}</button>
                ))}
              </div>
            </label>

            <label className="acp-label acp-label--row">
              <input type="checkbox" checked={isExplicit} onChange={(e) => setIsExplicit(e.target.checked)} />
              {t('explicitContentExplicit')}
            </label>

            {/* Child content toggle */}
            <div className="acp-toggle-row">
              <span className="material-symbols-outlined">child_care</span>
              <span>{t('kidsContent')}</span>
              <button className={`acp-toggle ${isChildContent ? 'acp-toggle--on' : ''}`} onClick={() => setIsChildContent(!isChildContent)} type="button">
                <span className="acp-toggle__knob" />
              </button>
            </div>

            {/* Audience — card list with icons */}
            <div className="acp-label">
              {t('audiencePrivacy')}
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
              {t('publishingLocation', 'موضع النشر')}
              <div className="acp-cards-row">
                <button className={`acp-card-btn ${placementFeed === 'main' ? 'acp-card-btn--selected' : ''}`} onClick={() => setPlacementFeed('main')} type="button">
                  <span className="material-symbols-outlined">home</span>
                  <span>{t('main', 'الرئيسية')}</span>
                </button>
                <button className={`acp-card-btn ${placementFeed === 'shorts' ? 'acp-card-btn--selected' : ''}`} onClick={() => setPlacementFeed('shorts')} type="button">
                  <span className="material-symbols-outlined">movie</span>
                  <span>{t('shots', 'لقطات')}</span>
                </button>
              </div>
            </div>

            {/* Playlist intent (Phase 8-I) */}
            <div className="acp-label">
              {t('playlist', 'قائمة التشغيل')}
              <div className="acp-playlist-cards">
                <button className={`acp-playlist-card ${playlistIntent === 'none' ? 'acp-playlist-card--selected' : ''}`} onClick={() => { setPlaylistIntent('none'); setSelectedPlaylistId(''); setNewPlaylistName(''); setPlaylistDropdownOpen(false); }} type="button">
                  <span className="material-symbols-outlined">playlist_remove</span>
                  {t('withoutAMenu', 'بدون قائمة')}
                </button>
                <button className={`acp-playlist-card ${playlistIntent === 'existing' ? 'acp-playlist-card--selected' : ''}`} onClick={async () => { setPlaylistIntent('existing'); setNewPlaylistName(''); if (!playlistsLoaded && !playlistsLoading) { setPlaylistsLoading(true); try { const res = await callGetUserPlaylists({}); setUserPlaylists(res.data.playlists || []); setPlaylistsLoaded(true); } catch { setUserPlaylists([]); setPlaylistsLoaded(true); } finally { setPlaylistsLoading(false); } } setPlaylistDropdownOpen(true); }} type="button">
                  <span className="material-symbols-outlined">playlist_add</span>
                  {t('addToExistingPlaylist', 'إضافة لقائمة موجودة')}
                </button>
                <button className={`acp-playlist-card ${playlistIntent === 'new' ? 'acp-playlist-card--selected' : ''}`} onClick={() => { setPlaylistIntent('new'); setSelectedPlaylistId(''); setPlaylistDropdownOpen(false); }} type="button">
                  <span className="material-symbols-outlined">queue_music</span>
                  {t('createNewPlaylist', 'إنشاء قائمة جديدة')}
                </button>
              </div>

              {/* Existing playlist dropdown */}
              {playlistIntent === 'existing' && (
                <div className="acp-playlist-select">
                  {playlistsLoading ? (
                    <div className="acp-playlist-loading">
                      <span className="material-symbols-outlined acp-spin">progress_activity</span>
                      <span>{t('loadingPlaylists', 'جارٍ تحميل القوائم...')}</span>
                    </div>
                  ) : userPlaylists.length === 0 ? (
                    <div className="acp-playlist-empty">
                      <span className="material-symbols-outlined">info</span>
                      <span>{t('noPlaylistsYet', 'لا توجد قوائم تشغيل بعد. يمكنك إنشاء قائمة جديدة.')}</span>
                    </div>
                  ) : (
                    <div className="acp-glass-dropdown">
                      <button className="acp-glass-dropdown__trigger" onClick={() => setPlaylistDropdownOpen(!playlistDropdownOpen)} type="button">
                        <span>{selectedPlaylistId ? userPlaylists.find(p => p.playlistId === selectedPlaylistId)?.title || t('unknownPlaylist', 'قائمة غير معروفة') : t('selectPlaylist', 'اختر قائمة تشغيل...')}</span>
                        <span className="material-symbols-outlined">{playlistDropdownOpen ? 'expand_less' : 'expand_more'}</span>
                      </button>
                      {playlistDropdownOpen && (
                        <div className="acp-glass-dropdown__menu">
                          {userPlaylists.map((pl) => (
                            <button key={pl.playlistId} className={`acp-glass-dropdown__option ${selectedPlaylistId === pl.playlistId ? 'acp-glass-dropdown__option--selected' : ''}`} onClick={() => { setSelectedPlaylistId(pl.playlistId); setPlaylistDropdownOpen(false); }} type="button">
                              <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>queue_music</span>
                              <span className="acp-playlist-item-info">
                                <span className="acp-playlist-item-title">{pl.title}</span>
                                <span className="acp-playlist-item-meta">{pl.itemCount} {t('segment', 'مقطع')} · {pl.visibility === 'public' ? t('public', 'عامة') : t('private', 'خاصة')}</span>
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
                    placeholder={t('newPlaylistNamePlaceholder', 'اسم القائمة الجديدة...')}
                    value={newPlaylistName}
                    onChange={(e) => setNewPlaylistName(e.target.value)}
                    maxLength={80}
                    autoFocus
                  />
                  <div className="acp-playlist-new-actions" style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                    <div className="acp-glass-dropdown" style={{ flex: 1, position: 'relative' }}>
                      <button className="acp-glass-dropdown__trigger" onClick={() => setPrivacyDropdownOpen(!privacyDropdownOpen)} type="button" style={{ width: '100%' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '1.2rem', color: 'inherit' }}>{AUDIENCE_OPTIONS.find(a => a.key === newPlaylistVisibility)?.icon || 'visibility'}</span>
                        <span style={{ flex: 1, textAlign: 'start' }}>{AUDIENCE_OPTIONS.find(a => a.key === newPlaylistVisibility)?.label || t('public', 'عام')}</span>
                        <span className="material-symbols-outlined">{privacyDropdownOpen ? 'expand_less' : 'expand_more'}</span>
                      </button>
                      {privacyDropdownOpen && (
                        <div className="acp-glass-dropdown__menu" style={{ width: '100%', top: 'calc(100% + 4px)', position: 'absolute', zIndex: 10 }}>
                          {AUDIENCE_OPTIONS.map((a) => (
                            <button
                              key={a.key}
                              className={`acp-glass-dropdown__option ${newPlaylistVisibility === a.key ? 'acp-glass-dropdown__option--selected' : ''}`}
                              onClick={() => { setNewPlaylistVisibility(a.key); setPrivacyDropdownOpen(false); }}
                              type="button"
                            >
                              <span className="material-symbols-outlined" style={{ fontSize: '1.2rem' }}>{a.icon}</span>
                              {a.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    <button 
                      className="acp-btn acp-btn--primary"
                      disabled={playlistCreating || !newPlaylistName.trim()}
                      onClick={async () => {
                        if (!newPlaylistName.trim()) return;
                        setPlaylistCreating(true);
                        try {
                          const visibilityMapped = newPlaylistVisibility === 'public' ? 'public' : 'private';
                          const res = await callCreatePlaylist({
                            title: newPlaylistName.trim(),
                            visibility: visibilityMapped as any
                          });
                          const newPl = {
                            playlistId: res.data.playlistId,
                            title: newPlaylistName.trim(),
                            visibility: visibilityMapped,
                            itemCount: 0,
                            ownerUid: uid,
                            source: 'creator',
                            createdAt: Date.now(),
                            updatedAt: Date.now()
                          } as any;
                          setUserPlaylists([newPl, ...userPlaylists]);
                          setSelectedPlaylistId(res.data.playlistId);
                          setPlaylistIntent('existing');
                        } catch (err) {
                          console.error('Failed to create playlist', err);
                        } finally {
                          setPlaylistCreating(false);
                        }
                      }}
                      type="button"
                      style={{ minWidth: '100px', display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}
                    >
                      {playlistCreating ? <span className="acp-spinner" /> : <><span className="material-symbols-outlined">save</span> {t('save', 'حفظ')}</>}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="acp-toggles-group">
              <h3 className="acp-toggles-group__title">{t('publishSettings', 'إعدادات النشر')}</h3>
              <label className="acp-label acp-label--row"><input type="checkbox" checked={commentsEnabled} onChange={(e) => setCommentsEnabled(e.target.checked)} /> {t('allowComments', 'السماح بالتعليقات')}</label>
              <label className="acp-label acp-label--row"><input type="checkbox" checked={giftsEnabled} onChange={(e) => setGiftsEnabled(e.target.checked)} /> {t('allowGifts', 'السماح بالهدايا')}</label>
              <label className="acp-label acp-label--row"><input type="checkbox" checked={sharingEnabled} onChange={(e) => setSharingEnabled(e.target.checked)} /> {t('allowSharing', 'السماح بالمشاركة')}</label>

              {/* Schedule — disabled with gate badge */}
              <div className="acp-toggle-row" style={{ opacity: 0.5, cursor: 'not-allowed' }}>
                <span className="material-symbols-outlined">schedule_send</span>
                <span>{t('schedulePublish', 'جدولة النشر')}</span>
                <span className="acp-gate-badge">{t('byTier', 'حسب الباقة')}</span>
                <button className="acp-toggle acp-toggle--disabled" disabled type="button">
                  <span className="acp-toggle__knob" />
                </button>
              </div>
            </div>

            {saveError && <p className="acp-error">{saveError}</p>}
            <div className="acp-nav-row">
              <button className="acp-btn acp-btn--ghost" onClick={() => setStep(1)} type="button">
                <span className="material-symbols-outlined" aria-hidden="true">{iconPrev}</span> {t('back', 'رجوع')}
              </button>
              <button className="acp-btn acp-btn--primary" onClick={() => saveDraft(3)} disabled={saving}>
                {saving ? <><span className="acp-spinner" aria-hidden="true" /> {t('saving', 'جاري الحفظ...')}</> : <><span className="material-symbols-outlined" aria-hidden="true">{iconNext}</span> {t('theNext', 'التالي')}</>}
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
            {t('contentCover', 'غلاف المحتوى')}
            <span className="acp-badge acp-badge--optional">{t('optional', 'اختياري')}</span>
          </h1>
          <div className="acp-form">
            {coverPreviewUrl && (
              <div className="acp-cover-preview">
                <img src={coverPreviewUrl} alt={t('coverPreview', 'معاينة الغلاف')} className="acp-cover-preview__img" />
              </div>
            )}
            {coverUploading && (
              <div className="acp-progress">
                <div className="acp-progress__bar">
                  <div className="acp-progress__fill" style={{ width: `${coverProgress}%` }} />
                </div>
                <p className="acp-progress__text">{t('uploadingCover', 'جاري رفع الغلاف...')} {coverProgress}%</p>
              </div>
            )}
            {coverError && <p className="acp-error">{coverError}</p>}
            {coverAsset?.storagePath && !coverUploading && (
              <p className="acp-hint">
                <span className="material-symbols-outlined acp-hint__icon" aria-hidden="true">check_circle</span>
                {t('coverUploadedSuccessfully', 'تم رفع الغلاف بنجاح.')}
              </p>
            )}
            <div className="acp-cover-actions">
              <button className="acp-btn acp-btn--outline" onClick={() => coverInputRef.current?.click()} type="button" disabled={coverUploading}>
                <span className="material-symbols-outlined" aria-hidden="true">upload</span> {coverUploading ? t('uploading', 'جاري الرفع...') : t('uploadImage', 'رفع صورة')}
              </button>
              <input ref={coverInputRef} type="file" accept="image/*" onChange={handleCoverSelect} className="acp-file-input" tabIndex={-1} />
              <button className="acp-btn acp-btn--outline acp-btn--gated" disabled type="button">
                <span className="material-symbols-outlined" aria-hidden="true">photo_camera</span> {t('camera', 'كاميرا')}
                <span className="acp-gate-badge">{t('soon', 'قريباً')}</span>
              </button>
              <button className="acp-btn acp-btn--outline acp-btn--gated" disabled type="button">
                <span className="material-symbols-outlined" aria-hidden="true">auto_awesome</span> {t('smartCoverAI', 'غلاف ذكي (AI)')}
                <span className="acp-gate-badge">{t('paid', 'مدفوع')}</span>
              </button>
            </div>
            {!coverPreviewUrl && (
              <p className="acp-hint">{t('defaultCoverWillBeUsed', 'سيتم استخدام غلاف افتراضي إذا تخطيت هذه الخطوة.')}</p>
            )}
            <div className="acp-nav-row">
              <button className="acp-btn acp-btn--ghost" onClick={() => setStep(2)} type="button">
                <span className="material-symbols-outlined" aria-hidden="true">{iconPrev}</span> {t('back', 'رجوع')}
              </button>
              <button className="acp-btn acp-btn--ghost" onClick={() => setStep(4)} type="button">{t('skip', 'تخطي')}</button>
              <button className="acp-btn acp-btn--primary" onClick={() => saveDraft(4)} disabled={saving || coverUploading}>
                {saving ? t('savingDots', 'حفظ...') : t('theNext', 'التالي')}
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
            {t('captionsSetup', 'إعداد الترجمة والنصوص')}
            <span className="acp-badge acp-badge--optional">{t('optional', 'اختياري')}</span>
          </h1>
          <div className="acp-form">
            <label className="acp-label acp-label--row acp-toggle-main">
              <input type="checkbox" checked={captionsEnabled} onChange={(e) => setCaptionsEnabled(e.target.checked)} />
              <span>{t('enableCaptions', 'تفعيل النصوص / الترجمة')}</span>
            </label>
            {captionsEnabled && (
              <>
                {/* Caption source mode selector */}
                <label className="acp-label">{t('captionSource', 'مصدر النص')}</label>
                <div className="acp-chips">
                  {([
                    { k: 'manual' as CaptionSource, l: t('manualInput', 'كتابة يدوية'), icon: 'edit_note' },
                    { k: 'uploaded' as CaptionSource, l: t('uploadFile', 'رفع ملف'), icon: 'upload_file' },
                    { k: 'autoCue' as CaptionSource, l: t('importFromPrompter', 'استيراد من الملقن'), icon: 'teleprompter' },
                    { k: 'generated' as CaptionSource, l: t('autoGenerated', 'توليد تلقائي'), icon: 'auto_awesome' },
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
                      {s.k === 'generated' && <span className="acp-badge acp-badge--soon">{t('soon', 'قريباً')}</span>}
                    </button>
                  ))}
                </div>

                {/* ── Manual mode ── */}
                {captionSource === 'manual' && (
                  <div className="acp-captions-editor">
                    <label className="acp-label">{t('writeCaptionText', 'اكتب النص (كل سطر = مقطع واحد)')}</label>
                    <textarea
                      className="acp-textarea acp-textarea--captions"
                      rows={8}
                      dir="auto"
                      placeholder={t('captionPlaceholder', 'اكتب النص هنا...\nكل سطر سيصبح مقطع منفصل')}
                      value={captionRawText}
                      onChange={(e) => {
                        setCaptionRawText(e.target.value);
                        setCaptionSegments(splitTextToSegments(e.target.value));
                      }}
                    />
                    {captionSegments.length > 0 && (
                      <p className="acp-hint">
                        <span className="material-symbols-outlined acp-hint__icon">segment</span>
                        {captionSegments.length} {t('segmentNoTiming', 'مقطع — بدون توقيت (نص غير متزامن)')}
                      </p>
                    )}
                  </div>
                )}

                {/* ── Upload mode ── */}
                {captionSource === 'uploaded' && (
                  <div className="acp-captions-editor">
                    <label className="acp-label">{t('uploadSubtitleFile', 'ارفع ملف ترجمة (SRT أو VTT)')}</label>
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
                          {captionSegments.length} {t('segment', 'مقطع')}
                          {captionSegments[0]?.startMs !== undefined ? t('withTiming', ' — مع توقيت') : t('withoutTiming', ' — بدون توقيت')}
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
                            <p className="acp-hint">{t('andMoreSegments', `و${captionSegments.length - 5} مقطع آخر...`)}</p>
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
                          {t('youCanImportPrompterText', 'يمكنك استيراد نص الملقن كنص ترجمة')}
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
                          {t('importPrompterText', 'استيراد نص الملقن')}
                        </button>
                        {captionSegments.length > 0 && (
                          <p className="acp-hint">
                            <span className="material-symbols-outlined acp-hint__icon">check_circle</span>
                            {t('imported', 'تم استيراد')} {captionSegments.length} {t('segmentsNoTiming', 'مقطع (بدون توقيت)')}
                          </p>
                        )}
                      </>
                    ) : (
                      <p className="acp-hint">
                        <span className="material-symbols-outlined acp-hint__icon">info</span>
                        {t('noPrompterTextFound', 'لا يوجد نص ملقن. أضف نص الملقن في الخطوة 5 أولاً.')}
                      </p>
                    )}
                  </div>
                )}

                {/* ── Generated mode (gated) ── */}
                {captionSource === 'generated' && (
                  <div className="acp-captions-editor">
                    <p className="acp-hint">
                      <span className="material-symbols-outlined acp-hint__icon">auto_awesome</span>
                      {t('soonNeedsVoiceProvider', 'قريباً — يتطلب مزود تفريغ صوتي')}
                    </p>
                  </div>
                )}

                {/* Language + Style selectors (shared across modes) */}
                <div className="acp-label">
                  {t('textLanguage', 'لغة النص')}
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
                  {t('displayStyle', 'نمط العرض')}
                  <div className="acp-chips">
                    {([{ k: 'standard' as const, l: t('normal', 'عادي') }, { k: 'karaoke' as const, l: t('karaoke', 'كاريوكي') }, { k: 'subtitles' as const, l: t('subtitle', 'ترجمة سفلية') }]).map((s) => (
                      <button key={s.k} className={`acp-chip ${captionStyle === s.k ? 'acp-chip--selected' : ''}`} onClick={() => setCaptionStyle(s.k)} type="button">{s.l}</button>
                    ))}
                  </div>
                </label>
              </>
            )}
            <div className="acp-nav-row">
              <button className="acp-btn acp-btn--ghost" onClick={() => setStep(3)} type="button">
                <span className="material-symbols-outlined" aria-hidden="true">{iconPrev}</span> {t('back', 'رجوع')}
              </button>
              <button className="acp-btn acp-btn--ghost" onClick={() => setStep(5)} type="button">{t('skip', 'تخطي')}</button>
              <button className="acp-btn acp-btn--primary" onClick={() => saveDraft(5)} disabled={saving}>
                {saving ? t('savingDots', 'حفظ...') : t('theNext', 'التالي')}
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
            {t('autoCue', 'الملقن (AutoCue)')}
            <span className="acp-badge acp-badge--optional">{t('optional', 'اختياري')}</span>
          </h1>
          <div className="acp-form">
            <div className="acp-gate-banner">
              <span className="material-symbols-outlined" aria-hidden="true">workspace_premium</span>
              <span>{t('paidFeaturePro', 'ميزة مدفوعة — متاحة لمشتركي الحزم المتقدمة أو بتفعيل إداري.')}</span>
            </div>
            <label className="acp-label acp-label--row acp-toggle-main">
              <input type="checkbox" checked={autoCueEnabled} onChange={(e) => setAutoCueEnabled(e.target.checked)} />
              <span>{t('enablePrompterDuringRecording', 'تفعيل الملقن أثناء التسجيل')}</span>
            </label>
            {autoCueEnabled && (
              <>
                <label className="acp-label">
                  {t('textLyrics', 'النص / كلمات الأغنية')}
                  <textarea className="acp-textarea acp-textarea--script" value={scriptText} onChange={(e) => setScriptText(e.target.value)} placeholder={t('typeOrPasteTextHere', 'اكتب أو الصق النص هنا...')} rows={8} />
                </label>
                <div className="acp-autocue-actions">
                  <button className="acp-btn acp-btn--outline acp-btn--sm" onClick={() => setScriptText(caption)} type="button" disabled={!caption}>{t('copyFromDescription', 'نسخ من الوصف')}</button>
                  <button className="acp-btn acp-btn--outline acp-btn--sm acp-btn--gated" disabled type="button">
                    {t('smartGenerateAI', 'توليد ذكي (AI)')} <span className="acp-gate-badge">{t('paid', 'مدفوع')}</span>
                  </button>
                  <button className="acp-btn acp-btn--outline acp-btn--sm" onClick={() => setScriptText('')} type="button">{t('clear', 'مسح')}</button>
                </div>
                <div className="acp-autocue-settings">
                  <label className="acp-label">
                    {t('scrollSpeed', 'سرعة التمرير')}
                    <div className="acp-chips">
                      {([{ k: 'slow' as const, l: t('slow', 'بطيء') }, { k: 'medium' as const, l: t('medium', 'متوسط') }, { k: 'fast' as const, l: t('fast', 'سريع') }]).map((s) => (
                        <button key={s.k} className={`acp-chip ${scrollSpeed === s.k ? 'acp-chip--selected' : ''}`} onClick={() => setScrollSpeed(s.k)} type="button">{s.l}</button>
                      ))}
                    </div>
                  </label>
                  <label className="acp-label">
                    {t('fontSize', 'حجم الخط')}
                    <div className="acp-chips">
                      {([{ k: 'small' as const, l: t('small', 'صغير') }, { k: 'medium' as const, l: t('medium', 'متوسط') }, { k: 'large' as const, l: t('large', 'كبير') }]).map((s) => (
                        <button key={s.k} className={`acp-chip ${fontSize === s.k ? 'acp-chip--selected' : ''}`} onClick={() => setFontSize(s.k)} type="button">{s.l}</button>
                      ))}
                    </div>
                  </label>
                  <label className="acp-label">
                    {t('readingMode', 'وضع القراءة')}
                    <div className="acp-chips">
                      <button className={`acp-chip ${readingMode === 'lineByLine' ? 'acp-chip--selected' : ''}`} onClick={() => setReadingMode('lineByLine')} type="button">{t('lineByLine', 'سطر بسطر')}</button>
                      <button className={`acp-chip ${readingMode === 'paragraphByParagraph' ? 'acp-chip--selected' : ''}`} onClick={() => setReadingMode('paragraphByParagraph')} type="button">{t('paragraphByParagraph', 'فقرة بفقرة')}</button>
                    </div>
                  </label>
                  <label className="acp-label">
                    {t('startDelaySeconds', 'تأخير البداية (ثوان)')}
                    <input type="number" className="acp-input acp-input--narrow" value={startDelay} onChange={(e) => setStartDelay(Number(e.target.value))} min={0} max={30} />
                  </label>
                  <label className="acp-label acp-label--row">
                    <input type="checkbox" checked={highlightLine} onChange={(e) => setHighlightLine(e.target.checked)} />
                    {t('highlightCurrentLine', 'تمييز السطر الحالي')}
                  </label>
                </div>
              </>
            )}
            <div className="acp-nav-row">
              <button className="acp-btn acp-btn--ghost" onClick={() => setStep(4)} type="button">
                <span className="material-symbols-outlined" aria-hidden="true">{iconPrev}</span> {t('back', 'رجوع')}
              </button>
              <button className="acp-btn acp-btn--ghost" onClick={() => setStep(6)} type="button">{t('skip', 'تخطي')}</button>
              <button className="acp-btn acp-btn--primary" onClick={() => saveDraft(6)} disabled={saving}>
                {saving ? t('savingDots', 'حفظ...') : t('theNext', 'التالي')}
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
            {t('recordOrUpload', 'التسجيل أو الرفع')}
          </h1>

          {/* AutoCue banner */}
          {autoCueEnabled && scriptText && (
            <div className="acp-autocue-banner">
              <span className="material-symbols-outlined" aria-hidden="true">teleprompter</span>
              <span>{t('prompterActiveTextWillShow', 'وضع الملقن مفعّل — النص سيظهر أثناء التسجيل')}</span>
            </div>
          )}

          {/* Tab switcher */}
          <div className="acp-tabs">
            <button className={`acp-tab ${tab === 'record' ? 'acp-tab--active' : ''}`} onClick={() => setTab('record')} type="button">
              <span className="material-symbols-outlined" aria-hidden="true">mic</span> {t('record', 'تسجيل')}
            </button>
            <button className={`acp-tab ${tab === 'upload' ? 'acp-tab--active' : ''}`} onClick={() => setTab('upload')} type="button">
              <span className="material-symbols-outlined" aria-hidden="true">upload_file</span> {t('uploadFile', 'رفع ملف')}
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
                    <span>{t('startRecording', 'ابدأ التسجيل')}</span>
                  </button>
                )}
                {recorder.state === 'requesting' && (
                  <div className="acp-record-status"><span className="acp-spinner" /><p>{t('requestingMicPermission', 'جاري طلب إذن الميكروفون...')}</p></div>
                )}
                {recorder.state === 'recording' && (
                  <div className="acp-record-live">
                    <div className="acp-record-pulse" />
                    <p className="acp-record-time">{formatDuration(recorder.elapsedMs)}</p>
                    <button className="acp-btn acp-btn--danger" onClick={recorder.stopRecording} type="button">
                      <span className="material-symbols-outlined" aria-hidden="true">stop_circle</span> {t('stop', 'إيقاف')}
                    </button>
                  </div>
                )}
                {recorder.state === 'stopped' && recorder.audioUrl && (
                  <div className="acp-record-preview">
                    <audio controls src={recorder.audioUrl} className="acp-audio-player" />
                    <div className="acp-record-preview__info">
                      <span>{t('duration', 'المدة:')} {formatDuration(recorder.elapsedMs)}</span>
                      {recorder.audioBlob && <span>{t('size', 'الحجم:')} {formatFileSize(recorder.audioBlob.size)}</span>}
                    </div>
                    <div className="acp-record-preview__actions">
                      <button className="acp-btn acp-btn--primary" onClick={handleUploadRecording} disabled={uploader.state === 'uploading' || uploader.state === 'done'} type="button">
                        <span className="material-symbols-outlined" aria-hidden="true">cloud_upload</span> {t('uploadRecording', 'رفع التسجيل')}
                      </button>
                      <button className="acp-btn acp-btn--ghost" onClick={recorder.reset} disabled={uploader.state === 'uploading'} type="button">{t('reRecord', 'إعادة التسجيل')}</button>
                    </div>
                  </div>
                )}
                {recorder.state === 'error' && (
                  <div className="acp-error-box">
                    <span className="material-symbols-outlined">error</span>
                    <p>{recorder.errorMessage}</p>
                    <button className="acp-btn acp-btn--ghost" onClick={recorder.reset} type="button">{t('tryAgain', 'حاول مجدداً')}</button>
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
                  <p>{t('chooseAudioFile', 'اختر ملفاً صوتياً')}</p>
                  <p className="acp-drop-zone__hint">{t('audioFormatsHint', 'MP3, WAV, AAC, OGG, WebM — حتى 100MB')}</p>
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
                      <span className="material-symbols-outlined" aria-hidden="true">cloud_upload</span> {t('uploadFileAction', 'رفع الملف')}
                    </button>
                    <button className="acp-btn acp-btn--ghost" onClick={() => { setSelectedFile(null); setFileDurationMs(null); uploader.reset(); if (fileInputRef.current) fileInputRef.current.value = ''; }} disabled={uploader.state === 'uploading'} type="button">{t('changeFile', 'تغيير الملف')}</button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Upload progress ────────────────────────────────── */}
          {uploader.state === 'uploading' && (
            <div className="acp-progress">
              <div className="acp-progress__bar"><div className="acp-progress__fill" style={{ width: `${uploader.progress}%` }} /></div>
              <p className="acp-progress__text">{t('uploadingWithProgress', 'جاري الرفع...')} {uploader.progress}%</p>
              <button className="acp-btn acp-btn--ghost acp-btn--sm" onClick={uploader.cancel} type="button">{t('cancel', 'إلغاء')}</button>
            </div>
          )}
          {attaching && <div className="acp-progress"><span className="acp-spinner" /><p className="acp-progress__text">{t('attachingFileToDraft', 'جاري ربط الملف بالمسودة...')}</p></div>}
          {uploader.state === 'error' && <div className="acp-error-box"><span className="material-symbols-outlined">error</span><p>{uploader.errorMessage}</p></div>}
          {attachError && <div className="acp-error-box"><span className="material-symbols-outlined">error</span><p>{attachError}</p></div>}

          {/* ── Asset attached ─────────────────────────────────── */}
          {audioAsset && (
            <div className="acp-success-box">
              <span className="material-symbols-outlined">check_circle</span>
              <p>{t('audioFileAttachedSuccessfully', 'تم ربط الملف الصوتي بالمسودة بنجاح!')}</p>
              <div className="acp-asset-summary">
                <span className="acp-asset-summary__item">
                  <span className="material-symbols-outlined">description</span> {audioAsset.originalFileName}
                </span>
                {audioAsset.durationMs ? <span className="acp-asset-summary__item"><span className="material-symbols-outlined">schedule</span> {formatDuration(audioAsset.durationMs)}</span> : null}
                {audioAsset.sizeBytes ? <span className="acp-asset-summary__item"><span className="material-symbols-outlined">inventory_2</span> {formatFileSize(audioAsset.sizeBytes)}</span> : null}
              </div>
              <button className="acp-btn acp-btn--primary" onClick={() => setStep(7)} type="button">
                <span className="material-symbols-outlined" aria-hidden="true">arrow_back</span> {t('continue', 'متابعة')}
              </button>
            </div>
          )}

          {/* Back button */}
          {!audioAsset && (
            <button className="acp-btn acp-btn--ghost acp-back" onClick={() => setStep(5)} type="button">
              <span className="material-symbols-outlined" aria-hidden="true">{iconPrev}</span> {t('back', 'رجوع')}
            </button>
          )}
        </section>
      )}

      {/* ═══════════════ STEP 7: REVIEW ═══════════════════════════ */}
      {step === 7 && (
        <section className="acp-section">
          <h1 className="acp-section__title">
            <span className="material-symbols-outlined" aria-hidden="true">preview</span>
            {t('reviewAndEditAudio', 'مراجعة وتعديل الصوت')}
          </h1>
          <div className="acp-form">
            {audioAsset ? (
              <div className="acp-review-audio">
                <div className="acp-review__item"><span>{t('theFile', 'الملف:')}</span> <strong>{audioAsset.originalFileName}</strong></div>
                {audioAsset.durationMs ? <div className="acp-review__item"><span>{t('duration', 'المدة:')}</span> {formatDuration(audioAsset.durationMs)}</div> : null}
                {audioAsset.sizeBytes ? <div className="acp-review__item"><span>{t('size', 'الحجم:')}</span> {formatFileSize(audioAsset.sizeBytes)}</div> : null}
                <div className="acp-review__item">
                  <span>{t('theSource', 'المصدر:')}</span>
                  <span className="material-symbols-outlined" style={{ fontSize: '0.9rem' }}>{audioAsset.sourceType === 'recorded' ? 'mic' : 'upload_file'}</span>
                  {audioAsset.sourceType === 'recorded' ? t('recorded', ' مسجّل') : t('uploaded', ' مرفوع')}
                </div>
                <div className="acp-review__item">
                  <span>{t('theStatus', 'الحالة:')}</span>
                  <span className="material-symbols-outlined" style={{ fontSize: '0.9rem', color: '#22c55e' }}>check_circle</span>
                  {t('uploadedStatus', 'مرفوع')}
                </div>
              </div>
            ) : (
              <div className="acp-warning-box">
                <span className="material-symbols-outlined">warning</span>
                <p>{t('noAudioFileGoBack', 'لا يوجد ملف صوتي. ارجع للخطوة السابقة.')}</p>
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
                    {t('analyzingAudioWaveform', 'جاري تحليل الموجة الصوتية...')}
                  </div>
                ) : waveformPeaks.length > 0 ? (
                  <>
                    {/* SVG Waveform */}
                    <div className="acp-waveform-timeline"
                      ref={waveformTimelineRef}
                      onMouseMove={(e) => {
                        const activeDur = waveformDurationMs || workingDurationMs;
                        if (!activeDur || wfDragging) return;
                        const rect = e.currentTarget.getBoundingClientRect();
                        const x = e.clientX - rect.left;
                        const pct = Math.max(0, Math.min(1, x / rect.width));
                        setWfHoverMs(pct * activeDur);
                        setWfHoverX(pct * 100);
                      }}
                      onMouseLeave={() => setWfHoverMs(null)}
                      onClick={(e) => {
                        const activeDur = waveformDurationMs || workingDurationMs;
                        if (!activeDur || wfDragging) return;
                        const rect = e.currentTarget.getBoundingClientRect();
                        const x = e.clientX - rect.left;
                        const pct = Math.max(0, Math.min(1, x / rect.width));
                        const seekMs = pct * activeDur;
                        if (waveformAudioRef.current) {
                          waveformAudioRef.current.currentTime = seekMs / 1000;
                          setWfCurrentMs(seekMs);
                        }
                      }}
                      onMouseDown={(e) => {
                        const activeDur = waveformDurationMs || workingDurationMs;
                        if (!activeDur) return;
                        e.preventDefault();
                        setWfDragging(true);
                        const rect = e.currentTarget.getBoundingClientRect();
                        const seek = (clientX: number) => {
                          const x = clientX - rect.left;
                          const pct = Math.max(0, Math.min(1, x / rect.width));
                          const seekMs = pct * activeDur;
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
                        const activeDur = waveformDurationMs || workingDurationMs;
                        if (!activeDur) return;
                        setWfDragging(true);
                        const rect = e.currentTarget.getBoundingClientRect();
                        const seek = (clientX: number) => {
                          const x = clientX - rect.left;
                          const pct = Math.max(0, Math.min(1, x / rect.width));
                          const seekMs = pct * activeDur;
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
                          const activeDur = waveformDurationMs || workingDurationMs;
                          const barMs = (i / 200) * activeDur;
                          // Only show red cut regions if we are in step 7 (Edit). In later steps, the audio is already cut!
                          const isTrimmedOut = step === 7 && editEnabled && (barMs < effectiveStart || barMs > effectiveEnd);
                          const isCut = step === 7 && editEnabled && editCuts.some(c => barMs >= c.startMs && barMs < c.endMs);
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
                      {(waveformDurationMs || workingDurationMs) > 0 && (
                        <div className="acp-waveform-timeline__playhead"
                          style={{ left: `${(wfCurrentMs / (waveformDurationMs || workingDurationMs)) * 100}%` }} />
                      )}
                      {/* Hover Tooltip & Line */}
                      {wfHoverMs !== null && originalDurationMs > 0 && !wfDragging && (
                        <>
                          <div style={{
                            position: 'absolute',
                            top: 0,
                            bottom: 0,
                            left: `${wfHoverX}%`,
                            width: '1px',
                            background: 'rgba(255,255,255,0.4)',
                            pointerEvents: 'none',
                            zIndex: 5
                          }} />
                          <div style={{
                            position: 'absolute',
                            top: '-25px',
                            left: `${wfHoverX}%`,
                            transform: 'translateX(-50%)',
                            background: 'rgba(0,0,0,0.8)',
                            color: '#fff',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            fontSize: '12px',
                            pointerEvents: 'none',
                            zIndex: 10,
                            fontFamily: 'monospace',
                            whiteSpace: 'nowrap'
                          }}>
                            {formatMsToTimeInput(wfHoverMs)}
                          </div>
                        </>
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
                      <button type="button" className="acp-waveform-controls__play" onClick={toggleWfPlayback} aria-label={wfPlaying ? t('stop', 'إيقاف') : t('play', 'تشغيل')}>
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
                      <span className="acp-waveform-controls__time">{formatDuration(workingDurationMs)}</span>
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
                            <><span className="material-symbols-outlined acp-spin">progress_activity</span> {t('processingPreview', 'جاري معالجة المعاينة...')}</>
                          ) : getStagePreviewStatus('edit') === 'ready' ? (
                            <><span className="material-symbols-outlined">check_circle</span> {t('previewReadyRePreview', '✓ المعاينة جاهزة — إعادة المعاينة')}</>
                          ) : getStagePreviewStatus('edit') === 'failed' ? (
                            <><span className="material-symbols-outlined">error</span> {t('previewFailedRetry', 'فشلت المعاينة — إعادة المحاولة')}</>
                          ) : getStagePreviewStatus('edit') === 'dirty' ? (
                            <><span className="material-symbols-outlined">warning</span> {t('settingsChangedRePreview', 'الإعدادات تغيرت — أعد المعاينة')}</>
                          ) : (
                            <><span className="material-symbols-outlined">play_circle</span> {t('previewCut', 'حفظ ومعاينة القص')}</>
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
                    {t('couldNotAnalyzeWaveform', 'لم يتمكن من تحليل الموجة الصوتية')}
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
                    <span>{t('cutAndEditAudio', 'قص وتعديل الصوت')}</span>
                    <span className="acp-badge acp-badge--optional">{t('optional', 'اختياري')}</span>
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
                        {t('trimStart', 'قص البداية')}
                      </div>
                      <input
                        type="range"
                        dir="ltr"
                        className="acp-edit-control__slider"
                        min={0}
                        max={originalDurationMs}
                        step={100}
                        value={trimStartMs}
                        onChange={e => {
                          let v = Math.max(0, Math.min(originalDurationMs, Number(e.target.value)));
                          const end = trimEndMs > 0 ? trimEndMs : originalDurationMs;
                          if (v > end - 500) setTrimEndMs(Math.min(originalDurationMs, v + 500));
                          setTrimStartMs(v);
                          setIsCutsSaved(false);
                        }}
                      />
                      <TimeInputControl
                        valueMs={trimStartMs}
                        onChange={v => {
                          let newVal = Math.max(0, Math.min(originalDurationMs, v));
                          const end = trimEndMs > 0 ? trimEndMs : originalDurationMs;
                          if (newVal > end - 500) setTrimEndMs(Math.min(originalDurationMs, newVal + 500));
                          setTrimStartMs(newVal);
                          setIsCutsSaved(false);
                        }}
                      />
                    </div>

                    {/* Trim end */}
                    <div className="acp-edit-control" id="edit-trim-end">
                      <div className="acp-edit-control__label">
                        <span className="material-symbols-outlined">last_page</span>
                        {t('trimEnd', 'قص النهاية')}
                      </div>
                      <input
                        type="range"
                        dir="ltr"
                        className="acp-edit-control__slider"
                        min={0}
                        max={originalDurationMs}
                        step={100}
                        value={trimEndMs > 0 ? trimEndMs : originalDurationMs}
                        onChange={e => {
                          let v = Math.max(0, Math.min(originalDurationMs, Number(e.target.value)));
                          if (v < trimStartMs + 500) setTrimStartMs(Math.max(0, v - 500));
                          setTrimEndMs(v >= originalDurationMs ? 0 : v);
                          setIsCutsSaved(false);
                        }}
                      />
                      <TimeInputControl
                        valueMs={trimEndMs > 0 ? trimEndMs : originalDurationMs}
                        onChange={v => {
                          let newVal = Math.max(0, Math.min(originalDurationMs, v));
                          if (newVal < trimStartMs + 500) setTrimStartMs(Math.max(0, newVal - 500));
                          setTrimEndMs(newVal >= originalDurationMs ? 0 : newVal);
                          setIsCutsSaved(false);
                        }}
                      />
                    </div>

                    {/* Middle cut */}
                    <div className="acp-edit-cut-section" id="edit-middle-cut">
                      <div className="acp-edit-cut-section__header">
                        <span className="material-symbols-outlined">content_cut</span>
                        <span>{t('deleteMiddleSection', 'حذف مقطع من المنتصف')}</span>
                        <span className="acp-hint">{t('unlimited', '(بدون حد أقصى)')}</span>
                      </div>
                      {editCuts.map(cut => (
                        <div key={cut.id} className="acp-edit-cut-card">
                          <div className="acp-edit-cut-card__row">
                            <div className="acp-edit-cut-card__field">
                              <span className="acp-edit-cut-card__field-label">{t('from', 'من:')}</span>
                              <input
                                type="range"
                                dir="ltr"
                                className="acp-edit-control__slider"
                                min={0}
                                max={originalDurationMs}
                                step={100}
                                value={cut.startMs}
                                onChange={e => {
                                  let v = Math.max(0, Math.min(originalDurationMs, Number(e.target.value)));
                                  if (v > cut.endMs - 100) {
                                    updateCut(cut.id, { startMs: v, endMs: Math.min(originalDurationMs, v + 100) });
                                  } else {
                                    updateCut(cut.id, { startMs: v });
                                  }
                                }}
                              />
                              <TimeInputControl
                                valueMs={cut.startMs}
                                onChange={v => {
                                  let newVal = Math.max(0, Math.min(originalDurationMs, v));
                                  if (newVal > cut.endMs - 100) {
                                    updateCut(cut.id, { startMs: newVal, endMs: Math.min(originalDurationMs, newVal + 100) });
                                  } else {
                                    updateCut(cut.id, { startMs: newVal });
                                  }
                                }}
                              />
                            </div>
                            <div className="acp-edit-cut-card__field">
                              <span className="acp-edit-cut-card__field-label">{t('to', 'إلى:')}</span>
                              <input
                                type="range"
                                dir="ltr"
                                className="acp-edit-control__slider"
                                min={0}
                                max={originalDurationMs}
                                step={100}
                                value={cut.endMs}
                                onChange={e => {
                                  let v = Math.max(0, Math.min(originalDurationMs, Number(e.target.value)));
                                  if (v < cut.startMs + 100) {
                                    updateCut(cut.id, { startMs: Math.max(0, v - 100), endMs: v });
                                  } else {
                                    updateCut(cut.id, { endMs: v });
                                  }
                                }}
                              />
                              <TimeInputControl
                                valueMs={cut.endMs}
                                onChange={v => {
                                  let newVal = Math.max(0, Math.min(originalDurationMs, v));
                                  if (newVal < cut.startMs + 100) {
                                    updateCut(cut.id, { startMs: Math.max(0, newVal - 100), endMs: newVal });
                                  } else {
                                    updateCut(cut.id, { endMs: newVal });
                                  }
                                }}
                              />
                            </div>
                          </div>
                          <button type="button" className="acp-btn acp-btn--ghost acp-btn--sm" onClick={() => removeCut(cut.id)}>
                            <span className="material-symbols-outlined">delete</span> {t('removeCut', 'إزالة القص')}
                          </button>
                        </div>
                      ))}
                      <button type="button" className="acp-btn acp-btn--outline acp-btn--sm" onClick={addCut} style={{ marginTop: '0.5rem' }}>
                        <span className="material-symbols-outlined">add</span> {t('addCut', 'إضافة قص')}
                      </button>
                    </div>

                    {/* Duration summary */}
                    <div className="acp-edit-duration-summary">
                      <div className="acp-edit-duration-summary__row">
                        <span className="material-symbols-outlined">schedule</span>
                        <span>{t('originalDuration', 'المدة الأصلية:')}</span>
                        <strong>{formatDuration(originalDurationMs)}</strong>
                      </div>
                      <div className="acp-edit-duration-summary__row acp-edit-duration-summary__row--edited">
                        <span className="material-symbols-outlined">timer</span>
                        <span>{t('editedDuration', 'المدة بعد التعديل:')}</span>
                        <strong>{formatDuration(editedDurationMs)}</strong>
                      </div>
                    </div>

                    {/* Reset button */}
                    <button type="button" className="acp-btn acp-btn--ghost acp-btn--sm" onClick={resetEdits}>
                      <span className="material-symbols-outlined">restart_alt</span> {t('resetEdits', 'إعادة ضبط التعديلات')}
                    </button>
                  </div>
                )}
              </div>
            )}

            <div className="acp-nav-row" style={{ marginTop: '1rem' }}>
              <button className="acp-btn acp-btn--ghost" onClick={() => { setAudioAsset(null); uploader.reset(); recorder.reset(); setStep(6); }} type="button">
                <span className="material-symbols-outlined" aria-hidden="true">refresh</span> {t('reRecordUpload', 'إعادة التسجيل / الرفع')}
              </button>
              <button className="acp-btn acp-btn--primary" onClick={() => saveDraft(8)} disabled={!audioAsset || renderingStage === 'edit'} type="button">
                <span className="material-symbols-outlined" aria-hidden="true">{iconNext}</span> {t('confirmAndContinue', 'تأكيد ومتابعة')}
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
            {t('audioEffects', 'المؤثرات الصوتية')}
            <span className="acp-badge acp-badge--optional">{t('optional', 'اختياري')}</span>
          </h1>
          <div className="acp-form">

            {/* ── Working-audio preview (cut audio from Step 7) ─────────── */}
            {(previewUrls.edit || audioAsset?.storagePath) && (
              <div className="acp-working-audio-card" id="effects-source-preview">
                <div className="acp-working-audio-card__header">
                  <span className="material-symbols-outlined">graphic_eq</span>
                  <div className="acp-working-audio-card__info">
                    <span className="acp-working-audio-card__title">
                      {previewUrls.edit
                        ? t('audioAfterCuts', 'الصوت بعد القص')
                        : t('originalAudio', 'الصوت الأصلي')}
                    </span>
                    <span className="acp-working-audio-card__subtitle">
                      {previewUrls.edit
                        ? t('effectsAppliedToThis', 'المؤثرات ستُطبَّق على هذا الصوت')
                        : t('noEditsApplied', 'لم تُطبَّق تعديلات — الصوت كامل')}
                    </span>
                  </div>
                  {workingDurationMs > 0 && (
                    <span className="acp-working-audio-card__duration">
                      {formatDuration(workingDurationMs)}
                    </span>
                  )}
                </div>
                <audio
                  controls
                  src={previewUrls.edit || (audioAsset?.storagePath ?? undefined)}
                  className="acp-working-audio-card__player"
                  preload="metadata"
                />
                {!previewUrls.edit && editEnabled && (
                  <p className="acp-working-audio-card__warn">
                    <span className="material-symbols-outlined">warning</span>
                    {t('noEditPreviewYet', 'لم يتم حفظ معاينة القص بعد — سيتم تطبيق المؤثرات على الصوت الكامل')}
                  </p>
                )}
              </div>
            )}

            {/* Enable/disable toggle */}
            <div className="acp-effects-toggle-row">
              <label className="acp-effects-toggle" id="effects-master-toggle">
                <span>{t('enableAudioEffects', 'تفعيل المؤثرات الصوتية')}</span>
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
                    <span className="acp-effects-mode-card__label">{t('presets', 'إعدادات مسبقة')}</span>
                    <span className="acp-effects-mode-card__desc">{t('chooseFromPresets', 'اختر من الأنماط الجاهزة')}</span>
                  </button>
                  <button
                    type="button"
                    className={`acp-effects-mode-card ${effectsMode === 'manual' ? 'acp-effects-mode-card--selected' : ''}`}
                    onClick={() => setEffectsMode('manual')}
                  >
                    <span className="material-symbols-outlined">tune</span>
                    <span className="acp-effects-mode-card__label">{t('manualControl', 'تحكم يدوي')}</span>
                    <span className="acp-effects-mode-card__desc">{t('editEachFilter', 'تعديل كل فلتر على حدة')}</span>
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
                                dir="ltr"
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
                      <><span className="material-symbols-outlined acp-spin">progress_activity</span> {t('processingPreview', 'جاري معالجة المعاينة...')}</>
                    ) : getStagePreviewStatus('effects') === 'ready' ? (
                      <><span className="material-symbols-outlined">check_circle</span> {t('previewReadyRePreview', '✓ المعاينة جاهزة — إعادة المعاينة')}</>
                    ) : getStagePreviewStatus('effects') === 'failed' ? (
                      <><span className="material-symbols-outlined">error</span> {t('previewFailedRetry', 'فشلت المعاينة — إعادة المحاولة')}</>
                    ) : getStagePreviewStatus('effects') === 'dirty' ? (
                      <><span className="material-symbols-outlined">warning</span> {t('settingsChangedRePreview', 'الإعدادات تغيرت — أعد المعاينة')}</>
                    ) : (
                      <><span className="material-symbols-outlined">play_circle</span> {t('previewEffects', 'حفظ ومعاينة المؤثرات')}</>
                    )}
                  </button>
                  {editEnabled && getStagePreviewStatus('edit') !== 'ready' && (
                    <p className="acp-hint">{t('previewCutFirst', 'يجب معاينة القص أولاً')}</p>
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
                  {t('resetEffects', 'إعادة تعيين المؤثرات')}
                </button>
              </>
            )}

            {!effectsEnabled && (
              <p className="acp-hint">
                <span className="material-symbols-outlined acp-hint__icon" aria-hidden="true">info</span>
                {t('noEffectsWillBeAppliedCanSkip', 'لن يتم تطبيق أي مؤثرات صوتية. يمكنك تخطي هذه الخطوة.')}
              </p>
            )}

            <div className="acp-nav-row">
              <button className="acp-btn acp-btn--ghost" onClick={() => setStep(7)} type="button">
                <span className="material-symbols-outlined" aria-hidden="true">{iconPrev}</span> {t('back', 'رجوع')}
              </button>
              <button className="acp-btn acp-btn--primary" onClick={() => saveDraft(9)} disabled={saving} type="button">
                {effectsEnabled ? t('theNext', 'التالي') : t('skip', 'تخطي')} <span className="material-symbols-outlined" aria-hidden="true">{iconNext}</span>
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
            {t('audioMixing', 'مكساج الصوت')}
            <span className="acp-badge acp-badge--optional">{t('optional', 'اختياري')}</span>
          </h1>
          <div className="acp-form">

            {/* ── Working-audio preview (effects or cut audio from prev step) ── */}
            {(previewUrls.effects || previewUrls.edit || audioAsset?.storagePath) && (
              <div className="acp-working-audio-card" id="mixing-source-preview">
                <div className="acp-working-audio-card__header">
                  <span className="material-symbols-outlined">graphic_eq</span>
                  <div className="acp-working-audio-card__info">
                    <span className="acp-working-audio-card__title">
                      {previewUrls.effects
                        ? t('audioAfterEffects', 'الصوت بعد المؤثرات')
                        : previewUrls.edit
                        ? t('audioAfterCuts', 'الصوت بعد القص')
                        : t('originalAudio', 'الصوت الأصلي')}
                    </span>
                    <span className="acp-working-audio-card__subtitle">
                      {t('mixingAppliedToThis', 'المكساج سيُطبَّق على هذا الصوت')}
                    </span>
                  </div>
                  {workingDurationMs > 0 && (
                    <span className="acp-working-audio-card__duration">
                      {formatDuration(workingDurationMs)}
                    </span>
                  )}
                </div>
                <audio
                  controls
                  src={previewUrls.effects || previewUrls.edit || (audioAsset?.storagePath ?? undefined)}
                  className="acp-working-audio-card__player"
                  preload="metadata"
                />
              </div>
            )}

            {/* Master enable toggle */}
            <div className="acp-effects-toggle-row">
              <label className="acp-effects-toggle" id="mixing-master-toggle">
                <span>{t('enableMixing', 'تفعيل المكساج')}</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={mixingEnabled}
                  className={`acp-toggle-switch ${mixingEnabled ? 'acp-toggle-switch--on' : ''}`}
                  onClick={() => setMixingEnabled(!mixingEnabled)}
                >
                  <span className="acp-toggle-switch__thumb" />
                </button>
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
                    <span className="material-symbols-outlined">layers</span> {t('layers', 'الطبقات')}
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
                            title={track.muted ? t('unmute', 'إلغاء الكتم') : t('mute', 'كتم')}
                          >
                            <span className="material-symbols-outlined">{track.muted ? 'volume_off' : 'volume_up'}</span>
                          </button>
                        </div>
                      </div>
                      <div className="acp-mix-track-card__slider">
                        <input
                          type="range"
                          dir="ltr"
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
                              {!opt.available && opt.id !== 'none' && <span className="acp-gate-badge">{t('soon', 'قريباً')}</span>}
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
                                    {track.fileName || t('musicFile', 'ملف موسيقى')}
                                  </div>
                                  {track.durationMs && <div className="acp-music-upload__meta">{formatDuration(track.durationMs)} · {track.sizeBytes ? formatFileSize(track.sizeBytes) : ''}</div>}
                                  <button type="button" className="acp-music-upload__remove" onClick={removeMusicUpload}>
                                    <span className="material-symbols-outlined" style={{ fontSize: '0.8rem' }}>delete</span> {t('remove', 'إزالة')}
                                  </button>
                                </>
                              ) : (
                                <button type="button" className="acp-sfx-add-btn" onClick={() => musicFileRef.current?.click()} disabled={musicUploading}>
                                  <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>{musicUploading ? 'hourglass_empty' : 'upload_file'}</span>
                                  {musicUploading ? `${t('uploadingWithProgress', 'جاري الرفع...')} ${musicUploadProgress}%` : t('chooseMusicFile', 'اختر ملف موسيقى')}
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
                        {t('soundEffectsSfx', 'مؤثرات صوتية')} ({sfxItems.length}/{MAX_SFX_ITEMS})
                      </span>
                      <input ref={sfxFileRef} type="file" accept="audio/*" style={{ display: 'none' }}
                        onChange={e => { const f = e.target.files?.[0]; if (f) handleSfxUpload(f); e.target.value = ''; }} />
                      <button type="button" className="acp-sfx-add-btn"
                        onClick={() => sfxFileRef.current?.click()}
                        disabled={sfxItems.length >= MAX_SFX_ITEMS || sfxUploading}>
                        <span className="material-symbols-outlined" style={{ fontSize: '0.9rem' }}>{sfxUploading ? 'hourglass_empty' : 'add'}</span>
                        {sfxUploading ? t('uploadingWithProgress', 'جاري الرفع...') : t('addSfx', 'إضافة مؤثر')}
                      </button>
                    </div>
                    {sfxItems.map(sfx => (
                      <div className="acp-sfx-card" key={sfx.id}>
                        <div className="acp-sfx-card__header">
                          <span className="acp-sfx-card__name">
                            <span className="material-symbols-outlined" style={{ fontSize: '0.9rem', verticalAlign: 'middle', marginLeft: '0.25rem' }}>audio_file</span>
                            {sfx.fileName}
                          </span>
                          <button type="button" className="acp-sfx-card__remove" onClick={() => removeSfxItem(sfx.id)} title={t('remove', 'إزالة')}>
                            <span className="material-symbols-outlined">close</span>
                          </button>
                        </div>
                        <div className="acp-sfx-card__controls">
                          <div className="acp-sfx-card__field">
                            <span className="acp-sfx-card__field-label">{t('timingMinSecMs', 'التوقيت (دقيقة:ثانية.ملي ثانية)')}</span>
                            <TimeInputControl
                              valueMs={sfx.startMs}
                              onChange={v => updateSfxItem(sfx.id, { startMs: v })}
                            />
                          </div>
                          <div className="acp-sfx-card__slider">
                            <span className="acp-sfx-card__field-label">{t('volumeLevel', 'الصوت')}</span>
                            <input type="range" dir="ltr" className="acp-range-slider" min={-20} max={6}
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
                        {t('uploadSfxAndSetTimingHint', 'ارفع ملفات مؤثرات صوتية وحدد التوقيت الدقيق لكل مؤثر')}
                      </p>
                    )}
                  </div>
                )}

                {/* Advanced tools */}
                <div className="acp-mix-advanced">
                  <h3 className="acp-mix-layers__title">
                    <span className="material-symbols-outlined">tune</span> {t('advancedTools', 'أدوات متقدمة')}
                  </h3>
                  <div className="acp-mix-tools-grid">
                    {/* Auto-duck toggle */}
                    <div className="acp-mix-tool-card">
                      <div className="acp-mix-tool-card__header">
                        <span className="material-symbols-outlined">hearing</span>
                        <span>{t('musicDucking', 'خفض الموسيقى')}</span>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={autoDuckEnabled}
                          className={`acp-toggle-switch acp-toggle-switch--sm ${autoDuckEnabled ? 'acp-toggle-switch--on' : ''}`}
                          onClick={() => setAutoDuckEnabled(!autoDuckEnabled)}
                        >
                          <span className="acp-toggle-switch__thumb" />
                        </button>
                      </div>
                      <span className="acp-mix-tool-card__desc">{t('automaticallyDuringSpeech', 'تلقائياً أثناء الكلام')}</span>
                      {autoDuckEnabled && (
                        <span className="acp-mix-tool-card__note">
                          <span className="material-symbols-outlined" style={{ fontSize: '0.7rem' }}>schedule</span>
                          {t('delayedRequiresMusicTrack', 'مؤجل — يتطلب مسار موسيقى')}
                        </span>
                      )}
                    </div>

                    {/* Fade In */}
                    <div className="acp-mix-tool-card">
                      <div className="acp-mix-tool-card__header">
                        <span className="material-symbols-outlined">signal_cellular_alt</span>
                        <span>Fade In</span>
                      </div>
                      <span className="acp-mix-tool-card__desc">{t('fadeInDesc', 'تدرج دخول')}</span>
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
                      <span className="acp-mix-tool-card__desc">{t('fadeOutDesc', 'تدرج خروج')}</span>
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
                        <span>{t('masterLevel', 'مستوى الماستر')}</span>
                      </div>
                      <span className="acp-mix-tool-card__desc">{t('calibrateOverallLevel', 'معايرة المستوى العام')}</span>
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
                    <span className="material-symbols-outlined">auto_awesome</span> {t('readyPresets', 'قوالب جاهزة')}
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
                  {t('pressPreviewMixingToHearResult', 'اضغط معاينة المكساج لسماع النتيجة قبل النشر. الملف الأصلي يبقى محفوظاً.')}
                </p>

                {/* Reset button */}
                <button className="acp-btn acp-btn--ghost acp-btn--sm" onClick={resetMixing} type="button">
                  <span className="material-symbols-outlined">restart_alt</span> {t('reset', 'إعادة ضبط')}
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
                    <><span className="material-symbols-outlined">play_circle</span> {t('previewMixing', 'معاينة المكساج')}</>
                  )}
                </button>
                {effectsEnabled && getStagePreviewStatus('effects') !== 'ready' && (
                  <p className="acp-hint">{t('mustPreviewEffectsFirst', 'يجب معاينة المؤثرات أولاً')}</p>
                )}
                {!effectsEnabled && editEnabled && getStagePreviewStatus('edit') !== 'ready' && (
                  <p className="acp-hint">{t('previewCutFirst', 'يجب معاينة القص أولاً')}</p>
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
                <span className="material-symbols-outlined" aria-hidden="true">{iconPrev}</span> {t('back', 'رجوع')}
              </button>
              <button className="acp-btn acp-btn--primary" onClick={() => saveDraft(10)} disabled={saving} type="button">
                <span className="material-symbols-outlined" aria-hidden="true">{mixingEnabled ? 'save' : 'skip_previous'}</span>
                {saving ? t('savingDots', 'جاري الحفظ...') : mixingEnabled ? t('saveMixing', 'حفظ المكساج') : t('skip', 'تخطي')}
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
            {t('finalPreview', 'المعاينة النهائية')}
          </h1>

          {/* Preview card with cover, play overlay, timer */}
          <div className="acp-preview-card">
            <div className="acp-preview-card__cover-wrap">
              {coverPreviewUrl ? (
                <img src={coverPreviewUrl} alt={t('cover', 'غلاف')} className="acp-preview-card__cover" />
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
                    aria-label={previewPlaying ? t('stop', 'إيقاف') : t('play', 'تشغيل')}
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
              <h2 className="acp-preview-card__title">{title || t('untitled', 'بدون عنوان')}</h2>
              <p className="acp-preview-card__owner">{currentUser?.displayName || t('author', 'المؤلف')}</p>
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
                          {t('finalPreviewHint', 'المعاينة النهائية — هذا هو الصوت الذي سيتم نشره')}
                        </div>
                        <audio controls src={previewUrl} className="acp-preview-audio" />
                      </>
                    ) : (
                      <div className="acp-waveform-hint">
                        <span className="material-symbols-outlined">warning</span>
                        {t('mustPreviewEachStageBeforePublish', 'يجب معاينة كل مرحلة قبل النشر')}
                      </div>
                    )}
                    {anyDirty && (
                      <p className="acp-hint">
                        <span className="material-symbols-outlined acp-hint__icon">warning</span>
                        {t('someStagesNeedRePreview', 'بعض المراحل تحتاج إعادة معاينة')}
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
              <span className="material-symbols-outlined">home</span> {t('mainFeed', 'الرئيسية')}
            </button>
            <button className={`acp-preview-tab ${placementFeed === 'shorts' || placementFeed === 'both' ? 'acp-preview-tab--active' : ''}`} type="button">
              <span className="material-symbols-outlined">movie</span> {t('shortsFeed', 'لقطات')}
            </button>
          </div>

          {/* Bento grid — publish summary */}
          <div className="acp-bento-grid">
            <div className="acp-bento-cell">
              <div className="acp-bento-cell__label">
                <span className="material-symbols-outlined">public</span> {t('publishScope', 'نطاق النشر')}
              </div>
              <span className="acp-bento-cell__value">{WORLDS.find((w) => w.key === world)?.label}</span>
            </div>
            <div className="acp-bento-cell">
              <div className="acp-bento-cell__label">
                <span className="material-symbols-outlined">visibility</span> {t('privacy', 'الخصوصية')}
              </div>
              <span className="acp-bento-cell__value">{AUDIENCE_OPTIONS.find((a) => a.key === audience)?.label}</span>
            </div>
            <div className="acp-bento-cell">
              <div className="acp-bento-cell__label">
                <span className="material-symbols-outlined">category</span> {t('category', 'القسم')}
              </div>
              <span className="acp-bento-cell__value">{CATEGORIES.find((c) => c.id === categoryId)?.label || '—'}</span>
            </div>
            <div className="acp-bento-cell">
              <div className="acp-bento-cell__label">
                <span className="material-symbols-outlined">segment</span> {t('subcategory', 'القسم الفرعي')}
              </div>
              <span className="acp-bento-cell__value">{SUBCATEGORIES_BY_CATEGORY[categoryId]?.find((s) => s.id === subcategoryId)?.label || '—'}</span>
            </div>
            <div className="acp-bento-cell">
              <div className="acp-bento-cell__label">
                <span className="material-symbols-outlined">face</span> {t('ageSuitability', 'العمر المناسب')}
              </div>
              <span className="acp-bento-cell__value">{ageSuitability === 'everyone' ? t('everyone', 'الجميع') : ageSuitability === 'teen' ? '+13' : '+18'}</span>
            </div>
            <div className="acp-bento-cell">
              <div className="acp-bento-cell__label">
                <span className="material-symbols-outlined">language</span> {t('country', 'البلد')}
              </div>
              <span className="acp-bento-cell__value">{countryMode === 'all' ? t('allCountries', 'جميع الدول') : countryCodes || '—'}</span>
            </div>
          </div>

          {/* Status chips */}
          <div className="acp-status-chips">
            <span className={`acp-status-chip ${captionsEnabled ? 'acp-status-chip--ok' : 'acp-status-chip--skip'}`}>
              <span className="material-symbols-outlined">{captionsEnabled ? 'check_circle' : 'skip_next'}</span>
              {t('captionColon', 'الكابشن: ')} {captionsEnabled ? t('ready', 'جاهز') : t('skipped', 'تم التخطي')}
            </span>
            <span className={`acp-status-chip ${coverAsset ? 'acp-status-chip--ok' : 'acp-status-chip--skip'}`}>
              <span className="material-symbols-outlined">{coverAsset ? 'check_circle' : 'image'}</span>
              {t('coverColon', 'الغلاف: ')} {coverAsset ? t('ready', 'جاهز') : t('default', 'افتراضي')}
            </span>
            <span className={`acp-status-chip ${effectsEnabled ? 'acp-status-chip--ok' : 'acp-status-chip--skip'}`}>
              <span className="material-symbols-outlined">{effectsEnabled ? 'check_circle' : 'skip_next'}</span>
              {t('effectsColon', 'المؤثرات: ')} {effectsEnabled
                ? (effectsMode === 'preset' && selectedPresetId
                    ? AUDIO_PRESETS.find(p => p.id === selectedPresetId)?.label ?? t('preset', 'إعداد مسبق')
                    : effectsMode === 'manual'
                      ? t('filtersCount', '{{count}} فلاتر', { count: manualFilters.filter(f => f.enabled).length })
                      : t('enabled', 'مفعّل'))
                : t('skipped', 'تم التخطي')}
            </span>
            <span className={`acp-status-chip ${mixingEnabled ? 'acp-status-chip--done' : 'acp-status-chip--skip'}`}>
              <span className="material-symbols-outlined">{mixingEnabled ? 'graphic_eq' : 'skip_next'}</span>
              {t('mixingColon', 'المكساج: ')} {mixingEnabled
                ? (selectedMixPresetId
                    ? MIXING_PRESET_DEFS.find(p => p.id === selectedMixPresetId)?.label || t('custom', 'مخصص')
                    : t('manualAdjustment', 'ضبط يدوي'))
                : t('skipped', 'تم التخطي')}
            </span>
            <span className={`acp-status-chip ${editEnabled ? 'acp-status-chip--done' : 'acp-status-chip--skip'}`}>
              <span className="material-symbols-outlined">{editEnabled ? 'content_cut' : 'skip_next'}</span>
              {t('trimColon', 'القص: ')} {editEnabled
                ? formatDuration(editedDurationMs)
                : t('skipped', 'تم التخطي')}
            </span>
          </div>

          {/* Safety / review checklist */}
          <div className="acp-safety-list">
            <h3 className="acp-safety-list__title">{t('checklist', 'قائمة التحقق')}</h3>
            <div className="acp-safety-item">
              <span className="material-symbols-outlined">check</span>
              {t('contentCompliesWithPolicy', 'المحتوى يتوافق مع سياسة الاستخدام')}
            </div>
            <div className="acp-safety-item">
              <span className="material-symbols-outlined">check</span>
              {t('noCopyrightedMaterials', 'لا يحتوي على مواد محمية بحقوق ملكية')}
            </div>
            <div className="acp-safety-item">
              <span className="material-symbols-outlined">check</span>
              {t('ageSuitabilityAppropriate', 'الفئة العمرية مناسبة للمحتوى')}
            </div>
          </div>

          {/* Edit-back links */}
          <div className="acp-editback">
            <h3 className="acp-editback__title">{t('editSections', 'تعديل الأقسام')}</h3>
            <div className="acp-editback__links">
              <button className="acp-editback__link" onClick={() => setStep(1)}><span className="material-symbols-outlined">edit_note</span> {t('info', 'المعلومات')}</button>
              <button className="acp-editback__link" onClick={() => setStep(2)}><span className="material-symbols-outlined">tune</span> {t('publishDetails', 'تفاصيل النشر')}</button>
              <button className="acp-editback__link" onClick={() => setStep(3)}><span className="material-symbols-outlined">image</span> {t('cover', 'الغلاف')}</button>
              <button className="acp-editback__link" onClick={() => setStep(4)}><span className="material-symbols-outlined">subtitles</span> {t('subtitles', 'الترجمة')}</button>
              <button className="acp-editback__link" onClick={() => setStep(5)}><span className="material-symbols-outlined">teleprompter</span> {t('teleprompter', 'الملقن')}</button>
              <button className="acp-editback__link" onClick={() => { setAudioAsset(null); uploader.reset(); recorder.reset(); setStep(6); }}><span className="material-symbols-outlined">mic</span> {t('recording', 'التسجيل')}</button>
            </div>
          </div>

          {/* Bottom navigation */}
          <div className="acp-nav-row">
            <button className="acp-btn acp-btn--ghost" onClick={() => setStep(9)} type="button">
              <span className="material-symbols-outlined" aria-hidden="true">{iconPrev}</span> {t('back', 'رجوع')}
            </button>
            <button className="acp-btn acp-btn--primary" onClick={() => saveDraft(11)} disabled={saving} type="button">
              {saving ? <><span className="acp-spinner" aria-hidden="true" /> {t('savingDots', 'حفظ...')}</> : <><span className="material-symbols-outlined" aria-hidden="true">publish</span> {t('confirmPublish', 'تأكيد النشر')}</>}
            </button>
          </div>
        </section>
      )}

      {/* ═══════════════ STEP 11: REVIEW DETAILS ═════════════════ */}
      {step === 11 && (
        <section className="acp-section">
          <h1 className="acp-section__title">
            <span className="material-symbols-outlined" aria-hidden="true">fact_check</span>
            {t('reviewDetailsAndPublish', 'مراجعة التفاصيل والنشر')}
          </h1>
          <div className="acp-form">
            {/* ── Readiness checklist ──────────────────────────────── */}
            <div className="acp-checklist">
              <div className={`acp-checklist__item ${title ? 'acp-checklist__item--ok' : 'acp-checklist__item--fail'}`}>
                <span className="material-symbols-outlined">{title ? 'check_circle' : 'cancel'}</span> {t('title', 'العنوان')}
              </div>
              <div className={`acp-checklist__item ${audioAsset ? 'acp-checklist__item--ok' : 'acp-checklist__item--fail'}`}>
                <span className="material-symbols-outlined">{audioAsset ? 'check_circle' : 'cancel'}</span> {t('audioFile', 'الملف الصوتي')}
              </div>
              <div className={`acp-checklist__item ${coverAsset ? 'acp-checklist__item--ok' : 'acp-checklist__item--warn'}`}>
                <span className="material-symbols-outlined">{coverAsset ? 'check_circle' : 'info'}</span> {t('cover', 'الغلاف')} {!coverAsset && t('defaultParentheses', '(افتراضي)')}
              </div>
            </div>

            {/* ── Info card ────────────────────────────────────────── */}
            <div className="acp-rd-card">
              <h3 className="acp-rd-card__title"><span className="material-symbols-outlined">edit_note</span> {t('info', 'المعلومات')}</h3>
              <div className="acp-rd-card__row"><span>{t('titleColon', 'العنوان:')}</span> <strong>{title || '—'}</strong></div>
              {caption && <div className="acp-rd-card__row"><span>{t('descriptionColon', 'الوصف:')}</span> {caption}</div>}
              <div className="acp-rd-card__row"><span>{t('worldColon', 'العالم:')}</span> {WORLDS.find((w) => w.key === world)?.label}</div>
              <div className="acp-rd-card__row"><span>{t('kindColon', 'النوع:')}</span> {(KINDS_BY_WORLD[world] ?? []).find((k) => k.key === kind)?.label}</div>
            </div>

            {/* ── Publish Details card ─────────────────────────────── */}
            <div className="acp-rd-card">
              <h3 className="acp-rd-card__title"><span className="material-symbols-outlined">tune</span> {t('publishDetails', 'تفاصيل النشر')}</h3>
              <div className="acp-rd-card__row"><span>{t('categoryColon', 'التصنيف:')}</span> {CATEGORIES.find((c) => c.id === categoryId)?.label || t('notSelected', '— لم يُحدد —')}</div>
              {subcategoryId && <div className="acp-rd-card__row"><span>{t('subcategoryColon', 'الفرعي:')}</span> {SUBCATEGORIES_BY_CATEGORY[categoryId]?.find((s) => s.id === subcategoryId)?.label || '—'}</div>}
              <div className="acp-rd-card__row"><span>{t('tagsColon', 'الوسوم:')}</span> {tags || t('noTags', '— بدون وسوم —')}</div>
              <div className="acp-rd-card__row"><span>{t('languageColon', 'اللغة:')}</span> {LANGUAGES.find((l) => l.code === language)?.label}</div>
              <div className="acp-rd-card__row"><span>{t('countriesColon', 'الدول:')}</span> {countryMode === 'all' ? t('allCountries', 'جميع الدول') : countryCodes || '—'}</div>
              <div className="acp-rd-card__row"><span>{t('ageSuitabilityColon', 'الفئة العمرية:')}</span> {ageSuitability === 'everyone' ? t('everyone', 'الجميع') : ageSuitability === 'teen' ? t('teenagers13', '+13 مراهقين') : t('adults18', '+18 بالغين')}</div>
              <div className="acp-rd-card__row"><span>{t('explicitContentColon', 'محتوى صريح:')}</span> {isExplicit ? t('yes', 'نعم') : t('no', 'لا')}</div>
              <div className="acp-rd-card__row"><span>{t('childContentColon', 'محتوى أطفال:')}</span> {isChildContent ? t('yes', 'نعم') : t('no', 'لا')}</div>
              <div className="acp-rd-card__row"><span>{t('publishPlacementColon', 'موضع النشر:')}</span> {placementFeed === 'main' ? t('mainFeed', 'الرئيسية') : placementFeed === 'shorts' ? t('shortsFeed', 'لقطات') : t('both', 'كلاهما')}</div>
            </div>

            {/* ── Audience card ────────────────────────────────────── */}
            <div className="acp-rd-card">
              <h3 className="acp-rd-card__title"><span className="material-symbols-outlined">group</span> {t('audienceAndSettings', 'الجمهور والإعدادات')}</h3>
              <div className="acp-rd-card__row"><span>{t('audienceColon', 'الجمهور:')}</span> {AUDIENCE_OPTIONS.find((a) => a.key === audience)?.label}</div>
              <div className="acp-rd-card__row">
                <span>{t('commentsColon', 'التعليقات:')}</span>
                <span className="material-symbols-outlined" style={{ color: commentsEnabled ? '#22c55e' : '#ef4444' }}>{commentsEnabled ? 'check_circle' : 'cancel'}</span>
                {commentsEnabled ? t('allowed', 'مسموحة') : t('closed', 'مغلقة')}
              </div>
              <div className="acp-rd-card__row">
                <span>{t('giftsColon', 'الهدايا:')}</span>
                <span className="material-symbols-outlined" style={{ color: giftsEnabled ? '#22c55e' : '#ef4444' }}>{giftsEnabled ? 'check_circle' : 'cancel'}</span>
                {giftsEnabled ? t('allowed', 'مسموحة') : t('closed', 'مغلقة')}
              </div>
              <div className="acp-rd-card__row">
                <span>{t('sharingColon', 'المشاركة:')}</span>
                <span className="material-symbols-outlined" style={{ color: sharingEnabled ? '#22c55e' : '#ef4444' }}>{sharingEnabled ? 'check_circle' : 'cancel'}</span>
                {sharingEnabled ? t('allowed', 'مسموحة') : t('closed', 'مغلقة')}
              </div>
            </div>

            {/* ── Cover card ───────────────────────────────────────── */}
            <div className="acp-rd-card">
              <h3 className="acp-rd-card__title"><span className="material-symbols-outlined">image</span> {t('cover', 'الغلاف')}</h3>
              <div className="acp-rd-card__row">
                <span>{t('statusColon', 'الحالة:')}</span>
                {coverAsset ? (
                  <>
                    <span className="material-symbols-outlined" style={{ color: '#22c55e' }}>
                      {coverAsset.sourceType === 'uploaded' ? 'image' : coverAsset.sourceType === 'ai' ? 'auto_awesome' : 'image'}
                    </span>
                    {coverAsset.sourceType === 'uploaded' ? t('uploadedImage', 'صورة مرفوعة') : coverAsset.sourceType === 'ai' ? t('smartCoverLocked', 'غلاف ذكي (مقفل)') : t('uploaded', 'مرفوع')}
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined">image</span>
                    {t('defaultNoCoverAttached', 'افتراضي — لم يُرفق غلاف')}
                  </>
                )}
              </div>
            </div>

            {/* ── Captions card ────────────────────────────────────── */}
            <div className="acp-rd-card">
              <h3 className="acp-rd-card__title"><span className="material-symbols-outlined">subtitles</span> {t('subtitles', 'الترجمة')}</h3>
              <div className="acp-rd-card__row">
                <span>{t('statusColon', 'الحالة:')}</span>
                <span className="material-symbols-outlined" style={{ color: captionsEnabled ? '#22c55e' : '#94a3b8' }}>
                  {captionsEnabled ? 'check_circle' : 'skip_next'}
                </span>
                {captionsEnabled ? t('enabled_f', 'مفعّلة') : t('skipped', 'تم التخطي')}
              </div>
              {captionsEnabled && <div className="acp-rd-card__row"><span>{t('languageColon', 'اللغة:')}</span> {LANGUAGES.find((l) => l.code === captionLang)?.label}</div>}
              {captionsEnabled && <div className="acp-rd-card__row"><span>{t('styleColon', 'النمط:')}</span> {captionStyle === 'standard' ? t('normal', 'عادي') : captionStyle === 'karaoke' ? t('karaoke', 'كاريوكي') : t('bottomSubtitles', 'ترجمة سفلية')}</div>}
            </div>

            {/* ── AutoCue card ─────────────────────────────────────── */}
            <div className="acp-rd-card">
              <h3 className="acp-rd-card__title"><span className="material-symbols-outlined">teleprompter</span> {t('teleprompter', 'الملقن')}</h3>
              <div className="acp-rd-card__row">
                <span>{t('statusColon', 'الحالة:')}</span>
                <span className="material-symbols-outlined" style={{ color: autoCueEnabled ? '#22c55e' : '#94a3b8' }}>
                  {autoCueEnabled ? 'check_circle' : 'skip_next'}
                </span>
                {autoCueEnabled ? t('enabled', 'مفعّل') : t('skipped', 'تم التخطي')}
              </div>
              {autoCueEnabled && (
                <>
                  <div className="acp-rd-card__row"><span>{t('textSourceColon', 'مصدر النص:')}</span> {t('manual', 'يدوي')}</div>
                  <div className="acp-rd-card__row"><span>{t('speedColon', 'السرعة:')}</span> {scrollSpeed === 'slow' ? t('slow', 'بطيء') : scrollSpeed === 'medium' ? t('medium', 'متوسط') : t('fast', 'سريع')}</div>
                  <div className="acp-rd-card__row"><span>{t('fontSizeColon', 'حجم الخط:')}</span> {fontSize === 'small' ? t('small', 'صغير') : fontSize === 'medium' ? t('medium', 'متوسط') : t('large', 'كبير')}</div>
                  <div className="acp-rd-card__row"><span>{t('readingModeColon', 'وضع القراءة:')}</span> {readingMode === 'lineByLine' ? t('lineByLine', 'سطر بسطر') : t('paragraphByParagraph', 'فقرة بفقرة')}</div>
                  <div className="acp-rd-card__row"><span>{t('startDelayColon', 'تأخير البداية:')}</span> {startDelay}{t('seconds', ' ثوان')}</div>
                  <div className="acp-rd-card__row"><span>{t('highlightLineColon', 'تمييز السطر:')}</span> {highlightLine ? t('enabled', 'مفعّل') : t('disabled', 'معطّل')}</div>
                  {scriptText && <div className="acp-rd-card__row acp-rd-card__row--script"><span>{t('textPreviewColon', 'معاينة النص:')}</span> <em>{scriptText.length > 120 ? scriptText.slice(0, 120) + '...' : scriptText}</em></div>}
                </>
              )}
            </div>

            {/* ── Audio card ───────────────────────────────────────── */}
            <div className="acp-rd-card">
              <h3 className="acp-rd-card__title"><span className="material-symbols-outlined">mic</span> {t('audio', 'الصوت')}</h3>
              {audioAsset ? (
                <>
                  <div className="acp-rd-card__row"><span>{t('fileColon', 'الملف:')}</span> {audioAsset.originalFileName}</div>
                  <div className="acp-rd-card__row">
                    <span>{t('sourceColon', 'المصدر:')}</span>
                    <span className="material-symbols-outlined">{audioAsset.sourceType === 'recorded' ? 'mic' : 'upload_file'}</span>
                    {audioAsset.sourceType === 'recorded' ? t('recorded', 'مسجّل') : t('uploaded', 'مرفوع')}
                  </div>
                  {audioAsset.durationMs ? <div className="acp-rd-card__row"><span>{t('durationColon', 'المدة:')}</span> {formatDuration(audioAsset.durationMs)}</div> : null}
                  {audioAsset.sizeBytes ? <div className="acp-rd-card__row"><span>{t('sizeColon', 'الحجم:')}</span> {formatFileSize(audioAsset.sizeBytes)}</div> : null}
                  <div className="acp-rd-card__row"><span>{t('typeColon', 'النوع:')}</span> {audioAsset.mimeType}</div>
                </>
              ) : (
                <div className="acp-rd-card__row acp-rd-card__row--warn">
                  <span className="material-symbols-outlined">cancel</span> {t('noAudioFileCannotPublish', 'لا يوجد ملف صوتي — لا يمكن النشر.')}
                </div>
              )}
            </div>

            {/* ── Effects & Mixing card ────────────────────────────── */}
            <div className="acp-rd-card">
              <h3 className="acp-rd-card__title"><span className="material-symbols-outlined">tune</span> {t('effectsAndMixing', 'المؤثرات والمكساج')}</h3>
              <div className="acp-rd-card__row">
                <span>{t('effectsColon', 'المؤثرات:')}</span>
                {effectsEnabled ? (
                  <>
                    <span className="material-symbols-outlined" style={{ color: 'var(--accent-teal, #2dd4bf)' }}>check_circle</span>
                    {effectsMode === 'preset' && selectedPresetId
                      ? AUDIO_PRESETS.find(p => p.id === selectedPresetId)?.label ?? t('preset', 'إعداد مسبق')
                      : effectsMode === 'manual'
                        ? t('filtersCount', '{{count}} فلاتر', { count: manualFilters.filter(f => f.enabled).length })
                        : t('enabled', 'مفعّل')}
                    <span className="acp-hint" style={{ fontSize: '0.75rem', display: 'block', marginTop: '0.25rem' }}>
                      {t('previewAvailable', 'المعاينة متاحة')}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined" style={{ color: '#94a3b8' }}>skip_next</span>
                    {t('skippedNoProcessingApplied', 'تم التخطي — لم يتم تطبيق أي معالجة')}
                  </>
                )}
              </div>
              <div className="acp-rd-card__row">
                <span>{t('mixingColon', 'المكساج:')}</span>
                {mixingEnabled ? (
                  <>
                    <span className="material-symbols-outlined" style={{ color: 'var(--accent-teal, #2dd4bf)' }}>check_circle</span>
                    {selectedMixPresetId
                      ? MIXING_PRESET_DEFS.find(p => p.id === selectedMixPresetId)?.label ?? t('custom', 'مخصص')
                      : t('manualAdjustment', 'ضبط يدوي')}
                    <span className="acp-hint" style={{ fontSize: '0.75rem', display: 'block', marginTop: '0.25rem' }}>
                      {t('yourVoiceColon', 'صوتك:')} {dbToPercent(mixTracks.find(t => t.type === 'voice')?.volumeDb ?? 0)}%
                      {masterFadeInMs > 0 && ` · Fade In: ${(masterFadeInMs/1000).toFixed(1)}${t('seconds', 'ث')}`}
                      {masterFadeOutMs > 0 && ` · Fade Out: ${(masterFadeOutMs/1000).toFixed(1)}${t('seconds', 'ث')}`}
                      {masterGainDb !== 0 && ` · ${t('masterColon', 'ماستر:')} ${masterGainDb > 0 ? '+' : ''}${masterGainDb}dB`}
                      {autoDuckEnabled && ` · ${t('autoDuckingDelayed', 'خفض تلقائي (مؤجل)')}`}
                      {mixTracks.find(t => t.type === 'musicBed' && t.storagePath) && ` · ${t('musicColon', 'موسيقى:')} ${mixTracks.find(t => t.type === 'musicBed')?.fileName || t('uploaded_f', 'مرفوعة')}`}
                      {sfxItems.length > 0 && ` · ${t('effectsColon', 'مؤثرات:')} ${sfxItems.filter(s => s.enabled).length} ${t('effect', 'مؤثر')}`}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined" style={{ color: '#94a3b8' }}>skip_next</span>
                    {t('skippedNoMixingApplied', 'تم التخطي — لم يتم تطبيق أي خلط')}
                  </>
                )}
              </div>
              <div className="acp-rd-card__row">
                <span>{t('trimAndEditColon', 'القص والتعديل:')}</span>
                {editEnabled ? (
                  <>
                    <span className="material-symbols-outlined" style={{ color: 'var(--accent-teal, #2dd4bf)' }}>check_circle</span>
                    {t('trimEnabled', 'قص مفعّل')}
                    <span className="acp-hint" style={{ fontSize: '0.75rem', display: 'block', marginTop: '0.25rem' }}>
                      {trimStartMs > 0 && `${t('startColon', 'بداية:')} ${formatDuration(trimStartMs)}`}
                      {trimStartMs > 0 && (trimEndMs > 0 || editCuts.length > 0) && ' · '}
                      {trimEndMs > 0 && trimEndMs < originalDurationMs && `${t('endColon', 'نهاية:')} ${formatDuration(trimEndMs)}`}
                      {trimEndMs > 0 && editCuts.length > 0 && ' · '}
                      {editCuts.length > 0 && `${editCuts.length} ${t('cutSection', 'مقطع محذوف')}`}
                      {` · ${t('durationColon', 'المدة:')} ${formatDuration(editedDurationMs)}`}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined" style={{ color: '#94a3b8' }}>skip_next</span>
                    {t('noTrimApplied', 'لم يتم تطبيق أي قص')}
                  </>
                )}
              </div>
            </div>

            {/* ── Moderation notice ────────────────────────────────── */}
            <div className="acp-publish-notice">
              <span className="material-symbols-outlined" aria-hidden="true">gavel</span>
              <p>{t('publishAgreementNotice', 'بالنشر، أنت توافق على أن المحتوى يتوافق مع سياسة الاستخدام. المحتوى قد يخضع لمراجعة فريق الإشراف قبل الظهور العلني.')}</p>
            </div>
            {publishError && <p className="acp-error">{publishError}</p>}
            <div className="acp-nav-row">
              <button className="acp-btn acp-btn--ghost" onClick={() => setStep(10)} type="button">
                <span className="material-symbols-outlined" aria-hidden="true">{iconPrev}</span> {t('back', 'رجوع')}
              </button>
              <button className="acp-btn acp-btn--primary acp-btn--lg" onClick={handlePublish} disabled={publishing || !audioAsset} type="button">
                {publishing ? <><span className="acp-spinner" aria-hidden="true" /> {t('publishingDots', 'جاري النشر...')}</> : <><span className="material-symbols-outlined" aria-hidden="true">publish</span> {t('publishContent', 'نشر المحتوى')}</>}
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
            <h2>{t('audioSent', 'تم إرسال الصوت')}</h2>
            <p className="acp-publish-hero__subtitle">{t('willNotifyPublishStatus', 'سنخبرك بحالة النشر فوراً')}</p>
          </div>

          {/* Status card */}
          <div className="acp-status-card">
            <span className="acp-status-card__badge">
              <span className="material-symbols-outlined">hourglass_empty</span>
              {t('underReview', 'قيد المراجعة')}
            </span>
            <p className="acp-status-card__desc">
              {t('contentReceivedSuccessfullyReviewPolicy', 'تم استلام المحتوى بنجاح. سيتم مراجعته وفقاً لسياسة الاستخدام قبل النشر العلني.')}
            </p>
            <div className="acp-reason-chips">
              {categoryId && <span className="acp-reason-chip">{CATEGORIES.find((c) => c.id === categoryId)?.label}</span>}
              <span className="acp-reason-chip">{ageSuitability === 'everyone' ? t('everyone', 'الجميع') : ageSuitability === 'teen' ? '+13' : '+18'}</span>
              <span className="acp-reason-chip">{WORLDS.find((w) => w.key === world)?.label}</span>
              <span className="acp-reason-chip">{t('autoReview', 'مراجعة تلقائية')}</span>
            </div>
          </div>

          {/* Post summary card */}
          <div className="acp-post-summary">
            {coverPreviewUrl ? (
              <img src={coverPreviewUrl} alt={t('cover', 'غلاف')} className="acp-post-summary__cover" />
            ) : (
              <div className="acp-post-summary__cover--default">
                <span className="material-symbols-outlined">music_note</span>
              </div>
            )}
            <div className="acp-post-summary__body">
              <h3 className="acp-post-summary__title">{title || t('untitled', 'بدون عنوان')}</h3>
              <div className="acp-post-summary__meta">
                {audioAsset?.durationMs ? (
                  <span className="acp-post-summary__meta-item">
                    <span className="material-symbols-outlined">schedule</span>
                    {formatDuration(audioAsset.durationMs)}
                  </span>
                ) : null}
                <span className="acp-post-summary__meta-item">
                  <span className="material-symbols-outlined">{captionsEnabled ? 'subtitles' : 'subtitles_off'}</span>
                  {captionsEnabled ? t('subtitles', 'ترجمة') : t('noSubtitles', 'بدون ترجمة')}
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
              <div className="acp-timeline__info"><p className="acp-timeline__info-label">{t('audioFileUploaded', 'تم رفع الملف الصوتي')}</p></div>
            </div>
            <div className="acp-timeline__step acp-timeline__step--done">
              <div className="acp-timeline__dot"><span className="material-symbols-outlined">check</span></div>
              <div className="acp-timeline__info"><p className="acp-timeline__info-label">{t('dataSaved', 'تم حفظ البيانات')}</p></div>
            </div>
            <div className="acp-timeline__step acp-timeline__step--active">
              <div className="acp-timeline__dot"><span className="material-symbols-outlined">hourglass_empty</span></div>
              <div className="acp-timeline__info"><p className="acp-timeline__info-label">{t('processingAndChecking', 'جاري الفحص والمعالجة')}</p></div>
            </div>
            <div className="acp-timeline__step acp-timeline__step--pending">
              <div className="acp-timeline__dot"><span className="material-symbols-outlined">schedule</span></div>
              <div className="acp-timeline__info"><p className="acp-timeline__info-label">{t('publicPublish', 'النشر العلني')}</p></div>
            </div>
          </div>

          {/* Info note */}
          <div className="acp-publish-notice acp-publish-notice--info">
            <span className="material-symbols-outlined" aria-hidden="true">info</span>
            <p>{t('someAccountsInstantPublishStatusPage', 'بعض الحسابات تتمتع بميزة النشر الفوري. حالة النشر يمكن متابعتها من صفحة المحتوى.')}</p>
          </div>

          {/* Action buttons */}
          <div className="acp-nav-row" style={{ justifyContent: 'center' }}>
            <button className="acp-btn acp-btn--primary" onClick={() => navigate(`/audio/${publishResult.contentId}`)} type="button">
              <span className="material-symbols-outlined" aria-hidden="true">play_circle</span> {t('viewDraft', 'عرض المسودة')}
            </button>
            <button className="acp-btn acp-btn--ghost" onClick={() => navigate(-1)} type="button">
              <span className="material-symbols-outlined" aria-hidden="true">{iconPrev}</span> {t('back', 'رجوع')}
            </button>
            <button className="acp-btn acp-btn--ghost" onClick={() => navigate('/create/audio')} type="button">
              <span className="material-symbols-outlined" aria-hidden="true">add</span> {t('createNewContent', 'إنشاء محتوى جديد')}
            </button>
          </div>
        </section>
      )}
    </main>
  );
}
