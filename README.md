# Bell 429 – Manual de Manutenção Interativo 3D (demonstração)

Página estática (HTML + CSS + JavaScript) com um modelo 3D simplificado do Bell 429 ligado às tarefas do
BHT-429-MPI (Cap. 04 – Limites de Aeronavegabilidade e Cap. 05 – Inspeções), controle por horas de voo e
um resumo da regulamentação ANAC. Descreva a manutenção em texto livre e o modelo mostra onde será o trabalho.

> **Aviso:** material de demonstração e treinamento. Não substitui o BHT-429-MM / MPI, o manual do motor
> P&WC nem os RBAC vigentes. O modelo 3D é ilustrativo, não é desenho de engenharia.

## Abas

| Aba | O que faz |
|---|---|
| Descrever | Texto livre → destaca os componentes e lista as tarefas do MPI relacionadas |
| Inspeções | Inspeções programadas e especiais com checklist (marcações salvas no navegador) |
| Sensores | Telemetria IoT ligada a cada componente, mapa de saúde no 3D e tarefas indicadas por alerta |
| Controle | Vencimentos por horas (10, 30, 40, 50, 100, 200 h…), previsão de data e calculadora de RIN |
| Limites | Peças com vida limite (Cap. 04) |
| Eventos | Inspeções condicionais: pouso duro, parada brusca, sobretorque, raio, granizo… |
| ANAC | RBAC 43, 91, 145, 135, 65, 39 e Relatório de Avaliação Operacional do Bell 429 |
| Sistemas | Lista por capítulo ATA e ficha de cada componente |

## Rodar no WAMP

1. Copie a pasta para `C:\wamp64\www\` (aqui: `C:\wamp64.1\www\Bell 429`).
2. Ligue o WAMP e abra `http://localhost/Bell%20429/`.

Não abra o `index.html` direto do disco (`file://`): o navegador bloqueia os módulos JavaScript.

## Publicar no GitHub Pages

1. Crie um repositório no GitHub (ex.: `bell429-manual-3d`).
2. Na pasta do projeto:
   ```bash
   git init -b main
   git add .
   git commit -m "Manual interativo 3D do Bell 429"
   git remote add origin https://github.com/SEU_USUARIO/bell429-manual-3d.git
   git push -u origin main
   ```
3. No GitHub: **Settings → Pages → Build and deployment → Deploy from a branch → `main` / `/ (root)`**.
4. A página fica em `https://SEU_USUARIO.github.io/bell429-manual-3d/`.

Todos os caminhos são relativos e o arquivo `.nojekyll` já está na raiz, então nada precisa ser alterado.
A biblioteca Three.js é carregada por CDN (jsDelivr) – é preciso internet no primeiro acesso.

**Antes de publicar em repositório público:** os dados de tarefas vêm do BHT-429-MPI, que é material
proprietário da Bell. Confirme se você tem autorização para divulgar, ou use um repositório privado
(GitHub Pages privado exige plano pago). Não inclua os PDFs dos manuais no repositório.

## Sensores IoT (monitoramento de condição)

A aba **Sensores** liga 57 pontos de medição aos 51 componentes do modelo. Quando uma leitura sai da
faixa, o componente muda de cor no mapa de saúde (botão **Saúde**) e aparecem a ação sugerida e as
tarefas do MPI relacionadas.

- **Simulação** (padrão, funciona também no GitHub Pages): dados gerados no navegador; o botão
  "Simular falha" leva um sensor ao nível crítico.
- **Sensores reais** (só no WAMP, pois usa PHP): a página lê `api/telemetria.php` a cada segundo.

Enviar leituras de qualquer dispositivo da rede (ESP32, Raspberry Pi, CLP com gateway HTTP…):

```bash
curl -X POST -H "Content-Type: application/json" -d '{"leituras":{"temp_trans":112.5,"chip_trgb":1}}' http://192.168.1.51/api/telemetria.php
```

Os ids são os de `sensores.js`. Um sensor sem leitura há mais de 30 s aparece como "sem sinal".
Exemplo para ESP32 em `exemplos/esp32_telemetria.ino`. Para exigir chave nos envios, preencha `CHAVE`
em `api/telemetria.php` e mande o cabeçalho `X-Chave`.

> As faixas de alerta/crítico e os pontos de medição são **ilustrativos**. Em uso real, configure-os em
> `sensores.js` conforme os limites do fabricante. Esta página não é sistema certificado de monitoramento.

## Arquivos

| Arquivo | Conteúdo |
|---|---|
| `index.html` | Estrutura da página |
| `style.css` | Aparência |
| `modelo.js` | Modelo 3D procedural (fuselagem, rotores, motores, sistemas) |
| `dados.js` | Componentes, zonas, vocabulário, inspeções, limites e eventos |
| `anac.js` | Regulamentação ANAC e intervalos do controle por horas |
| `sensores.js` | Sensores IoT: componente, unidade, faixas e ação sugerida |
| `api/telemetria.php` | Entrada/saída de leituras dos sensores reais (WAMP) |
| `exemplos/esp32_telemetria.ino` | Exemplo de envio por ESP32 |
| `app.js` | Cena 3D, seleção, interpretação do texto e abas |

Para adaptar ao seu programa de manutenção, edite `dados.js` (tarefas) e `anac.js` (intervalos do controle).
