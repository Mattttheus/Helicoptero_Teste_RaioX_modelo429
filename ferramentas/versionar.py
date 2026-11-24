# Aplica/atualiza ?v=<versão> em todos os arquivos locais carregados pelas páginas (evita cache antigo no navegador).
import re, sys, os
raiz, ver = sys.argv[1], sys.argv[2]
os.chdir(raiz)
SUF = '?v=' + ver
def tira(s):
    return re.sub(r'\?v=[\w.-]+', '', s)

# 1) imports entre módulos ES (todos os .js de src/, com caminhos './' ou '../')
MODULOS = [os.path.join(d, a) for d, _, fs in os.walk('src') for a in fs if a.endswith('.js')]
for f in MODULOS:
    s = open(f, encoding='utf-8').read()
    s = re.sub(r"(from|import\()\s*'(\.\.?/[\w/.-]+?\.js)(\?v=[\w.-]+)?'", lambda m: f"{m.group(1)}{' ' if m.group(1) == 'from' else ''}'{m.group(2)}{SUF}'", s)
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
for f in ['index.html', 'manual.html', 'motor.html', 'motores.html', 'comandos.html', 'cabine.html', 'atlas.html']:
    s = open(f, encoding='utf-8').read()
    # qualquer .js/.css local carregado pela página (assets/, src/) recebe ?v=<versão>
    s = re.sub(r'(href|src)="((?:assets|src)/[\w/.-]+?\.(?:css|js))(\?v=[\w.-]+)?"', lambda m: f'{m.group(1)}="{m.group(2)}{SUF}"', s)
    s = re.sub(r"(from|import\()\s*'(\./[\w/.-]+?\.js)(\?v=[\w.-]+)?'", lambda m: f"{m.group(1)}{' ' if m.group(1) == 'from' else ''}'{m.group(2)}{SUF}'", s)
    if 'Mostra na tela qualquer erro' not in s:
        s = s.replace('  <link rel="stylesheet"', erro + '  <link rel="stylesheet"', 1)
    open(f, 'w', encoding='utf-8', newline='\n').write(s)

# 3) carregar.js: versão usada nos scripts de dados
CARREGAR = os.path.join('src', 'infraestrutura', 'carregar.js')
s = open(CARREGAR, encoding='utf-8').read()
if 'export const VERSAO' in s:
    s = re.sub(r"export const VERSAO = '[\w.-]+';", f"export const VERSAO = '{ver}';", s)
else:
    s = s.replace("// Manutenção Interativa – escolhe o modelo pela URL (?m=505) e carrega os arquivos de dados dele.\n",
                  f"// Manutenção Interativa – escolhe o modelo pela URL (?m=505) e carrega os arquivos de dados dele.\n// VERSAO: mude a cada publicação (scripts/versionar) para o navegador não usar arquivos antigos do cache.\nexport const VERSAO = '{ver}';\n")
    s = s.replace("s.src = src;", "s.src = src + (src.includes('?') ? '&' : '?') + 'v=' + VERSAO;")
open(CARREGAR, 'w', encoding='utf-8', newline='\n').write(s)
print('versão', ver)

# 4) pré-carregamento (desempenho): cada página declara TODOS os módulos que vai usar, para o navegador baixar em
#    paralelo (modulepreload) em vez de descobrir o grafo de imports um nível por vez; e conecta antes ao CDN do Three.js.
import posixpath
CDN = 'https://cdn.jsdelivr.net/npm/three@0.160.0/'
def grafo(mod, vistos):
    if mod in vistos or not os.path.exists(mod): return
    vistos.add(mod)
    s = open(mod, encoding='utf-8').read()
    for m in re.findall(r"(?:from|import\()\s*'(\.\.?/[^'?]+)", s):
        grafo(posixpath.normpath(posixpath.join(posixpath.dirname(mod), m)), vistos)
def usa_three(mods):
    return any("from 'three'" in open(m, encoding='utf-8').read() for m in mods)
for f in ['index.html', 'manual.html', 'motor.html', 'motores.html', 'comandos.html', 'cabine.html', 'atlas.html']:
    s = open(f, encoding='utf-8').read()
    entradas = re.findall(r'<script type="module" src="(src/[^"?]+)', s) + re.findall(r"from '\./(src/[^'?]+)", s) + re.findall(r"import\('\./(src/[^'?]+)", s)
    mods = set()
    for e in entradas: grafo(e, mods)
    linhas = ['  <link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin>']
    if usa_three(mods):
        linhas += [f'  <link rel="modulepreload" href="{CDN}build/three.module.js" crossorigin>',
                   f'  <link rel="modulepreload" href="{CDN}examples/jsm/controls/OrbitControls.js" crossorigin>']
    linhas += [f'  <link rel="modulepreload" href="{m}{SUF}">' for m in sorted(mods)]
    bloco = '  <!-- precarga -->\n' + '\n'.join(linhas) + '\n  <!-- /precarga -->\n'
    if '<!-- precarga -->' in s: s = re.sub(r'  <!-- precarga -->.*?<!-- /precarga -->\n', bloco, s, flags=re.S)
    else: s = s.replace('</head>', bloco + '</head>', 1)
    open(f, 'w', encoding='utf-8', newline='\n').write(s)
print('pré-carregamento atualizado')

# 5) uso sem internet: Three.js local, manifesto do app, service worker e lista de arquivos para guardar no aparelho
LOCAL = 'assets/vendor/three/'
tem_local = os.path.exists(LOCAL + 'build/three.module.js')
REG = '  <link rel="manifest" href="manifest.webmanifest"><meta name="theme-color" content="#ff8a2a">\n  <script>if (\'serviceWorker\' in navigator && isSecureContext) navigator.serviceWorker.register(\'sw.js\').catch(() => {});</script>\n'
for f in ['index.html', 'manual.html', 'motor.html', 'motores.html', 'comandos.html', 'cabine.html', 'atlas.html']:
    s = open(f, encoding='utf-8').read()
    if tem_local:
        s = s.replace('"three": "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js"', '"three": "./' + LOCAL + 'build/three.module.js"')
        s = s.replace('"three/addons/": "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/"', '"three/addons/": "./' + LOCAL + 'examples/jsm/"')
        s = s.replace('href="https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js" crossorigin', 'href="' + LOCAL + 'build/three.module.js"')
        s = s.replace('href="https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/controls/OrbitControls.js" crossorigin', 'href="' + LOCAL + 'examples/jsm/controls/OrbitControls.js"')
        s = s.replace('  <link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin>\n', '')
    if 'manifest.webmanifest' not in s: s = s.replace('</head>', REG + '</head>', 1)
    open(f, 'w', encoding='utf-8', newline='\n').write(s)
lista = ['index.html', 'manual.html', 'motor.html', 'motores.html', 'comandos.html', 'cabine.html', 'atlas.html', 'manifest.webmanifest']
for base in ['src', 'assets/css', 'assets/texturas', 'assets/icones', 'assets/vendor', 'dados/atlas/mini']:
    for d, _, fs in os.walk(base):
        lista += [os.path.join(d, a).replace(os.sep, '/') for a in fs if a.endswith(('.js', '.css', '.webp', '.png', '.json'))]
lista.append('dados/atlas/indice.json')
lista += ['dados/atlas/mini/ficha_%03d.webp' % n for n in range(1, 121)]
json_txt = '[\n' + ',\n'.join('  "' + x + '"' for x in sorted(set(lista))) + '\n]\n'
open('offline_lista.json', 'w', encoding='utf-8', newline='\n').write(json_txt)
sw = open('sw.js', encoding='utf-8').read(); sw = re.sub(r"const VERSAO = '[^']*';", f"const VERSAO = 'mi-{ver}';", sw); open('sw.js', 'w', encoding='utf-8', newline='\n').write(sw)
print('offline:', 'Three.js local' if tem_local else 'Three.js do CDN (rode ferramentas/baixar_vendor.php)', '·', len(set(lista)), 'arquivos na lista')
