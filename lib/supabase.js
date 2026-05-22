import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey);

// ─── AUTH ────────────────────────────────────────────────────────────────────
export async function signUp(email, password, name, role) {
  const { data, error } = await supabase.auth.signUp({
    email, password,
    options: { data: { name, role: role || 'supporter' } }
  });
  return { data, error };
}

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  return { data, error };
}

export async function signOut() {
  return await supabase.auth.signOut();
}

export async function getUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function getSession() {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

// ─── MATCHES ─────────────────────────────────────────────────────────────────
export async function getMatches(season = '2026-2027') {
  const { data, error } = await supabase
    .from('matches')
    .select('*')
    .eq('season', season)
    .order('match_date', { ascending: false });
  return { data: data || [], error };
}

export async function getNextMatch() {
  const { data } = await supabase
    .from('matches')
    .select('*')
    .eq('status', 'upcoming')
    .order('match_date', { ascending: true })
    .limit(1);
  return data?.[0] || null;
}

export async function createMatch(match) {
  const { data, error } = await supabase.from('matches').insert([match]).select().single();
  return { data, error };
}

export async function updateMatch(id, updates) {
  const { data, error } = await supabase.from('matches').update(updates).eq('id', id).select().single();
  return { data, error };
}

export async function deleteMatch(id) {
  return await supabase.from('matches').delete().eq('id', id);
}

export async function getSeasonStats(season = '2026-2027') {
  const { data } = await supabase
    .from('matches')
    .select('*')
    .eq('season', season)
    .eq('status', 'played');

  if (!data) return { wins: 0, draws: 0, losses: 0, goals_for: 0, goals_against: 0, played: 0 };

  let wins = 0, draws = 0, losses = 0, goals_for = 0, goals_against = 0;
  data.forEach(m => {
    const orScore = m.is_home ? m.home_score : m.away_score;
    const opScore = m.is_home ? m.away_score : m.home_score;
    goals_for += orScore || 0;
    goals_against += opScore || 0;
    if (orScore > opScore) wins++;
    else if (orScore === opScore) draws++;
    else losses++;
  });
  return { wins, draws, losses, goals_for, goals_against, played: data.length };
}

export async function getRanking(season = '2026-2027') {
  const { data } = await supabase
    .from('matches')
    .select('*')
    .eq('season', season)
    .eq('status', 'played');

  if (!data || data.length === 0) return [];

  const teams = {};
  data.forEach(m => {
    [m.home_team, m.away_team].forEach((team, idx) => {
      if (!teams[team]) teams[team] = { team, played: 0, wins: 0, draws: 0, losses: 0, goals_for: 0, goals_against: 0, points: 0 };
      const isHome = idx === 0;
      const scored = isHome ? m.home_score : m.away_score;
      const conceded = isHome ? m.away_score : m.home_score;
      teams[team].played++;
      teams[team].goals_for += scored || 0;
      teams[team].goals_against += conceded || 0;
      if (scored > conceded) { teams[team].wins++; teams[team].points += 3; }
      else if (scored === conceded) { teams[team].draws++; teams[team].points += 1; }
      else teams[team].losses++;
    });
  });

  return Object.values(teams).sort((a, b) =>
    b.points - a.points || (b.goals_for - b.goals_against) - (a.goals_for - a.goals_against) || b.goals_for - a.goals_for
  );
}

// ─── PLAYERS ─────────────────────────────────────────────────────────────────
export async function getPlayers(season = '2026-2027') {
  const { data, error } = await supabase
    .from('players')
    .select('*')
    .eq('season', season)
    .eq('is_active', true)
    .order('number', { ascending: true });
  return { data: data || [], error };
}

export async function createPlayer(player) {
  const { data, error } = await supabase.from('players').insert([player]).select().single();
  return { data, error };
}

export async function updatePlayer(id, updates) {
  const { data, error } = await supabase.from('players').update(updates).eq('id', id).select().single();
  return { data, error };
}

export async function deletePlayer(id) {
  return await supabase.from('players').update({ is_active: false }).eq('id', id);
}

// ─── STAFF ───────────────────────────────────────────────────────────────────
export async function getStaff() {
  const { data } = await supabase.from('staff').select('*').order('id');
  return data || [];
}

// ─── NEWS ─────────────────────────────────────────────────────────────────────
export async function getNews(limit = 20) {
  const { data, error } = await supabase
    .from('news')
    .select('*')
    .eq('published', true)
    .order('created_at', { ascending: false })
    .limit(limit);
  return { data: data || [], error };
}

export async function createNews(article) {
  const { data, error } = await supabase.from('news').insert([article]).select().single();
  return { data, error };
}

export async function deleteNews(id) {
  return await supabase.from('news').delete().eq('id', id);
}

// ─── SPONSORS ────────────────────────────────────────────────────────────────
export async function getSponsors() {
  const { data } = await supabase
    .from('sponsors')
    .select('*')
    .eq('is_active', true)
    .order('id');
  return data || [];
}

// ─── GALLERY ─────────────────────────────────────────────────────────────────
export async function getGallery() {
  const { data } = await supabase
    .from('gallery')
    .select('*')
    .order('created_at', { ascending: false });
  return data || [];
}

export async function addGalleryItem(item) {
  const { data, error } = await supabase.from('gallery').insert([item]).select().single();
  return { data, error };
}
