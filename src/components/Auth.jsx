import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

// Se l'utente arriva da un link email scaduto o già usato, Supabase lo rimanda
// alla home con "#error_code=..." nell'indirizzo. Lo leggiamo subito al caricamento
// (prima che l'indirizzo venga ripulito) così App apre direttamente questa schermata.
const erroreLinkEmail = new URLSearchParams(window.location.hash.slice(1)).get('error_code')
export const arrivoDaLinkScaduto = !!erroreLinkEmail

// Traduce gli errori di Supabase (in inglese) in messaggi chiari in italiano
function messaggioErrore(error) {
  switch (error.code) {
    case 'email_not_confirmed': return 'Devi ancora confermare la tua email: apri il link che ti abbiamo mandato. Non lo trovi? Fattelo rimandare qui sotto.'
    case 'invalid_credentials': return 'Email o password non corrette.'
    case 'over_email_send_rate_limit': return 'Hai chiesto troppe email in poco tempo: aspetta qualche minuto e riprova.'
    case 'weak_password': return 'La password è troppo debole: usa almeno 6 caratteri.'
    case 'email_address_invalid': return 'Questo indirizzo email non sembra valido.'
    default: return error.message
  }
}

// Genera l'indirizzo email dedicato Bolly per il nuovo utente
// Formato: primeletteredelnoome_altrelettere.primecharsuid@mail.getbolly.app
// Esempio: gabri_re.5ff3@mail.getbolly.app
function generateEmailDedicata(nome, userId) {
  const cleanName = nome
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // rimuove accenti (è→e, à→a, ecc.)
    .replace(/[^a-z]/g, '')          // tiene solo lettere

  const paddedName = cleanName.padEnd(7, 'x') // padding se il nome è corto
  const namePart = paddedName.substring(0, 5) + '_' + paddedName.substring(5, 7)
  const uuidPart = userId.replace(/-/g, '').substring(0, 4)

  return `${namePart}.${uuidPart}@mail.getbolly.app`
}

export default function Auth({ onBack }) {
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nome, setNome] = useState('')
  const [accettaTermini, setAccettaTermini] = useState(false)
  const [codiceInvito, setCodiceInvito] = useState(() => localStorage.getItem('bolly_ref') || '')
  const [showPassword, setShowPassword] = useState(false)
  const [isForgotPassword, setIsForgotPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(arrivoDaLinkScaduto
    ? 'Questo link è scaduto o è già stato usato. Se stavi confermando la registrazione, scrivi la tua email qui sotto e te ne mandiamo uno nuovo.'
    : null)
  const [success, setSuccess] = useState(null)
  // Mostra il pulsante "Rimandami l'email di conferma"
  const [daConfermare, setDaConfermare] = useState(arrivoDaLinkScaduto)
  const [rimandando, setRimandando] = useState(false)

  // Ripulisce l'indirizzo dal codice d'errore del link, così non riappare
  useEffect(() => {
    if (!arrivoDaLinkScaduto) return
    window.history.replaceState({}, '', window.location.pathname)
    if (window.posthog) window.posthog.capture('link_conferma_scaduto', { codice: erroreLinkEmail })
  }, [])

  const rimandaConferma = async () => {
    if (!email) { setError('Scrivi qui sopra la tua email, poi tocca di nuovo il pulsante.'); return }
    setRimandando(true)
    setError(null)
    setSuccess(null)
    const { error } = await supabase.auth.resend({ type: 'signup', email })
    if (error) {
      setError(messaggioErrore(error))
    } else {
      setSuccess('Fatto! Ti abbiamo mandato una nuova email. Apri il link dell\'ultima email arrivata (quelle vecchie non funzionano più) e controlla anche lo spam.')
      if (window.posthog) window.posthog.capture('email_conferma_rimandata')
    }
    setRimandando(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)
    setDaConfermare(false)

    if (isForgotPassword) {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'https://getbolly.app/#reset-password'
      })
      if (error) {
        setError(messaggioErrore(error))
      } else {
        setSuccess('Ti abbiamo inviato un\'email con il link per reimpostare la password.')
      }
      setLoading(false)
      return
    }

    if (isLogin) {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        setError(messaggioErrore(error))
        if (error.code === 'email_not_confirmed') setDaConfermare(true)
      }
    } else {
      // Salva codice invito in localStorage (lo legge onAuthStateChange in App.jsx)
      const codice = codiceInvito.trim().toUpperCase()
      if (codice) localStorage.setItem('bolly_ref', codice)

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { nome } }
      })
      if (error) {
        setError(messaggioErrore(error))
      } else {
        // Genera e salva l'email dedicata Bolly nel profilo utente
        if (data.user) {
          const emailDedicata = generateEmailDedicata(nome, data.user.id)
          await supabase.from('profiles').upsert({
            id: data.user.id,
            email_dedicata: emailDedicata
          })
        }
        setSuccess('Registrazione completata! Ti abbiamo mandato un\'email: apri il link per confermare (se non la vedi, controlla lo spam). Se te ne arrivano più di una, usa sempre l\'ultima.')
        setDaConfermare(true)
        if (window.posthog) window.posthog.capture('registrazione')
      }
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        {/* Torna alla landing */}
        {onBack && (
          <button onClick={onBack} className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 mb-6 transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
            Torna alla home
          </button>
        )}
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg" style={{ background: 'linear-gradient(145deg, #00897B, #00695C)' }}>
            <span className="text-white font-pacifico" style={{ fontSize: '30px', transform: 'translateX(-2px)', display: 'block', lineHeight: 1 }}>B</span>
          </div>
          <h1 className="text-2xl font-pacifico text-bolly-500">Bolly</h1>
          <p className="text-gray-500 mt-1">Mai più scadenze dimenticate.</p>
        </div>

        {/* Form */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            {isForgotPassword ? 'Recupera password' : isLogin ? 'Accedi' : 'Registrati'}
          </h2>

          {isForgotPassword && (
            <p className="text-sm text-gray-500 mb-4">Inserisci la tua email e ti invieremo un link per reimpostare la password.</p>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && !isForgotPassword && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                <input
                  type="text"
                  value={nome}
                  onChange={e => setNome(e.target.value)}
                  placeholder="Il tuo nome"
                  required={!isLogin && !isForgotPassword}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-bolly-500 focus:border-transparent outline-none"
                />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="tu@email.com"
                required
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-bolly-500 focus:border-transparent outline-none"
              />
            </div>
            {!isForgotPassword && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Minimo 6 caratteri"
                    required
                    minLength={6}
                    className="w-full px-3 py-2.5 pr-11 rounded-xl border border-gray-200 focus:ring-2 focus:ring-bolly-500 focus:border-transparent outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/><path d="M14.12 14.12a3 3 0 1 1-4.24-4.24"/></svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    )}
                  </button>
                </div>
              </div>
            )}

            {isLogin && !isForgotPassword && (
              <div className="text-right">
                <button
                  type="button"
                  onClick={() => { setIsForgotPassword(true); setError(null); setSuccess(null) }}
                  className="text-sm text-bolly-500 font-medium"
                >
                  Password dimenticata?
                </button>
              </div>
            )}

            {!isLogin && !isForgotPassword && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Codice invito <span className="text-gray-400 font-normal">(opzionale)</span>
                </label>
                <input
                  type="text"
                  value={codiceInvito}
                  onChange={e => setCodiceInvito(e.target.value.toUpperCase())}
                  placeholder="Es. B7KP4R"
                  maxLength={10}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-bolly-500 focus:border-transparent outline-none font-mono tracking-widest uppercase"
                />
                {codiceInvito.length > 0 && (
                  <p className="text-xs mt-1" style={{ color: '#00897B' }}>🎁 Otterrai 2 mesi di Premium gratuito!</p>
                )}
              </div>
            )}

            {!isLogin && !isForgotPassword && (
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={accettaTermini}
                  onChange={e => setAccettaTermini(e.target.checked)}
                  className="mt-1 w-4 h-4 rounded border-gray-300 text-bolly-500 focus:ring-bolly-500"
                />
                <span className="text-xs text-gray-600 leading-relaxed">
                  Registrandomi, accetto i{' '}
                  <a href="https://getbolly.app" onClick={(e) => { e.preventDefault(); window.open('https://getbolly.app/#termini', '_blank') }} className="text-bolly-500 underline">Termini e Condizioni</a>
                  {' '}e la{' '}
                  <a href="https://www.iubenda.com/privacy-policy/40178798" target="_blank" rel="noopener noreferrer" className="text-bolly-500 underline">Privacy Policy</a>
                </span>
              </label>
            )}

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                {error}
              </div>
            )}
            {success && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-xl text-sm text-green-700">
                {success}
              </div>
            )}
            {daConfermare && !isForgotPassword && (
              <button
                type="button"
                onClick={rimandaConferma}
                disabled={rimandando}
                className="w-full py-2.5 border border-bolly-500 text-bolly-600 font-medium rounded-xl disabled:opacity-50 hover:bg-bolly-50 transition-colors"
              >
                {rimandando ? 'Invio in corso...' : 'Rimandami l\'email di conferma'}
              </button>
            )}

            <button
              type="submit"
              disabled={loading || (!isLogin && !isForgotPassword && !accettaTermini)}
              className="w-full py-3 bg-bolly-500 text-white font-semibold rounded-xl disabled:opacity-50 hover:bg-bolly-600 transition-colors"
            >
              {loading ? 'Attendere...' : isForgotPassword ? 'Invia link di recupero' : isLogin ? 'Accedi' : 'Registrati'}
            </button>
          </form>

          <div className="mt-4 text-center">
            {isForgotPassword ? (
              <button
                onClick={() => { setIsForgotPassword(false); setError(null); setSuccess(null) }}
                className="text-sm text-bolly-500 font-medium"
              >
                Torna al login
              </button>
            ) : (
              <button
                onClick={() => { setIsLogin(!isLogin); setError(null); setSuccess(null) }}
                className="text-sm text-bolly-500 font-medium"
              >
                {isLogin ? 'Non hai un account? Registrati' : 'Hai già un account? Accedi'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
