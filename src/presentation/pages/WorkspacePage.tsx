import { BarChart3, CreditCard, Plus, Target, WalletCards } from 'lucide-react'

type WorkspacePageProps = {
  title: string
  description: string
  icon: 'transactions' | 'cards' | 'goals' | 'analytics'
}

const pageContent = {
  transactions: { icon: WalletCards, heading: 'Organize cada movimento', helper: 'Registre entradas e saídas para entender para onde seu dinheiro está indo.', action: 'Adicionar movimentação' },
  cards: { icon: CreditCard, heading: 'Tenha controle antes da fatura', helper: 'Cadastre seus cartões e acompanhe limites, fechamentos e gastos.', action: 'Adicionar cartão' },
  goals: { icon: Target, heading: 'Dê um propósito ao seu dinheiro', helper: 'Crie metas e acompanhe a evolução da sua reserva, viagem ou grande compra.', action: 'Criar objetivo' },
  analytics: { icon: BarChart3, heading: 'Entenda seus padrões financeiros', helper: 'Com mais movimentações, o COFRE IA mostrará comparações e recomendações personalizadas.', action: 'Ver insights' },
} as const

export function WorkspacePage({ title, description, icon }: WorkspacePageProps) {
  const content = pageContent[icon]
  const Icon = content.icon
  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <p className="text-sm font-medium text-emerald-600">COFRE IA</p>
      <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">{title}</h1>
      <p className="mt-2 text-slate-500">{description}</p>
      <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm sm:p-12">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600"><Icon size={28} /></div>
        <h2 className="mt-6 text-2xl font-bold text-slate-950">{content.heading}</h2>
        <p className="mt-3 max-w-xl leading-7 text-slate-500">{content.helper}</p>
        <button type="button" className="mt-7 inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"><Plus size={17} />{content.action}</button>
      </section>
    </div>
  )
}
