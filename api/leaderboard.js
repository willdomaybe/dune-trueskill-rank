import { createClient } from '@supabase/supabase-js';
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export default async (req, res) => {
  const { data } = await supabase
    .from('players')
    .select('name, mu, sigma')
    .order('mu', { ascending: false });
  // Berechne Score = mu - 3*sigma
  const ranked = data.map(u => ({
    name: u.name,
    score: (u.mu - 3 * u.sigma).toFixed(2)
  }));
  res.status(200).json(ranked);
};
