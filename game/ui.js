const $=id=>document.getElementById(id),sleep=ms=>new Promise(r=>setTimeout(r,ms));
let G,sel=null,pend=null,busy=false,flash=-1,mulSel=new Set(),castMode=false,pendRes=null,stickyZoom=false;
let ALL=[],gid=0,NET=null;
function fit(){const s=Math.min(innerWidth/1920,innerHeight/1080);$('stage').style.transform=`translate(-50%,-50%) scale(${s})`}
addEventListener('resize',fit);fit();
const show=id=>{['menu','bld','game'].forEach(k=>$(k).style.display=k==id?(k=='menu'?'flex':'block'):'none')};
document.querySelectorAll('.ring').forEach(c=>{const x=c.getContext('2d');for(let i=0;i<60;i++)for(let j=0;j<60;j++){const r=Math.hypot(i-29.5,j-29.5);
 if(r<=29.6&&r>=25.6){x.fillStyle=r>=27.4?'#2c2c2c':'#222';x.fillRect(i,j,1,1)}}});
const loadC=()=>{try{return JSON.parse(localStorage.getItem('rj_decks')||'[]')}catch(e){return[]}};
const saveC=a=>{try{localStorage.setItem('rj_decks',JSON.stringify(a))}catch(e){alert('Could not save (storage blocked)')}};
const getDef=()=>{try{return localStorage.getItem('rj_default')}catch(e){return null}};
const putDef=n=>{try{n?localStorage.setItem('rj_default',n):localStorage.removeItem('rj_default')}catch(e){}};
const STAR='<svg class="star" viewBox="0 0 16 16" shape-rendering="crispEdges"><path fill="currentColor" d="M7 1h2v4h5v2h-2v2h2v2h-3v4H9v-3H7v3H4v-4H1V9h2V7H1V5h5z"/></svg>';
function refreshDecks(){ALL=DECKS.concat(loadC().map(d=>({...d,custom:1})));
 const dn=getDef(),di=dn==null?-1:ALL.findIndex(d=>d.n==dn);
 ['d0','d1'].forEach((s,k)=>{const el=$(s),o=el.selectedOptions[0],prev=o?o.dataset.n:null;let v=el.selectedIndex<0?(k?Math.min(1,ALL.length-1):Math.max(0,di)):el.selectedIndex;el.innerHTML='';
  ALL.forEach((d,i)=>{const op=new Option((d.custom?'* ':'')+d.n,i);op.dataset.n=d.n;el.add(op)});
  const j=prev==null?-1:ALL.findIndex(d=>d.n==prev);if(j>=0)v=j;el.selectedIndex=Math.max(0,Math.min(v,ALL.length-1))});
 if(window.renderPickers)renderPickers()}
refreshDecks();
const ROM=n=>{if(n<=0)return'0';let s='';for(const[v,r]of[[10,'X'],[9,'IX'],[5,'V'],[4,'IV'],[1,'I']])while(n>=v){s+=r;n-=v}return s};
const KWD={Flying:'Skips non-flyers and hits the hero. Only flyers can block it.',Armored:'Takes {n} less damage from each hit.',Unkillable:'Can\'t die. When destroyed, its death effects trigger, then it returns to your hand.',SoulGuard:'Survives lethal damage once, at 1 HP.',SplashDamage:'When it attacks, also hits enemy units in the adjacent lanes for {n}.',Burning:'Takes 1 damage each round.',Marked:'Takes double damage.',Stunned:'Skips its next attack.',Breakthrough:'When it attacks a unit, it also hits the enemy hero in that lane.',Unactionable:'Can\'t be targeted by any Action or ability, from either side. Combat still affects it.',Lifesteal:'Damage this unit deals heals your hero for the same amount.',Deadly:'If it would hurt an enemy unit, it destroys that unit instead.',Taunt:'While it is in play, damage that would hurt your hero hits this unit instead.',Evolving:'At the end of every round it transforms into a random Unit that costs 1 more, and keeps Evolving. Silence removes it.'};
const TERMS=[
 ['Sacrifice',/\bSacrifice[ds]?\b/i,'Remove your own unit from the board. Counts as destroyed.'],
 ['Blood',/\bBlood\b/i,'Resource for playing cards. Refills every round (max 10).'],
 ['Bonus Attack',/\bBonus Attack\b/i,'Attacks once, right now.'],
 ['Bounce',/\bBounce\b/i,'Returns the unit to its owner\'s hand.'],
 ['After Combat',/\bAfter Combat\b/i,'Triggers once the fight in this lane is over.'],
 ['Silence',/\bSilence\b/i,'Removes keywords, buffs and abilities.'],
 ['Move Right',/\bMove Right\b/i,'Moves one lane right, if free.'],
 ['Exploding Present',/\bExploding Present\b/i,'A copy goes to the opponent\'s hand.'],
 ['Mark',/\bMark(ed)?\b/i,'Marked'],['Stun',/\bStun(ned)?\b/i,'Stunned'],['Burning',/\bBurning\b/i,'Burning'],
 ['SoulGuard',/Soul ?Guard/i,'SoulGuard'],['Unkillable',/\bUnkillable\b/i,'Unkillable'],['Flying',/\bFlying\b/i,'Flying'],['Armored',/\bArmored\b/i,'Armored'],['Unactionable',/\bUnactionable\b/i,'Unactionable'],['Lifesteal',/\bLifesteal\b/i,'Lifesteal'],['Taunt',/\bTaunt\b/i,'Taunt'],['Deadly',/\bDeadly\b/i,'Deadly'],['Evolving',/\bEvolving\b/i,'Evolving'],
 ['Merge',/\bMerge[sd]?\b/i,'When every piece is on your side they combine into one card, placed in the lane of the piece played last.']];
const KNAME={SplashDamage:'Splash',BurnSource:'Burn Source'};
const kwNum=(d,k)=>(d.KeywordParams||{})[k]||(k=='Armored'||k=='SplashDamage'?1:'');
const kwLabel=(d,k)=>k=='Armor2'?'Armored 2':(KNAME[k]||k)+(kwNum(d,k)!==''&&(k=='Armored'||k=='SplashDamage')?' '+kwNum(d,k):'');
const BAD=new Set(['Burning','Marked','Stunned']);
const hl=t=>(t||'').replace(/\b(Sacrifice[d]?|Mark(?:ed)?|Stunned?|Burning|SoulGuard|Unkillable|Unactionable|Lifesteal|Taunt|Deadly|Evolving|Flying|Merge[sd]?)\b/g,'<span class="k u">$1</span>').replace(/(\d+ )?\bBlood\b/g,'<span class="k">$&</span>');
const MISSING=new Set(),IMGX=window.RJ_IMG||{};
const artFile=id=>'img/'+(IMGX[+id]||id+'.webp');
const artSrc=id=>MISSING.has(+id)?'img/missing_texture.webp':artFile(id);
const artErr=(el,id)=>{el.onerror=null;MISSING.add(+id);el.src='img/missing_texture.webp'};
function cardHTML(x,live,cls,data){
 const d=x.d||CD[x.id],unit=d.Type=='Unit';
 const co=x.fc!=null?x.fc:live?(x.paid!=null?x.paid:d.Cost):!G?d.Cost:cost(G,G.p[0],x),cc=!live&&co<d.Cost?' cd':!live&&co>d.Cost?' cu':'';
 const atk=live?x.atk:(d.Attack||0)+(x.ba||0),hp=live?x.hp:d.Health;
 const au=atk>(d.Attack||0)?' up':'',hc=live&&hp<x.mx?' dn':(hp>(d.Health||0)?' up':'');
 const ks=live?[...x.kw]:[...(d.Keywords||[]),...(x.unk&&!(d.Keywords||[]).includes('Unkillable')?['Unkillable']:[])];
 const kl=ks.map(k=>`<i class="${BAD.has(k)?'r':''}">${kwLabel(d,k)}</i>`).join(' ');
 const nf=d.Name.length>18?.62:d.Name.length>14?.75:d.Name.length>11?.88:1;
 const sub=unit?(d.Subtypes||[]).join(' '):'Action';
 return`<div class="card ${cls||''}" ${data||''} data-cid="${x.id}" data-ba="${x.ba||0}" style="--nf:${nf}"><img class="art" src="${artSrc(x.id)}" alt="" draggable="false" onerror="artErr(this,${x.id})"><i class="fr"></i><span class="nm">${d.Name}</span><span class="st">- ${sub} -</span><span class="co${cc}">${ROM(co)}</span>`+
 (unit?`<div class="bx a${au}">${atk}</div><div class="bx h${hc}">${hp}</div>`:'')+
 `<div class="tx">${kl?`<span class="kwl">${kl}</span>`:''}${live&&x.sil?'':`<span>${hl(d.Description)}</span>`}</div></div>`}
function glossary(x,live,d){const out=[],seen=new Set();
 const addKw=k=>{const key=k=='Armor2'?'Armored':k;if(!KWD[key]||seen.has(key))return;seen.add(key);
  const n=k=='Armor2'?2:kwNum(d,key)||1;out.push(`<b>${kwLabel(d,k)}</b>: ${KWD[key].replace('{n}',n)}`)};
 (live?[...x.kw]:[...(d.Keywords||[]),...(x.unk?['Unkillable']:[])]).forEach(addKw);
 TERMS.forEach(([n,re,t])=>{if((live&&x.sil)||!re.test(d.Description||''))return;
  if(KWD[t])addKw(t);else if(!seen.has(n)){seen.add(n);out.push(`<b>${n}</b>: ${t}`)}});
 if(d.Type=='Spell')out.push('<b>Action</b>: cast in the Action phase.');
 return out}
function showZoom(x,live){const d=x.d||CD[x.id];const gl=glossary(x,live,d).join('<br>');
 const z=$('zoom');z.classList.toggle('zr',$('bld').style.display=='block');
 z.innerHTML=cardHTML(x,live,live&&x.o?'e':'')+(gl?`<div id="gl">${gl}</div>`:'');z.style.display='block'}
const hideZoom=()=>{if(!stickyZoom)$('zoom').style.display='none'};
const findLive=uid=>[...G.p[0].ln,...G.p[1].ln].find(v=>v&&v.uid==uid);
const CARDSEL='[data-u],[data-c],[data-cid]';
document.addEventListener('mouseover',e=>{const t=e.target.closest&&e.target.closest(CARDSEL);if(!t||t.closest('#zoom')||t.closest('.fly')||t.classList.contains('dying'))return;
 let x=null,live=false;
 if(t.dataset.u&&G){x=findLive(t.dataset.u);live=!!x}
 if(!x&&t.dataset.c&&G)x=G.p[0].hand.find(v=>v.uid==t.dataset.c);
 if(!x&&t.dataset.cid)x={id:+t.dataset.cid,uid:0,ba:+t.dataset.ba||0};
 if(x)showZoom(x,live)});
document.addEventListener('mouseout',e=>{if(e.target.closest&&e.target.closest(CARDSEL))hideZoom()});
const PH={U:'Units',B:'Unit and Actions',A:'Actions'};
const ASK={L:'Choose a free lane to summon into',M:'Choose units to sacrifice',e:'Choose an enemy unit',f:'Choose a friendly unit',S:'Choose a unit to sacrifice',a:'Choose any unit',D:'Choose a card from your deck',eh:'Choose an enemy unit or the enemy hero'};
const LX=[36,332,624,916],LY=[88,432];
const mine=()=>G.act==0&&!busy&&!G.over;
const ksNow=()=>pend.pre?pend.ks:apicks(G,G.p[0],CD[G.p[0].hand[pend.ci].id],pend.got,pend.ln);
const kind=()=>pend?ksNow()[pend.got.length]:null;
function laneEx(){const ex=pend.ln!=null?[pend.ln]:[];ksNow().forEach((k,j)=>{if(k=='L'&&j<pend.got.length&&typeof pend.got[j]=='number')ex.push(pend.got[j])});return ex}
function validTargets(){const k=kind();if(k=='L')return req(G,G.p[0],'L',null,laneEx());if(!k||k=='C'||k=='D')return[];
 const f=(ksNow().f||[])[pend.got.length]||null;return req(G,G.p[0],k,f)}
function dots(p){return Array.from({length:10},(_,i)=>`<i class="${i<p.b?'on':i<p.mb?'sp':''}"></i>`).join('')}
function say(t,cancel){const b=$('msg');if(!t){b.style.display='none';b.innerHTML='';return}b.innerHTML=t+(cancel?' <button data-cancel="1">Cancel</button>':'');b.style.display='block'}
const cleanName=s=>String(s||'').replace(/[<>&"'`\\]/g,'').replace(/\s+/g,' ').trimStart().slice(0,16);
const myName=()=>{try{return cleanName(localStorage.getItem('rj_name')).trim()}catch(e){return''}};
let OPN='';
function render(){
 const me=G.p[0],op=G.p[1],tg=validTargets();let h='';
 $('phase').textContent='Phase : '+(G.step>=3?'Combat':PH[G.allow]);$('round').textContent='Round : '+G.turn;
 $('ehp').textContent=Math.max(0,op.hp);$('php').textContent=Math.max(0,me.hp);
 $('ehp').className='hpn'+(op.hp<=7?' lo':'');$('php').className='hpn'+(me.hp<=7?' lo':'');
 $('enb').textContent=NET?(OPN||'Opponent'):'Botzacy';$('pnb').textContent=myName()||'Playerzacy';
 $('game').classList.toggle('et',G.act==1);$('enb').className='nbar'+(G.act==1?' act':'');$('pnb').className='nbar'+(G.act==0?' act':'');
 $('ecn').textContent=`hand ${op.hand.length} - deck ${op.deck.length}`;$('pcn').textContent=`hand ${me.hand.length} - deck ${me.deck.length}`;$('edots').innerHTML=dots(op);$('pdots').innerHTML=dots(me);
 const top=me.disc[me.disc.length-1];$('pile').className=top?'':'empty';$('pile').innerHTML=top?cardHTML(top,0):'';$('pc').textContent=me.disc.length+'x';$('dc').textContent=me.deck.length?me.deck.length+'x':'Fatigue '+((me.fat||0)+1);
 const placing=mine()&&sel!=null&&!pend&&me.hand[sel]&&CD[me.hand[sel].id].Type=='Unit';
 for(const row of[1,0])for(let i=0;i<4;i++){const u=G.p[row].ln[i];const free=(placing&&!u&&row==0&&canPlay(G,me,sel,i))||(!u&&row==0&&tg.includes(i)&&pend&&!pend.pre&&kind()=='L');
  h+=`<div class="slot ${free?'hl':''} ${flash==i?'fl':''}" data-r="${row}" data-i="${i}" style="left:${LX[i]}px;top:${LY[row?0:1]}px">${u?cardHTML(u,1,(row?'e ':'')+(tg.includes(u)?'tgt':'')+(pend&&pend.multi&&pend.multi.includes(u)?' msel':''),`data-u="${u.uid}"`):`<span class="num">${ROM(i+1)}</span>`}</div>`}
 if(flash>=0)h='<div class="laneband" style="left:'+(LX[flash]-14)+'px"></div>'+h;
 $('board').innerHTML=h+'<div id="castlbl"></div>';
 $('board').classList.toggle('cast',castMode);if(castMode)$('castlbl').textContent='Click the board to cast '+CD[me.hand[sel].id].Name;
 const n=me.hand.length,step=Math.min(235,1150/Math.max(n,1)),mid=(n-1)/2;
 const hc=$('hand'),ex={};[...hc.children].forEach(e=>ex[e.dataset.hid]=e);
 me.hand.forEach((c,i)=>{let el=ex[c.uid],fresh=!el;delete ex[c.uid];if(el)el.style.visibility='';
  const dx=960-95+(i-mid)*step,dy=Math.pow(i-mid,2)*3,rot=(i-mid)*1.7,html=cardHTML(c,0,'',`data-c="${c.uid}"`);
  if(fresh){el=document.createElement('div');el.dataset.hid=c.uid;hc.appendChild(el);el.style.setProperty('--x',dx+'px');el.style.setProperty('--y','340px');el.style.setProperty('--r','0deg')}
  if(el.dataset.html!==html){el.innerHTML=html;el.dataset.html=html}
  el.className='hc'+(sel==i?' sel':'')+(mine()&&playable(G,me,i)?'':' np');el.dataset.h=i;el.style.setProperty('--z',i+2);
  if(fresh)el.getBoundingClientRect();
  el.style.setProperty('--x',dx+'px');el.style.setProperty('--y',dy+'px');el.style.setProperty('--r',rot+'deg')});
 Object.values(ex).forEach(e=>e.remove());
 const pl=G.hist.filter(x=>x.t==G.turn).slice(-4);let s='';for(let i=0;i<4;i++){const x=pl[i-(4-pl.length)];s+=x&&i>=4-pl.length?`<div class="s"><img src="${artSrc(x.id)}" alt="" onerror="artErr(this,${x.id})"></div>`:'<div class="s"></div>'}
 $('strip').innerHTML=s+`<div class="w">${(G.log[G.log.length-1]||'').replace(/^— |—$/g,'').slice(0,16)}</div>`;
 const act=mine();$('end').disabled=!act;$('end').textContent=G.step>=3?'Combat…':act?'End Turn':'Enemy…';
 musicUpdate();if(G.over)finish()}
function info(x,live){showZoom(x,live)}
function anim(){const ev=G.ev;G.ev=[];if(NET&&NET.host)NET.ev.push(...ev);const aoeU=new Set();ev.forEach(e=>e.k=='aoe'&&e.us.forEach(x=>aoeU.add(x.u)));const inU=new Set(ev.filter(x=>x.k=='in').map(x=>x.u));const tfJust=ev.some(x=>x.k=='tf'&&inU.has(x.u));ev.forEach(x=>{if(x.k=='tf')x.just=tfJust});let dl=0;ev.forEach(e=>{
 const q=e.u?document.querySelector(`#board [data-u="${e.u}"]`):null;
 const run=()=>{sfxEv(e);
 if(e.k=='trig'&&q)q.classList.add('shake');
 else if(e.k=='in'){if(q)q.classList.add('pop');fxLand(e.u)}
 else if(e.k=='atk'){if(e.bonus)fxLunge(e,q,inU.has(e.u),e.post);else if(e.hr===0)fxSpark(1-e.o,e.l)}
 else if(e.k=='dmg'){const host=e.h!=null?$(e.h?'ehero':'phero'):q&&q.parentElement;if(!host)return;
  const s=document.createElement('span');s.className='pn'+(e.n<=0?' up':'')+(e.bk?' bk':'');s.textContent=e.n<=0?'BLOCK':'-'+e.n;host.appendChild(s);setTimeout(()=>s.remove(),e.bk?1300:1000);
  if(e.bk){fxPierce(e);host.classList.add('bkhit');setTimeout(()=>host.classList.remove('bkhit'),700)}
  if(e.n>0||e.h!=null){host.classList.add('shake');setTimeout(()=>host.classList.remove('shake'),400)}
  if(e.h!=null){host.classList.add('hhit');setTimeout(()=>host.classList.remove('hhit'),600)}
  if(e.bt&&e.u!=null)fxOne({t:'flame',u:e.u})}
 else if(e.k=='fx')fxOne(e)
 else if(e.k=='tf')fxFlip(e,e.just)
 else if(e.k=='bnc')fxDie(e,'');
 else if(e.k=='die')fxDie(e,e.bt?'burnd':aoeU.has(e.uid)?'aoed':'');
 else if(e.k=='aoe')fxAoe(e)};
 dl>0?setTimeout(run,dl):run();
 if(e.k=='atk'&&e.bonus)dl=(inU.has(e.u)?360:e.post?520:0)+200})}
const fxSlot=(o,l)=>{const d=document.createElement('div');d.className='fxs';d.style.left=LX[l]+'px';d.style.top=LY[o?0:1]+'px';$('fx').appendChild(d);return d};
const fxRm=(el,ms)=>setTimeout(()=>el.remove(),ms);
function fxLunge(e,q,justIn,post){if(!q)return;const dir=e.o?1:-1,d=e.hr===0?62:94,go=()=>{
  q.style.zIndex=7;
  const an=q.animate([{transform:'translateY(0) scale(1)',easing:'ease-out'},{transform:`translateY(${-dir*10}px) scale(1.04)`,offset:.2,easing:'cubic-bezier(.55,0,1,.6)'},{transform:`translateY(${dir*d}px) scale(1.08)`,offset:.36},{transform:`translateY(${dir*d}px) scale(1.08)`,offset:.42,easing:'cubic-bezier(.2,.75,.25,1)'},{transform:'translateY(0) scale(1)'}],{duration:560});
  an.onfinish=()=>{q.style.zIndex=''};
  if(e.hr===0)setTimeout(()=>fxSpark(1-e.o,e.l),200)};
 justIn?setTimeout(go,360):post?setTimeout(go,520):go()}
const HOLD=new Map();
function holdUnits(){const now=performance.now();HOLD.forEach((t,u)=>{const el=document.querySelector(`#board [data-u="${u}"]`);if(t<now){HOLD.delete(u);if(el)el.style.visibility='';return}if(el)el.style.visibility='hidden'})}
function fxFlip(e,justIn){const live=findLive(e.u);if(!live)return;
 const dl=justIn?.55:.2,tot=(dl+.5)*1000,sl=fxSlot(e.o,e.l),f={id:e.from,atk:e.atk,hp:e.hp,mx:e.hp,d:CD[e.from],kw:new Set()},cl=e.o?'e ':'';
 sl.insertAdjacentHTML('beforeend',`<div class="tfw${justIn?' justin':''}" style="--dl:${dl}s"><div class="tfo">${cardHTML(f,1,cl)}</div><div class="tfn">${cardHTML(live,1,cl)}</div></div>`);
 HOLD.set(e.u,performance.now()+tot);holdUnits();
 setTimeout(()=>fxLand(e.u),dl*1000);
 setTimeout(()=>{holdUnits();const el=document.querySelector(`#board [data-u="${e.u}"]`);if(el&&!HOLD.has(e.u))el.style.visibility=''},tot+30);
 fxRm(sl,tot+60)}
function fxDie(e,v){const sl=fxSlot(e.o,e.lane),f={id:e.id,atk:e.atk,hp:e.hp,mx:e.hp,d:CD[e.id],kw:new Set()};
 sl.insertAdjacentHTML('beforeend',cardHTML(f,1,(e.o?'e ':'')+'dying '+v));
 if(v=='burnd'){sl.insertAdjacentHTML('beforeend','<div class=\"char\"></div><div class=\"flm1\"></div><div class=\"emb\">'+[0,1,2,3].map(i=>`<b style=\"left:${22+i*18}%;--dx:${i%2?14:-14}px;animation-delay:${(i*.12).toFixed(2)}s\"></b>`).join('')+'</div>');fxRm(sl,1200)} else if(v=='aoed'){sl.insertAdjacentHTML('beforeend','<div class="fxr" style="--c:#ff5a3c"></div>');fxRm(sl,1000)}
 else fxRm(sl,900)}
const AOEC=e=>{const T=e.T;return T=='DealDamage'?['dmg','#ff2b2b']:T=='DestroyUnit'?['des','#c4161c']:(T=='Heal'||T=='HealToFull')?['heal','#ffffff']:T=='BuffStats'?(e.pos?['buff','#ffffff']:['deb','#c4161c']):['sil','#ffffff']};
const slotOf=uid=>{const x=findLive(uid);return x?{o:x.o,l:x.lane}:null};
function fxLand(uid){const p=slotOf(uid);if(!p)return;const sl=fxSlot(p.o,p.l);sl.insertAdjacentHTML('beforeend','<div class=\"fxr land\" style=\"--c:#fff\"></div>');fxRm(sl,700)}
function fxPierce(e){if(e.bl==null||e.bl<0)return;const dir=e.bo?1:-1,sl=fxSlot(1-e.bo,e.bl);sl.style.setProperty('--d',(dir*150)+'px');sl.insertAdjacentHTML('beforeend','<div class="fxe bkr"></div><div class="bkl"></div>');fxRm(sl,1100)}
function fxSpark(o,l){if(l==null||l<0)return;const sl=fxSlot(o,l);sl.insertAdjacentHTML('beforeend','<div class=\"fxe hit\"></div><div class=\"sl w\"></div><div class=\"sl r\"></div>');fxRm(sl,600)}
const chevs=(cls,n)=>Array.from({length:n},(_,i)=>`<i class=\"chev ${cls}\" style=\"left:${14+i*30}%;animation-delay:${(i*.11).toFixed(2)}s\"></i>`).join('');
const pluses=(n)=>Array.from({length:n},(_,i)=>`<b class=\"plus\" style=\"left:${12+i*15}%;animation-delay:${(i*.09).toFixed(2)}s\">+</b>`).join('');
function fxOne(e){
 if(e.h!=null){const host=$(e.h?'ehero':'phero');if(e.t=='heal'&&host){const s=document.createElement('span');s.className='pn up';s.textContent='+'+e.n;host.appendChild(s);setTimeout(()=>s.remove(),1000);host.classList.add('hglow');setTimeout(()=>host.classList.remove('hglow'),900)}return}
 const p=slotOf(e.u);if(!p)return;const sl=fxSlot(p.o,p.l);let h='',ms=1300;
 if(e.t=='heal'){h='<div class=\"fxe heal\"></div>'+pluses(5)+(e.n?`<span class=\"pn up\">+${e.n}</span>`:'')}
 else if(e.t=='buff'){const dn=e.a<0||e.hp<0;h=`<div class=\"fxe ${dn?'deb':'buff'}\"></div>`+chevs(dn?'dn':'',3)+`<span class=\"pn ${dn?'':'up'}\">${(e.a>=0?'+':'')+e.a}/${(e.hp>=0?'+':'')+e.hp}</span>`}
 else if(e.t=='sil'){h='<div class=\"fxe sil\"></div><div class=\"fxr\" style=\"--c:#fff\"></div>'}
 else if(e.t=='flame'){h='<div class=\"fxe flame\"></div>';ms=1100}
 else if(e.t=='st'){
  if(e.s=='Marked')h='<div class=\"fxm\"></div>';
  else if(e.s=='Stunned')h='<div class=\"fxe stun\"></div><div class=\"fxz\"><i></i><i style=\"animation-delay:-.33s\"></i><i style=\"animation-delay:-.66s\"></i></div>';
  else if(e.s=='Burning')h='<div class=\"fxe flame\"></div>';
  else h='<div class=\"fxe buff\"></div>'+chevs('',3)}
 sl.insertAdjacentHTML('beforeend',h);fxRm(sl,ms)}
function fxAoe(e){const[c,col]=AOEC(e),L=$('fx');
 const fl=document.createElement('div');fl.className='fxflash';fl.style.setProperty('--c',col);L.appendChild(fl);fxRm(fl,600);
 e.us.slice().sort((a,b)=>a.l-b.l).forEach((x,i)=>{const sl=fxSlot(x.o,x.l),d=(i*.07).toFixed(2)+'s';
  sl.insertAdjacentHTML('beforeend',`<div class="fxe ${c}" style="animation-delay:${d}"></div><div class="fxr" style="--c:${col};animation-delay:${d}"></div>`);fxRm(sl,1300)})}
function pickCard(title,cards,cb){$('mt').textContent=title;$('mok').style.display='none';
 $('mh').innerHTML=cards.map((c,i)=>`<div class="slot2" data-m="${i}">${cardHTML(c,0)}</div>`).join('');
 $('mh').onclick=e=>{const m=e.target.closest('[data-m]');if(!m)return;$('mul').style.display='none';$('mok').style.display='';cb(cards[+m.dataset.m])};
 $('mul').style.display='flex'}
const scl=()=>$('stage').getBoundingClientRect().width/1920;
function flyCard(id,from,to,o){o=o||{};if(o.out)sfx('spellCast');return new Promise(res=>{const f=document.createElement('div');f.className='fly';f.innerHTML=cardHTML({id,uid:0,fc:o.fc,ba:o.ba||0},0);
 const LW=300,LH=LW*from.height/from.width,s0=from.width/LW,s1=to.width/LW;
 Object.assign(f.style,{left:from.left+'px',top:from.top+'px',width:LW+'px',height:LH+'px'});document.body.appendChild(f);
 const dx=to.left-from.left,dy=to.top-from.top,t0=`translate(0,0) scale(${s0})`,t1=`translate(${dx}px,${dy}px) scale(${s1})`;
 const a=f.animate([{transform:t0},{transform:t1}],{duration:o.dur||430,easing:'cubic-bezier(.2,.85,.25,1)',fill:'forwards'});
 a.onfinish=()=>{if(!o.out){f.remove();return res()}
  setTimeout(()=>{f.animate([{transform:t1,opacity:1},{transform:`translate(${dx}px,${dy}px) scale(${s1*1.1})`,opacity:0}],{duration:260,easing:'ease-out',fill:'forwards'}).onfinish=()=>{f.remove();res()}},o.hold||320)}})}
const slotRect=(r,i)=>document.querySelector(`#board .slot[data-r="${r}"][data-i="${i}"]`).getBoundingClientRect();
function centerRect(){const k=scl(),b=$('board').getBoundingClientRect(),w=300*k,h=w*368/260;return{left:b.left+(b.width-w)/2,top:b.top+(b.height-h)/2,width:w,height:h}}
function heroFrom(){const k=scl(),r=$('ehero').getBoundingClientRect();return{left:r.left+r.width/2-45*k,top:r.top+r.height/2-64*k,width:90*k,height:127*k}}
function cancel(){sel=pend=null;castMode=false;say('');render()}
function mmsg(){const n=pend.multi.length;say(`<b>${CD[G.p[0].hand[pend.ci].id].Name}</b>: click friendly units to sacrifice (+1/+1 each) <button data-mok="1">${n?'Sacrifice '+n:'Sacrifice none'}</button>`,1)}
function nextPick(){const me=G.p[0],d=CD[me.hand[pend.ci].id],ks=apicks(G,me,d,pend.got,pend.ln);
 if(pend.got.length<ks.length){const k=ks[pend.got.length];
  if(d.Type=='Unit'&&['e','f','a'].includes(k)){const r=req(G,me,k,ks.f[pend.got.length]);if(r.length==1){pend.got.push(r[0]);nextPick();return}}
  if(k=='L'){const r=req(G,me,'L',null,laneEx());if(r.length==1){pend.got.push(r[0]);nextPick();return}}
  render();
  if(k=='C'){const e=d.Effects.find(x=>x.ChoiceLabels);say(`<b>${d.Name}</b>: `+e.ChoiceLabels.map((l,i)=>`<button data-ch="${i}" ${choiceOK(G,me,d,i)?'':'disabled'}>${l}</button>`).join(''),1)}
  else if(k=='D'){say(ASK.D,1);pickCard(d.Name+' - choose a card from your deck',[...me.deck].sort((a,b)=>CD[a.id].Cost-CD[b.id].Cost||CD[a.id].Name.localeCompare(CD[b.id].Name)),c=>{pend.got.push(c);nextPick()})}
  else if(k=='M'){pend.multi=[];mmsg()}
  else if(k=='S'&&optSac(d))say(`<b>${d.Name}</b>: sacrifice a unit? (red outline) <button data-skip="1">Don't sacrifice</button>`,1);
  else say(k=='L'?`<b>${d.Name}</b>: ${ASK.L} (white outline)`:ASK[k]+' (red outline)',1);return}
 const p=pend;sel=pend=null;castMode=false;doPlay(p)}
async function doPlay(p){const me=G.p[0],c=me.hand[p.ci],d=CD[c.id];say('');busy=true;
 const el=document.querySelector(`#hand [data-hid="${c.uid}"]`),sp=d.Type=='Spell';
 const from=el?el.getBoundingClientRect():{left:innerWidth/2-60,top:innerHeight-200,width:120,height:170};
 if(el)el.style.visibility='hidden';const fc=cost(G,me,c);
 await flyCard(c.id,from,sp?centerRect():slotRect(0,p.ln),{out:sp,dur:sp?480:380,hold:sp?300:0,fc,ba:c.ba});
 if(NET&&!NET.host){netSend({t:'move',ci:p.ci,ln:p.ln,pk:p.got.map(descr)});armSync();return}
 const ok=play(G,me,p.ci,p.ln,p.got);busy=false;render();anim();
 if(NET&&ok)netPush({fly:{id:c.id,sp:sp?1:0,ln:p.ln,by:0,fc,ba:c.ba||0}})}
function begin(ci,ln){pend={ci,ln,got:[]};nextPick()}
function selectHand(i){const me=G.p[0];pend=null;castMode=false;sel=sel==i?null:i;say('');render();if(sel==null)return;
 const c=me.hand[i],d=CD[c.id];
 if(!playable(G,me,i)){const why=cost(G,me,c)>me.b?'not enough Blood':G.allow=='U'&&d.Type!='Unit'?'only Units now':G.allow=='A'&&d.Type!='Spell'?'only Actions now':'no valid target';say(`Can't play ${d.Name} now (${why})`);return}
 if(d.Type=='Spell'){const ks=apicks(G,me,d);if(ks.length)begin(i,null);else{castMode=true;render();say(`<b>${d.Name}</b>: click anywhere on the board to cast`,1)}}
 else say(`Choose a free lane for ${d.Name}`,1)}
document.addEventListener('click',e=>{if(!G||G.over||$('game').style.display!='block')return;
 const t=e.target,hd=t.closest('[data-h]'),sl=t.closest('#board .slot'),me=G.p[0];
 if(t.dataset.cancel){if(pend&&pend.pre)return;cancel();return}
 if(!t.closest('[data-u],[data-c]'))stickyZoom=false,hideZoom();
 if(pend&&pend.pre){if(sl){const u2=G.p[+sl.dataset.r].ln[+sl.dataset.i];if(u2&&validTargets().includes(u2)){const r=pendRes;pend=null;say('');r(u2)}}return}
 if(t.dataset.skip&&pend&&!pend.pre&&mine()){pend.got.push(NOSAC);nextPick();return}
 if(t.dataset.ch!=null&&pend&&!t.disabled){pend.got.push(+t.dataset.ch);nextPick();return}
 if(t.dataset.mok&&pend&&pend.multi){pend.got.push(pend.multi.slice());pend.multi=null;nextPick();return}
 if(!mine()){const u=t.closest('[data-u]');if(u){stickyZoom=true;showZoom(findLive(u.dataset.u),1)}return}
 if(hd){selectHand(+hd.dataset.h);return}
 if(pend&&kind()=='eh'&&t.closest('#ehero')){pend.got.push(H(1));nextPick();return}
 if(castMode&&t.closest('#board')){const ci=sel;castMode=false;sel=null;doPlay({ci,ln:null,got:[]});return}
 if(sl){const r=+sl.dataset.r,i=+sl.dataset.i,u=G.p[r].ln[i];
  if(pend){if(kind()=='L'){if(!u&&r==0&&validTargets().includes(i)){pend.got.push(i);nextPick()}return}
   if(u&&validTargets().includes(u)){if(kind()=='M'){const a=pend.multi,j=a.indexOf(u);j<0?a.push(u):a.splice(j,1);render();mmsg()}else{pend.got.push(u);nextPick()}}return}
  if(sel!=null&&r==0&&!u&&CD[me.hand[sel].id].Type=='Unit'&&canPlay(G,me,sel,i)){begin(sel,i);return}
  if(u){stickyZoom=true;showZoom(u,1)}}});
document.addEventListener('contextmenu',e=>{if(G&&$('game').style.display=='block'&&(sel!=null||pend)){e.preventDefault();if(!(pend&&pend.pre))cancel()}});
document.addEventListener('keydown',e=>{if(!G||$('game').style.display!='block'||e.target.tagName=='INPUT'||$('setmenu').style.display=='flex')return;
 if((e.key=='Enter'||e.key==' ')&&mine()&&pend&&pend.multi){e.preventDefault();pend.got.push(pend.multi.slice());pend.multi=null;nextPick();return}
 if((e.key=='Enter'||e.key==' ')&&mine()){e.preventDefault();if(castMode){const ci=sel;castMode=false;sel=null;doPlay({ci,ln:null,got:[]})}else $('end').click()}
 if(e.key=='l'||e.key=='L')showHist();
 if(e.key=='Escape'&&viewing){closeMul();return}
 if(e.key=='Escape'&&$('modal').style.display=='flex'){$('modal').style.display='none';return}
 if(e.key=='Escape'&&!busy&&!(pend&&pend.pre))cancel();
 if(/^[1-8]$/.test(e.key)&&mine()&&G.p[0].hand[+e.key-1])selectHand(+e.key-1)});
let drag=null,dragSupp=false;
document.addEventListener('click',e=>{if(dragSupp){e.stopImmediatePropagation();e.preventDefault()}},true);
function choiceSpot(el,d){const me=G.p[0],ef=(d.Effects||[]).find(x=>x.ChoiceLabels);if(!ef||!el)return null;
 for(let j=0;j<ef.Actions.length;j++){const a=ef.Actions[j];let node=null,unit=null;
  if(a.Type=='DrawCard')node=el.closest('#deckb');
  else if(a.Type=='DrawFromDiscard')node=el.closest('#pile');
  else if(a.Target=='EnemyHero')node=el.closest('#ehero');
  else if(a.Target=='TargetEnemyUnit'){const sl=el.closest('#board .slot');
   if(sl&&+sl.dataset.r==1){unit=G.p[1].ln[+sl.dataset.i];const k=apicks(G,me,d,[j])[1];if(!unit||!k||!req(G,me,k,apicks(G,me,d,[j]).f[1]).includes(unit))unit=null;else node=sl}}
  if(node)return{node,j,unit,ok:choiceOK(G,me,d,j)}}
 return null}
function dropInfo(el){const me=G.p[0];if(!el||sel==null||!me.hand[sel])return null;
 const d=CD[me.hand[sel].id],sl=el.closest&&el.closest('#board .slot');
 if(d.Type=='Unit'){if(sl&&+sl.dataset.r==0&&!me.ln[+sl.dataset.i]&&canPlay(G,me,sel,+sl.dataset.i))return{node:sl,ok:1,run:()=>sl.click()};return null}
 if(castMode)return el.closest('#board')?{node:null,ok:1,run:()=>el.click()}:null;
 if(pend){const k=kind();
  if(k=='L'){if(sl&&+sl.dataset.r==0&&!me.ln[+sl.dataset.i]&&validTargets().includes(+sl.dataset.i))return{node:sl,ok:1,run:()=>sl.click()};return null}
  if(k=='eh'&&el.closest('#ehero'))return{node:el.closest('#ehero'),ok:1,run:()=>el.click()};
  if(sl){const u=G.p[+sl.dataset.r].ln[+sl.dataset.i];if(u&&validTargets().includes(u))return{node:sl,ok:1,run:()=>el.click()}}
  return null}
 const cs=choiceSpot(el,d);
 if(cs)return{node:cs.node,ok:cs.ok,run:()=>{if(!cs.ok){cancel();say("Can't choose that option right now");return}
  pend={ci:sel,ln:null,got:[cs.j]};if(cs.unit)pend.got.push(cs.unit);nextPick()}};
 return null}
const ringOf=n=>n.id=='ehero'?n.querySelector('.ring'):n;
function dropOn(el){const i=dropInfo(el);if(i)i.run();else cancel()}
function dragZones(on){document.querySelectorAll('.dz,.dh').forEach(x=>x.classList.remove('dz','dh'));if(!on||sel==null)return;
 const me=G.p[0],d=CD[me.hand[sel].id];if(d.Type!='Spell'||pend||castMode)return;const ef=(d.Effects||[]).find(x=>x.ChoiceLabels);if(!ef)return;
 ef.Actions.forEach((a,j)=>{if(!choiceOK(G,me,d,j))return;
  if(a.Type=='DrawCard')$('deckb').classList.add('dz');else if(a.Type=='DrawFromDiscard')$('pile').classList.add('dz');
  else if(a.Target=='EnemyHero')ringOf($('ehero')).classList.add('dz');
  else if(a.Target=='TargetEnemyUnit'){const k=apicks(G,me,d,[j])[1];if(k)req(G,me,k,apicks(G,me,d,[j]).f[1]).forEach(u=>{const sl=document.querySelector(`#board .slot[data-r="${u.o}"][data-i="${u.lane}"]`);if(sl)sl.classList.add('dz')})}})}
document.addEventListener('pointerdown',e=>{if(e.button!==0||!G||$('game').style.display!='block'||!mine()||(pend&&pend.pre))return;
 const hc=e.target.closest('#hand .hc');if(!hc)return;drag={hc,i:+hc.dataset.h,x:e.clientX,y:e.clientY,on:false}});
document.addEventListener('pointermove',e=>{if(!drag)return;
 if(!drag.on){if(Math.hypot(e.clientX-drag.x,e.clientY-drag.y)<10)return;
  const me=G.p[0],i=drag.i,c=me.hand[i];
  if(!c||!playable(G,me,i)){drag=null;return}
  const d=CD[c.id],k0=d.Type=='Spell'?apicks(G,me,d)[0]:null;if(k0=='D'||(k0=='C'&&!(d.Effects||[]).some(x=>x.ChoiceLabels))){drag=null;return}
  stickyZoom=false;$('zoom').style.display='none';
  if(k0=='C'){cancel();sel=i;render()}else if(sel!=i)selectHand(i);
  dragZones(true);
  const w=190*scl()*1.1,g=document.createElement('div');g.className='dragghost';g.style.width=w+'px';g.innerHTML=cardHTML(c,0);document.body.appendChild(g);
  drag.g=g;drag.w=w;drag.on=true;drag.hc.classList.add('dragging')}
 drag.g.style.left=e.clientX-drag.w/2+'px';drag.g.style.top=e.clientY-drag.w*0.7+'px';
 document.querySelectorAll('.dh').forEach(x=>x.classList.remove('dh'));
 const inf=dropInfo(document.elementFromPoint(e.clientX,e.clientY));if(inf&&inf.ok&&inf.node)ringOf(inf.node).classList.add('dh')});
function endDrag(e,drop){if(!drag)return;const d=drag;drag=null;if(!d.on)return;
 d.g.remove();dragZones(false);
 const el=drop?document.elementFromPoint(e.clientX,e.clientY):null;
 dragSupp=true;setTimeout(()=>{dragSupp=false;if(G&&!G.over)dropOn(el)},0)}
document.addEventListener('pointerup',e=>endDrag(e,true));
document.addEventListener('pointercancel',e=>endDrag(e,false));
function choosePre(u){return new Promise(r=>{pendRes=r;pend={ks:['e'],got:[],pre:true};render();say(`<b>${u.d.Name}</b> - before combat: choose an enemy unit (red outline)`)})}
let LUN=[];
function strikeLane(i){LUN=[];const A=G.p[0].ln[i],B=G.p[1].ln[i],both=!!(A&&B);
 [[0,A],[1,B]].forEach(([r,u])=>{if(!u||u.atk<=0||u.kw.has('Stunned'))return;
  const el=document.querySelector(`#board .slot[data-r="${r}"][data-i="${i}"] .card`);if(!el)return;const dir=r?1:-1,d=both?62:94;el.style.zIndex=7;
  el.animate([{transform:'translateY(0) scale(1)',easing:'ease-out'},{transform:`translateY(${-dir*12}px) scale(1.04)`,offset:.42,easing:'cubic-bezier(.55,0,1,.6)'},{transform:`translateY(${dir*d}px) scale(1.08)`}],{duration:320,fill:'forwards'});
  LUN.push({uid:u.uid,off:dir*d})});
 return sleep(LUN.length?340:140)}
function recoil(){LUN.forEach(x=>{const el=document.querySelector(`#board [data-u="${x.uid}"]`);if(!el)return;el.style.zIndex=6;
  el.animate([{transform:`translateY(${x.off}px) scale(1.08)`},{transform:'translateY(0) scale(1)'}],{duration:480,easing:'cubic-bezier(.2,.75,.25,1)'})});LUN=[]}
async function combat(my){for(let i=0;i<4&&!G.over&&my==gid;i++){flash=i;render();
  const pre={},opts=preTargets(G,G.p[0].ln[i]);
  if(opts)pre[0]=opts.length==1?opts[0]:await choosePre(G.p[0].ln[i]);
  if(NET){const o1=preTargets(G,G.p[1].ln[i]);if(o1)pre[1]=o1.length==1?o1[0]:await askPre(i,o1);if(my!=gid)return}
  say('');render();
  await strikeLane(i);if(my!=gid)return;lane(G,i,pre);flash=-1;const pb=G.ev.some(x=>x.k=='atk'&&x.post);render();anim();recoil();if(NET)netPush({t:'lane',i});await sleep(pb?1150:650)}}
async function flow(){busy=true;const my=gid;
 while(!G.over&&my==gid){
  if(G.step>=3){say('Combat!');netPush();await combat(my);if(G.over||my!=gid)break;endRound(G);startRound(G);say('');render();anim();continue}
  if(G.act==0){busy=false;say('');render();netPush();return}
  if(NET){say('Opponent: '+PH[G.allow]+'…');render();netPush();return}
  say('Enemy: '+PH[G.allow]+'…');render();let n=0;
  while(n++<20&&!G.over&&my==gid){await sleep(450);if(my!=gid)return;const m=botPlan(G,G.p[1]);if(!m)break;
   const bc=G.p[1].hand[m.ci],fc=bc?cost(G,G.p[1],bc):null;await flyCard(m.id,heroFrom(),m.sp?centerRect():slotRect(1,m.ln),{out:!!m.sp,dur:m.sp?480:380,hold:300,fc,ba:bc&&bc.ba});if(my!=gid)return;
   play(G,G.p[1],m.ci,m.ln,m.pk);render();anim()}
  await sleep(300);if(my!=gid)return;nextStep(G)}
 if(my==gid){render();netPush()}}
function showHist(){const rows=G.hist.slice().reverse().map(h=>`<div class="hr"><img src="${artSrc(h.id)}" alt="" onerror="artErr(this,${h.id})"><span><b>${CD[h.id].Name}</b> ${CD[h.id].Type=='Spell'?'cast':'played'} by ${h.p?'Enemy':'You'}${h.tg?' -> '+h.tg:''}<br><small>Round ${h.t}</small></span></div>`).join('')||'<small>No cards played yet.</small>';
 $('hist').innerHTML=`<div class="hb"><h3>Cards played</h3>${rows}<h3>Events</h3><small>${G.log.slice().reverse().slice(0,120).join('<br>')}</small><p><small>(click anywhere to close)</small></p></div>`;$('hist').style.display='flex'}
$('hs').onclick=()=>{if(G)showHist()};$('strip').onclick=()=>{if(G)showHist()};$('hist').onclick=()=>$('hist').style.display='none';
let viewing=false;
function viewPile(title,cards){if(!G||$('mul').style.display=='flex')return;viewing=true;
 $('mt').textContent=title;$('mok').style.display='';$('mok').textContent='Close';$('mok').onclick=closeMul;
 $('mh').innerHTML=cards.length?cards.map(c=>`<div class="slot2">${cardHTML(c,0)}</div>`).join(''):'<small style="font-size:30px">Empty</small>';
 $('mh').style.setProperty('--cw',fitW(cards.length)+'px');$('mh').onclick=null;$('mul').style.display='flex'}
function fitW(n){for(let w=190;w>=60;w-=2){const g=Math.round(w/9),cols=Math.max(1,Math.floor(1700/(w+g))),rows=Math.ceil(Math.max(n,1)/cols);if(rows*(w*368/260+g)<=760)return w}return 60}
$('pile').onclick=()=>{if(G)viewPile('Your discard pile ('+G.p[0].disc.length+') - newest first',G.p[0].disc.slice().reverse())};
$('deckb').onclick=()=>{if(G)viewPile('Your deck ('+G.p[0].deck.length+') - sorted by cost',G.p[0].deck.slice().sort((a,b)=>cmpC(CD[a.id],CD[b.id])))};
$('pile').title='Click to view your discard pile';$('deckb').title='Click to view the cards left in your deck';
function closeMul(){viewing=false;$('mh').style.removeProperty('--cw');$('mul').style.display='none';$('mok').textContent='Confirm';$('mok').onclick=mulOK}
function finish(){if($('ov').style.display=='flex')return;$('ovd').style.display=$('ovr').style.display=='none'?'none':'';$('ovdk').textContent=ovDeckLabel();$('ovt').textContent=G.over.left?'OPPONENT LEFT':G.over.draw?'DRAW':G.over.sur&&G.over.win==1?'SURRENDERED':G.over.win==0?'VICTORY':'DEFEAT';sfx(G.over.left||(!G.over.draw&&G.over.win==0)?'victory':'defeat',{pitch:0});$('ov').style.display='flex'}
$('end').onclick=()=>{if(!mine())return;sfx('endTurn');sel=pend=null;castMode=false;say('');
 if(NET&&!NET.host){busy=true;netSend({t:'end'});armSync();return}
 nextStep(G);flow()};
$('sur').onclick=()=>{if(G&&!G.over)$('modal').style.display='flex'};$('mno').onclick=()=>$('modal').style.display='none';
$('myes').onclick=()=>{$('modal').style.display='none';if(!G||G.over)return;if(NET&&!NET.host){netSend({t:'sur'});return}
 G.over={win:1,sur:1};L(G,'You surrendered');pend=null;sel=null;castMode=false;say('');$('mul').style.display='none';$('hist').style.display='none';render();netPush()};
$('ovr').onclick=()=>NET?rematch():start();
const ovDeckLabel=()=>ALL[$('d0').value]?'Your deck: '+ALL[$('d0').value].n:'';
let pkPrev=0;
$('ovd').onclick=()=>{pkPrev=$('d0').selectedIndex;$('dkpick').style.display='flex';pkReveal('pk2')};
$('dkok').onclick=()=>{$('dkpick').style.display='none';$('ovdk').textContent=ovDeckLabel()};
$('dkcancel').onclick=()=>{$('d0').selectedIndex=pkPrev;syncPickers();$('dkpick').style.display='none'};
$('dkpick').addEventListener('click',e=>{if(e.target===$('dkpick'))$('dkcancel').click()});
$('dkpick').addEventListener('dblclick',e=>{if(e.target.closest('.pk'))$('dkok').click()});
addEventListener('keydown',e=>{if(e.key=='Escape'&&$('dkpick').style.display=='flex')$('dkcancel').click()});
function showMul(){mulSel=new Set();$('mt').textContent='Mulligan - click cards to replace';$('mok').style.display='';$('mh').style.display='';$('mpr').style.display='none';
 const draw=()=>{$('mh').innerHTML=G.p[0].hand.map(c=>`<div class="slot2 ${mulSel.has(c.uid)?'rm':''}" data-m="${c.uid}">${cardHTML(c,0)}</div>`).join('')};draw();
 $('mh').onclick=e=>{const m=e.target.closest('[data-m]');if(!m)return;const k=+m.dataset.m;mulSel.has(k)?mulSel.delete(k):mulSel.add(k);draw()};
 $('mul').style.display='flex'}
function askOrder(cb){$('mt').textContent='Your new hand - do you prefer to go first or second?';$('mok').style.display='none';$('mh').onclick=null;
 $('mh').innerHTML=G.p[0].hand.map(c=>`<div class="slot2">${cardHTML(c,0)}</div>`).join('');$('mh').style.display='';$('mpr').style.display='flex';$('mul').style.display='flex';
 const go=v=>{$('mpr').style.display='none';$('mul').style.display='none';cb(v)};$('mfirst').onclick=()=>go('first');$('msecond').onclick=()=>go('second')}
const mulOK=()=>{const ids=[...mulSel];
 if(NET){
  if(NET.host){mulligan(G,G.p[0],ids);NET.mull[0]=1;render();askOrder(v=>{NET.pref[0]=v;say('Waiting for opponent…');tryBegin()})}
  else{netSend({t:'mull',ids});$('mok').style.display='none';$('mt').textContent='Swapping your cards…';NET.ao=v=>{say('Waiting for opponent…');netSend({t:'pref',v})}}
  return}
 mulligan(G,G.p[0],ids);botMull(G,G.p[1]);
 askOrder(v=>{decideStart(G,v,'first');startRound(G);flow()})};
$('mok').onclick=mulOK;
function start(){if(NET)netLeave();$('ovr').style.display='';$('ovr').textContent='Rematch';gid++;BOTMODE=$('bot').value;G=newGame(ALL[$('d0').value].c,ALL[$('d1').value].c);busy=true;sel=pend=null;castMode=false;stickyZoom=false;
 show('game');$('ov').style.display='none';say('');render();showMul()}
function toMenu(){$('dkpick').style.display='none';if(NET)netLeave();$('ovr').style.display='';$('ovr').textContent='Rematch';gid++;$('ov').style.display='none';$('mul').style.display='none';$('hist').style.display='none';show('menu');$('zoom').style.display='none';G=null;musicUpdate()}
$('go').onclick=()=>{$('botmenu').style.display='none';start();musicStart()};
$('ovb').onclick=toMenu;
const cmpC=(a,b)=>(a.Cost-b.Cost)||((a.Type==b.Type)?0:a.Type=='Unit'?-1:1)||a.Name.localeCompare(b.Name);
const bcards=CARDS.filter(c=>c.Id<900).sort(cmpC);
(()=>{
const hesc=s=>String(s).replace(/[&<>"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]));
const refit=()=>requestAnimationFrame(()=>{if(typeof fitAll=='function')fitAll()});
let E=null,bview='cards',selDeck=null,delConf=null,mOpen=false,popOpen=null;
const btot=()=>E?Object.values(E.cards).reduce((a,b)=>a+b,0):0;
const allDecks=()=>[...loadC().map(d=>({...d,custom:1})),...DECKS.map(d=>({...d,built:1}))];
const countsOf=ids=>{const m={};ids.forEach(id=>{if(CD[id]&&id<900)m[id]=(m[id]||0)+1});return m};
const expand=m=>Object.keys(m).map(Number).sort((a,b)=>a-b).flatMap(id=>Array(m[id]).fill(id));
const uniqName=base=>{const t=new Set(allDecks().map(d=>d.n));if(!t.has(base))return base;for(let i=2;;i++)if(!t.has(base+' ('+i+')'))return base+' ('+i+')'};
const iconId=m=>{let b=null;Object.keys(m).forEach(k=>{const c=CD[k];if(!c||!m[k])return;
 if(!b||c.Cost>b.Cost||(c.Cost==b.Cost&&(c.Attack||0)+(c.Health||0)>(b.Attack||0)+(b.Health||0)))b=c});return b};
const statsOf=m=>{let n=0,u=0,sp=0,sum=0;const cv=Array(8).fill(0);
 for(const k in m){const c=CD[k],q=m[k];if(!c)continue;n+=q;if(c.Type=='Unit')u+=q;else sp+=q;sum+=c.Cost*q;cv[Math.min(7,c.Cost)]+=q}
 return{n,u,sp,avg:n?sum/n:0,cv}};
const imgTag=(id,cls)=>`<img ${cls?`class="${cls}" `:''}src="${artSrc(id)}" alt="" draggable="false" onerror="artErr(this,${id})">`;

let toastT=0;
function toast(msg,bad){const t=$('btoast');t.textContent=msg;t.className='on'+(bad?' bad':'');clearTimeout(toastT);toastT=setTimeout(()=>t.className='',2400)}
const closeModal=()=>{$('bmodal').style.display='none';mOpen=false};
function modal({title,text,ta,buttons}){
 $('mtitle').textContent=title;const p=$('mtext');p.textContent=text||'';p.hidden=!text;p.className='';
 const t=$('mta');t.hidden=!ta;if(ta){t.value=ta.value||'';t.readOnly=!!ta.readonly;t.placeholder=ta.placeholder||''}
 const bx=$('mbtns');bx.innerHTML='';
 buttons.forEach(b=>{const el=document.createElement('button');el.textContent=b.label;if(b.pri)el.className='pri';
  el.onclick=()=>{if(!b.fn||b.fn(t.value)!==false)closeModal()};bx.appendChild(el)});
 $('bmodal').style.display='flex';mOpen=true;if(ta){t.focus();if(ta.readonly)t.select()}}
const mSay=(s,bad)=>{const p=$('mtext');p.textContent=s;p.hidden=!s;p.className=bad?'bad':''};
async function copyText(s){try{await navigator.clipboard.writeText(s);return true}catch(e){
 try{const t=$('mta');t.focus();t.select();return document.execCommand('copy')}catch(e2){return false}}}

const B32='0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const rng=s=>()=>{s=(s+0x6D2B79F5)|0;let t=Math.imul(s^(s>>>15),1|s);t=(t+Math.imul(t^(t>>>7),61|t))^t;return((t^(t>>>14))>>>0)/4294967296};
const ckOf=ents=>{let k=ents.length+11;ents.forEach(([id,q])=>{k=(k*31+id*4+q)%251});return k};
function deckEncode(m){
 const ents=Object.keys(m).map(Number).filter(id=>m[id]>0&&CD[id]).sort((a,b)=>a-b).map(id=>[id,Math.min(3,m[id])]);
 if(!ents.length)return'';
 const ck=ckOf(ents),bits=[],put=(v,n)=>{for(let i=n-1;i>=0;i--)bits.push((v>>i)&1)};
 put(ck,8);put(1,4);put(ents.length,6);ents.forEach(([id,q])=>{put(id,12);put(q,2)});
 const r=rng(ck*7919+12345);for(let i=8;i<bits.length;i++)bits[i]^=(r()*2)|0;
 while(bits.length%5)bits.push((r()*2)|0);
 let s='';for(let i=0;i<bits.length;i+=5)s+=B32[bits[i]*16+bits[i+1]*8+bits[i+2]*4+bits[i+3]*2+bits[i+4]];
 return s.match(/.{1,5}/g).join('-')}
function deckDecode(txt){
 txt=(txt||'').trim();if(!txt)throw'Paste a deck code first.';
 if(txt[0]=='{'){let d;try{d=JSON.parse(txt)}catch(e){throw'That code is not valid.'}
  if(!d||!Array.isArray(d.c))throw'That code is not valid.';const m=countsOf(d.c);Object.keys(m).forEach(k=>m[k]=Math.min(3,m[k]));
  if(!Object.keys(m).length)throw'That code has no cards from this version of the game.';return{cards:m,name:typeof d.n=='string'?d.n.slice(0,24):''}}
 const s=txt.toUpperCase().replace(/[^0-9A-Z]/g,'').replace(/O/g,'0').replace(/[IL]/g,'1').replace(/U/g,'V'),BAD='That code is not valid.';
 if(s.length<8)throw BAD;
 const bits=[];for(const ch of s){const v=B32.indexOf(ch);if(v<0)throw BAD;for(let i=4;i>=0;i--)bits.push((v>>i)&1)}
 let p=0;const get=n=>{if(p+n>bits.length)throw BAD;let v=0;for(let i=0;i<n;i++)v=v*2+bits[p++];return v};
 const ck=get(8),r=rng(ck*7919+12345);for(let i=8;i<bits.length;i++)bits[i]^=(r()*2)|0;
 if(get(4)!=1)throw'This code is from a different version of the game.';
 const n=get(6);if(!n||n>30)throw BAD;const ents=[];for(let i=0;i<n;i++){const id=get(12),q=get(2);if(!q)throw BAD;ents.push([id,q])}
 if(bits.length-p>4||ckOf(ents)!=ck)throw BAD;
 const m={};let tot=0;for(const[id,q]of ents){if(!CD[id]||id>=900||m[id])throw'This code contains cards that do not exist in this version of the game.';m[id]=q;tot+=q}
 if(tot>30)throw'That deck has more than 30 cards.';return{cards:m}}
window.deckEncode=deckEncode;window.deckDecode=deckDecode;

function parseQ(s){const out=[],re=/(-?)(?:"([^"]*)"|(\S+))/g;let m,t;
 const NF={cost:'c',c:'c',attack:'a',atk:'a',a:'a',health:'h',hp:'h',h:'h'},SF={type:'t',t:'t',subtype:'s',sub:'s',s:'s',keyword:'k',kw:'k',k:'k'};
 while((m=re.exec(s))){const neg=!!m[1],q=m[2]!=null,w=(q?m[2]:m[3]).toLowerCase();if(!w)continue;
  if(!q&&(t=/^(cost|c|attack|atk|a|health|hp|h)(>=|<=|=|:|>|<)(\d+)$/.exec(w)))out.push({neg,k:'n',f:NF[t[1]],op:t[2]==':'?'=':t[2],v:+t[3]});
  else if(!q&&(t=/^(type|t|subtype|sub|s|keyword|kw|k):(.+)$/.exec(w)))out.push({neg,k:SF[t[1]],v:t[2]});
  else out.push({neg,k:'x',v:w})}
 return out}
const cmpN=(a,op,b)=>op=='='?a==b:op=='>='?a>=b:op=='<='?a<=b:op=='>'?a>b:a<b;
function qScore(c,terms,hay){let sc=0;const nm=c.Name.toLowerCase();
 for(const t of terms){let ok;
  if(t.k=='n'){const v=t.f=='c'?c.Cost:c.Type=='Unit'?(t.f=='a'?c.Attack:c.Health):undefined;ok=v!==undefined&&v!==null&&cmpN(v,t.op,t.v)}
  else if(t.k=='t')ok=c.Type.toLowerCase().startsWith(t.v);
  else if(t.k=='s')ok=(c.Subtypes||[]).some(x=>x.toLowerCase().includes(t.v));
  else if(t.k=='k')ok=(c.Keywords||[]).some(x=>x.toLowerCase().includes(t.v))||(c.Description||'').toLowerCase().includes(t.v);
  else{ok=hay.includes(t.v);if(ok&&!t.neg)sc+=nm.startsWith(t.v)?3:nm.includes(t.v)?2:1}
  if(t.neg?ok:!ok)return-1}
 return sc}

const SUBS=(()=>{const m=new Map();bcards.forEach(c=>(c.Subtypes||[]).forEach(s=>m.set(s,(m.get(s)||0)+1)));return[...m.entries()].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]))})();
function buildGrid(grid,editor){return bcards.map(c=>{const el=document.createElement('div');el.className='bc';el.dataset.b=c.Id;
 el.innerHTML=cardHTML({id:c.Id,uid:0,ba:0},0)+(editor?'<u></u><button class="mn" title="Remove one copy">&minus;</button>':'');grid.appendChild(el);
 const hay=[c.Name,c.Type,...(c.Subtypes||[]),...(c.Keywords||[]),c.Description||''].join(' ').toLowerCase();return{c,el,hay}})}
function mkFilter(host,grid,els,tag){
 const S={q:'',type:'',costs:new Set(),subs:new Set()};
 host.innerHTML=`<div class="frow"><div class="sbox"><input class="fq" placeholder="Search name, text, subtype..." autocomplete="off" spellcheck="false"><button class="fx ghost" title="Clear search" hidden>&times;</button></div><button class="fsub ghost">Subtype</button><button class="frst ghost" hidden>Reset</button></div>
 <div class="frow"><div class="seg"><button data-t="">All</button><button data-t="Unit">Units</button><button data-t="Spell">Spells</button></div>
 <div class="chips">${[0,1,2,3,4,5,6,7].map(k=>`<button class="chip" data-k="${k}" title="${k==7?'Cost 7 or more':'Cost '+k}">${k==7?'7+':k}</button>`).join('')}</div><span class="fcnt"></span></div>
 <div class="fhint">Tips: <b>c:3</b> <b>a&gt;=4</b> <b>hp&lt;3</b> <b>s:animal</b> <b>k:flying</b> <b>t:spell</b> <b>-word</b> to exclude</div>
 <div class="fpop">${SUBS.map(([s,n])=>`<button class="chip" data-s="${hesc(s)}">${hesc(s)} <small>${n}</small></button>`).join('')}</div>`;
 const q=host.querySelector('.fq'),fx=host.querySelector('.fx'),rst=host.querySelector('.frst'),fsub=host.querySelector('.fsub'),pop=host.querySelector('.fpop'),cnt=host.querySelector('.fcnt');
 function apply(top){const terms=parseQ(S.q.trim());let n=0;
  els.forEach(({c,el,hay},i)=>{let ok=!(S.type&&c.Type!=S.type)&&(!S.costs.size||[...S.costs].some(k=>k==7?c.Cost>=7:c.Cost==k))&&(!S.subs.size||(c.Subtypes||[]).some(x=>S.subs.has(x)));
   let sc=0;if(ok&&terms.length){sc=qScore(c,terms,hay);ok=sc>=0}
   el.hidden=!ok;el.style.order=ok?i-(terms.length?sc*1000:0):i;if(ok)n++});
  cnt.textContent=n+' / '+els.length+' cards';fx.hidden=!S.q;
  host.querySelectorAll('.seg button').forEach(b=>b.classList.toggle('on',b.dataset.t==S.type));
  host.querySelectorAll('.chips>.chip').forEach(b=>b.classList.toggle('on',S.costs.has(+b.dataset.k)));
  pop.querySelectorAll('.chip').forEach(b=>b.classList.toggle('on',S.subs.has(b.dataset.s)));
  fsub.textContent=S.subs.size?'Subtype: '+(S.subs.size==1?[...S.subs][0]:S.subs.size+' selected'):'Subtype';fsub.classList.toggle('act',!!S.subs.size);
  rst.hidden=!(S.q||S.type||S.costs.size||S.subs.size);if(top)grid.scrollTop=0;refit();window.dispatchEvent(new Event('rj-filter'))}
 q.oninput=()=>{S.q=q.value;apply(1)};
 fx.onclick=()=>{q.value='';S.q='';apply(1);q.focus()};
 q.onkeydown=e=>{if(e.key=='Escape'&&q.value){q.value='';S.q='';apply(1);e.stopPropagation()}};
 host.querySelector('.seg').onclick=e=>{const b=e.target.closest('button');if(b){S.type=b.dataset.t;apply(1)}};
 host.querySelector('.chips').onclick=e=>{const b=e.target.closest('.chip');if(!b)return;const k=+b.dataset.k;S.costs.has(k)?S.costs.delete(k):S.costs.add(k);apply(1)};
 pop.onclick=e=>{const b=e.target.closest('.chip');if(!b)return;const s=b.dataset.s;S.subs.has(s)?S.subs.delete(s):S.subs.add(s);apply(1)};
 const setPop=on=>{pop.classList.toggle('on',on);fsub.classList.toggle('open',on);popOpen=on?setPop:(popOpen===setPop?null:popOpen)};
 fsub.onclick=e=>{e.stopPropagation();const on=!pop.classList.contains('on');if(popOpen&&popOpen!==setPop)popOpen(false);setPop(on)};
 pop.onclick=(o=>e=>{e.stopPropagation();o(e)})(pop.onclick);
 rst.onclick=()=>{q.value='';S.q='';S.type='';S.costs.clear();S.subs.clear();apply(1)};
 apply();
 return{S,apply,q,toggleCost:k=>{S.costs.has(k)?S.costs.delete(k):S.costs.add(k);apply(1)},closePop:()=>setPop(false)}}
document.addEventListener('click',()=>{if(popOpen)popOpen(false)});

const cEls=buildGrid($('gcards'),false),eEls=buildGrid($('gedit'),true);
const FC=mkFilter($('fcards'),$('gcards'),cEls),FE=mkFilter($('fedit'),$('gedit'),eEls);

function setView(v){
 bview=v;if(popOpen)popOpen(false);
 [['cards','flex'],['decks','block'],['edit','flex']].forEach(([k,d])=>$('p'+k).style.display=k==v?d:'none');
 $('btabs').style.display=v=='edit'?'none':'flex';[...$('btabs').children].forEach(b=>b.classList.toggle('on',b.dataset.tab==v));
 $('btitle').textContent=v=='edit'?(E.fresh?'New deck':'Edit deck'):'Card Collection';
 $('bback').innerHTML=v=='edit'?'&lsaquo; Decks':'&lsaquo; Menu';
 $('zoom').style.display='none';
 if(v=='decks')renderDecks();if(v=='edit')renderEdit();refit()}
$('bopen').onclick=()=>{setView('cards');show('bld')};
$('btabs').onclick=e=>{const b=e.target.closest('button');if(b)setView(b.dataset.tab)};
$('bback').onclick=()=>{if(bview=='edit')leaveEdit();else{show('menu');refreshDecks()}};

function renderDecks(){
 const all=allDecks(),cust=all.filter(d=>d.custom),pre=all.filter(d=>d.built);
 $('dsum').innerHTML=`<b>${cust.length}</b> of your decks &middot; <b>${pre.length}</b> premade`+(getDef()?` &middot; default: <b>${hesc(getDef())}</b>`:'');
 const tile=d=>{const m=countsOf(d.c),st=statsOf(m),ic=iconId(m),key=(d.custom?'c:':'b:')+d.n,mx=Math.max(1,...st.cv);
  return`<div class="dk${selDeck==key?' sel':''}${delConf==key?' dc':''}${d.built?' pre':''}" data-k="${hesc(key)}">
  <div class="dkart">${ic?imgTag(ic.Id):'<i class="dkq">?</i>'}<span class="dkn${st.n==30?'':' bad'}">${st.n}/30</span><div class="dkbs">${getDef()==d.n?'<span class="dkd">'+STAR+' Default</span>':''}${d.built?'<span class="dkt">Premade</span>':''}</div>
   <div class="dkact"><button class="pri" data-a="edit">Edit</button><button data-a="def">${getDef()==d.n?'Unset default':'Set default'}</button><button data-a="del"${d.built?' disabled title="Premade decks cannot be deleted"':''}>Delete</button></div>
   <div class="dkconf"><span>Delete this deck?</span><button data-a="yes">Delete</button><button data-a="no">Cancel</button></div></div>
  <div class="dkinfo"><b>${hesc(d.n)}</b><small>${st.u} units &middot; ${st.sp} spells<br>avg cost ${st.avg.toFixed(1)}</small>
   <div class="dkmini">${st.cv.map(q=>`<i style="height:${q?Math.max(12,q/mx*100):5}%"></i>`).join('')}</div></div></div>`};
 $('dgrid').innerHTML=`<h4>Your decks</h4><div class="dg"><div class="dknew"><i>+</i>New deck</div>${cust.map(tile).join('')}</div>`+(pre.length?`<h4>Premade decks</h4><div class="dg">${pre.map(tile).join('')}</div>`:'')}
function syncTiles(){document.querySelectorAll('#dgrid .dk').forEach(t=>{const k=t.dataset.k;t.classList.toggle('sel',selDeck==k);t.classList.toggle('dc',delConf==k)})}
const findDeck=key=>allDecks().find(d=>(d.custom?'c:':'b:')+d.n==key);
$('dgrid').onclick=e=>{
 if(e.target.closest('.dknew'))return newDeck();
 const t=e.target.closest('.dk');if(!t)return;const key=t.dataset.k,btn=e.target.closest('button'),a=btn&&btn.dataset.a;
 if(a=='edit')return editDeck(findDeck(key));
 if(a=='def'){const d=findDeck(key);if(!d)return;const on=getDef()!=d.n;setDefault(on?d.n:null);renderDecks();return toast(on?'"'+d.n+'" is now your default deck':'Default deck cleared')}
 if(a=='del'){delConf=key;return syncTiles()}
 if(a=='no'){delConf=null;return syncTiles()}
 if(a=='yes'){const d=findDeck(key);if(!d||!d.custom)return;saveC(loadC().filter(x=>x.n!=d.n));if(getDef()==d.n)putDef(null);selDeck=delConf=null;refreshDecks();renderDecks();return toast('Deleted "'+d.n+'"')}
 if(e.target.closest('.dkact,.dkconf'))return;
 selDeck=selDeck==key?null:key;delConf=null;syncTiles()};
$('dgrid').ondblclick=e=>{if(e.target.closest('button'))return;const t=e.target.closest('.dk');if(t)editDeck(findDeck(t.dataset.k))};
$('dnew').onclick=()=>newDeck();
$('dimp').onclick=()=>importDialog(true);

function openEditor(st){E=st;E.dirty=!!st.dirty;E.def=!!E.orig&&getDef()==E.orig;$('bn').value=E.name;setView('edit');$('bd').scrollTop=0;$('gedit').scrollTop=0}
function newDeck(){openEditor({orig:null,fresh:1,name:uniqName('New deck'),cards:{}})}
function editDeck(d){if(!d)return;openEditor(d.custom?{orig:d.n,name:d.n,cards:countsOf(d.c)}:{orig:null,name:uniqName(d.n+' (copy)'),cards:countsOf(d.c)})}
function leaveEdit(){const go=()=>{E=null;setView('decks')};
 if(E&&E.dirty)modal({title:'Discard changes?',text:'This deck has unsaved changes.',buttons:[{label:'Keep editing'},{label:'Discard',pri:1,fn:go}]});else go()}
let hintT=0;
function hint(msg,bad){const h=$('bi');h.textContent=msg;h.className=bad?'bad':'';clearTimeout(hintT);if(bad)hintT=setTimeout(()=>hint(HINT0),2600)}
const HINT0='Click a card to add it. Right-click or use the - button to remove.';
const mark=()=>{E.dirty=true};
function add(id){const q=E.cards[id]||0,c=CD[id];
 if(btot()>=30)return hint('The deck is full (30/30).',1);
 if(q>=3)return hint('Max 3 copies of '+c.Name+'.',1);
 E.cards[id]=q+1;mark();renderEdit()}
function dec(id){if(!E.cards[id])return;if(--E.cards[id]<=0)delete E.cards[id];mark();renderEdit()}
function renderEdit(){
 if(!E)return;const n=btot(),st=statsOf(E.cards),ic=iconId(E.cards);
 eEls.forEach(({c,el})=>{const q=E.cards[c.Id]||0;el.classList.toggle('in',q>0);el.classList.toggle('blk',q>=3||n>=30);el.querySelector('u').textContent=q?'x'+q:''});
 const ids=Object.keys(E.cards).map(Number).sort((a,b)=>cmpC(CD[a],CD[b]));
 $('bd').innerHTML=ids.length?ids.map(id=>{const c=CD[id],q=E.cards[id];
  return`<div class="er" data-id="${id}" data-cid="${id}">${imgTag(id)}<b class="erc">${c.Cost}</b><span class="ern">${hesc(c.Name)}</span>
  <button class="eb" data-a="-" title="Remove one">&minus;</button><span class="erq">${q}</span><button class="eb" data-a="+" title="Add one"${q>=3||n>=30?' disabled':''}>+</button><button class="eb x" data-a="x" title="Remove all copies">&times;</button></div>`}).join('')
  :'<div class="eempty">This deck is empty.<br>Click cards on the right to add them.</div>';
 const bc=$('bc');bc.textContent=n+'/30';bc.className=n==30?'ok':'';$('bsave').classList.toggle('ready',n==30);
 $('eimg').style.display=ic?'block':'none';$('eq').style.display=ic?'none':'flex';if(ic){const i=$('eimg');if(i.dataset.id!=ic.Id){i.dataset.id=ic.Id;i.onerror=()=>artErr(i,ic.Id);i.src=artSrc(ic.Id)}}
 $('bstat').textContent=ic?'Icon: '+ic.Name:'Icon: most expensive card';
 $('bdef').classList.toggle('on',!!E.def);$('bdef').innerHTML=STAR+(E.def?' Default deck':' Make default');
 const mx=Math.max(1,...st.cv);
 $('ecurve').innerHTML=`<div class="cvh"><b>Deck curve</b><span>avg cost ${n?st.avg.toFixed(1):'-'} &middot; ${st.u} units &middot; ${st.sp} spells</span></div><div class="cv">`+
  st.cv.map((q,k)=>{const pc=n&&q?Math.round(q/n*100):0;return`<div class="cvc${FE.S.costs.has(k)?' on':''}" data-k="${k}" title="${q} card${q==1?'':'s'} costing ${k==7?'7+':k}${pc?' ('+pc+'% of the deck)':''} - click to filter the list">
   <span class="cvn">${q||''}</span><div class="cvb"><i style="height:${q/mx*100}%"></i></div><span class="cvl">${k==7?'7+':k}</span><span class="cvp">${pc?pc+'%':'-'}</span></div>`}).join('')+`</div><div class="cvk">cost &middot; share of deck</div>`;
 if(!$('bi').classList.contains('bad'))hint(HINT0)}
window.addEventListener('rj-filter',()=>{if(E&&bview=='edit'){$('ecurve').querySelectorAll('.cvc').forEach(c=>c.classList.toggle('on',FE.S.costs.has(+c.dataset.k)))}});
$('ecurve').onclick=e=>{const c=e.target.closest('.cvc');if(c)FE.toggleCost(+c.dataset.k)};
$('gedit').onclick=e=>{const b=e.target.closest('[data-b]');if(!b)return;const id=+b.dataset.b;if(e.target.closest('.mn'))dec(id);else add(id)};
$('gedit').oncontextmenu=e=>{const b=e.target.closest('[data-b]');if(!b)return;e.preventDefault();dec(+b.dataset.b)};
$('bd').onclick=e=>{const b=e.target.closest('button'),r=e.target.closest('.er');if(!b||!r||b.disabled)return;const id=+r.dataset.id,a=b.dataset.a;
 if(a=='+')add(id);else if(a=='-')dec(id);else if(a=='x'){delete E.cards[id];mark();renderEdit()}
 $('zoom').style.display='none'};
$('bn').oninput=()=>{E.name=$('bn').value;mark()};
$('bdef').onclick=()=>{E.def=!E.def;mark();renderEdit()};
$('bclr').onclick=()=>{if(!btot())return;modal({title:'Clear the deck?',text:'This removes all '+btot()+' cards from the deck (nothing is saved until you press Save).',buttons:[{label:'Cancel'},{label:'Clear deck',pri:1,fn:()=>{E.cards={};mark();renderEdit()}}]})};
$('bsave').onclick=()=>{
 const n=E.name.trim();if(!n){hint('Give the deck a name.',1);return $('bn').focus()}
 if(btot()!=30)return hint('A deck needs exactly 30 cards (now '+btot()+').',1);
 const cust=loadC();if(DECKS.some(d=>d.n==n)||cust.some(d=>d.n==n&&d.n!=E.orig)){hint('A deck with that name already exists.',1);return $('bn').focus()}
 const ent={n,c:expand(E.cards)},i=cust.findIndex(d=>d.n==E.orig);if(i>=0)cust[i]=ent;else cust.push(ent);
 saveC(cust);
 if(E.def)putDef(n);else if(E.orig&&getDef()==E.orig)putDef(null);
 selDeck='c:'+n;E=null;refreshDecks();setView('decks');toast('Saved "'+n+'"')};

$('bexp').onclick=()=>{const code=deckEncode(E.cards);if(!code)return hint('Add some cards first.',1);
 const tot=btot();
 modal({title:'Deck code',text:'Anyone can paste this code into Import to get your '+tot+' cards.',ta:{value:code,readonly:true},
  buttons:[{label:'Copy',pri:1,fn:()=>{copyText(code).then(ok=>mSay(ok?'Copied to clipboard.':'Press Ctrl+C to copy the code.'));return false}},{label:'Close'}]});
 copyText(code).then(ok=>{if(ok&&mOpen)mSay('Copied to clipboard. Anyone can paste it into Import to get your '+tot+' cards.')})};
function importDialog(fromTab){
 modal({title:'Import deck',text:fromTab?'Paste a deck code to create a new deck from it.':'Paste a deck code. It replaces the cards in this deck.',ta:{value:'',placeholder:'XXXXX-XXXXX-XXXXX-...'},
  buttons:[{label:'Cancel'},{label:'Import',pri:1,fn:v=>{let r;try{r=deckDecode(v)}catch(err){mSay(String(err),1);return false}
   const m=r.cards;if(fromTab)openEditor({orig:null,fresh:1,name:uniqName(r.name||'Imported deck'),cards:m,dirty:true});
   else{E.cards=m;if(r.name&&!E.name.trim()){E.name=r.name;$('bn').value=r.name}mark();renderEdit()}
   toast('Imported '+Object.values(m).reduce((a,b)=>a+b,0)+' cards')}}]})}
$('bimp').onclick=()=>importDialog(false);
$('bmodal').addEventListener('mousedown',e=>{if(e.target===$('bmodal'))closeModal()});


const PKS=[['pk0','d0','pkn0'],['pk1','d1','pkn1'],['pkl','d0','pknl'],['pk2','d0']];
const pkRank=(i,bot)=>{const d=ALL[i];return !bot&&getDef()==d.n?0:d.custom?1:2};
function renderPickers(){
 PKS.forEach(([id,sid])=>{const el=$(id);if(!el)return;const bot=sid=='d1',dn=getDef();
  const order=ALL.map((d,i)=>i).sort((a,b)=>pkRank(a,bot)-pkRank(b,bot)||a-b);
  el.dataset.sid=sid;
  el.innerHTML=order.map(i=>{const d=ALL[i],m=countsOf(d.c),st=statsOf(m),ic=iconId(m),mx=Math.max(1,...st.cv),isDef=!bot&&dn==d.n;
   return`<div class="pk" data-i="${i}" tabindex="0" role="button" title="${hesc(d.n)}">
    <div class="pkart">${ic?imgTag(ic.Id):'<i class="dkq">?</i>'}<span class="pkb">${isDef?'<span class="pkd">'+STAR+' Default</span>':''}${d.custom?'<span class="pkt">Yours</span>':''}</span><i class="pkchk"></i></div>
    <div class="pkinfo"><b>${hesc(d.n)}</b><small>${st.u} units &middot; ${st.sp} spells<br>avg cost ${st.avg.toFixed(1)}</small>
     <div class="dkmini">${st.cv.map(q=>`<i style="height:${q?Math.max(12,q/mx*100):5}%"></i>`).join('')}</div></div></div>`}).join('');
  el.onclick=e=>{const t=e.target.closest('.pk');if(t)pickDeck(sid,+t.dataset.i)};
  el.onkeydown=e=>{if(e.key=='Enter'||e.key==' '){const t=e.target.closest('.pk');if(t){e.preventDefault();pickDeck(sid,+t.dataset.i)}}}});
 syncPickers()}
function syncPickers(){
 PKS.forEach(([id,sid,nm])=>{const el=$(id);if(!el)return;const cur=$(sid).selectedIndex;
  el.querySelectorAll('.pk').forEach(t=>t.classList.toggle('sel',+t.dataset.i==cur));
  if(nm&&$(nm)&&ALL[cur])$(nm).textContent=ALL[cur].n})}
function pickDeck(sid,i){$(sid).selectedIndex=i;syncPickers()}
function pkReveal(...ids){requestAnimationFrame(()=>ids.forEach(id=>{const t=$(id)&&$(id).querySelector('.pk.sel');if(t)t.scrollIntoView({block:'nearest',inline:'nearest'})}))}
function setDefault(name){putDef(name);if(name){const j=ALL.findIndex(d=>d.n==name);if(j>=0)$('d0').selectedIndex=j}renderPickers()}
window.renderPickers=renderPickers;window.syncPickers=syncPickers;window.pkReveal=pkReveal;window.setDefault=setDefault;
renderPickers();

addEventListener('keydown',e=>{if($('bld').style.display!='block')return;
 if(e.key=='Escape'){if(mOpen)closeModal();else if(popOpen)popOpen(false);else if(bview=='edit')leaveEdit();return}
 if(e.key=='/'&&!/INPUT|TEXTAREA/.test((document.activeElement||{}).tagName||'')&&!mOpen&&bview!='decks'){e.preventDefault();(bview=='edit'?FE:FC).q.focus()}});
})();
const setFont=f=>{document.body.dataset.font=f;try{localStorage.setItem('rj_font',f)}catch(e){}};
try{const f=localStorage.getItem('rj_font');if(f&&[...$('fnt').options].some(o=>o.value==f))$('fnt').value=f}catch(e){}
setFont($('fnt').value);$('fnt').onchange=()=>setFont($('fnt').value);
function fitTx(el){const sig=el.innerHTML.length+'|'+el.clientWidth;if(el.dataset.f===sig||!el.clientHeight)return;
 const kw=el.querySelector('.kwl');el.style.fontSize='';if(kw)kw.style.fontSize='';
 const b=parseFloat(getComputedStyle(el).fontSize),bk=kw?parseFloat(getComputedStyle(kw).fontSize):0,cs=getComputedStyle(el);
 const pad=parseFloat(cs.paddingTop)+parseFloat(cs.paddingBottom);
 const need=()=>[...el.children].reduce((a,c)=>a+c.offsetHeight,0)+pad;let s=1;
 while(need()>el.clientHeight+1&&s>.4){s-=.04;el.style.fontSize=(b*s)+'px';if(kw)kw.style.fontSize=(bk*s)+'px'}
 el.dataset.f=el.innerHTML.length+'|'+el.clientWidth}
let fitQ=0;const fitAll=()=>{fitQ=0;document.querySelectorAll('.card .tx').forEach(fitTx)};
new MutationObserver(()=>{if(!fitQ)fitQ=requestAnimationFrame(fitAll)}).observe(document.body,{childList:true,subtree:true,characterData:true});
addEventListener('resize',()=>{document.querySelectorAll('.card .tx').forEach(e=>delete e.dataset.f);fitAll()});
document.fonts&&document.fonts.ready.then(()=>{document.querySelectorAll('.card .tx').forEach(e=>delete e.dataset.f);fitAll()});
const PRELOAD=[];[['img/CardFront.png'],['img/back.webp'],['img/missing_texture.webp'],...CARDS.map(c=>[artFile(c.Id),c.Id])].forEach(([u,id])=>{const i=new Image();i.decoding='async';
 if(id!=null)i.onerror=()=>MISSING.add(+id);i.src=u;PRELOAD.push(i);if(i.decode)i.decode().catch(()=>{})});
show('menu');

{const _rd=render;render=function(){_rd.apply(this,arguments);holdUnits()}}
