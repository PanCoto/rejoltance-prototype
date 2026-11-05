const fs=require('fs'),path=require('path'),vm=require('vm');
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
exports.mulberry32=mulberry32;
exports.loadGame=function(o){
 o=o||{};const project=path.resolve(o.project||path.join(__dirname,'..','..','game')),rd=f=>fs.readFileSync(path.join(project,f),'utf8');
 global.window=global;
 vm.runInThisContext(rd('cards.js')+'\n;\n',{filename:'cards.js'});
 if(fs.existsSync(path.join(project,'decks.js')))vm.runInThisContext(rd('decks.js')+'\n;\n',{filename:'decks.js'});
 if(o.live){const d=JSON.parse(fs.readFileSync(o.live,'utf8'));
  Object.keys(d.cards||{}).forEach(id=>{const c=CARDS.find(k=>k.Id==id);if(c)Object.assign(c,d.cards[id]);else CARDS.push(Object.assign({Id:+id},d.cards[id]))})}
 let bot=rd('bot.js');
 if(!/BUDGET=140,BEAM=5,DEPTH=5/.test(bot))throw new Error('bot.js: search constants not found');
 bot=bot.replace('BUDGET=140,BEAM=5,DEPTH=5','BUDGET=Infinity,BEAM='+(o.beam||5)+',DEPTH='+(o.depth||5));
 vm.runInThisContext(rd('engine.js')+'\n;\n'+bot,{filename:'engine+bot.js'});
 const DEFAULT_BW=Object.assign({},global.BW);
 const BUILD=CARDS.filter(c=>c.Id<900).map(c=>c.Id).sort((a,b)=>a-b);
 function playGame(da,db,x){
  x=x||{};const modes=[x.modeA||x.mode||'smart',x.modeB||x.mode||'smart'],bws=[x.bwA||DEFAULT_BW,x.bwB||DEFAULT_BW];
  const G=newGame(da,db);
  for(let i=0;i<2;i++){BOTMODE=modes[i];global.BW=bws[i];botMull(G,G.p[i])}
  const pref=()=>['first','second'][Math.floor(Math.random()*2)];
  if(x.first=='both')decideStart(G,'first','first');else decideStart(G,pref(),pref());
  startRound(G);let guard=0;
  while(!G.over&&guard++<500){
   if(G.step>=3){for(let i=0;i<4&&!G.over;i++)lane(G,i,{});if(G.over)break;endRound(G);startRound(G);continue}
   const i=G.act;if(i!==0&&i!==1){nextStep(G);continue}
   BOTMODE=modes[i];global.BW=bws[i];let n=0;
   while(n++<20&&!G.over){const m=botPlan(G,G.p[i]);if(!m)break;play(G,G.p[i],m.ci,m.ln,m.pk)}
   nextStep(G)}
  global.BW=DEFAULT_BW;
  return{win:G.over?G.over.win:-1,first:G.fp,rounds:G.turn,hp:[G.p[0].hp,G.p[1].hp]}}
 return{playGame,DEFAULT_BW,BUILD,seed:n=>{Math.random=mulberry32(n)},mulberry32}};
