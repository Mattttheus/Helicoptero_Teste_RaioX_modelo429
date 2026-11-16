/* Manutenção Interativa – base comum dos helicópteros monomotores Bell (505, 206, 407).
   Monta COMPS, zonas, vocabulário, inspeções, limites, eventos, ANAC, controle por horas e sensores no MESMO
   formato do manual do Bell 429 (window.HELI). Cada modelo chama HELI_MONO(cfg) no seu dados.js.
   ATENÇÃO: enquanto os manuais oficiais (MM/MPI/FM) não forem incorporados, o conteúdo é uma PRÉVIA montada com
   fontes públicas e marcada como ilustrativa. O texto oficial é sempre o do manual do fabricante. */
(function () {
  const C = (n, ata, z, o, x) => Object.assign({ n, ata, z, o }, x || {});

  function componentes(c) {
    const COMPS = {
      fuselagem:       C('Fuselagem / estrutura da cabine', '53', '200–300', 'Estrutura da cabine: cavernas, vigas do piso (keel beams), teto, montantes e painéis laterais e ventrais.', { shell: 1 }),
      nariz:           C('Nariz e compartimento do nariz', '53', '100', 'Compartimento do nariz: aviônicos, pedais, chicotes e tomadas de ventilação.', { shell: 1, v: [1, .35, .8] }),
      fus_traseira:    C('Fuselagem traseira / bagageiro', '53', '400', 'Seção entre a cabine e o cone de cauda: bagageiro, baterias/aviônicos traseiros e controles.', { shell: 1, v: [-.6, .4, 1] }),
      cone_cauda:      C('Cone de cauda (tailboom)', '53', '500', 'Cone de cauda, parafusos de fixação à fuselagem e suportes dos mancais (hangers) do eixo de cauda.', { shell: 1, v: [-.4, .35, 1] }),
      carenagem_diant: C('Carenagem dianteira (deck da transmissão)', '53', '600', 'Carenagem sobre o deck dianteiro: servos hidráulicos, reservatório e controles.', { shell: 1, v: [.8, .7, 1] }),
      carenagem_trans: C('Carenagem da transmissão', '71', '600', 'Carenagem e portas de acesso à transmissão, ao mastro e ao swashplate.', { shell: 1, v: [.3, .7, 1] }),
      carenagem_motor: C('Capô do motor / parede de fogo', '71', '700', 'Capôs do compartimento do motor, entradas de ar, parede de fogo e deck do motor.', { shell: 1, v: [-.3, .7, 1] }),
      carenagem_escape:C('Carenagem traseira (escapamento e radiador de óleo)', '71', '700', 'Carenagem traseira sobre o escapamento, o radiador de óleo e o ventilador.', { shell: 1, v: [-.6, .7, 1] }),
      parabrisa:       C('Para-brisas e janelas inferiores (chin bubbles)', '56', '100–200', 'Para-brisas e janelas inferiores do nariz.', { shell: 1, v: [1, .3, .6] }),
      janelas:         C('Janelas da cabine', '56', '200', 'Transparências laterais da cabine e das portas.', { shell: 1 }),
      porta_trip_L:    C('Porta da tripulação – esquerda', '52', '210', 'Porta dianteira esquerda: dobradiças, trava e janela.', { shell: 1, side: 'L', par: 'porta_trip_R', v: [.6, .3, -1] }),
      porta_trip_R:    C('Porta da tripulação – direita (piloto)', '52', '211', 'Porta dianteira direita: dobradiças, trava e janela.', { shell: 1, side: 'R', par: 'porta_trip_L', v: [.6, .3, 1] }),
      porta_pax_L:     C('Porta de passageiros – esquerda', '52', '213', 'Porta traseira esquerda: dobradiças, trava e janela.', { shell: 1, side: 'L', par: 'porta_pax_R', v: [.1, .3, -1] }),
      porta_pax_R:     C('Porta de passageiros – direita', '52', '214', 'Porta traseira direita: dobradiças, trava e janela.', { shell: 1, side: 'R', par: 'porta_pax_L', v: [.1, .3, 1] }),
      porta_bag:       C('Porta do bagageiro', '52', '400', 'Porta e compartimento de bagagem traseiro.', { shell: 1, v: [-1, .3, .6] }),
      piso:            C('Pisos do cockpit e da cabine', '53', '200', 'Painéis de piso, pontos de amarração e áreas sob o piso.'),
      painel:          C('Painel de instrumentos e pedestal', '31', '200', 'Instrumentos/displays, painel de alarmes e pedestal.', { v: [-.2, .5, 1] }),
      avionica:        C('Aviônicos e distribuição elétrica (nariz)', '34', '100', 'Rádios, transponder, unidades de aviônica, barramentos e disjuntores.', { v: [1, .5, .7] }),
      avionica_tras:   C('ELT e aviônicos traseiros', '23', '400', 'Transmissor localizador de emergência (ELT) e equipamentos do compartimento traseiro.', { v: [-.6, .4, -1] }),
      bateria:         C('Bateria', '24', '100 / 400', 'Bateria principal e ventilação da bateria.', { v: [1, .5, -.7] }),
      gerador:         C('Starter-generator', '24', '700', 'Starter-generator montado na caixa de acessórios do motor.', { motor: 1, v: [-.1, .7, 1] }),
      comandos:        C('Comandos de voo (cíclico, coletivo, pedais)', '67', '100–300', 'Cíclico, coletivo, pedais, tubos, bellcranks e mixer sob o piso e no deck.', { v: [.3, .4, 1] }),
      comandos_rc:     C('Controle do rotor de cauda', '67', '400–500', 'Tubo/cabos de controle direcional, bellcranks e pitch change do rotor de cauda.', { v: [-.5, .4, 1] }),
      assentos_trip:   C('Assentos da tripulação', '25', '210–211', 'Assentos do piloto e do copiloto, cintos e carretéis inerciais.', { v: [.5, .5, 1] }),
      assentos_pax:    C('Assentos dos passageiros', '25', '213–214', 'Banco/assentos traseiros, cintos e carretéis.', { v: [0, .5, 1] }),
      pitot:           C('Sistema pitot-estático', '34', '100 / 200', 'Tubo de pitot e tomadas estáticas.', { v: [1, .2, .8] }),
      luzes:           C('Luzes externas', '33', '500', 'Luzes de posição, anticolisão e farol de pouso.'),
      antenas:         C('Antenas', '23', '300 / 500', 'Antenas COM/NAV/GPS/transponder/ELT.'),
      extintor:        C('Extintor portátil da cabine', '26', '200', 'Extintor de mão da cabine (pressão, lacre e validade).', { v: [.5, .4, -1] }),
      combustivel:     C('Sistema de combustível (célula, bombas, sumps)', '28', '300', 'Célula de combustível, bombas de reforço, válvula de corte, drenos e sondas de quantidade.', { v: [.2, -.5, 1] }),
      hidraulico:      C('Sistema hidráulico e servos', '29', '600', 'Bomba hidráulica (acionada pela transmissão), reservatório, filtro e servos dos comandos.', { v: [.8, .7, 1] }),
      pas_rp:          C('Pás do rotor principal', '62', '600', 'Pás: revestimento, longarina, tira de abrasão, ponteira e pesos de balanceamento.', { v: [.5, 1, .8] }),
      cubo_rp:         C('Cubo do rotor principal', '62', '600', 'Cubo/yoke, grips, rolamentos e batentes.', { v: [.6, .5, 1] }),
      swash:           C('Swashplate e controles rotativos', '62', '600', 'Swashplate e suporte, rolamento, pitch links, drive link/scissors e alavanca do coletivo.', { v: [.6, .3, 1] }),
      mastro:          C('Mastro do rotor principal', '63', '600', 'Mastro, porca do mastro e rolamentos.', { v: [.6, .3, 1] }),
      transmissao:     C('Transmissão principal', '63', '600', 'Caixa principal, bomba e filtro de óleo, detectores de limalha e roda livre.', { v: [.3, .6, 1] }),
      suporte_trans:   C('Suportes / isoladores do pilone', '63', '600', 'Isoladores (mounts), batente do pilone e fixações ao teto.', { v: [.2, .5, 1] }),
      eixo_motor:      C('Eixo principal motor–transmissão', '63', '600–700', 'Eixo de acionamento entre o motor e a transmissão, com acoplamentos.', { v: [-.1, .7, 1] }),
      radiador_oleo:   C('Radiador de óleo e ventilador (blower)', '79', '700', 'Radiador de óleo do motor/transmissão e ventilador acionado pelo eixo de cauda.', { v: [-.6, .7, 1] }),
      motor:           C('Motor – ' + c.motorNome, '71', '700', 'Compartimento do motor. Manutenção do motor conforme ' + c.motorMan + '.', { motor: 1, v: [-.2, .6, 1] }),
      entrada_ar:      C('Entradas de ar do motor', '71', '700', 'Entradas de ar, tela anti-FOD e filtro de barreira (se instalado).', { motor: 1 }),
      escapamento:     C('Escapamento', '78', '700', 'Duto(s) de escape do motor e fixações.', { motor: 1, v: [-.7, .6, 1] }),
      eixo_rc:         C('Eixo de acionamento do rotor de cauda', '65', '500–700', 'Segmentos do eixo, acoplamentos e mancais (hangers).', { v: [-.4, .5, 1] }),
      caixa_rc:        C('Caixa do rotor de cauda (TRGB)', '65', '500', 'Caixa de 90° na ponta do cone de cauda: óleo, detector de limalha e fixação.', { v: [-.5, .3, -1] }),
      rotor_cauda:     C('Rotor de cauda', '64', '500', 'Pás, cubo/yoke, rolamentos, pitch links e crosshead.', { v: [-.4, .25, -1] }),
      estabilizador:   C('Estabilizador horizontal', '55', '500', 'Estabilizador horizontal e placas verticais de ponta (se houver).', { v: [-.5, .6, 1] }),
      deriva:          C('Deriva (vertical fin) e tail skid', '55', '500', 'Deriva, fixações e sapata de cauda.', { v: [-.6, .3, 1] }),
      esquis:          C('Esquis (skid tubes)', '32', '300', 'Tubos de esqui, sapatas de desgaste e degraus.', { v: [.5, -.2, 1] }),
      tubo_diant:      C('Tubo transversal dianteiro', '32', '300', 'Crosstube dianteiro e braçadeiras.', { v: [.8, -.2, 1] }),
      tubo_tras:       C('Tubo transversal traseiro', '32', '300', 'Crosstube traseiro e braçadeiras.', { v: [-.5, -.2, 1] })
    };
    for (const id in c.nomes || {}) Object.assign(COMPS[id], c.nomes[id]);
    return COMPS;
  }

  const ZONAS = {
    100: 'Nariz', 200: 'Cockpit e cabine', 210: 'Cockpit – esquerdo', 211: 'Cockpit – direito', 213: 'Cabine – esquerda', 214: 'Cabine – direita',
    300: 'Sob o piso / trem de pouso', 400: 'Fuselagem traseira / bagageiro', 500: 'Cone de cauda e empenagem', 600: 'Transmissão e rotor principal', 700: 'Compartimento do motor'
  };
  const ZC = {
    100: ['nariz', 'avionica', 'bateria'], 200: ['piso', 'painel'], 210: ['porta_trip_L', 'assentos_trip'], 211: ['porta_trip_R', 'assentos_trip'], 213: ['porta_pax_L', 'assentos_pax'], 214: ['porta_pax_R', 'assentos_pax'],
    300: ['fuselagem', 'combustivel'], 400: ['fus_traseira', 'avionica_tras'], 500: ['cone_cauda', 'rotor_cauda', 'caixa_rc'], 600: ['carenagem_trans', 'transmissao'], 700: ['carenagem_motor', 'motor']
  };

  function vocabulario(c) {
    const TREM = ['esquis', 'tubo_diant', 'tubo_tras'], RP = ['pas_rp', 'cubo_rp', 'swash'];
    const PORTAS = ['porta_trip_L', 'porta_trip_R', 'porta_pax_L', 'porta_pax_R', 'porta_bag'];
    return [
      ['rotor principal|main rotor|ata 62|rotor', RP],
      ['pá do rotor principal|pás do rotor principal|main rotor blade', ['pas_rp']],
      ['cubo do rotor principal|cabeça do rotor|cubo|yoke|grip|rolamento elastomérico|teeter|batente|flexbeam', ['cubo_rp']],
      ['swashplate|prato cíclico|prato oscilante|pitch link|haste de passo|drive link|scissors|alavanca do coletivo', ['swash']],
      ['mastro|porca do mastro|mast', ['mastro']],
      ['pá|pás|blade', ['pas_rp', 'rotor_cauda'], 1],
      ['tracking|balanceamento|track and balance|vibração', ['pas_rp', 'cubo_rp', 'rotor_cauda'], 1],
      ['transmissão|caixa de transmissão principal|caixa principal|mgb|main gearbox|ata 63|roda livre|freewheel|freio do rotor', ['transmissao']],
      ['pylon|pilone|isolador|mount do pilone|batente do pilone', ['suporte_trans']],
      ['eixo principal|eixo do motor|main driveshaft|eixo motor transmissão', ['eixo_motor']],
      ['radiador de óleo|oil cooler|ventilador|blower|trocador de óleo', ['radiador_oleo']],
      ['hidráulico|sistema hidráulico|servo|servo atuador|atuador|reservatório hidráulico|bomba hidráulica|ata 29', ['hidraulico']],
      ['motor|turbina|engine|ata 71|ata 72|ata 73|compressor|lavagem de compressor|boroscopia|ignição|ignitor|vela|bico injetor|injetor|' + c.kwMotor, ['motor']],
      ['capô do motor|capota do motor|cowling|parede de fogo|firewall', ['carenagem_motor']],
      ['capô da transmissão|carenagem da transmissão', ['carenagem_trans']],
      ['carenagem dianteira', ['carenagem_diant']],
      ['carenagem|capô|capota', ['carenagem_diant', 'carenagem_trans', 'carenagem_motor', 'carenagem_escape'], 1],
      ['escapamento|escape|exaustão|duto de escape|exhaust|ata 78', ['escapamento']],
      ['entrada de ar|tomada de ar|admissão|inlet|filtro de ar|filtro de barreira|ibf|tela fod', ['entrada_ar']],
      ['gerador|starter|starter generator|arranque|motor de partida|escova do gerador', ['gerador']],
      ['bateria|battery|ata 24', ['bateria']],
      ['sistema elétrico|barramento|disjuntor|relé', ['avionica', 'bateria']],
      ['aviônica|aviônicos|rádio|transponder|gps|ata 34|ata 23|garmin', ['avionica']],
      ['elt|localizador de emergência', ['avionica_tras']],
      ['painel|painel de instrumentos|instrumento|display|tela|pfd|mfd|pedestal|ata 31|cockpit', ['painel']],
      ['comando de voo|comandos de voo|cíclico|coletivo|pedal|pedais|manche|bellcrank|mixer|ata 67|flight control|pillow block', ['comandos']],
      ['controle do rotor de cauda|comando direcional|tubo de controle direcional|pitch change', ['comandos_rc']],
      ['assento|assentos|banco|cinto|ata 25', ['assentos_trip', 'assentos_pax']],
      ['assento do piloto|assento do copiloto', ['assentos_trip']], ['assento de passageiro|banco traseiro', ['assentos_pax']],
      ['para brisa|parabrisa|windshield|chin bubble|janela inferior', ['parabrisa']],
      ['janela|janelas|vidro|transparência|ata 56', ['janelas', 'parabrisa']],
      ['porta|portas|ata 52|maçaneta|dobradiça|trinco|trava da porta', PORTAS],
      ['porta do piloto', ['porta_trip_R']], ['porta do copiloto', ['porta_trip_L']],
      ['porta da tripulação|porta dianteira|crew door', ['porta_trip_L', 'porta_trip_R']],
      ['porta de passageiro|porta traseira da cabine', ['porta_pax_L', 'porta_pax_R']],
      ['bagageiro|bagagem|porta do bagageiro|clamshell', ['porta_bag']],
      ['piso|assoalho', ['piso']],
      ['fuselagem|estrutura|caverna|keel beam|ata 53|corrosão', ['fuselagem']],
      ['nariz|compartimento do nariz', ['nariz']],
      ['fuselagem traseira|compartimento traseiro', ['fus_traseira']],
      ['cone de cauda|tailboom|tail boom|cauda', ['cone_cauda']],
      ['estabilizador|estabilizador horizontal|ata 55', ['estabilizador']],
      ['deriva|estabilizador vertical|vertical fin|tail skid|sapata de cauda', ['deriva']],
      ['rotor de cauda|rotor traseiro|tail rotor|ata 64|antitorque|crosshead|tail damper', ['rotor_cauda']],
      ['eixo do rotor de cauda|eixo de cauda|driveshaft|hanger|mancal|acoplamento|eixo', ['eixo_rc']],
      ['caixa do rotor de cauda|caixa de 90|caixa de cauda|trgb|tail rotor gearbox|ata 65', ['caixa_rc']],
      ['caixa|gearbox', ['transmissao', 'caixa_rc'], 1],
      ['óleo|troca de óleo|filtro de óleo|chip detector|detector de limalha|limalha|nível de óleo|lubrificação', ['transmissao', 'caixa_rc', 'motor'], 1],
      ['trem de pouso|trem|landing gear|ata 32', TREM],
      ['esqui|esquis|skid|skid tube|sapata|degrau', ['esquis']],
      ['tubo transversal|crosstube|cross tube', ['tubo_diant', 'tubo_tras']],
      ['tubo transversal dianteiro|crosstube dianteiro', ['tubo_diant']], ['tubo transversal traseiro|crosstube traseiro', ['tubo_tras']],
      ['combustível|tanque|célula de combustível|bomba de combustível|querosene|fuel|dreno de combustível|sump|ata 28|filtro de combustível', ['combustivel']],
      ['extintor|incêndio|fogo', ['extintor']],
      ['pitot|tubo de pitot|estática|tomada estática', ['pitot']],
      ['luz|farol|luz de posição|anticolisão|strobe|beacon|ata 33', ['luzes']],
      ['antena|antenas', ['antenas']]
    ];
  }

  // Grupos padrão da inspeção periódica de um monomotor Bell leve (ILUSTRATIVO até incorporar o MM/MPI do modelo)
  function grupos(c) {
    const T = c.tempNome, pas = c.pasRp === 2 ? 'semirrígido de 2 pás (teetering): yoke, grips, batentes de batimento e rolamentos' : 'macio no plano de 4 pás: flexbeam/yoke, grips, amortecedores e rolamentos elastoméricos';
    return {
      rp: { s: 'Rotor principal', c: ['pas_rp', 'cubo_rp', 'swash'], t: [
        ['GVI das pás do rotor principal: revestimento, tira de abrasão, ponteira, vazios e trincas.', 'N/A', '600', ['pas_rp']],
        ['Inspeção do cubo ' + pas + '.', 'N/A', '600', ['cubo_rp']],
        ['Inspeção dos pitch links, swashplate e suporte; folgas dos rolamentos e da alavanca do coletivo.', 'Carenagem da transmissão', '600', ['swash']],
        ['Lubrificação do rotor principal e dos controles rotativos conforme a tabela de lubrificação.', 'N/A', '600']] },
      trans: { s: 'Transmissão e acionamento principal', c: ['transmissao'], t: [
        ['Nível de óleo e vazamentos da transmissão; inspecionar os detectores de limalha.', 'Carenagem da transmissão', '600'],
        ['Indicador de bypass do filtro de óleo da transmissão.', 'Carenagem da transmissão', '600'],
        ['Inspeção dos isoladores e batentes do pilone.', 'Carenagem da transmissão', '600', ['suporte_trans']],
        ['Inspeção do eixo principal e dos acoplamentos (graxa / discos flexíveis).', 'Capô do motor', '600–700', ['eixo_motor']],
        ['Inspeção da roda livre (freewheel) e do nível de óleo.', 'Capô do motor', '700', ['transmissao', 'eixo_motor']]] },
      mot: { s: 'Motor – ' + c.motorNome, c: ['motor'], t: [
        ['Inspeção da entrada de ar, tela anti-FOD/filtro de barreira e do compressor quanto a FOD e erosão.', 'Capô do motor', '700', ['entrada_ar', 'motor']],
        ['Inspecionar os detectores de limalha do motor e o indicador de bypass do filtro de óleo.', 'Capô do motor', '700'],
        ['Inspecionar o filtro de combustível do motor (indicador de bypass) e as linhas quanto a vazamentos.', 'Capô do motor', '700'],
        ['Inspecionar o chicote de termopares de ' + T + ' e conectores; verificar o ignitor e o excitador.', 'Capô do motor', '700'],
        ['Inspecionar o escapamento quanto a trincas, deformação e fixações.', 'Carenagem traseira', '700', ['escapamento']],
        ['Inspecionar os berços (mounts) do motor e a parede de fogo.', 'Capô do motor', '700', ['motor', 'carenagem_motor']],
        ['Verificação de potência (power assurance / PAC) e análise de tendência de ' + T + ' e Ng.', 'N/A', '700']] },
      rc: { s: 'Rotor de cauda e acionamento', c: ['rotor_cauda'], t: [
        ['GVI das pás do rotor de cauda, yoke, rolamentos e pitch links.', 'N/A', '500'],
        ['Inspecionar os segmentos do eixo de cauda, acoplamentos e mancais (hangers) – etiquetas de temperatura.', 'Tampas do eixo de cauda', '500', ['eixo_rc']],
        ['Nível de óleo, vazamentos e detector de limalha da caixa do rotor de cauda.', 'N/A', '500', ['caixa_rc']]] },
      cmd: { s: 'Comandos de voo e hidráulico', c: ['comandos'], t: [
        ['Inspecionar cíclico, coletivo, pedais, tubos e bellcranks quanto a folga, atrito e frenagem.', 'Piso / deck', '100–300'],
        ['Nível do reservatório hidráulico, indicador do filtro e vazamentos nos servos.', 'Carenagem dianteira', '600', ['hidraulico']],
        ['Inspecionar o controle do rotor de cauda (tubo/cabos, bellcranks, pitch change).', 'Cone de cauda', '400–500', ['comandos_rc']]] },
      sis: { s: 'Sistemas', c: ['combustivel'], t: [
        ['Drenar os sumps de combustível e verificar contaminação; inspecionar bombas de reforço e válvula de corte.', 'N/A', '300'],
        ['Teste funcional da bateria e inspeção das escovas do starter-generator.', 'Nariz / capô do motor', '100 / 700', ['bateria', 'gerador']],
        ['Teste das luzes externas, pitot-estático (aquecimento) e antenas.', 'N/A', '—', ['luzes', 'pitot', 'antenas']],
        ['Inspecionar o ELT (montagem, bateria, teste) e o extintor portátil.', 'Bagageiro / cabine', '400', ['avionica_tras', 'extintor']]] },
      est: { s: 'Estrutura e trem de pouso', c: ['fuselagem'], t: [
        ['GVI da fuselagem, cone de cauda, estabilizador e deriva quanto a trincas, rebites soltos e corrosão.', 'N/A', '200–500', ['fuselagem', 'cone_cauda', 'estabilizador', 'deriva']],
        ['Cheque de torque dos parafusos de fixação do cone de cauda.', 'N/A', '500', ['cone_cauda']],
        ['Inspecionar esquis, sapatas de desgaste e tubos transversais (deflexão e braçadeiras).', 'N/A', '300', ['esquis', 'tubo_diant', 'tubo_tras']],
        ['Inspecionar portas, travas, dobradiças e transparências.', 'N/A', '200', ['porta_trip_L', 'porta_trip_R', 'porta_pax_L', 'porta_pax_R', 'parabrisa', 'janelas']]] }
    };
  }

  // Numera as tarefas: <modelo>.<ATA>.<seq> – referência local da demonstração (não é o número oficial do manual)
  function numerar(c, insp, COMPS) {
    let n = 0;
    for (const ins of insp) ins.g = ins.g.map((g) => Object.assign({}, g, { t: g.t.map((t) => {
      if (!Array.isArray(t)) return [t.n, t.t, t.a || 'N/A', t.z || '—', t.c]; // tarefa com número do manual oficial
      const comps = t[3] || g.c || [];
      const ata = (COMPS[comps[0]] || {}).ata || '05';
      return [`${c.id}.${ata}.${String(++n).padStart(3, '0')}`, t[0], t[1], t[2], t[3]];
    }) }));
    return insp;
  }

  function eventos(c) {
    const M = ['motor'], T = c.tempNome;
    return [
      { id: 'pouso', n: 'Pouso duro', r: 'Impacto com o solo acima do normal (arfagem forte do rotor, trem deformado). Inspeção inicial abaixo; dano além do trem exige inspeção detalhada conforme o ' + c.mm + ' (Cap. 5 – inspeções especiais).', a: [
        ['Trem de pouso', ['esquis', 'tubo_diant', 'tubo_tras'], 'Deflexão e deformação dos tubos transversais, braçadeiras e esquis.'],
        ['Fuselagem e cone de cauda', ['fuselagem', 'fus_traseira', 'cone_cauda'], 'Painéis ventrais, keel beams, fixação do cone de cauda.'],
        ['Rotor principal e mastro', ['pas_rp', 'cubo_rp', 'mastro'], 'Contato das pás com os batentes, deformação do mastro, cubo e pás.'],
        ['Transmissão e pilone', ['transmissao', 'suporte_trans', 'eixo_motor'], 'Isoladores, batente do pilone, detectores de limalha, eixo principal.'],
        ['Rotor de cauda e acionamento', ['rotor_cauda', 'eixo_rc', 'caixa_rc'], 'Contato da cauda com o solo, eixos e caixa.'],
        ['Motor', M, 'Berços do motor e inspeção de pouso duro conforme ' + c.motorMan + '.'],
        ['Assentos', ['assentos_trip', 'assentos_pax'], 'Estrutura dos assentos e cintos.']] },
      { id: 'psrp', n: 'Parada brusca – rotor principal', r: 'Desaceleração súbita do sistema de acionamento (contato das pás com obstáculo, travamento).', a: [
        ['Pás e cubo', ['pas_rp', 'cubo_rp'], 'Pás para avaliação; cubo, grips e rolamentos.'],
        ['Controles rotativos', ['swash'], 'Pitch links, swashplate, drive link.'],
        ['Mastro e transmissão', ['mastro', 'transmissao'], 'Mastro (empeno/torção) e transmissão para oficina aprovada.'],
        ['Eixo principal e roda livre', ['eixo_motor'], 'Acoplamentos e eixo principal; roda livre.'],
        ['Motor', M, 'Inspeção de parada brusca do motor (' + c.motorMan + ').']] },
      { id: 'psrc', n: 'Parada brusca – rotor de cauda', r: 'Travamento do acionamento do rotor de cauda ou impacto das pás com objeto.', a: [
        ['Eixo de cauda e mancais', ['eixo_rc'], 'Segmentos, acoplamentos e hangers.'],
        ['Caixa do rotor de cauda', ['caixa_rc'], 'Carcaça, fixação, eixo de saída.'],
        ['Rotor de cauda e controle', ['rotor_cauda', 'comandos_rc'], 'Pás, yoke, pitch change.'],
        ['Cone de cauda e empenagem', ['cone_cauda', 'estabilizador', 'deriva'], 'Suportes dos hangers, fixações.']] },
      { id: 'otq', n: 'Sobretorque', r: 'Torque acima do limite do RFM. A faixa e a duração determinam a inspeção (transmissão, mastro, eixo principal e motor).', a: [
        ['Transmissão e mastro', ['transmissao', 'mastro', 'suporte_trans'], 'Detectores de limalha, fixações e inspeção conforme a faixa de excedência.'],
        ['Eixo principal', ['eixo_motor'], 'Acoplamentos e eixo principal.'],
        ['Rotor principal', ['pas_rp', 'cubo_rp', 'swash'], 'Pás, cubo e controles rotativos.'],
        ['Acionamento do rotor de cauda', ['eixo_rc', 'caixa_rc'], 'Eixos e caixa.'],
        ['Motor', M, 'Inspeção de sobretorque do motor (' + c.motorMan + ').']] },
      { id: 'otemp', n: 'Sobretemperatura do motor (' + T + ')', r: c.textoTemp || (T + ' acima do limite de partida, transitório ou de decolagem: registrar valor e duração; a inspeção depende da faixa (' + c.motorMan + ').'), a: [
        ['Seção quente do motor', M, 'Boroscopia da câmara de combustão e das turbinas; termopares de ' + T + '.'],
        ['Escapamento', ['escapamento', 'carenagem_escape'], 'Trincas e descoloração do escapamento e da carenagem.']] },
      { id: 'osp', n: 'Sobrevelocidade (rotor / N2)', r: 'Rotação do rotor ou da turbina livre acima do limite: inspeção do rotor, do acionamento e do motor conforme a faixa.', a: [
        ['Rotor principal', ['pas_rp', 'cubo_rp'], 'Pás e cubo.'], ['Rotor de cauda', ['rotor_cauda'], 'Pás e cubo.'],
        ['Acionamentos', ['transmissao', 'caixa_rc', 'eixo_motor', 'eixo_rc', 'radiador_oleo'], 'Limalha, eixos e ventilador.'],
        ['Motor', M, 'Turbina livre: inspeção de sobrevelocidade (' + c.motorMan + ').']] },
      { id: 'raio', n: 'Descarga atmosférica (raio)', r: 'Inspeção de marcas de arco, queima e delaminação; magnetismo residual em componentes de aço.', a: [
        ['Rotores', ['pas_rp', 'cubo_rp', 'rotor_cauda'], 'Pontas das pás, cubos e rolamentos.'],
        ['Acionamentos', ['mastro', 'transmissao', 'eixo_rc', 'caixa_rc'], 'Rolamentos e limalha após voo.'],
        ['Elétrica e aviônica', ['avionica', 'painel', 'antenas', 'pitot', 'bateria'], 'Cheque operacional dos sistemas e bússola.'],
        ['Estrutura', ['fuselagem', 'cone_cauda', 'estabilizador', 'deriva'], 'Marcas de arco em revestimentos.'], ['Motor', M, 'Conforme ' + c.motorMan + '.']] },
      { id: 'granizo', n: 'Voo através de granizo', r: 'Mossas e perfurações em grandes áreas; substituir peças danificadas.', a: [
        ['Revestimentos e capôs', ['nariz', 'fuselagem', 'carenagem_diant', 'carenagem_trans', 'carenagem_motor', 'cone_cauda'], 'Mossas e trincas.'],
        ['Transparências', ['parabrisa', 'janelas'], 'Trincas e crazing.'], ['Rotores', ['pas_rp', 'rotor_cauda'], 'Bordos de ataque e tiras de abrasão.']] },
      { id: 'agua', n: 'Imersão em água', r: 'Iniciar a recuperação o quanto antes após a retirada da água; componentes dinâmicos para oficina aprovada.', a: [
        ['Estrutura', ['fuselagem', 'cone_cauda', 'fus_traseira'], 'Inspeção estrutural e de corrosão.'],
        ['Acionamentos e rotores', ['mastro', 'transmissao', 'eixo_motor', 'eixo_rc', 'caixa_rc', 'pas_rp', 'cubo_rp', 'rotor_cauda'], 'Remoção e preservação.'],
        ['Sistemas e motor', ['avionica', 'painel', 'combustivel', 'hidraulico', 'motor'], 'Contaminação; motor conforme ' + c.motorMan + '.']] }
    ];
  }

  function anac(c) {
    return [
      { g: 'Tipos de manutenção', i: [
        { ref: 'Preventiva (programada)', t: 'Inspeções e tarefas com intervalo em horas ou calendário, conforme o programa do fabricante (' + c.mm + ') ou o programa aprovado do operador: abas “Inspeções” e “Controle”.' },
        { ref: 'Preditiva (por condição)', t: 'Detectores de limalha, análise de óleo, vibração / track & balance, verificação de potência (' + c.tempNome + ' e Ng), boroscopia e tendências do motor.', c: ['transmissao', 'caixa_rc', 'motor', 'pas_rp', 'rotor_cauda'] },
        { ref: 'Corretiva / condicional', t: 'Correção de discrepâncias e inspeções após eventos (pouso duro, sobretorque, sobretemperatura, raio…): aba “Eventos”.' }] },
      { g: 'RBAC 91 – Subparte E', i: [
        { ref: '91.403', t: 'O proprietário/operador é o responsável primário pela aeronavegabilidade, inclusive pelas Diretrizes de Aeronavegabilidade (RBAC 39).' },
        { ref: '91.405', t: 'Fazer as inspeções previstas, corrigir discrepâncias e manter os registros de retorno ao serviço.' },
        { ref: '91.407', t: 'Só voar após a aprovação para retorno ao serviço por pessoa autorizada.' },
        { ref: '91.409', t: 'Inspeção anual / de 100 horas ou programa de inspeção do fabricante aprovado.', l: c.insp100 },
        { ref: '91.411 / 91.413', t: 'Testes do sistema estático/altímetro e do transponder a cada 24 meses.', c: ['pitot', 'avionica', 'painel'] },
        { ref: '91.207', t: 'ELT: inspeção periódica e troca da bateria.', c: ['avionica_tras'] },
        { ref: '91.417', t: 'Registros: tempo total, peças com vida limite, revisões gerais, inspeções e DA.' }] },
      { g: 'RBAC 43 – Manutenção', i: [
        { ref: '43.3 / 43.7', t: 'Quem executa e quem aprova o retorno ao serviço (RBAC 145, mecânico RBAC 65, operador certificado).' },
        { ref: '43.9 / 43.11', t: 'Registros de manutenção e de inspeção.' },
        { ref: '43.13', t: 'Usar os métodos do manual do fabricante atualizado (' + c.mm + ' e ' + c.motorMan + ').' },
        { ref: '43.15 / Apêndice D', t: 'Escopo mínimo das inspeções anual e de 100 horas.' }] },
      { g: 'Outros regulamentos', i: [
        { ref: 'RBAC 145', t: 'Organizações de manutenção de produto aeronáutico.' },
        { ref: 'RBAC 135 – Subparte J', t: 'Táxi aéreo: programa de manutenção aprovado e manual do operador.' },
        { ref: 'RBAC 65', t: 'Licenças de mecânico (célula, grupo motopropulsor, aviônicos).' },
        { ref: 'RBAC 39', t: 'Diretrizes de Aeronavegabilidade de cumprimento obrigatório (célula e motor ' + c.motorNome + ').' }] },
      ...(c.anacModelo ? [c.anacModelo] : [])
    ];
  }

  // Sensores IoT – mesmo formato do 429; o motor usa o limite de temperatura do próprio modelo
  function sensores(c) {
    const S = (id, n, comp, un, tipo, base, ruido, al, cr, dica) => ({ id, n, comp, un, tipo, base, ruido, al, cr, dica });
    const B = (id, n, comp, dica) => ({ id, n, comp, un: '', tipo: 'bool', base: 0, dica });
    const T = c.tempNome, L = c.limites, man = c.motorMan;
    const GR = [
      { g: 'Rotor principal', s: [
        S('vib_rp', 'Vibração do rotor principal (1/rev)', ['cubo_rp', 'pas_rp'], 'ips', 'max', 0.12, 0.025, 0.30, 0.50, 'Tracking e balanceamento; inspeção das pás e do cubo.'),
        S('track_rp', 'Diferença de tracking das pás', ['pas_rp'], 'mm', 'max', 3, 0.8, 10, 18, 'Ajuste de tracking; inspeção das pás e pitch links.'),
        S('temp_swash', 'Temperatura do rolamento do swashplate', ['swash'], '°C', 'max', 50, 2, 80, 95, 'Lubrificar e verificar o rolamento do swashplate.'),
        S('torque_mastro', 'Torque no mastro', ['mastro'], '%', 'max', 76, 3, 100, 110, 'Acima de 100%: inspeção de sobretorque (aba Eventos).')] },
      { g: 'Transmissão e acionamento principal', s: [
        S('temp_trans', 'Temperatura do óleo da transmissão', ['transmissao'], '°C', 'max', 82, 2.5, 105, 110, 'Verificar nível de óleo e radiador; inspeção da transmissão.'),
        S('pres_trans', 'Pressão do óleo da transmissão', ['transmissao'], 'psi', 'min', 50, 1.5, 35, 30, 'Verificar bomba, filtro e vazamentos.'),
        B('chip_trans', 'Detector de limalha – transmissão', ['transmissao'], 'Identificar as partículas; pode exigir remoção da transmissão.'),
        S('desl_pilone', 'Deslocamento dos isoladores do pilone', ['suporte_trans'], 'mm', 'max', 1.0, 0.25, 3.5, 5.5, 'Inspeção dos isoladores e do batente do pilone.'),
        S('vib_eixo_motor', 'Vibração do eixo principal', ['eixo_motor'], 'ips', 'max', 0.09, 0.02, 0.25, 0.40, 'Inspeção do eixo principal e dos acoplamentos.'),
        S('vib_blower', 'Vibração do ventilador do radiador de óleo', ['radiador_oleo'], 'ips', 'max', 0.08, 0.02, 0.25, 0.40, 'Inspeção do ventilador e dos mancais.')] },
      { g: 'Motor – ' + c.motorNome, s: [
        S('temp_motor', T + ' do motor', ['motor'], '°C', 'max', L.tempCru, 10, L.tempMcp, L.tempTo, 'Limites de ' + T + ' e inspeções conforme ' + man + '.'),
        S('ng_motor', 'Ng / N1 (gerador de gás)', ['motor'], '%', 'max', L.ngCru, 0.4, L.ngMcp, L.ngTo, 'Acima do limite: inspeção de sobrevelocidade do gerador de gás.'),
        S('vib_motor', 'Vibração do motor', ['motor'], 'ips', 'max', 0.15, 0.03, 0.40, 0.60, 'Inspeção de vibração conforme ' + man + '.'),
        S('pres_oleo_motor', 'Pressão do óleo do motor', ['motor'], 'psi', 'min', L.oleoP, 2, L.oleoPal, L.oleoPmin, 'Verificar nível, bomba e filtro de óleo do motor.'),
        S('temp_oleo_motor', 'Temperatura do óleo do motor', ['motor'], '°C', 'max', 78, 2, L.oleoTmax - 8, L.oleoTmax, 'Verificar radiador de óleo e ventilador.'),
        B('chip_motor', 'Detector de limalha – motor', ['motor'], 'Identificar as partículas conforme ' + man + '.'),
        S('dp_entrada', 'Pressão diferencial da entrada de ar / filtro', ['entrada_ar'], 'inH₂O', 'max', 3, 0.5, 9, 13, 'Limpar ou substituir o filtro/tela da entrada de ar.'),
        S('temp_escape', 'Temperatura da carenagem do escapamento', ['escapamento'], '°C', 'max', 260, 8, 340, 400, 'Inspecionar o escapamento quanto a trincas e vazamento de gases.'),
        S('temp_ger', 'Temperatura do starter-generator', ['gerador'], '°C', 'max', 75, 3, 110, 125, 'Inspeção das escovas e da ventilação.')] },
      { g: 'Rotor de cauda e acionamento', s: [
        S('vib_rc', 'Vibração do rotor de cauda', ['rotor_cauda'], 'ips', 'max', 0.10, 0.02, 0.30, 0.50, 'Balanceamento; inspeção das pás e do cubo.'),
        S('temp_hang', 'Temperatura do mancal (hanger)', ['eixo_rc'], '°C', 'max', 54, 2, 80, 95, 'Lubrificação e inspeção dos hangers e acoplamentos.'),
        S('temp_trgb', 'Temperatura da caixa do rotor de cauda', ['caixa_rc'], '°C', 'max', 70, 2, 95, 110, 'Verificar nível e condição do óleo.'),
        B('chip_trgb', 'Detector de limalha – caixa do rotor de cauda', ['caixa_rc'], 'Identificar as partículas; pode exigir remoção da caixa.'),
        S('atrito_pedais', 'Força nos pedais', ['comandos_rc'], 'N', 'max', 8, 1, 18, 25, 'Inspeção do controle do rotor de cauda.')] },
      { g: 'Sistemas', s: [
        S('pres_hid', 'Pressão hidráulica (% da nominal)', ['hidraulico'], '%', 'min', 100, 1.2, 90, 80, 'Verificar vazamentos, reservatório e servos.'),
        S('temp_hid', 'Temperatura do fluido hidráulico', ['hidraulico'], '°C', 'max', 60, 2, 95, 110, 'Inspecionar bomba e servos.'),
        B('agua_comb', 'Água/contaminação no sump de combustível', ['combustivel'], 'Drenar os sumps e inspecionar a célula e as telas.'),
        S('pres_extintor', 'Pressão do extintor portátil', ['extintor'], 'psi', 'min', 195, 2, 170, 150, 'Substituir/recarregar o extintor.'),
        S('atrito_ciclico', 'Força de atrito no cíclico', ['comandos'], 'N', 'max', 6, 0.8, 14, 20, 'Inspeção de tubos e bellcranks.'),
        S('cor_pitot', 'Corrente de aquecimento do pitot', ['pitot'], 'A', 'min', 4.2, 0.12, 3, 1.8, 'GVI do pitot e teste do aquecimento.'),
        B('falha_luz', 'Falha em luz externa', ['luzes'], 'Inspeção das luzes de posição, anticolisão e farol.'),
        S('vswr_ant', 'VSWR das antenas', ['antenas'], ': 1', 'max', 1.3, 0.05, 2, 3, 'Cheque de VSWR de antenas e cabos.')] },
      { g: 'Elétrica e aviônica', s: [
        S('v_bat', 'Tensão da bateria', ['bateria'], 'V', 'min', 25.4, 0.15, 24, 22.5, 'Teste da bateria e do sistema de geração.'),
        S('temp_avionica', 'Temperatura do compartimento de aviônicos', ['avionica'], '°C', 'max', 37, 1.5, 55, 70, 'Verificar ventilação dos aviônicos.'),
        S('temp_painel', 'Temperatura do painel/displays', ['painel'], '°C', 'max', 40, 1.5, 60, 72, 'Verificar ventilação do painel.'),
        S('bat_elt', 'Carga da bateria do ELT', ['avionica_tras'], '%', 'min', 95, 0.3, 50, 25, 'Substituir a bateria do ELT.')] },
      { g: 'Estrutura e trem de pouso', s: [
        S('def_fus', 'Deformação na estrutura do teto (pilone)', ['fuselagem'], 'µε', 'max', 300, 25, 700, 950, 'Inspeção das vigas do teto e fixações do pilone.'),
        S('umid_nariz', 'Umidade no compartimento do nariz', ['nariz'], '%', 'max', 42, 2, 75, 90, 'Verificar drenos e corrosão.'),
        S('def_cone', 'Deformação na fixação do cone de cauda', ['cone_cauda'], 'µε', 'max', 250, 25, 600, 850, 'Cheque de torque da fixação do cone de cauda.'),
        S('vib_estab', 'Vibração do estabilizador horizontal', ['estabilizador'], 'ips', 'max', 0.11, 0.02, 0.30, 0.45, 'Inspeção do estabilizador e fixações.'),
        S('def_deriva', 'Deformação no fitting da deriva', ['deriva'], 'µε', 'max', 240, 25, 600, 850, 'Inspeção do fitting da deriva.'),
        S('umid_piso', 'Umidade sob o piso', ['piso'], '%', 'max', 40, 2, 75, 90, 'Verificar drenos e corrosão.'),
        S('g_pouso', 'Aceleração vertical no pouso', ['esquis'], 'g', 'max', 1.1, 0.08, 2, 2.6, 'Pouso duro: executar a inspeção condicional (aba Eventos).'),
        S('defl_diant', 'Deflexão do tubo transversal dianteiro', ['tubo_diant'], 'mm', 'max', 4, 0.6, 12, 18, 'Cheque de deflexão do tubo transversal.'),
        S('defl_tras', 'Deflexão do tubo transversal traseiro', ['tubo_tras'], 'mm', 'max', 4, 0.6, 12, 18, 'Cheque de deflexão do tubo transversal.')] },
      { g: 'Portas, janelas e capôs', s: [
        B('trava_trip_l', 'Porta da tripulação esquerda destravada', ['porta_trip_L'], 'Inspeção das dobradiças e da trava.'),
        B('trava_trip_r', 'Porta da tripulação direita destravada', ['porta_trip_R'], 'Inspeção das dobradiças e da trava.'),
        B('trava_pax_l', 'Porta de passageiros esquerda destravada', ['porta_pax_L'], 'Inspeção das dobradiças e da trava.'),
        B('trava_pax_r', 'Porta de passageiros direita destravada', ['porta_pax_R'], 'Inspeção das dobradiças e da trava.'),
        B('trava_bag', 'Porta do bagageiro destravada', ['porta_bag'], 'Inspeção das dobradiças e da trava.'),
        B('impacto_pbrisa', 'Impacto/trinca no para-brisa', ['parabrisa'], 'Inspecionar transparências.'),
        B('impacto_janela', 'Impacto/trinca em janela', ['janelas'], 'Inspecionar transparências.'),
        B('capo_diant', 'Carenagem dianteira destravada', ['carenagem_diant'], 'Verificar travas.'),
        B('capo_trans', 'Carenagem da transmissão destravada', ['carenagem_trans'], 'Verificar travas.'),
        B('capo_motor', 'Capô do motor destravado', ['carenagem_motor'], 'Verificar travas.'),
        B('capo_escape', 'Carenagem traseira solta', ['carenagem_escape'], 'Verificar fixações.'),
        S('temp_fus_tras', 'Temperatura do bagageiro / compartimento traseiro', ['fus_traseira'], '°C', 'max', 38, 1.5, 60, 75, 'GVI do compartimento traseiro.')] },
      { g: 'Interior', s: [
        S('temp_cabine', 'Temperatura da cabine (assentos)', ['assentos_pax', 'assentos_trip'], '°C', 'max', 26, 1, 45, 55, 'Verificar ventilação/ar-condicionado.')] }
    ];
    if (c.sensoresExtra) for (const [grupo, lista] of c.sensoresExtra) { const g = GR.find((x) => x.g === grupo) || GR[2]; g.s.push(...lista); }
    return GR;
  }

  // Itens tipicamente controlados por vida limite (sem P/N nem valores: virão do Cap. 4 do MM do modelo)
  function limitesPadrao(c) {
    const V = 'ver Cap. 4 do ' + c.mm, P = 'ver IPC';
    return [
      { s: 'Rotor principal', c: ['cubo_rp'], i: [['Pás do rotor principal', P, V, ['pas_rp']], ['Cubo / yoke e grips', P, V], ['Parafusos das pás', P, V, ['pas_rp', 'cubo_rp']]] },
      { s: 'Controles do rotor principal', c: ['swash'], i: [['Swashplate e suporte', P, V], ['Pitch links / drive link', P, V]] },
      { s: 'Acionamento principal', c: ['transmissao'], i: [['Mastro do rotor principal', P, V, ['mastro']], ['Engrenagens e carcaça da transmissão', P, V], ['Eixo principal e acoplamentos', P, V, ['eixo_motor']], ['Roda livre (freewheel)', P, V, ['eixo_motor', 'transmissao']]] },
      { s: 'Rotor de cauda e acionamento', c: ['rotor_cauda'], i: [['Pás e yoke do rotor de cauda', P, V], ['Eixo de cauda / acoplamentos', P, V, ['eixo_rc']], ['Caixa do rotor de cauda', P, V, ['caixa_rc']]] },
      { s: 'Trem de pouso e estrutura', i: [['Tubos transversais', P, V, ['tubo_diant', 'tubo_tras']], ['Fixações do cone de cauda', P, V, ['cone_cauda']]] },
      { s: 'Motor – ' + c.motorNome, c: ['motor'], i: [['Discos do compressor e das turbinas', 'conforme o motor', 'Limites em ciclos/horas no ' + c.motorMan], ['Revisão geral (TBO)', '—', c.tbo || 'conforme ' + c.motorMan]] }
    ];
  }

  window.HELI_MONO = function (c) {
    const COMPS = componentes(c);
    const G = grupos(c);
    const INSPECOES = numerar(c, c.programa(G), COMPS);
    const GR = sensores(c);
    const SENSORES = GR.flatMap((g) => g.s.map((s) => Object.assign(s, { grupo: g.g })));
    const CONTROLE = (c.controle || []).concat(INSPECOES.filter((i) => i.h).map((i) => ({ id: 'c' + i.id, h: i.h, nome: i.nome, origem: 'mpi', insp: i.id })));
    const INFO = Object.assign({
      manual: c.mm, dmc: '', fabMotor: c.fabMotor, motorMan: c.motorMan, mm: c.mm, ilustrativo: true,
      aviso: 'PRÉVIA ilustrativa para demonstração e treinamento, montada com fontes públicas. Não substitui o ' + c.mm + ', o ' + c.motorMan + ' nem os regulamentos da ANAC.',
      exemploTexto: 'Ex.: ' + c.exemplos[0].toLowerCase(),
      buscaDica: 'Tente o nome da peça, o sistema, o capítulo ATA (ex.: ATA 63) ou um regulamento (ex.: 91.409).',
      tolerancia: 'Tolerância das inspeções programadas: conforme o ' + c.mm + ' / programa aprovado (confirme no manual).',
      tituloLimites: 'Componentes com vida limite (Cap. 4 do MM / ALS)',
      notaLimites: 'Prévia: lista dos itens tipicamente controlados por vida limite. Os P/N e os valores oficiais virão do Cap. 4 (Airworthiness Limitations) do ' + c.mm + ' – não use esta lista para controle real.',
      notaEventos: 'Inspeções condicionais conforme o ' + c.mm + ' (inspeções especiais) e o ' + c.motorMan + '. Em caso de dúvida, contatar o suporte técnico da Bell.',
      prepNota: c.mm, lubNota: c.mm + ' (lubrificação)',
      notaControle: 'Intervalos desta prévia conforme fontes públicas e o programa típico do modelo. Ajuste ao ' + c.mm + ' e ao programa de manutenção aprovado da sua aeronave.'
    }, c.info || {});
    window.HELI = {
      INFO, COMPS, ZONAS, ZC, KW: vocabulario(c).concat(c.kwExtra || []), EXEMPLOS: c.exemplos,
      MPI: {
        GERAL: [
          'Revisar o diário de bordo e confirmar a correção das discrepâncias.',
          'Confirmar o cumprimento das Diretrizes de Aeronavegabilidade (DA) e boletins aplicáveis (célula e motor).',
          'Confirmar que componentes com vida limite não excedem a vida em serviço (Cap. 4 do ' + c.mm + ').',
          'Confirmar as tarefas de lubrificação requeridas.',
          'Verificar os registros de excedências (' + c.tempNome + ', Ng, torque, Nr) no sistema de monitoramento.',
          'Registrar o cumprimento desta inspeção no diário de bordo.'],
        INSPECOES, LIMITES: c.limitesVida || limitesPadrao(c), RIN: [], EVENTOS: eventos(c).concat(c.eventosExtra || [])
      },
      ANAC: anac(c), CONTROLE, SENSORES, GRUPOS_SENSORES: GR.map((g) => g.g)
    };
  };
})();
