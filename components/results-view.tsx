"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Trophy, CheckCircle2, XCircle, RotateCcw, Timer } from "lucide-react"
import type { PokemonCard } from "@/lib/types"
import { cn } from "@/lib/utils"

import type { RankState } from "@/lib/rank"
import { initialRankState, updateRank } from "@/lib/rank"
import { RankDisplay } from "@/components/rank-display"

interface ResultsViewProps {
  allCards: PokemonCard[]
  prizeCards: PokemonCard[]
  onRestart: () => void
  timeLeft: number | null
  totalTime: number
}

type Status =
  | "selected"
  | "unselected"
  | "correct"
  | "incorrect"
  | "missed"
  | "normal"

/* ---------- Rank progress helpers ---------- */

const RANK_TIER_ORDER: RankState["tier"][] = [
  "pokeball",
  "greatball",
  "ultraball",
  "masterball",
]

const RANK_BAR_COLOR: Record<RankState["tier"], string> = {
  pokeball: "bg-rose-400",
  greatball: "bg-sky-400",
  ultraball: "bg-amber-300",
  masterball: "bg-violet-400",
}

function computeProgressDelta(
  previous: RankState | null,
  current: RankState | null,
): number | null {
  if (!previous || !current) return null
  if (current.tier === "masterball") return null

  const prevIndex = RANK_TIER_ORDER.indexOf(previous.tier)
  const currIndex = RANK_TIER_ORDER.indexOf(current.tier)
  if (prevIndex === -1 || currIndex === -1) return null

  const currentProgress = current.progress ?? 0

  // Promotion: 0 → current.progress
  if (currIndex > prevIndex) {
    return currentProgress
  }

  // Demotion: compare to 100 of previous tier
  if (currIndex < prevIndex) {
    return currentProgress - 100
  }

  // Same tier: diff from previous.progress
  return currentProgress - (previous.progress ?? 0)
}

/* ---------- Shared panel styles ---------- */

// Matches the “emerald bar” feel from the game screen
const resultsPanelClasses =
  "rounded-3xl border-0 ring-1 ring-emerald-500/30 " +
  "bg-emerald-900/75 shadow-[0_20px_45px_rgba(0,0,0,0.9)]"

// Neutral dark container behind the card grid (no green tint)
const gridPanelClasses =
  "rounded-3xl bg-slate-950/85 border border-slate-800/80 " +
  "shadow-[0_18px_40px_rgba(0,0,0,0.9)]"

export function ResultsView({
  allCards,
  prizeCards,
  onRestart,
  timeLeft,
  totalTime,
}: ResultsViewProps) {
  const router = useRouter()
  const [selectedCards, setSelectedCards] = useState<Set<string>>(new Set())
  const [showResults, setShowResults] = useState(false)
  const [personalBest, setPersonalBest] = useState<number | null>(null)

  // Rank state
  const [rank, setRank] = useState<RankState | null>(null)
  const [previousRank, setPreviousRank] = useState<RankState | null>(null)

  const totalPrizes = prizeCards.length || 6

  // Load personal best once
  useEffect(() => {
    if (typeof window === "undefined") return
    const stored = window.localStorage.getItem("prizeCheckerPersonalBest")
    if (stored) {
      const value = Number(stored)
      if (!Number.isNaN(value)) setPersonalBest(value)
    }
  }, [])

  // Load rank once
  useEffect(() => {
    if (typeof window === "undefined") return
    const stored = window.localStorage.getItem("prizeCheckerRankState")
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as RankState
        setRank(parsed)
      } catch {
        setRank(initialRankState)
      }
    } else {
      setRank(initialRankState)
    }
  }, [])

  // Expand meta & sort so duplicates are grouped together
  const cardsWithMeta = useMemo(
    () =>
      allCards
        .map((card) => ({
          ...card,
          instanceId: card.id,
          baseId: card.id.split("#")[0],
        }))
        .sort((a, b) => {
          if (a.baseId === b.baseId) {
            return a.instanceId.localeCompare(b.instanceId)
          }
          return a.baseId.localeCompare(b.baseId)
        }),
    [allCards],
  )

  // prize counts per base card (handles duplicates)
  const prizeCountByBase = useMemo(() => {
    const map = new Map<string, number>()
    for (const c of prizeCards) {
      const baseId = c.id.split("#")[0]
      map.set(baseId, (map.get(baseId) || 0) + 1)
    }
    return map
  }, [prizeCards])

  const toggleCard = (cardId: string) => {
    if (showResults) return

    const next = new Set(selectedCards)
    if (next.has(cardId)) {
      next.delete(cardId)
    } else if (next.size < 6) {
      next.add(cardId)
    }
    setSelectedCards(next)
  }

  const [statusMap, correctGuesses, incorrectGuesses, missedPrizes] = useMemo(() => {
    if (!showResults) return [new Map<string, Status>(), 0, 0, 0] as const

    const status = new Map<string, Status>()

    // group instances by baseId
    const cardsByBase = new Map<string, string[]>()
    for (const c of cardsWithMeta) {
      const ids = cardsByBase.get(c.baseId) || []
      ids.push(c.instanceId)
      cardsByBase.set(c.baseId, ids)
    }

    let correct = 0
    let incorrect = 0
    let missed = 0

    for (const [baseId, instanceIds] of cardsByBase.entries()) {
      const prizeCount = prizeCountByBase.get(baseId) || 0
      if (prizeCount === 0) {
        // nothing prized for this card: only mark selected as incorrect
        for (const id of instanceIds) {
          if (selectedCards.has(id)) {
            status.set(id, "incorrect")
            incorrect++
          }
        }
        continue
      }

      const selectedIds = instanceIds.filter((id) => selectedCards.has(id))
      const correctCount = Math.min(prizeCount, selectedIds.length)

      // mark correct selected
      for (let i = 0; i < correctCount; i++) {
        const id = selectedIds[i]
        status.set(id, "correct")
        correct++
      }

      // extra selected -> incorrect
      for (let i = correctCount; i < selectedIds.length; i++) {
        const id = selectedIds[i]
        status.set(id, "incorrect")
        incorrect++
      }

      // remaining prized copies that were never selected -> missed
      const remainingPrizes = prizeCount - correctCount
      if (remainingPrizes > 0) {
        const unselectedIds = instanceIds.filter((id) => !selectedCards.has(id))
        for (let i = 0; i < Math.min(remainingPrizes, unselectedIds.length); i++) {
          const id = unselectedIds[i]
          status.set(id, "missed")
          missed++
        }
      }
    }

    return [status, correct, incorrect, missed] as const
  }, [showResults, cardsWithMeta, prizeCountByBase, selectedCards])

  const handleSubmit = () => {
    setShowResults(true)
  }

  const handleImportNewList = () => {
    if (typeof window !== "undefined") {
      window.location.href = "/"
    }
  }

  const accuracy =
    totalPrizes > 0 ? Math.round((correctGuesses / totalPrizes) * 100) : 0

  // If timeLeft is null, assume 0 seconds used (fastest case)
  const usedTime = timeLeft == null ? 0 : Math.max(0, totalTime - timeLeft)

  const timePercent =
    totalTime === 0
      ? 0
      : Math.max(0, Math.min(1, (totalTime - usedTime) / totalTime))

  // scoring: 70% accuracy, 30% speed, scaled to 0–1000
  const score = (() => {
    const accScore = accuracy / 100
    const raw = accScore * 0.7 + timePercent * 0.3
    return Math.round(raw * 1000)
  })()

  // PB update
  useEffect(() => {
    if (!showResults) return
    if (typeof window === "undefined") return

    setPersonalBest((prev) => {
      const currentBest =
        prev ??
        (() => {
          const stored = window.localStorage.getItem("prizeCheckerPersonalBest")
          const n = stored ? Number(stored) : 0
          return Number.isNaN(n) ? 0 : n
        })()

      const newBest = score > currentBest ? score : currentBest
      if (newBest !== currentBest) {
        window.localStorage.setItem("prizeCheckerPersonalBest", String(newBest))
      }
      return newBest
    })
  }, [showResults, score])

  // rank update when results show
  useEffect(() => {
    if (!showResults) return
    if (typeof window === "undefined") return

    setRank((current) => {
      const currentRank = current ?? initialRankState
      const nextRank = updateRank(currentRank, score, 1000)
      setPreviousRank(currentRank)
      window.localStorage.setItem(
        "prizeCheckerRankState",
        JSON.stringify(nextRank),
      )
      return nextRank
    })
  }, [showResults, score])

  const isNewPB =
    showResults && (personalBest === null || score >= personalBest)

  const scoreColor = (() => {
    if (score >= 800) return "text-emerald-400"
    if (score >= 600) return "text-lime-400"
    if (score >= 400) return "text-amber-400"
    return "text-rose-400"
  })()

  const scoreBadgeBg = (() => {
    if (score >= 800) return "bg-emerald-500/15 border-emerald-500/50"
    if (score >= 600) return "bg-lime-500/10 border-lime-500/40"
    if (score >= 400) return "bg-amber-500/10 border-amber-500/40"
    return "bg-rose-500/10 border-rose-500/40"
  })()

  const getCardStatus = (cardId: string): Status => {
    if (!showResults) {
      return selectedCards.has(cardId) ? "selected" : "unselected"
    }
    return statusMap.get(cardId) ?? "normal"
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  return (
    <div className="container mx-auto max-w-7xl p-6 space-y-6 text-slate-50">
      {/* Header with inline submit button */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2 text-center sm:text-left">
          <h1
      className={cn(
        "text-[32px] sm:text-[40px] font-semibold text-emerald-200/90",
        "tracking-tight"
      )}
    >
      Select the Prize Cards
    </h1>
          <p className="text-slate-400 text-sm sm:text-base">
            {showResults
              ? "Here are your results."
              : "Select the 6 cards you believe were prizes."}
          </p>
        </div>

        {!showResults && (
          <div className="flex items-center justify-center sm:justify-end gap-3">
            <span className="text-xs sm:text-sm text-slate-400">
              Selected{" "}
              <span className="font-semibold text-emerald-200">
                {selectedCards.size}
              </span>{" "}
              of{" "}
              <span className="font-semibold text-emerald-200">
                {totalPrizes}
              </span>
            </span>
            <Button
              onClick={handleSubmit}
              disabled={selectedCards.size !== totalPrizes}
              size="sm"
              className="rounded-full px-5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold shadow-md shadow-emerald-500/30 transition-transform duration-150 active:scale-95 disabled:bg-emerald-900 disabled:text-slate-500 disabled:cursor-not-allowed disabled:shadow-none"
            >
              Submit Guesses
            </Button>
          </div>
        )}
      </div>

      {/* Score + rank + stats + legend + bar */}
      {showResults && (
        <Card
          className={cn(
            "px-6 py-6 sm:px-8 sm:py-7 text-slate-50 space-y-4",
            resultsPanelClasses,
          )}
        >
          {/* Top row: Score + Rank + Stats */}
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            {/* Left: Score + PB */}
            <div className="flex items-center gap-4">
              <div
                className={cn(
                  "flex items-center gap-3 rounded-2xl px-4 py-2 border",
                  scoreBadgeBg,
                )}
              >
                <Trophy className="h-6 w-6 text-amber-300" />
                <div className="flex flex-col items-start">
                  <span
                    className={cn(
                      "text-2xl sm:text-3xl font-semibold",
                      scoreColor,
                    )}
                  >
                    {score}
                  </span>
                  <span className="text-[11px] uppercase tracking-wide text-slate-400">
                    Overall score
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-1 text-xs sm:text-sm text-slate-300">
                <div className="flex items-center gap-2">
                  <span className="text-slate-400">Personal Best:</span>
                  <span className="font-semibold">
                    {personalBest ?? "—"}
                  </span>
                  {isNewPB && (
                    <Badge className="bg-emerald-500 text-white text-[10px] uppercase tracking-wide">
                      New PB
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Center: Rank */}
            {rank && previousRank && (
              <div className="flex justify-center flex-1 mt-4 lg:mt-2">
                <div className="scale-[1.3] drop-shadow-[0_0_16px_rgba(16,185,129,0.4)]">
                  <RankDisplay
                    previous={previousRank}
                    current={rank}
                    maxScore={1000}
                    lastScore={score}
                  />
                </div>
              </div>
            )}

            {/* Right: Stats */}
            <div className="flex flex-wrap gap-4 text-xs sm:text-sm text-slate-300 justify-end">
              <div className="flex flex-col items-start">
                <span className="font-semibold flex items-center gap-1">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  {correctGuesses} / {totalPrizes}
                </span>
                <span className="text-slate-400">Correct ({accuracy}%)</span>
              </div>

              <div className="flex flex-col items-start">
                <span className="font-semibold flex items-center gap-1">
                  <XCircle className="h-4 w-4 text-rose-400" />
                  {incorrectGuesses}
                </span>
                <span className="text-slate-400">Wrong</span>
              </div>

              <div className="flex flex-col items-start">
                <span className="font-semibold flex items-center gap-1">
                  <XCircle className="h-4 w-4 text-orange-400" />
                  {missedPrizes}
                </span>
                <span className="text-slate-400">Missed</span>
              </div>

              <div className="flex flex-col items-start">
                <span className="font-semibold flex items-center gap-1">
                  <Timer className="h-4 w-4 text-sky-400" />
                  {formatTime(usedTime)}
                </span>
                <span className="text-slate-400">
                  of {formatTime(totalTime)} used
                </span>
              </div>
            </div>
          </div>

          {/* Legend + Play Again + bottom progress bar */}
          <div className="pt-3 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-4 text-xs sm:text-sm text-slate-200">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded border-4 border-emerald-400" />
                  <span>Correct guess</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded border-4 border-rose-500" />
                  <span>Wrong guess</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded border-4 border-orange-400" />
                  <span>Missed prize</span>
                </div>
              </div>

              {/* Right-side buttons */}
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  onClick={handleImportNewList}
                  className="rounded-full px-5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold shadow-md shadow-emerald-500/30 transition-transform duration-150 active:scale-95"
                >
                  Import New List
                </Button>

                <Button
                  onClick={onRestart}
                  size="sm"
                  className="rounded-full px-5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold shadow-md shadow-emerald-500/30 transition-transform duration-150 active:scale-95"
                >
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Play Again
                </Button>
              </div>
            </div>

            {/* Full-width bottom bar */}
            {rank && rank.tier !== "masterball" && (
              <div className="w-full">
                {(() => {
                  const clamped = Math.max(
                    0,
                    Math.min(100, rank.progress ?? 0),
                  )
                  const toNext = Math.max(0, 100 - clamped)
                  const delta = computeProgressDelta(previousRank, rank)

                  return (
                    <>
                      <div className="w-full h-1 rounded-full bg-slate-800 overflow-hidden">
                        <div
                          className={cn(
                            "h-full transition-all duration-800",
                            RANK_BAR_COLOR[rank.tier],
                          )}
                          style={{ width: `${clamped}%` }}
                        />
                      </div>
                      <div className="mt-1 text-center text-[11px] text-slate-400">
                        {toNext}% to next rank
                        {delta !== null && delta !== 0 && (
                          <span
                            className={cn(
                              "ml-1",
                              delta > 0 ? "text-emerald-400" : "text-rose-400",
                            )}
                          >
                            ({delta > 0 ? "+" : ""}
                            {Math.round(delta)})
                          </span>
                        )}
                      </div>
                    </>
                  )
                })()}
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Card grid */}
     <Card
  className={cn(
    "p-5 rounded-3xl",
    // dark neutral background so the cards pop
    "bg-emerald-900/50",
    // emerald-tinted border & shadow to match results header
    "border-transparent"
  )}
>
  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {cardsWithMeta.map((card, index) => {
            const status = getCardStatus(card.instanceId)
            const isClickable = !showResults

            return (
              <div
                key={`${card.instanceId}-${index}`}
                onClick={() => isClickable && toggleCard(card.instanceId)}
                className={cn(
                  "group relative aspect-[2.5/3.5] rounded-xl overflow-hidden transition-all",
                  isClickable && "cursor-pointer",
                  status === "selected" && "ring-3 ring-sky-400 scale-[0.97]",
                  status === "correct" && "ring-3 ring-emerald-400",
                  status === "incorrect" && "ring-3 ring-rose-500",
                  status === "missed" && "ring-3 ring-orange-400 opacity-90",
                  status === "normal" && showResults && "opacity-40",
                  !showResults && "hover:scale-105",
                )}
              >
                {card.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={card.image || "/placeholder.svg"}
                    alt={card.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-slate-800 flex items-center justify-center p-2">
                    <p className="text-xs text-center text-slate-50 font-medium">
                      {card.name}
                    </p>
                  </div>
                )}

                {/* Status badge */}
                {showResults && status !== "normal" && (
                  <div className="absolute top-2 right-2">
                    {status === "correct" && (
                      <Badge className="bg-emerald-500 text-white shadow-md shadow-emerald-500/40">
                        <CheckCircle2 className="h-3 w-3" />
                      </Badge>
                    )}
                    {status === "incorrect" && (
                      <Badge className="bg-rose-500 text-white shadow-md shadow-rose-500/40">
                        <XCircle className="h-3 w-3" />
                      </Badge>
                    )}
                    {status === "missed" && (
                      <Badge className="bg-orange-500 text-white shadow-md shadow-orange-500/40">
                        Prize
                      </Badge>
                    )}
                  </div>
                )}

                {/* Hover / selection overlay before submit */}
                {!showResults && (
                  <div
                    className={cn(
                      "absolute inset-0 transition-opacity flex items-center justify-center p-2",
                      status === "selected"
                        ? "bg-sky-500/25 backdrop-blur-sm opacity-100"
                        : "bg-black/70 opacity-0 group-hover:opacity-100",
                    )}
                  >
                    {status === "selected" ? (
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-2xl sm:text-3xl font-extrabold tracking-[0.18em] text-emerald-200/90 drop-shadow-[0_0_14px_rgba(45,212,191,0.85)]">
                          {selectedCards.size}/{totalPrizes}
                        </span>
                        <span className="text-[10px] sm:text-xs uppercase tracking-[0.22em] text-sky-100/80">
                          Selected
                        </span>
                      </div>
                    ) : (
                      <p className="text-xs text-white text-center font-medium">
                        {card.name}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </Card>
    </div>
  )
}
