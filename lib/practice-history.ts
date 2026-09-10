import { z } from 'zod'
import type { PokemonCard } from './types'
import { evaluateGuesses, SCORING_VERSION } from './game'

const missedSchema = z.object({ id: z.string().max(100), name: z.string().max(200), count: z.number().int().min(1).max(6) })
const prizeGroupSchema = z.object({name:z.string().min(1).max(200),deckCount:z.number().int().min(1).max(60),prizeCount:z.number().int().min(1).max(6),missedCount:z.number().int().min(0).max(6)}).refine(card=>card.prizeCount<=card.deckCount && card.missedCount<=card.prizeCount)
export const practiceSchema = z.object({
  prizeGroups: z.array(prizeGroupSchema).min(1).max(6).refine(cards=>cards.reduce((sum,card)=>sum+card.prizeCount,0)===6 && new Set(cards.map(card=>card.name)).size===cards.length).optional(),
  syncEpoch: z.number().int().min(0).optional(),
  id: z.string().max(100), deckKey: z.string().max(12000),
  deckId: z.string().max(100).optional(), version: z.string().max(100).optional(), coverCardId: z.string().max(100).optional(), source: z.string().max(12000).optional(), deckName: z.string().max(200), customName: z.boolean().optional(), at: z.number().finite(),
  scoringVersion: z.literal(2), duration: z.union([z.literal(0),z.literal(60),z.literal(120),z.literal(180)]), correct: z.number().int().min(0).max(6),
  seconds: z.number().min(0).max(86400).nullable(), missed: z.array(missedSchema).max(6),
})
export type PracticeRecord = z.infer<typeof practiceSchema>
const KEY = 'prizecheck:practice-history:v1'
const NAMES_KEY = 'prizecheck:practice-deck-names:v1'
function readNames(uid: string | null = null): Record<string, string> {
  try { return z.record(z.string(), z.string().trim().min(1).max(80)).parse(JSON.parse(localStorage.getItem(NAMES_KEY + (uid ? `:${uid}` : '')) || '{}')) } catch { return {} }
}
export function renameHistoryDeck(deckKey: string, name: string, uid: string | null = null) {
  const valid = z.string().trim().min(1).max(80).parse(name)
  localStorage.setItem(NAMES_KEY + (uid ? `:${uid}` : ''), JSON.stringify({ ...readNames(uid), [deckKey]: valid }))
}

export function readHistory(uid: string | null = null): PracticeRecord[] {
  try {
    const values = JSON.parse(localStorage.getItem(KEY + (uid ? `:${uid}` : '')) || '[]')
    if (!Array.isArray(values)) return []
    const names = readNames(uid)
    return values.flatMap(value => { const parsed = practiceSchema.safeParse(value); return parsed.success ? [{ ...parsed.data, ...(Object.hasOwn(names, parsed.data.deckKey) ? { deckName: names[parsed.data.deckKey], customName: true } : {}) }] : [] }).slice(0, 100)
  } catch { return [] }
}
export function writeHistory(record: PracticeRecord, uid: string | null = null) {
  const valid = practiceSchema.parse(record)
  const records = [valid, ...readHistory(uid).filter(item => item.id !== valid.id)].slice(0, 100)
  localStorage.setItem(KEY + (uid ? `:${uid}` : ''), JSON.stringify(records))
}
export function clearHistory(uid: string | null = null) { const suffix = uid ? `:${uid}` : ''; localStorage.removeItem(KEY + suffix); localStorage.removeItem(NAMES_KEY + suffix) }

export function makeRecord(id: string, cards: PokemonCard[], prizes: PokemonCard[], selected: Set<string>, seconds: number | null, duration: 0 | 60 | 120 | 180 = 120): PracticeRecord {
  const canonical = cards.map(card => card.id.split('#')[0]).sort()
  const evaluation = evaluateGuesses(cards, prizes, selected)
  const missed = new Map<string, z.infer<typeof missedSchema>>()
  for (const card of cards) {
    if (evaluation.status.get(card.id) !== 'missed') continue
    const base = card.id.split('#')[0]
    const previous = missed.get(base)
    missed.set(base, { id: base, name: card.name, count: (previous?.count || 0) + 1 })
  }
  const groups = new Map<string,{name:string;deckCount:number;prizeCount:number;missedCount:number}>()
  for(const card of prizes) { const group=groups.get(card.name)||{name:card.name,deckCount:cards.filter(item=>item.name===card.name).length,prizeCount:0,missedCount:0};group.prizeCount++;groups.set(card.name,group) }
  for(const card of missed.values()) { const group=groups.get(card.name);if(group)group.missedCount+=card.count }
  return practiceSchema.parse({ prizeGroups:[...groups.values()], id, deckKey: canonical.join('|'), deckName: [...cards].sort((a,b) => a.id.localeCompare(b.id))[0]?.name || 'Imported deck', at: Date.now(), scoringVersion: SCORING_VERSION, duration, correct: evaluation.correct, seconds, missed: [...missed.values()] })
}
export function summarizeHistory(records: PracticeRecord[]) {
  const ordered = [...records].sort((a,b) => b.at - a.at)
  const accuracy = (items: PracticeRecord[]) => items.length ? items.reduce((sum,item) => sum + item.correct, 0) / (items.length * 6) * 100 : null
  const recent = ordered.slice(0,5), previous = ordered.slice(5,10)
  const timed = ordered.filter(item => item.seconds !== null)
  const misses = new Map<string, { name: string; count: number; sessions: number }>()
  for (const item of ordered) for (const card of item.missed) {
    const old = misses.get(card.id)
    misses.set(card.id, { name: card.name, count: (old?.count || 0) + card.count, sessions: (old?.sessions || 0) + 1 })
  }
  return { accuracy: accuracy(ordered), seconds: timed.length ? timed.reduce((sum,item) => sum + item.seconds!,0) / timed.length : null,
    timeTrend: previous.length === 5 && [...recent, ...previous].every(item => item.seconds !== null) ? recent.reduce((sum,item) => sum + item.seconds!,0) / 5 - previous.reduce((sum,item) => sum + item.seconds!,0) / 5 : null,
    trend: previous.length === 5 ? accuracy(recent)! - accuracy(previous)! : null,
    misses: [...misses.entries()].sort((a,b) => b[1].count - a[1].count),
    recent,
  }
}

export function prizeInsights(records:PracticeRecord[]) {
  const eligible=records.filter(record=>record.prizeGroups)
  const counts=new Map<string,{name:string;prized:number;double:number}>()
  for(const record of eligible) for(const card of record.prizeGroups!) {
    const item=counts.get(card.name)||{name:card.name,prized:0,double:0}
    item.prized++;if(card.prizeCount>=2)item.double++;counts.set(card.name,item)
  }
  const rows=[...counts.values()]
  return {eligible:eligible.length,prized:[...rows].sort((a,b)=>b.prized-a.prized||a.name.localeCompare(b.name)),double:[...rows].filter(item=>item.double>0).sort((a,b)=>b.double-a.double||a.name.localeCompare(b.name))}
}
export function practiceAdvice(records:PracticeRecord[]) {
  const recent=[...records].sort((a,b)=>b.at-a.at).slice(0,10)
  const sample=recent.length
  const general='Confirm one-of cards first, then check the missing quantities in your larger card counts.'
  if(sample<5)return {text:general,sample,personalized:false}
  const accuracy=recent.reduce((sum,item)=>sum+item.correct,0)/(sample*6)
  const known=recent.filter(item=>item.seconds!==null)
  const average=known.length?known.reduce((sum,item)=>sum+item.seconds!,0)/known.length:null
  if(recent[0].duration>0 && known.length===sample && accuracy<0.8 && average!==null && average<recent[0].duration/2)return {text:'Take more time to check your list before guessing. Accuracy matters more than finishing early.',sample,personalized:true}
  function mostMissed(predicate:(count:number)=>boolean){const counts=new Map<string,number>();for(const record of recent)for(const card of record.prizeGroups||[])if(predicate(card.deckCount)&&card.missedCount)counts.set(card.name,(counts.get(card.name)||0)+card.missedCount);return [...counts].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]))[0]?.[0]}
  const singleton=mostMissed(count=>count===1),large=mostMissed(count=>count>=4)
  if(singleton)return {text:`Check ${singleton} and your other one-of cards first; they have been missed in these rounds.`,sample,personalized:true}
  if(large)return {text:`Verify how many copies of ${large} are missing, then check your other larger card counts.`,sample,personalized:true}
  return {text:accuracy>=0.9 && recent[0].duration>60?'Your accuracy is strong. Try a shorter timed mode when you feel comfortable.':'Keep checking the full list and missing quantities before submitting.',sample,personalized:true}
}
