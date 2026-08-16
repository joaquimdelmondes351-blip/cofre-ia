import { ReactNode } from 'react'
import { BrowserRouter } from 'react-router-dom'

interface AppProvidersProps {
  children: ReactNode
}

/**
 * Centraliza todos os providers globais da aplicação
 * (Router, Theme, Query, etc.) para manter o App.tsx limpo.
 */
export function AppProviders({ children }: AppProvidersProps) {
  return <BrowserRouter>{children}</BrowserRouter>
}
