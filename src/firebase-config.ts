// Fix: fix-1 — Firebase web-config.
// Deze waarden zijn niet geheim: ze staan in elke Firebase-webapp. De toegang
// tot de data wordt afgedwongen door Firebase Auth + firestore.rules.
// Vul ze in vanuit Firebase-console → Projectinstellingen → Je apps → Web.
export const firebaseConfig = {
  apiKey: 'AIzaSyADNRybQpnDFqxg7QP_Fvc_A8M3mOk6N9I',
  authDomain: 'trainers-app-1b158.firebaseapp.com',
  projectId: 'trainers-app-1b158',
  storageBucket: 'trainers-app-1b158.firebasestorage.app',
  messagingSenderId: '952995410164',
  appId: '1:952995410164:web:59422562e885f798bceea1',
}
