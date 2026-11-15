/* Bell 429 – sensores IoT para monitoramento de condição de TODOS os componentes do modelo (demonstração).
   ATENÇÃO: os pontos de medição e as faixas de alerta/crítico são ILUSTRATIVOS, só para a demonstração.
   Em uso real, configure cada sensor e limite conforme o manual do fabricante e o programa aprovado.
   tipo 'max': alerta quando sobe | 'min': alerta quando cai | 'bool': 1 = detectado/aberto */
(function () {
  // S(id, nome, componentes, unidade, tipo, base, ruído, alerta, crítico, ação sugerida)
  const S = (id, n, comp, un, tipo, base, ruido, al, cr, dica) => ({ id, n, comp, un, tipo, base, ruido, al, cr, dica });
  const B = (id, n, comp, dica) => ({ id, n, comp, un: '', tipo: 'bool', base: 0, dica });
  const GRUPOS = [
    { g: 'Rotor principal', s: [
      S('vib_rp', 'Vibração do rotor principal (1/rev)', ['cubo_rp', 'pas_rp'], 'ips', 'max', 0.12, 0.025, 0.30, 0.50, 'Tracking e balanceamento; inspeção de pás, amortecedores lead-lag e rolamentos do cubo.'),
      S('track_rp', 'Diferença de tracking das pás', ['pas_rp'], 'mm', 'max', 3, 0.8, 10, 18, 'Ajuste de tracking; inspeção das pás e dos pitch links.'),
      S('temp_swash', 'Temperatura do rolamento duplex do swashplate', ['swash'], '°C', 'max', 52, 2, 80, 95, 'Lubrificar e verificar a suavidade de rotação do rolamento duplex.'),
      S('torque_mastro', 'Torque no mastro', ['mastro'], '%', 'max', 78, 3, 101, 111, 'Acima de 100%: inspeção condicional de sobretorque (aba Eventos).') ] },
    { g: 'Transmissão e acionamento principal', s: [
      S('temp_trans', 'Temperatura do óleo da transmissão', ['transmissao'], '°C', 'max', 86, 2.5, 105, 115, 'Verificar nível e radiador de óleo; inspeção da transmissão.'),
      S('pres_trans', 'Pressão do óleo da transmissão', ['transmissao'], 'psi', 'min', 55, 1.5, 40, 30, 'Verificar bomba, filtro e vazamentos do sistema de óleo.'),
      B('chip_trans', 'Detector de limalha – transmissão', ['transmissao'], 'Identificar as partículas; pode exigir remoção da transmissão.'),
      S('desl_live', 'Deslocamento dos LIVE mounts', ['suporte_trans'], 'mm', 'max', 1.2, 0.3, 4, 6, 'Inspeção das vigas do pilone, LIVE mounts e molas de restrição de pitch.'),
      S('vib_eixo_motor', 'Vibração dos eixos motor–transmissão', ['eixo_motor'], 'ips', 'max', 0.09, 0.02, 0.25, 0.40, 'Inspeção detalhada dos eixos motor–transmissão e fixações.'),
      S('vib_radi', 'Vibração dos ventiladores do radiador de óleo', ['radiador_oleo'], 'ips', 'max', 0.08, 0.02, 0.25, 0.40, 'Inspeção dos ventiladores e mancais do fan shaft.') ] },
    { g: 'Motores', s: [
      S('mgt_1', 'MGT – motor nº 1', ['motor_1'], '°C', 'max', 690, 12, 800, 850, 'Limites e inspeções conforme o manual do motor P&WC.'),
      S('vib_m1', 'Vibração – motor nº 1', ['motor_1'], 'ips', 'max', 0.15, 0.03, 0.40, 0.60, 'Inspeção de vibração conforme o manual do motor P&WC.'),
      S('mgt_2', 'MGT – motor nº 2', ['motor_2'], '°C', 'max', 695, 12, 800, 850, 'Limites e inspeções conforme o manual do motor P&WC.'),
      S('vib_m2', 'Vibração – motor nº 2', ['motor_2'], 'ips', 'max', 0.15, 0.03, 0.40, 0.60, 'Inspeção de vibração conforme o manual do motor P&WC.'),
      S('dp_ibf', 'Pressão diferencial dos filtros de entrada (IBF)', ['entrada_ar'], 'inH₂O', 'max', 4, 0.5, 10, 14, 'Limpar/lubrificar ou substituir os elementos do filtro de barreira.'),
      S('temp_escape', 'Temperatura dos dutos de escape', ['escapamento'], '°C', 'max', 520, 12, 640, 700, 'Inspecionar dutos de escape e carenagens quanto a trincas e superaquecimento.'),
      S('temp_ger', 'Temperatura dos starter-generators', ['gerador'], '°C', 'max', 78, 3, 110, 125, 'Teste funcional das escovas; verificar ventilação.') ] },
    { g: 'Rotor de cauda e acionamento', s: [
      S('vib_rc', 'Vibração do rotor de cauda', ['rotor_cauda'], 'ips', 'max', 0.10, 0.02, 0.30, 0.50, 'Balanceamento; inspeção de pás, yokes e rolamentos.'),
      S('temp_hang', 'Temperatura do mancal (hanger)', ['eixo_rc'], '°C', 'max', 56, 2, 80, 95, 'Lubrificação e inspeção do hanger e dos acoplamentos.'),
      S('temp_trgb', 'Temperatura da caixa do rotor de cauda', ['caixa_rc'], '°C', 'max', 72, 2, 95, 110, 'Verificar nível e condição do óleo; inspeção da caixa.'),
      B('chip_trgb', 'Detector de limalha – caixa do rotor de cauda', ['caixa_rc'], 'Identificar as partículas; pode exigir remoção da caixa.'),
      S('cor_atuador_rc', 'Corrente do atuador direcional', ['comandos_rc'], 'A', 'max', 1.1, 0.15, 2.5, 3.5, 'Inspeção do tubo de controle direcional, idlers e atuadores; teste funcional dos servos.') ] },
    { g: 'Sistemas', s: [
      S('pres_hid', 'Pressão hidráulica (% da nominal)', ['hidraulico'], '%', 'min', 100, 1.2, 90, 80, 'Verificar vazamentos, reservatório e servo-atuadores.'),
      S('temp_hid', 'Temperatura do fluido hidráulico', ['hidraulico'], '°C', 'max', 62, 2, 95, 110, 'Inspecionar módulos hidráulicos e manifolds no deck dianteiro.'),
      B('agua_comb', 'Água/contaminação no sump de combustível', ['combustivel'], 'Drenar os sumps; inspecionar células, telas de entrada e linhas.'),
      S('pres_extintor', 'Pressão da garrafa do extintor', ['extintor'], 'psi', 'min', 600, 4, 520, 450, 'Inspecionar garrafa, cartuchos e linhas de descarga; teste funcional elétrico.'),
      S('atrito_ciclico', 'Força de atrito no cíclico', ['comandos'], 'N', 'max', 6, 0.8, 14, 20, 'Inspeção de tubos, bellcranks, mixer e jackshaft sob o piso.'),
      S('cor_pitot', 'Corrente de aquecimento do pitot', ['pitot'], 'A', 'min', 5.2, 0.15, 3.5, 2, 'GVI dos tubos de pitot e tomadas estáticas; teste do sistema.'),
      B('falha_luz', 'Falha em luz externa (corrente zero)', ['luzes'], 'Inspeção das luzes de posição, anticolisão e farol.'),
      S('vswr_ant', 'VSWR das antenas', ['antenas'], ': 1', 'max', 1.3, 0.05, 2, 3, 'Cheque de VSWR de antenas, cabos e conectores.') ] },
    { g: 'Elétrica e aviônica', s: [
      S('v_bat', 'Tensão da bateria', ['bateria'], 'V', 'min', 25.6, 0.15, 24, 22.5, 'Teste funcional da bateria e do sistema de geração.'),
      S('temp_avionica', 'Temperatura do compartimento de aviônicos (nariz)', ['avionica'], '°C', 'max', 38, 1.5, 55, 70, 'Verificar ventilação e equipamentos do compartimento superior do nariz.'),
      S('temp_painel', 'Temperatura dos displays', ['painel'], '°C', 'max', 41, 1.5, 60, 72, 'Verificar ventilação do painel e displays.'),
      S('bat_elt', 'Carga da bateria do ELT', ['avionica_tras'], '%', 'min', 96, 0.3, 50, 25, 'Substituir a bateria do ELT; cheque operacional do sistema.') ] },
    { g: 'Estrutura', s: [
      S('def_fus', 'Deformação no forward lift frame', ['fuselagem'], 'µε', 'max', 310, 25, 700, 950, 'Inspeção detalhada do lift frame, keel beams e vigas do teto.'),
      S('umid_nariz', 'Umidade no compartimento do nariz', ['nariz'], '%', 'max', 42, 2, 75, 90, 'GVI do compartimento; limpeza de chicotes; verificar drenos e corrosão.'),
      S('temp_fus_tras', 'Temperatura do compartimento traseiro (410/411)', ['fus_traseira'], '°C', 'max', 40, 1.5, 60, 75, 'GVI dos compartimentos traseiros de aviônicos e de controles.'),
      S('def_cone', 'Deformação na fixação do cone de cauda', ['cone_cauda'], 'µε', 'max', 260, 25, 600, 850, 'Cheque de torque da fixação; inspeção da caverna de união (FS 361).'),
      S('vib_estab', 'Vibração do estabilizador horizontal', ['estabilizador'], 'ips', 'max', 0.11, 0.02, 0.30, 0.45, 'Inspeção do tubo-longarina, fittings e suportes do slat.'),
      S('def_deriva', 'Deformação no fitting da deriva', ['deriva'], 'µε', 'max', 240, 25, 600, 850, 'Inspeção do fitting da deriva e do suporte da caixa do rotor de cauda.'),
      S('umid_piso', 'Umidade sob o piso', ['piso'], '%', 'max', 40, 2, 75, 90, 'GVI dos pisos e áreas sob o piso; verificar drenos e corrosão.') ] },
    { g: 'Trem de pouso', s: [
      S('g_pouso', 'Aceleração vertical no pouso', ['esquis'], 'g', 'max', 1.1, 0.08, 2, 2.6, 'Pouso duro: executar a inspeção condicional (aba Eventos) e registrar RIN.'),
      S('defl_diant', 'Deflexão do tubo transversal dianteiro', ['tubo_diant'], 'mm', 'max', 4, 0.6, 12, 18, 'Cheque de deflexão do tubo transversal; inspeção das braçadeiras.'),
      S('defl_tras', 'Deflexão do tubo transversal traseiro', ['tubo_tras'], 'mm', 'max', 4, 0.6, 12, 18, 'Cheque de deflexão do tubo transversal; inspeção do pivô traseiro.') ] },
    { g: 'Portas, janelas e capôs', s: [
      B('trava_trip_l', 'Porta da tripulação esquerda destravada', ['porta_trip_L'], 'Inspeção das dobradiças e do mecanismo de trava.'),
      B('trava_trip_r', 'Porta da tripulação direita destravada', ['porta_trip_R'], 'Inspeção das dobradiças e do mecanismo de trava.'),
      B('trava_pax_l', 'Porta de passageiros esquerda destravada', ['porta_pax_L'], 'Inspeção das dobradiças e do mecanismo de trava.'),
      B('trava_pax_r', 'Porta de passageiros direita destravada', ['porta_pax_R'], 'Inspeção das dobradiças e do mecanismo de trava.'),
      B('trava_bag', 'Porta traseira / bagageiro destravada', ['porta_bag'], 'Inspeção das dobradiças e travas da porta de carga.'),
      B('impacto_pbrisa', 'Impacto/trinca no para-brisa', ['parabrisa'], 'Inspecionar transparências quanto a trincas, crazing e impacto.'),
      B('impacto_janela', 'Impacto/trinca em janela da cabine', ['janelas'], 'Inspecionar transparências quanto a trincas, crazing e impacto.'),
      B('capo_diant', 'Carenagem dianteira destravada', ['carenagem_diant'], 'GVI da carenagem dianteira e dos forward cowls; verificar travas.'),
      B('capo_trans', 'Capô da transmissão destravado', ['carenagem_trans'], 'GVI dos capôs e portas da transmissão; verificar travas.'),
      B('capo_motor', 'Capô dos motores destravado', ['carenagem_motor'], 'GVI dos capôs e portas dos motores; verificar travas.'),
      B('capo_escape', 'Carenagem de escapamento solta', ['carenagem_escape'], 'GVI das carenagens de escapamento; verificar fixações.') ] },
    { g: 'Interior', s: [
      B('aten_trip', 'Atenuador de energia acionado – assentos da tripulação', ['assentos_trip'], 'Marca fora do entalhe: substituir o assento; inspeção de pouso duro.'),
      B('aten_pax', 'Atenuador de energia acionado – assentos dos passageiros', ['assentos_pax'], 'Marca fora do entalhe: substituir o assento; inspeção de pouso duro.') ] }
  ];
  const SENSORES = GRUPOS.flatMap((g) => g.s.map((s) => Object.assign(s, { grupo: g.g })));
  window.B429.SENSORES = SENSORES;
  window.B429.GRUPOS_SENSORES = GRUPOS.map((g) => g.g);
})();
