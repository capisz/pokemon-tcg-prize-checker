"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { FeaturedDeckSection } from "@/components/featured-deck"
import { HelpCircle, X } from "lucide-react"

type ImportedCard = {
  id: string
  name: string
  image?: string
  set: string
  number: string | number
}

interface DeckImportProps {
  onDeckImported?: (cards: ImportedCard[]) => void
  onImportComplete?: (cards: ImportedCard[]) => void
  initialText?: string
  onTextChange?: (value: string) => void
  onStartGame?: () => void
  canStartGame?: boolean

  /** Optional: for the green title bar above the list */
  deckTitle?: string
  deckPlayer?: string

  /** Optional: if true, auto-imports when the page first loads (using initialText) */
  autoImportOnMount?: boolean
}

export function DeckImport(props: DeckImportProps) {
  const {
    onDeckImported,
    onImportComplete,
    initialText,
    onTextChange,
    onStartGame,
    canStartGame,
    deckTitle,
    deckPlayer,
    autoImportOnMount,
  } = props

  // Fallbacks until wired to Limitless/API
  const effectiveDeckTitle = deckTitle ?? "Charizard Noctowl"
  const effectiveDeckPlayer = deckPlayer ?? "Nicolai Stiborg"

  const [rawText, setRawText] = useState(initialText ?? "")
  const [previewCards, setPreviewCards] = useState<ImportedCard[]>([])
  const [cardCounts, setCardCounts] = useState<Record<string, number>>({})
  const [hoveredCard, setHoveredCard] = useState<ImportedCard | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasAutoImported, setHasAutoImported] = useState(false)

  // Help overlay state
  const [showHelpOverlay, setShowHelpOverlay] = useState(false)

  // Keep textarea in sync with parent-provided initialText
  useEffect(() => {
    if (typeof initialText === "string") {
      setRawText(initialText)
    }
  }, [initialText])

  function parseIdsFromText(text: string) {
    const fullIds: string[] = []
    const counts = new Map<string, number>()

    const lines = text.split(/\r?\n/)

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed) continue

      const lineMatch = trimmed.match(
        /^\s*(\d+)\s+.+\b([A-Z]{2,4})\s+(\d{1,3}[A-Z]?)\b/,
      )

      if (lineMatch) {
        const count = Number(lineMatch[1]) || 1
        const setCode = lineMatch[2].toLowerCase()
        const num = lineMatch[3].toLowerCase()
        const cardId = `${setCode}-${num}`

        for (let i = 0; i < count; i++) {
          fullIds.push(cardId)
        }
        counts.set(cardId, (counts.get(cardId) || 0) + count)
        continue
      }

      const fallbackMatch = trimmed.match(
        /\b([A-Z]{2,4})\s+(\d{1,3}[A-Z]?)\b/,
      )

      if (fallbackMatch) {
        const setCode = fallbackMatch[1].toLowerCase()
        const num = fallbackMatch[2].toLowerCase()
        const cardId = `${setCode}-${num}`
        fullIds.push(cardId)
        counts.set(cardId, (counts.get(cardId) || 0) + 1)
      }
    }

    const uniqueIds = Array.from(new Set(fullIds))

    return {
      fullIds,
      uniqueIds,
      counts,
    }
  }

  async function handleImport() {
    setError(null)

    const { fullIds, uniqueIds, counts } = parseIdsFromText(rawText)

    if (!uniqueIds.length) {
      setPreviewCards([])
      setCardCounts({})
      setError(
        "Couldn't find any card IDs like PAF 7 / OBF 162 in the text. Make sure lines look like '4 Charmander PAF 7'.",
      )
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch("/api/cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: uniqueIds }),
      })

      if (!response.ok) throw new Error("Failed to fetch cards")

      const data = await response.json()
      const fetchedCards: ImportedCard[] = Array.isArray(data.cards)
        ? data.cards
        : []

      const cardById = new Map<string, ImportedCard>()
      for (const card of fetchedCards) {
        cardById.set(card.id.toLowerCase(), card)
      }

      const expandedDeck: ImportedCard[] = fullIds.map((id, index) => {
        const base = cardById.get(id.toLowerCase())
        if (base) {
          return {
            ...base,
            id: `${base.id}#${index}`,
          }
        }

        const [setCode, num] = id.split("-")
        return {
          id: `${id}#${index}`,
          name: `Card ${setCode.toUpperCase()} ${num.toUpperCase()}`,
          set: setCode.toUpperCase(),
          number: num.toUpperCase(),
        }
      })

      setPreviewCards(fetchedCards)
      setCardCounts(Object.fromEntries(counts))
      setHoveredCard(fetchedCards[0] ?? null)

      onDeckImported?.(expandedDeck)
      onImportComplete?.(expandedDeck)
    } catch (err: any) {
      console.error(err)
      setError(err.message ?? "Something went wrong importing the deck.")
    } finally {
      setIsLoading(false)
    }
  }

  // Auto-import once on mount when you want the featured list preloaded
  useEffect(() => {
    if (!autoImportOnMount) return
    if (hasAutoImported) return
    if (!rawText.trim()) return

    setHasAutoImported(true)
    void handleImport()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoImportOnMount, hasAutoImported, rawText])

  const handleTextChange = (value: string) => {
    setRawText(value)
    onTextChange?.(value)
  }

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
              className="h-30 w-30 md:h-12 md:w-12 mascot-bob"
              style={{ imageRendering: "pixelated" }}
            />
            <div className="flex flex-col">
              <h1 className="text-2xl font-semibold text-emerald-400">
                PrizeCheckDrillr.io
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

          {/* Right: Import button + ? icon */}
          <div className="flex items-center gap-3">
            <Button
              size="sm"
              onClick={handleImport}
              disabled={isLoading || !rawText.trim()}
              className="rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold shadow-md shadow-emerald-500/30 transition-transform duration-150 active:scale-95"
            >
              {isLoading ? "Importing…" : "Import Deck"}
            </Button>

            {/* icon-only help button (no outer border circle) */}
            <Button
              type="button"
              size="icon"
              variant="ghost"
              aria-label="How to use PrizeCheckDrillr"
              onClick={() => setShowHelpOverlay(true)}
              className={cn(
                "border-none bg-transparent shadow-none",
                "hover:bg-transparent",
                "text-emerald-300 hover:text-emerald-100"
              )}
            >
              <HelpCircle className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Text area */}
        <Card className="bg-slate-800/45 border border-emerald-900/40 shadow-[0_0_16px_rgba(16,185,129,0.35)]">
          <div className="p-4">
            <Textarea
              rows={6}
              value={rawText}
              onChange={(e) => handleTextChange(e.target.value)}
              className="bg-transparent border-0 focus-visible:ring-0 text-sm font-mono text-slate-100 resize-none"
              placeholder={`Pokémon: 26
2 Charmander PAF 7
1 Charmander PFL 11
1 Charmeleon PFL 12
2 Charizard ex OBF 125
...`}
            />
            {error && (
              <p className="mt-2 text-xs text-rose-400">{error}</p>
            )}
          </div>
        </Card>

        {/* Featured deck banner */}
        <FeaturedDeckSection />

        {/* Deck list + hover preview */}
        {previewCards.length > 0 && (
          <div className="flex flex-col md:flex-row gap-6 mt-2 outer-glow-emerald-900 border-emerald-500/50">
            {/* LIST: now has its own dark-green title bar INSIDE the card */}
            <div className="flex-1 max-h-[420px] rounded-lg border border-slate-800 bg-slate-900/70 flex flex-col">
              {/* Title bar that feels like part of the list */}
              <div className="px-4 py-2 border-b border-slate-800 bg-emerald-300/35 rounded-t-lg">
                <p className="text-xs sm:text-sm font-semibold text-emerald-100">
                  {effectiveDeckTitle}
                  {effectiveDeckPlayer && (
                    <span className="font-normal text-emerald-300">
                      {" "}
                      by {effectiveDeckPlayer}
                    </span>
                  )}
                </p>
              </div>

              {/* Scrollable list body */}
              <div className="flex-1 overflow-y-auto">
                {previewCards.map((card, index) => {
                  const baseId = card.id.toLowerCase()
                  const count = cardCounts[baseId] ?? 1
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
              {canStartGame && onStartGame && (
                <Button
                  type="button"
                  size="sm"
                  className="mb-4 rounded-full px-6 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold shadow-md shadow-emerald-500/30"
                  onClick={onStartGame}
                >
                  Start Game
                </Button>
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
    className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
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
        className="absolute right-3 top-3 text-slate-400 hover:text-slate-100"
        aria-label="Close help"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="flex items-center gap-2 mb-3">
        <HelpCircle className="h-5 w-5 text-emerald-300" />
        <h2 className="text-lg font-semibold">
          <span className="text-emerald-300">How to use</span>{" "}
          <span className="text-emerald-100">PrizeCheckDrillr</span>
        </h2>
      </div>

      <div className="space-y-3 text-sm leading-relaxed">
        <p className="text-slate-300">
          This tool simulates a real game: we{" "}
          <span className="text-emerald-200 font-medium">shuffle your deck</span>,{" "}
          <span className="text-emerald-200 font-medium">draw an opening hand</span>, set aside{" "}
          <span className="text-emerald-200 font-medium">6 prize cards</span>, then ask you
          to figure out what&apos;s missing.
        </p>

        <p>
          <span className="font-semibold text-emerald-300">1. Import a deck</span>
          <br />
          Copy a deck&apos;s text export from{" "}
          <span className="text-sky-300 font-semibold" >LimitlessTCG</span> or  <span className="text-sky-300 font-semibold">PTCGL</span> and paste it into
          the box above, then click{" "}
          <span className="font-semibold text-emerald-200">Import Deck</span>.
        </p>

        <p>
          <span className="font-semibold text-emerald-300">2. Start the drill</span>
          <br />
          When the list looks correct, hit{" "}
          <span className="font-semibold text-emerald-200">Start Game</span>. The app{" "}
          <span className="text-emerald-200">shuffles</span>, draws your{" "}
          <span className="text-emerald-200">starting hand</span>, and chooses{" "}
          <span className="text-emerald-200">6 prizes</span>.
        </p>

        <p>
          <span className="font-semibold text-emerald-300">3. Scan your deck</span>
          <br />
          On the game screen, scroll through your deck and mentally track what should be
          there. Try to spot patterns of what might be in your prizes. Reorganize your
          cards using{" "}
          <span className="font-semibold text-emerald-200">keys</span> or{" "}
          <span className="font-semibold text-emerald-200">clicking</span> to help visually.
        </p>

        <p>
          <span className="font-semibold text-emerald-300">4. Guess your prizes</span>
          <br />
          When the timer ends or you click{" "}
          <span className="font-semibold text-emerald-200">Guess Prizes</span>, select the{" "}
          <span className="font-semibold text-emerald-200">6 cards</span> you think are prized.
          The results screen shows your{" "}
          <span className="text-emerald-200">accuracy</span>,{" "}
          <span className="text-emerald-200">score</span>, and{" "}
          <span className="text-emerald-200">rank progress</span>.
        </p>

        <div className="mt-2 border-t border-slate-800 pt-3 text-xs text-slate-300 space-y-1">
          <p className="font-semibold text-emerald-300">Controls (in game):</p>
          <p>
            • <span className="font-semibold text-emerald-200">Arrow keys / mouse wheel</span>:{" "}
            move through the deck
          </p>
          <p>
            • <span className="font-semibold text-emerald-200">Left click / A</span>: bring a
            card to the front
          </p>
          <p>
            • <span className="font-semibold text-emerald-200">Right click / D</span>: send a
            card to the back
          </p>
        </div>

        <p className="pt-2 text-[11px] text-slate-500">
          <span className="text-emerald-300 font-semibold">Tip:</span>{" "}
          Don&apos;t write anything down so you can build your deck memorization and visualization skills.
        </p>
      </div>
    </Card>
  </div>
)}

    </div>
  )
}
