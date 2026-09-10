"use client"

import { useEffect, useMemo, useState, useRef } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Trophy,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Timer,
  X,
} from "lucide-react"
import type { PokemonCard } from "@/lib/types"
import { cn } from "@/lib/utils"
import Image from "next/image"
import type { RankState } from "@/lib/rank"
import { initialRankState, updateRank, rankSchema } from "@/lib/rank"
import { RankDisplay } from "@/components/rank-display"

import { calculateScore, evaluateGuesses, SCORING_VERSION } from "@/lib/game"
import { readStorage, writeStorage } from "@/lib/storage"
import { usePractice } from "@/components/practice-context"
import { enqueuePractice, syncStatus } from "@/lib/firebase/sync-queue"
import type { PracticeRecord } from "@/lib/practice-history"
import { makeRecord, writeHistory } from "@/lib/practice-history"
import { PracticeHistory } from "@/components/practice-history"
import { Modal } from "@/components/modal"

const BEST_KEY = `prizeCheckerPersonalBest:v${SCORING_VERSION}`
const RANK_KEY = `prizeCheckerRankState:v${SCORING_VERSION}`

interface ResultsViewProps {
  onSubmitted?: () => void
  allCards: PokemonCard[]
  prizeCards: PokemonCard[]
  onRestart: () => void
  onImportNewList?: () => void
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

const resultsPanelClasses =
  "rounded-3xl border-0 ring-1 ring-emerald-500/30 " +
  "bg-emerald-900/75 shadow-[0_20px_45px_rgba(0,0,0,0.9)]"

export function ResultsView({
  allCards,
  prizeCards,
  onRestart,
  onImportNewList,
  onSubmitted,
  timeLeft,
  totalTime,
}: ResultsViewProps) {
  const practice = usePractice()
  const [syncState,setSyncState] = useState<"idle" | "saving" | "saved" | "failed">("idle")
  useEffect(()=>{const update=()=>{if(practice.roundUid&&pendingRecord.current){const state=syncStatus(practice.roundUid);setSyncState(state==='saved'?'saved':state==='retry'?'failed':'saving')}};window.addEventListener('prizecheck-sync',update);return()=>window.removeEventListener('prizecheck-sync',update)},[practice.roundUid])
  const pendingRecord = useRef<PracticeRecord | null>(null)
  async function saveToAccount(record: PracticeRecord) {
    if(!practice.roundUid) return
    setSyncState("saving")
    try { await enqueuePractice(practice.roundUid, record); setSyncState(syncStatus(practice.roundUid)==="saved"?"saved":"saving") } catch { setSyncState("failed") }
  }
  const [selectedCards, setSelectedCards] = useState<Set<string>>(new Set())
  const [showResults, setShowResults] = useState(false)
  const [personalBest, setPersonalBest] = useState<number | null>(null)

  // Rank state
  const [rank, setRank] = useState<RankState | null>(null)
  const [previousRank, setPreviousRank] = useState<RankState | null>(null)

  // Summary modal visibility
  const [showSummary, setShowSummary] = useState(false)

  const totalPrizes = prizeCards.length || 6

  const historyId = useRef<string | null>(null)
  const [historyError, setHistoryError] = useState(false)
  const hasSaved = useRef(false)
  useEffect(() => {
    const value = Number(readStorage(BEST_KEY))
    if (Number.isFinite(value) && value >= 0 && value <= 1000) setPersonalBest(value)
    try {
      const parsed = rankSchema.safeParse(JSON.parse(readStorage(RANK_KEY) ?? "null"))
      setRank(parsed.success ? parsed.data : initialRankState)
    } catch { setRank(initialRankState) }
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

  const toggleCard = (cardId: string) => {
    if (showResults) return

    const next = new Set(selectedCards)
    if (next.has(cardId)) {
      next.delete(cardId)
    } else if (next.size < totalPrizes) {
      next.add(cardId)
    }
    setSelectedCards(next)
  }

  const evaluation = useMemo(
    () => evaluateGuesses(cardsWithMeta, prizeCards, selectedCards),
    [cardsWithMeta, prizeCards, selectedCards],
  )
  const { status: statusMap, correct: correctGuesses } = evaluation
  const score = calculateScore(correctGuesses, totalPrizes, timeLeft, totalTime)
  const accuracy = Math.round(correctGuesses / totalPrizes * 100)
  const usedTime = totalTime ? totalTime - Math.max(0, Math.min(totalTime, timeLeft ?? 0)) : Math.min(86400, -(timeLeft || 0))

  const handleSubmit = () => {
    if (showResults || selectedCards.size !== totalPrizes) return
    setShowResults(true)
    setShowSummary(true)
    historyId.current ??= crypto.randomUUID()
    const record = makeRecord(historyId.current, allCards, prizeCards, selectedCards, timeLeft === null ? null : usedTime, totalTime as 0 | 60 | 120 | 180)
    record.source = practice.source
    if(practice.binding && practice.binding.uid === practice.roundUid) {
      record.deckId = practice.binding.id; record.version = practice.binding.version; record.deckName = practice.binding.name
      if(practice.binding.coverCardId) record.coverCardId = practice.binding.coverCardId
      record.customName = true
    }
    pendingRecord.current = record
    try { writeHistory(record, practice.roundUid) } catch { setHistoryError(true) }
    void saveToAccount(record)
    onSubmitted?.()
  }

  useEffect(() => {
    if (!showResults || hasSaved.current || rank === null || totalTime !== 120) return
    hasSaved.current = true
    const nextRank = updateRank(rank, score, 1000)
    setPreviousRank(rank)
    setRank(nextRank)
    writeStorage(RANK_KEY, JSON.stringify(nextRank))
    const best = Math.max(personalBest ?? 0, score)
    setPersonalBest(best)
    writeStorage(BEST_KEY, String(best))
  }, [showResults, rank, score, personalBest])

  const scoreColor = (() => {
    if (score >= 800) return "text-emerald-400"
    if (score >= 600) return "text-lime-400"
    if (score >= 400) return "text-amber-400"
    return "text-rose-400"
  })()

  const scoreBadgeBg = (() => {
    if (score >= 800) {
      return "bg-emerald-600/60 border-emerald-900"
    }
    if (score >= 600) {
      return "bg-lime-600/60 border-lime-900"
    }
    if (score >= 400) {
      return "bg-amber-600/60 border-amber-900"
    }
    return "bg-rose-600/60 border-rose-900"
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

  const handleImportNewListClick = () => {
    if (onImportNewList) {
      onImportNewList()
    } else if (typeof window !== "undefined") {
      window.location.href = "/"
    }
  }

  // ----- Social share helpers -----
  const shareTextBase = `I scored ${score} points in PrizeCheck.us guessing my prize cards!`

  const handleShare = (platform: "twitter" | "facebook" | "instagram") => {
    if (typeof window === "undefined") return

    const url = encodeURIComponent(window.location.href)

    if (platform === "twitter") {
      const text = encodeURIComponent(shareTextBase)
      window.open(
        `https://twitter.com/intent/tweet?text=${text}&url=${url}`,
        "_blank",
        "noopener,noreferrer",
      )
      return
    }

    if (platform === "facebook") {
      const quote = encodeURIComponent(shareTextBase)
      window.open(
        `https://www.facebook.com/sharer/sharer.php?u=${url}&quote=${quote}`,
        "_blank",
        "noopener,noreferrer",
      )
      return
    }

    // instagram – copy text to clipboard
    const shareText = `${shareTextBase} Try it here: ${window.location.href}`
    navigator.clipboard
      .writeText(shareText)
      .then(() => {
        alert(
          "Share text copied! Open Instagram and paste it into your post or story.",
        )
      })
      .catch(() => {
        window.prompt(
          "Copy this text and share it on Instagram:",
          shareText,
        )
      })
  }

  return (
    <div className="container mx-auto max-w-7xl p-6 space-y-6 text-slate-50">
      {showResults && <div className="flex flex-wrap items-center gap-2"><PracticeHistory />{historyError && <p role="alert" className="text-sm text-rose-300">History could not be saved on this device.</p>}</div>}
      {showResults && syncState !== 'idle' && <div className="text-sm text-emerald-200" role="status">{syncState === 'saving' ? 'Saving to account…' : syncState === 'saved' ? 'Saved to account' : <><span>Account sync failed. </span><Button variant="ghost" onClick={() => pendingRecord.current && void saveToAccount(pendingRecord.current)}>Retry sync</Button></>}</div>}
      {showResults && totalTime !== 120 && <p className="text-xs text-slate-400">Custom practice · standard rank unchanged.</p>}
      {/* Header with inline submit button OR View Summary */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2 text-center sm:text-left">
          <h1
            className={cn(
              "text-[32px] sm:text-[40px] font-semibold text-emerald-200/90",
              "tracking-tight",
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

        {!showResults ? (
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
              className="rounded-full px-5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold shadow-md shadow-emerald-500/30 transition-transform duration-150 active:scale-95 disabled:bg-emerald-900 disabled:text-slate-500 disabled:cursor-not-allowed disabled:shadow-none drop-shadow-[0_0_8px_rgba(52,211,153,0.4)]"
            >
              Submit Guesses
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-center sm:justify-end">
            <Button
              type="button"
              size="sm"
              data-summary-trigger
              onClick={() => setShowSummary(true)}
              className="rounded-full px-5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold shadow-md shadow-emerald-500/30 transition-transform duration-150 active:scale-95 drop-shadow-[0_0_8px_rgba(52,211,153,0.4)]"
            >
              View Summary
            </Button>
          </div>
        )}
      </div>

      {/* Summary modal */}
      {showResults && showSummary && (
        <Modal returnFocusSelector="[data-summary-trigger]" open={showSummary} onOpenChange={setShowSummary} title="Practice results"
          overlayClassName="fixed inset-0 z-40 bg-slate-950/80 backdrop-blur-sm"
          className="w-[calc(100%-2rem)] max-w-4xl">
            <Card
              className={cn(
                "relative px-6 py-6 sm:px-8 sm:py-7 text-slate-50 space-y-4",
                resultsPanelClasses,
              )}
            >
              {/* Close button */}
              <button
                type="button"
                onClick={() => setShowSummary(false)}
                className="absolute right-5 top-5 text-slate-400 hover:text-emerald-300 transition-colors"
                aria-label="Close summary"
              >
                <X className="h-4 w-4" />
              </button>

              {/* Top row: Score + Rank + Stats */}
            {/* Top row: Score + Rank + Stats */}
<div className="flex flex-col gap-4 lg:grid lg:grid-cols-[auto_1fr_auto] lg:items-center">
  {/* Left: Score + PB (stacked inside the badge) */}
  <div className="flex items-center gap-4 justify-center lg:justify-start">
    <div
  className={cn(
    "flex items-center gap-3 rounded-2xl px-4 py-2 border",
    scoreBadgeBg,
  )}
>
  <Image
    src="/pokeballtrophy.png"
    alt="Overall score trophy"
    width={42}
    height={42}
    className="object-contain drop-shadow-[0_0_10px_rgba(250,204,21,0.75)]"
  />
  <div className="flex flex-col items-start">
        <span
          className={cn(
            "text-2xl sm:text-3xl font-semibold",
            scoreColor,
          )}
        >
          {score}
        </span>
        <span className="text-[11px] uppercase tracking-wide text-slate-300">
          Overall score
        </span>

        {/* Personal best under the score */}
        <div className="mt-1 flex items-center gap-2 text-[11px] sm:text-xs text-slate-200">
          <span className="text-slate-300">Personal Best:</span>
          <span className="font-semibold text-emerald-200/100">{personalBest ?? "—"}</span>
         
        </div>
      </div>
    </div>
  </div>

  {/* Center: Rank – */}
  {rank && previousRank && (
    <div className="flex justify-center mt-2 lg:mt-0">
      <div className="w-32 sm:w-40 aspect-square flex items-center justify-center drop-shadow-[0_0_16px_rgba(16,185,129,0.4)]">
        <RankDisplay
          previous={previousRank}
          current={rank}
          maxScore={1000}
          lastScore={score}
        />
      </div>
    </div>
  )}

  {/* Right: only Correct + Timer */}
  <div className="flex flex-wrap gap-4 text-xs sm:text-sm text-slate-300 justify-center lg:justify-end">
    <div className="flex flex-col items-start">
      <span className="font-semibold flex items-center gap-1">
        <CheckCircle2 className="h-4 w-4 text-emerald-400" />
        {correctGuesses} / {totalPrizes}
      </span>
      <span className="text-slate-400">
        Correct ({accuracy}%)
      </span>
    </div>

    <div className="flex flex-col items-start">
      <span className="font-semibold flex items-center gap-1">
        <Timer className="h-4 w-4 text-sky-400" />
        {formatTime(usedTime)}
      </span>
      <span className="text-slate-400">
        {totalTime ? `of ${formatTime(totalTime)} used` : 'untimed inspection'}
      </span>
    </div>
  </div>
</div>


              {/* Share row */}
              <div className="flex flex-col items-center gap-2 pt-2">
                <p className="text-sm text-slate-200">
                  Share your score with friends:
                </p>

                <div className="flex flex-wrap justify-center gap-3">
                  {/* X / Twitter */}
                  <button
                    type="button"
                    onClick={() => handleShare("twitter")}
                    className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold
                               bg-sky-300/90 hover:bg-sky-400 text-slate-950
                               shadow-md shadow-sky-500/40 transition-transform duration-150 active:scale-95"
                  >
                    <span>𝕏 / Twitter</span>
                  </button>

                  {/* Facebook */}
                  <button
                    type="button"
                    onClick={() => handleShare("facebook")}
                    className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold
                               bg-blue-600 hover:bg-blue-500 text-white
                               shadow-md shadow-blue-600/40 transition-transform duration-150 active:scale-95"
                  >
                    <span>Facebook</span>
                  </button>

                  {/* Instagram */}
                  <button
                    type="button"
                    onClick={() => handleShare("instagram")}
                    className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold
                               bg-pink-700/90 hover:bg-pink-700 text-white
                               shadow-md shadow-pink-500/40 transition-transform duration-150 active:scale-95"
                  >
                    <span>Instagram</span>
                  </button>
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
                      onClick={() => {
                        setShowSummary(false)
                        handleImportNewListClick()
                      }}
                      className="rounded-full px-5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold shadow-md shadow-emerald-500/30 transition-transform duration-150 active:scale-95 drop-shadow-[0_0_8px_rgba(52,211,153,0.4)]"
                    >
                      Import New List
                    </Button>

                    <Button
                      onClick={() => {
                        setShowSummary(false)
                        onRestart()
                      }}
                      size="sm"
                      className="rounded-full px-5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold shadow-md shadow-emerald-500/30 transition-transform duration-150 active:scale-95 drop-shadow-[0_0_8px_rgba(52,211,153,0.4)]"
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
                            {toNext}% remaining to next rank
                            {delta !== null && delta !== 0 && (
                              <span
                                className={cn(
                                  "ml-1",
                                  delta > 0
                                    ? "text-emerald-400"
                                    : "text-rose-400",
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
        </Modal>
      )}

      {/* Card grid */}
      <Card
        className={cn(
          "p-5 rounded-3xl",
          "bg-teal-900/40 shadow-[0_20px_45px_rgba(0,0,0,0.9)]",
          "border-transparent",
        )}
      >
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {cardsWithMeta.map((card, index) => {
            const status = getCardStatus(card.instanceId)
            const isClickable = !showResults

            return (
              <button
                type="button"
                aria-label={`${card.name}, copy ${index + 1}${showResults ? `: ${status}` : ""}`}
                aria-pressed={selectedCards.has(card.instanceId)}
                aria-disabled={showResults}
                key={`${card.instanceId}-${index}`}
                onClick={() => isClickable && toggleCard(card.instanceId)}
                className={cn(
                  "group relative aspect-[2.5/3.5] rounded-xl overflow-hidden transition-all focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-200",
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
              </button>
            )
          })}
        </div>
      </Card>
    </div>
  )
}
