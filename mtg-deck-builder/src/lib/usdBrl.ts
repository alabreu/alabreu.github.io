const STORAGE_KEY = 'usd-brl-rate';
const TTL_MS = 12 * 60 * 60 * 1000; // 12h

type CachedRate = { rate: number; ts: number };

function readCache(): CachedRate | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed?.rate === 'number' && typeof parsed?.ts === 'number') return parsed;
  } catch {
    /* corrupted cache */
  }
  return null;
}

/** USD→BRL rate from AwesomeAPI, cached for 12h (stale cache used as fallback). */
export async function getUsdBrlRate(): Promise<number | null> {
  const cached = readCache();
  if (cached && Date.now() - cached.ts < TTL_MS) return cached.rate;

  try {
    const res = await fetch('https://economia.awesomeapi.com.br/json/last/USD-BRL');
    if (res.ok) {
      const data = await res.json();
      const rate = parseFloat(data?.USDBRL?.bid);
      if (isFinite(rate) && rate > 0) {
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify({ rate, ts: Date.now() }));
        } catch {
          /* storage full */
        }
        return rate;
      }
    }
  } catch {
    /* offline — fall through to stale cache */
  }
  return cached?.rate ?? null;
}

export function formatBrl(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

/** "R$ 13,50" from a Scryfall usd string and a rate, or null when unavailable. */
export function usdToBrlLabel(usd: string | null | undefined, rate: number | null): string | null {
  if (!usd || rate === null) return null;
  const value = parseFloat(usd);
  if (!isFinite(value)) return null;
  return formatBrl(value * rate);
}

/** LigaMagic card page URL (front face name for DFCs). */
export function ligaMagicUrl(cardName: string): string {
  const front = cardName.split(' // ')[0];
  return `https://www.ligamagic.com.br/?view=cards/card&card=${encodeURIComponent(front)}`;
}
