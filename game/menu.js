const PANELS=['frmenu','botmenu','setmenu','mirmenu','achmenu','rkmenu','acctmenu','avpick','fdmenu','clmenu'];
const lsGet=k=>{try{return localStorage.getItem(k)}catch(e){return null}},lsSet=(k,v)=>{try{localStorage.setItem(k,v)}catch(e){}};
const openPanel=id=>{PANELS.forEach(k=>$(k).style.display=k==id?'flex':'none')},closePanels=()=>openPanel('');
const botPanel=m=>{MODE=m;const en=m=='endless';$('botmenu').classList.toggle('endless',en);$('ebest').textContent=en?'Best score: '+(+lsGet('rj_endless_best')||0):'';$('bott').textContent=en?'Endless Mode':'Play with the bot';$('pk1').closest('.pkcol').style.display=en?'none':'';document.querySelector('#botmenu .pkcols').style.gridTemplateColumns=en?'1fr':'';
 $('botdiff').textContent=en?'Deal as much damage to the Boss as you can. He plays a random deck, never runs out of cards and gets stronger every 20 damage.':'Solo practice against the bot';openPanel('botmenu');pkReveal('pk0','pk1')};
$('tfriend').onclick=()=>{MODE='online';openPanel('frmenu')};
$('tbot').onclick=()=>botPanel('bot');$('tendless').onclick=()=>botPanel('endless');
$('tmirror').onclick=()=>{MODE='mirror';openPanel('mirmenu')};
$('mirbot').onclick=()=>{MODE='mirror';closePanels();start();musicStart()};
$('mirhost').onclick=()=>{LB='mirmenu';startAudio();hostRoom(true)};$('mirjoin').onclick=()=>{LB='mirmenu';joinLobby('',true)};
const openSet=()=>{$('setmenu').classList.toggle('ig',$('game').style.display=='block');
 openPanel('setmenu')};
$('sopen').onclick=openSet;$('mu').onclick=openSet;
['frback','botback','setclose','mirback','achback','pfback','fdback','clback'].forEach(i=>$(i).onclick=closePanels);
PANELS.forEach(k=>$(k).addEventListener('click',e=>{if(e.target===$(k))closePanels()}));
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
const renderChangelog=()=>{const box=$('cllist'),exp=!!window.RJ_EXP,src=exp?CHANGELOG_EXP:CHANGELOG;box.textContent='';let ent=null,sec=null,ul=null,n=0;
 $('cltitle').textContent=exp?'Experimental Changelog':'Changelog';
 for(const raw of src.split('\n')){const l=raw.trim();if(!l)continue;let m;
  if(m=l.match(/^##\s+(.*?)(?:\s+[-\u2013]\s+(\d{4}-\d{2}-\d{2}))?$/)){n++;ent=document.createElement('section');ent.className='cle';const h=document.createElement('h3');h.textContent=m[1];if(m[2]){const d=document.createElement('small');d.textContent=m[2];h.appendChild(d)}ent.appendChild(h);box.appendChild(ent);sec=ul=null}
  else if(!ent)continue;
  else if(m=l.match(/^###\s+(.*)$/)){sec=document.createElement('h4');sec.textContent=m[1];ent.appendChild(sec);ul=null}
  else if(m=l.match(/^\[\[\s*cards?\s*:\s*(.+?)\s*\]\]$/i)){clGallery(ent,m[1]);ul=null}
  else if(m=l.match(/^[-*]\s+(.*)$/)){if(!ul){ul=document.createElement('ul');ent.appendChild(ul)}const li=document.createElement('li');clInline(li,m[1]);ul.appendChild(li)}
  else{const p=document.createElement('p');clInline(p,l);ent.appendChild(p);ul=null}}
 $('clsub').textContent=n?(exp?'Changes in the experimental build, newest first':'Balance changes and updates, newest first'):'No entries yet';box.scrollTop=0};
// The zoomed card sits at the left edge by default; in the changelog it opens on the opposite side of whatever is hovered, so it doesn't hide it.
$('cllist').addEventListener('mouseover',e=>{const t=e.target.closest&&e.target.closest('[data-cid]');if(t){const r=t.getBoundingClientRect();window.RJ_ZR=(r.left+r.right)/2<innerWidth/2}});
$('cllist').addEventListener('mouseleave',()=>{window.RJ_ZR=false});
$('clopen').onclick=()=>{renderChangelog();openPanel('clmenu')};
