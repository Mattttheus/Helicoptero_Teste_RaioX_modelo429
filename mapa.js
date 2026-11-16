// Manutenção Interativa – mapa de onde colocar os sensores: números sobre o 3D e folha de instalação para imprimir.
import * as THREE from 'three';

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const hex = (c) => '#' + (c ?? 0xd0d6de).toString(16).padStart(6, '0');

/* ---------- números sobre a vista 3D (atualizados a cada quadro) ---------- */
export class MarcasNumeradas {
  constructor(container) { this.el = document.createElement('div'); this.el.className = 'marcas-num'; container.append(this.el); this.lista = []; this.ativo = false; }
  definir(pontos) { // pontos: [{ n, obter: (Vector3) => void, cor, titulo, id }]
    this.lista = pontos;
    this.el.innerHTML = pontos.map((p) => `<span data-sensor="${esc(p.id)}" title="${esc(p.titulo)}" style="--c:${hex(p.cor)}">${p.n}</span>`).join('');
  }
  mostrar(v) { this.ativo = v; this.el.hidden = !v; }
  atualizar(camera, w, h, destaque) {
    if (!this.ativo) return;
    const v = new THREE.Vector3();
    this.lista.forEach((p, i) => {
      const d = this.el.children[i]; if (!d) return;
      p.obter(v); v.project(camera);
      d.style.display = v.z > 1 ? 'none' : '';
      d.style.left = ((v.x * 0.5 + 0.5) * w) + 'px'; d.style.top = ((-v.y * 0.5 + 0.5) * h) + 'px';
      d.classList.toggle('on', p.id === destaque);
    });
  }
}

/* ---------- captura de vistas com os números desenhados ---------- */
// pontos: [{ n, pos: Vector3 (mundo), dir?: Vector3 (mundo, para onde o sensor "olha"), cor }]
export async function capturarVistas({ renderer, cena, camera, alvo, dist, pontos, vistas, antes, depois, esconder = [], w = 1100, h = 620 }) {
  const salvo = { pos: camera.position.clone(), up: camera.up.clone(), quat: camera.quaternion.clone(), aspect: camera.aspect, pr: renderer.getPixelRatio(), fundo: cena.background,
    tam: renderer.getSize(new THREE.Vector2()) };
  if (antes) antes();
  const vis = esconder.map((o) => o.visible); esconder.forEach((o) => { o.visible = false; });
  cena.background = new THREE.Color(0xf4f6f9);
  renderer.setPixelRatio(1); renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
  const brutas = [];
  for (const vista of vistas) {
    const d = new THREE.Vector3(...vista.dir).normalize();
    camera.position.copy(alvo).addScaledVector(d, dist); camera.up.set(...(vista.up || [0, 1, 0])); camera.lookAt(alvo); camera.updateMatrixWorld();
    renderer.render(cena, camera);
    const url = renderer.domElement.toDataURL('image/png');
    const marcas = pontos.filter((p) => !p.dir || p.dir.dot(d) > -0.2).map((p) => {
      const q = p.pos.clone().project(camera); return { n: p.n, x: (q.x * 0.5 + 0.5) * w, y: (-q.y * 0.5 + 0.5) * h, cor: p.cor };
    }).filter((m) => m.x > 6 && m.x < w - 6 && m.y > 6 && m.y < h - 6);
    brutas.push({ nome: vista.nome, url, marcas });
  }
  // restaura a vista do usuário
  cena.background = salvo.fundo; camera.up.copy(salvo.up); camera.position.copy(salvo.pos); camera.quaternion.copy(salvo.quat);
  renderer.setPixelRatio(salvo.pr); renderer.setSize(salvo.tam.x, salvo.tam.y, false); camera.aspect = salvo.aspect; camera.updateProjectionMatrix();
  esconder.forEach((o, i) => { o.visible = vis[i]; });
  if (depois) depois();
  // desenha os números sobre cada imagem
  const prontas = [];
  for (const b of brutas) {
    const img = await new Promise((ok, erro) => { const i = new Image(); i.onload = () => ok(i); i.onerror = erro; i.src = b.url; });
    const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d');
    g.drawImage(img, 0, 0);
    for (const m of b.marcas) {
      g.beginPath(); g.arc(m.x, m.y, 10, 0, Math.PI * 2); g.fillStyle = hex(m.cor); g.fill(); g.lineWidth = 2; g.strokeStyle = '#ffffff'; g.stroke();
      g.fillStyle = '#10141a'; g.font = 'bold 11px Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(String(m.n), m.x, m.y + 0.5);
    }
    prontas.push({ nome: b.nome, url: c.toDataURL('image/png'), n: b.marcas.length });
  }
  return prontas;
}

/* ---------- folha de instalação sobre a página (imprimir ou salvar em PDF; sem pop-up) ---------- */
export function abrirJanela() {
  document.querySelector('.folha-sens')?.remove();
  const ov = document.createElement('div'); ov.className = 'folha-sens';
  ov.innerHTML = '<div class="folha-pagina"><p class="folha-gerando">Gerando a folha de instalação dos sensores…</p></div>';
  document.body.append(ov);
  return ov;
}
export function escreverFolha(ov, { titulo, subtitulo, imagens, cab, linhas, legenda, nota }) {
  if (!ov) return;
  ov.innerHTML = `<div class="folha-barra"><b>${esc(titulo)}</b><span><button class="folha-bt pri" data-acao="imprimir">Imprimir / salvar em PDF</button><button class="folha-bt" data-acao="fechar">Fechar ✕</button></span></div>
  <div class="folha-pagina">
    <header><h1>${esc(titulo)}</h1><p>${esc(subtitulo)}</p></header>
    ${legenda ? `<div class="folha-leg">${legenda.map(([n, c]) => `<span><i style="background:${hex(c)}"></i>${esc(n)}</span>`).join('')}</div>` : ''}
    <section class="folha-vistas">${imagens.map((i) => `<figure><img src="${i.url}" alt="${esc(i.nome)}"><figcaption>${esc(i.nome)} · ${i.n} pontos visíveis</figcaption></figure>`).join('')}</section>
    <table><tr>${cab.map((c) => `<th>${esc(c)}</th>`).join('')}</tr>
    ${linhas.map((l) => `<tr><td class="n"><span style="background:${hex(l.cor)}">${l.n}</span></td>${l.cols.map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</table>
    <p class="folha-nota">${esc(nota)}</p>
  </div>`;
  ov.onclick = (e) => {
    const a = e.target.dataset.acao;
    if (a === 'fechar') ov.remove();
    if (a === 'imprimir') { document.body.classList.add('imprimir-folha'); const fim = () => { document.body.classList.remove('imprimir-folha'); removeEventListener('afterprint', fim); }; addEventListener('afterprint', fim); window.print(); setTimeout(fim, 1500); }
  };
  ov.scrollTop = 0;
}
