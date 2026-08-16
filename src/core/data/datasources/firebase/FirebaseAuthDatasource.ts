import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  User as FirebaseUser,
} from 'firebase/auth'
import { auth } from '@core/infra/firebase/auth'

/**
 * Camada mais externa: fala diretamente com o SDK do Firebase.
 * Não expõe tipos do domínio — isso é papel do repositório.
 */
export class FirebaseAuthDatasource {
  async signIn(email: string, password: string) {
    const credential = await signInWithEmailAndPassword(auth, email, password)
    return credential.user
  }

  async signUp(email: string, password: string) {
    const credential = await createUserWithEmailAndPassword(auth, email, password)
    return credential.user
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
