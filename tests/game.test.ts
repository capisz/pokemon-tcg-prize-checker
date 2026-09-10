import { describe, expect, it } from 'vitest'
import { calculateScore, evaluateGuesses, remainingSeconds } from '../lib/game'
import { dealCards, shuffle } from '../lib/shuffle'
import { initialRankState, rankSchema, updateRank } from '../lib/rank'
import { initialSession, sessionReducer } from '../lib/session'

const cards = Array.from({ length: 60 }, (_, i) => ({ id: `test-${i}#${i}`, name: `Card ${i}` }))
describe('scoring v2', () => {
  it('gives no speed points for zero correct guesses', () => {
    expect(calculateScore(0, 6, 113)).toBe(0)
    expect(updateRank(initialRankState, 0, 1000).progress).toBe(0)
  })
  it('uses exact accuracy rather than rounded percentages', () => {
    expect(calculateScore(1, 6, 120)).toBe(167)
    expect(calculateScore(6, 6, 120)).toBe(1000)
    expect(calculateScore(6, 6, 0)).toBe(700)
  })
  it('does not reward unknown or out-of-range time', () => {
    expect(calculateScore(6, 6, null)).toBe(700)
    expect(calculateScore(6, 6, -30)).toBe(700)
    expect(calculateScore(6, 6, 300)).toBe(1000)
  })
})
describe('ranks', () => {
  it('promotes at the exact threshold without running demotion', () => {
    expect(updateRank({tier:'greatball', progress:86, elo:1200},550,1000)).toEqual({tier:'ultraball',progress:0,elo:1200})
  })
  it('demotes after poor performance, and floors the first tier', () => {
    expect(updateRank({tier:'greatball',progress:1,elo:1200},0,1000).tier).toBe('pokeball')
    expect(updateRank(initialRankState,0,1000).progress).toBe(0)
  })
  it('promotes Ultra Ball to Master Ball', () => {
    expect(updateRank({tier:'ultraball',progress:99,elo:1200},1000,1000).tier).toBe('masterball')
  })
  it('rejects corrupt saved ranks and invalid score denominators', () => {
    expect(rankSchema.safeParse({tier:'invalid',progress:5,elo:1200}).success).toBe(false)
    expect(rankSchema.safeParse({...initialRankState,progress:Infinity}).success).toBe(false)
    expect(updateRank(initialRankState, 100, 0)).toEqual(initialRankState)
  })
})
describe('dealing and duplicate guesses', () => {
  it('preserves all 60 unique instances without mutating the source', () => {
    const before = [...cards]
    const deal = dealCards(cards)
    expect([deal.deck.length,deal.hand.length,deal.prizes.length]).toEqual([46,8,6])
    expect(new Set([...deal.deck,...deal.hand,...deal.prizes].map(c=>c.id)).size).toBe(60)
    expect(cards).toEqual(before)
  })
  it('rejects invalid decks', () => {
    expect(()=>dealCards(cards.slice(0,59))).toThrow()
    expect(()=>dealCards(Array(60).fill(cards[0]))).toThrow()
  })
  it('supports reproducible shuffles for fixtures', () => {
    expect(shuffle([1,2,3],()=>0)).toEqual([2,3,1])
  })
  it('matches interchangeable copies without overcounting', () => {
    const all = ['a#0','a#1','a#2','b#3'].map(id=>({id,name:id}))
    const result = evaluateGuesses(all,[all[0],all[3]],new Set(['a#1','a#2']))
    expect([result.correct,result.incorrect,result.missed]).toEqual([1,1,1])
  })
})
describe('session lifecycle', () => {
  it('requires countdown before inspection and prevents duplicate finish/submit transitions', () => {
    const countdown = sessionReducer(initialSession,{type:'start',deal:dealCards(cards)})
    expect(countdown.phase).toBe('countdown')
    expect(sessionReducer(countdown,{type:'finish',timeLeft:119})).toBe(countdown)
    const inspection = sessionReducer(countdown,{type:'ready'})
    const guessing = sessionReducer(inspection,{type:'finish',timeLeft:113})
    expect(sessionReducer(guessing,{type:'finish',timeLeft:0})).toBe(guessing)
    const summary = sessionReducer(guessing,{type:'submit'})
    expect(summary.phase).toBe('summary')
    expect(sessionReducer(summary,{type:'submit'})).toBe(summary)
    expect(sessionReducer(summary,{type:'start',deal:dealCards(cards)}).phase).toBe('countdown')
  })
  it('accounts for delayed timer callbacks using elapsed time', () => {
    expect(remainingSeconds(120000, 7500)).toBe(113)
    expect(remainingSeconds(120000, 150000)).toBe(0)
  })
})
