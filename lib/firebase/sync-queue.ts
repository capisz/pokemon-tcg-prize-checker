"use client"
import {currentAccount} from './client'
import {readSyncControl,syncPractice} from './history'
import {practiceSchema,type PracticeRecord} from '../practice-history'

type Entry={key:string;uid:string;record:PracticeRecord}
type Meta={key:string;epoch:number;paused:boolean}
let database:Promise<IDBDatabase>|undefined
function db(){return database??=new Promise<IDBDatabase>((resolve,reject)=>{const request=indexedDB.open('prizecheck-sync',1);request.onupgradeneeded=()=>request.result.createObjectStore('queue',{keyPath:'key'});request.onsuccess=()=>resolve(request.result);request.onerror=()=>{database=undefined;reject(request.error)}})}
async function transaction<T>(work:(store:IDBObjectStore,done:(value:T)=>void)=>void){const database=await db();return new Promise<T>((resolve,reject)=>{const tx=database.transaction('queue','readwrite');let value:T;tx.oncomplete=()=>resolve(value);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||Error('Storage interrupted'));work(tx.objectStore('queue'),result=>{value=result})})}
const metaKey=(uid:string)=>`meta:${uid}`
async function meta(uid:string){return transaction<Meta|undefined>((s,done)=>{const r=s.get(metaKey(uid));r.onsuccess=()=>done(r.result)})}
async function entries(uid:string){return transaction<Entry[]>((s,done)=>{const r=s.getAll();r.onsuccess=()=>done(r.result.filter((row:Entry)=>row.uid===uid))})}
export type SyncStatus='saved'|'syncing'|'retry'
const states=new Map<string,SyncStatus>()
export function syncStatus(uid:string){return states.get(uid)||'saved'}
function status(uid:string,value:SyncStatus){states.set(uid,value);window.dispatchEvent(new Event('prizecheck-sync'))}
let activeUid:string|null=null,timer:ReturnType<typeof setTimeout>|undefined,attempt=0
const generations=new Map<string,number>()
const generation=(uid:string)=>generations.get(uid)||0
const running=new Map<string,Promise<void>>()
export async function enqueuePractice(uid:string,record:PracticeRecord){
 if(currentAccount()?.uid!==uid)throw Error('Account changed')
 const token=generation(uid)
 if(!(await meta(uid))){const control=await readSyncControl(uid);if(control.clearing||control.deleting||token!==generation(uid))throw Error('History unavailable');await resumeQueue(uid,control.epoch,token)}
 if(token!==generation(uid)||currentAccount()?.uid!==uid)throw Error('Account changed')
 const parsed=practiceSchema.parse(record)
 await transaction<void>((s,done)=>{const r=s.get(metaKey(uid));r.onsuccess=()=>{const control=r.result as Meta|undefined;if(control?.paused || (record.syncEpoch!==undefined && record.syncEpoch!==(control?.epoch||0))){s.transaction.abort();return}record.syncEpoch=control?.epoch||0;const key=`round:${uid}:${record.id}`;const existing=s.get(key);existing.onsuccess=()=>{if(!existing.result)s.put({key,uid,record:{...parsed,syncEpoch:control?.epoch||0}});done()}}})
 status(uid,'syncing');void flushQueue(uid)
}
export async function cancelPending(uid:string){
 generations.set(uid,generation(uid)+1)
 await transaction<void>((s,done)=>{const r=s.getAll();r.onsuccess=()=>{for(const row of r.result)if(row.uid===uid)s.delete(row.key);const old=r.result.find(row=>row.key===metaKey(uid));s.put({key:metaKey(uid),epoch:old?.epoch||0,paused:true});done()}})
 status(uid,'saved')
}
export async function resumeQueue(uid:string,epoch:number,token?:number){await transaction<void>((s,done)=>{if(token===undefined||token===generation(uid))s.put({key:metaKey(uid),epoch,paused:false});done()})}
export function flushQueue(uid:string):Promise<void>{
 if(running.has(uid))return running.get(uid)!
 const task=(async()=>{
  if(currentAccount()?.uid!==uid || activeUid!==uid)return
  const token=generation(uid)
  try {
   if((await meta(uid))?.paused)return
   const rows=await entries(uid)
   status(uid,rows.length?'syncing':'saved')
   const control=await readSyncControl(uid)
   if(control.clearing || control.deleting){await cancelPending(uid);return}
   if(token!==generation(uid)||currentAccount()?.uid!==uid)return
   await resumeQueue(uid,control.epoch,token)
   for(const row of rows){
    if(currentAccount()?.uid!==uid || activeUid!==uid || token!==generation(uid) || (await meta(uid))?.paused)return
    // A history clear on another device invalidates older queued rounds.
    if((row.record.syncEpoch||0)===control.epoch)await syncPractice(uid,row.record)
    await transaction<void>((s,done)=>{s.delete(row.key);done()})
   }
   attempt=0;status(uid,(await entries(uid)).length?'syncing':'saved')
   if((await entries(uid)).length && activeUid===uid){clearTimeout(timer);timer=setTimeout(()=>void flushQueue(uid),0)}
  }catch{status(uid,'retry');if(activeUid===uid){clearTimeout(timer);timer=setTimeout(()=>void flushQueue(uid),Math.min(60000,1000*2**Math.min(attempt++,6)))}}
 })().finally(()=>running.delete(uid))
 running.set(uid,task);return task
}
export function activateSync(uid:string|null){if(activeUid&&activeUid!==uid)generations.set(activeUid,generation(activeUid)+1);activeUid=uid;attempt=0;clearTimeout(timer);if(uid)void flushQueue(uid)}
if(typeof window!=='undefined')window.addEventListener('online',()=>{if(activeUid)void flushQueue(activeUid)})
