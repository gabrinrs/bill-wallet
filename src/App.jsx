import { useState, useEffect, useMemo, useCallback } from 'react'
import { supabase } from './lib/supabase'
import { getContratti, getBollette, createContratto, createBolletta, togglePagata } from './lib/database'
import { CATEGORIE, FORNITORI, getCategoria } from './lib/categorie'
import { formatEuro, formatData, formatPeriodo, giorniDa, getStatoBolletta, STATO_CONFIG } from './lib/helpers'
import Auth from './components/Auth'
import {
  Home, Plus, Bell, ChevronLeft, ChevronRight, Upload, Check,
  AlertTriangle, Zap, Flame, Droplets, Phone, Wifi, Shield, Package,
  TrendingUp, Calendar, Repeat, Tv, CreditCard, Landmark, PenLine, LogOut, Loader2
} from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

const IconMap = { Zap, Flame, Droplets, Phone, Wifi, Shield, Package, Tv, CreditCard, Landmark }

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
      <Loader2 size={28} className="animate-spin text-blue-500" />
    </div>
  )
}

// ============================================================
// DASHBOARD
// ============================================================

function Dashboard({ contratti, bollette, onSelectContratto, onNavigate, profile, onLogout }) {
  const bolletteProssime = useMemo(() => {
    return bollette
      .filter(b => !b.pagata)
      .map(b => ({ ...b, contratto: contratti.find(c => c.id === b.contratto_id), stato: getStatoBolletta(b) }))
      .filter(b => b.contratto)
      .sort((a, b) => new Date(a.scadenza) - new Date(b.scadenza))
  }, [bollette, contratti])

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
        <button onClick={onLogout} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400">
          <LogOut size={20} />
        </button>
      </div>

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
            <Card key={b.id} className="p-4" onClick={() => onSelectContratto(b.contratto.id)}>
              <div className="flex items-center gap-3">
                <CategoriaIcon categoriaId={b.contratto.categoria} />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{b.contratto.fornitore}</p>
                  <p className="text-sm text-gray-500">Scade il {formatData(b.scadenza)}</p>
                  {b.contratto.domiciliazione ? (
                    <span className="inline-flex items-center gap-1 mt-1 text-xs font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
                      <span className="w-1.5 h-1.5 bg-green-500 rounded-full" /> Domiciliata
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 mt-1 text-xs font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                      <span className="w-1.5 h-1.5 bg-amber-500 rounded-full" /> Da pagare manualmente
                    </span>
                  )}
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
          <button onClick={() => onNavigate('aggiungi-contratto')} className="flex items-center gap-1 text-sm font-medium text-blue-600">
            <Plus size={16} /> Aggiungi
          </button>
        </div>
        <div className="space-y-2">
          {contratti.map(c => {
            const nonPagate = bollette.filter(b => b.contratto_id === c.id && !b.pagata).length
            return (
              <Card key={c.id} className="p-4" onClick={() => onSelectContratto(c.id)}>
                <div className="flex items-center gap-3">
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
              </Card>
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
    </div>
  )
}

// ============================================================
// DETTAGLIO CONTRATTO
// ============================================================

function DettaglioContratto({ contratto, bollette, onBack, onAggiungiBolletta, onTogglePagata }) {
  const bolletteOrdinate = useMemo(() => [...bollette].sort((a, b) => new Date(b.periodo) - new Date(a.periodo)), [bollette])
  const chartData = useMemo(() =>
    [...bollette].sort((a, b) => new Date(a.periodo) - new Date(b.periodo)).map(b => ({ periodo: formatPeriodo(b.periodo), importo: Number(b.importo) }))
  , [bollette])
  const cat = getCategoria(contratto.categoria)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-2 -ml-2 rounded-xl hover:bg-gray-100"><ChevronLeft size={22} className="text-gray-600" /></button>
        <CategoriaIcon categoriaId={contratto.categoria} />
        <div>
          <h1 className="text-xl font-bold text-gray-900">{contratto.fornitore}</h1>
          <p className="text-sm text-gray-500">{cat.label}{contratto.codice ? ` · ${contratto.codice}` : ''}</p>
        </div>
      </div>

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
          <button onClick={onAggiungiBolletta} className="flex items-center gap-1 text-sm font-medium text-blue-600"><Plus size={16} /> Aggiungi</button>
        </div>
        <div className="space-y-2">
          {bolletteOrdinate.map(b => {
            const stato = getStatoBolletta(b)
            return (
              <Card key={b.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{formatEuro(b.importo)}</p>
                    <p className="text-sm text-gray-500">{formatPeriodo(b.periodo)} · Scade {formatData(b.scadenza)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge stato={stato} />
                    {!b.pagata && (
                      <button onClick={e => { e.stopPropagation(); onTogglePagata(b.id) }} className="p-1.5 rounded-lg hover:bg-green-50 text-green-600" title="Segna come pagata">
                        <Check size={18} />
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
              <Card key={cat.id} className="p-4 text-center" onClick={() => { update('categoria', cat.id); setStep(1) }}>
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
    const [customMode, setCustomMode] = useState(catInfo?.freeText || false)
    const [customText, setCustomText] = useState('')

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
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-base" />
            <button onClick={() => { update('fornitore', customText); setStep(2) }} disabled={!customText.trim()}
              className="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold disabled:opacity-40">Continua</button>
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
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Codice cliente / N° contratto</label>
          <input type="text" value={form.codice} onChange={e => update('codice', e.target.value)} placeholder="Opzionale"
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Ricezione bollette</label>
          <div className="flex gap-2">
            {['email', 'portale', 'cartaceo'].map(m => (
              <button key={m} onClick={() => update('metodo_ricezione', m)}
                className={`flex-1 py-2 px-3 rounded-xl text-sm font-medium border transition-colors ${form.metodo_ricezione === m ? 'bg-blue-50 border-blue-300 text-blue-700' : 'border-gray-200 text-gray-600'}`}>
                {m.charAt(0).toUpperCase() + m.slice(1)}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-700">Domiciliazione bancaria</label>
          <button onClick={() => update('domiciliazione', !form.domiciliazione)} className={`w-12 h-7 rounded-full transition-colors ${form.domiciliazione ? 'bg-blue-500' : 'bg-gray-300'}`}>
            <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${form.domiciliazione ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Data inizio</label>
          <input type="date" value={form.data_inizio} onChange={e => update('data_inizio', e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" />
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
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none" />
        </div>
      </div>
      <button onClick={handleSave} disabled={saving || !form.fornitore}
        className="w-full py-3 bg-blue-600 text-white font-semibold rounded-xl disabled:opacity-40">{saving ? 'Salvataggio...' : 'Salva contratto'}</button>
    </div>
  )
}

// ============================================================
// FORM BOLLETTA
// ============================================================

function FormBolletta({ contratti, contrattoId, onSave, onBack }) {
  const [mode, setMode] = useState('contratto')
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    contratto_id: contrattoId || (contratti[0]?.id || ''),
    importo: '', periodo: '', emissione: '', scadenza: '', descrizione_libera: '',
  })
  const update = (f, v) => setForm(p => ({ ...p, [f]: v }))

  const handleSave = async () => {
    setSaving(true)
    try {
      const data = {
        importo: parseFloat(form.importo),
        periodo: form.periodo ? form.periodo + '-01' : null,
        emissione: form.emissione || null,
        scadenza: form.scadenza,
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
        <Card className="p-6 border-dashed border-2 border-gray-300 text-center">
          <Upload size={32} className="text-gray-400 mx-auto" />
          <p className="text-sm font-medium text-gray-700 mt-3">Carica il PDF della bolletta</p>
          <p className="text-xs text-gray-400 mt-1">L'AI riconosce automaticamente fornitore, importo e scadenza</p>
          <p className="text-xs text-blue-500 font-medium mt-3">Disponibile nella prossima versione</p>
        </Card>
      )}

      {mode !== 'pdf' && (
        <>
          <div className="space-y-4">
            {mode === 'contratto' && !contrattoId && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contratto</label>
                <select value={form.contratto_id} onChange={e => update('contratto_id', e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white">
                  {contratti.map(c => <option key={c.id} value={c.id}>{c.fornitore} ({getCategoria(c.categoria).label})</option>)}
                </select>
              </div>
            )}
            {mode === 'libero' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descrizione pagamento</label>
                <input type="text" value={form.descrizione_libera} onChange={e => update('descrizione_libera', e.target.value)}
                  placeholder="Scrivi cosa devi pagare, es. Rata frigorifero, Bollo auto..." autoFocus
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Importo (€)</label>
              <input type="number" step="0.01" value={form.importo} onChange={e => update('importo', e.target.value)} placeholder="0.00"
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Periodo di competenza</label>
              <input type="month" value={form.periodo} onChange={e => update('periodo', e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Emissione</label>
                <input type="date" value={form.emissione} onChange={e => update('emissione', e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" />
              </div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Scadenza</label>
                <input type="date" value={form.scadenza} onChange={e => update('scadenza', e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" />
              </div>
            </div>
          </div>
          <button onClick={handleSave}
            disabled={saving || !form.importo || !form.scadenza || (mode === 'libero' && !form.descrizione_libera.trim()) || (mode === 'contratto' && !form.contratto_id)}
            className="w-full py-3 bg-blue-600 text-white font-semibold rounded-xl disabled:opacity-40">{saving ? 'Salvataggio...' : 'Salva bolletta'}</button>
        </>
      )}
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

  const cfg = { urgente: 'bg-amber-50 border-amber-200 text-amber-600', scaduta: 'bg-red-50 border-red-200 text-red-600', promemoria: 'bg-blue-50 border-blue-200 text-blue-600' }

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

export default function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState(null)
  const [contratti, setContratti] = useState([])
  const [bollette, setBollette] = useState([])
  const [screen, setScreen] = useState('dashboard')
  const [selectedContrattoId, setSelectedContrattoId] = useState(null)

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

  const handleTogglePagata = async (id) => {
    await togglePagata(id, true)
    await loadData()
  }

  const notificheCount = bollette.filter(b => !b.pagata && giorniDa(b.scadenza) <= 7).length

  const renderScreen = () => {
    switch (screen) {
      case 'dashboard': return <Dashboard contratti={contratti} bollette={bollette} onSelectContratto={handleSelectContratto} onNavigate={setScreen} profile={profile} onLogout={handleLogout} />
      case 'dettaglio': {
        const c = contratti.find(x => x.id === selectedContrattoId)
        if (!c) { setScreen('dashboard'); return null }
        return <DettaglioContratto contratto={c} bollette={bollette.filter(b => b.contratto_id === c.id)} onBack={() => setScreen('dashboard')} onAggiungiBolletta={() => setScreen('aggiungi-bolletta')} onTogglePagata={handleTogglePagata} />
      }
      case 'aggiungi-contratto': return <FormContratto onSave={handleSaveContratto} onBack={() => setScreen('dashboard')} />
      case 'aggiungi-bolletta': return <FormBolletta contratti={contratti} contrattoId={selectedContrattoId} onSave={handleSaveBolletta} onBack={() => selectedContrattoId ? setScreen('dettaglio') : setScreen('dashboard')} />
      case 'notifiche': return <Notifiche contratti={contratti} bollette={bollette} />
      default: return null
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col" style={{ maxWidth: 430, margin: '0 auto' }}>
      <div className="flex-1 overflow-y-auto px-4 pt-6 pb-24 safe-top">{renderScreen()}</div>
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 safe-bottom" style={{ maxWidth: 430, margin: '0 auto' }}>
        <div className="flex items-center justify-around px-6 py-2">
          <button onClick={() => setScreen('dashboard')} className={`flex flex-col items-center gap-1 py-2 px-3 ${screen === 'dashboard' ? 'text-blue-600' : 'text-gray-400'}`}>
            <Home size={22} /><span className="text-xs font-medium">Home</span>
          </button>
          <button onClick={() => { setSelectedContrattoId(null); setScreen('aggiungi-bolletta') }} className="flex flex-col items-center gap-1 py-2 px-3">
            <div className="w-11 h-11 bg-blue-600 rounded-full flex items-center justify-center -mt-5 shadow-lg"><Plus size={24} className="text-white" /></div>
            <span className="text-xs font-medium text-blue-600">Aggiungi</span>
          </button>
          <button onClick={() => setScreen('notifiche')} className={`flex flex-col items-center gap-1 py-2 px-3 relative ${screen === 'notifiche' ? 'text-blue-600' : 'text-gray-400'}`}>
            <Bell size={22} />
            {notificheCount > 0 && <span className="absolute -top-0.5 right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">{notificheCount}</span>}
            <span className="text-xs font-medium">Notifiche</span>
          </button>
        </div>
      </div>
    </div>
  )
}
