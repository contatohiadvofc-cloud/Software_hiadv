import type { ButtonHTMLAttributes } from 'react'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'md' | 'sm'
  loading?: boolean
}

export function Button({ variant = 'primary', size = 'md', loading = false, disabled, children, type = 'button', ...rest }: Props) {
  return (
    <button {...rest} type={type} className={['hv-btn', rest.className].filter(Boolean).join(' ')}
      data-variant={variant} data-size={size} disabled={disabled || loading} aria-busy={loading ? 'true' : undefined}>
      {loading && <span className="hv-spin" aria-hidden="true" />}
      {children}
    </button>
  )
}
