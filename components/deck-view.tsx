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

    // Optional: prevent weird scrolling when using these keys
    if (["arrowleft", "arrowright", "a", "d"].includes(key)) {
      e.preventDefault()
    }

    if (key === "arrowleft") {
      goPrevious()
    } else if (key === "arrowright") {
      goNext()
    } else if (key === "a") {
      // Simulate LEFT CLICK on the center card → move to front
      if (deckOrder.length > 0) {
        moveCardToFront(centerIndex)
      }
    } else if (key === "d") {
      // Simulate RIGHT CLICK on the center card → move to back
      if (deckOrder.length > 0) {
        moveCardToBack(centerIndex)
      }
    }
  }

  window.addEventListener("keydown", handleKeyDown)
  return () => window.removeEventListener("keydown", handleKeyDown)
}, [goNext, goPrevious, moveCardToFront, moveCardToBack, centerIndex, deckOrder.length])



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

  return (
    <div className="relative container mx-auto max-w-7xl p-6 h-screen flex flex-col gap-4">
      {/* Header with timer + end button */}
      <Card className="p-4 bg-slate-900/90 border-slate-800 text-slate-50">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Clock
              className={cn(
                "h-6 w-6",
                timeRemaining <= 30
                  ? "text-red-500 animate-pulse"
                  : "text-slate-400",
              )}
            />
            <div>
              <div
                className={cn(
                  "text-2xl font-bold font-mono",
                  timeRemaining <= 30 ? "text-red-500" : "text-slate-50",
                )}
              >
                {formatTime(timeRemaining)}
              </div>
              <div className="text-xs text-slate-400">Time Remaining</div>
            </div>
          </div>

          <div className="flex-1 max-w-md">
            <Progress value={progress} className="h-2 bg-slate-800" />
          </div>

          <div className="flex items-center justify-end gap-2">
            {onRestartGame && (
              <Button
                type="button"
                size="sm"
                onClick={onRestartGame}
                className="rounded-full px-4 bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-semibold border border-slate-600"
              >
                Restart
              </Button>
            )}

            <Button
              type="button"
              size="sm"
              onClick={onEndEarly}
              className="rounded-full px-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-semibold shadow-md shadow-emerald-500/30"
            >
              End game
            </Button>
          </div>
        </div>
      </Card>

      {/* Carousel */}
      <div className="flex-1 flex items-start justify-center overflow-hidden pt-2">
        <div className="relative w-full max-w-5xl h-[520px] flex items-center justify-center">
          {/* Background glow behind cards */}
          <div
            className="
              pointer-events-none
              absolute
              inset-x-16
              top-15
              h-70
              rounded-full
              bg-sky-500/22
              blur-2xl
              opacity-70
            "
          />

          {/* Left arrow */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute left-0 z-40 h-12 w-12 rounded-full bg-slate-900/80 shadow-md hover:bg-slate-300 text-slate-50"
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
            className="absolute right-0 z-40 h-12 w-12 rounded-full bg-slate-900/80 shadow-md hover:bg-slate-300 text-slate-50"
            onClick={goNext}
            disabled={centerIndex === deckOrder.length - 1}
          >
            <ChevronRight className="h-6 w-6" />
          </Button>

          {deckOrder.map((card, index) => {
            const relativeIndex = index - centerIndex // 0 = center
            const distance = Math.abs(relativeIndex)

            const isCenter = distance === 0
            const xTranslate = relativeIndex * 220
            const scale = isCenter ? 1 : Math.max(0.9, 1 - distance * 0.06)

            let baseOpacity = 1
            if (distance === 2) baseOpacity = 0.85
            if (distance === 3) baseOpacity = 0.65
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
                    "w-[260px] transition-shadow duration-500",
                    isCenter
                      ? "shadow-[0_0_90px_rgba(56,189,248,0.9)]"
                      : "shadow-[0_0_40px_rgba(15,23,42,0.9)]",
                  )}
                >
                  <div className="aspect-[2.5/3.5] relative overflow-hidden rounded-lg">
                    {card.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={card.image || "/placeholder.svg"}
                        alt={card.name}
                        className="w-full h-full object-cover select-none"
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
      <div className="relative mt-auto group">
        {/* Starting hand */}
        {hand.length > 0 && (
          <div
            className={cn(
              "absolute inset-x-0 bottom-6 flex justify-center transition-transform duration-300 ease-out z-20",
              "translate-y-8",
              "group-hover:translate-y-0",
            )}
          >
            <div className="flex gap-3 px-8 pb-2">
              {hand.map((card, index) => (
                <div
                  key={`${card.id}-hand-${index}`}
                  className="w-[90px] sm:w-[100px] md:w-[110px] shadow-lg"
                >
                  <div className="aspect-[2.5/3.5] overflow-hidden rounded-md">
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
        <Card className="relative z-30 p-4 bg-slate-900/90 border-slate-800 text-slate-200">
          <div className="text-center text-sm space-y-1">
            <p className="font-medium">
              <span className="text-slate-50">Left Click:</span> Center card (or
              move to front if centered) •{" "}
              <span className="text-slate-50">Right Click:</span> Move card to
              back
            </p>
            <p>
              <span className="text-slate-50">Arrow Keys / Mouse Wheel:</span>{" "}
              Scroll through deck •{" "}
              <span className="text-slate-50">Side Arrows:</span> Step one card
              at a time
            </p>
            <p className="text-xs mt-2 text-slate-400">
              Viewing card {centerIndex + 1} of {deckOrder.length}
            </p>
          </div>
        </Card>
      </div>
    </div>
  )
}
