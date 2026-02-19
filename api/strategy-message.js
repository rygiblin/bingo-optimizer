// Vercel serverless function — POST /api/strategy-message
// Generates a Discord-ready strategy directive from structured planner data.
const MODEL = process.env.ANTHROPIC_STRATEGY_MODEL || 'claude-haiku-4-5-20251001';
const REQUEST_COOLDOWN_MS = 90 * 1000; // simple spend guard
const REQUEST_TIMEOUT_MS = 12000;
const MAX_TOKENS = 420;
const MAX_BRIEF_CHARS = 12000;

const LAST_CALL_BY_IP = new Map();

function clampStyle(style) {
  return style === 'motivational' || style === 'concise' ? style : 'direct';
}
function clampLength(length) {
  return length === 'short' || length === 'long' ? length : 'medium';
}
function trimBrief(brief) {
  const safe = {
    meta: brief?.meta || {},
    teamFocus: (brief?.teamFocus || []).slice(0, 8),
    roleFocus: brief?.roleFocus || {},
    avoidNow: (brief?.avoidNow || []).slice(0, 6),
    risks: (brief?.risks || []).slice(0, 6),
    opportunities: (brief?.opportunities || []).slice(0, 6),
  };
  const s = JSON.stringify(safe);
  if (s.length <= MAX_BRIEF_CHARS) return safe;
  // Fallback truncation if input still too large
  return {
    ...safe,
    teamFocus: safe.teamFocus.slice(0, 5),
    avoidNow: safe.avoidNow.slice(0, 3),
    risks: safe.risks.slice(0, 3),
    opportunities: safe.opportunities.slice(0, 3),
  };
}

function buildPrompt({ teamName, brief, style, length, includePerPlayer }) {
  const briefJson = JSON.stringify(trimBrief(brief));
  return `You are generating an OSRS bingo team strategy update for Discord.

Team: ${teamName || 'Team'}
Tone: ${style}
Length target: ${length}
Include per-player section: ${includePerPlayer ? 'yes' : 'no'}

STRICT RULES:
1) Use ONLY facts provided in the structured brief JSON.
2) Do NOT invent tasks, rates, drop odds, or priorities.
3) Explain "why" for recommendations based on provided rationale/tags.
4) Keep message actionable for the next 4-6 hours.
5) If data is uncertain/sparse, say so explicitly.

Return ONLY valid JSON:
{
  "headline": "string",
  "message": "discord-ready string",
  "bullets": ["string","string","string"],
  "confidenceNote": "string"
}

Structured brief JSON:
${briefJson}`;
}

function fallbackMessage(teamName, brief) {
  const focus = (brief?.teamFocus || []).slice(0, 3);
  const lines = focus.map((x, i) =>
    `${i + 1}) #${x.tileId} ${x.tileName} — ${Math.round(x.estHours || 0)}h (${x.targetLabel || x.actionType || 'focus'})`
  );
  return {
    headline: `Next ${Math.round(brief?.meta?.windowHours || 6)}h focus for ${teamName || 'team'}`,
    message:
      `**Strategy Snapshot**\n` +
      `Time remaining: ${Math.round(brief?.meta?.hoursRemaining || 0)}h\n\n` +
      `**Top focus**\n` +
      `${lines.join('\n') || '- No strong focus candidates from current data.'}\n`,
    bullets: focus.map(x => `${x.tileName}: ${x.rationale?.[0] || 'Best available value in current window'}`).slice(0, 3),
    confidenceNote: 'Fallback summary used (model unavailable).'
  };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const API_KEY = process.env.ANTHROPIC_API_KEY;
  if (!API_KEY) return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' });

  const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown';
  const now = Date.now();
  const last = LAST_CALL_BY_IP.get(ip) || 0;
  if (now - last < REQUEST_COOLDOWN_MS) {
    return res.status(429).json({ error: `Please wait ${Math.ceil((REQUEST_COOLDOWN_MS - (now - last)) / 1000)}s before generating again.` });
  }
  LAST_CALL_BY_IP.set(ip, now);

  const { brief, style, length, includePerPlayer, teamName } = req.body || {};
  if (!brief?.meta || !Array.isArray(brief?.teamFocus)) {
    return res.status(400).json({ error: 'Invalid brief payload' });
  }

  const prompt = buildPrompt({
    teamName,
    brief,
    style: clampStyle(style),
    length: clampLength(length),
    includePerPlayer: !!includePerPlayer
  });

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

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
        max_tokens: MAX_TOKENS,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!r.ok) {
      const txt = await r.text().catch(() => '');
      console.error('Strategy message upstream error:', r.status, txt);
      return res.json({ ok: true, result: fallbackMessage(teamName, brief), fallback: true });
    }

    const j = await r.json().catch(() => ({}));
    const raw = j.content?.[0]?.text || '';
    let output = null;
    try {
      const m = String(raw).match(/\{[\s\S]*\}/);
      if (m) output = JSON.parse(m[0]);
    } catch {
      output = null;
    }
    if (!output?.headline || !output?.message || !Array.isArray(output?.bullets)) {
      return res.json({ ok: true, result: fallbackMessage(teamName, brief), fallback: true });
    }
    return res.json({ ok: true, result: output, fallback: false });
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      return res.json({ ok: true, result: fallbackMessage(teamName, brief), fallback: true, timeout: true });
    }
    console.error('Strategy handler error:', err);
    return res.json({ ok: true, result: fallbackMessage(teamName, brief), fallback: true });
  }
}
