import { Suspense, lazy, useEffect, useState } from 'react';
import Home from './pages/Home';
const Finance = lazy(() => import('./pages/Finance'));
const Todo = lazy(() => import('./pages/Todo'));
const Invest = lazy(() => import('./pages/Invest'));
const AI = lazy(() => import('./pages/AI'));
const Settings = lazy(() => import('./pages/Settings'));
import { db } from './db';
import { runAll } from './dca';
import { Ic } from './icons';

const sha = async (s: string) =>
  [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)))]
    .map(b => b.toString(16).padStart(2, '0')).join('');

function Lock({ onOk }: { onOk: () => void }) {
  const [pin, setPin] = useState(''); const [err, setErr] = useState('');
  const go = async () => {
    if ((await sha(pin)) === localStorage.getItem('pin')) onOk();
    else { setErr('PIN salah. Coba lagi.'); setPin(''); }
  };
  return (
    <div className="lock">
      <h1>DuitKu</h1>
      <input type="password" inputMode="numeric" value={pin} placeholder="Masukkan PIN" onChange={e => setPin(e.target.value)} />
      <div className="neg">{err}</div>
      <button className="btn" onClick={go}>Buka</button>
    </div>
  );
}

const TABS = [['home', 'Beranda', 'home'], ['uang', 'Keuangan', 'wallet'], ['tugas', 'To Do', 'todo'], ['dca', 'Investasi', 'invest'], ['ai', 'Lainnya', 'ai']] as const;

export default function App() {
  const [locked, setLocked] = useState(!!localStorage.getItem('pin'));
  const [tab, setTab] = useState<string>('home');
  const [cfg, setCfg] = useState(false);

  useEffect(() => {
    (async () => {
      if ((await db.accounts.count()) === 0) await db.accounts.add({ name: 'Tunai', balance0: 0 });
      try { const r = await runAll(); if (r && r !== 'Sudah terbaru.') console.log('[DCA]', r); } catch (e) { console.warn('[DCA] auto-run gagal:', e); }
      // jalankan ulang tiap 6 jam selama app terbuka
      const iv = setInterval(async () => { try { await runAll(); } catch { /* offline */ } }, 6 * 60 * 60 * 1000);
      return () => clearInterval(iv);
    })();
  }, []);

  if (locked) return <Lock onOk={() => setLocked(false)} />;
  const title = cfg ? 'Setelan' : TABS.find(t => t[0] === tab)![1];
  return (
    <div className="app">
      <div className="top">
        <h1>{title}</h1>
        <div className="topbtns">
          <button className={'icobtn' + (tab === 'ai' && !cfg ? ' on' : '')} title="Chat AI" onClick={() => { setTab('ai'); setCfg(false); }}><Ic.ai size={20} /></button>
          <button className={'icobtn' + (cfg ? ' on' : '')} title="Setelan" onClick={() => setCfg(!cfg)}><Ic.settings size={20} /></button>
        </div>
      </div>
      <main>
        <Suspense fallback={<div className="loading">…</div>}>
          {cfg ? <Settings /> : tab === 'home' ? <Home go={setTab} /> : tab === 'uang' ? <Finance />
            : tab === 'tugas' ? <Todo /> : tab === 'dca' ? <Invest /> : <AI />}
        </Suspense>
      </main>
      <nav className="floatnav">{TABS.map(([k, l, ico]) => { const NI = (Ic as any)[ico]; return (
        <button key={k} className={tab === k && !cfg ? 'on' : ''} onClick={() => { setTab(k); setCfg(false); }}><span className="nico"><NI size={19} strokeWidth={2.2} /></span><span className="nlab">{l}</span></button>
      ); })}</nav>
    </div>
  );
}
