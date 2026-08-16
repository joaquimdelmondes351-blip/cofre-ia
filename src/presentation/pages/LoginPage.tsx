import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { LogIn } from 'lucide-react'
import { loginSchema, LoginFormData } from '@shared/schemas/loginSchema'

/**
 * Formulário apenas estrutural — validação já conectada via Zod,
 * mas sem chamada real ao Firebase ainda (feature futura).
 */
export function LoginPage() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({ resolver: zodResolver(loginSchema) })

  const onSubmit = (data: LoginFormData) => {
    console.log('login submit (placeholder):', data)
  }

  return (
    <div className="max-w-sm mx-auto px-6 py-16">
      <h1 className="text-xl font-bold mb-6 flex items-center gap-2">
        <LogIn size={20} className="text-accent" />
        Entrar
      </h1>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-sm mb-1">E-mail</label>
          <input
            type="email"
            {...register('email')}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
        </div>

        <div>
          <label className="block text-sm mb-1">Senha</label>
          <input
            type="password"
            {...register('password')}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-primary text-white rounded-lg py-2 text-sm font-medium hover:bg-primary-light transition-colors"
        >
          Entrar
        </button>
      </form>
    </div>
  )
}
