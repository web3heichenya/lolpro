import { Suspense, lazy } from 'react'

const MainApp = lazy(async () => await import('./app/MainApp'))
const OverlayApp = lazy(async () => await import('./app/OverlayApp'))

function getRoute() {
  const hash = window.location.hash || ''
  if (hash.startsWith('#/overlay')) return 'overlay'
  return 'main'
}

export default function App() {
  const route = getRoute()
  return <Suspense fallback={null}>{route === 'overlay' ? <OverlayApp /> : <MainApp />}</Suspense>
}
