// @ts-nocheck
import React from 'react';
import { AudioMixTrack, MIXING_PRESETS as MIXING_PRESET_DEFS, dbToPercent, percentToDb } from '@sound/shared';
import { formatDuration, formatFileSize } from '../../../lib/audioDuration';

export interface Step9MixingProps {
  t: any;
  previewUrls: any;
  audioAsset: any | null;
  workingDurationMs: number;
  editEnabled: boolean;
  effectsEnabled: boolean;
  mixingEnabled: boolean;
  setMixingEnabled: (v: boolean) => void;
  mixTracks: AudioMixTrack[];
  updateMixTrack: (id: string, updates: Partial<AudioMixTrack>) => void;
  musicSourceOptions: any[];
  sfxSourceOptions: any[];
  musicFileRef: React.RefObject<HTMLInputElement>;
  handleMusicUpload: (file: File) => void;
  removeMusicUpload: () => void;
  musicUploading: boolean;
  musicUploadProgress: number;
  sfxItems: any[];
  MAX_SFX_ITEMS: number;
  sfxFileRef: React.RefObject<HTMLInputElement>;
  handleSfxUpload: (file: File) => void;
  removeSfxItem: (id: string) => void;
  updateSfxItem: (id: string, updates: any) => void;
  sfxUploading: boolean;
  TimeInputControl: React.FC<{ valueMs: number; onChange: (ms: number) => void }>;
  autoDuckEnabled: boolean;
  setAutoDuckEnabled: (v: boolean) => void;
  masterFadeInMs: number;
  setMasterFadeInMs: (v: number) => void;
  masterFadeOutMs: number;
  setMasterFadeOutMs: (v: number) => void;
  masterGainDb: number;
  setMasterGainDb: (v: number) => void;
  selectedMixPresetId: string | null;
  applyMixPreset: (id: string) => void;
  resetMixing: () => void;
  renderPreview: (stage: string) => void;
  renderingStage: string | null;
  getStagePreviewStatus: (stage: string) => string;
  previewAssets: any;
  setStep: (step: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12) => void;
  saveDraft: (step: number) => void;
  iconPrev: string;
  iconNext: string;
  saving: boolean;
}

export function Step9Mixing({
  t, previewUrls, audioAsset, workingDurationMs, editEnabled, effectsEnabled,
  mixingEnabled, setMixingEnabled, mixTracks, updateMixTrack, musicSourceOptions,
  sfxSourceOptions, musicFileRef, handleMusicUpload, removeMusicUpload, musicUploading,
  musicUploadProgress, sfxItems, MAX_SFX_ITEMS, sfxFileRef, handleSfxUpload,
  removeSfxItem, updateSfxItem, sfxUploading, TimeInputControl, autoDuckEnabled,
  setAutoDuckEnabled, masterFadeInMs, setMasterFadeInMs, masterFadeOutMs,
  setMasterFadeOutMs, masterGainDb, setMasterGainDb, selectedMixPresetId,
  applyMixPreset, resetMixing, renderPreview, renderingStage, getStagePreviewStatus,
  previewAssets, setStep, saveDraft, iconPrev, iconNext, saving
}: Step9MixingProps) {
  return (
    <section className="acp-section">
      <h1 className="acp-section__title">
        <span className="material-symbols-outlined" aria-hidden="true">graphic_eq</span>
        {t('audioMixing', 'مكساج الصوت')}
        <span className="acp-badge acp-badge--optional">{t('optional', 'اختياري')}</span>
      </h1>
      <div className="acp-form">

        {/* ── Working-audio preview (effects or cut audio from prev step) ── */}
        {(previewUrls.effects || previewUrls.edit || audioAsset?.storagePath) && (
          <div className="acp-working-audio-card" id="mixing-source-preview">
            <div className="acp-working-audio-card__header">
              <span className="material-symbols-outlined">graphic_eq</span>
              <div className="acp-working-audio-card__info">
                <span className="acp-working-audio-card__title">
                  {previewUrls.effects
                    ? t('audioAfterEffects', 'الصوت بعد المؤثرات')
                    : previewUrls.edit
                    ? t('audioAfterCuts', 'الصوت بعد القص')
                    : t('originalAudio', 'الصوت الأصلي')}
                </span>
                <span className="acp-working-audio-card__subtitle">
                  {t('mixingAppliedToThis', 'المكساج سيُطبَّق على هذا الصوت')}
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
            <span>{t('enableMixing', 'تفعيل المكساج')}</span>
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
                <span className="material-symbols-outlined">layers</span> {t('layers', 'الطبقات')}
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
                        title={track.muted ? t('unmute', 'إلغاء الكتم') : t('mute', 'كتم')}
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
                      {musicSourceOptions.map(opt => (
                        <button
                          key={opt.id}
                          className={`acp-playlist-card ${track.sourceType === opt.id ? 'acp-playlist-card--selected' : ''} ${!opt.available && opt.id !== 'none' ? 'acp-playlist-card--gated' : ''}`}
                          type="button"
                          onClick={() => opt.available ? updateMixTrack(track.id, { sourceType: opt.id as AudioMixTrack['sourceType'], enabled: opt.id !== 'none' }) : undefined}
                          disabled={!opt.available && opt.id !== 'none'}
                        >
                          <span className="material-symbols-outlined">{opt.icon}</span>
                          {opt.label}
                          {!opt.available && opt.id !== 'none' && <span className="acp-gate-badge">{t('soon', 'قريباً')}</span>}
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
                                {track.fileName || t('musicFile', 'ملف موسيقى')}
                              </div>
                              {track.durationMs && <div className="acp-music-upload__meta">{formatDuration(track.durationMs)} · {track.sizeBytes ? formatFileSize(track.sizeBytes) : ''}</div>}
                              <button type="button" className="acp-music-upload__remove" onClick={removeMusicUpload}>
                                <span className="material-symbols-outlined" style={{ fontSize: '0.8rem' }}>delete</span> {t('remove', 'إزالة')}
                              </button>
                            </>
                          ) : (
                            <button type="button" className="acp-sfx-add-btn" onClick={() => musicFileRef.current?.click()} disabled={musicUploading}>
                              <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>{musicUploading ? 'hourglass_empty' : 'upload_file'}</span>
                              {musicUploading ? `${t('uploadingWithProgress', 'جاري الرفع...')} ${musicUploadProgress}%` : t('chooseMusicFile', 'اختر ملف موسيقى')}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                  {/* SFX track — show source selector but disable library */}
                  {track.type === 'sfx' && (
                    <div className="acp-mix-track-card__source">
                      {sfxSourceOptions.map(opt => (
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

            {/* ── Phase 8-L.1: SFX Items Section ─────────────────────── */}
            {mixTracks.some(t => t.type === 'sfx' && t.sourceType === 'uploaded') && (
              <div className="acp-sfx-section">
                <div className="acp-sfx-section__header">
                  <span className="acp-sfx-section__title">
                    <span className="material-symbols-outlined">music_note</span>
                    {t('soundEffectsSfx', 'مؤثرات صوتية')} ({sfxItems.length}/{MAX_SFX_ITEMS})
                  </span>
                  <input ref={sfxFileRef} type="file" accept="audio/*" style={{ display: 'none' }}
                    onChange={e => { const f = e.target.files?.[0]; if (f) handleSfxUpload(f); e.target.value = ''; }} />
                  <button type="button" className="acp-sfx-add-btn"
                    onClick={() => sfxFileRef.current?.click()}
                    disabled={sfxItems.length >= MAX_SFX_ITEMS || sfxUploading}>
                    <span className="material-symbols-outlined" style={{ fontSize: '0.9rem' }}>{sfxUploading ? 'hourglass_empty' : 'add'}</span>
                    {sfxUploading ? t('uploadingWithProgress', 'جاري الرفع...') : t('addSfx', 'إضافة مؤثر')}
                  </button>
                </div>
                {sfxItems.map(sfx => (
                  <div className="acp-sfx-card" key={sfx.id}>
                    <div className="acp-sfx-card__header">
                      <span className="acp-sfx-card__name">
                        <span className="material-symbols-outlined" style={{ fontSize: '0.9rem', verticalAlign: 'middle', marginLeft: '0.25rem' }}>audio_file</span>
                        {sfx.fileName}
                      </span>
                      <button type="button" className="acp-sfx-card__remove" onClick={() => removeSfxItem(sfx.id)} title={t('remove', 'إزالة')}>
                        <span className="material-symbols-outlined">close</span>
                      </button>
                    </div>
                    <div className="acp-sfx-card__controls">
                      <div className="acp-sfx-card__field">
                        <span className="acp-sfx-card__field-label">{t('timingMinSecMs', 'التوقيت (دقيقة:ثانية.ملي ثانية)')}</span>
                        <TimeInputControl
                          valueMs={sfx.startMs}
                          onChange={v => updateSfxItem(sfx.id, { startMs: v })}
                        />
                      </div>
                      <div className="acp-sfx-card__slider">
                        <span className="acp-sfx-card__field-label">{t('volumeLevel', 'الصوت')}</span>
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
                    {t('uploadSfxAndSetTimingHint', 'ارفع ملفات مؤثرات صوتية وحدد التوقيت الدقيق لكل مؤثر')}
                  </p>
                )}
              </div>
            )}

            {/* Advanced tools */}
            <div className="acp-mix-advanced">
              <h3 className="acp-mix-layers__title">
                <span className="material-symbols-outlined">tune</span> {t('advancedTools', 'أدوات متقدمة')}
              </h3>
              <div className="acp-mix-tools-grid">
                {/* Auto-duck toggle */}
                <div className="acp-mix-tool-card">
                  <div className="acp-mix-tool-card__header">
                    <span className="material-symbols-outlined">hearing</span>
                    <span>{t('musicDucking', 'خفض الموسيقى')}</span>
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
                  <span className="acp-mix-tool-card__desc">{t('automaticallyDuringSpeech', 'تلقائياً أثناء الكلام')}</span>
                  {autoDuckEnabled && (
                    <span className="acp-mix-tool-card__note">
                      <span className="material-symbols-outlined" style={{ fontSize: '0.7rem' }}>schedule</span>
                      {t('delayedRequiresMusicTrack', 'مؤجل — يتطلب مسار موسيقى')}
                    </span>
                  )}
                </div>

                {/* Fade In */}
                <div className="acp-mix-tool-card">
                  <div className="acp-mix-tool-card__header">
                    <span className="material-symbols-outlined">signal_cellular_alt</span>
                    <span>Fade In</span>
                  </div>
                  <span className="acp-mix-tool-card__desc">{t('fadeInDesc', 'تدرج دخول')}</span>
                  <div className="acp-mix-tool-card__control">
                    <input
                      type="range" className="acp-range-slider" min={0} max={5000} step={100}
                      value={masterFadeInMs} onChange={e => setMasterFadeInMs(Number(e.target.value))}
                    />
                    <span className="acp-mix-tool-card__value">{(masterFadeInMs / 1000).toFixed(1)}ث</span>
                  </div>
                </div>

                {/* Fade Out */}
                <div className="acp-mix-tool-card">
                  <div className="acp-mix-tool-card__header">
                    <span className="material-symbols-outlined">signal_cellular_alt</span>
                    <span>Fade Out</span>
                  </div>
                  <span className="acp-mix-tool-card__desc">{t('fadeOutDesc', 'تدرج خروج')}</span>
                  <div className="acp-mix-tool-card__control">
                    <input
                      type="range" className="acp-range-slider" min={0} max={5000} step={100}
                      value={masterFadeOutMs} onChange={e => setMasterFadeOutMs(Number(e.target.value))}
                    />
                    <span className="acp-mix-tool-card__value">{(masterFadeOutMs / 1000).toFixed(1)}ث</span>
                  </div>
                </div>

                {/* Master Gain */}
                <div className="acp-mix-tool-card">
                  <div className="acp-mix-tool-card__header">
                    <span className="material-symbols-outlined">volume_up</span>
                    <span>{t('masterLevel', 'مستوى الماستر')}</span>
                  </div>
                  <span className="acp-mix-tool-card__desc">{t('calibrateOverallLevel', 'معايرة المستوى العام')}</span>
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
                <span className="material-symbols-outlined">auto_awesome</span> {t('readyPresets', 'قوالب جاهزة')}
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
              {t('pressPreviewMixingToHearResult', 'اضغط معاينة المكساج لسماع النتيجة قبل النشر. الملف الأصلي يبقى محفوظاً.')}
            </p>

            {/* Reset button */}
            <button className="acp-btn acp-btn--ghost acp-btn--sm" onClick={resetMixing} type="button">
              <span className="material-symbols-outlined">restart_alt</span> {t('reset', 'إعادة ضبط')}
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
                <><span className="material-symbols-outlined acp-spin">progress_activity</span> جاري معالجة المعاينة...</>
              ) : getStagePreviewStatus('mixing') === 'ready' ? (
                <><span className="material-symbols-outlined">check_circle</span> ✓ المعاينة جاهزة — إعادة المعاينة</>
              ) : getStagePreviewStatus('mixing') === 'failed' ? (
                <><span className="material-symbols-outlined">error</span> فشلت المعاينة — إعادة المحاولة</>
              ) : getStagePreviewStatus('mixing') === 'dirty' ? (
                <><span className="material-symbols-outlined">warning</span> الإعدادات تغيرت — أعد المعاينة</>
              ) : (
                <><span className="material-symbols-outlined">play_circle</span> {t('previewMixing', 'معاينة المكساج')}</>
              )}
            </button>
            {effectsEnabled && getStagePreviewStatus('effects') !== 'ready' && (
              <p className="acp-hint">{t('mustPreviewEffectsFirst', 'يجب معاينة المؤثرات أولاً')}</p>
            )}
            {!effectsEnabled && editEnabled && getStagePreviewStatus('edit') !== 'ready' && (
              <p className="acp-hint">{t('previewCutFirst', 'يجب معاينة القص أولاً')}</p>
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
            <span className="material-symbols-outlined" aria-hidden="true">{iconPrev}</span> {t('back', 'رجوع')}
          </button>
          <button className="acp-btn acp-btn--primary" onClick={() => saveDraft(10)} disabled={saving} type="button">
            <span className="material-symbols-outlined" aria-hidden="true">{mixingEnabled ? 'save' : iconNext}</span>
            {saving ? t('savingDots', 'جاري الحفظ...') : mixingEnabled ? t('saveMixing', 'حفظ المكساج') : t('skip', 'تخطي')}
          </button>
        </div>
      </div>
    </section>
  );
}
