// Manutenção Interativa – tabela dos motores 3D com os sensores de cada motor, organizada por modelo.
// Passar o mouse num sensor marca a posição dele no motor 3D (à direita); clicar abre o motor do modelo naquele sensor.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { carregarScripts, mostrarErro } from './carregar.js?v=20261117f';
import { construirMotor } from './motor3d.js?v=20261117f';

const CAT = window.CATALOGO;
const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const ler = (k) => { try { return JSON.parse(localStorage.getItem(k) || '{}'); } catch { return {}; } };

// carrega a base comum e o motor de cada modelo (cada arquivo define window.MOTOR)
const MOT = {};
try {
  await carregarScripts(['modelos/motor_comum.js']);
  for (const c of CAT) { await carregarScripts([c.motorArq]); MOT[c.id] = window.MOTOR; }
} catch (e) { mostrarErro(e.message); throw e; }

// sensores do mapa + edições salvas pelo usuário na página do motor
function sensoresDe(id) {
  const ed = Object.assign({ sensores: {}, novos: [], removidos: [] }, ler('mi_motor_' + id));
  return MOT[id].sensores.filter((s) => !ed.removidos.includes(s.id)).map((s) => Object.assign({}, s, ed.sensores[s.id] || {})).concat(ed.novos || []);
}
const SENS = Object.fromEntries(CAT.map((c) => [c.id, sensoresDe(c.id)]));
const origem = (s) => (/usuário/i.test(s.orig) ? 'seu' : /HUMS|adicional/i.test(s.orig) ? 'adicional' : 'de série');

// linhas da tabela: grandeza medida
const LINHAS = [
  ['Temperatura dos gases', 'TOT · MGT · T4.5 – termopares entre as turbinas', (s) => s.var === 'temp' && /termopar/i.test(s.tipo)],
  ['Rotação do gerador de gás', 'Ng / N1', (s) => s.var === 'ng' && s.id !== 'sangria'],
  ['Rotação da turbina livre', 'Np / N2', (s) => s.var === 'np'],
  ['Torque', 'torquímetro', (s) => s.var === 'tq'],
  ['Pressão do óleo', '', (s) => s.var === 'oleoP'],
  ['Temperatura do óleo', '', (s) => s.var === 'oleoT'],
  ['Detector de limalha', 'chip detector', (s) => s.var === 'chip'],
  ['Pressão de combustível', '', (s) => s.var === 'combP'],
  ['Fluxo de combustível', '', (s) => s.var === 'ff'],
  ['Filtro de combustível', 'bypass iminente (ΔP)', (s) => s.var === 'filtroComb'],
  ['Vibração – compressor / caixa', 'acelerômetro', (s) => s.var === 'vibC'],
  ['Vibração – turbina', 'acelerômetro', (s) => s.var === 'vibT'],
  ['Pressão de descarga do compressor', 'P3 / PC', (s) => s.var === 'p3'],
  ['Temperatura de entrada', 'T1', (s) => s.var === 't1'],
  ['Ignição', 'excitador', (s) => s.var === 'ign'],
  ['Starter-generator', 'corrente', (s) => s.var === 'corrente'],
  ['Controle eletrônico (FADEC)', 'canais A/B e estado', (s) => s.var === 'falhaEcu' || /canal B/i.test(s.n)],
  ['Válvula de sangria', 'anti-surge', (s) => s.id === 'sangria']
];
const linhaDe = (s) => { const i = LINHAS.findIndex((l) => l[2](s)); return i < 0 ? LINHAS.length : i; };

let soSerie = false;
function desenharTabelas() {
  const contar = (id) => { const l = SENS[id]; return { t: l.length, s: l.filter((x) => origem(x) === 'de série').length, a: l.filter((x) => origem(x) === 'adicional').length, u: l.filter((x) => origem(x) === 'seu').length }; };
  $('#resumo').innerHTML = `<table class="tabela-mot"><tr><th>Helicóptero</th><th>Motor</th><th>Arquitetura</th><th>Temperatura indicada</th><th>Controle</th><th>Sensores</th><th></th></tr>
    ${CAT.map((c) => { const M = MOT[c.id], n = contar(c.id), r = Object.fromEntries(M.resumo); return `<tr class="clic${c.id === atual ? ' ativo' : ''}" data-modelo="${c.id}" style="--cor:${c.cor}">
      <td><span class="bolinha"></span><b>${esc(c.nome)}</b></td><td>${esc(M.nome)}${M.qtd > 1 ? ` <span class="tag">×${M.qtd}</span>` : ''}</td>
      <td>${esc(r.Compressor || '')}<div class="nota" style="margin:0">${esc(r.Turbinas || '')}</div></td><td>${esc(M.sim.temp)}</td><td>${esc(r.Controle || '')}</td>
      <td><b>${n.t}</b><div class="nota" style="margin:0">${n.s} de série · ${n.a} adicionais${n.u ? ` · ${n.u} seus` : ''}</div></td>
      <td><a class="bt mini" href="motor.html?m=${c.id}#sensores">Motor 3D ›</a></td></tr>`; }).join('')}</table>`;

  const linhas = LINHAS.map((l, i) => [l, i]).concat([[['Outros', 'sensores adicionados', () => false], LINHAS.length]]);
  $('#matriz').innerHTML = `<tr><th>Grandeza medida</th>${CAT.map((c) => `<th class="col${c.id === atual ? ' ativo' : ''}" data-modelo="${c.id}" style="--cor:${c.cor}"><b>${esc(c.nome)}</b><span>${esc(MOT[c.id].nome)}</span></th>`).join('')}</tr>
    ${linhas.map(([l, i]) => {
      const cel = CAT.map((c) => SENS[c.id].filter((s) => linhaDe(s) === i && (!soSerie || origem(s) === 'de série')));
      if (cel.every((x) => !x.length)) return '';
      return `<tr><td class="gr">${esc(l[0])}${l[1] ? `<small>${esc(l[1])}</small>` : ''}</td>${CAT.map((c, k) => `<td class="${c.id === atual ? 'ativo' : ''}">${cel[k].length ? cel[k].map((s) => celula(c.id, s)).join('') : '<span class="nao">—</span>'}</td>`).join('')}</tr>`;
    }).join('')}`;
}
function celula(id, s) {
  const o = origem(s), nome = s.var === 'temp' && /termopar/i.test(s.tipo) ? s.n.replace(/^Termopar /, '') : s.n;
  return `<a class="sen ${o === 'de série' ? '' : o === 'seu' ? 'seu' : 'adic'}" data-m="${id}" data-s="${esc(s.id)}" href="motor.html?m=${id}&s=${encodeURIComponent(s.id)}#sensores" title="${esc(s.tipo)} · ${esc(MOT[id].partes[s.parte]?.n || s.parte)}">
    <b>${esc(nome)}</b><small>${esc(s.tipo.split(' (')[0])} · ${esc(MOT[id].partes[s.parte]?.n || s.parte)}</small>${o !== 'de série' ? `<i>${o}</i>` : ''}</a>`;
}

/* =====================================================================
   Visualizador 3D (motor do modelo selecionado com os pontos dos sensores)
   ===================================================================== */
const vit = $('#vitrine');
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); vit.prepend(renderer.domElement);
const cena = new THREE.Scene(), camera = new THREE.PerspectiveCamera(34, 1, 0.01, 50);
const ctl = new OrbitControls(camera, renderer.domElement); ctl.enableDamping = true; ctl.autoRotate = true; ctl.autoRotateSpeed = 0.7; ctl.minDistance = 0.4; ctl.maxDistance = 6;
cena.add(new THREE.HemisphereLight(0xe6eeff, 0x2a2f38, 1.2));
const sol = new THREE.DirectionalLight(0xffffff, 1.6); sol.position.set(2, 4, 3); cena.add(sol);
const grade = new THREE.GridHelper(6, 30, 0x2b3646, 0x1a222e); grade.position.y = -0.55; cena.add(grade);
const COR_TIPO = (t) => /controle eletr/i.test(t) ? 0x5aa9e6 : /termopar/i.test(t) ? 0xff6a3d : /aceler/i.test(t) ? 0xb26bff : /press|torque|torquí/i.test(t) ? 0x3fa7ff : /pickup|monopolo|tacom|rota/i.test(t) ? 0x46c08a : /limalha|interruptor|chip/i.test(t) ? 0xf0b83c : /rtd|temperatura|bulbo/i.test(t) ? 0xff9f6a : 0xd0d6de;
$('#vitLegenda').innerHTML = [['Termopar', 0xff6a3d], ['Pressão / torque', 0x3fa7ff], ['Rotação', 0x46c08a], ['Vibração', 0xb26bff], ['Temperatura RTD', 0xff9f6a], ['Discreto', 0xf0b83c], ['FADEC', 0x5aa9e6], ['Outros', 0xd0d6de]].map(([n, c]) => `<span><i style="background:#${c.toString(16).padStart(6, '0')}"></i>${n}</span>`).join('');
$('#segModelo').innerHTML = CAT.map((c) => `<button class="bt" data-modelo="${c.id}" style="--cor:${c.cor}">${esc(c.curto)}</button>`).join('');

let atual = null, motor = null, marcadores = {}, foco = null;
function mostrarMotor(id) {
  if (id === atual) return; atual = id;
  if (motor) { cena.remove(motor.raiz); motor.raiz.traverse((o) => { if (o.geometry) o.geometry.dispose(); }); }
  motor = construirMotor(MOT[id]); cena.add(motor.raiz); marcadores = {};
  for (const m of motor.malhas) { m.material.transparent = true; m.material.opacity = 0.55; m.material.depthWrite = false; } // carcaças translúcidas: os pontos aparecem
  for (const s of SENS[id]) {
    const g = new THREE.Group(), cor = COR_TIPO(s.tipo), mat = new THREE.MeshStandardMaterial({ color: cor, emissive: cor, emissiveIntensity: 0.45 });
    const pino = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.05, 8), mat); pino.position.y = 0.025;
    const bola = new THREE.Mesh(new THREE.SphereGeometry(0.015, 14, 10), mat); bola.position.y = 0.055;
    g.add(pino, bola); g.position.set(...s.pos); g.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(...(s.dir || [0, 1, 0])).normalize());
    g.userData = { mat, s }; g.renderOrder = 5; motor.raiz.add(g); marcadores[s.id] = g;
  }
  const S = MOT[id].escala || 1;
  camera.position.set(...motor.vista.pos.map((v) => v * S)); ctl.target.set(...motor.vista.alvo.map((v) => v * S));
  const c = CAT.find((x) => x.id === id), M = MOT[id];
  $('#vitNome').textContent = `${M.nome} – ${c.nome}`;
  $('#vitInfo').textContent = `${SENS[id].length} pontos de medição · temperatura indicada: ${M.sim.temp} · ${Object.fromEntries(M.resumo).Controle || ''}`;
  document.querySelectorAll('[data-modelo]').forEach((e) => e.classList.toggle('ativo', e.dataset.modelo === id));
  document.querySelectorAll('#matriz td').forEach((td) => { const col = td.cellIndex - 1; td.classList.toggle('ativo', col >= 0 && CAT[col]?.id === id); });
}
function marcar(id, sid) {
  if (id && id !== atual) mostrarMotor(id);
  foco = sid || null; ctl.autoRotate = !foco;
  for (const k in marcadores) marcadores[k].scale.setScalar(k === foco ? 1.9 : foco ? 0.75 : 1);
}

const elRot = $('#rotulos'), pv = new THREE.Vector3();
function rotulo() {
  const g = foco && marcadores[foco];
  if (!g) { elRot.innerHTML = ''; return; }
  if (!elRot.firstChild) elRot.innerHTML = '<div class="rotulo"></div>';
  g.getWorldPosition(pv); pv.project(camera);
  const d = elRot.firstChild; d.textContent = g.userData.s.n;
  d.style.left = ((pv.x * 0.5 + 0.5) * vit.clientWidth) + 'px'; d.style.top = ((-pv.y * 0.5 + 0.5) * vit.clientHeight) + 'px';
}
function ajustar() { const w = vit.clientWidth, h = vit.clientHeight; if (!w || !h) return; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
new ResizeObserver(ajustar).observe(vit); ajustar();
const rel = new THREE.Clock();
renderer.setAnimationLoop(() => {
  const t = rel.getElapsedTime();
  for (const k in marcadores) marcadores[k].userData.mat.emissiveIntensity = k === foco ? 0.8 + 0.6 * Math.sin(t * 7) : 0.45;
  ctl.update(); renderer.render(cena, camera); rotulo();
});

/* ---------- eventos ---------- */
document.addEventListener('pointerover', (e) => {
  const s = e.target.closest('.sen'); if (s) { marcar(s.dataset.m, s.dataset.s); return; }
  const m = e.target.closest('#resumo [data-modelo], #matriz th[data-modelo]'); if (m) marcar(m.dataset.modelo, null);
});
document.addEventListener('click', (e) => {
  const b = e.target.closest('#segModelo [data-modelo], #resumo tr[data-modelo], #matriz th[data-modelo]');
  if (b && !e.target.closest('a')) { mostrarMotor(b.dataset.modelo); marcar(null, null); }
  if (e.target.id === 'btSoSerie') { soSerie = !soSerie; e.target.classList.toggle('pri', soSerie); desenharTabelas(); mostrarMotorAtualizado(); }
  if (e.target.dataset.dado === 'csv') exportar();
});
function mostrarMotorAtualizado() { const id = atual; atual = null; mostrarMotor(id); }
function exportar() {
  const lin = [['Modelo', 'Motor', 'Grandeza', 'Sensor', 'Id', 'Tipo', 'Peça', 'X (m)', 'Y (m)', 'Z (m)', 'Origem', 'Alerta', 'Crítico', 'Unidade']];
  for (const c of CAT) for (const s of SENS[c.id]) lin.push([c.nome, MOT[c.id].nome, (LINHAS[linhaDe(s)] || ['Outros'])[0], s.n, s.id, s.tipo, MOT[c.id].partes[s.parte]?.n || s.parte, ...s.pos, origem(s), s.al ?? '', s.cr ?? '', s.un]);
  const txt = '﻿' + lin.map((l) => l.map((x) => { x = String(x ?? ''); return /[;"\n]/.test(x) ? '"' + x.replace(/"/g, '""') + '"' : x; }).join(';')).join('\r\n');
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([txt], { type: 'text/csv' })); a.download = `motores_sensores_por_modelo_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 3000);
}

const ini = new URLSearchParams(location.search).get('m');
mostrarMotor(CAT.some((c) => c.id === ini) ? ini : CAT[0].id);
desenharTabelas(); mostrarMotorAtualizado();
window.motores = { MOT, SENS, mostrarMotor, marcar }; // útil para testes no console
