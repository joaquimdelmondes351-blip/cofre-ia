import { FormEvent, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowDownRight, ArrowUpRight, BellRing, CreditCard, Landmark, Plus, Sparkles, Target, WalletCards } from 'lucide-react'
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { formatCurrency } from '@shared/utils/formatCurrency'
import { getCardBillsById } from '@shared/utils/cardBilling'
import { useCardsStore } from '@store/cardsStore'
import { Transaction, TransactionType, useFinanceStore } from '@store/financeStore'

const chartData = [
  { month: 'Mar', value: 4200 }, { month: 'Abr', value: 4750 }, { month: 'Mai', value: 4600 },
  { month: 'Jun', value: 5150 }, { month: 'Jul', value: 5310 }, { month: 'Ago', value: 5635 },
]

const categories = ['Alimentação', 'Moradia', 'Transporte', 'Saúde', 'Lazer', 'Serviços', 'Outros']
export function HomePage() {
  const transactions = useFinanceStore((state) => state.transactions)
  const cards = useCardsStore((state) => state.cards)
  const addStoredTransaction = useFinanceStore((state) => state.addTransaction)
  const [showForm, setShowForm] = useState(false)
  const [transactionType, setTransactionType] = useState<TransactionType>('expense')
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card'>('cash')
  const [selectedCardId, setSelectedCardId] = useState<string>('')
  const [cardSelectionError, setCardSelectionError] = useState('')
  const cardBills = useMemo(() => getCardBillsById(transactions, cards), [cards, transactions])
  const topCardUsage = useMemo(() => {
    const entries = cards
      .map((card) => ({ card, bill: cardBills.get(card.id) ?? 0 }))
      .filter(({ bill }) => bill > 0)
      .sort((left, right) => right.bill - left.bill)

    return entries[0] ?? null
  }, [cards, cardBills])
  const greeting = useMemo(() => {
    const hour = new Date().getHours()

    if (hour >= 5 && hour < 12) {
      return 'Bom dia'
    }

    if (hour >= 12 && hour < 18) {
      return 'Boa tarde'
    }

    return 'Boa noite'
  }, [])
  const summary = useMemo(() => {
    const income = transactions.filter((item) => item.type === 'income').reduce((sum, item) => sum + item.amount, 0)
    const expenses = transactions.filter((item) => item.type === 'expense').reduce((sum, item) => sum + item.amount, 0)
    return { income, expenses, balance: income - expenses }
  }, [transactions])

  function addTransaction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const name = String(form.get('name') ?? '').trim()
    const amount = Number(form.get('amount'))

    if (!name || !Number.isFinite(amount) || amount <= 0) {
      return
    }

    if (transactionType === 'expense' && paymentMethod === 'card') {
      if (!selectedCardId) {
        setCardSelectionError('Escolha um cartão antes de salvar a despesa.')
        return
      }

      addStoredTransaction({
        name,
        amount,
        type: transactionType,
        category: String(form.get('category') ?? 'Outros'),
        paymentMethod: 'card',
        cardId: selectedCardId,
      })

      event.currentTarget.reset()
      setPaymentMethod('cash')
      setSelectedCardId('')
      setCardSelectionError('')
      setShowForm(false)
      return
    }

    setCardSelectionError('')
    addStoredTransaction({
      name,
      amount,
      type: transactionType,
      category: String(form.get('category') ?? 'Outros'),
      paymentMethod: 'cash',
      cardId: null,
    })
    event.currentTarget.reset()
    setPaymentMethod('cash')
    setSelectedCardId('')
    setShowForm(false)
  }
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8"
    >
      <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="mb-1 text-sm font-medium text-emerald-600">Sexta-feira, 15 de agosto</p><h1 className="text-3xl font-bold tracking-tight text-slate-950">{greeting}, Joaquim</h1><p className="mt-1 text-slate-500">Seu dinheiro está organizado. Vamos olhar o que importa hoje?</p></div><button type="button" onClick={() => setShowForm((current) => !current)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"><Plus size={18} /> Adicionar movimentação</button></div>
      {showForm && <motion.form initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} onSubmit={addTransaction} className="mb-6 grid gap-3 overflow-hidden rounded-2xl border border-emerald-100 bg-emerald-50 p-4 md:grid-cols-[1.4fr_1fr_1fr_1fr_auto]"><input name="name" required placeholder="Ex.: Mercado" className="rounded-lg border border-emerald-100 bg-white px-3 py-2.5 text-sm outline-none ring-emerald-400 focus:ring-2" /><input name="amount" required min="0.01" step="0.01" type="number" placeholder="Valor (R$)" className="rounded-lg border border-emerald-100 bg-white px-3 py-2.5 text-sm outline-none ring-emerald-400 focus:ring-2" /><select name="category" className="rounded-lg border border-emerald-100 bg-white px-3 py-2.5 text-sm">{categories.map((category) => <option key={category}>{category}</option>)}</select><div className="flex rounded-lg border border-emerald-100 bg-white p-1 text-sm font-medium"><button type="button" onClick={() => setTransactionType('expense')} className={`flex-1 rounded-md px-2 ${transactionType === 'expense' ? 'bg-rose-50 text-rose-600' : 'text-slate-500'}`}>Despesa</button><button type="button" onClick={() => setTransactionType('income')} className={`flex-1 rounded-md px-2 ${transactionType === 'income' ? 'bg-emerald-50 text-emerald-700' : 'text-slate-500'}`}>Receita</button></div>{transactionType === 'expense' && <div className="space-y-2"><div className="flex gap-2 rounded-lg border border-emerald-100 bg-white p-1 text-sm font-medium"><select value={paymentMethod} onChange={(event) => { setPaymentMethod(event.target.value as 'cash' | 'card'); setCardSelectionError(''); }} className="flex-1 rounded-md bg-transparent px-2 outline-none"><option value="cash">Dinheiro/conta</option><option value="card">Cartão</option></select></div>{paymentMethod === 'card' && <div className="space-y-1"><label className="text-xs font-medium uppercase tracking-[0.14em] text-slate-600">Cartão</label><select value={selectedCardId} onChange={(event) => { setSelectedCardId(event.target.value); if (event.target.value) setCardSelectionError(''); }} className="w-full rounded-lg border border-emerald-200 bg-white px-3 py-2.5 text-sm outline-none ring-emerald-400 focus:ring-2" required><option value="">Selecione o cartão</option>{cards.map((card) => <option key={card.id} value={card.id}>{card.name}</option>)}</select>{cardSelectionError && <p className="text-xs text-amber-700">{cardSelectionError}</p>}</div>}{paymentMethod === 'card' && cards.length === 0 && <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">Cadastre um cartão antes de registrar uma despesa com cartão.</div>}</div>}{transactionType === 'income' && <div className="rounded-lg border border-emerald-200 bg-emerald-100 px-3 py-2 text-xs text-emerald-700">Receita em conta continua liberada normalmente.</div>}<button className="rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700">Salvar</button></motion.form>}
      <div className="grid gap-4 md:grid-cols-3"><MetricCard icon={<WalletCards size={20} />} label="Saldo disponível" value={formatCurrency(summary.balance)} note="Você está no controle" tone="dark" /><MetricCard icon={<ArrowUpRight size={20} />} label="Entradas no mês" value={formatCurrency(summary.income)} note="+ 12% em relação a julho" tone="green" /><MetricCard icon={<ArrowDownRight size={20} />} label="Saídas no mês" value={formatCurrency(summary.expenses)} note="Dentro do seu orçamento" tone="light" /></div>
      <section className="mt-6 grid gap-6 lg:grid-cols-[1.55fr_0.9fr]"><div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><div className="mb-5 flex items-start justify-between"><div><h2 className="font-semibold text-slate-950">Evolução do seu patrimônio</h2><p className="mt-1 text-sm text-slate-500">Você acumulou mais {formatCurrency(1435)} nos últimos 6 meses.</p></div><Landmark className="text-emerald-600" size={22} /></div><div className="h-64"><ResponsiveContainer width="100%" height="100%"><AreaChart data={chartData} margin={{ top: 8, right: 4, left: -15, bottom: 0 }}><defs><linearGradient id="saldo" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#10b981" stopOpacity={0.28} /><stop offset="100%" stopColor="#10b981" stopOpacity={0} /></linearGradient></defs><XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} /><YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} tickFormatter={(value) => `R$ ${value / 1000}k`} /><Tooltip formatter={(value: number) => formatCurrency(value)} contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0' }} /><Area type="monotone" dataKey="value" stroke="#10b981" strokeWidth={3} fill="url(#saldo)" /></AreaChart></ResponsiveContainer></div></div><div className="rounded-2xl bg-slate-950 p-5 text-white shadow-sm sm:p-6"><div className="flex items-center gap-2 text-emerald-400"><Sparkles size={18} /><span className="text-sm font-semibold">Insight do COFRE IA</span></div><h2 className="mt-4 text-xl font-semibold leading-snug">Você está perto de fortalecer sua reserva.</h2><p className="mt-3 text-sm leading-6 text-slate-300">Mantendo um aporte de {formatCurrency(480)} por mês, você chega a três meses de tranquilidade em aproximadamente 4 meses.</p><div className="mt-6 h-2 overflow-hidden rounded-full bg-slate-700"><div className="h-full w-[42%] rounded-full bg-emerald-400" /></div><div className="mt-2 flex justify-between text-xs text-slate-400"><span>Reserva atual</span><span>42% concluída</span></div></div></section>
      <section className="mt-6 grid gap-6 lg:grid-cols-[1.25fr_0.75fr]"><div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><div className="mb-4 flex items-center justify-between"><div><h2 className="font-semibold text-slate-950">Movimentações recentes</h2><p className="mt-1 text-sm text-slate-500">Acompanhe o que entrou e saiu.</p></div><button type="button" className="text-sm font-semibold text-emerald-700">Ver todas</button></div><div className="divide-y divide-slate-100">{transactions.slice(0, 6).map((transaction) => <TransactionRow key={transaction.id} transaction={transaction} />)}</div></div><div className="space-y-4">{topCardUsage && topCardUsage.bill > 0 && <div className="rounded-2xl border border-amber-100 bg-amber-50 p-5"><div className="flex gap-3"><BellRing className="mt-0.5 shrink-0 text-amber-600" size={20} /><div><h2 className="font-semibold text-amber-950">Atenção ao cartão</h2><p className="mt-1 text-sm leading-5 text-amber-900">Sua fatura já chegou a {Math.min(Math.round((topCardUsage.bill / topCardUsage.card.limit) * 100), 100)}% do limite. Até o fechamento, prefira pagar no débito.</p></div></div></div>}{!topCardUsage || topCardUsage.bill === 0 ? null : null}<div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center gap-2"><Target className="text-violet-600" size={20} /><h2 className="font-semibold text-slate-950">Seu próximo objetivo</h2></div><p className="mt-4 text-sm text-slate-500">Viagem de fim de ano</p><div className="mt-2 flex items-end justify-between"><strong className="text-xl text-slate-950">R$ 2.180</strong><span className="text-sm text-slate-500">de R$ 5.000</span></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full w-[44%] rounded-full bg-violet-600" /></div><p className="mt-3 text-xs font-medium text-violet-700">Faltam R$ 2.820 para chegar lá.</p></div></div></section>
    </motion.div>
  )
}

function MetricCard({ icon, label, value, note, tone }: { icon: React.ReactNode; label: string; value: string; note: string; tone: 'dark' | 'green' | 'light' }) {
  const styles = tone === 'dark' ? 'bg-slate-950 text-white border-slate-950' : tone === 'green' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-950 border-slate-200'
  const muted = tone === 'light' ? 'text-slate-500' : 'text-white/70'
  return <div className={`rounded-2xl border p-5 shadow-sm ${styles}`}><div className={`flex items-center justify-between ${muted}`}><span className="text-sm font-medium">{label}</span>{icon}</div><p className="mt-4 text-2xl font-bold tracking-tight">{value}</p><p className={`mt-2 text-xs ${muted}`}>{note}</p></div>
}

function TransactionRow({ transaction }: { transaction: Transaction }) {
  const income = transaction.type === 'income'
  return <div className="flex items-center gap-3 py-3"><div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${income ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-500'}`}>{income ? <ArrowUpRight size={18} /> : <CreditCard size={18} />}</div><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-slate-800">{transaction.name}</p><p className="text-xs text-slate-500">{transaction.category} · {transaction.date}</p></div><strong className={`text-sm ${income ? 'text-emerald-600' : 'text-slate-800'}`}>{income ? '+' : '-'} {formatCurrency(transaction.amount)}</strong></div>
}
