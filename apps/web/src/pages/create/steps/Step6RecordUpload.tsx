// @ts-nocheck
import React from 'react';
import { formatDuration, formatFileSize } from '../../../lib/audioDuration';

export interface Step6RecordUploadProps {
  t: any;
  autoCueEnabled: boolean;
  scriptText: string;
  fontSize: 'small' | 'medium' | 'large';
  tab: 'record' | 'upload';
  setTab: (tab: 'record' | 'upload') => void;
  recorder: any; // Audio recorder state object
  uploader: any; // Upload state object
  handleUploadRecording: () => void;
  selectedFile: File | null;
  setSelectedFile: (file: File | null) => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
  handleFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  fileError: string | null;
  fileDurationMs: number | null;
  setFileDurationMs: (ms: number | null) => void;
  handleUploadFile: () => void;
  attaching: boolean;
  attachError: string | null;
  audioAsset: any | null; // Audio asset object
  setAudioAsset: (asset: any | null) => void;
  setStep: (step: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12) => void;
  iconPrev: string;
  iconNext: string;
}

export function Step6RecordUpload({
  t, autoCueEnabled, scriptText, fontSize, tab, setTab, recorder, uploader,
  handleUploadRecording, selectedFile, setSelectedFile, fileInputRef,
  handleFileSelect, fileError, fileDurationMs, setFileDurationMs,
  handleUploadFile, attaching, attachError, audioAsset, setAudioAsset, setStep, iconPrev, iconNext
}: Step6RecordUploadProps) {
  return (
    <section className="acp-section">
      <h1 className="acp-section__title">
        <span className="material-symbols-outlined" aria-hidden="true">mic</span>
        {t('recordOrUpload', 'التسجيل أو الرفع')}
      </h1>

      {autoCueEnabled && scriptText && (
        <div className="acp-autocue-banner">
          <span className="material-symbols-outlined" aria-hidden="true">teleprompter</span>
          <span>{t('prompterActiveTextWillShow', 'وضع الملقن مفعّل — النص سيظهر أثناء التسجيل')}</span>
        </div>
      )}

      <div className="acp-tabs">
        <button className={`acp-tab ${tab === 'record' ? 'acp-tab--active' : ''}`} onClick={() => setTab('record')} type="button">
          <span className="material-symbols-outlined" aria-hidden="true">mic</span> {t('record', 'تسجيل')}
        </button>
        <button className={`acp-tab ${tab === 'upload' ? 'acp-tab--active' : ''}`} onClick={() => setTab('upload')} type="button">
          <span className="material-symbols-outlined" aria-hidden="true">upload_file</span> {t('uploadFile', 'رفع ملف')}
        </button>
      </div>

      {tab === 'record' && (
        <div className={`acp-record-panel ${autoCueEnabled && scriptText ? 'acp-record-panel--autocue' : ''}`}>
          {autoCueEnabled && scriptText && (
            <div className="acp-script-surface">
              <div className={`acp-script-surface__text acp-script-surface__text--${fontSize}`}>
                {scriptText.split('\n').map((line, i) => (
                  <p key={i} className="acp-script-surface__line">{line || '\u00A0'}</p>
                ))}
              </div>
            </div>
          )}

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
                  <button className="acp-btn acp-btn--ghost" onClick={() => { recorder.reset(); setAudioAsset(null); }} disabled={uploader.state === 'uploading'} type="button">{t('reRecord', 'إعادة التسجيل')}</button>
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
                <button className="acp-btn acp-btn--ghost" onClick={() => { setSelectedFile(null); setFileDurationMs(null); uploader.reset(); if (fileInputRef.current) fileInputRef.current.value = ''; setAudioAsset(null); }} disabled={uploader.state === 'uploading'} type="button">{t('changeFile', 'تغيير الملف')}</button>
              </div>
            </div>
          )}
        </div>
      )}

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
            <span className="material-symbols-outlined" aria-hidden="true">{iconNext}</span> {t('continue', 'متابعة')}
          </button>
        </div>
      )}

      {!audioAsset && (
        <button className="acp-btn acp-btn--ghost acp-back" onClick={() => setStep(5)} type="button">
          <span className="material-symbols-outlined" aria-hidden="true">{iconPrev}</span> {t('back', 'رجوع')}
        </button>
      )}
    </section>
  );
}
