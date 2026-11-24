// HeliSense 3D – fluxo funcional do motor no 3D (apresentação).
// Mostra a progressão real do turboeixo, peça a peça, ligada à simulação:
//   ar frio na entrada → compressão (aquece) → câmara: injeção de combustível + chama → turbina do gerador de gases
//   → turbina livre (potência no eixo) → escape.
// A velocidade das partículas segue o Ng, o jato de combustível segue a vazão (FF) e a chama segue a temperatura dos gases.
// Ilustrativo (atlas: fichas 071 Anatomia do turboeixo, 072 Caminho do ar, 074 Câmara de combustão, 075 Turbinas).
import * as THREE from 'three';

// ordem do caminho do gás: cada etapa usa a primeira peça que existir no motor
const ETAPAS = [
  { ids: ['entrada'], fase: 'Admissão', cor: 0x5fb8ff },
  { ids: ['compressor_axial', 'rotor_axial'], fase: 'Compressão axial', cor: 0x8fd0ff },
  { ids: ['compressor', 'impulsor'], fase: 'Compressão centrífuga', cor: 0xd8f0ff },
  { ids: ['tubos_descarga'], fase: 'Ar comprimido para a câmara', cor: 0xf2f2e8 },
  { ids: ['combustao', 'camisa'], fase: 'Injeção e combustão', cor: 0xffa23a, chama: true },
  { ids: ['turbina_gp', 'turbina'], fase: 'Turbina do gerador de gases (aciona o compressor)', cor: 0xff6a2a },
  { ids: ['turbina_livre', 'carcaca_tl'], fase: 'Turbina livre (potência para o rotor)', cor: 0xd94a2a },
  { ids: ['coletor_escape', 'escape'], fase: 'Escape', cor: 0x8a8580 }
];

function pontoDoGlifo() { // sprite redondo e suave para as partículas
  const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d');
  const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.4, 'rgba(255,255,255,0.55)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, 64, 64); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

export class FluxoMotor {
  constructor(motor, { particulas = 1400 } = {}) {
    this.motor = motor; this.grupo = new THREE.Group(); this.grupo.name = 'fluxo'; this.ativo = true;
    motor.raiz.updateMatrixWorld(true);
    const pts = [], etapas = [];
    for (const e of ETAPAS) {
      const id = e.ids.find((i) => motor.pecas[i]); if (!id) continue;
      const p = motor.pecas[id], c = motor.raiz.worldToLocal(p.centro.clone()), raio = p.caixa.getSize(new THREE.Vector3()).length() / (motor.raiz.scale.x || 1) * 0.12;
      pts.push(c); etapas.push({ ...e, id, centro: c, raio });
    }
    this.etapas = etapas;
    if (pts.length < 3) { this.ativo = false; return; }
    this.curva = new THREE.CatmullRomCurve3(pts, false, 'centripetal', 0.5);
    // fração da curva onde começa cada etapa (para cor, raio e fase)
    const L = this.curva.getLengths(400), tot = L[L.length - 1];
    this.uEtapa = pts.map((p) => { let melhor = 0, d = 1e9; for (let i = 0; i <= 400; i++) { const q = this.curva.getPointAt(i / 400), dd = q.distanceTo(p); if (dd < d) { d = dd; melhor = i / 400; } } return melhor; });
    this.comprimento = tot;
    this.iChama = etapas.findIndex((e) => e.chama);

    const N = particulas, geo = new THREE.BufferGeometry();
    this.pos = new Float32Array(N * 3); this.cor = new Float32Array(N * 3);
    this.u = new Float32Array(N); this.off = new Float32Array(N * 2); this.vel = new Float32Array(N);
    for (let i = 0; i < N; i++) { this.u[i] = Math.random(); this.off[i * 2] = Math.random() * Math.PI * 2; this.off[i * 2 + 1] = Math.sqrt(Math.random()); this.vel[i] = 0.75 + Math.random() * 0.5; }
    geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3)); geo.setAttribute('color', new THREE.BufferAttribute(this.cor, 3));
    const sprite = pontoDoGlifo();
    this.mat = new THREE.PointsMaterial({ size: 0.022, map: sprite, vertexColors: true, transparent: true, opacity: 0.9, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true });
    this.pontos = new THREE.Points(geo, this.mat); this.pontos.renderOrder = 10; this.pontos.frustumCulled = false; this.grupo.add(this.pontos);

    // jato de combustível do bico injetor (cone de gotículas)
    const bico = motor.pecas.bico_injetor || motor.pecas[etapas[this.iChama]?.id];
    this.bicoPos = bico ? motor.raiz.worldToLocal(bico.centro.clone()) : null;
    const NS = 260, gs = new THREE.BufferGeometry(); this.spray = { pos: new Float32Array(NS * 3), vida: new Float32Array(NS), dir: new Float32Array(NS * 3) };
    for (let i = 0; i < NS; i++) this.spray.vida[i] = Math.random();
    gs.setAttribute('position', new THREE.BufferAttribute(this.spray.pos, 3));
    this.matSpray = new THREE.PointsMaterial({ size: 0.012, map: sprite, color: 0xfff2a0, transparent: true, opacity: 0.85, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending });
    this.pontosSpray = new THREE.Points(gs, this.matSpray); this.pontosSpray.renderOrder = 11; this.pontosSpray.frustumCulled = false; this.grupo.add(this.pontosSpray);
    // direção do spray: do bico para o centro da câmara
    const alvo = etapas[this.iChama]?.centro;
    this.dirSpray = this.bicoPos && alvo ? alvo.clone().sub(this.bicoPos).normalize() : new THREE.Vector3(-1, 0, 0);
    if (this.dirSpray.lengthSq() < 0.5) this.dirSpray.set(-1, 0, 0);

    // luz da chama dentro da câmara
    this.luzChama = new THREE.PointLight(0xff8a30, 0, 0.9, 1.6);
    if (alvo) this.luzChama.position.copy(alvo); this.grupo.add(this.luzChama);
    motor.raiz.add(this.grupo);
    this._c = new THREE.Color(); this._p = new THREE.Vector3(); this._t = new THREE.Vector3(); this._n = new THREE.Vector3(); this._b = new THREE.Vector3();
  }

  etapaDe(u) { let i = 0; while (i + 1 < this.uEtapa.length && u >= this.uEtapa[i + 1]) i++; return i; }

  // estado: { ng, ff, temp, acendeu, ign, demo }
  atualizar(dt, est, t) {
    if (!this.ativo) return;
    this.grupo.visible = this.visivel !== false;
    if (!this.grupo.visible) return;
    const ngEf = est.demo && est.ng < 5 ? 20 : est.ng; // demonstração lenta com o motor parado
    const vel = (ngEf / 100) * 0.42, quente = est.acendeu ? Math.min(1, Math.max(0, (est.temp - 200) / 650)) : 0;
    this.mat.opacity = ngEf > 1 ? 0.9 : 0;
    const E = this.etapas;
    for (let i = 0, N = this.u.length; i < N; i++) {
      let u = this.u[i] + dt * vel * this.vel[i] * (0.6 + 0.4 * (1 - this.etapaDe(this.u[i]) / E.length));
      if (u > 1) { u -= 1; this.off[i * 2] = Math.random() * Math.PI * 2; }
      this.u[i] = u;
      const k = this.etapaDe(u), e = E[k], e2 = E[Math.min(k + 1, E.length - 1)];
      const f = this.uEtapa[k + 1] ? (u - this.uEtapa[k]) / (this.uEtapa[k + 1] - this.uEtapa[k]) : 1;
      this.curva.getPointAt(u, this._p); this.curva.getTangentAt(u, this._t);
      this._n.set(0, 1, 0); if (Math.abs(this._t.y) > 0.9) this._n.set(1, 0, 0);
      this._b.crossVectors(this._t, this._n).normalize(); this._n.crossVectors(this._b, this._t).normalize();
      const r = THREE.MathUtils.lerp(e.raio, e2.raio, f) * this.off[i * 2 + 1], a = this.off[i * 2] + u * 18;
      this._p.addScaledVector(this._n, Math.cos(a) * r).addScaledVector(this._b, Math.sin(a) * r);
      this.pos.set([this._p.x, this._p.y, this._p.z], i * 3);
      // cor: ar frio → aquecido; depois da câmara só fica "quente" se houver combustão
      this._c.setHex(e.cor).lerp(new THREE.Color(e2.cor), f);
      if (k >= this.iChama && this.iChama >= 0 && quente < 0.05) this._c.setHex(0x9fc7e8).multiplyScalar(0.8);
      this.cor.set([this._c.r, this._c.g, this._c.b], i * 3);
    }
    this.pontos.geometry.attributes.position.needsUpdate = true; this.pontos.geometry.attributes.color.needsUpdate = true;

    // injeção de combustível: proporcional à vazão
    const ffN = est.ffMax ? Math.min(1, est.ff / est.ffMax) : (est.ff > 0 ? 0.5 : 0);
    this.matSpray.opacity = this.bicoPos && ffN > 0.01 ? 0.35 + 0.55 * ffN : 0;
    if (this.bicoPos && ffN > 0.01) {
      const S = this.spray, alc = 0.06 + 0.07 * ffN;
      for (let i = 0; i < S.vida.length; i++) {
        S.vida[i] += dt * (2.5 + Math.random());
        if (S.vida[i] >= 1) { S.vida[i] = 0; const ang = Math.random() * 6.283, ab = Math.random() * 0.45; S.dir.set([Math.cos(ang) * ab, Math.sin(ang) * ab, 0], i * 3); }
        const v = S.vida[i]; this._n.set(S.dir[i * 3], S.dir[i * 3 + 1], S.dir[i * 3 + 2]);
        this._p.copy(this.bicoPos).addScaledVector(this.dirSpray, v * alc).addScaledVector(this._n, v * alc * 0.6);
        S.pos.set([this._p.x, this._p.y, this._p.z], i * 3);
      }
      this.pontosSpray.geometry.attributes.position.needsUpdate = true;
      this.matSpray.color.setHex(quente > 0.05 ? 0xffd27a : 0xfff6c8);
    }
    // chama: intensidade com a temperatura, tremulação de queima contínua
    this.luzChama.intensity = quente > 0 ? quente * (1.6 + 0.5 * Math.sin(t * 37) + 0.3 * Math.sin(t * 13)) : 0;
  }

  // fase em que está um ponto clicado / para legenda
  legenda() { return this.etapas.map((e) => ({ fase: e.fase, cor: '#' + e.cor.toString(16).padStart(6, '0'), peca: e.id })); }
}
