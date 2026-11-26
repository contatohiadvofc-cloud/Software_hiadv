/** Esqueleto de carregamento: mostra o formato do que vem (como Linear/Notion) em vez de só um texto.
 *  O texto continua para leitores de tela. */
export function Carregando({ texto = 'Carregando…', linhas = 3, painel = false, avatar = false }: { texto?: string; linhas?: number; painel?: boolean; avatar?: boolean }) {
  return (
    <div className={painel ? 'hv-esq hv-panel-body' : 'hv-esq'} role="status" aria-live="polite">
      <span className="sr-only">{texto}</span>
      {Array.from({ length: linhas }, (_, i) => (
        <div key={i} className="hv-esq-linha" aria-hidden="true">
          {avatar && <i className="hv-esq-av" />}
          <span><i style={{ width: `${62 - (i % 3) * 14}%` }} /><i style={{ width: `${38 + (i % 2) * 18}%` }} /></span>
        </div>
      ))}
    </div>
  )
}
