// Vercel serverless function: /api/city?city=Lahore
// Needs env var GEMINI_API_KEY (from Google AI Studio)
module.exports = async (req, res) => {
  try {
    const city = (req.query.city || '').trim();
    if (!city) return res.status(400).json({ error: 'City required' });

    const g = await (await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1`
    )).json();
    const p = g.results && g.results[0];
    if (!p) return res.status(404).json({ error: 'City not found' });

    const [aq, wx] = await Promise.all([
      fetch(`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${p.latitude}&longitude=${p.longitude}&current=us_aqi,pm2_5,pm10`).then(r => r.json()),
      fetch(`https://api.open-meteo.com/v1/forecast?latitude=${p.latitude}&longitude=${p.longitude}&current=temperature_2m`).then(r => r.json())
    ]);
    const live = {
      aqi: aq.current && aq.current.us_aqi,
      pm25: aq.current && aq.current.pm2_5,
      pm10: aq.current && aq.current.pm10,
      temp: wx.current && wx.current.temperature_2m
    };

    const item = '{"score":0,"level":{"en":"","ur":""},"summary":{"en":"","ur":""},"causes":{"en":"","ur":""},"harm":{"en":"","ur":""},"forecast":[0,0,0,0,0],"tip":{"en":"","ur":""}}';
    const prompt =
`City: ${p.name}, ${p.country}. Live data: US AQI ${live.aqi}, PM2.5 ${live.pm25}, PM10 ${live.pm10}, temperature ${live.temp}C.
Return ONLY JSON in this shape: {"overall":{"score":0,"verdict":{"en":"","ur":""}},"items":{"air":${item},"water":${item},"thermal":${item},"land":${item},"noise":${item},"light":${item},"radioactive":${item}}}
Rules: score is 0 (clean) to 100 (very polluted). Air score = min(100, round(AQI/3)). "forecast" = predicted score for each of the next 5 years. "level" is one or two words (Low, Moderate, High...). Every text is 1-2 very simple sentences a layperson understands. "ur" fields must be in Urdu script. Be honest that water, land, noise, light and radiation are estimates.`;

    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${process.env.GEMINI_MODEL || 'gemini-3.8-flash'}:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: 'application/json', temperature: 0.4 }
        })
      }
    );
    const d = await r.json();
    const txt = d.candidates && d.candidates[0] && d.candidates[0].content.parts[0].text;
    if (!txt) throw new Error((d.error && d.error.message) || 'AI gave no answer');
    res.status(200).json({ city: p.name, country: p.country, live, ai: JSON.parse(txt) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
