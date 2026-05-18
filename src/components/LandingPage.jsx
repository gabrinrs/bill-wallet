import { useState, useEffect, useRef } from 'react'
import { ChevronDown, Zap, Bell, CalendarDays, Camera, Shield, Star, ArrowRight, Users, PiggyBank, Check } from 'lucide-react'

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
    title: 'Scansiona scontrini e bollette',
    desc: 'Fotografa uno scontrino o una bolletta cartacea e Bolly compila tutto in automatico grazie all\'AI.',
    color: '#FF7043'
  },
  {
    icon: Users,
    title: 'Dividi le spese',
    desc: 'Condividi bollette e spese con coinquilini o familiari. Saldi sempre aggiornati.',
    color: '#5C6BC0'
  },
  {
    icon: PiggyBank,
    title: 'Salvadanaio digitale',
    desc: 'Crea fondi di risparmio con obiettivo e traccia i versamenti verso il traguardo.',
    color: '#E91E63'
  },
  {
    icon: Shield,
    title: 'Tutto in un posto',
    desc: 'Bollette, abbonamenti, assicurazioni, spese quotidiane. Un\'app per tutto.',
    color: '#26A69A'
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

// Hook per animazioni fade-in allo scroll
function useScrollReveal() {
  const ref = useRef(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.unobserve(el) } },
      { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return { ref, style: {
    opacity: visible ? 1 : 0,
    transform: visible ? 'translateY(0)' : 'translateY(32px)',
    transition: 'opacity 0.7s cubic-bezier(0.16,1,0.3,1), transform 0.7s cubic-bezier(0.16,1,0.3,1)'
  }}
}

function FadeIn({ children, delay = 0, className = '' }) {
  const { ref, style } = useScrollReveal()
  return (
    <div ref={ref} style={{ ...style, transitionDelay: `${delay}ms` }} className={className}>
      {children}
    </div>
  )
}

function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-b border-gray-200 last:border-0">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-4 text-left"
      >
        <span className="font-semibold text-gray-900 text-base pr-4">{q}</span>
        <ChevronDown
          size={20}
          className={`text-gray-400 flex-shrink-0 transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
        />
      </button>
      <div
        className="overflow-hidden transition-all duration-300"
        style={{ maxHeight: open ? '200px' : '0', opacity: open ? 1 : 0 }}
      >
        <p className="pb-4 text-gray-600 text-sm leading-relaxed">{a}</p>
      </div>
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
      <nav className="sticky top-0 z-50 border-b border-white/10" style={{
        paddingTop: 'env(safe-area-inset-top, 0px)',
        background: 'linear-gradient(135deg, #004D40, #00695C)'
      }}>
        <div className="max-w-5xl mx-auto px-5 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)' }}>
              <span className="text-white font-pacifico text-lg" style={{ transform: 'translateX(-1.5px)', lineHeight: 1 }}>B</span>
            </div>
            <span className="font-pacifico text-xl text-white">Bolly</span>
          </div>
          <button
            onClick={onGoToAuth}
            className="px-5 py-2 rounded-xl text-sm font-semibold text-white border-2 border-white/40 hover:bg-white hover:text-[#00695C] transition-all duration-300"
          >
            Accedi
          </button>
        </div>
      </nav>

      {/* ── HERO — mesh gradient teal ── */}
      <section className="relative overflow-hidden" style={{
        background: '#003D33'
      }}>
        {/* Mesh gradient blobs */}
        <div className="absolute inset-0" style={{
          background: `
            radial-gradient(ellipse 80% 60% at 20% 10%, rgba(0,137,123,0.6) 0%, transparent 60%),
            radial-gradient(ellipse 60% 80% at 80% 30%, rgba(0,105,92,0.5) 0%, transparent 55%),
            radial-gradient(ellipse 70% 50% at 50% 80%, rgba(0,150,136,0.4) 0%, transparent 50%),
            radial-gradient(ellipse 50% 40% at 10% 60%, rgba(38,166,154,0.25) 0%, transparent 50%),
            radial-gradient(ellipse 40% 50% at 90% 70%, rgba(0,77,64,0.5) 0%, transparent 50%),
            radial-gradient(ellipse 90% 40% at 50% 0%, rgba(0,137,123,0.35) 0%, transparent 50%)
          `
        }} />
        {/* Subtle noise overlay for texture */}
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.03'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat',
          backgroundSize: '128px 128px'
        }} />

        <div className="relative max-w-5xl mx-auto px-5 pt-16 pb-14 text-center">
          <FadeIn>
            <p className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold mb-6" style={{ background: 'rgba(255,255,255,0.12)', color: '#B2DFDB', backdropFilter: 'blur(8px)' }}>
              <Zap size={14} />
              Piano gratuito incluso — nessuna carta richiesta
            </p>
          </FadeIn>

          <FadeIn delay={100}>
            <h1 className="text-4xl sm:text-5xl font-extrabold text-white leading-tight mb-5">
              Le tue bollette,<br />
              <span style={{ color: '#FFD54F' }}>finalmente sotto controllo.</span>
            </h1>
          </FadeIn>

          <FadeIn delay={200}>
            <p className="text-lg max-w-md mx-auto mb-8 leading-relaxed" style={{ color: 'rgba(255,255,255,0.75)' }}>
              Inserisci i contratti una volta. Alle bollette ci pensa Bolly — arrivano da sole, ti avvisa prima delle scadenze.
            </p>
          </FadeIn>

          <FadeIn delay={300}>
            <div className="flex flex-col items-center gap-3">
              <button
                onClick={onGoToAuth}
                className="inline-flex items-center gap-2.5 px-8 py-4 text-[#004D40] font-bold text-lg rounded-2xl shadow-xl transition-all duration-300 active:scale-[0.97] hover:shadow-2xl hover:scale-[1.02]"
                style={{ background: 'linear-gradient(135deg, #FFD54F, #FFC107)' }}
              >
                Provalo gratis
                <ArrowRight size={20} />
              </button>
            </div>
          </FadeIn>

          {/* Hero checklist */}
          <FadeIn delay={400}>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6">
              {['Email dedicata AI', 'Promemoria automatici', 'Split con amici'].map((item, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: 'rgba(178,223,219,0.25)' }}>
                    <Check size={12} style={{ color: '#B2DFDB' }} />
                  </div>
                  <span className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.7)' }}>{item}</span>
                </div>
              ))}
            </div>
          </FadeIn>

          {/* Hero screenshot */}
          <FadeIn delay={500}>
            <div className="mt-12 flex justify-center">
              <div className="relative w-64 sm:w-72">
                <div className="absolute inset-0 rounded-[2.5rem] blur-2xl" style={{ background: 'rgba(0,0,0,0.3)', transform: 'translateY(8px)' }} />
                <div className="relative rounded-[2rem] overflow-hidden border-2 border-white/20">
                  <img
                    src="/screenshots/dashboard.png"
                    alt="Dashboard Bolly"
                    className="w-full"
                    loading="eager"
                  />
                </div>
              </div>
            </div>
          </FadeIn>
        </div>

        {/* Wave divider */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 60" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full" preserveAspectRatio="none">
            <path d="M0 60L1440 60L1440 20C1200 50 960 0 720 20C480 40 240 10 0 30L0 60Z" fill="white" />
          </svg>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className="py-16 bg-white">
        <div className="max-w-5xl mx-auto px-5">
          <FadeIn>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 text-center mb-3">
              Tutto quello che ti serve
            </h2>
            <p className="text-gray-500 text-center mb-12 max-w-md mx-auto">
              Gestisci bollette, scadenze e spese quotidiane in un'unica app semplice e intuitiva.
            </p>
          </FadeIn>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f, i) => (
              <FadeIn key={i} delay={i * 80}>
                <div className="p-6 rounded-2xl border border-gray-100 bg-white hover:shadow-lg hover:border-gray-200 transition-all duration-300 h-full">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                    style={{ backgroundColor: f.color + '15' }}
                  >
                    <f.icon size={24} style={{ color: f.color }} />
                  </div>
                  <h3 className="font-bold text-gray-900 text-lg mb-2">{f.title}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── COME FUNZIONA ── */}
      <section className="py-16" style={{ background: 'linear-gradient(180deg, #f0f7f6 0%, #e8f5f3 100%)' }}>
        <div className="max-w-5xl mx-auto px-5">
          <FadeIn>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 text-center mb-3">
              Come funziona
            </h2>
            <p className="text-gray-500 text-center mb-12 max-w-md mx-auto">
              Tre passi e sei operativo. Sul serio.
            </p>
          </FadeIn>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            {[
              { num: '1', img: '/screenshots/categorie.png', alt: 'Aggiungi contratti', title: 'Aggiungi i tuoi contratti', desc: 'Luce, gas, telefono, affitto, abbonamenti — tutto in pochi tap.' },
              { num: '2', img: '/screenshots/calendario.png', alt: 'Calendario scadenze', title: 'Ricevi promemoria', desc: 'Bolly ti avvisa prima di ogni scadenza con una notifica sul telefono.' },
              { num: '3', img: '/screenshots/spesa.png', alt: 'Traccia le spese', title: 'Tutto sotto controllo', desc: 'Tieni traccia di ogni spesa e non perdi più il conto di nulla.' },
            ].map((step, i) => (
              <FadeIn key={i} delay={i * 150}>
                <div className="text-center">
                  <div className="w-11 h-11 rounded-full text-white font-bold text-lg flex items-center justify-center mx-auto mb-5 shadow-md" style={{ background: 'linear-gradient(135deg, #00897B, #00695C)' }}>
                    {step.num}
                  </div>
                  <div className="w-48 mx-auto mb-5 rounded-[1.5rem] overflow-hidden shadow-xl border border-gray-200/50">
                    <img src={step.img} alt={step.alt} className="w-full" loading="lazy" />
                  </div>
                  <h3 className="font-bold text-gray-900 mb-1.5">{step.title}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">{step.desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── RECENSIONI ── */}
      <section className="py-16 bg-white">
        <div className="max-w-5xl mx-auto px-5">
          <FadeIn>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 text-center mb-3">
              Chi lo usa, lo consiglia
            </h2>
            <p className="text-gray-500 text-center mb-10 max-w-md mx-auto">
              Cosa dicono le persone che hanno provato Bolly.
            </p>
          </FadeIn>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 max-w-2xl mx-auto">
            {REVIEWS.map((r, i) => (
              <FadeIn key={i} delay={i * 100}>
                <div className="p-6 rounded-2xl bg-gray-50 border border-gray-100 hover:shadow-md transition-shadow duration-300">
                  <StarRating count={r.stars} />
                  <p className="text-gray-700 mt-3 mb-4 text-sm leading-relaxed italic">"{r.text}"</p>
                  <p className="font-semibold text-gray-900 text-sm">{r.name}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="py-16" style={{ background: 'linear-gradient(180deg, #f0f7f6 0%, #e8f5f3 100%)' }}>
        <div className="max-w-2xl mx-auto px-5">
          <FadeIn>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 text-center mb-10">
              Domande frequenti
            </h2>
          </FadeIn>
          <FadeIn delay={100}>
            <div className="bg-white rounded-2xl border border-gray-100 p-5 sm:p-6 shadow-sm">
              {FAQ_ITEMS.map((item, i) => (
                <FaqItem key={i} q={item.q} a={item.a} />
              ))}
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── CTA FINALE — mesh gradient teal ── */}
      <section className="relative overflow-hidden py-16" style={{
        background: '#003D33'
      }}>
        <div className="absolute inset-0" style={{
          background: `
            radial-gradient(ellipse 70% 70% at 70% 20%, rgba(0,137,123,0.5) 0%, transparent 55%),
            radial-gradient(ellipse 60% 60% at 20% 70%, rgba(0,105,92,0.45) 0%, transparent 50%),
            radial-gradient(ellipse 80% 50% at 50% 50%, rgba(0,150,136,0.3) 0%, transparent 55%)
          `
        }} />
        <div className="max-w-5xl mx-auto px-5 text-center relative">
          <FadeIn>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white mb-3">
              Pronto a semplificarti la vita?
            </h2>
            <p className="mb-8 max-w-md mx-auto" style={{ color: 'rgba(255,255,255,0.65)' }}>
              Inizia oggi, è gratis. Ci vogliono meno di due minuti.
            </p>
            <button
              onClick={onGoToAuth}
              className="inline-flex items-center gap-2.5 px-8 py-4 text-[#004D40] font-bold text-lg rounded-2xl shadow-xl transition-all duration-300 active:scale-[0.97] hover:shadow-2xl hover:scale-[1.02]"
              style={{ background: 'linear-gradient(135deg, #FFD54F, #FFC107)' }}
            >
              Crea il tuo account
              <ArrowRight size={20} />
            </button>
          </FadeIn>
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
