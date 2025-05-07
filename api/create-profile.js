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
    const { name, email, password, preferred_faction, preferred_victory } = req.body;
    if (!name || !email || !password || !preferred_faction || !preferred_victory) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // 1) Registriere den User bei Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password
    });
    if (authError) {
      console.error('Auth Error:', authError);
      return res.status(400).json({ error: authError.message });
    }

    // 2) Erstelle den Spieler-Eintrag
    const { data: player, error: playerError } = await supabase
      .from('players')
      .insert({
        name,
        faction: preferred_faction
      })
      .select('id')
      .single();
    if (playerError) {
      console.error('Insert Player Error:', playerError);
      return res.status(500).json({ error: playerError.message });
    }

    // 3) Erstelle das Profile mit Verknüpfung auf auth.user.id
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        player_id: player.id,
        auth_id: authData.user.id,
        preferred_faction,
        preferred_victory,
        games_played: 0,
        wins: 0,
        win_rate: 0
      });
    if (profileError) {
      console.error('Insert Profile Error:', profileError);
      return res.status(500).json({ error: profileError.message });
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Unhandled create-profile Error:', err);
    return res.status(500).json({ error: err.message || 'Server error' });
  }
}
