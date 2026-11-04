#!/usr/bin/env node
const fs=require('fs'),path=require('path'),os=require('os');
const {Worker,isMainThread,parentPort,workerData}=require('worker_threads');
const L=require('./lib_game');
function parseArgs(argv){const o={};for(let i=0;i<argv.length;i++){const a=argv[i];if(!a.startsWith('--'))continue;const k=a.slice(2),v=argv[i+1];if(v===undefined||v.startsWith('--'))o[k]=true;else{o[k]=v;i++}}return o}
const A=isMainThread?parseArgs(process.argv.slice(2)):workerData.args;
const LAB=path.join(__dirname,'..'),PROJECT=path.resolve(A.project||path.join(LAB,'..','game'));
const GAME=L.loadGame({project:PROJECT,live:A.live,beam:A.beam?+A.beam:undefined,depth:A.depth?+A.depth:undefined});
const KEYS=['atk','hp','base','kw','neg','eff','hero','low','open','hs','hu','hc','unk','oh','stop'];
const wFrom=z=>{const w=Object.assign({},GAME.DEFAULT_BW);KEYS.forEach((k,i)=>w[k]=GAME.DEFAULT_BW[k]*Math.exp(z[i]));return w};

function pool(seed,K){const rnd=GAME.mulberry32(seed*977+13),B=GAME.BUILD,out=DECKS.map(d=>d.c.slice());
 for(let i=0;i<K;i++)for(let t=0;t<2000;t++){const cnt={},deck=[];while(deck.length<30){const id=B[Math.floor(rnd()*B.length)];if((cnt[id]||0)>=3)continue;cnt[id]=(cnt[id]||0)+1;deck.push(id)}
  const u=deck.filter(id=>CD[id].Type=='Unit').length,avg=deck.reduce((a,id)=>a+CD[id].Cost,0)/30;if(u>=8&&avg>=1.4&&avg<=3.8){out.push(deck);break}}
 return out}

function runTask(t){
 const P=pool(t.poolSeed,50),pr=GAME.mulberry32(t.seed),W=t.ref?Object.assign({},GAME.DEFAULT_BW,t.ref):GAME.DEFAULT_BW,C=Object.assign({},GAME.DEFAULT_BW,t.w);
 let wins=0,games=0;
 for(let g=0;g<t.n;g+=2){const i=Math.floor(pr()*P.length);let j;do j=Math.floor(pr()*P.length);while(j==i);
  for(let s=0;s<2;s++){GAME.seed(t.seed*7919+g*2+s);
   const r=s==0?GAME.playGame(P[i],P[j],{bwA:C,bwB:W}):GAME.playGame(P[i],P[j],{bwA:W,bwB:C});
   if(r.win<0)continue;games++;if(r.win==s)wins++}}
 return{id:t.id,wins,games}}
if(!isMainThread){parentPort.on('message',t=>parentPort.postMessage(runTask(t)));return}

const NW=Math.max(1,+A.workers||os.cpus().length);
const workers=Array.from({length:NW},()=>new Worker(__filename,{workerData:{args:A}}));
function runTasks(tasks){return new Promise(res=>{const out=[];let next=0;
 const feed=w=>{if(next>=tasks.length)return;const t=tasks[next++];w.once('message',r=>{out.push(r);if(out.length==tasks.length)res(out);else feed(w)});w.postMessage(t)};
 workers.forEach(feed)})}
const wilson=(w,n)=>{if(!n)return[NaN,NaN];const z=1.96,p=w/n,d=1+z*z/n,c=p+z*z/(2*n),h=z*Math.sqrt(p*(1-p)/n+z*z/(4*n*n));return[(c-h)/d,(c+h)/d]};
const gauss=rnd=>{let u=0,v=0;while(!u)u=rnd();while(!v)v=rnd();return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v)};
async function validate(z,vgames,label,seed){
 const chunks=Math.max(NW*2,8),per=Math.ceil(vgames/chunks/2)*2;
 const r=await runTasks(Array.from({length:chunks},(_,k)=>({id:k,w:wFrom(z),n:per,seed:seed*131+k,poolSeed:seed+5})));
 const w=r.reduce((a,x)=>a+x.wins,0),n=r.reduce((a,x)=>a+x.games,0),[lo,hi]=wilson(w,n);
 return{label,wins:w,games:n,wr:w/n,lo,hi}}

async function main(){
 const out=path.resolve(A.out||path.join(LAB,'tune_out'));fs.mkdirSync(out,{recursive:true});
 const seed=+A.seed||1,rnd=GAME.mulberry32(seed);
 if(A.validate){const j=JSON.parse(fs.readFileSync(A.validate,'utf8')),z=KEYS.map(k=>Math.log((j.weights||j)[k]/GAME.DEFAULT_BW[k]));
  const v=await validate(z,+A.vgames||800,'file',seed);console.log(`${A.validate}: wins ${v.wins}/${v.games} = ${(v.wr*100).toFixed(1)}%  (95% CI ${(v.lo*100).toFixed(1)}-${(v.hi*100).toFixed(1)}) vs the default weights`);process.exit(0)}
 const GENS=+A.gens||20,POP=+A.pop||12,MU=Math.max(2,Math.floor(POP/3)),G0=+A.games||150,D=KEYS.length;
 let m=Array(D).fill(0),sig=Array(D).fill(+A.sigma||0.3),best={z:m.slice(),wr:.5};
 const log=[['gen','mean_wr_of_best','best_wr','games_per_candidate','sigma_avg',...KEYS.map(k=>'w_'+k)]];
 const t0=Date.now();
 console.log(`tuning ${D} weights | ${GENS} generations x ${POP} candidates x ~${G0} games | workers ${NW} | out ${out}`);
 for(let gen=1;gen<=GENS;gen++){
  const n=Math.round(G0*(1+gen/GENS)/2)*2,cands=Array.from({length:POP},(_,c)=>c==0?m.slice():m.map((x,i)=>x+sig[i]*gauss(rnd)));
  const res=await runTasks(cands.map((z,c)=>({id:c,w:wFrom(z),n,seed:seed*1009+gen,poolSeed:seed+gen%7})));
  const fit=res.sort((a,b)=>a.id-b.id).map(r=>r.wins/Math.max(1,r.games)),order=fit.map((f,i)=>[f,i]).sort((a,b)=>b[0]-a[0]),top=order.slice(0,MU);
  const wts=top.map((_,k)=>Math.log(MU+.5)-Math.log(k+1)),ws=wts.reduce((a,b)=>a+b,0);
  const nm=Array(D).fill(0),nv=Array(D).fill(0);
  top.forEach(([f,i],k)=>cands[i].forEach((x,d)=>nm[d]+=wts[k]/ws*x));
  top.forEach(([f,i],k)=>cands[i].forEach((x,d)=>nv[d]+=wts[k]/ws*(x-nm[d])**2));
  const step=.7;m=m.map((x,d)=>x+step*(nm[d]-x));sig=sig.map((s,d)=>Math.max(.04,Math.sqrt(.5*s*s*.9+.5*nv[d])));
  if(order[0][0]>best.wr){best={z:cands[order[0][1]].slice(),wr:order[0][0]}}
  const w=wFrom(m);log.push([gen,order[0][0].toFixed(3),fit[0].toFixed(3),n,(sig.reduce((a,b)=>a+b)/D).toFixed(3),...KEYS.map(k=>w[k].toFixed(3))]);
  console.log(`gen ${String(gen).padStart(2)}  best candidate ${(order[0][0]*100).toFixed(1)}%  current mean ${(fit[0]*100).toFixed(1)}%  n=${n}  sigma~${(sig.reduce((a,b)=>a+b)/D).toFixed(2)}  ${((Date.now()-t0)/60000).toFixed(1)} min`);
  fs.writeFileSync(path.join(out,'tune_log.csv'),log.map(r=>r.join(',')).join('\n')+'\n')}
 const V=+A.vgames||800,vm_=await validate(m,V,'final mean',seed+500),vb=await validate(best.z,V,'best candidate',seed+600);
 const pick=vm_.wr>=vb.wr?{v:vm_,z:m}:{v:vb,z:best.z},solid=pick.v.lo>.5;
 const wFinal=wFrom(pick.z),res={note:solid?'Statistically better than the default weights (95% CI above 50%).':'NOT proven better than the default weights - keep the defaults unless a longer run confirms it.',
  validation:{[vm_.label]:vm_,[vb.label]:vb},chosen:pick.v.label,weights:Object.fromEntries(KEYS.map(k=>[k,+wFinal[k].toFixed(4)])),defaults:Object.fromEntries(KEYS.map(k=>[k,GAME.DEFAULT_BW[k]]))};
 fs.writeFileSync(path.join(out,'bot_weights.json'),JSON.stringify(res,null,1)+'\n');
 console.log('\n'+res.note+'\n'+[vm_,vb].map(v=>`  ${v.label}: ${v.wins}/${v.games} = ${(v.wr*100).toFixed(1)}%  (95% CI ${(v.lo*100).toFixed(1)}-${(v.hi*100).toFixed(1)})`).join('\n'));
 console.log('\nweights (default -> tuned):\n'+KEYS.map(k=>`  ${k.padEnd(5)} ${String(GAME.DEFAULT_BW[k]).padStart(6)} -> ${wFinal[k].toFixed(3)}`).join('\n'));
 process.exit(0)}
main().catch(e=>{console.error(e);process.exit(1)});
