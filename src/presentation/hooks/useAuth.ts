import { useAuthStore } from '@store/authStore'

/**
 * Hook de conveniência para acessar o estado de autenticação
 * dentro dos componentes de presentation.
 */
export function useAuth() {
  const user = useAuthStore((state) => state.user)
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)

  return { user, isAuthenticated }
}
