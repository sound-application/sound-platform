// @ts-nocheck
import React from 'react';
import { formatDuration, formatFileSize } from '../../../lib/audioDuration';

export interface Step7EditProps {
  t: any;
  step: number;
  audioAsset: any | null;
  previewAudioUrl: string | null;
  waveformAudioRef: React.RefObject<HTMLAudioElement>;
  waveformLoading: boolean;
  waveformPeaks: number[];
  waveformTimelineRef: React.RefObject<HTMLDivElement>;
  waveformDurationMs: number;
  workingDurationMs: number;
  wfHoverMs: number | null;
  setWfHoverMs: (v: number | null) => void;
  wfHoverX: number;
  setWfHoverX: (v: number) => void;
  wfDragging: boolean;
  setWfDragging: (v: boolean) => void;
  wfCurrentMs: number;
  setWfCurrentMs: (v: number) => void;
  wfPlaying: boolean;
  setWfPlaying: (v: boolean) => void;
  wfAnimRef: React.MutableRefObject<number>;
  editEnabled: boolean;
  setEditEnabled: (v: boolean) => void;
  trimStartMs: number;
  setTrimStartMs: (v: number) => void;
  trimEndMs: number;
  setTrimEndMs: (v: number) => void;
  originalDurationMs: number;
  effectiveStart: number;
  effectiveEnd: number;
  editCuts: any[];
  formatMsToTimeInput: (ms: number) => string;
  toggleWfPlayback: () => void;
  renderPreview: (stage: string) => void;
  renderingStage: string | null;
  getStagePreviewStatus: (stage: string) => string;
  previewUrls: any;
  previewAssets: any;
  TimeInputControl: React.FC<{ valueMs: number; onChange: (ms: number) => void }>;
  setIsCutsSaved: (v: boolean) => void;
  updateCut: (id: string, data: any) => void;
  removeCut: (id: string) => void;
  addCut: () => void;
  editedDurationMs: number;
  resetEdits: () => void;
  setAudioAsset: (v: any) => void;
  uploader: any;
  recorder: any;
  setStep: (step: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12) => void;
  saveDraft: (step: number) => void;
  iconNext: string;
}

export function Step7Edit({
  t, step, audioAsset, previewAudioUrl, waveformAudioRef, waveformLoading,
  waveformPeaks, waveformTimelineRef, waveformDurationMs, workingDurationMs,
  wfHoverMs, setWfHoverMs, wfHoverX, setWfHoverX, wfDragging, setWfDragging,
  wfCurrentMs, setWfCurrentMs, wfPlaying, setWfPlaying, wfAnimRef, editEnabled,
  setEditEnabled, trimStartMs, setTrimStartMs, trimEndMs, setTrimEndMs,
  originalDurationMs, effectiveStart, effectiveEnd, editCuts, formatMsToTimeInput,
  toggleWfPlayback, renderPreview, renderingStage, getStagePreviewStatus,
  previewUrls, previewAssets, TimeInputControl, setIsCutsSaved, updateCut,
  removeCut, addCut, editedDurationMs, resetEdits, setAudioAsset, uploader,
  recorder, setStep, saveDraft, iconNext
}: Step7EditProps) {
  return (
    <section className="acp-section">
      <h1 className="acp-section__title">
        <span className="material-symbols-outlined" aria-hidden="true">preview</span>
        {t('reviewAndEditAudio', 'مراجعة وتعديل الصوت')}
      </h1>
      <div className="acp-form">
        {audioAsset ? (
          <div className="acp-review-audio">
            <div className="acp-review__item"><span>{t('theFile', 'الملف:')}</span> <strong>{audioAsset.originalFileName}</strong></div>
            {audioAsset.durationMs ? <div className="acp-review__item"><span>{t('duration', 'المدة:')}</span> {formatDuration(audioAsset.durationMs)}</div> : null}
            {audioAsset.sizeBytes ? <div className="acp-review__item"><span>{t('size', 'الحجم:')}</span> {formatFileSize(audioAsset.sizeBytes)}</div> : null}
            <div className="acp-review__item">
              <span>{t('theSource', 'المصدر:')}</span>
              <span className="material-symbols-outlined" style={{ fontSize: '0.9rem' }}>{audioAsset.sourceType === 'recorded' ? 'mic' : 'upload_file'}</span>
              {audioAsset.sourceType === 'recorded' ? t('recorded', ' مسجّل') : t('uploaded', ' مرفوع')}
            </div>
            <div className="acp-review__item">
              <span>{t('theStatus', 'الحالة:')}</span>
              <span className="material-symbols-outlined" style={{ fontSize: '0.9rem', color: '#22c55e' }}>check_circle</span>
              {t('uploadedStatus', 'مرفوع')}
            </div>
          </div>
        ) : (
          <div className="acp-warning-box">
            <span className="material-symbols-outlined">warning</span>
            <p>{t('noAudioFileGoBack', 'لا يوجد ملف صوتي. ارجع للخطوة السابقة.')}</p>
          </div>
        )}

        {/* ── Phase 8-L.1: Waveform Timeline + Preview ─────────────── */}
        {audioAsset && previewAudioUrl && (
          <div className="acp-waveform-card" id="waveform-timeline">
            {/* Hidden audio element for trim/cut-aware preview */}
            <audio ref={waveformAudioRef} src={previewAudioUrl} preload="metadata" style={{ display: 'none' }}
              onEnded={() => { setWfPlaying(false); cancelAnimationFrame(wfAnimRef.current); }} />

            {waveformLoading ? (
              <div className="acp-waveform-loading">
                <span className="acp-spinner" aria-hidden="true" />
                {t('analyzingAudioWaveform', 'جاري تحليل الموجة الصوتية...')}
              </div>
            ) : waveformPeaks.length > 0 ? (
              <>
                {/* SVG Waveform */}
                <div className="acp-waveform-timeline"
                  ref={waveformTimelineRef}
                  onMouseMove={(e) => {
                    const activeDur = waveformDurationMs || workingDurationMs;
                    if (!activeDur || wfDragging) return;
                    const rect = e.currentTarget.getBoundingClientRect();
                    const x = e.clientX - rect.left;
                    const pct = Math.max(0, Math.min(1, x / rect.width));
                    setWfHoverMs(pct * activeDur);
                    setWfHoverX(pct * 100);
                  }}
                  onMouseLeave={() => setWfHoverMs(null)}
                  onClick={(e) => {
                    const activeDur = waveformDurationMs || workingDurationMs;
                    if (!activeDur || wfDragging) return;
                    const rect = e.currentTarget.getBoundingClientRect();
                    const x = e.clientX - rect.left;
                    const pct = Math.max(0, Math.min(1, x / rect.width));
                    const seekMs = pct * activeDur;
                    if (waveformAudioRef.current) {
                      waveformAudioRef.current.currentTime = seekMs / 1000;
                      setWfCurrentMs(seekMs);
                    }
                  }}
                  onMouseDown={(e) => {
                    const activeDur = waveformDurationMs || workingDurationMs;
                    if (!activeDur) return;
                    e.preventDefault();
                    setWfDragging(true);
                    const rect = e.currentTarget.getBoundingClientRect();
                    const seek = (clientX: number) => {
                      const x = clientX - rect.left;
                      const pct = Math.max(0, Math.min(1, x / rect.width));
                      const seekMs = pct * activeDur;
                      if (waveformAudioRef.current) {
                        waveformAudioRef.current.currentTime = seekMs / 1000;
                        setWfCurrentMs(seekMs);
                      }
                    };
                    seek(e.clientX);
                    const onMove = (ev: MouseEvent) => seek(ev.clientX);
                    const onUp = () => {
                      setWfDragging(false);
                      document.removeEventListener('mousemove', onMove);
                      document.removeEventListener('mouseup', onUp);
                    };
                    document.addEventListener('mousemove', onMove);
                    document.addEventListener('mouseup', onUp);
                  }}
                  onTouchStart={(e) => {
                    const activeDur = waveformDurationMs || workingDurationMs;
                    if (!activeDur) return;
                    setWfDragging(true);
                    const rect = e.currentTarget.getBoundingClientRect();
                    const seek = (clientX: number) => {
                      const x = clientX - rect.left;
                      const pct = Math.max(0, Math.min(1, x / rect.width));
                      const seekMs = pct * activeDur;
                      if (waveformAudioRef.current) {
                        waveformAudioRef.current.currentTime = seekMs / 1000;
                        setWfCurrentMs(seekMs);
                      }
                    };
                    const t0 = e.touches[0];
                    if (t0) seek(t0.clientX);
                    const onMove = (ev: TouchEvent) => { const touch = ev.touches[0]; if (touch) seek(touch.clientX); };
                    const onEnd = () => {
                      setWfDragging(false);
                      document.removeEventListener('touchmove', onMove);
                      document.removeEventListener('touchend', onEnd);
                    };
                    document.addEventListener('touchmove', onMove, { passive: true });
                    document.addEventListener('touchend', onEnd);
                  }}
                  style={{ cursor: wfDragging ? 'grabbing' : 'pointer' }}
                >
                  <svg viewBox="0 0 200 100" preserveAspectRatio="none">
                    {waveformPeaks.map((peak, i) => {
                      const activeDur = waveformDurationMs || workingDurationMs;
                      const barMs = (i / 200) * activeDur;
                      // Only show red cut regions if we are in step 7 (Edit).
                      const isTrimmedOut = step === 7 && editEnabled && (barMs < effectiveStart || barMs > effectiveEnd);
                      const isCut = step === 7 && editEnabled && editCuts.some(c => barMs >= c.startMs && barMs < c.endMs);
                      const barH = Math.max(2, peak * 80);
                      const y = 50 - barH / 2;
                      let fill = 'url(#wfGrad)';
                      let opacity = 1;
                      if (isTrimmedOut) { fill = '#444'; opacity = 0.3; }
                      else if (isCut) { fill = '#ef4444'; opacity = 0.4; }
                      return <rect key={i} x={i} y={y} width={0.6} height={barH} rx={0.3} fill={fill} opacity={opacity} />;
                    })}
                    <defs>
                      <linearGradient id="wfGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#e5c76b" />
                        <stop offset="100%" stopColor="#22d3ee" />
                      </linearGradient>
                    </defs>
                  </svg>
                  {/* Playhead */}
                  {(waveformDurationMs || workingDurationMs) > 0 && (
                    <div className="acp-waveform-timeline__playhead"
                      style={{ left: `${(wfCurrentMs / (waveformDurationMs || workingDurationMs)) * 100}%` }} />
                  )}
                  {/* Hover Tooltip & Line */}
                  {wfHoverMs !== null && originalDurationMs > 0 && !wfDragging && (
                    <>
                      <div style={{
                        position: 'absolute',
                        top: 0,
                        bottom: 0,
                        left: `${wfHoverX}%`,
                        width: '1px',
                        background: 'rgba(255,255,255,0.4)',
                        pointerEvents: 'none',
                        zIndex: 5
                      }} />
                      <div style={{
                        position: 'absolute',
                        top: '-25px',
                        left: `${wfHoverX}%`,
                        transform: 'translateX(-50%)',
                        background: 'rgba(0,0,0,0.8)',
                        color: '#fff',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        pointerEvents: 'none',
                        zIndex: 10,
                        fontFamily: 'monospace',
                        whiteSpace: 'nowrap'
                      }}>
                        {formatMsToTimeInput(wfHoverMs)}
                      </div>
                    </>
                  )}
                </div>

                {/* Controls */}
                <div className="acp-waveform-controls">
                  <span className="acp-waveform-controls__time">{formatDuration(wfCurrentMs)}</span>
                  <button type="button" className="acp-waveform-controls__skip"
                    onClick={() => {
                      if (waveformAudioRef.current) {
                        const tSeek = Math.max(effectiveStart / 1000, waveformAudioRef.current.currentTime - 10);
                        waveformAudioRef.current.currentTime = tSeek;
                        setWfCurrentMs(tSeek * 1000);
                      }
                    }}>-10</button>
                  <button type="button" className="acp-waveform-controls__play" onClick={toggleWfPlayback} aria-label={wfPlaying ? t('stop', 'إيقاف') : t('play', 'تشغيل')}>
                    <span className="material-symbols-outlined">{wfPlaying ? 'pause' : 'play_arrow'}</span>
                  </button>
                  <button type="button" className="acp-waveform-controls__skip"
                    onClick={() => {
                      if (waveformAudioRef.current) {
                        const tSeek = Math.min(effectiveEnd / 1000, waveformAudioRef.current.currentTime + 10);
                        waveformAudioRef.current.currentTime = tSeek;
                        setWfCurrentMs(tSeek * 1000);
                      }
                    }}>+10</button>
                  <span className="acp-waveform-controls__time">{formatDuration(workingDurationMs)}</span>
                </div>

                {/* Phase 8-L.1: Edit preview render button */}
                {editEnabled && (
                  <div className="acp-render-preview-panel">
                    <button
                      type="button"
                      className="acp-btn acp-btn--accent acp-btn--sm"
                      onClick={() => renderPreview('edit')}
                      disabled={renderingStage === 'edit'}
                    >
                      {renderingStage === 'edit' ? (
                        <><span className="material-symbols-outlined acp-spin">progress_activity</span> {t('processingPreview', 'جاري معالجة المعاينة...')}</>
                      ) : getStagePreviewStatus('edit') === 'ready' ? (
                        <><span className="material-symbols-outlined">check_circle</span> {t('previewReadyRePreview', '✓ المعاينة جاهزة — إعادة المعاينة')}</>
                      ) : getStagePreviewStatus('edit') === 'failed' ? (
                        <><span className="material-symbols-outlined">error</span> {t('previewFailedRetry', 'فشلت المعاينة — إعادة المحاولة')}</>
                      ) : getStagePreviewStatus('edit') === 'dirty' ? (
                        <><span className="material-symbols-outlined">warning</span> {t('settingsChangedRePreview', 'الإعدادات تغيرت — أعد المعاينة')}</>
                      ) : (
                        <><span className="material-symbols-outlined">play_circle</span> {t('previewCut', 'حفظ ومعاينة القص')}</>
                      )}
                    </button>
                    {previewUrls.edit && (
                      <audio controls src={previewUrls.edit} className="acp-preview-audio" />
                    )}
                    {previewAssets.edit?.status === 'failed' && previewAssets.edit?.error && (
                      <p className="acp-error-text">{previewAssets.edit.error}</p>
                    )}
                  </div>
                )}
              </>
            ) : (
              <div className="acp-waveform-loading">
                <span className="material-symbols-outlined">graphic_eq</span>
                {t('couldNotAnalyzeWaveform', 'لم يتمكن من تحليل الموجة الصوتية')}
              </div>
            )}
          </div>
        )}

        {/* ── Phase 8-L: Trim/Cut Editor ──────────────────────────── */}
        {audioAsset && audioAsset.durationMs && audioAsset.durationMs > 0 && (
          <div className="acp-edit-panel" id="audio-edit-panel">
            <div className="acp-edit-panel__header">
              <div className="acp-edit-panel__title-row">
                <span className="material-symbols-outlined">content_cut</span>
                <span>{t('cutAndEditAudio', 'قص وتعديل الصوت')}</span>
                <span className="acp-badge acp-badge--optional">{t('optional', 'اختياري')}</span>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={editEnabled}
                className={`acp-toggle-switch ${editEnabled ? 'acp-toggle-switch--on' : ''}`}
                onClick={() => setEditEnabled(!editEnabled)}
              >
                <span className="acp-toggle-switch__thumb" />
              </button>
            </div>

            {editEnabled && (
              <div className="acp-edit-controls">
                {/* Trim start */}
                <div className="acp-edit-control" id="edit-trim-start">
                  <div className="acp-edit-control__label">
                    <span className="material-symbols-outlined">first_page</span>
                    {t('trimStart', 'قص البداية')}
                  </div>
                  <input
                    type="range"
                    dir="ltr"
                    className="acp-edit-control__slider"
                    min={0}
                    max={originalDurationMs}
                    step={100}
                    value={trimStartMs}
                    onChange={e => {
                      let v = Math.max(0, Math.min(originalDurationMs, Number(e.target.value)));
                      const end = trimEndMs > 0 ? trimEndMs : originalDurationMs;
                      if (v > end - 500) setTrimEndMs(Math.min(originalDurationMs, v + 500));
                      setTrimStartMs(v);
                      setIsCutsSaved(false);
                    }}
                  />
                  <TimeInputControl
                    valueMs={trimStartMs}
                    onChange={v => {
                      let newVal = Math.max(0, Math.min(originalDurationMs, v));
                      const end = trimEndMs > 0 ? trimEndMs : originalDurationMs;
                      if (newVal > end - 500) setTrimEndMs(Math.min(originalDurationMs, newVal + 500));
                      setTrimStartMs(newVal);
                      setIsCutsSaved(false);
                    }}
                  />
                </div>

                {/* Trim end */}
                <div className="acp-edit-control" id="edit-trim-end">
                  <div className="acp-edit-control__label">
                    <span className="material-symbols-outlined">last_page</span>
                    {t('trimEnd', 'قص النهاية')}
                  </div>
                  <input
                    type="range"
                    dir="ltr"
                    className="acp-edit-control__slider"
                    min={0}
                    max={originalDurationMs}
                    step={100}
                    value={trimEndMs > 0 ? trimEndMs : originalDurationMs}
                    onChange={e => {
                      let v = Math.max(0, Math.min(originalDurationMs, Number(e.target.value)));
                      if (v < trimStartMs + 500) setTrimStartMs(Math.max(0, v - 500));
                      setTrimEndMs(v >= originalDurationMs ? 0 : v);
                      setIsCutsSaved(false);
                    }}
                  />
                  <TimeInputControl
                    valueMs={trimEndMs > 0 ? trimEndMs : originalDurationMs}
                    onChange={v => {
                      let newVal = Math.max(0, Math.min(originalDurationMs, v));
                      if (newVal < trimStartMs + 500) setTrimStartMs(Math.max(0, newVal - 500));
                      setTrimEndMs(newVal >= originalDurationMs ? 0 : newVal);
                      setIsCutsSaved(false);
                    }}
                  />
                </div>

                {/* Middle cut */}
                <div className="acp-edit-cut-section" id="edit-middle-cut">
                  <div className="acp-edit-cut-section__header">
                    <span className="material-symbols-outlined">content_cut</span>
                    <span>{t('deleteMiddleSection', 'حذف مقطع من المنتصف')}</span>
                    <span className="acp-hint">{t('unlimited', '(بدون حد أقصى)')}</span>
                  </div>
                  {editCuts.map(cut => (
                    <div key={cut.id} className="acp-edit-cut-card">
                      <div className="acp-edit-cut-card__row">
                        <div className="acp-edit-cut-card__field">
                          <span className="acp-edit-cut-card__field-label">{t('from', 'من:')}</span>
                          <input
                            type="range"
                            dir="ltr"
                            className="acp-edit-control__slider"
                            min={0}
                            max={originalDurationMs}
                            step={100}
                            value={cut.startMs}
                            onChange={e => {
                              let v = Math.max(0, Math.min(originalDurationMs, Number(e.target.value)));
                              if (v > cut.endMs - 100) {
                                updateCut(cut.id, { startMs: v, endMs: Math.min(originalDurationMs, v + 100) });
                              } else {
                                updateCut(cut.id, { startMs: v });
                              }
                            }}
                          />
                          <TimeInputControl
                            valueMs={cut.startMs}
                            onChange={v => {
                              let newVal = Math.max(0, Math.min(originalDurationMs, v));
                              if (newVal > cut.endMs - 100) {
                                updateCut(cut.id, { startMs: newVal, endMs: Math.min(originalDurationMs, newVal + 100) });
                              } else {
                                updateCut(cut.id, { startMs: newVal });
                              }
                            }}
                          />
                        </div>
                        <div className="acp-edit-cut-card__field">
                          <span className="acp-edit-cut-card__field-label">{t('to', 'إلى:')}</span>
                          <input
                            type="range"
                            dir="ltr"
                            className="acp-edit-control__slider"
                            min={0}
                            max={originalDurationMs}
                            step={100}
                            value={cut.endMs}
                            onChange={e => {
                              let v = Math.max(0, Math.min(originalDurationMs, Number(e.target.value)));
                              if (v < cut.startMs + 100) {
                                updateCut(cut.id, { startMs: Math.max(0, v - 100), endMs: v });
                              } else {
                                updateCut(cut.id, { endMs: v });
                              }
                            }}
                          />
                          <TimeInputControl
                            valueMs={cut.endMs}
                            onChange={v => {
                              let newVal = Math.max(0, Math.min(originalDurationMs, v));
                              if (newVal < cut.startMs + 100) {
                                updateCut(cut.id, { startMs: Math.max(0, newVal - 100), endMs: newVal });
                              } else {
                                updateCut(cut.id, { endMs: newVal });
                              }
                            }}
                          />
                        </div>
                      </div>
                      <button type="button" className="acp-btn acp-btn--ghost acp-btn--sm" onClick={() => removeCut(cut.id)}>
                        <span className="material-symbols-outlined">delete</span> {t('removeCut', 'إزالة القص')}
                      </button>
                    </div>
                  ))}
                  <button type="button" className="acp-btn acp-btn--outline acp-btn--sm" onClick={addCut} style={{ marginTop: '0.5rem' }}>
                    <span className="material-symbols-outlined">add</span> {t('addCut', 'إضافة قص')}
                  </button>
                </div>

                {/* Duration summary */}
                <div className="acp-edit-duration-summary">
                  <div className="acp-edit-duration-summary__row">
                    <span className="material-symbols-outlined">schedule</span>
                    <span>{t('originalDuration', 'المدة الأصلية:')}</span>
                    <strong>{formatDuration(originalDurationMs)}</strong>
                  </div>
                  <div className="acp-edit-duration-summary__row acp-edit-duration-summary__row--edited">
                    <span className="material-symbols-outlined">timer</span>
                    <span>{t('editedDuration', 'المدة بعد التعديل:')}</span>
                    <strong>{formatDuration(editedDurationMs)}</strong>
                  </div>
                </div>

                {/* Reset button */}
                <button type="button" className="acp-btn acp-btn--ghost acp-btn--sm" onClick={resetEdits}>
                  <span className="material-symbols-outlined">restart_alt</span> {t('resetEdits', 'إعادة ضبط التعديلات')}
                </button>
              </div>
            )}
          </div>
        )}

        <div className="acp-nav-row" style={{ marginTop: '1rem' }}>
          <button className="acp-btn acp-btn--ghost" onClick={() => { setAudioAsset(null); uploader.reset(); recorder.reset(); setStep(6); }} type="button">
            <span className="material-symbols-outlined" aria-hidden="true">refresh</span> {t('reRecordUpload', 'إعادة التسجيل / الرفع')}
          </button>
          <button className="acp-btn acp-btn--primary" onClick={() => saveDraft(8)} disabled={!audioAsset || renderingStage === 'edit'} type="button">
            <span className="material-symbols-outlined" aria-hidden="true">{iconNext}</span> {t('confirmAndContinue', 'تأكيد ومتابعة')}
          </button>
        </div>
      </div>
    </section>
  );
}
