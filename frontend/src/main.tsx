import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App'
import './index.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 5 * 60 * 1000,
    },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
)

// Retire l'ecran de demarrage (visible seulement en mode app installe) une fois
// React monte, avec un court fondu. On evite requestAnimationFrame (throttle a 0
// dans un onglet cache) : setTimeout se declenche toujours, donc le splash ne
// peut pas rester bloque a l'ecran.
const splash = document.getElementById('app-splash')
if (splash) {
  splash.style.opacity = '0'
  setTimeout(() => splash.remove(), 400)
}

// Enregistrement du service worker (PWA installable + cache hors-ligne).
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.error('Echec enregistrement service worker:', err)
    })
  })
}
