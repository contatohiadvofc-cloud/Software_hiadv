import { useQuery } from '@tanstack/react-query'
import { pode } from './central'
import { useApi, useSessao } from '../lib/contexto'

export function useAreas() {
  const api = useApi()
  const { perfil } = useSessao()
  return useQuery({ queryKey: ['areas', perfil?.escritorioId], queryFn: () => api.areas(), enabled: !!perfil, staleTime: 5 * 60_000 })
}

export function useEscritorios() {
  const api = useApi()
  const { perfil } = useSessao()
  return useQuery({ queryKey: ['escritorios'], queryFn: () => api.escritorios(), enabled: !!perfil?.code, staleTime: 5 * 60_000 })
}

export function useItensDoDia() {
  const api = useApi()
  const { perfil } = useSessao()
  return useQuery({
    queryKey: ['seu-dia', perfil?.escritorioId, perfil?.email],
    queryFn: () => api.itensDoDia(perfil!.email),
    enabled: !!perfil,
    refetchInterval: 5 * 60_000,
  })
}

/** O que a pessoa logada pode usar (plano do escritório e ajustes da Central). */
export function useRecursos() {
  const api = useApi()
  const { perfil } = useSessao()
  const q = useQuery({ queryKey: ['meus-recursos', perfil?.escritorioId, perfil?.email], queryFn: () => api.meusRecursos(), enabled: !!perfil, staleTime: 5 * 60_000 })
  return { meus: q.data ?? null, carregado: q.isSuccess || q.isError, pode: (r: string) => pode(q.data ?? null, r) }
}

/** Mensagens não lidas (equipe + comunidades) para o selo do menu. Atualiza a cada 30 s; falha conta como zero. */
export function useNaoLidas(): number {
  const api = useApi()
  const { perfil } = useSessao()
  const c = useQuery({ queryKey: ['chat-lista', perfil?.escritorioId], queryFn: () => api.chatLista(), enabled: !!perfil, refetchInterval: 10_000, retry: false })
  const m = useQuery({ queryKey: ['com-lista'], queryFn: () => api.comLista(), enabled: !!perfil, refetchInterval: 60_000, retry: false })
  return (c.data ?? []).reduce((s, x) => s + x.naoLidas, 0) + (m.data ?? []).reduce((s, x) => s + x.naoLidas, 0)
}
