/**
 * Sound Platform â€” Audio Create Page (Canonical 12-Step Wizard)
 * ==============================================================
 * Phase:   8-D.2 (Enhanced Audio Creation Flow)
 * Updated: 2026-05-28
 *
 * Canonical flow (13 states, 12 in-wizard + exit to detail player):
 *   1.  Info â€” title, description, world, kind
 *   2.  Publish Details â€” category, subcategory, tags, language, country, age,
 *       child content, audience, placement, playlist, toggles
 *   3.  Cover (optional) â€” upload / camera / AI / skip
 *   4.  Captions setup (optional) â€” enable, language, style
 *   5.  AutoCue (optional) â€” script, speed, font, mode, delay, highlight
 *   6.  Record / Upload â€” normal or AutoCue mode
 *   7.  Review â€” playback, replace, confirm
 *   8.  Effects (optional, gated placeholder)
 *   9.  Mixing (optional, gated placeholder)
 *   10. Final Preview â€” listener-style + edit-back links
 *   11. Review Details â€” checklist
 *   12. Publish Result â€” success/pending/fail + open item
 *
 * Route: /create/audio
 * Query: ?source=record|upload â†’ pre-selects tab in step 6
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

// â”€â”€ Step enum â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

type WizardStep = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

const STEP_LABELS: Record<WizardStep, string> = {
  1: 'Ø§Ù„Ù…Ø¹Ù„ÙˆÙ…Ø§Øª',
  2: 'ØªÙØ§ØµÙŠÙ„ Ø§Ù„Ù†Ø´Ø±',
  3: 'Ø§Ù„ØºÙ„Ø§Ù',
  4: 'Ø§Ù„ØªØ±Ø¬Ù…Ø©',
  5: 'Ø§Ù„Ù…Ù„Ù‚Ù†',
  6: 'Ø§Ù„ØªØ³Ø¬ÙŠÙ„',
  7: 'Ø§Ù„Ù…Ø±Ø§Ø¬Ø¹Ø©',
  8: 'Ø§Ù„Ù…Ø¤Ø«Ø±Ø§Øª',
  9: 'Ø§Ù„Ù…ÙƒØ³Ø§Ø¬',
  10: 'Ø§Ù„Ù…Ø¹Ø§ÙŠÙ†Ø©',
  11: 'Ø§Ù„ØªØ£ÙƒÙŠØ¯',
  12: 'Ø§Ù„Ù†ØªÙŠØ¬Ø©',
};

const ALL_STEPS: WizardStep[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
type Step6Tab = 'record' | 'upload';

const useAudioOptions = (t: any) => {
  const WORLDS: { key: string; label: string }[] = [
    { key: 'general', label: t('world_general', 'Ø¹Ø§Ù…') },
    { key: 'plus', label: t('world_plus', 'Ø¨Ù„Ø³') },
    { key: 'music', label: t('world_music', 'Ù…ÙˆØ³ÙŠÙ‚Ù‰') }
  ];

  const KINDS_BY_WORLD: Record<string, { key: any; label: string }[]> = {
    general: [
      { key: 'shortAudio', label: t('kind_shortAudio', 'Ù…Ù‚Ø·Ø¹ Ù‚ØµÙŠØ±') },
      { key: 'longAudio', label: t('kind_longAudio', 'ØµÙˆØª Ø·ÙˆÙŠÙ„') },
      { key: 'podcast', label: t('kind_podcast', 'Ø¨ÙˆØ¯ÙƒØ§Ø³Øª') }
    ],
    plus: [
      { key: 'shortAudio', label: t('kind_shortAudio', 'Ù…Ù‚Ø·Ø¹ Ù‚ØµÙŠØ±') },
      { key: 'longAudio', label: t('kind_longAudio', 'ØµÙˆØª Ø·ÙˆÙŠÙ„') },
      { key: 'podcast', label: t('kind_podcast', 'Ø¨ÙˆØ¯ÙƒØ§Ø³Øª') }
    ],
    music: [
      { key: 'song', label: t('kind_song', 'Ø£ØºÙ†ÙŠØ©') },
      { key: 'albumTrack', label: t('kind_album_track', 'Ù…Ù‚Ø·Ø¹ Ø£Ù„Ø¨ÙˆÙ…') }
    ]
  };

  const CATEGORIES = [
    { id: 'culture', label: t('cat_culture', 'Ø«Ù‚Ø§ÙØ©') },
    { id: 'entertainment', label: t('cat_entertainment', 'ØªØ±ÙÙŠÙ‡') },
    { id: 'education', label: t('cat_education', 'ØªØ¹Ù„ÙŠÙ…') },
    { id: 'religion', label: t('cat_religion', 'Ø¯ÙŠÙ†ÙŠ') },
    { id: 'sports', label: t('cat_sports', 'Ø±ÙŠØ§Ø¶Ø©') },
    { id: 'news', label: t('cat_news', 'Ø£Ø®Ø¨Ø§Ø±') },
    { id: 'technology', label: t('cat_technology', 'ØªÙ‚Ù†ÙŠØ©') },
    { id: 'other', label: t('cat_other', 'Ø£Ø®Ø±Ù‰') },
  ];

  const SUBCATEGORIES_BY_CATEGORY: Record<string, { id: string; label: string }[]> = {
    culture: [
      { id: 'creativity', label: t('subcat_creativity', 'Ø¥Ø¨Ø¯Ø§Ø¹ ÙˆÙ‡Ø¯ÙˆØ¡') },
      { id: 'visual_arts', label: t('subcat_visual_arts', 'ÙÙ†ÙˆÙ† Ø¨ØµØ±ÙŠØ©') },
      { id: 'literature', label: t('subcat_literature', 'Ø£Ø¯Ø¨ ÙˆØ´Ø¹Ø±') },
    ],
    entertainment: [
      { id: 'comedy', label: t('subcat_comedy', 'ÙƒÙˆÙ…ÙŠØ¯ÙŠØ§') },
      { id: 'drama', label: t('subcat_drama', 'Ø¯Ø±Ø§Ù…Ø§') },
      { id: 'talk_shows', label: t('subcat_talk_shows', 'Ø¨Ø±Ø§Ù…Ø¬ Ø­ÙˆØ§Ø±ÙŠØ©') },
    ],
    education: [
      { id: 'science', label: t('subcat_science', 'Ø¹Ù„ÙˆÙ…') },
      { id: 'technology', label: t('subcat_technology_edu', 'ØªÙ‚Ù†ÙŠØ©') },
      { id: 'languages', label: t('subcat_languages', 'Ù„ØºØ§Øª') },
    ],
    religion: [
      { id: 'quran', label: t('subcat_quran', 'Ù‚Ø±Ø¢Ù†') },
      { id: 'lectures', label: t('subcat_lectures', 'Ø¯Ø±ÙˆØ³ ÙˆÙ…Ø­Ø§Ø¶Ø±Ø§Øª') },
      { id: 'stories', label: t('subcat_stories', 'Ù‚ØµØµ Ø¯ÙŠÙ†ÙŠØ©') },
    ],
    sports: [
      { id: 'football', label: t('subcat_football', 'ÙƒØ±Ø© Ù‚Ø¯Ù…') },
      { id: 'fitness', label: t('subcat_fitness', 'Ù„ÙŠØ§Ù‚Ø© ÙˆØµØ­Ø©') },
      { id: 'analysis', label: t('subcat_analysis', 'ØªØ­Ù„ÙŠÙ„ Ø±ÙŠØ§Ø¶ÙŠ') },
    ],
    news: [
      { id: 'local', label: t('subcat_local', 'Ù…Ø­Ù„ÙŠ') },
      { id: 'international', label: t('subcat_international', 'Ø¯ÙˆÙ„ÙŠ') },
      { id: 'economy', label: t('subcat_economy', 'Ø§Ù‚ØªØµØ§Ø¯') },
    ],
    technology: [
      { id: 'ai', label: t('subcat_ai', 'Ø°ÙƒØ§Ø¡ Ø§ØµØ·Ù†Ø§Ø¹ÙŠ') },
      { id: 'programming', label: t('subcat_programming', 'Ø¨Ø±Ù…Ø¬Ø©') },
      { id: 'reviews', label: t('subcat_reviews', 'Ù…Ø±Ø§Ø¬Ø¹Ø§Øª') },
    ],
  };

  const AUDIENCE_OPTIONS: { key: AudienceType; label: string; icon: string }[] = [
    { key: 'public', label: t('audience_public', 'Ø¹Ø§Ù… â€” Ø§Ù„Ø¬Ù…ÙŠØ¹'), icon: 'visibility' },
    { key: 'followers', label: t('audience_followers', 'Ø§Ù„Ù…ØªØ§Ø¨Ø¹ÙˆÙ† ÙÙ‚Ø·'), icon: 'group' },
    { key: 'following', label: t('audience_following', 'Ù…Ù† Ø£ØªØ§Ø¨Ø¹Ù‡Ù… ÙÙ‚Ø·'), icon: 'person_add' },
    { key: 'friends', label: t('audience_friends', 'Ø§Ù„Ø£ØµØ¯Ù‚Ø§Ø¡ ÙÙ‚Ø·'), icon: 'handshake' },
    { key: 'specificList', label: t('audience_specificList', 'Ù‚Ø§Ø¦Ù…Ø© Ù…Ø­Ø¯Ø¯Ø©'), icon: 'list' },
    { key: 'listExcept', label: t('audience_listExcept', 'Ø§Ù„Ø¬Ù…ÙŠØ¹ Ø¹Ø¯Ø§ Ù‚Ø§Ø¦Ù…Ø©'), icon: 'block' },
    { key: 'selectedPeople', label: t('audience_selectedPeople', 'Ø£Ø´Ø®Ø§Øµ Ù…Ø®ØªØ§Ø±ÙˆÙ†'), icon: 'person_search' },
    { key: 'onlyMe', label: t('audience_onlyMe', 'Ø£Ù†Ø§ ÙÙ‚Ø·'), icon: 'person' },
  ];

  const LANGUAGES = [
    { code: 'ar', label: t('lang_ar', 'Ø§Ù„Ø¹Ø±Ø¨ÙŠØ©') },
    { code: 'en', label: 'English' },
    { code: 'fr', label: 'FranÃ§ais' },
    { code: 'es', label: 'EspaÃ±ol' },
    { code: 'other', label: t('lang_other', 'Ø£Ø®Ø±Ù‰') },
  ];

  const MUSIC_SOURCE_OPTIONS = [
    { id: 'none', label: t('music_none', 'Ø¨Ø¯ÙˆÙ† Ù…ÙˆØ³ÙŠÙ‚Ù‰'), icon: 'music_off', available: true },
    { id: 'uploaded', label: t('music_uploaded', 'Ø±ÙØ¹ Ù…Ù† Ø§Ù„Ø¬Ù‡Ø§Ø²'), icon: 'upload_file', available: true },
    { id: 'library', label: t('music_library', 'Ù…ÙƒØªØ¨Ø© Sound'), icon: 'library_music', available: false },
  ];

  const SFX_SOURCE_OPTIONS = [
    { id: 'none', label: t('sfx_none', 'Ø¨Ø¯ÙˆÙ† Ù…Ø¤Ø«Ø±Ø§Øª'), icon: 'music_off', available: true },
    { id: 'uploaded', label: t('sfx_uploaded', 'Ø±ÙØ¹ Ù…Ù† Ø§Ù„Ø¬Ù‡Ø§Ø²'), icon: 'upload_file', available: true },
    { id: 'library', label: t('sfx_library', 'Ù…ÙƒØªØ¨Ø© Ø³Ø§ÙˆÙ†Ø¯ â€” Ù‚Ø±ÙŠØ¨Ø§Ù‹'), icon: 'library_music', available: false },
  ];

  return { WORLDS, KINDS_BY_WORLD, CATEGORIES, SUBCATEGORIES_BY_CATEGORY, AUDIENCE_OPTIONS, LANGUAGES, MUSIC_SOURCE_OPTIONS, SFX_SOURCE_OPTIONS };
};

/** Max SFX items â€” configurable, generous default */
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

// â”€â”€ Page Component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
    1: t('step1_info', 'Ø§Ù„Ù…Ø¹Ù„ÙˆÙ…Ø§Øª'),
    2: t('step2_publish', 'ØªÙØ§ØµÙŠÙ„ Ø§Ù„Ù†Ø´Ø±'),
    3: t('step3_cover', 'Ø§Ù„ØºÙ„Ø§Ù'),
    4: t('step4_captions', 'Ø§Ù„ØªØ±Ø¬Ù…Ø©'),
    5: t('step5_prompter', 'Ø§Ù„Ù…Ù„Ù‚Ù†'),
    6: t('step6_recording', 'Ø§Ù„ØªØ³Ø¬ÙŠÙ„'),
    7: t('step7_review', 'Ø§Ù„Ù…Ø±Ø§Ø¬Ø¹Ø©'),
    8: t('step8_effects', 'Ø§Ù„Ù…Ø¤Ø«Ø±Ø§Øª'),
    9: t('step9_mixing', 'Ø§Ù„Ù…ÙƒØ³Ø§Ø¬'),
    10: t('step10_preview', 'Ø§Ù„Ù…Ø¹Ø§ÙŠÙ†Ø©'),
    11: t('step11_confirm', 'Ø§Ù„ØªØ£ÙƒÙŠØ¯'),
    12: t('step12_result', 'Ø§Ù„Ù†ØªÙŠØ¬Ø©'),
  };



  // â”€â”€ Wizard state â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [step, setStep] = useState<WizardStep>(1);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [draftId, setDraftId] = useState<string | null>(null);

  // â”€â”€ Step 1: Info â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [title, setTitle] = useState('');
  const [caption, setCaption] = useState('');
  const [world, setWorld] = useState<WorldId>('general');
  const [kind, setKind] = useState<AudioContentKind>('longAudio');

  const { categoryOptions, getSubcategoryOptions } = useCategories(world);

  // â”€â”€ Step 2: Publish Details â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

  // â”€â”€ Step 3: Cover â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [coverAsset, setCoverAsset] = useState<CoverAsset | null>(null);
  const [coverPreviewUrl, setCoverPreviewUrl] = useState<string | null>(null);
  const [coverUploading, setCoverUploading] = useState(false);
  const [coverProgress, setCoverProgress] = useState(0);
  const [coverError, setCoverError] = useState<string | null>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  // â”€â”€ Step 4: Captions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

  // â”€â”€ Step 5: AutoCue â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [autoCueEnabled, setAutoCueEnabled] = useState(false);
  const [scriptText, setScriptText] = useState('');
  const [scrollSpeed, setScrollSpeed] = useState<'slow' | 'medium' | 'fast'>('medium');
  const [fontSize, setFontSize] = useState<'small' | 'medium' | 'large'>('medium');
  const [readingMode, setReadingMode] = useState<'lineByLine' | 'paragraphByParagraph'>('lineByLine');
  const [startDelay, setStartDelay] = useState(3);
  const [highlightLine, setHighlightLine] = useState(true);

  // â”€â”€ Step 6: Record / Upload â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

  // â”€â”€ Step 8: Effects â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

  // â”€â”€ Step 9: Mixing â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

  // â”€â”€ Step 7: Trim/Cut editing (Phase 8-L) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

  // â”€â”€ Phase 8-L.1: Draft Render Pipeline Preview â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
    // No stages enabled â€” original audio is the preview
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

  // â”€â”€ Phase 8-L.1: Client-side waveform generation â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

  // â”€â”€ Trim/cut-aware playback (client-side preview) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

  /** Waveform playback tick â€” handles trim bounds + cut skipping */
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

  // â”€â”€ Phase 8-L.1: SFX items state â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [sfxItems, setSfxItems] = useState<AudioSfxItem[]>([]);
  const sfxFileRef = useRef<HTMLInputElement>(null);
  const [sfxUploading, setSfxUploading] = useState(false);

  // â”€â”€ Phase 8-L.1: Music bed upload state â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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


  // â”€â”€ Step 10: Preview playback â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

  // â”€â”€ Step 12: Publish â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [publishing, setPublishing] = useState(false);
  const [publishResult, setPublishResult] = useState<{ contentId: string; status: string } | null>(null);
  const [publishError, setPublishError] = useState<string | null>(null);

  // â”€â”€ Update kind when world changes â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  useEffect(() => {
    const kinds = KINDS_BY_WORLD[world];
    if (kinds && kinds.length > 0 && !kinds.some((k) => k.key === kind)) {
      setKind(kinds[0]!.key);
    }
  }, [world, kind]);

  // â”€â”€ Reset subcategory when category changes â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  useEffect(() => {
    setSubcategoryId('');
  }, [categoryId]);

  // â”€â”€ Save draft helper â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
      const msg = err instanceof Error ? err.message : t('draftSaveFailed', 'ÙØ´Ù„ Ø­ÙØ¸ Ø§Ù„Ù…Ø³ÙˆØ¯Ø©.');
      setSaveError(msg);
    } finally {
      setSaving(false);
    }
  };

  // â”€â”€ Step 6: Handle recording upload â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handleUploadRecording = () => {
    if (!recorder.audioBlob || !draftId || !uid) return;
    const ext = recorder.mimeType?.includes('webm') ? 'webm'
      : recorder.mimeType?.includes('mp4') ? 'mp4'
      : recorder.mimeType?.includes('ogg') ? 'ogg' : 'webm';
    const fileName = `recording_${Date.now()}.${ext}`;
    const mime = recorder.mimeType ?? 'audio/webm';
    uploader.uploadAudio(recorder.audioBlob, uid, draftId, fileName, mime);
  };

  // â”€â”€ Step 6: Handle file selection â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileError(null);
    setFileDurationMs(null);
    if (!file.type.startsWith('audio/')) {
      setFileError(t('fileMustBeAudio', 'ÙŠØ¬Ø¨ Ø£Ù† ÙŠÙƒÙˆÙ† Ø§Ù„Ù…Ù„Ù Ù…Ù† Ù†ÙˆØ¹ ØµÙˆØªÙŠ (audio/*).'));
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

  // â”€â”€ Step 6: Attach uploaded asset â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
        const msg = err instanceof Error ? err.message : t('attachFailed', 'ÙØ´Ù„ Ø±Ø¨Ø· Ø§Ù„Ù…Ù„Ù Ø§Ù„ØµÙˆØªÙŠ Ø¨Ø§Ù„Ù…Ø³ÙˆØ¯Ø©.');
        setAttachError(msg);
      } finally {
        setAttaching(false);
      }
    };
    attach();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uploader.state, uploader.storagePath, draftId]);

  // â”€â”€ Cover file select â†’ upload to Storage â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handleCoverSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;

    // Show local preview immediately
    const url = URL.createObjectURL(file);
    setCoverPreviewUrl(url);
    setCoverError(null);

    // Must have a draft to upload
    if (!draftId || !uid) {
      setCoverError(t('saveDraftFirstForCover', 'ÙŠØ¬Ø¨ Ø­ÙØ¸ Ø§Ù„Ù…Ø³ÙˆØ¯Ø© Ø£ÙˆÙ„Ø§Ù‹ Ù„Ø±ÙØ¹ Ø§Ù„ØºÙ„Ø§Ù.'));
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
        setCoverError(err.message || t('coverUploadFailed', 'ÙØ´Ù„ Ø±ÙØ¹ Ø§Ù„ØºÙ„Ø§Ù.'));
      },
      async () => {
        // Upload done â†’ build coverAsset with storagePath
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
          // Non-fatal â€” cover is uploaded, will be saved on next step transition
        }
      },
    );
  };

  // â”€â”€ Publish handler â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
      const msg = err instanceof Error ? err.message : t('publishFailed', 'ÙØ´Ù„ Ø§Ù„Ù†Ø´Ø±.');
      setPublishError(msg);
    } finally {
      setPublishing(false);
    }
  };

  // â”€â”€ Helper: generate decorative waveform bars â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const waveformBars = Array.from({ length: 40 }, (_, i) => {
    const h = 20 + Math.sin(i * 0.5) * 30 + Math.random() * 50;
    return Math.round(h);
  });

  // â”€â”€ Render â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  return (
    <main className="page acp-page" dir={i18n.dir()}>
      {/* â”€â”€ Step rail â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
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

      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• STEP 1: INFO â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
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

      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• STEP 2: PUBLISH DETAILS â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      {step === 2 && (
        <section className="acp-section">
          <h1 className="acp-section__title">
            <span className="material-symbols-outlined" aria-hidden="true">tune</span>
            {t('publicationDetails')}
          </h1>
          <div className="acp-form">
            {/* Category â€” glass dropdown */}
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

            {/* Subcategory â€” glass dropdown, only when category selected */}
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

            {/* Language â€” glass dropdown */}
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

            {/* Audience â€” card list with icons */}
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
              {t('publishingLocation', 'Ù…ÙˆØ¶Ø¹ Ø§Ù„Ù†Ø´Ø±')}
              <div className="acp-cards-row">
                <button className={`acp-card-btn ${placementFeed === 'main' ? 'acp-card-btn--selected' : ''}`} onClick={() => setPlacementFeed('main')} type="button">
                  <span className="material-symbols-outlined">home</span>
                  <span>{t('main', 'Ø§Ù„Ø±Ø¦ÙŠØ³ÙŠØ©')}</span>
                </button>
                <button className={`acp-card-btn ${placementFeed === 'shorts' ? 'acp-card-btn--selected' : ''}`} onClick={() => setPlacementFeed('shorts')} type="button">
                  <span className="material-symbols-outlined">movie</span>
                  <span>{t('shots', 'Ù„Ù‚Ø·Ø§Øª')}</span>
                </button>
              </div>
            </div>

            {/* Playlist intent (Phase 8-I) */}
            <div className="acp-label">
              {t('playlist', 'Ù‚Ø§Ø¦Ù…Ø© Ø§Ù„ØªØ´ØºÙŠÙ„')}
              <div className="acp-playlist-cards">
                <button className={`acp-playlist-card ${playlistIntent === 'none' ? 'acp-playlist-card--selected' : ''}`} onClick={() => { setPlaylistIntent('none'); setSelectedPlaylistId(''); setNewPlaylistName(''); setPlaylistDropdownOpen(false); }} type="button">
                  <span className="material-symbols-outlined">playlist_remove</span>
                  {t('withoutAMenu', 'Ø¨Ø¯ÙˆÙ† Ù‚Ø§Ø¦Ù…Ø©')}
                </button>
                <button className={`acp-playlist-card ${playlistIntent === 'existing' ? 'acp-playlist-card--selected' : ''}`} onClick={async () => { setPlaylistIntent('existing'); setNewPlaylistName(''); if (!playlistsLoaded && !playlistsLoading) { setPlaylistsLoading(true); try { const res = await callGetUserPlaylists({}); setUserPlaylists(res.data.playlists || []); setPlaylistsLoaded(true); } catch { setUserPlaylists([]); setPlaylistsLoaded(true); } finally { setPlaylistsLoading(false); } } setPlaylistDropdownOpen(true); }} type="button">
                  <span className="material-symbols-outlined">playlist_add</span>
                  {t('addToExistingPlaylist', 'Ø¥Ø¶Ø§ÙØ© Ù„Ù‚Ø§Ø¦Ù…Ø© Ù…ÙˆØ¬ÙˆØ¯Ø©')}
                </button>
                <button className={`acp-playlist-card ${playlistIntent === 'new' ? 'acp-playlist-card--selected' : ''}`} onClick={() => { setPlaylistIntent('new'); setSelectedPlaylistId(''); setPlaylistDropdownOpen(false); }} type="button">
                  <span className="material-symbols-outlined">queue_music</span>
                  {t('createNewPlaylist', 'Ø¥Ù†Ø´Ø§Ø¡ Ù‚Ø§Ø¦Ù…Ø© Ø¬Ø¯ÙŠØ¯Ø©')}
                </button>
              </div>

              {/* Existing playlist dropdown */}
              {playlistIntent === 'existing' && (
                <div className="acp-playlist-select">
                  {playlistsLoading ? (
                    <div className="acp-playlist-loading">
                      <span className="material-symbols-outlined acp-spin">progress_activity</span>
                      <span>{t('loadingPlaylists', 'Ø¬Ø§Ø±Ù ØªØ­Ù…ÙŠÙ„ Ø§Ù„Ù‚ÙˆØ§Ø¦Ù…...')}</span>
                    </div>
                  ) : userPlaylists.length === 0 ? (
                    <div className="acp-playlist-empty">
                      <span className="material-symbols-outlined">info</span>
                      <span>{t('noPlaylistsYet', 'Ù„Ø§ ØªÙˆØ¬Ø¯ Ù‚ÙˆØ§Ø¦Ù… ØªØ´ØºÙŠÙ„ Ø¨Ø¹Ø¯. ÙŠÙ…ÙƒÙ†Ùƒ Ø¥Ù†Ø´Ø§Ø¡ Ù‚Ø§Ø¦Ù…Ø© Ø¬Ø¯ÙŠØ¯Ø©.')}</span>
                    </div>
                  ) : (
                    <div className="acp-glass-dropdown">
                      <button className="acp-glass-dropdown__trigger" onClick={() => setPlaylistDropdownOpen(!playlistDropdownOpen)} type="button">
                        <span>{selectedPlaylistId ? userPlaylists.find(p => p.playlistId === selectedPlaylistId)?.title || t('unknownPlaylist', 'Ù‚Ø§Ø¦Ù…Ø© ØºÙŠØ± Ù…Ø¹Ø±ÙˆÙØ©') : t('selectPlaylist', 'Ø§Ø®ØªØ± Ù‚Ø§Ø¦Ù…Ø© ØªØ´ØºÙŠÙ„...')}</span>
                        <span className="material-symbols-outlined">{playlistDropdownOpen ? 'expand_less' : 'expand_more'}</span>
                      </button>
                      {playlistDropdownOpen && (
                        <div className="acp-glass-dropdown__menu">
                          {userPlaylists.map((pl) => (
                            <button key={pl.playlistId} className={`acp-glass-dropdown__option ${selectedPlaylistId === pl.playlistId ? 'acp-glass-dropdown__option--selected' : ''}`} onClick={() => { setSelectedPlaylistId(pl.playlistId); setPlaylistDropdownOpen(false); }} type="button">
                              <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>queue_music</span>
                              <span className="acp-playlist-item-info">
                                <span className="acp-playlist-item-title">{pl.title}</span>
                                <span className="acp-playlist-item-meta">{pl.itemCount} {t('segment', 'Ù…Ù‚Ø·Ø¹')} Â· {pl.visibility === 'public' ? t('public', 'Ø¹Ø§Ù…Ø©') : t('private', 'Ø®Ø§ØµØ©')}</span>
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
                    placeholder={t('newPlaylistNamePlaceholder', 'Ø§Ø³Ù… Ø§Ù„Ù‚Ø§Ø¦Ù…Ø© Ø§Ù„Ø¬Ø¯ÙŠØ¯Ø©...')}
                    value={newPlaylistName}
                    onChange={(e) => setNewPlaylistName(e.target.value)}
                    maxLength={80}
                    autoFocus
                  />
                  <div className="acp-playlist-new-actions" style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                    <div className="acp-glass-dropdown" style={{ flex: 1, position: 'relative' }}>
                      <button className="acp-glass-dropdown__trigger" onClick={() => setPrivacyDropdownOpen(!privacyDropdownOpen)} type="button" style={{ width: '100%' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '1.2rem', color: 'inherit' }}>{AUDIENCE_OPTIONS.find(a => a.key === newPlaylistVisibility)?.icon || 'visibility'}</span>
                        <span style={{ flex: 1, textAlign: 'start' }}>{AUDIENCE_OPTIONS.find(a => a.key === newPlaylistVisibility)?.label || t('public', 'Ø¹Ø§Ù…')}</span>
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
                      {playlistCreating ? <span className="acp-spinner" /> : <><span className="material-symbols-outlined">save</span> {t('save', 'Ø­ÙØ¸')}</>}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="acp-toggles-group">
              <h3 className="acp-toggles-group__title">{t('publishSettings', 'Ø¥Ø¹Ø¯Ø§Ø¯Ø§Øª Ø§Ù„Ù†Ø´Ø±')}</h3>
              <label className="acp-label acp-label--row"><input type="checkbox" checked={commentsEnabled} onChange={(e) => setCommentsEnabled(e.target.checked)} /> {t('allowComments', 'Ø§Ù„Ø³Ù…Ø§Ø­ Ø¨Ø§Ù„ØªØ¹Ù„ÙŠÙ‚Ø§Øª')}</label>
              <label className="acp-label acp-label--row"><input type="checkbox" checked={giftsEnabled} onChange={(e) => setGiftsEnabled(e.target.checked)} /> {t('allowGifts', 'Ø§Ù„Ø³Ù…Ø§Ø­ Ø¨Ø§Ù„Ù‡Ø¯Ø§ÙŠØ§')}</label>
              <label className="acp-label acp-label--row"><input type="checkbox" checked={sharingEnabled} onChange={(e) => setSharingEnabled(e.target.checked)} /> {t('allowSharing', 'Ø§Ù„Ø³Ù…Ø§Ø­ Ø¨Ø§Ù„Ù…Ø´Ø§Ø±ÙƒØ©')}</label>

              {/* Schedule â€” disabled with gate badge */}
              <div className="acp-toggle-row" style={{ opacity: 0.5, cursor: 'not-allowed' }}>
                <span className="material-symbols-outlined">schedule_send</span>
                <span>{t('schedulePublish', 'Ø¬Ø¯ÙˆÙ„Ø© Ø§Ù„Ù†Ø´Ø±')}</span>
                <span className="acp-gate-badge">{t('byTier', 'Ø­Ø³Ø¨ Ø§Ù„Ø¨Ø§Ù‚Ø©')}</span>
                <button className="acp-toggle acp-toggle--disabled" disabled type="button">
                  <span className="acp-toggle__knob" />
                </button>
              </div>
            </div>

            {saveError && <p className="acp-error">{saveError}</p>}
            <div className="acp-nav-row">
              <button className="acp-btn acp-btn--ghost" onClick={() => setStep(1)} type="button">
                <span className="material-symbols-outlined" aria-hidden="true">{iconPrev}</span> {t('back', 'Ø±Ø¬ÙˆØ¹')}
              </button>
              <button className="acp-btn acp-btn--primary" onClick={() => saveDraft(3)} disabled={saving}>
                {saving ? <><span className="acp-spinner" aria-hidden="true" /> {t('saving', 'Ø¬Ø§Ø±ÙŠ Ø§Ù„Ø­ÙØ¸...')}</> : <><span className="material-symbols-outlined" aria-hidden="true">{iconNext}</span> {t('theNext', 'Ø§Ù„ØªØ§Ù„ÙŠ')}</>}
              </button>
            </div>
          </div>
        </section>
      )}

      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• STEP 3: COVER (OPTIONAL) â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      {step === 3 && (
        <section className="acp-section">
          <h1 className="acp-section__title">
            <span className="material-symbols-outlined" aria-hidden="true">image</span>
            {t('contentCover', 'ØºÙ„Ø§Ù Ø§Ù„Ù…Ø­ØªÙˆÙ‰')}
            <span className="acp-badge acp-badge--optional">{t('optional', 'Ø§Ø®ØªÙŠØ§Ø±ÙŠ')}</span>
          </h1>
          <div className="acp-form">
            {coverPreviewUrl && (
              <div className="acp-cover-preview">
                <img src={coverPreviewUrl} alt={t('coverPreview', 'Ù…Ø¹Ø§ÙŠÙ†Ø© Ø§Ù„ØºÙ„Ø§Ù')} className="acp-cover-preview__img" />
              </div>
            )}
            {coverUploading && (
              <div className="acp-progress">
                <div className="acp-progress__bar">
                  <div className="acp-progress__fill" style={{ width: `${coverProgress}%` }} />
                </div>
                <p className="acp-progress__text">{t('uploadingCover', 'Ø¬Ø§Ø±ÙŠ Ø±ÙØ¹ Ø§Ù„ØºÙ„Ø§Ù...')} {coverProgress}%</p>
              </div>
            )}
            {coverError && <p className="acp-error">{coverError}</p>}
            {coverAsset?.storagePath && !coverUploading && (
              <p className="acp-hint">
                <span className="material-symbols-outlined acp-hint__icon" aria-hidden="true">check_circle</span>
                {t('coverUploadedSuccessfully', 'ØªÙ… Ø±ÙØ¹ Ø§Ù„ØºÙ„Ø§Ù Ø¨Ù†Ø¬Ø§Ø­.')}
              </p>
            )}
            <div className="acp-cover-actions">
              <button className="acp-btn acp-btn--outline" onClick={() => coverInputRef.current?.click()} type="button" disabled={coverUploading}>
                <span className="material-symbols-outlined" aria-hidden="true">upload</span> {coverUploading ? t('uploading', 'Ø¬Ø§Ø±ÙŠ Ø§Ù„Ø±ÙØ¹...') : t('uploadImage', 'Ø±ÙØ¹ ØµÙˆØ±Ø©')}
              </button>
              <input ref={coverInputRef} type="file" accept="image/*" onChange={handleCoverSelect} className="acp-file-input" tabIndex={-1} />
              <button className="acp-btn acp-btn--outline acp-btn--gated" disabled type="button">
                <span className="material-symbols-outlined" aria-hidden="true">photo_camera</span> {t('camera', 'ÙƒØ§Ù…ÙŠØ±Ø§')}
                <span className="acp-gate-badge">{t('soon', 'Ù‚Ø±ÙŠØ¨Ø§Ù‹')}</span>
              </button>
              <button className="acp-btn acp-btn--outline acp-btn--gated" disabled type="button">
                <span className="material-symbols-outlined" aria-hidden="true">auto_awesome</span> {t('smartCoverAI', 'ØºÙ„Ø§Ù Ø°ÙƒÙŠ (AI)')}
                <span className="acp-gate-badge">{t('paid', 'Ù…Ø¯ÙÙˆØ¹')}</span>
              </button>
            </div>
            {!coverPreviewUrl && (
              <p className="acp-hint">{t('defaultCoverWillBeUsed', 'Ø³ÙŠØªÙ… Ø§Ø³ØªØ®Ø¯Ø§Ù… ØºÙ„Ø§Ù Ø§ÙØªØ±Ø§Ø¶ÙŠ Ø¥Ø°Ø§ ØªØ®Ø·ÙŠØª Ù‡Ø°Ù‡ Ø§Ù„Ø®Ø·ÙˆØ©.')}</p>
            )}
            <div className="acp-nav-row">
              <button className="acp-btn acp-btn--ghost" onClick={() => setStep(2)} type="button">
                <span className="material-symbols-outlined" aria-hidden="true">{iconPrev}</span> {t('back', 'Ø±Ø¬ÙˆØ¹')}
              </button>
              <button className="acp-btn acp-btn--ghost" onClick={() => setStep(4)} type="button">{t('skip', 'ØªØ®Ø·ÙŠ')}</button>
              <button className="acp-btn acp-btn--primary" onClick={() => saveDraft(4)} disabled={saving || coverUploading}>
                {saving ? t('savingDots', 'Ø­ÙØ¸...') : t('theNext', 'Ø§Ù„ØªØ§Ù„ÙŠ')}
              </button>
            </div>
          </div>
        </section>
      )}

      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• STEP 4: CAPTIONS (OPTIONAL) â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      {step === 4 && (
        <section className="acp-section">
          <h1 className="acp-section__title">
            <span className="material-symbols-outlined" aria-hidden="true">subtitles</span>
            {t('captionsSetup', 'Ø¥Ø¹Ø¯Ø§Ø¯ Ø§Ù„ØªØ±Ø¬Ù…Ø© ÙˆØ§Ù„Ù†ØµÙˆØµ')}
            <span className="acp-badge acp-badge--optional">{t('optional', 'Ø§Ø®ØªÙŠØ§Ø±ÙŠ')}</span>
          </h1>
          <div className="acp-form">
            <label className="acp-label acp-label--row acp-toggle-main">
              <input type="checkbox" checked={captionsEnabled} onChange={(e) => setCaptionsEnabled(e.target.checked)} />
              <span>{t('enableCaptions', 'ØªÙØ¹ÙŠÙ„ Ø§Ù„Ù†ØµÙˆØµ / Ø§Ù„ØªØ±Ø¬Ù…Ø©')}</span>
            </label>
            {captionsEnabled && (
              <>
                {/* Caption source mode selector */}
                <label className="acp-label">{t('captionSource', 'Ù…ØµØ¯Ø± Ø§Ù„Ù†Øµ')}</label>
                <div className="acp-chips">
                  {([
                    { k: 'manual' as CaptionSource, l: t('manualInput', 'ÙƒØªØ§Ø¨Ø© ÙŠØ¯ÙˆÙŠØ©'), icon: 'edit_note' },
                    { k: 'uploaded' as CaptionSource, l: t('uploadFile', 'Ø±ÙØ¹ Ù…Ù„Ù'), icon: 'upload_file' },
                    { k: 'autoCue' as CaptionSource, l: t('importFromPrompter', 'Ø§Ø³ØªÙŠØ±Ø§Ø¯ Ù…Ù† Ø§Ù„Ù…Ù„Ù‚Ù†'), icon: 'teleprompter' },
                    { k: 'generated' as CaptionSource, l: t('autoGenerated', 'ØªÙˆÙ„ÙŠØ¯ ØªÙ„Ù‚Ø§Ø¦ÙŠ'), icon: 'auto_awesome' },
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
                      {s.k === 'generated' && <span className="acp-badge acp-badge--soon">{t('soon', 'Ù‚Ø±ÙŠØ¨Ø§Ù‹')}</span>}
                    </button>
                  ))}
                </div>

                {/* â”€â”€ Manual mode â”€â”€ */}
                {captionSource === 'manual' && (
                  <div className="acp-captions-editor">
                    <label className="acp-label">{t('writeCaptionText', 'Ø§ÙƒØªØ¨ Ø§Ù„Ù†Øµ (ÙƒÙ„ Ø³Ø·Ø± = Ù…Ù‚Ø·Ø¹ ÙˆØ§Ø­Ø¯)')}</label>
                    <textarea
                      className="acp-textarea acp-textarea--captions"
                      rows={8}
                      dir="auto"
                      placeholder={t('captionPlaceholder', 'Ø§ÙƒØªØ¨ Ø§Ù„Ù†Øµ Ù‡Ù†Ø§...\nÙƒÙ„ Ø³Ø·Ø± Ø³ÙŠØµØ¨Ø­ Ù…Ù‚Ø·Ø¹ Ù…Ù†ÙØµÙ„')}
                      value={captionRawText}
                      onChange={(e) => {
                        setCaptionRawText(e.target.value);
                        setCaptionSegments(splitTextToSegments(e.target.value));
                      }}
                    />
                    {captionSegments.length > 0 && (
                      <p className="acp-hint">
                        <span className="material-symbols-outlined acp-hint__icon">segment</span>
                        {captionSegments.length} {t('segmentNoTiming', 'Ù…Ù‚Ø·Ø¹ â€” Ø¨Ø¯ÙˆÙ† ØªÙˆÙ‚ÙŠØª (Ù†Øµ ØºÙŠØ± Ù…ØªØ²Ø§Ù…Ù†)')}
                      </p>
                    )}
                  </div>
                )}

                {/* â”€â”€ Upload mode â”€â”€ */}
                {captionSource === 'uploaded' && (
                  <div className="acp-captions-editor">
                    <label className="acp-label">{t('uploadSubtitleFile', 'Ø§Ø±ÙØ¹ Ù…Ù„Ù ØªØ±Ø¬Ù…Ø© (SRT Ø£Ùˆ VTT)')}</label>
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
                          {captionSegments.length} {t('segment', 'Ù…Ù‚Ø·Ø¹')}
                          {captionSegments[0]?.startMs !== undefined ? t('withTiming', ' â€” Ù…Ø¹ ØªÙˆÙ‚ÙŠØª') : t('withoutTiming', ' â€” Ø¨Ø¯ÙˆÙ† ØªÙˆÙ‚ÙŠØª')}
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
                            <p className="acp-hint">{t('andMoreSegments', `Ùˆ${captionSegments.length - 5} Ù…Ù‚Ø·Ø¹ Ø¢Ø®Ø±...`)}</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* â”€â”€ AutoCue import mode â”€â”€ */}
                {captionSource === 'autoCue' && (
                  <div className="acp-captions-editor">
                    {scriptText ? (
                      <>
                        <p className="acp-hint">
                          <span className="material-symbols-outlined acp-hint__icon">teleprompter</span>
                          {t('youCanImportPrompterText', 'ÙŠÙ…ÙƒÙ†Ùƒ Ø§Ø³ØªÙŠØ±Ø§Ø¯ Ù†Øµ Ø§Ù„Ù…Ù„Ù‚Ù† ÙƒÙ†Øµ ØªØ±Ø¬Ù…Ø©')}
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
                          {t('importPrompterText', 'Ø§Ø³ØªÙŠØ±Ø§Ø¯ Ù†Øµ Ø§Ù„Ù…Ù„Ù‚Ù†')}
                        </button>
                        {captionSegments.length > 0 && (
                          <p className="acp-hint">
                            <span className="material-symbols-outlined acp-hint__icon">check_circle</span>
                            {t('imported', 'ØªÙ… Ø§Ø³ØªÙŠØ±Ø§Ø¯')} {captionSegments.length} {t('segmentsNoTiming', 'Ù…Ù‚Ø·Ø¹ (Ø¨Ø¯ÙˆÙ† ØªÙˆÙ‚ÙŠØª)')}
                          </p>
                        )}
                      </>
                    ) : (
                      <p className="acp-hint">
                        <span className="material-symbols-outlined acp-hint__icon">info</span>
                        {t('noPrompterTextFound', 'Ù„Ø§ ÙŠÙˆØ¬Ø¯ Ù†Øµ Ù…Ù„Ù‚Ù†. Ø£Ø¶Ù Ù†Øµ Ø§Ù„Ù…Ù„Ù‚Ù† ÙÙŠ Ø§Ù„Ø®Ø·ÙˆØ© 5 Ø£ÙˆÙ„Ø§Ù‹.')}
                      </p>
                    )}
                  </div>
                )}

                {/* â”€â”€ Generated mode (gated) â”€â”€ */}
                {captionSource === 'generated' && (
                  <div className="acp-captions-editor">
                    <p className="acp-hint">
                      <span className="material-symbols-outlined acp-hint__icon">auto_awesome</span>
                      {t('soonNeedsVoiceProvider', 'Ù‚Ø±ÙŠØ¨Ø§Ù‹ â€” ÙŠØªØ·Ù„Ø¨ Ù…Ø²ÙˆØ¯ ØªÙØ±ÙŠØº ØµÙˆØªÙŠ')}
                    </p>
                  </div>
                )}

                {/* Language + Style selectors (shared across modes) */}
                <div className="acp-label">
                  {t('textLanguage', 'Ù„ØºØ© Ø§Ù„Ù†Øµ')}
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
                  {t('displayStyle', 'Ù†Ù…Ø· Ø§Ù„Ø¹Ø±Ø¶')}
                  <div className="acp-chips">
                    {([{ k: 'standard' as const, l: t('normal', 'Ø¹Ø§Ø¯ÙŠ') }, { k: 'karaoke' as const, l: t('karaoke', 'ÙƒØ§Ø±ÙŠÙˆÙƒÙŠ') }, { k: 'subtitles' as const, l: t('subtitle', 'ØªØ±Ø¬Ù…Ø© Ø³ÙÙ„ÙŠØ©') }]).map((s) => (
                      <button key={s.k} className={`acp-chip ${captionStyle === s.k ? 'acp-chip--selected' : ''}`} onClick={() => setCaptionStyle(s.k)} type="button">{s.l}</button>
                    ))}
                  </div>
                </label>
              </>
            )}
            <div className="acp-nav-row">
              <button className="acp-btn acp-btn--ghost" onClick={() => setStep(3)} type="button">
                <span className="material-symbols-outlined" aria-hidden="true">{iconPrev}</span> {t('back', 'Ø±Ø¬ÙˆØ¹')}
              </button>
              <button className="acp-btn acp-btn--ghost" onClick={() => setStep(5)} type="button">{t('skip', 'ØªØ®Ø·ÙŠ')}</button>
              <button className="acp-btn acp-btn--primary" onClick={() => saveDraft(5)} disabled={saving}>
                {saving ? t('savingDots', 'Ø­ÙØ¸...') : t('theNext', 'Ø§Ù„ØªØ§Ù„ÙŠ')}
              </button>
            </div>
          </div>
        </section>
      )}

      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• STEP 5: AUTOCUE (OPTIONAL) â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      {step === 5 && (
        <section className="acp-section">
          <h1 className="acp-section__title">
            <span className="material-symbols-outlined" aria-hidden="true">teleprompter</span>
            {t('autoCue', 'Ø§Ù„Ù…Ù„Ù‚Ù† (AutoCue)')}
            <span className="acp-badge acp-badge--optional">{t('optional', 'Ø§Ø®ØªÙŠØ§Ø±ÙŠ')}</span>
          </h1>
          <div className="acp-form">
            <div className="acp-gate-banner">
              <span className="material-symbols-outlined" aria-hidden="true">workspace_premium</span>
              <span>{t('paidFeaturePro', 'Ù…ÙŠØ²Ø© Ù…Ø¯ÙÙˆØ¹Ø© â€” Ù…ØªØ§Ø­Ø© Ù„Ù…Ø´ØªØ±ÙƒÙŠ Ø§Ù„Ø­Ø²Ù… Ø§Ù„Ù…ØªÙ‚Ø¯Ù…Ø© Ø£Ùˆ Ø¨ØªÙØ¹ÙŠÙ„ Ø¥Ø¯Ø§Ø±ÙŠ.')}</span>
            </div>
            <label className="acp-label acp-label--row acp-toggle-main">
              <input type="checkbox" checked={autoCueEnabled} onChange={(e) => setAutoCueEnabled(e.target.checked)} />
              <span>{t('enablePrompterDuringRecording', 'ØªÙØ¹ÙŠÙ„ Ø§Ù„Ù…Ù„Ù‚Ù† Ø£Ø«Ù†Ø§Ø¡ Ø§Ù„ØªØ³Ø¬ÙŠÙ„')}</span>
            </label>
            {autoCueEnabled && (
              <>
                <label className="acp-label">
                  {t('textLyrics', 'Ø§Ù„Ù†Øµ / ÙƒÙ„Ù…Ø§Øª Ø§Ù„Ø£ØºÙ†ÙŠØ©')}
                  <textarea className="acp-textarea acp-textarea--script" value={scriptText} onChange={(e) => setScriptText(e.target.value)} placeholder={t('typeOrPasteTextHere', 'Ø§ÙƒØªØ¨ Ø£Ùˆ Ø§Ù„ØµÙ‚ Ø§Ù„Ù†Øµ Ù‡Ù†Ø§...')} rows={8} />
                </label>
                <div className="acp-autocue-actions">
                  <button className="acp-btn acp-btn--outline acp-btn--sm" onClick={() => setScriptText(caption)} type="button" disabled={!caption}>{t('copyFromDescription', 'Ù†Ø³Ø® Ù…Ù† Ø§Ù„ÙˆØµÙ')}</button>
                  <button className="acp-btn acp-btn--outline acp-btn--sm acp-btn--gated" disabled type="button">
                    {t('smartGenerateAI', 'ØªÙˆÙ„ÙŠØ¯ Ø°ÙƒÙŠ (AI)')} <span className="acp-gate-badge">{t('paid', 'Ù…Ø¯ÙÙˆØ¹')}</span>
                  </button>
                  <button className="acp-btn acp-btn--outline acp-btn--sm" onClick={() => setScriptText('')} type="button">{t('clear', 'Ù…Ø³Ø­')}</button>
                </div>
                <div className="acp-autocue-settings">
                  <label className="acp-label">
                    {t('scrollSpeed', 'Ø³Ø±Ø¹Ø© Ø§Ù„ØªÙ…Ø±ÙŠØ±')}
                    <div className="acp-chips">
                      {([{ k: 'slow' as const, l: t('slow', 'Ø¨Ø·ÙŠØ¡') }, { k: 'medium' as const, l: t('medium', 'Ù…ØªÙˆØ³Ø·') }, { k: 'fast' as const, l: t('fast', 'Ø³Ø±ÙŠØ¹') }]).map((s) => (
                        <button key={s.k} className={`acp-chip ${scrollSpeed === s.k ? 'acp-chip--selected' : ''}`} onClick={() => setScrollSpeed(s.k)} type="button">{s.l}</button>
                      ))}
                    </div>
                  </label>
                  <label className="acp-label">
                    {t('fontSize', 'Ø­Ø¬Ù… Ø§Ù„Ø®Ø·')}
                    <div className="acp-chips">
                      {([{ k: 'small' as const, l: t('small', 'ØµØºÙŠØ±') }, { k: 'medium' as const, l: t('medium', 'Ù…ØªÙˆØ³Ø·') }, { k: 'large' as const, l: t('large', 'ÙƒØ¨ÙŠØ±') }]).map((s) => (
                        <button key={s.k} className={`acp-chip ${fontSize === s.k ? 'acp-chip--selected' : ''}`} onClick={() => setFontSize(s.k)} type="button">{s.l}</button>
                      ))}
                    </div>
                  </label>
                  <label className="acp-label">
                    {t('readingMode', 'ÙˆØ¶Ø¹ Ø§Ù„Ù‚Ø±Ø§Ø¡Ø©')}
                    <div className="acp-chips">
                      <button className={`acp-chip ${readingMode === 'lineByLine' ? 'acp-chip--selected' : ''}`} onClick={() => setReadingMode('lineByLine')} type="button">{t('lineByLine', 'Ø³Ø·Ø± Ø¨Ø³Ø·Ø±')}</button>
                      <button className={`acp-chip ${readingMode === 'paragraphByParagraph' ? 'acp-chip--selected' : ''}`} onClick={() => setReadingMode('paragraphByParagraph')} type="button">{t('paragraphByParagraph', 'ÙÙ‚Ø±Ø© Ø¨ÙÙ‚Ø±Ø©')}</button>
                    </div>
                  </label>
                  <label className="acp-label">
                    {t('startDelaySeconds', 'ØªØ£Ø®ÙŠØ± Ø§Ù„Ø¨Ø¯Ø§ÙŠØ© (Ø«ÙˆØ§Ù†)')}
                    <input type="number" className="acp-input acp-input--narrow" value={startDelay} onChange={(e) => setStartDelay(Number(e.target.value))} min={0} max={30} />
                  </label>
                  <label className="acp-label acp-label--row">
                    <input type="checkbox" checked={highlightLine} onChange={(e) => setHighlightLine(e.target.checked)} />
                    {t('highlightCurrentLine', 'ØªÙ…ÙŠÙŠØ² Ø§Ù„Ø³Ø·Ø± Ø§Ù„Ø­Ø§Ù„ÙŠ')}
                  </label>
                </div>
              </>
            )}
            <div className="acp-nav-row">
              <button className="acp-btn acp-btn--ghost" onClick={() => setStep(4)} type="button">
                <span className="material-symbols-outlined" aria-hidden="true">{iconPrev}</span> {t('back', 'Ø±Ø¬ÙˆØ¹')}
              </button>
              <button className="acp-btn acp-btn--ghost" onClick={() => setStep(6)} type="button">{t('skip', 'ØªØ®Ø·ÙŠ')}</button>
              <button className="acp-btn acp-btn--primary" onClick={() => saveDraft(6)} disabled={saving}>
                {saving ? t('savingDots', 'Ø­ÙØ¸...') : t('theNext', 'Ø§Ù„ØªØ§Ù„ÙŠ')}
              </button>
            </div>
          </div>
        </section>
      )}

      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• STEP 6: RECORD / UPLOAD â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      {step === 6 && (
        <section className="acp-section">
          <h1 className="acp-section__title">
            <span className="material-symbols-outlined" aria-hidden="true">mic</span>
            {t('recordOrUpload', 'Ø§Ù„ØªØ³Ø¬ÙŠÙ„ Ø£Ùˆ Ø§Ù„Ø±ÙØ¹')}
          </h1>

          {/* AutoCue banner */}
          {autoCueEnabled && scriptText && (
            <div className="acp-autocue-banner">
              <span className="material-symbols-outlined" aria-hidden="true">teleprompter</span>
              <span>{t('prompterActiveTextWillShow', 'ÙˆØ¶Ø¹ Ø§Ù„Ù…Ù„Ù‚Ù† Ù…ÙØ¹Ù‘Ù„ â€” Ø§Ù„Ù†Øµ Ø³ÙŠØ¸Ù‡Ø± Ø£Ø«Ù†Ø§Ø¡ Ø§Ù„ØªØ³Ø¬ÙŠÙ„')}</span>
            </div>
          )}

          {/* Tab switcher */}
          <div className="acp-tabs">
            <button className={`acp-tab ${tab === 'record' ? 'acp-tab--active' : ''}`} onClick={() => setTab('record')} type="button">
              <span className="material-symbols-outlined" aria-hidden="true">mic</span> {t('record', 'ØªØ³Ø¬ÙŠÙ„')}
            </button>
            <button className={`acp-tab ${tab === 'upload' ? 'acp-tab--active' : ''}`} onClick={() => setTab('upload')} type="button">
              <span className="material-symbols-outlined" aria-hidden="true">upload_file</span> {t('uploadFile', 'Ø±ÙØ¹ Ù…Ù„Ù')}
            </button>
          </div>

          {/* â”€â”€ Record tab â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
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
                    <span>{t('startRecording', 'Ø§Ø¨Ø¯Ø£ Ø§Ù„ØªØ³Ø¬ÙŠÙ„')}</span>
                  </button>
                )}
                {recorder.state === 'requesting' && (
                  <div className="acp-record-status"><span className="acp-spinner" /><p>{t('requestingMicPermission', 'Ø¬Ø§Ø±ÙŠ Ø·Ù„Ø¨ Ø¥Ø°Ù† Ø§Ù„Ù…ÙŠÙƒØ±ÙˆÙÙˆÙ†...')}</p></div>
                )}
                {recorder.state === 'recording' && (
                  <div className="acp-record-live">
                    <div className="acp-record-pulse" />
                    <p className="acp-record-time">{formatDuration(recorder.elapsedMs)}</p>
                    <button className="acp-btn acp-btn--danger" onClick={recorder.stopRecording} type="button">
                      <span className="material-symbols-outlined" aria-hidden="true">stop_circle</span> {t('stop', 'Ø¥ÙŠÙ‚Ø§Ù')}
                    </button>
                  </div>
                )}
                {recorder.state === 'stopped' && recorder.audioUrl && (
                  <div className="acp-record-preview">
                    <audio controls src={recorder.audioUrl} className="acp-audio-player" />
                    <div className="acp-record-preview__info">
                      <span>{t('duration', 'Ø§Ù„Ù…Ø¯Ø©:')} {formatDuration(recorder.elapsedMs)}</span>
                      {recorder.audioBlob && <span>{t('size', 'Ø§Ù„Ø­Ø¬Ù…:')} {formatFileSize(recorder.audioBlob.size)}</span>}
                    </div>
                    <div className="acp-record-preview__actions">
                      <button className="acp-btn acp-btn--primary" onClick={handleUploadRecording} disabled={uploader.state === 'uploading' || uploader.state === 'done'} type="button">
                        <span className="material-symbols-outlined" aria-hidden="true">cloud_upload</span> {t('uploadRecording', 'Ø±ÙØ¹ Ø§Ù„ØªØ³Ø¬ÙŠÙ„')}
                      </button>
                      <button className="acp-btn acp-btn--ghost" onClick={recorder.reset} disabled={uploader.state === 'uploading'} type="button">{t('reRecord', 'Ø¥Ø¹Ø§Ø¯Ø© Ø§Ù„ØªØ³Ø¬ÙŠÙ„')}</button>
                    </div>
                  </div>
                )}
                {recorder.state === 'error' && (
                  <div className="acp-error-box">
                    <span className="material-symbols-outlined">error</span>
                    <p>{recorder.errorMessage}</p>
                    <button className="acp-btn acp-btn--ghost" onClick={recorder.reset} type="button">{t('tryAgain', 'Ø­Ø§ÙˆÙ„ Ù…Ø¬Ø¯Ø¯Ø§Ù‹')}</button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* â”€â”€ Upload tab â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
          {tab === 'upload' && (
            <div className="acp-upload-panel">
              {!selectedFile && (
                <div className="acp-drop-zone" onClick={() => fileInputRef.current?.click()} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}>
                  <span className="material-symbols-outlined acp-drop-zone__icon">audio_file</span>
                  <p>{t('chooseAudioFile', 'Ø§Ø®ØªØ± Ù…Ù„ÙØ§Ù‹ ØµÙˆØªÙŠØ§Ù‹')}</p>
                  <p className="acp-drop-zone__hint">{t('audioFormatsHint', 'MP3, WAV, AAC, OGG, WebM â€” Ø­ØªÙ‰ 100MB')}</p>
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
                      <span className="material-symbols-outlined" aria-hidden="true">cloud_upload</span> {t('uploadFileAction', 'Ø±ÙØ¹ Ø§Ù„Ù…Ù„Ù')}
                    </button>
                    <button className="acp-btn acp-btn--ghost" onClick={() => { setSelectedFile(null); setFileDurationMs(null); uploader.reset(); if (fileInputRef.current) fileInputRef.current.value = ''; }} disabled={uploader.state === 'uploading'} type="button">{t('changeFile', 'ØªØºÙŠÙŠØ± Ø§Ù„Ù…Ù„Ù')}</button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* â”€â”€ Upload progress â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
          {uploader.state === 'uploading' && (
            <div className="acp-progress">
              <div className="acp-progress__bar"><div className="acp-progress__fill" style={{ width: `${uploader.progress}%` }} /></div>
              <p className="acp-progress__text">{t('uploadingWithProgress', 'Ø¬Ø§Ø±ÙŠ Ø§Ù„Ø±ÙØ¹...')} {uploader.progress}%</p>
              <button className="acp-btn acp-btn--ghost acp-btn--sm" onClick={uploader.cancel} type="button">{t('cancel', 'Ø¥Ù„ØºØ§Ø¡')}</button>
            </div>
          )}
          {attaching && <div className="acp-progress"><span className="acp-spinner" /><p className="acp-progress__text">{t('attachingFileToDraft', 'Ø¬Ø§Ø±ÙŠ Ø±Ø¨Ø· Ø§Ù„Ù…Ù„Ù Ø¨Ø§Ù„Ù…Ø³ÙˆØ¯Ø©...')}</p></div>}
          {uploader.state === 'error' && <div className="acp-error-box"><span className="material-symbols-outlined">error</span><p>{uploader.errorMessage}</p></div>}
          {attachError && <div className="acp-error-box"><span className="material-symbols-outlined">error</span><p>{attachError}</p></div>}

          {/* â”€â”€ Asset attached â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
          {audioAsset && (
            <div className="acp-success-box">
              <span className="material-symbols-outlined">check_circle</span>
              <p>{t('audioFileAttachedSuccessfully', 'ØªÙ… Ø±Ø¨Ø· Ø§Ù„Ù…Ù„Ù Ø§Ù„ØµÙˆØªÙŠ Ø¨Ø§Ù„Ù…Ø³ÙˆØ¯Ø© Ø¨Ù†Ø¬Ø§Ø­!')}</p>
              <div className="acp-asset-summary">
                <span className="acp-asset-summary__item">
                  <span className="material-symbols-outlined">description</span> {audioAsset.originalFileName}
                </span>
                {audioAsset.durationMs ? <span className="acp-asset-summary__item"><span className="material-symbols-outlined">schedule</span> {formatDuration(audioAsset.durationMs)}</span> : null}
                {audioAsset.sizeBytes ? <span className="acp-asset-summary__item"><span className="material-symbols-outlined">inventory_2</span> {formatFileSize(audioAsset.sizeBytes)}</span> : null}
              </div>
              <button className="acp-btn acp-btn--primary" onClick={() => setStep(7)} type="button">
                <span className="material-symbols-outlined" aria-hidden="true">arrow_back</span> {t('continue', 'Ù…ØªØ§Ø¨Ø¹Ø©')}
              </button>
            </div>
          )}

          {/* Back button */}
          {!audioAsset && (
            <button className="acp-btn acp-btn--ghost acp-back" onClick={() => setStep(5)} type="button">
              <span className="material-symbols-outlined" aria-hidden="true">{iconPrev}</span> {t('back', 'Ø±Ø¬ÙˆØ¹')}
            </button>
          )}
        </section>
      )}

      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• STEP 7: REVIEW â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      {step === 7 && (
        <section className="acp-section">
          <h1 className="acp-section__title">
            <span className="material-symbols-outlined" aria-hidden="true">preview</span>
            {t('reviewAndEditAudio', 'Ù…Ø±Ø§Ø¬Ø¹Ø© ÙˆØªØ¹Ø¯ÙŠÙ„ Ø§Ù„ØµÙˆØª')}
          </h1>
          <div className="acp-form">
            {audioAsset ? (
              <div className="acp-review-audio">
                <div className="acp-review__item"><span>{t('theFile', 'Ø§Ù„Ù…Ù„Ù:')}</span> <strong>{audioAsset.originalFileName}</strong></div>
                {audioAsset.durationMs ? <div className="acp-review__item"><span>{t('duration', 'Ø§Ù„Ù…Ø¯Ø©:')}</span> {formatDuration(audioAsset.durationMs)}</div> : null}
                {audioAsset.sizeBytes ? <div className="acp-review__item"><span>{t('size', 'Ø§Ù„Ø­Ø¬Ù…:')}</span> {formatFileSize(audioAsset.sizeBytes)}</div> : null}
                <div className="acp-review__item">
                  <span>{t('theSource', 'Ø§Ù„Ù…ØµØ¯Ø±:')}</span>
                  <span className="material-symbols-outlined" style={{ fontSize: '0.9rem' }}>{audioAsset.sourceType === 'recorded' ? 'mic' : 'upload_file'}</span>
                  {audioAsset.sourceType === 'recorded' ? t('recorded', ' Ù…Ø³Ø¬Ù‘Ù„') : t('uploaded', ' Ù…Ø±ÙÙˆØ¹')}
                </div>
                <div className="acp-review__item">
                  <span>{t('theStatus', 'Ø§Ù„Ø­Ø§Ù„Ø©:')}</span>
                  <span className="material-symbols-outlined" style={{ fontSize: '0.9rem', color: '#22c55e' }}>check_circle</span>
                  {t('uploadedStatus', 'Ù…Ø±ÙÙˆØ¹')}
                </div>
              </div>
            ) : (
              <div className="acp-warning-box">
                <span className="material-symbols-outlined">warning</span>
                <p>{t('noAudioFileGoBack', 'Ù„Ø§ ÙŠÙˆØ¬Ø¯ Ù…Ù„Ù ØµÙˆØªÙŠ. Ø§Ø±Ø¬Ø¹ Ù„Ù„Ø®Ø·ÙˆØ© Ø§Ù„Ø³Ø§Ø¨Ù‚Ø©.')}</p>
              </div>
            )}

            {/* â”€â”€ Phase 8-L.1: Waveform Timeline + Preview â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            {audioAsset && previewAudioUrl && (
              <div className="acp-waveform-card" id="waveform-timeline">
                {/* Hidden audio element for trim/cut-aware preview */}
                <audio ref={waveformAudioRef} src={previewAudioUrl} preload="metadata" style={{ display: 'none' }}
                  onEnded={() => { setWfPlaying(false); cancelAnimationFrame(wfAnimRef.current); }} />

                {waveformLoading ? (
                  <div className="acp-waveform-loading">
                    <span className="acp-spinner" aria-hidden="true" />
                    {t('analyzingAudioWaveform', 'Ø¬Ø§Ø±ÙŠ ØªØ­Ù„ÙŠÙ„ Ø§Ù„Ù…ÙˆØ¬Ø© Ø§Ù„ØµÙˆØªÙŠØ©...')}
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
                      <button type="button" className="acp-waveform-controls__play" onClick={toggleWfPlayback} aria-label={wfPlaying ? t('stop', 'Ø¥ÙŠÙ‚Ø§Ù') : t('play', 'ØªØ´ØºÙŠÙ„')}>
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
                            <><span className="material-symbols-outlined acp-spin">progress_activity</span> {t('processingPreview', 'Ø¬Ø§Ø±ÙŠ Ù…Ø¹Ø§Ù„Ø¬Ø© Ø§Ù„Ù…Ø¹Ø§ÙŠÙ†Ø©...')}</>
                          ) : getStagePreviewStatus('edit') === 'ready' ? (
                            <><span className="material-symbols-outlined">check_circle</span> {t('previewReadyRePreview', 'âœ“ Ø§Ù„Ù…Ø¹Ø§ÙŠÙ†Ø© Ø¬Ø§Ù‡Ø²Ø© â€” Ø¥Ø¹Ø§Ø¯Ø© Ø§Ù„Ù…Ø¹Ø§ÙŠÙ†Ø©')}</>
                          ) : getStagePreviewStatus('edit') === 'failed' ? (
                            <><span className="material-symbols-outlined">error</span> {t('previewFailedRetry', 'ÙØ´Ù„Øª Ø§Ù„Ù…Ø¹Ø§ÙŠÙ†Ø© â€” Ø¥Ø¹Ø§Ø¯Ø© Ø§Ù„Ù…Ø­Ø§ÙˆÙ„Ø©')}</>
                          ) : getStagePreviewStatus('edit') === 'dirty' ? (
                            <><span className="material-symbols-outlined">warning</span> {t('settingsChangedRePreview', 'Ø§Ù„Ø¥Ø¹Ø¯Ø§Ø¯Ø§Øª ØªØºÙŠØ±Øª â€” Ø£Ø¹Ø¯ Ø§Ù„Ù…Ø¹Ø§ÙŠÙ†Ø©')}</>
                          ) : (
                            <><span className="material-symbols-outlined">play_circle</span> {t('previewCut', 'Ø­ÙØ¸ ÙˆÙ…Ø¹Ø§ÙŠÙ†Ø© Ø§Ù„Ù‚Øµ')}</>
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
                    {t('couldNotAnalyzeWaveform', 'Ù„Ù… ÙŠØªÙ…ÙƒÙ† Ù…Ù† ØªØ­Ù„ÙŠÙ„ Ø§Ù„Ù…ÙˆØ¬Ø© Ø§Ù„ØµÙˆØªÙŠØ©')}
                  </div>
                )}
              </div>
            )}

            {/* â”€â”€ Phase 8-L: Trim/Cut Editor â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            {audioAsset && audioAsset.durationMs && audioAsset.durationMs > 0 && (
              <div className="acp-edit-panel" id="audio-edit-panel">
                <div className="acp-edit-panel__header">
                  <div className="acp-edit-panel__title-row">
                    <span className="material-symbols-outlined">content_cut</span>
                    <span>{t('cutAndEditAudio', 'Ù‚Øµ ÙˆØªØ¹Ø¯ÙŠÙ„ Ø§Ù„ØµÙˆØª')}</span>
                    <span className="acp-badge acp-badge--optional">{t('optional', 'Ø§Ø®ØªÙŠØ§Ø±ÙŠ')}</span>
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
                        {t('trimStart', 'Ù‚Øµ Ø§Ù„Ø¨Ø¯Ø§ÙŠØ©')}
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
                        {t('trimEnd', 'Ù‚Øµ Ø§Ù„Ù†Ù‡Ø§ÙŠØ©')}
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
                        <span>{t('deleteMiddleSection', 'Ø­Ø°Ù Ù…Ù‚Ø·Ø¹ Ù…Ù† Ø§Ù„Ù…Ù†ØªØµÙ')}</span>
                        <span className="acp-hint">{t('unlimited', '(Ø¨Ø¯ÙˆÙ† Ø­Ø¯ Ø£Ù‚ØµÙ‰)')}</span>
                      </div>
                      {editCuts.map(cut => (
                        <div key={cut.id} className="acp-edit-cut-card">
                          <div className="acp-edit-cut-card__row">
                            <div className="acp-edit-cut-card__field">
                              <span className="acp-edit-cut-card__field-label">{t('from', 'Ù…Ù†:')}</span>
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
                              <span className="acp-edit-cut-card__field-label">{t('to', 'Ø¥Ù„Ù‰:')}</span>
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
                            <span className="material-symbols-outlined">delete</span> {t('removeCut', 'Ø¥Ø²Ø§Ù„Ø© Ø§Ù„Ù‚Øµ')}
                          </button>
                        </div>
                      ))}
                      <button type="button" className="acp-btn acp-btn--outline acp-btn--sm" onClick={addCut} style={{ marginTop: '0.5rem' }}>
                        <span className="material-symbols-outlined">add</span> {t('addCut', 'Ø¥Ø¶Ø§ÙØ© Ù‚Øµ')}
                      </button>
                    </div>

                    {/* Duration summary */}
                    <div className="acp-edit-duration-summary">
                      <div className="acp-edit-duration-summary__row">
                        <span className="material-symbols-outlined">schedule</span>
                        <span>{t('originalDuration', 'Ø§Ù„Ù…Ø¯Ø© Ø§Ù„Ø£ØµÙ„ÙŠØ©:')}</span>
                        <strong>{formatDuration(originalDurationMs)}</strong>
                      </div>
                      <div className="acp-edit-duration-summary__row acp-edit-duration-summary__row--edited">
                        <span className="material-symbols-outlined">timer</span>
                        <span>{t('editedDuration', 'Ø§Ù„Ù…Ø¯Ø© Ø¨Ø¹Ø¯ Ø§Ù„ØªØ¹Ø¯ÙŠÙ„:')}</span>
                        <strong>{formatDuration(editedDurationMs)}</strong>
                      </div>
                    </div>

                    {/* Reset button */}
                    <button type="button" className="acp-btn acp-btn--ghost acp-btn--sm" onClick={resetEdits}>
                      <span className="material-symbols-outlined">restart_alt</span> {t('resetEdits', 'Ø¥Ø¹Ø§Ø¯Ø© Ø¶Ø¨Ø· Ø§Ù„ØªØ¹Ø¯ÙŠÙ„Ø§Øª')}
                    </button>
                  </div>
                )}
              </div>
            )}

            <div className="acp-nav-row" style={{ marginTop: '1rem' }}>
              <button className="acp-btn acp-btn--ghost" onClick={() => { setAudioAsset(null); uploader.reset(); recorder.reset(); setStep(6); }} type="button">
                <span className="material-symbols-outlined" aria-hidden="true">refresh</span> {t('reRecordUpload', 'Ø¥Ø¹Ø§Ø¯Ø© Ø§Ù„ØªØ³Ø¬ÙŠÙ„ / Ø§Ù„Ø±ÙØ¹')}
              </button>
              <button className="acp-btn acp-btn--primary" onClick={() => saveDraft(8)} disabled={!audioAsset || renderingStage === 'edit'} type="button">
                <span className="material-symbols-outlined" aria-hidden="true">{iconNext}</span> {t('confirmAndContinue', 'ØªØ£ÙƒÙŠØ¯ ÙˆÙ…ØªØ§Ø¨Ø¹Ø©')}
              </button>
            </div>
          </div>
        </section>
      )}

      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• STEP 8: EFFECTS (Phase 8-J) â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      {step === 8 && (
        <section className="acp-section">
          <h1 className="acp-section__title">
            <span className="material-symbols-outlined" aria-hidden="true">tune</span>
            {t('audioEffects', 'Ø§Ù„Ù…Ø¤Ø«Ø±Ø§Øª Ø§Ù„ØµÙˆØªÙŠØ©')}
            <span className="acp-badge acp-badge--optional">{t('optional', 'Ø§Ø®ØªÙŠØ§Ø±ÙŠ')}</span>
          </h1>
          <div className="acp-form">

            {/* â”€â”€ Working-audio preview (cut audio from Step 7) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            {(previewUrls.edit || audioAsset?.storagePath) && (
              <div className="acp-working-audio-card" id="effects-source-preview">
                <div className="acp-working-audio-card__header">
                  <span className="material-symbols-outlined">graphic_eq</span>
                  <div className="acp-working-audio-card__info">
                    <span className="acp-working-audio-card__title">
                      {previewUrls.edit
                        ? t('audioAfterCuts', 'Ø§Ù„ØµÙˆØª Ø¨Ø¹Ø¯ Ø§Ù„Ù‚Øµ')
                        : t('originalAudio', 'Ø§Ù„ØµÙˆØª Ø§Ù„Ø£ØµÙ„ÙŠ')}
                    </span>
                    <span className="acp-working-audio-card__subtitle">
                      {previewUrls.edit
                        ? t('effectsAppliedToThis', 'Ø§Ù„Ù…Ø¤Ø«Ø±Ø§Øª Ø³ØªÙØ·Ø¨ÙŽÙ‘Ù‚ Ø¹Ù„Ù‰ Ù‡Ø°Ø§ Ø§Ù„ØµÙˆØª')
                        : t('noEditsApplied', 'Ù„Ù… ØªÙØ·Ø¨ÙŽÙ‘Ù‚ ØªØ¹Ø¯ÙŠÙ„Ø§Øª â€” Ø§Ù„ØµÙˆØª ÙƒØ§Ù…Ù„')}
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
                    {t('noEditPreviewYet', 'Ù„Ù… ÙŠØªÙ… Ø­ÙØ¸ Ù…Ø¹Ø§ÙŠÙ†Ø© Ø§Ù„Ù‚Øµ Ø¨Ø¹Ø¯ â€” Ø³ÙŠØªÙ… ØªØ·Ø¨ÙŠÙ‚ Ø§Ù„Ù…Ø¤Ø«Ø±Ø§Øª Ø¹Ù„Ù‰ Ø§Ù„ØµÙˆØª Ø§Ù„ÙƒØ§Ù…Ù„')}
                  </p>
                )}
              </div>
            )}

            {/* Enable/disable toggle */}
            <div className="acp-effects-toggle-row">
              <label className="acp-effects-toggle" id="effects-master-toggle">
                <span>{t('enableAudioEffects', 'ØªÙØ¹ÙŠÙ„ Ø§Ù„Ù…Ø¤Ø«Ø±Ø§Øª Ø§Ù„ØµÙˆØªÙŠØ©')}</span>
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
                    <span className="acp-effects-mode-card__label">{t('presets', 'Ø¥Ø¹Ø¯Ø§Ø¯Ø§Øª Ù…Ø³Ø¨Ù‚Ø©')}</span>
                    <span className="acp-effects-mode-card__desc">{t('chooseFromPresets', 'Ø§Ø®ØªØ± Ù…Ù† Ø§Ù„Ø£Ù†Ù…Ø§Ø· Ø§Ù„Ø¬Ø§Ù‡Ø²Ø©')}</span>
                  </button>
                  <button
                    type="button"
                    className={`acp-effects-mode-card ${effectsMode === 'manual' ? 'acp-effects-mode-card--selected' : ''}`}
                    onClick={() => setEffectsMode('manual')}
                  >
                    <span className="material-symbols-outlined">tune</span>
                    <span className="acp-effects-mode-card__label">{t('manualControl', 'ØªØ­ÙƒÙ… ÙŠØ¯ÙˆÙŠ')}</span>
                    <span className="acp-effects-mode-card__desc">{t('editEachFilter', 'ØªØ¹Ø¯ÙŠÙ„ ÙƒÙ„ ÙÙ„ØªØ± Ø¹Ù„Ù‰ Ø­Ø¯Ø©')}</span>
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
                      <><span className="material-symbols-outlined acp-spin">progress_activity</span> {t('processingPreview', 'Ø¬Ø§Ø±ÙŠ Ù…Ø¹Ø§Ù„Ø¬Ø© Ø§Ù„Ù…Ø¹Ø§ÙŠÙ†Ø©...')}</>
                    ) : getStagePreviewStatus('effects') === 'ready' ? (
                      <><span className="material-symbols-outlined">check_circle</span> {t('previewReadyRePreview', 'âœ“ Ø§Ù„Ù…Ø¹Ø§ÙŠÙ†Ø© Ø¬Ø§Ù‡Ø²Ø© â€” Ø¥Ø¹Ø§Ø¯Ø© Ø§Ù„Ù…Ø¹Ø§ÙŠÙ†Ø©')}</>
                    ) : getStagePreviewStatus('effects') === 'failed' ? (
                      <><span className="material-symbols-outlined">error</span> {t('previewFailedRetry', 'ÙØ´Ù„Øª Ø§Ù„Ù…Ø¹Ø§ÙŠÙ†Ø© â€” Ø¥Ø¹Ø§Ø¯Ø© Ø§Ù„Ù…Ø­Ø§ÙˆÙ„Ø©')}</>
                    ) : getStagePreviewStatus('effects') === 'dirty' ? (
                      <><span className="material-symbols-outlined">warning</span> {t('settingsChangedRePreview', 'Ø§Ù„Ø¥Ø¹Ø¯Ø§Ø¯Ø§Øª ØªØºÙŠØ±Øª â€” Ø£Ø¹Ø¯ Ø§Ù„Ù…Ø¹Ø§ÙŠÙ†Ø©')}</>
                    ) : (
                      <><span className="material-symbols-outlined">play_circle</span> {t('previewEffects', 'Ø­ÙØ¸ ÙˆÙ…Ø¹Ø§ÙŠÙ†Ø© Ø§Ù„Ù…Ø¤Ø«Ø±Ø§Øª')}</>
                    )}
                  </button>
                  {editEnabled && getStagePreviewStatus('edit') !== 'ready' && (
                    <p className="acp-hint">{t('previewCutFirst', 'ÙŠØ¬Ø¨ Ù…Ø¹Ø§ÙŠÙ†Ø© Ø§Ù„Ù‚Øµ Ø£ÙˆÙ„Ø§Ù‹')}</p>
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
                  {t('resetEffects', 'Ø¥Ø¹Ø§Ø¯Ø© ØªØ¹ÙŠÙŠÙ† Ø§Ù„Ù…Ø¤Ø«Ø±Ø§Øª')}
                </button>
              </>
            )}

            {!effectsEnabled && (
              <p className="acp-hint">
                <span className="material-symbols-outlined acp-hint__icon" aria-hidden="true">info</span>
                {t('noEffectsWillBeAppliedCanSkip', 'Ù„Ù† ÙŠØªÙ… ØªØ·Ø¨ÙŠÙ‚ Ø£ÙŠ Ù…Ø¤Ø«Ø±Ø§Øª ØµÙˆØªÙŠØ©. ÙŠÙ…ÙƒÙ†Ùƒ ØªØ®Ø·ÙŠ Ù‡Ø°Ù‡ Ø§Ù„Ø®Ø·ÙˆØ©.')}
              </p>
            )}

            <div className="acp-nav-row">
              <button className="acp-btn acp-btn--ghost" onClick={() => setStep(7)} type="button">
                <span className="material-symbols-outlined" aria-hidden="true">{iconPrev}</span> {t('back', 'Ø±Ø¬ÙˆØ¹')}
              </button>
              <button className="acp-btn acp-btn--primary" onClick={() => saveDraft(9)} disabled={saving} type="button">
                {effectsEnabled ? t('theNext', 'Ø§Ù„ØªØ§Ù„ÙŠ') : t('skip', 'ØªØ®Ø·ÙŠ')} <span className="material-symbols-outlined" aria-hidden="true">{iconNext}</span>
              </button>
            </div>
          </div>
        </section>
      )}

      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• STEP 9: MIXING (GATED) â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      {step === 9 && (
        <section className="acp-section">
          <h1 className="acp-section__title">
            <span className="material-symbols-outlined" aria-hidden="true">graphic_eq</span>
            {t('audioMixing', 'Ù…ÙƒØ³Ø§Ø¬ Ø§Ù„ØµÙˆØª')}
            <span className="acp-badge acp-badge--optional">{t('optional', 'Ø§Ø®ØªÙŠØ§Ø±ÙŠ')}</span>
          </h1>
          <div className="acp-form">

            {/* â”€â”€ Working-audio preview (effects or cut audio from prev step) â”€â”€ */}
            {(previewUrls.effects || previewUrls.edit || audioAsset?.storagePath) && (
              <div className="acp-working-audio-card" id="mixing-source-preview">
                <div className="acp-working-audio-card__header">
                  <span className="material-symbols-outlined">graphic_eq</span>
                  <div className="acp-working-audio-card__info">
                    <span className="acp-working-audio-card__title">
                      {previewUrls.effects
                        ? t('audioAfterEffects', 'Ø§Ù„ØµÙˆØª Ø¨Ø¹Ø¯ Ø§Ù„Ù…Ø¤Ø«Ø±Ø§Øª')
                        : previewUrls.edit
                        ? t('audioAfterCuts', 'Ø§Ù„ØµÙˆØª Ø¨Ø¹Ø¯ Ø§Ù„Ù‚Øµ')
                        : t('originalAudio', 'Ø§Ù„ØµÙˆØª Ø§Ù„Ø£ØµÙ„ÙŠ')}
                    </span>
                    <span className="acp-working-audio-card__subtitle">
                      {t('mixingAppliedToThis', 'Ø§Ù„Ù…ÙƒØ³Ø§Ø¬ Ø³ÙŠÙØ·Ø¨ÙŽÙ‘Ù‚ Ø¹Ù„Ù‰ Ù‡Ø°Ø§ Ø§Ù„ØµÙˆØª')}
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
                <span>{t('enableMixing', 'ØªÙØ¹ÙŠÙ„ Ø§Ù„Ù…ÙƒØ³Ø§Ø¬')}</span>
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
                    <span className="material-symbols-outlined">layers</span> {t('layers', 'Ø§Ù„Ø·Ø¨Ù‚Ø§Øª')}
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
                            title={track.muted ? t('unmute', 'Ø¥Ù„ØºØ§Ø¡ Ø§Ù„ÙƒØªÙ…') : t('mute', 'ÙƒØªÙ…')}
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
                              {!opt.available && opt.id !== 'none' && <span className="acp-gate-badge">{t('soon', 'Ù‚Ø±ÙŠØ¨Ø§Ù‹')}</span>}
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
                                    {track.fileName || t('musicFile', 'Ù…Ù„Ù Ù…ÙˆØ³ÙŠÙ‚Ù‰')}
                                  </div>
                                  {track.durationMs && <div className="acp-music-upload__meta">{formatDuration(track.durationMs)} Â· {track.sizeBytes ? formatFileSize(track.sizeBytes) : ''}</div>}
                                  <button type="button" className="acp-music-upload__remove" onClick={removeMusicUpload}>
                                    <span className="material-symbols-outlined" style={{ fontSize: '0.8rem' }}>delete</span> {t('remove', 'Ø¥Ø²Ø§Ù„Ø©')}
                                  </button>
                                </>
                              ) : (
                                <button type="button" className="acp-sfx-add-btn" onClick={() => musicFileRef.current?.click()} disabled={musicUploading}>
                                  <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>{musicUploading ? 'hourglass_empty' : 'upload_file'}</span>
                                  {musicUploading ? `${t('uploadingWithProgress', 'Ø¬Ø§Ø±ÙŠ Ø§Ù„Ø±ÙØ¹...')} ${musicUploadProgress}%` : t('chooseMusicFile', 'Ø§Ø®ØªØ± Ù…Ù„Ù Ù…ÙˆØ³ÙŠÙ‚Ù‰')}
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                      {/* SFX track â€” show source selector but disable library */}
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

                {/* â”€â”€ Phase 8-L.1: SFX Items Section â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
                {mixTracks.some(t => t.type === 'sfx' && t.sourceType === 'uploaded') && (
                  <div className="acp-sfx-section">
                    <div className="acp-sfx-section__header">
                      <span className="acp-sfx-section__title">
                        <span className="material-symbols-outlined">music_note</span>
                        {t('soundEffectsSfx', 'Ù…Ø¤Ø«Ø±Ø§Øª ØµÙˆØªÙŠØ©')} ({sfxItems.length}/{MAX_SFX_ITEMS})
                      </span>
                      <input ref={sfxFileRef} type="file" accept="audio/*" style={{ display: 'none' }}
                        onChange={e => { const f = e.target.files?.[0]; if (f) handleSfxUpload(f); e.target.value = ''; }} />
                      <button type="button" className="acp-sfx-add-btn"
                        onClick={() => sfxFileRef.current?.click()}
                        disabled={sfxItems.length >= MAX_SFX_ITEMS || sfxUploading}>
                        <span className="material-symbols-outlined" style={{ fontSize: '0.9rem' }}>{sfxUploading ? 'hourglass_empty' : 'add'}</span>
                        {sfxUploading ? t('uploadingWithProgress', 'Ø¬Ø§Ø±ÙŠ Ø§Ù„Ø±ÙØ¹...') : t('addSfx', 'Ø¥Ø¶Ø§ÙØ© Ù…Ø¤Ø«Ø±')}
                      </button>
                    </div>
                    {sfxItems.map(sfx => (
                      <div className="acp-sfx-card" key={sfx.id}>
                        <div className="acp-sfx-card__header">
                          <span className="acp-sfx-card__name">
                            <span className="material-symbols-outlined" style={{ fontSize: '0.9rem', verticalAlign: 'middle', marginLeft: '0.25rem' }}>audio_file</span>
                            {sfx.fileName}
                          </span>
                          <button type="button" className="acp-sfx-card__remove" onClick={() => removeSfxItem(sfx.id)} title={t('remove', 'Ø¥Ø²Ø§Ù„Ø©')}>
                            <span className="material-symbols-outlined">close</span>
                          </button>
                        </div>
                        <div className="acp-sfx-card__controls">
                          <div className="acp-sfx-card__field">
                            <span className="acp-sfx-card__field-label">{t('timingMinSecMs', 'Ø§Ù„ØªÙˆÙ‚ÙŠØª (Ø¯Ù‚ÙŠÙ‚Ø©:Ø«Ø§Ù†ÙŠØ©.Ù…Ù„ÙŠ Ø«Ø§Ù†ÙŠØ©)')}</span>
                            <TimeInputControl
                              valueMs={sfx.startMs}
                              onChange={v => updateSfxItem(sfx.id, { startMs: v })}
                            />
                          </div>
                          <div className="acp-sfx-card__slider">
                            <span className="acp-sfx-card__field-label">{t('volumeLevel', 'Ø§Ù„ØµÙˆØª')}</span>
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
                        {t('uploadSfxAndSetTimingHint', 'Ø§Ø±ÙØ¹ Ù…Ù„ÙØ§Øª Ù…Ø¤Ø«Ø±Ø§Øª ØµÙˆØªÙŠØ© ÙˆØ­Ø¯Ø¯ Ø§Ù„ØªÙˆÙ‚ÙŠØª Ø§Ù„Ø¯Ù‚ÙŠÙ‚ Ù„ÙƒÙ„ Ù…Ø¤Ø«Ø±')}
                      </p>
                    )}
                  </div>
                )}

                {/* Advanced tools */}
                <div className="acp-mix-advanced">
                  <h3 className="acp-mix-layers__title">
                    <span className="material-symbols-outlined">tune</span> {t('advancedTools', 'Ø£Ø¯ÙˆØ§Øª Ù…ØªÙ‚Ø¯Ù…Ø©')}
                  </h3>
                  <div className="acp-mix-tools-grid">
                    {/* Auto-duck toggle */}
                    <div className="acp-mix-tool-card">
                      <div className="acp-mix-tool-card__header">
                        <span className="material-symbols-outlined">hearing</span>
                        <span>{t('musicDucking', 'Ø®ÙØ¶ Ø§Ù„Ù…ÙˆØ³ÙŠÙ‚Ù‰')}</span>
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
                      <span className="acp-mix-tool-card__desc">{t('automaticallyDuringSpeech', 'ØªÙ„Ù‚Ø§Ø¦ÙŠØ§Ù‹ Ø£Ø«Ù†Ø§Ø¡ Ø§Ù„ÙƒÙ„Ø§Ù…')}</span>
                      {autoDuckEnabled && (
                        <span className="acp-mix-tool-card__note">
                          <span className="material-symbols-outlined" style={{ fontSize: '0.7rem' }}>schedule</span>
                          {t('delayedRequiresMusicTrack', 'Ù…Ø¤Ø¬Ù„ â€” ÙŠØªØ·Ù„Ø¨ Ù…Ø³Ø§Ø± Ù…ÙˆØ³ÙŠÙ‚Ù‰')}
                        </span>
                      )}
                    </div>

                    {/* Fade In */}
                    <div className="acp-mix-tool-card">
                      <div className="acp-mix-tool-card__header">
                        <span className="material-symbols-outlined">signal_cellular_alt</span>
                        <span>Fade In</span>
                      </div>
                      <span className="acp-mix-tool-card__desc">{t('fadeInDesc', 'ØªØ¯Ø±Ø¬ Ø¯Ø®ÙˆÙ„')}</span>
                      <div className="acp-mix-tool-card__control">
                        <input
                          type="range" className="acp-range-slider" min={0} max={5000} step={100}
                          value={masterFadeInMs} onChange={e => setMasterFadeInMs(Number(e.target.value))}
                        />
                        <span className="acp-mix-tool-card__value">{(masterFadeInMs / 1000).toFixed(1)}Ø«</span>
                      </div>
                    </div>

                    {/* Fade Out */}
                    <div className="acp-mix-tool-card">
                      <div className="acp-mix-tool-card__header">
                        <span className="material-symbols-outlined">signal_cellular_alt</span>
                        <span>Fade Out</span>
                      </div>
                      <span className="acp-mix-tool-card__desc">{t('fadeOutDesc', 'ØªØ¯Ø±Ø¬ Ø®Ø±ÙˆØ¬')}</span>
                      <div className="acp-mix-tool-card__control">
                        <input
                          type="range" className="acp-range-slider" min={0} max={5000} step={100}
                          value={masterFadeOutMs} onChange={e => setMasterFadeOutMs(Number(e.target.value))}
                        />
                        <span className="acp-mix-tool-card__value">{(masterFadeOutMs / 1000).toFixed(1)}Ø«</span>
                      </div>
                    </div>

                    {/* Master Gain */}
                    <div className="acp-mix-tool-card">
                      <div className="acp-mix-tool-card__header">
                        <span className="material-symbols-outlined">volume_up</span>
                        <span>{t('masterLevel', 'Ù…Ø³ØªÙˆÙ‰ Ø§Ù„Ù…Ø§Ø³ØªØ±')}</span>
                      </div>
                      <span className="acp-mix-tool-card__desc">{t('calibrateOverallLevel', 'Ù…Ø¹Ø§ÙŠØ±Ø© Ø§Ù„Ù…Ø³ØªÙˆÙ‰ Ø§Ù„Ø¹Ø§Ù…')}</span>
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
                    <span className="material-symbols-outlined">auto_awesome</span> {t('readyPresets', 'Ù‚ÙˆØ§Ù„Ø¨ Ø¬Ø§Ù‡Ø²Ø©')}
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
                  {t('pressPreviewMixingToHearResult', 'Ø§Ø¶ØºØ· Ù…Ø¹Ø§ÙŠÙ†Ø© Ø§Ù„Ù…ÙƒØ³Ø§Ø¬ Ù„Ø³Ù…Ø§Ø¹ Ø§Ù„Ù†ØªÙŠØ¬Ø© Ù‚Ø¨Ù„ Ø§Ù„Ù†Ø´Ø±. Ø§Ù„Ù…Ù„Ù Ø§Ù„Ø£ØµÙ„ÙŠ ÙŠØ¨Ù‚Ù‰ Ù…Ø­ÙÙˆØ¸Ø§Ù‹.')}
                </p>

                {/* Reset button */}
                <button className="acp-btn acp-btn--ghost acp-btn--sm" onClick={resetMixing} type="button">
                  <span className="material-symbols-outlined">restart_alt</span> {t('reset', 'Ø¥Ø¹Ø§Ø¯Ø© Ø¶Ø¨Ø·')}
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
                    <><span className="material-symbols-outlined acp-spin">progress_activity</span> Ø¬Ø§Ø±ÙŠ Ù…Ø¹Ø§Ù„Ø¬Ø© Ø§Ù„Ù…Ø¹Ø§ÙŠÙ†Ø©...</>
                  ) : getStagePreviewStatus('mixing') === 'ready' ? (
                    <><span className="material-symbols-outlined">check_circle</span> âœ“ Ø§Ù„Ù…Ø¹Ø§ÙŠÙ†Ø© Ø¬Ø§Ù‡Ø²Ø© â€” Ø¥Ø¹Ø§Ø¯Ø© Ø§Ù„Ù…Ø¹Ø§ÙŠÙ†Ø©</>
                  ) : getStagePreviewStatus('mixing') === 'failed' ? (
                    <><span className="material-symbols-outlined">error</span> ÙØ´Ù„Øª Ø§Ù„Ù…Ø¹Ø§ÙŠÙ†Ø© â€” Ø¥Ø¹Ø§Ø¯Ø© Ø§Ù„Ù…Ø­Ø§ÙˆÙ„Ø©</>
                  ) : getStagePreviewStatus('mixing') === 'dirty' ? (
                    <><span className="material-symbols-outlined">warning</span> Ø§Ù„Ø¥Ø¹Ø¯Ø§Ø¯Ø§Øª ØªØºÙŠØ±Øª â€” Ø£Ø¹Ø¯ Ø§Ù„Ù…Ø¹Ø§ÙŠÙ†Ø©</>
                  ) : (
                    <><span className="material-symbols-outlined">play_circle</span> {t('previewMixing', 'Ù…Ø¹Ø§ÙŠÙ†Ø© Ø§Ù„Ù…ÙƒØ³Ø§Ø¬')}</>
                  )}
                </button>
                {effectsEnabled && getStagePreviewStatus('effects') !== 'ready' && (
                  <p className="acp-hint">{t('mustPreviewEffectsFirst', 'ÙŠØ¬Ø¨ Ù…Ø¹Ø§ÙŠÙ†Ø© Ø§Ù„Ù…Ø¤Ø«Ø±Ø§Øª Ø£ÙˆÙ„Ø§Ù‹')}</p>
                )}
                {!effectsEnabled && editEnabled && getStagePreviewStatus('edit') !== 'ready' && (
                  <p className="acp-hint">{t('previewCutFirst', 'ÙŠØ¬Ø¨ Ù…Ø¹Ø§ÙŠÙ†Ø© Ø§Ù„Ù‚Øµ Ø£ÙˆÙ„Ø§Ù‹')}</p>
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
                <span className="material-symbols-outlined" aria-hidden="true">{iconPrev}</span> {t('back', 'Ø±Ø¬ÙˆØ¹')}
              </button>
              <button className="acp-btn acp-btn--primary" onClick={() => saveDraft(10)} disabled={saving} type="button">
                <span className="material-symbols-outlined" aria-hidden="true">{mixingEnabled ? 'save' : 'skip_previous'}</span>
                {saving ? t('savingDots', 'Ø¬Ø§Ø±ÙŠ Ø§Ù„Ø­ÙØ¸...') : mixingEnabled ? t('saveMixing', 'Ø­ÙØ¸ Ø§Ù„Ù…ÙƒØ³Ø§Ø¬') : t('skip', 'ØªØ®Ø·ÙŠ')}
              </button>
            </div>
          </div>
        </section>
      )}

      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• STEP 10: FINAL PREVIEW â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      {step === 10 && (
        <section className="acp-section">
          <h1 className="acp-section__title">
            <span className="material-symbols-outlined" aria-hidden="true">visibility</span>
            {t('finalPreview', 'Ø§Ù„Ù…Ø¹Ø§ÙŠÙ†Ø© Ø§Ù„Ù†Ù‡Ø§Ø¦ÙŠØ©')}
          </h1>

          {/* Preview card with cover, play overlay, timer */}
          <div className="acp-preview-card">
            <div className="acp-preview-card__cover-wrap">
              {coverPreviewUrl ? (
                <img src={coverPreviewUrl} alt={t('cover', 'ØºÙ„Ø§Ù')} className="acp-preview-card__cover" />
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
                    aria-label={previewPlaying ? t('stop', 'Ø¥ÙŠÙ‚Ø§Ù') : t('play', 'ØªØ´ØºÙŠÙ„')}
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
              <h2 className="acp-preview-card__title">{title || t('untitled', 'Ø¨Ø¯ÙˆÙ† Ø¹Ù†ÙˆØ§Ù†')}</h2>
              <p className="acp-preview-card__owner">{currentUser?.displayName || t('author', 'Ø§Ù„Ù…Ø¤Ù„Ù')}</p>
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
                          {t('finalPreviewHint', 'Ø§Ù„Ù…Ø¹Ø§ÙŠÙ†Ø© Ø§Ù„Ù†Ù‡Ø§Ø¦ÙŠØ© â€” Ù‡Ø°Ø§ Ù‡Ùˆ Ø§Ù„ØµÙˆØª Ø§Ù„Ø°ÙŠ Ø³ÙŠØªÙ… Ù†Ø´Ø±Ù‡')}
                        </div>
                        <audio controls src={previewUrl} className="acp-preview-audio" />
                      </>
                    ) : (
                      <div className="acp-waveform-hint">
                        <span className="material-symbols-outlined">warning</span>
                        {t('mustPreviewEachStageBeforePublish', 'ÙŠØ¬Ø¨ Ù…Ø¹Ø§ÙŠÙ†Ø© ÙƒÙ„ Ù…Ø±Ø­Ù„Ø© Ù‚Ø¨Ù„ Ø§Ù„Ù†Ø´Ø±')}
                      </div>
                    )}
                    {anyDirty && (
                      <p className="acp-hint">
                        <span className="material-symbols-outlined acp-hint__icon">warning</span>
                        {t('someStagesNeedRePreview', 'Ø¨Ø¹Ø¶ Ø§Ù„Ù…Ø±Ø§Ø­Ù„ ØªØ­ØªØ§Ø¬ Ø¥Ø¹Ø§Ø¯Ø© Ù…Ø¹Ø§ÙŠÙ†Ø©')}
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
              <span className="material-symbols-outlined">home</span> {t('mainFeed', 'Ø§Ù„Ø±Ø¦ÙŠØ³ÙŠØ©')}
            </button>
            <button className={`acp-preview-tab ${placementFeed === 'shorts' || placementFeed === 'both' ? 'acp-preview-tab--active' : ''}`} type="button">
              <span className="material-symbols-outlined">movie</span> {t('shortsFeed', 'Ù„Ù‚Ø·Ø§Øª')}
            </button>
          </div>

          {/* Bento grid â€” publish summary */}
          <div className="acp-bento-grid">
            <div className="acp-bento-cell">
              <div className="acp-bento-cell__label">
                <span className="material-symbols-outlined">public</span> {t('publishScope', 'Ù†Ø·Ø§Ù‚ Ø§Ù„Ù†Ø´Ø±')}
              </div>
              <span className="acp-bento-cell__value">{WORLDS.find((w) => w.key === world)?.label}</span>
            </div>
            <div className="acp-bento-cell">
              <div className="acp-bento-cell__label">
                <span className="material-symbols-outlined">visibility</span> {t('privacy', 'Ø§Ù„Ø®ØµÙˆØµÙŠØ©')}
              </div>
              <span className="acp-bento-cell__value">{AUDIENCE_OPTIONS.find((a) => a.key === audience)?.label}</span>
            </div>
            <div className="acp-bento-cell">
              <div className="acp-bento-cell__label">
                <span className="material-symbols-outlined">category</span> {t('category', 'Ø§Ù„Ù‚Ø³Ù…')}
              </div>
              <span className="acp-bento-cell__value">{CATEGORIES.find((c) => c.id === categoryId)?.label || 'â€”'}</span>
            </div>
            <div className="acp-bento-cell">
              <div className="acp-bento-cell__label">
                <span className="material-symbols-outlined">segment</span> {t('subcategory', 'Ø§Ù„Ù‚Ø³Ù… Ø§Ù„ÙØ±Ø¹ÙŠ')}
              </div>
              <span className="acp-bento-cell__value">{SUBCATEGORIES_BY_CATEGORY[categoryId]?.find((s) => s.id === subcategoryId)?.label || 'â€”'}</span>
            </div>
            <div className="acp-bento-cell">
              <div className="acp-bento-cell__label">
                <span className="material-symbols-outlined">face</span> {t('ageSuitability', 'Ø§Ù„Ø¹Ù…Ø± Ø§Ù„Ù…Ù†Ø§Ø³Ø¨')}
              </div>
              <span className="acp-bento-cell__value">{ageSuitability === 'everyone' ? t('everyone', 'Ø§Ù„Ø¬Ù…ÙŠØ¹') : ageSuitability === 'teen' ? '+13' : '+18'}</span>
            </div>
            <div className="acp-bento-cell">
              <div className="acp-bento-cell__label">
                <span className="material-symbols-outlined">language</span> {t('country', 'Ø§Ù„Ø¨Ù„Ø¯')}
              </div>
              <span className="acp-bento-cell__value">{countryMode === 'all' ? t('allCountries', 'Ø¬Ù…ÙŠØ¹ Ø§Ù„Ø¯ÙˆÙ„') : countryCodes || 'â€”'}</span>
            </div>
          </div>

          {/* Status chips */}
          <div className="acp-status-chips">
            <span className={`acp-status-chip ${captionsEnabled ? 'acp-status-chip--ok' : 'acp-status-chip--skip'}`}>
              <span className="material-symbols-outlined">{captionsEnabled ? 'check_circle' : 'skip_next'}</span>
              {t('captionColon', 'Ø§Ù„ÙƒØ§Ø¨Ø´Ù†: ')} {captionsEnabled ? t('ready', 'Ø¬Ø§Ù‡Ø²') : t('skipped', 'ØªÙ… Ø§Ù„ØªØ®Ø·ÙŠ')}
            </span>
            <span className={`acp-status-chip ${coverAsset ? 'acp-status-chip--ok' : 'acp-status-chip--skip'}`}>
              <span className="material-symbols-outlined">{coverAsset ? 'check_circle' : 'image'}</span>
              {t('coverColon', 'Ø§Ù„ØºÙ„Ø§Ù: ')} {coverAsset ? t('ready', 'Ø¬Ø§Ù‡Ø²') : t('default', 'Ø§ÙØªØ±Ø§Ø¶ÙŠ')}
            </span>
            <span className={`acp-status-chip ${effectsEnabled ? 'acp-status-chip--ok' : 'acp-status-chip--skip'}`}>
              <span className="material-symbols-outlined">{effectsEnabled ? 'check_circle' : 'skip_next'}</span>
              {t('effectsColon', 'Ø§Ù„Ù…Ø¤Ø«Ø±Ø§Øª: ')} {effectsEnabled
                ? (effectsMode === 'preset' && selectedPresetId
                    ? AUDIO_PRESETS.find(p => p.id === selectedPresetId)?.label ?? t('preset', 'Ø¥Ø¹Ø¯Ø§Ø¯ Ù…Ø³Ø¨Ù‚')
                    : effectsMode === 'manual'
                      ? t('filtersCount', '{{count}} ÙÙ„Ø§ØªØ±', { count: manualFilters.filter(f => f.enabled).length })
                      : t('enabled', 'Ù…ÙØ¹Ù‘Ù„'))
                : t('skipped', 'ØªÙ… Ø§Ù„ØªØ®Ø·ÙŠ')}
            </span>
            <span className={`acp-status-chip ${mixingEnabled ? 'acp-status-chip--done' : 'acp-status-chip--skip'}`}>
              <span className="material-symbols-outlined">{mixingEnabled ? 'graphic_eq' : 'skip_next'}</span>
              {t('mixingColon', 'Ø§Ù„Ù…ÙƒØ³Ø§Ø¬: ')} {mixingEnabled
                ? (selectedMixPresetId
                    ? MIXING_PRESET_DEFS.find(p => p.id === selectedMixPresetId)?.label || t('custom', 'Ù…Ø®ØµØµ')
                    : t('manualAdjustment', 'Ø¶Ø¨Ø· ÙŠØ¯ÙˆÙŠ'))
                : t('skipped', 'ØªÙ… Ø§Ù„ØªØ®Ø·ÙŠ')}
            </span>
            <span className={`acp-status-chip ${editEnabled ? 'acp-status-chip--done' : 'acp-status-chip--skip'}`}>
              <span className="material-symbols-outlined">{editEnabled ? 'content_cut' : 'skip_next'}</span>
              {t('trimColon', 'Ø§Ù„Ù‚Øµ: ')} {editEnabled
                ? formatDuration(editedDurationMs)
                : t('skipped', 'ØªÙ… Ø§Ù„ØªØ®Ø·ÙŠ')}
            </span>
          </div>

          {/* Safety / review checklist */}
          <div className="acp-safety-list">
            <h3 className="acp-safety-list__title">{t('checklist', 'Ù‚Ø§Ø¦Ù…Ø© Ø§Ù„ØªØ­Ù‚Ù‚')}</h3>
            <div className="acp-safety-item">
              <span className="material-symbols-outlined">check</span>
              {t('contentCompliesWithPolicy', 'Ø§Ù„Ù…Ø­ØªÙˆÙ‰ ÙŠØªÙˆØ§ÙÙ‚ Ù…Ø¹ Ø³ÙŠØ§Ø³Ø© Ø§Ù„Ø§Ø³ØªØ®Ø¯Ø§Ù…')}
            </div>
            <div className="acp-safety-item">
              <span className="material-symbols-outlined">check</span>
              {t('noCopyrightedMaterials', 'Ù„Ø§ ÙŠØ­ØªÙˆÙŠ Ø¹Ù„Ù‰ Ù…ÙˆØ§Ø¯ Ù…Ø­Ù…ÙŠØ© Ø¨Ø­Ù‚ÙˆÙ‚ Ù…Ù„ÙƒÙŠØ©')}
            </div>
            <div className="acp-safety-item">
              <span className="material-symbols-outlined">check</span>
              {t('ageSuitabilityAppropriate', 'Ø§Ù„ÙØ¦Ø© Ø§Ù„Ø¹Ù…Ø±ÙŠØ© Ù…Ù†Ø§Ø³Ø¨Ø© Ù„Ù„Ù…Ø­ØªÙˆÙ‰')}
            </div>
          </div>

          {/* Edit-back links */}
          <div className="acp-editback">
            <h3 className="acp-editback__title">{t('editSections', 'ØªØ¹Ø¯ÙŠÙ„ Ø§Ù„Ø£Ù‚Ø³Ø§Ù…')}</h3>
            <div className="acp-editback__links">
              <button className="acp-editback__link" onClick={() => setStep(1)}><span className="material-symbols-outlined">edit_note</span> {t('info', 'Ø§Ù„Ù…Ø¹Ù„ÙˆÙ…Ø§Øª')}</button>
              <button className="acp-editback__link" onClick={() => setStep(2)}><span className="material-symbols-outlined">tune</span> {t('publishDetails', 'ØªÙØ§ØµÙŠÙ„ Ø§Ù„Ù†Ø´Ø±')}</button>
              <button className="acp-editback__link" onClick={() => setStep(3)}><span className="material-symbols-outlined">image</span> {t('cover', 'Ø§Ù„ØºÙ„Ø§Ù')}</button>
              <button className="acp-editback__link" onClick={() => setStep(4)}><span className="material-symbols-outlined">subtitles</span> {t('subtitles', 'Ø§Ù„ØªØ±Ø¬Ù…Ø©')}</button>
              <button className="acp-editback__link" onClick={() => setStep(5)}><span className="material-symbols-outlined">teleprompter</span> {t('teleprompter', 'Ø§Ù„Ù…Ù„Ù‚Ù†')}</button>
              <button className="acp-editback__link" onClick={() => { setAudioAsset(null); uploader.reset(); recorder.reset(); setStep(6); }}><span className="material-symbols-outlined">mic</span> {t('recording', 'Ø§Ù„ØªØ³Ø¬ÙŠÙ„')}</button>
            </div>
          </div>

          {/* Bottom navigation */}
          <div className="acp-nav-row">
            <button className="acp-btn acp-btn--ghost" onClick={() => setStep(9)} type="button">
              <span className="material-symbols-outlined" aria-hidden="true">{iconPrev}</span> {t('back', 'Ø±Ø¬ÙˆØ¹')}
            </button>
            <button className="acp-btn acp-btn--primary" onClick={() => saveDraft(11)} disabled={saving} type="button">
              {saving ? <><span className="acp-spinner" aria-hidden="true" /> {t('savingDots', 'Ø­ÙØ¸...')}</> : <><span className="material-symbols-outlined" aria-hidden="true">publish</span> {t('confirmPublish', 'ØªØ£ÙƒÙŠØ¯ Ø§Ù„Ù†Ø´Ø±')}</>}
            </button>
          </div>
        </section>
      )}

      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• STEP 11: REVIEW DETAILS â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      {step === 11 && (
        <section className="acp-section">
          <h1 className="acp-section__title">
            <span className="material-symbols-outlined" aria-hidden="true">fact_check</span>
            {t('reviewDetailsAndPublish', 'Ù…Ø±Ø§Ø¬Ø¹Ø© Ø§Ù„ØªÙØ§ØµÙŠÙ„ ÙˆØ§Ù„Ù†Ø´Ø±')}
          </h1>
          <div className="acp-form">
            {/* â”€â”€ Readiness checklist â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            <div className="acp-checklist">
              <div className={`acp-checklist__item ${title ? 'acp-checklist__item--ok' : 'acp-checklist__item--fail'}`}>
                <span className="material-symbols-outlined">{title ? 'check_circle' : 'cancel'}</span> {t('title', 'Ø§Ù„Ø¹Ù†ÙˆØ§Ù†')}
              </div>
              <div className={`acp-checklist__item ${audioAsset ? 'acp-checklist__item--ok' : 'acp-checklist__item--fail'}`}>
                <span className="material-symbols-outlined">{audioAsset ? 'check_circle' : 'cancel'}</span> {t('audioFile', 'Ø§Ù„Ù…Ù„Ù Ø§Ù„ØµÙˆØªÙŠ')}
              </div>
              <div className={`acp-checklist__item ${coverAsset ? 'acp-checklist__item--ok' : 'acp-checklist__item--warn'}`}>
                <span className="material-symbols-outlined">{coverAsset ? 'check_circle' : 'info'}</span> {t('cover', 'Ø§Ù„ØºÙ„Ø§Ù')} {!coverAsset && t('defaultParentheses', '(Ø§ÙØªØ±Ø§Ø¶ÙŠ)')}
              </div>
            </div>

            {/* â”€â”€ Info card â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            <div className="acp-rd-card">
              <h3 className="acp-rd-card__title"><span className="material-symbols-outlined">edit_note</span> {t('info', 'Ø§Ù„Ù…Ø¹Ù„ÙˆÙ…Ø§Øª')}</h3>
              <div className="acp-rd-card__row"><span>{t('titleColon', 'Ø§Ù„Ø¹Ù†ÙˆØ§Ù†:')}</span> <strong>{title || 'â€”'}</strong></div>
              {caption && <div className="acp-rd-card__row"><span>{t('descriptionColon', 'Ø§Ù„ÙˆØµÙ:')}</span> {caption}</div>}
              <div className="acp-rd-card__row"><span>{t('worldColon', 'Ø§Ù„Ø¹Ø§Ù„Ù…:')}</span> {WORLDS.find((w) => w.key === world)?.label}</div>
              <div className="acp-rd-card__row"><span>{t('kindColon', 'Ø§Ù„Ù†ÙˆØ¹:')}</span> {(KINDS_BY_WORLD[world] ?? []).find((k) => k.key === kind)?.label}</div>
            </div>

            {/* â”€â”€ Publish Details card â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            <div className="acp-rd-card">
              <h3 className="acp-rd-card__title"><span className="material-symbols-outlined">tune</span> {t('publishDetails', 'ØªÙØ§ØµÙŠÙ„ Ø§Ù„Ù†Ø´Ø±')}</h3>
              <div className="acp-rd-card__row"><span>{t('categoryColon', 'Ø§Ù„ØªØµÙ†ÙŠÙ:')}</span> {CATEGORIES.find((c) => c.id === categoryId)?.label || t('notSelected', 'â€” Ù„Ù… ÙŠÙØ­Ø¯Ø¯ â€”')}</div>
              {subcategoryId && <div className="acp-rd-card__row"><span>{t('subcategoryColon', 'Ø§Ù„ÙØ±Ø¹ÙŠ:')}</span> {SUBCATEGORIES_BY_CATEGORY[categoryId]?.find((s) => s.id === subcategoryId)?.label || 'â€”'}</div>}
              <div className="acp-rd-card__row"><span>{t('tagsColon', 'Ø§Ù„ÙˆØ³ÙˆÙ…:')}</span> {tags || t('noTags', 'â€” Ø¨Ø¯ÙˆÙ† ÙˆØ³ÙˆÙ… â€”')}</div>
              <div className="acp-rd-card__row"><span>{t('languageColon', 'Ø§Ù„Ù„ØºØ©:')}</span> {LANGUAGES.find((l) => l.code === language)?.label}</div>
              <div className="acp-rd-card__row"><span>{t('countriesColon', 'Ø§Ù„Ø¯ÙˆÙ„:')}</span> {countryMode === 'all' ? t('allCountries', 'Ø¬Ù…ÙŠØ¹ Ø§Ù„Ø¯ÙˆÙ„') : countryCodes || 'â€”'}</div>
              <div className="acp-rd-card__row"><span>{t('ageSuitabilityColon', 'Ø§Ù„ÙØ¦Ø© Ø§Ù„Ø¹Ù…Ø±ÙŠØ©:')}</span> {ageSuitability === 'everyone' ? t('everyone', 'Ø§Ù„Ø¬Ù…ÙŠØ¹') : ageSuitability === 'teen' ? t('teenagers13', '+13 Ù…Ø±Ø§Ù‡Ù‚ÙŠÙ†') : t('adults18', '+18 Ø¨Ø§Ù„ØºÙŠÙ†')}</div>
              <div className="acp-rd-card__row"><span>{t('explicitContentColon', 'Ù…Ø­ØªÙˆÙ‰ ØµØ±ÙŠØ­:')}</span> {isExplicit ? t('yes', 'Ù†Ø¹Ù…') : t('no', 'Ù„Ø§')}</div>
              <div className="acp-rd-card__row"><span>{t('childContentColon', 'Ù…Ø­ØªÙˆÙ‰ Ø£Ø·ÙØ§Ù„:')}</span> {isChildContent ? t('yes', 'Ù†Ø¹Ù…') : t('no', 'Ù„Ø§')}</div>
              <div className="acp-rd-card__row"><span>{t('publishPlacementColon', 'Ù…ÙˆØ¶Ø¹ Ø§Ù„Ù†Ø´Ø±:')}</span> {placementFeed === 'main' ? t('mainFeed', 'Ø§Ù„Ø±Ø¦ÙŠØ³ÙŠØ©') : placementFeed === 'shorts' ? t('shortsFeed', 'Ù„Ù‚Ø·Ø§Øª') : t('both', 'ÙƒÙ„Ø§Ù‡Ù…Ø§')}</div>
            </div>

            {/* â”€â”€ Audience card â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            <div className="acp-rd-card">
              <h3 className="acp-rd-card__title"><span className="material-symbols-outlined">group</span> {t('audienceAndSettings', 'Ø§Ù„Ø¬Ù…Ù‡ÙˆØ± ÙˆØ§Ù„Ø¥Ø¹Ø¯Ø§Ø¯Ø§Øª')}</h3>
              <div className="acp-rd-card__row"><span>{t('audienceColon', 'Ø§Ù„Ø¬Ù…Ù‡ÙˆØ±:')}</span> {AUDIENCE_OPTIONS.find((a) => a.key === audience)?.label}</div>
              <div className="acp-rd-card__row">
                <span>{t('commentsColon', 'Ø§Ù„ØªØ¹Ù„ÙŠÙ‚Ø§Øª:')}</span>
                <span className="material-symbols-outlined" style={{ color: commentsEnabled ? '#22c55e' : '#ef4444' }}>{commentsEnabled ? 'check_circle' : 'cancel'}</span>
                {commentsEnabled ? t('allowed', 'Ù…Ø³Ù…ÙˆØ­Ø©') : t('closed', 'Ù…ØºÙ„Ù‚Ø©')}
              </div>
              <div className="acp-rd-card__row">
                <span>{t('giftsColon', 'Ø§Ù„Ù‡Ø¯Ø§ÙŠØ§:')}</span>
                <span className="material-symbols-outlined" style={{ color: giftsEnabled ? '#22c55e' : '#ef4444' }}>{giftsEnabled ? 'check_circle' : 'cancel'}</span>
                {giftsEnabled ? t('allowed', 'Ù…Ø³Ù…ÙˆØ­Ø©') : t('closed', 'Ù…ØºÙ„Ù‚Ø©')}
              </div>
              <div className="acp-rd-card__row">
                <span>{t('sharingColon', 'Ø§Ù„Ù…Ø´Ø§Ø±ÙƒØ©:')}</span>
                <span className="material-symbols-outlined" style={{ color: sharingEnabled ? '#22c55e' : '#ef4444' }}>{sharingEnabled ? 'check_circle' : 'cancel'}</span>
                {sharingEnabled ? t('allowed', 'Ù…Ø³Ù…ÙˆØ­Ø©') : t('closed', 'Ù…ØºÙ„Ù‚Ø©')}
              </div>
            </div>

            {/* â”€â”€ Cover card â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            <div className="acp-rd-card">
              <h3 className="acp-rd-card__title"><span className="material-symbols-outlined">image</span> {t('cover', 'Ø§Ù„ØºÙ„Ø§Ù')}</h3>
              <div className="acp-rd-card__row">
                <span>{t('statusColon', 'Ø§Ù„Ø­Ø§Ù„Ø©:')}</span>
                {coverAsset ? (
                  <>
                    <span className="material-symbols-outlined" style={{ color: '#22c55e' }}>
                      {coverAsset.sourceType === 'uploaded' ? 'image' : coverAsset.sourceType === 'ai' ? 'auto_awesome' : 'image'}
                    </span>
                    {coverAsset.sourceType === 'uploaded' ? t('uploadedImage', 'ØµÙˆØ±Ø© Ù…Ø±ÙÙˆØ¹Ø©') : coverAsset.sourceType === 'ai' ? t('smartCoverLocked', 'ØºÙ„Ø§Ù Ø°ÙƒÙŠ (Ù…Ù‚ÙÙ„)') : t('uploaded', 'Ù…Ø±ÙÙˆØ¹')}
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined">image</span>
                    {t('defaultNoCoverAttached', 'Ø§ÙØªØ±Ø§Ø¶ÙŠ â€” Ù„Ù… ÙŠÙØ±ÙÙ‚ ØºÙ„Ø§Ù')}
                  </>
                )}
              </div>
            </div>

            {/* â”€â”€ Captions card â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            <div className="acp-rd-card">
              <h3 className="acp-rd-card__title"><span className="material-symbols-outlined">subtitles</span> {t('subtitles', 'Ø§Ù„ØªØ±Ø¬Ù…Ø©')}</h3>
              <div className="acp-rd-card__row">
                <span>{t('statusColon', 'Ø§Ù„Ø­Ø§Ù„Ø©:')}</span>
                <span className="material-symbols-outlined" style={{ color: captionsEnabled ? '#22c55e' : '#94a3b8' }}>
                  {captionsEnabled ? 'check_circle' : 'skip_next'}
                </span>
                {captionsEnabled ? t('enabled_f', 'Ù…ÙØ¹Ù‘Ù„Ø©') : t('skipped', 'ØªÙ… Ø§Ù„ØªØ®Ø·ÙŠ')}
              </div>
              {captionsEnabled && <div className="acp-rd-card__row"><span>{t('languageColon', 'Ø§Ù„Ù„ØºØ©:')}</span> {LANGUAGES.find((l) => l.code === captionLang)?.label}</div>}
              {captionsEnabled && <div className="acp-rd-card__row"><span>{t('styleColon', 'Ø§Ù„Ù†Ù…Ø·:')}</span> {captionStyle === 'standard' ? t('normal', 'Ø¹Ø§Ø¯ÙŠ') : captionStyle === 'karaoke' ? t('karaoke', 'ÙƒØ§Ø±ÙŠÙˆÙƒÙŠ') : t('bottomSubtitles', 'ØªØ±Ø¬Ù…Ø© Ø³ÙÙ„ÙŠØ©')}</div>}
            </div>

            {/* â”€â”€ AutoCue card â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            <div className="acp-rd-card">
              <h3 className="acp-rd-card__title"><span className="material-symbols-outlined">teleprompter</span> {t('teleprompter', 'Ø§Ù„Ù…Ù„Ù‚Ù†')}</h3>
              <div className="acp-rd-card__row">
                <span>{t('statusColon', 'Ø§Ù„Ø­Ø§Ù„Ø©:')}</span>
                <span className="material-symbols-outlined" style={{ color: autoCueEnabled ? '#22c55e' : '#94a3b8' }}>
                  {autoCueEnabled ? 'check_circle' : 'skip_next'}
                </span>
                {autoCueEnabled ? t('enabled', 'Ù…ÙØ¹Ù‘Ù„') : t('skipped', 'ØªÙ… Ø§Ù„ØªØ®Ø·ÙŠ')}
              </div>
              {autoCueEnabled && (
                <>
                  <div className="acp-rd-card__row"><span>{t('textSourceColon', 'Ù…ØµØ¯Ø± Ø§Ù„Ù†Øµ:')}</span> {t('manual', 'ÙŠØ¯ÙˆÙŠ')}</div>
                  <div className="acp-rd-card__row"><span>{t('speedColon', 'Ø§Ù„Ø³Ø±Ø¹Ø©:')}</span> {scrollSpeed === 'slow' ? t('slow', 'Ø¨Ø·ÙŠØ¡') : scrollSpeed === 'medium' ? t('medium', 'Ù…ØªÙˆØ³Ø·') : t('fast', 'Ø³Ø±ÙŠØ¹')}</div>
                  <div className="acp-rd-card__row"><span>{t('fontSizeColon', 'Ø­Ø¬Ù… Ø§Ù„Ø®Ø·:')}</span> {fontSize === 'small' ? t('small', 'ØµØºÙŠØ±') : fontSize === 'medium' ? t('medium', 'Ù…ØªÙˆØ³Ø·') : t('large', 'ÙƒØ¨ÙŠØ±')}</div>
                  <div className="acp-rd-card__row"><span>{t('readingModeColon', 'ÙˆØ¶Ø¹ Ø§Ù„Ù‚Ø±Ø§Ø¡Ø©:')}</span> {readingMode === 'lineByLine' ? t('lineByLine', 'Ø³Ø·Ø± Ø¨Ø³Ø·Ø±') : t('paragraphByParagraph', 'ÙÙ‚Ø±Ø© Ø¨ÙÙ‚Ø±Ø©')}</div>
                  <div className="acp-rd-card__row"><span>{t('startDelayColon', 'ØªØ£Ø®ÙŠØ± Ø§Ù„Ø¨Ø¯Ø§ÙŠØ©:')}</span> {startDelay}{t('seconds', ' Ø«ÙˆØ§Ù†')}</div>
                  <div className="acp-rd-card__row"><span>{t('highlightLineColon', 'ØªÙ…ÙŠÙŠØ² Ø§Ù„Ø³Ø·Ø±:')}</span> {highlightLine ? t('enabled', 'Ù…ÙØ¹Ù‘Ù„') : t('disabled', 'Ù…Ø¹Ø·Ù‘Ù„')}</div>
                  {scriptText && <div className="acp-rd-card__row acp-rd-card__row--script"><span>{t('textPreviewColon', 'Ù…Ø¹Ø§ÙŠÙ†Ø© Ø§Ù„Ù†Øµ:')}</span> <em>{scriptText.length > 120 ? scriptText.slice(0, 120) + '...' : scriptText}</em></div>}
                </>
              )}
            </div>

            {/* â”€â”€ Audio card â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            <div className="acp-rd-card">
              <h3 className="acp-rd-card__title"><span className="material-symbols-outlined">mic</span> {t('audio', 'Ø§Ù„ØµÙˆØª')}</h3>
              {audioAsset ? (
                <>
                  <div className="acp-rd-card__row"><span>{t('fileColon', 'Ø§Ù„Ù…Ù„Ù:')}</span> {audioAsset.originalFileName}</div>
                  <div className="acp-rd-card__row">
                    <span>{t('sourceColon', 'Ø§Ù„Ù…ØµØ¯Ø±:')}</span>
                    <span className="material-symbols-outlined">{audioAsset.sourceType === 'recorded' ? 'mic' : 'upload_file'}</span>
                    {audioAsset.sourceType === 'recorded' ? t('recorded', 'Ù…Ø³Ø¬Ù‘Ù„') : t('uploaded', 'Ù…Ø±ÙÙˆØ¹')}
                  </div>
                  {audioAsset.durationMs ? <div className="acp-rd-card__row"><span>{t('durationColon', 'Ø§Ù„Ù…Ø¯Ø©:')}</span> {formatDuration(audioAsset.durationMs)}</div> : null}
                  {audioAsset.sizeBytes ? <div className="acp-rd-card__row"><span>{t('sizeColon', 'Ø§Ù„Ø­Ø¬Ù…:')}</span> {formatFileSize(audioAsset.sizeBytes)}</div> : null}
                  <div className="acp-rd-card__row"><span>{t('typeColon', 'Ø§Ù„Ù†ÙˆØ¹:')}</span> {audioAsset.mimeType}</div>
                </>
              ) : (
                <div className="acp-rd-card__row acp-rd-card__row--warn">
                  <span className="material-symbols-outlined">cancel</span> {t('noAudioFileCannotPublish', 'Ù„Ø§ ÙŠÙˆØ¬Ø¯ Ù…Ù„Ù ØµÙˆØªÙŠ â€” Ù„Ø§ ÙŠÙ…ÙƒÙ† Ø§Ù„Ù†Ø´Ø±.')}
                </div>
              )}
            </div>

            {/* â”€â”€ Effects & Mixing card â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            <div className="acp-rd-card">
              <h3 className="acp-rd-card__title"><span className="material-symbols-outlined">tune</span> {t('effectsAndMixing', 'Ø§Ù„Ù…Ø¤Ø«Ø±Ø§Øª ÙˆØ§Ù„Ù…ÙƒØ³Ø§Ø¬')}</h3>
              <div className="acp-rd-card__row">
                <span>{t('effectsColon', 'Ø§Ù„Ù…Ø¤Ø«Ø±Ø§Øª:')}</span>
                {effectsEnabled ? (
                  <>
                    <span className="material-symbols-outlined" style={{ color: 'var(--accent-teal, #2dd4bf)' }}>check_circle</span>
                    {effectsMode === 'preset' && selectedPresetId
                      ? AUDIO_PRESETS.find(p => p.id === selectedPresetId)?.label ?? t('preset', 'Ø¥Ø¹Ø¯Ø§Ø¯ Ù…Ø³Ø¨Ù‚')
                      : effectsMode === 'manual'
                        ? t('filtersCount', '{{count}} ÙÙ„Ø§ØªØ±', { count: manualFilters.filter(f => f.enabled).length })
                        : t('enabled', 'Ù…ÙØ¹Ù‘Ù„')}
                    <span className="acp-hint" style={{ fontSize: '0.75rem', display: 'block', marginTop: '0.25rem' }}>
                      {t('previewAvailable', 'Ø§Ù„Ù…Ø¹Ø§ÙŠÙ†Ø© Ù…ØªØ§Ø­Ø©')}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined" style={{ color: '#94a3b8' }}>skip_next</span>
                    {t('skippedNoProcessingApplied', 'ØªÙ… Ø§Ù„ØªØ®Ø·ÙŠ â€” Ù„Ù… ÙŠØªÙ… ØªØ·Ø¨ÙŠÙ‚ Ø£ÙŠ Ù…Ø¹Ø§Ù„Ø¬Ø©')}
                  </>
                )}
              </div>
              <div className="acp-rd-card__row">
                <span>{t('mixingColon', 'Ø§Ù„Ù…ÙƒØ³Ø§Ø¬:')}</span>
                {mixingEnabled ? (
                  <>
                    <span className="material-symbols-outlined" style={{ color: 'var(--accent-teal, #2dd4bf)' }}>check_circle</span>
                    {selectedMixPresetId
                      ? MIXING_PRESET_DEFS.find(p => p.id === selectedMixPresetId)?.label ?? t('custom', 'Ù…Ø®ØµØµ')
                      : t('manualAdjustment', 'Ø¶Ø¨Ø· ÙŠØ¯ÙˆÙŠ')}
                    <span className="acp-hint" style={{ fontSize: '0.75rem', display: 'block', marginTop: '0.25rem' }}>
                      {t('yourVoiceColon', 'ØµÙˆØªÙƒ:')} {dbToPercent(mixTracks.find(t => t.type === 'voice')?.volumeDb ?? 0)}%
                      {masterFadeInMs > 0 && ` Â· Fade In: ${(masterFadeInMs/1000).toFixed(1)}${t('seconds', 'Ø«')}`}
                      {masterFadeOutMs > 0 && ` Â· Fade Out: ${(masterFadeOutMs/1000).toFixed(1)}${t('seconds', 'Ø«')}`}
                      {masterGainDb !== 0 && ` Â· ${t('masterColon', 'Ù…Ø§Ø³ØªØ±:')} ${masterGainDb > 0 ? '+' : ''}${masterGainDb}dB`}
                      {autoDuckEnabled && ` Â· ${t('autoDuckingDelayed', 'Ø®ÙØ¶ ØªÙ„Ù‚Ø§Ø¦ÙŠ (Ù…Ø¤Ø¬Ù„)')}`}
                      {mixTracks.find(t => t.type === 'musicBed' && t.storagePath) && ` Â· ${t('musicColon', 'Ù…ÙˆØ³ÙŠÙ‚Ù‰:')} ${mixTracks.find(t => t.type === 'musicBed')?.fileName || t('uploaded_f', 'Ù…Ø±ÙÙˆØ¹Ø©')}`}
                      {sfxItems.length > 0 && ` Â· ${t('effectsColon', 'Ù…Ø¤Ø«Ø±Ø§Øª:')} ${sfxItems.filter(s => s.enabled).length} ${t('effect', 'Ù…Ø¤Ø«Ø±')}`}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined" style={{ color: '#94a3b8' }}>skip_next</span>
                    {t('skippedNoMixingApplied', 'ØªÙ… Ø§Ù„ØªØ®Ø·ÙŠ â€” Ù„Ù… ÙŠØªÙ… ØªØ·Ø¨ÙŠÙ‚ Ø£ÙŠ Ø®Ù„Ø·')}
                  </>
                )}
              </div>
              <div className="acp-rd-card__row">
                <span>{t('trimAndEditColon', 'Ø§Ù„Ù‚Øµ ÙˆØ§Ù„ØªØ¹Ø¯ÙŠÙ„:')}</span>
                {editEnabled ? (
                  <>
                    <span className="material-symbols-outlined" style={{ color: 'var(--accent-teal, #2dd4bf)' }}>check_circle</span>
                    {t('trimEnabled', 'Ù‚Øµ Ù…ÙØ¹Ù‘Ù„')}
                    <span className="acp-hint" style={{ fontSize: '0.75rem', display: 'block', marginTop: '0.25rem' }}>
                      {trimStartMs > 0 && `${t('startColon', 'Ø¨Ø¯Ø§ÙŠØ©:')} ${formatDuration(trimStartMs)}`}
                      {trimStartMs > 0 && (trimEndMs > 0 || editCuts.length > 0) && ' Â· '}
                      {trimEndMs > 0 && trimEndMs < originalDurationMs && `${t('endColon', 'Ù†Ù‡Ø§ÙŠØ©:')} ${formatDuration(trimEndMs)}`}
                      {trimEndMs > 0 && editCuts.length > 0 && ' Â· '}
                      {editCuts.length > 0 && `${editCuts.length} ${t('cutSection', 'Ù…Ù‚Ø·Ø¹ Ù…Ø­Ø°ÙˆÙ')}`}
                      {` Â· ${t('durationColon', 'Ø§Ù„Ù…Ø¯Ø©:')} ${formatDuration(editedDurationMs)}`}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined" style={{ color: '#94a3b8' }}>skip_next</span>
                    {t('noTrimApplied', 'Ù„Ù… ÙŠØªÙ… ØªØ·Ø¨ÙŠÙ‚ Ø£ÙŠ Ù‚Øµ')}
                  </>
                )}
              </div>
            </div>

            {/* â”€â”€ Moderation notice â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            <div className="acp-publish-notice">
              <span className="material-symbols-outlined" aria-hidden="true">gavel</span>
              <p>{t('publishAgreementNotice', 'Ø¨Ø§Ù„Ù†Ø´Ø±ØŒ Ø£Ù†Øª ØªÙˆØ§ÙÙ‚ Ø¹Ù„Ù‰ Ø£Ù† Ø§Ù„Ù…Ø­ØªÙˆÙ‰ ÙŠØªÙˆØ§ÙÙ‚ Ù…Ø¹ Ø³ÙŠØ§Ø³Ø© Ø§Ù„Ø§Ø³ØªØ®Ø¯Ø§Ù…. Ø§Ù„Ù…Ø­ØªÙˆÙ‰ Ù‚Ø¯ ÙŠØ®Ø¶Ø¹ Ù„Ù…Ø±Ø§Ø¬Ø¹Ø© ÙØ±ÙŠÙ‚ Ø§Ù„Ø¥Ø´Ø±Ø§Ù Ù‚Ø¨Ù„ Ø§Ù„Ø¸Ù‡ÙˆØ± Ø§Ù„Ø¹Ù„Ù†ÙŠ.')}</p>
            </div>
            {publishError && <p className="acp-error">{publishError}</p>}
            <div className="acp-nav-row">
              <button className="acp-btn acp-btn--ghost" onClick={() => setStep(10)} type="button">
                <span className="material-symbols-outlined" aria-hidden="true">{iconPrev}</span> {t('back', 'Ø±Ø¬ÙˆØ¹')}
              </button>
              <button className="acp-btn acp-btn--primary acp-btn--lg" onClick={handlePublish} disabled={publishing || !audioAsset} type="button">
                {publishing ? <><span className="acp-spinner" aria-hidden="true" /> {t('publishingDots', 'Ø¬Ø§Ø±ÙŠ Ø§Ù„Ù†Ø´Ø±...')}</> : <><span className="material-symbols-outlined" aria-hidden="true">publish</span> {t('publishContent', 'Ù†Ø´Ø± Ø§Ù„Ù…Ø­ØªÙˆÙ‰')}</>}
              </button>
            </div>
          </div>
        </section>
      )}

      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• STEP 12: PUBLISH RESULT â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      {step === 12 && publishResult && (
        <section className="acp-section">
          {/* Hero section with animated ping */}
          <div className="acp-publish-hero">
            <div className="acp-publish-hero__icon-wrap">
              <span className="acp-publish-hero__ping" />
              <span className="material-symbols-outlined">check_circle</span>
            </div>
            <h2>{t('audioSent', 'ØªÙ… Ø¥Ø±Ø³Ø§Ù„ Ø§Ù„ØµÙˆØª')}</h2>
            <p className="acp-publish-hero__subtitle">{t('willNotifyPublishStatus', 'Ø³Ù†Ø®Ø¨Ø±Ùƒ Ø¨Ø­Ø§Ù„Ø© Ø§Ù„Ù†Ø´Ø± ÙÙˆØ±Ø§Ù‹')}</p>
          </div>

          {/* Status card */}
          <div className="acp-status-card">
            <span className="acp-status-card__badge">
              <span className="material-symbols-outlined">hourglass_empty</span>
              {t('underReview', 'Ù‚ÙŠØ¯ Ø§Ù„Ù…Ø±Ø§Ø¬Ø¹Ø©')}
            </span>
            <p className="acp-status-card__desc">
              {t('contentReceivedSuccessfullyReviewPolicy', 'ØªÙ… Ø§Ø³ØªÙ„Ø§Ù… Ø§Ù„Ù…Ø­ØªÙˆÙ‰ Ø¨Ù†Ø¬Ø§Ø­. Ø³ÙŠØªÙ… Ù…Ø±Ø§Ø¬Ø¹ØªÙ‡ ÙˆÙÙ‚Ø§Ù‹ Ù„Ø³ÙŠØ§Ø³Ø© Ø§Ù„Ø§Ø³ØªØ®Ø¯Ø§Ù… Ù‚Ø¨Ù„ Ø§Ù„Ù†Ø´Ø± Ø§Ù„Ø¹Ù„Ù†ÙŠ.')}
            </p>
            <div className="acp-reason-chips">
              {categoryId && <span className="acp-reason-chip">{CATEGORIES.find((c) => c.id === categoryId)?.label}</span>}
              <span className="acp-reason-chip">{ageSuitability === 'everyone' ? t('everyone', 'Ø§Ù„Ø¬Ù…ÙŠØ¹') : ageSuitability === 'teen' ? '+13' : '+18'}</span>
              <span className="acp-reason-chip">{WORLDS.find((w) => w.key === world)?.label}</span>
              <span className="acp-reason-chip">{t('autoReview', 'Ù…Ø±Ø§Ø¬Ø¹Ø© ØªÙ„Ù‚Ø§Ø¦ÙŠØ©')}</span>
            </div>
          </div>

          {/* Post summary card */}
          <div className="acp-post-summary">
            {coverPreviewUrl ? (
              <img src={coverPreviewUrl} alt={t('cover', 'ØºÙ„Ø§Ù')} className="acp-post-summary__cover" />
            ) : (
              <div className="acp-post-summary__cover--default">
                <span className="material-symbols-outlined">music_note</span>
              </div>
            )}
            <div className="acp-post-summary__body">
              <h3 className="acp-post-summary__title">{title || t('untitled', 'Ø¨Ø¯ÙˆÙ† Ø¹Ù†ÙˆØ§Ù†')}</h3>
              <div className="acp-post-summary__meta">
                {audioAsset?.durationMs ? (
                  <span className="acp-post-summary__meta-item">
                    <span className="material-symbols-outlined">schedule</span>
                    {formatDuration(audioAsset.durationMs)}
                  </span>
                ) : null}
                <span className="acp-post-summary__meta-item">
                  <span className="material-symbols-outlined">{captionsEnabled ? 'subtitles' : 'subtitles_off'}</span>
                  {captionsEnabled ? t('subtitles', 'ØªØ±Ø¬Ù…Ø©') : t('noSubtitles', 'Ø¨Ø¯ÙˆÙ† ØªØ±Ø¬Ù…Ø©')}
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
              <div className="acp-timeline__info"><p className="acp-timeline__info-label">{t('audioFileUploaded', 'ØªÙ… Ø±ÙØ¹ Ø§Ù„Ù…Ù„Ù Ø§Ù„ØµÙˆØªÙŠ')}</p></div>
            </div>
            <div className="acp-timeline__step acp-timeline__step--done">
              <div className="acp-timeline__dot"><span className="material-symbols-outlined">check</span></div>
              <div className="acp-timeline__info"><p className="acp-timeline__info-label">{t('dataSaved', 'ØªÙ… Ø­ÙØ¸ Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª')}</p></div>
            </div>
            <div className="acp-timeline__step acp-timeline__step--active">
              <div className="acp-timeline__dot"><span className="material-symbols-outlined">hourglass_empty</span></div>
              <div className="acp-timeline__info"><p className="acp-timeline__info-label">{t('processingAndChecking', 'Ø¬Ø§Ø±ÙŠ Ø§Ù„ÙØ­Øµ ÙˆØ§Ù„Ù…Ø¹Ø§Ù„Ø¬Ø©')}</p></div>
            </div>
            <div className="acp-timeline__step acp-timeline__step--pending">
              <div className="acp-timeline__dot"><span className="material-symbols-outlined">schedule</span></div>
              <div className="acp-timeline__info"><p className="acp-timeline__info-label">{t('publicPublish', 'Ø§Ù„Ù†Ø´Ø± Ø§Ù„Ø¹Ù„Ù†ÙŠ')}</p></div>
            </div>
          </div>

          {/* Info note */}
          <div className="acp-publish-notice acp-publish-notice--info">
            <span className="material-symbols-outlined" aria-hidden="true">info</span>
            <p>{t('someAccountsInstantPublishStatusPage', 'Ø¨Ø¹Ø¶ Ø§Ù„Ø­Ø³Ø§Ø¨Ø§Øª ØªØªÙ…ØªØ¹ Ø¨Ù…ÙŠØ²Ø© Ø§Ù„Ù†Ø´Ø± Ø§Ù„ÙÙˆØ±ÙŠ. Ø­Ø§Ù„Ø© Ø§Ù„Ù†Ø´Ø± ÙŠÙ…ÙƒÙ† Ù…ØªØ§Ø¨Ø¹ØªÙ‡Ø§ Ù…Ù† ØµÙØ­Ø© Ø§Ù„Ù…Ø­ØªÙˆÙ‰.')}</p>
          </div>

          {/* Action buttons */}
          <div className="acp-nav-row" style={{ justifyContent: 'center' }}>
            <button className="acp-btn acp-btn--primary" onClick={() => navigate(`/audio/${publishResult.contentId}`)} type="button">
              <span className="material-symbols-outlined" aria-hidden="true">play_circle</span> {t('viewDraft', 'Ø¹Ø±Ø¶ Ø§Ù„Ù…Ø³ÙˆØ¯Ø©')}
            </button>
            <button className="acp-btn acp-btn--ghost" onClick={() => navigate(-1)} type="button">
              <span className="material-symbols-outlined" aria-hidden="true">{iconPrev}</span> {t('back', 'Ø±Ø¬ÙˆØ¹')}
            </button>
            <button className="acp-btn acp-btn--ghost" onClick={() => navigate('/create/audio')} type="button">
              <span className="material-symbols-outlined" aria-hidden="true">add</span> {t('createNewContent', 'Ø¥Ù†Ø´Ø§Ø¡ Ù…Ø­ØªÙˆÙ‰ Ø¬Ø¯ÙŠØ¯')}
            </button>
          </div>
        </section>
      )}
    </main>
  );
}
