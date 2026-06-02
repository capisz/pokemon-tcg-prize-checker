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
import { cn } from "@/lib/utils"
import { FEATURED_DECKS } from "@/lib/featured-decks"

type Stage = "import" | "game" | "results"

const GAME_DURATION = 120 // seconds – keep in sync with DeckView

export default function HomePage() {
  const [stage, setStage] = useState<Stage>("import")
  const [hasSeenInitialImport, setHasSeenInitialImport] = useState(false)
  const [hasImportedDeck, setHasImportedDeck] = useState(false)

  // how many seconds were left when the game ended
  const [timeLeft, setTimeLeft] = useState<number | null>(null)

  // Full imported deck (so we can reshuffle new games)
  const [fullDeck, setFullDeck] = useState<PokemonCard[]>([])

  // Current game state
  const [playDeck, setPlayDeck] = useState<PokemonCard[]>([])
  const [hand, setHand] = useState<PokemonCard[]>([])
  const [prizeCards, setPrizeCards] = useState<PokemonCard[]>([])

  // Shuffle overlay
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
    setPlayDeck(deck)   // 46 in deck
    setHand(hand)       // 8 in hand
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
    setHasImportedDeck(true)
    setFullDeck(importedFullDeck)
    setupNewGameFromDeck(importedFullDeck)

    // On the very first auto-import, skip the riffle overlay
    if (hasSeenInitialImport) {
      startShuffleAnimation()
    } else {
      setHasSeenInitialImport(true)
    }
  }

  const handleFeaturedDeckSelected = (featuredFullDeck: PokemonCard[]) => {
    setFullDeck(featuredFullDeck)
    setupNewGameFromDeck(featuredFullDeck)

    if (!hasSeenInitialImport) {
      setHasSeenInitialImport(true)
    }
  }

  // When user presses Start Game from the import screen
  const handleStartGame = () => {
    if (!hasImportedDeck) return
    if (playDeck.length === 0) return
    startPreGameCountdown()
  }

  // NEW: called when the game ends (timer hits 0 OR user clicks Guess Prizes)
  const handleGameFinished = (remaining: number) => {
    setTimeLeft(remaining)
    setStage("results")
  }

 // Restart the game from the same full deck
const handleRestartGame = () => {
  if (fullDeck.length === 0) {
    setStage("import")
    return
  }

  // Deal a fresh game
  setupNewGameFromDeck(fullDeck)

  // Reset timer state for results view
  setTimeLeft(null)

  // 🔹 Only show the Pidgeot countdown — no shuffle overlay
  startPreGameCountdown()
}


  return (
    <div
      className={cn(
        "min-h-screen flex flex-col text-slate-50",
        stage === "results"
          ? "bg-gradient-to-b from-slate-600/40 via-slate-900 to-slate-700" // lighter for results
          : "bg-gradient-to-b from-slate-850 via-slate-800 to-slate-850",    // default theme
      )}
    >
      {/* Main content area */}
      <div className="flex-1 relative">
        {/* Riffle shuffle overlay */}
        <LoadingOverlay
          visible={isShuffling}
          progress={shuffleProgress}
          message="Shuffling & importing your deck"
        />

        {/* 3-2-1 countdown */}
        <CountdownOverlay visible={preGameCount !== null} count={preGameCount} />

        {stage === "import" && (
          <DeckImport
            onDeckImported={handleDeckImported}
            onFeaturedDeckSelected={handleFeaturedDeckSelected}
            canStartGame={hasImportedDeck && playDeck.length > 0}
            onStartGame={handleStartGame}
            featuredDecks={FEATURED_DECKS}
          />
        )}

        {stage === "game" && (
          <>
            <DeckView
              deck={playDeck}
              hand={hand}
              onTimeUp={handleGameFinished}
              onEndEarly={handleGameFinished}
              onRestartGame={handleRestartGame}
            />
          </>
        )}

        {stage === "results" && (
          <ResultsView
            allCards={[...playDeck, ...hand, ...prizeCards]}
            prizeCards={prizeCards}
            onRestart={handleRestartGame}
            timeLeft={timeLeft}
            totalTime={GAME_DURATION}
          />
        )}
      </div>

      {/* Footer visible on import + results, hidden during game */}
      {stage !== "game" && <SiteFooter />}
    </div>
  )
}
