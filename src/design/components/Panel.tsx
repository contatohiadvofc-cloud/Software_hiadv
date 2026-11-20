import type { ReactNode } from 'react'

export function Panel({ title, action, children, labelId }: { title?: string; action?: ReactNode; children: ReactNode; labelId?: string }) {
  return (
    <section className="hv-panel" aria-labelledby={title ? labelId : undefined}>
      {title && (
        <div className="hv-panel-head">
          <h2 id={labelId}>{title}</h2>
          {action}
        </div>
      )}
      {children}
    </section>
  )
}
