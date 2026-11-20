import { Button } from './Button'

export function ErrorState({ message = 'Não foi possível carregar.', onRetry }: { message?: string; onRetry: () => void }) {
  return (
    <div className="hv-errorstate" role="alert">
      <p className="t">{message}</p>
      <p className="muted">Confira a internet e tente de novo. Se continuar, avise o suporte do HiAdv.</p>
      <Button variant="secondary" size="sm" onClick={onRetry}>Tentar de novo</Button>
    </div>
  )
}
