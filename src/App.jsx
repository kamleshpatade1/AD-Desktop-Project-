import { useEffect, useRef, useState } from 'react'
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
  const [cameraStatus, setCameraStatus] = useState('not-requested')
  const [cameraError, setCameraError] = useState('')
  const [cameraStream, setCameraStream] = useState(null)
  const [desktopMessage, setDesktopMessage] = useState('')
  const [isFullscreen, setIsFullscreen] = useState(false)
  const desktopApi = window.athena
  const desktopAvailable = Boolean(
    desktopApi?.setFullscreen &&
    desktopApi?.getFullscreenState &&
    desktopApi?.onFullscreenChanged &&
    desktopApi?.showExamRules,
  )
  const videoRef = useRef(null)
  const cameraStreamRef = useRef(null)
  const cameraRequestRef = useRef(0)
  const requestInProgressRef = useRef(false)
  const mountedRef = useRef(false)
  const isCameraActive =
    cameraStatus === 'granted' &&
    cameraStream?.getVideoTracks().some((track) => track.readyState === 'live')

  useEffect(() => {
    const videoElement = videoRef.current
    mountedRef.current = true

    return () => {
      mountedRef.current = false
      cameraRequestRef.current += 1
      requestInProgressRef.current = false
      cameraStreamRef.current?.getTracks().forEach((track) => {
        track.onended = null
        track.stop()
      })
      cameraStreamRef.current = null
      if (videoElement) {
        videoElement.srcObject = null
      }
    }
  }, [])

  useEffect(() => {
    const api = window.athena
    if (
      !api?.setFullscreen ||
      !api?.getFullscreenState ||
      !api?.onFullscreenChanged ||
      !api?.showExamRules
    ) {
      return undefined
    }

    let isMounted = true
    const unsubscribe = api.onFullscreenChanged((enabled) => {
      setIsFullscreen(enabled)
    })

    api.getFullscreenState()
      .then((enabled) => {
        if (isMounted) {
          setIsFullscreen(enabled)
        }
      })
      .catch(() => {
        if (isMounted) {
          setDesktopMessage('Could not read fullscreen state. Please try again.')
        }
      })

    return () => {
      isMounted = false
      unsubscribe()
    }
  }, [])

  useEffect(() => {
    const videoElement = videoRef.current
    if (videoElement) {
      videoElement.srcObject = cameraStream
    }

    return () => {
      if (videoElement?.srcObject === cameraStream) {
        videoElement.srcObject = null
      }
    }
  }, [cameraStream])

  async function handleCameraRequest() {
    if (requestInProgressRef.current || cameraStreamRef.current) {
      return
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraStatus('error')
      setCameraError('Camera access is not available in this environment.')
      return
    }

    requestInProgressRef.current = true
    const requestId = ++cameraRequestRef.current
    setCameraStatus('requesting')
    setCameraError('')

    try {
      // Ask for video only, and only after the user presses the permission button.
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false,
      })

      if (!mountedRef.current || requestId !== cameraRequestRef.current) {
        stream.getTracks().forEach((track) => track.stop())
        return
      }

      if (!stream.getVideoTracks().some((track) => track.readyState === 'live')) {
        stream.getTracks().forEach((track) => track.stop())
        setCameraStatus('error')
        setCameraError('No active camera video track was received. Please try again.')
        return
      }

      cameraStreamRef.current = stream
      stream.getTracks().forEach((track) => {
        track.onended = () => {
          if (cameraStreamRef.current !== stream) {
            return
          }

          stream.getTracks().forEach((streamTrack) => {
            streamTrack.onended = null
            streamTrack.stop()
          })
          cameraStreamRef.current = null
          setCameraStream(null)
          setCameraStatus('error')
          setCameraError('The camera stream ended. Please request permission again.')
        }
      })
      setCameraStream(stream)
      setCameraStatus('granted')
    } catch (error) {
      if (mountedRef.current && requestId === cameraRequestRef.current) {
        if (error?.name === 'NotAllowedError' || error?.name === 'SecurityError') {
          setCameraStatus('denied')
          setCameraError(
            'Camera permission was denied. Check your device permissions and try again.',
          )
        } else {
          setCameraStatus('error')
          setCameraError(
            error?.name === 'NotFoundError'
              ? 'No camera was found. Connect a camera and try again.'
              : 'The camera could not be started. Check that it is connected and not in use.',
          )
        }
      }
    } finally {
      if (requestId === cameraRequestRef.current) {
        requestInProgressRef.current = false
      }
    }
  }

  function handleStopCamera() {
    cameraRequestRef.current += 1
    requestInProgressRef.current = false

    const stream = cameraStreamRef.current
    cameraStreamRef.current = null
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    stream?.getTracks().forEach((track) => {
      track.onended = null
      track.stop()
    })

    setCameraStream(null)
    setCameraStatus('not-requested')
    setCameraError('')
  }

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
    if (!desktopApi?.showExamRules) {
      setDesktopMessage('Native exam rules are available in the desktop app.')
      return
    }

    try {
      await desktopApi.showExamRules()
      setDesktopMessage('Exam rules acknowledged.')
    } catch {
      setDesktopMessage('Could not show exam rules. Please try again.')
    }
  }

  async function handleFullscreenClick() {
    if (!desktopApi?.setFullscreen) {
      setDesktopMessage('Fullscreen controls are available in the desktop app.')
      return
    }

    try {
      await desktopApi.setFullscreen(!isFullscreen)
    } catch {
      setDesktopMessage('Could not change fullscreen mode. Please try again.')
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
        <div className="topbar-actions">
          <span className="environment-label">
            <span aria-hidden="true" className="environment-dot" />
            Exam environment
          </span>
          <button
            aria-pressed={isFullscreen}
            className="fullscreen-button"
            disabled={!desktopAvailable}
            onClick={handleFullscreenClick}
            type="button"
          >
            {isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
          </button>
        </div>
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

          <div
            aria-live="polite"
            className={`permission-status permission-status--${cameraStatus}`}
            role="status"
          >
            <span aria-hidden="true" className="status-indicator" />
            <span>
              {cameraStatus === 'not-requested' && 'Not requested'}
              {cameraStatus === 'requesting' && 'Requesting camera permission…'}
              {cameraStatus === 'granted' && 'Camera permission granted'}
              {cameraStatus === 'denied' && 'Camera access denied'}
              {cameraStatus === 'error' && 'Camera error'}
            </span>
          </div>

          <div className="camera-preview">
            <video
              aria-label="Live camera preview"
              autoPlay
              className="camera-video"
              hidden={!cameraStream}
              playsInline
              ref={videoRef}
              muted
            />
            {!cameraStream && (
              <div className="preview-placeholder">
                <CameraIcon />
                <span>Camera preview will appear after permission is granted.</span>
              </div>
            )}
          </div>

          {!isCameraActive && (
            <button
              className="button button-primary"
              disabled={cameraStatus === 'requesting'}
              onClick={handleCameraRequest}
              type="button"
            >
              <CameraIcon />
              {cameraStatus === 'requesting'
                ? 'Requesting Permission…'
                : 'Grant Camera Permission'}
            </button>
          )}
          {cameraError && (
            <p className="permission-notice" role="alert">
              {cameraError}
            </p>
          )}
          {isCameraActive && (
            <button className="button button-stop" onClick={handleStopCamera} type="button">
              Stop Camera
            </button>
          )}
          <button
            className="button button-secondary"
            disabled={!isCameraActive}
            type="button"
          >
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
            <button
              className="footer-action"
              disabled={!desktopAvailable}
              onClick={handleRulesClick}
              type="button"
            >
              View Exam Rules
            </button>
            <button
              className="footer-action"
              disabled={!desktopAvailable}
              onClick={handleAboutClick}
              type="button"
            >
              About this app
            </button>
          </div>
        </footer>
        {(desktopMessage || !desktopAvailable) && (
          <p aria-live="polite" className="desktop-message" role="status">
            {desktopMessage ||
              'Desktop controls are available when you open Newton Athena as a desktop app.'}
          </p>
        )}
      </div>
    </main>
  )
}

export default App
