import { IAuthRepository } from '@core/domain/repositories/IAuthRepository'
import { User } from '@core/domain/entities/User'
import { FirebaseAuthDatasource } from '@core/data/datasources/firebase/FirebaseAuthDatasource'

/**
 * Implementa o contrato do domínio traduzindo os tipos do Firebase
 * para as entidades do COFRE IA.
 */
export class AuthRepository implements IAuthRepository {
  constructor(private readonly datasource: FirebaseAuthDatasource = new FirebaseAuthDatasource()) {}

  async login(email: string, password: string): Promise<User> {
    const firebaseUser = await this.datasource.signIn(email, password)
    return this.mapToUser(firebaseUser)
  }

  async signup(email: string, password: string, name = ''): Promise<User> {
    const firebaseUser = await this.datasource.signUp(email, password, name)
    return this.mapToUser(firebaseUser)
  }

  async logout(): Promise<void> {
    await this.datasource.signOut()
  }

  async getCurrentUser(): Promise<User | null> {
    const firebaseUser = await this.datasource.getCurrentFirebaseUser()
    if (!firebaseUser) {
      return null
    }

    return this.mapToUser(firebaseUser)
  }

  private mapToUser(firebaseUser: { uid: string; displayName: string | null; email: string | null }): User {
    const fallbackEmailName = firebaseUser.email?.split('@')[0]?.trim() || 'Usuário'
    const resolvedName = firebaseUser.displayName?.trim() || fallbackEmailName

    return {
      id: firebaseUser.uid,
      name: resolvedName,
      email: firebaseUser.email ?? '',
      createdAt: new Date(),
    }
  }
}
