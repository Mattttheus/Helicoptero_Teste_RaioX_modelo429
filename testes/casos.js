// HeliSense 3D – testes automáticos (mesmos casos no navegador – testes.html – e no Node – testes/rodar_node.mjs).
// amb.carregar(arquivos) → objeto window com os dados de domínio carregados; amb.existe(caminho) → boolean.
import { MotorSim } from '../src/aplicacao/simulacao.js';
import { criarSistemas } from '../src/aplicacao/sistemas_aeronave.js';
import { normalizar, parecido, raizPalavra, montarVocab, criarAnalisador, criarZonas } from '../src/aplicacao/busca_texto.js';
import { esc, paraCsv } from '../src/apresentacao/util.js';
import { TECNOLOGIAS, tecnologiaDe, catalogoPorArea, resumoTecnologias } from '../src/dominio/sensores/catalogo_sensores.js';
import { suavizar, tendencia, indiceSaude, tempoAte, analisar, saudeComponentes, previsoes, formatarTempo, csvSensores } from '../src/aplicacao/preditiva.js';
import { FICHAS, PECAS_MOTOR, COMPONENTES, CAPITULOS } from '../src/dominio/documentacao/atlas.js';
import { classificar, estadosDe, avaliarDecolagem, efeitosNoVoo, criarFonteSimulada, criarContexto, PilotoDecolagem } from '../src/aplicacao/prontidao_voo.js';

export async function executar(t, amb) {
  const w0 = await amb.carregar(['src/dominio/frota/catalogo.js']);
  const CAT = w0.CATALOGO;

  /* ---------------- DOMÍNIO: frota ---------------- */
  t.grupo('Domínio · Frota (catálogo e aeronaves)');
  t.ok('catálogo tem 7 modelos', CAT.length === 7, CAT.map((c) => c.id).join(', '));
  t.ok('ids do catálogo únicos', new Set(CAT.map((c) => c.id)).size === CAT.length);
  for (const c of CAT) {
    t.ok(`${c.id}: campos obrigatórios`, ['id', 'nome', 'motor', 'config', 'cor', 'arquivos', 'motorArq', 'chave'].every((k) => c[k]));
    for (const a of [...c.arquivos, c.motorArq]) t.ok(`${c.id}: arquivo existe – ${a}`, await amb.existe(a));
  }
  const comps = new Set(), motores = {};
  for (const c of CAT) {
    const w = await amb.carregar([...c.arquivos]);
    const H = w.HELI;
    t.ok(`${c.id}: HELI carregado`, !!H && !!H.COMPS, H ? Object.keys(H).slice(0, 6).join(',') : 'sem HELI');
    if (!H || !H.COMPS) continue;
    const ids = Object.keys(H.COMPS); ids.forEach((i) => comps.add(i));
    t.ok(`${c.id}: componentes (${ids.length}) têm nome e ATA`, ids.every((i) => H.COMPS[i].n && H.COMPS[i].ata));
    const wm = await amb.carregar(['src/dominio/motores/motor_comum.js', c.motorArq]);
    const M = wm.MOTOR; motores[c.id] = M;
    t.ok(`${c.id}: MOTOR carregado (${M && M.nome})`, !!M && !!M.sim);
    if (!M) continue;
    const P = M.sim;
    t.ok(`${c.id}: limites de temperatura coerentes (${P.tempIdle} < ${P.tempMcp} ≤ ${P.tempTo} < ${P.tempTrans})`, P.tempIdle < P.tempMcp && P.tempMcp <= P.tempTo && P.tempTo < P.tempTrans);
    t.ok(`${c.id}: limites de Ng coerentes (${P.ngIdle} < ${P.ngMcp} < ${P.ngTrans})`, P.ngIdle < P.ngMcp && P.ngMcp < P.ngTrans);
    const partes = new Set(Object.keys(M.partes || {}));
    const ruins = (M.sensores || []).filter((s) => !partes.has(s.parte) || !Array.isArray(s.pos) || s.pos.length !== 3);
    t.ok(`${c.id}: ${M.sensores.length} sensores ligados a peças válidas e com posição 3D`, ruins.length === 0, ruins.map((s) => s.id).join(', '));
    t.ok(`${c.id}: ids de sensores únicos`, new Set(M.sensores.map((s) => s.id)).size === M.sensores.length);
    t.ok(`${c.id}: tarefas de manutenção apontam para peças válidas`, (M.manutencao || []).every((x) => x.partes.every((p) => partes.has(p))));
  }

  /* ---------------- DOMÍNIO: documentação (atlas) ---------------- */
  t.grupo('Domínio · Catálogo de modelos de sensores (por componente e área)');
  for (const c of CAT) {
    const H = (await amb.carregar([...c.arquivos])).HELI; if (!H || !H.SENSORES) continue;
    const semTec = H.SENSORES.filter((s) => !tecnologiaDe(s).every((id) => TECNOLOGIAS[id]));
    t.ok(`${c.id}: todo sensor (${H.SENSORES.length}) tem tecnologia do catálogo`, semTec.length === 0, semTec.map((s) => s.id + ':' + s.un).join(' '));
    const cat = catalogoPorArea(H.SENSORES, H.COMPS, H.ZONAS);
    const pontos = cat.reduce((n, A) => n + A.zonas.reduce((m, Z) => m + Z.comps.reduce((k, C) => k + C.itens.length, 0), 0), 0);
    const esperado = H.SENSORES.reduce((n, s) => n + s.comp.filter((x) => H.COMPS[x]).length, 0);
    t.ok(`${c.id}: catálogo por área cobre todos os pontos de medição (${pontos})`, pontos === esperado, `${pontos} de ${esperado}`);
    t.ok(`${c.id}: resumo por tecnologia soma o total de sensores`, resumoTecnologias(H.SENSORES).reduce((n, x) => n + x.n, 0) === H.SENSORES.length);
  }
  t.ok('tecnologias com ficha completa (princípio, faixa, saída, fixação, preditiva, bancada)', Object.values(TECNOLOGIAS).every((x) => x.nome && x.principio && x.faixa && x.saida && x.fixacao && x.preditiva && x.bancada));
  t.ok('regras: vibração → IEPE, limalha → chip detector, MGT → termopar K, óleo → Pt100', tecnologiaDe({ id: 'v', n: 'Vibração', un: 'ips', tipo: 'max' })[0] === 'acel_iepe' && tecnologiaDe({ id: 'chip', n: 'Detector de limalha', un: '', tipo: 'bool' })[0] === 'chip_detector' && tecnologiaDe({ id: 'mgt', n: 'MGT – motor', un: '°C', tipo: 'max' })[0] === 'termopar_k' && tecnologiaDe({ id: 't', n: 'Temperatura do óleo da transmissão', un: '°C', tipo: 'max' })[0] === 'rtd_pt100');

  t.grupo('Domínio · Documentação (atlas)');
  t.ok('120 fichas com título', Object.keys(FICHAS).length === 120 && Object.values(FICHAS).every(Boolean));
  t.ok('capítulos cobrem 1–120 sem buracos', Array.from({ length: 120 }, (_, i) => i + 1).every((n) => CAPITULOS.some(([a, b]) => n >= a && n <= b)));
  const todasPartes = new Set(Object.values(motores).flatMap((m) => Object.keys(m.partes || {})));
  const pecasSem = Object.keys(PECAS_MOTOR).filter((p) => !todasPartes.has(p));
  t.ok('peças do atlas existem em algum motor', pecasSem.length === 0, pecasSem.join(', '));
  const compsSem = Object.keys(COMPONENTES).filter((c) => !comps.has(c));
  t.ok('componentes do atlas existem em alguma aeronave', compsSem.length === 0, compsSem.join(', '));
  t.ok('todas as referências apontam para fichas existentes', [...Object.values(PECAS_MOTOR), ...Object.values(COMPONENTES)].every((r) => r.fichas.every((n) => FICHAS[n])));
  if (amb.existe) { const falta = []; for (const n of [1, 60, 74, 120]) if (!(await amb.existe(`dados/atlas/ficha_${String(n).padStart(3, '0')}.webp`))) falta.push(n); t.ok('imagens HD do atlas presentes (amostra)', !falta.length, falta.join(', '), !falta.length ? null : 'aviso'); }

  /* ---------------- APLICAÇÃO: simulação do motor ---------------- */
  t.grupo('Aplicação · Simulação do motor');
  for (const [id, M] of Object.entries(motores)) {
    const P = M.sim, s = new MotorSim(P);
    s.partida('nenhuma'); let t1 = 0; while (t1 < 180 && !(s.acendeu && s.s.ng > P.ngIdle - 3)) { s.passo(0.05); t1 += 0.05; }
    t.ok(`${id}: partida normal chega à marcha lenta (${t1.toFixed(0)} s, Ng ${s.s.ng.toFixed(0)}%)`, s.acendeu && s.s.ng > P.ngIdle - 3);
    t.ok(`${id}: pico de ${P.temp} na partida dentro do limite (${s.picoTemp.toFixed(0)} ≤ ${P.tempPartidaMax} °C)`, s.picoTemp <= P.tempPartidaMax);
    s.abortar('teste'); for (let k = 0; k < 600; k++) s.passo(0.05);
    t.ok(`${id}: corte desliga combustível e desacelera`, !s.comb && s.s.ng < P.ngIdle);
    const q = new MotorSim(P); q.partida('quente'); for (let k = 0; k < 2400; k++) q.passo(0.05);
    t.ok(`${id}: partida quente detecta excedência de temperatura`, q.picoTemp > P.tempPartida || q.evts.some((e) => e.nivel === 'cr' || e.nivel === 'al'));
  }

  /* ---------------- APLICAÇÃO: sistemas da aeronave (modelo da cabine) ---------------- */
  t.grupo('Aplicação · Sistemas da aeronave (elétrico, A/C, rotor, panes)');
  const M407 = motores['407'] || Object.values(motores)[0];
  const novo = () => { const ev = []; const A = criarSistemas({ P: M407.sim, nMot: 1, pas: 4, MotorSim, aoEvento: (x, n) => ev.push([x, n]) }); A.ev = ev; return A; };
  const roda = (A, seg) => { for (let k = 0; k < seg * 20; k++) A.passo(0.05); };
  const ligarTudo = (A) => { A.alternar('bat'); A.alternar('bomba'); A.alternar('valv0'); A.S.manete = 0.25; };
  { const A = novo(); A.alternar('bat'); A.partida(0); t.ok('partida negada sem bomba de reforço e com válvula fechada', A.ev.some(([x]) => /negada/.test(x) && /BOOST/.test(x) && /válvula/.test(x))); }
  { const A = novo(); roda(A, 1); t.ok('barra sem tensão com bateria desligada', A.S.vBus === 0); A.alternar('bat'); roda(A, 1); t.ok(`bateria ligada: barra ≈ 25 V (${A.S.vBus.toFixed(1)} V)`, A.S.vBus > 24 && A.S.vBus < 26.5); t.ok('alarme GEN aceso com motor parado', A.ALARMES.some(([n, on]) => n === 'GEN' && on)); }
  const emVoo = (A) => { ligarTudo(A); A.partida(0); roda(A, 90); A.alternar('gen'); A.alternar('hid'); A.alternar('avi'); A.alternar('vent'); A.S.manete = 1; roda(A, 60); };
  { const A = novo(); emVoo(A); t.ok(`motor em voo: Nr ${A.S.nr.toFixed(0)}% e gerador on-line (${A.S.vBus.toFixed(1)} V)`, A.S.nr > 95 && A.S.genOn && A.S.vBus > 27); t.ok('sem alarmes vermelhos com tudo normal', !A.ALARMES.some(([, on, v]) => on && v), A.ALARMES.filter(([, on]) => on).map(([n]) => n).join(', '));
    A.S.col = 0.85; roda(A, 25); t.ok(`coletivo alto: decola (altura ${A.S.alt.toFixed(1)} m)`, A.S.alt > 1); }
  { const A = novo(); emVoo(A); A.S.pane = 'gerador'; roda(A, 5); t.ok('pane do gerador: GEN aceso e bateria descarregando', A.ALARMES.some(([n, on]) => n === 'GEN' && on) && A.S.ampBat < 0); }
  { const A = novo(); emVoo(A); A.S.pane = 'sobrecarga_ac'; A.alternar('ac'); roda(A, 6); t.ok('sobrecarga do A/C desarma o disjuntor', !A.S.cbAC && A.ev.some(([x]) => /Disjuntor do A\/C desarmou/.test(x))); }
  { const A = novo(); emVoo(A); A.alternar('ac'); const c0 = A.S.cabine; roda(A, 120); t.ok(`A/C resfria a cabine (${c0.toFixed(1)} → ${A.S.cabine.toFixed(1)} °C)`, A.S.cabine < c0 - 3); }
  { const A = novo(); emVoo(A); A.alternar('ac'); A.S.pane = 'embreagem_ac'; const c0 = A.S.cabine; roda(A, 120); t.ok('embreagem do A/C com falha: cabine não resfria', A.S.cabine >= c0 - 1); }
  { const A = novo(); emVoo(A); A.S.pane = 'pa_danificada'; roda(A, 3); t.ok(`pá danificada: vibração ${A.S.vib.ips.toFixed(2)} IPS 1/rev e pá fora do track`, A.S.vib.ips > 0.8 && A.S.vib.ordem === '1/rev' && Math.abs(A.S.track[0]) > 10); }
  { const A = novo(); emVoo(A); A.S.pane = 'desbalanceamento'; roda(A, 3); t.ok('desbalanceamento: vibração lateral domina e track normal', A.S.vib.lat > A.S.vib.ver && A.S.track.every((v) => Math.abs(v) < 2)); }
  { const A = novo(); emVoo(A); const L0 = A.leituras()[0]; A.S.pane = 'potencia'; roda(A, 20); const L1 = A.leituras()[0]; t.ok(`queda de potência: temperatura sobe (${L0.temp.toFixed(0)} → ${L1.temp.toFixed(0)} °C)`, L1.temp > L0.temp + 20); }
  { const A = novo(); A.S.pane = 'bateria'; A.alternar('bat'); roda(A, 1); t.ok(`bateria fraca: tensão baixa antes da partida (${A.S.vBus.toFixed(1)} V)`, A.S.vBus < 23.5); }
  t.ok('todas as panes têm nome, sintomas e ação', Object.values(novo().PANES).every((p) => p.n && p.sint && p.acao));

  t.grupo('Aplicação · Manutenção preditiva (tendência, anomalia, saúde e tempo até o alerta)');
  {
    const sMax = { id: 'vib', n: 'Vibração', comp: ['cubo'], un: 'ips', tipo: 'max', base: 0.12, ruido: 0.02, al: 0.30, cr: 0.50 };
    const sMin = { id: 'pres', n: 'Pressão do óleo', comp: ['trans'], un: 'psi', tipo: 'min', base: 55, ruido: 1, al: 40, cr: 30 };
    const sBool = { id: 'chip', n: 'Limalha', comp: ['trans'], un: '', tipo: 'bool', base: 0 };
    const suv = suavizar([0, 10, 10, 10], 0.5);
    t.ok('EWMA acompanha o degrau sem pular', suv[0] === 0 && suv[1] === 5 && suv[3] > 8 && suv[3] < 10, suv.join(' '));
    const tr = tendencia([0, 1, 2, 3, 4].map((t) => ({ t, v: 2 * t + 1 })));
    t.ok('tendência: reta exata dá inclinação 2 e R² 1', Math.abs(tr.inclinacao - 2) < 1e-9 && Math.abs(tr.r2 - 1) < 1e-9, JSON.stringify(tr));
    t.ok('saúde: 100 no valor de referência, 0 no crítico, 50 no meio', indiceSaude(sMax, 0.12) === 100 && indiceSaude(sMax, 0.5) === 0 && indiceSaude(sMax, 0.31) === 50);
    t.ok('saúde de sensor que cai (pressão)', indiceSaude(sMin, 55) === 100 && indiceSaude(sMin, 30) === 0 && indiceSaude(sMin, 42.5) === 50);
    t.ok('tempo até o limite: 0,10 ips a 0,01 ips/s → 20 s até 0,30', Math.abs(tempoAte(sMax, 0.10, 0.01, 0.30) - 20) < 1e-9);
    t.ok('tempo até o limite: tendência contrária = não chega', tempoAte(sMax, 0.2, -0.01, 0.3) === null && tempoAte(sMin, 50, 0.5, 40) === null);
    const estavel = Array.from({ length: 40 }, (_, i) => ({ t: i, v: 0.12 + ((i * 7919) % 11 - 5) * 0.002 }));
    const aE = analisar(sMax, estavel);
    t.ok('sensor estável: estado normal e sem previsão de alerta', aE.estado === 'ok' && aE.tAlerta === null, JSON.stringify({ e: aE.estado, t: aE.tAlerta, r2: aE.r2 }));
    const subindo = Array.from({ length: 40 }, (_, i) => ({ t: i * 60, v: 0.12 + i * 0.003 }));
    const aS = analisar(sMax, subindo, { horizonte: 3600 });
    t.ok('degradação lenta (0,003 ips/min): marca tendência antes do alerta', aS.limite === 'ok' && aS.estado === 'tendencia' && aS.tAlerta > 0 && aS.tAlerta < 3600, JSON.stringify({ e: aS.estado, t: aS.tAlerta, l: aS.limite }));
    t.ok('degradação lenta: tempo até o crítico maior que até o alerta', aS.tCritico > aS.tAlerta);
    const caindo = Array.from({ length: 40 }, (_, i) => ({ t: i * 60, v: 55 - i * 0.3 }));
    const aC = analisar(sMin, caindo, { horizonte: 7200 });
    t.ok('pressão caindo também gera tendência', aC.estado === 'tendencia' && aC.tAlerta > 0, JSON.stringify({ e: aC.estado, t: aC.tAlerta }));
    const salto = [...Array.from({ length: 30 }, (_, i) => ({ t: i, v: 0.12 })), ...Array.from({ length: 10 }, (_, i) => ({ t: 30 + i, v: 0.24 }))];
    const aA = analisar(sMax, salto, { horizonte: 1 });
    t.ok('salto dentro da faixa (0,12 → 0,24 ips): anomalia', aA.limite === 'ok' && aA.estado === 'anomalia', JSON.stringify({ e: aA.estado, z: aA.z }));
    const aCr = analisar(sMax, [{ t: 0, v: 0.6 }]);
    t.ok('acima do crítico: estado crítico e saúde 0', aCr.estado === 'cr' && aCr.saude === 0);
    t.ok('discreto (limalha detectada) = crítico', analisar(sBool, [{ t: 0, v: 1 }]).estado === 'cr' && analisar(sBool, [{ t: 0, v: 0 }]).estado === 'ok');
    const an = { vib: aS, pres: aC, chip: analisar(sBool, [{ t: 0, v: 0 }]) };
    const sc = saudeComponentes([sMax, sMin, sBool], an);
    t.ok('componente fica com o pior estado e a menor saúde dos seus sensores', sc.trans.estado === 'tendencia' && sc.trans.saude === Math.min(aC.saude, 100) && sc.cubo.estado === 'tendencia');
    const pv = previsoes([sMax, sMin, sBool], an);
    t.ok('próximas falhas previstas: ordenadas pelo tempo até o alerta', pv.length === 2 && pv[0].a.tAlerta <= pv[1].a.tAlerta, pv.map((x) => x.s.id + ':' + Math.round(x.a.tAlerta)).join(' '));
    t.ok('formato de tempo legível', formatarTempo(45) === '45 s' && formatarTempo(600) === '10 min' && formatarTempo(5400) === '1,5 h' && formatarTempo(null) === '—');
    const csv = csvSensores([sMax], { vib: subindo.slice(0, 3) }, { vib: aS });
    t.ok('CSV dos sensores: cabeçalho + uma linha por amostra, separador ;', csv.split('\r\n').length === 4 && csv.startsWith('sensor;nome;') && csv.includes(';0,120;'), csv.split('\r\n')[1]);
  }

  t.grupo('Aplicação · Busca em texto livre e utilitários');
  t.ok('normaliza acentos, plural e separa PN de letras', JSON.stringify(normalizar('Inspeções dos Rolamentos 206-040')) === JSON.stringify(['inspecao', 'rolamento', '206', '040']));
  t.ok('radical: "mangueiras" → "mangueira", "papéis" → "papel"', raizPalavra('mangueiras') === 'mangueira' && raizPalavra(normalizar('papéis')[0]) === 'papel');
  t.ok('tolera erro de digitação em palavra longa', parecido('transmissao', 'transmisao') && !parecido('bomba', 'bombo'));
  t.ok('não confunde números de peça parecidos', !parecido('206040001', '206040002'));
  t.ok('vocabulário a partir das palavras-chave', montarVocab([['rotor principal|mastro', ['rotor'], 0]]).length === 2);
  t.ok('escapa HTML', esc('<a href="x">&</a>') === '&lt;a href=&quot;x&quot;&gt;&amp;&lt;/a&gt;' && esc(null) === '');
  t.ok('CSV com ; , aspas e BOM para o Excel', paraCsv([['a;b', 'c"d', 1]]) === '\uFEFF"a;b";"c""d";1');

  t.grupo('Aplicação · Interpretação da descrição de manutenção (dados reais do 505 e do 429)');
  for (const id of ['505', '429']) {
    const c = CAT.find((x) => x.id === id); if (!c) continue;
    const H = (await amb.carregar(c.arquivos)).HELI;
    const TAREFAS = []; const { compsDeZonas, nomeZonas } = criarZonas(H.ZC, H.ZONAS);
    for (const ins of H.MPI.INSPECOES) for (const g of ins.g) for (const tt of g.t) TAREFAS.push({ ins, g, t: tt, comps: tt[4] || g.c || compsDeZonas(tt[3]) });
    const analisar = criarAnalisador({ VOCAB: montarVocab(H.KW), COMPS: H.COMPS, TAREFAS });
    const r1 = analisar('inspeção das pás do rotor principal');
    t.ok(`${id}: "pás do rotor principal" → pas_rp (${r1.ids.join(', ')})`, r1.ids.includes('pas_rp'));
    const r2 = analisar('troca do filtro de combustivel');
    t.ok(`${id}: "filtro de combustível" → sistema de combustível`, r2.ids.some((x) => /combust/.test(x)), r2.ids.join(', '));
    const r3 = analisar('transmisão principal com vazamento'); // erro de digitação proposital
    t.ok(`${id}: tolera erro de digitação ("transmisão") → transmissao`, r3.ids.includes('transmissao'), r3.ids.join(', '));
    t.ok(`${id}: tarefas do manual relacionadas às pás`, r1.rel.length > 0);
    const z = Object.keys(H.ZONAS)[0];
    t.ok(`${id}: zona ${z} tem nome legível`, nomeZonas(z).startsWith(z + ' – '));
  }

  /* ---------------- APLICAÇÃO: decolagem e voo de acordo com os sensores ---------------- */
  t.grupo('Aplicação · Decolagem e voo de acordo com os sensores');
  {
    const sx = (id, comp, o = {}) => ({ id, n: id, comp, un: '°C', tipo: 'max', base: 50, ruido: 1, al: 80, cr: 100, ...o });
    const SS = [sx('m1', ['motor_1']), sx('m2', ['motor_2']), sx('rc', ['caixa_rc']), sx('hid', ['hidraulico'], { tipo: 'min', base: 100, al: 90, cr: 80 }), sx('porta', ['porta_pax_L'], { tipo: 'bool', base: 0 })];
    const c2 = classificar(SS[1]);
    t.ok('classifica o sensor do motor 2 pelo componente', c2.sistema === 'motor' && c2.motor === 1, JSON.stringify(c2));
    t.ok('classifica rotor de cauda, comandos e portas', classificar(SS[2]).sistema === 'rotor_cauda' && classificar(SS[3]).sistema === 'comandos' && classificar(SS[4]).sistema === 'portas');
    const est = estadosDe(SS, { m1: 60, m2: 85, rc: 120, hid: 85 });
    t.ok('estados pelas leituras: ok, alerta, crítico e sem sinal', est.m1 === 'ok' && est.m2 === 'al' && est.rc === 'cr' && est.hid === 'al' && est.porta === 'sem', JSON.stringify(est));
    const tudoOk = { m1: 'ok', m2: 'ok', rc: 'ok', hid: 'ok', porta: 'ok' };
    t.ok('tudo normal → GO', avaliarDecolagem(SS, tudoOk).decisao === 'GO');
    t.ok('porta em alerta → ATENÇÃO (não impede)', avaliarDecolagem(SS, { ...tudoOk, porta: 'al' }).decisao === 'ATENCAO');
    t.ok('porta destravada (crítico) → NO-GO', avaliarDecolagem(SS, { ...tudoOk, porta: 'cr' }).decisao === 'NO-GO');
    t.ok('motor sem leitura → NO-GO (sistema essencial)', avaliarDecolagem(SS, { ...tudoOk, m1: 'sem' }).decisao === 'NO-GO');
    t.ok('porta sem leitura → ATENÇÃO (não essencial)', avaliarDecolagem(SS, { ...tudoOk, porta: 'sem' }).decisao === 'ATENCAO');
    const av = avaliarDecolagem(SS, { ...tudoOk, porta: 'al', rc: 'cr' });
    t.ok('o item que impede vem primeiro na lista', av.itens[0].s.id === 'rc' && av.itens[0].impede && av.impedem === 1 && av.atencao === 1);
    const ef = efeitosNoVoo(SS, { ...tudoOk, m2: 'cr', hid: 'cr', rc: 'al' }, 2);
    t.ok('motor 2 crítico → só o motor 2 é cortado', ef.motorFora[0] === false && ef.motorFora[1] === true);
    t.ok('hidráulico crítico → comandos lentos; rotor de cauda em alerta → guinada', ef.resposta < 0.5 && ef.deriva > 0, JSON.stringify(ef));
    const e0 = efeitosNoVoo(SS, tudoOk, 2);
    t.ok('sem alertas → nenhum efeito no voo', e0.resposta === 1 && e0.deriva === 0 && !e0.pousar && !e0.motorFora.some(Boolean) && e0.avisos.length === 0);
  }
  for (const id of ['429', '407']) {
    const c = CAT.find((x) => x.id === id), M = motores[id]; if (!c || !M) continue;
    const SENS = (await amb.carregar([...c.arquivos])).HELI.SENSORES, nMot = /bimotor/.test(c.config) ? 2 : 1;
    // voa com decolagem automática; plano(t, voo) injeta falhas e ordens; devolve o que aconteceu
    const voar = (plano, segundos = 400) => {
      const ev = [], sis = criarSistemas({ P: M.sim, nMot, pas: 4, MotorSim, aoEvento: (x, n) => ev.push([x, n]) });
      const fonte = criarFonteSimulada(SENS, () => 0.5), ctx = criarContexto(sis), fases = [];
      const pil = new PilotoDecolagem(sis, { aoMudar: (f) => fases.push(f) });
      const v = { sis, fonte, pil, fases, ev, altMax: 0, gMax: 0 };
      pil.decolar();
      for (let tt = 0; tt < segundos; tt += 0.05) {
        plano(tt, v);
        const cx = ctx(0.05), est = estadosDe(SENS, fonte.passo(0.05, cx)), ava = avaliarDecolagem(SENS, est);
        sis.S.efeitos = efeitosNoVoo(SENS, est, nMot); pil.passo(0.05, ava, sis.S.efeitos); sis.passo(0.05);
        v.altMax = Math.max(v.altMax, sis.S.alt); v.gMax = Math.max(v.gMax, cx.gPouso); v.ultima = ava;
      }
      return v;
    };
    const motorSens = SENS.find((s) => classificar(s).sistema === 'motor' && s.tipo === 'max' && /mgt|tot|itt|temp/i.test(s.id + s.n));
    const transBool = SENS.find((s) => classificar(s).sistema === 'transmissao' && s.tipo === 'bool');
    {
      const v = voar((tt, x) => { if (tt > 300 && x.pil.fase === 'cruzeiro') x.pil.pousar('fim do voo'); });
      t.ok(`${id}: decolagem automática chega ao cruzeiro`, ['energizar', 'partida', 'acelerar', 'checagem', 'pairado', 'transicao', 'subida', 'cruzeiro'].every((f) => v.fases.includes(f)), v.fases.join(' → '));
      t.ok(`${id}: nivela perto de 60 m (máx ${v.altMax.toFixed(1)} m)`, v.altMax > 50 && v.altMax < 75);
      t.ok(`${id}: pouso automático termina no solo sem pouso duro (${v.gMax.toFixed(2)} g)`, v.pil.fase === 'solo' && v.sis.S.noChao && v.gMax < 2, v.pil.fase);
      t.ok(`${id}: voo normal não gera NO-GO`, v.ultima.decisao !== 'NO-GO', v.ultima.itens.map((i) => i.s.id + ':' + i.estado).join(', '));
    }
    if (transBool) {
      const v = voar((tt, x) => { if (tt >= 5 && !x.fonte.falhas.has(transBool.id)) x.fonte.alternarFalha(transBool.id); }, 120);
      t.ok(`${id}: sensor crítico no solo (${transBool.id}) → decolagem rejeitada, não sai do chão`, v.pil.fase === 'rejeitada' && v.altMax < 0.1, `${v.pil.fase} · ${v.altMax.toFixed(1)} m`);
    }
    if (motorSens) {
      const v = voar((tt, x) => { if (x.pil.fase === 'cruzeiro' && x.pil.t > 20 && !x.fonte.falhas.has(motorSens.id)) x.fonte.alternarFalha(motorSens.id); }, 420);
      t.ok(`${id}: sensor crítico do motor em voo (${motorSens.id}) → motor cortado por proteção`, v.ev.some(([x, n]) => /cortado por prote/.test(x) && n === 'cr'));
      t.ok(`${id}: ...e a aeronave vai para o pouso e termina no solo`, v.fases.includes('pouso') && v.sis.S.noChao, `${v.pil.fase} · alt ${v.sis.S.alt.toFixed(1)} m`);
    }
  }
  { // bimotor: a demanda de torque é por motor, então o 429 decola com o coletivo alto
    const M = motores['429'];
    if (M) {
      const A = criarSistemas({ P: M.sim, nMot: 2, pas: 4, MotorSim }); A.alternar('bat'); A.alternar('bomba'); A.alternar('valv0'); A.alternar('valv1'); A.S.manete = 0.25;
      for (let i = 0; i < 2; i++) { A.partida(i); for (let k = 0; k < 1200; k++) A.passo(0.05); }
      A.alternar('gen'); A.alternar('hid'); A.S.manete = 1; for (let k = 0; k < 400; k++) A.passo(0.05);
      A.S.col = 0.85; for (let k = 0; k < 400; k++) A.passo(0.05);
      t.ok(`429 (bimotor): coletivo alto decola (altura ${A.S.alt.toFixed(1)} m)`, A.S.alt > 1);
    }
  }
}
