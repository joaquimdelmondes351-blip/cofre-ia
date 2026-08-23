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
    let authChangeId = 0

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      const currentAuthChangeId = ++authChangeId

      if (!firebaseUser) {
        useAuthStore.getState().clear()
        useFinanceStore.getState().subscribeToUserTransactions(null)
        useCardsStore.getState().subscribeToUserCards(null)
        useGoalsStore.getState().subscribeToUserGoals(null)
        return
      }

      useAuthStore.getState().clear()
      useFinanceStore.getState().subscribeToUserTransactions(null)
      useCardsStore.getState().subscribeToUserCards(null)
      useGoalsStore.getState().subscribeToUserGoals(null)

      const emailPrefix = firebaseUser.email?.split('@')[0]?.trim() || 'Usuário'
      const resolvedName = firebaseUser.displayName?.trim() || emailPrefix

      if (currentAuthChangeId !== authChangeId || auth.currentUser?.uid !== firebaseUser.uid) {
        return
      }

      const user = {
        id: firebaseUser.uid,
        name: resolvedName,
        email: firebaseUser.email ?? '',
        createdAt: new Date(),
      }

      useAuthStore.getState().setUser(user)
      useFinanceStore.getState().subscribeToUserTransactions(firebaseUser.uid)
      useCardsStore.getState().subscribeToUserCards(firebaseUser.uid)
      useGoalsStore.getState().subscribeToUserGoals(firebaseUser.uid)
    })

    return () => {
      authChangeId += 1
      unsubscribe()
      useAuthStore.getState().clear()
      useFinanceStore.getState().subscribeToUserTransactions(null)
      useCardsStore.getState().subscribeToUserCards(null)
      useGoalsStore.getState().subscribeToUserGoals(null)
    }
  }, [])

  return <BrowserRouter>{children}</BrowserRouter>
}
