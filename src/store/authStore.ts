import { create } from 'zustand'
import { User } from '@core/domain/entities/User'

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  setUser: (user: User | null) => void
  clear: () => void
}

/**
 * Estado global de autenticação. A store apenas guarda estado —
 * as regras de negócio (login/logout) ficam nos use cases / repositórios.
 */
export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  setUser: (user) => set({ user, isAuthenticated: !!user }),
  clear: () => set({ user: null, isAuthenticated: false }),
}))
