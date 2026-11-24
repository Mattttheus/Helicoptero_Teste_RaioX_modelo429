# Render fotorrealista (Cycles) de um modelo .glb com o HDRI do projeto – roda no Blender sem janela:
#   blender -b --factory-startup -P ferramentas/blender_render.py -- <modelo.glb> <hdri.hdr> <pasta_saida> <prefixo> [amostras] [largura]
import bpy, sys, math, os
from mathutils import Vector
def renderizar(glb, hdr, saida, pref, amostras=96, larg=1920, so_faltam=False):
  os.makedirs(saida, exist_ok=True)
  bpy.ops.wm.read_factory_settings(use_empty=True)
  bpy.ops.import_scene.gltf(filepath=glb)
  objs = [o for o in bpy.context.scene.objects if o.type == 'MESH']
  mn = Vector((1e9,) * 3); mx = Vector((-1e9,) * 3)
  for o in objs:
      for c in o.bound_box:
          w = o.matrix_world @ Vector(c); mn = Vector(map(min, mn, w)); mx = Vector(map(max, mx, w))
  centro = (mn + mx) / 2; tam = (mx - mn).length
  # chão de estúdio que só recebe sombra
  bpy.ops.mesh.primitive_plane_add(size=tam * 6, location=(centro.x, centro.y, mn.z))
  chao = bpy.context.active_object; chao.is_shadow_catcher = True
  # mundo: HDRI
  w = bpy.data.worlds.new('mundo'); bpy.context.scene.world = w; w.use_nodes = True
  nt = w.node_tree; env = nt.nodes.new('ShaderNodeTexEnvironment'); env.image = bpy.data.images.load(hdr)
  nt.links.new(env.outputs['Color'], nt.nodes['Background'].inputs['Color']); nt.nodes['Background'].inputs['Strength'].default_value = 1.0
  cena = bpy.context.scene; cena.render.engine = 'CYCLES'; cena.cycles.samples = amostras; cena.cycles.use_denoising = True
  try:
      prefs = bpy.context.preferences.addons['cycles'].preferences
      for tipo in ('OPTIX', 'CUDA', 'HIP', 'ONEAPI'):
          try: prefs.compute_device_type = tipo; prefs.get_devices(); break
          except Exception: pass
      for d in prefs.devices: d.use = True
      cena.cycles.device = 'GPU' if any(d.type != 'CPU' for d in prefs.devices) else 'CPU'
  except Exception: cena.cycles.device = 'CPU'
  cena.render.resolution_x = larg; cena.render.resolution_y = int(larg * 9 / 16); cena.render.film_transparent = False
  cena.view_settings.view_transform = 'AgX' if 'AgX' in [i.identifier for i in cena.view_settings.bl_rna.properties['view_transform'].enum_items] else 'Filmic'
  cena.render.image_settings.file_format = 'PNG'
  tratada = False
  try:  # tratamento fotográfico no Compositor (cor, contraste, lente)
      sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import blender_comp
      blender_comp.montar(cena, lambda t: t.nodes.new('CompositorNodeRLayers').outputs['Image']); tratada = True
  except Exception as e: print('COMPOSITOR indisponível:', e, flush=True)
  cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam')); cena.collection.objects.link(cam); cena.camera = cam; cam.data.lens = 50
  alvo = bpy.data.objects.new('alvo', None); cena.collection.objects.link(alvo); alvo.location = centro
  tr = cam.constraints.new('TRACK_TO'); tr.target = alvo; tr.track_axis = 'TRACK_NEGATIVE_Z'; tr.up_axis = 'UP_Y'
  vistas = {'34_frente': (35, 18), 'lateral': (90, 6), '34_tras': (145, 22), 'cima': (60, 55)}
  for nome, (az, el) in vistas.items():
      r = tam * 1.7; az_, el_ = math.radians(az), math.radians(el)
      cam.location = centro + Vector((r * math.cos(el_) * math.cos(az_), r * math.cos(el_) * math.sin(az_), r * math.sin(el_)))
      cena.render.filepath = os.path.join(saida, f'{pref}_{nome}.png')
      if so_faltam and os.path.exists(cena.render.filepath): print('VISTA JA FEITA', cena.render.filepath, flush=True); continue
      if os.path.exists(cena.render.filepath): os.replace(cena.render.filepath, cena.render.filepath[:-4] + '_anterior.png')  # guarda a versão anterior
      bpy.ops.render.render(write_still=True)
      print('RENDER OK', cena.render.filepath, flush=True)
      if tratada:  # já saiu tratada: grava o JPG da galeria e marca para o lote de realce não tratar de novo
          try:
              rdir = os.path.join(saida, 'realce'); os.makedirs(rdir, exist_ok=True); base = os.path.join(rdir, f'{pref}_{nome}')
              open(base + '.tratado', 'w').close()
              st = cena.render.image_settings; st.file_format = 'JPEG'; st.quality = 92
              bpy.data.images['Render Result'].save_render(base + '.jpg', scene=cena); st.file_format = 'PNG'
              print('JPG OK', base + '.jpg', flush=True)
          except Exception as e: print('JPG falhou:', e, flush=True)


import time
def trava(saida, pref): return os.path.join(saida, f'.ocupado_{pref}')
def vivo(pid):  # o processo dono da trava ainda existe? (Windows: OpenProcess + GetExitCodeProcess)
  try:
    import ctypes; k = ctypes.windll.kernel32; h = k.OpenProcess(0x1000, False, pid)
    if not h: return False
    c = ctypes.c_ulong(); k.GetExitCodeProcess(h, ctypes.byref(c)); k.CloseHandle(h); return c.value == 259
  except Exception: return True
def ocupado(saida, pref, pelo_log=True):  # outro Blender já está neste modelo? (trava de processo vivo, trava sem PID com < 6 h, ou log próprio mexido há < 10 min)
  t = trava(saida, pref); lg = os.path.join(saida, f'blender_log_{pref}.txt')
  if os.path.exists(t) and time.time() - os.path.getmtime(t) < 6 * 3600:
    pid = open(t).read().strip()
    if not pid.isdigit() or vivo(int(pid)): return True
  return pelo_log and os.path.exists(lg) and time.time() - os.path.getmtime(lg) < 600
def com_trava(saida, pref, fn):
  t = trava(saida, pref); open(t, 'w').write(str(os.getpid()))
  try: fn()
  finally:
    try: os.remove(t)
    except OSError: pass

a = sys.argv[sys.argv.index('--') + 1:]
VISTAS = ('34_frente', 'lateral', '34_tras', 'cima')
if a[0] == 'fila':  # fila: -- fila <pasta_glbs;...> <hdr> <saida> [amostras] [largura]  (só as vistas que faltam; pula modelos ocupados por outro Blender)
  pastas, hdr, saida = a[1].split(';'), a[2], a[3]
  amostras = int(a[4]) if len(a) > 4 else 64; larg = int(a[5]) if len(a) > 5 else 1600
  for pasta in pastas:
    for f in sorted(os.listdir(pasta)):
      if not f.endswith('.glb'): continue
      pref = f[:-4]
      if all(os.path.exists(os.path.join(saida, f'{pref}_{v}.png')) for v in VISTAS): print('JA FEITO', pref, flush=True); continue
      if ocupado(saida, pref): print('OCUPADO', pref, '(outro Blender está renderizando)', flush=True); continue
      print('INICIO', pref, flush=True)
      try: com_trava(saida, pref, lambda: renderizar(os.path.join(pasta, f), hdr, saida, pref, amostras, larg, so_faltam=True))
      except Exception as e: print('ERRO', pref, e, flush=True)
  print('FILA CONCLUIDA', flush=True)
else:  # render avulso: -- <glb> <hdr> <saida> <prefixo> [amostras] [largura] [faltam]  (faltam = só as vistas que ainda não existem)
  if len(a) > 6 and a[6] == 'faltam' and ocupado(a[2], a[3], pelo_log=False): print('OCUPADO', a[3], '(outro Blender está renderizando)', flush=True); sys.exit(0)  # (o log deste modelo é o deste processo: não conta)
  com_trava(a[2], a[3], lambda: renderizar(a[0], a[1], a[2], a[3], int(a[4]) if len(a) > 4 else 96, int(a[5]) if len(a) > 5 else 1920, so_faltam=len(a) > 6 and a[6] == 'faltam'))
