// ===== ONLINE MATCHMAKING + RANKING (client for the Cloudflare Worker in server/) ============================
// Set the server address in net-config.js (window.RJ_MM = { url: 'https://....workers.dev' }).
// - Quick Match: casual queue on the server. If the server is not configured / unreachable, it falls back to the serverless peer-to-peer
//   queue in net.js (quickMatch), so the button always works.
// - Ranked: needs the server. Account = a secret key kept in this browser (export / import it in Ranked > Account to use it elsewhere).
// - The game itself is still peer-to-peer; the server only pairs players, gives both the same room code and records the agreed result.
(function(){
const cfg=()=>((window.RJ_MM||{}).url||'').replace(/\/+$/,'');
const MM=window.MM={cur:null,ws:null,tk:0,stop:null};
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const getAcct=()=>{try{const a=JSON.parse(lsGet('rj_acct'));return a&&a.uid&&a.key?a:null}catch(e){return null}};
const setAcct=a=>lsSet('rj_acct',a?JSON.stringify(a):'');
const hdr=a=>({'content-type':'application/json',authorization:'Bearer '+a.uid+'.'+a.key});
async function api(path,o,a,ms){o=o||{};const ac=new AbortController(),t=setTimeout(()=>ac.abort(),ms||8000);
 try{const r=await fetch(cfg()+path,{method:o.method||'GET',body:o.body?JSON.stringify(o.body):undefined,headers:a?hdr(a):{'content-type':'application/json'},signal:ac.signal});
  let b=null;try{b=await r.json()}catch(e){}if(!r.ok){const er=new Error((b&&b.error)||('HTTP '+r.status));er.status=r.status;throw er}return b}finally{clearTimeout(t)}}
async function ensureAcct(){let a=getAcct();if(a)return a;
 const r=await api('/api/register',{method:'POST',body:{name:myName()||''}});a={uid:r.uid,key:r.key,name:r.name};setAcct(a);return a}
const serverUp=async()=>{if(!cfg())return null;try{return await api('/api/ping',null,null,5000)}catch(e){return null}};

// ---------- searching ----------
function mmStop(){MM.tk++;clearInterval(MM.hb);clearInterval(MM.pg);const w=MM.ws;MM.ws=null;if(w){try{w.onclose=w.onerror=w.onmessage=null;w.close()}catch(e){}}}
const title=m=>m=='ranked'?'Ranked Match':'Quick Match';
async function mmSearch(mode){
 mmStop();netLeave();syncDecks();MM.cur=null;const tk=MM.tk,T=title(mode);window.QMNOTE='';
 const bail=msg=>{if(mode=='casual'){window.QMNOTE='  (Matchmaking server unavailable - searching peer-to-peer instead.)';quickMatch()}else lobby(T,{nodeck:1,status:msg})};
 lobby(T,{status:'Connecting to the matchmaking server...'});
 const up=await serverUp();if(tk!==MM.tk)return;if(!up)return bail('The ranked server is not reachable right now. Try again later, or use Quick Match.');
 let a;try{a=await ensureAcct()}catch(e){if(tk!==MM.tk)return;return bail('Could not create / verify your account: '+e.message)}
 if(tk!==MM.tk)return;
 let ws;try{ws=new WebSocket(cfg().replace(/^http/,'ws')+'/api/queue')}catch(e){return bail('Could not open a connection to the matchmaking server.')}
 MM.ws=ws;let matched=false,qn=null;
 const status=()=>{if(MM.tk===tk&&!matched)$('ls').textContent='Searching for an opponent'+(mode=='ranked'?' of similar rating (the range widens the longer you wait)':'')+'...'+(qn?'  '+qn+' searching now.':'')+'  Pick your deck while you wait.'};
 ws.onopen=()=>{ws.send(JSON.stringify({t:'join',uid:a.uid,key:a.key,mode,v:NETV}));MM.hb=setInterval(()=>{try{ws.send('ping')}catch(e){}},25000)};
 ws.onmessage=ev=>{if(ev.data==='pong'||MM.tk!==tk)return;let m;try{m=JSON.parse(ev.data)}catch(e){return}
  if(m.t=='queued'){status();MM.pg=setInterval(async()=>{const p=await serverUp();if(p&&MM.tk===tk){qn=p[mode];status()}},8000);serverUp().then(p=>{if(p&&MM.tk===tk){qn=p[mode];status()}})}
  else if(m.t=='match'){matched=true;clearInterval(MM.hb);clearInterval(MM.pg);MM.ws=null;try{ws.onclose=ws.onerror=null;ws.close()}catch(e){}startMatch(m,tk)}
  else if(m.t=='err'){matched=true;mmStop();if(m.code=='auth'){setAcct(null);lobby(T,{nodeck:1,status:'Your account was not recognised. Press Cancel and try again (a new account will be created).'})}else lobby(T,{nodeck:1,status:m.msg||'Server error.'})}};
 const lost=()=>{if(MM.tk!==tk||matched)return;mmStop();bail('Lost connection to the matchmaking server.')};
 ws.onclose=ws.onerror=lost}

// ---------- connecting the matched pair (peer-to-peer, room code decided by the server) ----------
function startMatch(m,tk){
 MM.cur={id:m.id,mode:m.mode,opp:m.opp};const T=title(m.mode);
 lobby(T,{nodeck:1,status:'Opponent found: '+m.opp.name+(m.mode=='ranked'?' ('+m.opp.rating+')':'')+' - connecting...'});
 (m.role=='host'?mmHost:mmGuest)(m.code,tk)}
const PID=code=>NETPRE+'M'+code;
function mmFail(msg){const c=MM.cur;MM.cur=null;if(c&&c.mode=='ranked'&&c.id){const a=getAcct();if(a)api('/api/report',{method:'POST',body:{id:c.id,r:'abort'}},a).catch(()=>{})}
 netLeave(1);lobby(c?title(c.mode):'Match',{nodeck:1,status:msg+' Press Cancel to go back.'})}
async function mmHost(code,tk){
 const PEEROPT=await peerOpt();if(tk!==MM.tk)return;
 const peer=new(PeerC())(PID(code),PEEROPT);
 const N=NET={host:true,mm:1,mirror:false,peer,code,conn:null,ev:[],mull:[0,0],pref:[null,null],rm:[0,0],pre:null,dead:false};
 N.to=setTimeout(()=>{if(NET===N)mmFail('Your opponent did not connect.')},45000);
 peer.on('connection',c=>{if(NET!==N)return;if(N.conn){c.close();return}N.conn=c;wire(N,c);c.on('open',()=>clearTimeout(N.to))});
 peer.on('disconnected',()=>{try{if(NET===N&&!peer.destroyed)peer.reconnect()}catch(e){}});
 peer.on('error',e=>{if(NET===N)mmFail('Connection problem: '+(e&&e.type||'unknown')+'.')})}
async function mmGuest(code,tk){
 const PEEROPT=await peerOpt();if(tk!==MM.tk)return;
 const peer=new(PeerC())(undefined,PEEROPT),N=NET={host:false,mm:1,peer,code,conn:null,tries:0};
 N.to=setTimeout(()=>{if(NET===N)mmFail('Could not connect to your opponent.')},45000);
 const go=()=>{if(NET!==N)return;N.dead=false;N.opened=0;const c=peer.connect(PID(code),{reliable:true,serialization:'json'});N.conn=c;wire(N,c);c.on('open',()=>{N.opened=1})};
 N.retry=()=>{if(NET!==N||N.opened)return;if(++N.tries>14)return mmFail('Could not connect to your opponent.');clearTimeout(N.rt);N.rt=setTimeout(go,1500)};
 peer.on('open',go);
 peer.on('error',e=>{if(NET!==N)return;if(e&&e.type=='peer-unavailable')N.retry();else mmFail('Connection problem: '+(e&&e.type||'unknown')+'.')})}
// called from onClose (net.js) when a matched connection drops BEFORE the game started
window.mmLost=N=>{if(NET!==N)return;if(!N.host&&!N.opened&&N.retry)return N.retry();mmFail('Your opponent left before the game started.')};

// ---------- end of a ranked game: report, then show the rating change ----------
window.mmEnd=async()=>{
 const c=MM.cur;if(!c||c.mode!='ranked'||!c.id||!G||!G.over||G.mmDone||!NET)return;G.mmDone=1;MM.cur=null;
 $('ovr').style.display='none';$('ovd').style.display='none';   // no rematch in ranked: each game is its own match
 const box=$('ovmm'),say=t=>{if(box)box.textContent=t},a=getAcct(),o=G.over,r=o.draw?'draw':o.win==0?'win':'loss';
 if(!a)return;say('Submitting result...');
 try{let st=await api('/api/report',{method:'POST',body:{id:c.id,r}},a);
  for(let i=0;i<40&&st.st=='open';i++){say('Waiting for your opponent\'s report...');await new Promise(x=>setTimeout(x,4000));st=await api('/api/match?id='+encodeURIComponent(c.id),null,a)}
  if(st.st=='done')say('Rating: '+st.rating+'  ('+(st.delta>=0?'+':'')+st.delta+')');
  else if(st.st=='unrated')say('Not rated: you have played this opponent too often today.');
  else if(st.st=='void')say('This result was not counted (the two reports did not match).');
  else say('Result is still being processed.')}
 catch(e){say('Could not reach the ranking server - this result was not recorded.')}};

// ---------- Ranked panel ----------
const rk=id=>document.getElementById(id);
async function rkOpen(){
 openPanel('rkmenu');rk('rkacct').style.display='none';rk('rklist').innerHTML='';rk('rkme').textContent='';rk('rkplay').disabled=true;
 if(!cfg()){rk('rksub').textContent='The ranking server is not configured for this copy of the game (see server/README.md).';return}
 rk('rksub').textContent='Connecting...';const up=await serverUp();
 if(!up){rk('rksub').textContent='The ranking server is not reachable right now.';return}
 rk('rksub').textContent=(up.ranked||0)+' searching for a ranked game right now.';rk('rkplay').disabled=false;
 try{const a=getAcct(),[me,lb]=await Promise.all([a?api('/api/me',{method:'POST'},a):null,api('/api/leaderboard?limit=50')]);
  if(me)rk('rkme').innerHTML='<b>'+esc(me.name)+'</b><span>Rating '+me.rating+'</span><span>'+(me.rank?'Rank #'+me.rank:'Unranked - play a game')+'</span><span>'+me.wins+'W / '+me.losses+'L'+(me.draws?' / '+me.draws+'D':'')+'</span>';
  else rk('rkme').innerHTML='<span>You get an account automatically when you play your first game.</span>';
  rk('rklist').innerHTML=lb.length?lb.map(p=>'<div class="rkr'+(me&&p.name==me.name&&p.rating==me.rating?' me':'')+'"><i>'+p.rank+'</i><b>'+esc(p.name)+'</b><span>'+p.rating+'</span><small>'+p.wins+'W '+p.losses+'L</small></div>').join(''):'<div class="rkr"><b>No ranked games have been played yet.</b></div>'}
 catch(e){if(e.status==401){setAcct(null);rk('rkme').textContent='Your saved account was not recognised by the server; a new one is created when you next play.'}else rk('rksub').textContent='Could not load the ranking: '+e.message}}
function acctOpen(){const box=rk('rkacct'),a=getAcct();box.style.display=box.style.display=='flex'?'none':'flex';
 rk('rkname').value=a?a.name:myName();rk('rkxfer').value=a?a.uid+'.'+a.key:'';rk('rkxfer').type='password';rk('rkshow').textContent='Show';rk('rkamsg').textContent=a?'':'No account yet - one is created automatically when you play your first Ranked or Quick Match game.'}
rk('rkopen').onclick=rkOpen;rk('rkback').onclick=closePanels;
rk('rkplay').onclick=()=>{LB='rkmenu';startAudio();mmSearch('ranked')};
rk('rkacc').onclick=acctOpen;
rk('rkshow').onclick=()=>{const x=rk('rkxfer'),s=x.type=='password';x.type=s?'text':'password';rk('rkshow').textContent=s?'Hide':'Show'};
rk('rkcopy').onclick=()=>{const v=rk('rkxfer').value;if(!v)return;try{navigator.clipboard.writeText(v).then(()=>rk('rkamsg').textContent='Transfer code copied.',()=>{rk('rkxfer').type='text';rk('rkxfer').select()})}catch(e){rk('rkxfer').type='text';rk('rkxfer').select()}};
rk('rksave').onclick=async()=>{const a=getAcct(),n=cleanName(rk('rkname').value).trim();if(!n)return;lsSet('rj_name',n);$('pname').value=n;
 if(!a){rk('rkamsg').textContent='Name saved.';return}
 try{const p=await api('/api/rename',{method:'POST',body:{name:n}},a);a.name=p.name;setAcct(a);rk('rkamsg').textContent='Name saved.';rkOpen();rk('rkacct').style.display='flex'}catch(e){rk('rkamsg').textContent='Could not save: '+e.message}};
rk('rkimp').onclick=async()=>{const v=rk('rkimpin').value.trim(),m=/^([a-z0-9]{6,12})\.([A-Za-z0-9_-]{20,64})$/.exec(v);if(!m){rk('rkamsg').textContent='That is not a valid transfer code.';return}
 try{const a={uid:m[1],key:m[2]},p=await api('/api/me',{method:'POST'},a);a.name=p.name;setAcct(a);lsSet('rj_name',p.name);$('pname').value=p.name;rk('rkimpin').value='';rkOpen();rk('rkamsg').textContent='Account imported: '+p.name}
 catch(e){rk('rkamsg').textContent='Import failed: '+(e.status==401?'code not recognised.':e.message)}};

// ---------- Quick Match button (friend menu) ----------
$('mquick').onclick=async()=>{LB='frmenu';startAudio();window.QMNOTE='';if(!cfg())return quickMatch();mmSearch('casual')};
// Cancel: also stop the server search
{const oc=$('lcancel').onclick;$('lcancel').onclick=()=>{mmStop();MM.cur=null;window.QMNOTE='';oc()}}
})();
