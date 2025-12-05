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
import { FloatingGameVolume } from "@/components/music-player"

type Stage = "import" | "game" | "results"

const GAME_DURATION = 120 // seconds – keep in sync with DeckView

// 🔹 Featured deck text that should be auto-imported on load
const DEFAULT_FEATURED_DECK_TEXT = `Pokémon: 26
2 Charmander PAF 7
1 Charmander PFL 11
1 Charmeleon PFL 12
2 Charizard ex OBF 125
3 Hoothoot SCR 114
3 Noctowl SCR 115
1 Pidgey MEW 16
1 Pidgey OBF 162
2 Pidgeot ex OBF 164
2 Duskull PRE 35
1 Dusclops PRE 36
1 Dusknoir PRE 37
2 Terapagos ex SCR 128
2 Fan Rotom SCR 118
1 Fezandipiti ex SFA 38
1 Klefki SVI 96

Trainer: 27
4 Dawn PFL 87
2 Iono PAL 185
2 Boss's Orders MEG 114
1 Briar SCR 132
4 Buddy-Buddy Poffin TEF 144
4 Nest Ball SVI 181
4 Rare Candy MEG 125
1 Ultra Ball MEG 131
1 Super Rod PAL 188
1 Night Stretcher SFA 61
1 Prime Catcher TEF 157
2 Area Zero Underdepths SCR 131

Energy: 7
5 Fire Energy MEE 2
2 Jet Energy PAL 190`

export default function HomePage() {
  const [stage, setStage] = useState<Stage>("import")
  // Track if user has seen initial import (to avoid repeating auto-import)
  const [hasSeenInitialImport, setHasSeenInitialImport] = useState(false)


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
    setPlayDeck(deck) // 46 in deck
    setHand(hand) // 8 in hand
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
    if (hasSeenInitialImport) {
    startShuffleAnimation()
  } else {
    setHasSeenInitialImport(true)
  }
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
  const handleRestartGame = () => {
    if (fullDeck.length === 0) return

    setupNewGameFromDeck(fullDeck)
    startPreGameCountdown()
  }

  // Go back to import screen (for "Import new list" button on results)
  const handleGoToImport = () => {
    setStage("import")
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-50">
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
            canStartGame={playDeck.length > 0}
            onStartGame={handleStartGame}
            // 🔹 new props for auto-import + title bar
            initialText={DEFAULT_FEATURED_DECK_TEXT}
            autoImportOnMount
            deckTitle="Charizard Noctowl"
            deckPlayer="Nicolai Stiborg"
          />
        )}

        {stage === "game" && (
          <>
            <DeckView
              deck={playDeck}
              hand={hand}
              onTimeUp={handleTimeUp}
              onEndEarly={handleTimeUp}
              onRestartGame={handleRestartGame}
            />
            {/* Vertical floating volume slider only during game */}
            <FloatingGameVolume />
          </>
        )}

        {stage === "results" && (
          <ResultsView
            allCards={[...playDeck, ...hand, ...prizeCards]}
            prizeCards={prizeCards}
            onRestart={handleRestartGame}
            onImportNewList={handleGoToImport}
            timeLeft={null}
            totalTime={GAME_DURATION}
          />
        )}
      </div>

      {/* Footer visible on import + results, hidden during game */}
      {stage !== "game" && <SiteFooter />}
    </div>
  )
}
