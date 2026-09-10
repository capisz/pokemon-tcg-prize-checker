import { expect, it } from 'vitest'
import { parseFirebaseConfig } from '../lib/firebase/config'

it('leaves cloud features unconfigured when config is missing or partial', () => {
  expect(parseFirebaseConfig({})).toBeNull()
  expect(parseFirebaseConfig({apiKey:'key',projectId:'project'})).toBeNull()
})
it('rejects blank configuration fields', () => {
  expect(parseFirebaseConfig({apiKey:' ',authDomain:'domain',projectId:'project',appId:'app'})).toBeNull()
})
it('accepts only the required web configuration fields', () => {
  expect(parseFirebaseConfig({apiKey:'key',authDomain:'domain',projectId:'project',appId:'app',extra:'ignored'})).toEqual({apiKey:'key',authDomain:'domain',projectId:'project',appId:'app'})
})
