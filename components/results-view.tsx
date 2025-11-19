"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Trophy, CheckCircle2, XCircle, RotateCcw } from "lucide-react"
import type { PokemonCard } from "@/lib/types"
import { cn } from "@/lib/utils"

interface ResultsViewProps {
  allCards: PokemonCard[]
  prizeCards: PokemonCard[]
  onRestart: () => void
}

export function ResultsView({ allCards, prizeCards, onRestart }: ResultsViewProps) {
  const [selectedCards, setSelectedCards] = useState<Set<string>>(new Set())
  const [showResults, setShowResults] = useState(false)

  const prizeCardIds = new Set(prizeCards.map((c) => c.id))

  const toggleCard = (cardId: string) => {
    if (showResults) return // Can't change selection after revealing

    const newSelected = new Set(selectedCards)
    if (newSelected.has(cardId)) {
      newSelected.delete(cardId)
    } else {
      if (newSelected.size < 6) {
        newSelected.add(cardId)
      }
    }
    setSelectedCards(newSelected)
  }

  const handleSubmit = () => {
    setShowResults(true)
  }

  // Calculate accuracy
  const correctGuesses = Array.from(selectedCards).filter((id) => prizeCardIds.has(id)).length
  const incorrectGuesses = selectedCards.size - correctGuesses
  const missedPrizes = 6 - correctGuesses
  const accuracy = Math.round((correctGuesses / 6) * 100)

  const getCardStatus = (cardId: string) => {
    const isSelected = selectedCards.has(cardId)
    const isPrize = prizeCardIds.has(cardId)

    if (!showResults) {
      return isSelected ? "selected" : "unselected"
    }

    if (isSelected && isPrize) return "correct"
    if (isSelected && !isPrize) return "incorrect"
    if (!isSelected && isPrize) return "missed"
    return "normal"
  }

  return (
    <div className="container mx-auto max-w-7xl p-6 space-y-6">
      {/* Header */}
      <div className="text-center space-y-3">
        <h1 className="text-4xl font-bold text-balance">{showResults ? "Results" : "Identify the Prize Cards"}</h1>
        <p className="text-muted-foreground text-lg">
          {showResults ? "Here are your results!" : "Select the 6 cards you believe were prizes"}
        </p>
      </div>

      {/* Score card */}
      {showResults && (
        <Card className="p-6 bg-gradient-to-br from-primary/10 to-secondary/10 border-2">
          <div className="flex items-center justify-center gap-8 flex-wrap">
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Trophy className="h-8 w-8 text-accent" />
                <div className="text-5xl font-bold">{accuracy}%</div>
              </div>
              <div className="text-sm text-muted-foreground">Accuracy</div>
            </div>

            <div className="h-16 w-px bg-border hidden sm:block" />

            <div className="flex gap-8">
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                  <div className="text-3xl font-bold">{correctGuesses}</div>
                </div>
                <div className="text-xs text-muted-foreground">Correct</div>
              </div>

              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <XCircle className="h-5 w-5 text-destructive" />
                  <div className="text-3xl font-bold">{incorrectGuesses}</div>
                </div>
                <div className="text-xs text-muted-foreground">Wrong</div>
              </div>

              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <XCircle className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                  <div className="text-3xl font-bold">{missedPrizes}</div>
                </div>
                <div className="text-xs text-muted-foreground">Missed</div>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Selection counter */}
      {!showResults && (
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">Selected {selectedCards.size} of 6 cards</div>
            <Button
              onClick={handleSubmit}
              disabled={selectedCards.size !== 6}
              size="lg"
              className="bg-secondary text-secondary-foreground hover:bg-secondary/90"
            >
              Submit Guesses
            </Button>
          </div>
        </Card>
      )}

      {/* Card grid */}
      <Card className="p-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {allCards.map((card, index) => {
            const status = getCardStatus(card.id)
            const isClickable = !showResults

            return (
              <div
                key={`${card.id}-${index}`}
                onClick={() => isClickable && toggleCard(card.id)}
                className={cn(
                  "group relative aspect-[2.5/3.5] rounded-lg overflow-hidden transition-all",
                  isClickable && "cursor-pointer",
                  status === "selected" && "ring-4 ring-primary scale-95",
                  status === "correct" && "ring-4 ring-green-600 dark:ring-green-400",
                  status === "incorrect" && "ring-4 ring-destructive",
                  status === "missed" && "ring-4 ring-orange-600 dark:ring-orange-400 opacity-75",
                  status === "normal" && showResults && "opacity-40",
                  !showResults && "hover:scale-105",
                )}
              >
                {card.image ? (
                  <img src={card.image || "/placeholder.svg"} alt={card.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-muted flex items-center justify-center p-2">
                    <p className="text-xs text-center text-foreground font-medium">{card.name}</p>
                  </div>
                )}

                {/* Status badge */}
                {showResults && status !== "normal" && (
                  <div className="absolute top-2 right-2">
                    {status === "correct" && (
                      <Badge className="bg-green-600 dark:bg-green-400 text-white">
                        <CheckCircle2 className="h-3 w-3" />
                      </Badge>
                    )}
                    {status === "incorrect" && (
                      <Badge variant="destructive">
                        <XCircle className="h-3 w-3" />
                      </Badge>
                    )}
                    {status === "missed" && (
                      <Badge className="bg-orange-600 dark:bg-orange-400 text-white">Prize</Badge>
                    )}
                  </div>
                )}

                {/* Hover overlay */}
                {!showResults && (
                  <div
                    className={cn(
                      "absolute inset-0 transition-opacity flex items-center justify-center p-2",
                      status === "selected"
                        ? "bg-primary/20 opacity-100"
                        : "bg-black/70 opacity-0 group-hover:opacity-100",
                    )}
                  >
                    <p className="text-xs text-white text-center font-medium">{card.name}</p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </Card>

      {/* Legend */}
      {showResults && (
        <Card className="p-4">
          <div className="flex flex-wrap items-center justify-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded border-4 border-green-600 dark:border-green-400" />
              <span>Correct Guess</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded border-4 border-destructive" />
              <span>Wrong Guess</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded border-4 border-orange-600 dark:border-orange-400" />
              <span>Missed Prize</span>
            </div>
          </div>
        </Card>
      )}

      {/* Restart button */}
      {showResults && (
        <Button onClick={onRestart} size="lg" className="w-full bg-transparent" variant="outline">
          <RotateCcw className="mr-2 h-5 w-5" />
          Play Again
        </Button>
      )}
    </div>
  )
}
