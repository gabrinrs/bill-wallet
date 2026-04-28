// Onboarding.jsx — Welcome screens per nuovi utenti Bolly

import { useState } from 'react'
import { Bell, Mail, ChevronRight, Sparkles } from 'lucide-react'
import { subscribeToPush } from '../lib/pushNotifications'

export default function Onboarding({ emailDedicata, userId, onComplete }) {
  const [step, setStep] = useState(0)
  const [pushLoading, setPushLoading] = useState(false)
  const [pushResult, setPushResult] = useState(null) // 'ok' | 'denied' | null

  const handleActivatePush = async () => {
    setPushLoading(true)
    const success = await subscribeToPush(userId)
    setPushResult(success ? 'ok' : 'denied')
    setPushLoading(false)
  }

  const handleSkipPush = () => {
    setPushResult('denied')
  }

  const handleFinish = () => {
    localStorage.setItem('bolly_onboarding_done', 'true')
    onComplete()
  }

  const slides = [
    // SLIDE 1 — Benvenuto
    <div key="welcome" className="flex flex-col items-center text-center px-8">
      <div className="w-20 h-20 rounded-2xl flex items-center justify-center mb-6 shadow-lg"
           style={{ background: 'linear-gradient(145deg, #00897B, #00695C)' }}>
        <span className="text-white font-pacifico"
              style={{ fontSize: '38px', transform: 'translateX(-3px)', display: 'block', lineHeight: 1 }}>B</span>
      </div>
      <h1 className="text-2xl font-bold text-gray-900 mb-3">Benvenuto su Bolly!</h1>
      <p className="text-gray-500 leading-relaxed">
        Bolly tiene traccia dei tuoi contratti e bollette in un unico posto.
        <br /><br />
        Aggiungi i tuoi contratti, ricevi le bollette e non dimenticare più nessuna scadenza.
      </p>
    </div>,

    // SLIDE 2 — Email dedicata
    <div key="email" className="flex flex-col items-center text-center px-8">
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6 bg-bolly-50">
        <Mail size={32} className="text-bolly-500" />
      </div>
      <h2 className="text-xl font-bold text-gray-900 mb-3">La tua email Bolly</h2>
      <p className="text-gray-500 leading-relaxed mb-5">
        Abbiamo creato un indirizzo email solo per te. Aggiungilo come destinatario delle bollette
        digitali dei tuoi fornitori.
      </p>
      {emailDedicata && (
        <div className="w-full bg-bolly-50 border border-bolly-100 rounded-xl p-4">
          <p className="text-xs text-gray-400 mb-1">Il tuo indirizzo Bolly</p>
          <p className="text-bolly-700 font-mono text-sm font-medium break-all">{emailDedicata}</p>
          <p className="text-xs text-gray-400 mt-2">Lo trovi sempre nella sezione Profilo</p>
        </div>
      )}
    </div>,

    // SLIDE 3 — Notifiche
    <div key="notifications" className="flex flex-col items-center text-center px-8">
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6 bg-bolly-50">
        <Bell size={32} className="text-bolly-500" />
      </div>
      <h2 className="text-xl font-bold text-gray-900 mb-3">Non perderti le scadenze</h2>
      <p className="text-gray-500 leading-relaxed mb-6">
        Attiva le notifiche per ricevere un promemoria quando arrivano bollette e prima di ogni scadenza.
      </p>

      {pushResult === null && (
        <>
          <button
            onClick={handleActivatePush}
            disabled={pushLoading}
            className="w-full py-3.5 rounded-xl font-semibold text-white shadow-sm transition-all active:scale-[0.98]"
            style={{ background: 'linear-gradient(145deg, #00897B, #00695C)' }}
          >
            {pushLoading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Attivazione...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <Bell size={18} />
                Attiva le notifiche
              </span>
            )}
          </button>
          <button
            onClick={handleSkipPush}
            className="w-full mt-3 py-2 text-gray-400 text-sm font-medium"
          >
            Non ora, grazie
          </button>
        </>
      )}

      {pushResult === 'ok' && (
        <div className="w-full bg-green-50 border border-green-200 rounded-xl p-4 text-green-700 font-medium">
          <span className="flex items-center justify-center gap-2">
            <Sparkles size={18} />
            Notifiche attivate!
          </span>
        </div>
      )}

      {pushResult === 'denied' && (
        <div className="w-full bg-amber-50 border border-amber-200 rounded-xl p-4 text-amber-700 text-sm">
          Nessun problema. Potrai attivare le notifiche in seguito dalle impostazioni del browser.
        </div>
      )}
    </div>
  ]

  const isLastSlide = step === slides.length - 1
  const canFinish = isLastSlide && pushResult !== null

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Skip in alto a destra (solo nelle prime 2 slide) */}
      {!isLastSlide && (
        <div className="flex justify-end px-6 pt-4">
          <button
            onClick={handleFinish}
            className="text-gray-400 text-sm font-medium px-3 py-1"
          >
            Salta
          </button>
        </div>
      )}
      {isLastSlide && <div className="pt-12" />}

      {/* Content */}
      <div className="flex-1 flex items-center justify-center">
        {slides[step]}
      </div>

      {/* Footer: dots + button */}
      <div className="px-8 pb-10 pt-4">
        {/* Progress dots */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {slides.map((_, i) => (
            <div
              key={i}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === step ? 'w-8 bg-bolly-500' : 'w-2 bg-gray-200'
              }`}
            />
          ))}
        </div>

        {/* Next / Finish button */}
        {isLastSlide ? (
          <button
            onClick={handleFinish}
            disabled={!canFinish}
            className={`w-full py-3.5 rounded-xl font-semibold text-white shadow-sm transition-all active:scale-[0.98] ${!canFinish ? 'opacity-40' : ''}`}
            style={{ background: 'linear-gradient(145deg, #00897B, #00695C)' }}
          >
            Inizia a usare Bolly
          </button>
        ) : (
          <button
            onClick={() => setStep(s => s + 1)}
            className="w-full py-3.5 rounded-xl font-semibold text-white shadow-sm transition-all active:scale-[0.98] flex items-center justify-center gap-2"
            style={{ background: 'linear-gradient(145deg, #00897B, #00695C)' }}
          >
            Avanti
            <ChevronRight size={18} />
          </button>
        )}
      </div>
    </div>
  )
}