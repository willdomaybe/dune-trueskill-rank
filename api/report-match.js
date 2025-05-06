import { createClient } from '@supabase/supabase-js';

// Supabase‑Client mit Deinen Env‑Vars
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY   // achte darauf, dass das exakt so benannt ist
);

export default async function handler(req, res) {
  try {
    // 1) Gib sofort die wichtigen Infos zurück, damit wir sie im Browser sehen:
    return res.status(200).json({
      method: req.method,
      env: {
        SUPABASE_URL: process.env.SUPABASE_URL    || 'undefined',
        SUPABASE_KEY: process.env.SUPABASE_KEY    ? 'OK' : 'undefined'
      },
      body: req.body
    });
  } catch (err) {
    console.error('Unexpected error in report-match:', err);
    return res.status(500).json({ error: err.message });
  }
}
