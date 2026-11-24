# HeliSense 3D – converte um modelo (FBX/OBJ/GLB) para GLB no Blender, nomeando as peças do rotor pela geometria.
# blender -b --factory-startup -P blender_converter.py -- <entrada> <saida.glb> "<crédito>"
import bpy, sys, os, re
from mathutils import Vector
a = sys.argv[sys.argv.index('--') + 1:]
ent, sai = a[0], a[1]; credito = a[2] if len(a) > 2 else ''
bpy.ops.wm.read_factory_settings(use_empty=True)
ext = os.path.splitext(ent)[1].lower()
if ext == '.fbx': bpy.ops.import_scene.fbx(filepath=ent)
elif ext == '.obj': bpy.ops.wm.obj_import(filepath=ent)
elif ext in ('.glb', '.gltf'): bpy.ops.import_scene.gltf(filepath=ent)
elif ext == '.stl': bpy.ops.wm.stl_import(filepath=ent)
else: raise SystemExit('formato não suportado: ' + ext)
malhas = [o for o in bpy.context.scene.objects if o.type == 'MESH']
# arquivos com tudo fundido em poucas malhas (pás grudadas na fuselagem): separa em partes soltas para achar o rotor
def _cx(o):
    pts = [o.matrix_world @ Vector(c) for c in o.bound_box]
    return Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts))), Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts)))
def _tem_pa(ms):  # alguma malha isolada com cara de pá (fina, comprida, no topo)?
    bx = [_cx(o) for o in ms]; gmn = Vector((min(b[0].x for b in bx), min(b[0].y for b in bx), min(b[0].z for b in bx))); gmx = Vector((max(b[1].x for b in bx), max(b[1].y for b in bx), max(b[1].z for b in bx)))
    t = gmx - gmn; L0 = max(t.x, t.y)
    return any(mx.z > gmx.z - 0.12 * t.z and max((mx - mn).x, (mx - mn).y) > 0.3 * L0 and (mx - mn).z < 0.06 * t.z for mn, mx in bx)
def _mat(o): return ' '.join((m.name if m else '') for m in o.data.materials)
POR_MATERIAL = [o for o in malhas if re.search(r'main.?rotor|rotor.?princ', _mat(o), re.I)]  # ex.: modelos do helijah (FlightGear)
SEPAROU = not POR_MATERIAL and (len(malhas) < 12 or not _tem_pa(malhas))
if SEPAROU:
    for o in malhas: o['origem'] = o.name
    bpy.ops.object.select_all(action='DESELECT')
    for o in malhas: o.select_set(True)
    bpy.context.view_layer.objects.active = malhas[0]
    bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT'); bpy.ops.mesh.separate(type='LOOSE'); bpy.ops.object.mode_set(mode='OBJECT')
    malhas = [o for o in bpy.context.scene.objects if o.type == 'MESH']
    for o in malhas: o.data.update()
def caixa(o):
    pts = [o.matrix_world @ Vector(c) for c in o.bound_box]
    return Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts))), Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts)))
cx = {o.name: caixa(o) for o in malhas}
gmin = Vector((min(c[0].x for c in cx.values()), min(c[0].y for c in cx.values()), min(c[0].z for c in cx.values())))
gmax = Vector((max(c[1].x for c in cx.values()), max(c[1].y for c in cx.values()), max(c[1].z for c in cx.values())))
tam = gmax - gmin; L = max(tam.x, tam.y)  # Blender: Z para cima
pas = []
for o in malhas:
    mn, mx = cx[o.name]; s = mx - mn
    if mx.z > gmax.z - 0.12 * tam.z and max(s.x, s.y) > 0.3 * L and s.z < 0.06 * tam.z: pas.append(o)
for o in POR_MATERIAL:
    if o not in pas: pas.append(o)
for o in pas: o.name = 'mainrotor_blade_' + o.name
if pas:
    bx = [caixa(o) for o in pas]
    eixo = Vector(((min(b[0].x for b in bx) + max(b[1].x for b in bx)) / 2, (min(b[0].y for b in bx) + max(b[1].y for b in bx)) / 2, 0))
    for o in malhas:
        if o.name.startswith('mainrotor'): continue
        mn, mx = caixa(o); s = mx - mn; c = (mn + mx) / 2
        if mx.z > gmax.z - 0.3 * tam.z and ((c.x - eixo.x) ** 2 + (c.y - eixo.y) ** 2) ** 0.5 < 0.06 * L and max(s.x, s.y) < 0.08 * L: o.name = 'mainrotor_hub_' + o.name
# rotor de cauda: peça pequena e fina na extremidade do eixo longo
longo = 'x' if tam.x >= tam.y else 'y'; lat = 'y' if longo == 'x' else 'x'
for o in malhas:
    if o.name.startswith('mainrotor'): continue
    mn, mx = caixa(o); s = mx - mn; c = (mn + mx) / 2
    perto = min(abs(getattr(c, longo) - getattr(gmin, longo)), abs(getattr(c, longo) - getattr(gmax, longo))) < 0.08 * getattr(tam, longo)
    if perto and getattr(s, lat) < 0.25 * max(s.z, getattr(s, longo)) and max(s.z, getattr(s, longo)) < 0.2 * getattr(tam, longo): o.name = 'tailrotor_' + o.name
if SEPAROU:  # junta de novo as partes por malha de origem e papel (fuselagem / pá / cubo / rotor de cauda)
    grupos = {}
    for o in malhas:
        papel = 'blade' if o.name.startswith('mainrotor_blade') else 'hub' if o.name.startswith('mainrotor_hub') else 'tail' if o.name.startswith('tailrotor') else 'casca'
        chave = (o.get('origem', ''), papel if papel != 'blade' else o.name)
        grupos.setdefault(chave, []).append(o)
    for (orig, papel), lista in grupos.items():
        if len(lista) > 1:
            bpy.ops.object.select_all(action='DESELECT')
            for o in lista: o.select_set(True)
            bpy.context.view_layer.objects.active = lista[0]; bpy.ops.object.join()
        o = lista[0]; base = orig.replace('.', '_')
        o.name = ({'hub': 'mainrotor_hub_', 'tail': 'tailrotor_', 'casca': ''}.get(papel, '') + base) if not papel.startswith('mainrotor_blade') else papel
    malhas = [o for o in bpy.context.scene.objects if o.type == 'MESH']
bpy.context.scene['copyright'] = credito
bpy.ops.export_scene.gltf(filepath=sai, export_format='GLB', export_yup=True, export_apply=True, export_copyright=credito, export_image_format='AUTO')
print('CONVERTIDO', sai, len(malhas), 'malhas; pás:', len(pas), '(separado em partes soltas)' if SEPAROU else '', flush=True)
print('NOMES', [o.name for o in malhas if o.name.startswith(('mainrotor', 'tailrotor'))], flush=True)
