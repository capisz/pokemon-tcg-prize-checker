"use client"
import {useEffect,useRef,useState} from 'react'
import {Check,ChevronDown} from 'lucide-react'
const modes=[{value:60,label:'1 minute'},{value:120,label:'2 minutes'},{value:180,label:'3 minutes'},{value:0,label:'Untimed'}]
export function PracticeModePicker({value,onChange}:{value:number;onChange:(value:number)=>void}){
 const [open,setOpen]=useState(false)
 const root=useRef<HTMLDivElement>(null),trigger=useRef<HTMLButtonElement>(null)
 useEffect(()=>{if(!open)return;root.current?.querySelector<HTMLButtonElement>('[aria-selected="true"]')?.focus();function outside(event:PointerEvent){if(!root.current?.contains(event.target as Node))setOpen(false)}document.addEventListener('pointerdown',outside);return()=>document.removeEventListener('pointerdown',outside)},[open])
 function close(){setOpen(false);trigger.current?.focus()}
 return <div ref={root} className="relative w-[116px] shrink-0" onBlur={event=>{if(!event.currentTarget.contains(event.relatedTarget))setOpen(false)}}>
 <button ref={trigger} type="button" aria-label={`Practice mode: ${modes.find(mode=>mode.value===value)?.label ?? "Choose duration"}`} aria-haspopup="listbox" aria-expanded={open} onClick={()=>setOpen(!open)} onKeyDown={event=>{if(['ArrowDown','ArrowUp'].includes(event.key)){event.preventDefault();setOpen(true)}}} className="flex min-h-11 sm:min-h-0 sm:h-9 w-full items-center justify-between gap-2 rounded-full border border-emerald-500/35 bg-emerald-900/80 px-4 text-xs font-semibold text-emerald-200 outline-none hover:bg-emerald-900 focus-visible:ring-2 focus-visible:ring-emerald-400/50">
 {modes.find(mode=>mode.value===value)?.label}<ChevronDown aria-hidden="true" className="size-3.5 shrink-0 text-emerald-300"/>
 </button>
 {open&&<div role="listbox" aria-label="Practice duration" className="absolute left-0 top-full z-40 mt-2 w-40 rounded-xl border border-emerald-500/30 bg-slate-950 p-1.5 shadow-xl shadow-black/40" onKeyDown={event=>{const options=[...event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="option"]')];const index=options.indexOf(document.activeElement as HTMLButtonElement);if(event.key==='Escape'){event.preventDefault();close()}if(['ArrowDown','ArrowUp','Home','End'].includes(event.key)){event.preventDefault();options[event.key==='Home'?0:event.key==='End'?options.length-1:(index+(event.key==='ArrowDown'?1:-1)+options.length)%options.length]?.focus()}}}>
 {modes.map(mode=><button key={mode.value} role="option" aria-selected={value===mode.value} type="button" onClick={()=>{onChange(mode.value);close()}} className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs text-slate-200 outline-none hover:bg-emerald-950 focus:bg-emerald-950 aria-selected:text-emerald-300">{mode.label}{value===mode.value&&<Check aria-hidden="true" className="size-3.5"/>}</button>)}
 </div>}
 </div>
}
