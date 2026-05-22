-- ============================================================
-- OLYMPIQUE RÉMOIS — Schéma base de données Supabase
-- Colle ce SQL dans : Supabase → SQL Editor → New query → Run
-- ============================================================

-- Activer Row Level Security sur toutes les tables
-- (les règles sont définies ci-dessous)

-- MATCHES
CREATE TABLE IF NOT EXISTS matches (
  id           BIGSERIAL PRIMARY KEY,
  home_team    TEXT NOT NULL,
  away_team    TEXT NOT NULL,
  home_score   INTEGER,
  away_score   INTEGER,
  match_date   DATE NOT NULL,
  match_time   TEXT DEFAULT '15:00',
  competition  TEXT DEFAULT 'Division 4',
  venue        TEXT DEFAULT 'Stade Léo Lagrange',
  is_home      BOOLEAN DEFAULT TRUE,
  status       TEXT DEFAULT 'upcoming', -- 'upcoming' | 'played' | 'cancelled'
  round        TEXT,
  season       TEXT DEFAULT '2026-2027',
  notes        TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- PLAYERS
CREATE TABLE IF NOT EXISTS players (
  id             BIGSERIAL PRIMARY KEY,
  name           TEXT NOT NULL,
  number         INTEGER,
  position       TEXT NOT NULL, -- GK | DEF | MID | ATT
  nationality    TEXT DEFAULT 'France',
  flag           TEXT DEFAULT '🇫🇷',
  is_captain     BOOLEAN DEFAULT FALSE,
  is_vice_cap    BOOLEAN DEFAULT FALSE,
  is_new         BOOLEAN DEFAULT FALSE,
  matches_played INTEGER DEFAULT 0,
  goals          INTEGER DEFAULT 0,
  assists        INTEGER DEFAULT 0,
  yellow_cards   INTEGER DEFAULT 0,
  red_cards      INTEGER DEFAULT 0,
  minutes        INTEGER DEFAULT 0,
  clean_sheets   INTEGER,
  saves          INTEGER,
  bio            TEXT,
  season         TEXT DEFAULT '2026-2027',
  is_active      BOOLEAN DEFAULT TRUE,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- STAFF
CREATE TABLE IF NOT EXISTS staff (
  id         BIGSERIAL PRIMARY KEY,
  name       TEXT NOT NULL,
  role       TEXT NOT NULL,
  initials   TEXT,
  since_year INTEGER,
  bio        TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- NEWS
CREATE TABLE IF NOT EXISTS news (
  id         BIGSERIAL PRIMARY KEY,
  title      TEXT NOT NULL,
  excerpt    TEXT,
  body       TEXT,
  category   TEXT DEFAULT 'Club',
  author     TEXT DEFAULT 'Staff OR',
  published  BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- SPONSORS
CREATE TABLE IF NOT EXISTS sponsors (
  id          BIGSERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  tier        TEXT DEFAULT 'bronze', -- or | argent | bronze | materiel
  logo_emoji  TEXT DEFAULT '🏢',
  description TEXT,
  contact     TEXT,
  website     TEXT,
  is_active   BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- GALLERY
CREATE TABLE IF NOT EXISTS gallery (
  id         BIGSERIAL PRIMARY KEY,
  title      TEXT,
  category   TEXT DEFAULT 'match', -- match | training | club | event
  emoji      TEXT DEFAULT '📸',
  gradient   TEXT DEFAULT 'linear-gradient(135deg,#142050,#0e1a3d)',
  author_id  UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- USER PROFILES (synchronisé avec auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id        UUID REFERENCES auth.users(id) PRIMARY KEY,
  name      TEXT,
  role      TEXT DEFAULT 'supporter',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger pour créer automatiquement un profil à l'inscription
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, role)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'name',
    COALESCE(NEW.raw_user_meta_data->>'role', 'supporter')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE matches  ENABLE ROW LEVEL SECURITY;
ALTER TABLE players  ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff    ENABLE ROW LEVEL SECURITY;
ALTER TABLE news     ENABLE ROW LEVEL SECURITY;
ALTER TABLE sponsors ENABLE ROW LEVEL SECURITY;
ALTER TABLE gallery  ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Lecture publique pour tout
CREATE POLICY "Public read matches"  ON matches  FOR SELECT USING (true);
CREATE POLICY "Public read players"  ON players  FOR SELECT USING (true);
CREATE POLICY "Public read staff"    ON staff    FOR SELECT USING (true);
CREATE POLICY "Public read news"     ON news     FOR SELECT USING (published = true);
CREATE POLICY "Public read sponsors" ON sponsors FOR SELECT USING (is_active = true);
CREATE POLICY "Public read gallery"  ON gallery  FOR SELECT USING (true);
CREATE POLICY "Public read profiles" ON profiles FOR SELECT USING (true);

-- Écriture réservée aux authentifiés (admin géré côté app)
CREATE POLICY "Auth insert matches"  ON matches  FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Auth update matches"  ON matches  FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Auth delete matches"  ON matches  FOR DELETE USING (auth.role() = 'authenticated');
CREATE POLICY "Auth insert players"  ON players  FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Auth update players"  ON players  FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Auth insert news"     ON news     FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Auth update news"     ON news     FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Auth delete news"     ON news     FOR DELETE USING (auth.role() = 'authenticated');
CREATE POLICY "Auth insert gallery"  ON gallery  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- ============================================================
-- DONNÉES INITIALES
-- ============================================================

INSERT INTO staff (name, role, initials, since_year) VALUES
  ('Pierre Renaud',   'Entraîneur Principal', 'PR', 2024),
  ('Marc Leleu',      'Entraîneur Adjoint',   'ML', 2022),
  ('Samuel Collet',   'Préparateur Physique', 'SC', 2025),
  ('Nathalie Breton', 'Kinésithérapeute',     'NB', 2023)
ON CONFLICT DO NOTHING;

INSERT INTO players (name, number, position, nationality, flag, is_captain, matches_played, goals, assists, minutes, clean_sheets, saves, season) VALUES
  ('Maxime Renard',    1,  'GK',  'France',       '🇫🇷', TRUE,  3, 0, 0, 270, 1, 9,   '2026-2027'),
  ('Théo Lambert',     16, 'GK',  'France',       '🇫🇷', FALSE, 0, 0, 0, 0,   NULL, NULL, '2026-2027'),
  ('Rémi Fontaine',    5,  'DEF', 'France',       '🇫🇷', FALSE, 3, 1, 1, 270, NULL, NULL, '2026-2027'),
  ('Sofiane Hadj',     4,  'DEF', 'Algérie',      '🇩🇿', FALSE, 3, 0, 1, 270, NULL, NULL, '2026-2027'),
  ('Jordan Marchand',  3,  'DEF', 'France',       '🇫🇷', FALSE, 3, 0, 0, 270, NULL, NULL, '2026-2027'),
  ('Nicolas Toma',     2,  'DEF', 'Roumanie',     '🇷🇴', FALSE, 2, 0, 0, 180, NULL, NULL, '2026-2027'),
  ('Kevin Moulin',     6,  'DEF', 'France',       '🇫🇷', FALSE, 3, 0, 1, 270, NULL, NULL, '2026-2027'),
  ('Lucas Bernard',    8,  'MID', 'France',       '🇫🇷', FALSE, 3, 2, 1, 270, NULL, NULL, '2026-2027'),
  ('Antoine Petit',    7,  'MID', 'France',       '🇫🇷', FALSE, 3, 2, 2, 248, NULL, NULL, '2026-2027'),
  ('Julien Colas',     11, 'MID', 'France',       '🇫🇷', FALSE, 3, 0, 2, 261, NULL, NULL, '2026-2027'),
  ('Mehdi Zaïri',      10, 'MID', 'Tunisie',      '🇹🇳', FALSE, 2, 0, 1, 155, NULL, NULL, '2026-2027'),
  ('Tom Lejeune',      13, 'MID', 'Belgique',     '🇧🇪', FALSE, 3, 0, 0, 198, NULL, NULL, '2026-2027'),
  ('Karim Moussa',     9,  'ATT', 'France',       '🇫🇷', FALSE, 3, 3, 1, 270, NULL, NULL, '2026-2027'),
  ('Yanis Diallo',     21, 'ATT', 'Sénégal',      '🇸🇳', FALSE, 3, 1, 0, 195, NULL, NULL, '2026-2027'),
  ('Samir Belkadi',    20, 'ATT', 'Algérie',      '🇩🇿', FALSE, 3, 1, 0, 185, NULL, NULL, '2026-2027'),
  ('Damien Renard',    12, 'ATT', 'France',       '🇫🇷', FALSE, 3, 0, 1, 112, NULL, NULL, '2026-2027'),
  ('Clément Dury',     24, 'ATT', 'France',       '🇫🇷', FALSE, 2, 1, 0, 47,  NULL, NULL, '2026-2027')
ON CONFLICT DO NOTHING;

INSERT INTO matches (home_team, away_team, home_score, away_score, match_date, match_time, competition, is_home, status, round, season) VALUES
  ('Olympique Rémois', 'AS Warmeriville', 4, 2, '2026-09-06', '15:00', 'Division 4', TRUE,  'played',   'J1', '2026-2027'),
  ('RC Épernay',       'Olympique Rémois', 1, 1, '2026-09-13', '15:00', 'Division 4', FALSE, 'played',   'J2', '2026-2027'),
  ('Olympique Rémois', 'CS Bezannes',      3, 0, '2026-09-20', '15:00', 'Division 4', TRUE,  'played',   'J3', '2026-2027'),
  ('Olympique Rémois', 'ES Tinqueux',      NULL, NULL, '2026-09-27', '15:00', 'Division 4', TRUE,  'upcoming', 'J4', '2026-2027'),
  ('AS Châlons',       'Olympique Rémois', NULL, NULL, '2026-10-04', '15:00', 'Division 4', FALSE, 'upcoming', 'J5', '2026-2027'),
  ('Olympique Rémois', 'FC Vitry',         NULL, NULL, '2026-10-11', '15:00', 'Division 4', TRUE,  'upcoming', 'J6', '2026-2027'),
  ('Olympique Rémois', 'US Fismes',        NULL, NULL, '2026-10-25', '15:00', 'Coupe de la Marne', TRUE, 'upcoming', 'C2', '2026-2027')
ON CONFLICT DO NOTHING;

INSERT INTO news (title, excerpt, body, category, author) VALUES
  ('5 nouvelles recrues pour la saison 2026/2027', 'L''OR finalise son mercato avec 5 joueurs.', 'L''Olympique Rémois a finalisé son mercato estival avec l''arrivée de cinq nouveaux joueurs. Bienvenue à tous !', 'Effectif', 'Staff OR'),
  ('BSK Immobilier renouvelle son soutien', 'Troisième saison consécutive de partenariat.', 'Pour la troisième saison consécutive, BSK Immobilier confirme son partenariat. Merci à Raphael Lobjois !', 'Partenariat', 'Staff OR'),
  ('Victoire 4–2 pour l''ouverture de saison', 'L''OR démarre en force avec une belle victoire.', 'L''Olympique Rémois a démarré 2026/2027 sur les chapeaux de roue. Buts : Moussa x2, Petit, Bernard.', 'Match', 'Staff OR')
ON CONFLICT DO NOTHING;

INSERT INTO sponsors (name, tier, logo_emoji, description, contact) VALUES
  ('BSK Immobilier',      'or',       '🏠', 'Sponsor maillot domicile',         'Raphael Lobjois – 06 03 84 65 99'),
  ('BC Résidences',       'or',       '🏡', 'Sponsor maillot extérieur',        'Constructeur maisons individuelles'),
  ('Inside Sport',        'argent',   '👟', 'Équipementier officiel Puma',      NULL),
  ('Pizzeria del Corso',  'argent',   '🍕', 'Partenaire repas d''avant-match',  NULL),
  ('Garage Lebrun Auto',  'argent',   '🔧', 'Transport équipe officiel',        NULL),
  ('Barber Shop Reims',   'bronze',   '💈', 'Partenaire bien-être',             NULL),
  ('Brasserie des Sacres','bronze',   '🍺', 'Restauration partenaire',          NULL),
  ('Fitness Club Rémois', 'bronze',   '🏋️', 'Salle de sport partenaire',       NULL),
  ('Cristalline Reims',   'materiel', '🥤', 'Hydratation officielle',           NULL),
  ('Pharmacie du Stade',  'materiel', '🩹', 'Matériel médical',                 NULL)
ON CONFLICT DO NOTHING;
