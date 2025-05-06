// Dynamisch 4 Eingabezeilen erzeugen
const playersDiv = document.getElementById('players');
for (let i = 1; i <= 4; i++) {
  const div = document.createElement('div');
  div.innerHTML = `
    <input placeholder="Name ${i}" id="name${i}">
    <input placeholder="Fraktion ${i}" id="faction${i}">
    <input type="number" min="1" max="4" placeholder="Platz ${i}" id="place${i}">
  `;
  playersDiv.appendChild(div);
}

document.getElementById('matchForm').addEventListener('submit', async e => {
  e.preventDefault();
  const players = [];
  for (let i = 1; i <= 4; i++) {
    players.push({
      name: document.getElementById(`name${i}`).value,
      faction: document.getElementById(`faction${i}`).value,
      place: Number(document.getElementById(`place${i}`).value)
    });
  }
  await fetch('/api/report-match', {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify({ players })
  });
  loadLeaderboard();
});

async function loadLeaderboard() {
  const res = await fetch('/api/leaderboard');
  const data = await res.json();
  document.getElementById('leaderboard').innerHTML =
    data.map(u => `<p>${u.name}: ${u.score}</p>`).join('');
}
loadLeaderboard();
