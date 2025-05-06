export default function handler(req, res) {
    // Dieser Handler gibt immer dasselbe zurück
    res.status(200).json([{ name: "TestSpieler", score: "123.45" }]);
  }
  