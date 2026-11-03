import { useState } from 'react';
import { db, TABLES } from '../db';
import { loadCfg, saveCfg } from '../ai';
import { saveFile } from '../util';
import { THEMES, getTheme, setTheme, ThemeId } from '../theme';

const sha = async (s: string) =>
  [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)))].map(b => b.toString(16).padStart(2, '0')).join('');

export default function Settings() {
  const [c, setC] = useState(loadCfg());
  const [pin, setPin] = useState('');
  const [msg, setMsg] = useState('');
  const [theme, setT] = useState<ThemeId>(getTheme());
  const set = (p: Partial<typeof c>) => { const n = { ...c, ...p }; setC(n); saveCfg(n); };
  const pick = (t: ThemeId) => { setTheme(t); setT(t); };

  const backup = async () => {
    const o: any = {};
    for (const t of TABLES) o[t] = await (db as any)[t].toArray();
    await saveFile(`duitku-backup-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(o));
  };
  const restore = async (f?: File) => {
    if (!f) return;
    try {
      const o = JSON.parse(await f.text());
      await db.transaction('rw', TABLES.map(t => (db as any)[t]), async () => {
        for (const t of TABLES) { await (db as any)[t].clear(); if (o[t]?.length) await (db as any)[t].bulkAdd(o[t]); }
      });
      setMsg('Data dipulihkan.');
    } catch { setMsg('File backup tidak valid.'); }
  };

  return (
    <>
      <section>
        <h2>Tema tampilan</h2>
        <div className="themegrid">
          {THEMES.map(t => (
            <button key={t.id} className={'themecard' + (theme === t.id ? ' on' : '')} onClick={() => pick(t.id)}>
              <div className="tprev" style={{ background: t.swatch[0] }}>
                <span style={{ display: 'inline-block', width: '55%', height: 18, borderRadius: 6, background: t.swatch[1] }} />
              </div>
              <div className="tname">{t.name}</div>
              <div className="tdesc"><span className="tdot" style={{ background: t.swatch[1] }} />{t.desc}</div>
            </button>
          ))}
        </div>
        <div className="tag" style={{ marginTop: 8 }}>Tema langsung aktif saat dipilih dan tersimpan di perangkat ini.</div>
      </section>
      <section>
        <h2>Binance API</h2>
        <input type="password" value={c.binanceKey || ''} onChange={e => set({ binanceKey: e.target.value })} placeholder="API key Binance (opsional)" />
        <div className="tag">Dipakai untuk data harga pasar (ticker 24 jam & grafik). Tanpa key pun data publik tetap jalan; key hanya menaikkan batas rate. Key disimpan lokal di perangkat ini.</div>
      </section>
      <section>
        <h2>Ringkasan harian (jam & cuaca)</h2>
        <input value={c.city || ''} onChange={e => set({ city: e.target.value })} placeholder="Nama kota (mis. Jakarta)" />
        <div className="g2">
          <input inputMode="decimal" value={c.lat ?? ''} onChange={e => set({ lat: e.target.value === '' ? undefined : +e.target.value })} placeholder="Latitude (mis. -6.2)" />
          <input inputMode="decimal" value={c.lon ?? ''} onChange={e => set({ lon: e.target.value === '' ? undefined : +e.target.value })} placeholder="Longitude (mis. 106.8)" />
        </div>
        <input inputMode="numeric" value={c.tzOffset ?? ''} onChange={e => set({ tzOffset: e.target.value === '' ? undefined : +e.target.value })} placeholder="Offset zona waktu menit (mis. 420 = WIB). Kosong = ikut perangkat" />
        <div className="tag">Cuaca dari open-meteo (gratis, tanpa key). Cari latitude/longitude kotamu di latlong.net. Contoh: Jakarta -6.2 / 106.8, Denpasar -8.65 / 115.22.</div>
      </section>
      <section>
        <h2>Model AI</h2>
        <select value={c.provider} onChange={e => set({ provider: e.target.value as any, model: e.target.value === 'gemini' ? 'gemini-2.0-flash' : 'openrouter/auto' })}>
          <option value="openrouter">OpenRouter</option><option value="gemini">Google Gemini</option>
        </select>
        <input value={c.model} onChange={e => set({ model: e.target.value })} placeholder="Nama model" />
        <input type="password" value={c.key} onChange={e => set({ key: e.target.value })} placeholder="API key" />
        <label className="row" style={{ border: 0 }}>
          <span>Kirim ringkasan data keuangan ke AI</span>
          <input type="checkbox" style={{ width: 22 }} checked={c.withData} onChange={e => set({ withData: e.target.checked })} />
        </label>
        <div className="tag">Key disimpan di penyimpanan privat aplikasi di perangkat ini.</div>
      </section>
      <section>
        <h2>Kunci aplikasi</h2>
        <input type="password" inputMode="numeric" value={pin} onChange={e => setPin(e.target.value)} placeholder="PIN baru (kosongkan untuk mematikan)" />
        <button className="btn alt" onClick={async () => { if (pin) localStorage.setItem('pin', await sha(pin)); else localStorage.removeItem('pin'); setPin(''); setMsg(pin ? 'PIN aktif.' : 'PIN dimatikan.'); }}>Simpan PIN</button>
      </section>
      <section>
        <h2>Backup data</h2>
        <button className="btn alt" onClick={backup}>Ekspor backup (JSON)</button>
        <input type="file" accept=".json,application/json" onChange={e => restore(e.target.files?.[0])} />
        <div className="tag">Memulihkan akan mengganti semua data saat ini. API key tidak ikut di backup.</div>
        {msg && <div className="pos">{msg}</div>}
      </section>
    </>
  );
}
