import { createClient } from '@supabase/supabase-js';

// Supabase‑Client mit deinen Env‑Vars
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

export default async function handler(req, res) {
  try {
    // Query: hole alle Spieler und deren mu, sigma
    const { data, error } = await supabase
      .from('players')
      .select('name, mu, sigma')
      .order('mu', { ascending: false });

    if (error) {
      console.error('Supabase Error:', error);
      return res.status(500).json({ error: error.message });
    }

    // Berechne für jeden Spieler den Score = mu − 3×sigma
    const leaderboard = data.map(u => ({
      name: u.name,
      score: (u.mu - 3 * u.sigma).toFixed(2)
    }));

    // Sende das Leaderboard zurück
    return res.status(200).json(leaderboard);
  } catch (err) {
    console.error('Handler Error:', err);
    return res.status(500).json({ error: err.message });
  }
}
