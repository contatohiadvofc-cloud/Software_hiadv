/** Marca do HiAdv: a pasta ouro com o "Hi" dentro, seguida de "Adv". */
export function Marca({ compacta = false }: { compacta?: boolean }) {
  return (
    <span className="marca" role="img" aria-label="HiAdv">
      <span className="marca-pasta" aria-hidden="true">Hi</span>
      {!compacta && <span className="marca-nome" aria-hidden="true">Adv</span>}
    </span>
  )
}
