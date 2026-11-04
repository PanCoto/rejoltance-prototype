const MSTEMS=['base','arp','mel','drm','str','war','tns'],MLOOP=2352000/44100,MLEAD=.5;
const MUS={vol:1,mode:'',started:false,ready:false,ctx:null,master:null,g:{},src:[],last:{},force:null};
try{const v=localStorage.getItem('rj_mus');if(v!==null&&v!==''&&!isNaN(+v))MUS.vol=Math.max(0,Math.min(1,+v/100))}catch(e){}
const mclamp=(x,a,b)=>Math.max(a,Math.min(b,x));
function musicSetVol(pct){MUS.vol=mclamp(pct/100,0,1);const a=document.getElementById('au');if(a)a.volume=MUS.vol;
 if(MUS.master)MUS.master.gain.setTargetAtTime(MUS.vol*.85,MUS.ctx.currentTime,.05)}
function musicStart(){
 if(MUS.started){if(MUS.mode=='html'){const a=document.getElementById('au');a.play().catch(()=>{})}else if(MUS.ctx&&MUS.ctx.state=='suspended')MUS.ctx.resume();return}
 MUS.started=true;const ctx=(typeof SFX!=='undefined'&&SFX.ctx)||null;
 if(!ctx||location.protocol=='file:')return musicFallback();
 MUS.ctx=ctx;MUS.mode='web';if(ctx.state=='suspended')ctx.resume();
 MUS.master=ctx.createGain();MUS.master.gain.value=MUS.vol*.85;
 const comp=ctx.createDynamicsCompressor();comp.threshold.value=-14;comp.knee.value=10;comp.ratio.value=3;comp.attack.value=.02;comp.release.value=.3;
 MUS.master.connect(comp);comp.connect(ctx.destination);
 Promise.all(MSTEMS.map(n=>fetch('audio/stems/'+n+'.mp3').then(r=>r.ok?r.arrayBuffer():Promise.reject()).then(b=>ctx.decodeAudioData(b))))
  .then(bufs=>{const t0=ctx.currentTime+.15;
   MSTEMS.forEach((n,i)=>{const s=ctx.createBufferSource(),g=ctx.createGain();s.buffer=bufs[i];s.loop=true;s.loopStart=MLEAD;s.loopEnd=MLEAD+MLOOP;
    g.gain.value=0;s.connect(g);g.connect(MUS.master);s.start(t0,MLEAD);MUS.g[n]=g;MUS.src.push(s)});
   MUS.ready=true;MUS.last={};musicUpdate(true)})
  .catch(()=>musicFallback())}
function musicFallback(){MUS.mode='html';const a=document.getElementById('au');a.volume=MUS.vol;a.play().catch(()=>{})}
function musicTargets(){
 const inG=typeof G!=='undefined'&&G&&document.getElementById('game').style.display=='block';
 let hp=20,ehp=20,turn=0,over=null;
 if(MUS.force){hp=MUS.force.hp==null?20:MUS.force.hp;ehp=MUS.force.ehp==null?20:MUS.force.ehp;turn=MUS.force.turn||1}
 else if(inG){hp=G.p[0].hp;ehp=G.p[1].hp;turn=G.turn;over=G.over}
 else return{base:1,arp:.7,mel:.45,drm:0,str:0,war:0,tns:0};
 if(over)return over.win===0?{base:1,arp:1,mel:1,drm:.4,str:0,war:0,tns:0}:{base:.9,arp:.25,mel:0,drm:0,str:0,war:0,tns:0};
 const danger=mclamp((14-hp)/12,0,1),late=mclamp((turn-6)/10,0,1),win=mclamp((7-ehp)/5,0,1);
 return{base:1,
  arp:mclamp((turn-1)/2,0,1)*(1-.45*danger),
  mel:mclamp((turn-3)/3,0,1)*(1-.9*mclamp(danger*1.3,0,1)),
  drm:Math.max(mclamp((turn-5)/3,0,1)*(1-.7*mclamp((danger-.45)*2.2,0,1)),mclamp(danger*3,0,1)*.7),
  str:Math.max(mclamp((danger-.2)/.35,0,1),late*.5,win*.5),
  war:Math.max(mclamp((danger-.45)/.3,0,1),win*.85),
  tns:Math.max(mclamp((danger-.6)/.3,0,1),late*.25)}}
function musicUpdate(now){
 if(MUS.mode!='web'||!MUS.ready)return;const t=musicTargets(),ct=MUS.ctx.currentTime;
 MSTEMS.forEach(n=>{const v=t[n]||0;if(!now&&Math.abs(v-(MUS.last[n]==null?-1:MUS.last[n]))<.02)return;MUS.last[n]=v;
  MUS.g[n].gain.setTargetAtTime(v,ct,now?.05:1.1)})}
