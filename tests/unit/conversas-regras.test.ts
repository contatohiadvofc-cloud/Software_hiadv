
import { temLink as tl, LIMITE_CHAMADA as LC } from '../../src/data/conversas'
import { it as it3, expect as ex3 } from 'vitest'
it3('reconhece links externos como o servidor', () => {
  for (const t of ['veja https://x.com', 'www.site.com.br', 'acesse meusite.com.br/oferta', 'link.ly']) ex3(tl(t)).toBe(true)
  for (const t of ['Meta do mês: 12 protocolos', 'Art. 86 da Lei 8.213/91', 'reunião às 14h.']) ex3(tl(t)).toBe(false)
  ex3(LC).toBe(6)
})
