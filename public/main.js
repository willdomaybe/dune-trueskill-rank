import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const supabase = createClient(
  'https://dckpzxopyjlrathzowas.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRja3B6eG9weWpscmF0aHpvd2FzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY1MTk0OTgsImV4cCI6MjA2MjA5NTQ5OH0.REEzUwoZccKXOvxrxYMv8Wz_xkS2FavDouvE4DvJ-O8'
);

// Elemente
const tabLogin    = document.getElementById('tab-login');
const tabSignup   = document.getElementById('tab-signup');
const loginForm   = document.getElementById('loginForm');
const signupForm  = document.getElementById('signupForm');
const authMsg     = document.getElementById('authMsg');
const logoutBtn   = document.getElementById('logoutBtn');
const sidebar     = document.getElementById('sidebar');
const profileSection  = document.getElementById('profileSection');
const profileForm     = document.getElementById('profileForm');
const profileStatus   = document.getElementById('profileStatus');
const matchSection    = document.getElementById('matchSection');
const matchForm       = document.getElementById('matchForm');
const leaderboardSection = document.getElementById('leaderboardSection');

// Tab-Umschaltung
tabLogin.addEventListener('click', () => {
  loginForm.classList.remove('hidden');
  signupForm.classList.add('hidden');
  authMsg.innerText = '';
});
tabSignup.addEventListener('click', () => {
  signupForm.classList.remove('hidden');
  loginForm.classList.add('hidden');
  authMsg.innerText = '';
});

// Login-Handler
loginForm.addEventListener('submit', async e => {
  e.preventDefault();
  const email = e.target.loginEmail.value;
  const password = e.target.loginPassword.value;
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    authMsg.innerText = error.message;
  } else {
    await fetch('/api/profile-cookie', { method: 'POST' });
    startApp();
  }
});

// Sign-Up-Handler
signupForm.addEventListener('submit', async e => {
  e.preventDefault();
  const email = e.target.signupEmail.value;
  const password = e.target.signupPassword.value;
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) {
    authMsg.innerText = `Registrierung fehlgeschlagen: ${error.message}`;
  } else {
    authMsg.innerText = 'Account erstellt! Bitte jetzt einloggen.';
    tabLogin.click();
  }
});

// Logout
logoutBtn.addEventListener('click', async () => {
  await supabase.auth.signOut();
  location.reload();
});

// App-Start: Session prüfen
async function startApp() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return;
  
  document.getElementById('authTabs').classList.add('hidden');
  loginForm.classList.add('hidden');
  signupForm.classList.add('hidden');
  authMsg.innerText = '';
  logoutBtn.style.display = 'block';
  sidebar.style.display = 'block';

  // Profil laden/erstellen
  const { data: profile, error: profErr } = await supabase
    .from('profiles')
    .select('player_id, preferred_faction, preferred_victory, games_played, wins, win_rate')
    .eq('auth_id', session.user.id)
    .maybeSingle();
  if (profErr) return console.error(profErr);

  if (!profile) {
    profileSection.classList.remove('hidden');
    profileForm.addEventListener('submit', e => onCreateProfile(e, session.user.id));
  } else {
    profileSection.classList.add('hidden');
    renderSidebar(profile);
    matchSection.classList.remove('hidden');
    initMatchForm(profile.player_id);
    leaderboardSection.classList.remove('hidden');
    loadLeaderboard();
    loadHistory(profile.player_id);
  }
}

// Profil-Erstellung
async function onCreateProfile(e, user_id) {
  e.preventDefault();
  const form = new FormData(profileForm);
  const body = {
    user_id,
    name:              form.get('name'),
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
  if (json.success) startApp();
}

// Match-Form initialisieren
function initMatchForm(playerId) {
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
    if (!r.ok) return console.error(await r.text());
    loadLeaderboard();
    loadHistory(playerId);
  });
}

// Leaderboard
async function loadLeaderboard() {
  const res  = await fetch('/api/leaderboard');
  const data = await res.json();
  document.getElementById('leaderboard').innerHTML = data
    .map(u => `<p class="faction-${u.faction.toLowerCase()}">${u.name}: ${u.score}</p>`)
    .join('');
}

// Match-History
async function loadHistory(playerId) {
  const { data, error } = await supabase
    .from('matches')
    .select('played_at,faction,place,victory_condition')
    .eq('player_id', playerId)
    .order('played_at',{ ascending: false });
  if (error) return console.error(error);
  document.getElementById('matchHistory').innerHTML = data
    .map(m => `<li>${new Date(m.played_at).toLocaleString()}: ${m.faction}, Platz ${m.place}` +
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
    <p>Winrate: ${(p.win_rate * 100).toFixed(1)}%</p>
  `;
}

// Initial
startApp();
