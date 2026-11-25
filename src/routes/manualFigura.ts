export type Caixa = { x: number; y: number; w: number; h: number }
const W = 1280, H = 800

/** Onde fica o número: fora da caixa, à esquerda e acima, sem sair da imagem. */
export function posicaoNumero(c: Caixa): { bx: number; by: number } {
  const x = (c.x / 100) * W, y = (c.y / 100) * H
  const bx = x > 70 ? x - 46 : Math.min(x + (c.w / 100) * W + 34, W - 24)
  const by = y > 60 ? y - 30 : Math.min(y + 30, H - 24)
  return { bx, by }
}

