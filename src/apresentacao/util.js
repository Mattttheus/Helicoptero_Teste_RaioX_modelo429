// Utilitários de apresentação compartilhados pelos controladores (antes duplicados em manual.js, motor.js e comandos.js).
export const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
// CSV com ; e BOM: abre direto no Excel em português
export const paraCsv = (linhas) => '﻿' + linhas.map((l) => l.map((c) => { c = String(c ?? ''); return /[;"\n]/.test(c) ? '"' + c.replace(/"/g, '""') + '"' : c; }).join(';')).join('\r\n');
export const dataArq = () => new Date().toISOString().slice(0, 10);
export function baixar(nome, texto, tipo) {
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([texto], { type: tipo })); a.download = nome;
  document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 3000);
}
// Centraliza a cena 3D no espaço livre abaixo da barra de botões (a barra não cobre mais o modelo).
// Usa uma "janela" da câmera: o quadro completo é mais alto que a tela e só a parte de cima é mostrada.
export function centrarAbaixoDaBarra(camera, w, h, barra) {
  let b = 0;
  if (barra && !barra.hidden && barra.offsetParent) b = Math.min(h * 0.4, barra.offsetTop + barra.offsetHeight + 6);
  camera.aspect = w / (h + b);
  if (b > 4) camera.setViewOffset(w, h + b, 0, 0, w, h); else camera.clearViewOffset();
  camera.updateProjectionMatrix();
}
// distância (px) do topo da vista até logo abaixo da barra de ferramentas (para controles flutuantes não ficarem por baixo dela)
export function abaixoDaBarra(vista, barra = document.getElementById('barra')) {
  if (!barra || !vista) return 10;
  return Math.max(10, Math.round(barra.getBoundingClientRect().bottom - vista.getBoundingClientRect().top + 8));
}
