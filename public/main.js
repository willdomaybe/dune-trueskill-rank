import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const SUPABASE_URL = 'https://<dein-supabase-id>.supabase.co';
const SUPABASE_KEY = '<dein-anon-public-key>';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Elemente
const authForm      = document.getElementById('authForm');
const authMsg       = document.getElementById('authMsg');
const profileForm   = document.getElementById('profileForm');
const profileStatus = document.getElementById('profileStatus');
const logoutBtn     = document.getElementById('logoutBtn');

// Login
authForm.addEventListener('submit', async e => {
  e.preventDefault();
  const { email, password } = Object.fromEntries(new FormData(authForm));
  const { error: err1 } = await supabase.auth.signInWithPassword({ email, password });
  if (err1) {
    authMsg.innerText = err1.message;
    return;
  }
  await fetch('/api/profile-cookie', { method: 'POST' });
  startApp();
});

// Logout
logoutBtn.addEventListener('click', async () => {
  await supabase.auth.signOut();
  window.location.reload();
});

// Anzeige Auth-Form
function showAuth() {
  ['authSection','profileSection','matchSection','leaderboardSection','sidebar']
    .forEach(id => document.getElementById(id).style.display =
      id==='authSection'?'block':'none');
}

// Start
async function startApp() {
  const { data:{session} } = await supabase.auth.getSession();
  if (!session) return showAuth();

  ['authSection','profileSection','matchSection','leaderboardSection','sidebar']
    .forEach(id => document.getElementById(id).style.display='block');

  const { data: profile, error: profErr } = await supabase
    .from('profiles')
    .select('player_id, preferred_faction, preferred_victory, games_played, wins, win_rate')
    .eq('auth_id', session.user.id)
    .maybeSingle();
  if (profErr) return console.error(profErr);

  if (!profile) {
    profileForm.addEventListener('submit', e=>onCreateProfile(e, session.user.id));
    document.getElementById('profileSection').style.display='block';
  } else {
    document.getElementById('profileSection').style.display='none';
    renderSidebar(profile);
    initMatchForm(profile.player_id);
    loadHistory(profile.player_id);
  }

  loadLeaderboard();
}

// Profil erstellen
async function onCreateProfile(e, user_id) {
  e.preventDefault();
  const form    = new FormData(profileForm);
  const body    = {
    user_id,
    name: form.get('name'),
    preferred_faction: form.get('faction'),
    preferred_victory: form.get('victory')
  };
  const res     = await fetch('/api/create-profile',{
    method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)
  });
  const json    = await res.json();
  profileStatus.innerText = json.success?'Profil erstellt!':`Fehler: ${json.error}`;
  if (json.success) startApp();
}

// Match-Form initialisieren
function initMatchForm(playerId) {
  document.getElementById('matchForm').addEventListener('submit', async e => {
    e.preventDefault();
    const players = Array.from(document.querySelectorAll('.player-entry')).map(div=>({
      name: div.querySelector('input[name="name"]').value,
      faction: div.querySelector('select[name="faction"]').value,
      place:  parseInt(div.querySelector('input[name="place"]').value,10),
      victory_condition: div.querySelector('select[name="victory_condition"]')?.value||null
    }));
    const r = await fetch('/api/report-match',{
      method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({players})
    });
    if (!r.ok) return console.error(await r.text());
    loadLeaderboard();
    loadHistory(playerId);
  });
}

// Leaderboard laden
async function loadLeaderboard() {
  const res  = await fetch('/api/leaderboard');
  const data = await res.json();
  document.getElementById('leaderboard').innerHTML = data
    .map(u=>`<p class="faction-${u.faction.toLowerCase()}">${u.name}: ${u.score}</p>`)
    .join('');
}

// History laden
async function loadHistory(playerId) {
  const { data, error } = await supabase
    .from('matches')
    .select('played_at,faction,place,victory_condition')
    .eq('player_id',playerId)
    .order('played_at',{ascending:false});
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

// App starten
startApp();
