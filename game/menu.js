const PANELS=['tutmenu','frmenu','botmenu','setmenu','mirmenu','achmenu','rkmenu','acctmenu','avpick','fdmenu','clmenu'];
const lsGet=k=>{try{return localStorage.getItem(k)}catch(e){return null}},lsSet=(k,v)=>{try{localStorage.setItem(k,v)}catch(e){}};
const openPanel=id=>{PANELS.forEach(k=>$(k).style.display=k==id?'flex':'none')},closePanels=()=>openPanel('');
const botPanel=m=>{MODE=m;const en=m=='endless';$('botmenu').classList.toggle('endless',en);$('ebest').textContent=en?'Best score: '+(+lsGet('rj_endless_best')||0):'';$('bott').textContent=en?'Endless Mode':'Play with the bot';$('pk1').closest('.pkcol').style.display=en?'none':'';document.querySelector('#botmenu .pkcols').style.gridTemplateColumns=en?'1fr':'';
 $('botdiff').textContent=en?'Deal as much damage to the Boss as you can. He plays a random deck, never runs out of cards and gets stronger every 20 damage.':'Solo practice against the bot';openPanel('botmenu');pkReveal('pk0','pk1')};
$('tfriend').onclick=()=>{MODE='online';openPanel('frmenu')};
$('tbot').onclick=()=>botPanel('bot');$('tendless').onclick=()=>botPanel('endless');
$('tmirror').onclick=()=>{MODE='mirror';$('mirbot').click()};   // offline: straight into a Mirror Match vs the bot
$('tmirroron').onclick=()=>{MODE='mirror';openPanel('mirmenu')};$('mirbot').style.display='none';   // online: host / join
$('tquick').onclick=()=>{MODE='online';$('mquick').click()};
$('mirbot').onclick=()=>{MODE='mirror';closePanels();start();musicStart()};
$('mirhost').onclick=()=>{LB='mirmenu';startAudio();hostRoom(true)};$('mirjoin').onclick=()=>{LB='mirmenu';joinLobby('',true)};
const openSet=()=>{$('setmenu').classList.toggle('ig',$('game').style.display=='block');
 openPanel('setmenu')};
$('sopen').onclick=openSet;$('mu').onclick=openSet;
['tutback','frback','botback','setclose','mirback','achback','pfback','fdback','clback'].forEach(i=>$(i).onclick=closePanels);
addEventListener('keydown',e=>{if(e.key!='Escape')return;if($('game').style.display=='block'){if($('setmenu').style.display=='flex')closePanels();return}
 if($('lobby').style.display=='flex')$('lcancel').click();else closePanels()});
$('rndprem').checked=lsGet('rj_rndpool')!=='mine';
$('rndprem').onchange=()=>lsSet('rj_rndpool',$('rndprem').checked?'all':'mine');
$('hideprem').checked=lsGet('rj_hideprem')==='1';
$('hideprem').onchange=()=>{lsSet('rj_hideprem',$('hideprem').checked?'1':'0');renderPickers()};
$('expchg').checked=!!window.RJ_EXP;
$('expchg').onchange=()=>{const on=$('expchg').checked;
 if($('game').style.display=='block'&&!confirm('Changing this reloads the page and ends the current game. Continue?')){$('expchg').checked=!on;return}
 lsSet('rj_exp',on?'1':'0');location.reload()};
$('max2row').style.display=window.RJ_EXP&&window.RJ_MAX2_TOGGLE?'':'none';$('max2').checked=window.RJ_MAXC<3;
$('max2').onchange=()=>{const on=$('max2').checked;
 if($('game').style.display=='block'&&!confirm('Changing this reloads the page and ends the current game. Continue?')){$('max2').checked=!on;return}
 lsSet('rj_max2',on?'1':'0');location.reload()};
$('hotnum').checked=lsGet('rj_hotnum')==='1';document.body.classList.toggle('hn',$('hotnum').checked);
$('hotnum').onchange=()=>{lsSet('rj_hotnum',$('hotnum').checked?'1':'0');document.body.classList.toggle('hn',$('hotnum').checked)};
const pct=(id,key,def,apply)=>{const el=$(id),n=$(id.replace('v','n'));let v=lsGet(key);v=v===null||v===''||isNaN(+v)?def:Math.max(0,Math.min(100,+v));
 el.value=v;n.textContent=v+'%';apply(v);
 el.oninput=()=>{n.textContent=el.value+'%';apply(+el.value);lsSet(key,el.value)};return el};
{const s=pct('sfxv','rj_sfx',Math.round(SFX.vol*100),sfxSetVol);s.onchange=()=>sfx('unitPlayed',{pitch:0})}
pct('musv','rj_mus',100,musicSetVol);

/* ---- build version label + changelog (data lives in changelog.js) ---- */
$('mver').textContent=GAME_STAGE+' Build v. '+(window.RJ_EXP?GAME_VERSION_EXP:GAME_VERSION)+(window.RJ_EXP?' [EXPERIMENTAL]':'');
// The grey version line under the title is scaled so it is exactly as wide as the title itself (re-fitted when fonts load / the text changes).
const fitVer=()=>{const t=document.querySelector('#menu .mlogo h1'),v=$('mver');if(!t||!v||!v.textContent)return;
 v.style.fontSize='100px';const w=v.offsetWidth,tw=t.offsetWidth;if(w>0&&tw>0)v.style.fontSize=(100*tw/w)+'px'};   // offsetWidth ignores the stage's scale transform
fitVer();if(document.fonts){document.fonts.ready.then(fitVer);document.fonts.addEventListener('loadingdone',fitVer)}addEventListener('load',fitVer);addEventListener('resize',fitVer);if(window.ResizeObserver)new ResizeObserver(fitVer).observe(document.querySelector('#menu .mlogo h1'));

// Cards in the changelog: look a card up by Id or by name in the cards of the current build (CD is built from CARDS, or CARDS_EXP when Experimental is on).
let CLN=null;
const clId=(k,byName)=>{k=String(k).trim();if(/^\d+$/.test(k))return byName?null:CD[+k]?+k:null;   // byName: **bold** text is only ever a card NAME, so "**2**" (a changed number) is not card #2
 if(!CLN){CLN={};CARDS.forEach(c=>{CLN[c.Name.toLowerCase()]=c.Id})}
 const id=CLN[k.toLowerCase()];return id!=null?id:null};
// data-fc pins the shown cost to the printed one (cardOf in ui.js), so a half-finished game in the background can't change it.
const clLink=(el,id,txt,bold)=>{const s=document.createElement(bold?'b':'span');s.className='clc';s.dataset.cid=id;s.dataset.fc=CD[id].Cost;s.textContent=txt;el.appendChild(s)};
const clInline=(el,t)=>t.split(/(\*\*.+?\*\*|\{\{.+?\}\})/).forEach(s=>{if(!s)return;let id;
 if(s.startsWith('**')&&s.endsWith('**')&&s.length>4){const x=s.slice(2,-2);if((id=clId(x,1))!=null)clLink(el,id,x,1);else{const b=document.createElement('b');b.textContent=x;el.appendChild(b)}}
 else if(s.startsWith('{{')&&s.endsWith('}}')){const x=s.slice(2,-2).trim();if((id=clId(x))!=null)clLink(el,id,CD[id].Name,0);else el.appendChild(document.createTextNode(x))}
 else el.appendChild(document.createTextNode(s))});
const clGallery=(ent,list)=>{const ids=list.split(',').map(x=>clId(x)).filter(i=>i!=null);if(!ids.length)return;
 const g=document.createElement('div');g.className='clg';
 ids.forEach(id=>{const w=document.createElement('div');w.innerHTML=cardHTML({id,fc:CD[id].Cost,ba:0},false,'','data-fc="'+CD[id].Cost+'"');g.appendChild(w)});ent.appendChild(g)};
// Updates has two pages made from the same data (changelog.js): "Patch Notes" (everything except balance) and "Balance Changes"
// (sections whose title starts with "Balance" or "Card Changes"). Entries with nothing for the chosen page are skipped.
let CLK='patch';
const isBal=t=>/^(balance|card changes)/i.test(t);
const renderChangelog=kind=>{CLK=kind||CLK;const bal=CLK=='bal',box=$('cllist'),exp=!!window.RJ_EXP,src=exp?CHANGELOG_EXP:CHANGELOG;box.textContent='';let ent=null,ul=null,n=0,inc=!bal;
 const flush=()=>{if(ent&&ent.children.length>1){box.appendChild(ent);n++}ent=null};
 $('cltitle').textContent=(exp?'Experimental ':'')+(bal?'Balance Changes':'Patch Notes');
 for(const raw of src.split('\n')){const l=raw.trim();if(!l)continue;let m;
  if(m=l.match(/^##\s+(.*?)(?:\s+[-\u2013]\s+(\d{4}-\d{2}-\d{2}))?$/)){flush();ent=document.createElement('section');ent.className='cle';const h=document.createElement('h3');h.textContent=m[1];if(m[2]){const d=document.createElement('small');d.textContent=m[2];h.appendChild(d)}ent.appendChild(h);ul=null;inc=!bal}
  else if(!ent)continue;
  else if(m=l.match(/^###\s+(.*)$/)){inc=isBal(m[1])==bal;ul=null;if(inc){const h4=document.createElement('h4');h4.textContent=m[1];ent.appendChild(h4)}}
  else if(!inc)continue;
  else if(m=l.match(/^\[\[\s*cards?\s*:\s*(.+?)\s*\]\]$/i)){clGallery(ent,m[1]);ul=null}
  else if(m=l.match(/^[-*]\s+(.*)$/)){if(!ul){ul=document.createElement('ul');ent.appendChild(ul)}const li=document.createElement('li');clInline(li,m[1]);ul.appendChild(li)}
  else{const p=document.createElement('p');clInline(p,l);ent.appendChild(p);ul=null}}
 flush();
 $('clsub').textContent=!n?(bal?'No balance changes yet':'No entries yet'):bal?(exp?'Card balance changes in the experimental build, newest first':'Card balance changes, newest first'):(exp?'Changes in the experimental build, newest first':'New content, changes and fixes, newest first');box.scrollTop=0};
// The zoomed card sits at the left edge by default; in the changelog it opens on the opposite side of whatever is hovered, so it doesn't hide it.
$('cllist').addEventListener('mouseover',e=>{const t=e.target.closest&&e.target.closest('[data-cid]');if(t){const r=t.getBoundingClientRect();window.RJ_ZR=(r.left+r.right)/2<innerWidth/2}});
$('cllist').addEventListener('mouseleave',()=>{window.RJ_ZR=false});
$('clopen').onclick=()=>{renderChangelog('patch');openPanel('clmenu')};
$('balopen').onclick=()=>{renderChangelog('bal');openPanel('clmenu')};


/* ---- main menu: left nav + card panel (see mockups) ---- */
{const menu=$('menu'),navB=[...document.querySelectorAll('#mnav button')],secs=[...document.querySelectorAll('#mpanel .msec')],panel=$('mpanel');
 let sec=0,card=0,opened=false;const mem=secs.map(()=>0);
 const cardsOf=i=>[...secs[i].querySelectorAll('.mc')];
 const render=()=>{menu.classList.toggle('open',opened);
  navB.forEach((b,i)=>b.classList.toggle('on',i==sec));
  secs.forEach((s,i)=>s.classList.toggle('on',opened&&i==sec));
  cardsOf(sec).forEach((c,i)=>c.classList.toggle('on',opened&&i==card));
  if(opened){const c=cardsOf(sec)[card];if(c){const l=c.offsetLeft-37,r=c.offsetLeft+c.offsetWidth+37-panel.clientWidth;
   const cur=panel.scrollLeft;panel.scrollLeft=r>cur?r:l<cur?l:cur}}};
 const pick=(i,open)=>{mem[sec]=card;sec=i;card=mem[i]||0;if(open)opened=true;render()};
 navB.forEach((b,i)=>{b.onclick=()=>{if(i==sec&&opened){opened=false;render()}else pick(i,true)}});   // clicking the open section again closes its panel
 const watch=on=>{window.WATCH=on;if(on){startAudio();musicNewGame();musicStart()}else musicUpdate();menu.classList.toggle('watch',on);document.body.classList.toggle('watching',on);$('mwatch').textContent=on?'Back to menu':'Watch bots'};
 $('mwatch').onclick=()=>watch(!menu.classList.contains('watch'));
 secs.forEach((s,si)=>cardsOf(si).forEach((c,ci)=>{c.addEventListener('mouseenter',()=>{card=ci;render()});c.addEventListener('click',()=>{card=ci;render()})}));
 $('ttut').onclick=()=>openPanel('tutmenu');
 $('bdecks').onclick=()=>{$('bopen').click();document.querySelector('#btabs [data-tab="decks"]').click()};   // open the collection, then jump to its Decks tab
 const overlayOpen=()=>[...document.querySelectorAll('#stage .ovl')].some(o=>getComputedStyle(o).display!='none');
 addEventListener('keydown',e=>{if(menu.style.display!='flex'||overlayOpen()||e.ctrlKey||e.metaKey||e.altKey)return;
  if(menu.classList.contains('watch')){if(e.key=='Escape'||e.key=='Enter'||e.key==' '){watch(false);e.preventDefault()}return}
  const n=cardsOf(sec).length;let h=true;
  if(e.key=='ArrowDown')pick((sec+1)%navB.length,false);
  else if(e.key=='ArrowUp')pick((sec+navB.length-1)%navB.length,false);
  else if(e.key=='ArrowRight'){if(!opened){opened=true;render()}else{card=Math.min(n-1,card+1);render()}}
  else if(e.key=='ArrowLeft'){if(opened){card=Math.max(0,card-1);render()}}
  else if(e.key=='Enter'){if(!opened){opened=true;render()}else cardsOf(sec)[card].click()}
  else if(e.key=='Escape'&&opened){opened=false;render()}
  else h=false;
  if(h)e.preventDefault()});
 panel.addEventListener('wheel',e=>{if(Math.abs(e.deltaY)>Math.abs(e.deltaX)){panel.scrollLeft+=e.deltaY;e.preventDefault()}},{passive:false});
 render()}


/* ---- menu background: automatic bot-vs-bot games (see demoStart / flow() in ui.js) ---- */
function demoStart(){
 if($('menu').classList.contains('watch')&&$('menu').style.display!='flex'){$('menu').classList.remove('watch');document.body.classList.remove('watching')}
 if(DEMO||document.hidden||$('menu').style.display!='flex'||typeof DECKS=='undefined'||!DECKS.length)return;
 gid++;const my=gid,pick=()=>DECKS[Math.floor(Math.random()*DECKS.length)].c;
 DEMO=true;G=newGame(pick(),pick());busy=true;sel=pend=null;castMode=false;
 botMull(G,G.p[0]);botMull(G,G.p[1]);decideStart(G,'first','first');startRound(G);
 $('game').classList.add('bgdemo');say('');render();
 if(window.WATCH)musicNewGame();
 flow().then(()=>{if(DEMO&&my==gid)setTimeout(()=>{if(DEMO&&my==gid){DEMO=false;demoStart()}},4000)})}
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&!DEMO)demoStart()});
demoStart();


/* ---- full-screen views: every menu pop-up becomes its own screen like the Card Collection (Back top-left, title in the header bar) ---- */
{const VW={tutmenu:'tutback',frmenu:'frback',mirmenu:'mirback',botmenu:'botback',achmenu:'achback',rkmenu:'rkback',acctmenu:'pfback',fdmenu:'fdback',avpick:'avback',clmenu:'clback',setmenu:'setclose',lobby:'lcancel'};
 Object.keys(VW).forEach(id=>{const o=$(id),orig=$(VW[id]),h2=o.querySelector('.panel>h2');o.classList.add('vw');
  const hd=document.createElement('div');hd.className='vhead';
  const b=document.createElement('button');b.className='ghost vback';b.innerHTML='&lsaquo; Back';b.onclick=()=>orig.click();hd.appendChild(b);
  if(h2)hd.appendChild(h2);o.insertBefore(hd,o.firstChild);orig.classList.add('vbx')})}
