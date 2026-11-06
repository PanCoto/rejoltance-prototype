// ===== ACHIEVEMENTS ==============================================================================
// Progress is saved in this browser only (localStorage key rj_ach). h:1 = hidden: the name is shown, the description reads "???" until unlocked.
// Achievements that happen DURING a game are detected by the engine (p.ac.un, see engine.js) and picked up by achPoll().
// Win-based ones are checked once when a game ends (achEnd). The icon is a black placeholder square: put your art in img/ach/<id>.webp
// and set ACH_ICONS=true below.
const ACH_ICONS=false;
const ACH=[
 {id:'first',n:'First Blood',d:'Win a game.'},
 {id:'flawless',n:'Flawless',d:'Win a game without losing a single unit (sacrificed units don\'t count).'},
 {id:'blitz',n:'Blitz',d:'Win a game by round 5.'},
 {id:'closecall',n:'Close Call',d:'Win a game with 3 HP or less.'},
 {id:'scratch',n:'\'Tis but a Scratch',d:'Win a game after taking 30 or more damage to your hero.'},
 {id:'penny',n:'Penny Pincher',d:'Win a game using only cards that cost 3 or less.'},
 {id:'maxed',n:'Maxed Out',d:'Spend 10 mana in a single round.'},
 {id:'fast',n:'Fast Hands',d:'Draw 10 cards in a single round.'},
 {id:'hoard',n:'Card Hoarder',d:'Have 12 cards in your hand at the same time.'},
 {id:'quads',n:'Quadruplets',d:'Have 4 copies of the same card in your hand at the same time.'},
 {id:'feast',n:'Feast for the King',d:'Sacrifice 5 friendly units in a single round.'},
 {id:'mirror',n:'Mirror, Mirror',d:'Win a Mirror Match UP.'},
 {id:'hotstreak',n:'Hot Streak',d:'Win 3 Mirror Matches UP in a row.'},
 {id:'worthy',n:'Worthy Opponent',d:'Win an online game against another player.'},
 {id:'unstop',n:'Unstoppable',d:'Deal 999 damage to the Boss in a single Endless Mode run.'},
 {id:'wonder',n:'One-Round Wonder',d:'Deal 20 or more damage to the Boss in a single round of Endless Mode.'},
 {id:'reunion',n:'Reunion',h:1,d:'Have Brother and Sister on your side of the board at the same time.'},
 {id:'recursion',n:'Recursion',h:1,d:'Use a Tempting Goblet on the Bone Baronet.'},
 {id:'deathsticks',n:'Death Doesn\'t Stick',h:1,d:'Have 3 Unkillable units return to your hand in a single round.'},
 {id:'revolving',n:'Revolving Door',h:1,d:'Bounce 3 of your opponent\'s units in a single round.'},
 {id:'empty',n:'Empty Handed',h:1,d:'End a round with 4 units on your board and no cards in your hand.'},
 {id:'outofcards',n:'Out of Cards',h:1,d:'Win a game by your opponent dying from fatigue.'}
];
const ACHBY=Object.fromEntries(ACH.map(a=>[a.id,a]));
let AST=(()=>{try{const o=JSON.parse(localStorage.getItem('rj_ach')||'{}');return{u:o.u||{},ms:+o.ms||0}}catch(e){return{u:{},ms:0}}})();
const achSave=()=>{try{localStorage.setItem('rj_ach',JSON.stringify(AST))}catch(e){}};
const achCount=()=>ACH.filter(a=>AST.u[a.id]).length;
const achIcon=a=>ACH_ICONS?`<img src="img/ach/${a.id}.webp" alt="" onerror="this.style.display='none'">`:'';

const APQ=[];let apBusy=false;
function apNext(){const a=APQ.shift(),el=document.getElementById('apop');if(!a){apBusy=false;return}apBusy=true;
 el.innerHTML=`<div class="ic">${achIcon(a)}</div><div class="tx"><small>ACHIEVEMENT UNLOCKED</small><b>${a.n}</b><span>${a.d}</span></div>`;
 el.classList.remove('show');void el.offsetWidth;el.classList.add('show');
 try{sfx('unitPlayed',{pitch:0})}catch(e){}
 setTimeout(()=>{el.classList.remove('show');setTimeout(apNext,250)},4200)}
function achUnlock(id){const a=ACHBY[id];if(!a||AST.u[id])return false;AST.u[id]=Date.now();achSave();achRefreshBtn();APQ.push(a);if(!apBusy)apNext();return true}

// Called after every render: pick up what the engine recorded for YOU (works for online guests too: the host sends your own list).
function achPoll(){if(!G||!G.p||!G.p[0].ac)return;G.p[0].ac.un.forEach(achUnlock)}
// Called once when a game ends: everything that needs "and you won".
function achEnd(){if(!G||G.achDone||!G.over)return;G.achDone=1;
 const o=G.over,me=G.p[0],op=G.p[1];if(G.en||o.left)return;
 const win=o.win==0&&!o.draw;
 if(G.mir){AST.ms=win?AST.ms+1:0;achSave()}
 if(!win)return;
 achUnlock('first');if(G.mir)achUnlock('mirror');if(G.mir&&AST.ms>=3)achUnlock('hotstreak');if(NET)achUnlock('worthy');
 if(o.sur)return; // wins by the opponent giving up only count for the achievements above
 const ac=me.ac||{};
 if(!ac.lost)achUnlock('flawless');
 if(G.turn<=5)achUnlock('blitz');
 if(me.hp>0&&me.hp<=3)achUnlock('closecall');
 if((ac.taken||0)>=30)achUnlock('scratch');
 if(ac.pl>0&&!ac.big)achUnlock('penny');
 if(op.fk&&op.hp<=0)achUnlock('outofcards')}

function achRefreshBtn(){const b=document.getElementById('achcnt');if(b)b.textContent=achCount()+'/'+ACH.length}
function achRender(){
 const n=achCount();document.getElementById('achsum').textContent=n+' / '+ACH.length+' unlocked';document.querySelector('#achbar i').style.width=(100*n/ACH.length)+'%';
 const rows=ACH.slice().sort((a,b)=>(!!AST.u[b.id])-(!!AST.u[a.id])||ACH.indexOf(a)-ACH.indexOf(b));
 document.getElementById('achlist').innerHTML=rows.map(a=>{const t=AST.u[a.id];
  return `<div class="ach ${t?'got':'lock'}"><div class="ic">${achIcon(a)}</div><div class="tx"><b>${a.n}</b><span>${t||!a.h?a.d:'???'}</span>${t?`<small>Unlocked ${new Date(t).toLocaleDateString()}</small>`:a.h?'<small>Hidden achievement</small>':''}</div></div>`}).join('')}
document.getElementById('achopen').onclick=()=>{achRender();openPanel('achmenu')};
achRefreshBtn();
