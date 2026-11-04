#!/usr/bin/env node
const fs=require('fs'),path=require('path'),os=require('os');
const {Worker,isMainThread,parentPort,workerData}=require('worker_threads');
const L=require('./lib_game'),DC=require('./deckcode');
function parseArgs(argv){const o={};for(let i=0;i<argv.length;i++){const a=argv[i];if(!a.startsWith('--'))continue;const k=a.slice(2),v=argv[i+1];if(v===undefined||v.startsWith('--'))o[k]=true;else{o[k]=v;i++}}return o}
const A=isMainThread?parseArgs(process.argv.slice(2)):workerData.args;
const LAB=path.join(__dirname,'..'),PROJECT=path.resolve(A.project||path.join(LAB,'..','game'));
const GAME=L.loadGame({project:PROJECT,live:A.live,beam:A.beam?+A.beam:undefined,depth:A.depth?+A.depth:undefined});
const BW=(()=>{const ov={};String(A.bw||'').split(',').map(x=>x.trim()).filter(Boolean).forEach(kv=>{const[k,v]=kv.split('=');if(!(k in GAME.DEFAULT_BW))throw new Error('--bw: unknown setting "'+k+'"');ov[k]=+v});
 if(!A.weights)return Object.assign({},GAME.DEFAULT_BW,ov);const j=JSON.parse(fs.readFileSync(A.weights,'utf8'));return Object.assign({},GAME.DEFAULT_BW,j.weights||j,ov)})();
const key=d=>d.slice().sort((a,b)=>a-b).join(',');

function runTask(t){
 const rnd=GAME.mulberry32(t.seed);let wins=0,games=0;
 for(let g=0;g<t.n;g++){
  const opp=t.opps[Math.floor(rnd()*t.opps.length)];GAME.seed(t.seed*7919+g);
  const s=g&1,r=s==0?GAME.playGame(t.deck,opp,{bwA:BW,bwB:BW}):GAME.playGame(opp,t.deck,{bwA:BW,bwB:BW});
  if(r.win<0)continue;games++;if(r.win==s)wins++}
 return{id:t.id,wins,games}}
if(!isMainThread){parentPort.on('message',t=>parentPort.postMessage(runTask(t)));return}

const NW=Math.max(1,+A.workers||os.cpus().length);
const workers=Array.from({length:NW},()=>new Worker(__filename,{workerData:{args:A}}));
function runTasks(tasks){return new Promise(res=>{if(!tasks.length)return res([]);const out=[];let next=0;
 const feed=w=>{if(next>=tasks.length)return;const t=tasks[next++];w.once('message',r=>{out.push(r);if(out.length==tasks.length)res(out.sort((a,b)=>a.id-b.id));else feed(w)});w.postMessage(t)};
 workers.forEach(feed)})}
const Q=!!A.quick;
const EPOCHS=+A.epochs||(Q?1:5),GENS=+A.gens||(Q?2:10),KIDS=+A.kids||(Q?8:20),SCREEN=+A.screen||(Q?10:28),CONFIRM=+A.confirm||(Q?20:90),REEVAL=+A.reeval||(Q?20:80),
 FINALN=+A['final-games']||(Q?20:100),PICK=+A.pick||5,MAXSIM=+A.maxsim||.75,SEED=+A.seed||1,NRAND=+A['gauntlet-random']||(Q?4:12),NINIT=+A.init||(Q?10:40);
const rnd=GAME.mulberry32(SEED*31+7),BUILD=GAME.BUILD;
const out=path.resolve(A.out||path.join(LAB,'deck_out'));fs.mkdirSync(out,{recursive:true});
const logLines=[],log=s=>{console.log(s);logLines.push(s)};

const prior={};BUILD.forEach(id=>prior[id]=0);
const csvLine=s=>{const f=[];let c='',q=false;for(let i=0;i<s.length;i++){const ch=s[i];if(q){if(ch=='"'){if(s[i+1]=='"'){c+='"';i++}else q=false}else c+=ch}else if(ch=='"')q=true;else if(ch==','){f.push(c);c=''}else c+=ch}f.push(c);return f};
if(A.prior){const rows=fs.readFileSync(A.prior,'utf8').trim().split('\n'),h=csvLine(rows[0]),ii=h.indexOf('id'),di=h.indexOf('delta_seen');
 if(ii<0||di<0)throw new Error('--prior needs a sim.js cards.csv (columns id, delta_seen)');
 rows.slice(1).forEach(r=>{const f=csvLine(r);const id=+f[ii],v=parseFloat(f[di]);if(prior[id]!==undefined&&Number.isFinite(v))prior[id]=v*100})}
const addW=id=>Math.exp(Math.max(-30,Math.min(30,prior[id]))/12),delW=id=>Math.exp(-Math.max(-30,Math.min(30,prior[id]))/12);
function wpick(items,wf){let s=0;const w=items.map(x=>{const v=wf(x);s+=v;return v});let r=rnd()*s;for(let i=0;i<items.length;i++){r-=w[i];if(r<=0)return items[i]}return items[items.length-1]}

const unitsOf=d=>d.filter(id=>CD[id].Type=='Unit').length,avgCost=d=>d.reduce((a,id)=>a+CD[id].Cost,0)/d.length;
const TRIBES=['Animal','Machine','Aberration','Human','Mercenary'];
function tribeOf(d){let best='Mixed',bn=0;TRIBES.forEach(t=>{const n=d.filter(id=>(CD[id].Subtypes||[]).includes(t)||(CD[id].Subtypes||[]).includes(t=='Machine'?'Automaton':'~')).length;if(n>bn){bn=n;best=t}});return bn>=.3*d.length?best:'Mixed'}
function cellOf(d){const a=avgCost(d),u=unitsOf(d);return[a<2.1?'fast':a<2.7?'mid':'slow',u<=15?'spells':u<=21?'balanced':'units',tribeOf(d)].join('/')}
const legal=d=>{if(d.length!=30)return false;const c={};for(const id of d){if(!(id in prior))return false;c[id]=(c[id]||0)+1;if(c[id]>3)return false}
 const u=unitsOf(d),a=avgCost(d);return u>=8&&a>=1.2&&a<=4.2};
function randomDeck(){for(;;){const c={},d=[];while(d.length<30){const id=wpick(BUILD,id=>.4+.6*addW(id)/3);if((c[id]||0)>=3)continue;c[id]=(c[id]||0)+1;d.push(id)}if(legal(d))return d.sort((a,b)=>a-b)}}
function uniformRandomDeck(){for(;;){const c={},d=[];while(d.length<30){const id=BUILD[Math.floor(rnd()*BUILD.length)];if((c[id]||0)>=3)continue;c[id]=(c[id]||0)+1;d.push(id)}if(legal(d))return d.sort((a,b)=>a-b)}}
function mutate(d){
 for(let tries=0;tries<50;tries++){
  const x=d.slice(),k=1+Math.floor(rnd()*4),tr=rnd()<.2?TRIBES[Math.floor(rnd()*TRIBES.length)]:null;
  for(let s=0;s<k;s++){
   const slot=x.indexOf(wpick(x,delW)),cnt={};x.forEach(id=>cnt[id]=(cnt[id]||0)+1);
   const cand=BUILD.filter(id=>(cnt[id]||0)<3&&id!=x[slot]&&(!tr||(CD[id].Subtypes||[]).includes(tr)));if(!cand.length)continue;
   x[slot]=wpick(cand,addW)}
  if(legal(x)&&key(x)!=key(d))return x.sort((a,b)=>a-b)}
 return null}
function cross(a,b){
 for(let tries=0;tries<50;tries++){const cnt={};a.concat(b).forEach(id=>cnt[id]=Math.min(3,(cnt[id]||0)+.5));
  const x=[];const pool=Object.keys(cnt).map(Number);
  while(x.length<30){const id=wpick(pool,id=>cnt[id]);if(x.filter(y=>y==id).length<3)x.push(id)}
  if(legal(x))return x.sort((a,b)=>a-b)}
 return null}
const vec=d=>{const v={};d.forEach(id=>v[id]=(v[id]||0)+1);return v};
function sim(a,b){const x=vec(a),y=vec(b);let dot=0,nx=0,ny=0;for(const k in x){nx+=x[k]*x[k];if(y[k])dot+=x[k]*y[k]}for(const k in y)ny+=y[k]*y[k];return dot/Math.sqrt(nx*ny)}
const wilson=(w,n)=>{if(!n)return[NaN,NaN];const z=1.96,p=w/n,d=1+z*z/n,c=p+z*z/(2*n),h=z*Math.sqrt(p*(1-p)/n+z*z/(4*n*n));return[(c-h)/d,(c+h)/d]};
const pc=x=>Number.isFinite(x)?(x*100).toFixed(1)+'%':'-';

let TASK=0;
async function evaluate(items,opps,n,tag){
 const res=await runTasks(items.map((it,i)=>({id:i,deck:it.deck,opps:opps.filter(o=>key(o)!=key(it.deck)),n,seed:(SEED*100003+(TASK++)*977+i)%2147483000})));
 res.forEach((r,i)=>{items[i].wins=(items[i].wins||0)+r.wins;items[i].games=(items[i].games||0)+r.games});return items}
const wr=it=>it.games?it.wins/it.games:0;

async function main(){
 const t0=Date.now(),mins=()=>((Date.now()-t0)/60000).toFixed(1)+' min';
 const OLD=DECKS.map(d=>d.c.slice().sort((a,b)=>a-b)),OLDN=DECKS.map(d=>d.n);
 const RANDG=Array.from({length:NRAND},uniformRandomDeck);
 log(`deck search | bot=${A.weights?'Smart (tuned weights '+path.basename(A.weights)+')':'Smart (default weights)'} beam=${A.beam||5} depth=${A.depth||5} | workers=${NW} | ${EPOCHS} epochs x ${GENS} gens x ${KIDS} kids | screen ${SCREEN} + confirm ${CONFIRM} games | ${A.prior?'card prior from '+A.prior:'no card prior'}`);
 const archive={};
 const consider=(it,epoch)=>{const c=cellOf(it.deck),cur=archive[c];
  if(!cur||(wr(it)>wr(cur)&&it.games>=cur.games*.5)){archive[c]=Object.assign({},it,{cell:c,epoch});return!cur?'new':'better'}return''};
 let seeds=OLD.map(d=>({deck:d,src:'old'}));while(seeds.length<NINIT)seeds.push({deck:rnd()<.5?randomDeck():uniformRandomDeck(),src:'seed'});
 let opps=OLD.concat(RANDG);
 await evaluate(seeds,opps,SCREEN+CONFIRM);seeds.forEach(s=>consider(s,0));
 log(`epoch 0: ${seeds.length} seed decks measured, ${Object.keys(archive).length} cells filled (${mins()})`);
 for(let ep=1;ep<=EPOCHS;ep++){
  const elites=Object.values(archive);opps=OLD.concat(RANDG,elites.map(e=>e.deck));
  elites.forEach(e=>{e.wins=0;e.games=0});await evaluate(elites,opps,REEVAL);
  let stats={kids:0,promoted:0,added:0,better:0};
  for(let gen=1;gen<=GENS;gen++){
   const cells=Object.values(archive),kids=[],seen=new Set([...cells.map(c=>key(c.deck)),...OLD.map(key)]);
   for(let tries=0;kids.length<KIDS&&tries<KIDS*20;tries++){
    const p=cells[Math.floor(rnd()*cells.length)],d=rnd()<.2&&cells.length>1?cross(p.deck,cells[Math.floor(rnd()*cells.length)].deck):mutate(p.deck);
    if(d&&!seen.has(key(d))){seen.add(key(d));kids.push({deck:d})}}
   await evaluate(kids,opps,SCREEN);stats.kids+=kids.length;
   const prom=kids.filter(k=>{const inc=archive[cellOf(k.deck)];return wr(k)>=(inc?wr(inc)-.08:.45)});stats.promoted+=prom.length;
   await evaluate(prom,opps,CONFIRM);
   prom.forEach(k=>{const r=consider(k,ep);if(r=='new')stats.added++;if(r=='better')stats.better++})}
  const all=Object.values(archive).sort((a,b)=>wr(b)-wr(a));
  log(`epoch ${ep}: kids ${stats.kids}, promoted ${stats.promoted}, new cells ${stats.added}, cells improved ${stats.better} | archive ${all.length} cells | best ${pc(wr(all[0]))} (${all[0].cell}) median ${pc(wr(all[Math.floor(all.length/2)]))} | ${mins()}`);
  fs.writeFileSync(path.join(out,'search_log.txt'),logLines.join('\n')+'\n');
  fs.writeFileSync(path.join(out,'archive.json'),JSON.stringify(Object.values(archive).map(e=>({cell:e.cell,deck:e.deck,wr:wr(e),games:e.games,epoch:e.epoch})),null,0))}

 const elites=Object.values(archive);opps=OLD.concat(RANDG,elites.map(e=>e.deck));
 elites.forEach(e=>{e.wins=0;e.games=0});await evaluate(elites,opps,Math.max(REEVAL,FINALN));
 const ranked=elites.slice().sort((a,b)=>wr(b)-wr(a)),cand=[];
 for(const e of ranked){if(cand.length>=(Q?5:12))break;if(cand.every(c=>sim(c.deck,e.deck)<=MAXSIM))cand.push(e)}
 log(`final candidates: ${cand.length} distinct decks (similarity <= ${MAXSIM}) | ${mins()}`);
 const M=cand.length,wins=Array.from({length:M},()=>Array(M).fill(0)),gm=Array.from({length:M},()=>Array(M).fill(0));
 const pair=[];for(let i=0;i<M;i++)for(let j=i+1;j<M;j++)pair.push([i,j]);
 const pres=await runTasks(pair.map(([i,j],k)=>({id:k,deck:cand[i].deck,opps:[cand[j].deck],n:FINALN,seed:SEED*555+k})));
 pres.forEach((r,k)=>{const[i,j]=pair[k];wins[i][j]=r.wins;gm[i][j]=r.games;wins[j][i]=r.games-r.wins;gm[j][i]=r.games});
 const vsOld=await runTasks(cand.flatMap((c,i)=>OLD.map((o,j)=>({id:i*OLD.length+j,deck:c.deck,opps:[o],n:Math.max(20,Math.round(FINALN*.6)),seed:SEED*777+i*10+j}))));
 const oldWR=cand.map((_,i)=>{let w=0,g=0;for(let j=0;j<OLD.length;j++){const r=vsOld[i*OLD.length+j];w+=r.wins;g+=r.games}return w/g});
 const mean=(i,S)=>{let w=0,g=0;S.forEach(j=>{if(j!=i){w+=wins[i][j];g+=gm[i][j]}});return g?w/g:.5};
 let bestS=null,bestScore=-1e9;const PK=Math.min(PICK,M);
 (function rec(start,S){if(S.length==PK){const cells=new Set(S.map(i=>cand[i].cell));if(cells.size<PK)return;
   const ms=S.map(i=>mean(i,S)),sd=Math.sqrt(ms.reduce((a,x)=>a+(x-.5)**2,0)/PK),str=S.reduce((a,i)=>a+oldWR[i]*.5+wr(cand[i])*.5,0)/PK,
    sc=str-1.5*sd;if(sc>bestScore){bestScore=sc;bestS=S.slice()}return}
  for(let i=start;i<M;i++){S.push(i);rec(i+1,S);S.pop()}})(0,[]);
 if(!bestS)bestS=[...Array(PK).keys()];
 const used=new Set(OLDN),styleOf=d=>{const a=avgCost(d),u=unitsOf(d);return u<=15?'Spells':a<2.1?'Rush':a<2.7?'Midrange':'Slow'};
 const nameOf=d=>{const top=d.slice().sort((x,y)=>CD[y].Cost-CD[x].Cost||(CD[y].Attack||0)+(CD[y].Health||0)-(CD[x].Attack||0)-(CD[x].Health||0)||x-y)[0];
  let n=CD[top].Name.replace(/[^A-Za-z0-9]/g,'')+styleOf(d);if(used.has(n)){let k=2;while(used.has(n+k))k++;n+=k}used.add(n);return n};
 const chosenIdx0=bestS.slice();
 const chosen=bestS.map(i=>({i,deck:cand[i].deck.slice().sort((a,b)=>a-b),name:nameOf(cand[i].deck),cell:cand[i].cell}));
 const q=s=>{s=String(s??'');return /[",\n]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s};
 const cd=d=>{const c=vec(d);return Object.keys(c).map(Number).sort((a,b)=>CD[a].Cost-CD[b].Cost||a-b).map(id=>`${c[id]}x ${CD[id].Name} (${CD[id].Cost})`).join(', ')};
 fs.writeFileSync(path.join(out,'archive.csv'),[['cell','winrate_vs_gauntlet','games','units','spells','avg_cost','epoch','cards','deck_code']].concat(ranked.map(e=>[e.cell,wr(e).toFixed(3),e.games,unitsOf(e.deck),30-unitsOf(e.deck),avgCost(e.deck).toFixed(2),e.epoch,e.deck.join(' '),DC.encode(e.deck)])).map(r=>r.map(q).join(',')).join('\n')+'\n');
 const lab=cand.map((c,i)=>(chosen.find(x=>x.i==i)||{}).name||('cand'+(i+1)));
 fs.writeFileSync(path.join(out,'matrix.csv'),[['deck(row) vs (col) = row win rate',...lab,'vs_old_premade_avg','vs_gauntlet','cell']].concat(cand.map((c,i)=>[lab[i],...cand.map((_,j)=>i==j?'':(gm[i][j]?(wins[i][j]/gm[i][j]).toFixed(3):'')),oldWR[i].toFixed(3),wr(c).toFixed(3),c.cell])).map(r=>r.map(q).join(',')).join('\n')+'\n');
 fs.writeFileSync(path.join(out,'deck_codes.txt'),'# Proposed premade decks as deck codes: paste a line (just the code) into Import in the deck builder, or pass this file to --decks of validate_decks.js / bot_ab.js / sim.js.\n'+chosen.map(c=>c.name+': '+DC.encode(c.deck)).join('\n')+'\n\n# Other strong candidates (not chosen), best first\n'+cand.filter((c,i)=>!chosenIdx0.includes(i)).slice(0,12).map((c,k)=>'Candidate'+(k+1)+'_'+c.cell.replace(/[^A-Za-z0-9]+/g,'')+': '+DC.encode(c.deck)).join('\n')+'\n');
 fs.writeFileSync(path.join(out,'proposed_premade_decks.json'),JSON.stringify(chosen.map(c=>({n:c.name,c:c.deck})),null,1)+'\n');
 fs.writeFileSync(path.join(out,'cards_js_DECKS.txt'),'// Proposed premade decks from tools/deck_search.js - paste over "const DECKS = [ ... ];" in cards.js (keep a backup of the old list).\nconst DECKS = [\n'+chosen.map(c=>`  {\n    n: ${JSON.stringify(c.name)},\n    c: [\n${[0,10,20].map(k=>'      '+c.deck.slice(k,k+10).join(', ')+',').join('\n')}\n    ]\n  },`).join('\n')+'\n];\n');
 const chosenIdx=chosen.map(c=>c.i),oldVs=OLD.map(o=>{let w=0,g=0;chosenIdx.forEach(i=>{const r=vsOld[i*OLD.length+OLD.indexOf(o)];w+=r.games-r.wins;g+=r.games});return g?w/g:NaN});
 const rep=['RE:Joltance deck search report',`finished ${new Date().toISOString()}  |  ${mins()}  |  pilot: ${A.weights?'Smart with tuned weights':'Smart (default weights)'}`,'',
  `Archive: ${ranked.length} playstyle cells filled. Gauntlet = old premade decks + ${NRAND} random decks + the archive's elites. Win rates below are against that gauntlet unless stated.`,'',
  `PROPOSED PREMADE DECKS (${chosen.length}) - chosen from ${M} distinct top decks: strong, different playstyles, balanced among themselves`,'(each deck has a DECK CODE below: paste it into Import in the deck builder; all codes are also in deck_codes.txt)',''];
 chosen.forEach(c=>{const e=cand[c.i];const [lo,hi]=wilson(e.wins,e.games);rep.push(`${c.name}   [${c.cell}]`,`  ${unitsOf(c.deck)} units / ${30-unitsOf(c.deck)} spells, avg cost ${avgCost(c.deck).toFixed(2)}`,
  `  win rate vs gauntlet ${pc(wr(e))} (95% CI ${pc(lo)}-${pc(hi)}, ${e.games} games) | vs the 5 old premade decks ${pc(oldWR[c.i])} | vs the other proposed decks ${pc(mean(c.i,chosenIdx))}`,'  '+cd(c.deck),'  CODE: '+DC.encode(c.deck),'')});
 rep.push('MATCHUPS between the proposed decks (row deck wins this share; '+FINALN+' games per pair, both seats):');
 rep.push('  '+''.padEnd(26)+chosen.map(c=>c.name.slice(0,12).padStart(13)).join(''));
 chosen.forEach(a=>rep.push('  '+a.name.slice(0,25).padEnd(26)+chosen.map(b=>(a.i==b.i?'-':pc(gm[a.i][b.i]?wins[a.i][b.i]/gm[a.i][b.i]:NaN)).padStart(13)).join('')));
 rep.push('',"HOW THE OLD PREMADE DECKS DO against the proposed set (their win rate):",...OLD.map((o,j)=>`  ${OLDN[j].padEnd(18)} ${pc(oldVs[j])}`),'',
  'Other strong candidates that were not chosen (see matrix.csv / archive.csv):',...cand.filter(c=>!chosenIdx.includes(cand.indexOf(c))).slice(0,6).map(c=>`  [${c.cell}] vs gauntlet ${pc(wr(c))}, vs old premade ${pc(oldWR[cand.indexOf(c)])}: ${cd(c.deck)}`),'',
  'CAVEATS: strength is measured by a bot pilot (tuned Smart). Decks relying on combos or setup the bot plays badly are under-rated, human play will differ, and the card pool/costs may change',
  'after your balance edits - re-run this tool after each change. Treat the output as strong candidates to playtest, not a final answer.','');
 fs.writeFileSync(path.join(out,'decks_report.txt'),rep.join('\n'));fs.writeFileSync(path.join(out,'search_log.txt'),logLines.join('\n')+'\n');
 console.log('\n'+rep.join('\n')+'\nFiles in '+out);process.exit(0)}
main().catch(e=>{console.error(e);process.exit(1)});
