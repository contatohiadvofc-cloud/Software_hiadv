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
