/**
 * Sound Platform — FilterDropdown Component
 * Phase: 5-C
 *
 * Architecture (corrected):
 *   Dropdown panel = ONLY search + multi-select options.
 *   No subpage button inside the panel.
 *
 *   Subpage button lives in the PARENT (HomePage) under the selected chips.
 *   SelectedChips lives in the PARENT below the filter row.
 *
 * RTL layout:
 *   Option row DOM order: [label] → [checkbox]
 *   With direction:rtl flex-direction:row, first item (label) renders on RIGHT,
 *   checkbox renders on LEFT — correct Arabic reading order.
 *
 * Portal pattern:
 *   Panel mounts into document.body via createPortal.
 *   Position computed synchronously in the click handler (getBoundingClientRect
 *   is reliable at click time because the trigger is fully rendered).
 *   z-index: 9999 — above all fixed headers and navbars.
 */

import React, {
  useState,
  useRef,
  useEffect,
  useId,
  useMemo,
} from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import './FilterDropdown.css';

// ─── Types ────────────────────────────────────────────────────────────────────
export interface FilterOption {
  value: string;
  label: string;
}

export interface FilterDropdownProps {
  label:         string;
  options:       FilterOption[];
  values:        string[];
  onToggle:      (value: string) => void;
  onClear:       () => void;
  defaultLabel?: string;
  ariaLabel?:    string;
}

interface PanelRect { top: number; left: number; width: number; }

// ─── Icons ────────────────────────────────────────────────────────────────────
function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 12 8" fill="none" width="10" height="10" aria-hidden="true"
      style={{ transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'none',
               display: 'block' }}
    >
      <path d="M1 1.5l5 5 5-5" stroke="currentColor"
        strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CheckboxIcon({ checked }: { checked: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`fd-checkbox${checked ? ' fd-checkbox--checked' : ''}`}
    >
      {checked && (
        <svg viewBox="0 0 10 8" fill="none" width="9" height="8">
          <path d="M1 4l3 3 5-6" stroke="#fff"
            strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </span>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────
export function FilterDropdown({
  label,
  options,
  values,
  onToggle,
  onClear,
  defaultLabel,
  ariaLabel,
}: FilterDropdownProps) {
  const { t, i18n } = useTranslation('common');
  const actualDefaultLabel = defaultLabel ?? t('filters.all', 'الكل'); // fallback if not provided

  const [open,  setOpen]  = useState(false);
  const [query, setQuery] = useState('');
  const [rect,  setRect]  = useState<PanelRect | null>(null);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef   = useRef<HTMLDivElement>(null);
  const searchRef  = useRef<HTMLInputElement>(null);
  const panelId    = useId();

  // Compute position from trigger at click time
  function openPanel() {
    const el = triggerRef.current;
    if (!el) return;
    const r   = el.getBoundingClientRect();
    const vw  = window.innerWidth;
    const PAD = 8;
    const W   = Math.min(Math.max(r.width, 240), vw - PAD * 2);
    let left  = r.right - W;
    left = Math.max(PAD, Math.min(left, vw - W - PAD));
    setRect({ top: r.bottom + 4, left, width: W });
    setOpen(true);
  }

  function closePanel() {
    setOpen(false);
    setQuery('');
    setRect(null);
  }

  function toggleOpen() {
    open ? closePanel() : openPanel();
  }

  // Focus search after open
  useEffect(() => {
    if (open) {
      const t = setTimeout(() => searchRef.current?.focus(), 60);
      return () => clearTimeout(t);
    }
  }, [open]);

  // Outside click (capture phase)
  useEffect(() => {
    if (!open) return;
    function handle(e: MouseEvent) {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t)) return;
      if (panelRef.current?.contains(t))  return;
      closePanel();
    }
    document.addEventListener('mousedown', handle, true);
    return () => document.removeEventListener('mousedown', handle, true);
  }, [open]);

  // Escape key
  useEffect(() => {
    if (!open) return;
    function handle(e: KeyboardEvent) {
      if (e.key === 'Escape') closePanel();
    }
    document.addEventListener('keydown', handle);
    return () => document.removeEventListener('keydown', handle);
  }, [open]);

  // Reposition on scroll / resize
  useEffect(() => {
    if (!open) return;
    function reposition() {
      const el = triggerRef.current;
      if (!el) return;
      const r   = el.getBoundingClientRect();
      const vw  = window.innerWidth;
      const PAD = 8;
      const W   = Math.min(Math.max(r.width, 240), vw - PAD * 2);
      let left  = r.right - W;
      left = Math.max(PAD, Math.min(left, vw - W - PAD));
      setRect({ top: r.bottom + 4, left, width: W });
    }
    window.addEventListener('scroll',  reposition, { passive: true, capture: true });
    window.addEventListener('resize',  reposition);
    return () => {
      window.removeEventListener('scroll', reposition, true);
      window.removeEventListener('resize', reposition);
    };
  }, [open]);

  // Filtered options
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? options.filter((o) => o.label.toLowerCase().includes(q)) : options;
  }, [options, query]);

  // Trigger summary
  const count = values.length;
  const displayValue =
    count === 0  ? actualDefaultLabel
    : count === 1 ? (options.find((o) => o.value === values[0])?.label ?? actualDefaultLabel)
    : t('filters.selected', { count });

  // Portal panel — search + options only
  const panel = open && rect ? createPortal(
    <div
      ref={panelRef}
      id={panelId}
      role="dialog"
      aria-modal="false"
      aria-label={label}
      className="fd-panel"
      style={{
        position: 'fixed',
        top:      rect.top,
        left:     rect.left,
        width:    rect.width,
        zIndex:   9999,
      }}
    >
      {/* Search input */}
      <div className="fd-panel__search-row">
        <input
          ref={searchRef}
          type="search"
          className="fd-panel__search"
          placeholder={t('actions.search') + '...'}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label={`${t('actions.search')} ${label}`}
          autoComplete="off"
          dir={i18n.dir()}
        />
      </div>

      <div className="fd-panel__hr" />

      {/* Clear all — only when something selected */}
      {count > 0 && (
        <button
          className="fd-panel__clear"
          onClick={() => { onClear(); setQuery(''); }}
          type="button"
        >
          {t('filters.clearAllCount', { count })}
        </button>
      )}

      {/* Options — logical direction: label on correct side, checkbox on other */}
      <div className="fd-panel__options">
        {filtered.length === 0
          ? <p className="fd-panel__empty">{t('empty.noResults')}</p>
          : filtered.map((opt) => {
              const sel = values.includes(opt.value);
              return (
                <button
                  key={opt.value}
                  className={`fd-panel__option${sel ? ' is-selected' : ''}`}
                  onClick={() => onToggle(opt.value)}
                  type="button"
                  aria-pressed={sel}
                >
                  {/* RTL DOM order: label first → renders on RIGHT; checkbox second → renders on LEFT */}
                  <span className="fd-panel__option-label">{opt.label}</span>
                  <CheckboxIcon checked={sel} />
                </button>
              );
            })
        }
      </div>
    </div>,
    document.body
  ) : null;

  return (
    <>
      <button
        ref={triggerRef}
        className={`fd-trigger${open ? ' is-open' : ''}${count > 0 ? ' has-value' : ''}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        aria-label={ariaLabel ?? label}
        onClick={toggleOpen}
        type="button"
      >
        <span className="fd-trigger__text">
          <span className="fd-trigger__label">{label}</span>
          <span className="fd-trigger__value">{displayValue}</span>
        </span>
        <span className="fd-trigger__chevron">
          <ChevronIcon open={open} />
        </span>
      </button>

      {panel}
    </>
  );
}

// ─── Selected Chips ───────────────────────────────────────────────────────────
// Rendered by the PARENT below the filter row.
// Each chip's × removes only that item — no panel reopens.

export interface SelectedChipsGroup {
  filterId: string;
  options:  FilterOption[];
  values:   string[];
  onRemove: (value: string) => void;
}

export interface SelectedChipsProps {
  groups: SelectedChipsGroup[];
}

export function SelectedChips({ groups }: SelectedChipsProps) {
  const { t, i18n } = useTranslation('common');

  const chips = groups.flatMap((g) =>
    g.values
      .map((v) => {
        const opt = g.options.find((o) => o.value === v);
        if (!opt) return null;
        return {
          key:    `${g.filterId}::${v}`,
          label:  opt.label,
          remove: () => g.onRemove(v),
        };
      })
      .filter(Boolean) as { key: string; label: string; remove: () => void }[]
  );

  if (chips.length === 0) return null;

  return (
    <div className="fd-chips" role="group" aria-label={t('filters.selectedFilters')} dir={i18n.dir()}>
      {chips.map((c) => (
        <span key={c.key} className="fd-chip">
          <span className="fd-chip__label">{c.label}</span>
          <button
            className="fd-chip__x"
            onClick={c.remove}
            type="button"
            aria-label={t('filters.remove', { label: c.label })}
          >×</button>
        </span>
      ))}
    </div>
  );
}
