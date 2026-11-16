/* Manutenção Interativa – motor do Bell 206B: Rolls-Royce (Allison) 250-C20J (Série II).
   Arquitetura (NZ CAA TAR 11/21B/22): compressor de 6 estágios axiais + 1 centrífugo, câmara de combustão única de fluxo
   reverso, turbina do gerador de gás de 2 estágios e turbina livre de 2 estágios com caixa de redução dupla; 2 escapes.
   Limites de TOT e óleo: fontes secundárias (confirmar no RFM/manual do motor). Controle hidromecânico (sem FADEC). */
(function () {
  const anel = (x, r) => [0.785, 2.356, 3.927, 5.498].map((a) => [[x, r * Math.cos(a), r * Math.sin(a)], [0, Math.cos(a), Math.sin(a)]]);
  const tc = anel(-0.285, 0.172);
  MONTAR_MOTOR({
    id: '250-c20j', nome: 'Rolls-Royce 250-C20J', fabricante: 'Rolls-Royce (Allison)', helicoptero: 'Bell 206B JetRanger', qtd: 1,
    arquitetura: 'm250', opcoes: { axial: 6, tubos: 2, escapes: 2, fadec: false }, escala: 1,
    pecas: ['entrada', 'compressor_axial', 'rotor_axial', 'compressor', 'impulsor', 'tubos_descarga', 'caixa_acessorios', 'eixo_saida', 'turbina', 'turbina_gp', 'turbina_livre',
      'coletor_escape', 'combustao', 'camisa', 'bico_injetor', 'ignitor', 'termopares', 'gerador', 'controle_comb', 'oleo', 'sangria', 'suportes'],
    nomes: {
      controle_comb: { n: 'Controle de combustível (FCU) e governador da turbina livre', fn: 'Controle hidromecânico: bomba, FCU do gerador de gás e governador da turbina livre (sem FADEC – o piloto controla a partida).' },
      coletor_escape: { n: 'Coletor de escape e 2 dutos verticais' },
      tubos_descarga: { n: 'Tubos de descarga do compressor (2, esquerdo e direito)' }
    },
    modulos: 'compressor, câmara de combustão, turbina e caixa de acessórios',
    resumo: [
      ['Tipo', 'Turboeixo de turbina livre, fluxo reverso, construção modular'], ['Compressor', '6 estágios axiais + 1 centrífugo'],
      ['Combustão', 'Câmara única (single can) na traseira, 1 bico injetor'], ['Turbinas', 'Gerador de gás: 2 estágios · Turbina livre: 2 estágios'],
      ['Controle', 'Hidromecânico (FCU + governador da turbina livre) – sem FADEC'], ['Potência', '~420 shp na decolagem (313 kW)'],
      ['Indicação de temperatura', 'TOT (Turbine Outlet Temperature) – 4 termopares entre as turbinas'], ['Escape', '2 dutos verticais']
    ],
    fluxo: 'O ar entra pela frente, passa pelos 6 estágios axiais e pelo centrífugo, sai da voluta pelos dois tubos laterais até a câmara de combustão na traseira; os gases voltam para a frente pela turbina do gerador de gás (que aciona o compressor) e pela turbina livre (que aciona o eixo de saída pela caixa de engrenagens) e saem pelos dois escapes verticais no meio do motor.',
    fontes: [['NZ CAA – Type Acceptance Report 11/21B/22 (Rolls-Royce 250 Séries I e II)', 'https://www.aviation.govt.nz/assets/aircraft/type-acceptance-reports/Rolls_Royce_250.pdf'],
      ['Limites de TOT do 206B-3 (fontes secundárias, confirmar no RFM)', 'https://copters.com/mech/B206_panel.html']],
    sim: { temp: 'TOT', tempIdle: 450, tempMcp: 738, tempTo: 810, tempTrans: 843, tempTransDur: 6, tempPartida: 810, tempPartidaDur: 10, tempPartidaMax: 927, picoPartida: 745,
      ngIdle: 63, ngIgn: 15, ngCorte: 58, ngMcp: 102, ngTrans: 106, npIdle: 62, npVoo: 100, npMax: 105, tqTo: 100,
      oleoPidle: 60, oleoPvoo: 122, oleoPmin: 50, oleoTmax: 107, ffIdle: 30, ffTo: 125, razaoP: 7.2, fadec: false,
      notas: 'TOT: contínuo 738 °C; decolagem 810 °C (5 min); transitório 843 °C (6 s); partida 810–927 °C por até 10 s e 927 °C por no máximo 1 s. Sem FADEC: numa partida quente é o operador que precisa abortar.' },
    tipoTq: 'Transdutor de pressão do torquímetro hidráulico', instTq: 'Na tomada do torquímetro hidráulico da caixa de acessórios (a pressão de óleo do torquímetro é proporcional ao torque). Sangrar a linha e apertar com o torque do manual.',
    pos: {
      tc_1: tc[0], tc_2: tc[1], tc_3: tc[2], tc_4: tc[3],
      ng: [[-0.05, -0.1, -0.172], [0, 0, -1]], np: [[-0.15, -0.1, -0.172], [0, 0, -1]], tq: [[-0.17, 0.05, 0.172], [0, 0, 1]],
      oleoP: [[-0.12, -0.02, 0.255], [0, 0, 1]], oleoT: [[-0.04, -0.24, 0.12], [0, -1, 0]], chip: [[-0.07, -0.29, 0.05], [0, -1, 0]],
      combP: [[-0.13, -0.305, -0.07], [0, -1, 0]], ff: [[-0.3, -0.225, -0.17], [0, -0.3, -1]], vibC: [[0.41, 0.137, 0], [0, 1, 0]], vibT: [[-0.33, 0, 0.147], [0, 0, 1]],
      p3: [[0.05, -0.04, 0.245], [0, 0, 1]], t1: [[0.448, 0.1, 0.06], [1, 0.3, 0.2]], ign: [[-0.42, -0.13, 0.212], [0, 0, 1]], corrente: [[0.05, -0.1, 0.225], [0, 0.4, 1]],
      filtroComb: [[-0.06, -0.21, -0.178], [0, 0, -1]]
    },
    parteTq: 'caixa_acessorios', parteVibT: 'turbina',
    sensoresExtra: [{ id: 'sangria', n: 'Posição da válvula de sangria', tipo: 'Microinterruptor de posição', var: 'ng', un: '% Ng', lim: 'info', faixa: [0, 110], tol: 1, parte: 'sangria', orig: 'Monitoramento – adicional',
      pos: [0.22, 0.142, 0.05], dir: [0, 1, 0], inst: 'No corpo da válvula de sangria, acionado pelo pistão; indica aberta (baixa Ng) / fechada.', teste: 'Girar o motor e conferir o fechamento da válvula na faixa de Ng do manual.' }],
    tarefasExtra: [{ id: 'sangria', n: 'Teste da válvula de sangria (anti-surge)', quando: 'Partidas com surge ou estol / conforme o manual', partes: ['sangria', 'compressor_axial'], corte: false, explodir: 0.2, passos: [
      'Verificar o movimento livre do pistão e a linha de sinal de pressão.', 'Em marcha lenta a válvula deve estar aberta; fechar na faixa de Ng especificada ao acelerar.', 'Válvula presa aberta: perda de potência; presa fechada: risco de surge.'] }]
  });
})();
