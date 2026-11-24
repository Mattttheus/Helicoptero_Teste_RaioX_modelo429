# Tratamento fotográfico no Compositor do Blender (comum ao render e ao lote de realce):
# cor/contraste de foto, leve dispersão de lente (sem vinheta: a máscara elíptica muda de escala entre versões do Blender). Defensivo entre versões do Blender.
import bpy
def _set(no, nome, valor):
    try:
        if nome in no.inputs: no.inputs[nome].default_value = valor; return True
    except Exception: pass
    try: setattr(no, nome.lower().replace(' ', '_'), valor); return True
    except Exception: return False
def montar(cena, fonte_saida_fn):
    """fonte_saida_fn(arvore) -> socket de imagem de entrada. Monta a cadeia e liga no Composite."""
    cena.use_nodes = True; cena.render.use_compositing = True
    t = cena.node_tree
    for n in list(t.nodes): t.nodes.remove(n)
    img = fonte_saida_fn(t)
    cb = t.nodes.new('CompositorNodeColorBalance')
    try:
        cb.correction_method = 'LIFT_GAMMA_GAIN'; cb.lift = (1.0, 1.0, 1.0); cb.gamma = (1.0, 1.0, 0.995); cb.gain = (1.02, 1.015, 1.0)
    except Exception: pass
    t.links.new(img, cb.inputs['Image'])
    cor = t.nodes.new('CompositorNodeHueSat'); _set(cor, 'Saturation', 1.1)
    t.links.new(cb.outputs[0], cor.inputs['Image'])
    curva = t.nodes.new('CompositorNodeCurveRGB')  # leve "S" de contraste
    try:
        c = curva.mapping.curves[3]; c.points[0].location = (0, 0.01); c.points[1].location = (1, 0.99)
        c.points[0].location = (0, 0.0); c.points[1].location = (1, 1.0); c.points.new(0.25, 0.2); c.points.new(0.75, 0.81); curva.mapping.update()
    except Exception: pass
    t.links.new(cor.outputs[0], curva.inputs['Image'])
    lente = t.nodes.new('CompositorNodeLensdist'); _set(lente, 'Distort', -0.008); _set(lente, 'Dispersion', 0.012)
    try: lente.use_fit = True
    except Exception: pass
    t.links.new(curva.outputs[0], lente.inputs['Image'])
    out = t.nodes.new('CompositorNodeComposite'); t.links.new(lente.outputs[0], out.inputs['Image'])
    return out
