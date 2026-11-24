// HeliSense 3D – catálogo de modelos (tecnologias) de sensor para cada medição, componente e área da aeronave (domínio).
// Cada sensor definido em sensores.js/monomotor.js recebe a tecnologia adequada pela grandeza medida e pelo contexto
// (nome do sensor e componente). Para cada tecnologia: princípio, faixa e taxa típicas, saída, condicionamento, fixação,
// ambiente, por que serve à manutenção preditiva e um equivalente de BANCADA para o protótipo de pesquisa.
// ATENÇÃO: valores típicos de engenharia para orientar a pesquisa; não são especificação de instalação. Sensor instalado
// em aeronave exige projeto aprovado (ANAC/RBAC 21, alteração maior ou CST) e qualificação ambiental (RTCA DO-160).
// Os módulos de bancada citados são componentes comerciais de uso geral (protótipo em laboratório), não aeronáuticos.

export const TECNOLOGIAS = {
  acel_iepe: {
    nome: 'Acelerômetro piezoelétrico IEPE', grandeza: 'Vibração', principio: 'Cristal piezoelétrico com eletrônica integrada (IEPE/ICP) gera tensão proporcional à aceleração.',
    faixa: '±50 g · 100 mV/g · 0,5 Hz a 10 kHz', amostragem: '≥ 25 kHz por canal (2,5× a banda útil) para espectro e ordens',
    saida: 'Tensão AC sobre corrente constante (2–20 mA) em cabo coaxial', condicionamento: 'Fonte IEPE, filtro anti-aliasing, ADC 24 bits; velocidade RMS (ips) por integração; tacômetro para análise por ordem (1/rev, n/rev)',
    fixacao: 'Prisioneiro (stud) em bloco usinado ou colado com adesivo rígido, eixo de medição alinhado à carga', ambiente: '−50 a 120 °C; cabo blindado; vibração e choque por DO-160 seção 8',
    preditiva: 'Desbalanceamento, desalinhamento, folga e falha incipiente de rolamentos e engrenagens aparecem no espectro antes de virar falha.',
    bancada: 'Acelerômetro IEPE + condicionador, ou MEMS de baixo ruído ADXL355 (SPI) em ESP32/STM32 para baixa frequência', custo: 'alto'
  },
  acel_mems: {
    nome: 'Acelerômetro MEMS triaxial digital', grandeza: 'Vibração (baixa frequência) / atitude', principio: 'Massa de prova capacitiva em silício; leitura digital nos três eixos.',
    faixa: '±2 a ±16 g · até ~1,6–3,2 kHz de taxa de saída', amostragem: '1–4 kHz', saida: 'SPI ou I²C',
    condicionamento: 'Microcontrolador; FFT embarcada; envio de RMS e picos', fixacao: 'Placa aparafusada em suporte rígido', ambiente: '−40 a 85 °C (comercial)',
    preditiva: 'Monitoramento contínuo e barato de tendência de vibração em pontos de baixa rotação.', bancada: 'ADXL355 ou similar em ESP32', custo: 'baixo'
  },
  tracking_optico: {
    nome: 'Sensor óptico de tracking das pás + tacômetro', grandeza: 'Tracking / plano de rotação', principio: 'Câmera ou sensor óptico mede a altura de cada pá na passagem; tacômetro magnético marca a posição angular.',
    faixa: '±50 mm de diferença de altura · resolução ~1 mm', amostragem: '1 leitura por passagem de pá', saida: 'Digital (pulsos e dados seriais)',
    condicionamento: 'Sincronização com o pulso 1/rev; média por pá', fixacao: 'Suporte temporário na fuselagem apontado para o disco do rotor; alvo refletivo nas pás', ambiente: 'Uso em solo ou em voo de teste',
    preditiva: 'A deriva do tracking indica desgaste de amortecedores, pitch links e deformação de pá.', bancada: 'Sensor óptico reflexivo + sensor Hall no eixo de um rotor de bancada', custo: 'alto'
  },
  lvdt: {
    nome: 'Transdutor de deslocamento LVDT', grandeza: 'Deslocamento', principio: 'Transformador diferencial com núcleo móvel; tensão de saída proporcional à posição.',
    faixa: '±5 a ±25 mm · linearidade ~0,25 %', amostragem: '100 Hz–1 kHz', saida: 'AC (excitação) ou DC com eletrônica integrada (4–20 mA / 0–10 V)',
    condicionamento: 'Demodulador síncrono ou LVDT DC; ADC 16–24 bits', fixacao: 'Corpo preso na estrutura, haste no elemento móvel (ex.: entre viga do pilone e suporte)', ambiente: 'Robusto, sem contato elétrico deslizante',
    preditiva: 'Aumento do curso ou deslocamento estático mostra desgaste de coxins e folga estrutural.', bancada: 'Potenciômetro linear ou sensor indutivo + ADS1115 em ESP32', custo: 'médio'
  },
  termopar_k: {
    nome: 'Termopar tipo K (gases quentes)', grandeza: 'Temperatura alta', principio: 'Junção cromel–alumel gera tensão termoelétrica proporcional à temperatura.',
    faixa: '−200 a 1250 °C · ±2,2 °C ou 0,75 %', amostragem: '1–10 Hz', saida: 'mV (compensação de junta fria)',
    condicionamento: 'Amplificador com compensação de junta fria; média de vários termopares em paralelo (como a MGT/TOT do motor)', fixacao: 'Sondas na seção da turbina/escape, conforme o fabricante do motor', ambiente: 'Até 1100 °C na ponta',
    preditiva: 'Margem de temperatura (MGT/TOT) caindo ao longo do tempo indica perda de desempenho do motor.', bancada: 'Termopar K + MAX31856 (SPI)', custo: 'baixo'
  },
  rtd_pt100: {
    nome: 'Termorresistência Pt100 classe A (fluido)', grandeza: 'Temperatura de óleo/fluido', principio: 'Resistência de platina varia de forma quase linear com a temperatura (100 Ω a 0 °C).',
    faixa: '−50 a 200 °C · ±0,15 °C + 0,002|t|', amostragem: '1–10 Hz', saida: 'Resistência (ligação a 3 ou 4 fios)',
    condicionamento: 'Conversor RTD-digital com fonte de corrente e compensação dos fios', fixacao: 'Poço termométrico (thermowell) roscado na carcaça/linha de óleo', ambiente: 'Imersa no óleo; vedação por anel',
    preditiva: 'Subida lenta da temperatura do óleo indica atrito crescente, radiador sujo ou óleo degradado.', bancada: 'Pt100 + MAX31865 (SPI)', custo: 'baixo'
  },
  rtd_superficie: {
    nome: 'Sensor de temperatura de superfície (RTD/termopar de contato)', grandeza: 'Temperatura de mancal/carcaça', principio: 'Elemento fino (RTD de filme ou termopar) colado ou preso por abraçadeira na carcaça do rolamento.',
    faixa: '−50 a 200 °C', amostragem: '1 Hz', saida: 'Resistência ou mV',
    condicionamento: 'Conversor RTD/termopar; também possível sensor infravermelho sem contato para partes que giram', fixacao: 'Colado com adesivo térmico ou abraçadeira no alojamento do mancal (hanger bearing, gerador)', ambiente: 'Superfície externa',
    preditiva: 'Rolamento com lubrificação deficiente aquece antes de travar; a tendência dá antecedência.', bancada: 'Pt100 de filme + MAX31865, ou termopar + MAX31856; sensor IR MLX90614 para eixo girante', custo: 'baixo'
  },
  ntc: {
    nome: 'Termistor NTC', grandeza: 'Temperatura (baixo custo)', principio: 'Resistência cai com a temperatura (curva exponencial, equação de Steinhart–Hart).',
    faixa: '−40 a 125 °C', amostragem: '1 Hz', saida: 'Resistência (divisor de tensão)', condicionamento: 'ADC + linearização', fixacao: 'Colado na carcaça', ambiente: 'Componentes eletrônicos e baterias',
    preditiva: 'Aquecimento de componentes elétricos (baterias, conversores) antes da falha.', bancada: 'NTC 10 kΩ no ADC do ESP32', custo: 'muito baixo'
  },
  pressao_piezo: {
    nome: 'Transdutor de pressão piezorresistivo', grandeza: 'Pressão de óleo/fluido', principio: 'Membrana com ponte de extensômetros de silício; deformação proporcional à pressão.',
    faixa: '0–100 ou 0–300 psi · ±0,25 % FS', amostragem: '10–100 Hz', saida: '4–20 mA (preferível em cabo longo) ou 0,5–4,5 V ratiométrico',
    condicionamento: 'Resistor de carga + ADC; filtro para pulsação da bomba', fixacao: 'Rosca na tomada de pressão da linha/carcaça, com vedação', ambiente: 'Óleo a até ~150 °C; vibração',
    preditiva: 'Queda gradual de pressão indica desgaste da bomba, vazamento ou filtro obstruído.', bancada: 'Transdutor 0,5–4,5 V + ADS1115 em ESP32', custo: 'médio'
  },
  pressao_diferencial: {
    nome: 'Transdutor de pressão diferencial', grandeza: 'Pressão diferencial (filtros)', principio: 'Membrana entre duas tomadas mede a diferença de pressão antes e depois do filtro.',
    faixa: '0–20 inH₂O (ar) ou 0–50 psid (óleo/combustível)', amostragem: '1–10 Hz', saida: '4–20 mA ou digital (I²C)',
    condicionamento: 'ADC; correção de temperatura', fixacao: 'Tomadas a montante e a jusante do elemento filtrante', ambiente: 'Entrada de ar do motor ou linha de fluido',
    preditiva: 'O ΔP sobe à medida que o filtro satura: dá para prever a troca antes do bypass.', bancada: 'Sensor diferencial digital (I²C) em ESP32', custo: 'médio'
  },
  torque_fase: {
    nome: 'Torquímetro do eixo (defasagem ou extensômetro)', grandeza: 'Torque', principio: 'Mede a torção do eixo: defasagem entre duas rodas fônicas ou extensômetros na árvore com telemetria.',
    faixa: '0–120 % do torque nominal', amostragem: '10–100 Hz', saida: 'Normalmente já disponível no barramento da aeronave (ARINC 429 / FADEC)',
    condicionamento: 'Leitura do barramento em vez de sensor novo', fixacao: 'Integrado à caixa de redução/motor', ambiente: 'Original da aeronave',
    preditiva: 'Base para contar eventos de sobretorque e consumo de vida dos componentes dinâmicos.', bancada: 'Extensômetros em ponte completa num eixo de bancada + HX711, ou simulação do sinal', custo: 'alto (se novo)'
  },
  rpm_relutancia: {
    nome: 'Sensor de rotação de relutância variável / Hall', grandeza: 'Rotação (Ng, Np, Nr)', principio: 'Dentes de uma roda fônica passando pela bobina (ou sensor Hall) geram pulsos com frequência proporcional à rotação.',
    faixa: '0–120 % de rotação nominal', amostragem: 'contagem de pulsos (frequência)', saida: 'Pulsos / frequência',
    condicionamento: 'Comparador e contador de frequência', fixacao: 'Já instalado no motor/transmissão; sinal lido do barramento', ambiente: 'Original da aeronave',
    preditiva: 'Referência de rotação para análise por ordem da vibração e para normalizar as demais medições.', bancada: 'Sensor Hall + ímã em eixo de bancada, entrada de interrupção do ESP32', custo: 'baixo'
  },
  nivel_capacitivo: {
    nome: 'Sensor de nível capacitivo', grandeza: 'Nível / quantidade', principio: 'Capacitância entre eletrodos varia com a altura do fluido.',
    faixa: '0–100 %', amostragem: '1 Hz', saida: 'Frequência ou analógica', condicionamento: 'Correção por densidade/temperatura', fixacao: 'Sonda no tanque/reservatório', ambiente: 'Imersa',
    preditiva: 'Consumo de óleo acima do normal entre reabastecimentos indica vazamento ou desgaste interno.', bancada: 'Sensor capacitivo sem contato no reservatório de bancada', custo: 'médio'
  },
  strain_gauge: {
    nome: 'Extensômetro de resistência (strain gauge)', grandeza: 'Deformação', principio: 'Grade metálica colada na peça muda de resistência com a deformação (fator ~2).',
    faixa: '±3000 µε · 350 Ω', amostragem: '100 Hz–2 kHz', saida: 'Ponte de Wheatstone (mV/V)',
    condicionamento: 'Ponte completa ou meia ponte com compensação térmica, amplificador de instrumentação, ADC 24 bits', fixacao: 'Colado com adesivo de cianoacrilato/epóxi na superfície preparada, protegido por verniz', ambiente: 'Superfície estrutural',
    preditiva: 'Ciclos de carga contados (rainflow) estimam o dano por fadiga acumulado na estrutura.', bancada: 'Extensômetro 350 Ω em ponte + HX711 ou ADS1220', custo: 'baixo (sensor) / médio (instalação)'
  },
  acel_impacto: {
    nome: 'Acelerômetro de choque (pouso duro)', grandeza: 'Aceleração vertical', principio: 'Acelerômetro (MEMS ou piezorresistivo) de faixa alta registra o pico no toque.',
    faixa: '±10 a ±50 g · DC a 1 kHz', amostragem: '≥ 1 kHz com captura de pico', saida: 'Analógica ou digital',
    condicionamento: 'Detector de pico e registro do evento com horário', fixacao: 'Estrutura próxima ao trem de pouso / centro de gravidade', ambiente: 'Choque',
    preditiva: 'Pousos duros acumulados aceleram o dano no trem de pouso e disparam inspeção condicional.', bancada: 'Acelerômetro MEMS de faixa alta em ESP32', custo: 'baixo'
  },
  celula_carga: {
    nome: 'Célula de carga em linha', grandeza: 'Força', principio: 'Elemento elástico com extensômetros mede a força transmitida por uma haste.',
    faixa: '0–500 N (comandos) · 0,1 % FS', amostragem: '100 Hz', saida: 'Ponte (mV/V)', condicionamento: 'Amplificador de ponte, ADC 24 bits',
    fixacao: 'Intercalada na haste de comando (instrumentação de ensaio)', ambiente: 'Interior da fuselagem',
    preditiva: 'Atrito crescente nos comandos indica falta de lubrificação ou desgaste de mancais e bellcranks.', bancada: 'Célula de carga + HX711', custo: 'médio'
  },
  corrente_hall: {
    nome: 'Transdutor de corrente por efeito Hall', grandeza: 'Corrente elétrica', principio: 'Campo magnético do condutor medido por sensor Hall, com isolação galvânica.',
    faixa: '0–400 A DC', amostragem: '10–100 Hz', saida: 'Tensão proporcional (0–5 V) ou digital', condicionamento: 'ADC; filtro',
    fixacao: 'Núcleo envolvendo o cabo (sem cortá-lo)', ambiente: 'Barramento elétrico',
    preditiva: 'Mudança no consumo de corrente de geradores, bombas e motores elétricos antecipa falhas.', bancada: 'ACS712/ACS758 ou INA226 (shunt) em ESP32', custo: 'baixo'
  },
  tensao_isolada: {
    nome: 'Medição de tensão isolada', grandeza: 'Tensão elétrica', principio: 'Divisor resistivo com amplificador isolador.',
    faixa: '0–32 V DC', amostragem: '10 Hz', saida: 'Analógica/digital', condicionamento: 'Isolação e filtro', fixacao: 'Barramento ou bornes da bateria', ambiente: 'Barramento elétrico',
    preditiva: 'Queda de tensão na partida e na carga revela bateria e gerador se degradando.', bancada: 'INA226 em ESP32', custo: 'baixo'
  },
  chip_detector: {
    nome: 'Detector de limalha (chip detector) e sensor de partículas em linha', grandeza: 'Partículas metálicas no óleo', principio: 'Ímã com dois contatos: limalha ferrosa fecha o circuito; o sensor em linha (indutivo) conta e classifica partículas ferrosas e não ferrosas pelo tamanho.',
    faixa: 'Discreto (contato) · em linha: partículas a partir de ~100 µm', amostragem: 'Evento / contagem contínua', saida: 'Discreto (contato) ou digital (contagem por classe)',
    condicionamento: 'Entrada discreta com antirruído; registro do horário e da contagem acumulada', fixacao: 'Plugue magnético no cárter ou sensor na linha de retorno do óleo', ambiente: 'Imerso no óleo',
    preditiva: 'A TAXA de geração de partículas cresce antes da falha de engrenagem ou rolamento: é um dos indicadores mais antecipados.', bancada: 'Contatos magnéticos + entrada digital; sensor indutivo de proximidade para simular contagem', custo: 'baixo (plugue) / alto (em linha)'
  },
  proximidade_indutivo: {
    nome: 'Sensor de proximidade indutivo', grandeza: 'Posição (aberto/fechado, travado)', principio: 'Campo de alta frequência detecta alvo metálico sem contato.',
    faixa: 'Alcance 2–8 mm', amostragem: 'Evento', saida: 'Discreto', condicionamento: 'Entrada digital', fixacao: 'Suporte junto à trava/porta/atuador', ambiente: 'Sem contato, robusto',
    preditiva: 'Tempo de atuação crescente ou intermitência indicam desgaste do mecanismo.', bancada: 'Sensor indutivo NPN/PNP em ESP32', custo: 'baixo'
  },
  interruptor_pressao_dif: {
    nome: 'Indicador de bypass / interruptor de pressão diferencial', grandeza: 'Filtro obstruído (discreto)', principio: 'Interruptor muda de estado quando o ΔP passa do valor ajustado.',
    faixa: 'Ajuste fixo (psid)', amostragem: 'Evento', saida: 'Discreto', condicionamento: 'Entrada digital', fixacao: 'Cabeçote do filtro', ambiente: 'Linha de fluido',
    preditiva: 'Sinal tardio sozinho; combinado ao transdutor de ΔP vira previsão de troca do filtro.', bancada: 'Interruptor de pressão em entrada digital', custo: 'baixo'
  },
  detector_fogo: {
    nome: 'Detector de fogo/superaquecimento', grandeza: 'Fogo / temperatura excessiva (discreto)', principio: 'Elemento sensor linear ou pontual muda de estado acima do limiar.',
    faixa: 'Limiar fixo', amostragem: 'Evento', saida: 'Discreto', condicionamento: 'Unidade de controle da aeronave', fixacao: 'Original da aeronave (compartimento do motor)', ambiente: 'Original',
    preditiva: 'Função de segurança, não preditiva: registrar o histórico de testes do circuito.', bancada: 'Simulado (entrada digital)', custo: '—'
  },
  discreto_generico: {
    nome: 'Discreto (contato / sinal de falha)', grandeza: 'Estado ligado/desligado', principio: 'Contato seco ou sinal lógico vindo do sistema da aeronave.',
    faixa: '—', amostragem: 'Evento', saida: 'Discreto', condicionamento: 'Entrada digital com antirruído', fixacao: 'Leitura do sistema existente', ambiente: 'Original',
    preditiva: 'A frequência de ocorrências (intermitência) ao longo do tempo é o indicador útil.', bancada: 'Entrada digital do ESP32', custo: 'baixo'
  },
  calculado: {
    nome: 'Parâmetro calculado', grandeza: 'Derivado de outras medições', principio: 'Calculado a partir de sensores existentes (razão, margem, contagem).',
    faixa: '—', amostragem: 'Mesma das medições de origem', saida: 'Software', condicionamento: '—', fixacao: '—', ambiente: '—',
    preditiva: 'Indicadores combinados costumam ser mais sensíveis que cada medição isolada.', bancada: 'Software', custo: '—'
  }
};

// nome das áreas principais quando o modelo não define a zona "x00" (zoneamento usado em todos os modelos do projeto)
export const AREAS_PADRAO = { '100': 'Nariz', '200': 'Cockpit e cabine', '300': 'Sob o piso', '400': 'Fuselagem traseira', '500': 'Cauda', '600': 'Transmissão e rotor principal', '700': 'Compartimento do motor', '800': 'Trem de pouso' };

const tem = (re, s) => re.test(`${s.id} ${s.n}`);
// tecnologia principal (e alternativa, quando houver) de um sensor
export function tecnologiaDe(s) {
  const u = String(s.un || '').trim();
  if (s.tipo === 'bool') {
    if (tem(/limalha|chip|part[ií]cula/i, s)) return ['chip_detector'];
    if (tem(/fogo|fire|superaquec/i, s)) return ['detector_fogo'];
    if (tem(/bypass|filtro/i, s)) return ['interruptor_pressao_dif', 'pressao_diferencial'];
    if (tem(/trava|porta|lock|posi[cç][aã]o|aberto|fechad/i, s)) return ['proximidade_indutivo'];
    return ['discreto_generico'];
  }
  if (u === 'ips') return tem(/radiador|ventilad|fan/i, s) ? ['acel_mems', 'acel_iepe'] : ['acel_iepe', 'acel_mems'];
  if (u === 'mm') return tem(/track/i, s) ? ['tracking_optico'] : ['lvdt'];
  if (u === '°C') {
    if (tem(/mgt|tot|itt|t4|g[aá]s|escape|turbina|exhaust/i, s)) return ['termopar_k'];
    if (tem(/[oó]leo|fluido|combust|hidr[aá]ul/i, s)) return ['rtd_pt100'];
    if (tem(/bateria|eletr[oô]n|avi[oô]n/i, s)) return ['ntc'];
    return ['rtd_superficie'];
  }
  if (u === 'psi') return ['pressao_piezo'];
  if (u === 'inH₂O' || /psid/i.test(u)) return ['pressao_diferencial'];
  if (u === '%') {
    if (tem(/torque/i, s)) return ['torque_fase'];
    if (tem(/n[ií]vel|quant|combust/i, s)) return ['nivel_capacitivo'];
    return ['rpm_relutancia'];
  }
  if (u === 'µε') return ['strain_gauge'];
  if (u === 'g') return ['acel_impacto'];
  if (u === 'N') return ['celula_carga'];
  if (u === 'A') return ['corrente_hall'];
  if (u === 'V') return ['tensao_isolada'];
  return ['calculado'];
}

// catálogo da aeronave agrupado por ÁREA (zona principal: 100, 200, …) → zona → componente → sensores com a tecnologia
export function catalogoPorArea(SENSORES, COMPS, ZONAS) {
  const areas = new Map();
  for (const s of SENSORES) {
    const tec = tecnologiaDe(s);
    for (const c of s.comp) {
      const comp = COMPS[c]; if (!comp) continue;
      const z = String(comp.z || '').split(/[\s,/]+/)[0] || '—', a = /^\d{3}$/.test(z) ? z[0] + '00' : '—';
      if (!areas.has(a)) areas.set(a, { area: a, nome: (ZONAS && ZONAS[a]) || AREAS_PADRAO[a] || 'Sem zona', zonas: new Map() });
      const A = areas.get(a);
      if (!A.zonas.has(z)) A.zonas.set(z, { zona: z, nome: (ZONAS && ZONAS[z]) || '', comps: new Map() });
      const Z = A.zonas.get(z);
      if (!Z.comps.has(c)) Z.comps.set(c, { id: c, nome: comp.n, ata: comp.ata, itens: [] });
      Z.comps.get(c).itens.push({ s, tec });
    }
  }
  return [...areas.values()].sort((x, y) => x.area.localeCompare(y.area)).map((A) => ({
    ...A, zonas: [...A.zonas.values()].sort((x, y) => x.zona.localeCompare(y.zona)).map((Z) => ({ ...Z, comps: [...Z.comps.values()] }))
  }));
}

// resumo: quantos pontos de medição usam cada tecnologia
export function resumoTecnologias(SENSORES) {
  const r = {};
  for (const s of SENSORES) { const t = tecnologiaDe(s)[0]; r[t] = (r[t] || 0) + 1; }
  return Object.entries(r).sort((a, b) => b[1] - a[1]).map(([id, n]) => ({ id, n, ...TECNOLOGIAS[id] }));
}
