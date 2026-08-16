/**
 * Entidade de domínio — não depende de Firebase, React ou nada externo.
 * Representa o conceito de negócio "Usuário" dentro do COFRE IA.
 */
export interface User {
  id: string
  name: string
  email: string
  createdAt: Date
}
