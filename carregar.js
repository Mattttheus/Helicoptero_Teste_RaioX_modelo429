// Manutenção Interativa – escolhe o modelo pela URL (?m=505) e carrega os arquivos de dados dele.
export function modeloAtual() {
  const cat = window.CATALOGO || [];
  const id = new URLSearchParams(location.search).get('m');
  return cat.find((c) => c.id === id) || cat.find((c) => c.id === '429') || cat[0];
}

// Carrega scripts clássicos em sequência (os dados usam variáveis globais: window.HELI, window.MOTOR)
export function carregarScripts(lista) {
  return lista.reduce((p, src) => p.then(() => new Promise((ok, erro) => {
    const s = document.createElement('script');
    s.src = src; s.onload = ok; s.onerror = () => erro(new Error('Não foi possível carregar ' + src));
    document.head.append(s);
  })), Promise.resolve());
}

export function mostrarErro(msg) {
  const e = document.getElementById('erro');
  if (e) { e.hidden = false; e.textContent = msg; }
  console.error(msg);
}
