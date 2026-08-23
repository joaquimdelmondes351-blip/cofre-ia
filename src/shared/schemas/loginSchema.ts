import { z } from 'zod'

export const loginSchema = z.object({
  name: z.string().trim().min(2, 'Informe seu nome completo').optional(),
  email: z.string().email('E-mail inválido'),
  password: z.string().min(6, 'A senha deve ter no mínimo 6 caracteres'),
})

export type LoginFormData = z.infer<typeof loginSchema>
