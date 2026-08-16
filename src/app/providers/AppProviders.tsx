import { ReactNode, useEffect } from 'react'
import { BrowserRouter } from 'react-router-dom'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '@core/infra/firebase/auth'
import { useAuthStore } from '@store/authStore'
import { useCardsStore } from '@store/cardsStore'
import { useFinanceStore } from '@store/financeStore'
import { useGoalsStore } from '@store/goalsStore'

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
        useCardsStore.getState().subscribeToUserCards(null)
        useGoalsStore.getState().subscribeToUserGoals(null)
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
      useCardsStore.getState().subscribeToUserCards(firebaseUser.uid)
      useGoalsStore.getState().subscribeToUserGoals(firebaseUser.uid)
    })

    return () => unsubscribe()
  }, [])

  return <BrowserRouter>{children}</BrowserRouter>
}
