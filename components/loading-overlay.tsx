"use client"

import { cn } from "@/lib/utils"

interface LoadingOverlayProps {
  visible: boolean
  progress: number
  message?: string
}

export function LoadingOverlay({ visible, progress, message }: LoadingOverlayProps) {
  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm transition-opacity duration-300",
        visible ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
      )}
    >
      <div className="flex flex-col items-center gap-6">
        {/* Circular sun-glow aura around the gif */}
        <div className="relative inline-flex items-center justify-center">
          {/* Radial glow */}
          <div className="absolute w-[140%] h-[140%] rounded-full bg-emerald-400/14 blur-3xl" />
          {/* Gif at natural size with a soft halo */}
          <img
            src="/pokemon_riffle_shuffle.gif"
            alt="Shuffling deck..."
            className="relative block max-w-full h-auto drop-shadow-[0_0_28px_rgba(45,212,191,0.55)]"
          />
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
