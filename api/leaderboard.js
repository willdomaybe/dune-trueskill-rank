import { createClient } from '@supabase/supabase-js';

// Initialisiere Supabase-Client mit deinen Env-Variablen
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

export default async function handler(req, res) {
  try {
    // 1) Alle Spieler laden
    const { data, error } = await supabase
      .from('players')
      .select('name, mu, sigma')
      .order('mu', { ascending: false });

    // 2) Fehlerbehandlung
    if (error) {
      console.error('Supabase Error:', error);
      return res.status(500).json({ error: error.message });
    }

    // 3) Score berechnen: mu - 3*sigma
    const leaderboard = data.map(u => ({
      name: u.name,
      score: (u.mu - 3 * u.sigma).toFixed(2)
    }));

    // 4) Als JSON zurückgeben
    return res.status(200).json(leaderboard);
  } catch (err) {
    console.error('Handler Error:', err);
    return res.status(500).json({ error: err.message });
  }
}
