// Bell 429 – manual interativo: cena 3D, seleção de componentes e abas do manual.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { construirHelicoptero } from './modelo.js';

const { COMPS, ZONAS, ZC, KW, EXEMPLOS, MPI, ANAC, CONTROLE, SENSORES } = window.B429;
const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const guarda = {
  ler(k, pad) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : pad; } catch { return pad; } },
  salvar(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* armazenamento indisponível */ } }
};

/* =====================================================================
   Cena 3D
   ===================================================================== */
const vista = $('#vista');
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
vista.prepend(renderer.domElement);
const cena = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 200);
const VISTA_GERAL = { pos: new THREE.Vector3(9.5, 5.2, 12.5), alvo: new THREE.Vector3(-1.6, 1.8, 0) };
camera.position.copy(VISTA_GERAL.pos);
const controles = new OrbitControls(camera, renderer.domElement);
controles.target.copy(VISTA_GERAL.alvo); controles.enableDamping = true; controles.minDistance = 1.2; controles.maxDistance = 45;

cena.add(new THREE.HemisphereLight(0xdfe9ff, 0x2a2f38, 1.15));
const sol = new THREE.DirectionalLight(0xffffff, 1.5); sol.position.set(6, 12, 8); cena.add(sol);
const contra = new THREE.DirectionalLight(0x9fc0ff, 0.5); contra.position.set(-8, 4, -9); cena.add(contra);
const grade = new THREE.GridHelper(40, 40, 0x2b3646, 0x1a222e); grade.position.set(-2, 0, 0); cena.add(grade);

const heli = construirHelicoptero();
cena.add(heli.raiz);
heli.raiz.updateMatrixWorld(true);
const info = {};
for (const id in heli.partes) {
  const caixa = new THREE.Box3(); heli.partes[id].forEach((m) => caixa.expandByObject(m));
  info[id] = { caixa, centro: caixa.getCenter(new THREE.Vector3()) };
}

const matDestaque = new THREE.MeshStandardMaterial({ color: 0xff8a2a, emissive: 0xff5a00, emissiveIntensity: 0.7, roughness: 0.45, side: THREE.DoubleSide });
const matFantasma = new THREE.MeshStandardMaterial({ color: 0x9db3c9, transparent: true, opacity: 0.12, depthWrite: false, side: THREE.DoubleSide, roughness: 0.9 });

const matSaude = {
  ok: new THREE.MeshStandardMaterial({ color: 0x3fc98a, emissive: 0x0f7a45, emissiveIntensity: 0.5, roughness: 0.5, side: THREE.DoubleSide }),
  al: new THREE.MeshStandardMaterial({ color: 0xf0b83c, emissive: 0xa86a00, emissiveIntensity: 0.7, roughness: 0.5, side: THREE.DoubleSide }),
  cr: new THREE.MeshStandardMaterial({ color: 0xef4d4d, emissive: 0xc01010, emissiveIntensity: 0.9, roughness: 0.5, side: THREE.DoubleSide }),
  sem: new THREE.MeshStandardMaterial({ color: 0x7c8794, roughness: 0.7, side: THREE.DoubleSide }),
  // revestimento em condição normal fica translúcido para deixar ver os componentes internos
  cascaOk: new THREE.MeshStandardMaterial({ color: 0x4fd69a, transparent: true, opacity: 0.16, depthWrite: false, roughness: 0.8, side: THREE.DoubleSide })
};

const sel = new Set();
let raiox = false, girar = false, mapaSaude = false;
let saudeComp = {};   // componente -> 'ok' | 'al' | 'cr' | 'sem' (preenchido pela telemetria)

function aplicarMateriais() {
  const tem = sel.size > 0;
  for (const m of heli.malhas) {
    const id = m.userData.comp;
    if (tem) m.material = sel.has(id) ? matDestaque : matFantasma;
    else if (mapaSaude) m.material = !saudeComp[id] ? matFantasma : COMPS[id].shell && saudeComp[id] === 'ok' ? matSaude.cascaOk : matSaude[saudeComp[id]];
    else m.material = raiox && COMPS[id].shell ? matFantasma : m.userData.base;
    m.renderOrder = m.material.transparent && m.material.depthWrite === false ? 2 : 0;
  }
  heli.matLinha.opacity = tem || raiox || mapaSaude ? 0.18 : 0.6;
}

function selecionar(ids, { foco = true } = {}) {
  sel.clear();
  for (const id of ids || []) if (heli.partes[id]) sel.add(id);
  aplicarMateriais(); montarRotulos(); barraSelecao();
  if (foco && sel.size) focar();
}

/* ---------- Câmera ---------- */
let voo = null;
function voar(pos, alvo, dur = 900) { voo = { t0: performance.now(), dur, p0: camera.position.clone(), p1: pos, a0: controles.target.clone(), a1: alvo }; }
controles.addEventListener('start', () => { voo = null; });
function focar() {
  const caixa = new THREE.Box3(), dir = new THREE.Vector3();
  for (const id of sel) { caixa.union(info[id].caixa); if (COMPS[id].v) dir.add(new THREE.Vector3(...COMPS[id].v).normalize()); }
  if (dir.lengthSq() < 0.05) dir.copy(camera.position).sub(controles.target);
  dir.normalize();
  const c = caixa.getCenter(new THREE.Vector3()), r = caixa.getSize(new THREE.Vector3()).length() / 2;
  const fv = THREE.MathUtils.degToRad(camera.fov) / 2, fh = Math.atan(Math.tan(fv) * camera.aspect);
  voar(c.clone().addScaledVector(dir, Math.max(r / Math.sin(Math.min(fv, fh)) * 1.15, 7)), c);
}
// Vista geral enquadrada conforme a proporção da tela
function vistaGeral(animar = true) {
  const dir = VISTA_GERAL.pos.clone().sub(VISTA_GERAL.alvo).normalize();
  const fv = THREE.MathUtils.degToRad(camera.fov) / 2, fh = Math.atan(Math.tan(fv) * camera.aspect);
  const pos = VISTA_GERAL.alvo.clone().addScaledVector(dir, 5.3 / Math.sin(Math.min(fv, fh)));
  if (animar) voar(pos, VISTA_GERAL.alvo.clone()); else { camera.position.copy(pos); controles.target.copy(VISTA_GERAL.alvo); }
}

/* ---------- Rótulos e barra de seleção ---------- */
const elRotulos = $('#rotulos');
let rotulos = [];
function montarRotulos() {
  elRotulos.innerHTML = ''; rotulos = [];
  if (sel.size > 9) return;
  for (const id of sel) { const d = document.createElement('div'); d.className = 'rotulo'; d.textContent = COMPS[id].n; elRotulos.append(d); rotulos.push({ id, d }); }
}
const pv = new THREE.Vector3();
function posicionarRotulos() {
  const w = vista.clientWidth, h = vista.clientHeight;
  for (const r of rotulos) {
    pv.copy(info[r.id].centro).project(camera);
    r.d.style.display = pv.z > 1 ? 'none' : '';
    r.d.style.left = ((pv.x * 0.5 + 0.5) * w) + 'px'; r.d.style.top = ((-pv.y * 0.5 + 0.5) * h) + 'px';
  }
}
function barraSelecao() {
  const el = $('#selbar');
  if (!sel.size) { el.hidden = true; return; }
  el.hidden = false;
  const nomes = [...sel].map((id) => COMPS[id].n);
  el.innerHTML = `<b>Onde vamos mexer:</b> ${esc(nomes.slice(0, 4).join(' · '))}${nomes.length > 4 ? ` · +${nomes.length - 4}` : ''}<button class="bt mini" id="btLimpar">Limpar</button>`;
}
$('#selbar').addEventListener('click', (e) => { if (e.target.id === 'btLimpar') { selecionar([]); marcarAtivo(null); } });

/* ---------- Clique e passagem do mouse ---------- */
const raio = new THREE.Raycaster(), mouse = new THREE.Vector2();
function compSobCursor(ev) {
  const r = renderer.domElement.getBoundingClientRect();
  mouse.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
  raio.setFromCamera(mouse, camera);
  const hits = raio.intersectObjects(heli.malhas, false);
  const h = hits.find((x) => x.object.material !== matFantasma) || hits[0];
  return h ? h.object.userData.comp : null;
}
let baixo = null;
renderer.domElement.addEventListener('pointerdown', (e) => { baixo = [e.clientX, e.clientY]; });
renderer.domElement.addEventListener('pointerup', (e) => {
  if (!baixo || Math.hypot(e.clientX - baixo[0], e.clientY - baixo[1]) > 5) return;
  const id = compSobCursor(e);
  if (id) { selecionar([id], { foco: false }); abrirAba('sistemas'); desenhar.sistemas(id); }
});
const dica = $('#dica');
renderer.domElement.addEventListener('pointermove', (e) => {
  if (e.buttons) { dica.hidden = true; return; }
  const id = compSobCursor(e);
  dica.hidden = !id; renderer.domElement.style.cursor = id ? 'pointer' : 'grab';
  if (id) { const r = vista.getBoundingClientRect(); dica.textContent = `${COMPS[id].n} · ATA ${COMPS[id].ata}`; dica.style.left = (e.clientX - r.left + 14) + 'px'; dica.style.top = (e.clientY - r.top + 14) + 'px'; }
});
renderer.domElement.addEventListener('pointerleave', () => { dica.hidden = true; });

/* ---------- Barra de ferramentas ---------- */
$('#btRaiox').onclick = (e) => { raiox = !raiox; e.currentTarget.classList.toggle('on', raiox); aplicarMateriais(); };
$('#btGirar').onclick = (e) => { girar = !girar; e.currentTarget.classList.toggle('on', girar); };
function ligarMapaSaude(v) { mapaSaude = v; $('#btSaude').classList.toggle('on', v); if (v && sel.size) selecionar([], { foco: false }); else aplicarMateriais(); }
$('#btSaude').onclick = () => ligarMapaSaude(!mapaSaude);
$('#btGeral').onclick = () => vistaGeral();

/* ---------- Laço de desenho ---------- */
function ajustar() { const w = vista.clientWidth, h = vista.clientHeight; if (!w || !h) return; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
new ResizeObserver(ajustar).observe(vista); ajustar(); vistaGeral(false);
const relogio = new THREE.Clock();
renderer.setAnimationLoop(() => {
  const dt = Math.min(relogio.getDelta(), 0.05), t = relogio.elapsedTime;
  if (voo) {
    const k = Math.min((performance.now() - voo.t0) / voo.dur, 1), s = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
    camera.position.lerpVectors(voo.p0, voo.p1, s); controles.target.lerpVectors(voo.a0, voo.a1, s);
    if (k >= 1) voo = null;
  }
  if (girar) { heli.rotorP.rotation.y += dt * 5; heli.rotorC.rotation.z += dt * 22; }
  matDestaque.emissiveIntensity = 0.55 + 0.35 * Math.sin(t * 4);
  matSaude.cr.emissiveIntensity = 0.6 + 0.5 * Math.sin(t * 6);
  controles.update(); renderer.render(cena, camera); posicionarRotulos();
});

/* =====================================================================
   Índice de tarefas do MPI
   ===================================================================== */
const compsDeZonas = (z) => { const o = new Set(); for (const n of String(z).match(/\d{3}/g) || []) (ZC[n] || []).forEach((c) => o.add(c)); if (/(\d{3})–(\d{3})/.test(z)) { const [, a, b] = z.match(/(\d{3})–(\d{3})/); for (let n = +a; n <= +b; n++) (ZC[n] || []).forEach((c) => o.add(c)); } return [...o]; };
const compsTarefa = (t, g) => t[4] || g.c || compsDeZonas(t[3]);
const TAREFAS = [];
for (const ins of MPI.INSPECOES) for (const g of ins.g) for (const t of g.t) TAREFAS.push({ ins, g, t, comps: compsTarefa(t, g) });
const nomeZonas = (z) => (String(z).match(/\d{3}/g) || []).map((n) => `${n} – ${ZONAS[n] || ''}`).join('\n');

/* =====================================================================
   Interpretação do texto livre ("descrever a manutenção")
   ===================================================================== */
const VAZIAS = new Set('de do da dos das o a os as e em no na nos nas para por com um uma ao aos n nr numero the of'.split(' '));
function raizPalavra(w) {
  if (/^\d+$/.test(w)) return w;
  if (w.length > 4 && w.endsWith('oes')) return w.slice(0, -3) + 'ao';
  if (w.length > 4 && (w.endsWith('ais') || w.endsWith('eis'))) return w.slice(0, -2) + 'l';
  if (w.length > 4 && /[rz]es$/.test(w)) return w.slice(0, -2);
  if (w.length > 3 && w.endsWith('s')) return w.slice(0, -1);
  return w;
}
const normalizar = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/([a-z])(\d)/g, '$1 $2').replace(/(\d)([a-z])/g, '$1 $2')
  .split(/[^a-z0-9]+/).filter((w) => w && !VAZIAS.has(w)).map(raizPalavra);
function distancia(a, b) {
  if (Math.abs(a.length - b.length) > 2) return 9;
  let ant = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) { const at = [i]; for (let j = 1; j <= b.length; j++) at[j] = Math.min(ant[j] + 1, at[j - 1] + 1, ant[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); ant = at; }
  return ant[b.length];
}
function parecido(a, b) {
  if (a === b) return true;
  const m = Math.min(a.length, b.length);
  if (m < 7 || /\d/.test(a + b)) return false;
  return distancia(a, b) <= (m >= 10 ? 2 : 1);
}
const VOCAB = [];
for (const [frases, ids, gen] of KW) for (const f of frases.split('|')) { const p = normalizar(f); if (p.length) VOCAB.push({ p, ids, gen: !!gen, txt: f }); }

function analisar(texto) {
  const T = normalizar(texto), achados = [];
  for (const k of VOCAB) for (let i = 0; i + k.p.length <= T.length; i++) if (k.p.every((w, j) => parecido(T[i + j], w))) achados.push({ s: i, e: i + k.p.length, k });
  const validos = achados.filter((m) => !achados.some((o) => o !== m && o.e - o.s > m.e - m.s && o.s <= m.s && o.e >= m.e));
  const esp = validos.filter((m) => !m.k.gen).map((m) => ({ ids: [...m.k.ids], txt: [m.k.txt] }));
  const termos = {}, saida = new Set();
  const nota = (id, txt) => { (termos[id] ??= new Set()).add(txt); saida.add(id); };
  for (const g of validos.filter((m) => m.k.gen)) {
    let usou = false;
    for (const s of esp) { const inter = s.ids.filter((id) => g.k.ids.includes(id)); if (inter.length) { s.ids = inter; s.txt.push(g.k.txt); usou = true; } }
    if (!usou) g.k.ids.forEach((id) => nota(id, g.k.txt));
  }
  for (const s of esp) s.ids.forEach((id) => s.txt.forEach((t) => nota(id, t)));
  // "motor 2", "porta do piloto"...: citar só um lado de um par descarta o outro lado
  const unicos = new Set(esp.filter((s) => s.ids.length === 1).map((s) => s.ids[0]));
  for (const id of unicos) { const par = COMPS[id].par; if (par && !unicos.has(par)) saida.delete(par); }
  const tem = (lista) => T.some((t) => lista.some((w) => parecido(t, w)));
  const esq = tem(['esquerdo', 'lh', 'esq', 'left']), dir = tem(['direito', 'rh', 'right']);
  if (esq !== dir) for (const id of [...saida]) { const c = COMPS[id]; if (c.side === (esq ? 'R' : 'L') && c.par && saida.has(c.par)) saida.delete(id); }
  // tarefas do manual relacionadas, ordenadas por palavras em comum
  const chave = new Set(T.filter((w) => w.length >= 4));
  const rel = TAREFAS.filter((x) => x.comps.some((c) => saida.has(c)))
    .map((x) => ({ x, p: normalizar(x.t[1]).filter((w) => chave.has(w)).length }))
    .sort((a, b) => b.p - a.p).slice(0, 8).map((o) => o.x);
  return { ids: [...saida].sort((a, b) => COMPS[a].ata.localeCompare(COMPS[b].ata)), termos, rel };
}

/* =====================================================================
   Blocos de HTML reutilizados
   ===================================================================== */
const feitos = guarda.ler('b429_check', {});
function itemTarefa(x, { check = false, origem = false } = {}) {
  const [num, desc, acesso, zonas] = x.t, chave = x.ins.id + ':' + num, ok = !!feitos[chave];
  return `<div class="item${ok && check ? ' feito' : ''}${x.comps.length ? '' : ' semloc'}" data-comps="${x.comps.join(',')}">
    ${check ? `<input type="checkbox" data-check="${esc(chave)}" ${ok ? 'checked' : ''} title="Marcar como executada">` : '<span></span>'}
    <div><span class="num">${esc(num)}</span>${origem ? ` <span class="tag lar" data-insp="${x.ins.id}" title="Abrir esta inspeção">${esc(x.ins.nome)}</span>` : ''}
      <div class="desc">${esc(desc)}</div>
      <div class="meta"><b>Acesso:</b> ${esc(acesso)} · <b title="${esc(nomeZonas(zonas))}">Zona:</b> <span title="${esc(nomeZonas(zonas))}">${esc(zonas)}</span></div></div></div>`;
}
function cartaoComp(id, termos) {
  const c = COMPS[id];
  return `<div class="cartao clic" data-comps="${id}"><div class="tit"><span>${esc(c.n)}</span><span class="tag">ATA ${c.ata}</span></div>
    <div class="sub">Zona ${esc(c.z)} — ${esc(c.o)}</div>${termos ? `<div class="termo">reconhecido: ${[...termos].map(esc).join(', ')}</div>` : ''}</div>`;
}
function marcarAtivo(el) { document.querySelectorAll('#conteudo .ativo').forEach((e) => e.classList.remove('ativo')); if (el) el.classList.add('ativo'); }

/* =====================================================================
   Abas
   ===================================================================== */
const conteudo = $('#conteudo');
const desenhar = {};
let abaAtual = 'descrever';
function abrirAba(nome) {
  abaAtual = nome;
  document.querySelectorAll('#abas button').forEach((b) => b.classList.toggle('ativa', b.dataset.aba === nome));
  desenhar[nome](); conteudo.scrollTop = 0;
}
$('#abas').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) abrirAba(b.dataset.aba); });

/* ---------- Descrever ---------- */
let ultimoTexto = '';
desenhar.descrever = () => {
  const salvas = guarda.ler('b429_tarefas', []);
  conteudo.innerHTML = `<h2>Descreva a manutenção a ser realizada</h2>
    <textarea id="txt" placeholder="Ex.: trocar o óleo da caixa do rotor de cauda e inspecionar os pitch links">${esc(ultimoTexto)}</textarea>
    <div class="linha"><button class="bt pri" id="btMostrar">Mostrar no modelo</button><button class="bt" id="btSalvar">Salvar tarefa</button><span class="nota">Ctrl+Enter</span></div>
    <h3>Exemplos</h3><div class="chips">${EXEMPLOS.map((x) => `<span class="chip" data-ex="${esc(x)}">${esc(x)}</span>`).join('')}</div>
    <div id="resultado"></div>
    <h3>Tarefas salvas</h3><div id="salvas">${salvas.length ? salvas.map((s, i) => `<div class="cartao clic" data-salva="${i}"><div class="tit"><span>${esc(s)}</span><button class="bt mini" data-apagar="${i}">×</button></div></div>`).join('') : '<p class="nota">Nenhuma tarefa salva neste navegador.</p>'}</div>`;
  if (ultimoTexto) mostrarAnalise(false);
};
function mostrarAnalise(foco = true) {
  const r = analisar(ultimoTexto), el = $('#resultado'); if (!el) return;
  selecionar(r.ids, { foco });
  if (!r.ids.length) { el.innerHTML = `<h3>Onde vamos mexer</h3><p class="nota">Não reconheci nenhum componente nesse texto. Use o nome do sistema ou da peça (ex.: “transmissão”, “rotor de cauda”, “bateria”, “tubo transversal”) ou o capítulo ATA (ex.: “ATA 63”).</p>`; return; }
  el.innerHTML = `<h3>Onde vamos mexer (${r.ids.length})</h3>${r.ids.map((id) => cartaoComp(id, r.termos[id])).join('')}
    ${r.rel.length ? `<h3>Tarefas do BHT-429-MPI relacionadas</h3>${r.rel.map((x) => itemTarefa(x, { origem: true })).join('')}` : ''}`;
}

/* ---------- Inspeções ---------- */
let inspAtual = MPI.INSPECOES[1].id;
desenhar.inspecoes = (id) => {
  if (id) inspAtual = id;
  const ins = MPI.INSPECOES.find((i) => i.id === inspAtual), lista = TAREFAS.filter((x) => x.ins === ins);
  const todos = [...new Set(lista.flatMap((x) => x.comps))];
  conteudo.innerHTML = `<h2>Inspeções programadas e especiais</h2>
    <select id="selInsp">${MPI.INSPECOES.map((i) => `<option value="${i.id}" ${i === ins ? 'selected' : ''}>${esc(i.nome)}</option>`).join('')}</select>
    <p class="nota">${esc(ins.nota)} · DMC 429-A-${esc(ins.dmc)}</p>
    <div class="prog"><i id="barraProg"></i></div><p class="nota" id="txtProg"></p>
    <div class="linha"><button class="bt pri" data-comps="${todos.join(',')}">Mostrar todas as áreas</button><button class="bt" id="btZerar">Zerar marcações</button></div>
    ${ins.prep ? `<h3>Preparação – painéis a remover</h3><p class="nota">${esc(ins.prep)} (429-MM Cap. 53)</p>` : ''}
    ${ins.g.map((g) => `<h3>${esc(g.s)}</h3>${lista.filter((x) => x.g === g).map((x) => itemTarefa(x, { check: true })).join('')}`).join('')}
    <h3>Itens gerais (toda inspeção)</h3>${MPI.GERAL.map((t, i) => { const k = ins.id + ':G' + i; return `<div class="item${feitos[k] ? ' feito' : ''}"><input type="checkbox" data-check="${k}" ${feitos[k] ? 'checked' : ''}><div class="desc">${esc(t)}</div></div>`; }).join('')}
    <p class="nota">Tolerância BHT para inspeções programadas: 10% do intervalo, até 100 h / 30 dias, o que for menor. Não se aplica a peças com vida limite.</p>`;
  progresso();
};
function progresso() {
  const cs = conteudo.querySelectorAll('[data-check]'); if (!cs.length || !$('#barraProg')) return;
  const n = [...cs].filter((c) => c.checked).length;
  $('#barraProg').style.width = (100 * n / cs.length) + '%'; $('#txtProg').textContent = `${n} de ${cs.length} itens marcados (salvo neste navegador)`;
}

/* ---------- Controle por horas ---------- */
desenhar.controle = () => {
  const st = guarda.ler('b429_ctrl', { mat: '', tsn: 0, media: 30, ult: {}, extra: [] });
  const linhas = [...CONTROLE, ...st.extra].sort((a, b) => a.h - b.h), hoje = new Date();
  const corpo = linhas.map((l) => {
    const ult = +st.ult[l.id] || 0, prox = ult + l.h, resta = prox - st.tsn, tol = l.origem === 'mpi' ? Math.min(l.h * 0.1, 100) : 0;
    const uso = Math.max(0, Math.min(1, (st.tsn - ult) / l.h));
    const sit = st.ult[l.id] == null ? ['', 'INFORMAR ÚLTIMA EXECUÇÃO'] : resta < -tol ? ['er', 'VENCIDA'] : resta < 0 ? ['al', 'NA TOLERÂNCIA'] : resta <= l.h * 0.1 ? ['al', 'PRÓXIMA'] : ['ok', 'EM DIA'];
    const prev = st.media > 0 && resta > 0 ? new Date(hoje.getTime() + (resta / st.media) * 30 * 864e5).toLocaleDateString('pt-BR') : '—';
    return `<div class="cartao"><div class="tit"><span>${esc(l.nome)}</span><span class="tag ${sit[0]}">${sit[1]}</span></div>
      <div class="sub">${l.origem === 'mpi' ? 'BHT-429-MPI' : 'Definida pelo operador' + (l.obs ? ' · ' + esc(l.obs) : '')} · vence com <b>${prox.toFixed(1)} h</b> · restam <b>${resta.toFixed(1)} h</b> · previsão ${prev}</div>
      <div class="prog ${sit[0] === 'ok' ? '' : sit[0]}"><i style="width:${uso * 100}%"></i></div>
      <div class="linha"><span class="nota">Última execução (h):</span><input type="number" step="0.1" style="width:96px" data-ult="${l.id}" value="${st.ult[l.id] ?? ''}" placeholder="—">
        <button class="bt mini" data-feita="${l.id}">Feita agora</button>${l.insp ? `<button class="bt mini" data-insp="${l.insp}">Ver tarefas</button>` : ''}${l.extra ? `<button class="bt mini" data-remover="${l.id}">Remover</button>` : ''}</div></div>`;
  }).join('');
  conteudo.innerHTML = `<h2>Controle de manutenção por horas de voo</h2>
    <div class="grade"><div><label>Matrícula</label><input type="text" id="cMat" value="${esc(st.mat)}" placeholder="PR-XXX"></div>
      <div><label>Horas totais (célula)</label><input type="number" step="0.1" id="cTsn" value="${st.tsn}"></div>
      <div><label>Média h/mês</label><input type="number" step="1" id="cMedia" value="${st.media}"></div></div>
    <p class="nota">A previsão de data usa a média de horas voadas por mês (manutenção preditiva de calendário). Tolerância de 10% (máx. 100 h) só nas inspeções do MPI.</p>
    ${corpo}
    <h3>Adicionar intervalo do operador</h3>
    <div class="linha"><input type="text" id="nNome" placeholder="Nome (ex.: lavagem de compressor)" style="flex:1;min-width:150px"><input type="number" id="nHoras" placeholder="horas" style="width:90px"><button class="bt" id="btAdd">Adicionar</button></div>
    <p class="nota">O BHT-429-MPI (Issue 2) não define inspeções de célula de 10, 30, 40 ou 100 h para o Bell 429: elas aparecem aqui como controles do operador (programa de manutenção aprovado, manual do motor P&amp;WC, kits, AD/ASB repetitivas ou RBAC 91.409). Ajuste ao programa da sua aeronave.</p>
    <h3>Controle por RIN (trem de pouso de esquis)</h3>
    <div class="grade"><div><label>Pousos normais</label><input type="number" id="rN" value="${st.rin?.[0] ?? 0}"></div><div><label>Pousos corridos</label><input type="number" id="rC" value="${st.rin?.[1] ?? 0}"></div><div><label>Autorrotações</label><input type="number" id="rA" value="${st.rin?.[2] ?? 0}"></div></div>
    ${MPI.RIN.map((r) => { const v = r.f[0] * (st.rin?.[0] || 0) + r.f[1] * (st.rin?.[1] || 0) + r.f[2] * (st.rin?.[2] || 0), u = Math.min(1, v / r.lim);
      return `<div class="cartao clic" data-comps="${r.id}"><div class="tit"><span>${esc(r.n)}</span><span class="tag ${u >= 1 ? 'er' : u > 0.9 ? 'al' : 'ok'}">${v.toLocaleString('pt-BR')} / ${r.lim.toLocaleString('pt-BR')} RIN</span></div>
        <div class="sub">+${r.f[0]} por pouso normal · +${r.f[1]} por pouso corrido · +${r.f[2]} por autorrotação</div><div class="prog ${u >= 1 ? 'er' : u > 0.9 ? 'al' : ''}"><i style="width:${u * 100}%"></i></div></div>`; }).join('')}`;
};
function salvarControle(mut) { const st = guarda.ler('b429_ctrl', { mat: '', tsn: 0, media: 30, ult: {}, extra: [] }); mut(st); guarda.salvar('b429_ctrl', st); desenhar.controle(); }

/* ---------- Limites de aeronavegabilidade ---------- */
desenhar.limites = () => {
  conteudo.innerHTML = `<h2>Limites de aeronavegabilidade (Cap. 04)</h2>
    <p class="nota">Vida máxima obrigatória em horas, anos ou RIN. Peças fora da lista têm vida ilimitada. O limite vale para os dash numbers sucessivos, salvo indicação.</p>
    ${MPI.LIMITES.map((g) => `<h3>${esc(g.s)}</h3><table><tr><th>Peça</th><th>P/N</th><th>Vida</th></tr>${g.i.map((i) => `<tr class="clic" data-comps="${(i[3] || g.c || []).join(',')}"><td>${esc(i[0])}</td><td class="pn">${esc(i[1])}</td><td><b>${esc(i[2])}</b></td></tr>`).join('')}</table>`).join('')}
    <h3>Limite de inspeção (Tabela 2)</h3><table><tr class="clic" data-comps="cubo_rp"><td>Main Rotor Yoke Assembly</td><td class="pn">429-010-103-101</td><td><b>Inspeção a cada 50 h</b></td></tr></table>
    <p class="nota">RIN (Retirement Index Number): o piloto registra os eventos e a manutenção soma os fatores de cada componente – veja a calculadora na aba Controle.</p>`;
};

/* ---------- Eventos (inspeções condicionais) ---------- */
let eventoAtual = MPI.EVENTOS[0].id;
desenhar.eventos = () => {
  const ev = MPI.EVENTOS.find((e) => e.id === eventoAtual), todos = [...new Set(ev.a.flatMap((a) => a[1]))];
  conteudo.innerHTML = `<h2>Inspeções condicionais (após evento)</h2>
    <select id="selEvento">${MPI.EVENTOS.map((e) => `<option value="${e.id}" ${e === ev ? 'selected' : ''}>${esc(e.n)}</option>`).join('')}</select>
    <p class="nota">${esc(ev.r)}</p>
    <div class="linha"><button class="bt pri" data-comps="${todos.join(',')}">Mostrar todas as áreas afetadas</button></div>
    <h3>Áreas a inspecionar</h3>
    ${ev.a.map((a) => `<div class="cartao clic" data-comps="${a[1].join(',')}"><div class="tit"><span>${esc(a[0])}</span></div><div class="sub">${esc(a[2])}</div></div>`).join('')}
    <p class="nota">Componentes removidos recebem etiqueta “removido de serviço por …” e são avaliados em conjunto. Em caso de dúvida, contatar a Product Support Engineering da Bell.</p>`;
};

/* ---------- ANAC ---------- */
desenhar.anac = () => {
  conteudo.innerHTML = `<h2>Regulamentação ANAC e controle de manutenção</h2>
    <p class="nota">Resumo orientativo para treinamento – não é texto legal. Consulte sempre a emenda vigente dos RBAC e das Instruções Suplementares em anac.gov.br.</p>
    ${ANAC.map((g) => `<h3>${esc(g.g)}</h3>${g.i.map((i) => `<div class="cartao${i.c ? ' clic' : ''}" ${i.c ? `data-comps="${i.c.join(',')}"` : ''}><div class="tit"><span>${esc(i.ref)}</span>${i.l ? `<span class="tag lar" data-insp="${i.l}">ver no MPI</span>` : ''}</div><div class="sub">${esc(i.t)}</div></div>`).join('')}`).join('')}`;
};

/* ---------- Sistemas ---------- */
desenhar.sistemas = (idSel) => {
  const ids = Object.keys(COMPS).sort((a, b) => COMPS[a].ata.localeCompare(COMPS[b].ata) || COMPS[a].n.localeCompare(COMPS[b].n));
  let ficha = '';
  if (idSel) {
    const rel = TAREFAS.filter((x) => x.comps.includes(idSel));
    ficha = `<h2>Ficha do componente</h2>${cartaoComp(idSel)}
      <h3>Tarefas do MPI neste componente (${rel.length})</h3>${rel.length ? rel.slice(0, 40).map((x) => itemTarefa(x, { origem: true })).join('') : '<p class="nota">Nenhuma tarefa específica cadastrada nesta demonstração.</p>'}`;
  }
  conteudo.innerHTML = `${ficha}<h2 style="margin-top:${idSel ? 18 : 0}px">Todos os sistemas (por capítulo ATA)</h2>
    ${ids.map((id) => `<div class="item${id === idSel ? ' ativo' : ''}" data-ficha="${id}"><span class="tag">ATA ${COMPS[id].ata}</span><div class="desc">${esc(COMPS[id].n)}<div class="meta">Zona ${esc(COMPS[id].z)}</div></div></div>`).join('')}`;
};

/* ---------- Sensores IoT (monitoramento de condição) ---------- */
const iot = guarda.ler('b429_iot', { modo: 'sim', url: 'api/telemetria.php' });
const leit = {};          // id -> { v, t (ms), hist: [] }
const falha = new Set();  // sensores com falha simulada
let conexao = 'simulação';
// em modo "sensores reais", quem ainda não enviou leitura aparece como SEM SINAL
function zerarLeituras() { for (const s of SENSORES) leit[s.id] = { v: s.base, t: iot.modo === 'sim' ? Date.now() : 0, hist: [] }; }
zerarLeituras();

function estado(s) {
  const l = leit[s.id];
  if (Date.now() - l.t > 30000) return 'sem';
  if (s.tipo === 'bool') return l.v >= 1 ? 'cr' : 'ok';
  if (s.tipo === 'max') return l.v >= s.cr ? 'cr' : l.v >= s.al ? 'al' : 'ok';
  return l.v <= s.cr ? 'cr' : l.v <= s.al ? 'al' : 'ok';
}
const ROT = { ok: ['ok', 'NORMAL'], al: ['al', 'ALERTA'], cr: ['er', 'CRÍTICO'], sem: ['', 'SEM SINAL'] };
const fmt = (s, v) => (s.tipo === 'bool' ? (v >= 1 ? 'DETECTADO' : 'limpo') : v.toLocaleString('pt-BR', { maximumFractionDigits: s.base < 2 ? 2 : 1 }) + ' ' + s.un);
function registrar(s, v, t = Date.now()) { const l = leit[s.id]; l.v = v; l.t = t; l.hist.push(v); if (l.hist.length > 60) l.hist.shift(); }

function passoSimulado() {
  for (const s of SENSORES) {
    const l = leit[s.id];
    if (s.tipo === 'bool') { registrar(s, falha.has(s.id) ? 1 : 0); continue; }
    const alvo = falha.has(s.id) ? s.cr + (s.cr - s.al) * 0.35 * (s.tipo === 'max' ? 1 : -1) : s.base;
    registrar(s, l.v + (alvo - l.v) * 0.12 + (Math.random() - 0.5) * s.ruido);
  }
}
async function passoRemoto() {
  try {
    const r = await fetch(iot.url, { cache: 'no-store' });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const d = await r.json(), agora = d.agora || Date.now() / 1000;
    for (const s of SENSORES) { const x = d.leituras?.[s.id]; if (x && typeof x.v === 'number') registrar(s, x.v, Date.now() - (agora - x.t) * 1000); }
    conexao = 'recebendo de ' + iot.url;
  } catch (e) { conexao = 'sem conexão com ' + iot.url + ' (' + e.message + ')'; }
}
function avaliar() {
  const pior = {}, ordem = { sem: 0, ok: 1, al: 2, cr: 3 };
  for (const s of SENSORES) { const e = estado(s); for (const c of s.comp) if (!pior[c] || ordem[e] > ordem[pior[c]]) pior[c] = e; }
  const mudou = JSON.stringify(pior) !== JSON.stringify(saudeComp);
  saudeComp = pior;
  if (mudou && mapaSaude && !sel.size) aplicarMateriais();
  const n = SENSORES.filter((s) => ['al', 'cr'].includes(estado(s))).length, bt = $('#btSaude');
  bt.textContent = n ? `Saúde · ${n} alerta${n > 1 ? 's' : ''}` : 'Saúde';
  bt.classList.toggle('aviso', n > 0 && !mapaSaude);
}
function curva(h, s) {
  if (h.length < 2) return '';
  const lo = Math.min(...h, s.tipo === 'min' ? s.cr : s.base), hi = Math.max(...h, s.tipo === 'max' ? s.cr : s.base), f = hi - lo || 1;
  return h.map((v, i) => `${(i * 100 / 59).toFixed(1)},${(22 - (v - lo) / f * 20).toFixed(1)}`).join(' ');
}
function atualizarSensores() {
  if (abaAtual !== 'sensores') return;
  for (const s of SENSORES) {
    const c = conteudo.querySelector(`[data-sensor="${s.id}"]`); if (!c) continue;
    const e = estado(s), [cls, txt] = ROT[e];
    c.querySelector('.valor').textContent = fmt(s, leit[s.id].v);
    const tag = c.querySelector('.tag'); tag.className = 'tag ' + cls; tag.textContent = txt;
    c.querySelector('polyline').setAttribute('points', curva(leit[s.id].hist, s));
    c.classList.toggle('critico', e === 'cr'); c.classList.toggle('alerta', e === 'al');
  }
  const elC = $('#iotConexao'); if (elC) elC.textContent = conexao;
  const alertas = SENSORES.filter((s) => ['al', 'cr'].includes(estado(s))), elA = $('#iotAlertas'), chave = alertas.map((s) => s.id + estado(s)).join();
  if (elA && elA.dataset.chave !== chave) {
    elA.dataset.chave = chave;
    elA.innerHTML = alertas.length ? alertas.map((s) => {
      const chave = new Set(normalizar(s.n + ' ' + s.dica).filter((w) => w.length >= 4));
      const rel = TAREFAS.filter((x) => x.comps.some((c) => s.comp.includes(c)))
        .map((x) => ({ x, p: normalizar(x.t[1]).filter((w) => chave.has(w)).length })).sort((a, b) => b.p - a.p).slice(0, 3).map((o) => o.x);
      return `<div class="cartao clic ${estado(s) === 'cr' ? 'critico' : 'alerta'}" data-comps="${s.comp.join(',')}"><div class="tit"><span>${esc(s.n)}</span><span class="tag ${ROT[estado(s)][0]}">${ROT[estado(s)][1]}</span></div>
        <div class="sub"><b>Ação sugerida:</b> ${esc(s.dica)}</div></div>${rel.map((x) => itemTarefa(x, { origem: true })).join('')}`;
    }).join('') : '<p class="nota">Nenhum alerta ativo: todos os sensores dentro da faixa.</p>';
  }
}
setInterval(async () => { if (iot.modo === 'sim') { passoSimulado(); conexao = 'simulação (dados gerados no navegador)'; } else await passoRemoto(); avaliar(); atualizarSensores(); }, 1000);

desenhar.sensores = () => {
  conteudo.innerHTML = `<h2>Sensores IoT – monitoramento de condição</h2>
    <p class="nota">Cada sensor está ligado a um componente do modelo. Quando sai da faixa, o componente muda de cor no mapa de saúde e as tarefas do MPI relacionadas aparecem abaixo.</p>
    <div class="linha"><button class="bt pri" id="btMapa">${mapaSaude ? 'Desligar mapa de saúde' : 'Ver mapa de saúde no 3D'}</button></div>
    <h3>Origem dos dados</h3>
    <div class="linha"><select id="iotModo" style="flex:1;min-width:160px"><option value="sim" ${iot.modo === 'sim' ? 'selected' : ''}>Simulação (demonstração)</option><option value="http" ${iot.modo === 'http' ? 'selected' : ''}>Sensores reais (servidor de telemetria)</option></select>
      <input type="text" id="iotUrl" value="${esc(iot.url)}" style="flex:1;min-width:150px" ${iot.modo === 'sim' ? 'disabled' : ''} title="Endereço que devolve as leituras em JSON"></div>
    <p class="nota">Estado: <span id="iotConexao">${esc(conexao)}</span></p>
    <h3>Alertas e manutenção indicada</h3><div id="iotAlertas"></div>
    <h3>Leituras ao vivo – ${SENSORES.length} sensores em ${Object.keys(COMPS).length} componentes</h3>
    ${SENSORES.map((s, i) => `${i === 0 || SENSORES[i - 1].grupo !== s.grupo ? `<h3>${esc(s.grupo)}</h3>` : ''}<div class="cartao clic sensor" data-sensor="${s.id}" data-comps="${s.comp.join(',')}">
      <div class="tit"><span>${esc(s.n)}</span><span class="tag">—</span></div>
      <div class="leitura"><span class="valor">—</span><svg viewBox="0 0 100 24" preserveAspectRatio="none"><polyline points="" /></svg></div>
      <div class="sub">${s.comp.map((c) => esc(COMPS[c].n)).join(' · ')}${s.tipo === 'bool' ? '' : ` · alerta ${s.al} · crítico ${s.cr} ${esc(s.un)}`}
        ${iot.modo === 'sim' ? `<button class="bt mini" data-falha="${s.id}">${falha.has(s.id) ? 'Normalizar' : 'Simular falha'}</button>` : ''}</div></div>`).join('')}
    <p class="nota">As faixas de alerta e crítico são ilustrativas, apenas para a demonstração. Em uso real, configure-as em <b>sensores.js</b> conforme os limites do fabricante. Envio de sensores reais: veja o README (api/telemetria.php).</p>`;
  atualizarSensores();
};

/* ---------- Eventos de interface do painel ---------- */
conteudo.addEventListener('click', (e) => {
  const t = e.target;
  if (t.matches('input, select, textarea')) return;
  if (t.id === 'btMapa') { ligarMapaSaude(!mapaSaude); desenhar.sensores(); return; }
  if (t.dataset.falha) { falha.has(t.dataset.falha) ? falha.delete(t.dataset.falha) : falha.add(t.dataset.falha); t.textContent = falha.has(t.dataset.falha) ? 'Normalizar' : 'Simular falha'; return; }
  if (t.dataset.ex) { ultimoTexto = t.dataset.ex; $('#txt').value = ultimoTexto; mostrarAnalise(); return; }
  if (t.id === 'btMostrar') { ultimoTexto = $('#txt').value; mostrarAnalise(); return; }
  if (t.id === 'btSalvar') { const v = $('#txt').value.trim(); if (v) { const s = guarda.ler('b429_tarefas', []); if (!s.includes(v)) s.unshift(v); guarda.salvar('b429_tarefas', s.slice(0, 30)); ultimoTexto = v; desenhar.descrever(); } return; }
  if (t.dataset.apagar) { const s = guarda.ler('b429_tarefas', []); s.splice(+t.dataset.apagar, 1); guarda.salvar('b429_tarefas', s); desenhar.descrever(); return; }
  const salva = t.closest('[data-salva]');
  if (salva) { ultimoTexto = guarda.ler('b429_tarefas', [])[+salva.dataset.salva] || ''; $('#txt').value = ultimoTexto; mostrarAnalise(); conteudo.scrollTop = 0; return; }
  if (t.id === 'btZerar') { for (const c of conteudo.querySelectorAll('[data-check]')) delete feitos[c.dataset.check]; guarda.salvar('b429_check', feitos); desenhar.inspecoes(); return; }
  if (t.dataset.insp) { abrirAba('inspecoes'); desenhar.inspecoes(t.dataset.insp); return; }
  if (t.dataset.feita) { salvarControle((st) => { st.ult[t.dataset.feita] = st.tsn; }); return; }
  if (t.dataset.remover) { salvarControle((st) => { st.extra = st.extra.filter((x) => x.id !== t.dataset.remover); }); return; }
  if (t.id === 'btAdd') { const nome = $('#nNome').value.trim(), h = +$('#nHoras').value; if (nome && h > 0) salvarControle((st) => st.extra.push({ id: 'x' + Date.now(), nome, h, origem: 'op', extra: 1 })); return; }
  const fic = t.closest('[data-ficha]');
  if (fic) { selecionar([fic.dataset.ficha]); desenhar.sistemas(fic.dataset.ficha); conteudo.scrollTop = 0; return; }
  const alvo = t.closest('[data-comps]');
  if (alvo) { const ids = alvo.dataset.comps.split(',').filter(Boolean); selecionar(ids); marcarAtivo(ids.length ? alvo : null); }
});
conteudo.addEventListener('change', (e) => {
  const t = e.target;
  if (t.dataset.check) { if (t.checked) feitos[t.dataset.check] = 1; else delete feitos[t.dataset.check]; guarda.salvar('b429_check', feitos); t.closest('.item').classList.toggle('feito', t.checked); progresso(); }
  else if (t.id === 'selInsp') { selecionar([]); desenhar.inspecoes(t.value); }
  else if (t.id === 'iotModo') { iot.modo = t.value; guarda.salvar('b429_iot', iot); falha.clear(); zerarLeituras(); desenhar.sensores(); }
  else if (t.id === 'iotUrl') { iot.url = t.value.trim() || 'api/telemetria.php'; guarda.salvar('b429_iot', iot); }
  else if (t.id === 'selEvento') { eventoAtual = t.value; selecionar([]); desenhar.eventos(); }
  else if (t.id === 'cMat') salvarControle((st) => { st.mat = t.value; });
  else if (t.id === 'cTsn') salvarControle((st) => { st.tsn = +t.value || 0; });
  else if (t.id === 'cMedia') salvarControle((st) => { st.media = +t.value || 0; });
  else if (t.dataset.ult) salvarControle((st) => { if (t.value === '') delete st.ult[t.dataset.ult]; else st.ult[t.dataset.ult] = +t.value || 0; });
  else if (['rN', 'rC', 'rA'].includes(t.id)) salvarControle((st) => { st.rin = [+$('#rN').value || 0, +$('#rC').value || 0, +$('#rA').value || 0]; });
});
conteudo.addEventListener('keydown', (e) => { if (e.target.id === 'txt' && e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { ultimoTexto = e.target.value; mostrarAnalise(); } });

abrirAba('descrever');
window.b429 = { selecionar, analisar, abrirAba, TAREFAS }; // útil para testes no console
