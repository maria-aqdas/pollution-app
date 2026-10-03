// /api/rank -> live air-quality ranking of major Pakistani cities (real Open-Meteo data, no AI)
const C = [
  ['Lahore', 'لاہور', 31.5497, 74.3436], ['Karachi', 'کراچی', 24.8607, 67.0011], ['Islamabad', 'اسلام آباد', 33.6844, 73.0479],
  ['Peshawar', 'پشاور', 34.0151, 71.5249], ['Faisalabad', 'فیصل آباد', 31.4504, 73.135], ['Rawalpindi', 'راولپنڈی', 33.5651, 73.0169],
  ['Multan', 'ملتان', 30.1575, 71.5249], ['Quetta', 'کوئٹہ', 30.1798, 66.975], ['Gujranwala', 'گوجرانوالہ', 32.1877, 74.1945],
  ['Hyderabad', 'حیدرآباد', 25.396, 68.3578], ['Sialkot', 'سیالکوٹ', 32.4945, 74.5229], ['Kasur', 'قصور', 31.1156, 74.4467]
];
module.exports = async (req, res) => {
  try {
    const url = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${C.map(c => c[2]).join(',')}&longitude=${C.map(c => c[3]).join(',')}&current=us_aqi,pm2_5`;
    const d = await (await fetch(url)).json();
    const arr = Array.isArray(d) ? d : [d];
    const list = C.map((c, i) => ({
      en: c[0], ur: c[1],
      aqi: arr[i] && arr[i].current ? arr[i].current.us_aqi : null,
      pm25: arr[i] && arr[i].current ? arr[i].current.pm2_5 : null
    })).filter(x => x.aqi != null).sort((a, b) => b.aqi - a.aqi);
    res.setHeader('Cache-Control', 's-maxage=900, stale-while-revalidate=3600');
    res.status(200).json({ list, updated: new Date().toISOString() });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
