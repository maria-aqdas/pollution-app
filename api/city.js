// Vercel serverless function
//  /api/city?city=Lahore            -> overview (scores + 5 bullet points per type)
//  /api/city?city=Lahore&type=air   -> full details (causes, harm, 5-year outlook, steps)
// Needs env var GEMINI_API_KEY (from Google AI Studio)
const TYPES = ['air', 'water', 'thermal', 'land', 'noise', 'light', 'radioactive'];

async function ask(prompt) {
  const models = [process.env.GEMINI_MODEL, 'gemini-3.8-flash', 'gemini-flash-latest', 'gemini-flash-lite-latest'].filter(Boolean);
  const started = Date.now();
  let lastErr = '';
  for (const m of models) {
    for (let a = 0; a < 2; a++) {
      if (Date.now() - started > 45000) throw new Error('The AI is busy right now. Please try again in a minute. (' + lastErr + ')');
      const r = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${process.env.GEMINI_API_KEY}`,
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
      const t = d.candidates && d.candidates[0] && d.candidates[0].content && d.candidates[0].content.parts[0].text;
      if (t) { try { return JSON.parse(t); } catch (e) { lastErr = 'bad JSON'; continue; } }
      lastErr = (d.error && d.error.message) || 'AI gave no answer';
      const code = d.error && d.error.code;
      if (code && ![429, 500, 503, 504].includes(code)) break;
      await new Promise(s => setTimeout(s, 1200));
    }
  }
  throw new Error('The AI is busy right now. Please try again in a minute. (' + lastErr + ')');
}

module.exports = async (req, res) => {
  try {
    const city = (req.query.city || '').trim();
    const type = (req.query.type || '').trim();
    if (!city) return res.status(400).json({ error: 'City required' });

    const g = await (await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1`
    )).json();
    const p = g.results && g.results[0];
    if (!p) return res.status(404).json({ error: 'City not found' });

    const [aq, wx, hs] = await Promise.all([
      fetch(`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${p.latitude}&longitude=${p.longitude}&current=us_aqi,pm2_5,pm10`).then(r => r.json()),
      fetch(`https://api.open-meteo.com/v1/forecast?latitude=${p.latitude}&longitude=${p.longitude}&current=temperature_2m`).then(r => r.json()),
      fetch(`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${p.latitude}&longitude=${p.longitude}&hourly=us_aqi&past_days=7&forecast_days=1`).then(r => r.json()).catch(() => ({}))
    ]);
    // daily average AQI for the last 7 days + today
    const hr = hs.hourly || {}, days = {};
    (hr.time || []).forEach((tm, i) => { const v = hr.us_aqi[i]; if (v == null) return; (days[tm.slice(0, 10)] = days[tm.slice(0, 10)] || []).push(v); });
    const history = Object.keys(days).sort().map(d => ({ d, v: Math.round(days[d].reduce((a, b) => a + b, 0) / days[d].length) }));
    const live = {
      aqi: aq.current && aq.current.us_aqi,
      pm25: aq.current && aq.current.pm2_5,
      pm10: aq.current && aq.current.pm10,
      temp: wx.current && wx.current.temperature_2m
    };

    const ctx = `City: ${p.name}, ${p.country}. Live data: US AQI ${live.aqi}, PM2.5 ${live.pm25}, PM10 ${live.pm10}, temperature ${live.temp}C.`;
    const rules = `Use super simple words that a 10-year-old and a village elder can both understand. Short sentences. No technical words; if you must use one, explain it in brackets. "ur" text must be in very simple Urdu script. Score is 0 (clean) to 100 (very polluted).`;
    let ai;

    if (TYPES.includes(type)) {
      const list = (n) => `{"en":[${n} strings],"ur":[${n} strings]}`;
      ai = await ask(`${ctx}\nTopic: ${type} pollution in this city.
Return ONLY JSON: {"causes":${list('5 or more')},"harm":${list('5 or more')},"outlook":{"en":[5 strings, one for each of the next 5 years, saying what will likely happen],"ur":[5 strings]},"steps":${list('6 or more')}}
"causes" = why this pollution happens here. "harm" = how it hurts people, animals and nature. "steps" = practical ways to improve it, some for ordinary people and some for the government. ${rules}`);
    } else {
      const item = '{"score":0,"level":{"en":"","ur":""},"points":{"en":["","","","",""],"ur":["","","","",""]},"forecast":[0,0,0,0,0]}';
      ai = await ask(`${ctx}
Return ONLY JSON: {"overall":{"score":0,"verdict":{"en":"","ur":""}},"items":{${TYPES.map(k => `"${k}":${item}`).join(',')}}}
Rules: Air score = min(100, round(AQI/3)). "forecast" = predicted score for each of the next 5 years. "level" is one or two words. "points" = exactly 5 short bullet points for that pollution in this city: what it is, how bad it is here, who is hurt most, how it affects daily life, and one quick tip. For water, land, noise, light and radiation, say in one bullet that it is an estimate. "verdict" is one simple sentence. ${rules}`);
    }

    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
    res.status(200).json({ city: p.name, country: p.country, live, history, ai });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
