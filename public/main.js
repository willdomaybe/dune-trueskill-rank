document.getElementById('matchForm').addEventListener('submit', async e => {
  e.preventDefault();

  // Alle vier .player-entry‑Blöcke auslesen
  const entries = Array.from(document.querySelectorAll('.player-entry'));
  const players = entries.map(div => ({
    name: div.querySelector('input[name="name"]').value,
    faction: div.querySelector('select[name="faction"]').value,
    place: parseInt(div.querySelector('input[name="place"]').value, 10)
  }));

  // POST an /api/report-match
  const res = await fetch('/api/report-match', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ players })
  });
  if (!res.ok) {
    console.error('Fehler beim Eintragen:', await res.text());
    return;
  }

  // Leaderboard neu laden
  loadLeaderboard();
});

// Funktion zum Laden und Anzeigen des Leaderboards
async function loadLeaderboard() {
  const res = await fetch('/api/leaderboard');
  if (!res.ok) {
    console.error('Fehler beim Laden des Leaderboards');
    return;
  }
  const data = await res.json();
  const container = document.getElementById('leaderboard');
  container.innerHTML = data
    .map(u => {
      // u sollte: { name, score, faction } enthalten
      const cls = 'faction-' + u.faction.toLowerCase();
      return `<p class="${cls}">${u.name}: ${u.score}</p>`;
    })
    .join('');
}

// Beim ersten Laden das Leaderboard holen
loadLeaderboard();
