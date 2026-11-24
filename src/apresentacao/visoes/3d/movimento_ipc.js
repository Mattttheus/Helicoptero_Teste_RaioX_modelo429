// HeliSense 3D – movimento na figura de catálogo (IPC): as peças se mexem para mostrar como se encaixam e funcionam.
//  · Montagem animada: desmonta e remonta em ciclo (vista explodida que respira)
//  · Mover peças: arraste qualquer peça; ao soltar ela volta ao lugar (ou fica, com "Fixar")
//  · Rotativas: rotores / compressor / turbina giram mesmo com o motor parado
//  · Girar figura: a câmera dá a volta sozinha
// Os deslocamentos são aditivos e guardados no espaço local de cada objeto, então convivem com a lógica de cada página
// (vista explodida do motor, rotores girando, edição) e somem por completo ao desligar.
import * as THREE from 'three';

// fator da montagem animada no tempo t (s): parado montado → desmonta → parado desmontado → remonta (ciclo de 7 s)
export function fatorCiclo(t, periodo = 7) {
  const k = ((t % periodo) + periodo) % periodo / periodo;
  const suave = (x) => x * x * (3 - 2 * x);
  if (k < 1 / 7) return 0;
  if (k < 3 / 7) return suave((k - 1 / 7) / (2 / 7));
  if (k < 5 / 7) return 1;
  return 1 - suave((k - 5 / 7) / (2 / 7));
}

const ESTILO_BT = 'font:600 11px Arial,sans-serif;padding:4px 7px;border:1px solid #333;border-radius:6px;background:#fff;color:#111;cursor:pointer;white-space:nowrap';
const ESTILO_ON = ';background:#0b4a52;color:#fff;border-color:#0b4a52';

/**
 * @param {object} o
 *  vista: elemento onde fica a barrinha de controles · camera · controles (OrbitControls) · dom (canvas)
 *  unidades(): [{ chave, objs: Object3D[] }] – o que se move junto (uma peça / um componente)
 *  explodir?(f): a página posiciona as peças no fator f (0..1); sem ele o módulo afasta cada unidade do centro
 *  fBase?(): fator que a página tinha antes (volta a ele quando a montagem para)
 *  girar?(dt): gira as peças rotativas; podeArrastar?(): false bloqueia o arraste (ex.: modo edição)
 *  topo?(): distância (px) do topo da vista para a barrinha não ficar sob a barra de ferramentas
 *  padrao?: { montagem, mover, rotativas, girarFigura }
 */
export function criarMovimentoIPC(o) {
  const { vista, camera, controles, dom } = o;
  const est = Object.assign({ montagem: true, mover: true, rotativas: true, girarFigura: false, fixar: false }, o.padrao || {});
  let ativo = false, montava = false, tUlt = 0, t = 0, f = 0, unids = [], porMalha = new Map(), centro = new THREE.Vector3(), raio = 1, autoAntes = false;
  const delta = new Map(); // obj → Vector3 local aplicado no quadro anterior
  const v1 = new THREE.Vector3(), v2 = new THREE.Vector3();

  // ---------- barrinha de controles ----------
  const barra = document.createElement('div');
  barra.style.cssText = 'position:absolute;right:10px;z-index:4;display:none;flex-wrap:wrap;justify-content:flex-end;gap:4px;align-items:center;max-width:min(560px, calc(100% - 20px))';
  const BOTOES = [
    ['montagem', '▶ Montagem', 'Desmonta e remonta as peças em ciclo para mostrar como se encaixam'],
    ['mover', '✋ Mover', 'Arraste uma peça com o mouse ou o dedo; ao soltar ela volta ao lugar'],
    ['fixar', '📌 Fixar', 'Com Fixar ligado a peça arrastada fica onde você soltou'],
    ['rotativas', '⚙ Girar peças', 'Gira rotores, compressor e turbina para ver o movimento'],
    ['girarFigura', '⟳ Girar vista', 'A câmera dá a volta na figura sozinha']
  ];
  for (const [k, txt, dica] of BOTOES) {
    if (k === 'rotativas' && !o.girar) continue;
    const b = document.createElement('button'); b.type = 'button'; b.dataset.mov = k; b.textContent = txt; b.title = dica;
    b.onclick = () => { est[k] = !est[k]; pintar(); if (k === 'girarFigura') controles.autoRotate = est[k]; };
    barra.append(b);
  }
  const rep = document.createElement('button'); rep.type = 'button'; rep.textContent = '↺ Repor'; rep.title = 'Volta todas as peças ao lugar';
  rep.onclick = () => { for (const u of unids) u.arr.set(0, 0, 0); est.montagem = false; t = 0; pintar(); };
  barra.append(rep);
  function pintar() {
    for (const b of barra.querySelectorAll('button')) b.style.cssText = ESTILO_BT + (b.dataset.mov && est[b.dataset.mov] ? ESTILO_ON : '');
  }
  pintar(); vista.append(barra);
  function posicionarBarra() { barra.style.top = ((o.topo && o.topo()) || 10) + 'px'; }

  // ---------- unidades ----------
  function montarUnidades() {
    unids = (o.unidades() || []).filter((u) => u.objs && u.objs.length).map((u) => ({ chave: u.chave, objs: u.objs, arr: new THREE.Vector3(), c: new THREE.Vector3(), dir: new THREE.Vector3() }));
    porMalha = new Map(); const tudo = new THREE.Box3(), cx = new THREE.Box3();
    for (const u of unids) {
      cx.makeEmpty(); for (const ob of u.objs) { cx.expandByObject(ob); ob.traverse((m) => { if (m.isMesh) porMalha.set(m, u); }); }
      if (!cx.isEmpty()) { cx.getCenter(u.c); u.tam = cx.getSize(v1).length(); tudo.union(cx); }
    }
    if (tudo.isEmpty()) return;
    tudo.getCenter(centro); raio = Math.max(1e-3, tudo.getSize(v1).length() / 2);
    for (const u of unids) { // direção da desmontagem: para fora do centro (o que está no meio sobe)
      u.dir.copy(u.c).sub(centro); const d = u.dir.length();
      if ((u.tam || 0) > raio * 1.2) u.dir.set(0, 0, 0); // a peça do tamanho do conjunto (fuselagem, carcaça) fica parada como referência
      else if (d < raio * 0.08) u.dir.set(0, 1, 0).multiplyScalar(raio * 0.35); else u.dir.multiplyScalar(0.55).addScaledVector(u.dir.clone().normalize(), raio * 0.3);
    }
  }
  // vetor do mundo → deslocamento no espaço local do pai
  function paraLocal(ob, w, alvo) {
    const p = ob.parent; if (!p) return alvo.copy(w);
    p.updateWorldMatrix(true, false); v2.setFromMatrixPosition(p.matrixWorld);
    alvo.copy(v2).add(w); p.worldToLocal(alvo); const z = p.worldToLocal(v2.clone()); return alvo.sub(z);
  }
  function limpar() { for (const [ob, d] of delta) ob.position.sub(d); delta.clear(); }

  // ---------- arraste ----------
  const ray = new THREE.Raycaster(), mouse = new THREE.Vector2(), plano = new THREE.Plane();
  let arr = null; // { u, p0, a0, id }
  function pontoNoPlano(e, alvo) {
    const b = dom.getBoundingClientRect(); mouse.set(((e.clientX - b.left) / b.width) * 2 - 1, -((e.clientY - b.top) / b.height) * 2 + 1);
    ray.setFromCamera(mouse, camera); return ray.ray.intersectPlane(plano, alvo);
  }
  dom.addEventListener('pointerdown', (e) => {
    if (!ativo || !est.mover || e.button > 0 || (o.podeArrastar && !o.podeArrastar())) return;
    const b = dom.getBoundingClientRect(); mouse.set(((e.clientX - b.left) / b.width) * 2 - 1, -((e.clientY - b.top) / b.height) * 2 + 1);
    ray.setFromCamera(mouse, camera);
    const h = ray.intersectObjects([...porMalha.keys()].filter((m) => { for (let x = m; x; x = x.parent) if (!x.visible) return false; return true; }), false)[0];
    if (!h) return;
    const u = porMalha.get(h.object); if (!u) return;
    plano.setFromNormalAndCoplanarPoint(camera.getWorldDirection(v1).negate(), h.point);
    arr = { u, p0: h.point.clone(), a0: u.arr.clone(), id: e.pointerId };
    controles.enabled = false; dom.setPointerCapture?.(e.pointerId); dom.style.cursor = 'grabbing';
    // sem stopPropagation: a página ainda registra o toque (clique parado continua selecionando a peça)
  }, { capture: true });
  dom.addEventListener('pointermove', (e) => {
    if (!arr || e.pointerId !== arr.id) { if (ativo && est.mover && !arr) dom.style.cursor = ''; return; }
    const p = pontoNoPlano(e, new THREE.Vector3()); if (p) arr.u.arr.copy(arr.a0).add(p.sub(arr.p0));
  });
  const soltar = (e) => { if (!arr || (e && e.pointerId !== arr.id)) return; arr = null; controles.enabled = true; dom.style.cursor = ''; };
  dom.addEventListener('pointerup', soltar); dom.addEventListener('pointercancel', soltar);

  return {
    get ativo() { return ativo; },
    get rotativas() { return ativo && est.rotativas; },
    get arrastando() { return !!arr; },
    estado: est, barra,
    ligar(v) {
      if (v === ativo) return;
      ativo = v; barra.style.display = v ? 'flex' : 'none';
      if (v) { montarUnidades(); posicionarBarra(); t = 0; tUlt = 0; autoAntes = controles.autoRotate; controles.autoRotate = est.girarFigura; o.aoLigar?.(); }
      else { soltar(); limpar(); for (const u of unids) u.arr.set(0, 0, 0); if (o.explodir) o.explodir(o.fBase ? o.fBase() : 0); montava = false; controles.autoRotate = autoAntes; o.aoDesligar?.(); }
    },
    // deslocamento atual (mundo) de uma unidade – para as chamadas numeradas acompanharem a peça
    deslocamento(chave, alvo = new THREE.Vector3()) {
      const u = unids.find((x) => x.chave === chave); if (!ativo || !u) return alvo.set(0, 0, 0);
      return alvo.copy(o.explodir ? u.arr : u.arr.clone().addScaledVector(u.dir, f));
    },
    fator() { return f; },
    atualizar() {
      if (!ativo) return;
      const agora = performance.now(), dt = Math.min(0.5, Math.max(0, (agora - (tUlt || agora)) / 1000)); tUlt = agora; // relógio real: não depende do FPS
      posicionarBarra();
      limpar();
      if (est.montagem && !arr) t += dt;
      f = est.montagem ? fatorCiclo(t) : 0;
      if (o.explodir) { // a página posiciona; ao parar a montagem volta ao que o usuário tinha (fBase)
        if (est.montagem) o.explodir(f); else if (montava) o.explodir(o.fBase ? o.fBase() : 0);
      }
      montava = est.montagem;
      if (est.rotativas && o.girar) o.girar(dt);
      const k = 1 - Math.exp(-dt * 6); // volta da peça solta: amortecida
      for (const u of unids) {
        if (!est.fixar && (!arr || arr.u !== u) && u.arr.lengthSq() > 1e-10) u.arr.multiplyScalar(1 - k);
        v1.copy(u.arr); if (!o.explodir) v1.addScaledVector(u.dir, f);
        if (v1.lengthSq() < 1e-12) continue;
        for (const ob of u.objs) { const d = paraLocal(ob, v1, new THREE.Vector3()); ob.position.add(d); delta.set(ob, d); }
      }
    },
    remontar() { montarUnidades(); },
    // diagnóstico: peças deslocadas pelo arraste (chave → distância)
    deslocadas() { return unids.filter((u) => u.arr.length() > 1e-4).map((u) => [u.chave, +u.arr.length().toFixed(4)]); },
    total() { return unids.length; }
  };
}
