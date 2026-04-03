# Bill Wallet — Guida al Deploy

## Cosa ti serve (tutto gratuito)

1. Un account **Supabase** (database + autenticazione) — supabase.com
2. Un account **Vercel** (hosting app) — vercel.com
3. Un account **GitHub** (per collegare il codice a Vercel) — github.com

## Passo 1: Crea il database su Supabase

1. Vai su supabase.com e crea un account (puoi usare il login con GitHub)
2. Clicca "New Project", scegli un nome (es. "bill-wallet"), una password per il database, e la regione "West EU"
3. Aspetta che il progetto sia pronto (1-2 minuti)
4. Nel menu a sinistra, clicca "SQL Editor"
5. Incolla tutto il contenuto del file `supabase-schema.sql` e clicca "Run"
6. Vai in "Project Settings" > "API" e copia questi due valori (ti serviranno dopo):
   - **Project URL** (es. `https://abc123.supabase.co`)
   - **anon public key** (la chiave lunga che inizia con `eyJ...`)

## Passo 2: Carica il codice su GitHub

1. Vai su github.com, accedi, e clicca "New repository"
2. Nome: `bill-wallet`, lascia tutto il resto come sta, clicca "Create repository"
3. Carica tutti i file della cartella `bill-wallet-app` nel repository (puoi trascinarli direttamente nella pagina GitHub)

## Passo 3: Pubblica su Vercel

1. Vai su vercel.com e accedi con il tuo account GitHub
2. Clicca "Add New" > "Project"
3. Seleziona il repository `bill-wallet` dalla lista
4. Prima di cliccare deploy, espandi "Environment Variables" e aggiungi:
   - `VITE_SUPABASE_URL` = il Project URL copiato al passo 1
   - `VITE_SUPABASE_ANON_KEY` = la chiave anon copiata al passo 1
5. Clicca "Deploy" e aspetta 1-2 minuti
6. Vercel ti dà un URL tipo `bill-wallet-abc.vercel.app` — quella è la tua app

## Passo 4: Configura l'autenticazione

1. Torna su Supabase, vai in "Authentication" > "URL Configuration"
2. In "Site URL" metti l'URL di Vercel (es. `https://bill-wallet-abc.vercel.app`)
3. In "Redirect URLs" aggiungi lo stesso URL

## Passo 5: Testa e condividi

1. Apri l'URL di Vercel dal telefono
2. Registrati con email e password
3. Per "installare" l'app sulla schermata home:
   - **iPhone**: Safari > icona condividi > "Aggiungi alla schermata Home"
   - **Android**: Chrome > menu tre puntini > "Aggiungi a schermata Home"
4. Condividi il link con chi vuoi far testare

## Struttura dei file

```
bill-wallet-app/
  supabase-schema.sql    → SQL da eseguire su Supabase
  package.json           → Dipendenze del progetto
  vite.config.js         → Configurazione build + PWA
  tailwind.config.js     → Configurazione stili
  postcss.config.js      → PostCSS per Tailwind
  index.html             → Pagina HTML base
  .env.example           → Template variabili d'ambiente
  public/                → Icone PWA (da aggiungere)
  src/
    main.jsx             → Punto di ingresso React
    index.css            → Stili globali + Tailwind
    App.jsx              → Componente principale con tutte le schermate
    lib/
      supabase.js        → Connessione a Supabase
      database.js        → Funzioni per leggere/scrivere dati
      categorie.js       → Categorie e fornitori
      helpers.js         → Funzioni di formattazione
    components/
      Auth.jsx           → Schermata login/registrazione
```

## Icone PWA

Per completare la PWA servono le icone nella cartella `public/`:
- `icon-192.png` (192x192 pixel)
- `icon-512.png` (512x512 pixel)
- `apple-touch-icon.png` (180x180 pixel)

Puoi crearle con qualsiasi tool di grafica o chiedere a me di generarle.

## Note

- Il piano gratuito di Supabase include 500MB di database e 50.000 utenti — più che sufficiente per il test
- Vercel gratuito include hosting illimitato per progetti personali
- I dati sono reali e persistenti — ogni tester ha il suo account
- L'app funziona offline per la navigazione (PWA), ma serve connessione per salvare dati
