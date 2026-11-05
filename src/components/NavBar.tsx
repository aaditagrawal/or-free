import { classes } from '../lib/classes'
import type { Route } from '../hooks/useHashRouter'

type NavBarProps = {
  route: Route
  onNavigate: (route: Route) => void
}

export function NavBar({ route, onNavigate }: NavBarProps) {
  return (
    <nav className="nav-bar" aria-label="Main navigation">
      <button
        type="button"
        className={classes('nav-link', route === 'explorer' && 'nav-link-active')}
        onClick={() => onNavigate('explorer')}
      >
        Explorer
      </button>
      <button
        type="button"
        className={classes('nav-link', route === 'request' && 'nav-link-active')}
        onClick={() => onNavigate('request')}
      >
        Request
      </button>
    </nav>
  )
}
