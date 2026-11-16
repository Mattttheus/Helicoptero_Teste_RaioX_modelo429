/* Manutenção Interativa – motor do Bell 407 / 407GXi: Rolls-Royce M250-C47B (407) / M250-C47E/4 (407GXi).
   EASA TCDS IM.E.109 Issue 04 (12/10/2017): compressor centrífugo de 1 estágio, combustor com 1 bico, turbina HP axial de
   2 estágios e turbina livre de 2 estágios; C47B com controle eletrônico de 1 canal e reserva hidromecânica manual; C47E/4
   com FADEC de 2 canais. Comprimento 1,10 m · largura 0,56 m · altura 0,64 m · 126,3 kg (C47E/4: 131,5 kg).
   MGT: decolagem 779 °C (5 min), contínuo 727 °C, transitório 779–906 °C (12 s), pico de 927 °C por 1 s na partida.
   100% Ng = 51 000 rpm · 100% eixo de saída = 6317 rpm. */
(function () {
  const anel = (x, r) => [0.785, 2.356, 3.927, 5.498].map((a) => [[x, r * Math.cos(a), r * Math.sin(a)], [0, Math.cos(a), Math.sin(a)]]);
  const tc = anel(-0.285, 0.172);
  MONTAR_MOTOR({
    id: 'm250-c47', nome: 'Rolls-Royce M250-C47B / C47E/4', fabricante: 'Rolls-Royce', helicoptero: 'Bell 407 / 407GXi', qtd: 1,
    arquitetura: 'm250', opcoes: { axial: 0, tubos: 1, escapes: 1, fadec: true }, escala: 1.1,
    pecas: ['entrada', 'compressor', 'impulsor', 'tubos_descarga', 'caixa_acessorios', 'eixo_saida', 'turbina', 'turbina_gp', 'turbina_livre',
      'coletor_escape', 'combustao', 'camisa', 'bico_injetor', 'ignitor', 'termopares', 'gerador', 'controle_comb', 'oleo', 'suportes', 'ecu'],
    nomes: {
      controle_comb: { n: 'Unidade hidromecânica (HMU) e bomba de combustível', fn: 'Dosagem comandada pela ECU; no C47B tem reserva hidromecânica manual.' },
      ecu: { n: 'ECU – FADEC (C47B: 1 canal + reserva manual · C47E/4: 2 canais)' },
      tubos_descarga: { n: 'Tubo de descarga do compressor (único)' }, coletor_escape: { n: 'Coletor de escape (saída única)' },
      termopares: { n: 'Chicote de termopares (MGT)' }
    },
    modulos: 'compressor, gerador de gás, turbina livre e caixa de acessórios',
    resumo: [
      ['Tipo', 'Turboeixo de turbina livre, fluxo reverso, construção modular'], ['Compressor', 'Centrífugo de 1 estágio'],
      ['Combustão', 'Câmara única na traseira, 1 bico injetor'], ['Turbinas', 'HP axial: 2 estágios · Turbina livre: 2 estágios'],
      ['Controle', 'C47B: controle eletrônico de 1 canal + reserva hidromecânica manual · C47E/4: FADEC de 2 canais'],
      ['Potência (TCDS)', 'Decolagem 485 kW (650 shp, 5 min) · contínuo 447 kW (600 shp)'], ['Dimensões', '1,10 × 0,56 × 0,64 m'], ['Peso seco', '126,3 kg (C47E/4: 131,5 kg)'],
      ['Rotações 100%', 'Ng 51 000 rpm · eixo de saída 6317 rpm'], ['Indicação de temperatura', 'MGT (Measured Gas Temperature)']
    ],
    fluxo: 'O ar entra pela frente e é comprimido pelo estágio centrífugo; a voluta manda o ar pelo tubo de descarga até a câmara de combustão na traseira; os gases voltam para a frente pela turbina HP (aciona o compressor) e pela turbina livre (aciona o eixo de saída pela caixa de acessórios) e saem pelo coletor de escape para cima.',
    fontes: [['EASA TCDS IM.E.109 Issue 04 – Rolls-Royce 250-C28 series (inclui 250-C47B e 250-C47E/4)', 'https://www.easa.europa.eu/et/downloads/20485/en']],
    sim: { temp: 'MGT', tempIdle: 480, tempMcp: 727, tempTo: 779, tempTrans: 906, tempTransDur: 12, tempPartida: 779, tempPartidaDur: 12, tempPartidaMax: 927, picoPartida: 740,
      ngIdle: 64, ngIgn: 12, ngCorte: 52, ngMcp: 102, ngTrans: 106.5, npIdle: 64, npVoo: 100, npMax: 105, tqTo: 100,
      oleoPidle: 60, oleoPvoo: 120, oleoPmin: 50, oleoTmax: 107, ffIdle: 35, ffTo: 170, razaoP: 9.2, fadec: true,
      notas: 'MGT (TCDS IM.E.109): decolagem 779 °C (5 min); contínuo 727 °C; transitório 779–906 °C (12 s); 927 °C por no máximo 1 s na partida. Ng máx. sustentado 105% e transitório 106,5% (10 s).' },
    tipoNg: 'Pickup magnético (sinal para a ECU)', tipoTq: 'Sensor de torque (torquímetro na caixa)',
    pos: {
      tc_1: tc[0], tc_2: tc[1], tc_3: tc[2], tc_4: tc[3],
      ng: [[-0.05, -0.1, -0.172], [0, 0, -1]], np: [[-0.15, -0.1, -0.172], [0, 0, -1]], tq: [[-0.17, 0.05, 0.172], [0, 0, 1]],
      oleoP: [[-0.12, -0.02, 0.255], [0, 0, 1]], oleoT: [[-0.04, -0.24, 0.12], [0, -1, 0]], chip: [[-0.07, -0.29, 0.05], [0, -1, 0]],
      combP: [[-0.13, -0.305, -0.07], [0, -1, 0]], ff: [[-0.3, -0.225, -0.17], [0, -0.3, -1]], vibC: [[0.41, 0.162, 0], [0, 1, 0]], vibT: [[-0.33, 0, 0.147], [0, 0, 1]],
      p3: [[0.1, -0.04, 0.24], [0, 0, 1]], t1: [[0.448, 0.12, 0.06], [1, 0.3, 0.2]], ign: [[-0.42, -0.13, 0.212], [0, 0, 1]], corrente: [[0.05, -0.1, 0.225], [0, 0.4, 1]],
      filtroComb: [[-0.06, -0.21, -0.178], [0, 0, -1]]
    },
    tarefasExtra: [{ id: 'fadec', n: 'Teste do FADEC e da reserva manual', quando: 'Inspeção periódica / após falha de controle', partes: ['ecu', 'controle_comb'], corte: false, explodir: 0.2, passos: [
      'Ler as falhas e excedências registradas na ECU (e no G1000H NXi do 407GXi).', 'C47B: testar a transição para o modo manual (reserva hidromecânica) conforme o RFM/manual.', 'C47E/4: verificar os dois canais e a transferência entre eles.',
      'Conferir os sensores de Ng, Np, MGT e torque usados pela ECU (mapa de sensores).'] }]
  });
})();
