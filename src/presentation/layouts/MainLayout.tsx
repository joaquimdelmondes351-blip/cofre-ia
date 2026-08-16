import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { Bell, ChartNoAxesCombined, CircleHelp, CreditCard, LayoutDashboard, LogOut, ShieldCheck, Target, WalletCards } from 'lucide-react'
import { AuthRepository } from '@core/data/repositories/AuthRepository'
import { useAuth } from '@presentation/hooks/useAuth'

const navigation = [
  { label: 'Visão geral', icon: LayoutDashboard, to: '/' },
  { label: 'Movimentações', icon: WalletCards, to: '/movimentacoes' },
  { label: 'Cartões', icon: CreditCard, to: '/cartoes' },
  { label: 'Metas', icon: Target, to: '/metas' },
  { label: 'Análises', icon: ChartNoAxesCombined, to: '/analises' },
]

const authRepository = new AuthRepository()

export function MainLayout() {
  const navigate = useNavigate()
  const { user, isAuthenticated } = useAuth()

  const handleLogout = async () => {
    await authRepository.logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-slate-50 lg:grid lg:grid-cols-[252px_1fr]">
      <aside className="hidden border-r border-slate-800 bg-slate-950 p-5 text-slate-300 lg:flex lg:flex-col">
        <div className="flex items-center gap-2 px-2 text-white"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-400 text-slate-950"><ShieldCheck size={21} /></div><span className="font-bold tracking-tight">COFRE IA</span></div>
        <p className="mt-2 px-2 text-xs leading-5 text-slate-500">Inteligência para o seu dinheiro.</p>
        <nav className="mt-9 space-y-1">{navigation.map(({ label, icon: Icon, to }) => <NavLink key={label} to={to} end={to === '/'} className={({ isActive }) => `flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition ${isActive ? 'bg-emerald-400 text-slate-950' : 'hover:bg-slate-800 hover:text-white'}`}><Icon size={18} />{label}</NavLink>)}</nav>
        <div className="mt-auto rounded-2xl border border-slate-800 bg-slate-900 p-4"><p className="text-xs font-medium text-slate-500">SEU MOMENTO</p><p className="mt-2 text-sm font-semibold text-white">Você está construindo estabilidade.</p><div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-700"><div className="h-full w-[68%] rounded-full bg-emerald-400" /></div><p className="mt-2 text-xs text-slate-400">68% do mês concluído</p></div>
      </aside>
      <div className="min-w-0"><header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-6 lg:px-8"><div className="flex items-center gap-2 lg:hidden"><ShieldCheck className="text-emerald-600" size={21} /><span className="font-bold text-slate-950">COFRE IA</span></div><div className="hidden text-sm text-slate-500 lg:block">Sua central financeira pessoal</div><div className="flex items-center gap-3"><button type="button" aria-label="Notificações" className="relative rounded-lg p-2 text-slate-500 transition hover:bg-slate-100"><Bell size={20} /><span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-white" /></button>{isAuthenticated ? <button type="button" onClick={handleLogout} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"><LogOut size={16} />Sair</button> : <button type="button" onClick={() => navigate('/login')} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100">Entrar</button>}<div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-950 text-sm font-bold text-white">{user?.name?.charAt(0)?.toUpperCase() ?? 'U'}</div></div></header><main><Outlet /></main><footer className="px-6 pb-6 text-center text-xs text-slate-400 lg:hidden"><CircleHelp className="mr-1 inline" size={13} />Seu dinheiro, com mais clareza.</footer></div>
    </div>
  )
}
