/** Marca do HiAdv (Identidade D · Pasta): a pasta ouro com "Hi" dentro e "Adv" ao lado, alinhados pela base.
 *  Proporções da arte original (corpo 160×120, aba 74×22). O tamanho vem de --marca-h (altura do corpo). */
export function Marca({ compacta = false, tamanho }: { compacta?: boolean; tamanho?: number }) {
  return (
    <span className="marca" role="img" aria-label="HiAdv" style={tamanho ? ({ '--marca-h': `${tamanho}px` } as React.CSSProperties) : undefined}>
      <span className="marca-pasta" aria-hidden="true"><i /><b>Hi</b></span>
      {!compacta && <span className="marca-nome" aria-hidden="true">Adv</span>}
    </span>
  )
}
