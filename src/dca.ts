import { db, DcaPlan, Trade } from './db';
import { addDays, today } from './util';
import { isIDR, series, usdIdr } from './market';

// Isi pembelian harian dari hari terakhir dijalankan sampai hari ini (backfill).
// Tanggal mulai di masa lalu = mode backtest. Hari tanpa harga (libur bursa) dilewati.
export async function runPlan(plan: DcaPlan): Promise<number> {
  const t = today();
  const from = plan.lastRun ? addDays(plan.lastRun, 1) : plan.startDate;
  if (from > t) return 0;

  // total alokasi wajar 99–101% (toleransi pembulatan pecahan)
  const total = Object.values(plan.alloc).reduce((s, v) => s + v, 0);
  if (total < 99 || total > 101) throw new Error(`${plan.name}: total alokasi ${total.toFixed(1)}% tidak valid`);
  const norm = total / 100; // normalisasi agar total dana = plan.daily persis

  const rate = await usdIdr();
  const assets = Object.keys(plan.alloc);
  const ser: Record<string, Record<string, number>> = {};
  for (let i = 0; i < assets.length; i++) {
    ser[assets[i]] = await series(assets[i], from); // lempar error jika offline
    if (i < assets.length - 1) await new Promise(r => setTimeout(r, 300)); // jeda antar-request
  }

  const rows: Trade[] = [];
  for (let d = from; d <= t; d = addDays(d, 1)) {
    for (const [a, pct] of Object.entries(plan.alloc)) {
      const px = ser[a][d];
      if (!px) continue;
      const price = isIDR(a) ? px : px * rate;
      const amount = (plan.daily * pct) / (100 * norm); // alokasi dinormalisasi
      rows.push({ planId: plan.id!, date: d, symbol: a, price, amount, qty: price > 0 ? amount / price : 0 });
    }
  }
  // buang qty 0 (harga 0/korup) agar tidak merusak rata-rata & valuasi
  const clean = rows.filter(r => r.qty > 0);
  if (!clean.length) return 0;

  await db.transaction('rw', db.trades, db.plans, async () => {
    await db.trades.bulkAdd(clean);
    await db.plans.update(plan.id!, { lastRun: t });
  });
  return clean.length;
}

export async function runAll(): Promise<string> {
  if (!navigator.onLine) return 'Offline: simulasi dilanjutkan saat online.';
  let n = 0;
  const plans = await db.plans.filter(p => p.active).toArray();
  for (let i = 0; i < plans.length; i++) {
    try {
      n += await runPlan(plans[i]);
    } catch (e: any) {
      if (i > 0 && n > 0) return `${n} pembelian ditambahkan. Plan berikutnya gagal: ${e?.message || e}`;
      return 'Gagal sinkron: ' + (e?.message || e);
    }
    if (i < plans.length - 1) await new Promise(r => setTimeout(r, 500));
  }
  return n ? `${n} pembelian simulasi ditambahkan.` : 'Sudah terbaru.';
}
