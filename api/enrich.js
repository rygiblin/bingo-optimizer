// Vercel serverless function — POST /api/enrich
// Keeps ANTHROPIC_API_KEY server-side so it's never exposed to the browser.
// Receives: { tileName, tileNotes, tileCategory, task }
// Returns:  { ok: true, result: { estHours, dropRate, kcPerHour, dropsNeeded, confidence, wikiNotes } }

// Sonnet is used over Haiku here — OSRS drop rates and KC/hr values require
// specific wiki knowledge that smaller models get wrong frequently.
const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6';

function buildPrompt(tileName, tileNotes, tileCategory, task) {
  // Note: we deliberately do NOT pass the current estHours to avoid anchoring the model.
  // The model should derive the estimate purely from OSRS wiki data.
  return `You are an Old School RuneScape expert with accurate OSRS wiki knowledge.

Bingo tile: "${tileName}" (category: ${tileCategory}${tileNotes ? `, notes: ${tileNotes}` : ''})
Task: "${task.desc}"
Task type: ${task.type}${task.notes ? ` — ${task.notes}` : ''}

Calculate the expected wall-clock hours for a competent 5-man team to complete this task.

RULES BY TYPE:
- "drop": estHours = dropsNeeded / (dropRate × kcPerHour). For "A/B" or "A or B" tasks, use COMBINED drop rate (sum both rates — getting either one completes the task).
- "kc": estHours = killsRequired / kcPerHour. Deterministic, no RNG factor.
- "points": estimate from points/hr rate at the relevant activity.
- "challenge": estimate total hours including failures and learning curve for a competent team.

CoX mega-rares (TBOW, Kodai, Ancestral): ~1/300 per raid at 5-man team scale, ~4 raids/hr = ~75h expected.
ToB uniques: ~1/9 per raid. ToA: scales with raid level.
Assume wiki-accurate rates, not best-case.

Respond with ONLY this JSON object — no markdown, no explanation, no code fences:
{"estHours":<positive number>,"dropRate":<number or null>,"kcPerHour":<number or null>,"dropsNeeded":<integer or null>,"confidence":"high" or "medium" or "low","wikiNotes":"<brief calc note, max 80 chars>"}`;
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

  // Abort the upstream call if it takes longer than 20 seconds (Sonnet is slightly slower)
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20000);

  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 300,
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
    const raw = j.content?.[0]?.text || '';
    console.log('[enrich] model raw response:', raw);

    // Extract JSON block from response — handles cases where model adds extra text
    let output = null;
    try {
      const m = String(raw).match(/\{[\s\S]*\}/);
      if (m) output = JSON.parse(m[0]);
    } catch {
      console.warn('[enrich] Failed to parse model JSON:', raw);
    }

    // Validate estHours is usable before sending back — frontend relies on this being a positive number
    if (!output || typeof output.estHours !== 'number' || output.estHours <= 0) {
      console.error('[enrich] Invalid estHours in output:', output);
      return res.status(502).json({ ok: false, error: 'Model returned unusable estHours', raw });
    }

    return res.json({ ok: true, result: output });
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      return res.status(504).json({ ok: false, error: 'Upstream timeout after 20s' });
    }
    console.error('Handler error:', err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}
