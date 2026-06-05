import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react';

export type PlayerState = 'idle' | 'loading' | 'ready' | 'playing' | 'paused' | 'buffering' | 'ended' | 'error';

export interface Track {
  id: string;
  title: string;
  coverUrl?: string;
  authorName: string;
  playbackUrl: string;
}

interface PlayerContextValue {
  currentTrack: Track | null;
  queue: Track[];
  playerState: PlayerState;
  currentTime: number;
  duration: number;
  
  playTrack: (track: Track, queueList?: Track[]) => void;
  togglePlay: () => void;
  seek: (ms: number) => void;
  closePlayer: () => void;
  nextTrack: () => void;
  prevTrack: () => void;
}

const PlayerContext = createContext<PlayerContextValue | null>(null);

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [queue, setQueue] = useState<Track[]>([]);
  const [playerState, setPlayerState] = useState<PlayerState>('idle');
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize audio element once
  useEffect(() => {
    const audio = new Audio();
    audio.preload = 'metadata';
    audioRef.current = audio;

    const onLoadedMetadata = () => {
      setDuration(audio.duration * 1000);
      setPlayerState('ready');
      // Auto-play when metadata loads if we just set a new track
      audio.play().catch(() => {
        // Browser autoplay policy might block this
        setPlayerState('paused');
      });
    };
    
    const onTimeUpdate = () => setCurrentTime(audio.currentTime * 1000);
    const onPlaying = () => setPlayerState('playing');
    const onPause = () => { if (!audio.ended) setPlayerState('paused'); };
    const onWaiting = () => setPlayerState('buffering');
    const onEnded = () => {
      setPlayerState('ended');
      setCurrentTime(audio.duration * 1000);
      // Auto-play next if queue exists
      handleNext();
    };
    const onError = () => setPlayerState('error');

    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('playing', onPlaying);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('waiting', onWaiting);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('error', onError);

    return () => {
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('playing', onPlaying);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('waiting', onWaiting);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('error', onError);
      audio.pause();
      audio.src = '';
    };
  }, []); // Empty dependency array, set up once. We use ref for callbacks if needed.

  // NOTE: handleNext is referenced in the effect above, but the effect runs once.
  // To allow the effect to read the *latest* queue, we must use a mutable ref for the queue.
  const queueRef = useRef<{ queue: Track[], currentTrack: Track | null }>({ queue: [], currentTrack: null });
  useEffect(() => {
    queueRef.current = { queue, currentTrack };
  }, [queue, currentTrack]);

  const handleNext = useCallback(() => {
    const { queue, currentTrack } = queueRef.current;
    if (!currentTrack || queue.length === 0) return;
    
    const idx = queue.findIndex(t => t.id === currentTrack.id);
    if (idx !== -1 && idx < queue.length - 1) {
      playTrack(queue[idx + 1]!, queue);
    }
  }, []);

  const handlePrev = useCallback(() => {
    const { queue, currentTrack } = queueRef.current;
    if (!currentTrack || queue.length === 0) return;
    
    const idx = queue.findIndex(t => t.id === currentTrack.id);
    if (idx > 0) {
      playTrack(queue[idx - 1]!, queue);
    } else if (audioRef.current) {
      // If first track, just restart
      audioRef.current.currentTime = 0;
    }
  }, []);

  const playTrack = useCallback((track: Track, queueList?: Track[]) => {
    const audio = audioRef.current;
    if (!audio) return;

    if (currentTrack?.id === track.id) {
      // If it's the exact same track, just toggle play
      if (audio.paused || playerState === 'ended') {
        audio.play();
      }
      return;
    }

    setCurrentTrack(track);
    if (queueList) setQueue(queueList);
    setPlayerState('loading');
    setCurrentTime(0);
    setDuration(0);
    
    audio.src = track.playbackUrl;
    audio.load();
    // loadedmetadata event will trigger audio.play()
  }, [currentTrack?.id, playerState]);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playerState === 'ended') {
      audio.currentTime = 0;
      audio.play();
    } else if (audio.paused) {
      audio.play();
    } else {
      audio.pause();
    }
  }, [playerState]);

  const seek = useCallback((ms: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = ms / 1000;
  }, []);

  const closePlayer = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.src = '';
    }
    setCurrentTrack(null);
    setQueue([]);
    setPlayerState('idle');
  }, []);

  return (
    <PlayerContext.Provider
      value={{
        currentTrack,
        queue,
        playerState,
        currentTime,
        duration,
        playTrack,
        togglePlay,
        seek,
        closePlayer,
        nextTrack: handleNext,
        prevTrack: handlePrev,
      }}
    >
      {children}
    </PlayerContext.Provider>
  );
}

export function usePlayer() {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error('usePlayer must be used within PlayerProvider');
  return ctx;
}
