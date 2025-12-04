// lib/shuffle.ts
import type { PokemonCard } from "./types"

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

export function dealCards(fullDeck: PokemonCard[]) {
  // defensive: work with a shuffled copy of whatever we receive
  const shuffled = shuffle(fullDeck)

  // 6 prize cards, 8-card opening hand, rest is draw deck
  const prizes = shuffled.slice(0, 6)
  const hand = shuffled.slice(6, 14)
  const deck = shuffled.slice(14)

  return {
    deck,     // 46 cards shown in the carousel
    prizes,   // 6 prize cards
    hand,     // 8-card starting hand
  }
}
