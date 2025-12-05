"use client"

import { useState, useEffect } from "react"
import { Volume2, VolumeX, Play, Pause } from "lucide-react"
import { cn } from "@/lib/utils"

type MusicControlsProps = {
  variant?: "footer" | "floating"
  showButton?: boolean
}

const MUSIC_SRC = "/music/prize-check-theme.mp3" // <- your audio path

export function MusicControls({
  variant = "footer",
  showButton = true,
}: MusicControlsProps) {
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [volume, setVolume] = useState(0.4)

  // create audio element once
  useEffect(() => {
    const el = new Audio(MUSIC_SRC)
    el.loop = true
    el.volume = volume
    setAudio(el)

    return () => {
      el.pause()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // sync volume
  useEffect(() => {
    if (audio) {
      audio.volume = volume
    }
  }, [audio, volume])

  const togglePlay = () => {
    if (!audio) return
    if (isPlaying) {
      audio.pause()
      setIsPlaying(false)
    } else {
      audio
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => {
          // ignore autoplay errors
        })
    }
  }

  const handleVolumeChange = (value: number) => {
    const v = value / 100
    setVolume(v)
    if (v === 0 && isPlaying) {
      // you can decide if you want to auto-pause when muted
    }
  }

  const isMuted = volume === 0

  const isFloating = variant === "floating"

  return (
    <div
      className={cn(
        "flex items-center gap-2 text-xs",
        isFloating &&
          "fixed bottom-4 right-4 z-40 rounded-full bg-slate-900/95 border border-slate-700 px-3 py-2 shadow-lg shadow-black/50",
      )}
    >
      {/* optional play / pause button */}
      {showButton && (
        <button
          type="button"
          onClick={togglePlay}
          className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-900 hover:bg-slate-200 transition"
        >
          {isPlaying ? (
            <>
              <Pause className="h-3 w-3" />
              <span>Pause</span>
            </>
          ) : (
            <>
              <Play className="h-3 w-3" />
              <span>Play Music</span>
            </>
          )}
        </button>
      )}

      {/* volume icon */}
      <button
        type="button"
        onClick={() => handleVolumeChange(isMuted ? 40 : 0)}
        className="p-1 rounded-full hover:bg-slate-800"
      >
        {isMuted ? (
          <VolumeX className="h-4 w-4 text-slate-200" />
        ) : (
          <Volume2 className="h-4 w-4 text-slate-200" />
        )}
      </button>

      {/* slider */}
      <input
        type="range"
        min={0}
        max={100}
        value={volume * 100}
        onChange={(e) => handleVolumeChange(Number(e.target.value))}
        className={cn(
          "h-1 w-24 cursor-pointer appearance-none rounded-full bg-slate-700",
          "accent-emerald-400",
        )}
      />
    </div>
  )
}
