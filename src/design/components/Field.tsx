import { useId, type InputHTMLAttributes } from 'react'

type Props = InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string; error?: string }

export function Field({ label, hint, error, id, ...rest }: Props) {
  const auto = useId()
  const campo = id ?? `f${auto}`
  const ids = [hint && `${campo}-dica`, error && `${campo}-erro`].filter(Boolean).join(' ') || undefined
  return (
    <div className="hv-field">
      <label htmlFor={campo}>{label}</label>
      <input {...rest} id={campo} className="hv-input" aria-describedby={ids} aria-invalid={error ? 'true' : undefined} />
      {hint && <span id={`${campo}-dica`} className="hv-hint">{hint}</span>}
      {error && <span id={`${campo}-erro`} className="hv-error" role="alert">{error}</span>}
    </div>
  )
}
