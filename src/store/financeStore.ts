import { create } from 'zustand'
import { addDoc, collection, deleteDoc, doc, onSnapshot, orderBy, query, Unsubscribe } from 'firebase/firestore'
import { db } from '@core/infra/firebase/firestore'
import { useAuthStore } from '@store/authStore'

export type TransactionType = 'income' | 'expense'

export type Transaction = {
  id: string
  name: string
  category: string
  amount: number
  type: TransactionType
  date: string
}

type FinanceState = {
  transactions: Transaction[]
  loading: boolean
  subscribeToUserTransactions: (uid: string | null) => () => void
  addTransaction: (transaction: Omit<Transaction, 'id' | 'date'>) => Promise<void>
  removeTransaction: (id: string) => Promise<void>
  clearTransactions: () => void
}

const formatDate = (value: Date | number | null | undefined) => {
  if (!value) {
    return 'Agora'
  }

  const date = value instanceof Date ? value : new Date(value)
  const today = new Date()
  const isToday = date.toDateString() === today.toDateString()

  if (isToday) {
    return 'Hoje'
  }

  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

let transactionsUnsubscribe: Unsubscribe | null = null

export const useFinanceStore = create<FinanceState>((set) => ({
  transactions: [],
  loading: false,
  subscribeToUserTransactions: (uid) => {
    if (transactionsUnsubscribe) {
      transactionsUnsubscribe()
      transactionsUnsubscribe = null
    }

    if (!uid) {
      set({ transactions: [], loading: false })
      return () => undefined
    }

    set({ loading: true })

    const q = query(collection(db, 'users', uid, 'transactions'), orderBy('createdAt', 'desc'))

    transactionsUnsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const transactions = snapshot.docs.map((document) => {
          const data = document.data() as {
            name: string
            category: string
            amount: number
            type: TransactionType
            createdAt?: { toDate: () => Date } | Date | number | null
          }

          const createdAt = data.createdAt && typeof data.createdAt === 'object' && 'toDate' in data.createdAt
            ? data.createdAt.toDate()
            : data.createdAt instanceof Date
              ? data.createdAt
              : typeof data.createdAt === 'number'
                ? new Date(data.createdAt)
                : new Date()

          return {
            id: document.id,
            name: data.name,
            category: data.category,
            amount: Number(data.amount),
            type: data.type,
            date: formatDate(createdAt),
          }
        })

        set({ transactions, loading: false })
      },
      (error) => {
        console.error('Erro ao carregar transações do Firestore:', error)
        set({ transactions: [], loading: false })
      },
    )

    return () => {
      if (transactionsUnsubscribe) {
        transactionsUnsubscribe()
        transactionsUnsubscribe = null
      }
    }
  },
  addTransaction: async (transaction) => {
    const uid = useAuthStore.getState().user?.id

    if (!uid) {
      return
    }

    await addDoc(collection(db, 'users', uid, 'transactions'), {
      ...transaction,
      amount: Number(transaction.amount),
      createdAt: new Date(),
    })
  },
  removeTransaction: async (id) => {
    const uid = useAuthStore.getState().user?.id

    if (!uid) {
      return
    }

    await deleteDoc(doc(db, 'users', uid, 'transactions', id))
  },
  clearTransactions: () => {
    set({ transactions: [], loading: false })
  },
}))
