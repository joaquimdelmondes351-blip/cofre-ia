import { create } from 'zustand'
import { addDoc, collection, onSnapshot, orderBy, query, Unsubscribe } from 'firebase/firestore'
import { db } from '@core/infra/firebase/firestore'
import { useAuthStore } from '@store/authStore'

export type Card = {
  id: string
  name: string
  limit: number
  bill: number
  closing: string
}

type CardsState = {
  cards: Card[]
  loading: boolean
  subscribeToUserCards: (uid: string | null) => () => void
  addCard: (card: Omit<Card, 'id'>) => Promise<void>
  clearCards: () => void
}

let cardsUnsubscribe: Unsubscribe | null = null
let cardsSubscriptionId = 0

export const useCardsStore = create<CardsState>((set) => ({
  cards: [],
  loading: false,
  subscribeToUserCards: (uid) => {
    const currentSubscriptionId = ++cardsSubscriptionId

    if (cardsUnsubscribe) {
      cardsUnsubscribe()
      cardsUnsubscribe = null
    }

    if (!uid) {
      set({ cards: [], loading: false })
      return () => undefined
    }

    set({ cards: [], loading: true })

    const q = query(collection(db, 'users', uid, 'cards'), orderBy('createdAt', 'desc'))

    cardsUnsubscribe = onSnapshot(
      q,
      (snapshot) => {
        if (currentSubscriptionId !== cardsSubscriptionId) {
          return
        }

        const cards = snapshot.docs.map((document) => {
          const data = document.data() as {
            name: string
            limit: number
            bill: number
            closing: string
          }

          return {
            id: document.id,
            name: data.name,
            limit: Number(data.limit),
            bill: Number(data.bill),
            closing: data.closing,
          }
        })

        set({ cards, loading: false })
      },
      () => {
        if (currentSubscriptionId !== cardsSubscriptionId) {
          return
        }

        set({ cards: [], loading: false })
      },
    )

    return () => {
      if (cardsUnsubscribe) {
        cardsUnsubscribe()
        cardsUnsubscribe = null
      }
    }
  },
  addCard: async (card) => {
    const uid = useAuthStore.getState().user?.id

    if (!uid) {
      return
    }

    await addDoc(collection(db, 'users', uid, 'cards'), {
      name: card.name,
      limit: Number(card.limit),
      bill: Number(card.bill),
      closing: card.closing,
      createdAt: new Date(),
    })
  },
  clearCards: () => {
    set({ cards: [], loading: false })
  },
}))
