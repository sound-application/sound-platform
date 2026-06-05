// @ts-nocheck
import React from 'react';
import { AUDIO_PRESETS, MIXING_PRESETS as MIXING_PRESET_DEFS } from '@sound/shared';
import { formatDuration } from '../../../lib/audioDuration';

export interface Step10PreviewProps {
  t: any;
  coverPreviewUrl: string | null;
  previewAudioUrl: string | null;
  previewAudioRef: React.RefObject<HTMLAudioElement>;
  previewPlaying: boolean;
  setPreviewPlaying: (v: boolean) => void;
  togglePreviewPlayback: () => void;
  audioAsset: any | null;
  editEnabled: boolean;
  editedDurationMs: number;
  title: string;
  currentUser: any | null;
  world: string;
  kind: string;
  categoryId: string;
  subcategoryId: string;
  ageSuitability: string;
  countryMode: string;
  countryCodes: string;
  WORLDS: any[];
  KINDS_BY_WORLD: Record<string, any[]>;
  CATEGORIES: any[];
  SUBCATEGORIES_BY_CATEGORY: Record<string, any[]>;
  AUDIENCE_OPTIONS: any[];
  audience: string;
  waveformPeaks: number[];
  getPreviewPlaybackUrl: () => string | null;
  getStagePreviewStatus: (stage: string) => string;
  effectsEnabled: boolean;
  mixingEnabled: boolean;
  placementFeed: string;
  captionsEnabled: boolean;
  coverAsset: any | null;
  effectsMode: string;
  selectedPresetId: string | null;
  manualFilters: any[];
  selectedMixPresetId: string | null;
  setStep: (step: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12) => void;
  setAudioAsset: (v: any) => void;
  uploader: any;
  recorder: any;
  saveDraft: (step: number) => void;
  iconPrev: string;
  saving: boolean;
}

export function Step10Preview({
  t, coverPreviewUrl, previewAudioUrl, previewAudioRef, previewPlaying,
  setPreviewPlaying, togglePreviewPlayback, audioAsset, editEnabled,
  editedDurationMs, title, currentUser, world, kind, categoryId, subcategoryId,
  ageSuitability, countryMode, countryCodes, WORLDS, KINDS_BY_WORLD, CATEGORIES,
  SUBCATEGORIES_BY_CATEGORY, AUDIENCE_OPTIONS, audience, waveformPeaks,
  getPreviewPlaybackUrl, getStagePreviewStatus, effectsEnabled, mixingEnabled,
  placementFeed, captionsEnabled, coverAsset, effectsMode, selectedPresetId,
  manualFilters, selectedMixPresetId, setStep, setAudioAsset, uploader, recorder,
  saveDraft, iconPrev, saving
}: Step10PreviewProps) {
  return (
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
  );
}
