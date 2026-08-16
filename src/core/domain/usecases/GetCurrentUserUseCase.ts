import { IAuthRepository } from '@core/domain/repositories/IAuthRepository'
import { User } from '@core/domain/entities/User'

/**
 * Exemplo de Use Case (Clean Architecture): orquestra uma regra de negócio
 * usando apenas o contrato do repositório, nunca a implementação concreta.
 */
export class GetCurrentUserUseCase {
  constructor(private readonly authRepository: IAuthRepository) {}

  async execute(): Promise<User | null> {
    return this.authRepository.getCurrentUser()
  }
}
