// Manutenção Interativa – página do motor 3D: peças, mapa de sensores, testes (partida, voo, estresse, BITE),
// tarefas de manutenção e edição do motor e dos sensores. O modelo vem da URL (motor.html?m=505).
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { TransformControls } from 'three/addons/controls/TransformControls.js';
import { modeloAtual, carregarScripts, mostrarErro } from './carregar.js?v=20261117b';
import { MarcasNumeradas, capturarVistas, abrirJanela, escreverFolha } from './mapa.js?v=20261117b';
import { construirMotor } from './motor3d.js?v=20261117b';
import { MotorSim, valorSensor, testarSensor, FALHAS_PARTIDA, TIPOS_ESTRESSE, FALHAS_SENSOR } from './simulacao.js?v=20261117b';

const CFG = modeloAtual();
try { await carregarScripts(['modelos/motor_comum.js', CFG.motorArq]); } catch (e) { mostrarErro(e.message); throw e; }
const MOTOR = window.MOTOR, P = MOTOR.sim;
const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const guarda = {
  ler(k, pad) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : pad; } catch { return pad; } },
  salvar(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* armazenamento indisponível */ } }
};
const CHAVE = 'mi_motor_' + CFG.id;
const fmt = (v, d = 1) => (Number.isFinite(v) ? v.toLocaleString('pt-BR', { maximumFractionDigits: d, minimumFractionDigits: d }) : '---');

/* ---------- identidade ---------- */
document.title = `${MOTOR.nome} – Motor 3D · ${CFG.nome} · Manutenção Interativa`;
document.documentElement.style.setProperty('--acento', CFG.cor);
$('#selo').textContent = CFG.curto;
$('#subModelo').textContent = `${CFG.nome} · ${MOTOR.nome}${MOTOR.qtd > 1 ? ` (${MOTOR.qtd} instalados)` : ''}`;
$('#btManual').href = 'manual.html?m=' + CFG.id;
$('#btComandos').href = 'comandos.html?m=' + CFG.id;
$('#trocaModelo').innerHTML = (window.CATALOGO || []).map((c) => `<option value="${c.id}" ${c.id === CFG.id ? 'selected' : ''}>${esc(c.nome)} – ${esc(c.motor)}</option>`).join('');
$('#trocaModelo').onchange = (e) => { location.href = 'motor.html?m=' + e.target.value + location.hash; };
$('#rodape').textContent = `Motor ${MOTOR.nome} ilustrativo e simplificado para treinamento (dimensões e limites das fontes citadas na aba Motor). Não substitui o manual do fabricante do motor nem o RFM.`;

/* =====================================================================
   Cena
   ===================================================================== */
const vista = $('#vista');
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.localClippingEnabled = true;
vista.prepend(renderer.domElement);
const cena = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(36, 1, 0.01, 50);
const controles = new OrbitControls(camera, renderer.domElement);
controles.enableDamping = true; controles.minDistance = 0.25; controles.maxDistance = 8;
cena.add(new THREE.HemisphereLight(0xe6eeff, 0x2a2f38, 1.2));
const sol = new THREE.DirectionalLight(0xffffff, 1.6); sol.position.set(2, 4, 3); cena.add(sol);
const contra = new THREE.DirectionalLight(0x9fc0ff, 0.6); contra.position.set(-3, 1.5, -2.5); cena.add(contra);
const grade = new THREE.GridHelper(6, 30, 0x2b3646, 0x1a222e); grade.position.y = -0.55; cena.add(grade);

const motor = construirMotor(MOTOR);
cena.add(motor.raiz);
const S = MOTOR.escala || 1;
const VISTA = { pos: new THREE.Vector3(...motor.vista.pos).multiplyScalar(S), alvo: new THREE.Vector3(...motor.vista.alvo).multiplyScalar(S) };
camera.position.copy(VISTA.pos); controles.target.copy(VISTA.alvo); controles.update();

// gases de escape e faísca de ignição (efeitos da simulação)
const matJato = new THREE.MeshBasicMaterial({ color: 0xff7a2a, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
for (const [a, b, r] of motor.jatos || []) {
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), m = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.25, r * 0.95, A.distanceTo(B), 20, 1, true), matJato);
  m.position.copy(A).add(B).multiplyScalar(0.5); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.clone().sub(A).normalize()); m.renderOrder = 3; motor.raiz.add(m);
}
const faisca = new THREE.PointLight(0x9fd0ff, 0, 0.6); faisca.position.set(...(motor.faisca || [0, 0, 0])); motor.raiz.add(faisca);

/* =====================================================================
   Edições salvas (peças e sensores) e sensores
   ===================================================================== */
let ed = Object.assign({ partes: {}, sensores: {}, novos: [], removidos: [] }, guarda.ler(CHAVE, {}));
const salvarEd = () => guarda.salvar(CHAVE, ed);
const sensores = () => MOTOR.sensores.filter((s) => !ed.removidos.includes(s.id)).map((s) => Object.assign({}, s, ed.sensores[s.id] || {})).concat(ed.novos);
let SENS = sensores();
const falhasSensor = {}; // id -> tipo de falha injetada (teste de sensores)

const COR_TIPO = (t) => /termopar/i.test(t) ? 0xff6a3d : /aceler/i.test(t) ? 0xb26bff : /press|torque|torquí/i.test(t) ? 0x3fa7ff : /rpm|pickup|monopolo|tacom|rota/i.test(t) ? 0x46c08a : /limalha|interruptor|chip/i.test(t) ? 0xf0b83c : /rtd|temperatura|bulbo/i.test(t) ? 0xff9f6a : 0xd0d6de;
const grpSens = new THREE.Group(); motor.raiz.add(grpSens);
let marcadores = {};
let mapaSujo = true; // números do mapa refeitos no próximo quadro
function montarMarcadores() {
  grpSens.clear(); marcadores = {}; mapaSujo = true;
  for (const s of SENS) {
    const g = new THREE.Group(), dir = new THREE.Vector3(...(s.dir || [0, 1, 0])).normalize(), cor = COR_TIPO(s.tipo);
    const mat = new THREE.MeshStandardMaterial({ color: cor, emissive: cor, emissiveIntensity: 0.35, roughness: 0.4 });
    const pino = new THREE.Mesh(new THREE.CylinderGeometry(0.0045, 0.0045, 0.045, 8), mat); pino.position.y = 0.022;
    const bola = new THREE.Mesh(new THREE.SphereGeometry(0.013, 14, 10), mat); bola.position.y = 0.05;
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.006, 14), mat);
    g.add(pino, bola, base); g.position.set(...s.pos); g.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    g.traverse((o) => { if (o.isMesh) o.userData.sensor = s.id; });
    g.userData = { sensor: s.id, mat, cor };
    grpSens.add(g); marcadores[s.id] = g;
  }
}
montarMarcadores();

/* ---------- mapa numerado de onde colocar os sensores ---------- */
const ORDEM_GRUPOS = ['Temperatura dos gases (termopares)', 'Rotação', 'Torque', 'Pressão', 'Temperatura (RTD)', 'Detecção discreta (limalha, ΔP)', 'Fluxo de combustível', 'Vibração (acelerômetros)', 'Controle eletrônico (FADEC)', 'Elétrica e outros'];
let NUM = new Map();
function ordemMapa() { // sensores na ordem do mapa (por grupo de medição), numerados de 1 a N
  const g = (s) => { const i = ORDEM_GRUPOS.indexOf(grupoTipo(s.tipo)); return i < 0 ? 99 : i; };
  const lista = SENS.map((s, i) => [s, i]).sort((a, b) => g(a[0]) - g(b[0]) || a[1] - b[1]).map((x) => x[0]);
  NUM = new Map(lista.map((s, i) => [s.id, i + 1]));
  return lista;
}
const marcas = new MarcasNumeradas(vista);
function montarMapa() {
  marcas.definir(ordemMapa().map((s) => ({ id: s.id, n: NUM.get(s.id), cor: COR_TIPO(s.tipo), titulo: `${NUM.get(s.id)} · ${s.n}`, obter: (v) => (marcadores[s.id] ? marcadores[s.id].localToWorld(v.set(0, 0.075, 0)) : v.set(0, -99, 0)) })));
}

/* =====================================================================
   Materiais: seleção, destaque, raio-X, corte, calor e mapa de carga
   ===================================================================== */
const plano = new THREE.Plane(new THREE.Vector3(0, 0, -1), 0);
let selPeca = null, selSensor = null, destaque = new Set(), corte = false, raiox = false, verCarga = false, fatorExp = 0;
const cRampa = new THREE.Color(), cTmp = new THREE.Color();
function rampa(L) { // verde -> amarelo -> vermelho
  const v = new THREE.Color(0x3fc98a), a = new THREE.Color(0xf0b83c), r = new THREE.Color(0xef4d4d);
  return L < 0.85 ? cRampa.copy(v) : L < 1 ? cRampa.copy(v).lerp(a, (L - 0.85) / 0.15) : cRampa.copy(a).lerp(r, Math.min(1, (L - 1) / 0.2));
}
function pintar(t) {
  const rodando = sim.modo !== 'parado', calor = Math.max(0, Math.min(1, (sim.s.temp - 250) / (P.tempTo - 250)));
  for (const id in motor.pecas) {
    const p = motor.pecas[id], e = ed.partes[id] || {}, L = verCarga && rodando ? sim.cargaPeca(p.info.est) : null;
    p.grupo.visible = !e.oculto;
    for (const m of p.mats) {
      const b = m.userData.base;
      if (L !== null) { m.color.copy(rampa(L)); m.emissive.copy(m.color).multiplyScalar(L > 1 ? 0.35 + 0.3 * Math.sin(t * 8) : 0.12); }
      else {
        m.color.setHex(e.cor ? parseInt(e.cor.slice(1), 16) : b.cor); m.emissive.setHex(0);
        if (p.quente && calor > 0) m.emissive.setRGB(1, 0.32, 0.08).multiplyScalar(calor * 0.65);
      }
      if (id === selPeca || destaque.has(id)) m.emissive.lerp(cTmp.setHex(0xff7a1a), 0.55 + 0.25 * Math.sin(t * 4));
      const transp = raiox && p.casca;
      if (m.transparent !== transp) { m.transparent = transp; m.opacity = transp ? 0.16 : 1; m.depthWrite = !transp; m.needsUpdate = true; }
      const clip = corte && p.casca;
      if (!!m.clippingPlanes !== clip) { m.clippingPlanes = clip ? [plano] : null; m.needsUpdate = true; }
    }
  }
  for (const s of SENS) {
    const g = marcadores[s.id]; if (!g) continue;
    const est = estadoSensor(s), cor = est === 'cr' ? 0xef4d4d : est === 'al' ? 0xf0b83c : g.userData.cor;
    g.userData.mat.color.setHex(cor); g.userData.mat.emissive.setHex(cor);
    g.userData.mat.emissiveIntensity = s.id === selSensor ? 0.9 + 0.5 * Math.sin(t * 6) : est === 'cr' ? 0.6 + 0.4 * Math.sin(t * 8) : 0.35;
    g.scale.setScalar(s.id === selSensor ? 1.6 : 1);
  }
}

/* ---------- posição das peças: vista explodida + edição ---------- */
function posicionarPecas() {
  for (const id in motor.pecas) {
    const g = motor.pecas[id].grupo, e = ed.partes[id] || {}, u = g.userData;
    g.position.copy(u.base).addScaledVector(u.exp, fatorExp);
    if (e.pos) g.position.add(new THREE.Vector3(...e.pos));
    if (e.rot) g.rotation.set(e.rot[0], e.rot[1], e.rot[2]);
    g.scale.setScalar(e.esc || 1);
  }
}
posicionarPecas();

/* =====================================================================
   Simulação
   ===================================================================== */
const sim = new MotorSim(P);
sim.pesos = Object.fromEntries(Object.entries(MOTOR.partes).map(([id, p]) => [id, p.est]));
function estadoSensor(s) {
  if (sim.modo === 'parado' && !s.falha) return 'ok';
  const v = valorSensor(sim, Object.assign({}, s, { falha: falhasSensor[s.id] }));
  if (!Number.isFinite(v)) return 'cr';
  if (s.lim === 'bool') return v >= 1 ? 'cr' : 'ok';
  if (s.lim === 'max') return v >= s.cr ? 'cr' : v >= s.al ? 'al' : 'ok';
  if (s.lim === 'min') return sim.s.ng < P.ngIdle - 5 ? 'ok' : v <= s.cr ? 'cr' : v <= s.al ? 'al' : 'ok';
  return 'ok';
}

/* ---------- instrumentos (sobre a vista 3D) ---------- */
const INST = [
  { id: 'ng', n: 'Ng', un: '%', max: 110, faixas: [[0, P.ngMcp, 'ok'], [P.ngMcp, P.ngTrans, 'al'], [P.ngTrans, 110, 'cr']], v: () => sim.s.ng, d: 1 },
  { id: 'np', n: 'Np', un: '%', max: 115, faixas: [[0, P.npMax - 2, 'ok'], [P.npMax - 2, P.npMax, 'al'], [P.npMax, 115, 'cr']], v: () => sim.s.np, d: 0 },
  { id: 'temp', n: P.temp, un: '°C', max: Math.ceil((P.tempPartidaMax + 60) / 100) * 100, faixas: [[0, P.tempMcp, 'ok'], [P.tempMcp, P.tempTo, 'al'], [P.tempTo, 2000, 'cr']], v: () => sim.s.temp, d: 0 },
  { id: 'tq', n: 'Torque', un: '%', max: Math.max(130, P.tqTo + 20), faixas: [[0, 100, 'ok'], [100, P.tqTo, 'al'], [P.tqTo, 300, 'cr']], v: () => sim.s.tq, d: 0 },
  { id: 'op', n: 'Óleo P', un: 'psi', max: Math.ceil(P.oleoPvoo * 1.6 / 10) * 10, faixas: [[0, P.oleoPmin, 'cr'], [P.oleoPmin, P.oleoPvoo * 1.35, 'ok'], [P.oleoPvoo * 1.35, 999, 'al']], v: () => sim.s.oleoP, d: 0 },
  { id: 'ot', n: 'Óleo T', un: '°C', max: 150, faixas: [[0, P.oleoTmax - 10, 'ok'], [P.oleoTmax - 10, P.oleoTmax, 'al'], [P.oleoTmax, 999, 'cr']], v: () => sim.s.oleoT, d: 0 },
  { id: 'ff', n: 'Fluxo comb.', un: 'kg/h', max: Math.ceil(P.ffTo * 1.3 / 10) * 10, faixas: [[0, 9999, 'ok']], v: () => sim.s.ff, d: 0 },
  { id: 'vib', n: 'Vibração', un: 'ips', max: 1, faixas: [[0, 0.4, 'ok'], [0.4, 0.6, 'al'], [0.6, 9, 'cr']], v: () => Math.max(sim.s.vibC, sim.s.vibT), d: 2 }
];
const COR = { ok: '#46c08a', al: '#f0b83c', cr: '#ef5d5d' };
const arco = (a0, a1, r = 26) => { const p = (a) => [32 + r * Math.cos(a), 34 + r * Math.sin(a)]; const [x0, y0] = p(a0), [x1, y1] = p(a1); return `M${x0.toFixed(1)},${y0.toFixed(1)} A${r},${r} 0 ${a1 - a0 > Math.PI ? 1 : 0} 1 ${x1.toFixed(1)},${y1.toFixed(1)}`; };
const ang = (v, max) => Math.PI * 0.8 + Math.max(0, Math.min(1, v / max)) * Math.PI * 1.4;
$('#instrumentos').innerHTML = INST.map((g) => `<div class="inst" data-inst="${g.id}"><svg viewBox="0 0 64 50">${g.faixas.map(([a, b, c]) => `<path d="${arco(ang(a, g.max), ang(Math.min(b, g.max), g.max))}" stroke="${COR[c]}" stroke-width="4" fill="none" opacity=".85"/>`).join('')}<line class="agulha" x1="32" y1="34" x2="32" y2="12" stroke="#e6ebf2" stroke-width="2" stroke-linecap="round"/><circle cx="32" cy="34" r="2.5" fill="#e6ebf2"/></svg><b>—</b><span>${esc(g.n)} <small>${esc(g.un)}</small></span></div>`).join('');
function atualizarInstrumentos() {
  for (const g of INST) {
    const el = $(`[data-inst="${g.id}"]`), v = g.v(), a = ang(v, g.max), faixa = g.faixas.find(([x, y]) => v >= x && v < y) || g.faixas[g.faixas.length - 1];
    el.querySelector('.agulha').setAttribute('x2', (32 + 22 * Math.cos(a)).toFixed(1)); el.querySelector('.agulha').setAttribute('y2', (34 + 22 * Math.sin(a)).toFixed(1));
    const b = el.querySelector('b'); b.textContent = fmt(v, g.d); b.style.color = sim.modo === 'parado' ? '' : COR[faixa[2]];
  }
}

/* =====================================================================
   Seleção, foco e rótulos
   ===================================================================== */
let voo = null;
function voar(pos, alvo, dur = 800) { voo = { t0: performance.now(), dur, p0: camera.position.clone(), p1: pos, a0: controles.target.clone(), a1: alvo }; }
controles.addEventListener('start', () => { voo = null; });
function focarCaixa(caixa, dist = 1) {
  const c = caixa.getCenter(new THREE.Vector3()), r = Math.max(caixa.getSize(new THREE.Vector3()).length() / 2, 0.08);
  const dir = camera.position.clone().sub(controles.target).normalize();
  voar(c.clone().addScaledVector(dir, Math.max(r * 3.2, 0.45) * dist), c);
}
function vistaGeral() { voar(VISTA.pos.clone(), VISTA.alvo.clone()); }
function caixaPeca(id) { return new THREE.Box3().setFromObject(motor.pecas[id].grupo); }
function selecionarPeca(id, { foco = true } = {}) {
  selPeca = id; selSensor = null; destaque.clear(); anexarGizmo(); barraSel();
  if (id && foco) focarCaixa(caixaPeca(id));
}
function selecionarSensor(id, { foco = true } = {}) {
  selSensor = id; selPeca = null; destaque.clear();
  const s = SENS.find((x) => x.id === id); if (s?.parte) destaque.add(s.parte);
  anexarGizmo(); barraSel();
  if (id && foco && marcadores[id]) { const c = new THREE.Box3().setFromObject(marcadores[id]); c.expandByScalar(0.12); focarCaixa(c, 0.9); }
}
function barraSel() {
  const el = $('#selbar');
  if (selPeca) { const p = MOTOR.partes[selPeca]; el.hidden = false; el.innerHTML = `<b>Peça:</b> ${esc(p.n)} · ${esc(p.mod)} · ATA ${esc(p.ata)}<button class="bt mini" id="btLimpar">Limpar</button>`; }
  else if (selSensor) { const s = SENS.find((x) => x.id === selSensor); el.hidden = false; el.innerHTML = `<b>Sensor:</b> ${esc(s?.n)} · ${esc(s?.tipo)}<button class="bt mini" id="btLimpar">Limpar</button>`; }
  else if (destaque.size) { el.hidden = false; el.innerHTML = `<b>Tarefa:</b> ${[...destaque].map((d) => esc(MOTOR.partes[d]?.n)).slice(0, 4).join(' · ')}<button class="bt mini" id="btLimpar">Limpar</button>`; }
  else el.hidden = true;
}
$('#selbar').addEventListener('click', (e) => { if (e.target.id === 'btLimpar') limparSelecao(); });
function limparSelecao() { selPeca = selSensor = null; destaque.clear(); anexarGizmo(); barraSel(); marcarAtivo(null); }

const elRot = $('#rotulos'); let verRotulos = false;
const pv = new THREE.Vector3();
function rotulos() {
  const w = vista.clientWidth, h = vista.clientHeight, lista = [];
  if (verRotulos && grpSens.visible) for (const s of SENS) lista.push([s.id, s.n.replace(/^Termopar /, 'TC ').slice(0, 34), marcadores[s.id]]);
  if (selPeca) lista.push(['p', MOTOR.partes[selPeca].n, motor.pecas[selPeca].grupo]);
  if (elRot.childElementCount !== lista.length) elRot.innerHTML = lista.map(() => '<div class="rotulo"></div>').join('');
  lista.forEach(([id, txt, obj], i) => {
    const d = elRot.children[i];
    if (obj.isGroup && id === 'p') new THREE.Box3().setFromObject(obj).getCenter(pv); else obj.getWorldPosition(pv);
    pv.project(camera); d.textContent = txt; d.classList.toggle('peq', id !== 'p');
    d.style.display = pv.z > 1 ? 'none' : ''; d.style.left = ((pv.x * 0.5 + 0.5) * w) + 'px'; d.style.top = ((-pv.y * 0.5 + 0.5) * h) + 'px';
  });
}

/* ---------- clique e passagem do mouse ---------- */
const raio = new THREE.Raycaster(), mouse = new THREE.Vector2();
function alvoSobCursor(ev) {
  const r = renderer.domElement.getBoundingClientRect();
  mouse.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
  raio.setFromCamera(mouse, camera);
  const objs = motor.malhas.filter((m) => m.parent && visivel(m)).concat(grpSens.visible ? grpSens.children.flatMap((g) => g.children) : []);
  const hits = raio.intersectObjects(objs, false).filter((h) => !corte || !h.object.material.clippingPlanes || plano.distanceToPoint(h.point) >= 0);
  const h = hits.find((x) => x.object.userData.sensor) || hits.find((x) => !x.object.material.transparent) || hits[0];
  return h || null;
}
function visivel(o) { for (let p = o; p; p = p.parent) if (!p.visible) return false; return true; }
let baixo = null;
renderer.domElement.addEventListener('pointerdown', (e) => { baixo = [e.clientX, e.clientY]; });
renderer.domElement.addEventListener('pointerup', (e) => {
  if (!baixo || Math.hypot(e.clientX - baixo[0], e.clientY - baixo[1]) > 5 || gizmo.dragging) return;
  const h = alvoSobCursor(e);
  if (modoAdicionar && h && h.object.userData.peca) { adicionarSensorEm(h); return; }
  if (!h) { limparSelecao(); return; }
  if (h.object.userData.sensor) { selecionarSensor(h.object.userData.sensor, { foco: false }); if (abaAtual !== 'editar') abrirAba('sensores'); desenharFichaSensor(); }
  else if (h.object.userData.peca) { selecionarPeca(h.object.userData.peca, { foco: false }); if (abaAtual !== 'editar') abrirAba('motor'); desenhar[abaAtual](); }
});
const dica = $('#dica');
renderer.domElement.addEventListener('pointermove', (e) => {
  if (e.buttons) { dica.hidden = true; return; }
  const h = alvoSobCursor(e); dica.hidden = !h;
  renderer.domElement.style.cursor = h ? (modoAdicionar ? 'crosshair' : 'pointer') : 'grab';
  if (!h) return;
  const r = vista.getBoundingClientRect(), s = h.object.userData.sensor && SENS.find((x) => x.id === h.object.userData.sensor);
  dica.textContent = s ? `${s.n} · ${s.tipo}` : modoAdicionar ? `Instalar sensor em: ${MOTOR.partes[h.object.userData.peca].n}` : `${MOTOR.partes[h.object.userData.peca].n} · ATA ${MOTOR.partes[h.object.userData.peca].ata}`;
  dica.style.left = (e.clientX - r.left + 14) + 'px'; dica.style.top = (e.clientY - r.top + 14) + 'px';
});
renderer.domElement.addEventListener('pointerleave', () => { dica.hidden = true; });

/* ---------- barra de ferramentas ---------- */
const alternar = (id, fn) => { $(id).onclick = (e) => { const v = fn(); e.currentTarget.classList.toggle('on', v); }; };
alternar('#btCorte', () => (corte = !corte));
alternar('#btRaiox', () => (raiox = !raiox));
alternar('#btSensores', () => (grpSens.visible = !grpSens.visible));
alternar('#btRotulos', () => (verRotulos = !verRotulos));
alternar('#btCarga', () => (verCarga = !verCarga));
function ligarMapaNum(v) { marcas.mostrar(v && grpSens.visible); $('#btMapaNum').classList.toggle('on', v); }
$('#btMapaNum').onclick = () => ligarMapaNum(!marcas.ativo);
marcas.el.addEventListener('click', (e) => { const b = e.target.closest('[data-sensor]'); if (b) { selecionarSensor(b.dataset.sensor); if (abaAtual !== 'editar') abrirAba('sensores'); desenharFichaSensor(); } });
function ligarCarga(v) { verCarga = v; $('#btCarga').classList.toggle('on', v); }
$('#btGeral').onclick = vistaGeral;
$('#btPainel').onclick = (e) => { const f = $('#app').classList.toggle('sem-painel'); e.currentTarget.classList.toggle('on', f); e.currentTarget.textContent = f ? 'Mostrar painel' : 'Ocultar painel'; };
$('#explodir').oninput = (e) => { fatorExp = +e.target.value; posicionarPecas(); };
function explodirPara(v) { fatorExp = v; $('#explodir').value = v; posicionarPecas(); }

/* =====================================================================
   Edição com gizmo (mover / girar / escalar peças e sensores)
   ===================================================================== */
const gizmo = new TransformControls(camera, renderer.domElement);
gizmo.setSize(0.75); cena.add(gizmo);
gizmo.addEventListener('dragging-changed', (e) => { controles.enabled = !e.value; });
gizmo.addEventListener('objectChange', () => {
  const o = gizmo.object; if (!o) return;
  if (o.userData.sensor) {
    const s = SENS.find((x) => x.id === o.userData.sensor); if (!s) return;
    const pos = o.position.toArray().map((v) => +v.toFixed(4)), dir = new THREE.Vector3(0, 1, 0).applyQuaternion(o.quaternion).toArray().map((v) => +v.toFixed(3));
    gravarSensor(s.id, { pos, dir });
  } else if (o.userData.id) {
    const u = o.userData, off = o.position.clone().sub(u.base).addScaledVector(u.exp, -fatorExp);
    ed.partes[u.id] = Object.assign(ed.partes[u.id] || {}, { pos: off.toArray().map((v) => +v.toFixed(4)), rot: [o.rotation.x, o.rotation.y, o.rotation.z].map((v) => +v.toFixed(4)), esc: +o.scale.x.toFixed(3) });
    salvarEd();
  }
  if (abaAtual === 'editar') atualizarCamposEdicao();
});
let modoGizmo = 'translate', modoAdicionar = false;
function anexarGizmo() {
  gizmo.detach();
  if (abaAtual !== 'editar') return;
  if (selPeca) gizmo.attach(motor.pecas[selPeca].grupo); else if (selSensor && marcadores[selSensor]) gizmo.attach(marcadores[selSensor]);
  gizmo.setMode(selSensor && modoGizmo === 'scale' ? 'translate' : modoGizmo);
}
function gravarSensor(id, dados) {
  const novo = ed.novos.find((x) => x.id === id);
  if (novo) Object.assign(novo, dados); else ed.sensores[id] = Object.assign(ed.sensores[id] || {}, dados);
  salvarEd(); SENS = sensores();
}

/* =====================================================================
   Laço de desenho
   ===================================================================== */
function ajustar() { const w = vista.clientWidth, h = vista.clientHeight; if (!w || !h) return; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
new ResizeObserver(ajustar).observe(vista); ajustar();
const relogio = new THREE.Clock(); let acum = 0;
const angGiro = { ng: 0, np: 0 };
// a simulação anda no tempo real, em passos de até 50 ms – pelo laço de desenho ou, com a aba oculta, pelo temporizador
let tSimUlt = performance.now();
function avancarSim() {
  const agora = performance.now(), d = Math.min((agora - tSimUlt) / 1000, 1.5); tSimUlt = agora;
  if (sim.modo !== 'parado' || sim.s.ng > 0.5) for (let r = d; r > 1e-4; r -= 0.05) sim.passo(Math.min(0.05, r));
}
setInterval(() => { if (performance.now() - tSimUlt > 300) { avancarSim(); aoVivo(); } }, 250);
let erroLaco = false;
renderer.setAnimationLoop(() => { try { quadro(); } catch (e) { if (!erroLaco) { erroLaco = true; mostrarErro('Erro no desenho 3D: ' + e.message); } } });
function quadro() {
  if (mapaSujo) { mapaSujo = false; montarMapa(); }
  const dtReal = Math.min(relogio.getDelta(), 0.5), dt = Math.min(dtReal, 0.1), t = relogio.elapsedTime;
  avancarSim();
  if (voo) {
    const k = Math.min((performance.now() - voo.t0) / voo.dur, 1), e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
    camera.position.lerpVectors(voo.p0, voo.p1, e); controles.target.lerpVectors(voo.a0, voo.a1, e); if (k >= 1) voo = null;
  }
  // rotação das peças (velocidade visual reduzida, proporcional a Ng e Np)
  angGiro.ng += dt * sim.s.ng * 0.32; angGiro.np += dt * sim.s.np * 0.22;
  for (const id in motor.pecas) { const p = motor.pecas[id]; if (p.gira && gizmo.object !== p.grupo) p.grupo.rotation.x = angGiro[p.gira] + ((ed.partes[id] || {}).rot?.[0] || 0); }
  matJato.opacity = Math.max(0, Math.min(0.3, (sim.s.temp - 250) / 2200)) * (0.85 + 0.15 * Math.sin(t * 30));
  faisca.intensity = sim.s.ign ? (Math.random() < 0.5 ? 2.5 : 0) : 0;
  pintar(t);
  controles.update(); renderer.render(cena, camera); rotulos(); marcas.atualizar(camera, vista.clientWidth, vista.clientHeight, selSensor);
  acum += dt;
  if (acum > 0.2) { acum = 0; aoVivo(); }
}

/* =====================================================================
   Painel: abas
   ===================================================================== */
const conteudo = $('#conteudo');
const desenhar = {};
let abaAtual = 'motor';
const ABAS = [...document.querySelectorAll('#abas button')].map((b) => b.dataset.aba);
function abrirAba(nome) {
  if (!desenhar[nome]) nome = 'motor';
  const mudou = nome !== abaAtual; abaAtual = nome;
  document.querySelectorAll('#abas button').forEach((b) => b.classList.toggle('ativa', b.dataset.aba === nome));
  if (location.hash !== '#' + nome) history.replaceState(null, '', '#' + nome);
  if (nome !== 'editar') modoAdicionar = false;
  if (nome === 'sensores' && mudou && !marcas.ativo) ligarMapaNum(true);
  anexarGizmo();
  desenhar[nome](); if (mudou) conteudo.scrollTop = 0;
}
$('#abas').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) abrirAba(b.dataset.aba); });
window.addEventListener('keydown', (e) => {
  const dig = /INPUT|TEXTAREA|SELECT/.test(e.target.tagName);
  if (e.altKey && /^[1-6]$/.test(e.key) && ABAS[+e.key - 1]) { e.preventDefault(); abrirAba(ABAS[+e.key - 1]); }
  else if (e.key === 'Escape' && !dig) { modoAdicionar = false; limparSelecao(); if (abaAtual === 'editar') desenhar.editar(); }
  else if (!dig && abaAtual === 'editar' && /^[wer]$/i.test(e.key)) { modoGizmo = { w: 'translate', e: 'rotate', r: 'scale' }[e.key.toLowerCase()]; anexarGizmo(); desenhar.editar(); }
});
function marcarAtivo(el) { conteudo.querySelectorAll('.ativo').forEach((x) => x.classList.remove('ativo')); if (el) el.classList.add('ativo'); }
function selo(n) { const b = $('#abas [data-aba="testes"] .selo-n'); b.hidden = !n; b.textContent = n; }

/* ---------- Motor (arquitetura e peças) ---------- */
desenhar.motor = () => {
  const mods = {};
  for (const id in MOTOR.partes) (mods[MOTOR.partes[id].mod] ??= []).push(id);
  const p = selPeca && MOTOR.partes[selPeca];
  const sensNaPeca = p ? SENS.filter((s) => s.parte === selPeca) : [];
  const tarefas = p ? MOTOR.manutencao.filter((t) => t.partes.includes(selPeca)) : [];
  conteudo.innerHTML = `${p ? `<h2>Ficha da peça</h2><div class="cartao"><div class="tit"><span>${esc(p.n)}</span><span class="tag">ATA ${esc(p.ata)}</span></div>
      <div class="sub"><b>Módulo:</b> ${esc(p.mod)}</div><div class="sub"><b>Função:</b> ${esc(p.fn)}</div><div class="sub"><b>Manutenção:</b> ${esc(p.man)}</div>
      ${Object.keys(p.est || {}).length ? `<div class="sub"><b>Sensível a:</b> ${Object.entries(p.est).filter(([, w]) => w >= 0.5).map(([f]) => ({ tq: 'torque', temp: 'temperatura', rpm: 'rotação', vib: 'vibração', oleo: 'óleo' }[f])).join(', ')}</div>` : ''}</div>
      ${sensNaPeca.length ? `<h3>Sensores instalados nesta peça (${sensNaPeca.length})</h3>${sensNaPeca.map((s) => `<div class="item" data-sensor="${s.id}"><span class="tag">${esc(s.un || '—')}</span><div class="desc">${esc(s.n)}<div class="meta">${esc(s.tipo)}</div></div></div>`).join('')}` : ''}
      ${tarefas.length ? `<h3>Tarefas de manutenção</h3>${tarefas.map((t) => `<div class="item" data-tarefa="${t.id}"><span class="tag lar">⚒</span><div class="desc">${esc(t.n)}<div class="meta">${esc(t.quando)}</div></div></div>`).join('')}` : ''}` : ''}
    <h2 style="margin-top:${p ? 18 : 0}px">${esc(MOTOR.nome)}</h2>
    <p class="nota">${esc(MOTOR.helicoptero)}${MOTOR.qtd > 1 ? ` · ${MOTOR.qtd} motores instalados (nº 1 esquerdo e nº 2 direito, iguais)` : ' · monomotor'}</p>
    <table>${MOTOR.resumo.map(([k, v]) => `<tr><td style="width:38%;color:var(--suave)">${esc(k)}</td><td>${esc(v)}</td></tr>`).join('')}</table>
    <h3>Caminho do ar</h3><p class="nota">${esc(MOTOR.fluxo)}</p>
    <h3>Limites usados na simulação</h3><p class="nota">${esc(P.notas)}</p>
    <h3>Peças por módulo (clique para ver)</h3>
    ${Object.entries(mods).map(([m, ids]) => `<div class="modulo"><b>${esc(m)}</b>${ids.map((id) => `<span class="chip${id === selPeca ? ' on' : ''}" data-peca="${id}">${esc(MOTOR.partes[id].n)}</span>`).join('')}</div>`).join('')}
    <h3>Fontes</h3>${MOTOR.fontes.map(([t, u]) => `<p class="nota">• <a href="${esc(u)}" target="_blank" rel="noopener">${esc(t)}</a></p>`).join('')}
    <p class="nota">Use <b>Corte</b> para ver o interior, <b>Vista explodida</b> para separar os módulos e a aba <b>Testes</b> para ligar o motor.</p>`;
};

/* ---------- Sensores (mapa de instalação) ---------- */
const grupoTipo = (t) => /controle eletr|FADEC/i.test(t) ? 'Controle eletrônico (FADEC)' : /termopar/i.test(t) ? 'Temperatura dos gases (termopares)' : /aceler/i.test(t) ? 'Vibração (acelerômetros)' : /rpm|pickup|monopolo|tacom/i.test(t) ? 'Rotação' : /torque|torquí/i.test(t) ? 'Torque' : /press/i.test(t) ? 'Pressão' : /rtd|bulbo|temperatura/i.test(t) ? 'Temperatura (RTD)' : /limalha|interruptor|chip/i.test(t) ? 'Detecção discreta (limalha, ΔP)' : /fluxo/i.test(t) ? 'Fluxo de combustível' : 'Elétrica e outros';
function cartaoSensor(s, aberto = false) {
  const v = valorSensor(sim, Object.assign({}, s, { falha: falhasSensor[s.id] })), est = estadoSensor(s);
  return `<div class="cartao clic sensor ${est === 'cr' ? 'critico' : est === 'al' ? 'alerta' : ''}${s.id === selSensor ? ' ativo' : ''}" data-sensor="${s.id}">
    <div class="tit"><span><b class="num-sen" style="--c:#${COR_TIPO(s.tipo).toString(16).padStart(6, '0')}">${NUM.get(s.id) ?? '?'}</b> ${esc(s.n)}</span><span class="tag ${/HUMS|adicional|usuário/i.test(s.orig) ? 'lar' : ''}">${esc(/HUMS|adicional/i.test(s.orig) ? 'adicional' : /usuário/i.test(s.orig) ? 'seu sensor' : 'de série')}</span></div>
    <div class="leitura"><span class="valor" data-v="${s.id}">${s.lim === 'bool' ? (v >= 1 ? 'ATIVO' : 'normal') : fmt(v, s.un === 'ips' ? 2 : 1) + ' ' + esc(s.un)}</span></div>
    <div class="sub">${esc(s.tipo)} · em <b>${esc(MOTOR.partes[s.parte]?.n || s.parte)}</b>${s.lim === 'max' || s.lim === 'min' ? ` · alerta ${s.al} · crítico ${s.cr} ${esc(s.un)}` : ''}</div>
    <details ${aberto ? 'open' : ''}><summary>Como instalar</summary><p class="nota">${esc(s.inst)}</p><p class="nota">Posição no modelo (m): ${s.pos.map((x) => fmt(x, 3)).join(' / ')} · origem: ${esc(s.orig)}</p></details>
    <details ${aberto ? 'open' : ''}><summary>Como testar</summary><p class="nota">${esc(s.teste)}</p><p class="nota">Faixa de teste ${s.faixa?.join(' a ')} ${esc(s.un)} · tolerância ±${s.tol ?? '—'}</p></details></div>`;
}
function desenharFichaSensor() { if (abaAtual === 'sensores') desenhar.sensores(); else if (abaAtual === 'editar') desenhar.editar(); }
desenhar.sensores = () => {
  const grupos = {};
  for (const s of ordemMapa()) (grupos[grupoTipo(s.tipo)] ??= []).push(s);
  const sel = selSensor && SENS.find((s) => s.id === selSensor);
  const nSerie = SENS.filter((s) => !/HUMS|adicional|usuário/i.test(s.orig)).length;
  conteudo.innerHTML = `${sel ? `<h2>Sensor selecionado</h2>${cartaoSensor(sel, true)}` : ''}
    <h2 style="margin-top:${sel ? 18 : 0}px">Mapa de instalação dos sensores</h2>
    <p class="nota">${SENS.length} pontos de medição no ${esc(MOTOR.nome)}: ${nSerie} de série (instrumentação do motor/helicóptero) e ${SENS.length - nSerie} adicionais para monitoramento de condição (HUMS) e testes. <b>Cada número no 3D é um ponto de instalação</b> e corresponde ao número do cartão abaixo; clique no número ou no cartão para ver onde fica, como instalar e como testar.</p>
    <div class="linha"><button class="bt pri" data-dado="folha">Folha de instalação dos sensores (imprimir / PDF)</button><button class="bt" id="btNumMapa">${marcas.ativo ? 'Esconder números do 3D' : 'Mostrar números no 3D'}</button></div>
    <div class="legenda">${[['Termopar', 0xff6a3d], ['Pressão / torque', 0x3fa7ff], ['Rotação', 0x46c08a], ['Vibração', 0xb26bff], ['Temperatura RTD', 0xff9f6a], ['Discreto (limalha, ΔP)', 0xf0b83c], ['Outros', 0xd0d6de]].map(([n, c]) => `<span><i style="background:#${c.toString(16).padStart(6, '0')}"></i>${n}</span>`).join('')}</div>
    <div class="linha"><button class="bt" id="btTodosRot">${verRotulos ? 'Esconder rótulos' : 'Mostrar rótulos no 3D'}</button><button class="bt" data-ir="testes">Testar os sensores ›</button><a class="bt" href="motores.html?m=${CFG.id}">Comparar com os outros modelos ›</a></div>
    ${Object.entries(grupos).map(([g, l]) => `<h3>${esc(g)} (${l.length})</h3>${l.filter((s) => s.id !== selSensor).map((s) => cartaoSensor(s)).join('')}`).join('')}
    <p class="nota">Valores de instalação (torque, gap, posição) e procedimentos oficiais: manual do motor e do fabricante do sensor. Sensores “adicionais” são sugestões de monitoramento – instalação em aeronave exige projeto aprovado (alteração/STC).</p>`;
};

/* ---------- Testes ---------- */
let falhaPartida = 'nenhuma', tipoEstresse = 'torque', intensidade = 0.5, bite = {}, biteRodando = false;
desenhar.testes = () => {
  conteudo.innerHTML = `<h2>Testes em modelo</h2>
    <div class="cartao"><div class="tit"><span id="simFase">—</span><span class="tag" id="simModo">—</span></div><div class="sub" id="simResumo"></div></div>
    <div class="grade"><div><label>OAT (°C)</label><input type="number" id="tOat" value="${sim.oat}"></div><div><label>Altitude (ft)</label><input type="number" id="tAlt" step="500" value="${sim.alt}"></div><div><label>Peso (% PMD)</label><input type="number" id="tPeso" min="60" max="110" value="${Math.round(sim.peso * 100)}"></div></div>
    <h3>1 · Partida (ignição)</h3>
    <p class="nota">${P.fadec ? 'Motor com FADEC: a sequência de ignição/combustível é automática e o FADEC aborta a partida se o limite de temperatura for atingido.' : 'Motor sem FADEC: o operador abre a manete a ' + P.ngIgn + '% de Ng e precisa ABORTAR se a ' + esc(P.temp) + ' passar do limite.'} Limite de partida: ${P.tempPartida} °C${P.tempPartidaMax !== P.tempPartida ? ` (máx. ${P.tempPartidaMax} °C)` : ''}.</p>
    <div class="linha"><select id="selFalha" style="flex:1;min-width:160px">${Object.entries(FALHAS_PARTIDA).map(([k, n]) => `<option value="${k}" ${k === falhaPartida ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select>
      <button class="bt pri" id="btPartida">Ligar</button><button class="bt perigo" id="btAbortar">Abortar / cortar</button></div>
    <h3>2 · Perfil de voo</h3>
    <p class="nota">Marcha lenta → 100% Np → pairado → decolagem → subida → cruzeiro → descida → pouso → resfriamento → corte (tempo comprimido ×8). Calor, altitude e peso aumentam ${esc(P.temp)} e torque.</p>
    <div class="linha"><button class="bt pri" id="btVoo">Iniciar voo</button></div>
    <h3>3 · Estresse de componentes</h3>
    <div class="linha"><select id="selEstresse" style="flex:1;min-width:160px">${Object.entries(TIPOS_ESTRESSE).map(([k, n]) => `<option value="${k}" ${k === tipoEstresse ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select></div>
    <div class="linha"><label class="nota" style="min-width:90px">Intensidade <b id="vInt">${Math.round(intensidade * 100)}%</b></label><input type="range" id="selInt" min="0" max="1" step="0.05" value="${intensidade}" style="flex:1"><button class="bt pri" id="btEstresse">Aplicar (30 s)</button></div>
    <p class="nota">A cor das peças no 3D mostra a carga (verde &lt; 85%, amarelo até o limite, vermelho acima). A tabela abaixo estima o consumo de vida e indica a inspeção.</p>
    <div id="simCargas"></div>
    <h3>4 · Teste de sensores (BITE / loop check)</h3>
    <p class="nota">Aplica 3 pontos de estímulo em cada sensor (simulador de termopar, gerador de frequência, bomba de pressão…) e compara com a tolerância. Injete falhas para treinar o diagnóstico.</p>
    <div class="linha"><button class="bt pri" id="btBite">${biteRodando ? 'Testando…' : 'Testar todos os sensores'}</button><button class="bt" id="btFalhaAleat">Falha aleatória</button><button class="bt" id="btFalhaLimpa">Limpar falhas</button></div>
    <table class="bite"><tr><th>Sensor</th><th>Falha simulada</th><th>Resultado</th></tr>${SENS.map((s) => `<tr data-sensor="${s.id}" class="clic"><td>${esc(s.n)}</td><td><select data-falha="${s.id}">${Object.entries(FALHAS_SENSOR).map(([k, n]) => `<option value="${k}" ${(falhasSensor[s.id] || 'ok') === k ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select></td><td data-res="${s.id}">${resBite(s.id)}</td></tr>`).join('')}</table>
    <h3>Registro</h3><div id="simLog"></div>
    <div class="linha"><button class="bt" data-dado="csvlog">Exportar registro (CSV)</button><button class="bt" data-dado="csvbite">Exportar teste de sensores (CSV)</button></div>`;
  aoVivo(true);
};
function resBite(id) { const r = bite[id]; if (!r) return '<span class="nota">—</span>'; return `<span class="tag ${r.ok ? 'ok' : 'er'}">${r.ok ? 'PASSOU' : 'FALHOU'}</span><div class="nota" style="margin:2px 0 0">${esc(r.diag)}</div>`; }
async function rodarBite() {
  if (biteRodando) return; biteRodando = true; bite = {}; desenhar.testes();
  for (const s of SENS) {
    selecionarSensor(s.id, { foco: false });
    const el = conteudo.querySelector(`[data-res="${s.id}"]`); if (el) el.innerHTML = '<span class="tag al">testando…</span>';
    await new Promise((r) => setTimeout(r, 260));
    bite[s.id] = testarSensor(Object.assign({}, s, { falha: falhasSensor[s.id] }));
    const el2 = conteudo.querySelector(`[data-res="${s.id}"]`); if (el2) el2.innerHTML = resBite(s.id);
  }
  biteRodando = false; selecionarSensor(null);
  const n = Object.values(bite).filter((r) => !r.ok).length;
  sim.evento(`Teste de sensores concluído: ${SENS.length - n} passaram, ${n} falharam.`, n ? 'al' : 'ok');
  if (abaAtual === 'testes') desenhar.testes();
}

// partes do painel que mudam com a simulação (5 vezes por segundo)
let nLog = -1;
function aoVivo(forcar = false) {
  const rodando = sim.modo !== 'parado' || sim.s.ng > 0.5;
  $('#instrumentos').hidden = !rodando && sim.evts.length === 0;
  if (!$('#instrumentos').hidden) atualizarInstrumentos();
  const f = $('#faseSim'); f.hidden = !rodando; if (rodando) f.textContent = sim.fase;
  const nAlertas = Object.values(sim.exced).filter((x) => x.vezes && x.nivel !== 'info').length; selo(nAlertas);
  if (abaAtual === 'sensores') for (const s of SENS) { const el = conteudo.querySelector(`[data-v="${s.id}"]`); if (el) { const v = valorSensor(sim, Object.assign({}, s, { falha: falhasSensor[s.id] })); el.textContent = s.lim === 'bool' ? (v >= 1 ? 'ATIVO' : 'normal') : fmt(v, s.un === 'ips' ? 2 : 1) + ' ' + s.un; } }
  if (abaAtual !== 'testes') return;
  $('#simFase').textContent = sim.fase;
  $('#simModo').textContent = { parado: 'PARADO', partida: 'PARTIDA', marcha: 'MARCHA LENTA', voo: 'VOO', estresse: 'ESTRESSE', corte: 'CORTE' }[sim.modo] || sim.modo;
  $('#simModo').className = 'tag ' + ({ partida: 'al', voo: 'ok', estresse: 'er', marcha: 'ok' }[sim.modo] || '');
  $('#simResumo').textContent = `Ng ${fmt(sim.s.ng)}% · Np ${fmt(sim.s.np, 0)}% · ${P.temp} ${fmt(sim.s.temp, 0)} °C (pico ${fmt(sim.picoTemp, 0)}) · torque ${fmt(sim.s.tq, 0)}% · óleo ${fmt(sim.s.oleoP, 0)} psi / ${fmt(sim.s.oleoT, 0)} °C${sim.modo === 'voo' || sim.modo === 'estresse' ? ` · tempo simulado ${fmt(sim.tSim / 60, 1)} min` : ''}`;
  if (forcar || nLog !== sim.evts.length) {
    nLog = sim.evts.length;
    $('#simLog').innerHTML = sim.evts.length ? `<div class="log">${sim.evts.slice().reverse().slice(0, 60).map((e) => `<div class="${e.nivel}"><b>${fmt(e.t, 0)} s</b> ${esc(e.txt)}</div>`).join('')}</div>` : '<p class="nota">Nada registrado ainda. Ligue o motor.</p>';
  }
  const ids = Object.keys(MOTOR.partes).map((id) => ({ id, L: sim.cargaPeca(MOTOR.partes[id].est), d: sim.dano[id] || 0 })).filter((x) => x.L > 0.05 || x.d > 0).sort((a, b) => b.L - a.L || b.d - a.d).slice(0, 10);
  $('#simCargas').innerHTML = ids.length && sim.modo !== 'parado' ? `<table><tr><th>Peça</th><th>Carga</th><th>Vida consumida*</th></tr>${ids.map((x) => `<tr class="clic" data-peca="${x.id}"><td>${esc(MOTOR.partes[x.id].n)}${x.L > 1 || x.d > 0.5 ? `<div class="nota" style="margin:0">${esc(MOTOR.partes[x.id].man)}</div>` : ''}</td><td><span class="tag ${x.L > 1 ? 'er' : x.L > 0.85 ? 'al' : 'ok'}">${fmt(x.L * 100, 0)}%</span></td><td>${fmt(x.d, 2)}%</td></tr>`).join('')}</table><p class="nota">* Estimativa didática (ilustrativa) do consumo de vida acima de 95% da carga-limite; não é cálculo de vida real.</p>` : '';
}

/* ---------- Manutenção ---------- */
let tarefaAtual = null;
const feitos = guarda.ler(CHAVE + '_check', {});
desenhar.manutencao = () => {
  const t = tarefaAtual && MOTOR.manutencao.find((x) => x.id === tarefaAtual);
  conteudo.innerHTML = `<h2>Manutenção do motor</h2>
    <p class="nota">Clique numa tarefa: as peças envolvidas acendem no 3D e a vista se ajusta (corte / vista explodida). Marque os passos executados (salvo neste navegador).</p>
    ${t ? `<div class="cartao ativo"><div class="tit"><span>${esc(t.n)}</span><button class="bt mini" id="btFecharTarefa">Fechar</button></div><div class="sub">${esc(t.quando)}</div>
      ${t.passos.map((p, i) => { const k = t.id + ':' + i; return `<div class="item${feitos[k] ? ' feito' : ''}"><input type="checkbox" data-check="${k}" ${feitos[k] ? 'checked' : ''}><div class="desc">${esc(p)}</div></div>`; }).join('')}
      <div class="sub" style="margin-top:6px"><b>Peças:</b> ${t.partes.map((p) => `<span class="chip" data-peca="${p}">${esc(MOTOR.partes[p].n)}</span>`).join(' ')}</div></div>` : ''}
    ${MOTOR.manutencao.filter((x) => x !== t).map((x) => `<div class="item" data-tarefa="${x.id}"><span class="tag lar">⚒</span><div class="desc">${esc(x.n)}<div class="meta">${esc(x.quando)}</div></div></div>`).join('')}
    <p class="nota">Tarefas e passos resumidos para treinamento. Execute sempre conforme o manual de manutenção do motor (${esc(MOTOR.fabricante)}) e o ${esc(CFG.nome)} MM.</p>`;
};
function abrirTarefa(id) {
  const t = MOTOR.manutencao.find((x) => x.id === id); if (!t) return;
  tarefaAtual = id; selPeca = selSensor = null; destaque = new Set(t.partes); anexarGizmo(); barraSel();
  corte = !!t.corte; $('#btCorte').classList.toggle('on', corte); explodirPara(t.explodir || 0);
  const c = new THREE.Box3(); t.partes.forEach((p) => c.union(caixaPeca(p))); if (!c.isEmpty()) focarCaixa(c, 0.8);
  abrirAba('manutencao');
}

/* ---------- Editar ---------- */
const TIPOS_NOVOS = ['Acelerômetro piezoelétrico (100 mV/g)', 'Termopar tipo K (cromel-alumel)', 'Transdutor de pressão (strain gauge)', 'Bulbo RTD (resistência de platina)', 'Pickup magnético (monopolo)', 'Detector magnético de limalha (chip detector)', 'Extensômetro (strain gauge) de deformação', 'Sensor de corrente (efeito Hall)'];
const VAR_DE_TIPO = (t) => /aceler/i.test(t) ? ['vibC', 'ips', 'max', 0.4, 0.6, [0, 2]] : /termopar/i.test(t) ? ['temp', '°C', 'max', P.tempMcp, P.tempTo, [0, 1000]] : /press/i.test(t) ? ['oleoP', 'psi', 'min', P.oleoPmin + 10, P.oleoPmin, [0, 200]] : /rtd/i.test(t) ? ['oleoT', '°C', 'max', P.oleoTmax - 10, P.oleoTmax, [-40, 150]] : /pickup/i.test(t) ? ['ng', '%', 'max', P.ngMcp + 1, P.ngTrans, [0, 110]] : /limalha/i.test(t) ? ['chip', '', 'bool', null, null, [0, 1]] : /extens/i.test(t) ? ['tq', '%', 'max', 100, P.tqTo, [0, 130]] : ['corrente', 'A', 'info', null, null, [0, 400]];
let tipoNovo = TIPOS_NOVOS[0];
desenhar.editar = () => {
  const p = selPeca && MOTOR.partes[selPeca], e = (selPeca && ed.partes[selPeca]) || {}, s = selSensor && SENS.find((x) => x.id === selSensor);
  const editado = Object.keys(ed.partes).length + Object.keys(ed.sensores).length + ed.novos.length + ed.removidos.length;
  conteudo.innerHTML = `<h2>Editar o motor</h2>
    <p class="nota">Selecione uma peça ou um sensor no 3D e use o gizmo para mover (W), girar (E) ou escalar (R). As alterações ficam salvas neste navegador${editado ? ` (${editado} alterações)` : ''}; exporte na aba Dados.</p>
    <div class="linha seg">${[['translate', 'Mover (W)'], ['rotate', 'Girar (E)'], ['scale', 'Escalar (R)']].map(([m, n]) => `<button class="bt ${modoGizmo === m ? 'pri' : ''}" data-gizmo="${m}">${n}</button>`).join('')}</div>
    <h3>Instalar novo sensor</h3>
    <div class="linha"><select id="selTipoNovo" style="flex:1;min-width:160px">${TIPOS_NOVOS.map((t) => `<option ${t === tipoNovo ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select>
      <button class="bt ${modoAdicionar ? 'pri' : ''}" id="btAdicionar">${modoAdicionar ? 'Clique no motor… (Esc cancela)' : '+ Instalar no ponto clicado'}</button></div>
    ${p ? `<h3>Peça: ${esc(p.n)}</h3>
      <div class="grade"><div><label>Deslocar X (m)</label><input type="number" step="0.01" data-ped="0" value="${(e.pos || [0, 0, 0])[0]}"></div><div><label>Y</label><input type="number" step="0.01" data-ped="1" value="${(e.pos || [0, 0, 0])[1]}"></div><div><label>Z</label><input type="number" step="0.01" data-ped="2" value="${(e.pos || [0, 0, 0])[2]}"></div></div>
      <div class="linha"><label class="nota">Cor <input type="color" id="corPeca" value="${e.cor || '#' + motor.pecas[selPeca].mats[0].userData.base.cor.toString(16).padStart(6, '0')}"></label>
        <label class="nota"><input type="checkbox" id="ocultaPeca" ${e.oculto ? 'checked' : ''}> ocultar (desmontada)</label><button class="bt" id="btRepoePeca">Repor esta peça</button></div>` : ''}
    ${s ? `<h3>Sensor: ${esc(s.n)}</h3>
      <div class="campo"><label>Nome</label><input type="text" id="sNome" value="${esc(s.n)}"></div>
      <div class="grade"><div><label>Unidade</label><input type="text" id="sUn" value="${esc(s.un)}"></div><div><label>Alerta</label><input type="number" id="sAl" value="${s.al ?? ''}"></div><div><label>Crítico</label><input type="number" id="sCr" value="${s.cr ?? ''}"></div></div>
      <div class="campo"><label>Como instalar</label><textarea id="sInst">${esc(s.inst)}</textarea></div>
      <div class="campo"><label>Como testar</label><textarea id="sTeste">${esc(s.teste)}</textarea></div>
      <div class="linha"><button class="bt pri" id="btSalvarSensor">Salvar sensor</button><button class="bt perigo" id="btRemoverSensor">Remover do mapa</button></div>
      <p class="nota">Posição (m): <span id="posSensor">${s.pos.map((x) => fmt(x, 3)).join(' / ')}</span> · peça: ${esc(MOTOR.partes[s.parte]?.n || s.parte)}</p>` : ''}
    ${!p && !s ? '<p class="nota">Nada selecionado: clique numa peça ou num ponto de sensor.</p>' : ''}
    <h3>Restaurar</h3><div class="linha"><button class="bt perigo" id="btReporTudo">Repor o motor original</button></div>`;
};
function atualizarCamposEdicao() {
  const e = (selPeca && ed.partes[selPeca]) || {};
  conteudo.querySelectorAll('[data-ped]').forEach((i) => { i.value = (e.pos || [0, 0, 0])[+i.dataset.ped]; });
  const ps = $('#posSensor'), s = selSensor && SENS.find((x) => x.id === selSensor); if (ps && s) ps.textContent = s.pos.map((x) => fmt(x, 3)).join(' / ');
}
function adicionarSensorEm(h) {
  const pos = motor.raiz.worldToLocal(h.point.clone());
  const n = h.face ? h.face.normal.clone().transformDirection(h.object.matrixWorld) : new THREE.Vector3(0, 1, 0);
  const dirLocal = n.clone().transformDirection(new THREE.Matrix4().copy(motor.raiz.matrixWorld).invert()).normalize();
  const [vr, un, lim, al, cr, faixa] = VAR_DE_TIPO(tipoNovo), parte = h.object.userData.peca;
  const id = 'u' + Date.now().toString(36);
  ed.novos.push({ id, n: `${tipoNovo.split(' (')[0]} – ${MOTOR.partes[parte].n}`, tipo: tipoNovo, var: vr, un, lim, al, cr, faixa, tol: (faixa[1] - faixa[0]) * 0.02, parte,
    pos: pos.toArray().map((v) => +v.toFixed(4)), dir: dirLocal.toArray().map((v) => +v.toFixed(3)), orig: 'Adicionado pelo usuário',
    inst: 'Descreva o ponto de fixação, o torque, a vedação e o roteamento do cabo.', teste: 'Descreva o estímulo de teste, os pontos e a tolerância.' });
  salvarEd(); SENS = sensores(); montarMarcadores(); modoAdicionar = false;
  selecionarSensor(id, { foco: false }); desenhar.editar();
}

/* ---------- Dados ---------- */
function baixar(nome, texto, tipo) { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([texto], { type: tipo })); a.download = nome; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 3000); }
const csv = (linhas) => '﻿' + linhas.map((l) => l.map((c) => { c = String(c ?? ''); return /[;"\n]/.test(c) ? '"' + c.replace(/"/g, '""') + '"' : c; }).join(';')).join('\r\n');
const dataArq = () => new Date().toISOString().slice(0, 10);
let msgDados = '';
desenhar.dados = () => {
  conteudo.innerHTML = `<h2>Dados do motor 3D</h2>${msgDados ? `<p class="nota" style="color:var(--acento2)">${esc(msgDados)}</p>` : ''}
    <h3>Edição do motor e dos sensores</h3>
    <div class="linha"><button class="bt pri" data-dado="json">Exportar edição (.json)</button><button class="bt" data-dado="abrir">Importar edição…</button><input type="file" id="arqImport" accept=".json,application/json" hidden></div>
    <h3>Planilhas (CSV para Excel)</h3>
    <h3>Mapa de onde colocar os sensores</h3>
    <div class="linha"><button class="bt pri" data-dado="folha">Folha de instalação (imprimir / PDF)</button></div>
    <div class="linha"><button class="bt" data-dado="csvmapa">Mapa de sensores</button><button class="bt" data-dado="csvlog">Registro dos testes</button><button class="bt" data-dado="csvbite">Teste de sensores</button><button class="bt" data-dado="csvman">Checklist de manutenção</button></div>
    <h3>Sensores reais</h3><p class="nota">Os ids do mapa (ex.: ${SENS.slice(0, 3).map((s) => esc(s.id)).join(', ')}) servem para enviar leituras reais ao servidor de telemetria do manual (api/telemetria.php, veja o README).</p>
    <h3>Apagar</h3><div class="linha"><button class="bt perigo" data-dado="apagar">Apagar edição e checklists deste motor</button></div>`;
  msgDados = '';
};
function acaoDados(a) {
  const nome = `motor_${CFG.id}_${MOTOR.id}`;
  if (a === 'json') return baixar(`${nome}_edicao_${dataArq()}.json`, JSON.stringify({ app: 'manutencao-interativa-motor', modelo: CFG.id, motor: MOTOR.id, exportado: new Date().toISOString(), edicao: ed }, null, 2), 'application/json');
  if (a === 'abrir') return $('#arqImport').click();
  if (a === 'folha') return folhaInstalacao();
  if (a === 'csvmapa') return baixar(`${nome}_mapa_sensores_${dataArq()}.csv`, csv([['Id', 'Sensor', 'Tipo', 'Peça', 'X (m)', 'Y (m)', 'Z (m)', 'Unidade', 'Alerta', 'Crítico', 'Origem', 'Como instalar', 'Como testar'],
    ...SENS.map((s) => [s.id, s.n, s.tipo, MOTOR.partes[s.parte]?.n || s.parte, ...s.pos, s.un, s.al ?? '', s.cr ?? '', s.orig, s.inst, s.teste])]), 'text/csv');
  if (a === 'csvlog') return baixar(`${nome}_registro_${dataArq()}.csv`, csv([['t (s)', 'Nível', 'Evento'], ...sim.evts.map((e) => [e.t.toFixed(1), e.nivel, e.txt])]), 'text/csv');
  if (a === 'csvbite') return baixar(`${nome}_teste_sensores_${dataArq()}.csv`, csv([['Sensor', 'Id', 'Falha simulada', 'Resultado', 'Diagnóstico'], ...SENS.map((s) => [s.n, s.id, FALHAS_SENSOR[falhasSensor[s.id] || 'ok'], bite[s.id] ? (bite[s.id].ok ? 'PASSOU' : 'FALHOU') : 'não testado', bite[s.id]?.diag || ''])]), 'text/csv');
  if (a === 'csvman') return baixar(`${nome}_checklist_${dataArq()}.csv`, csv([['Tarefa', 'Passo', 'Executado'], ...MOTOR.manutencao.flatMap((t) => t.passos.map((p, i) => [t.n, p, feitos[t.id + ':' + i] ? 'SIM' : '']))]), 'text/csv');
  if (a === 'apagar' && confirm('Apagar a edição do motor, os sensores adicionados e os checklists deste navegador? Não é possível desfazer.')) {
    ed = { partes: {}, sensores: {}, novos: [], removidos: [] }; salvarEd(); for (const k in feitos) delete feitos[k]; guarda.salvar(CHAVE + '_check', feitos);
    SENS = sensores(); montarMarcadores(); posicionarPecas(); msgDados = 'Edição e checklists apagados.'; desenhar.dados();
  }
}
function importar(txt) {
  let j; try { j = JSON.parse(txt); } catch { return 'Arquivo inválido: não é JSON.'; }
  if (!j || j.app !== 'manutencao-interativa-motor' || !j.edicao) return 'Arquivo inválido: não é uma edição de motor deste site.';
  if (j.motor !== MOTOR.id) return `Esta edição é do motor ${j.motor}, não do ${MOTOR.id}.`;
  const e = j.edicao, num = (v) => (Number.isFinite(+v) ? +v : 0), vet = (v) => (Array.isArray(v) ? v.slice(0, 3).map(num) : undefined), txt2 = (v, n = 400) => String(v ?? '').slice(0, n);
  const partes = {};
  for (const id of Object.keys(e.partes || {})) if (MOTOR.partes[id]) { const x = e.partes[id] || {}; partes[id] = { pos: vet(x.pos), rot: vet(x.rot), esc: x.esc ? num(x.esc) : undefined, cor: /^#[0-9a-f]{6}$/i.test(x.cor) ? x.cor : undefined, oculto: !!x.oculto }; }
  const sens = {};
  for (const id of Object.keys(e.sensores || {})) { const x = e.sensores[id] || {}; sens[id] = { pos: vet(x.pos), dir: vet(x.dir), n: x.n ? txt2(x.n, 80) : undefined, un: x.un !== undefined ? txt2(x.un, 10) : undefined, al: x.al != null ? num(x.al) : undefined, cr: x.cr != null ? num(x.cr) : undefined, inst: x.inst ? txt2(x.inst) : undefined, teste: x.teste ? txt2(x.teste) : undefined }; }
  for (const id in sens) for (const k in sens[id]) if (sens[id][k] === undefined) delete sens[id][k];
  const novos = (Array.isArray(e.novos) ? e.novos : []).slice(0, 60).filter((x) => x && MOTOR.partes[x.parte]).map((x) => ({ id: txt2(x.id, 20).replace(/[^\w]/g, '') || 'u' + Math.random().toString(36).slice(2, 8), n: txt2(x.n, 80), tipo: txt2(x.tipo, 80), var: txt2(x.var, 12), un: txt2(x.un, 10), lim: ['max', 'min', 'bool', 'info'].includes(x.lim) ? x.lim : 'info', al: x.al != null ? num(x.al) : null, cr: x.cr != null ? num(x.cr) : null, faixa: vet(x.faixa) || [0, 100], tol: num(x.tol), parte: x.parte, pos: vet(x.pos) || [0, 0, 0], dir: vet(x.dir) || [0, 1, 0], orig: 'Adicionado pelo usuário', inst: txt2(x.inst), teste: txt2(x.teste) }));
  ed = { partes, sensores: sens, novos, removidos: (Array.isArray(e.removidos) ? e.removidos : []).filter((x) => typeof x === 'string').slice(0, 100) };
  salvarEd(); SENS = sensores(); montarMarcadores(); posicionarPecas();
  return `Edição de ${String(j.exportado || '').slice(0, 10)} importada.`;
}

/* ---------- eventos do painel ---------- */
conteudo.addEventListener('click', (e) => {
  const t = e.target;
  if (t.matches('input, select, textarea, summary, a') || t.closest('details')) return;
  if (t.dataset.dado) { acaoDados(t.dataset.dado); return; }
  if (t.dataset.ir) { abrirAba(t.dataset.ir); return; }
  if (t.dataset.gizmo) { modoGizmo = t.dataset.gizmo; anexarGizmo(); desenhar.editar(); return; }
  if (t.id === 'btNumMapa') { ligarMapaNum(!marcas.ativo); desenhar.sensores(); return; }
  if (t.id === 'btTodosRot') { verRotulos = !verRotulos; $('#btRotulos').classList.toggle('on', verRotulos); desenhar.sensores(); return; }
  if (t.id === 'btPartida') { sim.partida(falhaPartida); desenhar.testes(); return; }
  if (t.id === 'btAbortar') { if (sim.modo === 'partida') sim.abortar('Partida abortada pelo operador'); else sim.abortar('Corte do motor pelo operador', 'info'); return; }
  if (t.id === 'btVoo') { sim.voo(); desenhar.testes(); return; }
  if (t.id === 'btEstresse') { sim.estressar(tipoEstresse, intensidade); ligarCarga(true); desenhar.testes(); return; }
  if (t.id === 'btBite') { rodarBite(); return; }
  if (t.id === 'btFalhaAleat') { const s = SENS[Math.floor(Math.random() * SENS.length)], f = ['aberto', 'curto', 'deriva', 'ruido', 'intermitente'][Math.floor(Math.random() * 5)]; falhasSensor[s.id] = f; desenhar.testes(); return; }
  if (t.id === 'btFalhaLimpa') { for (const k in falhasSensor) delete falhasSensor[k]; bite = {}; desenhar.testes(); return; }
  if (t.id === 'btFecharTarefa') { tarefaAtual = null; destaque.clear(); explodirPara(0); corte = false; $('#btCorte').classList.remove('on'); barraSel(); desenhar.manutencao(); return; }
  if (t.id === 'btAdicionar') { modoAdicionar = !modoAdicionar; gizmo.detach(); desenhar.editar(); return; }
  if (t.id === 'btRepoePeca' && selPeca) { delete ed.partes[selPeca]; salvarEd(); posicionarPecas(); desenhar.editar(); return; }
  if (t.id === 'btSalvarSensor' && selSensor) {
    const dados = { n: $('#sNome').value.trim().slice(0, 80) || 'Sensor', un: $('#sUn').value.slice(0, 10), inst: $('#sInst').value.slice(0, 400), teste: $('#sTeste').value.slice(0, 400) };
    if ($('#sAl').value !== '') dados.al = +$('#sAl').value; if ($('#sCr').value !== '') dados.cr = +$('#sCr').value;
    gravarSensor(selSensor, dados); desenhar.editar(); return;
  }
  if (t.id === 'btRemoverSensor' && selSensor) {
    if (ed.novos.some((x) => x.id === selSensor)) ed.novos = ed.novos.filter((x) => x.id !== selSensor); else ed.removidos.push(selSensor);
    salvarEd(); SENS = sensores(); montarMarcadores(); selecionarSensor(null); desenhar.editar(); return;
  }
  if (t.id === 'btReporTudo') { if (confirm('Repor o motor original? As peças movidas, os sensores editados e os sensores adicionados serão apagados.')) { ed = { partes: {}, sensores: {}, novos: [], removidos: [] }; salvarEd(); SENS = sensores(); montarMarcadores(); posicionarPecas(); limparSelecao(); desenhar.editar(); } return; }
  const sen = t.closest('[data-sensor]'); if (sen) { selecionarSensor(sen.dataset.sensor); if (abaAtual === 'motor') abrirAba('sensores'); else if (abaAtual !== 'testes') desenhar[abaAtual](); return; }
  const pc = t.closest('[data-peca]'); if (pc) { selecionarPeca(pc.dataset.peca); if (abaAtual === 'motor' || abaAtual === 'editar') desenhar[abaAtual](); return; }
  const tf = t.closest('[data-tarefa]'); if (tf) { abrirTarefa(tf.dataset.tarefa); return; }
});
conteudo.addEventListener('change', (e) => {
  const t = e.target;
  if (t.id === 'selFalha') falhaPartida = t.value;
  else if (t.id === 'selEstresse') tipoEstresse = t.value;
  else if (t.id === 'tOat') sim.oat = +t.value || 0;
  else if (t.id === 'tAlt') sim.alt = Math.max(0, +t.value || 0);
  else if (t.id === 'tPeso') sim.peso = Math.max(0.6, Math.min(1.1, (+t.value || 100) / 100));
  else if (t.dataset.falha) { falhasSensor[t.dataset.falha] = t.value; delete bite[t.dataset.falha]; const r = conteudo.querySelector(`[data-res="${t.dataset.falha}"]`); if (r) r.innerHTML = resBite(t.dataset.falha); }
  else if (t.dataset.check) { if (t.checked) feitos[t.dataset.check] = 1; else delete feitos[t.dataset.check]; guarda.salvar(CHAVE + '_check', feitos); t.closest('.item').classList.toggle('feito', t.checked); }
  else if (t.id === 'selTipoNovo') tipoNovo = t.value;
  else if (t.dataset.ped !== undefined && selPeca) { const x = ed.partes[selPeca] ??= {}; x.pos = x.pos || [0, 0, 0]; x.pos[+t.dataset.ped] = +t.value || 0; salvarEd(); posicionarPecas(); }
  else if (t.id === 'corPeca' && selPeca) { (ed.partes[selPeca] ??= {}).cor = t.value; salvarEd(); }
  else if (t.id === 'ocultaPeca' && selPeca) { (ed.partes[selPeca] ??= {}).oculto = t.checked; salvarEd(); }
  else if (t.id === 'arqImport') { const f = t.files[0]; if (f) f.text().then((x) => { msgDados = importar(x); desenhar.dados(); }); }
});
conteudo.addEventListener('input', (e) => { if (e.target.id === 'selInt') { intensidade = +e.target.value; $('#vInt').textContent = Math.round(intensidade * 100) + '%'; } });

/* ---------- folha de instalação dos sensores (vistas numeradas + tabela) ---------- */
async function folhaInstalacao() {
  const win = abrirJanela();
    const lista = ordemMapa(), v = new THREE.Vector3();
  const pontos = lista.filter((s) => marcadores[s.id]).map((s) => ({ n: NUM.get(s.id), cor: COR_TIPO(s.tipo), pos: marcadores[s.id].localToWorld(new THREE.Vector3(0, 0.05, 0)),
    dir: new THREE.Vector3(...(s.dir || [0, 1, 0])).transformDirection(motor.raiz.matrixWorld) }));
  const estado = { vis: grpSens.visible, sel: selPeca, sen: selSensor };
  const imagens = await capturarVistas({ renderer, cena, camera, alvo: VISTA.alvo.clone(), dist: 1.75 * S, pontos, esconder: [grade],
    vistas: [{ nome: 'Lado direito', dir: [0.12, 0.22, 1] }, { nome: 'Lado esquerdo', dir: [0.12, 0.22, -1] }, { nome: 'Vista de cima (frente para o alto)', dir: [0.001, 1, 0], up: [1, 0, 0] }, { nome: 'Vista de baixo', dir: [0.001, -1, 0], up: [1, 0, 0] }],
    antes: () => { grpSens.visible = true; gizmo.visible = false; selPeca = selSensor = null; pintar(0); }, depois: () => { grpSens.visible = estado.vis; gizmo.visible = true; selPeca = estado.sel; selSensor = estado.sen; } });
  escreverFolha(win, {
    titulo: `Mapa de instalação dos sensores – ${MOTOR.nome}`,
    subtitulo: `${CFG.nome} · ${lista.length} pontos de medição · Manutenção Interativa · ${new Date().toLocaleDateString('pt-BR')}`,
    legenda: [['Termopar', 0xff6a3d], ['Pressão / torque', 0x3fa7ff], ['Rotação', 0x46c08a], ['Vibração', 0xb26bff], ['Temperatura RTD', 0xff9f6a], ['Discreto (limalha, ΔP)', 0xf0b83c], ['Outros', 0xd0d6de]],
    imagens, cab: ['Nº', 'Sensor', 'Tipo', 'Onde instalar (peça)', 'Posição no modelo (m)', 'Faixa / limites', 'Como instalar', 'Como testar'],
    linhas: lista.map((s) => ({ n: NUM.get(s.id), cor: COR_TIPO(s.tipo), cols: [s.n + (/HUMS|adicional/i.test(s.orig) ? ' (adicional)' : /usuário/i.test(s.orig) ? ' (seu)' : ''), s.tipo, MOTOR.partes[s.parte]?.n || s.parte,
      s.pos.map((x) => fmt(x, 3)).join(' / '), (s.lim === 'max' || s.lim === 'min') ? `alerta ${s.al} · crítico ${s.cr} ${s.un}` : `faixa ${(s.faixa || []).join('–')} ${s.un}`, s.inst, s.teste] })),
    nota: 'Posições ilustrativas no modelo 3D (eixo X = eixo do motor, +X = frente). Torque, gap, vedação e roteamento oficiais: manual do motor e do fabricante do sensor. Sensores adicionais (HUMS) exigem projeto aprovado para instalação em aeronave.'
  });
}

// link direto para um sensor: motor.html?m=505&s=tc_1 (usado pela tabela de motores e sensores)
const sIni = new URLSearchParams(location.search).get('s');
if (sIni && SENS.some((x) => x.id === sIni)) { abrirAba('sensores'); selecionarSensor(sIni); desenhar.sensores(); }
else abrirAba(ABAS.includes(location.hash.slice(1)) ? location.hash.slice(1) : 'motor');
window.motor3d = { CFG, MOTOR, sim, motor, SENS: () => SENS, abrirAba, abrirTarefa, selecionarPeca, selecionarSensor }; // útil para testes no console
