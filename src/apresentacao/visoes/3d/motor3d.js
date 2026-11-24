// HeliSense 3D – construtor 3D dos motores (procedural, ilustrativo – não é desenho de engenharia).
// Eixo do motor = X (+X = frente / lado do eixo de saída). Unidades ~ metros, dimensões das fichas EASA/TCDS.
// Arquiteturas:  m250   – Rolls-Royce/Allison 250 (fluxo reverso; C20J com compressor axial+centrífugo, C47 só centrífugo)
//                pw200  – P&WC PW207D1 (caixa de redução dianteira, compressor centrífugo, câmara anular de fluxo reverso)
//                arrius – Safran Arrius 2R (idem, com caixa de acessórios integrada na caixa de redução)
import * as THREE from 'three';

const PALETA = {
  casca: [0x9ba3ac, 0.55, 0.38], quente: [0x9a7a58, 0.6, 0.4], titanio: [0xb9c0c8, 0.7, 0.3], caixa: [0x7d8878, 0.35, 0.55],
  cobre: [0xb98352, 0.7, 0.35], escuro: [0x3b4149, 0.4, 0.6], interno: [0xc8ccd2, 0.8, 0.25], rotor: [0xd7c27a, 0.8, 0.3],
  mangueira: [0xd2572c, 0.05, 0.8], ele: [0x2c3036, 0.2, 0.6], comb: [0xd9b44a, 0.3, 0.5], oleo: [0x8a5a2b, 0.3, 0.5],
  tela: [0x8d949e, 0.6, 0.4], suporte: [0x55606c, 0.5, 0.5]
};
export function material(nome, cor) {
  const [c, met, rug] = PALETA[nome] || PALETA.casca;
  const m = new THREE.MeshStandardMaterial({ color: cor ?? c, metalness: met, roughness: rug, side: THREE.DoubleSide, wireframe: nome === 'tela' });
  m.name = nome; // usado pelo acabamento realista (realismo.js)
  return m;
}

/* ---------------- primitivas ---------------- */
const V = (a) => new THREE.Vector3(a[0], a[1], a[2]);
function geoRev(pts, seg = 72) { // perfil [x, raio] girado em torno do eixo X
  const g = new THREE.LatheGeometry(pts.map(([x, r]) => new THREE.Vector2(Math.max(r, 0.0005), x)), seg);
  g.rotateZ(-Math.PI / 2); return g;
}
function malha(p) {
  let g, m = new THREE.Mesh();
  if (p.t === 'rev') g = geoRev(p.pts, p.seg);
  else if (p.t === 'cil') {
    const A = V(p.a), B = V(p.b); g = new THREE.CylinderGeometry(p.r2 ?? p.r, p.r, A.distanceTo(B), Math.max(p.seg || 16, 32), 1, !!p.aberto);
    m.position.copy(A).add(B).multiplyScalar(0.5); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.clone().sub(A).normalize());
  } else if (p.t === 'caixa') { g = new THREE.BoxGeometry(...p.s); m.position.set(...p.p); if (p.rot) m.rotation.set(...p.rot); }
  else if (p.t === 'tubo') g = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(p.pts.map(V)), 24, p.r, 10);
  else if (p.t === 'toro') { g = new THREE.TorusGeometry(p.R, p.r, 8, 48); g.rotateY(Math.PI / 2); m.position.set(p.x, 0, 0); }
  else if (p.t === 'esfera') { g = new THREE.SphereGeometry(p.r, 16, 12); m.position.set(...p.p); if (p.esc) m.scale.set(...p.esc); }
  else if (p.t === 'rotor') { // disco com pás (gira em torno de X)
    const grp = new THREE.Group(); grp.position.x = p.x;
    const cubo = new THREE.Mesh(new THREE.CylinderGeometry(p.rIn, p.rIn, p.esp, 20)); cubo.rotation.z = Math.PI / 2; grp.add(cubo);
    for (let i = 0; i < p.n; i++) {
      const pa = new THREE.Mesh(new THREE.BoxGeometry(p.esp * 0.8, p.r - p.rIn, p.esp * 0.25));
      const a = i / p.n * Math.PI * 2; pa.position.set(0, Math.cos(a) * (p.r + p.rIn) / 2, Math.sin(a) * (p.r + p.rIn) / 2); pa.rotation.x = -a; pa.rotation.y = 0.45; grp.add(pa);
    }
    return grp;
  }
  m.geometry = g; return m;
}

/* =====================================================================
   Moldes por arquitetura: cada peça = { g: [primitivas], exp: [dx,dy,dz], gira, casca, quente }
   ===================================================================== */
function m250(o) {
  const ax = o.axial > 0, P = {};
  const lado = (z) => (o.tubos === 1 ? [1] : [1, -1]).map((s) => z * s);
  P.entrada = { casca: 1, exp: [0.35, 0, 0], g: [{ t: 'rev', m: 'titanio', pts: ax ? [[0.45, 0.085], [0.44, 0.13], [0.42, 0.135], [0.38, 0.12], [0.36, 0.11]] : [[0.45, 0.1], [0.44, 0.155], [0.41, 0.16], [0.37, 0.145]] },
    ...[0, 1, 2, 3].map((i) => ({ t: 'caixa', m: 'suporte', s: [0.05, 0.012, ax ? 0.2 : 0.24], p: [0.41, 0, 0], rot: [i * Math.PI / 4, 0, 0] }))] };
  if (ax) {
    P.compressor_axial = { casca: 1, exp: [0.25, 0.12, 0], g: [{ t: 'rev', m: 'titanio', pts: [[0.36, 0.11], [0.3, 0.108], [0.2, 0.1], [0.14, 0.098]] }] };
    P.rotor_axial = { gira: 'ng', exp: [0.25, 0.12, 0], g: [0, 1, 2, 3, 4, 5].map((i) => ({ t: 'rotor', m: 'rotor', x: 0.33 - i * 0.034, r: 0.096 - i * 0.004, rIn: 0.045, n: 18, esp: 0.016 })) };
  }
  const c0 = ax ? 0.14 : 0.37;
  P.compressor = { casca: 1, exp: [0.18, 0.05, 0], g: [{ t: 'rev', m: 'casca', pts: ax ? [[0.14, 0.1], [0.12, 0.2], [0.07, 0.215], [0.02, 0.205], [0.0, 0.12]] : [[0.37, 0.145], [0.31, 0.2], [0.2, 0.235], [0.08, 0.235], [0.02, 0.21], [0.0, 0.12]] }] };
  P.impulsor = { gira: 'ng', exp: [0.18, 0.05, 0], g: [{ t: 'rev', m: 'rotor', pts: ax ? [[0.13, 0.03], [0.11, 0.07], [0.06, 0.17], [0.03, 0.18], [0.02, 0.03]] : [[0.35, 0.04], [0.3, 0.09], [0.16, 0.2], [0.1, 0.215], [0.08, 0.04]] }] };
  P.tubos_descarga = { exp: [0, 0, 0.22], g: lado(1).map((s) => ({ t: 'tubo', m: 'casca', r: o.tubos === 1 ? 0.06 : 0.045, pts: [[0.05, -0.04, 0.2 * s], [-0.08, -0.07, 0.235 * s], [-0.3, -0.06, 0.215 * s], [-0.4, -0.02, 0.12 * s]] })) };
  P.caixa_acessorios = { exp: [0, -0.22, 0], g: [{ t: 'caixa', m: 'caixa', s: [0.2, 0.36, 0.34], p: [-0.09, -0.06, 0] }, { t: 'caixa', m: 'caixa', s: [0.05, 0.3, 0.3], p: [0.02, -0.07, 0] }] };
  P.eixo_saida = { gira: 'np', eixo: [-0.19, 0], exp: [0.3, -0.22, 0], g: [{ t: 'cil', m: 'interno', a: [0.02, -0.19, 0], b: [0.13, -0.19, 0], r: 0.032 }, { t: 'cil', m: 'escuro', a: [0.13, -0.19, 0], b: [0.15, -0.19, 0], r: 0.055, seg: 20 }] };
  P.turbina = { casca: 1, quente: 1, exp: [-0.1, 0.2, 0], g: [{ t: 'rev', m: 'quente', pts: [[-0.19, 0.12], [-0.22, 0.14], [-0.36, 0.145]] }] };
  P.turbina_gp = { gira: 'ng', quente: 1, exp: [-0.1, 0.2, 0], g: [-0.33, -0.302].map((x) => ({ t: 'rotor', m: 'rotor', x, r: 0.12, rIn: 0.05, n: 26, esp: 0.016 })) };
  P.turbina_livre = { gira: 'np', exp: [-0.1, 0.2, 0], g: [-0.265, -0.235].map((x) => ({ t: 'rotor', m: 'interno', x, r: 0.128, rIn: 0.05, n: 30, esp: 0.016 })).concat([{ t: 'cil', m: 'interno', a: [-0.23, 0, 0], b: [0.0, 0, 0], r: 0.018 }]) };
  P.coletor_escape = { quente: 1, exp: [0, 0.3, 0], g: [{ t: 'caixa', m: 'cobre', s: [0.13, 0.1, o.escapes === 2 ? 0.3 : 0.24], p: [-0.26, 0.17, 0] },
    ...(o.escapes === 2 ? [1, -1].map((s) => ({ t: 'cil', m: 'cobre', a: [-0.26, 0.2, 0.09 * s], b: [-0.29, 0.37, 0.15 * s], r: 0.062, aberto: 1 })) : [{ t: 'cil', m: 'cobre', a: [-0.26, 0.2, 0], b: [-0.33, 0.42, 0.03], r: 0.105, r2: 0.12, aberto: 1, seg: 24 }])] };
  P.combustao = { casca: 1, quente: 1, exp: [-0.3, 0, 0], g: [{ t: 'rev', m: 'casca', pts: [[-0.36, 0.145], [-0.4, 0.155], [-0.5, 0.155], [-0.55, 0.12], [-0.58, 0.05], [-0.585, 0.0]] }] };
  P.camisa = { quente: 1, exp: [-0.3, 0, 0], g: [{ t: 'rev', m: 'quente', pts: [[-0.37, 0.09], [-0.4, 0.11], [-0.5, 0.11], [-0.54, 0.07], [-0.555, 0.0]] }] };
  P.bico_injetor = { exp: [-0.42, 0, 0], g: [{ t: 'cil', m: 'comb', a: [-0.58, 0, 0], b: [-0.635, 0, 0], r: 0.014 }, { t: 'tubo', m: 'mangueira', r: 0.011, pts: [[-0.06, -0.25, -0.13], [-0.3, -0.22, -0.17], [-0.52, -0.1, -0.13], [-0.62, 0, -0.02]] }] };
  P.ignitor = { exp: [-0.3, 0.1, 0.1], g: [{ t: 'cil', m: 'ele', a: [-0.47, 0.15, 0.04], b: [-0.47, 0.215, 0.05], r: 0.012 }, { t: 'caixa', m: 'ele', s: [0.1, 0.07, 0.06], p: [-0.42, -0.13, 0.18] }, { t: 'tubo', m: 'ele', r: 0.006, pts: [[-0.42, -0.1, 0.18], [-0.46, 0.05, 0.17], [-0.47, 0.2, 0.06]] }] };
  P.termopares = { exp: [-0.05, 0.25, 0.1], g: [{ t: 'toro', m: 'ele', x: -0.285, R: 0.153, r: 0.006 }, ...[0.785, 2.356, 3.927, 5.498].map((a) => ({ t: 'cil', m: 'escuro', a: [-0.285, 0.148 * Math.cos(a), 0.148 * Math.sin(a)], b: [-0.285, 0.175 * Math.cos(a), 0.175 * Math.sin(a)], r: 0.008 }))] };
  P.gerador = { exp: [0.15, -0.15, 0.25], g: [{ t: 'cil', m: 'ele', a: [-0.03, -0.17, 0.17], b: [0.16, -0.17, 0.17], r: 0.065, seg: 20 }, { t: 'caixa', m: 'escuro', s: [0.06, 0.05, 0.05], p: [0.05, -0.1, 0.2] }] };
  P.controle_comb = { exp: [0, -0.25, -0.2], g: [{ t: 'caixa', m: 'comb', s: [0.11, 0.1, 0.09], p: [-0.06, -0.25, -0.13] }, { t: 'cil', m: 'comb', a: [-0.13, -0.21, -0.07], b: [-0.13, -0.3, -0.07], r: 0.04 },
    ...(o.fadec ? [] : [{ t: 'caixa', m: 'comb', s: [0.08, 0.08, 0.07], p: [-0.16, -0.12, -0.2] }])] };
  P.oleo = { exp: [0, -0.1, 0.25], g: [{ t: 'cil', m: 'oleo', a: [-0.12, -0.02, 0.17], b: [-0.12, -0.02, 0.25], r: 0.035 }, { t: 'tubo', m: 'mangueira', r: 0.01, pts: [[-0.12, -0.02, 0.22], [-0.2, 0.06, 0.2], [-0.3, 0.12, 0.13]] },
    { t: 'cil', m: 'ele', a: [-0.07, -0.24, 0.05], b: [-0.07, -0.285, 0.05], r: 0.012 }, { t: 'cil', m: 'ele', a: [-0.13, 0.12, 0.05], b: [-0.13, 0.155, 0.05], r: 0.012 }] };
  if (ax) P.sangria = { exp: [0.1, 0.2, 0.1], g: [{ t: 'caixa', m: 'escuro', s: [0.06, 0.05, 0.05], p: [0.22, 0.115, 0.05] }] };
  P.suportes = { exp: [0, -0.35, 0], g: [1, -1].flatMap((s) => [{ t: 'caixa', m: 'suporte', s: [0.04, 0.12, 0.04], p: [-0.09, -0.27, 0.15 * s] }, { t: 'caixa', m: 'suporte', s: [0.04, 0.04, 0.12], p: [-0.38, -0.14, 0.12 * s] }]) };
  if (o.fadec) P.ecu = { exp: [0, -0.3, 0], g: [{ t: 'caixa', m: 'ele', s: [0.2, 0.06, 0.26], p: [-0.12, -0.42, 0] }, { t: 'tubo', m: 'ele', r: 0.008, pts: [[-0.06, -0.4, 0.1], [-0.05, -0.3, -0.1], [-0.06, -0.25, -0.13]] }] };
  const jatos = o.escapes === 2 ? [1, -1].map((s) => [[-0.29, 0.37, 0.15 * s], [-0.34, 0.62, 0.23 * s], 0.06]) : [[[-0.33, 0.42, 0.03], [-0.42, 0.72, 0.07], 0.11]];
  return { partes: P, anel: { x: -0.285, R: 0.165 }, jatos, faisca: [-0.47, 0.22, 0.05], vista: { pos: [1.5, 0.85, 1.75], alvo: [-0.08, 0, 0] } };
}

function pw200(o) {
  const P = {};
  P.caixa_reducao = { casca: 1, exp: [0.32, 0, 0], g: [{ t: 'rev', m: 'caixa', pts: [[0.445, 0.06], [0.43, 0.15], [0.39, 0.21], [0.29, 0.22], [0.245, 0.16]] }, { t: 'caixa', m: 'caixa', s: [0.16, 0.12, 0.24], p: [0.34, 0.2, 0] }] };
  P.eixo_saida = { gira: 'np', exp: [0.5, 0, 0], g: [{ t: 'cil', m: 'interno', a: [0.44, 0, 0], b: [0.5, 0, 0], r: 0.045 }, { t: 'cil', m: 'escuro', a: [0.5, 0, 0], b: [0.515, 0, 0], r: 0.08, seg: 24 }] };
  P.entrada = { exp: [0.2, 0.15, 0], g: [{ t: 'rev', m: 'tela', seg: 28, pts: [[0.24, 0.165], [0.235, 0.25], [0.15, 0.25], [0.145, 0.165]] }, { t: 'rev', m: 'casca', pts: [[0.243, 0.25], [0.237, 0.255]] }] };
  P.compressor = { casca: 1, exp: [0.1, 0.18, 0], g: [{ t: 'rev', m: 'titanio', pts: [[0.145, 0.165], [0.12, 0.21], [0.06, 0.25], [0.02, 0.262]] }] };
  P.impulsor = { gira: 'ng', exp: [0.1, 0.18, 0], g: [{ t: 'rev', m: 'rotor', pts: [[0.14, 0.04], [0.12, 0.08], [0.07, 0.2], [0.04, 0.215], [0.03, 0.04]] }] };
  P.combustao = { casca: 1, quente: 1, exp: [-0.05, 0.3, 0], g: [{ t: 'rev', m: 'casca', pts: [[0.02, 0.262], [-0.02, 0.272], [-0.2, 0.272], [-0.24, 0.22]] },
    ...Array.from({ length: 12 }, (_, i) => { const a = i / 12 * Math.PI * 2; return { t: 'cil', m: 'comb', a: [-0.1, 0.27 * Math.cos(a), 0.27 * Math.sin(a)], b: [-0.1, 0.295 * Math.cos(a), 0.295 * Math.sin(a)], r: 0.008 }; })] };
  P.camisa = { quente: 1, exp: [-0.05, 0.3, 0], g: [{ t: 'rev', m: 'quente', pts: [[-0.03, 0.17], [-0.03, 0.245], [-0.18, 0.245], [-0.2, 0.2], [-0.17, 0.165]] }] };
  P.turbina_gp = { gira: 'ng', quente: 1, exp: [-0.2, 0.15, 0], g: [{ t: 'rotor', m: 'rotor', x: -0.125, r: 0.145, rIn: 0.06, n: 30, esp: 0.02 }, { t: 'cil', m: 'interno', a: [-0.125, 0, 0], b: [0.04, 0, 0], r: 0.035 }] };
  P.turbina_livre = { gira: 'np', exp: [-0.25, 0.15, 0], g: [{ t: 'rotor', m: 'interno', x: -0.19, r: 0.155, rIn: 0.06, n: 34, esp: 0.02 }, { t: 'cil', m: 'interno', a: [-0.19, 0, 0], b: [0.43, 0, 0], r: 0.018 }] };
  P.escape = { casca: 1, quente: 1, exp: [-0.35, 0.1, 0], g: [{ t: 'rev', m: 'quente', pts: [[-0.24, 0.2], [-0.3, 0.17], [-0.37, 0.18], [-0.41, 0.19]] }, { t: 'tubo', m: 'quente', r: 0.125, pts: [[-0.4, 0, 0], [-0.47, 0.03, 0], [-0.5, 0.15, 0], [-0.5, 0.3, 0]] }] };
  P.ignitor = { exp: [0, 0.2, 0.25], g: [{ t: 'cil', m: 'ele', a: [-0.06, 0.2, 0.18], b: [-0.06, 0.25, 0.22], r: 0.012 }, { t: 'cil', m: 'ele', a: [-0.06, 0.2, -0.18], b: [-0.06, 0.25, -0.22], r: 0.012 }, { t: 'caixa', m: 'ele', s: [0.1, 0.06, 0.07], p: [0.05, -0.3, 0.17] }] };
  P.termopares = { exp: [-0.1, 0.35, 0.1], g: [{ t: 'toro', m: 'ele', x: -0.155, R: 0.278, r: 0.006 }, ...[0.785, 2.356, 3.927, 5.498].map((a) => ({ t: 'cil', m: 'escuro', a: [-0.155, 0.27 * Math.cos(a), 0.27 * Math.sin(a)], b: [-0.155, 0.3 * Math.cos(a), 0.3 * Math.sin(a)], r: 0.008 }))] };
  P.gerador = { exp: [0.1, 0.25, 0.3], g: [{ t: 'cil', m: 'ele', a: [0.27, 0.26, 0.2], b: [0.06, 0.26, 0.2], r: 0.068, seg: 20 }, { t: 'caixa', m: 'caixa', s: [0.05, 0.1, 0.1], p: [0.27, 0.23, 0.18] }] };
  P.controle_comb = { exp: [0.1, -0.3, -0.2], g: [{ t: 'caixa', m: 'comb', s: [0.13, 0.1, 0.1], p: [0.2, -0.24, -0.09] }, { t: 'tubo', m: 'mangueira', r: 0.01, pts: [[0.18, -0.22, -0.12], [0.05, -0.2, -0.24], [-0.1, -0.12, -0.28], [-0.1, 0, -0.29]] }] };
  P.oleo = { exp: [0.15, -0.3, 0.25], g: [{ t: 'cil', m: 'oleo', a: [0.22, -0.19, 0.14], b: [0.22, -0.28, 0.14], r: 0.035 }, { t: 'cil', m: 'ele', a: [0.33, -0.2, 0.0], b: [0.33, -0.25, 0.0], r: 0.012 }, { t: 'tubo', m: 'mangueira', r: 0.01, pts: [[0.22, -0.24, 0.14], [0.05, -0.27, 0.2], [-0.15, -0.22, 0.2], [-0.2, -0.15, 0.14]] }] };
  P.ecu = { exp: [0, -0.35, 0], g: [{ t: 'caixa', m: 'ele', s: [0.18, 0.06, 0.26], p: [-0.05, -0.42, 0] }, { t: 'tubo', m: 'ele', r: 0.008, pts: [[0.0, -0.39, 0.1], [0.1, -0.33, -0.05], [0.2, -0.29, -0.09]] }] };
  P.suportes = { exp: [0, -0.3, 0], g: [1, -1].flatMap((s) => [{ t: 'caixa', m: 'suporte', s: [0.04, 0.14, 0.04], p: [0.3, -0.24, 0.16 * s] }, { t: 'caixa', m: 'suporte', s: [0.04, 0.04, 0.1], p: [-0.22, -0.24, 0.16 * s] }]) };
  return { partes: P, anel: { x: -0.155, R: 0.29 }, jatos: [[[-0.5, 0.3, 0], [-0.5, 0.62, 0], 0.12]], faisca: [-0.06, 0.26, 0.22], vista: { pos: [1.5, 0.9, 1.75], alvo: [0, 0, 0] } };
}

function arrius() {
  const P = {};
  P.caixa_reducao = { casca: 1, exp: [0.32, 0.05, 0], g: [{ t: 'rev', m: 'caixa', pts: [[0.455, 0.07], [0.44, 0.17], [0.4, 0.22], [0.29, 0.23], [0.245, 0.17]] }, { t: 'caixa', m: 'caixa', s: [0.18, 0.2, 0.3], p: [0.35, 0.2, 0] }] };
  P.eixo_saida = { gira: 'np', eixo: [0.2, 0], exp: [0.5, 0.1, 0], g: [{ t: 'cil', m: 'interno', a: [0.44, 0.2, 0], b: [0.51, 0.2, 0], r: 0.04 }, { t: 'cil', m: 'escuro', a: [0.51, 0.2, 0], b: [0.525, 0.2, 0], r: 0.075, seg: 24 }] };
  P.caixa_acessorios = { exp: [0.25, -0.28, 0], g: [{ t: 'caixa', m: 'caixa', s: [0.18, 0.16, 0.32], p: [0.34, -0.26, 0] }] };
  P.entrada = { exp: [0.2, 0.15, 0], g: [{ t: 'rev', m: 'tela', seg: 28, pts: [[0.243, 0.175], [0.238, 0.265], [0.16, 0.265], [0.155, 0.175]] }, { t: 'rev', m: 'casca', pts: [[0.245, 0.265], [0.24, 0.27]] }] };
  P.compressor = { casca: 1, exp: [0.1, 0.2, 0], g: [{ t: 'rev', m: 'titanio', pts: [[0.155, 0.175], [0.13, 0.22], [0.07, 0.262], [0.03, 0.272]] }] };
  P.impulsor = { gira: 'ng', exp: [0.1, 0.2, 0], g: [{ t: 'rev', m: 'rotor', pts: [[0.15, 0.04], [0.13, 0.085], [0.08, 0.21], [0.05, 0.225], [0.04, 0.04]] }] };
  P.combustao = { casca: 1, quente: 1, exp: [-0.05, 0.32, 0], g: [{ t: 'rev', m: 'casca', pts: [[0.03, 0.272], [0.0, 0.282], [-0.19, 0.282], [-0.22, 0.232]] },
    ...Array.from({ length: 10 }, (_, i) => { const a = i / 10 * Math.PI * 2; return { t: 'cil', m: 'comb', a: [-0.09, 0.28 * Math.cos(a), 0.28 * Math.sin(a)], b: [-0.09, 0.305 * Math.cos(a), 0.305 * Math.sin(a)], r: 0.008 }; })] };
  P.camisa = { quente: 1, exp: [-0.05, 0.32, 0], g: [{ t: 'rev', m: 'quente', pts: [[-0.02, 0.18], [-0.02, 0.255], [-0.17, 0.255], [-0.19, 0.21], [-0.16, 0.175]] }] };
  P.turbina_gp = { gira: 'ng', quente: 1, exp: [-0.2, 0.15, 0], g: [{ t: 'rotor', m: 'rotor', x: -0.13, r: 0.15, rIn: 0.06, n: 32, esp: 0.02 }, { t: 'cil', m: 'interno', a: [-0.13, 0, 0], b: [0.05, 0, 0], r: 0.035 }] };
  P.turbina_livre = { casca: 1, gira: 'np', exp: [-0.3, 0.1, 0], g: [{ t: 'rotor', m: 'interno', x: -0.27, r: 0.165, rIn: 0.06, n: 36, esp: 0.022 }, { t: 'cil', m: 'interno', a: [-0.27, 0, 0], b: [0.44, 0, 0], r: 0.018 }] };
  P.carcaca_tl = { casca: 1, quente: 1, exp: [-0.3, 0.1, 0], g: [{ t: 'rev', m: 'quente', pts: [[-0.22, 0.232], [-0.25, 0.212], [-0.32, 0.212]] }] };
  P.escape = { casca: 1, quente: 1, exp: [-0.4, 0.05, 0], g: [{ t: 'rev', m: 'quente', pts: [[-0.32, 0.19], [-0.38, 0.17], [-0.465, 0.205]] }] };
  P.ignitor = { exp: [0, 0.2, 0.25], g: [{ t: 'cil', m: 'ele', a: [-0.05, 0.21, 0.18], b: [-0.05, 0.26, 0.22], r: 0.012 }, { t: 'cil', m: 'ele', a: [-0.05, 0.21, -0.18], b: [-0.05, 0.26, -0.22], r: 0.012 }, { t: 'caixa', m: 'ele', s: [0.1, 0.06, 0.07], p: [0.05, -0.32, 0.18] }] };
  P.termopares = { exp: [-0.1, 0.36, 0.1], g: [{ t: 'toro', m: 'ele', x: -0.2, R: 0.29, r: 0.006 }, ...[0.785, 2.356, 3.927, 5.498].map((a) => ({ t: 'cil', m: 'escuro', a: [-0.2, 0.28 * Math.cos(a), 0.28 * Math.sin(a)], b: [-0.2, 0.31 * Math.cos(a), 0.31 * Math.sin(a)], r: 0.008 }))] };
  P.gerador = { exp: [0.1, -0.2, 0.3], g: [{ t: 'cil', m: 'ele', a: [0.26, -0.24, 0.22], b: [0.06, -0.24, 0.22], r: 0.07, seg: 20 }] };
  P.controle_comb = { exp: [0.1, -0.3, -0.25], g: [{ t: 'caixa', m: 'comb', s: [0.13, 0.11, 0.1], p: [0.3, -0.38, -0.12] }, { t: 'tubo', m: 'mangueira', r: 0.01, pts: [[0.25, -0.36, -0.15], [0.1, -0.25, -0.26], [-0.09, -0.12, -0.3], [-0.09, 0, -0.3]] }] };
  P.oleo = { exp: [0.15, -0.3, 0.3], g: [{ t: 'cil', m: 'oleo', a: [0.4, -0.3, 0.17], b: [0.4, -0.38, 0.17], r: 0.035 }, { t: 'cil', m: 'ele', a: [0.3, -0.34, 0.02], b: [0.3, -0.39, 0.02], r: 0.012 }, { t: 'tubo', m: 'mangueira', r: 0.01, pts: [[0.4, -0.34, 0.17], [0.15, -0.3, 0.24], [-0.15, -0.22, 0.22], [-0.22, -0.15, 0.15]] }] };
  P.ecu = { exp: [0, -0.35, 0], g: [{ t: 'caixa', m: 'ele', s: [0.2, 0.07, 0.28], p: [-0.06, -0.45, 0] }, { t: 'tubo', m: 'ele', r: 0.008, pts: [[0.0, -0.42, 0.1], [0.15, -0.4, -0.05], [0.28, -0.4, -0.1]] }] };
  P.suportes = { exp: [0, -0.3, 0], g: [1, -1].flatMap((s) => [{ t: 'caixa', m: 'suporte', s: [0.04, 0.14, 0.04], p: [0.3, -0.12, 0.2 * s] }, { t: 'caixa', m: 'suporte', s: [0.04, 0.04, 0.1], p: [-0.24, -0.25, 0.16 * s] }]) };
  return { partes: P, anel: { x: -0.2, R: 0.3 }, jatos: [[[-0.465, 0, 0], [-0.78, 0, 0], 0.19]], faisca: [-0.05, 0.27, 0.22], vista: { pos: [1.5, 0.9, 1.8], alvo: [-0.02, -0.02, 0] } };
}

const MOLDES = { m250, pw200, arrius };

/* =====================================================================
   Monta o motor: cada peça vira um Group (com material próprio, para cortar, colorir e explodir)
   ===================================================================== */
export function construirMotor(def) {
  const molde = MOLDES[def.arquitetura](def.opcoes || {});
  const raiz = new THREE.Group(); raiz.scale.setScalar(def.escala || 1);
  const pecas = {}; const malhas = [];
  for (const id in molde.partes) {
    const mp = molde.partes[id], info = def.partes[id] || { n: id };
    const grupo = new THREE.Group(); grupo.userData = { id, exp: new THREE.Vector3(...(mp.exp || [0, 0, 0])), base: new THREE.Vector3() };
    const mats = {};
    for (const p of mp.g) {
      const nomeMat = p.m || 'casca';
      const mat = mats[nomeMat] ??= material(nomeMat);
      const obj = malha(p);
      obj.traverse((o) => { if (o.isMesh) { o.material = mat; o.userData.peca = id; malhas.push(o); } });
      grupo.add(obj);
    }
    // as peças que giram ficam num subgrupo centrado no eixo X
    if (mp.eixo) { // peça que gira fora do eixo do motor: o grupo fica centrado no próprio eixo
      for (const ch of grupo.children) { ch.position.y -= mp.eixo[0]; ch.position.z -= mp.eixo[1]; }
      grupo.position.set(0, mp.eixo[0], mp.eixo[1]);
    }
    grupo.userData.base = grupo.position.clone();
    const peca = { id, info, grupo, mats: Object.values(mats), casca: !!mp.casca, quente: !!mp.quente, gira: mp.gira || null };
    for (const m of peca.mats) { m.userData.base = { cor: m.color.getHex(), em: m.emissive.getHex() }; }
    pecas[id] = peca; raiz.add(grupo);
  }
  raiz.updateMatrixWorld(true);
  for (const id in pecas) {
    const cx = new THREE.Box3().setFromObject(pecas[id].grupo);
    pecas[id].caixa = cx; pecas[id].centro = cx.getCenter(new THREE.Vector3());
  }
  return { raiz, pecas, malhas, anel: molde.anel, vista: molde.vista, jatos: molde.jatos, faisca: molde.faisca };
}
