import * as D from '@radix-ui/react-dialog'
import type { ReactNode } from 'react'

type Props = { open: boolean; onOpenChange: (v: boolean) => void; title: string; hideTitle?: boolean; variant?: 'centro' | 'painel'; children: ReactNode }

export function Dialog({ open, onOpenChange, title, hideTitle, variant = 'centro', children }: Props) {
  return (
    <D.Root open={open} onOpenChange={onOpenChange}>
      <D.Portal>
        <D.Overlay className="hv-overlay" />
        <D.Content className="hv-dialog" data-variant={variant} aria-describedby={undefined}>
          {hideTitle ? <D.Title className="sr-only">{title}</D.Title> : (
            <div className="hv-dialog-head">
              <D.Title asChild><h2>{title}</h2></D.Title>
              <D.Close className="hv-btn" data-variant="ghost" data-size="sm" aria-label="Fechar">×</D.Close>
            </div>
          )}
          {children}
        </D.Content>
      </D.Portal>
    </D.Root>
  )
}
