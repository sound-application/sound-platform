// @ts-nocheck
import React from 'react';
import type { WorldId, AudioContentKind } from '@sound/shared';

export interface Step1InfoProps {
  t: any;
  title: string;
  setTitle: (v: string) => void;
  caption: string;
  setCaption: (v: string) => void;
  world: WorldId;
  setWorld: (v: WorldId) => void;
  kind: AudioContentKind;
  setKind: (v: AudioContentKind) => void;
  saveError: string | null;
  setSaveError: (v: string | null) => void;
  saving: boolean;
  saveDraft: (nextStep: number) => void;
  iconNext: string;
  WORLDS: any[];
  KINDS_BY_WORLD: any;
}

export function Step1Info({
  t, title, setTitle, caption, setCaption, world, setWorld, kind, setKind,
  saveError, setSaveError, saving, saveDraft, iconNext, WORLDS, KINDS_BY_WORLD
}: Step1InfoProps) {
  return (
    <section className="acp-section">
      <h1 className="acp-section__title">
        <span className="material-symbols-outlined" aria-hidden="true">edit_note</span>
        {t('audioContentInformation')}
      </h1>
      <div className="acp-form">
        <label className="acp-label">
          {t('theAddress')} <span className="acp-required">*</span>
          <input type="text" className="acp-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t('titleOfRecordingOrEpisode')} maxLength={200} autoFocus />
        </label>
        <label className="acp-label">
          {t('descriptionClarification')}
          <textarea className="acp-textarea" value={caption} onChange={(e) => setCaption(e.target.value)} placeholder={t('briefDescription')} maxLength={1000} rows={3} />
        </label>
        <label className="acp-label">
          {t('world1')}
          <div className="acp-chips">
            {WORLDS.map((w) => (
              <button key={w.key} className={`acp-chip ${world === w.key ? 'acp-chip--selected' : ''}`} onClick={() => setWorld(w.key as WorldId)} type="button">{w.label}</button>
            ))}
          </div>
        </label>
        <label className="acp-label">
          {t('typeOfContent')}
          <div className="acp-chips">
            {(KINDS_BY_WORLD[world] ?? []).map((k: any) => (
              <button key={k.key} className={`acp-chip ${kind === k.key ? 'acp-chip--selected' : ''}`} onClick={() => setKind(k.key as AudioContentKind)} type="button">{k.label}</button>
            ))}
          </div>
        </label>
        {saveError && <p className="acp-error">{saveError}</p>}
        <button className="acp-btn acp-btn--primary" onClick={() => { if (!title.trim()) { setSaveError(t('addressIsRequired')); return; } saveDraft(2); }} disabled={saving || !title.trim()}>
          {saving ? <><span className="acp-spinner" aria-hidden="true" /> {t('saving')}</> : <><span className="material-symbols-outlined" aria-hidden="true">{iconNext}</span> {t('theNext')}</>}
        </button>
      </div>
    </section>
  );
}

