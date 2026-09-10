"use client"
import { useEffect, useState } from 'react'
import { Modal } from './modal'
import { Button } from './ui/button'
import { readHistory, writeHistory, renameHistoryDeck, clearHistory, summarizeHistory, prizeInsights, practiceAdvice, type PracticeRecord } from '@/lib/practice-history'
import { currentAccount } from '@/lib/firebase/client'
import { fetchPractice, clearCloudPractice } from '@/lib/firebase/history'
import { ChoicePicker } from './choice-picker'
import { historyName,saveHistoryName } from '@/lib/firebase/history-names'
import { enqueuePractice,flushQueue,syncStatus } from '@/lib/firebase/sync-queue'
import { loadDeckSnapshot,renameDeck } from '@/lib/firebase/decks'
import { usePractice, type DeckBinding } from './practice-context'
import { doc, getDocFromServer, type QueryDocumentSnapshot } from 'firebase/firestore'
import { getFirebaseServices } from '@/lib/firebase/client'

const primaryAction = 'rounded-full bg-emerald-500 px-5 font-semibold text-slate-950 shadow-md shadow-emerald-500/20 hover:bg-emerald-400 focus-visible:ring-emerald-300'
const secondaryAction = 'rounded-full border border-emerald-500/25 bg-emerald-950/40 text-emerald-200 hover:bg-emerald-900/50 hover:text-emerald-100 focus-visible:ring-emerald-300'
const quietAction = 'rounded-full text-slate-400 hover:bg-slate-800 hover:text-emerald-200'
const fieldStyle = 'mt-1.5 block h-10 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 text-sm text-slate-100 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20'

export function PracticeHistory({embedded = false, onPractice}: {embedded?:boolean; onPractice?:(text:string,binding:DeckBinding | null)=>void}) {
  const [open,setOpen]=useState(false)
  const uid=currentAccount()?.uid || null
  if(embedded) return <HistoryPanel key={uid || 'guest'} uid={uid} onPractice={onPractice} />
  return <><Button variant="ghost" className="text-emerald-300" onClick={()=>setOpen(true)}>Practice history</Button>
    <Modal open={open} onOpenChange={setOpen} title="Practice history" overlayClassName="fixed inset-0 z-50 bg-black/75" className="w-[calc(100%-2rem)] max-w-lg rounded-3xl border border-emerald-500/50 bg-slate-950 px-6 py-5 text-sm text-slate-100 shadow-xl">
      <div className="flex items-center justify-between"><h2 className="text-lg font-semibold text-emerald-300">Practice history</h2><Button variant="ghost" className={quietAction} onClick={()=>setOpen(false)}>Close history</Button></div>
      {open && <HistoryPanel key={uid || 'guest'} uid={uid} onPractice={onPractice} />}
    </Modal></>
}
function HistoryPanel({uid,onPractice}:{uid:string|null;onPractice?:(text:string,binding:DeckBinding|null)=>void}) {
  const practice=usePractice()
  const [records,setRecords]=useState<PracticeRecord[]>(()=>readHistory(uid))
  const [deck,setDeck]=useState('')
  const [mode,setMode]=useState('120')
  const [cursor,setCursor]=useState<QueryDocumentSnapshot>()
  const [more,setMore]=useState(false)
  const [busy,setBusy]=useState(false)
  const [error,setError]=useState('')
  const [notice,setNotice]=useState('')
  const [confirm,setConfirm]=useState<'clear'|'transfer'|null>(null)
  const [nameState,setNameState]=useState('')
  const [expanded,setExpanded]=useState(false)
  const [frequency,setFrequency]=useState('prized')
  const [sync,setSync]=useState(uid?syncStatus(uid):'saved')
  const [name,setName]=useState('')
  const [identities,setIdentities]=useState<Record<string,{name:string;coverCardId?:string}>>({})
  const groupKey=(item:PracticeRecord)=>item.deckId ? `${item.deckId}:${item.version}` : item.deckKey
  const selected=records.filter(item=>groupKey(item)===deck && item.duration===Number(mode))
  const summary=summarizeHistory(selected)
  const insights=prizeInsights(selected), advice=practiceAdvice(selected)
  const decks=[...new Map([...records].reverse().map(item=>[groupKey(item),item])).values()]
  const current=decks.find(item=>groupKey(item)===deck)
  const identity=current?.deckId ? identities[current.deckId] : undefined
  const displayName=(item:PracticeRecord,index:number)=> item.deckId && identities[item.deckId] ? identities[item.deckId].name : item.customName ? item.deckName : `Deck ${index+1} · ${item.deckName}`
  useEffect(()=>{const update=()=>{if(uid)setSync(syncStatus(uid))};window.addEventListener('prizecheck-sync',update);return()=>window.removeEventListener('prizecheck-sync',update)},[uid])
  useEffect(()=>{setName(identity?.name||current?.deckName||'')},[deck,identity?.name,current?.deckName])
  useEffect(()=>{ if(!decks.some(item=>groupKey(item)===deck)) setDeck(decks[0]?groupKey(decks[0]):'') },[records,deck])
  useEffect(()=>{
    if(!uid) return
    let active=true
    setBusy(true)
    fetchPractice(uid).then(result=>{if(active){setRecords(merge(result.records,readHistory(uid)));setCursor(result.cursor);setMore(result.more)}}).catch(()=>{if(active)setError('Could not load account history. Device records are still available.')}).finally(()=>{if(active)setBusy(false)})
    return ()=>{active=false}
  },[uid])
  useEffect(()=>{
    if(!uid) return
    let active=true
    void Promise.all([...new Set(records.filter(item=>!item.deckId).map(item=>item.deckKey))].map(async key=>{const name=await historyName(uid,key);return [key,name] as const})).then(names=>{if(active)setRecords(old=>old.map(row=>{const name=names.find(([key])=>key===row.deckKey)?.[1];return name&&name!==row.deckName?{...row,deckName:name,customName:true}:row}))}).catch(()=>{})
    const ids=[...new Set(records.flatMap(item=>item.deckId?[item.deckId]:[]))]
    void Promise.all(ids.map(async id=>{const snapshot=await getDocFromServer(doc(getFirebaseServices().db,'users',uid,'decks',id));return snapshot.exists()?[id,{name:String(snapshot.data().name),coverCardId:snapshot.data().coverCardId}] as const:null})).then(items=>{if(active)setIdentities(Object.fromEntries(items.filter(item=>item!==null)))}).catch(()=>{})
    return ()=>{active=false}
  },[records.map(item=>item.id).join("|"),uid])
  function merge(a:PracticeRecord[],b:PracticeRecord[]) { return [...new Map([...a,...b].map(item=>[item.id,item])).values()].sort((x,y)=>y.at-x.at) }
  async function run(action:()=>Promise<void>) {setBusy(true);setError('');setNotice('');try{await action()}catch{setError('Could not complete this action. Check your connection and retry.')}finally{setBusy(false)}}
  async function saveName(){
    if(!current||nameState==='Saving…')return
    const value=name.trim(), previous=identity?.name||current.deckName
    if(value===previous)return
    if(!value||value.length>80){setNameState('Could not save: use 1–80 characters.');return}
    setNameState('Saving…')
    try{
      if(uid&&current.deckId){await renameDeck(current.deckId,value);if(practice.binding?.id===current.deckId)practice.setBinding({...practice.binding,name:value});setIdentities(old=>({...old,[current.deckId!]:{...old[current.deckId!],name:value}}));window.dispatchEvent(new Event('prizecheck-decks-changed'))}
      else {if(uid)await saveHistoryName(uid,current.deckKey,value);renameHistoryDeck(current.deckKey,value,uid);setRecords(old=>old.map(row=>row.deckKey===current.deckKey?{...row,deckName:value,customName:true}:row))}
      setName(value);setNameState('Saved')
    }catch{setNameState('Could not save. Check your connection and retry.')}
  }
  return <div className="space-y-4 pt-2">
    {uid && <details className="rounded-xl border border-slate-800 p-3 text-sm"><summary className="cursor-pointer text-slate-300">Device history <span className="float-right text-xs text-emerald-300">{sync==='saved'?'Saved':sync==='syncing'?'Syncing…':'Retry needed'}</span></summary><div className="mt-3 flex flex-wrap gap-3"><Button size="sm" variant="outline" className={secondaryAction} disabled={busy} onClick={()=>void run(async()=>{await flushQueue(uid);setSync(syncStatus(uid))})}>Retry sync</Button>{readHistory().length>0 && <Button size="sm" variant="outline" className={secondaryAction} disabled={busy} onClick={()=>setConfirm('transfer')}>Transfer guest history</Button>}</div>
    {confirm==='transfer' && <div className="mt-3 rounded-xl bg-slate-900 p-3"><p className="mb-3 text-sm text-slate-300">Add guest rounds from this browser? These may include other people’s practice.</p><Button className={primaryAction} disabled={busy} onClick={()=>void run(async()=>{for(const row of readHistory()){const record={...row};delete record.deckId;delete record.version;await enqueuePractice(uid,record);writeHistory(record,uid)}setRecords(merge(records,readHistory(uid)));setConfirm(null);setNotice('Guest rounds added. Originals remain on this device.')})}>Confirm transfer</Button><Button variant="ghost" className={quietAction} disabled={busy} onClick={()=>setConfirm(null)}>Cancel</Button></div>}</details>}
    {!records.length ? <div className="rounded-2xl border border-dashed border-slate-700/80 bg-slate-900/30 px-5 py-7 text-center"><p className="text-sm text-slate-300">Your progress starts with your first round.</p></div> : <>
      <div className="grid gap-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]"><div><p className="mb-1.5 text-xs text-slate-400">Deck revision</p><ChoicePicker label="History deck" value={deck} onChange={setDeck} options={decks.map((item,index)=>({value:groupKey(item),label:displayName(item,index)+(item.version?` · revision ${item.version.slice(0,6)}`:'')}))}/></div><div><p className="mb-1.5 text-xs text-slate-400">Mode</p><ChoicePicker label="History mode" value={mode} onChange={setMode} options={[{value:'60',label:'1 minute'},{value:'120',label:'2 minutes'},{value:'180',label:'3 minutes'},{value:'0',label:'Untimed'}]}/></div></div>
      <label className="block text-xs text-slate-400">Deck name<input data-escape-local="true" aria-label="Deck name" className={fieldStyle} value={name} maxLength={80} disabled={nameState==='Saving…'} onChange={event=>{setName(event.target.value);setNameState('')}} onBlur={()=>void saveName()} onKeyDown={event=>{if(event.key==='Enter'){event.preventDefault();void saveName()}if(event.key==='Escape'){event.preventDefault();setName(identity?.name||current?.deckName||'');setNameState('')}}}/><span role={nameState.startsWith('Could')?'alert':'status'} className="mt-1 block min-h-4 text-xs">{nameState}</span></label>
      <div className="grid grid-cols-2 gap-3"><div className="rounded-xl bg-slate-900 p-3"><p className="text-2xl font-semibold text-emerald-300">{summary.accuracy===null?'—':`${Math.round(summary.accuracy)}%`}</p><p className="text-xs text-slate-300">Accuracy</p></div><div className="rounded-xl bg-slate-900 p-3"><p className="text-2xl font-semibold text-emerald-300">{summary.seconds===null?'—':`${Math.round(summary.seconds)}s`}</p><p className="text-xs text-slate-300">Average inspection time</p></div></div>
      <p className="text-xs text-slate-400">{selected.length} comparable {selected.length===1?'round':'rounds'} · same revision and mode</p>
      <div className="rounded-xl border border-emerald-500/20 bg-emerald-950/25 p-3"><p className="text-sm text-emerald-100">{advice.text}</p><p className="mt-2 text-xs text-slate-400">{advice.personalized?`Based on your latest ${advice.sample} rounds`:`General advice · ${advice.sample}/5 rounds before personalized tips`}</p></div>
      <section className="space-y-3"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-sm font-semibold text-emerald-200">Prize frequency</h3><div className="w-48"><ChoicePicker label="Prize frequency" value={frequency} onChange={value=>{setFrequency(value);setExpanded(false)}} options={[{value:'prized',label:'Most frequently prized'},{value:'double',label:'Most double prized'}]}/></div></div>
      <p className="text-xs text-slate-400">Observed in {insights.eligible} recorded rounds, not a prediction. Same-name printings are combined, even if their effects differ. Double prized means two or more copies.</p>
      {!insights.eligible?<p className="text-sm text-slate-300">Complete a new round to collect prize statistics. Older rounds still count toward speed and accuracy.</p>:<><table className="w-full text-left text-sm"><thead className="text-xs text-slate-400"><tr><th className="py-2 font-normal">Card</th><th className="text-right font-normal">Rounds</th><th className="text-right font-normal">%</th></tr></thead><tbody>{(frequency==='double'?insights.double:insights.prized).slice(0,expanded?undefined:5).map(card=><tr key={card.name} className="border-t border-slate-800"><td className="py-2 pr-2">{card.name}</td><td className="text-right tabular-nums">{frequency==='double'?card.double:card.prized}/{insights.eligible}</td><td className="text-right tabular-nums">{Math.round((frequency==='double'?card.double:card.prized)/insights.eligible*100)}%</td></tr>)}</tbody></table>{frequency==='double'&&!insights.double.length&&<p className="text-xs text-slate-400">No double-prized cards recorded yet.</p>}{(frequency==='double'?insights.double:insights.prized).length>5&&<Button variant="ghost" className={quietAction} onClick={()=>setExpanded(!expanded)}>{expanded?'Show top five':'Show all cards'}</Button>}</>}</section>
      <details className="border-t border-slate-800 pt-3"><summary className="cursor-pointer text-sm text-slate-300">Recent rounds</summary><ul className="mt-3 space-y-2 text-xs">{summary.recent.map(item=><li key={item.id} className="flex justify-between"><span>{new Date(item.at).toLocaleDateString()}</span><span>{item.correct}/6 · {item.seconds===null?'No timing':`${item.seconds}s`}</span></li>)}</ul></details>
      {onPractice && current && (current.source || current.deckId) && <Button className="rounded-full bg-emerald-500 text-slate-950" disabled={busy} onClick={()=>void run(async()=>{if(current.deckId && uid){const saved=await loadDeckSnapshot(current.deckId,current.version);onPractice(saved.text,saved.binding)}else if(current.source)onPractice(current.source,null)})}>Practice this deck</Button>}
      {confirm==='clear'?<div><p className="mb-2">Delete {uid?'all account history and this account’s device records':'guest history and names on this device'}? This cannot be undone.</p><Button className={primaryAction} disabled={busy} onClick={()=>void run(async()=>{if(uid)await clearCloudPractice(uid);clearHistory(uid);setRecords([]);setCursor(undefined);setMore(false);setIdentities({});setConfirm(null)})}>Confirm clear history</Button><Button variant="ghost" className={quietAction} onClick={()=>setConfirm(null)}>Cancel</Button></div>:<Button variant="ghost" className={quietAction} disabled={busy} onClick={()=>setConfirm('clear')}>{uid?'Clear account history':'Clear device history'}</Button>}
    </>}
    {more && <Button className={primaryAction} disabled={busy} variant="outline" onClick={()=>void run(async()=>{const page=await fetchPractice(uid!,cursor);setRecords(merge(records,page.records));setCursor(page.cursor);setMore(page.more)})}>Load more history</Button>}
    {busy && <p role="status">Working…</p>}{notice && <p role="status" className="text-xs text-emerald-300">{notice}</p>}{error && <p role="alert" className="text-rose-300">{error}</p>}
  </div>
}
