/* HeliSense 3D – motor do Bell 430: Rolls-Royce 250-C40B (2 instalados).
   EASA TCDS IM.E.109 Issue 04 (12/10/2017): compressor centrífugo de 1 estágio, turbina HP axial de 2 estágios e turbina
   livre de 2 estágios (fluxo reverso, construção modular). Controle eletrônico de 1 canal com reserva hidromecânica manual; inclui limites OEI.
   Comprimento 1,10 m · largura 0,56 m · altura 0,65 m · peso seco 127,0 kg. MGT: decolagem 779 °C (5 min); contínuo 727 °C; transitório 798–906 °C (12 s); partida 843–927 °C (10 s); OEI 30 s 871 °C, 2 min 827 °C, 30 min 798 °C, contínuo 779 °C.
   100% Ng = 51 000 rpm (máx. sustentado 105%, transitório 106,5% por 10 s) · 100% eixo de saída = 9598 rpm.
   Pressão do óleo (TCDS): 793–896 kPa (115–130 psi) com Ng ≥ 94%; 620–896 kPa (90–130 psi) entre 79 e 94%; 344–896 kPa (50–130 psi) abaixo de 79%. Temperatura máxima do óleo: não consta no TCDS – valor de referência, confirmar no manual do motor/RFM. */
(function () {
  const anel = (x, r) => [0.785, 2.356, 3.927, 5.498].map((a) => [[x, r * Math.cos(a), r * Math.sin(a)], [0, Math.cos(a), Math.sin(a)]]);
  const tc = anel(-0.285, 0.172);
  MONTAR_MOTOR({
    id: '250-c40b', nome: 'Rolls-Royce 250-C40B', fabricante: 'Rolls-Royce (Allison)', helicoptero: 'Bell 430', qtd: 2,
    arquitetura: 'm250', opcoes: { axial: 0, tubos: 1, escapes: 1, fadec: true }, escala: 1.08,
    pecas: ['entrada', 'compressor', 'impulsor', 'tubos_descarga', 'caixa_acessorios', 'eixo_saida', 'turbina', 'turbina_gp', 'turbina_livre',
      'coletor_escape', 'combustao', 'camisa', 'bico_injetor', 'ignitor', 'termopares', 'gerador', 'controle_comb', 'oleo', 'suportes', 'ecu'],
    nomes: {
      controle_comb: { n: 'Unidade hidromecânica (HMU) e bomba de combustível', fn: 'Dosagem comandada pela ECU; reserva hidromecânica manual em caso de falha do controle eletrônico.' },
      ecu: { n: 'ECU – controle eletrônico de 1 canal (reserva hidromecânica manual)' },
      tubos_descarga: { n: 'Tubo de descarga do compressor (único)' }, coletor_escape: { n: 'Coletor de escape (saída única por motor)' },
      termopares: { n: 'Chicote de termopares (MGT)' }
    },
    modulos: 'compressor, gerador de gás, turbina livre e caixa de acessórios',
    resumo: [
      ['Tipo', 'Turboeixo de turbina livre, fluxo reverso, construção modular (Série IV)'], ['Compressor', 'Centrífugo de 1 estágio'],
      ['Combustão', 'Câmara única na traseira, 1 bico injetor'], ['Turbinas', 'HP axial: 2 estágios · Turbina livre: 2 estágios'],
      ['Controle', 'Controle eletrônico de 1 canal (FADEC) com reserva hidromecânica manual'],
      ['Potência (TCDS)', 'Decolagem 533 kW (5 min) · contínuo 457 kW · OEI conforme TCDS'], ['Dimensões', 'Comprimento 1,10 m · largura 0,56 m · altura 0,65 m'], ['Peso seco', '127,0 kg'],
      ['Rotações 100%', 'Ng 51 000 rpm · eixo de saída 9598 rpm'], ['Indicação de temperatura', 'MGT (Measured Gas Temperature)'], ['Instalação', '2 motores lado a lado sobre o teto, com caixa de combinação na transmissão']
    ],
    fluxo: 'O ar entra pela frente e é comprimido pelo estágio centrífugo; a voluta manda o ar pelos tubos de descarga até a câmara de combustão na traseira; os gases voltam para a frente pela turbina HP (aciona o compressor) e pela turbina livre (aciona o eixo de saída pela caixa de acessórios) e saem pelo escape para cima.',
    fontes: [['EASA TCDS IM.E.109 Issue 04 – Rolls-Royce 250-C28 series (inclui 250-C30P, 250-C30G/2 e 250-C40B)', 'https://www.easa.europa.eu/et/downloads/20485/en']],
    sim: { temp: 'MGT', tempIdle: 470, tempMcp: 727, tempTo: 779, tempTrans: 906, tempTransDur: 12, tempPartida: 843, tempPartidaDur: 10, tempPartidaMax: 927, picoPartida: 763,
      ngIdle: 64, ngIgn: 12, ngCorte: 52, ngMcp: 105, ngTrans: 106.5, npIdle: 64, npVoo: 100, npMax: 106.3, tqTo: 100,
      oleoPidle: 60, oleoPvoo: 120, oleoPmin: 50, oleoTmax: 107, ffIdle: 35, ffTo: 165, razaoP: 9.2, fadec: true,
      notas: 'MGT (TCDS IM.E.109): decolagem 779 °C (5 min); contínuo 727 °C; transitório 798–906 °C (12 s); partida 843–927 °C (10 s); OEI 30 s 871 °C, 2 min 827 °C, 30 min 798 °C, contínuo 779 °C. Ng máx. sustentado 105% e transitório 106,5% (10 s). Controle eletrônico de 1 canal: em falha, o piloto assume a reserva manual.' },
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
