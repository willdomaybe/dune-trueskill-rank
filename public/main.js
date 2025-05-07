// main.js
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

////////////////////////////////////////////////////////////////////////////////
// 1) Supabase-Client initialisieren – trage hier deine Werte ein:
const SUPABASE_URL = 'https://<dein‑supabase‑id>.supabase.co';
const SUPABASE_KEY = '<dein‑anon‑public‑key>';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

////////////////////////////////////////////////////////////////////////////////
// 2) AUTHENTIFIKATION

const authForm      = document.getElementById('authForm');
const authMsg       = document.getElementById('authMsg');
const logoutBtn     = document.getElementById('logoutBtn');
const profileForm   = document.getElementById('profileForm');
const profileStatus = document.getElementById('profileStatus');

// Login / Signup
authForm.addEventListener('submit', async e => {
  e.preventDefault();
  const form = new FormData(authForm);
  const email    = form.get('email');
  const password = form.get('password');
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  authMsg.innerText = error ? error.message : 'Erfolgreich eingeloggt';
});

// Logout
logoutBtn.addEventListener('click', async () => {
  await supabase.auth.signOut();
});

supabase.auth.onAuthStateChange((_, session) => {
  if (session) {
    initApp(session.user);
  } else {
    showAuth();
  }
});

// Zeige nur Auth-Form
function showAuth() {
  document.getElementById('authSection').style.display       = 'block';
  ['profileSection','matchSection','leaderboardSection','sidebar']
    .forEach(id => document.getElementById(id).style.display = 'none');
}

////////////////////////////////////////////////////////////////////////////////
// 3) NACH LOGIN: INIT

async function initApp(user) {
  document.getElementById('authSection').style.display        = 'none';
  document.getElementById('profileSection').style.display     = 'block';
  document.getElementById('matchSection').style.display       = 'block';
  document.getElementById('leaderboardSection').style.display = 'block';
  document.getElementById('sidebar').style.display            = 'block';

  // Profil und History laden
  const { data: profile, error: profErr } = await supabase
    .from('profiles')
    .select('player_id, preferred_faction, preferred_victory, games_played, wins, win_rate')
    .eq('auth_id', user.id)
    .single();
  if (profErr) console.error('Profile fetch error:', profErr);
  else {
    renderSidebar(profile);
    initMatchForm(profile.player_id);
  }

  loadLeaderboard();
  if (profile) loadHistory(profile.player_id);
}

////////////////////////////////////////////////////////////////////////////////
// 4) PROFILE-ERSTELLUNG (falls separat benötigt)

profileForm.addEventListener('submit', async e => {
  e.preventDefault();
  const form = new FormData(profileForm);
  const body = {
    name: form.get('name'),
    email: form.get('email'),
    password: form.get('password'),
    preferred_faction: form.get('faction'),
    preferred_victory: form.get('victory')
  };
  const res  = await fetch('/api/create-profile', {
    method: 'POST',
    headers: { 'Content-Type':'application/json' },
    body: JSON.stringify(body)
  });
  const json = await res.json();
  profileStatus.innerText = json.success ? 'Profil erstellt!' : `Fehler: ${json.error}`;
});

////////////////////////////////////////////////////////////////////////////////
// 5) MATCH-FORMULAR INITIALISIEREN

function initMatchForm(playerId) {
  const matchForm = document.getElementById('matchForm');
  matchForm.addEventListener('submit', async e => {
    e.preventDefault();
    const entries = Array.from(document.querySelectorAll('.player-entry'));
    const players = entries.map(div => ({
      name: div.querySelector('input[name="name"]').value,
      faction: div.querySelector('select[name="faction"]').value,
      place: parseInt(div.querySelector('input[name="place"]').value, 10),
      // nur bei Platz 1: Siegesbedingung auslesen
      victory_condition: div.querySelector('select[name="victory_condition"]')
        ?.value || null
    }));

    const res = await fetch('/api/report-match', {
      method: 'POST',
      headers: { 'Content-Type':'application/json' },
      body: JSON.stringify({ players })
    });
    if (!res.ok) {
      console.error('Fehler beim Eintragen:', await res.text());
      return;
    }
    loadLeaderboard();
    loadHistory(playerId);
  });
}

////////////////////////////////////////////////////////////////////////////////
// 6) LEADERBOARD LADEN

async function loadLeaderboard() {
  const res  = await fetch('/api/leaderboard');
  const data = await res.json();
  document.getElementById('leaderboard').innerHTML = data
    .map(u => {
      const cls = 'faction-' + u.faction.toLowerCase();
      return `<p class="${cls}">${u.name}: ${u.score}</p>`;
    })
    .join('');
}

////////////////////////////////////////////////////////////////////////////////
// 7) MATCH-HISTORY LADEN

async function loadHistory(playerId) {
  const { data: history, error } = await supabase
    .from('matches')
    .select('played_at,faction,place,victory_condition')
    .eq('player_id', playerId)
    .order('played_at', { ascending: false });
  if (error) return console.error('History fetch error:', error);
  document.getElementById('matchHistory').innerHTML = history
    .map(m => `<li>${new Date(m.played_at).toLocaleString()}: ${m.faction}, Platz ${m.place}` +
      (m.place===1?` (Sieg: ${m.victory_condition})`:'')+
    `</li>`)
    .join('');
}

////////////////////////////////////////////////////////////////////////////////
// Hilfsfunktion: Sidebar rendern

function renderSidebar(profile) {
  document.getElementById('profileInfo').innerHTML = `
    <p>Fraktion: ${profile.preferred_faction}</p>
    <p>Siegesbedingung: ${profile.preferred_victory}</p>
    <p>Spiele: ${profile.games_played}</p>
    <p>Wins: ${profile.wins}</p>
    <p>Winrate: ${(profile.win_rate*100).toFixed(1)} %</p>
  `;
}

////////////////////////////////////////////////////////////////////////////////
// Starte Auth-Check sofort
supabase.auth.getSession().then(({ data }) => {
  if (data.session) initApp(data.session.user);
  else showAuth();
});
