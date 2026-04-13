import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './fonts.css'
import './index.css'
import App from './App'
import { AppProviders } from './app/providers/AppProviders'
import { applyTheme } from './app/theme'

applyTheme('system')

// Let CSS adapt to platform-specific rendering/perf constraints (e.g. macOS vibrancy).
document.documentElement.dataset.platform = window.mainApi?.platform ?? window.overlayApi?.platform ?? 'web'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppProviders>
      <App />
    </AppProviders>
  </StrictMode>,
)
