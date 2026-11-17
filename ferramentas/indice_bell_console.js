/* Rode no Chrome, logado em https://www.bellhelicopter.net/tp/ (F12 → Console → colar → Enter) */
(async()=>{const g=async u=>{const r=await fetch('https://gateway.bellhelicopter.net/'+u,{credentials:'include'});return r.ok?r.json():null};
const R={gerado:new Date().toISOString(),fonte:'https://www.bellhelicopter.net/tp/',modelos:{}};
for(const m of ['505','407','407GXi','429','206B','206L4','230','430']){const M={manuais:[],sistemas:{},dms:[],capitulos:[]};const t=await g('toc/model/'+m);
M.manuais=(t&&t.toc||[]).map(x=>[x.toc,x.manual]);const s=await g('toc/sns/'+m);
if(s&&s.sns){const v=new Set();const w=(n,p)=>{for(const c of n){if(c.type==='dmc'){if(v.has(c.dmc))continue;v.add(c.dmc);M.dms.push([p[p.length-1]||'',c.title,c.subtitle,c.dmc.replace(/^DMC-/,''),c.pmc.replace(/^PMC-/,''),c.applic&&c.applic.text!=='ALL'?c.applic.text:''])}else{M.sistemas[c.id]=c.title;w(c.children||[],[...p,c.id])}}};w(s.sns,[])}
for(const man of ['MM','MPI','MO']){if(!M.manuais.some(x=>x[0]===man))continue;const d=await g('toc/model/'+m+'/'+man);for(const mm of (d&&d.toc&&d.toc.manuals||[]))for(const p of (mm.publications||[]))for(const f of (p.files||[]))M.capitulos.push([man,p.title,p.revision,f.title,f.url])}
R.modelos[m]=M;console.log(m,M.dms.length,M.capitulos.length)}
const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(R)],{type:'application/json'}));a.download='indice_manuais_bell.json';a.click()})();
