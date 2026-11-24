# Lote de realce fotográfico das imagens já renderizadas: assets/renders/*.png -> assets/renders/realce/*.jpg (originais preservados).
#   blender -b --factory-startup -P ferramentas/blender_realce.py -- <pasta_renders>
import bpy, sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import blender_comp
args = sys.argv[sys.argv.index('--') + 1:]; pasta = args[0]; forcar = len(args) > 1 and args[1] == 'forcar'
saida = os.path.join(pasta, 'realce'); os.makedirs(saida, exist_ok=True)
for f in sorted(os.listdir(pasta)):
    if not f.lower().endswith('.png') or f.endswith('_anterior.png'): continue
    dest = os.path.join(saida, f[:-4] + '.jpg')
    if not forcar and os.path.exists(dest) and os.path.getmtime(dest) > os.path.getmtime(os.path.join(pasta, f)): print('JA FEITO', f, flush=True); continue
    bpy.ops.wm.read_factory_settings(use_empty=True)
    cena = bpy.context.scene
    im = bpy.data.images.load(os.path.join(pasta, f))
    if os.path.exists(dest[:-4] + '.tratado'):  # já tratada no próprio render: só converte para JPG, sem tratar de novo
        cena.view_settings.view_transform = 'Standard'; cena.render.image_settings.file_format = 'JPEG'; cena.render.image_settings.quality = 92
        im.save_render(dest, scene=cena); print('REALCE OK (ja tratada no render, so JPG)', f, flush=True); continue
    cena.render.resolution_x, cena.render.resolution_y = im.size[0], im.size[1]; cena.render.resolution_percentage = 100
    cena.render.engine = 'BLENDER_WORKBENCH'
    cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam')); cena.collection.objects.link(cam); cena.camera = cam
    cena.view_settings.view_transform = 'Standard'
    def fonte(t):
        n = t.nodes.new('CompositorNodeImage'); n.image = im; return n.outputs['Image']
    blender_comp.montar(cena, fonte)
    cena.render.image_settings.file_format = 'JPEG'; cena.render.image_settings.quality = 92
    cena.render.filepath = dest
    bpy.ops.render.render(write_still=True)
    print('REALCE OK', f, flush=True)
print('REALCE CONCLUIDO', flush=True)
