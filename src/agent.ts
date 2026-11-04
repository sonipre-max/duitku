// Agent tools: AI bisa MEMBACA & MENGEDIT data app (pola Vercel AI SDK function calling).
// Loop: kirim tools -> model balas tool_calls -> app eksekusi -> kirim hasil -> jawaban final.
import type { Msg, Cfg } from './ai';

export const AGENT_TOOLS = [
  { type: 'function', function: { name: 'get_summary', description: 'Ambil ringkasan data pengguna: saldo per rekening, pemasukan/pengeluaran bulan & hari ini, per kategori, tugas hari ini, ringkas DCA.', parameters: { type: 'object', properties: {}, required: [] } } },
  { type: 'function', function: { name: 'list_transactions', description: 'Daftar transaksi. Opsional: date (YYYY-MM-DD), month (YYYY-MM), category, type (in/out), limit (default 20).', parameters: { type: 'object', properties: { date: { type: 'string' }, month: { type: 'string' }, category: { type: 'string' }, type: { type: 'string' }, limit: { type: 'number' } }, required: [] } } },
  { type: 'function', function: { name: 'add_transaction', description: 'Catat transaksi baru. date YYYY-MM-DD (default hari ini), type in/out, amount rupiah, category (Makan/Transport/Belanja/Tagihan/Hiburan/Kesehatan/Pendidikan/Gaji/Bonus/Usaha/Investasi/Lainnya), accountId opsional, note.', parameters: { type: 'object', properties: { date: { type: 'string' }, type: { type: 'string', enum: ['in', 'out'] }, amount: { type: 'number' }, category: { type: 'string' }, accountId: { type: 'number' }, note: { type: 'string' } }, required: ['type', 'amount'] } } },
  { type: 'function', function: { name: 'delete_transaction', description: 'Hapus transaksi by id.', parameters: { type: 'object', properties: { id: { type: 'number' } }, required: ['id'] } } },
  { type: 'function', function: { name: 'list_tasks', description: 'Daftar tugas. Opsional: date (YYYY-MM-DD, default hari ini), all (true = semua).', parameters: { type: 'object', properties: { date: { type: 'string' }, all: { type: 'boolean' } }, required: [] } } },
  { type: 'function', function: { name: 'add_task', description: 'Buat tugas/jadwal. title wajib; date YYYY-MM-DD, time HH:MM, priority 1 tinggi/2 sedang/3 rendah, repeat none/daily/weekly/monthly.', parameters: { type: 'object', properties: { title: { type: 'string' }, date: { type: 'string' }, time: { type: 'string' }, priority: { type: 'number', enum: [1, 2, 3] }, repeat: { type: 'string', enum: ['none', 'daily', 'weekly', 'monthly'] } }, required: ['title'] } } },
  { type: 'function', function: { name: 'complete_task', description: 'Tandai tugas selesai by id atau by title (mengandung kata).', parameters: { type: 'object', properties: { id: { type: 'number' }, title: { type: 'string' } }, required: [] } } },
  { type: 'function', function: { name: 'delete_task', description: 'Hapus tugas by id.', parameters: { type: 'object', properties: { id: { type: 'number' } }, required: ['id'] } } },
  { type: 'function', function: { name: 'list_accounts', description: 'Daftar rekening + saldo saat ini.', parameters: { type: 'object', properties: {}, required: [] } } },
  { type: 'function', function: { name: 'list_budgets', description: 'Daftar anggaran bulanan + pemakaian bulan ini.', parameters: { type: 'object', properties: {}, required: [] } } },
  { type: 'function', function: { name: 'set_budget', description: 'Set/update anggaran bulanan per kategori (limit rupiah).', parameters: { type: 'object', properties: { category: { type: 'string' }, limit: { type: 'number' } }, required: ['category', 'limit'] } } },
  { type: 'function', function: { name: 'list_portfolio', description: 'Portofolio DCA: per rencana, modal, pembelian, status.', parameters: { type: 'object', properties: {}, required: [] } } },
];

type FnCtx = { today: string; month: string };
type Fn = (args: any, ctx: FnCtx) => Promise<string>;

export const TOOL_FNS: Record<string, Fn> = {
  get_summary: async (_a, ctx) => {
    const { db } = await import('./db');
    const accounts = await db.accounts.toArray();
    const txs = await db.txs.toArray();
    const bal = (id: number) => (accounts.find(a => a.id === id)?.balance0 || 0) + txs.filter(t => t.accountId === id).reduce((s, t) => s + (t.type === 'in' ? t.amount : -t.amount), 0);
    const mT = txs.filter(t => t.date.startsWith(ctx.month) && t.category !== 'Transfer');
    const dT = txs.filter(t => t.date === ctx.today && t.category !== 'Transfer');
    const by: Record<string, number> = {};
    mT.filter(t => t.type === 'out').forEach(t => (by[t.category] = (by[t.category] || 0) + t.amount));
    const tasks = await db.tasks.toArray();
    const trades = await db.trades.toArray();
    return JSON.stringify({
      accounts: accounts.map(a => ({ id: a.id, name: a.name, saldo: bal(a.id!) })),
      bulan_ini: { pemasukan: mT.filter(t => t.type === 'in').reduce((s, t) => s + t.amount, 0), pengeluaran: mT.filter(t => t.type === 'out').reduce((s, t) => s + t.amount, 0), per_kategori: by },
      hari_ini: { pemasukan: dT.filter(t => t.type === 'in').reduce((s, t) => s + t.amount, 0), pengeluaran: dT.filter(t => t.type === 'out').reduce((s, t) => s + t.amount, 0) },
      tugas_hari_ini: tasks.filter(t => t.date === ctx.today).map(t => ({ id: t.id, title: t.title, time: t.time, done: t.done })),
      dca: { total_modal: trades.reduce((s, t) => s + t.amount, 0), jumlah_rencana: (await db.plans.toArray()).length },
    });
  },
  list_transactions: async (a, ctx) => {
    const { db } = await import('./db');
    let list = await db.txs.orderBy('date').reverse().toArray();
    if (a.date) list = list.filter((t: any) => t.date === a.date);
    else if (a.month) list = list.filter((t: any) => t.date.startsWith(a.month));
    else list = list.filter((t: any) => t.date.startsWith(ctx.month));
    if (a.category) list = list.filter((t: any) => t.category.toLowerCase().includes(String(a.category).toLowerCase()));
    if (a.type) list = list.filter((t: any) => t.type === a.type);
    return JSON.stringify(list.slice(0, a.limit || 20));
  },
  add_transaction: async (a, ctx) => {
    const { db } = await import('./db');
    if (!(a.amount > 0)) return 'Error: amount harus > 0';
    const accounts = await db.accounts.toArray();
    const accId = a.accountId || accounts[0]?.id;
    if (!accId) return 'Error: belum ada rekening';
    const type = a.type === 'in' ? 'in' : 'out';
    await db.txs.add({ date: a.date || ctx.today, type, amount: a.amount, category: a.category || 'Lainnya', accountId: accId, note: a.note || 'Dicatat via AI' });
    return `OK: transaksi ${type === 'in' ? 'pemasukan' : 'pengeluaran'} Rp${a.amount} (${a.category || 'Lainnya'}) tersimpan.`;
  },
  delete_transaction: async (a) => {
    if (!(globalThis as any).__duitkuConfirm?.(`Hapus transaksi #${a.id}?`)) return 'DIBATALKAN: user tidak konfirmasi. Jangan ulangi tanpa persetujuan.';
    const { db } = await import('./db'); await db.txs.delete(a.id); return `OK: transaksi #${a.id} dihapus.`;
  },
  list_tasks: async (a, ctx) => {
    const { db } = await import('./db');
    const list = a.all ? await db.tasks.toArray() : (await db.tasks.toArray()).filter((t: any) => t.date === (a.date || ctx.today));
    return JSON.stringify(list);
  },
  add_task: async (a, ctx) => {
    const { db } = await import('./db');
    const { schedule } = await import('./notif');
    const t: any = { title: a.title, date: a.date || ctx.today, time: a.time || '', priority: ([1, 2, 3].includes(a.priority) ? a.priority : 2) as 1 | 2 | 3, repeat: (['none', 'daily', 'weekly', 'monthly'].includes(a.repeat) ? a.repeat : 'none') as any, done: false, doneOn: [] };
    t.id = await db.tasks.add(t as any);
    schedule(t as any);
    return `OK: tugas "${t.title}" dibuat untuk ${t.date}${t.time ? ' pukul ' + t.time : ''}.`;
  },
  complete_task: async (a, ctx) => {
    const { db } = await import('./db');
    const list = await db.tasks.toArray();
    const t = a.id ? list.find((x: any) => x.id === a.id) : list.find((x: any) => x.title.toLowerCase().includes(String(a.title || '').toLowerCase()));
    if (!t) return 'Error: tugas tidak ditemukan';
    if (t.repeat === 'none') await db.tasks.update(t.id!, { done: true });
    else await db.tasks.update(t.id!, { doneOn: [...(t.doneOn || []), ctx.today] });
    return `OK: tugas "${t.title}" ditandai selesai.`;
  },
  delete_task: async (a) => {
    if (!(globalThis as any).__duitkuConfirm?.(`Hapus tugas #${a.id}?`)) return 'DIBATALKAN: user tidak konfirmasi. Jangan ulangi tanpa persetujuan.';
    const { db } = await import('./db'); await db.tasks.delete(a.id); return `OK: tugas #${a.id} dihapus.`;
  },
  list_accounts: async () => {
    const { db } = await import('./db');
    const accounts = await db.accounts.toArray();
    const txs = await db.txs.toArray();
    return JSON.stringify(accounts.map(a => ({ id: a.id, name: a.name, saldo: a.balance0 + txs.filter(t => t.accountId === a.id).reduce((s, t) => s + (t.type === 'in' ? t.amount : -t.amount), 0) })));
  },
  list_budgets: async (_a, ctx) => {
    const { db } = await import('./db');
    const budgets = await db.budgets.toArray();
    const txs = (await db.txs.toArray()).filter((t: any) => t.date.startsWith(ctx.month) && t.type === 'out');
    return JSON.stringify(budgets.map(b => ({ ...b, terpakai: txs.filter((t: any) => t.category === b.category).reduce((s: number, t: any) => s + t.amount, 0) })));
  },
  set_budget: async (a) => {
    const { db } = await import('./db');
    const ex = (await db.budgets.toArray()).find(b => b.category === a.category);
    if (ex) await db.budgets.update(ex.id!, { limit: a.limit });
    else await db.budgets.add({ category: a.category, limit: a.limit });
    return `OK: anggaran ${a.category} = Rp${a.limit}/bulan.`;
  },
  list_portfolio: async () => {
    const { db } = await import('./db');
    const plans = await db.plans.toArray();
    const trades = await db.trades.toArray();
    return JSON.stringify(plans.map(p => {
      const tr = trades.filter((t: any) => t.planId === p.id);
      return { id: p.id, nama: p.name, harian: p.daily, aktif: p.active, modal: tr.reduce((s: number, t: any) => s + t.amount, 0), pembelian: tr.length };
    }));
  },
};

// Satu putaran agent: kirim percakapan + tools; kalau model minta tool call, eksekusi & ulangi (maks 6 putaran).
export async function agentTurn(history: Msg[], cfg: Cfg, push: (m: Msg) => void): Promise<void> {
  if (!cfg.key) throw new Error('Isi API key di Setelan dulu.');
  const now = new Date();
  const ctx: FnCtx = {
    today: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`,
    month: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
  };
  const sys = 'Kamu asisten keuangan & produktivitas dalam app DuitKu (bahasa Indonesia, sapa pengguna "Bos", gaya santai). ' +
    `Hari ini ${ctx.today}. Lo PUNYA akses tools untuk membaca & mengubah data app (transaksi, tugas, rekening, anggaran, portofolio). ` +
    'PAKAI tools untuk menjawab pertanyaan tentang data — jangan mengarang angka. Kalau user minta mencatat/mengubah/menghapus, eksekusi lewat tools lalu konfirmasi singkat. ' +
    'Jawab akhir singkat & jelas. Simulasi investasi bukan nasihat keuangan.';

  const convo: any[] = [{ role: 'system', content: sys }, ...history.map(h => ({ role: h.role, content: h.content }))];

  for (let round = 0; round < 6; round++) {
    if (cfg.provider === 'gemini') {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${cfg.model}:generateContent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': cfg.key },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: sys }] },
          contents: convo.filter(m => m.role !== 'system').map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })),
          tools: AGENT_TOOLS.map(t => ({ functionDeclarations: [t.function] })),
        })
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error?.message || 'Permintaan gagal');
      const cand = j.candidates?.[0]?.content?.parts || [];
      const fc = cand.find((p: any) => p.functionCall)?.functionCall;
      const txt = cand.filter((p: any) => p.text).map((p: any) => p.text).join('');
      if (fc) {
        const out = await (TOOL_FNS[fc.name] || (async () => 'tool tidak dikenal'))(fc.args || {}, ctx);
        push({ role: 'assistant', content: `🔧 ${fc.name} → selesai` });
        convo.push({ role: 'assistant', content: txt || `[memanggil ${fc.name}]` });
        convo.push({ role: 'user', content: `[Hasil ${fc.name}]: ${out}` });
        continue;
      }
      push({ role: 'assistant', content: txt });
      return;
    }
    // OpenRouter (OpenAI-compatible tool calls)
    const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${cfg.key}` },
      body: JSON.stringify({ model: cfg.model, messages: convo, tools: AGENT_TOOLS })
    });
    const j = await r.json();
    if (!r.ok) throw new Error(j.error?.message || 'Permintaan gagal');
    const assistantMsg = j.choices?.[0]?.message;
    if (assistantMsg?.tool_calls?.length) {
      convo.push(assistantMsg);
      for (const tc of assistantMsg.tool_calls) {
        let out = 'tool tidak dikenal';
        try {
          const fn = TOOL_FNS[tc.function.name];
          if (fn) out = await fn(JSON.parse(tc.function.arguments || '{}'), ctx);
        } catch (e: any) { out = 'Error: ' + (e?.message || e); }
        push({ role: 'assistant', content: `🔧 ${tc.function.name} → selesai` });
        convo.push({ role: 'tool', tool_call_id: tc.id, content: out });
      }
      continue;
    }
    push({ role: 'assistant', content: assistantMsg?.content || '(tidak ada jawaban)' });
    return;
  }
  push({ role: 'assistant', content: 'Terlalu banyak langkah — coba pecah pertanyaannya, Bos.' });
}
