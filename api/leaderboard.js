import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

export default async function handler(req, res) {
  try {
    const { data, error } = await supabase
      .from('players')
      .select('name, mu, sigma, faction')
      .order('mu', { ascending: false });
    if (error) throw error;

    const ranked = data.map(u => ({
      name: u.name,
      faction: u.faction,
      score: (u.mu - 3 * u.sigma).toFixed(2)
    }));

    res.status(200).json(ranked);
  } catch (err) {
    console.error('leaderboard error:', err);
    res.status(500).json({ error: err.message });
  }
}
