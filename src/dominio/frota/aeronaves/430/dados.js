/* HeliSense 3D – Bell 430 (PRÉVIA).
   Motor: EASA TCDS IM.E.109 Issue 04 – 2× Rolls-Royce 250-C40B. Tarefas: ilustrativas.
   Os procedimentos oficiais do 430-MM (lista de capítulos com link para o portal Bell) aparecem pelo dados locais
   (dados/<modelo>/ – somente na rede local, material proprietário). */
HELI_MONO({
  id: '430', mm: '430-MM', motorNome: '2× Rolls-Royce 250-C40B', fabMotor: 'Rolls-Royce', motorMan: 'manual de manutenção do motor Rolls-Royce 250 Série IV',
  tempNome: 'MGT', pasRp: 4, insp100: '100h',
  kwMotor: 'allison|rolls|rolls royce|m250|250 c|c40b|mgt|fcu|governador|ecu|hmu|reserva manual',
  limites: { tempCru: 697, tempMcp: 727, tempTo: 779, ngCru: 97, ngMcp: 105, ngTo: 106.5, oleoP: 120, oleoPal: 90, oleoPmin: 50, oleoTmax: 107 },
  textoTemp: 'MGT (EASA TCDS IM.E.109): decolagem 779 °C (5 min); contínuo 727 °C; transitório 798–906 °C (12 s); partida 843–927 °C (10 s); OEI 30 s 871 °C, 2 min 827 °C, 30 min 798 °C, contínuo 779 °C.',
  nomes: {
    motor: { n: 'Motores – 2× Rolls-Royce 250-C40B', o: 'Dois motores Série IV lado a lado sobre o teto, com controle eletrônico de 1 canal e reserva hidromecânica manual; potências OEI.' },
    cubo_rp: { n: 'Cubo do rotor principal (4 pás, sem rolamentos)', o: 'Cubo de 4 pás macio no plano: yoke composto, amortecedores elastoméricos e grips.' },
    painel: { n: 'Painel de instrumentos (EFIS bimotor)', o: 'Displays integrados (voo e motores), painel de alarmes e controles dos motores.' },
    escapamento: { n: 'Escapamentos (1 por motor)', o: 'Um duto de escape por motor, saindo para cima/atrás.' }
  },
  kwExtra: [['fcu|governador|controle de combustível', ['motor']], ['oei|um motor inoperante|caixa de combinação', ['motor', 'transmissao']]],
  exemplos: [
    'Verificação de potência do motor',
    'Inspeção dos detectores de limalha do motor e da transmissão',
    'Inspeção das pás do rotor principal',
    'Inspeção do eixo do rotor de cauda e dos hangers',
    'Inspeção dos comandos de voo e dos servos hidráulicos',
    'Lavagem do compressor do motor'
  ],
  programa: (G) => {
    const extra = (titulo, tarefas) => [{ s: 'Itens típicos (ilustrativos)', c: [], t: tarefas }, { s: 'Tarefas oficiais – 430-MM Cap. 5', c: [], t: [['Lista oficial da inspeção de ' + titulo + ': abrir o capítulo 5 do 430-MM na aba Procedimentos (dados locais com link para o portal Bell).', 'N/A', '—', []]] }];
    return [
      { id: '100h', h: 100, nome: '100 h / 12 meses (periódica)', nota: 'O que ocorrer primeiro. Conteúdo ilustrativo – conferir no 430-MM.', g: [G.rp, G.trans, G.mot, G.rc, G.cmd, G.sis, G.est] },
      { id: '300h', h: 300, nome: '300 horas', nota: 'Itens complementares (ilustrativos).', g: extra('300 h', [
        ['Inspeção detalhada dos comandos de voo: tubos, bellcranks, rolamentos e folgas.', 'Piso / deck', '200–600', ['comandos', 'comandos_rc']],
        ['Inspeção e medição das escovas do starter-generator.', 'Capô do motor', '700', ['gerador']]]) },
      { id: '600h', h: 600, nome: '600 horas', nota: 'Itens complementares (ilustrativos).', g: extra('600 h', [
        ['Inspeção detalhada do mastro, porca do mastro e swashplate.', 'Carenagem da transmissão', '600', ['mastro', 'swash']],
        ['Inspeção detalhada dos acoplamentos do eixo de cauda e dos hangers.', 'Tampas do eixo', '500', ['eixo_rc']]]) }
    ];
  },
  anacModelo: { g: 'Bell 430 – particularidades do modelo', i: [
    { ref: 'Motor 250-C40B (EASA TCDS IM.E.109)', t: 'Série IV: compressor centrífugo, turbina HP de 2 estágios e livre de 2 estágios. Decolagem 533 kW, contínuo 457 kW por motor; 127,0 kg; controle eletrônico de 1 canal com reserva manual; limites OEI.', c: ['motor'] },
    { ref: 'Limites de MGT', t: 'decolagem 779 °C (5 min); contínuo 727 °C; transitório 798–906 °C (12 s); partida 843–927 °C (10 s); OEI 30 s 871 °C, 2 min 827 °C, 30 min 798 °C, contínuo 779 °C.', c: ['motor'] }] },
  info: { fonte: 'Prévia – EASA TCDS IM.E.109 (motor) e fontes públicas; procedimentos pelo dados locais do portal Bell' }
});
