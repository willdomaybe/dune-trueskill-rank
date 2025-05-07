import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST allowed' });
  }

  const { user_id, name, preferred_faction, preferred_victory } = req.body;
  if (!user_id || !name || !preferred_faction || !preferred_victory) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const { data: player, error: pErr } = await supabase
      .from('players')
      .insert({ name, faction: preferred_faction })
      .select('id')
      .single();
    if (pErr) throw pErr;

    const { error: profErr } = await supabase
      .from('profiles')
      .insert({
        player_id: player.id,
        auth_id: user_id,
        preferred_faction,
        preferred_victory,
        games_played: 0,
        wins: 0,
        win_rate: 0
      });
    if (profErr) throw profErr;

    res.status(200).json({ success: true });
  } catch (err) {
    console.error('create-profile error:', err);
    res.status(500).json({ error: err.message });
  }
}
