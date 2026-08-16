import { Routes, Route, Navigate } from 'react-router-dom'
import { MainLayout } from '@presentation/layouts/MainLayout'
import { HomePage } from '@presentation/pages/HomePage'
import { LoginPage } from '@presentation/pages/LoginPage'
import { NotFoundPage } from '@presentation/pages/NotFoundPage'
import { WorkspacePage } from '@presentation/pages/WorkspacePage'
import { TransactionsPage } from '@presentation/pages/TransactionsPage'
import { GoalsPage } from '@presentation/pages/GoalsPage'
import { CardsPage } from '@presentation/pages/CardsPage'

/**
 * Router raiz. Nenhuma regra de negócio aqui —
 * apenas mapeamento de rota -> página.
 */
export function AppRouter() {
  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/movimentacoes" element={<TransactionsPage />} />
        <Route path="/cartoes" element={<CardsPage />} />
        <Route path="/metas" element={<GoalsPage />} />
        <Route path="/analises" element={<WorkspacePage title="Análises" description="Enxergue oportunidades e riscos com mais clareza." icon="analytics" />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/404" element={<NotFoundPage />} />
        <Route path="*" element={<Navigate to="/404" replace />} />
      </Route>
    </Routes>
  )
}
