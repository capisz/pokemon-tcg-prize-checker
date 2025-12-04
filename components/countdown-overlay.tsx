// components/countdown-overlay.tsx
"use client"

import { cn } from "@/lib/utils"

interface CountdownOverlayProps {
  visible: boolean
  count: number | null
}

export function CountdownOverlay({ visible, count }: CountdownOverlayProps) {
  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm transition-opacity duration-300",
        visible ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
      )}
    >
      <div className="flex flex-col items-center gap-4">
        <img
          src="/pokeball.gif"
          alt="Get ready..."
          className="w-40 h-auto md:w-52 drop-shadow-[0_0_28px_rgba(45,212,191,0.55)]"
        />
        {count != null && (
          <div className="text-slate-50 text-6xl md:text-6xl font-semibold tracking-widest font-TimesNewRoman">
            {count}
          </div>
        )}
      </div>
    </div>
  )
}
