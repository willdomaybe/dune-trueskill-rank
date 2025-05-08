import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const supabase = createClient(
  'https://dckpzxopyjlrathzowas.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRja3B6eG9weWpscmF0aHpvd2FzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY1MTk0OTgsImV4cCI6MjA2MjA5NTQ5OH0.REEzUwoZccKXOvxrxYMv8Wz_xkS2FavDouvE4DvJ-O8' // Ersetze durch deinen Public Key
);

// === LOGIN / REGISTRIERUNG ===
const authForm = document.getElementById('authForm');
const logoutBtn = document.getElementById('logoutBtn');
const profileSection = document.getElementById('profileSection');
const profileData = document.getElementById('profileData');

authForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    // Wenn User nicht existiert, registrieren
    const { data: signupData, error: signupError } = await supabase.auth.signUp({ email, password });
    if (signupError) return alert('Fehler beim Registrieren: ' + signupError.message);
    alert('Account erstellt. Bitte erneut einloggen.');
    return;
  }

  loadProfile();
});

logoutBtn?.addEventListener('click', async () => {
  await supabase.auth.signOut();
  location.reload();
});

// === SPIELERFELDER (4x) ===
const playersDiv = document.getElementById("players");
for (let i = 0; i < 4; i++) {
  const playerGroup = document.createElement("div");
  playerGroup.innerHTML = `
    <input name="name-${i}" placeholder="Spielername" required />
    <select name="faction-${i}">
      <option value="Harkonnen">Harkonnen</option>
      <option value="Corrino">Corrino</option>
      <option value="Vernius">Vernius</option>
      <option value="Ecaz">Ecaz</option>
      <option value="Atreides">Atreides</option>
      <option value="Smuggler">Smuggler</option>
      <option value="Fremen">Fremen</option>
    </select>
    <input type="number" name="place-${i}" min="1" max="4" placeholder="Platz" required />
    <select name="victory-${i}" style="display: none;">
      <option value="">—</option>
      <option value="Vorherrschaft">Vorherrschaft</option>
      <option value="Hegemonie">Hegemonie</option>
      <option value="Politisch">Politisch</option>
      <option value="Wirtschaftlich">Wirtschaftlich</option>
      <option value="Attentat">Attentat</option>
    </select>
  `;
  playersDiv.appendChild(playerGroup);

  const placeInput = playerGroup.querySelector(`input[name="place-${i}"]`);
  const victorySelect = playerGroup.querySelector(`select[name="victory-${i}"]`);
  placeInput.addEventListener("input", () => {
    if (placeInput.value === "1") {
      victorySelect.style.display = "inline-block";
    } else {
      victorySelect.style.display = "none";
      victorySelect.value = "";
    }
  });
}

// === MATCH EINTRAGEN ===
document.getElementById('matchForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const session = (await supabase.auth.getSession()).data.session;
  if (!session) return alert('Bitte einloggen.');

  const formData = new FormData(e.target);
  const matchRows = [];

  for (let i = 0; i < 4; i++) {
    const name = formData.get(`name-${i}`);
    const faction = formData.get(`faction-${i}`);
    const place = Number(formData.get(`place-${i}`));
    const victory = formData.get(`victory-${i}`) || null;

    // Spieler-ID auslesen oder erstellen
    let { data: player, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('name', name)
      .single();

    if (!player) {
      const { data: newPlayer } = await supabase
        .from('profiles')
        .insert({ name })
        .select()
        .single();
      player = newPlayer;
    }

    matchRows.push({
      player_id: player.id,
      faction,
      place,
      victory_condition: place === 1 ? victory : null,
    });
  }

  const { error: insertError } = await supabase.from('matches').insert(matchRows);
  if (insertError) return alert('Fehler beim Eintragen: ' + insertError.message);

  alert('Match gespeichert!');
  e.target.reset();
  loadProfile();
});

// === PROFIL LADEN ===
async function loadProfile() {
  const session = (await supabase.auth.getSession()).data.session;
  if (!session) return;

  authForm.style.display = 'none';
  logoutBtn.style.display = 'inline-block';
  profileSection.style.display = 'block';

  const { data: userProfile } = await supabase
    .from('profiles')
    .select('*')
    .eq('auth_id', session.user.id)
    .single();

  if (!userProfile) {
    document.getElementById('profileData').innerHTML = 'Noch kein Profil angelegt.';
    return;
  }

  const { data: matches } = await supabase
    .from('matches')
    .select('faction, place, victory_condition, played_at')
    .eq('player_id', userProfile.id);

  const wins = matches.filter(m => m.place === 1).length;
  const total = matches.length;
  const winrate = total > 0 ? ((wins / total) * 100).toFixed(1) : '0.0';

  // Meistgespielte Fraktion
  const factionCount = {};
  const victoryCount = {};
  for (const match of matches) {
    factionCount[match.faction] = (factionCount[match.faction] || 0) + 1;
    if (match.victory_condition) {
      victoryCount[match.victory_condition] = (victoryCount[match.victory_condition] || 0) + 1;
    }
  }

  const mostFaction = Object.entries(factionCount).sort((a, b) => b[1] - a[1])[0]?.[0] || '–';
  const mostVictory = Object.entries(victoryCount).sort((a, b) => b[1] - a[1])[0]?.[0] || '–';

  profileData.innerHTML = `
    <p><strong>Name:</strong> ${userProfile.name}</p>
    <p><strong>Spiele insgesamt:</strong> ${total}</p>
    <p><strong>Siege:</strong> ${wins}</p>
    <p><strong>Winrate:</strong> ${winrate}%</p>
    <p><strong>Lieblingsfraktion:</strong> ${mostFaction}</p>
    <p><strong>Häufigste Siegesbedingung:</strong> ${mostVictory}</p>
  `;

  const historyDiv = document.getElementById('matchHistory');
  historyDiv.innerHTML = matches.map(m =>
    `<div>${new Date(m.played_at).toLocaleDateString()}: ${m.faction} - Platz ${m.place} ${m.victory_condition ? `(${m.victory_condition})` : ''}</div>`
  ).join('');
}

// Direkt prüfen, ob Session da ist
loadProfile();
