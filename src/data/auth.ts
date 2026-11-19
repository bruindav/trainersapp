// Fix: fix-18 — uitnodigingsmail met inloglink; mails in het Nederlands
/**
 * Fix: fix-3 — coördinator i.p.v. hoofdtrainer; taken bij uitnodiging; migratie oude rol.
 * Fix: fix-1 — inloggen met Firebase Auth en bepalen of iemand toegang heeft.
 *
 * Toegang = er bestaat een document `trainers/{uid}`. Dat ontstaat op twee
 * manieren (beide afgedwongen in firestore.rules):
 *  1. Eerste inrichting: zolang `config/setup` niet bestaat, mag de eerste
 *     ingelogde gebruiker met geverifieerd e-mailadres zichzelf hoofdtrainer maken.
 *  2. Uitnodiging: de hoofdtrainer zet `uitnodigingen/{email}` klaar; wie met dat
 *     (geverifieerde) e-mailadres inlogt, zet de uitnodiging om in een trainer.
 */
import { useSyncExternalStore } from 'react'
import {
  GoogleAuthProvider,
  isSignInWithEmailLink,
  onAuthStateChanged,
  sendSignInLinkToEmail,
  signInWithEmailLink,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth'
import { FirebaseError } from 'firebase/app'
import {
  clearIndexedDbPersistence,
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  terminate,
  updateDoc,
  writeBatch,
} from 'firebase/firestore'

import { getDb, getFirebaseAuth, isFirebaseGeconfigureerd } from '@/lib/firebase'
import { STANDAARD_JAARPLAN, TRAINER_KLEUREN, type Trainer, type Uitnodiging } from './fixtures'
import { JAARPLAN_DOC, initialenVan, naarTrainer } from './store'

export type AuthStatus =
  | { soort: 'niet-geconfigureerd' }
  | { soort: 'laden' }
  | { soort: 'uitgelogd' }
  | { soort: 'link-bevestigen' }
  | { soort: 'instellen'; user: User }
  | { soort: 'geen-toegang'; user: User }
  | { soort: 'fout'; user: User }
  | { soort: 'ingelogd'; user: User; trainer: Trainer }

const EMAIL_SLEUTEL = 'trainersapp:inlog-email'

let status: AuthStatus = isFirebaseGeconfigureerd ? { soort: 'laden' } : { soort: 'niet-geconfigureerd' }
const listeners = new Set<() => void>()

function zet(s: AuthStatus) {
  status = s
  listeners.forEach((l) => l())
}

export function useAuthStatus(): AuthStatus {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => status,
    () => status,
  )
}

let gestart = false
let stopTrainerListener: (() => void) | undefined
/** Verhoogd bij elke auth-wijziging; oude asynchrone stappen worden genegeerd. */
let generatie = 0
/** True terwijl een e-maillink wordt afgerond (voorkomt een flits van het inlogscherm). */
let linkBezig = false

/** Start het volgen van de inlogstatus (één keer, vanuit de root). */
export function startAuth() {
  if (gestart || !isFirebaseGeconfigureerd) return
  gestart = true
  const auth = getFirebaseAuth()

  if (isSignInWithEmailLink(auth, window.location.href)) {
    // Bij een uitnodigingsmail staat het adres in de link (de inlogcode hoort
    // bij dat adres, dus een ander adres invullen werkt toch niet).
    const email = leesOpgeslagenEmail() ?? new URLSearchParams(window.location.search).get('uitgenodigd')
    if (email) {
      linkBezig = true
      rondEmailLinkAf(email)
        .catch((err) => {
          if (foutCode(err) === 'auth/invalid-action-code' || foutCode(err) === 'auth/expired-action-code') {
            window.history.replaceState(null, '', '/')
            zet({ soort: 'uitgelogd' })
          } else {
            zet({ soort: 'link-bevestigen' })
          }
        })
        .finally(() => {
          linkBezig = false
        })
    } else {
      zet({ soort: 'link-bevestigen' })
    }
  }

  onAuthStateChanged(auth, (user) => {
    const mijnGeneratie = ++generatie
    stopTrainerListener?.()
    stopTrainerListener = undefined
    if (!user) {
      if (status.soort !== 'link-bevestigen' && !linkBezig) zet({ soort: 'uitgelogd' })
      return
    }
    zet({ soort: 'laden' })
    bepaalToegang(user, mijnGeneratie).catch((err) => {
      console.error('Toegang bepalen', err)
      if (mijnGeneratie === generatie) zet({ soort: 'fout', user })
    })
  })
}

function foutCode(err: unknown) {
  return err instanceof FirebaseError ? err.code : ''
}

async function bepaalToegang(user: User, mijnGeneratie = generatie) {
  const actueel = () => mijnGeneratie === generatie
  const db = getDb()

  // Alleen bewezen e-mailadressen (Google of e-maillink) krijgen toegang.
  if (!user.emailVerified) {
    zet({ soort: 'geen-toegang', user })
    return
  }

  const trainerRef = doc(db, 'trainers', user.uid)
  let snap = await getDoc(trainerRef)

  if (!snap.exists() && user.email && user.emailVerified) {
    const email = user.email.toLowerCase()
    const uitnodigingRef = doc(db, 'uitnodigingen', email)
    const uitnodiging = await getDoc(uitnodigingRef).catch(() => null)
    if (uitnodiging?.exists()) {
      const u = uitnodiging.data() as Uitnodiging
      const batch = writeBatch(db)
      batch.set(trainerRef, {
        naam: u.naam,
        initialen: initialenVan(u.naam),
        kleur: u.kleur,
        rol: u.rol,
        specialiteit: u.specialiteit ?? '',
        email,
        sinds: serverTimestamp(),
        coordinator: u.coordinator === true,
        jaarplanBeheer: u.jaarplanBeheer === true,
        teamBeheer: u.teamBeheer === true,
        toezichthouder: u.toezichthouder === true,
      })
      batch.delete(uitnodigingRef)
      await batch.commit()
      snap = await getDoc(trainerRef)
    }
  }

  if (!actueel()) return
  if (!snap.exists()) {
    const setup = await getDoc(doc(db, 'config', 'setup'))
    if (!actueel()) return
    zet(setup.exists() ? { soort: 'geen-toegang', user } : { soort: 'instellen', user })
    return
  }

  // Blijf het eigen trainer-document volgen: bij een rolwijziging of
  // verwijdering past de app zich direct aan.
  stopTrainerListener?.()
  stopTrainerListener = onSnapshot(
    trainerRef,
    (s) => {
      if (!actueel()) return
      if (!s.exists()) {
        zet({ soort: 'geen-toegang', user })
        return
      }
      const d = s.data()
      // Migratie (fix-3): de oude rol 'Hoofdtrainer' wordt trainer met alle taken.
      if (d.rol === 'Hoofdtrainer') {
        updateDoc(trainerRef, {
          rol: 'Trainer',
          coordinator: true,
          jaarplanBeheer: true,
          teamBeheer: true,
          toezichthouder: d.toezichthouder === true,
        }).catch((err) => console.error('Migratie hoofdtrainer', err))
      }
      zet({ soort: 'ingelogd', user, trainer: naarTrainer(s.id, d) })
    },
    (err) => {
      if (!actueel()) return
      // Zonder rechten (bijv. verwijderd uit het team) → geen toegang; anders een fout.
      zet(foutCode(err) === 'permission-denied' ? { soort: 'geen-toegang', user } : { soort: 'fout', user })
    },
  )
}

// ---------------------------------------------------------------------------
// Inloggen
// ---------------------------------------------------------------------------

function leesOpgeslagenEmail(): string | null {
  try {
    return window.localStorage.getItem(EMAIL_SLEUTEL)
  } catch {
    return null
  }
}

export async function stuurInlogLink(email: string) {
  const auth = getFirebaseAuth()
  auth.languageCode = 'nl'
  await sendSignInLinkToEmail(auth, email, {
    url: `${window.location.origin}/`,
    handleCodeInApp: true,
  })
  try {
    window.localStorage.setItem(EMAIL_SLEUTEL, email)
  } catch {
    // Geen opslag beschikbaar: de gebruiker vult het adres na het klikken opnieuw in.
  }
}

/**
 * Stuurt een uitgenodigd teamlid een mail met een inloglink (via Firebase,
 * dezelfde mail als bij gewoon inloggen). Het adres komt niet in de opslag
 * van dit apparaat: het is het apparaat van de coördinator.
 */
export async function stuurUitnodigingsMail(email: string) {
  const auth = getFirebaseAuth()
  auth.languageCode = 'nl'
  await sendSignInLinkToEmail(auth, email, {
    url: `${window.location.origin}/?uitgenodigd=${encodeURIComponent(email)}`,
    handleCodeInApp: true,
  })
}

/** Rondt het inloggen af nadat de gebruiker op de link in de mail heeft geklikt. */
export async function rondEmailLinkAf(email: string) {
  const auth = getFirebaseAuth()
  await signInWithEmailLink(auth, email.trim(), window.location.href)
  try {
    window.localStorage.removeItem(EMAIL_SLEUTEL)
  } catch {
    // negeren
  }
  // Haal de inlogcode uit de adresbalk.
  window.history.replaceState(null, '', '/')
}

export async function logInMetGoogle() {
  await signInWithPopup(getFirebaseAuth(), new GoogleAuthProvider())
}

/**
 * Uitloggen en de lokale Firestore-cache wissen, zodat op een gedeeld
 * apparaat geen trainersgegevens achterblijven. Daarna herladen we de app.
 */
export async function logUit() {
  await signOut(getFirebaseAuth())
  const db = getDb()
  try {
    await terminate(db)
    await clearIndexedDbPersistence(db)
  } catch (err) {
    console.warn('Cache wissen na uitloggen', err)
  }
  window.location.replace('/')
}

/** Annuleer het afronden van een e-maillink en ga terug naar het inlogscherm. */
export function annuleerLinkBevestigen() {
  window.history.replaceState(null, '', '/')
  zet({ soort: 'uitgelogd' })
}

/** Eerste inrichting: maak de ingelogde gebruiker coördinator. */
export async function richAppIn(user: User, naam: string, geeftZelfTraining: boolean) {
  const db = getDb()
  const batch = writeBatch(db)
  batch.set(doc(db, 'trainers', user.uid), {
    naam: naam.trim(),
    initialen: initialenVan(naam),
    kleur: TRAINER_KLEUREN[0].waarde,
    rol: geeftZelfTraining ? 'Trainer' : 'Geen training',
    specialiteit: '',
    email: user.email!.toLowerCase(),
    sinds: serverTimestamp(),
    coordinator: true,
    jaarplanBeheer: true,
    teamBeheer: true,
    toezichthouder: false,
  })
  batch.set(doc(db, 'config', 'setup'), { hoofdtrainerUid: user.uid, op: serverTimestamp() })
  batch.set(doc(db, ...JAARPLAN_DOC), { ...STANDAARD_JAARPLAN, gepubliceerdDoor: user.uid })
  await batch.commit()
  await bepaalToegang(user)
}
