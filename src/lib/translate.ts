// Server-side English → Hindi translation via the free MyMemory API.
// No API key required. Set MYMEMORY_EMAIL in the environment to raise the
// anonymous daily quota (5k → ~50k words/day). Results are meant to be cached
// (stored in Product.nameHi) so billing never calls this at request time.

const ENDPOINT = "https://api.mymemory.translated.net/get";

export async function translateToHindi(text: string): Promise<string | null> {
  const q = text.trim();
  if (!q) return null;

  try {
    const url = new URL(ENDPOINT);
    url.searchParams.set("q", q);
    url.searchParams.set("langpair", "en|hi");
    const email = process.env.MYMEMORY_EMAIL;
    if (email) url.searchParams.set("de", email);

    const res = await fetch(url, {
      signal: AbortSignal.timeout(8000),
      headers: { "User-Agent": "grocery-billing" },
    });
    if (!res.ok) return null;

    const data = (await res.json()) as {
      responseStatus?: number | string;
      responseData?: { translatedText?: string };
    };

    // MyMemory returns 200 on success; quota/errors come back as other codes
    // (often with a warning string in translatedText we must not store).
    if (Number(data.responseStatus) !== 200) return null;

    const out = data.responseData?.translatedText?.trim();
    if (!out) return null;

    // Guard against the API echoing the input or returning ASCII-only text
    // (i.e. no Devanagari) — treat that as "no useful translation".
    const hasDevanagari = /[\u0900-\u097F]/.test(out);
    if (!hasDevanagari) return null;

    return out;
  } catch {
    return null;
  }
}

// Translate several names, one after another, so we stay within rate limits.
// Returns a map of input → Hindi (only successful translations included).
export async function translateManyToHindi(
  texts: string[]
): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  const unique = Array.from(new Set(texts.map((t) => t.trim()).filter(Boolean)));
  for (const t of unique) {
    const hi = await translateToHindi(t);
    if (hi) result.set(t, hi);
  }
  return result;
}
