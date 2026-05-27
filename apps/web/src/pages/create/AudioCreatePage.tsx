/**
 * Sound Platform — Audio Create Page (Canonical 12-Step Wizard)
 * ==============================================================
 * Phase:   8-C (Complete Audio Creation Flow Foundation)
 * Updated: 2026-05-27
 *
 * Canonical flow (13 states, 12 in-wizard + exit to detail player):
 *   1.  Info — title, description, world, kind
 *   2.  Publish Details — category, tags, language, country, age, audience, toggles
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
  { id: 'talk', label: 'حوار' },
  { id: 'education', label: 'تعليم' },
  { id: 'story', label: 'قصة / رواية' },
  { id: 'religion', label: 'ديني' },
  { id: 'news', label: 'أخبار' },
  { id: 'comedy', label: 'كوميديا' },
  { id: 'sports', label: 'رياضة' },
  { id: 'tech', label: 'تقنية' },
  { id: 'health', label: 'صحة' },
  { id: 'other', label: 'أخرى' },
];

const AUDIENCE_OPTIONS: { key: AudienceType; label: string }[] = [
  { key: 'public', label: 'عام — الجميع' },
  { key: 'followers', label: 'المتابعون فقط' },
  { key: 'following', label: 'من أتابعهم فقط' },
  { key: 'friends', label: 'الأصدقاء فقط' },
  { key: 'specificList', label: 'قائمة محددة' },
  { key: 'listExcept', label: 'الجميع عدا قائمة' },
  { key: 'selectedPeople', label: 'أشخاص مختارون' },
  { key: 'onlyMe', label: 'أنا فقط' },
];

const LANGUAGES = [
  { code: 'ar', label: 'العربية' },
  { code: 'en', label: 'English' },
  { code: 'fr', label: 'Français' },
  { code: 'es', label: 'Español' },
  { code: 'other', label: 'أخرى' },
];

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
  const [tags, setTags] = useState('');
  const [language, setLanguage] = useState('ar');
  const [countryMode, setCountryMode] = useState<CountryMode>('all');
  const [countryCodes, setCountryCodes] = useState('');
  const [ageSuitability, setAgeSuitability] = useState<AgeSuitability>('everyone');
  const [isExplicit, setIsExplicit] = useState(false);
  const [audience, setAudience] = useState<AudienceType>('public');
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
        language,
        tags: tags.trim() ? tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
        countryMode,
        countryCodes: countryMode !== 'all' && countryCodes.trim()
          ? countryCodes.split(',').map((c) => c.trim()).filter(Boolean)
          : [],
        ageSuitability,
        isExplicit,
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
            <span className="acp-rail__num">{step > s ? '✓' : s}</span>
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
            <label className="acp-label">
              التصنيف
              <select className="acp-select" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                <option value="">— اختر تصنيفاً —</option>
                {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </label>
            <label className="acp-label">
              الوسوم (مفصولة بفواصل)
              <input type="text" className="acp-input" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="بودكاست, تقنية, حوار..." />
            </label>
            <label className="acp-label">
              اللغة
              <select className="acp-select" value={language} onChange={(e) => setLanguage(e.target.value)}>
                {LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
              </select>
            </label>
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
            <label className="acp-label">
              الجمهور / الخصوصية
              <select className="acp-select" value={audience} onChange={(e) => setAudience(e.target.value as AudienceType)}>
                {AUDIENCE_OPTIONS.map((a) => <option key={a.key} value={a.key}>{a.label}</option>)}
              </select>
            </label>

            <div className="acp-toggles-group">
              <h3 className="acp-toggles-group__title">إعدادات النشر</h3>
              <label className="acp-label acp-label--row"><input type="checkbox" checked={commentsEnabled} onChange={(e) => setCommentsEnabled(e.target.checked)} /> السماح بالتعليقات</label>
              <label className="acp-label acp-label--row"><input type="checkbox" checked={giftsEnabled} onChange={(e) => setGiftsEnabled(e.target.checked)} /> السماح بالهدايا</label>
              <label className="acp-label acp-label--row"><input type="checkbox" checked={sharingEnabled} onChange={(e) => setSharingEnabled(e.target.checked)} /> السماح بالمشاركة</label>
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
                <label className="acp-label">
                  لغة الترجمة
                  <select className="acp-select" value={captionLang} onChange={(e) => setCaptionLang(e.target.value)}>
                    {LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
                  </select>
                </label>
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
                <span>📄 {audioAsset.originalFileName}</span>
                {audioAsset.durationMs ? <span>⏱️ {formatDuration(audioAsset.durationMs)}</span> : null}
                {audioAsset.sizeBytes ? <span>📦 {formatFileSize(audioAsset.sizeBytes)}</span> : null}
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
                <div className="acp-review__item"><span>المصدر:</span> {audioAsset.sourceType === 'recorded' ? '🎤 مسجّل' : '📁 مرفوع'}</div>
                <div className="acp-review__item"><span>الحالة:</span> ✅ مرفوع</div>
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
            <div className="acp-gate-card">
              <span className="material-symbols-outlined acp-gate-card__icon">lock</span>
              <h3>تحسين الصوت والمؤثرات</h3>
              <p>تحسين الجودة، إزالة الضوضاء، معادل الصوت (EQ)، وفلاتر متقدمة.</p>
              <p className="acp-gate-card__note">ميزة مقفلة — ستتوفر في مرحلة المعالجة. لن يتم تطبيق أي معالجة على هذا النشر.</p>
            </div>
            <div className="acp-nav-row">
              <button className="acp-btn acp-btn--ghost" onClick={() => setStep(7)} type="button">
                <span className="material-symbols-outlined" aria-hidden="true">arrow_forward</span> رجوع
              </button>
              <button className="acp-btn acp-btn--primary" onClick={() => setStep(9)} type="button">
                تخطي <span className="material-symbols-outlined" aria-hidden="true">arrow_back</span>
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
            <div className="acp-gate-card">
              <span className="material-symbols-outlined acp-gate-card__icon">lock</span>
              <h3>دمج المسارات والخلط</h3>
              <p>موسيقى خلفية، مسارات إضافية، ومستوى الصوت المستهدف.</p>
              <p className="acp-gate-card__note">ميزة مقفلة — ستتوفر في مرحلة المعالجة. لن يتم تطبيق أي خلط على هذا النشر.</p>
            </div>
            <div className="acp-nav-row">
              <button className="acp-btn acp-btn--ghost" onClick={() => setStep(8)} type="button">
                <span className="material-symbols-outlined" aria-hidden="true">arrow_forward</span> رجوع
              </button>
              <button className="acp-btn acp-btn--primary" onClick={() => setStep(10)} type="button">
                تخطي <span className="material-symbols-outlined" aria-hidden="true">arrow_back</span>
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
          <div className="acp-preview-card">
            {coverPreviewUrl ? (
              <img src={coverPreviewUrl} alt="غلاف" className="acp-preview-card__cover" />
            ) : (
              <div className="acp-preview-card__cover acp-preview-card__cover--default">
                <span className="material-symbols-outlined">music_note</span>
              </div>
            )}
            <div className="acp-preview-card__body">
              <h2 className="acp-preview-card__title">{title || 'بدون عنوان'}</h2>
              <p className="acp-preview-card__owner">{currentUser?.displayName || 'المؤلف'}</p>
              <div className="acp-preview-card__meta">
                <span className="acp-preview-card__badge">{WORLDS.find((w) => w.key === world)?.label}</span>
                <span className="acp-preview-card__badge">{(KINDS_BY_WORLD[world] ?? []).find((k) => k.key === kind)?.label}</span>
                {categoryId && <span className="acp-preview-card__badge">{CATEGORIES.find((c) => c.id === categoryId)?.label}</span>}
              </div>
              {audioAsset?.durationMs ? <p className="acp-preview-card__duration">⏱️ {formatDuration(audioAsset.durationMs)}</p> : null}
              <div className="acp-preview-card__details">
                <div className="acp-preview-card__detail"><span>الجمهور:</span> {AUDIENCE_OPTIONS.find((a) => a.key === audience)?.label}</div>
                <div className="acp-preview-card__detail"><span>الدول:</span> {countryMode === 'all' ? 'جميع الدول' : countryCodes || '—'}</div>
                <div className="acp-preview-card__detail"><span>الفئة العمرية:</span> {ageSuitability === 'everyone' ? 'الجميع' : ageSuitability === 'teen' ? '+13' : '+18'}</div>
                <div className="acp-preview-card__detail"><span>الترجمة:</span> {captionsEnabled ? 'مفعّلة' : 'معطّلة'}</div>
                <div className="acp-preview-card__detail"><span>الملقن:</span> {autoCueEnabled ? 'مفعّل' : 'معطّل'}</div>
                <div className="acp-preview-card__detail"><span>الصوت:</span> {audioAsset ? '✅ مرفق' : '❌ غير مرفق'}</div>
              </div>
            </div>
          </div>
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
          <div className="acp-nav-row">
            <button className="acp-btn acp-btn--ghost" onClick={() => setStep(9)} type="button">
              <span className="material-symbols-outlined" aria-hidden="true">arrow_forward</span> رجوع
            </button>
            <button className="acp-btn acp-btn--primary" onClick={() => setStep(11)} type="button">
              <span className="material-symbols-outlined" aria-hidden="true">arrow_back</span> متابعة للتأكيد
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
              <div className="acp-rd-card__row"><span>الوسوم:</span> {tags || '— بدون وسوم —'}</div>
              <div className="acp-rd-card__row"><span>اللغة:</span> {LANGUAGES.find((l) => l.code === language)?.label}</div>
              <div className="acp-rd-card__row"><span>الدول:</span> {countryMode === 'all' ? 'جميع الدول' : countryCodes || '—'}</div>
              <div className="acp-rd-card__row"><span>الفئة العمرية:</span> {ageSuitability === 'everyone' ? 'الجميع' : ageSuitability === 'teen' ? '+13 مراهقين' : '+18 بالغين'}</div>
              <div className="acp-rd-card__row"><span>محتوى صريح:</span> {isExplicit ? 'نعم' : 'لا'}</div>
            </div>

            {/* ── Audience card ────────────────────────────────────── */}
            <div className="acp-rd-card">
              <h3 className="acp-rd-card__title"><span className="material-symbols-outlined">group</span> الجمهور والإعدادات</h3>
              <div className="acp-rd-card__row"><span>الجمهور:</span> {AUDIENCE_OPTIONS.find((a) => a.key === audience)?.label}</div>
              <div className="acp-rd-card__row"><span>التعليقات:</span> {commentsEnabled ? '✅ مسموحة' : '❌ مغلقة'}</div>
              <div className="acp-rd-card__row"><span>الهدايا:</span> {giftsEnabled ? '✅ مسموحة' : '❌ مغلقة'}</div>
              <div className="acp-rd-card__row"><span>المشاركة:</span> {sharingEnabled ? '✅ مسموحة' : '❌ مغلقة'}</div>
            </div>

            {/* ── Cover card ───────────────────────────────────────── */}
            <div className="acp-rd-card">
              <h3 className="acp-rd-card__title"><span className="material-symbols-outlined">image</span> الغلاف</h3>
              <div className="acp-rd-card__row">
                <span>الحالة:</span> {coverAsset ? (coverAsset.sourceType === 'uploaded' ? '📷 صورة مرفوعة' : coverAsset.sourceType === 'ai' ? '🤖 غلاف ذكي (مقفل)' : '📷 مرفوع') : '🖼️ افتراضي — لم يُرفق غلاف'}
              </div>
            </div>

            {/* ── Captions card ────────────────────────────────────── */}
            <div className="acp-rd-card">
              <h3 className="acp-rd-card__title"><span className="material-symbols-outlined">subtitles</span> الترجمة</h3>
              <div className="acp-rd-card__row"><span>الحالة:</span> {captionsEnabled ? '✅ مفعّلة' : '⏭️ تم التخطي'}</div>
              {captionsEnabled && <div className="acp-rd-card__row"><span>اللغة:</span> {LANGUAGES.find((l) => l.code === captionLang)?.label}</div>}
              {captionsEnabled && <div className="acp-rd-card__row"><span>النمط:</span> {captionStyle === 'standard' ? 'عادي' : captionStyle === 'karaoke' ? 'كاريوكي' : 'ترجمة سفلية'}</div>}
            </div>

            {/* ── AutoCue card ─────────────────────────────────────── */}
            <div className="acp-rd-card">
              <h3 className="acp-rd-card__title"><span className="material-symbols-outlined">teleprompter</span> الملقن</h3>
              <div className="acp-rd-card__row"><span>الحالة:</span> {autoCueEnabled ? '✅ مفعّل' : '⏭️ تم التخطي'}</div>
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
                  <div className="acp-rd-card__row"><span>المصدر:</span> {audioAsset.sourceType === 'recorded' ? '🎤 مسجّل' : '📁 مرفوع'}</div>
                  {audioAsset.durationMs ? <div className="acp-rd-card__row"><span>المدة:</span> {formatDuration(audioAsset.durationMs)}</div> : null}
                  {audioAsset.sizeBytes ? <div className="acp-rd-card__row"><span>الحجم:</span> {formatFileSize(audioAsset.sizeBytes)}</div> : null}
                  <div className="acp-rd-card__row"><span>النوع:</span> {audioAsset.mimeType}</div>
                </>
              ) : (
                <div className="acp-rd-card__row acp-rd-card__row--warn"><span>❌</span> لا يوجد ملف صوتي — لا يمكن النشر.</div>
              )}
            </div>

            {/* ── Effects & Mixing card ────────────────────────────── */}
            <div className="acp-rd-card">
              <h3 className="acp-rd-card__title"><span className="material-symbols-outlined">tune</span> المؤثرات والمكساج</h3>
              <div className="acp-rd-card__row"><span>المؤثرات:</span> ⏭️ تم التخطي — لم يتم تطبيق أي معالجة</div>
              <div className="acp-rd-card__row"><span>المكساج:</span> ⏭️ تم التخطي — لم يتم تطبيق أي خلط</div>
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
          <div className="acp-publish-success">
            <span className="material-symbols-outlined acp-publish-success__icon">celebration</span>
            <h2>تم النشر بنجاح! 🎉</h2>
            <div className="acp-publish-success__details">
              <div className="acp-review__item"><span>معرّف المحتوى:</span> <code>{publishResult.contentId}</code></div>
              <div className="acp-review__item"><span>الحالة:</span> {publishResult.status}</div>
            </div>
            <div className="acp-publish-notice acp-publish-notice--info">
              <span className="material-symbols-outlined" aria-hidden="true">hourglass_top</span>
              <p>التشغيل المباشر غير متوفر حالياً — خط المعالجة (الترميز، الموجة الصوتية) لم يكتمل بعد. صفحة المحتوى ستظهر حالة "جاري المعالجة".</p>
            </div>
            <div className="acp-publish-success__actions">
              <button className="acp-btn acp-btn--primary" onClick={() => navigate(`/audio/${publishResult.contentId}`)} type="button">
                <span className="material-symbols-outlined" aria-hidden="true">play_circle</span> فتح صفحة المحتوى
              </button>
              <button className="acp-btn acp-btn--ghost" onClick={() => navigate('/create/audio')} type="button">
                <span className="material-symbols-outlined" aria-hidden="true">add</span> إنشاء محتوى جديد
              </button>
              <button className="acp-btn acp-btn--ghost" onClick={() => navigate(-1)} type="button">
                <span className="material-symbols-outlined" aria-hidden="true">arrow_forward</span> رجوع
              </button>
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
