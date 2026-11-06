const PANELS=['frmenu','botmenu','setmenu','mirmenu','achmenu','rkmenu','acctmenu','avpick','fdmenu'];
const lsGet=k=>{try{return localStorage.getItem(k)}catch(e){return null}},lsSet=(k,v)=>{try{localStorage.setItem(k,v)}catch(e){}};
const openPanel=id=>{PANELS.forEach(k=>$(k).style.display=k==id?'flex':'none')},closePanels=()=>openPanel('');
const botPanel=m=>{MODE=m;const en=m=='endless';$('botmenu').classList.toggle('endless',en);$('ebest').textContent=en?'Best score: '+(+lsGet('rj_endless_best')||0):'';$('bott').textContent=en?'Endless Mode':'Play with the bot';$('pk1').closest('.pkcol').style.display=en?'none':'';document.querySelector('#botmenu .pkcols').style.gridTemplateColumns=en?'1fr':'';
 $('botdiff').textContent=en?'Deal as much damage to the Boss as you can. He plays a random deck, never runs out of cards and gets stronger every 20 damage.':'Solo practice against the bot';openPanel('botmenu');pkReveal('pk0','pk1')};
$('tfriend').onclick=()=>{MODE='online';openPanel('frmenu')};
$('tbot').onclick=()=>botPanel('bot');$('tendless').onclick=()=>botPanel('endless');
$('tmirror').onclick=()=>{MODE='mirror';openPanel('mirmenu')};
$('mirbot').onclick=()=>{MODE='mirror';closePanels();start();musicStart()};
$('mirhost').onclick=()=>{LB='mirmenu';startAudio();hostRoom(true)};$('mirjoin').onclick=()=>{LB='mirmenu';joinLobby('')};
const openSet=()=>{$('setmenu').classList.toggle('ig',$('game').style.display=='block');
 openPanel('setmenu')};
$('sopen').onclick=openSet;$('mu').onclick=openSet;
['frback','botback','setclose','mirback','achback','pfback','fdback'].forEach(i=>$(i).onclick=closePanels);
PANELS.forEach(k=>$(k).addEventListener('click',e=>{if(e.target===$(k))closePanels()}));
addEventListener('keydown',e=>{if(e.key!='Escape')return;if($('game').style.display=='block'){if($('setmenu').style.display=='flex')closePanels();return}
 if($('lobby').style.display=='flex')$('lcancel').click();else closePanels()});
$('rndprem').checked=lsGet('rj_rndpool')!=='mine';
$('rndprem').onchange=()=>lsSet('rj_rndpool',$('rndprem').checked?'all':'mine');
$('hotnum').checked=lsGet('rj_hotnum')==='1';document.body.classList.toggle('hn',$('hotnum').checked);
$('hotnum').onchange=()=>{lsSet('rj_hotnum',$('hotnum').checked?'1':'0');document.body.classList.toggle('hn',$('hotnum').checked)};
const pct=(id,key,def,apply)=>{const el=$(id),n=$(id.replace('v','n'));let v=lsGet(key);v=v===null||v===''||isNaN(+v)?def:Math.max(0,Math.min(100,+v));
 el.value=v;n.textContent=v+'%';apply(v);
 el.oninput=()=>{n.textContent=el.value+'%';apply(+el.value);lsSet(key,el.value)};return el};
{const s=pct('sfxv','rj_sfx',Math.round(SFX.vol*100),sfxSetVol);s.onchange=()=>sfx('unitPlayed',{pitch:0})}
pct('musv','rj_mus',100,musicSetVol);
