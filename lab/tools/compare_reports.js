#!/usr/bin/env node
const fs=require('fs'),path=require('path');
const argv=process.argv.slice(2),pos=[],O={};
for(let i=0;i<argv.length;i++){if(argv[i].startsWith('--')){const k=argv[i].slice(2),v=argv[i+1];if(v===undefined||v.startsWith('--'))O[k]=true;else{O[k]=v;i++}}else pos.push(argv[i])}
if(pos.length<2){console.error('usage: node tools/compare_reports.js <runA> <runB> [--metric delta_seen|wr_in_deck|swap] [--top N] [--min-games N] [--out dir]');process.exit(1)}
const [DA,DB]=pos.map(p=>path.resolve(p)),TOP=+O.top||15,MING=+O['min-games']||150;

function parseCSV(txt){const rows=[];let row=[],f='',q=false;
 for(let i=0;i<txt.length;i++){const c=txt[i];
  if(q){if(c=='"'){if(txt[i+1]=='"'){f+='"';i++}else q=false}else f+=c}
  else if(c=='"')q=true;else if(c==','){row.push(f);f=''}else if(c=='\n'){row.push(f);rows.push(row);row=[];f=''}else if(c!='\r')f+=c}
 if(f!==''||row.length){row.push(f);rows.push(row)}
 const h=rows.shift();return rows.filter(r=>r.length==h.length).map(r=>{const o={};h.forEach((k,i)=>o[k]=r[i]);return o})}
const load=(d,f)=>{const p=path.join(d,f);return fs.existsSync(p)?parseCSV(fs.readFileSync(p,'utf8')):null};
const num=x=>{const v=parseFloat(x);return Number.isFinite(v)?v:NaN};

const cA=load(DA,'cards.csv'),cB=load(DB,'cards.csv'),sA=load(DA,'swap.csv'),sB=load(DB,'swap.csv');
if(!cA||!cB){console.error('both folders need a cards.csv (run tools/sim.js --mode field or both)');process.exit(1)}
let metric=O.metric||((sA&&sB)?'swap':'delta_seen');
if(metric=='swap'&&!(sA&&sB)){console.error('swap metric needs swap.csv in both folders');process.exit(1)}

function table(cards,swap){const t={};
 if(metric=='swap')swap.forEach(r=>{t[r.card_id]={name:r.name,cost:r.cost,v:num(r.effect_pp),se:num(r.se_pp),n:num(r.games)}});
 else cards.forEach(r=>{const n=num(r.deck_games);if(!(n>=MING)||r.token=='1')return;
  const v=num(r[metric])*100;let se=NaN;
  if(metric=='wr_in_deck')se=(num(r.wr_ci_hi)-num(r.wr_ci_lo))*100/3.92;
  else{const sg=num(r.seen_games),ns=n-sg,wr=num(r.wr_seen);se=sg>0&&ns>0?100*Math.sqrt(.25/sg+.25/ns):NaN}
  t[r.id]={name:r.name,cost:r.cost,v,se,n}});
 return t}
const TA=table(cA,sA),TB=table(cB,sB);
const ids=Object.keys(TA).filter(id=>TB[id]&&Number.isFinite(TA[id].v)&&Number.isFinite(TB[id].v)&&(metric!='swap'||(TA[id].n>=MING&&TB[id].n>=MING)));
if(ids.length<5){console.error('too few cards in common ('+ids.length+'). Lower --min-games?');process.exit(1)}

const ranks=vals=>{const idx=vals.map((v,i)=>[v,i]).sort((a,b)=>a[0]-b[0]),r=Array(vals.length);
 for(let i=0;i<idx.length;){let j=i;while(j+1<idx.length&&idx[j+1][0]==idx[i][0])j++;const avg=(i+j)/2+1;for(let k=i;k<=j;k++)r[idx[k][1]]=avg;i=j+1}return r};
const pearson=(x,y)=>{const n=x.length,mx=x.reduce((a,b)=>a+b)/n,my=y.reduce((a,b)=>a+b)/n;let sxy=0,sx=0,sy=0;for(let i=0;i<n;i++){sxy+=(x[i]-mx)*(y[i]-my);sx+=(x[i]-mx)**2;sy+=(y[i]-my)**2}return sxy/Math.sqrt(sx*sy)};
const va=ids.map(i=>TA[i].v),vb=ids.map(i=>TB[i].v),ra=ranks(va),rb=ranks(vb);
const rho=pearson(ra,rb),r=pearson(va,vb);
function ceiling(){let s=0,K=200;const se=ids.map(i=>Math.hypot(TA[i].se||0,TB[i].se||0)/Math.SQRT2),base=ids.map((_,k)=>(va[k]+vb[k])/2);
 const gauss=()=>{let u=0,v=0;while(!u)u=Math.random();while(!v)v=Math.random();return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v)};
 for(let k=0;k<K;k++){const a=base.map((b,i)=>b+gauss()*se[i]),c=base.map((b,i)=>b+gauss()*se[i]);s+=pearson(ranks(a),ranks(c))}return s/K}
const ceil=ceiling();

const rows=ids.map((id,k)=>{const a=TA[id],b=TB[id],dz=Math.hypot(a.se||0,b.se||0),diff=b.v-a.v,z=dz>0?diff/dz:NaN;
 return{id,name:a.name,cost:a.cost,a:a.v,b:b.v,diff,z,rankA:ra[k],rankB:rb[k],shift:ra[k]-rb[k]}});
const N=rows.length;rows.forEach(x=>{x.placeA=N+1-x.rankA;x.placeB=N+1-x.rankB;x.move=x.placeA-x.placeB});
rows.forEach(x=>{x.flag=Math.abs(x.z)>=3&&Math.abs(x.diff)>=2?(x.diff>0?'UP':'DOWN'):''});

const pad=(s,n)=>String(s).padEnd(n),rj=(s,n)=>String(s).padStart(n),sg=x=>(x>=0?'+':'')+x.toFixed(1);
const line=r=>`  ${rj(r.id,4)} ${pad(r.name,26)} cost ${rj(r.cost,2)}  A ${rj(sg(r.a),6)}  B ${rj(sg(r.b),6)}  diff ${rj(sg(r.diff),6)}  z ${rj(Number.isFinite(r.z)?r.z.toFixed(1):'-',5)}  place ${rj(r.placeA,3)} -> ${rj(r.placeB,3)} (${r.move>=0?'+':''}${r.move}) ${r.flag}`;
const byZ=rows.slice().sort((x,y)=>Math.abs(y.z||0)-Math.abs(x.z||0)),byMove=rows.slice().sort((x,y)=>Math.abs(y.move)-Math.abs(x.move));
const nflag=rows.filter(r=>r.flag).length;
const rep=[`RE:Joltance run comparison`,`A = ${DA}`,`B = ${DB}`,`metric = ${metric==='swap'?'swap effect (pp, vs the average replacement card)':metric=='delta_seen'?'dSeen (pp: win rate when the card showed up minus when it did not)':'win rate of decks containing the card (pp, 50 = even)'}   cards compared: ${N}   min deck-games: ${MING}`,'',
 `Spearman rank correlation rho = ${rho.toFixed(2)}   Pearson r = ${r.toFixed(2)}   (rho you would see between two runs of the SAME setup, given the sampling noise: about ${ceil.toFixed(2)})`,
 rho>=ceil-.08?'-> The two runs agree about as well as noise allows: the card ordering does not depend on this change/bot.':rho>=ceil-.25?'-> Partly different: some cards are ordered differently beyond noise (see below).':'-> The ordering differs a lot beyond noise: conclusions from one run do not carry over to the other.',
 `Cards with a significant difference (|z|>=3 and |diff|>=2pp): ${nflag}`,'',
 'Largest statistically significant differences (B minus A):',...byZ.slice(0,TOP).map(line),'',
 'Biggest moves in the ranking (place 1 = strongest):',...byMove.slice(0,TOP).map(line),'',
 'Reading hint: if A and B are different BOTS, flagged cards are the ones a bot probably misplays - treat their data as unreliable. If they are before/after a PATCH, the flags are the patch effects.',''];
const outDir=path.resolve(O.out||DB);fs.mkdirSync(outDir,{recursive:true});
fs.writeFileSync(path.join(outDir,'compare.txt'),rep.join('\n'));
const q=s=>{s=String(s??'');return /[",\n]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s};
fs.writeFileSync(path.join(outDir,'compare.csv'),[['card_id','name','cost','metric_A_pp','metric_B_pp','diff_pp','z','place_A','place_B','move','flag']].concat(rows.sort((x,y)=>x.id-y.id).map(x=>[x.id,x.name,x.cost,x.a.toFixed(2),x.b.toFixed(2),x.diff.toFixed(2),Number.isFinite(x.z)?x.z.toFixed(2):'',x.placeA,x.placeB,x.move,x.flag])).map(r=>r.map(q).join(',')).join('\n')+'\n');
console.log(rep.join('\n'));console.log('Wrote '+path.join(outDir,'compare.txt')+' and compare.csv');
