import { getKv, setKv } from './db';
import { addDays, parse, today, ymd } from './util';
import { loadCfg } from './ai';

// id aset: "bn:SIMBOL" = Binance (USDT), "yf:SIMBOL" = Yahoo Finance
export const ASSETS = [
  { id: 'bn:BTCUSDT', label: 'Bitcoin' },
  { id: 'bn:ETHUSDT', label: 'Ethereum' },
  { id: 'bn:BNBUSDT', label: 'BNB' },
  { id: 'bn:SOLUSDT', label: 'Solana' },
  { id: 'bn:PAXGUSDT', label: 'Emas (PAXG)' },
  { id: 'yf:GC=F', label: 'Emas (futures)' },
  { id: 'yf:BBCA.JK', label: 'BBCA' },
  { id: 'yf:BBRI.JK', label: 'BBRI' },
  { id: 'yf:TLKM.JK', label: 'TLKM' },
  { id: 'yf:AAPL', label: 'Apple (AAPL)' }
];
export const label = (id: string) => ASSETS.find(a => a.id === id)?.label ?? id.slice(3);
export const isIDR = (id: string) => id.endsWith('.JK');

// Header Binance API key (opsional, menaikkan rate limit) — hanya di native/Capacitor.
// Di browser mengirim header arbitrary ke Binance memicu preflight CORS yang tidak diizinkan,
// jadi key hanya dipakai di APK (CapacitorHttp lewat jalur native, bebas CORS).
// Proxy Yahoo (CORS) — Cloudflare Worker dengan retry otomatis antar host
const YPROXY = 'https://yproxy.thin-engine-a04.workers.dev/';

function bH(): Record<string, string> | undefined {
  const key = loadCfg().binanceKey;
  if (!key) return undefined;
  const isNative = typeof (window as any).Capacitor !== 'undefined' && !(window as any).Capacitor.isWebPlatform?.();
  return isNative ? { 'X-MBX-APIKEY': key } : undefined;
}

export async function usdIdr(): Promise<number> {
  try {
    const r = await fetch('https://open.er-api.com/v6/latest/USD');
    const v = (await r.json()).rates.IDR;
    await setKv('usdidr', v);
    return v;
  } catch { return getKv('usdidr', 16000); }
}

// ── Kurs USD/IDR HISTORIS (frankfurter.app — data ECB, gratis, tanpa key) ──
// Dipakai DCA agar pembelian historis memakai kurs sesuai tanggalnya, bukan kurs hari ini.
// Return { 'YYYY-MM-DD': kurs } utk rentang from..today; weekend/libur → kurs hari kerja terakhir.
export async function usdIdrSeries(from: string): Promise<Record<string, number>> {
  const cacheKey = 'fxusd:' + from;
  const cached = await getKv(cacheKey, null) as Record<string, number> | null;
  // cache masih segar kalau sudah mencakup hari ini
  if (cached && typeof cached === 'object' && cached[today()]) return cached;
  try {
    const u = `https://api.frankfurter.app/${from}..?from=USD&to=IDR`;
    const r = await fetch(u);
    if (!r.ok) throw new Error('frankfurter ' + r.status);
    const j = await r.json();
    const rates = j.rates || {};
    const out: Record<string, number> = {};
    for (const d of Object.keys(rates)) out[d] = rates[d].IDR;
    const dates = Object.keys(out).sort();
    if (!dates.length) throw new Error('frankfurter kosong');
    let last = out[dates[0]];
    const res: Record<string, number> = {};
    for (let d = from; d <= today(); d = addDays(d, 1)) {
      if (out[d]) last = out[d];
      res[d] = last;
    }
    await setKv(cacheKey, res);
    return res;
  } catch {
    // fallback: kurs tunggal hari ini utk semua tanggal (perilaku lama)
    const now = await usdIdr();
    const res: Record<string, number> = {};
    for (let d = from; d <= today(); d = addDays(d, 1)) res[d] = now;
    return res;
  }
}

// Harga penutupan harian dalam mata uang asli aset: { 'YYYY-MM-DD': harga }
export async function series(id: string, from: string): Promise<Record<string, number>> {
  const src = id.slice(0, 2), sym = id.slice(3);
  const out: Record<string, number> = {};
  if (src === 'bn') {
    let start = parse(from).getTime();
    for (let i = 0; i < 10; i++) {
      const r = await fetch(`https://api.binance.com/api/v3/klines?symbol=${sym}&interval=1d&startTime=${start}&limit=1000`, { headers: bH() });
      const k = await r.json();
      if (!Array.isArray(k)) throw new Error('Binance: ' + (k?.msg || 'gagal'));
      if (!k.length) break;
      for (const c of k) out[ymd(new Date(c[0]))] = parseFloat(c[4]);
      start = k[k.length - 1][0] + 86400000;
      if (k.length < 1000) break;
    }
  } else {
    const p1 = Math.floor(parse(from).getTime() / 1000) - 86400;
    const p2 = Math.floor(Date.now() / 1000) + 86400;
    // Yahoo tidak mengirim CORS → web lewat proxy worker (retry otomatis), native langsung
    const isNative = typeof (window as any).Capacitor !== 'undefined' && !(window as any).Capacitor.isWebPlatform?.();
    const url = isNative
      ? `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?period1=${p1}&period2=${p2}&interval=1d&events=div%2Csplit`
      : `${YPROXY}?s=${encodeURIComponent(sym)}&p1=${p1}&p2=${p2}`;
    const r = await fetch(url, isNative ? { headers: { 'User-Agent': 'Mozilla/5.0' } } as any : {});
    const res = (await r.json())?.chart?.result?.[0];
    if (!res) throw new Error('Yahoo: data tidak ditemukan untuk ' + sym);
    const ts: number[] = res.timestamp || [];
    const cl: number[] = res.indicators?.adjclose?.[0]?.adjclose || res.indicators?.quote?.[0]?.close || [];
    ts.forEach((t, i) => { if (cl[i] != null) out[ymd(new Date(t * 1000))] = cl[i]; });
  }
  return out;
}

// Harga terakhir dalam rupiah. Offline -> pakai harga cache terakhir.
export async function latest(id: string): Promise<number> {
  try {
    const rate = await usdIdr();
    let p: number;
    if (id.startsWith('bn:')) {
      const r = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${id.slice(3)}`, { headers: bH() });
      p = parseFloat((await r.json()).price);
    } else {
      const s = await series(id, addDays(today(), -7));
      const ks = Object.keys(s).sort();
      p = s[ks[ks.length - 1]];
      if (!p) throw new Error('harga kosong');
    }
    const v = isIDR(id) ? p : p * rate;
    if (v) await setKv('px:' + id, v);
    return v || getKv('px:' + id, 0);
  } catch { return getKv('px:' + id, 0); }
}
