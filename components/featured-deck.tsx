"use client"

import { useEffect, useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Copy } from "lucide-react"

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

type FeaturedDeckApi = {
  title: string
  sourceUrl: string
  importText: string
}

const MAX_FEATURED_CARDS = 5

/** Temporary fallback deck until the API is wired up */
const FALLBACK_DECK: FeaturedDeckApi = {
  title: "Charizard ex / Pidgeot ex — Regional Stuttgart Champion",
  sourceUrl: "https://limitlesstcg.com/decks/lists",
  importText: `Pokémon: 26
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
2 Jet Energy PAL 190`,
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

      for (let i = 0; i < count; i++) fullIds.push(cardId)
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
  return { fullIds, uniqueIds, counts }
}

export function FeaturedDeckSection() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deckTitle, setDeckTitle] = useState(FALLBACK_DECK.title)
  const [sourceUrl, setSourceUrl] = useState(FALLBACK_DECK.sourceUrl)
  const [importText] = useState(FALLBACK_DECK.importText)
  const [cards, setCards] = useState<FeaturedCard[]>([])
  const [revealed, setRevealed] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function loadFromFallback() {
      try {
        setLoading(true)
        setError(null)

        const { uniqueIds, counts } = parseIdsFromText(FALLBACK_DECK.importText)
        if (!uniqueIds.length) {
          throw new Error("Could not parse any card IDs from the featured deck")
        }

        const cardsRes = await fetch("/api/cards", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids: uniqueIds }),
        })

        if (!cardsRes.ok) throw new Error("Failed to fetch card details")

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

          if (base) return { ...base, count }

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
          setDeckTitle(FALLBACK_DECK.title)
          setSourceUrl(FALLBACK_DECK.sourceUrl)
          setCards(withCounts.slice(0, MAX_FEATURED_CARDS))
        }
      } catch (err: any) {
        console.error("FeaturedDeckSection error:", err)
        if (!cancelled) setError(err.message ?? "Error loading featured deck")
      } finally {
        if (!cancelled) {
          setLoading(false)
          setTimeout(() => setRevealed(true), 120)
        }
      }
    }

    loadFromFallback()
    return () => {
      cancelled = true
    }
  }, [])

  if (loading) {
    return (
      <Card className="mt-4 bg-slate-900/70 border border-slate-800/80">
        <div className="p-4 text-xs text-slate-400">Loading featured deck…</div>
      </Card>
    )
  }

  if (error || !cards.length) {
    return (
      <Card className="mt-4 bg-slate-900/70 border border-slate-800/80">
        <div className="p-4 text-xs text-slate-400">
          Featured Deck unavailable right now.
          {error && <span className="ml-1 text-slate-500">({error})</span>}
        </div>
      </Card>
    )
  }

  return (
    <Card
      className={cn(
        "mt-4 rounded-3xl border border-none",
        "bg-gradient-to-r from-emerald-900/90 via-slate-900/90 to-slate-800/90",
        "shadow-[0_0_16px_rgba(16,185,129,0.35)]",
        "overflow-visible",
      )}
    >
      <div className="flex items-center gap-6 px-6 py-3 md:px-8 md:py-3">
        {/* LEFT: text + button */}
        <div className="flex-1 min-w-[0]">
          <div
  className={cn(
    "flex flex-col gap-3 h-full",
    // use both opacity + transform so it "glides" from above
    "transition-all duration-700 ease-out",
    revealed
      ? "opacity-100 translate-y-0"
      : "opacity-0 -translate-y-3"
  )}
>
            <div className="space-y-1">
              <p className="text-[12px] uppercase tracking-[0.22em] text-emerald-300">
                Featured Deck
              </p>
              <h2 className="text-lg sm:text-l font-semibold text-emerald-100">
                {deckTitle}
              </h2>
            </div>

            <div className="mt-1 flex items-center gap-4">
              {sourceUrl && (
                <a
                  href={sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[13px] text-emerald-100/80 hover:text-emerald-200 underline-offset-2 hover:underline"
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
                    setCopied(true)
                    window.setTimeout(() => setCopied(false), 1500)
                  } catch {
                    // optional: toast later
                  }
                }}
                className={cn(
                  // base shape + shadow
                  "rounded-full h-9 px-5 font-semibold shadow-md shadow-emerald-500/40",
                  // emerald color system
                  "bg-emerald-500 text-slate-950 hover:bg-emerald-400",
                  // interaction + animation
                  "transition-colors transition-transform duration-150",
                  "active:scale-95 active:translate-y-[1px]",
                  // override the default blue focus ring
                  "focus-visible:ring-emerald-300 focus-visible:ring-offset-emerald-950",
                  // copied override (keeps same emerald family)
                  copied && "bg-emerald-400",
                )}
              >
                <Copy className="mr-2 h-4 w-4" />
                {copied ? "Copied!" : "Copy Decklist"}
              </Button>
            </div>
          </div>
        </div>

        {/* RIGHT: card strip */}
        <div className="flex-1 flex justify-end overflow-visible">
          <div className="flex gap-4 items-center min-h-[160px] overflow-visible">
            {cards.map((card, index) => (
              <div
                key={card.id}
                style={{
                  transitionDelay: revealed ? `${index * 140}ms` : "0ms",
                }}
                className={cn(
                  "relative flex-shrink-0 w-24 sm:w-28 md:w-32",
                  "transition-all duration-700 ease-out",
                  revealed
                    ? "opacity-100 translate-y-0"
                    : "opacity-0 translate-y-3",
                )}
              >
                <div
                  className={cn(
                    "rounded-xl border border-slate-700/60 bg-slate-900/80",
                    "shadow-sm shadow-emerald-500/20",
                    "overflow-hidden",
                    "transition-transform duration-160 ease-out",
                    "hover:-translate-y-2 hover:shadow-[0_16px_34px_rgba(0,0,0,0.65)]",
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
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Card>
  )
}
