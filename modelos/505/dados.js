/* Manutenção Interativa – Bell 505 Jet Ranger X (PRÉVIA até incorporar o BHT-505-MM / MPI da pasta manuais/505).
   Confirmado em fontes públicas:
   - Motor Safran Arrius 2R: EASA TCDS E.031 Issue 05 (07/07/2020) – limites usados nos sensores e no motor 3D.
   - Intervalos 25 h (PAC), 50 h/1 ano, 100 h, 100 h/6 meses, 100 h/1 ano, 100 h/18 meses, 150 h, 200 h e 300 h e as
     tarefas marcadas como "confirmadas": Bell 505 Maintenance Guide (bell-505-guide.gitbook.io).
   O restante está marcado como ilustrativo. */
HELI_MONO({
  id: '505', mm: 'BHT-505-MM / MPI', motorNome: 'Safran Arrius 2R', fabMotor: 'Safran', motorMan: 'manual do motor Safran Arrius 2R',
  tempNome: 'MGT (T4.5)', pasRp: 2, tbo: '3000 h (fabricante)', insp100: '100h',
  kwMotor: 'arrius|safran|fadec|ecu|mgt|t45|t4 5',
  limites: { tempCru: 760, tempMcp: 829, tempTo: 865, ngCru: 96, ngMcp: 99.9, ngTo: 101.4, oleoP: 75, oleoPal: 35, oleoPmin: 25, oleoTmax: 110 },
  textoTemp: 'T4.5/MGT (EASA TCDS E.031): partida 800 °C sem limite de tempo e 870 °C por menos de 10 s; decolagem 865 °C; máximo contínuo 829 °C; sobretemperatura inadvertida 882 °C (< 20 s). Registrar valor e duração e seguir o manual do motor Safran.',
  nomes: {
    painel: { n: 'Painel de instrumentos – Garmin G1000H NXi', o: 'Displays integrados, registro de excedências e APAC (verificação automática de potência).' },
    comandos: { n: 'Comandos de voo (pillow block, boosted bellcrank)', o: 'Cíclico, coletivo e pedais; pillow block e boosted bellcrank sob o piso e no deck.' },
    rotor_cauda: { n: 'Rotor de cauda e tail damper', o: 'Pás, cubo, pitch links e amortecedor do rotor de cauda (tail damper).' },
    porta_bag: { n: 'Porta traseira do bagageiro (clamshell)', o: 'Porta clamshell e compartimento de bagagem traseiro.' },
    motor: { n: 'Motor – Safran Arrius 2R (FADEC de 2 canais)', o: 'Compressor centrífugo de 1 estágio, câmara anular de fluxo reverso, turbina HP de 1 estágio e turbina livre de 1 estágio com eixo passante até a caixa de redução dianteira. FADEC de dois canais com sistema de reserva (EASA TCDS E.031).' },
    entrada_ar: { n: 'Entrada de ar e filtro de barreira (IBF)', o: 'Entrada anular do motor e filtro de barreira – limpar se a margem do PAC cair abaixo de 15 °C de MGT ou 0,2% de Ng.' }
  },
  kwExtra: [
    ['pac|apac|mpac|power assurance|verificação de potência|margem de potência', ['motor', 'entrada_ar']],
    ['tail damper|amortecedor do rotor de cauda', ['rotor_cauda']], ['pillow block|boosted bellcrank', ['comandos']],
    ['pivot sleeve|support assembly', ['comandos_rc', 'rotor_cauda']], ['linha hidráulica|linhas hidráulicas', ['hidraulico']]
  ],
  exemplos: [
    'Executar a verificação de potência (PAC) do motor',
    'Cheque de torque do pillow block dos comandos',
    'Inspeção do tail damper e das linhas hidráulicas',
    'Limpar o filtro de barreira da entrada de ar',
    'Inspeção das portas da tripulação e da porta clamshell',
    'Boroscopia do motor e inspeção do escapamento'
  ],
  programa: (G) => {
    const aIncorporar = (titulo) => [{ s: 'Tarefas a incorporar do BHT-505-MPI', c: [], t: [['Tarefas da inspeção de ' + titulo + ' – extrair do BHT-505-MPI (pasta manuais/505). Título confirmado pelo guia de manutenção do Bell 505.', 'N/A', '—', []]] }];
    return [
      { id: 'pac', h: 25, nome: '25 h – Verificação de potência (PAC)', nota: 'A cada 25 h de voo; recomenda-se executar diariamente (guia de manutenção do Bell 505).', g: [
        { s: 'Motor – verificação de potência (confirmadas)', c: ['motor'], t: [
          ['Executar o PAC: APAC no Garmin G1000H NXi ou MPAC por gráficos, em solo, pairado ou em voo à frente.', 'N/A', '700'],
          ['Condições do APAC solo/pairado: proa no vento (30 KIAS ou menos), carga elétrica de 35 A ou menos, torque de 30% Q ou mais, MGT 500–853 °C, Ng 83,0–101,3%. Fora da faixa o G1000H mostra “CHK LIMITS”.', 'N/A', '700', ['motor', 'painel']],
          ['Margens de Ng e de MGT devem ser iguais ou maiores que zero.', 'N/A', '700'],
          ['Margem abaixo de 15 °C de MGT ou 0,2% de Ng: limpar o filtro de barreira da entrada de ar e repetir o PAC.', 'N/A', '700', ['entrada_ar', 'motor']]] }] },
      { id: '50h', h: 50, nome: '50 h / 1 ano', nota: 'Título confirmado; tarefas a incorporar do MPI.', g: aIncorporar('50 h / 1 ano') },
      { id: '100h', h: 100, nome: '100 horas', nota: 'A cada 100 h de voo.', g: [
        { s: 'Comandos de voo (confirmadas – guia de manutenção)', c: ['comandos'], t: [
          ['Cheque de torque do pillow block: entre 84 e 107 lb·in (9,5 e 12 N·m).', 'Piso / deck', '200–300'],
          ['Inspeção do rolamento esférico do boosted bellcrank.', 'Deck da transmissão', '600']] },
        G.mot, G.trans] },
      { id: '100h6m', nome: '100 h / 6 meses', nota: 'Título confirmado; tarefas a incorporar do MPI.', g: aIncorporar('100 h / 6 meses') },
      { id: '100h1a', nome: '100 h / 1 ano', nota: 'Título confirmado; tarefas a incorporar do MPI.', g: aIncorporar('100 h / 1 ano') },
      { id: '100h18m', nome: '100 h / 18 meses', nota: 'Título confirmado; tarefas a incorporar do MPI.', g: aIncorporar('100 h / 18 meses') },
      { id: '150h', h: 150, nome: '150 horas', nota: 'Título confirmado; tarefas a incorporar do MPI.', g: aIncorporar('150 h') },
      { id: '200h', h: 200, nome: '200 horas', nota: 'Título confirmado; tarefas a incorporar do MPI.', g: aIncorporar('200 h') },
      { id: '300h', h: 300, nome: '300 horas', nota: 'A cada 300 h de voo. Tarefas de célula confirmadas pelo guia + itens típicos ilustrativos.', g: [
        { s: 'Célula (confirmadas – guia de manutenção)', c: [], t: [
          ['Inspeção do amortecedor do rotor de cauda (tail damper).', 'N/A', '500', ['rotor_cauda']],
          ['Inspeção das linhas hidráulicas.', 'Carenagem dianteira', '600', ['hidraulico']],
          ['Inspeção das portas da tripulação.', 'N/A', '210–211', ['porta_trip_L', 'porta_trip_R']],
          ['Inspeção da porta clamshell (bagageiro).', 'N/A', '400', ['porta_bag']],
          ['Inspeção do pivot sleeve.', 'N/A', '500', ['comandos_rc']],
          ['Inspeção do support assembly.', 'N/A', '500', ['comandos_rc', 'rotor_cauda']]] },
        Object.assign({}, G.rp, { s: 'Rotor principal (itens típicos – ilustrativos)' }),
        Object.assign({}, G.rc, { s: 'Rotor de cauda e acionamento (itens típicos – ilustrativos)' }),
        Object.assign({}, G.cmd, { s: 'Comandos e hidráulico (itens típicos – ilustrativos)' }),
        Object.assign({}, G.sis, { s: 'Sistemas (itens típicos – ilustrativos)' }),
        Object.assign({}, G.est, { s: 'Estrutura e trem (itens típicos – ilustrativos)' })] }
    ];
  },
  anacModelo: { g: 'Bell 505 – particularidades do modelo', i: [
    { ref: 'Motor Arrius 2R (EASA TCDS E.031)', t: 'Compressor centrífugo de 1 estágio, câmara anular de fluxo reverso, turbina HP de 1 estágio, turbina livre de 1 estágio e caixa de redução dianteira (saída 100% = 5610 rpm). FADEC de dois canais com sistema de reserva. Peso seco 119,9 kg.', c: ['motor'] },
    { ref: 'PAC a cada 25 h', t: 'Verificação de potência (APAC/MPAC) a cada 25 h de voo; diária recomendada. Margens de Ng e MGT ≥ 0.', c: ['motor', 'entrada_ar'] },
    { ref: 'EASA AD 2022-0265R1', t: 'Arrius 2R: risco de subestimar a MGT e exceder o limite térmico das pás da turbina HP. Verificar o cumprimento da DA aplicável.', c: ['motor'] },
    { ref: 'Aviônica', t: 'Garmin G1000H NXi: registro de excedências do motor e APAC.', c: ['painel', 'avionica'] }] },
  info: { fonte: 'Prévia – EASA TCDS E.031 (motor) e guia de manutenção público do Bell 505' }
});
