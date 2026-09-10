import { z } from 'zod'

const configSchema = z.object({
  apiKey: z.string().trim().min(1),
  authDomain: z.string().trim().min(1),
  projectId: z.string().trim().min(1),
  appId: z.string().trim().min(1),
})

export function parseFirebaseConfig(input: unknown) {
  const result = configSchema.safeParse(input)
  return result.success ? result.data : null
}
