import { supabase } from './supabase'

// ============================================================
// ABITAZIONI
// ============================================================

export async function getAbitazioni() {
  const { data, error } = await supabase
    .from('abitazioni')
    .select('*')
    .order('created_at', { ascending: true })
  if (error) throw error
  return data
}

export async function createAbitazione(abitazione) {
  const { data: { user } } = await supabase.auth.getUser()
  const { data, error } = await supabase
    .from('abitazioni')
    .insert({ ...abitazione, user_id: user.id })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateAbitazione(id, updates) {
  const { data, error } = await supabase
    .from('abitazioni')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteAbitazione(id) {
  // I contratti collegati avranno abitazione_id = null (ON DELETE SET NULL)
  const { error } = await supabase.from('abitazioni').delete().eq('id', id)
  if (error) throw error
}

// ============================================================
// PROFILO
// ============================================================

export async function getProfile() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  return data
}

// ============================================================
// CONTRATTI
// ============================================================

export async function getContratti() {
  const { data, error } = await supabase
    .from('contratti')
    .select('*')
    .eq('attivo', true)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function createContratto(contratto) {
  const { data: { user } } = await supabase.auth.getUser()
  const { data, error } = await supabase
    .from('contratti')
    .insert({ ...contratto, user_id: user.id })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateContratto(id, updates) {
  const { data, error } = await supabase
    .from('contratti')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteContratto(id) {
  // Prima elimina le bollette collegate
  await supabase.from('bollette').delete().eq('contratto_id', id)
  const { error } = await supabase.from('contratti').delete().eq('id', id)
  if (error) throw error
}

// ============================================================
// BOLLETTE
// ============================================================

export async function getBollette() {
  const { data, error } = await supabase
    .from('bollette')
    .select('*')
    .order('scadenza', { ascending: false })
  if (error) throw error
  return data
}

export async function getBolletteByContratto(contrattoId) {
  const { data, error } = await supabase
    .from('bollette')
    .select('*')
    .eq('contratto_id', contrattoId)
    .order('periodo', { ascending: false })
  if (error) throw error
  return data
}

export async function createBolletta(bolletta) {
  const { data: { user } } = await supabase.auth.getUser()
  const { data, error } = await supabase
    .from('bollette')
    .insert({ ...bolletta, user_id: user.id })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteBolletta(id) {
  const { error } = await supabase.from('bollette').delete().eq('id', id)
  if (error) throw error
}

export async function togglePagata(id, pagata) {
  const { data, error } = await supabase
    .from('bollette')
    .update({
      pagata,
      data_pagamento: pagata ? new Date().toISOString().slice(0, 10) : null,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

// ============================================================
// NOTIFICHE
// ============================================================

export async function getNotifiche() {
  const { data, error } = await supabase
    .from('notifiche')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50)
  if (error) throw error
  return data
}

export async function segnaNotificaLetta(id) {
  const { error } = await supabase
    .from('notifiche')
    .update({ letta: true })
    .eq('id', id)
  if (error) throw error
}

export async function deleteNotifica(id) {
  const { error } = await supabase
    .from('notifiche')
    .delete()
    .eq('id', id)
  if (error) throw error
}

// ============================================================
// SPESE GIORNALIERE
// ============================================================

export async function getSpese() {
  const { data, error } = await supabase
    .from('spese')
    .select('*')
    .order('data', { ascending: false })
  if (error) throw error
  return data
}

export async function createSpesa(spesa) {
  const { data: { user } } = await supabase.auth.getUser()
  const { data, error } = await supabase
    .from('spese')
    .insert({ ...spesa, user_id: user.id })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateSpesa(id, updates) {
  const { data, error } = await supabase
    .from('spese')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteSpesa(id) {
  const { error } = await supabase.from('spese').delete().eq('id', id)
  if (error) throw error
}

// ============================================================
// AMICIZIE
// ============================================================

// Cerca un utente Bolly per email (tramite funzione DB sicura)
export async function cercaUtenteBolly(email) {
  const { data, error } = await supabase
    .rpc('cerca_utente_bolly', { p_email: email, p_telefono: null })
  if (error) throw error
  return data?.[0] || null
}

// Lista amici accettati (sia come richiedente che destinatario)
export async function getAmici() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []
  const { data, error } = await supabase
    .from('amicizie')
    .select('*')
    .eq('stato', 'accettata')
    .or(`richiedente_id.eq.${user.id},destinatario_id.eq.${user.id}`)
  if (error) throw error

  // Per ogni amicizia, recupera il profilo dell'altro utente
  const friendIds = data.map(a => a.richiedente_id === user.id ? a.destinatario_id : a.richiedente_id)
  if (friendIds.length === 0) return []

  const { data: profiles, error: profileError } = await supabase
    .from('profiles')
    .select('id, nome')
    .in('id', friendIds)
  if (profileError) throw profileError

  return data.map(a => {
    const friendId = a.richiedente_id === user.id ? a.destinatario_id : a.richiedente_id
    const profile = profiles.find(p => p.id === friendId)
    return { ...a, amico_id: friendId, amico_nome: profile?.nome || 'Utente' }
  })
}

// Richieste di amicizia ricevute (in attesa)
export async function getRichiesteRicevute() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []
  const { data, error } = await supabase
    .from('amicizie')
    .select('*')
    .eq('destinatario_id', user.id)
    .eq('stato', 'in_attesa')
    .order('created_at', { ascending: false })
  if (error) throw error

  // Recupera nomi dei richiedenti
  const richiedentiIds = data.map(a => a.richiedente_id)
  if (richiedentiIds.length === 0) return []

  const { data: profiles, error: profileError } = await supabase
    .from('profiles')
    .select('id, nome')
    .in('id', richiedentiIds)
  if (profileError) throw profileError

  return data.map(a => {
    const profile = profiles.find(p => p.id === a.richiedente_id)
    return { ...a, richiedente_nome: profile?.nome || 'Utente' }
  })
}

// Richieste di amicizia inviate (in attesa)
export async function getRichiesteInviate() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []
  const { data, error } = await supabase
    .from('amicizie')
    .select('*')
    .eq('richiedente_id', user.id)
    .eq('stato', 'in_attesa')
    .order('created_at', { ascending: false })
  if (error) throw error

  const destIds = data.map(a => a.destinatario_id)
  if (destIds.length === 0) return []

  const { data: profiles, error: profileError } = await supabase
    .from('profiles')
    .select('id, nome')
    .in('id', destIds)
  if (profileError) throw profileError

  return data.map(a => {
    const profile = profiles.find(p => p.id === a.destinatario_id)
    return { ...a, destinatario_nome: profile?.nome || 'Utente' }
  })
}

// Invia richiesta di amicizia a un utente Bolly
export async function inviaRichiestaAmicizia(destinatarioId) {
  const { data: { user } } = await supabase.auth.getUser()
  const { data, error } = await supabase
    .from('amicizie')
    .insert({ richiedente_id: user.id, destinatario_id: destinatarioId })
    .select()
    .single()
  if (error) throw error
  return data
}

// Accetta richiesta di amicizia
export async function accettaAmicizia(amiciziaId) {
  const { data, error } = await supabase
    .from('amicizie')
    .update({ stato: 'accettata', updated_at: new Date().toISOString() })
    .eq('id', amiciziaId)
    .select()
    .single()
  if (error) throw error
  return data
}

// Rifiuta richiesta di amicizia
export async function rifiutaAmicizia(amiciziaId) {
  const { data, error } = await supabase
    .from('amicizie')
    .update({ stato: 'rifiutata', updated_at: new Date().toISOString() })
    .eq('id', amiciziaId)
    .select()
    .single()
  if (error) throw error
  return data
}

// Rimuovi amicizia
export async function rimuoviAmico(amiciziaId) {
  const { error } = await supabase.from('amicizie').delete().eq('id', amiciziaId)
  if (error) throw error
}

// ============================================================
// CONTATTI ESTERNI
// ============================================================

export async function getContattiEsterni() {
  const { data, error } = await supabase
    .from('contatti_esterni')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function addContattoEsterno(contatto) {
  const { data: { user } } = await supabase.auth.getUser()
  const { data, error } = await supabase
    .from('contatti_esterni')
    .insert({ ...contatto, user_id: user.id })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateContattoEsterno(id, updates) {
  const { data, error } = await supabase
    .from('contatti_esterni')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteContattoEsterno(id) {
  const { error } = await supabase.from('contatti_esterni').delete().eq('id', id)
  if (error) throw error
}

// ============================================================
// SPLIT SPESE
// ============================================================

// Crea uno split con partecipanti
export async function createSplit(split, partecipanti) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Utente non autenticato')

  const { data: splitData, error: splitError } = await supabase
    .from('splits')
    .insert({
      user_id: user.id,
      tipo: split.tipo,
      riferimento_id: split.riferimento_id,
      importo_totale: Number(split.importo_totale),
      divisione: split.divisione,
      nota: split.nota || null,
    })
    .select()
    .single()
  if (splitError) throw splitError

  // Inserisci partecipanti
  const partecipantiData = partecipanti.map(p => ({
    split_id: splitData.id,
    user_id: p.user_id || null,
    contatto_esterno_id: p.contatto_esterno_id || null,
    nome: p.nome,
    importo: Number(p.importo),
  }))
  const { error: partError } = await supabase
    .from('split_partecipanti')
    .insert(partecipantiData)
  if (partError) throw partError

  return splitData
}

// Recupera tutti gli split creati dall'utente con i partecipanti
export async function getSplitsByUser() {
  const { data, error } = await supabase
    .from('splits')
    .select('*, split_partecipanti(*)')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

// Recupera lo split collegato a una spesa o bolletta specifica
export async function getSplitByRiferimento(tipo, riferimentoId) {
  const { data, error } = await supabase
    .from('splits')
    .select('*, split_partecipanti(*)')
    .eq('tipo', tipo)
    .eq('riferimento_id', riferimentoId)
    .maybeSingle()
  if (error) throw error
  return data
}

// Recupera gli split dove l'utente è PARTECIPANTE (non creatore)
// Include info sul creatore e sullo stato del pagamento dell'utente
export async function getSplitsRicevuti() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  // Prendi i record di split_partecipanti dove l'utente è partecipante
  const { data: partecipazioni, error: partError } = await supabase
    .from('split_partecipanti')
    .select('*, splits:split_id(*, split_partecipanti(*))')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
  if (partError) throw partError

  // Filtra: solo split NON creati dall'utente stesso
  const ricevuti = (partecipazioni || [])
    .filter(p => p.splits && p.splits.user_id !== user.id)
    .map(p => ({
      ...p.splits,
      mia_parte: p.importo,
      mio_pagato: p.pagato,
      mio_partecipante_id: p.id,
    }))

  // Recupera nomi dei creatori
  const creatorIds = [...new Set(ricevuti.map(s => s.user_id))]
  if (creatorIds.length === 0) return []

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, nome')
    .in('id', creatorIds)

  return ricevuti.map(s => ({
    ...s,
    creatore_nome: profiles?.find(p => p.id === s.user_id)?.nome || 'Utente',
  }))
}

// Segna un partecipante come pagato/non pagato
export async function togglePartecipantePagato(partecipanteId, pagato) {
  const { data, error } = await supabase
    .from('split_partecipanti')
    .update({
      pagato,
      pagato_at: pagato ? new Date().toISOString() : null,
    })
    .eq('id', partecipanteId)
    .select()
    .single()
  if (error) throw error
  return data
}

// Elimina uno split (cascade elimina i partecipanti)
export async function deleteSplit(splitId) {
  const { error } = await supabase.from('splits').delete().eq('id', splitId)
  if (error) throw error
}

// Aggiorna il profilo con il numero di telefono
export async function updateProfileTelefono(telefono) {
  const { data: { user } } = await supabase.auth.getUser()
  const { error } = await supabase
    .from('profiles')
    .update({ telefono })
    .eq('id', user.id)
  if (error) throw error
}

// ============================================================
// SALVADANAI
// ============================================================

export async function getSalvadanai() {
  const { data, error } = await supabase
    .from('salvadanai')
    .select('*')
    .order('created_at', { ascending: true })
  if (error) throw error
  return data
}

export async function createSalvadanaio(salvadanaio) {
  const { data: { user } } = await supabase.auth.getUser()
  const { data, error } = await supabase
    .from('salvadanai')
    .insert({ ...salvadanaio, user_id: user.id })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateSalvadanaio(id, updates) {
  const { data, error } = await supabase
    .from('salvadanai')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteSalvadanaio(id) {
  const { error } = await supabase
    .from('salvadanai')
    .delete()
    .eq('id', id)
  if (error) throw error
}

// ============================================================
// VERSAMENTI SALVADANAIO
// ============================================================

export async function getVersamentiSalvadanaio(salvadanaiId) {
  const { data, error } = await supabase
    .from('versamenti_salvadanaio')
    .select('*')
    .eq('salvadanaio_id', salvadanaiId)
    .order('data', { ascending: false })
  if (error) throw error
  return data
}

export async function getAllVersamenti() {
  const { data, error } = await supabase
    .from('versamenti_salvadanaio')
    .select('*')
    .order('data', { ascending: false })
  if (error) throw error
  return data
}

export async function createVersamento(versamento) {
  const { data: { user } } = await supabase.auth.getUser()
  const { data, error } = await supabase
    .from('versamenti_salvadanaio')
    .insert({ ...versamento, user_id: user.id })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteVersamento(id) {
  const { error } = await supabase
    .from('versamenti_salvadanaio')
    .delete()
    .eq('id', id)
  if (error) throw error
}

// ============================================================
// TRAGUARDI (obiettivi sbloccati)
// ============================================================

export async function getTraguardi() {
  const { data, error } = await supabase
    .from('traguardi')
    .select('*')
    .order('prima_data', { ascending: false })
  if (error) throw error
  return data || []
}

// Marca un obiettivo come "visto" (toglie il pallino "nuovo")
export async function segnaTraguardoVisto(id) {
  const { error } = await supabase
    .from('traguardi')
    .update({ visto: true })
    .eq('id', id)
  if (error) throw error
}

// Marca tutti gli obiettivi dell'utente come visti
export async function segnaTuttiTraguardiVisti() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  const { error } = await supabase
    .from('traguardi')
    .update({ visto: true })
    .eq('user_id', user.id)
    .eq('visto', false)
  if (error) throw error
}

// ============================================================
// STREAK
// ============================================================

export async function getStreak() {
  const { data, error } = await supabase
    .from('streak')
    .select('*')
  if (error) throw error
  return data || []
}

// Recupera la streak primaria (scadenze rispettate)
export async function getStreakScadenze() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data, error } = await supabase
    .from('streak')
    .select('*')
    .eq('user_id', user.id)
    .eq('tipo', 'scadenze')
    .maybeSingle()
  if (error) throw error
  return data
}

// ============================================================
// RIEPILOGO MENSILE
// ============================================================

export async function getRiepilogoMensile(anno, mese) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data, error } = await supabase
    .rpc('calcola_riepilogo_mensile', {
      p_user_id: user.id,
      p_anno: anno,
      p_mese: mese
    })
  if (error) throw error
  return data
}

// ============================================================
// PIANO / PAYWALL
// ============================================================

/**
 * Calcola lo stato del piano di un utente a partire dal suo profilo.
 * Ritorna un oggetto con:
 *   - piano: 'trial' | 'free' | 'premium'
 *   - isPremium: bool (true se ha accesso completo — trial attivo o premium)
 *   - isInTrial: bool
 *   - giorniRimasti: number | null (null se premium senza scadenza)
 *   - trialScaduto: bool
 */
export function getPianoInfo(profile) {
  if (!profile) return { piano: 'free', isPremium: false, isInTrial: false, giorniRimasti: 0, trialScaduto: false }

  const ora = new Date()
  const piano = profile.piano || 'premium' // default premium — tutti i beta tester sono premium

  if (piano === 'premium') {
    // Controlla se ha una scadenza (premium a tempo — es. beta tester con 6 mesi)
    if (profile.premium_scade_il) {
      const scadenza = new Date(profile.premium_scade_il)
      if (scadenza <= ora) {
        // Premium scaduto → cade su free
        return { piano: 'free', isPremium: false, isInTrial: false, giorniRimasti: 0, trialScaduto: false }
      }
      const giorniRimasti = Math.ceil((scadenza - ora) / (1000 * 60 * 60 * 24))
      return { piano: 'premium', isPremium: true, isInTrial: false, giorniRimasti, trialScaduto: false }
    }
    return { piano: 'premium', isPremium: true, isInTrial: false, giorniRimasti: null, trialScaduto: false }
  }

  if (piano === 'trial') {
    const scadenza = profile.trial_scade_il ? new Date(profile.trial_scade_il) : null
    if (scadenza && scadenza > ora) {
      const giorniRimasti = Math.ceil((scadenza - ora) / (1000 * 60 * 60 * 24))
      return { piano: 'trial', isPremium: true, isInTrial: true, giorniRimasti, trialScaduto: false }
    }
    // Trial scaduto → free
    return { piano: 'free', isPremium: false, isInTrial: false, giorniRimasti: 0, trialScaduto: true }
  }

  // piano === 'free'
  return { piano: 'free', isPremium: false, isInTrial: false, giorniRimasti: 0, trialScaduto: false }
}

/**
 * Limiti del piano free.
 * Ritorna { bloccato: bool, motivo: string | null }
 */
export const LIMITI_FREE = {
  MAX_CONTRATTI: 3,
}

export function checkLimiteFree(pianoInfo, contratti = []) {
  if (pianoInfo.isPremium) return { bloccato: false, motivo: null }
  if (contratti.length >= LIMITI_FREE.MAX_CONTRATTI) {
    return { bloccato: true, motivo: 'contratti', messaggio: `Con il piano gratuito puoi avere massimo ${LIMITI_FREE.MAX_CONTRATTI} contratti attivi.` }
  }
  return { bloccato: false, motivo: null }
}

/**
 * Feature gating — lista feature premium con label e icona per il modale paywall.
 * Usato sia per bloccare gli accessi che per mostrarle nel modale.
 */
export const FEATURE_PREMIUM = [
  { id: 'contratti_illimitati', label: 'Contratti illimitati', desc: 'Aggiungi tutti i contratti che vuoi', icon: 'FileText' },
  { id: 'split_spese',         label: 'Divisione spese',       desc: 'Dividi le bollette con chi vuoi',  icon: 'Split' },
  { id: 'multi_abitazione',    label: 'Più abitazioni',        desc: 'Gestisci casa, ufficio, casa vacanze',        icon: 'Building2' },
  { id: 'ocr_scontrini',       label: 'Scan scontrini',        desc: 'Aggiungi spese con una semplice foto',        icon: 'Camera' },
  { id: 'calendario_previsioni', label: 'Previsioni',          desc: 'Proiezioni spese future',          icon: 'CalendarDays' },
]

// ============================================================
// REFERRAL
// ============================================================

/**
 * Registra un referral dopo il primo login dell'utente invitato.
 * Chiamato da App.jsx in onAuthStateChange (evento SIGNED_IN)
 * se localStorage ha 'bolly_ref'.
 */
export async function registraReferral(codice) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, motivo: 'non_autenticato' }
  const { data, error } = await supabase.rpc('registra_referral', {
    p_referred_id: user.id,
    p_codice: codice
  })
  if (error) return { ok: false, motivo: error.message }
  return data
}

/**
 * Ritorna le statistiche referral dell'utente corrente:
 * { codice, link, invitati, completati }
 */
export async function getReferralStats() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const [profRes, referralRes] = await Promise.all([
    supabase.from('profiles').select('codice_referral').eq('id', user.id).single(),
    supabase.from('referral').select('stato').eq('referrer_id', user.id)
  ])

  const codice = profRes.data?.codice_referral || ''
  const tutti = referralRes.data || []
  return {
    codice,
    link: codice ? `https://getbolly.app?ref=${codice}` : '',
    invitati: tutti.length,
    completati: tutti.filter(r => r.stato === 'completato').length
  }
}
