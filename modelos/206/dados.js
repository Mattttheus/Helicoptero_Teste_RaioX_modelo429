/* Manutenção Interativa – Bell 206B JetRanger (PRÉVIA até incorporar o BHT-206B-MM da pasta manuais/206).
   Motor Rolls-Royce (Allison) 250-C20J – Série II: compressor de 6 estágios axiais + 1 centrífugo, câmara única de
   fluxo reverso, turbina do gerador de gás de 2 estágios e turbina livre de 2 estágios (NZ CAA TAR 11/21B/22).
   Limites de TOT e de pressão de óleo: fontes secundárias (confirmar no RFM). Demais tarefas: ilustrativas. */
HELI_MONO({
  id: '206', mm: 'BHT-206B-MM', motorNome: 'Rolls-Royce 250-C20J', fabMotor: 'Rolls-Royce', motorMan: 'manual do motor Rolls-Royce 250-C20 Série II',
  tempNome: 'TOT', pasRp: 2, insp100: '100h',
  kwMotor: 'allison|rolls|rolls royce|250 c20|c20j|tot|n1|bleed valve|válvula de sangria|fcu|governador',
  limites: { tempCru: 690, tempMcp: 738, tempTo: 810, ngCru: 98, ngMcp: 105, ngTo: 106, oleoP: 122, oleoPal: 115, oleoPmin: 90, oleoTmax: 107 },
  textoTemp: 'TOT: contínuo 738 °C; decolagem 810 °C (5 min); transitório 843 °C (6 s, não intencional); partida e corte 810–927 °C por até 10 s, 927 °C por no máximo 1 s. Fontes secundárias – confirmar no RFM e no manual do motor.',
  nomes: {
    cubo_rp: { n: 'Cubo do rotor principal (2 pás, semirrígido)', o: 'Yoke, grips, trunnion de batimento (teetering) e rolamentos; pendurado abaixo do mastro (underslung).' },
    motor: { n: 'Motor – Rolls-Royce 250-C20J', o: 'Fluxo reverso: compressor axial (6 estágios) + centrífugo à frente, caixa de acessórios no meio, câmara de combustão única na traseira; gases voltam para a frente pelas turbinas e saem pelos 2 escapes verticais. Controle hidromecânico (sem FADEC).' },
    escapamento: { n: 'Escapamentos (2 dutos verticais)', o: 'Dois dutos de escape saindo para cima, atrás do capô do motor.' },
    radiador_oleo: { n: 'Radiador de óleo e blower', o: 'Radiador de óleo do motor e da transmissão com ventilador (blower) acionado pelo eixo de cauda, na carenagem traseira.' },
    painel: { n: 'Painel de instrumentos (analógico)', o: 'Instrumentos analógicos do motor (TOT, N1, N2/Nr, torque, óleo) e painel de alarmes.' },
    porta_bag: { n: 'Porta do bagageiro (lado esquerdo)', o: 'Compartimento de bagagem atrás do banco traseiro, porta no lado esquerdo.' }
  },
  kwExtra: [['bleed valve|válvula de sangria|anti surge', ['motor']], ['blower|ventilador do radiador', ['radiador_oleo']]],
  exemplos: [
    'Lavagem do compressor do motor',
    'Inspeção dos detectores de limalha do motor e da transmissão',
    'Trocar as escovas do starter generator',
    'Inspeção das pás do rotor principal e dos batentes do cubo',
    'Inspeção dos mancais do eixo do rotor de cauda',
    'Inspeção dos tubos transversais e dos esquis'
  ],
  programa: (G) => {
    const extra = (titulo, tarefas) => [{ s: 'Itens típicos (ilustrativos)', c: [], t: tarefas }, { s: 'Tarefas a incorporar do BHT-206B-MM', c: [], t: [['Lista oficial da inspeção de ' + titulo + ' – extrair do Cap. 5 do BHT-206B-MM (pasta manuais/206).', 'N/A', '—', []]] }];
    return [
      { id: '100h', h: 100, nome: '100 h / 12 meses (periódica)', nota: 'Inspeção periódica: o que ocorrer primeiro. Conteúdo ilustrativo até incorporar o BHT-206B-MM.', g: [G.rp, G.trans, G.mot, G.rc, G.cmd, G.sis, G.est] },
      { id: '300h', h: 300, nome: '300 horas', nota: 'Itens complementares (ilustrativos).', g: extra('300 h', [
        ['Inspeção e medição das escovas do starter-generator.', 'Capô do motor', '700', ['gerador']],
        ['Lubrificação dos mancais do eixo do rotor de cauda (se aplicável) e inspeção das etiquetas de temperatura.', 'Tampas do eixo', '500', ['eixo_rc']],
        ['Inspeção da válvula de sangria do compressor (bleed valve).', 'Capô do motor', '700', ['motor']]]) },
      { id: '600h', h: 600, nome: '600 horas', nota: 'Itens complementares (ilustrativos).', g: extra('600 h', [
        ['Inspeção detalhada do mastro e da porca do mastro.', 'Carenagem da transmissão', '600', ['mastro']],
        ['Inspeção detalhada do swashplate e dos rolamentos.', 'Carenagem da transmissão', '600', ['swash']]]) },
      { id: '1200h', h: 1200, nome: '1200 horas', nota: 'Itens complementares (ilustrativos).', g: extra('1200 h', [
        ['Inspeção detalhada dos isoladores do pilone e do batente.', 'Carenagem da transmissão', '600', ['suporte_trans']],
        ['Inspeção detalhada da caixa do rotor de cauda e do eixo de saída.', 'N/A', '500', ['caixa_rc']]]) }
    ];
  },
  anacModelo: { g: 'Bell 206B – particularidades do modelo', i: [
    { ref: 'Motor 250-C20J (Série II)', t: 'Compressor de 6 estágios axiais + 1 centrífugo, câmara de combustão única de fluxo reverso, turbina do gerador de gás de 2 estágios e turbina livre de 2 estágios com caixa de redução dupla. Controle hidromecânico: o piloto controla a partida e protege a TOT (sem FADEC).', c: ['motor'] },
    { ref: 'Limites de TOT', t: 'Contínuo 738 °C; decolagem 810 °C (5 min); transitório 843 °C (6 s); partida 810–927 °C por até 10 s e 927 °C por no máximo 1 s (fontes secundárias – confirmar no RFM).', c: ['motor'] },
    { ref: 'Pressão de óleo do motor', t: 'Mínimos por faixa de N1: 50 psi abaixo de ~79%, 90 psi até ~94%; acima disso 90 ou 115 psi conforme a fonte; máximo 130 psi. As fontes secundárias divergem – confirmar no RFM.', c: ['motor'] }] },
  info: { fonte: 'Prévia – NZ CAA TAR 11/21B/22 (motor) e fontes públicas' }
});
