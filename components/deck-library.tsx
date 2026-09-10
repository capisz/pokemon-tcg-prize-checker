"use client"

import { useEffect, useRef, useState } from 'react'
import { onAuthStateChanged, type User } from 'firebase/auth'
import { readStorage, writeStorage } from '@/lib/storage'
import { usePractice, type DeckBinding } from './practice-context'
import { deleteAccount } from '@/lib/firebase/account'
import { fetchPractice } from '@/lib/firebase/history'
import { PracticeHistory } from './practice-history'
import { Modal } from './modal'
import { DeckLogoPicker } from './deck-logo-picker'
import { fetchLogoCards } from '@/lib/deck-logo'
import type { ImportedCard } from '@/lib/card-contract'
import { X } from 'lucide-react'
import { Button } from './ui/button'
import { firebaseConfigured, getFirebaseServices, signInWithGoogle, signOutOfAccount } from '@/lib/firebase/client'
import { deleteDeck, listDecks, loadDeck, loadDeckSnapshot, reviseDeck, newDeckId, saveDeck, renameDeck, setDeckLogo, type DeckCursor, type SavedDeck } from '@/lib/firebase/decks'

function message(error: unknown) {
  const code = (error as { code?: string })?.code
  if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') return 'Sign-in was cancelled. You can keep practicing as a guest.'
  if (code === 'auth/popup-blocked') return 'Allow pop-ups for this site, then try signing in again.'
  if (code === 'permission-denied') return 'Your account cannot access this data. The database may still be locked for setup.'
  return 'Could not reach your library. Check your connection (and local emulators), then retry. Guest practice still works.'
}
async function bounded<T>(work: Promise<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined
  try { return await Promise.race([work, new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error('timeout')), 12000) })]) }
  finally { clearTimeout(timer) }
}

const primaryButton = "rounded-full bg-emerald-500 px-5 font-semibold text-slate-950 shadow-md shadow-emerald-500/30 hover:bg-emerald-400"

export function DeckLibrary({ text, onLoad, cards }: { cards: ImportedCard[]; text: string | null; onLoad: (text: string, binding: DeckBinding | null) => void }) {
  const practice = usePractice()
  const [tab,setTab] = useState<'decks'|'progress'>('decks')
  const [savingForm,setSavingForm] = useState(false)
  const [deleteConfirmation,setDeleteConfirmation] = useState(false)
  const [revisionTarget,setRevisionTarget] = useState<string | null>(null)
  const [lastPracticed,setLastPracticed] = useState<Record<string,number>>({})
  const revisionOperation = useRef<{key:string;id:string}|null>(null)
  const [open, setOpen] = useState(false)
  const [activated, setActivated] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [ready, setReady] = useState(false)
  const [decks, setDecks] = useState<SavedDeck[]>([])
  const [cursor, setCursor] = useState<DeckCursor>()
  const [hasMore, setHasMore] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [name, setName] = useState('')
  const [cover, setCover] = useState('')
  const [logoPicker, setLogoPicker] = useState<string | null>(null)
  const [logos, setLogos] = useState<Record<string, ImportedCard>>({})
  const coverCardId = cards.some(card => card.id === cover) ? cover : cards[0]?.id
  const coverCard = cards.find(card => card.id === coverCardId)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [editing, setEditing] = useState<string | null>(null)
  const [editedName, setEditedName] = useState('')
  const [search, setSearch] = useState('')
  const visibleDecks = decks.filter(deck => deck.name.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()))
  const generation = useRef(0)
  const operation = useRef<{ key: string; id: string } | null>(null)

  useEffect(()=>{if(readStorage('prizecheck:account-enabled') === 'true') setActivated(true)},[])
  useEffect(() => {
    if (!activated || !firebaseConfigured) return
    const unsubscribe = onAuthStateChanged(getFirebaseServices().auth, account => {
      writeStorage('prizecheck:account-enabled', account ? 'true' : 'false')
      generation.current++
      setUser(account); setReady(true); setDecks([]); setCursor(undefined); setHasMore(false)
      setTab('decks'); setSavingForm(false); setDeleteConfirmation(false); setRevisionTarget(null); setLastPracticed({}); if(practice.binding && practice.binding.uid !== account?.uid) practice.setBinding(null); setLogoPicker(null); setLogos({}); setCover(''); setEditing(null); setSearch(''); setEditedName(''); setError(''); setNotice(''); setBusy(false); setConfirmDelete(null); operation.current = null
    }, () => { setReady(true); setError('Could not restore your sign-in. Close the library and try again.') })
    return () => { generation.current++; unsubscribe() }
  }, [activated])

  async function run(action: () => Promise<void>) {
    const token = generation.current
    setBusy(true); setError(''); setNotice('')
    try { await action() }
    catch (err) { if (generation.current === token) setError(message(err)) }
    finally { if (generation.current === token) setBusy(false) }
  }
  async function refresh(more = false) {
    const token = generation.current
    const result = await bounded(listDecks(more ? cursor : undefined))
    if (generation.current !== token) return
    setDecks(previous => more ? [...previous, ...result.decks.filter(deck => !previous.some(item => item.id === deck.id))] : result.decks)
    setCursor(result.cursor); setHasMore(result.hasMore)
    const uid = getFirebaseServices().auth.currentUser?.uid
    if(uid) void fetchPractice(uid).then(page=>{if(generation.current === token){const dates:Record<string,number>={};for(const record of page.records)if(record.deckId)dates[record.deckId]=Math.max(dates[record.deckId]||0,record.at);setLastPracticed(dates)}}).catch(()=>{})
    // Artwork lookup is optional; a missing image must not block deck actions.
    void fetchLogoCards(result.decks.flatMap(deck => deck.coverCardId ? [deck.coverCardId] : [])).then(cards => {
      if (generation.current === token) setLogos(previous => ({ ...previous, ...Object.fromEntries(cards.map(card => [card.id,card])) }))
    }).catch(() => {})
  }
  useEffect(() => {
    if (user && open) void run(() => refresh())
    // Refresh on opening or account change; no background reads while practicing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid, open])

  useEffect(()=>{const update=()=>{if(user&&open)void run(()=>refresh())};window.addEventListener('prizecheck-decks-changed',update);return()=>window.removeEventListener('prizecheck-decks-changed',update)},[user?.uid,open])
  return <>
    <Button id="deck-library-trigger" size="sm"
      className="shrink-0 rounded-full bg-emerald-400 px-5 font-semibold text-slate-950 shadow-[0_0_14px_rgba(52,211,153,0.3)] transition-all hover:bg-emerald-300 focus-visible:ring-emerald-300 active:scale-95"
      onClick={() => { setActivated(true); setOpen(true) }}>{user ? 'My decks' : 'Log in'}</Button>
    <Modal open={open} onOpenChange={setOpen} title="My decks" returnFocusSelector="#deck-library-trigger"
      overlayClassName="fixed inset-0 z-50 bg-black/75"
      className="w-[calc(100%-2rem)] max-w-lg rounded-3xl border border-emerald-500/50 bg-slate-950 px-6 py-5 text-sm leading-relaxed text-slate-50 shadow-[0_24px_60px_rgba(0,0,0,0.9)]">
      <button type="button" aria-label="Close" onClick={() => setOpen(false)}
        className="absolute right-3 top-3 rounded text-slate-400 hover:text-emerald-300 focus-visible:outline-2 focus-visible:outline-emerald-300">
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
      <div className="mb-3 flex items-center gap-2 pr-5">
        <h2 className="text-lg font-semibold">{user ? <span className="text-emerald-300">My decks</span> : <><span className="text-emerald-300">Log in to</span> <span className="text-emerald-100">PrizeCheck.us</span></>}</h2>
      </div>
      <nav aria-label="Library sections" className="mb-4 flex gap-2 border-b border-slate-800 pb-3">
        <Button size="sm" variant="ghost" aria-pressed={tab==='decks'} className={tab==='decks'?'bg-emerald-950 text-emerald-300':'text-slate-400'} onClick={()=>setTab('decks')}>Decks</Button>
        <Button size="sm" variant="ghost" aria-pressed={tab==='progress'} className={tab==='progress'?'bg-emerald-950 text-emerald-300':'text-slate-400'} onClick={()=>setTab('progress')}>Progress</Button>
      </nav>
      {notice && <p className="mt-3 text-sm text-emerald-300" role="status">{notice}</p>}
      {tab==='progress' ? <PracticeHistory key={user?.uid || 'guest'} embedded onPractice={(source,binding)=>{onLoad(source,binding);setOpen(false)}} /> : <>
      {!firebaseConfigured ? <p className="mt-4">Account saving is not configured yet. You can still import decks and practice.</p> : !ready ? <p role="status">Checking sign-in…</p> : !user ? <div className="mt-4 space-y-4">
        <p className="text-slate-300">Sign in or create an account with Google.</p>
        <Button className={primaryButton} disabled={busy} onClick={() => void run(async () => { await signInWithGoogle() })}>Continue with Google</Button>
      </div> : <div className="mt-4 space-y-5">

        {text && <Button size="sm" variant="outline" aria-expanded={savingForm} onClick={()=>setSavingForm(!savingForm)}>{savingForm?'Cancel save':'Save current deck'}</Button>}
        {text && savingForm && <form className="space-y-3 rounded-xl bg-slate-900/70 p-3" onSubmit={event => {
          event.preventDefault()
          if (!text || !name.trim() || busy) return
          const token = generation.current
          const key = JSON.stringify([user.uid, name.trim(), text, coverCardId])
          if (operation.current?.key !== key) operation.current = { key, id: newDeckId() }
          const id = operation.current.id
          void run(async () => {
            await bounded(saveDeck(id, { name, text, coverCardId }))
            if (generation.current !== token) return
            const saved = await loadDeckSnapshot(id)
            if(generation.current !== token) return
            practice.setBinding(saved.binding)
            setNotice('Deck saved.'); operation.current = null; setName(''); setSavingForm(false)
            await refresh()
          })
        }}>
          <label htmlFor="saved-deck-name" className="block text-sm font-medium">Save current imported deck</label>
          <input id="saved-deck-name" value={name} onChange={event => setName(event.target.value)} maxLength={80} required disabled={busy || !text} placeholder="Deck name" className="w-full rounded-md border border-slate-600 bg-slate-900 p-2 text-sm" />
          <div className="flex items-center gap-3">
            {coverCard?.image && <img src={coverCard.image} alt="Selected deck logo" className="h-14 w-10 shrink-0 rounded object-contain" />}
            <label className="min-w-0 flex-1 text-xs text-slate-400">Deck logo<select aria-label="Deck logo" value={coverCardId || ''} disabled={busy} onChange={event => setCover(event.target.value)} className="mt-1 block w-full rounded border border-slate-700 bg-slate-950 p-2 text-slate-100">{cards.map(card => <option key={card.id} value={card.id}>{card.name}</option>)}</select></label>
            <Button size="sm" className={primaryButton} disabled={busy || !name.trim()} type="submit">Save deck</Button>
          </div>
        </form>}
        <div className="flex items-center justify-between"><h3 className="font-medium">Saved decks</h3><Button size="sm" variant="ghost" className="text-xs text-slate-400" disabled={busy} onClick={() => void run(() => refresh())}>Refresh</Button></div>
        {!decks.length && !busy && !error && <div className="rounded-xl border border-dashed border-slate-700 px-4 py-7 text-center"><p className="text-slate-200">No saved decks yet.</p>{!text && <><p className="mt-1 text-xs text-slate-400">Import a deck to save it here.</p><Button className="mt-3 rounded-full text-emerald-300" variant="ghost" onClick={() => setOpen(false)}>Import a deck</Button></>}</div>}
        {decks.length > 0 && <input type="search" aria-label="Filter loaded decks" placeholder="Find a deck…" value={search} onChange={event => setSearch(event.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-900 p-2 text-sm" />}
        {search && !visibleDecks.length && <p className="text-slate-400">No matching decks{hasMore ? ' in this page. Load more to keep looking.' : '.'}</p>}
        <ul className="space-y-3">{visibleDecks.map(deck => <li key={deck.id} className="relative rounded-xl border border-slate-800 bg-slate-900/40 p-3">
          <div className="flex items-start gap-3">
          <button type="button" title="Change deck logo" aria-label={`Change logo for ${deck.name}`} disabled={busy} onClick={() => setLogoPicker(deck.id)} className="flex h-20 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-emerald-500/20 bg-emerald-950/40 text-xl font-semibold text-emerald-300 hover:border-emerald-400 focus-visible:outline-2 focus-visible:outline-emerald-300">
            {deck.coverCardId && logos[deck.coverCardId]?.image ? <img src={logos[deck.coverCardId].image} alt="" className="h-full w-full object-contain" /> : deck.name.slice(0,1).toUpperCase()}
          </button>
          <div className="min-w-0 flex-1">
          {editing === deck.id ? <form className="mb-3 space-y-2" onSubmit={event => {
            event.preventDefault()
            if (busy || !editedName.trim()) return
            const token = generation.current
            const nextName = editedName.trim()
            void run(async () => {
              await bounded(renameDeck(deck.id, nextName))
              if (generation.current !== token) return
              setDecks(previous => previous.map(item => item.id === deck.id ? { ...item, name: nextName } : item))
              if(practice.binding?.id===deck.id)practice.setBinding({...practice.binding,name:nextName})
              setEditing(null); setNotice('Deck renamed.')
            })
          }}>
            <label htmlFor={`rename-${deck.id}`} className="block font-medium">Deck name</label>
            <input id={`rename-${deck.id}`} autoFocus maxLength={80} required value={editedName} disabled={busy} onChange={event => setEditedName(event.target.value)} className="w-full rounded-md border border-emerald-500/50 bg-slate-900 p-2" />
            <div className="flex gap-2"><Button className={primaryButton} type="submit" disabled={busy || !editedName.trim()}>Save name</Button><Button type="button" variant="ghost" disabled={busy} onClick={() => setEditing(null)}>Cancel rename</Button></div>
          </form> : <p className="mb-2 break-words font-medium">{deck.name}</p>}
          {lastPracticed[deck.id] && <p className="mb-2 text-[11px] text-slate-400">Last practiced {new Date(lastPracticed[deck.id]).toLocaleDateString()}</p>}
          <div className="flex flex-wrap gap-2">
            <Button size="sm" className={primaryButton} disabled={busy} onClick={() => {
              const token = generation.current
              void run(async () => {
                const saved = await bounded(loadDeckSnapshot(deck.id))
                if (generation.current !== token) return
                onLoad(saved.text, saved.binding); setOpen(false)
              })
            }}>Load deck</Button>
            <details className="relative"><summary aria-label={`Actions for ${deck.name}`} className="cursor-pointer list-none rounded-lg px-3 py-1 text-lg text-slate-300 hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-emerald-300">⋯</summary>
            <div className="absolute right-0 top-full z-10 flex min-w-40 flex-col rounded-xl border border-slate-700 bg-slate-950 p-2 shadow-xl">
            <Button size="sm" variant="ghost" className="text-xs text-slate-300" disabled={busy || editing === deck.id} onClick={(event) => { event.currentTarget.closest('details')?.removeAttribute('open'); setEditing(deck.id); setEditedName(deck.name); setConfirmDelete(null) }}>Rename</Button>
            {confirmDelete === deck.id ? <><Button size="sm" className={primaryButton} disabled={busy} onClick={() => {
              const token = generation.current
              void run(async () => {
                await bounded(deleteDeck(deck.id))
                if (generation.current !== token) return
                setConfirmDelete(null); setNotice('Deck deleted.'); await refresh()
              })
            }}>Confirm delete</Button><Button variant="ghost" disabled={busy} onClick={() => setConfirmDelete(null)}>Cancel</Button></> : <Button size="sm" variant="ghost" className="text-xs text-slate-400" disabled={busy} onClick={() => setConfirmDelete(deck.id)}>Delete</Button>}
            <Button size="sm" variant="ghost" disabled={busy} onClick={(event)=>{event.currentTarget.closest('details')?.removeAttribute('open');setLogoPicker(deck.id)}}>Change logo</Button>
            {text && <Button size="sm" variant="ghost" disabled={busy} onClick={(event)=>{event.currentTarget.closest('details')?.removeAttribute('open');setRevisionTarget(deck.id)}}>Update list</Button>}
            </div></details>
          </div>
          </div></div>
          {revisionTarget===deck.id && <div className="mt-3 rounded-lg border border-emerald-700 p-3"><p className="mb-2">Replace this deck’s current list with the imported list? Older practice records keep their original revision.</p><Button size="sm" disabled={busy} onClick={()=>{
            const token=generation.current, key=JSON.stringify([deck.id,text])
            if(revisionOperation.current?.key!==key)revisionOperation.current={key,id:crypto.randomUUID()}
            const revisionId=revisionOperation.current.id
            void run(async()=>{await bounded(reviseDeck(deck.id,revisionId,text!));if(generation.current!==token)return;const saved=await loadDeckSnapshot(deck.id);if(generation.current!==token)return;practice.setBinding(saved.binding);setRevisionTarget(null);revisionOperation.current=null;setNotice('New revision saved.');await refresh()})
          }}>Confirm update</Button><Button size="sm" variant="ghost" disabled={busy} onClick={()=>setRevisionTarget(null)}>Cancel update</Button></div>}

          {logoPicker === deck.id && <DeckLogoPicker deckId={deck.id} busy={busy} onClose={() => setLogoPicker(null)} onChoose={card => {
            const token = generation.current
            void run(async () => {
              await bounded(setDeckLogo(deck.id, card.id))
              if (generation.current !== token) return
              setDecks(previous => previous.map(item => item.id === deck.id ? { ...item, coverCardId: card.id } : item))
              if(practice.binding?.id===deck.id)practice.setBinding({...practice.binding,coverCardId:card.id})
              setLogos(previous => ({ ...previous, [card.id]: card })); setLogoPicker(null); setNotice('Deck logo updated.')
            })
          }} />}
        </li>)}</ul>
        {hasMore && <Button disabled={busy} variant="outline" onClick={() => void run(() => refresh(true))}>Load more</Button>}
      </div>}
      </>}
      <details className="mt-5 border-t border-slate-800 pt-3"><summary className="mb-3 cursor-pointer text-xs text-slate-400">Account settings</summary>
        <div className="flex flex-wrap items-center justify-between gap-2"><span className="text-xs text-slate-400">{user?.email || 'Guest practice'}</span>{user && <Button size="sm" variant="ghost" className="text-xs text-slate-400" disabled={busy} onClick={() => void run(async () => { await signOutOfAccount() })}>Sign out</Button>}</div>
        {user && <Button size="sm" variant="ghost" className="mt-2 text-xs text-slate-400" disabled={busy} onClick={()=>setDeleteConfirmation(true)}>Delete account</Button>}
        {deleteConfirmation && user && <div className="mt-3 rounded-lg border border-rose-500/40 p-3"><p>Delete your account, all saved decks and account history? You’ll confirm your Google identity first. This cannot be undone; guest history remains on this device.</p><Button disabled={busy} onClick={()=>void run(async()=>{await deleteAccount(user.uid);practice.setBinding(null);setDeleteConfirmation(false);setNotice('Account deleted.')})}>Confirm account deletion</Button><Button variant="ghost" disabled={busy} onClick={()=>setDeleteConfirmation(false)}>Cancel deletion</Button></div>}
        {process.env.NEXT_PUBLIC_FIREBASE_USE_EMULATORS === 'true' && <p className="mt-1 text-[11px] text-slate-500">Local demo</p>}
      </details>
      {busy && <p className="mt-3 text-sm text-slate-300" role="status">Working…</p>}

      {error && <p className="mt-3 text-sm text-rose-300" role="alert">{error}</p>}
    </Modal>
  </>
}
