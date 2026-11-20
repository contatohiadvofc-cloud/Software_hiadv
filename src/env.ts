export type Env = { supabaseUrl: string; supabaseKey: string }

type Fonte = Partial<Record<'VITE_SUPABASE_URL' | 'VITE_SUPABASE_PUBLISHABLE_KEY', string>>

function ehChaveSecreta(chave: string): boolean {
  if (chave.startsWith('sb_secret_')) return true
  const partes = chave.split('.')
  if (partes.length !== 3) return false
  try {
    const carga = JSON.parse(atob(partes[1].replace(/-/g, '+').replace(/_/g, '/')))
    return carga?.role === 'service_role'
  } catch {
    return false
  }
}

/** Lê e valida a configuração pública do Supabase. Nunca aceita a chave secreta. */
export function lerEnv(fonte: Fonte): Env {
  const supabaseUrl = fonte.VITE_SUPABASE_URL?.trim()
  const supabaseKey = fonte.VITE_SUPABASE_PUBLISHABLE_KEY?.trim()
  if (!supabaseUrl) throw new Error('Configuração ausente: VITE_SUPABASE_URL')
  if (!supabaseKey) throw new Error('Configuração ausente: VITE_SUPABASE_PUBLISHABLE_KEY')
  if (ehChaveSecreta(supabaseKey)) throw new Error('Use a chave publicável do Supabase, nunca a secreta.')
  return { supabaseUrl, supabaseKey }
}
