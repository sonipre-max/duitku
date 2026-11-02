import { getKv, setKv } from './db';
import { addDays, parse, today, ymd } from './util';

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

export async function usdIdr(): Promise<number> {
  try {
    const r = await fetch('https://open.er-api.com/v6/latest/USD');
    const v = (await r.json()).rates.IDR;
    await setKv('usdidr', v);
    return v;
  } catch { return getKv('usdidr', 16000); }
}

// Harga penutupan harian dalam mata uang asli aset: { 'YYYY-MM-DD': harga }
export async function series(id: string, from: string): Promise<Record<string, number>> {
  const src = id.slice(0, 2), sym = id.slice(3);
  const out: Record<string, number> = {};
  if (src === 'bn') {
    let start = parse(from).getTime();
    for (let i = 0; i < 10; i++) {
      const r = await fetch(`https://api.binance.com/api/v3/klines?symbol=${sym}&interval=1d&startTime=${start}&limit=1000`);
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
    const r = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?period1=${p1}&period2=${p2}&interval=1d`);
    const res = (await r.json())?.chart?.result?.[0];
    if (!res) throw new Error('Yahoo: data tidak ditemukan untuk ' + sym);
    const ts: number[] = res.timestamp || [], cl: number[] = res.indicators.quote[0].close;
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
      const r = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${id.slice(3)}`);
      p = parseFloat((await r.json()).price);
    } else {
      const s = await series(id, addDays(today(), -7));
      const ks = Object.keys(s).sort();
      p = s[ks[ks.length - 1]];
    }
    const v = isIDR(id) ? p : p * rate;
    if (v) await setKv('px:' + id, v);
    return v || getKv('px:' + id, 0);
  } catch { return getKv('px:' + id, 0); }
}
