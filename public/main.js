// main.js
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// Supabase-Client
const SUPABASE_URL = 'https://dckpzxopyjlrathzowas.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRja3B6eG9weWpscmF0aHpvd2FzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY1MTk0OTgsImV4cCI6MjA2MjA5NTQ5OH0.REEzUwoZccKXOvxrxYMv8Wz_xkS2FavDouvE4DvJ-O8';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// DOM-Elemente
const authForm      = document.getElementById('authForm');
const authMsg       = document.getElementById('authMsg');
const profileForm   = document.getElementById('profileForm');
const profileStatus = document.getElementById('profileStatus');
const logoutBtn     = document.getElementById('logoutBtn');

// Anmeldung / Registrierung (Supabase Auth)
authForm.addEventListener('submit', async e => {
  e.preventDefault();
  const { email, password } = Object.fromEntries(new FormData(authForm));
  const { data: signData, error: signErr } = await supabase.auth.signInWithPassword({ email, password });
  if (signErr) {
    authMsg.innerText = signErr.message;
  } else {
    // Cookie setzen
    await fetch('/api/profile-cookie', { method: 'POST' });
    startApp(); 
  }
});

// Logout
logoutBtn.addEventListener('click', async () => {
  await supabase.auth.signOut();
  window.location.reload();
});

// Zeigt nur Auth-Form
function showAuth() {
  ['authSection','profileSection','matchSection','leaderboardSection','sidebar']
    .forEach(id => document.getElementById(id).style.display =
      id === 'authSection' ? 'block' : 'none');
}

// App-Start: Prüfe Session & initialisiere
async function startApp() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return showAuth();

  // UI-Sektionen anzeigen
  ['authSection','profileSection','matchSection','leaderboardSection','sidebar']
    .forEach(id => document.getElementById(id).style.display = 'block');

  // Profil laden (vielleicht existiert noch keins)
  const { data: profile, error: profErr } = await supabase
    .from('profiles')
    .select('player_id, preferred_faction, preferred_victory, games_played, wins, win_rate')
    .eq('auth_id', session.user.id)
    .maybeSingle();

  if (profErr) {
    console.error('Profile fetch error:', profErr);
    return;
  }

  if (!profile) {
    // Kein Profil vorhanden: zeige Profil-Erstellungsformular
    document.getElementById('profileSection').style.display = 'block';
    profileForm.addEventListener('submit', onCreateProfile);
  } else {
    // Profil existiert: rendere Sidebar und initialisiere Match-Form
    document.getElementById('profileSection').style.display = 'none';
    renderSidebar(profile);
    initMatchForm(profile.player_id);
    loadHistory(profile.player_id);
  }

  loadLeaderboard();
}

// Handler für Profil-Erstellung
async function onCreateProfile(e) {
  e.preventDefault();
  const { name, faction, victory } = Object.fromEntries(new FormData(profileForm));
  const res = await fetch('/api/create-profile', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name,
      preferred_faction: faction,
      preferred_victory: victory
    })
  });
  const json = await res.json();
  if (json.success) {
    profileStatus.innerText = 'Profil erstellt!';
    // Sobald Profil da ist, neustarten
    startApp();
  } else {
    profileStatus.innerText = `Fehler: ${json.error}`;
  }
}

// Initialisiere Match-Formular
function initMatchForm(playerId) {
  const matchForm = document.getElementById('matchForm');
  matchForm.addEventListener('submit', async e => {
    e.preventDefault();
    const entries = Array.from(document.querySelectorAll('.player-entry'));
    const players = entries.map(div => ({
      name: div.querySelector('input[name="name"]').value,
      faction: div.querySelector('select[name="faction"]').value,
      place: parseInt(div.querySelector('input[name="place"]').value, 10),
      victory_condition: div.querySelector('select[name="victory_condition"]')?.value || null
    }));

    const r = await fetch('/api/report-match', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ players })
    });
    if (!r.ok) {
      console.error('Fehler beim Eintragen:', await r.text());
      return;
    }
    loadLeaderboard();
    loadHistory(playerId);
  });
}

// Leaderboard laden
async function loadLeaderboard() {
  const res  = await fetch('/api/leaderboard');
  const data = await res.json();
  document.getElementById('leaderboard').innerHTML = data
    .map(u => `<p class="faction-${u.faction.toLowerCase()}">${u.name}: ${u.score}</p>`)
    .join('');
}

// Match-History laden
async function loadHistory(playerId) {
  const { data, error } = await supabase
    .from('matches')
    .select('played_at,faction,place,victory_condition')
    .eq('player_id', playerId)
    .order('played_at', { ascending: false });
  if (error) return console.error(error);
  document.getElementById('matchHistory').innerHTML = data
    .map(m => `<li>${new Date(m.played_at).toLocaleString()}: ${m.faction}, Platz ${m.place}` +
      (m.place === 1 ? ` (Sieg: ${m.victory_condition})` : '') +
    `</li>`)
    .join('');
}

// Sidebar rendern
function renderSidebar(p) {
  document.getElementById('profileInfo').innerHTML = `
    <p>Fraktion: ${p.preferred_faction}</p>
    <p>Siegesbedingung: ${p.preferred_victory}</p>
    <p>Spiele: ${p.games_played}</p>
    <p>Wins: ${p.wins}</p>
    <p>Winrate: ${(p.win_rate * 100).toFixed(1)}%</p>
  `;
}

// Starte App-Vorgang
startApp();
