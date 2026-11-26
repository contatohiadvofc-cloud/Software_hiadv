import { test, type Page } from '@playwright/test'
import { TUTORIAIS } from './tutoriais'

const CSS = `.previa-barra, .previa-cartao, .previa-fim, .sv-cookies { display: none !important; }
#tut-leg { position: fixed; left: 50%; bottom: 7%; transform: translateX(-50%); z-index: 99999; max-width: 88vw; padding: 14px 20px; border-radius: 14px;
  background: rgba(14,14,14,.92); color: #fff; font: 700 clamp(17px, 4.6vw, 26px)/1.25 'Public Sans', system-ui, sans-serif; text-align: center; box-shadow: 0 10px 30px rgba(0,0,0,.45); border: 2px solid #9e2b48; }
#tut-tit { position: fixed; left: 0; right: 0; top: 0; z-index: 99999; padding: 10px 16px; background: #9e2b48; color: #fff; font: 800 clamp(14px, 3.6vw, 20px)/1.2 'Public Sans', system-ui, sans-serif; text-align: center; }
#tut-toque { position: fixed; z-index: 99998; width: 44px; height: 44px; margin: -22px 0 0 -22px; border-radius: 50%; background: rgba(201,168,114,.55); border: 3px solid #c9a872; pointer-events: none; transition: opacity .4s; }`

async function legenda(page: Page, titulo: string, texto: string) {
  await page.evaluate(([ti, tx]) => {
    let t = document.getElementById('tut-tit'); if (!t) { t = document.createElement('div'); t.id = 'tut-tit'; document.body.appendChild(t) } t.textContent = ti
    let l = document.getElementById('tut-leg'); if (!l) { l = document.createElement('div'); l.id = 'tut-leg'; document.body.appendChild(l) } l.textContent = tx
  }, [titulo, texto])
}

for (const tut of TUTORIAIS) {
  test(tut.id, async ({ page }) => {
    await page.addInitScript(() => { try { localStorage.setItem('hiadv-aviso-cookies', '1') } catch { /* */ } })
    const doSite = tut.passos[0].rota === '/'
    if (doSite) await page.goto('/')
    else { await page.goto('/experimentar'); await page.waitForTimeout(1500) }
    for (const p of tut.passos) {
      if (p.rota && p.rota !== '/') {
        await page.evaluate((r) => { history.pushState(null, '', r); dispatchEvent(new PopStateEvent('popstate')) }, p.rota)
        await page.waitForTimeout(1200)
      }
      await page.addStyleTag({ content: CSS })
      await legenda(page, tut.titulo, p.legenda)
      await page.waitForTimeout(1600)
      if (p.clique) {
        const alvo = p.clique === 'tema' ? page.getByRole('button', { name: /Claro|Escuro|tema/i }).first()
          : page.getByRole('button', { name: new RegExp(p.clique, 'i') }).or(page.getByRole('link', { name: new RegExp(p.clique, 'i') })).or(page.getByPlaceholder(new RegExp(p.clique, 'i'))).first()
        const b = await alvo.boundingBox({ timeout: 3000 }).catch(() => null)
        if (b) {
          await page.evaluate(([x, y]) => { const d = document.createElement('div'); d.id = 'tut-toque'; d.style.left = x + 'px'; d.style.top = y + 'px'; document.body.appendChild(d); setTimeout(() => d.remove(), 900) }, [b.x + b.width / 2, b.y + b.height / 2])
          await page.waitForTimeout(500)
          await alvo.click({ timeout: 3000 }).catch(() => {})
          await page.waitForTimeout(900)
          await page.addStyleTag({ content: CSS }); await legenda(page, tut.titulo, p.legenda)
        }
      }
      if (p.rolar) { await page.mouse.wheel(0, p.rolar); await page.waitForTimeout(400) }
      await page.waitForTimeout(p.espera ?? 2200)
    }
    await legenda(page, tut.titulo, 'Teste grátis por 14 dias em hiadv.com.br')
    await page.waitForTimeout(2200)
  })
}
