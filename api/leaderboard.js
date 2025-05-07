import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

export default async function handler(req, res) {
  try {
    // Name, mu, sigma und faction auslesen
    const { data, error } = await supabase
      .from('players')
      .select('name, mu, sigma, faction')
      .order('mu', { ascending: false });

    if (error) {
      console.error('Supabase Error:', error);
      return res.status(500).json({ error: error.message });
    }

    if (!data || data.length === 0) {
      return res.status(200).json([]);
    }

    // Score berechnen und faction mitgeben
    const ranked = data.map(u => ({
      name: u.name,
      faction: u.faction,
      score: (u.mu - 3 * u.sigma).toFixed(2)
    }));

    return res.status(200).json(ranked);
  } catch (err) {
    console.error('Handler Error:', err);
    return res.status(500).json({ error: 'Unexpected error' });
  }
}
