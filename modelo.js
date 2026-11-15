// Bell 429 – modelo 3D procedural simplificado (ilustrativo, não é desenho de engenharia).
// Eixos: +X nariz, +Y cima, +Z lado direito. Unidades ~ metros. Rotor principal em x = 0.
import * as THREE from 'three';

export function construirHelicoptero() {
  const raiz = new THREE.Group();
  const partes = {};   // id do componente -> malhas
  const malhas = [];

  const std = (cor, o = {}) => new THREE.MeshStandardMaterial({ color: cor, roughness: 0.62, metalness: 0.08, side: THREE.DoubleSide, ...o });
  const M = {
    casca: std(0xdfe3e8), casca2: std(0xcfd5dc), vidro: std(0x18232e, { transparent: true, opacity: 0.45, roughness: 0.1, metalness: 0.5 }),
    metal: std(0x8d949e, { metalness: 0.55, roughness: 0.4 }), escuro: std(0x3b4149, { metalness: 0.4 }), pa: std(0xc4cad1),
    interno: std(0x9aa2ac), assento: std(0x66707c), tanque: std(0xb5935a), hid: std(0x4f93bd), ele: std(0x6aa878), fogo: std(0xc4524e),
    comando: std(0xd9b44a), eixo: std(0xa9834f, { metalness: 0.5 }), motor: std(0x7d858f, { metalness: 0.6, roughness: 0.35 }),
    luzR: std(0xff4a4a, { emissive: 0x7a1010 }), luzG: std(0x4aff7a, { emissive: 0x0f6a25 }), luzW: std(0xffffff, { emissive: 0x777777 })
  };
  const matLinha = new THREE.LineBasicMaterial({ color: 0x586270, transparent: true, opacity: 0.6 });

  function add(id, malha, pai = raiz) {
    malha.userData.comp = id; malha.userData.base = malha.material;
    (partes[id] ??= []).push(malha); malhas.push(malha); pai.add(malha); return malha;
  }
  const V = (a) => new THREE.Vector3(a[0], a[1], a[2]);
  function caixa(sx, sy, sz, pos, mat) { const m = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), mat); m.position.set(...pos); return m; }
  function cil(a, b, r, mat, seg = 14, aberto = false) {
    const A = V(a), B = V(b), m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, A.distanceTo(B), seg, 1, aberto), mat);
    m.position.copy(A).add(B).multiplyScalar(0.5);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.clone().sub(A).normalize()); return m;
  }
  function esfera(r, pos, mat, esc) { const m = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 12), mat); m.position.set(...pos); if (esc) m.scale.set(...esc); return m; }

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
      const u0 = uDeX(x0), u1 = uDeX(x1), su = Math.max(2, Math.ceil((u1 - u0) * 9)), sa = Math.max(2, Math.ceil((a1 - a0) / 6)), base = b.pos.length / 3;
      for (let i = 0; i <= su; i++) for (let j = 0; j <= sa; j++) {
        const u = u0 + (u1 - u0) * i / su, th = (a0 + (a1 - a0) * j / sa) * Math.PI / 180, p = P(u, th), n = normal(u, th);
        b.pos.push(p.x, p.y, p.z); b.nor.push(n.x, n.y, n.z);
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
      g.setAttribute('position', new THREE.Float32BufferAttribute(b.pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(b.nor, 3)); g.setIndex(b.idx);
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

  // ---------- Fuselagem + cone de cauda ----------
  const fus = loft([
    [3.30, 1.05, 0.03, 0.03, 2], [3.18, 1.05, 0.30, 0.24, 2.1], [2.95, 1.08, 0.55, 0.42, 2.2], [2.55, 1.15, 0.78, 0.62, 2.4],
    [2.00, 1.25, 0.96, 0.78, 2.6], [1.40, 1.36, 1.06, 0.88, 2.8], [0.60, 1.42, 1.10, 0.93, 2.9], [-0.50, 1.45, 1.10, 0.95, 2.9],
    [-1.50, 1.47, 1.07, 0.94, 2.8], [-2.30, 1.52, 0.98, 0.88, 2.6], [-3.00, 1.63, 0.78, 0.70, 2.4], [-3.60, 1.78, 0.50, 0.47, 2.2],
    [-4.20, 1.92, 0.30, 0.29, 2], [-6.00, 2.02, 0.20, 0.20, 2], [-7.90, 2.10, 0.13, 0.13, 2], [-8.30, 2.12, 0.05, 0.05, 2]
  ]);
  const lado = (s, a, b) => (s > 0 ? [a, b] : [-b, -a]);
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

  return { raiz, partes, malhas, rotorP, rotorC, matLinha };
}
