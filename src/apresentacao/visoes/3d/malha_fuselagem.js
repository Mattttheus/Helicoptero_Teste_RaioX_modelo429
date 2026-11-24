// HeliSense 3D – malha elétrica / eletrônica da fuselagem (apresentação, ilustrativa).
// Circuitos saem do barramento (distribuição nos aviônicos do nariz), seguem por um tronco no piso (keel) e pelo cone de cauda,
// e sobem até cada carga/sensor. Cores por tipo de circuito; abraçadeiras ao longo do tronco e conectores nas pontas.
// Referência: atlas – fichas 091 Sistema elétrico, 094 Barramentos, 115 Fixações, linhas e conexões. Não substitui o diagrama elétrico (WDM).
import * as THREE from 'three';
import { conector } from './chicotes.js?v=20261123a';

export const CIRCUITOS = [ // [id, cor, descrição, rótulo curto]
  ['cc', 0xe04848, 'Barramento CC (bateria / gerador)', 'CC'],
  ['carga', 0xff9f40, 'Alimentação de cargas (luzes, pitot, painel)', 'Cargas'],
  ['sinal', 0x3fa7ff, 'Sinais de sensores (motor, transmissão, combustível, hidráulico)', 'Sensores'],
  ['dados', 0x46c08a, 'Barramento de dados / comandos (painel, ELT)', 'Dados'],
  ['rf', 0x8a8f98, 'Coaxial de RF (antenas)', 'RF'],
];
// [origem, destino, circuito]
const LIGACOES = [
  ['bateria', 'avionica', 'cc'], ['gerador', 'avionica', 'cc'], ['bateria', 'gerador', 'cc'],
  ['avionica', 'luzes', 'carga'], ['avionica', 'pitot', 'carga'], ['avionica', 'painel', 'carga'], ['avionica', 'combustivel', 'carga'],
  ['avionica', 'motor', 'sinal'], ['avionica', 'transmissao', 'sinal'], ['avionica', 'combustivel', 'sinal'], ['avionica', 'hidraulico', 'sinal'],
  ['avionica', 'caixa_rc', 'sinal'], ['avionica', 'radiador_oleo', 'sinal'],
  ['painel', 'avionica', 'dados'], ['avionica', 'avionica_tras', 'dados'], ['painel', 'comandos', 'dados'],
  ['avionica', 'antenas', 'rf'], ['avionica_tras', 'antenas', 'rf'],
];

export function montarMalhaFuselagem(heli, info) {
  const g = new THREE.Group(); g.name = 'malha_fuselagem';
  const existe = (id) => info[id] && !info[id].caixa.isEmpty();
  if (!existe('fuselagem')) return g;
  heli.raiz.updateMatrixWorld(true);
  const loc = (v) => heli.raiz.worldToLocal(v.clone());
  const cx = (id) => loc(info[id].centro);
  // sentido nariz→cauda e alturas do tronco: piso na cabine, centro do cone de cauda atrás
  const nariz = cx(existe('nariz') ? 'nariz' : 'fuselagem'), cauda = cx(existe('cone_cauda') ? 'cone_cauda' : 'fuselagem');
  const sx = Math.sign(nariz.x - cauda.x) || 1;
  const fus = info.fuselagem.caixa, yPiso = loc(new THREE.Vector3(0, existe('piso') ? info.piso.caixa.max.y : fus.min.y + 0.25, 0)).y + 0.04;
  const xIniCauda = existe('cone_cauda') ? loc(sx > 0 ? new THREE.Vector3(info.cone_cauda.caixa.max.x, 0, 0) : new THREE.Vector3(info.cone_cauda.caixa.min.x, 0, 0)).x : cauda.x;
  const yCauda = existe('cone_cauda') ? cauda.y : yPiso;
  const yTronco = (x) => { const d = (x - xIniCauda) * sx; return d >= 0 ? yPiso : THREE.MathUtils.lerp(yPiso, yCauda, Math.min(1, -d / 1.2)); };
  const mats = Object.fromEntries(CIRCUITOS.map(([k, cor]) => [k, new THREE.MeshStandardMaterial({ color: cor, roughness: 0.5, metalness: 0.1, emissive: cor, emissiveIntensity: 0.25 })]));
  const matCon = new THREE.MeshStandardMaterial({ color: 0x2b3038, metalness: 0.6, roughness: 0.4 });
  const matAbr = new THREE.MeshStandardMaterial({ color: 0xb8c0c8, metalness: 0.85, roughness: 0.3 });
  const geoAbr = new THREE.TorusGeometry(0.022, 0.006, 8, 18);
  let n = 0;
  for (const [a, b, tipo] of LIGACOES) {
    if (!existe(a) || !existe(b)) continue;
    const A = cx(a), B = cx(b), dz = ((n++ % 9) - 4) * 0.014;            // cabos lado a lado no tronco
    const pA = new THREE.Vector3(A.x, yTronco(A.x), dz), pB = new THREE.Vector3(B.x, yTronco(B.x), dz);
    const pts = [A, new THREE.Vector3(A.x, (A.y + pA.y) / 2, A.z * 0.5 + dz), pA];
    for (let k = 1; k < 6; k++) { const x = THREE.MathUtils.lerp(pA.x, pB.x, k / 6); pts.push(new THREE.Vector3(x, yTronco(x), dz)); }
    pts.push(pB, new THREE.Vector3(B.x, (B.y + pB.y) / 2, B.z * 0.5 + dz), B);
    const curva = new THREE.CatmullRomCurve3(pts, false, 'centripetal', 0.3);
    const tubo = new THREE.Mesh(new THREE.TubeGeometry(curva, Math.max(40, Math.round(curva.getLength() * 30)), tipo === 'cc' ? 0.011 : 0.0075, 8, false), mats[tipo]);
    tubo.userData = { circuito: tipo, de: a, para: b }; g.add(tubo);
    for (const [p, q] of [[A, pts[1]], [B, pts[pts.length - 2]]]) { const c = conector(matCon, matAbr, 0.016); c.position.copy(p); c.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), q.clone().sub(p).normalize()); g.add(c); }
  }
  // abraçadeiras no tronco (a cada ~40 cm entre o nariz e a cauda)
  const x0 = Math.min(nariz.x, cauda.x), x1 = Math.max(nariz.x, cauda.x);
  for (let x = x0; x <= x1; x += 0.4) { const ab = new THREE.Mesh(geoAbr, matAbr); ab.position.set(x, yTronco(x), 0); ab.rotation.y = Math.PI / 2; ab.scale.set(1, 1, 1); g.add(ab); }
  heli.raiz.add(g);
  return g;
}
export function descartarMalha(g) { if (!g) return; g.parent?.remove(g); g.traverse((o) => { if (o.geometry) o.geometry.dispose(); }); }
