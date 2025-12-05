"use client"

import { useEffect, useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type FeaturedDeckApi = {
  title: string
  sourceUrl: string
  importText: string
}

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

/* --- same parser logic as DeckImport --- */
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

export function FeaturedDeckSection() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deckTitle, setDeckTitle] = useState("")
  const [sourceUrl, setSourceUrl] = useState("")
  const [importText, setImportText] = useState("")
  const [cards, setCards] = useState<FeaturedCard[]>([])

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        setLoading(true)
        setError(null)

        // 1) fetch featured deck info from your API route
        const res = await fetch("/api/featured-deck")
        if (!res.ok) {
          throw new Error(`featured-deck API error (${res.status})`)
        }

        const data: FeaturedDeckApi = await res.json()

        if (!data.importText?.trim()) {
          throw new Error("Featured deck has no import text")
        }

        if (cancelled) return

        setDeckTitle(data.title)
        setSourceUrl(data.sourceUrl)
        setImportText(data.importText)

        // 2) parse ids from the import text
        const { uniqueIds, counts } = parseIdsFromText(data.importText)
        if (!uniqueIds.length) {
          throw new Error("Could not parse any card IDs from the featured deck")
        }

        // 3) fetch details from your existing /api/cards endpoint
        const cardsRes = await fetch("/api/cards", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids: uniqueIds }),
        })

        if (!cardsRes.ok) {
          throw new Error("Failed to fetch card details for featured deck")
        }

        const cardsData = await cardsRes.json()
        const fetched: ImportedCard[] = Array.isArray(cardsData.cards)
          ? cardsData.cards
          : []

        const cardById = new Map<string, ImportedCard>()
        for (const c of fetched) {
          cardById.set(c.id.toLowerCase(), c)
        }

        const withCounts: FeaturedCard[] = uniqueIds.map((id) => {
          const base = cardById.get(id.toLowerCase())
          const count = counts.get(id) ?? 1

          if (base) {
            return { ...base, count }
          }

          const [setCode, num] = id.split("-")
          return {
            id,
            name: `Card ${setCode.toUpperCase()} ${num.toUpperCase()}`,
            set: setCode.toUpperCase(),
            number: num.toUpperCase(),
            count,
          }
        })

        if (!cancelled) {
          setCards(withCounts)
        }
      } catch (err: any) {
        console.error("FeaturedDeckSection error:", err)
        if (!cancelled) {
          setError(err.message ?? "Error loading featured deck")
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  // Always render a card so the layout stays nice

  if (loading) {
    return (
      <Card className="mt-4 bg-slate-900/70 border border-slate-800/80">
        <div className="p-4 text-xs text-slate-400">
          Loading featured deck…
        </div>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="mt-4 bg-slate-900/70 border border-slate-800/80">
        <div className="p-4 text-xs text-slate-400">
          Featured Deck unavailable right now.
          <span className="ml-1 text-slate-500">({error})</span>
        </div>
      </Card>
    )
  }

  if (!cards.length) {
    return (
      <Card className="mt-4 bg-slate-900/70 border border-slate-800/80">
        <div className="p-4 text-xs text-slate-400">
          No cards found for featured deck.
        </div>
      </Card>
    )
  }

  return (
    <Card className="mt-4 bg-gradient-to-r from-emerald-900/80 via-slate-900/90 to-slate-900/90 border border-emerald-500/40 shadow-lg shadow-emerald-500/30">
      <div className="flex flex-col gap-4 p-4 md:flex-row md:items-center md:justify-between">
        {/* Left: title + link + copy */}
        <div className="space-y-1 max-w-md">
          <p className="text-[11px] uppercase tracking-[0.18em] text-emerald-300">
            Featured Deck
          </p>
          <h2 className="text-sm sm:text-base font-semibold text-emerald-100">
            {deckTitle}
          </h2>
          {sourceUrl && (
            <a
              href={sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] text-emerald-300/80 hover:text-emerald-200 underline-offset-2 hover:underline"
            >
              View on LimitlessTCG
            </a>
          )}

          <Button
            type="button"
            size="sm"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(importText)
              } catch {
                // optional: toast later
              }
            }}
            className="mt-2 rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold px-4 py-1 h-8 text-xs shadow-md shadow-emerald-500/40"
          >
            Copy Decklist
          </Button>
        </div>

        {/* Right: scrollable card strip */}
        <div className="flex-1 overflow-x-auto">
          <div className="flex gap-3 pb-2 min-w-[260px]">
            {cards.map((card) => (
              <div
                key={card.id}
                className={cn(
                  "flex-shrink-0 w-24 sm:w-28 rounded-xl overflow-hidden border border-slate-700/70 bg-slate-900/80",
                  "shadow-sm shadow-emerald-500/20",
                )}
              >
                <div className="aspect-[2.5/3.5] w-full">
                  {card.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={card.image}
                      alt={card.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-[10px] px-2 text-slate-300">
                      {card.name}
                    </div>
                  )}
                </div>
                <div className="px-2 py-1 flex items-center justify-between">
                  <span className="text-[10px] font-medium text-slate-100 truncate">
                    {card.name}
                  </span>
                  <span className="ml-1 text-[10px] text-emerald-300">
                    ×{card.count}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Card>
  )
}
