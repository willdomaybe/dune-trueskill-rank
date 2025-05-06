import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

export default async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('players')
      .select('name, mu, sigma')
      .order('mu', { ascending: false });

    if (error) {
      console.error('Error fetching data from Supabase:', error);
      return res.status(500).json({ error: 'Error fetching data' });
    }

    // Überprüfe, ob Daten vorhanden sind
    if (!data || data.length === 0) {
      return res.status(404).json({ message: 'No players found' });
    }

    // Berechne Score = mu - 3*sigma
    const ranked = data.map(u => ({
      name: u.name,
      score: (isNaN(u.mu) || isNaN(u.sigma)) ? 'Invalid' : (u.mu - 3 * u.sigma).toFixed(2)
    }));

    res.status(200).json(ranked);
  } catch (error) {
    console.error('Unexpected error:', error);
    res.status(500).json({ error: 'Unexpected error' });
  }
};
