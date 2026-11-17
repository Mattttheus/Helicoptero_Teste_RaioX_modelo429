/* Manutenção Interativa – gera interno/indice_manuais_bell.json a partir do portal Bell (uso interno, material proprietário).
   Rode no Chrome, logado em https://www.bellhelicopter.net/tp/ : F12 → Console → colar → Enter (pode pedir "allow pasting").
   Leva alguns minutos. No fim o Chrome baixa "indice_manuais_bell.json": copie para a pasta interno/ da cópia interna.
   Conteúdo: todos os procedimentos (título, tipo, código DMC ou capítulo, link) e o texto das descrições de sistemas
   (data modules 040/041/042 do Maintenance Manual) dos modelos da conta. */
(async () => {
  const MODELOS = ['505', '407', '407GXi', '429', '206B', '206L4', '230', '430'];
  const g = async (u) => { const r = await fetch('https://gateway.bellhelicopter.net/' + u, { credentials: 'include' }); return r.ok ? r.json() : null; };
  const limpar = (html) => {
    const d = document.createElement('div'); d.innerHTML = html;
    d.querySelectorAll('#ietm_module_title,.ietm_metadata,script,style,#ietm_dm_applic_rules').forEach((e) => e.remove());
    d.querySelectorAll('table').forEach((t) => {
      if (/Figure number|Data module\/Technical/.test(t.textContent)) { t.remove(); return; }
      t.querySelectorAll('td,th').forEach((c) => c.append(' | ')); t.querySelectorAll('tr').forEach((r) => r.append('\n'));
    });
    d.querySelectorAll('p,li,h1,h2,h3,h4,h5,dt,dd,br,div').forEach((e) => e.append('\n'));
    return d.textContent.replace(/[ \t ]+/g, ' ').replace(/ *\n */g, '\n').replace(/\n{2,}/g, '\n').replace(/^(References|List of figures)\n/gm, '').trim();
  };
  const R = { gerado: new Date().toISOString(), fonte: 'https://www.bellhelicopter.net/tp/', modelos: {}, fichas: {} };
  const descricoes = [];
  for (const m of MODELOS) {
    const M = { manuais: [], sistemas: {}, dms: [], capitulos: [] };
    const t = await g('toc/model/' + m); M.manuais = ((t && t.toc) || []).map((x) => [x.toc, x.manual]);
    const s = await g('toc/sns/' + m);
    if (s && s.sns) {
      const vistos = new Set();
      const andar = (nos, cam) => { for (const c of nos) {
        if (c.type === 'dmc') {
          if (vistos.has(c.dmc)) continue; vistos.add(c.dmc);
          const d = [cam[cam.length - 1] || '', c.title, c.subtitle, c.dmc.replace(/^DMC-/, ''), c.pmc.replace(/^PMC-/, ''), c.applic && c.applic.text !== 'ALL' ? c.applic.text : ''];
          M.dms.push(d); if (/-04[0-2]A-/.test(d[3])) descricoes.push([m, d]);
        } else { M.sistemas[c.id] = c.title; andar(c.children || [], [...cam, c.id]); }
      } };
      andar(s.sns, []);
    }
    for (const man of ['MM', 'MPI', 'MO']) {
      if (!M.manuais.some((x) => x[0] === man)) continue;
      const d = await g('toc/model/' + m + '/' + man);
      for (const mm of ((d && d.toc && d.toc.manuals) || [])) for (const p of (mm.publications || [])) for (const f of (p.files || [])) M.capitulos.push([man, p.title, p.revision, f.title, f.url]);
    }
    R.modelos[m] = M; console.log('índice', m, M.dms.length, 'módulos', M.capitulos.length, 'capítulos');
  }
  // descrições dos sistemas (texto do manual, para as fichas do 3D)
  const fila = descricoes.slice(); let feitos = 0;
  const trabalhador = async () => { while (fila.length) {
    const [m, d] = fila.shift();
    try { const j = await g(`ietm/${m}/PMC-${d[4]}/DMC-${d[3]}`); if (j && j.ietm) R.fichas[d[3]] = limpar(j.ietm.module).slice(0, 8000); } catch (e) { /* segue */ }
    if (++feitos % 100 === 0) console.log('descrições', feitos, '/', descricoes.length);
  } };
  await Promise.all([1, 2, 3, 4, 5, 6].map(trabalhador));
  console.log('pronto:', Object.keys(R.fichas).length, 'descrições');
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(R)], { type: 'application/json' }));
  a.download = 'indice_manuais_bell.json'; document.body.append(a); a.click();
})();
