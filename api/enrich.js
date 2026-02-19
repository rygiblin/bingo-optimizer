// Vercel serverless function — POST /api/enrich
// Keeps ANTHROPIC_API_KEY server-side so it's never exposed to the browser.
// Receives: { tileName, tileNotes, tileCategory, task }
// Returns:  { ok: true, result: { estHours, dropRate, kcPerHour, dropsNeeded, confidence, wikiNotes } }

// Detailed prompt mirrors the one in App.jsx — more accurate than a generic OSRS prompt.
// Uses OR-logic for combined drop rates, team scaling, and KC math rules.
function buildPrompt(tileName, tileNotes, tileCategory, task) {
  return `You are an Old School RuneScape expert. Given this bingo tile task, provide accurate time estimates based on OSRS wiki data.

Tile: "${tileName}" (${tileCategory}) - ${tileNotes}
Task: "${task.desc}" (type: ${task.type}) - ${task.notes || ''}
Current estimate: ${task.estHours}h

CRITICAL RULES for calculating estHours:
1. OR logic: If the task lists multiple items separated by "/" or "or" (e.g. "Ancy/TBOW", "BCP or tassets"), use the COMBINED drop rate (sum of individual rates), NOT the rate of the rarest item alone. Getting any one of the listed items completes the task.
2. CoX purples: The unique chest rate is roughly 1/9 per raid at standard team points. The unique table has ~50 items. Mega-rares (TBOW, Kodai, Ancestral pieces) share a small weight. "Ancy/TBOW" means either Ancestral OR Twisted Bow - use combined mega-rare weight (~1/34 of unique rolls = roughly 1/300 per raid at team scale, ~75h at 4 raids/hr).
3. Team scale: Assume a competent 5-man team for raids, not solo. KC/hr should reflect team play.
4. Multiple drops needed: If the task requires N of something, multiply expected hours by N.
5. KC tasks: estHours = kills_required / kcPerHour (deterministic, no RNG multiplier).

Respond ONLY with a JSON object, no markdown, no explanation:
{
  "estHours": <number: expected wall-clock hours at base efficiency before team scaling. Apply OR-logic combined rates where applicable>,
  "dropRate": <number or null: combined drop rate as decimal if OR logic applies, else individual rate. e.g. 0.003 for ~1/300>,
  "kcPerHour": <number or null: kills or completions per hour for a competent team>,
  "dropsNeeded": <number or null: how many drops required>,
  "confidence": <"high"|"medium"|"low">,
  "wikiNotes": <string: note the calculation used, e.g. "Combined Ancy+TBOW mega-rare rate ~1/300 at team scale". Max 80 chars>
}`;
}

export default async function handler(req, res) {
  // Only accept POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { tileName, tileNotes, tileCategory, task } = req.body;
  if (!tileName || !task) {
    return res.status(400).json({ error: 'tileName and task required' });
  }

  // API key must be set as an environment variable in Vercel dashboard
  const API_KEY = process.env.ANTHROPIC_API_KEY;
  if (!API_KEY) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' });
  }

  const prompt = buildPrompt(tileName, tileNotes, tileCategory, task);

  // Abort the upstream call if it takes longer than 15 seconds
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        // haiku is fast and cheap — good fit for structured JSON extraction
        model: process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5-20251001',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 500,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!r.ok) {
      const txt = await r.text().catch(() => '');
      console.error('Anthropic error:', r.status, txt);
      return res.status(502).json({ error: 'Upstream error', detail: txt });
    }

    const j = await r.json().catch(() => ({}));
    const raw = j.content?.[0]?.text || JSON.stringify(j);

    // Parse the JSON block out of the model response
    let output = null;
    try {
      const m = String(raw).match(/\{[\s\S]*\}/);
      if (m) output = JSON.parse(m[0]);
    } catch {
      console.warn('Failed to parse model JSON response');
    }

    return res.json({ ok: true, result: output || j });
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      return res.status(504).json({ ok: false, error: 'Upstream timeout after 15s' });
    }
    console.error('Handler error:', err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}
