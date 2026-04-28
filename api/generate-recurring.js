// api/generate-recurring.js — Vercel Serverless Function
// Genera bollette automatiche per contratti ricorrenti (iCloud, Netflix, ecc.)
// Chiamato da Make.com ogni giorno alle 9:00
// Logica: 7 giorni prima della scadenza → crea la bolletta
// Se domiciliazione attiva → segna come pagata alla data scadenza

import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Autenticazione
  const apiKey = req.headers['x-api-key']
  if (apiKey !== process.env.NOTIFICATIONS_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    const supabase = createClient(
      process.env.SUPABASE_URL || 'https://iimzetvymamadclfblgy.supabase.co',
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    const oggi = new Date()
    oggi.setHours(0, 0, 0, 0)

    // Data target: oggi + 7 giorni (creiamo bollette che scadono tra 7gg)
    const target = new Date(oggi)
    target.setDate(target.getDate() + 7)
    const targetStr = target.toISOString().split('T')[0]

    // Data di oggi come stringa
    const oggiStr = oggi.toISOString().split('T')[0]

    // ============================================================
    // PARTE 1: Genera nuove bollette ricorrenti
    // ============================================================

    // Recupera tutti i contratti ricorrenti con prossimo_addebito = oggi + 7gg
    const { data: contratti, error: errContratti } = await supabase
      .from('contratti')
      .select('id, user_id, fornitore, categoria, importo_ricorrente, frequenza, prossimo_addebito, domiciliazione')
      .eq('ricorrente', true)
      .not('prossimo_addebito', 'is', null)
      .lte('prossimo_addebito', targetStr)

    if (errContratti) throw errContratti

    let bolletteCrate = 0
    let contrattiAggiornati = 0
    let errori = []

    for (const contratto of (contratti || [])) {
      try {
        // Calcola la data scadenza dalla data prossimo_addebito del contratto
        const scadenza = contratto.prossimo_addebito

        // Controlla che non esista già una bolletta per questo contratto con questa scadenza
        const { data: esistente } = await supabase
          .from('bollette')
          .select('id')
          .eq('contratto_id', contratto.id)
          .eq('scadenza', scadenza)
          .eq('fonte', 'ricorrente_auto')
          .limit(1)

        if (esistente && esistente.length > 0) {
          // Bolletta già creata per questo periodo, skip
          // Ma aggiorna comunque prossimo_addebito se è nel passato
          if (scadenza <= oggiStr) {
            const prossimaData = calcolaProssimaData(scadenza, contratto.frequenza)
            await supabase.from('contratti').update({ prossimo_addebito: prossimaData }).eq('id', contratto.id)
            contrattiAggiornati++
          }
          continue
        }

        // Calcola il periodo di competenza (es. "2026-05" per maggio 2026)
        const dataScadenza = new Date(scadenza)
        const periodo = `${dataScadenza.getFullYear()}-${String(dataScadenza.getMonth() + 1).padStart(2, '0')}-01`

        // Crea la bolletta
        const { error: errInsert } = await supabase.from('bollette').insert({
          user_id: contratto.user_id,
          contratto_id: contratto.id,
          importo: contratto.importo_ricorrente,
          scadenza: scadenza,
          periodo: periodo,
          emissione: oggiStr,
          pagata: false,
          fonte: 'ricorrente_auto',
          stato_elaborazione: 'ok',
          descrizione_libera: `${contratto.fornitore} — rinnovo ${contratto.frequenza}`,
        })

        if (errInsert) throw errInsert
        bolletteCrate++

        // Aggiorna prossimo_addebito al prossimo periodo
        const prossimaData = calcolaProssimaData(scadenza, contratto.frequenza)
        await supabase.from('contratti').update({ prossimo_addebito: prossimaData }).eq('id', contratto.id)
        contrattiAggiornati++

      } catch (e) {
        errori.push({ contratto_id: contratto.id, fornitore: contratto.fornitore, error: e.message })
      }
    }

    // ============================================================
    // PARTE 2: Auto-paga bollette con domiciliazione scadute oggi
    // ============================================================

    let autoPagate = 0

    // Trova bollette non pagate la cui scadenza è oggi o passata,
    // il cui contratto ha domiciliazione attiva
    const { data: bolletteDomiciliate, error: errDom } = await supabase
      .from('bollette')
      .select('id, contratto_id')
      .eq('pagata', false)
      .lte('scadenza', oggiStr)
      .eq('stato_elaborazione', 'ok')

    if (!errDom && bolletteDomiciliate) {
      for (const b of bolletteDomiciliate) {
        // Controlla se il contratto ha domiciliazione attiva
        const contratto = (contratti || []).find(c => c.id === b.contratto_id)
        if (contratto && contratto.domiciliazione) {
          await supabase.from('bollette').update({ pagata: true }).eq('id', b.id)
          autoPagate++
        } else if (!contratto) {
          // Il contratto potrebbe non essere nella lista ricorrenti, cercalo
          const { data: cData } = await supabase
            .from('contratti')
            .select('domiciliazione')
            .eq('id', b.contratto_id)
            .single()
          if (cData?.domiciliazione) {
            await supabase.from('bollette').update({ pagata: true }).eq('id', b.id)
            autoPagate++
          }
        }
      }
    }

    return res.status(200).json({
      message: 'Bollette ricorrenti processate',
      bollette_create: bolletteCrate,
      contratti_aggiornati: contrattiAggiornati,
      auto_pagate_domiciliazione: autoPagate,
      errori: errori.length,
      dettagli_errori: errori
    })

  } catch (err) {
    console.error('Errore generate-recurring:', err)
    return res.status(500).json({ error: err.message })
  }
}

// Calcola la prossima data di addebito in base alla frequenza
function calcolaProssimaData(dataCorrente, frequenza) {
  const d = new Date(dataCorrente)
  switch (frequenza) {
    case 'mensile':
      d.setMonth(d.getMonth() + 1)
      break
    case 'trimestrale':
      d.setMonth(d.getMonth() + 3)
      break
    case 'annuale':
      d.setFullYear(d.getFullYear() + 1)
      break
    default:
      d.setMonth(d.getMonth() + 1) // fallback mensile
  }
  return d.toISOString().split('T')[0]
}
