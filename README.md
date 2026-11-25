# BreatheWise AI

An Urban Air Quality Assistant for Hack2Skill Challenge 6. It turns air-quality readings into practical, profile-aware guidance and a simple plan for the day.

## Features

- Current US AQI, six pollutants, and weather for Bengaluru by default
- City selection, optional geolocation, and a 24-hour AQI forecast
- Profile-aware exposure guidance, a city comparison, and locally saved AQI alert thresholds
- Groq-powered assistant with deterministic local fallback when the API is unavailable
- Clear demo-data labeling and a non-medical-advice notice
- Small Node HTTP server with request validation, server-side API keys, and a public-file allowlist

## Run locally

Requires Node.js 20.12 or newer.

1. Copy `.env.example` to `.env`.
2. For Groq, put your key in `GROQ_API_KEY`. The default model is `openai/gpt-oss-120b`.
3. Run `npm start` and open `http://localhost:3000`.

The dashboard works without an AI key. Open-Meteo supplies the air-quality and weather data; when those requests fail, the page clearly labels the displayed sample values as demo data.

## Tests

Run `npm test` for AQI band, accessibility-markup, static-file exposure, and assistant-input/configuration checks. The suite uses Node's built-in test runner and requires no extra dependencies.

## Deploy

Deploy this as a Node web service, not as a static-only site, if you want the hosted assistant to reach the server endpoint. Use `npm start` as the start command and set `GROQ_API_KEY` in the hosting provider's private environment settings. Never commit `.env` or `grok_api.env`.

## Data notes

Open-Meteo readings and forecasts are model-based and may differ from local regulatory monitors. The app offers general environmental guidance; it does not identify specific pollution sources or diagnose medical conditions.
