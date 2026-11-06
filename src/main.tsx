import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { buildHash } from './hooks/useHashRouter'
import './styles/tokens.css'
import './styles/app.css'

function ensureHash() {
  const { hash, search } = window.location
  if (!hash) {
    const target = search ? buildHash('explorer', search) : buildHash('explorer')
    window.history.replaceState(null, '', target)
  }
}

ensureHash()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
