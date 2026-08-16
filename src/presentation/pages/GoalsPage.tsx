import { FormEvent, useState } from 'react'
import { Plus, PiggyBank, Target } from 'lucide-react'
import { formatCurrency } from '@shared/utils/formatCurrency'
import { Goal, useGoalsStore } from '@store/goalsStore'

export function GoalsPage() {
  const goals = useGoalsStore((state) => state.goals)
  const loading = useGoalsStore((state) => state.loading)
  const addGoal = useGoalsStore((state) => state.addGoal)
  const addContribution = useGoalsStore((state) => state.addContribution)
  const [showForm, setShowForm] = useState(false)
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null)
  const [contribution, setContribution] = useState('')

  async function createGoal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const name = String(form.get('name') ?? '').trim()
    const target = Number(form.get('target'))
    const deadline = String(form.get('deadline') ?? '').trim()

    if (!name || target <= 0 || !deadline) {
      return
    }

    await addGoal({ name, target, deadline })
    event.currentTarget.reset()
    setShowForm(false)
  }

  async function contribute(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const amount = Number(contribution)

    if (!selectedGoal || !Number.isFinite(amount) || amount <= 0) {
      return
    }

    await addContribution(selectedGoal.id, amount)
    setContribution('')
    setSelectedGoal(null)
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-medium text-emerald-600">PLANEJAMENTO</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">Metas e cofrinhos</h1>
          <p className="mt-2 text-slate-500">Cada aporte aproxima você da vida que quer construir.</p>
        </div>
        <button type="button" onClick={() => setShowForm((value) => !value)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white"><Plus size={18} />Nova meta</button>
      </div>

      {showForm && (
        <form onSubmit={createGoal} className="mt-6 grid gap-3 rounded-2xl border border-emerald-100 bg-emerald-50 p-4 md:grid-cols-[1.3fr_1fr_1fr_auto]">
          <input name="name" required placeholder="Ex.: Viagem de fim de ano" className="rounded-lg border border-emerald-100 bg-white px-3 py-2.5 text-sm outline-none" />
          <input name="target" required min="1" type="number" placeholder="Objetivo (R$)" className="rounded-lg border border-emerald-100 bg-white px-3 py-2.5 text-sm outline-none" />
          <input name="deadline" required placeholder="Prazo (ex.: Dezembro de 2026)" className="rounded-lg border border-emerald-100 bg-white px-3 py-2.5 text-sm outline-none" />
          <button className="rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white">Criar</button>
        </form>
      )}

      {loading ? (
        <div className="mt-7 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">Carregando metas...</div>
      ) : goals.length === 0 ? (
        <div className="mt-7 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">Nenhuma meta cadastrada ainda.</div>
      ) : (
        <div className="mt-7 grid gap-5 md:grid-cols-2 xl:grid-cols-3">{goals.map((goal) => <GoalCard key={goal.id} goal={goal} onContribute={() => setSelectedGoal(goal)} />)}</div>
      )}

      {selectedGoal && (
        <div className="fixed inset-0 z-10 flex items-center justify-center bg-slate-950/40 p-4">
          <form onSubmit={contribute} className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600"><PiggyBank size={22} /></div>
            <h2 className="mt-4 text-xl font-bold text-slate-950">Aportar em {selectedGoal.name}</h2>
            <p className="mt-2 text-sm text-slate-500">Quanto você quer guardar agora?</p>
            <label className="mt-4 block">
              <span className="mb-2 block text-sm font-medium text-slate-700">Valor do aporte</span>
              <input value={contribution} onChange={(event) => setContribution(event.target.value)} type="number" min="1" step="0.01" placeholder="Ex.: 250" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none" />
            </label>
            <div className="mt-5 flex gap-3">
              <button type="button" onClick={() => setSelectedGoal(null)} className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700">Cancelar</button>
              <button className="flex-1 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white">Salvar</button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}

function GoalCard({ goal, onContribute }: { goal: Goal; onContribute: () => void }) {
  const progress = goal.target > 0 ? Math.round((goal.saved / goal.target) * 100) : 0
  const remaining = Math.max(goal.target - goal.saved, 0)
  const deadlineInfo = getGoalDeadlineInfo(goal.deadline)
  const monthlyNeed = deadlineInfo && remaining > 0 ? remaining / Math.max(deadlineInfo.monthsRemaining, 1) : 0
  const isExpired = Boolean(deadlineInfo?.isExpired)

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-50 text-violet-600"><Target size={21} /></div>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">{progress}%</span>
      </div>
      <h2 className="mt-5 font-semibold text-slate-950">{goal.name}</h2>
      <p className="mt-1 text-sm text-slate-500">Prazo: {goal.deadline}</p>
      <div className="mt-5 flex items-end justify-between"><strong className="text-xl text-slate-950">{formatCurrency(goal.saved)}</strong><span className="text-sm text-slate-500">de {formatCurrency(goal.target)}</span></div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-violet-600 transition-all" style={{ width: `${Math.min(progress, 100)}%` }} /></div>

      <p className="mt-4 text-xs leading-5 text-slate-600">
        {remaining > 0
          ? `Faltam ${formatCurrency(remaining)}. Para atingir até ${goal.deadline}, guarde ${formatCurrency(monthlyNeed)} por mês.`
          : `Meta concluída! Você já alcançou ${formatCurrency(goal.target)}.`}
      </p>

      {isExpired && remaining > 0 && (
        <p className="mt-2 text-xs font-semibold text-rose-600">Prazo já passou.</p>
      )}

      <button type="button" onClick={onContribute} className="mt-5 w-full rounded-xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800">Fazer aporte</button>
    </section>
  )
}

function getGoalDeadlineInfo(deadline: string) {
  const monthNames = [
    'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
    'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
  ]

  const match = deadline.trim().match(/([a-zA-ZÀ-ú]+)\s+de\s+(\d{4})/i)

  if (!match) {
    return null
  }

  const monthName = match[1].toLowerCase()
  const monthIndex = monthNames.indexOf(monthName)
  const year = Number(match[2])

  if (monthIndex === -1 || Number.isNaN(year)) {
    return null
  }

  const targetDate = new Date(year, monthIndex, 1)
  const currentDate = new Date()
  const currentMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
  const monthsRemaining = Math.max(
    (targetDate.getFullYear() - currentMonth.getFullYear()) * 12 +
      (targetDate.getMonth() - currentMonth.getMonth()),
    1,
  )

  return {
    isExpired: targetDate < currentMonth,
    monthsRemaining,
  }
}
