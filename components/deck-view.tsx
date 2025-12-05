"use client"

import { useEffect, useState, useCallback } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Clock, ChevronLeft, ChevronRight } from "lucide-react"
import type { PokemonCard } from "@/lib/types"
import { cn } from "@/lib/utils"

interface DeckViewProps {
  deck: PokemonCard[]
  hand: PokemonCard[]
  onTimeUp: () => void
  onEndEarly: () => void
  onRestartGame?: () => void
}

const GAME_DURATION = 120
const MAX_VISIBLE_DISTANCE = 3

// Single-color emerald panel used for header + help bar
const panelClasses =
  "rounded-3xl border-0 ring-1 ring-emerald-500/20 " +
  "bg-emerald-900/70 shadow-[0_20px_45px_rgba(0,0,0,0.85)] overflow-hidden"

export function DeckView({
  deck,
  hand,
  onTimeUp,
  onEndEarly,
  onRestartGame,
}: DeckViewProps) {
  const [centerIndex, setCenterIndex] = useState(0)
  const [timeRemaining, setTimeRemaining] = useState(GAME_DURATION)
  const [deckOrder, setDeckOrder] = useState<PokemonCard[]>(deck)

  // keep in sync when a new deck is imported
  useEffect(() => {
    setDeckOrder(deck)
    setCenterIndex(0)
    setTimeRemaining(GAME_DURATION)
  }, [deck])

  const progress = ((GAME_DURATION - timeRemaining) / GAME_DURATION) * 100

  // Timer countdown
  useEffect(() => {
    if (timeRemaining <= 0) {
      onTimeUp()
      return
    }

    const timer = setInterval(() => {
      setTimeRemaining((prev) => Math.max(0, prev - 1))
    }, 1000)

    return () => clearInterval(timer)
  }, [timeRemaining, onTimeUp])

  // Navigation handlers
  const goNext = useCallback(() => {
    setCenterIndex((prev) => Math.min(prev + 1, deckOrder.length - 1))
  }, [deckOrder.length])

  const goPrevious = useCallback(() => {
    setCenterIndex((prev) => Math.max(0, prev - 1))
  }, [])

  const moveCardToFront = useCallback(
    (cardIndex: number) => {
      const newDeck = [...deckOrder]
      const [card] = newDeck.splice(cardIndex, 1)
      newDeck.unshift(card)
      setDeckOrder(newDeck)

      setCenterIndex((prev) => {
        if (cardIndex < prev) return Math.max(prev - 1, 0)
        return prev
      })
    },
    [deckOrder],
  )

  const moveCardToBack = useCallback(
    (cardIndex: number) => {
      const newDeck = [...deckOrder]
      const [card] = newDeck.splice(cardIndex, 1)
      newDeck.push(card)
      setDeckOrder(newDeck)

      setCenterIndex((prev) => {
        if (cardIndex < prev) return Math.max(prev - 1, 0)
        return Math.min(prev, newDeck.length - 1)
      })
    },
    [deckOrder],
  )

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase()

      if (["arrowleft", "arrowright", "a", "d"].includes(key)) {
        e.preventDefault()
      }

      if (key === "arrowleft") {
        goPrevious()
      } else if (key === "arrowright") {
        goNext()
      } else if (key === "a") {
        moveCardToFront(centerIndex)
      } else if (key === "d") {
        moveCardToBack(centerIndex)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [goNext, goPrevious, moveCardToFront, moveCardToBack, centerIndex])

  // Mouse wheel navigation
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault()
      if (e.deltaY > 0) goNext()
      else if (e.deltaY < 0) goPrevious()
    }

    window.addEventListener("wheel", handleWheel, { passive: false })
    return () => window.removeEventListener("wheel", handleWheel)
  }, [goNext, goPrevious])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  const handleRestartClick = () => {
    setTimeRemaining(GAME_DURATION)
    setCenterIndex(0)
    setDeckOrder(deck)
    onRestartGame?.()
  }

  return (
    <div className="relative container mx-auto max-w-7xl p-6 h-screen flex flex-col gap-4 text-slate-50">
      {/* Header with timer + end button */}
      <Card className={cn("p-4", panelClasses)}>
        <div className="flex items-center justify-between gap-4">
          {/* Timer */}
          <div className="flex items-center gap-3">
            <Clock
              className={cn(
                "h-6 w-6",
                timeRemaining <= 20
                  ? "text-rose-400 animate-pulse"
                  : "text-emerald-300",
              )}
            />
            <div>
              <div
                className={cn(
                  "text-3xl sm:text-4xl font-semibold tabular-nums tracking-[0.18em]",
                  timeRemaining <= 20 ? "text-rose-400" : "text-emerald-50",
                )}
              >
                {formatTime(timeRemaining)}
              </div>
              <div className="text-[11px] uppercase tracking-[0.22em] text-emerald-200/80">
                Time Remaining
              </div>
            </div>
          </div>

          {/* Progress */}
          <div className="flex-1 max-w-md">
            <Progress
              value={progress}
              className={cn(
                "h-2 rounded-full",
                "bg-emerald-900/40 shadow-inner shadow-emerald-500/20",
                "[&>div]:bg-emerald-400",
              )}
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2">
            {onRestartGame && (
              <Button
                type="button"
                size="sm"
                onClick={handleRestartClick}
                className={cn(
                  "rounded-full px-5 font-semibold shadow-md shadow-emerald-500/40",
                  "bg-emerald-500 text-slate-950 hover:bg-emerald-400",
                  "transition-transform duration-150 active:scale-95 active:translate-y-[1px]",
                )}
              >
                Restart
              </Button>
            )}

            <Button
              type="button"
              size="sm"
              onClick={onEndEarly}
              className={cn(
                "rounded-full px-5 font-semibold shadow-md shadow-emerald-500/40",
                "bg-emerald-500 text-slate-950 hover:bg-emerald-400",
                "transition-transform duration-150 active:scale-95 active:translate-y-[1px]",
              )}
            >
              Guess Prizes
            </Button>
          </div>
        </div>
      </Card>

      {/* Carousel */}
      <div className="flex-1 flex items-start justify-center overflow-hidden pt-2">
        <div className="relative w-full max-w-5xl h-[520px] flex items-center justify-center">
          {/* Background glow behind cards (blue again) */}
          <div
            className="
              pointer-events-none
              absolute
              inset-x-16
              top-16
              h-64
              rounded-[999px]
              bg-sky-400/18
              blur-3xl
              opacity-80
            "
          />

          {/* Left arrow */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={cn(
              "absolute left-0 z-40 h-12 w-12 rounded-full border border-slate-700/70",
              "bg-slate-950/90 text-slate-100 shadow-md shadow-emerald-500/20",
              "hover:bg-slate-900 hover:text-emerald-100",
              "transition-transform duration-150 active:scale-95 active:translate-y-[1px]",
              centerIndex === 0 && "opacity-40 cursor-default hover:bg-slate-950",
            )}
            onClick={goPrevious}
            disabled={centerIndex === 0}
          >
            <ChevronLeft className="h-6 w-6" />
          </Button>

          {/* Right arrow */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={cn(
              "absolute right-0 z-40 h-12 w-12 rounded-full border border-slate-700/70",
              "bg-slate-950/90 text-slate-100 shadow-md shadow-emerald-500/20",
              "hover:bg-slate-900 hover:text-emerald-100",
              "transition-transform duration-150 active:scale-95 active:translate-y-[1px]",
              centerIndex === deckOrder.length - 1 &&
                "opacity-40 cursor-default hover:bg-slate-950",
            )}
            onClick={goNext}
            disabled={centerIndex === deckOrder.length - 1}
          >
            <ChevronRight className="h-6 w-6" />
          </Button>

          {deckOrder.map((card, index) => {
            const relativeIndex = index - centerIndex // 0 = center
            const distance = Math.abs(relativeIndex)

            const isCenter = distance === 0

            // Slightly less spacing & only a *little* larger than old version
            const xTranslate = relativeIndex * 195

            const centerScale = 0.96
            const scale = isCenter
              ? centerScale
              : Math.max(0.84, centerScale - distance * 0.06)

            let baseOpacity = 1
            if (distance === 2) baseOpacity = 0.88
            if (distance === 3) baseOpacity = 0.7
            if (distance > MAX_VISIBLE_DISTANCE) baseOpacity = 0

            const hidden = distance > MAX_VISIBLE_DISTANCE

            const zClass =
              distance === 0 ? "z-30" : distance === 1 ? "z-20" : "z-10"

          return (
  <div
    key={`${card.id}-${index}`}
    className={cn(
      "absolute cursor-pointer transition-all duration-500 ease-out will-change-transform",
      zClass,
      hidden && "pointer-events-none",
    )}
    style={{
      transform: `translateX(${xTranslate}px) scale(${scale})`,
      opacity: baseOpacity,
    }}
    onContextMenu={(e) => {
      e.preventDefault()
      moveCardToBack(index)
    }}
    onClick={() => {
      if (isCenter) {
        moveCardToFront(index)
      } else {
        setCenterIndex(index)
      }
    }}
  >
    <div
      className={cn(
        "w-[235px] transition-shadow duration-500 rounded-xl", // 🔹 outer wrapper now rounded
        isCenter
          ? "shadow-[0_0_80px_rgba(56,189,248,0.9)]"
          : "shadow-[0_0_40px_rgba(15,23,42,0.9)]",
      )}
    >
      <div
        className={cn(
          "aspect-[2.5/3.5] relative overflow-hidden rounded-xl", // 🔹 clip to radius
          "bg-slate-900" // subtle base color behind the image
        )}
      >
        {card.image ? (
          <img
            src={card.image || "/placeholder.svg"}
            alt={card.name}
            className="absolute inset-0 w-full h-full object-cover select-none"
            draggable={false}
          />
        ) : (
          <div className="w-full h-full bg-slate-800 flex items-center justify-center p-4">
            <p className="text-lg text-center text-slate-50 font-bold text-balance">
              {card.name}
            </p>
          </div>
        )}
      </div>
    </div>
  </div>
)

          })}
        </div>
      </div>

      {/* Bottom instructions + starting hand overlay */}
      <div className="relative mt-6 group">
        {hand.length > 0 && (
          <div className="pointer-events-none absolute inset-x-16 bottom-6 h-16 rounded-full bg-emerald-500/18 blur-3xl opacity-80 z-10" />
        )}

        {/* Starting hand */}
        {hand.length > 0 && (
          <div
            className={cn(
              "absolute inset-x-0 bottom-6 flex justify-center transition-transform duration-300 ease-out z-20",
              "translate-y-8",
              "group-hover:translate-y-3",
            )}
          >
            <div className="flex gap-3 px-8 pb-2">
              {hand.map((card, index) => (
                <div
                  key={`${card.id}-hand-${index}`}
                  className="w-[90px] sm:w-[100px] md:w-[110px]"
                >
                  <div className="aspect-[2.5/3.5] overflow-hidden rounded-md bg-slate-950 shadow-[0_0_25px_rgba(15,23,42,0.9)]">
                    {card.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={card.image || "/placeholder.svg"}
                        alt={card.name}
                        className="w-full h-full object-cover select-none"
                        draggable={false}
                      />
                    ) : (
                      <div className="w-full h-full bg-slate-800 flex items-center justify-center p-2">
                        <p className="text-xs text-center text-slate-50 font-medium">
                          {card.name}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Help bar */}
        <Card
  className={cn(
    "relative z-30 p-4 text-slate-200",
    panelClasses
  )}
>
  <div className="text-center text-sm space-y-1">
    <p className="font-medium">
      <span className="text-emerald-300">Left Click or Press A:</span>{" "}
      Center card (or move to front if centered) •{" "}
      <span className="text-emerald-300">Right Click or Press D:</span>{" "}
      Move card to back
    </p>
    <p>
      <span className="text-emerald-300">Arrow Keys / Mouse Wheel:</span>{" "}
      Scroll through deck •{" "}
      <span className="text-emerald-300">Side Arrows:</span> Step one
      card at a time
    </p>
    <p className="text-xs mt-2 text-slate-100">
      Viewing card {centerIndex + 1} of {deckOrder.length}
    </p>
  </div>
</Card>



      </div>
    </div>
  )
}
