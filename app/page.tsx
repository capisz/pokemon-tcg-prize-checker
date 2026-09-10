"use client"

import { useCallback, useEffect, useReducer, useState } from "react"
import { PracticeProvider, usePractice } from "@/components/practice-context"
import { currentAccount } from "@/lib/firebase/client"
import { DeckImport } from "@/components/deck-import"
import { DeckView } from "@/components/deck-view"
import { ResultsView } from "@/components/results-view"
import type { PokemonCard } from "@/lib/types"
import { dealCards } from "@/lib/shuffle"
import { CountdownOverlay } from "@/components/countdown-overlay"
import { SiteFooter } from "@/components/site-footer"
import { cn } from "@/lib/utils"
import { FEATURED_DECKS } from "@/lib/featured-decks"
import { GAME_DURATION, remainingSeconds } from "@/lib/game"
import { initialSession, sessionReducer } from "@/lib/session"

export default function HomePage() { return <PracticeProvider><PracticePage /></PracticeProvider> }
function PracticePage() {
  const {duration,setRoundUid} = usePractice()
  const [session, dispatch] = useReducer(sessionReducer, initialSession)
  const [fullDeck, setFullDeck] = useState<PokemonCard[]>([])
  const [count, setCount] = useState(3)
  const invalidateImport = useCallback(() => setFullDeck([]), [])
  const acceptImport = useCallback((cards: PokemonCard[]) => setFullDeck(cards), [])
  const finish = useCallback((timeLeft: number) => dispatch({ type: "finish", timeLeft }), [])

  useEffect(() => {
    if (session.phase !== "countdown") return
    const deadline = Date.now() + 3000
    setCount(3)
    const tick = () => {
      const remaining = remainingSeconds(deadline, Date.now())
      setCount(remaining)
      if (remaining === 0) dispatch({ type: "ready" })
    }
    const timer = window.setInterval(tick, 100)
    return () => window.clearInterval(timer)
  }, [session.phase])

  const startGame = () => {
    if (fullDeck.length !== 60 || session.phase === "countdown") return
    setCount(3)
    setRoundUid(currentAccount()?.uid || null)
    dispatch({ type: "start", deal: dealCards(fullDeck) })
  }
  const importNewList = () => {
    setFullDeck([])
    dispatch({ type: "import" })
  }
  const isResults = session.phase === "guessing" || session.phase === "summary"

  return (
    <div className={cn("min-h-screen flex flex-col text-slate-50",
      isResults ? "bg-gradient-to-b from-slate-600/40 via-slate-900 to-slate-700"
        : "bg-gradient-to-b from-slate-850 via-slate-800 to-slate-850")}
    >
      <main className="flex-1 relative">
        <CountdownOverlay visible={session.phase === "countdown"} count={session.phase === "countdown" ? count : null} />
        {session.phase === "import" && (
          <DeckImport
            onDeckImported={acceptImport}
            onImportInvalidated={invalidateImport}
            canStartGame={fullDeck.length === 60}
            onStartGame={startGame}
            featuredDecks={FEATURED_DECKS}
          />
        )}
        {session.phase === "inspection" && session.deal && (
          <DeckView duration={duration} deck={session.deal.deck} hand={session.deal.hand}
            onTimeUp={finish} onEndEarly={finish} onRestartGame={startGame} />
        )}
        {isResults && session.deal && (
          <ResultsView
            allCards={[...session.deal.deck, ...session.deal.hand, ...session.deal.prizes]}
            prizeCards={session.deal.prizes}
            onRestart={startGame}
            onImportNewList={importNewList}
            onSubmitted={() => dispatch({ type: "submit" })}
            timeLeft={session.timeLeft}
            totalTime={duration}
          />
        )}
      </main>
      {session.phase !== "inspection" && session.phase !== "countdown" && <SiteFooter />}
    </div>
  )
}
