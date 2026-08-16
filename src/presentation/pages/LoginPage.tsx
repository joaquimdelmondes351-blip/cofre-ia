import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { LogIn } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { AuthRepository } from '@core/data/repositories/AuthRepository'
import { useAuthStore } from '@store/authStore'
import { loginSchema, LoginFormData } from '@shared/schemas/loginSchema'

const authRepository = new AuthRepository()

export function LoginPage() {
  const [isSignUp, setIsSignUp] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const navigate = useNavigate()
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({ resolver: zodResolver(loginSchema) })

  const onSubmit = async (data: LoginFormData) => {
    try {
      setSubmitError('')
      const user = isSignUp ? await authRepository.signup(data.email, data.password) : await authRepository.login(data.email, data.password)
      useAuthStore.getState().setUser(user)
      navigate('/')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível concluir esta ação.'
      setSubmitError(message)
    }
  }

  return (
    <div className="mx-auto max-w-sm px-6 py-16">
      <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-2 text-lg font-bold text-slate-950">
          <LogIn size={20} className="text-emerald-600" />
          {isSignUp ? 'Criar conta' : 'Entrar'}
        </div>
        <div className="mt-3 flex rounded-xl bg-slate-100 p-1 text-sm">
          <button
            type="button"
            onClick={() => setIsSignUp(false)}
            className={`flex-1 rounded-lg px-3 py-2 font-medium transition ${!isSignUp ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500'}`}
          >
            Login
          </button>
          <button
            type="button"
            onClick={() => setIsSignUp(true)}
            className={`flex-1 rounded-lg px-3 py-2 font-medium transition ${isSignUp ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500'}`}
          >
            Cadastrar
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">E-mail</label>
          <input
            type="email"
            {...register('email')}
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none ring-emerald-400 transition focus:border-emerald-400 focus:ring-2"
            placeholder="seu@email.com"
          />
          {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Senha</label>
          <input
            type="password"
            {...register('password')}
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none ring-emerald-400 transition focus:border-emerald-400 focus:ring-2"
            placeholder="Mínimo 6 caracteres"
          />
          {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>}
        </div>

        {submitError && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">{submitError}</p>}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSubmitting ? 'Processando...' : isSignUp ? 'Criar conta' : 'Entrar'}
        </button>
      </form>
    </div>
  )
}
