// HeliSense 3D – índice do Atlas Visual de Helicópteros (fichas 001 a 120) e ligação com as peças (domínio).
// As imagens tratadas em alta definição ficam em dados/atlas/ (ficha_NNN.webp e miniaturas em dados/atlas/mini/),
// fora do git. Material de estudo com representações conceituais: consulte sempre a documentação da aeronave.

export const CAPITULOS = [
  [1, 10, 'Visão geral e estrutura'], [11, 20, 'Aerodinâmica do voo'], [21, 30, 'Rotor principal'],
  [31, 40, 'Comandos de voo'], [41, 50, 'Rotor de cauda e antitorque'], [51, 60, 'Transmissão'],
  [61, 70, 'Motor a pistão'], [71, 80, 'Motor turboeixo'], [81, 95, 'Combustível, hidráulica e elétrica'],
  [96, 100, 'Instrumentos e aviônicos'], [101, 110, 'Desempenho e limites'], [111, 120, 'Conservação e registros']
];

export const FICHAS = {
  1: 'Anatomia do helicóptero', 2: 'O helicóptero por dentro', 3: 'Fuselagem e estrutura', 4: 'Cabine e posto de pilotagem',
  5: 'Cone de cauda e empenagens', 6: 'Trem de pouso', 7: 'Configurações de rotores', 8: 'A pistão ou a turbina?',
  9: 'Caminho da energia', 10: 'Mapa integrado dos sistemas', 11: 'Forças que atuam no voo', 12: 'Anatomia do perfil da pá',
  13: 'Passo e ângulo de ataque', 14: 'Vento relativo', 15: 'Disco do rotor', 16: 'Fluxo induzido e downwash',
  17: 'Torque e reação da fuselagem', 18: 'Voo pairado', 19: 'Efeito solo', 20: 'Sustentação translacional',
  21: 'Anatomia do rotor principal', 22: 'Construção das pás', 23: 'Torção e formato das pás', 24: 'Cubo e mastro',
  25: 'Rotor semirrígido', 26: 'Rotor articulado', 27: 'Rotores rígidos e flexíveis', 28: 'Batimento das pás',
  29: 'Avanço, atraso e mudança de passo', 30: 'Conicidade do rotor', 31: 'Os três comandos principais', 32: 'Comando coletivo',
  33: 'Comando cíclico', 34: 'Pedais e controle de guinada', 35: 'Prato oscilante', 36: 'Bielas, hastes e articulações',
  37: 'Assistência hidráulica', 38: 'Compensação e force trim', 39: 'Governador e correlacionador', 40: 'Integração dos comandos',
  41: 'Anatomia do rotor de cauda', 42: 'Passo do rotor de cauda', 43: 'Transmissão para a cauda', 44: 'Eixos e acoplamentos',
  45: 'Caixas de transmissão traseiras', 46: 'Rotor de cauda carenado', 47: 'Sistema NOTAR', 48: 'Rotores coaxiais',
  49: 'Rotores em tandem', 50: 'Comparativo dos sistemas antitorque', 51: 'Anatomia da transmissão', 52: 'Caixa de transmissão principal',
  53: 'Redução de rotação', 54: 'Engrenagens', 55: 'Embreagens', 56: 'Acionamento por correias', 57: 'Unidade de roda livre',
  58: 'Lubrificação da transmissão', 59: 'Rolamentos e acoplamentos', 60: 'Freio do rotor', 61: 'Anatomia do motor a pistão',
  62: 'Ciclo de quatro tempos', 63: 'Pistões, bielas e virabrequim', 64: 'Válvulas e comando', 65: 'Admissão e filtragem',
  66: 'Carburador e injeção', 67: 'Sistema de ignição', 68: 'Lubrificação do motor', 69: 'Arrefecimento do motor',
  70: 'Escape e monitoramento', 71: 'Anatomia do motor turboeixo', 72: 'O caminho do ar', 73: 'Compressores',
  74: 'Câmara de combustão', 75: 'Turbinas', 76: 'Turbina livre e eixo único', 77: 'Redução e saída de potência',
  78: 'Controle de combustível e FADEC', 79: 'Lubrificação e acessórios', 80: 'Parâmetros do turboeixo', 81: 'Sistema de combustível',
  82: 'Tanques e ventilação', 83: 'Bombas e alimentação', 84: 'Filtros e contaminação', 85: 'Válvulas e indicação',
  86: 'Sistema hidráulico', 87: 'Pressão, retorno e filtragem', 88: 'Redundância e independência', 89: 'Ventilação e climatização',
  90: 'Gelo e proteção dos sistemas', 91: 'Sistema elétrico', 92: 'Baterias aeronáuticas', 93: 'Geradores e alternadores',
  94: 'Barramentos e proteções', 95: 'Partida e ignição', 96: 'Sistema pitot-estático', 97: 'Atitude, rumo e navegação',
  98: 'Comunicação e aviônicos', 99: 'Alertas e indicações', 100: 'Integração dos instrumentos', 101: 'Potência requerida e disponível',
  102: 'Peso e centro de gravidade', 103: 'Altitude-densidade', 104: 'Desempenho em pairado', 105: 'Voo à frente e arrasto',
  106: 'Autorrotação', 107: 'Vibrações e suas fontes', 108: 'Assimetria e limites das pás', 109: 'Estado de anel de vórtices',
  110: 'Leitura integrada do desempenho', 111: 'Conservação e condição técnica', 112: 'Corrosão', 113: 'Fadiga, trincas e desgaste',
  114: 'Vazamentos e vedações', 115: 'Fixações, linhas e conexões', 116: 'Observação e registro', 117: 'Documentação técnica',
  118: 'Rastreabilidade e histórico', 119: 'Revisão integrada dos sistemas', 120: 'Mapa final do atlas'
};

// Peças do MOTOR (ids de motor3d.js) → fichas do atlas e termo de busca nos manuais Bell (em inglês, como no manual)
export const PECAS_MOTOR = {
  entrada: { fichas: [72, 71, 90], busca: 'inlet' },
  compressor: { fichas: [73, 72, 71], busca: 'compressor' },
  compressor_axial: { fichas: [73, 72], busca: 'compressor' },
  rotor_axial: { fichas: [73], busca: 'compressor rotor' },
  impulsor: { fichas: [73], busca: 'impeller' },
  sangria: { fichas: [73, 80], busca: 'bleed valve' },
  tubos_descarga: { fichas: [72, 74], busca: 'discharge tube' },
  combustao: { fichas: [74, 72, 71], busca: 'combustion' },
  camisa: { fichas: [74], busca: 'combustion liner' },
  bico_injetor: { fichas: [74, 78, 81], busca: 'fuel nozzle' },
  ignitor: { fichas: [95, 74], busca: 'igniter' },
  turbina_gp: { fichas: [75, 76, 71], busca: 'gas producer turbine' },
  turbina: { fichas: [75, 76], busca: 'turbine' },
  turbina_livre: { fichas: [76, 75, 77], busca: 'power turbine' },
  carcaca_tl: { fichas: [76, 75], busca: 'turbine support' },
  termopares: { fichas: [80, 75, 99], busca: 'thermocouple' },
  escape: { fichas: [70, 72, 80], busca: 'exhaust' },
  coletor_escape: { fichas: [70, 72], busca: 'exhaust collector' },
  caixa_reducao: { fichas: [77, 53, 54], busca: 'reduction gearbox' },
  caixa_acessorios: { fichas: [79, 77], busca: 'accessory gearbox' },
  eixo_saida: { fichas: [77, 44, 57], busca: 'output shaft' },
  controle_comb: { fichas: [78, 81, 85], busca: 'fuel control' },
  ecu: { fichas: [78, 99, 100], busca: 'FADEC' },
  gerador: { fichas: [93, 95, 91], busca: 'starter generator' },
  oleo: { fichas: [79, 68, 84], busca: 'oil' },
  suportes: { fichas: [115, 3], busca: 'engine mount' }
};

// Componentes do HELICÓPTERO (ids dos COMPS) → fichas e termo de busca
export const COMPONENTES = {
  fuselagem: { fichas: [3, 1, 2], busca: 'fuselage' }, nariz: { fichas: [3, 4], busca: 'nose' },
  fus_traseira: { fichas: [3, 5], busca: 'aft fuselage' }, cone_cauda: { fichas: [5, 43], busca: 'tailboom' },
  carenagem_diant: { fichas: [3], busca: 'cowling' }, carenagem_trans: { fichas: [3, 52], busca: 'transmission cowling' },
  carenagem_motor: { fichas: [3, 71], busca: 'engine cowling' }, carenagem_escape: { fichas: [70, 3], busca: 'exhaust fairing' },
  parabrisa: { fichas: [4, 90], busca: 'windshield' }, janelas: { fichas: [4], busca: 'window' }, porta_bag: { fichas: [3], busca: 'baggage door' },
  piso: { fichas: [3, 102], busca: 'floor' }, painel: { fichas: [4, 100, 99], busca: 'instrument panel' },
  avionica: { fichas: [98, 97, 100], busca: 'avionics' }, avionica_tras: { fichas: [98], busca: 'avionics' },
  bateria: { fichas: [92, 91, 94], busca: 'battery' }, gerador: { fichas: [93, 91], busca: 'generator' },
  comandos: { fichas: [31, 32, 33, 36, 37], busca: 'flight control' }, comandos_rc: { fichas: [34, 42], busca: 'tail rotor control' },
  assentos_trip: { fichas: [4], busca: 'seat' }, assentos_pax: { fichas: [2], busca: 'seat' },
  pitot: { fichas: [96], busca: 'pitot' }, luzes: { fichas: [91, 94], busca: 'light' }, antenas: { fichas: [98], busca: 'antenna' },
  extintor: { fichas: [2, 117], busca: 'fire extinguisher' }, combustivel: { fichas: [81, 82, 83, 84, 85], busca: 'fuel' },
  hidraulico: { fichas: [86, 87, 37, 88], busca: 'hydraulic' }, pas_rp: { fichas: [22, 23, 12, 108], busca: 'main rotor blade' },
  cubo_rp: { fichas: [21, 24, 25, 26], busca: 'main rotor hub' }, swash: { fichas: [35, 36, 33], busca: 'swashplate' },
  mastro: { fichas: [24, 21], busca: 'mast' }, transmissao: { fichas: [52, 51, 53, 54, 58], busca: 'transmission' },
  suporte_trans: { fichas: [52, 59], busca: 'pylon' }, eixo_motor: { fichas: [44, 57, 59], busca: 'driveshaft' },
  radiador_oleo: { fichas: [79, 58], busca: 'oil cooler' }, motor: { fichas: [71, 72, 75, 78], busca: 'engine' },
  motor_1: { fichas: [71, 72, 75, 78], busca: 'engine' }, motor_2: { fichas: [71, 72, 75, 78], busca: 'engine' },
  entrada_ar: { fichas: [72, 65, 90], busca: 'inlet' }, escapamento: { fichas: [70, 72], busca: 'exhaust' },
  eixo_rc: { fichas: [43, 44], busca: 'tail rotor driveshaft' }, caixa_rc: { fichas: [45, 43], busca: 'tail rotor gearbox' },
  rotor_cauda: { fichas: [41, 42], busca: 'tail rotor' }, estabilizador: { fichas: [5], busca: 'horizontal stabilizer' },
  deriva: { fichas: [5], busca: 'vertical fin' }, esquis: { fichas: [6], busca: 'landing gear' },
  tubo_diant: { fichas: [6], busca: 'crosstube' }, tubo_tras: { fichas: [6], busca: 'crosstube' }
};

export const capituloDe = (n) => (CAPITULOS.find(([a, b]) => n >= a && n <= b) || [0, 0, ''])[2];
export const arquivoFicha = (n, mini = false) => `dados/atlas/${mini ? 'mini/' : ''}ficha_${String(n).padStart(3, '0')}.webp`;
