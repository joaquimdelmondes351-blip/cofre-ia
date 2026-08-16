export type Status = 'idle' | 'loading' | 'success' | 'error'

export interface ApiError {
  message: string
  code?: string
}
