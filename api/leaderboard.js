import { createClient } from '@supabase/supabase-js';

// Supabase‑Client initialisieren
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  // 1) Zeige Env‑Vars und Testabfrage
  try {
    // Test‑Query auf Supabase – hier nur ein einfacher Ping
    const { data: version, error } = await supabase.rpc('version');
    res.status(200).json({
      env: {
        SUPABASE_URL: process.env.SUPABASE_URL || 'undefined',
        SUPABASE_KEY: process.env.SUPABASE_KEY ? 'OK' : 'undefined'
      },
      supabaseVersion: error ? error.message : version
    });
  } catch (err) {
    console.error('Handler-Error:', err);
    res.status(500).json({ error: err.message });
  }
}