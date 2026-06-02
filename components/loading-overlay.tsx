"use client"

import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"

interface LoadingOverlayProps {
  visible: boolean
  progress: number
  message?: string
}

type GifLayer = 0 | 1

const SHUFFLE_GIF_LOOP_MS = 2670
const SHUFFLE_GIF_CROSSFADE_MS = 420
const SHUFFLE_GIF_SWAP_MS = SHUFFLE_GIF_LOOP_MS - SHUFFLE_GIF_CROSSFADE_MS - 80
const OVERLAY_FADE_MS = 300

export function LoadingOverlay({ visible, progress, message }: LoadingOverlayProps) {
  const [shouldRender, setShouldRender] = useState(visible)
  const [activeLayer, setActiveLayer] = useState<GifLayer>(0)
  const [gifKeys, setGifKeys] = useState<[number, number]>([0, 1])

  useEffect(() => {
    if (visible) {
      setShouldRender(true)
      return
    }

    const hideTimer = window.setTimeout(() => {
      setShouldRender(false)
    }, OVERLAY_FADE_MS)

    return () => window.clearTimeout(hideTimer)
  }, [visible])

  useEffect(() => {
    if (!visible) return

    let currentLayer: GifLayer = 0
    let nextKey = Date.now()
    let pendingFadeTimer: number | undefined

    setActiveLayer(currentLayer)
    setGifKeys([nextKey, nextKey + 1])

    const swapTimer = window.setInterval(() => {
      const nextLayer: GifLayer = currentLayer === 0 ? 1 : 0
      nextKey += 1

      setGifKeys((keys) => {
        const nextKeys: [number, number] = [...keys]
        nextKeys[nextLayer] = nextKey
        return nextKeys
      })

      pendingFadeTimer = window.setTimeout(() => {
        currentLayer = nextLayer
        setActiveLayer(nextLayer)
      }, 40)
    }, SHUFFLE_GIF_SWAP_MS)

    return () => {
      window.clearInterval(swapTimer)
      if (pendingFadeTimer) window.clearTimeout(pendingFadeTimer)
    }
  }, [visible])

  if (!shouldRender) return null

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 transition-opacity duration-300 transform-gpu",
        visible ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
      )}
    >
      <div className="flex flex-col items-center gap-6">
        {/* Circular sun-glow aura around the gif */}
        <div className="relative inline-flex items-center justify-center">
          <span className="sr-only">Shuffling deck...</span>
          {/* Radial glow */}
          <div className="absolute w-[140%] h-[140%] rounded-full bg-emerald-400/14 blur-3xl" />
          {/* Staggered gif layers crossfade before the source animation loops. */}
          <div className="relative grid place-items-center">
            {([0, 1] as const).map((layer) => (
              <img
                key={`${layer}-${gifKeys[layer]}`}
                src="/pokemon_riffle_shuffle.gif"
                alt=""
                aria-hidden="true"
                className={cn(
                  "col-start-1 row-start-1 block max-w-full h-auto drop-shadow-[0_0_28px_rgba(45,212,191,0.55)]",
                  "transition-opacity duration-[420ms] ease-in-out",
                  activeLayer === layer ? "opacity-100" : "opacity-0",
                )}
              />
            ))}
          </div>
        </div>

        {message && (
          <p className="text-slate-100 text-sm md:text-base tracking-wide">
            {message}
          </p>
        )}

        {/* Progress bar */}
        <div className="w-64 max-w-[80vw]">
          <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
            <div
              className="h-full rounded-full bg-emerald-400 transition-all duration-100"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-slate-400 text-center">
            {progress < 100 ? "Shuffling and importing..." : "Ready!"}
          </p>
        </div>
      </div>
    </div>
  )
}
