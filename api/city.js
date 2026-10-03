// Vercel serverless function
//  /api/city?city=Lahore            -> overview (scores + 5 bullet points per type)
//  /api/city?city=Lahore&type=air   -> full details (causes, harm, 5-year outlook, steps)
// Needs env var GEMINI_API_KEY (from Google AI Studio)
//
// DATA RULES
//  - Air score, AQI, PM2.5 and temperature are computed here from live Open-Meteo numbers. The AI never sets them.
//  - Water, land, noise, light and radiation are AI ESTIMATES, checked and limited by the rules in finalize().
const TYPES = ['air', 'water', 'thermal', 'land', 'noise', 'light', 'radioactive'];
const NAMES = { air: ['air', 'ہوا'], water: ['water', 'پانی'], thermal: ['heat', 'حرارتی'], land: ['land', 'زمین'], noise: ['noise', 'شور'], light: ['light', 'روشنی'], radioactive: ['radiation', 'تابکاری'] };
const WEIGHTS = { air: 0.30, water: 0.20, thermal: 0.12, land: 0.12, noise: 0.12, light: 0.06, radioactive: 0.08 }; // sums to 1
// Verified nuclear / radiological hotspots: only these may get radiation above 5/100
const HOTSPOT = /pripyat|chernobyl|fukushima|okuma|futaba|ozyorsk|kyshtym|hanford|richland|sellafield|semey|semipalatinsk|mailuu/i;

// ---------- small helpers ----------
const clamp = (n, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n));
const hash = (s) => { let h = 0; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; };
// If the AI returns a lazy round number (20, 35, 50...), nudge it by a small fixed amount so cities don't all look identical
const deRound = (s, key) => (s > 0 && s < 100 && s % 5 === 0) ? clamp(s + (((hash(key) % 7) - 3) || 2)) : s;
const levelOf = (s) => s < 25 ? { en: 'Low', ur: 'کم' } : s < 50 ? { en: 'Moderate', ur: 'درمیانہ' } : s < 75 ? { en: 'High', ur: 'زیادہ' } : { en: 'Very high', ur: 'بہت زیادہ' };

// ---------- REAL DATA: air + temperature (never from AI) ----------
function aqiFromPm25(c) { // US EPA formula, only used if Open-Meteo gives PM2.5 but no AQI
  const B = [[0, 12, 0, 50], [12.1, 35.4, 51, 100], [35.5, 55.4, 101, 150], [55.5, 150.4, 151, 200], [150.5, 250.4, 201, 300], [250.5, 500.4, 301, 500]];
  const b = B.find(x => c <= x[1]) || B[5];
  return Math.round((b[3] - b[2]) / (b[1] - b[0]) * (c - b[0]) + b[2]);
}
function realAqi(live) {
  if (typeof live.aqi === 'number') return live.aqi;
  if (typeof live.pm25 === 'number') return aqiFromPm25(live.pm25);
  return null;
}
function airScoreOf(live) { const a = realAqi(live); return a == null ? 0 : clamp(Math.round(a / 3)); } // AQI 300+ => 100
function airLevelOf(live) { // US EPA categories
  const a = realAqi(live);
  if (a == null) return { en: 'No live data', ur: 'لائیو ڈیٹا نہیں' };
  if (a <= 50) return { en: 'Good', ur: 'صاف' };
  if (a <= 100) return { en: 'Moderate', ur: 'درمیانہ' };
  if (a <= 150) return { en: 'Unhealthy for sensitive people', ur: 'حساس لوگوں کے لیے غیر صحت بخش' };
  if (a <= 200) return { en: 'Unhealthy', ur: 'غیر صحت بخش' };
  if (a <= 300) return { en: 'Very unhealthy', ur: 'بہت غیر صحت بخش' };
  return { en: 'Hazardous', ur: 'خطرناک' };
}
// A hot city cannot have a low heat score: floor based on the REAL temperature
const heatFloor = (t) => typeof t !== 'number' ? 0 : t >= 45 ? 80 : t >= 40 ? 70 : t >= 35 ? 55 : t >= 30 ? 40 : 0;

// ---------- JSON cleaning + validation ----------
function parseJSON(raw) {
  let t = String(raw || '').replace(/```json|```/gi, '').trim();
  const a = t.indexOf('{'), b = t.lastIndexOf('}');
  if (a < 0 || b <= a) throw new Error('no JSON object found');
  t = t.slice(a, b + 1);
  try { return JSON.parse(t); }
  catch (e) { return JSON.parse(t.replace(/,\s*([}\]])/g, '$1')); }
}
const arr = (o, n) => o && Array.isArray(o.en) && Array.isArray(o.ur) && o.en.length >= n && o.ur.length >= n;
const validOverview = (a) => a && a.overall && a.overall.verdict && a.items && TYPES.every(k => {
  const i = a.items[k];
  return i && i.level && arr(i.points, 3) && Array.isArray(i.forecast) && i.forecast.length >= 5;
});
const validDetail = (a) => a && ['causes', 'harm', 'steps'].every(k => arr(a[k], 3)) && arr(a.outlook, 5);

// ---------- Ask Gemini (system instruction + retry + backup models) ----------
// Returns a valid object, or null if every model is busy / returns bad data.
async function ask(system, prompt, valid) {
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
              systemInstruction: { parts: [{ text: system }] },
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: { responseMimeType: 'application/json', temperature: 0.3, maxOutputTokens: 16000 }
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
          continue;
        }
        const code = d.error && d.error.code;
        console.error('Gemini error', m, code, d.error && d.error.message);
        if ([400, 401, 403].includes(code)) throw new Error('API key problem: ' + d.error.message);
        if (code && ![429, 500, 503, 504].includes(code)) break; // wrong model name: next model
      } catch (e) {
        if (String(e.message).startsWith('API key problem')) throw e;
        console.error('Request failed', m, e.message);
      }
      await new Promise(s => setTimeout(s, 1200));
    }
  }
  return null;
}

// ---------- Post-processing: real numbers win, AI estimates are checked ----------
function finalize(ai, live, p) {
  const key = (p.name || '') + '|' + (p.country || '');
  const hot = HOTSPOT.test(p.name || '');
  TYPES.forEach(k => {
    const i = ai.items[k];
    let s = clamp(Math.round(Number(i.score) || 0));
    if (k === 'air') {
      s = airScoreOf(live);                 // REAL: from live AQI
      i.level = airLevelOf(live);
    } else {
      if (k === 'thermal') s = Math.max(s, heatFloor(live.temp));   // REAL temperature sets a minimum
      if (k === 'radioactive') s = hot ? clamp(s) : clamp(s, 1, 5); // normal cities: 1-5 only
      else s = deRound(s, key + k);
      i.level = levelOf(s);
    }
    i.score = s;
    let f = (Array.isArray(i.forecast) ? i.forecast : []).slice(0, 5).map(v => clamp(Math.round(Number(v)))).map(v => Number.isNaN(v) ? s : v);
    while (f.length < 5) f.push(s);
    if (k === 'air') f[0] = clamp(f[0], s - 15, s + 15);                // first forecast year stays near today's real value
    if (k === 'radioactive' && !hot) f = f.map(v => clamp(v, 1, 5));
    i.forecast = f;
  });
  ai.overall.score = Math.round(TYPES.reduce((sum, k) => sum + ai.items[k].score * WEIGHTS[k], 0)); // computed, not AI
  return ai;
}

// ---------- Safe fallbacks (same shape the page expects) ----------
function fallbackOverview(live) {
  const base = { water: 41, thermal: 37, land: 38, noise: 43, light: 33, radioactive: 2 }; // neutral, clearly labelled as rough
  const items = {};
  TYPES.forEach(k => {
    const s = k === 'air' ? airScoreOf(live) : base[k];
    const [n, u] = NAMES[k];
    items[k] = {
      score: s, level: levelOf(s),
      points: {
        en: [`The ${n} pollution here is roughly ${s} out of 100.`, k === 'air' ? 'This air number comes from live data.' : 'This number is a rough guess, not a measurement.', 'The AI helper is very busy right now, so details are limited.', 'Children, old people and sick people feel pollution the most.', 'Please search again in a minute for the full explanation.'],
        ur: [`یہاں ${u} کی آلودگی تقریباً ${s} میں سے 100 ہے۔`, k === 'air' ? 'ہوا کا یہ نمبر لائیو ڈیٹا سے آیا ہے۔' : 'یہ نمبر ایک موٹا اندازہ ہے، پیمائش نہیں۔', 'AI مددگار ابھی بہت مصروف ہے، اس لیے تفصیل کم ہے۔', 'بچے، بزرگ اور بیمار لوگ آلودگی سے سب سے زیادہ متاثر ہوتے ہیں۔', 'مکمل وضاحت کے لیے ایک منٹ بعد دوبارہ تلاش کریں۔']
      },
      forecast: [s, s, s, s, s]
    };
  });
  return { overall: { score: 0, verdict: { en: 'This is a quick estimate because the AI helper is busy. Air and temperature are live.', ur: 'AI مددگار مصروف ہے اس لیے یہ فوری اندازہ ہے۔ ہوا اور درجہ حرارت لائیو ہیں۔' } }, items };
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

// ---------- Prompts ----------
function systemPrompt(live, p, airScore, airLevel) {
  return `You are an environmental analyst for ordinary citizens.
Live ground data: AQI is ${live.aqi ?? 'unavailable'}, PM2.5 is ${live.pm25 ?? 'unavailable'}, Temp is ${live.temp ?? 'unavailable'}°C. Based strictly on this reality, generate a grounded analysis, 5-year trend, and actionable citizen advice.
City: ${p.name}${p.admin1 ? ', ' + p.admin1 : ''}, ${p.country}. Population: ${p.population || 'unknown'}.
FIXED VALUES (never change or contradict them): air score = ${airScore}/100 (${airLevel.en}); temperature = ${live.temp ?? 'unknown'}°C. These come from real sensors.

GROUNDING RULES
1. Air and temperature are real. Do not invent other measurements. Water, land, noise, light and radiation are estimates: never present them as measured or live data.
2. Use realistic regional baselines for the estimates:
   - Large port or coastal megacities (for example Karachi, Mumbai, Lagos, Dhaka) have higher water and waste stress and higher noise than smaller inland cities.
   - Industrial or agricultural hubs with heavy seasonal smog (for example Lahore, Delhi, Faisalabad) have critical air and strain on farmland and groundwater.
   - Small inland towns usually have lower noise and light pollution, but may have farm-chemical or waste problems.
   - Dense wealthy cities usually have high light pollution; remote areas have very low.
3. Radiation for normal cities must be minimal (1 to 5 out of 100). Go higher only for a verified nuclear or radiological site.
4. Use specific whole numbers. Avoid lazy round numbers (20, 35, 50). Different cities and different pollution types must get different, justified numbers.
5. Forecast trends must follow known regional patterns (seasonal smog, population growth, climate, current rules), starting near today's level.
6. Reply with raw JSON only: no markdown, no code fences, no text before or after.
7. Use super simple words that a 10-year-old and a village elder can both understand. Short sentences. No technical words; if you must use one, explain it in brackets. "ur" text must be in very simple Urdu script. Score is 0 (clean) to 100 (very polluted).`;
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
    const hr = hs.hourly || {}, days = {};
    (hr.time || []).forEach((tm, i) => { const v = hr.us_aqi[i]; if (v == null) return; (days[tm.slice(0, 10)] = days[tm.slice(0, 10)] || []).push(v); });
    const history = Object.keys(days).sort().map(d => ({ d, v: Math.round(days[d].reduce((a, b) => a + b, 0) / days[d].length) }));

    const airScore = airScoreOf(live), airLevel = airLevelOf(live);
    const system = systemPrompt(live, p, airScore, airLevel);
    let ai, ok = false;

    if (TYPES.includes(type)) {
      const list = (n) => `{"en":[${n} strings],"ur":[${n} strings]}`;
      ai = await ask(system, `Topic: ${type} pollution in ${p.name}.
Return ONLY JSON: {"causes":${list('5 or more')},"harm":${list('5 or more')},"outlook":{"en":[5 strings, one for each of the next 5 years, saying what will likely happen],"ur":[5 strings]},"steps":${list('6 or more')}}
"causes" = why this pollution happens here. "harm" = how it hurts people, animals and nature. "outlook" = the 5-year trend. "steps" = actionable advice, some for ordinary citizens and some for the government.${type === 'air' ? ' Use the real AQI and PM2.5 numbers in your explanation.' : ''}`, validDetail);
      ok = !!ai;
      if (!ai) ai = fallbackDetail();
    } else {
      const item = '{"score":0,"level":{"en":"","ur":""},"points":{"en":["","","","",""],"ur":["","","","",""]},"forecast":[0,0,0,0,0]}';
      ai = await ask(system, `Return ONLY JSON: {"overall":{"score":0,"verdict":{"en":"","ur":""}},"items":{${TYPES.map(k => `"${k}":${item}`).join(',')}}}
"score" is the pollution level 0-100 (for "air" use exactly ${airScore}). "forecast" = predicted score for each of the next 5 years. "level" is one or two words. "points" = exactly 5 short bullet points for that pollution in ${p.name}: what it is, how bad it is here, who is hurt most, how it affects daily life, and one actionable tip for citizens. For water, land, noise, light and radiation, say in one bullet that it is an estimate. "verdict" is one simple sentence about the overall situation.`, validOverview);
      ok = !!ai;
      if (!ai) ai = fallbackOverview(live);
      ai = finalize(ai, live, p); // real air/temperature numbers win, estimates get checked
    }

    res.setHeader('Cache-Control', ok ? 's-maxage=3600, stale-while-revalidate=86400' : 'no-store');
    res.status(200).json({ city: p.name, country: p.country, live, history, ai, degraded: !ok });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
