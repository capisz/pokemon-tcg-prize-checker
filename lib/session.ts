import type { PokemonCard } from './types'

export type PracticePhase = 'import' | 'countdown' | 'inspection' | 'guessing' | 'summary'
export type Deal = { deck: PokemonCard[]; hand: PokemonCard[]; prizes: PokemonCard[] }
export type PracticeSession = { phase: PracticePhase; deal: Deal | null; timeLeft: number | null }
export type SessionAction =
  | { type: 'start'; deal: Deal }
  | { type: 'ready' }
  | { type: 'finish'; timeLeft: number }
  | { type: 'submit' }
  | { type: 'import' }
export const initialSession: PracticeSession = { phase: 'import', deal: null, timeLeft: null }
export function sessionReducer(state: PracticeSession, action: SessionAction): PracticeSession {
  switch (action.type) {
    case 'start': return { phase: 'countdown', deal: action.deal, timeLeft: null }
    case 'ready': return state.phase === 'countdown' ? { ...state, phase: 'inspection' } : state
    case 'finish': return state.phase === 'inspection' ? { ...state, phase: 'guessing', timeLeft: action.timeLeft } : state
    case 'submit': return state.phase === 'guessing' ? { ...state, phase: 'summary' } : state
    case 'import': return initialSession
  }
}
