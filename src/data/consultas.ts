import { useQuery } from '@tanstack/react-query'
import { useApi, useSessao } from '../lib/contexto'

export function useAreas() {
  const api = useApi()
  const { perfil } = useSessao()
  return useQuery({ queryKey: ['areas', perfil?.escritorioId], queryFn: () => api.areas(), enabled: !!perfil, staleTime: 5 * 60_000 })
}

export function useEscritorios() {
  const api = useApi()
  const { perfil } = useSessao()
  return useQuery({ queryKey: ['escritorios'], queryFn: () => api.escritorios(), enabled: perfil?.papel === 'code', staleTime: 5 * 60_000 })
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
