/**
 * Sound Platform — Audio Duration Extraction
 * ============================================
 * Phase:   8-B (Audio Recording + Upload + Storage Attachment)
 * Updated: 2026-05-27
 *
 * Extracts audio duration from a Blob using an HTMLAudioElement.
 * Works in all modern browsers. Returns duration in milliseconds.
 */

/**
 * extractAudioDuration — reads the duration of an audio Blob.
 *
 * Creates a temporary <audio> element, loads the blob via Object URL,
 * reads duration on loadedmetadata, cleans up.
 *
 * @param blob - Audio Blob (from recording or file input)
 * @returns Duration in milliseconds
 * @throws Error if duration cannot be determined
 */
export function extractAudioDuration(blob: Blob): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const audio = new Audio();

    const cleanup = () => {
      audio.removeEventListener('loadedmetadata', onLoaded);
      audio.removeEventListener('error', onError);
      audio.src = '';
      URL.revokeObjectURL(url);
    };

    const onLoaded = () => {
      const durationMs = Math.round(audio.duration * 1000);
      cleanup();
      if (isFinite(durationMs) && durationMs > 0) {
        resolve(durationMs);
      } else {
        // Some browsers return Infinity for webm — try workaround
        reject(new Error('Could not determine audio duration.'));
      }
    };

    const onError = () => {
      cleanup();
      reject(new Error('Failed to load audio for duration extraction.'));
    };

    audio.addEventListener('loadedmetadata', onLoaded);
    audio.addEventListener('error', onError);
    audio.preload = 'metadata';
    audio.src = url;
  });
}

/**
 * formatDuration — formats milliseconds to MM:SS or HH:MM:SS.
 */
export function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (n: number) => n.toString().padStart(2, '0');

  if (hours > 0) {
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  }
  return `${pad(minutes)}:${pad(seconds)}`;
}

/**
 * formatFileSize — formats bytes to human-readable string.
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
