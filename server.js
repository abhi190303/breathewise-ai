import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
try { process.loadEnvFile(path.join(root, '.env')); }
catch (error) { if (error.code !== 'ENOENT') throw error; }
const port = Number(process.env.PORT) || 3000;
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8' };

function send(res, status, body, type = 'application/json; charset=utf-8') {
  res.writeHead(status, { 'content-type': type, 'x-content-type-options': 'nosniff', 'x-frame-options': 'DENY', 'referrer-policy': 'strict-origin-when-cross-origin' });
  if (Buffer.isBuffer(body)) return res.end(body);
  res.end(typeof body === 'string' ? body : JSON.stringify(body));
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  if (req.method === 'POST' && url.pathname === '/api/assistant') {
    try {
      let raw = '';
      for await (const chunk of req) { raw += chunk; if (raw.length > 8000) return send(res, 413, { error: 'Request is too large.' }); }
      const { question, context } = JSON.parse(raw || '{}');
      if (typeof question !== 'string' || question.trim().length < 2 || question.length > 500) return send(res, 400, { error: 'Enter a question under 500 characters.' });
      // Accept the correct Groq variable and autodetect old misnamed gsk_ keys.
      const groqKey = process.env.GROQ_API_KEY || (process.env.GROK_API_KEY?.startsWith('gsk_') ? process.env.GROK_API_KEY : undefined);
      const grokKey = process.env.GROK_API_KEY && !process.env.GROK_API_KEY.startsWith('gsk_') ? process.env.GROK_API_KEY : undefined;
      const geminiKey = process.env.GEMINI_API_KEY;
      if (!groqKey && !grokKey && !geminiKey) return send(res, 503, { error: 'Set GROQ_API_KEY, GROK_API_KEY, or GEMINI_API_KEY in .env, then restart the server.' });
      const safeContext = {
        city: String(context?.city || 'Unknown').slice(0, 80),
        aqi: Number(context?.aqi), category: String(context?.category || '').slice(0, 50),
        pm25: Number(context?.pm25), pm10: Number(context?.pm10), profile: String(context?.profile || 'General adult').slice(0, 50)
      };
      const instructions = 'You are BreatheWise, an air quality information assistant. Answer in 2-4 concise sentences, ground claims in supplied context, do not invent measurements or diagnose. If asked for unsupported specifics, say what the data cannot tell us. This is general environmental guidance, not medical advice.';
      const prompt = `Air quality context: ${JSON.stringify(safeContext)}\nUser question: ${question.trim()}`;
      let upstream, answer;
      if (groqKey) {
        upstream = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${groqKey}` },
          body: JSON.stringify({ model: process.env.GROQ_MODEL || 'openai/gpt-oss-120b', messages: [{ role: 'system', content: instructions }, { role: 'user', content: prompt }], max_completion_tokens: 240, temperature: 0.3 }),
          signal: AbortSignal.timeout(20000)
        });
        if (upstream.ok) {
          const data = await upstream.json();
          answer = data.choices?.[0]?.message?.content?.trim();
        }
      } else if (grokKey) {
        upstream = await fetch('https://api.x.ai/v1/responses', {
          method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${grokKey}` },
          body: JSON.stringify({ model: process.env.GROK_MODEL || 'grok-4.7', instructions, input: prompt, max_output_tokens: 240, store: false }),
          signal: AbortSignal.timeout(20000)
        });
        if (upstream.ok) {
          const data = await upstream.json();
          answer = (data.output || []).filter(item => item.type === 'message').flatMap(item => item.content || []).filter(part => part.type === 'output_text').map(part => part.text || '').join('').trim();
        }
      } else {
        upstream = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent', {
          method: 'POST', headers: { 'content-type': 'application/json', 'x-goog-api-key': geminiKey }, body: JSON.stringify({ systemInstruction: { parts: [{ text: instructions }] }, contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.3, maxOutputTokens: 220 } }), signal: AbortSignal.timeout(20000)
        });
        if (upstream.ok) {
          const data = await upstream.json();
          answer = data.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('').trim();
        }
      }
      if (!upstream.ok) {
        let detail = `AI provider returned HTTP ${upstream.status}.`;
        try { const providerError = await upstream.json(); const message = providerError.error?.message || providerError.error || providerError.message; if (message) detail += ` ${String(message).slice(0, 240)}`; } catch {}
        return send(res, 502, { error: detail });
      }
      if (!answer) return send(res, 502, { error: 'AI service returned no answer.' });
      return send(res, 200, { answer, provider: groqKey ? 'Groq' : grokKey ? 'Grok' : 'Gemini' });
    } catch { return send(res, 400, { error: 'Could not process that request.' }); }
  }
  if (req.method !== 'GET') return send(res, 405, { error: 'Method not allowed.' });
  const requested = url.pathname === '/' ? '/index.html' : decodeURIComponent(url.pathname);
  const file = path.resolve(root, `.${requested}`);
  if (!file.startsWith(root + path.sep)) return send(res, 403, { error: 'Forbidden.' });
  try { const data = await fs.readFile(file); send(res, 200, data, mime[path.extname(file)] || 'application/octet-stream'); }
  catch { send(res, 404, 'Not found', 'text/plain; charset=utf-8'); }
});

server.listen(port, () => console.log(`BreatheWise AI running at http://localhost:${port}`));
