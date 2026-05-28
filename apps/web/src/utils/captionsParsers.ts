/**
 * Sound Platform — Caption File Parsers
 * =======================================
 * Phase:   8-H.1 (Creator-Authored Captions)
 * Created: 2026-05-29
 *
 * Basic SRT and VTT parsers for creator-uploaded caption files.
 * Extracts text + timing where parseable. On failure, returns
 * a single segment with raw text and no timing.
 *
 * RULES:
 *   - Never fake timing. If timing can't be parsed, omit startMs/endMs.
 *   - Preserve original text exactly.
 */

import type { CaptionSegment } from '@sound/shared';

// ── Helpers ──────────────────────────────────────────────────────────────────

let segIdCounter = 0;

function nextId(): string {
  return `seg_${Date.now()}_${++segIdCounter}`;
}

/**
 * Parse a timestamp string into milliseconds.
 * Supports:
 *   HH:MM:SS,mmm  (SRT format)
 *   HH:MM:SS.mmm  (VTT format)
 *   MM:SS.mmm      (VTT short format)
 */
function parseTimestamp(ts: string): number | undefined {
  // Normalize comma to dot
  const normalized = ts.trim().replace(',', '.');

  // HH:MM:SS.mmm
  const full = normalized.match(/^(\d{1,2}):(\d{2}):(\d{2})\.(\d{1,3})$/);
  if (full && full[1] && full[2] && full[3] && full[4]) {
    const h = parseInt(full[1], 10);
    const m = parseInt(full[2], 10);
    const s = parseInt(full[3], 10);
    const ms = parseInt(full[4].padEnd(3, '0'), 10);
    return h * 3600000 + m * 60000 + s * 1000 + ms;
  }

  // MM:SS.mmm (VTT short)
  const short = normalized.match(/^(\d{1,2}):(\d{2})\.(\d{1,3})$/);
  if (short && short[1] && short[2] && short[3]) {
    const m = parseInt(short[1], 10);
    const s = parseInt(short[2], 10);
    const ms = parseInt(short[3].padEnd(3, '0'), 10);
    return m * 60000 + s * 1000 + ms;
  }

  return undefined;
}

// ── SRT Parser ───────────────────────────────────────────────────────────────

/**
 * Parse SRT subtitle text into CaptionSegments.
 *
 * SRT format:
 * ```
 * 1
 * 00:00:01,000 --> 00:00:04,000
 * Hello world
 *
 * 2
 * 00:00:05,000 --> 00:00:08,000
 * Second line
 * ```
 */
export function parseSRT(text: string): CaptionSegment[] {
  const segments: CaptionSegment[] = [];
  // Split by double newline (blocks)
  const blocks = text.trim().replace(/\r\n/g, '\n').split(/\n\n+/);

  for (const block of blocks) {
    const lines = block.trim().split('\n');
    if (lines.length < 2) continue;

    // Find the timing line (contains " --> ")
    let timingIdx = -1;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i]!.includes('-->')) {
        timingIdx = i;
        break;
      }
    }

    if (timingIdx < 0) continue;

    // Parse timing
    const timingLine = lines[timingIdx]!;
    const timingParts = timingLine.split('-->').map(s => s.trim());
    const startMs = timingParts[0] ? parseTimestamp(timingParts[0]) : undefined;
    const endMs = timingParts[1] ? parseTimestamp(timingParts[1]) : undefined;

    // Text is everything after the timing line
    const segmentText = lines.slice(timingIdx + 1).join('\n').trim();
    if (!segmentText) continue;

    segments.push({
      id: nextId(),
      startMs,
      endMs,
      text: segmentText,
    });
  }

  // If parsing produced nothing, return single segment with raw text
  if (segments.length === 0 && text.trim()) {
    return [{
      id: nextId(),
      text: text.trim(),
    }];
  }

  return segments;
}

// ── VTT Parser ───────────────────────────────────────────────────────────────

/**
 * Parse WebVTT subtitle text into CaptionSegments.
 *
 * VTT format:
 * ```
 * WEBVTT
 *
 * 00:00:01.000 --> 00:00:04.000
 * Hello world
 *
 * 00:00:05.000 --> 00:00:08.000
 * Second line
 * ```
 */
export function parseVTT(text: string): CaptionSegment[] {
  const segments: CaptionSegment[] = [];
  const content = text.trim().replace(/\r\n/g, '\n');

  // Remove WEBVTT header and any header metadata
  const headerEnd = content.indexOf('\n\n');
  if (headerEnd < 0) {
    // No double newline → might be header only or malformed
    if (content.trim()) {
      return [{ id: nextId(), text: content.trim() }];
    }
    return [];
  }

  const body = content.slice(headerEnd + 2);
  const blocks = body.split(/\n\n+/);

  for (const block of blocks) {
    const lines = block.trim().split('\n');
    if (lines.length < 1) continue;

    // Find the timing line
    let timingIdx = -1;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i]!.includes('-->')) {
        timingIdx = i;
        break;
      }
    }

    if (timingIdx < 0) continue;

    // Parse timing
    const timingLine = lines[timingIdx]!;
    const timingParts = timingLine.split('-->').map(s => s.trim());
    // Remove any position/alignment metadata after timestamp
    const startPart = timingParts[0];
    const endPart = timingParts[1];
    const startStr = startPart ? startPart.split(/\s/)[0] : undefined;
    const endStr = endPart ? endPart.split(/\s/)[0] : undefined;

    const startMs = startStr ? parseTimestamp(startStr) : undefined;
    const endMs = endStr ? parseTimestamp(endStr) : undefined;

    // Text after timing line
    const segmentText = lines.slice(timingIdx + 1).join('\n').trim();
    if (!segmentText) continue;

    segments.push({
      id: nextId(),
      startMs,
      endMs,
      text: segmentText,
    });
  }

  // Fallback: raw text
  if (segments.length === 0 && text.trim()) {
    return [{ id: nextId(), text: text.trim() }];
  }

  return segments;
}

// ── Text Splitter ────────────────────────────────────────────────────────────

/**
 * Split plain text by lines into unsynced CaptionSegments.
 * Each non-empty line becomes one segment (no timing).
 */
export function splitTextToSegments(text: string): CaptionSegment[] {
  return text
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .map(line => ({
      id: nextId(),
      text: line,
    }));
}
