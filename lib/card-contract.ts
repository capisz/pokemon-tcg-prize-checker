import { z } from 'zod'

export const CARD_ID_PATTERN = /^[a-z0-9.]{2,15}-[a-z]{0,4}\d{1,4}(?:_[a-z0-9]{1,3}|[a-z])?$/i
export const cardRequestSchema = z.object({ ids: z.array(z.string().regex(CARD_ID_PATTERN)).max(256) })
export const importedCardSchema = z.object({
  id: z.string(), name: z.string(), image: z.string().optional(),
  set: z.string(), number: z.union([z.string(), z.number()]),
})
export const cardResponseSchema = z.object({
  cards: z.array(importedCardSchema), missingIds: z.array(z.string()).default([]),
})
export type ImportedCard = z.infer<typeof importedCardSchema>
