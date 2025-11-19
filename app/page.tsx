"use client"

import { useState } from "react"
import { DeckImport } from "@/components/deck-import"
import { DeckView } from "@/components/deck-view"
import { ResultsView } from "@/components/results-view"
import { dealCards } from "@/lib/shuffle"
import type { PokemonCard, GameState } from "@/lib/types"

export default function HomePage() {
  const [gameState, setGameState] = useState<GameState>({
    allCards: [],
    hand: [],
    prizes: [],
    deck: [],
    currentCardIndex: 0,
    timeRemaining: 120,
    phase: "import",
    selectedCards: new Set(),
  })

  const handleImportComplete = (cards: PokemonCard[]) => {
    const { hand, prizes, deck } = dealCards(cards)

    setGameState({
      allCards: cards,
      hand,
      prizes,
      deck,
      currentCardIndex: 0,
      timeRemaining: 120,
      phase: "playing",
      selectedCards: new Set(),
    })
  }

  const handleTimeUp = () => {
    setGameState((prev) => ({ ...prev, phase: "results" }))
  }

  const handleRestart = () => {
    setGameState({
      allCards: [],
      hand: [],
      prizes: [],
      deck: [],
      currentCardIndex: 0,
      timeRemaining: 120,
      phase: "import",
      selectedCards: new Set(),
    })
  }

  return (
    <main className="min-h-screen bg-background">
      {gameState.phase === "import" && <DeckImport onImportComplete={handleImportComplete} />}

      {gameState.phase === "playing" && (
        <DeckView deck={[...gameState.hand, ...gameState.deck]} onTimeUp={handleTimeUp} />
      )}

      {gameState.phase === "results" && (
        <ResultsView allCards={gameState.allCards} prizeCards={gameState.prizes} onRestart={handleRestart} />
      )}
    </main>
  )
}
