// HeliSense 3D – página do Atlas visual: catálogo das 120 fichas, busca no texto (OCR) e visor com zoom.
import { FICHAS, CAPITULOS, arquivoFicha } from '../../dominio/documentacao/atlas.js?v=20261123a';
import { ligarVisor, abrirVisor } from '../visoes/atlas_visor.js?v=20261123a';

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const sem = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
let TEXTO = {};
const lista = document.getElementById('lista');

function desenhar(q = '') {
  const t = sem(q).trim();
  const ok = (n) => !t || sem(FICHAS[n]).includes(t) || sem(TEXTO[n]).includes(t);
  lista.innerHTML = CAPITULOS.map(([a, b, nome]) => {
    const ns = []; for (let n = a; n <= b; n++) if (FICHAS[n] && ok(n)) ns.push(n);
    if (!ns.length) return '';
    return `<h2>${esc(nome)} <small style="color:#8fa1b5">(${ns.length})</small></h2><div class="atlas-mini" data-lista="${ns.join(',')}">${ns.map((n) => {
      let trecho = '';
      if (t && !sem(FICHAS[n]).includes(t) && TEXTO[n]) { const i = sem(TEXTO[n]).indexOf(t); trecho = '…' + TEXTO[n].slice(Math.max(0, i - 40), i + 60) + '…'; }
      return `<button class="atlas-ficha" data-atlas="${n}"><img src="${arquivoFicha(n, true)}" alt="" loading="lazy" onerror="this.closest('.atlas-ficha').classList.add('sem-img')"><span><b>${String(n).padStart(3, '0')}</b> ${esc(FICHAS[n])}${trecho ? `<i class="trecho">${esc(trecho)}</i>` : ''}</span></button>`;
    }).join('')}</div>`;
  }).join('') || '<p class="nota">Nada encontrado.</p>';
}
ligarVisor(document);
document.getElementById('busca').addEventListener('input', (e) => desenhar(e.target.value));
desenhar();
fetch('dados/atlas/indice.json').then((r) => (r.ok ? r.json() : [])).then((j) => { for (const f of j) TEXTO[f.n] = f.texto; }).catch(() => {});
const f = +new URLSearchParams(location.search).get('f'); if (f && FICHAS[f]) abrirVisor(f);
