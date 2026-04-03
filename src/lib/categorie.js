export const CATEGORIE = [
  { id: 'luce', label: 'Luce', icon: 'Zap', color: '#f59e0b' },
  { id: 'gas', label: 'Gas', icon: 'Flame', color: '#ef4444' },
  { id: 'acqua', label: 'Acqua', icon: 'Droplets', color: '#3b82f6' },
  { id: 'telefono', label: 'Telefono', icon: 'Phone', color: '#8b5cf6' },
  { id: 'internet', label: 'Internet', icon: 'Wifi', color: '#06b6d4' },
  { id: 'assicurazione', label: 'Assicurazione', icon: 'Shield', color: '#10b981' },
  { id: 'abbonamento', label: 'Abbonamento', icon: 'Tv', color: '#ec4899' },
  { id: 'finanziamento', label: 'Finanziamento', icon: 'CreditCard', color: '#f97316', freeText: true, placeholder: 'es. Rata lavatrice, Prestito auto...' },
  { id: 'f24', label: 'F24', icon: 'Landmark', color: '#0d9488', freeText: true, placeholder: 'es. Acconto IRPEF, Saldo IVA...' },
  { id: 'pagopa', label: 'PagoPA', icon: 'Landmark', color: '#0891b2', freeText: true, placeholder: 'es. TARI 2026, Bollo auto...' },
  { id: 'altro', label: 'Altro', icon: 'Package', color: '#6b7280', freeText: true, placeholder: 'es. Condominio, Affitto box...' },
]

export const FORNITORI = {
  luce: ['Enel Energia', 'Edison', 'A2A', 'Iren', 'Hera'],
  gas: ['ENI Plenitude', 'Enel Energia', 'Edison', 'A2A', 'Iren'],
  acqua: ['Acquedotto Pugliese', 'MM Milano', 'ACEA', 'Hera'],
  telefono: ['TIM', 'Vodafone', 'WindTre', 'Iliad', 'Fastweb'],
  internet: ['Fastweb', 'TIM', 'Vodafone', 'WindTre', 'Sky WiFi'],
  assicurazione: ['UnipolSai', 'Allianz', 'Generali', 'AXA', 'Zurich'],
  abbonamento: ['Netflix', 'Spotify', 'Amazon Prime', 'Disney+', 'DAZN', 'YouTube Premium', 'Apple One'],
  finanziamento: [],
  f24: [],
  pagopa: [],
  altro: [],
}

export const getCategoria = (id) => CATEGORIE.find(c => c.id === id) || CATEGORIE[CATEGORIE.length - 1]
