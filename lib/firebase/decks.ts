"use client"

import { collection, doc, getDocFromServer, getDocsFromServer, limit, orderBy, query, runTransaction, serverTimestamp, startAfter, deleteField, writeBatch, type QueryDocumentSnapshot } from 'firebase/firestore'
import { z } from 'zod'
import { getFirebaseServices } from './client'
import { getDeckImportSecurityError, MAX_DECK_TEXT_LENGTH } from '../deck-import-security'
import { getDeckValidationError, parseIdsFromText } from '../deck-parser'

export const deckInputSchema = z.object({ name: z.string().trim().min(1).max(80), text: z.string().min(1).max(MAX_DECK_TEXT_LENGTH), coverCardId: z.string().regex(/^[a-z0-9.]+-[a-z0-9_]+$/).max(100).optional() })
export type SavedDeck = { id: string; name: string; coverCardId?: string; activeVersion: string }
export type DeckCursor = QueryDocumentSnapshot
export function ownerCollection() {
  const { auth, db } = getFirebaseServices()
  if (!auth.currentUser) throw new Error('Sign in to access your decks.')
  return collection(db, 'users', auth.currentUser.uid, 'decks')
}
export function newDeckId() { return doc(ownerCollection()).id }

/** Stable operation ID makes a retry after a lost response safe. Each saved snapshot is immutable. */
export async function saveDeck(id: string, input: { name: string; text: string; coverCardId?: string }) {
  const value = deckInputSchema.parse(input)
  const parsed = parseIdsFromText(value.text)
  const error = getDeckImportSecurityError(value.text) || getDeckValidationError(parsed)
  if (error) throw new Error(error)
  if (value.coverCardId && !parsed.uniqueIds.includes(value.coverCardId)) throw new Error('Choose a card in this deck.')
  const parent = doc(ownerCollection(), id)
  const version = doc(parent, 'versions', '1')
  await runTransaction(parent.firestore, async transaction => {
    const existing = await transaction.get(parent)
    if (existing.exists()) return
    transaction.set(parent, { name: value.name, ...(value.coverCardId ? { coverCardId: value.coverCardId } : {}), activeVersion: '1', schemaVersion: 1, createdAt: serverTimestamp() })
    transaction.set(version, { text: value.text, cardCount: 60, schemaVersion: 1, createdAt: serverTimestamp() })
  })
}
export async function listDecks(cursor?: DeckCursor) {
  const base = ownerCollection()
  const page = await getDocsFromServer(query(base, orderBy('createdAt', 'desc'), ...(cursor ? [startAfter(cursor)] : []), limit(20)))
  return { decks: page.docs.map(item => ({ id: item.id, name: z.string().parse(item.data().name), coverCardId: z.string().optional().parse(item.data().coverCardId), activeVersion: z.string().parse(item.data().activeVersion) })), cursor: page.docs.at(-1), hasMore: page.size === 20 }
}
export async function loadDeckSnapshot(id: string, versionId?: string) {
  const parent = doc(ownerCollection(), id)
  const uid = parent.path.split('/')[1]
  const metadata = await getDocFromServer(parent)
  if (!metadata.exists()) throw new Error('This deck was deleted.')
  const version = versionId || z.string().parse(metadata.data().activeVersion)
  const snapshot = await getDocFromServer(doc(parent, 'versions', version))
  if (!snapshot.exists()) throw new Error('This revision is no longer available.')
  if(getFirebaseServices().auth.currentUser?.uid !== uid) throw new Error('Account changed.')
  return { text: z.string().min(1).max(MAX_DECK_TEXT_LENGTH).parse(snapshot.data().text), binding: {
    uid, id, version,
    name: z.string().parse(metadata.data().name), coverCardId: z.string().optional().parse(metadata.data().coverCardId),
  } }
}
export async function loadDeck(id: string) { return (await loadDeckSnapshot(id)).text }
export async function deleteDeck(id: string) {
  const parent = doc(ownerCollection(), id)
  while (true) {
    const page = await getDocsFromServer(query(collection(parent, 'versions'), limit(50)))
    if (page.empty) break
    const batch = writeBatch(parent.firestore)
    page.docs.forEach(item => batch.delete(item.ref))
    await batch.commit()
  }
  const batch = writeBatch(parent.firestore); batch.delete(parent); await batch.commit()
}
export async function reviseDeck(id: string, revisionId: string, text: string) {
  const error = getDeckImportSecurityError(text) || getDeckValidationError(parseIdsFromText(text))
  if (error) throw new Error(error)
  const parent = doc(ownerCollection(), id), version = doc(parent, 'versions', revisionId)
  await runTransaction(parent.firestore, async transaction => {
    const existing = await transaction.get(version)
    if(existing.exists()) return
    const metadata = await transaction.get(parent)
    if(!metadata.exists()) throw new Error('This deck was deleted.')
    transaction.set(version, {text, cardCount:60, schemaVersion:1, createdAt:serverTimestamp()})
    const ids = parseIdsFromText(text).uniqueIds
    transaction.update(parent, {activeVersion:revisionId, ...(metadata.data().coverCardId && !ids.includes(metadata.data().coverCardId) ? {coverCardId:deleteField()} : {})})
  })
}

export async function renameDeck(id: string, name: string) {
  const validName = deckInputSchema.shape.name.parse(name)
  const ref=doc(ownerCollection(),id), uid=getFirebaseServices().auth.currentUser!.uid
  await runTransaction(ref.firestore,async tx=>{const snapshot=await tx.get(ref);if(getFirebaseServices().auth.currentUser?.uid!==uid)throw Error('Account changed');if(!snapshot.exists())throw Error('Deck was deleted');tx.update(ref,{name:validName})})
}

export async function setDeckLogo(id: string, cardId: string) {
  const valid = deckInputSchema.shape.coverCardId.unwrap().parse(cardId)
  const parent = doc(ownerCollection(), id)
  const uid = parent.path.split('/')[1]
  await runTransaction(parent.firestore, async transaction => {
    const metadata = await transaction.get(parent)
    if (!metadata.exists()) throw new Error('This deck was deleted.')
    const version = z.string().parse(metadata.data().activeVersion)
    const snapshot = await transaction.get(doc(parent, 'versions', version))
    if (getFirebaseServices().auth.currentUser?.uid !== uid) throw new Error('Account changed.')
    if (!snapshot.exists()) throw new Error('This revision is no longer available.')
    const source = z.string().max(MAX_DECK_TEXT_LENGTH).parse(snapshot.data().text)
    if (!parseIdsFromText(source).uniqueIds.includes(valid)) throw new Error('Choose a card in this deck.')
    transaction.update(parent, { coverCardId: valid })
  })
}
