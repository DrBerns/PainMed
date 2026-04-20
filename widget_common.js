// widget_common.js — shared helpers for SpineMed clinical documentation widgets
// Calls route through the SpineMed Cloudflare Worker, which holds the
// Anthropic API key server-side. Worker secret matches the rest of the
// dashboard; CORS on the Worker is locked to drberns.github.io.
(function () {
  const WORKER_URL    = 'https://spinemed-anthropic-proxy.drberns.workers.dev';
  const WORKER_SECRET = 'SpineMed2026';
  const MODEL         = 'claude-sonnet-4-6';

  async function callAnthropic({ system, user, max_tokens = 1500, temperature = 0.7 }) {
    const res = await fetch(WORKER_URL + '/anthropic', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-secret': WORKER_SECRET
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens,
        temperature,
        system,
        messages: [{ role: 'user', content: user }]
      })
    });

    if (!res.ok) {
      let detail = '';
      try {
        const body = await res.json();
        detail = body?.error?.message || body?.error || JSON.stringify(body);
      } catch { detail = await res.text().catch(() => ''); }
      throw new Error(`API ${res.status} ${res.statusText}${detail ? ' — ' + detail : ''}`);
    }

    const data = await res.json();
    const parts = (data?.content || []).filter(p => p.type === 'text').map(p => p.text);
    return parts.join('').trim();
  }

  // Parse a JSON object out of an LLM response, tolerating surrounding prose/fences.
  function extractJson(text) {
    if (!text) return null;
    let s = text.trim();
    s = s.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '');
    const first = s.indexOf('{');
    const last = s.lastIndexOf('}');
    if (first === -1 || last === -1 || last < first) return null;
    try { return JSON.parse(s.slice(first, last + 1)); } catch { return null; }
  }

  window.callAnthropic = callAnthropic;
  window.extractJson = extractJson;
})();
