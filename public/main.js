// Profil erstellen
document.getElementById('profileForm').addEventListener('submit', async e => {
  e.preventDefault();
  const f = e.target;
  const body = {
    name: f.name.value,
    preferred_faction: f.faction.value,
    preferred_victory: f.victory.value
  };
  const res = await fetch('/api/create-profile', {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify(body)
  });
  const json = await res.json();
  document.getElementById('profileStatus').innerText = json.success
    ? 'Profil gespeichert!'
    : `Fehler: ${json.error}`;
});

// Match eintragen
document.getElementById('matchForm').addEventListener('submit', async e => {
  e.preventDefault();
  const entries = Array.from(document.querySelectorAll('.player-entry'));
  const players = entries.map(div => ({
    name: div.querySelector('input[name="name"]').value,
    faction: div.querySelector('select[name="faction"]').value,
    place: parseInt(div.querySelector('input[name="place"]').value, 10)
  }));
  const res = await fetch('/api/report-match', {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify({ players })
  });
  if (!res.ok) {
    console.error('Fehler beim Eintragen:', await res.text());
    return;
  }
  loadLeaderboard();
});

// Leaderboard laden
async function loadLeaderboard() {
  const res = await fetch('/api/leaderboard');
  if (!res.ok) {
    console.error('Fehler beim Laden des Leaderboards');
    return;
  }
  const data = await res.json();
  document.getElementById('leaderboard').innerHTML = data
    .map(u => {
      const cls = 'faction-' + u.faction.toLowerCase();
      return `<p class="${cls}">${u.name}: ${u.score}</p>`;
    })
    .join('');
}

// Initial
loadLeaderboard();
