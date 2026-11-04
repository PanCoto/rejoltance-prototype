const NETPRE='rejoltance-',ALPH='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const NETV=(()=>{let h=5381;const s=JSON.stringify(CARDS);for(let i=0;i<s.length;i++)h=((h<<5)+h+s.charCodeAt(i))|0;return'v1-'+(h>>>0).toString(36)})();
const ICE=window.RJ_ICE||[
 {urls:['stun:stun.l.google.com:19302','stun:stun1.l.google.com:19302','stun:stun.cloudflare.com:3478','stun:global.stun.twilio.com:3478']},
 {urls:['stun:openrelay.metered.ca:80','turn:openrelay.metered.ca:80','turn:openrelay.metered.ca:443','turn:openrelay.metered.ca:443?transport=tcp','turns:openrelay.metered.ca:443?transport=tcp'],username:'openrelayproject',credential:'openrelayproject'}];
const PEEROPT=Object.assign({config:{iceServers:ICE,iceCandidatePoolSize:4}},window.RJ_PEER||{});
const PeerC=()=>window.Peer||(window.peerjs&&window.peerjs.Peer);
const netSend=m=>{try{if(NET&&NET.conn&&NET.conn.open)NET.conn.send(m)}catch(e){console.warn('send failed',e)}};
const newCode=()=>{const a=new Uint32Array(5);crypto.getRandomValues(a);return[...a].map(x=>ALPH[x%ALPH.length]).join('')};
const startAudio=()=>musicStart();

const flipLog=s=>String(s).replace(/^(You|Enemy)\b/,m=>m=='You'?'Enemy':'You');
const mev=e=>{const x=Object.assign({},e);if(x.o!=null)x.o=1-x.o;if(x.h!=null)x.h=1-x.h;if(x.us)x.us=x.us.map(y=>Object.assign({},y,{o:1-y.o}));return x};
function snap(G){
 const uc=u=>{if(!u)return null;const x=Object.assign({},u);delete x.d;x.kw=[...u.kw];x.o=1-u.o;return x};
 const hid=c=>({uid:c.uid,id:0}),cp=c=>Object.assign({},c);
 const side=(p,own)=>({i:1-p.i,hp:p.hp,mb:p.mb,b:p.b,gb:p.gb,sp:p.sp,sc:p.sc,fat:p.fat||0,
  hand:own?p.hand.map(cp):p.hand.map(hid),
  deck:own?shuf(p.deck.map(cp)):p.deck.map(hid),
  disc:p.disc.map(cp),ln:p.ln.map(uc)});
 return JSON.parse(JSON.stringify({turn:G.turn,step:G.step,allow:G.allow,act:G.act==null?null:1-G.act,start:1-G.start,
  over:G.over?{win:1-G.over.win,sur:G.over.sur,left:G.over.left}:null,
  log:G.log.slice(-60).map(flipLog),hist:G.hist.slice(-80).map(h=>({p:1-h.p,t:h.t,id:h.id,tg:h.tg})),
  p:[side(G.p[1],1),side(G.p[0],0)]}))}
function unsnap(s,ev){s.p.forEach(p=>p.ln.forEach(u=>{if(u){u.kw=new Set(u.kw);u.d=CD[u.id]}}));s.ev=ev||[];s.q=null;return s}
function netPush(x){if(!NET||!NET.host||!G)return;
 const m=Object.assign({t:'st',s:snap(G),ev:NET.ev.map(mev)},x||{});NET.ev=[];netSend(m)}
const descr=v=>Array.isArray(v)?{m:v.map(u=>u.uid)}:typeof v=='number'?{n:v}:v&&v.h?{h:v.p}:v&&v.kw?{u:v.uid}:{c:v.uid};
const armSync=()=>{if(!NET)return;clearTimeout(NET.syncT);NET.syncT=setTimeout(()=>netSend({t:'sync'}),3500)};
function askPre(i,opts){return new Promise(res=>{NET.pre={opts,res};netSend({t:'pre',i});
 setTimeout(()=>{if(NET&&NET.pre&&NET.pre.res===res){NET.pre=null;res(opts[0])}},90000)})}

function syncDecks(){syncPickers();pkReveal('pkl')}
function lobby(title,o){o=o||{};$('frmenu').style.display='none';$('lt').textContent=title;$('lcode').textContent=o.code||'';$('lcode').style.display=o.code?'block':'none';
 $('lin').style.display=o.join?'block':'none';$('lgo').style.display=o.join?'':'none';$('lcopy').style.display=o.code?'':'none';
 $('ldrow').style.display=o.nodeck?'none':'flex';$('ls').textContent=o.status||'';$('lobby').style.display='flex'}
const netErr=e=>({'network':'Could not reach the matchmaking server. Check your internet connection.','server-error':'The matchmaking server returned an error. Try again in a moment.',
 'socket-error':'Lost connection to the matchmaking server.','socket-closed':'Lost connection to the matchmaking server.','browser-incompatible':'This browser does not support WebRTC.',
 'webrtc':'Could not establish a connection between the two devices (a firewall or network may be blocking it, and the relay server may be busy). Try again, or see README (TURN server).'}[e&&e.type]||('Connection problem: '+((e&&(e.type||e.message))||'unknown')));
function netLeave(keepLobby){const N=NET;NET=null;
 if(N){clearTimeout(N.to);clearTimeout(N.syncT);try{N.conn&&N.conn.close()}catch(e){}try{N.peer&&N.peer.destroy()}catch(e){}}
 if(!keepLobby)$('lobby').style.display='none'}

function wire(N,c){
 c.on('open',()=>{if(NET!==N)return;if(!N.host){clearTimeout(N.to);netSend({t:'hello',v:NETV,name:myName(),deck:ALL[$('d0').value].c});lobby('Connected',{status:'Waiting for the host to start the game...',nodeck:1})}});
 c.on('data',m=>{if(NET!==N||!m||!m.t)return;N.host?hostMsg(m):guestMsg(m)});
 c.on('close',()=>onClose(N));c.on('error',()=>onClose(N))}
function hostRoom(){
 if(!PeerC())return lobby('Online play unavailable',{nodeck:1,status:'The networking library did not load. Reload the page and try again.'});
 netLeave();syncDecks();lobby('Creating room...',{status:'Contacting the matchmaking server...'});
 const open=n=>{const code=newCode(),peer=new(PeerC())(NETPRE+code,PEEROPT);
  const N=NET={host:true,peer,code,conn:null,ev:[],mull:[0,0],pref:[null,null],rm:[0,0],pre:null,dead:false};
  peer.on('open',()=>{if(NET===N)lobby('Your room code',{code,status:'Waiting for your opponent... send them the code or the invite link.'})});
  peer.on('connection',c=>{if(NET!==N)return;
   if(N.conn&&N.conn.open){c.on('open',()=>{c.send({t:'full'});setTimeout(()=>c.close(),300)});return}
   N.conn=c;wire(N,c)});
  peer.on('disconnected',()=>{try{if(NET===N&&!peer.destroyed)peer.reconnect()}catch(e){}});
  peer.on('error',e=>{if(NET!==N)return;
   if(e.type=='unavailable-id'&&n<6){try{peer.destroy()}catch(x){}open(n+1)}else lobby('Could not create room',{nodeck:1,status:netErr(e)})})};
 open(0)}
function joinLobby(code){netLeave();syncDecks();lobby('Join a room',{join:1,status:'Pick your deck, enter the room code and press Join.'});$('lin').value=code||'';$('lin').focus()}
function joinRoom(code){
 code=(code||'').toUpperCase().replace(/[^A-Z0-9]/g,'');
 if(code.length!=5){lobby('Join a room',{join:1,status:'Enter the 5-character room code.'});return}
 if(!PeerC())return lobby('Online play unavailable',{nodeck:1,status:'The networking library did not load. Reload the page and try again.'});
 netLeave(1);lobby('Joining '+code+'...',{nodeck:1,status:'Connecting...'});
 const peer=new(PeerC())(undefined,PEEROPT),N=NET={host:false,peer,code,conn:null};
 const fail=m=>{if(NET!==N)return;netLeave(1);lobby('Could not join',{join:1,status:m})};
 peer.on('open',()=>{if(NET!==N)return;const c=peer.connect(NETPRE+code,{reliable:true,serialization:'json'});N.conn=c;wire(N,c);
  N.to=setTimeout(()=>fail('Could not connect to that room (timed out). Check the code and that the host is still waiting. If you are on a different network, a firewall may be blocking the connection - try again or switch Wi-Fi / mobile data.'),35000)});
 peer.on('error',e=>fail(e.type=='peer-unavailable'?'No room with that code. Check the code and try again.':netErr(e)))}
function onClose(N){if(NET!==N||N.dead)return;N.dead=true;clearTimeout(N.syncT);
 if(N.pre){N.pre.res(N.pre.opts[0]);N.pre=null}
 const inGame=G&&$('game').style.display=='block';
 if(inGame){if(!G.over){G.over={win:0,left:1};say('');$('mul').style.display='none';$('hist').style.display='none';$('modal').style.display='none';pend=sel=null;castMode=false}
  $('ovr').style.display='none';busy=false;render();finish();return}
 if(N.host){N.conn=null;N.dead=false;lobby('Your room code',{code:N.code,status:'Your opponent left. Waiting for someone to join...'})}
 else{netLeave(1);lobby('Disconnected',{join:1,status:'The connection to the host was lost.'})}}
const okDeck=dk=>Array.isArray(dk)&&dk.length>=10&&dk.length<=60&&dk.every(id=>CD[id]&&id<900);
function rematch(){if(!NET||NET.dead)return;
 $('ovd').style.display='none';$('dkpick').style.display='none';
 if(NET.host){NET.rm[0]=1;if(NET.rm[1])hostStart();else{$('ovr').textContent='Waiting for opponent...';netSend({t:'rm'})}}
 else{netSend({t:'rm',deck:ALL[$('d0').value].c});$('ovr').textContent='Waiting for opponent...'}}

const HQ=[];let hrun=false;
function hostMsg(m){
 if(m.t=='preAns'){const p=NET.pre;if(p){NET.pre=null;p.res(p.opts.find(u=>u.uid==m.u)||p.opts[0])}return}
 HQ.push(m);if(!hrun)hpump()}
async function hpump(){hrun=true;while(HQ.length&&NET){const m=HQ.shift();try{await hostHandle(m)}catch(e){console.error('net',e)}}hrun=false}
function hostStart(){
 NET.deckH=ALL[$('d0').value].c.slice();
 gid++;G=newGame(NET.deckH,NET.deckG);busy=true;sel=pend=null;castMode=false;stickyZoom=false;
 NET.mull=[0,0];NET.pref=[null,null];NET.rm=[0,0];NET.ev=[];NET.pre=null;
 ['lobby','ov','hist','modal'].forEach(k=>$(k).style.display='none');$('ovr').style.display='';$('ovr').textContent='Rematch';
 show('game');say('');render();showMul();netSend({t:'start',name:myName(),s:snap(G)})}
function tryBegin(){if(!NET.mull[0]||!NET.mull[1]||!NET.pref[0]||!NET.pref[1])return;decideStart(G,NET.pref[0],NET.pref[1]);startRound(G);render();anim();flow()}
async function hostHandle(m){
 switch(m.t){
 case'hello':{
  if(m.v!==NETV){netSend({t:'err',msg:'Version mismatch - the card data differs. Both players should reload the page (Ctrl+F5) and try again.'});break}
  const dk=m.deck;if(!okDeck(dk)){netSend({t:'err',msg:'Your deck is not valid.'});break}
  OPN=cleanName(m.name).trim();NET.deckG=dk.map(Number);NET.deckH=ALL[$('d0').value].c.slice();hostStart();break}
 case'mull':{if(!G||G.turn!=0||NET.mull[1])break;
  mulligan(G,G.p[1],(m.ids||[]).filter(u=>G.p[1].hand.some(c=>c.uid==u)));NET.mull[1]=1;netPush();tryBegin();break}
 case'pref':{if(!G||G.turn!=0||NET.pref[1]||(m.v!='first'&&m.v!='second'))break;NET.pref[1]=m.v;tryBegin();break}
 case'move':{
  if(!G||G.over||G.act!==1||G.step>=3){netPush();break}
  const p=G.p[1],c=p.hand[m.ci],ln=m.ln;
  if(!c||!(ln==null||(Number.isInteger(ln)&&ln>=0&&ln<4))||!canPlay(G,p,m.ci,ln==null?null:ln)){netPush();break}
  const d=CD[c.id],sp=d.Type=='Spell';
  const pk=(m.pk||[]).map(o=>o&&o.h!=null?H(1-o.h):o?resolvePick(G,p,null,o):undefined);
  busy=true;
  await flyCard(c.id,heroFrom(),sp?centerRect():slotRect(1,ln),{out:sp,dur:sp?480:380,hold:300});
  if(!G||G.over)break;
  const ok=play(G,p,m.ci,ln==null?null:ln,pk);render();anim();
  netPush(ok?{fly:{id:c.id,sp:sp?1:0,ln,by:1}}:{});break}
 case'end':{if(!G||G.over||G.act!==1||G.step>=3){netPush();break}nextStep(G);flow();break}
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
  show('game');say('');render();showMul();startAudio();break;
 case'st':{clearTimeout(NET.syncT);busy=true;
  if(m.fly&&m.fly.by==0)await flyCard(m.fly.id,heroFrom(),m.fly.sp?centerRect():slotRect(1,m.fly.ln),{out:!!m.fly.sp,dur:m.fly.sp?480:380,hold:300});
  G=unsnap(m.s,m.ev);sel=pend=null;castMode=false;
  if(NET.ao){const f=NET.ao;NET.ao=null;askOrder(f)}
  say(G.over?'':G.turn==0?'Waiting for opponent...':G.step>=3?'Combat!':G.act==1?'Opponent: '+PH[G.allow]+'...':'');
  render();anim();break}
 case'lane':{busy=true;flash=m.i;render();
  await strikeLane(m.i);G=unsnap(m.s,m.ev);flash=-1;render();anim();recoil();await sleep((m.ev||[]).some(x=>x.k=='atk'&&x.post)?1150:650);break}
 case'pre':{busy=true;flash=m.i;render();const u=await choosePre(G.p[0].ln[m.i]);netSend({t:'preAns',u:u.uid});say('Combat!');render();break}
 case'rm':if($('ovr').textContent=='Rematch')$('ovr').textContent='Rematch (opponent ready)';break;
 case'full':case'err':{const msg=m.t=='full'?'That room already has two players.':m.msg;netLeave(1);lobby('Could not join',{join:1,status:msg});break}}}

$('mhost').onclick=()=>{startAudio();hostRoom()};
$('mjoin').onclick=()=>joinLobby('');
$('lgo').onclick=()=>{startAudio();joinRoom($('lin').value)};
$('lin').addEventListener('keydown',e=>{if(e.key=='Enter')$('lgo').click()});
$('lcancel').onclick=()=>{netLeave();$('frmenu').style.display='flex'};
$('lcopy').onclick=()=>{if(!NET||!NET.code)return;const url=location.origin+location.pathname+'?room='+NET.code;
 (navigator.clipboard?navigator.clipboard.writeText(url).then(()=>{$('ls').textContent='Invite link copied. Send it to your opponent.'}).catch(()=>prompt('Copy this link:',url)):prompt('Copy this link:',url))};
addEventListener('pagehide',()=>{try{NET&&NET.conn&&NET.conn.close()}catch(e){}});
{const r=new URLSearchParams(location.search).get('room');if(r)joinLobby(r.toUpperCase().slice(0,5))}
