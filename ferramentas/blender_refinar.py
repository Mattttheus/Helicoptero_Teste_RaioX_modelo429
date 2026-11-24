# Refina no Blender (sem janela) os modelos do sistema exportados em assets/modelos3d/gerados/heli_<id>_codigo.glb:
# superfícies lisas (sombreamento suave com arestas vivas), pintura com verniz, vidro com transmissão e metais com rugosidade correta.
# Exporta só a casca externa (fuselagem, portas, carenagens, cauda, esquis) como assets/modelos3d/heli_<id>.glb.
#   blender -b --factory-startup -P ferramentas/blender_refinar.py -- <pasta_raiz> <id> [<id> ...]
import bpy, bmesh, sys, os, re
a = sys.argv[sys.argv.index('--') + 1:]; raiz, ids = a[0], a[1:]
CASCA = re.compile(r'^(nariz|fuselagem|fus_traseira|cone_cauda|carenagem_\w+|porta_\w+|deriva|estabilizador|parabrisa|janelas|esquis|entrada_ar|teto|piso_ext|capo\w*)$')
VIDRO = re.compile(r'^(parabrisa|janelas)$'); METAL = re.compile(r'^(esquis)$')
def base(n): return re.sub(r'\.\d+$', '', n)
for mid in ids:
    ent = os.path.join(raiz, 'assets', 'modelos3d', 'gerados', f'heli_{mid}_codigo.glb')
    sai = os.path.join(raiz, 'assets', 'modelos3d', f'heli_{mid}.glb')
    if not os.path.exists(ent): print('SEM ARQUIVO', ent, flush=True); continue
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=ent)
    manter = []
    for o in list(bpy.context.scene.objects):
        if o.type != 'MESH': continue
        nome = base(o.name)
        if not CASCA.match(nome): bpy.data.objects.remove(o, do_unlink=True); continue
        manter.append(o)
        me = o.data
        # superfície lisa SEM mudar o formato (subdivisão encolhe a casca e deixa peças internas aparecerem):
        # funde vértices duplicados, sombreia liso e marca como vivas só as arestas com dobra > 35°
        bm = bmesh.new(); bm.from_mesh(me); bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=0.0006)
        for f in bm.faces: f.smooth = True
        for e in bm.edges: e.smooth = not (e.is_manifold and e.calc_face_angle(0) > 0.61) and e.is_manifold
        bm.to_mesh(me); bm.free()
        o.modifiers.new('normais', 'WEIGHTED_NORMAL').keep_sharp = True
        for slot in o.material_slots:
            m = slot.material
            if not m or not m.use_nodes: continue
            m = m.copy(); slot.material = m
            bsdf = next((n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED'), None)
            if not bsdf: continue
            def put(k, v):
                if k in bsdf.inputs: bsdf.inputs[k].default_value = v
            if VIDRO.match(nome):
                put('Transmission Weight', 1.0); put('Roughness', 0.03); put('Metallic', 0.0); put('IOR', 1.5)
            elif METAL.match(nome):
                put('Metallic', 0.85); put('Roughness', 0.32)
            else:  # pintura automotiva/aeronáutica: base + verniz
                put('Metallic', 0.05); put('Roughness', 0.38); put('Coat Weight', 1.0); put('Coat Roughness', 0.06)
    bpy.ops.object.select_all(action='DESELECT')
    for o in manter: o.select_set(True)
    bpy.ops.export_scene.gltf(filepath=sai, export_format='GLB', use_selection=True, export_apply=True, export_yup=True, export_image_format='JPEG', export_jpeg_quality=85)
    print('REFINADO', mid, len(manter), 'peças ->', sai, round(os.path.getsize(sai) / 1048576, 2), 'MB', flush=True)
print('REFINO CONCLUIDO', flush=True)
