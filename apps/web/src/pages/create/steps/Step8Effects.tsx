// @ts-nocheck
import React from 'react';
import { AUDIO_PRESETS, AUDIO_FILTERS } from '@sound/shared';
import { formatDuration } from '../../../lib/audioDuration';

export interface Step8EffectsProps {
  t: any;
  previewUrls: any;
  audioAsset: any | null;
  workingDurationMs: number;
  editEnabled: boolean;
  effectsEnabled: boolean;
  setEffectsEnabled: (v: boolean) => void;
  effectsMode: 'preset' | 'manual';
  setEffectsMode: (v: 'preset' | 'manual') => void;
  selectedPresetId: string | null;
  setSelectedPresetId: (v: string | null) => void;
  manualFilters: any[];
  updateFilter: (id: string, data: any) => void;
  renderPreview: (stage: string) => void;
  renderingStage: string | null;
  getStagePreviewStatus: (stage: string) => string;
  previewAssets: any;
  resetEffects: () => void;
  setStep: (step: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12) => void;
  saveDraft: (step: number) => void;
  iconPrev: string;
  iconNext: string;
  saving: boolean;
}

export function Step8Effects({
  t, previewUrls, audioAsset, workingDurationMs, editEnabled, effectsEnabled,
  setEffectsEnabled, effectsMode, setEffectsMode, selectedPresetId, setSelectedPresetId,
  manualFilters, updateFilter, renderPreview, renderingStage, getStagePreviewStatus,
  previewAssets, resetEffects, setStep, saveDraft, iconPrev, iconNext, saving
}: Step8EffectsProps) {
  return (
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
  );
}
