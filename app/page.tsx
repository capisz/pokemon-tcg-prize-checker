"use client"

import { useState } from "react"
import { DeckImport } from "@/components/deck-import"
import { DeckView } from "@/components/deck-view"
import { ResultsView } from "@/components/results-view"
import type { PokemonCard } from "@/lib/types"
import { dealCards } from "@/lib/shuffle"
import { LoadingOverlay } from "@/components/loading-overlay"
import { CountdownOverlay } from "@/components/countdown-overlay"
import { SiteFooter } from "@/components/site-footer"

type Stage = "import" | "game" | "results"

const GAME_DURATION = 120 // seconds – keep in sync with DeckView

export default function HomePage() {
  const [stage, setStage] = useState<Stage>("import")

  // Full imported deck (52) so we can reshuffle new combos
  const [fullDeck, setFullDeck] = useState<PokemonCard[]>([])

  // Current game state
  const [playDeck, setPlayDeck] = useState<PokemonCard[]>([])
  const [hand, setHand] = useState<PokemonCard[]>([])
  const [prizeCards, setPrizeCards] = useState<PokemonCard[]>([])

  // Shuffle overlay (riffle + progress bar)
  const [isShuffling, setIsShuffling] = useState(false)
  const [shuffleProgress, setShuffleProgress] = useState(0)

  // Pre-game countdown overlay (pokeball + 3-2-1)
  const [preGameCount, setPreGameCount] = useState<number | null>(null)

  const startShuffleAnimation = () => {
    setIsShuffling(true)
    setShuffleProgress(0)

    const totalDuration = 3000 // ~3 seconds
    const tick = 50
    let elapsed = 0

    const timer = window.setInterval(() => {
      elapsed += tick
      const ratio = Math.min(1, elapsed / totalDuration)
      const next = Math.round(ratio * 100)

      setShuffleProgress(next)

      if (ratio >= 1) {
        window.clearInterval(timer)
        setIsShuffling(false)
      }
    }, tick)
  }

  // Deal a fresh game (deck / hand / prizes) from a given full deck
  const setupNewGameFromDeck = (sourceDeck: PokemonCard[]) => {
    const { deck, prizes, hand } = dealCards(sourceDeck)
    setPlayDeck(deck)     // 46 in deck
    setHand(hand)         // 8 in hand
    setPrizeCards(prizes) // 6 prizes
  }

  // Shared 3-2-1 pokeball countdown
  const startPreGameCountdown = () => {
    if (preGameCount !== null) return // already counting

    let current = 3
    setPreGameCount(current)

    const timer = window.setInterval(() => {
      current -= 1

      if (current <= 0) {
        window.clearInterval(timer)
        setPreGameCount(null)
        setStage("game")
      } else {
        setPreGameCount(current)
      }
    }, 1000)
  }

  // When a deck is first imported from text
  const handleDeckImported = (importedFullDeck: PokemonCard[]) => {
    setFullDeck(importedFullDeck)

    // Create initial game state from this deck
    setupNewGameFromDeck(importedFullDeck)

    // Show riffle shuffle overlay
    startShuffleAnimation()
  }

  // When user presses Start Game from the import screen
  const handleStartGame = () => {
    if (playDeck.length === 0) return
    startPreGameCountdown()
  }

  // When timer ends or user hits "End game"
  const handleTimeUp = () => {
    setStage("results")
  }

  // New: restart the game (from in-game or results)
  // Re-shuffles a new combo from the same imported deck,
  // then shows the pokeball 3-2-1 overlay again.
  const handleRestartGame = () => {
    if (fullDeck.length === 0) return

    setupNewGameFromDeck(fullDeck)
    startPreGameCountdown()
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      {/* Riffle shuffle + progress bar while importing */}
      <LoadingOverlay
        visible={isShuffling}
        progress={shuffleProgress}
        message="Shuffling & importing your deck"
      />

      {/* 3-2-1 pokeball countdown when starting / restarting the game */}
      <CountdownOverlay
        visible={preGameCount !== null}
        count={preGameCount}
      />

      {stage === "import" && (
        <DeckImport
          onDeckImported={handleDeckImported}
          canStartGame={playDeck.length > 0}
          onStartGame={handleStartGame}
        />
      )}

      {stage === "game" && (
        <DeckView
          deck={playDeck}
          hand={hand}
          onTimeUp={handleTimeUp}
          onEndEarly={handleTimeUp}      // End game button
          onRestartGame={handleRestartGame} // NEW: restart button
        />
      )}

      {stage === "results" && (
        <ResultsView
          allCards={[...playDeck, ...hand, ...prizeCards]}
          prizeCards={prizeCards}
          onRestart={handleRestartGame} // Play Again does the same restart flow
          timeLeft={null}
          totalTime={GAME_DURATION}
        />
      )}
       <SiteFooter />
    </div>
  )
}
