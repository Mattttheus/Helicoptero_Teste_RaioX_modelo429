// HeliSense 3D – Cabine 3D interativa (apresentação + modelo didático de sistemas).
// Manche (cíclico), coletivo com manete, pedais, interruptores, instrumentos vivos, partida do motor (MotorSim),
// sistema elétrico (bateria, gerador, barra, disjuntores), ar-condicionado / controle de temperatura,
// rotor (swashplate, passo, track das pás, vibração), teste de movimento dos comandos e treino de diagnóstico de panes.
// Tudo ILUSTRATIVO: números de ordem de grandeza para treinamento; os valores reais estão no RFM e no manual de manutenção.
import * as THREE from 'three';
import { modeloAtual, carregarScripts, mostrarErro } from '../../infraestrutura/carregar.js?v=20261123a';
import { MotorSim } from '../../aplicacao/simulacao.js?v=20261123a';
import { criarSistemas } from '../../aplicacao/sistemas_aeronave.js?v=20261123a';
import { construirHelicoptero } from '../visoes/3d/helicoptero3d.js?v=20261123a';
import { aplicarCascaReal } from '../../infraestrutura/modelos_reais.js?v=20261123a';
import { prepararCena, fotoHD, criarAdaptador } from '../visoes/3d/realismo.js?v=20261123a';
import { estadosDe, avaliarDecolagem, efeitosNoVoo, criarFonteSimulada, criarContexto, PilotoDecolagem, FASES, SISTEMAS, classificar } from '../../aplicacao/prontidao_voo.js?v=20261123a';

const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const fmt = (v, d = 0) => Number(v).toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d });
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const CAT = window.CATALOGO, CFG = modeloAtual();
const CMD = window.COMANDOS, MC = (CMD && CMD.modelos[CFG.id]) || { painel: 'g1000' };
const N_MOT = MC.motores || 1, PAS = ['429', '407', '430'].includes(CFG.id) ? 4 : 2, VIDRO = MC.painel !== 'analog';
try { await carregarScripts(['src/dominio/motores/motor_comum.js', CFG.motorArq]); } catch (e) { mostrarErro(e.message); throw e; }
const MOTOR = window.MOTOR, P = MOTOR.sim;
// sensores de condição da aeronave (os mesmos do Manual 3D): alimentam a decisão de decolagem e os efeitos no voo
let SENS = [];
try { await carregarScripts([...CFG.arquivos]); SENS = (window.HELI && window.HELI.SENSORES) || []; } catch (e) { console.warn('Sensores da aeronave indisponíveis:', e.message); }

document.title = `${CFG.nome} – Cabine 3D · HeliSense 3D`;
$('#subModelo').textContent = `${CFG.nome} · ${N_MOT > 1 ? N_MOT + '× ' : ''}${MOTOR.nome} · painel ${VIDRO ? 'digital' : 'analógico'}`;
$('#trocaModelo').innerHTML = CAT.map((c) => `<option value="${c.id}"${c.id === CFG.id ? ' selected' : ''}>${esc(c.nome)}</option>`).join('');
$('#trocaModelo').onchange = (e) => { location.href = 'cabine.html?m=' + e.target.value + location.hash; };
for (const [id, pg] of [['#btManual', 'manual'], ['#btMotor', 'motor'], ['#btComandos', 'comandos']]) $(id).href = `${pg}.html?m=${CFG.id}`;

/* =====================================================================
   Estado da aeronave
   ===================================================================== */
/* Modelo (MVC): estado e regras dos sistemas vivem em src/aplicacao/sistemas_aeronave.js */
const SIS = criarSistemas({ P, nMot: N_MOT, pas: PAS, MotorSim, aoEvento: (txt, nivel) => log(txt, nivel) });
const { S, sims, PANES, NOMES_SW, ALARMES, leituras, alternar, partida } = SIS;
const passoSistemas = SIS.passo, registroComb = () => SIS.combustivelUsado();
const registro = [];
const t0 = performance.now();
const log = (txt, nivel = 'info') => { registro.unshift({ t: (performance.now() - t0) / 1000, txt, nivel }); if (registro.length > 200) registro.pop(); if (aba === 'registro') desenhar.registro(); avisar(txt, nivel); };


/* =====================================================================
   Cena 3D: cabine em visão de piloto
   ===================================================================== */
const vista = $('#vista');
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: false });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.autoClear = false;
vista.prepend(renderer.domElement);
const cena = new THREE.Scene(); cena.background = new THREE.Color(0x9cc3e6); cena.fog = new THREE.Fog(0x9cc3e6, 60, 420);
const camera = new THREE.PerspectiveCamera(70, 1, 0.02, 800); camera.rotation.order = 'YXZ';
cena.add(new THREE.HemisphereLight(0xdfeaff, 0x5a5040, 1.1));
const sol = new THREE.DirectionalLight(0xfff2dd, 2.2); sol.position.set(30, 60, 20); cena.add(sol);
prepararCena(renderer, cena, { sombras: false });
const adaptar = criarAdaptador(renderer, () => ajustar());

// mundo: pista, heliponto, hangar, árvores
const mundo = new THREE.Group(); cena.add(mundo);
{
  const c = document.createElement('canvas'); c.width = c.height = 512; const x = c.getContext('2d');
  x.fillStyle = '#6f7a5c'; x.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 4000; i++) { x.fillStyle = `rgba(${40 + Math.random() * 60},${60 + Math.random() * 50},${30 + Math.random() * 30},0.35)`; x.fillRect(Math.random() * 512, Math.random() * 512, 3, 3); }
  const tg = new THREE.CanvasTexture(c); tg.wrapS = tg.wrapT = THREE.RepeatWrapping; tg.repeat.set(80, 80); tg.colorSpace = THREE.SRGBColorSpace;
  const chao = new THREE.Mesh(new THREE.PlaneGeometry(2000, 2000), new THREE.MeshStandardMaterial({ map: tg, roughness: 1 })); chao.rotation.x = -Math.PI / 2; mundo.add(chao);
  const pista = new THREE.Mesh(new THREE.PlaneGeometry(400, 30), new THREE.MeshStandardMaterial({ color: 0x3c3f44, roughness: 0.9 })); pista.rotation.x = -Math.PI / 2; pista.position.set(120, 0.01, 40); mundo.add(pista);
  const hp = document.createElement('canvas'); hp.width = hp.height = 256; const h = hp.getContext('2d');
  h.fillStyle = '#4a4d52'; h.fillRect(0, 0, 256, 256); h.strokeStyle = '#f2f2f2'; h.lineWidth = 10; h.beginPath(); h.arc(128, 128, 100, 0, 7); h.stroke();
  h.fillStyle = '#f2f2f2'; h.font = 'bold 150px Arial'; h.textAlign = 'center'; h.textBaseline = 'middle'; h.fillText('H', 128, 136);
  const th = new THREE.CanvasTexture(hp); th.colorSpace = THREE.SRGBColorSpace;
  const heliponto = new THREE.Mesh(new THREE.PlaneGeometry(20, 20), new THREE.MeshStandardMaterial({ map: th, roughness: 0.8 })); heliponto.rotation.x = -Math.PI / 2; heliponto.position.y = 0.02; mundo.add(heliponto);
  const hangar = new THREE.Mesh(new THREE.BoxGeometry(30, 12, 40), new THREE.MeshStandardMaterial({ color: 0xc9ccd0, roughness: 0.6, metalness: 0.3 })); hangar.position.set(-40, 6, -50); mundo.add(hangar);
  const porta = new THREE.Mesh(new THREE.PlaneGeometry(24, 10), new THREE.MeshStandardMaterial({ color: 0x30353b })); porta.position.set(-24.9, 5, -50); porta.rotation.y = Math.PI / 2; mundo.add(porta);
  for (let i = 0; i < 60; i++) {
    const a = Math.random() * 6.28, r = 90 + Math.random() * 260, tr = new THREE.Group();
    const cop = new THREE.Mesh(new THREE.ConeGeometry(3 + Math.random() * 2, 9 + Math.random() * 6, 8), new THREE.MeshStandardMaterial({ color: 0x2f5a32, roughness: 1 })); cop.position.y = 7;
    const tr0 = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.5, 3), new THREE.MeshStandardMaterial({ color: 0x5a4030 })); tr0.position.y = 1.5;
    tr.add(cop, tr0); tr.position.set(Math.cos(a) * r, 0, Math.sin(a) * r); mundo.add(tr);
  }
}

// aeronave (a cabine) – a câmera é filha dela; +X frente, +Y cima, +Z direita (piloto no assento direito)
const heli = new THREE.Group(); cena.add(heli);
const cabine = new THREE.Group(); heli.add(cabine);
const M = (cor, o = {}) => new THREE.MeshStandardMaterial({ color: cor, roughness: 0.55, metalness: 0.15, ...o });
const mPainel = M(0x262a30, { roughness: 0.75 }), mEstr = M(0x3a4048), mBanco = M(0x2d3138, { roughness: 0.9 }), mMetal = M(0x9aa2ac, { metalness: 0.8, roughness: 0.3 });
const mPreto = M(0x16181b, { roughness: 0.6 }), mGrip = M(0x1d1f22, { roughness: 0.85 }), mVidro = new THREE.MeshPhysicalMaterial({ color: 0x9fc4e0, transparent: true, opacity: 0.12, roughness: 0.05, metalness: 0, depthWrite: false });
const caixa = (s, p, mat, pai = cabine, r) => { const m = new THREE.Mesh(new THREE.BoxGeometry(...s), mat); m.position.set(...p); if (r) m.rotation.set(...r); pai.add(m); return m; };
const cil = (rt, rb, h, p, mat, pai = cabine, r, seg = 20) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat); m.position.set(...p); if (r) m.rotation.set(...r); pai.add(m); return m; };
// piso, assentos, estrutura e para-brisa
caixa([2.4, 0.04, 1.5], [0.3, 0.1, 0], M(0x2a2e33, { roughness: 1 }));
for (const z of [0.33, -0.33]) { caixa([0.5, 0.12, 0.5], [-0.05, 0.42, z], mBanco); caixa([0.1, 0.62, 0.5], [-0.32, 0.75, z], mBanco, cabine, [0, 0, -0.18]); }
for (const z of [0.68, -0.68, 0]) { const pil = caixa([0.045, 0.75, 0.045], [0.9, 1.38, z], mEstr); pil.rotation.z = 0.55; }
caixa([0.05, 0.05, 1.5], [0.8, 1.62, 0], mEstr); caixa([1.6, 0.04, 1.5], [0.05, 1.72, 0], M(0x8d939a, { roughness: 0.8 }));
const vidro = new THREE.Mesh(new THREE.SphereGeometry(1.2, 32, 16, -Math.PI / 2, Math.PI, 0, Math.PI / 2), mVidro); vidro.position.set(0.45, 0.65, 0); vidro.scale.set(1, 0.9, 0.62); vidro.rotation.y = Math.PI / 2; cabine.add(vidro);
caixa([0.04, 0.9, 0.04], [0.15, 1.25, 0.75], mEstr); caixa([0.04, 0.9, 0.04], [0.15, 1.25, -0.75], mEstr); // colunas das portas
// painel de instrumentos + glare shield
const gPainel = new THREE.Group(); gPainel.position.set(0.98, 0.9, 0); gPainel.rotation.z = -0.28; cabine.add(gPainel);
caixa([0.06, 0.36, 1.34], [0, 0, 0], mPainel, gPainel); caixa([0.28, 0.035, 1.38], [-0.12, 0.2, 0], mPreto, gPainel, [0, 0, 0.28]);

/* ---------------- telas (canvas) ---------------- */
function tela(w, h, pos, larg, alt, pai = gPainel) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(larg, alt), new THREE.MeshBasicMaterial({ map: t, toneMapped: false }));
  m.rotation.y = -Math.PI / 2; m.position.set(...pos); pai.add(m);
  return { c, x: c.getContext('2d'), t, m };
}
const T = {
  pfd: tela(1024, 768, [-0.032, 0.0, 0.36], 0.36, 0.27),
  mot: tela(1024, 768, [-0.032, 0.0, 0.0], 0.36, 0.27),
  sis: tela(1024, 768, [-0.032, 0.0, -0.36], 0.36, 0.27),
  alm: tela(2048, 192, [-0.032, 0.155, 0.0], 0.8, 0.075)
};
for (const k of ['pfd', 'mot', 'sis']) caixa([0.02, 0.29, 0.38], [-0.02, T[k].m.position.y, T[k].m.position.z], mPreto, gPainel);

/* ---------------- interruptores, botões e manopla do pedestal ---------------- */
const interativos = [];
const gPed = new THREE.Group(); gPed.position.set(0.62, 0.58, 0); gPed.rotation.z = 0.55; cabine.add(gPed);
caixa([0.62, 0.05, 0.3], [0, 0, 0], mPainel, gPed); caixa([0.62, 0.35, 0.3], [0.02, -0.19, 0], mPreto, gPed);
function placa(txt, pos, pai, w = 0.085) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 64; const x = c.getContext('2d');
  x.fillStyle = '#15171a'; x.fillRect(0, 0, 256, 64); x.fillStyle = '#e8e8e8'; x.font = 'bold 30px Arial'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(txt, 128, 34);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, w / 4), new THREE.MeshBasicMaterial({ map: t })); m.rotation.x = -Math.PI / 2; m.rotation.z = -Math.PI / 2; m.position.set(...pos); pai.add(m); return m;
}
const ALAVANCAS = {};
function interruptor(chave, rotulo, x, z, tipo = 'sw') {
  const g = new THREE.Group(); g.position.set(x, 0.03, z); gPed.add(g);
  caixa([0.03, 0.012, 0.03], [0, 0, 0], mMetal, g);
  const alav = new THREE.Group(); g.add(alav);
  const haste = cil(0.004, 0.006, 0.04, [0, 0.02, 0], mMetal, alav); cil(0.007, 0.007, 0.008, [0, 0.042, 0], tipo === 'start' ? M(0xd03030) : mMetal, alav);
  haste.userData.acao = { tipo, chave }; alav.children.forEach((c) => (c.userData.acao = { tipo, chave }));
  placa(rotulo, [-0.035, 0.0005, 0], g);
  ALAVANCAS[chave] = alav; interativos.push(...alav.children);
}
const linhaA = [['bat', 'BATT'], ['gen', 'GEN'], ['bomba', 'BOOST'], ['hid', 'HYD SYS'], ['avi', 'AVIONICS'], ['gov', N_MOT > 1 || P.fadec ? 'FADEC' : 'GOV']];
const linhaB = [['pitot', 'PITOT HTR'], ['posn', 'POSN LTS'], ['anticol', 'ANTI COLL'], ['pnl', 'PNL LT'], ['ac', 'A/C'], ['vent', 'BLOWER']];
linhaA.forEach(([k, r], i) => interruptor(k, r, 0.2, 0.125 - i * 0.05));
linhaB.forEach(([k, r], i) => interruptor(k, r, 0.08, 0.125 - i * 0.05));
for (let i = 0; i < N_MOT; i++) { interruptor('valv' + i, N_MOT > 1 ? `ENG ${i + 1}` : 'ENG VALVE', -0.05, 0.1 - i * 0.1); interruptor('start' + i, N_MOT > 1 ? `START ${i + 1}` : 'START', -0.05, 0.05 - i * 0.1, 'start'); }
// botões de disjuntor (A/C e aviônicos) e manopla do seletor de temperatura
const disj = {};
for (const [k, r, z] of [['cbAC', 'A/C CB', -0.1], ['cbAvi', 'AVI CB', -0.05]]) {
  const b = cil(0.008, 0.008, 0.018, [-0.17, 0.03, z], M(0x202225), gPed); b.userData.acao = { tipo: 'cb', chave: k }; disj[k] = b; interativos.push(b);
  placa(r, [-0.2, 0.0005, z], gPed, 0.07);
}
const knob = cil(0.022, 0.024, 0.02, [-0.18, 0.035, 0.08], M(0x30343a, { metalness: 0.3 }), gPed); knob.userData.acao = { tipo: 'knob' }; interativos.push(knob);
const marcaKnob = caixa([0.022, 0.006, 0.004], [-0.17, 0.047, 0.08], M(0xffffff), gPed); placa('TEMP', [-0.215, 0.0005, 0.08], gPed, 0.06);

/* ---------------- manche (cíclico), coletivo + manete, pedais ---------------- */
const cic = new THREE.Group(); cic.position.set(0.48, 0.12, 0.33); cabine.add(cic);
cil(0.05, 0.06, 0.04, [0, 0, 0], mPreto); // bota
const cicHaste = cil(0.012, 0.014, 0.6, [0, 0.3, 0], mMetal, cic);
const cicGrip = cil(0.022, 0.02, 0.13, [0.015, 0.65, 0], mGrip, cic, [0, 0, -0.25]);
const cicBt = cil(0.008, 0.008, 0.012, [0.03, 0.72, 0], M(0xb03030), cic, [0, 0, -0.25]);
for (const o of [cicHaste, cicGrip, cicBt]) { o.userData.acao = { tipo: 'ciclico' }; interativos.push(o); }
const col = new THREE.Group(); col.position.set(-0.05, 0.38, 0.08); cabine.add(col);
const colAlav = cil(0.016, 0.016, 0.55, [0.27, 0, 0], mMetal, col, [0, 0, Math.PI / 2]);
const colCabeca = caixa([0.05, 0.06, 0.06], [0.56, 0.02, 0], mGrip, col);
const manete = cil(0.022, 0.022, 0.12, [0.47, 0, 0], M(0x24272b, { roughness: 0.9 }), col, [0, 0, Math.PI / 2]);
const maneteMarca = caixa([0.12, 0.004, 0.006], [0.47, 0.023, 0], M(0xffd040), col);
colAlav.userData.acao = colCabeca.userData.acao = { tipo: 'coletivo' }; manete.userData.acao = maneteMarca.userData.acao = { tipo: 'manete' };
interativos.push(colAlav, colCabeca, manete, maneteMarca);
const pedais = [];
for (const [z, s] of [[0.24, -1], [0.42, 1]]) {
  const p = new THREE.Group(); p.position.set(1.0, 0.22, z); cabine.add(p);
  const pl = caixa([0.03, 0.16, 0.09], [0, 0, 0], mPreto, p, [0, 0, -0.35]); pl.userData.acao = { tipo: 'pedal' }; interativos.push(pl);
  p.userData.s = s; pedais.push(p);
}

/* ---------------- câmera (cabeça do piloto) ---------------- */
const cabeca = new THREE.Group(); cabeca.position.set(0.02, 1.2, 0.33); heli.add(cabeca); cabeca.add(camera);
const olhar = { yaw: -Math.PI / 2, pitch: -0.18, alvoYaw: -Math.PI / 2, alvoPitch: -0.18 };
const VISTAS = { frente: [-Math.PI / 2, -0.05], painel: [-Math.PI / 2 + 0.22, -0.32], pedestal: [-Math.PI / 2 + 0.55, -0.85] };
const virar = (v) => { [olhar.alvoYaw, olhar.alvoPitch] = VISTAS[v]; };

/* =====================================================================
   Janela do rotor: swashplate, pás com passo, track e rotor de cauda
   ===================================================================== */
const cenaR = new THREE.Scene(); cenaR.background = new THREE.Color(0x10151c);
const camR = new THREE.PerspectiveCamera(38, 1, 0.05, 50); camR.position.set(3.2, 2.3, 3.2); camR.lookAt(0, 0.35, 0);
cenaR.add(new THREE.HemisphereLight(0xffffff, 0x334455, 1.4)); { const l = new THREE.DirectionalLight(0xffffff, 1.5); l.position.set(3, 5, 2); cenaR.add(l); }
const mastro = cil(0.05, 0.06, 0.9, [0, 0.2, 0], mMetal, cenaR);
const swFixo = cil(0.24, 0.24, 0.035, [0, -0.05, 0], M(0x8a8f96, { metalness: 0.7 }), cenaR);
const swRot = cil(0.21, 0.21, 0.03, [0, -0.01, 0], M(0xc9a64a, { metalness: 0.7 }), cenaR);
const cubo = new THREE.Group(); cubo.position.y = 0.62; cenaR.add(cubo);
cil(0.12, 0.12, 0.08, [0, 0, 0], M(0x6f767e, { metalness: 0.7 }), cubo);
const pasR = [], bielas = [];
for (let i = 0; i < PAS; i++) {
  const g = new THREE.Group(); g.rotation.y = i * Math.PI * 2 / PAS; cubo.add(g);
  const passo = new THREE.Group(); passo.position.x = 0.15; g.add(passo);
  const pa = caixa([1.9, 0.018, 0.16], [0.95, 0, 0], M(i === 0 ? 0xe0a030 : 0xd8dde3, { roughness: 0.4 }), passo);
  caixa([0.12, 0.022, 0.17], [1.86, 0, 0], M(0xff6a2a), passo); // ponta pintada (referência de track)
  pasR.push({ g, passo, pa });
  const b = cil(0.012, 0.012, 0.6, [0, 0.29, 0.12], mMetal, cenaR); bielas.push({ m: b, i });
}
const rc = new THREE.Group(); rc.position.set(-1.6, 0.4, 0.5); cenaR.add(rc);
const rcPas = [];
for (let i = 0; i < 2; i++) { const g = new THREE.Group(); g.rotation.z = i * Math.PI; rc.add(g); const p = new THREE.Group(); g.add(p); caixa([0.03, 0.42, 0.06], [0, 0.21, 0], M(0xd8dde3), p); rcPas.push(p); }
cil(0.03, 0.03, 0.12, [0, 0, -0.06], mMetal, rc, [Math.PI / 2, 0, 0]);
let angRotor = 0, angRC = 0;

/* =====================================================================
   Janela da aeronave: o modelo em operação visto de fora, seguindo o teste
   (altura, atitude, rumo, rotação dos rotores e estado dos sensores)
   ===================================================================== */
const cenaA = new THREE.Scene(); cenaA.background = new THREE.Color(0x10151c);
const camA = new THREE.PerspectiveCamera(38, 1, 0.1, 600);
cenaA.environment = cena.environment; // mesmos reflexos da cabine: a pintura dos modelos reais não fica escura
cenaA.add(new THREE.HemisphereLight(0xdfe9ff, 0x2a2f38, 1.3)); { const l = new THREE.DirectionalLight(0xffffff, 1.6); l.position.set(6, 12, 8); cenaA.add(l); }
const gradeA = new THREE.GridHelper(400, 200, 0x3a4a60, 0x202a38); cenaA.add(gradeA);
const sombraA = new THREE.Mesh(new THREE.CircleGeometry(4.5, 40), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35 })); sombraA.rotation.x = -Math.PI / 2; sombraA.position.y = 0.01; cenaA.add(sombraA);
const aeroA = new THREE.Group(); cenaA.add(aeroA);
let modeloA = null, vistaA = { pos: [9, 4, 9], alvo: [0, 1.5, 0] };
try { modeloA = construirHelicoptero(CFG.id); aeroA.add(modeloA.raiz); if (modeloA.vista) vistaA = modeloA.vista; } catch (e) { console.warn('Modelo externo indisponível:', e.message); }
// modelo real da aeronave (.glb, o mesmo do Manual 3D) por cima do modelo do sistema; os rotores que giram ficam no mastro real
const CASCA_A = { '206': ['heli_206_real', false], '230': ['heli_230', false], '505': ['heli_505_real', false], '429': ['heli_429_real', false], '407': ['heli_407', false], '206L4': ['heli_206_real', true], '430': ['heli_230', true] }[CFG.id] || [`heli_${CFG.id}`, false];
let cascaPronta = !modeloA, modeloRealA = false;
if (modeloA) aplicarCascaReal(modeloA, `assets/modelos3d/${CASCA_A[0]}.glb`, { esticar: CASCA_A[1] }).then((r) => r || (CASCA_A[0].endsWith('_real') ? aplicarCascaReal(modeloA, `assets/modelos3d/${CASCA_A[0].replace(/_real$/, '')}.glb`, { esticar: CASCA_A[1] }) : null)).then((r) => {
  if (!r) return;
  const raiz = modeloA.raiz; raiz.updateMatrixWorld(true);
  const rp = (modeloA.rotores.find((x) => x.eixo === 'y') || {}).obj, rcd = (modeloA.rotores.find((x) => x.eixo !== 'y') || {}).obj;
  let noMastro = false;
  if (r.rotor && rp && rp.parent && rp.getWorldPosition(new THREE.Vector3()).distanceTo(r.rotor) > 0.03) {
    rp.position.copy(rp.parent.worldToLocal(r.rotor.clone())); noMastro = true;
    if (r.peMastro !== null && r.rotor.y - r.peMastro > 0.02) {
      const alt = r.rotor.y - r.peMastro + 0.04, m = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.09, alt, 20), new THREE.MeshStandardMaterial({ color: 0x9aa3ad, metalness: 0.8, roughness: 0.35 }));
      m.position.set(r.rotor.x, r.peMastro - 0.02 + alt / 2, r.rotor.z); m.applyMatrix4(new THREE.Matrix4().copy(raiz.matrixWorld).invert()); raiz.add(m);
    }
  }
  if (r.rotorCauda && rcd && rcd.parent && rcd.getWorldPosition(new THREE.Vector3()).distanceTo(r.rotorCauda) > 0.03) rcd.position.copy(rcd.parent.worldToLocal(r.rotorCauda.clone()));
  const vis = noMastro ? /^(pas_rp|cubo_rp|rotor_cauda|cubo_rc)$/ : /^(pas_rp|cubo_rp|swash|rotor_cauda|mastro\w*|cubo_rc)$/;
  for (const m of modeloA.malhas) m.visible = vis.test(m.userData.comp);
  if (modeloA.matLinha) modeloA.matLinha.opacity = 0;
  modeloRealA = true;
}).catch((e) => console.warn('Modelo real indisponível:', e.message)).finally(() => { cascaPronta = true; });
const CORES_ESTADO ={ al: 0xffb020, cr: 0xff3020, sem: 0x3060ff };
const pintadas = new Map(); // malha -> estado atual
function pintarSensores() {
  if (!modeloA) return;
  const pior = new Map(), ordem = { sem: 1, al: 2, cr: 3 };
  for (const s of SENS) { const e = sens.estados[s.id]; if (!ordem[e]) continue; for (const c of s.comp || []) for (const m of modeloA.partes[c] || []) if ((ordem[pior.get(m)] || 0) < ordem[e]) pior.set(m, e); }
  for (const [m] of pintadas) if (!pior.has(m)) { m.material.emissive.setHex(0); pintadas.delete(m); }
  for (const [m, e] of pior) {
    if (pintadas.get(m) === e || !m.material || !m.material.emissive) continue;
    if (!m.userData.matProprio) { m.material = m.material.clone(); m.userData.matProprio = true; }
    m.material.emissive.setHex(CORES_ESTADO[e]); m.material.emissiveIntensity = 0.85; pintadas.set(m, e);
  }
  // marca luminosa no lugar do componente (aparece mesmo quando a peça fica por dentro da fuselagem)
  const porComp = new Map();
  for (const s of SENS) { const e = sens.estados[s.id]; if (!ordem[e]) continue; for (const c of s.comp || []) if (modeloA.partes[c] && (ordem[porComp.get(c)] || 0) < ordem[e]) porComp.set(c, e); }
  for (const [c, mk] of marcasA) if (!porComp.has(c)) { aeroA.remove(mk); marcasA.delete(c); }
  for (const [c, e] of porComp) {
    let mk = marcasA.get(c);
    if (!mk) {
      const cx = new THREE.Box3(); aeroA.updateMatrixWorld(true); for (const m of modeloA.partes[c]) cx.expandByObject(m);
      mk = new THREE.Mesh(new THREE.SphereGeometry(0.32, 16, 12), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.75, depthTest: false }));
      mk.renderOrder = 10; mk.position.copy(aeroA.worldToLocal(cx.getCenter(new THREE.Vector3()))); aeroA.add(mk); marcasA.set(c, mk);
    }
    mk.material.color.setHex(CORES_ESTADO[e]);
  }
}
const marcasA = new Map(); // componente -> marca

/* =====================================================================
   Desenho das telas
   ===================================================================== */
function relogio(x, cx, cy, r, v, min, max, rot, un, faixas = [], dec = 0) {
  x.save(); x.translate(cx, cy);
  x.fillStyle = '#0c0d0f'; x.beginPath(); x.arc(0, 0, r, 0, 7); x.fill(); x.strokeStyle = '#555'; x.lineWidth = 3; x.stroke();
  const a0 = Math.PI * 0.75, a1 = Math.PI * 2.25, ang = (u) => a0 + (a1 - a0) * clamp((u - min) / (max - min), 0, 1);
  for (const [a, b, cor] of faixas) { x.strokeStyle = cor; x.lineWidth = r * 0.12; x.beginPath(); x.arc(0, 0, r * 0.84, ang(a), ang(b)); x.stroke(); }
  x.strokeStyle = '#ddd'; x.lineWidth = 2; for (let k = 0; k <= 10; k++) { const a = a0 + (a1 - a0) * k / 10; x.beginPath(); x.moveTo(Math.cos(a) * r * 0.72, Math.sin(a) * r * 0.72); x.lineTo(Math.cos(a) * r * 0.92, Math.sin(a) * r * 0.92); x.stroke(); }
  const a = ang(v); x.strokeStyle = '#fff'; x.lineWidth = 4; x.beginPath(); x.moveTo(0, 0); x.lineTo(Math.cos(a) * r * 0.8, Math.sin(a) * r * 0.8); x.stroke();
  x.fillStyle = '#ddd'; x.font = `bold ${r * 0.24}px Arial`; x.textAlign = 'center'; x.fillText(rot, 0, -r * 0.3);
  x.font = `bold ${r * 0.3}px Consolas, monospace`; x.fillStyle = '#7fe08a'; x.fillText(fmt(v, dec), 0, r * 0.45); x.font = `${r * 0.18}px Arial`; x.fillStyle = '#aaa'; x.fillText(un, 0, r * 0.68);
  x.restore();
}
function fita(x, X, Y, w, h, v, passo, rot, un) {
  x.fillStyle = 'rgba(10,12,16,.75)'; x.fillRect(X, Y, w, h); x.strokeStyle = '#888'; x.strokeRect(X, Y, w, h);
  x.save(); x.beginPath(); x.rect(X, Y, w, h); x.clip(); x.fillStyle = '#ddd'; x.font = '18px Consolas'; x.textAlign = 'center';
  for (let k = -6; k <= 6; k++) { const val = Math.round(v / passo) * passo + k * passo, yy = Y + h / 2 - (val - v) / passo * 30; x.fillText(String(val), X + w / 2, yy + 6); }
  x.restore(); x.fillStyle = '#000'; x.fillRect(X - 4, Y + h / 2 - 16, w + 8, 32); x.strokeStyle = '#fff'; x.strokeRect(X - 4, Y + h / 2 - 16, w + 8, 32);
  x.fillStyle = '#fff'; x.font = 'bold 22px Consolas'; x.textAlign = 'center'; x.fillText(fmt(v), X + w / 2, Y + h / 2 + 8);
  x.fillStyle = '#9fd0ff'; x.font = '14px Arial'; x.fillText(rot + ' ' + un, X + w / 2, Y - 6);
}
const apagada = (o, txt) => { o.x.setTransform(1, 0, 0, 1, 0, 0); o.x.fillStyle = '#050607'; o.x.fillRect(0, 0, o.c.width, o.c.height); if (txt) { o.x.fillStyle = '#333'; o.x.font = '20px Arial'; o.x.textAlign = 'center'; o.x.fillText(txt, o.c.width / 2, o.c.height / 2); } o.t.needsUpdate = true; };
function desenharPFD() {
  const o = T.pfd, x = o.x, W = 640, H = 480; x.setTransform(o.c.width / W, 0, 0, o.c.height / H, 0, 0);
  if (S.vBus < 18) return apagada(o);
  if (VIDRO && (!S.sw.avi || !S.cbAvi || S.pane === 'barra_avi')) return apagada(o, 'PFD – sem alimentação (AVIONICS)');
  x.save(); x.translate(W / 2, H / 2); x.rotate(-S.roll * Math.PI / 180);
  const dy = S.pitch * 6;
  x.fillStyle = '#2f6fc4'; x.fillRect(-W, -H * 1.5 + dy, W * 2, H * 1.5); x.fillStyle = '#7a5530'; x.fillRect(-W, dy, W * 2, H * 1.5);
  x.strokeStyle = '#fff'; x.lineWidth = 2; x.beginPath(); x.moveTo(-W, dy); x.lineTo(W, dy); x.stroke();
  x.fillStyle = '#fff'; x.font = '14px Arial'; x.textAlign = 'center';
  for (let p = -20; p <= 20; p += 5) { if (!p) continue; const yy = dy - p * 6, l = p % 10 ? 30 : 60; x.beginPath(); x.moveTo(-l, yy); x.lineTo(l, yy); x.stroke(); if (!(p % 10)) x.fillText(Math.abs(p), l + 18, yy + 5); }
  x.restore();
  x.strokeStyle = '#ffd040'; x.lineWidth = 5; x.beginPath(); x.moveTo(W / 2 - 90, H / 2); x.lineTo(W / 2 - 30, H / 2); x.lineTo(W / 2 - 15, H / 2 + 12); x.moveTo(W / 2 + 90, H / 2); x.lineTo(W / 2 + 30, H / 2); x.lineTo(W / 2 + 15, H / 2 + 12); x.stroke();
  x.fillStyle = '#ffd040'; x.fillRect(W / 2 - 4, H / 2 - 4, 8, 8);
  fita(x, 20, 90, 90, 300, Math.max(0, S.ias), 10, 'IAS', 'kt'); fita(x, W - 120, 90, 100, 300, Math.max(0, S.alt * 3.281), 50, 'ALT', 'ft');
  x.fillStyle = 'rgba(0,0,0,.7)'; x.fillRect(W / 2 - 70, H - 46, 140, 38); x.fillStyle = '#fff'; x.font = 'bold 24px Consolas'; x.textAlign = 'center'; x.fillText(String(Math.round(((S.rumo % 360) + 360) % 360)).padStart(3, '0') + '°', W / 2, H - 18);
  x.fillStyle = '#9fd0ff'; x.font = '15px Arial'; x.fillText(`VS ${fmt(S.vs * 196.85)} ft/min`, W / 2, 26);
  o.t.needsUpdate = true;
}
function desenharMotor() {
  const o = T.mot, x = o.x, W = 640, H = 480; x.setTransform(o.c.width / W, 0, 0, o.c.height / H, 0, 0);
  if (S.vBus < 18) return apagada(o);
  x.fillStyle = '#07090c'; x.fillRect(0, 0, W, H);
  const L = leituras(), r = N_MOT > 1 ? 52 : 70;
  const g = [
    ['NG', (l) => l.ng, 0, 110, '%', [[0, P.ngMcp, '#2f9e4f'], [P.ngMcp, P.ngTrans, '#d9a620'], [P.ngTrans, 110, '#c43030']], 1],
    [P.temp, (l) => l.temp, 0, 1000, '°C', [[300, P.tempMcp, '#2f9e4f'], [P.tempMcp, P.tempTo, '#d9a620'], [P.tempTo, 1000, '#c43030']], 0],
    ['TQ', (l) => l.tq, 0, 130, '%', [[0, 100, '#2f9e4f'], [100, P.tqTo, '#d9a620'], [P.tqTo, 130, '#c43030']], 0]
  ];
  L.forEach((l, i) => g.forEach(([rot, f, mn, mx, un, fx, d], k) => relogio(x, (k + 0.5) * W / 3, N_MOT > 1 ? 70 + i * 135 : 110, r, f(l), mn, mx, (N_MOT > 1 ? `${rot} ${i + 1}` : rot), un, fx, d)));
  const yb = N_MOT > 1 ? 350 : 260;
  relogio(x, W / 4, yb + 60, 60, S.nr, 0, 120, 'NR / NP', '%', [[95, 104, '#2f9e4f'], [104, 120, '#c43030']]);
  x.fillStyle = '#ddd'; x.font = '19px Consolas'; x.textAlign = 'left';
  const lm = L[0];
  [[`ÓLEO P  ${fmt(lm.oleoP)} psi`], [`ÓLEO T  ${fmt(lm.oleoT)} °C`], [`FF      ${fmt(L.reduce((a, l) => a + l.ff, 0))} kg/h`], [`COMB    ${fmt(Math.max(0, 100 - registroComb()))} %`]].forEach(([t], i) => x.fillText(t, W / 2 + 10, yb + 20 + i * 30));
  o.t.needsUpdate = true;
}
function desenharSistemas() {
  const o = T.sis, x = o.x, W = 640, H = 480; x.setTransform(o.c.width / W, 0, 0, o.c.height / H, 0, 0);
  if (S.vBus < 18) return apagada(o);
  if (VIDRO && (!S.sw.avi || !S.cbAvi || S.pane === 'barra_avi')) return apagada(o, 'MFD – sem alimentação (AVIONICS)');
  x.fillStyle = '#07090c'; x.fillRect(0, 0, W, H);
  x.fillStyle = '#9fd0ff'; x.font = 'bold 18px Arial'; x.textAlign = 'left'; x.fillText('ELÉTRICO', 16, 26); x.fillText('AR-CONDICIONADO', 16, 196); x.fillText('VIBRAÇÃO / ROTOR', 336, 196);
  relogio(x, 80, 105, 58, S.vBus, 0, 32, 'BUS', 'V', [[0, 24, '#c43030'], [24, 26, '#d9a620'], [26, 30, '#2f9e4f']], 1);
  relogio(x, 220, 105, 58, S.ampGen, 0, 200, 'GEN', 'A', [[0, 150, '#2f9e4f'], [150, 200, '#c43030']]);
  relogio(x, 360, 105, 58, S.ampBat, -120, 120, 'BATT', 'A', [[-120, -5, '#d9a620'], [-5, 120, '#2f9e4f']]);
  x.fillStyle = '#ddd'; x.font = '17px Consolas';
  x.fillText(`Cargas ${fmt(S.cargas)} A`, 440, 70); x.fillText(`Bateria ${fmt(S.soc * 100)} %`, 440, 96); x.fillText(`GEN ${S.genOn ? 'ON-LINE' : 'OFF'}`, 440, 122);
  x.fillText(`A/C CB ${S.cbAC ? 'OK' : 'DESARM.'}`, 440, 148);
  x.fillText(`Cabine  ${fmt(S.cabine, 1)} °C`, 16, 226); x.fillText(`Seleção ${fmt(S.tempSel)} °C`, 16, 252); x.fillText(`Duto    ${fmt(S.duto, 1)} °C`, 16, 278);
  x.fillText(`OAT     ${fmt(S.oat)} °C`, 16, 304); x.fillText(`Compr.  ${S.acLig ? 'ENGATADO' : 'parado'}`, 16, 330); x.fillText(`Ventil. ${S.sw.vent && S.vBus > 22 && S.pane !== 'ventilador' ? 'ON' : 'OFF'}`, 16, 356);
  relogio(x, 400, 290, 60, S.vib.ips, 0, 2, 'VIB', 'IPS', [[0, 0.5, '#2f9e4f'], [0.5, 1, '#d9a620'], [1, 2, '#c43030']], 2);
  x.fillText(`Ordem ${S.vib.ordem}`, 470, 240); x.fillText(`Vert ${fmt(S.vib.ver, 2)}`, 470, 266); x.fillText(`Lat  ${fmt(S.vib.lat, 2)}`, 470, 292);
  x.fillText('Track (mm):', 470, 330); x.fillText(S.track.map((v) => (v > 0 ? '+' : '') + fmt(v)).join(' '), 470, 356);
  o.t.needsUpdate = true;
}
function desenharAlarmes() {
  const o = T.alm, x = o.x; x.setTransform(2, 0, 0, 2, 0, 0);
  x.fillStyle = '#0a0b0d'; x.fillRect(0, 0, 1024, 96);
  if (S.vBus < 18) { o.t.needsUpdate = true; return; }
  const n = ALARMES.length, w = 1024 / Math.max(n, 1);
  ALARMES.forEach(([txt, on, vermelho], i) => {
    x.fillStyle = on ? (vermelho ? '#d42020' : '#e0a010') : '#24262a'; x.fillRect(i * w + 3, 8, w - 6, 80);
    x.fillStyle = on ? '#111' : '#5a5d63'; x.font = `bold ${Math.min(26, w / 5)}px Arial`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(txt, i * w + w / 2, 48);
  });
  o.t.needsUpdate = true;
}


/* =====================================================================
   Interação: arrastar comandos, clicar interruptores, olhar em volta
   ===================================================================== */
const ray = new THREE.Raycaster(), mouse = new THREE.Vector2();
let arrasto = null;
function pegar(e) {
  const r = renderer.domElement.getBoundingClientRect(); mouse.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(mouse, camera); const h = ray.intersectObjects(interativos, false)[0]; return h ? h.object.userData.acao : null;
}
renderer.domElement.addEventListener('pointerdown', (e) => {
  const a = pegar(e); renderer.domElement.setPointerCapture(e.pointerId);
  if (!a) { arrasto = { tipo: 'olhar', x: e.clientX, y: e.clientY }; return; }
  if (a.tipo === 'sw') return alternar(a.chave);
  if (a.tipo === 'start') return partida(+a.chave.slice(5));
  if (a.tipo === 'cb') { if (a.chave === 'cbAC' && !S.cbAC) { S.cbAC = true; S.tPane = 0; log('Disjuntor do A/C rearmado.'); } else if (a.chave === 'cbAvi') { S.cbAvi = !S.cbAvi; log(`Disjuntor dos aviônicos ${S.cbAvi ? 'rearmado' : 'puxado'}.`); } return; }
  arrasto = { tipo: a.tipo, x: e.clientX, y: e.clientY };
});
renderer.domElement.addEventListener('pointermove', (e) => {
  if (!arrasto) { const a = pegar(e); renderer.domElement.style.cursor = a ? (['sw', 'start', 'cb'].includes(a.tipo) ? 'pointer' : 'grab') : 'default'; mostrarDica(a, e); return; }
  const dx = (e.clientX - arrasto.x) / 220, dy = (e.clientY - arrasto.y) / 220; arrasto.x = e.clientX; arrasto.y = e.clientY;
  if (arrasto.tipo === 'olhar') { olhar.alvoYaw -= dx * 1.4; olhar.alvoPitch = clamp(olhar.alvoPitch - dy * 1.4, -1.2, 0.6); }
  else if (arrasto.tipo === 'ciclico') { S.lat = clamp(S.lat + dx * 1.6, -1, 1); S.lon = clamp(S.lon - dy * 1.6, -1, 1); }
  else if (arrasto.tipo === 'coletivo') S.col = clamp(S.col - dy * 1.4, 0, 1);
  else if (arrasto.tipo === 'pedal') S.ped = clamp(S.ped + dx * 1.6, -1, 1);
  else if (arrasto.tipo === 'manete') S.manete = clamp(S.manete + (dx - dy) * 1.2, 0, 1);
  else if (arrasto.tipo === 'knob') S.tempSel = clamp(S.tempSel + (dx - dy) * 8, 16, 30);
});
addEventListener('pointerup', () => { arrasto = null; });
renderer.domElement.addEventListener('wheel', (e) => {
  e.preventDefault(); const a = pegar(e), d = -Math.sign(e.deltaY);
  if (a?.tipo === 'manete') S.manete = clamp(S.manete + d * 0.05, 0, 1);
  else if (a?.tipo === 'knob') S.tempSel = clamp(S.tempSel + d, 16, 30);
  else if (a?.tipo === 'coletivo') S.col = clamp(S.col + d * 0.04, 0, 1);
  else camera.fov = clamp(camera.fov - d * 4, 30, 85), camera.updateProjectionMatrix();
}, { passive: false });
const teclas = new Set();
addEventListener('keydown', (e) => {
  if (/INPUT|SELECT|TEXTAREA/.test(e.target.tagName)) return;
  teclas.add(e.key.toLowerCase()); if (e.key.startsWith('Arrow')) e.preventDefault();
  if (e.key.toLowerCase() === 't') { S.lon = 0; S.lat = 0; log('Force trim: manche centralizado.'); }
  // interruptores, partida e piloto automático pelo teclado (um toque = uma ação)
  if (e.repeat || e.ctrlKey || e.altKey || e.metaKey) return;
  const k = e.key.toLowerCase(), chave = TECLAS_SW[k];
  if (chave) alternar(chave);
  else if (k === 'v') { const abrir = S.valv.slice(0, N_MOT).some((x) => !x); for (let i = 0; i < N_MOT; i++) if (!!S.valv[i] !== abrir) alternar('valv' + i); }
  else if (/^[1-9]$/.test(k) && +k <= N_MOT) partida(+k - 1);
  else if (k === 'enter') { e.preventDefault(); piloto.decolar(); log('Decolagem automática solicitada (tecla Enter).'); }
  else if (k === 'l') piloto.pousar('solicitado');
  else if (k === 'm' && piloto.ativo) { piloto.parar(); log('Piloto automático desligado: comandos com o piloto.'); }
});
const TECLAS_SW = { b: 'bat', p: 'bomba', g: 'gen', h: 'hid', i: 'avi' };
const AJUDA_TECLAS = [
  ['B', 'Bateria (BATT)'], ['P', 'Bomba de reforço (BOOST)'], ['V', 'Válvula(s) de combustível'], ['R / F', 'Manete: abrir / fechar'],
  [N_MOT > 1 ? '1 … ' + N_MOT : '1', 'START do motor'], ['G', 'Gerador (GEN)'], ['H', 'Hidráulico (HYD SYS)'], ['I', 'Aviônicos'],
  ['W / S', 'Coletivo: subir / descer'], ['Setas', 'Cíclico (manche)'], ['A / D', 'Pedais: esquerda / direita'], ['T', 'Force trim (centraliza o manche)'],
  ['Enter', 'Decolagem automática'], ['L', 'Pouso automático'], ['M', 'Assumir manual']
];
addEventListener('keyup', (e) => teclas.delete(e.key.toLowerCase()));
function teclado(dt) {
  const v = dt * 0.9;
  // qualquer comando manual pelo teclado devolve a aeronave ao piloto
  if (piloto.ativo && ['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 's', 'a', 'd'].some((k) => teclas.has(k))) { piloto.parar(); log('Piloto automático desligado: comandos manuais.', 'al'); }
  if (teclas.has('arrowup')) S.lon = clamp(S.lon + v, -1, 1); if (teclas.has('arrowdown')) S.lon = clamp(S.lon - v, -1, 1);
  if (teclas.has('arrowleft')) S.lat = clamp(S.lat - v, -1, 1); if (teclas.has('arrowright')) S.lat = clamp(S.lat + v, -1, 1);
  if (teclas.has('w')) S.col = clamp(S.col + v * 0.6, 0, 1); if (teclas.has('s')) S.col = clamp(S.col - v * 0.6, 0, 1);
  if (teclas.has('a')) S.ped = clamp(S.ped - v, -1, 1); if (teclas.has('d')) S.ped = clamp(S.ped + v, -1, 1);
  // sem motor funcionando, R não passa da marcha lenta (a partida exige a manete nessa posição)
  if (teclas.has('r')) S.manete = clamp(S.manete + v * 0.5, 0, sims.some((s) => s.modo !== 'partida' && s.s.ng > P.ngIdle - 3) ? 1 : Math.max(0.25, Math.min(S.manete, 0.45)));
  if (teclas.has('f')) S.manete = clamp(S.manete - v * 0.5, 0, 1);
}

/* ---------------- dica ao passar o mouse ---------------- */
const dica = $('#dica');
const DICAS = { ciclico: 'Manche (cíclico) – arraste: frente/trás inclina o disco e o nariz; lados inclinam para os lados. Setas do teclado. T = force trim.', coletivo: 'Coletivo – arraste para cima/baixo: passo de todas as pás juntas (sobe/desce). W/S.', manete: 'Manete (twist grip) – role o mouse ou arraste: corte → marcha lenta → voo. R/F.', pedal: 'Pedais – arraste para os lados: passo do rotor de cauda (guinada). A/D.', knob: 'Seletor de temperatura da cabine – role o mouse.' };
function mostrarDica(a, e) {
  if (!a) { dica.hidden = true; return; }
  const txt = a.tipo === 'sw' ? (a.chave.startsWith('valv') ? 'Válvula de combustível do motor' : NOMES_SW[a.chave]) + ' – clique para alternar' : a.tipo === 'start' ? 'START – clique (bateria, BOOST, válvula aberta e manete em marcha lenta)' : a.tipo === 'cb' ? 'Disjuntor – clique para rearmar/puxar' : DICAS[a.tipo];
  const r = vista.getBoundingClientRect(); dica.hidden = false; dica.textContent = txt; dica.style.left = (e.clientX - r.left + 14) + 'px'; dica.style.top = (e.clientY - r.top + 14) + 'px';
}
let avisoT = null;
function avisar(txt, nivel) { const h = $('#hudCab'); h.innerHTML = `<div class="aviso ${nivel}">${esc(txt)}</div>`; clearTimeout(avisoT); avisoT = setTimeout(() => { h.innerHTML = ''; }, 4500); }

/* =====================================================================
   Painel lateral: partida (checklist), teste de comandos, voo, panes, registro
   ===================================================================== */
const CHK_PARTIDA = [
  ['Bateria (BATT) LIGADA', () => S.sw.bat], ['Tensão da bateria ≥ 24 V', () => S.vBus >= 24], ['Bomba de reforço (BOOST) LIGADA', () => S.sw.bomba],
  ['Válvula(s) de combustível ABERTA(S)', () => S.valv.every(Boolean)], ['Manete em MARCHA LENTA', () => S.manete >= 0.08 && S.manete <= 0.45],
  ['START – Ng subindo e acendimento', () => sims.some((s) => s.acendeu)], [`${P.temp} dentro do limite de partida`, () => sims.every((s) => s.picoTemp <= P.tempPartida)],
  ['Ng estabilizado em marcha lenta', () => sims.every((s) => s.s.ng > P.ngIdle - 3)], ['Gerador (GEN) LIGADO – on-line', () => S.genOn],
  ['Hidráulico (HYD SYS) LIGADO', () => S.sw.hid], ['Aviônicos LIGADOS', () => S.sw.avi], ['Manete em VOO (100% Nr)', () => S.nr > 97],
  ['Alarmes apagados (exceto os esperados)', () => !ALARMES.some(([, on, v]) => on && v)]
];
const CHK_COMANDOS = [
  ['Cíclico todo à frente', () => S.lon > 0.95], ['Cíclico todo atrás', () => S.lon < -0.95], ['Cíclico todo à esquerda', () => S.lat < -0.95], ['Cíclico todo à direita', () => S.lat > 0.95],
  ['Coletivo todo embaixo', () => S.col < 0.03], ['Coletivo todo em cima', () => S.col > 0.97], ['Pedal esquerdo no batente', () => S.ped < -0.95], ['Pedal direito no batente', () => S.ped > 0.95],
  ['Manete: corte → marcha lenta → voo', () => S.maneteVisto?.corte && S.maneteVisto?.lenta && S.maneteVisto?.voo], ['Force trim (tecla T) usado', () => registro.some((r) => /Force trim/.test(r.txt))]
];
const feitos = { partida: new Set(), comandos: new Set() };
S.maneteVisto = {};
function conferir() {
  if (S.manete < 0.08) S.maneteVisto.corte = true; else if (S.manete < 0.45) S.maneteVisto.lenta = true; else if (S.manete > 0.9) S.maneteVisto.voo = true;
  let mudou = false;
  CHK_PARTIDA.forEach(([n, f], i) => { if (!feitos.partida.has(i) && (i === 0 || feitos.partida.has(i - 1)) && f()) { feitos.partida.add(i); mudou = true; log('✔ ' + n); } });
  CHK_COMANDOS.forEach(([n, f], i) => { if (!feitos.comandos.has(i) && f()) { feitos.comandos.add(i); mudou = true; log('✔ Teste: ' + n); } });
  if (mudou && (aba === 'partida' || aba === 'teste')) desenhar[aba]();
}
const conteudo = $('#conteudo'), desenhar = {};
let aba = 'partida';
const lista = (chk, set) => chk.map(([n], i) => `<div class="item${set.has(i) ? ' ok' : ''}"><span class="tag ${set.has(i) ? 'ok' : ''}">${set.has(i) ? '✔' : i + 1}</span><div class="desc">${esc(n)}</div></div>`).join('');
desenhar.partida = () => {
  conteudo.innerHTML = `<h2>Sequência de partida</h2><p class="nota">Faça na cabine: clique nos interruptores do pedestal, abra a válvula, deixe a manete em marcha lenta e aperte START. Os itens se marcam sozinhos, na ordem.</p>
    ${lista(CHK_PARTIDA, feitos.partida)}
    <div class="linha"><button class="bt" id="btAuto">Fazer a partida automática</button><button class="bt" id="btReiniciar">Reiniciar (aeronave fria)</button></div>
    <h3>Condições</h3><label class="ctrl-sl"><span>OAT</span><input type="range" id="slOat" min="-10" max="45" value="${S.oat}"><output>${S.oat} °C</output></label>`;
  $('#btAuto').onclick = partidaAutomatica; $('#btReiniciar').onclick = () => location.reload();
  $('#slOat').oninput = (e) => { S.oat = +e.target.value; e.target.nextElementSibling.textContent = S.oat + ' °C'; };
};
desenhar.teste = () => {
  const ok = feitos.comandos.size === CHK_COMANDOS.length;
  conteudo.innerHTML = `<h2>Teste de movimento dos comandos</h2><p class="nota">Leve cada comando até o batente (arrastando na cabine ou pelo teclado). A janela do rotor mostra o swashplate, o passo de cada pá e o rotor de cauda respondendo.</p>
    ${lista(CHK_COMANDOS, feitos.comandos)}
    ${ok ? '<div class="cartao"><div class="tit">Resultado: cursos completos e livres ✔</div><div class="sub">Registre também a fricção e a ausência de interferências conforme o procedimento de regulagem (rigging) do manual (cap. 67).</div></div>' : ''}
    <h3>Posição atual</h3><div id="posCmd" class="nota"></div>
    <div class="linha"><button class="bt" id="btCentro">Centralizar comandos</button><a class="bt" href="comandos.html?m=${CFG.id}#teste">Cadeia de comando 3D ›</a></div>`;
  $('#btCentro').onclick = () => { Object.assign(S, { lon: 0, lat: 0, ped: 0 }); };
};
desenharPos();
function desenharPos() {
  const e = $('#posCmd'); if (e) e.innerHTML = `Cíclico long. ${fmt(S.lon * 100)}% · lat. ${fmt(S.lat * 100)}% · Coletivo ${fmt(S.col * 100)}% · Pedais ${fmt(S.ped * 100)}% · Manete ${fmt(S.manete * 100)}%<br>Passo coletivo ≈ ${fmt(2 + S.col * 14, 1)}° · Disco: long. ${fmt(-S.lon * 8, 1)}° / lat. ${fmt(S.lat * 8, 1)}° · Rotor de cauda ≈ ${fmt(S.ped * 18, 1)}° <small>(didático)</small>`;
  const v = $('#vooInfo'); if (v) v.innerHTML = `Altura ${fmt(S.alt * 3.281)} ft · VS ${fmt(S.vs * 196.85)} ft/min · IAS ${fmt(Math.max(0, S.ias))} kt · Rumo ${fmt(((S.rumo % 360) + 360) % 360)}° · Pitch ${fmt(S.pitch, 1)}° · Roll ${fmt(S.roll, 1)}° · Nr ${fmt(S.nr)}% · Vibração ${fmt(S.vib.ips, 2)} IPS ${S.vib.ordem}`;
}
desenhar.voo = () => {
  conteudo.innerHTML = `<h2>Voo (didático)</h2><p class="nota">Com Nr em 100% (manete em voo), suba o coletivo devagar: a aeronave sai do chão perto do torque de pairado. O cíclico inclina a aeronave (atitude no PFD) e o disco do rotor (janela do rotor); os pedais giram o rumo. Desça devagar: toque com mais de 3 m/s gera alerta de pouso duro.</p>
    <div id="vooInfo" class="cartao"></div>
    <h3>Integridade das pás, inclinação e vibração</h3><p class="nota">A janela do rotor mostra o track (altura da ponta de cada pá; a pá nº 1 é amarela). O medidor VIB (tela de sistemas) dá a vibração em IPS e a ordem (1/rev, n/rev). Limites reais: manual de manutenção (cap. 18 – vibração, cap. 62 – rotor principal).</p>`;
  desenharPos();
};
desenhar.registro = () => {
  conteudo.innerHTML = `<h2>Registro de eventos</h2><div class="linha"><button class="bt" id="btCsv">Exportar CSV</button></div>${registro.map((r) => `<div class="item"><span class="tag ${r.nivel === 'cr' ? 'er' : r.nivel === 'al' ? 'al' : ''}">${fmt(r.t, 1)} s</span><div class="desc">${esc(r.txt)}</div></div>`).join('') || '<p class="nota">Nada ainda.</p>'}`;
  $('#btCsv').onclick = () => { const csv = 'tempo_s;nivel;evento\n' + registro.slice().reverse().map((r) => `${r.t.toFixed(1)};${r.nivel};"${r.txt.replace(/"/g, '""')}"`).join('\n'); const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv' })); a.download = `cabine_${CFG.id}_registro.csv`; a.click(); };
};
desenhar.ajuda = () => {
  conteudo.innerHTML = `<h2>Panes – treino de diagnóstico</h2><p class="nota">Injete uma pane (instrutor) ou peça uma <b>pane surpresa</b>. Observe alarmes, volts/amperes, temperaturas, ${P.temp}, torque, vibração e track; depois escolha o diagnóstico.</p>
    <div class="linha"><button class="bt pri" id="btSurpresa">Pane surpresa</button><button class="bt" id="btLimpar">Remover pane</button></div>
    <label class="sub">Injetar pane (instrutor): <select id="selPane"><option value="">—</option>${Object.entries(PANES).map(([k, p]) => `<option value="${k}">${esc(p.sist)} – ${esc(p.n)}</option>`).join('')}</select></label>
    <div class="cartao" id="estadoPane">${S.pane ? (S.paneOculta ? '<b>Pane surpresa ativa.</b> Investigue pelos instrumentos.' : `<b>Pane ativa:</b> ${esc(PANES[S.pane].n)}`) : 'Nenhuma pane ativa.'}</div>
    <h3>Meu diagnóstico</h3><select id="selDiag"><option value="">— escolha —</option>${Object.entries(PANES).map(([k, p]) => `<option value="${k}">${esc(p.n)}</option>`).join('')}<option value="nenhuma">Não há pane</option></select>
    <div class="linha"><button class="bt pri" id="btDiag">Confirmar diagnóstico</button></div><div id="resDiag"></div>
    <h3>Comandos</h3><p class="nota">Manche: arrastar ou setas · Coletivo: arrastar ou W/S · Pedais: arrastar ou A/D · Manete: rolar o mouse ou R/F · Force trim: T · Olhar em volta: arrastar o fundo · Zoom: rolar fora dos comandos.</p>`;
  $('#btSurpresa').onclick = () => { const ks = Object.keys(PANES); S.pane = ks[Math.floor(Math.random() * ks.length)]; S.paneOculta = true; S.tPane = 0; log('Pane surpresa inserida pelo instrutor. Investigue.', 'al'); desenhar.ajuda(); };
  $('#btLimpar').onclick = () => { S.pane = null; S.paneOculta = false; S.cbAC = true; log('Pane removida.'); desenhar.ajuda(); };
  $('#selPane').onchange = (e) => { S.pane = e.target.value || null; S.paneOculta = false; S.tPane = 0; if (S.pane) log('Pane injetada: ' + PANES[S.pane].n, 'al'); desenhar.ajuda(); };
  $('#btDiag').onclick = () => {
    const d = $('#selDiag').value; if (!d) return;
    const certo = (d === 'nenhuma' && !S.pane) || d === S.pane, p = S.pane && PANES[S.pane];
    $('#resDiag').innerHTML = `<div class="cartao"><div class="tit">${certo ? '✔ Diagnóstico correto' : '✘ Não é isso'}</div>${p ? `<div class="sub"><b>Pane:</b> ${esc(p.n)} (${esc(p.sist)})</div><div class="sub"><b>Indícios:</b> ${esc(p.sint)}</div><div class="sub"><b>Ação:</b> ${esc(p.acao)}</div>` : '<div class="sub">Não havia pane ativa.</div>'}</div>`;
    log(`Diagnóstico: ${d === 'nenhuma' ? 'sem pane' : PANES[d].n} – ${certo ? 'CORRETO' : 'incorreto'}.`, certo ? 'info' : 'al');
    if (certo) S.paneOculta = false;
  };
};
/* =====================================================================
   Decolagem e voo de acordo com os sensores (modelo em src/aplicacao/prontidao_voo.js)
   ===================================================================== */
const fonteSim = criarFonteSimulada(SENS), contextoVoo = criarContexto(SIS);
const sens = { modo: 'sim', url: 'api/telemetria.php', usar: true, valores: fonteSim.valores, estados: {}, av: { decisao: 'GO', impedem: 0, atencao: 0, itens: [] }, conexao: 'simulação (leituras geradas e ligadas ao voo)', remoto: {}, decisaoAnt: 'GO' };
const piloto = new PilotoDecolagem(SIS, {
  aoMudar: (f, motivo) => { log(`Piloto automático: ${FASES[f]}${motivo ? ' – ' + motivo.replace(/\.$/, '') : ''}.`, f === 'rejeitada' ? 'cr' : f === 'pouso' && motivo ? 'al' : 'info'); if (aba === 'decolagem') desenhar.decolagem(); }
});
function passoSensores(dt) {
  if (!SENS.length) return;
  if (sens.modo === 'sim') sens.valores = fonteSim.passo(dt, contextoVoo(dt));
  else { const agora = Date.now(), v = {}; for (const s of SENS) { const x = sens.remoto[s.id]; if (x && agora - x.t < 30000) v[s.id] = x.v; } sens.valores = v; contextoVoo(dt); }
  sens.estados = estadosDe(SENS, sens.valores);
  sens.av = avaliarDecolagem(SENS, sens.estados);
  S.efeitos = sens.usar ? efeitosNoVoo(SENS, sens.estados, N_MOT) : null;
  if (sens.av.decisao !== sens.decisaoAnt) {
    if (sens.usar && sens.av.decisao === 'NO-GO') log(`Sensores: NO-GO – ${sens.av.itens.filter((i) => i.impede).map((i) => i.s.n).slice(0, 2).join('; ')}.`, 'cr');
    else if (sens.usar && sens.decisaoAnt === 'NO-GO') log('Sensores: condição de NO-GO removida.');
    sens.decisaoAnt = sens.av.decisao;
  }
  piloto.passo(dt, sens.usar ? sens.av : null, S.efeitos);
}
setInterval(async () => { // sensores reais: lê o servidor de telemetria uma vez por segundo
  if (sens.modo !== 'http') return;
  try {
    const r = await fetch(sens.url, { cache: 'no-store' }); if (!r.ok) throw new Error('HTTP ' + r.status);
    const d = await r.json(), agora = d.agora || Date.now() / 1000;
    for (const [id, x] of Object.entries(d.leituras || {})) if (x && typeof x.v === 'number') sens.remoto[id] = { v: x.v, t: Date.now() - (agora - x.t) * 1000 };
    sens.conexao = 'recebendo de ' + sens.url;
  } catch (e) { sens.conexao = `sem conexão com ${sens.url} (${e.message})`; }
}, 1000);
const leituraTxt = (s) => { const v = sens.valores[s.id]; return v === undefined ? 'sem sinal' : s.tipo === 'bool' ? (v >= 1 ? 'DETECTADO' : 'normal') : `${fmt(v, Math.abs(s.base) < 2 ? 2 : 1)} ${s.un}`; };
function desenharDecisao() {
  const el = $('#decDin'); if (!el) return;
  const a = sens.av, cor = a.decisao === 'GO' ? 'ok' : a.decisao === 'NO-GO' ? 'er' : 'al', ef = S.efeitos;
  const rot = { GO: 'GO – liberado para decolar', ATENCAO: 'ATENÇÃO – decolagem a critério do operador', 'NO-GO': 'NO-GO – decolagem não liberada' }[a.decisao];
  el.innerHTML = `<div class="cartao decisao ${cor}"><div class="tit"><span>${rot}</span><span class="tag ${cor}">${a.impedem} impedem · ${a.atencao} atenção</span></div>
      <div class="sub">${SENS.length} sensores avaliados${sens.usar ? '' : ' · <b>efeito dos sensores desligado</b>'} · ${esc(sens.conexao)}</div></div>
    <div class="cartao"><div class="tit"><span>Piloto automático</span><span class="tag ${piloto.ativo ? 'ok' : ''}">${piloto.ativo ? 'ATIVO' : 'desligado'}</span></div>
      <div class="sub"><b>${esc(FASES[piloto.fase])}</b>${piloto.motivo ? ' – ' + esc(piloto.motivo) : ''}</div>
      <div class="sub">Altura ${fmt(S.alt * 3.281)} ft · VS ${fmt(S.vs * 196.85)} ft/min · IAS ${fmt(Math.max(0, S.ias))} kt · Nr ${fmt(S.nr)}% · Torque ${leituras().map((l) => fmt(l.tq)).join(' / ')}% · Coletivo ${fmt(S.col * 100)}%</div></div>
    ${a.itens.length ? `<h3>Sensores fora da faixa</h3>${a.itens.slice(0, 12).map((i) => `<div class="item"><span class="tag ${i.impede ? 'er' : 'al'}">${i.impede ? 'IMPEDE' : 'ATENÇÃO'}</span><div class="desc">${esc(i.s.n)} <b>${esc(leituraTxt(i.s))}</b><div class="meta">${esc(SISTEMAS[i.sistema])} · ${esc(i.motivo)}${i.s.dica ? ' · ' + esc(i.s.dica) : ''}</div></div></div>`).join('')}${a.itens.length > 12 ? `<p class="nota">… e mais ${a.itens.length - 12}.</p>` : ''}` : ''}
    ${ef && ef.avisos.length ? `<h3>Efeito no voo</h3>${ef.avisos.map((x) => `<div class="item"><span class="tag al">VOO</span><div class="desc">${esc(x)}</div></div>`).join('')}` : ''}
    ${fonteSim.falhas.size && sens.modo === 'sim' ? `<h3>Falhas simuladas ativas</h3><div class="linha">${[...fonteSim.falhas].map((id) => `<button class="bt mini" data-tirar="${esc(id)}">${esc((SENS.find((s) => s.id === id) || { n: id }).n)} ×</button>`).join('')}</div>` : ''}`;
}
/* ---------------- guia de decolagem: um passo por vez, com a tecla a apertar ---------------- */
const GUIA = [
  ['B', 'Ligue a bateria (BATT)', () => S.sw.bat],
  ['P', 'Ligue a bomba de reforço (BOOST)', () => S.sw.bomba],
  ['V', 'Abra a(s) válvula(s) de combustível', () => S.valv.slice(0, N_MOT).every(Boolean)],
  ['R', 'Manete em marcha lenta: R sobe (para sozinha na marcha lenta), F desce', () => S.manete >= 0.08 && S.manete <= 0.45],
  ...Array.from({ length: N_MOT }, (_, i) => [String(i + 1), `Aperte ${i + 1} para o START do motor${N_MOT > 1 ? ' ' + (i + 1) : ''} e espere o Ng estabilizar (cerca de 40 s)`, () => sims[i].modo !== 'partida' && sims[i].s.ng > P.ngIdle - 3]),
  ['G', 'Ligue o gerador (GEN)', () => S.genOn],
  ['H', 'Ligue o hidráulico (HYD SYS)', () => S.sw.hid],
  ['I', 'Ligue os aviônicos', () => S.sw.avi],
  ['R', 'Segure R até o rotor chegar a 100% Nr', () => S.nr > 97],
  ['GO', 'Confira o quadro dos sensores: só siga com GO ou ATENÇÃO', () => sens.av.decisao !== 'NO-GO'],
  ['W', 'Segure W devagar até a aeronave sair do chão', () => !S.noChao],
  ['W / S', 'Estabilize o pairado a uns 3 m (10 ft); A / D seguram o rumo', () => !S.noChao && S.alt >= 2.5],
  ['↑', 'Seta para cima: incline à frente e ganhe velocidade (acima de 20 kt)', () => !S.noChao && S.ias > 20],
  ['W', 'Suba com o coletivo até 150 ft, sem passar de 100% de torque', () => S.alt > 45],
  ['L', 'Voo estabelecido. Para voltar: L (pouso automático) ou desça devagar com S', () => S.noChao]
];
let guiaI = 0, guiaHtml = '';
function desenharGuia() {
  const el = $('#guia'); if (!el) return;
  while (guiaI < GUIA.length && GUIA[guiaI][2]()) guiaI++;
  const fim = guiaI >= GUIA.length, tecla = (t, at) => `<b style="display:inline-block;min-width:26px;text-align:center;padding:2px 6px;border-radius:5px;border:1px solid ${at ? '#ff8a2a' : '#3a4656'};${at ? 'background:#ff8a2a;color:#17100a' : ''}">${esc(t)}</b>`;
  const linhas = GUIA.map(([t, d], i) => `<div style="display:flex;gap:8px;align-items:center;padding:4px 6px;border-radius:6px;${i === guiaI ? 'background:rgba(255,138,42,.14);font-weight:600' : i < guiaI ? 'opacity:.5' : 'opacity:.8'}">${i < guiaI ? '<span style="min-width:14px">✔</span>' : `<span style="min-width:14px">${i + 1}</span>`}${tecla(t, i === guiaI)}<span>${esc(d)}</span></div>`).join('');
  const h = `<p class="nota"><b>${fim ? 'Guia concluído – aeronave de volta ao solo.' : `Passo ${guiaI + 1} de ${GUIA.length}: aperte ${esc(GUIA[guiaI][0])}`}</b></p>${linhas}`;
  if (h !== guiaHtml) { guiaHtml = h; el.innerHTML = h; const at = el.children[guiaI + 1]; if (at && at.scrollIntoView) at.scrollIntoView({ block: 'nearest' }); }
}
desenhar.decolagem = () => {
  if (!SENS.length) { conteudo.innerHTML = '<h2>Decolagem pelos sensores</h2><p class="nota">Este modelo não tem sensores de condição cadastrados.</p>'; return; }
  const grupos = {}; for (const s of SENS) (grupos[SISTEMAS[classificar(s).sistema]] ||= []).push(s);
  conteudo.innerHTML = `<h2>Decolagem e voo de acordo com os sensores</h2>
    <p class="nota">Os sensores de condição da aeronave decidem se ela pode decolar (GO / NO-GO) e mudam o voo: motor em nível crítico é cortado, hidráulico degradado deixa os comandos lentos, rotor de cauda em alerta puxa a guinada.</p>
    <div class="linha"><button class="bt pri" id="btDecolar">Decolagem automática</button><button class="bt" id="btPousar">Pouso automático</button><button class="bt" id="btManual">Assumir manual</button></div>
    <h3>Guia de decolagem pelo teclado</h3>
    <div id="guia" class="nota" style="max-height:230px;overflow:auto"></div>
    <div class="linha"><button class="bt" id="btGuia">Recomeçar o guia</button></div>
    <div id="decDin"></div>
    <h3>Controles pelo teclado</h3>
    <table class="nota" style="width:100%;border-collapse:collapse">${AJUDA_TECLAS.map(([t, d]) => `<tr><td style="padding:2px 8px 2px 0;white-space:nowrap"><b>${esc(t)}</b></td><td>${esc(d)}</td></tr>`).join('')}</table>
    <p class="nota">Ordem para decolar: B · P · V · R até marcha lenta · ${N_MOT > 1 ? '1 e depois 2' : '1'} (espere o Ng estabilizar) · G · H · I · R até 100% Nr · W devagar para sair do chão.</p>
    <h3>Simular falha de sensor</h3>
    <div class="linha"><select id="selFalha" style="flex:1;min-width:170px">${Object.entries(grupos).map(([g, l]) => `<optgroup label="${esc(g)}">${l.map((s) => `<option value="${esc(s.id)}">${esc(s.n)}</option>`).join('')}</optgroup>`).join('')}</select><button class="bt" id="btFalha">Levar ao crítico</button><button class="bt" id="btNormal">Normalizar tudo</button></div>
    <h3>Origem das leituras</h3>
    <div class="linha"><select id="selFonte" style="flex:1;min-width:170px"><option value="sim"${sens.modo === 'sim' ? ' selected' : ''}>Simulação ligada ao voo</option><option value="http"${sens.modo === 'http' ? ' selected' : ''}>Sensores reais (servidor de telemetria)</option></select>
      <input type="text" id="urlFonte" value="${esc(sens.url)}" style="flex:1;min-width:140px"${sens.modo === 'sim' ? ' disabled' : ''}></div>
    <label class="nota"><input type="checkbox" id="chkUsar"${sens.usar ? ' checked' : ''}> Sensores afetam a decolagem e o voo</label>
    <p class="nota">Regras e limites ilustrativos para treinamento. O despacho real segue o RFM, a MEL e o programa de manutenção aprovado. Comandos manuais (setas, W/S, A/D) desligam o piloto automático.</p>`;
  guiaHtml = ''; desenharGuia();
  $('#btGuia').onclick = () => { guiaI = 0; guiaHtml = ''; desenharGuia(); };
  $('#btDecolar').onclick = () => { piloto.decolar(); log('Decolagem automática solicitada.'); desenharDecisao(); };
  $('#btPousar').onclick = () => { piloto.pousar('solicitado'); desenharDecisao(); };
  $('#btManual').onclick = () => { piloto.parar(); log('Piloto automático desligado: comandos com o piloto.'); desenharDecisao(); };
  $('#btFalha').onclick = () => { const id = $('#selFalha').value; if (sens.modo !== 'sim') { avisar('Falhas simuladas só valem na origem "Simulação".', 'al'); return; } if (!fonteSim.falhas.has(id)) fonteSim.alternarFalha(id); log('Falha simulada no sensor: ' + SENS.find((s) => s.id === id).n, 'al'); desenharDecisao(); };
  $('#btNormal').onclick = () => { fonteSim.falhas.clear(); log('Sensores simulados normalizados.'); desenharDecisao(); };
  $('#selFonte').onchange = (e) => { sens.modo = e.target.value; sens.remoto = {}; sens.conexao = sens.modo === 'sim' ? 'simulação (leituras geradas e ligadas ao voo)' : 'conectando…'; desenhar.decolagem(); };
  $('#urlFonte').onchange = (e) => { sens.url = e.target.value.trim() || 'api/telemetria.php'; };
  $('#chkUsar').onchange = (e) => { sens.usar = e.target.checked; desenharDecisao(); };
  $('#decDin').onclick = (e) => { const id = e.target.dataset.tirar; if (id) { fonteSim.falhas.delete(id); desenharDecisao(); } };
  desenharDecisao();
};

function abrirAba(n) {
  if (!desenhar[n]) n = 'partida'; aba = n;
  document.querySelectorAll('#abas button').forEach((b) => b.classList.toggle('ativa', b.dataset.aba === n));
  history.replaceState(null, '', '#' + n); desenhar[n]();
}
$('#abas').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) abrirAba(b.dataset.aba); });
document.querySelector('#abas [data-aba="ajuda"]').textContent = 'Panes';
async function partidaAutomatica() {
  const esp = (ms) => new Promise((r) => setTimeout(r, ms));
  const passo = async (fn, ms = 700) => { fn(); await esp(ms); };
  if (!S.sw.bat) await passo(() => alternar('bat')); if (!S.sw.bomba) await passo(() => alternar('bomba'));
  for (let i = 0; i < N_MOT; i++) if (!S.valv[i]) await passo(() => alternar('valv' + i));
  S.manete = 0.25; await esp(400);
  for (let i = 0; i < N_MOT; i++) { partida(i); while (sims[i].modo === 'partida') await esp(300); }
  for (const k of ['gen', 'hid', 'avi', 'vent']) if (!S.sw[k]) await passo(() => alternar(k));
  S.manete = 1; log('Manete em VOO.');
}

/* =====================================================================
   Laço
   ===================================================================== */
const relogio3d = new THREE.Clock(); let acTela = 0, acPos = 0, acPinta = 0;
function ajustar() { const w = vista.clientWidth, h = vista.clientHeight; if (!w || !h) return; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
new ResizeObserver(ajustar).observe(vista); ajustar();
// janela no canto: aeronave em operação → detalhe do rotor → fechada
let verRotor = true, janela = modeloA ? 'aeronave' : 'rotor';
const rotuloJanela = () => { const b = $('#btRotor'); b.textContent = janela === 'aeronave' ? 'Janela: aeronave' : janela === 'rotor' ? 'Janela: rotor' : 'Janela: fechada'; b.classList.toggle('on', verRotor); b.title = 'Janela do canto: aeronave em operação (vista de fora), detalhe do rotor (swashplate, passo das pás) ou fechada'; };
$('#btRotor').onclick = () => { const ordem = modeloA ? ['aeronave', 'rotor', 'off'] : ['rotor', 'off']; janela = ordem[(ordem.indexOf(janela) + 1) % ordem.length]; verRotor = janela !== 'off'; rotuloJanela(); };
rotuloJanela();
$('#btVistaPainel').onclick = () => virar('painel'); $('#btVistaPedestal').onclick = () => virar('pedestal'); $('#btVistaFrente').onclick = () => virar('frente');
$('#btPainel').onclick = (e) => { const f = $('#app').classList.toggle('sem-painel'); e.currentTarget.textContent = f ? 'Mostrar painel' : 'Ocultar painel'; };
$('#btFoto').onclick = () => fotoHD(renderer, cena, camera, `cabine_${CFG.id}`);
let ultimoQuadro = performance.now();
setInterval(() => { if (performance.now() - ultimoQuadro > 400) { passoSensores(0.25); passoSistemas(0.25); conferir(); } }, 250); // aba em segundo plano: os sistemas continuam
renderer.setAnimationLoop(() => {
  try {
    ultimoQuadro = performance.now();
    const dt = Math.min(relogio3d.getDelta(), 0.1), t = relogio3d.elapsedTime;
    adaptar(dt); teclado(dt); passoSensores(dt); passoSistemas(dt); conferir();
    // comandos 3D
    cic.rotation.z = -S.lon * 0.22; cic.rotation.x = S.lat * 0.22;
    col.rotation.z = S.col * 0.32; manete.rotation.x = S.manete * 1.6; maneteMarca.rotation.x = S.manete * 1.6;
    pedais.forEach((p) => { p.position.x = 1.0 + S.ped * 0.06 * p.userData.s; });
    for (const k in ALAVANCAS) { const on = k.startsWith('valv') ? S.valv[+k.slice(4)] : k.startsWith('start') ? sims[+k.slice(5)].modo === 'partida' : S.sw[k]; ALAVANCAS[k].rotation.z = on ? 0.5 : -0.5; }
    disj.cbAC.position.y = S.cbAC ? 0.03 : 0.045; disj.cbAvi.position.y = S.cbAvi ? 0.03 : 0.045; knob.rotation.y = (S.tempSel - 23) * 0.2; marcaKnob.rotation.y = knob.rotation.y;
    // aeronave no mundo (atitude, posição, vibração da cabine)
    const vib = S.vib.ips * 0.006;
    heli.position.set(S.x, S.alt + 0.05 + Math.sin(t * S.nr * 0.12) * vib, S.z);
    heli.rotation.set(-S.roll * Math.PI / 180 + Math.sin(t * S.nr * 0.12 + 1) * S.vib.lat * 0.004, -S.rumo * Math.PI / 180, S.pitch * Math.PI / 180, 'YXZ');
    olhar.yaw += (olhar.alvoYaw - olhar.yaw) * Math.min(1, dt * 6); olhar.pitch += (olhar.alvoPitch - olhar.pitch) * Math.min(1, dt * 6);
    camera.rotation.set(olhar.pitch, olhar.yaw, 0);
    // rotor
    const w = S.nr / 100 * 18; angRotor += dt * w; angRC += dt * w * 5;
    cubo.rotation.y = angRotor; swRot.rotation.y = angRotor;
    swFixo.rotation.set(S.lat * 0.14, 0, -S.lon * 0.14); swRot.rotation.x = S.lat * 0.14; swRot.rotation.z = -S.lon * 0.14;
    swFixo.position.y = -0.05 + S.col * 0.1; swRot.position.y = swFixo.position.y + 0.035;
    pasR.forEach((p, i) => {
      const az = angRotor + i * Math.PI * 2 / PAS, passo = (2 + S.col * 14 + S.lon * 7 * Math.cos(az) + S.lat * 7 * Math.sin(az)) * Math.PI / 180;
      p.passo.rotation.x = passo; p.passo.rotation.z = (S.track[i] / 14) * 0.06 + (S.nr > 50 ? 0.03 : -0.02);
    });
    bielas.forEach(({ m, i }) => { const az = angRotor + i * Math.PI * 2 / PAS; m.position.set(Math.cos(az) * 0.19, 0.27 + S.col * 0.1 + (S.lon * Math.cos(az) + S.lat * Math.sin(az)) * 0.03, -Math.sin(az) * 0.19); });
    rc.rotation.z = angRC; rcPas.forEach((p) => { p.rotation.y = S.ped * 0.5; });
    // telas (≈ 10 Hz)
    acTela += dt; if (acTela > 0.1) { acTela = 0; desenharPFD(); desenharMotor(); desenharSistemas(); desenharAlarmes(); }
    acPos += dt; if (acPos > 0.25) { acPos = 0; desenharPos(); if (aba === 'decolagem') { desenharDecisao(); desenharGuia(); } }
    // render principal + janela do rotor
    const W = renderer.domElement.clientWidth, H = renderer.domElement.clientHeight;
    renderer.setViewport(0, 0, W, H); renderer.setScissorTest(false); renderer.clear(); renderer.render(cena, camera);
    if (verRotor) {
      const w2 = Math.round(janela === 'aeronave' ? Math.min(460, W * 0.42) : Math.min(340, W * 0.3)), h2 = Math.round(w2 * 0.72), x2 = W - w2 - 12, y2 = 34;
      renderer.setScissorTest(true); renderer.setScissor(x2, y2, w2, h2); renderer.setViewport(x2, y2, w2, h2);
      if (janela === 'aeronave') {
        // mesma atitude, rumo e altura do teste; os rotores giram com o Nr e as peças com sensor fora do normal acendem
        if (cascaPronta) { // enquanto o modelo real é encaixado, a aeronave fica na origem
          aeroA.position.set(0, S.alt + Math.sin(t * S.nr * 0.12) * S.vib.ips * 0.006, 0);
          aeroA.rotation.set(-S.roll * Math.PI / 180, -S.rumo * Math.PI / 180, S.pitch * Math.PI / 180, 'YXZ');
        }
        for (const r of modeloA.rotores) r.obj.rotation[r.eixo] += dt * r.vel * 1.8 * S.nr / 100;
        gradeA.position.set(-(S.x % 2), 0, -(S.z % 2)); sombraA.scale.setScalar(1 / (1 + S.alt * 0.02)); sombraA.material.opacity = 0.4 / (1 + S.alt * 0.05);
        acPinta += dt; if (acPinta > 0.5) { acPinta = 0; pintarSensores(); }
        for (const [, mk] of marcasA) mk.scale.setScalar(1 + 0.35 * Math.sin(t * 6));
        camA.position.set(vistaA.pos[0], vistaA.pos[1] + S.alt * 0.85, vistaA.pos[2]); camA.lookAt(vistaA.alvo[0], vistaA.alvo[1] + S.alt, vistaA.alvo[2]);
        camA.aspect = w2 / h2; camA.updateProjectionMatrix(); renderer.clear(); renderer.render(cenaA, camA);
      } else { camR.aspect = w2 / h2; camR.updateProjectionMatrix(); renderer.clear(); renderer.render(cenaR, camR); }
      renderer.setScissorTest(false);
    }
  } catch (e) { mostrarErro('Erro na cabine: ' + e.message); renderer.setAnimationLoop(null); throw e; }
});
virar('painel');
abrirAba(location.hash.slice(1) || 'partida');
log(`Cabine pronta: ${CFG.nome}. Aeronave fria, OAT ${S.oat} °C, cabine ao sol ${S.cabine} °C.`);
