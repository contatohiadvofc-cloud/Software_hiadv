import { useMemo, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useSessao } from '../lib/contexto'
import { MANUAL_CODER, MANUAL_IMPLANTACAO, type SecaoManual } from '../data/manualCoder'
import { Panel } from '../design/components/Panel'
import { Empty } from '../design/components/Empty'

type Aba = 'coder' | 'implantacao'
const ABAS: [Aba, string][] = [['coder', 'Manual do Coder'], ['implantacao', 'Implantação em 6 semanas']]
const texto = (s: SecaoManual) => [s.titulo, ...s.itens.flatMap((i) => (typeof i === 'string' ? [i] : [i.t, ...i.sub]))].join(' ').toLowerCase()

/** Manuais internos (só o papel code): para revisar o sistema e conduzir implantações. */
export function ManualCoder() {
  const { perfil } = useSessao()
  const [aba, setAba] = useState<Aba>('coder')
  const [busca, setBusca] = useState('')
  const [feitos, setFeitos] = useState<Record<string, boolean>>(() => { try { return JSON.parse(localStorage.getItem('hiadv-impl-feitos') ?? '{}') } catch { return {} } })
  const secoes = aba === 'coder' ? MANUAL_CODER : MANUAL_IMPLANTACAO
  const filtradas = useMemo(() => { const b = busca.trim().toLowerCase(); return b ? secoes.filter((s) => texto(s).includes(b)) : secoes }, [secoes, busca])
  const marcar = (k: string, v: boolean) => { const n = { ...feitos, [k]: v }; setFeitos(n); try { localStorage.setItem('hiadv-impl-feitos', JSON.stringify(n)) } catch { /* sem armazenamento */ } }
  if (perfil && !perfil.code) return <div className="pagina"><Panel><Empty title="Esta tela é da administração do HiAdv." /></Panel></div>
  return (
    <div className="pagina">
      <div className="pagina-cabeca"><div><h1>Manuais do Coder</h1><p className="muted">Para relembrar o sistema e conduzir implantações. Não aparece para o público nem para os escritórios.</p></div>
        <Link to="/central" className="hv-btn" data-variant="secondary">Voltar à Central</Link></div>
      <div className="segmentos" role="group" aria-label="Escolher manual">
        {ABAS.map(([a, n]) => <button key={a} type="button" aria-pressed={aba === a} onClick={() => setAba(a)}>{n}</button>)}
      </div>
      <input className="hv-input mc-busca" type="search" aria-label="Buscar no manual" placeholder="Buscar no manual" value={busca} onChange={(e) => setBusca(e.target.value)} />
      {filtradas.length === 0 && <Panel><Empty title="Nada encontrado com essa busca." /></Panel>}
      {filtradas.map((s) => (
        <Panel key={s.id} title={s.titulo}>
          <ul className="mc-lista">{s.itens.map((i, n) => {
            const chave = `${s.id}:${n}`
            if (typeof i !== 'string') return <li key={n}><strong>{i.t}</strong><ul>{i.sub.map((x) => <li key={x}>{x}</li>)}</ul></li>
            return <li key={n}>{aba === 'implantacao'
              ? <label className="mc-check"><input type="checkbox" checked={!!feitos[chave]} onChange={(e) => marcar(chave, e.target.checked)} /><span>{i}</span></label>
              : i}</li>
          })}</ul>
        </Panel>
      ))}
    </div>
  )
}
