/* ============================================================
   REPLAYS
   Every finished game (vs bot, Mirror Match, Quick Match, Ranked, friend / room games) is recorded automatically as a list of "frames":
   the board as YOU saw it (the opponent's hand and deck stay hidden) + the animation events that went with it. Watching a replay simply feeds those
   frames to the normal board drawing (render / anim), exactly like an online guest receives them - so it needs no game logic and it can never
   desync. Tutorial and Endless Mode are not recorded.

   Storage: the last N games (Settings > Replays, default REPLAY_KEEP_DEF) are kept in this browser (localStorage, gzip-compressed). A starred replay is never removed automatically.
   A replay can be saved to a .rjreplay file and imported again (to share it).
   ============================================================ */
const REPLAY_KEEP_DEF=20,REPLAY_VER=1;
const RP={on:false,tok:0,fr:[],i:-1,playing:true,speed:1,d:null,meta:null,an:false,pl:false};
let REC=null;

/* ---------- helpers ---------- */
let rpTT=0;
function toast(msg,bad){let t=$('rpltoast');if(!t){t=document.createElement('div');t.id='rpltoast';$('stage').appendChild(t)}t.textContent=msg;t.className='on'+(bad?' bad':'');clearTimeout(rpTT);rpTT=setTimeout(()=>t.className='',2800)}
const rpEsc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const rpClone=o=>JSON.parse(JSON.stringify(o));
const b64e=u=>{let s='';for(let i=0;i<u.length;i+=0x8000)s+=String.fromCharCode.apply(null,u.subarray(i,i+0x8000));return btoa(s)};
const b64d=s=>{const b=atob(s),u=new Uint8Array(b.length);for(let i=0;i<b.length;i++)u[i]=b.charCodeAt(i);return u};
async function rpZip(str){
 if(typeof CompressionStream=='undefined')return'j:'+str;
 const cs=new CompressionStream('gzip'),w=cs.writable.getWriter();w.write(new TextEncoder().encode(str));w.close();
 return'z:'+b64e(new Uint8Array(await new Response(cs.readable).arrayBuffer()))}
async function rpUnzip(p){
 if(p.startsWith('j:'))return p.slice(2);
 if(!p.startsWith('z:'))throw new Error('unknown format');
 if(typeof DecompressionStream=='undefined')throw new Error('This browser cannot open compressed replays');
 const ds=new DecompressionStream('gzip'),w=ds.writable.getWriter();w.write(b64d(p.slice(2)));w.close();
 return new TextDecoder().decode(await new Response(ds.readable).arrayBuffer())}
const rpVer=()=>window.RJ_EXP?GAME_VERSION_EXP:'v'+GAME_VERSION;
const rpFmt=t=>{const d=new Date(t);return d.toLocaleDateString()+' '+d.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})};
const RP_MODES={ranked:'Ranked',quick:'Quick Match',friend:'Friend',bot:'Bot',mirror:'Mirror Match',online:'Room'};

/* ---------- settings (Settings > Replays) ---------- */
const RPS_KEYS={on:'rj_rp_on',keep:'rj_rp_keep',m:g=>'rj_rp_m_'+g},RP_KEEP_OPTS=[5,10,20,30,50];
const RP_GRP={bot:'bot',mirror:'mirror',ranked:'ranked',quick:'quick',friend:'friend',online:'friend'};   // game mode -> the checkbox that controls it
const rpsGet=k=>{try{return localStorage.getItem(k)}catch(e){return null}},rpsSet=(k,v)=>{try{localStorage.setItem(k,v)}catch(e){}};
const rpOn=()=>rpsGet(RPS_KEYS.on)!=='0';
const rpModeOn=m=>rpsGet(RPS_KEYS.m(RP_GRP[m]||m))!=='0';
const rpKeep=()=>{const v=+rpsGet(RPS_KEYS.keep);return RP_KEEP_OPTS.includes(v)?v:REPLAY_KEEP_DEF};
// the online host records even with recording off, only to send its hidden cards to the guest when the game ends (see "revealing the opponent's side")
const rpWantFrames=()=>rpOn()||!!(NET&&NET.host);

/* ---------- storage ---------- */
const RPX='rj_rpx',RPK=id=>'rj_rp_'+id;
const idxGet=()=>{try{const a=JSON.parse(localStorage.getItem(RPX)||'[]');return Array.isArray(a)?a:[]}catch(e){return[]}};
const idxPut=a=>{try{localStorage.setItem(RPX,JSON.stringify(a));return true}catch(e){return false}};
const rpDrop=id=>{try{localStorage.removeItem(RPK(id))}catch(e){}};
// Saves one replay; when the browser storage is full the oldest un-starred replays are dropped until it fits.
async function rpSave(meta,payload){
 let a=idxGet().filter(x=>x.id!==meta.id),ok=false;
 for(let n=0;n<60&&!ok;n++){
  try{localStorage.setItem(RPK(meta.id),payload);ok=true}
  catch(e){const old=a.slice().reverse().find(x=>!x.star);if(!old)return false;rpDrop(old.id);a=a.filter(x=>x!==old)}}
 if(!ok)return false;
 a.unshift(meta);a.sort((x,y)=>y.t-x.t);
 while(a.filter(x=>!x.star).length>rpKeep()){const old=a.slice().reverse().find(x=>!x.star);rpDrop(old.id);a=a.filter(x=>x!==old)}
 return idxPut(a)}
// removes the oldest un-starred replays above the limit; returns how many it removed
function rpTrim(){let a=idxGet(),n=0;
 while(a.filter(x=>!x.star).length>rpKeep()){const old=a.slice().reverse().find(x=>!x.star);rpDrop(old.id);a=a.filter(x=>x!==old);n++}
 if(n)idxPut(a);return n}
async function rpLoad(id){const p=localStorage.getItem(RPK(id));if(!p)throw new Error('This replay is no longer stored in this browser');return JSON.parse(await rpUnzip(p))}

/* ---------- recording ---------- */
// What a frame looks like: the same shape an online guest receives (see snap() in net.js) but from YOUR side and without any hidden information.
function rpSnap(G){
 const uc=u=>{if(!u)return null;const x=Object.assign({},u);delete x.d;delete x.hurtQ;x.kw=[...u.kw];return x};
 const cp=c=>Object.assign({},c);
 // both hands and both decks are kept as they are: when this client runs the game (vs bot / as host) the opponent's cards are real, when it was only a guest they are already hidden (id 0)
 const side=p=>({ac:{un:[]},fk:p.ac?p.ac.fk:0,i:p.i,hp:p.hp,mhp:p.mhp,fr:p.fr,mb:p.mb,b:p.b,gb:p.gb,sp:p.sp,sc:p.sc,fat:p.fat||0,
  hand:p.hand.map(cp),deck:p.deck.map(cp),disc:p.disc.map(cp),ln:p.ln.map(uc)});
 return JSON.parse(JSON.stringify({mir:G.mir,turn:G.turn,step:G.step,allow:G.allow,act:G.act==null?null:G.act,start:G.start,
  over:G.over?{win:G.over.win,draw:G.over.draw,sur:G.over.sur,left:G.over.left}:null,
  log:G.log.slice(-40),hn:G.hist.length,hist:G.hist.slice(-80).map(h=>({p:h.p,t:h.t,id:h.id,tg:h.tg,uid:h.uid,tf:h.tf})),
  p:[side(G.p[0]),side(G.p[1])]}))}
const rpMode=()=>{try{if(window.MM&&MM.cur&&MM.cur.mode)return MM.cur.mode}catch(e){}return NET?'online':(typeof MODE!='undefined'&&MODE=='mirror'?'mirror':'bot')};
function rpCap(ev){
 if(RP.on||typeof DEMO!='undefined'&&DEMO||!G||!G.p||G.tut||G.en||$('game').style.display!='block'||G.turn<1)return;
 if(!REC||REC.gid!==gid){
  REC={gid,t:Date.now(),fr:[],last:'',st:null,done:false,
   nosave:!rpOn(),   // recording was off when the game started: a replay that begins half-way is never stored
   meta:{me:myName()||'Playerzacy',opp:NET?(OPN||'Opponent'):'Botzacy',mode:rpMode(),ver:rpVer(),full:!NET||!!NET.host}};}
 if(REC.done||!rpWantFrames())return;
 if(window.MM&&MM.cur&&MM.cur.mode&&REC.meta.mode!='ranked')REC.meta.mode=MM.cur.mode;
 const s=rpSnap(G),k=JSON.stringify(s),evs=(ev||[]).length?rpClone(ev):[];
 if(!evs.length&&k===REC.last)return;   // nothing changed
 REC.last=k;const f={s};if(evs.length)f.ev=evs;if(REC.st!=null){f.st=REC.st;REC.st=null}
 REC.fr.push(f);try{if(window.spPush)spPush(f,REC)}catch(e){console.warn('spectate',e)}
 if(REC.fr.length>4000)REC.done=true}
async function rpFinish(r){
 if(!r||r.done&&r.saved)return;r.done=true;r.saved=true;
 if(r.fr.length<3)return;
 if(r.nosave||!rpOn()||!rpModeOn(r.meta.mode))return;   // recording or this kind of game is switched off in Settings > Replays
 const last=r.fr[r.fr.length-1].s,o=last.over;if(!o)return;
 const res=o.draw?'draw':o.left?'win':o.win==0?'win':'loss';
 r.id='r'+r.t.toString(36)+Math.floor(Math.random()*1296).toString(36);
 r.mt=Object.assign({id:r.id,t:r.t,res,rounds:last.turn,n:r.fr.length},r.meta);
 await rpPersist(r)}
// Writes the recording to storage. Runs again (r.again) when the host's cards arrive after the first save - see "revealing the opponent's side" below.
async function rpPersist(r){
 if(r.busy){r.again=1;return}
 r.busy=1;
 try{do{
  r.again=0;
  if(r.rev&&rpApplyReveal(r.fr,r.rev))r.mt.full=true;
  const payload=await rpZip(JSON.stringify({v:REPLAY_VER,meta:r.mt,frames:r.fr}));
  r.mt.size=payload.length;
  const m=Object.assign({},r.mt),old=idxGet().find(x=>x.id===r.id);if(old&&old.star)m.star=old.star;   // keep a star the player gave in the meantime
  if(await rpSave(m,payload)){
   window.RPL_LAST=r.id;
   if(typeof rplRender=='function'&&$('rplmenu').style.display=='flex')rplRender()}
 }while(r.again)}
 catch(e){console.warn('replay not saved',e)}
 finally{r.busy=0}}

/* ---------- revealing the opponent's side to the guest ----------
   A guest only ever receives its own cards: the host's hand and deck arrive as blanks (id 0), so a replay recorded by a guest could not show them.
   When the game is over the host sends every card its side held (hand + deck, by uid, together with the changes a card went through in hand such as
   a cost reduction or a transform). The guest fills those into its recording - and re-saves it if it was already stored. Nothing is sent while a game is running. */
const rpKey=s=>s.turn*100+(s.step||0);
function rpRevealBuild(r){
 const m={};
 r.fr.forEach(f=>{const s=f.s,k=rpKey(s);
  [].concat(s.p[0].hand,s.p[0].deck).forEach(c=>{if(!c||!c.id)return;
   const j=JSON.stringify(c),a=m[c.uid]||(m[c.uid]=[]);
   if(!a.length||a[a.length-1].j!==j)a.push({k,j,c})})});
 const out={};let size=0;
 for(const u in m){out[u]=m[u].map(x=>[x.k,x.c]);size+=m[u].length}
 if(size>1500)for(const u in out)out[u]=out[u].slice(0,1);   // keep the message small: first known state only
 return out}
function rpRevealSend(r){
 if(!r||!NET||!NET.host||!r.meta.full||!G||!G.over||r.fr.length<3||r.rv===r.fr.length)return;
 r.rv=r.fr.length;netSend({t:'reveal',v:rpRevealBuild(r)})}
// guest: fill the hidden cards of the recording; returns how many were filled
function rpApplyReveal(frs,v){
 let n=0;
 frs.forEach(f=>{const s=f.s,k=rpKey(s);
  s.p.forEach(P=>['hand','deck'].forEach(z=>{
   P[z]=P[z].map(c=>{
    if(!c||c.id||c.uid==null)return c;
    const a=v[c.uid];if(!Array.isArray(a)||!a.length)return c;
    let best=a[0];for(const x of a){if(x[0]<=k)best=x;else break}
    if(!best[1]||!CD[best[1].id])return c;
    n++;return Object.assign({},best[1],{uid:c.uid})})}))});
 return n}
function rpReveal(v){
 const r=REC;if(!r||!v||typeof v!='object')return;   // the host only sends this once the game is over (it can arrive just before the final state)
 r.rev=v;
 if(r.id&&r.mt)rpPersist(r)}   // not finished yet: rpFinish applies it by itself

// hooks: anim() gets the events of a state change, strikeLane() marks "this frame starts with a lane attack", finish() ends the recording
{const A=window.anim;window.anim=function(){if(!RP.on){try{rpCap(G&&G.ev)}catch(e){console.warn('replay',e)}}return A.apply(this,arguments)};
 const S=window.strikeLane;window.strikeLane=function(i){if(!RP.on&&REC&&!REC.done&&REC.gid===gid)REC.st=i;return S.apply(this,arguments)};
 const R=window.render;window.render=function(){const r=R.apply(this,arguments);
  try{if(RP.on)rpPost();else if(G&&(!G.ev||!G.ev.length))rpCap([])}catch(e){console.warn('replay',e)}return r};
 const F=window.finish;window.finish=function(){
  if(RP.on)return;   // a replay never runs the end-of-game code (achievements, ranking, buttons)
  const r=REC;if(r&&!r.done&&r.gid===gid)setTimeout(()=>{if(REC===r){rpFinish(r);rpRevealSend(r)}},500);   // short delay: the final events are drawn right after this render
  if(r&&r.gid===gid&&!r.rv)rpRevealSend(r);   // host: send the hidden cards right away (the guest may leave the screen quickly), again after the delay if frames were added
  return F.apply(this,arguments)}}

/* ---------- the player ---------- */
const RP_ICO={
 play:'<svg viewBox="0 0 16 16" shape-rendering="crispEdges"><path fill="currentColor" d="M4 2h2v12H4zM6 3h2v10H6zM8 4h2v8H8zM10 5h2v6h-2zM12 6h1v4h-1z"/></svg>',
 pause:'<svg viewBox="0 0 16 16" shape-rendering="crispEdges"><path fill="currentColor" d="M3 2h4v12H3zM9 2h4v12H9z"/></svg>',
 next:'<svg viewBox="0 0 16 16" shape-rendering="crispEdges"><path fill="currentColor" d="M3 2h2v12H3zM6 3h2v10H6zM8 4h2v8H8zM10 5h2v6h-2zM12 6h1v4h-1z"/></svg>',
 prev:'<svg viewBox="0 0 16 16" shape-rendering="crispEdges"><path fill="currentColor" d="M13 2h-2v12h2zM10 3H8v10h2zM8 4H6v8h2zM6 5H4v6h2zM4 6H3v4h1z"/></svg>',
 rnext:'<svg viewBox="0 0 16 16" shape-rendering="crispEdges"><path fill="currentColor" d="M1 3h2v10H1zM4 4h2v8H4zM6 5h2v6H6zM8 6h2v4H8zM11 3h2v10h-2zM14 3h1v10h-1z"/></svg>',
 rprev:'<svg viewBox="0 0 16 16" shape-rendering="crispEdges"><path fill="currentColor" d="M15 3h-2v10h2zM12 4h-2v8h2zM10 5H8v6h2zM8 6H6v4h2zM5 3H3v10h2zM2 3H1v10h1z"/></svg>'};
const RP_SPEEDS=[.5,1,2,4];
function rpBuild(){
 if($('rplbar'))return;
 const d=document.createElement('div');d.id='rplbar';
 d.innerHTML=`<div class="rpt"><b id="rpltag">REPLAY</b><span id="rplmeta"></span></div>
  <div class="rpb"><button id="rplrp" title="Previous round">${RP_ICO.rprev}</button><button id="rplprev" title="Step back (Left)">${RP_ICO.prev}</button><button id="rplpp" class="rppp" title="Play / pause (Space)"></button><button id="rplnext" title="Step forward (Right)">${RP_ICO.next}</button><button id="rplrn" title="Next round">${RP_ICO.rnext}</button></div>
  <div class="rps"><input type="range" id="rplsl" min="0" max="0" step="1" value="0"><button id="rplspd" title="Playback speed">1x</button><button id="rplgl" title="Jump to the live position">LIVE</button></div>
  <div class="rpl"><span id="rpllbl"></span></div>`;
 $('stage').appendChild(d);
 $('rplpp').onclick=()=>rpToggle();$('rplprev').onclick=()=>rpStep(-1);$('rplnext').onclick=()=>rpStep(1);
 $('rplrp').onclick=()=>rpRound(-1);$('rplrn').onclick=()=>rpRound(1);
 $('rplgl').onclick=()=>{RP.playing=true;rpGo(RP.fr.length-1,false)};
 $('rplspd').onclick=()=>{RP.speed=RP_SPEEDS[(RP_SPEEDS.indexOf(RP.speed)+1)%RP_SPEEDS.length];rpUI()};
 $('rplsl').oninput=()=>rpSeek(+$('rplsl').value)}
function rpUI(){
 if(!RP.on)return;
 const n=RP.fr.length,f=RP.fr[Math.max(0,RP.i)],end=RP.i>=n-1;
 $('rplpp').innerHTML=RP.playing&&(!end||RP.live)?RP_ICO.pause:RP_ICO.play;
 $('rpltag').textContent=RP.live?'LIVE':'REPLAY';
 $('rplsl').max=Math.max(0,n-1);$('rplsl').value=Math.max(0,RP.i);
 $('rplspd').textContent=(RP.speed<1?'0.5':RP.speed)+'x';
 const o=f&&f.s.over;
 const mt=RP.d&&RP.d.meta||{},res=o&&end?(RP.live?(o.draw?'Draw':(o.left||o.win==0?mt.me||'Host':mt.opp||'Guest')+' wins'):(o.draw?'Draw':o.left||o.win==0?'Win':'Loss')):'';
 $('rpllbl').textContent='Round '+(f?f.s.turn:0)+'  -  '+(Math.max(0,RP.i)+1)+'/'+n+(RP.live&&!end?'  -  '+(n-1-RP.i)+' behind':'')+(res?'  -  '+res:RP.live&&end?'  -  live':'')}
/* ---- replay board: the normal board zoomed out (CSS: body.rpl #game) + a hand band for each player, with their draw and discard piles ---- */
function rpBoardBuild(){
 if($('rplx'))return;
 const d=document.createElement('div');d.id='rplx';
 d.innerHTML='<div class="rpband" id="rpeb"><i class="rpell"></i><div class="rph" id="rpeh"></div><div class="rpiles" id="rpep"></div></div><div class="rpband" id="rppb"><i class="rpell"></i><div class="rph" id="rpmh"></div><div class="rpiles" id="rpmp"></div></div>';
 $('stage').appendChild(d);
 d.onclick=e=>{const p=e.target.closest('[data-pile]');if(p)rpPile(+p.dataset.s,p.dataset.pile)}}
const RPCW=128;
function rpCard(c,p,w,st){
 if(!c||!c.id)return`<div class="rpc rpback" style="width:${w}px;${st||''}"></div>`;
 const fc=cost(G,p,c);
 return`<div class="rpc" style="width:${w}px;${st||''}" data-cid="${c.id}" data-ba="${c.ba||0}" data-fc="${fc}">${cardHTML(Object.assign({},c,{fc}),0)}</div>`}
/* The hand bands keep one element per card (keyed by uid), so a state change MOVES cards instead of redrawing them: a drawn card slides in from the
   draw pile, the rest of the hand re-fans, a card that leaves fades out (a played card is lifted off by rpFly first). RP.an = false (jumping with the
   slider / first frame) places everything instantly. */
const rpMk=html=>{const t=document.createElement('div');t.innerHTML=html;return t.firstChild};
const RP_PILE={x:109,y:26};   // centre of the draw pile inside a band: where drawn cards start
function rpHand(el,p,opp){
 const h=p.hand,n=h.length,w=RPCW,mid=(n-1)/2,step=n>1?Math.min(w*1.04,(1080-w)/(n-1)):0,an=!!RP.an,org='50% '+(opp?'-60%':'160%');
 const ex={};[...el.children].forEach(e=>{if(e.dataset.uid)ex[e.dataset.uid]=e});
 el.classList.toggle('nt',!an);
 h.forEach((c,i)=>{
  const key=String(c.uid),dx=960-w/2+(i-mid)*step,q=Math.pow(i-mid,2)*1.6,y=opp?34-q:6+q,r=(opp?-1:1)*(i-mid)*2,html=rpCard(c,p,w,'');
  let e=ex[key];delete ex[key];
  if(e&&e._k!==html){const ne=rpMk(html);ne.style.cssText=e.style.cssText;e.replaceWith(ne);e=ne}   // the card itself changed (cost, buff, revealed): same place, new face
  else if(!e){e=rpMk(html);
   e.style.transformOrigin=org;
   if(an){e.style.left=(RP_PILE.x-w/2)+'px';e.style.top=RP_PILE.y+'px';e.style.transform='rotate(0deg) scale(.7)';e.style.opacity='0'}
   el.appendChild(e);if(an)void e.offsetWidth}
  e._k=html;e.dataset.uid=key;e.style.visibility='';
  e.style.left=dx+'px';e.style.top=y+'px';e.style.transform=`rotate(${r}deg) scale(1)`;e.style.transformOrigin=org;e.style.opacity='';e.style.zIndex=i+1});
 Object.values(ex).forEach(e=>{
  delete e.dataset.uid;
  if(!an||e.style.visibility=='hidden'){e.remove();return}   // instant jump / the card that was just played (it is flying)
  e.style.zIndex=0;e.style.opacity='0';e.style.transform=e.style.transform.replace('scale(1)','scale(.85)');setTimeout(()=>e.remove(),520)})}
function rpPiles(el,p,s){
 const d=p.deck.length,x=p.disc.length,top=p.disc[x-1],tu=top?top.uid:0,pd=el._d,px=el._x,pt=el._t;
 el.innerHTML=`<div class="rpp" data-pile="deck" data-s="${s}" title="Draw pile - click to see what is left in it"><div class="rpc rpback"></div><b>${d?d+' left':'Fatigue '+((p.fat||0)+1)}</b></div>`+
  `<div class="rpp" data-pile="disc" data-s="${s}" title="Discard pile - click to see it">${top?rpCard(top,p,104):'<div class="rpc rpemp"></div>'}<b>${x} used</b></div>`;
 if(RP.an&&pd!=null){   // a pile that changed pulses: the counter, and a card that lands on the discard pile drops in
  if(d!==pd)el.querySelector('[data-pile="deck"] b').classList.add('rpbump');
  if(x!==px||tu!==pt){el.querySelector('[data-pile="disc"] b').classList.add('rpbump');const c=top&&el.querySelector('[data-pile="disc"] .rpc');if(c)c.classList.add('rpdrop')}}
 el._d=d;el._x=x;el._t=tu}
function rpReset(){['rpeh','rpmh'].forEach(k=>{const e=$(k);if(e)e.innerHTML=''});['rpep','rpmp'].forEach(k=>{const e=$(k);if(e){e._d=e._x=e._t=null;e.innerHTML=''}})}
function rpPile(s,kind){
 if(!G)return;const p=G.p[s],who=s?(RP.d&&RP.d.meta&&RP.d.meta.opp||'Opponent')+"'s":'Your';
 const cards=kind=='deck'?p.deck.slice().sort((a,b)=>a.id&&b.id?cmpC(CD[a.id],CD[b.id]):0):p.disc.slice().reverse();
 if(cards.some(c=>!c.id)){toast(RP.live?'Hidden while watching live':'The opponent\'s hidden cards were not shared for this match (it was recorded before replays could reveal them)',1);return}
 viewPile(who+(kind=='deck'?' deck ('+cards.length+') - sorted by cost':' discard pile ('+cards.length+') - newest first'),cards)}
function rpBoard(){
 rpBoardBuild();$('rplx').style.setProperty('--rpd',(.45/(RP.speed||1)).toFixed(3)+'s');
 rpHand($('rpeh'),G.p[1],1);rpHand($('rpmh'),G.p[0],0);rpPiles($('rpep'),G.p[1],1);rpPiles($('rpmp'),G.p[0],0);
}
// after every render() in replay mode: the board is a pure viewer
function rpPost(){
 rpBoard();
 const m=RP.d&&RP.d.meta||{};
 $('pnb').textContent=m.me||'Playerzacy';$('enb').textContent=m.opp||'Opponent';
 $('end').disabled=true;$('end').textContent=RP.live?'Live':'Replay';
 $('sur').textContent=RP.live?'Leave':'Exit replay'}
/* ---- card flights: which card was played between two frames? ----
   A frame only holds the board, so the "card flies from the hand onto the board" animation of a live game is rebuilt from the difference:
   a new entry in the play history + the card of that player that left the hand (found by uid). Works for old replays too. */
function rpPlayOf(a,b,evs){
 if(!a||!b)return null;
 const ha=a.hist||[],hb=b.hist||[];if(!hb.length)return null;
 const sg=h=>h?[h.p,h.t,h.id,h.tg,h.uid||''].join('|'):'';
 let n=0;if(a.hn!=null&&b.hn!=null)n=Math.min(b.hn-a.hn,hb.length);
 if(n<=0&&sg(ha[ha.length-1])!==sg(hb[hb.length-1]))n=1;
 if(n<=0)return null;
 const ent=hb.slice(-n).filter(h=>!h.tf&&CD[h.id]).pop();if(!ent)return null;
 const p=ent.p,left=new Set(b.p[p].hand.map(c=>c.uid)),gone=a.p[p].hand.filter(c=>!left.has(c.uid));
 const src=gone.find(c=>c.id===ent.id)||gone.find(c=>!c.id);if(!src)return null;
 const sp=CD[ent.id].Type!='Unit';let ln=-1;
 if(!sp){const al=a.p[p].ln,bl=b.p[p].ln;
  if(ent.uid!=null)ln=bl.findIndex(u=>u&&u.uid===ent.uid);
  if(ln<0)ln=bl.findIndex((u,i)=>u&&u.id===ent.id&&(!al[i]||al[i].uid!==u.uid));
  if(ln<0)ln=bl.findIndex((u,i)=>u&&(!al[i]||al[i].uid!==u.uid));
  if(ln<0){const d=(evs||[]).find(x=>x.k=='die'&&x.uid===ent.uid);if(d&&d.lane>=0)ln=d.lane}}   // killed the moment it came in
 return{p,id:ent.id,sp,ln,src}}
function rpCenter(){const k=scl(),z=parseFloat(getComputedStyle(document.body).getPropertyValue('--rs'))||.84,b=$('board').getBoundingClientRect(),w=300*k*z,h=w*368/260;
 return{left:b.left+(b.width-w)/2,top:b.top+(b.height-h)/2,width:w,height:h}}
async function rpFly(pl){
 const k=scl(),w=RPCW*k,h=w*368/260,band=$(pl.p?'rpeh':'rpmh'),el=band.querySelector(`[data-uid="${pl.src.uid}"]`),r=(el||band).getBoundingClientRect();
 const from=el?{left:r.left+r.width/2-w/2,top:r.top+r.height/2-h/2,width:w,height:h}:{left:r.left+r.width/2-w/2,top:r.top+(pl.p?0:r.height-h),width:w,height:h};
 if(el)el.style.visibility='hidden';
 let to=null,out=pl.sp;
 if(!out){const sl=document.querySelector(`#board .slot[data-r="${pl.p}"][data-i="${pl.ln}"]`);if(sl)to=sl.getBoundingClientRect();else out=true}
 if(out)to=rpCenter();
 let fc;try{fc=cost(G,G.p[pl.p],Object.assign({},pl.src,{id:pl.id}))}catch(e){}
 const sd=RP.speed||1;
 await flyCard(pl.id,from,to,{out,dur:Math.max(150,(out?480:380)/sd),hold:Math.max(60,300/sd),fc,ba:pl.src.ba})}
async function rpShow(f,animate,tk){
 const prev=animate&&RP.i>0?RP.fr[RP.i-1]:null,pl=prev?rpPlayOf(prev.s,f.s,f.ev):null;
 RP.pl=!!pl;
 if(pl){try{await rpFly(pl)}catch(e){console.warn('replay fly',e)}if(!RP.on||RP.tok!==tk)return}
 if(animate&&f.st!=null){flash=f.st;RP.an=false;render();await strikeLane(f.st);if(!RP.on||RP.tok!==tk)return}
 RP.an=!!animate;
 G=unsnap(rpClone(f.s),animate&&f.ev?rpClone(f.ev):[]);sel=pend=null;castMode=false;busy=true;flash=-1;
 render();if(animate){anim();if(f.st!=null)recoil()}}
const rpDelay=f=>{const ev=f.ev||[];return f.st!=null?(ev.some(x=>x.k=='atk'&&x.post)?1150:650):ev.length?(RP.pl?650:800):RP.pl?500:420};
async function rpRun(tk){
 while(RP.on&&RP.tok===tk){
  const end=RP.i>=RP.fr.length-1;
  if(!RP.playing||end){if(end&&RP.playing&&!RP.live){RP.playing=false;rpUI()}await sleep(120);continue}
  const f=RP.fr[++RP.i];
  try{await rpShow(f,true,tk)}catch(e){console.error('replay',e);rpFail(e);return}
  if(!RP.on||RP.tok!==tk)return;
  rpUI();const bh=RP.live?RP.fr.length-1-RP.i:0;await sleep(rpDelay(f)/(RP.speed*(bh>3?1+Math.min(3,(bh-3)/3):1)))}}
function rpRestart(){const tk=++RP.tok;rpUI();rpRun(tk)}
async function rpGo(i,animate){   // jump to a frame (paused or running)
 RP.tok++;const tk=RP.tok;i=Math.max(0,Math.min(RP.fr.length-1,i));RP.i=i;
 try{await rpShow(RP.fr[i],!!animate,tk)}catch(e){rpFail(e);return}
 if(RP.tok!==tk)return;rpUI();rpRun(tk)}
const rpSeek=i=>rpGo(i,false);
function rpStep(d){RP.playing=false;const i=RP.i+d;if(i<0||i>=RP.fr.length)return;rpGo(i,d>0)}
function rpToggle(){
 if(!RP.live&&RP.i>=RP.fr.length-1){RP.playing=true;rpGo(0,false);return}   // finished: play again from the start
 RP.playing=!RP.playing;rpUI()}
function rpRound(d){
 const t=i=>RP.fr[i].s.turn,cur=RP.i<0?0:RP.i;let j=cur;
 if(d>0){while(j<RP.fr.length-1&&t(j)<=t(cur))j++}
 else{const tc=t(cur);while(j>0&&t(j)==tc)j--;const tp=t(j);while(j>0&&t(j-1)==tp)j--;if(cur>0&&t(cur)==tc&&cur-1>=0&&t(cur-1)==tc){j=cur;while(j>0&&t(j-1)==tc)j--}}
 RP.playing=false;rpGo(j,false)}
function rpFail(e){toast('This replay could not be played ('+((e&&e.message)||'error')+')',1);rpExit()}

function rpStart(data,live){
 if(!data||!Array.isArray(data.frames)||data.frames.length<(live?1:2)){toast('This replay is empty or damaged',1);return}
 if(window.TUT&&TUT.active)TUT.stop();if(typeof extRes!='undefined'&&extRes)extRes();unpin();bpClear();
 RP.on=true;RP.live=!!live;document.body.classList.toggle('live',!!live);RP.d=data;RP.fr=data.frames;RP.i=-1;RP.playing=true;RP.speed=1;gid++;
 OPN=data.meta&&data.meta.opp||'';busy=true;sel=pend=null;castMode=false;stickyZoom=false;flash=-1;
 ['ov','mul','hist','modal'].forEach(k=>$(k).style.display='none');
 rpBuild();document.body.classList.add('rpl');rpBoardBuild();rpReset();RP.an=false;
 try{musicNewGame()}catch(e){}
 show('game');
 const m=data.meta||{};$('rplmeta').textContent=(RP_MODES[m.mode]||'')+(m.ver?'  -  '+m.ver:'');
 rpGo(0,false)}
function rpExit(){
 if(!RP.on)return;const live=RP.live;RP.on=false;RP.live=false;RP.tok++;document.body.classList.remove('rpl','live');
 $('sur').textContent='Surrender';$('end').textContent='End Turn';
 busy=false;if(live&&typeof spStop=='function')spStop();toMenu();
 if(!live){const b=$('ropen');if(b)b.click()}}
{const o=$('sur').onclick;$('sur').onclick=function(e){if(RP.on){rpExit();return}return o&&o.call(this,e)}}
addEventListener('keydown',e=>{
 if(!RP.on||e.ctrlKey||e.metaKey||e.altKey)return;
 const ovl=['hist','mul','modal','setmenu'].some(k=>$(k)&&$(k).style.display=='flex');
 if(e.key=='Escape'){if(!ovl){rpExit();e.preventDefault();e.stopImmediatePropagation()}return}
 if(ovl||RP.live)return;   // live: no hidden controls (the bar is hidden), so no keyboard pause either
 if(e.key==' '){rpToggle();e.preventDefault()}
 else if(e.key=='ArrowRight'){rpStep(1);e.preventDefault()}
 else if(e.key=='ArrowLeft'){rpStep(-1);e.preventDefault()}},true);

/* ---------- Replays screen (Extras > Replays) ---------- */
let rpConfirm=null;
function rplRender(){
 const a=idxGet(),box=$('rpllist');
 $('rplsub').textContent=(a.length?a.length+(a.length==1?' replay':' replays')+' saved in this browser - the latest '+rpKeep()+' are kept, a starred one is never removed':'Every game you finish is saved here automatically')+(rpOn()?'':'  -  Recording is OFF (Settings > Replays)');
 if(!a.length){box.innerHTML='<div class="rple">No replays yet. Play a game (vs the bot, Quick Match or Ranked) and it will show up here. You can choose which games are recorded in Settings > Replays.</div>';return}
 box.innerHTML=a.map(m=>{
  const r=m.res=='win'?'VICTORY':m.res=='draw'?'DRAW':'DEFEAT';
  return`<div class="rpr ${m.res}" data-id="${rpEsc(m.id)}">
   <div class="rpres">${r}</div>
   <div class="rpi"><b>vs ${rpEsc(m.opp||'Opponent')}</b><small>${rpEsc(RP_MODES[m.mode]||'Game')}  -  ${rpEsc(rpFmt(m.t))}  -  ${m.rounds||'?'} rounds${m.ver?'  -  '+rpEsc(m.ver):''}</small></div>
   <div class="rpa"><button data-a="watch" class="rpw">Watch</button><button data-a="star" class="${m.star?'on':''}" title="Keep this replay (never removed automatically)">${m.star?'Kept':'Keep'}</button><button data-a="save" title="Save to a file you can share">Save file</button><button data-a="del" class="${rpConfirm==m.id?'cf':''}" title="Delete this replay">${rpConfirm==m.id?'Sure?':'Delete'}</button></div></div>`}).join('')}
function rplOpen(){rpConfirm=null;rplRender();openPanel('rplmenu')}
async function rpWatch(id){
 try{const d=await rpLoad(id);rpStart(d)}catch(e){toast((e&&e.message)||'Could not open this replay',1);rplRender()}}
function rpDownload(id){
 const m=idxGet().find(x=>x.id==id),p=localStorage.getItem(RPK(id));if(!m||!p){toast('This replay is no longer stored',1);return}
 const blob=new Blob([JSON.stringify({rjreplay:REPLAY_VER,meta:m,data:p})],{type:'application/json'}),u=URL.createObjectURL(blob),a=document.createElement('a'),d=new Date(m.t),z=n=>String(n).padStart(2,'0');
 a.href=u;a.download='rejoltance-'+String(m.opp||'game').replace(/[^\w-]+/g,'_').slice(0,20)+'-'+d.getFullYear()+z(d.getMonth()+1)+z(d.getDate())+'-'+z(d.getHours())+z(d.getMinutes())+'.rjreplay';
 document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),2000)}
async function rpImport(file){
 try{
  if(file.size>12*1024*1024)throw new Error('File is too big');
  const j=JSON.parse(await file.text());
  if(!j||j.rjreplay!==REPLAY_VER||typeof j.data!='string')throw new Error('Not a replay file');
  const d=JSON.parse(await rpUnzip(j.data));
  if(!d||!Array.isArray(d.frames)||d.frames.length<2||!d.meta)throw new Error('Replay is damaged');
  const m=Object.assign({},d.meta);
  if(idxGet().some(x=>x.t==m.t&&x.opp==m.opp&&x.me==m.me)){toast('You already have this replay');return}
  m.id='r'+Date.now().toString(36)+Math.floor(Math.random()*1296).toString(36);m.size=j.data.length;m.star=1;   // imported replays are kept
  if(!(await rpSave(m,j.data)))throw new Error('Not enough browser storage');
  toast('Replay imported');rplRender()}
 catch(e){toast('Could not import: '+(e instanceof SyntaxError?'not a replay file':(e&&e.message)||'error'),1)}}
$('rpllist').onclick=e=>{
 const b=e.target.closest('button[data-a]'),row=e.target.closest('.rpr');if(!row)return;const id=row.dataset.id;
 if(!b){rpConfirm=null;return}
 const a=b.dataset.a;
 if(a=='watch')rpWatch(id);
 else if(a=='save')rpDownload(id);
 else if(a=='star'){const x=idxGet(),m=x.find(q=>q.id==id);if(m){m.star=m.star?0:1;idxPut(x);rplRender()}}
 else if(a=='del'){if(rpConfirm==id){rpConfirm=null;rpDrop(id);idxPut(idxGet().filter(q=>q.id!=id));rplRender()}else{rpConfirm=id;rplRender();setTimeout(()=>{if(rpConfirm==id){rpConfirm=null;if($('rplmenu').style.display=='flex')rplRender()}},3000)}}};
$('rplimp').onclick=()=>$('rplfile').click();
$('rplfile').onchange=()=>{const f=$('rplfile').files[0];$('rplfile').value='';if(f)rpImport(f)};
$('ropen').onclick=rplOpen;

/* ---------- Settings > Replays tab ---------- */
let rpsConfirm=0;
const rpsGroups={rpm_bot:'bot',rpm_mirror:'mirror',rpm_ranked:'ranked',rpm_quick:'quick',rpm_friend:'friend'};
function rpsRefresh(){
 if(!$('rpon'))return;
 $('rpon').checked=rpOn();$('rpkeep').value=String(rpKeep());
 for(const id in rpsGroups)$(id).checked=rpModeOn(rpsGroups[id]);
 $('set-rpl').classList.toggle('off',!rpOn());
 const a=idxGet(),un=a.filter(x=>!x.star).length,kb=Math.round(a.reduce((t,x)=>t+(x.size||0),0)/1024);
 $('rpinfo').textContent=a.length?a.length+(a.length==1?' replay':' replays')+' ('+(kb>=1024?(kb/1024).toFixed(1)+' MB':kb+' KB')+'), '+(a.length-un)+' kept':'none';
 $('rpclear').disabled=!un;$('rpclear').textContent=rpsConfirm?'Sure?':'Delete unkept';$('rpclear').classList.toggle('cf',!!rpsConfirm)}
$('rpon').onchange=()=>{rpsSet(RPS_KEYS.on,$('rpon').checked?'1':'0');rpsRefresh()};
for(const id in rpsGroups)$(id).onchange=()=>rpsSet(RPS_KEYS.m(rpsGroups[id]),$(id).checked?'1':'0');
$('rpkeep').onchange=()=>{
 const old=rpKeep(),n=+$('rpkeep').value,over=idxGet().filter(x=>!x.star).length-n;
 if(over>0&&!confirm('This removes the '+over+' oldest replay'+(over==1?'':'s')+' that '+(over==1?'is':'are')+' not marked as Kept. Continue?')){$('rpkeep').value=String(old);return}
 rpsSet(RPS_KEYS.keep,String(n));rpTrim();rpsRefresh()};
$('rpclear').onclick=()=>{
 if(!rpsConfirm){rpsConfirm=1;rpsRefresh();setTimeout(()=>{if(rpsConfirm){rpsConfirm=0;rpsRefresh()}},3000);return}
 rpsConfirm=0;const a=idxGet();a.filter(x=>!x.star).forEach(x=>rpDrop(x.id));idxPut(a.filter(x=>x.star));rpsRefresh();
 if($('rplmenu').style.display=='flex')rplRender()};
rpsRefresh();
