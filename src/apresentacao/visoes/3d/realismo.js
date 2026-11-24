// HeliSense 3D – acabamento realista do 3D (apresentação).
// Renderização física (PBR) com tons ACES, reflexos de ambiente (estúdio), sombras suaves e texturas
// geradas em canvas (metal escovado, pintura com juntas e rebites, coloração de calor, carcaça fundida,
// mangueira trançada). As texturas são procedurais: não dependem de imagens externas nem de internet.
// Os materiais são enriquecidos NO LUGAR (mesmo objeto): destaque, raio-X, corte e "carga" continuam funcionando.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const CHAVE_QUALIDADE = 'mi_qualidade3d';
export function qualidadeAlta() { try { return localStorage.getItem(CHAVE_QUALIDADE) !== 'normal'; } catch { return true; } }
export function definirQualidade(alta) { try { localStorage.setItem(CHAVE_QUALIDADE, alta ? 'alta' : 'normal'); } catch { /* sem armazenamento */ } }

/* ---------------- texturas em canvas (tratamento de imagem procedural) ---------------- */
const cacheTex = {};
let ANISO = 8;
function canvas(tam) { const c = document.createElement('canvas'); c.width = c.height = tam; return [c, c.getContext('2d')]; }
function textura(c, rep = [1, 1], cor = false) {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...rep); t.anisotropy = ANISO;
  t.colorSpace = cor ? THREE.SRGBColorSpace : THREE.NoColorSpace; return t;
}
function ruido(ctx, tam, forca, alfa = 1) {
  const img = ctx.getImageData(0, 0, tam, tam), d = img.data;
  for (let i = 0; i < d.length; i += 4) { const r = (Math.random() - 0.5) * forca; d[i] += r; d[i + 1] += r; d[i + 2] += r; d[i + 3] = 255 * alfa; }
  ctx.putImageData(img, 0, 0);
}

// metal escovado / usinado: riscos finos numa direção (rugosidade e relevo)
function texEscovado() {
  return cacheTex.escovado ??= (() => {
    const T = 1024, [c, x] = canvas(T); x.fillStyle = '#d0d0d0'; x.fillRect(0, 0, T, T);
    for (let i = 0; i < 7000; i++) {
      const y = Math.random() * T, g = 170 + Math.random() * 70 | 0;
      x.strokeStyle = `rgba(${g},${g},${g},${0.15 + Math.random() * 0.25})`; x.lineWidth = Math.random() * 1.4;
      x.beginPath(); x.moveTo(0, y); x.lineTo(T, y + (Math.random() - 0.5) * 3); x.stroke();
    }
    ruido(x, T, 14); return textura(c, [2, 2]);
  })();
}
// carcaça fundida (caixas de engrenagem, suportes): granulado de fundição
function texFundido() {
  return cacheTex.fundido ??= (() => {
    const T = 256, [c, x] = canvas(T); x.fillStyle = '#d4d4d4'; x.fillRect(0, 0, T, T); ruido(x, T, 40);
    for (let i = 0; i < 400; i++) { x.fillStyle = `rgba(60,60,60,${Math.random() * 0.35})`; x.beginPath(); x.arc(Math.random() * T, Math.random() * T, Math.random() * 1.8, 0, 7); x.fill(); }
    // nervuras de fundição e cabeças de parafuso (relevo)
    x.strokeStyle = 'rgba(255,255,255,0.55)'; x.lineWidth = 5; x.beginPath(); x.moveTo(0, T * 0.5); x.lineTo(T, T * 0.5); x.stroke();
    for (let i = 0; i < 6; i++) { const cx = (i + 0.5) * T / 6; x.fillStyle = 'rgba(245,245,245,0.95)'; x.beginPath(); x.arc(cx, T * 0.18, 6, 0, 7); x.fill(); x.fillStyle = 'rgba(70,70,70,0.9)'; x.fillRect(cx - 3.5, T * 0.18 - 1, 7, 2); }
    return textura(c, [3, 3]);
  })();
}
// pintura da fuselagem: juntas de painéis, fileiras de rebites e leve casca de laranja
function texPainel() {
  return cacheTex.painel ??= (() => {
    const T = 2048, [c, x] = canvas(T); x.fillStyle = '#c8c8c8'; x.fillRect(0, 0, T, T); ruido(x, T, 8);
    const juntas = [0, 0.23, 0.5, 0.71, 1].map((v) => v * T), lin = [0, 0.38, 0.66, 1].map((v) => v * T);
    x.strokeStyle = 'rgba(40,40,40,0.9)'; x.lineWidth = 4;
    for (const p of juntas) { x.beginPath(); x.moveTo(p, 0); x.lineTo(p, T); x.stroke(); }
    for (const p of lin) { x.beginPath(); x.moveTo(0, p); x.lineTo(T, p); x.stroke(); }
    x.fillStyle = 'rgba(235,235,235,0.95)';
    const rebites = (x0, y0, x1, y1) => { const n = Math.hypot(x1 - x0, y1 - y0) / 22; for (let i = 0; i <= n; i++) { x.beginPath(); x.arc(x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n, 3.2, 0, 7); x.fill(); } };
    for (const p of juntas) { rebites(p + 13, 0, p + 13, T); rebites(p - 13, 0, p - 13, T); }
    for (const p of lin) rebites(0, p + 13, T, p + 13);
    // portinholas de inspeção
    x.strokeStyle = 'rgba(30,30,30,0.85)'; x.lineWidth = 3;
    [[0.3, 0.45, 0.12, 0.1], [0.78, 0.15, 0.09, 0.12], [0.55, 0.78, 0.1, 0.07]].forEach(([a, b, w, h]) => { x.strokeRect(a * T, b * T, w * T, h * T); });
    return textura(c, [1, 1]);
  })();
}
// coloração de calor (aço/inconel): palha → bronze → azul → violeta ao longo da peça quente
function texCalor() {
  return cacheTex.calor ??= (() => {
    const T = 512, [c, x] = canvas(T), g = x.createLinearGradient(0, 0, 0, T);
    [[0, '#d9d4c8'], [0.25, '#d6b98a'], [0.45, '#b08a5a'], [0.62, '#7d6a8e'], [0.8, '#56679a'], [1, '#8a8f99']].forEach(([p, cor]) => g.addColorStop(p, cor));
    x.fillStyle = g; x.fillRect(0, 0, T, T);
    for (let i = 0; i < 900; i++) { const y = Math.random() * T; x.strokeStyle = `rgba(255,255,255,${Math.random() * 0.08})`; x.beginPath(); x.moveTo(0, y); x.lineTo(T, y); x.stroke(); }
    ruido(x, T, 18); return textura(c, [1, 1], true);
  })();
}
// mangueira trançada de aço inox
function texTrancado() {
  return cacheTex.trancado ??= (() => {
    const T = 128, [c, x] = canvas(T); x.fillStyle = '#777'; x.fillRect(0, 0, T, T);
    x.lineWidth = 2;
    for (let i = -T; i < T * 2; i += 6) { x.strokeStyle = 'rgba(220,220,220,0.8)'; x.beginPath(); x.moveTo(i, 0); x.lineTo(i + T, T); x.stroke(); x.strokeStyle = 'rgba(40,40,40,0.8)'; x.beginPath(); x.moveTo(i + T, 0); x.lineTo(i, T); x.stroke(); }
    return textura(c, [6, 6]);
  })();
}

// Tratamento de imagem: converte o mapa de altura (tons de cinza) em mapa de normal (operador de Sobel).
// O mapa de normal dá relevo real à luz (rebites, juntas, riscos de usinagem, granulado de fundição).
function paraNormal(texAltura, forca = 2.5) {
  const src = texAltura.image, T = src.width, ctx = src.getContext('2d'), d = ctx.getImageData(0, 0, T, T).data;
  const [c, x] = canvas(T), out = x.createImageData(T, T), o = out.data;
  const h = (i, j) => d[(((j + T) % T) * T + ((i + T) % T)) * 4] / 255;
  for (let j = 0; j < T; j++) for (let i = 0; i < T; i++) {
    const dx = (h(i + 1, j - 1) + 2 * h(i + 1, j) + h(i + 1, j + 1)) - (h(i - 1, j - 1) + 2 * h(i - 1, j) + h(i - 1, j + 1));
    const dy = (h(i - 1, j + 1) + 2 * h(i, j + 1) + h(i + 1, j + 1)) - (h(i - 1, j - 1) + 2 * h(i, j - 1) + h(i + 1, j - 1));
    let nx = -dx * forca, ny = -dy * forca, nz = 1; const L = Math.hypot(nx, ny, nz); nx /= L; ny /= L; nz /= L;
    const k = (j * T + i) * 4; o[k] = (nx * 0.5 + 0.5) * 255; o[k + 1] = (ny * 0.5 + 0.5) * 255; o[k + 2] = nz * 255; o[k + 3] = 255;
  }
  x.putImageData(out, 0, 0); const t = textura(c); t.repeat.copy(texAltura.repeat); return t;
}

/* ---------------- texturas pré-processadas (assets/texturas/*.webp) ----------------
   Geradas em alta resolução por ferramentas/assar_texturas.py (altura/rugosidade, normal e cor).
   Abrem rápido (nada é calculado no navegador) e, se o arquivo faltar, cai na versão gerada em canvas. */
const carregador = new THREE.TextureLoader();
const GER = { escovado: () => texEscovado(), fundido: () => texFundido(), painel: () => texPainel(), trancado: () => texTrancado(), calor: () => texCalor() };
const REP = { escovado: [2, 2], fundido: [3, 3], painel: [1, 1], trancado: [6, 6], calor: [1, 1] };
const FORCA = { escovado: 2.5, fundido: 3, painel: 4, trancado: 4, calor: 2 };
const cacheArq = {};
function texArquivo(nome, tipo) {
  const chave = nome + '_' + tipo; if (cacheArq[chave]) return cacheArq[chave];
  const t = carregador.load(`assets/texturas/${chave}.webp`, undefined, undefined, () => { // sem arquivo: versão em canvas
    const g = GER[nome](), alvo = tipo === 'nor' ? paraNormal(g, FORCA[nome]) : g; t.image = alvo.image; t.needsUpdate = true;
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...REP[nome]); t.anisotropy = ANISO;
  t.colorSpace = tipo === 'cor' ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  return (cacheArq[chave] = t);
}

/* ---------------- UV para geometrias sem coordenadas (loft da fuselagem) ---------------- */
function garantirUV(geo) {
  if (geo.attributes.uv || !geo.attributes.position) return;
  geo.computeBoundingBox(); const bb = geo.boundingBox, tam = bb.getSize(new THREE.Vector3());
  const p = geo.attributes.position, uv = new Float32Array(p.count * 2), escala = Math.max(tam.x, tam.y, tam.z) || 1;
  for (let i = 0; i < p.count; i++) { // projeção cilíndrica ao longo do eixo X (eixo longo das aeronaves)
    uv[i * 2] = (p.getX(i) - bb.min.x) / escala * 2.2;
    uv[i * 2 + 1] = (Math.atan2(p.getZ(i), p.getY(i) - (bb.min.y + bb.max.y) / 2) / Math.PI + 1) * 0.9;
  }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
}

/* ---------------- cena: tons, ambiente, sombras ---------------- */
export function prepararCena(renderer, cena, { exposicao = 1.0, sombras = true } = {}) {
  const alta = qualidadeAlta();
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = exposicao;
  const pmrem = new THREE.PMREMGenerator(renderer);
  cena.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  if ('environmentIntensity' in cena) cena.environmentIntensity = 0.8;
  if (sombras && alta) { renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; }
  let principal = null;
  cena.traverse((o) => { if (o.isDirectionalLight && (!principal || o.intensity > principal.intensity)) principal = o; });
  cena.traverse((o) => {
    if (o.isHemisphereLight) o.intensity *= 0.55; // o ambiente de estúdio já ilumina; evita "lavar" as cores
    if (o === principal && sombras && alta) {
      o.castShadow = true; o.shadow.mapSize.set(4096, 4096); o.shadow.bias = -0.0004; o.shadow.normalBias = 0.02; o.shadow.radius = 4;
    }
  });
  ANISO = renderer.capabilities.getMaxAnisotropy?.() || 8;
  if (!alta) renderer.setPixelRatio(1);
  else renderer.setPixelRatio(Math.min(2, Math.max(1.5, devicePixelRatio))); // supersampling leve: bordas e texturas mais definidas
  return { alta };
}
// ajusta o volume da sombra da luz direcional ao tamanho do objeto
export function enquadrarSombra(luz, objeto) {
  if (!luz.castShadow) return;
  const caixa = new THREE.Box3().setFromObject(objeto), r = caixa.getSize(new THREE.Vector3()).length() * 0.6, c = caixa.getCenter(new THREE.Vector3());
  const cam = luz.shadow.camera; cam.left = cam.bottom = -r; cam.right = cam.top = r; cam.near = 0.01; cam.far = r * 8;
  luz.target.position.copy(c); luz.position.copy(c).add(luz.position.clone().normalize().multiplyScalar(r * 3)); luz.target.updateMatrixWorld(); cam.updateProjectionMatrix();
}
// chão que só recebe a sombra (contato visual com o piso)
export function chaoSombra(cena, y, tam = 20) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(tam, tam), new THREE.ShadowMaterial({ opacity: 0.32 }));
  m.rotation.x = -Math.PI / 2; m.position.y = y + 0.002; m.receiveShadow = true; m.renderOrder = -1; cena.add(m); return m;
}

/* ---------------- materiais: enriquecimento no lugar ---------------- */
function enriquecer(m, o) {
  if (!m || m.userData.realcado || !m.isMeshStandardMaterial) return;
  m.userData.realcado = true;
  if (o.rug != null) m.roughness = o.rug;
  if (o.met != null) m.metalness = o.met;
  if (o.rugMap) m.roughnessMap = o.rugMap;
  if (o.nor) { m.normalMap = o.nor; const k = o.bump ?? 0.6; m.normalScale = new THREE.Vector2(k, k); }
  if (o.map) m.map = o.map;
  m.envMapIntensity = o.env ?? 1;
  m.needsUpdate = true;
}

// Motor: usa o nome da paleta gravado em material.name (motor3d.js)
const REGRAS_MOTOR = {
  casca: { met: 0.6, rug: 0.42, tex: 'escovado', env: 0.9 },
  titanio: { met: 0.7, rug: 0.32, tex: 'escovado', env: 1.0 },
  interno: { met: 0.75, rug: 0.3, tex: 'escovado', env: 1.0 },
  rotor: { met: 0.7, rug: 0.35, tex: 'calor', env: 0.9 },
  quente: { met: 0.6, rug: 0.45, tex: 'calor', env: 0.8 },
  caixa: { met: 0.3, rug: 0.65, tex: 'fundido', env: 0.7 },
  suporte: { met: 0.45, rug: 0.55, tex: 'fundido', env: 0.7 },
  cobre: { met: 0.75, rug: 0.35, tex: 'escovado', env: 1.0 },
  mangueira: { met: 0.1, rug: 0.8, tex: 'trancado', env: 0.5 },
  comb: { met: 0.55, rug: 0.4, tex: 'trancado', env: 0.8 },
  oleo: { met: 0.55, rug: 0.4, tex: 'trancado', env: 0.8 },
  escuro: { met: 0.35, rug: 0.6, tex: 'fundido', env: 0.7 },
  ele: { met: 0.15, rug: 0.6, env: 0.5 },
  tela: { met: 0.6, rug: 0.45, env: 0.8 }
};
const TEX = { escovado: texEscovado, fundido: texFundido, calor: texCalor, trancado: texTrancado };

export function realcarMotor(motor) {
  if (!qualidadeAlta()) return;
  for (const id in motor.pecas) {
    const p = motor.pecas[id];
    for (const m of p.mats) {
      const r = REGRAS_MOTOR[m.name] || REGRAS_MOTOR.casca;
      if (r.tex === 'calor') enriquecer(m, { ...r, map: texArquivo('calor', 'cor'), rugMap: texArquivo('calor', 'alt'), nor: texArquivo('escovado', 'nor'), bump: 0.4 });
      else if (r.tex) enriquecer(m, { ...r, rugMap: texArquivo(r.tex, 'alt'), nor: texArquivo(r.tex, 'nor'), bump: r.tex === 'trancado' ? 1.0 : r.tex === 'fundido' ? 0.7 : 0.45 });
      else enriquecer(m, r);
    }
    p.grupo.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  }
}

// Helicóptero: materiais identificados pela tabela M de helicoptero3d.js (userData.papel)
const REGRAS_HELI = {
  casca: { met: 0.2, rug: 0.4, tex: 'painel', env: 1.0, bump: 0.8, forca: 4 },
  casca2: { met: 0.2, rug: 0.42, tex: 'painel', env: 1.0, bump: 0.8, forca: 4 },
  vidro: { met: 0.9, rug: 0.04, env: 1.8 },
  metal: { met: 0.65, rug: 0.38, tex: 'escovado', env: 1.0 },
  motor: { met: 0.65, rug: 0.38, tex: 'escovado', env: 1.0 },
  eixo: { met: 0.6, rug: 0.4, tex: 'escovado', env: 0.9 },
  pa: { met: 0.2, rug: 0.35, env: 1 },
  escuro: { met: 0.5, rug: 0.5, tex: 'fundido', env: 0.8 }
};
export function realcarHelicoptero(heli) {
  if (!qualidadeAlta()) return;
  const raiz = heli.raiz || heli.grupo || heli;
  raiz.traverse((o) => {
    if (!o.isMesh) return;
    o.castShadow = true; o.receiveShadow = true;
    const m = o.userData.base || o.material, r = REGRAS_HELI[m?.userData?.papel];
    if (!r) return;
    if (r.tex) garantirUV(o.geometry);
    enriquecer(m, r.tex ? { ...r, rugMap: texArquivo(r.tex, 'alt'), nor: texArquivo(r.tex, 'nor') } : r);
  });
}

/* ---------------- foto em alta definição (renderiza de novo em resolução maior e baixa PNG) ---------------- */
export function fotoHD(renderer, cena, camera, nome = 'vista3d', alvoLargura = 3840, comp = null) {
  const tam = renderer.getSize(new THREE.Vector2()), prAntes = renderer.getPixelRatio();
  const pr = Math.max(1, alvoLargura / Math.max(1, tam.x));
  renderer.setPixelRatio(pr); renderer.setSize(tam.x, tam.y, false);
  if (comp) { comp.setSize(tam.x, tam.y); comp.render(); } else renderer.render(cena, camera);
  const url = renderer.domElement.toDataURL('image/png');
  renderer.setPixelRatio(prAntes); renderer.setSize(tam.x, tam.y, false);
  if (comp) { comp.setSize(tam.x, tam.y); comp.render(); } else renderer.render(cena, camera);
  const a = document.createElement('a'); a.href = url;
  a.download = `${nome}_${Math.round(tam.x * pr)}x${Math.round(tam.y * pr)}_${new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-')}.png`;
  document.body.append(a); a.click(); a.remove();
}

/* ---------------- pós-processamento (qualidade de imagem) ----------------
   GTAO: sombra de contato entre peças (cantos, frestas, flanges) – é o que mais dá "peso" de objeto real.
   Bloom: brilho da chama, do escape quente e das luzes de aviso.  SMAA: bordas sem serrilhado.  OutputPass: tons ACES + sRGB. */
export async function criarComposicao(renderer, cena, camera, { ao = true, bloom = true } = {}) {
  if (!qualidadeAlta()) return { render: () => renderer.render(cena, camera), setSize: () => {} };
  const [{ EffectComposer }, { RenderPass }, { GTAOPass }, { UnrealBloomPass }, { SMAAPass }, { OutputPass }] = await Promise.all([
    import('three/addons/postprocessing/EffectComposer.js'), import('three/addons/postprocessing/RenderPass.js'),
    import('three/addons/postprocessing/GTAOPass.js'), import('three/addons/postprocessing/UnrealBloomPass.js'),
    import('three/addons/postprocessing/SMAAPass.js'), import('three/addons/postprocessing/OutputPass.js')]);
  const tam = renderer.getSize(new THREE.Vector2()), pr = renderer.getPixelRatio();
  const alvo = new THREE.WebGLRenderTarget(tam.x * pr, tam.y * pr, { type: THREE.HalfFloatType, samples: 4 }); // MSAA 4× + HDR
  const comp = new EffectComposer(renderer, alvo); comp.setPixelRatio(pr); comp.setSize(tam.x, tam.y);
  comp.addPass(new RenderPass(cena, camera));
  let gtao = null;
  if (ao) { gtao = new GTAOPass(cena, camera, tam.x, tam.y); gtao.blendIntensity = 0.85; comp.addPass(gtao); }
  if (bloom) { const b = new UnrealBloomPass(new THREE.Vector2(tam.x, tam.y), 0.22, 0.4, 0.97); comp.addPass(b); }
  comp.addPass(new SMAAPass(tam.x * pr, tam.y * pr));
  comp.addPass(new OutputPass());
  return {
    render: () => comp.render(),
    setSize: (w, h) => { comp.setPixelRatio(renderer.getPixelRatio()); comp.setSize(w, h); if (gtao) gtao.setSize(w, h); }
  };
}

/* ---------------- iluminação real por HDRI (opcional) ----------------
   Coloque um HDRI de estúdio/hangar em assets/hdri/ambiente.hdr (ex.: Poly Haven, licença CC0, 2K):
   reflexos e luz passam a ser os de um ambiente fotografado. Sem o arquivo, fica o estúdio gerado. */
export async function aplicarHDRI(renderer, cena, url = 'assets/hdri/ambiente.hdr') {
  try {
    const r = await fetch(url, { method: 'HEAD', cache: 'no-cache' }); if (!r.ok) return false;
    const { RGBELoader } = await import('three/addons/loaders/RGBELoader.js');
    const tex = await new RGBELoader().loadAsync(url); tex.mapping = THREE.EquirectangularReflectionMapping;
    const pmrem = new THREE.PMREMGenerator(renderer); cena.environment = pmrem.fromEquirectangular(tex).texture; tex.dispose();
    return true;
  } catch { return false; }
}

/* ---------------- resolução adaptativa (velocidade) ----------------
   Mede o tempo dos quadros e ajusta a resolução interna: nítido em computador bom, fluido em computador fraco. */
export function criarAdaptador(renderer, aoMudar) {
  const max = qualidadeAlta() ? Math.min(2, Math.max(1.5, devicePixelRatio)) : 1, min = qualidadeAlta() ? 0.85 : 0.75;
  let pr = renderer.getPixelRatio(), soma = 0, n = 0, espera = 0;
  return (dt) => {
    if (document.hidden) return; soma += dt; n++;
    if (n < 45) return; const media = soma / n; soma = 0; n = 0; if (espera-- > 0) return;
    let novo = pr;
    if (media > 1 / 40 && pr > min) novo = Math.max(min, pr - 0.25);       // abaixo de ~40 fps: reduz
    else if (media < 1 / 58 && pr < max) novo = Math.min(max, pr + 0.25);  // com folga: aumenta a nitidez
    if (novo !== pr) { pr = novo; renderer.setPixelRatio(pr); espera = 2; aoMudar?.(pr); }
  };
}
