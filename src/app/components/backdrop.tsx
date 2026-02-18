import { useEffect, useRef, useState } from 'react'

function buildHeroArtBackground(url: string) {
  // Multi-stop gradient to keep UI readable while still letting the art show through.
  return `radial-gradient(1200px circle at 18% 22%, hsl(0 0% 100% / 0.22), transparent 58%),
radial-gradient(1000px circle at 82% 74%, hsl(0 0% 0% / 0.18), transparent 62%),
linear-gradient(180deg, hsl(0 0% 0% / 0.06), hsl(0 0% 0% / 0.34) 70%, hsl(0 0% 0% / 0.46)),
url(${url})`
}

export function AppBackdrop({ imageUrl }: { imageUrl?: string | null }) {
  const platform = (window.mainApi?.platform ?? window.overlayApi?.platform ?? 'web') as
    | 'darwin'
    | 'win32'
    | 'linux'
    | 'web'
  const useNativeHeroLogic = platform === 'darwin' || platform === 'win32'
  const clearBackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [frontUrl, setFrontUrl] = useState<string | null>(imageUrl ?? null)
  const [backUrl, setBackUrl] = useState<string | null>(null)

  useEffect(() => {
    const next = imageUrl ?? null
    const prev = frontUrl
    if (next === prev) return

    if (clearBackTimerRef.current) clearTimeout(clearBackTimerRef.current)

    // Native-window-material platforms: lightweight opacity transitions.
    if (useNativeHeroLogic) {
      if (next && !prev) {
        queueMicrotask(() => {
          setBackUrl(null)
          setFrontUrl(next)
        })
        return
      }

      if (!next && prev) {
        queueMicrotask(() => {
          setBackUrl(prev)
          setFrontUrl(null)
          clearBackTimerRef.current = setTimeout(() => setBackUrl(null), 280)
        })
        return
      }

      queueMicrotask(() => {
        setBackUrl(prev)
        setFrontUrl(next)
        clearBackTimerRef.current = setTimeout(() => setBackUrl(null), 280)
      })
      return
    }

    // Non-mac: keep navigation (list <-> detail) immediate, avoid expensive full-screen crossfade
    // when one side is empty.
    if (!next || !prev) {
      queueMicrotask(() => {
        setBackUrl(null)
        setFrontUrl(next)
      })
      return
    }

    // Crossfade: keep the previous art as the "back" layer while the new one fades in.
    // Note: schedule setState in a microtask to avoid running it synchronously inside the effect body.
    queueMicrotask(() => {
      setBackUrl(prev)
      setFrontUrl(next)
      clearBackTimerRef.current = setTimeout(() => setBackUrl(null), 560)
    })
  }, [imageUrl, frontUrl, useNativeHeroLogic])

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
      <div className="absolute inset-0 app-frost" />
      {backUrl ? (
        <div
          className="absolute inset-0 hero-art-layer hero-art-exit"
          style={{ backgroundImage: buildHeroArtBackground(backUrl) }}
        />
      ) : null}
      {frontUrl ? (
        <div
          className="absolute inset-0 hero-art-layer hero-art-enter"
          style={{ backgroundImage: buildHeroArtBackground(frontUrl) }}
        />
      ) : null}
      <div className="absolute inset-0 app-noise" />
    </div>
  )
}
