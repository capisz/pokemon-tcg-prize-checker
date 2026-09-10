import type { PokemonCard } from './types'

export const GAME_DURATION = 120
export const PRIZE_COUNT = 6
export const SCORING_VERSION = 2

/** Inspection time only; choosing guesses remains untimed. */
export function calculateScore(correct: number, total: number, timeLeft: number | null, duration = GAME_DURATION) {
  const accuracy = total > 0 ? Math.max(0, Math.min(1, correct / total)) : 0
  const speed = duration > 0 && timeLeft !== null && Number.isFinite(timeLeft)
    ? Math.max(0, Math.min(1, timeLeft / duration)) : 0
  return Math.round(1000 * accuracy * (0.7 + 0.3 * speed))
}

export function remainingSeconds(deadline: number, now: number) {
  return Math.max(0, Math.ceil((deadline - now) / 1000))
}

export type CardStatus = 'correct' | 'incorrect' | 'missed'
export function evaluateGuesses(allCards: PokemonCard[], prizes: PokemonCard[], selected: Set<string>) {
  const status = new Map<string, CardStatus>()
  const groups = new Map<string, string[]>()
  const counts = new Map<string, number>()
  for (const card of allCards) {
    const base = card.id.split('#')[0]
    groups.set(base, [...(groups.get(base) ?? []), card.id])
  }
  for (const card of prizes) {
    const base = card.id.split('#')[0]
    counts.set(base, (counts.get(base) ?? 0) + 1)
  }
  let correct = 0, incorrect = 0, missed = 0
  for (const [base, ids] of groups) {
    const guesses = ids.filter(id => selected.has(id))
    const prizeCount = counts.get(base) ?? 0
    const matches = Math.min(guesses.length, prizeCount)
    guesses.forEach((id, i) => status.set(id, i < matches ? 'correct' : 'incorrect'))
    correct += matches
    incorrect += guesses.length - matches
    const missing = ids.filter(id => !selected.has(id)).slice(0, prizeCount - matches)
    missing.forEach(id => status.set(id, 'missed'))
    missed += missing.length
  }
  return { status, correct, incorrect, missed }
}
