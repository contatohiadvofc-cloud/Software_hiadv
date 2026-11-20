import { useState } from 'react'
import { Button } from '../design/components/Button'
import { Field } from '../design/components/Field'
import { Badge } from '../design/components/Badge'
import { Panel } from '../design/components/Panel'
import { Empty } from '../design/components/Empty'
import { ErrorState } from '../design/components/ErrorState'
import { Dialog } from '../design/components/Dialog'
import { Kbd } from '../design/components/Kbd'
import { useToast } from '../design/components/Toast'
import { Marca } from '../shell/Marca'
import { aplicarTema } from '../shell/MenuConta'

const CORES = ['--bg', '--surface', '--surface-2', '--line', '--ink', '--ink-2', '--accent', '--accent-soft', '--info', '--success', '--warning', '--danger', '--t-prazo', '--t-audiencia', '--t-pericia', '--t-tarefa']

/** Catálogo do design system: todas as peças, nos dois temas, para aprovação. Dados fictícios. */
export function Catalogo() {
  const [dlg, setDlg] = useState(false)
  const toast = useToast()
  return (
    <div className="catalogo">
      <header className="catalogo-topo">
        <Marca />
        <h1>Design system do HiAdv</h1>
        <div className="catalogo-acoes">
          <Button variant="secondary" size="sm" onClick={() => aplicarTema('light')}>Tema claro</Button>
          <Button variant="secondary" size="sm" onClick={() => aplicarTema('dark')}>Tema escuro</Button>
        </div>
      </header>

      <Panel title="Tipografia" labelId="c-tipo">
        <div className="hv-panel-body catalogo-pilha">
          <h1>Título de página · 28</h1>
          <h2>Título de bloco · 17</h2>
          <p>Texto corrido · 15. O HiAdv usa uma só família (IBM Plex Sans) para tudo, em quatro pesos.</p>
          <p className="muted">Texto de apoio · 15, tom secundário.</p>
          <p style={{ fontSize: 'var(--fs-sm)' }}>Rótulo · 13 · <Kbd>Ctrl K</Kbd></p>
        </div>
      </Panel>

      <Panel title="Cores" labelId="c-cores">
        <div className="hv-panel-body catalogo-cores">
          {CORES.map((c) => (
            <div key={c} className="catalogo-cor"><span style={{ background: `var(${c})` }} /><code>{c}</code></div>
          ))}
        </div>
      </Panel>

      <Panel title="Botões e selos" labelId="c-btn">
        <div className="hv-panel-body catalogo-linha">
          <Button>Salvar</Button>
          <Button variant="secondary">Cancelar</Button>
          <Button variant="ghost">Ver mais</Button>
          <Button variant="danger">Excluir</Button>
          <Button loading>Salvando</Button>
          <Button size="sm">Pequeno</Button>
        </div>
        <div className="hv-panel-body catalogo-linha">
          <Badge>Neutro</Badge><Badge tone="info">Em análise</Badge><Badge tone="success">Protocolado</Badge>
          <Badge tone="warning">Aguardando cliente</Badge><Badge tone="danger">Atrasado</Badge>
        </div>
      </Panel>

      <Panel title="Campos" labelId="c-campos">
        <div className="hv-panel-body catalogo-grade">
          <Field label="Nome do cliente" placeholder="Ex.: Rita Moura" />
          <Field label="CPF" hint="Só números." placeholder="000.000.000-00" />
          <Field label="E-mail" defaultValue="rita@" error="Informe um e-mail válido." />
        </div>
      </Panel>

      <Panel title="Lista do dia" labelId="c-lista">
        <h3 className="hv-group-title"><span>Hoje</span><span>2</span></h3>
        <ul className="seu-dia-lista">
          <li className="hv-row"><span className="tipo"><span className="hv-dot" style={{ background: 'var(--t-pericia)' }} />Perícia</span><span className="texto"><span className="titulo">Perícia médica</span><span className="sub">Previdenciário · Rita Moura</span></span><span className="quando">09:30</span><span className="quem">Ana</span></li>
          <li className="hv-row"><span className="tipo"><span className="hv-dot" style={{ background: 'var(--t-prazo)' }} />Prazo</span><span className="texto"><span className="titulo">Contestação</span><span className="sub">Trabalhista · Bruno Teixeira x Metalúrgica Alfa</span></span><span className="quando" data-urgente="true">Venceu ontem</span><span className="quem">Rafael</span></li>
        </ul>
      </Panel>

      <div className="catalogo-grade">
        <Panel title="Estado vazio" labelId="c-vazio"><Empty title="Nada pendente para hoje." action={<Button variant="secondary" size="sm">Criar tarefa</Button>} /></Panel>
        <Panel title="Estado de erro" labelId="c-erro"><ErrorState onRetry={() => toast('Tentando de novo…')} /></Panel>
      </div>

      <Panel title="Diálogo e aviso" labelId="c-dlg">
        <div className="hv-panel-body catalogo-linha">
          <Button variant="secondary" onClick={() => setDlg(true)}>Abrir diálogo</Button>
          <Button variant="secondary" onClick={() => toast('Tarefa criada.')}>Mostrar aviso</Button>
          <Button variant="secondary" onClick={() => toast('Não foi possível salvar.', 'danger')}>Aviso de erro</Button>
        </div>
      </Panel>
      <Dialog open={dlg} onOpenChange={setDlg} title="Mover caso de etapa">
        <div className="hv-dialog-body catalogo-pilha">
          <p>O caso de Rita Moura vai de “Documentos” para “Protocolo”. A passagem de bastão avisa o Jurídico.</p>
          <div className="catalogo-linha"><Button onClick={() => setDlg(false)}>Mover</Button><Button variant="ghost" onClick={() => setDlg(false)}>Cancelar</Button></div>
        </div>
      </Dialog>
    </div>
  )
}
