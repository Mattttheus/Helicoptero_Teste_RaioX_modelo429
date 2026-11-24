// HeliSense 3D – referências da peça: aparência real (fichas do atlas em alta definição),
// PN e procedimentos (dados locais dos manuais Bell) e visor com zoom (apresentação).
import { FICHAS, arquivoFicha, capituloDe } from '../../dominio/documentacao/atlas.js?v=20261123a';

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// Bloco para a ficha de uma peça/componente: imagens reais + atalhos para PN e procedimentos
export function blocoReferencias(ref, modelo) {
  if (!ref) return '';
  const lista = ref.fichas || [];
  const q = encodeURIComponent(ref.busca || '');
  return `<h3>Aparência real, PN e procedimentos</h3>
    ${lista.length ? `<div class="atlas-mini" data-lista="${lista.join(',')}">${lista.map((n) => `<button class="atlas-ficha" data-atlas="${n}" title="Ficha ${n} – ${esc(FICHAS[n])}">
      <img src="${arquivoFicha(n, true)}" alt="" loading="lazy" onerror="this.closest('.atlas-ficha').classList.add('sem-img')"><span><b>${String(n).padStart(3, '0')}</b> ${esc(FICHAS[n])}</span></button>`).join('')}</div>` : ''}
    <div class="linha">
      <a class="bt pri" href="comandos.html?m=${encodeURIComponent(modelo)}&q=${q}#procedimentos" title="Procedimentos, torques, ferramentas e PN nos dados locais dos manuais Bell">Procedimentos e PN ›</a>
      <a class="bt" href="comandos.html?m=${encodeURIComponent(modelo)}&q=${q}#estrutura" title="Catálogo de peças (IPC/IPB): conjunto → item → PN">Catálogo de peças (IPC) ›</a>
      <a class="bt" href="atlas.html?f=${lista[0] || 1}" title="Atlas visual completo">Atlas ›</a>
    </div>
    <p class="nota">Fichas do atlas: representação conceitual para estudo. O PN, o procedimento e os limites válidos são sempre os do manual do fabricante (termo buscado: <i>${esc(ref.busca || '')}</i>).</p>`;
}

/* ---------------- visor em tela cheia com zoom e arraste ---------------- */
let visor = null, lista = [], idx = 0, z = 1, px = 0, py = 0;
function criarVisor() {
  visor = document.createElement('div'); visor.id = 'atlasVisor'; visor.hidden = true;
  visor.innerHTML = `<div class="av-topo"><b class="av-tit"></b><span class="av-cap"></span>
      <button data-av="menos" title="Diminuir">−</button><button data-av="ajustar" title="Ajustar à tela">⤢</button><button data-av="mais" title="Aumentar">+</button>
      <button data-av="ant" title="Ficha anterior">‹</button><button data-av="prox" title="Próxima ficha">›</button>
      <a class="av-hd" target="_blank" rel="noopener" title="Abrir a imagem em alta definição">HD ↗</a><button data-av="fechar" title="Fechar (Esc)">✕</button></div>
    <div class="av-palco"><img class="av-img" alt="" draggable="false"></div>
    <div class="av-dica">Role para aproximar · arraste para mover · ← → troca de ficha · Esc fecha</div>`;
  document.body.append(visor);
  const img = visor.querySelector('.av-img'), palco = visor.querySelector('.av-palco');
  const aplicar = () => { img.style.transform = `translate(${px}px, ${py}px) scale(${z})`; };
  visor.aplicar = aplicar;
  palco.addEventListener('wheel', (e) => {
    e.preventDefault(); const r = palco.getBoundingClientRect(), mx = e.clientX - r.left - r.width / 2, my = e.clientY - r.top - r.height / 2;
    const nz = Math.min(8, Math.max(0.3, z * (e.deltaY < 0 ? 1.15 : 1 / 1.15))); px = mx - (mx - px) * nz / z; py = my - (my - py) * nz / z; z = nz; aplicar();
  }, { passive: false });
  let arr = null;
  palco.addEventListener('pointerdown', (e) => { arr = { x: e.clientX - px, y: e.clientY - py }; palco.setPointerCapture(e.pointerId); });
  palco.addEventListener('pointermove', (e) => { if (arr) { px = e.clientX - arr.x; py = e.clientY - arr.y; aplicar(); } });
  palco.addEventListener('pointerup', () => { arr = null; });
  visor.addEventListener('click', (e) => {
    const b = e.target.closest('[data-av]'); if (!b) return;
    const a = b.dataset.av;
    if (a === 'fechar') fecharVisor(); else if (a === 'mais') { z = Math.min(8, z * 1.3); aplicar(); } else if (a === 'menos') { z = Math.max(0.3, z / 1.3); aplicar(); }
    else if (a === 'ajustar') ajustar(); else if (a === 'ant') mostrar(idx - 1); else if (a === 'prox') mostrar(idx + 1);
  });
  addEventListener('keydown', (e) => {
    if (visor.hidden) return;
    if (e.key === 'Escape') fecharVisor(); else if (e.key === 'ArrowRight') mostrar(idx + 1); else if (e.key === 'ArrowLeft') mostrar(idx - 1);
  });
  img.addEventListener('load', ajustar);
}
function ajustar() {
  const img = visor.querySelector('.av-img'), palco = visor.querySelector('.av-palco');
  z = Math.min(palco.clientWidth / (img.naturalWidth || 1), palco.clientHeight / (img.naturalHeight || 1)) * 0.98; px = py = 0; visor.aplicar();
}
function mostrar(i) {
  if (!lista.length) return;
  idx = (i + lista.length) % lista.length; const n = lista[idx];
  visor.querySelector('.av-tit').textContent = `Ficha ${String(n).padStart(3, '0')} · ${FICHAS[n] || ''}`;
  visor.querySelector('.av-cap').textContent = capituloDe(n);
  const img = visor.querySelector('.av-img'); img.src = arquivoFicha(n); visor.querySelector('.av-hd').href = arquivoFicha(n);
}
export function abrirVisor(n, fichas) {
  if (!visor) criarVisor();
  lista = fichas && fichas.length ? fichas : [n]; visor.hidden = false; mostrar(Math.max(0, lista.indexOf(n)));
}
export function fecharVisor() { if (visor) visor.hidden = true; }

// cliques em [data-atlas] (miniaturas) abrem o visor, navegando pelas fichas do mesmo grupo
export function ligarVisor(raiz = document) {
  raiz.addEventListener('click', (e) => {
    const b = e.target.closest('[data-atlas]'); if (!b) return;
    e.preventDefault(); e.stopPropagation();
    const grupo = b.closest('[data-lista]'), fichas = grupo ? grupo.dataset.lista.split(',').map(Number) : [+b.dataset.atlas];
    abrirVisor(+b.dataset.atlas, fichas);
  }, true);
}
