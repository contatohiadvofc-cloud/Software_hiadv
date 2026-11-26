import { useEffect, useState } from 'react'
import { onlineManager, useIsMutating } from '@tanstack/react-query'

/** Faixa discreta quando a internet cai: mostra o último estado guardado e segura o que for salvo até voltar. */
export function AvisoSemInternet() {
  const [online, setOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine) && onlineManager.isOnline())
  const [voltou, setVoltou] = useState(false)
  const pendentes = useIsMutating()
  useEffect(() => {
    const mudar = (on: boolean) => {
      setOnline((antes) => { if (on && !antes) { setVoltou(true); setTimeout(() => setVoltou(false), 3500) } return on })
      onlineManager.setOnline(on)
    }
    if (!navigator.onLine) mudar(false)
    const off = () => mudar(false), on = () => mudar(true)
    addEventListener('offline', off); addEventListener('online', on)
    return () => { removeEventListener('offline', off); removeEventListener('online', on) }
  }, [])
  if (online && !voltou) return null
  return (
    <div className="sem-net" role="status" data-voltou={online || undefined}>
      {online
        ? 'Internet de volta. Tudo sincronizado.'
        : `Sem internet. Você vê o último estado salvo${pendentes ? ` e ${pendentes === 1 ? '1 alteração será enviada' : `${pendentes} alterações serão enviadas`} quando a conexão voltar` : '; o que você salvar agora é enviado quando a conexão voltar'}.`}
    </div>
  )
}
