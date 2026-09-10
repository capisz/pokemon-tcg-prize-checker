import { expect, it } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '../app/api/cards/route'
function request(body: string) {
  return new NextRequest('http://localhost/api/cards',{method:'POST',body,headers:{'Content-Type':'application/json'}})
}
it('resolves both the main set and gallery with their shared code', async () => {
  const response = await POST(request(JSON.stringify({ids:['brs-1','brs-tg12']})))
  const data = await response.json()
  expect(response.status).toBe(200)
  expect(data.missingIds).toEqual([])
  expect(data.cards[1].name).toBe('Oranguru')
})
it('reports missing IDs without treating placeholders as real cards', async () => {
  const response = await POST(request(JSON.stringify({ids:['zzz-999']})))
  expect((await response.json()).missingIds).toEqual(['zzz-999'])
})
it('rejects malformed JSON, invalid IDs, and oversized payloads', async () => {
  expect((await POST(request('{'))).status).toBe(400)
  expect((await POST(request('{"ids":["<script>"]}'))).status).toBe(400)
  expect((await POST(request(' '.repeat(20001)))).status).toBe(413)
})

it('resolves every featured deck card after rebuilding the index', async () => {
  const { FEATURED_DECKS } = await import('../lib/featured-decks')
  const { parseIdsFromText } = await import('../lib/deck-parser')
  const ids = [...new Set(FEATURED_DECKS.flatMap(deck=>parseIdsFromText(deck.importText).uniqueIds))]
  const response = await POST(request(JSON.stringify({ids})))
  expect(response.status).toBe(200)
  expect((await response.json()).missingIds).toEqual([])
})
