// api/create-profile.js
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST allowed' });
  }

  // Aus dem Body: user_id, name, preferred_faction, preferred_victory
  const { user_id, name, preferred_faction, preferred_victory } = req.body;
  if (!user_id || !name || !preferred_faction || !preferred_victory) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    // 1) Spieler anlegen (players-Tabelle)
    const { data: player, error: pErr } = await supabase
      .from('players')
      .upsert(
        { name, faction: preferred_faction },
        { onConflict: ['name'], ignoreDuplicates: false }
      )
      .select('id')
      .single();
    if (pErr) throw pErr;

    // 2) Profil anlegen (profiles-Tabelle)
    const { error: profErr } = await supabase
      .from('profiles')
      .upsert(
        {
          player_id:       player.id,
          auth_id:         user_id,
          preferred_faction,
          preferred_victory
        },
        { onConflict: ['auth_id'], ignoreDuplicates: false }
      );
    if (profErr) throw profErr;

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('create-profile error:', err);
    return res.status(500).json({ error: err.message });
  }
}
