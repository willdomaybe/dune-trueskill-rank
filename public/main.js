// main.js
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// Supabase-Client
const SUPABASE_URL = 'https://<dein-supabase-id>.supabase.co';
const SUPABASE_KEY = '<dein-anon-public-key>';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Elements
const authForm      = document.getElementById('authForm');
const authMsg       = document.getElementById('authMsg');
const profileForm   = document.getElementById('profileForm');
const profileStatus = document.getElementById('profileStatus');
const logoutBtn     = document.getElementById('logoutBtn');

// Login / Signup
authForm.addEventListener('submit', async e => {
  e.preventDefault();
  const { email, password } = Object.fromEntries(new FormData(authForm));
  const { error: signErr } = await supabase.auth.signUp({ email, password });
  if (signErr) {
    authMsg.innerText = signErr.message;
    return;
  }
  // Cookie setzen
  await fetch('/api/profile-cookie', { method: 'POST' });
  initAfterAuth();
});

// Login mit Passwort
authForm.addEventListener('submit', async e => {
  e.preventDefault();
  const { email, password } = Object.fromEntries(new FormData(authForm));
  const { error: loginErr } = await supabase.auth.signInWithPassword({ email, password });
  if (loginErr) {
    authMsg.innerText = loginErr.message;
    return;
  }
  // Cookie setzen
  await fetch('/api/profile-cookie', { method: 'POST' });
  initAfterAuth();
});

// Logout
logoutBtn.addEventListener('click', async () => {
  await supabase.auth.signOut();
  window.location.reload();
});

// Zeige Auth-Form / verstecke App
function showAuth() {
  ['authSection','profileSection','matchSection','leaderboardSection','sidebar']
    .forEach(id => document.getElementById(id).style.display =
      id === 'authSection' ? 'block' : 'none');
}

// Nach Auth: Profil erstellen & App initialisieren
async function initAfterAuth() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return showAuth();

  // Cookie schon gesetzt, proceed:
  initApp(session.user);
}

// App initialisieren
async function initApp(user) {
  // UI
  ['authSection','profileSection','matchSection','leaderboardSection','sidebar']
    .forEach(id => document.getElementById(id).style.display = 'block');

  // Profil-Daten anzeigen
  const { data: profile, error: profErr } = await supabase
    .from('profiles')
    .select('player_id, preferred_faction, preferred_victory, games_played, wins, win_rate')
    .eq('auth_id', user.id)
    .single();
  if (profErr) return console.error(profErr);
  renderSidebar(profile);

  // Match-Form
  initMatchForm(profile.player_id);

  // Leaderboard & History
  loadLeaderboard();
  loadHistory(profile.player_id);
}

// Profil erstellen (nur wenn separat nötig)
profileForm.addEventListener('submit', async e => {
  e.preventDefault();
  const { name, faction, victory } = Object.fromEntries(new FormData(profileForm));
  const res = await fetch('/api/create-profile', {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify({ name, preferred_faction: faction, preferred_victory: victory })
  });
  const json = await res.json();
  profileStatus.innerText = json.success ? 'Profil erstellt!' : `Fehler: ${json.error}`;
});

// Match-Form initialisieren
function initMatchForm(playerId) {
  const matchForm = document.getElementById('matchForm');
  matchForm.addEventListener('submit', async e => {
    e.preventDefault();
    const entries = Array.from(document.querySelectorAll('.player-entry'));
    const players = entries.map(div => ({
      name: div.querySelector('input[name="name"]').value,
      faction: div.querySelector('select[name="faction"]').value,
      place: parseInt(div.querySelector('input[name="place"]').value,10),
      victory_condition: div.querySelector('select[name="victory_condition"]')
        ?.value || null
    }));
    const r = await fetch('/api/report-match',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ players })
    });
    if (!r.ok) return console.error(await r.text());
    loadLeaderboard();
    loadHistory(playerId);
  });
}

// Leaderboard laden
async function loadLeaderboard() {
  const res = await fetch('/api/leaderboard');
  const data = await res.json();
  document.getElementById('leaderboard').innerHTML = data
    .map(u=>`<p class="faction-${u.faction.toLowerCase()}">${u.name}: ${u.score}</p>`)
    .join('');
}

// Match-History laden
async function loadHistory(playerId) {
  const { data, error } = await supabase
    .from('matches')
    .select('played_at,faction,place,victory_condition')
    .eq('player_id', playerId)
    .order('played_at',{ ascending:false });
  if (error) return console.error(error);
  document.getElementById('matchHistory').innerHTML = data
    .map(m=>`<li>${new Date(m.played_at).toLocaleString()}: ${m.faction}, Platz ${m.place}`+
      (m.place===1?` (Sieg: ${m.victory_condition})`:'')+
    `</li>`).join('');
}

// Sidebar rendern
function renderSidebar(p) {
  document.getElementById('profileInfo').innerHTML = `
    <p>Fraktion: ${p.preferred_faction}</p>
    <p>Siegesbedingung: ${p.preferred_victory}</p>
    <p>Spiele: ${p.games_played}</p>
    <p>Wins: ${p.wins}</p>
    <p>Winrate: ${(p.win_rate*100).toFixed(1)}%</p>
  `;
}

// Startup: prüfe Session
supabase.auth.getSession().then(({ data }) => {
  if (data.session) initApp(data.session.user);
  else showAuth();
});
