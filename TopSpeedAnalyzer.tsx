import { useEffect, useState } from 'react'
import './styles.css'
import TopSpeedAnalyzer from './TopSpeedAnalyzer'

type AppMode = 'top-speed' | 'baton'

function getInitialMode(): AppMode {
  if (typeof window === 'undefined') return 'top-speed'
  return window.location.hash === '#baton' ? 'baton' : 'top-speed'
}

export default function App() {
  const [mode, setMode] = useState<AppMode>(getInitialMode)

  useEffect(() => {
    const onHashChange = () => setMode(getInitialMode())
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  const switchMode = (nextMode: AppMode) => {
    setMode(nextMode)
    const nextHash = nextMode === 'baton' ? '#baton' : '#top-speed'
    if (window.location.hash !== nextHash) window.history.replaceState(null, '', nextHash)
  }

  return (
    <>
      <div className="analysis-switch-shell">
        <div className="analysis-switch" role="tablist" aria-label="分析機能の切り替え">
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'top-speed'}
            className={mode === 'top-speed' ? 'active' : ''}
            onClick={() => switchMode('top-speed')}
          >
            トップスピード分析
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'baton'}
            className={mode === 'baton' ? 'active' : ''}
            onClick={() => switchMode('baton')}
          >
            バトンパス分析
          </button>
        </div>
      </div>

      {mode === 'top-speed' ? (
        <TopSpeedAnalyzer />
      ) : (
        <iframe
          className="baton-analysis-frame"
          title="バトンパス分析"
          src="/baton.html"
        />
      )}
    </>
  )
}
