import type { ReactNode } from 'react'

export function Empty({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="hv-empty">
      <p className="t">{title}</p>
      {children && <p className="muted">{children}</p>}
      {action}
    </div>
  )
}
