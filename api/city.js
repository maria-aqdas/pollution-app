export default async function handler(req, res) {
  // Allow CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const city = req.query.name || req.query.city || (req.body && req.body.city);

  if (!city) {
    return res.status(400).json({ error: "City name is required (e.g. ?name=Lahore)" });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "GEMINI_API_KEY environment variable is not set." });
  }

  const prompt = `You are an environmental analytics API. Analyze the city "${city}".
Return strictly valid, raw JSON (no markdown formatting, no \`\`\`json code blocks).
The JSON must follow this exact structure:
{
  "city": "${city}",
  "overallScore": 75,
  "verdict": "Short plain-language verdict on current environmental state",
  "verdict_ur": "Short plain-language verdict in Urdu",
  "healthAdvice": [
    "Wear an N95 mask outdoors",
    "Avoid morning jogging",
    "Keep windows closed during peak traffic"
  ],
  "healthAdvice_ur": [
    "باہر جاتے وقت ماسک کا استعمال کریں",
    "صبح کے وقت ورزش سے پرہیز کریں",
    "کھڑکیاں بند رکھیں"
  ],
  "pollutants": {
    "air": {
      "level": "Unhealthy",
      "score": 82,
      "mainCauses": "Vehicular emissions, crop burning, industrial smoke",
      "mainCauses_ur": "گاڑیوں کا دھواں، فصلوں کی باقیات جلانا، فیکٹریوں کا اخراج",
      "disadvantages": "Respiratory infections, reduced lung function, eye irritation",
      "disadvantages_ur": "سانس کی بیماریاں، پھیپھڑوں کے مسائل، آنکھوں میں جلن",
      "mostAtRisk": "Children, elderly, asthmatics",
      "mostAtRisk_ur": "بچے، بزرگ اور دمہ کے مریض",
      "tip": "Use air purifiers indoors and limit high-effort outdoor activity.",
      "tip_ur": "گھروں کے اندر ائیر پیوریفائر کا استعمال کریں اور باہر کی سرگرمیاں محدود کریں۔",
      "forecast5yr": [85, 83, 80, 78, 75]
    },
    "water": {
      "level": "Moderate",
      "score": 60,
      "mainCauses": "Untreated sewage disposal and industrial runoff into canals/rivers",
      "mainCauses_ur": "سیوریج اور فیکٹریوں کے آلودہ پانی کا دریاؤں اور نہروں میں اخراج",
      "disadvantages": "Waterborne diseases like cholera and gastroenteritis",
      "disadvantages_ur": "پینے کے صاف پانی کی کمی اور ہیضہ و معدے کی بیماریاں",
      "mostAtRisk": "Residents relying on untreated tap water and ground pumps",
      "mostAtRisk_ur": "وہ آبادی جو فلٹر کے بغیر زیر زمین پانی استعمال کرتی ہے",
      "tip": "Boil drinking water or use reverse osmosis filters.",
      "tip_ur": "پینے کا پانی ابال کر استعمال کریں یا فلٹر لگائیں۔",
      "forecast5yr": [62, 60, 58, 55, 52]
    },
    "thermal": {
      "level": "Moderate",
      "score": 55,
      "mainCauses": "Urban heat island effect, dense concrete structures, lack of tree cover",
      "mainCauses_ur": "شہری گرمی کا اثر، کنکریٹ کی عمارات اور درختوں کی کمی",
      "disadvantages": "Heat stroke, higher cooling energy demands",
      "disadvantages_ur": "ہیٹ اسٹروک اور بجلی کے زیادہ اخراجات",
      "mostAtRisk": "Outdoor laborers, delivery riders, elderly",
      "mostAtRisk_ur": "مزدور، رائیڈرز اور معمر افراد",
      "tip": "Stay hydrated, plant shade trees, and avoid direct midday sun.",
      "tip_ur": "زیادہ پانی پئیں اور دوپہر کے وقت بلا ضرورت دھوپ میں نکلنے سے گریز کریں۔",
      "forecast5yr": [56, 58, 60, 61, 63]
    },
    "land": {
      "level": "High",
      "score": 70,
      "mainCauses": "Improper municipal solid waste disposal, open dumping, plastic accumulation",
      "mainCauses_ur": "کوڑے کرکٹ کو کھلے میدانوں میں پھینکنا اور پلاسٹک کا کچرا",
      "disadvantages": "Soil contamination, toxic leachate, pest breeding",
      "disadvantages_ur": "زمین کی زرخیزی میں کمی، مچھروں اور کیڑوں کی افزائش",
      "mostAtRisk": "Communities living near landfills and waste yards",
      "mostAtRisk_ur": "ڈمپنگ سائٹس اور کچرا کنڈیوں کے قریب رہنے والے افراد",
      "tip": "Segregate dry and wet waste, and minimize single-use plastics.",
      "tip_ur": "کوڑا کرکٹ الگ الگ کریں اور پلاسٹک بیگز کا استعمال کم سے کم کریں۔",
      "forecast5yr": [72, 70, 68, 65, 62]
    },
    "noise": {
      "level": "High",
      "score": 68,
      "mainCauses": "Unregulated vehicle horns, heavy traffic, construction equipment",
      "mainCauses_ur": "ٹریفک کا دباؤ، بلا ضرورت ہارن بجانا اور تعمیراتی مشینری",
      "disadvantages": "Hearing impairment, elevated stress, sleep disruption",
      "disadvantages_ur": "سماعت کے مسائل، ذہنی دباؤ اور بے خوابی",
      "mostAtRisk": "Traffic wardens, commuters, residents along main arteries",
      "mostAtRisk_ur": "ٹریفک پولیس، مسافر اور شاہراہوں پر رہنے والے رہائشی",
      "tip": "Use ear protection in high-noise zones and avoid honking.",
      "tip_ur": "زیادہ شور والے علاقوں میں احتیاط کریں اور بلا ضرورت ہارن نہ بجائیں۔",
      "forecast5yr": [69, 68, 67, 65, 64]
    },
    "light": {
      "level": "Moderate",
      "score": 45,
      "mainCauses": "Illuminated commercial billboards, excessive unshielded street lighting",
      "mainCauses_ur": "تجارتی بل بورڈز اور غیر منظم اسٹریٹ لائٹس",
      "disadvantages": "Disrupted circadian rhythms, urban skyglow obstructing stargazing",
      "disadvantages_ur": "نیند کا متاثر ہونا اور قدرتی ماحول پر اثر",
      "mostAtRisk": "Night-shift workers and urban bird species",
      "mostAtRisk_ur": "نائٹ شفٹ میں کام کرنے والے اور پرندے",
      "tip": "Use blackout curtains and shielded downward-facing exterior lights.",
      "tip_ur": "کمروں میں گہرے پردے استعمال کریں اور غیر ضروری لائٹس بند رکھیں۔",
      "forecast5yr": [46, 48, 50, 52, 53]
    },
    "radioactive": {
      "level": "Low",
      "score": 10,
      "mainCauses": "Standard medical diagnostic equipment background and natural radon",
      "mainCauses_ur": "قدرتی زمینی تابکاری اور طبی تشخیصی مشینیں",
      "disadvantages": "Minimal risk under normal monitored conditions",
      "disadvantages_ur": "عام حالات میں کوئی خاص خطرہ نہیں",
      "mostAtRisk": "Radiology clinic staff without lead shielding",
      "mostAtRisk_ur": "طبی شعبے میں ایکسرے اور اسکین مشین آپریٹرز",
      "tip": "Routine calibration and proper medical shielding protocols.",
      "tip_ur": "معیاری طبی احتیاطی تدابیر پر عمل کریں۔",
      "forecast5yr": [10, 10, 10, 10, 10]
    }
  }
}`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.2,
            responseMimeType: "application/json"
          }
        })
      }
    );

    if (!response.ok) {
      const errBody = await response.text();
      return res.status(response.status).json({
        error: "Gemini API request failed",
        details: errBody
      });
    }

    const rawData = await response.json();
    const candidateText = rawData.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!candidateText) {
      return res.status(500).json({ error: "No response text received from Gemini." });
    }

    const cleanJson = candidateText.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsedData = JSON.parse(cleanJson);

    return res.status(200).json(parsedData);
  } catch (error) {
    return res.status(500).json({
      error: "Internal Server Error while generating city analysis",
      details: error.message
    });
  }
}
