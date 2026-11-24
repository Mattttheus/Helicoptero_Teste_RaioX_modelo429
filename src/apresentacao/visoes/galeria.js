// Galeria de fotos realistas (renderizadas no Blender – assets/renders/<prefixo>_<vista>.png). Abre em tela cheia, setas/Esc.
const VISTAS = [['34_frente', '3/4 frontal'], ['lateral', 'Lateral'], ['34_tras', '3/4 traseira'], ['cima', 'Vista superior'],
  ['detalhe_34_frente', 'Detalhe – 3/4 frontal'], ['detalhe_lateral', 'Detalhe – lateral'], ['detalhe_34_tras', 'Detalhe – cauda'], ['detalhe_cima', 'Detalhe – superior']];
async function existe(u) { try { return (await fetch(u, { method: 'HEAD', cache: 'no-cache' })).ok; } catch { return false; } }
// fotos: renders do Blender (modelo real e do código) + fotos reais com licença livre (assets/fotos/<chave>/creditos.json)
export async function fotosDisponiveis(chave, { codigo = true } = {}) {
  const r = [];
  const prefixos = [[chave, 'Render'], ...(codigo && chave.startsWith('heli_') ? [[chave + '_codigo', 'Render do modelo do sistema']] : [])];
  const cand = prefixos.flatMap(([p, rot]) => VISTAS.map(([v, n]) => ({ u: `assets/renders/${p}_${v}.png`, n: `${rot} · ${n}` })));
  // versão com tratamento fotográfico (assets/renders/realce/*.jpg) quando existir; senão o render original
  const realce = (u) => u.replace('assets/renders/', 'assets/renders/realce/').replace(/\.png$/, '.jpg');
  const [ok, okR] = await Promise.all([Promise.all(cand.map((c) => existe(c.u))), Promise.all(cand.map((c) => existe(realce(c.u))))]);
  cand.forEach((c, k) => { if (okR[k]) r.push({ ...c, u: realce(c.u), original: c.u }); else if (ok[k]) r.push(c); });
  try {
    const c = await (await fetch(`assets/fotos/${chave}/creditos.json`, { cache: 'no-cache' })).json();
    for (const f of c) r.push({ u: `assets/fotos/${chave}/${f.arquivo}`, n: 'Foto real' + (f.nota ? ` (${f.nota})` : ''), credito: `${f.autor} · ${f.licenca}`, origem: f.origem });
  } catch { /* sem fotos reais */ }
  return r;
}
export function abrirGaleria(fotos, titulo = '') {
  if (!fotos.length) return;
  let i = 0;
  const el = document.createElement('div');
  el.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(5,8,12,.94);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;color:#dfe6ee;font:14px system-ui';
  el.innerHTML = `<img style="max-width:94vw;max-height:80vh;border-radius:8px;box-shadow:0 8px 40px #000"><div class="leg"></div>
    <div style="display:flex;gap:8px"><button class="bt" data-g="-1">‹ Anterior</button><a class="bt" target="_blank" download>Baixar</a><button class="bt" data-g="1">Próxima ›</button><button class="bt" data-g="x">Fechar</button></div>
    <div class="cred" style="opacity:.7;font-size:12px;max-width:90vw;text-align:center"></div>`;
  const img = el.querySelector('img'), leg = el.querySelector('.leg'), a = el.querySelector('a'), cred = el.querySelector('.cred');
  const mostrar = () => {
    const f = fotos[i]; img.src = f.u; a.href = f.u; leg.textContent = `${titulo} · ${f.n} (${i + 1}/${fotos.length})`;
    cred.innerHTML = '';
    if (f.credito) { cred.append('Foto: ' + f.credito.replace(/\s+/g, ' ') + ' · '); const l = document.createElement('a'); l.href = f.origem; l.target = '_blank'; l.rel = 'noopener'; l.textContent = 'origem (Wikimedia Commons)'; l.style.color = '#8fc3ff'; cred.append(l); }
    else cred.textContent = 'Render fotorrealista (Blender Cycles) – visual de referência, não substitui o manual.';
  };
  const fechar = () => { el.remove(); removeEventListener('keydown', tecla); };
  const tecla = (e) => { if (e.key === 'Escape') fechar(); else if (e.key === 'ArrowRight') { i = (i + 1) % fotos.length; mostrar(); } else if (e.key === 'ArrowLeft') { i = (i - 1 + fotos.length) % fotos.length; mostrar(); } };
  el.addEventListener('click', (e) => { const g = e.target.dataset.g; if (e.target === el || g === 'x') fechar(); else if (g) { i = (i + +g + fotos.length) % fotos.length; mostrar(); } });
  addEventListener('keydown', tecla); document.body.append(el); mostrar();
}
