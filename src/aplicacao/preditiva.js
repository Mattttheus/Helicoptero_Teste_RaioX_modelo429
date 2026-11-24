// HeliSense 3D – motor de manutenção preditiva dos sensores (aplicação; puro, sem DOM: roda no navegador e no Node).
// Para cada sensor, a partir das amostras recentes {t (s), v}:
//  · suavização exponencial (EWMA) para tirar o ruído;
//  · tendência = inclinação por mínimos quadrados na janela recente (unidade por segundo) + R²;
//  · anomalia = desvio da leitura suavizada em relação ao valor de referência, em desvios-padrão do ruído (escore z);
//  · índice de saúde 0–100 = margem que resta até o limite crítico (100 = no valor de referência, 0 = no crítico);
//  · tempo estimado até o alerta e até o crítico, extrapolando a tendência (estimativa de vida útil remanescente, RUL);
//  · estado preditivo: 'ok' | 'anomalia' | 'tendencia' (ainda na faixa, mas vai sair dela dentro do horizonte) | 'al' | 'cr'.
// O sensor descreve-se como em sensores.js: { tipo: 'max'|'min'|'bool', base, ruido, al, cr }.

const limita = (x, a, b) => Math.min(b, Math.max(a, x));

export function suavizar(valores, alfa = 0.3) {
  const r = []; let m;
  for (const v of valores) { m = m === undefined ? v : alfa * v + (1 - alfa) * m; r.push(m); }
  return r;
}

// mínimos quadrados de v em função de t: { inclinacao (unid/s), intercepto, r2 }
export function tendencia(amostras) {
  const n = amostras.length;
  if (n < 3) return { inclinacao: 0, intercepto: n ? amostras[n - 1].v : 0, r2: 0 };
  let st = 0, sv = 0; for (const a of amostras) { st += a.t; sv += a.v; }
  const mt = st / n, mv = sv / n;
  let stt = 0, stv = 0, svv = 0;
  for (const a of amostras) { const dt = a.t - mt, dv = a.v - mv; stt += dt * dt; stv += dt * dv; svv += dv * dv; }
  if (stt === 0) return { inclinacao: 0, intercepto: mv, r2: 0 };
  const inclinacao = stv / stt, intercepto = mv - inclinacao * mt;
  return { inclinacao, intercepto, r2: svv === 0 ? 0 : (stv * stv) / (stt * svv) };
}

export function indiceSaude(s, v) {
  if (s.tipo === 'bool') return v >= 1 ? 0 : 100;
  const faixa = s.tipo === 'max' ? s.cr - s.base : s.base - s.cr;
  if (!(faixa > 0)) return 100;
  const resta = s.tipo === 'max' ? s.cr - v : v - s.cr;
  return Math.round(limita(resta / faixa, 0, 1) * 100);
}

// tempo (s) até a leitura cruzar o limite, se a tendência aponta para ele; null = não chega (ou já passou)
export function tempoAte(s, v, inclinacao, limite) {
  const sobe = s.tipo === 'max';
  if (sobe ? v >= limite : v <= limite) return 0;
  const passo = sobe ? inclinacao : -inclinacao;
  if (!(passo > 0)) return null;
  return Math.abs(limite - v) / passo;
}

export function estadoLimite(s, v) {
  if (s.tipo === 'bool') return v >= 1 ? 'cr' : 'ok';
  if (s.tipo === 'max') return v >= s.cr ? 'cr' : v >= s.al ? 'al' : 'ok';
  return v <= s.cr ? 'cr' : v <= s.al ? 'al' : 'ok';
}

/**
 * Análise de um sensor.
 * @param s        definição do sensor
 * @param amostras [{t (s), v}] em ordem de tempo (as mais recentes no fim)
 * @param op       { janela: nº de amostras da tendência (padrão 30), horizonte: s para avisar a tendência (padrão 3600),
 *                   zAnomalia: escore z que marca anomalia (padrão 4), r2Min: confiança mínima da tendência (padrão 0.5) }
 */
export function analisar(s, amostras, op = {}) {
  const { janela = 30, horizonte = 3600, zAnomalia = 4, r2Min = 0.5 } = op;
  const n = amostras.length;
  if (!n) return { n: 0, v: s.base, suave: s.base, inclinacao: 0, r2: 0, z: 0, saude: 100, tAlerta: null, tCritico: null, estado: 'ok', limite: 'ok' };
  const v = amostras[n - 1].v;
  if (s.tipo === 'bool') {
    const lim = estadoLimite(s, v);
    return { n, v, suave: v, inclinacao: 0, r2: 0, z: 0, saude: indiceSaude(s, v), tAlerta: lim === 'cr' ? 0 : null, tCritico: lim === 'cr' ? 0 : null, estado: lim, limite: lim };
  }
  const suaves = suavizar(amostras.map((a) => a.v));
  const suave = suaves[n - 1];
  const rec = amostras.slice(-janela).map((a, i, arr) => ({ t: a.t, v: suaves[n - arr.length + i] }));
  const { inclinacao, r2 } = tendencia(rec);
  // ruído: o informado no sensor (ruído uniforme ±ruido/2 → desvio ruido/√12) ou o medido nas leituras
  // ruído estimado pelas diferenças sucessivas (mediana de |Δv| ≈ 0,954 σ): robusto a tendências e degraus, que não são ruído
  const brutos = amostras.slice(-janela).map((a) => a.v), dif = brutos.slice(1).map((x, i) => Math.abs(x - brutos.at(i))).sort((a, b) => a - b);
  const medDif = dif.length ? dif.at(Math.floor(dif.length / 2)) : 0;
  const sigma = Math.max((s.ruido || 0) / Math.sqrt(12), medDif / 0.954, Math.abs((s.al - s.base) || 1) * 1e-3);
  const z = (suave - s.base) / sigma;
  // tendência só conta se for confiável (R²) E significativa: a variação prevista na janela precisa superar o ruído (3σ)
  const dtJanela = rec.length > 1 ? rec[rec.length - 1].t - rec[0].t : 0;
  const confiavel = r2 >= r2Min && rec.length >= 5 && Math.abs(inclinacao) * dtJanela >= 3 * sigma;
  const incl = confiavel ? inclinacao : 0;
  const tAlerta = tempoAte(s, suave, incl, s.al), tCritico = tempoAte(s, suave, incl, s.cr);
  const limite = estadoLimite(s, v);
  const ruim = s.tipo === 'max' ? z : -z; // desvio no sentido que leva ao limite
  let estado = limite;
  if (estado === 'ok') {
    if (tAlerta !== null && tAlerta <= horizonte) estado = 'tendencia';
    else if (ruim >= zAnomalia) estado = 'anomalia';
  }
  return { n, v, suave, inclinacao: incl, r2, z, saude: indiceSaude(s, suave), tAlerta, tCritico, estado, limite };
}

// componente: pior estado entre os sensores dele (ordem de gravidade) e menor índice de saúde
export const GRAVIDADE = { sem: 0, ok: 1, anomalia: 2, tendencia: 3, al: 4, cr: 5 };
export function saudeComponentes(sensores, analises) {
  const r = {};
  for (const s of sensores) {
    const a = analises[s.id]; if (!a) continue;
    for (const c of s.comp) {
      const x = r[c] || (r[c] = { estado: 'ok', saude: 100, tAlerta: null, sensores: [] });
      if (GRAVIDADE[a.estado] > GRAVIDADE[x.estado]) x.estado = a.estado;
      x.saude = Math.min(x.saude, a.saude);
      if (a.tAlerta !== null && (x.tAlerta === null || a.tAlerta < x.tAlerta)) x.tAlerta = a.tAlerta;
      x.sensores.push(s.id);
    }
  }
  return r;
}

// lista "próximas falhas previstas": sensores que ainda não estão em alerta, mas têm tempo estimado até o alerta, do mais próximo ao mais distante
export function previsoes(sensores, analises, limiteS = Infinity) {
  return sensores.map((s) => ({ s, a: analises[s.id] }))
    .filter((x) => x.a && x.a.limite === 'ok' && x.a.tAlerta !== null && x.a.tAlerta <= limiteS)
    .sort((x, y) => x.a.tAlerta - y.a.tAlerta);
}

export function formatarTempo(seg) {
  if (seg === null || seg === undefined || !isFinite(seg)) return '—';
  if (seg < 1) return 'agora';
  if (seg < 120) return `${Math.round(seg)} s`;
  if (seg < 3600) return `${Math.round(seg / 60)} min`;
  if (seg < 172800) return `${(seg / 3600).toFixed(1).replace('.', ',')} h`;
  return `${Math.round(seg / 86400)} dias`;
}

// CSV (separador ; e vírgula decimal, como o Excel em português espera) com uma linha por amostra de cada sensor
export function csvSensores(sensores, historicos, analises) {
  const num = (x, d = 3) => (x === null || x === undefined || !isFinite(x) ? '' : Number(x).toFixed(d).replace('.', ','));
  const linhas = ['sensor;nome;unidade;componentes;t_s;valor;alerta;critico;suave_atual;inclinacao_por_h;r2;escore_z;saude;t_ate_alerta_s;t_ate_critico_s;estado'];
  for (const s of sensores) {
    const h = historicos[s.id] || [], a = analises[s.id] || {};
    for (const p of h) linhas.push([s.id, `"${s.n.replace(/"/g, '""')}"`, s.un, s.comp.join(' '), num(p.t, 1), num(p.v), s.al ?? '', s.cr ?? '',
      num(a.suave), num((a.inclinacao || 0) * 3600), num(a.r2, 2), num(a.z, 2), a.saude ?? '', num(a.tAlerta, 0), num(a.tCritico, 0), a.estado || ''].join(';'));
  }
  return linhas.join('\r\n');
}
