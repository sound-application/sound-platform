/**
 * Sound Platform — useAudioUpload Hook
 * ======================================
 * Phase:   8-B (Audio Recording + Upload + Storage Attachment)
 * Updated: 2026-05-27
 *
 * React hook wrapping Firebase Storage resumable upload.
 *
 * Features:
 *   - Uploads to audioUploads/{uid}/{draftId}/original/{fileName}
 *   - Resumable upload with progress tracking (0-100)
 *   - Cancel support
 *   - Returns storagePath after successful upload
 *   - Cleanup on unmount
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { ref, uploadBytesResumable } from 'firebase/storage';
import type { UploadTask } from 'firebase/storage';
import { storage } from '../lib/firebase';

// ── Types ──────────────────────────────────────────────────────────────────────

export type UploadState = 'idle' | 'uploading' | 'done' | 'error' | 'cancelled';

export interface AudioUploadResult {
  state: UploadState;
  /** Upload progress percentage (0-100) */
  progress: number;
  /** Storage path after successful upload */
  storagePath: string | null;
  /** Error message if state is 'error' */
  errorMessage: string | null;
  /** Start upload */
  uploadAudio: (
    blob: Blob,
    uid: string,
    draftId: string,
    fileName: string,
    mimeType: string,
  ) => void;
  /** Cancel in-progress upload */
  cancel: () => void;
  /** Reset to idle state */
  reset: () => void;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useAudioUpload(): AudioUploadResult {
  const [state, setState] = useState<UploadState>('idle');
  const [progress, setProgress] = useState(0);
  const [storagePath, setStoragePath] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const taskRef = useRef<UploadTask | null>(null);

  // ── Cleanup on unmount ──────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (taskRef.current) {
        taskRef.current.cancel();
      }
    };
  }, []);

  // ── Upload function ────────────────────────────────────────────────────────
  const uploadAudio = useCallback(
    (blob: Blob, uid: string, draftId: string, fileName: string, mimeType: string) => {
      // Build storage path: audioUploads/{uid}/{draftId}/original/{fileName}
      const path = `audioUploads/${uid}/${draftId}/original/${fileName}`;
      const storageRef = ref(storage, path);

      setState('uploading');
      setProgress(0);
      setErrorMessage(null);
      setStoragePath(null);

      const uploadTask = uploadBytesResumable(storageRef, blob, {
        contentType: mimeType,
        customMetadata: {
          uploadedBy: uid,
          draftId,
          originalFileName: fileName,
        },
      });

      taskRef.current = uploadTask;

      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const pct = Math.round(
            (snapshot.bytesTransferred / snapshot.totalBytes) * 100,
          );
          setProgress(pct);
        },
        (error) => {
          if (error.code === 'storage/canceled') {
            setState('cancelled');
            setErrorMessage('تم إلغاء الرفع.');
          } else {
            setState('error');
            setErrorMessage(
              error.message || 'حدث خطأ أثناء رفع الملف الصوتي.',
            );
          }
          taskRef.current = null;
        },
        () => {
          // Upload complete
          setState('done');
          setProgress(100);
          setStoragePath(path);
          taskRef.current = null;
        },
      );
    },
    [],
  );

  // ── Cancel ──────────────────────────────────────────────────────────────────
  const cancel = useCallback(() => {
    if (taskRef.current) {
      taskRef.current.cancel();
    }
  }, []);

  // ── Reset ───────────────────────────────────────────────────────────────────
  const reset = useCallback(() => {
    if (taskRef.current) {
      taskRef.current.cancel();
    }
    setState('idle');
    setProgress(0);
    setStoragePath(null);
    setErrorMessage(null);
    taskRef.current = null;
  }, []);

  return {
    state,
    progress,
    storagePath,
    errorMessage,
    uploadAudio,
    cancel,
    reset,
  };
}
