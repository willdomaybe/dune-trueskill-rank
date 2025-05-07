import { createClient } from '@supabase/supabase-js';
import { rate } from 'ts-trueskill';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST allowed' });
  }

  try {
    const { players: playersInput } = req.body;
    if (!Array.isArray(playersInput) || playersInput.length !== 4) {
      return res.status(400).json({ error: 'Expected players array of length 4' });
    }

    const profiles = [];

    // 1) Spieler anlegen oder laden, Match in DB speichern
    for (const p of playersInput) {
      const { data: existing, error: fetchErr } = await supabase
        .from('players')
        .select('id, mu, sigma, faction')
        .eq('name', p.name)
        .maybeSingle();

      if (fetchErr) {
        console.error('Fetch player error:', fetchErr);
        return res.status(500).json({ error: fetchErr.message });
      }

      let id, mu, sigma, faction;
      if (existing) {
        ({ id, mu, sigma, faction } = existing);
      } else {
        // neuen Spieler mit Default-Werten anlegen
        const { data: newP, error: insertErr } = await supabase
          .from('players')
          .insert({
            name: p.name,
            mu: 25,
            sigma: 8.333,
            faction: p.faction
          })
          .select('id, mu, sigma, faction')
          .single();

        if (insertErr) {
          console.error('Insert player error:', insertErr);
          return res.status(500).json({ error: insertErr.message });
        }
        ({ id, mu, sigma, faction } = newP);
      }

      profiles.push({ id, mu, sigma, place: p.place, faction });

      // Match speichern
      const { error: matchErr } = await supabase
        .from('matches')
        .insert({
          player_id: id,
          faction: p.faction,
          place: p.place
        });

      if (matchErr) {
        console.error('Insert match error:', matchErr);
        return res.status(500).json({ error: matchErr.message });
      }
    }

    // 2) TrueSkill-Rating berechnen
    const teams = profiles.map(x => [{ mu: x.mu, sigma: x.sigma }]);
    const ranks = profiles.map(x => x.place);
    let newRatings;
    try {
      newRatings = rate(teams, ranks);
    } catch (tsErr) {
      console.error('TrueSkill error:', tsErr);
      return res.status(500).json({ error: 'TrueSkill calculation failed' });
    }

    // 3) Neue Werte speichern
    for (let i = 0; i < profiles.length; i++) {
      const { id } = profiles[i];
      const { mu: newMu, sigma: newSigma } = newRatings[i][0];
      const { error: updateErr } = await supabase
        .from('players')
        .update({ mu: newMu, sigma: newSigma })
        .eq('id', id);

      if (updateErr) {
        console.error('Update player error:', updateErr);
        return res.status(500).json({ error: updateErr.message });
      }
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Unhandled handler error:', err);
    return res.status(500).json({ error: err.message || 'Unknown error' });
  }
}
