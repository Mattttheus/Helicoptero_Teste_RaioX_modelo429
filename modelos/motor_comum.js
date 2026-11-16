/* Manutenção Interativa – base comum dos motores: peças, mapa de sensores e tarefas de manutenção.
   Cada modelos/<id>/motor.js chama MONTAR_MOTOR({...}) com a arquitetura, os limites (sim), as posições dos sensores e
   o que for específico do motor. Os textos de instalação/teste dos sensores são orientações gerais de boas práticas –
   o procedimento oficial é o do manual do motor (EMM) e do fabricante do sensor. */
(function () {
  const PARTES = {
    entrada:          { n: 'Entrada de ar / suporte dianteiro', mod: 'Compressor', ata: '72-30', fn: 'Conduz o ar ao compressor; suporta o rolamento dianteiro.', man: 'Inspeção de FOD, erosão e trincas nos montantes; limpeza da tela.', est: { vib: 0.55, rpm: 0.3 } },
    compressor_axial: { n: 'Carcaça do compressor axial (6 estágios)', mod: 'Compressor', ata: '72-30', fn: 'Envolve os 6 estágios axiais que pré-comprimem o ar antes do estágio centrífugo.', man: 'Inspeção de erosão do revestimento; lavagem do compressor.', est: { vib: 0.6, rpm: 0.6 } },
    rotor_axial:      { n: 'Rotores do compressor axial', mod: 'Compressor', ata: '72-30', fn: 'Seis discos com palhetas acionados pela turbina do gerador de gás (Ng).', man: 'Boroscopia das palhetas (mossas, erosão, FOD); lavagem do compressor.', est: { rpm: 1, vib: 0.9 } },
    compressor:       { n: 'Carcaça do compressor centrífugo / difusor', mod: 'Compressor', ata: '72-30', fn: 'Difusor e voluta: transformam velocidade em pressão e entregam o ar para a combustão.', man: 'Inspeção de trincas no difusor; verificação de vazamentos de ar.', est: { rpm: 0.6, vib: 0.6, temp: 0.2 } },
    impulsor:         { n: 'Impulsor centrífugo', mod: 'Compressor', ata: '72-30', fn: 'Estágio centrífugo do compressor, gira com o gerador de gás (Ng).', man: 'Boroscopia do bordo de ataque (erosão/FOD); peça com vida limite em ciclos.', est: { rpm: 1, vib: 0.85, temp: 0.2 } },
    tubos_descarga:   { n: 'Tubo(s) de descarga do compressor', mod: 'Compressor', ata: '72-30', fn: 'Levam o ar comprimido da voluta até a câmara de combustão na traseira (fluxo reverso).', man: 'Inspeção de trincas, fixações e vazamento nas juntas.', est: { temp: 0.35, vib: 0.5 } },
    caixa_acessorios: { n: 'Caixa de acessórios (engrenagens)', mod: 'Caixa de engrenagens', ata: '72-60', fn: 'Aciona bomba de óleo, bomba/controle de combustível, starter-generator e tacômetros; no M250 também contém a redução da turbina livre.', man: 'Detectores de limalha, nível/vazamento de óleo, torque das fixações dos acessórios.', est: { tq: 0.75, vib: 0.6, oleo: 1 } },
    caixa_reducao:    { n: 'Caixa de redução (RGB)', mod: 'Caixa de engrenagens', ata: '72-10', fn: 'Reduz a rotação da turbina livre para o eixo de saída e aciona acessórios.', man: 'Detectores de limalha, análise de óleo, vazamentos e torque de fixação.', est: { tq: 1, vib: 0.6, oleo: 1 } },
    eixo_saida:       { n: 'Eixo de saída de potência', mod: 'Caixa de engrenagens', ata: '72-10', fn: 'Entrega a potência ao eixo principal da transmissão do helicóptero.', man: 'Inspeção do flange, estrias e retentor; alinhamento com o eixo principal.', est: { tq: 1, rpm: 0.6, vib: 0.5 } },
    turbina:          { n: 'Carcaça das turbinas', mod: 'Turbina', ata: '72-50', fn: 'Suporta a turbina do gerador de gás e a turbina livre; abriga as sondas de temperatura.', man: 'Inspeção de trincas e deformação por calor.', est: { temp: 0.8, vib: 0.4 } },
    turbina_gp:       { n: 'Turbina do gerador de gás (HP)', mod: 'Turbina', ata: '72-50', fn: 'Extrai energia dos gases para acionar o compressor (Ng).', man: 'Boroscopia das palhetas (queima, trincas, perda de material); peças com vida em ciclos.', est: { temp: 1, rpm: 1, vib: 0.7 } },
    turbina_livre:    { n: 'Turbina livre (potência) e eixo', mod: 'Turbina', ata: '72-50', fn: 'Turbina independente (Np/N2) que aciona o eixo de saída.', man: 'Boroscopia; verificação de folgas e do eixo; inspeção após sobrevelocidade.', est: { temp: 0.75, rpm: 1, tq: 0.8, vib: 0.7 } },
    carcaca_tl:       { n: 'Carcaça da turbina livre', mod: 'Turbina', ata: '72-50', fn: 'Módulo da turbina livre (substituível como conjunto).', man: 'Inspeção de trincas e fixações do módulo.', est: { temp: 0.8, vib: 0.5 } },
    coletor_escape:   { n: 'Coletor de escape', mod: 'Escape', ata: '78-10', fn: 'Recolhe os gases após a turbina livre e os direciona para cima.', man: 'Inspeção de trincas, descoloração e fixações.', est: { temp: 0.85, vib: 0.45 } },
    escape:           { n: 'Duto de escape', mod: 'Escape', ata: '78-10', fn: 'Direciona os gases para fora do helicóptero.', man: 'Inspeção de trincas, descoloração e fixações.', est: { temp: 0.85, vib: 0.45 } },
    combustao:        { n: 'Carcaça da câmara de combustão', mod: 'Combustão', ata: '72-40', fn: 'Vaso de pressão que envolve a câmara de combustão.', man: 'Inspeção de trincas e pontos quentes; teste de vazamento.', est: { temp: 0.8 } },
    camisa:           { n: 'Camisa (liner) da câmara de combustão', mod: 'Combustão', ata: '72-40', fn: 'Onde o combustível queima; o ar de diluição resfria as paredes.', man: 'Boroscopia: trincas, queima e deformação; substituição por condição.', est: { temp: 1 } },
    bico_injetor:     { n: 'Bico injetor de combustível', mod: 'Combustão', ata: '73-10', fn: 'Atomiza o combustível na câmara.', man: 'Teste de padrão de spray; limpeza; inspeção de carbonização.', est: { temp: 0.6 } },
    ignitor:          { n: 'Sistema de ignição (ignitor e excitador)', mod: 'Ignição', ata: '74-00', fn: 'Excitador de alta energia e vela(s) de ignição para a partida.', man: 'Teste funcional (centelha audível); inspeção do eletrodo e do cabo.', est: { temp: 0.3 } },
    termopares:       { n: 'Chicote de termopares', mod: 'Indicação', ata: '77-20', fn: 'Sondas tipo K entre as turbinas; a média indica a temperatura do motor.', man: 'Teste de resistência, isolação e calibração com simulador.', est: { temp: 0.7 } },
    gerador:          { n: 'Starter-generator', mod: 'Acessórios', ata: '80-10', fn: 'Gira o motor na partida e gera energia elétrica depois.', man: 'Escovas (desgaste), rolamentos, estrias do eixo e ventilação.', est: { tq: 0.2, vib: 0.45 } },
    controle_comb:    { n: 'Controle de combustível', mod: 'Combustível', ata: '73-20', fn: 'Bomba e unidade de dosagem do combustível.', man: 'Troca do filtro, vazamentos, ajuste e teste funcional.', est: {} },
    oleo:             { n: 'Sistema de óleo (filtro, linhas, detectores de limalha)', mod: 'Óleo', ata: '79-00', fn: 'Lubrifica e resfria rolamentos e engrenagens.', man: 'Detectores de limalha, filtro, análise de óleo (SOAP), vazamentos.', est: { oleo: 1 } },
    sangria:          { n: 'Válvula de sangria do compressor', mod: 'Compressor', ata: '75-30', fn: 'Alivia ar em baixa rotação para evitar o surge do compressor.', man: 'Teste funcional de abertura/fechamento.', est: { rpm: 0.4 } },
    suportes:         { n: 'Berços / suportes do motor', mod: 'Instalação', ata: '71-20', fn: 'Fixam o motor à estrutura e absorvem vibração.', man: 'Inspeção de trincas, isoladores e torque.', est: { vib: 1, tq: 0.4 } },
    ecu:              { n: 'Controle eletrônico do motor (ECU/EEC – FADEC)', mod: 'Controle', ata: '76-00', fn: 'Calcula a dosagem de combustível e protege os limites (Ng, Np, temperatura, torque).', man: 'Leitura de falhas e excedências; teste de canais e da reserva.', est: {} }
  };

  // Sensor padrão por grandeza: tipo, unidade, faixa de teste, instalação e teste (P = limites do motor)
  function sensoresPadrao(d) {
    const P = d.sim, T = P.temp, pos = d.pos, sens = [];
    const S = (id, o) => { if (pos[id]) sens.push(Object.assign({ id, pos: pos[id][0], dir: pos[id][1] }, o)); };
    ['tc_1', 'tc_2', 'tc_3', 'tc_4'].forEach((id, i) => S(id, {
      n: `Termopar ${T} nº ${i + 1}`, tipo: 'Termopar tipo K (cromel-alumel)', var: 'temp', ofs: [6, -4, 3, -6][i], un: '°C', lim: 'max', al: P.tempMcp, cr: P.tempTo, faixa: [0, 1000], tol: 6, parte: 'termopares', orig: 'Fabricante do motor',
      inst: `Sonda no bosso da carcaça entre a turbina do gerador de gás e a turbina livre (posição ${i + 1} de 4, a cada 90°). Rosca com antiengripante e torque do manual do motor; ligar ao chicote em paralelo (a indicação é a média das 4 sondas). Usar só cabo de compensação tipo K – nunca fio de cobre comum.`,
      teste: `Simulador de termopar (mV tipo K) em 3 pontos (ex.: 200/550/900 °C) comparando com a indicação; resistência do chicote dentro da faixa do manual; isolação para massa ≥ 1 MΩ. Sonda com desvio: substituir e repetir.` }));
    S('ng', { n: 'Rotação do gerador de gás (Ng / N1)', tipo: d.tipoNg || 'Pickup magnético (monopolo)', var: 'ng', un: '%', lim: 'max', al: P.ngMcp + 1, cr: P.ngTrans, faixa: [0, 110], tol: 0.5, parte: d.parteNg || 'caixa_acessorios', orig: 'Fabricante do motor',
      inst: 'No ressalto da caixa de engrenagens voltado para a engrenagem fônica. Ajustar a folga (gap) com calibrador de lâminas conforme o manual; frenar o conector; rotear o cabo blindado longe dos cabos de ignição.',
      teste: 'Gerador de frequência no conector: conferir a indicação em 3 rotações (20/55/100%); medir a resistência da bobina; com o motor girando no arranque, verificar sinal estável.' });
    S('np', { n: 'Rotação da turbina livre (Np / N2)', tipo: d.tipoNg || 'Pickup magnético (monopolo)', var: 'np', un: '%', lim: 'max', al: P.npMax - 2, cr: P.npMax, faixa: [0, 115], tol: 0.5, parte: d.parteNp || 'caixa_acessorios', orig: 'Fabricante do motor',
      inst: 'No ressalto do trem da turbina livre. Ajustar o gap, frenar o conector e manter o cabo blindado separado da ignição. Em motores com FADEC há sondas independentes por canal.',
      teste: 'Gerador de frequência em 3 pontos; comparar canais (quando duplo); verificar a proteção de sobrevelocidade conforme o manual.' });
    S('tq', { n: 'Torque do motor', tipo: d.tipoTq || 'Transdutor de torque', var: 'tq', un: '%', lim: 'max', al: 100, cr: P.tqTo, faixa: [0, 130], tol: 1, parte: d.parteTq || 'caixa_acessorios', orig: 'Fabricante do motor',
      inst: d.instTq || 'Na caixa de engrenagens, na tomada do torquímetro. Sangrar o ar da linha (se hidráulico) e apertar com o torque do manual.',
      teste: 'Aplicar pressão/sinal de referência em 3 pontos e comparar com o indicador; verificar a calibração (fator do motor) registrada no histórico.' });
    S('oleoP', { n: 'Pressão do óleo do motor', tipo: 'Transdutor de pressão (strain gauge)', var: 'oleoP', un: 'psi', lim: 'min', al: P.oleoPmin + 10, cr: P.oleoPmin, faixa: [0, 200], tol: 2, parte: 'oleo', orig: 'Fabricante do motor',
      inst: 'Na saída da bomba/filtro de óleo, em posição que permita sangria. Vedação nova, torque do manual e frenagem.',
      teste: 'Bomba manual com manômetro padrão em 3 pressões; conferir a luz/alarme de pressão baixa no ponto de atuação.' });
    S('oleoT', { n: 'Temperatura do óleo do motor', tipo: 'Bulbo RTD (resistência de platina)', var: 'oleoT', un: '°C', lim: 'max', al: P.oleoTmax - 10, cr: P.oleoTmax, faixa: [-40, 150], tol: 1.5, parte: 'oleo', orig: 'Fabricante do motor',
      inst: 'No retorno/entrada de óleo do motor, com o bulbo totalmente imerso no fluxo. Vedação nova e torque do manual.',
      teste: 'Banho térmico ou década resistiva em 3 pontos (ex.: 0/60/120 °C); conferir a resistência × temperatura da tabela do sensor.' });
    S('chip', { n: 'Detector elétrico de limalha', tipo: 'Detector magnético de limalha (chip detector)', var: 'chip', un: '', lim: 'bool', faixa: [0, 1], parte: 'oleo', orig: 'Fabricante do motor',
      inst: 'No ponto baixo da caixa de engrenagens. Inspecionar o ímã antes de instalar; vedação nova, torque e frenagem; conectar o fio da luz CHIP.',
      teste: 'Encostar uma ferramenta metálica nos polos: a luz CHIP deve acender; medir continuidade e isolação. Partículas encontradas: identificar conforme o manual (pode exigir remoção do motor).' });
    S('combP', { n: 'Pressão de combustível (entrada do motor)', tipo: 'Transdutor de pressão', var: 'combP', un: 'psi', lim: 'min', al: 8, cr: 5, faixa: [0, 60], tol: 1, parte: 'controle_comb', orig: 'Fabricante do helicóptero',
      inst: 'Na linha de entrada do controle de combustível, depois do filtro. Vedação nova, torque e verificação de vazamento com a bomba de reforço ligada.',
      teste: 'Bomba manual com manômetro padrão em 3 pressões; checar o alarme de pressão baixa.' });
    S('ff', { n: 'Fluxo de combustível', tipo: 'Transmissor de fluxo (turbina)', var: 'ff', un: 'kg/h', lim: 'info', faixa: [0, 200], tol: 3, parte: 'controle_comb', orig: 'Fabricante do helicóptero',
      inst: 'Na linha de combustível entre o controle e o bico, respeitando a seta de fluxo e os trechos retos antes/depois do transmissor.',
      teste: 'Bancada de fluxo ou comparação com o consumo medido; conferir a curva de calibração (pulsos/litro).' });
    S('vibC', { n: 'Vibração – lado do compressor / caixa', tipo: 'Acelerômetro piezoelétrico (100 mV/g)', var: 'vibC', un: 'ips', lim: 'max', al: 0.4, cr: 0.6, faixa: [0, 2], tol: 0.03, parte: d.parteVibC || 'entrada', orig: 'Monitoramento (HUMS) – adicional',
      inst: 'Em base usinada plana na carcaça dianteira, com o eixo de medição radial (vertical). Prisioneiro com torque do fabricante do sensor e graxa de acoplamento; cabo fixado a cada 15 cm para não vibrar.',
      teste: 'Calibrador de vibração portátil (shaker) em 1 g / 159,2 Hz; verificar a sensibilidade (mV/g) e o espectro com o motor em marcha lenta.' });
    S('vibT', { n: 'Vibração – lado da turbina', tipo: 'Acelerômetro piezoelétrico de alta temperatura', var: 'vibT', un: 'ips', lim: 'max', al: 0.4, cr: 0.6, faixa: [0, 2], tol: 0.03, parte: d.parteVibT || 'turbina', orig: 'Monitoramento (HUMS) – adicional',
      inst: 'Em suporte na carcaça da turbina, radial, longe do jato de escape; usar sensor e cabo de alta temperatura (mineral isolado) com proteção térmica.',
      teste: 'Shaker portátil a 1 g; conferir sensibilidade e o nível de 1/rev de Ng e Np em marcha lenta.' });
    S('p3', { n: 'Pressão de descarga do compressor (P3/PC)', tipo: 'Transdutor de pressão absoluta', var: 'p3', un: 'psia', lim: 'info', faixa: [0, 200], tol: 1.5, parte: d.parteP3 || 'compressor', orig: 'Monitoramento (tendência) – adicional',
      inst: 'Na tomada de pressão da voluta/difusor com linha curta e inclinada para drenar condensado. Vedação nova e teste de vazamento.',
      teste: 'Calibrador de pressão em 3 pontos; comparar com a razão de pressão esperada na verificação de potência.' });
    S('t1', { n: 'Temperatura do ar de entrada (T1)', tipo: 'Sonda RTD', var: 't1', un: '°C', lim: 'info', faixa: [-40, 60], tol: 1, parte: 'entrada', orig: 'Fabricante do helicóptero',
      inst: 'Na entrada de ar, protegida de radiação solar direta e do calor do motor.',
      teste: 'Década resistiva em 3 pontos; comparar com a OAT do helicóptero com o motor frio.' });
    S('ign', { n: 'Corrente do excitador de ignição', tipo: 'Sensor de corrente (efeito Hall)', var: 'ign', un: 'A', lim: 'info', faixa: [0, 2], tol: 0.1, parte: 'ignitor', orig: 'Monitoramento – adicional',
      inst: 'No cabo de alimentação do excitador (baixa tensão) – nunca no cabo de alta tensão da vela.',
      teste: 'Acionar a ignição com o combustível cortado: corrente estável e centelha audível; desligar e aguardar a descarga antes de mexer no cabo.' });
    S('corrente', { n: 'Corrente do starter-generator', tipo: 'Shunt / sensor Hall', var: 'corrente', un: 'A', lim: 'info', faixa: [0, 400], tol: 4, parte: 'gerador', orig: 'Fabricante do helicóptero',
      inst: 'No cabo de potência do starter-generator (shunt no lado de massa ou sensor Hall envolvendo o cabo).',
      teste: 'Comparar com alicate amperímetro na partida (pico) e com o gerador em carga.' });
    S('filtroComb', { n: 'Bypass iminente do filtro de combustível', tipo: 'Interruptor de pressão diferencial', var: 'filtroComb', un: '', lim: 'bool', faixa: [0, 1], parte: 'controle_comb', orig: 'Fabricante do motor',
      inst: 'Na carcaça do filtro de combustível do motor; ligar à luz de FUEL FILTER.',
      teste: 'Aplicar pressão diferencial de atuação com bancada; a luz deve acender no valor do manual.' });
    return sens.concat(d.sensoresExtra || []);
  }

  function tarefasPadrao(d) {
    const T = d.sim.temp, hot = ['camisa', 'turbina_gp', 'turbina_livre', 'combustao', 'bico_injetor'], comp = ['entrada', 'compressor', 'impulsor', 'compressor_axial', 'rotor_axial'];
    const caixa = d.arquitetura === 'm250' ? 'caixa_acessorios' : 'caixa_reducao';
    return [
      { id: 'boroscopia', n: 'Boroscopia da seção quente', quando: 'Por condição, após excedência de ' + T + ' ou conforme o manual do motor', partes: hot, corte: true, explodir: 0, passos: [
        'Motor frio e desenergizado; disjuntores de ignição e partida abertos e etiquetados.', 'Remover o ignitor ou o bujão de acesso da câmara.', 'Introduzir o boroscópio e inspecionar a camisa (trincas, queima, deformação).',
        'Girar o gerador de gás manualmente e inspecionar as palhetas da turbina HP (queima, perda de material, trincas).', 'Registrar imagens e comparar com os limites do manual; reinstalar com torque e frenagem.'] },
      { id: 'lavagem', n: 'Lavagem do compressor', quando: 'Por ambiente (salino/poeira) ou quando a margem de potência cair', partes: comp.filter((p) => d.temPeca(p)), corte: true, explodir: 0, passos: [
        'Motor frio; instalar o kit de lavagem na entrada de ar.', 'Girar o motor no arranque (motoring) com a solução aprovada, sem ignição.', 'Enxaguar com água desmineralizada; secar girando o motor.',
        'Funcionar em marcha lenta para secar e repetir a verificação de potência.'] },
      { id: 'chip', n: 'Detectores de limalha e filtro de óleo', quando: 'Inspeção periódica e sempre que a luz CHIP acender', partes: ['oleo', caixa], corte: false, explodir: 0.35, passos: [
        'Remover o detector de limalha e inspecionar o ímã.', 'Classificar as partículas (finas/flocos/lascas) conforme o manual.', 'Inspecionar o elemento do filtro de óleo e o indicador de bypass.',
        'Coletar amostra para análise de óleo (SOAP) se houver partículas.', 'Reinstalar com vedações novas, torque e frenagem; teste de vazamento em marcha lenta.'] },
      { id: 'filtro_comb', n: 'Filtro de combustível e controle', quando: 'Conforme o manual ou com a luz de bypass do filtro', partes: ['controle_comb', 'bico_injetor'], corte: false, explodir: 0.35, passos: [
        'Fechar a válvula de corte de combustível e despressurizar a linha.', 'Trocar o elemento do filtro; inspecionar a carcaça.', 'Sangrar o ar do sistema; verificar vazamentos com a bomba de reforço ligada.'] },
      { id: 'ignicao', n: 'Teste do sistema de ignição', quando: 'Inspeção periódica / partida difícil', partes: ['ignitor'], corte: false, explodir: 0.3, passos: [
        'Combustível cortado. Desconectar o cabo do ignitor e acionar a ignição por alguns segundos: centelha audível e regular.', 'Desligar e aguardar a descarga do excitador antes de manusear.', 'Inspecionar o eletrodo (desgaste/carbonização) e o cabo de alta tensão.'] },
      { id: 'termopares', n: `Verificação do chicote de termopares (${T})`, quando: 'Inspeção periódica ou indicação suspeita', partes: ['termopares'], corte: false, explodir: 0.25, passos: [
        'Medir a resistência do chicote e a isolação para massa.', `Aplicar o simulador de termopar e comparar a indicação de ${T} em 3 pontos.`, 'Substituir sondas fora de tolerância.'] },
      { id: 'pac', n: 'Verificação de potência (power assurance / PAC)', quando: d.pacQuando || 'Conforme o manual do helicóptero', partes: ['turbina_gp', 'impulsor', 'termopares'], corte: true, explodir: 0, passos: d.pacPassos || [
        'Estabilizar o helicóptero conforme o RFM (proa no vento, cargas elétricas mínimas).', `Registrar torque, ${T}, Ng, OAT e altitude-pressão.`, `Comparar com o gráfico: margens de ${T} e de Ng devem ser ≥ 0.`, 'Margem baixa: lavar o compressor/limpar o filtro e repetir antes de investigar a seção quente.'] },
      { id: 'vibracao', n: 'Levantamento de vibração (HUMS)', quando: 'Após troca de motor/componente ou tendência de vibração', partes: ['suportes', 'eixo_saida'], corte: false, explodir: 0, passos: [
        'Instalar os acelerômetros nas posições do mapa de sensores (lado do compressor e da turbina).', 'Registrar o espectro em marcha lenta e em 100% Np.', 'Comparar os picos de 1/rev de Ng e Np com os limites; investigar suportes, eixo de saída e balanceamento.'] },
      { id: 'modulos', n: 'Remoção e troca de módulos (vista explodida)', quando: 'Troca de módulo / revisão', partes: Object.keys(d.partes), corte: false, explodir: 1, passos: [
        'Desconectar linhas de combustível, óleo, chicotes e comandos; tampar todas as aberturas.', 'Remover o motor ou o módulo conforme o manual (módulos: ' + (d.modulos || 'compressor, gerador de gás, turbina livre, caixa de engrenagens') + ').',
        'Na instalação: vedações novas, torque e frenagem; teste de vazamento, partida e verificação de potência.'] }
    ].concat(d.tarefasExtra || []);
  }

  window.MONTAR_MOTOR = function (d) {
    const partes = {};
    for (const id of d.pecas) partes[id] = Object.assign({}, PARTES[id] || { n: id, mod: '—', ata: '72', fn: '', man: '', est: {} }, (d.nomes || {})[id] || {});
    d.partes = partes; d.temPeca = (id) => !!partes[id];
    d.sensores = sensoresPadrao(d);
    d.manutencao = tarefasPadrao(d).map((t) => Object.assign(t, { partes: t.partes.filter(d.temPeca) }));
    window.MOTOR = d;
  };
})();
