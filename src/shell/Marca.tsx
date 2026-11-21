/** Marca do HiAdv: o H em que a perna direita vira um "i" (Hi), com o ponto rosé, e o nome. */
export function Marca({ compacta = false }: { compacta?: boolean }) {
  return (
    <span className="marca">
      <svg className="marca-sinal" width="30" height="30" viewBox="0 0 32 32" aria-hidden="true">
        <rect width="32" height="32" rx="8" fill="var(--brand-mark)" />
        <path d="M10 7.5v17M22 13.5v11M10 16h12" stroke="var(--brand-mark-ink)" strokeWidth="3" strokeLinecap="round" fill="none" />
        <circle cx="22" cy="8" r="2.1" fill="var(--brand-dot)" />
      </svg>
      {!compacta && <span className="marca-nome">HiAdv</span>}
    </span>
  )
}
