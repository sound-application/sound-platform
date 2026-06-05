import i18n from '../i18n';
const tWrapper = (key: any, options?: any) => i18n.t(key, options) as any as string;
/**
 * Sound Platform — useAudioRecorder Hook
 * ========================================
 * Phase:   8-B (Audio Recording + Upload + Storage Attachment)
 * Updated: 2026-05-27
 *
 * React hook wrapping the browser MediaRecorder API for mic recording.
 *
 * Features:
 *   - Request mic permission only when user clicks Record
 *   - MIME type negotiation (webm;opus → webm → mp4)
 *   - Live elapsed time counter during recording
 *   - Returns audio Blob + object URL for preview
 *   - Cleanup on unmount (stop tracks, revoke URLs)
 *   - Permission denied handling
 */

import { useState, useRef, useCallback, useEffect } from 'react';

// ── Types ──────────────────────────────────────────────────────────────────────

export type RecorderState =
  | 'idle'
  | 'requesting'
  | 'recording'
  | 'stopped'
  | 'error';

export interface AudioRecorderResult {
  state: RecorderState;
  /** Elapsed recording time in milliseconds */
  elapsedMs: number;
  /** Recorded audio blob (available after stop) */
  audioBlob: Blob | null;
  /** Object URL for audio preview (available after stop) */
  audioUrl: string | null;
  /** MIME type used for recording */
  mimeType: string | null;
  /** Error message if state is 'error' */
  errorMessage: string | null;
  /** Start recording — requests mic permission */
  startRecording: () => void;
  /** Stop recording */
  stopRecording: () => void;
  /** Reset to idle state */
  reset: () => void;
}

// ── MIME negotiation ──────────────────────────────────────────────────────────

const PREFERRED_MIMES = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/mp4',
  'audio/ogg;codecs=opus',
];

function getSupportedMime(): string | null {
  if (typeof MediaRecorder === 'undefined') return null;
  for (const mime of PREFERRED_MIMES) {
    if (MediaRecorder.isTypeSupported(mime)) return mime;
  }
  return null;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useAudioRecorder(): AudioRecorderResult {
  const [state, setState] = useState<RecorderState>('idle');
  const [elapsedMs, setElapsedMs] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);

  // ── Cleanup on unmount ──────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      // Stop any ongoing recording
      if (recorderRef.current && recorderRef.current.state !== 'inactive') {
        recorderRef.current.stop();
      }
      // Stop all mic tracks
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      // Clear timer
      if (timerRef.current) clearInterval(timerRef.current);
      // Revoke object URL
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Start recording ─────────────────────────────────────────────────────────
  const startRecording = useCallback(async () => {
    try {
      setState('requesting');
      setErrorMessage(null);

      // Check MediaRecorder support
      const mime = getSupportedMime();
      if (!mime) {
        setState('error');
        setErrorMessage(tWrapper('useaudiorecorder:yourBrowserDoesNot'));
        return;
      }

      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      setMimeType(mime);

      // Create recorder
      const recorder = new MediaRecorder(stream, { mimeType: mime });
      recorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e: BlobEvent) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mime });
        setAudioBlob(blob);
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        setState('stopped');

        // Stop timer
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }

        // Stop mic tracks
        stream.getTracks().forEach((t) => t.stop());
      };

      // Start recording
      recorder.start(250); // collect data every 250ms
      startTimeRef.current = Date.now();
      setState('recording');

      // Start elapsed timer
      timerRef.current = setInterval(() => {
        setElapsedMs(Date.now() - startTimeRef.current);
      }, 100);
    } catch (err: unknown) {
      setState('error');
      if (err instanceof DOMException && err.name === 'NotAllowedError') {
        setErrorMessage(tWrapper('useaudiorecorder:microphonePermissionDeniedPlease'));
      } else if (err instanceof DOMException && err.name === 'NotFoundError') {
        setErrorMessage(tWrapper('useaudiorecorder:noMicrophoneFoundMake'));
      } else {
        setErrorMessage(tWrapper('useaudiorecorder:anErrorOccurredWhile'));
      }
    }
  }, []);

  // ── Stop recording ──────────────────────────────────────────────────────────
  const stopRecording = useCallback(() => {
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      recorderRef.current.stop();
    }
  }, []);

  // ── Reset ───────────────────────────────────────────────────────────────────
  const reset = useCallback(() => {
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      recorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (audioUrl) URL.revokeObjectURL(audioUrl);

    setState('idle');
    setElapsedMs(0);
    setAudioBlob(null);
    setAudioUrl(null);
    setMimeType(null);
    setErrorMessage(null);
    chunksRef.current = [];
  }, [audioUrl]);

  return {
    state,
    elapsedMs,
    audioBlob,
    audioUrl,
    mimeType,
    errorMessage,
    startRecording,
    stopRecording,
    reset,
  };
}
