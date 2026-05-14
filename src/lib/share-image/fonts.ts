/**
 * Google Fonts loader for next/og ImageResponse.
 *
 * Satori requires actual font binaries (passed as ArrayBuffer) — there's no
 * @font-face / web-font lookup at render time. We hit the Google Fonts CSS
 * endpoint, extract the first .woff2 URL, fetch it, and cache the bytes at
 * module scope so warm function instances reuse them.
 */

const FONT_CACHE = new Map<string, ArrayBuffer>();
const FONT_INFLIGHT = new Map<string, Promise<ArrayBuffer>>();

async function fetchFont(
  family: string,
  weight: number,
  italic: boolean,
): Promise<ArrayBuffer> {
  const familyParam = encodeURIComponent(family);
  const styleParam = italic ? `${weight}italic` : `${weight}`;
  // css1 endpoint with NO User-Agent header — Google's default response is
  // TTF URLs (vs woff2 for modern browsers). Satori needs TTF.
  const cssUrl = `https://fonts.googleapis.com/css?family=${familyParam}:${styleParam}`;

  const cssRes = await fetch(cssUrl);
  if (!cssRes.ok) {
    throw new Error(`Google Fonts CSS fetch failed: ${cssRes.status}`);
  }
  const css = await cssRes.text();
  const m = css.match(/url\((https:\/\/[^)]+\.ttf)\)/);
  if (!m) {
    throw new Error(
      `No TTF URL in CSS for ${family} ${weight}${italic ? " italic" : ""} — got: ${css.slice(0, 200)}`,
    );
  }
  const fontRes = await fetch(m[1]);
  if (!fontRes.ok) {
    throw new Error(`Font file fetch failed: ${fontRes.status}`);
  }
  return fontRes.arrayBuffer();
}

export async function loadFont(
  family: string,
  weight: number,
  italic = false,
): Promise<ArrayBuffer> {
  const key = `${family}|${weight}|${italic}`;
  const cached = FONT_CACHE.get(key);
  if (cached) return cached;
  const inflight = FONT_INFLIGHT.get(key);
  if (inflight) return inflight;
  const p = fetchFont(family, weight, italic)
    .then((buf) => {
      FONT_CACHE.set(key, buf);
      FONT_INFLIGHT.delete(key);
      return buf;
    })
    .catch((e) => {
      FONT_INFLIGHT.delete(key);
      throw e;
    });
  FONT_INFLIGHT.set(key, p);
  return p;
}

export interface SatoriFont {
  name: string;
  data: ArrayBuffer;
  weight: 400 | 700 | 900;
  style: "normal" | "italic";
}

/**
 * Load a set of fonts in parallel. Returns the shape ImageResponse expects.
 */
export async function loadFonts(
  specs: Array<{
    family: string;
    weight: 400 | 700 | 900;
    italic?: boolean;
    /** What to call this font in CSS (defaults to family). */
    as?: string;
  }>,
): Promise<SatoriFont[]> {
  const fonts = await Promise.all(
    specs.map(async (s) => {
      const data = await loadFont(s.family, s.weight, s.italic ?? false);
      return {
        name: s.as ?? s.family,
        data,
        weight: s.weight,
        style: (s.italic ? "italic" : "normal") as "normal" | "italic",
      };
    }),
  );
  return fonts;
}
