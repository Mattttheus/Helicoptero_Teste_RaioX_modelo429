// HeliSense 3D – chicotes elétricos / eletrônicos do motor (apresentação).
// Cada sensor recebe um cabo até a unidade de controle (ECU/FADEC; sem FADEC: caixa de acessórios / controle de combustível),
// roteado por fora das carcaças, com conector no sensor, cor por tipo de sinal e um tronco principal com abraçadeiras.
// Roteamento ilustrativo (atlas: fichas 078 FADEC, 091 Sistema elétrico, 094 Barramentos, 115 Fixações, linhas e conexões).
import * as THREE from 'three';

export const CORES_SINAL = [
  [/termopar/i, 0xf2c14e, 'Termopar (temperatura dos gases)'],
  [/rpm|pickup|monopolo|tacom|rota/i, 0x46c08a, 'Rotação (Ng / Np)'],
  [/press|torque|torquí/i, 0x3fa7ff, 'Pressão / torque'],
  [/rtd|bulbo|temperatura/i, 0xff7a45, 'Temperatura (RTD)'],
  [/aceler/i, 0xb26bff, 'Vibração (acelerômetro)'],
  [/limalha|interruptor|chip/i, 0xe0e0e0, 'Discreto (limalha, ΔP)'],
  [/fluxo/i, 0x4fd1c5, 'Fluxo de combustível'],
  [/./, 0xd0d4da, 'Outros / alimentação']
];
// conector circular aeronáutico (tipo MIL-DTL-38999): corpo, anel de acoplamento sextavado e capa traseira (backshell)
export function conector(matCorpo, matAnel, r = 0.009) {
  const g = new THREE.Group();
  const corpo = new THREE.Mesh(new THREE.CylinderGeometry(r, r, r * 2.2, 16), matCorpo); g.add(corpo);
  const anel = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.3, r * 1.3, r * 0.9, 6), matAnel); anel.position.y = r * 0.6; g.add(anel);
  const capa = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.55, r * 0.95, r * 1.6, 12), matCorpo); capa.position.y = -r * 1.8; g.add(capa);
  return g;
}
const corDe = (tipo) => CORES_SINAL.find(([r]) => r.test(tipo || ''))[1];

export function montarChicotes(motor, sensores) {
  const grupo = new THREE.Group(); grupo.name = 'chicotes';
  motor.raiz.updateMatrixWorld(true);
  const pecaHub = motor.pecas.ecu || motor.pecas.controle_comb || motor.pecas.caixa_acessorios || motor.pecas.gerador || Object.values(motor.pecas)[0];
  const hub = motor.raiz.worldToLocal(pecaHub.centro.clone());
  const radial = (p) => { const v = new THREE.Vector3(0, p.y, p.z); return v.lengthSq() < 1e-6 ? new THREE.Vector3(0, 1, 0) : v.normalize(); };
  const rHub = Math.hypot(hub.y, hub.z);
  const mats = {};
  const matConector = new THREE.MeshStandardMaterial({ color: 0x2b3038, metalness: 0.6, roughness: 0.4 });
  const matAbr = new THREE.MeshStandardMaterial({ color: 0x9aa3ad, metalness: 0.8, roughness: 0.3 });
  let tronco = [];
  for (const s of sensores) {
    if (!s.pos) continue;
    const A = new THREE.Vector3(...s.pos), ra = radial(A), rA = Math.hypot(A.y, A.z);
    const R = Math.max(rA, rHub) + 0.05;                    // afastado da carcaça
    const angA = Math.atan2(A.z, A.y), angH = Math.atan2(hub.z, hub.y);
    let dAng = angH - angA; while (dAng > Math.PI) dAng -= 2 * Math.PI; while (dAng < -Math.PI) dAng += 2 * Math.PI;
    const pts = [A, A.clone().addScaledVector(ra, 0.04)];
    for (let k = 1; k <= 3; k++) { // segue a carcaça: em arco e avançando em X até o hub
      const f = k / 4, ang = angA + dAng * f, x = THREE.MathUtils.lerp(A.x, hub.x, f);
      pts.push(new THREE.Vector3(x, Math.cos(ang) * R, Math.sin(ang) * R));
    }
    pts.push(hub.clone().addScaledVector(radial(hub), 0.04), hub.clone());
    const curva = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
    const cor = corDe(s.tipo), mat = mats[cor] ??= new THREE.MeshStandardMaterial({ color: cor, roughness: 0.55, metalness: 0.1, emissive: cor, emissiveIntensity: 0.12 });
    const tubo = new THREE.Mesh(new THREE.TubeGeometry(curva, 48, 0.0035, 8, false), mat);
    tubo.userData.sensor = s.id; tubo.castShadow = true; grupo.add(tubo);
    const con = conector(matConector, matAbr, 0.009); con.position.copy(A).addScaledVector(ra, 0.012);
    con.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), ra); grupo.add(con);
    tronco.push(curva);
  }
  // abraçadeiras (P-clamps) ao longo dos cabos, a cada ~25%
  const geoAbr = new THREE.TorusGeometry(0.008, 0.0025, 8, 16);
  for (const c of tronco) for (const f of [0.35, 0.6, 0.85]) {
    const p = c.getPointAt(f), t = c.getTangentAt(f), a = new THREE.Mesh(geoAbr, matAbr);
    a.position.copy(p); a.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), t); grupo.add(a);
  }
  // conector principal na unidade de controle
  const plug = conector(matConector, matAbr, 0.02);
  plug.position.copy(hub).addScaledVector(radial(hub), 0.02); plug.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), radial(hub)); grupo.add(plug);
  grupo.userData.hub = pecaHub.id;
  motor.raiz.add(grupo);
  return grupo;
}
export function descartarChicotes(grupo) {
  if (!grupo) return; grupo.parent?.remove(grupo);
  grupo.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
}
