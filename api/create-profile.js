import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST allowed' });
  }

  try {
    const { name, preferred_faction, preferred_victory } = req.body;

    // 1) Spieler in players-Tabelle suchen
    const { data: player, error: getError } = await supabase
      .from('players')
      .select('id')
      .eq('name', name)
      .single();

    if (getError || !player) {
      return res.status(400).json({ error: 'Spieler nicht gefunden' });
    }

    // 2) Profil in profiles-Tabelle anlegen
    const { error: insertError } = await supabase
      .from('profiles')
      .insert({
        player_id: player.id,
        preferred_faction,
        preferred_victory,
        games_played: 0
      });

    if (insertError) {
      throw insertError;
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('create-profile Error:', err);
    return res.status(500).json({ error: err.message || 'Server error' });
  }
}
