// Interpretação de texto livre em português ("descrever a manutenção"): normalização, radical e semelhança tolerante a erro de digitação.
// Sem DOM: usado pelo manual (apresentação) e coberto pelos testes automáticos.
export const VAZIAS = new Set('de do da dos das o a os as e em no na nos nas para por com um uma ao aos n nr numero the of'.split(' '));
export function raizPalavra(w) {
  if (/^\d+$/.test(w)) return w;
  if (w.length > 4 && w.endsWith('oes')) return w.slice(0, -3) + 'ao';
  if (w.length > 4 && (w.endsWith('ais') || w.endsWith('eis'))) return w.slice(0, -2) + 'l';
  if (w.length > 4 && /[rz]es$/.test(w)) return w.slice(0, -2);
  if (w.length > 3 && w.endsWith('s')) return w.slice(0, -1);
  return w;
}
export const normalizar = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/([a-z])(\d)/g, '$1 $2').replace(/(\d)([a-z])/g, '$1 $2')
  .split(/[^a-z0-9]+/).filter((w) => w && !VAZIAS.has(w)).map(raizPalavra);
export function distancia(a, b) {
  if (Math.abs(a.length - b.length) > 2) return 9;
  let ant = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) { const at = [i]; for (let j = 1; j <= b.length; j++) at[j] = Math.min(ant[j] + 1, at[j - 1] + 1, ant[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); ant = at; }
  return ant[b.length];
}
export function parecido(a, b) {
  if (a === b) return true;
  const m = Math.min(a.length, b.length);
  if (m < 7 || /\d/.test(a + b)) return false;
  return distancia(a, b) <= (m >= 10 ? 2 : 1);
}
// vocabulário a partir das palavras-chave do modelo (KW = [[frases 'a|b', ids, genérico], ...])
export function montarVocab(KW) {
  const V = [];
  for (const [frases, ids, gen] of KW) for (const f of frases.split('|')) { const p = normalizar(f); if (p.length) V.push({ p, ids, gen: !!gen, txt: f }); }
  return V;
}

// interpreta a descrição livre da manutenção → componentes citados, termos encontrados e tarefas do manual relacionadas
export function criarAnalisador({ VOCAB, COMPS, TAREFAS }) {
  return function analisar(texto) {
    const T = normalizar(texto), achados = [];
    for (const k of VOCAB) for (let i = 0; i + k.p.length <= T.length; i++) if (k.p.every((w, j) => parecido(T[i + j], w))) achados.push({ s: i, e: i + k.p.length, k });
    const validos = achados.filter((m) => !achados.some((o) => o !== m && o.e - o.s > m.e - m.s && o.s <= m.s && o.e >= m.e));
    const esp = validos.filter((m) => !m.k.gen).map((m) => ({ ids: [...m.k.ids], txt: [m.k.txt] }));
    const termos = {}, saida = new Set();
    const nota = (id, txt) => { (termos[id] ??= new Set()).add(txt); saida.add(id); };
    for (const g of validos.filter((m) => m.k.gen)) {
      let usou = false;
      for (const s of esp) { const inter = s.ids.filter((id) => g.k.ids.includes(id)); if (inter.length) { s.ids = inter; s.txt.push(g.k.txt); usou = true; } }
      if (!usou) g.k.ids.forEach((id) => nota(id, g.k.txt));
    }
    for (const s of esp) s.ids.forEach((id) => s.txt.forEach((t) => nota(id, t)));
    // "motor 2", "porta do piloto"...: citar só um lado de um par descarta o outro lado
    const unicos = new Set(esp.filter((s) => s.ids.length === 1).map((s) => s.ids[0]));
    for (const id of unicos) { const par = COMPS[id].par; if (par && !unicos.has(par)) saida.delete(par); }
    const tem = (lista) => T.some((t) => lista.some((w) => parecido(t, w)));
    const esq = tem(['esquerdo', 'lh', 'esq', 'left']), dir = tem(['direito', 'rh', 'right']);
    if (esq !== dir) for (const id of [...saida]) { const c = COMPS[id]; if (c.side === (esq ? 'R' : 'L') && c.par && saida.has(c.par)) saida.delete(id); }
    // tarefas do manual relacionadas, ordenadas por palavras em comum
    const chave = new Set(T.filter((w) => w.length >= 4));
    const rel = TAREFAS.filter((x) => x.comps.some((c) => saida.has(c)))
      .map((x) => ({ x, p: normalizar(x.t[1]).filter((w) => chave.has(w)).length }))
      .sort((a, b) => b.p - a.p).slice(0, 8).map((o) => o.x);
    return { ids: [...saida].sort((a, b) => COMPS[a].ata.localeCompare(COMPS[b].ata)), termos, rel };
  }
}
// zonas de manutenção (ex.: "211, 220–240") → componentes e nomes legíveis
export function criarZonas(ZC, ZONAS) {
  const compsDeZonas = (z) => {
    const o = new Set();
    for (const n of String(z).match(/\d{3}/g) || []) (ZC[n] || []).forEach((c) => o.add(c));
    if (/(\d{3})–(\d{3})/.test(z)) { const [, a, b] = z.match(/(\d{3})–(\d{3})/); for (let n = +a; n <= +b; n++) (ZC[n] || []).forEach((c) => o.add(c)); }
    return [...o];
  };
  const nomeZonas = (z) => (String(z).match(/\d{3}/g) || []).map((n) => `${n} – ${ZONAS[n] || ''}`).join('\n');
  return { compsDeZonas, nomeZonas };
}
