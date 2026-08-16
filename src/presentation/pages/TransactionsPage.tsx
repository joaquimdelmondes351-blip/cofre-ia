import { ArrowDownRight, ArrowUpRight, Search, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { formatCurrency } from '@shared/utils/formatCurrency'
import { useFinanceStore } from '@store/financeStore'

export function TransactionsPage() {
  const transactions = useFinanceStore((state) => state.transactions)
  const removeTransaction = useFinanceStore((state) => state.removeTransaction)
  const [filter, setFilter] = useState('')
  const visibleTransactions = useMemo(() => transactions.filter((transaction) => transaction.name.toLocaleLowerCase().includes(filter.toLocaleLowerCase()) || transaction.category.toLocaleLowerCase().includes(filter.toLocaleLowerCase())), [filter, transactions])
  const totalIncome = transactions.filter((item) => item.type === 'income').reduce((sum, item) => sum + item.amount, 0)
  const totalExpense = transactions.filter((item) => item.type === 'expense').reduce((sum, item) => sum + item.amount, 0)
  return <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8"><p className="text-sm font-medium text-emerald-600">CONTROLE FINANCEIRO</p><h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">Movimentações</h1><p className="mt-2 text-slate-500">Cada lançamento deixa sua visão financeira mais inteligente.</p><div className="mt-7 grid gap-4 sm:grid-cols-2"><Summary label="Receitas registradas" value={totalIncome} green /><Summary label="Despesas registradas" value={totalExpense} /></div><section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div><h2 className="font-semibold text-slate-950">Histórico</h2><p className="mt-1 text-sm text-slate-500">{visibleTransactions.length} movimentações encontradas</p></div><label className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-slate-400 sm:w-64"><Search size={17} /><input value={filter} onChange={(event) => setFilter(event.target.value)} placeholder="Buscar por nome ou categoria" className="w-full text-sm text-slate-700 outline-none" /></label></div><div className="mt-5 divide-y divide-slate-100">{visibleTransactions.map((transaction) => { const income = transaction.type === 'income'; return <div key={transaction.id} className="flex items-center gap-3 py-4"><div className={`flex h-10 w-10 items-center justify-center rounded-full ${income ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-500'}`}>{income ? <ArrowUpRight size={18} /> : <ArrowDownRight size={18} />}</div><div className="min-w-0 flex-1"><p className="font-semibold text-slate-800">{transaction.name}</p><p className="text-xs text-slate-500">{transaction.category} · {transaction.date}</p></div><strong className={income ? 'text-emerald-600' : 'text-slate-800'}>{income ? '+' : '-'} {formatCurrency(transaction.amount)}</strong><button type="button" onClick={() => removeTransaction(transaction.id)} aria-label={`Excluir ${transaction.name}`} className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-500"><Trash2 size={17} /></button></div>})}</div></section></div>
}

function Summary({ label, value, green = false }: { label: string; value: number; green?: boolean }) {
  return <div className={`rounded-2xl border p-5 shadow-sm ${green ? 'border-emerald-100 bg-emerald-50' : 'border-slate-200 bg-white'}`}><p className="text-sm text-slate-500">{label}</p><p className={`mt-2 text-2xl font-bold ${green ? 'text-emerald-700' : 'text-slate-950'}`}>{formatCurrency(value)}</p></div>
}
