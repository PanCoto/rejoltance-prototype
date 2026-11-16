/* Menu-side music: two themes made by tools/make_menu_music.py and tools/make_collection_music.py.
   - audio/menu.mp3        main menu (not in a game, not in "Watch bots")
   - audio/collection.mp3  Collection / Decks screen (#bld), a calmer, more "strategic" theme
   Switching between the two crossfades. Volume follows the Music slider (MUS.vol from music.js). Starts on the first click / key press
   (browsers block audio before that). Web Audio loop (gapless, same pre-roll trick as music.js); when opened from disk (file://) it falls back to <audio>. */
const MTH={
 menu:{src:'audio/menu.mp3',loop:4342272/44100,gain:.7},
 col:{src:'audio/collection.mp3',loop:3602944/44100,gain:.7}};
const MENU_LEAD=.5;
const MM_={ctx:null,fail:false,loading:false,t:{}};
Object.keys(MTH).forEach(k=>MM_.t[k]={buf:null,g:null,src:null,el:null,stopT:0});
function mmWanted(){   // which theme should be audible right now (or '')
 if(document.hidden||MUS.vol<=0)return '';
 const m=document.getElementById('menu'),b=document.getElementById('bld');
 if(b&&b.style.display=='block')return 'col';
 if(m&&m.style.display=='flex'&&!window.WATCH)return 'menu';
 return ''}
const mmVol=k=>MUS.vol*.85*MTH[k].gain;
function mmLoad(){if(MM_.loading)return;MM_.loading=true;
 Object.keys(MTH).forEach(k=>fetch(MTH[k].src).then(r=>r.ok?r.arrayBuffer():Promise.reject()).then(b=>MM_.ctx.decodeAudioData(b)).then(b=>{MM_.t[k].buf=b;mmTick()}).catch(()=>{}))}
function mmEnsure(){   // called on a user gesture
 if(location.protocol=='file:')return false;
 if(!MM_.ctx){const AC=window.AudioContext||window.webkitAudioContext;if(!AC){MM_.fail=true;return false}
  MM_.ctx=new AC();Object.keys(MTH).forEach(k=>{const g=MM_.ctx.createGain();g.gain.value=0;g.connect(MM_.ctx.destination);MM_.t[k].g=g});mmLoad()}
 if(MM_.ctx.state=='suspended')MM_.ctx.resume().catch(()=>{});return true}
function mmTick(){
 const want=mmWanted();
 if(location.protocol=='file:'||(MM_.fail&&!MM_.ctx)){Object.keys(MTH).forEach(k=>mmTickEl(k,want==k));return}
 if(!MM_.ctx||MM_.ctx.state!='running')return;
 const ct=MM_.ctx.currentTime;
 Object.keys(MTH).forEach(k=>{const T=MTH[k],s=MM_.t[k];
  if(want==k&&s.buf){clearTimeout(s.stopT);s.stopT=0;
   if(!s.src){const n=MM_.ctx.createBufferSource();n.buffer=s.buf;n.loop=true;n.loopStart=MENU_LEAD;n.loopEnd=MENU_LEAD+T.loop;n.connect(s.g);
    s.g.gain.cancelScheduledValues(ct);s.g.gain.setValueAtTime(0,ct);n.start(ct+.05,MENU_LEAD);s.src=n}
   s.g.gain.setTargetAtTime(mmVol(k),ct,.9)}
  else if(s.src){s.g.gain.setTargetAtTime(0,ct,.35);
   if(!s.stopT)s.stopT=setTimeout(()=>{s.stopT=0;if(mmWanted()!=k){try{s.src.stop()}catch(e){}s.src=null}},2200)}})}
function mmTickEl(k,on){   // file:// fallback: simple <audio>, loop point handled by hand
 const T=MTH[k],s=MM_.t[k];
 if(!s.el){if(!on)return;const a=new Audio(T.src);a.preload='auto';a.loop=true;a.volume=0;
  a.addEventListener('timeupdate',()=>{if(a.currentTime>=MENU_LEAD+T.loop)a.currentTime-=T.loop});s.el=a}
 const a=s.el;
 if(on){if(a.paused)a.play().catch(()=>{});a.volume=Math.min(1,a.volume+(mmVol(k)-a.volume)*.25)}
 else if(!a.paused){a.volume=Math.max(0,a.volume*.7-.01);if(a.volume<=.01)a.pause()}}
function mmGesture(){if(mmEnsure())mmTick();else Object.keys(MTH).forEach(k=>mmTickEl(k,mmWanted()==k))}
['pointerdown','keydown','touchstart'].forEach(e=>addEventListener(e,mmGesture,{capture:true,passive:true}));
document.addEventListener('visibilitychange',mmTick);
setInterval(mmTick,300);
mmEnsure();   // starts straight away if the browser already allows audio, otherwise on the first click
