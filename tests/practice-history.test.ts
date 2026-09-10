import { describe, it, expect } from 'vitest'
import { makeRecord, summarizeHistory } from '../lib/practice-history'
const cards = Array.from({length:60},(_,i) => ({id:`card-${i%3}#${i}`,name:`Card ${i%3}`}))
describe('practice history', () => {
  it('groups an identical deck despite instance order, and counts missed copies', () => {
    const a = makeRecord('a',cards,cards.slice(0,6),new Set(),null)
    const b = makeRecord('b',[...cards].reverse(),cards.slice(0,6),new Set(),120)
    expect(a.deckKey).toBe(b.deckKey)
    expect(a.missed.map(card => card.count)).toEqual([2,2,2])
    expect(a.seconds).toBeNull()
    expect(a.correct).toBe(0)
  })
  it('compares five recent sessions to five previous sessions and excludes unknown times', () => {
    const base = makeRecord('a',cards,cards.slice(0,6),new Set(),120)
    const rows = Array.from({length:10},(_,i) => ({...base,id:String(i),at:i,correct:i<5?3:6,seconds:i<5?100:80}))
    const result = summarizeHistory(rows)
    expect(result.accuracy).toBe(75)
    expect(result.trend).toBe(50)
    expect(result.timeTrend).toBe(-20)
    expect(summarizeHistory(rows.slice(0,9)).trend).toBeNull()
    expect(summarizeHistory([{...base,seconds:null},{...base,seconds:80}]).seconds).toBe(80)
  })
})

it('keeps a deck name for old and future rounds without changing another deck', async () => {
  const { vi } = await import('vitest')
  const { readHistory, writeHistory, renameHistoryDeck, clearHistory } = await import('../lib/practice-history')
  const values = new Map<string,string>()
  vi.stubGlobal('localStorage', { getItem: (key:string) => values.get(key) ?? null, setItem: (key:string,value:string) => values.set(key,value), removeItem: (key:string) => values.delete(key) })
  try {
    const record = makeRecord('old', cards, cards.slice(0,6), new Set(), 80)
    writeHistory(record)
    renameHistoryDeck(record.deckKey, '  Tournament deck  ')
    writeHistory({...record,id:'new'})
    writeHistory({...record,id:'other',deckKey:'different'})
    expect(readHistory().filter(row => row.deckKey === record.deckKey).map(row => row.deckName)).toEqual(['Tournament deck','Tournament deck'])
    expect(readHistory()[0].deckName).toBe(record.deckName)
    expect(() => renameHistoryDeck(record.deckKey,'   ')).toThrow()
    clearHistory()
    writeHistory(record)
    expect(readHistory()[0].deckName).toBe(record.deckName)
  } finally { vi.unstubAllGlobals() }
})
