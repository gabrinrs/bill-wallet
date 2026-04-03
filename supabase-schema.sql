-- ============================================================
-- BILL WALLET — Schema Database Supabase
-- Esegui questo SQL nell'editor SQL di Supabase
-- ============================================================

-- Tabella profili utente (estende auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  email_dedicata TEXT UNIQUE, -- es. gabriele.r7k2@billwallet.app
  piano TEXT NOT NULL DEFAULT 'free' CHECK (piano IN ('free', 'premium')),
  notifiche_timing TEXT NOT NULL DEFAULT '7,3,0',
  notifiche_canale TEXT NOT NULL DEFAULT 'push',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabella contratti
CREATE TABLE contratti (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  categoria TEXT NOT NULL,
  fornitore TEXT NOT NULL,
  intestatario TEXT NOT NULL DEFAULT '',
  codice TEXT DEFAULT '',
  metodo_ricezione TEXT NOT NULL DEFAULT 'email' CHECK (metodo_ricezione IN ('email', 'portale', 'cartaceo')),
  domiciliazione BOOLEAN NOT NULL DEFAULT FALSE,
  data_inizio DATE,
  note TEXT DEFAULT '',
  ricorrente BOOLEAN NOT NULL DEFAULT FALSE,
  importo_ricorrente NUMERIC(10,2),
  frequenza TEXT CHECK (frequenza IN ('mensile', 'trimestrale', 'annuale')),
  prossimo_addebito DATE,
  attivo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabella bollette
CREATE TABLE bollette (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  contratto_id BIGINT REFERENCES contratti(id) ON DELETE SET NULL,
  descrizione_libera TEXT, -- per inserimenti manuali senza contratto
  importo NUMERIC(10,2) NOT NULL,
  periodo DATE,
  emissione DATE,
  scadenza DATE NOT NULL,
  pagata BOOLEAN NOT NULL DEFAULT FALSE,
  data_pagamento DATE,
  fonte TEXT NOT NULL DEFAULT 'manuale' CHECK (fonte IN ('manuale', 'manuale_libero', 'upload_pdf', 'email_automatica', 'ricorrente_auto')),
  pdf_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabella notifiche
CREATE TABLE notifiche (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  bolletta_id BIGINT REFERENCES bollette(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('scadenza_imminente', 'bolletta_arrivata', 'anomalia_importo')),
  titolo TEXT NOT NULL,
  messaggio TEXT NOT NULL,
  letta BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indici per performance
CREATE INDEX idx_contratti_user ON contratti(user_id);
CREATE INDEX idx_bollette_user ON bollette(user_id);
CREATE INDEX idx_bollette_contratto ON bollette(contratto_id);
CREATE INDEX idx_bollette_scadenza ON bollette(scadenza);
CREATE INDEX idx_notifiche_user ON notifiche(user_id);

-- ============================================================
-- ROW LEVEL SECURITY (ogni utente vede solo i suoi dati)
-- ============================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE contratti ENABLE ROW LEVEL SECURITY;
ALTER TABLE bollette ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifiche ENABLE ROW LEVEL SECURITY;

-- Profiles: ogni utente vede/modifica solo il suo profilo
CREATE POLICY "Utente vede il suo profilo"
  ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Utente modifica il suo profilo"
  ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Utente crea il suo profilo"
  ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Contratti: ogni utente vede/gestisce solo i suoi contratti
CREATE POLICY "Utente vede i suoi contratti"
  ON contratti FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Utente crea contratti"
  ON contratti FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Utente modifica i suoi contratti"
  ON contratti FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Utente elimina i suoi contratti"
  ON contratti FOR DELETE USING (auth.uid() = user_id);

-- Bollette: ogni utente vede/gestisce solo le sue bollette
CREATE POLICY "Utente vede le sue bollette"
  ON bollette FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Utente crea bollette"
  ON bollette FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Utente modifica le sue bollette"
  ON bollette FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Utente elimina le sue bollette"
  ON bollette FOR DELETE USING (auth.uid() = user_id);

-- Notifiche: ogni utente vede/gestisce solo le sue notifiche
CREATE POLICY "Utente vede le sue notifiche"
  ON notifiche FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Utente crea notifiche"
  ON notifiche FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Utente modifica le sue notifiche"
  ON notifiche FOR UPDATE USING (auth.uid() = user_id);

-- ============================================================
-- TRIGGER: crea profilo automaticamente alla registrazione
-- ============================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, nome, email, email_dedicata)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email, '@', 1)),
    NEW.email,
    lower(split_part(NEW.email, '@', 1)) || '.' || substr(NEW.id::text, 1, 4) || '@billwallet.app'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();
