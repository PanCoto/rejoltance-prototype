#!/usr/bin/env node
const fs=require('fs'),path=require('path'),os=require('os');
const {Worker,isMainThread,parentPort,workerData}=require('worker_threads');
const L=require('./lib_game'),DC=require('./deckcode');
function parseArgs(argv){const o={};for(let i=0;i<argv.length;i++){const a=argv[i];if(!a.startsWith('--'))continue;const k=a.slice(2),v=argv[i+1];if(v===undefined||v.startsWith('--'))o[k]=true;else{o[k]=v;i++}}return o}
const A=isMainThread?parseArgs(process.argv.slice(2)):workerData.args;
const LAB=path.join(__dirname,'..'),PROJECT=path.resolve(A.project||path.join(LAB,'..','game'));
const GAME=L.loadGame({project:PROJECT,live:A.live});
const parseSet=s=>{const o={};String(s||'').split(',').map(x=>x.trim()).filter(Boolean).forEach(kv=>{const[k,v]=kv.split('=');if(!(k in GAME.DEFAULT_BW))throw new Error('unknown setting "'+k+'" (valid: '+Object.keys(GAME.DEFAULT_BW).join(', ')+')');o[k]=+v});return Object.assign({},GAME.DEFAULT_BW,o)};
const VARS=String(A.a||'look=1,mull=1').split(';').map(s=>s.trim()).filter(Boolean),BASE=parseSet(A.b||'look=0,mull=0'),VS_BASIC=A.vs=='basic';
function pool(seed){const rnd=GAME.mulberry32(seed*977+13),B=GAME.BUILD,out=A.decks?DC.readDecks(A.decks).map(d=>d.c):DECKS.map(d=>d.c.slice());
 if(!A.decks)for(let i=0;i<25;i++)for(let t=0;t<2000;t++){const cnt={},deck=[];while(deck.length<30){const id=B[Math.floor(rnd()*B.length)];if((cnt[id]||0)>=3)continue;cnt[id]=(cnt[id]||0)+1;deck.push(id)}
  const u=deck.filter(id=>CD[id].Type=='Unit').length,avg=deck.reduce((a,id)=>a+CD[id].Cost,0)/30;if(u>=8&&avg>=1.4&&avg<=3.8){out.push(deck);break}}
 return out}
function runTask(t){
 const P=pool(1),pr=GAME.mulberry32(t.seed),W=parseSet(VARS[t.v]);let wins=0,games=0,rounds=0;
 for(let g=0;g<t.n;g+=2){const d=P[Math.floor(pr()*P.length)];
  for(let s=0;s<2;s++){GAME.seed(t.seed*7919+g*2+s);
   const x=s==0?{bwA:W,bwB:BASE,modeB:VS_BASIC?'basic':'smart'}:{bwA:BASE,bwB:W,modeA:VS_BASIC?'basic':'smart'},r=GAME.playGame(d,d,x);
   if(r.win<0)continue;games++;rounds+=r.rounds;if(r.win==s)wins++}}
 return{v:t.v,wins,games,rounds}}
if(!isMainThread){parentPort.on('message',t=>parentPort.postMessage(runTask(t)));return}
const NW=Math.max(1,+A.workers||os.cpus().length),workers=Array.from({length:NW},()=>new Worker(__filename,{workerData:{args:A}}));
const wilson=(w,n)=>{if(!n)return[NaN,NaN];const z=1.96,p=w/n,d=1+z*z/n,c=p+z*z/(2*n),h=z*Math.sqrt(p*(1-p)/n+z*z/(4*n*n));return[(c-h)/d,(c+h)/d]};
(async()=>{
 const N=+A.games||400,chunk=Math.max(10,Math.ceil(N/(NW*4))),per=Math.ceil(chunk/2)*2,tasks=[];
 VARS.forEach((_,v)=>{for(let left=N,k=0;left>0;left-=per,k++)tasks.push({v,n:Math.min(per,left),seed:(+A.seed||1)*1009+v*131+k})});
 const tot=VARS.map(()=>({wins:0,games:0,rounds:0}));let next=0,done=0;const t0=Date.now();
 await new Promise(res=>{const feed=w=>{if(next>=tasks.length)return;const t=tasks[next++];w.once('message',r=>{const o=tot[r.v];o.wins+=r.wins;o.games+=r.games;o.rounds+=r.rounds;process.stderr.write(`\r${++done}/${tasks.length} chunks  ${((Date.now()-t0)/1000).toFixed(0)}s   `);if(done==tasks.length)res();else feed(w)});w.postMessage(t)};workers.forEach(feed)});
 console.log('\n\nA = '+(VARS.length>1?'each of the variants below':VARS[0])+'   B = '+(VS_BASIC?'Basic bot':'Smart with '+(A.b||'look=0,mull=0'))+'   same deck on both sides, seats swapped, '+N+' games per variant requested\n');
 VARS.forEach((v,i)=>{const o=tot[i],[lo,hi]=wilson(o.wins,o.games),wr=o.wins/o.games;
  console.log(`  A [${v}]: ${o.wins}/${o.games} = ${(wr*100).toFixed(1)}%  (95% CI ${(lo*100).toFixed(1)}-${(hi*100).toFixed(1)})  avg game ${(o.rounds/o.games).toFixed(1)} rounds  -> ${lo>.5?'A is better (significant)':hi<.5?'A is WORSE (significant)':'no significant difference'}`)});
 process.exit(0)})();
