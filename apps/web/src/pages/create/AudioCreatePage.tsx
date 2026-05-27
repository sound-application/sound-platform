/**
 * Sound Platform — Audio Create Page (3-Step Wizard)
 * ====================================================
 * Phase:   8-B (Audio Recording + Upload + Storage Attachment)
 * Updated: 2026-05-27
 *
 * 3-step creation wizard:
 *   Step 1: Audio Info — title, world, kind, audience → save draft
 *   Step 2: Record / Upload — mic recording OR file upload → attach to draft
 *   Step 3: Review / Publish — summary + publish button
 *
 * Route: /create/audio
 * Query params:
 *   ?source=record → auto-select Record tab in step 2
 *   ?source=upload → auto-select Upload tab in step 2
 */

import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
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
} from '@sound/shared';
import type { WorldId } from '@sound/shared';
import '../Page.css';
import './AudioCreatePage.css';

// ── Constants ─────────────────────────────────────────────────────────────────

const WORLDS: { key: WorldId; label: string; note: string }[] = [
  { key: 'general', label: 'عام',     note: 'محتوى صوتي مفتوح للجميع' },
  { key: 'plus',    label: 'بلس',     note: 'محتوى حصري للمشتركين' },
];

const KINDS_BY_WORLD: Record<string, { key: AudioContentKind; label: string }[]> = {
  general: [
    { key: 'longAudio',  label: 'صوت طويل' },
    { key: 'podcast',    label: 'بودكاست' },
    { key: 'shortAudio', label: 'مقطع قصير' },
  ],
  plus: [
    { key: 'longAudio',  label: 'صوت طويل' },
    { key: 'podcast',    label: 'بودكاست' },
    { key: 'shortAudio', label: 'مقطع قصير' },
  ],
};

type WizardStep = 1 | 2 | 3;
type Step2Tab = 'record' | 'upload';

// ── Page Component ───────────────────────────────────────────────────────────

export function AudioCreatePage() {
  const { currentUser } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const uid = currentUser?.uid ?? '';

  // ── Wizard state ─────────────────────────────────────────────────────────
  const [step, setStep] = useState<WizardStep>(1);

  // ── Step 1: Info ─────────────────────────────────────────────────────────
  const [title, setTitle] = useState('');
  const [caption, setCaption] = useState('');
  const [world, setWorld] = useState<WorldId>('general');
  const [kind, setKind] = useState<AudioContentKind>('longAudio');
  const [audience, setAudience] = useState('public');
  const [draftId, setDraftId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // ── Step 2: Record / Upload ──────────────────────────────────────────────
  const sourceParam = searchParams.get('source');
  const [tab, setTab] = useState<Step2Tab>(sourceParam === 'upload' ? 'upload' : 'record');
  const recorder = useAudioRecorder();
  const uploader = useAudioUpload();
  const [audioAsset, setAudioAsset] = useState<AudioAssetMeta | null>(null);
  const [attaching, setAttaching] = useState(false);
  const [attachError, setAttachError] = useState<string | null>(null);

  // ── Step 2: File upload tab ──────────────────────────────────────────────
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileDurationMs, setFileDurationMs] = useState<number | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Step 3: Publish ──────────────────────────────────────────────────────
  const [publishing, setPublishing] = useState(false);
  const [publishResult, setPublishResult] = useState<{ contentId: string; status: string } | null>(null);
  const [publishError, setPublishError] = useState<string | null>(null);

  // ── Update kind when world changes ───────────────────────────────────────
  useEffect(() => {
    const kinds = KINDS_BY_WORLD[world];
    if (kinds && kinds.length > 0 && !kinds.some((k) => k.key === kind)) {
      setKind(kinds[0]!.key);
    }
  }, [world, kind]);

  // ── Step 1: Save Draft ──────────────────────────────────────────────────
  const handleSaveDraft = async () => {
    if (!title.trim()) {
      setSaveError('العنوان مطلوب.');
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      if (draftId) {
        // Update existing draft
        await callUpdateAudioDraft({
          draftId,
          title: title.trim(),
          caption: caption.trim() || undefined,
          world,
          kind,
          audience,
          currentStep: 'record',
        });
      } else {
        // Create new draft
        const result = await callCreateAudioDraft({
          title: title.trim(),
          caption: caption.trim() || undefined,
          world,
          kind,
          audience,
        });
        setDraftId(result.data.draftId);
      }
      setStep(2);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'فشل حفظ المسودة.';
      setSaveError(msg);
    } finally {
      setSaving(false);
    }
  };

  // ── Step 2: Handle recording upload ─────────────────────────────────────
  const handleUploadRecording = async () => {
    if (!recorder.audioBlob || !draftId || !uid) return;

    const ext = recorder.mimeType?.includes('webm') ? 'webm'
      : recorder.mimeType?.includes('mp4') ? 'mp4'
      : recorder.mimeType?.includes('ogg') ? 'ogg' : 'webm';
    const fileName = `recording_${Date.now()}.${ext}`;
    const mime = recorder.mimeType ?? 'audio/webm';

    uploader.uploadAudio(recorder.audioBlob, uid, draftId, fileName, mime);
  };

  // ── Step 2: Handle file selection ───────────────────────────────────────
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

    // Extract duration
    try {
      const dur = await extractAudioDuration(file);
      setFileDurationMs(dur);
    } catch {
      // Duration extraction failed — non-critical
      setFileDurationMs(null);
    }
  };

  // ── Step 2: Upload selected file ────────────────────────────────────────
  const handleUploadFile = () => {
    if (!selectedFile || !draftId || !uid) return;
    uploader.uploadAudio(
      selectedFile,
      uid,
      draftId,
      selectedFile.name,
      selectedFile.type,
    );
  };

  // ── Step 2: Attach uploaded asset to draft ──────────────────────────────
  useEffect(() => {
    if (uploader.state !== 'done' || !uploader.storagePath || !draftId || audioAsset) return;

    const attach = async () => {
      setAttaching(true);
      setAttachError(null);

      try {
        const blob = tab === 'record' ? recorder.audioBlob : selectedFile;
        const mime = tab === 'record'
          ? (recorder.mimeType ?? 'audio/webm')
          : (selectedFile?.type ?? 'audio/unknown');
        const fileName = tab === 'record'
          ? `recording_${Date.now()}`
          : (selectedFile?.name ?? 'unknown');

        let durationMs = 0;
        if (tab === 'record' && recorder.elapsedMs > 0) {
          durationMs = recorder.elapsedMs;
        } else if (tab === 'upload' && fileDurationMs) {
          durationMs = fileDurationMs;
        } else if (blob) {
          try {
            durationMs = await extractAudioDuration(blob);
          } catch {
            durationMs = 0;
          }
        }

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

        await callUpdateAudioDraft({
          draftId,
          audioAsset: asset,
          currentStep: 'publish',
        });

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

  // ── Step 3: Publish ─────────────────────────────────────────────────────
  const handlePublish = async () => {
    if (!draftId || !audioAsset) return;
    setPublishing(true);
    setPublishError(null);
    try {
      const result = await callPublishAudioContent({
        draftId,
        deleteDraftAfterPublish: false,
      });
      setPublishResult({
        contentId: result.data.contentId,
        status: result.data.status,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'فشل النشر.';
      setPublishError(msg);
    } finally {
      setPublishing(false);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <main className="page acp-page" dir="rtl">
      {/* ── Step indicator ────────────────────────────────────────────── */}
      <div className="acp-steps">
        {([1, 2, 3] as WizardStep[]).map((s) => (
          <div
            key={s}
            className={`acp-step-dot ${step === s ? 'acp-step-dot--active' : ''} ${step > s ? 'acp-step-dot--done' : ''}`}
          >
            <span className="acp-step-dot__num">
              {step > s ? '✓' : s}
            </span>
            <span className="acp-step-dot__label">
              {s === 1 ? 'المعلومات' : s === 2 ? 'التسجيل / الرفع' : 'المراجعة'}
            </span>
          </div>
        ))}
      </div>

      {/* ── Step 1: Audio Info ────────────────────────────────────────── */}
      {step === 1 && (
        <section className="acp-section">
          <h1 className="acp-section__title">
            <span className="material-symbols-outlined" aria-hidden="true">edit_note</span>
            معلومات المحتوى الصوتي
          </h1>

          <div className="acp-form">
            <label className="acp-label">
              العنوان <span className="acp-required">*</span>
              <input
                type="text"
                className="acp-input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="عنوان التسجيل أو الحلقة..."
                maxLength={200}
                autoFocus
              />
            </label>

            <label className="acp-label">
              الوصف / التوضيح
              <textarea
                className="acp-textarea"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="وصف مختصر للمحتوى..."
                maxLength={1000}
                rows={3}
              />
            </label>

            <label className="acp-label">
              العالم
              <div className="acp-chips">
                {WORLDS.map((w) => (
                  <button
                    key={w.key}
                    className={`acp-chip ${world === w.key ? 'acp-chip--selected' : ''}`}
                    onClick={() => setWorld(w.key)}
                    type="button"
                    title={w.note}
                  >
                    {w.label}
                  </button>
                ))}
              </div>
            </label>

            <label className="acp-label">
              نوع المحتوى
              <div className="acp-chips">
                {(KINDS_BY_WORLD[world] ?? []).map((k) => (
                  <button
                    key={k.key}
                    className={`acp-chip ${kind === k.key ? 'acp-chip--selected' : ''}`}
                    onClick={() => setKind(k.key)}
                    type="button"
                  >
                    {k.label}
                  </button>
                ))}
              </div>
            </label>

            <label className="acp-label">
              الجمهور
              <select
                className="acp-select"
                value={audience}
                onChange={(e) => setAudience(e.target.value)}
              >
                <option value="public">عام — الجميع</option>
                <option value="followers">المتابعون فقط</option>
                <option value="friends">الأصدقاء فقط</option>
                <option value="onlyMe">أنا فقط</option>
              </select>
            </label>

            {saveError && <p className="acp-error">{saveError}</p>}

            <button
              className="acp-btn acp-btn--primary"
              onClick={handleSaveDraft}
              disabled={saving || !title.trim()}
            >
              {saving ? (
                <><span className="acp-spinner" aria-hidden="true" /> جاري الحفظ...</>
              ) : draftId ? (
                <><span className="material-symbols-outlined" aria-hidden="true">save</span> تحديث وتابع</>
              ) : (
                <><span className="material-symbols-outlined" aria-hidden="true">add_circle</span> حفظ المسودة وتابع</>
              )}
            </button>
          </div>
        </section>
      )}

      {/* ── Step 2: Record / Upload ──────────────────────────────────── */}
      {step === 2 && (
        <section className="acp-section">
          <h1 className="acp-section__title">
            <span className="material-symbols-outlined" aria-hidden="true">mic</span>
            التسجيل أو الرفع
          </h1>

          {/* Tab switcher */}
          <div className="acp-tabs">
            <button
              className={`acp-tab ${tab === 'record' ? 'acp-tab--active' : ''}`}
              onClick={() => setTab('record')}
              type="button"
            >
              <span className="material-symbols-outlined" aria-hidden="true">mic</span>
              تسجيل
            </button>
            <button
              className={`acp-tab ${tab === 'upload' ? 'acp-tab--active' : ''}`}
              onClick={() => setTab('upload')}
              type="button"
            >
              <span className="material-symbols-outlined" aria-hidden="true">upload_file</span>
              رفع ملف
            </button>
          </div>

          {/* ── Record tab ─────────────────────────────────────────── */}
          {tab === 'record' && (
            <div className="acp-record-panel">
              {recorder.state === 'idle' && (
                <button
                  className="acp-record-btn"
                  onClick={recorder.startRecording}
                  type="button"
                >
                  <span className="material-symbols-outlined acp-record-btn__icon">mic</span>
                  <span>ابدأ التسجيل</span>
                </button>
              )}

              {recorder.state === 'requesting' && (
                <div className="acp-record-status">
                  <span className="acp-spinner" />
                  <p>جاري طلب إذن الميكروفون...</p>
                </div>
              )}

              {recorder.state === 'recording' && (
                <div className="acp-record-live">
                  <div className="acp-record-pulse" />
                  <p className="acp-record-time">{formatDuration(recorder.elapsedMs)}</p>
                  <p className="acp-record-label">جاري التسجيل...</p>
                  <button
                    className="acp-btn acp-btn--danger"
                    onClick={recorder.stopRecording}
                    type="button"
                  >
                    <span className="material-symbols-outlined" aria-hidden="true">stop_circle</span>
                    إيقاف التسجيل
                  </button>
                </div>
              )}

              {recorder.state === 'stopped' && recorder.audioUrl && (
                <div className="acp-record-preview">
                  <p className="acp-record-preview__label">معاينة التسجيل</p>
                  <audio controls src={recorder.audioUrl} className="acp-audio-player" />
                  <div className="acp-record-preview__info">
                    <span>المدة: {formatDuration(recorder.elapsedMs)}</span>
                    <span>النوع: {recorder.mimeType}</span>
                    {recorder.audioBlob && <span>الحجم: {formatFileSize(recorder.audioBlob.size)}</span>}
                  </div>
                  <div className="acp-record-preview__actions">
                    <button
                      className="acp-btn acp-btn--primary"
                      onClick={handleUploadRecording}
                      disabled={uploader.state === 'uploading' || uploader.state === 'done'}
                      type="button"
                    >
                      <span className="material-symbols-outlined" aria-hidden="true">cloud_upload</span>
                      رفع التسجيل
                    </button>
                    <button
                      className="acp-btn acp-btn--ghost"
                      onClick={recorder.reset}
                      disabled={uploader.state === 'uploading'}
                      type="button"
                    >
                      إعادة التسجيل
                    </button>
                  </div>
                </div>
              )}

              {recorder.state === 'error' && (
                <div className="acp-error-box">
                  <span className="material-symbols-outlined">error</span>
                  <p>{recorder.errorMessage}</p>
                  <button className="acp-btn acp-btn--ghost" onClick={recorder.reset} type="button">
                    حاول مجدداً
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ── Upload tab ─────────────────────────────────────────── */}
          {tab === 'upload' && (
            <div className="acp-upload-panel">
              {!selectedFile && (
                <div
                  className="acp-drop-zone"
                  onClick={() => fileInputRef.current?.click()}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
                >
                  <span className="material-symbols-outlined acp-drop-zone__icon">audio_file</span>
                  <p>اختر ملفاً صوتياً</p>
                  <p className="acp-drop-zone__hint">MP3, WAV, AAC, OGG, WebM — حتى 100MB</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="audio/*"
                    onChange={handleFileSelect}
                    className="acp-file-input"
                    tabIndex={-1}
                  />
                </div>
              )}

              {fileError && (
                <div className="acp-error-box">
                  <span className="material-symbols-outlined">error</span>
                  <p>{fileError}</p>
                </div>
              )}

              {selectedFile && (
                <div className="acp-file-info">
                  <span className="material-symbols-outlined acp-file-info__icon">audio_file</span>
                  <div className="acp-file-info__details">
                    <p className="acp-file-info__name">{selectedFile.name}</p>
                    <div className="acp-file-info__meta">
                      <span>{selectedFile.type || 'audio/*'}</span>
                      <span>{formatFileSize(selectedFile.size)}</span>
                      {fileDurationMs && <span>{formatDuration(fileDurationMs)}</span>}
                    </div>
                  </div>
                  <div className="acp-file-info__actions">
                    <button
                      className="acp-btn acp-btn--primary"
                      onClick={handleUploadFile}
                      disabled={uploader.state === 'uploading' || uploader.state === 'done'}
                      type="button"
                    >
                      <span className="material-symbols-outlined" aria-hidden="true">cloud_upload</span>
                      رفع الملف
                    </button>
                    <button
                      className="acp-btn acp-btn--ghost"
                      onClick={() => {
                        setSelectedFile(null);
                        setFileDurationMs(null);
                        uploader.reset();
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                      disabled={uploader.state === 'uploading'}
                      type="button"
                    >
                      تغيير الملف
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Upload progress (shared between tabs) ──────────────── */}
          {uploader.state === 'uploading' && (
            <div className="acp-progress">
              <div className="acp-progress__bar">
                <div
                  className="acp-progress__fill"
                  style={{ width: `${uploader.progress}%` }}
                />
              </div>
              <p className="acp-progress__text">جاري الرفع... {uploader.progress}%</p>
              <button className="acp-btn acp-btn--ghost acp-btn--sm" onClick={uploader.cancel} type="button">
                إلغاء
              </button>
            </div>
          )}

          {attaching && (
            <div className="acp-progress">
              <span className="acp-spinner" />
              <p className="acp-progress__text">جاري ربط الملف بالمسودة...</p>
            </div>
          )}

          {uploader.state === 'error' && (
            <div className="acp-error-box">
              <span className="material-symbols-outlined">error</span>
              <p>{uploader.errorMessage}</p>
            </div>
          )}

          {attachError && (
            <div className="acp-error-box">
              <span className="material-symbols-outlined">error</span>
              <p>{attachError}</p>
            </div>
          )}

          {/* ── Asset attached success ─────────────────────────────── */}
          {audioAsset && (
            <div className="acp-success-box">
              <span className="material-symbols-outlined">check_circle</span>
              <p>تم ربط الملف الصوتي بالمسودة بنجاح!</p>
              <div className="acp-asset-summary">
                <span>📄 {audioAsset.originalFileName}</span>
                {audioAsset.durationMs ? <span>⏱️ {formatDuration(audioAsset.durationMs)}</span> : null}
                {audioAsset.sizeBytes ? <span>📦 {formatFileSize(audioAsset.sizeBytes)}</span> : null}
                <span>🎤 {audioAsset.sourceType === 'recorded' ? 'مسجّل' : 'ملف مرفوع'}</span>
              </div>
              <button
                className="acp-btn acp-btn--primary"
                onClick={() => setStep(3)}
                type="button"
              >
                <span className="material-symbols-outlined" aria-hidden="true">arrow_back</span>
                متابعة إلى المراجعة
              </button>
            </div>
          )}

          {/* Back button */}
          {!audioAsset && (
            <button
              className="acp-btn acp-btn--ghost acp-back"
              onClick={() => setStep(1)}
              type="button"
            >
              <span className="material-symbols-outlined" aria-hidden="true">arrow_forward</span>
              رجوع إلى المعلومات
            </button>
          )}
        </section>
      )}

      {/* ── Step 3: Review / Publish ──────────────────────────────── */}
      {step === 3 && (
        <section className="acp-section">
          <h1 className="acp-section__title">
            <span className="material-symbols-outlined" aria-hidden="true">fact_check</span>
            مراجعة ونشر
          </h1>

          {!publishResult ? (
            <>
              <div className="acp-review">
                <div className="acp-review__group">
                  <h3>معلومات المحتوى</h3>
                  <div className="acp-review__item"><span>العنوان:</span> <strong>{title}</strong></div>
                  {caption && <div className="acp-review__item"><span>الوصف:</span> {caption}</div>}
                  <div className="acp-review__item"><span>العالم:</span> {WORLDS.find((w) => w.key === world)?.label}</div>
                  <div className="acp-review__item"><span>النوع:</span> {KINDS_BY_WORLD[world]?.find((k) => k.key === kind)?.label}</div>
                  <div className="acp-review__item"><span>الجمهور:</span> {audience}</div>
                </div>

                {audioAsset && (
                  <div className="acp-review__group">
                    <h3>الملف الصوتي</h3>
                    <div className="acp-review__item"><span>الملف:</span> {audioAsset.originalFileName}</div>
                    <div className="acp-review__item"><span>النوع:</span> {audioAsset.mimeType}</div>
                    {audioAsset.durationMs ? <div className="acp-review__item"><span>المدة:</span> {formatDuration(audioAsset.durationMs)}</div> : null}
                    {audioAsset.sizeBytes ? <div className="acp-review__item"><span>الحجم:</span> {formatFileSize(audioAsset.sizeBytes)}</div> : null}
                    <div className="acp-review__item"><span>المصدر:</span> {audioAsset.sourceType === 'recorded' ? '🎤 مسجّل' : '📁 ملف مرفوع'}</div>
                    <div className="acp-review__item"><span>الحالة:</span> ✅ مرفوع</div>
                  </div>
                )}

                {!audioAsset && (
                  <div className="acp-warning-box">
                    <span className="material-symbols-outlined">warning</span>
                    <p>لا يوجد ملف صوتي مرفق. يجب تسجيل أو رفع ملف صوتي قبل النشر.</p>
                    <button
                      className="acp-btn acp-btn--ghost"
                      onClick={() => setStep(2)}
                      type="button"
                    >
                      رجوع للتسجيل / الرفع
                    </button>
                  </div>
                )}
              </div>

              {publishError && <p className="acp-error">{publishError}</p>}

              <div className="acp-publish-actions">
                <button
                  className="acp-btn acp-btn--primary acp-btn--lg"
                  onClick={handlePublish}
                  disabled={publishing || !audioAsset}
                  type="button"
                >
                  {publishing ? (
                    <><span className="acp-spinner" aria-hidden="true" /> جاري النشر...</>
                  ) : (
                    <><span className="material-symbols-outlined" aria-hidden="true">publish</span> نشر المحتوى</>
                  )}
                </button>
                <button
                  className="acp-btn acp-btn--ghost"
                  onClick={() => setStep(2)}
                  disabled={publishing}
                  type="button"
                >
                  <span className="material-symbols-outlined" aria-hidden="true">arrow_forward</span>
                  رجوع
                </button>
              </div>
            </>
          ) : (
            <div className="acp-publish-success">
              <span className="material-symbols-outlined acp-publish-success__icon">celebration</span>
              <h2>تم النشر بنجاح! 🎉</h2>
              <div className="acp-publish-success__details">
                <div className="acp-review__item"><span>معرّف المحتوى:</span> <code>{publishResult.contentId}</code></div>
                <div className="acp-review__item"><span>الحالة:</span> {publishResult.status}</div>
              </div>
              <button
                className="acp-btn acp-btn--primary"
                onClick={() => navigate(-1)}
                type="button"
              >
                <span className="material-symbols-outlined" aria-hidden="true">arrow_forward</span>
                رجوع
              </button>
            </div>
          )}
        </section>
      )}
    </main>
  );
}
