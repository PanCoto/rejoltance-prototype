
function cloneUnit(u){return u&&Object.assign({},u,{kw:new Set(u.kw),ag:Object.assign({},u.ag),agc:Object.assign({},u.agc)})}
function cloneG(G){
 const cp=p=>Object.assign({},p,{hand:p.hand.map(c=>Object.assign({},c)),deck:p.deck.map(c=>Object.assign({},c)),disc:p.disc.map(c=>Object.assign({},c)),
  ln:p.ln.map(cloneUnit),gb:Object.assign({},p.gb)});
 return Object.assign({},G,{sim:1,en:G.en?Object.assign({},G.en,{mod:Object.assign({},G.en.mod),log:[]}):G.en,p:G.p.map(cp),log:[],hist:[],ev:[],q:null,over:G.over?Object.assign({},G.over):null})}
function blindClone(G,me){const c=cloneG(G);c.p.forEach(p=>shuf(p.deck));
 if(me!=null&&c.p[1-me]){const o=c.p[1-me],pool=o.hand.concat(o.deck),ids=shuf(pool.map(x=>x.id));pool.forEach((x,i)=>x.id=ids[i])}
 return c}

var BW=Object.assign({atk:1.2,hp:0.9,base:1,kw:1,neg:1,eff:1.5,hero:1.1,low:0.7,open:0.5,hs:3,hu:2,hc:0.45,unk:3,oh:2.6,stop:0.35,look:1,lw:0.6,mull:1,worlds:5},typeof BW_OVERRIDE!=='undefined'?BW_OVERRIDE:{});
function unitVal(u){
 let v=BW.atk*u.atk+BW.hp*Math.max(u.hp,0)+BW.base;
 const k=u.kw,K=BW.kw;
 if(k.has('Flying')&&u.atk>0)v+=K*1.5;
 if(k.has('Armored')||k.has('Armor2'))v+=K*(0.8*(k.has('Armor2')?2:kwp(u,'Armored')));
 if(k.has('Unkillable'))v+=K*3;
 if(k.has('Unactionable'))v+=K*2;
 if(k.has('Lifesteal'))v+=K*(0.6*u.atk);
 if(k.has('Taunt'))v+=K*2;
 if(k.has('Deadly'))v+=K*(2+0.5*u.atk);
 if(k.has('Evolving'))v+=K*3;
 if(k.has('SoulGuard'))v+=K*1.5*Math.max(1,u.sgn||1);
 if(k.has('SplashDamage'))v+=K*(0.7*kwp(u,'SplashDamage'));
 if(k.has('BurnSource'))v+=K*1;
 if(k.has('Breakthrough'))v+=K*(0.5*u.atk);
 if(k.has('Burning'))v-=BW.neg*1.5*Math.max(1,u.bn||1);
 if(k.has('Marked'))v-=BW.neg*2;
 if(k.has('Stunned'))v-=BW.neg*1.5;
 if(!u.sil&&u.d.Effects&&u.d.Effects.length)v+=BW.eff;
 return v}
const heroVal=h=>h+Math.max(0,8-h)*BW.low;
const handVal=c=>{const d=CD[c.id];return(d.Type=='Spell'?BW.hs+BW.hc*d.Cost:BW.hu+BW.hc*d.Cost)+(c.unk?BW.unk:0)};
function evalG(G,me){
 if(G.over)return G.over.draw?0:G.over.win==me?10000:-10000;
 const a=G.p[me],b=G.p[1-me];let s=BW.hero*(heroVal(a.hp)-heroVal(b.hp));
 for(let i=0;i<4;i++){const x=a.ln[i],y=b.ln[i];
  if(x){s+=unitVal(x);if(!y)s+=BW.open*x.atk}
  if(y){s-=unitVal(y);if(!x)s-=BW.open*y.atk}}
 a.hand.forEach(c=>s+=handVal(c));s-=BW.oh*b.hand.length;
 return s}
function project(G,me){const c=blindClone(G,me);
 for(let i=0;i<4&&!c.over;i++)lane(c,i,{});
 if(!c.over)endRound(c);
 return evalG(c,me)}

function pickOptions(G,p,d,k,f){const sp=d.Type=='Spell';
 if(k=='P'){const en=units(G.p[1-p.i]),ls=[0,1,2,3].filter(l=>en.some(u=>Math.abs(u.lane-l)<=1));return(ls.length?ls:[0,1,2,3]).map(n=>({n}))}   // Excision Conjucture: every lane that hits something is a real option
 if(k=='M'){const us=req(G,p,'M').sort((a,b)=>unitVal(a)-unitVal(b)),o=[{m:[]}];for(let n=1;n<=us.length;n++)o.push({m:us.slice(0,n).map(u=>u.uid)});return o}
 if(k=='L')return[{u:null}];
 if(k=='C')return[0,1].filter(i=>choiceOK(G,p,d,i)).map(i=>({n:i}));
 if(k=='D'){const lim=Math.min(10,G.turn+MANA_BONUS+2);return[{c:p.deck.slice().sort((x,y)=>{const f=z=>{const c=CD[z.id].Cost;return c>lim?-c:c};return f(y)-f(x)})[0].uid}]}
 if(k=='S'&&optSac(d))return[{n:NOSAC}].concat(req(G,p,k,f||null,null,sp).map(t=>({u:t.uid})));
 return req(G,p,k,f||null,null,sp).map(t=>t.h?{h:t.p}:{u:t.uid})}
function enumPicks(G,p,d,got,out){
 const ks=apicks(G,p,d,got.map(o=>o.n));
 if(got.length>=ks.length){out.push(got);return}
 if(out.length>=30)return;
 for(const o of pickOptions(G,p,d,ks[got.length],ks.f[got.length]))enumPicks(G,p,d,got.concat([o]),out)}
function resolvePick(G,p,k,o){
 if(o.m)return o.m.map(id=>units(G.p[p.i]).find(u=>u.uid==id)).filter(Boolean);
 if(o.n!=null)return o.n;
 if(o.h!=null)return H(o.h);
 if(o.u!=null)return units(G.p[0]).concat(units(G.p[1])).find(u=>u.uid==o.u);
 if(o.c!=null)return p.deck.find(c=>c.uid==o.c)}
function legalMoves(G,p){const mv=[];
 p.hand.forEach((c,ci)=>{const d=CD[c.id];
  const lanes=d.Type=='Unit'?[0,1,2,3].filter(l=>canPlay(G,p,ci,l)):(canPlay(G,p,ci,null)?[null]:[]);
  if(!lanes.length)return;
  const out=[];enumPicks(G,p,d,[],out);
  lanes.forEach(ln=>out.forEach(pk=>mv.push({ci,ln,id:c.id,sp:d.Type=='Spell'?1:0,pd:pk})))});
 return mv}
function applyMove(G,p,m){const pk=m.pd.map(o=>resolvePick(G,p,null,o));return play(G,p,m.ci,m.ln,pk)}
function sig(G,me){const a=G.p[me],b=G.p[1-me];
 return[a.hp,b.hp,a.b,a.hand.map(c=>c.id+':'+(c.red||0)).sort().join(),a.ln.map(u=>u?u.id+'/'+u.atk+'/'+u.hp+[...u.kw].join(''):'-').join('|'),b.ln.map(u=>u?u.id+'/'+u.atk+'/'+u.hp+[...u.kw].join(''):'-').join('|'),b.hand.length].join(';')}

function botPlanSmart(G,p){
 const t0=Date.now(),BUDGET=140,BEAM=5,DEPTH=5;
 return BW.look>0?botSearchLook(G,p,t0,BUDGET*Math.max(1,BW.worlds||1),BEAM,DEPTH):botSearchClassic(G,p,t0,BUDGET,BEAM,DEPTH)}

function bpRng(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function finishRound(c,playNow){
 for(let guard=0;!c.over&&guard<10;guard++){
  if(c.step>=3){for(let i=0;i<4&&!c.over;i++)lane(c,i,{});if(!c.over)endRound(c);return}
  if(playNow){const q=c.p[c.act];let n=0;while(n++<12&&!c.over){const m=botPlanBasic(c,q);if(!m)break;play(c,q,m.ci,m.ln,m.pk)}}
  playNow=true;nextStep(c)}}
function projectRoll(G,me,reseed){
 reseed();const c=cloneG(G);
 finishRound(c,false);
 if(c.over||BW.look<2)return evalG(c,me);
 const e1=evalG(c,me);
 startRound(c);
 if(!c.over)finishRound(c,true);
 const e2=c.over?(c.over.draw?0:c.over.win==me?3000:-3000):evalG(c,me);
 return(e1+BW.lw*e2)/(1+BW.lw)}
function botSearchLook(G,p,t0,BUDGET,BEAM,DEPTH){
 const me=p.i,orig=Math.random,K=Math.max(1,Math.round(BW.worlds||1)),base=Math.floor(orig()*2147483647);
 const seeds=Array.from({length:K},(_,k)=>(base+k*7919)%2147483647+1);
 const rs=k=>{Math.random=bpRng(seeds[k])};
 const score=Gs=>{let t=0;for(let k=0;k<K;k++){rs(k);t+=projectRoll(Gs[k],me,()=>rs(k))}return t/K};
 try{
  const W0=[];for(let k=0;k<K;k++){rs(k);W0.push(blindClone(G,me))}
  let best={score:score(W0)+BW.stop,first:null};
  let beam=[{Gs:W0,first:null}];
  for(let depth=0;depth<DEPTH&&beam.length;depth++){
   const next=[],seen=new Set();
   for(const node of beam){
    if(Date.now()-t0>BUDGET&&best.first)break;
    for(const m of legalMoves(node.Gs[0],node.Gs[0].p[me])){
     const cs=[];let ok=true;
     for(let k=0;k<K&&ok;k++){const c=cloneG(node.Gs[k]);rs(k);let r=false;try{r=applyMove(c,c.p[me],m)}catch(e){r=false}
      if(!r)ok=false;else cs.push(c)}
     if(!ok)continue;
     const sg=sig(cs[0],me);if(seen.has(sg))continue;seen.add(sg);
     const sc=score(cs),first=node.first||m;
     if(sc>best.score)best={score:sc,first};
     next.push({Gs:cs,first,score:sc})}}
   next.sort((a,b)=>b.score-a.score);beam=next.slice(0,BEAM)}
  const m=best.first;
  if(!m)return null;
  return{ci:m.ci,ln:m.ln,pk:m.pd.map(o=>resolvePick(G,p,null,o)),sp:m.sp,id:m.id}
 }finally{Math.random=orig}}

function botSearchClassic(G,p,t0,BUDGET,BEAM,DEPTH){
 const me=p.i;
 const stopScore=project(G,me);
 let best={score:stopScore+BW.stop,first:null};
 let beam=[{G,first:null}];
 for(let depth=0;depth<DEPTH&&beam.length;depth++){
  const next=[],seen=new Set();
  for(const node of beam){
   if(Date.now()-t0>BUDGET&&best.first)break;
   const np=node.G.p[me];
   for(const m of legalMoves(node.G,np)){
    const c=blindClone(node.G,me),cp=c.p[me];
    if(!applyMove(c,cp,m))continue;
    const sg=sig(c,me);if(seen.has(sg))continue;seen.add(sg);
    const sc=project(c,me),first=node.first||m;
    if(sc>best.score)best={score:sc,first};
    next.push({G:c,first,score:sc})}}
  next.sort((a,b)=>b.score-a.score);beam=next.slice(0,BEAM)}
 const m=best.first;
 if(!m)return null;
 return{ci:m.ci,ln:m.ln,pk:m.pd.map(o=>resolvePick(G,p,null,o)),sp:m.sp,id:m.id}}

const tempoVal=id=>{const d=CD[id];let v=d.Cost+1.5;if(d.Type=='Unit')v+=0.25*((d.Attack||0)+(d.Health||0)-(2*d.Cost+1));else v*=0.85;return Math.max(0.5,v)};
function curveScore(hand,draws,R){
 let h=hand.slice(),tot=0;
 for(let r=1;r<=R;r++){
  if(r>1&&draws.length>=r-1)h.push(draws[r-2]);
  const n=h.length;let best=0,bm=0;
  for(let m=1;m<(1<<n);m++){let c=0,v=0;for(let i=0;i<n;i++)if(m>>i&1){c+=CD[h[i]].Cost;v+=tempoVal(h[i])}if(c<=r+MANA_BONUS&&v>best){best=v;bm=m}}
  tot+=best;if(bm)h=h.filter((_,i)=>!(bm>>i&1))}
 return tot}
function botMullPlan(G,p){
 const hand=p.hand,n=hand.length;if(!n)return;
 const ids=p.deck.map(c=>c.id),S=24,R=5,perms=Array.from({length:S},()=>shuf(ids.slice())),keys=Array.from({length:S},()=>Array.from({length:ids.length+n},()=>Math.random()));
 let bestM=0,bestV=-1e9;
 for(let mask=0;mask<(1<<n);mask++){
  const out=[],keep=[];hand.forEach((c,i)=>(mask>>i&1?out:keep).push(c.id));
  let sum=0;
  for(let s=0;s<S;s++){
   const d=perms[s],nw=d.slice(0,out.length),rest=d.slice(out.length).map((id,i)=>({id,k:keys[s][i]})).concat(out.map((id,j)=>({id,k:keys[s][d.length+j]})));
   rest.sort((a,b)=>a.k-b.k);sum+=curveScore(keep.concat(nw),rest.map(x=>x.id),R)}
  const v=sum/S-0.05*out.length;
  if(v>bestV){bestV=v;bestM=mask}}
 mulligan(G,p,hand.filter((_,i)=>bestM>>i&1).map(c=>c.uid))}
function botMullSmart(G,p){
 if(BW.mull)return botMullPlan(G,p);
 const byCost=p.hand.slice().sort((a,b)=>CD[b.id].Cost-CD[a.id].Cost);let heavy=0;const out=[];
 byCost.forEach(c=>{const k=CD[c.id].Cost;if(k>=6)out.push(c.uid);else if(k>=4){if(++heavy>1)out.push(c.uid)}});
 if(!p.hand.some(c=>CD[c.id].Cost<=2&&!out.includes(c.uid))&&p.hand.length)out.push(...p.hand.filter(c=>CD[c.id].Cost>=4&&!out.includes(c.uid)).map(c=>c.uid));
 mulligan(G,p,out)}

// Targets for the effects the engine parks in G.pq for the bot (summons / transforms / evolving / Echo Chamber / Dual Wield's 2nd cast).
// Same idea as the human prompt, but the choice is made here: strongest enemy, best friendly unit, best Excision lane, no optional sacrifice.
function botAskPicks(G,it){
 const p=G.p[it.k=='eff'?it.u.o:it.pi],d=it.d,sp=d.Type=='Spell',xu=d.ExU||null,pk=[];
 for(let n=0;n<10;n++){
  const ks=apicks(G,p,d,pk,null);if(ks.length<=pk.length)break;
  const k=ks[pk.length],f=ks.f[pk.length]||null;let v;
  if(k=='P')v=bestLane(G,p.i);
  else if(k=='M')v=[];
  else if(k=='C')v=(p.deck.length<2&&p.disc.length>=2)?1:0;
  else if(k=='D')v=p.deck.slice().sort((a,b)=>CD[b.id].Cost-CD[a.id].Cost)[0];
  else if(k=='S')v=optSac(d)?NOSAC:req(G,p,k,f,null,sp,xu).sort((a,b)=>unitVal(a)-unitVal(b))[0];
  else{
   const ex=k=='L'?pk.filter((_,j)=>ks[j]=='L'&&typeof pk[j]=='number'):null,ts=req(G,p,k,f,ex,sp,xu);
   if(k=='L'){const op=G.p[1-p.i];v=shuf(ts.slice()).sort((a,b)=>(op.ln[a]?1:0)-(op.ln[b]?1:0))[0]}
   else if(k=='f')v=ts.slice().sort((a,b)=>unitVal(b)-unitVal(a))[0];
  else if(k=='fh'){const us=ts.filter(x=>!x.h&&x.hp<x.mx).sort((a,b)=>(b.mx-b.hp)-(a.mx-a.hp));v=us.length&&(us[0].mx-us[0].hp)>(p.mhp||20)-p.hp?us[0]:H(p.i)}
   else{const un=ts.filter(x=>!x.h&&x.o!=p.i).sort((a,b)=>unitVal(b)-unitVal(a));v=un[0]||ts.find(x=>x.h)||ts[0]}}
  if(v==null)break;pk.push(v)}
 return pk}
function botPlan(G,p){return botPlanSmart(G,p)}
function botMull(G,p){return botMullSmart(G,p)}
