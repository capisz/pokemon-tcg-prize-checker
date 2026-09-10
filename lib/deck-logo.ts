import { cardResponseSchema } from './card-contract'
export async function fetchLogoCards(ids: string[]) {
  if (!ids.length) return []
  const response = await fetch('/api/cards', { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ ids: [...new Set(ids)] }), signal: AbortSignal.timeout(10000) })
  if (!response.ok) throw new Error('Could not load cards.')
  return cardResponseSchema.parse(await response.json()).cards
}
