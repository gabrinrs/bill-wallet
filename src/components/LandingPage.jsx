import { useState } from 'react'
import { ChevronDown, Zap, Bell, CalendarDays, Camera, Shield, Star, ArrowRight, X } from 'lucide-react'

const FAQ_ITEMS = [
  {
    q: 'Bolly è gratuito?',
    a: 'Sì, Bolly è gratuito. Puoi gestire fino a 3 contratti senza pagare nulla.'
  },
  {
    q: 'Funziona su iPhone e Android?',
    a: 'Bolly è una web app che funziona su qualsiasi dispositivo con un browser. Puoi installarla come app direttamente dalla pagina di login, senza passare dallo store.'
  },
  {
    q: 'I miei dati sono al sicuro?',
    a: 'Assolutamente sì. I tuoi dati sono protetti con crittografia e salvati su server sicuri in Europa. Non condividiamo nulla con terze parti.'
  },
  {
    q: 'Come ricevo i promemoria?',
    a: 'Ricevi notifiche push direttamente sul telefono quando una scadenza si avvicina, così non dimentichi più nessun pagamento.'
  },
  {
    q: 'Posso tracciare anche le spese quotidiane?',
    a: 'Certo! Oltre alle bollette, puoi registrare le spese di tutti i giorni — anche scansionando gli scontrini con la fotocamera.'
  }
]

const FEATURES = [
  {
    icon: CalendarDays,
    title: 'Calendario scadenze',
    desc: 'Tutte le tue scadenze in un colpo d\'occhio. Mai più ritardi o dimenticanze.',
    color: '#00897B'
  },
  {
    icon: Bell,
    title: 'Promemoria smart',
    desc: 'Ricevi una notifica prima di ogni scadenza. Bolly pensa a ricordarti tutto.',
    color: '#FFA726'
  },
  {
    icon: Camera,
    title: 'Scansiona scontrini',
    desc: 'Fotografa uno scontrino e Bolly compila tutto in automatico grazie all\'AI.',
    color: '#FF7043'
  },
  {
    icon: Shield,
    title: 'Tutto in un posto',
    desc: 'Bollette, abbonamenti, assicurazioni, spese quotidiane. Un\'app per tutto.',
    color: '#5C6BC0'
  }
]

const REVIEWS = [
  {
    name: 'Elia',
    text: 'Fatta molto bene. Io usavo Google Calendar per le scadenze e un\'altra app per le spese, ma fatta malino. Con Bolly ho finalmente tutto in un posto solo.',
    stars: 5
  },
  {
    name: 'Mariachiara',
    text: 'Ho iniziato a usarla subito, molto intuitiva. In pochi minuti avevo già inserito i miei pagamenti.',
    stars: 5
  }
]

function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-b border-gray-200">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-4 text-left"
      >
        <span className="font-semibold text-gray-900 text-base pr-4">{q}</span>
        <ChevronDown
          size={20}
          className={`text-gray-400 flex-shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <p className="pb-4 text-gray-600 text-sm leading-relaxed">{a}</p>
      )}
    </div>
  )
}

function StarRating({ count }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: count }).map((_, i) => (
        <Star key={i} size={16} className="fill-amber-400 text-amber-400" />
      ))}
    </div>
  )
}

export default function LandingPage({ onGoToAuth }) {
  return (
    <div className="min-h-screen bg-white">

      {/* ── NAVBAR ── */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-5 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shadow-sm" style={{ background: 'linear-gradient(145deg, #00897B, #00695C)' }}>
              <span className="text-white font-pacifico text-lg" style={{ transform: 'translateX(-1.5px)', lineHeight: 1 }}>B</span>
            </div>
            <span className="font-pacifico text-xl text-[#00897B]">Bolly</span>
          </div>
          <button
            onClick={onGoToAuth}
            className="px-5 py-2 rounded-xl text-sm font-semibold text-[#00897B] border-2 border-[#00897B] hover:bg-[#00897B] hover:text-white transition-colors"
          >
            Accedi
          </button>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#f0f7f6] to-white" />
        <div className="relative max-w-5xl mx-auto px-5 pt-16 pb-12 text-center">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 leading-tight mb-4">
            Le tue bollette,<br />
            <span className="text-[#00897B]">finalmente sotto controllo.</span>
          </h1>
          <p className="text-lg text-gray-600 max-w-md mx-auto mb-8 leading-relaxed">
            Bolly ti ricorda ogni scadenza, tiene traccia delle spese e ti aiuta a non dimenticare più nessun pagamento.
          </p>
          <button
            onClick={onGoToAuth}
            className="inline-flex items-center gap-2 px-8 py-4 bg-[#00897B] hover:bg-[#00695C] text-white font-bold text-lg rounded-2xl shadow-lg shadow-[#00897B]/25 transition-all active:scale-[0.98]"
          >
            Provalo gratis
            <ArrowRight size={20} />
          </button>
          <p className="text-sm text-gray-400 mt-3">Nessuna carta richiesta</p>

          {/* Hero screenshot */}
          <div className="mt-12 flex justify-center">
            <div className="relative w-64 sm:w-72">
              <div className="rounded-[2rem] overflow-hidden shadow-2xl shadow-gray-300/50 border border-gray-200">
                <img
                  src="/screenshots/dashboard.png"
                  alt="Dashboard Bolly"
                  className="w-full"
                  loading="eager"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className="py-16 bg-white">
        <div className="max-w-5xl mx-auto px-5">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 text-center mb-3">
            Tutto quello che ti serve
          </h2>
          <p className="text-gray-500 text-center mb-10 max-w-md mx-auto">
            Gestisci bollette, scadenze e spese quotidiane in un'unica app semplice e intuitiva.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {FEATURES.map((f, i) => (
              <div
                key={i}
                className="p-6 rounded-2xl border border-gray-100 bg-gray-50/50 hover:shadow-md transition-shadow"
              >
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                  style={{ backgroundColor: f.color + '18' }}
                >
                  <f.icon size={24} style={{ color: f.color }} />
                </div>
                <h3 className="font-bold text-gray-900 text-lg mb-1.5">{f.title}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── COME FUNZIONA ── */}
      <section className="py-16 bg-[#f0f7f6]">
        <div className="max-w-5xl mx-auto px-5">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 text-center mb-3">
            Come funziona
          </h2>
          <p className="text-gray-500 text-center mb-12 max-w-md mx-auto">
            Tre passi e sei operativo. Sul serio.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            {/* Step 1 */}
            <div className="text-center">
              <div className="w-10 h-10 rounded-full bg-[#00897B] text-white font-bold text-lg flex items-center justify-center mx-auto mb-4">1</div>
              <div className="w-48 mx-auto mb-4 rounded-[1.5rem] overflow-hidden shadow-lg border border-gray-200">
                <img src="/screenshots/categorie.png" alt="Aggiungi contratti" className="w-full" loading="lazy" />
              </div>
              <h3 className="font-bold text-gray-900 mb-1">Aggiungi i tuoi contratti</h3>
              <p className="text-gray-500 text-sm">Luce, gas, telefono, affitto, abbonamenti — tutto in pochi tap.</p>
            </div>
            {/* Step 2 */}
            <div className="text-center">
              <div className="w-10 h-10 rounded-full bg-[#00897B] text-white font-bold text-lg flex items-center justify-center mx-auto mb-4">2</div>
              <div className="w-48 mx-auto mb-4 rounded-[1.5rem] overflow-hidden shadow-lg border border-gray-200">
                <img src="/screenshots/calendario.png" alt="Calendario scadenze" className="w-full" loading="lazy" />
              </div>
              <h3 className="font-bold text-gray-900 mb-1">Ricevi promemoria</h3>
              <p className="text-gray-500 text-sm">Bolly ti avvisa prima di ogni scadenza con una notifica sul telefono.</p>
            </div>
            {/* Step 3 */}
            <div className="text-center">
              <div className="w-10 h-10 rounded-full bg-[#00897B] text-white font-bold text-lg flex items-center justify-center mx-auto mb-4">3</div>
              <div className="w-48 mx-auto mb-4 rounded-[1.5rem] overflow-hidden shadow-lg border border-gray-200">
                <img src="/screenshots/spesa.png" alt="Traccia le spese" className="w-full" loading="lazy" />
              </div>
              <h3 className="font-bold text-gray-900 mb-1">Tutto sotto controllo</h3>
              <p className="text-gray-500 text-sm">Tieni traccia di ogni spesa e non perdi più il conto di nulla.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── RECENSIONI ── */}
      <section className="py-16 bg-white">
        <div className="max-w-5xl mx-auto px-5">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 text-center mb-3">
            Chi lo usa, lo consiglia
          </h2>
          <p className="text-gray-500 text-center mb-10 max-w-md mx-auto">
            Cosa dicono le persone che hanno provato Bolly.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 max-w-2xl mx-auto">
            {REVIEWS.map((r, i) => (
              <div
                key={i}
                className="p-6 rounded-2xl bg-gray-50 border border-gray-100"
              >
                <StarRating count={r.stars} />
                <p className="text-gray-700 mt-3 mb-4 text-sm leading-relaxed italic">"{r.text}"</p>
                <p className="font-semibold text-gray-900 text-sm">{r.name}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="py-16 bg-[#f0f7f6]">
        <div className="max-w-2xl mx-auto px-5">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 text-center mb-10">
            Domande frequenti
          </h2>
          <div className="bg-white rounded-2xl border border-gray-100 p-5 sm:p-6">
            {FAQ_ITEMS.map((item, i) => (
              <FaqItem key={i} q={item.q} a={item.a} />
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA FINALE ── */}
      <section className="py-16 bg-white">
        <div className="max-w-5xl mx-auto px-5 text-center">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mb-3">
            Pronto a semplificarti la vita?
          </h2>
          <p className="text-gray-500 mb-8 max-w-md mx-auto">
            Inizia oggi, è gratis. Ci vogliono meno di due minuti.
          </p>
          <button
            onClick={onGoToAuth}
            className="inline-flex items-center gap-2 px-8 py-4 bg-[#00897B] hover:bg-[#00695C] text-white font-bold text-lg rounded-2xl shadow-lg shadow-[#00897B]/25 transition-all active:scale-[0.98]"
          >
            Crea il tuo account
            <ArrowRight size={20} />
          </button>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="py-8 bg-gray-50 border-t border-gray-100">
        <div className="max-w-5xl mx-auto px-5">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(145deg, #00897B, #00695C)' }}>
                <span className="text-white font-pacifico text-sm" style={{ transform: 'translateX(-1px)', lineHeight: 1 }}>B</span>
              </div>
              <span className="font-pacifico text-base text-[#00897B]">Bolly</span>
            </div>
            <div className="flex items-center gap-4 text-sm text-gray-400">
              <a href="https://www.iubenda.com/privacy-policy/40178798" target="_blank" rel="noopener noreferrer" className="hover:text-gray-600 transition-colors">Privacy Policy</a>
              <span>·</span>
              <a href="https://www.iubenda.com/privacy-policy/40178798/cookie-policy" target="_blank" rel="noopener noreferrer" className="hover:text-gray-600 transition-colors">Cookie Policy</a>
            </div>
            <p className="text-sm text-gray-400">© 2026 Bolly</p>
          </div>
        </div>
      </footer>

    </div>
  )
}
