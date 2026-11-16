/* Bell 429 – regulamentação ANAC (resumo orientativo) e controle de manutenção por horas.
   Não é texto legal: confirme sempre a emenda vigente em anac.gov.br. */
(function () {
  // l: liga a uma inspeção do MPI (id) | c: componentes a destacar no modelo
  const ANAC = [
    { g: 'Tipos de manutenção', i: [
      { ref: 'Preventiva (programada)', t: 'Inspeções e tarefas com intervalo definido em horas, ciclos, RIN ou calendário. No Bell 429 o programa é o do BHT-429-MPI (metodologia MSG-3): abas “Inspeções” e “Controle”.' },
      { ref: 'Preditiva (por condição)', t: 'Acompanhamento de tendência para agir antes da falha: detectores de limalha e análise de óleo (transmissão, caixa do rotor de cauda, motores), vibração / track & balance dos rotores, power assurance e boroscopia dos motores, excedências gravadas nos displays.', c: ['transmissao', 'caixa_rc', 'motor_1', 'motor_2', 'pas_rp', 'rotor_cauda', 'painel'] },
      { ref: 'Corretiva / condicional', t: 'Correção de discrepâncias e inspeções após eventos anormais (pouso duro, sobretorque, raio etc.): aba “Eventos”.' }
    ] },
    { g: 'RBAC 91 – Subparte E (manutenção, manutenção preventiva e alterações)', i: [
      { ref: '91.403', t: 'O proprietário ou operador é o responsável primário por manter a aeronave aeronavegável, inclusive pelo cumprimento das Diretrizes de Aeronavegabilidade (RBAC 39).' },
      { ref: '91.405', t: 'Manutenção requerida: fazer as inspeções previstas, corrigir discrepâncias entre inspeções e garantir os registros de aprovação para retorno ao serviço.' },
      { ref: '91.407', t: 'Operação após manutenção: só voar depois da aprovação para retorno ao serviço por pessoa autorizada e do registro correspondente.' },
      { ref: '91.409', t: 'Inspeções: define a inspeção anual, a inspeção de 100 horas (quando aplicável ao tipo de operação) e a alternativa de seguir um programa de inspeção – para helicópteros a turbina, tipicamente o programa recomendado pelo fabricante (aqui, o BHT-429-MPI).', l: '50h' },
      { ref: '91.411 / 91.413', t: 'Testes de altímetro / sistema estático e de transponder ATC em intervalos de 24 meses. No MPI correspondem às tarefas 341001–341004 e 345001 da inspeção de 2 anos.', l: '2a', c: ['pitot', 'avionica', 'painel'] },
      { ref: '91.207', t: 'Transmissor localizador de emergência (ELT): inspeção periódica e troca da bateria. No MPI: tarefa 256001 (12 meses) e 256002 (bateria, conforme autoridade).', l: '12m', c: ['avionica_tras'] },
      { ref: '91.417', t: 'Registros de manutenção: tempo total em serviço, situação das peças com vida limite, tempo desde a última revisão geral, situação das inspeções e das DA aplicáveis.' }
    ] },
    { g: 'RBAC 43 – Manutenção, manutenção preventiva, reconstrução e alteração', i: [
      { ref: '43.3 / 43.7', t: 'Quem pode executar manutenção e quem pode aprovar o retorno ao serviço (organização certificada RBAC 145, mecânico habilitado RBAC 65 dentro de suas prerrogativas, operador certificado).' },
      { ref: '43.9 / 43.11', t: 'Conteúdo e forma dos registros de manutenção e de inspeção: descrição do trabalho, data, identificação e assinatura de quem executou e aprovou; lista de discrepâncias quando a aeronave não é aprovada.' },
      { ref: '43.13', t: 'Regras de execução: usar métodos, técnicas e práticas do manual de manutenção atualizado do fabricante, com ferramentas e materiais adequados, devolvendo a aeronave à condição original.' },
      { ref: '43.15 / Apêndice D', t: 'Regras adicionais para inspeções; o Apêndice D lista o escopo mínimo das inspeções anual e de 100 horas (fuselagem, cabine, motor, trem de pouso, rotores, rádio etc.).' }
    ] },
    { g: 'Outros regulamentos ligados ao controle de manutenção', i: [
      { ref: 'RBAC 145', t: 'Organizações de manutenção de produto aeronáutico: certificação, especificações operativas, pessoal, dados técnicos e registros.' },
      { ref: 'RBAC 135 – Subparte J', t: 'Operações de táxi aéreo: responsabilidade do operador pela aeronavegabilidade, programa de manutenção / inspeção aprovado e manual de manutenção do operador.' },
      { ref: 'RBAC 65', t: 'Licenças e habilitações de mecânico de manutenção aeronáutica (célula, grupo motopropulsor e aviônicos).' },
      { ref: 'RBAC 39', t: 'Diretrizes de Aeronavegabilidade: cumprimento obrigatório; o MPI pede a verificação de AD e ASB em toda inspeção (itens gerais).' },
      { ref: 'CVA', t: 'Certificado de Verificação de Aeronavegabilidade: verificação periódica da condição e dos registros da aeronave (consultar a Instrução Suplementar vigente sobre CVA).' }
    ] },
    { g: 'ANAC – Relatório de Avaliação Operacional do Bell 429 (Rev. 4, 23/04/2016)', i: [
      { ref: 'MEL', t: 'O GAA recomenda a MMEL da autoridade canadense (TCCA) como base para a MEL do operador.' },
      { ref: 'RFM', t: 'O manual de voo deve conter o Suplemento para Helicópteros de Registro Brasileiro (limitações CNS/ATM e placares).' },
      { ref: 'Configuração', t: 'Certificado para piloto único: configuração padrão com comandos apenas no lado direito e dois displays (centro e direita). Duplo comando e terceiro display são opcionais.', c: ['comandos', 'painel', 'assentos_trip'] },
      { ref: 'Operações', t: 'Certificado para operações Categoria A. Operações aeromédicas (EMS) e de carga externa não fazem parte da certificação de tipo no Brasil. Sem pendências nos checklists de conformidade RBHA 91 / RBAC 135.' }
    ] }
  ];

  // Controle por horas de voo. origem 'mpi' = intervalo do BHT-429-MPI; 'op' = definido pelo operador / outro requisito.
  const CONTROLE = [
    { id: 'c10', h: 10, nome: '10 horas', origem: 'op' },
    { id: 'c30', h: 30, nome: '30 horas', origem: 'op' },
    { id: 'c40', h: 40, nome: '40 horas', origem: 'op' },
    { id: 'c50', h: 50, nome: '50 horas', origem: 'mpi', insp: '50h' },
    { id: 'c100', h: 100, nome: '100 horas', origem: 'op', obs: 'RBAC 91.409, quando aplicável' },
    { id: 'c200', h: 200, nome: '200 horas / 12 meses', origem: 'mpi', insp: '200h' },
    { id: 'c400', h: 400, nome: '400 horas', origem: 'mpi', insp: '400h' },
    { id: 'c600', h: 600, nome: '600 horas / 12 meses', origem: 'mpi', insp: '600h' },
    { id: 'c800', h: 800, nome: '800 horas', origem: 'mpi', insp: '800h' }
  ];

  Object.assign(window.HELI, { ANAC, CONTROLE });
})();
