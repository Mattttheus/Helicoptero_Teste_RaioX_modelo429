# HeliSense 3D

**Sensores interativos para manutenção preditiva de helicópteros**, com gêmeo digital 3D: cada sensor (vibração, temperatura,
pressão, deformação, deslocamento, aceleração e discretos como detector de limalha) tem tendência, detecção de anomalia,
índice de saúde e tempo estimado até o alerta e o crítico; o componente afetado acende no modelo 3D. Projeto de mestrado
(Engenharia Aeronáutica – ITA).

Base técnica (manuais interativos 3D por modelo):

Manuais de manutenção interativos 3D de helicópteros Bell, um por modelo, com o mesmo padrão de navegação, dados e
visual: **Bell 505 Jet Ranger X**, **Bell 429 GlobalRanger**, **Bell 206 JetRanger**, **Bell 407 / 407GXi**,
**Bell 206L-4 LongRanger IV**, **Bell 230** e **Bell 430**.
Cada modelo tem também o **motor em 3D editável**, com **mapa de instalação dos sensores** e **testes em modelo**
(partida/ignição, perfil de voo, estresse de componentes e teste de sensores).

> **Aviso:** material de demonstração e treinamento. Os modelos 3D são ilustrativos, não são desenho de engenharia.
> Nada aqui substitui os manuais do fabricante (MM, MPI, RFM, manual do motor) nem os RBAC vigentes.

## Páginas

| Página | O que faz |
|---|---|
| `index.html` | Painel de entrada: escolha do modelo, vitrine 3D e tabela de motorização |
| `manual.html?m=<id>` | Manual interativo do helicóptero (`505`, `429`, `206`, `407`) |
| `motor.html?m=<id>` | Motor 3D do modelo: peças, sensores, testes, manutenção e edição (`&s=<sensor>` abre direto num sensor) |
| `comandos.html?m=<id>` | **Comandos de voo e painel 3D**: cadeia de comando (cíclico, coletivo, pedais → jackshafts, tubos, bellcranks, mixer → servos → swashplate / rotor de cauda), controle do motor (manete, ligação, FCU/HMU, ECU/FADEC, indicação), comandos duplos, painel de instrumentos por tipo de aviônica (G1000H NXi, BasiX-Pro, EFIS ou analógico), pedestal, **teste de movimento** e **seguir a cadeia**; abas **Peças** (estrutura ATA → conjunto → PN) e **Procedimentos** (leitura digital) com os dados locais dos manuais Bell |
| `cabine.html?m=<id>` | **Cabine 3D**: manche, coletivo com manete, pedais e interruptores interativos; telas e instrumentos vivos; partida do motor com checklist; sistema elétrico (bateria, gerador, barra, disjuntores); ar-condicionado e temperatura da cabine; rotor (swashplate, passo, track, vibração); teste de movimento dos comandos; treino de diagnóstico de panes |
| `atlas.html` | **Atlas visual** (120 fichas em alta definição) com busca no texto e visor com zoom; as fichas também aparecem na ficha de cada peça do motor e do helicóptero, com atalhos para PN e procedimentos |
| `motores.html` | **Tabela dos motores 3D com os sensores de cada motor, por modelo**: resumo dos 4 motores e matriz grandeza × modelo; passar o mouse num sensor marca a posição dele no motor 3D, clicar abre o motor do modelo naquele sensor; exporta CSV |

Endereços antigos do manual do 429 (ex.: `/#sensores`) são redirecionados para `manual.html?m=429`.

## Manual interativo (cada modelo)

| Aba | O que faz |
|---|---|
| Descrever | Texto livre → destaca os componentes no 3D e lista as tarefas relacionadas |
| Inspeções | Inspeções programadas com checklist (marcações salvas no navegador) |
| Sensores | **Mapa de onde colocar os sensores** (botão *Mapa de sensores*: um número sobre cada componente, ligado ao cartão do sensor) e **folha de instalação** para imprimir/salvar em PDF; telemetria IoT por componente, mapa de saúde no 3D e **testes em modelo**: ciclo de voo e estresse progressivo (mostra a ordem em que os componentes chegam ao alerta e ao crítico) |
| Controle | Vencimentos por horas, previsão de data e (no 429) calculadora de RIN |
| Limites | Componentes com vida limite |
| Eventos | Inspeções condicionais: pouso duro, parada brusca, sobretorque, sobretemperatura, raio… |
| ANAC | RBAC 43, 91, 145, 135, 65, 39 e particularidades do modelo |
| Sistemas | Lista por capítulo ATA e ficha de cada componente (com atalho para o motor 3D) |
| Dados | Exportar/importar backup, planilhas CSV e apagar dados |
| Voo | **Teste de simulação de voo**: o helicóptero voa no 3D (partida, pairado, decolagem, subida, cruzeiro, descida, pouso e corte) com painel de voo (altitude, velocidade, Nr, torque, temperatura do motor) e os sensores acompanhando cada fase; falhas opcionais (pouso duro, sobretorque, luz de CHIP, vibração do rotor, superaquecimento do motor); no fim mostra os sensores que saíram da faixa, as inspeções condicionais e as tarefas indicadas. Também pelo botão **Simular voo** da barra do 3D |

### Situação do conteúdo de cada modelo

| Modelo | Base atual |
|---|---|
| Bell 429 | BHT-429-MPI Issue 2 (Cap. 04 e 05) – conteúdo completo |
| Bell 505 | **Prévia**: EASA TCDS E.031 (motor), intervalos e tarefas confirmados no guia público de manutenção do 505 (PAC a cada 25 h, pillow block, tail damper…); o restante marcado como ilustrativo |
| Bell 206 | **Prévia**: NZ CAA TAR 11/21B/22 (motor 250 Série II) e limites de TOT de fontes secundárias; tarefas ilustrativas |
| Bell 407 | **Prévia**: EASA TCDS IM.E.109 (motor 250-C47B / C47E/4); tarefas ilustrativas |
| Bell 206L-4 | **Prévia**: EASA TCDS IM.E.109 (motor 250-C30P); tarefas ilustrativas |
| Bell 230 | **Prévia**: EASA TCDS IM.E.109 (2× 250-C30G/2, limites OEI); tarefas ilustrativas |
| Bell 430 | **Prévia**: EASA TCDS IM.E.109 (2× 250-C40B, controle eletrônico, limites OEI); tarefas ilustrativas |

Para tornar os manuais do 505, 206 e 407 fiéis ao fabricante, coloque os PDFs oficiais em `manuais/<id>/`
(pasta ignorada pelo git – material proprietário). As tarefas, intervalos e limites extraídos vão para
`src/dominio/frota/aeronaves/<id>/dados.js` (e `motor.js`). As tarefas da prévia têm número local (`505.63.001`), não o número oficial.

## Dados dos manuais Bell por aeronave (somente rede local)

Os dados extraídos do portal Bell ficam em `dados/<modelo>/` (505, 407, 407GXi, 429, 206B, 206L4, 230, 430), **somente
na rede local / WAMP** – material proprietário, nunca em repositório online:

- `indice.json` – procedimentos, descrições de sistemas, peças do catálogo (IPC; IPB por figura nos manuais por capítulo), figuras;
- `textos.json` – texto completo de cada procedimento ou página;
- `figuras/` – figuras SVG (IETM) e PNG (páginas de figura).

Em `comandos.html`:
- **Procedimentos** – busca por título, código, PN ou texto completo; cada procedimento abre em **leitura digital**
  (passos com checklist que fica salvo no navegador, avisos WARNING/CAUTION/NOTE destacados, torques, ferramentas T-xxxxxx e
  PN com link para a busca), com as figuras locais (visor com zoom) e o botão **◎ 3D**;
- **Peças** – estrutura de peças: capítulo ATA → conjunto (figura do catálogo) → itens com PN, com a região destacada no 3D.

Para atualizar: `ferramentas/indice_bell_console.js` (Snippet do Chrome logado no portal) gera um `dados_<modelo>.zip` por
aeronave; extraia em `dados/<modelo>/`. Instruções em `dados/LEIA-ME.txt`.

## Motor 3D (cada modelo)

| Modelo | Motor | Arquitetura no 3D |
|---|---|---|
| 505 | Safran Arrius 2R | caixa de redução dianteira com acessórios, entrada anular, compressor centrífugo, câmara anular de fluxo reverso, turbina HP e turbina livre de 1 estágio |
| 429 | P&WC PW207D1 (2 instalados) | caixa de redução dianteira, entrada radial, compressor centrífugo, câmara anular de fluxo reverso, CT e PT de 1 estágio |
| 206 | Rolls-Royce 250-C20J | fluxo reverso: compressor 6 axiais + 1 centrífugo, 2 tubos de descarga, câmara única traseira, turbinas de 2+2 estágios, 2 escapes |
| 407 | Rolls-Royce M250-C47B / C47E/4 | fluxo reverso: compressor centrífugo, tubo de descarga único, turbinas de 2+2 estágios, escape único, FADEC |
| 206L4 | Rolls-Royce 250-C30P | Série IV: compressor centrífugo, 2 tubos de descarga, turbinas de 2+2 estágios, 2 escapes, hidromecânico |
| 230 | Rolls-Royce 250-C30G/2 (2 instalados) | Série IV hidromecânico; limites OEI |
| 430 | Rolls-Royce 250-C40B (2 instalados) | Série IV com controle eletrônico de 1 canal e reserva manual; limites OEI |

Dimensões, peso e limites (temperatura dos gases, Ng, Np, torque, óleo) vêm das fichas EASA/TCDS citadas na aba **Motor**.

| Aba | O que faz |
|---|---|
| Motor | Ficha técnica, caminho do ar, peças por módulo (clique para ver a ficha), fontes |
| Sensores | **Mapa de instalação numerado** (botão *Mapa nº*: um número em cada ponto do 3D, igual ao do cartão) e **folha de instalação** para imprimir/salvar em PDF, com 4 vistas numeradas e a tabela de onde e como instalar e testar cada sensor: termopares, rotação, torque, pressões, temperaturas, limalha, fluxo, vibração (HUMS), canais do FADEC (Arrius 2R e C47E/4 com canal B; PW207D1 com estado do EEC)… com *como instalar* e *como testar* de cada ponto |
| Testes | **Partida (ignição)** com falhas (quente, pendurada, sem ignição, arranque fraco, sem óleo; FADEC aborta, motor hidromecânico depende do operador) · **Perfil de voo** (OAT, altitude e peso) · **Estresse** (sobretorque, sobretemperatura, sobrevelocidade, vibração, perda de óleo, FOD) com mapa de carga nas peças e estimativa didática de vida consumida · **Teste de sensores (BITE)** com falhas injetadas (aberto, curto, deriva, ruído, intermitente) · registro de eventos e excedências |
| Manutenção | Boroscopia, lavagem do compressor, detectores de limalha, filtro de combustível, ignição, termopares, verificação de potência, vibração, troca de módulos – acende as peças e ajusta corte/vista explodida |
| Editar | Mover/girar/escalar peças e sensores (gizmo W/E/R), mudar cor, ocultar peça, **instalar sensor novo clicando no motor**, editar limites e textos |
| Dados | Exportar/importar a edição (.json) e planilhas CSV (mapa de sensores, registro, teste de sensores, checklist) |

Barra do 3D: **Corte** (carcaças cortadas ao meio), **Raio-X**, **Sensores**, **Rótulos**, **Carga** e **Vista explodida**.

> A simulação é um modelo didático de primeira ordem: usa os limites das fontes, mas não reproduz a dinâmica real do motor.
> Os sensores "adicionais" (HUMS) são sugestões de monitoramento; instalar em aeronave exige projeto aprovado.

## Atualizações e cache do navegador

As páginas carregam os arquivos com `?v=<versão>` para o navegador não reaproveitar versões antigas do cache.
Depois de alterar qualquer arquivo, atualize a versão antes de publicar:

```bash
python ferramentas/versionar.py . 20261120a
```

Se algo falhar ao carregar, a página mostra a mensagem de erro na tela (recarregue com Ctrl+F5).

## Rodar no WAMP

1. Pasta em `C:\wamp64.1\www\Bell 429`.
2. Ligue o WAMP e abra `http://localhost/Bell%20429/`.

Não abra os arquivos direto do disco (`file://`): o navegador bloqueia os módulos JavaScript.

## Publicar no GitHub Pages

Todos os caminhos são relativos e o `.nojekyll` está na raiz. No GitHub: **Settings → Pages → Deploy from a branch →
`main` / `/ (root)`**. A biblioteca Three.js (0.160) é carregada por CDN (jsDelivr) – precisa de internet no primeiro acesso.

**Antes de publicar em repositório público:** os dados do 429 vêm do BHT-429-MPI (material proprietário da Bell).
Confirme a autorização ou use repositório privado. Não inclua os PDFs dos manuais (a pasta `manuais/` já é ignorada).

## Sensores reais (só no WAMP, usa PHP)

No manual, aba **Sensores → Sensores reais**: a página lê `api/telemetria.php` a cada segundo. Envio de leituras:

```bash
curl -X POST -H "Content-Type: application/json" -d '{"leituras":{"temp_trans":112.5,"chip_trgb":1}}' http://192.168.1.51/api/telemetria.php
```

Os ids são os de `sensores` em `src/dominio/frota/aeronaves/<id>/`. Exemplo para ESP32 em `exemplos/esp32_telemetria.ino`. Para exigir chave,
preencha `CHAVE` em `api/telemetria.php` e mande o cabeçalho `X-Chave`.

## Estrutura de pastas (Clean Architecture · DDD · MVC)

Detalhes, regras e testes em `docs/ARQUITETURA.md`.

```
Bell 429/
├── index · manual · motor · cabine · comandos · motores · atlas · testes (.html)   ← páginas
├── assets/  css/ · texturas/ (PBR pré-processadas) · modelos3d/ (.glb reais) · hdri/
├── src/
│   ├── dominio/                       MODEL – regras e dados (DDD)
│   │   ├── frota/                     catálogo, aeronaves/<id>/, monomotor, comandos e painéis
│   │   ├── motores/                   peças, sensores e tarefas comuns dos motores
│   │   └── documentacao/              atlas (fichas ↔ peças ↔ PN/procedimentos)
│   ├── aplicacao/                     MODEL – simulação do motor e sistemas da aeronave (cabine)
│   ├── infraestrutura/                carga de dados, cache, modelos .glb
│   └── apresentacao/
│       ├── visoes/                    VIEW – 3D (helicóptero, motor, fluxo, chicotes, realismo) e visor do atlas
│       └── controladores/             CONTROLLER – um por página
├── testes/                            casos.js (domínio + aplicação), navegador.js, rodar_node.mjs
├── dados/ · manuais/ · api/           dados locais (não versionados) e telemetria
├── docs/ · ferramentas/ · exemplos/ · demo/
```

### Acrescentar um modelo (ex.: Bell 412 – não consta na conta Bell da Helipark)

1. `src/dominio/frota/aeronaves/412/dados.js` (formato do `window.HELI`) e `src/dominio/frota/aeronaves/412/motor.js` (`MONTAR_MOTOR({...})`).
2. Forma 3D em `FORMAS` no `src/apresentacao/visoes/3d/helicoptero3d.js` (ou um construtor próprio, como o do 429) e, se preciso, um molde em `src/apresentacao/visoes/3d/motor3d.js`.
3. Configuração de comandos/painel em `src/dominio/frota/comandos.js` (`modelos['<id>']`).
4. Entrada em `src/dominio/frota/catalogo.js`. Bimotores: `motores: [z1, z2]` na forma 3D (ver 230 e 430 em `helicoptero3d.js`).

## Fontes públicas usadas

- EASA TCDS E.031 Issue 05 – Safran Arrius 2F/2R
- EASA TCDS IM.E.017 Issue 08 – P&WC PW206/PW207 (inclui PW207D1)
- EASA TCDS IM.E.109 Issue 04 – Rolls-Royce 250-C28 series (inclui 250-C47B e C47E/4)
- NZ CAA Type Acceptance Report 11/21B/22 – Rolls-Royce 250 Séries I e II
- Bell 505 Maintenance Guide (bell-505-guide.gitbook.io) – PAC e títulos/tarefas das inspeções
- Fotos de referência dos motores e helicópteros no Wikimedia Commons (só como referência visual; nenhuma imagem incluída)
