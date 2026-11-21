import { useEffect, useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useApi, useSessao } from '../lib/contexto'
import { telefoneTela } from '../data/clientes'
import { Button } from '../design/components/Button'
import { Field } from '../design/components/Field'
import { useToast } from '../design/components/Toast'

/** Dados de contato do escritório (só Gestor Master). O WhatsApp aparece no link de acompanhamento do cliente. */
export function ContatoEscritorio() {
  const api = useApi()
  const qc = useQueryClient()
  const toast = useToast()
  const { perfil } = useSessao()
  const q = useQuery({ queryKey: ['contato', perfil?.escritorioId], queryFn: () => api.contatoEscritorio(), enabled: !!perfil })
  const [cidade, setCidade] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  useEffect(() => { if (q.data) { setCidade(q.data.cidade ?? ''); setWhatsapp(q.data.whatsapp ? telefoneTela(q.data.whatsapp) : '') } }, [q.data])
  const salvar = useMutation({
    mutationFn: () => api.salvarContatoEscritorio(cidade, whatsapp),
    onSuccess: () => { toast('Contato do escritório salvo.'); setErro(null); qc.invalidateQueries({ queryKey: ['contato'] }) },
    onError: (e) => setErro((e as Error).message),
  })
  return (
    <form className="hv-panel-body ficha-form" onSubmit={(e: FormEvent) => { e.preventDefault(); salvar.mutate() }} noValidate>
      <p className="muted">O WhatsApp do escritório aparece para o cliente na página de acompanhamento, no botão “Falar com o escritório”.</p>
      <div className="ficha-campos">
        <Field label="WhatsApp do escritório" inputMode="tel" maxLength={20} placeholder="(49) 99999-0000" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} />
        <Field label="Cidade" maxLength={80} value={cidade} onChange={(e) => setCidade(e.target.value)} />
      </div>
      {erro && <p className="hv-error" role="alert">{erro}</p>}
      <div><Button type="submit" size="sm" loading={salvar.isPending}>Salvar contato</Button></div>
    </form>
  )
}

/** Agenda no Google (ou no celular): um link pessoal que o Google Agenda assina. Atualiza sozinho, sem login no Google. */
export function AgendaNoGoogle() {
  const api = useApi()
  const qc = useQueryClient()
  const toast = useToast()
  const { perfil } = useSessao()
  const existe = useQuery({ queryKey: ['agenda-link', perfil?.email], queryFn: () => api.agendaLinkExiste(), enabled: !!perfil })
  const [link, setLink] = useState<string | null>(null)
  const gerar = useMutation({
    mutationFn: () => api.agendaLinkGerar(),
    onSuccess: (l) => { setLink(l); qc.invalidateQueries({ queryKey: ['agenda-link'] }) },
    onError: (e) => toast((e as Error).message),
  })
  async function copiar() {
    try { await navigator.clipboard.writeText(link!); toast('Link copiado. Agora cole no Google Agenda.') } catch { toast('Não deu para copiar. Selecione o link e copie.') }
  }
  return (
    <div className="hv-panel-body catalogo-pilha">
      <p className="muted">Seus prazos, perícias e audiências aparecem na agenda do Google (e no celular), com lembrete. O Google atualiza sozinho, em algumas horas. Mudanças feitas no Google não voltam para o HiAdv.</p>
      {link ? <>
        <div className="hv-field">
          <label htmlFor="agenda-link">Seu link de agenda (pessoal)</label>
          <input id="agenda-link" className="hv-input" readOnly value={link} onFocus={(e) => e.target.select()} />
        </div>
        <div className="catalogo-linha">
          <Button size="sm" onClick={copiar}>Copiar link</Button>
          <a className="hv-btn" data-variant="secondary" data-size="sm" href="https://calendar.google.com/calendar/u/0/r/settings/addbyurl" target="_blank" rel="noopener noreferrer">Abrir o Google Agenda</a>
        </div>
        <ol className="passos">
          <li>No Google Agenda (computador), em “Outras agendas”, clique em “+” e depois em “Do URL”.</li>
          <li>Cole o link e clique em “Adicionar agenda”.</li>
          <li>No celular, a agenda aparece sozinha no app Google Agenda. No iPhone: Ajustes, Calendário, Contas, Adicionar conta, Outra, Assinatura de calendário.</li>
        </ol>
        <p className="hv-hint">Não compartilhe este link: quem tiver o link vê os seus compromissos. Se vazar, gere um novo (o antigo para de funcionar).</p>
      </> : (
        <div className="catalogo-linha">
          <Button size="sm" variant="secondary" loading={gerar.isPending} onClick={() => gerar.mutate()}>{existe.data ? 'Gerar link novo (o anterior para de funcionar)' : 'Ligar agenda no Google'}</Button>
        </div>
      )}
    </div>
  )
}
