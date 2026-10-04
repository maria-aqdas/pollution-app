<div align="center">

# 🌿 CityAir (شہر کی ہوا)
### Actionable, Multilingual Environmental Intelligence Powered by GenAI

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Vercel-black?style=for-the-badge&logo=vercel)](https://pollution-app.vercel.app/#f)
[![GitHub Repository](https://img.shields.io/badge/GitHub-Repository-181717?style=for-the-badge&logo=github)](https://github.com/maria-aqdas/pollution-app)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)](LICENSE)

<p align="center">
  <b>A zero-friction, bilingual platform translating complex environmental telemetry into plain-language health directives across seven dimensions of pollution.</b>
</p>

[Live Application](https://pollution-app.vercel.app/#f) • [Product Requirements Document (PRD)](https://docs.google.com/document/d/1Fl8p9LQn1b3FUqtc_H4ZBG23TfjmexzP/edit?usp=sharing&ouid=108518944868378548595&rtpof=true&sd=true) • [Presentation Deck](https://docs.google.com/presentation/d/1URjemid9xjdeXjlEVxOcgmQpRFfHWSGB/edit?usp=sharing&ouid=108518944868378548595&rtpof=true&sd=true) • [Video Demo](https://github.com/maria-aqdas/pollution-app)

</div>

---

## 🧭 Executive Overview

Most environmental portals isolate **air quality** into technical indices ($\text{AQI}$, $\text{PM}_{2.5}$, $\mu\text{g/m}^3$) that everyday citizens cannot readily translate into safe daily routines. Furthermore, they exclude adjacent urban stressors—water, thermal, land, noise, light, and radiation—and lack native regional language accessibility.

**CityAir** bridges this gap for seasonal smog-impacted regions and global cities alike. It provides a full environmental audit in under **10 seconds**, complete with native **Urdu** (Nastaliq right-to-left) parity, health alerts, outdoor safety windows, 5-year outlooks, and multi-city comparisons.

---

## ✨ Key Capabilities

### 1. 7-Dimensional Pollution Auditing
Evaluates seven critical environmental dimensions per city search:
* 💨 **Air Pollution:** Live sensor measurements via Open-Meteo.
* 💧 **Water Quality:** Regional baseline and environmental AI modeling.
* 🌡️ **Thermal Stress:** Live temperature and feels-like indexes with dynamic heat floors.
* 🏞️ **Land Contamination:** Urban density and solid waste impact assessments.
* 🔊 **Noise Pollution:** Traffic corridors and industrial zone proxies[cite: 1].
* 💡 **Light Pollution:** Urban skyglow and nocturnal disturbance analysis[cite: 1].
* ☢️ **Radiation:** Safe ambient monitoring (strictly bounded to normal ambient thresholds unless verified nuclear coordinates apply)[cite: 1].

### 2. Actionable Health Intelligence
* **Cigarette Equivalence:** Translates $\text{PM}_{2.5}$ exposure into a daily cigarette equivalent ($\text{PM}_{2.5} / 22$)[cite: 1].
* **WHO Guideline Benchmarking:** Direct comparative percentage against WHO 2021 air quality limits ($\text{PM}_{2.5}$, $\text{PM}_{10}$, $\text{NO}_2$, $\text{O}_3$, $\text{SO}_2$, $\text{CO}$)[cite: 1].
* **Diurnal Safety Windows:** Recommends optimal and hazardous 2-hour outdoor windows over the next 24 hours[cite: 1].
* **Targeted Health Directives:** Dynamic condition alerts (e.g., *“Boil tap water”*, *“Wear an N95 respirator”*, *“Avoid strenuous outdoor exercise”*)[cite: 1].

### 3. Localization & Regional Accessibility
* Full toggle between **English** and **Urdu (اردو)** with responsive RTL support and Nastaliq-optimized typography[cite: 1].
* Curated **Pakistan Live Ranking** covering 12 national hubs with one-tap deep navigation[cite: 1].
* Zero barrier to entry: **No user registration, no telemetry tracking, and zero installation footprints**[cite: 1].

---

## 📊 Scoring Methodology & System Rules

CityAir maintains an architecture separating measured telemetry from generative estimations[cite: 1]:

| Metric | Source / Rule Engine | Weight / Bounds |
| :--- | :--- | :--- |
| **Air Score** | $\min(100, \text{round}(\text{AQI} / 3))$ derived directly from Open-Meteo sensor data[cite: 1] | 30%[cite: 1] |
| **Water Score** | Gemini AI contextual regional estimation[cite: 1] | 20%[cite: 1] |
| **Thermal Score** | Live weather; clamped with a heat-floor rule ($\ge 40$ at $30^\circ\text{C}$, $\ge 80$ at $45^\circ\text{C}$)[cite: 1] | 12%[cite: 1] |
| **Land Score** | Gemini AI contextual regional estimation[cite: 1] | 12%[cite: 1] |
| **Noise Score** | Gemini AI contextual regional estimation[cite: 1] | 12%[cite: 1] |
| **Radiation** | Clamped to $1\text{--}5 / 100$ under baseline safety rules[cite: 1] | 8%[cite: 1] |
| **Light Score** | Gemini AI contextual regional estimation[cite: 1] | 6%[cite: 1] |
| **Composite Score** | **Weighted Server-Side Calculation** ($0\text{--}100$)[cite: 1] | **$100\%$ Total**[cite: 1] |

> **Audit Status Bands:**  
> 🟢 **Good:** 0–24 | 🟡 **Moderate:** 25–49 | 🟠 **Unhealthy:** 50–74 | 🔴 **Hazardous:** 75–100[cite: 1]

---

## 🏗️ System Architecture

```text
┌─────────────────┐       ┌──────────────────────┐       ┌────────────────────────┐
│  Client Device  │ <───> │  Vercel Serverless   │ <───> │   Open-Meteo APIs      │
│ (Desktop/Mobile)│       │      Functions       │       │ (Geocoding/Air/Weather)│
│  HTML5/Chart.js │       │   /api/city, /rank   │       └────────────────────────┘
└─────────────────┘       └──────────┬───────────┘
                                     │
                                     ▼
                          ┌──────────────────────┐
                          │   Google Gemini API  │
                          │(Structured Reasoning)│
                          └──────────────────────┘
