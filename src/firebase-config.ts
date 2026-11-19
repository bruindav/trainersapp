// Fix: fix-1 — Firebase web-config.
// Deze waarden zijn niet geheim: ze staan in elke Firebase-webapp. De toegang
// tot de data wordt afgedwongen door Firebase Auth + firestore.rules.
// Vul ze in vanuit Firebase-console → Projectinstellingen → Je apps → Web.
export const firebaseConfig = {
  apiKey: '',
  authDomain: '',
  projectId: '',
  storageBucket: '',
  messagingSenderId: '',
  appId: '',
}
