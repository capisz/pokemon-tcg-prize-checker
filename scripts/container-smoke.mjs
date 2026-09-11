import assert from 'node:assert/strict'

const base = process.argv[2] || 'http://127.0.0.1:3000'
assert(['127.0.0.1', 'localhost'].includes(new URL(base).hostname), 'Local targets only')
const health = await fetch(`${base}/api/health`)
assert.equal(health.status, 200)
assert.deepEqual(await health.json(), { status: 'ok' })
const page = await fetch(base)
assert.equal(page.status, 200)
const html = await page.text()
assert.match(html, /PrizeCheck/i)
const asset = html.match(/src="([^"\s]+\/_next\/static\/[^"\s]+\.js)"/) || html.match(/src="(\/_next\/static\/[^"\s]+\.js)"/)
assert(asset, 'Page must reference a bundled JS asset')
assert.equal((await fetch(new URL(asset[1], base))).status, 200)
const cards = await fetch(`${base}/api/cards`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ ids: ['brs-1', 'brs-tg12'] }),
})
assert.equal(cards.status, 200)
const data = await cards.json()
assert.deepEqual(data.missingIds, [])
assert.equal(data.cards[1].name, 'Oranguru')
console.log('PASS: health, page, bundled JS, and packaged card dataset')
