"use client"

import { useEffect, useRef, useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Copy } from "lucide-react"
import { stylizeEx } from "@/lib/text"

type FeaturedCard = {
  id: string
  name: string
  image?: string
  set: string
  number: string | number
  count: number
}

type FeaturedDeckSectionProps = {
  deckId: string
  title: string
  sourceUrl: string
  importText: string
  playedBy?: string
  cards: FeaturedCard[]
  loading?: boolean
}

const MAX_FEATURED_CARDS = 5
const EXIT_DURATION_MS = 420
const ENTER_DELAY_MS = 80

type DisplayedFeaturedDeck = {
  deckId: string
  title: string
  sourceUrl: string
  importText: string
  playedBy?: string
  cards: FeaturedCard[]
}

type TransitionPhase = "entering" | "shown" | "exiting"

export function FeaturedDeckSection({
  deckId,
  title,
  sourceUrl,
  importText,
  playedBy,
  cards,
  loading,
}: FeaturedDeckSectionProps) {
  const [copied, setCopied] = useState(false)
  const [displayedDeck, setDisplayedDeck] = useState<DisplayedFeaturedDeck | null>(null)
  const [transitionPhase, setTransitionPhase] = useState<TransitionPhase>("entering")
  const displayedDeckIdRef = useRef<string | null>(null)

  useEffect(() => {
    if (loading) return

    const nextCards = cards.slice(0, MAX_FEATURED_CARDS)
    if (!nextCards.length) {
      displayedDeckIdRef.current = null
      setDisplayedDeck(null)
      setTransitionPhase("entering")
      return
    }

    const nextDeck: DisplayedFeaturedDeck = {
      deckId,
      title,
      sourceUrl,
      importText,
      playedBy,
      cards: nextCards,
    }

    let exitTimer: number | undefined
    let enterTimer: number | undefined

    if (!displayedDeckIdRef.current) {
      displayedDeckIdRef.current = deckId
      setDisplayedDeck(nextDeck)
      setTransitionPhase("entering")
      enterTimer = window.setTimeout(() => {
        setTransitionPhase("shown")
      }, ENTER_DELAY_MS)

      return () => {
        if (enterTimer) window.clearTimeout(enterTimer)
      }
    }

    if (displayedDeckIdRef.current === deckId) {
      setDisplayedDeck(nextDeck)
      return
    }

    setTransitionPhase("exiting")
    exitTimer = window.setTimeout(() => {
      displayedDeckIdRef.current = deckId
      setDisplayedDeck(nextDeck)
      setTransitionPhase("entering")
      enterTimer = window.setTimeout(() => {
        setTransitionPhase("shown")
      }, ENTER_DELAY_MS)
    }, EXIT_DURATION_MS)

    return () => {
      if (exitTimer) window.clearTimeout(exitTimer)
      if (enterTimer) window.clearTimeout(enterTimer)
    }
  }, [cards, deckId, importText, loading, playedBy, sourceUrl, title])

  if (loading && !displayedDeck) {
    return (
      <Card className="mt-4 bg-slate-900/70 border border-slate-800/80">
        <div className="p-4 text-xs text-slate-400">Loading featured deck...</div>
      </Card>
    )
  }

  if (!displayedDeck?.cards.length) {
    return (
      <Card className="mt-4 bg-slate-900/70 border border-slate-800/80">
        <div className="p-4 text-xs text-slate-400">
          Import a deck to preview featured cards.
        </div>
      </Card>
    )
  }

  const isShown = transitionPhase === "shown"
  const isExiting = transitionPhase === "exiting"

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
        <div className="flex-1 min-w-[0]">
          <div
            className={cn(
              "flex flex-col gap-3 h-full",
              "transition-all duration-500 ease-out will-change-transform",
              isShown && "opacity-100 translate-y-0 blur-0",
              transitionPhase === "entering" && "opacity-0 -translate-y-4 blur-[2px]",
              isExiting && "opacity-0 translate-y-3 blur-[2px]",
            )}
          >
            <div className="space-y-1">
              <p className="text-[12px] uppercase tracking-[0.22em] text-emerald-300">
                Featured Deck
              </p>
              <h2 className="text-lg sm:text-l font-semibold text-emerald-100">
                {stylizeEx(displayedDeck.title)}
              </h2>
              {displayedDeck.playedBy && (
                <div className="pt-1 text-[11px] leading-snug text-emerald-100/75">
                  <p className="uppercase tracking-[0.18em] text-emerald-300/80">
                    Decklist played by
                  </p>
                  <p>{displayedDeck.playedBy}</p>
                </div>
              )}
            </div>

            <div className="mt-1 flex items-center gap-4">
              {displayedDeck.sourceUrl && (
                <a
                  href={displayedDeck.sourceUrl}
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
                    await navigator.clipboard.writeText(displayedDeck.importText)
                    setCopied(true)
                    window.setTimeout(() => setCopied(false), 1500)
                  } catch {
                    // Clipboard access can be blocked by the browser.
                  }
                }}
                className={cn(
                  "rounded-full h-9 px-5 font-semibold shadow-md shadow-emerald-500/40",
                  "bg-emerald-500 text-slate-950 hover:bg-emerald-400",
                  "drop-shadow-[0_0_8px_rgba(52,211,153,0.4)]",
                  "transition-colors transition-transform duration-150",
                  "active:scale-95 active:translate-y-[1px]",
                  "focus-visible:ring-emerald-300 focus-visible:ring-offset-emerald-950",
                  copied && "bg-emerald-400",
                )}
              >
                <Copy className="mr-2 h-4 w-4" />
                {copied ? "Copied!" : "Copy Decklist"}
              </Button>
            </div>
          </div>
        </div>

        <div className="flex-1 flex justify-end overflow-visible">
          <div className="flex gap-4 items-center min-h-[160px] overflow-visible">
            {displayedDeck.cards.map((card, index) => (
              <div
                key={card.id}
                style={{
                  transitionDelay: isExiting
                    ? `${(displayedDeck.cards.length - index - 1) * 55}ms`
                    : isShown
                      ? `${index * 120}ms`
                      : "0ms",
                }}
                className={cn(
                  "relative flex-shrink-0 w-24 sm:w-28 md:w-32",
                  "transition-all duration-500 ease-out will-change-transform",
                  isShown && "opacity-100 translate-x-0 translate-y-0 scale-100",
                  transitionPhase === "entering" &&
                    "opacity-0 -translate-x-3 translate-y-1 scale-[0.99]",
                  isExiting && "opacity-0 translate-x-4 -translate-y-1 scale-[0.985]",
                )}
              >
                <div
                  className={cn(
                    "relative rounded-xl border border-slate-700/60 bg-slate-900/80",
                    "shadow-sm shadow-emerald-500/20",
                    "overflow-hidden",
                    "transition-all duration-300 ease-out",
                    "hover:-translate-y-1 hover:shadow-[0_10px_24px_rgba(0,0,0,0.48)]",
                    "featured-card-wipe",
                    isShown && "featured-card-wipe-shown",
                    transitionPhase === "entering" && "featured-card-wipe-entering",
                    isExiting && "featured-card-wipe-exiting",
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
                        {stylizeEx(card.name)}
                      </div>
                    )}
                  </div>
                </div>

                {card.count > 1 && (
                  <span className="absolute -right-2 -top-2 rounded-full bg-emerald-400 px-2 py-0.5 text-[11px] font-bold text-slate-950 shadow-md shadow-emerald-500/30">
                    {card.count}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </Card>
  )
}
