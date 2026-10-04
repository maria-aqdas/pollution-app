```markdown
<div align="center">

# 🟡 CityAir • شہر کی ہوا
### *Free Pollution Checker for Any City*

<p align="center">
  <b>"How clean is your city?"</b><br/>
  Type any city to see air, water, heat, land, noise, light and radioactive pollution, what harm it does, and a 5-year outlook, in simple words.
</p>

[![Live Application](https://img.shields.io/badge/🚀_Live_Demo-pollution--app.vercel.app-F59E0B?style=for-the-badge&logo=vercel&logoColor=white)](https://pollution-app.vercel.app/#f)
[![GitHub Repository](https://img.shields.io/badge/💻_Source_Code-GitHub-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/maria-aqdas/pollution-app)
[![Product Requirements Document](https://img.shields.io/badge/📄_PRD_Document-Google_Docs-2563EB?style=for-the-badge&logo=googledocs&logoColor=white)](https://docs.google.com/document/d/1Fl8p9LQn1b3FUqtc_H4ZBG23TfjmexzP/edit?usp=sharing&ouid=108518944868378548595&rtpof=true&sd=true)
[![Presentation Slides](https://img.shields.io/badge/📊_Slide_Deck-Google_Slides-EA4335?style=for-the-badge&logo=googleslides&logoColor=white)](https://docs.google.com/presentation/d/1URjemid9xjdeXjlEVxOcgmQpRFfHWSGB/edit?usp=sharing&ouid=108518944868378548595&rtpof=true&sd=true)

<br/>

```text
┌──────────────────────┬──────────────────────┬──────────────────────┬──────────────────────┐
│  7 Pollution Types   │    Live Air Data     │ 2 Languages (EN/UR)  │     Free To Use      │
└──────────────────────┴──────────────────────┴──────────────────────┴──────────────────────┘

```

---

## 🔗 Key Links

* **Live Web App:** [pollution-app.vercel.app](https://pollution-app.vercel.app/#f)
* **GitHub Repository:** [maria-aqdas/pollution-app](https://github.com/maria-aqdas/pollution-app)
* **PRD Document:** [CityAir PRD on Google Docs](https://docs.google.com/document/d/1Fl8p9LQn1b3FUqtc_H4ZBG23TfjmexzP/edit?usp=sharing&ouid=108518944868378548595&rtpof=true&sd=true)
* **Presentation Slides:** [CityAir Slides on Google Presentation](https://docs.google.com/presentation/d/1URjemid9xjdeXjlEVxOcgmQpRFfHWSGB/edit?usp=sharing&ouid=108518944868378548595&rtpof=true&sd=true)
* **Presentation Video Recording:** *[Add your video link here]*

---

## 🧭 Why It Matters

Most pollution apps only show technical air numbers (AQI, PM2.5) in English that are hard to translate into real-life health decisions. They overlook water, heat, land, noise, light, and radiation, while leaving out Urdu speakers.

**CityAir** solves this in under 10 seconds:

* **7 Kinds of Pollution:** Full picture of air, water, heat, land, noise, light, and radiation.


* **True Bilingual Support:** Instant toggle between simple English and Nastaliq Urdu (with full RTL support).


* **Actionable Advice:** Health alerts, outdoor windows (best and worst times to go outside), and concrete improvement steps.


* **Honest Data:** Real sensor readings and AI estimates are kept strictly separated and clearly marked.



---

## 🖥️ Application Features & Interface

### 1. City Check & Instant Overview

* **Overall Score (0–100):** Clear status badges: **Good**, **Moderate** (`درمیانہ`), **Unhealthy**, or **Hazardous**.


* **Live Environmental Readings:** Immediate values for **Air Quality Index (AQI)**, **PM2.5**, and **Temperature**.


* **Plain-Language Advisory:** Contextual alerts based on current exposure (e.g., *"Very noisy. Protect your ears and your sleep."*).


* **Action Buttons:** One-click **Download report (PDF)** and **Share** (direct link or WhatsApp).



### 2. Trends & Multi-Pollution View

* **All 7 Pollutions at a Glance:** Grouped bar chart comparing all seven pollution levels side-by-side.


* **7-Day Air Trend:** Interactive chart showing recent air quality trends with plain-text summaries (e.g., *"Today's air is about the same as the last 6 days."*).


* **Category Filters:** Quick chips to filter and inspect **All**, **Air**, **Water**, **Thermal**, **Land**, **Noise**, **Light**, or **Radioactive**.



### 3. The 7 Pollution Dimensions

| Type | Badge | What It Means & How It Affects You | What You Can Do |
| --- | --- | --- | --- |
| **💨 Air** | `Live data`<br> | Smoke, smog, and fine PM2.5 dust entering lungs and bloodstream.

 | Exercise outdoors when clear; commute by public transit.

 |
| **💧 Water** | `AI estimate`<br> | Trash, sewage, and chemical runoff entering rivers, bays, and pipes.

 | Never pour oils or paints down the drain; boil tap water when warned.

 |
| **🌡️ Thermal** | `AI estimate`<br> | Tall buildings and asphalt trapping heat like an oven (urban heat islands).

 | Shade south-facing windows; add leafy balcony shrubs to cool down.

 |
| **🏞️ Land** | `AI estimate`<br> | Street litter, food waste, and plastic bags poisoning fertile soils.

 | Tie garbage bags tightly; drop scraps in community compost bins.

 |
| **🔊 Noise** | `AI estimate`<br> | High sound levels from sirens, subways, and traffic raising daily stress.

 | Use white noise machines or heavy curtains to protect your sleep.

 |
| **💡 Light** | `AI estimate`<br> | Bright artificial illumination hiding stars and disrupting nocturnal sleep.

 | Hang blackout blinds in bedrooms to ensure healthy sleep.

 |
| **☢️ Radioactive** | `AI estimate`<br> | Safe ambient background radiation (held to normal baseline levels).

 | Risk is near zero; daily outdoor routines carry no radiation risk.

 |

---

## ⚙️ How It Works

```text
 ┌─────────────────────────┐      ┌─────────────────────────┐      ┌─────────────────────────┐
 │   1. Type a City        │ ───> │  2. We Fetch Live Data  │ ───> │   3. AI Explains It     │
 │ Enter any city worldwide│      │ Air quality & weather   │      │ Gemini estimates the    │
 │ or tap "Use my location"│      │ come from Open-Meteo    │      │ rest into simple advice │
 └─────────────────────────┘      └─────────────────────────┘      └─────────────────────────┘

```

---

## 🧮 Data & Scoring Engine

* **Real Data:** Open-Meteo supplies direct values for AQI, PM2.5, temperature, weather, and 7-day hourly forecasts.


* **AI Estimates:** Non-sensor scores (water, land, noise, light, radiation) are generated by Google Gemini using regional indicators and tagged as `AI estimate`.


* **Overall Weighted Score:**

$$\text{Overall Score} = (0.30 \times \text{Air}) + (0.20 \times \text{Water}) + (0.12 \times \text{Thermal}) + (0.12 \times \text{Land}) + (0.12 \times \text{Noise}) + (0.08 \times \text{Radioactive}) + (0.06 \times \text{Light})$$



* **Heat Floor Rule:** Thermal score cannot fall below 40, 55, 70, or 80 when ambient/feels-like temperatures hit 30°C, 35°C, 40°C, or 45°C.


* **Radiation Safeguard:** Clamped between 1–5 out of 100 for normal cities unless verified against a known nuclear facility.


* **Health Benchmarks:** PM2.5 / 22 calculates equivalent daily cigarettes smoked, alongside direct comparisons against WHO 2021 daily limits.



---

## 🛠️ Tech Stack

* **Frontend:** Framework-free vanilla HTML5, custom CSS (Dark/Light mode), and Chart.js for data visualization.


* **Serverless Backend:** Node.js serverless functions running on Vercel (`/api/city` and `/api/rank`).


* **AI Layer:** Google Gemini API generating plain-language structured responses.


* **External APIs:** Open-Meteo (Geocoding, Weather, Air Quality) and BigDataCloud (Client Geolocation).


* **Reliability:** Built-in retries, backup AI models, 1-hour cache on AI payloads, and 15-minute caching for Pakistan rankings.



---

## 🚀 Local Development Setup

### 1. Clone the repository

```bash
git clone [https://github.com/maria-aqdas/pollution-app.git](https://github.com/maria-aqdas/pollution-app.git)
cd pollution-app

```

### 2. Configure Environment Variables

Create a `.env` file in the root directory:

```env
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-1.5-flash

```

### 3. Run Locally

```bash
vercel dev

```

Open `http://localhost:3000` in your web browser.

---

## 👥 Hackathon Team

* **Maria Aqdas** – Team Leader, Product, UI Design, Full-Stack & AI Engineering, Deployment


* **Khadijha Aqdas** – Urdu Review, RTL Layouts & Linguistic Verification


* **Aleesh Nadeem** – Testing, Device QA & Cross-Browser Validation


* **Saqib T.** – Domain Research, WHO Standards Verification & Feedback Collection



---

*CityAir provides general environmental awareness and is not intended as medical advice.*
