/* ============================================================================================
   GUIDED TUTORIAL  (menu: Play offline -> Tutorial)

   How it works
   - A normal game is created from tutorial-data.js: fixed cards, fixed draw order, scripted opponent.
   - ui.js calls TUT.cue(name, arg) at fixed points of the game loop (round start, your phase, enemy
     phase, enemy played a card, combat, each lane). A cue handler below shows pop-ups and the game
     waits until it is done. Handlers for YOUR phases call u.go() to hand control to you and then guide
     your clicks.
   - While a step is active, every click, key press and drag that is not part of the step is blocked, so
     the player can only do what the pop-up asks for. The step highlights what to use (dimmed screen +
     glowing frame). The "Exit tutorial" button is always there.
   - All texts are in the TXT-free handlers below (search for the quotes). Translate there.
   ============================================================================================ */
(()=>{
const D=TUTDATA,ID=D.ID,ABORT={abort:1};
const CHAP=['The basics','Your first Unit','Combat','Actions and targets','Flying and the finish'];
let S=null,raf=0,els=null;
const T=window.TUT={active:false};

/* ---------- geometry (everything is in 1920x1080 stage pixels) ---------- */
const stg=()=>$('stage').getBoundingClientRect();
const rc=el=>{const r=el.getBoundingClientRect(),s=stg(),k=s.width/1920;return{x:(r.left-s.left)/k,y:(r.top-s.top)/k,w:r.width/k,h:r.height/k}};
const pad=(r,p)=>({x:r.x-p,y:r.y-p,w:r.w+2*p,h:r.h+2*p});
const union=a=>{const x=Math.min(...a.map(r=>r.x)),y=Math.min(...a.map(r=>r.y)),X=Math.max(...a.map(r=>r.x+r.w)),Y=Math.max(...a.map(r=>r.y+r.h));return{x,y,w:X-x,h:Y-y}};
function res(it){if(!it)return[];if(typeof it=='function')it=it();if(!it)return[];if(Array.isArray(it))return it.flatMap(res);
 if(typeof it=='string'){const e=document.querySelector(it);return e&&getComputedStyle(e).display!='none'?[rc(e)]:[]}
 if(it.getBoundingClientRect)return[rc(it)];return it.w!=null?[it]:[]}
const slotSel=(r,i)=>`#board .slot[data-r="${r}"][data-i="${i}"]`;
const cardEls=id=>[...document.querySelectorAll('#hand .hc')].filter(h=>{const c=h.querySelector('.card');return c&&(id==null||+c.dataset.cid==id)});
const H={
 hand:id=>()=>cardEls(id).map(rc),
 handAll:()=>{const a=cardEls().map(rc);return a.length?[union(a)]:[]},
 lastCard:()=>{const a=cardEls();return a.length?[rc(a[a.length-1])]:[]},
 slot:(r,i)=>slotSel(r,i),
 lane:i=>()=>[...res(slotSel(0,i)),...res(slotSel(1,i))].length?[union([...res(slotSel(0,i)),...res(slotSel(1,i))])]:[],
 rows:()=>res('#board')
};
const A={   // what the player is allowed to click in a step
 card:id=>t=>{const h=t.closest('#hand .hc');if(!h)return false;const c=h.querySelector('.card');return!!c&&+c.dataset.cid==id},
 slot:(r,i)=>t=>{const s=t.closest('#board .slot');return!!s&&+s.dataset.r==r&&+s.dataset.i==i}
};
const inHand=id=>G.p[0].hand.some(c=>c.id==id);
const isSel=id=>sel!=null&&!!G.p[0].hand[sel]&&G.p[0].hand[sel].id==id;
const zoomOf=id=>{const z=$('zoom');if(z.style.display!='block')return false;const c=z.querySelector('.card');return!!c&&+c.dataset.cid==id};
const nameOf=id=>CD[id].Name;

/* ---------- waiting ---------- */
const until=pred=>new Promise((ok,no)=>{const t=()=>{if(!S||S.over)return no(ABORT);let v=false;try{v=pred()}catch(e){}if(v)ok();else setTimeout(t,80)};t()});
const wait=ms=>new Promise((ok,no)=>setTimeout(()=>(!S||S.over)?no(ABORT):ok(),ms));

/* ---------- DOM layer ---------- */
function init(){if(els)return;const st=$('stage'),mk=(tag,id,cls)=>{const e=document.createElement(tag);if(id)e.id=id;if(cls)e.className=cls;st.appendChild(e);return e};
 els={dim:mk('div','tutdim'),rings:mk('div','tutrings'),box:mk('div','tutbox'),exit:mk('button','tutexit'),cfm:mk('div','tutcfm'),end:mk('div','tutend')};
 els.exit.textContent='Exit tutorial';
 els.exit.onclick=e=>{e.stopPropagation();els.cfm.style.display='flex'};
 els.cfm.innerHTML='<div><h3>Leave the tutorial?</h3><p>You can start it again any time from Play offline.</p><div class="tbb"><button id="tutcy" class="pri">Leave</button><button id="tutcn">Keep playing</button></div></div>';
 els.cfm.querySelector('#tutcy').onclick=e=>{e.stopPropagation();els.cfm.style.display='none';T.stop();toMenu()};
 els.cfm.querySelector('#tutcn').onclick=e=>{e.stopPropagation();els.cfm.style.display='none'}}

function setCur(c){S.cur=c;S.allow=c.allow||[];S.skipped=false;const b=els.box;
 const dots=CHAP.map((_,i)=>`<i class="${i+1<c.chap?'d':i+1==c.chap?'n':''}"></i>`).join('');
 b.innerHTML=`<i class="ttail"></i><div class="tbh"><span>${c.chap?'Chapter '+c.chap+' / '+CHAP.length+' - '+CHAP[c.chap-1]:'Tutorial'}</span><span class="tbd">${dots}</span></div>`+
  (c.title?`<h3>${c.title}</h3>`:'')+`<div class="tbx">${c.text||''}</div>`+
  `<div class="tbb">${c.next?'<button class="pri" id="tutnext">'+(c.next===true?'Next &#9656;':c.next)+'</button>':''}${c.skipAfter?'<button id="tutskip" style="display:none">Skip &#9656;</button>':''}</div>`;
 b.style.display='block';b.classList.remove('shake');
 const nb=b.querySelector('#tutnext');if(nb)nb.onclick=e=>{e.stopPropagation();advance()};
 const sk=b.querySelector('#tutskip');if(sk){sk.onclick=e=>{e.stopPropagation();S.skipped=true};setTimeout(()=>{if(S&&S.cur===c&&sk)sk.style.display=''},c.skipAfter)}
 place(c)}
function advance(){if(!S||!S.waiter)return;const w=S.waiter;S.waiter=null;sfx('endTurn');w.res()}
function place(c){const b=els.box,w=560,h=b.offsetHeight,tr=(c.target?res(c.target):[]).map(r=>pad(r,c.pad==null?10:c.pad)),t=tr.length?union(tr):null;
 const prot=[...(c.protect?res(c.protect):[])],m=$('msg');if(m&&m.style.display=='block')prot.push(rc(m));if(c.zoom)prot.push({x:20,y:130,w:345,h:640});
 const M=30,cand=[];
 if(t){[['b',t.x+t.w/2-w/2,t.y+t.h+M],['t',t.x+t.w/2-w/2,t.y-h-M],['r',t.x+t.w+M,t.y+t.h/2-h/2],['l',t.x-w-M,t.y+t.h/2-h/2]].forEach(([s,x,y])=>cand.push({s,x,y,pref:c.side&&c.side.includes(s)?-400:0}))}
 [[960-w/2,540-h/2],[960-w/2,96],[960-w/2,1070-h],[400,96],[1530-w,96],[400,1070-h],[1530-w,520]].forEach(([x,y])=>cand.push({s:'',x,y,pref:t?60:0}));
 const ov=(a,r)=>Math.max(0,Math.min(a.x+a.w,r.x+r.w)-Math.max(a.x,r.x))*Math.max(0,Math.min(a.y+a.h,r.y+r.h)-Math.max(a.y,r.y));
 let best=null;cand.forEach((k,i)=>{const x=Math.max(12,Math.min(1908-w,k.x)),y=Math.max(12,Math.min(1068-h,k.y)),bx={x,y,w,h};
  const sc=(Math.abs(x-k.x)+Math.abs(y-k.y))*3+tr.reduce((a,r)=>a+ov(bx,r),0)/25+prot.reduce((a,r)=>a+ov(bx,r),0)/120+k.pref+i;
  if(!best||sc<best.sc)best={sc,x,y,s:k.s}});
 b.style.left=best.x+'px';b.style.top=best.y+'px';
 const tail=b.querySelector('.ttail');tail.className='ttail';
 if(t&&!tr.some(r=>{const bx={x:best.x,y:best.y,w,h};return ov(bx,r)>0})){const bc={x:best.x+w/2,y:best.y+h/2},tc={x:t.x+t.w/2,y:t.y+t.h/2},dx=tc.x-bc.x,dy=tc.y-bc.y;
  if(Math.abs(dy)*w>=Math.abs(dx)*h){tail.classList.add(dy>0?'dn':'up');tail.style.left=Math.max(40,Math.min(w-40,tc.x-best.x))+'px';tail.style.top=''}
  else{tail.classList.add(dx>0?'rt':'lf');tail.style.top=Math.max(40,Math.min(h-40,tc.y-best.y))+'px';tail.style.left=''}}
 else tail.className='ttail off'}
function clear(){if(!S)return;S.cur=null;S.allow=[];S.waiter&&S.waiter.rej(ABORT);S.waiter=null;els.box.style.display='none'}
function deny(){if(!S||!S.cur)return;const b=els.box;b.classList.remove('shake');void b.offsetWidth;b.classList.add('shake')}

/* ---------- spotlight (dimmed screen with holes + glowing frames), redrawn every frame ---------- */
const rr=(x,y,w,h,r)=>`M${x+r} ${y}H${x+w-r}A${r} ${r} 0 0 1 ${x+w} ${y+r}V${y+h-r}A${r} ${r} 0 0 1 ${x+w-r} ${y+h}H${x+r}A${r} ${r} 0 0 1 ${x} ${y+h-r}V${y+r}A${r} ${r} 0 0 1 ${x+r} ${y}Z`;
function frame(){const c=S.cur,d=els.dim,so=$('setmenu').style.display=='flex';   // Settings is a full-screen view: hide the tutorial layer while it is open
 ['dim','rings','box','exit'].forEach(k=>{els[k].style.visibility=so?'hidden':''});
 if(!c||c.dim===false){d.classList.remove('on');els.rings.innerHTML='';S.cr=null;return}
 const rs=c.target?res(c.target).map(r=>pad(r,c.pad==null?10:c.pad)):[];
 if(S.cr&&S.cr.length==rs.length)S.cr=S.cr.map((o,i)=>({x:o.x+(rs[i].x-o.x)*.3,y:o.y+(rs[i].y-o.y)*.3,w:o.w+(rs[i].w-o.w)*.3,h:o.h+(rs[i].h-o.h)*.3}));else S.cr=rs;
 d.classList.add('on');d.style.clipPath=S.cr.length?`path(evenodd,"M0 0H1920V1080H0Z ${S.cr.map(r=>rr(r.x,r.y,r.w,r.h,16)).join(' ')}")`:'none';
 const rg=els.rings;while(rg.children.length>S.cr.length)rg.lastChild.remove();while(rg.children.length<S.cr.length){const e=document.createElement('div');e.className='tring';rg.appendChild(e)}
 S.cr.forEach((r,i)=>{const e=rg.children[i];e.style.cssText=`left:${r.x}px;top:${r.y}px;width:${r.w}px;height:${r.h}px`})}
function loop(){if(!S||S.over){raf=0;return}try{frame()}catch(e){}raf=requestAnimationFrame(loop)}

/* ---------- input lock: only what the current step allows gets through ---------- */
const GKEYS=/^([1-8]|l|L|Enter| |Escape|ArrowLeft|ArrowRight|ArrowUp|ArrowDown)$/;
function okTarget(t){if(!t||!t.closest)return true;
 if(t.closest('#tutbox,#tutexit,#tutcfm,#tutend'))return true;
 if(t.closest('#setmenu')||t.closest('#mu'))return true;
 return(S.allow||[]).some(m=>typeof m=='function'?m(t):!!t.closest(m))}
const locked=()=>S&&!S.over&&T.active;
addEventListener('click',e=>{if(!locked())return;if(okTarget(e.target))return;e.stopImmediatePropagation();e.preventDefault();if(e.isTrusted&&S.allow.length)deny()},true);
addEventListener('pointerdown',e=>{if(!locked())return;if(okTarget(e.target))return;if(e.target.closest&&e.target.closest('#hand,#board'))e.stopImmediatePropagation()},true);
addEventListener('contextmenu',e=>{if(!locked())return;e.preventDefault();e.stopImmediatePropagation()},true);
addEventListener('keydown',e=>{if(!locked()||e.ctrlKey||e.metaKey||e.altKey)return;
 if($('setmenu').style.display=='flex')return;
 if(els.cfm.style.display=='flex'){if(e.key=='Escape')els.cfm.style.display='none';e.stopImmediatePropagation();return}
 if(!GKEYS.test(e.key))return;
 if(S.waiter&&(e.key=='Enter'||e.key==' '||e.key=='ArrowRight')){e.preventDefault();e.stopImmediatePropagation();advance();return}
 if((e.key=='Enter'||e.key==' ')&&okTarget($('end'))&&(S.allow||[]).includes('#end'))return;   // Enter = End Turn, only when the step asks for it
 e.preventDefault();e.stopImmediatePropagation();if(S.allow.length&&/^[1-8]|Enter| $/.test(e.key))deny()},true);

/* ---------- per-handler toolkit (u): every pop-up remembers which handler made it ---------- */
function bind(run,chap0){let chap=chap0||1;
 const mine=c=>S&&S.cur===c;
 const u={
  chap:n=>{chap=n},
  clear:()=>{if(S&&S.cur&&S.cur.run===run)clear()},
  go(){},
  pop:c=>{c=Object.assign({chap,next:true,run},c);return new Promise((ok,no)=>{S.waiter={res:ok,rej:no};setCur(c)})},
  hint:c=>{c=Object.assign({chap,run},c);if(S.waiter){S.waiter=null}setCur(c);return c},
  until,wait,
  // hover a card to read it, then a pop-up explains it (the zoomed card stays on screen meanwhile)
  async read(id,title,text){
   const c=u.hint({title:'Read your cards',text:`Move the mouse over <b>${nameOf(id)}</b> to read it. <small>(On a touch screen, tap it.)</small>`,target:H.hand(id),allow:[A.card(id)],zoom:true,side:'t',skipAfter:7000});
   await until(()=>zoomOf(id)||isSel(id)||S.skipped);
   const x=G.p[0].hand.find(k=>k.id==id);if(x&&!isSel(id)){stickyZoom=true;showZoom(x,false)}
   await u.pop({title,text,target:H.hand(id),zoom:true,side:'t'});unpin()},
  // select a card and put it in a lane / on a target, step by step (re-evaluated every 90 ms, so cancelling is harmless)
  async guide(id,cfg){let last='';const spell=CD[id].Type=='Spell',nm=nameOf(id);
   const set=(k,c)=>{if(last===k)return;last=k;if(c)u.hint(c);else u.clear()};
   for(;;){await wait(90);
    if(!inHand(id)){if(busy){set('busy');continue}break}
    if(busy){set('busy');continue}
    if(!isSel(id))set('sel',{title:cfg.selTitle||'Pick up the card',text:cfg.selT||`Click <b>${nm}</b> to select it.`,target:H.hand(id),allow:[A.card(id)],side:'t'});
    else if(!spell&&!pend)set('lane',{title:'Choose a lane',text:cfg.laneT||`Now click the glowing <b>lane ${ROM(cfg.lane+1)}</b> to place ${nm} there. <small>(Dragging the card there works too.)</small>`,target:H.slot(0,cfg.lane),allow:[A.slot(0,cfg.lane)],side:cfg.side});
    else if(pend&&!pend.pre&&!pend.ext)set('tgt',{title:'Choose a target',text:cfg.tgtT,target:H.slot(cfg.tgt[0],cfg.tgt[1]),allow:[A.slot(cfg.tgt[0],cfg.tgt[1])],side:cfg.side});
    else set('wait')}
   u.clear()},
  async endTurn(text,title){await until(()=>!busy&&G.act==0&&!G.over);const s=G.step,t=G.turn;
   const c=u.hint({title:title||'End your phase',text,target:'#end',allow:['#end'],side:'t'});
   await until(()=>G.step!==s||G.turn!==t||G.over);if(mine(c))clear()}
 };return u}

/* ---------- the opponent's scripted moves (read by flow() in ui.js) ---------- */
T.enemyMove=()=>{const k=G.turn+':'+G.step,q=(G.tutq=G.tutq||{});if(!q[k])q[k]=(D.enemyPlan[k]||[]).slice();
 const m=q[k].shift();if(!m)return null;const p=G.p[1],ci=p.hand.findIndex(c=>c.id==m.id);if(ci<0)return null;
 let ln=m.ln;if(p.ln[ln])ln=[0,1,2,3].find(i=>!p.ln[i]);return{ci,ln,pk:[],sp:CD[m.id].Type=='Spell'?1:0,id:m.id}};
T.fix=()=>{G.p.forEach(p=>{p.mb=p.b=Math.min(10,G.turn)})};   // Blood = round number, whatever START_MANA says

/* ---------- cues called from the game loop ---------- */
T.cue=async(name,arg)=>{if(!S||S.over||!G||!G.tut)return;
 const keys=[name+':'+G.turn+':'+(typeof arg=='number'?arg:G.step),name+':'+G.turn],h=CUES[keys.find(k=>CUES[k])];if(!h)return;
 const run=++S.run,u=bind(run);
 await new Promise(ok=>{let done=false;const go=()=>{if(!done){done=true;ok()}};u.go=go;
  Promise.resolve().then(()=>h(u,arg)).catch(e=>{if(e!==ABORT)console.error('tutorial step failed',e)}).then(()=>{u.clear();go()})})};

/* ======================================== THE LESSON ======================================== */
const B=ID.boom,SC=ID.scout,DG=ID.dagger,GA=ID.garg,MT=ID.touch;
const CUES={
/* ---------- round 1 ---------- */
'round:1':async u=>{u.chap(2);
 await u.pop({title:'Round 1',text:'A match is played in <b>rounds</b>. At the start of each round you get fresh Blood and, from round 2 on, you draw a card.',target:'#round'});
 await u.pop({title:'Blood',text:'These red dots are your <b>Blood</b>, the resource you spend to play cards. Round 1 gives you <b>1</b> Blood, round 2 gives <b>2</b>, and so on up to 10. Unspent Blood is lost at the end of the round, so use it!',target:'#pdots',side:'t'});
 await u.pop({title:'The phases of a round',text:'Every round has <b>three phases</b>, then <b>Combat</b>:<br>1. The starting player plays <b>Units</b>.<br>2. The other player plays <b>Units and Actions</b>.<br>3. The starting player plays <b>Actions</b>.<br>You start the odd rounds, the opponent starts the even ones. The current phase is shown here.',target:'#phase',side:'b'});
},
'myphase:1:0':async u=>{u.chap(2);
 await u.pop({title:'Your Units phase',text:'It is your turn! In this phase you may only play <b>Units</b>. You have 1 Blood, so let\'s play the cheapest card you have.',target:H.handAll,side:'t'});
 u.go();
 await u.read(B,'BoomBot',`Costs <b>1</b> Blood (red number, top right). It is a <b>1/1</b> Unit: it deals 1 damage (ATK) and can take 1 damage (HP). Its text: when it is destroyed it deals 2 damage to the enemy Hero.<br>You can read any card like this, in your hand or on the board. Keywords such as <b>Flying</b> get a short explanation too.`);
 await u.guide(B,{lane:1,selT:'Click <b>BoomBot</b> to select it.'});
 await u.pop({title:'BoomBot is in play',text:'Your Unit stands in <b>lane II</b>. It cost 1 Blood, so your Blood dots are now empty: you cannot play anything else this round.',target:['#pdots',H.slot(0,1)],side:'t'});
 await u.endTurn('Press <b>End Turn</b> to finish your phase. (Enter works too.)');
},
'enemyphase:1:1':async u=>{u.chap(2);
 await u.pop({title:'Opponent\'s phase',text:'Now the opponent plays <b>Units and Actions</b>. It also has just 1 Blood, but nothing in its hand costs that little, so it passes.',target:['#enb','#edots'],side:'l'});
},
'myphase:1:2':async u=>{u.chap(2);
 await u.pop({title:'Your Actions phase',text:'Last phase: only <b>Actions</b> (one-shot spells) can be played now. You have no Blood and no Actions in your hand, so there is nothing to do.',target:'#phase',side:'b'});
 u.go();
 await u.endTurn('Press <b>End Turn</b> to move on to Combat.');
},
'combat:1':async u=>{u.chap(3);
 await u.pop({title:'Combat!',text:'Now all lanes fight, one by one from <b>I</b> to <b>IV</b>. Every Unit attacks the enemy Unit in front of it. If its lane is <b>empty</b>, it hits the enemy <b>Hero</b> instead. Watch!',target:H.rows});
},
'lane:1:1':async u=>{u.chap(3);
 await u.pop({title:'Lane II',text:'Nothing stands in front of your BoomBot, so it hits the enemy Hero for <b>1</b> damage.',target:H.lane(1),side:'l'});
},
/* ---------- round 2 ---------- */
'round:2':async u=>{u.chap(3);
 await u.pop({title:'Round 1 is over',text:'Your BoomBot hit the enemy Hero: it is down to <b>7</b> HP. Heroes do not heal between rounds.',target:'#ehero',side:'l'});
 u.chap(4);
 await u.pop({title:'Round 2',text:'Your Blood refilled and grew to <b>2</b>. You also drew a card: <b>Gargoyle</b>, the last card in your hand.',target:['#pdots',H.lastCard],side:'t'});
 await u.pop({title:'Who starts?',text:'The starting player alternates every round. This time the <b>opponent</b> starts, so it plays its Units first.',target:'#phase',side:'b'});
},
'enemyplayed:2:0':async u=>{u.chap(4);
 await u.pop({title:'The opponent plays a Unit',text:'<b>Black Goat</b> landed in lane II. It is a 0/4 with <b>Taunt</b>: while it lives, damage aimed at its Hero hits the Goat instead, so it shields the Hero. Let\'s remove it!<br><small>(Hover over any Unit on the board to read it.)</small>',target:H.slot(1,1)});
},
'myphase:2:1':async u=>{u.chap(4);
 await u.pop({title:'Your Units and Actions phase',text:'You went second this round, so in this phase you may play Units <b>and</b> Actions, and you already know what the opponent did. You have <b>2</b> Blood. The plan: <b>Scout</b> (1) marks the Goat, then <b>Dagger Throw</b> (1) finishes it.',target:['#phase',H.handAll],side:'t'});
 u.go();
 await u.guide(SC,{lane:2,selT:'Click <b>Scout</b> to select it.',side:'t'});
 await u.pop({title:'Mark',text:'Scout\'s ability marked <b>Black Goat</b> automatically: it was the only target. A <b>Marked</b> Unit takes <b>double damage</b>.',target:H.slot(1,1)});
 await u.guide(DG,{tgt:[1,1],selT:'<b>Dagger Throw</b> is an <b>Action</b>: it deals 2 damage to a Unit. Click it to select it.',tgtT:'Actions need a target. Click the <b>Black Goat</b> (red frame).'});
 await u.pop({title:'Boom!',text:'2 damage, doubled by the Mark, makes <b>4</b>: the Goat is destroyed. Used Actions and destroyed Units go to your <b>discard pile</b>.',target:'#pile',side:'r'});
 await u.endTurn('You have no Blood left. Press <b>End Turn</b>.');
},
'combat:2':async u=>{u.chap(4);
 await u.pop({title:'Combat',text:'The Goat is gone, so nothing blocks your Units: <b>BoomBot</b> and <b>Scout</b> both go straight for the Hero.',target:H.rows});
},
/* ---------- round 3 ---------- */
'round:3':async u=>{u.chap(4);
 await u.pop({title:'Round 2 is over',text:'The enemy Hero took 2 more damage and is at <b>5</b> HP. Almost there!',target:'#ehero',side:'l'});
 u.chap(5);
 await u.pop({title:'Round 3',text:'You have <b>3</b> Blood now and drew <b>Magic Touch</b>. You start this round again.',target:['#pdots',H.lastCard],side:'t'});
},
'myphase:3:0':async u=>{u.chap(5);
 await u.pop({title:'A plan for the round',text:'Play <b>Gargoyle</b> now (2 Blood) and keep <b>1 Blood</b> for later. As the starting player you also get the <b>last</b> phase, so you can react to what the opponent does.',target:['#pdots',H.handAll],side:'t'});
 u.go();
 await u.read(GA,'Gargoyle','A <b>2/1</b> Unit with <b>Flying</b> (see the box under the card). A flying Unit <b>skips</b> ground Units and hits the Hero directly, and ground Units cannot block it.');
 await u.guide(GA,{lane:0,selT:'Click <b>Gargoyle</b> to select it.'});
 await u.endTurn('Keep your 1 Blood for later. Press <b>End Turn</b>.');
},
'enemyplayed:3:1':async u=>{u.chap(5);
 await u.pop({title:'The opponent answers',text:'<b>Knight</b> (2/3, Armored) appeared in lane I, right in front of your Gargoyle. But the Gargoyle flies: they will ignore each other and both hit the Heroes.',target:H.slot(1,0)});
},
'myphase:3:2':async u=>{u.chap(5);
 await u.pop({title:'Your Actions phase',text:'Now you can use your last Blood, and you already saw everything the opponent did. <b>Magic Touch</b> gives a friendly Unit <b>+1/+3</b>.',target:['#pdots',H.hand(MT)],side:'t'});
 u.go();
 await u.guide(MT,{tgt:[0,0],selT:'Click <b>Magic Touch</b> to select it.',tgtT:'Click your <b>Gargoyle</b> to give it +1/+3.',side:'r'});
 await u.pop({title:'Count the damage',text:'Gargoyle is now <b>3/4</b>. The enemy Hero has <b>5</b> HP. Gargoyle 3 + BoomBot 1 + Scout 1 = <b>5</b>. That is exactly lethal!',target:'#ehero',side:'l'});
 await u.endTurn('Press <b>End Turn</b> and watch Combat.');
},
'combat:3':async u=>{u.chap(5);
 await u.pop({title:'Final combat',text:'Lane by lane again. The Knight is a ground Unit and your Gargoyle flies, so watch lane I closely.',target:H.rows});
},
'lane:3:0':async u=>{u.chap(5);
 await u.pop({title:'Lane I',text:'The Gargoyle flies over the Knight and hits the Hero for <b>3</b>. The Knight cannot touch a flyer, so it hits <em>your</em> Hero for 2.',target:H.lane(0),side:'r'});
},
'lane:3:2':async u=>{u.chap(5);
 await u.pop({title:'Lane III',text:'The enemy Hero has <b>1</b> HP left. Scout deals 1 damage. This is the finishing blow!',target:H.lane(2),side:'l'});
}};

/* ---------- opening: tour of the screen, mulligan, who goes first ---------- */
async function intro(){const u=bind(0,1);
 await u.pop({title:'Welcome to RE:Joltance',text:'This short guided match teaches you everything you need to start playing. I will tell you exactly what to click, and nothing in this match is random, so you cannot get lost. Press <b>Next</b> (or Enter) to continue. You can leave any time with <b>Exit tutorial</b>.'});
 await u.pop({title:'The goal',text:'This is your opponent\'s <b>Hero</b>. The big number is its Health (HP). Bring it down to <b>0</b> and you win! Normal matches start at 20 HP; this training opponent has only <b>8</b> so the lesson stays short.',target:['#ehero','#enb'],side:'l'});
 await u.pop({title:'Your Hero',text:'This is <b>your</b> Hero. If its HP reaches 0 you lose, so keep an eye on it.',target:['#phero','#pnb'],side:'l'});
 await u.pop({title:'The board',text:'The board has <b>4 lanes</b> (I to IV). Your Units stand on the bottom row, the opponent\'s on the top row. Units in the same lane face each other.',target:H.rows,side:'b'});
 await u.pop({title:'Your hand',text:'These are the cards in your <b>hand</b> (up to 8). A card is either a <b>Unit</b>, which stays on the board and fights, or an <b>Action</b>, a one-shot spell.',target:H.handAll,side:'t'});
 await u.pop({title:'Reading a card',text:'The red numeral at the top right is the <b>Blood cost</b>. On Units, the two boxes on the right are <b>ATK</b> (damage dealt) and <b>HP</b> (damage it can take). The text at the bottom is its ability.',target:H.hand(B),side:'t'});
 await u.pop({title:'Deck and discard pile',text:'Left: your <b>deck</b> (you draw 1 card at the start of each round from round 2) and your <b>discard pile</b> (used Actions and destroyed Units). Click either one to look inside.',target:['#deckb','#dc','#pile','#pc'],side:'r'});
 showMul();
 $('mok').onclick=()=>{S.mulDone=true;askOrder(()=>{G.fp=0;L(G,'You go first');S.ordered=true})};
 await u.pop({title:'Mulligan',text:'Before the match you may <b>swap away</b> cards you do not like: click a card to mark it, then confirm. This hand is perfect for learning, so keep all of it.',target:'#mh',side:'b'});
 u.hint({title:'Mulligan',text:'Press <b>Confirm</b> to keep your hand.',target:'#mok',allow:['#mok'],side:'t'});
 await until(()=>S.mulDone);
 u.hint({title:'Who goes first?',text:'Going first means you start the odd rounds. Choose <b>Go first</b>.',target:'#mfirst',allow:['#mfirst'],side:'t'});
 await until(()=>S.ordered);u.clear();
 startRound(G);T.fix();render();anim();
 await T.cue('round');if(!S||S.over)return;
 flow()}

/* ---------- game setup / teardown ---------- */
function mkGame(){const g=newGame(D.playerDeck,D.enemyDeck,{mir:1});   // mir = no shuffling; the 4-card opening hands are drawn in list order
 g.mir=0;g.tut=1;g.achDone=1;g.fp=0;g.p[1].hp=g.p[1].mhp=D.enemyHp;g.p.forEach(p=>{p.ac=null});
 L(g,'Tutorial match');return g}
T.start=()=>{if(S)T.stop();init();
 Object.values(D.CARDS).forEach(c=>{CD[c.Id]=JSON.parse(JSON.stringify(c))});
 Object.keys(D.ART).forEach(k=>{const a=D.ART[k];IMGX[ID[k]]=IMGX[a]||a+'.webp'});
 closePanels();if(extRes)extRes();unpin();bpClear();musicNewGame();if(NET)netLeave();gid++;
 S={id:gid,over:false,allow:[],cur:null,cr:null,waiter:null,run:0,go:null};T.active=true;
 document.body.classList.add('tut');
 G=mkGame();busy=true;sel=pend=null;castMode=false;stickyZoom=false;
 $('ovr').style.display='';$('ovr').textContent='Rematch';
 show('game');$('ov').style.display='none';say('');render();startAudio();musicStart();
 if(!raf)raf=requestAnimationFrame(loop);
 intro().catch(e=>{if(e!==ABORT)console.error(e)})};
T.stop=()=>{if(!S)return;const s=S;s.over=true;if(s.waiter){const w=s.waiter;s.waiter=null;w.rej(ABORT)}
 Object.values(D.CARDS).forEach(c=>{delete CD[c.Id]});
 $('mok').onclick=mulOK;$('mok').style.display='';$('mul').style.display='none';
 document.body.classList.remove('tut');
 if(els)['dim','box','cfm','end'].forEach(k=>{els[k].style.display='none'});if(els){els.dim.classList.remove('on');els.rings.innerHTML=''}
 unpin();T.active=false;S=null;if(s.go)s.go()};

/* ---------- the end: victory panel ---------- */
T.finish=async()=>{if(!S||S.fin)return;S.fin=true;const s=S;
 try{await wait(900)}catch(e){return}
 clear();els.dim.classList.remove('on');els.rings.innerHTML='';lsSet('rj_tut','1');const b=$('ttut');if(b)b.classList.remove('todo');
 els.end.innerHTML=`<div class="tendbox"><h2>Tutorial complete!</h2><div class="sub">You won your first match</div>
  <ul><li>Reduce the enemy <b>Hero</b> to 0 HP to win (20 HP in real matches).</li>
  <li><b>Blood</b> grows by 1 each round (max 10). Spend it on cards.</li>
  <li>Each round: <b>Units</b>, then <b>Units and Actions</b>, then <b>Actions</b>, then <b>Combat</b>. The starting player alternates.</li>
  <li>Units fight the Unit in their lane, or hit the Hero if the lane is empty. <b>Flying</b> skips blockers.</li>
  <li>Hover over any card to read it. Build your own decks under <b>Collection</b>.</li></ul>
  <div class="tbb"><button class="pri" id="tutbot">Play vs the bot</button><button id="tutagain">Replay tutorial</button><button id="tutmenu2">Main menu</button></div></div>`;
 els.end.style.display='flex';els.exit.style.display='none';
 const go=f=>e=>{e.stopPropagation();T.stop();els.end.style.display='none';els.exit.style.display='';f()};
 els.end.querySelector('#tutbot').onclick=go(()=>{toMenu();setTimeout(()=>botPanel('bot'),50)});
 els.end.querySelector('#tutagain').onclick=go(()=>T.start());
 els.end.querySelector('#tutmenu2').onclick=go(()=>toMenu())};
})();
