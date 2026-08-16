import { create } from 'zustand'
import { addDoc, collection, doc, onSnapshot, orderBy, query, updateDoc, Unsubscribe } from 'firebase/firestore'
import { db } from '@core/infra/firebase/firestore'
import { useAuthStore } from '@store/authStore'

export type Goal = {
  id: string
  name: string
  target: number
  saved: number
  deadline: string
}

type GoalsState = {
  goals: Goal[]
  loading: boolean
  subscribeToUserGoals: (uid: string | null) => () => void
  addGoal: (goal: Omit<Goal, 'id' | 'saved'>) => Promise<void>
  addContribution: (id: string, amount: number) => Promise<void>
  clearGoals: () => void
}

let goalsUnsubscribe: Unsubscribe | null = null

export const useGoalsStore = create<GoalsState>((set) => ({
  goals: [],
  loading: false,
  subscribeToUserGoals: (uid) => {
    if (goalsUnsubscribe) {
      goalsUnsubscribe()
      goalsUnsubscribe = null
    }

    if (!uid) {
      set({ goals: [], loading: false })
      return () => undefined
    }

    set({ loading: true })

    const q = query(collection(db, 'users', uid, 'goals'), orderBy('createdAt', 'desc'))

    goalsUnsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const goals = snapshot.docs.map((document) => {
          const data = document.data() as {
            name: string
            target: number
            saved: number
            deadline: string
          }

          return {
            id: document.id,
            name: data.name,
            target: Number(data.target),
            saved: Number(data.saved),
            deadline: data.deadline,
          }
        })

        set({ goals, loading: false })
      },
      () => {
        set({ goals: [], loading: false })
      },
    )

    return () => {
      if (goalsUnsubscribe) {
        goalsUnsubscribe()
        goalsUnsubscribe = null
      }
    }
  },
  addGoal: async (goal) => {
    const uid = useAuthStore.getState().user?.id

    if (!uid) {
      return
    }

    await addDoc(collection(db, 'users', uid, 'goals'), {
      name: goal.name,
      target: Number(goal.target),
      saved: 0,
      deadline: goal.deadline,
      createdAt: new Date(),
    })
  },
  addContribution: async (id, amount) => {
    const uid = useAuthStore.getState().user?.id
    const currentGoal = useGoalsStore.getState().goals.find((goal) => goal.id === id)

    if (!uid || !currentGoal) {
      return
    }

    const nextSaved = Math.min(currentGoal.target, currentGoal.saved + amount)

    await updateDoc(doc(db, 'users', uid, 'goals', id), {
      saved: nextSaved,
      updatedAt: new Date(),
    })
  },
  clearGoals: () => {
    set({ goals: [], loading: false })
  },
}))
