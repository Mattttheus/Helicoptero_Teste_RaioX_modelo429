/* Manutenção Interativa – Bell 407 / 407GXi (PRÉVIA até incorporar o BHT-407-MM / MPI da pasta manuais/407).
   Motor Rolls-Royce 250-C47B (407) / 250-C47E/4 (407GXi): EASA TCDS IM.E.109 Issue 04 (12/10/2017) – compressor centrífugo
   de 1 estágio, combustor com 1 bico injetor, turbina HP axial de 2 estágios e turbina livre de 2 estágios; C47B com controle
   eletrônico de 1 canal e reserva hidromecânica manual, C47E/4 com FADEC de 2 canais. Demais tarefas: ilustrativas. */
HELI_MONO({
  id: '407', mm: 'BHT-407-MM / MPI', motorNome: 'Rolls-Royce M250-C47B / C47E/4', fabMotor: 'Rolls-Royce', motorMan: 'manual de manutenção do motor Rolls-Royce 250-C47',
  tempNome: 'MGT', pasRp: 4, insp100: '100h',
  kwMotor: 'rolls|rolls royce|m250|250 c47|c47b|c47e|fadec|ecu|hmu|mgt',
  limites: { tempCru: 690, tempMcp: 727, tempTo: 779, ngCru: 97, ngMcp: 105, ngTo: 106.5, oleoP: 120, oleoPal: 90, oleoPmin: 50, oleoTmax: 107 },
  textoTemp: 'MGT (EASA TCDS IM.E.109): decolagem 779 °C (5 min); máximo contínuo 727 °C; transitório 779–906 °C (12 s); pico momentâneo de 927 °C por no máximo 1 s durante a partida.',
  nomes: {
    cubo_rp: { n: 'Cubo do rotor principal (4 pás, macio no plano)', o: 'Cubo de 4 pás com flexbeam/yoke composto, rolamentos elastoméricos e amortecedores.' },
    pas_rp: { n: 'Pás do rotor principal (4, compostas)', o: 'Quatro pás compostas: revestimento, tira de abrasão, ponteira e pesos de balanceamento.' },
    motor: { n: 'Motor – Rolls-Royce M250-C47B / C47E/4', o: 'Fluxo reverso: compressor centrífugo de 1 estágio à frente, tubo de descarga até a câmara de combustão traseira, turbina HP de 2 estágios e turbina livre de 2 estágios; escape único para cima. C47B: controle eletrônico de 1 canal com reserva manual; C47E/4 (407GXi): FADEC de 2 canais.' },
    escapamento: { n: 'Escapamento (coletor único)', o: 'Coletor de escape único saindo para cima/atrás do capô do motor.' },
    painel: { n: 'Painel de instrumentos (407GXi: Garmin G1000H NXi)', o: 'Displays/instrumentos do motor, alarmes e registro de excedências (407GXi).' },
    porta_pax_L: { n: 'Portas de passageiros – esquerda (dupla)', o: 'Porta dupla da cabine no lado esquerdo: dobradiças, travas e janelas.' }
  },
  kwExtra: [['hmu|unidade hidromecânica|ecu|reserva manual|manual backup', ['motor']]],
  exemplos: [
    'Teste do sistema FADEC e da reserva manual do motor',
    'Inspeção dos amortecedores e do flexbeam do rotor principal',
    'Trocar o filtro de óleo do motor e inspecionar os detectores de limalha',
    'Inspeção das portas duplas de passageiros',
    'Inspeção do eixo do rotor de cauda e da caixa de 90 graus',
    'Lavagem do compressor e verificação de potência'
  ],
  programa: (G) => {
    const extra = (titulo, tarefas) => [{ s: 'Itens típicos (ilustrativos)', c: [], t: tarefas }, { s: 'Tarefas a incorporar do BHT-407-MPI', c: [], t: [['Lista oficial da inspeção de ' + titulo + ' – extrair do BHT-407-MPI (pasta manuais/407).', 'N/A', '—', []]] }];
    return [
      { id: '100h', h: 100, nome: '100 h / 12 meses (periódica)', nota: 'Inspeção periódica: o que ocorrer primeiro. Conteúdo ilustrativo até incorporar o BHT-407-MPI.', g: [G.rp, G.trans, G.mot, G.rc, G.cmd, G.sis, G.est] },
      { id: '300h', h: 300, nome: '300 horas', nota: 'Itens complementares (ilustrativos).', g: extra('300 h', [
        ['Inspeção dos amortecedores e rolamentos elastoméricos do cubo de 4 pás.', 'N/A', '600', ['cubo_rp']],
        ['Teste funcional do controle eletrônico do motor (FADEC) e da reserva manual (C47B).', 'N/A', '700', ['motor', 'painel']],
        ['Inspeção e medição das escovas do starter-generator.', 'Capô do motor', '700', ['gerador']]]) },
      { id: '600h', h: 600, nome: '600 horas', nota: 'Itens complementares (ilustrativos).', g: extra('600 h', [
        ['Inspeção detalhada do mastro, porca do mastro e swashplate.', 'Carenagem da transmissão', '600', ['mastro', 'swash']],
        ['Inspeção detalhada dos acoplamentos do eixo de cauda e dos hangers.', 'Tampas do eixo', '500', ['eixo_rc']]]) },
      { id: '1200h', h: 1200, nome: '1200 horas', nota: 'Itens complementares (ilustrativos).', g: extra('1200 h', [
        ['Inspeção detalhada dos isoladores do pilone e fixações ao teto.', 'Carenagem da transmissão', '600', ['suporte_trans', 'fuselagem']],
        ['Inspeção detalhada da caixa do rotor de cauda.', 'N/A', '500', ['caixa_rc']]]) }
    ];
  },
  anacModelo: { g: 'Bell 407 / 407GXi – particularidades do modelo', i: [
    { ref: 'Motor 250-C47B / C47E/4 (EASA TCDS IM.E.109)', t: 'Compressor centrífugo de 1 estágio, combustor com 1 bico, turbina HP de 2 estágios e turbina livre de 2 estágios. C47B: 485 kW (650 shp) na decolagem e 447 kW (600 shp) contínuo; 126,3 kg. C47E/4: FADEC de 2 canais, 131,5 kg.', c: ['motor'] },
    { ref: 'Limites de MGT', t: 'Decolagem 779 °C (5 min); contínuo 727 °C; transitório 779–906 °C (12 s); pico de 927 °C por no máximo 1 s na partida.', c: ['motor'] },
    { ref: 'Controle do motor', t: 'C47B: controle eletrônico de 1 canal com reserva hidromecânica manual (o piloto assume a potência em caso de falha). C47E/4 (407GXi): FADEC de 2 canais.', c: ['motor', 'painel'] }] },
  info: { fonte: 'Prévia – EASA TCDS IM.E.109 (motor) e fontes públicas' }
});
