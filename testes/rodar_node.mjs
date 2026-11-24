// Roda os testes de domínio e aplicação no Node (sem navegador):  node testes/rodar_node.mjs
import fs from 'node:fs'; import vm from 'node:vm'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const amb = {
  existe: async (p) => fs.existsSync(path.join(RAIZ, p.split('?')[0])),
  carregar: async (arqs) => { const w = {}; w.window = w; const ctx = vm.createContext(w); for (const a of arqs) vm.runInContext(fs.readFileSync(path.join(RAIZ, a), 'utf8'), ctx, { filename: a }); return w; }
};
let ok = 0, falha = 0, aviso = 0;
const t = { grupo: (n) => console.log('\n■ ' + n), ok: (n, cond, det = '', nivel = null) => { if (cond) ok++; else if (nivel === 'aviso') aviso++; else falha++; console.log(`  ${cond ? '✔' : nivel === 'aviso' ? '⚠' : '✘'} ${n}${!cond && det ? '  → ' + det : ''}`); } };
const { executar } = await import('./casos.js');
await executar(t, amb);
console.log(`\n${ok} ok · ${falha} falhas · ${aviso} avisos`); process.exit(falha ? 1 : 0);
