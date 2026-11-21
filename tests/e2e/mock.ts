import type { Page, Route } from '@playwright/test'

/** Supabase simulado para os testes de tela: só dados fictícios. */
export type Cenario = {
  senha?: string
  papel?: string
  areas?: Array<{ area: string; nome: string; ordem: number }> | 'sem-funcao'
  publicacoes?: Array<Record<string, unknown> & { publicacao: boolean }>
  oabs?: string[]
  lancamentos?: Array<Record<string, unknown>>
  documento?: Record<string, unknown>
  honorarios?: Array<Record<string, unknown>>
  escritorios?: Array<{ id: string; nome: string; atual: boolean }>
  areasPorEscritorio?: Record<string, Array<{ area: string; nome: string; ordem: number }>>
  tarefas?: Array<Record<string, unknown>>
  falharSeuDia?: number // quantas vezes a lista de tarefas responde 500 antes de funcionar
  expirarEm?: string // nome da RPC que responde 401
  busca?: Array<Record<string, unknown>>
  etapas?: Array<Record<string, unknown>>
  casos?: Array<Record<string, unknown>>
  recusarMover?: boolean
  detalhe?: Record<string, unknown>
  camposArea?: Array<Record<string, unknown>>
  recusarCampos?: string
  camposCasos?: Array<{ id: string; campos: Record<string, unknown> }>
  clientes?: Array<Record<string, unknown>>
  casosCliente?: Array<Record<string, unknown>>
  processos?: Array<Record<string, unknown>>
  pericias?: Array<Record<string, unknown>>
  audienciasLista?: Array<Record<string, unknown>>
  biblioteca?: Array<Record<string, unknown>>
  integracoes?: Array<Record<string, unknown>>
  agentes?: Array<Record<string, unknown>>
  recusarAgente?: string
  atencao?: Array<Record<string, unknown>>
  regras?: Record<string, unknown>
  duplicados?: Array<Record<string, unknown>>
  carga?: Array<Record<string, unknown>>
  falhas?: Array<Record<string, unknown>>
  /** login da equipe: 'primeiro_acesso' simula quem ainda não criou a senha pessoal */
  loginEquipe?: 'ok' | 'primeiro_acesso' | 'bloqueado' | 'fora'
  pacotes?: Array<Record<string, unknown>>
}

function b64url(o: object) {
  return Buffer.from(JSON.stringify(o)).toString('base64').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_')
}
const TOKEN = `${b64url({ alg: 'HS256', typ: 'JWT' })}.${b64url({ sub: 'u1', email: 'ana@silvaprado.exemplo.br', role: 'authenticated', exp: 4102444800 })}.assinatura`
const USER = { id: 'u1', aud: 'authenticated', role: 'authenticated', email: 'ana@silvaprado.exemplo.br', app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' }

export async function simularSupabase(page: Page, c: Cenario = {}) {
  const estado = { funcao: [] as Array<Record<string, unknown>>, senhaCriada: false, atual: c.escritorios?.find((e) => e.atual)?.id ?? 'esc-1', falhas: c.falharSeuDia ?? 0, chamadasBusca: 0, movidos: [] as Array<Record<string, unknown>>, salvos: [] as Array<Record<string, unknown>>, tarefasMudadas: [] as Array<Record<string, unknown>>, tarefasCriadas: [] as Array<Record<string, unknown>>, beneficios: [] as Array<Record<string, unknown>>, gates: [] as Array<Record<string, unknown>>, rpcs: [] as Array<{ nome: string; corpo: Record<string, unknown> }>, uploads: [] as string[] }
  const feitas = new Set<string>()
  const json = (r: Route, corpo: unknown, status = 200) => r.fulfill({ status, contentType: 'application/json', body: JSON.stringify(corpo) })

  await page.route('**/*.supabase.co/**', async (r) => {
    const req = r.request()
    const url = new URL(req.url())
    const p = url.pathname
    if (p.endsWith('/auth/v1/token')) {
      const corpo = req.postDataJSON() as { password?: string }
      if (corpo.password !== (c.senha ?? 'certa')) return json(r, { code: 400, error_code: 'invalid_credentials', msg: 'Invalid login credentials' }, 400)
      return json(r, { access_token: TOKEN, token_type: 'bearer', expires_in: 3600, expires_at: 4102444800, refresh_token: 'r1', user: USER })
    }
    if (p.endsWith('/functions/v1/Consutar_processos')) {
      const b = (req.postDataJSON() ?? {}) as Record<string, unknown>
      estado.funcao.push(b)
      if (c.loginEquipe === 'fora') return json(r, { erro: 'fora' }, 503)
      if (b.equipeEntrar) {
        if (c.loginEquipe === 'primeiro_acesso' && !estado.senhaCriada) return json(r, { ok: false, motivo: 'primeiro_acesso' })
        if (c.loginEquipe === 'bloqueado') return json(r, { ok: false, motivo: 'bloqueado' })
        return json(r, b.senha === (c.senha ?? 'certa') ? { ok: true } : { ok: false, motivo: 'senha', restam: 4 })
      }
      if (b.equipeNovaSenha) {
        if (b.mestra !== 'mestra-ficticia') return json(r, { ok: false, motivo: 'mestra', restam: 4 })
        estado.senhaCriada = true; c.senha = String(b.nova); return json(r, { ok: true })
      }
      return json(r, { ok: false, motivo: 'indisponivel' })
    }
    if (p.endsWith('/auth/v1/user')) return json(r, USER)
    if (p.endsWith('/auth/v1/logout')) return r.fulfill({ status: 204 })
    if (p.includes('/rpc/')) {
      const nome = p.split('/rpc/')[1]
      if (c.expirarEm === nome) return json(r, { code: 'PGRST301', message: 'JWT expired' }, 401)
      if (nome === 'minhas_areas') {
        if (c.areas === 'sem-funcao') return json(r, { code: 'PGRST202', message: 'Could not find the function public.minhas_areas' }, 404)
        return json(r, c.areasPorEscritorio?.[estado.atual] ?? c.areas ?? [{ area: 'trabalhista', nome: 'Trabalhista', ordem: 10 }])
      }
      if (nome === 'hiadv_escritorios_disponiveis') return json(r, (c.escritorios ?? []).map((e) => ({ ...e, atual: e.id === estado.atual })))
      if (nome === 'hiadv_trocar_escritorio') { estado.atual = (req.postDataJSON() as { p_escritorio: string }).p_escritorio; return json(r, { ok: true }) }
      if (nome === 'busca_geral') { estado.chamadasBusca++; return json(r, c.busca ?? []) }
      if (nome === 'pericias_lista') return json(r, c.pericias ?? [])
      if (nome === 'audiencias_lista') return json(r, c.audienciasLista ?? [])
      if (nome === 'casos_quadro') return json(r, c.casos ?? [])
      if (nome === 'caso_status') {
        if (c.recusarMover) return json(r, { code: 'P0001', message: 'Só o jurídico move nesta etapa.' }, 400)
        estado.movidos.push(req.postDataJSON() as Record<string, unknown>); return json(r, { ok: true })
      }
      if (nome === 'tarefa_atualizar') {
        const v = req.postDataJSON() as { p_id: string; p_status: string }
        estado.tarefasMudadas.push(v); if (v.p_status === 'feita') feitas.add(v.p_id); else feitas.delete(v.p_id)
        return json(r, { ok: true })
      }
      if (nome === 'tarefa_criar') { estado.tarefasCriadas.push(req.postDataJSON() as Record<string, unknown>); return json(r, { id: 'novo' }) }
      const registrar = () => { const corpo = (req.postDataJSON() ?? {}) as Record<string, unknown>; estado.rpcs.push({ nome, corpo }); return corpo }
      if (nome === 'caso_relato_salvar') { registrar(); return json(r, { ok: true, alterado: true }) }
      if (nome === 'caso_protocolar') { registrar(); return json(r, { ok: true }) }
      if (nome === 'caso_exigencia') { const b = registrar(); return json(r, { ok: true, tarefa: 't-ex', interno: '2026-11-27', fatal: b.p_prazo_fatal, status: null }) }
      if (nome === 'caso_mudar_via') { registrar(); return json(r, { ok: true, id: 'k1-novo' }) }
      if (nome === 'biblioteca_salvar') { registrar(); return json(r, { ok: true, id: 'novo' }) }
      if (nome === 'biblioteca_retirar') { registrar(); return json(r, { ok: true }) }
      if (nome === 'integracoes_listar') return json(r, c.integracoes ?? [])
      if (nome === 'integracao_salvar') { registrar(); return json(r, { ok: true }) }
      if (nome === 'integracao_chave_salvar') { const b = registrar(); return json(r, { ok: true, chave_final: String(b.p_chave).slice(-4) }) }
      if (nome === 'integracao_chave_remover') { registrar(); return json(r, { ok: true }) }
      if (nome === 'agentes_listar') return json(r, c.agentes ?? [])
      if (nome === 'atencao_listar') return json(r, c.atencao ?? [])
      if (nome === 'pacotes_listar') return json(r, c.pacotes ?? [])
      if (nome === 'pacote_adicionar') { registrar(); return json(r, { ok: true, adicionados: 14 }) }
      if (nome === 'duplicidades_listar') return json(r, c.duplicados ?? [])
      if (nome === 'duplicidade_ignorar') { registrar(); return json(r, { ok: true }) }
      if (nome === 'carga_equipe') return json(r, c.carga ?? [])
      if (nome === 'falhas_listar') return json(r, c.falhas ?? [])
      if (nome === 'falha_resolver') { registrar(); return json(r, { ok: true }) }
      if (nome === 'preparo_criar') { registrar(); return json(r, { ok: true, ja: false, tarefa: 't-prep', prazo: '2026-11-23' }) }
      if (nome === 'regras_obter') return json(r, c.regras ?? { parado_dias: 10, preparo_dias: 5, fatal_alerta_dias: 2, parado_ignorar: [] })
      if (nome === 'regras_salvar') { const b = registrar(); return json(r, (b as { p: object }).p) }
      if (nome === 'agente_configurar') { registrar(); return json(r, c.recusarAgente ? { ok: false, erro: c.recusarAgente } : { ok: true }) }
      if (nome === 'caso_beneficio_salvar') { const v = req.postDataJSON() as { p: object }; estado.beneficios.push(v); return json(r, { ok: true, alterados: Object.keys(v.p).length }) }
      if (nome === 'caso_gate') { estado.gates.push(req.postDataJSON() as Record<string, unknown>); return json(r, { ok: true }) }
      if (nome === 'hiadv_documento_dados') { registrar(); return json(r, c.documento ?? { cliente: { nome: 'Bruno Teixeira', cpf: '52998224725' }, caso: null, escritorio: { nome: 'Silva & Prado', cidade: 'Joinville/SC', oabs: [] }, advogado: { nome: 'Ana Prado', oab: 'OAB/SC 00.101' } }) }
      if (nome === 'hiadv_cliente_dados_salvar') { registrar(); return json(r, { ok: true }) }
      if (nome === 'hiadv_fin_lista') { registrar(); return json(r, c.lancamentos ?? []) }
      if (nome === 'hiadv_fin_baixar' || nome === 'hiadv_fin_lancar' || nome === 'hiadv_honorario_criar') { registrar(); return json(r, { ok: true, id: 'novo' }) }
      if (nome === 'hiadv_honorario_exito') { const b = registrar() as { p_valor_recebido: number }; return json(r, { ok: true, valor: Math.round(b.p_valor_recebido * 30) / 100 }) }
      if (nome === 'hiadv_honorarios_cliente') { registrar(); return json(r, c.honorarios ?? []) }
      if (nome === 'hiadv_publicacoes') { const b = registrar() as { p_so_publicacoes: boolean }; return json(r, (c.publicacoes ?? []).filter((x) => !b.p_so_publicacoes || x.publicacao)) }
      if (nome === 'hiadv_oabs') return json(r, { oabs: c.oabs ?? [], da_equipe: [] })
      if (nome === 'hiadv_oabs_salvar') { const b = registrar() as { p_oabs: string[] }; c.oabs = b.p_oabs; return json(r, { ok: true, oabs: b.p_oabs }) }
      if (nome === 'hiadv_prazo') { registrar(); return json(r, { ok: true, publicacao: '2026-11-23', fim: '2026-12-15', cobertura_ate: '2028-01-20', pulados: [{ dia: '2026-12-08', nome: 'Dia da Justiça' }] }) }
      if (nome === 'area_ativar') {
        const b = registrar() as { p_area: string; p_ativa: boolean }
        const lista = (c.areas && c.areas !== 'sem-funcao' ? c.areas : (c.areas = [{ area: 'trabalhista', nome: 'Trabalhista', ordem: 10 }])) as Array<{ area: string; nome: string; ordem: number }>
        const i = lista.findIndex((a) => a.area === b.p_area)
        const nomes: Record<string, string> = { civel: 'Cível', bancario: 'Bancário', penal: 'Penal', trabalhista: 'Trabalhista' }
        if (b.p_ativa && i < 0) lista.push({ area: b.p_area, nome: nomes[b.p_area] ?? b.p_area, ordem: 99 })
        if (!b.p_ativa && i >= 0) lista.splice(i, 1)
        return json(r, { ok: true })
      }
      if (nome === 'hiadv_cliente_criar') { const b = registrar() as { p: { cpf?: string } }; return json(r, { ok: true, id: b.p.cpf === '529.982.247-25' ? 'c1' : 'c-novo', ja: b.p.cpf === '529.982.247-25' }) }
      if (nome === 'hiadv_caso_criar') { registrar(); return json(r, { ok: true, id: 'k-novo' }) }
      if (nome === 'hiadv_clientes_importar') {
        const b = registrar() as { p_itens: Array<{ nome: string }>; p_simular: boolean }
        const linhas = b.p_itens.map((x, i) => ({ linha: i + 1, nome: x.nome, resultado: x.nome.length < 2 ? 'erro' : 'novo', motivo: x.nome.length < 2 ? 'Nome em branco ou curto demais.' : null }))
        const erros = linhas.filter((l) => l.resultado === 'erro').length
        return json(r, { ok: true, simulado: b.p_simular, novos: linhas.length - erros, existentes: 0, erros, linhas })
      }
      if (nome === 'caso_detalhe') return json(r, c.detalhe ?? null)
      if (nome === 'caso_campos_salvar') {
        const corpo = req.postDataJSON() as Record<string, unknown>
        if (c.recusarCampos) return json(r, { ok: false, erro: c.recusarCampos })
        estado.salvos.push(corpo); return json(r, { ok: true, alterados: Object.keys(corpo.p_campos as object).length })
      }
      return json(r, null)
    }
    if (p.endsWith('/rest/v1/equipe') && !(req.headers()['accept'] ?? '').includes('vnd.pgrst.object') && url.searchParams.get('select')?.includes('email')) {
      return json(r, [{ email: 'ana@silvaprado.exemplo.br', nome: 'Ana Prado' }, { email: 'rafael@silvaprado.exemplo.br', nome: 'Rafael Souza' }])
    }
    if (p.endsWith('/rest/v1/equipe')) {
      const linha = { nome: 'Ana Prado', papel: c.papel ?? 'master', escritorio_id: estado.atual }
      return json(r, (req.headers()['accept'] ?? '').includes('vnd.pgrst.object') ? linha : [linha])
    }
    if (p.endsWith('/rest/v1/escritorios')) {
      const nome = c.escritorios?.find((e) => e.id === estado.atual)?.nome ?? 'Silva & Prado Advocacia'
      return json(r, (req.headers()['accept'] ?? '').includes('vnd.pgrst.object') ? { nome } : [{ nome }])
    }
    if (p.endsWith('/rest/v1/tarefas')) {
      if (estado.falhas > 0) { estado.falhas--; return json(r, { message: 'erro' }, 500) }
      return json(r, (c.tarefas ?? []).filter((t) => !feitas.has(t.id as string)))
    }
    if (p.endsWith('/rest/v1/audiencias')) return json(r, [])
    if (p.endsWith('/rest/v1/casos')) return json(r, url.searchParams.has('cliente_id') ? c.casosCliente ?? [] : c.camposCasos ?? [])
    if (p.endsWith('/rest/v1/processos')) return json(r, c.processos ?? [])
    if (p.endsWith('/rest/v1/clientes')) {
      const lista = c.clientes ?? []
      const id = url.searchParams.get('id')?.replace('eq.', '')
      const nome = url.searchParams.get('nome')?.replace(/^ilike\.\*?%?|%$|\*$/g, '').replace(/%/g, '').toLowerCase()
      const fil = id ? lista.filter((x) => x.id === id) : nome ? lista.filter((x) => String(x.nome).toLowerCase().includes(nome)) : lista
      return json(r, (req.headers()['accept'] ?? '').includes('vnd.pgrst.object') ? fil[0] ?? null : fil)
    }
    if (p.endsWith('/rest/v1/biblioteca')) return json(r, c.biblioteca ?? [])
    if (p.includes('/storage/v1/object/biblioteca/')) { estado.uploads.push(p.split('/storage/v1/object/biblioteca/')[1]); return json(r, { Key: 'ok' }) }
    if (p.endsWith('/rest/v1/area_campos')) return json(r, c.camposArea ?? [])
    if (p.endsWith('/rest/v1/fluxo_status')) return json(r, c.etapas ?? [])
    return json(r, [])
  })
  return estado
}

export async function entrar(page: Page, senha = 'certa') {
  await page.goto('/login')
  // o login estático (pintura rápida) é trocado pelo app; só preenche depois da troca
  await page.locator('[data-estatico]').waitFor({ state: 'detached' })
  await page.getByLabel('E-mail').fill('ana@silvaprado.exemplo.br')
  await page.getByLabel('Senha', { exact: true }).fill(senha)
  await page.getByRole('button', { name: 'Entrar' }).click()
}
