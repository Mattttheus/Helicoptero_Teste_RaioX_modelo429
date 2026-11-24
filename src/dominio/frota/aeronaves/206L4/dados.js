/* HeliSense 3D – Bell 206L-4 LongRanger IV (PRÉVIA).
   Motor: EASA TCDS IM.E.109 Issue 04 – Rolls-Royce 250-C30P. Tarefas: ilustrativas.
   Os procedimentos oficiais do 206L4-MM (lista de capítulos com link para o portal Bell) aparecem pelo dados locais
   (dados/<modelo>/ – somente na rede local, material proprietário). */
HELI_MONO({
  id: '206L4', mm: '206L4-MM', motorNome: 'Rolls-Royce 250-C30P', fabMotor: 'Rolls-Royce', motorMan: 'manual de manutenção do motor Rolls-Royce 250 Série IV',
  tempNome: 'MGT', pasRp: 2, insp100: '100h',
  kwMotor: 'allison|rolls|rolls royce|m250|250 c|c30p|mgt|fcu|governador',
  limites: { tempCru: 686, tempMcp: 716, tempTo: 768, ngCru: 97, ngMcp: 105, ngTo: 106.5, oleoP: 120, oleoPal: 90, oleoPmin: 50, oleoTmax: 107 },
  textoTemp: 'MGT (EASA TCDS IM.E.109): decolagem 768 °C (5 min); contínuo 716 °C; transitório 768–871 °C (12 s); partida 826–927 °C (10 s).',
  nomes: {
    motor: { n: 'Motor – Rolls-Royce 250-C30P', o: 'Fluxo reverso, Série IV: compressor centrífugo de 1 estágio, turbina HP de 2 estágios e turbina livre de 2 estágios; controle hidromecânico (sem FADEC).' },
    cubo_rp: { n: 'Cubo do rotor principal (2 pás, semirrígido)', o: 'Yoke, grips, trunnion de batimento e rolamentos (underslung).' },
    painel: { n: 'Painel de instrumentos (analógico)', o: 'Instrumentos do motor (MGT, Ng, Np/Nr, torque, óleo), voo e painel de alarmes.' },
    escapamento: { n: 'Escapamentos (2 dutos verticais)', o: 'Dois dutos de escape para cima, atrás do capô do motor.' }
  },
  kwExtra: [['fcu|governador|controle de combustível', ['motor']]],
  exemplos: [
    'Verificação de potência do motor',
    'Inspeção dos detectores de limalha do motor e da transmissão',
    'Inspeção das pás do rotor principal',
    'Inspeção do eixo do rotor de cauda e dos hangers',
    'Inspeção dos comandos de voo e dos servos hidráulicos',
    'Lavagem do compressor do motor'
  ],
  programa: (G) => {
    const extra = (titulo, tarefas) => [{ s: 'Itens típicos (ilustrativos)', c: [], t: tarefas }, { s: 'Tarefas oficiais – 206L4-MM Cap. 5', c: [], t: [['Lista oficial da inspeção de ' + titulo + ': abrir o capítulo 5 do 206L4-MM na aba Procedimentos (dados locais com link para o portal Bell).', 'N/A', '—', []]] }];
    return [
      { id: '100h', h: 100, nome: '100 h / 12 meses (periódica)', nota: 'O que ocorrer primeiro. Conteúdo ilustrativo – conferir no 206L4-MM.', g: [G.rp, G.trans, G.mot, G.rc, G.cmd, G.sis, G.est] },
      { id: '300h', h: 300, nome: '300 horas', nota: 'Itens complementares (ilustrativos).', g: extra('300 h', [
        ['Inspeção detalhada dos comandos de voo: tubos, bellcranks, rolamentos e folgas.', 'Piso / deck', '200–600', ['comandos', 'comandos_rc']],
        ['Inspeção e medição das escovas do starter-generator.', 'Capô do motor', '700', ['gerador']]]) },
      { id: '600h', h: 600, nome: '600 horas', nota: 'Itens complementares (ilustrativos).', g: extra('600 h', [
        ['Inspeção detalhada do mastro, porca do mastro e swashplate.', 'Carenagem da transmissão', '600', ['mastro', 'swash']],
        ['Inspeção detalhada dos acoplamentos do eixo de cauda e dos hangers.', 'Tampas do eixo', '500', ['eixo_rc']]]) }
    ];
  },
  anacModelo: { g: 'Bell 206L-4 LongRanger IV – particularidades do modelo', i: [
    { ref: 'Motor 250-C30P (EASA TCDS IM.E.109)', t: 'Compressor centrífugo de 1 estágio, turbina HP de 2 estágios e turbina livre de 2 estágios. Decolagem 485 kW (5 min), contínuo 447 kW; 112,4 kg; controle totalmente hidromecânico.', c: ['motor'] },
    { ref: 'Limites de MGT', t: 'decolagem 768 °C (5 min); contínuo 716 °C; transitório 768–871 °C (12 s); partida 826–927 °C (10 s).', c: ['motor'] }] },
  info: { fonte: 'Prévia – EASA TCDS IM.E.109 (motor) e fontes públicas; procedimentos pelo dados locais do portal Bell' }
});
