// Manutenção Interativa – manual interativo de cada modelo: cena 3D, seleção de componentes e abas do manual.
// O modelo vem da URL (manual.html?m=505); os dados ficam em modelos/<id>/ (window.HELI).
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { construirHelicoptero } from './modelo.js?v=20261115g';
import { modeloAtual, carregarScripts, mostrarErro } from './carregar.js?v=20261115g';

const CFG = modeloAtual();
try { await carregarScripts(CFG.arquivos); } catch (e) { mostrarErro(e.message); throw e; }
const { INFO, COMPS, ZONAS, ZC, KW, EXEMPLOS, MPI, ANAC, CONTROLE, SENSORES } = window.HELI;
const K = CFG.chave; // prefixo das chaves salvas no navegador (o 429 mantém "b429_" e os dados já registrados)
const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const guarda = {
  ler(k, pad) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : pad; } catch { return pad; } },
  salvar(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* armazenamento indisponível */ } }
};

/* =====================================================================
   Identidade do modelo na página
   ===================================================================== */
document.title = `${CFG.nome} – Manual Interativo · Manutenção Interativa`;
document.documentElement.style.setProperty('--acento', CFG.cor);
$('#selo').textContent = CFG.curto;
$('#subModelo').textContent = `${CFG.nome} · ${CFG.motor} · ${INFO.ilustrativo ? 'prévia com fontes públicas' : 'base ' + INFO.manual}`;
$('#rodape').textContent = INFO.aviso;
$('#btMotor').href = 'motor.html?m=' + CFG.id;
$('#trocaModelo').innerHTML = (window.CATALOGO || []).map((c) => `<option value="${c.id}" ${c.id === CFG.id ? 'selected' : ''}>${esc(c.nome)}</option>`).join('');
$('#trocaModelo').onchange = (e) => { location.href = 'manual.html?m=' + e.target.value + location.hash; };

/* =====================================================================
   Cena 3D
   ===================================================================== */
const vista = $('#vista');
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
vista.prepend(renderer.domElement);
const cena = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 200);
const heli = construirHelicoptero(CFG.id);
const VISTA_GERAL = { pos: new THREE.Vector3(...heli.vista.pos), alvo: new THREE.Vector3(...heli.vista.alvo) };
camera.position.copy(VISTA_GERAL.pos);
const controles = new OrbitControls(camera, renderer.domElement);
controles.target.copy(VISTA_GERAL.alvo); controles.enableDamping = true; controles.minDistance = 1.2; controles.maxDistance = 45;

cena.add(new THREE.HemisphereLight(0xdfe9ff, 0x2a2f38, 1.15));
const sol = new THREE.DirectionalLight(0xffffff, 1.5); sol.position.set(6, 12, 8); cena.add(sol);
const contra = new THREE.DirectionalLight(0x9fc0ff, 0.5); contra.position.set(-8, 4, -9); cena.add(contra);
const grade = new THREE.GridHelper(40, 40, 0x2b3646, 0x1a222e); grade.position.set(-2, 0, 0); cena.add(grade);

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
  const pos = VISTA_GERAL.alvo.clone().addScaledVector(dir, heli.vista.raio / Math.sin(Math.min(fv, fh)));
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
  const temMotor = [...sel].some((id) => COMPS[id].motor);
  el.innerHTML = `<b>Onde vamos mexer:</b> ${esc(nomes.slice(0, 4).join(' · '))}${nomes.length > 4 ? ` · +${nomes.length - 4}` : ''}<button class="bt mini" id="btLimpar">Limpar</button>${temMotor ? `<a class="bt mini" href="motor.html?m=${CFG.id}">Motor 3D ›</a>` : ''}`;
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
new ResizeObserver(ajustar).observe(vista); ajustar(); vistaGeral(false); controles.update();
const relogio = new THREE.Clock();
let erroLaco = false;
renderer.setAnimationLoop(() => { try { quadro(); } catch (e) { if (!erroLaco) { erroLaco = true; mostrarErro('Erro no desenho 3D: ' + e.message); } } });
function quadro() {
  const dt = Math.min(relogio.getDelta(), 0.05), t = relogio.elapsedTime;
  animarVoo(dt);
  if (voo) {
    const k = Math.min((performance.now() - voo.t0) / voo.dur, 1), s = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
    camera.position.lerpVectors(voo.p0, voo.p1, s); controles.target.lerpVectors(voo.a0, voo.a1, s);
    if (k >= 1) voo = null;
  }
  if (girar) for (const r of heli.rotores) r.obj.rotation[r.eixo] += dt * r.vel;
  matDestaque.emissiveIntensity = 0.55 + 0.35 * Math.sin(t * 4);
  matSaude.cr.emissiveIntensity = 0.6 + 0.5 * Math.sin(t * 6);
  controles.update(); renderer.render(cena, camera); posicionarRotulos();
}

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
const feitos = guarda.ler(K + '_check', {});
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
const ABAS = [...document.querySelectorAll('#abas button')].map((b) => b.dataset.aba);
function abrirAba(nome) {
  if (!desenhar[nome]) nome = 'descrever';
  abaAtual = nome;
  document.querySelectorAll('#abas button').forEach((b) => b.classList.toggle('ativa', b.dataset.aba === nome));
  if (nome !== 'busca') { $('#busca').value = ''; if (location.hash !== '#' + nome) history.replaceState(null, '', '#' + nome); }
  desenhar[nome](); conteudo.scrollTop = 0;
}
$('#abas').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) abrirAba(b.dataset.aba); });
window.addEventListener('hashchange', () => { const n = location.hash.slice(1); if (ABAS.includes(n) && n !== abaAtual) abrirAba(n); });
// Atalhos: Alt+1…9 troca de seção, "/" vai para a busca, Esc limpa o destaque
window.addEventListener('keydown', (e) => {
  const digitando = /INPUT|TEXTAREA|SELECT/.test(e.target.tagName);
  if (e.altKey && /^[1-9]$/.test(e.key) && ABAS[+e.key - 1]) { e.preventDefault(); abrirAba(ABAS[+e.key - 1]); }
  else if (e.altKey && e.key === '0') { e.preventDefault(); abrirAba('voo'); }
  else if (e.key === '/' && !digitando) { e.preventDefault(); $('#busca').focus(); }
  else if (e.key === 'Escape') { if (e.target.id === 'busca') { e.target.blur(); abrirAba('descrever'); } else if (!digitando) { selecionar([]); marcarAtivo(null); } }
});
$('#btPainel').onclick = (e) => { const f = $('#app').classList.toggle('sem-painel'); e.currentTarget.classList.toggle('on', f); e.currentTarget.textContent = f ? 'Mostrar painel' : 'Ocultar painel'; };
function selo(aba, n, ok = false) { const b = $(`#abas [data-aba="${aba}"] .selo-n`); if (!b) return; b.hidden = !n; b.textContent = n; b.classList.toggle('ok', ok); }

/* ---------- Busca global ---------- */
const semAcento = (s) => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
let INDICE = null, resultados = [];
function montarIndice() {
  const it = [];
  for (const id in COMPS) it.push({ tipo: 'Componente', tit: COMPS[id].n, sub: `ATA ${COMPS[id].ata} · zona ${COMPS[id].z}`, comps: [id], ir: { ficha: id } });
  for (const x of TAREFAS) it.push({ tipo: 'Tarefa', tit: `${x.t[0]} — ${x.t[1]}`, sub: `${x.ins.nome} · acesso ${x.t[2]} · zona ${x.t[3]}`, comps: x.comps, ir: { insp: x.ins.id } });
  for (const s of SENSORES) it.push({ tipo: 'Sensor', tit: s.n, sub: s.comp.map((c) => COMPS[c].n).join(' · '), comps: s.comp, ir: { aba: 'sensores' } });
  for (const g of MPI.LIMITES) for (const i of g.i) it.push({ tipo: 'Limite de vida', tit: `${i[0]} · ${i[1]}`, sub: `${g.s} · ${i[2]}`, comps: i[3] || g.c || [], ir: { aba: 'limites' } });
  for (const e of MPI.EVENTOS) it.push({ tipo: 'Evento', tit: e.n, sub: e.r, comps: [...new Set(e.a.flatMap((a) => a[1]))], ir: { evento: e.id } });
  for (const g of ANAC) for (const i of g.i) it.push({ tipo: 'ANAC', tit: i.ref, sub: i.t, comps: i.c || [], ir: { aba: 'anac' } });
  return it.map((o) => Object.assign(o, { chave: semAcento(o.tit + ' ' + o.sub) }));
}
desenhar.busca = () => {
  INDICE ??= montarIndice();
  const q = semAcento($('#busca').value).split(/\s+/).filter(Boolean);
  resultados = q.length ? INDICE.filter((o) => q.every((w) => o.chave.includes(w))).slice(0, 60) : [];
  conteudo.innerHTML = `<h2>Busca: ${resultados.length}${resultados.length === 60 ? '+' : ''} resultado${resultados.length === 1 ? '' : 's'}</h2>
    ${resultados.length ? resultados.map((o, i) => `<div class="cartao clic" data-comps="${o.comps.join(',')}"><div class="res-tipo">${o.tipo}</div>
      <div class="tit"><span>${esc(o.tit)}</span><button class="bt mini" data-res="${i}">Abrir ›</button></div><div class="sub">${esc(o.sub.length > 150 ? o.sub.slice(0, 150) + '…' : o.sub)}</div></div>`).join('')
    : `<p class="nota">Nada encontrado. ${esc(INFO.buscaDica)}</p>`}`;
};
$('#busca').addEventListener('input', (e) => { if (e.target.value.trim()) { abaAtual = 'busca'; document.querySelectorAll('#abas button').forEach((b) => b.classList.remove('ativa')); desenhar.busca(); } else abrirAba('descrever'); });

/* ---------- Descrever ---------- */
let ultimoTexto = '';
desenhar.descrever = () => {
  const salvas = guarda.ler(K + '_tarefas', []);
  conteudo.innerHTML = `${INFO.ilustrativo ? `<div class="cartao previa"><b>Prévia – ${esc(CFG.nome)}</b><div class="sub">Conteúdo montado com fontes públicas (${esc(CFG.base)}). Coloque os manuais oficiais em <b>manuais/${CFG.id}/</b> para incorporar tarefas, intervalos e procedimentos do fabricante.</div></div>` : ''}
    <h2>Descreva a manutenção a ser realizada</h2>
    <textarea id="txt" placeholder="${esc(INFO.exemploTexto)}">${esc(ultimoTexto)}</textarea>
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
    ${r.rel.length ? `<h3>Tarefas do ${esc(INFO.manual)} relacionadas</h3>${r.rel.map((x) => itemTarefa(x, { origem: true })).join('')}` : ''}`;
}

/* ---------- Inspeções ---------- */
let inspAtual = MPI.INSPECOES[1].id;
desenhar.inspecoes = (id) => {
  if (id) inspAtual = id;
  const ins = MPI.INSPECOES.find((i) => i.id === inspAtual), lista = TAREFAS.filter((x) => x.ins === ins);
  const todos = [...new Set(lista.flatMap((x) => x.comps))];
  conteudo.innerHTML = `<h2>Inspeções programadas e especiais</h2>
    <select id="selInsp">${MPI.INSPECOES.map((i) => `<option value="${i.id}" ${i === ins ? 'selected' : ''}>${esc(i.nome)}</option>`).join('')}</select>
    <p class="nota">${esc(ins.nota)}${ins.dmc ? ` · DMC ${esc(INFO.dmc)}${esc(ins.dmc)}` : ''}</p>
    <div class="prog"><i id="barraProg"></i></div><p class="nota" id="txtProg"></p>
    <div class="linha"><button class="bt pri" data-comps="${todos.join(',')}">Mostrar todas as áreas</button><button class="bt" id="btMarcar">Marcar todas</button><button class="bt" id="btZerar">Zerar</button><button class="bt" data-dado="imprimir">Imprimir</button></div>
    <div class="linha" id="filtroCx"><input type="text" id="filtroInsp" placeholder="Filtrar tarefas (texto, nº, painel, zona)" style="flex:1;min-width:150px"><label class="nota"><input type="checkbox" id="soPend"> só pendentes</label></div>
    ${ins.prep ? `<h3>Preparação – painéis a remover</h3><p class="nota">${esc(ins.prep)} (${esc(INFO.prepNota)})</p>` : ''}
    ${ins.g.map((g) => `<h3>${esc(g.s)}</h3>${lista.filter((x) => x.g === g).map((x) => itemTarefa(x, { check: true })).join('')}`).join('')}
    <h3>Itens gerais (toda inspeção)</h3>${MPI.GERAL.map((t, i) => { const k = ins.id + ':G' + i; return `<div class="item${feitos[k] ? ' feito' : ''}"><input type="checkbox" data-check="${k}" ${feitos[k] ? 'checked' : ''}><div class="desc">${esc(t)}</div></div>`; }).join('')}
    <p class="nota">${esc(INFO.tolerancia)}</p>`;
  progresso();
};
function progresso() {
  const cs = conteudo.querySelectorAll('[data-check]'); if (!cs.length || !$('#barraProg')) return;
  const n = [...cs].filter((c) => c.checked).length;
  $('#barraProg').style.width = (100 * n / cs.length) + '%'; $('#txtProg').textContent = `${n} de ${cs.length} itens marcados (salvo neste navegador)`;
  selo('inspecoes', n && n < cs.length ? cs.length - n : n === cs.length ? '✓' : 0, n === cs.length);
}
function filtrarInspecao() {
  const q = semAcento($('#filtroInsp')?.value || '').split(/\s+/).filter(Boolean), pend = $('#soPend')?.checked;
  for (const it of conteudo.querySelectorAll('.item')) {
    const txt = semAcento(it.textContent), feito = it.querySelector('[data-check]')?.checked;
    it.classList.toggle('oculto', !q.every((w) => txt.includes(w)) || (pend && feito));
  }
  for (const h of conteudo.querySelectorAll('h3')) { // esconde títulos de grupos sem itens visíveis
    let n = h.nextElementSibling, vis = false, tem = false;
    while (n && n.tagName !== 'H3') { if (n.classList.contains('item')) { tem = true; if (!n.classList.contains('oculto')) vis = true; } n = n.nextElementSibling; }
    h.classList.toggle('oculto', tem && !vis);
  }
}

/* ---------- Controle: cálculo compartilhado (tela, selo do menu e exportação) ---------- */
const lerCtrl = () => Object.assign({ mat: '', tsn: 0, media: 30, ult: {}, extra: [] }, guarda.ler(K + '_ctrl', {}));
function linhasControle(st) {
  return [...CONTROLE, ...st.extra].sort((a, b) => a.h - b.h).map((l) => {
    const ult = +st.ult[l.id] || 0, prox = ult + l.h, resta = prox - st.tsn, tol = l.origem === 'mpi' ? Math.min(l.h * (INFO.tolPct || 0), INFO.tolMax ?? 100) : 0;
    const sit = st.ult[l.id] == null ? ['', 'INFORMAR ÚLTIMA EXECUÇÃO'] : resta < -tol ? ['er', 'VENCIDA'] : resta < 0 ? ['al', 'NA TOLERÂNCIA'] : resta <= l.h * 0.1 ? ['al', 'PRÓXIMA'] : ['ok', 'EM DIA'];
    return { l, ult, prox, resta, sit, uso: Math.max(0, Math.min(1, (st.tsn - ult) / l.h)) };
  });
}
function seloControle() { selo('controle', linhasControle(lerCtrl()).filter((x) => x.sit[0] === 'er' || x.sit[0] === 'al').length); }

/* ---------- Controle por horas ---------- */
desenhar.controle = () => {
  const st = lerCtrl(), hoje = new Date();
  seloControle();
  const corpo = linhasControle(st).map(({ l, ult, prox, resta, sit, uso }) => {
    const prev = st.media > 0 && resta > 0 ? new Date(hoje.getTime() + (resta / st.media) * 30 * 864e5).toLocaleDateString('pt-BR') : '—';
    return `<div class="cartao"><div class="tit"><span>${esc(l.nome)}</span><span class="tag ${sit[0]}">${sit[1]}</span></div>
      <div class="sub">${l.origem === 'mpi' ? esc(INFO.manual) : 'Definida pelo operador' + (l.obs ? ' · ' + esc(l.obs) : '')} · vence com <b>${prox.toFixed(1)} h</b> · restam <b>${resta.toFixed(1)} h</b> · previsão ${prev}</div>
      <div class="prog ${sit[0] === 'ok' ? '' : sit[0]}"><i style="width:${uso * 100}%"></i></div>
      <div class="linha"><span class="nota">Última execução (h):</span><input type="number" step="0.1" style="width:96px" data-ult="${l.id}" value="${st.ult[l.id] ?? ''}" placeholder="—">
        <button class="bt mini" data-feita="${l.id}">Feita agora</button>${l.insp ? `<button class="bt mini" data-insp="${l.insp}">Ver tarefas</button>` : ''}${l.extra ? `<button class="bt mini" data-remover="${l.id}">Remover</button>` : ''}</div></div>`;
  }).join('');
  conteudo.innerHTML = `<h2>Controle de manutenção por horas de voo</h2>
    <div class="grade"><div><label>Matrícula</label><input type="text" id="cMat" value="${esc(st.mat)}" placeholder="PR-XXX"></div>
      <div><label>Horas totais (célula)</label><input type="number" step="0.1" id="cTsn" value="${st.tsn}"></div>
      <div><label>Média h/mês</label><input type="number" step="1" id="cMedia" value="${st.media}"></div></div>
    <p class="nota">A previsão de data usa a média de horas voadas por mês (manutenção preditiva de calendário).${INFO.tolPct ? ` Tolerância de ${INFO.tolPct * 100}% (máx. ${INFO.tolMax ?? 100} h) só nas inspeções do ${esc(INFO.manual)}.` : ''}</p>
    ${corpo}
    <h3>Adicionar intervalo do operador</h3>
    <div class="linha"><input type="text" id="nNome" placeholder="Nome (ex.: lavagem de compressor)" style="flex:1;min-width:150px"><input type="number" id="nHoras" placeholder="horas" style="width:90px"><button class="bt" id="btAdd">Adicionar</button></div>
    <p class="nota">${esc(INFO.notaControle)}</p>
    ${MPI.RIN.length ? `<h3>Controle por RIN (trem de pouso de esquis)</h3>
    <div class="grade"><div><label>Pousos normais</label><input type="number" id="rN" value="${st.rin?.[0] ?? 0}"></div><div><label>Pousos corridos</label><input type="number" id="rC" value="${st.rin?.[1] ?? 0}"></div><div><label>Autorrotações</label><input type="number" id="rA" value="${st.rin?.[2] ?? 0}"></div></div>
    ${MPI.RIN.map((r) => { const v = r.f[0] * (st.rin?.[0] || 0) + r.f[1] * (st.rin?.[1] || 0) + r.f[2] * (st.rin?.[2] || 0), u = Math.min(1, v / r.lim);
      return `<div class="cartao clic" data-comps="${r.id}"><div class="tit"><span>${esc(r.n)}</span><span class="tag ${u >= 1 ? 'er' : u > 0.9 ? 'al' : 'ok'}">${v.toLocaleString('pt-BR')} / ${r.lim.toLocaleString('pt-BR')} RIN</span></div>
        <div class="sub">+${r.f[0]} por pouso normal · +${r.f[1]} por pouso corrido · +${r.f[2]} por autorrotação</div><div class="prog ${u >= 1 ? 'er' : u > 0.9 ? 'al' : ''}"><i style="width:${u * 100}%"></i></div></div>`; }).join('')}` : ''}`;
};
function salvarControle(mut) { const st = lerCtrl(); mut(st); guarda.salvar(K + '_ctrl', st); desenhar.controle(); }

/* ---------- Limites de aeronavegabilidade ---------- */
desenhar.limites = () => {
  const ex = INFO.limitesExtra;
  conteudo.innerHTML = `<h2>${esc(INFO.tituloLimites)}</h2>
    <p class="nota">${esc(INFO.notaLimites)}</p>
    ${MPI.LIMITES.map((g) => `<h3>${esc(g.s)}</h3><table><tr><th>Peça</th><th>P/N</th><th>Vida</th></tr>${g.i.map((i) => `<tr class="clic" data-comps="${(i[3] || g.c || []).join(',')}"><td>${esc(i[0])}</td><td class="pn">${esc(i[1])}</td><td><b>${esc(i[2])}</b></td></tr>`).join('')}</table>`).join('')}
    ${ex ? `<h3>${esc(ex.s)}</h3><table>${ex.i.map((i) => `<tr class="clic" data-comps="${(i[3] || []).join(',')}"><td>${esc(i[0])}</td><td class="pn">${esc(i[1])}</td><td><b>${esc(i[2])}</b></td></tr>`).join('')}</table>` : ''}
    ${INFO.notaRin ? `<p class="nota">${esc(INFO.notaRin)}</p>` : ''}`;
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
    <p class="nota">${esc(INFO.notaEventos)}</p>`;
};

/* ---------- ANAC ---------- */
desenhar.anac = () => {
  conteudo.innerHTML = `<h2>Regulamentação ANAC e controle de manutenção</h2>
    <p class="nota">Resumo orientativo para treinamento – não é texto legal. Consulte sempre a emenda vigente dos RBAC e das Instruções Suplementares em anac.gov.br.</p>
    ${ANAC.map((g) => `<h3>${esc(g.g)}</h3>${g.i.map((i) => `<div class="cartao${i.c ? ' clic' : ''}" ${i.c ? `data-comps="${i.c.join(',')}"` : ''}><div class="tit"><span>${esc(i.ref)}</span>${i.l ? `<span class="tag lar" data-insp="${i.l}">ver inspeção</span>` : ''}</div><div class="sub">${esc(i.t)}</div></div>`).join('')}`).join('')}`;
};

/* ---------- Sistemas ---------- */
desenhar.sistemas = (idSel) => {
  const ids = Object.keys(COMPS).sort((a, b) => COMPS[a].ata.localeCompare(COMPS[b].ata) || COMPS[a].n.localeCompare(COMPS[b].n));
  let ficha = '';
  if (idSel) {
    const rel = TAREFAS.filter((x) => x.comps.includes(idSel));
    ficha = `<h2>Ficha do componente</h2>${cartaoComp(idSel)}
      ${COMPS[idSel].motor ? `<div class="linha"><a class="bt pri" href="motor.html?m=${CFG.id}">Abrir o motor 3D (${esc(CFG.motor)}) ›</a></div>` : ''}
      <h3>Tarefas do ${esc(INFO.manual)} neste componente (${rel.length})</h3>${rel.length ? rel.slice(0, 40).map((x) => itemTarefa(x, { origem: true })).join('') : '<p class="nota">Nenhuma tarefa específica cadastrada nesta demonstração.</p>'}`;
  }
  conteudo.innerHTML = `${ficha}<h2 style="margin-top:${idSel ? 18 : 0}px">Todos os sistemas (por capítulo ATA)</h2>
    ${ids.map((id) => `<div class="item${id === idSel ? ' ativo' : ''}" data-ficha="${id}"><span class="tag">ATA ${COMPS[id].ata}</span><div class="desc">${esc(COMPS[id].n)}<div class="meta">Zona ${esc(COMPS[id].z)}</div></div></div>`).join('')}`;
};

/* ---------- Sensores IoT (monitoramento de condição) ---------- */
const iot = guarda.ler(K + '_iot', { modo: 'sim', url: 'api/telemetria.php' });
const leit = {};          // id -> { v, t (ms), hist: [] }
const falha = new Set();  // sensores com falha simulada
let conexao = 'simulação';
// Cenários de teste (simulação): ciclo de voo e estresse progressivo até a falha
let cenario = 'normal', cenT0 = Date.now(), cenLog = [], cenEstado = {};
const FASES_VOO = [[0, 'Partida e aquecimento', 0.35], [8, 'Pairado', 0.85], [16, 'Decolagem (potência máxima)', 1.0], [24, 'Cruzeiro', 0.8], [44, 'Descida', 0.5], [52, 'Aproximação e pouso', 0.85], [58, 'Corte do motor', 0.3]];
const CICLO_VOO = 62;
const pesoSensor = (id) => { let h = 7; for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) % 9973; return 0.8 + (h % 1000) / 1000 * 0.45; };
function faseVoo(t) { const tt = t % CICLO_VOO; let f = FASES_VOO[0]; for (const x of FASES_VOO) if (tt >= x[0]) f = x; return f; }
const tempoCen = () => (Date.now() - cenT0) / 1000;
const cargaEstresse = () => Math.min(1.75, tempoCen() / 50);
const cenRapido = new Set(); // sensores com falha do teste de voo (sobem rápido)
function falhaDoVoo(s) {
  if (!vooSim) return null;
  const tt = tempoCen() % CICLO_VOO, f = vooFalha;
  if (f === 'pouso' && s.un === 'g' && tt > 52.5 && tt < 56) return 2.9;
  if (f === 'otq' && s.id === 'torque_mastro' && tt > 16.5 && tt < 23.5) return 117;
  if (f === 'chip' && s.id === 'chip_trans' && tt > 30) return 1;
  if (f === 'vib' && s.id === 'vib_rp' && tt > 26 && tt < 44) return s.cr * 1.2;
  if (f === 'motor' && sTempVoo && s.id === sTempVoo.id && tt > 20 && tt < 40) return sTempVoo.cr + 30;
  return null;
}
function alvoCenario(s) {
  const fv = falhaDoVoo(s); if (fv !== null) { cenRapido.add(s.id); return fv; }
  cenRapido.delete(s.id);
  if (cenario === 'voo') {
    const [, nome, L] = faseVoo(tempoCen());
    if (s.tipo === 'bool') return 0;
    if (s.un === 'g') return /pouso/i.test(nome) ? 1.45 : 1.0;
    if (s.tipo === 'max') return Math.max(0, s.base + (s.al - s.base) * (L - 0.8) * 1.3);
    return s.base;
  }
  if (cenario === 'estresse') {
    const S = cargaEstresse() * pesoSensor(s.id);
    if (s.tipo === 'bool') return S > 1.3 ? 1 : 0;
    if (s.tipo === 'max') return s.base + (s.cr - s.base) * S;
    return s.base - (s.base - s.cr) * S;
  }
  return null;
}
function reiniciarCenario(c) { cenario = c; cenT0 = Date.now(); cenLog = []; cenEstado = {}; }
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
    const ac = alvoCenario(s);
    if (s.tipo === 'bool') { registrar(s, falha.has(s.id) ? 1 : (ac ?? 0)); continue; }
    const alvo = falha.has(s.id) ? s.cr + (s.cr - s.al) * 0.35 * (s.tipo === 'max' ? 1 : -1) : (ac ?? s.base);
    registrar(s, l.v + (alvo - l.v) * (cenRapido.has(s.id) ? 0.65 : falha.has(s.id) ? 0.35 : 0.12) + (Math.random() - 0.5) * s.ruido);
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
  if (cenario !== 'normal') for (const s of SENSORES) { // registra a ordem em que os sensores saem da faixa
    const e = estado(s), ant = cenEstado[s.id];
    if ((e === 'al' || e === 'cr') && e !== ant && !(ant === 'cr' && e === 'al')) cenLog.push({ t: tempoCen(), s, e, fase: cenario === 'voo' ? faseVoo(tempoCen())[1] : `carga ${Math.round(cargaEstresse() * 100)}%` });
    cenEstado[s.id] = e;
  }
  const mudou = JSON.stringify(pior) !== JSON.stringify(saudeComp);
  saudeComp = pior;
  if (mudou && mapaSaude && !sel.size) aplicarMateriais();
  const n = SENSORES.filter((s) => ['al', 'cr'].includes(estado(s))).length, bt = $('#btSaude');
  bt.textContent = n ? `Saúde · ${n} alerta${n > 1 ? 's' : ''}` : 'Saúde';
  bt.classList.toggle('aviso', n > 0 && !mapaSaude);
  selo('sensores', n);
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
  const elF = $('#iotFase');
  if (elF) elF.textContent = cenario === 'voo' ? `Fase: ${faseVoo(tempoCen())[1]} · carga ${Math.round(faseVoo(tempoCen())[2] * 100)}% · ${Math.floor(tempoCen() % CICLO_VOO)} s de ${CICLO_VOO} s`
    : cenario === 'estresse' ? `Carga aplicada: ${Math.round(cargaEstresse() * 100)}% da faixa até o limite crítico (100% = crítico no sensor médio) · ${Math.floor(tempoCen())} s` : 'Operação normal: leituras em torno do valor de referência.';
  const elL = $('#iotLog');
  if (elL && elL.dataset.n !== String(cenLog.length)) {
    elL.dataset.n = cenLog.length;
    elL.innerHTML = cenario === 'normal' ? '' : cenLog.length ? `<table><tr><th>t (s)</th><th>Sensor / componente</th><th>Estado</th><th>${cenario === 'voo' ? 'Fase' : 'Carga'}</th></tr>${cenLog.slice(-40).map((x) => `<tr class="clic" data-comps="${x.s.comp.join(',')}"><td>${x.t.toFixed(0)}</td><td>${esc(x.s.n)}<div class="nota" style="margin:0">${x.s.comp.map((c) => esc(COMPS[c].n)).join(' · ')}</div></td><td><span class="tag ${ROT[x.e][0]}">${ROT[x.e][1]}</span></td><td>${esc(x.fase)}</td></tr>`).join('')}</table>`
      : '<p class="nota">Nenhum sensor saiu da faixa até agora.</p>';
  }
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
setInterval(async () => { if (vooSim && (performance.now() - vooSim.t0) / 1000 >= CICLO_VOO) pararVoo(true); if (iot.modo === 'sim') { passoSimulado(); conexao = 'simulação (dados gerados no navegador)'; } else await passoRemoto(); avaliar(); atualizarSensores(); }, 1000);

desenhar.sensores = () => {
  conteudo.innerHTML = `<h2>Sensores IoT – monitoramento de condição</h2>
    <p class="nota">Cada sensor está ligado a um componente do modelo. Quando sai da faixa, o componente muda de cor no mapa de saúde e as tarefas relacionadas do ${esc(INFO.manual)} aparecem abaixo.</p>
    <div class="linha"><button class="bt pri" id="btMapa">${mapaSaude ? 'Desligar mapa de saúde' : 'Ver mapa de saúde no 3D'}</button></div>
    <h3>Origem dos dados</h3>
    <div class="linha"><select id="iotModo" style="flex:1;min-width:160px"><option value="sim" ${iot.modo === 'sim' ? 'selected' : ''}>Simulação (demonstração)</option><option value="http" ${iot.modo === 'http' ? 'selected' : ''}>Sensores reais (servidor de telemetria)</option></select>
      <input type="text" id="iotUrl" value="${esc(iot.url)}" style="flex:1;min-width:150px" ${iot.modo === 'sim' ? 'disabled' : ''} title="Endereço que devolve as leituras em JSON"></div>
    <p class="nota">Estado: <span id="iotConexao">${esc(conexao)}</span></p>
    ${iot.modo === 'sim' ? `<h3>Teste em modelo (cenário)</h3>
    <div class="linha"><select id="iotCenario" style="flex:1;min-width:180px"><option value="normal" ${cenario === 'normal' ? 'selected' : ''}>Operação normal</option><option value="voo" ${cenario === 'voo' ? 'selected' : ''}>Ciclo de voo: partida → pairado → decolagem → cruzeiro → pouso → corte</option><option value="estresse" ${cenario === 'estresse' ? 'selected' : ''}>Estresse progressivo dos componentes (até falhar)</option></select><button class="bt" id="btCenario">Reiniciar</button></div>
    <p class="nota" id="iotFase"></p>
    <p class="nota">No estresse, a carga sobe em todos os sensores ao mesmo tempo; cada componente tem margem diferente, então a tabela abaixo mostra a <b>ordem em que eles chegam ao alerta e ao crítico</b>. Ligue o mapa de saúde para ver no 3D. O teste detalhado do motor (ignição, voo e estresse) fica na página <a href="motor.html?m=${CFG.id}">Motor 3D</a>.</p>
    <div id="iotLog"></div>` : ''}
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

/* ---------- Dados: exportar, importar, apagar ---------- */
function baixar(nome, texto, tipo) {
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([texto], { type: tipo })); a.download = nome;
  document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 3000);
}
// CSV com ; e BOM: abre direto no Excel em português
const paraCsv = (linhas) => '﻿' + linhas.map((l) => l.map((c) => { c = String(c ?? ''); return /[;"\n]/.test(c) ? '"' + c.replace(/"/g, '""') + '"' : c; }).join(';')).join('\r\n');
const dataArq = () => new Date().toISOString().slice(0, 10);
const num = (v) => (Number.isFinite(+v) ? +v : 0);
function exportar(tipo) {
  const st = lerCtrl(), mat = st.mat ? st.mat.replace(/[^\w-]/g, '') + '_' : '';
  if (tipo === 'json') return baixar(`bell${CFG.id}_${mat}backup_${dataArq()}.json`, JSON.stringify({ app: `bell${CFG.id}-manual`, versao: 1, exportado: new Date().toISOString(), dados: { check: feitos, ctrl: st, tarefas: guarda.ler(K + '_tarefas', []), iot } }, null, 2), 'application/json');
  if (tipo === 'ctrl') return baixar(`bell${CFG.id}_${mat}controle_${dataArq()}.csv`, paraCsv([
    ['Matrícula', st.mat, 'Horas totais', st.tsn, 'Média h/mês', st.media], [],
    ['Intervalo', 'Horas', 'Origem', 'Última execução (h)', 'Vence com (h)', 'Restam (h)', 'Situação'],
    ...linhasControle(st).map(({ l, ult, prox, resta, sit }) => [l.nome, l.h, l.origem === 'mpi' ? INFO.manual : 'Operador', st.ult[l.id] == null ? '' : ult, prox.toFixed(1), resta.toFixed(1), sit[1]])]), 'text/csv');
  if (tipo === 'check') return baixar(`bell${CFG.id}_${mat}checklist_${dataArq()}.csv`, paraCsv([
    ['Inspeção', 'Sistema', 'Tarefa', 'Descrição', 'Acesso', 'Zona', 'Componentes no modelo', 'Executada'],
    ...TAREFAS.map((x) => [x.ins.nome, x.g.s, x.t[0], x.t[1], x.t[2], x.t[3], x.comps.map((c) => COMPS[c].n).join(' | '), feitos[x.ins.id + ':' + x.t[0]] ? 'SIM' : ''])]), 'text/csv');
  if (tipo === 'sens') return baixar(`bell${CFG.id}_${mat}sensores_${dataArq()}.csv`, paraCsv([
    ['Sensor', 'Id', 'Sistema', 'Componentes', 'Valor', 'Unidade', 'Alerta', 'Crítico', 'Estado', 'Origem'],
    ...SENSORES.map((s) => [s.n, s.id, s.grupo, s.comp.map((c) => COMPS[c].n).join(' | '), s.tipo === 'bool' ? leit[s.id].v : leit[s.id].v.toFixed(2), s.un, s.al ?? '', s.cr ?? '', ROT[estado(s)][1], iot.modo === 'sim' ? 'simulação' : iot.url])]), 'text/csv');
}
function importar(texto) {
  let j; try { j = JSON.parse(texto); } catch { return 'Arquivo inválido: não é JSON.'; }
  const d = j && j.app === `bell${CFG.id}-manual` && j.dados;
  if (!d || typeof d !== 'object') return 'Arquivo inválido: não é um backup deste manual.';
  if (!confirm('Importar substitui as marcações, o controle e as tarefas salvas deste navegador. Continuar?')) return 'Importação cancelada.';
  for (const k in feitos) delete feitos[k];
  if (d.check && typeof d.check === 'object') for (const k of Object.keys(d.check).slice(0, 5000)) if (k.length <= 80 && d.check[k]) feitos[k] = 1;
  guarda.salvar(K + '_check', feitos);
  const c = d.ctrl && typeof d.ctrl === 'object' ? d.ctrl : {}, ult = {};
  for (const k of Object.keys(c.ult || {}).slice(0, 300)) if (k.length <= 40) ult[k] = num(c.ult[k]);
  guarda.salvar(K + '_ctrl', {
    mat: String(c.mat || '').slice(0, 20), tsn: num(c.tsn), media: num(c.media), ult,
    extra: (Array.isArray(c.extra) ? c.extra : []).slice(0, 60).filter((x) => x && num(x.h) > 0).map((x) => ({ id: String(x.id || 'x' + Math.random()).slice(0, 40), nome: String(x.nome || '').slice(0, 80), h: num(x.h), origem: 'op', extra: 1 })),
    rin: Array.isArray(c.rin) ? c.rin.slice(0, 3).map(num) : undefined
  });
  guarda.salvar(K + '_tarefas', (Array.isArray(d.tarefas) ? d.tarefas : []).filter((s) => typeof s === 'string').map((s) => s.slice(0, 300)).slice(0, 30));
  seloControle();
  return `Backup de ${String(j.exportado || '').slice(0, 10) || 'data desconhecida'} importado.`;
}
let msgDados = '';
desenhar.dados = () => {
  const st = lerCtrl(), nFeitos = Object.keys(feitos).length, salvas = guarda.ler(K + '_tarefas', []).length, venc = linhasControle(st).filter((x) => x.sit[0] === 'er').length;
  conteudo.innerHTML = `<h2>Dados registrados neste navegador</h2>
    <div class="resumo"><div><b>${nFeitos}</b><span>itens de checklist marcados</span></div><div><b>${salvas}</b><span>tarefas descritas salvas</span></div>
      <div><b>${st.mat ? esc(st.mat) : '—'} · ${st.tsn} h</b><span>aeronave no controle</span></div><div><b>${venc}</b><span>inspeções vencidas</span></div></div>
    ${msgDados ? `<p class="nota" style="color:var(--acento2)">${esc(msgDados)}</p>` : ''}
    <h3>Cópia de segurança</h3>
    <p class="nota">Os dados ficam só neste navegador e neste endereço. Use o backup para levar para outro aparelho ou do localhost para o site.</p>
    <div class="linha"><button class="bt pri" data-dado="json">Exportar backup (.json)</button><button class="bt" data-dado="abrir-import">Importar backup…</button><input type="file" id="arqImport" accept=".json,application/json" hidden></div>
    <h3>Planilhas (CSV para Excel)</h3>
    <div class="linha"><button class="bt" data-dado="ctrl">Controle por horas</button><button class="bt" data-dado="check">Checklist de todas as inspeções</button><button class="bt" data-dado="sens">Leituras dos sensores</button></div>
    <h3>Imprimir</h3>
    <div class="linha"><button class="bt" data-dado="imprimir">Imprimir a inspeção selecionada</button></div>
    <h3>Apagar</h3>
    <div class="linha"><button class="bt perigo" data-dado="apagar-check">Marcações de checklist</button><button class="bt perigo" data-dado="apagar-ctrl">Controle por horas</button><button class="bt perigo" data-dado="apagar-tarefas">Tarefas salvas</button><button class="bt perigo" data-dado="apagar-tudo">Tudo</button></div>
    <p class="nota">Apagar não tem como desfazer – exporte o backup antes.</p>`;
  msgDados = '';
};
function acaoDados(acao) {
  if (['json', 'ctrl', 'check', 'sens'].includes(acao)) { exportar(acao); return; }
  if (acao === 'abrir-import') { $('#arqImport').click(); return; }
  if (acao === 'imprimir') { if (abaAtual !== 'inspecoes') abrirAba('inspecoes'); setTimeout(() => window.print(), 100); return; }
  const alvo = { 'apagar-check': 'as marcações de checklist', 'apagar-ctrl': 'o controle por horas', 'apagar-tarefas': 'as tarefas salvas', 'apagar-tudo': 'TODOS os dados' }[acao];
  if (!alvo || !confirm(`Apagar ${alvo} deste navegador? Não é possível desfazer.`)) return;
  if (acao === 'apagar-check' || acao === 'apagar-tudo') { for (const k in feitos) delete feitos[k]; guarda.salvar(K + '_check', feitos); selo('inspecoes', 0); }
  if (acao === 'apagar-ctrl' || acao === 'apagar-tudo') guarda.salvar(K + '_ctrl', {});
  if (acao === 'apagar-tarefas' || acao === 'apagar-tudo') guarda.salvar(K + '_tarefas', []);
  seloControle(); msgDados = `Apagado: ${alvo}.`; desenhar.dados();
}

/* ---------- Eventos de interface do painel ---------- */
conteudo.addEventListener('click', (e) => {
  const t = e.target;
  if (t.matches('input, select, textarea')) return;
  if (t.dataset.dado) { acaoDados(t.dataset.dado); return; }
  if (t.dataset.res) {
    const o = resultados[+t.dataset.res]; if (!o) return;
    if (o.ir.ficha) { abrirAba('sistemas'); desenhar.sistemas(o.ir.ficha); }
    else if (o.ir.insp) { abrirAba('inspecoes'); desenhar.inspecoes(o.ir.insp); $('#filtroInsp').value = o.tit.split(' — ')[0]; filtrarInspecao(); }
    else if (o.ir.evento) { eventoAtual = o.ir.evento; abrirAba('eventos'); }
    else abrirAba(o.ir.aba);
    selecionar(o.comps); return;
  }
  if (t.id === 'btMarcar') { for (const c of conteudo.querySelectorAll('.item:not(.oculto) [data-check]')) { c.checked = true; feitos[c.dataset.check] = 1; c.closest('.item').classList.add('feito'); } guarda.salvar(K + '_check', feitos); progresso(); filtrarInspecao(); return; }
  if (t.id === 'btMapa') { ligarMapaSaude(!mapaSaude); desenhar.sensores(); return; }
  if (t.id === 'btIniciarVoo') { if (vooSim) pararVoo(false); else iniciarVoo(); return; }
  if (t.dataset.evento) { eventoAtual = t.dataset.evento; abrirAba('eventos'); return; }
  if (t.id === 'btCenario') { reiniciarCenario(cenario); falha.clear(); desenhar.sensores(); return; }
  if (t.dataset.falha) { falha.has(t.dataset.falha) ? falha.delete(t.dataset.falha) : falha.add(t.dataset.falha); t.textContent = falha.has(t.dataset.falha) ? 'Normalizar' : 'Simular falha'; return; }
  if (t.dataset.ex) { ultimoTexto = t.dataset.ex; $('#txt').value = ultimoTexto; mostrarAnalise(); return; }
  if (t.id === 'btMostrar') { ultimoTexto = $('#txt').value; mostrarAnalise(); return; }
  if (t.id === 'btSalvar') { const v = $('#txt').value.trim(); if (v) { const s = guarda.ler(K + '_tarefas', []); if (!s.includes(v)) s.unshift(v); guarda.salvar(K + '_tarefas', s.slice(0, 30)); ultimoTexto = v; desenhar.descrever(); } return; }
  if (t.dataset.apagar) { const s = guarda.ler(K + '_tarefas', []); s.splice(+t.dataset.apagar, 1); guarda.salvar(K + '_tarefas', s); desenhar.descrever(); return; }
  const salva = t.closest('[data-salva]');
  if (salva) { ultimoTexto = guarda.ler(K + '_tarefas', [])[+salva.dataset.salva] || ''; $('#txt').value = ultimoTexto; mostrarAnalise(); conteudo.scrollTop = 0; return; }
  if (t.id === 'btZerar') { for (const c of conteudo.querySelectorAll('[data-check]')) delete feitos[c.dataset.check]; guarda.salvar(K + '_check', feitos); desenhar.inspecoes(); return; }
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
  if (t.dataset.check) { if (t.checked) feitos[t.dataset.check] = 1; else delete feitos[t.dataset.check]; guarda.salvar(K + '_check', feitos); t.closest('.item').classList.toggle('feito', t.checked); progresso(); if ($('#soPend')?.checked) filtrarInspecao(); }
  else if (t.id === 'soPend') filtrarInspecao();
  else if (t.id === 'arqImport') { const f = t.files[0]; if (f) f.text().then((txt) => { msgDados = importar(txt); desenhar.dados(); }); }
  else if (t.id === 'selInsp') { selecionar([]); desenhar.inspecoes(t.value); }
  else if (t.id === 'iotModo') { iot.modo = t.value; guarda.salvar(K + '_iot', iot); falha.clear(); reiniciarCenario('normal'); zerarLeituras(); desenhar.sensores(); }
  else if (t.id === 'selVooFalha') vooFalha = t.value;
  else if (t.id === 'iotCenario') { if (vooSim) pararVoo(false); reiniciarCenario(t.value); falha.clear(); if (t.value === 'estresse' && !mapaSaude) ligarMapaSaude(true); desenhar.sensores(); }
  else if (t.id === 'iotUrl') { iot.url = t.value.trim() || 'api/telemetria.php'; guarda.salvar(K + '_iot', iot); }
  else if (t.id === 'selEvento') { eventoAtual = t.value; selecionar([]); desenhar.eventos(); }
  else if (t.id === 'cMat') salvarControle((st) => { st.mat = t.value; });
  else if (t.id === 'cTsn') salvarControle((st) => { st.tsn = +t.value || 0; });
  else if (t.id === 'cMedia') salvarControle((st) => { st.media = +t.value || 0; });
  else if (t.dataset.ult) salvarControle((st) => { if (t.value === '') delete st.ult[t.dataset.ult]; else st.ult[t.dataset.ult] = +t.value || 0; });
  else if (['rN', 'rC', 'rA'].includes(t.id)) salvarControle((st) => { st.rin = [+$('#rN').value || 0, +$('#rC').value || 0, +$('#rA').value || 0]; });
});
conteudo.addEventListener('keydown', (e) => { if (e.target.id === 'txt' && e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { ultimoTexto = e.target.value; mostrarAnalise(); } });

conteudo.addEventListener('input', (e) => { if (e.target.id === 'filtroInsp') filtrarInspecao(); });

/* =====================================================================
   Teste de simulação de voo (o helicóptero voa no 3D e os sensores acompanham)
   ===================================================================== */
const FALHAS_VOO = {
  normal: 'Voo normal',
  pouso: 'Pouso duro (aceleração vertical acima do limite)',
  otq: 'Sobretorque na decolagem',
  chip: 'Luz de CHIP da transmissão no cruzeiro',
  vib: 'Vibração alta do rotor principal no cruzeiro',
  motor: 'Superaquecimento do motor na subida'
};
const sTempVoo = SENSORES.find((s) => /^(mgt_1|temp_motor)$/.test(s.id));
const sTqVoo = SENSORES.find((s) => s.id === 'torque_mastro');
let vooSim = null, vooFalha = 'normal', vooResumo = null, hudT = 0;
// perfil: [t (s), altitude (ft), velocidade (kt), arfagem (graus, + = nariz para baixo), Nr (%)]
const PERFIL_VOO = [[0, 0, 0, 0, 0], [8, 0, 0, 0, 100], [11, 8, 0, 0, 100], [16, 8, 0, 1, 100], [20, 250, 50, 7, 100], [24, 500, 80, 6, 100], [30, 1000, 120, 4, 100],
  [44, 1000, 120, 4, 100], [50, 200, 60, 2, 100], [52, 30, 25, -3, 100], [55, 6, 0, -1, 100], [57.5, 0, 0, 0, 100], [58, 0, 0, 0, 100], [62, 0, 0, 0, 0]];
function perfilEm(t) {
  const P = PERFIL_VOO;
  for (let i = 1; i < P.length; i++) if (t <= P[i][0]) { const a = P[i - 1], b = P[i], k = Math.max(0, (t - a[0]) / (b[0] - a[0])), e = k * k * (3 - 2 * k); return a.slice(1).map((v, j) => v + (b[j + 1] - v) * e); }
  return P[P.length - 1].slice(1);
}
function iniciarVoo() {
  if (iot.modo !== 'sim') { iot.modo = 'sim'; guarda.salvar(K + '_iot', iot); zerarLeituras(); }
  falha.clear(); reiniciarCenario('voo'); vooResumo = null; hudT = 0;
  vooSim = { t0: performance.now(), dist: 0, alt: 0 };
  selecionar([], { foco: false }); marcarAtivo(null); if (!mapaSaude) ligarMapaSaude(true);
  $('#hudVoo').hidden = false; $('#btVoo').classList.add('on'); $('#btVoo').textContent = 'Parar voo';
  abrirAba('voo');
}
function pararVoo(concluido) {
  if (!vooSim) return;
  vooResumo = { concluido, dur: (performance.now() - vooSim.t0) / 1000, log: cenLog.slice(), falha: vooFalha };
  const dy = -vooSim.alt; camera.position.y += dy; controles.target.y += dy;
  vooSim = null; reiniciarCenario('normal');
  heli.raiz.position.set(0, 0, 0); heli.raiz.rotation.set(0, 0, 0); grade.position.x = -2;
  $('#hudVoo').hidden = true; $('#btVoo').classList.remove('on'); $('#btVoo').textContent = 'Simular voo';
  abrirAba('voo');
}
$('#btVoo').onclick = () => (vooSim ? pararVoo(false) : iniciarVoo());
function animarVoo(dt) {
  if (!vooSim) return;
  const t = (performance.now() - vooSim.t0) / 1000;
  if (t >= CICLO_VOO) { pararVoo(true); return; }
  let [alt, kt, arf, nr] = perfilEm(t), tremor = 0;
  if (vooFalha === 'pouso' && t > 52 && t < 55) { // desce rápido demais e quica no toque
    const k = (t - 52) / 1.2;
    alt = k < 1 ? 30 * (1 - k * k) : Math.abs(Math.sin((t - 53.2) * 9)) * 2 * Math.max(0, 1 - (t - 53.2) / 1.4);
    if (t > 53.1 && t < 53.7) tremor = (Math.random() - 0.5) * 0.08;
  }
  const y = Math.min(alt / 110, 9.5), dy = y - vooSim.alt; vooSim.alt = y;
  heli.raiz.position.set(tremor, y, 0); heli.raiz.rotation.z = -arf * Math.PI / 180;
  camera.position.y += dy; controles.target.y += dy;
  vooSim.dist += kt * 0.514 * 0.12 * dt; grade.position.x = -2 - (vooSim.dist % 1);
  for (const r of heli.rotores) r.obj.rotation[r.eixo] += dt * r.vel * 1.8 * nr / 100;
  if (t - hudT > 0.2) { hudT = t; atualizarHud(t, alt, kt, nr); }
}
const valorLeit = (s) => (s ? leit[s.id].v : NaN);
function atualizarHud(t, alt, kt, nr) {
  const fase = faseVoo(t)[1], alertas = SENSORES.filter((s) => ['al', 'cr'].includes(estado(s))), cr = alertas.filter((s) => estado(s) === 'cr').length;
  const num = (v, d = 0) => (Number.isFinite(v) ? v.toLocaleString('pt-BR', { maximumFractionDigits: d }) : '—');
  $('#hudVoo').innerHTML = `<div class="hud-fase"><b>${esc(fase)}</b><span>${num(t)} s de ${CICLO_VOO} s · ${esc(FALHAS_VOO[vooFalha])}</span></div>
    <div class="hud-barra">${FASES_VOO.map((f, i) => { const fim = (FASES_VOO[i + 1] || [CICLO_VOO])[0]; return `<i class="${t >= fim ? 'feita' : t >= f[0] ? 'atual' : ''}" style="flex:${fim - f[0]}" title="${esc(f[1])}"></i>`; }).join('')}</div>
    <div class="hud-val"><div><b>${num(alt)}</b><span>altitude ft</span></div><div><b>${num(kt)}</b><span>velocidade kt</span></div><div><b>${num(nr)}</b><span>Nr %</span></div>
      <div><b>${num(valorLeit(sTqVoo))}</b><span>torque %</span></div><div><b>${num(valorLeit(sTempVoo))}</b><span>${sTempVoo ? (sTempVoo.id === 'mgt_1' ? 'MGT nº 1 °C' : 'motor °C') : 'motor'}</span></div>
      <div class="${cr ? 'cr' : alertas.length ? 'al' : ''}"><b>${alertas.length}</b><span>alertas${cr ? ` · ${cr} crít.` : ''}</span></div></div>`;
  const vv = $('#vooAoVivo');
  if (vv) vv.innerHTML = cenLog.length ? `<h3>Ocorrências até agora (${cenLog.length})</h3>${cenLog.slice(-8).reverse().map((x) => `<div class="item" data-comps="${x.s.comp.join(',')}"><span class="tag ${ROT[x.e][0]}">${ROT[x.e][1]}</span><div class="desc">${esc(x.s.n)}<div class="meta">${x.t.toFixed(0)} s · ${esc(x.fase)}</div></div></div>`).join('')}` : '<p class="nota">Voo em andamento: nenhum sensor fora da faixa até agora.</p>';
}
function resumoVoo() {
  const r = vooResumo, piores = {};
  for (const x of r.log) if (!piores[x.s.id] || x.e === 'cr') piores[x.s.id] = x;
  const lista = Object.values(piores), crit = lista.filter((x) => x.e === 'cr');
  const evs = new Set();
  for (const x of lista) {
    if (x.s.un === 'g' && x.e === 'cr') evs.add('pouso');
    if (x.s.id === 'torque_mastro' && x.e === 'cr') evs.add('otq');
    if (sTempVoo && x.s.id === sTempVoo.id && x.e === 'cr') evs.add('otemp');
  }
  const eventos = [...evs].map((id) => MPI.EVENTOS.find((e) => e.id === id)).filter(Boolean);
  const comps = new Set(lista.flatMap((x) => x.s.comp));
  const tarefas = TAREFAS.filter((x) => x.comps.some((c) => comps.has(c))).slice(0, 6);
  return `<h3>Resultado do voo ${r.concluido ? 'concluído' : 'interrompido'} (${r.dur.toFixed(0)} s · ${esc(FALHAS_VOO[r.falha])})</h3>
    <div class="cartao ${crit.length ? 'critico' : lista.length ? 'alerta' : ''}"><div class="tit"><span>${lista.length ? `${lista.length} sensor${lista.length > 1 ? 'es' : ''} fora da faixa (${crit.length} crítico${crit.length === 1 ? '' : 's'})` : 'Voo sem ocorrências: todos os sensores dentro da faixa'}</span></div>
      <div class="sub">${lista.length ? 'Clique em cada item para ver o componente no 3D.' : 'Nenhuma inspeção condicional indicada por este voo.'}</div></div>
    ${lista.map((x) => `<div class="cartao clic ${x.e === 'cr' ? 'critico' : 'alerta'}" data-comps="${x.s.comp.join(',')}"><div class="tit"><span>${esc(x.s.n)}</span><span class="tag ${ROT[x.e][0]}">${ROT[x.e][1]}</span></div>
      <div class="sub">${x.t.toFixed(0)} s · ${esc(x.fase)} · <b>Ação:</b> ${esc(x.s.dica)}</div></div>`).join('')}
    ${eventos.length ? `<h3>Inspeções condicionais indicadas</h3><div class="linha">${eventos.map((e) => `<button class="bt pri" data-evento="${e.id}">${esc(e.n)} ›</button>`).join('')}</div>` : ''}
    ${tarefas.length ? `<h3>Tarefas do ${esc(INFO.manual)} relacionadas</h3>${tarefas.map((x) => itemTarefa(x, { origem: true })).join('')}` : ''}`;
}
desenhar.voo = () => {
  conteudo.innerHTML = `<h2>Teste de simulação de voo</h2>
    <p class="nota">O ${esc(CFG.nome)} faz um voo completo no 3D em ${CICLO_VOO} s: partida, pairado, decolagem, subida, cruzeiro, descida, pouso e corte. Os sensores acompanham cada fase, o mapa de saúde pinta no modelo os componentes que saem da faixa e, no fim, aparecem as inspeções indicadas. Escolha uma falha para treinar o diagnóstico.</p>
    <div class="linha"><select id="selVooFalha" style="flex:1;min-width:180px">${Object.entries(FALHAS_VOO).map(([k, n]) => `<option value="${k}" ${k === vooFalha ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select>
      <button class="bt pri" id="btIniciarVoo">${vooSim ? 'Parar o voo' : 'Iniciar o voo'}</button></div>
    <div class="fases-voo">${FASES_VOO.map((f) => `<span>${esc(f[1])}</span>`).join('<i>›</i>')}</div>
    <div id="vooAoVivo">${vooSim ? '' : ''}</div>
    ${vooResumo ? resumoVoo() : '<p class="nota">Dica: aproxime a câmera antes de iniciar; ela acompanha a subida do helicóptero. O teste do motor (partida, voo e estresse com limites do fabricante) fica na página <a href="motor.html?m=' + CFG.id + '">Motor 3D</a>.</p>'}`;
};

seloControle();
abrirAba(ABAS.includes(location.hash.slice(1)) ? location.hash.slice(1) : 'descrever');
window.manual = window.b429 = { CFG, selecionar, analisar, abrirAba, TAREFAS, exportar, importar }; // útil para testes no console
