import { Link } from '@tanstack/react-router'

/** Barra inferior do celular: Seu dia · Áreas · Buscar. */
export function BottomBar({ onBuscar }: { onBuscar: () => void }) {
  return (
    <nav className="inferior" aria-label="Navegação do celular">
      <Link to="/seu-dia" className="inferior-item" activeProps={{ 'aria-current': 'page' }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><circle cx="12" cy="12" r="4" /><path d="M12 3v2M12 19v2M3 12h2M19 12h2" /></svg>
        <span>Seu dia</span>
      </Link>
      
        <Link to="/areas" className="inferior-item" activeProps={{ 'aria-current': 'page' }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><rect x="3" y="4" width="5" height="16" rx="1.5" /><rect x="10" y="4" width="5" height="11" rx="1.5" /><rect x="17" y="4" width="4" height="7" rx="1.5" /></svg>
          <span>Áreas</span>
        </Link>
      
      <button type="button" className="inferior-item" onClick={onBuscar}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
        <span>Buscar</span>
      </button>
    </nav>
  )
}
