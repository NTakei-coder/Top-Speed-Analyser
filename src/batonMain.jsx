import React from "react";
import { createRoot } from "react-dom/client";
import BatonAnalyzer from "./BatonAnalyzer.jsx";
import "./batonStyle.css";

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

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BatonAnalyzer />
    </ErrorBoundary>
  </React.StrictMode>,
);
