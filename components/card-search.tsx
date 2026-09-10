"use client"
import {useEffect,useId,useState} from 'react'

type Match={name:string;code:string}
export function CardSearch(){
 const [query,setQuery]=useState(''),[cards,setCards]=useState<Match[]>([]),[open,setOpen]=useState(false),[active,setActive]=useState(-1),[status,setStatus]=useState('')
 const id=useId()
 useEffect(()=>{setCards([]);setActive(-1);setStatus('');if(query.trim().length<2)return;const controller=new AbortController();const timer=setTimeout(async()=>{setStatus('Searching…');try{const response=await fetch(`/api/cards?q=${encodeURIComponent(query.trim())}`,{signal:controller.signal});if(!response.ok)throw Error();const result=await response.json();if(controller.signal.aborted)return;setCards(result.cards);setStatus(result.cards.length?'':'No matching cards.')}catch{if(!controller.signal.aborted)setStatus('Search unavailable. Try again.')}},200);return()=>{clearTimeout(timer);controller.abort()}},[query])
 async function copy(card:Match){try{await navigator.clipboard.writeText(card.code);setStatus(`Copied ${card.code}`);setOpen(false)}catch{setStatus(`Copy manually: ${card.code}`)}}
 return <div className="relative w-full max-w-xs min-w-0" onBlur={event=>{if(!event.currentTarget.contains(event.relatedTarget))setOpen(false)}}>
 <input role="combobox" aria-label="Find a card code" aria-autocomplete="list" aria-expanded={open&&query.trim().length>=2} aria-controls={id} aria-activedescendant={active>=0?`${id}-${active}`:undefined} value={query} maxLength={80} placeholder="Find a card code…" className="h-8 w-full rounded-full border border-emerald-500/25 bg-slate-950/60 px-3 text-xs text-slate-100 outline-none placeholder:text-slate-400 focus:border-emerald-400" onFocus={()=>setOpen(true)} onChange={event=>{setQuery(event.target.value);setOpen(true)}} onKeyDown={event=>{if(event.key==='Escape')setOpen(false);if(event.key==='ArrowDown'){event.preventDefault();setOpen(true);setActive(i=>Math.min(i+1,cards.length-1))}if(event.key==='ArrowUp'){event.preventDefault();setActive(i=>Math.max(0,i-1))}if(event.key==='Enter'&&cards[active]){event.preventDefault();void copy(cards[active])}}}/>
 {open&&query.trim().length>=2&&<div className="absolute left-0 top-full z-40 mt-2 max-h-64 w-full overflow-y-auto rounded-xl border border-emerald-500/30 bg-slate-950 p-1 shadow-xl"><ul id={id} role="listbox" aria-label="Card matches">{cards.map((card,i)=><li key={card.code} id={`${id}-${i}`} role="option" aria-selected={active===i} onMouseDown={event=>event.preventDefault()} onClick={()=>void copy(card)} className={`cursor-pointer rounded-lg px-3 py-2 text-xs hover:bg-emerald-950 ${active===i?'bg-emerald-950':''}`}><span className="block text-slate-100">{card.name}</span><span className="text-emerald-300">{card.code}</span></li>)}</ul>{status&&<p className="px-3 py-2 text-xs text-slate-400">{status}</p>}</div>}
 <span role="status" className="sr-only">{status}</span>
 </div>
}
