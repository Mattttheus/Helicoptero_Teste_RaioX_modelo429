/* Manutenção Interativa – baixa do portal Bell os dados para a cópia INTERNA (material proprietário: não publicar).
   Rode no Chrome, logado em https://www.bellhelicopter.net/tp/ : F12 → Console → colar → Enter (pode pedir "allow pasting").
   O Chrome pede uma vez para "permitir vários downloads": aceite. Demora (dezenas de minutos para a frota toda):
   deixe a aba aberta e acompanhe o progresso no Console.

   Um arquivo por aeronave: dados_<modelo>.zip. Extraia cada um em  dados\<modelo>\  da instalação local (WAMP):
     dados/<modelo>/indice.json   procedimentos, descrições de sistemas, peças do IPC/IPB, lista de figuras e páginas
     dados/<modelo>/textos.json   texto completo de cada procedimento (IETM) ou de cada página (manuais por capítulo)
     dados/<modelo>/figuras/      figuras: SVG do IETM e PNG das páginas de figura
   Somente na rede local – material proprietário Bell, não publicar em repositório online.

   Ajustes: MODELOS (modelos a baixar), TEXTOS (true/false), FIGURAS ('todas', lista de capítulos ATA como ['67','76'] ou []). */
(async () => {
  const MODELOS = window.__MI_MODELOS || ['505', '407', '407GXi', '429', '206B', '206L4', '230', '430'];
  const TEXTOS = window.__MI_TEXTOS ?? true;
  const FIGURAS = window.__MI_FIGURAS ?? 'todas';
  const PARALELO = 6;
  const GW = 'https://gateway.bellhelicopter.net/';
  const g = async (u, tipo = 'json') => { for (let t = 0; t < 3; t++) { try { const r = await fetch(GW + u, { credentials: 'include' }); if (r.ok) return tipo === 'json' ? r.json() : r.blob(); if (r.status === 404) return null; } catch (e) { /* tenta de novo */ } await new Promise((ok) => setTimeout(ok, 800 * (t + 1))); } return null; };
  const emParalelo = async (itens, fn, rotulo) => { const fila = itens.slice(); let n = 0; await Promise.all(Array.from({ length: PARALELO }, async () => { while (fila.length) { const x = fila.shift(); try { await fn(x); } catch (e) { /* segue */ } if (++n % 200 === 0) console.log(rotulo, n, '/', itens.length); } })); };
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
  const pecasIpc = (html) => {
    const d = document.createElement('div'); d.innerHTML = html;
    return [...d.querySelectorAll('tr.ietm_ipd_item')].map((tr) => {
      const td = tr.querySelectorAll('td'), c2 = td[2]; if (!c2) return null;
      const extra = [...c2.querySelectorAll('div')].map((e) => e.textContent.trim().replace(/\s+/g, ' ')).filter(Boolean).join('; ');
      return [td[0].textContent.trim(), td[1].textContent.trim(), (c2.querySelector('span') || c2).textContent.trim().replace(/\s+/g, ' '), extra, td[3] ? td[3].textContent.trim() : '', td[5] ? td[5].textContent.trim() : ''];
    }).filter(Boolean);
  };
  const baixar = (blob, nome) => { if (window.__MI_SEM_DOWNLOAD) { (window.__MI_ARQ ??= {})[nome] = blob; return; } const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = nome; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 60000); };
  const json = (o) => new Blob([JSON.stringify(o)], { type: 'application/json' });
  // ZIP (deflate) montado no navegador: um arquivo por modelo em vez de milhares de downloads
  const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  const crc32 = (u8) => { let c = 0xffffffff; for (let i = 0; i < u8.length; i++) c = CRC[(c ^ u8[i]) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  function novoZip() {
    const partes = [], central = []; let pos = 0;
    return {
      async add(nome, blob) {
        const dados = new Uint8Array(await blob.arrayBuffer()), crc = crc32(dados);
        const comp = new Uint8Array(await new Response(new Blob([dados]).stream().pipeThrough(new CompressionStream('deflate-raw'))).arrayBuffer());
        const nm = new TextEncoder().encode(nome), h = new DataView(new ArrayBuffer(30));
        h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(8, 8, true); h.setUint16(12, 23585, true); h.setUint32(14, crc, true);
        h.setUint32(18, comp.length, true); h.setUint32(22, dados.length, true); h.setUint16(26, nm.length, true);
        partes.push(h, nm, comp);
        const c = new DataView(new ArrayBuffer(46));
        c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(10, 8, true); c.setUint16(14, 23585, true); c.setUint32(16, crc, true);
        c.setUint32(20, comp.length, true); c.setUint32(24, dados.length, true); c.setUint16(28, nm.length, true); c.setUint32(42, pos, true);
        central.push(c, nm); pos += 30 + nm.length + comp.length;
      },
      fim() {
        const tam = central.reduce((a, p) => a + (p.byteLength ?? p.length), 0), n = central.length / 2, e = new DataView(new ArrayBuffer(22));
        e.setUint32(0, 0x06054b50, true); e.setUint16(8, n, true); e.setUint16(10, n, true); e.setUint32(12, tam, true); e.setUint32(16, pos, true);
        return new Blob([...partes, ...central, e], { type: 'application/zip' });
      }
    };
  }
  const quer = (cap) => FIGURAS === 'todas' || (Array.isArray(FIGURAS) && FIGURAS.includes(cap));
  // catálogo dos manuais por capítulo (IPB): índice/PN por figura e nomenclaturas da página
  const ipbPagina = (t) => {
    if (!t || !t.includes('PART NUMBER') || !t.includes('ITEM NAME')) return null;
    const PN = /^(?=.*\d)[A-Z0-9][A-Z0-9./-]{3,}$/, fig = t.match(/Figure\s+(\d+-\d+[A-Z]?)\.\s*([^\n]+)/);
    const toks = t.split('PART NUMBER')[1].split('(3)')[0].split(/\s+/).filter(Boolean), rows = []; let idx = '-';
    for (let i = 0; i < toks.length; i++) {
      const tk = toks[i];
      if (/^\d{1,3}[A-Z]?$/.test(tk) && PN.test(toks[i + 1] || '') && !/^\d{1,3}$/.test(toks[i + 1])) { idx = tk; rows.push([idx, toks[++i]]); continue; }
      if (PN.test(tk) && !/^\d{1,3}[A-Z]?$/.test(tk)) rows.push([idx, tk]);
    }
    const nomes = t.split('ITEM NAME')[1].replace(/Figure\s+\d+-\d+[A-Z]?\.[^\n]*\n/, '').split(/(?:\s?\.){4,}/)
      .map((sg) => sg.trim().replace(/^(?:\d+|AR|REF)?(?:NP|SP|P|X)?\s*/, '').replace(/\s+/g, ' ').replace(/^[ .]+|[ .]+$/g, '')).filter((n) => n && !/^[\d\sNPSX]*$/.test(n));
    return { fig: fig ? fig[1] : '', titulo: fig ? fig[2].split(/\s\.\s?\./)[0].trim().slice(0, 120) : '', rows, nomes };
  };

  const R = { gerado: new Date().toISOString(), fonte: 'https://www.bellhelicopter.net/tp/', modelos: {}, fichas: {}, pecas: {}, figuras: {}, paginas: {} };
  for (const m of MODELOS) {
    const M = { manuais: [], sistemas: {}, dms: [], capitulos: [] }; R.modelos[m] = M; const ipb = {};
    const t = await g('toc/model/' + m); M.manuais = ((t && t.toc) || []).map((x) => [x.toc, x.manual]);
    const TX = {}; const zip = novoZip(); let nFig = 0;
    const s = await g('toc/sns/' + m);
    if (s && s.sns && s.sns.length) {
      // ---------- IETM (S1000D): índice, descrições, IPC, textos e figuras ----------
      const vistos = new Set();
      const andar = (nos, cam) => { for (const c of nos) {
        if (c.type === 'dmc') { if (vistos.has(c.dmc)) continue; vistos.add(c.dmc); M.dms.push([cam[cam.length - 1] || '', c.title, c.subtitle, c.dmc.replace(/^DMC-/, ''), c.pmc.replace(/^PMC-/, ''), c.applic && c.applic.text !== 'ALL' ? c.applic.text : '']); }
        else { M.sistemas[c.id] = c.title; andar(c.children || [], [...cam, c.id]); }
      } };
      andar(s.sns, []);
      for (const pmc of new Set(M.dms.map((d) => d[4]))) {
        const toc = await g(`toc/ietm/${m}/PMC-${pmc}`);
        const ir = (pms) => { for (const p of (pms || [])) { for (const d of (p.dms || [])) if (d.figures && d.figures.length) R.figuras[d.dmCode.dmc.replace(/^DMC-/, '')] = d.figures.flatMap((f) => (f.sheets || []).map((sh) => [String(f.title || '').replace(/\s+/g, ' '), sh.icn])); ir(p.pm); } };
        if (toc) ir(toc.pm);
      }
      console.log(m, 'índice:', M.dms.length, 'módulos – lendo os módulos…');
      await emParalelo(M.dms, async (d) => {
        const j = await g(`ietm/${m}/PMC-${d[4]}/DMC-${d[3]}`); if (!j || !j.ietm) return;
        if (/-94\dA-/.test(d[3])) R.pecas[d[3]] = pecasIpc(j.ietm.module);
        else { const txt = limpar(j.ietm.module); if (/-04[0-2]A-/.test(d[3])) R.fichas[d[3]] = txt; if (TEXTOS) TX[d[3]] = txt; }
      }, m + ' módulos');
      const icns = new Map(); for (const d of M.dms) if (quer((d[0] || '').slice(0, 2))) for (const [, icn] of (R.figuras[d[3]] || [])) icns.set(icn, 1);
      console.log(m, 'figuras:', icns.size);
      await emParalelo([...icns.keys()], async (icn) => { const b = await g(`icn/${m}/${icn}`, 'blob'); if (b) { await zip.add(`figuras/${icn}.svg`, b); nFig++; } }, m + ' figuras');
    } else {
      // ---------- manuais por capítulo (206B, 206L4, 230, 430…): texto de todas as páginas e páginas de figura ----------
      for (const man of ['MM', 'MPI', 'MO', 'IPB']) {
        if (!M.manuais.some((x) => x[0] === man)) continue;
        const d = await g('toc/model/' + m + '/' + man);
        for (const mm of ((d && d.toc && d.toc.manuals) || [])) for (const p of (mm.publications || [])) for (const f of (p.files || [])) M.capitulos.push([man, p.title, p.revision, f.title, f.url]);
      }
      console.log(m, 'capítulos:', M.capitulos.length, '– lendo as páginas…');
      for (const c of M.capitulos.filter((c) => !window.__MI_SO_CAP || window.__MI_SO_CAP.some((k) => c[3].includes('Chapter ' + k)))) {
        const id = c[4].split('/').pop(), md = await g('metadata/' + id); if (!md) continue;
        const figs = md.pages.filter((p) => p.figName).map((p) => [p.page, p.figName]);
        R.paginas[id] = { n: md.nbPages, figs, path: md.path };
        const pags = new Array(md.nbPages).fill(''); await emParalelo(md.pages.map((p) => p.page), async (n) => { const r = await g(`fulltext/${id}?page=${n}`); if (r) pags[n - 1] = String(r.value || '').replace(/[ \t]+/g, ' ').replace(/\n{2,}/g, '\n').trim(); }, id + ' páginas');
        if (TEXTOS) TX[id] = pags;
        if (/IPB/.test(id)) pags.forEach((t, i) => { const r = ipbPagina(t); if (r && r.rows.length) (ipb[id] ??= []).push({ p: i + 1, fig: r.fig, titulo: r.titulo, rows: r.rows, nomes: r.nomes }); });
        const cap = ((c[3].match(/Chapter\s+(\d+)/i) || [])[1] || '').padStart(2, '0');
        if (quer(cap) || (FIGURAS === 'todas')) await emParalelo(figs, async ([n, fig]) => { const b = await g(`png/${id}?path=${encodeURIComponent(md.path)}&p=${n}`, 'blob'); if (b) { await zip.add(`figuras/${id}_p${n}.png`, b); nFig++; } }, id + ' figuras');
      }
    }
    // pacote da aeronave: indice.json + textos.json + figuras/ num único dados_<modelo>.zip
    const dm = new Set(M.dms.map((d) => d[3])), docs = new Set(M.capitulos.map((c) => c[4].split('/').pop())), so = (o, ks) => Object.fromEntries(Object.entries(o).filter(([k]) => ks.has(k)));
    const I = { modelo: m, gerado: R.gerado, fonte: R.fonte, manuais: M.manuais, sistemas: M.sistemas, dms: M.dms, capitulos: M.capitulos,
      fichas: so(R.fichas, dm), pecas: so(R.pecas, dm), figuras: so(R.figuras, dm), paginas: so(R.paginas, docs), ipb };
    await zip.add('indice.json', json(I));
    if (TEXTOS) await zip.add('textos.json', json(TX));
    if (window.__MI_SEM_DOWNLOAD) { window.__MI_TX = TX; window.__MI_I = I; }
    baixar(zip.fim(), `dados_${m}.zip`);
    console.log('✔', m, 'pronto –', nFig, 'figuras – extraia dados_' + m + '.zip em dados\\' + m + '\\');
  }
  if (window.__MI_SEM_DOWNLOAD) { window.__MI_R = R; console.log('teste: resultado em window.__MI_R'); return; }
  console.log('FIM – extraia cada dados_<modelo>.zip na pasta dados\\<modelo>\\ da instalação local.');
})();
