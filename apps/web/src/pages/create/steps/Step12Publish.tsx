// @ts-nocheck
import React from 'react';
import { formatDuration } from '../../../lib/audioDuration';

export interface Step12PublishProps {
  t: any;
  publishResult: any | null;
  categoryId: string;
  ageSuitability: string;
  world: string;
  WORLDS: any[];
  CATEGORIES: any[];
  AUDIENCE_OPTIONS: any[];
  coverPreviewUrl: string | null;
  title: string;
  audioAsset: any | null;
  captionsEnabled: boolean;
  audience: string;
  navigate: (path: any) => void;
  iconPrev: string;
}

export function Step12Publish({
  t, publishResult, categoryId, ageSuitability, world, WORLDS, CATEGORIES,
  AUDIENCE_OPTIONS, coverPreviewUrl, title, audioAsset, captionsEnabled, audience,
  navigate, iconPrev
}: Step12PublishProps) {
  if (!publishResult) return null;

  return (
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
  );
}
