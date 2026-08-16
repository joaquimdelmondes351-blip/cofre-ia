import { FormEvent, useState } from 'react'
import { CreditCard, Plus } from 'lucide-react'
import { formatCurrency } from '@shared/utils/formatCurrency'

type Card = { id: number; name: string; limit: number; bill: number; closing: string }

export function CardsPage() {
  const [cards, setCards] = useState<Card[]>([{ id: 1, name: 'Cartão principal', limit: 3500, bill: 2380, closing: '22 de agosto' }])
  const [showForm, setShowForm] = useState(false)
  function addCard(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const name = String(form.get('name') ?? '').trim()
    const limit = Number(form.get('limit'))
    const closing = String(form.get('closing') ?? '').trim()
    if (!name || !limit || !closing) return
    setCards((current) => [...current, { id: Date.now(), name, limit, closing, bill: 0 }])
    setShowForm(false)
  }
  return <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-sm font-medium text-emerald-600">CONTROLE DE CRÉDITO</p><h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">Cartões</h1><p className="mt-2 text-slate-500">Acompanhe os limites antes que a fatura surpreenda.</p></div><button type="button" onClick={() => setShowForm((value) => !value)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white"><Plus size={18} />Adicionar cartão</button></div>{showForm && <form onSubmit={addCard} className="mt-6 grid gap-3 rounded-2xl border border-emerald-100 bg-emerald-50 p-4 md:grid-cols-[1fr_1fr_1fr_auto]"><input name="name" required placeholder="Nome do cartão" className="rounded-lg border border-emerald-100 bg-white px-3 py-2.5 text-sm outline-none" /><input name="limit" required min="1" type="number" placeholder="Limite (R$)" className="rounded-lg border border-emerald-100 bg-white px-3 py-2.5 text-sm outline-none" /><input name="closing" required placeholder="Fechamento (ex.: dia 22)" className="rounded-lg border border-emerald-100 bg-white px-3 py-2.5 text-sm outline-none" /><button className="rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white">Salvar</button></form>}<div className="mt-7 grid gap-5 md:grid-cols-2 xl:grid-cols-3">{cards.map((card) => <CardItem key={card.id} card={card} />)}</div></div>
}

function CardItem({ card }: { card: Card }) {
  const percentage = Math.round((card.bill / card.limit) * 100)
  const alert = percentage >= 70
  return <section className="overflow-hidden rounded-2xl bg-slate-950 p-5 text-white shadow-sm"><div className="flex items-center justify-between"><CreditCard className="text-emerald-400" size={24} /><span className="text-xs text-slate-400">Fecha em {card.closing}</span></div><h2 className="mt-9 text-lg font-semibold">{card.name}</h2><p className="mt-1 text-sm text-slate-400">Fatura atual</p><strong className="mt-1 block text-2xl">{formatCurrency(card.bill)}</strong><div className="mt-6 flex justify-between text-xs text-slate-400"><span>{percentage}% usado</span><span>Limite {formatCurrency(card.limit)}</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-700"><div className={`h-full rounded-full ${alert ? 'bg-amber-400' : 'bg-emerald-400'}`} style={{ width: `${percentage}%` }} /></div>{alert && <p className="mt-4 text-xs leading-5 text-amber-300">Atenção: seu cartão já passou de 70% do limite.</p>}</section>
}
