// HeliSense 3D – modelos 3D reais (.glb) no lugar das formas geradas por código (infraestrutura).
// Coloque um arquivo em assets/modelos3d/motor_<id do motor>.glb (ex.: motor_m250-c47.glb). Cada nó do arquivo
// cujo NOME seja o id de uma peça (entrada, compressor, combustao, turbina_gp, turbina_livre, escape, caixa_reducao…)
// substitui a peça procedural correspondente. As peças sem nó no arquivo continuam com a forma gerada.
// Convenção do arquivo: unidades em metros, eixo do motor em X (+X = lado do eixo de saída), +Y para cima.
// Tudo continua funcionando com o modelo real: seleção, destaque, raio-X, corte, carga, vista explodida e sensores.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export async function existe(url) {
  try { const r = await fetch(url, { method: 'HEAD', cache: 'no-cache' }); return r.ok; } catch { return false; }
}

export async function aplicarModeloReal(motor, url) {
  if (!(await existe(url))) return { aplicado: false, pecas: [] };
  const gltf = await new GLTFLoader().loadAsync(url);
  const trocadas = [];
  for (const id in motor.pecas) {
    const no = gltf.scene.getObjectByName(id);
    if (!no) continue;
    const p = motor.pecas[id];
    // esconde a forma procedural e coloca a peça real no mesmo grupo (mesmo eixo, giro e vista explodida)
    for (const ch of p.grupo.children) ch.visible = false;
    no.updateWorldMatrix(true, false);
    const real = no.clone(true); real.matrixAutoUpdate = true;
    no.matrixWorld.decompose(real.position, real.quaternion, real.scale);
    real.position.sub(p.grupo.position); // o grupo pode estar deslocado (peças que giram fora do eixo)
    const mats = new Set();
    real.traverse((o) => {
      if (!o.isMesh) return;
      o.userData.peca = id; o.castShadow = o.receiveShadow = true; motor.malhas.push(o);
      const lista = Array.isArray(o.material) ? o.material : [o.material];
      for (const m of lista) { if (m.color && m.emissive) { m.userData.base = { cor: m.color.getHex(), em: m.emissive.getHex() }; m.side = THREE.DoubleSide; mats.add(m); } }
    });
    p.grupo.add(real); p.mats = [...p.mats, ...mats]; trocadas.push(id);
  }
  return { aplicado: trocadas.length > 0, pecas: trocadas };
}

// Casca real do helicóptero: assets/modelos3d/heli_<modelo>.glb (ex.: heli_206.glb, convertido do FlightGear – GPL v2).
// O arquivo é encaixado sozinho sobre o modelo gerado por código: mesmo comprimento, mesmo eixo e nariz para o mesmo lado
// (o lado da cabine tem mais volume que o cone de cauda). Os componentes continuam clicáveis por baixo da casca.
function caminho(o) { let s = ''; for (let x = o; x; x = x.parent) s += ' ' + (x.name || ''); return s; } // nome do nó e dos pais
function eixoLongo(caixa) { const t = caixa.getSize(new THREE.Vector3()); return t.x >= t.z ? 'x' : 'z'; }
function ladoCabine(obj, eixo, centro) { // +1 se o volume (vértices ponderados) fica do lado + do eixo
  let s = 0, n = 0; const v = new THREE.Vector3();
  obj.traverse((o) => { if (!o.isMesh) return; const p = o.geometry.attributes.position; const passo = Math.max(1, Math.floor(p.count / 400));
    for (let i = 0; i < p.count; i += passo) { v.fromBufferAttribute(p, i).applyMatrix4(o.matrixWorld); s += v[eixo] - centro[eixo]; n++; } });
  return n ? Math.sign(s) || 1 : 1;
}
export async function aplicarCascaReal(heli, url, { ocultar = /rotor|blade|pa_|disc|shadow|sombra|reflect|glass_inner|guns|missil|lancesmissiles/i, esticar = false } = {}) {
  if (!(await existe(url))) return null;
  const gltf = await new GLTFLoader().loadAsync(url);
  // casca > ajuste (escala nos eixos do mundo) > real (giro)  – permite esticar só no comprimento (modelo da mesma família, fuselagem mais longa)
  const casca = new THREE.Group(); casca.name = 'casca_real'; const ajuste = new THREE.Group(); const real = gltf.scene; ajuste.add(real); casca.add(ajuste);
  real.updateMatrixWorld(true);
  real.traverse((o) => { if (o.name && ocultar.test(o.name)) o.visible = false; }); // inclui armamento do 222X do FlightGear (o 230 é civil)
  heli.raiz.updateMatrixWorld(true);
  const alvo = new THREE.Box3(); for (const m of heli.malhas) alvo.expandByObject(m);
  const eA = eixoLongo(alvo), cA = alvo.getCenter(new THREE.Vector3()), tA = alvo.getSize(new THREE.Vector3());
  let caixa = new THREE.Box3().setFromObject(real);
  if (eixoLongo(caixa) !== eA) { real.rotation.y = Math.PI / 2; ajuste.updateMatrixWorld(true); caixa = new THREE.Box3().setFromObject(real); }
  const tR = caixa.getSize(new THREE.Vector3());
  const k = tA[eA] / tR[eA];
  if (esticar) { const kh = tA.y / tR.y; ajuste.scale.set(kh, kh, kh); ajuste.scale[eA] = k; } else ajuste.scale.setScalar(k);
  ajuste.updateMatrixWorld(true);
  const alvoCab = ladoCabine({ traverse: (f) => heli.malhas.forEach(f) }, eA, cA);
  caixa = new THREE.Box3().setFromObject(real);
  // nariz para o mesmo lado: pelo rotor de cauda quando os dois modelos o têm (mais seguro que o volume da cabine)
  const rcSist = (heli.rotores || []).find((x) => x.eixo !== 'y'), rcReal = new THREE.Box3();
  real.traverse((o) => { if (o.isMesh && /tail.?rotor|rotor.?cauda/i.test(caminho(o))) rcReal.expandByObject(o); });
  let inverter;
  if (rcSist && rcSist.obj && !rcReal.isEmpty()) {
    const ladoS = Math.sign(rcSist.obj.getWorldPosition(new THREE.Vector3())[eA] - cA[eA]) || 1;
    const ladoR = Math.sign(rcReal.getCenter(new THREE.Vector3())[eA] - caixa.getCenter(new THREE.Vector3())[eA]) || 1;
    inverter = ladoS !== ladoR;
  } else inverter = ladoCabine(real, eA, caixa.getCenter(new THREE.Vector3())) !== alvoCab;
  if (inverter) { real.rotation.y += Math.PI; ajuste.updateMatrixWorld(true); caixa = new THREE.Box3().setFromObject(real); }
  const c = caixa.getCenter(new THREE.Vector3());
  ajuste.position.add(new THREE.Vector3(cA.x - c.x, alvo.min.y - caixa.min.y, cA.z - c.z));
  const inv = new THREE.Matrix4().copy(heli.raiz.matrixWorld).invert(); casca.applyMatrix4(inv);
  casca.traverse((o) => { if (o.isMesh) { o.castShadow = o.receiveShadow = true; o.raycast = () => {}; } }); // o clique atravessa a casca
  heli.raiz.add(casca);
  // onde fica o cubo do rotor principal no arquivo real (nós escondidos "mainrotor…"): o rotor que gira é encaixado ali
  casca.updateMatrixWorld(true);
  const cubo = new THREE.Box3(), todo = new THREE.Box3(), pas = new THREE.Box3();
  real.traverse((o) => { if (!o.isMesh || !/main.?rotor|rotor.?princ|^hub|mast/i.test(caminho(o))) return; todo.expandByObject(o); if (/blade|pa_/i.test(caminho(o))) pas.expandByObject(o); else cubo.expandByObject(o); });
  const fonte = cubo.isEmpty() ? todo : cubo;
  const rotor = fonte.isEmpty() ? null : (() => {
    const c = fonte.getCenter(new THREE.Vector3());
    if (!todo.isEmpty()) { const ct = todo.getCenter(new THREE.Vector3()); c.x = ct.x; c.z = ct.z; }
    if (!pas.isEmpty()) c.y = pas.getCenter(new THREE.Vector3()).y; // o rotor que gira fica no plano das pás reais
    return c;
  })();
  // pé do mastro: a parte de cima da fuselagem logo abaixo do cubo (maior altura dos vértices visíveis perto do eixo do rotor)
  let pe = null;
  if (rotor) {
    const raio = Math.max(0.15, (todo.isEmpty() ? 0.3 : todo.getSize(new THREE.Vector3()).length() * 0.02)), v = new THREE.Vector3();
    real.traverse((o) => {
      if (!o.isMesh || !o.visible || /main.?rotor|blade|glass|vidro|window|antenn/i.test(caminho(o))) return;
      const p = o.geometry.attributes.position; if (!p) return;
      for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i).applyMatrix4(o.matrixWorld); if (Math.hypot(v.x - rotor.x, v.z - rotor.z) < raio && v.y < rotor.y && (pe === null || v.y > pe)) pe = v.y; }
    });
  }
  // centro do rotor de cauda do arquivo real (escondido): o rotor de cauda que gira é encaixado ali
  const rc = new THREE.Box3(); real.traverse((o) => { if (o.isMesh && /tail.?rotor|rotor.?cauda/i.test(caminho(o))) rc.expandByObject(o); });
  return { casca, escala: k, esticado: esticar, rotor, peMastro: pe, rotorCauda: rc.isEmpty() ? null : rc.getCenter(new THREE.Vector3()) };
}
