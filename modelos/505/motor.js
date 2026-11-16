/* Manutenção Interativa – motor do Bell 505: Safran Arrius 2R.
   EASA TCDS E.031 Issue 05 (07/07/2020): entrada anular, compressor centrífugo de 1 estágio acionado por turbina de 1 estágio,
   câmara anular de fluxo reverso, turbina livre de 1 estágio com eixo passante até a caixa de redução dianteira (que inclui a caixa
   de acessórios). Controle: ECU digital de 2 canais + atuador elétrico de 2 canais + válvula dosadora, com sistema de reserva.
   Comprimento 0,934 m · altura 0,676 m · largura 0,553 m · 119,9 kg.
   T4.5: partida 800 °C (sem limite de tempo) e 870 °C (< 10 s); decolagem 865 °C; contínuo 829 °C; inadvertido 882 °C (< 20 s).
   N1: 100% = 54 117 rpm, mínimo estabilizado 63%, decolagem 101,4%, contínuo 99,9%, inadvertido 103,6% (< 20 s).
   N2: 100% = 42 014 rpm, 94–105% contínuo · saída 100% = 5610 rpm. Torque: decolagem 600 N·m, contínuo 550 N·m, 660 N·m (< 5 s).
   Óleo: máx. 110 °C; pressão máx. 1500 kPa (mínimo em função de N1). */
(function () {
  const anel = (x, r) => [0.785, 2.356, 3.927, 5.498].map((a) => [[x, r * Math.cos(a), r * Math.sin(a)], [0, Math.cos(a), Math.sin(a)]]);
  const tc = anel(-0.2, 0.31);
  MONTAR_MOTOR({
    id: 'arrius-2r', nome: 'Safran Arrius 2R', fabricante: 'Safran Helicopter Engines', helicoptero: 'Bell 505 Jet Ranger X', qtd: 1,
    arquitetura: 'arrius', opcoes: {}, escala: 1,
    pecas: ['caixa_reducao', 'eixo_saida', 'caixa_acessorios', 'entrada', 'compressor', 'impulsor', 'combustao', 'camisa', 'turbina_gp', 'turbina_livre', 'carcaca_tl', 'escape',
      'ignitor', 'termopares', 'gerador', 'controle_comb', 'oleo', 'ecu', 'suportes'],
    nomes: {
      caixa_reducao: { n: 'Caixa de redução dianteira (com caixa de acessórios)' }, caixa_acessorios: { n: 'Caixa de acessórios (integrada à redução)', fn: 'Acionada pelo gerador de gás: bombas, unidade dosadora e starter-generator.' },
      entrada: { n: 'Entrada de ar anular', fn: 'Entrada anular entre a caixa de redução e o compressor.' },
      combustao: { n: 'Carcaça da câmara anular de fluxo reverso' }, turbina_gp: { n: 'Turbina do gerador de gás (HP, 1 estágio)' },
      turbina_livre: { n: 'Turbina livre (1 estágio) e eixo passante' }, carcaca_tl: { n: 'Módulo da turbina livre' },
      controle_comb: { n: 'Válvula dosadora + atuador elétrico de 2 canais', fn: 'Dosagem comandada pela ECU; válvula dosadora auxiliar para o sistema de reserva.' },
      ecu: { n: 'ECU digital de 2 canais (FADEC) + reserva', fn: 'Controle primário de 2 canais e sistema de reserva com válvula e atuador auxiliares (TCDS E.031).' },
      termopares: { n: 'Chicote de termopares (T4.5 / MGT)' }, gerador: { n: 'Starter-generator (fornecido pelo fabricante do helicóptero)' }
    },
    modulos: 'caixa de redução/acessórios, gerador de gás e turbina livre',
    resumo: [
      ['Tipo', 'Turboeixo de turbina livre com eixo passante até a caixa de redução dianteira'], ['Compressor', 'Centrífugo de 1 estágio'], ['Combustão', 'Câmara anular de fluxo reverso'],
      ['Turbinas', 'Gerador de gás: 1 estágio · Turbina livre: 1 estágio'], ['Controle', 'ECU digital de 2 canais + atuador de 2 canais; sistema de reserva'],
      ['Potência (TCDS)', 'Decolagem 352 kW com limites de torque/fluxo (389 kW sem) · contínuo 323 kW (355 kW)'], ['Dimensões', '0,934 × 0,553 × 0,676 m'], ['Peso seco', '119,9 kg'],
      ['Rotações 100%', 'N1 54 117 rpm · N2 42 014 rpm · saída 5610 rpm'], ['Indicação de temperatura', 'T4.5 (MGT no G1000H NXi)'], ['TBO (fabricante)', '3000 h']
    ],
    fluxo: 'A caixa de redução (com a caixa de acessórios) fica na frente. O ar entra pela entrada anular, é comprimido pelo estágio centrífugo e segue para a câmara anular de fluxo reverso; os gases acionam a turbina HP (compressor) e a turbina livre, cujo eixo passa por dentro do motor até a caixa de redução, e saem pelo escape traseiro.',
    fontes: [['EASA TCDS E.031 Issue 05 – Safran Arrius 2F / 2R', 'https://www.easa.europa.eu/lv/downloads/20230/en'],
      ['Bell 505 Maintenance Guide – Power Assurance Check (PAC)', 'https://bell-505-guide.gitbook.io/bell-505-maintenance-guide/line-maintenance/test-and-checks/power-assurance-check-pac']],
    sim: { temp: 'T4.5', tempIdle: 500, tempMcp: 829, tempTo: 865, tempTrans: 882, tempTransDur: 20, tempPartida: 800, tempPartidaDur: 10, tempPartidaMax: 870, picoPartida: 725,
      ngIdle: 67, ngIgn: 12, ngCorte: 48, ngMcp: 99.9, ngTrans: 103.6, npIdle: 68, npVoo: 100, npMax: 105, tqTo: 109,
      oleoPidle: 45, oleoPvoo: 75, oleoPmin: 25, oleoTmax: 110, ffIdle: 35, ffTo: 130, razaoP: 9.0, fadec: true,
      notas: 'T4.5 (TCDS E.031): partida 800 °C sem limite e 870 °C por menos de 10 s; decolagem 865 °C; contínuo 829 °C; inadvertido 882 °C (< 20 s). N1 de decolagem 101,4%. Torque de decolagem = 109% do contínuo (600/550 N·m).' },
    tipoTq: 'Sensor de torque (eixo da caixa de redução)', parteNg: 'caixa_acessorios', parteNp: 'caixa_reducao', parteTq: 'caixa_reducao', parteVibC: 'caixa_reducao', parteVibT: 'carcaca_tl', parteP3: 'combustao',
    pos: {
      tc_1: tc[0], tc_2: tc[1], tc_3: tc[2], tc_4: tc[3],
      ng: [[0.3, -0.26, -0.162], [0, 0, -1]], np: [[0.3, 0.2, 0.152], [0, 0, 1]], tq: [[0.4, 0.302, 0], [0, 1, 0]],
      oleoP: [[0.4, -0.34, 0.207], [0, 0, 1]], oleoT: [[0.38, -0.342, -0.1], [0, -1, 0]], chip: [[0.3, -0.395, 0.02], [0, -1, 0]],
      combP: [[0.3, -0.437, -0.12], [0, -1, 0]], ff: [[0.1, -0.25, -0.272], [0, 0, -1]], vibC: [[0.455, -0.05, 0.12], [1, 0, 0]], vibT: [[-0.29, 0, 0.214], [0, 0, 1]],
      p3: [[0.0, -0.15, -0.242], [0, -0.53, -0.85]], t1: [[0.2, 0.267, 0], [0, 1, 0]], ign: [[0.05, -0.32, 0.217], [0, 0, 1]], corrente: [[0.16, -0.24, 0.292], [0, 0, 1]],
      filtroComb: [[0.36, -0.38, -0.172], [0, 0, -1]]
    },
    pacQuando: 'A cada 25 h de voo; recomenda-se diariamente (guia de manutenção do Bell 505)',
    pacPassos: [
      'APAC no Garmin G1000H NXi (ou MPAC por gráficos), em solo, pairado ou em voo à frente.',
      'Condições solo/pairado: proa no vento (30 KIAS ou menos), carga elétrica de 35 A ou menos, torque de 30% Q ou mais, MGT 500–853 °C, Ng 83,0–101,3%; fora da faixa: “CHK LIMITS”.',
      'Margens de Ng e de MGT devem ser iguais ou maiores que zero.',
      'Margem abaixo de 15 °C de MGT ou 0,2% de Ng: limpar o filtro de barreira da entrada de ar e repetir.'],
    tarefasExtra: [{ id: 'ad2022', n: 'EASA AD 2022-0265R1 – indicação de MGT', quando: 'Conforme a DA aplicável', partes: ['termopares', 'turbina_gp', 'ecu'], corte: true, explodir: 0, passos: [
      'Verificar o cumprimento da DA: risco de subestimar a MGT e exceder o limite térmico das pás da turbina HP.', 'Conferir o chicote de termopares e a indicação com simulador (mapa de sensores).', 'Registrar o cumprimento no histórico do motor.'] }]
  });
})();
