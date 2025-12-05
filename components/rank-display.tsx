"use client"

import { useEffect, useState } from "react"
import type { RankState } from "@/lib/rank"
import { cn } from "@/lib/utils"

interface RankDisplayProps {
  previous: RankState
  current: RankState
  maxScore: number
  lastScore: number
}

const TIER_ORDER: RankState["tier"][] = [
  "pokeball",
  "greatball",
  "ultraball",
  "masterball",
]

// adjust to your actual file paths
const ICONS: Record<RankState["tier"], string> = {
  pokeball: "/pokeball.png",
  greatball: "/greatball.png",
  ultraball: "/ultraball.png",
  masterball: "/masterball.png",
}

// brighter glow colors
const GLOW_COLOR: Record<RankState["tier"], string> = {
  pokeball: "bg-rose-500/70",
  greatball: "bg-sky-500/70",
  ultraball: "bg-amber-300/75",
  masterball: "bg-violet-500/70",
}

function tierLabel(tier: RankState["tier"]) {
  switch (tier) {
    case "pokeball":
      return "Poké Ball"
    case "greatball":
      return "Great Ball"
    case "ultraball":
      return "Ultra Ball"
    case "masterball":
      return "Master Ball"
    default:
      return tier
  }
}

export function RankDisplay({
  previous,
  current,
  maxScore,
  lastScore,
}: RankDisplayProps) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 60)
    return () => clearTimeout(t)
  }, [current.tier, current.progress])

  const prevIndex = TIER_ORDER.indexOf(previous.tier)
  const currIndex = TIER_ORDER.indexOf(current.tier)
  const promoted = currIndex > prevIndex
  const demoted = currIndex < prevIndex

  // ---------- Master Ball (Elo mode) ----------
  if (current.tier === "masterball") {
    const baseElo = Math.round((lastScore / maxScore) * 2000 + 2000)
    const elo = current.elo ?? baseElo
    const prevElo = previous.elo ?? elo
    const delta = elo - prevElo
    const hasDelta = delta !== 0

    return (
      <div
        className={cn(
          "flex flex-col items-center gap-1 transition-opacity duration-700",
          visible ? "opacity-100" : "opacity-0",
        )}
      >
        <div className="relative flex items-center justify-center">
          {/* smaller, softer glow */}
          <div
            className={cn(
              "absolute w-28 h-28 rounded-full blur-2xl opacity-80 animate-pulse",
              GLOW_COLOR.masterball,
            )}
          />
          {/* steady icon */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={ICONS.masterball}
            alt="Master Ball rank"
            className="relative h-16 w-16"
          />
        </div>

        <div className="text-[10px] uppercase tracking-[0.22em] text-slate-400">
          Rank
        </div>
        <div className="text-sm font-semibold text-slate-100">
          Master Ball
        </div>

        <div className="mt-1 text-3xl font-bold text-violet-200">
          {elo}
        </div>
        {hasDelta && (
          <div
            className={cn(
              "text-xs",
              delta > 0 ? "text-emerald-400" : "text-rose-400",
            )}
          >
            {delta > 0 ? "+" : ""}
            {delta}
          </div>
        )}
      </div>
    )
  }

  // ---------- Normal tiers (Poké / Great / Ultra) ----------
  // We no longer show the bar or delta here; just icon + label

  return (
    <div
      className={cn(
        "flex flex-col items-center gap-1 transition-opacity duration-700",
        visible ? "opacity-100" : "opacity-0",
      )}
    >
      {/* larger ball with strong, slow pulsing glow */}
      <div className="relative flex items-center justify-center mt-1">
        <div
          className={cn(
            "absolute w-28 h-28 rounded-full blur-2xl opacity-75 animate-pulse",
            GLOW_COLOR[current.tier],
          )}
        />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={ICONS[current.tier]}
          alt={`${tierLabel(current.tier)} rank`}
          className="relative h-19 w-19"
        />
      </div>

      <div className="text-[10px] uppercase tracking-[0.22em] text-slate-400">
        Rank
      </div>
      <div className="text-sm font-semibold text-slate-100">
        {tierLabel(current.tier)}
      </div>
    </div>
  )
}
