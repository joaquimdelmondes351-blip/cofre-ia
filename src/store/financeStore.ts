import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type TransactionType = 'income' | 'expense'

export type Transaction = {
  id: number
  name: string
  category: string
  amount: number
  type: TransactionType
  date: string
}

const initialTransactions: Transaction[] = [
  { id: 1, name: 'Salário', category: 'Receitas', amount: 5800, type: 'income', date: 'Hoje' },
  { id: 2, name: 'Supermercado', category: 'Alimentação', amount: 284.9, type: 'expense', date: 'Hoje' },
  { id: 3, name: 'Aluguel', category: 'Moradia', amount: 1450, type: 'expense', date: '12 ago' },
  { id: 4, name: 'Freelance', category: 'Receitas', amount: 850, type: 'income', date: '10 ago' },
  { id: 5, name: 'Assinaturas', category: 'Serviços', amount: 79.9, type: 'expense', date: '08 ago' },
]

type FinanceState = {
  transactions: Transaction[]
  addTransaction: (transaction: Omit<Transaction, 'id' | 'date'>) => void
  removeTransaction: (id: number) => void
}

export const useFinanceStore = create<FinanceState>()(persist(
  (set) => ({
    transactions: initialTransactions,
    addTransaction: (transaction) => set((state) => ({
      transactions: [{ ...transaction, id: Date.now(), date: 'Agora' }, ...state.transactions],
    })),
    removeTransaction: (id) => set((state) => ({
      transactions: state.transactions.filter((transaction) => transaction.id !== id),
    })),
  }),
  { name: 'cofre-ia-finance' },
))
