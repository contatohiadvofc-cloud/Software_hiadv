import type { ReactNode } from 'react'

export type Tone = 'neutral' | 'info' | 'success' | 'warning' | 'danger'

export function Badge({ tone = 'neutral', children }: { tone?: Tone; children: ReactNode }) {
  return <span className="hv-badge" data-tone={tone}>{children}</span>
}
