// api/profile-cookie.js
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

export default async function handler(req, res) {
  // Hole aktuelle Session
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error || !session) {
    return res.status(401).json({ error: 'No active session' });
  }

  // Setze HttpOnly-Cookie mit Access-Token und Refresh-Token
  res.setHeader('Set-Cookie', [
    `sb-access-token=${session.access_token}; Path=/; HttpOnly; SameSite=Lax;`,
    `sb-refresh-token=${session.refresh_token}; Path=/; HttpOnly; SameSite=Lax;`
  ]);
  res.status(200).end();
}
