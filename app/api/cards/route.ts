import { type NextRequest, NextResponse } from "next/server"
import TCGdex from "@tcgdex/sdk"

// Initialize TCGdex SDK
const tcgdex = new TCGdex("en")

// Simple in-memory cache
const cache = new Map<string, { data: any; timestamp: number }>()
const CACHE_DURATION = 1000 * 60 * 60 // 1 hour

export async function POST(request: NextRequest) {
  try {
    const { cardIds } = await request.json()

    if (!Array.isArray(cardIds) || cardIds.length === 0) {
      return NextResponse.json({ error: "Invalid card IDs provided" }, { status: 400 })
    }

    const cards = await Promise.all(
      cardIds.map(async (id) => {
        // Check cache first
        const cached = cache.get(id)
        if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
          return cached.data
        }

        try {
          // Fetch from TCGdex
          const card = await tcgdex.fetch("cards", id)

          const cardData = {
            id: card.id || id,
            name: card.name || "Unknown Card",
            image: card.image || undefined,
            set: card.set
              ? {
                  name: card.set.name,
                  logo: card.set.logo,
                }
              : undefined,
          }

          // Cache the result
          cache.set(id, { data: cardData, timestamp: Date.now() })

          return cardData
        } catch (error) {
          console.error(`Failed to fetch card ${id}:`, error)
          // Return a fallback card
          return {
            id,
            name: id,
            image: undefined,
            set: undefined,
          }
        }
      }),
    )

    return NextResponse.json({ cards })
  } catch (error) {
    console.error("API error:", error)
    return NextResponse.json({ error: "Failed to fetch cards" }, { status: 500 })
  }
}
