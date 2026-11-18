/* ============================================================
   REPLAYS
   Every finished game (vs bot, Mirror Match, Quick Match, Ranked, friend / room games) is recorded automatically as a list of "frames":
   the board as YOU saw it (the opponent's hand and deck stay hidden) + the animation events that went with it. Watching a replay simply feeds those
   frames to the normal board drawing (render / anim), exactly like an online guest receives them - so it needs no game logic and it can never
   desync. Tutorial and Endless Mode are not recorded.

   Storage: the last REPLAY_KEEP games are kept in this browser (localStorage, gzip-compressed). A starred replay is never removed automatically.
   A replay can be saved to a .rjreplay file and imported again (to share it).
   ============================================================ */
const REPLAY_KEEP=20,REPLAY_VER=1;
const RP={on:false,tok:0,fr:[],i:-1,playing:true,speed:1,d:null,meta:null};
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
 while(a.filter(x=>!x.star).length>REPLAY_KEEP){const old=a.slice().reverse().find(x=>!x.star);rpDrop(old.id);a=a.filter(x=>x!==old)}
 return idxPut(a)}
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
  log:G.log.slice(-40),hist:G.hist.slice(-80).map(h=>({p:h.p,t:h.t,id:h.id,tg:h.tg})),
  p:[side(G.p[0]),side(G.p[1])]}))}
const rpMode=()=>{try{if(window.MM&&MM.cur&&MM.cur.mode)return MM.cur.mode}catch(e){}return NET?'online':(typeof MODE!='undefined'&&MODE=='mirror'?'mirror':'bot')};
function rpCap(ev){
 if(RP.on||typeof DEMO!='undefined'&&DEMO||!G||!G.p||G.tut||G.en||$('game').style.display!='block'||G.turn<1)return;
 if(!REC||REC.gid!==gid){
  REC={gid,t:Date.now(),fr:[],last:'',st:null,done:false,
   meta:{me:myName()||'Playerzacy',opp:NET?(OPN||'Opponent'):'Botzacy',mode:rpMode(),ver:rpVer(),full:!NET||!!NET.host}};
  const b=$('ovw');if(b)b.style.display='none'}
 if(REC.done)return;
 if(window.MM&&MM.cur&&MM.cur.mode&&REC.meta.mode!='ranked')REC.meta.mode=MM.cur.mode;
 const s=rpSnap(G),k=JSON.stringify(s),evs=(ev||[]).length?rpClone(ev):[];
 if(!evs.length&&k===REC.last)return;   // nothing changed
 REC.last=k;const f={s};if(evs.length)f.ev=evs;if(REC.st!=null){f.st=REC.st;REC.st=null}
 REC.fr.push(f);if(REC.fr.length>4000)REC.done=true}
async function rpFinish(r){
 if(!r||r.done&&r.saved)return;r.done=true;r.saved=true;
 if(r.fr.length<3)return;
 const last=r.fr[r.fr.length-1].s,o=last.over;if(!o)return;
 const res=o.draw?'draw':o.left?'win':o.win==0?'win':'loss';
 const id='r'+r.t.toString(36)+Math.floor(Math.random()*1296).toString(36);
 const meta=Object.assign({id,t:r.t,res,rounds:last.turn,n:r.fr.length},r.meta);
 try{
  const payload=await rpZip(JSON.stringify({v:REPLAY_VER,meta,frames:r.fr}));
  meta.size=payload.length;
  if(await rpSave(meta,payload)){
   window.RPL_LAST=id;const b=$('ovw');if(b&&G&&G.over&&$('ov').style.display=='flex')b.style.display='';
   if(typeof rplRender=='function'&&$('rplmenu').style.display=='flex')rplRender()}
 }catch(e){console.warn('replay not saved',e)}}

// hooks: anim() gets the events of a state change, strikeLane() marks "this frame starts with a lane attack", finish() ends the recording
{const A=window.anim;window.anim=function(){if(!RP.on){try{rpCap(G&&G.ev)}catch(e){console.warn('replay',e)}}return A.apply(this,arguments)};
 const S=window.strikeLane;window.strikeLane=function(i){if(!RP.on&&REC&&!REC.done&&REC.gid===gid)REC.st=i;return S.apply(this,arguments)};
 const R=window.render;window.render=function(){const r=R.apply(this,arguments);
  try{if(RP.on)rpPost();else if(G&&(!G.ev||!G.ev.length))rpCap([])}catch(e){console.warn('replay',e)}return r};
 const F=window.finish;window.finish=function(){
  if(RP.on)return;   // a replay never runs the end-of-game code (achievements, ranking, buttons)
  const r=REC;if(r&&!r.done&&r.gid===gid)setTimeout(()=>{if(REC===r)rpFinish(r)},500);   // short delay: the final events are drawn right after this render
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
 d.innerHTML=`<div class="rpt"><b>REPLAY</b><span id="rplmeta"></span></div>
  <div class="rpb"><button id="rplrp" title="Previous round">${RP_ICO.rprev}</button><button id="rplprev" title="Step back (Left)">${RP_ICO.prev}</button><button id="rplpp" class="rppp" title="Play / pause (Space)"></button><button id="rplnext" title="Step forward (Right)">${RP_ICO.next}</button><button id="rplrn" title="Next round">${RP_ICO.rnext}</button></div>
  <div class="rps"><input type="range" id="rplsl" min="0" max="0" step="1" value="0"><button id="rplspd" title="Playback speed">1x</button></div>
  <div class="rpl"><span id="rpllbl"></span></div>`;
 $('stage').appendChild(d);
 $('rplpp').onclick=()=>rpToggle();$('rplprev').onclick=()=>rpStep(-1);$('rplnext').onclick=()=>rpStep(1);
 $('rplrp').onclick=()=>rpRound(-1);$('rplrn').onclick=()=>rpRound(1);
 $('rplspd').onclick=()=>{RP.speed=RP_SPEEDS[(RP_SPEEDS.indexOf(RP.speed)+1)%RP_SPEEDS.length];rpUI()};
 $('rplsl').oninput=()=>rpSeek(+$('rplsl').value)}
function rpUI(){
 if(!RP.on)return;
 const n=RP.fr.length,f=RP.fr[Math.max(0,RP.i)],end=RP.i>=n-1;
 $('rplpp').innerHTML=RP.playing&&!end?RP_ICO.pause:RP_ICO.play;
 $('rplsl').max=Math.max(0,n-1);$('rplsl').value=Math.max(0,RP.i);
 $('rplspd').textContent=(RP.speed<1?'0.5':RP.speed)+'x';
 const o=f&&f.s.over;
 $('rpllbl').textContent='Round '+(f?f.s.turn:0)+'  -  '+(Math.max(0,RP.i)+1)+'/'+n+(o&&end?'  -  '+(o.draw?'Draw':o.left||o.win==0?'Win':'Loss'):'')}
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
function rpHand(el,p,opp){
 const h=p.hand,n=h.length,w=RPCW,mid=(n-1)/2,step=n>1?Math.min(w*1.04,(1080-w)/(n-1)):0,ch=Math.round(w*368/260);
 el.innerHTML=h.map((c,i)=>{
  const dx=960-w/2+(i-mid)*step,e=Math.pow(i-mid,2)*1.6,y=opp?34-e:6+e,r=(opp?-1:1)*(i-mid)*2;
  return rpCard(c,p,w,`left:${dx}px;top:${y}px;transform:rotate(${r}deg);transform-origin:50% ${opp?'-60%':'160%'};z-index:${i+1}`)}).join('')}
function rpPiles(el,p,s){
 const d=p.deck.length,x=p.disc.length,top=p.disc[x-1];
 el.innerHTML=`<div class="rpp" data-pile="deck" data-s="${s}" title="Draw pile - click to see what is left in it"><div class="rpc rpback"></div><b>${d?d+' left':'Fatigue '+((p.fat||0)+1)}</b></div>`+
  `<div class="rpp" data-pile="disc" data-s="${s}" title="Discard pile - click to see it">${top?rpCard(top,p,104):'<div class="rpc rpemp"></div>'}<b>${x} used</b></div>`}
function rpPile(s,kind){
 if(!G)return;const p=G.p[s],who=s?(RP.d&&RP.d.meta&&RP.d.meta.opp||'Opponent')+"'s":'Your';
 const cards=kind=='deck'?p.deck.slice().sort((a,b)=>a.id&&b.id?cmpC(CD[a.id],CD[b.id]):0):p.disc.slice().reverse();
 if(cards.some(c=>!c.id)){toast('The opponent\'s cards are not in this replay (you were the guest in this match)',1);return}
 viewPile(who+(kind=='deck'?' deck ('+cards.length+') - sorted by cost':' discard pile ('+cards.length+') - newest first'),cards)}
function rpBoard(){
 rpBoardBuild();
 rpHand($('rpeh'),G.p[1],1);rpHand($('rpmh'),G.p[0],0);rpPiles($('rpep'),G.p[1],1);rpPiles($('rpmp'),G.p[0],0);
}
// after every render() in replay mode: the board is a pure viewer
function rpPost(){
 rpBoard();
 const m=RP.d&&RP.d.meta||{};
 $('pnb').textContent=m.me||'Playerzacy';$('enb').textContent=m.opp||'Opponent';
 $('end').disabled=true;$('end').textContent='Replay';
 $('sur').textContent='Exit replay'}
async function rpShow(f,animate,tk){
 if(animate&&f.st!=null){flash=f.st;render();await strikeLane(f.st);if(!RP.on||RP.tok!==tk)return}
 G=unsnap(rpClone(f.s),animate&&f.ev?rpClone(f.ev):[]);sel=pend=null;castMode=false;busy=true;flash=-1;
 render();if(animate){anim();if(f.st!=null)recoil()}}
const rpDelay=f=>{const ev=f.ev||[];return f.st!=null?(ev.some(x=>x.k=='atk'&&x.post)?1150:650):ev.length?800:420};
async function rpRun(tk){
 while(RP.on&&RP.tok===tk){
  const end=RP.i>=RP.fr.length-1;
  if(!RP.playing||end){if(end&&RP.playing){RP.playing=false;rpUI()}await sleep(120);continue}
  const f=RP.fr[++RP.i];
  try{await rpShow(f,true,tk)}catch(e){console.error('replay',e);rpFail(e);return}
  if(!RP.on||RP.tok!==tk)return;
  rpUI();await sleep(rpDelay(f)/RP.speed)}}
function rpRestart(){const tk=++RP.tok;rpUI();rpRun(tk)}
async function rpGo(i,animate){   // jump to a frame (paused or running)
 RP.tok++;const tk=RP.tok;i=Math.max(0,Math.min(RP.fr.length-1,i));RP.i=i;
 try{await rpShow(RP.fr[i],!!animate,tk)}catch(e){rpFail(e);return}
 if(RP.tok!==tk)return;rpUI();rpRun(tk)}
const rpSeek=i=>rpGo(i,false);
function rpStep(d){RP.playing=false;const i=RP.i+d;if(i<0||i>=RP.fr.length)return;rpGo(i,d>0)}
function rpToggle(){
 if(RP.i>=RP.fr.length-1){RP.playing=true;rpGo(0,false);return}   // finished: play again from the start
 RP.playing=!RP.playing;rpUI()}
function rpRound(d){
 const t=i=>RP.fr[i].s.turn,cur=RP.i<0?0:RP.i;let j=cur;
 if(d>0){while(j<RP.fr.length-1&&t(j)<=t(cur))j++}
 else{const tc=t(cur);while(j>0&&t(j)==tc)j--;const tp=t(j);while(j>0&&t(j-1)==tp)j--;if(cur>0&&t(cur)==tc&&cur-1>=0&&t(cur-1)==tc){j=cur;while(j>0&&t(j-1)==tc)j--}}
 RP.playing=false;rpGo(j,false)}
function rpFail(e){toast('This replay could not be played ('+((e&&e.message)||'error')+')',1);rpExit()}

function rpStart(data){
 if(!data||!Array.isArray(data.frames)||data.frames.length<2){toast('This replay is empty or damaged',1);return}
 if(window.TUT&&TUT.active)TUT.stop();if(typeof extRes!='undefined'&&extRes)extRes();unpin();bpClear();
 RP.on=true;RP.d=data;RP.fr=data.frames;RP.i=-1;RP.playing=true;RP.speed=1;gid++;
 OPN=data.meta&&data.meta.opp||'';busy=true;sel=pend=null;castMode=false;stickyZoom=false;flash=-1;
 ['ov','mul','hist','modal'].forEach(k=>$(k).style.display='none');
 rpBuild();document.body.classList.add('rpl');rpBoardBuild();
 try{musicNewGame()}catch(e){}
 show('game');
 const m=data.meta||{};$('rplmeta').textContent=(RP_MODES[m.mode]||'')+(m.ver?'  -  '+m.ver:'');
 rpGo(0,false)}
function rpExit(){
 if(!RP.on)return;RP.on=false;RP.tok++;document.body.classList.remove('rpl');
 $('sur').textContent='Surrender';$('end').textContent='End Turn';
 busy=false;toMenu();
 const b=$('ropen');if(b)b.click()}
{const o=$('sur').onclick;$('sur').onclick=function(e){if(RP.on){rpExit();return}return o&&o.call(this,e)}}
addEventListener('keydown',e=>{
 if(!RP.on||e.ctrlKey||e.metaKey||e.altKey)return;
 const ovl=['hist','mul','modal','setmenu'].some(k=>$(k)&&$(k).style.display=='flex');
 if(e.key=='Escape'){if(!ovl){rpExit();e.preventDefault();e.stopImmediatePropagation()}return}
 if(ovl)return;
 if(e.key==' '){rpToggle();e.preventDefault()}
 else if(e.key=='ArrowRight'){rpStep(1);e.preventDefault()}
 else if(e.key=='ArrowLeft'){rpStep(-1);e.preventDefault()}},true);

/* ---------- Replays screen (Extras > Replays) ---------- */
let rpConfirm=null;
function rplRender(){
 const a=idxGet(),box=$('rpllist');
 $('rplsub').textContent=a.length?a.length+(a.length==1?' replay':' replays')+' saved in this browser - the latest '+REPLAY_KEEP+' are kept, a starred one is never removed':'Every game you finish is saved here automatically';
 if(!a.length){box.innerHTML='<div class="rple">No replays yet. Play a game (vs the bot, Quick Match or Ranked) and it will show up here.</div>';return}
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
$('ovw').onclick=()=>{if(window.RPL_LAST)rpWatch(window.RPL_LAST)};
