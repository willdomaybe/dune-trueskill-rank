export default function handler(req, res) {
    // Einfach mal eine feste JSON-Antwort zurückgeben
    res.status(200).json({ test: "Hello World", time: new Date().toISOString() });
  }
  