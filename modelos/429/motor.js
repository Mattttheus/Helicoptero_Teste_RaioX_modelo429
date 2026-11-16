/* Manutenção Interativa – motor do Bell 429 (2 instalados): Pratt & Whitney Canada PW207D1.
   EASA TCDS IM.E.017 Issue 08 (08/08/2022): compressor centrífugo de 1 estágio, câmara anular de fluxo reverso, turbina HP de
   1 estágio e turbina livre de 1 estágio; FADEC de 1 canal com reserva manual. Comprimento 0,93 m · largura 0,54 m · altura 0,62 m ·
   110,9 kg. Decolagem 418 kW (561 shp, 5 min) e contínuo 418 kW; OEI 2½ min 509 kW (682 shp).
   MGT: decolagem 900 °C, contínuo 850 °C, partida 875 °C, transitório 950 °C (20 s). Torque: decolagem 737 N·m, contínuo 652 N·m,
   transitório 983 N·m (20 s). 100% Ng = 58 000 rpm · 100% turbina livre = 39 807 rpm. */
(function () {
  const anel = (x, r) => [0.785, 2.356, 3.927, 5.498].map((a) => [[x, r * Math.cos(a), r * Math.sin(a)], [0, Math.cos(a), Math.sin(a)]]);
  const tc = anel(-0.155, 0.3);
  MONTAR_MOTOR({
    id: 'pw207d1', nome: 'Pratt & Whitney Canada PW207D1', fabricante: 'Pratt & Whitney Canada', helicoptero: 'Bell 429 GlobalRanger', qtd: 2,
    arquitetura: 'pw200', opcoes: {}, escala: 1,
    pecas: ['caixa_reducao', 'eixo_saida', 'entrada', 'compressor', 'impulsor', 'combustao', 'camisa', 'turbina_gp', 'turbina_livre', 'escape', 'ignitor', 'termopares', 'gerador', 'controle_comb', 'oleo', 'ecu', 'suportes'],
    nomes: {
      entrada: { n: 'Entrada de ar radial (com tela)', fn: 'Entrada radial entre a caixa de redução e o compressor.' },
      combustao: { n: 'Carcaça do gerador de gás / câmara anular', fn: 'Câmara anular de fluxo reverso com bicos injetores ao redor.' },
      controle_comb: { n: 'Unidade de controle de combustível (FMU)' }, ecu: { n: 'EEC – FADEC (1 canal + reserva manual)' }, termopares: { n: 'Chicote de termopares (MGT)' },
      turbina_gp: { n: 'Turbina do compressor (CT, 1 estágio)' }, turbina_livre: { n: 'Turbina livre (PT, 1 estágio) e eixo passante' }
    },
    modulos: 'caixa de redução, gerador de gás e turbina livre',
    resumo: [
      ['Tipo', 'Turboeixo de turbina livre (2 instalados no Bell 429)'], ['Compressor', 'Centrífugo de 1 estágio'], ['Combustão', 'Câmara anular de fluxo reverso'],
      ['Turbinas', 'Turbina do compressor: 1 estágio · Turbina livre: 1 estágio'], ['Controle', 'FADEC de 1 canal com reserva manual'],
      ['Potência (TCDS)', 'Decolagem 418 kW (561 shp) · OEI 2½ min 509 kW (682 shp)'], ['Dimensões', '0,93 × 0,54 × 0,62 m'], ['Peso seco', '110,9 kg'],
      ['Rotações 100%', 'Ng 58 000 rpm · turbina livre 39 807 rpm · eixo de saída ~6120 rpm'], ['Indicação de temperatura', 'MGT']
    ],
    fluxo: 'A caixa de redução fica na frente. O ar entra pela entrada radial atrás dela, passa pelo compressor centrífugo e vai para a câmara anular de fluxo reverso; os gases acionam a turbina do compressor e a turbina livre, cujo eixo passa por dentro do motor até a caixa de redução, e saem pelo duto de escape traseiro.',
    fontes: [['EASA TCDS IM.E.017 Issue 08 – P&WC PW206 & PW207 series', 'https://www.easa.europa.eu/fr/downloads/7769/en']],
    sim: { temp: 'MGT', tempIdle: 520, tempMcp: 850, tempTo: 900, tempTrans: 950, tempTransDur: 20, tempPartida: 875, tempPartidaDur: 2, tempPartidaMax: 950, picoPartida: 760,
      ngIdle: 64, ngIgn: 12, ngCorte: 50, ngMcp: 101, ngTrans: 104, npIdle: 66, npVoo: 100, npMax: 106, tqTo: 113,
      oleoPidle: 55, oleoPvoo: 85, oleoPmin: 40, oleoTmax: 129, ffIdle: 40, ffTo: 155, razaoP: 8.1, fadec: true,
      notas: 'MGT (TCDS IM.E.017): decolagem 900 °C (5 min); contínuo 850 °C; partida 875 °C; transitório 950 °C (20 s); OEI 30 s 990 °C. Torque de decolagem = 113% do contínuo (737/652 N·m).' },
    tipoTq: 'Sensor de torque (torquímetro na caixa de redução)', parteNg: 'caixa_reducao', parteNp: 'caixa_reducao', parteTq: 'caixa_reducao', parteVibC: 'caixa_reducao', parteVibT: 'escape', parteP3: 'combustao',
    pos: {
      tc_1: tc[0], tc_2: tc[1], tc_3: tc[2], tc_4: tc[3],
      ng: [[0.26, -0.18, -0.12], [0, -0.5, -0.86]], np: [[0.33, 0, 0.222], [0, 0, 1]], tq: [[0.38, 0.2, 0.122], [0, 0, 1]],
      oleoP: [[0.22, -0.24, 0.177], [0, 0, 1]], oleoT: [[0.36, -0.215, -0.06], [0, -1, 0]], chip: [[0.33, -0.255, 0], [0, -1, 0]],
      combP: [[0.2, -0.292, -0.09], [0, -1, 0]], ff: [[0.05, -0.2, -0.245], [0, 0, -1]], vibC: [[0.34, 0.262, 0], [0, 1, 0]], vibT: [[-0.3, 0, 0.172], [0, 0, 1]],
      p3: [[-0.02, -0.14, -0.24], [0, -0.5, -0.86]], t1: [[0.19, 0.252, 0], [0, 1, 0]], ign: [[0.05, -0.3, 0.207], [0, 0, 1]], corrente: [[0.16, 0.26, 0.268], [0, 0, 1]],
      filtroComb: [[0.26, -0.24, -0.142], [0, 0, -1]]
    },
    tarefasExtra: [{ id: 'oei', n: 'Excedência OEI (bimotor)', quando: 'Após uso das potências de um motor inoperante', partes: ['turbina_gp', 'turbina_livre', 'camisa', 'caixa_reducao'], corte: true, explodir: 0, passos: [
      'Baixar o histórico de excedências OEI nos displays do Bell 429.', 'Executar as ações mandatórias da seção de limites do manual do motor P&WC conforme o tempo e a faixa usados.',
      'Uso do limit override: além do motor, seguir o BHT-429-MPI para a transmissão (aba Eventos do manual).'] }]
  });
})();
