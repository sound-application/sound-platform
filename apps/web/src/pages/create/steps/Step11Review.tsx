// @ts-nocheck
import React from 'react';
import { AUDIO_PRESETS, MIXING_PRESETS as MIXING_PRESET_DEFS, dbToPercent } from '@sound/shared';
import { formatDuration, formatFileSize } from '../../../lib/audioDuration';

export interface Step11ReviewProps {
  t: any;
  title: string;
  audioAsset: any | null;
  coverAsset: any | null;
  caption: string;
  world: string;
  kind: string;
  categoryId: string;
  subcategoryId: string;
  tags: string;
  language: string;
  countryMode: string;
  countryCodes: string;
  ageSuitability: string;
  isExplicit: boolean;
  isChildContent: boolean;
  placementFeed: string;
  audience: string;
  commentsEnabled: boolean;
  giftsEnabled: boolean;
  sharingEnabled: boolean;
  WORLDS: any[];
  KINDS_BY_WORLD: Record<string, any[]>;
  CATEGORIES: any[];
  SUBCATEGORIES_BY_CATEGORY: Record<string, any[]>;
  LANGUAGES: any[];
  AUDIENCE_OPTIONS: any[];
  captionsEnabled: boolean;
  captionLang: string;
  captionStyle: string;
  autoCueEnabled: boolean;
  scrollSpeed: string;
  fontSize: string;
  readingMode: string;
  startDelay: number;
  highlightLine: boolean;
  scriptText: string;
  effectsEnabled: boolean;
  effectsMode: string;
  selectedPresetId: string | null;
  manualFilters: any[];
  mixingEnabled: boolean;
  selectedMixPresetId: string | null;
  mixTracks: any[];
  masterFadeInMs: number;
  masterFadeOutMs: number;
  masterGainDb: number;
  autoDuckEnabled: boolean;
  sfxItems: any[];
  editEnabled: boolean;
  trimStartMs: number;
  trimEndMs: number;
  originalDurationMs: number;
  editCuts: any[];
  editedDurationMs: number;
  publishError: string | null;
  publishing: boolean;
  handlePublish: () => void;
  setStep: (step: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12) => void;
  iconPrev: string;
}

export function Step11Review({
  t, title, audioAsset, coverAsset, caption, world, kind, categoryId, subcategoryId,
  tags, language, countryMode, countryCodes, ageSuitability, isExplicit, isChildContent,
  placementFeed, audience, commentsEnabled, giftsEnabled, sharingEnabled, WORLDS,
  KINDS_BY_WORLD, CATEGORIES, SUBCATEGORIES_BY_CATEGORY, LANGUAGES, AUDIENCE_OPTIONS,
  captionsEnabled, captionLang, captionStyle, autoCueEnabled, scrollSpeed, fontSize,
  readingMode, startDelay, highlightLine, scriptText, effectsEnabled, effectsMode,
  selectedPresetId, manualFilters, mixingEnabled, selectedMixPresetId, mixTracks,
  masterFadeInMs, masterFadeOutMs, masterGainDb, autoDuckEnabled, sfxItems, editEnabled,
  trimStartMs, trimEndMs, originalDurationMs, editCuts, editedDurationMs, publishError,
  publishing, handlePublish, setStep, iconPrev
}: Step11ReviewProps) {
  return (
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
  );
}
