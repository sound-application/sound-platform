/**
 * Sound Platform — audioProcessor
 * ================================
 * Phase:   8-F (Real Audio Processing Worker)
 * Created: 2026-05-28
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

// ── Helper: run FFmpeg/ffprobe as child process ──────────────────────────────

function runFFmpeg(args: string[]): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    // Log command args (safe — no signed URLs or secrets in local file paths)
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
        const safeStderr = stderr.slice(0, 2000); // truncate for logging
        reject(new Error(`FFmpeg exited with code ${code}: ${safeStderr}`));
      }
    });

    proc.on('error', (err) => {
      reject(new Error(`FFmpeg spawn error: ${err.message}`));
    });
  });
}

// ── probeAudio ───────────────────────────────────────────────────────────────
/**
 * Uses ffprobe (via ffmpeg -i) to extract audio metadata.
 * ffmpeg-static only ships ffmpeg, not ffprobe, so we parse
 * the stderr output from `ffmpeg -i <file> -f null -`.
 */
export async function probeAudio(inputPath: string): Promise<AudioProbeResult> {
  try {
    await runFFmpeg(['-i', inputPath, '-f', 'null', '-']);
  } catch (err) {
    // ffmpeg -i with -f null always exits non-zero for probe.
    // We parse the stderr for metadata. Re-throw only if truly broken.
    const msg = err instanceof Error ? err.message : String(err);

    // Extract duration: "Duration: HH:MM:SS.ms"
    const durMatch = msg.match(/Duration:\s*(\d+):(\d+):(\d+)\.(\d+)/);
    if (!durMatch) {
      throw new Error(`Cannot probe audio: no duration found. ${msg.slice(0, 500)}`);
    }

    const hours = parseInt(durMatch[1]!, 10);
    const minutes = parseInt(durMatch[2]!, 10);
    const seconds = parseInt(durMatch[3]!, 10);
    const centiseconds = parseInt(durMatch[4]!, 10);
    const durationMs = ((hours * 3600 + minutes * 60 + seconds) * 1000) + (centiseconds * 10);

    // Extract codec: "Audio: aac" or "Audio: pcm_s16le"
    const codecMatch = msg.match(/Audio:\s*(\w+)/);
    const codec = codecMatch ? codecMatch[1]! : 'unknown';

    // Extract sample rate: "44100 Hz"
    const srMatch = msg.match(/(\d+)\s*Hz/);
    const sampleRate = srMatch ? parseInt(srMatch[1]!, 10) : 44100;

    // Extract channels: "stereo" = 2, "mono" = 1
    const channels = msg.includes('stereo') ? 2 : msg.includes('mono') ? 1 : 2;

    // Extract bitrate: "bitrate: 128 kb/s" or from stream
    const brMatch = msg.match(/bitrate:\s*(\d+)\s*kb/);
    const bitrate = brMatch ? parseInt(brMatch[1]!, 10) : 0;

    // Extract format: "Input #0, mp3," or "Input #0, wav,"
    const fmtMatch = msg.match(/Input\s*#\d+,\s*(\w+)/);
    const formatName = fmtMatch ? fmtMatch[1]! : 'unknown';

    return { durationMs, codec, sampleRate, channels, bitrate, formatName };
  }

  // If somehow ffmpeg exits 0 for probe, return defaults
  return { durationMs: 0, codec: 'unknown', sampleRate: 44100, channels: 2, bitrate: 0, formatName: 'unknown' };
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
  // First attempt: with loudnorm filter
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
