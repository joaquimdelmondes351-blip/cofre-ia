import { create } from 'zustand'
import { addDoc, collection, deleteDoc, doc, onSnapshot, orderBy, query, Unsubscribe } from 'firebase/firestore'
import { db } from '@core/infra/firebase/firestore'
import { normalizeCardRef } from '@shared/utils/cardBilling'
import { useAuthStore } from '@store/authStore'

export type TransactionType = 'income' | 'expense'

export type Transaction = {
  id: string
  name: string
  category: string
  amount: number
  type: TransactionType
  date: string
  dateValue: string
  paymentMethod?: 'cash' | 'card'
  cardId?: string | null
}

type AddTransactionInput = {
  name: string
  category: string
  amount: number
  type: TransactionType
  date?: string | Date
  paymentMethod?: 'cash' | 'card'
  cardId?: string | null
}

type FinanceState = {
  transactions: Transaction[]
  loading: boolean
  subscribeToUserTransactions: (uid: string | null) => () => void
  addTransaction: (transaction: AddTransactionInput) => Promise<void>
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
let transactionsSubscriptionId = 0

export const useFinanceStore = create<FinanceState>((set) => ({
  transactions: [],
  loading: false,
  subscribeToUserTransactions: (uid) => {
    const currentSubscriptionId = ++transactionsSubscriptionId

    if (transactionsUnsubscribe) {
      transactionsUnsubscribe()
      transactionsUnsubscribe = null
    }

    if (!uid) {
      set({ transactions: [], loading: false })
      return () => undefined
    }

    set({ transactions: [], loading: true })

    const q = query(collection(db, 'users', uid, 'transactions'), orderBy('createdAt', 'desc'))

    transactionsUnsubscribe = onSnapshot(
      q,
      (snapshot) => {
        if (currentSubscriptionId !== transactionsSubscriptionId) {
          return
        }

        const transactions = snapshot.docs.map((document) => {
          const data = document.data() as {
            name: string
            category: string
            amount: number
            type: TransactionType
            date?: string | { toDate: () => Date } | Date | number | null
            createdAt?: { toDate: () => Date } | Date | number | null
            paymentMethod?: 'cash' | 'card'
            cardId?: unknown
            card_id?: unknown
            card?: unknown
          }

          const createdAt = data.createdAt && typeof data.createdAt === 'object' && 'toDate' in data.createdAt
            ? data.createdAt.toDate()
            : data.createdAt instanceof Date
              ? data.createdAt
              : typeof data.createdAt === 'number'
                ? new Date(data.createdAt)
                : new Date()

          const documentDate = data.date && typeof data.date === 'string'
            ? new Date(data.date)
            : data.date && typeof data.date === 'object' && 'toDate' in data.date
              ? data.date.toDate()
              : data.date instanceof Date
                ? data.date
                : typeof data.date === 'number'
                  ? new Date(data.date)
                  : createdAt

          const dateValue = documentDate instanceof Date ? documentDate.toISOString() : new Date().toISOString()

          return {
            id: document.id,
            name: data.name,
            category: data.category,
            amount: Number(data.amount),
            type: data.type,
            date: formatDate(documentDate),
            dateValue,
            paymentMethod: data.paymentMethod ?? 'cash',
            cardId: normalizeCardRef(data.cardId ?? data.card_id ?? data.card),
          }
        })

        set({ transactions, loading: false })
      },
      (error) => {
        if (currentSubscriptionId !== transactionsSubscriptionId) {
          return
        }

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

    const normalizedDate = typeof transaction.date === 'string'
      ? new Date(transaction.date)
      : transaction.date instanceof Date
        ? transaction.date
        : new Date()

    await addDoc(collection(db, 'users', uid, 'transactions'), {
      name: transaction.name,
      category: transaction.category,
      amount: Number(transaction.amount),
      type: transaction.type,
      date: normalizedDate.toISOString(),
      dateValue: normalizedDate.toISOString(),
      paymentMethod: transaction.paymentMethod ?? 'cash',
      cardId: transaction.type === 'expense' && transaction.paymentMethod === 'card' ? transaction.cardId ?? null : null,
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
