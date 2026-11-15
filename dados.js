/* Bell 429 – dados do manual interativo (demonstração).
   Fonte dos intervalos, tarefas, zonas e painéis: BHT-429-MPI Issue 2 (3 DEC 2019), Cap. 04 e 05.
   Descrições resumidas e traduzidas – o texto oficial é sempre o do manual do fabricante. */
(function () {
  // ---------- Componentes do modelo 3D ----------
  // n: nome | ata | z: zona(s) | o: onde fica / acesso | shell: revestimento externo | side/par: lado e par | v: direção de câmera
  const COMPS = {
    fuselagem:       { n: 'Fuselagem / estrutura da cabine', ata: '53', z: '200–300', o: 'Estrutura central: cavernas, keel beams, lift frames, painéis laterais e ventrais.', shell: 1 },
    nariz:           { n: 'Nariz e compartimentos do nariz', ata: '53', z: '100 (110/111/112)', o: 'Nose cap/radome (100A), compartimento superior (bateria e aviônicos) e inferior (chicotes e pedais).', shell: 1, v: [1, .35, .8] },
    fus_traseira:    { n: 'Fuselagem traseira (compartimentos 410/411)', ata: '53', z: '400 (410/411)', o: 'Entre o bagageiro e o cone de cauda: compartimento traseiro de aviônicos (410) e de controles (411). Painéis 400A/B/C.', shell: 1, v: [-.6, .4, 1] },
    cone_cauda:      { n: 'Cone de cauda (tailboom)', ata: '53', z: '510', o: 'Estrutura do cone de cauda, capas do eixo (500A/B) e fixação à fuselagem traseira (FS 361).', shell: 1, v: [-.4, .35, 1] },
    carenagem_diant: { n: 'Carenagem dianteira (forward fairing/cowl)', ata: '53', z: '610', o: 'Painéis 600A e 600CL/CR – cobrem o deck dianteiro da transmissão e os módulos hidráulicos.', shell: 1, v: [.8, .7, 1] },
    carenagem_trans: { n: 'Capô da transmissão', ata: '71', z: '611', o: 'Capôs 600EL/ER e portas 600FL/FR – acesso à transmissão, mastro e vigas do pilone.', shell: 1, v: [.3, .7, 1] },
    carenagem_motor: { n: 'Capôs dos motores / paredes de fogo', ata: '71', z: '710', o: 'Entradas 700BL/BR, capôs 700CL/CR e portas 700DL/DR; paredes de fogo e engine deck.', shell: 1, v: [-.3, .7, 1] },
    carenagem_escape:{ n: 'Carenagens de escapamento', ata: '71', z: '711', o: 'Carenagens 700GL/GR, 700H e 700HL/HR sobre o compartimento do radiador de óleo.', shell: 1, v: [-.6, .7, 1] },
    parabrisa:       { n: 'Para-brisa e janelas inferiores (chin bubbles)', ata: '56', z: '110 / 210–211', o: 'Transparências dianteiras e janelas inferiores do nariz.', shell: 1, v: [1, .3, .6] },
    janelas:         { n: 'Janelas da cabine', ata: '56', z: '213–214', o: 'Transparências laterais traseiras da cabine.', shell: 1 },
    porta_trip_L:    { n: 'Porta da tripulação – esquerda (copiloto)', ata: '52', z: '210', o: 'Porta dianteira esquerda: dobradiças, mecanismo de trava e janela.', shell: 1, side: 'L', par: 'porta_trip_R', v: [.6, .3, -1] },
    porta_trip_R:    { n: 'Porta da tripulação – direita (piloto)', ata: '52', z: '211', o: 'Porta dianteira direita: dobradiças, mecanismo de trava e janela.', shell: 1, side: 'R', par: 'porta_trip_L', v: [.6, .3, 1] },
    porta_pax_L:     { n: 'Porta de passageiros – esquerda', ata: '52', z: '213', o: 'Porta da cabine esquerda: dobradiças, trava e janela.', shell: 1, side: 'L', par: 'porta_pax_R', v: [.1, .3, -1] },
    porta_pax_R:     { n: 'Porta de passageiros – direita', ata: '52', z: '214', o: 'Porta da cabine direita: dobradiças, trava e janela.', shell: 1, side: 'R', par: 'porta_pax_L', v: [.1, .3, 1] },
    porta_bag:       { n: 'Portas traseiras / bagageiro (clamshell)', ata: '52', z: '216', o: 'Portas de carga traseiras e compartimento de bagagem (painel 200F).', shell: 1, v: [-1, .3, .6] },
    piso:            { n: 'Pisos do cockpit e da cabine', ata: '53', z: '210–216', o: 'Painéis de piso 200AL/AR (cockpit), 200DL/DR e 200EL/ER (cabine).' },
    painel:          { n: 'Painel de instrumentos e pedestal', ata: '31', z: '212', o: 'Displays, bússola e altímetro standby, pedestal central.', v: [-.2, .5, 1] },
    avionica:        { n: 'Aviônicos e distribuição elétrica (nariz)', ata: '34', z: '111', o: 'Compartimento superior do nariz: ADC, barramentos, diodos e relés (portas 100DL/DR).', v: [1, .5, .7] },
    avionica_tras:   { n: 'Aviônicos traseiros / ELT / GRCU', ata: '23', z: '410–411', o: 'Compartimento traseiro: GRCUs (400B), ELT (400C) e ULB.', v: [-.6, .4, -1] },
    bateria:         { n: 'Bateria', ata: '24', z: '100', o: 'Compartimento da bateria no nariz – acesso pelos painéis 100A/100B.', v: [1, .5, -.7] },
    gerador:         { n: 'Starter-generators nº 1 e nº 2', ata: '24', z: '710', o: 'Acoplados aos motores; acesso pelos capôs 600EL/ER e 600FL/FR.', v: [-.1, .7, 1] },
    comandos:        { n: 'Comandos de voo (cíclico, coletivo, pedais)', ata: '67', z: '110 / 210–211 / 313–315', o: 'Manches, coletivos e pedais; tubos, bellcranks, mixer e jackshaft sob o piso (200AL/AR, 200BL/BR, 200CL/CC/CR).', v: [.3, .4, 1] },
    comandos_rc:     { n: 'Controle direcional (rotor de cauda)', ata: '67', z: '410–411 / 510', o: 'Tubo de controle direcional, idlers, atuador AFCS e atuador hidráulico duplo (400B/400C, 500C/D/F).', v: [-.5, .4, 1] },
    assentos_trip:   { n: 'Assentos da tripulação', ata: '25', z: '210–211', o: 'Assentos do piloto e copiloto: cintos, carretel inercial, atenuador de energia, trilhos.', v: [.5, .5, 1] },
    assentos_pax:    { n: 'Assentos dos passageiros', ata: '25', z: '213–214', o: 'Assentos da cabine: cintos, carretel inercial, estrutura e atenuador de energia.', v: [0, .5, 1] },
    pitot:           { n: 'Sistema pitot-estático', ata: '34', z: '100 / 200', o: 'Tubos de pitot no nariz e tomadas estáticas na fuselagem.', v: [1, .2, .8] },
    luzes:           { n: 'Luzes externas', ata: '33', z: '511–513', o: 'Luzes de posição (estabilizador e deriva), anticolisão e farol de pouso.' },
    antenas:         { n: 'Antenas', ata: '23', z: '310–314 / 510', o: 'Antenas COM/NAV/GPS/ELT na parte ventral, no capô e no cone de cauda.' },
    extintor:        { n: 'Extintor de incêndio dos motores', ata: '26', z: '410', o: 'Garrafa(s) no compartimento traseiro de aviônicos (400B); linhas de descarga até a zona 710.', v: [-.6, .4, -1] },
    combustivel:     { n: 'Células de combustível', ata: '28', z: '311', o: 'Células sob o piso da cabine; placas de sump por 300G/300H; fiação por 300AL/BL.', v: [.2, -.5, 1] },
    hidraulico:      { n: 'Sistema hidráulico e servo-atuadores', ata: '29', z: '610', o: 'Módulos hidráulicos e manifolds no deck dianteiro da transmissão (600B/600D); servos do rotor principal (600CL/CR).', v: [.8, .7, 1] },
    pas_rp:          { n: 'Pás do rotor principal', ata: '62', z: '611', o: 'Quatro pás: revestimentos, tira de abrasão, tip cap, bolsa de pesos de balanceamento e parafusos das pás.', v: [.5, 1, .8] },
    cubo_rp:         { n: 'Cubo do rotor principal', ata: '62', z: '611', o: 'Yokes superior/inferior, grips, mounts, amortecedores lead-lag, rolamentos CF e shear, cones.', v: [.6, .5, 1] },
    swash:           { n: 'Swashplate e controles rotativos', ata: '62', z: '611', o: 'Swashplate e suporte, rolamento duplex, pitch links, drive links, alavanca do coletivo e luva.', v: [.6, .3, 1] },
    mastro:          { n: 'Mastro do rotor principal', ata: '63', z: '611', o: 'Mastro, porca do mastro e travas; acesso 600EL/ER.', v: [.6, .3, 1] },
    transmissao:     { n: 'Transmissão principal', ata: '63', z: '611', o: 'Caixa principal, filtro e bomba de óleo, detectores de limalha, freio do rotor, roda livre; acesso 600EL/ER/FL/FR.', v: [.3, .6, 1] },
    suporte_trans:   { n: 'Suporte do pilone (pylon beams / LIVE mounts)', ata: '63', z: '611', o: 'Vigas do pilone, LIVE mounts verticais e molas de restrição de pitch; acesso 600FL/FR.', v: [.2, .5, 1] },
    eixo_motor:      { n: 'Eixos motor–transmissão', ata: '63', z: '710', o: 'Dois eixos de acionamento entre os motores e a transmissão; acesso 600FL/FR.', v: [-.1, .7, 1] },
    radiador_oleo:   { n: 'Radiador de óleo e ventiladores (fan shaft)', ata: '63', z: '711', o: 'Compartimento do radiador de óleo: ventiladores no fan shaft, plenum; acesso 700HL/HR e 700EL/ER.', v: [-.6, .7, 1] },
    motor_1:         { n: 'Motor nº 1 (esquerdo) – PW207D1/D2', ata: '71', z: '710', o: 'Compartimento do motor esquerdo; acesso 600EL/FL, 700BL/CL/DL. Manutenção do motor conforme manual P&WC (P/N 3071602).', side: 'L', par: 'motor_2', v: [-.2, .6, -1] },
    motor_2:         { n: 'Motor nº 2 (direito) – PW207D1/D2', ata: '71', z: '710', o: 'Compartimento do motor direito; acesso 600ER/FR, 700BR/CR/DR. Manutenção do motor conforme manual P&WC (P/N 3071602).', side: 'R', par: 'motor_1', v: [-.2, .6, 1] },
    entrada_ar:      { n: 'Entradas de ar / filtros de barreira (IBF)', ata: '71', z: '710', o: 'Entradas de ar dos motores e filtros de barreira com portas de bypass (se instalados).' },
    escapamento:     { n: 'Escapamentos', ata: '78', z: '710–711', o: 'Dutos de escape dos motores sob as carenagens 700GL/GR e 700H.', v: [-.7, .6, 1] },
    eixo_rc:         { n: 'Eixos de acionamento do rotor de cauda', ata: '65', z: '710 / 711 / 510', o: 'Eixo dianteiro e acoplamentos, fan shaft, eixos segmentados, disc packs, hanger e snubbers (500A/500B, 700GL/GR/H).', v: [-.4, .5, 1] },
    caixa_rc:        { n: 'Caixa do rotor de cauda (TRGB)', ata: '65', z: '510', o: 'Caixa de 90° na ponta do cone de cauda; carenagens 500F/500G.', v: [-.5, .3, -1] },
    rotor_cauda:     { n: 'Rotor de cauda', ata: '64', z: '510', o: 'Pás, yokes, rolamentos de batimento e de mudança de passo, pitch links, crosshead e trunnion (500G).', v: [-.4, .25, -1] },
    estabilizador:   { n: 'Estabilizador horizontal e aletas auxiliares', ata: '55', z: '511–512', o: 'Estabilizadores LH/RH, slats, tubo-longarina e aletas auxiliares (500EL/ER, 500D).', v: [-.5, .6, 1] },
    deriva:          { n: 'Deriva (vertical fin) e tail skid', ata: '55', z: '513', o: 'Deriva, fitting de fixação da caixa do rotor de cauda e sapata de cauda.', v: [-.6, .3, 1] },
    esquis:          { n: 'Esquis (skid tubes)', ata: '32', z: '316', o: 'Tubos de esqui LH/RH, sapatas e degraus.', v: [.5, -.2, 1] },
    tubo_diant:      { n: 'Tubo transversal dianteiro', ata: '32', z: '317', o: 'Crosstube dianteiro e braçadeiras de fixação (200CL/CC/CR).', v: [.8, -.2, 1] },
    tubo_tras:       { n: 'Tubo transversal traseiro', ata: '32', z: '318', o: 'Crosstube traseiro, pivô traseiro e braçadeira.', v: [-.5, -.2, 1] }
  };

  // ---------- Zonas (BHT-429-MM Cap. 6, conforme citadas no MPI) ----------
  const ZONAS = {
    100: 'Nariz', 110: 'Compartimento inferior do nariz', 111: 'Compartimento superior do nariz', 112: 'Nose cap / radome',
    200: 'Cockpit e cabine', 210: 'Cockpit – lado esquerdo', 211: 'Cockpit – lado direito', 212: 'Pedestal / painel', 213: 'Cabine – lado esquerdo', 214: 'Cabine – lado direito', 215: 'Teto da cabine', 216: 'Bagageiro',
    300: 'Sob o piso', 310: 'Sob o piso da cabine – esquerda', 311: 'Sob o piso da cabine – centro (células de combustível)', 312: 'Sob o piso da cabine – direita', 313: 'Sob o piso do cockpit – esquerda', 314: 'Sob o piso do cockpit – centro', 315: 'Sob o piso do cockpit – direita',
    316: 'Esquis', 317: 'Tubo transversal dianteiro', 318: 'Tubo transversal traseiro', 319: 'Sponson esquerdo (trem com rodas)', 320: 'Sponson direito (trem com rodas)',
    400: 'Fuselagem traseira', 410: 'Compartimento traseiro de aviônicos', 411: 'Compartimento traseiro de controles', 412: 'Fuselagem traseira', 413: 'Fuselagem traseira',
    500: 'Cauda', 510: 'Cone de cauda / caixa do rotor de cauda', 511: 'Estabilizador esquerdo', 512: 'Estabilizador direito', 513: 'Deriva',
    610: 'Deck dianteiro da transmissão (hidráulico)', 611: 'Transmissão / rotor principal', 710: 'Compartimento dos motores', 711: 'Compartimento do radiador de óleo'
  };
  // Zona -> componentes do modelo (usado quando a tarefa não aponta um componente específico)
  const ZC = {
    100: ['nariz'], 110: ['nariz'], 111: ['nariz', 'avionica', 'bateria'], 112: ['nariz'],
    200: ['piso'], 210: ['porta_trip_L', 'assentos_trip'], 211: ['porta_trip_R', 'assentos_trip'], 212: ['painel'], 213: ['porta_pax_L', 'assentos_pax'], 214: ['porta_pax_R', 'assentos_pax'], 215: ['fuselagem'], 216: ['porta_bag'],
    300: ['fuselagem'], 310: ['fuselagem'], 311: ['combustivel'], 312: ['fuselagem'], 313: ['fuselagem', 'comandos'], 314: ['fuselagem', 'comandos'], 315: ['fuselagem', 'comandos'],
    316: ['esquis'], 317: ['tubo_diant'], 318: ['tubo_tras'], 319: [], 320: [],
    400: ['fus_traseira'], 410: ['fus_traseira', 'avionica_tras', 'extintor'], 411: ['fus_traseira', 'comandos_rc'], 412: ['fus_traseira'], 413: ['fus_traseira'],
    500: ['cone_cauda'], 510: ['cone_cauda'], 511: ['estabilizador'], 512: ['estabilizador'], 513: ['deriva'],
    610: ['carenagem_diant', 'hidraulico'], 611: ['carenagem_trans', 'transmissao'], 710: ['carenagem_motor', 'motor_1', 'motor_2'], 711: ['carenagem_escape', 'radiador_oleo']
  };

  // ---------- Vocabulário para "descrever a manutenção" ----------
  // [frases separadas por |, [componentes], genérico?]  (genérico = só refina / usado quando nada mais específico aparece)
  const TREM = ['esquis', 'tubo_diant', 'tubo_tras'], MOT = ['motor_1', 'motor_2'], RP = ['pas_rp', 'cubo_rp', 'swash'];
  const PORTAS = ['porta_trip_L', 'porta_trip_R', 'porta_pax_L', 'porta_pax_R', 'porta_bag'];
  const KW = [
    ['rotor principal|main rotor|ata 62|rotor', RP],
    ['pá do rotor principal|pás do rotor principal|main rotor blade', ['pas_rp']],
    ['cubo do rotor principal|cabeça do rotor|cubo|yoke do rotor principal|grip|amortecedor lead lag|lead lag|damper|rolamento cf|shear bearing|elastomérico', ['cubo_rp']],
    ['swashplate|prato cíclico|prato oscilante|haste de comando|pitch link|haste de passo|rolamento duplex|drive link|alavanca do coletivo', ['swash']],
    ['mastro|porca do mastro|mast', ['mastro']],
    ['pá|pás|blade', ['pas_rp', 'rotor_cauda'], 1],
    ['tracking|balanceamento|track and balance|vibração', ['pas_rp', 'cubo_rp', 'rotor_cauda'], 1],
    ['transmissão|transmissão principal|caixa de transmissão principal|caixa principal|mgb|main gearbox|ata 63|freio do rotor|rotor brake|roda livre|freewheel', ['transmissao']],
    ['pylon|pilone|viga do pilone|live mount|mola de restrição', ['suporte_trans']],
    ['eixo motor transmissão|eixo do motor|engine to transmission', ['eixo_motor']],
    ['radiador de óleo|oil cooler|ventilador|blower|fan shaft|trocador de óleo', ['radiador_oleo']],
    ['hidráulico|sistema hidráulico|servo|servo atuador|atuador|reservatório hidráulico|bomba hidráulica|fluido hidráulico|módulo hidráulico|ata 29', ['hidraulico']],
    ['motor|motores|turbina|engine|pw 207|pratt|ata 71|ata 72|ata 73|compressor|lavagem de compressor|boroscopia|ignição|ignitor|bico injetor|injetor|fadec|eec', MOT],
    ['motor 1|motor um', ['motor_1']], ['motor 2|motor dois', ['motor_2']],
    ['capô do motor|capota do motor|carenagem do motor|cowling|parede de fogo|firewall|engine deck', ['carenagem_motor']],
    ['capô da transmissão|carenagem da transmissão', ['carenagem_trans']],
    ['carenagem dianteira|forward fairing|forward cowl', ['carenagem_diant']],
    ['carenagem|capô|capota', ['carenagem_diant', 'carenagem_trans', 'carenagem_motor', 'carenagem_escape'], 1],
    ['escapamento|escape|exaustão|duto de escape|exhaust|ata 78', ['escapamento']],
    ['entrada de ar|tomada de ar|admissão|inlet|filtro de ar|filtro de barreira|ibf|barrier filter', ['entrada_ar']],
    ['gerador|starter|starter generator|arranque|motor de partida|partida|escova do gerador', ['gerador']],
    ['bateria|battery|ata 24', ['bateria']],
    ['sistema elétrico|barramento|diodo|contator|relé', ['avionica', 'bateria']],
    ['aviônica|aviônicos|rádio|transponder|gps|adc|ata 34|ata 23', ['avionica']],
    ['elt|grcu|ulb|localizador de emergência', ['avionica_tras']],
    ['painel|painel de instrumentos|instrumento|display|tela|pfd|mfd|bússola|altímetro|pedestal|ata 31|cockpit', ['painel']],
    ['comando de voo|comandos de voo|cíclico|coletivo|pedal|pedais|manche|bellcrank|mixer|jackshaft|ata 67|flight control', ['comandos']],
    ['controle direcional|comando direcional|tubo de controle direcional|atuador direcional|afcs', ['comandos_rc']],
    ['assento|assentos|banco|cinto|cinto de segurança|ata 25', ['assentos_trip', 'assentos_pax']],
    ['assento do piloto|assento do copiloto|assento da tripulação|banco do piloto', ['assentos_trip']],
    ['assento de passageiro|assento do passageiro|banco de passageiro|poltrona', ['assentos_pax']],
    ['para brisa|parabrisa|windshield|chin bubble|janela inferior', ['parabrisa']],
    ['janela|janelas|vidro|transparência|ata 56', ['janelas', 'parabrisa']],
    ['porta|portas|ata 52|maçaneta|dobradiça|trinco|trava da porta', PORTAS],
    ['porta do piloto', ['porta_trip_R']], ['porta do copiloto', ['porta_trip_L']],
    ['porta da tripulação|porta dianteira', ['porta_trip_L', 'porta_trip_R']],
    ['porta de passageiro|porta do passageiro|porta da cabine|porta lateral|porta corrediça', ['porta_pax_L', 'porta_pax_R']],
    ['porta traseira|clamshell|porta do bagageiro|bagageiro|compartimento de bagagem|bagagem|porta de carga', ['porta_bag']],
    ['piso|assoalho', ['piso']],
    ['fuselagem|estrutura|caverna|keel beam|lift frame|ata 53|corrosão', ['fuselagem']],
    ['nariz|radome|nose cap|compartimento do nariz', ['nariz']],
    ['fuselagem traseira|compartimento traseiro', ['fus_traseira']],
    ['cone de cauda|tailboom|tail boom|cauda', ['cone_cauda']],
    ['estabilizador|estabilizador horizontal|slat|aleta auxiliar|ata 55', ['estabilizador']],
    ['deriva|estabilizador vertical|vertical fin|tail skid|sapata de cauda', ['deriva']],
    ['rotor de cauda|rotor traseiro|tail rotor|ata 64|cubo do rotor de cauda|antitorque|crosshead|trunnion', ['rotor_cauda']],
    ['eixo do rotor de cauda|eixo de acionamento|eixo de cauda|driveshaft|drive shaft|eixo segmentado|hanger|mancal|disc pack|acoplamento|snubber|eixo', ['eixo_rc']],
    ['caixa do rotor de cauda|caixa de 90|caixa de cauda|caixa de transmissão do rotor de cauda|trgb|tail rotor gearbox|ata 65', ['caixa_rc']],
    ['caixa|gearbox', ['transmissao', 'caixa_rc'], 1],
    ['óleo|troca de óleo|filtro de óleo|chip detector|detector de limalha|limalha|nível de óleo|lubrificação', ['transmissao', 'caixa_rc', 'motor_1', 'motor_2'], 1],
    ['trem de pouso|trem|landing gear|ata 32', TREM],
    ['esqui|esquis|skid|skid tube|degrau|estribo', ['esquis']],
    ['tubo transversal|crosstube|cross tube', ['tubo_diant', 'tubo_tras']],
    ['tubo transversal dianteiro|crosstube dianteiro', ['tubo_diant']], ['tubo transversal traseiro|crosstube traseiro|pivô traseiro', ['tubo_tras']],
    ['combustível|tanque|célula de combustível|bomba de combustível|querosene|fuel|dreno de combustível|abastecimento|sump|ata 28|válvula de corte', ['combustivel']],
    ['extintor|fogo|incêndio|garrafa extintora|detector de fogo|detecção de fogo|squib|ata 26|fire', ['extintor']],
    ['pitot|tubo de pitot|estática|tomada estática|pitot estático', ['pitot']],
    ['luz|farol|farol de pouso|luz de posição|luz de navegação|anticolisão|strobe|beacon|lâmpada|ata 33|iluminação', ['luzes']],
    ['antena|antenas', ['antenas']]
  ];
  const EXEMPLOS = [
    'Trocar o óleo da caixa do rotor de cauda',
    'Lubrificar o rolamento duplex do swashplate',
    'Teste funcional da bateria e escovas do starter generator',
    'Inspeção do tubo transversal dianteiro e dos esquis',
    'Vazamento no servo hidráulico',
    'Boroscopia do motor 2 e inspeção do escapamento'
  ];

  // ---------- Itens gerais (comuns a todas as inspeções programadas) ----------
  const GERAL = [
    'Revisar o diário de bordo e confirmar a correção de todas as discrepâncias.',
    'Confirmar o cumprimento das Diretrizes de Aeronavegabilidade (AD) e ASB aplicáveis.',
    'Confirmar que peças com vida limite não excedem a vida em serviço (Cap. 04).',
    'Confirmar a execução das tarefas de lubrificação requeridas (429-MM Cap. 12).',
    'Confirmar inspeções diversas e de kits BHT instalados (429-MM Cap. 99).',
    'Registrar o cumprimento desta inspeção no diário de bordo.'
  ];

  // ---------- Inspeções programadas (Cap. 05) ----------
  // grupo: {s: sistema, c: componentes padrão, t: [[nº tarefa IMRR, descrição, acesso, zonas, componentes?]]}
  const G = (num, zonas, alvo) => [num, 'Inspeção visual geral (GVI) – ' + alvo, '—', zonas];
  const INSPECOES = [
    { id: '50h', nome: '50 horas', nota: 'A cada 50 h de operação.', dmc: '05-40-00-01A-281A', g: [
      { s: 'Comandos de voo', c: ['rotor_cauda'], t: [['643007', 'Inspeção detalhada dos pitch links do rotor de cauda.', 'N/A', '510']] },
      { s: 'Rotor principal (Cap. 04, Tabela 2)', c: ['cubo_rp'], t: [['ALS-T2', 'Yoke do rotor principal (429-010-103-101): GVI de trincas nos bordos de ataque e fuga e da fita protetora de poliuretano – limite de inspeção de 50 h.', 'N/A', '611']] }
    ] },
    { id: '200h', nome: '200 horas / 12 meses', nota: 'A cada 200 h ou 12 meses, o que ocorrer primeiro.', dmc: '05-40-00-02A-281A', prep: '500G', g: [
      { s: 'Rotor principal', c: ['swash'], t: [
        ['623001', 'Lubrificar o rolamento duplex do swashplate.', 'N/A', '611'],
        ['623018A', 'Inspeção detalhada do rolamento duplex do swashplate quanto à suavidade de rotação.', 'N/A', '611']] },
      { s: 'Rotor de cauda', c: ['rotor_cauda'], t: [
        ['642010', 'Cheque de torque da porca do mastro do rotor de cauda.', 'N/A', '510'],
        ['643004A', 'Inspeção detalhada do rolamento do trunnion de mudança de passo (suavidade de rotação).', '500G', '510']] }
    ] },
    { id: '400h', nome: '400 horas', nota: 'A cada 400 h de operação.', dmc: '05-40-00-30A-281A', prep: '500A, 500G, 600EL/ER, 600FL/FR, 700EL/ER, 700GL/GR', g: [
      { s: 'Acionamento do rotor de cauda', t: [
        ['651006', 'Lubrificar os rolamentos dos mancais do fan shaft.', '700EL/ER, 700GL/GR', '711', ['radiador_oleo', 'eixo_rc']],
        ['651009', 'Lubrificar o rolamento duplex do hanger.', '500A', '510', ['eixo_rc']],
        ['652001', 'Substituir o óleo lubrificante da caixa do rotor de cauda.', '500G', '510', ['caixa_rc']]] },
      { s: 'Grupo motopropulsor', c: ['entrada_ar'], t: [['716101', 'Lubrificar os filtros de barreira das entradas de ar (IBF).', 'N/A', '710']] },
      { s: 'Sistema de geração', c: ['gerador'], t: [['801001', 'Teste funcional das escovas dos starter-generators nº 1 e nº 2.', '600EL/ER, 600FL/FR', '710']] }
    ] },
    { id: '600h', nome: '600 horas / 12 meses', nota: 'A cada 600 h ou 12 meses, o que ocorrer primeiro.', dmc: '05-40-00-04A-281A', prep: '100A, 100B, 500G, 600FL/FR, 700EL/ER', g: [
      { s: 'Acionamento do rotor de cauda', c: ['eixo_rc'], t: [['651004', 'Lubrificar os acoplamentos dos eixos de acionamento.', '600FL/FR, 700EL/ER', '710']] },
      { s: 'Rotor de cauda', c: ['rotor_cauda'], t: [['643004', 'Lubrificar o rolamento do trunnion de mudança de passo.', '500G', '510']] },
      { s: 'Rotor principal', c: ['swash'], t: [['623002', 'Teste funcional do atrito de inclinação (tilt friction) do swashplate.', 'N/A', '611']] },
      { s: 'Bateria', c: ['bateria'], t: [['243002', 'Teste funcional da bateria.', '100A, 100B', '100']] },
      { s: 'Avisos / freio do rotor', c: ['transmissao'], t: [['636001', 'Teste funcional dos interruptores da pinça do freio do rotor.', '600FL/FR', '611']] },
      { s: 'Iluminação (kit opcional)', c: ['luzes'], t: [['334301/02', 'Holofote SX-5 (se instalado): limpeza do filtro de ar e cheque de torque das embreagens do gimbal.', 'N/A', '—']] }
    ] },
    { id: '800h', nome: '800 horas', nota: 'A cada 800 h de operação.', dmc: '05-40-00-31A-281A', prep: '100EL/ER, 200AL/AR, 200DL/DR, 500A/B/F/G, 600EL/ER/FL/FR, 700BL–700HR', g: [
      { s: 'Rotor principal – cubo', c: ['cubo_rp'], t: [
        ['621001', 'Inspeção detalhada das pás do rotor principal.', 'N/A', '611', ['pas_rp']],
        ['622001', 'Inspeção detalhada das travas da porca do mastro.', 'N/A', '611', ['mastro', 'cubo_rp']],
        ['622007', 'Inspeção detalhada dos batentes inferiores (down stops).', 'N/A', '611'],
        ['622009', 'Inspeção detalhada do conjunto da placa (plate assembly).', 'N/A', '611'],
        ['622010', 'Inspeção detalhada do upper mount.', 'N/A', '611'],
        ['622011', 'Inspeção detalhada do lower mount.', 'N/A', '611'],
        ['622013', 'Inspeção detalhada dos grips (grip horn).', 'N/A', '611'],
        ['622014', 'Inspeção detalhada dos yokes superior e inferior.', 'N/A', '611'],
        ['622015', 'Inspeção detalhada dos amortecedores lead-lag.', 'N/A', '611'],
        ['622016', 'GVI dos batentes superiores.', 'N/A', '611'],
        ['622017', 'Inspeção detalhada do rolamento de força centrífuga (CF).', 'N/A', '611'],
        ['622018', 'Inspeção detalhada do shear bearing.', 'N/A', '611']] },
      { s: 'Rotor principal – swashplate e controles rotativos', c: ['swash'], t: [
        ['623004', 'Inspeção detalhada dos pitch links.', 'N/A', '611'],
        ['623005', 'Inspeção detalhada da alavanca do coletivo.', 'N/A', '611'],
        ['623007', 'Inspeção detalhada dos drive links.', 'N/A', '611'],
        ['623009', 'Inspeção detalhada da luva (sleeve).', 'N/A', '611'],
        ['623013', 'Inspeção detalhada do link do coletivo.', 'N/A', '611'],
        ['623017', 'Inspeção detalhada do swashplate e suporte.', 'N/A', '611'],
        ['623018', 'Inspeção detalhada do rolamento duplex do swashplate.', 'N/A', '611']] },
      { s: 'Acionamento do rotor principal', t: [
        ['631001', 'Substituir o óleo lubrificante da transmissão.', '600EL', '611', ['transmissao']],
        ['631004', 'GVI da transmissão.', '600EL/ER, 600FL/FR', '611', ['transmissao']],
        ['632001', 'Inspeção detalhada dos eixos motor–transmissão.', '600FL/FR', '710', ['eixo_motor']],
        ['633002', 'Inspeção detalhada do mastro.', '600EL/ER', '611', ['mastro']],
        ['634001', 'Inspeção detalhada dos ventiladores do radiador de óleo.', '700HL/HR', '711', ['radiador_oleo']],
        ['634003', 'Substituir o elemento do filtro de óleo.', '600EL, 600FL', '611', ['transmissao']],
        ['634006', 'GVI do radiador de óleo e do plenum.', '700HL/HR', '711', ['radiador_oleo']],
        ['635001', 'Inspeção detalhada das vigas do pilone (pylon beams).', '600FL/FR', '611', ['suporte_trans']],
        ['636002', 'Cheque operacional do sistema de freio do rotor.', 'N/A', '611, 710', ['transmissao']]] },
      { s: 'Rotor de cauda', c: ['rotor_cauda'], t: [
        ['641001', 'Inspeção detalhada das pás do rotor de cauda.', 'N/A', '510'],
        ['642001', 'Inspeção detalhada da porca do mastro.', 'N/A', '510'],
        ['642003', 'Inspeção detalhada dos parafusos das pás.', 'N/A', '510'],
        ['642004', 'Inspeção detalhada dos yokes.', 'N/A', '510'],
        ['642006', 'Inspeção detalhada dos rolamentos de mudança de passo (feathering).', 'N/A', '510'],
        ['642009', 'Inspeção detalhada dos rolamentos de batimento (flapping).', 'N/A', '—'],
        ['643008', 'Inspeção detalhada dos pitch horns.', 'N/A', '510']] },
      { s: 'Acionamento do rotor de cauda', c: ['eixo_rc'], t: [
        ['651001', 'Inspeção detalhada dos eixos segmentados.', '500A, 700GL/GR, 700H', '510'],
        ['651002', 'Inspeção detalhada do suporte do fan shaft.', '700EL/ER', '711', ['radiador_oleo', 'eixo_rc']],
        ['651003', 'Inspeção detalhada dos disc packs dos acoplamentos.', '500A/B/G, 700GL/GR', '510, 711'],
        ['651007', 'Inspeção detalhada do fan shaft.', '700EL/ER, 700GL/GR', '510, 711', ['radiador_oleo', 'eixo_rc']],
        ['651008', 'Inspeção detalhada dos snubbers.', '500B, 700H', '510'],
        ['651010', 'Inspeção detalhada do hanger.', '500A', '510'],
        ['651011', 'Inspeção detalhada dos mancais do fan shaft.', '700EL/ER, 700GL/GR', '711', ['radiador_oleo', 'eixo_rc']],
        ['652002', 'GVI da caixa do rotor de cauda.', '500F, 500G', '510', ['caixa_rc']]] },
      { s: 'Controle direcional', c: ['rotor_cauda', 'comandos_rc'], t: [
        ['643001', 'Inspeção detalhada do tubo de controle de mudança de passo.', 'N/A', '510'],
        ['643002', 'Inspeção detalhada da alavanca de entrada.', '500G', '510'],
        ['643003', 'Inspeção detalhada do crosshead.', 'N/A', '510'],
        ['643005', 'Inspeção detalhada do trunnion.', '500G', '510'],
        ['643006', 'Inspeção detalhada do idler link.', '500G', '510'],
        ['643009', 'Inspeção detalhada da haste de entrada.', 'N/A', '510']] },
      { s: 'Paredes de fogo e drenos', c: ['carenagem_motor', 'motor_1', 'motor_2'], t: [
        ['713001', 'Inspeção detalhada da parede de fogo dianteira.', '600EL/ER, 600FL/FR', '710'],
        ['713002', 'Inspeção detalhada dos inlet tees e paredes de fogo das entradas.', '600EL–700DR', '710'],
        ['713003', 'Inspeção detalhada da parede de fogo traseira.', '700CL/CR, 700DL/DR, 700GL/GR', '710'],
        ['713004', 'Inspeção detalhada do túnel e das paredes de fogo centrais.', '600EL–700DR', '710'],
        ['717001', 'Cheque operacional dos drenos do teto.', '600FL/FR, 700BL/BR, 700DL/DR', '710']] },
      { s: 'Sistema elétrico DC', t: [
        ['263001A', 'Teste funcional do sistema elétrico do extintor de incêndio.', 'N/A', '—', ['extintor']],
        ['246001', 'Cheque operacional do diodo do barramento de emergência (2430CR1).', '200AL/AR', '111', ['avionica']],
        ['246004', 'Cheque operacional dos contatores de isolamento do barramento de emergência (2430K5/K6).', '200AL/AR', '111', ['avionica']],
        ['716103', 'Cheque operacional das portas de bypass dos filtros de barreira.', 'N/A', '710', ['entrada_ar']]] },
      { s: 'Portas e janelas (kit de amerissagem)', c: ['parabrisa'], t: [['253001', 'Inspeção detalhada das chin bubbles (somente com Ditching Kit 429-706-048).', '100EL/ER', '110']] }
    ] },
    { id: '800h12m', nome: '800 horas / 12 meses', nota: 'A cada 800 h ou 12 meses, o que ocorrer primeiro.', dmc: '05-40-00-05A-281A', prep: '200DL, 200DR', g: [
      { s: 'Fuselagem', c: ['fuselagem'], t: [['533004-1A', 'Inspeção detalhada especial do forward lift frame.', '200DL, 200DR', '213, 214']] }
    ] },
    { id: '800h24m', nome: '800 horas / 24 meses', nota: 'A cada 800 h ou 24 meses, o que ocorrer primeiro.', dmc: '05-40-00-06A-281A', g: [
      { s: 'Rotor principal', c: ['pas_rp', 'cubo_rp'], t: [['622012', 'Inspeção detalhada dos parafusos das pás (blade bolts).', 'N/A', '611']] }
    ] },
    { id: '1m', nome: '1 mês', nota: 'A cada 1 mês.', dmc: '05-40-00-28A-281A', g: [
      { s: 'Proteção contra fogo (cabine)', c: ['piso'], t: [
        ['262201', 'Cheque funcional (pesagem) do extintor portátil, se instalado.', 'N/A', '—'],
        ['262203', 'Inspeção detalhada da garrafa e do suporte do extintor portátil, se instalado.', 'N/A', '200']] }
    ] },
    { id: '12m', nome: '12 meses', nota: 'A cada 12 meses.', dmc: '05-40-00-08A-281A', prep: '100EL/ER, 100F, 100G, 200AL/AR, 400B, 600CL–600FR, 700AL–700H', g: [
      { s: 'Aviônica', t: [['256001', 'Cheque operacional do sistema ELT.', '200AL/AR', '211', ['avionica_tras', 'painel']]] },
      { s: 'Proteção contra fogo', t: [['262003', 'Inspeção detalhada das linhas de descarga do extintor.', '600FL/FR, 700DL/DR', '710', ['extintor', 'motor_1', 'motor_2']]] },
      { s: 'Instrumentos', c: ['painel'], t: [['312002', 'GVI da bússola standby.', '200AL/AR', '212']] },
      { s: 'Fuselagem e drenos', t: [
        ['534002-5', 'Inspeção detalhada do selante nos doublers das vigas do teto, STA 168–213 (S/N 57002–57038, 57046 e 57051).', '600CL/CR, 600FL/FR', '610, 611', ['carenagem_diant', 'carenagem_trans']],
        ['535007-2', 'GVI do tail skid.', 'N/A', '513', ['deriva']],
        ['536001', 'Verificar drenos desobstruídos: suporte da caixa do rotor de cauda, cone de cauda, painéis laterais e ventrais.', 'N/A', '310–315, 510', ['fuselagem', 'cone_cauda']]] },
      { s: 'Capôs e carenagens', c: ['carenagem_trans', 'carenagem_motor', 'carenagem_escape'], t: [['711001', 'GVI dos capôs da transmissão, entradas de ar, capôs e portas dos motores e carenagens de escapamento.', '600EL–700H', '611, 710, 711']] },
      { s: 'Inspeções zonais', t: [
        ['100-01E-01/02', 'Limpar chicotes do compartimento inferior do nariz (LH e RH): contaminantes, poeira e fiapos.', '100EL/ER, 100F, 100G', '110'],
        ['400-02E-01', 'Restauração: limpeza de fluido hidráulico.', 'N/A', '400'],
        G('700-01', '710', 'compartimento dos motores'),
        ['700-01E-05', 'GVI dos chicotes elétricos do compartimento do motor nº 1.', '600EL/FL, 700BL/CL/DL', '710', ['motor_1']],
        ['700-01E-06', 'GVI dos chicotes elétricos do compartimento do motor nº 2.', '600ER/FR, 700BR/CR/DR', '710', ['motor_2']]] }
    ] },
    { id: '2a', nome: '2 anos', nota: 'A cada 2 anos.', dmc: '05-40-00-09A-281A', prep: '100G, 200AL–200DR, 400B/C, 500C/D/F, 600B–600FR, 700BL–700HR', g: [
      { s: 'Pitot-estático', t: [
        ['341001', 'Teste funcional do air data computer.', 'N/A', '—', ['avionica']],
        ['341002', 'GVI das quatro tomadas estáticas.', 'N/A', '200', ['pitot']],
        ['341003', 'Teste funcional do altímetro standby.', 'N/A', '—', ['painel']],
        ['341004', 'GVI dos tubos de pitot do piloto e copiloto.', 'N/A', '100', ['pitot']]] },
      { s: 'Iluminação', t: [
        ['334004', 'Inspeção detalhada das luzes de posição da deriva e do estabilizador.', 'N/A', '511, 512, 513', ['luzes']],
        ['334101', 'Inspeção detalhada da luz de posição/strobe (se instalada).', 'N/A', '—', ['luzes']],
        ['335001', 'Cheque operacional da iluminação de emergência dos instrumentos.', '200AL/AR', '212', ['painel']]] },
      { s: 'Portas', t: [
        ['521001', 'Inspeção detalhada das dobradiças das portas da tripulação e dos passageiros.', '200AL/AR, 200DL/DR', '210, 211, 213, 214', ['porta_trip_L', 'porta_trip_R', 'porta_pax_L', 'porta_pax_R']],
        ['521002', 'Inspeção detalhada do mecanismo de trava das portas da tripulação e dos passageiros.', '200AL/AR, 200DL/DR', '210, 211, 213, 214', ['porta_trip_L', 'porta_trip_R', 'porta_pax_L', 'porta_pax_R']],
        ['528001/02', 'Inspeção detalhada das dobradiças e travas da porta de carga traseira (se instalada).', 'N/A', '—', ['porta_bag']]] },
      { s: 'Fuselagem', c: ['carenagem_motor'], t: [['534002-4', 'Inspeção detalhada do engine deck.', '600FL/FR, 700BL–700DR', '710']] },
      { s: 'Acionamento do rotor principal', t: [
        ['633001-1', 'Inspeção detalhada das roscas da porca do mastro, sede do cone e estrias do cubo.', '600EL/ER', '611', ['mastro']],
        ['633002-1', 'GVI do diâmetro interno do mastro (corrosão e primer).', '600EL/ER', '611', ['mastro']],
        ['635002', 'GVI dos LIVE mounts verticais.', '600FL/FR', '611', ['suporte_trans']],
        ['635003', 'GVI das molas de restrição de pitch.', '600FL/FR', '611', ['suporte_trans']]] },
      { s: 'Comandos de voo', c: ['comandos'], t: [
        ['671002/03', 'Inspeção detalhada dos tubos e bellcranks do cíclico longitudinal.', '200AR, 200CR', '211, 314'],
        ['671004/05', 'Inspeção detalhada dos tubos e bellcranks do cíclico lateral.', '200AR, 200CR', '211, 314'],
        ['671007/08', 'Inspeção detalhada dos tubos e bellcranks do coletivo.', '200AR, 200CL/CC/CR, 600CL/CR', '211, 314, 610'],
        ['671009', 'Inspeção detalhada do mixer.', '200BR, 200CR', '315'],
        ['671010/11', 'Inspeção detalhada do link e do jackshaft do coletivo.', '200AL/AR, 200BL, 200CL/CC/CR', '313, 314'],
        ['671012/13', 'Inspeção detalhada dos links longitudinais e lateral.', '200AR, 200BR, 200CR', '314, 315'],
        ['671014', 'Inspeção detalhada do suporte de bellcrank montado na transmissão.', '600EL/ER, 600FL/FR', '611', ['comandos', 'transmissao']],
        ['672004/05/06', 'Inspeção detalhada do torque tube direcional, links dos pedais e link do atuador de trim.', '100G, 200AL/AR', '110']] },
      { s: 'Controle direcional', c: ['comandos_rc'], t: [
        ['672002', 'Inspeção detalhada do tubo de controle direcional.', '400C, 500C/D/F', '411, 510'],
        ['672003', 'Inspeção detalhada do bellcrank direcional.', '500C/D/F', '510'],
        ['672007/08/09', 'Inspeção detalhada dos idlers direcionais (atuador AFCS e atuador hidráulico duplo).', '400B, 400C', '410, 411'],
        ['673001', 'Teste funcional dos servo-atuadores do coletivo, lateral, longitudinal e direcional.', '400C, 600CL/CR', '411, 610', ['hidraulico', 'comandos_rc']]] },
      { s: 'Conectores (proteção L/HIRF)', t: [
        ['2810LA… 2210LA', 'Inspeção detalhada de 9 conectores do compartimento inferior do nariz (4296J2–J13, P39, P44, 6540B1P1): backshell e malha L/HIRF.', 'N/A', '110', ['nariz']],
        ['2310LA / 3400LA', 'Inspeção detalhada de 12 conectores 3450TR1/TR2 e fixação dos cabos coaxiais.', 'N/A', '211', ['painel']],
        ['345001', 'Cheque operacional do transponder ATC.', 'N/A', '—', ['avionica']]] },
      { s: 'Inspeções zonais', t: [
        ['600-01', 'GVI do deck dianteiro da transmissão, módulos hidráulicos e manifolds.', '600B, 600D', '610', ['hidraulico', 'carenagem_diant']],
        ['600-02', 'GVI do teto e das vigas do teto.', '600CL/CR', '611', ['carenagem_trans']],
        ['700-02', 'GVI do compartimento do radiador de óleo, vigas e painéis do teto.', '700HL/HR', '711', ['radiador_oleo', 'carenagem_escape']]] }
    ] },
    { id: '3a', nome: '3 anos', nota: 'A cada 3 anos.', dmc: '05-40-00-10A-281A', prep: '200AL, 200AR, 600EL, 600ER', g: [
      { s: 'Assentos da tripulação', c: ['assentos_trip'], t: [
        ['251001', 'Inspeção detalhada do sistema de retenção (cintos).', '200AL/AR', '210, 211'],
        ['251002', 'Cheque operacional do carretel inercial.', '200AL/AR', '210, 211'],
        ['251003', 'Cheque visual da indicação do atenuador de energia.', '200AL/AR', '210, 211'],
        ['251004', 'Inspeção detalhada da estrutura do assento.', '200AL/AR', '210, 211'],
        ['251005', 'GVI dos trilhos do assento.', '200AL/AR', '210, 211'],
        ['251006/07', 'Cheque operacional do assento e inspeção do mecanismo e travas.', '200AL/AR', '210, 211']] },
      { s: 'Comandos de voo', c: ['comandos'], t: [
        ['671001', 'Inspeção detalhada dos manches cíclicos do piloto e copiloto.', '200AL/AR', '210, 211'],
        ['671006', 'Inspeção detalhada dos manches coletivos do piloto e copiloto.', '200AL/AR', '210, 211'],
        ['672001', 'Inspeção detalhada dos conjuntos de pedais do piloto e copiloto.', '200AL/AR', '110']] },
      { s: 'Combustível', c: ['combustivel'], t: [['283002', 'Cheque operacional das válvulas de corte de combustível.', '200AL/AR, 600EL/ER', '212, 710']] }
    ] },
    { id: '4a', nome: '4 anos', nota: 'A cada 4 anos (inclui a inspeção de 2 anos).', dmc: '05-40-00-11A-281A', prep: '100EL–100G, 200AL–200ER, 500AA–500G, 600CL–600FR', g: [
      { s: 'Assentos dos passageiros', c: ['assentos_pax'], t: [
        ['252001', 'Inspeção detalhada do sistema de retenção.', '200DL/DR, 200EL/ER', '213, 214'],
        ['252002', 'Cheque operacional do carretel inercial.', '200DL/DR, 200EL/ER', '213, 214'],
        ['252003', 'Inspeção detalhada da estrutura do assento.', '200DL/DR, 200EL/ER', '213, 214'],
        ['252004', 'Cheque visual do atenuador de energia.', '200DL/DR, 200EL/ER', '213, 214']] },
      { s: 'Trem de pouso de esquis', c: ['esquis', 'tubo_diant', 'tubo_tras'], t: [['327001-1', 'Inspeção detalhada dos tubos transversais dianteiro e traseiro e dos esquis.', 'N/A', '316']] },
      { s: 'Cone de cauda e empenagem', t: [
        ['535004-1', 'Inspeção detalhada do suporte da caixa do rotor de cauda e do fitting na deriva.', '500G', '513', ['caixa_rc', 'deriva']],
        ['535005-2', 'Inspeção detalhada dos suportes do slat.', 'N/A', '511, 512', ['estabilizador']]] },
      { s: 'Capôs e carenagens', c: ['carenagem_diant'], t: [['531001/02', 'GVI da carenagem dianteira (600A) e dos forward cowls (600CL/CR).', '600CL/CR', '610']] },
      { s: 'Acionamentos', t: [
        ['6310LA-01', 'Inspeção detalhada do jumper nos LIVE mounts da transmissão.', '600FL/FR', '611', ['suporte_trans']],
        ['631001-1', 'Inspeção detalhada da transmissão principal (4 anos ou no overhaul de 5000 h).', '600EL/ER, 600FL/FR', '611', ['transmissao']],
        ['652001-1', 'Inspeção detalhada da caixa do rotor de cauda (4 anos ou no overhaul de 5000 h).', '500G', '—', ['caixa_rc']]] },
      { s: 'Combustível (kit opcional)', c: ['combustivel'], t: [['284001', 'GVI do tanque auxiliar de combustível (se instalado).', 'N/A', '—']] },
      { s: 'Inspeções zonais', t: [
        G('100-02B', '110', 'compartimento inferior do nariz e revestimentos'), G('100-04', '111', 'revestimentos e painéis do compartimento superior do nariz'), G('100-06', '112', 'superfície externa do nose cap / radome'),
        G('200-06', '213', 'interior da cabine LH'), G('200-08', '214', 'interior da cabine RH'),
        G('300-07', '313', 'sob o piso do cockpit LH, sidebody e keel beam'), G('300-09', '315', 'sob o piso do cockpit RH, sidebody e keel beam'),
        G('300-14', '316, 317, 318', 'partes externas dos tubos transversais e esquis'),
        ['500-01', 'GVI interna do cone de cauda, caverna fuselagem–cone, tubo-longarina e fitting.', '500AA, 500AF, 500C–F', '510, 511, 512'],
        G('500-02B', '510', 'estrutura do cone de cauda, fitting da deriva e carenagens da caixa do rotor de cauda'),
        G('500-04', '511', 'superfícies externas do estabilizador LH e aleta auxiliar'), G('500-06', '512', 'superfícies externas do estabilizador RH e aleta auxiliar'), G('500-08', '513', 'superfícies externas da deriva')] }
    ] },
    { id: '5a', nome: '5 anos', nota: 'A cada 5 anos.', dmc: '05-40-00-12A-281A', prep: '200AL/AR, 200DL/DR, 200EL/ER, 200F', g: [
      { s: 'Fuselagem', c: ['piso'], t: [['533006-1', 'GVI dos pisos do cockpit, cabine e bagageiro.', '200AL–200F', '210, 211, 213, 214, 216']] },
      { s: 'Rotor de cauda', c: ['rotor_cauda'], t: [
        ['642001-1', 'Inspeção detalhada das partes visíveis do cubo: porca do mastro, yokes, rolamentos de batimento, parafusos das pás e curvic coupling (corrosão e dano mecânico).', '—', '500'],
        ['643001-1', 'Inspeção detalhada dos controles rotativos: crosshead, drive plate, pitch links, trunnion, idler link e pitch horns.', '—', '500']] },
      { s: 'Inspeções zonais', c: ['nariz', 'comandos'], t: [['100-01E-03/04', 'GVI da fiação sob as articulações dos pedais do piloto e copiloto.', '200AR, 200AL', '110']] }
    ] },
    { id: '6a', nome: '6 anos', nota: 'A cada 6 anos (inclui as inspeções de 2 e 3 anos).', dmc: '05-40-00-13A-281A', prep: '100A–100G, 200AL–200G, 300AL–300KR, 400A/B/C, 500C/D/EL/ER, 600EL–600FR', g: [
      { s: 'Estrutura da fuselagem', t: [
        ['532002-1', 'Inspeção detalhada da prateleira do nariz, pedestal e cavernas dianteira e traseira do nariz.', '100A, 100DL/DR, 200AL/AR', '100, 212', ['nariz']],
        ['532003-1', 'Inspeção detalhada do compartimento da bateria.', '100DL/DR, 200AL/AR', '100', ['bateria', 'nariz']],
        ['533001-1', 'Inspeção detalhada do anti-plough bulkhead, caverna dianteira da cabine, forward lift frame e keel beams.', '200BL, 200BR', '313, 315', ['fuselagem']],
        ['533002-1', 'Inspeção detalhada dos compartimentos dos painéis laterais e faces externas das keel beams.', '300AL–300CR', '300', ['fuselagem']],
        ['533003-1', 'Inspeção detalhada das faces internas das keel beams.', '300D–300H', '311', ['fuselagem', 'combustivel']],
        ['534001-1', 'Inspeção detalhada da caverna fuselagem traseira–cone de cauda, emendas e painéis.', '400B, 400C', '410, 411', ['fus_traseira']],
        ['535003-1', 'Inspeção detalhada da caverna de união com o cone de cauda.', '400C, 500C', '510', ['fus_traseira', 'cone_cauda']],
        ['535003-2', 'Inspeção detalhada do tubo-longarina do estabilizador horizontal e fitting.', '500D, 500EL/ER', '511, 512', ['estabilizador']],
        ['535006-1', 'Inspeção detalhada especial do revestimento interno, cavernas, nervuras e fittings dos estabilizadores.', '500EL/ER', '511, 512', ['estabilizador']],
        ['313009', 'Descartar a bateria do Underwater Locator Beacon (ULB).', 'N/A', '—', ['avionica_tras']]] },
      { s: 'Rotor principal', t: [
        ['622001-1', 'Inspeção detalhada dos grip horns, upper/lower mount, amortecedores lead-lag, rolamentos CF e shear bearings.', '600EL/ER, 600FL/FR', '611', ['cubo_rp']],
        ['622001-2', 'Inspeção detalhada dos yokes.', '—', '611', ['cubo_rp']],
        ['623001-1', 'Inspeção detalhada dos anéis do swashplate, alavanca do coletivo, tilt ball, luva e pitch links (corrosão e dano mecânico).', '600EL/ER, 600FL/FR', '611', ['swash']]] },
      { s: 'Inspeções zonais', t: [
        G('100-01', '110', 'interior do compartimento inferior do nariz'), G('100-03', '111', 'interior do compartimento superior do nariz'),
        G('200-01', '210', 'interior do cockpit LH: comandos, piso, lift frame e trilhos'), G('200-03', '211', 'interior do cockpit RH: comandos, piso, lift frame e trilho'),
        G('200-07', '213', 'exterior da cabine LH: painéis laterais e portas'), G('200-09', '214', 'exterior da cabine RH: painéis laterais e portas'),
        G('200-10', '215', 'painel do teto da cabine e lift frames superiores'), G('200-11', '216', 'interior do bagageiro'),
        G('300-01', '310', 'sob o piso da cabine LH: keel beam e cavernas dos tubos transversais'),
        ['300-01E-01', 'GVI da fiação na área dos componentes e linhas de combustível.', '300AL, 300BL', '310', ['combustivel']],
        G('300-03', '311', 'sob o piso da cabine – centro: keel beams e cavernas'), G('300-05', '312', 'sob o piso da cabine RH'),
        G('400-01', '410', 'compartimento traseiro de aviônicos'), G('400-02', '411', 'compartimento traseiro de controles'),
        G('500-2A', '510, 513', 'exterior do cone de cauda, fitting da deriva e carenagens da caixa do rotor de cauda'),
        G('500-03', '511', 'interior do estabilizador LH'), G('500-05', '512', 'interior do estabilizador RH'), G('500-07', '513', 'interior da deriva')] }
    ] },
    { id: '8a', nome: '8 anos', nota: 'A cada 8 anos (inclui as inspeções de 2 e 4 anos).', dmc: '05-40-00-14A-281A', prep: '200BC/BL/BR, 200CC, 200DL, 200EL, 200F, 500F, 500G', g: [
      { s: 'Acionamento do rotor de cauda', c: ['caixa_rc'], t: [['6520LA-01', 'Inspeção detalhada da cinta de bonding da caixa do rotor de cauda.', '500G, 500F', '510']] },
      { s: 'Inspeções zonais', t: [
        ['200-11E-01', 'GVI da fiação na área dos componentes e linhas de combustível.', '200F', '216', ['porta_bag', 'combustivel']],
        G('200-05', '212', 'área do pedestal central'), G('300-04', '311', 'exterior ventral central da cabine (belly panels)'),
        G('300-11', '314', 'sob o piso do cockpit – centro, keel beams'),
        ['300-13', 'GVI das partes do tubo transversal dianteiro dentro da célula e dos tubos traseiros.', '200BL/BC/BR', '317, 318', ['tubo_diant', 'tubo_tras']]] }
    ] },
    { id: '10a', nome: '10 anos', nota: 'A cada 10 anos (inclui as inspeções de 2 e 5 anos).', dmc: '05-40-00-15A-281A', prep: '100A, 200F, 400B, 600A', g: [
      { s: 'Proteção contra fogo', c: ['extintor'], t: [
        ['262002', 'Teste hidrostático da garrafa principal do extintor.', '400B', '410'],
        ['262004', 'Descartar o squib pirotécnico da garrafa principal (conforme fabricante).', '400B', '410'],
        ['262005', 'Inspeção detalhada das linhas de descarga no compartimento traseiro de aviônicos.', '400B', '410'],
        ['262102/04', 'Garrafa reserva (se instalada): teste hidrostático e descarte do squib.', '400B', '410'],
        ['263001', 'Teste funcional do sistema elétrico do extintor.', '400B', '410']] },
      { s: 'Combustível', c: ['combustivel'], t: [['281006', 'Cheque operacional da válvula roll-over.', '200F, 600A', '412, 610']] },
      { s: 'Inspeções zonais', c: ['nariz', 'bateria'], t: [['100-05', 'GVI do interior do nose cap/radome e da porta de acesso da bateria.', '100A', '112']] }
    ] },
    { id: '12a', nome: '12 anos', nota: 'A cada 12 anos.', dmc: '05-40-00-15A-281C', g: [
      { s: 'Proteção contra fogo (cabine)', c: ['piso'], t: [['262202', 'Descartar o extintor portátil (se instalado).', 'N/A', '200']] }
    ] },
    { id: '400fc', nome: '400 ciclos de voo', nota: 'A cada 400 ciclos de voo.', dmc: '05-40-00-32A-281A', prep: '200CL, 200CC, 200CR', g: [
      { s: 'Trem de pouso', t: [
        ['327001', 'GVI do tubo transversal dianteiro.', '200CL/CC/CR', '317'],
        ['327005', 'GVI das braçadeiras de fixação do tubo transversal dianteiro.', '200CL/CC/CR', '317'],
        ['327002', 'GVI do tubo transversal traseiro.', 'N/A', '318'],
        ['327006', 'GVI do pivô traseiro.', 'N/A', '318'],
        ['327007', 'GVI da braçadeira do tubo transversal traseiro.', 'N/A', '318'],
        ['327010', 'Cheque funcional das buchas do pivô traseiro.', 'N/A', '—', ['tubo_tras']],
        ['327004', 'GVI dos tubos de esqui.', 'N/A', '316']] }
    ] },
    { id: '5000rin', nome: '5000 RIN', nota: 'A cada 5000 RIN.', dmc: '05-40-00-21A-281A', g: [
      { s: 'Trem de pouso de esquis', c: ['tubo_diant', 'tubo_tras'], t: [['327008', 'Cheque de deflexão dos tubos transversais do trem de pouso.', 'N/A', '318']] }
    ] },
    { id: '5000h', nome: '5000 horas (célula)', nota: 'A cada 5000 h; também sempre que o componente for removido (inspeção de oportunidade).', dmc: '05-40-00-16A-281A', prep: '600EL/ER, 600FL/FR, 700GR', g: [
      { s: 'Rotor principal', c: ['cubo_rp'], t: [['622002', 'Inspeção detalhada dos cones inferior e superior do cubo.', 'N/A', '611']] },
      { s: 'Rotor de cauda', c: ['rotor_cauda'], t: [['642002', 'Inspeção detalhada do cone set.', 'N/A', '510']] },
      { s: 'Acionamento do rotor de cauda', c: ['eixo_rc'], t: [['651005', 'Inspeção detalhada do eixo de acionamento dianteiro (forward driveshaft).', '600EL/ER, 600FL/FR, 700GR', '710']] }
    ] },
    { id: 'comp', nome: 'Componentes – 1000 h e 5000 h (overhaul)', nota: 'Restauração por tempo de operação do componente.', dmc: '05-40-00-29A / -23A-281A', prep: '500G, 600EL/ER, 600FL/FR', g: [
      { s: '1000 h', c: ['gerador'], t: [['243003', 'Restauração (overhaul) do starter-generator (206-062-200-141).', '600EL/ER', '710']] },
      { s: '5000 h – rotor principal', t: [
        ['622003/04', 'Overhaul do upper mount e do lower mount.', 'N/A', '611', ['cubo_rp']],
        ['622005/06', 'Overhaul dos grips e dos yokes superior e inferior.', 'N/A', '611', ['cubo_rp']],
        ['622008', 'Overhaul dos cones superior e inferior.', 'N/A', '611', ['cubo_rp']],
        ['623003', 'Overhaul do swashplate e suporte (alavanca do coletivo, drive link, luva, tilt ball, rolamento duplex).', 'N/A', '611', ['swash']]] },
      { s: '5000 h – acionamentos', t: [
        ['631002', 'Overhaul da transmissão (acionamento de acessórios, roda livre, válvula reguladora e bomba de óleo).', '600CL/CR', '611', ['transmissao']],
        ['632002', 'Overhaul dos eixos motor–transmissão (5000 h e depois a cada 2500 h).', '600EL/ER, 600FL/FR', '611, 710', ['eixo_motor']],
        ['633003', 'Overhaul do mastro.', '600EL/ER, 600FL/FR', '611', ['mastro']],
        ['642005/07', 'Overhaul dos yokes, cone e cone set do rotor de cauda.', 'N/A', '510', ['rotor_cauda']],
        ['652003', 'Overhaul da caixa do rotor de cauda.', '500F, 500G', '510', ['caixa_rc']]] }
    ] },
    { id: 'longo', nome: '6000 h · 8000 h · 10.000 h · 15.000 h/15 anos', nota: 'Inspeções de longo intervalo.', dmc: '05-40-00-17A…20A-281A', g: [
      { s: '6000 h (ou 15 limpezas do filtro)', c: ['entrada_ar'], t: [['716102', 'Substituir os elementos superior e inferior de cada filtro de barreira (se instalado).', 'N/A', '710']] },
      { s: '8000 h – sistema DC', t: [
        ['246003/02', 'Cheque operacional dos diodos dos barramentos não essencial e de emergência.', '200AL/AR, 200F', '216, 111', ['avionica']],
        ['246005', 'Descartar o relé de desabilitação de interconexão de barramentos (2430K7).', '100DL', '111', ['avionica']],
        ['243001', 'Teste funcional das GRCUs (2430VR1/VR2).', '400B', '410', ['avionica_tras']]] },
      { s: '10.000 h', c: ['combustivel'], t: [['283001', 'Inspeção detalhada da tela de entrada das células mid-forward / mid-aft quanto a obstrução.', '300G, 300H', '311']] },
      { s: '15.000 h / 15 anos', c: ['motor_1', 'motor_2'], t: [['261002', 'Descartar os sensores de detecção de fogo dos motores nº 1 e nº 2.', '600FL', '710']] }
    ] },
    { id: 'torque', nome: 'Especiais – cheques de torque/atrito', nota: 'Após instalação do componente, repetir no intervalo indicado até estabilizar o torque.', dmc: '05-50-00-00A-283A', g: [
      { s: 'Após instalação', t: [
        ['MM 53', 'Torque da fixação do cone de cauda à fuselagem traseira: 1–5 h após instalação e a cada 400 h.', '—', '510', ['cone_cauda', 'fus_traseira']],
        ['MM 62', 'Torque da porca do mastro do rotor principal: inicial 1–3 h, depois 1–5 h.', '—', '611', ['mastro', 'cubo_rp']],
        ['MM 62', 'Torque dos parafusos passantes e do cone inferior do cubo: inicial 1–3 h, depois 1–5 h.', '—', '611', ['cubo_rp']],
        ['MM 62', 'Atrito de inclinação do swashplate e suporte: 10–25 h após instalação ou ajuste.', '—', '611', ['swash']],
        ['MM 64', 'Torque da porca do mastro do rotor de cauda: 1–5 h.', '—', '510', ['rotor_cauda']],
        ['MM 65', 'Torque da fixação da caixa do rotor de cauda ao suporte: 10–25 h.', '—', '510', ['caixa_rc']]] }
    ] }
  ];

  // ---------- Cap. 04 – Limites de aeronavegabilidade (Tabela 1) ----------
  const LIMITES = [
    { s: 'Rotor principal', c: ['cubo_rp'], i: [
      ['CF Fitting', '429-010-104-105', '8000 h'], ['Grip Assembly', '429-010-108-101', '2500 h'], ['Grip Assembly', '429-010-108-105', 'Ilimitado'],
      ['Drive Plate Assembly', '429-010-109-101', '10.000 h'], ['Mast Adapter Assembly', '429-010-114-101', '10.000 h'], ['Blade Bolt', '429-010-119-101', '10.000 h', ['pas_rp', 'cubo_rp']],
      ['Centrifugal Force Bearing', '429-310-003-103', '8000 RIN (+1 a cada partida de motor)'], ['Expandable Blade Bolt', '429-310-004-101', '10.000 h', ['pas_rp', 'cubo_rp']]] },
    { s: 'Controles do rotor principal', c: ['swash'], i: [['Idler Link Assembly', '430-010-409-105', '10.000 h']] },
    { s: 'Rotor de cauda', c: ['rotor_cauda'], i: [
      ['Hub Drive Coupling', '429-012-120-101', '15.000 h'], ['Tail Rotor Yoke Assembly', '429-012-151-101', '6000 h'], ['Tail Rotor Blade Assembly', '429-016-101-105', '5200 h'],
      ['Flapping Bearing, Outboard', '429-312-103-111/-113/-117/-119', '15.000 h'], ['Flapping Bearing, Inboard', '429-312-103-109/-115', 'Ilimitado'],
      ['Idler Link Assembly (controles)', '429-012-115-101', '3500 h'], ['Idler Link Assembly (controles)', '429-012-115-105', 'Ilimitado']] },
    { s: 'Sistema de acionamento', c: ['caixa_rc'], i: [['Tail Rotor Output Shaft', '429-042-102-101', '20.000 h']] },
    { s: 'Suporte do pilone', c: ['suporte_trans'], i: [
      ['Rod End Assembly', '427-010-210-105', '5000 h'], ['Pylon Beam Assembly, L/R', '429-010-201-101/-102', '8000 h'], ['Pitch Restraint Spring Assembly', '429-010-204-101', '5000 h'],
      ['Transmission Top Case', '429-040-203-101', '8000 h', ['transmissao']], ['Adapter, L/R', '429-040-225-101/-102', '15.000 h'], ['Pitch Restraint Spring', '429-310-201-105', '5000 h']] },
    { s: 'Trem de pouso de esquis', i: [
      ['Skid Tube Assembly', '429-700-101/-102 · 429-030-586-107', '16.000 RIN', ['esquis']], ['Forward Crosstube Assembly', '429-712-101', '10.000 RIN', ['tubo_diant']], ['Aft Crosstube Assembly', '429-723-108', '30.000 RIN', ['tubo_tras']]] },
    { s: 'Fuselagem', c: ['fuselagem', 'carenagem_trans'], i: [['Roof Beam, L/R', '429-030-301-105 / -302-105', '18.000 h ou 50.000 RIN']] },
    { s: 'Grupo motopropulsor', c: ['motor_1', 'motor_2'], i: [['Motores (2)', 'PW207D1/D2', 'Ver seção de limites do manual P&WC (P/N 3071602)']] },
    { s: 'Proteção contra fogo dos motores', c: ['extintor'], i: [['Primary Cartridge', '30903962-1', '10 anos (da data de fabricação)'], ['Secondary Cartridge', '30903963-1', '10 anos (da data de fabricação)']] }
  ];
  // Fatores RIN por evento (notas da Tabela 1)
  const RIN = [
    { id: 'esquis', n: 'Skid Tube', lim: 16000, f: [1, 81, 117] },
    { id: 'tubo_diant', n: 'Forward Crosstube', lim: 10000, f: [1, 50, 118] },
    { id: 'tubo_tras', n: 'Aft Crosstube', lim: 30000, f: [1, 32, 186] }
  ];

  // ---------- Inspeções condicionais (Cap. 05-50) ----------
  const EVENTOS = [
    { id: 'pouso', n: 'Pouso duro', r: 'Impacto com o solo que causa forte arfagem do rotor principal ou escoamento/trinca da estrutura do pilone ou do trem. Inspeção inicial abaixo; se houver dano além de tubo transversal empenado ou lower mount deformado, seguem as inspeções detalhadas (simetria da fuselagem, acionamentos, comandos, hidráulico e combustível).', a: [
      ['Rotor de cauda', ['rotor_cauda'], 'Examinar cubos e pás; se houver dano, executar a inspeção de parada brusca do rotor de cauda.'],
      ['Fuselagem e cone de cauda', ['fuselagem', 'fus_traseira', 'cone_cauda'], 'Painéis ventrais, união com sidebody, carenagem 400A e revestimento inferior do cone.'],
      ['Assentos', ['assentos_trip', 'assentos_pax'], 'Indicação do atenuador de energia (marca amarela fora do entalhe = substituir o assento).'],
      ['Trem de pouso', ['esquis', 'tubo_diant', 'tubo_tras'], 'Condição e fixação; cheque de deflexão dos tubos transversais; braçadeiras e pivô traseiro.'],
      ['Rotor principal', ['pas_rp', 'cubo_rp'], 'Pás (revestimentos, tira de abrasão, tip cap) e cubo (upper/lower mount: contato duro, escoamento, deformação).'],
      ['Mastro e transmissão', ['mastro', 'transmissao', 'suporte_trans', 'eixo_motor'], 'Mastro: distorção e TIR; LIVE mounts, molas de pitch, detectores de limalha, torque das fixações.'],
      ['Acionamento do rotor de cauda', ['eixo_rc', 'caixa_rc'], 'Eixos, caixa e limalha; remover se houver desalinhamento do cone de cauda.'],
      ['Motores', ['motor_1', 'motor_2'], 'Inspeção de pouso duro do motor (manual P&WC) e linhas do compartimento.'],
      ['Comandos, hidráulico e combustível', ['comandos', 'swash', 'hidraulico', 'combustivel'], 'Controles rotativos, suportes dos servos, vazamentos, sump plates e sondas.']] },
    { id: 'psrp', n: 'Parada brusca – rotor principal', r: 'Desaceleração rápida do sistema de acionamento (travamento da transmissão ou contato das pás com solo, água, vegetação etc.).', a: [
      ['Pás', ['pas_rp'], 'Bolsa de pesos de balanceamento (folga máx. 0,040 in / 1,02 mm), revestimentos, tira de abrasão e tip cap.'],
      ['Cubo e controles rotativos', ['cubo_rp', 'swash'], 'Cubo, pitch links, pitch horns e swashplate; descartar parafusos de controle se houver dano.'],
      ['Mastro e transmissão', ['mastro', 'transmissao'], 'Mastro: TIR e escoamento torcional em oficina aprovada; transmissão para desmontagem e inspeção.'],
      ['Suporte do pilone e teto', ['suporte_trans', 'carenagem_trans'], 'Pylon beams, LIVE mounts, molas de pitch, stop pins e fixações nas vigas do teto.'],
      ['Eixos motor–transmissão', ['eixo_motor'], 'Descartar os eixos motor–transmissão.'],
      ['Acionamento do rotor de cauda', ['eixo_rc'], 'Se houver escoamento torcional, executar a inspeção de parada brusca do rotor de cauda.'],
      ['Motores', ['motor_1', 'motor_2'], 'Fixações dos berços na fuselagem e inspeção de parada brusca do motor.']] },
    { id: 'psrc', n: 'Parada brusca – rotor de cauda', r: 'Travamento do acionamento do rotor de cauda ou contato das pás com um objeto de massa suficiente.', a: [
      ['Eixo dianteiro e acoplamentos', ['eixo_rc'], 'Acoplamentos de graxa/diafragma, fan shaft, eixos segmentados, disc packs (folga máx. 0,015 in entre lâminas).'],
      ['Ventiladores', ['radiador_oleo'], 'Rotores e carcaças dos ventiladores do fan shaft.'],
      ['Caixa do rotor de cauda', ['caixa_rc'], 'Carcaça, prisioneiros, pinos-guia e eixo de saída; enviar para oficina aprovada.'],
      ['Controle direcional', ['comandos_rc', 'rotor_cauda'], 'Mecanismo de mudança de passo; descartar parafusos de controle rotativos.'],
      ['Rotor de cauda', ['rotor_cauda'], 'Se foi impacto de pá: descartar ambos os conjuntos de cubo e pás.'],
      ['Cone de cauda e empenagem', ['cone_cauda', 'estabilizador', 'deriva', 'fus_traseira'], 'Suportes de hanger e snubber, estabilizadores, deriva, prisioneiros da caixa, torque e planicidade em FS 361.']] },
    { id: 'osp', n: 'Sobrevelocidade do rotor principal', r: 'Acima de 104% NR (com potência) ou 107% NR (sem potência). Até 117%: sem inspeção de célula, apenas a do motor. Acima de 118%: inspeções abaixo.', a: [
      ['Pás do rotor principal', ['pas_rp'], 'Buchas dos parafusos das pás e bolsa de pesos de balanceamento.'],
      ['Cubo do rotor principal', ['cubo_rp'], 'Grips deformados e yokes delaminados.'],
      ['Rotor de cauda', ['rotor_cauda'], 'Tip block, buchas dos parafusos e cubos.'],
      ['Acionamentos', ['transmissao', 'caixa_rc', 'eixo_motor', 'eixo_rc', 'radiador_oleo'], 'Detectores de limalha, eixos e rotores dos ventiladores.'],
      ['Motores', ['motor_1', 'motor_2'], 'Inspeção de sobrevelocidade do motor (manual P&WC).']] },
    { id: 'otq', n: 'Sobretorque', r: '101–110%: sem inspeção de célula (verificar limites do motor). 111–120%: inspeções abaixo. Acima de 120%: remover cubo, mastro e transmissão para inspeção detalhada/NDT.', a: [
      ['Rotor principal', ['pas_rp', 'cubo_rp', 'swash'], 'Pás (descolamento), grips, yokes, rolamentos elastoméricos, swashplate e pitch links.'],
      ['Comandos', ['comandos'], 'Tubos do cíclico.'],
      ['Transmissão e pilone', ['transmissao', 'suporte_trans', 'eixo_motor'], 'Limalha, top case, adapters, pylon beams, LIVE mounts e eixos motor–transmissão.'],
      ['Acionamento e rotor de cauda', ['caixa_rc', 'eixo_rc', 'rotor_cauda'], 'Limalha, torque de fixação da caixa, eixos, pás e cubos.'],
      ['Motores', ['motor_1', 'motor_2'], 'Limites de sobretorque e sobretemperatura (manual P&WC).']] },
    { id: 'oei', n: 'OEI e OEI limit override', r: 'Excedência OEI: ações mandatórias do motor, sem inspeção de célula. Uso do limit override: além do motor, remover a transmissão e substituir o pinhão/engrenagem cônica do lado afetado e a bull gear.', a: [
      ['Motores', ['motor_1', 'motor_2'], 'Ações mandatórias da seção de limites do manual do motor.'],
      ['Eixos motor–transmissão', ['eixo_motor'], 'Condição e fixação; descartar se houver dano.'],
      ['Transmissão', ['transmissao'], 'Limit override: remover, enviar para oficina aprovada; verificar limalha após giro de 1 h.'],
      ['Displays', ['painel'], 'Histórico OEI no DU; baixar excedências e limpar a memória.']] },
    { id: 'stall', n: 'Estol ou surge de compressor', r: 'Pode causar carga torcional severa nos eixos principais, marcas nas engrenagens de entrada da transmissão e danos na fixação da caixa do rotor de cauda.', a: [
      ['Motores e entradas de ar', ['motor_1', 'motor_2', 'entrada_ar'], 'Tela FOD / filtro de barreira, pás do compressor centrífugo, turbina de potência.'],
      ['Transmissão e eixos', ['transmissao', 'eixo_motor'], 'Eixos motor–transmissão, limalha e boroscopia das engrenagens do lado do motor afetado.'],
      ['Acionamento do rotor de cauda', ['caixa_rc', 'eixo_rc'], 'Padrão de contato do pinhão, torque de fixação e eixos.'],
      ['Rotores', ['rotor_cauda', 'pas_rp', 'cubo_rp', 'swash'], 'Pás, cubos, parafusos das pás e controles rotativos.'],
      ['Estrutura', ['fuselagem', 'carenagem_trans', 'carenagem_motor', 'cone_cauda'], 'Suportes das pylon beams e dos berços dos motores; cone de cauda.']] },
    { id: 'raio', n: 'Descarga atmosférica (raio)', r: 'Inspeção completa: marcas de queima, descoloração, arco e delaminação. Magnetômetro (±5 gauss): desmagnetizar componentes acima de 1 gauss. Componente com marca de arco: descartar.', a: [
      ['Rotor principal', ['pas_rp', 'cubo_rp', 'swash'], 'Pontas das pás e buchas, cubo, swashplate; rolamentos dos controles acima dos servos.'],
      ['Mastro e transmissão', ['mastro', 'transmissao', 'suporte_trans', 'eixo_motor'], 'Pistas dos rolamentos do mastro; limalha e filtro após 5–10 h.'],
      ['Rotor de cauda e controles', ['rotor_cauda', 'comandos_rc'], 'Pás, cubos, pitch links, crosshead e tubo de mudança de passo.'],
      ['Acionamento do rotor de cauda', ['eixo_rc', 'caixa_rc', 'radiador_oleo'], 'Eixos, rolamentos, rotores dos ventiladores e caixa.'],
      ['Elétrica e aviônica', ['avionica', 'avionica_tras', 'painel', 'antenas', 'pitot', 'bateria'], 'Cheque operacional dos sistemas, bússola, VSWR das antenas.'],
      ['Estrutura externa', ['fuselagem', 'nariz', 'cone_cauda', 'estabilizador', 'deriva', 'esquis'], 'Sinais de arco entre revestimentos e estrutura, empenagem e trem.'],
      ['Motores', ['motor_1', 'motor_2'], 'Inspeção de raio do motor (manual P&WC).']] },
    { id: 'granizo', n: 'Voo através de granizo', r: 'Mossas, rasgos e perfurações em grandes áreas; na maioria dos casos recomenda-se substituir as peças com dano de granizo.', a: [
      ['Revestimentos e capôs', ['nariz', 'fuselagem', 'carenagem_diant', 'carenagem_trans', 'carenagem_motor', 'cone_cauda'], 'Nose cap, portas do nariz, capôs, sidebody e capas do eixo.'],
      ['Empenagem', ['estabilizador', 'deriva'], 'Bordos de ataque e revestimentos superiores.'],
      ['Portas e janelas', ['parabrisa', 'janelas', 'porta_trip_L', 'porta_trip_R'], 'Para-brisa, janelas das portas da tripulação e chin bubbles.'],
      ['Rotores', ['pas_rp', 'cubo_rp', 'rotor_cauda'], 'Tiras de abrasão, tip caps, revestimentos superiores; cubo exposto.'],
      ['Trem, pitot, luzes e antenas', ['esquis', 'pitot', 'luzes', 'antenas'], 'Áreas expostas, tubos de pitot, lentes e antenas.']] },
    { id: 'agua', n: 'Imersão em água', r: 'Recuperável se a até 12 ft (3,6 m) e por menos de 24 h; iniciar o procedimento de recuperação em até 12 h após a retirada da água.', a: [
      ['Estrutura', ['fuselagem', 'cone_cauda', 'fus_traseira'], 'Inspeção estrutural conforme BHT-ALL-SRM Cap. 2.'],
      ['Rotores', ['pas_rp', 'cubo_rp', 'rotor_cauda'], 'Remover pás e cubos; pás para oficina aprovada.'],
      ['Acionamento principal', ['mastro', 'transmissao', 'eixo_motor'], 'Remover, lavar com água doce (se salgada) e óleo C-020; oficina aprovada.'],
      ['Acionamento do rotor de cauda', ['eixo_rc', 'caixa_rc', 'radiador_oleo'], 'Remover todos os componentes; rolamentos lubrificados a graxa são sucateados.'],
      ['Sistemas', ['avionica', 'painel', 'combustivel', 'hidraulico', 'comandos', 'motor_1', 'motor_2'], 'Contaminação em elétrica, aviônica, combustível, hidráulico e comandos; motores conforme P&WC.']] },
    { id: 'manuseio', n: 'Dano de manuseio – pá do rotor de cauda', r: 'Queda ou batida da pá. Delaminações podem existir sem indicação visual: inspecionar vazios por tap test.', a: [
      ['Pás do rotor de cauda', ['rotor_cauda'], 'Trincas, mossas, rasgos, tira de abrasão, bordo de fuga e região posterior da pá.']] }
  ];

  window.B429 = { COMPS, ZONAS, ZC, KW, EXEMPLOS, MPI: { GERAL, INSPECOES, LIMITES, RIN, EVENTOS } };
})();
