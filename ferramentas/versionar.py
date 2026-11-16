# Aplica/atualiza ?v=<versão> em todos os arquivos locais carregados pelas páginas (evita cache antigo no navegador).
import re, sys, os
raiz, ver = sys.argv[1], sys.argv[2]
os.chdir(raiz)
SUF = '?v=' + ver
def tira(s):
    return re.sub(r'\?v=[\w.-]+', '', s)

# 1) imports entre módulos: './arquivo.js'
for f in ['app.js', 'motor.js', 'motores.js']:
    s = open(f, encoding='utf-8').read()
    s = re.sub(r"(from|import\()\s*'(\./[\w/.-]+?\.js)(\?v=[\w.-]+)?'", lambda m: f"{m.group(1)}{' ' if m.group(1) == 'from' else ''}'{m.group(2)}{SUF}'", s)
    open(f, 'w', encoding='utf-8', newline='\n').write(s)

# 2) páginas: style.css, catalogo.js, módulo principal e imports do script inline
erro = """  <link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='7' fill='%23ff8a2a'/%3E%3Ctext x='16' y='22' font-size='15' font-family='Arial' font-weight='700' text-anchor='middle' fill='%2317100a'%3EMI%3C/text%3E%3C/svg%3E">
  <script>
    // Mostra na tela qualquer erro de carregamento (em vez de deixar o 3D em branco)
    (function () {
      function mostrar(m) { if (/ResizeObserver|setPointerCapture/.test(m)) return; var f = function () { var el = document.getElementById('erro'); if (!el) return; el.hidden = false; el.innerHTML = '<b>Algo falhou ao carregar esta página</b><br>' + String(m).replace(/</g, '&lt;') + '<br><small>Recarregue com Ctrl+F5 (limpa o cache). Se continuar, envie esta mensagem.</small>'; }; if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', f); else f(); }
      window.addEventListener('error', function (e) { if (e.message) mostrar(e.message + (e.filename ? ' (' + e.filename.split('/').pop() + ':' + e.lineno + ')' : '')); });
      window.addEventListener('unhandledrejection', function (e) { mostrar((e.reason && e.reason.message) || e.reason); });
    })();
  </script>
"""
for f in ['index.html', 'manual.html', 'motor.html', 'motores.html']:
    s = open(f, encoding='utf-8').read()
    s = re.sub(r'href="style\.css(\?v=[\w.-]+)?"', f'href="style.css{SUF}"', s)
    s = re.sub(r'src="modelos/catalogo\.js(\?v=[\w.-]+)?"', f'src="modelos/catalogo.js{SUF}"', s)
    s = re.sub(r'src="(app|motor|motores)\.js(\?v=[\w.-]+)?"', lambda m: f'src="{m.group(1)}.js{SUF}"', s)
    s = re.sub(r"(from|import\()\s*'(\./[\w/.-]+?\.js)(\?v=[\w.-]+)?'", lambda m: f"{m.group(1)}{' ' if m.group(1) == 'from' else ''}'{m.group(2)}{SUF}'", s)
    if 'Mostra na tela qualquer erro' not in s:
        s = s.replace('  <link rel="stylesheet"', erro + '  <link rel="stylesheet"', 1)
    open(f, 'w', encoding='utf-8', newline='\n').write(s)

# 3) carregar.js: versão usada nos scripts de dados
s = open('carregar.js', encoding='utf-8').read()
if 'export const VERSAO' in s:
    s = re.sub(r"export const VERSAO = '[\w.-]+';", f"export const VERSAO = '{ver}';", s)
else:
    s = s.replace("// Manutenção Interativa – escolhe o modelo pela URL (?m=505) e carrega os arquivos de dados dele.\n",
                  f"// Manutenção Interativa – escolhe o modelo pela URL (?m=505) e carrega os arquivos de dados dele.\n// VERSAO: mude a cada publicação (scripts/versionar) para o navegador não usar arquivos antigos do cache.\nexport const VERSAO = '{ver}';\n")
    s = s.replace("s.src = src;", "s.src = src + (src.includes('?') ? '&' : '?') + 'v=' + VERSAO;")
open('carregar.js', 'w', encoding='utf-8', newline='\n').write(s)
print('versão', ver)
