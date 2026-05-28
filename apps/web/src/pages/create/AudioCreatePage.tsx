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

import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { ref as storageRef, uploadBytesResumable } from 'firebase/storage';
import { storage } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useAudioRecorder } from '../../hooks/useAudioRecorder';
import { useAudioUpload } from '../../hooks/useAudioUpload';
import {
  callCreateAudioDraft,
  callUpdateAudioDraft,
  callPublishAudioContent,
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
  AutoCueConfig,
  PublishToggles,
  PlacementFeed,
  PlaylistIntent,
} from '@sound/shared';
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

// ── Effects & mixing data ─────────────────────────────────────────────────────

const EFFECT_CATEGORIES = ['الكل', 'تحسين', 'بيئة', 'صوتيات', 'ديناميك', 'إبداعي'];

const EFFECT_LIBRARY = [
  { id: 'noise_reduction', name: 'إزالة الضوضاء', desc: 'تنقية الصوت من التشويش', icon: 'noise_aware', gate: 'حسب الباقة' },
  { id: 'eq', name: 'معادل الصوت', desc: 'تعديل الترددات المنخفضة والعالية', icon: 'equalizer', gate: 'حسب الباقة' },
  { id: 'reverb', name: 'صدى', desc: 'إضافة عمق وبُعد مكاني', icon: 'surround_sound', gate: 'مرحلة لاحقة' },
  { id: 'compressor', name: 'ضاغط ديناميك', desc: 'توحيد مستوى الصوت', icon: 'compress', gate: 'حسب الباقة' },
  { id: 'pitch', name: 'تعديل النبرة', desc: 'رفع أو خفض حدة الصوت', icon: 'music_note', gate: 'مرحلة لاحقة' },
  { id: 'normalize', name: 'تطبيع', desc: 'ضبط مستوى الصوت العام', icon: 'tune', gate: 'حسب الباقة' },
];

const MIXING_TOOLS = [
  { id: 'crossfade', name: 'مزج تدريجي', icon: 'transition_fade' },
  { id: 'trim', name: 'قص وتقليم', icon: 'content_cut' },
  { id: 'fade_in', name: 'تلاشي دخول', icon: 'signal_cellular_alt' },
  { id: 'loudness', name: 'معايرة الصوت', icon: 'volume_up' },
];

const MIXING_PRESETS = ['بودكاست', 'راديو', 'قصة', 'تأمل'];

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
      audio.play();
      setPreviewPlaying(true);
    } else {
      audio.pause();
      setPreviewPlaying(false);
    }
  };

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
        newPlaylistName: newPlaylistName || undefined,
        audience,
        publishToggles,
        coverAsset: coverAsset ?? undefined,
        captionsSetup,
        autoCue: autoCueConfig,
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

            {/* Playlist intent */}
            <div className="acp-label">
              قائمة التشغيل
              <div className="acp-playlist-cards">
                <button className={`acp-playlist-card ${playlistIntent === 'none' ? 'acp-playlist-card--selected' : ''}`} onClick={() => setPlaylistIntent('none')} type="button">
                  <span className="material-symbols-outlined">playlist_remove</span>
                  بدون قائمة
                </button>
                <button className="acp-playlist-card acp-playlist-card--gated" disabled type="button">
                  <span className="material-symbols-outlined">playlist_add</span>
                  إضافة لقائمة موجودة
                  <span className="acp-gate-badge">مرحلة لاحقة</span>
                </button>
                <button className="acp-playlist-card acp-playlist-card--gated" disabled type="button">
                  <span className="material-symbols-outlined">queue_music</span>
                  إنشاء قائمة جديدة
                  <span className="acp-gate-badge">مرحلة لاحقة</span>
                </button>
              </div>
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
              <span>تفعيل الترجمة التلقائية</span>
            </label>
            {captionsEnabled && (
              <>
                {/* Caption language — glass dropdown */}
                <div className="acp-label">
                  لغة الترجمة
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
            <p className="acp-hint">
              <span className="material-symbols-outlined acp-hint__icon" aria-hidden="true">info</span>
              مراجعة النص الفعلي ستتم بعد تسجيل/رفع الصوت.
            </p>
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
            مراجعة الصوت
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
            <div className="acp-nav-row">
              <button className="acp-btn acp-btn--ghost" onClick={() => { setAudioAsset(null); uploader.reset(); recorder.reset(); setStep(6); }} type="button">
                <span className="material-symbols-outlined" aria-hidden="true">refresh</span> إعادة التسجيل / الرفع
              </button>
              <button className="acp-btn acp-btn--primary" onClick={() => setStep(8)} disabled={!audioAsset} type="button">
                <span className="material-symbols-outlined" aria-hidden="true">arrow_back</span> تأكيد ومتابعة
              </button>
            </div>
          </div>
        </section>
      )}

      {/* ═══════════════ STEP 8: EFFECTS (GATED) ═════════════════ */}
      {step === 8 && (
        <section className="acp-section">
          <h1 className="acp-section__title">
            <span className="material-symbols-outlined" aria-hidden="true">tune</span>
            المؤثرات الصوتية
            <span className="acp-badge acp-badge--optional">اختياري</span>
          </h1>
          <div className="acp-form">
            {/* Audio preview with waveform */}
            <div className="acp-effects-preview">
              <div className="acp-waveform-bars">
                {waveformBars.map((h, i) => (
                  <div key={i} className="acp-waveform-bars__bar" style={{ height: `${h}%` }} />
                ))}
              </div>
              <div className="acp-ab-toggle">
                <button className="acp-ab-toggle__btn acp-ab-toggle__btn--active" type="button">A أصلي</button>
                <button className="acp-ab-toggle__btn" type="button">B معالج</button>
              </div>
            </div>

            {/* Effect category chips */}
            <div className="acp-chips">
              {EFFECT_CATEGORIES.map((cat, i) => (
                <button key={cat} className={`acp-chip ${i === 0 ? 'acp-chip--selected' : ''}`} type="button" disabled={i > 0} style={i > 0 ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}>{cat}</button>
              ))}
            </div>

            {/* Empty effects stack */}
            <div className="acp-effects-empty">
              <span className="material-symbols-outlined">layers_clear</span>
              <p>لا توجد مؤثرات مطبقة</p>
            </div>

            {/* Effect library grid */}
            <div className="acp-label" style={{ gap: '0.4rem' }}>
              مكتبة المؤثرات
              <div className="acp-effects-grid">
                {EFFECT_LIBRARY.map((fx) => (
                  <div key={fx.id} className="acp-effect-card acp-effect-card--gated">
                    <div className="acp-effect-card__header">
                      <span className="material-symbols-outlined">lock</span>
                      <span className="material-symbols-outlined">{fx.icon}</span>
                      <span className="acp-effect-card__name">{fx.name}</span>
                    </div>
                    <p className="acp-effect-card__desc">{fx.desc}</p>
                    <span className="acp-gate-badge acp-effect-card__badge">{fx.gate}</span>
                  </div>
                ))}
              </div>
            </div>

            <p className="acp-hint">
              <span className="material-symbols-outlined acp-hint__icon" aria-hidden="true">info</span>
              توفر المؤثرات يعتمد على باقتك الحالية. بعض المؤثرات ستتوفر في مراحل لاحقة.
            </p>

            <div className="acp-nav-row">
              <button className="acp-btn acp-btn--ghost" onClick={() => setStep(7)} type="button">
                <span className="material-symbols-outlined" aria-hidden="true">arrow_forward</span> رجوع
              </button>
              <button className="acp-btn acp-btn--primary" onClick={() => setStep(9)} type="button">
                <span className="material-symbols-outlined" aria-hidden="true">skip_previous</span> تخطي
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
            المكساج والدمج
            <span className="acp-badge acp-badge--optional">اختياري</span>
          </h1>
          <div className="acp-form">
            {/* Multi-track visual */}
            <div className="acp-tracks">
              <div className="acp-track-row">
                <span className="acp-track-row__label">الصوت</span>
                <div className="acp-track-row__bar acp-track-row__bar--voice" style={{ width: '80%' }} />
              </div>
              <div className="acp-track-row">
                <span className="acp-track-row__label">الموسيقى</span>
                <div className="acp-track-row__bar acp-track-row__bar--music" style={{ width: '0%' }} />
              </div>
              <div className="acp-track-row">
                <span className="acp-track-row__label">المؤثرات</span>
                <div className="acp-track-row__bar acp-track-row__bar--effects" style={{ width: '0%' }} />
              </div>
            </div>

            {/* Track mixer */}
            <div className="acp-track-mixer">
              <h3 className="acp-track-mixer__title">مستوى الصوت</h3>
              <div className="acp-slider-row">
                <span className="acp-slider-row__label">الصوت</span>
                <input type="range" className="acp-slider-row__slider" min={0} max={100} value={80} disabled />
                <span className="acp-slider-row__value">80%</span>
              </div>
              <div className="acp-slider-row">
                <span className="acp-slider-row__label">الموسيقى</span>
                <input type="range" className="acp-slider-row__slider" min={0} max={100} value={0} disabled />
                <span className="acp-slider-row__value">0%</span>
              </div>
              <div className="acp-slider-row">
                <span className="acp-slider-row__label">المؤثرات</span>
                <input type="range" className="acp-slider-row__slider" min={0} max={100} value={0} disabled />
                <span className="acp-slider-row__value">0%</span>
              </div>
            </div>

            {/* Background music — gated options */}
            <div className="acp-label" style={{ gap: '0.4rem' }}>
              الموسيقى الخلفية
              <div className="acp-playlist-cards">
                <button className="acp-playlist-card acp-playlist-card--gated" disabled type="button">
                  <span className="material-symbols-outlined">library_music</span>
                  مكتبة Sound
                  <span className="acp-gate-badge">حسب الباقة</span>
                </button>
                <button className="acp-playlist-card acp-playlist-card--gated" disabled type="button">
                  <span className="material-symbols-outlined">upload_file</span>
                  رفع ملف موسيقى
                  <span className="acp-gate-badge">حسب الباقة</span>
                </button>
                <button className="acp-playlist-card acp-playlist-card--selected" type="button">
                  <span className="material-symbols-outlined">music_off</span>
                  بدون موسيقى
                </button>
              </div>
            </div>

            {/* Advanced tools — all disabled */}
            <div className="acp-label" style={{ gap: '0.4rem' }}>
              أدوات متقدمة
              <div className="acp-effects-grid">
                {MIXING_TOOLS.map((tool) => (
                  <div key={tool.id} className="acp-effect-card acp-effect-card--gated">
                    <div className="acp-effect-card__header">
                      <span className="material-symbols-outlined">lock</span>
                      <span className="material-symbols-outlined">{tool.icon}</span>
                      <span className="acp-effect-card__name">{tool.name}</span>
                    </div>
                    <span className="acp-gate-badge acp-effect-card__badge">حسب الباقة</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Presets — all disabled */}
            <div className="acp-label" style={{ gap: '0.4rem' }}>
              إعدادات مسبقة
              <div className="acp-chips">
                {MIXING_PRESETS.map((preset) => (
                  <button key={preset} className="acp-chip" type="button" disabled style={{ opacity: 0.4, cursor: 'not-allowed' }}>{preset}</button>
                ))}
              </div>
            </div>

            <p className="acp-hint">
              <span className="material-symbols-outlined acp-hint__icon" aria-hidden="true">info</span>
              أدوات المكساج والدمج متاحة حسب باقتك. لن يتم تطبيق أي خلط على هذا النشر.
            </p>

            <div className="acp-nav-row">
              <button className="acp-btn acp-btn--ghost" onClick={() => setStep(8)} type="button">
                <span className="material-symbols-outlined" aria-hidden="true">arrow_forward</span> رجوع
              </button>
              <button className="acp-btn acp-btn--primary" onClick={() => setStep(10)} type="button">
                <span className="material-symbols-outlined" aria-hidden="true">skip_previous</span> تخطي
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
                <span className="acp-preview-card__timer-badge">{formatDuration(audioAsset.durationMs)}</span>
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
            <span className="acp-status-chip acp-status-chip--skip">
              <span className="material-symbols-outlined">skip_next</span>
              المؤثرات: تم التخطي
            </span>
            <span className="acp-status-chip acp-status-chip--skip">
              <span className="material-symbols-outlined">skip_next</span>
              المكساج: تم التخطي
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
                <span className="material-symbols-outlined" style={{ color: '#94a3b8' }}>skip_next</span>
                تم التخطي — لم يتم تطبيق أي معالجة
              </div>
              <div className="acp-rd-card__row">
                <span>المكساج:</span>
                <span className="material-symbols-outlined" style={{ color: '#94a3b8' }}>skip_next</span>
                تم التخطي — لم يتم تطبيق أي خلط
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
