const PANELS=['frmenu','botmenu','setmenu'];
const lsGet=k=>{try{return localStorage.getItem(k)}catch(e){return null}},lsSet=(k,v)=>{try{localStorage.setItem(k,v)}catch(e){}};
const openPanel=id=>{PANELS.forEach(k=>$(k).style.display=k==id?'flex':'none')},closePanels=()=>openPanel('');
const botLabel=()=>$('bot').value=='basic'?'Basic':'Smart';
const refreshBotDiff=()=>{$('botdiff').textContent='Difficulty: '+botLabel()+' (change it in Settings)'};
$('tfriend').onclick=()=>openPanel('frmenu');
$('tbot').onclick=()=>{refreshBotDiff();openPanel('botmenu');pkReveal('pk0','pk1')};
const openSet=()=>{$('setmenu').classList.toggle('ig',$('game').style.display=='block');openPanel('setmenu')};
$('sopen').onclick=openSet;$('mu').onclick=openSet;
['frback','botback','setclose'].forEach(i=>$(i).onclick=closePanels);
PANELS.forEach(k=>$(k).addEventListener('click',e=>{if(e.target===$(k))closePanels()}));
addEventListener('keydown',e=>{if(e.key!='Escape')return;if($('game').style.display=='block'){if($('setmenu').style.display=='flex')closePanels();return}
 if($('lobby').style.display=='flex')$('lcancel').click();else closePanels()});
{const b=lsGet('rj_bot');if(b==='smart'||b==='basic')$('bot').value=b}
$('bot').onchange=()=>{lsSet('rj_bot',$('bot').value);refreshBotDiff()};
const pct=(id,key,def,apply)=>{const el=$(id),n=$(id.replace('v','n'));let v=lsGet(key);v=v===null||v===''||isNaN(+v)?def:Math.max(0,Math.min(100,+v));
 el.value=v;n.textContent=v+'%';apply(v);
 el.oninput=()=>{n.textContent=el.value+'%';apply(+el.value);lsSet(key,el.value)};return el};
{const s=pct('sfxv','rj_sfx',Math.round(SFX.vol*100),sfxSetVol);s.onchange=()=>sfx('unitPlayed',{pitch:0})}
pct('musv','rj_mus',100,musicSetVol);
$('pname').value=cleanName(lsGet('rj_name')||'');
$('pname').oninput=()=>{lsSet('rj_name',cleanName($('pname').value));if(typeof G!=='undefined'&&G)render()};
refreshBotDiff();
