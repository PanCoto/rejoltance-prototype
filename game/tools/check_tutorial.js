#!/usr/bin/env node
/* Replays the guided tutorial headlessly with the REAL engine (engine.js) and checks that every
   scripted move is legal and that the outcome is exactly what the tutorial texts promise.
   Run from anywhere:  node tools/check_tutorial.js
   Re-run it after editing engine.js or tutorial-data.js. Exit code 1 = the tutorial would break. */
const fs=require('fs'),vm=require('vm'),path=require('path');
const dir=path.join(__dirname,'..');
const ctx={console,Math,JSON,Object,Array,Set,Map,Date,localStorage:{getItem:()=>null,setItem(){}}};
ctx.window=ctx;vm.createContext(ctx);
// top-level const/let are not shared between vm scripts, so promote them to var
for(const f of ['cards.js','engine.js','tutorial-data.js']){
 vm.runInContext(fs.readFileSync(path.join(dir,f),'utf8').replace(/^(const|let) /gm,'var '),ctx,{filename:f})}
const {newGame,startRound,nextStep,play,lane,endRound,CD,TUTDATA}=ctx;
let fails=0;const ok=(c,m)=>{if(!c){fails++;console.log('  FAIL: '+m)}else console.log('  ok:   '+m)};
Object.values(TUTDATA.CARDS).forEach(c=>{CD[c.Id]=c});
const T=TUTDATA.ID;

const G=newGame(TUTDATA.playerDeck,TUTDATA.enemyDeck,{mir:1});   // mir: no shuffling, 4-card opening hands
G.mir=0;G.tut=1;G.fp=0;G.p[1].hp=G.p[1].mhp=TUTDATA.enemyHp;G.p.forEach(p=>{p.ac=null});
const me=G.p[0],en=G.p[1];
const fix=()=>{G.p.forEach(p=>{p.mb=p.b=Math.min(10,G.turn)})};   // same as tutorial.js tutFix()
const hi=(p,id)=>p.hand.findIndex(c=>c.id==id);
const cast=(p,id,ln,pk)=>{const i=hi(p,id);if(i<0)return ok(false,'card '+CD[id].Name+' is in hand');const r=play(G,p,i,ln,pk||[]);ok(r,(p.i?'enemy':'you')+' play '+CD[id].Name+(ln!=null?' -> lane '+(ln+1):''));return r};
const phase=(turn,step,who)=>ok(G.turn==turn&&G.step==step&&G.act==who,`round ${turn} step ${step}: ${who?'enemy':'you'} act (allow ${G.allow})`);
const combat=()=>{for(let i=0;i<4&&!G.over;i++)lane(G,i,{mv:{0:null,1:null}});if(!G.over)endRound(G)};
const planFor=(k)=>(TUTDATA.enemyPlan[k]||[]);
const enemyPhase=()=>{planFor(G.turn+':'+G.step).forEach(m=>cast(en,m.id,m.ln))};

console.log('Opening hands');
ok(me.hand.map(c=>c.id).join()==[T.boom,T.scout,T.dagger,T.knight].join(),'your opening hand is BoomBot, Scout, Dagger Throw, Knight');
ok(en.hand.every(c=>CD[c.id].Cost>=2),'enemy opening hand has no 1-cost card (it must pass in round 1)');

console.log('Round 1');
startRound(G);fix();
phase(1,0,0);ok(me.b==1&&en.b==1,'both have 1 Blood');
cast(me,T.boom,1);ok(me.b==0,'BoomBot spent your Blood');
nextStep(G);phase(1,1,1);
ok(!en.hand.some(c=>CD[c.id].Cost<=en.b),'enemy cannot afford anything -> passes');
enemyPhase();nextStep(G);phase(1,2,0);nextStep(G);
ok(G.step==3,'combat starts');combat();
ok(en.hp==7&&me.hp==20,`after round 1: enemy hero 7 (is ${en.hp}), you 20 (is ${me.hp})`);

console.log('Round 2');
startRound(G);fix();
phase(2,0,1);ok(me.b==2,'you have 2 Blood');
ok(me.hand.length==4&&me.hand[me.hand.length-1].id==T.garg,'you drew Gargoyle');
enemyPhase();const goat=en.ln[1];ok(goat&&goat.id==T.goat,'enemy Goat is in lane II');
nextStep(G);phase(2,1,0);
cast(me,T.scout,2,[goat]);ok(goat.kw.has('Marked'),'Scout marked the Goat');
cast(me,T.dagger,null,[goat]);ok(!en.ln[1]&&goat.hp<=0,'Dagger Throw (x2 from Mark) destroyed the Goat');
ok(me.b==0,'you are out of Blood');
nextStep(G);phase(2,2,1);enemyPhase();nextStep(G);ok(G.step==3,'combat starts');combat();
ok(en.hp==5&&me.hp==20,`after round 2: enemy hero 5 (is ${en.hp}), you 20 (is ${me.hp})`);

console.log('Round 3');
startRound(G);fix();
phase(3,0,0);ok(me.b==3,'you have 3 Blood');ok(hi(me,T.touch)>=0,'you drew Magic Touch');
cast(me,T.garg,0);ok(me.b==1,'Gargoyle leaves you 1 Blood for Magic Touch');
nextStep(G);phase(3,1,1);enemyPhase();ok(en.ln[0]&&en.ln[0].id==T.knight,'enemy Knight sits in lane I, in front of Gargoyle');
nextStep(G);phase(3,2,0);
const garg=me.ln[0];cast(me,T.touch,null,[garg]);ok(garg.atk==3&&garg.hp==4,'Gargoyle is 3/4');
nextStep(G);ok(G.step==3,'combat starts');
for(let i=0;i<4&&!G.over;i++){lane(G,i,{mv:{0:null,1:null}});
 if(i==0)ok(en.hp==2&&me.hp==18,`lane I: Gargoyle flies over the Knight (enemy hero 2, is ${en.hp}); Knight hits you (18, is ${me.hp})`);
 if(i==1)ok(en.hp==1,`lane II: BoomBot hits the hero (1, is ${en.hp})`)}
ok(G.over&&G.over.win==0,'YOU WIN at the end of round 3 combat (lane III, Scout)');
ok(en.hp<=0&&me.hp==18,`final: enemy hero ${en.hp}, you ${me.hp}`);

console.log(fails?`\n${fails} CHECK(S) FAILED - the tutorial would break`:'\nAll checks passed - the tutorial script is valid and deterministic.');
process.exit(fails?1:0);
