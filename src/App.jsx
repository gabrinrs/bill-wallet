import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { supabase } from './lib/supabase'
import { getContratti, getBollette, createContratto, createBolletta, togglePagata, updateContratto, deleteContratto, deleteBolletta, getSpese, createSpesa, updateSpesa, deleteSpesa, getAbitazioni, createAbitazione, updateAbitazione, deleteAbitazione, getAmici, getRichiesteRicevute, getRichiesteInviate, cercaUtenteBolly, inviaRichiestaAmicizia, accettaAmicizia, rifiutaAmicizia, rimuoviAmico, getContattiEsterni, addContattoEsterno, deleteContattoEsterno, createSplit, getSplitsByUser, getSplitsRicevuti, getSplitByRiferimento, togglePartecipantePagato, deleteSplit, getNotifiche, segnaNotificaLetta, deleteNotifica } from './lib/database'
import { CATEGORIE, FORNITORI, cercaFornitore, getCategoria, PORTALI_PAGAMENTO, CATEGORIE_SPESE, getCategoriaSpesa, CATEGORIE_ENTRATE, getCategoriaEntrata } from './lib/categorie'
import { formatEuro, formatData, formatPeriodo, giorniDa, getStatoBolletta, STATO_CONFIG } from './lib/helpers'
import { subscribeToPush, isPushSubscribed } from './lib/pushNotifications'
import { identifyUser, track, trackScreen, resetAnalytics, setUserProperties } from './lib/analytics'
import Auth from './components/Auth'
import Onboarding from './components/Onboarding'
import LandingPage from './components/LandingPage'
import {
  Home, Plus, Bell, ChevronLeft, ChevronRight, Upload, Check,
  AlertTriangle, Zap, Flame, Droplets, Phone, Wifi, Shield, Package,
  TrendingUp, CalendarDays, Repeat, Tv, CreditCard, Landmark, PenLine, LogOut, Loader2,
  Trash2, ExternalLink, Pencil, Mail, Copy, User, Inbox, FileText, HelpCircle, MessageCircle,
  Menu, X, ChevronDown, Search,
  ShoppingCart, Car, Gamepad2, Heart, Shirt, UtensilsCrossed, MoreHorizontal, Wallet, Camera,
  Banknote, Gift, RotateCcw, Building2, Sun, MapPin, Warehouse, Users, UserPlus, UserCheck, UserX, Clock, Send, Split, CircleDollarSign,
  ArrowUpRight, ArrowDownRight, Scale
} from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

const IconMap = { Zap, Flame, Droplets, Phone, Wifi, Shield, Package, Tv, Repeat, CreditCard, Landmark, ShoppingCart, Car, Gamepad2, Heart, Home, Shirt, UtensilsCrossed, MoreHorizontal }

const ICONE_ABITAZIONE = [
  { id: 'Home', icon: Home, label: 'Casa' },
  { id: 'Building2', icon: Building2, label: 'Ufficio' },
  { id: 'Sun', icon: Sun, label: 'Casa vacanze' },
  { id: 'MapPin', icon: MapPin, label: 'Altro' },
]

const ICONE_ALTRO = [
  { id: 'Car', icon: Car, label: 'Garage/Box' },
  { id: 'ShoppingCart', icon: ShoppingCart, label: 'Negozio' },
  { id: 'Warehouse', icon: Warehouse, label: 'Magazzino' },
]

function getIconaAbitazione(iconaId) {
  return ICONE_ABITAZIONE.find(i => i.id === iconaId) || ICONE_ALTRO.find(i => i.id === iconaId) || ICONE_ABITAZIONE[0]
}

// ============================================================
// SHARED COMPONENTS
// ============================================================

function Badge({ stato }) {
  const cfg = STATO_CONFIG[stato]
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${cfg.bg} ${cfg.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  )
}

function CategoriaIcon({ categoriaId, size = 20 }) {
  const cat = getCategoria(categoriaId)
  const Icon = IconMap[cat.icon] || Package
  return (
    <div className="flex items-center justify-center w-10 h-10 rounded-xl" style={{ backgroundColor: cat.color + '18' }}>
      <Icon size={size} style={{ color: cat.color }} />
    </div>
  )
}

function Card({ children, className = '', onClick }) {
  return (
    <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm ${onClick ? 'cursor-pointer active:scale-[0.98] transition-transform' : ''} ${className}`} onClick={onClick}>
      {children}
    </div>
  )
}

function Loading() {
  return (
    <div className="flex items-center justify-center py-12">
      <Loader2 size={28} className="animate-spin text-bolly-500" />
    </div>
  )
}

function SplashScreen() {
  return (
    <div className="min-h-screen bg-[#f0f7f6] flex flex-col items-center justify-center px-6">
      <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-lg" style={{ background: 'linear-gradient(145deg, #00897B, #00695C)' }}>
        <span className="text-white font-pacifico" style={{ fontSize: '38px', transform: 'translateX(-3px)', display: 'block', lineHeight: 1 }}>B</span>
      </div>
      <h1 className="text-3xl font-pacifico text-bolly-500 mb-2">Bolly</h1>
      <p className="text-gray-500 text-sm">Mai più scadenze dimenticate.</p>
      <div className="mt-8">
        <Loader2 size={24} className="animate-spin text-bolly-400" />
      </div>
    </div>
  )
}

function ResetPassword({ onDone }) {
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  const handleReset = async (e) => {
    e.preventDefault()
    if (newPassword !== confirmPassword) {
      setError('Le password non coincidono.')
      return
    }
    if (newPassword.length < 6) {
      setError('La password deve avere almeno 6 caratteri.')
      return
    }
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) {
      setError(error.message)
    } else {
      setSuccess(true)
      setTimeout(() => onDone(), 2000)
    }
    setLoading(false)
  }

  const EyeIcon = ({ show }) => show ? (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/><path d="M14.12 14.12a3 3 0 1 1-4.24-4.24"/></svg>
  ) : (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
  )

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg" style={{ background: 'linear-gradient(145deg, #00897B, #00695C)' }}>
            <span className="text-white font-pacifico" style={{ fontSize: '30px', transform: 'translateX(-2px)', display: 'block', lineHeight: 1 }}>B</span>
          </div>
          <h1 className="text-2xl font-pacifico text-bolly-500">Bolly</h1>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Nuova password</h2>
          <p className="text-sm text-gray-500 mb-4">Scegli una nuova password per il tuo account.</p>

          <form onSubmit={handleReset} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nuova password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="Minimo 6 caratteri"
                  required
                  minLength={6}
                  className="w-full px-3 py-2.5 pr-11 rounded-xl border border-gray-200 focus:ring-2 focus:ring-bolly-500 focus:border-transparent outline-none"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" tabIndex={-1}>
                  <EyeIcon show={showPassword} />
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Conferma password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Ripeti la password"
                  required
                  minLength={6}
                  className="w-full px-3 py-2.5 pr-11 rounded-xl border border-gray-200 focus:ring-2 focus:ring-bolly-500 focus:border-transparent outline-none"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" tabIndex={-1}>
                  <EyeIcon show={showPassword} />
                </button>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{error}</div>
            )}
            {success && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-xl text-sm text-green-700">
                Password aggiornata! Stai per essere reindirizzato...
              </div>
            )}

            <button
              type="submit"
              disabled={loading || success}
              className="w-full py-3 bg-bolly-500 text-white font-semibold rounded-xl disabled:opacity-50 hover:bg-bolly-600 transition-colors"
            >
              {loading ? 'Attendere...' : 'Salva nuova password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

function FonteBadge({ fonte }) {
  if (fonte === 'email') return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-bolly-700 bg-bolly-50 px-2 py-0.5 rounded-full border border-bolly-100">
      <Mail size={10} />
      Via email
    </span>
  )
  if (fonte === 'upload') return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-bolly-700 bg-bolly-50 px-2 py-0.5 rounded-full border border-bolly-100">
      <Upload size={10} />
      Da PDF
    </span>
  )
  return null
}

function SwipeableContratto({ isOpen, onOpen, onClose, onClick, onEdit, onDelete, children }) {
  const [dragOffset, setDragOffset] = useState(null)
  const startX = useRef(0)
  const moved = useRef(false)
  const ACTIONS_WIDTH = 152
  const OPEN_THRESHOLD = 50

  const targetX = isOpen ? -ACTIONS_WIDTH : 0
  const currentX = dragOffset !== null ? dragOffset : targetX

  const handleTouchStart = (e) => {
    startX.current = e.touches[0].clientX
    moved.current = false
  }
  const handleTouchMove = (e) => {
    const deltaX = e.touches[0].clientX - startX.current
    if (Math.abs(deltaX) > 5) moved.current = true
    const next = Math.max(-ACTIONS_WIDTH - 10, Math.min(10, targetX + deltaX))
    setDragOffset(next)
  }
  const handleTouchEnd = () => {
    if (!moved.current) { setDragOffset(null); return }
    if (dragOffset !== null && dragOffset < -OPEN_THRESHOLD) onOpen()
    else onClose()
    setDragOffset(null)
  }

  const handleCardClick = (e) => {
    if (moved.current) { e.preventDefault(); return }
    if (isOpen) { onClose(); return }
    onClick?.()
  }

  return (
    <div className="relative overflow-hidden rounded-2xl">
      <div className="absolute inset-y-0 right-0 flex">
        <button
          onClick={(e) => { e.stopPropagation(); onEdit() }}
          className="w-[76px] flex flex-col items-center justify-center bg-gray-200 text-gray-700 gap-1 active:bg-gray-300"
          aria-label="Modifica contratto"
        >
          <Pencil size={18} />
          <span className="text-xs font-medium">Modifica</span>
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete() }}
          className="w-[76px] flex flex-col items-center justify-center bg-red-600 text-white gap-1 active:bg-red-700"
          aria-label="Elimina contratto"
        >
          <Trash2 size={18} />
          <span className="text-xs font-medium">Elimina</span>
        </button>
      </div>
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={handleCardClick}
        style={{ transform: `translateX(${currentX}px)`, transition: dragOffset !== null ? 'none' : 'transform 220ms ease-out' }}
        className="relative bg-white rounded-2xl border border-gray-100 shadow-sm cursor-pointer active:scale-[0.98]"
      >
        {children}
      </div>
    </div>
  )
}

function SwipeableSpesa({ isOpen, onOpen, onClose, onEdit, onDelete, children }) {
  const [dragOffset, setDragOffset] = useState(null)
  const startX = useRef(0)
  const moved = useRef(false)
  const ACTIONS_WIDTH = 152
  const OPEN_THRESHOLD = 50

  const targetX = isOpen ? -ACTIONS_WIDTH : 0
  const currentX = dragOffset !== null ? dragOffset : targetX

  const handleTouchStart = (e) => {
    startX.current = e.touches[0].clientX
    moved.current = false
  }
  const handleTouchMove = (e) => {
    const deltaX = e.touches[0].clientX - startX.current
    if (Math.abs(deltaX) > 5) moved.current = true
    const next = Math.max(-ACTIONS_WIDTH - 10, Math.min(10, targetX + deltaX))
    setDragOffset(next)
  }
  const handleTouchEnd = () => {
    if (!moved.current) { setDragOffset(null); return }
    if (dragOffset !== null && dragOffset < -OPEN_THRESHOLD) onOpen()
    else onClose()
    setDragOffset(null)
  }

  const handleClick = (e) => {
    if (moved.current) { e.preventDefault(); return }
    if (isOpen) { onClose(); return }
  }

  return (
    <div className="relative overflow-hidden rounded-xl">
      <div className="absolute inset-y-0 right-0 flex">
        <button
          onClick={(e) => { e.stopPropagation(); onEdit() }}
          className="w-[76px] flex flex-col items-center justify-center bg-gray-200 text-gray-700 gap-1 active:bg-gray-300"
          aria-label="Modifica spesa"
        >
          <Pencil size={18} />
          <span className="text-xs font-medium">Modifica</span>
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete() }}
          className="w-[76px] flex flex-col items-center justify-center bg-red-600 text-white gap-1 active:bg-red-700"
          aria-label="Elimina spesa"
        >
          <Trash2 size={18} />
          <span className="text-xs font-medium">Elimina</span>
        </button>
      </div>
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={handleClick}
        style={{ transform: `translateX(${currentX}px)`, transition: dragOffset !== null ? 'none' : 'transform 220ms ease-out' }}
        className="relative bg-white"
      >
        {children}
      </div>
    </div>
  )
}

// ============================================================
// DASHBOARD
// ============================================================

function Dashboard({ contratti, bollette, spese, onSelectContratto, onNavigate, profile, onLogout, onDeleteContratto, onEditContratto, onDeleteSpesa, onEditSpesa, abitazioni, filtroAbitazione, onSetFiltroAbitazione, splits, onSplit, onViewSplit, richiesteCount, splitsRicevuti }) {
  const [cardSwipedId, setCardSwipedId] = useState(null)
  const [spesaSwipedId, setSpesaSwipedId] = useState(null)
  const [deletingContratto, setDeletingContratto] = useState(null)
  const [deletingSpesa, setDeletingSpesa] = useState(null)

  // Filtra contratti per abitazione selezionata
  const contrattiFiltrati = useMemo(() => {
    if (!filtroAbitazione) return contratti
    return contratti.filter(c => c.abitazione_id === filtroAbitazione)
  }, [contratti, filtroAbitazione])

  // Filtra bollette in base ai contratti filtrati
  const contrattiFiltratiIds = useMemo(() => new Set(contrattiFiltrati.map(c => c.id)), [contrattiFiltrati])
  const bolletteFiltrate = useMemo(() => {
    if (!filtroAbitazione) return bollette
    return bollette.filter(b => contrattiFiltratiIds.has(b.contratto_id))
  }, [bollette, filtroAbitazione, contrattiFiltratiIds])

  const bolletteProssime = useMemo(() => {
    return bolletteFiltrate
      .filter(b => !b.pagata && b.stato_elaborazione !== 'errore_parsing' && b.stato_elaborazione !== 'orfana' && b.stato_elaborazione !== 'incompleta' && b.stato_elaborazione !== 'comunicazione')
      .map(b => { const ct = contrattiFiltrati.find(c => c.id === b.contratto_id); return { ...b, contratto: ct, stato: getStatoBolletta(b, ct) } })
      .filter(b => b.contratto)
      .filter(b => b.scadenza)
      .filter(b => b.stato === 'da_pagare' || b.stato === 'in_scadenza')
      .sort((a, b) => new Date(a.scadenza) - new Date(b.scadenza))
  }, [bolletteFiltrate, contrattiFiltrati])

  const bolletteOrfaneCount = useMemo(() =>
    bollette.filter(b => ['errore_parsing', 'orfana', 'incompleta'].includes(b.stato_elaborazione)).length
  , [bollette])

  const totaleMesseCorrente = useMemo(() => {
    const now = new Date()
    return bolletteFiltrate
      .filter(b => { const d = new Date(b.scadenza); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear() })
      .reduce((s, b) => s + Number(b.importo), 0)
  }, [bolletteFiltrate])

  const totaleDaPagare = useMemo(() =>
    bolletteFiltrate.filter(b => !b.pagata).reduce((s, b) => s + Number(b.importo), 0)
  , [bolletteFiltrate])

  const totaleSpeseMese = useMemo(() => {
    const now = new Date()
    return (spese || []).filter(s => {
      if (s.tipo === 'entrata') return false
      const d = new Date(s.data)
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    }).reduce((s, sp) => s + Number(sp.importo || 0), 0)
  }, [spese])

  const totaleEntrateMese = useMemo(() => {
    const now = new Date()
    return (spese || []).filter(s => {
      if (s.tipo !== 'entrata') return false
      const d = new Date(s.data)
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    }).reduce((s, sp) => s + Number(sp.importo || 0), 0)
  }, [spese])

  const totaleRicorrentiMensili = useMemo(() => {
    return contrattiFiltrati.filter(c => c.ricorrente).reduce((sum, c) => {
      const imp = Number(c.importo_ricorrente) || 0
      if (c.frequenza === 'mensile') return sum + imp
      if (c.frequenza === 'bimestrale') return sum + imp / 2
      if (c.frequenza === 'trimestrale') return sum + imp / 3
      if (c.frequenza === 'semestrale') return sum + imp / 6
      if (c.frequenza === 'annuale') return sum + imp / 12
      return sum
    }, 0)
  }, [contrattiFiltrati])

  const alertTrend = useMemo(() => {
    const alerts = []
    contrattiFiltrati.forEach(c => {
      const bolContratto = bolletteFiltrate
        .filter(b => b.contratto_id === c.id && b.periodo && b.importo)
        .sort((a, b) => new Date(a.periodo) - new Date(b.periodo))
      if (bolContratto.length < 2) return
      const ultima = Number(bolContratto[bolContratto.length - 1].importo)
      const precedente = Number(bolContratto[bolContratto.length - 2].importo)
      if (precedente <= 0) return
      const variazione = ((ultima - precedente) / precedente) * 100
      if (variazione > 5) {
        alerts.push({
          contratto: c,
          variazione: variazione.toFixed(0),
          ultima,
          precedente,
          categoria: getCategoria(c.categoria)
        })
      }
    })
    return alerts.sort((a, b) => Number(b.variazione) - Number(a.variazione))
  }, [contrattiFiltrati, bolletteFiltrate])

  return (
    <div className="space-y-6 pb-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Ciao {profile?.nome || 'utente'}</h1>
        </div>
        <button onClick={() => onNavigate('menu')} className="relative p-2 rounded-xl hover:bg-gray-100 text-gray-500">
          <Menu size={22} />
          {richiesteCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full" />
          )}
        </button>
      </div>

      {/* Banner richieste amicizia */}
      {richiesteCount > 0 && (
        <button
          onClick={() => onNavigate('amici')}
          className="w-full flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 transition-all active:scale-[0.98]"
        >
          <div className="w-9 h-9 rounded-full bg-purple-500 flex items-center justify-center flex-shrink-0">
            <UserPlus size={18} className="text-white" />
          </div>
          <div className="flex-1 text-left">
            <p className="text-sm font-semibold text-gray-900">
              {richiesteCount === 1 ? 'Hai una richiesta di amicizia' : `Hai ${richiesteCount} richieste di amicizia`}
            </p>
            <p className="text-xs text-gray-500">Tocca per vedere</p>
          </div>
          <ChevronRight size={18} className="text-gray-400" />
        </button>
      )}

      {/* Banner split ricevuti da saldare */}
      {(() => {
        const nonPagati = splitsRicevuti?.filter(s => !s.mio_pagato) || []
        if (nonPagati.length === 0) return null
        const totale = nonPagati.reduce((sum, s) => sum + Number(s.mia_parte), 0)
        return (
          <button
            onClick={() => onNavigate('splits-ricevuti')}
            className="w-full flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 transition-all active:scale-[0.98]"
          >
            <div className="w-9 h-9 rounded-full bg-orange-500 flex items-center justify-center flex-shrink-0">
              <CircleDollarSign size={18} className="text-white" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-semibold text-gray-900">
                {nonPagati.length === 1 ? 'Hai uno split da saldare' : `Hai ${nonPagati.length} split da saldare`}
              </p>
              <p className="text-xs text-gray-500">Totale: {formatEuro(totale)}</p>
            </div>
            <ChevronRight size={18} className="text-gray-400" />
          </button>
        )
      })()}

      {/* Filtro abitazione */}
      {abitazioni && abitazioni.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
          <button
            onClick={() => onSetFiltroAbitazione(null)}
            className={`flex-shrink-0 py-1.5 px-3 rounded-full text-xs font-medium border transition-colors ${!filtroAbitazione ? 'bg-bolly-500 border-bolly-500 text-white' : 'border-gray-200 text-gray-600 bg-white'}`}
          >
            Tutte
          </button>
          {abitazioni.map(ab => {
            const iconInfo = getIconaAbitazione(ab.icona)
            const AbIcon = iconInfo.icon
            return (
              <button
                key={ab.id}
                onClick={() => onSetFiltroAbitazione(filtroAbitazione === ab.id ? null : ab.id)}
                className={`flex-shrink-0 py-1.5 px-3 rounded-full text-xs font-medium border transition-colors flex items-center gap-1.5 ${filtroAbitazione === ab.id ? 'bg-bolly-500 border-bolly-500 text-white' : 'border-gray-200 text-gray-600 bg-white'}`}
              >
                <AbIcon size={12} />
                {ab.nome}
              </button>
            )
          })}
        </div>
      )}

      <h2 className="text-lg font-semibold text-gray-900">Riepilogo di questo mese</h2>

      {bolletteOrfaneCount > 0 && (
        <Card className="p-4 bg-amber-50 border-amber-200" onClick={() => onNavigate('bollette-orfane')}>
          <div className="flex items-center gap-3">
            <AlertTriangle size={22} className="text-amber-500 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-amber-900">
                Hai {bolletteOrfaneCount} {bolletteOrfaneCount === 1 ? 'bolletta' : 'bollette'} da sistemare
              </p>
              <p className="text-xs text-amber-700 mt-0.5">Completa i dati mancanti o associa a un contratto</p>
            </div>
            <ChevronRight size={18} className="text-amber-400" />
          </div>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Card className="p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Spese totali</p>
          <p className="text-xl font-bold text-gray-900 mt-1">{formatEuro(totaleMesseCorrente + totaleSpeseMese)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Da pagare</p>
          <p className="text-xl font-bold text-red-600 mt-1">{formatEuro(totaleDaPagare)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Spese fisse</p>
          <div className="flex items-center gap-1.5 mt-1">
            <Repeat size={14} className="text-pink-500" />
            <p className="text-xl font-bold text-pink-600">{formatEuro(totaleRicorrentiMensili)}</p>
          </div>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Prossima scadenza</p>
          <p className="text-base font-bold text-amber-600 mt-1">
            {bolletteProssime.length > 0 ? formatData(bolletteProssime[0].scadenza) : '—'}
          </p>
        </Card>
      </div>

      {totaleEntrateMese > 0 && (() => {
        const totaleUscite = totaleMesseCorrente + totaleSpeseMese
        const bilancio = totaleEntrateMese - totaleUscite
        return (
          <Card className={`p-4 ${bilancio >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${bilancio >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
                  <TrendingUp size={20} className={`${bilancio >= 0 ? 'text-green-600' : 'text-red-500'} ${bilancio < 0 ? 'rotate-180' : ''}`} />
                </div>
                <div>
                  <p className={`text-xs font-medium ${bilancio >= 0 ? 'text-green-600' : 'text-red-600'}`}>Bilancio del mese</p>
                  <p className={`text-lg font-bold ${bilancio >= 0 ? 'text-green-700' : 'text-red-700'}`}>{bilancio >= 0 ? '+' : ''}{formatEuro(bilancio)}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-green-600">Entrate: +{formatEuro(totaleEntrateMese)}</p>
                <p className="text-xs text-red-600 mt-0.5">Uscite: -{formatEuro(totaleUscite)}</p>
              </div>
            </div>
          </Card>
        )
      })()}

      {/* Alert andamento costi */}
      {alertTrend.length > 0 && (
        <div className="space-y-2">
          {alertTrend.map(a => (
            <Card key={a.contratto.id} className="p-4 bg-red-50 border-red-200" onClick={() => onSelectContratto(a.contratto.id)}>
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-red-100">
                  <TrendingUp size={20} className="text-red-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-red-900">
                    {a.contratto.fornitore}: +{a.variazione}%
                  </p>
                  <p className="text-xs text-red-700 mt-0.5">
                    Da {formatEuro(a.precedente)} a {formatEuro(a.ultima)} nell'ultima bolletta
                  </p>
                </div>
                <ChevronRight size={18} className="text-red-400" />
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Prossime scadenze */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Prossime scadenze</h2>
        <div className="space-y-2">
          {bolletteProssime.length === 0 && <p className="text-gray-400 text-sm text-center py-6">Nessuna bolletta in sospeso</p>}
          {bolletteProssime.slice(0, 5).map(b => (
            <Card key={b.id} className="p-4" onClick={() => b.contratto && onSelectContratto(b.contratto.id)}>
              <div className="flex items-center gap-3">
                <CategoriaIcon categoriaId={b.contratto?.categoria || 'altro'} />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">
                    {b.contratto?.fornitore || b.descrizione_libera || 'Pagamento'}
                  </p>
                  <p className="text-sm text-gray-500">{b.scadenza ? `Scade il ${formatData(b.scadenza)}` : 'Scadenza non disponibile'}</p>
                  <div className="flex flex-wrap items-center gap-1.5 mt-1">
                    {b.contratto && (
                      b.contratto.domiciliazione ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
                          <span className="w-1.5 h-1.5 bg-green-500 rounded-full" /> Domiciliata
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                          <span className="w-1.5 h-1.5 bg-amber-500 rounded-full" /> Da pagare manualmente
                        </span>
                      )
                    )}
                    <FonteBadge fonte={b.fonte} />
                    {b.pdf_url && (
                      <a
                        href={b.pdf_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={e => e.stopPropagation()}
                        className="inline-flex items-center gap-1 text-xs font-medium text-bolly-700 bg-bolly-50 border border-bolly-200 px-2 py-0.5 rounded-full hover:bg-bolly-100"
                        title="Apri PDF"
                      >
                        <ExternalLink size={10} /> PDF
                      </a>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900">{formatEuro(b.importo)}</p>
                  <Badge stato={b.stato} />
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Contratti */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-900">I tuoi contratti</h2>
        </div>
        <div className="space-y-2">
          {contrattiFiltrati.map(c => {
            const nonPagate = bolletteFiltrate.filter(b => b.contratto_id === c.id && !b.pagata).length
            const totalBollette = bolletteFiltrate.filter(b => b.contratto_id === c.id).length
            const abitazione = abitazioni?.find(ab => ab.id === c.abitazione_id)
            return (
              <SwipeableContratto
                key={c.id}
                isOpen={cardSwipedId === c.id}
                onOpen={() => setCardSwipedId(c.id)}
                onClose={() => setCardSwipedId(null)}
                onClick={() => onSelectContratto(c.id)}
                onEdit={() => { setCardSwipedId(null); onEditContratto(c) }}
                onDelete={() => { setCardSwipedId(null); setDeletingContratto({ contratto: c, numBollette: totalBollette }) }}
              >
                <div className="flex items-center gap-3 p-4">
                  <CategoriaIcon categoriaId={c.categoria} />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900">{c.fornitore}</p>
                    <p className="text-sm text-gray-500">
                      {getCategoria(c.categoria).label} · {c.domiciliazione ? 'Domiciliato' : 'Pagamento manuale'}
                      {c.ricorrente && ` · ${formatEuro(c.importo_ricorrente)}/${{ mensile: 'mese', bimestrale: '2 mesi', trimestrale: 'trim.', semestrale: '6 mesi', annuale: 'anno' }[c.frequenza] || c.frequenza}`}
                    </p>
                    {abitazione && !filtroAbitazione && (
                      <span className="inline-flex items-center gap-1 mt-1 text-xs text-bolly-600 bg-bolly-50 px-2 py-0.5 rounded-full">
                        {(() => { const AbIcon = getIconaAbitazione(abitazione.icona).icon; return <AbIcon size={10} /> })()}
                        {abitazione.nome}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {c.ricorrente && <Repeat size={14} className="text-pink-400" />}
                    {nonPagate > 0 && <span className="bg-red-100 text-red-700 text-xs font-medium px-2 py-0.5 rounded-full">{nonPagate}</span>}
                    <ChevronRight size={18} className="text-gray-400" />
                  </div>
                </div>
              </SwipeableContratto>
            )
          })}
          {contrattiFiltrati.length === 0 && (
            <Card className="p-8 text-center" onClick={filtroAbitazione ? () => onSetFiltroAbitazione(null) : () => onNavigate('aggiungi-contratto')}>
              <Plus size={32} className="text-gray-300 mx-auto mb-2" />
              <p className="text-gray-400">{filtroAbitazione ? 'Nessun contratto per questa abitazione' : 'Aggiungi il tuo primo contratto'}</p>
            </Card>
          )}
        </div>
      </div>

      {/* Spese e entrate recenti */}
      {(() => {
        const now = new Date()
        const soloSpeseMese = spese.filter(s => {
          if (s.tipo === 'entrata') return false
          const d = new Date(s.data)
          return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
        })
        const totaleSpeseDelMese = soloSpeseMese.reduce((sum, s) => sum + Number(s.importo), 0)
        const entrateDelMese = spese.filter(s => {
          if (s.tipo !== 'entrata') return false
          const d = new Date(s.data)
          return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
        })
        const totaleEntrateDelMese = entrateDelMese.reduce((sum, s) => sum + Number(s.importo), 0)
        const ultime5 = spese.slice(0, 5)
        const SpesaIconMap = { ShoppingCart, Car, Gamepad2, Heart, Home, Shirt, UtensilsCrossed, Split, MoreHorizontal }
        const EntrataIconMap = { Banknote, Home, RotateCcw, Gift, Landmark, MoreHorizontal }
        if (spese.length === 0) return null
        return (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-gray-900">Movimenti recenti</h2>
              <button onClick={() => onNavigate('spese-lista')} className="text-sm font-medium text-bolly-500">Vedi tutti</button>
            </div>
            <Card className="p-4">
              <div className="flex items-center justify-between mb-3 pb-3 border-b border-gray-100">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Spese di {MESI_BREVI[now.getMonth()]}</p>
                  <p className="text-xl font-bold text-gray-900 mt-0.5">{formatEuro(totaleSpeseDelMese)}</p>
                </div>
                {totaleEntrateDelMese > 0 && (
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide text-right">Entrate</p>
                    <p className="text-xl font-bold text-green-600 mt-0.5">+{formatEuro(totaleEntrateDelMese)}</p>
                  </div>
                )}
                {totaleEntrateDelMese === 0 && (
                  <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                    <Wallet size={20} className="text-purple-600" />
                  </div>
                )}
              </div>
              <div className="space-y-2.5">
                {ultime5.map(s => {
                  const isEntrata = s.tipo === 'entrata'
                  const cat = isEntrata ? getCategoriaEntrata(s.categoria) : getCategoriaSpesa(s.categoria)
                  const Icon = isEntrata ? (EntrataIconMap[cat.icon] || Package) : (SpesaIconMap[cat.icon] || Package)
                  const spesaSplit = splits?.find(sp => sp.tipo === 'spesa' && sp.riferimento_id === s.id)
                  return (
                    <SwipeableSpesa
                      key={s.id}
                      isOpen={spesaSwipedId === s.id}
                      onOpen={() => setSpesaSwipedId(s.id)}
                      onClose={() => setSpesaSwipedId(null)}
                      onEdit={() => { setSpesaSwipedId(null); onEditSpesa(s) }}
                      onDelete={() => { setSpesaSwipedId(null); setDeletingSpesa(s) }}
                    >
                      <div className="flex items-center gap-3 py-2">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: cat.color + '18' }}>
                          <Icon size={16} style={{ color: cat.color }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-sm font-medium text-gray-900 truncate">{s.descrizione || cat.label}</p>
                            {spesaSplit && (
                              <button onClick={(e) => { e.stopPropagation(); onViewSplit(spesaSplit.id) }} className="flex-shrink-0">
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                                  <Split size={10} /> Split
                                </span>
                              </button>
                            )}
                          </div>
                          <p className="text-xs text-gray-400">{formatData(s.data)}</p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {!isEntrata && !spesaSplit && (
                            <button onClick={(e) => { e.stopPropagation(); onSplit({ tipo: 'spesa', id: s.id, importo: s.importo, descrizione: s.descrizione || cat.label }) }} className="p-1 rounded-lg hover:bg-purple-50 text-gray-300 hover:text-purple-500">
                              <Split size={14} />
                            </button>
                          )}
                          <p className={`text-sm font-semibold ${isEntrata ? 'text-green-600' : 'text-gray-900'}`}>{isEntrata ? '+' : ''}{formatEuro(s.importo)}</p>
                        </div>
                      </div>
                    </SwipeableSpesa>
                  )
                })}
              </div>
            </Card>
          </div>
        )
      })()}

      {deletingContratto && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setDeletingContratto(null)}>
          <div className="bg-white rounded-2xl p-5 max-w-sm w-full space-y-3" onClick={e => e.stopPropagation()}>
            <p className="font-semibold text-gray-900">Eliminare il contratto?</p>
            <p className="text-sm text-gray-600">
              {deletingContratto.numBollette > 0
                ? `Verranno eliminate anche ${deletingContratto.numBollette === 1 ? 'la bolletta collegata' : `le ${deletingContratto.numBollette} bollette collegate`}. Questa azione non si può annullare.`
                : 'Questa azione non si può annullare.'}
            </p>
            <div className="flex gap-2 pt-1">
              <button onClick={() => setDeletingContratto(null)} className="flex-1 py-2.5 rounded-xl border border-gray-300 text-sm font-medium text-gray-700">Annulla</button>
              <button onClick={() => { onDeleteContratto(deletingContratto.contratto.id); setDeletingContratto(null) }} className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-medium">Elimina</button>
            </div>
          </div>
        </div>
      )}

      {deletingSpesa && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setDeletingSpesa(null)}>
          <div className="bg-white rounded-2xl p-5 max-w-sm w-full space-y-3" onClick={e => e.stopPropagation()}>
            <p className="font-semibold text-gray-900">Eliminare la spesa?</p>
            <p className="text-sm text-gray-600">
              {deletingSpesa.descrizione || getCategoriaSpesa(deletingSpesa.categoria).label} — {formatEuro(deletingSpesa.importo)}. Questa azione non si può annullare.
            </p>
            <div className="flex gap-2 pt-1">
              <button onClick={() => setDeletingSpesa(null)} className="flex-1 py-2.5 rounded-xl border border-gray-300 text-sm font-medium text-gray-700">Annulla</button>
              <button onClick={() => { onDeleteSpesa(deletingSpesa.id); setDeletingSpesa(null) }} className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-medium">Elimina</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const MESI_BREVI = ['gen','feb','mar','apr','mag','giu','lug','ago','set','ott','nov','dic']

// ============================================================
// DETTAGLIO CONTRATTO
// ============================================================

function DettaglioContratto({ contratto, bollette, onBack, onAggiungiBolletta, onTogglePagata, onDeleteContratto, onEditContratto, onDeleteBolletta, abitazioni, splits, onSplit, onViewSplit }) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deletingBollettaId, setDeletingBollettaId] = useState(null)
  const bolletteOrdinate = useMemo(() => [...bollette].sort((a, b) => new Date(b.periodo) - new Date(a.periodo)), [bollette])
  const chartData = useMemo(() =>
    [...bollette].filter(b => b.periodo).sort((a, b) => new Date(a.periodo) - new Date(b.periodo)).map(b => ({ periodo: formatPeriodo(b.periodo), importo: Number(b.importo) }))
  , [bollette])
  const chartDataConsumi = useMemo(() =>
    [...bollette].filter(b => b.periodo && b.consumo).sort((a, b) => new Date(a.periodo) - new Date(b.periodo)).map(b => ({ periodo: formatPeriodo(b.periodo), consumo: Number(b.consumo), unita: b.unita_misura }))
  , [bollette])
  const unitaConsumi = chartDataConsumi.length > 0 ? chartDataConsumi[0].unita : ''
  const cat = getCategoria(contratto.categoria)
  const categorieList = Array.isArray(contratto.categorie) && contratto.categorie.length > 0
    ? contratto.categorie
    : (contratto.categoria ? [contratto.categoria] : [])
  const portaleUrl = PORTALI_PAGAMENTO[contratto.fornitore]

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-2 -ml-2 rounded-xl hover:bg-gray-100"><ChevronLeft size={22} className="text-gray-600" /></button>
        <CategoriaIcon categoriaId={contratto.categoria} />
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-gray-900">{contratto.fornitore}</h1>
          <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
            {categorieList.map(catId => (
              <span key={catId} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-bolly-50 text-bolly-700 border border-bolly-200">
                {getCategoria(catId).label}
              </span>
            ))}
            {contratto.codice && <span className="text-xs text-gray-500">· {contratto.codice}</span>}
            {(() => {
              const ab = abitazioni?.find(a => a.id === contratto.abitazione_id)
              if (!ab) return null
              const AbIcon = getIconaAbitazione(ab.icona).icon
              return (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-bolly-50 text-bolly-600 border border-bolly-100">
                  <AbIcon size={10} />
                  {ab.nome}
                </span>
              )
            })()}
          </div>
        </div>
        <button onClick={() => onEditContratto(contratto)} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400"><Pencil size={20} /></button>
        <button onClick={() => setShowDeleteConfirm(true)} className="p-2 rounded-xl hover:bg-red-50 text-gray-400"><Trash2 size={20} /></button>
      </div>

      {showDeleteConfirm && (
        <Card className="p-4 border-red-200 bg-red-50">
          <p className="font-medium text-red-800 mb-1">Eliminare questo contratto?</p>
          <p className="text-sm text-red-600 mb-3">
            {bollette.length > 0
              ? `Verranno eliminate anche ${bollette.length === 1 ? 'la bolletta collegata' : `le ${bollette.length} bollette collegate`}. Questa azione non si può annullare.`
              : 'Questa azione non si può annullare.'}
          </p>
          <div className="flex gap-2">
            <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 py-2 rounded-xl border border-gray-300 text-sm font-medium text-gray-700">Annulla</button>
            <button onClick={() => onDeleteContratto(contratto.id)} className="flex-1 py-2 rounded-xl bg-red-600 text-white text-sm font-medium">Elimina</button>
          </div>
        </Card>
      )}

      {!contratto.domiciliazione && portaleUrl && (
        <a href={portaleUrl} target="_blank" rel="noopener noreferrer" className="block">
          <Card className="p-4 bg-bolly-50 border-bolly-200">
            <div className="flex items-center gap-3">
              <ExternalLink size={20} className="text-bolly-500" />
              <div className="flex-1">
                <p className="font-medium text-bolly-700">Vai al portale per pagare</p>
                <p className="text-xs text-bolly-500 mt-0.5">Apri l'area clienti di {contratto.fornitore}</p>
              </div>
              <ChevronRight size={18} className="text-bolly-300" />
            </div>
          </Card>
        </a>
      )}

      <Card className="p-4 space-y-3">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div><p className="text-gray-500">Intestatario</p><p className="font-medium">{contratto.intestatario}</p></div>
          <div><p className="text-gray-500">Ricezione</p><p className="font-medium capitalize">{contratto.metodo_ricezione || '—'}</p></div>
          <div><p className="text-gray-500">Domiciliazione</p><p className="font-medium">{contratto.domiciliazione ? 'Attiva' : 'No'}</p></div>
          <div><p className="text-gray-500">Attivo dal</p><p className="font-medium">{contratto.data_inizio ? formatData(contratto.data_inizio) : '—'}</p></div>
          {contratto.data_fine && (
            <div><p className="text-gray-500">{contratto.categoria === 'finanziamento' ? 'Fine finanziamento' : 'Scadenza contratto'}</p><p className="font-medium text-orange-600">{formatData(contratto.data_fine)}</p></div>
          )}
        </div>
        {contratto.ricorrente && (
          <div className="pt-2 border-t border-gray-100">
            <div className="flex items-center gap-2 mb-2"><Repeat size={14} className="text-pink-500" /><span className="text-sm font-medium text-pink-700">Pagamento ricorrente</span></div>
            <div className="grid grid-cols-3 gap-3 text-sm">
              <div><p className="text-gray-500">Importo</p><p className="font-medium">{formatEuro(contratto.importo_ricorrente)}</p></div>
              <div><p className="text-gray-500">Frequenza</p><p className="font-medium capitalize">{contratto.frequenza}</p></div>
              <div><p className="text-gray-500">Prossimo</p><p className="font-medium">{contratto.prossimo_addebito ? formatData(contratto.prossimo_addebito) : '—'}</p></div>
            </div>
          </div>
        )}
        {contratto.note && <div className="text-sm pt-2 border-t border-gray-100"><p className="text-gray-500">Note</p><p className="text-gray-700">{contratto.note}</p></div>}
      </Card>

      {chartData.length >= 2 && (
        <Card className="p-4">
          <h3 className="font-semibold text-gray-900 mb-3">Andamento importi</h3>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="periodo" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${v}€`} />
              <Tooltip formatter={v => formatEuro(v)} />
              <Line type="monotone" dataKey="importo" stroke={cat.color} strokeWidth={2.5} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      )}

      {chartDataConsumi.length >= 2 && (
        <Card className="p-4">
          <h3 className="font-semibold text-gray-900 mb-3">Andamento consumi ({unitaConsumi})</h3>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={chartDataConsumi}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="periodo" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${v}`} />
              <Tooltip formatter={v => [`${Number(v).toLocaleString('it-IT')} ${unitaConsumi}`, 'Consumo']} />
              <Line type="monotone" dataKey="consumo" stroke="#3B82F6" strokeWidth={2.5} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      )}

      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-900">Storico bollette</h3>
          <button onClick={onAggiungiBolletta} className="flex items-center gap-1 text-sm font-medium text-bolly-500"><Plus size={16} /> Aggiungi</button>
        </div>
        <div className="space-y-2">
          {bolletteOrdinate.map(b => {
            const stato = getStatoBolletta(b, contratto)
            const bollettaSplit = splits?.find(sp => sp.tipo === 'bolletta' && sp.riferimento_id === b.id)
            return (
              <Card key={b.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-gray-900">{formatEuro(b.importo)}</p>
                      {b.consumo && b.unita_misura && (
                        <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">{Number(b.consumo).toLocaleString('it-IT')} {b.unita_misura}</span>
                      )}
                      {bollettaSplit && (
                        <button onClick={() => onViewSplit(bollettaSplit.id)}>
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                            <Split size={10} /> Split
                          </span>
                        </button>
                      )}
                    </div>
                    <p className="text-sm text-gray-500">{b.periodo ? `${formatPeriodo(b.periodo)}${b.periodo_fine && b.periodo_fine !== b.periodo ? ' → ' + formatPeriodo(b.periodo_fine) : ''} · ` : ''}Scade {b.scadenza ? formatData(b.scadenza) : '—'}</p>
                    <div className="mt-1"><FonteBadge fonte={b.fonte} /></div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge stato={stato} />
                    {!bollettaSplit && (
                      <button onClick={() => onSplit({ tipo: 'bolletta', id: b.id, importo: b.importo, descrizione: `${contratto.fornitore} — ${b.periodo ? formatPeriodo(b.periodo) : 'bolletta'}` })} className="p-1.5 rounded-lg hover:bg-purple-50 text-gray-300 hover:text-purple-500" title="Dividi">
                        <Split size={18} />
                      </button>
                    )}
                    {!b.pagata && portaleUrl && (
                      <a href={portaleUrl} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="p-1.5 rounded-lg hover:bg-amber-50 text-amber-600" title={`Paga su ${contratto.fornitore}`}>
                        <CreditCard size={18} />
                      </a>
                    )}
                    {b.pdf_url && (
                      <a href={b.pdf_url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="p-1.5 rounded-lg hover:bg-bolly-50 text-bolly-500" title="Apri PDF">
                        <ExternalLink size={18} />
                      </a>
                    )}
                    {!b.pagata && (
                      <button onClick={e => { e.stopPropagation(); onTogglePagata(b.id) }} className="p-1.5 rounded-lg hover:bg-green-50 text-green-600" title="Segna come pagata">
                        <Check size={18} />
                      </button>
                    )}
                    {deletingBollettaId === b.id ? (
                      <div className="flex items-center gap-1">
                        <button onClick={() => setDeletingBollettaId(null)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 text-xs">No</button>
                        <button onClick={() => { onDeleteBolletta(b.id); setDeletingBollettaId(null) }} className="p-1.5 rounded-lg bg-red-100 text-red-600 text-xs font-medium">Elimina</button>
                      </div>
                    ) : (
                      <button onClick={e => { e.stopPropagation(); setDeletingBollettaId(b.id) }} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-300" title="Elimina bolletta">
                        <Trash2 size={18} />
                      </button>
                    )}
                  </div>
                </div>
              </Card>
            )
          })}
          {bolletteOrdinate.length === 0 && <p className="text-gray-400 text-sm text-center py-6">Nessuna bolletta registrata</p>}
        </div>
      </div>
    </div>
  )
}

// ============================================================
// FORM CONTRATTO
// ============================================================

function FormContratto({ onSave, onBack, session, onRefresh, onGoHome, abitazioni }) {
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [customMode, setCustomMode] = useState(false)
  const [customText, setCustomText] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [pdfFile, setPdfFile] = useState(null)
  const [uploadStatus, setUploadStatus] = useState('idle')
  const [uploadError, setUploadError] = useState(null)
  const pdfInputRef = useRef(null)
  const [form, setForm] = useState({
    categoria: '', fornitore: '', intestatario: '', codice: '',
    metodo_ricezione: 'email', domiciliazione: false, data_inizio: '', data_fine: '', note: '',
    ricorrente: false, importo_ricorrente: '', frequenza: 'mensile', prossimo_addebito: '',
    abitazione_id: null,
  })
  const update = (f, v) => setForm(p => ({ ...p, [f]: v }))

  const handleSave = async () => {
    setSaving(true)
    try {
      const data = { ...form }
      // Converte stringhe vuote in null per campi data opzionali
      if (!data.data_fine) data.data_fine = null
      if (!data.data_inizio) data.data_inizio = null
      if (!data.abitazione_id) data.abitazione_id = null
      if (data.ricorrente) data.importo_ricorrente = parseFloat(data.importo_ricorrente)
      else { delete data.importo_ricorrente; delete data.frequenza; delete data.prossimo_addebito; delete data.data_fine }
      await onSave(data)
    } catch (e) { console.error(e) }
    setSaving(false)
  }

  const handlePdfAutoFill = async () => {
    if (!pdfFile || !session?.user?.id) return
    setUploadStatus('uploading')
    setUploadError(null)
    try {
      const userId = session.user.id
      const timestamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 15)
      const filePath = `${userId}/${timestamp}.pdf`

      const { error: storageError } = await supabase.storage
        .from('bollette-pdf')
        .upload(filePath, pdfFile, { contentType: 'application/pdf' })
      if (storageError) throw new Error('Errore nel caricamento: ' + storageError.message)

      const pdfUrl = `https://iimzetvymamadclfblgy.supabase.co/storage/v1/object/public/bollette-pdf/${filePath}`

      setUploadStatus('processing')
      const webhookRes = await fetch('https://hook.eu1.make.com/5n4w2qn99uf830yktlyjw8o17ogcd1xt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, pdf_url: pdfUrl })
      })
      if (!webhookRes.ok) throw new Error('Errore nell\'invio al sistema di elaborazione')

      setUploadStatus('success')
      if (window.posthog) window.posthog.capture('pdf_upload', { fonte: 'form_contratto' })
      setTimeout(async () => { if (onRefresh) await onRefresh(); if (onGoHome) onGoHome(); else onBack() }, 5000)
    } catch (e) {
      console.error('Upload PDF error:', e)
      setUploadStatus('error')
      setUploadError(e.message)
    }
  }

  // Step "bolletta" — upload PDF per auto-fill
  if (step === 'bolletta') {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <button onClick={() => { setStep(2); setPdfFile(null); setUploadStatus('idle'); setUploadError(null) }} className="p-2 -ml-2 rounded-xl hover:bg-gray-100"><ChevronLeft size={22} className="text-gray-600" /></button>
          <h1 className="text-xl font-bold text-gray-900">Carica bolletta</h1>
        </div>
        <p className="text-sm text-gray-500">Carica una bolletta di <span className="font-semibold text-gray-900">{form.fornitore}</span> e compileremo automaticamente i dati del contratto.</p>

        {uploadStatus === 'success' ? (
          <Card className="p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto">
              <Check size={24} className="text-green-600" />
            </div>
            <p className="text-sm font-medium text-gray-900 mt-3">Bolletta caricata!</p>
            <p className="text-xs text-gray-500 mt-1">Contratto e bolletta verranno creati automaticamente in pochi secondi.</p>
          </Card>
        ) : (
          <>
            <Card
              className={`p-6 border-dashed border-2 text-center cursor-pointer transition-colors ${pdfFile ? 'border-bolly-500 bg-bolly-50' : 'border-gray-300 hover:border-gray-400'}`}
              onClick={() => pdfInputRef.current?.click()}
            >
              <input ref={pdfInputRef} type="file" accept="application/pdf" className="hidden"
                onChange={e => { if (e.target.files?.[0]) setPdfFile(e.target.files[0]) }} />
              {pdfFile ? (
                <>
                  <Check size={32} className="text-bolly-500 mx-auto" />
                  <p className="text-sm font-medium text-gray-900 mt-3">{pdfFile.name}</p>
                  <p className="text-xs text-gray-400 mt-1">Tocca per cambiare file</p>
                </>
              ) : (
                <>
                  <Upload size={32} className="text-gray-400 mx-auto" />
                  <p className="text-sm font-medium text-gray-700 mt-3">Tocca per selezionare il PDF della bolletta</p>
                  <p className="text-xs text-gray-400 mt-1">L'AI rileverà importo, scadenza, codice cliente e creerà il contratto per te</p>
                </>
              )}
            </Card>
            {uploadError && <p className="text-sm text-red-600 text-center">{uploadError}</p>}
            <button onClick={handlePdfAutoFill} disabled={!pdfFile || uploadStatus !== 'idle'}
              className="w-full py-3 bg-bolly-500 text-white font-semibold rounded-xl disabled:opacity-40">
              {uploadStatus === 'uploading' ? 'Caricamento...' : uploadStatus === 'processing' ? 'Elaborazione AI...' : 'Analizza bolletta'}
            </button>
          </>
        )}
      </div>
    )
  }

  // Step 0: Categoria
  if (step === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 -ml-2 rounded-xl hover:bg-gray-100"><ChevronLeft size={22} className="text-gray-600" /></button>
          <h1 className="text-xl font-bold text-gray-900">Nuovo contratto</h1>
        </div>
        <p className="text-gray-500">Seleziona la categoria</p>
        <div className="grid grid-cols-2 gap-3">
          {CATEGORIE.map(cat => {
            const Icon = IconMap[cat.icon] || Package
            return (
              <Card key={cat.id} className="p-4 text-center" onClick={() => { update('categoria', cat.id); setCustomMode(cat.freeText || false); setCustomText(''); setStep(1) }}>
                <div className="flex flex-col items-center gap-2">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: cat.color + '18' }}>
                    <Icon size={24} style={{ color: cat.color }} />
                  </div>
                  <p className="font-medium text-gray-900">{cat.label}</p>
                </div>
              </Card>
            )
          })}
        </div>
      </div>
    )
  }

  // Step 1: Fornitore
  if (step === 1) {
    const catInfo = CATEGORIE.find(c => c.id === form.categoria)
    const fornitori = FORNITORI[form.categoria] || []

    if (catInfo?.freeText || customMode) {
      return (
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <button onClick={() => catInfo?.freeText ? setStep(0) : setCustomMode(false)} className="p-2 -ml-2 rounded-xl hover:bg-gray-100"><ChevronLeft size={22} className="text-gray-600" /></button>
            <h1 className="text-xl font-bold text-gray-900">Cosa devi pagare?</h1>
          </div>
          <div className="space-y-3">
            <p className="text-sm text-gray-500">Descrivi il pagamento</p>
            <input type="text" value={customText} onChange={e => setCustomText(e.target.value)} placeholder={catInfo?.placeholder || 'Nome fornitore o descrizione...'} autoFocus
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-bolly-500 focus:border-transparent outline-none text-base" />
            <button onClick={() => { update('fornitore', customText); setStep(2) }} disabled={!customText.trim()}
              className="w-full py-3 bg-bolly-500 text-white rounded-xl font-semibold disabled:opacity-40">Continua</button>
          </div>
        </div>
      )
    }

    const risultatiRicerca = searchQuery.length >= 2 ? cercaFornitore(form.categoria, searchQuery) : []
    const mostraRicerca = searchQuery.length >= 2

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <button onClick={() => { setStep(0); setSearchQuery('') }} className="p-2 -ml-2 rounded-xl hover:bg-gray-100"><ChevronLeft size={22} className="text-gray-600" /></button>
          <h1 className="text-xl font-bold text-gray-900">Seleziona fornitore</h1>
        </div>
        <div className="relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            placeholder="Cerca fornitore..." className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-bolly-500 focus:border-transparent outline-none text-base" />
        </div>
        <div className="space-y-2">
          {mostraRicerca ? (
            risultatiRicerca.length > 0 ? risultatiRicerca.map(f => (
              <Card key={f} className="p-4" onClick={() => { update('fornitore', f); setSearchQuery(''); setStep(2) }}>
                <p className="font-medium text-gray-900">{f}</p>
              </Card>
            )) : (
              <div className="text-center py-4">
                <p className="text-gray-500 text-sm mb-3">Nessun fornitore trovato per "{searchQuery}"</p>
                <button onClick={() => { setCustomText(searchQuery); setSearchQuery(''); setCustomMode(true) }}
                  className="text-bolly-600 font-medium text-sm">Aggiungi "{searchQuery}" manualmente →</button>
              </div>
            )
          ) : (
            <>
              {fornitori.map(f => (
                <Card key={f} className="p-4" onClick={() => { update('fornitore', f); setStep(2) }}>
                  <p className="font-medium text-gray-900">{f}</p>
                </Card>
              ))}
            </>
          )}
          {!mostraRicerca && (
            <Card className="p-4 border-dashed border-2 border-gray-200" onClick={() => setCustomMode(true)}>
              <div className="flex items-center gap-2 text-gray-500"><PenLine size={18} /><p className="font-medium">Scrivi nome personalizzato...</p></div>
            </Card>
          )}
        </div>
      </div>
    )
  }

  // Step 2: Dettagli
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => setStep(1)} className="p-2 -ml-2 rounded-xl hover:bg-gray-100"><ChevronLeft size={22} className="text-gray-600" /></button>
        <h1 className="text-xl font-bold text-gray-900">Dettagli contratto</h1>
      </div>

      {/* Banner "Hai già una bolletta?" */}
      <Card className="p-4 bg-bolly-50 border border-bolly-200 cursor-pointer" onClick={() => setStep('bolletta')}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-bolly-100 flex items-center justify-center flex-shrink-0">
            <Upload size={20} className="text-bolly-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-bolly-700">Hai già una bolletta di {form.fornitore}?</p>
            <p className="text-xs text-bolly-600 mt-0.5">Caricala e compileremo i dati automaticamente</p>
          </div>
          <ChevronRight size={18} className="text-bolly-400" />
        </div>
      </Card>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Intestatario</label>
          <input type="text" value={form.intestatario} onChange={e => update('intestatario', e.target.value)} placeholder="Nome e cognome"
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-bolly-500 focus:border-transparent outline-none" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Codice cliente / N° contratto</label>
          <input type="text" value={form.codice} onChange={e => update('codice', e.target.value)} placeholder="Opzionale"
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-bolly-500 focus:border-transparent outline-none" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Ricezione bollette</label>
          <div className="flex gap-2">
            {['email', 'portale', 'cartaceo'].map(m => (
              <button key={m} onClick={() => update('metodo_ricezione', m)}
                className={`flex-1 py-2 px-3 rounded-xl text-sm font-medium border transition-colors ${form.metodo_ricezione === m ? 'bg-bolly-50 border-bolly-300 text-bolly-600' : 'border-gray-200 text-gray-600'}`}>
                {m.charAt(0).toUpperCase() + m.slice(1)}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-700">Domiciliazione bancaria</label>
          <button onClick={() => update('domiciliazione', !form.domiciliazione)} className={`w-12 h-7 rounded-full transition-colors ${form.domiciliazione ? 'bg-bolly-500' : 'bg-gray-300'}`}>
            <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${form.domiciliazione ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Data inizio contratto</label>
          <input type="date" value={form.data_inizio} onChange={e => update('data_inizio', e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-bolly-500 focus:border-transparent outline-none bg-white text-gray-900"
            style={{ WebkitAppearance: 'none', minHeight: '44px', colorScheme: 'light' }} />
        </div>

        {/* Ricorrente */}
        <div className="pt-2 border-t border-gray-100">
          <div className="flex items-center justify-between">
            <div><label className="text-sm font-medium text-gray-700">Importo fisso ricorrente</label><p className="text-xs text-gray-400 mt-0.5">Per abbonamenti e spese a importo fisso</p></div>
            <button onClick={() => update('ricorrente', !form.ricorrente)} className={`w-12 h-7 rounded-full transition-colors ${form.ricorrente ? 'bg-pink-500' : 'bg-gray-300'}`}>
              <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${form.ricorrente ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
          {form.ricorrente && (
            <div className="mt-3 space-y-3 p-3 bg-pink-50 rounded-xl">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Importo (€)</label>
                <input type="number" step="0.01" value={form.importo_ricorrente} onChange={e => update('importo_ricorrente', e.target.value)} placeholder="es. 13.99"
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-pink-500 focus:border-transparent outline-none" />
              </div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Frequenza</label>
                <div className="flex flex-col gap-2">
                  <div className="flex justify-center gap-2">
                    {[{ id: 'mensile', l: 'Mensile' }, { id: 'bimestrale', l: 'Bimestrale' }, { id: 'trimestrale', l: 'Trimestrale' }].map(f => (
                      <button key={f.id} onClick={() => update('frequenza', f.id)}
                        className={`py-2 px-3 rounded-xl text-xs font-medium border ${form.frequenza === f.id ? 'bg-pink-100 border-pink-300 text-pink-700' : 'border-gray-200 text-gray-600'}`}>{f.l}</button>
                    ))}
                  </div>
                  <div className="flex justify-center gap-2">
                    {[{ id: 'semestrale', l: 'Semestrale' }, { id: 'annuale', l: 'Annuale' }].map(f => (
                      <button key={f.id} onClick={() => update('frequenza', f.id)}
                        className={`py-2 px-3 rounded-xl text-xs font-medium border ${form.frequenza === f.id ? 'bg-pink-100 border-pink-300 text-pink-700' : 'border-gray-200 text-gray-600'}`}>{f.l}</button>
                    ))}
                  </div>
                </div>
              </div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Prossimo addebito</label>
                <input type="date" value={form.prossimo_addebito} onChange={e => update('prossimo_addebito', e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-pink-500 focus:border-transparent outline-none bg-white text-gray-900"
                  style={{ WebkitAppearance: 'none', minHeight: '44px', colorScheme: 'light' }} />
              </div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Data fine (opzionale)</label>
                <div className="relative">
                  <input type="date" value={form.data_fine} onChange={e => update('data_fine', e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-pink-500 focus:border-transparent outline-none bg-white text-gray-900"
                    style={{ WebkitAppearance: 'none', minHeight: '44px', colorScheme: 'light' }} />
                  {form.data_fine && (
                    <button type="button" onClick={() => update('data_fine', '')} className="absolute right-10 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-gray-100 text-gray-400">
                      <X size={16} />
                    </button>
                  )}
                </div>
                <p className="text-xs text-gray-400 mt-1">{form.categoria === 'finanziamento' ? 'Quando termina il piano di rimborso' : 'Quando scade il contratto'}</p>
              </div>
            </div>
          )}
        </div>

        {/* Abitazione */}
        {abitazioni && abitazioni.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Abitazione</label>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => update('abitazione_id', null)}
                className={`py-2 px-3 rounded-xl text-sm font-medium border transition-colors ${!form.abitazione_id ? 'bg-bolly-50 border-bolly-300 text-bolly-600' : 'border-gray-200 text-gray-600'}`}
              >
                Nessuna
              </button>
              {abitazioni.map(ab => {
                const iconInfo = getIconaAbitazione(ab.icona)
                const AbIcon = iconInfo.icon
                return (
                  <button
                    key={ab.id}
                    onClick={() => update('abitazione_id', ab.id)}
                    className={`py-2 px-3 rounded-xl text-sm font-medium border transition-colors flex items-center gap-1.5 ${form.abitazione_id === ab.id ? 'bg-bolly-50 border-bolly-300 text-bolly-600' : 'border-gray-200 text-gray-600'}`}
                  >
                    <AbIcon size={14} />
                    {ab.nome}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Note</label>
          <textarea value={form.note} onChange={e => update('note', e.target.value)} rows={2} placeholder="Opzionale"
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-bolly-500 focus:border-transparent outline-none resize-none" />
        </div>
      </div>
      <button onClick={handleSave} disabled={saving || !form.fornitore}
        className="w-full py-3 bg-bolly-500 text-white font-semibold rounded-xl disabled:opacity-40">{saving ? 'Salvataggio...' : 'Salva contratto'}</button>
    </div>
  )
}

// ============================================================
// FORM BOLLETTA
// ============================================================

function FormBolletta({ contratti, contrattoId, onSave, onBack, session, onRefresh, onGoHome }) {
  const [mode, setMode] = useState('contratto')
  const [saving, setSaving] = useState(false)
  const [pdfFile, setPdfFile] = useState(null)
  const [uploadStatus, setUploadStatus] = useState('idle') // idle, uploading, processing, success, error
  const [uploadError, setUploadError] = useState(null)
  const fileInputRef = useRef(null)
  const [form, setForm] = useState({
    contratto_id: contrattoId || (contratti[0]?.id || ''),
    importo: '', periodo: '', periodo_fine: '', emissione: '', scadenza: '', descrizione_libera: '', metodo_pagamento: null,
    consumo: '', unita_misura: '',
  })
  const update = (f, v) => setForm(p => ({ ...p, [f]: v }))

  const handlePdfUpload = async () => {
    if (!pdfFile || !session?.user?.id) return
    setUploadStatus('uploading')
    setUploadError(null)
    try {
      const userId = session.user.id
      const timestamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 15)
      const filePath = `${userId}/${timestamp}.pdf`

      const { error: storageError } = await supabase.storage
        .from('bollette-pdf')
        .upload(filePath, pdfFile, { contentType: 'application/pdf' })
      if (storageError) throw new Error('Errore nel caricamento del file: ' + storageError.message)

      const pdfUrl = `https://iimzetvymamadclfblgy.supabase.co/storage/v1/object/public/bollette-pdf/${filePath}`

      setUploadStatus('processing')
      const webhookRes = await fetch('https://hook.eu1.make.com/5n4w2qn99uf830yktlyjw8o17ogcd1xt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, pdf_url: pdfUrl })
      })
      if (!webhookRes.ok) throw new Error('Errore nell\'invio al sistema di elaborazione')

      setUploadStatus('success')
      if (window.posthog) window.posthog.capture('pdf_upload', { fonte: 'form_bolletta' })
      setTimeout(async () => { if (onRefresh) await onRefresh(); if (onGoHome) onGoHome(); else onBack() }, 5000)
    } catch (e) {
      console.error('Upload PDF error:', e)
      setUploadStatus('error')
      setUploadError(e.message)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const data = {
        importo: parseFloat(form.importo),
        periodo: form.periodo ? form.periodo + '-01' : null,
        periodo_fine: form.periodo_fine ? form.periodo_fine + '-01' : null,
        emissione: form.emissione || null,
        scadenza: form.scadenza,
        metodo_pagamento: form.metodo_pagamento,
        stato_elaborazione: 'ok',
        consumo: form.consumo ? parseFloat(form.consumo) : null,
        unita_misura: form.consumo && form.unita_misura ? form.unita_misura : null,
      }
      // RID con scadenza passata → già addebitata automaticamente
      if (form.metodo_pagamento === 'rid' && form.scadenza && new Date(form.scadenza) < new Date()) {
        data.pagata = true
      }
      if (mode === 'libero') {
        data.descrizione_libera = form.descrizione_libera
        data.fonte = 'manuale'
        data.contratto_id = null
      } else {
        data.contratto_id = Number(form.contratto_id)
        data.fonte = 'manuale'
      }
      await onSave(data)
    } catch (e) { console.error(e) }
    setSaving(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-2 -ml-2 rounded-xl hover:bg-gray-100"><ChevronLeft size={22} className="text-gray-600" /></button>
        <h1 className="text-xl font-bold text-gray-900">Nuova bolletta</h1>
      </div>

      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
        {[{ id: 'contratto', l: 'Da contratto' }, { id: 'libero', l: 'Manuale' }, { id: 'pdf', l: 'Carica PDF' }].map(m => (
          <button key={m.id} onClick={() => setMode(m.id)}
            className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${mode === m.id ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}>{m.l}</button>
        ))}
      </div>

      {mode === 'pdf' && (
        <div className="space-y-4">
          {uploadStatus === 'success' ? (
            <Card className="p-6 text-center">
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto">
                <Check size={24} className="text-green-600" />
              </div>
              <p className="text-sm font-medium text-gray-900 mt-3">PDF caricato con successo!</p>
              <p className="text-xs text-gray-500 mt-1">La bolletta verrà elaborata in pochi secondi.</p>
            </Card>
          ) : (
            <>
              <Card
                className={`p-6 border-dashed border-2 text-center cursor-pointer transition-colors ${pdfFile ? 'border-bolly-500 bg-bolly-50' : 'border-gray-300 hover:border-gray-400'}`}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  onChange={e => { if (e.target.files?.[0]) setPdfFile(e.target.files[0]) }}
                />
                {pdfFile ? (
                  <>
                    <Check size={32} className="text-bolly-500 mx-auto" />
                    <p className="text-sm font-medium text-gray-900 mt-3">{pdfFile.name}</p>
                    <p className="text-xs text-gray-400 mt-1">Tocca per cambiare file</p>
                  </>
                ) : (
                  <>
                    <Upload size={32} className="text-gray-400 mx-auto" />
                    <p className="text-sm font-medium text-gray-700 mt-3">Tocca per selezionare il PDF</p>
                    <p className="text-xs text-gray-400 mt-1">L'AI riconosce automaticamente fornitore, importo e scadenza</p>
                  </>
                )}
              </Card>

              {uploadStatus === 'error' && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                  {uploadError || 'Si è verificato un errore. Riprova.'}
                </div>
              )}

              {pdfFile && uploadStatus !== 'uploading' && uploadStatus !== 'processing' && (
                <button
                  onClick={handlePdfUpload}
                  className="w-full py-3 bg-bolly-500 text-white font-semibold rounded-xl hover:bg-bolly-600 transition-colors"
                >Analizza bolletta</button>
              )}

              {(uploadStatus === 'uploading' || uploadStatus === 'processing') && (
                <div className="flex items-center justify-center gap-3 py-3">
                  <Loader2 size={20} className="animate-spin text-bolly-500" />
                  <p className="text-sm text-gray-600">
                    {uploadStatus === 'uploading' ? 'Caricamento PDF...' : 'Analisi in corso...'}
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {mode === 'contratto' && !contrattoId && !form.contratto_id && (
        contratti.length === 0 ? (
          <Card className="p-6 text-center">
            <Package size={32} className="text-gray-300 mx-auto mb-3" />
            <p className="font-medium text-gray-700">Nessun contratto ancora</p>
            <p className="text-sm text-gray-400 mt-1">Crea prima un contratto dalla sezione "Nuovo contratto", poi potrai aggiungere bollette qui.</p>
          </Card>
        ) : (
          <div className="space-y-2">
            <p className="text-sm text-gray-500">Seleziona il contratto</p>
            {contratti.map(c => (
              <Card key={c.id} className="p-4" onClick={() => update('contratto_id', c.id)}>
                <div className="flex items-center gap-3">
                  <CategoriaIcon categoriaId={c.categoria} />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900">{c.fornitore}</p>
                    <p className="text-sm text-gray-500">{getCategoria(c.categoria).label}</p>
                  </div>
                  <ChevronRight size={18} className="text-gray-400" />
                </div>
              </Card>
            ))}
          </div>
        )
      )}

      {mode === 'contratto' && (contrattoId || form.contratto_id) && (() => {
        const selContratto = contratti.find(c => c.id === (contrattoId || Number(form.contratto_id)))
        return (
          <>
            {!contrattoId && (
              <Card className="p-4 border-bolly-200 bg-bolly-50" onClick={() => update('contratto_id', '')}>
                <div className="flex items-center gap-3">
                  <CategoriaIcon categoriaId={selContratto?.categoria} />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900">{selContratto?.fornitore}</p>
                    <p className="text-sm text-bolly-500">Tocca per cambiare</p>
                  </div>
                </div>
              </Card>
            )}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Importo (€)</label>
                <input type="number" step="0.01" value={form.importo} onChange={e => update('importo', e.target.value)} placeholder="0.00"
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-bolly-500 focus:border-transparent outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Periodo di competenza</label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-xs text-gray-400">Da</span>
                    <input type="month" value={form.periodo} onChange={e => update('periodo', e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-bolly-500 focus:border-transparent outline-none bg-white text-gray-900"
                      style={{ WebkitAppearance: 'none', minHeight: '44px', colorScheme: 'light' }} />
                  </div>
                  <div>
                    <span className="text-xs text-gray-400">A</span>
                    <input type="month" value={form.periodo_fine} onChange={e => update('periodo_fine', e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-bolly-500 focus:border-transparent outline-none bg-white text-gray-900"
                      style={{ WebkitAppearance: 'none', minHeight: '44px', colorScheme: 'light' }} />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Emissione</label>
                  <input type="date" value={form.emissione} onChange={e => update('emissione', e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-bolly-500 focus:border-transparent outline-none bg-white text-gray-900"
                    style={{ WebkitAppearance: 'none', minHeight: '44px', colorScheme: 'light' }} />
                </div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Scadenza</label>
                  <input type="date" value={form.scadenza} onChange={e => update('scadenza', e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-bolly-500 focus:border-transparent outline-none bg-white text-gray-900"
                    style={{ WebkitAppearance: 'none', minHeight: '44px', colorScheme: 'light' }} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Metodo di pagamento</label>
                <div className="flex gap-2">
                  {[{ id: 'rid', l: 'RID' }, { id: 'bollettino', l: 'Bollettino' }, { id: 'manuale', l: 'Manuale' }].map(m => (
                    <button key={m.id} onClick={() => update('metodo_pagamento', m.id)}
                      className={`flex-1 py-2 px-3 rounded-xl text-sm font-medium border transition-colors ${form.metodo_pagamento === m.id ? 'bg-bolly-50 border-bolly-300 text-bolly-600' : 'border-gray-200 text-gray-600'}`}>
                      {m.l}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Consumo (opzionale)</label>
                <div className="grid grid-cols-2 gap-2">
                  <input type="number" step="0.01" value={form.consumo} onChange={e => update('consumo', e.target.value)} placeholder="es. 245"
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-bolly-500 focus:border-transparent outline-none" />
                  <div className="flex gap-1">
                    {['kWh', 'Smc', 'mc'].map(u => (
                      <button key={u} onClick={() => update('unita_misura', u)}
                        className={`flex-1 py-2 rounded-xl text-xs font-medium border transition-colors ${form.unita_misura === u ? 'bg-blue-50 border-blue-300 text-blue-600' : 'border-gray-200 text-gray-500'}`}>
                        {u}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <button onClick={handleSave}
              disabled={saving || !form.importo || !form.scadenza || !form.metodo_pagamento}
              className="w-full py-3 bg-bolly-500 text-white font-semibold rounded-xl disabled:opacity-40">{saving ? 'Salvataggio...' : 'Salva bolletta'}</button>
          </>
        )
      })()}

      {mode === 'libero' && (
        <>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Descrizione pagamento</label>
              <input type="text" value={form.descrizione_libera} onChange={e => update('descrizione_libera', e.target.value)}
                placeholder="Scrivi cosa devi pagare, es. Rata frigorifero, Bollo auto..." autoFocus
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-bolly-500 focus:border-transparent outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Importo (€)</label>
              <input type="number" step="0.01" value={form.importo} onChange={e => update('importo', e.target.value)} placeholder="0.00"
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-bolly-500 focus:border-transparent outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Periodo di competenza</label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-xs text-gray-400">Da</span>
                  <input type="month" value={form.periodo} onChange={e => update('periodo', e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-bolly-500 focus:border-transparent outline-none bg-white text-gray-900"
                    style={{ WebkitAppearance: 'none', minHeight: '44px', colorScheme: 'light' }} />
                </div>
                <div>
                  <span className="text-xs text-gray-400">A</span>
                  <input type="month" value={form.periodo_fine} onChange={e => update('periodo_fine', e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-bolly-500 focus:border-transparent outline-none bg-white text-gray-900"
                    style={{ WebkitAppearance: 'none', minHeight: '44px', colorScheme: 'light' }} />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Emissione</label>
                <input type="date" value={form.emissione} onChange={e => update('emissione', e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-bolly-500 focus:border-transparent outline-none bg-white text-gray-900"
                  style={{ WebkitAppearance: 'none', minHeight: '44px', colorScheme: 'light' }} />
              </div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Scadenza</label>
                <input type="date" value={form.scadenza} onChange={e => update('scadenza', e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-bolly-500 focus:border-transparent outline-none bg-white text-gray-900"
                  style={{ WebkitAppearance: 'none', minHeight: '44px', colorScheme: 'light' }} />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Metodo di pagamento</label>
              <div className="flex gap-2">
                {[{ id: 'rid', l: 'RID' }, { id: 'bollettino', l: 'Bollettino' }, { id: 'manuale', l: 'Manuale' }].map(m => (
                  <button key={m.id} onClick={() => update('metodo_pagamento', m.id)}
                    className={`flex-1 py-2 px-3 rounded-xl text-sm font-medium border transition-colors ${form.metodo_pagamento === m.id ? 'bg-bolly-50 border-bolly-300 text-bolly-600' : 'border-gray-200 text-gray-600'}`}>
                    {m.l}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <button onClick={handleSave}
            disabled={saving || !form.importo || !form.scadenza || !form.descrizione_libera.trim() || !form.metodo_pagamento}
            className="w-full py-3 bg-bolly-500 text-white font-semibold rounded-xl disabled:opacity-40">{saving ? 'Salvataggio...' : 'Salva bolletta'}</button>
        </>
      )}
    </div>
  )
}

// ============================================================
// FORM MODIFICA CONTRATTO
// ============================================================

function FormModificaContratto({ contratto, onSave, onBack, abitazioni }) {
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    categoria: contratto.categoria || '',
    fornitore: contratto.fornitore || '',
    intestatario: contratto.intestatario || '',
    codice: contratto.codice || '',
    metodo_ricezione: contratto.metodo_ricezione || 'email',
    domiciliazione: contratto.domiciliazione || false,
    data_inizio: contratto.data_inizio || '',
    data_fine: contratto.data_fine || '',
    note: contratto.note || '',
    ricorrente: contratto.ricorrente || false,
    importo_ricorrente: contratto.importo_ricorrente || '',
    frequenza: contratto.frequenza || 'mensile',
    prossimo_addebito: contratto.prossimo_addebito || '',
    abitazione_id: contratto.abitazione_id || null,
  })
  const update = (f, v) => setForm(p => ({ ...p, [f]: v }))

  const handleSave = async () => {
    setSaving(true)
    try {
      const data = { ...form }
      // Converte stringhe vuote in null per campi data opzionali
      if (!data.data_fine) data.data_fine = null
      if (!data.data_inizio) data.data_inizio = null
      if (!data.abitazione_id) data.abitazione_id = null
      if (data.ricorrente) data.importo_ricorrente = parseFloat(data.importo_ricorrente)
      else { delete data.importo_ricorrente; delete data.frequenza; delete data.prossimo_addebito; delete data.data_fine }
      await onSave(data)
    } catch (e) { console.error(e) }
    setSaving(false)
  }

  return (
    <div className="space-y-6 pb-16">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-2 -ml-2 rounded-xl hover:bg-gray-100"><ChevronLeft size={22} className="text-gray-600" /></button>
        <h1 className="text-xl font-bold text-gray-900">Modifica contratto</h1>
      </div>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Fornitore</label>
          <input type="text" value={form.fornitore} onChange={e => update('fornitore', e.target.value)} placeholder="Nome fornitore"
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-bolly-500 focus:border-transparent outline-none" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Intestatario</label>
          <input type="text" value={form.intestatario} onChange={e => update('intestatario', e.target.value)} placeholder="Nome e cognome"
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-bolly-500 focus:border-transparent outline-none" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Codice cliente / N° contratto</label>
          <input type="text" value={form.codice} onChange={e => update('codice', e.target.value)} placeholder="Opzionale"
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-bolly-500 focus:border-transparent outline-none" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Ricezione bollette</label>
          <div className="flex gap-2">
            {['email', 'portale', 'cartaceo'].map(m => (
              <button key={m} onClick={() => update('metodo_ricezione', m)}
                className={`flex-1 py-2 px-3 rounded-xl text-sm font-medium border transition-colors ${form.metodo_ricezione === m ? 'bg-bolly-50 border-bolly-300 text-bolly-600' : 'border-gray-200 text-gray-600'}`}>
                {m.charAt(0).toUpperCase() + m.slice(1)}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-700">Domiciliazione bancaria</label>
          <button onClick={() => update('domiciliazione', !form.domiciliazione)} className={`w-12 h-7 rounded-full transition-colors ${form.domiciliazione ? 'bg-bolly-500' : 'bg-gray-300'}`}>
            <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${form.domiciliazione ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Data inizio contratto</label>
          <input type="date" value={form.data_inizio} onChange={e => update('data_inizio', e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-bolly-500 focus:border-transparent outline-none bg-white text-gray-900"
            style={{ WebkitAppearance: 'none', minHeight: '44px', colorScheme: 'light' }} />
        </div>
        <div className="pt-2 border-t border-gray-100">
          <div className="flex items-center justify-between">
            <div><label className="text-sm font-medium text-gray-700">Importo fisso ricorrente</label><p className="text-xs text-gray-400 mt-0.5">Per abbonamenti e spese a importo fisso</p></div>
            <button onClick={() => update('ricorrente', !form.ricorrente)} className={`w-12 h-7 rounded-full transition-colors ${form.ricorrente ? 'bg-pink-500' : 'bg-gray-300'}`}>
              <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${form.ricorrente ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
          {form.ricorrente && (
            <div className="mt-3 space-y-3 p-3 bg-pink-50 rounded-xl">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Importo (€)</label>
                <input type="number" step="0.01" value={form.importo_ricorrente} onChange={e => update('importo_ricorrente', e.target.value)} placeholder="es. 13.99"
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-pink-500 focus:border-transparent outline-none" />
              </div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Frequenza</label>
                <div className="flex flex-col gap-2">
                  <div className="flex justify-center gap-2">
                    {[{ id: 'mensile', l: 'Mensile' }, { id: 'bimestrale', l: 'Bimestrale' }, { id: 'trimestrale', l: 'Trimestrale' }].map(f => (
                      <button key={f.id} onClick={() => update('frequenza', f.id)}
                        className={`py-2 px-3 rounded-xl text-xs font-medium border ${form.frequenza === f.id ? 'bg-pink-100 border-pink-300 text-pink-700' : 'border-gray-200 text-gray-600'}`}>{f.l}</button>
                    ))}
                  </div>
                  <div className="flex justify-center gap-2">
                    {[{ id: 'semestrale', l: 'Semestrale' }, { id: 'annuale', l: 'Annuale' }].map(f => (
                      <button key={f.id} onClick={() => update('frequenza', f.id)}
                        className={`py-2 px-3 rounded-xl text-xs font-medium border ${form.frequenza === f.id ? 'bg-pink-100 border-pink-300 text-pink-700' : 'border-gray-200 text-gray-600'}`}>{f.l}</button>
                    ))}
                  </div>
                </div>
              </div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Prossimo addebito</label>
                <input type="date" value={form.prossimo_addebito} onChange={e => update('prossimo_addebito', e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-pink-500 focus:border-transparent outline-none bg-white text-gray-900"
                  style={{ WebkitAppearance: 'none', minHeight: '44px', colorScheme: 'light' }} />
              </div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Data fine (opzionale)</label>
                <div className="relative">
                  <input type="date" value={form.data_fine} onChange={e => update('data_fine', e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-pink-500 focus:border-transparent outline-none bg-white text-gray-900"
                    style={{ WebkitAppearance: 'none', minHeight: '44px', colorScheme: 'light' }} />
                  {form.data_fine && (
                    <button type="button" onClick={() => update('data_fine', '')} className="absolute right-10 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-gray-100 text-gray-400">
                      <X size={16} />
                    </button>
                  )}
                </div>
                <p className="text-xs text-gray-400 mt-1">{form.categoria === 'finanziamento' ? 'Quando termina il piano di rimborso' : 'Quando scade il contratto'}</p>
              </div>
            </div>
          )}
        </div>
        {/* Abitazione */}
        {abitazioni && abitazioni.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Abitazione</label>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => update('abitazione_id', null)}
                className={`py-2 px-3 rounded-xl text-sm font-medium border transition-colors ${!form.abitazione_id ? 'bg-bolly-50 border-bolly-300 text-bolly-600' : 'border-gray-200 text-gray-600'}`}
              >
                Nessuna
              </button>
              {abitazioni.map(ab => {
                const iconInfo = getIconaAbitazione(ab.icona)
                const AbIcon = iconInfo.icon
                return (
                  <button
                    key={ab.id}
                    onClick={() => update('abitazione_id', ab.id)}
                    className={`py-2 px-3 rounded-xl text-sm font-medium border transition-colors flex items-center gap-1.5 ${form.abitazione_id === ab.id ? 'bg-bolly-50 border-bolly-300 text-bolly-600' : 'border-gray-200 text-gray-600'}`}
                  >
                    <AbIcon size={14} />
                    {ab.nome}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Note</label>
          <textarea value={form.note} onChange={e => update('note', e.target.value)} rows={2} placeholder="Opzionale"
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-bolly-500 focus:border-transparent outline-none resize-none" />
        </div>
      </div>
      <button onClick={handleSave} disabled={saving || !form.fornitore}
        className="w-full py-3 bg-bolly-500 text-white font-semibold rounded-xl disabled:opacity-40">{saving ? 'Salvataggio...' : 'Salva modifiche'}</button>
    </div>
  )
}

// ============================================================
// NOTIFICHE (calcolate lato client)
// ============================================================

function Notifiche({ contratti, bollette, dbNotifiche = [], onNotificheLette }) {

  const scadenzeNotifiche = useMemo(() => {
    const list = []
    bollette.filter(b => !b.pagata && b.scadenza && b.stato_elaborazione !== 'comunicazione' && b.stato_elaborazione !== 'errore_parsing').forEach(b => {
      const c = contratti.find(ct => ct.id === b.contratto_id)
      const label = c?.fornitore || b.descrizione_libera || 'Pagamento'
      const giorni = giorniDa(b.scadenza)
      if (giorni >= 0 && giorni <= 7) {
        list.push({ tipo: giorni <= 3 ? 'urgente' : 'promemoria', titolo: giorni === 0 ? 'Scade OGGI' : `Scade tra ${giorni} giorni`, desc: `${label} — ${formatEuro(b.importo)}` })
      } else if (giorni < 0) {
        list.push({ tipo: 'scaduta', titolo: 'Bolletta scaduta', desc: `${label} — ${formatEuro(b.importo)} (scaduta da ${Math.abs(giorni)} gg)` })
      }
    })
    return list.sort((a, b) => { const p = { scaduta: 0, urgente: 1, promemoria: 2 }; return (p[a.tipo] ?? 9) - (p[b.tipo] ?? 9) })
  }, [contratti, bollette])

  const cfg = { urgente: 'bg-amber-50 border-amber-200 text-amber-600', scaduta: 'bg-red-50 border-red-200 text-red-600', promemoria: 'bg-bolly-50 border-bolly-200 text-bolly-500', broadcast: 'bg-blue-50 border-blue-200 text-blue-600' }

  const handleNotificaClick = (n) => {
    if (n.url) {
      window.open(n.url, '_blank')
      if (n.id && !n.letta) {
        segnaNotificaLetta(n.id).then(() => {
          const updated = dbNotifiche.map(x => x.id === n.id ? { ...x, letta: true } : x)
          if (onNotificheLette) onNotificheLette(updated)
        }).catch(() => {})
      }
    }
  }

  const handleDeleteNotifica = (e, id) => {
    e.stopPropagation()
    deleteNotifica(id).then(() => {
      const updated = dbNotifiche.filter(x => x.id !== id)
      if (onNotificheLette) onNotificheLette(updated)
    }).catch(() => {})
  }

  const tutteNotifiche = [
    ...dbNotifiche.map(n => ({
      id: n.id,
      tipo: n.tipo === 'broadcast' ? 'broadcast' : (n.tipo || 'promemoria'),
      titolo: n.titolo,
      desc: n.messaggio,
      url: n.url,
      letta: n.letta,
      created_at: n.created_at
    })),
    ...scadenzeNotifiche
  ]

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Notifiche</h1>
      {tutteNotifiche.length === 0 ? (
        <div className="text-center py-12"><Bell size={40} className="text-gray-300 mx-auto mb-3" /><p className="text-gray-400">Nessuna notifica</p></div>
      ) : (
        <div className="space-y-2">
          {tutteNotifiche.map((n, i) => (
            <Card key={n.id || `scad-${i}`} className={`p-4 ${cfg[n.tipo] || cfg.promemoria} ${n.url ? 'cursor-pointer active:scale-[0.98] transition-transform' : ''} ${n.letta === false ? 'ring-2 ring-blue-300' : ''}`}
              onClick={() => handleNotificaClick(n)}>
              <div className="flex items-start gap-3">
                {n.tipo === 'broadcast' ? <MessageCircle size={20} className="mt-0.5" /> : <AlertTriangle size={20} className="mt-0.5" />}
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{n.titolo}</p>
                  <p className="text-sm text-gray-600 mt-0.5">{n.desc}</p>
                  {n.url && <p className="text-xs text-blue-500 mt-1 font-medium">Tocca per aprire →</p>}
                </div>
                {n.id && <button onClick={(e) => handleDeleteNotifica(e, n.id)} className="p-1 rounded-lg hover:bg-black/10 shrink-0"><X size={16} className="text-gray-400" /></button>}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

// ============================================================
// CALENDARIO
// ============================================================

// ============================================================
// FORM SPESA GIORNALIERA
// ============================================================

function FormSpesa({ onSave, onBack, dataPrecompilata }) {
  const now = new Date()
  const oggi = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`
  const [importo, setImporto] = useState('')
  const [categoria, setCategoria] = useState('')
  const [descrizione, setDescrizione] = useState('')
  const [data, setData] = useState(dataPrecompilata || oggi)
  const [saving, setSaving] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [scanError, setScanError] = useState('')
  const importoRef = useRef(null)
  const fileInputRef = useRef(null)
  // Split inline
  const [wantSplit, setWantSplit] = useState(false)
  const [splitAmici, setSplitAmici] = useState([]) // lista amici caricati
  const [splitContattiEsterni, setSplitContattiEsterni] = useState([])
  const [splitSelected, setSplitSelected] = useState([]) // amici selezionati per lo split
  const [splitLoading, setSplitLoading] = useState(false)

  useEffect(() => { if (!scanning) importoRef.current?.focus() }, [scanning])

  // Carica amici quando attivi il toggle split
  useEffect(() => {
    if (wantSplit && splitAmici.length === 0 && splitContattiEsterni.length === 0) {
      setSplitLoading(true)
      Promise.all([getAmici().catch(() => []), getContattiEsterni().catch(() => [])])
        .then(([a, ce]) => { setSplitAmici(a); setSplitContattiEsterni(ce); setSplitLoading(false) })
    }
  }, [wantSplit])

  const handleScanScontrino = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setScanning(true)
    setScanError('')

    try {
      // Comprimi l'immagine prima dell'invio
      const compressedBase64 = await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = (ev) => {
          const img = new Image()
          img.onload = () => {
            const canvas = document.createElement('canvas')
            const MAX_SIZE = 1024
            let w = img.width, h = img.height
            if (w > h && w > MAX_SIZE) { h = h * MAX_SIZE / w; w = MAX_SIZE }
            else if (h > MAX_SIZE) { w = w * MAX_SIZE / h; h = MAX_SIZE }
            canvas.width = w
            canvas.height = h
            const ctx = canvas.getContext('2d')
            ctx.drawImage(img, 0, 0, w, h)
            resolve(canvas.toDataURL('image/jpeg', 0.8))
          }
          img.onerror = reject
          img.src = ev.target.result
        }
        reader.onerror = reject
        reader.readAsDataURL(file)
      })

      // Invia alla Edge Function
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('https://iimzetvymamadclfblgy.supabase.co/functions/v1/ocr-scontrino', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ image_base64: compressedBase64 }),
      })

      const result = await res.json()

      if (!res.ok) {
        throw new Error(result.error || 'Errore nella scansione')
      }

      // Pre-compila i campi
      if (result.importo) setImporto(String(result.importo))
      if (result.categoria_suggerita) setCategoria(result.categoria_suggerita)
      if (result.descrizione_suggerita) setDescrizione(result.descrizione_suggerita)
      if (result.data) setData(result.data)
      if (window.posthog) window.posthog.capture('ocr_scontrino', { successo: true })

    } catch (err) {
      console.error('Errore OCR:', err)
      setScanError('Non sono riuscito a leggere lo scontrino. Riprova con una foto più nitida.')
    }

    setScanning(false)
    // Reset file input per permettere nuovo scan
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const toggleSplitSelect = (p) => {
    const key = p.tipo + '_' + p.id
    if (splitSelected.find(s => s.tipo + '_' + s.id === key)) {
      setSplitSelected(splitSelected.filter(s => s.tipo + '_' + s.id !== key))
    } else {
      setSplitSelected([...splitSelected, p])
    }
  }

  const handleSave = async () => {
    if (!importo || !categoria) return
    setSaving(true)
    try {
      const spesaSalvata = await onSave({ importo: parseFloat(importo), categoria, descrizione: descrizione || null, data })
      // Se split attivo, crea lo split sulla spesa appena salvata
      if (wantSplit && splitSelected.length > 0 && spesaSalvata?.id) {
        const importoNum = parseFloat(importo)
        const numPartecipanti = splitSelected.length + 1
        const importoPerPersona = Math.round((importoNum / numPartecipanti) * 100) / 100
        const partecipanti = splitSelected.map(s => ({
          user_id: s.user_id || null,
          contatto_esterno_id: s.contatto_esterno_id || null,
          nome: s.nome,
          importo: importoPerPersona,
        }))
        await createSplit({
          tipo: 'spesa',
          riferimento_id: spesaSalvata.id,
          importo_totale: importoNum,
          divisione: 'uguale',
          nota: descrizione || null,
        }, partecipanti)
        if (window.posthog) window.posthog.capture('split_creato', { tipo: 'spesa', divisione: 'uguale', partecipanti: partecipanti.length, fonte: 'form_spesa' })
      }
      onBack()
    } catch (e) { console.error('Errore salvataggio spesa:', e) }
    setSaving(false)
  }

  const SpesaIconMap = { ShoppingCart, Car, Gamepad2, Heart, Home, Shirt, UtensilsCrossed, Split, MoreHorizontal }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-2 -ml-2 rounded-xl hover:bg-gray-100"><ChevronLeft size={20} /></button>
        <h1 className="text-xl font-bold text-gray-900">Registra spesa</h1>
      </div>

      {/* Bottone Scansiona Scontrino */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleScanScontrino}
        className="hidden"
      />
      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={scanning}
        className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold rounded-xl active:scale-[0.98] transition-all flex items-center justify-center gap-2.5 shadow-sm disabled:opacity-60"
      >
        {scanning ? (
          <>
            <Loader2 size={20} className="animate-spin" />
            Analizzo lo scontrino...
          </>
        ) : (
          <>
            <Camera size={20} />
            Scansiona scontrino
          </>
        )}
      </button>

      {scanError && (
        <div className="flex items-start gap-2 p-3 bg-red-50 text-red-700 text-sm rounded-xl">
          <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
          {scanError}
        </div>
      )}

      <Card className="p-5 space-y-4 overflow-hidden">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Importo</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium">€</span>
            <input
              ref={importoRef}
              type="number"
              inputMode="decimal"
              step="0.01"
              value={importo}
              onChange={e => setImporto(e.target.value)}
              placeholder="0,00"
              className="w-full pl-8 pr-3 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-bolly-500 focus:border-transparent outline-none text-lg font-semibold"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Categoria</label>
          <div className="grid grid-cols-4 gap-2">
            {CATEGORIE_SPESE.filter(cat => cat.id !== 'split').map(cat => {
              const Icon = SpesaIconMap[cat.icon] || Package
              return (
                <button
                  key={cat.id}
                  onClick={() => setCategoria(cat.id)}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all ${
                    categoria === cat.id ? 'border-bolly-500 bg-bolly-50' : 'border-gray-100 bg-white hover:border-gray-200'
                  }`}
                >
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: cat.color + '18' }}>
                    <Icon size={18} style={{ color: cat.color }} />
                  </div>
                  <span className="text-xs font-medium text-gray-700 text-center leading-tight">{cat.label}</span>
                </button>
              )
            })}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Descrizione <span className="text-gray-400 font-normal">(opzionale)</span></label>
          <input
            type="text"
            value={descrizione}
            onChange={e => setDescrizione(e.target.value)}
            placeholder="es. Spesa al supermercato"
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-bolly-500 focus:border-transparent outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Data</label>
          <input
            type="date"
            value={data}
            onChange={e => setData(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-bolly-500 focus:border-transparent outline-none"
            style={{ WebkitAppearance: 'none', MozAppearance: 'none', appearance: 'none' }}
          />
        </div>
      </Card>

      {/* Toggle Dividi con amici */}
      {importo && parseFloat(importo) > 0 && (
        <Card className="p-4">
          <button
            onClick={() => { setWantSplit(!wantSplit); if (wantSplit) setSplitSelected([]) }}
            className="w-full flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                <Split size={20} className="text-purple-600" />
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-gray-900">Dividi con amici</p>
                <p className="text-xs text-gray-500">Crea uno split in parti uguali</p>
              </div>
            </div>
            <div className={`w-12 h-7 rounded-full transition-colors flex items-center px-0.5 ${wantSplit ? 'bg-bolly-500' : 'bg-gray-200'}`}>
              <div className={`w-6 h-6 bg-white rounded-full shadow transition-transform ${wantSplit ? 'translate-x-5' : ''}`} />
            </div>
          </button>

          {wantSplit && (
            <div className="mt-4 space-y-2">
              {splitLoading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 size={20} className="animate-spin text-bolly-500" />
                </div>
              ) : (() => {
                const tuttiSplitAmici = [
                  ...splitAmici.map(a => ({ tipo: 'bolly', id: a.id, user_id: a.amico_id, contatto_esterno_id: null, nome: a.amico_nome })),
                  ...splitContattiEsterni.map(c => ({ tipo: 'esterno', id: c.id, user_id: null, contatto_esterno_id: c.id, nome: c.nome })),
                ]
                if (tuttiSplitAmici.length === 0) return (
                  <p className="text-xs text-gray-500 text-center py-2">Nessun amico. Aggiungine dal Menu → I miei amici.</p>
                )
                const numP = splitSelected.length + 1
                const quota = numP > 1 ? Math.round((parseFloat(importo) / numP) * 100) / 100 : 0
                return (
                  <>
                    {tuttiSplitAmici.map(a => {
                      const key = a.tipo + '_' + a.id
                      const isSel = splitSelected.find(s => s.tipo + '_' + s.id === key)
                      return (
                        <div
                          key={key}
                          onClick={() => toggleSplitSelect(a)}
                          className={`flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-all ${isSel ? 'bg-bolly-50 ring-2 ring-bolly-400' : 'hover:bg-gray-50'}`}
                        >
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center ${a.tipo === 'bolly' ? '' : 'bg-gray-200'}`}
                            style={a.tipo === 'bolly' ? { background: 'linear-gradient(145deg, #00897B, #00695C)' } : {}}>
                            <span className={`font-semibold ${a.tipo === 'bolly' ? 'text-white font-pacifico' : 'text-gray-500'}`}>
                              {a.nome?.[0]?.toUpperCase() || '?'}
                            </span>
                          </div>
                          <p className="flex-1 text-sm font-medium text-gray-900">{a.nome}</p>
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${isSel ? 'bg-bolly-500 border-bolly-500' : 'border-gray-300'}`}>
                            {isSel && <Check size={12} className="text-white" />}
                          </div>
                        </div>
                      )
                    })}
                    {splitSelected.length > 0 && (
                      <div className="mt-2 p-3 bg-purple-50 rounded-xl">
                        <p className="text-xs font-semibold text-purple-700">
                          Diviso in {numP}: {formatEuro(quota)} a testa
                        </p>
                      </div>
                    )}
                  </>
                )
              })()}
            </div>
          )}
        </Card>
      )}

      <button
        onClick={handleSave}
        disabled={!importo || !categoria || saving}
        className="w-full py-3.5 bg-bolly-500 text-white font-semibold rounded-xl disabled:opacity-40 active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
      >
        {saving ? <Loader2 size={20} className="animate-spin" /> : <Check size={20} />}
        {saving ? 'Salvataggio...' : wantSplit && splitSelected.length > 0 ? 'Salva e dividi' : 'Salva spesa'}
      </button>
    </div>
  )
}

// ============================================================
// FORM MODIFICA SPESA
// ============================================================

function FormModificaSpesa({ spesa, onSave, onBack }) {
  const isEntrata = spesa.tipo === 'entrata'
  const [importo, setImporto] = useState(String(spesa.importo))
  const [categoria, setCategoria] = useState(spesa.categoria)
  const [descrizione, setDescrizione] = useState(spesa.descrizione || '')
  const [data, setData] = useState(spesa.data)
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!importo || !categoria) return
    setSaving(true)
    try {
      await onSave(spesa.id, { importo: parseFloat(importo), categoria, descrizione: descrizione || null, data })
      onBack()
    } catch (e) { console.error('Errore modifica:', e) }
    setSaving(false)
  }

  const SpesaIconMap = { ShoppingCart, Car, Gamepad2, Heart, Home, Shirt, UtensilsCrossed, Split, MoreHorizontal }
  const EntrataIconMap = { Banknote, Home, RotateCcw, Gift, Landmark, MoreHorizontal }
  const categorie = isEntrata ? CATEGORIE_ENTRATE : CATEGORIE_SPESE
  const iconMap = isEntrata ? EntrataIconMap : SpesaIconMap
  const accentColor = isEntrata ? 'green' : 'bolly'

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-2 -ml-2 rounded-xl hover:bg-gray-100"><ChevronLeft size={20} /></button>
        <h1 className="text-xl font-bold text-gray-900">{isEntrata ? 'Modifica entrata' : 'Modifica spesa'}</h1>
      </div>

      <Card className="p-5 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Importo</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium">€</span>
            <input
              type="number"
              inputMode="decimal"
              step="0.01"
              value={importo}
              onChange={e => setImporto(e.target.value)}
              placeholder="0,00"
              className={`w-full pl-8 pr-3 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-${accentColor}-500 focus:border-transparent outline-none text-lg font-semibold`}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Categoria</label>
          <div className={`grid ${isEntrata ? 'grid-cols-3' : 'grid-cols-4'} gap-2`}>
            {categorie.map(cat => {
              const Icon = iconMap[cat.icon] || Package
              return (
                <button
                  key={cat.id}
                  onClick={() => setCategoria(cat.id)}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all ${
                    categoria === cat.id
                      ? isEntrata ? 'border-green-500 bg-green-50' : 'border-bolly-500 bg-bolly-50'
                      : 'border-gray-100 bg-white hover:border-gray-200'
                  }`}
                >
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: cat.color + '18' }}>
                    <Icon size={18} style={{ color: cat.color }} />
                  </div>
                  <span className="text-xs font-medium text-gray-700 text-center leading-tight">{cat.label}</span>
                </button>
              )
            })}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Descrizione <span className="text-gray-400 font-normal">(opzionale)</span></label>
          <input
            type="text"
            value={descrizione}
            onChange={e => setDescrizione(e.target.value)}
            placeholder={isEntrata ? 'es. Stipendio marzo' : 'es. Spesa al supermercato'}
            className={`w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-${accentColor}-500 focus:border-transparent outline-none`}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Data</label>
          <input
            type="date"
            value={data}
            onChange={e => setData(e.target.value)}
            className={`w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-${accentColor}-500 focus:border-transparent outline-none`}
          />
        </div>
      </Card>

      <button
        onClick={handleSave}
        disabled={!importo || !categoria || saving}
        className={`w-full py-3.5 ${isEntrata ? 'bg-green-500' : 'bg-bolly-500'} text-white font-semibold rounded-xl disabled:opacity-40 active:scale-[0.98] transition-transform flex items-center justify-center gap-2`}
      >
        {saving ? <Loader2 size={20} className="animate-spin" /> : <Check size={20} />}
        {saving ? 'Salvataggio...' : 'Salva modifiche'}
      </button>
    </div>
  )
}

// ============================================================
// FORM ENTRATA
// ============================================================

function FormEntrata({ onSave, onBack, dataPrecompilata }) {
  const now = new Date()
  const oggi = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`
  const [importo, setImporto] = useState('')
  const [categoria, setCategoria] = useState('')
  const [descrizione, setDescrizione] = useState('')
  const [data, setData] = useState(dataPrecompilata || oggi)
  const [saving, setSaving] = useState(false)
  const importoRef = useRef(null)

  useEffect(() => { importoRef.current?.focus() }, [])

  const handleSave = async () => {
    if (!importo || !categoria) return
    setSaving(true)
    try {
      await onSave({ importo: parseFloat(importo), categoria, descrizione: descrizione || null, data, tipo: 'entrata' })
      onBack()
    } catch (e) { console.error('Errore salvataggio entrata:', e) }
    setSaving(false)
  }

  const EntrataIconMap = { Banknote, Home, RotateCcw, Gift, Landmark, MoreHorizontal }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-2 -ml-2 rounded-xl hover:bg-gray-100"><ChevronLeft size={20} /></button>
        <h1 className="text-xl font-bold text-gray-900">Registra entrata</h1>
      </div>

      <Card className="p-5 space-y-4 overflow-hidden">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Importo</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium">€</span>
            <input
              ref={importoRef}
              type="number"
              inputMode="decimal"
              step="0.01"
              value={importo}
              onChange={e => setImporto(e.target.value)}
              placeholder="0,00"
              className="w-full pl-8 pr-3 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none text-lg font-semibold"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Categoria</label>
          <div className="grid grid-cols-3 gap-2">
            {CATEGORIE_ENTRATE.map(cat => {
              const Icon = EntrataIconMap[cat.icon] || Package
              return (
                <button
                  key={cat.id}
                  onClick={() => setCategoria(cat.id)}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all ${
                    categoria === cat.id ? 'border-green-500 bg-green-50' : 'border-gray-100 bg-white hover:border-gray-200'
                  }`}
                >
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: cat.color + '18' }}>
                    <Icon size={18} style={{ color: cat.color }} />
                  </div>
                  <span className="text-xs font-medium text-gray-700 text-center leading-tight">{cat.label}</span>
                </button>
              )
            })}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Descrizione <span className="text-gray-400 font-normal">(opzionale)</span></label>
          <input
            type="text"
            value={descrizione}
            onChange={e => setDescrizione(e.target.value)}
            placeholder="es. Stipendio marzo"
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Data</label>
          <input
            type="date"
            value={data}
            onChange={e => setData(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
            style={{ WebkitAppearance: 'none', MozAppearance: 'none', appearance: 'none' }}
          />
        </div>
      </Card>

      <button
        onClick={handleSave}
        disabled={!importo || !categoria || saving}
        className="w-full py-3.5 bg-green-500 text-white font-semibold rounded-xl disabled:opacity-40 active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
      >
        {saving ? <Loader2 size={20} className="animate-spin" /> : <Check size={20} />}
        {saving ? 'Salvataggio...' : 'Salva entrata'}
      </button>
    </div>
  )
}

// ============================================================
// LISTA SPESE (schermata "Vedi tutte")
// ============================================================

function ListaSpese({ spese, onBack, onDelete }) {
  const [deletingId, setDeletingId] = useState(null)

  const spesePerMese = useMemo(() => {
    const mappa = {}
    spese.forEach(s => {
      const d = new Date(s.data)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const label = d.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })
      if (!mappa[key]) mappa[key] = { label, items: [], totale: 0 }
      mappa[key].items.push(s)
      mappa[key].totale += Number(s.importo)
    })
    return Object.entries(mappa).sort((a, b) => b[0].localeCompare(a[0]))
  }, [spese])

  const SpesaIconMap = { ShoppingCart, Car, Gamepad2, Heart, Home, Shirt, UtensilsCrossed, Split, MoreHorizontal }
  const EntrataIconMap = { Banknote, Home, RotateCcw, Gift, Landmark, MoreHorizontal }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-2 -ml-2 rounded-xl hover:bg-gray-100"><ChevronLeft size={20} /></button>
        <h1 className="text-xl font-bold text-gray-900">Tutti i movimenti</h1>
      </div>

      {spesePerMese.length === 0 && (
        <Card className="p-8 text-center">
          <Wallet size={32} className="text-gray-300 mx-auto mb-2" />
          <p className="text-gray-400">Nessun movimento registrato</p>
        </Card>
      )}

      {spesePerMese.map(([key, { label, items, totale }]) => (
        <div key={key}>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">{label}</h2>
            <span className="text-sm font-bold text-gray-700">{formatEuro(totale)}</span>
          </div>
          <Card className="divide-y divide-gray-50">
            {items.map(s => {
              const isEntrata = s.tipo === 'entrata'
              const cat = isEntrata ? getCategoriaEntrata(s.categoria) : getCategoriaSpesa(s.categoria)
              const Icon = isEntrata ? (EntrataIconMap[cat.icon] || Package) : (SpesaIconMap[cat.icon] || Package)
              return (
                <div key={s.id} className="flex items-center gap-3 p-3.5">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: cat.color + '18' }}>
                    <Icon size={18} style={{ color: cat.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{s.descrizione || cat.label}</p>
                    <p className="text-xs text-gray-500">{formatData(s.data)}</p>
                  </div>
                  <p className={`text-sm font-semibold ${isEntrata ? 'text-green-600' : 'text-gray-900'}`}>{isEntrata ? '+' : ''}{formatEuro(s.importo)}</p>
                  <button onClick={() => setDeletingId(s.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-500 transition-colors">
                    <Trash2 size={16} />
                  </button>
                </div>
              )
            })}
          </Card>
        </div>
      ))}

      {deletingId && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setDeletingId(null)}>
          <div className="bg-white rounded-2xl p-5 max-w-sm w-full space-y-3" onClick={e => e.stopPropagation()}>
            <p className="font-semibold text-gray-900">Eliminare la spesa?</p>
            <p className="text-sm text-gray-600">Questa azione non si può annullare.</p>
            <div className="flex gap-2 pt-1">
              <button onClick={() => setDeletingId(null)} className="flex-1 py-2.5 rounded-xl border border-gray-300 text-sm font-medium text-gray-700">Annulla</button>
              <button onClick={() => { onDelete(deletingId); setDeletingId(null) }} className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-medium">Elimina</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const MESI = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre']
const GIORNI_SETT = ['L','M','M','G','V','S','D']

function Calendario({ bollette, contratti, spese, onSelectContratto, onAggiungiSpesa }) {
  const oggi = new Date()
  const [meseCorrente, setMeseCorrente] = useState(oggi.getMonth())
  const [annoCorrente, setAnnoCorrente] = useState(oggi.getFullYear())
  const [giornoSelezionato, setGiornoSelezionato] = useState(null)

  const mesePrecedente = () => {
    if (meseCorrente === 0) { setMeseCorrente(11); setAnnoCorrente(a => a - 1) }
    else setMeseCorrente(m => m - 1)
    setGiornoSelezionato(null)
  }
  const meseSuccessivo = () => {
    if (meseCorrente === 11) { setMeseCorrente(0); setAnnoCorrente(a => a + 1) }
    else setMeseCorrente(m => m + 1)
    setGiornoSelezionato(null)
  }

  const giorniNelMese = new Date(annoCorrente, meseCorrente + 1, 0).getDate()
  let primoGiorno = new Date(annoCorrente, meseCorrente, 1).getDay()
  primoGiorno = primoGiorno === 0 ? 6 : primoGiorno - 1

  const bollettePerGiorno = useMemo(() => {
    const mappa = {}
    bollette.forEach(b => {
      if (!b.scadenza || b.stato_elaborazione === 'errore_parsing' || b.stato_elaborazione === 'comunicazione') return
      const d = new Date(b.scadenza)
      if (d.getMonth() === meseCorrente && d.getFullYear() === annoCorrente) {
        const g = d.getDate()
        if (!mappa[g]) mappa[g] = []
        const contratto = contratti.find(c => c.id === b.contratto_id)
        mappa[g].push({ ...b, contratto })
      }
    })
    // Proiezioni da contratti ricorrenti
    contratti.forEach(c => {
      if (!c.ricorrente || !c.prossimo_addebito || !c.frequenza) return
      const freqMesi = { mensile: 1, bimestrale: 2, trimestrale: 3, semestrale: 6, annuale: 12 }[c.frequenza] || 0
      if (freqMesi === 0) return
      const dataFine = c.data_fine ? new Date(c.data_fine + 'T00:00:00') : null
      let cur = new Date(c.prossimo_addebito + 'T00:00:00')
      // Avanza fino al mese visualizzato
      while (cur < new Date(annoCorrente, meseCorrente, 1)) {
        cur.setMonth(cur.getMonth() + freqMesi)
      }
      // Genera date nel mese visualizzato
      while (cur.getMonth() === meseCorrente && cur.getFullYear() === annoCorrente) {
        if (dataFine && cur > dataFine) break
        const g = cur.getDate()
        const hasReal = mappa[g]?.some(b => b.contratto_id === c.id && !b.proiezione)
        if (!hasReal) {
          if (!mappa[g]) mappa[g] = []
          mappa[g].push({
            proiezione: true,
            contratto: c,
            contratto_id: c.id,
            importo: c.importo_ricorrente,
            scadenza: cur.toISOString().split('T')[0],
          })
        }
        cur.setMonth(cur.getMonth() + freqMesi)
      }
    })
    return mappa
  }, [bollette, contratti, meseCorrente, annoCorrente])

  // Mappa spese per giorno
  const spesePerGiorno = useMemo(() => {
    const mappa = {}
    ;(spese || []).forEach(s => {
      const d = new Date(s.data)
      if (d.getMonth() === meseCorrente && d.getFullYear() === annoCorrente) {
        const g = d.getDate()
        if (!mappa[g]) mappa[g] = []
        mappa[g].push(s)
      }
    })
    return mappa
  }, [spese, meseCorrente, annoCorrente])

  const isOggi = (g) => g === oggi.getDate() && meseCorrente === oggi.getMonth() && annoCorrente === oggi.getFullYear()
  const isDomiciliata = (b) => b.contratto?.metodo_pagamento === 'rid' || b.contratto?.domiciliazione

  const celle = []
  const giorniMesePrecedente = new Date(annoCorrente, meseCorrente, 0).getDate()
  for (let i = primoGiorno - 1; i >= 0; i--) celle.push({ giorno: giorniMesePrecedente - i, corrente: false })
  for (let g = 1; g <= giorniNelMese; g++) celle.push({ giorno: g, corrente: true })
  const restanti = 7 - (celle.length % 7)
  if (restanti < 7) for (let i = 1; i <= restanti; i++) celle.push({ giorno: i, corrente: false })

  const bolletteGiornoSelezionato = giornoSelezionato ? (bollettePerGiorno[giornoSelezionato] || []) : []
  const speseGiornoSelezionato = giornoSelezionato ? (spesePerGiorno[giornoSelezionato] || []) : []

  // Statistiche del mese corrente
  const statsMese = useMemo(() => {
    const bolMese = bollette.filter(b => {
      if (!b.scadenza || b.stato_elaborazione === 'errore_parsing' || b.stato_elaborazione === 'comunicazione') return false
      const d = new Date(b.scadenza)
      return d.getMonth() === meseCorrente && d.getFullYear() === annoCorrente
    })
    const totaleMese = bolMese.reduce((s, b) => s + Number(b.importo || 0), 0)

    // Mese precedente per confronto
    const mesePrev = meseCorrente === 0 ? 11 : meseCorrente - 1
    const annoPrev = meseCorrente === 0 ? annoCorrente - 1 : annoCorrente
    const bolMesePrev = bollette.filter(b => {
      if (!b.scadenza || b.stato_elaborazione === 'errore_parsing' || b.stato_elaborazione === 'comunicazione') return false
      const d = new Date(b.scadenza)
      return d.getMonth() === mesePrev && d.getFullYear() === annoPrev
    })
    const totalePrecedente = bolMesePrev.reduce((s, b) => s + Number(b.importo || 0), 0)

    const variazione = totalePrecedente > 0 ? ((totaleMese - totalePrecedente) / totalePrecedente) * 100 : null

    // Ripartizione per categoria
    const perCategoria = {}
    bolMese.forEach(b => {
      const c = contratti.find(ct => ct.id === b.contratto_id)
      const catId = c?.categoria || 'altro'
      if (!perCategoria[catId]) perCategoria[catId] = 0
      perCategoria[catId] += Number(b.importo || 0)
    })
    const categorieSorted = Object.entries(perCategoria)
      .map(([catId, tot]) => ({ catId, tot, cat: getCategoria(catId) }))
      .sort((a, b) => b.tot - a.tot)

    // Spese giornaliere del mese (solo tipo 'spesa' o senza tipo per retrocompatibilità)
    const speseMese = (spese || []).filter(s => {
      if (s.tipo === 'entrata') return false
      const d = new Date(s.data)
      return d.getMonth() === meseCorrente && d.getFullYear() === annoCorrente
    })
    const totaleSpeseGiornaliere = speseMese.reduce((s, sp) => s + Number(sp.importo || 0), 0)

    // Entrate del mese
    const entrateMese = (spese || []).filter(s => {
      if (s.tipo !== 'entrata') return false
      const d = new Date(s.data)
      return d.getMonth() === meseCorrente && d.getFullYear() === annoCorrente
    })
    const totaleEntrate = entrateMese.reduce((s, e) => s + Number(e.importo || 0), 0)

    // Spese giornaliere mese precedente
    const speseMesePrev = (spese || []).filter(s => {
      if (s.tipo === 'entrata') return false
      const d = new Date(s.data)
      return d.getMonth() === mesePrev && d.getFullYear() === annoPrev
    })
    const totaleSpeseGiornalierePrev = speseMesePrev.reduce((s, sp) => s + Number(sp.importo || 0), 0)

    // Entrate mese precedente
    const entrateMesePrev = (spese || []).filter(s => {
      if (s.tipo !== 'entrata') return false
      const d = new Date(s.data)
      return d.getMonth() === mesePrev && d.getFullYear() === annoPrev
    })
    const totaleEntratePrev = entrateMesePrev.reduce((s, e) => s + Number(e.importo || 0), 0)

    // Ripartizione spese giornaliere per categoria
    const perCategoriaSpese = {}
    speseMese.forEach(s => {
      const catId = s.categoria || 'altro_spesa'
      if (!perCategoriaSpese[catId]) perCategoriaSpese[catId] = 0
      perCategoriaSpese[catId] += Number(s.importo || 0)
    })
    const categorieSpeseSort = Object.entries(perCategoriaSpese)
      .map(([catId, tot]) => ({ catId, tot, cat: getCategoriaSpesa(catId) }))
      .sort((a, b) => b.tot - a.tot)

    // Ripartizione entrate per categoria
    const perCategoriaEntrate = {}
    entrateMese.forEach(s => {
      const catId = s.categoria || 'altro_entrata'
      if (!perCategoriaEntrate[catId]) perCategoriaEntrate[catId] = 0
      perCategoriaEntrate[catId] += Number(s.importo || 0)
    })
    const categorieEntrateSort = Object.entries(perCategoriaEntrate)
      .map(([catId, tot]) => ({ catId, tot, cat: getCategoriaEntrata(catId) }))
      .sort((a, b) => b.tot - a.tot)

    const totaleUscite = totaleMese + totaleSpeseGiornaliere
    const totaleComplessivo = totaleUscite
    const totaleComplessivoPrev = totalePrecedente + totaleSpeseGiornalierePrev
    const variazioneComplessiva = totaleComplessivoPrev > 0 ? ((totaleComplessivo - totaleComplessivoPrev) / totaleComplessivoPrev) * 100 : null
    const bilancio = totaleEntrate - totaleUscite

    return { totaleMese, totalePrecedente, variazione, categorieSorted, numBollette: bolMese.length, totaleSpeseGiornaliere, categorieSpeseSort, numSpese: speseMese.length, totaleComplessivo, variazioneComplessiva, totaleEntrate, totaleEntratePrev, categorieEntrateSort, numEntrate: entrateMese.length, totaleUscite, bilancio }
  }, [bollette, contratti, spese, meseCorrente, annoCorrente])

  return (
    <div className="space-y-4 pb-4">
      <div className="flex items-center justify-between">
        <button onClick={mesePrecedente} className="p-2 rounded-xl hover:bg-gray-100"><ChevronLeft size={20} className="text-gray-500" /></button>
        <h1 className="text-lg font-bold text-gray-900">{MESI[meseCorrente]} {annoCorrente}</h1>
        <button onClick={meseSuccessivo} className="p-2 rounded-xl hover:bg-gray-100"><ChevronRight size={20} className="text-gray-500" /></button>
      </div>

      <Card className="p-3">
        <div className="grid grid-cols-7 mb-2">
          {GIORNI_SETT.map((g, i) => (
            <div key={i} className="text-center text-xs font-medium text-gray-400 py-1">{g}</div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {celle.map((c, i) => {
            const dots = c.corrente ? bollettePerGiorno[c.giorno] : null
            const hasDomiciliata = dots?.some(b => !b.proiezione && isDomiciliata(b))
            const hasManuale = dots?.some(b => !b.proiezione && !isDomiciliata(b))
            const hasProiezione = dots?.some(b => b.proiezione)
            const hasSpese = c.corrente && spesePerGiorno[c.giorno]?.length > 0
            const selezionato = c.corrente && giornoSelezionato === c.giorno
            return (
              <button key={i}
                onClick={() => c.corrente && setGiornoSelezionato(c.giorno === giornoSelezionato ? null : c.giorno)}
                className={`flex flex-col items-center py-1.5 rounded-lg transition-colors ${selezionato ? 'bg-bolly-50' : ''} ${c.corrente ? 'cursor-pointer hover:bg-gray-50' : 'cursor-default'}`}
              >
                <span className={`text-sm w-7 h-7 flex items-center justify-center rounded-full ${
                  !c.corrente ? 'text-gray-300' :
                  isOggi(c.giorno) ? 'bg-bolly-500 text-white font-medium' :
                  'text-gray-700'
                }`}>{c.giorno}</span>
                <div className="flex gap-0.5 mt-1 h-1.5">
                  {hasDomiciliata && <span className="w-1.5 h-1.5 rounded-full bg-bolly-500" />}
                  {hasManuale && <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />}
                  {hasProiezione && <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />}
                  {hasSpese && <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />}
                </div>
              </button>
            )
          })}
        </div>
      </Card>

      <div className="flex flex-wrap gap-3 px-1">
        <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-bolly-500" /><span className="text-xs text-gray-500">Domiciliata (RID)</span></div>
        <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-400" /><span className="text-xs text-gray-500">Da pagare</span></div>
        <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-purple-400" /><span className="text-xs text-gray-500">Previsto</span></div>
        <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-400" /><span className="text-xs text-gray-500">Spesa</span></div>
      </div>

      {/* Scadenze + spese giorno selezionato */}
      {giornoSelezionato && (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-gray-500">{giornoSelezionato} {MESI[meseCorrente].toLowerCase()} {annoCorrente}</p>
            <button
              onClick={() => {
                const dataStr = `${annoCorrente}-${String(meseCorrente + 1).padStart(2, '0')}-${String(giornoSelezionato).padStart(2, '0')}`
                onAggiungiSpesa(dataStr)
              }}
              className="flex items-center gap-1 text-xs font-medium text-bolly-500 px-2 py-1 rounded-lg hover:bg-bolly-50"
            >
              <Plus size={14} /> Spesa
            </button>
          </div>
          {bolletteGiornoSelezionato.length === 0 && speseGiornoSelezionato.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">Nessuna scadenza o spesa in questo giorno</p>
          ) : (
            <div className="space-y-3">
              {bolletteGiornoSelezionato.map((b, idx) => {
                const domiciliata = isDomiciliata(b)
                const isProiezione = b.proiezione
                const IconComp = b.contratto ? (IconMap[getCategoria(b.contratto.categoria)?.icon] || Package) : Package
                return (
                  <div key={b.id || `proj-${b.contratto_id}-${idx}`}
                    className="flex items-center gap-3 cursor-pointer"
                    onClick={() => { if (b.contratto_id && onSelectContratto) onSelectContratto(b.contratto_id) }}
                  >
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${isProiezione ? 'bg-purple-50 text-purple-600' : domiciliata ? 'bg-bolly-50 text-bolly-600' : 'bg-amber-50 text-amber-600'}`}>
                      <IconComp size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{b.contratto?.fornitore || b.descrizione_libera || 'Bolletta'}</p>
                      <p className="text-xs text-gray-500">{b.contratto ? getCategoria(b.contratto.categoria)?.label : ''}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-gray-900">{b.importo ? formatEuro(b.importo) : '—'}</p>
                      <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${isProiezione ? 'bg-purple-50 text-purple-700' : domiciliata ? 'bg-bolly-50 text-bolly-700' : 'bg-amber-50 text-amber-700'}`}>
                        {isProiezione ? 'Previsto' : b.contratto?.metodo_pagamento === 'rid' ? 'RID' : b.contratto?.metodo_pagamento === 'bollettino' ? 'Bollettino' : 'Manuale'}
                      </span>
                    </div>
                  </div>
                )
              })}
              {speseGiornoSelezionato.length > 0 && bolletteGiornoSelezionato.length > 0 && (
                <div className="border-t border-gray-100 pt-2 mt-2">
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Spese</p>
                </div>
              )}
              {speseGiornoSelezionato.map(s => {
                const cat = getCategoriaSpesa(s.categoria)
                const SpesaIconMap = { ShoppingCart, Car, Gamepad2, Heart, Home, Shirt, UtensilsCrossed, Split, MoreHorizontal }
                const Icon = SpesaIconMap[cat.icon] || Package
                return (
                  <div key={s.id} className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-blue-50">
                      <Icon size={18} className="text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{s.descrizione || cat.label}</p>
                      <p className="text-xs text-gray-500">{cat.label}</p>
                    </div>
                    <p className="text-sm font-semibold text-gray-900">{formatEuro(s.importo)}</p>
                  </div>
                )
              })}
            </div>
          )}
        </Card>
      )}

      {/* Riepilogo mensile */}
      <Card className="p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Riepilogo {MESI[meseCorrente].toLowerCase()}</h3>
        <div className="flex items-end justify-between mb-3">
          <div>
            <p className="text-2xl font-bold text-gray-900">{formatEuro(statsMese.totaleComplessivo)}</p>
            <p className="text-xs text-gray-500 mt-0.5">{statsMese.numBollette} {statsMese.numBollette === 1 ? 'bolletta' : 'bollette'}{statsMese.numSpese > 0 ? ` · ${statsMese.numSpese} ${statsMese.numSpese === 1 ? 'spesa' : 'spese'}` : ''}{statsMese.numEntrate > 0 ? ` · ${statsMese.numEntrate} ${statsMese.numEntrate === 1 ? 'entrata' : 'entrate'}` : ''}</p>
          </div>
          {statsMese.variazioneComplessiva !== null && (
            <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium ${statsMese.variazioneComplessiva > 0 ? 'bg-red-50 text-red-600' : statsMese.variazioneComplessiva < 0 ? 'bg-green-50 text-green-600' : 'bg-gray-50 text-gray-500'}`}>
              <TrendingUp size={12} className={statsMese.variazioneComplessiva < 0 ? 'rotate-180' : ''} />
              {statsMese.variazioneComplessiva > 0 ? '+' : ''}{statsMese.variazioneComplessiva.toFixed(0)}% vs mese prec.
            </div>
          )}
        </div>

        {/* Bilancio entrate/uscite — solo se ci sono entrate */}
        {statsMese.totaleEntrate > 0 && (
          <div className={`rounded-xl p-3 mb-3 ${statsMese.bilancio >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-green-600">Entrate</span>
              <span className="text-sm font-bold text-green-700">+{formatEuro(statsMese.totaleEntrate)}</span>
            </div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-red-600">Uscite</span>
              <span className="text-sm font-bold text-red-700">-{formatEuro(statsMese.totaleUscite)}</span>
            </div>
            <div className="border-t border-gray-200 pt-2 flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-700">Bilancio</span>
              <span className={`text-sm font-bold ${statsMese.bilancio >= 0 ? 'text-green-700' : 'text-red-700'}`}>{statsMese.bilancio >= 0 ? '+' : ''}{formatEuro(statsMese.bilancio)}</span>
            </div>
          </div>
        )}

        {/* Due sotto-totali: Utenze vs Spese quotidiane */}
        {(statsMese.totaleMese > 0 || statsMese.totaleSpeseGiornaliere > 0) && (
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div className="bg-bolly-50 rounded-xl p-3">
              <p className="text-xs text-bolly-600 font-medium">Utenze</p>
              <p className="text-lg font-bold text-bolly-700">{formatEuro(statsMese.totaleMese)}</p>
            </div>
            <div className="bg-purple-50 rounded-xl p-3">
              <p className="text-xs text-purple-600 font-medium">Spese quotidiane</p>
              <p className="text-lg font-bold text-purple-700">{formatEuro(statsMese.totaleSpeseGiornaliere)}</p>
            </div>
          </div>
        )}

        {statsMese.categorieSorted.length > 0 && (
          <div className="space-y-2 pt-3 border-t border-gray-100">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Utenze per categoria</p>
            {statsMese.categorieSorted.map(({ catId, tot, cat }) => {
              const perc = statsMese.totaleMese > 0 ? (tot / statsMese.totaleMese) * 100 : 0
              const IconComp = IconMap[cat.icon] || Package
              return (
                <div key={catId} className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: cat.color + '18' }}>
                    <IconComp size={14} style={{ color: cat.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-xs font-medium text-gray-700 truncate">{cat.label}</span>
                      <span className="text-xs font-semibold text-gray-900">{formatEuro(tot)}</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5">
                      <div className="h-1.5 rounded-full" style={{ width: `${perc}%`, backgroundColor: cat.color }} />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
        {statsMese.categorieSpeseSort.length > 0 && (
          <div className="space-y-2 pt-3 mt-1 border-t border-gray-100">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Spese quotidiane per categoria</p>
            {statsMese.categorieSpeseSort.map(({ catId, tot, cat }) => {
              const perc = statsMese.totaleSpeseGiornaliere > 0 ? (tot / statsMese.totaleSpeseGiornaliere) * 100 : 0
              const IconComp = IconMap[cat.icon] || Package
              return (
                <div key={catId} className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: cat.color + '18' }}>
                    <IconComp size={14} style={{ color: cat.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-xs font-medium text-gray-700 truncate">{cat.label}</span>
                      <span className="text-xs font-semibold text-gray-900">{formatEuro(tot)}</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5">
                      <div className="h-1.5 rounded-full" style={{ width: `${perc}%`, backgroundColor: cat.color }} />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
        {statsMese.categorieEntrateSort.length > 0 && (
          <div className="space-y-2 pt-3 mt-1 border-t border-gray-100">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Entrate per categoria</p>
            {statsMese.categorieEntrateSort.map(({ catId, tot, cat }) => {
              const perc = statsMese.totaleEntrate > 0 ? (tot / statsMese.totaleEntrate) * 100 : 0
              const EntrataIconMap = { Banknote, Home, RotateCcw, Gift, Landmark, MoreHorizontal }
              const IconComp = EntrataIconMap[cat.icon] || Package
              return (
                <div key={catId} className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: cat.color + '18' }}>
                    <IconComp size={14} style={{ color: cat.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-xs font-medium text-gray-700 truncate">{cat.label}</span>
                      <span className="text-xs font-semibold text-green-700">+{formatEuro(tot)}</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5">
                      <div className="h-1.5 rounded-full" style={{ width: `${perc}%`, backgroundColor: cat.color }} />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
        {statsMese.numBollette === 0 && statsMese.numSpese === 0 && statsMese.numEntrate === 0 && (
          <p className="text-xs text-gray-400 text-center py-2">Nessun movimento in questo mese</p>
        )}
      </Card>

      {/* Riepilogo annuale */}
      <Card className="p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Riepilogo {annoCorrente}</h3>
        {(() => {
          const bolAnno = bollette.filter(b => {
            if (!b.scadenza || b.stato_elaborazione === 'errore_parsing' || b.stato_elaborazione === 'comunicazione') return false
            return new Date(b.scadenza).getFullYear() === annoCorrente
          })
          const totaleAnno = bolAnno.reduce((s, b) => s + Number(b.importo || 0), 0)
          const numBolletteAnno = bolAnno.length

          const bolAnnoPrev = bollette.filter(b => {
            if (!b.scadenza || b.stato_elaborazione === 'errore_parsing' || b.stato_elaborazione === 'comunicazione') return false
            return new Date(b.scadenza).getFullYear() === annoCorrente - 1
          })
          const totaleAnnoPrev = bolAnnoPrev.reduce((s, b) => s + Number(b.importo || 0), 0)
          const varAnno = totaleAnnoPrev > 0 ? ((totaleAnno - totaleAnnoPrev) / totaleAnnoPrev) * 100 : null

          const mediaMensile = numBolletteAnno > 0 ? totaleAnno / (meseCorrente + 1) : 0

          const perCatAnno = {}
          bolAnno.forEach(b => {
            const c = contratti.find(ct => ct.id === b.contratto_id)
            const catId = c?.categoria || 'altro'
            if (!perCatAnno[catId]) perCatAnno[catId] = 0
            perCatAnno[catId] += Number(b.importo || 0)
          })
          const catAnnoSorted = Object.entries(perCatAnno)
            .map(([catId, tot]) => ({ catId, tot, cat: getCategoria(catId) }))
            .sort((a, b) => b.tot - a.tot)

          return (
            <>
              <div className="flex items-end justify-between mb-3">
                <div>
                  <p className="text-2xl font-bold text-gray-900">{formatEuro(totaleAnno)}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{numBolletteAnno} {numBolletteAnno === 1 ? 'bolletta' : 'bollette'} · media {formatEuro(mediaMensile)}/mese</p>
                </div>
                {varAnno !== null && (
                  <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium ${varAnno > 0 ? 'bg-red-50 text-red-600' : varAnno < 0 ? 'bg-green-50 text-green-600' : 'bg-gray-50 text-gray-500'}`}>
                    <TrendingUp size={12} className={varAnno < 0 ? 'rotate-180' : ''} />
                    {varAnno > 0 ? '+' : ''}{varAnno.toFixed(0)}% vs {annoCorrente - 1}
                  </div>
                )}
              </div>
              {catAnnoSorted.length > 0 && (
                <div className="space-y-2 pt-3 border-t border-gray-100">
                  {catAnnoSorted.map(({ catId, tot, cat }) => {
                    const perc = totaleAnno > 0 ? (tot / totaleAnno) * 100 : 0
                    const IconComp = IconMap[cat.icon] || Package
                    return (
                      <div key={catId} className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: cat.color + '18' }}>
                          <IconComp size={14} style={{ color: cat.color }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="text-xs font-medium text-gray-700 truncate">{cat.label}</span>
                            <span className="text-xs font-semibold text-gray-900">{formatEuro(tot)}</span>
                          </div>
                          <div className="w-full bg-gray-100 rounded-full h-1.5">
                            <div className="h-1.5 rounded-full" style={{ width: `${perc}%`, backgroundColor: cat.color }} />
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
              {numBolletteAnno === 0 && (
                <p className="text-xs text-gray-400 text-center py-2">Nessuna bolletta in questo anno</p>
              )}
            </>
          )
        })()}
      </Card>
    </div>
  )
}

// ============================================================
// STORICO BOLLETTE
// ============================================================

function StoricoBollette({ bollette, contratti, onSelectContratto }) {
  const [tab, setTab] = useState('bollette')
  const [expandedComm, setExpandedComm] = useState(null)

  const bolletteFull = useMemo(() => {
    return bollette
      .filter(b => b.stato_elaborazione !== 'errore_parsing' && b.stato_elaborazione !== 'comunicazione' && b.fonte !== 'manuale')
      .map(b => ({
        ...b,
        contratto: contratti.find(c => c.id === b.contratto_id) || null
      }))
      .sort((a, b) => {
        const da = a.created_at || a.scadenza || '1970-01-01'
        const db = b.created_at || b.scadenza || '1970-01-01'
        return new Date(db) - new Date(da)
      })
  }, [bollette, contratti])

  const comunicazioni = useMemo(() => {
    return bollette
      .filter(b => b.stato_elaborazione === 'comunicazione')
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
  }, [bollette])

  const formatDataRicezione = (b) => {
    const d = b.created_at ? new Date(b.created_at) : null
    if (!d || isNaN(d)) return null
    return d.toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  // Pulisce il testo delle email: HTML grezzo, link duplicati, entità, caratteri invisibili, righe vuote
  const cleanEmailText = (text) => {
    if (!text) return text
    let clean = text
    // 1. Se il testo contiene tag HTML, estrae solo il contenuto testuale
    if (/<[a-z][\s\S]*>/i.test(clean)) {
      // Preserva i link: converte <a href="url">testo</a> in "testo (url)"
      clean = clean.replace(/<a\s+[^>]*href=["']([^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi, (m, url, label) => {
        const cleanLabel = label.replace(/<[^>]+>/g, '').trim()
        return cleanLabel && cleanLabel !== url ? cleanLabel + ' ' + url : url
      })
      // Aggiunge newline dopo tag blocco (p, div, br, tr, li, h1-h6)
      clean = clean.replace(/<\/(p|div|tr|li|h[1-6])>/gi, '\n')
      clean = clean.replace(/<br\s*\/?>/gi, '\n')
      // Rimuove tutti i tag HTML rimanenti
      clean = clean.replace(/<[^>]+>/g, '')
    }
    // 2. Rimuove link duplicati tipo "www.example.it<http://www.example.it/>"
    clean = clean.replace(/((?:https?:\/\/|www\.)[^\s<>"{}|\\^`[\]()]+)<(https?:\/\/[^>]+)>/g, (match, visibleUrl) => visibleUrl)
    // 3. Rimuove entità HTML invisibili (&zwnj; &nbsp; &shy; &#8204; &#160; ecc.)
    clean = clean.replace(/&(zwnj|nbsp|shy|#8204|#8203|#160|#173|ZeroWidthSpace);?/gi, '')
    // 4. Decodifica entità HTML comuni rimaste (&amp; &lt; &gt; &quot; &apos;)
    clean = clean.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'")
    // 5. Rimuove righe che contengono solo spazi/tab (risultato della pulizia)
    clean = clean.replace(/^[ \t]+$/gm, '')
    // 6. Collassa 3+ righe vuote consecutive in massimo 2
    clean = clean.replace(/\n{3,}/g, '\n\n')
    // 7. Rimuove spazi bianchi a inizio e fine
    clean = clean.trim()
    return clean
  }

  // Estrae i link dal testo dell'email (supporta markdown [testo](url), URL raw, e www.)
  const extractLinks = (text) => {
    if (!text) return []
    const links = []
    // Link markdown: [testo](url)
    const mdRegex = /\[([^\]]*)\]\((https?:\/\/[^)]+)\)/g
    let m
    while ((m = mdRegex.exec(text)) !== null) links.push(m[2])
    // URL raw: http:// o https://
    const rawRegex = /(?<!\()(https?:\/\/[^\s<>"{}|\\^`[\]()]+)/g
    while ((m = rawRegex.exec(text)) !== null) {
      if (!links.includes(m[1])) links.push(m[1])
    }
    // www. senza protocollo
    const wwwRegex = /(?<!\/)(?<!\w)(www\.[^\s<>"{}|\\^`[\]()]+)/g
    while ((m = wwwRegex.exec(text)) !== null) {
      const url = 'http://' + m[1]
      if (!links.includes(url)) links.push(url)
    }
    return links
  }

  // Renderizza testo con link cliccabili inline
  const renderTextWithLinks = (text) => {
    if (!text) return 'Nessun contenuto disponibile'
    // Sostituisce [testo](url) e URL raw con elementi cliccabili
    const parts = []
    let lastIndex = 0
    const combinedRegex = /\[([^\]]*)\]\((https?:\/\/[^)]+)\)|(https?:\/\/[^\s<>"{}|\\^`[\]()]+)|((?<!\/)(?<!\w)www\.[^\s<>"{}|\\^`[\]()]+)/g
    let match
    while ((match = combinedRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index))
      }
      const url = match[2] || match[3] || ('http://' + match[4])
      const label = match[1] || match[3] || match[4]
      parts.push(
        <a key={match.index} href={url} target="_blank" rel="noopener noreferrer"
           onClick={(e) => e.stopPropagation()}
           className="text-bolly-600 underline break-all">{label}</a>
      )
      lastIndex = match.index + match[0].length
    }
    if (lastIndex < text.length) parts.push(text.substring(lastIndex))
    return parts
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-gray-900">Inbox</h1>

      {/* Tab bollette / comunicazioni */}
      <div className="flex gap-2">
        <button
          onClick={() => setTab('bollette')}
          className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all ${
            tab === 'bollette' ? 'bg-bolly-500 text-white' : 'bg-gray-100 text-gray-500'
          }`}
        >
          Bollette ({bolletteFull.length})
        </button>
        <button
          onClick={() => setTab('comunicazioni')}
          className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all relative ${
            tab === 'comunicazioni' ? 'bg-bolly-500 text-white' : 'bg-gray-100 text-gray-500'
          }`}
        >
          Comunicazioni ({comunicazioni.length})
        </button>
      </div>

      {tab === 'bollette' && (
        <>
          {bolletteFull.length === 0 ? (
            <Card className="p-6">
              <div className="text-center">
                <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <Inbox size={24} className="text-gray-400" />
                </div>
                <p className="text-sm text-gray-500">Nessuna bolletta ricevuta</p>
              </div>
            </Card>
          ) : (
            <div className="space-y-2">
              {bolletteFull.map(b => {
                const cat = b.contratto ? getCategoria(b.contratto.categoria) : null
                const IconComp = cat ? (IconMap[cat.icon] || Package) : Package
                const iconColor = cat?.color || '#6B7280'
                return (
                  <Card key={b.id} className="p-3" onClick={() => { if (b.contratto_id && onSelectContratto) onSelectContratto(b.contratto_id) }}>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: iconColor + '18' }}>
                        <IconComp size={20} style={{ color: iconColor }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{b.contratto?.fornitore || b.descrizione_libera || 'Bolletta'}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {b.scadenza && <p className="text-xs text-gray-500">Scade il {formatData(b.scadenza)}</p>}
                          <FonteBadge fonte={b.fonte} />
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold text-gray-900">{b.importo ? formatEuro(b.importo) : '—'}</p>
                        {b.consumo && b.unita_misura && (
                          <p className="text-xs font-medium text-blue-600 mt-0.5">{Number(b.consumo).toLocaleString('it-IT')} {b.unita_misura}</p>
                        )}
                        {formatDataRicezione(b) && <p className="text-xs text-gray-400 mt-0.5">{formatDataRicezione(b)}</p>}
                      </div>
                    </div>
                  </Card>
                )
              })}
            </div>
          )}
        </>
      )}

      {tab === 'comunicazioni' && (
        <>
          {comunicazioni.length === 0 ? (
            <Card className="p-6">
              <div className="text-center">
                <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <Mail size={24} className="text-gray-400" />
                </div>
                <p className="text-sm text-gray-500">Nessuna comunicazione ricevuta</p>
              </div>
            </Card>
          ) : (
            <div className="space-y-2">
              {comunicazioni.map(c => {
                const isExpanded = expandedComm === c.id
                const cleanedText = cleanEmailText(c.email_riassunto)
                const links = extractLinks(cleanedText)
                return (
                  <Card key={c.id} className="p-4" onClick={() => setExpandedComm(isExpanded ? null : c.id)}>
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-blue-50 shrink-0">
                        <Mail size={20} className="text-blue-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900">{c.email_oggetto || 'Comunicazione'}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{formatDataRicezione(c)}</p>
                        {isExpanded && (
                          <div className="mt-3 space-y-3">
                            <p className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed">{renderTextWithLinks(cleanedText)}</p>
                            {links.length > 0 && (
                              <div className="space-y-2">
                                <p className="text-xs font-semibold text-gray-500 uppercase">Link presenti</p>
                                {links.map((link, i) => (
                                  <a
                                    key={i}
                                    href={link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    className="flex items-center gap-2 text-sm text-bolly-600 bg-bolly-50 px-3 py-2 rounded-lg border border-bolly-100 hover:bg-bolly-100 transition-colors break-all"
                                  >
                                    <ExternalLink size={14} className="shrink-0" />
                                    <span>{link.length > 50 ? link.substring(0, 50) + '...' : link}</span>
                                  </a>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                        {!isExpanded && (
                          <p className="text-xs text-gray-400 mt-1 truncate">{cleanEmailText(c.email_riassunto)?.substring(0, 80) || ''}</p>
                        )}
                      </div>
                      <ChevronRight size={16} className={`text-gray-300 shrink-0 mt-1 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                    </div>
                  </Card>
                )
              })}
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ============================================================
// APP
// ============================================================

// ============================================================
// SPLIT SPESE
// ============================================================

function FormSplit({ target, profile, onBack, onSave }) {
  // target = { tipo: 'spesa'|'bolletta', id, importo, descrizione }
  const [amici, setAmici] = useState([])
  const [contattiEsterni, setContattiEsterni] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState([]) // [{ tipo: 'bolly'|'esterno', id, user_id, contatto_esterno_id, nome }]
  const [divisione, setDivisione] = useState('uguale')
  const [importiCustom, setImportiCustom] = useState({}) // { participantKey: importo }
  const [saving, setSaving] = useState(false)
  const [nota, setNota] = useState('')
  const [errore, setErrore] = useState('')

  useEffect(() => {
    Promise.all([getAmici().catch(() => []), getContattiEsterni().catch(() => [])])
      .then(([a, ce]) => { setAmici(a); setContattiEsterni(ce); setLoading(false) })
  }, [])

  const toggleSelect = (p) => {
    const key = p.tipo + '_' + p.id
    if (selected.find(s => s.tipo + '_' + s.id === key)) {
      setSelected(selected.filter(s => s.tipo + '_' + s.id !== key))
      const newImporti = { ...importiCustom }
      delete newImporti[key]
      setImportiCustom(newImporti)
    } else {
      setSelected([...selected, p])
    }
  }

  // Calcolo importi: +1 perché include il creatore
  const numPartecipanti = selected.length + 1
  const importoPerPersona = numPartecipanti > 1 ? Math.round((target.importo / numPartecipanti) * 100) / 100 : 0
  const tuaParte = divisione === 'uguale'
    ? importoPerPersona
    : target.importo - Object.values(importiCustom).reduce((acc, v) => acc + (parseFloat(v) || 0), 0)

  const handleSave = async () => {
    if (selected.length === 0) return
    setSaving(true)
    setErrore('')
    try {
      const partecipanti = selected.map(s => {
        const key = s.tipo + '_' + s.id
        return {
          user_id: s.user_id || null,
          contatto_esterno_id: s.contatto_esterno_id || null,
          nome: s.nome,
          importo: divisione === 'uguale' ? importoPerPersona : (parseFloat(importiCustom[key]) || 0),
        }
      })
      console.log('Split payload:', { tipo: target.tipo, riferimento_id: target.id, importo_totale: target.importo, divisione, partecipanti })
      await createSplit({
        tipo: target.tipo,
        riferimento_id: target.id,
        importo_totale: target.importo,
        divisione,
        nota: nota.trim() || null,
      }, partecipanti)
      if (window.posthog) window.posthog.capture('split_creato', { tipo: target.tipo, divisione, partecipanti: partecipanti.length, fonte: 'form_split' })
      // Push notifications gestite automaticamente dal database trigger
      await onSave()
    } catch (e) {
      console.error('Errore creazione split:', e)
      setErrore(e?.message || 'Errore durante la creazione dello split. Riprova.')
    }
    setSaving(false)
  }

  if (loading) return <Loading />

  const tuttiAmici = [
    ...amici.map(a => ({ tipo: 'bolly', id: a.id, user_id: a.amico_id, contatto_esterno_id: null, nome: a.amico_nome })),
    ...contattiEsterni.map(c => ({ tipo: 'esterno', id: c.id, user_id: null, contatto_esterno_id: c.id, nome: c.nome })),
  ]

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-2 rounded-xl hover:bg-gray-100">
          <ChevronLeft size={22} className="text-gray-500" />
        </button>
        <h1 className="text-xl font-bold text-gray-900">Dividi spesa</h1>
      </div>

      {/* Riepilogo importo */}
      <Card className="p-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
            <Split size={24} className="text-purple-600" />
          </div>
          <div>
            <p className="font-semibold text-gray-900 text-lg">{formatEuro(target.importo)}</p>
            <p className="text-sm text-gray-500">{target.descrizione}</p>
          </div>
        </div>
      </Card>

      {/* Seleziona amici */}
      <div>
        <p className="text-sm font-semibold text-gray-700 mb-2">Con chi dividi?</p>
        {tuttiAmici.length === 0 ? (
          <Card className="p-4 text-center">
            <p className="text-gray-500 text-sm">Nessun amico aggiunto.</p>
            <p className="text-gray-400 text-xs mt-1">Vai nel Menu → I miei amici per aggiungerne.</p>
          </Card>
        ) : (
          <div className="space-y-2">
            {tuttiAmici.map(a => {
              const key = a.tipo + '_' + a.id
              const isSelected = selected.find(s => s.tipo + '_' + s.id === key)
              return (
                <Card
                  key={key}
                  className={`p-3 cursor-pointer transition-all ${isSelected ? 'border-2 border-bolly-400 bg-bolly-50' : ''}`}
                  onClick={() => toggleSelect(a)}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${a.tipo === 'bolly' ? '' : 'bg-gray-200'}`}
                      style={a.tipo === 'bolly' ? { background: 'linear-gradient(145deg, #00897B, #00695C)' } : {}}>
                      <span className={`font-semibold text-lg ${a.tipo === 'bolly' ? 'text-white font-pacifico' : 'text-gray-500'}`}>
                        {a.nome?.[0]?.toUpperCase() || '?'}
                      </span>
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 text-sm">{a.nome}</p>
                      <p className="text-xs text-gray-400">{a.tipo === 'bolly' ? 'Su Bolly' : 'Contatto esterno'}</p>
                    </div>
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${isSelected ? 'bg-bolly-500 border-bolly-500' : 'border-gray-300'}`}>
                      {isSelected && <Check size={14} className="text-white" />}
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {/* Tipo divisione */}
      {selected.length > 0 && (
        <>
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-2">Come dividere?</p>
            <div className="flex gap-2">
              <button
                onClick={() => setDivisione('uguale')}
                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors ${divisione === 'uguale' ? 'bg-bolly-500 text-white' : 'bg-white text-gray-600 border border-gray-200'}`}
              >
                In parti uguali
              </button>
              <button
                onClick={() => setDivisione('personalizzata')}
                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors ${divisione === 'personalizzata' ? 'bg-bolly-500 text-white' : 'bg-white text-gray-600 border border-gray-200'}`}
              >
                Personalizzata
              </button>
            </div>
          </div>

          {/* Riepilogo divisione */}
          <Card className="p-4 space-y-3">
            <p className="text-sm font-semibold text-gray-700">Riepilogo</p>

            {/* Tu (creatore) */}
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(145deg, #00897B, #00695C)' }}>
                  <span className="text-white font-pacifico text-sm">Tu</span>
                </div>
                <p className="text-sm font-medium text-gray-900">Tu (paghi tutto)</p>
              </div>
              <p className="text-sm font-semibold text-bolly-600">{formatEuro(tuaParte)}</p>
            </div>

            {/* Partecipanti */}
            {selected.map(s => {
              const key = s.tipo + '_' + s.id
              return (
                <div key={key} className="flex items-center justify-between py-2 border-b border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${s.tipo === 'bolly' ? '' : 'bg-gray-200'}`}
                      style={s.tipo === 'bolly' ? { background: 'linear-gradient(145deg, #00897B, #00695C)' } : {}}>
                      <span className={`font-semibold text-sm ${s.tipo === 'bolly' ? 'text-white font-pacifico' : 'text-gray-500'}`}>
                        {s.nome?.[0]?.toUpperCase() || '?'}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-gray-900">{s.nome}</p>
                  </div>
                  {divisione === 'uguale' ? (
                    <p className="text-sm font-semibold text-gray-700">{formatEuro(importoPerPersona)}</p>
                  ) : (
                    <input
                      type="number"
                      inputMode="decimal"
                      step="0.01"
                      value={importiCustom[key] || ''}
                      onChange={e => setImportiCustom({ ...importiCustom, [key]: e.target.value })}
                      placeholder="0,00"
                      className="w-24 text-right text-sm font-semibold border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-bolly-400"
                    />
                  )}
                </div>
              )
            })}

            {divisione === 'personalizzata' && tuaParte < 0 && (
              <p className="text-xs text-red-500">Il totale degli importi supera {formatEuro(target.importo)}</p>
            )}
          </Card>

          {/* Nota opzionale */}
          <input
            type="text"
            value={nota}
            onChange={e => setNota(e.target.value)}
            placeholder="Nota (opzionale)..."
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-bolly-400"
          />

          {/* Errore */}
          {errore && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200">
              <p className="text-sm text-red-700">{errore}</p>
            </div>
          )}

          {/* Bottone salva */}
          <button
            onClick={handleSave}
            disabled={saving || selected.length === 0 || (divisione === 'personalizzata' && tuaParte < 0)}
            className="w-full py-3.5 rounded-xl bg-bolly-500 text-white font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving ? <Loader2 size={18} className="animate-spin" /> : <Split size={18} />}
            Dividi con {selected.length} {selected.length === 1 ? 'persona' : 'persone'}
          </button>
        </>
      )}
    </div>
  )
}

function DettaglioSplit({ split, onBack, onRefresh }) {
  const [actionLoading, setActionLoading] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  if (!split) return null

  const partecipanti = split.split_partecipanti || []
  const pagati = partecipanti.filter(p => p.pagato).length
  const totaleRecuperato = partecipanti.filter(p => p.pagato).reduce((acc, p) => acc + Number(p.importo), 0)
  const totaleDaRecuperare = partecipanti.reduce((acc, p) => acc + Number(p.importo), 0)

  const handleTogglePagato = async (partecipanteId, pagato) => {
    setActionLoading(partecipanteId)
    try {
      await togglePartecipantePagato(partecipanteId, pagato)
      await onRefresh()
    } catch (e) { console.error('Errore toggle pagato:', e) }
    setActionLoading(null)
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await deleteSplit(split.id)
      await onRefresh()
      onBack()
    } catch (e) { console.error('Errore eliminazione split:', e) }
    setDeleting(false)
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 rounded-xl hover:bg-gray-100">
            <ChevronLeft size={22} className="text-gray-500" />
          </button>
          <h1 className="text-xl font-bold text-gray-900">Dettaglio split</h1>
        </div>
        <button onClick={() => setConfirmDelete(true)} className="p-2 rounded-xl hover:bg-red-50 text-gray-400">
          <Trash2 size={20} />
        </button>
      </div>

      {confirmDelete && (
        <Card className="p-4 border-red-200 bg-red-50">
          <p className="font-medium text-red-800 mb-2">Eliminare questo split?</p>
          <p className="text-sm text-red-600 mb-3">La spesa resterà, ma la divisione verrà rimossa.</p>
          <div className="flex gap-2">
            <button onClick={() => setConfirmDelete(false)} className="flex-1 py-2 rounded-xl border border-gray-300 text-sm font-medium text-gray-700">Annulla</button>
            <button onClick={handleDelete} disabled={deleting} className="flex-1 py-2 rounded-xl bg-red-600 text-white text-sm font-medium disabled:opacity-50">
              {deleting ? <Loader2 size={16} className="animate-spin mx-auto" /> : 'Elimina'}
            </button>
          </div>
        </Card>
      )}

      {/* Riepilogo */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-2xl font-bold text-gray-900">{formatEuro(split.importo_totale)}</p>
            {split.nota && <p className="text-sm text-gray-500 mt-0.5">{split.nota}</p>}
          </div>
          <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
            <Split size={24} className="text-purple-600" />
          </div>
        </div>
        {/* Barra progresso */}
        <div className="bg-gray-100 rounded-full h-2.5 mb-2">
          <div
            className="bg-green-500 h-2.5 rounded-full transition-all"
            style={{ width: `${totaleDaRecuperare > 0 ? (totaleRecuperato / totaleDaRecuperare) * 100 : 0}%` }}
          />
        </div>
        <p className="text-xs text-gray-500">
          {formatEuro(totaleRecuperato)} di {formatEuro(totaleDaRecuperare)} recuperati · {pagati}/{partecipanti.length} hanno pagato
        </p>
      </Card>

      {/* Lista partecipanti */}
      <div className="space-y-2">
        {partecipanti.map(p => (
          <Card key={p.id} className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-11 h-11 rounded-full flex items-center justify-center ${p.user_id ? '' : 'bg-gray-200'}`}
                  style={p.user_id ? { background: 'linear-gradient(145deg, #00897B, #00695C)' } : {}}>
                  <span className={`font-semibold text-lg ${p.user_id ? 'text-white font-pacifico' : 'text-gray-500'}`}>
                    {p.nome?.[0]?.toUpperCase() || '?'}
                  </span>
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{p.nome}</p>
                  <p className="text-sm font-medium text-gray-600">{formatEuro(p.importo)}</p>
                </div>
              </div>
              <button
                onClick={() => handleTogglePagato(p.id, !p.pagato)}
                disabled={actionLoading === p.id}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${p.pagato ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600 hover:bg-amber-100 hover:text-amber-700'}`}
              >
                {actionLoading === p.id ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : p.pagato ? (
                  <span className="flex items-center gap-1"><Check size={14} /> Pagato</span>
                ) : (
                  'Da pagare'
                )}
              </button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}

// ============================================================
// SPLITS RICEVUTI
// ============================================================

function SplitsRicevutiScreen({ splitsRicevuti, onBack, onRefresh, profile }) {
  const [actionLoading, setActionLoading] = useState(null)

  const nonPagati = splitsRicevuti.filter(s => !s.mio_pagato)
  const pagati = splitsRicevuti.filter(s => s.mio_pagato)

  const handleSegnaConfermato = async (partecipanteId, split) => {
    setActionLoading(partecipanteId)
    try {
      await togglePartecipantePagato(partecipanteId, true)
      // Registra la spesa nelle spese giornaliere con categoria "split"
      const oggi = new Date().toISOString().slice(0, 10)
      const desc = split.nota
        ? `Split: ${split.nota} (da ${split.creatore_nome})`
        : `Split da ${split.creatore_nome}`
      await createSpesa({ importo: Number(split.mia_parte), categoria: 'split', descrizione: desc, data: oggi })
      // Push notifications gestite automaticamente dal database trigger
      await onRefresh()
    } catch (e) { console.error('Errore conferma pagamento:', e) }
    setActionLoading(null)
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-2 rounded-xl hover:bg-gray-100">
          <ChevronLeft size={22} className="text-gray-500" />
        </button>
        <h1 className="text-xl font-bold text-gray-900">Split ricevuti</h1>
      </div>

      {nonPagati.length === 0 && pagati.length === 0 && (
        <Card className="p-6 text-center">
          <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <Split size={28} className="text-gray-400" />
          </div>
          <p className="text-gray-500 text-sm">Nessuno split ricevuto</p>
          <p className="text-gray-400 text-xs mt-1">Quando un amico divide una spesa con te, la vedrai qui.</p>
        </Card>
      )}

      {/* Da saldare */}
      {nonPagati.length > 0 && (
        <div>
          <p className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
            <CircleDollarSign size={16} className="text-orange-500" />
            Da saldare ({nonPagati.length})
          </p>
          <div className="space-y-2.5">
            {nonPagati.map(s => (
              <Card key={s.id} className="p-4 border-orange-100">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(145deg, #00897B, #00695C)' }}>
                      <span className="text-white font-pacifico text-sm">{s.creatore_nome?.[0]?.toUpperCase() || '?'}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{s.creatore_nome} ha diviso con te</p>
                      <p className="text-xs text-gray-500">{s.nota || (s.tipo === 'spesa' ? 'Spesa' : 'Bolletta')} · {s.divisione === 'uguale' ? 'Parti uguali' : 'Personalizzata'}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{formatData(s.created_at)}</p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-lg font-bold text-orange-600">{formatEuro(s.mia_parte)}</p>
                    <button
                      onClick={() => handleSegnaConfermato(s.mio_partecipante_id, s)}
                      disabled={actionLoading === s.mio_partecipante_id}
                      className="mt-1 px-3 py-1.5 rounded-lg bg-bolly-500 text-white text-xs font-semibold disabled:opacity-50"
                    >
                      {actionLoading === s.mio_partecipante_id ? <Loader2 size={12} className="animate-spin" /> : 'Ho pagato'}
                    </button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Già saldati */}
      {pagati.length > 0 && (
        <div>
          <p className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
            <Check size={16} className="text-green-500" />
            Già saldati ({pagati.length})
          </p>
          <div className="space-y-2">
            {pagati.map(s => (
              <Card key={s.id} className="p-3 opacity-70">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                      <Check size={16} className="text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">{s.creatore_nome}</p>
                      <p className="text-xs text-gray-400">{s.nota || (s.tipo === 'spesa' ? 'Spesa' : 'Bolletta')}</p>
                    </div>
                  </div>
                  <p className="text-sm font-semibold text-green-600 line-through">{formatEuro(s.mia_parte)}</p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================
// AMICI
// ============================================================

function SchermataAmici({ onBack, session, profile, splits = [], splitsRicevuti = [] }) {
  const [amici, setAmici] = useState([])
  const [richiesteRicevute, setRichiesteRicevute] = useState([])
  const [richiesteInviate, setRichiesteInviate] = useState([])
  const [contattiEsterni, setContattiEsterni] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAggiungi, setShowAggiungi] = useState(false)
  const [searchEmail, setSearchEmail] = useState('')
  const [searchResult, setSearchResult] = useState(null) // null = non cercato, 'not_found', 'already_friend', 'already_sent', oggetto utente
  const [searching, setSearching] = useState(false)
  const [nomeEsterno, setNomeEsterno] = useState('')
  const [emailEsterno, setEmailEsterno] = useState('')
  const [saving, setSaving] = useState(false)
  const [actionLoading, setActionLoading] = useState(null) // id dell'amicizia/contatto in azione
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [tab, setTab] = useState('amici') // 'amici' | 'richieste' | 'saldi'

  const loadAmici = async () => {
    try {
      const [a, rr, ri, ce] = await Promise.all([
        getAmici(), getRichiesteRicevute(), getRichiesteInviate(), getContattiEsterni()
      ])
      setAmici(a)
      setRichiesteRicevute(rr)
      setRichiesteInviate(ri)
      setContattiEsterni(ce)
    } catch (e) { console.error('Errore caricamento amici:', e) }
    setLoading(false)
  }

  useEffect(() => { loadAmici() }, [])

  const handleCercaUtente = async () => {
    const email = searchEmail.trim().toLowerCase()
    if (!email) return
    setSearching(true)
    setSearchResult(null)
    try {
      // Controlla se è la propria email
      if (email === session?.user?.email?.toLowerCase()) {
        setSearchResult('self')
        setSearching(false)
        return
      }
      const utente = await cercaUtenteBolly(email)
      if (!utente) {
        setSearchResult('not_found')
      } else {
        // Controlla se già amici o richiesta già inviata
        const giàAmico = amici.find(a => a.amico_id === utente.user_id)
        if (giàAmico) {
          setSearchResult('already_friend')
        } else {
          const giàInviata = richiesteInviate.find(r => r.destinatario_id === utente.user_id)
          if (giàInviata) {
            setSearchResult('already_sent')
          } else {
            setSearchResult(utente)
          }
        }
      }
    } catch (e) { console.error('Errore ricerca:', e); setSearchResult('not_found') }
    setSearching(false)
  }

  const handleInviaRichiesta = async (userId) => {
    setSaving(true)
    try {
      await inviaRichiestaAmicizia(userId)
      // Push notifications gestite automaticamente dal database trigger
      setSearchEmail('')
      setSearchResult(null)
      setShowAggiungi(false)
      await loadAmici()
    } catch (e) { console.error('Errore invio richiesta:', e) }
    setSaving(false)
  }

  const handleAggiungiEsterno = async (emailOverride) => {
    const nome = nomeEsterno.trim()
    const email = (emailOverride || emailEsterno || searchEmail).trim().toLowerCase()
    if (!nome || !email) return
    setSaving(true)
    try {
      await addContattoEsterno({ nome, email })
      setNomeEsterno('')
      setEmailEsterno('')
      setShowAggiungi(false)
      await loadAmici()
    } catch (e) { console.error('Errore aggiunta contatto:', e) }
    setSaving(false)
  }

  const handleAccetta = async (id) => {
    setActionLoading(id)
    try {
      await accettaAmicizia(id)
      await loadAmici()
    } catch (e) { console.error('Errore accettazione:', e) }
    setActionLoading(null)
  }

  const handleRifiuta = async (id) => {
    setActionLoading(id)
    try {
      await rifiutaAmicizia(id)
      await loadAmici()
    } catch (e) { console.error('Errore rifiuto:', e) }
    setActionLoading(null)
  }

  const handleRimuoviAmico = async (amiciziaId) => {
    setActionLoading(amiciziaId)
    try {
      await rimuoviAmico(amiciziaId)
      setConfirmDelete(null)
      await loadAmici()
    } catch (e) { console.error('Errore rimozione:', e) }
    setActionLoading(null)
  }

  const handleRimuoviEsterno = async (id) => {
    setActionLoading(id)
    try {
      await deleteContattoEsterno(id)
      setConfirmDelete(null)
      await loadAmici()
    } catch (e) { console.error('Errore rimozione contatto:', e) }
    setActionLoading(null)
  }

  const totaleRichieste = richiesteRicevute.length

  if (loading) return <Loading />

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 rounded-xl hover:bg-gray-100">
            <ChevronLeft size={22} className="text-gray-500" />
          </button>
          <h1 className="text-xl font-bold text-gray-900">I miei amici</h1>
        </div>
        <button
          onClick={() => { setShowAggiungi(true); setSearchEmail(''); setSearchResult(null); setNomeEsterno(''); setEmailEsterno('') }}
          className="p-2.5 rounded-xl bg-bolly-500 text-white shadow-sm"
        >
          <UserPlus size={20} />
        </button>
      </div>

      {/* Tab: Amici / Richieste / Saldi */}
      <div className="flex gap-2">
        <button
          onClick={() => setTab('amici')}
          className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors ${tab === 'amici' ? 'bg-bolly-500 text-white' : 'bg-white text-gray-600 border border-gray-200'}`}
        >
          Amici ({amici.length + contattiEsterni.length})
        </button>
        <button
          onClick={() => setTab('richieste')}
          className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors relative ${tab === 'richieste' ? 'bg-bolly-500 text-white' : 'bg-white text-gray-600 border border-gray-200'}`}
        >
          Richieste
          {totaleRichieste > 0 && (
            <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">{totaleRichieste}</span>
          )}
        </button>
        <button
          onClick={() => setTab('saldi')}
          className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors ${tab === 'saldi' ? 'bg-bolly-500 text-white' : 'bg-white text-gray-600 border border-gray-200'}`}
        >
          Saldi
        </button>
      </div>

      {/* Modale Aggiungi Amico */}
      {showAggiungi && (
        <Card className="p-4 border-2 border-bolly-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Aggiungi amico</h3>
            <button onClick={() => setShowAggiungi(false)} className="p-1 rounded-lg hover:bg-gray-100">
              <X size={18} className="text-gray-400" />
            </button>
          </div>

          {/* Cerca utente Bolly per email */}
          <div className="space-y-3">
            <p className="text-xs text-gray-500">Cerca per email per trovare chi è già su Bolly</p>
            <div className="flex gap-2">
              <input
                type="email"
                value={searchEmail}
                onChange={e => { setSearchEmail(e.target.value); setSearchResult(null) }}
                onKeyDown={e => { if (e.key === 'Enter') handleCercaUtente() }}
                placeholder="Email dell'amico..."
                className="flex-1 px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-bolly-400"
              />
              <button
                onClick={handleCercaUtente}
                disabled={searching || !searchEmail.trim()}
                className="px-4 py-2.5 rounded-xl bg-bolly-500 text-white text-sm font-medium disabled:opacity-50"
              >
                {searching ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
              </button>
            </div>

            {/* Risultato ricerca */}
            {searchResult === 'self' && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                <p className="text-sm text-amber-700">Non puoi aggiungere te stesso!</p>
              </div>
            )}
            {searchResult === 'already_friend' && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-3">
                <p className="text-sm text-green-700">Siete già amici!</p>
              </div>
            )}
            {searchResult === 'already_sent' && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                <p className="text-sm text-blue-700">Richiesta già inviata, in attesa di risposta.</p>
              </div>
            )}
            {searchResult && typeof searchResult === 'object' && searchResult.user_id && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(145deg, #00897B, #00695C)' }}>
                      <span className="text-white font-pacifico text-lg">{searchResult.nome?.[0]?.toUpperCase() || 'U'}</span>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">{searchResult.nome}</p>
                      <p className="text-xs text-gray-500">Su Bolly</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleInviaRichiesta(searchResult.user_id)}
                    disabled={saving}
                    className="px-4 py-2 rounded-xl bg-bolly-500 text-white text-sm font-medium disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {saving ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                    Invita
                  </button>
                </div>
              </div>
            )}

            {/* Se non trovato: form contatto esterno */}
            {searchResult === 'not_found' && (
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 space-y-3">
                <p className="text-sm text-gray-600">Nessun utente Bolly con questa email. Aggiungilo come contatto esterno:</p>
                <input
                  type="text"
                  value={nomeEsterno}
                  onChange={e => setNomeEsterno(e.target.value)}
                  placeholder="Nome dell'amico"
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-bolly-400"
                />
                <div className="bg-white px-3 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600">
                  {searchEmail}
                </div>
                <button
                  onClick={() => handleAggiungiEsterno(searchEmail)}
                  disabled={saving || !nomeEsterno.trim()}
                  className="w-full py-2.5 rounded-xl bg-bolly-500 text-white text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}
                  Aggiungi contatto
                </button>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* TAB: Lista amici */}
      {tab === 'amici' && (
        <div className="space-y-3">
          {amici.length === 0 && contattiEsterni.length === 0 ? (
            <Card className="p-8 text-center">
              <Users size={40} className="text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">Nessun amico ancora.</p>
              <p className="text-gray-400 text-xs mt-1">Tocca + per aggiungere il primo!</p>
            </Card>
          ) : (
            <>
              {/* Amici Bolly */}
              {amici.map(a => (
                <Card key={a.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(145deg, #00897B, #00695C)' }}>
                        <span className="text-white font-pacifico text-lg">{a.amico_nome?.[0]?.toUpperCase() || 'U'}</span>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{a.amico_nome}</p>
                        <div className="flex items-center gap-1 mt-0.5">
                          <span className="w-2 h-2 rounded-full bg-bolly-500" />
                          <span className="text-xs text-bolly-600">Su Bolly</span>
                        </div>
                      </div>
                    </div>
                    {confirmDelete === a.id ? (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleRimuoviAmico(a.id)}
                          disabled={actionLoading === a.id}
                          className="px-3 py-1.5 rounded-lg bg-red-500 text-white text-xs font-medium disabled:opacity-50"
                        >
                          {actionLoading === a.id ? <Loader2 size={12} className="animate-spin" /> : 'Conferma'}
                        </button>
                        <button onClick={() => setConfirmDelete(null)} className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 text-xs font-medium">
                          Annulla
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => setConfirmDelete(a.id)} className="p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500">
                        <UserX size={18} />
                      </button>
                    )}
                  </div>
                </Card>
              ))}

              {/* Contatti esterni */}
              {contattiEsterni.map(c => (
                <Card key={c.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-full bg-gray-200 flex items-center justify-center">
                        <span className="text-gray-500 font-semibold text-lg">{c.nome?.[0]?.toUpperCase() || '?'}</span>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{c.nome}</p>
                        <div className="flex items-center gap-1 mt-0.5">
                          <span className="w-2 h-2 rounded-full bg-gray-400" />
                          <span className="text-xs text-gray-500">{c.email || c.telefono}</span>
                        </div>
                      </div>
                    </div>
                    {confirmDelete === c.id ? (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleRimuoviEsterno(c.id)}
                          disabled={actionLoading === c.id}
                          className="px-3 py-1.5 rounded-lg bg-red-500 text-white text-xs font-medium disabled:opacity-50"
                        >
                          {actionLoading === c.id ? <Loader2 size={12} className="animate-spin" /> : 'Conferma'}
                        </button>
                        <button onClick={() => setConfirmDelete(null)} className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 text-xs font-medium">
                          Annulla
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => setConfirmDelete(c.id)} className="p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500">
                        <UserX size={18} />
                      </button>
                    )}
                  </div>
                </Card>
              ))}
            </>
          )}
        </div>
      )}

      {/* TAB: Richieste */}
      {tab === 'richieste' && (
        <div className="space-y-3">
          {/* Richieste ricevute */}
          {richiesteRicevute.length > 0 && (
            <>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-1">Ricevute</p>
              {richiesteRicevute.map(r => (
                <Card key={r.id} className="p-4 border-l-4 border-l-bolly-400">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(145deg, #00897B, #00695C)' }}>
                        <span className="text-white font-pacifico text-lg">{r.richiedente_nome?.[0]?.toUpperCase() || 'U'}</span>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{r.richiedente_nome}</p>
                        <p className="text-xs text-gray-500">Vuole aggiungerti come amico</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleAccetta(r.id)}
                        disabled={actionLoading === r.id}
                        className="p-2 rounded-lg bg-green-100 text-green-600 hover:bg-green-200 disabled:opacity-50"
                      >
                        {actionLoading === r.id ? <Loader2 size={18} className="animate-spin" /> : <UserCheck size={18} />}
                      </button>
                      <button
                        onClick={() => handleRifiuta(r.id)}
                        disabled={actionLoading === r.id}
                        className="p-2 rounded-lg bg-red-100 text-red-500 hover:bg-red-200 disabled:opacity-50"
                      >
                        <X size={18} />
                      </button>
                    </div>
                  </div>
                </Card>
              ))}
            </>
          )}

          {/* Richieste inviate */}
          {richiesteInviate.length > 0 && (
            <>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-1 mt-4">Inviate</p>
              {richiesteInviate.map(r => (
                <Card key={r.id} className="p-4 opacity-75">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-full flex items-center justify-center bg-gray-200">
                      <Clock size={20} className="text-gray-400" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{r.destinatario_nome}</p>
                      <p className="text-xs text-gray-500">In attesa di risposta...</p>
                    </div>
                  </div>
                </Card>
              ))}
            </>
          )}

          {richiesteRicevute.length === 0 && richiesteInviate.length === 0 && (
            <Card className="p-8 text-center">
              <Mail size={40} className="text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">Nessuna richiesta.</p>
            </Card>
          )}
        </div>
      )}

      {/* TAB: Saldi netti */}
      {tab === 'saldi' && (() => {
        // Calcola saldi netti tra amici
        const userId = session?.user?.id
        const saldiMap = {} // { amicoId: { nome, saldo } } — positivo = ti devono, negativo = devi tu

        // Split creati da me → partecipanti non pagati mi devono
        splits.forEach(s => {
          (s.split_partecipanti || []).forEach(p => {
            if (!p.user_id || p.user_id === userId) return
            if (!saldiMap[p.user_id]) saldiMap[p.user_id] = { nome: p.nome, saldo: 0 }
            if (!p.pagato) saldiMap[p.user_id].saldo += Number(p.importo)
          })
        })

        // Split ricevuti da me → se non pagato, devo al creatore
        splitsRicevuti.forEach(s => {
          if (!s.user_id || s.user_id === userId) return
          if (!saldiMap[s.user_id]) saldiMap[s.user_id] = { nome: s.creatore_nome || 'Utente', saldo: 0 }
          if (!s.mio_pagato) saldiMap[s.user_id].saldo -= Number(s.mia_parte)
        })

        const saldiArray = Object.entries(saldiMap)
          .map(([id, v]) => ({ id, nome: v.nome, saldo: Math.round(v.saldo * 100) / 100 }))
          .filter(s => s.saldo !== 0)
          .sort((a, b) => b.saldo - a.saldo) // prima chi ti deve di più

        const totaleCredito = saldiArray.filter(s => s.saldo > 0).reduce((a, s) => a + s.saldo, 0)
        const totaleDebito = saldiArray.filter(s => s.saldo < 0).reduce((a, s) => a + Math.abs(s.saldo), 0)

        return (
          <div className="space-y-4">
            {/* Riepilogo totale */}
            <div className="grid grid-cols-2 gap-3">
              <Card className="p-4 bg-green-50 border-green-200">
                <div className="flex items-center gap-2 mb-1">
                  <ArrowDownRight size={16} className="text-green-600" />
                  <p className="text-xs font-semibold text-green-700">Ti devono</p>
                </div>
                <p className="text-xl font-bold text-green-700">{formatEuro(totaleCredito)}</p>
              </Card>
              <Card className="p-4 bg-orange-50 border-orange-200">
                <div className="flex items-center gap-2 mb-1">
                  <ArrowUpRight size={16} className="text-orange-600" />
                  <p className="text-xs font-semibold text-orange-700">Devi</p>
                </div>
                <p className="text-xl font-bold text-orange-700">{formatEuro(totaleDebito)}</p>
              </Card>
            </div>

            {saldiArray.length === 0 ? (
              <Card className="p-8 text-center">
                <Scale size={40} className="text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">Tutti i conti sono in pari!</p>
                <p className="text-gray-400 text-xs mt-1">I saldi si aggiornano in base agli split aperti.</p>
              </Card>
            ) : (
              <div className="space-y-2.5">
                {saldiArray.map(s => (
                  <Card key={s.id} className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(145deg, #00897B, #00695C)' }}>
                          <span className="text-white font-pacifico text-lg">{s.nome?.[0]?.toUpperCase() || '?'}</span>
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{s.nome}</p>
                          <p className="text-xs text-gray-500">
                            {s.saldo > 0 ? 'Ti deve' : 'Gli devi'}
                          </p>
                        </div>
                      </div>
                      <div className={`text-right`}>
                        <p className={`text-lg font-bold ${s.saldo > 0 ? 'text-green-600' : 'text-orange-600'}`}>
                          {s.saldo > 0 ? '+' : '-'}{formatEuro(Math.abs(s.saldo))}
                        </p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )
      })()}
    </div>
  )
}

// ============================================================
// PROFILO
// ============================================================

function MenuPanel({ profile, session, onBack, onLogout, onNavigate, onUpdateProfile, abitazioni, onRefreshAbitazioni, amiciCount, richiesteCount }) {
  const [copied, setCopied] = useState(false)
  const [faqSectionOpen, setFaqSectionOpen] = useState(false)
  const [faqOpen, setFaqOpen] = useState(null)
  const [editingNome, setEditingNome] = useState(false)
  const [nomeValue, setNomeValue] = useState(profile?.nome || '')
  const [savingNome, setSavingNome] = useState(false)
  const [pushActive, setPushActive] = useState(null)
  const [pushLoading, setPushLoading] = useState(false)
  const [showAbitazioneForm, setShowAbitazioneForm] = useState(false)
  const [editingAbitazione, setEditingAbitazione] = useState(null)
  const [abitazioneNome, setAbitazioneNome] = useState('')
  const [abitazioneIcona, setAbitazioneIcona] = useState('Home')
  const [abitazioneIndirizzo, setAbitazioneIndirizzo] = useState('')
  const [savingAbitazione, setSavingAbitazione] = useState(false)
  const [deletingAbitazione, setDeletingAbitazione] = useState(null)

  const handleSaveAbitazione = async () => {
    const trimmed = abitazioneNome.trim()
    if (!trimmed) return
    setSavingAbitazione(true)
    try {
      if (editingAbitazione) {
        await updateAbitazione(editingAbitazione.id, { nome: trimmed, icona: abitazioneIcona, indirizzo: abitazioneIndirizzo.trim() || null })
      } else {
        await createAbitazione({ nome: trimmed, icona: abitazioneIcona, indirizzo: abitazioneIndirizzo.trim() || null })
      }
      setShowAbitazioneForm(false)
      setEditingAbitazione(null)
      setAbitazioneNome('')
      setAbitazioneIcona('Home')
      setAbitazioneIndirizzo('')
      if (onRefreshAbitazioni) await onRefreshAbitazioni()
    } catch (e) { console.error('Errore salvataggio abitazione:', e) }
    setSavingAbitazione(false)
  }

  const handleDeleteAbitazione = async (id) => {
    try {
      await deleteAbitazione(id)
      setDeletingAbitazione(null)
      if (onRefreshAbitazioni) await onRefreshAbitazioni()
    } catch (e) { console.error('Errore eliminazione abitazione:', e) }
  }

  const openEditAbitazione = (ab) => {
    setEditingAbitazione(ab)
    setAbitazioneNome(ab.nome)
    setAbitazioneIcona(ab.icona || 'Home')
    setAbitazioneIndirizzo(ab.indirizzo || '')
    setShowAbitazioneForm(true)
  }

  const openNewAbitazione = () => {
    setEditingAbitazione(null)
    setAbitazioneNome('')
    setAbitazioneIcona('Home')
    setAbitazioneIndirizzo('')
    setShowAbitazioneForm(true)
  }

  const handleSaveNome = async () => {
    const trimmed = nomeValue.trim()
    if (!trimmed || trimmed === profile?.nome) { setEditingNome(false); return }
    setSavingNome(true)
    try {
      await supabase.from('profiles').update({ nome: trimmed }).eq('id', session.user.id)
      if (onUpdateProfile) onUpdateProfile({ ...profile, nome: trimmed })
      setEditingNome(false)
    } catch (e) { console.error('Errore aggiornamento nome:', e) }
    setSavingNome(false)
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(profile?.email_dedicata || '')
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (e) {
      console.error('Errore copia:', e)
    }
  }

  // Controlla stato notifiche push
  useEffect(() => {
    isPushSubscribed().then(active => setPushActive(active))
  }, [])

  const handleActivatePush = async () => {
    setPushLoading(true)
    try {
      console.log('🔔 Attivazione push per user:', session.user.id)
      const success = await subscribeToPush(session.user.id)
      console.log('🔔 Risultato subscribeToPush:', success)
      if (success && window.posthog) window.posthog.capture('push_attivate')
      setPushActive(success)
      if (!success) {
        alert('Non è stato possibile attivare le notifiche. Controlla i permessi del browser per questo sito.')
      }
    } catch (e) {
      console.error('Errore attivazione push:', e)
      alert('Errore attivazione: ' + e.message)
    }
    setPushLoading(false)
  }

  const faqItems = [
    { q: 'Cos\'è Bolly?', a: 'Bolly è un portafoglio contratti che ti permette di aggregare tutti i tuoi contratti ricorrenti (utenze, abbonamenti, assicurazioni, finanziamenti) in un unico posto. Ricevi le bollette, visualizzi le scadenze e non dimentichi più un pagamento.' },
    { q: 'Come funziona l\'email dedicata?', a: 'Al momento della registrazione ti viene assegnato un indirizzo email unico (es. nome.xxxx@mail.getbolly.app). Vai sul portale dei tuoi fornitori e aggiungilo come destinatario per le bollette digitali: le bollette future verranno importate automaticamente nell\'app.' },
    { q: 'Quanti contratti posso aggiungere?', a: 'Con il piano gratuito puoi gestire fino a 3 contratti attivi. In futuro saranno disponibili piani premium con contratti illimitati e funzionalità aggiuntive.' },
    { q: 'I miei dati sono al sicuro?', a: 'Sì. Bolly non accede ai contenuti delle tue bollette per finalità diverse dall\'erogazione del servizio e non condivide i tuoi dati con terze parti per finalità commerciali. I dati sono protetti e archiviati in modo sicuro.' },
    { q: 'Bolly effettua pagamenti per me?', a: 'No. Bolly è uno strumento di gestione e promemoria. Non ha accesso ai tuoi conti correnti e non effettua pagamenti. Ti aiuta a ricordare le scadenze e a tenere tutto organizzato.' },
    { q: 'Come cancello il mio account?', a: 'Puoi richiedere la cancellazione scrivendo a support@getbolly.app. Tutti i tuoi dati (contratti, bollette, PDF) verranno eliminati definitivamente entro 30 giorni.' },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Menu</h1>
        <button onClick={onBack} className="p-2 rounded-xl hover:bg-gray-100">
          <X size={22} className="text-gray-500" />
        </button>
      </div>

      {/* Profilo utente */}
      <Card className="p-4">
        <div className="flex items-center gap-3">
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center shadow-md flex-shrink-0"
            style={{ background: 'linear-gradient(145deg, #00897B, #00695C)' }}
          >
            <span className="text-white font-pacifico" style={{ fontSize: '28px', lineHeight: 1 }}>
              {profile?.nome?.[0]?.toUpperCase() || 'U'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            {editingNome ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={nomeValue}
                  onChange={e => setNomeValue(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleSaveNome(); if (e.key === 'Escape') setEditingNome(false) }}
                  autoFocus
                  className="text-lg font-semibold text-gray-900 border-b-2 border-bolly-500 outline-none bg-transparent w-full py-0.5"
                  placeholder="Il tuo nome"
                />
                <button onClick={handleSaveNome} disabled={savingNome} className="p-1.5 rounded-lg bg-bolly-500 text-white flex-shrink-0 disabled:opacity-50">
                  {savingNome ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                </button>
                <button onClick={() => { setEditingNome(false); setNomeValue(profile?.nome || '') }} className="p-1.5 rounded-lg bg-gray-100 text-gray-500 flex-shrink-0">
                  <X size={16} />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-gray-900">{profile?.nome || 'Utente'}</h2>
                <button onClick={() => { setNomeValue(profile?.nome || ''); setEditingNome(true) }} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400">
                  <Pencil size={14} />
                </button>
              </div>
            )}
            <p className="text-sm text-gray-500 truncate">{session?.user?.email}</p>
          </div>
        </div>
      </Card>

      {/* Email dedicata */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <Mail size={18} className="text-bolly-500" />
          <h3 className="font-semibold text-gray-900 text-sm">Il tuo indirizzo Bolly</h3>
        </div>
        <div className="bg-gray-50 rounded-xl p-3 flex items-center gap-2 border border-gray-100">
          <span className="font-mono text-sm text-gray-800 break-all flex-1">
            {profile?.email_dedicata || 'Non ancora impostato'}
          </span>
          <button
            onClick={handleCopy}
            disabled={!profile?.email_dedicata}
            className="p-2 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 flex-shrink-0 disabled:opacity-50"
            title="Copia indirizzo"
          >
            {copied ? (
              <Check size={16} className="text-green-600" />
            ) : (
              <Copy size={16} className="text-gray-600" />
            )}
          </button>
        </div>
      </Card>

      {/* I miei amici */}
      <Card className="p-4 cursor-pointer active:scale-[0.98] transition-transform" onClick={() => onNavigate('amici')}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
              <Users size={20} className="text-purple-600" />
            </div>
            <div>
              <p className="font-semibold text-gray-900 text-sm">I miei amici</p>
              <p className="text-xs text-gray-500">{amiciCount || 0} {amiciCount === 1 ? 'amico' : 'amici'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {richiesteCount > 0 && (
              <span className="w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">{richiesteCount}</span>
            )}
            <ChevronRight size={20} className="text-gray-400" />
          </div>
        </div>
      </Card>

      {/* Le mie abitazioni */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Building2 size={18} className="text-bolly-500" />
            <h3 className="font-semibold text-gray-900 text-sm">Le mie abitazioni</h3>
          </div>
          <button
            onClick={openNewAbitazione}
            className="p-1.5 rounded-lg bg-bolly-50 text-bolly-600 hover:bg-bolly-100"
          >
            <Plus size={16} />
          </button>
        </div>

        {(!abitazioni || abitazioni.length === 0) && !showAbitazioneForm && (
          <div className="text-center py-4">
            <Home size={28} className="text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-400">Nessuna abitazione aggiunta</p>
            <p className="text-xs text-gray-300 mt-1">Aggiungi le tue case per organizzare i contratti</p>
          </div>
        )}

        {abitazioni && abitazioni.length > 0 && (
          <div className="space-y-2 mb-2">
            {abitazioni.map(ab => {
              const iconInfo = getIconaAbitazione(ab.icona)
              const AbIcon = iconInfo.icon
              return (
                <div key={ab.id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
                  <div className="w-10 h-10 rounded-xl bg-bolly-100 flex items-center justify-center flex-shrink-0">
                    <AbIcon size={20} className="text-bolly-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{ab.nome}</p>
                    {ab.indirizzo && <p className="text-xs text-gray-400 truncate">{ab.indirizzo}</p>}
                  </div>
                  <button onClick={() => openEditAbitazione(ab)} className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-400">
                    <Pencil size={14} />
                  </button>
                  <button onClick={() => setDeletingAbitazione(ab)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500">
                    <Trash2 size={14} />
                  </button>
                </div>
              )
            })}
          </div>
        )}

        {/* Form nuova/modifica abitazione */}
        {showAbitazioneForm && (
          <div className="mt-2 p-3 rounded-xl bg-bolly-50 border border-bolly-100 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-bolly-700">{editingAbitazione ? 'Modifica abitazione' : 'Nuova abitazione'}</p>
              <button onClick={() => { setShowAbitazioneForm(false); setEditingAbitazione(null) }} className="p-1 rounded-lg hover:bg-bolly-100 text-bolly-400">
                <X size={16} />
              </button>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Nome *</label>
              <input
                type="text"
                value={abitazioneNome}
                onChange={e => setAbitazioneNome(e.target.value)}
                placeholder="es. Casa Milano, Casa al mare..."
                autoFocus
                className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-bolly-500 focus:border-transparent outline-none text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Tipologia</label>
              <div className="flex gap-2">
                {ICONE_ABITAZIONE.map(ic => {
                  const IcIcon = ic.icon
                  const isAltroCategory = ic.id === 'MapPin'
                  const isSelectedDirect = abitazioneIcona === ic.id
                  const isAltroSubSelected = isAltroCategory && ICONE_ALTRO.some(a => a.id === abitazioneIcona)
                  const isActive = isSelectedDirect || isAltroSubSelected
                  return (
                    <button
                      key={ic.id}
                      onClick={() => setAbitazioneIcona(ic.id)}
                      className={`flex-1 flex flex-col items-center gap-1 py-2 rounded-xl text-xs border transition-colors ${isActive ? 'bg-bolly-100 border-bolly-300 text-bolly-700' : 'border-gray-200 text-gray-500 bg-white'}`}
                    >
                      <IcIcon size={18} />
                      <span className="leading-tight">{ic.label}</span>
                    </button>
                  )
                })}
              </div>
              {(abitazioneIcona === 'MapPin' || ICONE_ALTRO.some(a => a.id === abitazioneIcona)) && (
                <div className="flex gap-2 mt-2">
                  {ICONE_ALTRO.map(ic => {
                    const IcIcon = ic.icon
                    return (
                      <button
                        key={ic.id}
                        onClick={() => setAbitazioneIcona(ic.id)}
                        className={`flex-1 flex flex-col items-center gap-1 py-2 rounded-xl text-xs border transition-colors ${abitazioneIcona === ic.id ? 'bg-bolly-100 border-bolly-300 text-bolly-700' : 'border-gray-200 text-gray-500 bg-white'}`}
                      >
                        <IcIcon size={18} />
                        <span className="leading-tight">{ic.label}</span>
                      </button>
                    )
                  })}
                  <button
                    onClick={() => setAbitazioneIcona('MapPin')}
                    className={`flex-1 flex flex-col items-center gap-1 py-2 rounded-xl text-xs border transition-colors ${abitazioneIcona === 'MapPin' ? 'bg-bolly-100 border-bolly-300 text-bolly-700' : 'border-gray-200 text-gray-500 bg-white'}`}
                  >
                    <MapPin size={18} />
                    <span className="leading-tight">Generico</span>
                  </button>
                </div>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Indirizzo (opzionale)</label>
              <input
                type="text"
                value={abitazioneIndirizzo}
                onChange={e => setAbitazioneIndirizzo(e.target.value)}
                placeholder="es. Via Roma 1, Milano"
                className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-bolly-500 focus:border-transparent outline-none text-sm"
              />
            </div>
            <button
              onClick={handleSaveAbitazione}
              disabled={savingAbitazione || !abitazioneNome.trim()}
              className="w-full py-2.5 bg-bolly-500 text-white font-semibold rounded-xl text-sm disabled:opacity-40"
            >
              {savingAbitazione ? 'Salvataggio...' : editingAbitazione ? 'Salva modifiche' : 'Aggiungi abitazione'}
            </button>
          </div>
        )}

        {/* Modale conferma eliminazione abitazione */}
        {deletingAbitazione && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-6" onClick={() => setDeletingAbitazione(null)}>
            <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl" onClick={e => e.stopPropagation()}>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Eliminare "{deletingAbitazione.nome}"?</h3>
              <p className="text-sm text-gray-500 mb-4">I contratti associati a questa abitazione non verranno eliminati, ma perderanno l'associazione.</p>
              <div className="flex gap-3">
                <button onClick={() => setDeletingAbitazione(null)} className="flex-1 py-2.5 rounded-xl border border-gray-200 font-medium text-gray-700 text-sm">Annulla</button>
                <button onClick={() => handleDeleteAbitazione(deletingAbitazione.id)} className="flex-1 py-2.5 rounded-xl bg-red-500 text-white font-medium text-sm">Elimina</button>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Notifiche push */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Bell size={18} className="text-bolly-500" />
          <h3 className="font-semibold text-gray-900 text-sm">Notifiche push</h3>
        </div>
        {pushActive === null ? (
          <div className="flex items-center gap-2 py-2">
            <Loader2 size={16} className="animate-spin text-gray-400" />
            <span className="text-sm text-gray-400">Verifica in corso...</span>
          </div>
        ) : pushActive ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2 py-2">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-sm text-green-700">Notifiche attive su questo dispositivo</span>
            </div>
            <button
              onClick={handleActivatePush}
              disabled={pushLoading}
              className="text-xs text-gray-400 underline"
            >
              {pushLoading ? 'Riattivazione...' : 'Problemi? Riattiva notifiche'}
            </button>
          </div>
        ) : (
          <div>
            <p className="text-sm text-gray-500 mb-3">Le notifiche non sono attive su questo dispositivo. Attivale per ricevere avvisi sulle bollette in scadenza.</p>
            <button
              onClick={handleActivatePush}
              disabled={pushLoading}
              className="w-full py-2.5 rounded-xl text-sm font-medium text-white disabled:opacity-50"
              style={{ background: 'linear-gradient(145deg, #00897B, #00695C)' }}
            >
              {pushLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 size={16} className="animate-spin" />
                  Attivazione...
                </span>
              ) : (
                'Attiva notifiche'
              )}
            </button>
          </div>
        )}
      </Card>

      {/* Informazioni e supporto */}
      <Card className="p-4">
        <h3 className="font-semibold text-gray-900 text-sm mb-3">Informazioni e supporto</h3>
        <div className="space-y-1">
          {/* FAQ compatta */}
          <div>
            <button
              onClick={() => { setFaqSectionOpen(!faqSectionOpen); setFaqOpen(null) }}
              className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors"
            >
              <HelpCircle size={18} className="text-bolly-500" />
              <span className="text-sm text-gray-700">Domande frequenti</span>
              <ChevronDown size={16} className={`text-gray-400 ml-auto transition-transform ${faqSectionOpen ? 'rotate-180' : ''}`} />
            </button>
            {faqSectionOpen && (
              <div className="ml-3 mr-1 mb-2 border-l-2 border-bolly-100 pl-3">
                {faqItems.map((item, i) => (
                  <div key={i}>
                    <button
                      onClick={() => setFaqOpen(faqOpen === i ? null : i)}
                      className="w-full flex items-center justify-between py-2.5 px-2 rounded-lg hover:bg-gray-50 transition-colors text-left"
                    >
                      <span className="text-sm text-gray-700 pr-2">{item.q}</span>
                      <ChevronDown size={14} className={`text-gray-300 flex-shrink-0 transition-transform ${faqOpen === i ? 'rotate-180' : ''}`} />
                    </button>
                    {faqOpen === i && (
                      <div className="px-2 pb-2.5">
                        <p className="text-sm text-gray-500 leading-relaxed">{item.a}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
          <button onClick={() => onNavigate('termini')} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors">
            <FileText size={18} className="text-bolly-500" />
            <span className="text-sm text-gray-700">Termini e Condizioni</span>
            <ChevronRight size={16} className="text-gray-400 ml-auto" />
          </button>
          <a href="https://www.iubenda.com/privacy-policy/40178798" target="_blank" rel="noopener noreferrer" className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors">
            <Shield size={18} className="text-bolly-500" />
            <span className="text-sm text-gray-700">Privacy Policy</span>
            <ExternalLink size={14} className="text-gray-400 ml-auto" />
          </a>
          <a href="https://www.iubenda.com/privacy-policy/40178798/cookie-policy" target="_blank" rel="noopener noreferrer" className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors">
            <FileText size={18} className="text-bolly-500" />
            <span className="text-sm text-gray-700">Cookie Policy</span>
            <ExternalLink size={14} className="text-gray-400 ml-auto" />
          </a>
          <a href="https://www.iubenda.com/privacy-policy/40178798/cookie-policy" target="_blank" rel="noopener noreferrer" className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors">
            <Shield size={18} className="text-bolly-500" />
            <span className="text-sm text-gray-700">Preferenze cookie</span>
            <ExternalLink size={14} className="text-gray-400 ml-auto" />
          </a>
          <a href="mailto:support@getbolly.app" className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors">
            <MessageCircle size={18} className="text-bolly-500" />
            <span className="text-sm text-gray-700">Contattaci</span>
            <ExternalLink size={14} className="text-gray-400 ml-auto" />
          </a>
        </div>
      </Card>

      {/* Logout */}
      <button
        onClick={onLogout}
        className="w-full py-3 bg-red-50 text-red-600 font-semibold rounded-xl border border-red-100 flex items-center justify-center gap-2 hover:bg-red-100 transition-colors"
      >
        <LogOut size={18} />
        Esci dall'account
      </button>
      <div className="h-4" />
    </div>
  )
}

// ============================================================
// TERMINI E CONDIZIONI
// ============================================================

function TerminiCondizioni({ onBack }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <button onClick={onBack} className="p-2 rounded-xl hover:bg-gray-100">
          <ChevronLeft size={22} className="text-gray-700" />
        </button>
        <h1 className="text-xl font-bold text-gray-900">Termini e Condizioni</h1>
      </div>

      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-5 text-sm text-gray-700 leading-relaxed">
        <p className="text-xs text-gray-400">Ultimo aggiornamento: 29 aprile 2026</p>

        <div>
          <h3 className="font-semibold text-gray-900 mb-2">Descrizione del servizio</h3>
          <p>Bolly è un servizio di gestione personale dei contratti ricorrenti e delle bollette. Permette agli utenti di aggregare in un unico luogo i propri contratti (utenze domestiche, abbonamenti, assicurazioni, finanziamenti, bollettini PA, tasse), ricevere e archiviare le bollette, e visualizzare le scadenze imminenti.</p>
          <p className="mt-2">Bolly NON è un comparatore di offerte, NON effettua pagamenti per conto dell'utente e NON ha accesso ai conti correnti o strumenti di pagamento dell'utente.</p>
        </div>

        <div>
          <h3 className="font-semibold text-gray-900 mb-2">Piano Free</h3>
          <p>Il servizio è attualmente offerto in versione gratuita con le seguenti limitazioni: massimo 3 contratti attivi contemporaneamente, 1 solo intestatario per account, storico bollette limitato a 12 mesi.</p>
          <p className="mt-2">Il Titolare si riserva il diritto di introdurre piani a pagamento con funzionalità aggiuntive. In tal caso, le funzionalità del piano gratuito potranno essere modificate con preavviso di almeno 30 giorni.</p>
        </div>

        <div>
          <h3 className="font-semibold text-gray-900 mb-2">Analisi automatizzata delle bollette</h3>
          <p>Bolly utilizza sistemi di intelligenza artificiale (Claude, fornito da Anthropic) per estrarre automaticamente i dati dalle bollette caricate o inoltrate dall'utente (importo, scadenza, fornitore, categoria).</p>
          <p className="mt-2">L'utente riconosce e accetta che: l'estrazione automatica potrebbe contenere errori o imprecisioni; l'utente è responsabile della verifica dei dati estratti prima di fare affidamento su di essi; Bolly mette a disposizione strumenti per la correzione manuale dei dati estratti erroneamente; il Titolare non è responsabile per eventuali danni derivanti da errori nell'estrazione automatica dei dati.</p>
        </div>

        <div>
          <h3 className="font-semibold text-gray-900 mb-2">Notifiche di scadenza</h3>
          <p>Bolly fornisce promemoria sulle scadenze delle bollette a scopo puramente informativo. Il Titolare NON garantisce la tempestività o la ricezione delle notifiche, la correttezza delle date di scadenza, né l'assenza di malfunzionamenti tecnici che possano impedire l'invio delle notifiche.</p>
          <p className="mt-2">L'utente rimane l'unico responsabile del pagamento delle proprie bollette nei termini previsti. Bolly non si assume alcuna responsabilità per ritardi nei pagamenti, more, interessi o altri danni derivanti dal mancato o ritardato invio di notifiche.</p>
        </div>

        <div>
          <h3 className="font-semibold text-gray-900 mb-2">Indirizzo email dedicato</h3>
          <p>Al momento della registrazione, Bolly assegna all'utente un indirizzo email dedicato (es. nome.xxxx@mail.getbolly.app) per la ricezione automatica delle bollette.</p>
          <p className="mt-2">L'utente si impegna a utilizzare l'indirizzo dedicato esclusivamente per l'inoltro di bollette e fatture personali, a non divulgare l'indirizzo a terzi non autorizzati e a non utilizzare il servizio per ricevere contenuti illegali o non pertinenti. Il Titolare si riserva il diritto di disattivare l'indirizzo dedicato in caso di utilizzo improprio.</p>
        </div>

        <div>
          <h3 className="font-semibold text-gray-900 mb-2">Contenuti caricati</h3>
          <p>L'utente è l'unico responsabile dei contenuti (PDF, dati, informazioni) caricati o inoltrati al servizio. L'utente garantisce di avere il diritto di caricare tali contenuti e che questi non violano diritti di terzi.</p>
          <p className="mt-2">Bolly non accede ai contenuti delle bollette per finalità diverse dall'erogazione del servizio e non condivide i dati degli utenti con terze parti per finalità commerciali.</p>
        </div>

        <div>
          <h3 className="font-semibold text-gray-900 mb-2">Cancellazione account</h3>
          <p>L'utente può cancellare il proprio account in qualsiasi momento. La cancellazione comporta l'eliminazione di tutti i contratti e bollette salvati, l'eliminazione di tutti i file PDF archiviati, la disattivazione dell'indirizzo email dedicato e l'eliminazione completa dei dati personali entro 30 giorni. La cancellazione è irreversibile.</p>
        </div>

        <div>
          <h3 className="font-semibold text-gray-900 mb-2">Limitazione di responsabilità</h3>
          <p>Il servizio è fornito "così com'è" (as is). Il Titolare non garantisce che il servizio sia privo di errori, interruzioni o malfunzionamenti. Il Titolare non è responsabile per perdita di dati dovuta a cause tecniche, indisponibilità temporanea del servizio o danni indiretti derivanti dall'utilizzo del servizio.</p>
          <p className="mt-2">La responsabilità massima del Titolare è in ogni caso limitata all'importo eventualmente pagato dall'utente per il servizio nei 12 mesi precedenti l'evento dannoso.</p>
        </div>

        <div>
          <h3 className="font-semibold text-gray-900 mb-2">Modifiche ai termini</h3>
          <p>Il Titolare si riserva il diritto di modificare i presenti Termini e Condizioni in qualsiasi momento. Le modifiche saranno comunicate all'utente con almeno 15 giorni di preavviso tramite l'applicazione. L'utilizzo continuato del servizio dopo la comunicazione delle modifiche costituisce accettazione delle stesse.</p>
        </div>

        <div>
          <h3 className="font-semibold text-gray-900 mb-2">Legge applicabile e foro competente</h3>
          <p>I presenti Termini sono regolati dalla legge italiana. Per qualsiasi controversia sarà competente il Foro di Reggio Emilia.</p>
        </div>

        <div className="pt-3 border-t border-gray-100">
          <p className="text-xs text-gray-500">Per domande o chiarimenti: <a href="mailto:support@getbolly.app" className="text-bolly-500 underline">support@getbolly.app</a></p>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// BOLLETTE ORFANE
// ============================================================

function OrfanaCard({ bolletta, contratti, onUpdate, onDelete }) {
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [form, setForm] = useState({
    contratto_id: bolletta.contratto_id || '',
    importo: bolletta.importo || '',
    scadenza: bolletta.scadenza || '',
    descrizione_libera: bolletta.descrizione_libera || '',
  })
  const update = (f, v) => setForm(p => ({ ...p, [f]: v }))

  const handleSave = async () => {
    setSaving(true)
    try {
      await onUpdate(bolletta.id, {
        contratto_id: form.contratto_id ? Number(form.contratto_id) : null,
        importo: form.importo ? parseFloat(form.importo) : null,
        scadenza: form.scadenza || null,
        descrizione_libera: form.descrizione_libera || null,
        stato_elaborazione: 'ok',
      })
    } catch (e) { console.error(e) }
    setSaving(false)
  }

  const canSave = form.contratto_id && form.importo && form.scadenza
  const hasExtractedData = !!(bolletta.importo || bolletta.scadenza || bolletta.descrizione_libera || bolletta.contratto_id)
  const motivoLabel = bolletta.stato_elaborazione === 'errore_parsing' && hasExtractedData
    ? 'Dati incompleti — controlla e completa'
    : ({
        errore_parsing: 'PDF non letto correttamente',
        orfana: 'Nessun contratto collegato',
        incompleta: 'Dati incompleti',
      }[bolletta.stato_elaborazione] || 'Da sistemare')

  return (
    <Card className="p-4 border-amber-200">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <AlertTriangle size={18} className="text-amber-500 flex-shrink-0" />
          <span className="text-sm font-medium text-amber-700">{motivoLabel}</span>
        </div>
        {confirmDelete ? (
          <div className="flex items-center gap-1">
            <button onClick={() => setConfirmDelete(false)} className="text-xs px-2 py-1 rounded-lg text-gray-500">Annulla</button>
            <button onClick={() => { onDelete(bolletta.id); setConfirmDelete(false) }} className="text-xs px-2 py-1 rounded-lg bg-red-100 text-red-600 font-medium">Elimina</button>
          </div>
        ) : (
          <button onClick={() => setConfirmDelete(true)} className="p-1.5 rounded-lg text-gray-300 hover:bg-red-50 hover:text-red-500" title="Elimina bolletta">
            <Trash2 size={16} />
          </button>
        )}
      </div>

      {bolletta.pdf_url && (
        <a href={bolletta.pdf_url} target="_blank" rel="noopener noreferrer" className="block mb-3">
          <div className="flex items-center gap-2 text-sm text-bolly-600 bg-bolly-50 rounded-xl px-3 py-2 border border-bolly-100 hover:bg-bolly-100">
            <ExternalLink size={16} />
            <span className="font-medium">Apri PDF ricevuto</span>
          </div>
        </a>
      )}

      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Contratto</label>
          <select value={form.contratto_id} onChange={e => update('contratto_id', e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm focus:ring-2 focus:ring-bolly-500 focus:border-transparent outline-none">
            <option value="">-- Seleziona contratto --</option>
            {contratti.map(c => (
              <option key={c.id} value={c.id}>{c.fornitore} ({getCategoria(c.categoria).label})</option>
            ))}
          </select>
          {contratti.length === 0 && (
            <p className="text-xs text-gray-400 mt-1">Crea prima un contratto dalla sezione Aggiungi.</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Importo (€)</label>
            <input type="number" step="0.01" value={form.importo} onChange={e => update('importo', e.target.value)} placeholder="0.00"
              className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-bolly-500 focus:border-transparent outline-none" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Scadenza</label>
            <input type="date" value={form.scadenza} onChange={e => update('scadenza', e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm bg-white focus:ring-2 focus:ring-bolly-500 focus:border-transparent outline-none"
              style={{ WebkitAppearance: 'none', colorScheme: 'light' }} />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Descrizione (opzionale)</label>
          <input type="text" value={form.descrizione_libera} onChange={e => update('descrizione_libera', e.target.value)}
            placeholder="Es. Bolletta luce febbraio"
            className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-bolly-500 focus:border-transparent outline-none" />
        </div>

        <button onClick={handleSave} disabled={saving || !canSave}
          className="w-full py-2.5 bg-bolly-500 text-white text-sm font-semibold rounded-xl disabled:opacity-40">
          {saving ? 'Salvataggio...' : 'Salva e collega'}
        </button>
      </div>
    </Card>
  )
}

function BolletteOrfane({ bollette, contratti, onBack, onUpdateBolletta, onDeleteBolletta }) {
  const orfane = useMemo(() =>
    bollette
      .filter(b => ['errore_parsing', 'orfana', 'incompleta'].includes(b.stato_elaborazione))
      .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
  , [bollette])

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-2 -ml-2 rounded-xl hover:bg-gray-100">
          <ChevronLeft size={22} className="text-gray-600" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Bollette da sistemare</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {orfane.length === 0 ? 'Tutto a posto' : `${orfane.length} da completare`}
          </p>
        </div>
      </div>

      {orfane.length === 0 ? (
        <Card className="p-8 text-center">
          <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <Check size={28} className="text-green-600" />
          </div>
          <p className="font-semibold text-gray-900">Tutto a posto!</p>
          <p className="text-sm text-gray-500 mt-1">Nessuna bolletta da sistemare al momento.</p>
        </Card>
      ) : (
        <>
          <Card className="p-3 bg-bolly-50 border-bolly-100">
            <p className="text-xs text-bolly-700 leading-relaxed">
              Queste bollette sono arrivate via email ma non sono state lette correttamente. Completa i dati mancanti per archiviarle, oppure eliminale se non sono bollette vere (es. spam, ricevute non pertinenti).
            </p>
          </Card>
          <div className="space-y-3">
            {orfane.map(b => (
              <OrfanaCard key={b.id} bolletta={b} contratti={contratti} onUpdate={onUpdateBolletta} onDelete={onDeleteBolletta} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export default function App() {
  const [session, setSession] = useState(null)
  const [isRecovery, setIsRecovery] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showAuth, setShowAuth] = useState(false)
  const [profile, setProfile] = useState(null)
  const [contratti, setContratti] = useState([])
  const [bollette, setBollette] = useState([])
  const [spese, setSpese] = useState([])
  const [abitazioni, setAbitazioni] = useState([])
  const [amiciCount, setAmiciCount] = useState(0)
  const [richiesteCount, setRichiesteCount] = useState(0)
  const [splits, setSplits] = useState([])
  const [splitsRicevuti, setSplitsRicevuti] = useState([])
  const [dbNotifiche, setDbNotifiche] = useState([])
  const [splitTarget, setSplitTarget] = useState(null) // { tipo: 'spesa'|'bolletta', id, importo, descrizione }
  const [selectedSplitId, setSelectedSplitId] = useState(null)
  const [filtroAbitazione, setFiltroAbitazione] = useState(null) // null = tutte
  const [screen, setScreen] = useState('dashboard')
  const [selectedContrattoId, setSelectedContrattoId] = useState(null)
  const [editingContratto, setEditingContratto] = useState(null)
  const [spesaDataPrecompilata, setSpesaDataPrecompilata] = useState(null)
  const [editingSpesa, setEditingSpesa] = useState(null)
  const [lastSeenNotificheCount, setLastSeenNotificheCount] = useState(() => {
    const saved = localStorage.getItem('bolly_seen_notifiche_count')
    return saved ? parseInt(saved, 10) : 0
  })
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [lastSeenInboxTime, setLastSeenInboxTime] = useState(() => {
    const saved = localStorage.getItem('bolly_seen_inbox_time')
    return saved || new Date().toISOString()
  })
  const scrollRef = useRef(null)
  const [sharedPdfStatus, setSharedPdfStatus] = useState(null) // null, 'uploading', 'processing', 'success', 'error'
  const [sharedPdfError, setSharedPdfError] = useState(null)

  useEffect(() => {
    requestAnimationFrame(() => scrollRef.current?.scrollTo(0, 0))
    if (screen) trackScreen(screen)
  }, [screen])

  // Web Share Target: gestisce PDF condiviso da altre app
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (!params.has('shared') || !session?.user?.id) return
    // Pulisci URL
    window.history.replaceState({}, '', '/')

    const handleSharedPdf = async () => {
      try {
        const cache = await caches.open('bolly-shared-files')
        const response = await cache.match('/shared-pdf')
        if (!response) return
        const blob = await response.blob()
        const filename = response.headers.get('X-Filename') || 'condiviso.pdf'
        await cache.delete('/shared-pdf')

        setScreen('dashboard')
        setSharedPdfStatus('uploading')

        const userId = session.user.id
        const timestamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 15)
        const filePath = `${userId}/${timestamp}.pdf`

        const { error: storageError } = await supabase.storage
          .from('bollette-pdf')
          .upload(filePath, blob, { contentType: 'application/pdf' })
        if (storageError) throw new Error('Errore nel caricamento: ' + storageError.message)

        const pdfUrl = `https://iimzetvymamadclfblgy.supabase.co/storage/v1/object/public/bollette-pdf/${filePath}`

        setSharedPdfStatus('processing')
        const webhookRes = await fetch('https://hook.eu1.make.com/5n4w2qn99uf830yktlyjw8o17ogcd1xt', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: userId, pdf_url: pdfUrl })
        })
        if (!webhookRes.ok) throw new Error('Errore nell\'elaborazione')

        setSharedPdfStatus('success')
        track('pdf_condiviso', { fonte: 'web_share_target' })
        setTimeout(async () => { setSharedPdfStatus(null); await loadData() }, 4000)
      } catch (e) {
        console.error('Shared PDF error:', e)
        setSharedPdfStatus('error')
        setSharedPdfError(e.message)
        setTimeout(() => { setSharedPdfStatus(null); setSharedPdfError(null) }, 5000)
      }
    }
    handleSharedPdf()
  }, [session])

  // Se supabase non è configurato, mostra errore
  if (!supabase) {
    return (
      <div className="min-h-screen bg-[#f0f7f6] flex flex-col items-center justify-center px-6">
        <div className="bg-white rounded-2xl shadow-sm border border-red-200 p-6 max-w-sm text-center">
          <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="text-red-600" size={32} />
          </div>
          <h2 className="text-lg font-bold text-gray-900 mb-2">Configurazione mancante</h2>
          <p className="text-sm text-gray-600">Le variabili d'ambiente di Supabase non sono configurate. Controlla VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY nelle impostazioni di Vercel.</p>
        </div>
      </div>
    )
  }

  // Auth listener
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session)
      if (event === 'PASSWORD_RECOVERY') {
        setIsRecovery(true)
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  // Load data quando utente loggato
  const loadData = useCallback(async () => {
    if (!session) return
    try {
      const { data: prof } = await supabase.from('profiles').select('*').eq('id', session.user.id).single()
      setProfile(prof)
      // Analytics: identifica utente
      identifyUser(session.user.id, {
        email: session.user.email,
        nome: prof?.nome || '',
        piano: prof?.piano || 'free',
        onboarding_done: prof?.onboarding_done || false
      })
      const [c, b, s, ab, amici, richieste, esterni, sp, spRicevuti, notifDb] = await Promise.all([
        getContratti(), getBollette(), getSpese(), getAbitazioni(),
        getAmici().catch(() => []),
        getRichiesteRicevute().catch(() => []),
        getContattiEsterni().catch(() => []),
        getSplitsByUser().catch(() => []),
        getSplitsRicevuti().catch(() => []),
        getNotifiche().catch(() => [])
      ])
      setContratti(c)
      setBollette(b)
      setSpese(s)
      setAbitazioni(ab)
      setAmiciCount(amici.length + esterni.length)
      setRichiesteCount(richieste.length)
      setSplits(sp)
      setSplitsRicevuti(spRicevuti)
      setDbNotifiche(notifDb)
    } catch (e) { console.error('Errore caricamento dati:', e) }
  }, [session])

  useEffect(() => { loadData() }, [loadData])

  // Registra il Service Worker per le push notifications
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(err => console.error('SW registration failed:', err))
    }
  }, [])

  // Reset badge icona PWA quando l'app viene aperta o torna visibile
  useEffect(() => {
    const resetBadge = () => {
      if (document.visibilityState === 'visible' && navigator.clearAppBadge) {
        navigator.clearAppBadge().catch(() => {})
      }
    }
    // Reset immediato al caricamento
    if (navigator.clearAppBadge) navigator.clearAppBadge().catch(() => {})
    document.addEventListener('visibilitychange', resetBadge)
    return () => document.removeEventListener('visibilitychange', resetBadge)
  }, [])

  // Mostra onboarding al primo accesso
  useEffect(() => {
    if (session && profile && !profile.onboarding_done) {
      setShowOnboarding(true)
    }
  }, [session, profile])

  // Badge Notifiche e Inbox: conteggi attuali
  const nonLetteDb = dbNotifiche.filter(n => !n.letta).length
  const scadenzeCount = bollette.filter(b => !b.pagata && b.scadenza && b.stato_elaborazione === 'ok' && giorniDa(b.scadenza) <= 7).length
  const currentNotificheCount = scadenzeCount + nonLetteDb
  // Inbox badge: mostra pallino solo se ci sono bollette arrivate DOPO l'ultima apertura di Inbox
  const nuoveBolletteInbox = bollette.filter(b => b.fonte !== 'manuale' && b.created_at && new Date(b.created_at) > new Date(lastSeenInboxTime)).length

  if (loading) return <SplashScreen />
  if (isRecovery) return <ResetPassword onDone={() => setIsRecovery(false)} />
  if (!session && showAuth) return <Auth onBack={() => setShowAuth(false)} />
  if (!session) return <LandingPage onGoToAuth={() => setShowAuth(true)} />
  if (showOnboarding) return (
    <Onboarding
      emailDedicata={profile?.email_dedicata}
      userId={session.user.id}
      onComplete={async () => {
        await supabase.from('profiles').update({ onboarding_done: true }).eq('id', session.user.id)
        track('onboarding_completato')
        setShowOnboarding(false)
        await loadData()
      }}
      onCreateContratto={async (form) => {
        const result = await createContratto(form)
        return result
      }}
      onCreateBolletta={async (form) => {
        await createBolletta(form)
      }}
    />
  )

  const handleLogout = async () => {
    resetAnalytics()
    await supabase.auth.signOut()
    setContratti([])
    setBollette([])
    setProfile(null)
  }

  const handleSelectContratto = (id) => { setSelectedContrattoId(id); setScreen('dettaglio') }

  const handleSaveContratto = async (form) => {
    await createContratto(form)
    track('contratto_creato', { categoria: form.categoria, fornitore: form.fornitore })
    await loadData()
    setScreen('dashboard')
  }

  const handleSaveBolletta = async (form) => {
    // Se manuale libero senza contratto, crea contratto "altro" al volo
    if (!form.contratto_id && form.descrizione_libera) {
      const nuovoContratto = await createContratto({
        categoria: 'altro', fornitore: form.descrizione_libera, intestatario: profile?.nome || '',
        metodo_ricezione: 'email', domiciliazione: false, note: 'Creato da inserimento manuale',
      })
      form.contratto_id = nuovoContratto.id
    }
    // Rimuovi campi che non esistono nella tabella bollette
    const bollettaData = { ...form }
    delete bollettaData.descrizione_libera
    await createBolletta(bollettaData)
    track('bolletta_creata', { fonte: 'manuale' })
    await loadData()
    setScreen(selectedContrattoId ? 'dettaglio' : 'dashboard')
  }

  const handleDeleteContratto = async (id) => {
    await deleteContratto(id)
    await loadData()
    setScreen('dashboard')
  }

  const handleEditContratto = (contratto) => {
    setEditingContratto(contratto)
    setScreen('modifica-contratto')
  }

  const handleUpdateContratto = async (form) => {
    await updateContratto(editingContratto.id, form)
    await loadData()
    setSelectedContrattoId(editingContratto.id)
    setEditingContratto(null)
    setScreen('dettaglio')
  }

  const handleDeleteBolletta = async (id) => {
    await deleteBolletta(id)
    await loadData()
  }

  const handleUpdateBolletta = async (id, updates) => {
    const { error } = await supabase.from('bollette').update(updates).eq('id', id)
    if (error) { console.error('Errore update bolletta:', error); throw error }
    await loadData()
  }

  const handleTogglePagata = async (id) => {
    await togglePagata(id, true)
    await loadData()
  }

  const handleSaveSpesa = async (spesa) => {
    const result = await createSpesa(spesa)
    track('spesa_creata', { categoria: spesa.categoria, importo: spesa.importo })
    await loadData()
    return result
  }

  const handleUpdateSpesa = async (id, updates) => {
    await updateSpesa(id, updates)
    await loadData()
  }

  const handleDeleteSpesa = async (id) => {
    await deleteSpesa(id)
    await loadData()
  }

  const handleEditSpesa = (spesa) => {
    setEditingSpesa(spesa)
    setScreen('modifica-spesa')
  }

  const notificheCount = nonLetteDb
  const showBadgeNotifiche = nonLetteDb > 0
  const showBadgeInbox = nuoveBolletteInbox > 0

  const renderScreen = () => {
    switch (screen) {
      case 'dashboard': return <Dashboard contratti={contratti} bollette={bollette} spese={spese} onSelectContratto={handleSelectContratto} onNavigate={setScreen} profile={profile} onLogout={handleLogout} onDeleteContratto={handleDeleteContratto} onEditContratto={handleEditContratto} onDeleteSpesa={handleDeleteSpesa} onEditSpesa={handleEditSpesa} abitazioni={abitazioni} filtroAbitazione={filtroAbitazione} onSetFiltroAbitazione={setFiltroAbitazione} splits={splits} onSplit={(target) => { setSplitTarget(target); setScreen('form-split') }} onViewSplit={(splitId) => { setSelectedSplitId(splitId); setScreen('dettaglio-split') }} richiesteCount={richiesteCount} splitsRicevuti={splitsRicevuti} />
      case 'dettaglio': {
        const c = contratti.find(x => x.id === selectedContrattoId)
        if (!c) { setScreen('dashboard'); return null }
        return <DettaglioContratto contratto={c} bollette={bollette.filter(b => b.contratto_id === c.id)} onBack={() => setScreen('dashboard')} onAggiungiBolletta={() => setScreen('aggiungi-bolletta')} onTogglePagata={handleTogglePagata} onDeleteContratto={handleDeleteContratto} onEditContratto={handleEditContratto} onDeleteBolletta={handleDeleteBolletta} abitazioni={abitazioni} splits={splits} onSplit={(target) => { setSplitTarget(target); setScreen('form-split') }} onViewSplit={(splitId) => { setSelectedSplitId(splitId); setScreen('dettaglio-split') }} />
      }
      case 'aggiungi':
        return (
          <div className="space-y-6">
            <h1 className="text-xl font-bold text-gray-900">Cosa vuoi aggiungere?</h1>
            <Card className="p-5" onClick={() => setScreen('aggiungi-contratto')}>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-bolly-100 rounded-xl flex items-center justify-center"><Repeat size={24} className="text-bolly-500" /></div>
                <div><p className="font-semibold text-gray-900">Nuovo contratto</p><p className="text-sm text-gray-500 mt-0.5">Luce, gas, telefono, internet, assicurazione...</p></div>
                <ChevronRight size={20} className="text-gray-400 ml-auto" />
              </div>
            </Card>
            <Card className="p-5" onClick={() => { setSelectedContrattoId(null); setScreen('aggiungi-bolletta') }}>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center"><CreditCard size={24} className="text-green-600" /></div>
                <div><p className="font-semibold text-gray-900">Nuova bolletta / pagamento</p><p className="text-sm text-gray-500 mt-0.5">Aggiungi un importo a un contratto esistente</p></div>
                <ChevronRight size={20} className="text-gray-400 ml-auto" />
              </div>
            </Card>
            <Card className="p-5" onClick={() => setScreen('aggiungi-spesa')}>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center"><Wallet size={24} className="text-purple-600" /></div>
                <div><p className="font-semibold text-gray-900">Registra spesa</p><p className="text-sm text-gray-500 mt-0.5">Spese quotidiane: cibo, trasporti, svago...</p></div>
                <ChevronRight size={20} className="text-gray-400 ml-auto" />
              </div>
            </Card>
            <Card className="p-5" onClick={() => setScreen('aggiungi-entrata')}>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center"><Banknote size={24} className="text-green-600" /></div>
                <div><p className="font-semibold text-gray-900">Registra entrata</p><p className="text-sm text-gray-500 mt-0.5">Stipendio, affitto, rimborsi, pensione...</p></div>
                <ChevronRight size={20} className="text-gray-400 ml-auto" />
              </div>
            </Card>
          </div>
        )
      case 'aggiungi-contratto': return <FormContratto onSave={handleSaveContratto} onBack={() => setScreen('aggiungi')} session={session} onRefresh={loadData} onGoHome={() => setScreen('dashboard')} abitazioni={abitazioni} />
      case 'modifica-contratto': return editingContratto ? <FormModificaContratto contratto={editingContratto} onSave={handleUpdateContratto} onBack={() => { setEditingContratto(null); setScreen('dettaglio') }} abitazioni={abitazioni} /> : null
      case 'aggiungi-bolletta': return <FormBolletta contratti={contratti} contrattoId={selectedContrattoId} onSave={handleSaveBolletta} onBack={() => selectedContrattoId ? setScreen('dettaglio') : setScreen('aggiungi')} session={session} onRefresh={loadData} onGoHome={() => setScreen('dashboard')} />
      case 'aggiungi-spesa': return <FormSpesa onSave={handleSaveSpesa} onBack={async () => { setSpesaDataPrecompilata(null); await loadData(); setScreen('dashboard') }} dataPrecompilata={spesaDataPrecompilata} />
      case 'aggiungi-entrata': return <FormEntrata onSave={handleSaveSpesa} onBack={() => setScreen('dashboard')} />
      case 'modifica-spesa': return editingSpesa ? <FormModificaSpesa spesa={editingSpesa} onSave={handleUpdateSpesa} onBack={() => { setEditingSpesa(null); setScreen('dashboard') }} /> : null
      case 'spese-lista': return <ListaSpese spese={spese} onBack={() => setScreen('dashboard')} onDelete={handleDeleteSpesa} />
      case 'calendario': return <Calendario bollette={bollette} contratti={contratti} spese={spese} onSelectContratto={handleSelectContratto} onAggiungiSpesa={(data) => { setScreen('aggiungi-spesa'); setSpesaDataPrecompilata(data) }} />
      case 'bollette': return <StoricoBollette bollette={bollette} contratti={contratti} onSelectContratto={handleSelectContratto} />
      case 'notifiche': return <Notifiche contratti={contratti} bollette={bollette} dbNotifiche={dbNotifiche} onNotificheLette={(updated) => setDbNotifiche(updated)} />
      case 'form-split': return splitTarget ? <FormSplit target={splitTarget} profile={profile} onBack={() => { setSplitTarget(null); setScreen('dashboard') }} onSave={async () => { setSplitTarget(null); await loadData(); setScreen('dashboard') }} /> : null
      case 'dettaglio-split': {
        const sp = splits.find(s => s.id === selectedSplitId)
        if (!sp) { setScreen('dashboard'); return null }
        return <DettaglioSplit split={sp} onBack={() => { setSelectedSplitId(null); setScreen('dashboard') }} onRefresh={loadData} />
      }
      case 'splits-ricevuti': return <SplitsRicevutiScreen splitsRicevuti={splitsRicevuti} onBack={() => setScreen('dashboard')} onRefresh={loadData} profile={profile} />
      case 'amici': return <SchermataAmici onBack={() => setScreen('menu')} session={session} profile={profile} splits={splits} splitsRicevuti={splitsRicevuti} />
      case 'menu': return <MenuPanel profile={profile} session={session} onBack={() => setScreen('dashboard')} onLogout={handleLogout} onNavigate={setScreen} onUpdateProfile={setProfile} abitazioni={abitazioni} onRefreshAbitazioni={async () => { const ab = await getAbitazioni(); setAbitazioni(ab) }} amiciCount={amiciCount} richiesteCount={richiesteCount} />
      case 'termini': return <TerminiCondizioni onBack={() => setScreen('menu')} />
      case 'bollette-orfane': return <BolletteOrfane bollette={bollette} contratti={contratti} onBack={() => setScreen('dashboard')} onUpdateBolletta={handleUpdateBolletta} onDeleteBolletta={handleDeleteBolletta} />
      default: return null
    }
  }

  return (
    <div className="min-h-screen bg-[#f0f7f6] flex flex-col" style={{ maxWidth: 430, margin: '0 auto', backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='220' height='260' viewBox='0 0 220 260'%3E%3Cg fill='none' stroke='%23b8d5cf' stroke-width='1' stroke-linecap='round' stroke-linejoin='round'%3E%3Cg transform='translate(15,12) rotate(15,5,7)'%3E%3Cpolyline points='7,0 3,7 7,7 4,15'/%3E%3C/g%3E%3Cg transform='translate(55,5) rotate(-20,6,6)'%3E%3Crect x='0' y='1' width='13' height='10' rx='1.5'/%3E%3Cpolyline points='0,1 6.5,7 13,1'/%3E%3C/g%3E%3Cg transform='translate(110,18) rotate(25,5,8)'%3E%3Cpath d='M5 1 C5 1 0 7 0 10 C0 13 2.5 15 5 15 C7.5 15 10 13 10 10 C10 7 5 1 5 1 Z'/%3E%3C/g%3E%3Cg transform='translate(165,8) rotate(-10,6,7)'%3E%3Ccircle cx='6' cy='7' r='6.5'/%3E%3Cline x1='6' y1='7' x2='6' y2='3'/%3E%3Cline x1='6' y1='7' x2='9' y2='9'/%3E%3C/g%3E%3Cg transform='translate(200,50) rotate(30,5,7)'%3E%3Cpath d='M5 0 L0 2.5 L0 7 C0 10.5 5 13 5 13 C5 13 10 10.5 10 7 L10 2.5 Z'/%3E%3Cpolyline points='3,7 4.5,9 7,5'/%3E%3C/g%3E%3Cg transform='translate(30,52) rotate(-15,5,7)'%3E%3Cpath d='M0 7 L5 2 L10 7'/%3E%3Crect x='1.5' y='7' width='7' height='6' rx='0.5'/%3E%3Crect x='3.5' y='9' width='3' height='4'/%3E%3C/g%3E%3Cg transform='translate(82,42) rotate(40,6,7)'%3E%3Cpath d='M11 2 C9 0 6 0 4 2 C2 4 2 8 4 10 C6 12 9 12 11 10'/%3E%3Cline x1='1' y1='5' x2='8' y2='5'/%3E%3Cline x1='1' y1='8' x2='8' y2='8'/%3E%3C/g%3E%3Cg transform='translate(140,45) rotate(-35,5,7)'%3E%3Cpath d='M2 10 C2 10 1 6 1 4 C1 1.5 3 0 5 0 C7 0 9 1.5 9 4 C9 6 8 10 8 10'/%3E%3Cline x1='1.5' y1='10' x2='8.5' y2='10'/%3E%3Cpath d='M4 11 C4 12 4.5 13 5 13 C5.5 13 6 12 6 11'/%3E%3C/g%3E%3Cg transform='translate(8,100) rotate(10,5,7)'%3E%3Cpath d='M5 14 C1.5 11 0.5 8 2.5 4 C3.5 2 5 1 5 0 C5 1 7 2 7.5 4 C9.5 8 8.5 11 5 14 Z'/%3E%3Cpath d='M5 14 C3.5 12 3 10 4.5 8 C5 7.5 5.5 8 5.5 8 C6.5 10 6.5 12 5 14 Z'/%3E%3C/g%3E%3Cg transform='translate(55,95) rotate(-25,7,5)'%3E%3Crect x='0' y='0' width='14' height='10' rx='1.5'/%3E%3Cline x1='0' y1='3.5' x2='14' y2='3.5'/%3E%3Crect x='2' y='6' width='4' height='2' rx='0.5' fill='%23b8d5cf'/%3E%3C/g%3E%3Cg transform='translate(115,88) rotate(20,6,7)'%3E%3Crect x='0' y='2' width='12' height='11' rx='1.5'/%3E%3Cline x1='0' y1='5.5' x2='12' y2='5.5'/%3E%3Cline x1='3' y1='0' x2='3' y2='3.5'/%3E%3Cline x1='9' y1='0' x2='9' y2='3.5'/%3E%3Ccircle cx='4' cy='9' r='0.8' fill='%23b8d5cf'/%3E%3Ccircle cx='8' cy='9' r='0.8' fill='%23b8d5cf'/%3E%3C/g%3E%3Cg transform='translate(170,90) rotate(-40,5,8)'%3E%3Crect x='0.5' y='0' width='9' height='15' rx='2'/%3E%3Cline x1='3.5' y1='12' x2='6.5' y2='12'/%3E%3C/g%3E%3Cg transform='translate(25,150) rotate(5,6,6)'%3E%3Cpath d='M0 4 C3 0 9 0 12 4'/%3E%3Cpath d='M2 6.5 C4 3.5 8 3.5 10 6.5'/%3E%3Cpath d='M4 9 C5 7.5 7 7.5 8 9'/%3E%3Ccircle cx='6' cy='11' r='1' fill='%23b8d5cf'/%3E%3C/g%3E%3Cg transform='translate(75,148) rotate(-30,5,7)'%3E%3Crect x='0' y='0' width='11' height='14' rx='1.5'/%3E%3Cpolyline points='2,3.5 3.5,5.5 6,2.5'/%3E%3Cline x1='7' y1='4' x2='9' y2='4'/%3E%3Cpolyline points='2,8 3.5,10 6,7'/%3E%3Cline x1='7' y1='9' x2='9' y2='9'/%3E%3C/g%3E%3Cg transform='translate(130,145) rotate(35,5,6)'%3E%3Cpath d='M1 5 C1 2.5 3 0.5 5.5 0.5 L8 0.5'/%3E%3Cpolyline points='7,0 9,1.5 7,3'/%3E%3Cpath d='M10 5.5 C10 8 8 10 5.5 10 L3 10'/%3E%3Cpolyline points='4,9 2,10.5 4,12'/%3E%3C/g%3E%3Cg transform='translate(180,142) rotate(-8,6,7)'%3E%3Ccircle cx='4.5' cy='5.5' r='4.5'/%3E%3Ccircle cx='7.5' cy='8.5' r='4.5'/%3E%3Cline x1='7' y1='7' x2='7' y2='10.5'/%3E%3Cline x1='5.5' y1='8.5' x2='8.5' y2='8.5'/%3E%3C/g%3E%3Cg transform='translate(45,198) rotate(22,5,7)'%3E%3Cellipse cx='5' cy='8' rx='5' ry='4.5'/%3E%3Crect x='3' y='2.5' width='4' height='2' rx='0.5'/%3E%3Cline x1='8' y1='11' x2='9' y2='14'/%3E%3Cline x1='2' y1='11' x2='1' y2='14'/%3E%3C/g%3E%3Cg transform='translate(105,200) rotate(-18,5,8)'%3E%3Crect x='0' y='1' width='11' height='14' rx='1.5'/%3E%3Cline x1='3' y1='5' x2='8' y2='5'/%3E%3Cline x1='3' y1='8' x2='8' y2='8'/%3E%3Cline x1='3' y1='11' x2='6' y2='11'/%3E%3C/g%3E%3Cg transform='translate(160,200) rotate(12,5,7)'%3E%3Crect x='1' y='6' width='9' height='7' rx='1'/%3E%3Cpath d='M3 6 L3 3.5 C3 1.5 4 0 5.5 0 C7 0 8 1.5 8 3.5 L8 6'/%3E%3Ccircle cx='5.5' cy='9.5' r='1' fill='%23b8d5cf'/%3E%3C/g%3E%3Cg transform='translate(3,240) rotate(-5,6,7)'%3E%3Cline x1='0' y1='14' x2='12' y2='14'/%3E%3Cline x1='0' y1='0' x2='0' y2='14'/%3E%3Crect x='2' y='8' width='2.5' height='6' fill='%23b8d5cf'/%3E%3Crect x='5.5' y='4' width='2.5' height='10' fill='%23b8d5cf'/%3E%3Crect x='9' y='1.5' width='2.5' height='12.5' fill='%23b8d5cf'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")", backgroundRepeat: 'repeat', backgroundSize: '220px 260px' }}>
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 pt-6 pb-24 safe-top">{renderScreen()}</div>

      {/* Toast per PDF condiviso da altre app */}
      {sharedPdfStatus && (
        <div className="fixed top-6 left-4 right-4 z-50" style={{ maxWidth: 398, margin: '0 auto' }}>
          <div className={`rounded-2xl shadow-lg p-4 flex items-center gap-3 ${sharedPdfStatus === 'success' ? 'bg-green-50 border border-green-200' : sharedPdfStatus === 'error' ? 'bg-red-50 border border-red-200' : 'bg-white border border-bolly-200'}`}>
            {sharedPdfStatus === 'uploading' && <><Loader2 size={20} className="animate-spin text-bolly-500" /><p className="text-sm font-medium text-gray-900">Caricamento bolletta...</p></>}
            {sharedPdfStatus === 'processing' && <><Loader2 size={20} className="animate-spin text-bolly-500" /><p className="text-sm font-medium text-gray-900">Elaborazione AI in corso...</p></>}
            {sharedPdfStatus === 'success' && <><Check size={20} className="text-green-600" /><p className="text-sm font-medium text-gray-900">Bolletta elaborata con successo!</p></>}
            {sharedPdfStatus === 'error' && <><AlertTriangle size={20} className="text-red-600" /><p className="text-sm font-medium text-gray-900">{sharedPdfError || 'Errore nell\'elaborazione'}</p></>}
          </div>
        </div>
      )}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 safe-bottom" style={{ maxWidth: 430, margin: '0 auto' }}>
        <div className="flex items-center justify-around px-6 py-2">
          <button onClick={() => setScreen('dashboard')} className={`flex flex-col items-center gap-1 py-2 px-3 ${screen === 'dashboard' ? 'text-bolly-500' : 'text-gray-400'}`}>
            <Home size={22} /><span className="text-xs font-medium">Home</span>
          </button>
          <button onClick={() => setScreen('calendario')} className={`flex flex-col items-center gap-1 py-2 px-3 ${screen === 'calendario' ? 'text-bolly-500' : 'text-gray-400'}`}>
            <CalendarDays size={22} /><span className="text-xs font-medium">Calendario</span>
          </button>
          <button onClick={() => setScreen('aggiungi')} className="flex flex-col items-center gap-1 py-2 px-3">
            <div className="w-11 h-11 bg-bolly-500 rounded-full flex items-center justify-center -mt-5 shadow-lg"><Plus size={24} className="text-white" /></div>
            <span className="text-xs font-medium text-bolly-500">Aggiungi</span>
          </button>
          <button onClick={() => { setScreen('bollette'); const now = new Date().toISOString(); setLastSeenInboxTime(now); try { localStorage.setItem('bolly_seen_inbox_time', now) } catch(e) {} }} className={`flex flex-col items-center gap-1 py-2 px-3 relative ${screen === 'bollette' ? 'text-bolly-500' : 'text-gray-400'}`}>
            <Inbox size={22} />
            {showBadgeInbox && <span className="absolute -top-0.5 right-1 w-2.5 h-2.5 bg-bolly-500 rounded-full" />}
            <span className="text-xs font-medium">Inbox</span>
          </button>
          <button onClick={() => { setScreen('notifiche'); if (navigator.clearAppBadge) navigator.clearAppBadge(); dbNotifiche.filter(n => !n.letta).forEach(n => segnaNotificaLetta(n.id).catch(() => {})); setDbNotifiche(prev => prev.map(n => ({ ...n, letta: true }))) }} className={`flex flex-col items-center gap-1 py-2 px-3 relative ${screen === 'notifiche' ? 'text-bolly-500' : 'text-gray-400'}`}>
            <Bell size={22} />
            {showBadgeNotifiche && <span className="absolute -top-0.5 right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">{notificheCount}</span>}
            <span className="text-xs font-medium">Notifiche</span>
          </button>
        </div>
      </div>
    </div>
  )
}
