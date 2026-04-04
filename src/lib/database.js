import { supabase } from './supabase'

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
