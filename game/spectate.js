/* ============================================================
   SPECTATING (unlimited viewers)
   A room game (Host Online / Join Online / Mirror Match online) can be watched by anyone who has the room code or the link  ?watch=CODE.
   Spectators are NOT players: they never get the game logic, only the same "frames" the replay recorder produces (see replay.js), with every
   hand and deck replaced by face-down cards, so nobody can read hidden information. The frames are drawn by the replay player in LIVE mode.

   There is no limit because the viewers form a RELAY TREE instead of all connecting to the host:
   - the host (root) accepts at most SP_FAN spectators directly; when it is full it answers a new spectator with "go to this peer instead"
     (the child with the fewest viewers below it), and the spectator repeats that until it finds a node with a free slot;
   - every spectator accepts up to SP_FAN viewers itself and forwards each frame to them. With SP_FAN=3, 1000 viewers need only ~7 levels;
   - the host's upload stays tiny however many people watch, so the players' game is not slowed down;
   - a spectator whose parent disappears (close, or no heartbeat for 25 s) simply rejoins from the root and receives the latest frame again;
   - counts are summed up the tree and shown to the players ("Watch N" button in the game header).
   Messages: sp-hi (welcome + latest frame), sp-f (new frame), sp-hb (heartbeat + total), sp-up (child -> parent: viewers below me),
   sp-redir, sp-err, sp-bye (room closed).
   ============================================================ */
const SP_FAN=3;
let SPEC=null,SPTK=0,SPM=false;
const spX=()=>window.RJ_EXP?(window.RJ_MAXC<3?2:1):0;
const spNode=root=>({root:!!root,kids:[],fan:SP_FAN,tot:0,cnt:1,dead:false});
const spFwd=(T,m)=>T.kids.forEach(k=>{try{if(k.c.open)k.c.send(m)}catch(e){}});
// which games can be watched: room games, Mirror Match online and friend challenges. Quick Match and Ranked never (fair play).
const spOK=N=>!!(N&&N.host&&!N.dead);   // EVERY hosted game can be watched: room, Mirror Match, Quick Match, Ranked, friend challenge (spectators only get face-down hands/decks)
// id a spectator connects to: Quick Match (p2p) drops its signalling link when matched, so it gets a dedicated stream peer; the others use the game peer
const spLinkId=N=>{try{if(!N||!N.host)return'';if(N.wp)return N.wp.open?N.wp.id:'';if(N.qm)return'';return N.peer&&N.peer.id||''}catch(e){return''}};
// ---------- beacons: a peer with a STABLE id per account (rejoltance-L<pid>) that exists only while that player is in a game ----------
// Friends' lists probe these ids, so a running game can be found (and watched) without a room code and without any server support.
// Host: the beacon is the root of the spectator tree. Guest: the beacon only redirects spectators to the host's beacon (id sent with {t:'spid'}).
const spPidOf=()=>{try{const p=window.MM&&MM.me&&MM.me.pid;return p&&/^[\w-]{3,40}$/.test(p)?String(p):''}catch(e){return''}};
const spBid=pid=>NETPRE+'L'+pid,spRnd=()=>NETPRE+'W'+newCode()+newCode();
function spBeacon(N,id,onConn,fallback){
 return peerOpt().then(opt=>{
  if(NET!==N||N.dead||N.wp)return;
  const open=(n,pid)=>{
   const p=new(PeerC())(pid,opt);N.wp=p;
   p.on('open',()=>{if(NET===N&&N.host)netSend({t:'spid',id:p.id})});
   p.on('connection',c=>{
    if(NET!==N){try{c.close()}catch(e){}return}
    const md=c.metadata||{};
    if(md.probe){c.on('open',()=>setTimeout(()=>{try{c.close()}catch(e){}},300));return}   // a friends list asking "are you in a game?"
    if(md.spec)onConn(c);else{try{c.close()}catch(e){}}});
   p.on('disconnected',()=>{try{if(!p.destroyed)p.reconnect()}catch(e){}});
   p.on('error',e=>{if(e.type!='unavailable-id')return;   // the old beacon of this account is still registered (previous game / second tab): retry shortly
    try{p.destroy()}catch(x){}N.wp=null;
    if(n<5)setTimeout(()=>{if(NET===N&&!N.dead&&!N.wp)open(n+1,n>=2&&fallback?fallback:pid)},1500)})};
  open(0,id)})}
function spStream(N){   // host, called for every frame
 if(N.wp||N.wpTry)return;
 const pid=prAllowed()?spPidOf():'';
 if(!pid&&!N.qm)return;   // without an account only Quick Match needs it (its game peer drops the signalling link); other games are reached through the game peer
 N.wpTry=1;
 spBeacon(N,pid?spBid(pid):spRnd(),c=>spAccept(N.sp||(N.sp=spNode(true)),c),spRnd()).catch(()=>{N.wpTry=0})}
function spGuest(N){   // guest: friends of the guest can find the game too
 if(N.host||N.wp||N.wpTry||N.dead)return;
 const pid=prAllowed()?spPidOf():'';if(!pid)return;
 N.wpTry=1;
 spBeacon(N,spBid(pid),c=>c.on('open',()=>{try{c.send(N.spid?{t:'sp-redir',to:N.spid}:{t:'sp-err',msg:'busy'})}catch(e){}spCloseSoon(c)}),null).catch(()=>{N.wpTry=0})}
setInterval(()=>{try{const N=NET;if(N&&!N.host&&!N.dead&&G&&$('game').style.display=='block'&&!(window.RP&&RP.on))spGuest(N)}catch(e){}},4000);

// ---------- friends list: which friends are in a game right now? (called by mm.js) ----------
// Connects to every friend's beacon id: it is only registered while that friend is in a game, and it answers the probe. Positive answers only.
let SPPR=null,SPPB=false;
function spProbePeer(){
 if(SPPR&&SPPR.p&&!SPPR.p.destroyed)return SPPR.ready;
 const o=SPPR={p:null,w:{}};
 o.ready=peerOpt().then(opt=>new Promise(res=>{
  const p=o.p=new(PeerC())(undefined,opt);
  p.on('open',()=>res(o));
  p.on('error',e=>{const m=/peer (\S+)/.exec(e&&e.message||''),w=m&&o.w[m[1]];if(w)w.dead=1;else if(!p.open)res(null)});
  p.on('disconnected',()=>{try{if(!p.destroyed)p.reconnect()}catch(x){}});
  setTimeout(()=>res(null),8000)}));
 return o.ready}
window.spProbe=async function(list){
 if(SPPB||!PeerC())return false;
 const fr=(list||[]).filter(p=>p&&/^[\w-]{3,40}$/.test(p.pid||'')&&!(p.live&&p.live.pid&&p.live.mode!='beacon')).slice(0,40);
 if(!fr.length)return false;
 SPPB=true;
 try{
  const o=await spProbePeer();if(!o)return false;
  o.w={};
  fr.forEach(p=>{const id=spBid(p.pid),w=o.w[id]={p,ok:0,dead:0};
   try{w.c=o.p.connect(id,{reliable:true,serialization:'json',metadata:{probe:1}});w.c.on('open',()=>{w.ok=1});w.c.on('error',()=>{})}catch(e){w.dead=1}});
  for(let t=0;t<24;t++){await new Promise(r=>setTimeout(r,250));if(Object.values(o.w).every(w=>w.ok||w.dead))break}
  let ch=false;
  for(const id in o.w){const w=o.w[id],was=!!(w.p.live&&w.p.live.mode=='beacon');
   const now=w.ok?true:w.dead?false:was;   // no answer yet: keep what we knew
   try{w.c&&w.c.close()}catch(e){}
   if(now&&!w.p.live)w.p.live={pid:id,mode:'beacon'};else if(!now&&was)w.p.live=null;
   if(now!=was)ch=true}
  return ch}
 finally{SPPB=false}};
addEventListener('pagehide',()=>{try{SPPR&&SPPR.p&&SPPR.p.destroy()}catch(e){}});
const spCloseSoon=c=>setTimeout(()=>{try{c.close()}catch(e){}},400);

/* ---------- hiding: spectators only ever see card backs in hands and decks ---------- */
const spHid=c=>({uid:c.uid,id:0});
// Spectators SEE both hands (the draw piles stay face-down). Ranked: an opponent could open a watch link on a second device and read your hand,
// so there the hands stay hidden. Set SP_HANDS_RANKED=true if you do not care.
const SP_HANDS_RANKED=false;
const spHH=N=>!!(N&&N.mm&&window.MM&&MM.cur&&MM.cur.mode=='ranked'&&!SP_HANDS_RANKED);
function spHide(f,hh){const s=f.s;
 return Object.assign({},f,{s:Object.assign({},s,{p:s.p.map(P=>Object.assign({},P,{hand:hh?P.hand.map(spHid):P.hand,deck:P.deck.map(spHid)}))})})}

/* ---------- a node of the tree (the host and every spectator use the same code) ---------- */
function spLast(T){
 if(T.root){const r=T.raw;return r?{g:r.g,n:r.n,meta:r.meta,f:spHide(r.f,T.hh)}:null}
 return T.last}
function spCount(T){
 const n=T.kids.reduce((a,k)=>a+k.cnt,0);
 if(T.root){if(T.tot!==n){T.tot=n;try{netSend({t:'spn',n})}catch(e){}spUI()}}
 else{T.cnt=n+1;clearTimeout(T.upT);T.upT=setTimeout(()=>{try{if(T.up&&T.up.open)T.up.send({t:'sp-up',c:T.cnt})}catch(e){}},400)}}
function spAccept(T,c){
 const md=c.metadata||{};
 c.on('open',()=>{
  const err=(msg,fatal)=>{try{c.send({t:'sp-err',msg,fatal:fatal?1:0})}catch(e){}spCloseSoon(c)};
  if(T.dead)return err('This room is closed.',1);
  if(md.v!==NETV||(md.x|0)!==spX())return err('Version mismatch - the room runs a different version of the game (or Legacy / current differs). Reload the page (Ctrl+F5) and check Extras -> Legacy.',1);
  if(!T.root&&!T.up)return err('busy');
  if(T.kids.length>=T.fan&&(md.h|0)<12){   // full: send the spectator one level down, to the child with the fewest viewers below it
   const bad=Array.isArray(md.bad)?md.bad:[],cand=T.kids.filter(k=>k.c.open&&!bad.includes(k.id)).sort((a,b)=>a.cnt-b.cnt)[0];
   if(cand){cand.cnt++;try{c.send({t:'sp-redir',to:cand.id})}catch(e){}spCloseSoon(c);return}}
  const k={c,id:c.peer,cnt:1};T.kids.push(k);
  c.on('data',m=>{if(m&&m.t=='sp-up'){k.cnt=Math.max(1,Math.min(1e7,+m.c||1));spCount(T)}});
  const gone=()=>{const i=T.kids.indexOf(k);if(i>=0){T.kids.splice(i,1);spCount(T)}};
  c.on('close',gone);c.on('error',gone);
  try{c.send(Object.assign({t:'sp-hi',tot:T.tot},spLast(T)||{g:0}))}catch(e){}
  spCount(T);
  if(T.root&&!T.hbI)T.hbI=setInterval(()=>spFwd(T,{t:'sp-hb',n:T.tot}),4000)})}

/* ---------- host side ---------- */
function spPush(f,r){   // called by replay.js for every captured frame
 const N=NET;if(!N||!N.host||!spOK(N))return;
 spStream(N);
 const T=N.sp||(N.sp=spNode(true));T.hh=spHH(N);
 T.raw={g:r.gid,n:r.fr.length,meta:Object.assign({},r.meta),f};
 if(T.kids.length){const m={t:'sp-f',g:T.raw.g,n:T.raw.n,f:spHide(f,T.hh)};if(T.raw.n==1)m.meta=T.raw.meta;spFwd(T,m)}}
function spHostStop(N){
 if(N&&N.wp){const w=N.wp;setTimeout(()=>{try{w.destroy()}catch(e){}},700)}
 const T=N&&N.sp;if(!T)return;T.dead=true;clearInterval(T.hbI);spFwd(T,{t:'sp-bye'});
 const ks=T.kids.slice();T.kids=[];setTimeout(()=>ks.forEach(k=>{try{k.c.close()}catch(e){}}),400)}
function spUI(){
 const b=$('spw');if(!b)return;
 const inGame=!!G&&$('game').style.display=='block'&&!(window.RP&&RP.on),N=NET;
 if(inGame&&N&&N.host&&spOK(N)){const n=N.sp?N.sp.tot:0;b.style.display='block';b.style.pointerEvents='';b.textContent='Watch'+(n?' '+n:'');b.title='Copy the spectator link ('+n+' watching)'}
 else if(inGame&&N&&!N.host&&N.spn>0){b.style.display='block';b.style.pointerEvents='none';b.textContent='Watch '+N.spn;b.title=''}
 else b.style.display='none'}
setInterval(spUI,1000);
$('spw').onclick=()=>{
 if(!NET||!NET.host)return;
 const id=spLinkId(NET);if(!id)return toast('Spectator link is being prepared - try again in a few seconds',1);
 const base=location.origin+location.pathname,url=!NET.mm&&!NET.qm&&NET.code?base+'?watch='+NET.code:base+'?watchid='+encodeURIComponent(id);   // matched games (ranked / friend / quick) have a different peer id than a room code
 (navigator.clipboard?navigator.clipboard.writeText(url).then(()=>toast('Spectator link copied - anyone can watch, there is no limit')).catch(()=>prompt('Copy this link:',url)):prompt('Copy this link:',url))};

/* ---------- spectator side ---------- */
const spRoot=S=>S.rid||NETPRE+S.code;
function spStop(){
 SPTK++;const S=SPEC;SPEC=null;if(!S)return;
 clearInterval(S.wd);clearTimeout(S.ct);clearTimeout(S.upT);
 S.kids.forEach(k=>{try{k.c.close()}catch(e){}});
 try{S.up&&S.up.close()}catch(e){}try{S.peer&&S.peer.destroy()}catch(e){}}
function spFatal(S,msg){
 if(SPEC!==S)return;
 if(S.started){S.ended=1;toast(msg,1);return}
 spStop();lobby('Watch a game',{join:1,nodeck:1,status:msg})}
function spFail(S){   // the node we tried to reach did not answer
 if(SPEC!==S||S.ended)return;
 if(S.target===spRoot(S)){
  if(++S.tries>=3)return spFatal(S,S.started?'The host has left the room.':S.rid?'That game is not running any more (or the host is not reachable).':'No room with that code (or the host is not reachable). Check the code and try again.');
  setTimeout(()=>spGo(S,spRoot(S)),1500)}
 else{if((S.rt=(S.rt|0)+1)>8)return spFatal(S,'That game is not running any more (or the host is not reachable).');
  S.bad.push(S.target);S.hop=0;setTimeout(()=>spGo(S,spRoot(S)),300)}}
function spLost(S){
 if(SPEC!==S||S.ended)return;
 toast('Connection to the stream lost - reconnecting...',1);S.hop=0;S.tries=0;
 setTimeout(()=>spGo(S,spRoot(S)),500+Math.random()*1500)}
function spGo(S,id){
 if(SPEC!==S||S.ended)return;
 S.target=id;
 const c=S.peer.connect(id,{reliable:true,serialization:'json',metadata:{spec:1,v:NETV,x:spX(),bad:S.bad.slice(-8),h:S.hop}});
 S.pend=c;clearTimeout(S.ct);
 S.ct=setTimeout(()=>{if(S.pend===c){S.pend=null;try{c.close()}catch(e){}spFail(S)}},12000);
 c.on('data',m=>spData(S,c,m));
 c.on('close',()=>{if(S.up===c){S.up=null;spLost(S)}else if(S.pend===c){S.pend=null;clearTimeout(S.ct);spFail(S)}});
 c.on('error',()=>{})}
function spData(S,c,m){
 if(!m||!m.t||SPEC!==S)return;
 switch(m.t){
  case'sp-redir':if(S.pend!==c||!m.to)break;S.pend=null;clearTimeout(S.ct);try{c.close()}catch(e){}S.hop++;spGo(S,String(m.to));break;
  case'sp-err':if(S.pend!==c)break;S.pend=null;clearTimeout(S.ct);try{c.close()}catch(e){}
   if(m.fatal)spFatal(S,m.msg||'Could not join.');else spFail(S);break;
  case'sp-hi':if(S.pend===c){S.pend=null;clearTimeout(S.ct);S.up=c;S.tries=0;S.hop=0;S.rt=0;S.bad=[];S.started=1;
    try{c.send({t:'sp-up',c:S.cnt})}catch(e){}}
   if(S.up===c){S.tot=m.tot|0;spIn(S,m)}break;
  case'sp-f':if(S.up===c)spIn(S,m);break;
  case'sp-hb':if(S.up===c){S.seen=Date.now();S.tot=m.n|0;spFwd(S,m);spMeta(S)}break;
  case'sp-bye':if(S.up===c){S.ended=1;spFwd(S,m);toast('The host closed the room.',1)}break}}
function spMeta(S){if(window.RP&&RP.on&&RP.live){if($('rplmeta'))$('rplmeta').textContent='Room  -  '+(S.tot||1)+' watching';$('sur').title='Leave  -  '+(S.tot||1)+' watching'}}
function spIn(S,m){
 S.seen=Date.now();
 if(!m.f){if(!S.view)$('ls').textContent='Connected. Waiting for the game to start...';return}
 if(m.meta)S.meta=m.meta;
 if(m.g!==S.g){S.g=m.g;S.n=0;S.view=0}   // a new game in the same room
 if(m.n<=S.n)return;
 S.n=m.n;S.last={g:m.g,n:m.n,meta:S.meta,f:m.f};
 spFwd(S,m.t=='sp-hi'?{t:'sp-f',g:m.g,n:m.n,meta:S.meta,f:m.f}:m);
 if(!S.view||!RP.on||!RP.live){
  S.view=1;S.fr=[m.f];$('lobby').style.display='none';
  rpStart({meta:Object.assign({},S.meta),frames:S.fr},true);spMeta(S)}
 else{S.fr.push(m.f);rpUI()}}
async function spJoin(code,rid){
 if(rid)code=rid.slice(NETPRE.length);   // joining by the host's full peer id (friend's profile, ?watchid=)
 else{code=(code||'').toUpperCase().replace(/[^A-Z0-9]/g,'');
  if(code.length!=5){lobby('Watch a game',{join:1,nodeck:1,status:'Enter the 5-character room code.'});return}}
 if(!PeerC())return lobby('Watch a game',{nodeck:1,status:'The networking library did not load. Reload the page and try again.'});
 netLeave(1);spStop();
 lobby('Watching '+code+'...',{nodeck:1,status:'Connecting...'});
 const tk=++SPTK,PEEROPT=await peerOpt();if(tk!==SPTK)return;
 const peer=new(PeerC())(undefined,PEEROPT);
 const S=SPEC=Object.assign(spNode(false),{peer,code,rid:rid||'',g:-1,n:0,fr:[],meta:null,bad:[],hop:0,tries:0,seen:Date.now(),up:null,pend:null,target:'',ended:0,started:0,view:0,last:null});
 S.wd=setInterval(()=>{if(SPEC===S&&S.up&&!S.ended&&Date.now()-S.seen>25000){const c=S.up;S.up=null;try{c.close()}catch(e){}spLost(S)}},5000);
 peer.on('open',()=>{if(SPEC===S)spGo(S,spRoot(S))});
 peer.on('connection',c=>{if(SPEC!==S){try{c.close()}catch(e){}return}spAccept(S,c)});
 peer.on('disconnected',()=>{try{if(SPEC===S&&!peer.destroyed)peer.reconnect()}catch(e){}});
 peer.on('error',e=>{if(SPEC!==S)return;
  if(e.type=='peer-unavailable'){if(S.pend){S.pend=null;clearTimeout(S.ct)}spFail(S)}
  else if(!S.started&&!S.up)spFatal(S,netErr(e))})}
function spLobby(code){
 netLeave();spStop();
 lobby('Watch a game',{join:1,nodeck:1,status:'Enter the room code of the game you want to watch. There is no limit on the number of spectators.'});
 $('lin').value=code||'';$('lin').focus()}

// lobby tweaks: the "Join" button becomes "Watch" while this screen is used for spectating
{const L0=window.lobby;window.lobby=function(t,o){SPM=/^Watch/.test(t);const r=L0.apply(this,arguments);$('lgo').textContent=SPM?'Watch':'Join';$('lin').maxLength=SPM?300:5;$('lin').placeholder=SPM?'ROOM CODE OR WATCH LINK':'ROOM CODE';return r}}
// the Watch box accepts a 5-character room code OR a whole pasted link (?watch=CODE / ?watchid=ID)
function spParse(v){v=String(v||'').trim();let m=/[?&]watchid=([\w-]{6,64})/.exec(v);if(m&&m[1].indexOf(NETPRE)==0)return{rid:m[1]};
 m=/[?&]watch=([A-Za-z0-9]{5})/.exec(v);if(m)return{code:m[1]};return{code:v}}
{const g0=$('lgo').onclick;$('lgo').onclick=function(e){if(SPM){startAudio();const q=spParse($('lin').value);spJoin(q.code,q.rid);return}return g0.call(this,e)}}
{const c0=$('lcancel').onclick;$('lcancel').onclick=function(e){spStop();return c0.call(this,e)}}
$('mspec').onclick=()=>{LB='frmenu';spLobby('')};
addEventListener('pagehide',()=>{try{spStop()}catch(e){}});
{const w=new URLSearchParams(location.search).get('watch');if(w){LB='frmenu';spLobby(w.toUpperCase().slice(0,5));spJoin(w)}}
{const q=new URLSearchParams(location.search),wi=q.get('watchid');if(!q.get('watch')&&wi&&/^[\w-]{6,64}$/.test(wi)&&wi.indexOf(NETPRE)==0){LB='frmenu';spJoin('',wi)}}

/* ---------- watching a friend (Friends list / player profile) ----------
   Needs the ranking server (mm.js, RJ_MM): while you are in a watchable game the client tells the server the id of the host's peer ("presence");
   the server shows it to your FRIENDS only (as `live:{pid,mode}` in /api/friends and /api/player), where mm.js turns it into a Watch button.
   Server API: POST /api/presence  {act:'set',pid,mode}  |  {act:'clear'}   (Bearer auth like every other call; the entry should expire after ~90 s). */
const prAllowed=()=>lsGet('rj_sp_fr')!=='0';
let PRS=null,PROFF=false;
const prPid=N=>{try{return N.host?spLinkId(N):(N.qm?'':(N.conn&&N.conn.peer))}catch(e){return''}};
function prSend(act,pid,mode,keep){
 const a=getAcct(),u=cfg();if(!a||!u||PROFF)return;
 try{fetch(u+'/api/presence',{method:'POST',keepalive:!!keep,headers:hdr(a),body:JSON.stringify(act=='set'?{act,pid,mode}:{act})})
  .then(r=>{if(r.status==404||r.status==405)PROFF=true}).catch(()=>{})}catch(e){}}
function prTick(){
 if(PROFF)return;
 const N=NET,inGame=!!G&&$('game').style.display=='block'&&!(window.RP&&RP.on);
 const pid=inGame&&N&&!N.dead&&spOK(N)&&prAllowed()?prPid(N):'';
 if(pid){if(!PRS||PRS.n!==N||PRS.pid!==pid||Date.now()-PRS.t>40000){PRS={n:N,pid,t:Date.now()};prSend('set',pid,N.mm?'friend':'room')}}
 else if(PRS){PRS=null;prSend('clear')}}
setInterval(prTick,5000);
addEventListener('pagehide',()=>{if(PRS){PRS=null;prSend('clear',0,0,true)}});
function spWatchPid(pid,back){
 if(!/^[\w-]{6,64}$/.test(pid)||pid.indexOf(NETPRE)!=0)return toast('That game is not available.',1);
 LB=back||'fdmenu';startAudio();spJoin('',pid)}
// the Friends list is refreshed while it is open, so Watch buttons appear / disappear by themselves
setInterval(()=>{try{if($('fdmenu').style.display=='flex'&&typeof friendsLoad=='function')friendsLoad()}catch(e){}},15000);
{const b=$('spfr');if(b){b.checked=prAllowed();b.onchange=()=>{lsSet('rj_sp_fr',b.checked?'1':'0');prTick()}}}
