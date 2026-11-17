/* Manutenção Interativa – motor do Bell 206L-4 LongRanger IV: Rolls-Royce 250-C30P.
   EASA TCDS IM.E.109 Issue 04 (12/10/2017): compressor centrífugo de 1 estágio, turbina HP axial de 2 estágios e turbina
   livre de 2 estágios (fluxo reverso, construção modular). Controle totalmente hidromecânico.
   Comprimento 1,10 m · largura 0,56 m · altura 0,63 m · peso seco 112,4 kg. MGT: decolagem 768 °C (5 min); contínuo 716 °C; transitório 768–871 °C (12 s); partida 826–927 °C (10 s).
   100% Ng = 51 000 rpm (máx. sustentado 105%, transitório 106,5% por 10 s) · 100% eixo de saída = 6016 rpm.
   Pressão do óleo (TCDS): 793–896 kPa (115–130 psi) com Ng ≥ 94%; 620–896 kPa (90–130 psi) entre 79 e 94%; 344–896 kPa (50–130 psi) abaixo de 79%. Temperatura máxima do óleo: não consta no TCDS – valor de referência, confirmar no manual do motor/RFM. */
(function () {
  const anel = (x, r) => [0.785, 2.356, 3.927, 5.498].map((a) => [[x, r * Math.cos(a), r * Math.sin(a)], [0, Math.cos(a), Math.sin(a)]]);
  const tc = anel(-0.285, 0.172);
  MONTAR_MOTOR({
    id: '250-c30p', nome: 'Rolls-Royce 250-C30P', fabricante: 'Rolls-Royce (Allison)', helicoptero: 'Bell 206L-4 LongRanger IV', qtd: 1,
    arquitetura: 'm250', opcoes: { axial: 0, tubos: 2, escapes: 2, fadec: false }, escala: 1.08,
    pecas: ['entrada', 'compressor', 'impulsor', 'tubos_descarga', 'caixa_acessorios', 'eixo_saida', 'turbina', 'turbina_gp', 'turbina_livre',
      'coletor_escape', 'combustao', 'camisa', 'bico_injetor', 'ignitor', 'termopares', 'gerador', 'controle_comb', 'oleo', 'suportes'],
    nomes: {
      controle_comb: { n: 'Unidade de controle de combustível (FCU) e governador da turbina livre', fn: 'Controle hidromecânico: bomba, FCU e governador (sem FADEC – o piloto controla a partida).' },
      tubos_descarga: { n: 'Tubos de descarga do compressor (2)' }, coletor_escape: { n: 'Coletor de escape e 2 dutos verticais' },
      termopares: { n: 'Chicote de termopares (MGT)' }
    },
    modulos: 'compressor, gerador de gás, turbina livre e caixa de acessórios',
    resumo: [
      ['Tipo', 'Turboeixo de turbina livre, fluxo reverso, construção modular (Série IV)'], ['Compressor', 'Centrífugo de 1 estágio'],
      ['Combustão', 'Câmara única na traseira, 1 bico injetor'], ['Turbinas', 'HP axial: 2 estágios · Turbina livre: 2 estágios'],
      ['Controle', 'Totalmente hidromecânico (sem FADEC)'],
      ['Potência (TCDS)', 'Decolagem 485 kW (5 min) · contínuo 447 kW'], ['Dimensões', 'Comprimento 1,10 m · largura 0,56 m · altura 0,63 m'], ['Peso seco', '112,4 kg'],
      ['Rotações 100%', 'Ng 51 000 rpm · eixo de saída 6016 rpm'], ['Indicação de temperatura', 'MGT (Measured Gas Temperature)']
    ],
    fluxo: 'O ar entra pela frente e é comprimido pelo estágio centrífugo; a voluta manda o ar pelos tubos de descarga até a câmara de combustão na traseira; os gases voltam para a frente pela turbina HP (aciona o compressor) e pela turbina livre (aciona o eixo de saída pela caixa de acessórios) e saem pelo escape para cima.',
    fontes: [['EASA TCDS IM.E.109 Issue 04 – Rolls-Royce 250-C28 series (inclui 250-C30P, 250-C30G/2 e 250-C40B)', 'https://www.easa.europa.eu/et/downloads/20485/en']],
    sim: { temp: 'MGT', tempIdle: 470, tempMcp: 716, tempTo: 768, tempTrans: 871, tempTransDur: 12, tempPartida: 826, tempPartidaDur: 10, tempPartidaMax: 927, picoPartida: 746,
      ngIdle: 64, ngIgn: 12, ngCorte: 52, ngMcp: 105, ngTrans: 106.5, npIdle: 64, npVoo: 100, npMax: 107.1, tqTo: 100,
      oleoPidle: 60, oleoPvoo: 120, oleoPmin: 50, oleoTmax: 107, ffIdle: 35, ffTo: 165, razaoP: 9.2, fadec: false,
      notas: 'MGT (TCDS IM.E.109): decolagem 768 °C (5 min); contínuo 716 °C; transitório 768–871 °C (12 s); partida 826–927 °C (10 s). Ng máx. sustentado 105% e transitório 106,5% (10 s). Sem FADEC: numa partida quente é o operador que precisa abortar.' },
    tipoNg: 'Pickup magnético do tacômetro de Ng', tipoTq: 'Transdutor do torquímetro (pressão de óleo na caixa de acessórios)',
    pos: {
      tc_1: tc[0], tc_2: tc[1], tc_3: tc[2], tc_4: tc[3],
      ng: [[-0.05, -0.1, -0.172], [0, 0, -1]], np: [[-0.15, -0.1, -0.172], [0, 0, -1]], tq: [[-0.17, 0.05, 0.172], [0, 0, 1]],
      oleoP: [[-0.12, -0.02, 0.255], [0, 0, 1]], oleoT: [[-0.04, -0.24, 0.12], [0, -1, 0]], chip: [[-0.07, -0.29, 0.05], [0, -1, 0]],
      combP: [[-0.13, -0.305, -0.07], [0, -1, 0]], ff: [[-0.3, -0.225, -0.17], [0, -0.3, -1]], vibC: [[0.41, 0.162, 0], [0, 1, 0]], vibT: [[-0.33, 0, 0.147], [0, 0, 1]],
      p3: [[0.1, -0.04, 0.24], [0, 0, 1]], t1: [[0.448, 0.12, 0.06], [1, 0.3, 0.2]], ign: [[-0.42, -0.13, 0.212], [0, 0, 1]], corrente: [[0.05, -0.1, 0.225], [0, 0.4, 1]],
      filtroComb: [[-0.06, -0.21, -0.178], [0, 0, -1]]
    },
    tarefasExtra: [{ id: 'potencia', n: 'Verificação de potência do motor (power assurance)', quando: 'Conforme o RFM / MM do helicóptero', partes: ['compressor', 'turbina_gp', 'termopares'], corte: false, explodir: 0, passos: [
      'Estabilizar nas condições do gráfico do RFM e registrar torque, MGT, Ng, OAT e altitude-pressão.', 'Comparar a MGT/Ng com o gráfico de verificação de potência: margem negativa indica motor deteriorado.',
      'Com margem baixa: lavar o compressor, inspecionar a entrada de ar e repetir; persistindo, investigar pelo manual do motor.'] }]
  });
})();
