import { createClient } from '@supabase/supabase-js';
import { rate } from 'ts-trueskill';

// Supabase initialisieren
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

export default async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end();

  // Body: array mit 4 Objekten: { name, faction, place }
  const playersInput = req.body.players;

  // 1) Sicherstellen, dass alle Spieler existieren
  const ids = [];
  for (const p of playersInput) {
    const { data: existing } = await supabase
      .from('players')
      .select('*')
      .eq('name', p.name)
      .single();
    let id, mu, sigma;
    if (existing) {
      // Wenn der Spieler existiert, holen wir die bestehenden mu- und sigma-Werte
      id = existing.id;
      mu = existing.mu || 25; // Setze Standardwert für mu, wenn nicht vorhanden
      sigma = existing.sigma || 8.333; // Setze Standardwert für sigma, wenn nicht vorhanden
    } else {
      // Wenn der Spieler nicht existiert, erstellen wir ihn mit Standardwerten
      const { data: newP } = await supabase
        .from('players')
        .insert({
          name: p.name,
          mu: 25, // Standardwert für mu
          sigma: 8.333 // Standardwert für sigma
        })
        .single();
      id = newP.id;
      mu = newP.mu;
      sigma = newP.sigma;
    }
    ids.push({ id, mu, sigma, place: p.place });
    // Match-Eintrag in DB
    await supabase.from('matches').insert({
      player_id: id,
      faction: p.faction,
      place: p.place
    });
  }

  // 2) TrueSkill berechnen
  const teams = ids.map(x => [{ mu: x.mu, sigma: x.sigma }]);
  const ranks = ids.map(x => x.place);
  const newRatings = rate(teams, ranks);

  // 3) Neue Werte speichern
  for (let i = 0; i < ids.length; i++) {
    const { id } = ids[i];
    const { mu, sigma } = newRatings[i][0];
    await supabase
      .from('players')
      .update({ mu, sigma })
      .eq('id', id);
  }

  res.status(200).json({ success: true });
};
