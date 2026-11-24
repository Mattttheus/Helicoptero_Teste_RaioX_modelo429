// Executor dos testes no navegador (testes.html): domínio/aplicação (casos.js), páginas e desempenho.
const saida = document.getElementById('saida'), resumo = document.getElementById('resumo'), palco = document.getElementById('palco');
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
let ok = 0, falha = 0, aviso = 0;
const t = {
  grupo: (n) => saida.insertAdjacentHTML('beforeend', `<h2>${esc(n)}</h2>`),
  ok: (n, cond, det = '', nivel = null) => {
    if (cond) ok++; else if (nivel === 'aviso') aviso++; else falha++;
    const cls = cond ? 'ok' : nivel === 'aviso' ? 'av' : 'er';
    saida.insertAdjacentHTML('beforeend', `<div class="l ${cls}">${cond ? '✔' : nivel === 'aviso' ? '⚠' : '✘'} ${esc(n)}${!cond && det ? ' → ' + esc(det) : ''}</div>`);
    atualizar();
  }
};
const atualizar = (fim) => { resumo.innerHTML = `<b class="ok">${ok} ok</b> · <b class="er">${falha} falhas</b> · <b class="av">${aviso} avisos</b>${fim ? ' · concluído' : ' · rodando…'}`; };
// ambiente: carrega scripts clássicos de domínio num iframe isolado (cada carga começa limpa)
const amb = {
  existe: async (p) => { try { return (await fetch(p, { method: 'HEAD', cache: 'no-cache' })).ok; } catch { return false; } },
  carregar: (arqs) => new Promise((ok, erro) => {
    const f = document.createElement('iframe'); f.style.display = 'none'; f.srcdoc = '<!DOCTYPE html><html><head></head><body></body></html>';
    f.onload = async () => {
      const w = f.contentWindow;
      try {
        for (const a of arqs) await new Promise((r, e) => { const s = w.document.createElement('script'); s.src = new URL(a, location.href).href + '?t=' + Date.now(); s.onload = r; s.onerror = () => e(new Error('não carregou ' + a)); w.document.head.append(s); });
        const copia = {}; for (const k of ['CATALOGO', 'HELI', 'MOTOR', 'COMANDOS']) if (w[k]) copia[k] = w[k];
        f.remove(); ok(copia);
      } catch (e) { f.remove(); erro(e); }
    };
    document.body.append(f);
  })
};
async function testesUnitarios() {
  const { executar } = await import('./casos.js?t=' + Date.now());
  try { await executar(t, amb); } catch (e) { t.ok('execução dos testes', false, e.message); }
}
// páginas: abre cada uma no palco, espera o 3D e confere a caixa de erro e o console
function abrir(url, espera = 4500) {
  return new Promise((r) => {
    const t0 = performance.now(); let carregou = 0;
    palco.onload = () => { carregou = performance.now() - t0; setTimeout(() => {
      const d = palco.contentDocument, e = d && d.getElementById('erro');
      r({ carregou, erro: e && !e.hidden ? e.textContent.trim().slice(0, 160) : '', canvas: !!(d && d.querySelector('canvas')), janela: palco.contentWindow });
    }, espera); };
    palco.src = url;
  });
}
function medirFps(w, ms = 3000) { // termina sempre (janela oculta congela a animação → 0 fps, informado como aviso)
  return new Promise((r) => {
    let n = 0, fim = false; const t0 = performance.now();
    const f = () => { if (fim) return; n++; w.requestAnimationFrame(f); }; w.requestAnimationFrame(f);
    setTimeout(() => { fim = true; r(n * 1000 / (performance.now() - t0)); }, ms);
  });
}
async function testesPaginas() {
  const cat = (await amb.carregar(['src/dominio/frota/catalogo.js'])).CATALOGO;
  t.grupo('Apresentação · páginas (todas as páginas × todos os modelos)');
  const paginas = [['index.html', false], ['atlas.html', false], ['motores.html', true]];
  for (const c of cat) for (const pg of ['manual', 'motor', 'comandos', 'cabine']) paginas.push([`${pg}.html?m=${c.id}`, true]);
  const tempos = [];
  for (const [url, tem3d] of paginas) {
    const r = await abrir(url, tem3d ? 4500 : 2500);
    t.ok(`${url} abre sem erro (${(r.carregou / 1000).toFixed(1)} s)${tem3d ? (r.canvas ? ' · 3D ok' : '') : ''}`, !r.erro && (!tem3d || r.canvas), r.erro || (tem3d && !r.canvas ? 'sem canvas 3D' : ''));
    tempos.push([url, r.carregou]);
  }
  t.grupo('Desempenho (quadros por segundo com a página aberta)');
  const linhas = [];
  for (const url of ['manual.html?m=429', 'motor.html?m=407', 'cabine.html?m=407', 'comandos.html?m=505']) {
    const r = await abrir(url, 3500); const fps = await medirFps(r.janela);
    linhas.push([url, fps, r.carregou]);
    t.ok(`${url}: ${fps.toFixed(0)} fps · abertura ${(r.carregou / 1000).toFixed(1)} s`, fps >= 24, document.hidden || fps < 1 ? 'janela de testes oculta ou minimizada: deixe-a visível para medir o FPS' : 'abaixo de 24 fps: a resolução adaptativa vai reduzir; ou desligue o HD', fps >= 24 ? null : 'aviso');
  }
  saida.insertAdjacentHTML('beforeend', `<table><tr><th>Página</th><th>Abertura</th><th>FPS</th></tr>${linhas.map(([u, f, c]) => `<tr><td>${esc(u)}</td><td>${(c / 1000).toFixed(1)} s</td><td>${f.toFixed(0)}</td></tr>`).join('')}</table>`);
  palco.src = 'about:blank';
}
const rodar = async (fn) => { ok = falha = aviso = 0; saida.innerHTML = ''; atualizar(); await fn(); atualizar(true); };
document.getElementById('btTudo').onclick = () => rodar(async () => { await testesUnitarios(); await testesPaginas(); });
document.getElementById('btUnit').onclick = () => rodar(testesUnitarios);
document.getElementById('btPag').onclick = () => rodar(testesPaginas);
const PARAM = new URLSearchParams(location.search);
// Rotina noturna (tarefa agendada): roda tudo, grava o resultado no registro local e faz a cópia de segurança versionada.
// Nada sai da máquina: o registro e o .zip ficam em C:\\wamp64.1\\backups\\ManutencaoInterativa.
async function rotinaNoturna(codigo) {
  await rodar(async () => { await testesUnitarios(); await testesPaginas(); });
  const problemas = [...saida.querySelectorAll('.l.er, .l.av')].map((e) => e.textContent.trim()).slice(0, 40);
  const url = (acao) => 'ferramentas/rotina_noturna.php?acao=' + acao + '&ok=' + encodeURIComponent(codigo);
  let reg = '', bkp = '';
  try { reg = await (await fetch(url('registrar'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ok, falha, aviso, problemas }) })).text(); } catch (e) { reg = 'erro: ' + e.message; }
  try { bkp = await (await fetch(url('backup'), { method: 'POST' })).text(); } catch (e) { bkp = 'erro: ' + e.message; }
  window.RESULTADO_NOTURNO = { ok, falha, aviso, problemas, registro: reg.trim(), backup: bkp.trim() };
  resumo.insertAdjacentHTML('beforeend', `<div>Rotina noturna: ${esc(reg.trim())} · ${esc(bkp.trim())}</div>`);
}
if (PARAM.has('noturno')) rotinaNoturna(PARAM.get('noturno'));
else if (PARAM.has('auto')) document.getElementById('btTudo').click();
