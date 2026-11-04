const SFX_NAMES=['attack','buff','burn','cardDrawn','damageTaken','debuff','defeat','endTurn','heal','heroHit','mark','silence','spellCast','stun','unitDeath','unitPlayed','victory'];
const SFX_VARIANTS=3,SFX_EXT='.wav';
const SFX={vol:.7,ctx:null,mode:'',bufs:{},aud:{},last:{},started:false};
try{const v=localStorage.getItem('rj_sfx');if(v!==null&&v!==''&&!isNaN(+v))SFX.vol=Math.max(0,Math.min(1,+v/100))}catch(e){}
function sfxInit(){
 if(SFX.started)return;SFX.started=true;
 try{const AC=window.AudioContext||window.webkitAudioContext;SFX.ctx=new AC()}catch(e){SFX.ctx=null}
 SFX.mode=SFX.ctx&&location.protocol!='file:'?'web':'html';
 SFX_NAMES.forEach(n=>{SFX.bufs[n]=[];SFX.aud[n]=[];for(let i=1;i<=SFX_VARIANTS;i++)sfxLoad(n,i)})}
function sfxLoad(n,i){const url='sfx/'+n+'_'+i+SFX_EXT;
 if(SFX.mode=='web')fetch(url).then(r=>r.ok?r.arrayBuffer():Promise.reject()).then(b=>SFX.ctx.decodeAudioData(b)).then(buf=>SFX.bufs[n].push(buf)).catch(()=>{});
 else{const a=new Audio();a.preload='auto';a.addEventListener('canplaythrough',()=>{if(!SFX.aud[n].includes(a))SFX.aud[n].push(a)},{once:true});a.src=url}}
function sfx(n,o){o=o||{};if(SFX.vol<=0||!SFX.started)return;
 if(o.delay){const d=o.delay;o=Object.assign({},o,{delay:0});setTimeout(()=>sfx(n,o),d);return}
 const t=performance.now();if(t-(SFX.last[n]||0)<45)return;SFX.last[n]=t;
 const rate=o.pitch===0?1:1+(Math.random()-.5)*.08,vol=Math.min(1,SFX.vol*(o.v||1));
 if(SFX.mode=='web'){const l=SFX.bufs[n];if(!l||!l.length)return;if(SFX.ctx.state=='suspended')SFX.ctx.resume();
  const s=SFX.ctx.createBufferSource(),g=SFX.ctx.createGain();s.buffer=l[Math.floor(Math.random()*l.length)];s.playbackRate.value=rate;g.gain.value=vol;s.connect(g);g.connect(SFX.ctx.destination);s.start()}
 else{const l=SFX.aud[n];if(!l||!l.length)return;const c=l[Math.floor(Math.random()*l.length)].cloneNode();c.volume=vol;c.playbackRate=rate;c.play().catch(()=>{})}}
function sfxSetVol(pct){SFX.vol=Math.max(0,Math.min(1,pct/100));try{localStorage.setItem('rj_sfx',String(Math.round(pct)))}catch(e){}}
function sfxEv(e){switch(e.k){
 case'in':sfx('unitPlayed');break;
 case'tf':sfx('unitPlayed',{delay:e.just?560:210});break;
 case'atk':sfx('attack');break;
 case'dmg':sfx(e.h!=null?'heroHit':'damageTaken',{delay:110});break;
 case'die':sfx('unitDeath',{delay:230});break;
 case'snd':if(e.n!='cardDrawn'||e.o==0)sfx(e.n);break}}
['pointerdown','keydown'].forEach(k=>addEventListener(k,sfxInit,{once:true,capture:true}));
