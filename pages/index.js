import { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import { supabase, signIn as sbSignIn, signOut as sbSignOut, signUp as sbSignUp, getSession,
  getMatches, getNextMatch, getSeasonStats, getRanking,
  getPlayers, getStaff, createPlayer, deletePlayer, updatePlayer,
  getNews, createNews, deleteNews,
  getSponsors, getGallery,
  createMatch, updateMatch, deleteMatch
} from '../lib/supabase';

// ─── Helpers ─────────────────────────────────────────────────────────────────
const fmt = d => d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '–';
const fmtShort = d => d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }) : '–';

const posLabel = { GK: '🧤 Gardien', DEF: '🛡️ Défenseur', MID: '⚙️ Milieu', ATT: '⚡ Attaquant' };
const posCss   = { GK: 'pos-gk', DEF: 'pos-def', MID: 'pos-mid', ATT: 'pos-att' };

function matchBadge(m) {
  if (m.status === 'upcoming') return <span className="badge bu">À venir</span>;
  const orHome  = m.home_team.includes('Rémois');
  const orScore = orHome ? m.home_score : m.away_score;
  const opScore = orHome ? m.away_score : m.home_score;
  if (orScore > opScore)  return <span className="badge bw">Victoire</span>;
  if (orScore === opScore) return <span className="badge bd">Nul</span>;
  return <span className="badge bl">Défaite</span>;
}

function scoreDisplay(m) {
  if (m.status !== 'played' || m.home_score == null) return '–';
  return `${m.home_score}–${m.away_score}`;
}

function Toast({ msg, visible }) {
  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
      background: '#112045', border: '1px solid #c8a84b', color: '#fff',
      fontFamily: "'Barlow Condensed', sans-serif", fontSize: 14, letterSpacing: 1,
      padding: '12px 20px', borderRadius: 8, maxWidth: 280,
      transform: visible ? 'translateY(0)' : 'translateY(80px)',
      opacity: visible ? 1 : 0, transition: 'all .3s ease', pointerEvents: 'none',
    }}>
      {msg}
    </div>
  );
}

// ─── Admin Panel ─────────────────────────────────────────────────────────────
function AdminPanel({ onToast, onRefresh }) {
  const [form, setForm] = useState('match');
  const [matchData, setMatchData] = useState({
    home_team: '', away_team: '', match_date: '', match_time: '15:00',
    competition: 'Division 4', round: '', is_home: true, status: 'upcoming',
  });
  const [playerData, setPlayerData] = useState({
    name: '', number: '', position: 'ATT', nationality: 'France', flag: '🇫🇷',
    goals: 0, assists: 0, matches_played: 0, minutes: 0,
    is_captain: false, is_vice_cap: false, is_new: false,
  });
  const [newsData, setNewsData] = useState({ title: '', excerpt: '', body: '', category: 'Club' });

  const submitMatch = async () => {
    const { error } = await createMatch(matchData);
    if (!error) { onToast('✅ Match ajouté !'); onRefresh('matches'); }
    else onToast('❌ Erreur : ' + error.message);
  };

  const submitPlayer = async () => {
    const { error } = await createPlayer({ ...playerData, season: '2026-2027', is_active: true });
    if (!error) { onToast('✅ Joueur ajouté !'); onRefresh('squad'); }
    else onToast('❌ Erreur : ' + error.message);
  };

  const submitNews = async () => {
    const { error } = await createNews({ ...newsData, published: true });
    if (!error) { onToast('✅ Article publié !'); onRefresh('news'); }
    else onToast('❌ Erreur : ' + error.message);
  };

  const updateScore = async (id, hs, as_) => {
    const r = await fetch(`/api/matches/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ home_score: Number(hs), away_score: Number(as_), status: 'played' }),
    });
    if (r.ok) { onToast('✅ Score mis à jour !'); onRefresh('matches'); }
  };

  return (
    <div style={{ background: 'rgba(200,168,75,.06)', border: '1px solid rgba(200,168,75,.25)', borderRadius: 14, padding: '1.75rem', marginBottom: '2.5rem' }}>
      <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.8rem', letterSpacing: 2, marginBottom: '1.25rem', color: '#c8a84b' }}>
        🛠️ Panneau Admin
      </div>
      <div className="page-tabs" style={{ marginBottom: '1.5rem' }}>
        {['match','player','news'].map(t => (
          <button key={t} className={`ptab${form === t ? ' on' : ''}`} onClick={() => setForm(t)}>
            {t === 'match' ? '⚽ Match' : t === 'player' ? '👤 Joueur' : '📰 Article'}
          </button>
        ))}
      </div>

      {form === 'match' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div className="fg"><label>Équipe domicile</label><input value={matchData.home_team} onChange={e => setMatchData(p => ({ ...p, home_team: e.target.value }))} placeholder="Olympique Rémois" /></div>
            <div className="fg"><label>Équipe extérieur</label><input value={matchData.away_team} onChange={e => setMatchData(p => ({ ...p, away_team: e.target.value }))} placeholder="AS Châlons" /></div>
            <div className="fg"><label>Date</label><input type="date" value={matchData.match_date} onChange={e => setMatchData(p => ({ ...p, match_date: e.target.value }))} /></div>
            <div className="fg"><label>Heure</label><input value={matchData.match_time} onChange={e => setMatchData(p => ({ ...p, match_time: e.target.value }))} placeholder="15:00" /></div>
            <div className="fg"><label>Compétition</label><input value={matchData.competition} onChange={e => setMatchData(p => ({ ...p, competition: e.target.value }))} /></div>
            <div className="fg"><label>Journée (ex: J4)</label><input value={matchData.round} onChange={e => setMatchData(p => ({ ...p, round: e.target.value }))} placeholder="J4" /></div>
            <div className="fg"><label>Lieu</label>
              <select value={matchData.is_home ? '1' : '0'} onChange={e => setMatchData(p => ({ ...p, is_home: e.target.value === '1' }))}>
                <option value="1">Domicile</option><option value="0">Extérieur</option>
              </select>
            </div>
            <div className="fg"><label>Statut</label>
              <select value={matchData.status} onChange={e => setMatchData(p => ({ ...p, status: e.target.value }))}>
                <option value="upcoming">À venir</option><option value="played">Joué</option>
              </select>
            </div>
          </div>
          <button className="btn-p" onClick={submitMatch}>+ Ajouter le match</button>
        </div>
      )}

      {form === 'player' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div className="fg"><label>Nom complet</label><input value={playerData.name} onChange={e => setPlayerData(p => ({ ...p, name: e.target.value }))} placeholder="Jean Dupont" /></div>
            <div className="fg"><label>Numéro</label><input type="number" value={playerData.number} onChange={e => setPlayerData(p => ({ ...p, number: e.target.value }))} /></div>
            <div className="fg"><label>Poste</label>
              <select value={playerData.position} onChange={e => setPlayerData(p => ({ ...p, position: e.target.value }))}>
                <option value="GK">Gardien (GK)</option><option value="DEF">Défenseur (DEF)</option>
                <option value="MID">Milieu (MID)</option><option value="ATT">Attaquant (ATT)</option>
              </select>
            </div>
            <div className="fg"><label>Nationalité</label><input value={playerData.nationality} onChange={e => setPlayerData(p => ({ ...p, nationality: e.target.value }))} /></div>
            <div className="fg"><label>Drapeau emoji</label><input value={playerData.flag} onChange={e => setPlayerData(p => ({ ...p, flag: e.target.value }))} /></div>
            <div className="fg"><label>Buts</label><input type="number" value={playerData.goals} onChange={e => setPlayerData(p => ({ ...p, goals: Number(e.target.value) }))} /></div>
            <div className="fg"><label>Passes D.</label><input type="number" value={playerData.assists} onChange={e => setPlayerData(p => ({ ...p, assists: Number(e.target.value) }))} /></div>
            <div className="fg"><label>Matchs joués</label><input type="number" value={playerData.matches_played} onChange={e => setPlayerData(p => ({ ...p, matches_played: Number(e.target.value) }))} /></div>
            <div className="fg"><label>Options</label>
              <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap', marginTop: '.4rem' }}>
                {[['is_captain','Cap.'],['is_vice_cap','Vice-Cap.'],['is_new','Recrue']].map(([k, l]) => (
                  <label key={k} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: '#7a80a0', cursor: 'pointer' }}>
                    <input type="checkbox" checked={playerData[k]} onChange={e => setPlayerData(p => ({ ...p, [k]: e.target.checked }))} /> {l}
                  </label>
                ))}
              </div>
            </div>
          </div>
          <button className="btn-p" onClick={submitPlayer}>+ Ajouter le joueur</button>
        </div>
      )}

      {form === 'news' && (
        <div>
          <div className="fg"><label>Titre</label><input value={newsData.title} onChange={e => setNewsData(p => ({ ...p, title: e.target.value }))} placeholder="Titre de l'article" /></div>
          <div className="fg"><label>Résumé</label><input value={newsData.excerpt} onChange={e => setNewsData(p => ({ ...p, excerpt: e.target.value }))} placeholder="Résumé court..." /></div>
          <div className="fg"><label>Catégorie</label>
            <select value={newsData.category} onChange={e => setNewsData(p => ({ ...p, category: e.target.value }))}>
              <option>Club</option><option>Effectif</option><option>Match</option><option>Partenariat</option>
            </select>
          </div>
          <div className="fg"><label>Contenu complet</label>
            <textarea value={newsData.body} onChange={e => setNewsData(p => ({ ...p, body: e.target.value }))} rows={4} placeholder="Rédigez l'article..." style={{ resize: 'vertical' }} />
          </div>
          <button className="btn-p" onClick={submitNews}>📰 Publier l'article</button>
        </div>
      )}
    </div>
  );
}

// ─── Composants de pages ──────────────────────────────────────────────────────
function HomePage({ data, onNav }) {
  const { matches = [], stats = {}, next } = data;
  const recent = matches.filter(m => m.status === 'played').slice(0, 3);

  return (
    <div>
      <div className="hero">
        <div className="hero-badge">⚽ Division 4 · Saison 2026/2027</div>
        <h1>OLYMPIQUE<em>RÉMOIS</em></h1>
        <p className="hero-tagline">Le club de football amateur de Reims — passion, travail et ambition.</p>
        <div className="hero-btns">
          <button className="btn-p" onClick={() => onNav('results')}>Résultats</button>
          <button className="btn-o" onClick={() => onNav('squad')}>L'Effectif</button>
          <button className="btn-s" onClick={() => onNav('news')}>Actualités</button>
        </div>
      </div>

      <div className="wrap">
        {next && (
          <div className="next-match">
            <div>
              <div className="nm-label">⚽ Prochain match · {next.round}</div>
              <div className="nm-teams">
                <div className="nm-team">{next.home_team}</div>
                <div className="nm-vs">VS</div>
                <div className="nm-team">{next.away_team}</div>
              </div>
              <div className="nm-meta">
                <span>📅 {fmt(next.match_date)}</span>
                <span>🕒 {next.match_time}</span>
                <span>📍 {next.venue}</span>
              </div>
            </div>
            <Countdown target={new Date(next.match_date + 'T' + next.match_time)} />
          </div>
        )}

        <div className="stats-grid">
          <div className="stat-box"><div className="stat-v">{stats.wins || 0}</div><div className="stat-l">Victoires</div></div>
          <div className="stat-box"><div className="stat-v">{stats.draws || 0}</div><div className="stat-l">Nuls</div></div>
          <div className="stat-box"><div className="stat-v">{stats.losses || 0}</div><div className="stat-l">Défaites</div></div>
          <div className="stat-box"><div className="stat-v">{stats.goals_for || 0}</div><div className="stat-l">Buts marqués</div></div>
          <div className="stat-box"><div className="stat-v">{stats.goals_against || 0}</div><div className="stat-l">Buts encaissés</div></div>
          <div className="stat-box"><div className="stat-v">{Number(stats.wins||0)*3 + Number(stats.draws||0)}</div><div className="stat-l">Points</div></div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }} className="home-split">
          <div>
            <div className="sec-bar">
              <div><div className="sec-t" style={{ fontSize: '1.5rem' }}>Derniers résultats</div><div className="sec-s">2026/2027</div></div>
              <button className="btn-s" onClick={() => onNav('results')}>Tout voir →</button>
            </div>
            {recent.length === 0 ? <p style={{ color: 'var(--gray)', fontSize: 14 }}>Aucun match joué encore.</p> :
              recent.map(m => (
                <div key={m.id} className="mc">
                  <div className="mc-left"><div className="mc-hn">{m.home_team}</div><div className="mc-comp">{m.competition} · {m.round}</div></div>
                  <div className="mc-sc"><div className="mc-num">{scoreDisplay(m)}</div><div className="mc-dt">{fmtShort(m.match_date)}</div></div>
                  <div className="mc-right"><div className="mc-an">{m.away_team}</div></div>
                  {matchBadge(m)}
                </div>
              ))
            }
          </div>
          <div>
            <div className="sec-bar">
              <div><div className="sec-t" style={{ fontSize: '1.5rem' }}>Prochaines rencontres</div></div>
            </div>
            {matches.filter(m => m.status === 'upcoming').slice(0, 3).map(m => (
              <div key={m.id} className="mc">
                <div className="mc-left"><div className="mc-hn">{m.home_team}</div><div className="mc-comp">{m.competition} · {m.round}</div></div>
                <div className="mc-sc"><div className="mc-num">–</div><div className="mc-dt">{fmtShort(m.match_date)} {m.match_time}</div></div>
                <div className="mc-right"><div className="mc-an">{m.away_team}</div></div>
                <span className="badge bu">À venir</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Countdown({ target }) {
  const [diff, setDiff] = useState({});
  useEffect(() => {
    const tick = () => {
      const ms = target - new Date();
      if (ms <= 0) { setDiff({ d: 0, h: '00', m: '00' }); return; }
      const d = Math.floor(ms / 86400000);
      const h = String(Math.floor((ms % 86400000) / 3600000)).padStart(2, '0');
      const m = String(Math.floor((ms % 3600000) / 60000)).padStart(2, '0');
      setDiff({ d, h, m });
    };
    tick();
    const id = setInterval(tick, 30000);
    return () => clearInterval(id);
  }, [target]);
  return (
    <div className="nm-countdown">
      <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--g)', marginBottom: '.4rem', textAlign: 'center' }}>Compte à rebours</div>
      <div className="cd-boxes">
        <div className="cd-box"><div className="cd-num">{diff.d ?? '--'}</div><div className="cd-lbl">Jours</div></div>
        <div className="cd-box"><div className="cd-num">{diff.h ?? '--'}</div><div className="cd-lbl">H</div></div>
        <div className="cd-box"><div className="cd-num">{diff.m ?? '--'}</div><div className="cd-lbl">Min</div></div>
      </div>
    </div>
  );
}

function ResultsPage({ data, onToast, session, onRefresh }) {
  const { matches = [] } = data;
  const [season, setSeason] = useState('2026-2027');
  const [editId, setEditId] = useState(null);
  const [hs, setHs] = useState('');
  const [as_, setAs] = useState('');

  const saveScore = async (id) => {
    const { error } = await updateMatch(id, { home_score: Number(hs), away_score: Number(as_), status: 'played' });
    if (!error) { onToast('✅ Score mis à jour !'); setEditId(null); onRefresh('matches'); }
    else onToast('❌ ' + error.message);
  };

  const delMatch = async (id) => {
    if (!confirm('Supprimer ce match ?')) return;
    await deleteMatch(id);
    onToast('Match supprimé'); onRefresh('matches');
  };

  const canEdit = ['admin','staff'].includes(session?.user?.user_metadata?.role);

  return (
    <div className="wrap">
      <div className="sec-bar">
        <div><div className="sec-t">Résultats</div><div className="sec-s">Division 4 · 2026/2027</div></div>
        <select className="season-sel" value={season} onChange={e => setSeason(e.target.value)}>
          <option value="2026-2027">Saison 2026/2027</option>
          <option value="2025-2026">Saison 2025/2026</option>
        </select>
      </div>
      {matches.length === 0 ? <p style={{ color: 'var(--gray)', fontSize: 14 }}>Aucun match pour cette saison.</p> :
        matches.map(m => (
          <div key={m.id} className="mc" style={{ alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <div className="mc-left"><div className="mc-hn">{m.home_team}</div><div className="mc-comp">{m.competition} · {m.round}</div></div>
            <div className="mc-sc">
              {editId === m.id ? (
                <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                  <input type="number" value={hs} onChange={e => setHs(e.target.value)} style={{ width: 40, background: 'rgba(255,255,255,.1)', border: '1px solid var(--g)', borderRadius: 4, color: '#fff', padding: '2px 6px', fontSize: 13 }} />
                  <span>–</span>
                  <input type="number" value={as_} onChange={e => setAs(e.target.value)} style={{ width: 40, background: 'rgba(255,255,255,.1)', border: '1px solid var(--g)', borderRadius: 4, color: '#fff', padding: '2px 6px', fontSize: 13 }} />
                  <button onClick={() => saveScore(m.id)} style={{ background: 'var(--g)', color: '#0b1535', border: 'none', borderRadius: 4, padding: '2px 8px', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>OK</button>
                </div>
              ) : (
                <div className="mc-num">{scoreDisplay(m)}</div>
              )}
              <div className="mc-dt">{fmtShort(m.match_date)} {m.match_time}</div>
            </div>
            <div className="mc-right"><div className="mc-an">{m.away_team}</div></div>
            {matchBadge(m)}
            {canEdit && (
              <div style={{ display: 'flex', gap: 4, marginLeft: 'auto' }}>
                <button onClick={() => { setEditId(m.id); setHs(m.home_score ?? ''); setAs(m.away_score ?? ''); }} style={{ background: 'rgba(200,168,75,.15)', color: 'var(--g)', border: '1px solid var(--gab)', borderRadius: 5, padding: '3px 10px', cursor: 'pointer', fontSize: 11, fontFamily: "'Barlow Condensed',sans-serif", letterSpacing: 1 }}>✏️ Score</button>
                <button onClick={() => delMatch(m.id)} style={{ background: 'rgba(248,113,113,.12)', color: '#f87171', border: '1px solid rgba(248,113,113,.2)', borderRadius: 5, padding: '3px 10px', cursor: 'pointer', fontSize: 11 }}>🗑️</button>
              </div>
            )}
          </div>
        ))
      }
    </div>
  );
}

function RankingPage({ data }) {
  const { ranking = [], players = [] } = data;
  const scorers = [...(players || [])].sort((a, b) => b.goals - a.goals || b.assists - a.assists).slice(0, 8);

  return (
    <div className="wrap">
      <div className="sec-head">
        <div className="sec-t">Classement</div>
        <div className="sec-s">Division 4 · Groupe B Marne · 2026/2027</div>
        <div className="gold-line" />
      </div>
      <div className="tbl-wrap" style={{ marginBottom: '2.5rem' }}>
        <table className="rank">
          <thead><tr><th>#</th><th>Équipe</th><th>Pts</th><th>J</th><th>V</th><th>N</th><th>D</th><th>Bp</th><th>Bc</th><th>Diff</th></tr></thead>
          <tbody>
            {ranking.length === 0 ? (
              <tr><td colSpan={10} style={{ textAlign: 'center', color: 'var(--gray)', padding: '2rem', fontSize: 14 }}>Aucun match joué — le classement apparaîtra ici automatiquement.</td></tr>
            ) : ranking.map((row, i) => {
              const diff = Number(row.goals_for) - Number(row.goals_against);
              const isOR = row.team?.includes('Rémois');
              return (
                <tr key={row.team} className={isOR ? 'hl' : ''}>
                  <td><span className={`rpos${i === 0 ? ' gold' : i < 3 ? ' silver' : ''}`}>{i + 1}</span></td>
                  <td><div className="tc"><div className="tdot" style={{ background: isOR ? 'var(--g)' : i === 0 ? 'var(--green)' : i < 3 ? 'var(--blue)' : 'var(--gray)' }} />{isOR ? <strong>{row.team}</strong> : row.team}</div></td>
                  <td><span className="pts-big" style={isOR ? { color: 'var(--g)' } : {}}>{row.points}</span></td>
                  <td>{row.played}</td><td>{row.wins}</td><td>{row.draws}</td><td>{row.losses}</td>
                  <td>{row.goals_for}</td><td>{row.goals_against}</td>
                  <td style={{ color: diff > 0 ? 'var(--green)' : diff < 0 ? 'var(--red)' : 'var(--gray)' }}>{diff > 0 ? '+' : ''}{diff}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="sec-t" style={{ fontSize: '1.5rem', marginBottom: '.3rem' }}>Buteurs de l'équipe</div>
      <div className="sec-s" style={{ marginBottom: '1.25rem' }}>Saison 2026/2027</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: '.75rem' }}>
        {scorers.filter(p => p.goals > 0 || p.assists > 0).map((p, i) => (
          <div key={p.id} className="stat-box" style={{ display: 'flex', alignItems: 'center', gap: '.9rem', textAlign: 'left', padding: '.9rem 1.1rem' }}>
            <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: '1.6rem', color: i === 0 ? 'var(--g)' : i < 3 ? 'var(--blue)' : 'var(--gray)', width: 28, flexShrink: 0 }}>{i + 1}</div>
            <div><div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 15, fontWeight: 700 }}>{p.name}</div><div style={{ fontSize: 11, color: 'var(--gray)' }}>{posLabel[p.position]}</div></div>
            <div style={{ marginLeft: 'auto', fontFamily: "'Bebas Neue',sans-serif", fontSize: '1.4rem' }}>{p.goals} ⚽</div>
          </div>
        ))}
        {scorers.filter(p => p.goals > 0).length === 0 && <p style={{ color: 'var(--gray)', fontSize: 14, gridColumn: '1/-1' }}>Pas encore de buts cette saison.</p>}
      </div>
    </div>
  );
}

function CalendarPage({ data }) {
  const { matches = [] } = data;
  const upcoming = matches.filter(m => m.status === 'upcoming').sort((a, b) => new Date(a.match_date) - new Date(b.match_date));

  return (
    <div className="wrap">
      <div className="sec-head">
        <div className="sec-t">Calendrier</div>
        <div className="sec-s">Rencontres à venir · Saison 2026/2027</div>
        <div className="gold-line" />
      </div>
      {upcoming.length === 0 ? <p style={{ color: 'var(--gray)', fontSize: 14 }}>Aucune rencontre à venir.</p> :
        upcoming.map(m => (
          <div key={m.id} className="mc">
            <div className="mc-left"><div className="mc-hn">{m.home_team}</div><div className="mc-comp">{m.competition} · {m.round} · {m.is_home ? 'Domicile' : 'Extérieur'}</div></div>
            <div className="mc-sc"><div className="mc-num">–</div><div className="mc-dt">{fmtShort(m.match_date)} · {m.match_time}</div></div>
            <div className="mc-right"><div className="mc-an">{m.away_team}</div></div>
            <span className={`badge ${m.competition?.includes('Coupe') ? 'bm' : 'bu'}`}>{m.competition?.includes('Coupe') ? 'Coupe' : 'À venir'}</span>
          </div>
        ))
      }
      <div className="info-box" style={{ marginTop: '2rem' }}>
        <div className="ib-l">📍 Terrain domicile</div>
        <div className="ib-t">Stade Léo Lagrange – Reims</div>
        <div className="ib-m">Av. du Président Franklin Roosevelt, 51100 Reims · Capacité 1 200 places</div>
      </div>
    </div>
  );
}

function SquadPage({ data, session, onToast, onRefresh }) {
  const { players = [], staff = [] } = data;
  const [selected, setSelected] = useState(null);
  const canEdit = ['admin','staff'].includes(session?.user?.user_metadata?.role);

  const delPlayer = async (id) => {
    if (!confirm('Retirer ce joueur ?')) return;
    await deletePlayer(id);
    onToast('Joueur retiré'); onRefresh('squad');
  };

  const groups = {
    GK: players.filter(p => p.position === 'GK'),
    DEF: players.filter(p => p.position === 'DEF'),
    MID: players.filter(p => p.position === 'MID'),
    ATT: players.filter(p => p.position === 'ATT'),
  };
  const groupIcons = { GK: '🧤', DEF: '🛡️', MID: '⚙️', ATT: '⚡' };
  const groupNames = { GK: 'Gardiens de but', DEF: 'Défenseurs', MID: 'Milieux de terrain', ATT: 'Attaquants' };

  return (
    <div className="wrap">
      <div className="sec-bar">
        <div><div className="sec-t">L'Effectif</div><div className="sec-s">Saison 2026/2027 · {players.length} joueurs</div></div>
      </div>

      <div className="squad-stats-banner">
        <div className="ssb-item"><div className="ssb-v">{players.length}</div><div className="ssb-l">Joueurs</div></div>
        {['GK','DEF','MID','ATT'].map(pos => (
          <div key={pos} className="ssb-item"><div className="ssb-v">{groups[pos].length}</div><div className="ssb-l">{pos === 'GK' ? 'Gardiens' : pos === 'DEF' ? 'Défenseurs' : pos === 'MID' ? 'Milieux' : 'Attaquants'}</div></div>
        ))}
        <div className="ssb-item"><div className="ssb-v">{[...new Set(players.map(p => p.nationality))].length}</div><div className="ssb-l">Nationalités</div></div>
        <div className="ssb-item"><div className="ssb-v">{players.filter(p => p.is_new).length}</div><div className="ssb-l">Recrues</div></div>
      </div>

      {['GK','DEF','MID','ATT'].map(pos => groups[pos].length > 0 && (
        <div key={pos} className="squad-section">
          <div className="squad-title">{groupIcons[pos]} {groupNames[pos]} <span className="squad-count">{groups[pos].length}</span></div>
          <div className="players-grid">
            {groups[pos].map(p => (
              <div key={p.id} className="player-card" onClick={() => setSelected(p)}>
                <div className="pc-top">
                  <div className="pc-num">{p.number}</div>
                  <div className="pc-avatar">{p.name.split(' ').map(w => w[0]).join('').substring(0,2)}</div>
                  <div className={`pc-pos-badge ${posCss[p.position]}`}>{p.position === 'GK' ? 'Gardien' : p.position === 'DEF' ? 'Défenseur' : p.position === 'MID' ? 'Milieu' : 'Attaquant'}</div>
                </div>
                <div className="pc-body">
                  <div className="pc-name">{p.name}</div>
                  <div className="pc-nation">{p.flag} {p.nationality}{p.is_captain ? ' · Capitaine' : p.is_vice_cap ? ' · Vice-Cap.' : ''}{p.is_new ? ' · Recrue' : ''}</div>
                  <div className="pc-stats">
                    <div className="pc-stat"><div className="pc-sv">{p.matches_played}</div><div className="pc-sl">Matchs</div></div>
                    <div className="pc-stat"><div className="pc-sv">{p.position === 'GK' ? (p.clean_sheets ?? '–') : p.goals}</div><div className="pc-sl">{p.position === 'GK' ? 'CS' : 'Buts'}</div></div>
                    <div className="pc-stat"><div className="pc-sv">{p.position === 'GK' ? (p.saves ?? '–') : p.assists}</div><div className="pc-sl">{p.position === 'GK' ? 'Arr.' : 'Passes'}</div></div>
                  </div>
                  {canEdit && (
                    <button onClick={e => { e.stopPropagation(); delPlayer(p.id); }} style={{ marginTop: '.5rem', width: '100%', background: 'rgba(248,113,113,.08)', color: '#f87171', border: '1px solid rgba(248,113,113,.15)', borderRadius: 5, padding: '4px', cursor: 'pointer', fontSize: 11, fontFamily: "'Barlow Condensed',sans-serif" }}>
                      🗑️ Retirer
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {staff.length > 0 && (
        <div className="squad-section">
          <div className="squad-title">👨‍💼 Staff Technique <span className="squad-count">{staff.length}</span></div>
          <div className="staff-grid">
            {staff.map(s => (
              <div key={s.id} className="staff-card">
                <div className="staff-avatar">{s.initials || s.name.substring(0,2)}</div>
                <div className="staff-info">
                  <div className="staff-name">{s.name}</div>
                  <div className="staff-role">{s.role}</div>
                  {s.since_year && <div className="staff-since">Au club depuis {s.since_year}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Player Modal */}
      {selected && (
        <div className="modal-bg open" onClick={e => e.target === e.currentTarget && setSelected(null)}>
          <div className="modal">
            <button className="modal-close" onClick={() => setSelected(null)}>✕</button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', marginBottom: '1.25rem' }}>
              <div className="pc-avatar" style={{ width: 72, height: 72, fontSize: '1.8rem', flexShrink: 0, borderRadius: '50%', background: 'linear-gradient(135deg,var(--n3),var(--n4))', border: '2px solid var(--gab)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Bebas Neue',sans-serif", color: 'var(--g)' }}>
                {selected.name.split(' ').map(w => w[0]).join('').substring(0,2)}
              </div>
              <div>
                <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: '1.8rem', letterSpacing: 2 }}>#{selected.number} {selected.name}</div>
                <div style={{ fontSize: 13, color: 'var(--gray)' }}>{posLabel[selected.position]}</div>
                <div style={{ fontSize: 13, color: 'var(--gray)' }}>{selected.flag} {selected.nationality}{selected.is_captain ? ' · 🅰️ Capitaine' : ''}{selected.is_new ? ' · ✨ Recrue 2026/27' : ''}</div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '.6rem', marginBottom: '1.25rem' }}>
              <div className="stat-box" style={{ padding: '.8rem' }}><div className="stat-v">{selected.matches_played}</div><div className="stat-l">Matchs</div></div>
              <div className="stat-box" style={{ padding: '.8rem' }}><div className="stat-v">{selected.position === 'GK' ? (selected.clean_sheets ?? '–') : selected.goals}</div><div className="stat-l">{selected.position === 'GK' ? 'CS' : 'Buts'}</div></div>
              <div className="stat-box" style={{ padding: '.8rem' }}><div className="stat-v">{selected.position === 'GK' ? (selected.saves ?? '–') : selected.assists}</div><div className="stat-l">{selected.position === 'GK' ? 'Arrêts' : 'Passes D.'}</div></div>
              <div className="stat-box" style={{ padding: '.8rem' }}><div className="stat-v">{selected.minutes ?? 0}'</div><div className="stat-l">Minutes</div></div>
            </div>
            {selected.bio && <p style={{ fontSize: 14, color: 'var(--w6)', lineHeight: 1.7 }}>{selected.bio}</p>}
            <p style={{ fontSize: 13, color: 'var(--gray)', marginTop: '.5rem' }}>Cartons jaunes : {selected.yellow_cards} · Cartons rouges : {selected.red_cards}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function NewsPage({ data, session, onToast, onRefresh }) {
  const { news = [] } = data;
  const [selected, setSelected] = useState(null);
  const canEdit = ['admin','staff'].includes(session?.user?.user_metadata?.role);

  const delNews = async (id, e) => {
    e.stopPropagation();
    if (!confirm('Supprimer cet article ?')) return;
    await deleteNews(id);
    onToast('Article supprimé'); onRefresh('news');
  };

  const catEmoji = { Effectif: '👥', Match: '⚽', Partenariat: '🤝', Club: '🏟️' };

  return (
    <div className="wrap">
      <div className="sec-head">
        <div className="sec-t">Actualités</div>
        <div className="sec-s">Toutes les nouvelles du club</div>
        <div className="gold-line" />
      </div>
      {news.length === 0 ? <p style={{ color: 'var(--gray)', fontSize: 14 }}>Aucune actualité publiée.</p> : (
        <div className="news-grid">
          {news.map(n => (
            <div key={n.id} className="news-card" onClick={() => setSelected(n)}>
              <div className="news-thumb" style={{ background: 'linear-gradient(135deg,var(--n2),var(--n3))' }}>{catEmoji[n.category] || '📰'}</div>
              <div className="news-body">
                <div className="news-cat">{n.category}</div>
                <div className="news-title">{n.title}</div>
                {n.excerpt && <div className="news-excerpt">{n.excerpt}</div>}
                <div className="news-date" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>{fmt(n.created_at)} · {n.author}</span>
                  {canEdit && <button onClick={e => delNews(n.id, e)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: '#f87171' }}>🗑️</button>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      {selected && (
        <div className="modal-bg open" onClick={e => e.target === e.currentTarget && setSelected(null)}>
          <div className="modal">
            <button className="modal-close" onClick={() => setSelected(null)}>✕</button>
            <div className="news-cat" style={{ marginBottom: '.5rem' }}>{selected.category}</div>
            <h3>{selected.title}</h3>
            <div style={{ fontSize: 12, color: 'var(--gray)', margin: '.5rem 0 1rem' }}>📅 {fmt(selected.created_at)} · {selected.author}</div>
            {selected.excerpt && <p style={{ fontSize: 14, color: 'var(--w8)', marginBottom: '.75rem' }}>{selected.excerpt}</p>}
            {selected.body && <p style={{ fontSize: 14, color: 'var(--w6)', lineHeight: 1.75 }}>{selected.body}</p>}
          </div>
        </div>
      )}
    </div>
  );
}

function AccountPage({ session, onToast }) {
  const [mode, setMode] = useState('login');
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [regForm, setRegForm] = useState({ name: '', email: '', password: '', confirm: '', role: 'supporter' });
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!loginForm.email || !loginForm.password) return onToast('⚠️ Remplissez tous les champs');
    setLoading(true);
    const { error } = await sbSignIn(loginForm.email, loginForm.password);
    setLoading(false);
    if (error) onToast('❌ Email ou mot de passe incorrect');
    else onToast('✅ Connexion réussie !');
  };

  const handleRegister = async () => {
    if (!regForm.name || !regForm.email || !regForm.password) return onToast('⚠️ Champs requis manquants');
    if (regForm.password !== regForm.confirm) return onToast('⚠️ Les mots de passe ne correspondent pas');
    if (regForm.password.length < 8) return onToast('⚠️ Mot de passe trop court (min. 8 caractères)');
    setLoading(true);
    const { error } = await sbSignUp(regForm.email, regForm.password, regForm.name, regForm.role);
    setLoading(false);
    if (error) onToast('❌ ' + error.message);
    else { onToast('✅ Compte créé ! Vérifiez votre email pour confirmer.'); setMode('login'); }
  };

  if (session) return (
    <div className="auth-outer">
      <div className="auth-card">
        <div className="auth-hd">
          <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'linear-gradient(135deg,var(--n3),var(--n4))', border: '2px solid var(--g)', margin: '0 auto .75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Bebas Neue',sans-serif", fontSize: '1.4rem', color: 'var(--g)' }}>
            {session?.user?.user_metadata?.name || session?.user?.email?.charAt(0) || '?'}
          </div>
          <h2>{session?.user?.user_metadata?.name || session?.user?.email}</h2>
          <p>{session?.user?.email}</p>
          <p style={{ marginTop: '.3rem', fontFamily: "'Barlow Condensed',sans-serif", fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--g)' }}>{session?.user?.user_metadata?.role}</p>
        </div>
        <div style={{ background: 'rgba(200,168,75,.06)', border: '1px solid rgba(200,168,75,.15)', borderRadius: 8, padding: '1rem', marginBottom: '1.25rem', fontSize: 13, color: 'var(--w6)', lineHeight: 1.7 }}>
          {session?.user?.user_metadata?.role === 'admin' ? '🛠️ Accès admin complet — panneau visible sur les pages' : session?.user?.user_metadata?.role === 'staff' ? '⚽ Accès staff — gestion matchs, joueurs et actualités' : '👤 Compte membre — accès à la galerie photos et au contenu exclusif'}
        </div>
        <button className="btn-form" style={{ background: 'rgba(248,113,113,.15)', color: '#f87171' }} onClick={() => { sbSignOut(); onToast('👋 Déconnecté'); }}>
          Se déconnecter
        </button>
      </div>
    </div>
  );

  return (
    <div className="auth-outer">
      <div className="auth-card">
        <div className="auth-hd">
          <img src="/logo.png" alt="OR" style={{ width: 64, height: 64, borderRadius: '50%', border: '2px solid #c8a84b', margin: '0 auto .75rem', objectFit: 'cover', display: 'block' }} />
          <h2>Espace Membres</h2>
          <p>Olympique Rémois · Accès club</p>
        </div>
        <div className="auth-tabs">
          <button className={`at${mode === 'login' ? ' on' : ''}`} onClick={() => setMode('login')}>Connexion</button>
          <button className={`at${mode === 'register' ? ' on' : ''}`} onClick={() => setMode('register')}>Inscription</button>
        </div>
        {mode === 'login' ? (
          <div>
            <div className="fg"><label>Email</label><input type="email" value={loginForm.email} onChange={e => setLoginForm(p => ({ ...p, email: e.target.value }))} placeholder="adresse@email.fr" /></div>
            <div className="fg"><label>Mot de passe</label><input type="password" value={loginForm.password} onChange={e => setLoginForm(p => ({ ...p, password: e.target.value }))} onKeyDown={e => e.key === 'Enter' && handleLogin()} placeholder="••••••••" /></div>
            <button className="btn-form" onClick={handleLogin} disabled={loading}>{loading ? 'Connexion...' : 'Se connecter'}</button>
            <div className="auth-link">Mot de passe oublié ?</div>
          </div>
        ) : (
          <div>
            <div className="fg"><label>Nom complet</label><input value={regForm.name} onChange={e => setRegForm(p => ({ ...p, name: e.target.value }))} placeholder="Jean Dupont" /></div>
            <div className="fg"><label>Email</label><input type="email" value={regForm.email} onChange={e => setRegForm(p => ({ ...p, email: e.target.value }))} placeholder="adresse@email.fr" /></div>
            <div className="fg"><label>Rôle dans le club</label>
              <select value={regForm.role} onChange={e => setRegForm(p => ({ ...p, role: e.target.value }))}>
                <option value="supporter">Supporter</option>
                <option value="joueur">Joueur</option>
                <option value="staff">Staff</option>
                <option value="dirigeant">Dirigeant</option>
                <option value="partenaire">Partenaire / Sponsor</option>
              </select>
            </div>
            <div className="fg"><label>Mot de passe</label><input type="password" value={regForm.password} onChange={e => setRegForm(p => ({ ...p, password: e.target.value }))} placeholder="Min. 8 caractères" /></div>
            <div className="fg"><label>Confirmer</label><input type="password" value={regForm.confirm} onChange={e => setRegForm(p => ({ ...p, confirm: e.target.value }))} placeholder="Répéter" /></div>
            <button className="btn-form" onClick={handleRegister} disabled={loading}>{loading ? 'Création en cours...' : '✅ Créer mon compte'}</button>
        <p style={{ fontSize: 11, color: 'var(--gray)', textAlign: 'center', marginTop: '.75rem', lineHeight: 1.6 }}>En créant un compte vous acceptez les conditions d'utilisation de l'Olympique Rémois.</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── APP PRINCIPAL ────────────────────────────────────────────────────────────
export default function App() {
  const [session, setSession] = useState(null);

  useEffect(() => {
    getSession().then(s => setSession(s));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });
    return () => subscription.unsubscribe();
  }, []);
  const [page, setPage] = useState('home');
  const [data, setData] = useState({ matches: [], players: [], staff: [], news: [], sponsors: [], ranking: [], stats: {}, next: null });
  const [toast, setToast] = useState({ msg: '', visible: false });
  const [menuOpen, setMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const showToast = (msg) => {
    setToast({ msg, visible: true });
    setTimeout(() => setToast(t => ({ ...t, visible: false })), 3000);
  };

  const fetchData = useCallback(async (key = 'all') => {
    try {
      if (key === 'all' || key === 'matches') {
        const [{ data: matches }, stats, next] = await Promise.all([
          getMatches(), getSeasonStats(), getNextMatch()
        ]);
        setData(p => ({ ...p, matches: matches || [], stats: stats || {}, next }));
      }
      if (key === 'all' || key === 'squad') {
        const [{ data: players }, staff] = await Promise.all([getPlayers(), getStaff()]);
        setData(p => ({ ...p, players: players || [], staff: staff || [] }));
      }
      if (key === 'all' || key === 'news') {
        const { data: news } = await getNews();
        setData(p => ({ ...p, news: news || [] }));
      }
      if (key === 'all' || key === 'ranking') {
        const ranking = await getRanking();
        setData(p => ({ ...p, ranking: ranking || [] }));
      }
      if (key === 'all' || key === 'sponsors') {
        const sponsors = await getSponsors();
        setData(p => ({ ...p, sponsors: sponsors || [] }));
      }
    } catch (e) {
      console.error('Fetch error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData('all'); }, [fetchData]);

  const go = (p) => { setPage(p); setMenuOpen(false); window.scrollTo({ top: 0, behavior: 'smooth' }); };

  const pages = ['home', 'news', 'results', 'rank', 'calendar', 'squad', 'kits', 'photos', 'sponsors', 'club'];
  const pageLabels = { home: 'Accueil', news: 'Actualités', results: 'Résultats', rank: 'Classement', calendar: 'Calendrier', squad: 'Équipe', kits: 'Tenues', photos: 'Photos', sponsors: 'Partenaires', club: 'Le Club' };

  const isAdmin = ['admin','staff'].includes(session?.user?.user_metadata?.role);

  return (
    <>
      <Head>
        <title>Olympique Rémois | Club de Football</title>
        <meta name="description" content="Site officiel de l'Olympique Rémois – Division 4 Marne" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow:wght@400;500;600&family=Barlow+Condensed:wght@500;700&display=swap" rel="stylesheet" />
      </Head>

      <nav id="nav">
        <div className="nav-in">
          <button className="logo-btn" onClick={() => go('home')}>
            <img src="/logo.png" alt="OR" style={{ width: 42, height: 42, borderRadius: '50%', border: '2px solid var(--g)', objectFit: 'cover', flexShrink: 0 }} />
            <div className="logo-wrap"><span className="logo-main">Olympique Rémois</span><span className="logo-sub">Club Officiel · Reims</span></div>
          </button>
          <div className="nav-scroll">
            {pages.map(p => <button key={p} className={`nl${page === p ? ' on' : ''}`} onClick={() => go(p)}>{pageLabels[p]}</button>)}
          </div>
          <div className="nav-right">
            <button className="nav-cta" onClick={() => go('account')}>
              {session ? `👤 ${session?.user?.user_metadata?.name || session?.user?.email.split(' ')[0]}` : '👤 Connexion'}
            </button>
          </div>
          <div className={`hamburger${menuOpen ? ' open' : ''}`} onClick={() => setMenuOpen(m => !m)}>
            <span /><span /><span />
          </div>
        </div>
      </nav>

      <div className={`mob-overlay${menuOpen ? ' open' : ''}`}>
        {pages.map(p => <button key={p} className={`nl${page === p ? ' on' : ''}`} onClick={() => go(p)}>{pageLabels[p]}</button>)}
        <button className="nl" onClick={() => go('account')}>{session ? 'Mon compte' : 'Connexion'}</button>
      </div>

      {loading && <div style={{ textAlign: 'center', padding: '6rem 2rem', color: 'var(--gray)', fontFamily: "'Barlow Condensed',sans-serif", fontSize: 16, letterSpacing: 2 }}>Chargement...</div>}

      {!loading && (
        <main>
          {isAdmin && !loading && (
            <div className="wrap" style={{ paddingBottom: 0 }}>
              <AdminPanel onToast={showToast} onRefresh={fetchData} />
            </div>
          )}

          <div className={`pg${page === 'home' ? ' on' : ''}`}><HomePage data={{ matches: data.matches, stats: data.stats, next: data.next }} onNav={go} /></div>
          <div className={`pg${page === 'news' ? ' on' : ''}`}><NewsPage data={{ news: data.news }} session={session} onToast={showToast} onRefresh={fetchData} /></div>
          <div className={`pg${page === 'results' ? ' on' : ''}`}><ResultsPage data={{ matches: data.matches }} session={session} onToast={showToast} onRefresh={fetchData} /></div>
          <div className={`pg${page === 'rank' ? ' on' : ''}`}><RankingPage data={{ ranking: data.ranking, players: data.players }} /></div>
          <div className={`pg${page === 'calendar' ? ' on' : ''}`}><CalendarPage data={{ matches: data.matches }} /></div>
          <div className={`pg${page === 'squad' ? ' on' : ''}`}><SquadPage data={{ players: data.players, staff: data.staff }} session={session} onToast={showToast} onRefresh={fetchData} /></div>
          <div className={`pg${page === 'kits' ? ' on' : ''}`}><KitsPage /></div>
          <div className={`pg${page === 'photos' ? ' on' : ''}`}><PhotosPage session={session} onToast={showToast} /></div>
          <div className={`pg${page === 'sponsors' ? ' on' : ''}`}><SponsorsPage data={{ sponsors: data.sponsors }} onNav={go} /></div>
          <div className={`pg${page === 'club' ? ' on' : ''}`}><ClubPage /></div>
          <div className={`pg${page === 'account' ? ' on' : ''}`}><AccountPage session={session} onToast={showToast} /></div>
        </main>
      )}

      <Footer onNav={go} session={session} />
      <Toast msg={toast.msg} visible={toast.visible} />
    </>
  );
}

// ─── Pages statiques (Tenues, Photos, Sponsors, Club) ────────────────────────
function KitsPage() {
  const kits = [
    { label: '🏠 Domicile · Joueur',  name: 'Maillot Marine',    sp: 'BSK Immobilier · Raphael Lobjois', img: '/kit-dom-j.jpg', bg: 'linear-gradient(160deg,#0a1428,#1a2a5e)', c1: '#1a2a5e', c2: '#2a3f80' },
    { label: '🏠 Domicile · Gardien', name: 'Maillot Bleu Ciel', sp: 'BSK Immobilier · Raphael Lobjois', img: '/kit-dom-g.jpg', bg: 'linear-gradient(160deg,#1a4070,#3a80c0)', c1: '#6ab4e8', c2: '#1a2a5e' },
    { label: '✈️ Extérieur · Joueur',  name: 'Maillot Jaune',     sp: 'BC Résidences',                   img: '/kit-ext-j.jpg', bg: 'linear-gradient(160deg,#2a2500,#6a5c00)', c1: '#f5d020', c2: '#4a90d9' },
    { label: '✈️ Extérieur · Gardien', name: 'Maillot Bleu/Or',   sp: 'BC Résidences',                   img: '/kit-ext-g.jpg', bg: 'linear-gradient(160deg,#0a1f5e,#1a3a8a)', c1: '#2563eb', c2: '#f5c518' },
  ];
  return (
    <div className="wrap">
      <div className="sec-head"><div className="sec-t">Tenues Officielles</div><div className="sec-s">Saison 2026/2027 · Puma · Inside Sport</div><div className="gold-line" /></div>
      <div className="kits-grid">
        {kits.map((k, i) => (
          <div key={i} className="kit-card">
            <div className="kit-img" style={{ background: k.bg }}>
              <img src={k.img} alt={k.name} style={{ maxHeight: 180, width: '100%', objectFit: 'contain' }} />
            </div>
            <div className="kit-info">
              <div className="kit-lbl">{k.label}</div>
              <div className="kit-nm">{k.name}</div>
              <div className="kit-sp">{k.sp}</div>
              <div className="swatches"><span className="sw" style={{ background: k.c1 }} /><span className="sw" style={{ background: k.c2 }} /></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PhotosPage({ session, onToast }) {
  const [cat, setCat] = useState('all');
  const photos = [
    { title: 'J.3 vs CS Bezannes · 3-0', cat: 'match', emoji: '⚽', bg: 'linear-gradient(135deg,#142050,#0e1a3d)' },
    { title: 'Victoire à domicile', cat: 'match', emoji: '🏆', bg: 'linear-gradient(135deg,#0e1a3d,#1a3a7a)' },
    { title: 'Arrêt décisif de Renard', cat: 'match', emoji: '🧤', bg: 'linear-gradient(135deg,#162050,#0e1a3d)' },
    { title: 'Entraînement · Mardi', cat: 'training', emoji: '🏃', bg: 'linear-gradient(135deg,#1a2a5e,#0e1a3d)' },
    { title: 'Séance frappes · Jeudi', cat: 'training', emoji: '🎯', bg: 'linear-gradient(135deg,#2a3f80,#142050)' },
    { title: 'Présentation maillots 2026/27', cat: 'club', emoji: '👕', bg: 'linear-gradient(135deg,#0e1a3d,#2a3f80)' },
    { title: 'Photo officielle effectif', cat: 'club', emoji: '📸', bg: 'linear-gradient(135deg,#142050,#1a2a5e)' },
    { title: 'Soirée supporters', cat: 'event', emoji: '🏟️', bg: 'linear-gradient(135deg,#0e1a3d,#162050)' },
  ];
  const visible = cat === 'all' ? photos : photos.filter(p => p.cat === cat);
  return (
    <div className="wrap">
      <div className="sec-head"><div className="sec-t">Galerie Photos</div><div className="sec-s">Saison 2026/2027</div><div className="gold-line" /></div>
      <div className="filter-row">
        {[['all','Tous'],['match','Matchs'],['training','Entraînements'],['club','Club'],['event','Événements']].map(([v,l]) => (
          <button key={v} className={`fb${cat === v ? ' on' : ''}`} onClick={() => setCat(v)}>{l}</button>
        ))}
      </div>
      <div className="photos-grid">
        {visible.map((p, i) => (
          <div key={i} className="photo-card" style={{ background: p.bg }}>
            <div className="ph-icon">{p.emoji}</div>
            <div className="ph-cap">{p.title}</div>
          </div>
        ))}
      </div>
      <div className="upload-zone" onClick={() => session ? onToast('📤 Fonctionnalité bientôt disponible') : onToast('⚠️ Connectez-vous pour ajouter des photos')}>
        <div style={{ fontSize: '2.5rem', opacity: .3 }}>📷</div>
        <p>{session ? 'Ajouter une photo' : 'Connectez-vous pour ajouter des photos'}</p>
      </div>
    </div>
  );
}

function SponsorsPage({ data, onNav }) {
  const { sponsors = [] } = data;
  const byTier = t => sponsors.filter(s => s.tier === t);
  const tiers = [
    { key: 'or',       label: '🥇 Partenaires Or',       css: 'tier-or' },
    { key: 'argent',   label: '🥈 Partenaires Argent',   css: 'tier-argent' },
    { key: 'bronze',   label: '🥉 Partenaires Bronze',   css: 'tier-bronze' },
    { key: 'materiel', label: '🎁 Partenaires Matériel', css: 'tier-materiel' },
  ];
  return (
    <div className="wrap">
      <div className="sec-head"><div className="sec-t">Nos Partenaires</div><div className="sec-s">Saison 2026/2027 · Merci pour votre soutien</div><div className="gold-line" /></div>
      {tiers.map(t => byTier(t.key).length > 0 && (
        <div key={t.key} className="sponsor-tier">
          <div className={`tier-label ${t.css}`}>{t.label}</div>
          <div className="sponsors-row">
            {byTier(t.key).map(s => (
              <div key={s.id} className="sponsor-card">
                <div className="sp-logo">{s.logo_emoji}</div>
                <div className="sp-name">{s.name}</div>
                {s.description && <div className="sp-type">{s.description}</div>}
                {s.contact && <div className="sp-amount" style={{ fontSize: 11, color: 'var(--gray)' }}>{s.contact}</div>}
              </div>
            ))}
          </div>
        </div>
      ))}
      {sponsors.length === 0 && <p style={{ color: 'var(--gray)', fontSize: 14 }}>Données partenaires en cours de chargement...</p>}
      <div className="sp-become">
        <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 11, letterSpacing: 3, textTransform: 'uppercase', color: 'var(--g)', marginBottom: '.5rem' }}>Rejoignez l'aventure</div>
        <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: '2rem', letterSpacing: 3, marginBottom: '.5rem' }}>Devenez Partenaire</div>
        <div style={{ fontSize: 14, color: 'var(--w6)', maxWidth: 480, margin: '0 auto 1.5rem', lineHeight: 1.7 }}>Associez votre marque à l'Olympique Rémois. Loi Aillagon : 60% de réduction fiscale.</div>
        <button className="btn-p" onClick={() => onNav('account')}>Nous contacter →</button>
      </div>
    </div>
  );
}

function ClubPage() {
  const [tab, setTab] = useState('histoire');
  return (
    <div className="wrap">
      <div className="sec-head"><div className="sec-t">Le Club</div><div className="sec-s">Olympique Rémois · Histoire & Identité</div><div className="gold-line" /></div>
      <div className="page-tabs">
        {[['histoire','Histoire'],['valeurs','Valeurs'],['infra','Infrastructures'],['contact','Contact']].map(([v,l]) => (
          <button key={v} className={`ptab${tab === v ? ' on' : ''}`} onClick={() => setTab(v)}>{l}</button>
        ))}
      </div>
      {tab === 'histoire' && (
        <div>
          <div className="about-grid">
            <div className="about-block"><div className="ab-icon">🏟️</div><div className="ab-title">Notre Histoire</div><div className="ab-text">Fondé en 2022, l'Olympique Rémois est né de la passion de quelques amateurs du football rémois. En quatre ans, le club a gravi les échelons pour atteindre la Division 4.</div></div>
            <div className="about-block"><div className="ab-icon">🎯</div><div className="ab-title">Notre Mission</div><div className="ab-text">Promouvoir le football amateur sur l'agglomération rémoise, former les joueurs locaux et créer un environnement compétitif et sain. Objectif à terme : Division 3.</div></div>
          </div>
          <div className="timeline" style={{ marginTop: '2rem' }}>
            {[['2022','Fondation. Inscription en Division 6 avec 14 joueurs fondateurs.'],['2023','Montée en Division 5 (2ème place). Premiers partenariats.'],['2024','Accession à la Division 4. Nouvelle identité visuelle.'],['2025','4ème place en Division 4 (27 pts). Arrivée de BC Résidences.'],['2026','Saison 2026/27 lancée avec 5 recrues. Objectif : top 3.']].map(([y,t]) => (
              <div key={y} className="tl-item"><div className="tl-dot" /><div className="tl-year">{y}</div><div className="tl-text">{t}</div></div>
            ))}
          </div>
        </div>
      )}
      {tab === 'valeurs' && (
        <div className="values-grid">
          {[['⚽','Passion','L\'amour du football comme moteur.'],['🤝','Respect','Adversaires, arbitres, supporters.'],['🏆','Ambition','Viser toujours plus haut.'],['🧠','Formation','Développer les joueurs.'],['🌍','Diversité','Un effectif ouvert à tous.'],['🎉','Convivialité','Le foot comme lien social.']].map(([ico,n,t]) => (
            <div key={n} className="val-card"><div className="val-icon">{ico}</div><div className="val-name">{n}</div><div className="val-text">{t}</div></div>
          ))}
        </div>
      )}
      {tab === 'infra' && (
        <div className="infra-grid">
          {[['🏟️','Stade Léo Lagrange','Terrain synthétique · Éclairage · Vestiaires · 1 200 places'],['🌿','Terrain d\'entraînement','Gazon naturel · Mar. & Jeu. 19h30–21h30'],['🏋️','Salle de musculation','Partenariat Fitness Club Rémois'],['🩺','Suivi médical','Kiné intégrée · Pharmacie du Stade'],['🚌','Transport','Minibus Garage Lebrun Auto'],['📱','Digital','Site officiel · WhatsApp · Analyse vidéo']].map(([ico,n,d]) => (
            <div key={n} className="infra-card"><div className="infra-icon">{ico}</div><div className="infra-name">{n}</div><div className="infra-detail">{d}</div></div>
          ))}
        </div>
      )}
      {tab === 'contact' && (
        <div className="about-grid">
          <div className="about-block">
            <div className="ab-icon">📬</div><div className="ab-title">Nous Contacter</div>
            <div className="ab-text" style={{ lineHeight: 2.2 }}>📧 contact@olympique-remois.fr<br/>📍 Stade Léo Lagrange, 51100 Reims<br/>📅 Entraînements : Mar. & Jeu. 19h30</div>
          </div>
          <div className="about-block">
            <div className="ab-icon">📋</div><div className="ab-title">Rejoindre le club</div>
            <div className="ab-text">Venez nous voir à l'entraînement ou créez un compte sur ce site. Licence FFF ~50€/an, assurance incluse.</div>
          </div>
        </div>
      )}
    </div>
  );
}

function Footer({ onNav, session }) {
  return (
    <footer>
      <div className="footer-in">
        <div className="footer-top">
          <div className="ft-brand">
            <div className="ft-logo"><img src="/logo.png" alt="OR" style={{ width: 36, height: 36, borderRadius: '50%', border: '1.5px solid var(--g)', objectFit: 'cover' }} /><span>Olympique Rémois</span></div>
            <div className="ft-desc">Club de football amateur, Reims. Division 4 Marne. Fondé en 2022.</div>
          </div>
          <div className="ft-col"><h4>Navigation</h4>{['home','news','results','rank','calendar'].map(p => <a key={p} onClick={() => onNav(p)}>{['Accueil','Actualités','Résultats','Classement','Calendrier'][['home','news','results','rank','calendar'].indexOf(p)]}</a>)}</div>
          <div className="ft-col"><h4>Le Club</h4>{['squad','kits','photos','sponsors','club'].map(p => <a key={p} onClick={() => onNav(p)}>{['Effectif','Tenues','Photos','Partenaires','À propos'][['squad','kits','photos','sponsors','club'].indexOf(p)]}</a>)}</div>
          <div className="ft-col"><h4>Contact</h4><p>📧 contact@olympique-remois.fr</p><p>📍 Stade Léo Lagrange</p><p>51100 Reims</p><p style={{ marginTop: '.5rem' }}>Entraînements :</p><p>Mar. & Jeu. 19h30</p></div>
        </div>
        <div className="footer-bottom">
          <p>© 2026 <strong>Olympique Rémois</strong> · Tous droits réservés</p>
          <p>Division 4 · Saison 2026/2027 · <strong>Reims</strong></p>
        </div>
      </div>
    </footer>
  );
}
