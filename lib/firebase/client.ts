"use client"

import { getApp, getApps, initializeApp } from 'firebase/app'
import { connectAuthEmulator, onAuthStateChanged, getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth'
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore'
import { parseFirebaseConfig } from './config'

const useEmulators = process.env.NEXT_PUBLIC_FIREBASE_USE_EMULATORS === 'true'
const config = process.env.NEXT_PUBLIC_FIREBASE_ACCOUNTS_DISABLED === "true" ? null : useEmulators ? {
  apiKey: 'demo-key', authDomain: 'demo-prizecheck.firebaseapp.com',
  projectId: 'demo-prizecheck', appId: 'demo-prizecheck-web',
} : parseFirebaseConfig({
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
})

export const firebaseConfigured = config !== null
let services: { auth: ReturnType<typeof getAuth>; db: ReturnType<typeof getFirestore> } | null = null

/** Called only by account features. Guest practice makes no Firebase requests. */
export function getFirebaseServices() {
  if (typeof window === 'undefined') throw new Error('Firebase account features require a browser.')
  if (!config) throw new Error('Cloud saving is not configured. Guest practice is still available.')
  if (services) return services
  const name = useEmulators ? 'prizecheck-local' : 'prizecheck-cloud'
  const exists = getApps().some(app => app.name === name)
  const app = exists ? getApp(name) : initializeApp(config, name)
  const auth = getAuth(app)
  const db = getFirestore(app)
  // Connect before any operations; named apps also avoid duplicate connections during hot reload.
  if (useEmulators && !exists) {
    connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true })
    connectFirestoreEmulator(db, '127.0.0.1', 8080)
  }
  services = { auth, db }
  onAuthStateChanged(auth, () => { void import("./sync-queue").then(queue=>queue.activateSync(auth.currentUser?.uid || null)) })
  return services
}

export function signInWithGoogle() {
  const provider = new GoogleAuthProvider()
  provider.setCustomParameters({ prompt: 'select_account' })
  return signInWithPopup(getFirebaseServices().auth, provider)
}

export function signOutOfAccount() {
  return signOut(getFirebaseServices().auth)
}

/** Does not initialize Firebase for guest practice. */
export function currentAccount() { return services?.auth.currentUser ?? null }
