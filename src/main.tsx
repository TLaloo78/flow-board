import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Self-hosted so page loads don't contact Google Fonts.
import '@fontsource/inter-tight/400.css'
import '@fontsource/inter-tight/600.css'
import '@fontsource/inter-tight/700.css'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
