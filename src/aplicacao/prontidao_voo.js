// HeliSense 3D – prontidão para decolagem e voo "de acordo com os sensores" (aplicação; puro, sem DOM: navegador e Node).
//  · classificar(sensor)         → sistema da aeronave a que o sensor pertence (pelo componente monitorado)
//  · avaliarDecolagem(sens, est) → decisão GO / ATENÇÃO / NO-GO com os itens que a justificam
//  · efeitosNoVoo(sens, est, n)  → como as leituras degradam o voo (potência, resposta dos comandos, guinada, vibração)
//  · criarFonteSimulada(...)     → leituras simuladas que acompanham o voo (torque, temperatura, vibração) + falhas injetadas
//  · PilotoDecolagem             → decolagem e pouso automáticos sobre o modelo de sistemas (sistemas_aeronave.js)
// Regras ILUSTRATIVAS para treinamento. A decisão real de despacho segue o RFM, a MEL e o programa de manutenção aprovado.
import { estadoLimite } from './preditiva.js?v=20261123a';

export const SISTEMAS = {
  motor: 'Motor', transmissao: 'Transmissão', rotor_principal: 'Rotor principal', rotor_cauda: 'Rotor de cauda',
  comandos: 'Comandos / hidráulico', combustivel: 'Combustível / fogo', eletrico: 'Elétrico / aviônica',
  portas: 'Portas e capôs', trem: 'Trem de pouso', estrutura: 'Estrutura', outros: 'Outros'
};
// sistemas sem os quais não se voa: sem leitura (sem sinal) também impede a decolagem
export const ESSENCIAIS = new Set(['motor', 'transmissao', 'rotor_principal', 'rotor_cauda', 'comandos', 'combustivel']);

const REGRAS = [
  ['motor', /^(motor|entrada_ar|escapamento)/], ['transmissao', /^(transmissao|suporte_trans|eixo_motor|radiador_oleo|mastro)/],
  ['rotor_principal', /^(cubo_rp|pas_rp|swash)/], ['rotor_cauda', /^(rotor_cauda|caixa_rc|eixo_rc|comandos_rc)/],
  ['comandos', /^(hidraulico|comandos)/], ['combustivel', /^(combustivel|extintor)/],
  ['eletrico', /^(bateria|gerador|avionica|painel|pitot|luzes|antenas)/], ['portas', /^(porta_|carenagem_|parabrisa|janelas)/],
  ['trem', /^(esquis|tubo_)/], ['estrutura', /^(fuselagem|nariz|fus_traseira|cone_cauda|estabilizador|deriva|piso)/]
];
export function classificar(s) {
  const comps = s.comp || [];
  for (const [sistema, re] of REGRAS) {
    const c = comps.find((x) => re.test(x));
    if (c) { const m = sistema === 'motor' ? c.match(/_(\d)$/) : null; return { sistema, motor: sistema === 'motor' ? (m ? +m[1] - 1 : comps.some((x) => /^motor/.test(x)) ? 0 : null) : null }; }
  }
  return { sistema: 'outros', motor: null };
}

// estados: { idDoSensor: 'ok' | 'al' | 'cr' | 'sem' }  (anomalia/tendência da análise preditiva contam como 'ok' para o despacho)
const norm = (e) => (e === 'cr' || e === 'al' || e === 'sem' ? e : 'ok');
export function estadosDe(sensores, valores) {
  const r = {};
  for (const s of sensores) { const v = valores[s.id]; r[s.id] = v === undefined || v === null || Number.isNaN(v) ? 'sem' : estadoLimite(s, v); }
  return r;
}

/** Decisão de decolagem. itens: [{ s, sistema, estado, impede, motivo }] ordenados do mais grave ao menos grave. */
export function avaliarDecolagem(sensores, estados) {
  const itens = [];
  for (const s of sensores) {
    const estado = norm(estados[s.id]); if (estado === 'ok') continue;
    const { sistema } = classificar(s), essencial = ESSENCIAIS.has(sistema);
    const impede = estado === 'cr' || (estado === 'sem' && essencial);
    const motivo = estado === 'cr' ? 'leitura no nível crítico' : estado === 'al' ? 'leitura em alerta' : essencial ? 'sem leitura de sistema essencial ao voo' : 'sem leitura';
    itens.push({ s, sistema, estado, impede, motivo });
  }
  const peso = (i) => (i.impede ? 0 : i.estado === 'al' ? 1 : 2) * 10 + (ESSENCIAIS.has(i.sistema) ? 0 : 1);
  itens.sort((a, b) => peso(a) - peso(b));
  const impedem = itens.filter((i) => i.impede).length;
  return { decisao: impedem ? 'NO-GO' : itens.length ? 'ATENCAO' : 'GO', impedem, atencao: itens.length - impedem, itens };
}

/** Como as leituras degradam o voo. nMot = número de motores da aeronave. */
export function efeitosNoVoo(sensores, estados, nMot = 1) {
  const ef = { motorFora: Array(nMot).fill(false), potencia: Array(nMot).fill(1), resposta: 1, deriva: 0, vibVer: 0, vibLat: 0, pousar: false, avisos: [] };
  const pior = {}; // sistema (ou motor:i) → pior estado
  for (const s of sensores) {
    const e = norm(estados[s.id]); if (e !== 'cr' && e !== 'al') continue;
    const c = classificar(s), k = c.sistema === 'motor' ? 'motor:' + Math.min(c.motor ?? 0, nMot - 1) : c.sistema;
    if (e === 'cr' || !pior[k]) pior[k] = pior[k] === 'cr' ? 'cr' : e;
  }
  for (let i = 0; i < nMot; i++) {
    const e = pior['motor:' + i]; if (!e) continue;
    const nome = nMot > 1 ? `Motor ${i + 1}` : 'Motor';
    if (e === 'cr') { ef.motorFora[i] = true; ef.avisos.push(`${nome}: leitura crítica – motor cortado por proteção${nMot > 1 ? ' (voo com um motor inoperante)' : ' (autorrotação)'}.`); }
    else { ef.potencia[i] = 0.9; ef.avisos.push(`${nome}: leitura em alerta – potência disponível reduzida.`); }
  }
  if (pior.transmissao === 'cr') { ef.pousar = true; ef.avisos.push('Transmissão: leitura crítica – pousar assim que possível.'); }
  else if (pior.transmissao === 'al') ef.avisos.push('Transmissão: leitura em alerta – reduzir potência e monitorar.');
  if (pior.rotor_principal) { ef.vibVer = pior.rotor_principal === 'cr' ? 0.9 : 0.35; ef.avisos.push(`Rotor principal: vibração ${pior.rotor_principal === 'cr' ? 'severa' : 'acima do normal'}.`); if (pior.rotor_principal === 'cr') ef.pousar = true; }
  if (pior.rotor_cauda) { ef.deriva = pior.rotor_cauda === 'cr' ? 14 : 4; ef.vibLat = pior.rotor_cauda === 'cr' ? 0.5 : 0.15; ef.avisos.push(`Rotor de cauda: ${pior.rotor_cauda === 'cr' ? 'perda de eficiência – guinada difícil de segurar' : 'tendência de guinada'}.`); if (pior.rotor_cauda === 'cr') ef.pousar = true; }
  if (pior.comandos) { ef.resposta = pior.comandos === 'cr' ? 0.3 : 0.65; ef.avisos.push(`Comandos / hidráulico: comandos ${pior.comandos === 'cr' ? 'muito pesados e lentos' : 'mais pesados'}.`); }
  if (pior.combustivel === 'cr') { ef.pousar = true; ef.avisos.push('Combustível / fogo: leitura crítica – pousar assim que possível.'); }
  if (pior.eletrico === 'cr') ef.avisos.push('Elétrico / aviônica: leitura crítica – reduzir cargas elétricas.');
  return ef;
}

/* ---------------------------------------------------------------------
   Contexto do voo para a fonte simulada, lido do modelo de sistemas. Desconta da vibração a parcela que os próprios
   sensores causaram (senão um alerta alimentaria a si mesmo) e registra a aceleração do toque no pouso.
   --------------------------------------------------------------------- */
export function criarContexto(sis) {
  let vsAr = 0, gPouso = 0, noAr = false;
  return function contexto(dt = 0) {
    const S = sis.S, L = sis.leituras(), ef = S.efeitos, nrF2 = Math.min(1.1, Math.max(0, S.nr / 100)) ** 2;
    if (!S.noChao) { noAr = true; vsAr = S.vs; }
    else if (noAr) { noAr = false; gPouso = 1 + Math.abs(Math.min(0, vsAr)) / 2.2; } // toque a ~3 m/s ≈ 2,4 g (alerta de pouso duro)
    else gPouso = Math.max(0, gPouso - dt * 0.08);
    return {
      nr: S.nr, tq: L.map((l) => l.tq), temp: L.map((l) => l.temp), vBus: S.vBus, genOn: S.genOn, gPouso,
      vib: Math.hypot(Math.max(0, S.vib.ver - (ef ? ef.vibVer : 0) * nrF2), Math.max(0, S.vib.lat - (ef ? ef.vibLat : 0) * nrF2))
    };
  };
}

/* ---------------------------------------------------------------------
   Fonte simulada: cada sensor segue o voo (quando a medição depende dele) ou oscila em torno do valor de referência.
   ctx = { nr, tq: [% por motor], temp: [°C por motor], vib (ips), vBus, genOn, gPouso }
   --------------------------------------------------------------------- */
export function criarFonteSimulada(sensores, aleatorio = Math.random) {
  const valores = {}, falhas = new Set();
  for (const s of sensores) valores[s.id] = s.base;
  function alvo(s, ctx) {
    if (s.tipo === 'bool') return falhas.has(s.id) ? 1 : 0;
    if (falhas.has(s.id)) return s.cr + (s.cr - s.al) * 0.6 * (s.tipo === 'max' ? 1 : -1); // bem além do crítico: o ruído não o traz de volta
    const girando = ctx && ctx.nr > 50, c = classificar(s), txt = `${s.id} ${s.n}`.toLowerCase();
    if (!ctx) return s.base;
    if (/g_pouso|acelera..o vertical/.test(txt)) return Math.max(s.base, ctx.gPouso || 0);
    if (!girando) return s.base;
    const carga = Math.min(1.2, (ctx.tq.reduce((a, b) => a + b, 0) / ctx.tq.length) / 100); // 0 parado … ~0,75 cruzeiro … 1 decolagem
    if (/torque/.test(txt)) return carga * 100;
    if (c.sistema === 'motor' && /mgt|tot|itt|temperatura.*(g[aá]s|turbina)/.test(txt) && s.tipo === 'max') return Math.min(ctx.temp[Math.min(c.motor ?? 0, ctx.temp.length - 1)], s.al - (s.al - s.base) * 0.15);
    if (c.sistema === 'rotor_principal' && /vib/.test(txt)) return Math.max(s.base * 0.6, s.base + (ctx.vib - 0.1));
    // tensão da barra só conta com o gerador em linha: a queda durante o arranque é normal e não é leitura de condição
    if (/tens[aã]o.*bateria|^v_bat/.test(txt)) return ctx.genOn ? ctx.vBus : s.base;
    if (s.tipo === 'max' && /°c/i.test(s.un)) return s.base + (carga - 0.75) * (s.al - s.base) * 0.4; // temperaturas sobem com a carga
    return s.base;
  }
  function passo(dt, ctx) {
    const k = Math.min(1, dt * 0.6);
    for (const s of sensores) {
      if (s.tipo === 'bool') { valores[s.id] = alvo(s, ctx); continue; }
      const a = alvo(s, ctx), rapido = /g_pouso|torque|tens/.test(s.id) ? Math.min(1, dt * 4) : k;
      // ruído ∝ √(2k): a dispersão em regime fica igual à do sensor (ruido/√12) qualquer que seja o passo de tempo
      valores[s.id] += (a - valores[s.id]) * rapido + (aleatorio() - 0.5) * (s.ruido || 0) * Math.sqrt(2 * rapido);
    }
    return valores;
  }
  return { valores, falhas, passo, alternarFalha: (id) => { if (falhas.has(id)) falhas.delete(id); else falhas.add(id); return falhas.has(id); } };
}

/* ---------------------------------------------------------------------
   Piloto automático didático de decolagem e pouso, operando o modelo de sistemas como um piloto faria:
   energiza, dá partida, acelera o rotor, sobe ao pairado, faz a transição, sobe e nivela; ou desacelera e pousa.
   A cada passo recebe a avaliação dos sensores: NO-GO no solo rejeita a decolagem; ordem de pousar em voo inicia o pouso.
   --------------------------------------------------------------------- */
export const FASES = {
  parado: 'Aeronave parada', energizar: 'Energizando (bateria, bomba, válvulas)', partida: 'Partida do(s) motor(es)', acelerar: 'Acelerando o rotor para 100% Nr',
  checagem: 'Checagem final pelos sensores', pairado: 'Subindo ao pairado (3 m)', transicao: 'Transição para o voo à frente', subida: 'Subida',
  cruzeiro: 'Cruzeiro nivelado', pouso: 'Aproximação e pouso', solo: 'No solo – voo encerrado', rejeitada: 'Decolagem rejeitada (NO-GO)'
};
export class PilotoDecolagem {
  constructor(sis, { altPairado = 3, altCruzeiro = 60, velCruzeiro = 60, aoMudar = () => {} } = {}) {
    Object.assign(this, { sis, altPairado, altCruzeiro, velCruzeiro, aoMudar, fase: 'parado', ativo: false, t: 0, motor: 0, motivo: '' });
  }
  ir(fase, motivo = '') { if (fase !== this.fase) { this.fase = fase; this.t = 0; this.motivo = motivo; this.aoMudar(fase, motivo); } }
  decolar() { this.ativo = true; this.motor = 0; this.ir(this.sis.S.noChao ? 'energizar' : 'subida'); }
  pousar(motivo = '') { this.ativo = true; this.ir(this.sis.S.noChao ? 'solo' : 'pouso', motivo); }
  parar() { this.ativo = false; }
  // mantém a razão de subida (m/s) com o coletivo: corrige o erro e amortece pela aceleração vertical (o torque do motor responde com atraso)
  seguirVs(alvo, dt) {
    const S = this.sis.S, acc = dt > 0 ? (S.vs - (this.vsAnt ?? S.vs)) / dt : 0; this.vsAnt = S.vs;
    this.accF = (this.accF ?? 0) + (acc - (this.accF ?? 0)) * Math.min(1, dt * 5);
    const subindoDoSolo = S.noChao && alvo > 0 ? 0.12 : 0; // no solo não há erro de velocidade útil: sobe o coletivo devagar
    let d = ((alvo - S.vs) * 0.07 - this.accF * 0.16 + subindoDoSolo) * dt;
    const tq = Math.max(...this.sis.leituras().map((l) => l.tq)); // respeita o limite de torque: não passa de ~97%
    if (tq > 97) d = Math.min(d, -0.12 * dt); else if (tq > 92) d = Math.min(d, 0.02 * dt);
    S.col = Math.min(1, Math.max(0, S.col + d));
    return S.col;
  }
  passo(dt, avaliacao, efeitos) {
    if (!this.ativo) return this.fase;
    const { S, sims, P, N_MOT } = this.sis, f = this.fase; this.t += dt;
    const noGo = avaliacao && avaliacao.decisao === 'NO-GO';
    const noSolo = ['energizar', 'partida', 'acelerar', 'checagem'].includes(f);
    if (noSolo && noGo) { S.col = 0; if (S.manete > 0.25) S.manete = 0.25; this.ir('rejeitada', avaliacao.itens.filter((i) => i.impede).map((i) => i.s.n).slice(0, 3).join('; ')); this.ativo = false; return this.fase; }
    if (!noSolo && f !== 'pouso' && f !== 'solo' && !S.noChao && efeitos && (efeitos.pousar || efeitos.motorFora.some(Boolean))) this.ir('pouso', efeitos.avisos[0] || 'leitura crítica em voo');

    if (f === 'energizar') {
      if (!S.sw.bat) this.sis.alternar('bat'); if (!S.sw.bomba) this.sis.alternar('bomba');
      for (let i = 0; i < N_MOT; i++) if (!S.valv[i]) this.sis.alternar('valv' + i);
      S.manete = 0.25; S.col = 0; S.lon = 0; S.lat = 0; S.ped = 0;
      if (this.t > 1) this.ir('partida');
    } else if (f === 'partida') {
      const s = sims[this.motor];
      if (s.modo === 'parado' || s.modo === 'corte') { if (this.t > 0.5 && s.s.ng < 5) { this.sis.partida(this.motor); this.t = 0.6; } }
      else if (s.modo !== 'partida' && s.s.ng > P.ngIdle - 3) { this.motor++; this.t = 0; if (this.motor >= N_MOT) this.ir('acelerar'); }
      if (this.t > 120) { this.ir('rejeitada', 'partida não estabilizou'); this.ativo = false; }
    } else if (f === 'acelerar') {
      for (const k of ['gen', 'hid', 'avi']) if (!S.sw[k]) this.sis.alternar(k);
      S.manete = Math.min(1, S.manete + dt * 0.35);
      if (S.nr > 97) this.ir('checagem'); else if (this.t > 90) { this.ir('rejeitada', 'rotor não atingiu 100% Nr'); this.ativo = false; }
    } else if (f === 'checagem') {
      if (this.t > 2) this.ir('pairado');
    } else if (f === 'pairado') {
      S.lon *= 0.9; S.lat *= 0.9;
      this.seguirVs(Math.max(-0.5, Math.min(1.2, (this.altPairado - S.alt) * 0.8)), dt);
      if (Math.abs(S.alt - this.altPairado) < 0.6 && Math.abs(S.vs) < 0.4 && this.t > 6) this.ir('transicao');
      if (this.t > 60 && S.noChao) { S.col = 0; this.ir('rejeitada', 'sem potência para sair do solo'); this.ativo = false; }
    } else if (f === 'transicao' || f === 'subida' || f === 'cruzeiro') {
      S.lon += ((S.ias < this.velCruzeiro - 5 ? 0.45 : S.ias > this.velCruzeiro + 5 ? -0.1 : 0.12) - S.lon) * Math.min(1, dt * 0.8);
      S.lat *= 0.9;
      const erro = this.altCruzeiro - S.alt;
      this.seguirVs(f === 'transicao' ? 0.8 : Math.max(-2, Math.min(4, erro * 0.25)), dt);
      if (f === 'transicao' && S.ias > 30) this.ir('subida');
      else if (f === 'subida' && Math.abs(erro) < 4) this.ir('cruzeiro');
    } else if (f === 'pouso') {
      S.lon += ((S.ias > 8 ? -0.35 : 0) - S.lon) * Math.min(1, dt * 0.8); S.lat *= 0.9;
      const alvo = S.alt > 20 ? -3 : S.alt > 6 ? -1.5 : -0.7;
      this.seguirVs(alvo, dt);
      if (S.noChao && this.t > 1) { S.col = 0; S.lon = 0; this.ir('solo', this.motivo); this.ativo = false; }
    }
    return this.fase;
  }
}
