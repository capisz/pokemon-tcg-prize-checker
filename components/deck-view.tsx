"use client"

import { CardFoil } from "@/components/card-foil"

import { useEffect, useState, useCallback, useRef, type PointerEvent } from "react"
import { RepeatButton } from "@/components/repeat-button"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Clock, ChevronLeft, ChevronRight } from "lucide-react"
import type { PokemonCard } from "@/lib/types"
import { cn } from "@/lib/utils"

interface DeckViewProps {
  duration?: number
  deck: PokemonCard[]
  hand: PokemonCard[]
  onTimeUp: (timeLeft: number) => void
  onEndEarly: (timeLeft: number) => void
  onRestartGame?: () => void
}

import { GAME_DURATION, remainingSeconds } from "@/lib/game"
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
  duration = GAME_DURATION,
}: DeckViewProps) {
  const [centerIndex, setCenterIndex] = useState(0)
  const [timeRemaining, setTimeRemaining] = useState(duration)
  const [deckOrder, setDeckOrder] = useState<PokemonCard[]>(deck)

  const [sortingGestures, setSortingGestures] = useState(false)
  const gesture = useRef<{ id: number; x: number; y: number } | null>(null)
  const suppressClick = useRef(false)
  const [announcement, setAnnouncement] = useState("")

  const deadline = useRef<number | null>(null)
  const finished = useRef(false)
  const progress = duration ? ((duration - timeRemaining) / duration) * 100 : 0

  useEffect(() => {
    deadline.current = Date.now() + duration * 1000
    finished.current = false
    const tick = () => {
      const remaining = duration ? remainingSeconds(deadline.current!, Date.now()) : Math.floor((Date.now() - deadline.current!) / 1000)
      setTimeRemaining(remaining)
      if (duration > 0 && remaining === 0 && !finished.current) {
        finished.current = true
        onTimeUp(0)
      }
    }
    const timer = window.setInterval(tick, 100)
    window.addEventListener("focus", tick)
    return () => {
      window.clearInterval(timer)
      window.removeEventListener("focus", tick)
    }
  }, [onTimeUp, duration])

  // Navigation handlers
  const goNext = useCallback(() => {
    setCenterIndex((prev) => Math.min(prev + 1, deckOrder.length - 1))
  }, [deckOrder.length])

  const goPrevious = useCallback(() => {
    setCenterIndex((prev) => Math.max(0, prev - 1))
  }, [])

  const moveCardToFront = useCallback(
    (cardIndex: number) => {
      if (cardIndex <= 0 || cardIndex >= deckOrder.length) return
      const newDeck = [...deckOrder]
      const [card] = newDeck.splice(cardIndex, 1)
      newDeck.unshift(card)
      setAnnouncement(`${card.name} moved to front`)
      setDeckOrder(newDeck)

      // After moving the current card, inspect the next untouched card.
      setCenterIndex(prev => cardIndex >= prev ? Math.min(prev + 1, newDeck.length - 1) : prev)
    },
    [deckOrder],
  )

  const moveCardToBack = useCallback(
    (cardIndex: number) => {
      if (cardIndex < 0 || cardIndex >= deckOrder.length) return
      const newDeck = [...deckOrder]
      const [card] = newDeck.splice(cardIndex, 1)
      newDeck.push(card)
      setAnnouncement(`${card.name} moved to back`)
      setDeckOrder(newDeck)

      setCenterIndex((prev) => {
        if (cardIndex < prev) return Math.max(prev - 1, 0)
        return Math.min(prev, newDeck.length - 1)
      })
    },
    [deckOrder],
  )

  const startGesture = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse") { suppressClick.current = false; return }
    suppressClick.current = true
    if (!event.isPrimary) { gesture.current = null; return }
    gesture.current = { id: event.pointerId, x: event.clientX, y: event.clientY }
    if (event.nativeEvent.isTrusted) event.currentTarget.setPointerCapture(event.pointerId)
  }
  const endGesture = (event: PointerEvent<HTMLDivElement>) => {
    const start = gesture.current
    gesture.current = null
    if (!start || start.id !== event.pointerId) return
    const dx = event.clientX - start.x, dy = event.clientY - start.y
    // Deliberate, axis-dominant movement only; diagonal drags do nothing.
    if (Math.abs(dx) >= 45 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      if (dx < 0) goNext(); else goPrevious()
    } else if (sortingGestures && Math.abs(dy) >= 65 && Math.abs(dy) > Math.abs(dx) * 1.5) {
      if (dy < 0) moveCardToFront(centerIndex); else moveCardToBack(centerIndex)
    }
  }

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || (e.target instanceof HTMLElement && e.target.matches("input, textarea, select, [contenteditable=true]"))) return
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

    const carousel = document.getElementById("practice-carousel")
    carousel?.addEventListener("wheel", handleWheel, { passive: false })
    return () => carousel?.removeEventListener("wheel", handleWheel)
  }, [goNext, goPrevious])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  const handleRestartClick = () => {
    onRestartGame?.()
  }

  const handleGuessPrizesClick = () => {
    // 🟢 when user ends early, report how many seconds are left
    if (finished.current || deadline.current === null) return
    finished.current = true
    onEndEarly(duration ? remainingSeconds(deadline.current, Date.now()) : -Math.floor((Date.now() - deadline.current) / 1000))
  }

  return (
    <div className="relative container mx-auto max-w-7xl p-3 sm:p-6 min-h-dvh flex flex-col gap-2 sm:gap-4 text-slate-50">
      {/* Header with timer + end button */}
      <Card className={cn("p-3 sm:p-4", panelClasses)}>
        <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-4">
          {/* Timer */}
          <div className="flex items-center gap-3">
            <Clock
              className={cn(
                "hidden sm:block h-6 w-6",
                duration > 0 && timeRemaining <= 20
                  ? "text-rose-400 animate-pulse"
                  : "text-emerald-300",
              )}
            />
            <div>
              <div
                className={cn(
                  "text-2xl sm:text-4xl font-semibold tabular-nums tracking-normal sm:tracking-[0.18em]",
                  duration > 0 && timeRemaining <= 20 ? "text-rose-400" : "text-emerald-50",
                )}
              >
                {formatTime(timeRemaining)}
              </div>
              <div className="text-[9px] sm:text-[11px] uppercase tracking-normal sm:tracking-[0.22em] text-emerald-200/80">
                {duration ? "Time Remaining" : "Untimed · elapsed"}
              </div>
            </div>
          </div>

          {/* Progress */}
          <div className="order-last basis-full sm:order-none sm:basis-auto flex-1 max-w-md">
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
          <div className="flex flex-wrap items-center justify-end gap-2">
            {onRestartGame && (
              <Button
                type="button"
                size="sm"
                onClick={handleRestartClick}
                className={cn(
                  "rounded-full px-3 sm:px-5 font-semibold shadow-md shadow-emerald-500/40",
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
              onClick={handleGuessPrizesClick}
              className={cn(
                "rounded-full px-3 sm:px-5 font-semibold shadow-md shadow-emerald-500/40",
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
      <div id="practice-carousel" className="practice-carousel-glow min-h-[300px] sm:min-h-[370px] flex-1 flex items-start justify-center overflow-hidden pt-2">
        <div className="relative w-full max-w-5xl h-[300px] sm:h-[370px] 2xl:h-[520px] flex items-center justify-center">
          {/* Background glow behind cards (blue again) */}
          <div
            className="
              hidden
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
          <RepeatButton
            type="button"
            variant="ghost"
            size="icon"
            className={cn(
              "absolute left-0 z-40 h-12 w-12 rounded-full border border-slate-700/70",
              "bg-slate-950/90 text-slate-100 shadow-md shadow-emerald-500/20",
              "hover:bg-slate-800 hover:text-emerald-100",
              "transition-transform duration-150 active:scale-95 active:translate-y-[1px]",
              centerIndex === 0 && "opacity-40 cursor-default hover:bg-slate-950",
            )}
            aria-label="Previous card"
            onRepeat={goPrevious}
            disabled={centerIndex === 0}
          >
            <ChevronLeft className="h-6 w-6" />
          </RepeatButton>

          {/* Right arrow */}
          <RepeatButton
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
            aria-label="Next card"
            onRepeat={goNext}
            disabled={centerIndex === deckOrder.length - 1}
          >
            <ChevronRight className="h-6 w-6" />
          </RepeatButton>

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
                key={card.id}
                className={cn(
                  "absolute cursor-pointer transition-all duration-150 sm:duration-500 motion-reduce:transition-none ease-out will-change-transform",
                  zClass,
                  hidden && "pointer-events-none",
                )}
                data-testid={isCenter ? "center-card" : undefined}
                onPointerDown={startGesture}
                onPointerUp={endGesture}
                onPointerCancel={() => { gesture.current = null }}
                onLostPointerCapture={() => { gesture.current = null }}
                style={{
                  userSelect: "none",
                  WebkitUserSelect: "none",
                  WebkitTouchCallout: "none",
                  touchAction: sortingGestures ? "pinch-zoom" : "pan-y pinch-zoom",
                  transform: `translateX(${xTranslate}px) scale(${scale})`,
                  opacity: baseOpacity,
                }}
                onContextMenu={(e) => {
                  e.preventDefault()
                  if (suppressClick.current) return
                  moveCardToBack(index)
                }}
                onClick={(event) => {
                  if (suppressClick.current && event.detail !== 0) { suppressClick.current = false; return }
                  if (isCenter) {
                    moveCardToFront(index)
                  } else {
                    setCenterIndex(index)
                  }
                }}
              >
                <div
                  className={cn(
                    "w-[195px] sm:w-[235px] transition-shadow duration-150 sm:duration-500 rounded-xl",
                    isCenter
                      ? "shadow-none"
                      : "shadow-none",
                  )}
                >
                  <div
                    className={cn(
                      "aspect-[2.5/3.5] relative overflow-hidden rounded-xl",
                      "bg-slate-900",
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

                    {/* Holographic overlay for ex cards */}
                    <CardFoil name={card.name} />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="mobile-practice-controls sm:hidden -mt-2 flex flex-col gap-1">
        <div className="flex items-center gap-2 w-full">
          <Button variant="ghost" className="min-h-11 px-2 text-xs text-emerald-200" onClick={() => setCenterIndex(0)}>First</Button>
          <input className="min-h-11 min-w-0 flex-1 accent-emerald-300" type="range" min={1} max={deckOrder.length} value={centerIndex + 1} aria-label="Deck position" aria-valuetext={`Card ${centerIndex + 1} of ${deckOrder.length}: ${deckOrder[centerIndex]?.name}`} onChange={event => setCenterIndex(Number(event.target.value) - 1)} />
          <Button variant="ghost" className="min-h-11 px-2 text-xs text-emerald-200" onClick={() => setCenterIndex(deckOrder.length - 1)}>Last</Button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <RepeatButton className="min-h-11 rounded-full bg-emerald-500 text-slate-950 text-xs font-semibold hover:bg-emerald-400" onRepeat={() => moveCardToFront(centerIndex)} disabled={centerIndex === 0}>Move to front</RepeatButton>
          <RepeatButton className="min-h-11 rounded-full bg-emerald-500 text-slate-950 text-xs font-semibold hover:bg-emerald-400" onRepeat={() => moveCardToBack(centerIndex)} disabled={centerIndex === deckOrder.length - 1}>Move to back</RepeatButton>
          <Button variant="ghost" className="col-span-2 min-h-9 justify-self-center rounded-full px-3 text-[11px] text-emerald-200" aria-pressed={sortingGestures} onClick={() => { gesture.current = null; setSortingGestures(value => !value) }}>Sorting gestures {sortingGestures ? "on" : "off"}</Button>
        </div>
        <p className="text-center text-[10px] text-slate-400">Swipe to browse. Hold buttons to repeat. {sortingGestures ? "Swipe up to front; down to back. Scroll outside the cards." : ""}</p>
        <p className="order-first text-center text-xs font-medium leading-5 text-emerald-100" aria-live="polite" aria-atomic="true">Card {centerIndex + 1} of {deckOrder.length}: {deckOrder[centerIndex]?.name}</p>
        <span className="sr-only" role="status">{announcement}</span>
      </div>

      {/* Bottom instructions + starting hand overlay */}
      <div className="relative mt-2 sm:mt-6 group">
        {hand.length > 0 && (
          <div className="pointer-events-none absolute inset-x-16 bottom-6 h-16 rounded-full bg-emerald-500/18 blur-3xl opacity-80 z-10" />
        )}

        {hand.length > 0 && <p className="sm:hidden mb-2 text-[11px] text-emerald-200/80">Starting hand + first draw · {hand.length} cards</p>}
        {/* Starting hand */}
        {hand.length > 0 && (
          <div
            className={cn(
              "relative w-full overflow-x-auto z-20",
            )}
          >
            <div className="flex w-max min-w-full justify-center gap-3 px-2 pb-3">
              {hand.map((card, index) => (
                <div
                  key={`${card.id}-hand-${index}`}
                  className="shrink-0 w-[65px] sm:w-[100px] md:w-[110px]"
                >
                  <div className="relative isolate aspect-[2.5/3.5] overflow-hidden rounded-md bg-slate-950 shadow-[0_0_25px_rgba(15,23,42,0.9)]">
                    {card.image ? (
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
                    <CardFoil name={card.name} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Help bar */}
        <Card className={cn("hidden sm:block relative z-30 p-4 text-slate-200", panelClasses)}>
          <div className="text-center text-sm space-y-1">
            <p className="hidden sm:block font-medium">
              <span className="text-emerald-300">Left Click or Press A:</span>{" "}
              Center card (or move to front if centered) •{" "}
              <span className="text-emerald-300">Right Click or Press D:</span>{" "}
              Move card to back
            </p>
            <p className="hidden sm:block">
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
