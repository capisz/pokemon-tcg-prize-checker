"use client";

import { useRef, useState, useEffect } from "react";

const INITIAL_VOLUME = 0.4;

export function MusicControls() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(INITIAL_VOLUME);

  // Try to autoplay once on mount,
  // and fall back to "play on first click anywhere"
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.volume = INITIAL_VOLUME;

    const tryPlay = async () => {
      try {
        await audio.play();
        setIsPlaying(true);
      } catch {
        // Autoplay blocked — we'll start on first user interaction
        // (browser policy thing)
      }
    };

    // Try immediately
    tryPlay();

    // Then try again on first click anywhere on the page
    const handleFirstInteraction = () => {
      tryPlay();
      document.removeEventListener("click", handleFirstInteraction);
    };

    document.addEventListener("click", handleFirstInteraction);

    return () => {
      document.removeEventListener("click", handleFirstInteraction);
    };
  }, []);

  const togglePlay = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      try {
        audio.volume = volume;
        await audio.play();
        setIsPlaying(true);
      } catch (err) {
        console.error("Could not start audio", err);
      }
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number(e.target.value);
    setVolume(value);
    if (audioRef.current) {
      audioRef.current.volume = value;
    }
  };

  return (
    <div className="flex items-center gap-2 text-xs text-slate-200">
      <button
        type="button"
        onClick={togglePlay}
        className="rounded-full bg-slate-800/60 px-3 py-1 hover:bg-slate-700/80"
      >
        {isPlaying ? "Pause Music" : "Play Music"}
      </button>

      <div className="flex items-center gap-1">
        <span className="text-[10px] text-slate-400">Vol</span>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={volume}
          onChange={handleVolumeChange}
          className="h-1 w-20 cursor-pointer"
        />
      </div>

      {/* This audio tag is the single global player */}
      <audio ref={audioRef} src="/audio/bg-music.mp3" loop />
    </div>
  );
}
