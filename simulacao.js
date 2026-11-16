// Manutenção Interativa – simulação didática do motor: partida (ignição), perfil de voo, estresse de componentes
// e teste de sensores (BITE). Modelo de primeira ordem, ILUSTRATIVO: os limites vêm de modelos/<id>/motor.js
// (fichas EASA/TCDS e fontes públicas), mas a dinâmica não é a do motor real nem substitui o manual do fabricante.

const lerp = (a, b, k) => a + (b - a) * k;
const aproxima = (v, alvo, tau, dt) => v + (alvo - v) * (1 - Math.exp(-dt / Math.max(tau, 1e-3)));
const sino = (x, c, w) => Math.exp(-(((x - c) / w) ** 2));

export const FALHAS_PARTIDA = {
  nenhuma: 'Partida normal',
  quente: 'Partida quente (excesso de combustível)',
  pendurada: 'Partida pendurada (Ng não acelera)',
  sem_ignicao: 'Sem ignição (não acende)',
  arranque: 'Arranque fraco (bateria / starter)',
  oleo: 'Sem pressão de óleo'
};
export const TIPOS_ESTRESSE = {
  torque: 'Sobretorque (carga no eixo e na caixa de redução)',
  temperatura: 'Sobretemperatura (seção quente)',
  rotacao: 'Sobrevelocidade (Ng / turbina livre)',
  vibracao: 'Vibração / desbalanceamento',
  oleo: 'Perda de óleo (pressão caindo)',
  fod: 'FOD / erosão do compressor (perda de eficiência)'
};

export class MotorSim {
  constructor(P) {
    this.P = P;
    this.oat = 15; this.alt = 0; this.peso = 1;
    this.desligar(true);
  }
  desligar(imediato = false) {
    const s = this.s || {};
    this.s = { ng: imediato ? 0 : s.ng || 0, np: imediato ? 0 : s.np || 0, temp: imediato ? this.oat : s.temp ?? this.oat, tq: 0, oleoP: imediato ? 0 : s.oleoP || 0, oleoT: imediato ? this.oat : s.oleoT ?? this.oat,
      ff: 0, combP: 0, vibC: 0, vibT: 0, p3: 14.7, corrente: 0, ign: 0, chip: 0, filtroComb: 0, filtroOleo: 0 };
    this.modo = 'parado'; this.fase = 'Motor parado'; this.t = 0; this.tSim = 0; this.comb = false; this.arranque = false;
    this.alvo = { ng: 0, np: 0, pw: 0 }; this.picoTemp = this.oat; this.evts = []; this.exced = {}; this.dano = {}; this.estresse = null;
    this.acendeu = false; this.emMarcha = false; this.tParado = null; this.ngMax = 0; this.falha = 'nenhuma'; this.ngArranque = 0;
  }
  get rodando() { return this.comb && this.s.ng > 30; }
  evento(txt, nivel = 'info') { this.evts.push({ t: this.t, txt, nivel }); }

  /* ---------- comandos ---------- */
  partida(falha = 'nenhuma') {
    this.desligar(false); this.modo = 'partida'; this.falha = falha; this.fase = 'Bateria e bomba de reforço ligadas';
    this.evento('Início da partida: bateria ON, bomba de combustível de reforço ON' + (falha !== 'nenhuma' ? ` · falha simulada: ${FALHAS_PARTIDA[falha]}` : ''));
  }
  voo(perfil) {
    const P = this.P;
    this.perfil = perfil || [
      ['Rotação de voo (100% Np)', 5, 0.12], ['Pairado', 10, 0.72], ['Decolagem (potência máxima)', 8, P.tqTo / 100], ['Subida', 10, 0.92],
      ['Cruzeiro', 18, 0.8], ['Descida', 8, 0.35], ['Pairado / pouso', 8, 0.72], ['Marcha lenta (resfriamento)', 8, 0], ['Corte', 6, -1]];
    this.seg = 0; this.tSeg = 0;
    if (!this.rodando) { this.partida('nenhuma'); this.depoisPartida = 'voo'; return; }
    this.modo = 'voo'; this.evento('Início do perfil de voo (tempo comprimido ×8)');
  }
  estressar(tipo, intensidade) {
    if (!this.rodando) { this.partida('nenhuma'); this.depoisPartida = ['estresse', tipo, intensidade]; return; }
    this.modo = 'estresse'; this.estresse = { tipo, k: intensidade, t0: this.t }; this.alvo = { ng: 0, pw: 0.8, np: this.P.npVoo };
    this.evento(`Teste de estresse: ${TIPOS_ESTRESSE[tipo]} – intensidade ${Math.round(intensidade * 100)}%`, 'al');
  }
  abortar(motivo = 'Partida abortada pelo operador') {
    if (this.modo === 'parado') return;
    this.comb = false; this.arranque = false; this.s.ign = 0; this.modo = 'corte'; this.fase = 'Corte: combustível OFF, rotores desacelerando';
    this.evento(motivo + ' – combustível e ignição desligados.', 'al');
  }

  /* ---------- passo de simulação ---------- */
  passo(dt) {
    const P = this.P, s = this.s; this.t += dt;
    const fatorT = this.modo === 'voo' || this.modo === 'estresse' ? 8 : 1; this.tSim += dt * fatorT;
    let alvoTemp = this.oat, alvoNg = 0, alvoNp = 0, alvoTq = 0, alvoFF = 0;

    if (this.modo === 'partida') this.passoPartida(dt);
    if (this.modo === 'voo') this.passoVoo(dt);
    if (this.modo === 'estresse') this.passoEstresse(dt);
    if (this.modo === 'corte' && s.ng < 2 && s.np < 2) { this.modo = 'parado'; this.fase = 'Motor parado'; this.evento('Rotores parados.'); }

    // dinâmica comum
    const amb = (this.oat - 15) * 1.6 + this.alt / 1000 * 6;
    if (this.comb && this.acendeu) {
      const pw = Math.max(0, this.alvo.pw) * (this.alvo.pw > 0.3 ? this.peso : 1);
      const fod = this.estresse?.tipo === 'fod' ? this.estresse.k : 0;
      alvoNg = this.alvo.ng || lerp(P.ngIdle, P.ngMcp, Math.pow(Math.min(pw, 1.25), 0.55)) + fod * 4;
      alvoTq = pw * 100;
      alvoTemp = this.tempDePotencia(pw) + amb + fod * 140;
      if (this.modo === 'partida' && !this.emMarcha) alvoTemp = Math.max(alvoTemp, this.tempPartidaAlvo());
      alvoFF = lerp(P.ffIdle, P.ffTo, Math.max(0, pw) / (P.tqTo / 100)) * (1 + fod * 0.15);
      alvoNp = this.alvo.np;
    } else if (this.arranque) { alvoNg = this.ngArranque || 0; }
    if (this.estresse) ({ alvoNg, alvoNp, alvoTq, alvoTemp } = this.aplicarEstresse({ alvoNg, alvoNp, alvoTq, alvoTemp }));

    const accel = this.modo === 'partida' ? (this.acendeu ? 5 : 8) : this.comb ? 1.4 : 3.5;
    s.ng = Math.max(0, aproxima(s.ng, alvoNg, alvoNg < s.ng && !this.comb ? 4 : accel, dt));
    s.np = Math.max(0, aproxima(s.np, this.comb && this.acendeu ? alvoNp : 0, this.comb ? 1.6 : 6, dt));
    s.tq = Math.max(0, aproxima(s.tq, this.comb && s.np > 50 ? alvoTq : 0, 0.8, dt));
    s.temp = aproxima(s.temp, this.comb && this.acendeu ? alvoTemp : Math.max(this.oat, s.temp > 200 ? this.oat + (s.temp - this.oat) * 0.6 : this.oat), this.comb ? 1.1 : 6, dt);
    s.ff = aproxima(s.ff, this.comb ? (this.acendeu ? alvoFF : P.ffIdle * 0.6) : 0, 0.6, dt);
    s.combP = aproxima(s.combP, this.modo === 'parado' ? 0 : 22 + s.ng * 0.08, 0.8, dt);
    const perdaOleo = this.estresse?.tipo === 'oleo' ? Math.min(1, (this.t - this.estresse.t0) / (14 - 8 * this.estresse.k)) : 0;
    const pOleo = s.ng < 5 ? 0 : (s.ng < P.ngIdle ? P.oleoPidle * (s.ng / P.ngIdle) ** 1.4 : lerp(P.oleoPidle, P.oleoPvoo, Math.min(1, (s.ng - P.ngIdle) / (P.ngMcp - P.ngIdle)))) * (1 - perdaOleo) * (this.falha === 'oleo' ? 0.08 : 1);
    s.oleoP = aproxima(s.oleoP, pOleo, 0.7, dt);
    s.oleoT = aproxima(s.oleoT, s.ng > 20 ? (40 + 45 * s.ng / 100 + amb * 0.3 + perdaOleo * 70) : this.oat, this.modo === 'voo' ? 3 : 14, dt);
    const desb = this.estresse?.tipo === 'vibracao' ? 1 + 12 * this.estresse.k : 1;
    s.vibC = Math.max(0, 0.05 + 0.1 * (s.ng / 100) ** 2 * desb + (Math.random() - 0.5) * 0.015 * (s.ng > 5));
    s.vibT = Math.max(0, 0.06 + 0.11 * (s.np / 100) ** 2 * desb + (Math.random() - 0.5) * 0.015 * (s.np > 5));
    s.p3 = 14.7 * (1 + (P.razaoP - 1) * Math.pow(s.ng / 100, 2.2)) * (1 - this.alt / 145000);
    s.corrente = this.arranque ? 120 + 240 * Math.max(0, 1 - s.ng / 30) : (s.ng > 40 ? 35 : 0);
    this.picoTemp = Math.max(this.picoTemp, s.temp);
    this.monitorar(dt);
    if (this.estresse || this.modo === 'voo') this.acumularDano(dt * fatorT);
  }

  tempDePotencia(pw) { // ISA nível do mar: 100% de torque ~ 25 °C abaixo do contínuo; torque de decolagem ~ 10 °C abaixo do limite
    const P = this.P, tMcp = P.tempMcp - 25, xTo = Math.max(1.0001, P.tqTo / 100);
    if (pw <= 1) return lerp(P.tempIdle, tMcp, Math.pow(Math.max(pw, 0), 1.2));
    return lerp(tMcp, P.tempTo - 10, (pw - 1) / (xTo - 1));
  }
  tempPartidaAlvo() { // pico típico perto de 25–35% Ng, maior em partida quente / pendurada
    const P = this.P, s = this.s;
    const pico = this.falha === 'quente' ? P.tempPartidaMax * 1.08 : this.falha === 'pendurada' ? P.tempPartida * 0.98 : P.picoPartida;
    return lerp(P.tempIdle, pico, sino(s.ng, this.falha === 'pendurada' ? 40 : 30, this.falha === 'pendurada' ? 30 : 16));
  }

  passoPartida(dt) {
    const P = this.P, s = this.s, t = this.t;
    if (!this.arranque && !this.comb && t > 1) { this.arranque = true; this.fase = 'Arranque engatado: Ng subindo'; this.evento('Starter engatado.'); }
    if (this.arranque && !this.comb) {
      this.ngArranque = this.falha === 'arranque' ? 8 : 26;
      if (this.falha === 'arranque' && t > 9) { this.abortar(`Ng parou em ${s.ng.toFixed(0)}% (mínimo ${P.ngIgn}% para ignição): verificar bateria/starter`); return; }
      if (s.ng >= P.ngIgn) {
        this.comb = true; s.ign = 1; this.tComb = t; this.fase = P.fadec ? 'FADEC: ignição e combustível ON' : 'Manete em marcha lenta: ignição e combustível ON';
        this.evento(`Ng ${s.ng.toFixed(0)}%: ignição ON e combustível ON` + (P.fadec ? ' (sequência automática do FADEC)' : ' (manete para marcha lenta)'));
      }
    }
    if (this.comb && !this.acendeu) {
      if (this.falha === 'sem_ignicao') {
        if (t - this.tComb > 10) { this.abortar(`Sem ignição após 10 s (${P.temp} não subiu): cortar combustível e fazer motoring de 15 a 30 s para drenar`); }
        return;
      }
      if (t - this.tComb > 1.2) { this.acendeu = true; this.fase = `Light-off: ${P.temp} subindo`; this.evento(`Light-off (acendimento) – ${P.temp} subindo.`); this.alvo.pw = 0; }
    }
    if (this.acendeu && !this.emMarcha) {
      this.alvo.ng = this.falha === 'pendurada' ? 38 : P.ngIdle; this.alvo.np = P.npIdle;
      if (this.arranque && s.ng >= P.ngCorte) { this.arranque = false; s.ign = 0; this.evento(`Ng ${s.ng.toFixed(0)}%: starter e ignição desligados (corte automático).`); this.fase = 'Acelerando para marcha lenta'; }
      if (this.falha === 'pendurada') {
        if (s.ng > this.ngMax + 0.2) { this.ngMax = s.ng; this.tParado = t; }
        if (s.ng > 25 && t - this.tParado > 5) { this.abortar(`Partida pendurada: Ng estagnado em ${s.ng.toFixed(0)}% com ${P.temp} em ${s.temp.toFixed(0)} °C`); return; }
      }
      if (P.fadec && s.temp >= P.tempPartida - 5 && this.falha === 'quente') { this.abortar(`FADEC: ${P.temp} chegou a ${s.temp.toFixed(0)} °C (limite de partida ${P.tempPartida} °C) – partida abortada automaticamente`); return; }
      if (this.falha === 'oleo' && t - this.tComb > 9 && s.oleoP < P.oleoPmin) { this.abortar(`Pressão de óleo ${s.oleoP.toFixed(0)} psi abaixo do mínimo (${P.oleoPmin} psi) após a partida`); return; }
      if (!this.arranque && Math.abs(s.ng - P.ngIdle) < 1.2) {
        this.emMarcha = true; this.modo = 'marcha'; this.fase = 'Marcha lenta estabilizada';
        this.evento(`Partida concluída em ${t.toFixed(0)} s · pico de ${P.temp} ${this.picoTemp.toFixed(0)} °C (limite ${P.tempPartida} °C) · Ng ${s.ng.toFixed(1)}%`, this.picoTemp > P.tempPartida ? 'cr' : 'ok');
        const d = this.depoisPartida; this.depoisPartida = null;
        if (d === 'voo') this.voo(this.perfil); else if (Array.isArray(d)) this.estressar(d[1], d[2]);
      }
    }
  }

  passoVoo(dt) {
    const P = this.P;
    this.tSeg += dt;
    const seg = this.perfil[this.seg];
    if (!seg) return;
    if (this.tSeg === dt) this.evento('Fase: ' + seg[0]);
    this.fase = 'Voo · ' + seg[0];
    if (seg[2] < 0) { this.abortar('Corte do motor após o resfriamento'); this.modo = 'corte'; return; }
    this.alvo.pw = seg[2]; this.alvo.ng = 0; this.alvo.np = seg[2] === 0 && /marcha/i.test(seg[0]) ? P.npIdle : P.npVoo;
    if (this.tSeg >= seg[1]) { this.seg++; this.tSeg = 0; }
  }

  passoEstresse() {
    const e = this.estresse, dur = 30;
    this.fase = `Estresse: ${TIPOS_ESTRESSE[e.tipo]} · ${Math.max(0, dur - (this.t - e.t0)).toFixed(0)} s`;
    if (this.t - e.t0 > dur) { this.evento('Fim do teste de estresse: voltando à marcha lenta.'); this.estresse = null; this.modo = 'marcha'; this.alvo = { ng: 0, np: this.P.npIdle, pw: 0 }; }
  }
  aplicarEstresse(a) {
    const P = this.P, e = this.estresse, k = e.k, r = Math.min(1, (this.t - e.t0) / 6); // rampa de 6 s
    if (e.tipo === 'torque') a.alvoTq = lerp(a.alvoTq, P.tqTo * (1 + 0.45 * k), r);
    if (e.tipo === 'temperatura') a.alvoTemp = lerp(a.alvoTemp, P.tempTo + (P.tempTrans - P.tempTo) * 1.6 * k, r);
    if (e.tipo === 'rotacao') { a.alvoNp = lerp(a.alvoNp, P.npVoo * (1 + 0.16 * k), r); a.alvoNg = lerp(a.alvoNg, P.ngTrans + 2 * k, r); }
    return a;
  }

  /* ---------- carga normalizada (1,0 = limite) e dano por peça ---------- */
  cargas() {
    const P = this.P, s = this.s;
    return {
      tq: s.tq / P.tqTo,
      temp: Math.max(0, (s.temp - P.tempIdle * 0.6) / (P.tempTo - P.tempIdle * 0.6)),
      rpm: Math.max(s.ng / P.ngTrans, s.np / P.npMax),
      vib: Math.max(s.vibC, s.vibT) / 0.6,
      oleo: s.ng > 20 ? Math.max(s.oleoT / P.oleoTmax, P.oleoPmin / Math.max(s.oleoP, 1) * 0.9) : 0
    };
  }
  cargaPeca(est) {
    if (!est || this.modo === 'parado') return 0;
    const c = this.cargas(); let m = 0;
    for (const f in est) m = Math.max(m, est[f] * (c[f] || 0));
    return m;
  }
  acumularDano(dtSim) {
    for (const id in this.pesos || {}) {
      const L = this.cargaPeca(this.pesos[id]);
      if (L > 0.95) this.dano[id] = (this.dano[id] || 0) + dtSim * Math.pow(L - 0.95, 2) * 0.25;
    }
    const mancais = (this.dano.caixa_reducao || 0) + (this.dano.caixa_acessorios || 0) + (this.dano.oleo || 0);
    if (mancais > 0.6 && !this.s.chip) { this.s.chip = 1; this.evento('Detector de limalha (CHIP) acendeu: desgaste de rolamentos/engrenagens.', 'cr'); }
  }

  monitorar(dt) {
    const P = this.P, s = this.s, tS = (this.modo === 'voo' || this.modo === 'estresse') ? 8 : 1;
    const regras = [
      ['temp_partida', this.modo === 'partida' && s.temp > P.tempPartida, `${P.temp} acima do limite de partida (${P.tempPartida} °C)`, P.tempPartidaDur],
      ['temp_to', this.modo !== 'partida' && s.temp > P.tempTo, `${P.temp} acima do limite de decolagem (${P.tempTo} °C)`, P.tempTransDur],
      ['temp_mcp', this.modo !== 'partida' && s.temp > P.tempMcp && s.temp <= P.tempTo, `${P.temp} na faixa de decolagem (> ${P.tempMcp} °C, máx. 5 min)`, 300],
      ['tq', s.tq > P.tqTo, `Torque acima do limite de decolagem (${P.tqTo}%)`, 5],
      ['ng', s.ng > P.ngTrans, `Ng acima do limite (${P.ngTrans}%)`, 10],
      ['np', s.np > P.npMax, `Np/N2 acima do limite (${P.npMax}%)`, 15],
      ['oleoP', s.ng > P.ngIdle - 3 && s.oleoP < P.oleoPmin, `Pressão de óleo baixa (< ${P.oleoPmin} psi)`, 5],
      ['oleoT', s.oleoT > P.oleoTmax, `Temperatura do óleo alta (> ${P.oleoTmax} °C)`, 30],
      ['vib', Math.max(s.vibC, s.vibT) > 0.6, 'Vibração do motor acima de 0,6 ips', 10]
    ];
    for (const [id, ativo, txt, durMax] of regras) {
      const x = this.exced[id] ??= { ativo: false, dur: 0, max: 0, vezes: 0 };
      if (ativo) {
        if (!x.ativo) { x.ativo = true; x.vezes++; this.evento('EXCEDÊNCIA: ' + txt, 'al'); }
        x.dur += dt * tS; x.max = Math.max(x.max, id.startsWith('temp') ? s.temp : id === 'tq' ? s.tq : id === 'ng' ? s.ng : id === 'np' ? s.np : id === 'oleoP' ? s.oleoP : id === 'oleoT' ? s.oleoT : Math.max(s.vibC, s.vibT));
        if (durMax && x.dur > durMax && !x.avisado) { x.avisado = true; this.evento(`${txt} por ${x.dur.toFixed(0)} s (limite ${durMax} s): inspeção obrigatória conforme o manual do motor.`, 'cr'); }
      } else if (x.ativo) { x.ativo = false; this.evento(`Fim da excedência (${txt.split(' (')[0]}) – duração ${x.dur.toFixed(1)} s, máximo ${x.max.toFixed(1)}.`, 'info'); }
    }
  }
}

/* ---------- leitura de cada sensor (com falha de sensor injetada) ---------- */
export function valorSensor(sim, sen) {
  const s = sim.s;
  const base = { temp: s.temp + (sen.ofs || 0) * Math.min(1, s.temp / 500), ng: s.ng, np: s.np, tq: s.tq, oleoP: s.oleoP, oleoT: s.oleoT, ff: s.ff, combP: s.combP,
    vibC: s.vibC, vibT: s.vibT, p3: s.p3, t1: sim.oat, ign: s.ign ? 1.2 + Math.random() * 0.1 : 0, corrente: s.corrente, chip: s.chip, filtroComb: s.filtroComb, filtroOleo: s.filtroOleo }[sen.var] ?? 0;
  return aplicarFalhaSensor(base, sen, sen.falha);
}
export function aplicarFalhaSensor(v, sen, falha) {
  if (!falha || falha === 'ok') return v;
  const faixa = (sen.faixa?.[1] ?? 100) - (sen.faixa?.[0] ?? 0);
  if (falha === 'aberto') return NaN;
  if (falha === 'curto') return sen.faixa?.[0] ?? 0;
  if (falha === 'deriva') return v + faixa * 0.09;
  if (falha === 'ruido') return v + (Math.random() - 0.5) * faixa * 0.2;
  if (falha === 'intermitente') return Math.random() < 0.35 ? NaN : v;
  return v;
}
export const FALHAS_SENSOR = { ok: 'Sem falha', aberto: 'Circuito aberto', curto: 'Curto-circuito', deriva: 'Deriva de calibração (+9%)', ruido: 'Ruído elétrico', intermitente: 'Conector intermitente' };

// Teste de sensor estilo BITE/loop check: aplica 3 pontos de estímulo e compara com a tolerância
export function testarSensor(sen) {
  const [a, b] = sen.faixa || [0, 100], tol = sen.tol ?? (b - a) * 0.02, pontos = sen.lim === 'bool' ? [0, 1] : [a + (b - a) * 0.2, a + (b - a) * 0.55, a + (b - a) * 0.9];
  const leituras = pontos.map((p) => { const lido = aplicarFalhaSensor(p + (sen.lim === 'bool' ? 0 : (Math.random() - 0.5) * tol * 0.3), sen, sen.falha); return { p, lido, ok: Number.isFinite(lido) && Math.abs(lido - p) <= (sen.lim === 'bool' ? 0.1 : tol) }; });
  const ok = leituras.every((l) => l.ok);
  const diag = ok ? 'Dentro da tolerância em todos os pontos.' : {
    aberto: 'Sem sinal: circuito aberto – verificar conector, pinos e continuidade do chicote (resistência infinita).',
    curto: 'Leitura presa no mínimo da faixa: curto-circuito para massa – verificar isolação do chicote.',
    deriva: 'Erro sistemático acima da tolerância: recalibrar ou substituir o sensor.',
    ruido: 'Leitura instável: verificar blindagem/aterramento do cabo e interferência elétrica.',
    intermitente: 'Perda de sinal intermitente: inspecionar conector (pinos frouxos, corrosão) e fixação do chicote.'
  }[sen.falha] || 'Fora da tolerância.';
  return { ok, leituras, tol, diag };
}
