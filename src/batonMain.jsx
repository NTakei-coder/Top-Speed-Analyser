import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { Analytics } from "@vercel/analytics/react";
import BatonAnalyzer from "./BatonAnalyzer.jsx";
import "./batonStyle.css";
import { getInitialLanguage, installStaticTranslator, saveLanguage, ui } from "./i18n";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="error-fallback">
          <h1>アプリの読み込み中にエラーが発生しました</h1>
          <p>画面を再読み込みしてください。</p>
          <pre>{String(this.state.error?.message || this.state.error)}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

function BatonRoot() {
  const [language] = useState(getInitialLanguage)
  useEffect(() => {
    saveLanguage(language)
    return installStaticTranslator(language)
  }, [language])

  return (
    <>
      <div className="baton-language-note" aria-label={ui[language].language}>{language === "en" ? "English" : "日本語"}</div>
      <ErrorBoundary>
        <BatonAnalyzer language={language} />
      </ErrorBoundary>
      <Analytics />
    </>
  )
}

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BatonRoot />
  </React.StrictMode>,
);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => undefined);
  });
}
