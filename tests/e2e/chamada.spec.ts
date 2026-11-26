import { test, expect, type Page } from '@playwright/test'

// Chamada de vídeo de verdade (WebRTC) entre duas abas, com câmera e microfone de teste do Chromium.
test.use({ launchOptions: { args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--autoplay-policy=no-user-gesture-required'] }, permissions: ['camera', 'microphone'] })

async function abrirChamada(page: Page, nome?: string) {
  // a prévia abre uma vez por dia em cada aparelho; a segunda aba do teste é "outra pessoa"
  await page.addInitScript((n) => { localStorage.removeItem('hiadv-previa-ultima'); if (n) sessionStorage.setItem('hiadv-demo-nome', n) }, nome ?? '')
  await page.goto('/experimentar')
  await page.getByRole('link', { name: /^Conversas/ }).first().click()
  await page.getByText(/Equipe Silva/).first().click()
  await page.getByRole('button', { name: 'Chamada de vídeo' }).click()
  await expect(page.locator('.ch-tile[data-eu]')).toBeVisible()
}

test('chamada de vídeo entre duas pessoas: conecta, mostra vídeo, mudo e alto-falante', async ({ context }, info) => {
  test.skip(info.project.name !== 'computador', 'um projeto basta: as duas abas dividem o mesmo navegador')
  test.setTimeout(90_000)
  const ana = await context.newPage()
  const julia = await context.newPage()
  await abrirChamada(ana)
  await abrirChamada(julia, 'Júlia Ramos')

  // cada lado vê o outro com vídeo chegando
  await expect(ana.locator('.ch-tile:not([data-eu])')).toHaveCount(1, { timeout: 20_000 })
  await expect(julia.locator('.ch-tile:not([data-eu])')).toHaveCount(1, { timeout: 20_000 })
  await expect.poll(() => julia.locator('.ch-tile:not([data-eu]) video').evaluate((v: HTMLVideoElement) => v.videoWidth), { timeout: 20_000 }).toBeGreaterThan(0)
  await expect.poll(() => ana.locator('.ch-tile:not([data-eu]) video').evaluate((v: HTMLVideoElement) => v.videoWidth), { timeout: 20_000 }).toBeGreaterThan(0)
  // áudio chegando de verdade (faixa de áudio ao vivo do outro lado)
  expect(await julia.locator('.ch-tile:not([data-eu]) video').evaluate((v: HTMLVideoElement) => (v.srcObject as MediaStream).getAudioTracks().filter((t) => t.readyState === 'live').length)).toBe(1)
  await expect(julia.locator('.ch-tile:not([data-eu]) .ch-nome')).toContainText('Ana')

  await julia.waitForTimeout(1500)
  await julia.screenshot({ path: 'test-results/chamada-video-computador.png' })

  // mudo de um lado aparece no outro
  await ana.getByRole('button', { name: 'Desligar microfone' }).click()
  await expect(julia.locator('.ch-tile:not([data-eu]) .ch-nome svg[aria-label="microfone desligado"]')).toBeVisible({ timeout: 10_000 })
  // câmera desligada vira iniciais
  await ana.getByRole('button', { name: 'Desligar câmera' }).click()
  await expect(julia.locator('.ch-tile:not([data-eu]) .ch-av')).toBeVisible({ timeout: 10_000 })
  await julia.screenshot({ path: 'test-results/chamada-mudo-sem-camera.png' })
  await ana.getByRole('button', { name: 'Ligar câmera' }).click()
  await ana.getByRole('button', { name: 'Ligar microfone' }).click()

  // alto-falante: o som passa a sair reforçado (o vídeo fica mudo e o reforço toca)
  await julia.getByRole('button', { name: 'Alto-falante: som mais alto' }).click()
  await expect(julia.getByRole('button', { name: 'Voltar ao som normal' })).toHaveAttribute('aria-pressed', 'true')
  expect(await julia.locator('.ch-tile:not([data-eu]) video').evaluate((v: HTMLVideoElement) => v.muted)).toBe(true)

  // celular
  await julia.setViewportSize({ width: 390, height: 844 })
  await julia.waitForTimeout(1200)
  await julia.screenshot({ path: 'test-results/chamada-video-celular.png' })

  // sair: o outro lado fica sozinho
  await ana.getByRole('button', { name: 'Sair da chamada' }).click()
  await expect(julia.locator('.ch-tile:not([data-eu])')).toHaveCount(0, { timeout: 15_000 })
})

test('áudio: grava, ouve e lê a transcrição antes de enviar, ou exclui', async ({ page }, info) => {
  test.skip(info.project.name !== 'celular', 'conferido no celular')
  await page.addInitScript(() => localStorage.removeItem('hiadv-previa-ultima'))
  await page.goto('/experimentar')
  await page.getByRole('link', { name: /^Conversas/ }).first().click()
  await page.getByText(/Equipe Silva/).first().click()
  await page.screenshot({ path: 'test-results/conversa-registros-chamada.png' })
  await expect(page.locator('.cv-chamada-ev').first()).toBeVisible()
  await page.getByRole('button', { name: /Gravar áudio/ }).click()
  await page.waitForTimeout(2000)
  await page.getByRole('button', { name: 'Parar e ouvir antes de enviar' }).click()
  await expect(page.getByRole('group', { name: 'Revisar áudio antes de enviar' })).toBeVisible()
  await expect(page.getByText(/aparece a transcrição do seu áudio/)).toBeVisible()
  await page.screenshot({ path: 'test-results/audio-revisao.png' })
  await page.getByRole('button', { name: 'Excluir' }).click()
  await expect(page.getByRole('group', { name: 'Revisar áudio antes de enviar' })).toHaveCount(0)
})
