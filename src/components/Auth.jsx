import { useState } from 'react'
import { supabase } from '../lib/supabase'

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

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nome, setNome] = useState('')
  const [accettaTermini, setAccettaTermini] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [isForgotPassword, setIsForgotPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)

    if (isForgotPassword) {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'https://getbolly.app/#reset-password'
      })
      if (error) {
        setError(error.message)
      } else {
        setSuccess('Ti abbiamo inviato un\'email con il link per reimpostare la password.')
      }
      setLoading(false)
      return
    }

    if (isLogin) {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError(error.message)
    } else {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { nome } }
      })
      if (error) {
        setError(error.message)
      } else {
        // Genera e salva l'email dedicata Bolly nel profilo utente
        if (data.user) {
          const emailDedicata = generateEmailDedicata(nome, data.user.id)
          await supabase.from('profiles').upsert({
            id: data.user.id,
            email_dedicata: emailDedicata
          })
        }
        setSuccess('Registrazione completata! Controlla la tua email per confermare.')
      }
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
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