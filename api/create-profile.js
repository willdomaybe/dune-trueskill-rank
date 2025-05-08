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

  // Erwartete Felder im Body
  const { user_id, name, preferred_faction, preferred_victory } = req.body;
  if (!user_id || !name || !preferred_faction || !preferred_victory) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    // 1) Spieler anlegen oder holen (Upsert über name)
    const { data: player, error: pErr } = await supabase
      .from('players')
      .upsert(
        { name, faction: preferred_faction },
        { onConflict: ['name'], returning: 'representation' }
      )
      .select('id')
      .single();
    if (pErr) throw pErr;

    // 2) Profil anlegen oder aktualisieren (Upsert über auth_id)
    const { error: profErr } = await supabase
      .from('profiles')
      .upsert(
        {
          player_id:       player.id,
          auth_id:         user_id,
          preferred_faction,
          preferred_victory
        },
        { onConflict: ['auth_id'] }
      );
    if (profErr) throw profErr;

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('create-profile error:', err);
    return res.status(500).json({ error: err.message || 'Server error' });
  }
}
