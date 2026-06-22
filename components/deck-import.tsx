"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { FeaturedDeckSection } from "@/components/featured-deck"
import { HelpCircle, X } from "lucide-react"
import type { FeaturedDeckDefinition } from "@/lib/featured-decks"
import {
  getDeckImportSecurityError,
  MAX_DECK_TEXT_LENGTH,
  parseDeckCardLine,
  parseDeckSectionHeading,
  type DeckSection,
} from "@/lib/deck-import-security"

type ImportedCard = {
  id: string
  name: string
  image?: string
  set: string
  number: string | number
}

type FeaturedCard = ImportedCard & {
  count: number
}

type CardLookupResult = {
  cards: ImportedCard[]
  missingIds: string[]
}

type ParsedDeckText = {
  fullIds: string[]
  uniqueIds: string[]
  counts: Map<string, number>
  totalCount: number
  sectionCounts: Record<DeckSection, number>
}

interface DeckImportProps {
  onDeckImported?: (cards: ImportedCard[]) => void
  onImportComplete?: (cards: ImportedCard[]) => void
  onFeaturedDeckSelected?: (cards: ImportedCard[]) => void
  onTextChange?: (value: string) => void
  onStartGame?: () => void
  canStartGame?: boolean

  /** Optional: for the green title bar above the list */
  deckTitle?: string
  deckPlayer?: string

  featuredDecks?: FeaturedDeckDefinition[]
}

export function DeckImport(props: DeckImportProps) {
  const {
    onDeckImported,
    onImportComplete,
    onFeaturedDeckSelected,
    onTextChange,
    onStartGame,
    canStartGame,
    deckTitle,
    deckPlayer,
    featuredDecks = [],
  } = props

  // Fallbacks until wired to Limitless/API
  const effectiveDeckTitle = deckTitle ?? "Imported Deck"
  const effectiveDeckPlayer = deckPlayer ?? ""

  const [rawText, setRawText] = useState("")
  const [previewCards, setPreviewCards] = useState<FeaturedCard[]>([])
  const [hoveredCard, setHoveredCard] = useState<ImportedCard | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isFeaturedLoading, setIsFeaturedLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasValidImport, setHasValidImport] = useState(false)
  const [hasHydratedFeaturedDecks, setHasHydratedFeaturedDecks] = useState(false)
  const [activeListMode, setActiveListMode] = useState<"featured" | "custom">("featured")
  const [featuredDeckIndex, setFeaturedDeckIndex] = useState(0)
  const [featuredDeckCards, setFeaturedDeckCards] = useState<Record<string, FeaturedCard[]>>({})
  const [featuredDeckExpandedDecks, setFeaturedDeckExpandedDecks] = useState<Record<string, ImportedCard[]>>({})
  const selectedFeaturedDeckRef = React.useRef<string | null>(null)

// Help overlay state – default closed; we'll auto-open based on localStorage
  const [showHelpOverlay, setShowHelpOverlay] = useState(false)

  function parseIdsFromText(text: string): ParsedDeckText {
    const fullIds: string[] = []
    const counts = new Map<string, number>()
    const sectionCounts: Record<DeckSection, number> = {
      pokemon: 0,
      trainer: 0,
      energy: 0,
      unknown: 0,
    }
    let currentSection: DeckSection = "unknown"
    let totalCount = 0

    const lines = text.split(/\r?\n/)

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed) continue

      const nextSection = parseDeckSectionHeading(trimmed)
      if (nextSection) {
        currentSection = nextSection
        continue
      }

      const cardLine = parseDeckCardLine(trimmed)
      if (cardLine) {
        const cardId = `${cardLine.setCode}-${cardLine.number}`

        totalCount += cardLine.count
        sectionCounts[currentSection] += cardLine.count

        for (let i = 0; i < cardLine.count; i++) {
          fullIds.push(cardId)
        }
        counts.set(cardId, (counts.get(cardId) || 0) + cardLine.count)
      }
    }

    const uniqueIds = Array.from(new Set(fullIds))

    return {
      fullIds,
      uniqueIds,
      counts,
      totalCount,
      sectionCounts,
    }
  }

  function getDeckValidationError(parsed: ParsedDeckText) {
    if (!parsed.uniqueIds.length) {
      return "Couldn't find any card IDs like PAF 7 / OBF 162 in the text. Make sure lines look like '4 Charmander PAF 7'."
    }

    if (parsed.sectionCounts.unknown > 0) {
      return "Every card must appear under a Pokemon, Trainer, or Energy heading."
    }

    if (parsed.sectionCounts.pokemon < 1) {
      return "Deck list must include at least 1 Pokemon."
    }

    if (parsed.sectionCounts.energy < 1) {
      return "Deck list must include at least 1 Energy card."
    }

    if (parsed.totalCount !== 60) {
      return `Deck list must total exactly 60 cards. This list currently totals ${parsed.totalCount}.`
    }

    return null
  }

  function buildCardById(cards: ImportedCard[]) {
    const cardById = new Map<string, ImportedCard>()
    for (const card of cards) {
      cardById.set(card.id.toLowerCase(), card)
    }
    return cardById
  }

  function getFallbackCard(id: string, index?: number): ImportedCard {
    const [setCode, num] = id.split("-")
    return {
      id: index == null ? id : `${id}#${index}`,
      name: `Card ${setCode.toUpperCase()} ${num.toUpperCase()}`,
      set: setCode.toUpperCase(),
      number: num.toUpperCase(),
    }
  }

  function buildExpandedDeck(fullIds: string[], cardById: Map<string, ImportedCard>) {
    return fullIds.map((id, index) => {
      const base = cardById.get(id.toLowerCase())
      if (base) {
        return {
          ...base,
          id: `${base.id}#${index}`,
        }
      }

      return getFallbackCard(id, index)
    })
  }

  function buildPreviewCards(
    uniqueIds: string[],
    counts: Map<string, number>,
    cardById: Map<string, ImportedCard>,
  ): FeaturedCard[] {
    return uniqueIds.map((id) => ({
      ...(cardById.get(id.toLowerCase()) ?? getFallbackCard(id)),
      count: counts.get(id) ?? 1,
    }))
  }

  async function fetchCardsByIds(ids: string[]): Promise<CardLookupResult> {
    const response = await fetch("/api/cards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
    })

    if (!response.ok) throw new Error("Failed to fetch cards")

    const data = await response.json()
    return {
      cards: Array.isArray(data.cards) ? (data.cards as ImportedCard[]) : [],
      missingIds: Array.isArray(data.missingIds)
        ? data.missingIds.filter((id: unknown): id is string => typeof id === "string")
        : [],
    }
  }

  async function hydrateFeaturedDecks() {
    if (!featuredDecks.length || hasHydratedFeaturedDecks || isFeaturedLoading) return

    setIsFeaturedLoading(true)

    try {
      const parsedFeaturedDecks = featuredDecks.map((deck) => ({
        deck,
        parsed: parseIdsFromText(deck.importText),
      }))

      const requestIds = Array.from(
        new Set(parsedFeaturedDecks.flatMap(({ parsed }) => parsed.uniqueIds)),
      )

      const { cards: fetchedCards, missingIds } = await fetchCardsByIds(requestIds)
      if (missingIds.length) {
        throw new Error("Featured deck data contains unrecognized card IDs.")
      }
      const cardById = buildCardById(fetchedCards)
      const nextFeaturedCards: Record<string, FeaturedCard[]> = {}
      const nextFeaturedExpandedDecks: Record<string, ImportedCard[]> = {}

      for (const { deck, parsed } of parsedFeaturedDecks) {
        nextFeaturedCards[deck.id] = buildPreviewCards(
          parsed.uniqueIds,
          parsed.counts,
          cardById,
        )
        nextFeaturedExpandedDecks[deck.id] = buildExpandedDeck(
          parsed.fullIds,
          cardById,
        )
      }

      setFeaturedDeckCards(nextFeaturedCards)
      setFeaturedDeckExpandedDecks(nextFeaturedExpandedDecks)
      setHasHydratedFeaturedDecks(true)
    } catch (err: any) {
      console.error(err)
      setError(err.message ?? "Something went wrong loading featured decks.")
    } finally {
      setIsFeaturedLoading(false)
    }
  }

  async function handleImport() {
    setError(null)

    const securityError = getDeckImportSecurityError(rawText)
    if (securityError) {
      setPreviewCards([])
      setHasValidImport(false)
      setError(securityError)
      return
    }

    const parsed = parseIdsFromText(rawText)
    const validationError = getDeckValidationError(parsed)

    if (validationError) {
      setPreviewCards([])
      setHasValidImport(false)
      setError(validationError)
      return
    }

    setIsLoading(true)

    try {
      const { cards: fetchedCards, missingIds } = await fetchCardsByIds(parsed.uniqueIds)
      if (missingIds.length) {
        throw new Error(`Unrecognized card codes: ${missingIds.join(", ").toUpperCase()}`)
      }
      const cardById = buildCardById(fetchedCards)
      const expandedDeck = buildExpandedDeck(parsed.fullIds, cardById)
      const preview = buildPreviewCards(parsed.uniqueIds, parsed.counts, cardById)

      setPreviewCards(preview)
      setHoveredCard(preview[0] ?? null)
      setActiveListMode("custom")
      setHasValidImport(true)
      selectedFeaturedDeckRef.current = null

      onDeckImported?.(expandedDeck)
      onImportComplete?.(expandedDeck)
    } catch (err: any) {
      console.error(err)
      setHasValidImport(false)
      setError(err.message ?? "Something went wrong importing the deck.")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
  if (typeof window === "undefined") return

  const hasSeenHelp = window.localStorage.getItem("pcd_has_seen_help")

  // If they've never seen it, show once and mark as seen
  if (!hasSeenHelp) {
    setShowHelpOverlay(true)
    window.localStorage.setItem("pcd_has_seen_help", "true")
  }
  }, [])

  useEffect(() => {
    void hydrateFeaturedDecks()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [featuredDecks.length])

  useEffect(() => {
    if (featuredDecks.length <= 1) return

    const timer = window.setInterval(() => {
      setFeaturedDeckIndex((current) => (current + 1) % featuredDecks.length)
    }, 10000)

    return () => window.clearInterval(timer)
  }, [featuredDecks.length])

  const handleTextChange = (value: string) => {
    const nextValue = value.slice(0, MAX_DECK_TEXT_LENGTH)
    setRawText(nextValue)
    setHasValidImport(false)
    onTextChange?.(nextValue)
  }

  const currentFeaturedDeck = featuredDecks[featuredDeckIndex]
  const currentFeaturedDeckId = currentFeaturedDeck?.id
  const currentFeaturedCards =
    currentFeaturedDeckId ? featuredDeckCards[currentFeaturedDeckId] ?? [] : []
  const shouldShowFeaturedLoading =
    featuredDecks.length > 0 &&
    !hasHydratedFeaturedDecks &&
    !currentFeaturedCards.length
  const currentFeaturedExpandedDeck =
    currentFeaturedDeckId ? featuredDeckExpandedDecks[currentFeaturedDeckId] ?? [] : []
  const displayedCards =
    activeListMode === "custom" ? previewCards : currentFeaturedCards
  const displayedDeckTitle =
    activeListMode === "custom"
      ? effectiveDeckTitle
      : currentFeaturedDeck?.title ?? effectiveDeckTitle
  const displayedDeckPlayer =
    activeListMode === "custom"
      ? effectiveDeckPlayer
      : currentFeaturedDeck?.player ?? effectiveDeckPlayer
  const displayedDeckKey =
    activeListMode === "custom" ? "custom" : currentFeaturedDeckId ?? "featured"
  const needsDeckText = rawText.trim().length === 0
  const canAttemptImport = !needsDeckText && !isLoading

  useEffect(() => {
    if (activeListMode !== "featured") return
    if (!currentFeaturedDeckId || !currentFeaturedExpandedDeck.length) return

    setHoveredCard(currentFeaturedCards[0] ?? null)

    if (selectedFeaturedDeckRef.current === currentFeaturedDeckId) return
    selectedFeaturedDeckRef.current = currentFeaturedDeckId
    onFeaturedDeckSelected?.(currentFeaturedExpandedDeck)
  }, [
    activeListMode,
    currentFeaturedDeckId,
    currentFeaturedCards,
    currentFeaturedExpandedDeck,
    onFeaturedDeckSelected,
  ])

  return (
    <div className="flex flex-col items-center px-4 py-10 text-slate-50">
      <div className="w-full max-w-6xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          {/* Left: title + mascot */}
          <div className="flex items-center gap-3">
            <img
              src="/sprite1_vector.svg"
              alt="PrizeCheckDrill mascot"
              className="
                h-24 w-30 md:h-12 md:w-18
                mascot-bob
                drop-shadow-[0_0_8px_rgba(52,211,153,0.6)]
              "
              style={{ imageRendering: "pixelated" }}
            />
            <div className="flex flex-col">
              <h1 className="text-2xl font-semibold text-emerald-300">
                PrizeCheck.us
              </h1>
              <p className="text-xs sm:text-sm text-slate-400">
                Paste your deck list and test how well you remember your prizes.{" "}
                Find importable lists at{" "}
                <a
                  href="https://limitlesstcg.com/decks/lists"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sky-200 hover:text-sky-300"
                  aria-label="LimitlessTCG"
                >
                  LimitlessTCG
                </a>
                .
              </p>
            </div>
          </div>

       {/* Right: help icon + Import button */}
<div className="flex items-center gap-3">
 <button
  type="button"
  onClick={() => setShowHelpOverlay(true)}
  className="text-slate-400 hover:text-emerald-300 transition-transform duration-150 hover:scale-110 focus:outline-none"
  aria-label="How to use PrizeCheckDrillr.io"
>
  <HelpCircle className="h-5 w-5" />
</button>


  <div className="group relative">
    <Button
      size="sm"
      aria-disabled={!canAttemptImport}
      onClick={(event) => {
        if (!canAttemptImport) {
          event.preventDefault()
          return
        }

        void handleImport()
      }}
      className={cn(
        "rounded-full font-semibold shadow-md transition-transform duration-150 active:scale-95",
        canAttemptImport
          ? "bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/30"
          : "bg-emerald-950/80 text-emerald-200/80 border border-emerald-500/35 shadow-[0_0_14px_rgba(16,185,129,0.2)] cursor-not-allowed hover:bg-emerald-900/80 hover:text-emerald-100 hover:shadow-[0_0_18px_rgba(16,185,129,0.32)]",
      )}
    >
      {isLoading ? "Importing..." : "Import Deck"}
    </Button>
    {needsDeckText && (
      <div className="pointer-events-none absolute left-1/2 top-full z-20 mt-2 w-max max-w-[220px] -translate-x-1/2 translate-y-1 rounded-md border border-emerald-500/30 bg-slate-950/95 px-3 py-1.5 text-[11px] font-medium text-emerald-100 opacity-0 shadow-lg shadow-black/40 transition-all duration-200 group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:translate-y-0 group-focus-within:opacity-100">
        Put a valid deck list in the box first
      </div>
    )}
  </div>
</div>


        </div>

        {/* Text area */}
        <Card
          className={cn(
            "relative bg-slate-900/35 border py-0 transition-all duration-300",
            hasValidImport
              ? "border-emerald-400/80 shadow-[0_0_20px_rgba(52,211,153,0.45)]"
              : "border-emerald-900/25 shadow-[0_0_10px_rgba(16,185,129,0.18)]",
          )}
        >
          <div className={cn("p-3", hasValidImport && "pb-6")}>
            <Textarea
              rows={5}
              maxLength={MAX_DECK_TEXT_LENGTH}
              value={rawText}
              onChange={(e) => handleTextChange(e.target.value)}
              className="bg-transparent border-0 focus-visible:ring-0 text-sm font-mono text-slate-100 resize-none"
              placeholder="Paste deck list here..."
            />
            {error && (
              <p className="mt-2 text-xs text-rose-400">{error}</p>
            )}
          </div>
          {hasValidImport && !error && (
            <p
              aria-live="polite"
              className="pointer-events-none absolute bottom-2 right-3 text-[11px] font-medium text-emerald-300"
            >
              valid deck import
            </p>
          )}
        </Card>

        {/* Featured deck banner */}
        <FeaturedDeckSection
          deckId={currentFeaturedDeck?.id ?? "custom"}
          title={currentFeaturedDeck?.title ?? effectiveDeckTitle}
          sourceUrl={currentFeaturedDeck?.sourceUrl ?? "https://limitlesstcg.com/decks/lists"}
          importText={currentFeaturedDeck?.importText ?? rawText}
          playedBy={currentFeaturedDeck?.playedBy}
          cards={currentFeaturedCards}
          loading={
            !currentFeaturedCards.length &&
            (isFeaturedLoading || shouldShowFeaturedLoading)
          }
        />

        {/* Deck list + hover preview */}
        {displayedCards.length > 0 && (
          <div
            key={displayedDeckKey}
            className="deck-list-fade-in flex flex-col md:flex-row gap-6 mt-2 outer-glow-emerald-900 border-emerald-500/50"
          >
            {/* LIST: now has its own dark-green title bar INSIDE the card */}
            <div className="flex-1 max-h-[420px] rounded-lg border border-slate-800 bg-slate-900/70 flex flex-col">
              {/* Title bar that feels like part of the list */}
              <div className="px-4 py-2 border-b border-slate-800 bg-emerald-300/35 rounded-t-lg">
                <p className="text-xs sm:text-sm font-semibold text-emerald-100">
                  {displayedDeckTitle}
                  {displayedDeckPlayer && (
                    <span className="font-normal text-emerald-300">
                      {" "}
                      by {displayedDeckPlayer}
                    </span>
                  )}
                </p>
              </div>

              {/* Scrollable list body */}
              <div className="flex-1 overflow-y-auto">
                {displayedCards.map((card, index) => {
                  const count = card.count
                  const isHovered = hoveredCard?.id === card.id
                  const isEvenRow = index % 2 === 0

                  return (
                    <div
                      key={card.id}
                      onMouseEnter={() => setHoveredCard(card)}
                      className={cn(
                        "flex items-center justify-between px-4 py-2 text-sm border-b border-slate-800/60 last:border-b-0 cursor-pointer transition-colors",
                        // zebra rows
                        isEvenRow ? "bg-slate-800/20" : "bg-slate-900/90",
                        // hover / active
                        "hover:bg-emerald-700/60",
                        isHovered && "bg-emerald-900/90",
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-7 text-right text-slate-400">
                          {count}×
                        </span>
                        <span className="text-slate-50">{card.name}</span>
                      </div>
                      <span className="text-[11px] text-slate-500">
                        {card.set.toUpperCase()} • {card.number}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Hover preview on the right */}
            <div className="w-full md:w-64 shrink-0 flex flex-col items-center justify-start">
              {onStartGame && (
                <div className="group relative mb-4">
                  <Button
                    type="button"
                    size="sm"
                    aria-disabled={!canStartGame}
                    className={cn(
                      "rounded-full px-7 font-semibold transition-all",
                      canStartGame
                        ? "bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-md shadow-emerald-500/30 drop-shadow-[0_0_10px_rgba(52,211,153,0.5)]"
                        : "bg-emerald-950/80 text-emerald-200/80 border border-emerald-500/35 shadow-[0_0_14px_rgba(16,185,129,0.2)] cursor-not-allowed hover:bg-emerald-900/80 hover:text-emerald-100 hover:shadow-[0_0_18px_rgba(16,185,129,0.32)]",
                    )}
                    onClick={(event) => {
                      if (!canStartGame) {
                        event.preventDefault()
                        return
                      }

                      onStartGame()
                    }}
                  >
                    Start Game
                  </Button>
                  {!canStartGame && (
                    <div className="pointer-events-none absolute left-1/2 top-full z-20 mt-2 w-max max-w-[220px] -translate-x-1/2 translate-y-1 rounded-md border border-emerald-500/30 bg-slate-950/95 px-3 py-1.5 text-[11px] font-medium text-emerald-100 opacity-0 shadow-lg shadow-black/40 transition-all duration-200 group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:translate-y-0 group-focus-within:opacity-100">
                      Import a valid deck to start
                    </div>
                  )}
                </div>
              )}

              {hoveredCard ? (
                <>
                  <div className="aspect-[2.5/3.5] w-full rounded-xl overflow-hidden border border-slate-700 bg-slate-900 shadow-lg">
                    {hoveredCard.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={hoveredCard.image}
                        alt={hoveredCard.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs text-slate-400">
                        {hoveredCard.name}
                      </div>
                    )}
                  </div>
                  <p className="mt-2 text-xs text-slate-300 text-center px-2">
                    {hoveredCard.name}
                  </p>
                </>
              ) : (
                <p className="text-xs text-slate-500 text-center px-2">
                  Hover a card in the list to preview it.
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Help overlay */}
      {showHelpOverlay && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75"
          onClick={() => setShowHelpOverlay(false)}
        >
          <Card
            className="relative w-full max-w-lg mx-4 rounded-3xl bg-slate-950/95 border border-emerald-500/50 shadow-[0_24px_60px_rgba(0,0,0,0.9)] px-6 py-5 text-slate-50"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              type="button"
              onClick={() => setShowHelpOverlay(false)}
              className="absolute right-3 top-3 text-slate-400 hover:text-emerald-300"
              aria-label="Close help"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-2 mb-3">
              <HelpCircle className="h-5 w-5 text-emerald-300" />
              <h2 className="text-lg font-semibold">
                <span className="text-emerald-300">How to use</span>{" "}
                <span className="text-emerald-100">PrizeCheck.us</span>
              </h2>
            </div>

            <div className="space-y-3 text-sm leading-relaxed">
              <p className="text-slate-300">
                This tool simulates a real game: we{" "}
                <span className="text-emerald-200 font-medium">
                  shuffle your deck
                </span>
                ,{" "}
                <span className="text-emerald-200 font-medium">
                  draw an opening hand
                </span>
                , set aside{" "}
                <span className="text-emerald-200 font-medium">
                  6 prize cards
                </span>
                , then ask you to figure out what&apos;s missing.
              </p>

              <p>
                <span className="font-semibold text-emerald-300">
                  1. Import a deck
                </span>
                <br />
                Copy a deck&apos;s text export from{" "}
                <span className="text-sky-300 font-semibold">
                  LimitlessTCG
                </span>{" "}
                or <span className="text-sky-300 font-semibold">PTCGL</span> and
                paste it into the box above, then click{" "}
                <span className="font-semibold text-emerald-200">
                  Import Deck
                </span>
                .
              </p>

              <p>
                <span className="font-semibold text-emerald-300">
                  2. Start the drill
                </span>
                <br />
                When the list looks correct, hit{" "}
                <span className="font-semibold text-emerald-200">
                  Start Game
                </span>
                . The app{" "}
                <span className="text-emerald-200">shuffles</span>, draws your{" "}
                <span className="text-emerald-200">starting hand</span>, and
                chooses{" "}
                <span className="text-emerald-200">6 prizes</span>.
              </p>

              <p>
                <span className="font-semibold text-emerald-300">
                  3. Scan your deck
                </span>
                <br />
                On the game screen, scroll through your deck and mentally track
                what should be there. Try to spot patterns of what might be in
                your prizes. Reorganize your cards using{" "}
                <span className="font-semibold text-emerald-200">keys (A/D)</span> or{" "}
                <span className="font-semibold text-emerald-200">clicking</span>{" "}
                to help visually.
              </p>

              <p>
                <span className="font-semibold text-emerald-300">
                  4. Guess your prizes
                </span>
                <br />
                When the timer ends or you click{" "}
                <span className="font-semibold text-emerald-200">
                  Guess Prizes
                </span>
                , select the{" "}
                <span className="font-semibold text-emerald-200">
                  6 cards
                </span>{" "}
                you think are prized. The results screen shows your{" "}
                <span className="text-emerald-200">accuracy</span>,{" "}
                <span className="text-emerald-200">score</span>, and{" "}
                <span className="text-emerald-200">rank progress</span>.
              </p>

              <div className="mt-2 border-t border-slate-800 pt-3 text-xs text-slate-300 space-y-1">
                <p className="font-semibold text-emerald-300">
                  Controls (in game):
                </p>
                <p>
                  •{" "}
                  <span className="font-semibold text-emerald-200">
                    Arrow keys / mouse wheel
                  </span>
                  : move through the deck
                </p>
                <p>
                  •{" "}
                  <span className="font-semibold text-emerald-200">
                    Left click / A
                  </span>
                  : bring a card to the front
                </p>
                <p>
                  •{" "}
                  <span className="font-semibold text-emerald-200">
                    Right click / D
                  </span>
                  : send a card to the back
                </p>
              </div>

              <p className="pt-2 text-[11px] text-slate-400">
                <span className="text-emerald-300 font-semibold">Tip:</span>{" "}
                Don&apos;t write anything down so you can build your deck
                memorization and visualization skills.
              </p>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
