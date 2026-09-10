// lib/shuffle.ts
import type { PokemonCard } from "./types"

export function shuffle<T>(arr: T[], random: () => number = Math.random): T[] {
  const copy = [...arr]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

export function dealCards(fullDeck: PokemonCard[]) {
  if (fullDeck.length !== 60 || new Set(fullDeck.map(card => card.id)).size !== 60) {
    throw new Error("A practice deck must contain 60 uniquely identified card instances.")
  }
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
