import { beforeAll, afterAll, beforeEach, describe, it, expect } from 'vitest'
import { initializeTestEnvironment, assertFails, assertSucceeds, type RulesTestEnvironment } from '@firebase/rules-unit-testing'
import { doc, getDoc, getDocs, collection, serverTimestamp, setDoc, updateDoc, deleteDoc, writeBatch } from 'firebase/firestore'
import { readFileSync } from 'node:fs'
let env: RulesTestEnvironment
beforeAll(async () => { env = await initializeTestEnvironment({ projectId: 'demo-prizecheck', firestore: { host: '127.0.0.1', port: 8080, rules: readFileSync('firestore.rules', 'utf8') } }) })
beforeEach(async () => { await env.clearFirestore() })
afterAll(async () => { await env.cleanup() })
function db(uid?: string) { return uid ? env.authenticatedContext(uid).firestore() : env.unauthenticatedContext().firestore() }
function create(client: ReturnType<typeof db>, uid = 'alice', metadata = {}, version = {}) {
  const batch = writeBatch(client)
  batch.set(doc(client, `users/${uid}/decks/test`), { name: 'Test deck', activeVersion: '1', schemaVersion: 1, createdAt: serverTimestamp(), ...metadata })
  batch.set(doc(client, `users/${uid}/decks/test/versions/1`), { text: '60 Basic Fire Energy SVE 2', cardCount: 60, schemaVersion: 1, createdAt: serverTimestamp(), ...version })
  return batch.commit()
}
describe('private deck snapshots', () => {
  it('allows an owner to create, list, and read their snapshot', async () => {
    const client = db('alice')
    await assertSucceeds(create(client))
    await assertSucceeds(getDocs(collection(client, 'users/alice/decks')))
    await assertSucceeds(getDoc(doc(client, 'users/alice/decks/test/versions/1')))
  })
  it('denies guest writes and reads', async () => {
    await assertFails(create(db()))
    await assertSucceeds(create(db('alice')))
    await assertFails(getDoc(doc(db(), 'users/alice/decks/test')))
  })
  it('denies other accounts all access', async () => {
    await assertSucceeds(create(db('alice')))
    const client = db('bob')
    await assertFails(getDocs(collection(client, 'users/alice/decks')))
    await assertFails(getDoc(doc(client, 'users/alice/decks/test/versions/1')))
    await assertFails(create(client, 'charlie'))
    await assertFails(updateDoc(doc(client, 'users/alice/decks/test'), { name: 'Stolen' }))
    await assertFails(deleteDoc(doc(client, 'users/alice/decks/test')))
  })
  it('allows only the owner to rename without altering snapshot metadata', async () => {
    const client = db('alice')
    await assertSucceeds(create(client))
    const ref = doc(client, 'users/alice/decks/test')
    await assertSucceeds(updateDoc(ref, { name: 'Renamed deck' }))
    await assertFails(updateDoc(ref, { name: '' }))
    await assertFails(updateDoc(ref, { name: 'a'.repeat(81) }))
    await assertFails(updateDoc(ref, { activeVersion: '2' }))
    await assertFails(updateDoc(ref, { createdAt: serverTimestamp() }))
    await assertFails(updateDoc(ref, { admin: true }))
    await assertFails(updateDoc(doc(db('bob'), 'users/alice/decks/test'), { name: 'Stolen' }))
  })
  it('allows safe cover IDs and rejects arbitrary image URLs or another owner', async () => {
    const client = db('alice')
    await assertSucceeds(create(client, 'alice', { coverCardId: 'sve-2' }))
    await assertSucceeds(updateDoc(doc(client, 'users/alice/decks/test'), { coverCardId: 'meg-104' }))
    await assertFails(updateDoc(doc(client, 'users/alice/decks/test'), { coverCardId: 'https://example.com/image.png' }))
    await assertFails(updateDoc(doc(client, 'users/alice/decks/test'), { coverCardId: 42 }))
    await assertFails(updateDoc(doc(db('bob'), 'users/alice/decks/test'), { coverCardId: 'sve-2' }))
  })
  it('requires both documents in the atomic create', async () => {
    const client = db('alice')
    await assertFails(setDoc(doc(client, 'users/alice/decks/test'), { name: 'Orphan', activeVersion: '1', schemaVersion: 1, createdAt: serverTimestamp() }))
    await assertFails(setDoc(doc(client, 'users/alice/decks/test/versions/1'), { text: 'text', cardCount: 60, schemaVersion: 1, createdAt: serverTimestamp() }))
  })
  it('rejects extra fields, invalid names, and oversized content', async () => {
    await assertFails(create(db('alice'), 'alice', { admin: true }))
    await assertFails(create(db('alice'), 'alice', { name: '' }))
    await assertFails(create(db('alice'), 'alice', { name: 'a'.repeat(81) }))
    await assertFails(create(db('alice'), 'alice', {}, { text: 'a'.repeat(12001) }))
    await assertFails(create(db('alice'), 'alice', {}, { cardCount: 59 }))
    await assertFails(create(db('alice'), 'alice', { createdAt: 'yesterday' }))
  })
  it('keeps versions immutable and denies arbitrary extra versions', async () => {
    const client = db('alice')
    await assertSucceeds(create(client))
    await assertFails(updateDoc(doc(client, 'users/alice/decks/test/versions/1'), { text: 'Changed' }))
    await assertFails(setDoc(doc(client, 'users/alice/decks/test/versions/2'), { text: 'text', cardCount: 60, schemaVersion: 1, createdAt: serverTimestamp() }))
  })
  it('allows owner to remove revisions and parent for paginated account deletion', async () => {
    const client = db('alice')
    await assertSucceeds(create(client))
    await assertSucceeds(deleteDoc(doc(client, 'users/alice/decks/test/versions/1')))
    const batch = writeBatch(client)
    batch.delete(doc(client, 'users/alice/decks/test'))
    batch.delete(doc(client, 'users/alice/decks/test/versions/1'))
    await assertSucceeds(batch.commit())
  })
  it('denies writes to future scores, profiles, and public collections', async () => {
    for (const path of ['users/alice', 'users/alice/sessions/test', 'leaderboards/test']) {
      await assertFails(setDoc(doc(db('alice'), path), { score: 1000 }))
    }
  })
  it('creates a new revision atomically and preserves historical content', async () => {
    const client=db('alice')
    await assertSucceeds(create(client))
    const batch=writeBatch(client)
    batch.set(doc(client,'users/alice/decks/test/versions/revision-2'),{text:'60 Basic Water Energy SVE 3',cardCount:60,schemaVersion:1,createdAt:serverTimestamp()})
    batch.update(doc(client,'users/alice/decks/test'),{activeVersion:'revision-2'})
    await assertSucceeds(batch.commit())
    expect((await getDoc(doc(client,'users/alice/decks/test/versions/1'))).data()?.text).toBe('60 Basic Fire Energy SVE 2')
    await assertFails(updateDoc(doc(client,'users/alice/decks/test/versions/1'),{text:'replacement'}))
  })
  it('isolates immutable history and validates references and fields', async () => {
    const client=db('alice')
    await create(client)
    const record={id:'round',deckKey:'cards',deckName:'My deck',at:Date.now()-1000,scoringVersion:2,duration:120,correct:3,seconds:50,missed:[{id:'sve-2',name:'Energy',count:3}],deckId:'test',version:'1'}
    await assertSucceeds(setDoc(doc(client,'users/alice/sessions/round'),record))
    await assertSucceeds(getDocs(collection(client,'users/alice/sessions')))
    await assertFails(getDocs(collection(db('bob'),'users/alice/sessions')))
    await assertFails(getDoc(doc(db(),'users/alice/sessions/round')))
    await assertFails(updateDoc(doc(client,'users/alice/sessions/round'),{correct:6}))
    for(const patch of [{duration:999},{correct:7},{missed:[{id:'x',name:'x',count:999}]},{deckId:'absent'},{version:'absent'},{extra:true}]) {
      await assertFails(setDoc(doc(client,'users/alice/sessions/invalid'),{...record,id:'invalid',...patch}))
    }
    await assertFails(deleteDoc(doc(db('bob'),'users/alice/sessions/round')))
    await assertSucceeds(deleteDoc(doc(client,'users/alice/sessions/round')))
  })

  it('blocks late writes after account deletion starts while allowing cleanup', async () => {
    const client=db('alice')
    await create(client)
    await assertSucceeds(setDoc(doc(client,'users/alice/account/deletion'),{deleting:true}))
    await assertFails(updateDoc(doc(client,'users/alice/decks/test'),{name:'Late rename'}))
    await assertFails(create(client,'alice-new'))
    await assertFails(setDoc(doc(client,'users/alice/sessions/late'),{id:'late',deckKey:'x',deckName:'x',at:Date.now()-1000,scoringVersion:2,duration:120,correct:0,seconds:120,missed:[]}))
    await assertSucceeds(deleteDoc(doc(client,'users/alice/decks/test/versions/1')))
    await assertSucceeds(deleteDoc(doc(client,'users/alice/decks/test')))
    await assertFails(deleteDoc(doc(client,'users/alice/account/deletion')))
  })

})

it('validates prize counts, private names, and history clear epochs',async()=>{
 const client=db('alice'),ref=doc(client,'users/alice/account/history')
 await create(client)
 const record={id:'new',deckKey:'deck',deckName:'Deck',at:1,scoringVersion:2,duration:120,correct:0,seconds:10,missed:[],prizeGroups:[{name:'Energy',deckCount:60,prizeCount:6,missedCount:6}]}
 await assertSucceeds(setDoc(doc(client,'users/alice/sessions/new'),record))
 await assertSucceeds(setDoc(doc(client,'users/alice/sessions/six'),{...record,id:'six',deckId:'test',version:'1',source:'source',coverCardId:'sve-2',customName:true,prizeGroups:Array.from({length:6},(_,i)=>({name:String(i),deckCount:4,prizeCount:1,missedCount:1})),missed:[]}))
 await assertFails(setDoc(doc(client,'users/alice/sessions/bad'),{...record,id:'bad',prizeGroups:[{name:'Energy',deckCount:1,prizeCount:6,missedCount:6}]}))
 await assertSucceeds(setDoc(doc(client,'users/alice/historyNames/key'),{deckKey:'deck',name:'Private'}))
 await assertFails(getDoc(doc(db('bob'),'users/alice/historyNames/key')))
 await assertFails(setDoc(doc(db('bob'),'users/alice/historyNames/key'),{deckKey:'deck',name:'Wrong'}))
 await assertSucceeds(setDoc(ref,{epoch:1,clearing:true}))
 await assertFails(setDoc(doc(client,'users/alice/sessions/late'),{...record,id:'late',syncEpoch:1}))
 await assertSucceeds(updateDoc(ref,{clearing:false}))
 await assertFails(setDoc(doc(client,'users/alice/sessions/late'),{...record,id:'late'}))
 await assertSucceeds(setDoc(doc(client,'users/alice/sessions/fresh'),{...record,id:'fresh',syncEpoch:1}))
 await assertFails(updateDoc(ref,{epoch:0}))
 await assertFails(deleteDoc(ref))
})
