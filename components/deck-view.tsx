"use client"

import { useEffect, useState, useCallback } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Clock } from 'lucide-react'
import type { PokemonCard } from "@/lib/types"
import { cn } from "@/lib/utils"

interface DeckViewProps {
  deck: PokemonCard[]
  onTimeUp: () => void
}

const GAME_DURATION = 120 // 120 seconds
const VISIBLE_CARDS = 6

export function DeckView({ deck, onTimeUp }: DeckViewProps) {
  const [centerIndex, setCenterIndex] = useState(2) // Start with 3rd card centered
  const [timeRemaining, setTimeRemaining] = useState(GAME_DURATION)
  const [deckOrder, setDeckOrder] = useState<PokemonCard[]>(deck)

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

  const moveCardToFront = useCallback((cardIndex: number) => {
    const newDeck = [...deckOrder]
    const [card] = newDeck.splice(cardIndex, 1)
    newDeck.unshift(card)
    setDeckOrder(newDeck)
    // Adjust center index to follow the card or stay in view
    setCenterIndex((prev) => Math.max(0, prev - 1))
  }, [deckOrder])

  const moveCardToBack = useCallback((cardIndex: number) => {
    const newDeck = [...deckOrder]
    const [card] = newDeck.splice(cardIndex, 1)
    newDeck.push(card)
    setDeckOrder(newDeck)
    // Keep center index reasonable
    setCenterIndex((prev) => Math.min(prev, newDeck.length - 1))
  }, [deckOrder])

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        goPrevious()
      } else if (e.key === "ArrowRight") {
        goNext()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [goNext, goPrevious])

  // Mouse wheel navigation
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault()
      if (e.deltaY > 0) {
        goNext()
      } else if (e.deltaY < 0) {
        goPrevious()
      }
    }

    window.addEventListener("wheel", handleWheel, { passive: false })
    return () => window.removeEventListener("wheel", handleWheel)
  }, [goNext, goPrevious])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  const getVisibleCards = () => {
    const startIndex = Math.max(0, centerIndex - 2)
    const endIndex = Math.min(deckOrder.length, startIndex + VISIBLE_CARDS)
    return deckOrder.slice(startIndex, endIndex).map((card, idx) => ({
      card,
      originalIndex: startIndex + idx,
    }))
  }

  const visibleCards = getVisibleCards()

  return (
    <div className="container mx-auto max-w-7xl p-6 h-screen flex flex-col gap-6">
      {/* Header with timer */}
      <Card className="p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Clock
              className={cn(
                "h-6 w-6",
                timeRemaining <= 30 ? "text-destructive animate-pulse" : "text-muted-foreground",
              )}
            />
            <div>
              <div
                className={cn(
                  "text-2xl font-bold font-mono",
                  timeRemaining <= 30 ? "text-destructive" : "text-foreground",
                )}
              >
                {formatTime(timeRemaining)}
              </div>
              <div className="text-xs text-muted-foreground">Time Remaining</div>
            </div>
          </div>

          <div className="flex-1 max-w-md">
            <Progress value={progress} className="h-2" />
          </div>

          <div className="text-right">
            <div className="text-2xl font-bold">{deckOrder.length}</div>
            <div className="text-xs text-muted-foreground">Cards Total</div>
          </div>
        </div>
      </Card>

      <div className="flex-1 flex items-center justify-center overflow-hidden">
        <div className="relative w-full max-w-5xl h-[500px] flex items-center justify-center">
          {visibleCards.map(({ card, originalIndex }, idx) => {
            const offset = idx - 2 // -2, -1, 0, 1, 2, 3
            const isCenter = originalIndex === centerIndex
            
            return (
              <div
                key={`${card.id}-${originalIndex}`}
                className={cn(
                  "absolute transition-all duration-500 ease-out cursor-pointer",
                  isCenter ? "z-30" : "z-10"
                )}
                style={{
                  transform: `translateX(${offset * 180}px) translateY(${Math.abs(offset) * 20}px) scale(${
                    isCenter ? 1 : 0.85 - Math.abs(offset) * 0.05
                  }) rotateY(${offset * 8}deg)`,
                  opacity: 1 - Math.abs(offset) * 0.15,
                }}
                onContextMenu={(e) => {
                  e.preventDefault()
                  moveCardToBack(originalIndex)
                }}
                onClick={() => {
                  if (isCenter) {
                    moveCardToFront(originalIndex)
                  } else {
                    setCenterIndex(originalIndex)
                  }
                }}
              >
                <Card className={cn(
                  "p-4 transition-all duration-300",
                  isCenter ? "shadow-2xl border-2 border-primary" : "shadow-lg"
                )}>
                  <div className="w-64 space-y-2">
                    <div className="aspect-[2.5/3.5] relative rounded-lg overflow-hidden border-2 border-border">
                      {card.image ? (
                        <img
                          src={card.image || "/placeholder.svg"}
                          alt={card.name}
                          className="w-full h-full object-cover"
                          draggable={false}
                        />
                      ) : (
                        <div className="w-full h-full bg-muted flex items-center justify-center p-4">
                          <p className="text-lg text-center text-foreground font-bold text-balance">{card.name}</p>
                        </div>
                      )}
                    </div>
                    
                    {isCenter && (
                      <div className="text-center space-y-1">
                        <h3 className="text-sm font-bold text-balance">{card.name}</h3>
                        {card.set && <p className="text-xs text-muted-foreground">{card.set.name}</p>}
                      </div>
                    )}
                  </div>
                </Card>
              </div>
            )
          })}
        </div>
      </div>

      {/* Controls and instructions */}
      <Card className="p-4">
        <div className="space-y-3">
          <div className="text-center text-sm text-muted-foreground space-y-1">
            <p className="font-medium">
              <span className="text-foreground">Left Click:</span> Center card (or move to front if centered) •{" "}
              <span className="text-foreground">Right Click:</span> Move card to back
            </p>
            <p>
              <span className="text-foreground">Arrow Keys / Mouse Wheel:</span> Scroll through deck
            </p>
            <p className="text-xs mt-2">
              Viewing card {centerIndex + 1} of {deckOrder.length}
            </p>
          </div>
        </div>
      </Card>
    </div>
  )
}
