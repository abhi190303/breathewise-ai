# BreatheWise AI

An air quality assistant prototype for Hack2Skill Challenge 6: Urban Air Quality Assistant. It combines an at-a-glance AQI dashboard with pollutant levels, personal exposure guidance, a 24-hour forecast, city comparison, configurable threshold preference, and a grounded question-and-answer assistant.

## Run locally

1. Install Node.js 20.12 or newer.
2. In this folder, copy `.env.example` to `.env` (optional for AI). For Groq, add your GroqCloud key to `GROQ_API_KEY`; for xAI Grok, use `GROK_API_KEY`; for Gemini, use `GEMINI_API_KEY`.
3. Start the app with `npm start`.
4. Open `http://localhost:3000`.

Without a provider key, the assistant uses its built-in rule-based fallback. Live air quality and weather are fetched from Open-Meteo in the browser. If those requests are unavailable, the dashboard clearly labels its sample values as demo data. No API key is needed for Open-Meteo. Groq and xAI requests are made server-side; account subscriptions are separate from API access.

## Features

- Current US AQI, six pollutants, and current weather for Bengaluru by default
- City selection and optional browser geolocation
- Profile-aware exposure guidance for six user groups
- Hourly AQI forecast visualization and city comparison
- Threshold preference saved locally in the browser
- Grounded Gemini server proxy with input limits and local fallback
- Responsive layout and medical guidance disclaimer

## Publish for judges

The included Node server can run on a Node hosting service. For a static host such as GitHub Pages, the dashboard still works, but the optional Gemini endpoint requires a server host; do not put your Gemini key in frontend code. Add the API key as a server environment variable in your hosting provider.

Before submitting, confirm the event's current instructions. The provided reference mentions a public GitHub repository, one branch, a repository below 1 MB, and up to four submission attempts. Check the current event portal for the correct submission tab and live demo URL requirements.

## Data notes

Open-Meteo data is model-based and can differ from local regulatory monitors. The displayed pollutant levels are reported by the API; carbon monoxide is converted from μg/m³ to mg/m³ internally but displayed in the common pollutant grid as a numeric value. AQI and forecasts are estimates and not medical advice. The prototype does not claim to identify the cause of a reading.
