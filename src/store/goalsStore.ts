import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Goal = { id: number; name: string; target: number; saved: number; deadline: string }

type GoalsState = {
  goals: Goal[]
  addGoal: (goal: Omit<Goal, 'id' | 'saved'>) => void
  addContribution: (id: number, amount: number) => void
}

export const useGoalsStore = create<GoalsState>()(persist(
  (set) => ({
    goals: [{ id: 1, name: 'Reserva de emergência', target: 10000, saved: 4200, deadline: 'Dezembro de 2026' }],
    addGoal: (goal) => set((state) => ({ goals: [...state.goals, { ...goal, id: Date.now(), saved: 0 }] })),
    addContribution: (id, amount) => set((state) => ({ goals: state.goals.map((goal) => goal.id === id ? { ...goal, saved: Math.min(goal.target, goal.saved + amount) } : goal) })),
  }),
  { name: 'cofre-ia-goals' },
))
