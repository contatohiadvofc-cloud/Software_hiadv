import { useId, useState, type InputHTMLAttributes } from 'react'

type Props = InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string; error?: string }

export function Field({ label, hint, error, id, type, ...rest }: Props) {
  const auto = useId()
  const campo = id ?? `f${auto}`
  const ids = [hint && `${campo}-dica`, error && `${campo}-erro`].filter(Boolean).join(' ') || undefined
  const senha = type === 'password'
  const [ver, setVer] = useState(false)
  const input = <input {...rest} type={senha && ver ? 'text' : type} id={campo} className="hv-input" aria-describedby={ids} aria-invalid={error ? 'true' : undefined}
    {...(senha && ver ? { autoCapitalize: 'off', autoCorrect: 'off', spellCheck: false } : {})} />
  return (
    <div className="hv-field">
      <label htmlFor={campo}>{label}</label>
      {senha ? (
        <div className="hv-senha">
          {input}
          <button type="button" className="hv-senha-ver" aria-controls={campo} aria-pressed={ver}
            aria-label={ver ? `Ocultar ${label.toLowerCase()}` : `Mostrar ${label.toLowerCase()}`} onClick={() => setVer((v) => !v)}>
            {ver ? 'Ocultar' : 'Mostrar'}
          </button>
        </div>
      ) : input}
      {hint && <span id={`${campo}-dica`} className="hv-hint">{hint}</span>}
      {error && <span id={`${campo}-erro`} className="hv-error" role="alert">{error}</span>}
    </div>
  )
}
