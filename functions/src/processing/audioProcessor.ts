/**
 * Sound Platform — audioProcessor
 * ================================
 * Phase:   8-F (Real Audio Processing Worker)
 * Created: 2026-05-28
 * Updated: 2026-05-28 — fix probeAudio stderr parsing
 *
 * Wraps FFmpeg via child_process.spawn using the ffmpeg-static binary.
 * No fluent-ffmpeg — explicit command args for full control and logging.
 *
 * Exports:
 *   - probeAudio(inputPath)      → AudioProbeResult
 *   - transcodeToAAC(inputPath, outputPath) → TranscodeResult
 *   - extractWaveformPeaks(inputPath, pointsCount) → number[]
 *
 * All functions use os.tmpdir() for temp files.
 * Caller is responsible for cleanup.
 */

import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as logger from 'firebase-functions/logger';

// ── FFmpeg binary path from ffmpeg-static ────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-var-requires
const ffmpegPath: string = require('ffmpeg-static');

// ── Types ────────────────────────────────────────────────────────────────────

export interface AudioProbeResult {
  durationMs: number;
  codec: string;
  sampleRate: number;
  channels: number;
  bitrate: number; // kbps
  formatName: string;
}

export interface TranscodeResult {
  outputPath: string;
  mimeType: string;
  sizeBytes: number;
  durationMs: number;
  bitrate: number;
  codec: string;
  loudnessLufs?: number;
}

// ── Helper: run FFmpeg as child process (strict — rejects on non-zero) ───────

function runFFmpeg(args: string[]): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    logger.info('[audioProcessor] FFmpeg command:', {
      binary: path.basename(ffmpegPath),
      args: args.map(a => a.startsWith('/tmp') ? '/tmp/***' : a),
    });

    const proc = spawn(ffmpegPath, args, { stdio: ['pipe', 'pipe', 'pipe'] });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (chunk: Buffer) => { stdout += chunk.toString(); });
    proc.stderr.on('data', (chunk: Buffer) => { stderr += chunk.toString(); });

    proc.on('close', (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        const safeStderr = stderr.slice(0, 2000);
        reject(new Error(`FFmpeg exited with code ${code}: ${safeStderr}`));
      }
    });

    proc.on('error', (err) => {
      reject(new Error(`FFmpeg spawn error: ${err.message}`));
    });
  });
}

// ── Helper: run FFmpeg and return stdout/stderr regardless of exit code ──────
// Used by probeAudio where ffmpeg always exits non-zero.

function runFFmpegRaw(args: string[]): Promise<{ stdout: string; stderr: string; exitCode: number | null }> {
  return new Promise((resolve, reject) => {
    logger.info('[audioProcessor] FFmpeg probe command:', {
      binary: path.basename(ffmpegPath),
      args: args.map(a => a.startsWith('/tmp') ? '/tmp/***' : a),
    });

    const proc = spawn(ffmpegPath, args, { stdio: ['pipe', 'pipe', 'pipe'] });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (chunk: Buffer) => { stdout += chunk.toString(); });
    proc.stderr.on('data', (chunk: Buffer) => { stderr += chunk.toString(); });

    proc.on('close', (code) => {
      resolve({ stdout, stderr, exitCode: code });
    });

    proc.on('error', (err) => {
      reject(new Error(`FFmpeg spawn error: ${err.message}`));
    });
  });
}

// ── probeAudio ───────────────────────────────────────────────────────────────
/**
 * Extract audio metadata using `ffmpeg -i <file>` (no output).
 *
 * ffmpeg-static only ships ffmpeg, not ffprobe.
 * `ffmpeg -i <file>` with no output always exits code 1 but prints
 * all container/stream metadata to stderr. We parse that stderr.
 *
 * IMPORTANT: Do NOT use `-f null -` — that makes FFmpeg actually decode
 * the file and may exit 0, returning no metadata in the catch path.
 */
export async function probeAudio(inputPath: string): Promise<AudioProbeResult> {
  // ffmpeg -i <file> — always exits 1, prints metadata to stderr
  const { stderr, exitCode } = await runFFmpegRaw(['-i', inputPath]);

  logger.info('[audioProcessor] Probe stderr length:', {
    stderrLength: stderr.length,
    exitCode,
    stderrPreview: stderr.slice(0, 500),
  });

  // Extract duration: "Duration: HH:MM:SS.cc"
  const durMatch = stderr.match(/Duration:\s*(\d+):(\d+):(\d+)\.(\d+)/);
  if (!durMatch) {
    throw new Error(`Cannot probe audio: no duration found in FFmpeg output. stderr=${stderr.slice(0, 500)}`);
  }

  const hours = parseInt(durMatch[1]!, 10);
  const minutes = parseInt(durMatch[2]!, 10);
  const seconds = parseInt(durMatch[3]!, 10);
  const centiseconds = parseInt(durMatch[4]!, 10);
  const durationMs = ((hours * 3600 + minutes * 60 + seconds) * 1000) + (centiseconds * 10);

  // Extract codec: "Audio: mp3" or "Audio: aac" or "Audio: pcm_s16le"
  const codecMatch = stderr.match(/Audio:\s*(\w+)/);
  const codec = codecMatch ? codecMatch[1]! : 'unknown';

  // Extract sample rate: "44100 Hz"
  const srMatch = stderr.match(/(\d+)\s*Hz/);
  const sampleRate = srMatch ? parseInt(srMatch[1]!, 10) : 44100;

  // Extract channels: "stereo" = 2, "mono" = 1, "5.1" etc
  const channels = stderr.includes('stereo') ? 2 : stderr.includes('mono') ? 1 : 2;

  // Extract bitrate: "bitrate: 128 kb/s" (container level)
  const brMatch = stderr.match(/bitrate:\s*(\d+)\s*kb/);
  const bitrate = brMatch ? parseInt(brMatch[1]!, 10) : 0;

  // Extract format: "Input #0, mp3," or "Input #0, mp4,"
  const fmtMatch = stderr.match(/Input\s*#\d+,\s*(\w+)/);
  const formatName = fmtMatch ? fmtMatch[1]! : 'unknown';

  const result = { durationMs, codec, sampleRate, channels, bitrate, formatName };
  logger.info('[audioProcessor] Probe result:', result);

  return result;
}

// ── transcodeToAAC ───────────────────────────────────────────────────────────
/**
 * Transcode input audio to AAC in M4A container.
 * - 128 kbps CBR
 * - 44100 Hz sample rate
 * - Stereo (passthrough)
 * - loudnorm filter applied (best-effort — if filter unavailable, skip)
 */
export async function transcodeToAAC(
  inputPath: string,
  outputPath: string,
): Promise<TranscodeResult> {
  const baseArgs = [
    '-y',                    // overwrite output
    '-i', inputPath,         // input
    '-vn',                   // no video
    '-ar', '44100',          // sample rate
    '-ac', '2',              // stereo
    '-b:a', '128k',          // bitrate
    '-c:a', 'aac',           // codec
    '-movflags', '+faststart', // streaming-friendly
  ];

  let loudnessLufs: number | undefined;

  try {
    // Try with loudnorm
    const loudnormArgs = [
      ...baseArgs,
      '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11:print_format=json',
      outputPath,
    ];
    const { stderr } = await runFFmpeg(loudnormArgs);

    // Parse loudnorm output for integrated loudness
    const lufsMatch = stderr.match(/"input_i"\s*:\s*"(-?\d+\.?\d*)"/);
    if (lufsMatch) {
      loudnessLufs = parseFloat(lufsMatch[1]!);
    }

    logger.info('[audioProcessor] Transcode with loudnorm succeeded.', { loudnessLufs });
  } catch (loudnormErr) {
    // loudnorm failed — retry without it
    logger.warn('[audioProcessor] loudnorm filter failed, retrying without normalization.', {
      error: loudnormErr instanceof Error ? loudnormErr.message.slice(0, 300) : String(loudnormErr),
    });

    const fallbackArgs = [...baseArgs, outputPath];
    await runFFmpeg(fallbackArgs);
    logger.info('[audioProcessor] Transcode without loudnorm succeeded.');
  }

  // Get output file stats
  const stat = fs.statSync(outputPath);
  const sizeBytes = stat.size;

  // Probe the output for real duration
  const probe = await probeAudio(outputPath);

  return {
    outputPath,
    mimeType: 'audio/mp4',
    sizeBytes,
    durationMs: probe.durationMs,
    bitrate: 128,
    codec: 'aac',
    loudnessLufs,
  };
}

// ── extractWaveformPeaks ─────────────────────────────────────────────────────
/**
 * Extract real waveform peaks from audio file.
 *
 * Strategy:
 * 1. Decode to raw PCM (signed 16-bit LE, mono, 8000 Hz) via FFmpeg
 * 2. Read the raw PCM buffer
 * 3. Divide samples into `pointsCount` buckets
 * 4. Find the max absolute amplitude in each bucket
 * 5. Normalize to 0.0–1.0 range
 *
 * Uses a temp file for the raw PCM output, not streaming,
 * to avoid memory pressure from large files.
 */
export async function extractWaveformPeaks(
  inputPath: string,
  pointsCount: number = 200,
): Promise<number[]> {
  const pcmPath = inputPath + '.pcm';

  try {
    // Decode to raw PCM: mono, 8000 Hz, signed 16-bit LE
    await runFFmpeg([
      '-y',
      '-i', inputPath,
      '-vn',
      '-ac', '1',             // mono
      '-ar', '8000',           // 8kHz — enough for waveform
      '-f', 's16le',           // raw signed 16-bit LE
      '-acodec', 'pcm_s16le',
      pcmPath,
    ]);

    // Read the raw PCM buffer
    const buffer = fs.readFileSync(pcmPath);
    const sampleCount = buffer.length / 2; // 16-bit = 2 bytes per sample

    if (sampleCount === 0) {
      logger.warn('[audioProcessor] PCM buffer is empty — returning flat waveform.');
      return new Array(pointsCount).fill(0.1);
    }

    // Divide into buckets
    const samplesPerBucket = Math.max(1, Math.floor(sampleCount / pointsCount));
    const peaks: number[] = [];
    let globalMax = 0;

    for (let i = 0; i < pointsCount; i++) {
      const start = i * samplesPerBucket;
      const end = Math.min(start + samplesPerBucket, sampleCount);
      let bucketMax = 0;

      for (let j = start; j < end; j++) {
        const sample = Math.abs(buffer.readInt16LE(j * 2));
        if (sample > bucketMax) bucketMax = sample;
      }

      peaks.push(bucketMax);
      if (bucketMax > globalMax) globalMax = bucketMax;
    }

    // Normalize to 0.0–1.0
    if (globalMax === 0) {
      return new Array(pointsCount).fill(0.05);
    }

    const normalized = peaks.map(p => {
      const v = p / globalMax;
      return Math.round(v * 1000) / 1000; // 3 decimal places
    });

    logger.info('[audioProcessor] Waveform extracted.', {
      sampleCount,
      pointsCount: normalized.length,
      globalMaxSample: globalMax,
    });

    return normalized;
  } finally {
    // Clean up PCM temp file
    try { fs.unlinkSync(pcmPath); } catch { /* ignore */ }
  }
}

// ── transcodeWithEffects (Phase 8-J) ─────────────────────────────────────────
/**
 * Transcode input audio to AAC with an effects filter chain applied.
 *
 * Non-destructive: operates on a copy, original upload untouched.
 * If effects chain fails, falls back to base transcode (no effects).
 *
 * @returns TranscodeResult + appliedFilters/skippedFilters tracking
 */
export interface TranscodeWithEffectsResult extends TranscodeResult {
  /** Whether effects were successfully applied */
  effectsApplied: boolean;
  /** Filter IDs that were actually applied */
  appliedFilters: string[];
  /** Filter IDs that were skipped due to failure */
  skippedFilters: string[];
  /** Error message if effects failed entirely */
  effectsError?: string;
}

export async function transcodeWithEffects(
  inputPath: string,
  outputPath: string,
  effectsChain: string,
  requestedFilterIds: string[],
): Promise<TranscodeWithEffectsResult> {
  const baseArgs = [
    '-y',                    // overwrite output
    '-i', inputPath,         // input
    '-vn',                   // no video
    '-ar', '44100',          // sample rate
    '-ac', '2',              // stereo
    '-b:a', '128k',          // bitrate
    '-c:a', 'aac',           // codec
    '-movflags', '+faststart', // streaming-friendly
  ];

  let loudnessLufs: number | undefined;
  let effectsApplied = false;
  let appliedFilters: string[] = [];
  let skippedFilters: string[] = [];
  let effectsError: string | undefined;

  try {
    // Try with full effects chain
    const effectsArgs = [
      ...baseArgs,
      '-af', effectsChain,
      outputPath,
    ];

    logger.info('[audioProcessor] Transcoding with effects chain.', {
      chain: effectsChain.slice(0, 500),
      filterCount: requestedFilterIds.length,
    });

    const { stderr } = await runFFmpeg(effectsArgs);

    // Parse loudnorm output if present
    const lufsMatch = stderr.match(/"input_i"\s*:\s*"(-?\d+\.?\d*)"/);
    if (lufsMatch) {
      loudnessLufs = parseFloat(lufsMatch[1]!);
    }

    effectsApplied = true;
    appliedFilters = [...requestedFilterIds];
    logger.info('[audioProcessor] Transcode with effects succeeded.', {
      loudnessLufs,
      appliedFilters,
    });
  } catch (effectsErr) {
    // Effects chain failed — fall back to base transcode
    const errMsg = effectsErr instanceof Error ? effectsErr.message : String(effectsErr);
    effectsError = errMsg.slice(0, 300);
    skippedFilters = [...requestedFilterIds];

    logger.warn('[audioProcessor] Effects chain failed, falling back to base transcode.', {
      error: effectsError,
      skippedFilters,
    });

    // Retry base loudnorm transcode (same as transcodeToAAC)
    try {
      const loudnormArgs = [
        ...baseArgs,
        '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11:print_format=json',
        outputPath,
      ];
      const { stderr } = await runFFmpeg(loudnormArgs);
      const lufsMatch = stderr.match(/"input_i"\s*:\s*"(-?\d+\.?\d*)"/);
      if (lufsMatch) loudnessLufs = parseFloat(lufsMatch[1]!);
      logger.info('[audioProcessor] Fallback transcode with loudnorm succeeded.');
    } catch {
      // Even loudnorm failed — bare transcode
      logger.warn('[audioProcessor] Loudnorm failed, retrying bare transcode.');
      const fallbackArgs = [...baseArgs, outputPath];
      await runFFmpeg(fallbackArgs);
      logger.info('[audioProcessor] Bare fallback transcode succeeded.');
    }
  }

  // Get output file stats
  const stat = fs.statSync(outputPath);
  const sizeBytes = stat.size;
  const probe = await probeAudio(outputPath);

  return {
    outputPath,
    mimeType: 'audio/mp4',
    sizeBytes,
    durationMs: probe.durationMs,
    bitrate: 128,
    codec: 'aac',
    loudnessLufs,
    effectsApplied,
    appliedFilters,
    skippedFilters,
    effectsError,
  };
}

// ── Phase 8-K: Mixing Master Adjustments ─────────────────────────────────────

export interface MixingMasterResult {
  mixApplied: boolean;
  appliedOperations: string[];
  error?: string;
}

/**
 * Apply voice-only mixing master adjustments (volume, gain, fade in/out)
 * to the already-transcoded master file.
 *
 * This re-encodes the master with the mixing filter chain.
 * If no renderable ops exist, returns immediately without touching the file.
 * If FFmpeg fails, returns error without destroying the input file.
 */
export async function applyMixingMaster(
  masterPath: string,
  filterChain: string,
  operationLabels: string[],
): Promise<MixingMasterResult> {
  // Create temp output path
  const tmpMixed = masterPath.replace(/\.m4a$/, '_mixed.m4a');

  try {
    logger.info('[audioProcessor] Applying mixing master adjustments.', {
      chain: filterChain,
      operations: operationLabels,
    });

    const args = [
      '-y', '-i', masterPath,
      '-vn', '-ar', '44100', '-ac', '2',
      '-b:a', '128k', '-c:a', 'aac',
      '-movflags', '+faststart',
      '-af', filterChain,
      tmpMixed,
    ];

    await runFFmpeg(args);

    // Verify output exists and is non-empty
    const stat = fs.statSync(tmpMixed);
    if (stat.size === 0) {
      throw new Error('Mixing output is empty');
    }

    // Replace original master with mixed version
    fs.copyFileSync(tmpMixed, masterPath);
    fs.unlinkSync(tmpMixed);

    logger.info('[audioProcessor] Mixing master adjustments applied.', {
      appliedOperations: operationLabels,
      sizeBytes: stat.size,
    });

    return { mixApplied: true, appliedOperations: operationLabels };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.warn('[audioProcessor] Mixing master adjustments failed, keeping original master.', {
      error: msg,
    });
    // Clean up temp file if it exists
    try { if (fs.existsSync(tmpMixed)) fs.unlinkSync(tmpMixed); } catch { /* ignore */ }
    return { mixApplied: false, appliedOperations: [], error: msg };
  }
}
