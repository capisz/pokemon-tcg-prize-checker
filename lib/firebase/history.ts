"use client"
import { collection, doc, getDocFromServer, getDocsFromServer, limit, orderBy, query, runTransaction, startAfter, writeBatch, type QueryDocumentSnapshot } from 'firebase/firestore'
import { currentAccount, getFirebaseServices } from './client'
import { practiceSchema, type PracticeRecord } from '../practice-history'
export function requireOwner(uid: string) {
  const services = getFirebaseServices()
  if (currentAccount()?.uid !== uid) throw new Error('Account changed. Sign in again to continue.')
  return services
}
export async function syncPractice(uid: string, record: PracticeRecord) {
  const {db} = requireOwner(uid)
  const value = JSON.parse(JSON.stringify(practiceSchema.parse(record)))
  if(value.prizeGroups)value.missed=[] // Named groups retain missed counts without duplicate cloud data.
  const ref = doc(db,'users',uid,'sessions',record.id)
  await runTransaction(db,async transaction => {
    const control=await transaction.get(doc(db,'users',uid,'account','history'))
    requireOwner(uid)
    if(control.data()?.clearing || (control.data()?.epoch||0)!==(record.syncEpoch||0))throw Error('History was cleared. This older round will not be uploaded.')
    const existing = await transaction.get(ref)
    if(!existing.exists()) transaction.set(ref,value)
  })
}
export async function fetchPractice(uid: string, cursor?: QueryDocumentSnapshot) {
  const {db} = requireOwner(uid)
  const snapshot = await getDocsFromServer(query(collection(db,'users',uid,'sessions'),orderBy('at','desc'),...(cursor?[startAfter(cursor)]:[]),limit(25)))
  requireOwner(uid)
  return { records: snapshot.docs.flatMap(item => { const parsed = practiceSchema.safeParse(item.data()); return parsed.success ? [parsed.data] : [] }), cursor: snapshot.docs.at(-1), more: snapshot.size===25 }
}
export async function readSyncControl(uid:string){
 const {db}=requireOwner(uid)
 const [history,deletion]=await Promise.all([getDocFromServer(doc(db,'users',uid,'account','history')),getDocFromServer(doc(db,'users',uid,'account','deletion'))])
 requireOwner(uid)
 return {epoch:Number(history.data()?.epoch||0),clearing:Boolean(history.data()?.clearing),deleting:deletion.exists()}
}
export async function clearCloudPractice(uid:string) {
 const {db}=requireOwner(uid)
 const {cancelPending,resumeQueue}=await import('./sync-queue')
 await cancelPending(uid)
 const control=doc(db,'users',uid,'account','history')
 const epoch=await runTransaction(db,async tx=>{const old=await tx.get(control);requireOwner(uid);const epoch=old.data()?.clearing?old.data()!.epoch:(old.data()?.epoch||0)+1;tx.set(control,{epoch,clearing:true});return epoch as number})
 while(true){requireOwner(uid);const page=await getDocsFromServer(query(collection(db,'users',uid,'sessions'),limit(50)));if(page.empty)break;const batch=writeBatch(db);page.docs.forEach(item=>batch.delete(item.ref));await batch.commit()}
 const labels=collection(db,'users',uid,'historyNames')
 while(true){requireOwner(uid);const page=await getDocsFromServer(query(labels,limit(50)));if(page.empty)break;const batch=writeBatch(db);page.docs.forEach(item=>batch.delete(item.ref));await batch.commit()}
 await runTransaction(db,async tx=>{const state=await tx.get(control);requireOwner(uid);if(state.data()?.epoch===epoch)tx.update(control,{clearing:false})})
 await resumeQueue(uid,epoch)
}
