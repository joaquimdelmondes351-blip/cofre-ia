import { ButtonHTMLAttributes } from 'react'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement>

export function Button({ className = '', children, ...props }: ButtonProps) {
  return (
    <button
      className={`bg-primary text-white rounded-lg py-2 px-4 text-sm font-medium hover:bg-primary-light transition-colors disabled:opacity-50 ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
