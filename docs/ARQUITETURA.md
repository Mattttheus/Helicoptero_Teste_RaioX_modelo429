# Arquitetura – HeliSense 3D

Site estático (HTML + JavaScript, sem build), servido pelo WAMP. Organização: **Clean Architecture** em camadas,
**DDD** no domínio (contextos delimitados) e **MVC** na apresentação.

## Camadas e regra de dependência

```
apresentacao (controladores + visões)  ──►  aplicacao (casos de uso / modelos de sistema)  ──►  dominio
            │                                                                                      ▲
            └──────────────────────────►  infraestrutura  ─────────────────────────────────────────┘
```
As dependências só apontam para dentro. O domínio não conhece tela, Three.js, `fetch` nem `localStorage`.

| Camada | Pasta | Papel no MVC |
|---|---|---|
| Domínio (DDD) | `src/dominio/` | **Model** – entidades e regras de manutenção |
| Aplicação | `src/aplicacao/` | **Model** – casos de uso e modelos de sistema (simulação) |
| Infraestrutura | `src/infraestrutura/`, `api/` | carga de dados, versão de cache, modelos `.glb`, telemetria |
| Apresentação – visões | `src/apresentacao/visoes/` | **View** – 3D (helicóptero, motor, fluxo, chicotes, realismo) e visor do atlas |
| Apresentação – controladores | `src/apresentacao/controladores/` | **Controller** – um por página: liga eventos ↔ modelo ↔ visão |
| Páginas | `*.html` na raiz | casca da View (layout) |

## Domínio: contextos delimitados (DDD)

| Contexto | Pasta | Conteúdo (linguagem ubíqua) |
|---|---|---|
| **Frota** | `src/dominio/frota/` | `catalogo.js` (aeronaves), `aeronaves/<id>/` (componentes, inspeções, limites, ANAC, sensores, motor instalado), `monomotor.js` (base comum), `comandos.js` (comandos de voo e painéis) |
| **Motores** | `src/dominio/motores/` | `motor_comum.js`: peças, sensores padrão, tarefas comuns dos turboeixos |
| **Documentação** | `src/dominio/documentacao/` | `atlas.js`: fichas do atlas e ligação peça/componente → ficha → termo de busca no manual (PN, procedimento) |

Aplicação: `simulacao.js` (MotorSim: partida, voo, estresse, BITE) e `sistemas_aeronave.js` (modelo da cabine:
elétrico, A/C, rotor/vibração, voo didático, alarmes e panes). Ambos são puros (sem DOM) e cobertos por testes.

## Testes

- **No navegador:** `http://localhost/Bell%20429/testes.html` → *Rodar todos os testes*. Cobre domínio, aplicação,
  todas as páginas × todos os modelos (abre sem erro e com 3D) e desempenho (tempo de abertura e FPS).
- **No terminal (se tiver Node.js):** `node testes/rodar_node.mjs` – domínio e aplicação.
- Casos em `testes/casos.js` (os mesmos nos dois executores). Toda regra nova no domínio/aplicação ganha um caso.

## Desempenho

- **Pré-carregamento:** cada página declara todos os seus módulos (`modulepreload`) e conecta antes ao CDN do Three.js –
  gerado por `ferramentas/versionar.py`.
- **Texturas prontas** (`assets/texturas/*.webp`, geradas por `ferramentas/assar_texturas.py`): nada pesado é calculado ao abrir.
- **Resolução adaptativa:** o 3D mede os quadros e ajusta a resolução (nítido em máquina boa, fluido em máquina fraca); botão **HD**.
- Pós-processamento (sombra de contato, brilho, MSAA) carregado sob demanda, só com HD ligado.

## Convenções (Clean Code)

- Nomes em português, descritivos; um arquivo = uma responsabilidade; funções curtas com nome de ação.
- Página nova = `<pagina>.html` + `src/apresentacao/controladores/<pagina>.js`; regra nova = domínio ou aplicação (+ teste).
- Caminhos em `carregarScripts([...])` e no catálogo são relativos à **página**; `import` é relativo ao **arquivo**.
- Material proprietário (manuais, índices, figuras, atlas) fica em `dados/` e `manuais/` – fora do git.
- Depois de qualquer alteração: `python ferramentas/versionar.py . <nova-versão>` (versão do cache + pré-carregamento).

## Dívida técnica (próximos passos)

| Arquivo | Sugestão |
|---|---|
| `controladores/manual.js` (~76 KB) | separar as abas em visões; levar o estado das inspeções para `aplicacao/` |
| `controladores/comandos.js` (~75 KB) | separar leitor de procedimentos (visão) e busca nos dados Bell (`infraestrutura/dados_bell.js`) |
| `controladores/motor.js` (~66 KB) | separar editor (gizmo), testes e exportação em visões |
| `dominio/frota/aeronaves/429/dados.js` (~71 KB) | dividir por capítulo ATA |

## Uso sem internet e app instalável (20/11/2026)
- Three.js 0.160.0 e complementos ficam em `assets/vendor/three/` (importmap local em todas as páginas); HDRI CC0 do Poly Haven em `assets/hdri/ambiente.hdr`.
- `manifest.webmanifest` + `sw.js`: código e páginas em "rede primeiro" (sempre atualizados quando há rede); vendor, texturas, atlas e figuras em "cópia local primeiro". `offline_lista.json` (gerado por `ferramentas/versionar.py`) é guardado na instalação.
- O service worker só registra em contexto seguro: `http://localhost` no próprio PC funciona; em tablet/TV pela rede (IP do PC) é preciso HTTPS no WAMP para instalar e usar offline.

## Rotina noturna (testes + cópia de segurança)
- Tarefa agendada às 02:17: abre `testes.html?noturno=<código>`, roda tudo, grava em `C:\wamp64.1\backups\ManutencaoInterativa\testes_registro.txt` e gera `projeto_AAAA-MM-DD_HH-MM.zip` (mantém 14). Nada sai da máquina. Ver: `ferramentas/rotina_noturna.php?acao=ver&ok=<código>` (só localhost).

## Divisão dos controladores (em andamento)
- `src/apresentacao/util.js`: esc, CSV, download (antes duplicados em 3 controladores).
- `src/aplicacao/busca_texto.js`: normalização/radical/semelhança do texto livre do manual (sem DOM, com testes).
- Próximos: cenários de sensores do manual (`aplicacao/sensores_voo.js`), consultas de documentação de comandos.js (`aplicacao/consulta_docs.js`), edição/CSV de sensores do motor.

## Modelos 3D realistas e fotos (20/11/2026)
- Casca real por aeronave (`infraestrutura/modelos_reais.js → aplicarCascaReal`): 206 e 230 (FlightGear, GPL v2), 206L-4 e 430 aproximados (esticados), 505/429/407 refinados no Blender (`ferramentas/blender_refinar.py`). Com a casca à vista só os rotores do modelo do sistema aparecem; o clique continua achando as peças.
- Malha elétrica da fuselagem (`visoes/3d/malha_fuselagem.js`, botão "Elétrica" no manual): barramento CC, cargas, sensores, dados e RF por um tronco no piso e no cone de cauda. Ilustrativa – não substitui o WDM.
- Fotos: `ferramentas/blender.php` (render, fila, refinar, tudo – um Blender por vez, 4 núcleos) → `assets/renders/`; fotos reais com licença livre do Wikimedia Commons (`ferramentas/buscar_fotos.php`) → `assets/fotos/<chave>/creditos.json`. Galeria: `visoes/galeria.js`.

## Movimento na figura IPC (movimento_ipc.js)
- `src/apresentacao/visoes/3d/movimento_ipc.js`: barrinha que aparece com **Figura IPC** ligada (manual, motor e janela "Peças em 3D"): montagem animada (desmonta/remonta em ciclo de 7 s), mover peças arrastando (voltam ao lugar ao soltar; "Fixar" mantém), rotativas girando, girar figura e repor.
- Deslocamentos aditivos no espaço local de cada objeto: convivem com a vista explodida do motor (usa `explodir(f)` da página), rotores girando e seleção; somem por completo ao desligar. Peças do tamanho do conjunto (fuselagem/carcaça) ficam paradas como referência.
- As chamadas numeradas acompanham as peças (`deslocamento(chave)` no manual; caixa ao vivo no motor e na janela de peças).

## Decolagem e voo de acordo com os sensores (21/11/2026)
- `src/aplicacao/prontidao_voo.js` (puro, com testes): `classificar` (sensor → sistema da aeronave pelo componente), `avaliarDecolagem` (GO / ATENÇÃO / NO-GO: crítico em qualquer sensor ou falta de leitura em sistema essencial impede), `efeitosNoVoo` (motor crítico → corte por proteção; hidráulico → comandos lentos; rotor de cauda → guinada; rotor principal → vibração; transmissão/combustível → pousar), `criarFonteSimulada` + `criarContexto` (leituras simuladas que acompanham torque, temperatura, vibração e o toque no pouso) e `PilotoDecolagem` (decolagem e pouso automáticos operando o modelo de sistemas).
- `sistemas_aeronave.js`: novo `S.efeitos` (aplicado em potência, resposta do cíclico, guinada e vibração). Corrigida a demanda de torque dos bimotores (era dividida pelo número de motores e o 429/430/230 não saíam do solo); com um motor fora, o restante assume a carga até o limite.
- Cabine 3D → aba **Decolagem**: decisão ao vivo, piloto automático, falhas simuladas por sensor e origem das leituras (simulação ou `api/telemetria.php`). Regras e limites ilustrativos; o despacho real segue RFM, MEL e programa aprovado.
