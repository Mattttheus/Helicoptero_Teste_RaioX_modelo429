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

## Arquivos

| Arquivo | Conteúdo |
|---|---|
| `index.html` | Estrutura da página |
| `style.css` | Aparência |
| `modelo.js` | Modelo 3D procedural (fuselagem, rotores, motores, sistemas) |
| `dados.js` | Componentes, zonas, vocabulário, inspeções, limites e eventos |
| `anac.js` | Regulamentação ANAC e intervalos do controle por horas |
| `app.js` | Cena 3D, seleção, interpretação do texto e abas |

Para adaptar ao seu programa de manutenção, edite `dados.js` (tarefas) e `anac.js` (intervalos do controle).
