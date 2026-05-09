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
  const { data: splitData, error: splitError } = await supabase
    .from('splits')
    .insert({ ...split, user_id: user.id })
    .select()
    .single()
  if (splitError) throw splitError

  // Inserisci partecipanti
  const partecipantiData = partecipanti.map(p => ({
    split_id: splitData.id,
    user_id: p.user_id || null,
    contatto_esterno_id: p.contatto_esterno_id || null,
    nome: p.nome,
    importo: p.importo,
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
