// HeliSense 3D – estilo "figura de catálogo (IPC)": desenho técnico com contorno preto sobre fundo branco,
// peças em foco em ciano e chamadas numeradas com linha de chamada (como nas figuras do IPC / manual da Bell).
// Só troca os materiais no instante de desenhar (não mexe na lógica de seleção, raio-X, calor etc. de cada página).
import * as THREE from 'three';

const BRANCO = new THREE.MeshBasicMaterial({ color: 0xffffff, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1, side: THREE.DoubleSide });
const CIANO = new THREE.MeshBasicMaterial({ color: 0x7fe6ef, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1, side: THREE.DoubleSide });
const VIDRO = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.15, depthWrite: false, side: THREE.DoubleSide });
const LINHA = new THREE.LineBasicMaterial({ color: 0x1b1f24 });
const LINHA_CLARA = new THREE.LineBasicMaterial({ color: 0x9aa1aa, transparent: true, opacity: 0.6 });
const LINHA_CIANO = new THREE.LineBasicMaterial({ color: 0x0b4a52 });
const FUNDO = new THREE.Color(0xffffff);

export function criarEstiloIPC(renderer, cena) {
  let ativo = false;
  const contornos = new Map(); // mesh → LineSegments
  function contorno(m) {
    let l = contornos.get(m);
    if (!l && m.geometry && m.geometry.attributes.position) {
      l = new THREE.LineSegments(new THREE.EdgesGeometry(m.geometry, 28), LINHA); l.raycast = () => {}; l.userData.ipc = true;
      m.add(l); contornos.set(m, l);
    }
    return l;
  }
  return {
    get ativo() { return ativo; },
    ligar(v) { ativo = v; if (!v) for (const l of contornos.values()) l.visible = false; },
    // desenha a cena no estilo IPC; destaque(mesh) → true se a peça está em foco
    desenhar(camera, malhas, destaque, vidro = () => false) {
      const salvo = { bg: cena.background, env: cena.environment, tm: renderer.toneMapping, fog: cena.fog };
      cena.background = FUNDO; cena.environment = null; cena.fog = null; renderer.toneMapping = THREE.NoToneMapping;
      const trocas = [];
      for (const m of malhas) {
        if (!m.isMesh) continue;
        trocas.push([m, m.material]);
        const em = destaque(m), vd = !em && vidro(m);
        m.material = em ? CIANO : vd ? VIDRO : BRANCO;
        const l = contorno(m); if (l) { l.visible = m.visible; l.material = em ? LINHA_CIANO : vd ? LINHA_CLARA : LINHA; }
      }
      // esconde o que não é peça (chão, sombras, grade, partículas) para ficar como figura de catálogo
      const ocultos = [];
      const nas = new Set(malhas);
      cena.traverse((o) => { if ((o.isMesh || o.isPoints || o.isLine || o.isSprite) && !o.userData.ipc && !nas.has(o) && o.visible) { ocultos.push(o); o.visible = false; } });
      renderer.render(cena, camera);
      for (const o of ocultos) o.visible = true;
      for (const [m, mat] of trocas) m.material = mat;
      for (const l of contornos.values()) l.visible = false;
      cena.background = salvo.bg; cena.environment = salvo.env; cena.fog = salvo.fog; renderer.toneMapping = salvo.tm;
    }
  };
}

// chamadas numeradas (balão + linha de chamada) num SVG por cima do 3D; itens: [{ n, pos: Vector3 (mundo) }]
export function desenharChamadas(svg, itens, camera, w, h) {
  if (!svg) return;
  svg.setAttribute('width', w); svg.setAttribute('height', h); svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
  const v = new THREE.Vector3(); let html = '';
  itens.forEach((it, k) => {
    v.copy(it.pos).project(camera); if (v.z > 1) return;
    const x = (v.x * 0.5 + 0.5) * w, y = (-v.y * 0.5 + 0.5) * h;
    const lado = x < w / 2 ? -1 : 1, bx = Math.min(w - 16, Math.max(16, x + lado * (60 + (k % 3) * 18))), by = Math.max(16, y - 50 - (k % 2) * 22);
    html += `<line x1="${bx}" y1="${by}" x2="${x}" y2="${y}" stroke="#111" stroke-width="1.2"/><circle cx="${x}" cy="${y}" r="2.5" fill="#111"/>`
      + `<text x="${bx}" y="${by + 5}" text-anchor="middle" font-size="15" font-weight="700" font-family="Arial, sans-serif" fill="#111" stroke="#fff" stroke-width="4" paint-order="stroke">${it.n}</text>`;
  });
  svg.innerHTML = html;
}
