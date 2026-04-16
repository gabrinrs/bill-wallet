
/
Ciao! Siamo al lavoro sul progetto Bolly (app aggregatore bollette). La pipeline email è completamente funzionante: Mailgun → Make.com → Claude API → Supabase con matching automatico del contratto.
Oggi voglio procedere con questi punti (in ordine di priorità):

Test con altri fornitori reali (Vodafone, Iren, A2A, ecc.) per verificare che il matching e l'auto-creazione contratto funzionino su più tipi di bollette
Pulizia doppioni contratti in Supabase — durante i test si sono creati contratti duplicati (es. "NWG" e "NWG Energia S.P.A."), da rimuovere o unificare
UI per bollette orfane — frontend per collegare manualmente una bolletta a un contratto nel caso il matching fallisca
Gestione errori in Make.com — cosa succede se il PDF non è leggibile o Claude restituisce null Controlla la memoria per il contesto completo prima di iniziare.
Mostra altro

5 memorie lette, strumenti caricati
5 memorie lette, strumenti caricati
Contesto caricato. Prima di partire, ragiono sul piano in termini di prodotto e ti faccio qualche domanda per non andare nella direzione sbagliata.

Come vedo le 4 priorità:

Test multi-fornitore — qui il lavoro è principalmente tuo: devi inoltrare bollette vere (Vodafone, Iren, A2A…) al tuo indirizzo dedicato. Io posso stare pronto a sistemare il prompt Claude o lo schema JSON se qualcosa fallisce, ma non posso "testare" in autonomia senza PDF reali.
Pulizia doppioni — questo ha senso farlo prima dei test multi-fornitore, perché ogni nuovo fornitore ne creerà altri se non risolviamo la causa (nomi estratti da Claude in forme diverse). Serve sia la pulizia una-tantum, sia una regola per il futuro (normalizzazione nomi).
UI bollette orfane — lavoro frontend classico (modifica App.jsx, copia .txt per github.dev). Decisione UX: dove vive la lista bollette orfane?
Gestione errori Make.com — scelta di strategia: la bolletta illeggibile sparisce, o viene salvata in qualche forma visibile a te?
Prima di scrivere codice o SQL, ho bisogno di allinearmi su tre scelte chiave:

Per la pulizia doppioni contratti: che strategia preferisci?
Normalizzazione automatica (Raccomandato)
Per la UI bollette orfane: dove dovrebbe vivere?
Banner in Dashboard (Raccomandato)
Per gli errori Make.com (PDF illeggibile, Claude ritorna null): cosa fare?
Salva comunque come orfana (Raccomandato)
Perfetto, tutte le scelte raccomandate. Riorganizzo il piano: parto dalla pulizia doppioni perché blocca i test multi-fornitore (altrimenti ogni nuovo fornitore genera nuovi doppioni).


Lista delle cose da fare aggiornata
Lista delle cose da fare aggiornata
Step 1 — Analisi doppioni (serve il tuo aiuto)

Per capire quanti e quali doppioni hai, lanciamo una query diagnostica. Apri Supabase → SQL Editor e lancia questa:

sql
-- Trova fornitori simili per stesso utente (stessi primi 4 caratteri, case-insensitive)
SELECT
  c1.user_id,
  c1.id AS id_contratto,
  c1.fornitore,
  c1.categoria,
  c1.created_at,
  (SELECT COUNT(*) FROM bollette b WHERE b.contratto_id = c1.id) AS n_bollette
FROM contratti c1
WHERE EXISTS (
  SELECT 1 FROM contratti c2
  WHERE c2.user_id = c1.user_id
    AND c2.id != c1.id
    AND LOWER(LEFT(TRIM(c2.fornitore), 4)) = LOWER(LEFT(TRIM(c1.fornitore), 4))
)
ORDER BY c1.user_id, LOWER(LEFT(TRIM(c1.fornitore), 4)), c1.created_at;
Questa mi mostra tutti i gruppi di contratti che potrebbero essere doppioni (es. "NWG" e "NWG Energia S.P.A." verranno raggruppati perché iniziano entrambi con "NWG ").

Cosa fare poi:

Incollami il risultato (anche solo screenshot o copia-incolla della tabella), e io ti preparo:

uno script SQL personalizzato per unificare ciascun gruppo (scegliendo il nome più completo come "canonico" e riassegnando le bollette)
una copia .txt pronta da incollare in SQL Editor
Nel frattempo, mi dici una cosa: per la regola di normalizzazione futura, preferisci che Make.com cerchi match per primi 4 caratteri (es. "NWG " matcha "NWG Energia") o che sia più conservativo (es. prime 6-8 caratteri)? I 4 caratteri sono più aggressivi ma possono causare falsi positivi (es. "Enel Energia" e "Enel Gas" sarebbero visti come uguali — ma visto che filtriamo anche per user_id, dovrebbe essere raro).

Dimmi come vuoi procedere e lanciamo la query.

mi dice solo Success. No rows returned


Processo di ragionamento
Processo di ragionamento
Ok, il problema è tecnico: "NWG" ha solo 3 caratteri, quindi LEFT(..., 4) diventa "NWG" per uno e "NWG " (con spazio) per l'altro — non matchano. Rifacciamo con una regola più robusta: confronto sulla prima parola (prima dello spazio). Lancia questa:

sql
-- Versione 2: confronto sulla PRIMA PAROLA del fornitore
SELECT
  c1.user_id,
  c1.id AS id_contratto,
  c1.fornitore,
  c1.categoria,
  c1.created_at,
  (SELECT COUNT(*) FROM bollette b WHERE b.contratto_id = c1.id) AS n_bollette,
  LOWER(SPLIT_PART(TRIM(c1.fornitore), ' ', 1)) AS prima_parola
FROM contratti c1
WHERE EXISTS (
  SELECT 1 FROM contratti c2
  WHERE c2.user_id = c1.user_id
    AND c2.id != c1.id
    AND LOWER(SPLIT_PART(TRIM(c2.fornitore), ' ', 1)) = LOWER(SPLIT_PART(TRIM(c1.fornitore), ' ', 1))
)
ORDER BY c1.user_id, prima_parola, c1.created_at;
Se anche questa non ritorna nulla, allora o i doppioni sono già stati puliti, oppure hanno nomi totalmente diversi (es. "Enel" vs "Enel Energia S.p.A." sì, ma "NWG" potrebbe essere stato salvato tutto come "NWG Energia S.P.A." da entrambe le esecuzioni).

Per essere sicuri, lanciami anche questa query semplice che mostra tutti i contratti per controllare a occhio:

sql
SELECT id, user_id, fornitore, categoria, created_at
FROM contratti
ORDER BY user_id, LOWER(fornitore), created_at;
Incollami il risultato di quest'ultima (anche tutto) — così vediamo la situazione reale e capiamo se c'è davvero un problema di doppioni o se era solo una percezione durante i test.

ancora Success. No rows returned. ma ho controllato e nei contratti non ci sono doppioni, tutti fornitori singoli

per make.com secondo me va bene sui primi 4 caratteri


Processo di ragionamento
Processo di ragionamento
Perfetto, allora step 1 è già a posto (tabella pulita). Passo al prossimo: normalizzazione in Make.com sui primi 4 caratteri.


Lista delle cose da fare aggiornata
Lista delle cose da fare aggiornata
Step 2 — Normalizzazione match fornitore in Make.com

Ragionamento di prodotto: oggi il Search Rows cerca il match esatto del fornitore. Vogliamo che cerchi il match parziale sui primi 4 caratteri (case-insensitive). Così "NWG" matcha "NWG Energia S.P.A." ed evitiamo doppioni futuri.

Approccio più pulito: creo una funzione RPC in Supabase che fa il match e la chiamiamo da Make.com. Più robusta dell'HTTP con ilike (che ha dato problemi per gli spazi) e del filtro nativo (che non supporta LIKE con prefissi dinamici).

Azione 1 — In Supabase SQL Editor, lancia questo:

sql
CREATE OR REPLACE FUNCTION match_contratto(
  p_fornitore text,
  p_user_id uuid
)
RETURNS SETOF contratti
LANGUAGE sql
SECURITY INVOKER
AS $$
  SELECT *
  FROM contratti
  WHERE user_id = p_user_id
    AND LOWER(LEFT(TRIM(fornitore), 4)) = LOWER(LEFT(TRIM(p_fornitore), 4))
  ORDER BY created_at ASC
  LIMIT 1;
$$;
Questa funzione: prende il nome fornitore estratto da Claude + l'user_id, e ritorna il primo contratto dello stesso utente che inizia con gli stessi 4 caratteri (trimmati, ignorando maiuscole). Se non trova nulla, ritorna zero righe.

Azione 2 — In Make.com, modifica il modulo 24 (Search Rows contratti):

Il modulo attuale Search Rows va sostituito con un modulo Call a Postgres Function (sempre in Supabase connector). Impostazioni:

Function name: match_contratto
Parameters:
p_fornitore → {{9.fornitore}}
p_user_id → {{15.id}}
Il modulo ritorna 0 o 1 contratto. Il router a valle continua a usare length({{24.id}}) > 0 / = 0 come oggi — nessuna modifica al router.

Perché funziona meglio:

Nessun problema di URL encoding (il gotcha HTTP già noto)
Filtro calcolato lato DB (veloce anche con molti contratti)
Funzione riusabile anche per la UI bollette orfane (stesso match lato frontend)
Fammi sapere quando hai:

lanciato la SQL in Supabase (dovrebbe dire "Success. No rows returned" = normale, è una CREATE FUNCTION)
modificato il modulo 24 in Make.com
Poi faccio un test mentale insieme a te prima di passare al prossimo step (gestione errori + colonna stato_elaborazione).

azione 1. success. no rows returned.

azione 2. ho eliminato il Search Rows, ma nei moduli supabase non esiste un Call a Postgres Function


Processo di ragionamento
Processo di ragionamento
Giusto, nel connettore Supabase di Make.com non c'è la function nativa. Usiamo "Make an API Call" (stesso connettore Supabase, è un'azione generica che espone l'API REST). Funziona uguale.

Configurazione modulo "Make an API Call" (al posto del vecchio Search Rows, modulo 24):

URL: /rest/v1/rpc/match_contratto
Method: POST
Headers: lascia vuoto (il connector aggiunge in automatico auth + Content-Type)
Query String: lascia vuoto
Body type: Raw
Content type: JSON (application/json)
Request content:
json
{
  "p_fornitore": "{{9.fornitore}}",
  "p_user_id": "{{15.id}}"
}
(nel campo Request content, il valore {{9.fornitore}} e {{15.id}} li selezioni dalla lista variabili come sempre — non scriverli a mano)

Cosa ritorna: un array. Se trova il contratto → [{id, fornitore, ...}]. Se non trova → [].

Aggiornamento filtri del Router (modulo 20) — IMPORTANTE:

Prima il router usava {{24.id}}. Ora la reference cambia perché il nuovo modulo ritorna un array dentro data. I nuovi filtri diventano:

Strada 1 "Contratto trovato": length({{24.data}}) > 0
Strada 2 "Nessun contratto": length({{24.data}}) = 0
Aggiornamento Strada 1 (modulo 6 — Create a Row bollette):

Nel campo contratto_id sostituisci {{24.id}} con {{24.data[1].id}}
(In Make.com gli array partono da 1, non 0 — quindi [1] è il primo elemento)
Strada 2 resta invariata (sempre {{21.id}} dal Create contratti).

Due note pratiche:

Prima di salvare, nel modulo Make an API Call controlla in alto a destra: c'è un campo Connection che dovrebbe già puntare alla connessione Supabase esistente (la stessa del vecchio Search Rows). Se non c'è, crea nuova connessione con la stessa URL + service_role key che usi negli altri moduli.
Se il nuovo modulo prende un numero diverso da 24 (es. 25 o 26 perché l'hai ricreato), sostituisci tutti i 24. con il nuovo numero nei filtri router e nel mapping.
Dimmi quando hai configurato e proviamo con un "Run once" inviando una bolletta di test al tuo indirizzo dedicato.

nel Make an API Call posso modificare solo headers, query string e body


Processo di ragionamento
Processo di ragionamento
Ok, il modulo Supabase di Make.com non permette di cambiare URL/method. Cambio approccio: torniamo al Search Rows ma con un filtro ilike sui primi 4 caratteri. Più semplice e usa solo moduli nativi.

Scarta il "Make an API Call" (eliminalo) e rimetti un modulo Supabase → Search Rows con queste impostazioni:

Table: contratti
Filter:
Campo 1: user_id — operatore eq (equals) — valore: {{15.id}}
Campo 2 (AND): fornitore — operatore ilike (case insensitive like) — valore: {{substring(9.fornitore; 0; 4)}}%
Limit: 1
Come funziona il valore del filtro fornitore:

substring(9.fornitore; 0; 4) prende i primi 4 caratteri del nome fornitore estratto da Claude (es. da "NWG Energia S.P.A." estrae "NWG ")
% alla fine è il wildcard SQL: significa "qualsiasi cosa dopo"
Il risultato è un filtro tipo "fornitore inizia con NWG " → matcha anche "NWG Energia S.P.A.", "NWG Gas", ecc.
ilike = case-insensitive, quindi "nwg" matcha "NWG"
Nel campo Filter di Make.com:

Il valore lo costruisci selezionando la funzione substring dal menu variabili, poi dentro metti {{9.fornitore}}, 0, 4, e subito dopo digiti % a mano.
Visivamente nel campo vedrai: substring(9.fornitore; 0; 4)%
Router e mapping restano come l'originale:

Filtri Router: length({{24.id}}) > 0 e length({{24.id}}) = 0 (come prima)
Strada 1 mapping: contratto_id = {{24.id}} (come prima)
Non serve più la sintassi .data[1] perché Search Rows ritorna il record direttamente come modulo 24.
Una cosa da eliminare: la funzione SQL match_contratto creata prima in Supabase ora è inutile. Puoi lasciarla (non fa danno) o eliminarla con:

sql
DROP FUNCTION match_contratto(text, uuid);
Fammi sapere quando hai riconfigurato il Search Rows — poi passiamo al test.

no no nel Make an API Call ho già inserito l'url e il method, ma oltre a quelli ho solo headers, query string e body.

non ci sono Body type,Content type,Request content


Processo di ragionamento
Processo di ragionamento
Ok chiaro — nei connector Supabase di Make il body è un campo unico senza sotto-opzioni. Ma in ogni caso abbandoniamo quell'approccio: mi hai fatto notare che hai già eliminato il Search Rows, quindi ora il piano è diverso.

Cosa fare adesso:

Elimina anche il modulo "Make an API Call" che stavi configurando (non lo useremo)
Rimetti al suo posto un modulo Supabase → Search Rows (lo stesso tipo che c'era prima, modulo 24)
Configuralo così:
Table: contratti
Filter → Add AND rule:
Riga 1: user_id / eq (equals) / valore {{15.id}}
Riga 2: fornitore / ilike (case insensitive like) / valore substring(9.fornitore; 0; 4)%
(costruisci il valore: clicca nel campo, dal menu variabili sezione "String" scegli substring, poi come primo argomento seleziona 9.fornitore, secondo argomento 0, terzo 4. Alla fine, fuori dalla funzione, digita a mano il carattere %)
Limit: 1
Questo sostituisce il vecchio filtro di match esatto con uno che cattura anche le varianti del nome fornitore.

Il resto dello scenario (Router e mapping) resta come era prima di oggi — niente da modificare.

Dimmi quando il Search Rows è configurato e procediamo al test.

nella riga 2 non esiste il filtro ilike (case insensitive like). c'è contains (case insensitive). va bene?


Processo di ragionamento
Processo di ragionamento
Sì va benissimo — anzi, semplifica. contains (case insensitive) cerca la sottostringa ovunque nel testo e si occupa da solo dei wildcard.

Unica modifica: togli il % finale dal valore. Diventa:

Riga 2: fornitore / contains (case insensitive) / valore: substring(9.fornitore; 0; 4)
Così, se Claude estrae "NWG Energia S.P.A.", il filtro cerca contratti che contengono "NWG " (primi 4 caratteri, spazio incluso) → matcha "NWG Energia S.P.A." ma anche eventuali altre varianti. Il filtro su user_id assicura che stiamo cercando solo tra i tuoi contratti, quindi niente rischio falsi positivi.

Salva lo scenario e dimmi fatto — poi faccio il checkpoint e passiamo al test con una bolletta reale.

ok il nuovo modulo supabase che ha numero 26 è a posto. però adesso il modulo supabase 6 ha ancora i dati del precedente modulo in contratto id. sostituisco con 26.id?

Esatto, sostituisci con {{26.id}}.

E non dimenticare di aggiornare anche i filtri del Router (modulo 20):

Strada 1 "Contratto trovato": length({{26.id}}) > 0
Strada 2 "Nessun contratto": length({{26.id}}) = 0
Quindi in totale 3 riferimenti da cambiare da 24 a 26:

Filtro Strada 1 Router
Filtro Strada 2 Router
Campo contratto_id nel modulo 6 (Create Row bollette, Strada 1)
La Strada 2 (modulo 21 Create contratti + modulo 22 Create bollette) resta invariata — il {{21.id}} del contratto appena creato è già corretto.

Salva e dimmi fatto — poi facciamo un Run once di test.

ho fatto un test con una bolletta diversa da nwg ma ha dato problemi. riprovo per sicurezza


Processo di ragionamento
Processo di ragionamento
Ok, aspetto. Quando hai il risultato del secondo tentativo dimmi:

Dove si è fermato (quale modulo si è colorato di rosso nell'execution history di Make.com)
Il messaggio di errore (si apre cliccando sul modulo rosso → "Error")
Così capiamo se è un problema di:

Claude API (PDF diverso, prompt che non estrae bene)
Search Rows nuovo (filtro non trova nulla ma dovrebbe)
Router (filtri non matchano)
Create Row (qualche campo null che non piace a Supabase)
ok è andato. ha seguito la strada 2 perchè giustamente era un contratto nuovo. vuoi vedere qualche dato?

Ottimo, la Strada 2 ha funzionato — nuovo fornitore → contratto creato → bolletta collegata. Sì, fammi vedere qualche dato per fare un checkpoint veloce. In particolare mi interessa:

Dal modulo 9 (Parse JSON Claude): i campi fornitore, categoria, importo_euro, data_scadenza, confidenza — così verifico che Claude stia estraendo bene anche fornitori diversi da NWG
Dal modulo 21 (Create contratto): cosa è stato salvato — fornitore, categoria, user_id
Dal modulo 22 (Create bolletta): contratto_id, importo, scadenza, fonte
Puoi incollare screenshot o copia-incolla dei campi. Così vedo se il matching futuro funzionerà (es. se la prossima bolletta dello stesso fornitore trova il contratto appena creato).

modulo 9

fornitore Azienda Reggiana per la Cura dell'Acqua S.r.l.
categoria acqua
importo 94.78
scadenza 2026-04-20
confidenza non c'è nell'elenco
modulo 21
fornitore: Azienda Reggiana per la Cura dell'Acqua S.r.l.
categoria: acqua
user_id: 5ff3770d-500b-46b8-bac1-272a13e0ee0c

modulo 22
contratto_id: 20
importo: 94.78
scadenza: 20 aprile 2026 00:00
fonte: email

Mostra altro

Processo di ragionamento
Processo di ragionamento
Dati perfetti. Claude estrae bene anche un fornitore con nome complesso come "Azienda Reggiana per la Cura dell'Acqua S.r.l." — categoria corretta (acqua), importo e scadenza esatti. La Strada 2 ha funzionato e il matching futuro è pronto: la prossima bolletta di questo fornitore matcherà su "Azie" (primi 4 caratteri) e troverà il contratto #20 appena creato.

Una nota minore sul campo confidenza: non compare più nell'output — probabilmente il prompt v2 non lo restituisce o il Parse JSON non lo mappa. Non è critico (non lo usiamo per logica), ma utile come diagnostica. Se vuoi lo rimettiamo in un secondo momento.


Lista delle cose da fare aggiornata
Lista delle cose da fare aggiornata
Step 3 — Preparare il DB per la gestione errori

Ragionamento di prodotto: oggi una bolletta può essere "buona" (salvata correttamente) o "persa" (Claude fallisce, Make.com si ferma, tu non te ne accorgi). Vogliamo un terzo stato: "da rivedere" — salvata nel DB ma con un flag che dice "i dati potrebbero essere sbagliati, controlla". Queste bollette appariranno nel banner giallo della Dashboard.

Tre casi che vogliamo gestire:

PDF illeggibile (Claude non estrae nulla): salviamo con stato errore_parsing, solo pdf_url valorizzato
Dati parziali (Claude estrae fornitore ma non importo/scadenza): stato incompleta
Dati completi ma nessun contratto match (già oggi funziona via Strada 2): stato ok
Azione — in Supabase SQL Editor lancia:

sql
-- Aggiungo colonna per tracciare lo stato di elaborazione della bolletta
ALTER TABLE bollette
ADD COLUMN stato_elaborazione text DEFAULT 'ok';

-- Vincolo per evitare valori inaspettati
ALTER TABLE bollette
ADD CONSTRAINT check_stato_elaborazione
CHECK (stato_elaborazione IN ('ok', 'incompleta', 'errore_parsing', 'orfana'));

-- Aggiorno le bollette esistenti: se hanno contratto_id null le marco come 'orfana'
UPDATE bollette
SET stato_elaborazione = 'orfana'
WHERE contratto_id IS NULL;
Significato dei 4 stati:

ok — bolletta completa e collegata a un contratto (caso normale, default)
orfana — dati completi ma nessun contratto associato (caso raro ora che abbiamo Strada 2, ma possibile se l'utente cancella un contratto con bollette dentro)
incompleta — Claude ha estratto il PDF ma mancano campi critici (importo o scadenza nulli)
errore_parsing — Claude ha fallito del tutto, abbiamo solo il PDF
Lancia e dimmi fatto — poi passiamo alla modifica dello scenario Make.com per popolare questo campo correttamente nei vari casi.

fatto. poi ho anche una domanda tecnica

Perfetto, colonna creata. Dimmi pure la domanda — rispondo prima e poi passiamo al prossimo step (logica Make.com per popolare stato_elaborazione).

alcuni fornitori sono multi servizi. quindi per dire vodafone può fare telefono e luce. iren può fare luce e gas..o a volte anche 3 servizi.

in che modo possiamo tracciare questo tipo di bollette


Processo di ragionamento
Processo di ragionamento
Ottima domanda, è un edge case importante. Te lo spiego in termini di prodotto.

Il problema: oggi il matching Strada 1 cerca solo per fornitore (primi 4 caratteri). Quindi se hai "Iren luce" come contratto e arriva una bolletta Iren gas, il sistema la collega al contratto luce sbagliato. Peggio: se non ce l'hai, la Strada 2 crea un nuovo contratto "Iren" con categoria "gas", ma la prossima bolletta luce matcherà questo (perché inizia con "Iren") e sarà collegata male.

La soluzione di prodotto: ogni combinazione fornitore + categoria è un contratto separato. Questo riflette la realtà fiscale — Iren ti manda 2 bollette distinte per luce e gas, con codici cliente diversi. Vodafone fibra e Vodafone mobile sono offerte commerciali distinte con contratti separati. Sarebbero confuse se le tenessimo insieme.

Come applicarla: basta aggiungere un filtro in più al modulo Search Rows (modulo 26). Oggi ha 2 filtri (user_id + fornitore), aggiungiamo il terzo.

Azione — modulo 26 (Search Rows contratti), aggiungi un AND:

Riga 3: categoria / eq (equals) / valore: {{9.categoria}}
Il filtro completo diventa:

user_id eq {{15.id}}
fornitore contains (ci) substring(9.fornitore; 0; 4)
categoria eq {{9.categoria}}
Cosa succede ora:

Bolletta Iren luce → cerca contratto con fornitore ~"Iren" AND categoria="luce" → trova/crea quello giusto
Bolletta Iren gas → cerca con fornitore ~"Iren" AND categoria="gas" → trova/crea un contratto separato
Se Iren diventa anche tuo fornitore internet domani, nasce un terzo contratto distinto
Beneficio extra: lo storico consumi per categoria diventa preciso (puoi vedere "ho speso X per il gas nel 2026"), e le scadenze restano tracciate separatamente.

Futuro (non ora): nella Dashboard possiamo raggruppare visivamente "I tuoi contratti Iren (2)" per non far sembrare confusa la lista — ma nel DB restano distinti. È un abbellimento UI da valutare quando avrai 5-10 contratti attivi.

Rischio residuo: se Claude sbaglia a estrarre la categoria (es. mette "telefono" invece di "internet" su una bolletta Vodafone fibra), si crea un contratto doppione. Lo vedremo nei test multi-fornitore e in caso rinforziamo il prompt.

Aggiungi il filtro categoria al Search Rows e dimmi fatto. Poi passiamo a come popolare stato_elaborazione nei vari casi.

Immagine caricata
image.jpeg
no, spesso se hai un unico fornitore ti manda un'unica bolletta, ti mando un esempio


Processo di ragionamento
Processo di ragionamento
Caso importante — grazie per l'esempio concreto. VIVI Energia ti fattura una bolletta unica con più servizi dentro (luce 64,55 + gas 147,20 + canone TV 9 = 211,75€ totale, una scadenza, un pagamento). Il modello "1 contratto = 1 categoria" non basta.

Ragionamento di prodotto: l'utente percepisce VIVI Energia come un solo contratto (un solo rapporto commerciale, una sola bolletta, un solo pagamento). Non ha senso spezzarlo in "VIVI luce" + "VIVI gas". Però per le statistiche ("quanto ho speso di gas quest'anno") serve sapere che dentro quei 211,75€ ci sono 147,20€ di gas.

Ci sono 3 modi di affrontarlo, con trade-off diversi. Questa è una scelta di design che devi fare tu:

Come vogliamo modellare le bollette multi-servizio (tipo VIVI Energia luce+gas)?
Contratto con array categorie (Raccomandato)
Perfetto, contratto con array categorie. Ti spiego il piano in termini di prodotto e poi partiamo.

Il modello: ogni contratto avrà sia categoria (la "principale", es. "luce" per VIVI) sia categorie (array con tutte, es. ["gas", "luce"]). Claude estrae l'array completo dalla bolletta e riempie entrambi i campi. Le bollette a loro volta memorizzano le categorie rilevate nello specifico PDF (utile per storico).

Perché teniamo anche categoria singola:

Il matching Make.com resta semplice (su categoria, esattamente come oggi)
Il frontend attuale continua a funzionare senza refactor
categorie aggiunge informazione senza rompere nulla
Regola per Claude: l'array categorie è sempre in ordine alfabetico. Il campo categoria = primo elemento. Così "VIVI luce+gas" dà sempre categorie: ["gas", "luce"] e categoria: "gas" deterministicamente — la prossima bolletta VIVI matcherà lo stesso contratto.

Step 3a — Schema DB. In Supabase SQL Editor:

sql
-- Array di categorie per contratti (gestisce multi-servizio)
ALTER TABLE contratti
ADD COLUMN categorie text[] DEFAULT ARRAY[]::text[];

-- Popola categorie per contratti esistenti (copia dalla colonna singola)
UPDATE contratti
SET categorie = ARRAY[categoria]
WHERE categoria IS NOT NULL AND (categorie IS NULL OR array_length(categorie, 1) IS NULL);

-- Array di categorie anche per le bollette (serve per storico multi-servizio)
ALTER TABLE bollette
ADD COLUMN categorie text[] DEFAULT ARRAY[]::text[];
Lanciala e dimmi fatto. Poi passiamo al punto 3b — aggiornare il prompt Claude per restituire l'array categorie in ordine alfabetico.

fatto.


Processo di ragionamento
Processo di ragionamento
Step 3b — Nuovo prompt Claude (v3 con array categorie)

Vai in Make.com → modulo 4 (HTTP POST Claude API) → campo Request content / body JSON. Trova la parte text dentro l'array messages (è il prompt testuale) e sostituiscilo con questo:

Analizza il PDF e restituisci SOLO un JSON grezzo (senza backtick, markdown o spiegazioni) con questi campi:

- tipo_documento: "bolletta" | "pagopa" | "f24" | "altro"
- fornitore: stringa (nome del fornitore o ente creditore, per esteso come compare nel documento)
- categorie: array di stringhe in ordine ALFABETICO, scegli tra: ["luce", "gas", "acqua", "telefono", "internet", "assicurazione", "abbonamento", "finanziamento", "f24", "pagopa", "altro"]. Se la bolletta contiene più servizi (es. luce+gas), includili tutti. Se è un servizio unico, array di un elemento.
- categoria: stringa = primo elemento dell'array categorie (retrocompatibilità)
- importo_euro: numero (totale da pagare)
- data_scadenza: stringa "YYYY-MM-DD"
- periodo_riferimento: stringa (es. "gennaio-febbraio 2026") o null
- codice_cliente: stringa o null
- intestatario: stringa o null
- codice_avviso: stringa o null (solo PagoPA)
- codice_cbill: stringa o null (solo PagoPA)
- causale: stringa o null
- cod_fiscale_ente: stringa o null (solo PagoPA)

Regole:
- Se un campo non è presente nel documento, usa null (tranne categorie che è almeno array di 1)
- tipo_documento = "pagopa" se il documento contiene "PagoPA", "Avviso di pagamento" o "Codice Avviso"
- tipo_documento = "bolletta" se è una bolletta utenze con codice cliente e fornitore
- SOLO JSON grezzo, nessun altro testo
Step 3c — Aggiorna la Data Structure del Parse JSON (modulo 9)

Nel modulo 9 (Parse JSON) clicca sul campo Data structure → Edit. Devi aggiungere un nuovo campo:

Nome: categorie
Type: Array
Specification → Item type: Text
Salva la data structure.

Step 3d — Aggiorna il mapping del modulo 21 (Create contratto, Strada 2)

Nel modulo 21, aggiungi (o modifica) il campo categorie:

Valore: {{9.categorie}} (seleziona dalla lista variabili il nuovo array)
Il campo categoria resta mappato come prima: {{9.categoria}}.

Step 3e — Aggiorna il mapping dei moduli 6 e 22 (Create bolletta, entrambe le strade)

In entrambi, aggiungi il campo categorie:

Valore: {{9.categorie}}
Fai tutte queste modifiche e salva lo scenario. Poi testiamo inoltrando la bolletta VIVI Energia che mi hai mandato — dovrebbe creare un contratto VIVI con categorie: ["gas", "luce"] e una bolletta con stesso array.

Dimmi quando è pronto.

è il modulo 2 quello che comunica con claude. ho fatto fino al passaggio 3c perchè nel modulo 21 non viene fuori categorie


Processo di ragionamento
Processo di ragionamento
Ok, correzione segnata — modulo 2 per Claude. Per il campo categorie che non appare nel modulo 21, è un comportamento noto di Make.com: la mappa variabili non si aggiorna da sola dopo una modifica della Data Structure. Si risolve così:

1. Verifica che la Data Structure sia stata salvata correttamente:

Torna al modulo 9, clicca sul campo Data structure → Edit
Controlla che categorie ci sia davvero come Array, e che dentro (item) ci sia Text
Se c'è, clicca OK per confermare, poi Save nel modulo
2. Forza il refresh della mappa variabili:

Salva lo scenario (pulsante in basso "Save") — importante
Ricarica la pagina di Make.com (F5 o Ctrl+R)
Riapri il modulo 21: dovrebbe apparire categorie nella lista variabili del modulo 9
3. Se ancora non appare, esegui un "Run once" completo:

Avvia "Run once" e reinoltra una bolletta (anche quella NWG già usata)
Dopo l'esecuzione, Make.com aggiorna la mappa variabili basandosi sull'output reale del modulo 9
Riapri il modulo 21 e il campo categorie sarà disponibile
Il terzo passaggio di solito è quello risolutivo — Make.com "impara" la struttura eseguendo lo scenario almeno una volta con la nuova configurazione.

Nota: se dopo il Run once vedi che il campo Claude ha restituito categoria ma non categorie, significa che il prompt non è stato aggiornato davvero — ricontrolla il modulo 2 (non il 4, come mi hai giustamente corretto).

Dimmi come va.

no continua a non apparire categorie. il modulo 9 l'ho verificato ed è ok


Processo di ragionamento
Processo di ragionamento
Ah, capito il vero problema. Non è la mappa variabili del modulo 9 — è il modulo 21 stesso (Create Row Supabase) che ha in cache lo schema della tabella contratti e non vede la colonna categorie che hai appena aggiunto via SQL.

Soluzione, dalla più morbida alla più drastica:

1. Refresh tabella nel modulo:

Apri il modulo 21
Trova il campo Table (dovrebbe dire contratti)
Cambialo a un'altra tabella qualsiasi (es. bollette), aspetta che carichi i campi
Ricambialo a contratti — Make.com rileggerà lo schema e mostrerà la nuova colonna categorie
2. Se non basta, forza il refresh della connessione:

In alto nel modulo c'è il campo Connection → clicca l'icona matita/edit accanto
Clicca "Re-establish connection" (o "Verify connection")
Chiudi e riapri il modulo: dovrebbe ora mostrare categorie
3. Soluzione drastica (se le prime 2 falliscono):

Elimina il modulo 21
Ricrealo da zero: Supabase → Create a Row → Table contratti
Rimappi i campi (fornitore, categoria, user_id, categorie)
Ricollega il modulo alla Strada 2 del Router
Prova la 1 — di solito risolve. Dimmi se appare.

infatti c'è un problema nel http di claude. 

The provided JSON body content is not valid JSON.

Bad control character in string literal in JSON at position 373476
Origin
Make


Processo di ragionamento
Processo di ragionamento
Trovato. Quel position 373476 è all'interno del body JSON e il "Bad control character" significa che nel prompt di testo ci sono newline letterali (\n reali) che rompono il JSON raw. Il body del modulo HTTP è JSON — dentro una stringa non puoi avere andate a capo reali, solo \n escapato.

Quando hai incollato il nuovo prompt multi-riga, Make.com l'ha messo come-è nel campo text del JSON, ma le andate a capo letterali rendono il JSON invalido.

Soluzione: prompt su riga singola. Rimpiazza il valore del campo text nel body con questa versione (tutto su una riga, senza andate a capo):

Analizza il PDF e restituisci SOLO un JSON grezzo senza backtick, markdown o spiegazioni, con questi campi: tipo_documento ("bolletta" | "pagopa" | "f24" | "altro"); fornitore (nome per esteso come compare nel documento); categorie (array di stringhe in ORDINE ALFABETICO, scegli tra luce, gas, acqua, telefono, internet, assicurazione, abbonamento, finanziamento, f24, pagopa, altro — se la bolletta contiene più servizi tipo luce+gas includili tutti, se è singolo array di un elemento); categoria (stringa = primo elemento dell'array categorie); importo_euro (numero, totale da pagare); data_scadenza (stringa YYYY-MM-DD); periodo_riferimento (stringa o null); codice_cliente (stringa o null); intestatario (stringa o null); codice_avviso (stringa o null, solo PagoPA); codice_cbill (stringa o null, solo PagoPA); causale (stringa o null); cod_fiscale_ente (stringa o null, solo PagoPA). Regole: se un campo non è presente usa null (tranne categorie che è almeno array di 1 elemento); tipo_documento = "pagopa" se il documento contiene "PagoPA" o "Avviso di pagamento" o "Codice Avviso"; tipo_documento = "bolletta" se è bolletta utenze con codice cliente e fornitore. SOLO JSON grezzo nessun altro testo.
Come incollarlo in Make.com:

Apri il modulo 2 (HTTP Claude)
Trova il campo text dentro il body JSON (è la parte del prompt testuale)
Cancella tutto il vecchio contenuto tra le virgolette
Incolla il testo sopra tutto su una sola riga (senza a capo)
Salva
Attenzione: se il tuo editor (o TextEdit) aggiunge automaticamente a capo alla fine, controlla che l'ultimo carattere sia . e subito dopo ci siano " del JSON.

Salva lo scenario e fai un Run once per verificare. Il modulo HTTP dovrebbe passare senza errore di parsing.

adesso devo chiudere la sessione ma dobbiamo poi sistemare questo problema appena ricominciamo


Processo di ragionamento
Processo di ragionamento
Capito, chiudiamo pulito. Aggiorno la todo list e salvo il contesto in memoria così la prossima sessione riparti senza ricostruire niente.


Lista delle cose da fare aggiornata, una memoria modificata
Lista delle cose da fare aggiornata, una memoria modificata
Chiudiamo pulito. Ho salvato tutto in memoria, riassunto rapido di cosa ripartiremo la prossima volta:

Da sistemare subito (primi 5 minuti nuova sessione):

Errore JSON prompt Claude — incollare il prompt v3 su singola riga nel modulo 2 (il testo è nei messaggi di oggi, pronto da copiare)
Refresh schema modulo 21 — cambiare la tabella e rimetterla su contratti per far apparire la nuova colonna categorie
Mappare categorie = {{9.categorie}} nei moduli 21, 6, 22
Aggiungere filtro categoria eq {{9.categoria}} al modulo 26 (Search Rows) — ce l'ho segnato
Poi: 5. Run once di test con la bolletta VIVI Energia (per verificare il dual fuel luce+gas) 6. Gestione errori in Make.com 7. UI bollette orfane nel frontend 8. Test multi-fornitore con Vodafone, Iren, A2A

Già fatto oggi (non da rifare):

Schema DB: contratti.categorie[], bollette.categorie[], bollette.stato_elaborazione
Matching su primi 4 caratteri in Make.com (modulo 26)
Data Structure Parse JSON aggiornata con array categorie
Verifica che non ci sono doppioni da pulire in Supabase
Test con fornitore nuovo (Azienda Reggiana acqua) — strada 2 funziona perfettamente
A presto.

ho fatto tutti i passaggi fino al 4 e il run once, ho caricato la bolletta vivi energia e ho ottenuto l'errore nell'http che parla con claude.

The operation failed with an error. [400] Failing row contains (40, 5ff3770d-500b-46b8-bac1-272a13e0ee0c, null, ERRORE PARSING - PDF non leggibile, null, null, null, null, f, null, manuale, https://storage-europe-west1.api.mailgun.net/v3/domains/mail.get..., 2026-04-15 15:21:25.823281+00, 2026-04-15 15:21:25.823281+00, rid, bolletta, null, null, null, null, ok, {}). null value in column "importo" of relation "bollette" violates not-null constraint

InvalidConfigurationError
The provided JSON body content is not valid JSON.

Expected ',' or '}' after property value in JSON at position 912221
Origin
Make

Mostra altro

Processo di ragionamento
Processo di ragionamento
Due problemi, uno è mio errore. Parto dal più importante.

Problema 1 (prompt Claude ancora rotto): colpa mia — il prompt che ti ho dato conteneva virgolette doppie letterali ("bolletta", "pagopa", "YYYY-MM-DD" ecc.) che dentro un body JSON rompono la stringa. Position 912221 = siamo dentro la stringa del prompt (prima era 373476, diverso errore ma stessa causa: caratteri non validi nella stringa JSON).

Fix: sostituisci tutte le virgolette doppie dentro il prompt con apostrofi ('). Usa questa versione corretta, sempre single-line:

Analizza il PDF e restituisci SOLO un JSON grezzo senza backtick, markdown o spiegazioni, con questi campi: tipo_documento (valori: bolletta, pagopa, f24, altro); fornitore (nome per esteso come compare nel documento); categorie (array di stringhe in ORDINE ALFABETICO, scegli tra: luce, gas, acqua, telefono, internet, assicurazione, abbonamento, finanziamento, f24, pagopa, altro; se la bolletta contiene più servizi tipo luce e gas includili tutti, se è singolo array di un elemento); categoria (stringa uguale al primo elemento dell array categorie); importo_euro (numero, totale da pagare); data_scadenza (stringa formato YYYY-MM-DD); periodo_riferimento (stringa o null); codice_cliente (stringa o null); intestatario (stringa o null); codice_avviso (stringa o null, solo PagoPA); codice_cbill (stringa o null, solo PagoPA); causale (stringa o null); cod_fiscale_ente (stringa o null, solo PagoPA). Regole: se un campo non è presente usa null tranne categorie che è almeno array di 1 elemento; tipo_documento vale pagopa se il documento contiene PagoPA o Avviso di pagamento o Codice Avviso; tipo_documento vale bolletta se è bolletta utenze con codice cliente e fornitore. SOLO JSON grezzo nessun altro testo.
Ho tolto TUTTE le virgolette interne. Incolla questo come valore del campo text nel body JSON del modulo 2.

Problema 2 (errore Supabase "null value in column importo"): questo è più interessante. I dati della riga fallita sono:

descrizione_libera: "ERRORE PARSING - PDF non leggibile"
fonte: "manuale"
pdf_url: storage-europe-west1...
tutto il resto null
Domanda: questa riga da dove arriva? Non dal nostro scenario Make.com (noi usiamo fonte='email', non manuale, e non scriviamo "ERRORE PARSING" nella descrizione). Hai provato a creare una bolletta a mano dal frontend come test? O è un errore di un tuo vecchio Run once precedente alla sessione di oggi?

Se l'hai creata tu dall'app, il vincolo NOT NULL sulla colonna importo sta impedendo il salvataggio — era impostato così in origine perché pensavamo ogni bolletta avesse sempre un importo. Con la nuova logica stato_elaborazione='errore_parsing' che prevede bollette senza importo, dovremo rilassare il vincolo. Ma prima capiamo da dove arriva questa riga.

Fammi sapere e intanto sistema il prompt.

ho sistemato il text nell'http.

ti ho detto che ho mandato una mail con la bolletta vivi energia, come fatto in precedenza con quelle nwg ecc. riprovo e vediamo.


Processo di ragionamento
Processo di ragionamento
Ok, scusa avevo letto distrattamente. Allora quell'errore è effettivamente dello scenario — il Parse JSON del modulo 9 deve aver propagato null ovunque quando Claude è fallito, e poi la Strada 2 ha tentato di creare una bolletta senza importo. La stringa "ERRORE PARSING - PDF non leggibile" è curiosa — arriva sicuramente da qualche default/fallback che va investigato dopo.

Aspetto il risultato del nuovo Run once con il prompt sistemato. Dimmi cosa succede:

Se passa: vedremo se la bolletta VIVI viene salvata con categorie: [gas, luce] e il contratto creato ha lo stesso array. In caso positivo il dual fuel funziona.
Se Claude dà ancora errore JSON: mi dici la position del nuovo errore e capiamo quale carattere sta rompendo il body.
Se passa Claude ma qualcosa dopo si rompe: mi dici quale modulo si colora di rosso così debugghiamo lì.
Fammi sapere.

è passato dal modulo claude, ma al modulo 21 ha dato errore:

RuntimeError
[400] Array value must start with "{" or dimension information. malformed array literal: "gas, luce"
Origin
Supabase
Automatic error handler
If you want to handle this error automatically, choose one of the following options. This will create a new error-handler route in your scenario. You can then expand the route in any way you like.

Mostra altro

Processo di ragionamento
Processo di ragionamento
Il problema è come Make.com serializza l'array per Supabase: sta passando "gas, luce" (stringa comma-separated) invece del formato PostgreSQL che si aspetta {gas,luce} (con graffe).

Fix nel modulo 21 (e anche nei moduli 6 e 22 quando li farai), campo categorie:

Invece di mappare direttamente {{9.categorie}}, devi costruire il valore così:

Svuota il campo
Digita a mano una graffa aperta {
Dal menu variabili, sezione "Array functions", scegli join
Come primo argomento di join seleziona {{9.categorie}}
Come secondo argomento (separator) digita una virgola , (solo la virgola, niente spazi)
Chiudi la funzione join e digita a mano una graffa chiusa }
Visualmente nel campo vedrai qualcosa tipo:

{join(9.categorie; ,)}
Dove join(9.categorie; ,) è il blocco funzione Make.com (colorato/pill) e le due { } sono caratteri letterali fuori dal blocco.

Cosa produce: {gas,luce} — il formato PostgreSQL array literal che Supabase riconosce come array nativo.

Attenzione: importante che la virgola sia SENZA spazi. {gas,luce} va bene, {gas, luce} dà di nuovo errore.

Applica la stessa logica a:

Modulo 21 (Create contratto Strada 2) → campo categorie
Modulo 6 (Create bolletta Strada 1) → campo categorie
Modulo 22 (Create bolletta Strada 2) → campo categorie
Salva e rifai il Run once. Dimmi cosa succede.

ha passato il 21 ma al modulo 22 ha dato errore:

RuntimeError
[400] Failing row contains (41, 5ff3770d-500b-46b8-bac1-272a13e0ee0c, 21, VIVIGAS S.p.A., null, null, null, null, f, null, email, https://storage-europe-west1.api.mailgun.net/v3/domains/mail.get..., 2026-04-15 15:31:07.452599+00, 2026-04-15 15:31:07.452599+00, rid, bolletta, null, null, null, null, ok, {gas,luce}). null value in column "importo" of relation "bollette" violates not-null constraint
Origin
Supabase
Automatic error handler
If you want to handle this error automatically, choose one of the following options. This will create a new error-handler route in your scenario. You can then expand the route in any way you like.

Mostra altro

Processo di ragionamento
Processo di ragionamento
Il contratto è stato creato bene (id 21, fornitore "VIVIGAS S.p.A.", categorie array funzionante). Il problema è nella bolletta (modulo 22): importo e scadenza sono null. Curioso perché la bolletta VIVI mostra chiaramente 211,75€ e una scadenza.

Due ipotesi:

Claude non ha restituito importo_euro e data_scadenza nel JSON (poco probabile su un PDF chiaro)
Il mapping del modulo 22 punta a campi con nomi diversi da quelli che Claude restituisce ora
Per diagnosticare, aprimi il bundle del modulo 9 nel run fallito:

Nell'execution history clicca sull'esecuzione rossa
Clicca sul modulo 9 (Parse JSON)
Nella finestra di destra vedi "Output"
Copiami l'output intero — voglio vedere tutti i campi che Claude ha restituito, specialmente se ha valorizzato importo_euro e data_scadenza
E controlla anche:

Nel modulo 22 (Create bolletta Strada 2):

Campo importo → a cosa è mappato? {{9.importo_euro}} o {{9.importo}}?
Campo scadenza → a cosa è mappato? {{9.data_scadenza}}?
Se nell'output del modulo 9 vedi importo_euro valorizzato ma nel mapping c'è {{9.importo}} (senza _euro), abbiamo trovato il problema: basta correggere il mapping. La Data Structure del Parse JSON si aspettava importo ma il nuovo prompt restituisce importo_euro — o viceversa.

Fammi vedere l'output del modulo 9 così capiamo con certezza.

questo è l'output del modulo 9

tipo_documento bolletta
fornitore VIVIGAS S.p.A.
categorieArray
1 gas
2 luce
categoria gas
importo_euro 211.75
data_scadenza 2026-04-30
periodo_riferimento 01/03/2026 - 31/03/2026
codice_cliente 40000189079
intestatario COCCO SIMONE RAFFAELE
codice_avviso empty
codice_cbill empty
causale empty
cod_fiscale_ente empty
nel 22 ho: {{9.importo}}, {{9.scadenza}}

Mostra altro

Processo di ragionamento
Processo di ragionamento
Trovato. Claude ha restituito tutto correttamente (importo_euro: 211.75, data_scadenza: 2026-04-30), ma il mapping del modulo 22 sta puntando a campi sbagliati: {{9.importo}} e {{9.scadenza}} non esistono nell'output del modulo 9 — i campi corretti sono {{9.importo_euro}} e {{9.data_scadenza}}.

Fix nel modulo 22 (Create bolletta Strada 2):

importo → cambia da {{9.importo}} a {{9.importo_euro}}
scadenza → cambia da {{9.scadenza}} a {{9.data_scadenza}}
Fix identico anche nel modulo 6 (Create bolletta Strada 1) — fai lo stesso controllo e correggi se ha gli stessi nomi sbagliati.

Quindi il memory che avevo ("importo → {{9.importo_euro}}") era giusto in teoria ma evidentemente nei moduli qualcuno aveva mappato il campo con il nome accorciato, che non corrisponde all'output reale.

Salva e rifai il Run once. Questa volta la bolletta VIVI dovrebbe finalmente salvarsi completa con importo, scadenza, e array categorie.

ok ho fatto il run once ed è andato tutto bene. ma posso lasciare {{9.importo_euro}} e {{9.data_scadenza}} anche per tutte le altre bollette, giusto?

Sì, esatto. {{9.importo_euro}} e {{9.data_scadenza}} sono i nomi dei campi che Claude restituisce sempre — non cambiano da una bolletta all'altra. Valgono per qualsiasi fornitore (NWG, VIVI, Vodafone, chiunque).

Il mapping corretto è universale: ogni volta che Claude processa un PDF, popola gli stessi campi dell'output del modulo 9 (importo_euro, data_scadenza, fornitore, categorie, ecc.). I moduli 6 e 22 pescano sempre da lì.

Ora hai la pipeline completa e funzionante anche sul dual fuel. Ottimo progresso. Se vuoi chiudiamo qui, oppure se hai ancora tempo possiamo passare allo step successivo (gestione errori Make.com per bollette illeggibili, o UI bollette orfane). Tu dimmi.

salva tutti gli aggiornamenti per favore, sia nella memoria che nei file md perchè devo fare un brainstorming con la chat tecnica dell'app


4 memorie modificate, eseguito un comando
4 memorie modificate, eseguito un comando
Ora creo il file riassuntivo nella cartella "App aggregatore spese" per il tuo brainstorming tecnico:


File creato, lista delle cose da fare aggiornata
File creato, lista delle cose da fare aggiornata
Tutto salvato. Ecco cosa trovi:

Memoria persistente aggiornata:

project_email_forwarding.md — stato completo con gotcha, moduli, decisioni, prossimi passi
File per il brainstorming tecnico:

Bolly-Stato-Pipeline-15apr.md
Il file .md nella cartella è pensato apposta per condividerlo con la chat tecnica: contiene panoramica pipeline, schema DB, struttura Make.com, prompt Claude v3, mapping universale, test fatti, gotcha (per non farli ripetere), e backlog prossimi step in ordine di priorità.

Buon brainstorming. Alla prossima.


Bolly stato pipeline 15apr
Documento · MD 


TextEdit

procediamo con procediamo con gestione errori Make.com per bollette illeggibili, o UI bollette orfane


Processo di ragionamento
Processo di ragionamento
Partiamo dalla gestione errori — è propedeutica alla UI orfane: oggi se Claude fallisce, la bolletta si perde (vedi l'errore NOT NULL di prima). Se prima marchiamo le bollette "incomplete/errore" nel DB, poi la UI avrà qualcosa di reale da mostrare.


Lista delle cose da fare aggiornata
Lista delle cose da fare aggiornata
Ragionamento di prodotto: oggi se arriva un PDF illeggibile, Claude fallisce e lo scenario si rompe silenziosamente (o salva righe spurie col crash NOT NULL). Vogliamo che nessuna bolletta si perda: anche senza dati, deve essere salvata con stato_elaborazione='errore_parsing' così tu la vedi nella UI e la completi a mano.

Due casi da gestire:

Claude ritorna ma con campi critici null (importo o scadenza mancanti) — aggiungiamo una terza strada al Router modulo 20
Claude HTTP fallisce completamente (rete, rate limit, PDF corrotto che crasha Claude) — error handler nativo di Make.com sul modulo 2
Partiamo dal primo caso, il più frequente.

Step 1 — Rilassare vincoli NOT NULL in Supabase

Oggi la tabella bollette ha (probabilmente) importo NOT NULL e forse scadenza NOT NULL. Dobbiamo permettere bollette parziali.

In Supabase SQL Editor lancia:

sql
-- Permetti importo e scadenza null per bollette in errore
ALTER TABLE bollette ALTER COLUMN importo DROP NOT NULL;
ALTER TABLE bollette ALTER COLUMN scadenza DROP NOT NULL;
Se una delle due colonne non era NOT NULL, il comando dà errore "column is not null constraint doesn't exist" → ignoralo, è un no-op. Oppure se va tutto liscio vedrai "Success. No rows returned".

Dimmi fatto e passo al Step 2 (modifica Make.com).

ho ottenuto Success. No rows returned


Processo di ragionamento
Processo di ragionamento
Perfetto. Passo allo step 2.

Step 2 — Aggiornare i filtri del Router (modulo 20) e aggiungere Strada 3

Nel Router modulo 20 devi fare 3 modifiche:

A) Aggiungi condizione ai filtri esistenti di Strada 1 e Strada 2

Apri il filtro di Strada 1 "Contratto trovato" (quella che oggi ha length({{26.id}}) > 0). Aggiungi nuove condizioni AND:

Condizione 1 (già presente): length({{26.id}}) / Greater than / 0
Condizione 2 (NUOVA): {{9.importo_euro}} / Exists
Condizione 3 (NUOVA): {{9.data_scadenza}} / Exists
Apri il filtro di Strada 2 "Nessun contratto" (quella che oggi ha length({{26.id}}) = 0). Stessa logica:

Condizione 1 (già presente): length({{26.id}}) / Equal to / 0
Condizione 2 (NUOVA): {{9.importo_euro}} / Exists
Condizione 3 (NUOVA): {{9.data_scadenza}} / Exists
Nota: in Make.com "Exists" significa "valore presente e non vuoto" — perfetto per il null check. Se non trovi "Exists", usa "Text operators → Is not empty".

B) Aggiungi la nuova Strada 3 "Errore parsing"

Nel Router (modulo 20) clicca il + per aggiungere una nuova route. Configurala con filtro OR (non AND):

Label: Errore parsing
Condizione 1: {{9.importo_euro}} / Does not exist (oppure Is empty)
Aggiungi con pulsante "Add OR rule":
Condizione 2: {{9.data_scadenza}} / Does not exist (oppure Is empty)
C) Dentro la Strada 3, aggiungi un Supabase Create Row

Table: bollette
Fields:
user_id → {{15.id}}
contratto_id → lascia vuoto (null)
descrizione_libera → PDF illeggibile - da rivedere
importo → lascia vuoto
scadenza → lascia vuoto
fonte → email
pagata → no
pdf_url → {{4.data.attachments[].url}}
stato_elaborazione → errore_parsing
categorie → lascia vuoto
tipo_documento → lascia vuoto
Così anche una bolletta illeggibile finisce nel DB con flag chiaro, collegata al tuo utente, con il PDF accessibile — pronta per essere completata dalla UI orfane che faremo dopo.

Salva e dimmi fatto — poi aggiungiamo lo step 3 (error handler Claude) e testiamo.

fatto


Processo di ragionamento
Processo di ragionamento
Ottimo. Ora ragioniamo sullo step 3 (error handler Claude) in termini di prodotto.

Il caso che abbiamo appena coperto (Strada 3): Claude risponde ma i dati estratti sono incompleti → bolletta salvata con errore_parsing. Questo è il caso più frequente (PDF di bassa qualità, scansioni, bollette con layout strani).

Il caso che resterebbe scoperto: Claude API fallisce completamente (rate limit, timeout, API down). Raro ma possibile.

Ragionamento pratico: per coprire questo secondo caso servirebbe un piccolo rework dello scenario — spostare il Search Rows profiles (modulo 15) prima del modulo Claude, così l'error handler avrebbe sempre l'user_id disponibile. Oggi invece il Search Rows viene dopo Claude, quindi se Claude fallisce non sappiamo di chi era la bolletta. Fattibile ma non banale.

Proposta: lasciamo fuori l'error handler Claude per ora (è un edge case raro e Make.com ti notifica via email se uno scenario fallisce → te ne accorgi). Passiamo dritti al test della Strada 3 e poi alla UI bollette orfane che è molto più di impatto. Se Claude API ci darà problemi reali nelle prossime settimane, torneremo a sistemare l'error handler.


Lista delle cose da fare aggiornata
Lista delle cose da fare aggiornata
Test rapido della Strada 3 (opzionale ma consigliato)

Prima di passare alla UI, vale la pena verificare che la Strada 3 funzioni davvero. Due modi:

Opzione A — test reale: trova un PDF difficile (scansione di una vecchia bolletta cartacea, o un documento non bolletta tipo una ricevuta amazon) e inoltralo al tuo indirizzo dedicato. Claude probabilmente estrarrà fornitore ma non importo/scadenza → Strada 3 si attiva.

Opzione B — simulazione veloce in Supabase: Inserisci a mano una riga di test per popolare la UI orfane che costruiremo:

sql
INSERT INTO bollette (user_id, fonte, pagata, stato_elaborazione, descrizione_libera, pdf_url)
VALUES (
  '5ff3770d-500b-46b8-bac1-272a13e0ee0c',
  'email',
  'no',
  'errore_parsing',
  'Test bolletta errore - simulata',
  'https://example.com/test.pdf'
);
Cosa preferisci?

Opzione A è più solida (verifica il flusso vero), ma dipende dal trovare un PDF adatto
Opzione B è istantanea ma non prova davvero la Strada 3 — serve solo a darci dati per la UI
Se non hai un PDF "difficile" a portata di mano, fai l'opzione B (ti creo la riga fittizia subito) e passiamo alla UI. Poi nelle prossime bollette reali qualcuna finirà naturalmente in Strada 3 e verificheremo dal vivo.

Tu dimmi.

ho mandato una fattura amazon ads e la strada 3 si è attivata


Processo di ragionamento
Processo di ragionamento
Perfetto, la Strada 3 funziona. Amazon Ads è il caso ideale: ha "fornitore" forse estraibile ma non è una bolletta utenze — importo/scadenza assenti o formattati diversi.

Prima di passare alla UI, verifichiamo che la riga sia stata salvata correttamente. Dammi un'occhiata rapida in Supabase → Table Editor → bollette, filtra per stato_elaborazione = 'errore_parsing' (oppure per created_at più recente). Controlla che:

user_id sia valorizzato (il tuo)
fonte = 'email'
stato_elaborazione = 'errore_parsing'
pdf_url presente (link mailgun)
importo, scadenza, contratto_id siano null (corretto)
descrizione_libera = "PDF illeggibile - da rivedere"
Se tutto ok, passiamo direttamente alla UI orfane.


Lista delle cose da fare aggiornata
Lista delle cose da fare aggiornata
Dimmi il risultato del check e intanto preparo il piano UI.

Piano UI bollette orfane (in termini di prodotto):

Ti propongo questa esperienza:

In Dashboard, se ci sono bollette con stato_elaborazione IN ('errore_parsing', 'orfana', 'incompleta'), appare un banner giallo in alto:
⚠️ Hai 3 bollette da sistemare
[Rivedile ora →]

Cliccando sul banner si apre una nuova schermata "Bollette da sistemare". Per ogni bolletta orfana vedi:
Il PDF (pulsante "Apri PDF" che fa aprire il link mailgun)
Campi editabili per i dati mancanti (importo, scadenza, fornitore, descrizione)
Dropdown contratto con i tuoi contratti + opzione "+ Nuovo contratto"
Pulsanti: "Salva e collega" (marca come ok) / "Elimina" (se non è una bolletta vera, es. spam/ricevuta amazon)
Una bolletta tornata ok sparisce dall'elenco — il badge numero scende. Quando arriva a zero, il banner sparisce.
Scelta da fare:

Dove vuoi che il banner 'bollette da sistemare' ti porti?
Nuova schermata dedicata (Raccomandato)
Perfetto. Leggo la struttura attuale del tuo App.jsx per capire come integrare la nuova schermata senza rompere niente.


Letti 4 file, eseguito un comando, codice cercato
Letti 4 file, eseguito un comando, codice cercato
Ho capito la struttura. Procedo con le modifiche al file App-jsx-COPIA.txt. Le modifiche che farò:

Aggiungere componente BolletteOrfane (nuova schermata)
Aggiungere banner giallo in Dashboard
Aggiungere handler handleUpdateBolletta nell'App
Aggiungere il nuovo case bollette-orfane nel renderScreen

2 file modificati
2 file modificati
Ora aggiungo i componenti BolletteOrfane e OrfanaCard. Li metto prima del componente App (dopo il Profilo):


File modificato
File modificato
Ora aggiungo l'handler handleUpdateBolletta e il case nel renderScreen:


2 file modificati
2 file modificati
Ora verifico la sintassi con @babel/parser come da prassi:


Eseguiti 4 comandi
Eseguiti 4 comandi
Sintassi JSX validata ✅. Aggiorno il todo e consegno:


Lista delle cose da fare aggiornata
Lista delle cose da fare aggiornata
Ecco il file aggiornato pronto per il deploy:

Apri App-jsx-COPIA.txt

Passaggi per il deploy su github.dev:

Apri il file sopra con TextEdit, seleziona tutto (Cmd+A) e copia (Cmd+C)
Vai su github.dev/gabrinrs/bill-wallet → apri bill-wallet-app/src/App.jsx
Seleziona tutto il contenuto esistente (Cmd+A) e incolla (Cmd+V) il nuovo
Source Control (icona rami a sinistra) → scrivi messaggio commit:
   feat: UI bollette orfane - banner dashboard + schermata gestione
Commit & Push — Vercel fa il deploy automatico in ~30 secondi
Cosa testare dopo il deploy:

Apri l'app → Dashboard → dovrebbe apparire il banner giallo "Hai X bollette da sistemare" (hai almeno la fattura Amazon Ads del test Strada 3)
Tap sul banner → si apre la nuova schermata "Bollette da sistemare"
Per ogni bolletta orfana puoi: aprire il PDF (link azzurro), selezionare il contratto dal dropdown, inserire importo/scadenza/descrizione, salvare
Dopo il salvataggio la bolletta sparisce dalla lista orfane (perché stato_elaborazione diventa ok) e ricompare tra le bollette normali del contratto scelto
Il tasto "Elimina" chiede conferma prima di cancellare definitivamente
Se vedi la schermata bianca dopo il deploy significa che c'è un errore JS — avvisami e controllo. Ma ho già validato la sintassi JSX con Babel, quindi dovrebbe filare liscio.


App jsx copia
TXT 


TextEdit






Claude è un'AI e può commettere errori. Verifica le risposte.
App jsx copia · TXT


TextEdit

import { useState, useEffect, useMemo, useCallback } from 'react'
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
 
// ============================================================
// DASHBOARD
// ============================================================
 
function Dashboard({ contratti, bollette, onSelectContratto, onNavigate, profile, onLogout }) {
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
 
function DettaglioContratto({ contratto, bollette, onBack, onAggiungiBolletta, onTogglePagata, onDeleteContratto, onEditContratto, onDeleteBolletta }) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deletingBollettaId, setDeletingBollettaId] = useState(null)
  const bolletteOrdinate = useMemo(() => [...bollette].sort((a, b) => new Date(b.periodo) - new Date(a.periodo)), [bollette])
  const chartData = useMemo(() =>
    [...bollette].sort((a, b) => new Date(a.periodo) - new Date(b.periodo)).map(b => ({ periodo: formatPeriodo(b.periodo), importo: Number(b.importo) }))
  , [bollette])
  const cat = getCategoria(contratto.categoria)
  const portaleUrl = PORTALI_PAGAMENTO[contratto.fornitore]
 
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-2 -ml-2 rounded-xl hover:bg-gray-100"><ChevronLeft size={22} className="text-gray-600" /></button>
        <CategoriaIcon categoriaId={contratto.categoria} />
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-gray-900">{contratto.fornitore}</h1>
          <p className="text-sm text-gray-500">{cat.label}{contratto.codice ? ` · ${contratto.codice}` : ''}</p>
        </div>
        <button onClick={() => onEditContratto(contratto)} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400"><Pencil size={18} /></button>
        <button onClick={() => setShowDeleteConfirm(true)} className="p-2 rounded-xl hover:bg-red-50 text-gray-400"><Trash2 size={18} /></button>
      </div>
 
      {showDeleteConfirm && (
        <Card className="p-4 border-red-200 bg-red-50">
          <p className="font-medium text-red-800 mb-1">Eliminare questo contratto?</p>
          <p className="text-sm text-red-600 mb-3">Verranno eliminate anche tutte le bollette collegate. Questa azione non si può annullare.</p>
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
                    <p className="text-sm text-gray-500">{formatPeriodo(b.periodo)} · Scade {formatData(b.scadenza)}</p>
                    <div className="mt-1"><FonteBadge fonte={b.fonte} /></div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge stato={stato} />
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
 
function FormBolletta({ contratti, contrattoId, onSave, onBack }) {
  const [mode, setMode] = useState('contratto')
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    contratto_id: contrattoId || (contratti[0]?.id || ''),
    importo: '', periodo: '', emissione: '', scadenza: '', descrizione_libera: '', metodo_pagamento: 'rid',
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
        <Card className="p-6 border-dashed border-2 border-gray-300 text-center">
          <Upload size={32} className="text-gray-400 mx-auto" />
          <p className="text-sm font-medium text-gray-700 mt-3">Carica il PDF della bolletta</p>
          <p className="text-xs text-gray-400 mt-1">L'AI riconosce automaticamente fornitore, importo e scadenza</p>
          <p className="text-xs text-bolly-500 font-medium mt-3">Disponibile nella prossima versione</p>
        </Card>
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
              disabled={saving || !form.importo || !form.scadenza}
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
            disabled={saving || !form.importo || !form.scadenza || !form.descrizione_libera.trim()}
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
  const motivoLabel = {
    errore_parsing: 'PDF non letto correttamente',
    orfana: 'Nessun contratto collegato',
    incompleta: 'Dati incompleti',
  }[bolletta.stato_elaborazione] || 'Da sistemare'
 
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
      case 'dashboard': return <Dashboard contratti={contratti} bollette={bollette} onSelectContratto={handleSelectContratto} onNavigate={setScreen} profile={profile} onLogout={handleLogout} />
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
      case 'aggiungi-bolletta': return <FormBolletta contratti={contratti} contrattoId={selectedContrattoId} onSave={handleSaveBolletta} onBack={() => selectedContrattoId ? setScreen('dettaglio') : setScreen('aggiungi')} />
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