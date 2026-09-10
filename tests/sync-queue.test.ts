import {beforeEach,afterEach,it,expect,vi} from 'vitest'
import {IDBFactory} from 'fake-indexeddb'
const mocks=vi.hoisted(()=>({uid:'alice' as string|null,control:{epoch:0,clearing:false,deleting:false},upload:vi.fn(),read:vi.fn()}))
vi.mock('../lib/firebase/client',()=>({currentAccount:()=>mocks.uid?{uid:mocks.uid}:null}))
vi.mock('../lib/firebase/history',()=>({readSyncControl:()=>mocks.read(),syncPractice:(...args:unknown[])=>mocks.upload(...args)}))
const record={id:'one',deckKey:'deck',deckName:'Deck',at:1,scoringVersion:2 as const,duration:120 as const,correct:3,seconds:50,missed:[]}
let queue:typeof import('../lib/firebase/sync-queue')
beforeEach(async()=>{vi.resetModules();vi.stubGlobal('indexedDB',new IDBFactory());vi.stubGlobal('window',new EventTarget());mocks.uid='alice';mocks.control={epoch:0,clearing:false,deleting:false};mocks.read.mockReset().mockImplementation(async()=>mocks.control);mocks.upload.mockReset().mockResolvedValue(undefined);queue=await import('../lib/firebase/sync-queue')})
afterEach(()=>{queue.activateSync(null);vi.unstubAllGlobals()})
it('keeps pending records across module reload and stable IDs on duplicate retries',async()=>{
 await queue.resumeQueue('alice',0)
 await queue.enqueuePractice('alice',record)
 await queue.enqueuePractice('alice',record)
 vi.resetModules();queue=await import('../lib/firebase/sync-queue')
 queue.activateSync('alice');await queue.flushQueue('alice')
 expect(mocks.upload).toHaveBeenCalledTimes(1)
 expect(mocks.upload.mock.calls[0][1].id).toBe('one')
 expect(queue.syncStatus('alice')).toBe('saved')
})
it('retries failures and isolates account switches',async()=>{
 await queue.resumeQueue('alice',0);await queue.enqueuePractice('alice',record)
 mocks.upload.mockRejectedValueOnce(Error('offline'))
 queue.activateSync('alice');await queue.flushQueue('alice');expect(queue.syncStatus('alice')).toBe('retry')
 mocks.uid='bob';queue.activateSync('bob');await queue.flushQueue('bob');expect(mocks.upload).toHaveBeenCalledTimes(1)
 mocks.uid='alice';queue.activateSync('alice');await queue.flushQueue('alice');expect(mocks.upload).toHaveBeenCalledTimes(2)
})
it('cancel removes pending rounds, rejects new writes until resumed, and drops old epochs',async()=>{
 await queue.resumeQueue('alice',0);await queue.enqueuePractice('alice',record);await queue.cancelPending('alice')
 await expect(queue.enqueuePractice('alice',record)).rejects.toThrow()
 await queue.resumeQueue('alice',1);await expect(queue.enqueuePractice('alice',record)).rejects.toThrow();queue.activateSync('alice');mocks.control.epoch=1;await queue.flushQueue('alice');expect(mocks.upload).not.toHaveBeenCalled()
 await queue.enqueuePractice('alice',{...record,id:'new',syncEpoch:undefined});await queue.flushQueue('alice');expect(mocks.upload.mock.calls[0][1].syncEpoch).toBe(1)
})
it('a clear racing a server read cannot resume uploads',async()=>{
 await queue.resumeQueue('alice',0);await queue.enqueuePractice('alice',record)
 let finish!:(value:typeof mocks.control)=>void
 mocks.read.mockImplementation(()=>new Promise(resolve=>{finish=resolve}))
 queue.activateSync('alice');await vi.waitFor(()=>expect(finish).toBeTypeOf('function'))
 await queue.cancelPending('alice');finish(mocks.control);await queue.flushQueue('alice');expect(mocks.upload).not.toHaveBeenCalled()
})
it('does not cap pending history at 100 and drops a remote-cleared epoch',async()=>{
 await queue.resumeQueue('alice',0)
 for(let i=0;i<105;i++)await queue.enqueuePractice('alice',{...record,id:String(i)})
 queue.activateSync('alice');await queue.flushQueue('alice');expect(mocks.upload).toHaveBeenCalledTimes(105)
 queue.activateSync(null);await queue.enqueuePractice('alice',{...record,id:'stale'});mocks.control.epoch=1
 queue.activateSync('alice');await queue.flushQueue('alice');expect(mocks.upload).toHaveBeenCalledTimes(105)
})
it('deletion control cancels pending uploads',async()=>{
 await queue.resumeQueue('alice',0);await queue.enqueuePractice('alice',record);mocks.control.deleting=true
 queue.activateSync('alice');await queue.flushQueue('alice');expect(mocks.upload).not.toHaveBeenCalled()
 await expect(queue.enqueuePractice('alice',record)).rejects.toThrow()
})
