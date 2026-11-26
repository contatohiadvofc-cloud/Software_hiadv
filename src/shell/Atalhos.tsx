import { Dialog } from '../design/components/Dialog'
import { Kbd } from '../design/components/Kbd'

/** "G" seguido de uma letra leva à tela (como no Gmail). */
export const IR_PARA: Record<string, { rota: string; nome: string }> = {
  d: { rota: '/seu-dia', nome: 'Seu dia' },
  t: { rota: '/tarefas', nome: 'Tarefas' },
  c: { rota: '/conversas', nome: 'Conversas' },
  a: { rota: '/agenda', nome: 'Agenda' },
  l: { rota: '/clientes', nome: 'Clientes' },
  f: { rota: '/financeiro', nome: 'Financeiro' },
  r: { rota: '/relatorios', nome: 'Relatórios' },
}

const GERAIS: [string[], string][] = [
  [['Ctrl', 'K'], 'Buscar cliente, caso, processo ou CPF'],
  [['/'], 'Buscar (atalho rápido)'],
  [['F'], 'Modo foco, na tela Seu dia'],
  [['?'], 'Mostrar esta lista'],
  [['Esc'], 'Fechar janela ou sair do foco'],
]

export function Atalhos({ aoFechar }: { aoFechar: () => void }) {
  return (
    <Dialog open onOpenChange={(v) => { if (!v) aoFechar() }} title="Atalhos de teclado">
      <div className="hv-dialog-body atalhos">
        <h3>Gerais</h3>
        <dl>{GERAIS.map(([teclas, o]) => <div key={o}><dt>{teclas.map((t, i) => <span key={t}>{i > 0 && ' + '}<Kbd>{t}</Kbd></span>)}</dt><dd>{o}</dd></div>)}</dl>
        <h3>Ir para</h3>
        <dl>{Object.entries(IR_PARA).map(([k, v]) => <div key={k}><dt><Kbd>G</Kbd> depois <Kbd>{k.toUpperCase()}</Kbd></dt><dd>{v.nome}</dd></div>)}</dl>
      </div>
    </Dialog>
  )
}
