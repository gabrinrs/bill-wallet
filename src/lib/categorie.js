export const CATEGORIE = [
  { id: 'luce', label: 'Luce', icon: 'Zap', color: '#f59e0b' },
  { id: 'gas', label: 'Gas', icon: 'Flame', color: '#ef4444' },
  { id: 'acqua', label: 'Acqua', icon: 'Droplets', color: '#3b82f6' },
  { id: 'telefono', label: 'Telefono', icon: 'Phone', color: '#8b5cf6' },
  { id: 'internet', label: 'Internet', icon: 'Wifi', color: '#06b6d4' },
  { id: 'assicurazione', label: 'Assicurazione', icon: 'Shield', color: '#10b981' },
  { id: 'abbonamento', label: 'Abbonamento', icon: 'Repeat', color: '#ec4899' },
  { id: 'finanziamento', label: 'Finanziamento', icon: 'CreditCard', color: '#f97316', freeText: true, placeholder: 'es. Rata lavatrice, Prestito auto...' },
  { id: 'f24', label: 'F24', icon: 'Landmark', color: '#0d9488', freeText: true, placeholder: 'es. Acconto IRPEF, Saldo IVA...' },
  { id: 'pagopa', label: 'PagoPA', icon: 'Landmark', color: '#0891b2', freeText: true, placeholder: 'es. TARI 2026, Bollo auto...' },
  { id: 'altro', label: 'Altro', icon: 'Package', color: '#6b7280', freeText: true, placeholder: 'es. Condominio, Affitto box...' },
]

// Fornitori principali (mostrati come card)
export const FORNITORI = {
  luce: ['Enel Energia', 'Edison', 'A2A', 'Iren', 'Hera', 'ENI Plenitude'],
  gas: ['ENI Plenitude', 'Enel Energia', 'Edison', 'A2A', 'Iren', 'Hera'],
  acqua: ['IRETI', 'ACEA', 'Hera', 'MM Milano', 'Acquedotto Pugliese', 'Gruppo CAP'],
  telefono: ['TIM', 'Vodafone', 'WindTre', 'Iliad', 'Fastweb', 'ho. Mobile'],
  internet: ['Fastweb', 'TIM', 'Vodafone', 'WindTre', 'Sky WiFi', 'Iliad'],
  assicurazione: ['UnipolSai', 'Allianz', 'Generali', 'AXA', 'Zurich', 'Vittoria'],
  abbonamento: ['Netflix', 'Spotify', 'Amazon Prime', 'Disney+', 'DAZN', 'YouTube Premium', 'Apple One', 'Sky'],
  finanziamento: [],
  f24: [],
  pagopa: [],
  altro: [],
}

// Lista estesa fornitori mercato libero (per ricerca/autocomplete)
export const FORNITORI_ESTESI = {
  luce: [
    'Octopus Energy', 'Illumia', 'Engie', 'Sorgenia', 'Wekiwi', 'NWG Energia',
    'VIVI Energia', 'Axpo Italia', 'Dolomiti Energia', 'Alperia', 'Agsm Aim',
    'Eni gas e luce', 'E.ON', 'Green Network', 'Optima Italia', 'Pulsee',
    'Iberdrola', 'Duferco Energia', 'Nen', 'Tate Energia', 'Acea Energia',
    'Heracomm', 'Repower', 'Enel Servizio Elettrico', 'Servizio Elettrico Nazionale',
  ],
  gas: [
    'Octopus Energy', 'Illumia', 'Engie', 'Sorgenia', 'Wekiwi', 'NWG Energia',
    'VIVI Energia', 'Dolomiti Energia', 'Alperia', 'Agsm Aim',
    'E.ON', 'Green Network', 'Optima Italia', 'Pulsee',
    'Duferco Energia', 'Nen', 'Tate Energia', 'Acea Energia',
    'Heracomm', 'Italgas', 'Gas Plus', '2i Rete Gas',
  ],
  acqua: [
    'Iren Acqua', 'Reggiana Gas Acqua', 'Publiacqua', 'Acque SpA',
    'Abbanoa', 'SMAT Torino', 'Veritas Venezia', 'Padania Acque',
    'Lario Reti Holding', 'BrianzAcque', 'Aimag', 'ENIA',
    'CAP Holding', 'GAIA SpA', 'Acqua Novara VCO', 'Alto Calore',
    'Acquedotto Lucano', 'Siciliacque', 'AMAP Palermo',
  ],
  telefono: [
    'PosteMobile', 'CoopVoce', 'Very Mobile', 'Kena Mobile', 'Spusu',
    'Tiscali', 'Lycamobile', 'Rabona Mobile', 'Daily Telecom',
  ],
  internet: [
    'Tiscali', 'Eolo', 'Pianeta Fibra', 'Linkem', 'Open Fiber',
    'Starlink', 'Dimensione', 'Ehiweb', 'Planetel',
  ],
  assicurazione: [
    'Sara Assicurazioni', 'Cattolica', 'Linear', 'Genialloyd', 'ConTe.it',
    'Prima Assicurazioni', 'Verti', 'Direct Line', 'MetLife', 'Aviva',
    'Helvetia', 'Reale Mutua', 'Groupama', 'HDI Assicurazioni',
  ],
  abbonamento: [
    'Apple Music', 'Apple TV+', 'iCloud+', 'Now TV', 'Paramount+',
    'Crunchyroll', 'Tim Vision', 'Infinity+', 'Xbox Game Pass',
    'PlayStation Plus', 'Nintendo Switch Online', 'Audible',
    'Kindle Unlimited', 'Dropbox', 'Google One', 'Microsoft 365',
    'Adobe Creative Cloud', 'Canva Pro', 'ChatGPT Plus', 'Claude Pro',
    'Gym/Palestra', 'Corriere della Sera', 'Il Sole 24 Ore', 'Repubblica',
  ],
  finanziamento: [],
  f24: [],
  pagopa: [],
  altro: [],
}

// Funzione di ricerca: cerca in fornitori principali + estesi
export const cercaFornitore = (categoria, query) => {
  if (!query || query.length < 2) return []
  const q = query.toLowerCase()
  const principali = FORNITORI[categoria] || []
  const estesi = FORNITORI_ESTESI[categoria] || []
  const tutti = [...new Set([...principali, ...estesi])]
  return tutti.filter(f => f.toLowerCase().includes(q))
}

export const PORTALI_PAGAMENTO = {
  'Enel Energia': 'https://www.enel.it/it-it/login',
  'Edison': 'https://www.edison.it/area-clienti',
  'A2A': 'https://www.a2a.it/area-clienti',
  'Iren': 'https://www.irenlucegas.it/area-riservata',
  'Hera': 'https://www.gruppohera.it/clienti',
  'ENI Plenitude': 'https://eniplenitude.com/area-clienti',
  'Acquedotto Pugliese': 'https://www.aqp.it/area-clienti',
  'MM Milano': 'https://www.metropolitanamilanese.it/area-clienti',
  'ACEA': 'https://www.acea.it/area-clienti',
  'TIM': 'https://www.tim.it/area-clienti',
  'Vodafone': 'https://www.vodafone.it/area-personale',
  'WindTre': 'https://www.windtre.it/area-clienti',
  'Iliad': 'https://www.iliad.it/account',
  'Fastweb': 'https://www.fastweb.it/myfastweb',
  'Sky WiFi': 'https://www.sky.it/mysky',
  'UnipolSai': 'https://www.unipolsai.it/area-riservata',
  'Allianz': 'https://www.allianz.it/area-clienti',
  'Generali': 'https://www.generali.it/area-clienti',
  'AXA': 'https://www.axa.it/area-clienti',
  'Zurich': 'https://www.zurich.it/area-clienti',
  'Netflix': 'https://www.netflix.com/account',
  'Spotify': 'https://www.spotify.com/account',
  'Amazon Prime': 'https://www.amazon.it/gp/primecentral',
  'Disney+': 'https://www.disneyplus.com/account',
  'DAZN': 'https://www.dazn.com/account',
  'YouTube Premium': 'https://www.youtube.com/paid_memberships',
  'Apple One': 'https://appleid.apple.com/account/manage',
  'NWG': 'https://www.nwgenergia.it/area-clienti',
  'NWG Energia': 'https://www.nwgenergia.it/area-clienti',
  'American Express': 'https://global.americanexpress.com/login/it-it',
  'Amex': 'https://global.americanexpress.com/login/it-it',
  'VIVI Energia': 'https://www.vivienergia.it/area-clienti',
  'Azienda Reggiana Acqua': 'https://www.reggianagasacqua.it/area-clienti',
  'Sky': 'https://www.sky.it/mysky',
  'Mooney': 'https://www.mooney.it/area-riservata',
  'iCloud': 'https://appleid.apple.com/account/manage',
  'Apple iCloud': 'https://appleid.apple.com/account/manage',
  'Claude': 'https://console.anthropic.com/settings/billing',
  'IRETI': 'https://www.irenlucegas.it/area-riservata',
  'Iren Acqua': 'https://www.irenlucegas.it/area-riservata',
  'Reggiana Gas Acqua': 'https://www.reggianagasacqua.it/area-clienti',
  'Octopus Energy': 'https://octopusenergy.it/area-clienti',
  'Illumia': 'https://www.illumia.it/area-clienti',
  'Engie': 'https://www.engie.it/area-clienti',
  'Sorgenia': 'https://www.sorgenia.it/area-clienti',
  'Wekiwi': 'https://www.wekiwi.it/area-clienti',
  'Pulsee': 'https://www.pulsee.it/area-clienti',
  'Nen': 'https://nen.it/area-personale',
  'ho. Mobile': 'https://www.ho-mobile.it/area-personale',
  'PosteMobile': 'https://www.postemobile.it/area-personale',
  'Very Mobile': 'https://www.verymobile.it/area-personale',
  'Eolo': 'https://www.eolo.it/area-clienti',
  'Gruppo CAP': 'https://www.gruppocap.it/area-clienti',
  'Dolomiti Energia': 'https://www.dolomitienergia.it/area-clienti',
  'Alperia': 'https://www.alperia.eu/area-clienti',
  'E.ON': 'https://www.eon-energia.com/area-clienti',
  'Tate Energia': 'https://www.tateforyou.com/area-personale',
}

export const getCategoria = (id) => CATEGORIE.find(c => c.id === id) || CATEGORIE[CATEGORIE.length - 1]

// Categorie per le spese giornaliere (diverse da quelle contratti)
export const CATEGORIE_SPESE = [
  { id: 'alimentari', label: 'Alimentari', icon: 'ShoppingCart', color: '#22c55e' },
  { id: 'trasporti', label: 'Trasporti', icon: 'Car', color: '#3b82f6' },
  { id: 'svago', label: 'Svago', icon: 'Gamepad2', color: '#a855f7' },
  { id: 'salute', label: 'Salute', icon: 'Heart', color: '#ef4444' },
  { id: 'casa', label: 'Casa', icon: 'Home', color: '#f59e0b' },
  { id: 'abbigliamento', label: 'Shopping', icon: 'Shirt', color: '#ec4899' },
  { id: 'ristorazione', label: 'Ristoranti', icon: 'UtensilsCrossed', color: '#f97316' },
  { id: 'altro_spesa', label: 'Altro', icon: 'MoreHorizontal', color: '#6b7280' },
]

export const getCategoriaSpesa = (id) => CATEGORIE_SPESE.find(c => c.id === id) || CATEGORIE_SPESE[CATEGORIE_SPESE.length - 1]
