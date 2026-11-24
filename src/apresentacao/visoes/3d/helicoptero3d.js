// HeliSense 3D – modelos 3D procedurais simplificados dos helicópteros (ilustrativos, não são desenho de engenharia).
// Eixos: +X nariz, +Y cima, +Z lado direito. Unidades ~ metros. Rotor principal em x = 0.
// Bell 429: geometria original do manual. Bell 505 / 206 / 407: mesma técnica (loft por seções + regiões),
// com proporções tiradas das dimensões públicas e de fotos de referência de cada modelo.
import * as THREE from 'three';

/* =====================================================================
   Ferramentas comuns (materiais, primitivas, loft e "pele" por regiões)
   ===================================================================== */
function oficina(cores = {}) {
  const raiz = new THREE.Group();
  const partes = {};   // id do componente -> malhas
  const malhas = [];
  const rotores = [];  // { obj, eixo, vel }
  const std = (cor, o = {}) => new THREE.MeshStandardMaterial({ color: cor, roughness: 0.62, metalness: 0.08, side: THREE.DoubleSide, ...o });
  const M = {
    casca: std(cores.casca ?? 0xdfe3e8), casca2: std(cores.casca2 ?? 0xcfd5dc), vidro: std(0x18232e, { transparent: true, opacity: 0.45, roughness: 0.1, metalness: 0.5 }),
    metal: std(0x8d949e, { metalness: 0.55, roughness: 0.4 }), escuro: std(0x3b4149, { metalness: 0.4 }), pa: std(cores.pa ?? 0xc4cad1),
    interno: std(0x9aa2ac), assento: std(0x66707c), tanque: std(0xb5935a), hid: std(0x4f93bd), ele: std(0x6aa878), fogo: std(0xc4524e),
    comando: std(0xd9b44a), eixo: std(0xa9834f, { metalness: 0.5 }), motor: std(0x7d858f, { metalness: 0.6, roughness: 0.35 }),
    luzR: std(0xff4a4a, { emissive: 0x7a1010 }), luzG: std(0x4aff7a, { emissive: 0x0f6a25 }), luzW: std(0xffffff, { emissive: 0x777777 })
  };
  for (const papel in M) M[papel].userData.papel = papel; // usado pelo acabamento realista (realismo.js)
  const matLinha = new THREE.LineBasicMaterial({ color: 0x586270, transparent: true, opacity: 0.6 });

  function add(id, malha, pai = raiz) {
    malha.userData.comp = id; malha.userData.base = malha.material;
    (partes[id] ??= []).push(malha); malhas.push(malha); pai.add(malha); return malha;
  }
  const V = (a) => new THREE.Vector3(a[0], a[1], a[2]);
  function caixa(sx, sy, sz, pos, mat) { const m = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), mat); m.position.set(...pos); return m; }
  function cil(a, b, r, mat, seg = 28, aberto = false, r2) {
    const A = V(a), B = V(b), m = new THREE.Mesh(new THREE.CylinderGeometry(r2 ?? r, r, A.distanceTo(B), seg, 1, aberto), mat);
    m.position.copy(A).add(B).multiplyScalar(0.5);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.clone().sub(A).normalize()); return m;
  }
  function esfera(r, pos, mat, esc) { const m = new THREE.Mesh(new THREE.SphereGeometry(r, 32, 22), mat); m.position.set(...pos); if (esc) m.scale.set(...esc); return m; }
  const lado = (s, a, b) => (s > 0 ? [a, b] : [-b, -a]);

  // ---------- Superfície por seções (loft com superelipse) ----------
  function loft(keys) { // [x, yCentro, meiaLargura, meiaAltura, expoente]
    const N = keys.length;
    const cr = (a, b, c, d, t) => { const t2 = t * t, t3 = t2 * t; return 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3); };
    const K = (j) => keys[Math.max(0, Math.min(N - 1, j))];
    function em(u) {
      u = Math.max(0, Math.min(N - 1, u)); const i = Math.min(Math.floor(u), N - 2), t = u - i, o = [];
      for (let c = 0; c < 5; c++) o.push(cr(K(i - 1)[c], K(i)[c], K(i + 1)[c], K(i + 2)[c], t));
      o[2] = Math.max(o[2], 0.004); o[3] = Math.max(o[3], 0.004); o[4] = Math.max(o[4], 2); return o;
    }
    function uDeX(x) { let lo = 0, hi = N - 1; for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2; if (em(m)[0] > x) lo = m; else hi = m; } return (lo + hi) / 2; }
    function P(u, th, off = 0) {
      const [x, yc, hw, hh, n] = em(u), c = Math.cos(th), s = Math.sin(th), e = 2 / n;
      return new THREE.Vector3(x, yc + (hh + off) * Math.sign(c) * Math.abs(c) ** e, (hw + off) * Math.sign(s) * Math.abs(s) ** e);
    }
    function normal(u, th) {
      const e = 1e-3, p = P(u, th), du = P(u + e, th).sub(P(u - e, th)), dt = P(u, th + e).sub(P(u, th - e));
      const n = new THREE.Vector3().crossVectors(dt, du), r = new THREE.Vector3(0, p.y - em(u)[1], p.z);
      if (n.lengthSq() < 1e-14) return r.lengthSq() > 0 ? r.normalize() : new THREE.Vector3(1, 0, 0);
      n.normalize(); if (n.dot(r) < 0) n.negate(); return n;
    }
    function retalho(b, x0, x1, a0, a1) {
      const u0 = uDeX(x0), u1 = uDeX(x1), su = Math.max(3, Math.ceil((u1 - u0) * 18)), sa = Math.max(3, Math.ceil((a1 - a0) / 3)), base = b.pos.length / 3;
      for (let i = 0; i <= su; i++) for (let j = 0; j <= sa; j++) {
        const u = u0 + (u1 - u0) * i / su, th = (a0 + (a1 - a0) * j / sa) * Math.PI / 180, p = P(u, th), n = normal(u, th);
        b.pos.push(p.x, p.y, p.z); b.nor.push(n.x, n.y, n.z); (b.uv ??= []).push(p.x * 0.42, th / Math.PI * 1.6); // UV para a textura de painéis
      }
      for (let i = 0; i < su; i++) for (let j = 0; j < sa; j++) { const a = base + i * (sa + 1) + j, c = a + sa + 1; b.idx.push(a, c, a + 1, a + 1, c, c + 1); }
    }
    return { keys, uDeX, P, retalho, xMax: keys[0][0], xMin: keys[N - 1][0] };
  }

  // Divide a superfície em células pelas bordas das regiões e entrega cada célula ao seu dono (componente + material)
  function pele(L, regioes, padrao) {
    const lim = (x) => Math.max(L.xMin, Math.min(L.xMax, x));
    const xs = new Set([L.xMax, L.xMin]), as = new Set([-180, 180]);
    for (const r of regioes) { xs.add(lim(r.x[0])); xs.add(lim(r.x[1])); as.add(r.a[0]); as.add(r.a[1]); }
    const X = [...xs].sort((a, b) => b - a), A = [...as].sort((a, b) => a - b), baldes = new Map();
    for (let i = 0; i < X.length - 1; i++) for (let j = 0; j < A.length - 1; j++) {
      const cx = (X[i] + X[i + 1]) / 2, ca = (A[j] + A[j + 1]) / 2;
      const r = regioes.find((r) => cx < r.x[0] && cx > r.x[1] && ca > r.a[0] && ca < r.a[1]) || padrao;
      if (!r) continue;
      const k = r.id + '|' + r.mat; if (!baldes.has(k)) baldes.set(k, { r, pos: [], nor: [], idx: [] });
      L.retalho(baldes.get(k), X[i], X[i + 1], A[j], A[j + 1]);
    }
    for (const b of baldes.values()) {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(b.pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(b.nor, 3)); if (b.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(b.uv, 2)); g.setIndex(b.idx);
      add(b.r.id, new THREE.Mesh(g, M[b.r.mat]));
    }
    for (const r of regioes) if (r.contorno) {
      const pts = [], n = 20, rad = Math.PI / 180, u0 = L.uDeX(r.x[0]), u1 = L.uDeX(r.x[1]), [a0, a1] = r.a;
      for (let i = 0; i <= n; i++) pts.push(L.P(u0 + (u1 - u0) * i / n, a0 * rad, 0.005));
      for (let i = 0; i <= n; i++) pts.push(L.P(u1, (a0 + (a1 - a0) * i / n) * rad, 0.005));
      for (let i = 0; i <= n; i++) pts.push(L.P(u1 + (u0 - u1) * i / n, a1 * rad, 0.005));
      for (let i = 0; i <= n; i++) pts.push(L.P(u0, (a1 + (a0 - a1) * i / n) * rad, 0.005));
      raiz.add(new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(pts), matLinha));
    }
  }
  return { raiz, partes, malhas, rotores, M, std, matLinha, add, V, caixa, cil, esfera, lado, loft, pele, vista: null };
}

/* =====================================================================
   Bell 429 GlobalRanger (geometria original do manual)
   ===================================================================== */
function construir429(k) {
  const { raiz, M, std, add, caixa, cil, esfera, lado, loft, pele } = k;
  // ---------- Fuselagem + cone de cauda ----------
  const fus = loft([
    [3.30, 1.05, 0.03, 0.03, 2], [3.18, 1.05, 0.30, 0.24, 2.1], [2.95, 1.08, 0.55, 0.42, 2.2], [2.55, 1.15, 0.78, 0.62, 2.4],
    [2.00, 1.25, 0.96, 0.78, 2.6], [1.40, 1.36, 1.06, 0.88, 2.8], [0.60, 1.42, 1.10, 0.93, 2.9], [-0.50, 1.45, 1.10, 0.95, 2.9],
    [-1.50, 1.47, 1.07, 0.94, 2.8], [-2.30, 1.52, 0.98, 0.88, 2.6], [-3.00, 1.63, 0.78, 0.70, 2.4], [-3.60, 1.78, 0.50, 0.47, 2.2],
    [-4.20, 1.92, 0.30, 0.29, 2], [-6.00, 2.02, 0.20, 0.20, 2], [-7.90, 2.10, 0.13, 0.13, 2], [-8.30, 2.12, 0.05, 0.05, 2]
  ]);
  const reg = [
    { x: [3.31, 2.6], a: [-180, 180], id: 'nariz', mat: 'casca' },
    { x: [2.6, 1.8], a: [-80, 80], id: 'parabrisa', mat: 'vidro', contorno: 1 }
  ];
  for (const s of [1, -1]) {
    const S = s > 0 ? 'R' : 'L';
    reg.push(
      { x: [2.55, 2.1], a: lado(s, 115, 158), id: 'parabrisa', mat: 'vidro', contorno: 1 },
      { x: [1.68, 0.82], a: lado(s, 36, 90), id: 'porta_trip_' + S, mat: 'vidro', contorno: 1 },
      { x: [1.78, 0.72], a: lado(s, 28, 150), id: 'porta_trip_' + S, mat: 'casca2', contorno: 1 },
      { x: [0.52, -0.48], a: lado(s, 38, 88), id: 'porta_pax_' + S, mat: 'vidro', contorno: 1 },
      { x: [0.66, -0.62], a: lado(s, 30, 150), id: 'porta_pax_' + S, mat: 'casca2', contorno: 1 },
      { x: [-0.78, -1.5], a: lado(s, 42, 86), id: 'janelas', mat: 'vidro', contorno: 1 },
      { x: [-2.35, -3.55], a: lado(s, 55, 180), id: 'porta_bag', mat: 'casca2', contorno: 1 }
    );
  }
  reg.push({ x: [-2.35, -4.2], a: [-180, 180], id: 'fus_traseira', mat: 'casca' }, { x: [-4.2, -8.31], a: [-180, 180], id: 'cone_cauda', mat: 'casca' });
  pele(fus, reg, { id: 'fuselagem', mat: 'casca' });

  // ---------- Capôs superiores ----------
  const capo = loft([
    [1.55, 2.20, 0.04, 0.04, 2], [1.20, 2.28, 0.40, 0.22, 2.2], [0.50, 2.38, 0.68, 0.36, 2.4], [-0.60, 2.44, 0.78, 0.42, 2.5],
    [-1.80, 2.43, 0.78, 0.42, 2.5], [-2.80, 2.33, 0.58, 0.33, 2.3], [-3.50, 2.18, 0.30, 0.20, 2], [-4.00, 2.05, 0.10, 0.10, 2]
  ]);
  pele(capo, [
    { x: [1.56, 0.45], a: [-100, 100], id: 'carenagem_diant', mat: 'casca', contorno: 1 },
    { x: [0.45, -0.7], a: [-100, 100], id: 'carenagem_trans', mat: 'casca2', contorno: 1 },
    { x: [-0.7, -2.9], a: [-100, 100], id: 'carenagem_motor', mat: 'casca', contorno: 1 },
    { x: [-2.9, -4.01], a: [-100, 100], id: 'carenagem_escape', mat: 'casca2', contorno: 1 }
  ], null);

  // ---------- Interior: piso, painel, assentos, comandos ----------
  add('piso', caixa(4.65, 0.03, 1.4, [0.03, 0.835, 0], M.interno));
  add('painel', caixa(0.22, 0.38, 1.2, [2.2, 1.48, 0], M.escuro)).rotation.z = 0.25;
  add('painel', caixa(0.42, 0.05, 1.3, [2.14, 1.71, 0], M.escuro));
  add('painel', caixa(0.7, 0.3, 0.28, [1.78, 1.0, 0], M.escuro));
  function assento(id, x, z, dir) {
    add(id, caixa(0.46, 0.12, 0.46, [x, 1.1, z], M.assento));
    add(id, caixa(0.1, 0.62, 0.46, [x - 0.22 * dir, 1.42, z], M.assento));
    add(id, caixa(0.3, 0.2, 0.3, [x, 0.95, z], M.escuro));
  }
  for (const z of [0.45, -0.45]) assento('assentos_trip', 1.3, z, 1);
  for (const z of [-0.6, 0, 0.6]) { assento('assentos_pax', 0.3, z, -1); assento('assentos_pax', -1.2, z, 1); }
  for (const z of [0.45, -0.45]) {
    add('comandos', cil([1.78, 0.85, z], [1.66, 1.42, z], 0.02, M.comando));           // cíclico
    add('comandos', cil([1.05, 0.9, z - 0.3], [1.45, 1.18, z - 0.3], 0.02, M.comando)); // coletivo
    for (const d of [0.1, -0.1]) add('comandos', caixa(0.06, 0.12, 0.08, [2.32, 0.98, z + d], M.comando)); // pedais
    add('comandos', cil([1.78, 0.72, z], [0.85, 0.72, 0], 0.018, M.comando));           // tubos sob o piso
  }
  add('comandos', cil([0.85, 0.72, 0], [0.85, 2.2, 0], 0.02, M.comando));               // subida para o teto
  add('comandos', caixa(0.2, 0.08, 0.5, [0.95, 0.72, 0], M.comando));                   // mixer / jackshaft

  // ---------- Nariz: aviônicos, bateria, pitot ----------
  add('avionica', caixa(0.3, 0.26, 0.34, [2.85, 1.1, 0.24], M.ele));
  add('avionica', caixa(0.2, 0.2, 0.2, [2.72, 1.3, 0.05], M.ele));
  add('bateria', caixa(0.3, 0.24, 0.3, [2.85, 1.02, -0.26], std(0x3f7fbf)));
  for (const z of [0.33, -0.33]) add('pitot', cil([3.02, 1.3, z], [3.32, 1.3, z], 0.013, M.metal, 8));
  for (const z of [1.07, -1.07]) add('pitot', cil([1.92, 1.25, z * 0.9], [1.92, 1.25, z * 0.93], 0.03, M.metal, 10));

  // ---------- Combustível, hidráulico, transmissão, mastro ----------
  for (const x of [0.33, -0.4, -1.13]) add('combustivel', caixa(0.68, 0.22, 1.2, [x, 0.7, 0], M.tanque));
  for (const z of [0.18, -0.18]) add('hidraulico', caixa(0.28, 0.2, 0.2, [0.75, 2.36, z], M.hid));
  for (const ang of [0, 2.1, 4.2]) { const x = 0.26 * Math.cos(ang), z = 0.26 * Math.sin(ang); add('hidraulico', cil([x, 2.6, z], [x, 2.93, z], 0.035, M.hid, 10)); }
  add('transmissao', cil([0, 2.21, 0], [0, 2.63, 0], 0.34, M.metal, 24));
  add('transmissao', caixa(0.5, 0.25, 0.5, [-0.25, 2.38, 0], M.metal));
  for (const z of [0.42, -0.42]) {
    add('suporte_trans', caixa(0.6, 0.07, 0.1, [0, 2.18, z], M.escuro));
    for (const x of [0.2, -0.2]) add('suporte_trans', cil([x, 2.2, z], [x, 2.36, z], 0.05, M.escuro, 10));
  }
  add('mastro', cil([0, 2.6, 0], [0, 3.3, 0], 0.055, M.metal, 16));
  add('swash', cil([0, 2.93, 0], [0, 2.99, 0], 0.25, M.escuro, 24));
  add('swash', cil([0, 2.8, 0], [0, 2.93, 0], 0.1, M.escuro, 16));

  // ---------- Rotor principal (grupo giratório) ----------
  const rotorP = new THREE.Group(); rotorP.position.set(0, 3.3, 0); rotorP.rotation.y = 0.5; raiz.add(rotorP);
  add('cubo_rp', cil([0, -0.07, 0], [0, 0.07, 0], 0.2, M.metal, 24), rotorP);
  add('cubo_rp', cil([0, 0.07, 0], [0, 0.11, 0], 0.3, M.casca2, 24), rotorP);
  add('swash', cil([0, -0.3, 0], [0, -0.25, 0], 0.27, M.metal, 24), rotorP);
  for (let i = 0; i < 4; i++) {
    const g = new THREE.Group(); g.rotation.y = i * Math.PI / 2; rotorP.add(g);
    add('cubo_rp', caixa(0.75, 0.035, 0.17, [0.4, -0.02, 0], M.escuro), g);        // yoke
    add('cubo_rp', caixa(0.42, 0.1, 0.16, [0.62, 0, 0], M.metal), g);              // grip
    add('cubo_rp', cil([0.35, 0, 0.12], [0.7, 0, 0.14], 0.03, M.escuro, 8), g);    // amortecedor lead-lag
    add('swash', cil([0.27, -0.27, 0.06], [0.5, -0.03, 0.12], 0.014, M.metal, 8), g); // pitch link
    const pa = add('pas_rp', caixa(4.7, 0.03, 0.28, [3.16, 0, 0], M.pa), g); pa.rotation.z = -0.012;
  }

  // ---------- Motores e acessórios ----------
  for (const s of [1, -1]) {
    const id = s > 0 ? 'motor_2' : 'motor_1', z = 0.38 * s;
    add(id, cil([-1.1, 2.4, z], [-2.3, 2.4, z], 0.2, M.motor, 20));
    add(id, cil([-0.98, 2.4, z], [-1.1, 2.4, z], 0.13, M.motor, 16));
    add(id, cil([-2.3, 2.4, z], [-2.5, 2.42, z], 0.15, M.escuro, 16));
    add('eixo_motor', cil([-0.98, 2.4, z], [-0.3, 2.42, 0.2 * s], 0.035, M.eixo, 10));
    add('gerador', cil([-1.05, 2.21, z], [-1.32, 2.21, z], 0.075, M.ele, 12));
    add('escapamento', cil([-2.45, 2.45, 0.42 * s], [-3.1, 2.56, 0.67 * s], 0.12, M.escuro, 16, true));
    add('entrada_ar', esfera(1, [-0.95, 2.5, 0.745 * s], M.escuro, [0.3, 0.16, 0.035]));
  }
  // Radiador de óleo e ventiladores
  add('radiador_oleo', caixa(0.4, 0.2, 0.62, [-3.2, 2.37, 0], M.metal));
  for (const x of [-2.92, -3.48]) add('radiador_oleo', cil([x, 2.36, 0], [x - 0.1, 2.355, 0], 0.13, M.escuro, 18));

  // ---------- Acionamento do rotor de cauda ----------
  const trechos = [[-0.35, 2.5], [-2.7, 2.37], [-3.7, 2.32], [-5.8, 2.29], [-7.85, 2.3]];
  for (let i = 0; i < trechos.length - 1; i++) {
    add('eixo_rc', cil([trechos[i][0], trechos[i][1], 0], [trechos[i + 1][0], trechos[i + 1][1], 0], 0.03, M.eixo, 10));
    add('eixo_rc', cil([trechos[i + 1][0] + 0.03, trechos[i + 1][1], 0], [trechos[i + 1][0] - 0.03, trechos[i + 1][1], 0], 0.06, M.metal, 12)); // acoplamento
  }
  add('eixo_rc', caixa(0.1, 0.1, 0.16, [-5.8, 2.25, 0], M.escuro));   // hanger
  add('caixa_rc', caixa(0.26, 0.24, 0.2, [-8.0, 2.3, 0], M.metal));
  add('caixa_rc', cil([-8.0, 2.3, 0], [-8.0, 2.3, -0.32], 0.045, M.metal, 12));
  const rotorC = new THREE.Group(); rotorC.position.set(-8.0, 2.3, -0.36); raiz.add(rotorC);
  add('rotor_cauda', cil([0, 0, -0.06], [0, 0, 0.06], 0.07, M.metal, 16), rotorC);
  for (const ang of [0.25, 1.4, 0.25 + Math.PI, 1.4 + Math.PI]) {
    const g = new THREE.Group(); g.rotation.z = ang; rotorC.add(g);
    add('rotor_cauda', caixa(0.14, 0.78, 0.02, [0, 0.44, ang > 1 && ang < 3 || ang > 4.4 ? 0.03 : -0.03], M.pa), g);
  }
  // Controle direcional
  add('comandos_rc', cil([-2.6, 1.75, 0.1], [-4.2, 1.95, 0], 0.018, M.comando, 8));
  add('comandos_rc', cil([-4.2, 1.95, 0], [-7.85, 2.12, 0], 0.018, M.comando, 8));
  add('comandos_rc', caixa(0.4, 0.12, 0.14, [-3.0, 1.8, 0.1], M.hid));
  add('comandos_rc', cil([-7.85, 2.12, 0], [-8.0, 2.3, -0.22], 0.015, M.comando, 8));

  // ---------- Fuselagem traseira: extintor, aviônicos traseiros ----------
  add('extintor', esfera(0.11, [-2.9, 1.9, -0.3], M.fogo));
  add('extintor', cil([-2.9, 1.98, -0.3], [-2.5, 2.25, -0.2], 0.012, M.fogo, 6));
  add('avionica_tras', caixa(0.32, 0.2, 0.26, [-3.15, 1.6, -0.22], M.ele));
  add('avionica_tras', caixa(0.16, 0.1, 0.1, [-3.35, 1.78, 0.22], std(0xe08a2e)));

  // ---------- Empenagem ----------
  add('estabilizador', caixa(0.5, 0.05, 2.5, [-6.3, 2.02, 0], M.casca));
  for (const z of [1.25, -1.25]) add('estabilizador', caixa(0.56, 0.62, 0.04, [-6.33, 2.05, z], M.casca2));
  const perfil = new THREE.Shape();
  perfil.moveTo(-7.65, 2.2); perfil.lineTo(-8.3, 3.85); perfil.lineTo(-8.7, 3.85); perfil.lineTo(-8.38, 2.12);
  perfil.lineTo(-8.6, 1.3); perfil.lineTo(-8.35, 1.3); perfil.lineTo(-7.85, 2.0); perfil.closePath();
  const gDer = new THREE.ExtrudeGeometry(perfil, { depth: 0.06, bevelEnabled: false }); gDer.translate(0, 0, -0.03);
  add('deriva', new THREE.Mesh(gDer, M.casca));
  add('deriva', cil([-8.45, 1.32, 0], [-8.72, 1.04, 0], 0.016, M.metal, 8));

  // ---------- Trem de pouso de esquis ----------
  for (const z of [1.15, -1.15]) {
    add('esquis', cil([1.95, 0.05, z], [-1.75, 0.05, z], 0.045, M.metal, 12));
    add('esquis', cil([1.95, 0.05, z], [2.28, 0.2, z], 0.045, M.metal, 12));
    add('esquis', caixa(0.55, 0.03, 0.18, [0.75, 0.3, z * 0.9], M.escuro));
  }
  for (const [id, x] of [['tubo_diant', 1.25], ['tubo_tras', -1.05]]) {
    const curva = new THREE.CatmullRomCurve3([[-1.15, 0.05], [-0.98, 0.3], [-0.55, 0.49], [0, 0.52], [0.55, 0.49], [0.98, 0.3], [1.15, 0.05]].map(([z, y]) => new THREE.Vector3(x, y, z)));
    add(id, new THREE.Mesh(new THREE.TubeGeometry(curva, 32, 0.04, 10), M.metal));
  }

  // ---------- Luzes e antenas ----------
  add('luzes', esfera(0.07, [2.3, 0.5, 0], M.luzW));
  add('luzes', esfera(0.05, [-8.5, 3.9, 0], M.luzR));
  add('luzes', esfera(0.035, [-8.72, 3.0, 0], M.luzW));
  add('luzes', esfera(0.035, [-6.08, 2.05, 1.28], M.luzG));
  add('luzes', esfera(0.035, [-6.08, 2.05, -1.28], M.luzR));
  add('antenas', caixa(0.25, 0.2, 0.02, [0.4, 0.4, 0], M.escuro));
  add('antenas', caixa(0.22, 0.18, 0.02, [-1.75, 0.43, 0], M.escuro));
  add('antenas', caixa(0.2, 0.22, 0.02, [-5.2, 1.66, 0], M.escuro));
  for (const z of [0.26, -0.26]) add('antenas', cil([1.0, 2.48, z], [0.84, 2.95, z * 1.15], 0.012, M.escuro, 6));

  k.rotores.push({ obj: rotorP, eixo: 'y', vel: 5 }, { obj: rotorC, eixo: 'z', vel: 22 });
  k.vista = { pos: [9.5, 5.2, 12.5], alvo: [-1.6, 1.8, 0], raio: 5.3 };
}

/* =====================================================================
   Monomotores Bell (505, 206, 407) – construtor paramétrico
   ===================================================================== */
const FORMAS = {
  // Bell 206B-3 JetRanger: rotor de 2 pás Ø 10,16 m, cabine estreita, 2 escapes verticais, estabilizador com plaquinhas
  '206': {
    cores: { casca: 0xeceff2, casca2: 0xb53a35 },
    fus: [[2.50, 1.00, 0.03, 0.03, 2], [2.40, 1.02, 0.26, 0.24, 2.1], [2.20, 1.06, 0.45, 0.42, 2.2], [1.85, 1.13, 0.58, 0.56, 2.4], [1.40, 1.19, 0.64, 0.64, 2.6],
      [0.80, 1.22, 0.65, 0.67, 2.8], [0.00, 1.22, 0.65, 0.67, 2.8], [-0.70, 1.24, 0.63, 0.65, 2.7], [-1.25, 1.32, 0.55, 0.57, 2.5], [-1.80, 1.48, 0.38, 0.40, 2.3],
      [-2.30, 1.62, 0.25, 0.26, 2.1], [-4.00, 1.72, 0.19, 0.19, 2], [-6.40, 1.84, 0.12, 0.12, 2], [-6.75, 1.86, 0.05, 0.05, 2]],
    nariz: 2.05, pbrisa: [2.05, 1.45], chin: [2.0, 1.6], trip: { v: [1.38, 0.62], p: [1.45, 0.5] }, pax: { v: [0.4, -0.45], p: [0.45, -0.6] },
    janela: null, bag: [-0.72, -1.22], bagLado: -1, trasX: [-0.62, -2.3], coneX: [-2.3, -6.76],
    capo: [[1.15, 1.86, 0.04, 0.04, 2], [0.90, 1.93, 0.30, 0.14, 2.2], [0.40, 2.02, 0.45, 0.24, 2.4], [-0.40, 2.06, 0.47, 0.28, 2.5], [-1.20, 2.06, 0.42, 0.28, 2.5],
      [-1.80, 2.00, 0.34, 0.24, 2.3], [-2.40, 1.90, 0.22, 0.16, 2.1], [-2.80, 1.80, 0.08, 0.06, 2]],
    capoX: [1.16, 0.55, -0.45, -1.75, -2.81],
    piso: { x: 0.3, y: 0.72, c: 3.1, l: 1.12 }, painel: { x: 1.72, y: 1.22, l: 1.05 },
    tripAss: { x: 0.95, zs: [0.32, -0.32] }, paxAssentos: [{ x: -0.3, zs: [-0.4, 0, 0.4] }],
    rotor: { y: 2.82, pas: 2, raio: 5.08, corda: 0.33 }, trans: { y0: 1.92, y1: 2.3, r: 0.27 },
    motor: { x0: -0.55, x1: -1.65, y: 2.08, r: 0.19 }, entrada: { x: -0.5, y: 2.16, z: 0.47 },
    escapes: [{ a: [-1.42, 2.1, 0.13], b: [-1.55, 2.5, 0.2], r: 0.085 }, { a: [-1.42, 2.1, -0.13], b: [-1.55, 2.5, -0.2], r: 0.085 }],
    radiador: { x: -2.15, y: 1.86 }, eixoRc: [[-1.7, 2.0], [-2.3, 1.9], [-4.0, 1.94], [-6.5, 2.0]],
    rc: { x: -6.55, y: 2.0, z: -0.24, raio: 0.83 }, caixaRc: { x: -6.55, y: 1.98 },
    estab: { x: -4.6, y: 1.73, meia: 0.98, corda: 0.42, placa: 0.28 },
    deriva: [[-6.05, 1.95], [-6.72, 2.85], [-7.02, 2.85], [-6.84, 1.86], [-7.02, 1.25], [-6.82, 1.25], [-6.42, 1.74]],
    esquis: { xF: 1.55, xT: -1.65, z: 0.95, tubos: [0.85, -0.75], topo: 0.56 },
    comb: { x: -0.62, y: 0.95, s: [0.5, 0.42, 1.0] }, bateria: { x: 2.05, y: 0.98 }, avionica: { x: 2.0, y: 1.08 }, elt: { x: -1.05, y: 1.2 },
    pitot: { x: 1.15, y: 1.9 }, hid: { x: 0.62, y: 1.96 },
    vista: { pos: [9.5, 5.2, 12.5], alvo: [-1.9, 1.6, 0], raio: 4.9 }
  },
  // Bell 407 / 407GXi: rotor de 4 pás Ø 10,67 m, cabine larga e longa (porta dupla à esquerda), escape único
  '407': {
    cores: { casca: 0x2c4f86, casca2: 0x24426f, pa: 0x5d6570 },
    fus: [[2.75, 1.00, 0.03, 0.03, 2], [2.62, 1.03, 0.30, 0.26, 2.1], [2.40, 1.08, 0.50, 0.45, 2.2], [2.00, 1.16, 0.66, 0.62, 2.4], [1.50, 1.24, 0.72, 0.71, 2.7],
      [0.70, 1.28, 0.73, 0.74, 2.9], [-0.40, 1.29, 0.73, 0.74, 2.9], [-1.20, 1.31, 0.70, 0.71, 2.8], [-1.75, 1.39, 0.60, 0.62, 2.6], [-2.25, 1.53, 0.42, 0.44, 2.3],
      [-2.70, 1.66, 0.27, 0.27, 2.1], [-4.40, 1.78, 0.20, 0.20, 2], [-7.00, 1.90, 0.12, 0.12, 2], [-7.35, 1.92, 0.05, 0.05, 2]],
    nariz: 2.3, pbrisa: [2.3, 1.65], chin: [2.25, 1.8], trip: { v: [1.6, 0.82], p: [1.68, 0.7] }, pax: { v: [0.55, -0.5], p: [0.6, -0.62], vL: [0.55, -0.95], pL: [0.6, -1.08] },
    janela: null, bag: [-1.25, -1.72], bagLado: 1, trasX: [-1.1, -2.7], coneX: [-2.7, -7.36],
    capo: [[1.25, 1.98, 0.04, 0.04, 2], [1.00, 2.05, 0.32, 0.15, 2.2], [0.45, 2.13, 0.50, 0.25, 2.4], [-0.50, 2.18, 0.52, 0.29, 2.5], [-1.50, 2.18, 0.46, 0.29, 2.5],
      [-2.20, 2.10, 0.36, 0.24, 2.3], [-2.80, 1.98, 0.22, 0.16, 2.1], [-3.20, 1.86, 0.08, 0.06, 2]],
    capoX: [1.26, 0.6, -0.5, -2.0, -3.21],
    piso: { x: 0.25, y: 0.72, c: 3.7, l: 1.28 }, painel: { x: 1.95, y: 1.26, l: 1.2 },
    tripAss: { x: 1.15, zs: [0.36, -0.36] }, paxAssentos: [{ x: 0.05, zs: [-0.4, 0.4], dir: -1 }, { x: -0.85, zs: [-0.45, 0, 0.45] }],
    rotor: { y: 3.05, pas: 4, raio: 5.33, corda: 0.27 }, trans: { y0: 2.02, y1: 2.45, r: 0.3 },
    motor: { x0: -0.65, x1: -1.9, y: 2.16, r: 0.22 }, entrada: { x: -0.6, y: 2.25, z: 0.53 },
    escapes: [{ a: [-1.75, 2.22, 0.06], b: [-2.12, 2.62, 0.12], r: 0.14 }],
    radiador: { x: -2.5, y: 1.98 }, eixoRc: [[-1.95, 2.1], [-2.7, 2.0], [-4.4, 2.0], [-7.15, 2.06]],
    rc: { x: -7.2, y: 2.06, z: -0.24, raio: 0.82 }, caixaRc: { x: -7.2, y: 2.03 },
    estab: { x: -5.5, y: 1.82, meia: 1.1, corda: 0.48, placa: 0.46 },
    deriva: [[-6.6, 2.0], [-7.3, 3.0], [-7.62, 3.0], [-7.4, 1.92], [-7.62, 1.3], [-7.4, 1.3], [-6.95, 1.84]],
    esquis: { xF: 1.85, xT: -1.9, z: 1.0, tubos: [1.0, -0.95], topo: 0.6 },
    comb: { x: -0.85, y: 0.78, s: [1.1, 0.24, 1.2] }, bateria: { x: 2.25, y: 1.0 }, avionica: { x: 2.2, y: 1.1 }, elt: { x: -1.55, y: 1.25 },
    pitot: { x: 1.3, y: 2.02 }, hid: { x: 0.7, y: 2.08 },
    vista: { pos: [9.5, 5.2, 12.5], alvo: [-2.0, 1.7, 0], raio: 5.2 }
  },
  // Bell 505 Jet Ranger X: rotor de 2 pás Ø 11,28 m, cabine alta de laterais planas, para-brisas grande, escape único traseiro
  '505': {
    cores: { casca: 0xc23a30, casca2: 0xa32f27, pa: 0x4a5059 },
    fus: [[2.65, 1.05, 0.03, 0.03, 2], [2.55, 1.07, 0.32, 0.30, 2.1], [2.32, 1.12, 0.54, 0.52, 2.3], [1.95, 1.19, 0.67, 0.65, 2.6], [1.40, 1.25, 0.71, 0.70, 3.0],
      [0.60, 1.27, 0.72, 0.71, 3.2], [-0.30, 1.27, 0.72, 0.71, 3.2], [-1.00, 1.30, 0.68, 0.68, 3.0], [-1.55, 1.40, 0.56, 0.56, 2.6], [-2.05, 1.55, 0.38, 0.38, 2.3],
      [-2.50, 1.66, 0.25, 0.25, 2.1], [-4.20, 1.76, 0.19, 0.19, 2], [-6.65, 1.88, 0.12, 0.12, 2], [-7.00, 1.90, 0.05, 0.05, 2]],
    nariz: 2.3, pbrisa: [2.3, 1.42], chin: [2.25, 1.6], trip: { v: [1.36, 0.72], p: [1.42, 0.6] }, pax: { v: [0.5, -0.55], p: [0.55, -0.68] },
    janela: null, bag: [-0.8, -1.45], bagLado: 1, trasX: [-0.75, -2.5], coneX: [-2.5, -7.01],
    capo: [[1.15, 1.95, 0.04, 0.04, 2], [0.90, 2.02, 0.32, 0.15, 2.2], [0.35, 2.10, 0.50, 0.25, 2.4], [-0.50, 2.14, 0.52, 0.28, 2.5], [-1.40, 2.13, 0.46, 0.28, 2.5],
      [-2.05, 2.06, 0.35, 0.23, 2.3], [-2.60, 1.95, 0.22, 0.15, 2.1], [-3.00, 1.84, 0.08, 0.06, 2]],
    capoX: [1.16, 0.5, -0.5, -1.85, -3.01],
    piso: { x: 0.3, y: 0.68, c: 3.3, l: 1.3 }, painel: { x: 1.85, y: 1.22, l: 1.2 },
    tripAss: { x: 1.05, zs: [0.35, -0.35] }, paxAssentos: [{ x: -0.35, zs: [-0.45, 0, 0.45] }],
    rotor: { y: 2.95, pas: 2, raio: 5.64, corda: 0.33 }, trans: { y0: 1.98, y1: 2.42, r: 0.28 },
    motor: { x0: -0.6, x1: -1.75, y: 2.12, r: 0.21 }, entrada: { x: -0.55, y: 2.2, z: 0.52 },
    escapes: [{ a: [-1.8, 2.16, 0.12], b: [-2.32, 2.44, 0.22], r: 0.12 }],
    radiador: { x: -2.3, y: 1.92 }, eixoRc: [[-1.8, 2.04], [-2.5, 1.94], [-4.2, 1.98], [-6.65, 2.04]],
    rc: { x: -6.7, y: 2.04, z: -0.23, raio: 0.78 }, caixaRc: { x: -6.7, y: 2.01 },
    estab: { x: -4.7, y: 1.78, meia: 1.0, corda: 0.45, placa: 0.42 },
    deriva: [[-6.0, 1.95], [-6.7, 2.85], [-7.0, 2.85], [-6.82, 1.9], [-7.0, 1.3], [-6.8, 1.3], [-6.4, 1.8]],
    esquis: { xF: 1.75, xT: -1.75, z: 1.0, tubos: [0.95, -0.85], topo: 0.6 },
    comb: { x: -0.4, y: 0.74, s: [1.0, 0.22, 1.2] }, bateria: { x: -1.35, y: 1.15 }, avionica: { x: 2.1, y: 1.12 }, elt: { x: -1.55, y: 1.3 },
    pitot: { x: 1.2, y: 1.98 }, hid: { x: 0.65, y: 2.03 },
    vista: { pos: [9.5, 5.2, 12.5], alvo: [-1.9, 1.6, 0], raio: 5.1 }
  }
};

function construirMono(k, F) {
  const { raiz, M, std, add, caixa, cil, esfera, lado, loft, pele } = k;

  // ---------- Fuselagem, portas, janelas e cone de cauda ----------
  const fus = loft(F.fus);
  const x0 = F.fus[0][0] + 0.01;
  const reg = [{ x: [x0, F.nariz], a: [-180, 180], id: 'nariz', mat: 'casca' }, { x: F.pbrisa, a: [-80, 80], id: 'parabrisa', mat: 'vidro', contorno: 1 }];
  for (const s of [1, -1]) {
    const S = s > 0 ? 'R' : 'L', pv = (s < 0 && F.pax.vL) || F.pax.v, pp = (s < 0 && F.pax.pL) || F.pax.p;
    reg.push(
      { x: F.chin, a: lado(s, 115, 158), id: 'parabrisa', mat: 'vidro', contorno: 1 },
      { x: F.trip.v, a: lado(s, 34, 92), id: 'porta_trip_' + S, mat: 'vidro', contorno: 1 },
      { x: F.trip.p, a: lado(s, 28, 150), id: 'porta_trip_' + S, mat: 'casca2', contorno: 1 },
      { x: pv, a: lado(s, 38, 90), id: 'porta_pax_' + S, mat: 'vidro', contorno: 1 },
      { x: pp, a: lado(s, 30, 150), id: 'porta_pax_' + S, mat: 'casca2', contorno: 1 });
    if (F.janela) reg.push({ x: F.janela, a: lado(s, 42, 86), id: 'janelas', mat: 'vidro', contorno: 1 });
    if (s === F.bagLado) reg.push({ x: F.bag, a: lado(s, 62, 150), id: 'porta_bag', mat: 'casca2', contorno: 1 });
  }
  // janelinha de teto/claraboia da cabine (representa as "janelas da cabine")
  reg.push({ x: [F.trip.v[0] - 0.05, F.trip.v[1] + 0.1], a: [-28, 28], id: 'janelas', mat: 'vidro', contorno: 1 });
  reg.push({ x: F.trasX, a: [-180, 180], id: 'fus_traseira', mat: 'casca' }, { x: F.coneX, a: [-180, 180], id: 'cone_cauda', mat: 'casca' });
  pele(fus, reg, { id: 'fuselagem', mat: 'casca' });

  // ---------- Carenagens superiores ----------
  const capo = loft(F.capo), cx = F.capoX;
  pele(capo, [
    { x: [cx[0], cx[1]], a: [-100, 100], id: 'carenagem_diant', mat: 'casca', contorno: 1 },
    { x: [cx[1], cx[2]], a: [-100, 100], id: 'carenagem_trans', mat: 'casca2', contorno: 1 },
    { x: [cx[2], cx[3]], a: [-100, 100], id: 'carenagem_motor', mat: 'casca', contorno: 1 },
    { x: [cx[3], cx[4]], a: [-100, 100], id: 'carenagem_escape', mat: 'casca2', contorno: 1 }
  ], null);

  // ---------- Interior ----------
  add('piso', caixa(F.piso.c, 0.03, F.piso.l, [F.piso.x, F.piso.y, 0], M.interno));
  add('painel', caixa(0.2, 0.34, F.painel.l, [F.painel.x, F.painel.y, 0], M.escuro)).rotation.z = 0.25;
  add('painel', caixa(0.36, 0.05, F.painel.l + 0.08, [F.painel.x - 0.05, F.painel.y + 0.21, 0], M.escuro));
  add('painel', caixa(0.5, 0.26, 0.24, [F.painel.x - 0.35, F.piso.y + 0.2, 0], M.escuro));
  const ys = F.piso.y;
  function assento(id, x, z, dir) {
    add(id, caixa(0.44, 0.11, 0.42, [x, ys + 0.3, z], M.assento));
    add(id, caixa(0.1, 0.58, 0.42, [x - 0.21 * dir, ys + 0.6, z], M.assento));
    add(id, caixa(0.28, 0.18, 0.28, [x, ys + 0.15, z], M.escuro));
  }
  for (const z of F.tripAss.zs) assento('assentos_trip', F.tripAss.x, z, 1);
  for (const f of F.paxAssentos) for (const z of f.zs) assento('assentos_pax', f.x, z, f.dir || 1);
  for (const z of F.tripAss.zs) {
    const xc = F.tripAss.x + 0.45;
    add('comandos', cil([xc, ys + 0.02, z], [xc - 0.1, ys + 0.55, z], 0.02, M.comando));                 // cíclico
    add('comandos', cil([F.tripAss.x - 0.25, ys + 0.08, z - 0.28], [F.tripAss.x + 0.12, ys + 0.33, z - 0.28], 0.02, M.comando)); // coletivo
    for (const d of [0.1, -0.1]) add('comandos', caixa(0.06, 0.12, 0.08, [F.painel.x + 0.12, ys + 0.12, z + d], M.comando));
    add('comandos', cil([xc, ys - 0.06, z], [F.hid.x + 0.1, ys - 0.06, 0], 0.016, M.comando));
  }
  add('comandos', cil([F.hid.x + 0.1, ys - 0.06, 0], [F.hid.x + 0.1, F.hid.y - 0.05, 0], 0.018, M.comando));
  add('comandos', caixa(0.18, 0.07, 0.42, [F.hid.x + 0.2, ys - 0.06, 0], M.comando));
  add('extintor', cil([F.tripAss.x + 0.05, ys + 0.03, 0], [F.tripAss.x + 0.05, ys + 0.33, 0], 0.045, M.fogo, 12));

  // ---------- Nariz, bateria, aviônicos, pitot ----------
  add('avionica', caixa(0.28, 0.22, 0.32, [F.avionica.x, F.avionica.y, 0.2], M.ele));
  add('avionica', caixa(0.18, 0.18, 0.18, [F.avionica.x - 0.12, F.avionica.y + 0.18, -0.05], M.ele));
  add('bateria', caixa(0.28, 0.22, 0.26, [F.bateria.x, F.bateria.y, F.bateria.x > 0 ? -0.22 : 0.25], std(0x3f7fbf)));
  add('pitot', cil([F.pitot.x, F.pitot.y, 0.12], [F.pitot.x, F.pitot.y + 0.16, 0.12], 0.012, M.metal, 8));
  add('pitot', cil([F.pitot.x, F.pitot.y + 0.16, 0.12], [F.pitot.x + 0.28, F.pitot.y + 0.16, 0.12], 0.012, M.metal, 8));
  add('avionica_tras', caixa(0.26, 0.16, 0.2, [F.elt.x, F.elt.y, -0.18], M.ele));
  add('avionica_tras', caixa(0.14, 0.09, 0.09, [F.elt.x - 0.15, F.elt.y + 0.14, 0.15], std(0xe08a2e)));

  // ---------- Combustível, hidráulico, transmissão e mastro ----------
  add('combustivel', caixa(F.comb.s[0], F.comb.s[1], F.comb.s[2], [F.comb.x, F.comb.y, 0], M.tanque));
  add('hidraulico', caixa(0.26, 0.18, 0.18, [F.hid.x, F.hid.y, 0.16], M.hid));
  add('hidraulico', cil([F.hid.x, F.hid.y + 0.09, 0.16], [F.hid.x, F.hid.y + 0.2, 0.16], 0.06, M.hid, 12));
  const T = F.trans, R = F.rotor;
  for (const ang of [0, 2.1, 4.2]) { const x = 0.24 * Math.cos(ang), z = 0.24 * Math.sin(ang); add('hidraulico', cil([x, T.y1 - 0.02, z], [x, T.y1 + 0.24, z], 0.03, M.hid, 10)); }
  add('transmissao', cil([0, T.y0, 0], [0, T.y1, 0], T.r, M.metal, 24));
  add('transmissao', caixa(0.42, 0.22, 0.42, [-0.22, T.y0 + 0.13, 0], M.metal));
  for (const z of [0.36, -0.36]) {
    add('suporte_trans', caixa(0.55, 0.06, 0.09, [0, T.y0 - 0.03, z], M.escuro));
    for (const x of [0.2, -0.2]) add('suporte_trans', cil([x, T.y0 - 0.02, z], [x, T.y0 + 0.14, z * 0.85], 0.045, M.escuro, 10));
  }
  add('mastro', cil([0, T.y1 - 0.05, 0], [0, R.y, 0], 0.055, M.metal, 16));
  add('swash', cil([0, T.y1 + 0.26, 0], [0, T.y1 + 0.32, 0], 0.22, M.escuro, 24));
  add('swash', cil([0, T.y1 + 0.14, 0], [0, T.y1 + 0.26, 0], 0.09, M.escuro, 16));

  // ---------- Rotor principal ----------
  const rotorP = new THREE.Group(); rotorP.position.set(0, R.y, 0); rotorP.rotation.y = 0.5; raiz.add(rotorP);
  const hSwash = T.y1 + 0.32 - R.y;
  if (R.pas === 2) {
    // semirrígido (teetering): yoke único, trunnion e pás opostas
    add('cubo_rp', caixa(0.22, 0.14, 0.2, [0, 0, 0], M.metal), rotorP);
    add('cubo_rp', cil([0, 0, -0.14], [0, 0, 0.14], 0.045, M.escuro, 12), rotorP);           // trunnion de batimento
    add('cubo_rp', caixa(1.0, 0.05, 0.16, [0, -0.02, 0], M.escuro), rotorP);                  // yoke
    for (const s of [1, -1]) {
      add('cubo_rp', caixa(0.34, 0.11, 0.15, [0.58 * s, 0, 0], M.metal), rotorP);              // grips
      add('swash', cil([0.22 * s, hSwash + 0.04, 0.1 * s], [0.42 * s, -0.04, 0.12 * s], 0.014, M.metal, 8), rotorP); // pitch links
      add('pas_rp', caixa(R.raio - 0.72, 0.035, R.corda, [s * (0.72 + (R.raio - 0.72) / 2), 0, 0], M.pa), rotorP).rotation.z = -0.01 * s;
    }
  } else {
    add('cubo_rp', cil([0, -0.07, 0], [0, 0.07, 0], 0.18, M.metal, 24), rotorP);
    add('cubo_rp', cil([0, 0.07, 0], [0, 0.1, 0], 0.26, M.casca2, 24), rotorP);
    for (let i = 0; i < 4; i++) {
      const g = new THREE.Group(); g.rotation.y = i * Math.PI / 2; rotorP.add(g);
      add('cubo_rp', caixa(0.66, 0.035, 0.16, [0.36, -0.02, 0], M.escuro), g);    // flexbeam/yoke
      add('cubo_rp', caixa(0.36, 0.1, 0.15, [0.56, 0, 0], M.metal), g);          // grip
      add('cubo_rp', cil([0.3, 0, 0.11], [0.62, 0, 0.13], 0.028, M.escuro, 8), g); // amortecedor
      add('swash', cil([0.24, hSwash + 0.04, 0.06], [0.45, -0.03, 0.11], 0.013, M.metal, 8), g);
      add('pas_rp', caixa(R.raio - 0.74, 0.03, R.corda, [0.74 + (R.raio - 0.74) / 2, 0, 0], M.pa), g).rotation.z = -0.012;
    }
  }
  add('swash', cil([0, hSwash - 0.02, 0], [0, hSwash + 0.03, 0], 0.24, M.metal, 24), rotorP);

  // ---------- Motor e acessórios ----------
  const Mo = F.motor;
  for (const mz of (F.motores || [0])) { // bimotores (230, 430): um motor de cada lado, eixos convergindo na transmissão
    add('motor', cil([Mo.x0, Mo.y, mz], [Mo.x1, Mo.y, mz], Mo.r, M.motor, 20));
    add('motor', cil([Mo.x0 + 0.12, Mo.y, mz], [Mo.x0, Mo.y, mz], Mo.r * 0.7, M.motor, 16));
    add('motor', cil([Mo.x1, Mo.y, mz], [Mo.x1 - 0.18, Mo.y + 0.02, mz], Mo.r * 0.8, M.escuro, 16));
    add('eixo_motor', cil([Mo.x0 + 0.12, Mo.y - 0.04, mz], [-0.22, T.y0 + 0.1, mz * 0.3], 0.032, M.eixo, 10));
    add('gerador', cil([Mo.x0 - 0.05, Mo.y - 0.17, mz + (mz >= 0 ? 0.12 : -0.12)], [Mo.x0 - 0.3, Mo.y - 0.17, mz + (mz >= 0 ? 0.12 : -0.12)], 0.07, M.ele, 12));
  }
  if (F.motores && F.motores.length > 1) add('transmissao', caixa(0.3, 0.16, Math.abs(F.motores[0] - F.motores[1]) + 0.1, [-0.32, T.y0 + 0.08, 0], M.metal)); // caixa de combinação
  for (const e of F.escapes) add('escapamento', cil(e.a, e.b, e.r, M.escuro, 16, true));
  for (const s of [1, -1]) add('entrada_ar', esfera(1, [F.entrada.x, F.entrada.y, F.entrada.z * s], M.escuro, [0.26, 0.13, 0.03]));
  add('radiador_oleo', caixa(0.34, 0.18, 0.4, [F.radiador.x, F.radiador.y, 0], M.metal));
  add('radiador_oleo', cil([F.radiador.x + 0.22, F.radiador.y, 0], [F.radiador.x + 0.14, F.radiador.y, 0], 0.11, M.escuro, 18));

  // ---------- Acionamento e rotor de cauda ----------
  const tr = F.eixoRc;
  for (let i = 0; i < tr.length - 1; i++) {
    add('eixo_rc', cil([tr[i][0], tr[i][1], 0], [tr[i + 1][0], tr[i + 1][1], 0], 0.026, M.eixo, 10));
    add('eixo_rc', cil([tr[i + 1][0] + 0.03, tr[i + 1][1], 0], [tr[i + 1][0] - 0.03, tr[i + 1][1], 0], 0.05, M.metal, 12));
  }
  const meio = Math.floor(tr.length / 2);
  add('eixo_rc', caixa(0.09, 0.08, 0.14, [tr[meio][0], tr[meio][1] - 0.05, 0], M.escuro));
  const rc = F.rc;
  add('caixa_rc', caixa(0.22, 0.2, 0.18, [F.caixaRc.x, F.caixaRc.y, 0], M.metal));
  add('caixa_rc', cil([rc.x, rc.y, 0], [rc.x, rc.y, rc.z + 0.04], 0.04, M.metal, 12));
  const rotorC = new THREE.Group(); rotorC.position.set(rc.x, rc.y, rc.z); raiz.add(rotorC);
  add('rotor_cauda', cil([0, 0, -0.05], [0, 0, 0.05], 0.06, M.metal, 16), rotorC);
  add('rotor_cauda', caixa(0.12, rc.raio * 2, 0.02, [0, 0, -0.025], M.pa), rotorC);   // 2 pás (inteiriças)
  add('comandos_rc', cil([F.trasX[0], F.piso.y + 0.55, 0.12], [F.coneX[0], tr[1][1] - 0.18, 0], 0.016, M.comando, 8));
  add('comandos_rc', cil([F.coneX[0], tr[1][1] - 0.18, 0], [rc.x + 0.1, rc.y - 0.12, 0], 0.016, M.comando, 8));
  add('comandos_rc', cil([rc.x + 0.1, rc.y - 0.12, 0], [rc.x, rc.y, rc.z + 0.12], 0.014, M.comando, 8));

  // ---------- Empenagem ----------
  const E = F.estab;
  add('estabilizador', caixa(E.corda, 0.045, E.meia * 2, [E.x, E.y, 0], M.casca));
  if (E.placa) for (const z of [E.meia, -E.meia]) add('estabilizador', caixa(E.corda * 1.05, E.placa, 0.035, [E.x - 0.03, E.y + E.placa * 0.12, z], M.casca2));
  const perfil = new THREE.Shape(F.deriva.map(([x, y]) => new THREE.Vector2(x, y)));
  const gDer = new THREE.ExtrudeGeometry(perfil, { depth: 0.06, bevelEnabled: false }); gDer.translate(0, 0, -0.03);
  add('deriva', new THREE.Mesh(gDer, M.casca));
  const pBaixo = F.deriva[4];
  add('deriva', cil([pBaixo[0] + 0.1, pBaixo[1] + 0.02, 0], [pBaixo[0] - 0.12, pBaixo[1] - 0.22, 0], 0.015, M.metal, 8));

  // ---------- Trem de pouso de esquis ----------
  const Q = F.esquis;
  for (const z of [Q.z, -Q.z]) {
    add('esquis', cil([Q.xF, 0.05, z], [Q.xT, 0.05, z], 0.042, M.metal, 12));
    add('esquis', cil([Q.xF, 0.05, z], [Q.xF + 0.32, 0.2, z], 0.042, M.metal, 12));
    add('esquis', caixa(0.5, 0.03, 0.16, [(Q.xF + Q.xT) / 2 + 0.5, 0.28, z * 0.9], M.escuro));
  }
  for (const [id, x] of [['tubo_diant', Q.tubos[0]], ['tubo_tras', Q.tubos[1]]]) {
    const z = Q.z, h = Q.topo;
    const curva = new THREE.CatmullRomCurve3([[-z, 0.05], [-z * 0.85, h * 0.55], [-z * 0.48, h * 0.92], [0, h], [z * 0.48, h * 0.92], [z * 0.85, h * 0.55], [z, 0.05]].map(([zz, y]) => new THREE.Vector3(x, y, zz)));
    add(id, new THREE.Mesh(new THREE.TubeGeometry(curva, 32, 0.038, 10), M.metal));
  }

  // ---------- Luzes e antenas ----------
  const p0 = F.deriva[1];
  add('luzes', esfera(0.06, [F.fus[1][0] - 0.25, F.fus[1][1] - 0.3, 0], M.luzW));
  add('luzes', esfera(0.045, [p0[0] - 0.12, p0[1] + 0.04, 0], M.luzR));
  add('luzes', esfera(0.03, [E.x - 0.2, E.y + 0.02, E.meia + 0.02], M.luzG));
  add('luzes', esfera(0.03, [E.x - 0.2, E.y + 0.02, -E.meia - 0.02], M.luzR));
  add('antenas', caixa(0.22, 0.18, 0.02, [0.3, F.fus[6][1] - F.fus[6][3] - 0.08, 0], M.escuro));
  add('antenas', caixa(0.2, 0.2, 0.02, [(F.coneX[0] + E.x) / 2, F.fus[11][1] - 0.25, 0], M.escuro));
  add('antenas', cil([F.capoX[1], F.capo[2][1] + 0.2, 0.2], [F.capoX[1] - 0.12, F.capo[2][1] + 0.55, 0.22], 0.01, M.escuro, 6));

  k.rotores.push({ obj: rotorP, eixo: 'y', vel: 5 }, { obj: rotorC, eixo: 'z', vel: 24 });
  k.vista = F.vista;
}

/* ---------- Modelos derivados (proporções tiradas das dimensões públicas; ilustrativos) ----------
   derivar(): estica a cabine para a frente do ponto xCorte (dx metros) e alarga a fuselagem (escZ). */
function derivar(base, o) {
  const F = JSON.parse(JSON.stringify(base)), c = o.xCorte ?? 0.3, dx = o.dx || 0, ez = o.escZ || 1;
  const f = (x) => (x > c ? x + dx : x);
  F.fus = F.fus.map(([x, y, w, h, n]) => [f(x), y, w * ez, h, n]);
  F.capo = F.capo.map(([x, y, w, h, n]) => [f(x), y, w * (o.escCapo || ez), h, n]); F.capoX = F.capoX.map(f);
  F.nariz = f(F.nariz); F.pbrisa = F.pbrisa.map(f); F.chin = F.chin.map(f);
  for (const k of ['v', 'p']) F.trip[k] = F.trip[k].map(f);
  for (const k of ['v', 'p', 'vL', 'pL']) if (F.pax[k]) F.pax[k] = F.pax[k].map((x) => x + (x > c ? dx * 0.5 : 0));
  const p0 = f(F.piso.x + F.piso.c / 2), p1 = f(F.piso.x - F.piso.c / 2); F.piso.x = (p0 + p1) / 2; F.piso.c = p0 - p1; F.piso.l *= ez;
  for (const k of ['painel', 'tripAss', 'bateria', 'avionica', 'pitot']) F[k].x = f(F[k].x);
  F.painel.l *= ez; F.tripAss.zs = F.tripAss.zs.map((z) => z * ez);
  F.paxAssentos = F.paxAssentos.map((a) => Object.assign(a, { x: a.x + (a.x > c ? dx * 0.5 : 0), zs: a.zs.map((z) => z * ez) }));
  F.esquis.xF = f(F.esquis.xF); F.esquis.tubos = F.esquis.tubos.map(f); F.esquis.z *= ez;
  F.entrada.z *= (o.escCapo || ez);
  Object.assign(F, o.extra || {});
  if (o.rotor) Object.assign(F.rotor, o.rotor);
  if (o.cores) F.cores = o.cores;
  F.vista = Object.assign({}, F.vista, { pos: [10.5 + dx, 5.6, 13.5], raio: F.vista.raio + dx * 0.4 });
  return F;
}
// Bell 206L-4 LongRanger IV: cabine ~0,6 m mais longa que a do 206B, rotor de 2 pás Ø 11,28 m, motor 250-C30P, 2 escapes verticais
FORMAS['206L4'] = derivar(FORMAS['206'], { dx: 0.62, escZ: 1.04, rotor: { raio: 5.64, corda: 0.33 },
  cores: { casca: 0xf1f3f5, casca2: 0x1f4f8f } });
// Bell 230: bimotor (2× 250-C30G/2), rotor de 2 pás Ø 12,8 m, cabine larga e longa, 2 escapes (um por motor)
FORMAS['230'] = derivar(FORMAS['407'], { dx: 0.9, escZ: 1.12, escCapo: 1.35, rotor: { raio: 6.4, pas: 2, corda: 0.4, y: 3.2 },
  cores: { casca: 0xe9ecef, casca2: 0x7a1f2b, pa: 0x4a5059 },
  extra: { motores: [0.27, -0.27], motor: { x0: -0.6, x1: -1.85, y: 2.2, r: 0.19 },
    escapes: [{ a: [-1.75, 2.25, 0.3], b: [-2.15, 2.6, 0.38], r: 0.11 }, { a: [-1.75, 2.25, -0.3], b: [-2.15, 2.6, -0.38], r: 0.11 }] } });
// Bell 430: bimotor (2× 250-C40B com FADEC), rotor de 4 pás sem rolamentos Ø 12,8 m, cabine mais longa que a do 230
FORMAS['430'] = derivar(FORMAS['407'], { dx: 1.15, escZ: 1.14, escCapo: 1.35, rotor: { raio: 6.4, pas: 4, corda: 0.36, y: 3.25 },
  cores: { casca: 0x1d2a3a, casca2: 0x9a7b3c, pa: 0x4a5059 },
  extra: { motores: [0.27, -0.27], motor: { x0: -0.6, x1: -1.9, y: 2.22, r: 0.2 },
    escapes: [{ a: [-1.8, 2.27, 0.3], b: [-2.2, 2.62, 0.38], r: 0.11 }, { a: [-1.8, 2.27, -0.3], b: [-2.2, 2.62, -0.38], r: 0.11 }] } });

export const MODELOS_3D = ['429', ...Object.keys(FORMAS)];

export function construirHelicoptero(id = '429') {
  const F = FORMAS[id];
  const k = oficina(F ? F.cores : {});
  if (F) construirMono(k, F); else construir429(k);
  return { raiz: k.raiz, partes: k.partes, malhas: k.malhas, rotores: k.rotores, matLinha: k.matLinha, vista: k.vista };
}
export { FORMAS };
