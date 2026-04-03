export const formatEuro = (n) =>
  new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(n)

export const formatData = (d) =>
  new Date(d).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })

export const formatPeriodo = (d) =>
  new Date(d).toLocaleDateString('it-IT', { month: 'short', year: 'numeric' })

export const giorniDa = (data) =>
  Math.ceil((new Date(data) - new Date()) / (1000 * 60 * 60 * 24))

export const getStatoBolletta = (bolletta) => {
  if (bolletta.pagata) return 'pagata'
  const giorni = giorniDa(bolletta.scadenza)
  if (giorni < 0) return 'scaduta'
  if (giorni <= 3) return 'in_scadenza'
  return 'da_pagare'
}

export const STATO_CONFIG = {
  pagata: { label: 'Pagata', bg: 'bg-green-100', text: 'text-green-700', dot: 'bg-green-500' },
  da_pagare: { label: 'Da pagare', bg: 'bg-blue-100', text: 'text-blue-700', dot: 'bg-blue-500' },
  in_scadenza: { label: 'In scadenza', bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-500' },
  scaduta: { label: 'Scaduta', bg: 'bg-red-100', text: 'text-red-700', dot: 'bg-red-500' },
}
