"use client"
import { deleteUser, GoogleAuthProvider, reauthenticateWithPopup } from 'firebase/auth'
import { getDocsFromServer, query, limit, doc, runTransaction } from 'firebase/firestore'
import { requireOwner, clearCloudPractice } from './history'
import { deleteDeck, ownerCollection } from './decks'
import { clearHistory } from '../practice-history'
export async function deleteAccount(uid: string) {
  const {auth,db}=requireOwner(uid)
  const user=auth.currentUser!
  await reauthenticateWithPopup(user,new GoogleAuthProvider())
  requireOwner(uid)
  // Retain a minimal marker to reject writes already in flight in other tabs.
  const marker=doc(db,'users',uid,'account','deletion')
  await runTransaction(db,async transaction=>{const existing=await transaction.get(marker);if(!existing.exists())transaction.set(marker,{deleting:true})})
  await clearCloudPractice(uid)
  while(true) {
    requireOwner(uid)
    const page=await getDocsFromServer(query(ownerCollection(),limit(20)))
    if(page.empty) break
    for(const deck of page.docs) { requireOwner(uid); await deleteDeck(deck.id) }
  }
  requireOwner(uid)
  await deleteUser(user)
  try { clearHistory(uid) } catch { /* Auth and cloud deletion succeeded; browser storage may be disabled. */ }
}
