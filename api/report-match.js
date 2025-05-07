import { createClient } from '@supabase/supabase-js';
import { rate } from 'ts-trueskill';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  try {
    const { players: playersInput } = req.body;
    if (!Array.isArray(playersInput) || playersInput.length !== 4) {
      return res.status(400).json({ error: 'Expected players array of length 4' });
    }

    const profiles = [];
    for (const p of playersInput) {
      const { data: existing, error: fetchErr } = await supabase
        .from('players')
        .select('id, mu, sigma')
        .eq('name', p.name)
        .maybeSingle();
      if (fetchErr) throw fetchErr;

      let id, mu, sigma;
      if (existing) {
        ({ id, mu, sigma } = existing);
      } else {
        const { data: newP, error: insertErr } = await supabase
          .from('players')
          .insert({ name: p.name, mu: 25, sigma: 8.333, faction: p.faction })
          .select('id, mu, sigma')
          .single();
        if (insertErr) throw insertErr;
        ({ id, mu, sigma } = newP);
      }

      profiles.push({ id, mu, sigma, place: p.place });

      const { error: matchErr } = await supabase
        .from('matches')
        .insert({
          player_id: id,
          faction: p.faction,
          place: p.place,
          victory_condition: p.victory_condition || null
        });
      if (matchErr) throw matchErr;
    }

    const teams = profiles.map(x => [{ mu: x.mu, sigma: x.sigma }]);
    const ranks = profiles.map(x => x.place);
    const newRatings = rate(teams, ranks);

    for (let i = 0; i < profiles.length; i++) {
      const { id, place } = profiles[i];
      const { mu: newMu, sigma: newSigma } = newRatings[i][0];

      await supabase
        .from('players')
        .update({ mu: newMu, sigma: newSigma })
        .eq('id', id);

      await supabase.rpc('increment_games_played', { pid: id });
      if (place === 1) {
        await supabase.rpc('increment_wins', { pid: id });
      }
    }

    res.status(200).json({ success: true });
  } catch (err) {
    console.error('report-match error:', err);
    res.status(500).json({ error: err.message });
  }
}
