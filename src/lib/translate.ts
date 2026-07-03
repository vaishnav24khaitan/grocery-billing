// Server-side English → Hindi name resolution for grocery products.
//
// Indian grocery names are a mix of real English words ("Sugar", "Wheat
// Flour"), Hinglish words already Hindi at heart ("Toor Dal", "Paneer"),
// and brand names ("Maggi", "Parle-G"). Plain machine translation fails on
// the latter two (it returns the English text unchanged). So we use a hybrid:
//
//   1. A curated grocery dictionary → proper Hindi for common words.
//   2. Google transliteration (phonetic) fallback → always yields Devanagari
//      for anything not in the dictionary (Hinglish terms and brands included).
//
// Results are cached on Product.nameHi, so this never runs at billing time.

// --- 1. Curated grocery dictionary (lowercase keys, alphanumeric only) ---
const GROCERY_HI: Record<string, string> = {
  // grains & flours
  rice: "चावल",
  basmati: "बासमती",
  wheat: "गेहूँ",
  flour: "आटा",
  atta: "आटा",
  maida: "मैदा",
  sooji: "सूजी",
  suji: "सूजी",
  rava: "रवा",
  besan: "बेसन",
  poha: "पोहा",
  daliya: "दलिया",
  dalia: "दलिया",
  oats: "ओट्स",
  // pulses / dals
  dal: "दाल",
  daal: "दाल",
  toor: "तूर",
  tur: "तूर",
  arhar: "अरहर",
  moong: "मूंग",
  mung: "मूंग",
  masoor: "मसूर",
  chana: "चना",
  channa: "चना",
  urad: "उड़द",
  rajma: "राजमा",
  lobia: "लोबिया",
  // dairy
  milk: "दूध",
  ghee: "घी",
  butter: "मक्खन",
  paneer: "पनीर",
  curd: "दही",
  dahi: "दही",
  cheese: "चीज़",
  cream: "क्रीम",
  // sweeteners / basics
  sugar: "चीनी",
  jaggery: "गुड़",
  gud: "गुड़",
  gur: "गुड़",
  honey: "शहद",
  salt: "नमक",
  oil: "तेल",
  water: "पानी",
  // spices
  turmeric: "हल्दी",
  haldi: "हल्दी",
  chilli: "मिर्च",
  chili: "मिर्च",
  mirch: "मिर्च",
  red: "लाल",
  coriander: "धनिया",
  dhania: "धनिया",
  cumin: "जीरा",
  jeera: "जीरा",
  mustard: "सरसों",
  sarso: "सरसों",
  garam: "गरम",
  masala: "मसाला",
  pepper: "काली मिर्च",
  ginger: "अदरक",
  garlic: "लहसुन",
  cardamom: "इलायची",
  elaichi: "इलायची",
  clove: "लौंग",
  cloves: "लौंग",
  cinnamon: "दालचीनी",
  // vegetables & fruits
  onion: "प्याज़",
  potato: "आलू",
  tomato: "टमाटर",
  banana: "केला",
  apple: "सेब",
  lemon: "नींबू",
  // beverages
  tea: "चाय",
  chai: "चाय",
  coffee: "कॉफ़ी",
  // other staples
  egg: "अंडा",
  eggs: "अंडे",
  bread: "ब्रेड",
  biscuit: "बिस्किट",
  biscuits: "बिस्किट",
  namkeen: "नमकीन",
  // household
  soap: "साबुन",
  detergent: "डिटर्जेंट",
  shampoo: "शैम्पू",
  powder: "पाउडर",
  packet: "पैकेट",
  matchbox: "माचिस",
  // qualifiers
  fresh: "ताज़ा",
  whole: "साबुत",
  ground: "पिसा",
  green: "हरा",
  white: "सफ़ेद",
  black: "काला",
};

// --- 2. Google transliteration (phonetic English → Devanagari) ---
async function transliterate(text: string): Promise<string | null> {
  const q = text.trim();
  if (!q) return null;
  try {
    const url =
      "https://inputtools.google.com/request?" +
      `text=${encodeURIComponent(q)}` +
      "&itc=hi-t-i0-und&num=1&cp=0&cs=1&ie=utf-8&oe=utf-8";
    const res = await fetch(url, {
      signal: AbortSignal.timeout(8000),
      headers: { "User-Agent": "grocery-billing" },
    });
    if (!res.ok) return null;
    // Shape: ["SUCCESS", [[ "input", ["तूर दाल", ...], ... ]], ...]
    const data = (await res.json()) as [string, [[string, string[]]]];
    if (data?.[0] !== "SUCCESS") return null;
    const out = data?.[1]?.[0]?.[1]?.[0];
    if (typeof out === "string" && /[\u0900-\u097F]/.test(out)) return out;
    return null;
  } catch {
    return null;
  }
}

const norm = (w: string) => w.toLowerCase().replace(/[^a-z0-9]/g, "");
const hasDevanagari = (s: string) => /[\u0900-\u097F]/.test(s);

/**
 * Resolve a Hindi rendering of an English/Hinglish product name.
 * Word-by-word: dictionary first, then transliteration; unknown words that
 * even transliteration can't handle are kept as-is so the name stays complete.
 * Returns null only if nothing could be rendered in Devanagari at all.
 */
export async function translateToHindi(name: string): Promise<string | null> {
  const raw = name.trim();
  if (!raw) return null;

  // Already contains Hindi — leave it.
  if (hasDevanagari(raw)) return raw;

  const tokens = raw.split(/\s+/);
  const parts: string[] = [];
  let anyHindi = false;

  for (const tok of tokens) {
    const key = norm(tok);
    if (key && GROCERY_HI[key]) {
      parts.push(GROCERY_HI[key]);
      anyHindi = true;
      continue;
    }
    const tl = await transliterate(tok);
    if (tl) {
      parts.push(tl);
      anyHindi = true;
    } else {
      parts.push(tok); // keep original so the name isn't dropped
    }
  }

  const result = parts.join(" ").trim();
  return anyHindi && hasDevanagari(result) ? result : null;
}

// Translate several names sequentially (kept within API rate limits).
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
