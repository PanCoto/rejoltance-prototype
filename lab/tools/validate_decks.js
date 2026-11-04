#!/usr/bin/env node
const fs=require('fs'),path=require('path'),os=require('os');
const {Worker,isMainThread,parentPort,workerData}=require('worker_threads');
const L=require('./lib_game'),DC=require('./deckcode');
function parseArgs(argv){const o={};for(let i=0;i<argv.length;i++){const a=argv[i];if(!a.startsWith('--'))continue;const k=a.slice(2),v=argv[i+1];if(v===undefined||v.startsWith('--'))o[k]=true;else{o[k]=v;i++}}return o}
const A=isMainThread?parseArgs(process.argv.slice(2)):workerData.args;
const LAB=path.join(__dirname,'..'),PROJECT=path.resolve(A.project||path.join(LAB,'..','game'));
const GAME=L.loadGame({project:PROJECT,live:A.live});
const MODE=A.bot=='basic'?'basic':'smart';
const BW=(()=>{const ov={};String(A.bw||'').split(',').map(x=>x.trim()).filter(Boolean).forEach(kv=>{const[k,v]=kv.split('=');if(!(k in GAME.DEFAULT_BW))throw new Error('--bw: unknown setting "'+k+'"');ov[k]=+v});
 if(!A.weights)return Object.assign({},GAME.DEFAULT_BW,ov);const j=JSON.parse(fs.readFileSync(A.weights,'utf8'));return Object.assign({},GAME.DEFAULT_BW,j.weights||j,ov)})();

function runTask(t){const rnd=GAME.mulberry32(t.seed);let wins=0,games=0;
 for(let g=0;g<t.n;g++){const opp=t.opps[Math.floor(rnd()*t.opps.length)];GAME.seed(t.seed*7919+g);const s=g&1,
  r=s==0?GAME.playGame(t.deck,opp,{mode:MODE,bwA:BW,bwB:BW}):GAME.playGame(opp,t.deck,{mode:MODE,bwA:BW,bwB:BW});
  if(r.win<0)continue;games++;if(r.win==s)wins++}
 return{id:t.id,wins,games}}
if(!isMainThread){parentPort.on('message',t=>parentPort.postMessage(runTask(t)));return}

const NW=Math.max(1,+A.workers||os.cpus().length),workers=Array.from({length:NW},()=>new Worker(__filename,{workerData:{args:A}}));
function runTasks(tasks){return new Promise(res=>{if(!tasks.length)return res([]);const out=[];let next=0;
 const feed=w=>{if(next>=tasks.length)return;const t=tasks[next++];w.once('message',r=>{out.push(r);if(out.length==tasks.length)res(out.sort((a,b)=>a.id-b.id));else feed(w)});w.postMessage(t)};workers.forEach(feed)})}
const wilson=(w,n)=>{if(!n)return[NaN,NaN];const z=1.96,p=w/n,d=1+z*z/n,c=p+z*z/(2*n),h=z*Math.sqrt(p*(1-p)/n+z*z/(4*n*n));return[(c-h)/d,(c+h)/d]};
const pc=x=>Number.isFinite(x)?(x*100).toFixed(1)+'%':'-';

async function main(){
 if(!A.decks)throw new Error('--decks file is required (a .txt with one deck code per line, or a .json list of decks)');
 const NEW=DC.readDecks(A.decks),OLD=A.old?DC.readDecks(A.old):DECKS.map(d=>({n:d.n,c:d.c.slice()}));
 const N=+A.games||80,K=+A.randoms||40,seed=+A.seed||9001,rnd=GAME.mulberry32(seed*13+5),B=GAME.BUILD;
 const RAND=[];while(RAND.length<K){const c={},d=[];while(d.length<30){const id=B[Math.floor(rnd()*B.length)];if((c[id]||0)>=3)continue;c[id]=(c[id]||0)+1;d.push(id)}
  const u=d.filter(id=>CD[id].Type=='Unit').length,a=d.reduce((x,id)=>x+CD[id].Cost,0)/30;if(u>=8&&a>=1.4&&a<=3.8)RAND.push(d)}
 const out=path.resolve(A.out||path.join(LAB,'validate_out'));fs.mkdirSync(out,{recursive:true});
 const tasks=[],meta=[];let id=0;
 NEW.forEach((a,i)=>{OLD.forEach((b,j)=>{tasks.push({id:id++,deck:a.c,opps:[b.c],n:N,seed:seed*101+i*17+j});meta.push(['old',i,j])});
  NEW.forEach((b,j)=>{if(j!=i){tasks.push({id:id++,deck:a.c,opps:[b.c],n:N,seed:seed*211+i*29+j});meta.push(['new',i,j])}});
  tasks.push({id:id++,deck:a.c,opps:RAND,n:N*2,seed:seed*307+i});meta.push(['rand',i,-1])});
 OLD.forEach((a,i)=>{tasks.push({id:id++,deck:a.c,opps:RAND,n:N*2,seed:seed*401+i});meta.push(['oldrand',i,-1])});
 console.log(`validating ${NEW.length} decks vs ${OLD.length} old decks, each other and ${K} fresh random decks | ${tasks.length} matchups x ~${N} games | bot=${MODE} | workers ${NW}`);
 const res=await runTasks(tasks),g={};res.forEach((r,k)=>{g[meta[k].join(':')]=r});
 const cell=(t,i,j)=>{const r=g[[t,i,j].join(':')];return r&&r.games?r.wins/r.games:NaN};
 const rep=['RE:Joltance held-out deck validation (fresh seeds, never used by the search)',`bot=${MODE}  games per matchup ~${N}  seed ${seed}  fresh random decks ${K}`,'',
  'NEW decks - overall results',''];
 const rows=[['deck','vs_old_avg','vs_old_ci_lo','vs_old_ci_hi','vs_new_avg','vs_random','vs_random_ci_lo','vs_random_ci_hi']];
 NEW.forEach((a,i)=>{let w=0,n=0,w2=0,n2=0;OLD.forEach((_,j)=>{const r=g[['old',i,j].join(':')];w+=r.wins;n+=r.games});NEW.forEach((_,j)=>{if(j!=i){const r=g[['new',i,j].join(':')];w2+=r.wins;n2+=r.games}});
  const rr=g[['rand',i,-1].join(':')],[l1,h1]=wilson(w,n),[l2,h2]=wilson(rr.wins,rr.games);
  rep.push(`  ${a.n.padEnd(18)} vs old premade ${pc(w/n)} (CI ${pc(l1)}-${pc(h1)}, ${n} games) | vs the other new decks ${pc(w2/n2)} | vs random decks ${pc(rr.wins/rr.games)} (CI ${pc(l2)}-${pc(h2)})`);
  rows.push([a.n,(w/n).toFixed(3),l1.toFixed(3),h1.toFixed(3),(w2/n2).toFixed(3),(rr.wins/rr.games).toFixed(3),l2.toFixed(3),h2.toFixed(3)])});
 rep.push('','OLD premade decks for reference (vs the same fresh random decks)','');
 OLD.forEach((a,i)=>{const r=g[['oldrand',i,-1].join(':')],[l,h]=wilson(r.wins,r.games);rep.push(`  ${a.n.padEnd(18)} vs random decks ${pc(r.wins/r.games)} (CI ${pc(l)}-${pc(h)})`)});
 rep.push('','MATCHUPS among the new decks (row deck wins this share):','  '+''.padEnd(20)+NEW.map(d=>d.n.slice(0,12).padStart(13)).join(''));
 NEW.forEach((a,i)=>rep.push('  '+a.n.slice(0,19).padEnd(20)+NEW.map((_,j)=>(i==j?'-':pc(cell('new',i,j))).padStart(13)).join('')));
 rep.push('','NEW (row) vs OLD premade (col): row win rate','  '+''.padEnd(20)+OLD.map(d=>d.n.slice(0,12).padStart(13)).join(''));
 NEW.forEach((a,i)=>rep.push('  '+a.n.slice(0,19).padEnd(20)+OLD.map((_,j)=>pc(cell('old',i,j)).padStart(13)).join('')));
 rep.push('','Each pair uses both seats and the same bot on both sides. Matchup cells are ~'+N+' games (+-10 points at 95%), so read single cells loosely and the averages firmly.','');
 fs.writeFileSync(path.join(out,'validation.txt'),rep.join('\n'));fs.writeFileSync(path.join(out,'validation.csv'),rows.map(r=>r.join(',')).join('\n')+'\n');
 console.log('\n'+rep.join('\n')+'Files in '+out);process.exit(0)}
main().catch(e=>{console.error(e);process.exit(1)});
