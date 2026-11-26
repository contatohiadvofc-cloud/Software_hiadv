import { describe, it, expect } from 'vitest'
import { rotasDoCodigo, paraCloudflare, gerarRedirects, gerarHeaders } from '../../scripts/cloudflare'

describe('configuração do Cloudflare', () => {
  it('lê as rotas do código e ignora a raiz', () => {
    const fonte = `path: '/', path: '/seu-dia', path: "/clientes/$id", path: '$', path: '/seu-dia'`
    expect(rotasDoCodigo(fonte)).toEqual(['/seu-dia', '/clientes/$id'])
  })
  it('converte parâmetros para a sintaxe do Cloudflare', () => {
    expect(paraCloudflare('/vagas/$escritorio/$vaga')).toBe('/vagas/:escritorio/:vaga')
  })
  it('_redirects só aponta rotas do app para o app com 200, estáticas antes das dinâmicas', () => {
    const r = gerarRedirects(['/clientes/$id', '/seu-dia'], ['/experimentar'])
    const linhas = r.split('\n').filter((l) => l && !l.startsWith('#'))
    expect(linhas).toEqual(['/seu-dia /app 200', '/experimentar /app 200', '/clientes/:id /app 200'])
    expect(r).not.toMatch(/^\/\*\s/m)
  })
  it('rotas com destino próprio (Meu Processo) entram antes das do app', () => {
    const linhas = gerarRedirects(['/seu-dia'], [], [['/mp', '/meu-processo'], ['/mp/*', '/meu-processo']]).split('\n').filter((l) => l && !l.startsWith('#'))
    expect(linhas).toEqual(['/mp /meu-processo 200', '/seu-dia /app 200', '/mp/* /meu-processo 200'])
  })
  it('_headers protege contra clickjacking e mantém câmera e microfone para o próprio site', () => {
    const h = gerarHeaders()
    expect(h).toContain("frame-ancestors 'self'")
    expect(h).toContain('X-Frame-Options: SAMEORIGIN')
    expect(h).toContain('Strict-Transport-Security')
    expect(h).toContain('camera=(self), microphone=(self)')
    expect(h).toMatch(/\/sw\.js\n\s+Cache-Control: no-cache/)
  })
})
