/** Marca do HiAdv: um monograma de duas barras unidas (as duas partes de um processo) e o nome. */
export function Marca({ compacta = false }: { compacta?: boolean }) {
  return (
    <span className="marca">
      <svg className="marca-sinal" width="30" height="30" viewBox="0 0 32 32" aria-hidden="true">
        <rect width="32" height="32" rx="8" fill="var(--brand-mark)" />
        <path d="M10 8v16M22 8v16M10 16h12" stroke="var(--brand-mark-ink)" strokeWidth="2.6" strokeLinecap="round" />
        <circle cx="16" cy="16" r="2.4" fill="var(--brand-dot)" />
      </svg>
      {!compacta && <span className="marca-nome">HiAdv</span>}
    </span>
  )
}
