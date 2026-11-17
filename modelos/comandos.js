/* Manutenção Interativa – comandos de voo e painel de instrumentos de cada modelo (página comandos.html).
   Arquitetura comum dos helicópteros Bell: cíclico, coletivo e pedais mecânicos ligados por tubos, bellcranks e
   jackshafts aos servos hidráulicos (boosted controls) sob a transmissão e ao swashplate; pedais ligados ao mecanismo
   de passo do rotor de cauda por tubos ou cabos. Geometria ILUSTRATIVA (não é desenho de engenharia).
   "sns" = códigos ATA/S1000D usados para filtrar os procedimentos do índice interno dos manuais Bell. */
(function () {
  // Peças comuns da cadeia de comando (o 3D é montado em comandos.js a partir destes ids)
  const PECAS = {
    // ---- Coletivo ----
    col_stick:     { g: 'coletivo', n: 'Alavanca do coletivo (stick e punho) – piloto', sns: ['67-11-01', '67-11', '67-10'], kw: 'collective stick|collective control stick|twist grip|throttle', f: 'Comanda o passo coletivo das pás (subir/descer). No punho ficam a manete/twist grip ou o interruptor de marcha lenta/voo e botões do motor.' },
    col_friction:  { g: 'coletivo', n: 'Fricção e mola de balanceamento do coletivo', sns: ['67-11-02', '67-11-05', '67-10'], kw: 'collective friction|balance spring|minimum friction', f: 'Ajusta a força para mover o coletivo e evita que ele desça sozinho.' },
    col_jack:      { g: 'coletivo', n: 'Jackshaft do coletivo (sob o piso)', sns: ['67-11-02', '67-11-04', '67-10'], kw: 'collective jackshaft|jackshaft', f: 'Eixo transversal sob o piso que liga os coletivos do piloto e do copiloto e transmite o movimento para trás.' },
    col_tubo1:     { g: 'coletivo', n: 'Tubo de comando do coletivo (jackshaft → bellcrank de inversão)', sns: ['67-11-07', '67-11-06', '67-10'], kw: 'collective control tube|collective pitch control linkage|control tube', f: 'Tubo sob o piso até o bellcrank de inversão na parede traseira da cabine.' },
    col_reversao:  { g: 'coletivo', n: 'Bellcrank de inversão do coletivo e suporte', sns: ['67-11-08', '67-11-09', '67-10'], kw: 'reversing bellcrank|bellcrank', f: 'Muda a direção do movimento: do tubo horizontal sob o piso para o tubo vertical até o deck da transmissão.' },
    col_tubo2:     { g: 'coletivo', n: 'Tubo vertical do coletivo (até a alavanca do coletivo)', sns: ['67-11-10', '67-10'], kw: 'collective control tube|control tube', f: 'Sobe pela parede traseira da cabine até o deck da transmissão.' },
    col_lever:     { g: 'coletivo', n: 'Alavanca do coletivo no deck (collective lever / mixer)', sns: ['67-11-11', '67-11-07', '67-10'], kw: 'collective lever|mixer lever', f: 'Alavanca no deck que leva o comando ao bellcrank de apoio do servo do coletivo.' },
    col_bellcrank: { g: 'coletivo', n: 'Bellcrank de apoio do servo e boosted bellcrank do coletivo', sns: ['67-11-13', '67-11-14', '67-11-15', '67-11-16', '67-11-17', '67-10'], kw: 'boosted bellcrank|boosted link|boosted rod|actuator support bellcrank', f: 'Lado "boosted" (após o servo): bellcrank, link e haste que levam a força do servo ao swashplate. Rolamentos esféricos com inspeção programada.' },
    col_transdutor:{ g: 'coletivo', n: 'Transdutor de posição do coletivo (FADEC)', sns: ['67-11-06', '76-10'], kw: 'collective transducer|collective position', f: 'Nos motores com FADEC: informa à ECU a posição do coletivo (antecipação de demanda de potência). Tem procedimento de regulagem (rigging).', so: ['505', '407', '430'] },
    // ---- Cíclico ----
    cic_stick:     { g: 'ciclico', n: 'Cíclico (stick e punho) – piloto', sns: ['67-12-01', '67-12-03', '67-12', '67-10'], kw: 'cyclic stick|cyclic control stick|grip', f: 'Inclina o disco do rotor (frente/trás e lados). No punho: trim, rádio, gancho de carga e outros botões.' },
    cic_base:      { g: 'ciclico', n: 'Base do cíclico, fricção e molas de balanceamento', sns: ['67-12-02', '67-12-05', '67-12'], kw: 'base fitting|cyclic friction|balance spring|centering', f: 'Articulação do cíclico no piso, fricção ajustável e molas de centragem longitudinal/lateral.' },
    cic_torque:    { g: 'ciclico', n: 'Tubos de torção do cíclico (lateral e principal)', sns: ['67-12-04', '67-12-06', '67-14-03', '67-12'], kw: 'torque tube', f: 'Transformam o movimento lateral do cíclico em rotação e levam o comando para trás sob o piso.' },
    cic_tubo:      { g: 'ciclico', n: 'Tubos de comando do cíclico (até o mixer)', sns: ['67-12-07', '67-12-09', '67-14-04', '67-12'], kw: 'cyclic tube|cyclic control linkage|control tube', f: 'Tubos longitudinal e lateral sob o piso até o mixer na parede traseira.' },
    mixer:         { g: 'ciclico', n: 'Mixer (combinador cíclico/coletivo)', sns: ['67-12-09', '67-11-07', '67-10'], kw: 'mixer', f: 'Combina os comandos de cíclico e coletivo nas três saídas para os servos (esquerdo, direito e dianteiro/traseiro).' },
    cic_subida:    { g: 'ciclico', n: 'Tubos verticais do cíclico (mixer → bellcranks dos servos)', sns: ['67-12-10', '67-12-11', '67-12'], kw: 'cyclic control tube|mixer-to-actuator', f: 'Tubos esquerdo e direito que sobem até os bellcranks de apoio dos servos.' },
    cic_bellcrank: { g: 'ciclico', n: 'Bellcranks de apoio e boosted bellcranks do cíclico (E/D)', sns: ['67-12-12', '67-12-13', '67-12-14', '67-12-15', '67-12-16', '67-12-17', '67-12-18', '67-12-19', '67-12-20', '67-12-21', '67-10'], kw: 'boosted bellcrank|boosted link|boosted rod|actuator support bellcrank|walking beam', f: 'Lado "boosted" do cíclico: bellcranks, links e hastes após os servos. Rolamentos esféricos com inspeção programada.' },
    scas:          { g: 'ciclico', n: 'Atuadores de SCAS e de trim', sns: ['67-14-05', '67-14-07', '67-10', '22'], kw: 'scas actuator|trim actuator|sas', f: 'Estabilização (SCAS) e trim elétrico em série/paralelo com os comandos (piloto automático/estabilização).', so: ['429', '407'] },
    // ---- Servos e rotativo ----
    servo_e:       { g: 'servos', n: 'Servoatuador esquerdo (cíclico)', sns: ['67-30-01', '67-30-02', '67-10', '29'], kw: 'servo actuator|servo-actuator|left servo', f: 'Servo hidráulico: multiplica a força do piloto. Inspecionar vazamentos, folgas, fixação e o suporte.' },
    servo_d:       { g: 'servos', n: 'Servoatuador direito (cíclico)', sns: ['67-30-05', '67-30-06', '67-10', '29'], kw: 'servo actuator|servo-actuator|right servo', f: 'Servo hidráulico do lado direito.' },
    servo_c:       { g: 'servos', n: 'Servoatuador do coletivo (dianteiro/traseiro)', sns: ['67-30-03', '67-30-04', '67-10', '29'], kw: 'collective servo|servo actuator|servo-actuator', f: 'Servo que move o swashplate para cima/baixo (e o eixo longitudinal, conforme o modelo).' },
    servo_rc:      { g: 'servos', n: 'Servo direcional (rotor de cauda)', sns: ['67-20', '67-21', '29'], kw: 'directional servo|tail rotor servo', f: 'Servo hidráulico do comando direcional (modelos com pedais assistidos).', so: ['429', '430', '230', '407'] },
    swash:         { g: 'rotativo', n: 'Swashplate e suporte', sns: ['62-30', '67-13-01', '67-13', '62'], kw: 'swashplate', f: 'Prato fixo (comandado pelos servos) e prato rotativo (gira com o rotor). Transforma os comandos em passo das pás.' },
    scissors:      { g: 'rotativo', n: 'Drive link / scissors do swashplate', sns: ['62-30', '67-13-03', '62'], kw: 'drive link|scissors|swashplate drive', f: 'Faz o prato rotativo girar junto com o mastro.' },
    pitch_links:   { g: 'rotativo', n: 'Pitch links do rotor principal', sns: ['62-10', '62-20', '67-13-04', '62'], kw: 'pitch link', f: 'Hastes entre o prato rotativo e os grips das pás: mudam o passo de cada pá.' },
    mastro:        { g: 'rotativo', n: 'Mastro do rotor principal', sns: ['63-20', '63'], kw: 'mast', f: 'Eixo da transmissão até o cubo do rotor.' },
    // ---- Direcional ----
    pedais:        { g: 'direcional', n: 'Pedais do piloto e ajuste', sns: ['67-20-01', '67-20-02', '67-21-02', '67-20'], kw: 'pedal', f: 'Comandam o passo do rotor de cauda (proa). Ajustáveis à frente/trás.' },
    ped_jack:      { g: 'direcional', n: 'Jackshafts dos pedais e suportes', sns: ['67-20-03', '67-21-03', '67-20'], kw: 'pedal jackshaft|jackshaft|torque tube', f: 'Eixos transversais sob o painel/piso que ligam os pedais do piloto e do copiloto.' },
    quadrante:     { g: 'direcional', n: 'Quadrante / bellcrank direcional e batente', sns: ['67-20-06', '67-20-07', '67-20-08', '67-20-09', '67-21-06', '67-20'], kw: 'directional quadrant|quadrant|bellcrank', f: 'Converte o movimento dos pedais no movimento dos cabos ou do tubo até a cauda; batente limita o curso.' },
    dir_linha:     { g: 'direcional', n: 'Cabos/tubos do comando direcional e polias', sns: ['67-20-10', '67-20-11', '67-20-12', '67-20-13', '67-20-14', '67-20-15', '67-20-16', '67-20-17', '67-21-01', '67-21-06', '67-22', '67-20'], kw: 'cable|pulley|control tube|nylatron', f: 'Linha de comando ao longo da fuselagem e do cone de cauda: cabos com polias ou tubos com guias (nylatron).' },
    dir_cauda:     { g: 'direcional', n: 'Bellcranks e hastes na cauda (até a caixa de 90°)', sns: ['67-20-18', '67-20-19', '67-20-20', '67-20-21', '67-20-22', '67-20-23', '67-21-08', '67-20'], kw: 'directional bellcrank|short rod|long rod|tail rotor gearbox directional', f: 'Bellcranks e hastes curta/longa que levam o comando até a caixa do rotor de cauda.' },
    pcm:           { g: 'direcional', n: 'Mecanismo de passo do rotor de cauda (PCM), tubo, crosshead e pitch links', sns: ['67-20-24', '67-20-25', '67-21-10', '67-21-12', '67-21-13', '67-21-15', '64'], kw: 'pitch change mechanism|crosshead|tail rotor control tube|pitch link', f: 'Tubo de comando dentro do eixo da caixa de 90°, crosshead e pitch links: mudam o passo das pás do rotor de cauda.' }
  };

  // Itens do painel por tipo de aviônica (layout gerado em comandos.js)
  const PAINEIS = {
    g1000: { nome: 'Garmin G1000H NXi (PFD + MFD)', displays: [['PFD', 'Display de voo primário (PFD/GDU): atitude, velocidade, altitude, proa, alarmes CAS.', ['31-60', '34']], ['MFD', 'Display multifunção (MFD/GDU): motor (EIS), mapa, sistemas; modo reversionário.', ['31-60', '77', '31-40']]] },
    basix: { nome: 'Bell BasiX-Pro (3 displays integrados)', displays: [['PFD', 'Display de voo do piloto.', ['31-60', '34']], ['MFD', 'Display central: motores, sistemas, mapa.', ['31-60', '77']], ['PFD 2', 'Display de voo do copiloto.', ['31-60', '34']]] },
    efis: { nome: 'EFIS integrado (displays de voo e de motores)', displays: [['PFD', 'Display de voo primário.', ['31-60', '34']], ['EICAS', 'Motores e alarmes (os dois motores).', ['31', '77']], ['ND', 'Navegação / mapa.', ['34']]] },
    analog: { nome: 'Instrumentos analógicos', relogios: [['ASI', 'Velocímetro (KIAS)', ['34-10']], ['ATT', 'Horizonte artificial', ['34-20']], ['ALT', 'Altímetro', ['34-10']], ['VSI', 'Variômetro', ['34-10']], ['HSI', 'Indicador de proa', ['34-20']], ['NR/NP', 'Tacômetro duplo: rotor e turbina livre', ['77', '31']], ['TQ', 'Torquímetro', ['77']], ['MGT', 'Temperatura dos gases (MGT/TOT)', ['77']], ['NG', 'Rotação do gerador de gás (Ng/N1)', ['77']], ['ÓLEO', 'Pressão e temperatura do óleo do motor', ['79', '77']], ['XMSN', 'Pressão e temperatura do óleo da transmissão', ['63']], ['COMB', 'Quantidade e pressão de combustível', ['28']], ['AMP', 'Amperímetro / voltímetro', ['24']]] }
  };
  const PEDESTAL = [['BATT', '24'], ['GEN', '24'], ['HYD SYS', '29'], ['ENGINE', '76'], ['PITOT HTR', '30'], ['POSN LTS', '33'], ['ANTI COLL', '33'], ['PNL LT', '33']];

  window.COMANDOS = {
    PECAS, PAINEIS, PEDESTAL,
    // portal: modelos com o mesmo id no portal Bell (índice interno). trRc: 'cabo' ou 'tubo' até a cauda.
    modelos: {
      '505':   { portal: ['505'], painel: 'g1000', trRc: 'cabo', rcX: -6.7, rcZ: -0.23, nota: 'G1000H NXi; comando direcional por cabos e polias; FADEC com transdutor do coletivo.' },
      '407':   { portal: ['407', '407GXi'], painel: 'g1000', trRc: 'tubo', rcX: -7.2, rcZ: -0.24, nota: '407GXi com G1000H NXi (o 407 original usa instrumentos analógicos); comando direcional por tubos; SCAS/trim opcional.' },
      '429':   { portal: ['429'], painel: 'basix', trRc: 'cabo', rcX: -7.6, rcZ: -0.3, motores: 2, nota: 'BasiX-Pro com 3 displays; SCAS e trim de 3 eixos; servo direcional.' },
      '206':   { portal: ['206B'], painel: 'analog', trRc: 'tubo', rcX: -6.55, rcZ: -0.24, nota: 'Instrumentos analógicos; comando direcional por tubos.' },
      '206L4': { portal: ['206L4'], painel: 'analog', trRc: 'tubo', rcX: -7.1, rcZ: -0.24, nota: 'Instrumentos analógicos; comando direcional por tubos.' },
      '230':   { portal: ['230'], painel: 'analog', trRc: 'tubo', rcX: -7.7, rcZ: -0.26, motores: 2, nota: 'Bimotor com instrumentos duplos de motor; comando direcional por tubos.' },
      '430':   { portal: ['430'], painel: 'efis', trRc: 'tubo', rcX: -7.9, rcZ: -0.26, motores: 2, nota: 'EFIS com displays de voo e de motores (EICAS); comando direcional por tubos.' }
    }
  };
})();
