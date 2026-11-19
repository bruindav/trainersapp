// Fix: fix-1 — Firebase initialisatie (Auth + Firestore)
import { initializeApp, type FirebaseApp } from 'firebase/app'
import { connectAuthEmulator, getAuth, type Auth } from 'firebase/auth'
import {
  connectFirestoreEmulator,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  type Firestore,
} from 'firebase/firestore'

import { firebaseConfig } from '@/firebase-config'

const gebruikEmulator = import.meta.env.VITE_FIREBASE_EMULATOR === 'true'

/** False zolang `src/firebase-config.ts` nog niet is ingevuld. */
export const isFirebaseGeconfigureerd = gebruikEmulator || (!!firebaseConfig.apiKey && !!firebaseConfig.projectId)

let app: FirebaseApp | undefined
let auth: Auth | undefined
let db: Firestore | undefined

function init() {
  if (app) return
  if (!isFirebaseGeconfigureerd) throw new Error('Firebase is nog niet geconfigureerd')
  app = initializeApp(gebruikEmulator ? { apiKey: 'demo', projectId: 'demo-trainersapp' } : firebaseConfig)
  auth = getAuth(app)
  auth.languageCode = 'nl'
  db = initializeFirestore(app, {
    ignoreUndefinedProperties: true,
    // Offline cache: de app blijft bruikbaar met slecht bereik in het zwembad.
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
  })
  if (gebruikEmulator) {
    connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true })
    connectFirestoreEmulator(db, '127.0.0.1', 8080)
  }
}

export function getFirebaseAuth(): Auth {
  init()
  return auth!
}

export function getDb(): Firestore {
  init()
  return db!
}
