// @ts-nocheck
import React from 'react';

export interface Step5AutoCueProps {
  t: any;
  autoCueEnabled: boolean;
  setAutoCueEnabled: (v: boolean) => void;
  scriptText: string;
  setScriptText: (v: string) => void;
  caption: string;
  scrollSpeed: 'slow' | 'medium' | 'fast';
  setScrollSpeed: (v: 'slow' | 'medium' | 'fast') => void;
  fontSize: 'small' | 'medium' | 'large';
  setFontSize: (v: 'small' | 'medium' | 'large') => void;
  readingMode: 'lineByLine' | 'paragraphByParagraph';
  setReadingMode: (v: 'lineByLine' | 'paragraphByParagraph') => void;
  startDelay: number;
  setStartDelay: (v: number) => void;
  highlightLine: boolean;
  setHighlightLine: (v: boolean) => void;
  setStep: (step: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12) => void;
  iconPrev: string;
  saveDraft: (step: number) => void;
  saving: boolean;
}

export function Step5AutoCue({
  t, autoCueEnabled, setAutoCueEnabled, scriptText, setScriptText, caption,
  scrollSpeed, setScrollSpeed, fontSize, setFontSize, readingMode, setReadingMode,
  startDelay, setStartDelay, highlightLine, setHighlightLine, setStep, iconPrev, saveDraft, saving
}: Step5AutoCueProps) {
  return (
    <section className="acp-section">
      <h1 className="acp-section__title">
        <span className="material-symbols-outlined" aria-hidden="true">teleprompter</span>
        {t('autoCue', 'الملقن (AutoCue)')}
        <span className="acp-badge acp-badge--optional">{t('optional', 'اختياري')}</span>
      </h1>
      <div className="acp-form">
        <div className="acp-gate-banner">
          <span className="material-symbols-outlined" aria-hidden="true">workspace_premium</span>
          <span>{t('paidFeaturePro', 'ميزة مدفوعة — متاحة لمشتركي الحزم المتقدمة أو بتفعيل إداري.')}</span>
        </div>
        <label className="acp-label acp-label--row acp-toggle-main">
          <input type="checkbox" checked={autoCueEnabled} onChange={(e) => setAutoCueEnabled(e.target.checked)} />
          <span>{t('enablePrompterDuringRecording', 'تفعيل الملقن أثناء التسجيل')}</span>
        </label>
        {autoCueEnabled && (
          <>
            <label className="acp-label">
              {t('textLyrics', 'النص / كلمات الأغنية')}
              <textarea className="acp-textarea acp-textarea--script" value={scriptText} onChange={(e) => setScriptText(e.target.value)} placeholder={t('typeOrPasteTextHere', 'اكتب أو الصق النص هنا...')} rows={8} />
            </label>
            <div className="acp-autocue-actions">
              <button className="acp-btn acp-btn--outline acp-btn--sm" onClick={() => setScriptText(caption)} type="button" disabled={!caption}>{t('copyFromDescription', 'نسخ من الوصف')}</button>
              <button className="acp-btn acp-btn--outline acp-btn--sm acp-btn--gated" disabled type="button">
                {t('smartGenerateAI', 'توليد ذكي (AI)')} <span className="acp-gate-badge">{t('paid', 'مدفوع')}</span>
              </button>
              <button className="acp-btn acp-btn--outline acp-btn--sm" onClick={() => setScriptText('')} type="button">{t('clear', 'مسح')}</button>
            </div>
            <div className="acp-autocue-settings">
              <label className="acp-label">
                {t('scrollSpeed', 'سرعة التمرير')}
                <div className="acp-chips">
                  {([{ k: 'slow' as const, l: t('slow', 'بطيء') }, { k: 'medium' as const, l: t('medium', 'متوسط') }, { k: 'fast' as const, l: t('fast', 'سريع') }]).map((s) => (
                    <button key={s.k} className={`acp-chip ${scrollSpeed === s.k ? 'acp-chip--selected' : ''}`} onClick={() => setScrollSpeed(s.k)} type="button">{s.l}</button>
                  ))}
                </div>
              </label>
              <label className="acp-label">
                {t('fontSize', 'حجم الخط')}
                <div className="acp-chips">
                  {([{ k: 'small' as const, l: t('small', 'صغير') }, { k: 'medium' as const, l: t('medium', 'متوسط') }, { k: 'large' as const, l: t('large', 'كبير') }]).map((s) => (
                    <button key={s.k} className={`acp-chip ${fontSize === s.k ? 'acp-chip--selected' : ''}`} onClick={() => setFontSize(s.k)} type="button">{s.l}</button>
                  ))}
                </div>
              </label>
              <label className="acp-label">
                {t('readingMode', 'وضع القراءة')}
                <div className="acp-chips">
                  <button className={`acp-chip ${readingMode === 'lineByLine' ? 'acp-chip--selected' : ''}`} onClick={() => setReadingMode('lineByLine')} type="button">{t('lineByLine', 'سطر بسطر')}</button>
                  <button className={`acp-chip ${readingMode === 'paragraphByParagraph' ? 'acp-chip--selected' : ''}`} onClick={() => setReadingMode('paragraphByParagraph')} type="button">{t('paragraphByParagraph', 'فقرة بفقرة')}</button>
                </div>
              </label>
              <label className="acp-label">
                {t('startDelaySeconds', 'تأخير البداية (ثوان)')}
                <input type="number" className="acp-input acp-input--narrow" value={startDelay} onChange={(e) => setStartDelay(Number(e.target.value))} min={0} max={30} />
              </label>
              <label className="acp-label acp-label--row">
                <input type="checkbox" checked={highlightLine} onChange={(e) => setHighlightLine(e.target.checked)} />
                {t('highlightCurrentLine', 'تمييز السطر الحالي')}
              </label>
            </div>
          </>
        )}
        <div className="acp-nav-row">
          <button className="acp-btn acp-btn--ghost" onClick={() => setStep(4)} type="button">
            <span className="material-symbols-outlined" aria-hidden="true">{iconPrev}</span> {t('back', 'رجوع')}
          </button>
          <button className="acp-btn acp-btn--ghost" onClick={() => setStep(6)} type="button">{t('skip', 'تخطي')}</button>
          <button className="acp-btn acp-btn--primary" onClick={() => saveDraft(6)} disabled={saving}>
            {saving ? t('savingDots', 'حفظ...') : t('theNext', 'التالي')}
          </button>
        </div>
      </div>
    </section>
  );
}
