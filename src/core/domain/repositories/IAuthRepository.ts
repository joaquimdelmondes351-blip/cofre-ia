import { User } from '@core/domain/entities/User'

/**
 * Contrato que a camada de dados (Firebase, ou qualquer outro provedor)
 * precisa implementar. O domínio nunca conhece a implementação concreta.
 */
export interface IAuthRepository {
  login(email: string, password: string): Promise<User>
  logout(): Promise<void>
  getCurrentUser(): Promise<User | null>
}
