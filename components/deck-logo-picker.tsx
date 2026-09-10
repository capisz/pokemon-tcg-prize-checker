"use client"
import { useEffect, useState } from 'react'
import { loadDeck } from '@/lib/firebase/decks'
import { parseIdsFromText } from '@/lib/deck-parser'
import { fetchLogoCards } from '@/lib/deck-logo'
import type { ImportedCard } from '@/lib/card-contract'
import { Button } from './ui/button'

export function DeckLogoPicker({ deckId, busy, onChoose, onClose }: { deckId: string; busy: boolean; onChoose: (card: ImportedCard) => void; onClose: () => void }) {
  const [cards,setCards] = useState<ImportedCard[]>([])
  const [failed,setFailed] = useState(false)
  const [attempt,setAttempt] = useState(0)
  useEffect(() => {
    let active = true
    setCards([]); setFailed(false)
    loadDeck(deckId).then(source => fetchLogoCards(parseIdsFromText(source).uniqueIds)).then(result => { if(active) setCards(result) }).catch(() => { if(active) setFailed(true) })
    return () => { active = false }
  }, [deckId,attempt])
  return <div className="mt-3 border-t border-slate-800 pt-3">
    <div className="mb-2 flex items-center justify-between"><p className="text-xs text-slate-300">Choose a card from this deck</p><Button size="sm" variant="ghost" onClick={onClose}>Cancel logo</Button></div>
    {failed ? <Button variant="ghost" onClick={() => setAttempt(value => value+1)}>Retry loading cards</Button> : !cards.length ? <p role="status" className="text-xs text-slate-400">Loading cards…</p> : <div className="grid max-h-56 grid-cols-4 gap-2 overflow-y-auto">{cards.map(card => <button type="button" disabled={busy} key={card.id} aria-label={`Use ${card.name} ${card.id} as logo`} onClick={() => onChoose(card)} className="rounded-lg border border-slate-700 p-1 text-left hover:border-emerald-300 focus-visible:outline-2 focus-visible:outline-emerald-300 disabled:opacity-50">
      {card.image && <img src={card.image} alt="" className="aspect-[2.5/3.5] w-full rounded object-contain" />}
      <span className="mt-1 block truncate text-[10px]">{card.name}</span>
    </button>)}</div>}
  </div>
}
