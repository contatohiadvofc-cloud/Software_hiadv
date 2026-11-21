import type { Page, Route } from '@playwright/test'

/** Supabase simulado para os testes de tela: só dados fictícios. */
export type Cenario = {
  senha?: string
  papel?: string
  areas?: Array<{ area: string; nome: string; ordem: number }> | 'sem-funcao'
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
}

function b64url(o: object) {
  return Buffer.from(JSON.stringify(o)).toString('base64').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_')
}
const TOKEN = `${b64url({ alg: 'HS256', typ: 'JWT' })}.${b64url({ sub: 'u1', email: 'ana@silvaprado.exemplo.br', role: 'authenticated', exp: 4102444800 })}.assinatura`
const USER = { id: 'u1', aud: 'authenticated', role: 'authenticated', email: 'ana@silvaprado.exemplo.br', app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' }

export async function simularSupabase(page: Page, c: Cenario = {}) {
  const estado = { atual: c.escritorios?.find((e) => e.atual)?.id ?? 'esc-1', falhas: c.falharSeuDia ?? 0, chamadasBusca: 0, movidos: [] as Array<Record<string, unknown>>, salvos: [] as Array<Record<string, unknown>> }
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
      if (nome === 'pericias_lista') return json(r, [])
      if (nome === 'casos_quadro') return json(r, c.casos ?? [])
      if (nome === 'caso_status') {
        if (c.recusarMover) return json(r, { code: 'P0001', message: 'Só o jurídico move nesta etapa.' }, 400)
        estado.movidos.push(req.postDataJSON() as Record<string, unknown>); return json(r, { ok: true })
      }
      if (nome === 'caso_detalhe') return json(r, c.detalhe ?? null)
      if (nome === 'caso_campos_salvar') {
        const corpo = req.postDataJSON() as Record<string, unknown>
        if (c.recusarCampos) return json(r, { ok: false, erro: c.recusarCampos })
        estado.salvos.push(corpo); return json(r, { ok: true, alterados: Object.keys(corpo.p_campos as object).length })
      }
      return json(r, null)
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
      return json(r, c.tarefas ?? [])
    }
    if (p.endsWith('/rest/v1/audiencias')) return json(r, [])
    if (p.endsWith('/rest/v1/casos')) return json(r, c.camposCasos ?? [])
    if (p.endsWith('/rest/v1/area_campos')) return json(r, c.camposArea ?? [])
    if (p.endsWith('/rest/v1/fluxo_status')) return json(r, c.etapas ?? [])
    return json(r, [])
  })
  return estado
}

export async function entrar(page: Page, senha = 'certa') {
  await page.goto('/login')
  await page.getByLabel('E-mail').fill('ana@silvaprado.exemplo.br')
  await page.getByLabel('Senha').fill(senha)
  await page.getByRole('button', { name: 'Entrar' }).click()
}
