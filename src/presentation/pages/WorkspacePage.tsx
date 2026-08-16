import { AlertTriangle, BarChart3, CheckCircle2, CreditCard, Lightbulb, MessageSquareText, Plus, Sparkles, Target, TrendingDown, TrendingUp, WalletCards } from 'lucide-react'
import { FormEvent, useMemo, useState } from 'react'
import { getAuth } from 'firebase/auth'
import { formatCurrency } from '@shared/utils/formatCurrency'
import { useFinanceStore } from '@store/financeStore'

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

const aiConfig = {
  configured: false,
  backendKeyName: 'OPENAI_API_KEY',
  preparationMessage: 'Assistente em preparação. A IA será ativada assim que a conexão segura for concluída.',
}

export function WorkspacePage({ title, description, icon }: WorkspacePageProps) {
  const content = pageContent[icon]
  const Icon = content.icon
  const transactions = useFinanceStore((state) => state.transactions)
  const [question, setQuestion] = useState('')
  const [assistantResponse, setAssistantResponse] = useState('')

  const insights = useMemo(() => {
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const monthTransactions = transactions.filter((transaction) => {
      const dateValue = new Date(transaction.dateValue)
      return !Number.isNaN(dateValue.getTime()) && dateValue >= monthStart
    })

    const entries = monthTransactions.filter((item) => item.type === 'income').reduce((sum, item) => sum + item.amount, 0)
    const expenses = monthTransactions.filter((item) => item.type === 'expense').reduce((sum, item) => sum + item.amount, 0)
    const balance = entries - expenses

    const categoryTotals = monthTransactions.reduce<Record<string, number>>((accumulator, item) => {
      if (item.type !== 'expense') {
        return accumulator
      }

      accumulator[item.category] = (accumulator[item.category] ?? 0) + item.amount
      return accumulator
    }, {})

    const topCategory = Object.entries(categoryTotals).sort((left, right) => right[1] - left[1])[0]

    const alerts = [] as Array<{ title: string; description: string; tone: 'amber' | 'rose' | 'emerald' | 'slate' }>

    if (!monthTransactions.length) {
      alerts.push({
        title: 'Sem movimentações neste mês',
        description: 'Ainda não há dados para analisar. Registre as suas entradas e saídas para receber relatórios mais úteis.',
        tone: 'slate',
      })
    }

    if (topCategory && topCategory[1] > 0) {
      const [category, value] = topCategory
      alerts.push({
        title: `Gasto alto em ${category}`,
        description: `Você já registrou ${formatCurrency(value)} em ${category}. Revise se esse padrão está alinhado com o mês.` ,
        tone: 'amber',
      })
    }

    if (expenses > entries) {
      alerts.push({
        title: 'Despesas acima das receitas',
        description: 'Neste mês, as saídas superaram as entradas. Avalie quais categorias podem ser ajustadas para proteger o saldo.',
        tone: 'rose',
      })
    }

    if (balance > 0) {
      alerts.push({
        title: 'Saldo positivo',
        description: 'Sua carteira está estável neste mês. A melhor estratégia agora é separar uma reserva para imprevistos.',
        tone: 'emerald',
      })
    }

    const suggestions = [] as string[]

    if (!monthTransactions.length) {
      suggestions.push('Comece com dois registros simples: salário e o maior gasto do mês. Isso já permitirá ver padrões no painel.')
    }

    if (topCategory && topCategory[1] > 0) {
      suggestions.push(`Considere limitar gastos em ${topCategory[0]} e tentar reduzir em 10% para melhorar o fluxo do mês.`)
    }

    if (expenses > entries) {
      suggestions.push('Priorize despesas fixas e reduza compras impulsivas até equilibrar o fluxo de caixa.')
    }

    if (balance > 0) {
      suggestions.push('Reserve uma parte do saldo para emergência e outra para metas de curto prazo.')
    }

    if (!suggestions.length) {
      suggestions.push('Continue registrando movimentações com consistência para gerar recomendações mais precisas no próximo mês.')
    }

    return {
      entries,
      expenses,
      balance,
      topCategory: topCategory ? { name: topCategory[0], total: topCategory[1] } : null,
      alerts,
      suggestions,
    }
  }, [transactions])

  const handleQuestionSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!question.trim()) {
      return
    }

    if (!aiConfig.configured) {
      setAssistantResponse(aiConfig.preparationMessage)
      return
    }

    try {
      const firebaseAuth = getAuth()
      const token = firebaseAuth.currentUser ? await firebaseAuth.currentUser.getIdToken() : null

      if (!token) {
        setAssistantResponse(aiConfig.preparationMessage)
        return
      }

      const response = await fetch('/api/finance-assistant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          question,
          context: {
            entries: insights.entries,
            expenses: insights.expenses,
            balance: insights.balance,
            topCategory: insights.topCategory,
          },
        }),
      })

      const payload = await response.json() as { message?: string; answer?: string }

      if (!response.ok) {
        setAssistantResponse(payload.message ?? aiConfig.preparationMessage)
        return
      }

      setAssistantResponse(payload.answer ?? aiConfig.preparationMessage)
    } catch {
      setAssistantResponse(aiConfig.preparationMessage)
    }
  }

  const categoryColor = insights.topCategory ? 'text-slate-900' : 'text-slate-500'

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <p className="text-sm font-medium text-emerald-600">COFRE IA</p>
      <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">{title}</h1>
      <p className="mt-2 text-slate-500">{description}</p>

      <section className="mt-8 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 bg-slate-50 px-5 py-5 sm:px-7">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600"><Icon size={24} /></div>
          <h2 className="mt-5 text-2xl font-bold text-slate-950">Análise financeira inteligente</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Resumo mensal, alertas e sugestões com base no comportamento real do usuário logado.</p>
        </div>

        <div className="grid gap-4 p-5 sm:grid-cols-2 xl:grid-cols-4 sm:p-7">
          <MetricCard icon={<TrendingUp className="text-emerald-600" size={18} />} label="Entradas" value={formatCurrency(insights.entries)} tone="green" />
          <MetricCard icon={<TrendingDown className="text-rose-500" size={18} />} label="Saídas" value={formatCurrency(insights.expenses)} tone="rose" />
          <MetricCard icon={<WalletCards className="text-slate-700" size={18} />} label="Saldo" value={formatCurrency(insights.balance)} tone="dark" />
          <MetricCard icon={<BarChart3 className="text-violet-600" size={18} />} label="Maior gasto" value={insights.topCategory ? insights.topCategory.name : 'Sem dados'} tone="violet" />
        </div>
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600"><AlertTriangle size={18} /></div>
            <div>
              <h3 className="text-lg font-semibold text-slate-950">Alertas do mês</h3>
              <p className="text-sm text-slate-500">Fatores que exigem atenção</p>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {insights.alerts.map((alert, index) => (
              <div key={`${alert.title}-${index}`} className={`rounded-2xl border p-4 ${alert.tone === 'amber' ? 'border-amber-200 bg-amber-50' : alert.tone === 'rose' ? 'border-rose-200 bg-rose-50' : alert.tone === 'emerald' ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-slate-50'}`}>
                <p className="font-semibold text-slate-900">{alert.title}</p>
                <p className="mt-1 text-sm leading-6 text-slate-600">{alert.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600"><Lightbulb size={18} /></div>
            <div>
              <h3 className="text-lg font-semibold text-slate-950">Sugestões práticas</h3>
              <p className="text-sm text-slate-500">Baseadas nos dados reais</p>
            </div>
          </div>

          <ul className="mt-5 space-y-3">
            {insights.suggestions.map((suggestion, index) => (
              <li key={`${suggestion}-${index}`} className="flex gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-600" />
                <span>{suggestion}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600"><MessageSquareText size={18} /></div>
          <div>
            <h3 className="text-lg font-semibold text-slate-950">Pergunte à IA financeira</h3>
            <p className="text-sm text-slate-500">Faça perguntas como “onde estou gastando mais?”</p>
          </div>
        </div>

        <form onSubmit={handleQuestionSubmit} className="mt-5 space-y-4">
          <textarea
            value={question}
            maxLength={250}
            onChange={(event) => setQuestion(event.target.value)}
            rows={4}
            placeholder="Ex.: Onde estou gastando mais? O que posso melhorar no meu orçamento?"
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none ring-emerald-400 transition placeholder:text-slate-400 focus:ring-2"
          />

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-slate-500">Variável futura esperada no backend: {aiConfig.backendKeyName}. O valor real nunca será exposto no código.</p>
            <button type="submit" className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800">
              <Sparkles size={16} /> Perguntar à IA
            </button>
          </div>
        </form>

        {assistantResponse && (
          <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-800">
            {assistantResponse}
          </div>
        )}
      </section>

      <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-emerald-600">Visão resumida</p>
            <h3 className="mt-1 text-xl font-bold text-slate-950">Patamar do mês</h3>
          </div>
          <button type="button" className="inline-flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">
            <Plus size={16} /> Ver detalhes
          </button>
        </div>

        <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm text-slate-500">Categoria com maior gasto</p>
          <p className={`mt-2 text-2xl font-bold ${categoryColor}`}>
            {insights.topCategory ? `${insights.topCategory.name} · ${formatCurrency(insights.topCategory.total)}` : 'Ainda não há dados'}
          </p>
        </div>
      </section>

      <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600"><MessageSquareText size={18} /></div>
          <div>
            <h3 className="text-lg font-semibold text-slate-950">Atendimento pelo WhatsApp</h3>
            <p className="text-sm text-slate-500">Ativação futura com conta oficial do WhatsApp Business e número comercial.</p>
          </div>
        </div>

        <p className="mt-4 text-sm leading-6 text-slate-600">
          Este canal será ativado quando houver uma conta oficial do WhatsApp Business e um número comercial validado. Enquanto isso, o atendimento não será disparado e nenhuma mensagem será enviada automaticamente.
        </p>
      </section>
    </div>
  )
}

function MetricCard({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: string; tone: 'green' | 'rose' | 'dark' | 'violet' }) {
  const styleClass = tone === 'green' ? 'border-emerald-100 bg-emerald-50' : tone === 'rose' ? 'border-rose-100 bg-rose-50' : tone === 'violet' ? 'border-violet-100 bg-violet-50' : 'border-slate-200 bg-slate-50'
  const textClass = tone === 'dark' ? 'text-slate-900' : tone === 'violet' ? 'text-violet-700' : tone === 'rose' ? 'text-rose-700' : 'text-emerald-700'

  return (
    <div className={`rounded-2xl border p-4 ${styleClass}`}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-slate-500">{label}</p>
        {icon}
      </div>
      <p className={`mt-4 text-2xl font-bold tracking-tight ${textClass}`}>{value}</p>
    </div>
  )
}
