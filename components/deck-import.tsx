"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { MusicControls } from "@/components/music-controls" // ⬅️ NEW

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
}

export function DeckImport(props: DeckImportProps) {
  const {
    onDeckImported,
    onImportComplete,
    initialText,
    onTextChange,
    onStartGame,
    canStartGame,
  } = props

  const [rawText, setRawText] = useState(initialText ?? "")
  const [previewCards, setPreviewCards] = useState<ImportedCard[]>([])
  const [cardCounts, setCardCounts] = useState<Record<string, number>>({})
  const [hoveredCard, setHoveredCard] = useState<ImportedCard | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setRawText(initialText ?? "")
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

      if (onDeckImported) onDeckImported(expandedDeck)
      if (onImportComplete) onImportComplete(expandedDeck)
    } catch (err: any) {
      console.error(err)
      setError(err.message ?? "Something went wrong importing the deck.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleTextChange = (value: string) => {
    setRawText(value)
    onTextChange?.(value)
  }

  return (
    <div className="min-h-screen flex flex-col items-center px-4 py-10 bg-slate-950 text-slate-50">
      <div className="w-full max-w-6xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          {/* Left: title + mascot */}
          <div className="flex items-center gap-3">
            <img
              src="/sprite1_vector.svg"
              alt="PrizeCheckDrill mascot"
              className="h-30 w-30 md:h-12 md:w-12 mascot-bob" // ⬅️ bobbing
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

          {/* Right: music + Import button */}
          <div className="flex items-center gap-3">
            {/* ⬅️ HERE is the music UI */}
            <Button
              size="sm"
              onClick={handleImport}
              disabled={isLoading || !rawText.trim()}
              className="rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold shadow-md shadow-emerald-500/30"
            >
              {isLoading ? "Importing…" : "Import Deck"}
            </Button>
          </div>
        </div>

        {/* Text area */}
        <Card className="bg-slate-900/70 border border-slate-800">
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

        {/* Preview list + hover image */}
        {previewCards.length > 0 && (
          <div className="flex flex-col md:flex-row gap-6 mt-2">
            {/* List on the left */}
            <div className="flex-1 max-h-[420px] overflow-y-auto rounded-lg border border-slate-800 bg-slate-900/70">
              {previewCards.map((card) => {
                const baseId = card.id.toLowerCase()
                const count = cardCounts[baseId] ?? 1
                const isHovered = hoveredCard?.id === card.id

                return (
                  <div
                    key={card.id}
                    onMouseEnter={() => setHoveredCard(card)}
                    className={cn(
                      "flex items-center justify-between px-4 py-2 text-sm border-b border-slate-800/60 last:border-b-0",
                      "hover:bg-slate-800/70 cursor-pointer",
                      isHovered && "bg-slate-800",
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
    </div>
  )
}
