import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  User as FirebaseUser,
} from 'firebase/auth'
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore'
import { auth } from '@core/infra/firebase/auth'
import { db } from '@core/infra/firebase/firestore'

/**
 * Camada mais externa: fala diretamente com o SDK do Firebase.
 * Não expõe tipos do domínio — isso é papel do repositório.
 */
export class FirebaseAuthDatasource {
  async signIn(email: string, password: string) {
    const credential = await signInWithEmailAndPassword(auth, email, password)
    return credential.user
  }

  async signUp(email: string, password: string, name: string) {
    const credential = await createUserWithEmailAndPassword(auth, email, password)
    const normalizedName = name.trim()

    if (normalizedName) {
      await updateProfile(credential.user, { displayName: normalizedName })
    }

    const userDoc = doc(db, 'users', credential.user.uid)
    await setDoc(userDoc, {
      name: normalizedName || credential.user.email?.split('@')[0] || 'Usuário',
      email: credential.user.email?.toLowerCase() ?? email.toLowerCase(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }, { merge: true })

    return credential.user
  }

  async saveProfile(uid: string, name: string, email: string) {
    const profileRef = doc(db, 'users', uid)
    await setDoc(profileRef, {
      name,
      email: email.toLowerCase(),
      updatedAt: serverTimestamp(),
    }, { merge: true })
  }

  async getProfile(uid: string) {
    const profileRef = doc(db, 'users', uid)
    const snapshot = await getDoc(profileRef)

    if (!snapshot.exists()) {
      return null
    }

    return snapshot.data() as { name?: string; email?: string } | null
  }

  async signOut() {
    await signOut(auth)
  }

  getCurrentFirebaseUser(): Promise<FirebaseUser | null> {
    return new Promise((resolve) => {
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        unsubscribe()
        resolve(user)
      })
    })
  }
}
