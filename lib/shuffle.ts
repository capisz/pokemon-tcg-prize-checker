/**
 * Generic utility to shuffle an array using Fisher-Yates algorithm
 */
export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

/**
 * Deal cards into hand, prizes, and deck
 */
export function dealCards<T>(cards: T[]): {
  hand: T[]
  prizes: T[]
  deck: T[]
} {
  const shuffled = shuffleArray(cards)

  return {
    hand: shuffled.slice(0, 8),
    prizes: shuffled.slice(8, 14),
    deck: shuffled.slice(14),
  }
}
