// Arquivos de configuração do Cloudflare Pages, gerados a cada build (vite.config.ts → cloudflare()).
// _redirects: endereços do aplicativo (ex.: /seu-dia, /vagas/x/y) abrem o app (app.html; o Cloudflare serve /app.html em /app) com status 200
//             (link compartilhado no WhatsApp/LinkedIn mostra prévia; sem isso viria 404).
// _headers:   cabeçalhos de segurança (laudo de 22/11/2026, risco médio 2) e cache dos arquivos.

/** Lê os caminhos das rotas declaradas no código do aplicativo. */
export function rotasDoCodigo(fonte: string): string[] {
  const achados = [...fonte.matchAll(/path:\s*['"]([^'"]+)['"]/g)].map((m) => m[1])
  return [...new Set(achados)].filter((p) => p.startsWith('/') && p !== '/')
}

/** "/clientes/$id" → "/clientes/:id" (sintaxe do Cloudflare). */
export function paraCloudflare(caminho: string): string {
  return caminho.replace(/\$([A-Za-z_][A-Za-z0-9_]*)/g, ':$1')
}

/** Conteúdo do _redirects. Só lista rotas do app: arquivos reais (/assets, /site…) nunca são tocados. */
export function gerarRedirects(rotas: string[], extras: string[] = [], proprios: [string, string][] = []): string {
  // rotas com destino próprio (ex.: /mp → app do cliente) vêm primeiro: no Cloudflare vale a primeira regra que bate
  const linhas = [...proprios.map(([de, para]) => `${de} ${para} 200`), ...[...rotas, ...extras].map((r) => `${paraCloudflare(r)} /app 200`)]
  const dinamica = (l: string) => l.includes(':') || l.includes('*')
  const estaticas = linhas.filter((l) => !dinamica(l))
  const dinamicas = linhas.filter(dinamica)
  return ['# Gerado no build (scripts/cloudflare.ts). Não editar à mão.', ...estaticas, ...dinamicas, ''].join('\n')
}

export const CABECALHOS_SEGURANCA: Record<string, string> = {
  'Strict-Transport-Security': 'max-age=31536000',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'SAMEORIGIN',
  'Content-Security-Policy': "frame-ancestors 'self'; base-uri 'self'; object-src 'none'",
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  // câmera e microfone: chamada de vídeo e áudio das conversas, só no próprio HiAdv
  'Permissions-Policy': 'camera=(self), microphone=(self), geolocation=(), payment=(), usb=()',
  'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
}

/** Conteúdo do _headers. */
export function gerarHeaders(): string {
  const bloco = (caminho: string, h: Record<string, string>) => [caminho, ...Object.entries(h).map(([k, v]) => `  ${k}: ${v}`)].join('\n')
  return [
    '# Gerado no build (scripts/cloudflare.ts). Não editar à mão.',
    bloco('/*', CABECALHOS_SEGURANCA),
    // arquivos com hash no nome nunca mudam: cache de 1 ano
    bloco('/assets/*', { 'Cache-Control': 'public, max-age=31536000, immutable' }),
    bloco('/site/*', { 'Cache-Control': 'public, max-age=86400' }),
    bloco('/icons/*', { 'Cache-Control': 'public, max-age=86400' }),
    // o service worker precisa ser conferido sempre, senão o app demora a atualizar
    bloco('/sw.js', { 'Cache-Control': 'no-cache' }),
    '',
  ].join('\n')
}
