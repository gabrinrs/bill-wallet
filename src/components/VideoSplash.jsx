import { useEffect, useRef, useState } from 'react'

/**
 * Video splash Bolly.
 * - Parte all'avvio dell'app (autoplay muted).
 * - Aspetta che il video finisca E che i dati siano pronti (dataReady).
 * - Quando entrambe le condizioni sono vere, slide verso sinistra rivelando la home.
 *
 * File video: /public/splash.mp4 (= URL "/splash.mp4" a runtime).
 *
 * FALLBACK BRAND (no pulsante play):
 * Sotto il video c'è SEMPRE lo splash statico del brand (teal + logo + "Bolly").
 * Il video parte invisibile e compare solo quando inizia DAVVERO a riprodursi
 * (onPlaying). Se iOS blocca l'autoplay (es. Risparmio energetico), il video
 * resta invisibile e l'utente vede il brand statico — mai l'icona play di iOS.
 *
 * Failsafe: se il video non parte, dopo MAX_WAIT ms usciamo comunque.
 */
const MAX_WAIT = 6000   // ms — failsafe se il video non parte
const MIN_SHOW = 800    // ms — durata minima per evitare flash

export default function VideoSplash({ dataReady = false, onDone }) {
  const videoRef = useRef(null)
  const [videoEnded, setVideoEnded] = useState(false)
  const [videoPlaying, setVideoPlaying] = useState(false) // true solo quando il video parte davvero
  const [exiting, setExiting] = useState(false)
  const [canShowMin, setCanShowMin] = useState(false)

  // tieni onDone in una ref così non destabilizza gli useEffect:
  // se App rerenderizza, onDone cambia identità e cancellerebbe il setTimeout.
  const onDoneRef = useRef(onDone)
  useEffect(() => { onDoneRef.current = onDone }, [onDone])

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

  // prova a far partire il video.
  // IMPORTANTE: forziamo .muted = true via JS perché React non applica sempre
  // l'attributo `muted` al DOM, e iOS autoplaya solo i video realmente muti.
  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    v.muted = true
    const p = v.play()
    if (p && typeof p.catch === 'function') {
      p.catch(() => {
        // autoplay bloccato (es. Risparmio energetico) → resta il brand statico,
        // e consideriamo subito il video "finito" per non bloccare l'uscita.
        setVideoEnded(true)
      })
    }
  }, [])

  // quando entrambe le condizioni sono vere → avvia uscita slide-left
  useEffect(() => {
    if (videoEnded && dataReady && canShowMin && !exiting) {
      setExiting(true)
    }
  }, [videoEnded, dataReady, canShowMin, exiting])

  // separato: parte solo quando exiting diventa true. Niente onDone in deps.
  useEffect(() => {
    if (!exiting) return
    const t = setTimeout(() => onDoneRef.current?.(), 700) // = durata transition CSS
    return () => clearTimeout(t)
  }, [exiting])

  return (
    <div
      className={`video-splash ${exiting ? 'video-splash--out' : ''}`}
      aria-hidden="true"
    >
      {/* FALLBACK BRAND STATICO — sempre sotto al video.
          Visibile finché il video non compare (o per sempre se l'autoplay è bloccato). */}
      <div className="video-splash__brand">
        <svg className="video-splash__logo" viewBox="0 0 90 75" width="84" height="70">
          <line x1="45" y1="2" x2="45" y2="12" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="45" cy="2" r="2.5" fill="white" />
          <path
            d="M 12 18 Q 12 10 22 10 L 68 10 Q 78 10 78 20 L 78 42 Q 78 52 68 52 L 48 52 L 38 62 L 38 52 L 22 52 Q 12 52 12 42 Z"
            fill="white"
          />
          <circle cx="34" cy="30" r="3" fill="#00897B" />
          <circle cx="56" cy="30" r="3" fill="#00897B" />
          <path d="M 34 38 Q 45 46 56 38" stroke="#00897B" strokeWidth="2.2" fill="none" strokeLinecap="round" />
        </svg>
        <div className="video-splash__wordmark">Bolly</div>
      </div>

      <video
        ref={videoRef}
        className={`video-splash__video ${videoPlaying ? 'is-playing' : ''}`}
        src="/splash.mp4"
        autoPlay
        muted
        playsInline
        preload="auto"
        onPlaying={() => setVideoPlaying(true)}
        onEnded={() => setVideoEnded(true)}
        onError={() => setVideoEnded(true)}
      />

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Pacifico&display=swap');

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
          pointer-events: none;
        }

        /* brand statico di fallback */
        .video-splash__brand {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 14px;
          background: linear-gradient(160deg, #00897B 0%, #00695C 100%);
        }
        .video-splash__logo {
          filter: drop-shadow(0 4px 12px rgba(0,0,0,0.12));
        }
        .video-splash__wordmark {
          font-family: 'Pacifico', cursive;
          font-size: clamp(40px, 12vw, 56px);
          color: #ffffff;
          line-height: 1;
          letter-spacing: -1px;
        }

        /* video: invisibile finché non parte DAVVERO → niente icona play */
        .video-splash__video {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          background: transparent;
          opacity: 0;
          transition: opacity 0.25s ease-in;
        }
        .video-splash__video.is-playing {
          opacity: 1;
        }

        @media (prefers-reduced-motion: reduce) {
          .video-splash { transition: opacity 0.3s ease-out; }
          .video-splash--out { transform: none; opacity: 0; }
        }
      `}</style>
    </div>
  )
}
