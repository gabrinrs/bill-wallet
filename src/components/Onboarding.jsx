// Onboarding.jsx — Welcome screens + guida primo contratto/bolletta per nuovi utenti Bolly

import { useState, useRef } from 'react'
import { Bell, Mail, ChevronRight, ChevronLeft, Sparkles, Check, Package, PenLine, HelpCircle } from 'lucide-react'
import { subscribeToPush } from '../lib/pushNotifications'
import { CATEGORIE, FORNITORI } from '../lib/categorie'
import { Zap, Flame, Droplets, Phone, Wifi, Shield, Tv, Repeat, CreditCard, Landmark } from 'lucide-react'

const IconMap = { Zap, Flame, Droplets, Phone, Wifi, Shield, Package, Tv, Repeat, CreditCard, Landmark }

function Tooltip({ text }) {
  return (
    <div className="flex items-start gap-2 mb-2 px-3 py-2 bg-bolly-50 border border-bolly-200 rounded-xl">
      <HelpCircle size={16} className="text-bolly-500 mt-0.5 flex-shrink-0" />
      <p className="text-xs text-bolly-700 leading-relaxed">{text}</p>
    </div>
  )
}

export default function Onboarding({ emailDedicata, userId, onComplete, onCreateContratto, onCreateBolletta }) {
  const [phase, setPhase] = useState('slides') // 'slides' | 'contratto' | 'bolletta' | 'done'
  const [step, setStep] = useState(0)
  const [pushLoading, setPushLoading] = useState(false)
  const [pushResult, setPushResult] = useState(null)

  // Form contratto guidato
  const [contrattoStep, setContrattoStep] = useState(0) // 0=categoria, 1=fornitore, 2=dettagli
  const [customMode, setCustomMode] = useState(false)
  const [customText, setCustomText] = useState('')
  const [contrattoForm, setContrattoForm] = useState({
    categoria: '', fornitore: '', intestatario: '', codice: '',
    metodo_ricezione: 'email', domiciliazione: false, data_inizio: '', data_fine: '', note: '',
    ricorrente: false, importo_ricorrente: '', frequenza: 'mensile', prossimo_addebito: '',
  })
  const [savingContratto, setSavingContratto] = useState(false)
  const [newContrattoId, setNewContrattoId] = useState(null)

  // Form bolletta guidata
  const [bollettaForm, setBollettaForm] = useState({
    importo: '', scadenza: '', periodo: '', metodo_pagamento: null,
  })
  const [savingBolletta, setSavingBolletta] = useState(false)

  const updateContratto = (f, v) => setContrattoForm(p => ({ ...p, [f]: v }))
  const updateBolletta = (f, v) => setBollettaForm(p => ({ ...p, [f]: v }))

  const handleActivatePush = async () => {
    setPushLoading(true)
    const success = await subscribeToPush(userId)
    setPushResult(success ? 'ok' : 'denied')
    setPushLoading(false)
  }

  const handleSkipPush = () => setPushResult('denied')

  const handleFinish = () => {
    localStorage.setItem('bolly_onboarding_done', 'true')
    onComplete()
  }

  const handleSaveContratto = async () => {
    setSavingContratto(true)
    try {
      const data = { ...contrattoForm }
      if (data.ricorrente) data.importo_ricorrente = parseFloat(data.importo_ricorrente)
      else { delete data.importo_ricorrente; delete data.frequenza; delete data.prossimo_addebito; delete data.data_fine }
      const result = await onCreateContratto(data)
      setNewContrattoId(result?.id || result)
      setPhase('bolletta')
    } catch (e) { console.error(e) }
    setSavingContratto(false)
  }

  const handleSaveBolletta = async () => {
    setSavingBolletta(true)
    try {
      await onCreateBolletta({
        contratto_id: newContrattoId,
        importo: parseFloat(bollettaForm.importo),
        scadenza: bollettaForm.scadenza,
        periodo: bollettaForm.periodo ? bollettaForm.periodo + '-01' : null,
        metodo_pagamento: bollettaForm.metodo_pagamento,
        fonte: 'manuale',
        stato_elaborazione: 'ok',
      })
      setPhase('done')
    } catch (e) { console.error(e) }
    setSavingBolletta(false)
  }

  // ========================
  // PHASE: SLIDES (le 3 originali)
  // ========================
  if (phase === 'slides') {
    const slides = [
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
            <button onClick={handleActivatePush} disabled={pushLoading}
              className="w-full py-3.5 rounded-xl font-semibold text-white shadow-sm transition-all active:scale-[0.98]"
              style={{ background: 'linear-gradient(145deg, #00897B, #00695C)' }}>
              {pushLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Attivazione...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2"><Bell size={18} />Attiva le notifiche</span>
              )}
            </button>
            <button onClick={handleSkipPush} className="w-full mt-3 py-2 text-gray-400 text-sm font-medium">Non ora, grazie</button>
          </>
        )}
        {pushResult === 'ok' && (
          <div className="w-full bg-green-50 border border-green-200 rounded-xl p-4 text-green-700 font-medium">
            <span className="flex items-center justify-center gap-2"><Sparkles size={18} />Notifiche attivate!</span>
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
    const canProceed = isLastSlide && pushResult !== null

    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <div className="flex justify-end px-6 pt-4">
          <button onClick={handleFinish} className="text-gray-400 text-sm font-medium px-3 py-1">Salta</button>
        </div>

        <div className="flex-1 flex items-center justify-center">{slides[step]}</div>

        <div className="px-8 pb-10 pt-4">
          <div className="flex items-center justify-center gap-2 mb-6">
            {[...slides, 'contratto', 'bolletta'].map((_, i) => (
              <div key={i} className={`h-2 rounded-full transition-all duration-300 ${i === step ? 'w-8 bg-bolly-500' : 'w-2 bg-gray-200'}`} />
            ))}
          </div>

          {isLastSlide ? (
            <button onClick={() => setPhase('contratto')} disabled={!canProceed}
              className={`w-full py-3.5 rounded-xl font-semibold text-white shadow-sm transition-all active:scale-[0.98] flex items-center justify-center gap-2 ${!canProceed ? 'opacity-40' : ''}`}
              style={{ background: 'linear-gradient(145deg, #00897B, #00695C)' }}>
              Avanti <ChevronRight size={18} />
            </button>
          ) : (
            <button onClick={() => setStep(s => s + 1)}
              className="w-full py-3.5 rounded-xl font-semibold text-white shadow-sm transition-all active:scale-[0.98] flex items-center justify-center gap-2"
              style={{ background: 'linear-gradient(145deg, #00897B, #00695C)' }}>
              Avanti <ChevronRight size={18} />
            </button>
          )}
        </div>
      </div>
    )
  }

  // ========================
  // PHASE: CONTRATTO GUIDATO
  // ========================
  if (phase === 'contratto') {
    const totalDots = 5 // 3 slides + contratto + bolletta
    const currentDot = 3

    // Step 0: Categoria
    if (contrattoStep === 0) {
      return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
          <div className="flex justify-end px-6 pt-4">
            <button onClick={handleFinish} className="text-gray-400 text-sm font-medium px-3 py-1">Salta</button>
          </div>
          <div className="flex-1 px-6 pt-2 pb-6 overflow-y-auto">
            <div className="text-center mb-6">
              <h1 className="text-xl font-bold text-gray-900 mb-1">Aggiungiamo il tuo primo contratto!</h1>
              <p className="text-sm text-gray-500">Ci vogliono meno di 30 secondi</p>
            </div>
            <Tooltip text="Che tipo di spesa vuoi aggiungere? Seleziona la categoria che più si avvicina al tuo contratto." />
            <div className="grid grid-cols-2 gap-3 mt-3">
              {CATEGORIE.map(cat => {
                const Icon = IconMap[cat.icon] || Package
                return (
                  <div key={cat.id}
                    onClick={() => { updateContratto('categoria', cat.id); setCustomMode(cat.freeText || false); setCustomText(''); setContrattoStep(1) }}
                    className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center cursor-pointer active:scale-[0.98] transition-transform">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: cat.color + '18' }}>
                        <Icon size={24} style={{ color: cat.color }} />
                      </div>
                      <p className="font-medium text-gray-900">{cat.label}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
          <div className="px-8 pb-10 pt-4">
            <div className="flex items-center justify-center gap-2">
              {Array.from({ length: totalDots }).map((_, i) => (
                <div key={i} className={`h-2 rounded-full transition-all duration-300 ${i === currentDot ? 'w-8 bg-bolly-500' : 'w-2 bg-gray-200'}`} />
              ))}
            </div>
          </div>
        </div>
      )
    }

    // Step 1: Fornitore
    if (contrattoStep === 1) {
      const catInfo = CATEGORIE.find(c => c.id === contrattoForm.categoria)
      const fornitori = FORNITORI[contrattoForm.categoria] || []

      if (catInfo?.freeText || customMode) {
        return (
          <div className="min-h-screen bg-gray-50 flex flex-col">
            <div className="flex justify-end px-6 pt-4">
              <button onClick={handleFinish} className="text-gray-400 text-sm font-medium px-3 py-1">Salta</button>
            </div>
            <div className="flex-1 px-6 pt-2 pb-6">
              <div className="flex items-center gap-3 mb-4">
                <button onClick={() => catInfo?.freeText ? setContrattoStep(0) : setCustomMode(false)} className="p-2 -ml-2 rounded-xl hover:bg-gray-100"><ChevronLeft size={22} className="text-gray-600" /></button>
                <h1 className="text-xl font-bold text-gray-900">Cosa devi pagare?</h1>
              </div>
              <Tooltip text="Scrivi il nome del fornitore o una descrizione del pagamento." />
              <div className="space-y-3 mt-3">
                <input type="text" value={customText} onChange={e => setCustomText(e.target.value)} placeholder={catInfo?.placeholder || 'Nome fornitore o descrizione...'} autoFocus
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-bolly-500 focus:border-transparent outline-none text-base" />
                <button onClick={() => { updateContratto('fornitore', customText); setContrattoStep(2) }} disabled={!customText.trim()}
                  className="w-full py-3 bg-bolly-500 text-white rounded-xl font-semibold disabled:opacity-40">Continua</button>
              </div>
            </div>
          </div>
        )
      }

      return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
          <div className="flex justify-end px-6 pt-4">
            <button onClick={handleFinish} className="text-gray-400 text-sm font-medium px-3 py-1">Salta</button>
          </div>
          <div className="flex-1 px-6 pt-2 pb-6 overflow-y-auto">
            <div className="flex items-center gap-3 mb-4">
              <button onClick={() => setContrattoStep(0)} className="p-2 -ml-2 rounded-xl hover:bg-gray-100"><ChevronLeft size={22} className="text-gray-600" /></button>
              <h1 className="text-xl font-bold text-gray-900">Seleziona fornitore</h1>
            </div>
            <Tooltip text="Chi è il fornitore di questo contratto? Scegli dalla lista o scrivi un nome personalizzato." />
            <div className="space-y-2 mt-3">
              {fornitori.map(f => (
                <div key={f} onClick={() => { updateContratto('fornitore', f); setContrattoStep(2) }}
                  className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 cursor-pointer active:scale-[0.98] transition-transform">
                  <p className="font-medium text-gray-900">{f}</p>
                </div>
              ))}
              <div onClick={() => setCustomMode(true)}
                className="bg-white rounded-2xl border-dashed border-2 border-gray-200 p-4 cursor-pointer">
                <div className="flex items-center gap-2 text-gray-500"><PenLine size={18} /><p className="font-medium">Scrivi nome personalizzato...</p></div>
              </div>
            </div>
          </div>
        </div>
      )
    }

    // Step 2: Dettagli contratto
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <div className="flex justify-end px-6 pt-4">
          <button onClick={handleFinish} className="text-gray-400 text-sm font-medium px-3 py-1">Salta</button>
        </div>
        <div className="flex-1 px-6 pt-2 pb-6 overflow-y-auto">
          <div className="flex items-center gap-3 mb-4">
            <button onClick={() => setContrattoStep(1)} className="p-2 -ml-2 rounded-xl hover:bg-gray-100"><ChevronLeft size={22} className="text-gray-600" /></button>
            <h1 className="text-xl font-bold text-gray-900">Dettagli contratto</h1>
          </div>

          <Tooltip text="Compila i dettagli del tuo contratto. Solo la domiciliazione è importante, il resto è opzionale." />

          <div className="space-y-4 mt-3">
            <div>
              <Tooltip text="A chi è intestato il contratto? Di solito il tuo nome e cognome." />
              <label className="block text-sm font-medium text-gray-700 mb-1">Intestatario</label>
              <input type="text" value={contrattoForm.intestatario} onChange={e => updateContratto('intestatario', e.target.value)} placeholder="Nome e cognome"
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-bolly-500 focus:border-transparent outline-none" />
            </div>

            <div>
              <Tooltip text="Lo trovi sulla bolletta. Non è obbligatorio, puoi aggiungerlo dopo." />
              <label className="block text-sm font-medium text-gray-700 mb-1">Codice cliente / N° contratto</label>
              <input type="text" value={contrattoForm.codice} onChange={e => updateContratto('codice', e.target.value)} placeholder="Opzionale"
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-bolly-500 focus:border-transparent outline-none" />
            </div>

            <div>
              <Tooltip text="Come ricevi le bollette di questo contratto?" />
              <label className="block text-sm font-medium text-gray-700 mb-1">Ricezione bollette</label>
              <div className="flex gap-2">
                {['email', 'portale', 'cartaceo'].map(m => (
                  <button key={m} onClick={() => updateContratto('metodo_ricezione', m)}
                    className={`flex-1 py-2 px-3 rounded-xl text-sm font-medium border transition-colors ${contrattoForm.metodo_ricezione === m ? 'bg-bolly-50 border-bolly-300 text-bolly-600' : 'border-gray-200 text-gray-600'}`}>
                    {m.charAt(0).toUpperCase() + m.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Tooltip text="Se il pagamento viene addebitato in automatico sul conto, attiva questa opzione." />
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">Domiciliazione bancaria</label>
                <button onClick={() => updateContratto('domiciliazione', !contrattoForm.domiciliazione)} className={`w-12 h-7 rounded-full transition-colors ${contrattoForm.domiciliazione ? 'bg-bolly-500' : 'bg-gray-300'}`}>
                  <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${contrattoForm.domiciliazione ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data inizio</label>
              <input type="date" value={contrattoForm.data_inizio} onChange={e => updateContratto('data_inizio', e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-bolly-500 focus:border-transparent outline-none bg-white text-gray-900"
                style={{ WebkitAppearance: 'none', minHeight: '44px', colorScheme: 'light' }} />
            </div>

            {/* Ricorrente */}
            <div className="pt-2 border-t border-gray-100">
              <Tooltip text="Attiva se paghi sempre lo stesso importo (es. abbonamento Netflix, rata finanziamento). Bolly ti avviserà prima di ogni scadenza." />
              <div className="flex items-center justify-between">
                <div><label className="text-sm font-medium text-gray-700">Importo fisso ricorrente</label><p className="text-xs text-gray-400 mt-0.5">Per abbonamenti e spese a importo fisso</p></div>
                <button onClick={() => updateContratto('ricorrente', !contrattoForm.ricorrente)} className={`w-12 h-7 rounded-full transition-colors ${contrattoForm.ricorrente ? 'bg-pink-500' : 'bg-gray-300'}`}>
                  <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${contrattoForm.ricorrente ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>
              {contrattoForm.ricorrente && (
                <div className="mt-3 space-y-3 p-3 bg-pink-50 rounded-xl">
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Importo (€)</label>
                    <input type="number" step="0.01" value={contrattoForm.importo_ricorrente} onChange={e => updateContratto('importo_ricorrente', e.target.value)} placeholder="es. 13.99"
                      className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-pink-500 focus:border-transparent outline-none" />
                  </div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Frequenza</label>
                    <div className="flex gap-2">
                      {[{ id: 'mensile', l: 'Mensile' }, { id: 'trimestrale', l: 'Trimestrale' }, { id: 'annuale', l: 'Annuale' }].map(f => (
                        <button key={f.id} onClick={() => updateContratto('frequenza', f.id)}
                          className={`flex-1 py-2 rounded-xl text-sm font-medium border ${contrattoForm.frequenza === f.id ? 'bg-pink-100 border-pink-300 text-pink-700' : 'border-gray-200 text-gray-600'}`}>{f.l}</button>
                      ))}
                    </div>
                  </div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Prossimo addebito</label>
                    <input type="date" value={contrattoForm.prossimo_addebito} onChange={e => updateContratto('prossimo_addebito', e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-pink-500 focus:border-transparent outline-none bg-white text-gray-900"
                      style={{ WebkitAppearance: 'none', minHeight: '44px', colorScheme: 'light' }} />
                  </div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Data fine (opzionale)</label>
                    <input type="date" value={contrattoForm.data_fine} onChange={e => updateContratto('data_fine', e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-pink-500 focus:border-transparent outline-none bg-white text-gray-900"
                      style={{ WebkitAppearance: 'none', minHeight: '44px', colorScheme: 'light' }} />
                    <p className="text-xs text-gray-400 mt-1">{contrattoForm.categoria === 'finanziamento' ? 'Quando termina il piano di rimborso' : 'Quando scade il contratto'}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <button onClick={handleSaveContratto} disabled={savingContratto || !contrattoForm.fornitore}
            className="w-full py-3 mt-6 bg-bolly-500 text-white font-semibold rounded-xl disabled:opacity-40 active:scale-[0.98] transition-transform">
            {savingContratto ? 'Salvataggio...' : 'Salva contratto'}
          </button>
        </div>

        <div className="px-8 pb-10 pt-4">
          <div className="flex items-center justify-center gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className={`h-2 rounded-full transition-all duration-300 ${i === 3 ? 'w-8 bg-bolly-500' : 'w-2 bg-gray-200'}`} />
            ))}
          </div>
        </div>
      </div>
    )
  }

  // ========================
  // PHASE: BOLLETTA MANUALE GUIDATA
  // ========================
  if (phase === 'bolletta') {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <div className="flex justify-end px-6 pt-4">
          <button onClick={handleFinish} className="text-gray-400 text-sm font-medium px-3 py-1">Salta</button>
        </div>
        <div className="flex-1 px-6 pt-2 pb-6 overflow-y-auto">
          <div className="text-center mb-6">
            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
              <Check size={24} className="text-green-600" />
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-1">Contratto salvato!</h1>
            <p className="text-sm text-gray-500">Ora aggiungiamo la prima bolletta</p>
          </div>

          <Tooltip text="Inserisci i dati dell'ultima bolletta che hai ricevuto per questo contratto. Così Bolly saprà quando scade il prossimo pagamento." />

          <div className="space-y-4 mt-3">
            <div>
              <Tooltip text="Quanto devi pagare? Trovi l'importo sulla bolletta." />
              <label className="block text-sm font-medium text-gray-700 mb-1">Importo (€)</label>
              <input type="number" step="0.01" value={bollettaForm.importo} onChange={e => updateBolletta('importo', e.target.value)} placeholder="es. 85.50"
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-bolly-500 focus:border-transparent outline-none" />
            </div>

            <div>
              <Tooltip text="Entro quando va pagata? La trovi sulla bolletta." />
              <label className="block text-sm font-medium text-gray-700 mb-1">Scadenza</label>
              <input type="date" value={bollettaForm.scadenza} onChange={e => updateBolletta('scadenza', e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-bolly-500 focus:border-transparent outline-none bg-white text-gray-900"
                style={{ WebkitAppearance: 'none', minHeight: '44px', colorScheme: 'light' }} />
            </div>

            <div>
              <Tooltip text="A che mese si riferisce? Ad esempio, una bolletta della luce potrebbe coprire marzo-aprile." />
              <label className="block text-sm font-medium text-gray-700 mb-1">Periodo di riferimento</label>
              <input type="month" value={bollettaForm.periodo} onChange={e => updateBolletta('periodo', e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-bolly-500 focus:border-transparent outline-none bg-white text-gray-900"
                style={{ WebkitAppearance: 'none', minHeight: '44px', colorScheme: 'light' }} />
            </div>

            <div>
              <Tooltip text="Come paghi questa bolletta? Scegli il metodo." />
              <label className="block text-sm font-medium text-gray-700 mb-1">Metodo di pagamento</label>
              <div className="flex gap-2 flex-wrap">
                {[{ id: 'rid', l: 'RID' }, { id: 'bollettino', l: 'Bollettino' }, { id: 'manuale', l: 'Manuale' }].map(m => (
                  <button key={m.id} onClick={() => updateBolletta('metodo_pagamento', m.id)}
                    className={`flex-1 py-2 px-3 rounded-xl text-sm font-medium border transition-colors ${bollettaForm.metodo_pagamento === m.id ? 'bg-bolly-50 border-bolly-300 text-bolly-600' : 'border-gray-200 text-gray-600'}`}>
                    {m.l}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button onClick={handleSaveBolletta} disabled={savingBolletta || !bollettaForm.importo || !bollettaForm.scadenza}
            className="w-full py-3 mt-6 bg-bolly-500 text-white font-semibold rounded-xl disabled:opacity-40 active:scale-[0.98] transition-transform">
            {savingBolletta ? 'Salvataggio...' : 'Salva bolletta'}
          </button>
        </div>

        <div className="px-8 pb-10 pt-4">
          <div className="flex items-center justify-center gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className={`h-2 rounded-full transition-all duration-300 ${i === 4 ? 'w-8 bg-bolly-500' : 'w-2 bg-gray-200'}`} />
            ))}
          </div>
        </div>
      </div>
    )
  }

  // ========================
  // PHASE: DONE
  // ========================
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-8">
      <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mb-6">
        <Check size={40} className="text-green-600" />
      </div>
      <h1 className="text-2xl font-bold text-gray-900 mb-3 text-center">Tutto pronto!</h1>
      <p className="text-gray-500 text-center leading-relaxed mb-8">
        Il tuo primo contratto e la tua prima bolletta sono stati salvati. Bolly ti avviserà prima di ogni scadenza.
      </p>
      <button onClick={handleFinish}
        className="w-full py-3.5 rounded-xl font-semibold text-white shadow-sm transition-all active:scale-[0.98]"
        style={{ background: 'linear-gradient(145deg, #00897B, #00695C)' }}>
        Vai alla Dashboard
      </button>
    </div>
  )
}