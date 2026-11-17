/* Manutenção Interativa – catálogo dos modelos (usado pelo painel, pelo manual e pela página do motor).
   Para acrescentar um modelo: crie modelos/<id>/ com dados.js (e sensores/anac se quiser separar), motor.js,
   inclua a forma 3D em modelo.js (FORMAS), a configuração de comandos/painel em modelos/comandos.js e acrescente a entrada abaixo.
   Os índices dos manuais Bell (procedimentos com link para o portal) ficam em interno/ – fora do git. */
window.CATALOGO = [
  {
    id: '505', nome: 'Bell 505 Jet Ranger X', curto: '505', ano: '2017',
    motor: 'Safran Arrius 2R', fadec: 'FADEC de dois canais com reserva', config: '1 turboeixo (monomotor)', potencia: '~505 SHP',
    rotor: '2 pás (semirrígido)', cabine: '1 piloto + 4 passageiros', cor: '#3fa7ff',
    arquivos: ['modelos/monomotor.js', 'modelos/505/dados.js'], motorArq: 'modelos/505/motor.js',
    chave: 'b505', base: 'Fontes públicas + EASA TCDS E.031 (motor) – aguardando BHT-505-MM/MPI'
  },
  {
    id: '429', nome: 'Bell 429 GlobalRanger', curto: '429', ano: '2009',
    motor: 'Pratt & Whitney Canada PW207D1', fadec: 'FADEC (EEC) com reserva manual', config: '2 turboeixos (bimotor)', potencia: '~625 SHP por motor',
    rotor: '4 pás (macio no plano)', cabine: '1–2 pilotos + 6–7 passageiros', cor: '#ff8a2a',
    arquivos: ['modelos/429/dados.js', 'modelos/429/anac.js', 'modelos/429/sensores.js'], motorArq: 'modelos/429/motor.js',
    chave: 'b429', base: 'BHT-429-MPI Issue 2 (Cap. 04 e 05) + EASA TCDS IM.E.017 (motor)'
  },
  {
    id: '206', nome: 'Bell 206 JetRanger', curto: '206', ano: '1967',
    motor: 'Rolls-Royce / Allison 250-C20J', fadec: 'Controle hidromecânico (sem FADEC)', config: '1 turboeixo (monomotor)', potencia: '~420 SHP',
    rotor: '2 pás (semirrígido)', cabine: '1 piloto + 4 passageiros', cor: '#46c08a',
    arquivos: ['modelos/monomotor.js', 'modelos/206/dados.js'], motorArq: 'modelos/206/motor.js',
    chave: 'b206', base: 'Fontes públicas + TAR/TCDS Série II (motor) – aguardando BHT-206B-MM'
  },
  {
    id: '407', nome: 'Bell 407 / 407GXi', curto: '407', ano: '1996',
    motor: 'Rolls-Royce M250-C47B / M250-C47E/4', fadec: 'FADEC (C47B: 1 canal + reserva manual; C47E/4: 2 canais)', config: '1 turboeixo (monomotor)', potencia: '813 a 862 SHP',
    rotor: '4 pás (macio no plano, composto)', cabine: '1 piloto + 6 passageiros', cor: '#c77dff',
    arquivos: ['modelos/monomotor.js', 'modelos/407/dados.js'], motorArq: 'modelos/407/motor.js',
    chave: 'b407', base: 'Fontes públicas + EASA TCDS IM.E.109 (motor) – aguardando BHT-407-MM/MPI'
  },
  {
    id: '206L4', nome: 'Bell 206L-4 LongRanger IV', curto: '206L4', ano: '1992',
    motor: 'Rolls-Royce 250-C30P', fadec: 'Controle hidromecânico (sem FADEC)', config: '1 turboeixo (monomotor)', potencia: '485 kW (650 shp) na decolagem',
    rotor: '2 pás (semirrígido)', cabine: '1 piloto + 6 passageiros', cor: '#f2c14e',
    arquivos: ['modelos/monomotor.js', 'modelos/206L4/dados.js'], motorArq: 'modelos/206L4/motor.js',
    chave: 'b206l4', base: 'Fontes públicas + EASA TCDS IM.E.109 (motor) – manual Bell 206L4-MM (PDF por capítulo) no índice interno'
  },
  {
    id: '230', nome: 'Bell 230', curto: '230', ano: '1992',
    motor: '2× Rolls-Royce 250-C30G/2', fadec: 'Controle hidromecânico (sem FADEC)', config: '2 turboeixos (bimotor)', potencia: '485 kW por motor na decolagem',
    rotor: '2 pás (semirrígido)', cabine: '1–2 pilotos + 8 passageiros', cor: '#e05d6f',
    arquivos: ['modelos/monomotor.js', 'modelos/230/dados.js'], motorArq: 'modelos/230/motor.js',
    chave: 'b230', base: 'Fontes públicas + EASA TCDS IM.E.109 (motor) – manual Bell 230-MM (PDF por capítulo) no índice interno'
  },
  {
    id: '430', nome: 'Bell 430', curto: '430', ano: '1996',
    motor: '2× Rolls-Royce 250-C40B', fadec: 'Controle eletrônico de 1 canal com reserva hidromecânica manual', config: '2 turboeixos (bimotor)', potencia: '533 kW por motor na decolagem',
    rotor: '4 pás (sem rolamentos, macio no plano)', cabine: '1–2 pilotos + 8 passageiros', cor: '#4fd1c5',
    arquivos: ['modelos/monomotor.js', 'modelos/430/dados.js'], motorArq: 'modelos/430/motor.js',
    chave: 'b430', base: 'Fontes públicas + EASA TCDS IM.E.109 (motor) – manual Bell 430-MM (PDF por capítulo) no índice interno'
  }
];
