import { useState } from 'react'
import './App.css'

function CameraIcon() {
  return (
    <svg
      aria-hidden="true"
      className="camera-icon"
      fill="none"
      viewBox="0 0 24 24"
    >
      <path
        d="M14.5 5.5h-5l-1.6 2H5A2.5 2.5 0 0 0 2.5 10v8A2.5 2.5 0 0 0 5 20.5h14A2.5 2.5 0 0 0 21.5 18v-8A2.5 2.5 0 0 0 19 7.5h-2.9l-1.6-2Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.7"
      />
      <circle
        cx="12"
        cy="13.5"
        r="3.25"
        stroke="currentColor"
        strokeWidth="1.7"
      />
    </svg>
  )
}

function App() {
  const [permissionNotice, setPermissionNotice] = useState('')
  const [desktopMessage, setDesktopMessage] = useState('')

  async function handleAboutClick() {
    if (!window.athena?.getAppInfo) {
      setDesktopMessage('App information is available in the desktop app.')
      return
    }

    try {
      const appInfo = await window.athena.getAppInfo()
      setDesktopMessage(`${appInfo.name} · Version ${appInfo.version}`)
    } catch {
      setDesktopMessage('Could not load app information. Please try again.')
    }
  }

  async function handleRulesClick() {
    if (!window.athena?.showExamRules) {
      setDesktopMessage('Native exam rules are available in the desktop app.')
      return
    }

    try {
      await window.athena.showExamRules()
      setDesktopMessage('Exam rules were shown in a desktop dialog.')
    } catch {
      setDesktopMessage('Could not show exam rules. Please try again.')
    }
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand">
          <span aria-hidden="true" className="brand-mark">N</span>
          <span className="brand-copy">
            <span className="brand-name">Newton Athena</span>
            <span className="brand-subtitle">Desktop Exam Environment</span>
          </span>
        </div>
        <span className="environment-label">
          <span aria-hidden="true" className="environment-dot" />
          Exam environment
        </span>
      </header>

      <div className="page-content">
        <section aria-labelledby="welcome-title" className="welcome">
          <span className="eyebrow">BEFORE YOU BEGIN</span>
          <h1 id="welcome-title">Welcome to your exam</h1>
          <p>
            Let&apos;s make sure your setup is ready. Camera permission is
            required for this exam session.
          </p>
        </section>

        <section aria-labelledby="permission-title" className="permission-card">
          <div className="card-heading">
            <div className="camera-badge">
              <CameraIcon />
            </div>
            <div>
              <h2 id="permission-title">Camera permission</h2>
              <p className="card-description">
                Your camera may be required during the exam.
              </p>
            </div>
          </div>

          <div aria-live="polite" className="permission-status" role="status">
            <span aria-hidden="true" className="status-indicator" />
            <span>Camera permission not granted</span>
          </div>

          <button
            className="button button-primary"
            onClick={() =>
              setPermissionNotice(
                'Camera access is not available yet. It will be enabled when desktop permissions are connected.',
              )
            }
            type="button"
          >
            <CameraIcon />
            Grant Camera Permission
          </button>
          {permissionNotice && (
            <p className="permission-notice" role="status">
              {permissionNotice}
            </p>
          )}
          <button className="button button-secondary" disabled type="button">
            Start Exam
          </button>
          <p className="availability-note">
            Start Exam will be available after camera permission is granted.
          </p>
        </section>

        <section aria-labelledby="rules-title" className="rules-card">
          <div className="rules-heading">
            <span aria-hidden="true" className="rules-number">01</span>
            <div>
              <h2 id="rules-title">A few things to remember</h2>
              <p className="card-description">
                Please follow these guidelines during your exam.
              </p>
            </div>
          </div>
          <ul className="rules-list">
            <li>
              <span aria-hidden="true" className="rule-check">✓</span>
              <span>Remain in the exam window throughout your session.</span>
            </li>
            <li>
              <span aria-hidden="true" className="rule-check">✓</span>
              <span>Keep your camera enabled when it is required.</span>
            </li>
            <li>
              <span aria-hidden="true" className="rule-check">✓</span>
              <span>Do not leave the exam without permission.</span>
            </li>
          </ul>
        </section>

        <footer className="page-footer">
          <span>Newton Athena · Ready when you are.</span>
          <div className="footer-actions">
            <button className="footer-action" onClick={handleRulesClick} type="button">
              View exam rules
            </button>
            <button className="footer-action" onClick={handleAboutClick} type="button">
              About this app
            </button>
          </div>
        </footer>
        {desktopMessage && (
          <p aria-live="polite" className="desktop-message" role="status">
            {desktopMessage}
          </p>
        )}
      </div>
    </main>
  )
}

export default App
