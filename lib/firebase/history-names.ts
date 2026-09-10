"use client"
import {doc,getDocFromServer,runTransaction} from 'firebase/firestore'
import {requireOwner} from './history'
import {z} from 'zod'
async function reference(uid:string,key:string){const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(key));return doc(requireOwner(uid).db,'users',uid,'historyNames',[...new Uint8Array(hash)].map(byte=>byte.toString(16).padStart(2,'0')).join(''))}
export async function historyName(uid:string,key:string){const snapshot=await getDocFromServer(await reference(uid,key));requireOwner(uid);return snapshot.exists()?String(snapshot.data().name):undefined}
export async function saveHistoryName(uid:string,key:string,name:string){const value=z.string().trim().min(1).max(80).parse(name);const ref=await reference(uid,key);await runTransaction(ref.firestore,async tx=>{await tx.get(ref);requireOwner(uid);tx.set(ref,{deckKey:key,name:value})})}
