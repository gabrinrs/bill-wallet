import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { supabase } from './lib/supabase'
import { getContratti, getBollette, createContratto, createBolletta, togglePagata, updateContratto, deleteContratto, deleteBolletta } from './lib/database'
import { CATEGORIE, FORNITORI, getCategoria, PORTALI_PAGAMENTO } from './lib/categorie'
import { formatEuro, formatData, formatPeriodo, giorniDa, getStatoBolletta, STATO_CONFIG } from './lib/helpers'
import Auth from './components/Auth'
import {
  Home, Plus, Bell, ChevronLeft, ChevronRight, Upload, Check,
  AlertTriangle, Zap, Flame, Droplets, Phone, Wifi, Shield, Package,
  TrendingUp, Calendar, Repeat, Tv, CreditCard, Landmark, PenLine, LogOut, Loader2,
  Trash2, ExternalLink, Pencil, Mail, Copy, User
} from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

const IconMap = { Zap, Flame, Droplets, Phone, Wifi, Shield, Package, Tv, Repeat, CreditCard, Landmark }

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

function FonteBadge({ fonte }) {
  if (fonte !== 'email') return null
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-bolly-700 bg-bolly-50 px-2 py-0.5 rounded-full border border-bolly-100">
      <Mail size={10} />
      Via email
    </span>
  )
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

// ============================================================
// DASHBOARD
// ============================================================

function Dashboard({ contratti, bollette, onSelectContratto, onNavigate, profile, onLogout, onDeleteContratto, onEditContratto }) {
  const [cardSwipedId, setCardSwipedId] = useState(null)
  const [deletingContratto, setDeletingContratto] = useState(null)
  const bolletteProssime = useMemo(() => {
    return bollette
      .filter(b => !b.pagata && b.stato_elaborazione !== 'errore_parsing' && b.stato_elaborazione !== 'orfana' && b.stato_elaborazione !== 'incompleta')
      .map(b => ({ ...b, contratto: contratti.find(c => c.id === b.contratto_id), stato: getStatoBolletta(b) }))
      .filter(b => b.contratto)
      .sort((a, b) => new Date(a.scadenza) - new Date(b.scadenza))
  }, [bollette, contratti])

  const bolletteOrfaneCount = useMemo(() =>
    bollette.filter(b => ['errore_parsing', 'orfana', 'incompleta'].includes(b.stato_elaborazione)).length
  , [bollette])

  const totaleMesseCorrente = useMemo(() => {
    const now = new Date()
    return bollette
      .filter(b => { const d = new Date(b.scadenza); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear() })
      .reduce((s, b) => s + Number(b.importo), 0)
  }, [bollette])

  const totaleDaPagare = useMemo(() =>
    bollette.filter(b => !b.pagata).reduce((s, b) => s + Number(b.importo), 0)
  , [bollette])

  const totaleRicorrentiMensili = useMemo(() => {
    return contratti.filter(c => c.ricorrente).reduce((sum, c) => {
      const imp = Number(c.importo_ricorrente) || 0
      if (c.frequenza === 'mensile') return sum + imp
      if (c.frequenza === 'trimestrale') return sum + imp / 3
      if (c.frequenza === 'annuale') return sum + imp / 12
      return sum
    }, 0)
  }, [contratti])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Ciao {profile?.nome || 'utente'}</h1>
          <p className="text-gray-500 mt-0.5 text-sm">Riepilogo delle tue spese</p>
        </div>
        <button onClick={() => onNavigate('profilo')} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400">
          <User size={20} />
        </button>
      </div>

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
          <p className="text-xs text-gray-500 uppercase tracking-wide">Spese del mese</p>
          <p className="text-xl font-bold text-gray-900 mt-1">{formatEuro(totaleMesseCorrente)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Da pagare</p>
          <p className="text-xl font-bold text-red-600 mt-1">{formatEuro(totaleDaPagare)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Fisso mensile</p>
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
                  <p className="text-sm text-gray-500">Scade il {formatData(b.scadenza)}</p>
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
          {contratti.map(c => {
            const nonPagate = bollette.filter(b => b.contratto_id === c.id && !b.pagata).length
            const totalBollette = bollette.filter(b => b.contratto_id === c.id).length
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
                      {c.ricorrente && ` · ${formatEuro(c.importo_ricorrente)}/${c.frequenza === 'mensile' ? 'mese' : c.frequenza === 'trimestrale' ? 'trim.' : 'anno'}`}
                    </p>
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
          {contratti.length === 0 && (
            <Card className="p-8 text-center" onClick={() => onNavigate('aggiungi-contratto')}>
              <Plus size={32} className="text-gray-300 mx-auto mb-2" />
              <p className="text-gray-400">Aggiungi il tuo primo contratto</p>
            </Card>
          )}
        </div>
      </div>

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
    </div>
  )
}

// ============================================================
// DETTAGLIO CONTRATTO
// ============================================================

function DettaglioContratto({ contratto, bollette, onBack, onAggiungiBolletta, onTogglePagata, onDeleteContratto, onEditContratto, onDeleteBolletta }) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deletingBollettaId, setDeletingBollettaId] = useState(null)
  const bolletteOrdinate = useMemo(() => [...bollette].sort((a, b) => new Date(b.periodo) - new Date(a.periodo)), [bollette])
  const chartData = useMemo(() =>
    [...bollette].filter(b => b.periodo).sort((a, b) => new Date(a.periodo) - new Date(b.periodo)).map(b => ({ periodo: formatPeriodo(b.periodo), importo: Number(b.importo) }))
  , [bollette])
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
          </div>
        </div>
        <button onClick={() => onEditContratto(contratto)} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400"><Pencil size={18} /></button>
        <button onClick={() => setShowDeleteConfirm(true)} className="p-2 rounded-xl hover:bg-red-50 text-gray-400"><Trash2 size={18} /></button>
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
          <div><p className="text-gray-500">Ricezione</p><p className="font-medium capitalize">{contratto.metodo_ricezione}</p></div>
          <div><p className="text-gray-500">Domiciliazione</p><p className="font-medium">{contratto.domiciliazione ? 'Attiva' : 'No'}</p></div>
          <div><p className="text-gray-500">Attivo dal</p><p className="font-medium">{contratto.data_inizio ? formatData(contratto.data_inizio) : '—'}</p></div>
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

      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-900">Storico bollette</h3>
          <button onClick={onAggiungiBolletta} className="flex items-center gap-1 text-sm font-medium text-bolly-500"><Plus size={16} /> Aggiungi</button>
        </div>
        <div className="space-y-2">
          {bolletteOrdinate.map(b => {
            const stato = getStatoBolletta(b)
            return (
              <Card key={b.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{formatEuro(b.importo)}</p>
                    <p className="text-sm text-gray-500">{b.periodo ? `${formatPeriodo(b.periodo)} · ` : ''}Scade {b.scadenza ? formatData(b.scadenza) : '—'}</p>
                    <div className="mt-1"><FonteBadge fonte={b.fonte} /></div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge stato={stato} />
                    {b.pdf_url && (
                      <a href={b.pdf_url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="p-1.5 rounded-lg hover:bg-bolly-50 text-bolly-500" title="Apri PDF">
                        <ExternalLink size={16} />
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
                        <Trash2 size={15} />
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

function FormContratto({ onSave, onBack }) {
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [customMode, setCustomMode] = useState(false)
  const [customText, setCustomText] = useState('')
  const [form, setForm] = useState({
    categoria: '', fornitore: '', intestatario: '', codice: '',
    metodo_ricezione: 'email', domiciliazione: false, data_inizio: '', note: '',
    ricorrente: false, importo_ricorrente: '', frequenza: 'mensile', prossimo_addebito: '',
  })
  const update = (f, v) => setForm(p => ({ ...p, [f]: v }))

  const handleSave = async () => {
    setSaving(true)
    try {
      const data = { ...form }
      if (data.ricorrente) data.importo_ricorrente = parseFloat(data.importo_ricorrente)
      else { delete data.importo_ricorrente; delete data.frequenza; delete data.prossimo_addebito }
      await onSave(data)
    } catch (e) { console.error(e) }
    setSaving(false)
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

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <button onClick={() => setStep(0)} className="p-2 -ml-2 rounded-xl hover:bg-gray-100"><ChevronLeft size={22} className="text-gray-600" /></button>
          <h1 className="text-xl font-bold text-gray-900">Seleziona fornitore</h1>
        </div>
        <div className="space-y-2">
          {fornitori.map(f => (
            <Card key={f} className="p-4" onClick={() => { update('fornitore', f); setStep(2) }}>
              <p className="font-medium text-gray-900">{f}</p>
            </Card>
          ))}
          <Card className="p-4 border-dashed border-2 border-gray-200" onClick={() => setCustomMode(true)}>
            <div className="flex items-center gap-2 text-gray-500"><PenLine size={18} /><p className="font-medium">Scrivi nome personalizzato...</p></div>
          </Card>
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
          <label className="block text-sm font-medium text-gray-700 mb-1">Data inizio</label>
          <input type="date" value={form.data_inizio} onChange={e => update('data_inizio', e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-bolly-500 focus:border-transparent outline-none" />
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
                <div className="flex gap-2">
                  {[{ id: 'mensile', l: 'Mensile' }, { id: 'trimestrale', l: 'Trimestrale' }, { id: 'annuale', l: 'Annuale' }].map(f => (
                    <button key={f.id} onClick={() => update('frequenza', f.id)}
                      className={`flex-1 py-2 rounded-xl text-sm font-medium border ${form.frequenza === f.id ? 'bg-pink-100 border-pink-300 text-pink-700' : 'border-gray-200 text-gray-600'}`}>{f.l}</button>
                  ))}
                </div>
              </div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Prossimo addebito</label>
                <input type="date" value={form.prossimo_addebito} onChange={e => update('prossimo_addebito', e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-pink-500 focus:border-transparent outline-none" />
              </div>
            </div>
          )}
        </div>

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
    importo: '', periodo: '', emissione: '', scadenza: '', descrizione_libera: '', metodo_pagamento: null,
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
        emissione: form.emissione || null,
        scadenza: form.scadenza,
        metodo_pagamento: form.metodo_pagamento,
      }
      if (mode === 'libero') {
        data.descrizione_libera = form.descrizione_libera
        data.fonte = 'manuale_libero'
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
                <input type="month" value={form.periodo} onChange={e => update('periodo', e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-bolly-500 focus:border-transparent outline-none bg-white text-gray-900"
                  style={{ WebkitAppearance: 'none', minHeight: '44px', colorScheme: 'light' }} />
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
              <input type="month" value={form.periodo} onChange={e => update('periodo', e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-bolly-500 focus:border-transparent outline-none bg-white text-gray-900"
                style={{ WebkitAppearance: 'none', minHeight: '44px', colorScheme: 'light' }} />
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

function FormModificaContratto({ contratto, onSave, onBack }) {
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    categoria: contratto.categoria || '',
    fornitore: contratto.fornitore || '',
    intestatario: contratto.intestatario || '',
    codice: contratto.codice || '',
    metodo_ricezione: contratto.metodo_ricezione || 'email',
    domiciliazione: contratto.domiciliazione || false,
    data_inizio: contratto.data_inizio || '',
    note: contratto.note || '',
    ricorrente: contratto.ricorrente || false,
    importo_ricorrente: contratto.importo_ricorrente || '',
    frequenza: contratto.frequenza || 'mensile',
    prossimo_addebito: contratto.prossimo_addebito || '',
  })
  const update = (f, v) => setForm(p => ({ ...p, [f]: v }))

  const handleSave = async () => {
    setSaving(true)
    try {
      const data = { ...form }
      if (data.ricorrente) data.importo_ricorrente = parseFloat(data.importo_ricorrente)
      else { delete data.importo_ricorrente; delete data.frequenza; delete data.prossimo_addebito }
      await onSave(data)
    } catch (e) { console.error(e) }
    setSaving(false)
  }

  return (
    <div className="space-y-6">
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
          <label className="block text-sm font-medium text-gray-700 mb-1">Data inizio</label>
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
                <div className="flex gap-2">
                  {[{ id: 'mensile', l: 'Mensile' }, { id: 'trimestrale', l: 'Trimestrale' }, { id: 'annuale', l: 'Annuale' }].map(f => (
                    <button key={f.id} onClick={() => update('frequenza', f.id)}
                      className={`flex-1 py-2 rounded-xl text-sm font-medium border ${form.frequenza === f.id ? 'bg-pink-100 border-pink-300 text-pink-700' : 'border-gray-200 text-gray-600'}`}>{f.l}</button>
                  ))}
                </div>
              </div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Prossimo addebito</label>
                <input type="date" value={form.prossimo_addebito} onChange={e => update('prossimo_addebito', e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-pink-500 focus:border-transparent outline-none bg-white text-gray-900"
                  style={{ WebkitAppearance: 'none', minHeight: '44px', colorScheme: 'light' }} />
              </div>
            </div>
          )}
        </div>
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

function Notifiche({ contratti, bollette }) {
  const notifiche = useMemo(() => {
    const list = []
    bollette.filter(b => !b.pagata).forEach(b => {
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

  const cfg = { urgente: 'bg-amber-50 border-amber-200 text-amber-600', scaduta: 'bg-red-50 border-red-200 text-red-600', promemoria: 'bg-bolly-50 border-bolly-200 text-bolly-500' }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Notifiche</h1>
      {notifiche.length === 0 ? (
        <div className="text-center py-12"><Bell size={40} className="text-gray-300 mx-auto mb-3" /><p className="text-gray-400">Nessuna notifica</p></div>
      ) : (
        <div className="space-y-2">
          {notifiche.map((n, i) => (
            <Card key={i} className={`p-4 ${cfg[n.tipo]}`}>
              <div className="flex items-start gap-3">
                <AlertTriangle size={20} className="mt-0.5" />
                <div><p className="font-medium text-gray-900">{n.titolo}</p><p className="text-sm text-gray-600 mt-0.5">{n.desc}</p></div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

// ============================================================
// APP
// ============================================================

// ============================================================
// PROFILO
// ============================================================

function Profilo({ profile, session, onBack, onLogout }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(profile?.email_dedicata || '')
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (e) {
      console.error('Errore copia:', e)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header con back */}
      <div className="flex items-center gap-2">
        <button onClick={onBack} className="p-2 rounded-xl hover:bg-gray-100">
          <ChevronLeft size={22} className="text-gray-700" />
        </button>
        <h1 className="text-xl font-bold text-gray-900">Il tuo profilo</h1>
      </div>

      {/* Avatar + nome + email */}
      <div className="flex flex-col items-center py-2">
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center shadow-lg mb-3"
          style={{ background: 'linear-gradient(145deg, #00897B, #00695C)' }}
        >
          <span className="text-white font-pacifico" style={{ fontSize: '36px', lineHeight: 1 }}>
            {profile?.nome?.[0]?.toUpperCase() || 'U'}
          </span>
        </div>
        <h2 className="text-lg font-semibold text-gray-900">{profile?.nome || 'Utente'}</h2>
        <p className="text-sm text-gray-500">{session?.user?.email}</p>
      </div>

      {/* Card email dedicata */}
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-2">
          <Mail size={18} className="text-bolly-500" />
          <h3 className="font-semibold text-gray-900">Il tuo indirizzo Bolly</h3>
        </div>
        <p className="text-sm text-gray-500 mb-4">
          Usalo per ricevere le bollette direttamente nell'app.
        </p>

        <div className="bg-gray-50 rounded-xl p-3 flex items-center gap-2 mb-4 border border-gray-100">
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

        <div className="bg-bolly-50 rounded-xl p-3 border border-bolly-100">
          <p className="text-xs text-gray-700 leading-relaxed">
            <strong className="text-gray-900">Come usarlo:</strong> accedi al portale dei tuoi fornitori (Enel, NWG, Tim, ecc.) e aggiungi questo indirizzo come destinatario per le bollette digitali. Le bollette future verranno importate automaticamente.
          </p>
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
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState(null)
  const [contratti, setContratti] = useState([])
  const [bollette, setBollette] = useState([])
  const [screen, setScreen] = useState('dashboard')
  const [selectedContrattoId, setSelectedContrattoId] = useState(null)
  const [editingContratto, setEditingContratto] = useState(null)
  const [notificheViste, setNotificheViste] = useState(false)
  const [prevNotificheCount, setPrevNotificheCount] = useState(0)

  // Se supabase non è configurato, mostra errore
  if (!supabase) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-6">
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
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => setSession(session))
    return () => subscription.unsubscribe()
  }, [])

  // Load data quando utente loggato
  const loadData = useCallback(async () => {
    if (!session) return
    try {
      const { data: prof } = await supabase.from('profiles').select('*').eq('id', session.user.id).single()
      setProfile(prof)
      const [c, b] = await Promise.all([getContratti(), getBollette()])
      setContratti(c)
      setBollette(b)
    } catch (e) { console.error('Errore caricamento dati:', e) }
  }, [session])

  useEffect(() => { loadData() }, [loadData])

  // Reset notifiche viste quando il count delle notifiche aumenta (nuove bollette urgenti)
  const currentNotificheCount = bollette.filter(b => !b.pagata && giorniDa(b.scadenza) <= 7).length
  useEffect(() => {
    setPrevNotificheCount(prev => {
      if (currentNotificheCount > prev) setNotificheViste(false)
      return currentNotificheCount
    })
  }, [currentNotificheCount])

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loading /></div>
  if (!session) return <Auth />

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setContratti([])
    setBollette([])
    setProfile(null)
  }

  const handleSelectContratto = (id) => { setSelectedContrattoId(id); setScreen('dettaglio') }

  const handleSaveContratto = async (form) => {
    await createContratto(form)
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
    await createBolletta(form)
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

  const notificheCount = bollette.filter(b => !b.pagata && giorniDa(b.scadenza) <= 7).length
  const showBadgeNotifiche = notificheCount > 0 && !notificheViste

  const renderScreen = () => {
    switch (screen) {
      case 'dashboard': return <Dashboard contratti={contratti} bollette={bollette} onSelectContratto={handleSelectContratto} onNavigate={setScreen} profile={profile} onLogout={handleLogout} onDeleteContratto={handleDeleteContratto} onEditContratto={handleEditContratto} />
      case 'dettaglio': {
        const c = contratti.find(x => x.id === selectedContrattoId)
        if (!c) { setScreen('dashboard'); return null }
        return <DettaglioContratto contratto={c} bollette={bollette.filter(b => b.contratto_id === c.id)} onBack={() => setScreen('dashboard')} onAggiungiBolletta={() => setScreen('aggiungi-bolletta')} onTogglePagata={handleTogglePagata} onDeleteContratto={handleDeleteContratto} onEditContratto={handleEditContratto} onDeleteBolletta={handleDeleteBolletta} />
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
          </div>
        )
      case 'aggiungi-contratto': return <FormContratto onSave={handleSaveContratto} onBack={() => setScreen('aggiungi')} />
      case 'modifica-contratto': return editingContratto ? <FormModificaContratto contratto={editingContratto} onSave={handleUpdateContratto} onBack={() => { setEditingContratto(null); setScreen('dettaglio') }} /> : null
      case 'aggiungi-bolletta': return <FormBolletta contratti={contratti} contrattoId={selectedContrattoId} onSave={handleSaveBolletta} onBack={() => selectedContrattoId ? setScreen('dettaglio') : setScreen('aggiungi')} session={session} onRefresh={loadData} onGoHome={() => setScreen('dashboard')} />
      case 'notifiche': return <Notifiche contratti={contratti} bollette={bollette} />
      case 'profilo': return <Profilo profile={profile} session={session} onBack={() => setScreen('dashboard')} onLogout={handleLogout} />
      case 'bollette-orfane': return <BolletteOrfane bollette={bollette} contratti={contratti} onBack={() => setScreen('dashboard')} onUpdateBolletta={handleUpdateBolletta} onDeleteBolletta={handleDeleteBolletta} />
      default: return null
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col" style={{ maxWidth: 430, margin: '0 auto' }}>
      <div className="flex-1 overflow-y-auto px-4 pt-6 pb-24 safe-top">{renderScreen()}</div>
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 safe-bottom" style={{ maxWidth: 430, margin: '0 auto' }}>
        <div className="flex items-center justify-around px-6 py-2">
          <button onClick={() => setScreen('dashboard')} className={`flex flex-col items-center gap-1 py-2 px-3 ${screen === 'dashboard' ? 'text-bolly-500' : 'text-gray-400'}`}>
            <Home size={22} /><span className="text-xs font-medium">Home</span>
          </button>
          <button onClick={() => setScreen('aggiungi')} className="flex flex-col items-center gap-1 py-2 px-3">
            <div className="w-11 h-11 bg-bolly-500 rounded-full flex items-center justify-center -mt-5 shadow-lg"><Plus size={24} className="text-white" /></div>
            <span className="text-xs font-medium text-bolly-500">Aggiungi</span>
          </button>
          <button onClick={() => { setScreen('notifiche'); setNotificheViste(true) }} className={`flex flex-col items-center gap-1 py-2 px-3 relative ${screen === 'notifiche' ? 'text-bolly-500' : 'text-gray-400'}`}>
            <Bell size={22} />
            {showBadgeNotifiche && <span className="absolute -top-0.5 right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">{notificheCount}</span>}
            <span className="text-xs font-medium">Notifiche</span>
          </button>
        </div>
      </div>
    </div>
  )
}