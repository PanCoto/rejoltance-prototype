const NETPRE='rejoltance-',ALPH='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const NETV=(()=>{let h=5381;const s=JSON.stringify(CARDS);for(let i=0;i<s.length;i++)h=((h<<5)+h+s.charCodeAt(i))|0;return'v1-'+(h>>>0).toString(36)})();
const STUN_ICE=[{urls:['stun:stun.l.google.com:19302','stun:stun1.l.google.com:19302','stun:stun.cloudflare.com:3478','stun:global.stun.twilio.com:3478']}];
// Last resort only: a shared public relay that may be rate-limited or discontinued. See net-config.js.
const SHARED_TURN=[{urls:['turn:openrelay.metered.ca:80','turn:openrelay.metered.ca:443','turn:openrelay.metered.ca:443?transport=tcp','turns:openrelay.metered.ca:443?transport=tcp'],username:'openrelayproject',credential:'openrelayproject'}];
let NETTK=0,iceCache=null;const NETDIAG={relay:null};
const turnUrl=()=>{const c=window.RJ_TURN||{},m=c.metered;
 return c.url||(m&&m.app&&m.apiKey?'https://'+encodeURIComponent(m.app)+'.metered.live/api/v1/turn/credentials?apiKey='+encodeURIComponent(m.apiKey):'')};
async function loadIce(){
 if(Array.isArray(window.RJ_ICE)&&window.RJ_ICE.length)return window.RJ_ICE;
 if(iceCache&&Date.now()<iceCache.exp)return iceCache.v;
 let extra=[];const url=turnUrl();
 if(url){const ctl=new AbortController(),t=setTimeout(()=>ctl.abort(),6000);
  try{const r=await fetch(url,{signal:ctl.signal,cache:'no-store'});if(!r.ok)throw new Error('HTTP '+r.status);
   const j=await r.json();extra=(Array.isArray(j)?j:Array.isArray(j.iceServers)?j.iceServers:j.iceServers?[j.iceServers]:[]).filter(x=>x&&x.urls)}
  catch(e){console.warn('TURN credential fetch failed, falling back',e)}finally{clearTimeout(t)}}
 const v=STUN_ICE.concat(extra.length?extra:SHARED_TURN);
 if(extra.length)iceCache={v,exp:Date.now()+10*60*1000};
 return v}
async function peerOpt(){const ice=await loadIce();
 return Object.assign({config:{iceServers:ice,iceCandidatePoolSize:4}},window.RJ_PEER||{})}
// Checks whether a relay candidate can be obtained. Without one, two players behind strict NATs
// (mobile data, eduroam) cannot connect.
function probeRelay(ice){return new Promise(res=>{let pc,fin=false;const r={relay:false};
 const done=()=>{if(fin)return;fin=true;NETDIAG.relay=r.relay;try{pc&&pc.close()}catch(e){}res(r)};
 try{pc=new RTCPeerConnection({iceServers:ice})}catch(e){return done()}
 pc.onicecandidate=e=>{if(!e.candidate)return done();
  const t=e.candidate.type||((/ typ (\w+)/.exec(e.candidate.candidate)||[])[1]);if(t=='relay'){r.relay=true;done()}};
 try{pc.createDataChannel('p');pc.createOffer().then(o=>pc.setLocalDescription(o)).catch(done)}catch(e){done()}
 setTimeout(done,7000)})}
const NORELAY=' No relay server is reachable, so players on mobile data or campus Wi-Fi (eduroam) may fail to connect. See net-config.js.';
const PeerC=()=>window.Peer||(window.peerjs&&window.peerjs.Peer);
const netSend=m=>{try{if(NET&&NET.conn&&NET.conn.open)NET.conn.send(m)}catch(e){console.warn('send failed',e)}};
const newCode=()=>{const a=new Uint32Array(5);crypto.getRandomValues(a);return[...a].map(x=>ALPH[x%ALPH.length]).join('')};
const startAudio=()=>musicStart();

const flipLog=s=>String(s).replace(/^(You|Enemy)\b/,m=>m=='You'?'Enemy':'You');
const mev=e=>{const x=Object.assign({},e);if(x.o!=null)x.o=1-x.o;if(x.h!=null)x.h=1-x.h;if(x.us)x.us=x.us.map(y=>Object.assign({},y,{o:1-y.o}));return x};
function snap(G){
 const uc=u=>{if(!u)return null;const x=Object.assign({},u);delete x.d;x.kw=[...u.kw];x.o=1-u.o;return x};
 const hid=c=>({uid:c.uid,id:0}),cp=c=>Object.assign({},c);
 const side=(p,own)=>({ac:own?p.ac:{un:[]},fk:p.ac?p.ac.fk:0,i:1-p.i,hp:p.hp,mhp:p.mhp,mb:p.mb,b:p.b,gb:p.gb,sp:p.sp,sc:p.sc,fat:p.fat||0,
  hand:own?p.hand.map(cp):p.hand.map(hid),
  deck:own?shuf(p.deck.map(cp)):p.deck.map(hid),
  disc:p.disc.map(cp),ln:p.ln.map(uc)});
 return JSON.parse(JSON.stringify({mir:G.mir,turn:G.turn,step:G.step,allow:G.allow,act:G.act==null?null:1-G.act,start:1-G.start,
  over:G.over?{win:G.over.draw?-1:1-G.over.win,draw:G.over.draw,sur:G.over.sur,left:G.over.left}:null,
  log:G.log.slice(-60).map(flipLog),hist:G.hist.slice(-80).map(h=>({p:1-h.p,t:h.t,id:h.id,tg:h.tg})),
  p:[side(G.p[1],1),side(G.p[0],0)]}))}
function unsnap(s,ev){s.p.forEach(p=>p.ln.forEach(u=>{if(u){u.kw=new Set(u.kw);u.d=CD[u.id]}}));s.ev=ev||[];s.q=null;return s}
function netPush(x){if(!NET||!NET.host||!G)return;
 const m=Object.assign({t:'st',s:snap(G),ev:NET.ev.map(mev)},x||{});NET.ev=[];netSend(m)}
const descr=v=>Array.isArray(v)?{m:v.map(u=>u.uid)}:typeof v=='number'?{n:v}:v&&v.h?{h:v.p}:v&&v.kw?{u:v.uid}:{c:v.uid};
const armSync=()=>{if(!NET)return;clearTimeout(NET.syncT);NET.syncT=setTimeout(()=>netSend({t:'sync'}),3500)};
// The online guest chooses targets for their own effects that the engine parked in G.pq (summons, transforms, evolving, Echo Chamber, Dual Wield's 2nd cast).
// Host -> guest {t:'ask',d,xu}: the (pseudo) card and the uid of the unit it belongs to. Guest runs the normal pick flow and answers {t:'askAns',pk}.
// No answer in time -> [] -> the engine picks whatever is missing, like it did before.
function askRemote(it){return new Promise(res=>{
 if(!NET||!NET.host||NET.dead||!NET.conn||!NET.conn.open){res([]);return}
 netPush();
 const d=JSON.parse(JSON.stringify(Object.assign({},it.d,{ExU:undefined}))),xu=it.d.ExU?it.d.ExU.uid:0,p=G.p[1],sp=it.d.Type=='Spell';
 let t=0;
 const fin=pk=>{clearTimeout(t);if(NET){NET.ask=null;NET.asking=0}say('');res(pk)};
 NET.ask={res:raw=>{   // resolve + validate what the guest sent
  const pk=[];
  for(const o of Array.isArray(raw)?raw:[]){
   const ks=apicks(G,p,it.d,pk,null),k=ks[pk.length];if(!k)break;
   const v=o&&o.h!=null?H(1-o.h):o?resolvePick(G,p,null,o):undefined;
   if(v==null)break;
   if(['e','f','a','eh','S'].includes(k)&&typeof v=='object'&&!v.h&&!req(G,p,k,ks.f[pk.length]||null,null,sp,it.d.ExU).includes(v))break;
   if(k=='L'&&!req(G,p,'L',null,pk.filter((_,j)=>ks[j]=='L')).includes(v))break;
   if(k=='P'&&!(v>=0&&v<4))break;
   pk.push(v)}
  fin(pk)}};
 NET.asking=1;say('Opponent is choosing a target...');
 t=setTimeout(()=>{if(NET&&NET.ask)fin([])},(15+TM_GRACE+2)*1000);
 netSend({t:'ask',d,xu})})}
function askPre(i,opts){return new Promise(res=>{NET.pre={opts,res};netSend({t:'pre',i});
 setTimeout(()=>{if(NET&&NET.pre&&NET.pre.res===res){NET.pre=null;res(null)}},(PRE_SEC+TM_GRACE)*1000)})}   // no answer in time -> null -> the engine picks the target itself

function syncDecks(){syncPickers();pkReveal('pkl')}
let LB='frmenu';// panel that Cancel returns to
function lobby(title,o){o=o||{};['frmenu','mirmenu','rkmenu','botmenu','setmenu','achmenu','acctmenu','avpick','fdmenu'].forEach(k=>{const e=$(k);if(e)e.style.display='none'});$('lt').textContent=title;$('lcode').textContent=o.code||'';$('lcode').style.display=o.code?'block':'none';
 $('lin').style.display=o.join?'block':'none';$('lgo').style.display=o.join?'':'none';$('lcopy').style.display=o.code?'':'none';
 $('ldrow').style.display=o.nodeck?'none':'flex';$('ls').textContent=o.status||'';
 $('lmatch').style.display=o.match?'flex':'none';$('lready').style.display=o.match?'':'none';$('lobby').classList.toggle('mm',!!o.match);$('lobby').style.display='flex'}
const netErr=e=>({'network':'Could not reach the matchmaking server. Check your internet connection.','server-error':'The matchmaking server returned an error. Try again in a moment.',
 'socket-error':'Lost connection to the matchmaking server.','socket-closed':'Lost connection to the matchmaking server.','browser-incompatible':'This browser does not support WebRTC.',
 'webrtc':'Could not establish a connection between the two devices (a firewall or network may be blocking it, and the relay server may be busy). Try again, or see README (TURN server).'}[e&&e.type]||('Connection problem: '+((e&&(e.type||e.message))||'unknown')));
function netLeave(keepLobby){const N=NET;NET=null;NETTK++;
 tmStop();mtStop();
 if(N){clearTimeout(N.to);clearTimeout(N.syncT);clearTimeout(N.mT);clearTimeout(N.pT);try{N.conn&&N.conn.close()}catch(e){}try{N.peer&&N.peer.destroy()}catch(e){}}
 if(!keepLobby)$('lobby').style.display='none'}

// Matched games (ranked / quick match via the server): the deck is only sent / read once the player presses Ready (mm.js), so it can be changed until then.
function guestHello(N){if(NET!==N||N.hi)return;N.hi=1;pkResolve();netSend({t:'hello',v:NETV,name:myName(),deck:ALL[$('d0').value].c});lobby('Connected',{status:'Waiting for the host to start the game...',nodeck:1})}
function wire(N,c){
 c.on('open',()=>{if(NET!==N)return;if(!N.host){clearTimeout(N.to);N.up=1;if(N.mm&&!N.lr)return;guestHello(N)}});
 c.on('data',m=>{if(NET!==N||!m||!m.t)return;N.host?hostMsg(m):guestMsg(m)});
 c.on('close',()=>onClose(N));c.on('error',()=>onClose(N))}
async function hostRoom(mirror){mirror=!!mirror;
 if(!PeerC())return lobby('Online play unavailable',{nodeck:1,status:'The networking library did not load. Reload the page and try again.'});
 netLeave();syncDecks();lobby('Creating room...',{nodeck:mirror,status:'Contacting the matchmaking server...'});
 const tk=NETTK,PEEROPT=await peerOpt();if(tk!==NETTK)return;
 const open=n=>{const code=newCode(),peer=new(PeerC())(NETPRE+code,PEEROPT);
  const N=NET={host:true,mirror,peer,code,conn:null,ev:[],mull:[0,0],pref:[null,null],rm:[0,0],pre:null,dead:false};
  peer.on('open',()=>{if(NET!==N)return;const st='Waiting for your opponent... send them the code or the invite link.';lobby('Your room code',{code,nodeck:mirror,status:st});
   probeRelay(PEEROPT.config.iceServers).then(r=>{if(NET===N&&!N.conn&&!r.relay&&$('ls').textContent==st)$('ls').textContent=st+NORELAY})});
  peer.on('connection',c=>{if(NET!==N)return;
   if(N.conn&&N.conn.open){c.on('open',()=>{c.send({t:'full'});setTimeout(()=>c.close(),300)});return}
   N.conn=c;wire(N,c)});
  peer.on('disconnected',()=>{try{if(NET===N&&!peer.destroyed)peer.reconnect()}catch(e){}});
  peer.on('error',e=>{if(NET!==N)return;
   if(e.type=='unavailable-id'&&n<6){try{peer.destroy()}catch(x){}open(n+1)}else lobby('Could not create room',{nodeck:1,status:netErr(e)})})};
 open(0)}
let JM=false;
function joinLobby(code,mirror){JM=!!mirror;netLeave();syncDecks();lobby('Join a room',{join:1,nodeck:mirror,status:mirror?'Enter the room code and press Join. Both players get the same deck.':'Pick your deck, enter the room code and press Join.'});$('lin').value=code||'';$('lin').focus()}
async function joinRoom(code){
 code=(code||'').toUpperCase().replace(/[^A-Z0-9]/g,'');
 if(code.length!=5){lobby('Join a room',{join:1,status:'Enter the 5-character room code.'});return}
 if(!PeerC())return lobby('Online play unavailable',{nodeck:1,status:'The networking library did not load. Reload the page and try again.'});
 netLeave(1);lobby('Joining '+code+'...',{nodeck:1,status:'Connecting...'});
 const tk=NETTK,PEEROPT=await peerOpt();if(tk!==NETTK)return;
 const peer=new(PeerC())(undefined,PEEROPT),N=NET={host:false,peer,code,conn:null};
 probeRelay(PEEROPT.config.iceServers);
 const fail=m=>{if(NET!==N)return;netLeave(1);lobby('Could not join',{join:1,status:m})};
 peer.on('open',()=>{if(NET!==N)return;const c=peer.connect(NETPRE+code,{reliable:true,serialization:'json'});N.conn=c;wire(N,c);
  N.to=setTimeout(()=>fail('Could not connect to that room (timed out). Check the code and that the host is still waiting.'+(NETDIAG.relay===false?NORELAY:' If you are on a different network, a firewall may be blocking the connection - try again or switch Wi-Fi / mobile data.')),35000)});
 peer.on('error',e=>fail(e.type=='peer-unavailable'?'No room with that code. Check the code and try again.':netErr(e)))}
function onClose(N){if(NET!==N||N.dead)return;N.dead=true;clearTimeout(N.syncT);
 if(N.pre){N.pre.res(N.pre.opts[0]);N.pre=null}
 if(N.ask){const a=N.ask;N.ask=null;a.res([])}
 const inGame=G&&$('game').style.display=='block';
 if(inGame){if(!G.over){G.over={win:0,left:1};say('');$('mul').style.display='none';$('hist').style.display='none';$('modal').style.display='none';pend=sel=null;castMode=false}
  $('ovr').style.display='none';busy=false;render();finish();return}
 if(N.mm){mmLost(N);return}
 if(N.qm){qmAgain();return}
 if(N.host){N.conn=null;N.dead=false;lobby('Your room code',{code:N.code,nodeck:N.mirror,status:'Your opponent left. Waiting for someone to join...'})}
 else{netLeave(1);lobby('Disconnected',{join:1,status:'The connection to the host was lost.'})}}
const okDeck=dk=>Array.isArray(dk)&&dk.length>=10&&dk.length<=60&&dk.every(id=>CD[id]&&id<900);
function rematch(){if(!NET||NET.dead)return;
 $('ovd').style.display='none';$('dkpick').style.display='none';
 if(NET.host){NET.rm[0]=1;if(NET.rm[1])hostStart();else{$('ovr').textContent='Waiting for opponent...';netSend({t:'rm'})}}
 else{pkResolve();netSend({t:'rm',deck:ALL[$('d0').value].c});$('ovr').textContent='Waiting for opponent...'}}

const HQ=[];let hrun=false;
function hostMsg(m){
 if(m.t=='askAns'){const a=NET.ask;if(a){NET.ask=null;a.res(m.pk)}return}   // handled right away: the move handler that is waiting for it is still running in the queue
 if(m.t=='preAns'){const p=NET.pre;if(p){NET.pre=null;p.res(m.u===-1?null:(p.opts.find(u=>u.uid==m.u)||p.opts[0]))}return}
 HQ.push(m);if(!hrun)hpump()}
async function hpump(){hrun=true;while(HQ.length&&NET){const m=HQ.shift();try{await hostHandle(m)}catch(e){console.error('net',e)}}hrun=false}
function hostGo(){if(!NET||!NET.host||!NET.deckG)return;NET.hp=0;NET.deckH=ALL[$('d0').value].c.slice();hostStart()}
function hostStart(){
 pkResolve();musicNewGame();
 NET.deckH=ALL[$('d0').value].c.slice();
 let go=null;if(NET.mirror){const m=mirrorDeck();NET.deckH=m.slice();NET.deckG=m.slice();go={mir:1}}
 gid++;G=newGame(NET.deckH,NET.deckG,go);busy=true;sel=pend=null;castMode=false;stickyZoom=false;
 NET.mull=[0,0];NET.pref=[null,null];NET.rm=[0,0];NET.ev=[];NET.pre=null;NET.ask=null;NET.asking=0;
 ['lobby','ov','hist','modal'].forEach(k=>$(k).style.display='none');$('ovr').style.display='';$('ovr').textContent='Rematch';
 show('game');say('');render();showMul();netSend({t:'start',name:myName(),s:snap(G)});
 clearTimeout(NET.mT);clearTimeout(NET.pT);NET.mT=setTimeout(hostForceMull,(MULL_SEC+TM_GRACE)*1000)}
// A guest that stays silent on the mulligan screen: keep their hand / pick first or second at random, so the game cannot be stalled there.
function hostForceMull(){if(!NET||!NET.host||!G||G.turn!=0||NET.mull[1])return;mulligan(G,G.p[1],[]);NET.mull[1]=1;netPush();armPref();tryBegin()}
function armPref(){if(!NET||!NET.host)return;clearTimeout(NET.pT);
 NET.pT=setTimeout(()=>{if(!NET||!NET.host||!G||G.turn!=0||NET.pref[1])return;NET.pref[1]=Math.random()<.5?'first':'second';tryBegin()},(ORDER_SEC+TM_GRACE)*1000)}
function tryBegin(){if(!NET.mull[0]||!NET.mull[1]||!NET.pref[0]||!NET.pref[1])return;decideStart(G,NET.pref[0],NET.pref[1]);startRound(G);render();anim();flow()}
async function hostHandle(m){
 switch(m.t){
 case'hello':{
  if(m.v!==NETV){netSend({t:'err',msg:'Version mismatch - the card data differs. Both players should reload the page (Ctrl+F5) and try again.'});break}
  const dk=m.deck;if(!okDeck(dk)){netSend({t:'err',msg:'Your deck is not valid.'});break}
  OPN=cleanName(m.name).trim();NET.deckG=dk.map(Number);if(NET.mm&&!NET.lr){NET.hp=1;break}hostGo();break}
 case'mull':{if(!G||G.turn!=0||NET.mull[1])break;
  mulligan(G,G.p[1],(m.ids||[]).filter(u=>G.p[1].hand.some(c=>c.uid==u)));NET.mull[1]=1;netPush();armPref();tryBegin();break}
 case'pref':{if(!G||G.turn!=0||NET.pref[1]||(m.v!='first'&&m.v!='second'))break;NET.pref[1]=m.v;tryBegin();break}
 case'move':{
  if(!G||G.over||G.act!==1||G.step>=3){netPush();break}
  const p=G.p[1],c=p.hand[m.ci],ln=m.ln;
  if(!c||!(ln==null||(Number.isInteger(ln)&&ln>=0&&ln<4))||!canPlay(G,p,m.ci,ln==null?null:ln)){netPush();break}
  const d=CD[c.id],sp=d.Type=='Spell';
  const pk=(m.pk||[]).map(o=>o&&o.h!=null?H(1-o.h):o?resolvePick(G,p,null,o):undefined);
  busy=true;
  await flyCard(c.id,heroFrom(),sp?centerRect():slotRect(1,ln),{out:sp,dur:sp?480:380,hold:300,fc:cost(G,p,c),ba:c.ba});
  if(!G||G.over)break;
  const ok=play(G,p,m.ci,ln==null?null:ln,pk);render();anim();
  netPush(ok?{fly:{id:c.id,sp:sp?1:0,ln,by:1}}:{});
  if(ok&&G.pq&&G.pq.length)await askPending(gid);break}
 case'end':{if(!G||G.over||G.act!==1||G.step>=3){netPush();break}if(m.to)L(G,'Enemy ran out of time');nextStep(G);flow();break}
 case'sur':{if(!G||G.over)break;G.over={win:0,sur:1};L(G,'Enemy surrendered');pend=null;sel=null;castMode=false;say('');
  ['mul','hist','modal'].forEach(k=>$(k).style.display='none');render();netPush();break}
 case'rm':{if(!G||!G.over)break;if(okDeck(m.deck))NET.deckG=m.deck.map(Number);
  NET.rm[1]=1;if(NET.rm[0])hostStart();else $('ovr').textContent='Rematch (opponent ready)';break}
 case'sync':netPush();break}}

const NQ=[];let nrun=false;
function guestMsg(m){NQ.push(m);if(!nrun)gpump()}
async function gpump(){nrun=true;
 while(NQ.length&&NET){const m=NQ.shift();try{await guestHandle(m)}catch(e){console.error('net',e)}}
 nrun=false;if(NET&&G){busy=false;render()}}
async function guestHandle(m){
 switch(m.t){
 case'start':
  OPN=cleanName(m.name).trim();gid++;G=unsnap(m.s);busy=true;sel=pend=null;castMode=false;stickyZoom=false;
  ['lobby','ov','hist','modal'].forEach(k=>$(k).style.display='none');$('ovr').style.display='';$('ovr').textContent='Rematch';
  musicNewGame();show('game');say('');render();showMul();startAudio();break;
 case'st':{clearTimeout(NET.syncT);busy=true;
  if(m.fly&&m.fly.by==0)await flyCard(m.fly.id,heroFrom(),m.fly.sp?centerRect():slotRect(1,m.fly.ln),{out:!!m.fly.sp,dur:m.fly.sp?480:380,hold:300,fc:m.fly.fc,ba:m.fly.ba});
  G=unsnap(m.s,m.ev);sel=pend=null;castMode=false;
  if(NET.ao){const f=NET.ao;NET.ao=null;askOrder(f)}
  say(G.over?'':G.turn==0?'Waiting for opponent...':G.step>=3?'Combat!':G.act==1?'Opponent: '+PH[G.allow]+'...':'');
  render();anim();break}
 case'lane':{busy=true;flash=m.i;render();
  await strikeLane(m.i);G=unsnap(m.s,m.ev);flash=-1;render();anim();recoil();await sleep((m.ev||[]).some(x=>x.k=='atk'&&x.post)?1150:650);break}
 case'ask':{busy=true;const d=m.d;d.ExU=m.xu?units(G.p[0]).concat(units(G.p[1])).find(u=>u.uid==m.xu)||null:null;
  sel=pend=null;castMode=false;render();
  const pk=await askExt({d});netSend({t:'askAns',pk:(pk||[]).map(descr)});say('');render();break}
 case'pre':{busy=true;flash=m.i;render();const u=await choosePre(G.p[0].ln[m.i]);netSend({t:'preAns',u:u?u.uid:-1});say('Combat!');render();break}
 case'rm':if($('ovr').textContent=='Rematch')$('ovr').textContent='Rematch (opponent ready)';break;
 case'full':case'err':{if(m.t=='full'&&NET.qm){qmAgain();break}const msg=m.t=='full'?'That room already has two players.':m.msg;netLeave(1);lobby('Could not join',{join:1,nodeck:JM,status:msg});break}}}

$('mhost').onclick=()=>{LB='frmenu';startAudio();hostRoom(false)};
$('mjoin').onclick=()=>{LB='frmenu';joinLobby('')};
$('lgo').onclick=()=>{startAudio();joinRoom($('lin').value)};
$('lin').addEventListener('keydown',e=>{if(e.key=='Enter')$('lgo').click()});
$('lcancel').onclick=()=>{netLeave();$(LB).style.display='flex'};
$('lcopy').onclick=()=>{if(!NET||!NET.code)return;const url=location.origin+location.pathname+'?room='+NET.code;
 (navigator.clipboard?navigator.clipboard.writeText(url).then(()=>{$('ls').textContent='Invite link copied. Send it to your opponent.'}).catch(()=>prompt('Copy this link:',url)):prompt('Copy this link:',url))};
addEventListener('pagehide',()=>{try{NET&&NET.conn&&NET.conn.close()}catch(e){}});
{const r=new URLSearchParams(location.search).get('room');if(r)joinLobby(r.toUpperCase().slice(0,5))}

// ===== QUICK MATCH (serverless matchmaking) ==========================================================
// No backend: everybody who presses Quick Match first tries to register ONE well-known PeerJS id (derived from the card-data version, so only
// compatible clients meet). If the id is free you are "in the queue" and wait as host. If it is taken, someone is waiting: you join them.
// As soon as a match is connected the host drops its signalling link (peer.disconnect(); the game connection stays alive), which frees the id
// for the next searching player. Lost races (host just got taken / left) simply retry after a short random delay.
let QMN=0;
const qmCode=()=>{let h=0;for(const ch of NETV)h=(h*31+ch.charCodeAt(0))>>>0;return'Q'+ALPH[h%32]+ALPH[(h>>5)%32]+'MM'};
const qmLobby=st=>lobby('Quick Match',{status:st+(window.QMNOTE||'')});
function quickMatch(){
 if(!PeerC())return lobby('Online play unavailable',{nodeck:1,status:'The networking library did not load. Reload the page and try again.'});
 netLeave();syncDecks();QMN=0;qmLobby('Searching for an opponent...');qmStep()}
function qmAgain(){netLeave(1);const tk=NETTK;
 if(++QMN>10)return lobby('Quick Match',{nodeck:1,status:'Could not find a match right now. Press Cancel and try again in a moment.'});
 qmLobby('Searching for an opponent...');setTimeout(()=>{if(tk===NETTK)qmStep()},300+Math.random()*900)}
async function qmStep(){
 const tk=NETTK,code=qmCode(),PEEROPT=await peerOpt();if(tk!==NETTK)return;
 const peer=new(PeerC())(NETPRE+code,PEEROPT);
 const N=NET={host:true,qm:1,mirror:false,peer,code,conn:null,ev:[],mull:[0,0],pref:[null,null],rm:[0,0],pre:null,dead:false};
 peer.on('open',()=>{if(NET!==N)return;QMN=0;
  const st='In the queue - waiting for an opponent. Pick your deck while you wait.';qmLobby(st);
  probeRelay(PEEROPT.config.iceServers).then(r=>{if(NET===N&&!N.conn&&!r.relay&&$('ls').textContent==st)$('ls').textContent=st+NORELAY})});
 peer.on('connection',c=>{if(NET!==N)return;
  if(N.conn){c.on('open',()=>{c.send({t:'full'});setTimeout(()=>c.close(),300)});return}
  N.conn=c;wire(N,c);
  c.on('open',()=>{if(NET!==N)return;N.matched=1;try{peer.disconnect()}catch(e){}})});   // free the queue id for the next player
 peer.on('disconnected',()=>{try{if(NET===N&&!N.matched&&!peer.destroyed)peer.reconnect()}catch(e){}});
 peer.on('error',e=>{if(NET!==N)return;
  if(e.type=='unavailable-id'){try{peer.destroy()}catch(x){}qmJoin(tk)}
  else lobby('Could not start Quick Match',{nodeck:1,status:netErr(e)})})}
async function qmJoin(tk){
 if(tk!==NETTK)return;
 const PEEROPT=await peerOpt();if(tk!==NETTK)return;
 const code=qmCode(),peer=new(PeerC())(undefined,PEEROPT),N=NET={host:false,qm:1,peer,code,conn:null};
 qmLobby('Opponent found, connecting...');
 peer.on('open',()=>{if(NET!==N)return;const c=peer.connect(NETPRE+code,{reliable:true,serialization:'json'});N.conn=c;wire(N,c);
  N.to=setTimeout(()=>{if(NET===N)qmAgain()},12000)});
 peer.on('error',e=>{if(NET!==N)return;
  if(e.type=='peer-unavailable')qmAgain();else{netLeave(1);lobby('Quick Match',{nodeck:1,status:netErr(e)})}})}
$('mquick').onclick=()=>{LB='frmenu';startAudio();quickMatch()};
