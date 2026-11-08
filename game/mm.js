// ===== ONLINE MATCHMAKING + RANKING (client for the Cloudflare Worker in server/) ============================
// Set the server address in net-config.js (window.RJ_MM = { url: 'https://....workers.dev' }).
// - Quick Match: casual queue on the server. If the server is not configured / unreachable, it falls back to the serverless peer-to-peer
//   queue in net.js (quickMatch), so the button always works.
// - Ranked: needs the server. Account = a secret key kept in this browser (export / import it in Ranked > Account to use it elsewhere).
// - The game itself is still peer-to-peer; the server only pairs players, gives both the same room code and records the agreed result.
(function(){
const cfg=()=>((window.RJ_MM||{}).url||'').replace(/\/+$/,'');
const MM=window.MM={cur:null,ws:null,tk:0,stop:null};
const rk=id=>document.getElementById(id);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const getAcct=()=>{try{const a=JSON.parse(lsGet('rj_acct'));return a&&a.uid&&a.key?a:null}catch(e){return null}};
const setAcct=a=>lsSet('rj_acct',a?JSON.stringify(a):'');
const hdr=a=>({'content-type':'application/json',authorization:'Bearer '+a.uid+'.'+a.key});
async function api(path,o,a,ms){o=o||{};const ac=new AbortController(),t=setTimeout(()=>ac.abort(),ms||8000);
 try{const r=await fetch(cfg()+path,{method:o.method||'GET',body:o.body?JSON.stringify(o.body):undefined,headers:a?hdr(a):{'content-type':'application/json'},signal:ac.signal});
  let b=null;try{b=await r.json()}catch(e){}if(!r.ok){const er=new Error((b&&b.error)||('HTTP '+r.status));er.status=r.status;throw er}return b}finally{clearTimeout(t)}}
async function ensureAcct(){let a=getAcct();if(a)return a;
 const r=await api('/api/register',{method:'POST',body:{name:myName()||''}});a={uid:r.uid,key:r.key,name:r.name};setAcct(a);return a}
const serverUp=async()=>{if(!cfg())return null;try{return MM.srv=await api('/api/ping',null,null,5000)}catch(e){return null}};

// ---------- searching ----------
function mmStop(){MM.tk++;clearInterval(MM.hb);clearInterval(MM.pg);clearInterval(MM.chp);clearInterval(MM.cd);clearInterval(MM.el);const w=MM.ws;MM.ws=null;if(w){try{w.onclose=w.onerror=w.onmessage=null;w.close()}catch(e){}}}
const title=m=>m=='ranked'?'Ranked Match':m=='friend'?'Friend Challenge':'Quick Match';
async function mmSearch(mode){
 mmStop();netLeave();syncDecks();MM.cur=null;const tk=MM.tk,T=title(mode);window.QMNOTE='';
 const bail=msg=>{if(mode=='casual'){window.QMNOTE='  (Matchmaking server unavailable - searching peer-to-peer instead.)';quickMatch()}else lobby(T,{nodeck:1,status:msg})};
 lobby(T,{status:'Connecting to the matchmaking server...'});
 const up=await serverUp();if(tk!==MM.tk)return;if(!up)return bail('The ranked server is not reachable right now. Try again later, or use Quick Match.');
 let a;try{a=await ensureAcct()}catch(e){if(tk!==MM.tk)return;return bail('Could not create / verify your account: '+e.message)}
 if(tk!==MM.tk)return;
 let ws;try{ws=new WebSocket(cfg().replace(/^http/,'ws')+'/api/queue')}catch(e){return bail('Could not open a connection to the matchmaking server.')}
 MM.ws=ws;let matched=false,qn=null;
 const status=()=>{if(MM.tk!==tk||matched)return;const s=Math.floor((Date.now()-(MM.t0||Date.now()))/1000),mm=Math.floor(s/60)+':'+String(s%60).padStart(2,'0'),r=MM.me&&MM.me.rating;
  $('ls').innerHTML='<b class="lsm">Searching  '+mm+'</b>'+(mode=='ranked'?'Looking for '+(r!=null?'a player rated '+r+' &plusmn; '+(75+20*s):'a player of similar rating')+' - the range widens the longer you wait.':'')+(qn?' '+qn+' searching now.':'')+'<span class="lsh">You can change your deck now. Once a match is found you get a few seconds to adjust it and press Ready.</span>'};
 ws.onopen=()=>{ws.send(JSON.stringify({t:'join',uid:a.uid,key:a.key,mode,v:NETV}));MM.hb=setInterval(()=>{try{ws.send('ping')}catch(e){}},25000)};
 ws.onmessage=ev=>{if(ev.data==='pong'||MM.tk!==tk)return;let m;try{m=JSON.parse(ev.data)}catch(e){return}
  if(m.t=='queued'){MM.t0=Date.now();status();MM.el=setInterval(status,1000);MM.pg=setInterval(async()=>{const p=await serverUp();if(p&&MM.tk===tk){qn=p[mode];status()}},8000);serverUp().then(p=>{if(p&&MM.tk===tk){qn=p[mode];status()}})}
  else if(m.t=='match'){matched=true;clearInterval(MM.hb);clearInterval(MM.pg);clearInterval(MM.el);MM.ws=null;try{ws.onclose=ws.onerror=null;ws.close()}catch(e){}startMatch(m,tk)}
  else if(m.t=='err'){matched=true;mmStop();if(m.code=='auth'){setAcct(null);lobby(T,{nodeck:1,status:'Your account was not recognised. Press Cancel and try again (a new account will be created).'})}else lobby(T,{nodeck:1,status:m.msg||'Server error.'})}};
 const lost=()=>{if(MM.tk!==tk||matched)return;mmStop();bail('Lost connection to the matchmaking server.')};
 ws.onclose=ws.onerror=lost}

// ---------- connecting the matched pair (peer-to-peer, room code decided by the server) ----------
const MATCH_SEC=30;   // time to change the deck and press Ready once an opponent has been found (auto-ready at 0)
function startMatch(m,tk){
 MM.cur={id:m.id,mode:m.mode,opp:m.opp,deck:'',rt0:MM.me&&MM.me.rating!=null?MM.me.rating:null};const T=title(m.mode),ranked=m.mode=='ranked',me=MM.me,n=dispName();
 lobby(T+' - match found',{match:1,status:''});$('lready').disabled=false;
 $('lmav0').innerHTML=avHTML(MM.me&&MM.me.avatar&&CD[MM.me.avatar]?MM.me.avatar:avId(),n);$('lmn0').textContent=n||'Playerzacy';
 $('lmr0').textContent=ranked&&me&&me.rating!=null?me.rating+' - '+tierOf(me.rating).n:'';
 $('lmav1').innerHTML=avHTML(0,m.opp.name);$('lmn1').textContent=m.opp.name;$('lmr1').textContent=ranked&&m.opp.rating!=null?m.opp.rating+' - '+tierOf(m.opp.rating).n:'';
 try{sfx('unitPlayed',{pitch:0})}catch(e){}
 const end=Date.now()+MATCH_SEC*1000;
 const tick=()=>{if(MM.tk!==tk){clearInterval(MM.cd);return}const left=Math.max(0,end-Date.now());
  $('lbari').style.width=(100*left/(MATCH_SEC*1000))+'%';$('lbar').classList.toggle('low',left<8000);
  $('ls').innerHTML='<b class=\"lsm\">'+Math.ceil(left/1000)+' s</b>Change your deck if you want, then press <b>Ready</b>. The game starts when both players are ready (or when the time runs out).';
  if(left<=0)mmReady(tk)};
 tick();MM.cd=setInterval(tick,250);
 (m.role=='host'?mmHost:mmGuest)(m.code,tk)}
// Ready (button or timeout): locks the deck. net.js only sends / reads the deck from here on.
function mmReady(tk){
 if(MM.tk!==tk||!MM.cur)return;clearInterval(MM.cd);$('lready').disabled=true;
 const N=NET;if(!N||!N.mm){setTimeout(()=>mmReady(tk),200);return}   // connection object not created yet
 if(N.lr)return;N.lr=1;const c=MM.cur;c.deck=PKR.d0?'Random deck':(ALL[$('d0').value]||{}).n||'';
 const up=N.host?!!(N.conn&&N.conn.open):!!N.up;
 lobby(title(c.mode),{nodeck:1,status:'Deck locked: '+c.deck+'.  '+(up?'Waiting for '+c.opp.name+' to be ready...':'Connecting to '+c.opp.name+'...')});
 if(N.host){if(N.hp)hostGo()}else if(N.up)guestHello(N)}
$('lready').onclick=()=>{if(MM.cur)mmReady(MM.tk)};
const PID=code=>NETPRE+'M'+code;
function mmFail(msg){const c=MM.cur;MM.cur=null;clearInterval(MM.chp);MM.chid=null;if(c&&c.mode=='ranked'&&c.id){const a=getAcct();if(a)api('/api/report',{method:'POST',body:{id:c.id,r:'abort'}},a).catch(()=>{})}
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
  if(st.st=='done'){const t0=tierOf(c.rt0!=null?c.rt0:st.rating-st.delta),t1=tierOf(st.rating);
  say('Rating: '+st.rating+'  ('+(st.delta>=0?'+':'')+st.delta+')'+(t1.n!=t0.n?'  -  '+(st.rating>=(c.rt0!=null?c.rt0:st.rating-st.delta)?'Promoted to ':'Dropped to ')+t1.n:''));
  histAdd({u:a.uid,t:Date.now(),r,d:st.delta,rt:st.rating,on:c.opp&&c.opp.name||'',or:c.opp&&c.opp.rating,dk:c.deck||''});meLoad().then(chipRefresh)}
  else if(st.st=='unrated')say('Not rated: you have played this opponent too often today.');
  else if(st.st=='void')say('This result was not counted (the two reports did not match).');
  else say('Result is still being processed.')}
 catch(e){say('Could not reach the ranking server - this result was not recorded.')}};

// ---------- avatars (a card's art; kept in this browser and, when the server supports it, on the account) ----------
const avId=()=>{const v=+lsGet('rj_avatar')||0;return v&&CD[v]?v:0};
const avHTML=(id,name)=>id&&CD[id]?'<img src="'+artSrc(id)+'" alt="" draggable="false" onerror="artErr(this,'+(+id)+')">':'<i>'+esc((name||'?').trim().charAt(0).toUpperCase()||'?')+'</i>';
const dispName=()=>{const a=getAcct();return myName()||(a&&a.name)||''};
const setMyName=n=>{lsSet('rj_name',n)};
function chipRefresh(){const me=MM.me,n=dispName();rk('pchipn').textContent=n||'Playerzacy';
 rk('pchips').textContent=me&&me.rating!=null?'Rating '+me.rating+(me.rank?'  -  #'+me.rank:''):'Your profile';
 rk('pchipav').innerHTML=avHTML(MM.me&&MM.me.avatar&&CD[MM.me.avatar]?MM.me.avatar:avId(),n)}
async function meLoad(){const a=getAcct();if(!a||!cfg())return null;
 try{const me=await api('/api/me',{method:'POST'},a);if(me&&me.avatar&&CD[me.avatar])lsSet('rj_avatar',String(me.avatar));MM.me=me;return me}
 catch(e){if(e.status==401){setAcct(null);MM.me=null}return null}}
const needDc=()=>!!(MM.srv&&MM.srv.needDiscord);   // the server decides (REQUIRE_DISCORD) and enforces it too
const ago=t=>{if(!t)return 'a while ago';const s=(Date.now()-t)/1000;return s<180?'Active now':s<3600?Math.floor(s/60)+' min ago':s<86400?Math.floor(s/3600)+' h ago':Math.floor(s/86400)+' d ago'};

// ---------- tiers + personal ranked history (history is kept in this browser, per account) ----------
const TIERS=[{n:'Bronze',min:0,c:'#c8803f'},{n:'Silver',min:950,c:'#b9c2cc'},{n:'Gold',min:1100,c:'#f0c040'},{n:'Platinum',min:1250,c:'#4fd6c8'},{n:'Diamond',min:1400,c:'#6aa8ff'},{n:'Champion',min:1550,c:'#ff4a50'}];
function tierOf(r){r=+r||0;let i=0;TIERS.forEach((t,k)=>{if(r>=t.min)i=k});const t=TIERS[i],nx=TIERS[i+1]||null;
 return{n:t.n,c:t.c,next:nx,left:nx?nx.min-r:0,pct:nx?Math.max(0,Math.min(100,100*(r-t.min)/(nx.min-t.min))):100}}
const HK='rj_rhist';
function hist(){const a=getAcct();if(!a)return[];try{return(JSON.parse(lsGet(HK)||'[]')||[]).filter(h=>h&&h.u==a.uid)}catch(e){return[]}}
function histAdd(h){try{const all=JSON.parse(lsGet(HK)||'[]')||[];all.push(h);lsSet(HK,JSON.stringify(all.slice(-150)))}catch(e){}}
function hstats(me){const h=hist();let run=0,best=0;h.forEach(x=>{if(x.r=='win'){run++;best=Math.max(best,run)}else run=0});
 let cur=0,ct='';if(h.length){ct=h[h.length-1].r;for(let i=h.length-1;i>=0&&h[i].r==ct;i--)cur++}
 const dk={};h.forEach(x=>{if(x.dk&&x.dk!='Random deck')dk[x.dk]=(dk[x.dk]||0)+1});const fav=Object.keys(dk).sort((a,b)=>dk[b]-dk[a])[0]||'';
 const peak=Math.max(me&&me.rating||0,...h.map(x=>x.rt||0)),opp=h.filter(x=>x.or!=null);
 return{h,n:h.length,cur,ct,best,fav,peak,avgOpp:opp.length?Math.round(opp.reduce((t,x)=>t+x.or,0)/opp.length):0}}
const fmtDate=t=>{if(!t)return'-';try{return new Date(t).toLocaleDateString(undefined,{year:'numeric',month:'short',day:'numeric'})}catch(e){return'-'}};
const pct=(w,g)=>g?Math.round(100*w/g)+'%':'-';
function spark(vals){if(vals.length<2)return'';const W=300,H=56,mn=Math.min(...vals),mx=Math.max(...vals),sp=Math.max(10,mx-mn);
 const pts=vals.map((v,i)=>[(i/(vals.length-1))*(W-8)+4,H-6-((v-mn)/sp)*(H-12)]);
 return'<svg viewBox=\"0 0 '+W+' '+H+'\" class=\"spk\"><polyline fill=\"none\" stroke=\"#ff4a50\" stroke-width=\"3\" stroke-linejoin=\"round\" points=\"'+pts.map(p=>p[0].toFixed(1)+','+p[1].toFixed(1)).join(' ')+'\"/><circle cx=\"'+pts[pts.length-1][0].toFixed(1)+'\" cy=\"'+pts[pts.length-1][1].toFixed(1)+'\" r=\"5\" fill=\"#fff\"/></svg>'}
function tierBox(rating,withNext){const t=tierOf(rating);
 return'<div class=\"tb\"><div class=\"tbh\"><span class=\"tbn\" style=\"color:'+t.c+'\">'+t.n+'</span><span class=\"tbr\">'+rating+'</span></div><div class=\"tbar\"><i style=\"width:'+t.pct+'%;background:'+t.c+'\"></i></div>'
  +(withNext?'<small>'+(t.next?t.left+' points to '+t.next.n:'Top tier reached')+'</small>':'')+'</div>'}

// ---------- Ranked panel (leaderboard + play) ----------
let LBROWS=[];
function rkCard(me){
 if(!me)return'<div class="rkcard none"><div class="rki"><b>Not ranked yet</b><small>You get an account automatically when you play your first game. Logging in with Discord (Profile) keeps it across devices.</small></div></div>';
 const g=me.games!=null?me.games:me.wins+me.losses+(me.draws||0),hs=hstats(me),t=tierOf(me.rating);
 const chip=(l,v,c)=>'<div class="rkch"><small>'+l+'</small><b'+(c?' style="color:'+c+'"':'')+'>'+v+'</b></div>';
 return'<div class="rkcard"><em class="av big">'+avHTML(avId()||me.avatar,me.name)+'</em><div class="rki"><b class="rkn">'+esc(me.name)+'</b>'
  +'<div class="rkt" style="color:'+t.c+'">'+t.n+'</div><div class="rkrt">'+me.rating+'<small>'+(me.rank?'Rank #'+me.rank:'Unranked')+'</small></div></div></div>'
  +'<div class="tbar rk"><i style="width:'+t.pct+'%;background:'+t.c+'"></i></div><div class="rknx">'+(t.next?t.left+' points to '+t.next.n:'Top tier reached')+'</div>'
  +'<div class="rkchs">'+chip('Wins',me.wins,'#5fd38a')+chip('Losses',me.losses,'#ff4a50')+chip('Draws',me.draws||0)+chip('Win rate',pct(me.wins,g))+(hs.n?chip('Streak',(hs.ct=='win'?'W':hs.ct=='loss'?'L':'D')+hs.cur):'')+'</div>'}
function rkRows(lb,me){
 return lb.length?lb.map(p=>{const mine=me&&p.pid&&p.pid==me.pid,t=tierOf(p.rating);
  return'<div class="rkr'+(mine?' me':'')+'" data-pid="'+esc(p.pid||'')+'" title="View profile"><i>'+p.rank+'</i><em class="av">'+avHTML(mine?avId()||p.avatar:p.avatar,p.name)+'</em><b>'+esc(p.name)+'</b><u style="color:'+t.c+'">'+t.n+'</u><span>'+p.rating+'</span><small>'+p.wins+'W '+p.losses+'L</small></div>'}).join(''):'<div class="rkr"><b>No ranked games have been played yet.</b></div>'}
async function rkOpen(){
 openPanel('rkmenu');rk('rklist').innerHTML='';rk('rkme').innerHTML=rkCard(MM.me);rk('rkplay').disabled=true;rk('rkplay').textContent='Play Ranked';
 try{syncPickers();pkReveal('pkr')}catch(e){}
 if(!cfg()){rk('rksub').textContent='The ranking server is not configured for this copy of the game (see server/README.md).';return}
 rk('rksub').textContent='Connecting...';const up=await serverUp();
 if(!up){rk('rksub').textContent='The ranking server is not reachable right now.';return}
 rk('rksub').textContent=(up.ranked||0)?(up.ranked+' searching for a ranked game right now.'):'Nobody is searching right now - you may have to wait for an opponent.';rk('rkplay').disabled=false;
 try{const a=getAcct(),[me,lb]=await Promise.all([a?api('/api/me',{method:'POST'},a):null,api('/api/leaderboard?limit=50')]);
  MM.me=me||null;if(me&&me.avatar&&CD[me.avatar])lsSet('rj_avatar',String(me.avatar));chipRefresh();
  if(needDc()&&!(me&&me.discord)){rk('rkplay').textContent='Link Discord to play';rk('rksub').textContent='Ranked games require a linked Discord account (set up in your Profile).'}
  rk('rkme').innerHTML=rkCard(me);LBROWS=lb;rk('rklist').innerHTML=rkRows(lb,me)}
 catch(e){if(e.status==401){setAcct(null);MM.me=null;chipRefresh();rk('rkme').innerHTML=rkCard(null);rk('rksub').textContent='Your saved account was not recognised by the server; log in with Discord from your Profile.'}else rk('rksub').textContent='Could not load the ranking: '+e.message}}
rk('rkopen').onclick=rkOpen;rk('rkback').onclick=closePanels;
rk('rkprof').onclick=()=>profOpen('',rkOpen);
rk('rklist').onclick=e=>{const r=e.target.closest('.rkr[data-pid]');if(r&&r.dataset.pid)profView(r.dataset.pid,rkOpen)};
rk('rkplay').onclick=()=>{if(needDc()&&!(MM.me&&MM.me.discord)){profOpen('Ranked games require a linked Discord account: '+(MM.me?'link Discord to this account':'log in with Discord')+' below.',rkOpen);return}
 LB='rkmenu';startAudio();mmSearch('ranked')};

// ---------- Profile (own account, or another player's card opened from the leaderboard) ----------
const stat=(l,v)=>'<div class="pst"><small>'+l+'</small><b>'+v+'</b></div>';
function profFill(me,mine){
 const n=mine?dispName():(me&&me.name)||'',hs=mine?hstats(me):null;
 rk('pfav').innerHTML=avHTML(mine?(avId()||(me&&me.avatar)):(me&&me.avatar),n);
 const t=[],g=me?(me.games!=null?me.games:me.wins+me.losses+(me.draws||0)):0;
 // rating card + tier emblem
 rk('pfrate').innerHTML=me?tierBox(me.rating,true):'';rk('pfrate').style.display=me?'':'none';
 const ti=me?tierOf(me.rating):null;rk('pftier').innerHTML=ti?'<span class="tem" style="color:'+ti.c+';border-color:'+ti.c+'">'+ti.n+'</span>':'';
 if(me){
  t.push(stat('Rank',me.rank?'#'+me.rank:'Unranked'));
  if(mine)t.push(stat('Peak rating',hs.peak||me.rating));
  t.push(stat('Games',g),stat('Win rate',pct(me.wins,g)),stat('Wins',me.wins),stat('Losses',me.losses),stat('Draws',me.draws||0));
  if(mine)t.push(stat('Streak',hs.n?(hs.ct=='win'?'W':hs.ct=='loss'?'L':'D')+hs.cur:'-'),stat('Best win streak',hs.best||'-'));
  if(me.created||mine)t.push(stat('Member since',fmtDate(me.created||(mine&&+lsGet('rj_first'))||0)))}
 if(mine){t.push(stat('Achievements',typeof achCount=='function'?achCount()+'/'+ACH.length:'-'),stat('Endless best',+lsGet('rj_endless_best')||0));
  }
 rk('pfstats').innerHTML=t.join('');
 // form: last results + rating trend (own profile only - kept in this browser)
 const fm=rk('pfform'),hh=rk('pfhist');
 if(mine&&me){const h=hs.h;
  fm.innerHTML=h.length?'<div class="frm"><small>Recent form</small><span class="pips">'+h.slice(-10).map(x=>'<i class="'+x.r+'" title="'+esc((x.r=='win'?'Win':x.r=='loss'?'Loss':'Draw')+' vs '+x.on)+'">'+(x.r=='win'?'W':x.r=='loss'?'L':'D')+'</i>').join('')+'</span></div>'+(h.length>1?'<div class="frm"><small>Rating trend</small>'+spark(h.slice(-20).map(x=>x.rt))+'</div>':'')+(hs.fav||hs.avgOpp?'<div class="frm"><small>Ranked deck / opponents</small><b class="frb">'+(hs.fav?esc(hs.fav):'-')+(hs.avgOpp?' <small>avg. opp. '+hs.avgOpp+'</small>':'')+'</b></div>':''):'<div class="frm"><small>Play a ranked game to start your match history.</small></div>';
  hh.innerHTML=h.length?'<h4>Recent matches</h4>'+h.slice(-4).reverse().map(x=>'<div class="hrow '+x.r+'"><b>'+(x.r=='win'?'WIN':x.r=='loss'?'LOSS':'DRAW')+'</b><span class="ho">vs '+esc(x.on||'?')+(x.or!=null?' <small>('+x.or+')</small>':'')+'</span><small class="hdk">'+esc(x.dk||'')+'</small><em>'+(x.d>=0?'+':'')+x.d+'</em><small>'+ago(x.t).replace('Active now','just now')+'</small></div>').join(''):''}
 else{fm.innerHTML='';hh.innerHTML=''}
 rk('pfdel').hidden=!mine||!getAcct();renderDc()}
async function profOpen(msg,home){
 if(home!==undefined)PFH=home;
 rk('acctmenu').classList.remove('view');rk('pft').textContent='Profile';rk('pfsub').textContent='';rk('pffr').hidden=true;PFP=null;
 openPanel('acctmenu');rk('pfname').value=dispName();rk('pfmsg').textContent=msg||'';rk('pfback').onclick=()=>{const h=PFH;PFH=null;h?h():closePanels()};
 if(!lsGet('rj_first'))lsSet('rj_first',String(Date.now()));
 profFill(MM.me,true);
 if(!cfg()){rk('pfsub').textContent='Ranked stats are unavailable: the ranking server is not configured.';return}
 const up=await serverUp();if(!up){rk('pfsub').textContent='Ranked stats are unavailable: the ranking server is not reachable.';renderDc();return}
 await meLoad();chipRefresh();profFill(MM.me,true);
 if(!MM.me)rk('pfsub').textContent='Log in with Discord to create your ranked account.'}
let PFH=null;
let PFB=null,PFP=null;   // where Back goes from another player's profile / who is shown
const frLabel={none:'Add friend',pending_out:'Cancel request',pending_in:'Accept request',friends:'Remove friend'};
function pfFriendBtn(){const b=rk('pffr'),p=PFP;b.hidden=!(p&&!p.self&&p.rel);if(!b.hidden)b.textContent=frLabel[p.rel]||'Add friend'}
async function profView(pid,back){
 if(MM.me&&MM.me.pid==pid)return profOpen();
 PFB=back||rkOpen;PFP=null;rk('acctmenu').classList.add('view');rk('pft').textContent='Player';rk('pfsub').textContent='Loading...';rk('pfmsg').textContent='';rk('pffr').hidden=true;
 openPanel('acctmenu');rk('pfback').onclick=()=>PFB();
 try{const p=await api('/api/player?pid='+encodeURIComponent(pid),null,getAcct());if(p.error)throw new Error(p.error);PFP=p;
  rk('pft').textContent=p.name;rk('pfsub').textContent=(p.last?'Last seen: '+ago(p.last).replace('Active now','online now'):'');profFill(p,false);pfFriendBtn()}
 catch(e){rk('pfsub').textContent='Could not load this profile: '+e.message}}
rk('pffr').onclick=async()=>{const p=PFP,a=getAcct();if(!p||!a)return;
 const act={none:'request',pending_out:'remove',pending_in:'accept',friends:'remove'}[p.rel];
 if(p.rel=='friends'&&!confirm('Remove '+p.name+' from your friends?'))return;
 try{const r=await api('/api/friends/'+act,{method:'POST',body:{pid:p.pid}},a);if(r.error)throw new Error(r.error);p.rel=r.rel;pfFriendBtn();friendsLoad();
  rk('pfmsg').textContent=r.rel=='pending_out'?'Friend request sent.':r.rel=='friends'?'You are now friends.':r.rel=='none'?'Done.':''}
 catch(e){rk('pfmsg').textContent='Could not do that: '+e.message}};
rk('pchip').onclick=()=>profOpen('',null);
rk('pfsave').onclick=async()=>{const a=getAcct(),n=cleanName(rk('pfname').value).trim();if(!n){rk('pfmsg').textContent='Enter a name first.';return}
 setMyName(n);chipRefresh();
 if(!a){rk('pfmsg').textContent='Name saved.';return}
 try{const p=await api('/api/rename',{method:'POST',body:{name:n}},a);a.name=p.name;setAcct(a);setMyName(p.name);rk('pfname').value=p.name;if(MM.me)MM.me.name=p.name;chipRefresh();rk('pfmsg').textContent='Name saved.'}
 catch(e){rk('pfmsg').textContent='Saved here, but the server refused it: '+e.message}};
rk('pfname').onkeydown=e=>{if(e.key=='Enter')rk('pfsave').click()};

// ---------- profile picture picker ----------
function avRender(){const q=rk('avq').value.trim().toLowerCase(),cur=avId();
 rk('avgrid').innerHTML=CARDS.filter(c=>!q||String(c.Name).toLowerCase().includes(q)).map(c=>'<button class="avc'+(c.Id==cur?' on':'')+'" data-id="'+c.Id+'" title="'+esc(c.Name)+'"><img src="'+artSrc(c.Id)+'" alt="" draggable="false" loading="lazy" onerror="artErr(this,'+c.Id+')"><span>'+esc(c.Name)+'</span></button>').join('')}
function avSet(id){lsSet('rj_avatar',id?String(id):'');if(MM.me)MM.me.avatar=id||0;chipRefresh();
 const a=getAcct();profOpen();
 if(a&&cfg())api('/api/avatar',{method:'POST',body:{avatar:id||0}},a).catch(e=>{rk('pfmsg').textContent='Saved on this device, but the server did not accept it: '+e.message})}
const avOpen=()=>{rk('avq').value='';avRender();openPanel('avpick')};
rk('pfav').onclick=rk('pfchg').onclick=avOpen;
rk('avq').oninput=avRender;rk('avgrid').onclick=e=>{const b=e.target.closest('.avc');if(b)avSet(+b.dataset.id)};
rk('avclear').onclick=()=>avSet(0);rk('avback').onclick=()=>profOpen();

// ---------- Friends ----------
function fdRow(p,btns){return '<div class="fdrow" data-pid="'+esc(p.pid)+'"><em class="av">'+avHTML(p.avatar,p.name)+'</em><div class="fi"><b>'+esc(p.name)+'</b><small>'+['Rating '+p.rating,p.last?ago(p.last):''].filter(Boolean).join('  -  ')+'</small></div><span class="rkbt">'+btns+'</span></div>'}
const fdBtn=(a,t)=>'<button data-a="'+a+'">'+t+'</button>';
function fdRender(){const f=MM.fr;if(!f){rk('fdlist').innerHTML='';return}
 const sec=(t,rows)=>rows?'<h4>'+t+'</h4>'+rows:'';
 const h=sec('Requests ('+f.incoming.length+')',f.incoming.map(p=>fdRow(p,fdBtn('accept','Accept')+fdBtn('remove','Decline'))).join(''))
  +sec('Friends ('+f.friends.length+')',f.friends.map(p=>fdRow(p,fdBtn('challenge','Challenge')+fdBtn('view','Profile')+fdBtn('remove','Remove'))).join(''))
  +sec('Sent requests ('+f.outgoing.length+')',f.outgoing.map(p=>fdRow(p,fdBtn('remove','Cancel'))).join(''));
 rk('fdlist').innerHTML=h||'<div class="fdempty">No friends yet - search for a player above, or open a profile from the leaderboard and press Add friend.</div>'}
function fdBadge(){const n=MM.fr?MM.fr.incoming.length:0;rk('fdcnt').textContent=n?String(n):''}
async function friendsLoad(){const a=getAcct();if(!a||!cfg())return null;
 try{MM.fr=await api('/api/friends',{method:'POST'},a);fdBadge();if(rk('fdmenu').style.display=='flex')fdRender();return MM.fr}catch(e){return null}}
async function fdOpen(msg){
 openPanel('fdmenu');rk('fdres').innerHTML='';rk('fdq').value='';rk('fdsub').textContent=msg||'';rk('fdlist').innerHTML='';
 if(!cfg()){rk('fdsub').textContent='Friends need the online server, which is not configured for this copy of the game.';return}
 if(!getAcct()){rk('fdsub').textContent='Friends need an account: open your Profile and log in with Discord first.';return}
 rk('fdsub').textContent=msg||'Loading...';const f=await friendsLoad();
 if(!f){rk('fdsub').textContent='Could not reach the server.';return}
 rk('fdsub').textContent=msg||'';fdRender()}
async function fdSearch(){const q=rk('fdq').value.trim();if(q.length<2){rk('fdres').innerHTML='<div class="fdempty">Type at least 2 letters.</div>';return}
 try{const r=await api('/api/search?q='+encodeURIComponent(q),null,getAcct()),me=MM.me&&MM.me.pid;
  rk('fdres').innerHTML=r.filter(p=>p.pid!=me).length?'<h4>Results</h4>'+r.filter(p=>p.pid!=me).map(p=>fdRow(p,fdBtn('view','Profile')+(MM.fr&&[...MM.fr.friends,...MM.fr.incoming,...MM.fr.outgoing].some(x=>x.pid==p.pid)?'':fdBtn('request','Add')))).join(''):'<div class="fdempty">No players found.</div>'}
 catch(e){rk('fdres').innerHTML='<div class="fdempty">Search failed: '+esc(e.message)+'</div>'}}
async function fdAct(act,pid){const a=getAcct();
 try{const r=await api('/api/friends/'+act,{method:'POST',body:{pid}},a);if(r.error)throw new Error(r.error);await friendsLoad();fdRender();
  if(act=='request'){rk('fdsub').textContent='Friend request sent.';rk('fdres').querySelectorAll('.fdrow[data-pid="'+pid+'"] button[data-a=request]').forEach(b=>b.remove())}}
 catch(e){rk('fdsub').textContent='Could not do that: '+e.message}}
rk('fdopen').onclick=()=>fdOpen();rk('fdgo').onclick=fdSearch;rk('fdq').onkeydown=e=>{if(e.key=='Enter')fdSearch()};
rk('fdmenu').addEventListener('click',e=>{const b=e.target.closest('button[data-a]'),r=e.target.closest('.fdrow');if(!r)return;const pid=r.dataset.pid;
 if(!b){profView(pid,()=>fdOpen());return}
 if(b.dataset.a=='challenge')chSend(pid,r);else if(b.dataset.a=='view')profView(pid,()=>fdOpen());else fdAct(b.dataset.a,pid)});

// ---------- Friend challenges ----------
// Sender: server creates a room code, the sender hosts it (same peer-to-peer path as Quick Match) and polls until the friend answers.
// Receiver: polls the server (slowly on the menu, faster while the Friends panel is open); a popup offers Accept / Decline.
// Accepting returns the room code and the receiver joins as guest. Challenges expire after 35 s. Casual game: no rating change.
const chBusy=()=>$('game').style.display=='block'||$('lobby').style.display=='flex'||$('mul').style.display=='flex'||$('ov').style.display=='flex';
async function chSend(pid,row){const a=getAcct();if(!a){rk('fdsub').textContent='Friends need an account.';return}
 const f=MM.fr&&MM.fr.friends.find(x=>x.pid==pid),nm=f?f.name:'your friend';
 try{const r=await api('/api/challenge',{method:'POST',body:{act:'send',pid}},a);if(r.error)throw new Error(r.error);
  mmStop();netLeave();syncDecks();MM.cur={id:'',mode:'friend',opp:{name:nm}};LB='fdmenu';startAudio();const tk=MM.tk,id=r.id;MM.chid=id;
  lobby('Friend Challenge',{status:'Challenge sent. Waiting for '+nm+' to accept...  Pick your deck while you wait.'});
  mmHost(r.code,tk);
  const end=msg=>{if(MM.tk!==tk)return;MM.chid=null;mmStop();MM.cur=null;netLeave(1);lobby('Friend Challenge',{nodeck:1,status:msg+' Press Cancel to go back.'})};
  MM.chp=setInterval(async()=>{if(MM.tk!==tk)return;
   try{const p=await api('/api/challenge',{method:'POST',body:{act:'poll',id}},a);if(MM.tk!==tk||!p.out)return;
    if(p.out.st=='declined')end(nm+' declined the challenge.');
    else if(p.out.st=='gone')end(nm+' did not answer in time.');
    else if(p.out.st=='accepted'){clearInterval(MM.chp);MM.chid=null;$('ls').textContent=nm+' accepted - connecting...'}}catch(e){}},2000)}
 catch(e){rk('fdsub').textContent='Could not send the challenge: '+e.message}}
let CHSHOWN=null;const CHSEEN=new Set();
function chHide(){CHSHOWN=null;rk('chpop').style.display='none'}
function chShow(c){CHSHOWN=c;CHSEEN.add(c.id);rk('chav').innerHTML=avHTML(c.avatar,c.name);rk('chname').textContent=c.name;rk('chpop').style.display='flex';
 try{sfx('unitPlayed',{pitch:0})}catch(e){}
 clearTimeout(MM.cht);MM.cht=setTimeout(()=>{if(CHSHOWN&&CHSHOWN.id==c.id)chHide()},34000)}
async function chPoll(){const a=getAcct();if(!a||!cfg()||document.hidden)return;
 if(chBusy()){if(CHSHOWN)chHide();return}
 try{const p=await api('/api/challenge',{method:'POST',body:{act:'poll'}},a),c=(p.incoming||[]).find(x=>!CHSEEN.has(x.id));
  if(CHSHOWN&&!(p.incoming||[]).some(x=>x.id==CHSHOWN.id))chHide();
  if(c&&!chBusy())chShow(c)}catch(e){}}
rk('chno').onclick=()=>{const c=CHSHOWN;chHide();const a=getAcct();if(c&&a)api('/api/challenge',{method:'POST',body:{act:'decline',id:c.id}},a).catch(()=>{})};
rk('chyes').onclick=async()=>{const c=CHSHOWN,a=getAcct();if(!c||!a)return;chHide();
 try{const r=await api('/api/challenge',{method:'POST',body:{act:'accept',id:c.id}},a);if(r.error)throw new Error(r.error);
  mmStop();netLeave();syncDecks();LB='fdmenu';startAudio();MM.cur={id:'',mode:'friend',opp:r.opp};const tk=MM.tk;
  lobby('Friend Challenge',{nodeck:1,status:'Connecting to '+c.name+'...'});mmGuest(r.code,tk)}
 catch(e){openPanel('fdmenu');fdOpen(e.message=='This challenge has expired.'?e.message:'Could not accept: '+e.message)}};
{let last=0;setInterval(()=>{const fo=rk('fdmenu').style.display=='flex';if(Date.now()-last<(fo?4000:12000)-500)return;last=Date.now();chPoll()},2000)}

// ---------- Discord login / link ----------
// Flow: begin (server builds the Discord URL) -> this page navigates to Discord -> Discord -> server callback -> back to GAME_URL#dc=<one-time code> -> claim().
// A random nonce kept in localStorage must accompany the claim, so a login link started by somebody else cannot be completed in your browser.
// The account key is never shown or copyable: it is handed out by the server on Discord login and only kept in this browser to sign requests.
const rn=n=>{const a=new Uint8Array(n);crypto.getRandomValues(a);return Array.from(a,x=>'abcdefghijklmnopqrstuvwxyz0123456789'[x%36]).join('')};
function renderDc(){const s=MM.srv,me=MM.me,on=!!(s&&s.discord);rk('pfdcrow').style.display=on?'':'none';if(!on)return;
 rk('pfdc').textContent=me&&me.discord?'Linked: '+me.discord:'Not linked'+(needDc()?' (required for Ranked)':'');
 rk('pfdclink').style.display=me&&!me.discord?'':'none';rk('pfdclogin').style.display=me&&me.discord?'none':'';
 rk('pfdclogin').textContent=me?'Log in with another Discord account':'Log in with Discord'}
async function dcStart(mode){const a=getAcct(),n=rn(32);rk('pfmsg').textContent='Opening Discord...';
 try{const r=await api('/api/discord/begin',{method:'POST',body:{n}},mode=='link'?a:null);lsSet('rj_dcn',n);location.href=r.url}
 catch(e){rk('pfmsg').textContent='Could not start the Discord login: '+e.message}}
rk('pfdclink').onclick=()=>{if(getAcct())dcStart('link')};
rk('pfdclogin').onclick=()=>{const me=MM.me;
 if(getAcct()&&me&&!me.discord&&me.games>0&&!confirm('This browser\'s account ('+me.name+', rating '+me.rating+') is not linked to Discord. Logging in with Discord will switch to a different account and you will lose access to this one. Link Discord to it instead if you want to keep it. Continue anyway?'))return;
 dcStart('login')};
rk('pfdel').onclick=async()=>{const a=getAcct();if(!a)return;
 if(!confirm('Delete this account for good? Its rating, stats and Discord link are removed from the server and cannot be restored.'))return;
 try{await api('/api/delete',{method:'POST'},a);setAcct(null);MM.me=null;lsSet('rj_avatar','');chipRefresh();await profOpen('Account deleted.')}catch(e){rk('pfmsg').textContent='Could not delete: '+e.message}};
const DCERR={state:'The Discord login expired. Please try again.',denied:'Discord login was cancelled.',failed:'Discord login failed. Please try again later.',taken:'That Discord account is already linked to another game account. Use "Log in with Discord" to switch to it instead.'};
async function dcReturn(){const h=location.hash;if(!/^#(dc|dcerr)=/.test(h))return;
 const p=new URLSearchParams(h.slice(1));try{history.replaceState(null,'',location.pathname+location.search)}catch(e){}
 const done=m=>profOpen(m);
 if(p.get('dcerr'))return done(DCERR[p.get('dcerr')]||'Discord login failed.');
 const code=p.get('dc'),n=lsGet('rj_dcn');lsSet('rj_dcn','');
 if(!code||!n)return done(DCERR.state);
 try{const r=await api('/api/discord/claim',{method:'POST',body:{code,n}});
  if(r.key){setAcct({uid:r.uid,key:r.key,name:r.name});setMyName(r.name);await done('Logged in as '+r.name+' (Discord: '+r.discord+').')}
  else await done('Discord linked: '+r.discord+'. You can now log in with it on any device.')}
 catch(e){await done(DCERR.state)}}
dcReturn();
// header chip: show name / picture right away, rating once the server has answered
chipRefresh();serverUp().then(up=>{if(up)return meLoad().then(()=>{chipRefresh();return friendsLoad()})});

// ---------- Quick Match button (friend menu) ----------
$('mquick').onclick=async()=>{LB='frmenu';startAudio();window.QMNOTE='';if(!cfg())return quickMatch();mmSearch('casual')};
// Cancel: also stop the server search
{const oc=$('lcancel').onclick;$('lcancel').onclick=()=>{const cid=MM.chid,a=getAcct(),c0=MM.cur;MM.chid=null;
 if(c0&&c0.mode=='ranked'&&c0.id&&a&&NET&&NET.mm)api('/api/report',{method:'POST',body:{id:c0.id,r:'abort'}},a).catch(()=>{});if(cid&&a)api('/api/challenge',{method:'POST',body:{act:'decline',id:cid}},a).catch(()=>{});
 mmStop();MM.cur=null;window.QMNOTE='';const fr=LB=='fdmenu',rkb=LB=='rkmenu';oc();if(fr)fdOpen();else if(rkb)rkOpen()}}
})();
