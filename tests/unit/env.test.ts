import { lerEnv } from '../../src/env'

describe('lerEnv', () => {
  it('reclama da URL ausente com a mensagem exata', () => {
    expect(() => lerEnv({ VITE_SUPABASE_PUBLISHABLE_KEY: 'k' })).toThrow('Configuração ausente: VITE_SUPABASE_URL')
  })
  it('reclama da chave ausente', () => {
    expect(() => lerEnv({ VITE_SUPABASE_URL: 'https://x.supabase.co' })).toThrow('Configuração ausente: VITE_SUPABASE_PUBLISHABLE_KEY')
  })
  it('recusa uma chave secreta (service_role) por engano', () => {
    expect(() => lerEnv({ VITE_SUPABASE_URL: 'https://x.supabase.co', VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_secret_abc' })).toThrow('Use a chave publicável')
  })
  it('devolve a configuração quando está completa', () => {
    expect(lerEnv({ VITE_SUPABASE_URL: 'https://x.supabase.co', VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_k' }))
      .toEqual({ supabaseUrl: 'https://x.supabase.co', supabaseKey: 'sb_publishable_k' })
  })
})
