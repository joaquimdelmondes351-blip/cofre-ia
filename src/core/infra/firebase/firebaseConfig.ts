import { initializeApp, getApps, getApp } from 'firebase/app'

/**
 * Todas as chaves vêm de variáveis de ambiente (.env).
 * Nunca commitar valores reais — veja .env.example.
 */
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

// Evita reinicializar o app em hot-reload
export const firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig)
