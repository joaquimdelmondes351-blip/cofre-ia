import { ReactNode, useEffect } from 'react'
import { BrowserRouter } from 'react-router-dom'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '@core/infra/firebase/auth'
import { useAuthStore } from '@store/authStore'
import { useFinanceStore } from '@store/financeStore'

interface AppProvidersProps {
  children: ReactNode
}

/**
 * Centraliza todos os providers globais da aplicação
 * (Router, Theme, Query, etc.) para manter o App.tsx limpo.
 */
export function AppProviders({ children }: AppProvidersProps) {
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (!firebaseUser) {
        useAuthStore.getState().clear()
        useFinanceStore.getState().subscribeToUserTransactions(null)
        return
      }

      const user = {
        id: firebaseUser.uid,
        name: firebaseUser.displayName ?? firebaseUser.email?.split('@')[0] ?? 'Usuário',
        email: firebaseUser.email ?? '',
        createdAt: new Date(),
      }

      useAuthStore.getState().setUser(user)
      useFinanceStore.getState().subscribeToUserTransactions(firebaseUser.uid)
    })

    return () => unsubscribe()
  }, [])

  return <BrowserRouter>{children}</BrowserRouter>
}
