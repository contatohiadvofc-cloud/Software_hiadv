import { useState } from 'react'
import { useEscritorios } from '../data/consultas'
import { useSessao } from '../lib/contexto'
import { useToast } from '../design/components/Toast'

/** Mostra o escritório em uso. Para o papel Code, permite trocar entre escritórios. */
export function OfficeSwitcher() {
  const sessao = useSessao()
  const lista = useEscritorios()
  const toast = useToast()
  const [trocando, setTrocando] = useState(false)
  const nome = sessao.perfil?.escritorioNome || 'Escritório'

  if (sessao.perfil?.papel !== 'code' || !lista.data || lista.data.length < 2) {
    return <div className="escritorio"><span className="escritorio-rotulo">Escritório</span><span className="escritorio-nome">{nome}</span></div>
  }
  return (
    <label className="escritorio">
      <span className="escritorio-rotulo">Escritório em uso</span>
      <select className="escritorio-select" value={sessao.perfil.escritorioId ?? ''} disabled={trocando}
        onChange={async (e) => {
          setTrocando(true)
          try { await sessao.trocarEscritorio(e.target.value); toast('Escritório trocado.') }
          catch (x) { toast((x as Error).message, 'danger') }
          finally { setTrocando(false) }
        }}>
        {lista.data.map((o) => <option key={o.id} value={o.id}>{o.nome}</option>)}
      </select>
    </label>
  )
}
