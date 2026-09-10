import {it,expect} from 'vitest'
import {makeRecord,prizeInsights,practiceAdvice,practiceSchema,type PracticeRecord} from '../lib/practice-history'
const cards=Array.from({length:60},(_,i)=>({id:`printing-${i}#1`,name:i<4?'Dawn':i===4?'One-of':'Energy'}))
const base=makeRecord('round',cards,cards.slice(0,6),new Set(),100)
function rows(n:number,patch:Partial<PracticeRecord>={}){return Array.from({length:n},(_,i)=>({...base,id:String(i),at:i,...patch}))}
it('combines printings by name and counts three-plus as double prized',()=>{
 expect(base.prizeGroups?.find(c=>c.name==='Dawn')).toEqual({name:'Dawn',deckCount:4,prizeCount:4,missedCount:4})
 const old={...base,prizeGroups:undefined}
 const result=prizeInsights([base,old])
 expect(result.eligible).toBe(1)
 expect(result.double.map(c=>c.name)).toEqual(['Dawn'])
 expect(result.prized.find(c=>c.name==='One-of')?.prized).toBe(1)
 expect(practiceSchema.safeParse(old).success).toBe(true)
 expect(practiceSchema.safeParse({...base,prizeGroups:[{name:'Bad',deckCount:1,prizeCount:6,missedCount:0}]}).success).toBe(false)
})
it('requires five rounds and uses latest ten; timing threshold is strict',()=>{
 expect(practiceAdvice(rows(4,{seconds:1})).personalized).toBe(false)
 expect(practiceAdvice(rows(5,{seconds:59})).text).toContain('Take more time')
 expect(practiceAdvice(rows(5,{seconds:60})).text).toContain('One-of')
 expect(practiceAdvice([...rows(10,{correct:6,missed:[],prizeGroups:undefined}),{...base,at:-1,seconds:1}]).text).toContain('shorter')
 expect(practiceAdvice(rows(12)).sample).toBe(10)
})
it('untimed never judges speed; one-of precedes larger counts; old data has no invented misses',()=>{
 expect(practiceAdvice(rows(5,{duration:0,seconds:1})).text).toContain('One-of')
 expect(practiceAdvice(rows(5,{prizeGroups:base.prizeGroups?.filter(c=>c.name!=='One-of')})).text).toContain('how many copies of Dawn')
 expect(practiceAdvice(rows(5,{seconds:100,prizeGroups:undefined})).text).toContain('Keep checking')
 expect(practiceAdvice(rows(5,{correct:5,prizeGroups:undefined})).text).not.toContain('shorter')
})
