// Manutenção Interativa – comandos de voo e painel de instrumentos em 3D (comandos.html?m=505).
// Cadeia de comando ilustrativa (cíclico, coletivo, pedais → jackshafts, tubos, bellcranks, mixer → servos → swashplate e
// rotor de cauda), painel por tipo de aviônica, teste de movimento e procedimentos do índice interno dos manuais Bell.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { modeloAtual, mostrarErro } from './carregar.js?v=20261117f';
import { construirHelicoptero, FORMAS } from './modelo.js?v=20261117f';

const CFG = modeloAtual();
const CMD = window.COMANDOS, MC = CMD.modelos[CFG.id] || CMD.modelos['505'];
const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const PORTAL = 'https://www.bellhelicopter.net/tp';

/* ---------- identidade ---------- */
document.title = `Comandos e painel 3D · ${CFG.nome} · Manutenção Interativa`;
document.documentElement.style.setProperty('--acento', CFG.cor);
$('#selo').textContent = CFG.curto;
$('#subModelo').textContent = `${CFG.nome} · ${CMD.PAINEIS[MC.painel].nome}`;
$('#btManual').href = 'manual.html?m=' + CFG.id; $('#btMotor').href = 'motor.html?m=' + CFG.id;
$('#trocaModelo').innerHTML = (window.CATALOGO || []).map((c) => `<option value="${c.id}" ${c.id === CFG.id ? 'selected' : ''}>${esc(c.nome)}</option>`).join('');
$('#trocaModelo').onchange = (e) => { location.href = 'comandos.html?m=' + e.target.value + location.hash; };

/* ---------- geometria de referência do modelo (posições em metros; +X nariz, +Y cima, +Z direita) ---------- */
function geometria() {
  const F = FORMAS[CFG.id];
  if (!F) return { pisoY: 0.72, painelX: 2.2, painelY: 1.48, painelL: 1.2, assX: 1.3, assZ: 0.42, pedX: 2.3, deckY: 2.6, swY: 2.96, mastroY: 3.3, rotorR: 5.5, trasX: -2.35, coneX: -4.2, caudaY: 1.95, rc: { x: -8.0, y: 2.3, z: -0.32 } };
  return { pisoY: F.piso.y, painelX: F.painel.x, painelY: F.painel.y, painelL: F.painel.l, assX: F.tripAss.x, assZ: Math.abs(F.tripAss.zs[0]), pedX: F.painel.x + 0.12,
    deckY: F.trans.y0, swY: F.trans.y1 + 0.29, mastroY: F.rotor.y, rotorR: F.rotor.raio, trasX: F.trasX[0], coneX: F.coneX[0], caudaY: F.eixoRc[1][1] - 0.15,
    rc: { x: F.rc.x, y: F.rc.y, z: F.rc.z } };
}
const G = geometria();

/* =====================================================================
   Cena
   ===================================================================== */
const vista = $('#vista');
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
vista.prepend(renderer.domElement);
const cena = new THREE.Scene();
cena.add(new THREE.HemisphereLight(0xdde6f0, 0x20262e, 1.1));
const sol = new THREE.DirectionalLight(0xffffff, 1.4); sol.position.set(4, 8, 6); cena.add(sol);
const camera = new THREE.PerspectiveCamera(42, 1, 0.05, 200);
const controles = new OrbitControls(camera, renderer.domElement);
controles.enableDamping = true; controles.minDistance = 0.4; controles.maxDistance = 30;
const xCentro = (G.painelX + G.trasX) / 2 - 0.3; // centraliza a cabine de cada modelo
const VISTA_GERAL = { pos: new THREE.Vector3(xCentro + 4.6, 4.0, 6.6), alvo: new THREE.Vector3(xCentro, 1.5, 0) };
const VISTA_PAINEL = { pos: new THREE.Vector3(G.assX - 0.2, G.painelY + 0.25, G.assZ * 0.4), alvo: new THREE.Vector3(G.painelX, G.painelY - 0.05, 0) };
camera.position.copy(VISTA_GERAL.pos); controles.target.copy(VISTA_GERAL.alvo); controles.update();

// Fuselagem do próprio modelo (do manual 3D), quase transparente, sem as peças que esta página redesenha
const heli = construirHelicoptero(CFG.id);
const ESCONDER = ['comandos', 'comandos_rc', 'swash', 'hidraulico', 'painel', 'mastro'];
const matsFus = new Set();
for (const m of heli.malhas) {
  if (ESCONDER.includes(m.userData.comp)) { m.visible = false; continue; }
  matsFus.add(m.material);
}
for (const m of matsFus) { m.transparent = true; m.opacity = 0.07; m.depthWrite = false; }
if (heli.matLinha) heli.matLinha.opacity = 0.25;
heli.raiz.traverse((o) => { if (o.isMesh) o.raycast = () => {}; });
cena.add(heli.raiz);

/* ---------- materiais e cores por grupo ---------- */
const CORES = { coletivo: 0xe0b23a, ciclico: 0x4f93e0, direcional: 0x46c08a, servos: 0x9b6ad8, rotativo: 0xaab3bd, motor: 0xe0663a, painel: 0x39414b };
const NOMES_G = { coletivo: 'Coletivo', ciclico: 'Cíclico', servos: 'Servos hidráulicos', rotativo: 'Swashplate e rotativos', direcional: 'Direcional (rotor de cauda)', motor: 'Controle do motor' };
const pecas = {}; // id -> { info, grupo, mats, meshes }
const malhas = [];
function mat(cor, o = {}) { return new THREE.MeshStandardMaterial({ color: cor, metalness: 0.45, roughness: 0.45, ...o }); }
function peca(id, pai = cena) {
  if (pecas[id]) return pecas[id];
  const info = CMD.PECAS[id] || { g: 'painel', n: id, sns: [] };
  const grupo = new THREE.Group(); grupo.userData.id = id; pai.add(grupo);
  const m = mat(CORES[info.g] ?? 0x888888); m.userData.base = m.color.getHex();
  return (pecas[id] = { id, info, grupo, mats: [m], meshes: [] });
}
function addM(id, mesh, pai) {
  const p = peca(id); const alvo = pai || p.grupo;
  if (!mesh.material || mesh.material === TEMP) mesh.material = p.mats[0];
  mesh.userData.peca = id; p.meshes.push(mesh); malhas.push(mesh); alvo.add(mesh); return mesh;
}
const TEMP = mat(0xffffff);
const V3 = (a) => new THREE.Vector3(...a);
function tubo(a, b, r = 0.012, seg = 10) {
  const A = V3(a), B = V3(b), m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, Math.max(A.distanceTo(B), 0.001), seg), TEMP);
  m.position.copy(A).add(B).multiplyScalar(0.5); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.clone().sub(A).normalize()); return m;
}
function caixa(s, p, rot) { const m = new THREE.Mesh(new THREE.BoxGeometry(...s), TEMP); m.position.set(...p); if (rot) m.rotation.set(...rot); return m; }
function bola(r, p) { const m = new THREE.Mesh(new THREE.SphereGeometry(r, 14, 10), TEMP); m.position.set(...p); return m; }
function anel(R, r, p) { const m = new THREE.Mesh(new THREE.TorusGeometry(R, r, 8, 40), TEMP); m.rotation.x = Math.PI / 2; m.position.set(...p); return m; }
// Bellcrank: duas hastes em L a partir de um pivô
function bellcrank(id, piv, a, b) { addM(id, bola(0.025, piv)); addM(id, tubo(piv, a, 0.012)); addM(id, tubo(piv, b, 0.012)); addM(id, caixa([0.04, 0.04, 0.08], piv)); }

/* =====================================================================
   Cadeia de comando (posições paramétricas a partir da geometria do modelo)
   ===================================================================== */
const y0 = G.pisoY - 0.08;           // sob o piso
const zP = G.assZ;                   // piloto à direita (+Z), copiloto à esquerda
const xAss = G.assX, xPed = G.pedX;
const xParede = MC.subida ? MC.subida.x : Math.min(0.35, G.assX - 0.75); // subida dos comandos (parede traseira ou coluna da porta)
const yDeck = G.deckY + 0.05, ySw = G.swY;
const servos = { e: [0.24, -0.22], d: [0.24, 0.22], c: [-0.26, 0] };
const ANIM = {}; // grupos que se movem no teste

function montarCadeia(lado, copiloto) {
  const z = lado * zP, sfx = copiloto ? '_cp' : '';
  // ---- coletivo: à esquerda de cada piloto ----
  const zc = z - 0.22; // coletivo à esquerda de cada assento (−Z)
  const colPiv = [xAss - 0.15, G.pisoY + 0.05, zc];
  const gCol = new THREE.Group(); gCol.position.set(...colPiv); peca('col_stick').grupo.add(gCol);
  addM('col_stick', tubo([0, 0, 0], [0.5, 0.2, 0], 0.016), gCol);
  addM('col_stick', tubo([0.5, 0.2, 0], [0.62, 0.22, 0], 0.024), gCol);
  addM('col_stick', caixa([0.08, 0.06, 0.07], [0.6, 0.24, 0]), gCol);
  (ANIM.col ??= []).push(gCol);
  if (!copiloto) { addM('col_friction', tubo([colPiv[0] + 0.12, colPiv[1] + 0.03, zc - 0.05], [colPiv[0] + 0.12, colPiv[1] - 0.12, zc - 0.05], 0.01)); addM('col_friction', caixa([0.05, 0.05, 0.05], [colPiv[0] + 0.05, colPiv[1], zc])); }
  // ---- cíclico: entre as pernas ----
  const cicPiv = [xAss + 0.32, G.pisoY + 0.02, z];
  const gCic = new THREE.Group(); gCic.position.set(...cicPiv); peca('cic_stick').grupo.add(gCic);
  addM('cic_stick', tubo([0, 0, 0], [0.06, 0.6, 0], 0.016), gCic);
  addM('cic_stick', caixa([0.05, 0.13, 0.05], [0.07, 0.67, 0]), gCic);
  (ANIM.cic ??= []).push(gCic);
  addM('cic_base', caixa([0.12, 0.05, 0.12], [cicPiv[0], cicPiv[1] - 0.02, z]));
  addM('cic_torque', tubo([cicPiv[0], y0, z], [cicPiv[0], y0, 0], 0.016));
  // ---- pedais ----
  const gPed = []; for (const s of [1, -1]) {
    const pz = z + s * 0.13; const g = new THREE.Group(); g.position.set(xPed, G.pisoY + 0.02, pz); peca('pedais').grupo.add(g);
    addM('pedais', tubo([0, 0, 0], [0.06, 0.22, 0], 0.013), g); addM('pedais', caixa([0.05, 0.13, 0.09], [0.08, 0.25, 0], [0, 0, -0.5]), g);
    g.userData.s = s; gPed.push(g); addM('ped_jack', tubo([xPed, G.pisoY + 0.02, pz], [xPed, y0, pz], 0.012));
  }
  (ANIM.ped ??= []).push(...gPed);
  addM('ped_jack', tubo([xPed, y0, z + 0.18], [xPed, y0, z - 0.18], 0.016));
  addM('ped_jack', tubo([xPed - 0.45, y0, z + 0.15], [xPed - 0.45, y0, z - 0.15], 0.016));
  for (const s of [1, -1]) addM('ped_jack', tubo([xPed, y0, z + s * 0.12], [xPed - 0.45, y0, z + s * 0.12], 0.009));
  if (!copiloto) return;
  // comandos duplos marcados como copiloto
  for (const id of ['col_stick', 'cic_stick', 'pedais']) pecas[id].copiloto = true;
  void sfx;
}

function montar() {
  montarCadeia(1, false); // piloto (direita)
  const cp = new THREE.Group(); cp.name = 'copiloto'; cena.add(cp);
  const antes = new Set(malhas); montarCadeia(-1, true);
  for (const m of malhas) if (!antes.has(m)) m.userData.cp = true;

  // ---- coletivo: jackshaft → tubo → bellcrank de inversão → tubo vertical → alavanca → bellcrank/servo ----
  const zJ = 0.0;
  addM('col_jack', tubo([xAss - 0.15, y0, zP - 0.15], [xAss - 0.15, y0, -zP - 0.3], 0.018));
  for (const z of [zP - 0.22, -zP - 0.22]) addM('col_jack', tubo([xAss - 0.15, G.pisoY + 0.05, z], [xAss - 0.15, y0, z], 0.012));
  addM('col_tubo1', tubo([xAss - 0.15, y0 + 0.04, zJ + 0.08], [xParede + 0.05, y0 + 0.04, zJ + 0.08], 0.012));
  bellcrank('col_reversao', [xParede, y0, zJ + 0.08], [xParede + 0.05, y0 + 0.04, zJ + 0.08], [xParede, y0 + 0.12, zJ + 0.08]);
  addM('col_tubo2', tubo([xParede, y0 + 0.12, zJ + 0.08], [xParede, yDeck, zJ + 0.08], 0.012));
  bellcrank('col_lever', [xParede - 0.05, yDeck + 0.03, zJ + 0.08], [xParede, yDeck, zJ + 0.08], [servos.c[0] + 0.05, yDeck + 0.06, servos.c[1]]);
  // ---- cíclico: tubo principal → mixer na parede → tubos verticais E/D ----
  addM('cic_torque', tubo([xAss + 0.32, y0 - 0.03, 0], [xParede + 0.12, y0 - 0.03, 0], 0.016));
  addM('cic_tubo', tubo([xAss + 0.32, y0 - 0.06, -0.06], [xParede + 0.12, y0 - 0.06, -0.06], 0.011));
  addM('mixer', caixa([0.16, 0.12, 0.42], [xParede + 0.08, y0 + 0.02, 0]));
  addM('mixer', tubo([xParede + 0.08, y0 + 0.02, -0.25], [xParede + 0.08, y0 + 0.02, 0.25], 0.02));
  for (const [k, s] of [['e', -1], ['d', 1]]) {
    const zt = 0.2 * s;
    addM('cic_subida', tubo([xParede + 0.08, y0 + 0.08, zt], [xParede + 0.08, yDeck, zt], 0.012));
    bellcrank('cic_bellcrank', [xParede + 0.03, yDeck + 0.04, zt], [xParede + 0.08, yDeck, zt], [servos[k][0], yDeck + 0.06, servos[k][1]]);
  }
  if (CMD.PECAS.scas.so.includes(CFG.id)) for (const s of [1, -1]) addM('scas', caixa([0.18, 0.08, 0.08], [xParede + 0.15, y0 + 0.12, 0.12 * s]));
  if (CMD.PECAS.col_transdutor.so.includes(CFG.id)) addM('col_transdutor', caixa([0.08, 0.08, 0.1], [xAss - 0.15, y0 - 0.05, -0.18]));

  // ---- servos sob o swashplate ----
  for (const [k, id] of [['e', 'servo_e'], ['d', 'servo_d'], ['c', 'servo_c']]) {
    const [sx, sz] = servos[k];
    addM(id, tubo([sx, yDeck, sz], [sx, yDeck + 0.32, sz], 0.045, 14));
    addM(id, tubo([sx, yDeck + 0.32, sz], [sx, yDeck + 0.42, sz], 0.018));
    addM(id, caixa([0.1, 0.06, 0.1], [sx, yDeck + 0.04, sz]));
    bellcrank(k === 'c' ? 'col_bellcrank' : 'cic_bellcrank', [sx * 0.7, yDeck + 0.44, sz * 0.7], [sx, yDeck + 0.42, sz], [sx * 0.85, ySw - 0.03, sz * 0.85]);
  }
  // ---- swashplate, mastro, scissors, pitch links ----
  addM('mastro', tubo([0, G.deckY - 0.1, 0], [0, G.mastroY + 0.05, 0], 0.055, 16));
  const gSw = new THREE.Group(); gSw.position.set(0, ySw, 0); peca('swash').grupo.add(gSw);
  addM('swash', anel(0.22, 0.03, [0, 0, 0]), gSw);
  addM('swash', new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.22, 0.05, 28), TEMP), gSw);
  const gRot = new THREE.Group(); gSw.add(gRot); ANIM.rot = gRot; ANIM.sw = gSw;
  addM('swash', anel(0.26, 0.022, [0, 0.06, 0]), gRot);
  const pas = (FORMAS[CFG.id] || { rotor: { pas: 4 } }).rotor.pas;
  for (let i = 0; i < pas; i++) {
    const a = i / pas * Math.PI * 2 + 0.5, c = Math.cos(a), s = Math.sin(a);
    addM('pitch_links', tubo([0.26 * c, ySw + 0.06, 0.26 * s], [0.34 * c, G.mastroY - 0.02, 0.34 * s], 0.012));
    addM('pitch_links', caixa([0.3, 0.06, 0.12], [0.5 * c, G.mastroY, 0.5 * s], [0, -a, 0]));
  }
  addM('scissors', tubo([0, G.mastroY - 0.25, 0.06], [0.18, ySw + 0.12, 0.08], 0.012));
  addM('scissors', tubo([0.18, ySw + 0.12, 0.08], [0.25, ySw + 0.06, 0.02], 0.012));

  // ---- direcional: quadrante sob o piso → cabos/tubos até a cauda → caixa de 90° ----
  const xQ = xAss - 0.55, R = G.rc;
  bellcrank('quadrante', [xQ, y0, 0.25], [xPed - 0.45, y0, zP], [xQ, y0 - 0.12, 0.25]);
  addM('quadrante', tubo([xPed - 0.45, y0, zP - 0.12], [xQ + 0.05, y0, 0.25], 0.009));
  const caminho = [[xQ, y0 - 0.08, 0.25], [G.trasX, y0 + 0.05, 0.25], [G.trasX - 0.3, G.caudaY - 0.2, 0.12], [G.coneX, G.caudaY, 0.08], [R.x + 0.35, R.y - 0.12, 0.05]];
  const linhas = MC.trRc === 'cabo' ? [-0.025, 0.025] : [0];
  for (const off of linhas) for (let i = 0; i < caminho.length - 1; i++) {
    const a = caminho[i].slice(), b = caminho[i + 1].slice(); a[2] += off; b[2] += off;
    addM('dir_linha', tubo(a, b, MC.trRc === 'cabo' ? 0.004 : 0.011, 6));
  }
  for (const p of caminho.slice(1, -1)) addM('dir_linha', MC.trRc === 'cabo' ? new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.02, 16), TEMP).translateX(p[0]).translateY(p[1]).translateZ(p[2]) : caixa([0.05, 0.05, 0.05], p));
  bellcrank('dir_cauda', [R.x + 0.3, R.y - 0.12, 0.05], [R.x + 0.35, R.y - 0.12, 0.05], [R.x + 0.18, R.y - 0.05, 0]);
  addM('dir_cauda', tubo([R.x + 0.18, R.y - 0.05, 0], [R.x + 0.02, R.y, 0], 0.01));
  addM('pcm', caixa([0.2, 0.18, 0.16], [R.x, R.y, 0]));
  const gPcm = new THREE.Group(); gPcm.position.set(R.x, R.y, 0); peca('pcm').grupo.add(gPcm); ANIM.pcm = gPcm;
  addM('pcm', tubo([0, 0, 0], [0, 0, R.z - 0.05], 0.012), gPcm);
  addM('pcm', caixa([0.04, 0.3, 0.03], [0, 0, R.z - 0.06]), gPcm);
  // ---- controle do motor: manete no coletivo → ligação → FCU/HMU no motor; ECU; indicação ----
  const F = FORMAS[CFG.id], Mo = F ? F.motor : { x0: -0.9, x1: -2.3, y: 2.55, r: 0.2 }, zMot = (F && F.motores) || (MC.motores > 1 ? [0.3, -0.3] : [0]);
  const fadec = CMD.PECAS.ecu.so.includes(CFG.id);
  zMot.forEach((mz, i) => {
    addM('manete', tubo([xAss + 0.43, G.pisoY + 0.27, zP - 0.22 - 0.035 * i], [xAss + 0.43, G.pisoY + 0.27, zP - 0.22 + 0.035], 0.03, 14));
    const caminhoM = [[xAss - 0.1, y0 + 0.02, zP - 0.3 - 0.04 * i], [xParede - 0.15, y0 + 0.02, -0.3 - 0.04 * i], [xParede - 0.15, yDeck - 0.15, -0.3], [Mo.x0 - 0.05, Mo.y - 0.12, mz * 0.9]];
    for (let k = 0; k < caminhoM.length - 1; k++) addM('lig_motor', tubo(caminhoM[k], caminhoM[k + 1], fadec ? 0.006 : 0.008, 6));
    addM('fcu', caixa([0.14, 0.12, 0.12], [Mo.x0 - 0.12, Mo.y - 0.2, mz + (mz >= 0 ? -0.1 : 0.1)]));
    addM('ind_motor', bola(0.03, [(Mo.x0 + Mo.x1) / 2, Mo.y + Mo.r * 0.8, mz])); addM('ind_motor', bola(0.025, [Mo.x0 - 0.05, Mo.y + Mo.r * 0.6, mz]));
  });
  if (fadec) { addM('ecu', caixa([0.3, 0.08, 0.24], [G.trasX + 0.3, G.pisoY + 0.75, 0.2])); addM('ecu', tubo([G.trasX + 0.3, G.pisoY + 0.79, 0.2], [Mo.x0 - 0.12, Mo.y - 0.14, zMot[0]], 0.006, 6)); }
  { // chicote da indicação: motor → teto/parede → sob o piso → atrás do painel
    const fio = [[Mo.x0 - 0.05, Mo.y + Mo.r * 0.6, zMot[0]], [Mo.x0 + 0.2, yDeck - 0.1, -0.35], [xParede - 0.2, y0 + 0.05, -0.35], [G.painelX - 0.1, y0 + 0.05, -0.35], [G.painelX + 0.12, G.painelY - 0.1, -0.3]];
    for (let k = 0; k < fio.length - 1; k++) addM('ind_motor', tubo(fio[k], fio[k + 1], 0.005, 6));
  }
  if (CMD.PECAS.servo_rc.so.includes(CFG.id)) addM('servo_rc', tubo([G.trasX - 0.1, y0 + 0.12, 0.25], [G.trasX - 0.45, y0 + 0.12, 0.25], 0.035, 14));
}
montar();
const cpMalhas = malhas.filter((m) => m.userData.cp);
for (const m of cpMalhas) m.visible = false;

/* =====================================================================
   Painel de instrumentos (texturas desenhadas em canvas)
   ===================================================================== */
const PN = CMD.PAINEIS[MC.painel];
const itensPainel = {}; // id -> { n, d, sns }
function texturaTela(titulo, tipo) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 384; const g = c.getContext('2d');
  g.fillStyle = '#05080c'; g.fillRect(0, 0, 512, 384);
  if (/PFD/.test(titulo)) { // horizonte artificial
    g.fillStyle = '#2f6fb5'; g.fillRect(40, 40, 432, 170); g.fillStyle = '#7a5530'; g.fillRect(40, 210, 432, 140);
    g.strokeStyle = '#fff'; g.lineWidth = 3; g.beginPath(); g.moveTo(40, 210); g.lineTo(472, 210); g.stroke();
    g.strokeStyle = '#ffd200'; g.lineWidth = 6; g.beginPath(); g.moveTo(190, 210); g.lineTo(235, 210); g.lineTo(256, 228); g.lineTo(277, 210); g.lineTo(322, 210); g.stroke();
    g.fillStyle = '#0009'; g.fillRect(40, 60, 70, 260); g.fillRect(402, 60, 70, 260);
    g.fillStyle = '#fff'; g.font = '22px monospace'; g.fillText('100', 52, 196); g.fillText('1500', 404, 196);
  } else if (/EICAS|MFD/.test(titulo)) { // barras de motor
    const n = MC.motores || 1; const rot = ['TQ', 'MGT', 'NG', 'NR'];
    for (let m = 0; m < n; m++) rot.forEach((r, i) => {
      const x = 50 + i * 110 + m * 40, h = 120 + 30 * Math.sin(i + m);
      g.fillStyle = '#1b2a1b'; g.fillRect(x, 70, 28, 240); g.fillStyle = '#3ad16a'; g.fillRect(x, 310 - h, 28, h);
      if (m === 0) { g.fillStyle = '#cfe'; g.font = '20px monospace'; g.fillText(r, x - 4, 345); }
    });
  }
  g.fillStyle = '#8fd0ff'; g.font = 'bold 26px system-ui'; g.fillText(titulo, 16, 30);
  g.strokeStyle = '#2a3440'; g.lineWidth = 8; g.strokeRect(4, 4, 504, 376);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function texturaRelogio(rotulo) {
  const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
  g.fillStyle = '#05080c'; g.fillRect(0, 0, 256, 256);
  g.fillStyle = '#11161c'; g.beginPath(); g.arc(128, 128, 118, 0, 7); g.fill(); g.strokeStyle = '#8a929c'; g.lineWidth = 6; g.stroke();
  g.strokeStyle = '#3ad16a'; g.lineWidth = 10; g.beginPath(); g.arc(128, 128, 100, 2.6, 5.4); g.stroke();
  g.strokeStyle = '#f2c14e'; g.beginPath(); g.arc(128, 128, 100, 5.4, 5.9); g.stroke();
  g.strokeStyle = '#e04848'; g.beginPath(); g.arc(128, 128, 100, 5.9, 6.1); g.stroke();
  g.strokeStyle = '#fff'; g.lineWidth = 5; g.beginPath(); g.moveTo(128, 128); g.lineTo(128 + 85 * Math.cos(4.4), 128 + 85 * Math.sin(4.4)); g.stroke();
  g.fillStyle = '#fff'; g.font = 'bold 34px system-ui'; g.textAlign = 'center'; g.fillText(rotulo, 128, 190);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function montarPainel() {
  const gP = new THREE.Group(); gP.position.set(G.painelX + 0.05, G.painelY, 0); gP.rotation.z = 0.32; cena.add(gP);
  const largura = Math.min(G.painelL, 1.25);
  const base = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.36, largura), mat(CORES.painel)); base.userData.peca = 'painel_base'; gP.add(base);
  itensPainel.painel_base = { n: 'Painel de instrumentos – estrutura e glare shield', d: PN.nome + '. ' + (MC.nota || ''), sns: ['31-10', '31'] };
  malhas.push(base);
  const face = (tex, w, h, z, y, id) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex }));
    m.rotation.y = -Math.PI / 2; m.position.set(-0.025, y, z); m.userData.peca = id; gP.add(m); malhas.push(m); return m;
  };
  if (PN.displays) {
    const n = PN.displays.length, w = Math.min(0.3, (largura - 0.1) / n - 0.03);
    PN.displays.forEach(([t, d, sns], i) => {
      const id = 'tela_' + i, z = (i - (n - 1) / 2) * (w + 0.03);
      face(texturaTela(t), w, w * 0.75, z, 0.02, id); itensPainel[id] = { n: 'Display ' + t, d, sns };
    });
  } else {
    let rel = PN.relogios.slice();
    if ((MC.motores || 1) > 1) rel = rel.flatMap((r) => (['TQ', 'MGT', 'NG', 'ÓLEO'].includes(r[0]) ? [[r[0] + ' 1', r[1] + ' – motor 1', r[2]], [r[0] + ' 2', r[1] + ' – motor 2', r[2]]] : [r]));
    const col = Math.ceil(rel.length / 3), d = Math.min(0.1, (largura - 0.06) / col - 0.012);
    rel.forEach(([t, desc, sns], i) => {
      const id = 'rel_' + i, cI = i % col, lI = Math.floor(i / col);
      face(texturaRelogio(t), d, d, (cI - (col - 1) / 2) * (d + 0.012), 0.12 - lI * (d + 0.012), id); itensPainel[id] = { n: 'Instrumento ' + t, d: desc, sns };
    });
  }
  // painel de alarmes (caution/warning)
  const cw = document.createElement('canvas'); cw.width = 512; cw.height = 64; const g = cw.getContext('2d');
  ['CHIP', 'XMSN OIL', 'FUEL LOW', 'GEN', 'HYD', 'ENG OUT', 'RPM'].forEach((s, i) => { g.fillStyle = i % 3 === 0 ? '#5a1414' : '#4a3a08'; g.fillRect(4 + i * 72, 8, 68, 48); g.fillStyle = '#ddd'; g.font = 'bold 13px system-ui'; g.fillText(s, 8 + i * 72, 38); });
  const tCw = new THREE.CanvasTexture(cw); tCw.colorSpace = THREE.SRGBColorSpace;
  face(tCw, Math.min(0.6, largura * 0.6), 0.075, 0, 0.165, 'alarmes'); itensPainel.alarmes = { n: 'Painel de alarmes (caution / warning)', d: 'Luzes/mensagens de alerta: limalha (CHIP), óleo da transmissão, combustível baixo, gerador, hidráulico, motor e rotação do rotor.', sns: ['31-50', '31'] };
  // pedestal com o painel de controles diversos
  const gPd = new THREE.Group(); gPd.position.set(G.painelX - 0.3, G.pisoY + 0.2, 0); cena.add(gPd);
  const ped = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.26, 0.2), mat(CORES.painel)); ped.rotation.z = -0.35; ped.userData.peca = 'pedestal'; gPd.add(ped); malhas.push(ped);
  itensPainel.pedestal = { n: 'Pedestal e painel de controles diversos', d: 'Interruptores: ' + CMD.PEDESTAL.map((p) => p[0]).join(', ') + '; rádios e controles de navegação.', sns: ['31-10', '24', '29', '33', '76'] };
  CMD.PEDESTAL.forEach(([nome, ata], i) => {
    const id = 'int_' + i, s = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.03, 0.02), mat(0xd0d4da));
    s.position.set(-0.12 + (i % 4) * 0.06, 0.14 - Math.floor(i / 4) * 0.05, (i % 2 ? 0.05 : -0.05)); s.userData.peca = id; gPd.add(s); malhas.push(s);
    itensPainel[id] = { n: 'Interruptor ' + nome, d: 'Interruptor ' + nome + ' do painel de controles diversos.', sns: [ata, '31-10'] };
  });
}
montarPainel();

/* =====================================================================
   Informação do manual no 3D: capítulo ATA → peças da cadeia de comando ou componentes da aeronave
   ===================================================================== */
const ATA_COMP = {
  '21': ['entrada_ar', 'avionica'], '22': ['avionica'], '23': ['antenas', 'avionica'], '24': ['bateria', 'gerador'], '25': ['piso'],
  '26': ['extintor'], '28': ['combustivel'], '29': ['hidraulico'], '30': ['pitot'], '31': ['avionica', 'avionica_tras'], '32': ['esquis'],
  '33': ['luzes'], '34': ['pitot', 'antenas', 'avionica'], '45': ['avionica'], '46': ['avionica', 'avionica_tras'], '52': ['piso'],
  '53': ['piso', 'suporte_trans'], '55': ['estabilizador', 'deriva'], '62': ['cubo_rp', 'pas_rp'], '63': ['transmissao', 'suporte_trans', 'eixo_motor'],
  '64': ['rotor_cauda'], '65': ['eixo_rc', 'caixa_rc'], '71': ['motor'], '72': ['motor'], '73': ['motor'], '74': ['motor'], '75': ['entrada_ar', 'motor'],
  '76': ['motor'], '77': ['motor'], '78': ['escapamento'], '79': ['radiador_oleo', 'motor'], '80': ['motor', 'gerador']
};
const NOME_ATA = { '21': 'Ar condicionado / ventilação', '22': 'Piloto automático', '23': 'Comunicações', '24': 'Energia elétrica', '25': 'Equipamentos / interior', '26': 'Proteção contra fogo', '28': 'Combustível', '29': 'Hidráulico', '30': 'Proteção contra gelo e chuva', '31': 'Indicação / registro', '32': 'Trem de pouso (esquis)', '33': 'Luzes', '34': 'Navegação', '45': 'Manutenção a bordo', '46': 'Integração de sistemas', '52': 'Portas', '53': 'Fuselagem', '55': 'Estabilizadores', '62': 'Rotor principal', '63': 'Transmissão do rotor principal', '64': 'Rotor de cauda', '65': 'Transmissão do rotor de cauda', '67': 'Comandos de voo', '71': 'Grupo motopropulsor', '72': 'Motor', '73': 'Combustível e controle do motor', '74': 'Ignição', '75': 'Ar do motor', '76': 'Controles do motor', '77': 'Indicação do motor', '78': 'Escapamento', '79': 'Óleo do motor', '80': 'Partida' };
const matDestaque = new THREE.MeshStandardMaterial({ color: 0xffa040, emissive: 0x6a3000, metalness: 0.3, roughness: 0.5, transparent: true, opacity: 0.92 });
let destacadas = [];
function limparDestaque() { for (const m of destacadas) { m.material = m.userData.matOrig; m.visible = m.userData.visOrig; } destacadas = []; }
function destacarComps(comps) {
  limparDestaque(); const cx = new THREE.Box3();
  for (const m of heli.malhas) if (comps.includes(m.userData.comp)) {
    m.userData.matOrig = m.material; m.userData.visOrig = m.visible; m.material = matDestaque; m.visible = true; destacadas.push(m); cx.expandByObject(m);
  }
  return cx.isEmpty() ? null : cx;
}
// sns: código SNS/ATA do procedimento (ex.: '67-11-01', '21-00'); titulo/sub: para o cartão no 3D
function mostrarNo3d(sns, titulo, sub, ref) {
  sns = String(sns || ''); const cap = sns.slice(0, 2);
  // 1) peça da cadeia de comando com o código mais específico (67 comandos; 29/73/76 quando houver peça própria)
  let melhor = null, nota = -1;
  for (const [id, p] of Object.entries(pecas)) for (const c of p.info.sns) if (sns === c || sns.startsWith(c + '-')) { const n = c.length + (sns === c ? 10 : 0); if (n > nota) { nota = n; melhor = id; } }
  const usarPeca = melhor && (cap === '67' || (['29', '73', '76', '77'].includes(cap) && nota >= 5) || !ATA_COMP[cap]);
  if (usarPeca) { limparDestaque(); selecionandoPorProc = true; selecionar(melhor); selecionandoPorProc = false; cartao3d = { titulo, sub: (sub ? sub + ' · ' : '') + pecas[melhor].info.n, ref, sns }; atualizarCartao3d(); return; }
  if (cap === '67') { // comandos de voo em geral: destaca toda a cadeia
    limparDestaque(); sel = null; for (const p of Object.values(pecas)) for (const m of p.mats) m.emissive.setHex(0x5a3a10);
    voar(VISTA_GERAL.pos, VISTA_GERAL.alvo); cartao3d = { titulo, sub: (sub ? sub + ' · ' : '') + 'ATA 67 – Comandos de voo (cadeia inteira destacada)', ref, sns }; atualizarCartao3d(); return;
  }
  // 2) componentes da aeronave pelo capítulo ATA
  const comps = ATA_COMP[cap] || [];
  if (!heli.raiz.visible) { heli.raiz.visible = true; $('#btFuselagem').classList.add('on'); }
  const cx = destacarComps(comps);
  sel = null; realcar(null);
  if (cx) { const c = cx.getCenter(new THREE.Vector3()), r = Math.max(cx.getSize(new THREE.Vector3()).length(), 0.8); const d = camera.position.clone().sub(controles.target).normalize().multiplyScalar(r * 1.6 + 1); voar(c.clone().add(d), c); }
  cartao3d = { titulo, sub: (sub ? sub + ' · ' : '') + (NOME_ATA[cap] ? `ATA ${cap} – ${NOME_ATA[cap]}` : 'ATA ' + cap), ref, sns, semPeca: !cx };
  atualizarCartao3d();
}
let cartao3d = null;
function atualizarCartao3d() {
  let el = $('#cartao3d');
  if (!el) { el = document.createElement('div'); el.id = 'cartao3d'; vista.appendChild(el); }
  if (!cartao3d) { el.hidden = true; return; }
  const { titulo, sub, ref, semPeca } = cartao3d;
  let figs = '', texto = '';
  if (ref && INDICE) {
    const M = INDICE.modelos[ref.m], d = M && M.dms.find((x) => x[3] === ref.dmc);
    if (d) { figs = htmlFiguras(ref.m, d); texto = ((INDICE.fichas && INDICE.fichas[d[3]]) || '').replace(/\n(?=[a-z(])/g, ' '); }
  }
  el.hidden = false;
  el.innerHTML = `<button class="fechar" title="Fechar">✕</button><div class="tit">${esc(titulo || '')}</div><div class="sub">${esc(sub || '')}${semPeca ? ' · sem peça correspondente no 3D' : ''}</div>
    ${figs}${texto ? `<div class="sub txt">${esc(texto.slice(0, 600))}${texto.length > 600 ? '…' : ''}</div>` : ''}
    <div class="linha">${ref ? `<a class="bt mini" href="${PORTAL}/ietm/${encodeURIComponent(ref.m)}/PMC-${esc(ref.pmc)}/DMC-${esc(ref.dmc)}" target="_blank" rel="noopener">Portal Bell ›</a>` : ''}${$('#app').classList.contains('sem-painel') ? '<button class="bt mini" data-acao="painel">Ver no painel</button>' : ''}</div>`;
  el.querySelector('.fechar').onclick = () => { cartao3d = null; limparDestaque(); el.hidden = true; };
  const bp = el.querySelector('[data-acao=painel]'); if (bp) bp.onclick = () => painelVisivel(true);
}

/* =====================================================================
   Seleção, rótulos e câmera
   ===================================================================== */
let sel = null;
function realcar(id) {
  for (const p of Object.values(pecas)) for (const m of p.mats) { m.emissive.setHex(p.id === id ? 0x5a3a10 : 0x000000); m.opacity = 1; }
  for (const m of malhas) if (m.userData.peca?.startsWith?.('tela_') || m.userData.peca?.startsWith?.('rel_')) m.scale.setScalar(m.userData.peca === id ? 1.08 : 1);
}
function infoDe(id) { return pecas[id] ? pecas[id].info : itensPainel[id]; }
function centroDe(id) {
  const objs = pecas[id] ? pecas[id].meshes : malhas.filter((m) => m.userData.peca === id);
  const cx = new THREE.Box3(); for (const o of objs) if (o.visible) cx.expandByObject(o);
  return cx.isEmpty() ? null : cx.getCenter(new THREE.Vector3());
}
let voo = null;
function voar(pos, alvo, dur = 700) { voo = { t0: performance.now(), dur, p0: camera.position.clone(), p1: pos.clone(), a0: controles.target.clone(), a1: alvo.clone() }; }
let selecionandoPorProc = false;
function selecionar(id, foco = true) {
  sel = id; realcar(id);
  document.querySelectorAll('.peca').forEach((e) => e.classList.toggle('ativo', e.dataset.id === id));
  const c = centroDe(id);
  if (foco && c) { const d = camera.position.clone().sub(controles.target).normalize().multiplyScalar(1.6); voar(c.clone().add(d), c); }
  mostrarFicha(id);
  const i = infoDe(id);
  if (i && !selecionandoPorProc) { cartao3d = { titulo: i.n, sub: (i.f || i.d || '').slice(0, 220), sns: (i.sns || [])[0], peca: id }; atualizarCartao3d(); }
}
const ray = new THREE.Raycaster(), ptr = new THREE.Vector2(); let baixo = null;
renderer.domElement.addEventListener('pointerdown', (e) => { baixo = [e.clientX, e.clientY]; });
renderer.domElement.addEventListener('pointerup', (e) => {
  if (!baixo || Math.hypot(e.clientX - baixo[0], e.clientY - baixo[1]) > 5) return;
  const r = renderer.domElement.getBoundingClientRect();
  ptr.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); ray.setFromCamera(ptr, camera);
  const hit = ray.intersectObjects(malhas.filter((m) => m.visible), false)[0];
  if (hit) selecionar(hit.object.userData.peca, false);
});
// rótulos HTML
const rotulosEl = $('#rotulos'); let comRotulos = false;
function desenharRotulos() {
  if (!comRotulos) { rotulosEl.innerHTML = ''; return; }
  const r = renderer.domElement.getBoundingClientRect(); let h = '';
  for (const id of Object.keys(pecas)) {
    const c = centroDe(id); if (!c) continue; const p = c.project(camera); if (p.z > 1) continue;
    h += `<span class="rotulo" style="position:absolute;left:${(p.x + 1) / 2 * r.width}px;top:${(1 - p.y) / 2 * r.height}px;transform:translate(-50%,-50%);font-size:11px;background:#0b0f15cc;padding:1px 5px;border-radius:5px;pointer-events:none;white-space:nowrap">${esc(pecas[id].info.n.split(' (')[0])}</span>`;
  }
  rotulosEl.innerHTML = h;
}

/* =====================================================================
   Índice interno dos manuais Bell (interno/indice_manuais_bell.json – fora do git)
   ===================================================================== */
let INDICE = null, indiceErro = '';
const portalModelos = MC.portal || [CFG.id];
async function carregarIndice() {
  try {
    const r = await fetch('interno/indice_manuais_bell.json', { cache: 'no-cache' });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    INDICE = await r.json();
  } catch (e) { indiceErro = e.message || String(e); }
  if (aba === 'procedimentos' || sel || aba === 'teste') render();
}
// Texto completo por modelo (interno/textos_<m>.json), carregado só quando preciso
const TEXTOS = {}, carregandoTx = {};
async function textosDe(m) {
  if (TEXTOS[m] !== undefined) return TEXTOS[m];
  carregandoTx[m] ??= fetch(`interno/textos_${encodeURIComponent(m)}.json`).then((r) => (r.ok ? r.json() : null)).catch(() => null).then((j) => (TEXTOS[m] = j));
  return carregandoTx[m];
}
const docUrl = (m, id, p) => `${PORTAL}/doc/${encodeURIComponent(m)}/${encodeURIComponent(id)}${p ? '/p' + p : ''}`;
// Manuais por capítulo: páginas cujo texto cita as palavras-chave do item (e páginas de figura do capítulo)
async function paginasDe(sns, kw, limite = 12) {
  const out = [];
  if (!INDICE) return out;
  const caps = new Set((sns || []).map((p) => p.slice(0, 2))), re = kw ? new RegExp(kw, 'i') : null;
  for (const m of portalModelos) {
    const M = INDICE.modelos[m]; if (!M || M.dms.length) continue;
    const tx = await textosDe(m);
    for (const c of M.capitulos) {
      const n = (c[3].match(/Chapter\s+(\d+)/i) || [])[1]; if (!n || !caps.has(n.padStart(2, '0'))) continue;
      const id = c[4].split('/').pop(), pags = tx && tx[id], info = INDICE.paginas && INDICE.paginas[id];
      if (pags && re) pags.forEach((t, i) => { if (re.test(t)) out.push({ m, id, cap: c, p: i + 1, t, fig: info && info.figs.find((f) => f[0] === i + 1) }); });
      if (info) for (const [pg, fig] of info.figs) if (!out.some((o) => o.id === id && o.p === pg) && (!re || (pags && re.test(pags[pg - 1] || '')))) out.push({ m, id, cap: c, p: pg, t: (pags && pags[pg - 1]) || '', fig: [pg, fig] });
    }
  }
  return out.sort((a, b) => (b.fig ? 1 : 0) - (a.fig ? 1 : 0)).slice(0, limite);
}
function htmlPaginas(lista) {
  if (!lista.length) return '';
  const figs = lista.filter((o) => o.fig), txt = lista.filter((o) => !o.fig);
  return `<details class="cartao" open><summary><b>Manual por capítulo – páginas relacionadas</b></summary>
    ${figs.length ? `<div class="figs">${figs.map((o) => `<a class="fig" href="${docUrl(o.m, o.id, o.p)}" target="_blank" rel="noopener" title="Figura ${esc(o.fig[1])}"><img loading="lazy" src="interno/figuras/${esc(o.id)}_p${o.p}.png" alt="" onerror="this.remove()"><span>Fig. ${esc(o.fig[1])} · p. ${o.p}</span></a>`).join('')}</div>` : ''}
    ${txt.map((o) => `<a class="proc" href="${docUrl(o.m, o.id, o.p)}" target="_blank" rel="noopener"><b>${esc(o.cap[3])}</b> – página ${o.p}<span class="sub">${esc(o.t.slice(0, 220))}…</span></a>`).join('')}</details>`;
}
const dmcUrl = (m, d) => `${PORTAL}/ietm/${encodeURIComponent(m)}/PMC-${d[4]}/DMC-${d[3]}`;
function procedimentosDe(sns, kw, limite = 60) {
  if (!INDICE) return [];
  const out = [], re = kw ? new RegExp(kw, 'i') : null;
  for (const m of portalModelos) {
    const M = INDICE.modelos[m]; if (!M) continue;
    for (const d of M.dms) {
      const s = d[0] || '', dm = d[3];
      const porSns = sns.some((p) => s === p || s.startsWith(p + '-') || dm.includes('-' + p + '-'));
      if (!porSns) continue;
      const pontos = (re && re.test(d[1] + ' ' + d[2]) ? 2 : 0) + (sns[0] && (s === sns[0] || dm.includes('-' + sns[0] + '-')) ? 1 : 0);
      out.push({ m, d, pontos });
    }
    if (!M.dms.length) { // manuais em PDF por capítulo (206B, 206L4, 230, 430)
      const caps = new Set(sns.map((p) => p.slice(0, 2)));
      for (const c of M.capitulos) { const n = (c[3].match(/Chapter\s+(\d+)/i) || [])[1]; if (n && caps.has(n.padStart(2, '0'))) out.push({ m, cap: c, pontos: 1 }); }
    }
  }
  return out.sort((a, b) => b.pontos - a.pontos).slice(0, limite);
}
// Texto de descrição do manual (data modules 040/041/042) mais próximo dos códigos SNS do item
function descricaoDe(sns) {
  if (!INDICE || !INDICE.fichas) return null;
  for (const p of sns) for (const m of portalModelos) {
    const M = INDICE.modelos[m]; if (!M) continue;
    const d = M.dms.find((x) => /-04[0-2]A-/.test(x[3]) && x[0] === p && INDICE.fichas[x[3]]);
    if (d) return { m, d, txt: INDICE.fichas[d[3]] };
  }
  return null;
}
function htmlDescricao(sns) {
  const r = descricaoDe(sns || []); if (!r) return '';
  return `<details class="cartao" open><summary><b>Descrição no manual Bell</b> – ${esc(r.d[1])} <span class="dmc">(${esc(r.m)} · DMC-${esc(r.d[3])})</span></summary>
    <div class="sub" style="white-space:pre-line;max-height:320px;overflow:auto;margin-top:6px">${esc(r.txt.slice(0, 4000))}${r.txt.length > 4000 ? '\n…' : ''}</div>
    ${htmlFiguras(r.m, r.d)}<a class="bt mini" href="${dmcUrl(r.m, r.d)}" target="_blank" rel="noopener">Abrir no portal Bell ›</a></details>`;
}
// Peças do catálogo ilustrado (IPC, data modules 94x) e figuras dos módulos do item
function ipcDe(sns) {
  if (!INDICE || !INDICE.pecas) return [];
  const out = [];
  for (const p of sns) { for (const m of portalModelos) {
    const M = INDICE.modelos[m]; if (!M) continue;
    for (const d of M.dms) if (/-94\dA-/.test(d[3]) && d[0] === p && INDICE.pecas[d[3]]) out.push({ m, d, linhas: INDICE.pecas[d[3]] });
  } if (out.length) break; }
  return out.slice(0, 4);
}
const urlFigura = (m, d, icn) => `${PORTAL}/ietm/${encodeURIComponent(m)}/PMC-${d[4]}/DMC-${d[3]}/${icn}?tocView=manual&figureView=figure&view=split`;
function htmlFiguras(m, d) {
  const f = INDICE && INDICE.figuras && INDICE.figuras[d[3]]; if (!f || !f.length) return '';
  return `<div class="figs">${f.slice(0, 6).map(([t, icn]) => `<a class="fig" href="${urlFigura(m, d, icn)}" target="_blank" rel="noopener" title="${esc(t)}"><img loading="lazy" src="interno/figuras/${esc(icn)}.svg" alt="" onerror="this.remove()"><span>${esc(t.length > 60 ? t.slice(0, 58) + '…' : t)}</span></a>`).join('')}</div>`;
}
function htmlIpc(sns) {
  const lista = ipcDe(sns || []); if (!lista.length) return '';
  return lista.map(({ m, d, linhas }) => `<details class="cartao" open><summary><b>Componentes (IPC)</b> – ${esc(d[1])} <span class="dmc">(${esc(m)} · DMC-${esc(d[3])})</span></summary>
    ${htmlFiguras(m, d)}
    <table class="ipc"><tr><th>Item</th><th>PN</th><th>Nomenclatura</th><th>UPA</th></tr>${linhas.slice(0, 60).map((r) => `<tr><td>${esc(r[0])}</td><td class="pn">${esc(r[1])}</td><td>${esc(r[2])}${r[3] ? `<div class="sub">${esc(r[3])}</div>` : ''}</td><td>${esc(r[4])}</td></tr>`).join('')}</table>
    ${linhas.length > 60 ? `<div class="sub">+${linhas.length - 60} linhas no portal</div>` : ''}<a class="bt mini" href="${dmcUrl(m, d)}" target="_blank" rel="noopener">Abrir no IPC do portal Bell ›</a></details>`).join('');
}
function htmlProc(lista) {
  if (!INDICE) return `<div class="cartao aviso-int"><div class="tit">Índice dos manuais não carregado</div><div class="sub">Os procedimentos oficiais vêm do arquivo interno <b>interno/indice_manuais_bell.json</b> (fora do git e do GitHub Pages por ser material proprietário da Bell). Veja a aba <b>Procedimentos</b> para gerar o arquivo.</div></div>`;
  if (!lista.length) return '<div class="sub">Nenhum procedimento encontrado para este item no índice.</div>';
  return lista.map(({ m, d, cap }) => cap
    ? `<div class="proc-linha"><a class="proc" href="${PORTAL}${esc(cap[4])}" target="_blank" rel="noopener"><b>${esc(cap[3])}</b><span class="sub">${esc(m)} · ${esc(cap[1])} · ${esc(cap[2] || '')}</span></a><button class="bt mini ver3d" title="Mostrar no 3D" data-cap="${esc(((cap[3].match(/Chapter\s+(\d+)/i) || [])[1] || '').padStart(2, '0'))}" data-tit="${esc(cap[3])}">◎ 3D</button></div>`
    : `<div class="proc-linha"><a class="proc" href="${dmcUrl(m, d)}" target="_blank" rel="noopener"><b>${esc(d[1])}</b> – ${esc(d[2])}<span class="sub">${esc(m)} · SNS ${esc(d[0])}${d[5] ? ' · ' + esc(d[5]) : ''} <span class="dmc">DMC-${esc(d[3])}</span></span></a><button class="bt mini ver3d" title="Mostrar no 3D" data-m="${esc(m)}" data-dmc="${esc(d[3])}">◎ 3D</button></div>` +
      `<details class="txt-dm" data-m="${esc(m)}" data-dmc="${esc(d[3])}" style="margin:0 8px 6px"><summary class="sub">ver texto completo${INDICE.figuras && INDICE.figuras[d[3]] ? ' e figuras' : ''}${INDICE.pecas && INDICE.pecas[d[3]] ? ' e peças' : ''}</summary><div class="corpo sub" style="white-space:pre-line;max-height:420px;overflow:auto">carregando…</div></details>`).join('');
}

/* =====================================================================
   Painel lateral
   ===================================================================== */
let aba = 'comandos';
const cont = $('#conteudo');
function mostrarFicha(id) {
  const i = infoDe(id); if (!i) return;
  const fichaEl = $('#ficha'); if (!fichaEl) return;
  const lista = procedimentosDe(i.sns || [], i.kw);
  paginasDe(i.sns, i.kw).then((L) => { const alvo = $('#fichaPaginas'); if (alvo && sel === id) alvo.innerHTML = htmlPaginas(L); });
  fichaEl.innerHTML = `<div class="cartao previa"><div class="tit">${esc(i.n)} <span class="tag">${esc((i.sns || [])[0] || '')}</span></div>
    <div class="sub">${esc(i.f || i.d || '')}</div>
    ${pecas[id] ? `<div class="sub">Grupo: ${esc(NOMES_G[i.g] || i.g)}</div>` : ''}
    ${htmlDescricao(i.sns)}
    ${htmlIpc(i.sns)}
    <div id="fichaPaginas"></div>
    <h3 style="margin:10px 0 4px;font-size:13px">Procedimentos no manual Bell (${portalModelos.join(', ')})</h3>${htmlProc(lista)}</div>`;
}
function listaPecas() {
  const grupos = {};
  for (const p of Object.values(pecas)) (grupos[p.info.g] ??= []).push(p);
  return Object.entries(NOMES_G).filter(([g]) => grupos[g]).map(([g, nome]) => `<div class="grupo-tit"><i style="background:#${CORES[g].toString(16).padStart(6, '0')}"></i>${nome}</div>` +
    grupos[g].map((p) => `<div class="peca${sel === p.id ? ' ativo' : ''}" data-id="${p.id}"><span>${esc(p.info.n)}</span><small>${esc(p.info.sns[0] || '')}</small></div>`).join('')).join('');
}
let SNIPPET = '(carregando o código…)';
fetch('ferramentas/indice_bell_console.js').then((r) => r.text()).then((t) => { SNIPPET = t; const ta = document.querySelector('textarea.cola'); if (ta) ta.value = t; }).catch(() => {});

function render() {
  document.querySelectorAll('#abas button').forEach((b) => b.classList.toggle('ativa', b.dataset.aba === aba));
  $('#leituras').hidden = aba !== 'teste';
  if (aba === 'comandos') {
    cont.innerHTML = `<div class="cartao previa"><div class="tit">Cadeia de comando – ${esc(CFG.nome)}</div><div class="sub">${esc(MC.nota || '')} Clique numa peça (lista ou 3D) para ver a função e os procedimentos do manual. Posições ilustrativas.</div></div>
      <div id="ficha"></div>${listaPecas()}`;
  } else if (aba === 'painel') {
    cont.innerHTML = `<div class="cartao previa"><div class="tit">${esc(PN.nome)}</div><div class="sub">Clique num display, instrumento, alarme ou interruptor. O botão <b>Ver painel</b> aproxima a câmera.</div></div><div id="ficha"></div>` +
      Object.entries(itensPainel).map(([id, i]) => `<div class="peca${sel === id ? ' ativo' : ''}" data-id="${id}"><span>${esc(i.n)}</span><small>${esc(i.sns[0])}</small></div>`).join('');
  } else if (aba === 'teste') {
    cont.innerHTML = `<div class="cartao previa"><div class="tit">Teste de movimento dos comandos</div><div class="sub">Mova os comandos e veja o swashplate e o passo do rotor de cauda responderem. Modelo didático: não representa curso, ângulos nem regulagem (rigging) reais – esses valores estão nos procedimentos de rigging do manual.</div></div>
      <div class="ctrl-sl"><label>Coletivo</label><input type="range" id="slCol" min="0" max="1" step="0.01" value="${est.col}"><output id="oCol"></output></div>
      <div class="ctrl-sl"><label>Cíclico frente/trás</label><input type="range" id="slLon" min="-1" max="1" step="0.01" value="${est.lon}"><output id="oLon"></output></div>
      <div class="ctrl-sl"><label>Cíclico lateral</label><input type="range" id="slLat" min="-1" max="1" step="0.01" value="${est.lat}"><output id="oLat"></output></div>
      <div class="ctrl-sl"><label>Pedais</label><input type="range" id="slPed" min="-1" max="1" step="0.01" value="${est.ped}"><output id="oPed"></output></div>
      <div class="linha"><button class="bt" id="btCentro">Centralizar</button><button class="bt" id="btGirar">${est.girar ? 'Parar rotor' : 'Girar rotor'}</button><button class="bt pri" id="btSeguir">Seguir a cadeia (coletivo)</button><button class="bt" id="btSeguirCic">Seguir (cíclico)</button><button class="bt" id="btSeguirDir">Seguir (pedais)</button><button class="bt" id="btSeguirMot">Seguir (motor)</button></div>
      <div class="cartao"><div class="tit">Procedimentos de regulagem (rigging) e fricção</div>${htmlProc(procedimentosDe(['67-11', '67-12', '67-20', '67-21', '67-10'], 'rigging|friction|operational check|regulagem', 25))}</div>`;
    for (const [k, id] of [['col', 'slCol'], ['lon', 'slLon'], ['lat', 'slLat'], ['ped', 'slPed']]) $('#' + id).oninput = (e) => { est[k] = +e.target.value; aplicar(); };
    $('#btCentro').onclick = () => { Object.assign(est, { col: 0.3, lon: 0, lat: 0, ped: 0 }); render(); aplicar(); };
    $('#btGirar').onclick = () => { est.girar = !est.girar; render(); };
    $('#btSeguir').onclick = () => seguir(['col_stick', 'col_friction', 'col_jack', 'col_tubo1', 'col_reversao', 'col_tubo2', 'col_lever', 'servo_c', 'col_bellcrank', 'swash', 'pitch_links']);
    $('#btSeguirCic').onclick = () => seguir(['cic_stick', 'cic_base', 'cic_torque', 'cic_tubo', 'mixer', 'cic_subida', 'servo_e', 'servo_d', 'cic_bellcrank', 'swash', 'pitch_links']);
    $('#btSeguirMot').onclick = () => seguir(['manete', 'col_transdutor', 'lig_motor', 'ecu', 'fcu', 'ind_motor']);
    $('#btSeguirDir').onclick = () => seguir(['pedais', 'ped_jack', 'quadrante', 'servo_rc', 'dir_linha', 'dir_cauda', 'pcm']);
    aplicar();
  } else if (aba === 'procedimentos') {
    const M = INDICE ? portalModelos.map((m) => [m, INDICE.modelos[m]]).filter(([, v]) => v) : [];
    const sist = {}; for (const [, v] of M) Object.assign(sist, v.sistemas);
    const caps = [...new Set(M.flatMap(([, v]) => v.dms.map((d) => (d[0] || '').slice(0, 2))))].filter(Boolean).sort();
    if (!INDICE && !indiceErro) { cont.innerHTML = '<div class="cartao previa"><div class="tit">Carregando o índice dos manuais Bell…</div><div class="sub">Arquivo interno de ~11 MB; leva alguns segundos.</div></div>'; return; }
    cont.innerHTML = INDICE ? `<div class="cartao previa"><div class="tit">Procedimentos dos manuais Bell – ${esc(portalModelos.join(' / '))}</div>
        <div class="sub">Índice gerado em ${esc((INDICE.gerado || '').slice(0, 10))}${INDICE.fichas ? ` · ${Object.keys(INDICE.fichas).length} descrições de sistemas` : ''}${INDICE.pecas ? ` · ${Object.keys(INDICE.pecas).length} listas de peças (IPC)` : ''}: ${M.map(([m, v]) => `${esc(m)} ${v.dms.length ? v.dms.length + ' módulos (IETM)' : v.capitulos.length + ' capítulos (PDF)'}`).join(' · ')}. Os links abrem o portal Bell (precisa estar logado). Material proprietário: uso interno de manutenção.</div></div>
        <input id="busca" placeholder="Buscar procedimento ou PN (ex.: servo, swashplate, 67-20, M207-20M478)" value="${esc(est.busca)}">
        <div class="linha"><select id="filCap"><option value="">Todos os capítulos ATA</option>${caps.map((c) => `<option ${est.cap === c ? 'selected' : ''} value="${c}">${c} – ${esc(sist[c] || '')}</option>`).join('')}</select>
        <select id="filTipo"><option value="">Todos os tipos</option>${['inspection', 'remove', 'install', 'description', 'rigging', 'servicing', 'test', 'fault', 'repair'].map((t) => `<option ${est.tipo === t ? 'selected' : ''}>${t}</option>`).join('')}</select></div>
        <label class="sub"><input type="checkbox" id="chkTexto" ${est.textoComp ? 'checked' : ''}> buscar também no texto completo dos procedimentos / páginas (carrega interno/textos_*.json)</label>
        <div id="resProc"></div>`
      : `<div class="cartao aviso-int"><div class="tit">Índice dos manuais Bell ainda não instalado</div>
        <div class="sub">Por ser material proprietário da Bell, o índice fica só na cópia interna (pasta <b>interno/</b>, fora do git e do GitHub Pages).<br>Para gerar:<br>1. No Chrome, entre em <b>https://www.bellhelicopter.net/tp/</b> com a conta da Helipark.<br>2. Aperte <b>F12</b> → aba <b>Console</b>, cole o código abaixo e aperte Enter (o Chrome pode pedir para digitar "allow pasting").<br>3. Salve o arquivo <b>indice_manuais_bell.json</b> baixado na pasta <b>interno/</b> desta instalação (WAMP / SharePoint).<br><small>Erro ao carregar: ${esc(indiceErro || 'carregando…')}</small></div>
        <textarea class="cola" readonly>${esc(SNIPPET)}</textarea><div class="linha"><button class="bt" id="btCopiar">Copiar código</button></div></div>`;
    if (!INDICE) { $('#btCopiar').onclick = () => navigator.clipboard?.writeText(SNIPPET); return; }
    const filtrar = async () => {
      const q = est.busca.trim().toLowerCase(), termos = q.split(/\s+/).filter(Boolean); const out = [];
      const TXs = {}; if (est.textoComp && termos.length) for (const [m] of M) TXs[m] = await textosDe(m);
      for (const [m, v] of M) {
        for (const d of v.dms) {
          if (est.cap && !(d[0] || '').startsWith(est.cap)) continue;
          const txt = (d[0] + ' ' + d[1] + ' ' + d[2] + ' ' + d[3] + (TXs[m] && TXs[m][d[3]] ? ' ' + TXs[m][d[3]] : '')).toLowerCase();
          if (est.tipo && !txt.includes(est.tipo)) continue;
          if (termos.every((t) => txt.includes(t))) out.push({ m, d });
          if (out.length >= 300) break;
        }
        if (!v.dms.length) for (const c of v.capitulos) {
          const txt = (c.join(' ')).toLowerCase(); if (est.cap && !txt.includes('chapter ' + est.cap)) continue;
          if (termos.every((t) => txt.includes(t))) out.push({ m, cap: c });
          const id = c[4].split('/').pop(), pags = TXs[m] && TXs[m][id];
          if (pags) pags.forEach((t, i) => { if (out.length < 300 && termos.every((w) => t.toLowerCase().includes(w))) out.push({ m, cap: [c[0], c[1], 'página ' + (i + 1), c[3] + ' – p. ' + (i + 1), c[4] + '/p' + (i + 1)] }); });
        }
      }
      // peças (PN / nomenclatura) no catálogo ilustrado
      const pecasAch = [];
      if (INDICE.pecas && termos.length && q.length >= 3) for (const [m, v] of M) for (const d of v.dms) {
        const L = INDICE.pecas[d[3]]; if (!L || (est.cap && !(d[0] || '').startsWith(est.cap))) continue;
        for (const r of L) if (termos.every((t) => (r[1] + ' ' + r[2]).toLowerCase().includes(t))) { pecasAch.push({ m, d, r }); if (pecasAch.length >= 150) break; }
        if (pecasAch.length >= 150) break;
      }
      $('#resProc').innerHTML = (pecasAch.length ? `<div class="cartao"><div class="tit">Peças no IPC (${pecasAch.length >= 150 ? '150+' : pecasAch.length})</div><table class="ipc"><tr><th>PN</th><th>Nomenclatura</th><th>Onde (IPC)</th></tr>${pecasAch.map(({ m, d, r }) => `<tr><td class="pn">${esc(r[1])}</td><td>${esc(r[2])}${r[3] ? `<div class="sub">${esc(r[3])}</div>` : ''}</td><td><a href="${dmcUrl(m, d)}" target="_blank" rel="noopener">${esc(d[1])}</a> <span class="dmc">${esc(m)} · item ${esc(r[0])}</span></td></tr>`).join('')}</table></div>` : '') +
        `<div class="sub" style="margin:6px 0">${out.length >= 300 ? '300+ procedimentos (refine a busca)' : out.length + ' procedimento(s)'}</div>` + htmlProc(out);
    };
    $('#busca').oninput = (e) => { est.busca = e.target.value; filtrar(); };
    $('#filCap').onchange = (e) => { est.cap = e.target.value; filtrar(); };
    $('#filTipo').onchange = (e) => { est.tipo = e.target.value; filtrar(); };
    $('#chkTexto').onchange = (e) => { est.textoComp = e.target.checked; $('#resProc').innerHTML = '<div class="sub">carregando os textos…</div>'; filtrar(); };
    filtrar();
  }
  cont.querySelectorAll('.peca').forEach((e) => { e.onclick = () => selecionar(e.dataset.id); });
  if (sel && $('#ficha')) mostrarFicha(sel);
}
function ver3dDe(m, dmc) {
  const M = INDICE && INDICE.modelos[m], d = M && M.dms.find((x) => x[3] === dmc); if (!d) return;
  mostrarNo3d(d[0] || dmc.split('-').slice(2, 5).join('-'), `${d[1]} – ${d[2]}`, `${m} · SNS ${d[0]}`, { m, dmc, pmc: d[4] });
}
cont.addEventListener('click', (e) => {
  const b = e.target.closest && e.target.closest('.ver3d'); if (!b) return;
  e.preventDefault();
  if (b.dataset.dmc) ver3dDe(b.dataset.m, b.dataset.dmc); else mostrarNo3d(b.dataset.cap, b.dataset.tit, '');
  if (matchMedia('(max-width: 900px)').matches) vista.scrollIntoView({ behavior: 'smooth' });
});
cont.addEventListener('toggle', async (e) => {
  const el = e.target; if (!el.matches || !el.matches('details.txt-dm') || !el.open) return;
  ver3dDe(el.dataset.m, el.dataset.dmc);
  const corpo = el.querySelector('.corpo'); if (corpo.dataset.ok) return; corpo.dataset.ok = 1;
  const m = el.dataset.m, dmc = el.dataset.dmc, M = INDICE.modelos[m], d = M && M.dms.find((x) => x[3] === dmc);
  const tx = await textosDe(m), texto = (tx && tx[dmc]) || (INDICE.fichas && INDICE.fichas[dmc]) || '';
  const pecasL = INDICE.pecas && INDICE.pecas[dmc];
  corpo.innerHTML = (d ? htmlFiguras(m, d) : '') +
    (pecasL ? `<table class="ipc"><tr><th>Item</th><th>PN</th><th>Nomenclatura</th><th>UPA</th></tr>${pecasL.map((r) => `<tr><td>${esc(r[0])}</td><td class="pn">${esc(r[1])}</td><td>${esc(r[2])}${r[3] ? `<div class="sub">${esc(r[3])}</div>` : ''}</td><td>${esc(r[4])}</td></tr>`).join('')}</table>` : '') +
    (texto ? esc(texto) : (pecasL ? '' : 'Texto completo não instalado (interno/textos_' + esc(m) + '.json). Abra pelo link do portal.'));
}, true);
const est = { col: 0.3, lon: 0, lat: 0, ped: 0, girar: false, busca: '', cap: '', tipo: '' };
document.querySelectorAll('#abas button').forEach((b) => { b.onclick = () => { aba = b.dataset.aba; render(); }; });
addEventListener('keydown', (e) => { if (e.altKey && e.key >= '1' && e.key <= '4') { aba = ['comandos', 'painel', 'teste', 'procedimentos'][+e.key - 1]; render(); } });

/* ---------- teste: aplica as posições dos comandos ---------- */
function aplicar() {
  for (const g of ANIM.col || []) g.rotation.z = 0.05 + est.col * 0.35;
  for (const g of ANIM.cic || []) { g.rotation.z = -est.lon * 0.25; g.rotation.x = est.lat * 0.25; }
  for (const g of ANIM.ped || []) g.position.x = G.pedX + est.ped * 0.07 * g.userData.s;
  if (ANIM.sw) { ANIM.sw.position.y = G.swY + (est.col - 0.3) * 0.12; ANIM.sw.rotation.z = -est.lon * 0.12; ANIM.sw.rotation.x = est.lat * 0.12; }
  if (ANIM.pcm) ANIM.pcm.children.forEach((c) => { c.rotation.z = est.ped * 0.35; });
  const pc = 4 + est.col * 12, f = (v) => (Math.abs(v) < 0.05 ? 0 : v).toLocaleString('pt-BR', { maximumFractionDigits: 1, minimumFractionDigits: 1 });
  $('#leituras').innerHTML = `Passo coletivo ≈ ${f(pc)}° · inclinação do disco: long. ${f(-est.lon * 8)}° / lat. ${f(est.lat * 8)}°<br>Passo do rotor de cauda ≈ ${f(est.ped * 18)}° <small>(valores didáticos)</small>`;
  for (const [k, o] of [['col', 'oCol'], ['lon', 'oLon'], ['lat', 'oLat'], ['ped', 'oPed']]) { const e = $('#' + o); if (e) e.textContent = f(est[k] * 100) + '%'; }
}
let seq = null;
function seguir(ids) { seq = { ids: ids.filter((i) => pecas[i]), i: 0, t: 0 }; }

/* ---------- barra ---------- */
function painelVisivel(mostrar) {
  const app = $('#app'); app.classList.toggle('sem-painel', !mostrar);
  const bt = $('#btPainel'); bt.textContent = mostrar ? 'Ocultar painel' : 'Mostrar painel'; bt.classList.toggle('on', !mostrar);
  try { localStorage.setItem('mi_cmd_painel', mostrar ? '1' : '0'); } catch (e) { /* sem armazenamento */ }
  requestAnimationFrame(redim); atualizarCartao3d();
}
$('#btPainel').onclick = () => painelVisivel($('#app').classList.contains('sem-painel'));
$('#btFuselagem').onclick = (e) => { heli.raiz.visible = !heli.raiz.visible; e.target.classList.toggle('on', heli.raiz.visible); };
$('#btCopiloto').onclick = (e) => { const on = !cpMalhas[0]?.visible; for (const m of cpMalhas) m.visible = on; e.target.classList.toggle('on', on); };
$('#btRotulos').onclick = (e) => { comRotulos = !comRotulos; e.target.classList.toggle('on', comRotulos); };
$('#btVistaPainel').onclick = () => voar(VISTA_PAINEL.pos, VISTA_PAINEL.alvo);
$('#btGeral').onclick = () => voar(VISTA_GERAL.pos, VISTA_GERAL.alvo);

/* ---------- laço ---------- */
function redim() { const w = vista.clientWidth, h = vista.clientHeight; if (!w || !h) return; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
new ResizeObserver(redim).observe(vista); addEventListener('resize', redim); redim();
let t0 = performance.now();
renderer.setAnimationLoop((t) => {
  const dt = Math.min((t - t0) / 1000, 0.1); t0 = t;
  if (voo) { const k = Math.min((t - voo.t0) / voo.dur, 1), e = k * k * (3 - 2 * k); camera.position.lerpVectors(voo.p0, voo.p1, e); controles.target.lerpVectors(voo.a0, voo.a1, e); if (k >= 1) voo = null; }
  if (est.girar && ANIM.rot) { ANIM.rot.rotation.y += dt * 6; for (const r of heli.rotores) r.obj.rotation[r.eixo] += dt * r.vel; }
  if (seq) { seq.t += dt; if (seq.t > 0.9) { seq.t = 0; if (seq.i < seq.ids.length) selecionar(seq.ids[seq.i++], false); else seq = null; } }
  controles.update(); renderer.render(cena, camera); desenharRotulos();
});

const lerHash = () => { const h = location.hash.slice(1); if (['comandos', 'painel', 'teste', 'procedimentos'].includes(h)) aba = h; };
lerHash(); addEventListener('hashchange', () => { lerHash(); render(); });
try { if (localStorage.getItem('mi_cmd_painel') === '0') painelVisivel(false); } catch (e) { /* sem armazenamento */ }
render(); aplicar(); carregarIndice().catch((e) => mostrarErro(e.message));
