// Vercel serverless function
//  /api/city?city=Lahore            -> overview (scores + 5 bullet points per type)
//  /api/city?city=Lahore&type=air   -> full details (causes, harm, 5-year outlook, steps)
// Needs env var GEMINI_API_KEY (from Google AI Studio)
const TYPES = ['air', 'water', 'thermal', 'land', 'noise', 'light', 'radioactive'];
const NAMES = { air: ['air', 'ہوا'], water: ['water', 'پانی'], thermal: ['heat', 'حرارتی'], land: ['land', 'زمین'], noise: ['noise', 'شور'], light: ['light', 'روشنی'], radioactive: ['radiation', 'تابکاری'] };

// ---------- JSON cleaning + validation ----------
function parseJSON(raw) {
  let t = String(raw || '').replace(/```json|```/gi, '').trim();   // strip markdown fences
  const a = t.indexOf('{'), b = t.lastIndexOf('}');                  // keep only first { ... last }
  if (a < 0 || b <= a) throw new Error('no JSON object found');
  t = t.slice(a, b + 1);
  try { return JSON.parse(t); }
  catch (e) { return JSON.parse(t.replace(/,\s*([}\]])/g, '$1')); }  // last try: remove trailing commas
}
const arr = (o, n) => o && Array.isArray(o.en) && Array.isArray(o.ur) && o.en.length >= n && o.ur.length >= n;
const validOverview = (a) => a && a.overall && a.overall.verdict && a.items && TYPES.every(k => {
  const i = a.items[k];
  return i && typeof i.score === 'number' && i.level && arr(i.points, 3) && Array.isArray(i.forecast) && i.forecast.length >= 5;
});
const validDetail = (a) => a && ['causes', 'harm', 'steps'].every(k => arr(a[k], 3)) && arr(a.outlook, 5);

// ---------- Ask Gemini (retry + backup models) ----------
// Returns a valid object, or null if every model is busy / returns bad data.
async function ask(prompt, valid) {
  const models = [process.env.GEMINI_MODEL, 'gemini-3.8-flash', 'gemini-flash-latest', 'gemini-flash-lite-latest'].filter(Boolean);
  const started = Date.now();
  for (const m of models) {
    for (let a = 0; a < 2; a++) {
      if (Date.now() - started > 45000) return null;
      try {
        const r = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${process.env.GEMINI_API_KEY}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: { responseMimeType: 'application/json', temperature: 0.4, maxOutputTokens: 16000 }
            })
          }
        );
        const d = await r.json();
        const cand = d.candidates && d.candidates[0];
        const text = cand && cand.content && cand.content.parts && cand.content.parts[0] && cand.content.parts[0].text;
        if (text) {
          try {
            const obj = parseJSON(text);
            if (valid(obj)) return obj;
            console.error('Wrong JSON shape from', m, 'finishReason:', cand.finishReason);
          } catch (e) {
            console.error('Bad JSON from', m, 'finishReason:', cand.finishReason, 'RAW:', String(text).slice(0, 2000));
          }
          continue; // try again / next model
        }
        const code = d.error && d.error.code;
        console.error('Gemini error', m, code, d.error && d.error.message);
        if ([400, 401, 403].includes(code)) throw new Error('API key problem: ' + d.error.message); // real config error: show it
        if (code && ![429, 500, 503, 504].includes(code)) break; // e.g. 404 wrong model: go to next model
      } catch (e) {
        if (String(e.message).startsWith('API key problem')) throw e;
        console.error('Request failed', m, e.message);
      }
      await new Promise(s => setTimeout(s, 1200));
    }
  }
  return null;
}

// ---------- Safe fallbacks (valid JSON in the same shape the page expects) ----------
function fallbackOverview(live) {
  const lv = (s) => s < 25 ? [['Low', 'کم']] : s < 50 ? [['Moderate', 'درمیانہ']] : s < 75 ? [['High', 'زیادہ']] : [['Very high', 'بہت زیادہ']];
  const items = {};
  TYPES.forEach(k => {
    const s = k === 'air' && live.aqi != null ? Math.min(100, Math.round(live.aqi / 3)) : (k === 'radioactive' ? 10 : 40);
    const [n, u] = NAMES[k], L = lv(s)[0];
    items[k] = {
      score: s, level: { en: L[0], ur: L[1] },
      points: {
        en: [`The ${n} pollution here is roughly ${s} out of 100.`, k === 'air' ? 'This air number comes from live data.' : 'This number is a rough guess, not a measurement.', 'The AI helper is very busy right now, so details are limited.', 'Children, old people and sick people feel pollution the most.', 'Please search again in a minute for the full explanation.'],
        ur: [`یہاں ${u} کی آلودگی تقریباً ${s} میں سے 100 ہے۔`, k === 'air' ? 'ہوا کا یہ نمبر لائیو ڈیٹا سے آیا ہے۔' : 'یہ نمبر ایک موٹا اندازہ ہے، پیمائش نہیں۔', 'AI مددگار ابھی بہت مصروف ہے، اس لیے تفصیل کم ہے۔', 'بچے، بزرگ اور بیمار لوگ آلودگی سے سب سے زیادہ متاثر ہوتے ہیں۔', 'مکمل وضاحت کے لیے ایک منٹ بعد دوبارہ تلاش کریں۔']
      },
      forecast: [s, s, s, s, s]
    };
  });
  const o = Math.round(TYPES.reduce((a, k) => a + items[k].score, 0) / TYPES.length);
  return { overall: { score: o, verdict: { en: 'This is a quick estimate because the AI helper is busy. Air data is live.', ur: 'AI مددگار مصروف ہے اس لیے یہ فوری اندازہ ہے۔ ہوا کا ڈیٹا لائیو ہے۔' } }, items };
}
function fallbackDetail() {
  const two = (en, ur) => ({ en, ur });
  return {
    causes: two(['Smoke from vehicles and factories.', 'Burning of waste and crop leftovers.', 'Too many people and too little greenery.', 'Dust from building work and broken roads.', 'Weak rules or rules that are not followed.'],
      ['گاڑیوں اور فیکٹریوں کا دھواں۔', 'کچرے اور فصلوں کی باقیات کا جلنا۔', 'آبادی زیادہ اور سبزہ کم ہونا۔', 'تعمیرات اور ٹوٹی سڑکوں کی دھول۔', 'کمزور قوانین یا ان پر عمل نہ ہونا۔']),
    harm: two(['It can make breathing and health problems worse.', 'Children and old people get sick more easily.', 'It can harm animals, birds and plants.', 'It can damage crops and drinking water.', 'It can lower the quality of daily life.'],
      ['اس سے سانس اور صحت کے مسائل بڑھ سکتے ہیں۔', 'بچے اور بزرگ جلدی بیمار ہو جاتے ہیں۔', 'جانوروں، پرندوں اور پودوں کو نقصان ہو سکتا ہے۔', 'فصلوں اور پینے کے پانی کو نقصان پہنچ سکتا ہے۔', 'روزمرہ زندگی کا معیار کم ہو سکتا ہے۔']),
    outlook: two(['Year 1: Things stay close to today.', 'Year 2: Small changes may appear.', 'Year 3: Without action, it may slowly get worse.', 'Year 4: Good habits and rules can start to help.', 'Year 5: The result depends on what people and leaders do now.'],
      ['پہلا سال: حالات آج جیسے رہیں گے۔', 'دوسرا سال: چھوٹی تبدیلیاں آ سکتی ہیں۔', 'تیسرا سال: کچھ نہ کیا تو آہستہ آہستہ بگڑ سکتے ہیں۔', 'چوتھا سال: اچھی عادتیں اور قوانین مدد کرنے لگتے ہیں۔', 'پانچواں سال: نتیجہ اس پر ہے کہ لوگ اور حکمران آج کیا کرتے ہیں۔']),
    steps: two(['Plant more trees.', 'Do not burn waste or leaves.', 'Use buses, bikes or walking when you can.', 'Save electricity and water.', 'Report big polluters to the local office.', 'Ask the government for strong, fair rules.'],
      ['زیادہ درخت لگائیں۔', 'کچرا اور پتے نہ جلائیں۔', 'ممکن ہو تو بس، سائیکل یا پیدل چلیں۔', 'بجلی اور پانی بچائیں۔', 'بڑے آلودگی پھیلانے والوں کی شکایت مقامی دفتر میں کریں۔', 'حکومت سے مضبوط اور منصفانہ قوانین کا مطالبہ کریں۔'])
  };
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
    const live = {
      aqi: aq.current && aq.current.us_aqi,
      pm25: aq.current && aq.current.pm2_5,
      pm10: aq.current && aq.current.pm10,
      temp: wx.current && wx.current.temperature_2m
    };
    // daily average AQI for the last 7 days + today
    const hr = hs.hourly || {}, days = {};
    (hr.time || []).forEach((tm, i) => { const v = hr.us_aqi[i]; if (v == null) return; (days[tm.slice(0, 10)] = days[tm.slice(0, 10)] || []).push(v); });
    const history = Object.keys(days).sort().map(d => ({ d, v: Math.round(days[d].reduce((a, b) => a + b, 0) / days[d].length) }));

    const ctx = `City: ${p.name}, ${p.country}. Live data: US AQI ${live.aqi}, PM2.5 ${live.pm25}, PM10 ${live.pm10}, temperature ${live.temp}C.`;
    const rules = `Reply with raw JSON only: no markdown, no code fences, no text before or after. Use super simple words that a 10-year-old and a village elder can both understand. Short sentences. No technical words; if you must use one, explain it in brackets. "ur" text must be in very simple Urdu script. Score is 0 (clean) to 100 (very polluted).`;
    let ai;

    if (TYPES.includes(type)) {
      const list = (n) => `{"en":[${n} strings],"ur":[${n} strings]}`;
      ai = await ask(`${ctx}\nTopic: ${type} pollution in this city.
Return ONLY JSON: {"causes":${list('5 or more')},"harm":${list('5 or more')},"outlook":{"en":[5 strings, one for each of the next 5 years, saying what will likely happen],"ur":[5 strings]},"steps":${list('6 or more')}}
"causes" = why this pollution happens here. "harm" = how it hurts people, animals and nature. "steps" = practical ways to improve it, some for ordinary people and some for the government. ${rules}`, validDetail);
      if (!ai) ai = fallbackDetail();
      else if (ai) ai.__ok = true;
    } else {
      const item = '{"score":0,"level":{"en":"","ur":""},"points":{"en":["","","","",""],"ur":["","","","",""]},"forecast":[0,0,0,0,0]}';
      ai = await ask(`${ctx}
Return ONLY JSON: {"overall":{"score":0,"verdict":{"en":"","ur":""}},"items":{${TYPES.map(k => `"${k}":${item}`).join(',')}}}
Rules: Air score = min(100, round(AQI/3)). "forecast" = predicted score for each of the next 5 years. "level" is one or two words. "points" = exactly 5 short bullet points for that pollution in this city: what it is, how bad it is here, who is hurt most, how it affects daily life, and one quick tip. For water, land, noise, light and radiation, say in one bullet that it is an estimate. "verdict" is one simple sentence. ${rules}`, validOverview);
      if (!ai) ai = fallbackOverview(live);
      else ai.__ok = true;
    }

    const degraded = !ai.__ok;
    delete ai.__ok;
    // Only cache real AI answers, never the fallback
    res.setHeader('Cache-Control', degraded ? 'no-store' : 's-maxage=3600, stale-while-revalidate=86400');
    res.status(200).json({ city: p.name, country: p.country, live, history, ai, degraded });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
