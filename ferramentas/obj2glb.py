# OBJ (+ textura de paleta) -> GLB com nomes das peças por geometria (rotor principal, rotor de cauda) – HeliSense 3D
import sys, json, struct, numpy as np
obj, tex, saida = sys.argv[1], sys.argv[2], sys.argv[3]
V=[];VT=[];VN=[]; objs=[]; cur=None
for ln in open(obj, encoding='utf-8', errors='ignore'):
    if ln.startswith('v '): V.append([float(x) for x in ln.split()[1:4]])
    elif ln.startswith('vt '): VT.append([float(x) for x in ln.split()[1:3]])
    elif ln.startswith('vn '): VN.append([float(x) for x in ln.split()[1:4]])
    elif ln.startswith('o '): cur={'nome':ln[2:].strip(),'prims':{}}; objs.append(cur)
    elif ln.startswith('usemtl '):
        if cur is None: cur={'nome':'obj','prims':{}}; objs.append(cur)
        cur['mat']=ln.split()[1]
    elif ln.startswith('f '):
        idx=[]
        for t in ln.split()[1:]:
            p=t.split('/'); vi=int(p[0]); ti=int(p[1]) if len(p)>1 and p[1] else 0; ni=int(p[2]) if len(p)>2 and p[2] else 0
            idx.append((vi,ti,ni))
        m=cur.get('mat','Material'); L=cur['prims'].setdefault(m,[])
        for i in range(1,len(idx)-1): L.append((idx[0],idx[i],idx[i+1]))
V=np.array(V,np.float32); VT=np.array(VT or [[0,0]],np.float32); VN=np.array(VN or [[0,1,0]],np.float32)
# caixas por peça
info=[]
for o in objs:
    vs=sorted({c[0]-1 for L in o['prims'].values() for tri in L for c in tri})
    P=V[vs]; o['min']=P.min(0); o['max']=P.max(0); info.append(o)
gmin=np.min([o['min'] for o in objs],0); gmax=np.max([o['max'] for o in objs],0); tam=gmax-gmin
# eixo vertical = Y (OBJ do Blender, Y para cima); eixo longo = maior entre X e Z
longo = 0 if tam[0]>=tam[2] else 2
L = max(tam[0],tam[2])
pas=[]
for o in objs:
    s=o['max']-o['min']; topo=o['max'][1]
    if topo > gmax[1]-0.12*tam[1] and max(s[0],s[2])>0.3*L and s[1]<0.04*tam[1]: o['nome']='mainrotor_blade_'+o['nome']; pas.append(o)
# eixo do rotor = centro das pás; cubo = peças pequenas no alto, perto desse eixo
if pas:
    pmin=np.min([o['min'] for o in pas],0); pmax=np.max([o['max'] for o in pas],0); eixo=(pmin+pmax)/2
    for o in objs:
        if o['nome'].startswith('mainrotor'): continue
        s=o['max']-o['min']; c=(o['max']+o['min'])/2
        if o['max'][1] > gmax[1]-0.3*tam[1] and np.hypot(c[0]-eixo[0], c[2]-eixo[2]) < 0.06*L and max(s[0],s[2]) < 0.08*L: o['nome']='mainrotor_hub_'+o['nome']
# rotor de cauda: peça pequena perto da extremidade do eixo longo, acima do meio da altura, em forma de disco (fina em uma direção lateral)
ext=[]
for o in objs:
    if o['nome'].startswith('mainrotor'): continue
    s=o['max']-o['min']; c=(o['max']+o['min'])/2
    perto = min(abs(c[longo]-gmin[longo]), abs(c[longo]-gmax[longo])) < 0.06*tam[longo]
    lat = 2 - longo if longo!=1 else 0
    if perto and s[1] < 0.35*tam[1] and s[lat] < 0.03*tam[lat]*10 and max(s[1], s[longo]) < 0.2*tam[longo] and s[lat] < 0.25*max(s[1], s[longo]): o['nome']='tailrotor_'+o['nome']
# GLB
bins=bytearray(); bviews=[]; accs=[]; meshes=[]; nodes=[]
def add(arr, alvo=None, tipo='VEC3', comp=5126, mm=False):
    global bins
    while len(bins)%4: bins+=b'\0'
    off=len(bins); b=arr.tobytes(); bins+=b
    bv={'buffer':0,'byteOffset':off,'byteLength':len(b)}
    if alvo: bv['target']=alvo
    bviews.append(bv); a={'bufferView':len(bviews)-1,'componentType':comp,'count':int(arr.shape[0]),'type':tipo}
    if mm: a['min']=arr.min(0).tolist(); a['max']=arr.max(0).tolist()
    accs.append(a); return len(accs)-1
MAT={'Material':0,'Material.001':1}
for o in objs:
    prims=[]
    for m,L in o['prims'].items():
        chave={}; pos=[]; uv=[]; nor=[]; ind=[]
        for tri in L:
            for c in tri:
                if c not in chave:
                    chave[c]=len(pos); pos.append(V[c[0]-1]); uv.append(VT[c[1]-1] if c[1] else [0,0]); nor.append(VN[c[2]-1] if c[2] else [0,1,0])
                ind.append(chave[c])
        pos=np.array(pos,np.float32); uv=np.array(uv,np.float32); uv[:,1]=1-uv[:,1]; nor=np.array(nor,np.float32)
        ind=np.array(ind,np.uint32 if len(pos)>65535 else np.uint16)
        pr={'attributes':{'POSITION':add(pos,34962,mm=True),'NORMAL':add(nor,34962),'TEXCOORD_0':add(uv,34962,'VEC2')},
            'indices':add(ind,34963,'SCALAR',5125 if ind.dtype==np.uint32 else 5123),'material':MAT.get(m,0)}
        prims.append(pr)
    meshes.append({'name':o['nome'],'primitives':prims}); nodes.append({'name':o['nome'],'mesh':len(meshes)-1})
while len(bins)%4: bins+=b'\0'
img=open(tex,'rb').read(); off=len(bins); bins+=img
while len(bins)%4: bins+=b'\0'
bviews.append({'buffer':0,'byteOffset':off,'byteLength':len(img)})
g={'asset':{'version':'2.0','generator':'HeliSense obj2glb','copyright':'Bell 429 Helicopter by agreene (@davidre), Sketchfab, CC BY 4.0'},
   'scene':0,'scenes':[{'nodes':list(range(len(nodes)))}],'nodes':nodes,'meshes':meshes,
   'materials':[{'name':'pintura','pbrMetallicRoughness':{'baseColorTexture':{'index':0},'metallicFactor':0.15,'roughnessFactor':0.45}},
                {'name':'vidro','alphaMode':'BLEND','doubleSided':True,'pbrMetallicRoughness':{'baseColorFactor':[0.12,0.16,0.2,0.45],'metallicFactor':0.6,'roughnessFactor':0.08}}],
   'textures':[{'source':0,'sampler':0}],'samplers':[{'magFilter':9729,'minFilter':9987,'wrapS':33071,'wrapT':33071}],
   'images':[{'bufferView':len(bviews)-1,'mimeType':'image/jpeg'}],
   'accessors':accs,'bufferViews':bviews,'buffers':[{'byteLength':len(bins)}]}
js=json.dumps(g,separators=(',',':')).encode()
while len(js)%4: js+=b' '
with open(saida,'wb') as f:
    f.write(struct.pack('<III',0x46546C67,2,12+8+len(js)+8+len(bins))); f.write(struct.pack('<II',len(js),0x4E4F534A)); f.write(js); f.write(struct.pack('<II',len(bins),0x004E4942)); f.write(bins)
print('ok', len(objs), 'peças; tamanho', tam.round(2).tolist(), 'eixo longo', 'XYZ'[longo])
print('rotor principal:', [o['nome'] for o in objs if o['nome'].startswith('mainrotor')])
print('rotor de cauda:', [o['nome'] for o in objs if o['nome'].startswith('tailrotor')])
