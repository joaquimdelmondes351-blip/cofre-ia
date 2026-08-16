import { FormEvent, useMemo, useState } from 'react'
import { CreditCard, Plus } from 'lucide-react'
import { formatCurrency } from '@shared/utils/formatCurrency'
import { Card, useCardsStore } from '@store/cardsStore'
import { useFinanceStore } from '@store/financeStore'

export function CardsPage() {
  const cards = useCardsStore((state) => state.cards)
  const loading = useCardsStore((state) => state.loading)
  const addCard = useCardsStore((state) => state.addCard)
  const transactions = useFinanceStore((state) => state.transactions)
  const [showForm, setShowForm] = useState(false)

  const cardBills = useMemo(() => {
    const billMap = new Map<string, number>()

    transactions.forEach((transaction) => {
      if (transaction.type !== 'expense' || !transaction.cardId) {
        return
      }

      billMap.set(transaction.cardId, (billMap.get(transaction.cardId) ?? 0) + transaction.amount)
    })

    return billMap
  }, [transactions])

  async function handleAddCard(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const name = String(form.get('name') ?? '').trim()
    const limit = Number(form.get('limit'))
    const closing = String(form.get('closing') ?? '').trim()

    if (!name || !limit || !closing) {
      return
    }

    await addCard({ name, limit, bill: 0, closing })
    setShowForm(false)
    event.currentTarget.reset()
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-medium text-emerald-600">CONTROLE DE CRÉDITO</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">Cartões</h1>
          <p className="mt-2 text-slate-500">Acompanhe os limites antes que a fatura surpreenda.</p>
        </div>
        <button type="button" onClick={() => setShowForm((value) => !value)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white"><Plus size={18} />Adicionar cartão</button>
      </div>

      {showForm && (
        <form onSubmit={handleAddCard} className="mt-6 grid gap-3 rounded-2xl border border-emerald-100 bg-emerald-50 p-4 md:grid-cols-[1fr_1fr_1fr_auto]">
          <input name="name" required placeholder="Nome do cartão" className="rounded-lg border border-emerald-100 bg-white px-3 py-2.5 text-sm outline-none" />
          <input name="limit" required min="1" type="number" placeholder="Limite (R$)" className="rounded-lg border border-emerald-100 bg-white px-3 py-2.5 text-sm outline-none" />
          <input name="closing" required placeholder="Fechamento (ex.: dia 22)" className="rounded-lg border border-emerald-100 bg-white px-3 py-2.5 text-sm outline-none" />
          <button className="rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white">Salvar</button>
        </form>
      )}

      {loading ? (
        <div className="mt-7 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">Carregando cartões...</div>
      ) : cards.length === 0 ? (
        <div className="mt-7 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">Nenhum cartão cadastrado ainda.</div>
      ) : (
        <div className="mt-7 grid gap-5 md:grid-cols-2 xl:grid-cols-3">{cards.map((card) => <CardItem key={card.id} card={card} bill={cardBills.get(card.id) ?? 0} />)}</div>
      )}
    </div>
  )
}

function CardItem({ card, bill }: { card: Card; bill: number }) {
  const percentage = card.limit > 0 ? Math.min(Math.round((bill / card.limit) * 100), 100) : 0
  const available = Math.max(card.limit - bill, 0)
  const closingInfo = getClosingInfo(card.closing)
  const isWarning = percentage >= 70 && percentage < 90
  const isCritical = percentage >= 90
  const isClosingSoon = Boolean(closingInfo?.isClosingSoon)

  const progressBarColor = isCritical ? 'bg-rose-400' : isWarning ? 'bg-amber-400' : 'bg-emerald-400'
  const statusText = isCritical ? 'Uso crítico do limite' : isWarning ? 'Uso elevado do limite' : 'Dentro do limite'

  return (
    <section className="overflow-hidden rounded-2xl bg-slate-950 p-5 text-white shadow-sm ring-1 ring-slate-800">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CreditCard className="text-emerald-400" size={24} />
          <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-emerald-300">Cartão</span>
        </div>
        <span className="text-xs text-slate-400">{closingInfo ? `Fecha em ${closingInfo.day}` : `Fechamento ${card.closing}`}</span>
      </div>

      <h2 className="mt-8 text-lg font-semibold text-white">{card.name}</h2>

      <div className="mt-6 grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-slate-900/80 p-3">
          <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">Limite</p>
          <strong className="mt-2 block text-base font-semibold text-white">{formatCurrency(card.limit)}</strong>
        </div>
        <div className="rounded-xl bg-slate-900/80 p-3">
          <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">Disponível</p>
          <strong className="mt-2 block text-base font-semibold text-emerald-300">{formatCurrency(available)}</strong>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-slate-800 bg-slate-900/60 p-3">
        <div className="flex items-center justify-between text-xs text-slate-300">
          <span>Fatura atual</span>
          <span>{percentage}% usado</span>
        </div>
        <strong className="mt-2 block text-2xl font-semibold text-white">{formatCurrency(bill)}</strong>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-700">
          <div className={`h-full rounded-full ${progressBarColor}`} style={{ width: `${Math.min(percentage, 100)}%` }} />
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-2 rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-2 text-xs">
        <span className={isCritical ? 'text-rose-300' : isWarning ? 'text-amber-300' : 'text-emerald-300'}>{statusText}</span>
        <span className="text-slate-400">{closingInfo && closingInfo.diffDays !== null ? `Fechamento ${closingInfo.label}` : card.closing}</span>
      </div>

      {isWarning && (
        <p className="mt-3 text-xs leading-5 text-amber-300">Atenção: você já usou 70% do limite do cartão.</p>
      )}

      {isCritical && (
        <p className="mt-3 text-xs leading-5 text-rose-300">Alerta: você está em 90% ou mais do limite e precisa controlar o gasto.</p>
      )}

      {isClosingSoon && (
        <p className="mt-3 text-xs leading-5 text-sky-300">Fechamento próximo: a fatura vence em poucos dias.</p>
      )}
    </section>
  )
}

function getClosingInfo(closing: string) {
  const match = closing.trim().match(/(\d{1,2})/)

  if (!match) {
    return null
  }

  const dayNumber = Number(match[1])

  if (!Number.isInteger(dayNumber) || dayNumber < 1 || dayNumber > 31) {
    return null
  }

  const today = new Date()
  const currentYear = today.getFullYear()
  const currentMonth = today.getMonth()
  const targetDate = new Date(currentYear, currentMonth, dayNumber)

  let diffDays = Math.ceil((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

  if (diffDays < 0) {
    const nextMonthDate = new Date(currentYear, currentMonth + 1, dayNumber)
    diffDays = Math.ceil((nextMonthDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  }

  const isClosingSoon = diffDays >= 0 && diffDays <= 5

  return {
    day: dayNumber,
    diffDays,
    isClosingSoon,
    label: diffDays === 0 ? 'hoje' : diffDays === 1 ? 'amanhã' : `em ${diffDays} dias`,
  }
}
