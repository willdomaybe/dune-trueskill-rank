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

  try {
    // Auth über Cookie
    const { data: { user }, error: userErr } = await supabase.auth.getUserFromCookie(req);
    if (userErr || !user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { name, preferred_faction, preferred_victory } = req.body;
    if (!name || !preferred_faction || !preferred_victory) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // 1) Spieler-Eintrag
    const { data: player, error: pErr } = await supabase
      .from('players')
      .insert({ name, faction: preferred_faction })
      .select('id')
      .single();
    if (pErr) throw pErr;

    // 2) Profil-Eintrag
    const { error: profErr } = await supabase
      .from('profiles')
      .insert({
        player_id: player.id,
        auth_id: user.id,
        preferred_faction,
        preferred_victory
      });
    if (profErr) throw profErr;

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('create-profile error:', err);
    return res.status(500).json({ error: err.message || 'Server error' });
  }
}
