// @ts-nocheck
import React from 'react';
import type { CoverAsset } from '@sound/shared';

export interface Step3CoverProps {
  t: any;
  coverPreviewUrl: string | null;
  coverUploading: boolean;
  coverProgress: number;
  coverError: string | null;
  coverAsset: CoverAsset | null;
  coverInputRef: React.RefObject<HTMLInputElement>;
  handleCoverSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  setStep: (step: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12) => void;
  iconPrev: string;
  saveDraft: (step: number) => void;
  saving: boolean;
}

export function Step3Cover({
  t, coverPreviewUrl, coverUploading, coverProgress, coverError, coverAsset,
  coverInputRef, handleCoverSelect, setStep, iconPrev, saveDraft, saving
}: Step3CoverProps) {
  return (
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
  );
}
