/* Manutenção Interativa – gera interno/indice_manuais_bell.json a partir do portal Bell (uso interno, material proprietário).
   Rode no Chrome, logado em https://www.bellhelicopter.net/tp/ : F12 → Console → colar → Enter (pode pedir "allow pasting").
   Leva alguns minutos. No fim o Chrome baixa "indice_manuais_bell.json": copie para a pasta interno/ da cópia interna.
   Conteúdo: todos os procedimentos (título, tipo, código DMC ou capítulo, link), o texto das descrições de sistemas
   (data modules 040/041/042), as peças do catálogo ilustrado (IPC: item, PN, nomenclatura, efetividade, UPA) e a lista
   de figuras de cada módulo. Opcional: baixar as figuras (SVG) dos capítulos em FIGURAS_CAPS para a pasta interno/figuras/
   (o Chrome pede uma vez para permitir vários downloads). */
(async () => {
  const MODELOS = window.__MI_MODELOS || ['505', '407', '407GXi', '429', '206B', '206L4', '230', '430'];
  const FIGURAS_CAPS = ['67', '76']; // capítulos ATA cujas figuras serão baixadas como SVG ([] = não baixar figuras)
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
  const R = { gerado: new Date().toISOString(), fonte: 'https://www.bellhelicopter.net/tp/', modelos: {}, fichas: {}, pecas: {}, figuras: {} };
  const descricoes = [], ipc = [];
  const pecasIpc = (html) => {
    const d = document.createElement('div'); d.innerHTML = html;
    return [...d.querySelectorAll('tr.ietm_ipd_item')].map((tr) => {
      const td = tr.querySelectorAll('td'), c2 = td[2]; if (!c2) return null;
      const extra = [...c2.querySelectorAll('div')].map((e) => e.textContent.trim().replace(/\s+/g, ' ')).filter(Boolean).join('; ');
      return [td[0].textContent.trim(), td[1].textContent.trim(), (c2.querySelector('span') || c2).textContent.trim().replace(/\s+/g, ' '), extra, td[3] ? td[3].textContent.trim() : '', td[5] ? td[5].textContent.trim() : ''];
    }).filter(Boolean);
  };
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
          M.dms.push(d); if (/-04[0-2]A-/.test(d[3])) descricoes.push([m, d]); else if (/-94\dA-/.test(d[3])) ipc.push([m, d]);
        } else { M.sistemas[c.id] = c.title; andar(c.children || [], [...cam, c.id]); }
      } };
      andar(s.sns, []);
      // figuras (ICN) de cada módulo, pelo sumário de cada publicação
      for (const pmc of new Set(M.dms.map((d) => d[4]))) {
        const toc = await g(`toc/ietm/${m}/PMC-${pmc}`);
        const ir = (pms) => { for (const p of (pms || [])) { for (const d of (p.dms || [])) if (d.figures && d.figures.length) R.figuras[d.dmCode.dmc.replace(/^DMC-/, '')] = d.figures.flatMap((f) => (f.sheets || []).map((sh) => [String(f.title || '').replace(/\s+/g, ' '), sh.icn])); ir(p.pm); } };
        if (toc) ir(toc.pm);
      }
    }
    for (const man of ['MM', 'MPI', 'MO']) {
      if (!M.manuais.some((x) => x[0] === man)) continue;
      const d = await g('toc/model/' + m + '/' + man);
      for (const mm of ((d && d.toc && d.toc.manuals) || [])) for (const p of (mm.publications || [])) for (const f of (p.files || [])) M.capitulos.push([man, p.title, p.revision, f.title, f.url]);
    }
    R.modelos[m] = M; console.log('índice', m, M.dms.length, 'módulos', M.capitulos.length, 'capítulos');
  }
  // descrições dos sistemas (texto do manual, para as fichas do 3D)
  const fila = [...descricoes.map((x) => ['d', ...x]), ...ipc.map((x) => ['p', ...x])], total = fila.length; let feitos = 0;
  const trabalhador = async () => { while (fila.length) {
    const [tipo, m, d] = fila.shift();
    try {
      const j = await g(`ietm/${m}/PMC-${d[4]}/DMC-${d[3]}`);
      if (j && j.ietm) { if (tipo === 'd') R.fichas[d[3]] = limpar(j.ietm.module).slice(0, 8000); else R.pecas[d[3]] = pecasIpc(j.ietm.module); }
    } catch (e) { /* segue */ }
    if (++feitos % 200 === 0) console.log('módulos lidos', feitos, '/', total);
  } };
  await Promise.all([1, 2, 3, 4, 5, 6].map(trabalhador));
  console.log('pronto:', Object.keys(R.fichas).length, 'descrições,', Object.keys(R.pecas).length, 'listas de peças (IPC)');
  if (window.__MI_SEM_DOWNLOAD) { window.__MI_R = R; console.log('teste: resultado em window.__MI_R'); return; }
  const baixar = (blob, nome) => { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = nome; document.body.append(a); a.click(); a.remove(); };
  baixar(new Blob([JSON.stringify(R)], { type: 'application/json' }), 'indice_manuais_bell.json');
  // figuras (SVG) dos capítulos escolhidos → salvar em interno/figuras/
  const icns = new Map();
  for (const m of MODELOS) for (const d of (R.modelos[m].dms || [])) if (FIGURAS_CAPS.includes((d[0] || '').slice(0, 2))) for (const [, icn] of (R.figuras[d[3]] || [])) icns.set(icn, m);
  if (icns.size) console.log('baixando', icns.size, 'figuras SVG – mova os arquivos para interno/figuras/');
  for (const [icn, m] of icns) {
    try { const r = await fetch(`https://gateway.bellhelicopter.net/icn/${m}/${icn}`, { credentials: 'include' }); if (r.ok) baixar(await r.blob(), icn + '.svg'); } catch (e) { /* segue */ }
    await new Promise((ok) => setTimeout(ok, 350));
  }
  console.log('fim');
})();
