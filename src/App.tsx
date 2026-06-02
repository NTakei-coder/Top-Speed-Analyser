import { useEffect, useState } from 'react'
import './styles.css'
import TopSpeedAnalyzer from './TopSpeedAnalyzer'
import { getInitialLanguage, installStaticTranslator, languageNames, saveLanguage, ui, type Language } from './i18n'

type AppMode = 'top-speed' | 'baton'

type BeforeInstallPromptEventLike = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

function getInitialMode(): AppMode {
  if (typeof window === 'undefined') return 'top-speed'
  return window.location.hash === '#baton' ? 'baton' : 'top-speed'
}


function AddToHomeScreenCard({ language }: { language: Language }) {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEventLike | null>(null)
  const [isStandalone, setIsStandalone] = useState(false)
  const isEn = language === 'en'

  useEffect(() => {
    const checkStandalone = () => {
      const standalone = window.matchMedia('(display-mode: standalone)').matches || Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone)
      setIsStandalone(standalone)
    }
    checkStandalone()

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault()
      setInstallPrompt(event as BeforeInstallPromptEventLike)
    }
    const onAppInstalled = () => {
      setInstallPrompt(null)
      setIsStandalone(true)
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt)
    window.addEventListener('appinstalled', onAppInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt)
      window.removeEventListener('appinstalled', onAppInstalled)
    }
  }, [])

  const install = async () => {
    if (!installPrompt) return
    await installPrompt.prompt()
    await installPrompt.userChoice.catch(() => undefined)
    setInstallPrompt(null)
  }

  return (
    <section className="home-install-card" aria-label={isEn ? 'Add to Home Screen guide' : 'ホーム画面に追加ガイド'}>
      <div className="home-install-icon" aria-hidden="true">
        <img src="/icons/icon-192.png" alt="" />
      </div>
      <div className="home-install-body">
        <div className="home-install-title-row">
          <h2>{isEn ? 'Use this like an app' : 'アプリ感覚で使う'}</h2>
          {isStandalone ? <span>{isEn ? 'Added' : '追加済み'}</span> : null}
        </div>
        <p>{isEn ? 'Add Sprint Analyzer to your Home Screen for quick access before practice or races.' : 'ホーム画面に追加すると、練習や試合前にすぐ起動できます。'}</p>
        <div className="home-install-actions">
          {installPrompt ? (
            <button type="button" onClick={() => void install()}>{isEn ? 'Install / Add to Home Screen' : 'インストール / ホーム画面に追加'}</button>
          ) : null}
          <div className="home-install-steps">
            <div><strong>iPhone / iPad</strong><br />{isEn ? 'Safari → Share → Add to Home Screen' : 'Safari → 共有 → ホーム画面に追加'}</div>
            <div><strong>Android</strong><br />{isEn ? 'Chrome → menu ⋮ → Install app / Add to Home screen' : 'Chrome → メニュー ⋮ → アプリをインストール / ホーム画面に追加'}</div>
          </div>
        </div>
      </div>
    </section>
  )
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
        <AddToHomeScreenCard language={language} />
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
