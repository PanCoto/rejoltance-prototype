#!/usr/bin/env node
const fs=require('fs'),path=require('path'),vm=require('vm'),os=require('os');
const {Worker,isMainThread,parentPort,workerData}=require('worker_threads');
const DC=require('./deckcode');

function parseArgs(argv){const o={};for(let i=0;i<argv.length;i++){const a=argv[i];if(!a.startsWith('--'))continue;const k=a.slice(2),v=argv[i+1];if(v===undefined||v.startsWith('--'))o[k]=true;else{o[k]=v;i++}}return o}
const A=isMainThread?parseArgs(process.argv.slice(2)):workerData.args;
const LAB=path.join(__dirname,'..'),PROJECT=path.resolve(A.project||path.join(LAB,'..','game'));
const BOT=(A.bot||'basic')=='smart'?'smart':'basic';
const SZ=1024;

(function loadGame(){
 const rd=f=>fs.readFileSync(path.join(PROJECT,f),'utf8');
 global.window=global;
 vm.runInThisContext(rd('cards.js')+'\n;\n',{filename:'cards.js'});
 if(fs.existsSync(path.join(PROJECT,'decks.js')))vm.runInThisContext(rd('decks.js')+'\n;\n',{filename:'decks.js'});
 if(A.live){const d=JSON.parse(fs.readFileSync(A.live,'utf8'));
  Object.keys(d.cards||{}).forEach(id=>{const c=CARDS.find(k=>k.Id==id);if(c)Object.assign(c,d.cards[id]);else CARDS.push(Object.assign({Id:+id},d.cards[id]))})}
 if(A.weights){const j=JSON.parse(fs.readFileSync(A.weights,'utf8'));global.BW_OVERRIDE=j.weights||j}
 const bot=rd('bot.js').replace('BUDGET=140','BUDGET=Infinity');
 vm.runInThisContext(rd('engine.js')+'\n;\n'+bot,{filename:'engine+bot.js'});
})();
const BUILD=CARDS.filter(c=>c.Id<900).map(c=>c.Id).sort((a,b)=>a-b);
const BIDX={};BUILD.forEach((id,i)=>BIDX[id]=i);const NB=BUILD.length;

function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}

function randomDeck(rnd){
 for(let tries=0;tries<5000;tries++){
  const cnt={},deck=[];
  while(deck.length<30){const id=BUILD[Math.floor(rnd()*NB)];if((cnt[id]||0)>=3)continue;cnt[id]=(cnt[id]||0)+1;deck.push(id)}
  const units=deck.filter(id=>CD[id].Type=='Unit').length,avg=deck.reduce((a,id)=>a+CD[id].Cost,0)/30;
  if(units>=8&&avg>=1.4&&avg<=3.8)return deck.sort((a,b)=>a-b)}
 return null}
function makePool(){
 let pool;
 if(A.decks){pool=DC.readDecks(A.decks)}
 else{pool=DECKS.map(d=>({n:d.n,c:d.c.slice()}));const rnd=mulberry32((+A.seed||1)*977+13),K=A['random-decks']===undefined?60:+A['random-decks'];
  for(let i=0;i<K;i++){const c=randomDeck(rnd);if(c)pool.push({n:'rnd'+String(i+1).padStart(3,'0'),c})}}
 pool.forEach(d=>{if(d.c.length<10||d.c.some(id=>!CD[id]))throw new Error('bad deck '+d.n)});
 return pool}

const MET=['deckGames','deckWins','deckFirstGames','deckFirstWins','copies','openN','mullN','seenGames','seenWins','playedGames','playedWins','seenNotPlayedGames','seenNotPlayedWins',
 'playCount','playRoundSum','dmgEnemy','placed','deaths','lifeRounds','lifeUnits'];
function newCounters(){const m={};MET.forEach(k=>m[k]=new Float64Array(SZ));
 return{m,pairGames:new Float64Array(NB*NB),pairWins:new Float64Array(NB*NB),
  g:{games:0,timeouts:0,firstWins:0,hpSum:0,rounds:new Float64Array(60)},deck:{},swap:{},rows:[]}}
function mergeInto(a,b){
 MET.forEach(k=>{for(let i=0;i<SZ;i++)a.m[k][i]+=b.m[k][i]});
 for(let i=0;i<a.pairGames.length;i++){a.pairGames[i]+=b.pairGames[i];a.pairWins[i]+=b.pairWins[i]}
 ['games','timeouts','firstWins','hpSum'].forEach(k=>a.g[k]+=b.g[k]);for(let i=0;i<60;i++)a.g.rounds[i]+=b.g.rounds[i];
 for(const k in b.deck){const d=a.deck[k]||(a.deck[k]=[0,0,0,0]);b.deck[k].forEach((v,i)=>d[i]+=v)}
 for(const k in b.swap){const d=a.swap[k]||(a.swap[k]=[0,0,0,0]);b.swap[k].forEach((v,i)=>d[i]+=v)}
 a.rows.push(...b.rows)}

const origPlay=play,origDmg=dmg,origMull=mulligan,origPlace=place,origKill=killUnit;
let T=null;
play=function(G,p,ci,ln,pk){
 if(!T||G!==T.G)return origPlay.apply(this,arguments);
 const c=p.hand[ci],pc=T.cur,pp=T.curP;if(c){T.cur=c.id;T.curP=p.i}
 const r=origPlay.apply(this,arguments);T.cur=pc;T.curP=pp;
 if(r&&c){T.m.playCount[c.id]++;T.m.playRoundSum[c.id]+=G.turn;if(T.idOf[p.i].has(c.uid))T.played[p.i].add(c.uid)}
 return r};
mulligan=function(G,p,ids){
 if(T&&G===T.G)p.hand.forEach(c=>{if(c.id<900){T.m.openN[c.id]++;if(ids.includes(c.uid))T.m.mullN[c.id]++}});
 return origMull.apply(this,arguments)};
dmg=function(G,t,n,s,melee){
 if(!T||G!==T.G)return origDmg.apply(this,arguments);
 const to=t.h?t.p:t.o,before=t.h?G.p[t.p].hp:t.hp;
 const r=origDmg.apply(this,arguments);
 const d=before-(t.h?G.p[t.p].hp:t.hp);
 if(d>0){const unitSrc=!!(s&&s.uid&&!s.sp&&s.id!=null),id=unitSrc?s.id:T.cur,so=unitSrc?s.o:T.curP;
  if(id!=null&&so!=null&&so!==to&&id<SZ)T.m.dmgEnemy[id]+=d}
 return r};
place=function(G,p,u,i){
 if(T&&G===T.G&&u.t0==null){u.t0=G.turn;T.m.placed[u.id]++;T.units.push(u)}
 return origPlace.apply(this,arguments)};
killUnit=function(G,u,lane){
 if(T&&G===T.G&&!u.dead){u.dead=1;T.m.deaths[u.id]++;T.m.lifeRounds[u.id]+=G.turn-(u.t0==null?G.turn:u.t0)+1;T.m.lifeUnits[u.id]++}
 return origKill.apply(this,arguments)};

function playGame(da,db,C){
 const G=newGame(da,db);
 T=C?{G,m:C.m,cur:null,curP:null,idOf:[new Map(),new Map()],played:[new Set(),new Set()],units:[]}:null;
 if(T)G.p.forEach((p,i)=>p.hand.concat(p.deck).forEach(c=>T.idOf[i].set(c.uid,c.id)));
 BOTMODE=BOT;G.p.forEach(p=>botMull(G,p));
 const pref=()=>['first','second'][Math.floor(Math.random()*2)];
 if(A.first=='bot')decideStart(G,'first','first');else decideStart(G,pref(),pref());
 startRound(G);let guard=0;
 while(!G.over&&guard++<500){
  if(G.step>=3){for(let i=0;i<4&&!G.over;i++)lane(G,i,{});if(G.over)break;endRound(G);startRound(G);continue}
  const i=G.act;if(i!==0&&i!==1){nextStep(G);continue}
  let n=0;while(n++<20&&!G.over){const m=(BOT=='basic'?botPlanBasic:botPlanSmart)(G,G.p[i]);if(!m)break;play(G,G.p[i],m.ci,m.ln,m.pk)}
  nextStep(G)}
 const win=G.over?G.over.win:-1,first=G.fp,res={win,rounds:G.turn,hp:[G.p[0].hp,G.p[1].hp],first};
 if(!T)return res;
 const t=T;T=null;
 if(win<0){C.g.timeouts++;return res}
 t.units.forEach(u=>{if(!u.dead){t.m.lifeRounds[u.id]+=G.turn-u.t0+1;t.m.lifeUnits[u.id]++}});
 for(let s=0;s<2;s++){
  const p=G.p[s],won=win==s?1:0,deckIds=s==0?da:db,left=new Set(p.deck.map(c=>c.uid)),copies={},seen={},played={};
  deckIds.forEach(id=>copies[id]=(copies[id]||0)+1);
  t.idOf[s].forEach((id,uid)=>{if(!left.has(uid))seen[id]=1});
  t.played[s].forEach(uid=>{const id=t.idOf[s].get(uid);played[id]=1;seen[id]=1});
  const m=t.m,ids=Object.keys(copies).map(Number);
  ids.forEach(id=>{if(id>=900)return;
   m.deckGames[id]++;m.deckWins[id]+=won;m.copies[id]+=copies[id];
   if(first===s){m.deckFirstGames[id]++;m.deckFirstWins[id]+=won}
   if(seen[id]){m.seenGames[id]++;m.seenWins[id]+=won}
   if(played[id]){m.playedGames[id]++;m.playedWins[id]+=won}else if(seen[id]){m.seenNotPlayedGames[id]++;m.seenNotPlayedWins[id]+=won}});
  const u=ids.filter(id=>id<900);
  for(let x=0;x<u.length;x++)for(let y=x+1;y<u.length;y++){const a=BIDX[u[x]],b=BIDX[u[y]],k=a<b?a*NB+b:b*NB+a;C.pairGames[k]++;C.pairWins[k]+=won}}
 C.g.games++;C.g.rounds[Math.min(59,G.turn)]++;if(first===win)C.g.firstWins++;C.g.hpSum+=Math.max(G.p[0].hp,0)+Math.max(G.p[1].hp,0);
 return res}

const pick=(rnd,n,not)=>{let x;do x=Math.floor(rnd()*n);while(x===not);return x};
function runJob(job){
 const rnd=mulberry32(job.seed);Math.random=rnd;
 const C=newCounters(),pool=job.pool,cap=job.rowCap||0;
 const bump=(map,k,w,f,fw)=>{const d=map[k]||(map[k]=[0,0,0,0]);d[0]++;d[1]+=w;if(f!==undefined){d[2]+=f;d[3]+=fw}};
 if(job.type=='field'){
  for(let g=0;g<job.n;g++){
   const i=pick(rnd,pool.length),j=pick(rnd,pool.length,i),r=playGame(pool[i].c,pool[j].c,C);
   if(r.win<0)continue;
   bump(C.deck,i,r.win==0?1:0,r.first==0?1:0,r.first==0&&r.win==0?1:0);bump(C.deck,j,r.win==1?1:0,r.first==1?1:0,r.first==1&&r.win==1?1:0);
   if(C.rows.length<cap)C.rows.push([i,j,r.first,r.win,r.rounds,r.hp[0],r.hp[1]])}}
 else if(job.type=='swapA'){
  for(let k=0;k<job.n;k++){const i=job.deckIndex[k%job.deckIndex.length],j=pick(rnd,pool.length,i),sw=rnd()<.5,r=sw?playGame(pool[j].c,pool[i].c,null):playGame(pool[i].c,pool[j].c,null);
   if(r.win<0)continue;bump(C.deck,i,(sw?r.win==1:r.win==0)?1:0)}}
 else if(job.type=='swapB'){
  for(let k=0;k<job.n;k++){
   const X=BUILD[(job.offset+k)%NB];let i,deck;
   for(let t=0;t<50;t++){i=pick(rnd,pool.length);deck=pool[i].c.slice();if(deck.filter(id=>id==X).length<3)break}
   if(deck.filter(id=>id==X).length>=3)continue;
   let slot;do slot=Math.floor(rnd()*deck.length);while(deck[slot]==X);deck[slot]=X;
   const j=pick(rnd,pool.length,i),sw=rnd()<.5,r=sw?playGame(pool[j].c,deck,null):playGame(deck,pool[j].c,null);
   if(r.win<0)continue;const won=(sw?r.win==1:r.win==0)?1:0,res=won-job.baseWR[i];
   const d=C.swap[X]||(C.swap[X]=[0,0,0,0]);d[0]++;d[1]+=won;d[2]+=res;d[3]+=res*res}}
 return C}

if(!isMainThread){parentPort.postMessage(runJob(workerData.job));return}

const NW=Math.max(1,+A.workers||os.cpus().length);
function runJobs(jobs,label){
 return new Promise((resolve,reject)=>{const total=newCounters();let next=0,done=0,active=0;const t0=Date.now();
  const launch=()=>{while(active<NW&&next<jobs.length){const job=jobs[next++];active++;
    const w=new Worker(__filename,{workerData:{args:A,job}});
    w.once('message',C=>{mergeInto(total,C)});w.once('error',reject);
    w.once('exit',()=>{active--;done++;process.stderr.write(`\r${label}: ${done}/${jobs.length} chunks  ${((Date.now()-t0)/1000).toFixed(0)}s   `);if(done==jobs.length){process.stderr.write('\n');resolve(total)}else launch()})}};
  launch()})}
const chunk=(n,per)=>{const out=[];for(let left=n;left>0;left-=per)out.push(Math.min(per,left));return out};

function wilson(w,n){if(!n)return[NaN,NaN];const z=1.96,p=w/n,d=1+z*z/n,c=p+z*z/(2*n),h=z*Math.sqrt(p*(1-p)/n+z*z/(4*n*n));return[(c-h)/d,(c+h)/d]}
const f4=x=>Number.isFinite(x)?x.toFixed(4):'';
const f2=x=>Number.isFinite(x)?x.toFixed(2):'';
const q=s=>{s=String(s??'');return /[",\n]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s};
const csv=(rows)=>rows.map(r=>r.map(q).join(',')).join('\n')+'\n';

function cardRows(C,minGames){
 const m=C.m,out=[];
 CARDS.slice().sort((a,b)=>a.Id-b.Id).forEach(c=>{const id=c.Id,dg=m.deckGames[id],sg=m.seenGames[id],pg=m.playedGames[id],dw=m.deckWins[id],sw=m.seenWins[id];
  const wr=dg?dw/dg:NaN,[lo,hi]=wilson(dw,dg),wrSeen=sg?sw/sg:NaN,wrNot=(dg-sg)?(dw-sw)/(dg-sg):NaN;
  const r={id,name:c.Name,type:c.Type,cost:c.Cost,atk:c.Attack??'',hp:c.Health??'',subtypes:(c.Subtypes||[]).join('/'),keywords:(c.Keywords||[]).join('/'),token:id>=900?1:0,
   deck_games:dg,avg_copies:dg?m.copies[id]/dg:NaN,wr_in_deck:wr,wr_ci_lo:lo,wr_ci_hi:hi,
   first_wr:m.deckFirstGames[id]?m.deckFirstWins[id]/m.deckFirstGames[id]:NaN,second_wr:(dg-m.deckFirstGames[id])?(dw-m.deckFirstWins[id])/(dg-m.deckFirstGames[id]):NaN,
   opening_hands:m.openN[id],mulligan_rate:m.openN[id]?m.mullN[id]/m.openN[id]:NaN,
   seen_games:sg,seen_rate:dg?sg/dg:NaN,wr_seen:wrSeen,wr_not_seen:wrNot,delta_seen:wrSeen-wrNot,
   played_games:pg,wr_played:pg?m.playedWins[id]/pg:NaN,wr_seen_not_played:m.seenNotPlayedGames[id]?m.seenNotPlayedWins[id]/m.seenNotPlayedGames[id]:NaN,dead_rate:sg?m.seenNotPlayedGames[id]/sg:NaN,
   plays_total:m.playCount[id],avg_round_played:m.playCount[id]?m.playRoundSum[id]/m.playCount[id]:NaN,
   dmg_enemy_per_play:m.playCount[id]?m.dmgEnemy[id]/m.playCount[id]:NaN,dmg_enemy_per_game_in_deck:dg?m.dmgEnemy[id]/dg:NaN,
   units_placed:m.placed[id],unit_deaths:m.deaths[id],death_rate:m.placed[id]?m.deaths[id]/m.placed[id]:NaN,avg_lifetime_rounds:m.lifeUnits[id]?m.lifeRounds[id]/m.lifeUnits[id]:NaN,
   stats_per_cost:c.Type=='Unit'?((c.Attack||0)+(c.Health||0))/Math.max(1,c.Cost):''};
  out.push(r)});
 return out}

async function main(){
 const t0=Date.now(),pool=makePool(),mode=A.mode||'field',seed=+A.seed||1;
 const out=path.resolve(A.out||path.join(LAB,'sim_out',new Date().toISOString().replace(/[:.]/g,'-').slice(0,19)));
 fs.mkdirSync(out,{recursive:true});
 const minGames=+A['min-games']||300,rowCap=+A['games-csv']||0;
 console.log(`RE:Joltance sim | bot=${BOT} workers=${NW} seed=${seed} pool=${pool.length} decks (${DECKS.length} premade) | out=${out}`);
 let F=null,SW=null;const rep=[];
 if(mode=='field'||mode=='both'){
  const N=+A.games||20000,per=Math.max(250,Math.ceil(N/(NW*6))),jobs=chunk(N,per).map((n,k)=>({type:'field',n,seed:seed*100003+k,pool,rowCap:k==0?rowCap:0}));
  F=await runJobs(jobs,'field games');
  writeField(out,F,pool,minGames,N,rep)}
 if(mode=='swap'||mode=='both'){
  const per=+A['swap-games']||3000,baseG=+A['base-games']||1500;
  const idx=pool.map((_,i)=>i),jobsA=[];for(let k=0;k<idx.length;k+=Math.max(1,Math.ceil(idx.length/(NW*3))))jobsA.push({type:'swapA',n:baseG*Math.min(Math.ceil(idx.length/(NW*3)),idx.length-k),seed:seed*7919+k,pool,deckIndex:idx.slice(k,k+Math.ceil(idx.length/(NW*3)))});
  const BA=await runJobs(jobsA,'swap baseline');
  const baseWR=pool.map((_,i)=>BA.deck[i]&&BA.deck[i][0]?BA.deck[i][1]/BA.deck[i][0]:0.5);
  const total=per*NB,pj=Math.max(NB,Math.ceil(total/(NW*6)/NB)*NB),jobsB=[];
  for(let off=0,k=0;off<total;off+=pj,k++)jobsB.push({type:'swapB',n:Math.min(pj,total-off),offset:off,seed:seed*104729+k,pool,baseWR});
  SW=await runJobs(jobsB,'swap games');
  writeSwap(out,SW,minGames,per,rep)}
 const head=[`RE:Joltance balance report   ${new Date().toISOString()}`,`bot=${BOT}  seed=${seed}  decks in pool=${pool.length}  mode=${mode}${A.live?'  live patch='+A.live:''}`,`run time ${((Date.now()-t0)/1000).toFixed(0)}s`,''];
 fs.writeFileSync(path.join(out,'report.txt'),head.concat(rep).join('\n')+'\n');
 console.log('\n'+head.concat(rep).join('\n'));console.log('Files in '+out)}

function writeField(out,C,pool,minGames,N,rep){
 const rows=cardRows(C,minGames),cols=Object.keys(rows[0]);
 const fmt=v=>typeof v=='number'?(Number.isInteger(v)?String(v):f4(v)):v;
 fs.writeFileSync(path.join(out,'cards.csv'),csv([cols].concat(rows.map(r=>cols.map(c=>fmt(r[c]))))));
 const dr=[['deck','cards','units','spells','avg_cost','games','wr','wr_ci_lo','wr_ci_hi','wr_going_first','wr_going_second']];
 pool.forEach((d,i)=>{const s=C.deck[i]||[0,0,0,0],[lo,hi]=wilson(s[1],s[0]),u=d.c.filter(id=>CD[id].Type=='Unit').length;
  dr.push([d.n,d.c.join(' '),u,d.c.length-u,f2(d.c.reduce((a,id)=>a+CD[id].Cost,0)/d.c.length),s[0],f4(s[0]?s[1]/s[0]:NaN),f4(lo),f4(hi),f4(s[2]?s[3]/s[2]:NaN),f4((s[0]-s[2])?(s[1]-s[3])/(s[0]-s[2]):NaN)])});
 fs.writeFileSync(path.join(out,'decks.csv'),csv(dr));
 const m=C.m,minPair=Math.max(100,Math.round(minGames/2)),sr=[];
 for(let a=0;a<NB;a++)for(let b=a+1;b<NB;b++){const n=C.pairGames[a*NB+b];if(n<minPair)continue;const ia=BUILD[a],ib=BUILD[b],wr=C.pairWins[a*NB+b]/n;
  const ea=m.deckGames[ia]?m.deckWins[ia]/m.deckGames[ia]:.5,eb=m.deckGames[ib]?m.deckWins[ib]/m.deckGames[ib]:.5,exp=.5+(ea-.5)+(eb-.5),lift=wr-exp,se=.5/Math.sqrt(n);
  sr.push([ia,CD[ia].Name,ib,CD[ib].Name,n,wr,exp,lift,lift/se])}
 sr.sort((x,y)=>y[8]-x[8]);
 fs.writeFileSync(path.join(out,'synergy.csv'),csv([['card_a','name_a','card_b','name_b','games_together','wr_together','wr_expected','lift','z']].concat(sr.map(r=>[r[0],r[1],r[2],r[3],r[4],f4(r[5]),f4(r[6]),f4(r[7]),f2(r[8])]))));
 if(C.rows.length)fs.writeFileSync(path.join(out,'games.csv'),csv([['deck_seat0','deck_seat1','first_seat','winner_seat','rounds','hp_seat0','hp_seat1']].concat(C.rows.map(r=>[pool[r[0]].n,pool[r[1]].n,r[2],r[3],r[4],r[5],r[6]]))));
 const g=C.g,[flo,fhi]=wilson(g.firstWins,g.games),ok=rows.filter(r=>!r.token&&r.deck_games>=minGames);
 const pad=(s,n)=>String(s).padEnd(n),rj=(s,n)=>String(s).padStart(n);
 const tab=(list,keys)=>list.map(r=>'  '+keys.map(([k,w,fn])=>(k=='name'?pad:rj)(fn?fn(r[k]):r[k],w)).join(' ')).join('\n');
 const pc=x=>Number.isFinite(x)?(x*100).toFixed(1)+'%':'-';
 const K=[['id',4],['name',26],['cost',4],['deck_games',8],['wr_in_deck',8,pc],['delta_seen',8,x=>Number.isFinite(x)?(x*100>=0?'+':'')+(x*100).toFixed(1):'-'],['dead_rate',8,pc],['avg_round_played',6,x=>Number.isFinite(x)?x.toFixed(1):'-']];
 const hdr='  '+['id  ','name'.padEnd(26),'cost','games   ','WR      ','dSeen pp','dead    ','rnd'].join(' ');
 const asc=(f)=>(a,b)=>f(a)-f(b),desc=(f)=>(a,b)=>f(b)-f(a);
 let cum=0,med=0;for(let i=0;i<60;i++){cum+=g.rounds[i];if(!med&&cum>=g.games/2)med=i}
 rep.push('=== FIELD GAMES ===',`games played: ${g.games} (${g.timeouts} abandoned)   first player wins: ${pc(g.firstWins/g.games)} (95% CI ${pc(flo)} - ${pc(fhi)})`,
  `median game length: ${med} rounds   rounds histogram: `+[...g.rounds].map((v,i)=>v?`${i}:${v}`:'').filter(Boolean).join(' '),
  `average hero HP left at the end (both heroes summed): ${(g.hpSum/g.games).toFixed(1)}`,'',
  `Cards with at least ${minGames} deck-games (${ok.length} of ${rows.filter(r=>!r.token).length}).  WR = win rate of decks containing it. dSeen = win rate when the card was drawn/played`,
  'minus win rate when it never showed up (same decks) in percentage points - the fairer power signal, because WR alone depends on which decks the card ended up in.','',
  'Strongest by dSeen:',hdr,tab(ok.slice().sort(desc(r=>r.delta_seen)).slice(0,15),K),'','Weakest by dSeen:',hdr,tab(ok.slice().sort(asc(r=>r.delta_seen)).slice(0,15),K),'',
  'Highest dead-card rate (drawn but never played):',hdr,tab(ok.slice().sort(desc(r=>r.dead_rate)).slice(0,10),K),'',
  'Highest mulligan rate:',hdr,tab(ok.slice().sort(desc(r=>r.mulligan_rate)).slice(0,10),K.map(k=>k[0]=='dead_rate'?['mulligan_rate',8,pc]:k)),'',
  'Never played although drawn (>=50 draws):',ok.filter(r=>r.seen_games>=50&&r.played_games==0).map(r=>`${r.id} ${r.name}`).join(', ')||'  none','',
  'Per-cost average of dSeen (pp):  '+[0,1,2,3,4,5,6,7].map(k=>{const l=ok.filter(r=>Math.min(7,r.cost)==k&&Number.isFinite(r.delta_seen));return l.length?`${k===7?'7+':k}: ${(l.reduce((a,r)=>a+r.delta_seen,0)/l.length*100).toFixed(1)} (${l.length} cards)`:''}).filter(Boolean).join('   '),'');
 const dsorted=pool.map((d,i)=>({n:d.n,s:C.deck[i]||[0,0]})).filter(d=>d.s[0]).sort((a,b)=>b.s[1]/b.s[0]-a.s[1]/a.s[0]);
 rep.push('Premade decks:',...dsorted.filter(d=>!d.n.startsWith('rnd')).map(d=>`  ${pad(d.n,18)} WR ${pc(d.s[1]/d.s[0])} over ${d.s[0]} games`),
  `Best / worst deck in the pool: ${dsorted[0]?dsorted[0].n+' '+pc(dsorted[0].s[1]/dsorted[0].s[0]):'-'} / ${dsorted.length?dsorted[dsorted.length-1].n+' '+pc(dsorted[dsorted.length-1].s[1]/dsorted[dsorted.length-1].s[0]):'-'}`,'',
  `Top synergies (pairs with >=${minPair} shared deck-games, see synergy.csv):`,...sr.slice(0,8).map(r=>`  ${r[1]} + ${r[3]}: lift ${(r[7]*100).toFixed(1)}pp (z ${r[8].toFixed(1)}, ${r[4]} games)`),
  'Worst pairings:',...sr.slice(-5).reverse().map(r=>`  ${r[1]} + ${r[3]}: lift ${(r[7]*100).toFixed(1)}pp (z ${r[8].toFixed(1)}, ${r[4]} games)`),'',
  'Files: cards.csv (one row per card), decks.csv, synergy.csv'+(C.rows.length?', games.csv':''),'',
  'NOTE: decks in the pool are random/premade and the pilot is a bot - treat every number as a signal to look at, not a verdict.','')}

function writeSwap(out,C,minGames,per,rep){
 let tn=0,ts=0;for(const k in C.swap){tn+=C.swap[k][0];ts+=C.swap[k][2]}const mean=ts/tn,rows=[];
 BUILD.forEach(id=>{const s=C.swap[id];if(!s||!s[0])return;const n=s[0],mr=s[2]/n,v=Math.max(1e-9,s[3]/n-mr*mr),se=Math.sqrt(v/n),eff=mr-mean,z=eff/se;
  const c=CD[id];rows.push({id,name:c.Name,type:c.Type,cost:c.Cost,games:n,wr:s[1]/n,effect:eff,se,lo:eff-1.96*se,hi:eff+1.96*se,z,flag:z>=3&&eff>=.015?'STRONG':z<=-3&&eff<=-.015?'WEAK':''})});
 const cols=['card_id','name','type','cost','games','wr_with_card','effect_pp','se_pp','ci_lo_pp','ci_hi_pp','z','flag'];
 fs.writeFileSync(path.join(out,'swap.csv'),csv([cols].concat(rows.map(r=>[r.id,r.name,r.type,r.cost,r.games,f4(r.wr),f2(r.effect*100),f2(r.se*100),f2(r.lo*100),f2(r.hi*100),f2(r.z),r.flag]))));
 const sorted=rows.slice().sort((a,b)=>b.effect-a.effect),pad=(s,n)=>String(s).padEnd(n),show=l=>l.map(r=>`  ${pad(r.id,4)} ${pad(r.name,26)} cost ${r.cost}  ${(r.effect>=0?'+':'')+(r.effect*100).toFixed(1)}pp  (95% CI ${(r.lo*100).toFixed(1)} .. ${(r.hi*100).toFixed(1)})  ${r.games} games ${r.flag}`).join('\n');
 rep.push('=== SWAP EXPERIMENT ===',`Each game: a random pool deck had ONE random card replaced by the card below, then played a random opponent. effect = win rate minus what that deck normally wins,`,
  `compared with the average replacement card (so 0 = an average card, +5pp = adds five points of win rate when swapped in).  ${per} games per card requested, ${tn} played.`,'',
  'Strongest:',show(sorted.slice(0,15)),'','Weakest:',show(sorted.slice(-15).reverse()),'',`Flagged STRONG/WEAK (|z|>=3 and |effect|>=1.5pp): ${rows.filter(r=>r.flag).length} cards. Full list: swap.csv`,'')}

main().catch(e=>{console.error(e);process.exit(1)});
