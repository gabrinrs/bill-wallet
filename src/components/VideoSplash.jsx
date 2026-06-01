import { useEffect, useRef, useState } from 'react'

/**
 * Video splash Bolly.
 * - Parte all'avvio dell'app (autoplay muted).
 * - Aspetta che il video finisca E che i dati siano pronti (dataReady).
 * - Quando entrambe le condizioni sono vere, slide verso sinistra rivelando la home.
 *
 * File video: /public/splash.mp4 (= URL "/splash.mp4" a runtime).
 *
 * Fallback: se autoplay è bloccato o il video non parte, dopo MAX_WAIT ms
 * forziamo comunque l'uscita per non bloccare l'utente.
 */
const MAX_WAIT = 6000   // ms — failsafe se il video non parte
const MIN_SHOW = 800    // ms — durata minima per evitare flash

export default function VideoSplash({ dataReady = false, onDone }) {
  const videoRef = useRef(null)
  const mountedAt = useRef(Date.now())
  const [videoEnded, setVideoEnded] = useState(false)
  const [exiting, setExiting] = useState(false)
  const [canShowMin, setCanShowMin] = useState(false)

  // garantisce una durata minima
  useEffect(() => {
    const t = setTimeout(() => setCanShowMin(true), MIN_SHOW)
    return () => clearTimeout(t)
  }, [])

  // failsafe globale: dopo MAX_WAIT esci comunque
  useEffect(() => {
    const t = setTimeout(() => setVideoEnded(true), MAX_WAIT)
    return () => clearTimeout(t)
  }, [])

  // prova a far partire il video (su alcuni browser autoPlay+muted basta,
  // ma chiamiamo play() esplicitamente per gestire eventuali errori)
  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    const p = v.play()
    if (p && typeof p.catch === 'function') {
      p.catch(() => {
        // autoplay bloccato → consideriamo subito il video "finito"
        setVideoEnded(true)
      })
    }
  }, [])

  // quando entrambe le condizioni sono vere → avvia uscita slide-left
  useEffect(() => {
    if (videoEnded && dataReady && canShowMin && !exiting) {
      setExiting(true)
      const t = setTimeout(() => onDone?.(), 700) // = durata transition CSS
      return () => clearTimeout(t)
    }
  }, [videoEnded, dataReady, canShowMin, exiting, onDone])

  return (
    <div
      className={`video-splash ${exiting ? 'video-splash--out' : ''}`}
      aria-hidden="true"
    >
      <video
        ref={videoRef}
        className="video-splash__video"
        src="/splash.mp4"
        autoPlay
        muted
        playsInline
        preload="auto"
        onEnded={() => setVideoEnded(true)}
        onError={() => setVideoEnded(true)}
      />

      <style>{`
        .video-splash {
          position: fixed;
          inset: 0;
          z-index: 9999;
          background: #ffffff;
          overflow: hidden;
          transform: translateX(0);
          transition: transform 0.7s cubic-bezier(0.65, 0, 0.35, 1);
          will-change: transform;
        }
        .video-splash--out {
          transform: translateX(-100%);
        }
        .video-splash__video {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          background: #ffffff;
        }
        @media (prefers-reduced-motion: reduce) {
          .video-splash { transition: opacity 0.3s ease-out; }
          .video-splash--out { transform: none; opacity: 0; }
        }
      `}</style>
    </div>
  )
}
