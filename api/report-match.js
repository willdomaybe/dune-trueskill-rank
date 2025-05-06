export default async function handler(req, res) {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Only POST allowed' });
    }
    // Zeige einfach body, um zu testen
    return res.status(200).json({ received: req.body });
  }
  