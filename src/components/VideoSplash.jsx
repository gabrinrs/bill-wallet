import { useEffect, useRef, useState } from 'react'

/**
 * Video splash Bolly.
 *
 * Comportamento:
 * - Telefono NORMALE: il video parte in autoplay (muted), poi quando finisce E
 *   i dati sono pronti (dataReady) → slide verso sinistra che rivela la home.
 * - Telefono in RISPARMIO ENERGETICO (o autoplay bloccato da iOS): non si mostra
 *   nessuno splash → si va DIRETTAMENTE in home (onDone immediato).
 *
 * Niente immagine/logo statico: lo sfondo resta neutro e il video compare solo
 * quando parte davvero (onPlaying), così non si vede nessun "lampo" prima del video.
 *
 * File video: /public/splash.mp4 (= URL "/splash.mp4" a runtime).
 */
const MAX_WAIT = 6000   // ms — failsafe: se non succede nulla, vai in home
const MIN_SHOW = 800    // ms — durata minima per evitare flash

export default function VideoSplash({ dataReady = false, onDone }) {
  const videoRef = useRef(null)
  const [videoEnded, setVideoEnded] = useState(false)
  const [videoPlaying, setVideoPlaying] = useState(false) // true solo quando il video parte davvero
  const [exiting, setExiting] = useState(false)
  const [canShowMin, setCanShowMin] = useState(false)

  // tieni onDone in una ref così non destabilizza gli useEffect:
  // se App rerenderizza, onDone cambia identità e cancellerebbe i timer.
  const onDoneRef = useRef(onDone)
  useEffect(() => { onDoneRef.current = onDone }, [onDone])

  // guardia: evita di chiudere lo splash due volte (skip + exit normale)
  const finishedRef = useRef(false)
  const skipToHome = () => {
    if (finishedRef.current) return
    finishedRef.current = true
    onDoneRef.current?.()
  }

  // garantisce una durata minima (solo per l'uscita normale con slide)
  useEffect(() => {
    const t = setTimeout(() => setCanShowMin(true), MIN_SHOW)
    return () => clearTimeout(t)
  }, [])

  // failsafe globale: se dopo MAX_WAIT non è successo nulla, vai in home
  useEffect(() => {
    const t = setTimeout(() => skipToHome(), MAX_WAIT)
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
        // La play() esplicita può essere rifiutata con AbortError perché l'attributo
        // autoPlay ha già avviato (o sta avviando) il video: NON è un blocco reale.
        // Quindi non decidiamo dal tipo di errore, ma dallo stato reale dell'elemento:
        // diamo un attimo e, se il video è davvero ancora in pausa, allora è bloccato
        // (es. Risparmio energetico) → andiamo dritti in home.
        setTimeout(() => {
          if (!finishedRef.current && videoRef.current && videoRef.current.paused) {
            skipToHome()
          }
        }, 250)
      })
    }
  }, [])

  // uscita NORMALE con slide: solo quando il video è davvero partito ed è finito,
  // i dati sono pronti e la durata minima è passata.
  useEffect(() => {
    if (videoPlaying && videoEnded && dataReady && canShowMin && !exiting && !finishedRef.current) {
      setExiting(true)
    }
  }, [videoPlaying, videoEnded, dataReady, canShowMin, exiting])

  // parte solo quando exiting diventa true. Niente onDone in deps.
  useEffect(() => {
    if (!exiting) return
    const t = setTimeout(() => skipToHome(), 700) // = durata transition CSS
    return () => clearTimeout(t)
  }, [exiting])

  return (
    <div
      className={`video-splash ${exiting ? 'video-splash--out' : ''}`}
      aria-hidden="true"
    >
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
        onError={() => skipToHome()}
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
          pointer-events: none;
        }

        /* video: invisibile finché non parte DAVVERO → niente lampi prima del video */
        .video-splash__video {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          background: #ffffff;
          opacity: 0;
          transition: opacity 0.2s ease-in;
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
