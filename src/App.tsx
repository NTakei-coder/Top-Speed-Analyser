import { useEffect, useState } from 'react'
import './styles.css'
import TopSpeedAnalyzer from './TopSpeedAnalyzer'
import { getInitialLanguage, installStaticTranslator, languageNames, saveLanguage, ui, type Language } from './i18n'

type AppMode = 'top-speed' | 'baton'

function getInitialMode(): AppMode {
  if (typeof window === 'undefined') return 'top-speed'
  return window.location.hash === '#baton' ? 'baton' : 'top-speed'
}

export default function App() {
  const [mode, setMode] = useState<AppMode>(getInitialMode)
  const [language, setLanguage] = useState<Language>(getInitialLanguage)

  useEffect(() => {
    const onHashChange = () => setMode(getInitialMode())
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  useEffect(() => {
    saveLanguage(language)
    return installStaticTranslator(language)
  }, [language, mode])

  const switchMode = (nextMode: AppMode) => {
    setMode(nextMode)
    const nextHash = nextMode === 'baton' ? '#baton' : '#top-speed'
    if (window.location.hash !== nextHash) window.history.replaceState(null, '', nextHash)
  }

  return (
    <>
      <div className="analysis-switch-shell">
        <div className="language-switch" aria-label={ui[language].language}>
          <span>{ui[language].language}</span>
          <button type="button" className={language === 'ja' ? 'active' : ''} onClick={() => setLanguage('ja')}>{languageNames.ja}</button>
          <button type="button" className={language === 'en' ? 'active' : ''} onClick={() => setLanguage('en')}>{languageNames.en}</button>
        </div>
        <div className="analysis-switch" role="tablist" aria-label="分析機能の切り替え">
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'top-speed'}
            className={mode === 'top-speed' ? 'active' : ''}
            onClick={() => switchMode('top-speed')}
          >
            {ui[language].topSpeedTab}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'baton'}
            className={mode === 'baton' ? 'active' : ''}
            onClick={() => switchMode('baton')}
          >
            {ui[language].batonTab}
          </button>
        </div>
      </div>

      {mode === 'top-speed' ? (
        <TopSpeedAnalyzer language={language} />
      ) : (
        <iframe
          className="baton-analysis-frame"
          key={language}
          title={ui[language].batonTab}
          src={`/baton.html?lang=${language}`}
        />
      )}
    </>
  )
}
