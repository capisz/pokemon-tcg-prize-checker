"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card } from "@/components/ui/card"
import { Loader2 } from "lucide-react"
import type { PokemonCard } from "@/lib/types"

interface DeckImportProps {
  onImportComplete: (cards: PokemonCard[]) => void
}

export function DeckImport({ onImportComplete }: DeckImportProps) {
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [preview, setPreview] = useState<PokemonCard[]>([])
  const [error, setError] = useState("")

  const handleImport = async () => {
    setError("")
    setLoading(true)

    try {
      const lines = input
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0)
        // Remove category headers (Pokémon:, Trainer:, Energy:)
        .filter((line) => !line.match(/^(Pokémon|Trainer|Energy):\s*\d+$/))

      // Expand cards based on quantities (e.g., "3 Pikachu ex" becomes 3 entries)
      const cardIds: string[] = []
      for (const line of lines) {
        // Match format: "NUMBER CardName SetCode CardNumber"
        const match = line.match(/^(\d+)\s+(.+?)\s+([A-Z]{2,})\s+(\d+[a-zA-Z]*)$/)
        if (match) {
          const quantity = Number.parseInt(match[1])
          const setCode = match[3].toLowerCase()
          const cardNumber = match[4]
          const cardId = `${setCode}-${cardNumber}`

          // Add the card ID 'quantity' times
          for (let i = 0; i < quantity; i++) {
            cardIds.push(cardId)
          }
        }
      }

      if (cardIds.length !== 60) {
        setError(`Deck must contain exactly 60 cards. Found ${cardIds.length} cards.`)
        setLoading(false)
        return
      }

      // Fetch card data from API
      const response = await fetch("/api/cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cardIds }),
      })

      if (!response.ok) {
        throw new Error("Failed to fetch cards")
      }

      const { cards } = await response.json()
      setPreview(cards)
    } catch (err) {
      setError("Failed to load cards. Please check your input and try again.")
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleStartGame = () => {
    if (preview.length === 60) {
      onImportComplete(preview)
    }
  }

  return (
    <div className="container mx-auto max-w-6xl p-6 space-y-6">
      <div className="text-center space-y-3">
        <h1 className="text-4xl font-bold text-balance bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
          Pokémon TCG Prize Checker
        </h1>
        <p className="text-muted-foreground text-lg">Test your memory by identifying which cards are prizes</p>
      </div>

      {preview.length === 0 ? (
        <Card className="p-6 space-y-4">
          <div className="space-y-2">
            <h2 className="text-xl font-semibold">Import Your Deck</h2>
            <p className="text-sm text-muted-foreground">Paste your 60-card deck list with quantities</p>
          </div>

          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Pokémon: 15&#10;3 Pikachu ex PAL 180&#10;2 Mewtwo ex PAF 74&#10;...&#10;&#10;Trainer: 32&#10;4 Professor's Research BLK 85&#10;...&#10;&#10;Energy: 13&#10;8 Grass Energy SVE 1&#10;..."
            className="min-h-[300px] font-mono text-sm"
          />

          {error && <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-lg">{error}</div>}

          <Button onClick={handleImport} disabled={loading || input.trim().length === 0} className="w-full" size="lg">
            {loading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
            Import Deck
          </Button>
        </Card>
      ) : (
        <div className="space-y-4">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-semibold">Deck Preview</h2>
                <p className="text-sm text-muted-foreground">{preview.length} cards loaded</p>
              </div>
              <Button
                onClick={handleStartGame}
                size="lg"
                className="bg-secondary text-secondary-foreground hover:bg-secondary/90"
              >
                Start Game
              </Button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {preview.map((card, index) => (
                <div
                  key={`${card.id}-${index}`}
                  className="group relative aspect-[2.5/3.5] rounded-lg overflow-hidden border-2 border-border hover:border-primary transition-colors"
                >
                  {card.image ? (
                    <img
                      src={card.image || "/placeholder.svg"}
                      alt={card.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-muted flex items-center justify-center p-2">
                      <p className="text-xs text-center text-muted-foreground font-medium">{card.name}</p>
                    </div>
                  )}

                  <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-2">
                    <p className="text-xs text-white text-center font-medium">{card.name}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Button
            onClick={() => {
              setPreview([])
              setInput("")
            }}
            variant="outline"
            className="w-full"
          >
            Import Different Deck
          </Button>
        </div>
      )}
    </div>
  )
}
