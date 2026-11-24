// HeliSense 3D – MODELO dos sistemas da aeronave (camada de aplicação; sem DOM nem Three.js).
// Estado e regras de: motores (MotorSim), sistema elétrico (bateria, gerador, barra, disjuntores), ar-condicionado /
// temperatura da cabine, rotor (track, vibração), voo didático, alarmes e panes para treino de diagnóstico.
// Usado pela Cabine 3D (controlador + visão) e pelos testes automáticos. Valores ILUSTRATIVOS para treinamento.

export function criarSistemas({ P, nMot = 1, pas = 2, MotorSim, aoEvento = () => {} }) {
  const N_MOT = nMot, PAS = pas, log = aoEvento;
  const fmt = (v, d = 0) => Number(v).toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d });
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  let combUsado = 0;
  const ALARMES = [];

  const S = {
    sw: { bat: false, gen: false, bomba: false, hid: false, avi: false, pitot: false, posn: false, anticol: false, pnl: false, ac: false, vent: false, gov: true },
    valv: Array(N_MOT).fill(false), cbAC: true, cbAvi: true,
    col: 0, lon: 0, lat: 0, ped: 0, manete: 0.25, tempSel: 21,
    oat: 32, cabine: 38, duto: 38, acLig: false,
    soc: 1, vBus: 0, ampGen: 0, ampBat: 0, cargas: 0, genOn: false,
    alt: 0, vs: 0, ias: 0, rumo: 0, pitch: 0, roll: 0, x: 0, z: 0, noChao: true,
    nr: 0, vib: { ips: 0, ordem: '—', lat: 0, ver: 0 }, track: Array(PAS).fill(0),
    pane: null, paneOculta: false, tPane: 0, startando: -1,
    // efeitos das leituras dos sensores sobre o voo (prontidao_voo.js → efeitosNoVoo); null = sem efeito
    efeitos: null
  };

  const sims = Array.from({ length: N_MOT }, () => new MotorSim(P));
  for (const s of sims) s.oat = S.oat;

  /* ---------------- panes (falhas para treinar diagnóstico) ---------------- */
  const PANES = {
    gerador: { n: 'Falha do gerador', sist: 'Elétrico', sint: 'Luz GEN acesa com motor girando, amperímetro do gerador em zero, bateria descarregando (corrente negativa) e tensão caindo de 28 V para 24 V ou menos.', acao: 'Desligar/religar GEN (reset); se não voltar, reduzir cargas (A/C, pitot se possível) e pousar conforme o RFM.' },
    sobrecarga_ac: { n: 'Sobrecarga / curto no compressor do A/C', sist: 'Elétrico + ECS', sint: 'Ao ligar o A/C a corrente salta (> 100 A), a tensão da barra cai e o disjuntor do A/C desarma em segundos (luz A/C CB); a cabine volta a esquentar.', acao: 'Manter o A/C desligado e o disjuntor desarmado; registrar a pane; inspecionar compressor/embreagem e chicote.' },
    embreagem_ac: { n: 'Embreagem do compressor do A/C não engata', sist: 'ECS', sint: 'A/C ligado, ventilador funcionando, mas o duto não esfria (duto ≈ cabine) e a corrente não sobe os ~4 A da embreagem. Sem efeito no motor.', acao: 'Verificar a embreagem eletromagnética, o relé, o fusível e o pressostato do gás.' },
    ventilador: { n: 'Falha do ventilador do evaporador', sist: 'ECS', sint: 'Duto muito frio (risco de congelar o evaporador), quase sem fluxo de ar e cabine esquentando; corrente do ventilador some (~6 A a menos).', acao: 'Desligar o A/C para não congelar o evaporador; verificar motor do ventilador e disjuntor.' },
    gas_baixo: { n: 'Carga baixa de gás refrigerante', sist: 'ECS', sint: 'A/C ligado e compressor engatado, porém o duto só cai até ~20 °C e a cabine resfria muito devagar.', acao: 'Verificar vazamentos e recarregar o gás conforme o manual do fabricante do sistema.' },
    bateria: { n: 'Bateria fraca', sist: 'Elétrico', sint: 'Tensão da bateria baixa antes da partida (< 23 V); na partida a tensão afunda e o Ng sobe devagar (arranque fraco / partida pendurada).', acao: 'Abortar a partida; carregar/trocar a bateria ou usar fonte externa (GPU) conforme o RFM.' },
    barra_avi: { n: 'Falha da barra de aviônicos', sist: 'Elétrico', sint: 'Displays de voo e rádios apagam, mas a indicação do motor continua; a corrente total cai de repente (~12 A).', acao: 'Verificar o interruptor AVIONICS, o relé da barra e os disjuntores.' },
    potencia: { n: 'Queda de potência do motor (sangria aberta / compressor sujo)', sist: 'Motor', sint: `Para o mesmo coletivo: ${P.temp} mais alta (+50 °C), Ng um pouco maior e torque menor; a aeronave sobe menos ou não decola com o coletivo habitual.`, acao: 'Comparar com a verificação de potência (PAC); inspecionar válvula de sangria, lavar o compressor, boroscopia.' },
    pa_danificada: { n: 'Pá do rotor principal danificada (delaminação / impacto)', sist: 'Rotor', sint: 'Vibração vertical 1/rev alta (IPS), uma pá fora do track (ponta mais alta/baixa na janela do rotor) e a cabine sacudindo no mesmo ritmo.', acao: 'Inspeção visual e tátil da pá, verificação de track & balance; pá fora dos limites → trocar.' },
    desbalanceamento: { n: 'Rotor principal desbalanceado', sist: 'Rotor', sint: 'Vibração LATERAL 1/rev, track das pás normal (todas na mesma altura); aumenta com a rotação.', acao: 'Balanceamento dinâmico (pesos no cubo/pás) com o analisador de vibração.' },
    biela_folga: { n: 'Folga na biela de passo / rolamento', sist: 'Comandos', sint: 'Vibração 2/rev (em bimotor/4 pás: n/rev) e resposta "atrasada" do cíclico; o track muda com o comando.', acao: 'Verificar folgas das bielas de passo e rolamentos do swashplate; trocar o que estiver fora de tolerância.' }
  };

  function leituras() { // valores exibidos (com efeitos das panes)
    const L = sims.map((s, i) => {
      const pot = S.pane === 'potencia', fSens = S.efeitos ? S.efeitos.potencia[i] ?? 1 : 1;
      return { ng: s.s.ng + (pot && s.s.ng > 50 ? 2 : 0), temp: s.s.temp + (pot && s.comb ? 50 : 0) + (S.acLig ? 8 : 0), tq: s.s.tq * (pot ? 0.9 : 1) * fSens, np: s.s.np, ff: s.s.ff, oleoP: s.s.oleoP, oleoT: s.s.oleoT };
    });
    return L;
  }

  /* =====================================================================
     Sistemas (elétrico, ECS, motor, rotor, voo) – um passo de simulação
     ===================================================================== */
  const perfis = sims.map(() => [['Marcha lenta', 1e9, 0]]);
  function passoSistemas(dt) {
    const L = leituras();
    // ---- motores
    const emMarcha = sims.filter((s) => s.modo !== 'parado' && s.modo !== 'corte').length || 1; // os motores restantes assumem a carga
    sims.forEach((s, i) => {
      s.oat = S.oat;
      if (S.efeitos && S.efeitos.motorFora[i] && s.modo !== 'parado' && s.modo !== 'corte') { s.abortar('Corte por proteção: leitura crítica de sensor do motor', 'cr'); log(`Motor ${N_MOT > 1 ? i + 1 + ' ' : ''}cortado por proteção: sensor em nível crítico.`, 'cr'); }
      if (s.modo !== 'parado' && s.modo !== 'corte' && (!S.valv[i] || S.manete < 0.08)) { s.abortar(S.manete < 0.08 ? 'Manete em corte' : 'Válvula de combustível fechada', 'info'); log(`Motor ${N_MOT > 1 ? i + 1 : ''} cortado (${S.manete < 0.08 ? 'manete em corte' : 'válvula fechada'}).`); }
      const voo = S.manete > 0.85;
      perfis[i][0][0] = voo ? 'Governado (comando do coletivo)' : 'Marcha lenta';
      const demanda = (0.08 + S.col * 0.95) * (P.tqTo / 100) * (N_MOT / Math.min(N_MOT, emMarcha)) * (S.acLig ? 1.04 : 1) // torque em % do limite de CADA motor * (S.pane === 'potencia' ? 1.1 : 1);
      perfis[i][0][2] = voo ? Math.min(demanda, P.tqTo / 100) : 0;
      if (s.modo === 'voo' && s.perfil !== perfis[i]) s.perfil = perfis[i];
      for (let r = dt; r > 1e-4; r -= 0.05) s.passo(Math.min(0.05, r));
      combUsado += s.s.ff * dt / 3600 * 0.25;
    });
    S.nr = Math.max(...sims.map((s) => s.s.np));
    // ---- elétrico
    const crank = S.startando >= 0 && sims[S.startando].s.ng < P.ngIgn * 4 && sims[S.startando].modo === 'partida';
    const ngMax = Math.max(...sims.map((s) => s.s.ng));
    S.genOn = S.sw.gen && S.sw.bat && ngMax > 55 && S.pane !== 'gerador';
    let c = 0;
    if (S.sw.bat) {
      c += 3; // instrumentos/essenciais
      if (S.sw.avi && S.cbAvi && S.pane !== 'barra_avi') c += 12;
      if (S.sw.pitot) c += 8; if (S.sw.posn) c += 3; if (S.sw.anticol) c += 2; if (S.sw.pnl) c += 2; if (S.sw.bomba) c += 5;
      const ventOk = S.sw.vent && S.pane !== 'ventilador'; if (ventOk) c += 6;
      if (S.sw.ac && S.cbAC) { c += S.pane === 'embreagem_ac' ? 0 : 4; if (S.pane === 'sobrecarga_ac' && S.nr > 50) { c += 105; S.tPane += dt; if (S.tPane > 3) { S.cbAC = false; S.tPane = 0; log('Disjuntor do A/C desarmou (sobrecorrente).', 'al'); } } }
      if (crank) c += 260;
    }
    S.cargas = c;
    const vBat = (S.pane === 'bateria' ? 22.6 : 25.2) - (1 - S.soc) * 5;
    if (!S.sw.bat) { S.vBus = 0; S.ampGen = 0; S.ampBat = 0; }
    else if (S.genOn) {
      const carga = Math.max(0, (1 - S.soc) * 60);
      S.ampGen = c + carga; S.ampBat = carga; S.soc = Math.min(1, S.soc + carga * dt / (17 * 3600) * 3);
      S.vBus = S.ampGen > 150 * N_MOT ? 25.2 : 28.2 - c * 0.004;
    } else {
      S.ampGen = 0; S.ampBat = -c; S.soc = Math.max(0, S.soc - c * dt / (17 * 3600) * 3);
      S.vBus = Math.max(0, vBat - c * (S.pane === 'bateria' ? 0.045 : 0.022));
    }
    if (crank && S.vBus < 16) { sims[S.startando].abortar('Tensão insuficiente para o starter', 'al'); log('Partida abortada: tensão da barra caiu abaixo de 16 V (bateria fraca).', 'al'); S.startando = -1; }
    if (S.startando >= 0 && sims[S.startando].modo !== 'partida') S.startando = -1;
    // ---- ar-condicionado (compressor acionado pela transmissão, embreagem elétrica)
    const ventOk = S.sw.vent && S.vBus > 22 && S.pane !== 'ventilador';
    const fluxo = ventOk ? 1 : 0.18;
    const pedeFrio = S.cabine > S.tempSel - 0.5;
    S.acLig = S.sw.ac && S.cbAC && S.vBus > 22 && S.nr > 70 && S.pane !== 'embreagem_ac' && pedeFrio && !(S.pane === 'sobrecarga_ac');
    const dutoAlvo = S.acLig ? (S.pane === 'gas_baixo' ? 20 : ventOk ? 7 : -2) : S.cabine;
    S.duto += (dutoAlvo - S.duto) * Math.min(1, dt * 0.4);
    const k = 5; // tempo acelerado ×5 para o treino
    S.cabine += dt * k * ((S.oat + 7 - S.cabine) / 900 + (S.duto - S.cabine) * fluxo / 260 + (ventOk && !S.acLig ? (S.oat - S.cabine) / 1500 : 0));
    // ---- rotor: track, vibração
    const nrF = clamp(S.nr / 100, 0, 1.1);
    S.track = Array.from({ length: PAS }, (_, i) => (S.pane === 'pa_danificada' && i === 0 ? 14 : 0) + (S.pane === 'biela_folga' && i === 1 ? 6 + 6 * Math.abs(S.lon) : 0) + (i % 2 ? 0.6 : -0.4));
    const ver = 0.08 + (S.pane === 'pa_danificada' ? 0.95 : 0) + (S.pane === 'biela_folga' ? 0.3 : 0) + (S.efeitos ? S.efeitos.vibVer : 0);
    const lat = 0.06 + (S.pane === 'desbalanceamento' ? 0.9 : 0) + (S.efeitos ? S.efeitos.vibLat : 0);
    S.vib.ver = ver * nrF * nrF; S.vib.lat = lat * nrF * nrF; S.vib.ips = Math.hypot(S.vib.ver, S.vib.lat);
    S.vib.ordem = S.nr < 20 ? '—' : S.pane === 'biela_folga' ? `${PAS === 4 ? 4 : 2}/rev` : '1/rev';
    // ---- voo (didático): sustentação ~ torque e Nr; atitude segue o cíclico
    const tqTot = L.reduce((a, l) => a + l.tq, 0) / N_MOT;
    const sust = (S.nr / 100) ** 2 * (0.15 + tqTot / 72 * 0.85) * (S.nr > 90 ? 1 : 0.4);
    const acc = (sust - 1) * 6 - S.vs * 0.8;
    S.vs += acc * dt; S.alt += S.vs * dt;
    if (S.alt <= 0) { if (S.vs < -3) log(`Pouso duro: ${fmt(-S.vs, 1)} m/s – inspeção condicional (pouso duro) necessária.`, 'cr'); S.alt = 0; S.vs = Math.max(0, S.vs); }
    S.noChao = S.alt < 0.05;
    const alvoP = S.noChao ? -S.lon * 1.5 : -S.lon * 14, alvoR = S.noChao ? S.lat * 1.5 : S.lat * 22;
    const resp = (S.pane === 'biela_folga' ? 0.8 : 2.2) * (S.efeitos ? S.efeitos.resposta : 1);
    S.pitch += (alvoP - S.pitch) * Math.min(1, dt * resp); S.roll += (alvoR - S.roll) * Math.min(1, dt * resp);
    if (!S.noChao) {
      S.ias = clamp(S.ias + (-S.pitch * 1.6 - S.ias * 0.05) * dt * 3, -20, 150);
      S.rumo += (S.ped * 28 + S.roll * 0.6 + (S.efeitos ? S.efeitos.deriva : 0)) * dt;
      const h = S.rumo * Math.PI / 180, v = Math.max(0, S.ias) * 0.514;
      S.x += Math.cos(h) * v * dt; S.z += Math.sin(h) * v * dt;
    } else { S.ias *= 0.9; }
    // ---- alarmes
    ALARMES.length = 0;
    for (let i = 0; i < N_MOT; i++) ALARMES.push([N_MOT > 1 ? `ENG ${i + 1} OUT` : 'ENG OUT', sims[i].s.ng < 55, true]);
    ALARMES.push(['GEN', S.sw.bat && !S.genOn, false], ['BATT', S.sw.bat && S.vBus < 24, false], ['BOOST', S.sw.bat && !S.sw.bomba, false],
      ['HYD', S.sw.bat && (!S.sw.hid || S.nr < 50), false], ['RPM', S.sw.bat && (S.nr > 104 || (S.nr > 10 && S.nr < 95 && S.manete > 0.85)), true],
      ['XMSN OIL', S.sw.bat && S.nr < 40, true], ['A/C', S.sw.bat && S.sw.ac && (!S.cbAC || (S.duto < 0 && S.acLig)), false],
      ['CABIN TEMP', S.sw.bat && S.cabine > 35, false], ['VIB', S.sw.bat && S.vib.ips > 0.8, false]);
  }

  const NOMES_SW = { bat: 'Bateria (BATT)', gen: 'Gerador (GEN)', bomba: 'Bomba de reforço (BOOST)', hid: 'Hidráulico (HYD SYS)', avi: 'Aviônicos', gov: 'FADEC / governador', pitot: 'Aquecimento do pitot', posn: 'Luzes de posição', anticol: 'Anticolisão', pnl: 'Luz do painel', ac: 'Ar-condicionado (A/C)', vent: 'Ventilador (BLOWER)' };

  function alternar(chave) {
    if (chave.startsWith('valv')) { const i = +chave.slice(4); S.valv[i] = !S.valv[i]; log(`Válvula de combustível ${N_MOT > 1 ? 'do motor ' + (i + 1) : 'do motor'} ${S.valv[i] ? 'ABERTA' : 'FECHADA'}.`); return; }
    S.sw[chave] = !S.sw[chave]; log(`${NOMES_SW[chave] || chave}: ${S.sw[chave] ? 'LIGADO' : 'DESLIGADO'}.`);
  }

  function partida(i) {
    passoSistemas(0); // estado elétrico atualizado no instante do START
    const s = sims[i], erros = [];
    if (!S.sw.bat) erros.push('bateria desligada');
    if (S.sw.bat && S.vBus < 22) erros.push(`tensão baixa (${fmt(S.vBus, 1)} V)`);
    if (!S.sw.bomba) erros.push('bomba de reforço (BOOST) desligada');
    if (!S.valv[i]) erros.push('válvula de combustível fechada');
    if (S.manete < 0.08 || S.manete > 0.45) erros.push('manete fora da posição de marcha lenta');
    if (s.modo !== 'parado' && s.modo !== 'corte') erros.push('motor já em funcionamento');
    if (erros.length) { log(`Partida ${N_MOT > 1 ? 'do motor ' + (i + 1) + ' ' : ''}negada: ${erros.join('; ')}.`, 'al'); return; }
    s.partida(S.pane === 'bateria' ? 'arranque' : 'nenhuma'); s.perfil = perfis[i]; s.depoisPartida = 'voo'; S.startando = i;
    log(`START ${N_MOT > 1 ? i + 1 : ''}: starter engatado – acompanhe Ng e ${P.temp}.`);
  }

  return { S, sims, PANES, NOMES_SW, ALARMES, leituras, passo: passoSistemas, alternar, partida, combustivelUsado: () => combUsado, P, N_MOT, PAS };
}
