"use client"

import { useState } from 'react'
import { Textarea } from './ui/textarea'
import { MAX_DECK_TEXT_LENGTH } from '@/lib/deck-import-security'

// Preserve source text exactly; section edits replace only their own slice.
function sections(text: string) {
  const headers = [...text.matchAll(/^(Pok[eé]mon|Trainers?|Energy)\s*:\s*\d*[^\S\r\n]*\r?$/gim)]
  if (headers.length !== 3 || text.slice(0, headers[0].index).trim()) return null
  if (!/^pok/i.test(headers[0][1]) || !/^trainer/i.test(headers[1][1]) || !/^energy/i.test(headers[2][1])) return null
  return headers.map((header, index) => {
    const headerEnd = header.index! + header[0].length
    const start = headerEnd + (text.slice(headerEnd).match(/^\s*\n/)?.[0].length ?? 0)
    const end = headers[index + 1]?.index ?? text.length
    return { heading: header[0], start, end, body: text.slice(start, end) }
  })
}

export function DeckListEditor({value,onChange,error}: {value:string;onChange:(value:string)=>void;error?:string|null}) {
  const [raw, setRaw] = useState(false)
  const parts = sections(value)
  return <div className="flex h-32 flex-col">
    <div className="flex h-5 shrink-0 items-start justify-end">{parts && <button type="button" className="text-xs text-emerald-200 hover:text-emerald-100" onClick={()=>setRaw(!raw)}>{raw?'Section view':'Edit full list'}</button>}</div>
    {parts && !raw ? <div className="grid min-h-0 flex-1 gap-2 overflow-y-auto md:grid-cols-3 md:overflow-hidden">
      {parts.map((part,index)=><section key={index} className="flex h-24 min-w-0 flex-col rounded-lg border border-slate-600/25 bg-slate-950/30 p-2.5 md:h-full md:min-h-0">
        <label className="mb-2 block shrink-0 text-xs font-semibold text-emerald-300" htmlFor={`deck-section-${index}`}>{part.heading.replace(/^Pokemon/i,'Pokémon').replace(/^Trainer:/i,'Trainers:')}</label>
        <Textarea id={`deck-section-${index}`} aria-invalid={Boolean(error)} spellCheck={false} value={part.body} maxLength={MAX_DECK_TEXT_LENGTH} onChange={event=>onChange(value.slice(0,part.start)+event.target.value+value.slice(part.end))} className="min-h-0 flex-1 resize-none overflow-y-auto border-0 bg-transparent p-0 font-sans text-xs leading-5 text-slate-100 shadow-none focus-visible:ring-emerald-400/40" />
      </section>)}
    </div> : <Textarea aria-label="Deck list" aria-invalid={Boolean(error)} aria-describedby={error?'deck-import-error':undefined} spellCheck={false} rows={5} maxLength={MAX_DECK_TEXT_LENGTH} value={value} onChange={event=>onChange(event.target.value)} className="min-h-0 flex-1 resize-none overflow-y-auto border-0 bg-transparent font-sans text-sm text-slate-100 focus-visible:ring-0" placeholder="Paste deck list here..." />}
  </div>
}
