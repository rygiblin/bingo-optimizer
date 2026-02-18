// Simple Express proxy to Anthropic — keep API key server-side
const express = require('express');
const rateLimit = require('express-rate-limit');
const cors = require('cors');
const fetch = require('node-fetch'); // node-fetch@2
require('dotenv').config();

const app = express();
app.use(express.json());

// Restrict to your front-end origin in production
// Default to Vite dev server origin (5173) to allow local development
const ORIGIN = process.env.ALLOWED_ORIGIN || 'http://localhost:5173';
console.log('Enrich proxy ALLOWED_ORIGIN:', ORIGIN);
app.use(cors({ origin: ORIGIN }));

// Basic rate limit
app.use(rateLimit({ windowMs: 60_000, max: 60 }));

const API_KEY = process.env.ANTHROPIC_API_KEY;
if (!API_KEY) console.warn('ANTHROPIC_API_KEY not set in server environment');

function buildPrompt(tileName, tileNotes, tileCategory, task) {
  return `You are an Old School RuneScape assistant. Return a JSON object only with fields:
{"estHours":number,"dropRate":number,"kcPerHour":number,"dropsNeeded":number,"confidence":"low|medium|high","wikiNotes":"string"}
Tile: ${tileName}
Notes: ${tileNotes||''}
Category: ${tileCategory||''}
Task: ${JSON.stringify(task)}
Respond with JSON only.`;
}

app.post('/api/enrich', async (req, res) => {
  try {
    const { tileName, tileNotes, tileCategory, task } = req.body;
    if (!tileName || !task) return res.status(400).json({ error: 'tileName and task required' });

    const prompt = buildPrompt(tileName, tileNotes, tileCategory, task);

    // Add a fetch timeout using AbortController to avoid hanging requests
    const controller = new AbortController();
    const timeoutMs = Number(process.env.UPSTREAM_TIMEOUT_MS || 15000);
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, timeoutMs);

    let r;
    try {
      r = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': API_KEY,
          'Anthropic-Version': process.env.ANTHROPIC_API_VERSION || '2023-06-01'
        },
        body: JSON.stringify({
          model: process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5-20251001',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 500
        }),
        signal: controller.signal
      });
    } catch (err) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        console.error('Upstream request timed out after', timeoutMs, 'ms');
        return res.status(504).json({ ok: false, error: 'Upstream timeout' });
      }
      console.error('Fetch failed:', err);
      return res.status(502).json({ ok: false, error: 'Upstream fetch failed', detail: String(err) });
    }
    clearTimeout(timeoutId);

    if (!r.ok) {
      const txt = await r.text().catch(() => '');
      console.error('Anthropic error:', r.status, txt);
      return res.status(502).json({ error: 'Upstream error', detail: txt });
    }

    const j = await r.json().catch(() => ({}));
    const raw = (j.content && j.content[0] && j.content[0].text) || JSON.stringify(j);
    let output = null;
    try {
      const m = String(raw).match(/\{[\s\S]*\}/);
      if (m) output = JSON.parse(m[0]);
    } catch (err) {
      console.warn('Failed to parse assistant JSON:', err);
    }

    return res.json({ ok: true, result: output || j });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Enrich proxy listening on http://localhost:${PORT}`));