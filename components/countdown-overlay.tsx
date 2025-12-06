// components/countdown-overlay.tsx
"use client"

import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"

interface CountdownOverlayProps {
  visible: boolean
  count: number | null
}

export function CountdownOverlay({ visible, count }: CountdownOverlayProps) {
  const [isPulsing, setIsPulsing] = useState(false)

  useEffect(() => {
    if (count == null) return

    // turn pulse on when count changes
    setIsPulsing(true)

    // turn it off after a short delay so it can retrigger next time
    const timeout = setTimeout(() => setIsPulsing(false), 200)

    return () => clearTimeout(timeout)
  }, [count])

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm transition-opacity duration-300",
        visible ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
      )}
    >
      <div className="flex flex-col items-center gap-4">
        <img
          src="/pidgeot.gif"
          alt="Get ready..."
          className="w-86 h-auto md:w-134 drop-shadow-[0_0_28px_rgba(45,212,191,0.55)]"
        />

        {count != null && (
          <div
            className={cn(
              "text-slate-300 text-6xl md:text-4xl font-semibold tabular-nums",
              "transition-transform duration-200 ease-out",
              "drop-shadow-[0_0_12px_rgba(45,212,191,0.9)]", "opacity-80",
              isPulsing ? "scale-120" : "scale-100"
            )}
          >
            {count}
          </div>
        )}
      </div>
    </div>
  )
}
