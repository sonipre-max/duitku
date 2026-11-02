import { db, DcaPlan, Trade } from './db';
import { addDays, today } from './util';
import { isIDR, series, usdIdr } from './market';

// Isi pembelian harian dari hari terakhir dijalankan sampai hari ini (backfill).
// Tanggal mulai di masa lalu = mode backtest. Hari tanpa harga (libur bursa) dilewati.
export async function runPlan(plan: DcaPlan): Promise<number> {
  const t = today();
  const from = plan.lastRun ? addDays(plan.lastRun, 1) : plan.startDate;
  if (from > t) return 0;
  const rate = await usdIdr();
  const ser: Record<string, Record<string, number>> = {};
  for (const a of Object.keys(plan.alloc)) ser[a] = await series(a, from); // lempar error jika offline
  const rows: Trade[] = [];
  for (let d = from; d <= t; d = addDays(d, 1)) {
    for (const [a, pct] of Object.entries(plan.alloc)) {
      const px = ser[a][d];
      if (!px) continue;
      const price = isIDR(a) ? px : px * rate;
      const amount = (plan.daily * pct) / 100;
      rows.push({ planId: plan.id!, date: d, symbol: a, price, amount, qty: amount / price });
    }
  }
  await db.transaction('rw', db.trades, db.plans, async () => {
    await db.trades.bulkAdd(rows);
    await db.plans.update(plan.id!, { lastRun: t });
  });
  return rows.length;
}

export async function runAll(): Promise<string> {
  if (!navigator.onLine) return 'Offline: simulasi dilanjutkan saat online.';
  let n = 0;
  try {
    for (const p of await db.plans.filter(p => p.active).toArray()) n += await runPlan(p);
    return n ? `${n} pembelian simulasi ditambahkan.` : 'Sudah terbaru.';
  } catch (e: any) { return 'Gagal sinkron: ' + (e?.message || e); }
}
