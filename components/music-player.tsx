"use client"

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type ChangeEvent,
} from "react"
import { Volume2, VolumeX, Pause, Play } from "lucide-react"

type MusicContextValue = {
  volume: number
  muted: boolean
  playing: boolean
  setVolume: (v: number) => void
  toggleMute: () => void
  togglePlay: () => void
}

const MusicContext = createContext<MusicContextValue | null>(null)

// Make sure this file exists at public/audio/bg-music.mp3
const MUSIC_SRC = "/audio/bg-music.mp3"

export function MusicProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [playing, setPlaying] = useState(false)
  const [volume, setVolumeState] = useState(0.35)
  const [muted, setMuted] = useState(false)

  // Initial setup + first autoplay attempt
  useEffect(() => {
    const el = audioRef.current
    if (!el) return

    el.loop = true
    el.volume = volume

    el
      .play()
      .then(() => {
        setPlaying(true)
      })
      .catch(() => {
        // Autoplay blocked; we'll try again on first interaction
        setPlaying(false)
      })
  }, [])

  // Fallback: start playing on first user interaction (any click/tap)
  useEffect(() => {
    const handleFirstInteraction = () => {
      const el = audioRef.current
      if (!el) return

      el
        .play()
        .then(() => setPlaying(true))
        .catch(() => {
          // If still blocked, no crash – user can try again
        })
    }

    window.addEventListener("pointerdown", handleFirstInteraction, {
      once: true,
    })

    return () => {
      window.removeEventListener("pointerdown", handleFirstInteraction)
    }
  }, [])

  const setVolume = (v: number) => {
    const clamped = Math.max(0, Math.min(1, v))
    setVolumeState(clamped)
    if (audioRef.current) {
      audioRef.current.volume = clamped
      if (clamped === 0) {
        setMuted(true)
        audioRef.current.muted = true
      } else {
        setMuted(false)
        audioRef.current.muted = false
      }
    }
  }

  const toggleMute = () => {
    setMuted((prev) => {
      const next = !prev
      if (audioRef.current) {
        audioRef.current.muted = next
      }
      return next
    })
  }

  const togglePlay = () => {
    const el = audioRef.current
    if (!el) return

    if (playing) {
      el.pause()
      setPlaying(false)
    } else {
      el
        .play()
        .then(() => setPlaying(true))
        .catch(() => {
          // Still blocked, but that's fine – no crash
        })
    }
  }

  return (
    <MusicContext.Provider
      value={{
        volume,
        muted,
        playing,
        setVolume,
        toggleMute,
        togglePlay,
      }}
    >
      {/* Hidden audio element that everything controls */}
      <audio ref={audioRef} src={MUSIC_SRC} />
      {children}
    </MusicContext.Provider>
  )
}

export function useMusic() {
  const ctx = useContext(MusicContext)
  if (!ctx) {
    throw new Error("useMusic must be used within a MusicProvider")
  }
  return ctx
}

/* ---------- Footer controls (unused now, but kept in case you want later) ---------- */

/* ---------- Footer controls (no play button) ---------- */

export function FooterMusicControls() {
  const { volume, muted, setVolume, toggleMute, playing, togglePlay } = useMusic()

  const handleSliderChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = Number(e.target.value)
    setVolume(value / 100)

    // If autoplay was blocked, start playback on first slider move
    if (!playing) {
      togglePlay()
    }
  }

  return (
    <div className="flex items-center gap-2 rounded-full bg-emerald-900/80 px-3 py-1 shadow-sm shadow-emerald-500/30">
      {/* Mute / unmute only */}
      <button
        type="button"
        onClick={toggleMute}
        className="text-emerald-100 hover:text-emerald-300 transition"
        aria-label={muted || volume === 0 ? "Unmute" : "Mute"}
      >
        {muted || volume === 0 ? (
          <VolumeX className="h-4 w-4" />
        ) : (
          <Volume2 className="h-4 w-4" />
        )}
      </button>

      {/* Horizontal volume slider */}
      <input
        type="range"
        min={0}
        max={100}
        value={muted ? 0 : Math.round(volume * 100)}
        onChange={handleSliderChange}
        className="h-1 w-20 cursor-pointer accent-emerald-400"
      />
    </div>
  )
}


export function FloatingGameVolume() {
  const { volume, setVolume, muted, toggleMute } = useMusic()

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = Number(e.target.value) // 0 (bottom) -> 100 (top)
    setVolume(raw / 100)
  }

  // Direct mapping: louder = bigger value = more filled track
  const sliderValue = muted ? 0 : Math.round(volume * 100)

  return (
    <div className="fixed right-6 bottom-28 z-40">
      <div className="flex flex-col items-center gap-2 rounded-full border border-emerald-500/40 bg-emerald-900/80 px-3 py-3 shadow-sm shadow-emerald-500/30 backdrop-blur">
        {/* Mute / unmute button */}
        <button
          type="button"
          onClick={toggleMute}
          className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500 text-slate-950 hover:bg-emerald-400 transition"
          aria-label={muted || volume === 0 ? "Unmute" : "Mute"}
        >
          {muted || volume === 0 ? (
            <VolumeX className="h-4 w-4" />
          ) : (
            <Volume2 className="h-4 w-4" />
          )}
        </button>

        {/* Vertical slider */}
        <div className="relative h-24 w-6 flex items-center justify-center overflow-hidden">
          <input
            type="range"
            min={0}
            max={100}
            value={sliderValue}
            onChange={handleSliderChange}
            // NOTE: -rotate-90 instead of rotate-90
            className="absolute w-24 h-1 origin-center -rotate-90 cursor-pointer accent-emerald-400"
          />
        </div>
      </div>
    </div>
  )
}





