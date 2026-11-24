# Conversor AC3D (.ac, usado pelo FlightGear) -> glTF binário (.glb) com texturas embutidas.
# Uso: python3 -I ac2glb.py <pasta_do_modelo> <arquivo.ac> <saida.glb> [escala]
import sys, os, re, json, struct, io, math
import numpy as np
from PIL import Image

def tokens(linha):
    return re.findall(r'"[^"]*"|\S+', linha)

def ler_ac(caminho):
    L = open(caminho, encoding='latin-1').read().splitlines(); i = 1; mats = []
    while i < len(L) and L[i].startswith('MATERIAL'):
        t = tokens(L[i]); d = {t[k]: t[k + 1:k + 4] for k in range(len(t)) if t[k] in ('rgb', 'amb', 'emis', 'spec')}
        tr = float(t[t.index('trans') + 1]) if 'trans' in t else 0.0
        shi = float(t[t.index('shi') + 1]) if 'shi' in t else 10
        mats.append({'nome': t[1].strip('"'), 'rgb': [float(x) for x in d.get('rgb', [0.8] * 3)], 'emis': [float(x) for x in d.get('emis', [0] * 3)], 'trans': tr, 'shi': shi}); i += 1
    def objeto():
        nonlocal i
        o = {'tipo': tokens(L[i])[1], 'nome': '', 'tex': None, 'texrep': (1, 1), 'texoff': (0, 0), 'rot': None, 'loc': (0, 0, 0), 'v': [], 'surf': [], 'kids': []}; i += 1
        while i < len(L):
            t = tokens(L[i])
            if not t: i += 1; continue
            k = t[0]
            if k == 'name': o['nome'] = t[1].strip('"'); i += 1
            elif k == 'data': i += 2
            elif k == 'texture': o['tex'] = t[1].strip('"'); i += 1
            elif k == 'texrep': o['texrep'] = (float(t[1]), float(t[2])); i += 1
            elif k == 'texoff': o['texoff'] = (float(t[1]), float(t[2])); i += 1
            elif k == 'rot': o['rot'] = [float(x) for x in t[1:10]]; i += 1
            elif k == 'loc': o['loc'] = tuple(float(x) for x in t[1:4]); i += 1
            elif k == 'numvert':
                n = int(t[1]); o['v'] = [tuple(float(x) for x in L[i + 1 + j].split()[:3]) for j in range(n)]; i += n + 1
            elif k == 'numsurf':
                n = int(t[1]); i += 1
                for _ in range(n):
                    f = int(tokens(L[i])[1], 0); i += 1; mat = 0
                    while not L[i].startswith('refs'):
                        if L[i].startswith('mat'): mat = int(L[i].split()[1])
                        i += 1
                    nr = int(L[i].split()[1]); refs = []
                    for j in range(nr):
                        p = L[i + 1 + j].split(); refs.append((int(p[0]), float(p[1]) if len(p) > 1 else 0.0, float(p[2]) if len(p) > 2 else 0.0))
                    i += nr + 1
                    o['surf'].append({'f': f, 'mat': mat, 'refs': refs})
            elif k == 'kids':
                n = int(t[1]); i += 1
                for _ in range(n): o['kids'].append(objeto())
                return o
            else: i += 1
        return o
    while i < len(L) and not L[i].startswith('OBJECT'): i += 1
    return mats, objeto()

def converter(pasta, ac, saida, escala=1.0, prefixo=''):
    arquivos = ac if isinstance(ac, list) else [ac]
    mats = []; kids = []
    for a in arquivos:
        pos = None
        if '@' in a:  # arquivo@x,y,z[,rumo_graus] – deslocamento no sistema do FlightGear (x p/ trás, y direita, z cima)
            a, q = a.split('@'); q = [float(v) for v in q.split(',')]; pos = q + [0.0] * (4 - len(q))
        m, r = ler_ac(os.path.join(pasta, a)); base = len(mats); mats += m; d = os.path.dirname(os.path.join(pasta, a))
        if pos:
            x, y, z, h = pos; r['loc'] = (x, z, -y)
            if h: c, s_ = math.cos(math.radians(h)), math.sin(math.radians(h)); r['rot'] = [c, 0, s_, 0, 1, 0, -s_, 0, c]
        def marca(o):
            o['pasta'] = d
            for s_ in o['surf']: s_['mat'] += base
            for k in o['kids']: marca(k)
        marca(r); r['nome'] = os.path.splitext(os.path.basename(a))[0] if not pos else os.path.basename(os.path.dirname(a)).lower() + '_' + os.path.splitext(os.path.basename(a))[0] + str(len(kids)); kids.append(r)
    raiz = kids[0] if len(kids) == 1 else {'tipo': 'world', 'nome': 'aeronave', 'tex': None, 'texrep': (1, 1), 'texoff': (0, 0), 'rot': None, 'loc': (0, 0, 0), 'v': [], 'surf': [], 'kids': kids, 'pasta': pasta}
    buf = bytearray(); views = []; acc = []; meshes = []; nodes = []; materiais = []; imagens = []; texs = []; cache_mat = {}; cache_img = {}
    def add_view(b, alvo=None):
        while len(buf) % 4: buf.append(0)
        off = len(buf); buf.extend(b); v = {'buffer': 0, 'byteOffset': off, 'byteLength': len(b)}
        if alvo: v['target'] = alvo
        views.append(v); return len(views) - 1
    def add_acc(arr, tipo, comp, alvo, minmax=False):
        a = {'bufferView': add_view(arr.tobytes(), alvo), 'componentType': comp, 'count': len(arr), 'type': tipo}
        if minmax: a['min'] = arr.min(0).tolist(); a['max'] = arr.max(0).tolist()
        acc.append(a); return len(acc) - 1
    def imagem(nome, pasta):
        if (nome, pasta) in cache_img: return cache_img[(nome, pasta)]
        cand = [os.path.join(pasta, nome), os.path.join(pasta, os.path.basename(nome))]
        base = os.path.splitext(os.path.basename(nome))[0]
        for d, _, fs in os.walk(pasta):
            for f in fs:
                if os.path.splitext(f)[0].lower() == base.lower(): cand.append(os.path.join(d, f))
        im = None
        for c in cand:
            if os.path.isfile(c):
                try: im = Image.open(c); im.load(); break
                except Exception: im = None
        if im is None: cache_img[(nome, pasta)] = None; return None
        tem_alfa = im.mode in ('RGBA', 'LA') or (im.mode == 'P' and 'transparency' in im.info)
        im = im.convert('RGBA' if tem_alfa else 'RGB')
        if max(im.size) > 2048: im.thumbnail((2048, 2048))
        b = io.BytesIO(); (im.save(b, 'PNG', optimize=True) if tem_alfa else im.save(b, 'JPEG', quality=90)); mime = 'image/png' if tem_alfa else 'image/jpeg'
        imagens.append({'bufferView': add_view(b.getvalue()), 'mimeType': mime}); texs.append({'source': len(imagens) - 1, 'sampler': 0})
        cache_img[(nome, pasta)] = (len(texs) - 1, tem_alfa); return cache_img[(nome, pasta)]
    def material(mi, tex, dupla, pasta):
        chave = (mi, tex, dupla, pasta)
        if chave in cache_mat: return cache_mat[chave]
        m = mats[mi] if mi < len(mats) else {'nome': 'padrao', 'rgb': [0.8] * 3, 'emis': [0] * 3, 'trans': 0, 'shi': 10}
        rough = max(0.25, min(0.9, 1 - m['shi'] / 128)); alpha = 1 - m['trans']
        pbr = {'baseColorFactor': m['rgb'] + [alpha], 'metallicFactor': 0.15, 'roughnessFactor': rough}
        G = {'name': m['nome'], 'pbrMetallicRoughness': pbr, 'doubleSided': dupla}
        if tex:
            r = imagem(tex, pasta)
            if r:
                pbr['baseColorTexture'] = {'index': r[0]}; pbr['baseColorFactor'] = [1, 1, 1, alpha]
                if r[1]: G['alphaMode'] = 'MASK'; G['alphaCutoff'] = 0.5
        if alpha < 0.99: G['alphaMode'] = 'BLEND'
        if any(m['emis']): G['emissiveFactor'] = m['emis']
        materiais.append(G); cache_mat[chave] = len(materiais) - 1; return cache_mat[chave]
    def no(o):
        n = {'name': (prefixo + o['nome']) or o['tipo']}
        if any(o['loc']): n['translation'] = [o['loc'][0] * escala, o['loc'][1] * escala, o['loc'][2] * escala]
        if o['rot']:
            r = np.array(o['rot']).reshape(3, 3)
            if not np.allclose(r, np.eye(3)):
                M = np.eye(4); M[:3, :3] = r.T; M[:3, 3] = n.pop('translation', [0, 0, 0]); n['matrix'] = M.T.flatten().tolist()
        V = np.array(o['v'], dtype=np.float64) * escala if o['v'] else None
        grupos = {}
        for s in o['surf']:
            if (s['f'] & 0xF) != 0 or len(s['refs']) < 3: continue
            k = (s['mat'], bool(s['f'] & 0x20)); grupos.setdefault(k, []).append((s['refs'], bool(s['f'] & 0x10)))
        prims = []
        for (mi, dupla), lst in grupos.items():
            P, N, T, I = [], [], [], []
            ru, rv = o['texrep']; ou, ov = o['texoff']
            for refs, suave in lst:
                pts = V[[r[0] for r in refs]]
                nrm = np.zeros(3)
                for a in range(len(pts)): nrm += np.cross(pts[a], pts[(a + 1) % len(pts)])
                ln = np.linalg.norm(nrm); nrm = nrm / ln if ln > 1e-12 else np.array([0, 1.0, 0])
                b0 = len(P)
                for j, r in enumerate(refs): P.append(pts[j]); N.append(nrm); T.append((r[1] * ru + ou, 1 - (r[2] * rv + ov)))
                for j in range(1, len(refs) - 1): I += [b0, b0 + j, b0 + j + 1]
            if not I: continue
            P = np.array(P, np.float32); N = np.array(N, np.float32); T = np.array(T, np.float32)
            Ia = np.array(I, np.uint32 if len(P) > 65535 else np.uint16)
            attr = {'POSITION': add_acc(P, 'VEC3', 5126, 34962, True), 'NORMAL': add_acc(N, 'VEC3', 5126, 34962)}
            if o['tex']: attr['TEXCOORD_0'] = add_acc(T, 'VEC2', 5126, 34962)
            prims.append({'attributes': attr, 'indices': add_acc(Ia, 'SCALAR', 5125 if Ia.dtype == np.uint32 else 5123, 34963), 'material': material(mi, o['tex'], dupla, o.get('pasta', pasta))})
        if prims: meshes.append({'name': n['name'], 'primitives': prims}); n['mesh'] = len(meshes) - 1
        nodes.append(n); idx = len(nodes) - 1
        filhos = [no(k) for k in o['kids'] if not re.match(r'^(blade[2-9]|propblur\d*|propdisc\d*|.*blur.*|.*disc\d*)$', k.get('nome', ''), re.I)]  # só a pá parada (sem versões de efeito de rotação)
        if filhos: nodes[idx]['children'] = filhos
        return idx
    topo = no(raiz)
    nodes[topo]['rotation'] = [0, 0, 0, 1]
    g = {'asset': {'version': '2.0', 'generator': 'ManutencaoInterativa ac2glb', 'copyright': 'FlightGear Bell 206 – GPL v2'}, 'scene': 0, 'scenes': [{'nodes': [topo]}], 'nodes': nodes, 'meshes': meshes,
         'materials': materiais, 'accessors': acc, 'bufferViews': views, 'buffers': [{'byteLength': 0}], 'samplers': [{'magFilter': 9729, 'minFilter': 9987, 'wrapS': 10497, 'wrapT': 10497}]}
    if imagens: g['images'] = imagens; g['textures'] = texs
    while len(buf) % 4: buf.append(0)
    g['buffers'][0]['byteLength'] = len(buf)
    js = json.dumps(g, separators=(',', ':')).encode(); js += b' ' * ((4 - len(js) % 4) % 4)
    with open(saida, 'wb') as f:
        f.write(struct.pack('<III', 0x46546C67, 2, 12 + 8 + len(js) + 8 + len(buf)))
        f.write(struct.pack('<II', len(js), 0x4E4F534A)); f.write(js)
        f.write(struct.pack('<II', len(buf), 0x004E4942)); f.write(buf)
    tri = sum(acc[p['indices']]['count'] for m in meshes for p in m['primitives']) // 3
    return {'nos': len(nodes), 'malhas': len(meshes), 'materiais': len(materiais), 'texturas': len(imagens), 'triangulos': tri, 'MB': round(os.path.getsize(saida) / 1048576, 2)}

if __name__ == '__main__':
    print(converter(sys.argv[1], sys.argv[2].split(';'), sys.argv[3], float(sys.argv[4]) if len(sys.argv) > 4 else 1.0))
