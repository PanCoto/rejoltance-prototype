const MSTEMS=['base','arp','mel','drm','war','tns'];   // 'str' (bowed synth stem) deliberately left out
// Tracks: each = 7 looping stems (+ a full mix used when the page is opened from disk, file://, where stems can't be loaded).
// 'slow' tracks open a game; once the game turns late / dangerous it swings into that track's paired 'fast' version (same key, chords and melody, busier arrangement), on a bar line.
const MTRACKS=[
 // 8 slow tracks (a game opens on any of them), each paired with a fast twin: {twin:index of its fast partner}
 {dir:'audio/stems2',mix:'audio/music2.mp3',kind:'slow',loop:1924352/44100,lead:.5,bars:16,twin:4},
 {dir:'audio/stems4',mix:'audio/music4.mp3',kind:'slow',loop:2228224/44100,lead:.5,bars:16,twin:5},
 {dir:'audio/stems5',mix:'audio/music5.mp3',kind:'slow',loop:2065152/44100,lead:.5,bars:16,twin:6},
 {dir:'audio/stems6',mix:'audio/music6.mp3',kind:'slow',loop:2490368/44100,lead:.5,bars:16,twin:7},
 // fast twins of the four original slow tracks (same key / chords / melody, busier arrangement)
 {dir:'audio/stems2f',mix:'audio/music2f.mp3',kind:'fast',loop:1459968/44100,lead:.5,bars:16},
 {dir:'audio/stems4f',mix:'audio/music4f.mp3',kind:'fast',loop:1693440/44100,lead:.5,bars:16},
 {dir:'audio/stems5f',mix:'audio/music5f.mp3',kind:'fast',loop:1568000/44100,lead:.5,bars:16},
 {dir:'audio/stems6f',mix:'audio/music6f.mp3',kind:'fast',loop:1881600/44100,lead:.5,bars:16},
 // slow twins of the four original fast tracks (same key / chords / melody, sparser and slower)
 {dir:'audio/stems3s',mix:'audio/music3s.mp3',kind:'slow',loop:3097728/44100,lead:.5,bars:24,twin:12},
 {dir:'audio/stems7s',mix:'audio/music7s.mp3',kind:'slow',loop:3292800/44100,lead:.5,bars:28,twin:13},
 {dir:'audio/stems8s',mix:'audio/music8s.mp3',kind:'slow',loop:3456000/44100,lead:.5,bars:32,twin:14},
 {dir:'audio/stems9s',mix:'audio/music9s.mp3',kind:'slow',loop:2953728/44100,lead:.5,bars:24,twin:15},
 // the four original fast tracks
 {dir:'audio/stems3',mix:'audio/music3.mp3',kind:'fast',loop:1924224/44100,lead:.5,bars:24},
 {dir:'audio/stems7',mix:'audio/music7.mp3',kind:'fast',loop:2058112/44100,lead:.5,bars:28},
 {dir:'audio/stems8',mix:'audio/music8.mp3',kind:'fast',loop:2170880/44100,lead:.5,bars:32},
 {dir:'audio/stems9',mix:'audio/music9.mp3',kind:'fast',loop:1840512/44100,lead:.5,bars:24}];
const MPOOL=k=>MTRACKS.map((t,i)=>i).filter(i=>MTRACKS[i].kind==k);
const mpick=k=>{const p=MPOOL(k);return p[Math.floor(Math.random()*p.length)]};   // uniform: every track in the pool is equally likely
const MUS={vol:1,mode:'',started:false,ready:false,ctx:null,master:null,g:{},src:[],last:{},force:null,want:null,track:0,cur:null,buf:{},fast:false};
try{const v=localStorage.getItem('rj_mus');if(v!==null&&v!==''&&!isNaN(+v))MUS.vol=Math.max(0,Math.min(1,+v/100))}catch(e){}
const mclamp=(x,a,b)=>Math.max(a,Math.min(b,x));
function musicSetVol(pct){MUS.vol=mclamp(pct/100,0,1);const a=document.getElementById('au');if(a)a.volume=MUS.vol;
 if(MUS.master)MUS.master.gain.setTargetAtTime(MUS.vol*.85,MUS.ctx.currentTime,.05)}
function musicStart(){
 if(MUS.started){if(MUS.mode=='html')musicUpdate();else if(MUS.ctx&&MUS.ctx.state=='suspended')MUS.ctx.resume();return}
 MUS.started=true;const ctx=(typeof SFX!=='undefined'&&SFX.ctx)||null;
 if(!ctx||location.protocol=='file:')return musicFallback();
 MUS.ctx=ctx;MUS.mode='web';if(ctx.state=='suspended')ctx.resume();
 MUS.master=ctx.createGain();MUS.master.gain.value=MUS.vol*.85;
 const comp=ctx.createDynamicsCompressor();comp.threshold.value=-14;comp.knee.value=10;comp.ratio.value=3;comp.attack.value=.02;comp.release.value=.3;
 MUS.master.connect(comp);comp.connect(ctx.destination);
 if(MUS.want==null)MUS.want=mpick('slow');
 musicPlay(MUS.want,false).catch(()=>{if(MUS.want!==0){MUS.want=0;return musicPlay(0,false)}throw 0}).catch(()=>musicFallback())}
function musicLoad(i){if(!MUS.buf[i]){const T=MTRACKS[i];
  MUS.buf[i]=Promise.all(MSTEMS.map(n=>fetch(T.dir+'/'+n+'.mp3').then(r=>r.ok?r.arrayBuffer():Promise.reject()).then(b=>MUS.ctx.decodeAudioData(b)))).catch(e=>{delete MUS.buf[i];throw e})}
 return MUS.buf[i]}
// Start track i on its own bus; if another track is playing, crossfade into the new one.
function musicPlay(i,fade){return musicLoad(i).then(bufs=>{if(fade&&MUS.want!==i)return;
 const ctx=MUS.ctx,T=MTRACKS[i],bus=ctx.createGain(),g={},src=[],old=MUS.cur,P=old&&MTRACKS[old.i];
 let t0=ctx.currentTime+.15,off=T.lead,twin=false;
 if(fade&&P&&P.twin===i){const y=musicSync(P,T,old.vs,t0);t0=y.t;off=y.off;twin=true}   // slow -> its fast twin: wait for the next bar line, enter on the same bar
 bus.gain.value=fade?0:1;bus.connect(MUS.master);
 MSTEMS.forEach((n,k)=>{const s=ctx.createBufferSource(),gn=ctx.createGain();s.buffer=bufs[k];s.loop=true;s.loopStart=T.lead;s.loopEnd=T.lead+T.loop;
  gn.gain.value=0;s.connect(gn);gn.connect(bus);s.start(t0,off);g[n]=gn;src.push(s)});
 MUS.cur={bus,src,i,vs:t0-(off-T.lead)};MUS.g=g;MUS.src=src;MUS.track=i;MUS.ready=true;MUS.last={};musicUpdate(true);
 if(old){const ot=twin?t0:ctx.currentTime;old.bus.gain.setTargetAtTime(0,ot,twin?.45:.6);setTimeout(()=>old.src.forEach(s=>{try{s.stop()}catch(e){}}),Math.max(0,(ot-ctx.currentTime)*1000)+5000)}
 if(fade)bus.gain.setTargetAtTime(1,t0,twin?.3:.6)})}
// Next bar line of track P at/after time 'now' -> when to start its twin U, and where in U to start (same bar number). vs = time P's bar 0 played (or would have).
function musicSync(P,U,vs,now){const bl=P.loop/P.bars,k=Math.max(0,Math.ceil((now-vs)/bl-1e-6)),bar=k%P.bars;return{t:vs+k*bl,off:U.lead+bar*(U.loop/U.bars)}}
// Swap to track i (crossfade in web mode, hard switch in file:// mode).
function musicSwitch(i){MUS.want=i;
 if(MUS.mode=='web'&&MUS.ready){if(i!==MUS.track)musicPlay(i,true).catch(()=>{MUS.want=MUS.track})}
 else if(MUS.mode=='html'&&i!==htmlTrack)htmlSet(i)}
// New game: start again on a random slow track.
function musicNewGame(){MUS.fast=false;musicSwitch(mpick('slow'))}
// Late game / low health (either hero) -> latch over to a random fast track for the rest of the game.
function musicLate(){if(MUS.force||typeof G==='undefined'||!G||G.over||document.getElementById('game').style.display!='block')return false;
 return G.p[0].hp<=8||G.p[1].hp<=6||G.turn>=9}
// The fast twin of the track that is (about to be) playing; if it is already a fast one, stay on it.
function musicTwin(){const c=MUS.want!=null?MUS.want:MUS.track,T=MTRACKS[c];return T&&T.twin!=null?T.twin:(T&&T.kind=='fast'?c:mpick('fast'))}
function musicFallback(){MUS.mode='html';const a=document.getElementById('au');a.volume=MUS.vol;
 if(MUS.want==null)MUS.want=mpick('slow');
 if(MUS.want!==htmlTrack)htmlSet(MUS.want);musicUpdate()}
let htmlTrack=-1;
function htmlSet(i){const a=document.getElementById('au'),P=MTRACKS[htmlTrack],U=MTRACKS[i];let off=0;
 if(P&&P.twin===i&&a.currentTime>0)off=(Math.round((a.currentTime%P.loop)/(P.loop/P.bars))%P.bars)*(U.loop/U.bars);   // same bar of the twin
 htmlTrack=i;a.src=U.mix;a.load();a.addEventListener('loadedmetadata',()=>{try{a.currentTime=off}catch(e){}},{once:true})}
const inGameNow=()=>typeof G!=='undefined'&&G&&document.getElementById('game').style.display=='block';
function musicTargets(){
 const inG=typeof G!=='undefined'&&G&&document.getElementById('game').style.display=='block';
 let hp=20,ehp=20,turn=0,over=null;
 if(MUS.force){hp=MUS.force.hp==null?20:MUS.force.hp;ehp=MUS.force.ehp==null?20:MUS.force.ehp;turn=MUS.force.turn||1}
 else if(inG){hp=G.p[0].hp;ehp=G.p[1].hp;turn=G.turn;over=G.over}
 else return{base:0,arp:0,mel:0,drm:0,str:0,war:0,tns:0};   // main menu: no music
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
 if(!MUS.fast&&MUS.started&&musicLate()){MUS.fast=true;musicSwitch(musicTwin())}
 if(MUS.mode=='html'){const a=document.getElementById('au');if(inGameNow())a.play().catch(()=>{});else a.pause();return}
 if(MUS.mode!='web'||!MUS.ready)return;const t=musicTargets(),ct=MUS.ctx.currentTime;
 MSTEMS.forEach(n=>{const v=t[n]||0;if(!now&&Math.abs(v-(MUS.last[n]==null?-1:MUS.last[n]))<.02)return;MUS.last[n]=v;
  MUS.g[n].gain.setTargetAtTime(v,ct,now?.05:1.1)})}
