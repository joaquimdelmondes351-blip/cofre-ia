import { Routes, Route, Navigate } from 'react-router-dom'
import { MainLayout } from '@presentation/layouts/MainLayout'
import { useAuth } from '@presentation/hooks/useAuth'
import { HomePage } from '@presentation/pages/HomePage'
import { LoginPage } from '@presentation/pages/LoginPage'
import { NotFoundPage } from '@presentation/pages/NotFoundPage'
import { WorkspacePage } from '@presentation/pages/WorkspacePage'
import { TransactionsPage } from '@presentation/pages/TransactionsPage'
import { GoalsPage } from '@presentation/pages/GoalsPage'
import { CardsPage } from '@presentation/pages/CardsPage'
import { ImportSpreadsheetPage } from '@presentation/pages/ImportSpreadsheetPage'

function ProtectedRoute({ children }: { children: JSX.Element }) {
  const { isAuthenticated } = useAuth()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return children
}

/**
 * Router raiz. Nenhuma regra de negócio aqui —
 * apenas mapeamento de rota -> página.
 */
export function AppRouter() {
  const { isAuthenticated } = useAuth()

  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route path="/" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
        <Route path="/movimentacoes" element={<ProtectedRoute><TransactionsPage /></ProtectedRoute>} />
        <Route path="/importar-planilha" element={<ProtectedRoute><ImportSpreadsheetPage /></ProtectedRoute>} />
        <Route path="/cartoes" element={<ProtectedRoute><CardsPage /></ProtectedRoute>} />
        <Route path="/metas" element={<ProtectedRoute><GoalsPage /></ProtectedRoute>} />
        <Route path="/analises" element={<ProtectedRoute><WorkspacePage title="Análises" description="Enxergue oportunidades e riscos com mais clareza." icon="analytics" /></ProtectedRoute>} />
        <Route path="/login" element={isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />} />
        <Route path="/404" element={<NotFoundPage />} />
        <Route path="*" element={<Navigate to="/404" replace />} />
      </Route>
    </Routes>
  )
}
