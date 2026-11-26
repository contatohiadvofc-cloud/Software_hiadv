import { readFileSync } from 'node:fs'
import { PLANOS, preco } from '../../src/data/adesao'
import { linkAderir, temSessao } from '../../src/site/montar'

const html = readFileSync('index.html', 'utf8')
const norm = (s: string) => s.replace(/&nbsp;| /g, ' ')

describe('site de apresentação', () => {
  it('mostra os preços e os limites de cada plano iguais aos do questionário', () => {
    for (const p of PLANOS) {
      expect(norm(html)).toContain(norm(preco(p.preco)))
      expect(html).toContain(p.limites)
      if (p.fundador !== p.preco) expect(norm(html)).toContain(`Fundadores: ${norm(preco(p.fundador))}`)
      for (const d of p.destaques) expect(html).toContain(d)
    }
  })
  it('tem WhatsApp e e-mail do HiAdv', () => {
    expect(html).toContain('https://wa.me/5549999730572')
    expect(html).toContain('mailto:hiadvofc@gmail.com')
  })
  it('o aplicativo não aparece na busca, o site sim', () => {
    expect(readFileSync('app.html', 'utf8')).toContain('<meta name="robots" content="noindex" />')
    expect(html).not.toContain('noindex')
    expect(html).toContain('<link rel="canonical" href="https://hiadv.com.br/" />')
  })
  it('leva o código de indicação para o questionário só se for válido', () => {
    expect(linkAderir('?ref=abc2345')).toBe('/aderir?ref=ABC2345')
    expect(linkAderir('?ref=<x>')).toBe('/aderir')
    expect(linkAderir('')).toBe('/aderir')
  })
  it('reconhece quem já entrou neste aparelho', () => {
    const st = (ks: string[]) => ({ length: ks.length, key: (i: number) => ks[i] ?? null })
    expect(temSessao(st(['sb-abc-auth-token']))).toBe(true)
    expect(temSessao(st(['hiadv-tema']))).toBe(false)
  })
})

import { MANUAL } from '../../src/data/manual'
import POS from '../../src/data/manualPosicoes.json'
describe('manual', () => {
  it('toda parte do manual tem imagem e todos os marcadores acharam o lugar na tela', () => {
    for (const p of MANUAL) {
      const pos = (POS as Record<string, { m: Record<string, unknown> }>)[p.id]
      expect(pos, p.id).toBeTruthy()
      for (const k of p.marcadores) expect(pos.m[String(k.n)], `${p.id} #${k.n}`).toBeTruthy()
      expect(readFileSync(`public/manual/${p.id}.jpg`).length).toBeGreaterThan(10000)
    }
  })
  it('o manual fica oculto do público (só dentro do sistema)', () => {
    expect(html).not.toContain('id="como-funciona"')
    expect(html).not.toContain('href="#como-funciona"')
    expect(MANUAL.length).toBeGreaterThan(0)
  })
})

import { aparelho } from '../../src/site/montar'
describe('comece agora', () => {
  it('home enxuta tem testar, instalar e abrir, sem as seções retiradas', () => {
    expect(html).toContain('data-instalar-guia'); expect(html).toContain('Testar grátis'); expect(html).toContain('data-abrir')
    for (const id of ['t-dores', 't-recursos', 't-dif', 't-sara', 't-passos', 't-instalar']) expect(html).not.toContain(`aria-labelledby="${id}"`)
  })
  it.each([
    ['Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)', 0, 'ios'], ['Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15)', 5, 'ios'],
    ['Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15)', 0, 'pc'], ['Mozilla/5.0 (Linux; Android 14)', 5, 'android'], ['Mozilla/5.0 (Windows NT 10.0)', 0, 'pc'],
  ])('aparelho %s', (ua, t, esperado) => { expect(aparelho(ua, t)).toBe(esperado) })
})
