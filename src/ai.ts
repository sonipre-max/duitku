export type Msg = { role: 'user' | 'assistant'; content: string };
export type Cfg = { provider: 'openrouter' | 'gemini'; key: string; model: string; withData: boolean; name?: string; binanceKey?: string };

export const loadCfg = (): Cfg => ({
  provider: 'openrouter', key: '', model: 'openrouter/auto', withData: false,
  ...JSON.parse(localStorage.getItem('cfg') || '{}')
});
export const saveCfg = (c: Cfg) => localStorage.setItem('cfg', JSON.stringify(c));

export async function ask(msgs: Msg[], cfg: Cfg, system: string): Promise<string> {
  if (!cfg.key) throw new Error('Isi API key di Setelan dulu.');
  if (cfg.provider === 'gemini') {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${cfg.model}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': cfg.key },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: msgs.map(m => ({ role: m.role === 'user' ? 'user' : 'model', parts: [{ text: m.content }] }))
      })
    });
    const j = await r.json();
    if (!r.ok) throw new Error(j.error?.message || 'Permintaan gagal');
    return j.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join('') || '';
  }
  const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${cfg.key}` },
    body: JSON.stringify({ model: cfg.model, messages: [{ role: 'system', content: system }, ...msgs] })
  });
  const j = await r.json();
  if (!r.ok) throw new Error(j.error?.message || 'Permintaan gagal');
  return j.choices?.[0]?.message?.content || '';
}
