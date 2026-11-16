# Manutenção Interativa

Manuais de manutenção interativos 3D de helicópteros Bell, um por modelo, com o mesmo padrão de navegação, dados e
visual: **Bell 505 Jet Ranger X**, **Bell 429 GlobalRanger**, **Bell 206 JetRanger** e **Bell 407 / 407GXi**.
Cada modelo tem também o **motor em 3D editável**, com **mapa de instalação dos sensores** e **testes em modelo**
(partida/ignição, perfil de voo, estresse de componentes e teste de sensores).

> **Aviso:** material de demonstração e treinamento. Os modelos 3D são ilustrativos, não são desenho de engenharia.
> Nada aqui substitui os manuais do fabricante (MM, MPI, RFM, manual do motor) nem os RBAC vigentes.

## Páginas

| Página | O que faz |
|---|---|
| `index.html` | Painel de entrada: escolha do modelo, vitrine 3D e tabela de motorização |
| `manual.html?m=<id>` | Manual interativo do helicóptero (`505`, `429`, `206`, `407`) |
| `motor.html?m=<id>` | Motor 3D do modelo: peças, sensores, testes, manutenção e edição |

Endereços antigos do manual do 429 (ex.: `/#sensores`) são redirecionados para `manual.html?m=429`.

## Manual interativo (cada modelo)

| Aba | O que faz |
|---|---|
| Descrever | Texto livre → destaca os componentes no 3D e lista as tarefas relacionadas |
| Inspeções | Inspeções programadas com checklist (marcações salvas no navegador) |
| Sensores | Telemetria IoT por componente, mapa de saúde no 3D e **testes em modelo**: ciclo de voo e estresse progressivo (mostra a ordem em que os componentes chegam ao alerta e ao crítico) |
| Controle | Vencimentos por horas, previsão de data e (no 429) calculadora de RIN |
| Limites | Componentes com vida limite |
| Eventos | Inspeções condicionais: pouso duro, parada brusca, sobretorque, sobretemperatura, raio… |
| ANAC | RBAC 43, 91, 145, 135, 65, 39 e particularidades do modelo |
| Sistemas | Lista por capítulo ATA e ficha de cada componente (com atalho para o motor 3D) |
| Dados | Exportar/importar backup, planilhas CSV e apagar dados |

### Situação do conteúdo de cada modelo

| Modelo | Base atual |
|---|---|
| Bell 429 | BHT-429-MPI Issue 2 (Cap. 04 e 05) – conteúdo completo |
| Bell 505 | **Prévia**: EASA TCDS E.031 (motor), intervalos e tarefas confirmados no guia público de manutenção do 505 (PAC a cada 25 h, pillow block, tail damper…); o restante marcado como ilustrativo |
| Bell 206 | **Prévia**: NZ CAA TAR 11/21B/22 (motor 250 Série II) e limites de TOT de fontes secundárias; tarefas ilustrativas |
| Bell 407 | **Prévia**: EASA TCDS IM.E.109 (motor 250-C47B / C47E/4); tarefas ilustrativas |

Para tornar os manuais do 505, 206 e 407 fiéis ao fabricante, coloque os PDFs oficiais em `manuais/<id>/`
(pasta ignorada pelo git – material proprietário). As tarefas, intervalos e limites extraídos vão para
`modelos/<id>/dados.js` (e `motor.js`). As tarefas da prévia têm número local (`505.63.001`), não o número oficial.

## Motor 3D (cada modelo)

| Modelo | Motor | Arquitetura no 3D |
|---|---|---|
| 505 | Safran Arrius 2R | caixa de redução dianteira com acessórios, entrada anular, compressor centrífugo, câmara anular de fluxo reverso, turbina HP e turbina livre de 1 estágio |
| 429 | P&WC PW207D1 (2 instalados) | caixa de redução dianteira, entrada radial, compressor centrífugo, câmara anular de fluxo reverso, CT e PT de 1 estágio |
| 206 | Rolls-Royce 250-C20J | fluxo reverso: compressor 6 axiais + 1 centrífugo, 2 tubos de descarga, câmara única traseira, turbinas de 2+2 estágios, 2 escapes |
| 407 | Rolls-Royce M250-C47B / C47E/4 | fluxo reverso: compressor centrífugo, tubo de descarga único, turbinas de 2+2 estágios, escape único, FADEC |

Dimensões, peso e limites (temperatura dos gases, Ng, Np, torque, óleo) vêm das fichas EASA/TCDS citadas na aba **Motor**.

| Aba | O que faz |
|---|---|
| Motor | Ficha técnica, caminho do ar, peças por módulo (clique para ver a ficha), fontes |
| Sensores | **Mapa de instalação**: termopares, rotação, torque, pressões, temperaturas, limalha, fluxo, vibração (HUMS)… com *como instalar* e *como testar* de cada ponto |
| Testes | **Partida (ignição)** com falhas (quente, pendurada, sem ignição, arranque fraco, sem óleo; FADEC aborta, motor hidromecânico depende do operador) · **Perfil de voo** (OAT, altitude e peso) · **Estresse** (sobretorque, sobretemperatura, sobrevelocidade, vibração, perda de óleo, FOD) com mapa de carga nas peças e estimativa didática de vida consumida · **Teste de sensores (BITE)** com falhas injetadas (aberto, curto, deriva, ruído, intermitente) · registro de eventos e excedências |
| Manutenção | Boroscopia, lavagem do compressor, detectores de limalha, filtro de combustível, ignição, termopares, verificação de potência, vibração, troca de módulos – acende as peças e ajusta corte/vista explodida |
| Editar | Mover/girar/escalar peças e sensores (gizmo W/E/R), mudar cor, ocultar peça, **instalar sensor novo clicando no motor**, editar limites e textos |
| Dados | Exportar/importar a edição (.json) e planilhas CSV (mapa de sensores, registro, teste de sensores, checklist) |

Barra do 3D: **Corte** (carcaças cortadas ao meio), **Raio-X**, **Sensores**, **Rótulos**, **Carga** e **Vista explodida**.

> A simulação é um modelo didático de primeira ordem: usa os limites das fontes, mas não reproduz a dinâmica real do motor.
> Os sensores "adicionais" (HUMS) são sugestões de monitoramento; instalar em aeronave exige projeto aprovado.

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

Os ids são os de `sensores` em `modelos/<id>/`. Exemplo para ESP32 em `exemplos/esp32_telemetria.ino`. Para exigir chave,
preencha `CHAVE` em `api/telemetria.php` e mande o cabeçalho `X-Chave`.

## Arquivos

| Arquivo | Conteúdo |
|---|---|
| `index.html` | Painel Manutenção Interativa |
| `manual.html` · `app.js` | Manual interativo (genérico, escolhe o modelo por `?m=`) |
| `motor.html` · `motor.js` | Página do motor 3D |
| `modelo.js` | Helicópteros 3D procedurais (429 + formas do 505, 206 e 407) |
| `motor3d.js` | Motores 3D procedurais (arquiteturas M250, PW200 e Arrius) |
| `simulacao.js` | Simulação de partida, voo, estresse e teste de sensores |
| `carregar.js` | Lê o modelo da URL e carrega os dados |
| `style.css` | Aparência |
| `modelos/catalogo.js` | Lista dos modelos (nome, motor, cor, arquivos) |
| `modelos/429/` | Dados do 429 (`dados.js`, `anac.js`, `sensores.js`) e `motor.js` (PW207D1) |
| `modelos/monomotor.js` | Base comum dos monomotores (componentes, inspeções, eventos, ANAC, sensores) |
| `modelos/505/`, `206/`, `407/` | `dados.js` (programa de manutenção do modelo) e `motor.js` (motor, limites, posições dos sensores) |
| `modelos/motor_comum.js` | Peças, sensores padrão (instalação e teste) e tarefas comuns dos motores |
| `manuais/` | PDFs oficiais de cada modelo (não versionados) |
| `api/telemetria.php` · `exemplos/` | Telemetria real (WAMP) e exemplo ESP32 |

### Acrescentar um modelo (ex.: Bell 412)

1. `modelos/412/dados.js` (formato do `window.HELI`) e `modelos/412/motor.js` (`MONTAR_MOTOR({...})`).
2. Forma 3D em `FORMAS` no `modelo.js` (ou um construtor próprio, como o do 429) e, se preciso, um molde em `motor3d.js`.
3. Entrada em `modelos/catalogo.js`.

## Fontes públicas usadas

- EASA TCDS E.031 Issue 05 – Safran Arrius 2F/2R
- EASA TCDS IM.E.017 Issue 08 – P&WC PW206/PW207 (inclui PW207D1)
- EASA TCDS IM.E.109 Issue 04 – Rolls-Royce 250-C28 series (inclui 250-C47B e C47E/4)
- NZ CAA Type Acceptance Report 11/21B/22 – Rolls-Royce 250 Séries I e II
- Bell 505 Maintenance Guide (bell-505-guide.gitbook.io) – PAC e títulos/tarefas das inspeções
- Fotos de referência dos motores e helicópteros no Wikimedia Commons (só como referência visual; nenhuma imagem incluída)
