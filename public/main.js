import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// --- AUTHENTIFIKATION ---

// Elements
const authForm      = document.getElementById('authForm');
const authMsg       = document.getElementById('authMsg');
const profileForm   = document.getElementById('profileForm');
const profileStatus = document.getElementById('profileStatus');
const logoutBtn     = document.getElementById('logoutBtn');

// Form submit: Login / Signup
authForm.addEventListener('submit', async e => {
  e.preventDefault();
  const { email, password } = Object.fromEntries(new FormData(authForm));
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) authMsg.innerText = error.message;
  else authMsg.innerText = 'Erfolgreich eingeloggt';
});

// Auth State Change
supabase.auth.onAuthStateChange((_, session) => {
  if (session) initApp(session.user);
  else showAuth();
});

// Logout
logoutBtn.addEventListener('click', async () => {
  await supabase.auth.signOut();
});

// Zeigt nur das Auth-Form
function showAuth() {
  document.getElementById('authSection').style.display      = 'block';
  document.getElementById('profileSection').style.display   = 'none';
  document.getElementById('matchSection').style.display     = 'none';
  document.getElementById('leaderboardSection').style.display = 'none';
  document.getElementById('sidebar').style.display          = 'none';
}

// --- NACH LOGIN: INITIALISIERUNG ---

async function initApp(user) {
  // UI-Sektionen einblenden
  document.getElementById('authSection').style.display      = 'none';
  document.getElementById('profileSection').style.display   = 'block';
  document.getElementById('matchSection').style.display     = 'block';
  document.getElementById('leaderboardSection').style.display = 'block';
  document.getElementById('sidebar').style.display          = 'block';

  // Profildaten laden
  const { data: profile, error: profErr } = await supabase
    .from('profiles')
    .select('player_id, preferred_faction, preferred_victory, games_played, wins, win_rate')
    .eq('auth_id', user.id)
    .single();
  if (profErr) {
    console.error('Profile fetch error:', profErr);
  } else {
    renderSidebar(profile);
    initMatchForm(profile.player_id);
  }

  loadLeaderboard();
  loadHistory(profile.player_id);
}

// --- PROFILE-ERSTELLUNG (falls separat) ---

profileForm.addEventListener('submit', async e => {
  e.preventDefault();
  const { name, email, password, faction, victory } = Object.fromEntries(new FormData(profileForm));
  const res = await fetch('/api/create-profile', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name,
      email,
      password,
      preferred_faction: faction,
      preferred_victory: victory
    })
  });
  const json = await res.json();
  profileStatus.innerText = json.success ? 'Profil erstellt!' : `Fehler: ${json.error}`;
});

// --- MATCH-FORMULAR INIT ---

function initMatchForm(playerId) {
  const matchForm = document.getElementById('matchForm');
  matchForm.addEventListener('submit', async e => {
    e.preventDefault();
    const entries = Array.from(document.querySelectorAll('.player-entry'));
    const players = entries.map(div => ({
      name: div.querySelector('input[name="name"]').value,
      faction: div.querySelector('select[name="faction"]').value,
      place: parseInt(div.querySelector('input[name="place"]').value, 10)
    }));

    // Optional: Victory-Select nur bei Platz 1
    const winner = players.find(p => p.place === 1);
    if (winner) {
      winner.victory_condition = div.querySelector('select[name="victory_condition"]').value;
    }

    const res = await fetch('/api/report-match', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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

// --- LEADERBOARD LADEN ---

async function loadLeaderboard() {
  const res  = await fetch('/api/leaderboard');
  const data = await res.json();
  const container = document.getElementById('leaderboard');
  container.innerHTML = data
    .map(u => {
      const cls = 'faction-' + u.faction.toLowerCase();
      return `<p class="${cls}">${u.name}: ${u.score}</p>`;
    })
    .join('');
}

// --- MATCH-HISTORY LADEN ---

async function loadHistory(playerId) {
  const { data: history, error } = await supabase
    .from('matches')
    .select('played_at,faction,place,victory_condition')
    .eq('player_id', playerId)
    .order('played_at', { ascending: false });
  if (error) return console.error('History fetch error:', error);
  const ul = document.getElementById('matchHistory');
  ul.innerHTML = history
    .map(m => `<li>${new Date(m.played_at).toLocaleString()}: ${m.faction}, Platz ${m.place}` +
      (m.place === 1 ? ` (Sieg: ${m.victory_condition})` : '') +
    `</li>`)
    .join('');
}

// Initial: versuche Auth-State
supabase.auth.getSession().then(({ data }) => {
  if (data.session) initApp(data.session.user);
  else showAuth();
});
