import { FormEvent, useState } from 'react'
import { Plus, PiggyBank, Target } from 'lucide-react'
import { formatCurrency } from '@shared/utils/formatCurrency'
import { Goal, useGoalsStore } from '@store/goalsStore'

export function GoalsPage() {
  const goals = useGoalsStore((state) => state.goals)
  const addGoal = useGoalsStore((state) => state.addGoal)
  const addContribution = useGoalsStore((state) => state.addContribution)
  const [showForm, setShowForm] = useState(false)
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null)
  const [contribution, setContribution] = useState('')
  function createGoal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const name = String(form.get('name') ?? '').trim()
    const target = Number(form.get('target'))
    const deadline = String(form.get('deadline') ?? '').trim()
    if (!name || target <= 0 || !deadline) return
    addGoal({ name, target, deadline })
    event.currentTarget.reset()
    setShowForm(false)
  }
  function contribute(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const amount = Number(contribution)
    if (!selectedGoal || !Number.isFinite(amount) || amount <= 0) return
    addContribution(selectedGoal.id, amount)
    setContribution('')
    setSelectedGoal(null)
  }
  return <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-sm font-medium text-emerald-600">PLANEJAMENTO</p><h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">Metas e cofrinhos</h1><p className="mt-2 text-slate-500">Cada aporte aproxima você da vida que quer construir.</p></div><button type="button" onClick={() => setShowForm((value) => !value)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white"><Plus size={18} />Nova meta</button></div>{showForm && <form onSubmit={createGoal} className="mt-6 grid gap-3 rounded-2xl border border-emerald-100 bg-emerald-50 p-4 md:grid-cols-[1.3fr_1fr_1fr_auto]"><input name="name" required placeholder="Ex.: Viagem de fim de ano" className="rounded-lg border border-emerald-100 bg-white px-3 py-2.5 text-sm outline-none" /><input name="target" required min="1" type="number" placeholder="Objetivo (R$)" className="rounded-lg border border-emerald-100 bg-white px-3 py-2.5 text-sm outline-none" /><input name="deadline" required placeholder="Prazo (ex.: Dezembro de 2026)" className="rounded-lg border border-emerald-100 bg-white px-3 py-2.5 text-sm outline-none" /><button className="rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white">Criar</button></form>}<div className="mt-7 grid gap-5 md:grid-cols-2 xl:grid-cols-3">{goals.map((goal) => <GoalCard key={goal.id} goal={goal} onContribute={() => setSelectedGoal(goal)} />)}</div>{selectedGoal && <div className="fixed inset-0 z-10 flex items-center justify-center bg-slate-950/40 p-4"><form onSubmit={contribute} className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600"><PiggyBank size={22} /></div><h2 className="mt-4 text-xl font-bold text-slate-950">Aportar em {selectedGoal.name}</h2><p className="mt-2 text-sm text-slate-500">Quanto você quer guardar hoje?</p><input autoFocus value={contribution} onChange={(event) => setContribution(event.target.value)} min="0.01" step="0.01" required type="number" placeholder="Valor em R$" className="mt-5 w-full rounded-xl border border-slate-200 px-3 py-3 outline-none ring-emerald-400 focus:ring-2" /><div className="mt-5 flex gap-3"><button type="button" onClick={() => setSelectedGoal(null)} className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700">Cancelar</button><button className="flex-1 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white">Guardar</button></div></form></div>}</div>
}

function GoalCard({ goal, onContribute }: { goal: Goal; onContribute: () => void }) {
  const progress = Math.round((goal.saved / goal.target) * 100)
  return <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-start justify-between"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-50 text-violet-600"><Target size={21} /></div><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">{progress}%</span></div><h2 className="mt-5 font-semibold text-slate-950">{goal.name}</h2><p className="mt-1 text-sm text-slate-500">Prazo: {goal.deadline}</p><div className="mt-5 flex items-end justify-between"><strong className="text-xl text-slate-950">{formatCurrency(goal.saved)}</strong><span className="text-sm text-slate-500">de {formatCurrency(goal.target)}</span></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-violet-600 transition-all" style={{ width: `${progress}%` }} /></div><button type="button" onClick={onContribute} className="mt-5 w-full rounded-xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800">Fazer aporte</button></section>
}
