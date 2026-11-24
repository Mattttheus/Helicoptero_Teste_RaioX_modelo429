// HeliSense 3D – "Peças IPC em 3D": monta, a partir da tabela do IPC (item, PN, nomenclatura, UPA), uma vista explodida
// no estilo de figura de catálogo: peças em ciano com contorno preto sobre fundo branco e chamadas com o número do item.
// A forma de cada peça vem do tipo (HOSE, FITTING, PACKING, RETAINER, NUT, BOLT, CLAMP, BRACKET…). Ilustrativo – não é a geometria Bell.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { criarMovimentoIPC } from './movimento_ipc.js?v=20261123a';

const CIANO = 0x7fe6ef, LARANJA = 0xffb347;
const hexa = (r, h) => new THREE.CylinderGeometry(r, r, h, 6);
function malhaDe(geo, mat) { const m = new THREE.Mesh(geo, mat); m.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo, 30), new THREE.LineBasicMaterial({ color: 0x15191e }))); return m; }

// formas por tipo de peça (medidas em metros, aproximadas)
const FORMAS = [
  [/hose|tube|line|duct|pipe/i, 'mangueira'], [/elbow/i, 'cotovelo'], [/\btee\b|tee,/i, 'te'], [/fitting|union|adapter|connector|coupling|reducer|nipple/i, 'conexao'],
  [/packing|o-?ring|seal|gasket/i, 'anel'], [/retainer|washer|spacer|shim|ring\b/i, 'arruela'], [/\bnut\b|nut,|locknut/i, 'porca'],
  [/bolt|screw|stud|pin\b|rivet/i, 'parafuso'], [/clamp|clip|strap|cushion/i, 'abracadeira'], [/bracket|support|plate|angle|mount/i, 'suporte'],
  [/valve|filter|pump|manifold|module|actuator|servo|reservoir|unit|assy|assembly/i, 'caixa'],
];
export function tipoDe(nomenclatura, extra = '') { const t = `${nomenclatura} ${extra}`; for (const [r, k] of FORMAS) if (r.test(t)) return k === 'conexao' && /elbow|90/i.test(t) ? 'cotovelo' : k; return 'caixa'; }

function construir(tipo, mat, idx) {
  const g = new THREE.Group(), add = (geo, p = [0, 0, 0], r = [0, 0, 0]) => { const m = malhaDe(geo, mat); m.position.set(...p); m.rotation.set(...r); g.add(m); return m; };
  if (tipo === 'mangueira') {
    const curva = new THREE.CatmullRomCurve3([[0, 0, 0], [0.08, 0.1, 0.02], [0.22, 0.14, 0.04 * (idx % 2 ? 1 : -1)], [0.36, 0.05, 0], [0.4, -0.06, 0]].map((p) => new THREE.Vector3(...p)));
    add(new THREE.TubeGeometry(curva, 64, 0.011, 12, false));
    for (const f of [0, 1]) { const p = curva.getPointAt(f), t = curva.getTangentAt(f), q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), t);
      const ponta = new THREE.Group(); ponta.position.copy(p); ponta.quaternion.copy(q);
      const luva = malhaDe(new THREE.CylinderGeometry(0.015, 0.015, 0.035, 16), mat); luva.position.y = f ? -0.0175 : 0.0175;
      const porca = malhaDe(hexa(0.02, 0.018), mat); porca.position.y = f ? 0.012 : -0.012; ponta.add(luva, porca); g.add(ponta); }
  } else if (tipo === 'cotovelo') {
    add(new THREE.TorusGeometry(0.03, 0.009, 10, 16, Math.PI / 2)); add(hexa(0.016, 0.014), [0.03, -0.007, 0]); add(hexa(0.016, 0.014), [-0.007, 0.03, 0], [0, 0, Math.PI / 2]);
    add(new THREE.CylinderGeometry(0.009, 0.009, 0.02, 12), [0.03, -0.022, 0]); add(new THREE.CylinderGeometry(0.009, 0.009, 0.02, 12), [-0.022, 0.03, 0], [0, 0, Math.PI / 2]);
  } else if (tipo === 'te') {
    add(new THREE.CylinderGeometry(0.009, 0.009, 0.08, 12), [0, 0, 0], [0, 0, Math.PI / 2]); add(new THREE.CylinderGeometry(0.009, 0.009, 0.045, 12), [0, 0.022, 0]); add(hexa(0.016, 0.02));
  } else if (tipo === 'conexao') {
    add(hexa(0.017, 0.016)); add(new THREE.CylinderGeometry(0.009, 0.009, 0.03, 12), [0, 0.022, 0]); add(new THREE.CylinderGeometry(0.01, 0.01, 0.025, 12), [0, -0.02, 0]);
  } else if (tipo === 'anel') add(new THREE.TorusGeometry(0.016, 0.003, 10, 28), [0, 0, 0], [Math.PI / 2, 0, 0]);
  else if (tipo === 'arruela') add(new THREE.CylinderGeometry(0.018, 0.018, 0.003, 28).translate(0, 0, 0)), add(new THREE.CylinderGeometry(0.009, 0.009, 0.004, 20));
  else if (tipo === 'porca') add(hexa(0.017, 0.012));
  else if (tipo === 'parafuso') { add(hexa(0.012, 0.008), [0, 0.03, 0]); add(new THREE.CylinderGeometry(0.005, 0.005, 0.06, 12)); }
  else if (tipo === 'abracadeira') { add(new THREE.TorusGeometry(0.02, 0.004, 8, 24, Math.PI * 1.7), [0, 0, 0], [0, 0, Math.PI * 0.65]); add(new THREE.BoxGeometry(0.03, 0.004, 0.012), [0.03, -0.015, 0]); }
  else if (tipo === 'suporte') { add(new THREE.BoxGeometry(0.08, 0.004, 0.04)); add(new THREE.BoxGeometry(0.004, 0.05, 0.04), [-0.04, 0.025, 0]); }
  else { add(new THREE.BoxGeometry(0.07, 0.05, 0.05)); add(new THREE.CylinderGeometry(0.008, 0.008, 0.02, 12), [0, 0.035, 0]); add(new THREE.CylinderGeometry(0.008, 0.008, 0.02, 12), [0.045, 0, 0], [0, 0, Math.PI / 2]); }
  return g;
}

// abre a janela; linhas = [[item, pn, nomenclatura, extra, upa], ...]
export function abrirIpc3d({ titulo = 'Peças IPC em 3D', subtitulo = '', linhas = [] }) {
  const el = document.createElement('div');
  const estreita = innerWidth < 820;
  el.style.cssText = 'position:fixed;inset:3vh 3vw;z-index:9998;background:#fff;color:#111;border-radius:10px;box-shadow:0 10px 60px #000a;display:grid;overflow:hidden;font:13px Arial,sans-serif;'
    + (estreita ? 'grid-template-columns:1fr;grid-template-rows:auto 1fr 38%' : 'grid-template-columns:1fr minmax(260px,32%);grid-template-rows:auto 1fr');
  el.innerHTML = `<div style="grid-column:1/-1;display:flex;flex-wrap:wrap;align-items:center;gap:10px;padding:8px 12px;border-bottom:1px solid #ccc"><b>${titulo}</b><span style="opacity:.7">${subtitulo}</span>
    <span style="margin-left:auto;opacity:.6;font-size:11px">Representação ilustrativa (formas por tipo de peça) – PN e quantidades conforme o IPC</span><button data-x style="font-size:16px;border:1px solid #999;border-radius:6px;background:#fff;cursor:pointer;padding:0 8px">✕</button></div>
    <div data-v style="position:relative;min-height:0"></div><div data-t style="overflow:auto;border-left:1px solid #ccc;border-top:1px solid #ccc"></div>`;
  document.body.append(el);
  const vis = el.querySelector('[data-v]'), tab = el.querySelector('[data-t]');
  const renderer = new THREE.WebGLRenderer({ antialias: true }); renderer.setPixelRatio(Math.min(2, devicePixelRatio)); vis.append(renderer.domElement);
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); svg.style.cssText = 'position:absolute;inset:0;pointer-events:none'; vis.append(svg);
  const cena = new THREE.Scene(); cena.background = new THREE.Color(0xffffff);
  cena.add(new THREE.HemisphereLight(0xffffff, 0x8a96a3, 2.2)); const sol = new THREE.DirectionalLight(0xffffff, 1.2); sol.position.set(1, 2, 1.5); cena.add(sol);
  const camera = new THREE.PerspectiveCamera(35, 1, 0.01, 50);
  const ctl = new OrbitControls(camera, renderer.domElement); ctl.enableDamping = true; let movido = false; ctl.addEventListener('start', () => { movido = true; });
  const itens = []; const nCol = Math.max(2, Math.ceil(Math.sqrt(linhas.length)));
  for (const r of linhas) {
    const [item, pn, nom, extra, upa] = r, q = Math.max(1, Math.min(4, parseInt(upa, 10) || 1)), tipo = tipoDe(nom, extra);
    const mat = new THREE.MeshLambertMaterial({ color: CIANO, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 });
    const grupo = new THREE.Group();
    const esc = tipo === 'mangueira' ? 1 : tipo === 'caixa' || tipo === 'suporte' ? 1.8 : 2.6; // peças pequenas ampliadas, como nas figuras do IPC
    for (let k = 0; k < q; k++) { const p = construir(tipo, mat, k); p.scale.setScalar(esc); p.position.set(0, -k * (tipo === 'mangueira' ? 0.2 : 0.08 * esc), k * 0.02); grupo.add(p); }
    const i = itens.length; grupo.position.set((i % nCol) * 0.48, -Math.floor(i / nCol) * 0.42, 0);  // grade: cada célula comporta uma mangueira
    grupo.traverse((o) => { if (o.isMesh) o.userData.item = itens.length; });
    cena.add(grupo); itens.push({ item, pn, nom, tipo, q, grupo, mat });
  }
  const caixa = new THREE.Box3(); itens.forEach((x) => caixa.expandByObject(x.grupo));
  const c = caixa.getCenter(new THREE.Vector3()), raio = caixa.getBoundingSphere(new THREE.Sphere()).radius;
  const dir = new THREE.Vector3(0.18, 0.32, 1).normalize();
  function enquadrar() { // cabe inteiro na janela, considerando a proporção
    const fov = THREE.MathUtils.degToRad(camera.fov) / 2, d = (raio * 1.15) / Math.sin(Math.min(fov, Math.atan(Math.tan(fov) * camera.aspect)));
    ctl.target.copy(c); camera.position.copy(c).addScaledVector(dir, d); camera.near = d / 100; camera.far = d * 10; camera.updateProjectionMatrix();
  }
  tab.innerHTML = `<table style="width:100%;border-collapse:collapse"><tr style="background:#eef3f6"><th style="text-align:left;padding:4px 6px">Item</th><th style="text-align:left">PN</th><th style="text-align:left">Nomenclatura</th><th>UPA</th></tr>${itens.map((x, i) => `<tr data-i="${i}" style="cursor:pointer;border-bottom:1px solid #e3e6ea"><td style="padding:4px 6px"><b>${x.item}</b></td><td style="font-family:monospace;color:#0b5aa6">${x.pn}</td><td>${x.nom}</td><td style="text-align:center">${x.q}</td></tr>`).join('')}</table>`;
  let sel = -1;
  const marcar = (i) => { sel = i; itens.forEach((x, k) => x.mat.color.setHex(k === i ? LARANJA : CIANO)); tab.querySelectorAll('tr[data-i]').forEach((tr) => { tr.style.background = +tr.dataset.i === i ? '#fff1d6' : ''; }); if (i >= 0) tab.querySelector(`tr[data-i="${i}"]`)?.scrollIntoView({ block: 'nearest' }); };
  tab.addEventListener('click', (e) => { const tr = e.target.closest('tr[data-i]'); if (tr) marcar(+tr.dataset.i === sel ? -1 : +tr.dataset.i); });
  const ray = new THREE.Raycaster(), mouse = new THREE.Vector2(); let baixo = null;
  renderer.domElement.addEventListener('pointerdown', (e) => { baixo = [e.clientX, e.clientY]; });
  renderer.domElement.addEventListener('pointerup', (e) => {
    if (!baixo || Math.hypot(e.clientX - baixo[0], e.clientY - baixo[1]) > 5) return;
    const b = renderer.domElement.getBoundingClientRect(); mouse.set(((e.clientX - b.left) / b.width) * 2 - 1, -((e.clientY - b.top) / b.height) * 2 + 1); ray.setFromCamera(mouse, camera);
    const h = ray.intersectObjects(itens.map((x) => x.grupo), true).find((x) => x.object.isMesh); marcar(h ? h.object.userData.item : -1);
  });
  // movimento: as peças se afastam e voltam, giram no próprio eixo e podem ser arrastadas
  const mov = criarMovimentoIPC({
    vista: vis, camera, controles: ctl, dom: renderer.domElement,
    unidades: () => itens.map((x, i) => ({ chave: i, objs: [x.grupo] })),
    girar: (dt) => { for (const x of itens) x.grupo.rotation.y += dt * 0.7; },
    padrao: { montagem: false }
  });
  const relogio = new THREE.Clock();
  const v = new THREE.Vector3(); let vivo = true;
  function chamadas(w, h) {
    let s = '';
    itens.forEach((x, i) => {
      const bx = new THREE.Box3().setFromObject(x.grupo); v.set((bx.min.x + bx.max.x) / 2, bx.max.y, (bx.min.z + bx.max.z) / 2).project(camera); if (v.z > 1) return;
      const px = (v.x * 0.5 + 0.5) * w, py = (-v.y * 0.5 + 0.5) * h, ly = Math.max(14, py - 34 - (i % 2) * 16);
      s += `<line x1="${px}" y1="${ly + 4}" x2="${px}" y2="${py}" stroke="#111" stroke-width="1"/><text x="${px}" y="${ly}" text-anchor="middle" font-size="14" font-weight="700" fill="#111" stroke="#fff" stroke-width="4" paint-order="stroke">${String(+x.item || x.item)}</text>`;
    });
    svg.setAttribute('width', w); svg.setAttribute('height', h); svg.innerHTML = s;
  }
  (function quadro() {
    if (!vivo) return; requestAnimationFrame(quadro);
    const w = vis.clientWidth, h = vis.clientHeight; if (!w || !h) return;
    if (renderer.domElement.width !== Math.round(w * renderer.getPixelRatio()) || renderer.domElement.height !== Math.round(h * renderer.getPixelRatio())) { renderer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix(); if (!movido) enquadrar(); }
    if (!mov.ativo) mov.ligar(true);
    mov.atualizar(Math.min(relogio.getDelta(), 0.1)); ctl.update(); renderer.render(cena, camera); chamadas(w, h);
  })();
  const fechar = () => { vivo = false; removeEventListener('keydown', tecla); cena.traverse((o) => { o.geometry?.dispose(); }); renderer.dispose(); el.remove(); };
  const tecla = (e) => { if (e.key === 'Escape') fechar(); };
  el.querySelector('[data-x]').onclick = fechar; addEventListener('keydown', tecla);
  return { fechar, itens };
}
