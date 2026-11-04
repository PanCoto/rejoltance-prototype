const CD={};CARDS.forEach(c=>{if(c.Type=='Action')c.Type='Spell';CD[c.Id]=c});
const SUBALIAS={Automaton:'Machine',Aberation:'Aberration'};
const canon=s=>SUBALIAS[s]||s;
const hasSub=(d,s)=>!!d&&(d.Subtypes||[]).some(x=>canon(x)==canon(s));
const isTok=d=>d.Id>=900||(d.Subtypes||[]).includes('Token');
function cardOK(d,f){if(!f)return true;
 if(f.Id!=null&&d.Id!=f.Id)return false;if(f.Type&&d.Type!=(f.Type=='Action'?'Spell':f.Type))return false;
 if(f.Subtype&&!hasSub(d,f.Subtype))return false;const cs=d.Cost||0;
 if(f.Cost!=null&&cs!=f.Cost)return false;if(f.MinCost!=null&&cs<f.MinCost)return false;if(f.MaxCost!=null&&cs>f.MaxCost)return false;
 if(f.Token!=null&&isTok(d)!=!!f.Token)return false;return true}
const poolOf=f=>Object.values(CD).filter(d=>cardOK(d,f)&&(f&&f.Token!=null?true:!isTok(d)));
function unitOK(u,f){if(!f||!u||u.h)return true;const d=u.d||CD[u.id];
 if(f.Damaged&&!(u.hp<u.mx))return false;if(f.Undamaged&&u.hp<u.mx)return false;
 if(f.Subtype&&!hasSub(d,f.Subtype))return false;if(f.Keyword&&!(u.kw&&u.kw.has(f.Keyword)))return false;
 if(f.MinAtk!=null&&u.atk<f.MinAtk)return false;if(f.MaxAtk!=null&&u.atk>f.MaxAtk)return false;
 if(f.MinHp!=null&&u.hp<f.MinHp)return false;if(f.MaxHp!=null&&u.hp>f.MaxHp)return false;return true}
function countOf(G,s,sp,c){const me=G.p[s.o!=null?s.o:0],op=G.p[1-me.i];c=c||{};
 const live=w=>w&&!w.gone&&w.hp>0&&w!==s&&(!sp.Subtype||hasSub(w.d||CD[w.id],sp.Subtype));
 const all=()=>[...units(me),...units(op)].filter(live);
 switch(sp.Count){
  case'FriendlyUnits':return units(me).filter(live).length;case'EnemyUnits':return units(op).filter(live).length;case'AnyUnits':return all().length;
  case'BurningUnits':return all().filter(w=>w.kw.has('Burning')).length;case'MarkedUnits':return all().filter(w=>w.kw.has('Marked')).length;
  case'DamagedUnits':return all().filter(w=>w.hp<w.mx).length;
  case'CardsInHand':return me.hand.length;case'EnemyCardsInHand':return op.hand.length;
  case'Blood':return me.b;case'MaxBlood':return me.mb;case'DeckSize':return me.deck.length;case'DiscardSize':return me.disc.length;
  case'FriendlyHeroHp':return me.hp;case'EnemyHeroHp':return op.hp;
  case'SacrificedAttack':return c.last?c.last.atk:0;case'SacrificedHealth':return c.last?Math.max(0,c.last.hp):0;case'Sacrificed':return c.sacd?1:0}
 return 0}
function val(G,v,s,c){if(v==null||typeof v!='object')return v;
 let n=countOf(G,s,v,c)*(v.Mult!=null?v.Mult:1)+(v.Add||0);if(v.Min!=null)n=Math.max(v.Min,n);if(v.Max!=null)n=Math.min(v.Max,n);return n}
const TYPEALIAS={Conjure:'AddCardToHand',Summon:'MakeAUnit'};
const NUMF=['Amount','BuffAtk','BuffHp','Min','Max','Count'];
function ra(G,a,s,c){const b=Object.assign({},a);if(TYPEALIAS[b.Type])b.Type=TYPEALIAS[b.Type];
 if(a.AmountFrom=='SacrificedAttack')b.Amount=Math.min(a.Max||99,Math.max(a.Min||0,c.last?c.last.atk:0));
 NUMF.forEach(k=>{if(b[k]!=null&&typeof b[k]=='object')b[k]=val(G,b[k],s,c)});return b}
let UID=1;const R=n=>Math.floor(Math.random()*n);
const shuf=a=>{for(let i=a.length-1;i>0;i--){const j=R(i+1);[a[i],a[j]]=[a[j],a[i]]}return a};
const L=(G,s)=>{G.log.push(s);if(G.log.length>300)G.log.shift()};
const H=(p)=>({h:1,p});
const SELF=['OnKill','OnDamagedEnemyUnit','OnDamagedEnemyHero'];
const EV=(G,o)=>G.ev.push(o);
const kwp=(u,k,df)=>((u.d.KeywordParams||{})[k])||df||1;
function mk(id,o){const d=CD[id];return{uid:UID++,id,d,o,atk:d.Attack||0,hp:d.Health||0,mx:d.Health||0,kw:new Set(d.Keywords||[]),lane:-1}}
function newGame(a,b){
 const G={turn:0,over:null,log:[],hist:[],ev:[],step:0,act:0,allow:'U',start:0,fp:R(2),p:[a,b].map((dk,i)=>({i,hp:20,mb:0,b:0,hand:[],disc:[],ln:[null,null,null,null],gb:{a:0,h:0},sp:0,sc:0,
  deck:shuf(dk.map(id=>({uid:UID++,id})))}))};
 G.p.forEach(p=>{for(let k=0;k<4;k++)draw(G,p,1)});return G}
function decideStart(G,pa,pb){let f;if(pa!=pb)f=pa=='first'?0:1;else f=R(2);G.fp=f;
 L(G,(f?'Enemy goes':'You go')+' first'+(pa==pb?' (both chose '+pa+' - decided randomly)':''));return f}
function setStep(G){const s=G.start,o=1-s;[G.act,G.allow]=G.step==0?[s,'U']:G.step==1?[o,'B']:[s,'A']}
function nextStep(G){G.step++;if(G.step<3)setStep(G);else{G.act=null;G.allow=''}}
function mulligan(G,p,ids){const out=p.hand.filter(c=>ids.includes(c.uid));p.hand=p.hand.filter(c=>!ids.includes(c.uid));
 for(let i=0;i<out.length&&p.deck.length;i++)p.hand.push(p.deck.shift());p.deck.push(...out);shuf(p.deck)}
function botMullBasic(G,p){mulligan(G,p,p.hand.filter(c=>CD[c.id].Cost>=4).map(c=>c.uid))}
function roundTrig(G,trig){if(G.over)return;
 [G.start,1-G.start].forEach(i=>G.p[i].ln.slice().forEach(u=>{if(u&&!u.gone&&u.hp>0&&!G.over)fire(G,trig,u,{u})}));resolve(G)}
function startRound(G){G.turn++;G.start=(G.turn%2?0:1)^(G.fp|0);G.step=0;setStep(G);G.p.forEach(p=>{p.mb=Math.min(10,G.turn);p.b=p.mb;if(G.turn>1)draw(G,p)});L(G,'— Round '+G.turn+' —');roundTrig(G,'OnStartOfRound')}
function draw(G,p,quiet,idx){
 if(!p.deck.length){p.fat=(p.fat||0)+1;L(G,(p.i?'Enemy':'You')+' ha'+(p.i?'s':'ve')+' no cards - fatigue '+p.fat);EV(G,{k:'snd',n:'cardDrawn',o:p.i});dmg(G,H(p.i),p.fat,null,2);return}
 const c=idx!=null?p.deck.splice(idx,1)[0]:p.deck.shift();
 if(p.hand.length>=8){p.disc.push(c);return}
 p.hand.push(c);aura(G);if(quiet)return;EV(G,{k:'snd',n:'cardDrawn',o:p.i});
 p.ln.forEach(u=>u&&fire(G,'OnFriendlyCardDrawn',u,{}));
 G.p[1-p.i].ln.forEach(u=>u&&fire(G,'OnOpponentCardDrawn',u,{}));
 gained(G,p,'draw')}
function gained(G,p,how){aura(G);p.ln.slice().forEach(u=>u&&fire(G,'OnFriendlyCardGained',u,{how}));
 G.p[1-p.i].ln.slice().forEach(u=>u&&fire(G,'OnOpponentCardGained',u,{how}))}
const has=(p,id)=>p.ln.some(u=>u&&u.id==id&&!u.sil);
const cnt=(p,id)=>p.ln.filter(u=>u&&u.id==id&&!u.sil).length;
function costMods(G,p,c){const d=CD[c.id],out=[];
 G.p.forEach(q=>units(q).forEach(src=>{if(src.sil||src.gone||src.hp<=0)return;(src.d.Effects||[]).forEach(e=>{if(e.Trigger!='Passive')return;e.Actions.forEach(a=>{
  let amt,side,flt;
  if(a.Type=='ModifyCost'){amt=val(G,a.Amount,src,{});side=a.Side||'Friendly';flt=a.CardFilter}
  else if(a.Type=='BuffStats'&&a.Amount!=null&&/^(Friendly|Enemy)SpellsInHand$/.test(a.Target)){amt=a.Amount;side=a.Target.indexOf('Friendly')==0?'Friendly':'Enemy';flt={Type:'Spell'}}
  else return;
  const mine=src.o==p.i;if((side=='Friendly'&&!mine)||(side=='Enemy'&&mine))return;
  if(!cardOK(d,flt)||!cond(e.Condition,src,{},G))return;
  if(amt)out.push({src,amt})})})}));return out}
function cost(G,p,c){const d=CD[c.id];if(c.z&&c.z===G.turn)return 0;let x=d.Cost;
 costMods(G,p,c).forEach(m=>x+=m.amt);
 x-=(c.red||0);return Math.max(0,x)}
function chk(G){G.p.forEach(p=>{if(p.hp<=0&&!G.over){G.over={win:1-p.i}}})}
function cond(c,u,x,G){if(!c)return true;const sub=(c.SubConditions||[]).map(k=>cond(k,u,x,G)),P=c.TargetParam;x=x||{};
 switch(c.Condition){case'And':return sub.every(Boolean);case'Or':return sub.some(Boolean);case'Not':return!sub[0];
 case'IsSelf':return x.u===u;case'SameLane':return!!x.u&&x.u.lane===u.lane;
 case'IsSubtype':return!!x.u&&hasSub(x.u.d||CD[x.u.id],P);
 case'IsStatus':return x.st==P;case'IsEnemy':return!!x.u&&x.u.o!=u.o;case'IsFriendly':return!!x.u&&x.u.o==u.o;
 case'HasSubtypeOnBoard':return G.p[u.o].ln.some(w=>w&&w!==u&&hasSub(w.d,P));
 case'Compare':{const n=countOf(G,u,c,x),v=c.Value!=null?c.Value:0;switch(c.Op||'>='){case'>':return n>v;case'>=':return n>=v;case'<':return n<v;case'<=':return n<=v;case'==':return n==v;case'!=':return n!=v}return false}}
 return true}
function fire(G,trig,u,ctx){if(!u||u.sil||G.over)return;ctx=ctx||{};
 (u.d.Effects||[]).forEach(e=>{if(e.Trigger!=trig||(e.Zone&&e.Zone!='Board'))return;
  if(trig=='OnPlayed'&&(e.Zone=='Board')!=!!ctx.lis)return;
  if(SELF.includes(trig)&&!e.Condition&&ctx.u&&ctx.u!==u)return;
  if(!cond(e.Condition,u,ctx,G))return;
  const s0=!G.sim&&u.uid?gsig(G):null;
  if(e.Targeting=='Choice'&&e.ChoiceLabels&&e.ChoiceLabels.length==e.Actions.length)act(G,e.Actions[ctx.ch||0],u,ctx);
  else e.Actions.forEach(a=>act(G,a,u,ctx));
  if(s0!==null&&gsig(G)!==s0)EV(G,{k:'trig',u:u.uid})})}
function gsig(G){return G.p.map(p=>[p.hp,p.b,p.hand.length,p.deck.length,p.disc.length,p.hand.reduce((a,c)=>a+(c.red||0)+(c.ba||0),0),
 p.ln.map(w=>w?w.uid+':'+w.atk+'/'+w.hp+':'+[...w.kw].join(','):'-').join('|')].join(';')).join('#')}
function fireHand(G,trig,p,ctx){p.hand.slice().forEach(c=>{if(c.used||(c.nf&&ctx.u&&c.nf===ctx.u.uid))return;(CD[c.id].Effects||[]).forEach(e=>{
 if(e.Trigger!=trig||e.Zone!='Hand'||!cond(e.Condition,{o:p.i},ctx,G))return;
 e.Actions.forEach(a=>{if(a.Type=='BuffStats'){if(a.Amount!=null)c.red=(c.red||0)-a.Amount;else c.ba=(c.ba||0)+(a.BuffAtk||0);EV(G,{k:'hand',c:c.uid})}
  else if(a.Type=='SummonUnit'&&ctx.lane!=null&&!p.ln[ctx.lane]&&!G.over){c.used=1;p.hand=p.hand.filter(x=>x!==c);
   const u=mk(c.id,p.i);u.atk+=c.ba||0;if(c.unk)u.kw.add('Unkillable');place(G,p,u,ctx.lane);L(G,CD[c.id].Name+' rises');fire(G,'OnPlayed',u,{});}})})})}
function auraTargets(G,src,a){const me=G.p[src.o],op=G.p[1-src.o];
 switch(a.Target){case'Self':return[src];case'OtherFriendlyUnits':return units(me).filter(u=>u!==src);case'AllFriendlyUnits':return units(me);
  case'AdjacentFriendlyUnits':return units(me).filter(u=>u!==src&&Math.abs(u.lane-src.lane)==1);
  case'AllEnemyUnits':return units(op);case'AllUnitsOnBoard':return[...units(me),...units(op)];case'AllOtherUnitsOnBoard':return[...units(me),...units(op)].filter(u=>u!==src)}
 return[]}
function aura(G){
 const want=new Map();
 G.p.forEach(q=>units(q).forEach(src=>{if(src.sil||src.gone||src.hp<=0)return;(src.d.Effects||[]).forEach(e=>{if(e.Trigger!='Passive')return;e.Actions.forEach(a=>{
  if(a.Type!='GrantKeyword'&&a.Type!='ApplyStatus')return;const k=a.Keyword||a.StatusKeyword;if(!k)return;
  auraTargets(G,src,a).forEach(t=>{if(t.sil||t.gone||!unitOK(t,a.Where)||!cond(e.Condition,src,{u:t},G))return;
   if(!want.has(t.uid))want.set(t.uid,new Map());want.get(t.uid).set(k,src.uid)})})})}));
 G.p.forEach(p=>units(p).forEach(u=>{u.ag=u.ag||{};const w=want.get(u.uid)||new Map();
  w.forEach((srcUid,k)=>{if(u.sil||u.kw.has(k)||(u.agc&&u.agc[k]))return;u.kw.add(k);u.ag[k]=1;if(k=='SoulGuard')u.sga=1;EV(G,{k:'trig',u:srcUid})});
  Object.keys(u.ag).forEach(k=>{if(!w.has(k)){if(!(u.agc&&u.agc[k]))u.kw.delete(k);delete u.ag[k];if(k=='SoulGuard')u.sga=0}})}));
 const bonus=new Map();
 G.p.forEach(q=>units(q).forEach(src=>{if(src.sil||src.gone||src.hp<=0)return;(src.d.Effects||[]).forEach(e=>{if(e.Trigger!='Passive')return;e.Actions.forEach(a=>{
  if(a.Type!='AuraBuff'||!a.BuffAtk)return;
  auraTargets(G,src,a).forEach(t=>{if(t.sil||t.gone||!unitOK(t,a.Where)||!cond(e.Condition,src,{u:t},G))return;bonus.set(t.uid,(bonus.get(t.uid)||0)+a.BuffAtk)})})})}));
 G.p.forEach(p=>units(p).forEach(u=>{let n=bonus.get(u.uid)||0;
  if(!u.sil&&!u.gone)(u.d.Effects||[]).forEach(e=>{if(e.Trigger!='Passive')return;e.Actions.forEach(a=>{if(a.Type!='ScaleAttack')return;
   const side=a.Side||'Friendly',per=a.Per||(a.PerSubtype?(side=='Enemy'?'EnemyUnits':side=='Any'?'AnyUnits':'FriendlyUnits'):'FriendlyUnits');
   n+=(a.Amount!=null?a.Amount:1)*countOf(G,u,{Count:per,Subtype:a.PerSubtype||a.Subtype},{})})});
  if(n!==(u.aurA||0)){u.atk=Math.max(0,u.atk+n-(u.aurA||0));u.aurA=n}}))}
const units=(p)=>p.ln.filter(Boolean);
const UNACT_AOE_IMMUNE=false;
const unact=u=>!!u&&!u.h&&!!u.kw&&u.kw.has('Unactionable');
const aoeOK=u=>!(UNACT_AOE_IMMUNE&&unact(u));
function tg(G,a,s,c){c=c||{};const r=tg0(G,a,s,c);return a.Where?r.filter(x=>x.h||unitOK(x,a.Where)):r}
function tg0(G,a,s,c){const me=G.p[s.o],op=G.p[1-s.o];
 switch(a.Target){
 case'AllFriendlyUnits':return units(me).filter(aoeOK);
 case'EventUnit':return c.u&&!c.u.gone&&!c.u.h&&!unact(c.u)?[c.u]:[];
 case'RandomEnemyUnit':{const vs=units(op).filter(x=>!unact(x));return vs.length?[vs[R(vs.length)]]:[]}
 case'RandomFriendlyUnit':{const vs=units(me).filter(x=>x!==s&&!unact(x));return vs.length?[vs[R(vs.length)]]:[]}
 case'Self':return[s];case'FriendlyHero':return[H(s.o)];case'EnemyHero':return[H(1-s.o)];
 case'AllEnemyUnits':return units(op).filter(aoeOK);case'AllUnitsOnBoard':return[...units(me),...units(op)].filter(aoeOK);
 case'AllOtherUnitsOnBoard':return[...units(me),...units(op)].filter(u=>u!==s&&aoeOK(u));
 case'OtherFriendlyUnits':return units(me).filter(u=>u!=s&&aoeOK(u));
 case'OppositeEnemyUnit':{const u=op.ln[s.lane];return u&&!unact(u)?[u]:[]}
 case'Sacrificer':{const w=c.by;return w&&!w.gone&&w.hp>0&&G.p[w.o].ln[w.lane]===w&&!unact(w)?[w]:[]}
 case'TargetEnemyUnit':case'SelectedTarget':case'TargetFriendlyUnit':case'TargetAnyUnit':case'TargetEnemyUnitOrHero':
  if(c.t)return unact(c.t)?[]:[c.t];
  if(a.Target=='TargetEnemyUnit'){const u=op.ln[s.lane],vs=units(op).filter(x=>!unact(x)),t=u&&!unact(u)?u:vs[R(vs.length)];return t?[t]:[]}
  return[]}
 return[]}
const later=(G,f)=>G.q?G.q.push(f):f();
function dmgMod(G,t,n,s,melee){if(!(s&&s.uid&&!s.sp&&melee===1&&n>0&&!s.sil))return n;
 (s.d.Effects||[]).forEach(e=>{if(e.Trigger!='Passive')return;e.Actions.forEach(a=>{if(a.Type!='ModifyDamage')return;
  const ag=a.Against||'Any',isH=!!t.h,enemy=isH?t.p!=s.o:t.o!=s.o;
  if(ag=='EnemyHero'&&!(isH&&enemy))return;if(ag=='EnemyUnit'&&(isH||!enemy))return;if(ag=='Unit'&&isH)return;if(!isH&&!unitOK(t,a.Where))return;
  n=n*(a.Multiplier!=null?a.Multiplier:1)+(a.Add||0)})});return Math.max(0,Math.floor(n))}
function lifesteal(G,s,n){if(!(n>0&&s&&s.uid&&!s.sp&&s.kw&&s.kw.has('Lifesteal')&&!s.sil&&!G.over))return;
 const p=G.p[s.o];p.hp=Math.max(p.hp,Math.min(20,p.hp+n));
 if(!G.sim){EV(G,{k:'snd',n:'heal'});EV(G,{k:'fx',t:'heal',n,h:s.o})}L(G,(s.o?'Enemy':'You')+' heal '+n+' (Lifesteal)')}
const tauntOf=(G,pi)=>G.p[pi].ln.find(u=>u&&!u.gone&&u.hp>0&&!u.sil&&u.kw.has('Taunt'));
function dmg(G,t,n,s,melee){
 if(t.h&&s&&n>0){const tu=tauntOf(G,t.p);if(tu){L(G,tu.d.Name+' taunts - it takes the hit');return dmg(G,tu,n,s,melee)}}
 n=dmgMod(G,t,n,s,melee);
 if(t.h){G.p[t.p].hp-=n;EV(G,G.bk?{k:'dmg',h:t.p,n,bk:1,bo:s.o,bl:s.lane}:{k:'dmg',h:t.p,n});L(G,(t.p?'Enemy':'You')+' hero takes '+n);lifesteal(G,s,n);
  if(s&&s.uid&&!s.sp&&n>0)later(G,()=>G.p[s.o].ln.slice().forEach(w=>w&&fire(G,'OnDamagedEnemyHero',w,{u:s,t:s})));chk(G);return}
 const ar=t.kw.has('Armored')?kwp(t,'Armored'):t.kw.has('Armor2')?2:0;
 if(n>0&&ar)n=Math.max(0,n-ar);
 if(n>0&&t.kw.has('Marked'))n*=2;
 if(n>0&&s&&s.uid&&!s.sp&&s.o!=t.o&&s.kw&&s.kw.has('Deadly')&&!s.sil)n=Math.max(n,t.hp);
 t.hp-=n;EV(G,{k:'dmg',u:t.uid,n});lifesteal(G,s,n);
 if(s&&s.uid&&!s.sp&&n>0&&s.o!=t.o)later(G,()=>G.p[t.o].ln.slice().forEach(w=>w&&fire(G,'OnFriendlyUnitDamaged',w,{u:t,t:s})));
 if(s&&s.uid&&!s.sp&&n>0){if(s.kw.has('BurnSource')&&!s.sil)t.kw.add('Burning');if(melee===1)later(G,()=>fire(G,'OnDamagedEnemyUnit',s,{u:s,t}))}
 if(t.hp<=0&&s&&s.uid&&!s.sp&&!t.k&&melee===1&&!t.kw.has('Unkillable')&&!t.kw.has('SoulGuard')){t.k=1;later(G,()=>{fire(G,'OnKill',s,{u:s,t});killAbsorb(G,s,t)})}}
function killAbsorb(G,s,t){if(!s||s.gone||s.hp<=0||!t||G.over)return;
 const n=G.p[s.o].ln.filter(w=>w&&!w.sil&&!w.gone&&w.hp>0).reduce((sum,src)=>sum+(src.d.Effects||[]).reduce((m,e)=>m+(e.Trigger=='Passive'?e.Actions.filter(a=>a.Type=='AbsorbAttackOnKill'&&unitOK(s,a.Where)).length:0),0),0);
 if(!n||!(t.atk>0))return;s.atk+=t.atk*n;if(!G.sim){EV(G,{k:'fx',t:'buff',a:t.atk*n,hp:0,u:s.uid});EV(G,{k:'snd',n:'buff'})}
 L(G,s.d.Name+' absorbs '+t.atk*n+' ATK from '+t.d.Name)}
function thru(G,x,n){G.bk=1;try{dmg(G,H(1-x.o),n,x,1)}finally{G.bk=0}}
function status(G,t,k,s){if(t.h)return;t.kw.add(k);EV(G,{k:'trig',u:t.uid});if(!G.sim)EV(G,{k:'fx',t:'st',s:k,u:t.uid});EV(G,{k:'snd',n:k=='Marked'?'mark':k=='Stunned'?'stun':k=='Burning'?'burn':'buff'});
 G.p.forEach(p=>p.ln.slice().forEach(u=>u&&u!==t&&fire(G,'OnStatusApplied',u,{t,u:t,st:k})))}
function act(G,a,s,c){
 c=c||{};a=ra(G,a,s,c);
 if((a.OnlyIfSacrificed&&!c.sacd)||(a.OnlyIfNoSacrifice&&c.sacd))return;
 const T=a.Type,me=G.p[s.o],ts=tg(G,a,s,c);
 const unitsOnly=ts.filter(x=>!x.h);
 const area=['AllEnemyUnits','AllUnitsOnBoard','AllOtherUnitsOnBoard','OtherFriendlyUnits'].includes(a.Target);
 if(!G.sim&&unitsOnly.length&&area&&['DealDamage','DestroyUnit','Heal','HealToFull','BuffStats','Silence'].includes(T))
  EV(G,{k:'aoe',T,st:'',pos:T=='BuffStats'?((a.BuffAtk||0)<0||(a.BuffHp||0)<0?0:1):1,o:s.o,us:unitsOnly.map(x=>({u:x.uid,o:x.o,l:x.lane}))});
 if(!G.sim&&!area)ts.forEach(t=>{const b=t.h?{h:t.p}:{u:t.uid};
  if(T=='Heal')EV(G,Object.assign({k:'fx',t:'heal',n:a.Amount},b));
  else if(!t.h&&T=='HealToFull')EV(G,Object.assign({k:'fx',t:'heal',n:0},b));
  else if(!t.h&&T=='BuffStats'&&a.Amount==null)EV(G,Object.assign({k:'fx',t:'buff',a:a.BuffAtk||0,hp:a.BuffHp||0},b));
  else if(!t.h&&T=='Silence')EV(G,Object.assign({k:'fx',t:'sil'},b))});
 switch(T){
 case'DealDamage':{const n=a.Amount;
  ts.forEach(t=>dmg(G,t,n,s,2));break}
 case'Heal':if(ts.length)EV(G,{k:'snd',n:'heal'});ts.forEach(t=>{if(t.h)G.p[t.p].hp=Math.min(20,G.p[t.p].hp+a.Amount);else t.hp=Math.min(t.mx,t.hp+a.Amount)});break;
 case'HealToFull':if(unitsOnly.length)EV(G,{k:'snd',n:'heal'});unitsOnly.forEach(t=>t.hp=t.mx);break;
 case'DrawCard':{if((a.OnlyIfNoSacrifice&&c.sacd)||(a.OnlyIfSacrificed&&!c.sacd))break;
  const one=pl=>{if(!a.Filter){draw(G,pl);return}const ix=pl.deck.findIndex(x=>cardOK(CD[x.id],a.Filter));if(ix>=0)draw(G,pl,0,ix)};
  ts.forEach(t=>{for(let i=0;i<(a.Amount||1);i++)one(G.p[t.p!=null?t.p:s.o])});if(!ts.length)one(me);break}
 case'BuffStats':if(a.Amount!=null)break;if(unitsOnly.length)EV(G,{k:'snd',n:(a.BuffAtk||0)<0||(a.BuffHp||0)<0?'debuff':'buff'});unitsOnly.forEach(t=>{t.atk+=a.BuffAtk||0;t.hp+=a.BuffHp||0;t.mx+=a.BuffHp||0;if(t.atk<0)t.atk=0});break;
 case'ApplyStatus':unitsOnly.forEach(t=>status(G,t,a.StatusKeyword,s));break;
 case'DestroyUnit':unitsOnly.forEach(t=>{t.hp=0});break;
 case'Silence':if(unitsOnly.length)EV(G,{k:'snd',n:'silence'});unitsOnly.forEach(t=>{t.sil=1;t.sga=0;t.aurA=0;t.ag={};t.kw=new Set();t.atk=t.d.Attack||0;t.mx=t.d.Health||0;t.hp=Math.min(t.hp,t.mx||1)});break;
 case'SacrificeUnit':{const cand=units(me).filter(u=>u!=s&&!unact(u));const v=c.sac||(a.Target=='SelectedTarget'&&c.t&&!c.t.h&&c.t)||cand.sort((x,y)=>(x.atk+x.hp+CD[x.id].Cost)-(y.atk+y.hp+CD[y.id].Cost))[0];
  if(v&&!v.gone&&!unact(v)&&!c.nosac){c.last=v;c.sacd=1;sacrifice(G,v,s.uid?s:null)}break}
 case'AbsorbStats':{const v=c.sac||c.last;if(v){s.atk+=v.atk;s.hp+=v.hp;s.mx+=v.hp}break}
 case'GiveToOpponent':s.give=1;s.giveA=a;break;
 case'MakeAUnit':case'SummonUnit':{if(T=='SummonUnit')break;
  let ls=[0,1,2,3].filter(i=>!me.ln[i]);
  if(a.StringParam=='AdjacentLanes')ls=ls.filter(i=>Math.abs(i-s.lane)==1);else{const n=a.Count||1,ch=[];
   for(let k=0;k<n&&!a.Auto;k++){const w=(c.lanes||[])[c.li||0];if(w==null)break;c.li=(c.li||0)+1;if(ls.includes(w)&&!ch.includes(w))ch.push(w)}
   const rest=ls.filter(i=>!ch.includes(i)),pref=rest.filter(i=>!G.p[1-s.o].ln[i]);
   ls=ch.concat((pref.length?pref:rest).slice(0,n-ch.length))}
  ls.forEach(i=>{if(me.ln[i])return;let id=a.ValueParam;if(a.Filter||id==null){const pp=poolOf(Object.assign({},a.Filter,{Type:'Unit'}));if(!pp.length)return;id=pp[R(pp.length)].Id}
   const nu=mk(id,s.o);place(G,me,nu,i);if(!c.sm&&!G.over)fire(G,'OnPlayed',nu,{tf:1,nosac:1,sm:1})});break}
case'AddCardToHand':{
  const owners=ts.length&&ts[0].h?ts.filter(t=>t.h).map(t=>G.p[t.p]):[me];
  owners.forEach(pl=>{for(let i=0;i<(a.Count||1);i++){let id=a.ValueParam;if(a.Filter||id==null){const pp=poolOf(a.Filter);if(!pp.length)break;id=pp[R(pp.length)].Id}
   if(pl.hand.length<8){pl.hand.push({uid:UID++,id,tok:1,...(a.FreeThisTurn?{z:G.turn}:{})});gained(G,pl,'add')}}});break}
case'ReturnToHand':unitsOnly.filter(t=>!t.gone&&(!a.IfAlive||t.hp>0)).forEach(t=>{const o=G.p[t.o];if(o.ln[t.lane]!==t)return;EV(G,{k:'bnc',id:t.id,atk:t.atk,hp:Math.max(t.hp,0),o:t.o,lane:t.lane});L(G,t.d.Name+' returned to hand');o.ln[t.lane]=null;t.gone=1;if(o.hand.length<8&&t.id<900){o.hand.push({uid:UID++,id:t.id,unk:t.kw.has('Unkillable')?1:0,...(a.FreeThisTurn?{z:G.turn}:{})});gained(G,o,'bounce')}});break
 case'SacrificeUnits':{
  const list=(c.sacs||[]).filter(u=>u&&!u.gone&&u!==s&&u.o==s.o&&me.ln[u.lane]===u&&!unact(u));let ga=0,gh=0;
  list.forEach(v=>{if(v.gone)return;c.last=v;c.sacd=1;const va=v.atk,vh=Math.max(0,v.hp);sacrifice(G,v,s);if(a.Absorb){ga+=va;gh+=vh}else{ga++;gh++}});
  if((ga||gh)&&!s.gone){s.atk+=ga;s.hp+=gh;s.mx+=gh;if(!G.sim){EV(G,{k:'snd',n:'buff'});EV(G,{k:'fx',t:'buff',a:ga,hp:gh,u:s.uid})}}break}
case'LoseHealth':ts.forEach(t=>{if(t.h)dmg(G,t,a.Amount||1,null,2);else{t.hp-=a.Amount||1;EV(G,{k:'dmg',u:t.uid,n:a.Amount||1})}});break;
 case'ModifyGlobalBuff':EV(G,{k:'snd',n:'buff'});if(!G.sim&&units(me).length)EV(G,{k:'aoe',T:'BuffStats',st:'',pos:1,o:me.i,us:units(me).map(x=>({u:x.uid,o:x.o,l:x.lane}))});me.gb.a+=a.BuffAtk||0;me.gb.h+=a.BuffHp||0;units(me).forEach(u=>{u.atk+=a.BuffAtk||0;u.hp+=a.BuffHp||0;u.mx+=a.BuffHp||0});break;
 case'BonusAttack':unitsOnly.forEach(t=>strike(G,t));break;
 case'TutorCard':{let i=c.tut?me.deck.findIndex(x=>x.uid==c.tut.uid):-1;if(i<0)i=me.deck.reduce((b,c2,k)=>CD[c2.id].Cost>CD[me.deck[b].id].Cost?k:b,0);const got=me.deck.length&&me.hand.length<8;if(got)me.hand.push(me.deck.splice(i,1)[0]);shuf(me.deck);if(got)gained(G,me,'tutor');break}
 case'ShuffleDeck':shuf(me.deck);break;
 case'DrawFromDiscard':for(let i=0;i<(a.Amount||1)&&me.disc.length&&me.hand.length<8;i++){me.hand.push(me.disc.pop());gained(G,me,'discard')}break;
 case'Reanimate':{
  const n=a.Count||1,ch=[];let ls=[0,1,2,3].filter(i=>!me.ln[i]);
  for(let k=0;k<n&&!a.Auto;k++){const w=(c.lanes||[])[c.li||0];if(w==null)break;c.li=(c.li||0)+1;if(ls.includes(w)&&!ch.includes(w))ch.push(w)}
  const rest=ls.filter(i=>!ch.includes(i)),pref=rest.filter(i=>!G.p[1-s.o].ln[i]);ls=ch.concat((pref.length?pref:rest).slice(0,n-ch.length));
  ls.forEach(i=>{if(me.ln[i]||G.over)return;const pool=me.disc.filter(x=>CD[x.id].Type=='Unit'&&cardOK(CD[x.id],a.Filter));if(!pool.length)return;
   const pk=pool[R(pool.length)];me.disc.splice(me.disc.indexOf(pk),1);const nu=mk(pk.id,s.o);place(G,me,nu,i);L(G,nu.d.Name+' rises from the discard');
   if(!c.sm&&!G.over)fire(G,'OnPlayed',nu,{tf:1,nosac:1,sm:1})});break}
 case'MoveRight':{const i=s.lane+1;if(i<4&&!me.ln[i]&&me.ln[s.lane]==s){me.ln[s.lane]=null;place(G,me,s,i)}break}
 case'SpendBlood':me.b=a.Amount!=null?Math.max(0,me.b-a.Amount):0;break
 case'AddResource':me.b=Math.min(me.b+(a.Amount||1),10);break
 case'Merge':{
  if(s.gone||s.hp<=0||!CD[a.Into])break;const rest=[];
  if(a.PieceSubtype){const n=a.Count||4,used=new Set([s.id]);if(!hasSub(s.d,a.PieceSubtype))break;
   for(const w of units(me)){if(rest.length>=n-1)break;if(w===s||w.gone||w.hp<=0||!hasSub(w.d,a.PieceSubtype)||(a.Distinct!==false&&used.has(w.id)))continue;used.add(w.id);rest.push(w)}
   if(rest.length<n-1)break}
  else{const need=(a.Pieces||[]).slice(),k=need.indexOf(s.id);if(k<0)break;need.splice(k,1);
   for(const id of need){const w=units(me).find(x=>x!==s&&x.id==id&&x.hp>0&&!x.gone&&!rest.includes(x));if(!w)break;rest.push(w)}
   if(rest.length<need.length)break}
  const names=[s,...rest].map(x=>x.d.Name).join(' + ');
  const base=x=>x.atk-(x.aurA||0),sA=[s,...rest].reduce((t,x)=>t+base(x),0),sH=[s,...rest].reduce((t,x)=>t+Math.max(0,x.hp),0),sM=[s,...rest].reduce((t,x)=>t+x.mx,0);
  rest.forEach(w=>{EV(G,{k:'bnc',id:w.id,atk:w.atk,hp:Math.max(w.hp,0),o:w.o,lane:w.lane});me.ln[w.lane]=null;w.gone=1});
  transformUnit(G,s,a.Into);if(a.SumStats){s.atk=sA;s.hp=Math.max(1,sH);s.mx=Math.max(s.hp,sM)}EV(G,{k:'snd',n:'buff'});L(G,names+' merge into '+CD[a.Into].Name);
  if(a.FirePlayed)fire(G,'OnPlayed',s,{});break}
 case'MoveToSourceLane':{
  ts.forEach(t=>{if(t.h||t.gone||t.hp<=0)return;const o=G.p[t.o],dest=s.lane;
   if(dest>=0&&dest!=t.lane&&!o.ln[dest]&&o.ln[t.lane]===t){o.ln[t.lane]=null;place(G,o,t,dest);L(G,t.d.Name+' is pulled into lane '+(dest+1))}
   else if(a.Else&&a.Else.Amount)dmg(G,t,a.Else.Amount,s,2)});break}
 case'PlayNextTwice':me.dw=1;L(G,'Your next action is played twice');break;
  case'ReplayPlayed':{
  if(c.rp)break;const SKIP=['SacrificeUnit','SacrificeUnits','AbsorbStats','Merge','Transform','ReplayPlayed'];
  G.hist.filter(h=>h.p==s.o&&h.uid!==s.uid&&CD[h.id]&&CD[h.id].Type=='Unit').forEach(h=>{if(G.over||s.gone||s.hp<=0)return;
   (CD[h.id].Effects||[]).forEach(e=>{if(e.Trigger!='OnPlayed'||e.Zone||!cond(e.Condition,s,{},G))return;
    const acts=e.Targeting=='Choice'&&e.ChoiceLabels?[e.Actions[0]]:e.Actions;
    acts.forEach(a2=>{if(!SKIP.includes(a2.Type)&&!a2.OnlyIfSacrificed)act(G,a2,s,{rp:1,tf:1,nosac:1,sm:1})})})});break}
 case'Transform':{
  if(a.Partner!=null){const pt=units(me).find(u=>u!==s&&u.id==a.Partner&&u.hp>0&&!u.gone);if(!pt||s.hp<=0||s.gone)break;
   const n1=CD[s.id].Name,n2=CD[pt.id].Name;transformUnit(G,s,a.Into);transformUnit(G,pt,a.PartnerInto);L(G,n1+' and '+n2+' found each other');if(a.FirePlayed!==false&&!c.tf)fire(G,'OnPlayed',s,{tf:1,nosac:1})}
  else unitsOnly.forEach(t=>{let into=a.Into;if(a.IntoFrom=='LastPlayed'){const e=lastPlayed(G,t.o,a.Filter,t.uid);if(!e)return;into=e.id}
   if(into==null||!CD[into])return;transformUnit(G,t,into);if(a.FirePlayed!==false&&!c.tf)fire(G,'OnPlayed',t,{tf:1,nosac:1})});break}}
 resolve(G)}
function lastPlayed(G,pi,f,exceptUid){for(let i=G.hist.length-1;i>=0;i--){const e=G.hist[i];if(e.p!=pi||e.uid===exceptUid||!CD[e.id])continue;if(CD[e.id].Type=='Unit'&&cardOK(CD[e.id],f))return e}return null}
function transformUnit(G,u,id){const d=CD[id],p=G.p[u.o],from=u.id,oa=u.atk,oh=u.hp;
 u.id=id;u.d=d;u.atk=(d.Attack||0)+p.gb.a;u.hp=u.mx=(d.Health||0)+p.gb.h;u.kw=new Set(d.Keywords||[]);u.sil=0;u.sga=0;u.sgd=0;u.red=0;u.aurA=0;u.ag={};u.agc={};
 EV(G,{k:'tf',u:u.uid,o:u.o,l:u.lane,from,to:id,atk:oa,hp:oh})}
function place(G,p,u,i){EV(G,{k:'in',u:u.uid});u.lane=i;u.o=p.i;u.gone=0;p.ln[i]=u;if(!u.placed){u.placed=1;u.atk+=p.gb.a;u.hp+=p.gb.h;u.mx+=p.gb.h}}
function killUnit(G,u,lane){const p=G.p[u.o],unk=u.kw.has('Unkillable')&&!u.sil;
 EV(G,{k:'die',id:u.id,atk:u.atk,hp:Math.max(u.hp,0),o:p.i,lane,uid:u.uid,bt:G.bt?1:0});
 p.ln[lane]=null;u.gone=1;
 if(!unk&&u.id<900)p.disc.push({uid:UID++,id:u.id,unk:u.kw.has('Unkillable')?1:0});
 fire(G,'OnDeath',u,{u});units(p).forEach(o=>fire(G,'OnFriendlyUnitDied',o,{u}));fireHand(G,'OnFriendlyUnitDied',p,{u,lane});
 if(unk){L(G,u.d.Name+' is Unkillable - back to hand');
  if(u.id<900){const card={uid:UID++,id:u.id,nf:u.uid,unk:1};if(p.hand.length<8){p.hand.push(card);gained(G,p,'unkillable')}else p.disc.push(card)}}}
function sacrifice(G,u,by){const p=G.p[u.o];p.sc++;L(G,u.d.Name+' sacrificed');
 fire(G,'OnSacrificed',u,{by:by||null});
 if(!u.gone)killUnit(G,u,u.lane);
 units(p).forEach(o=>{if(!o.gone)fire(G,'OnOtherUnitSacrificed',o,{u})});fireHand(G,'OnOtherUnitSacrificed',p,{u})}
function resolve(G){aura(G);
 for(let n=0;n<30&&!G.over;n++){let ch=0;
  for(const p of G.p)for(let i=0;i<4;i++){const u=p.ln[i];if(!u||u.hp>0)continue;ch=1;
   if(u.kw.has('SoulGuard')){u.kw.delete('SoulGuard');u.sgd=1;(u.agc=u.agc||{}).SoulGuard=1;u.hp=1;L(G,u.d.Name+' soul guard breaks');continue}
   killUnit(G,u,i);if(!u.kw.has('Unkillable'))L(G,u.d.Name+' destroyed')}
  if(!ch)break}
 aura(G);chk(G)}
function splash(G,x,i,n){[i-1,i+1].forEach(k=>{const w=G.p[1-x.o].ln[k];if(w)dmg(G,w,n,x,1)})}
function strike(G,u){if(!u||u.gone||G.over)return;
 if(u.kw.has('Stunned')){u.kw.delete('Stunned');return}
 const v=G.p[1-u.o].ln[u.lane];
 EV(G,{k:'atk',u:u.uid,o:u.o,l:u.lane,bonus:1,post:G.pc?1:0,hr:(v&&!!u.kw.has('Flying')===!!v.kw.has('Flying'))?0:1});
 if(v&&!!u.kw.has('Flying')===!!v.kw.has('Flying')){dmg(G,v,u.atk,u,1);if(u.kw.has('Breakthrough')&&!G.over)thru(G,u,u.atk)}else dmg(G,H(1-u.o),u.atk,u,1);
 if(u.kw.has('SplashDamage'))splash(G,u,u.lane,kwp(u,'SplashDamage'));
 later(G,()=>{if(!G.over)fire(G,'OnAttackDone',u,{u})})}
function preTargets(G,u){if(!u||u.sil)return null;
 const e=(u.d.Effects||[]).find(x=>x.Trigger=='OnPreCombatLine'&&x.Actions.some(a=>a.Target=='TargetEnemyUnit'));
 const t=units(G.p[1-u.o]).filter(x=>!unact(x));return e&&t.length?t:null}
function lane(G,i,pre){pre=pre||{};
 [0,1].forEach(o=>{const u=G.p[o].ln[i];if(!u)return;let t=pre[o];if(!t&&preTargets(G,u))t=botPick(G,G.p[o],'e');fire(G,'OnPreCombatLine',u,{t})});resolve(G);
 const A=G.p[0].ln[i],B=G.p[1].ln[i];if(!A&&!B)return;
 const sa=A&&A.kw.has('Stunned'),sb=B&&B.kw.has('Stunned'),aa=A?A.atk:0,ba=B?B.atk:0;
 if(sa)A.kw.delete('Stunned');if(sb)B.kw.delete('Stunned');
 const hit=(x,y,n,st)=>{if(!x||st||n<=0)return;EV(G,{k:'atk',u:x.uid,o:x.o,l:i,hr:(y&&!!x.kw.has('Flying')===!!y.kw.has('Flying'))?0:1});
  if(y&&!!x.kw.has('Flying')===!!y.kw.has('Flying')){dmg(G,y,n,x,1);if(x.kw.has('Breakthrough')&&!G.over)thru(G,x,n)}else dmg(G,H(1-x.o),n,x,1);
  if(x.kw.has('SplashDamage'))splash(G,x,i,kwp(x,'SplashDamage'));
  later(G,()=>{if(!G.over)fire(G,'OnAttackDone',x,{u:x})})};
 G.q=[];hit(A,B,aa,sa);hit(B,A,ba,sb);const q=G.q;G.q=null;q.forEach(f=>f());resolve(G);
 G.pc=1;[0,1].forEach(o=>{const u=G.p[o].ln[i];if(u&&!u.gone&&!G.over)fire(G,'OnPostCombatLine',u,{})});G.pc=0;resolve(G)}
function endRound(G){if(G.p.some(p=>units(p).some(u=>u.kw.has('Burning'))))EV(G,{k:'snd',n:'burn'});G.p.forEach(p=>units(p).forEach(u=>{if(u.kw.has('Burning')){const ar=u.kw.has('Armored')?kwp(u,'Armored'):u.kw.has('Armor2')?2:0,n=Math.max(0,1-ar);u.hp-=n;EV(G,{k:'dmg',u:u.uid,n,bt:1})}}));G.bt=1;resolve(G);G.bt=0;roundTrig(G,'OnEndOfRound');evolveAll(G)}
function evolve(G,u){const c=(CD[u.id].Cost||0)+1,pool=poolOf({Type:'Unit',Cost:c}).filter(d=>!hasSub(d,'Piece'));if(!pool.length)return;
 const d=pool[R(pool.length)];L(G,u.d.Name+' evolves into '+d.Name);transformUnit(G,u,d.Id);u.kw.add('Evolving');EV(G,{k:'snd',n:'buff'})}
function evolveAll(G){if(G.over)return;[G.start,1-G.start].forEach(i=>G.p[i].ln.slice().forEach(u=>{if(u&&!u.gone&&u.hp>0&&!u.sil&&u.kw.has('Evolving')&&!G.over)evolve(G,u)}));resolve(G)}
const SELKIND={TargetEnemyUnit:'e',TargetFriendlyUnit:'f',TargetAnyUnit:'a',TargetEnemyUnitOrHero:'eh'};
const DEBUFF_ST=['Marked','Burning','Stunned'];
function selKind(a,e){const tt=a.Target,T=a.Type;if(a.Select)return a.Select;
 if(SELKIND[tt])return SELKIND[tt];if(tt!='SelectedTarget')return null;
 if(e&&SELKIND[e.Targeting])return SELKIND[e.Targeting];
 return T=='DealDamage'?'eh':(T=='DestroyUnit'||T=='Silence'||(T=='ApplyStatus'&&DEBUFF_ST.includes(a.StatusKeyword)))?'e':T=='ReturnToHand'?'a':'f'}
function picks(d,noSac){const out=[];out.f=[];let hasT=0,hasE=0,hasF=0,hasA=0;const push=(k,f)=>{out.push(k);out.f.push(f||null)};
 for(const e of d.Effects||[]){if(e.Trigger!='OnPlayed')continue;
  if(e.Targeting=='Choice'&&e.ChoiceLabels&&e.ChoiceLabels.length==e.Actions.length){push('C');continue}
  for(const a0 of e.Actions){const a=TYPEALIAS[a0.Type]?Object.assign({},a0,{Type:TYPEALIAS[a0.Type]}):a0,T=a.Type,tt=a.Target;if(T=='AbsorbStats'||(noSac&&a.OnlyIfSacrificed))continue;
   if(T=='TutorCard'){push('D');continue}
   if(T=='SacrificeUnits'){push('M');continue}
   if((T=='MakeAUnit'||T=='Reanimate')&&a.StringParam!='AdjacentLanes'&&!a.Auto){for(let n=0;n<(a.Count||1);n++)push('L');continue}
   if(T=='SacrificeUnit'&&tt!='Self'){if(tt=='SelectedTarget'&&hasT)continue;push('S');continue}
   const k=selKind(a,e);if(!k)continue;
   if(tt=='SelectedTarget'){if(hasT)continue;hasT=1}
   else if(k=='e'){if(hasE)continue;hasE=1}else if(k=='f'){if(hasF)continue;hasF=1}else{if(hasA)continue;hasA=1}
   push(k,a.Where)}}
 return out}
const NOSAC=-1;
const optSac=d=>(d.Effects||[]).some(e=>e.Trigger=='OnPlayed'&&e.Actions.some(a=>a.Type=='SacrificeUnit'&&a.Optional));
function req(G,p,k,f,ex){const me=units(p).filter(u=>!unact(u)),op=units(G.p[1-p.i]).filter(u=>!unact(u)),fl=l=>f?l.filter(x=>unitOK(x,f)):l;
 return k=='L'?[0,1,2,3].filter(i=>!p.ln[i]&&!(ex||[]).includes(i)):k=='e'?fl(op):(k=='f'||k=='S'||k=='M')?fl(me):k=='a'?fl([...me,...op]):k=='eh'?[...fl(op),H(1-p.i)]:k=='D'?p.deck:k=='C'?[0,1]:[]}
const actKind=(a,e)=>selKind(a,e);
function apicks(G,p,d,got,ln){got=got||[];const out=[];out.f=[];
 let noSac=picks(d).includes('S')&&!req(G,p,'S').length;
 let ks=picks(d,noSac);
 for(let i=0;i<ks.length;i++){const k=ks[i],ex=k=='L'?(ln!=null?[ln]:[]).concat(out.map((kk,j)=>kk=='L'?got[j]:null).filter(x=>x!=null)):null;if(!req(G,p,k,ks.f[i],ex).length)continue;out.push(k);out.f.push(ks.f[i]);
  if(k=='C'){const v=got[out.length-1];const e=(d.Effects||[]).find(x=>x.ChoiceLabels);
   if(v!=null&&e){const act0=e.Actions[v],kk=actKind(act0,e);if(kk&&req(G,p,kk,act0.Where).length){out.push(kk);out.f.push(act0.Where||null)}}}
  else if(k=='S'&&!noSac&&got[out.length-1]===NOSAC&&optSac(d)){noSac=true;ks=picks(d,true)}}
 return out}
function choiceOK(G,p,d,i){const e=(d.Effects||[]).find(x=>x.ChoiceLabels);if(!e)return true;const a=e.Actions[i];
 if(a.Type=='DrawFromDiscard')return p.disc.length>0;const k=actKind(a,e);return!k||req(G,p,k,a.Where).length>0}
function canPlay(G,p,ci,ln){const c=p.hand[ci];if(!c||G.over)return false;if(G.act!=null&&p.i!=G.act)return false;
 const d=CD[c.id];if((G.allow=='U'&&d.Type!='Unit')||(G.allow=='A'&&d.Type!='Spell'))return false;
 if(cost(G,p,c)>p.b)return false;
 if(d.Type=='Unit'&&(ln==null||p.ln[ln]))return false;
 if(d.Type=='Spell'){const pk=picks(d);if(pk.some((k,i)=>k!='L'&&!req(G,p,k,pk.f[i]).length))return false}return true}
const playable=(G,p,i)=>{const c=p.hand[i];return c&&CD[c.id].Type=='Unit'?[0,1,2,3].some(l=>canPlay(G,p,i,l)):canPlay(G,p,i,null)};
function play(G,p,ci,ln,pk){if(!canPlay(G,p,ci,ln))return false;
 const c=p.hand[ci],d=CD[c.id],ctx={};if((pk||[]).includes(NOSAC)&&!optSac(d))return false;
 const ks=apicks(G,p,d,pk,ln);
 if(ks.some((k,i)=>{const v=(pk||[])[i],f=ks.f[i];return f&&v!=null&&v!==NOSAC&&typeof v=='object'&&!unitOK(v,f)}))return false;
 ks.forEach((k,i)=>{const v=(pk||[])[i];if(v==null)return;if(k=='S'){if(v===NOSAC)ctx.nosac=1;else ctx.sac=v}else if(k=='M')ctx.sacs=v;else if(k=='D')ctx.tut=v;else if(k=='C')ctx.ch=v;else if(k=='L')(ctx.lanes=ctx.lanes||[]).push(v);else if(!ctx.t)ctx.t=v;else ctx.t2=v});
 p.b-=cost(G,p,c);p.hand.splice(ci,1);
 const he={p:p.i,t:G.turn,id:c.id,tg:ctx.t?(ctx.t.h?'Hero':ctx.t.d.Name):ctx.sac?ctx.sac.d.Name:''};G.hist.push(he);
 if(!G.sim)costMods(G,p,c).forEach(m=>{if(m.amt>0||d.Cost-(c.red||0)>0)EV(G,{k:'trig',u:m.src.uid})});
 if(d.Type=='Unit'){const u=mk(c.id,p.i);u.atk+=c.ba||0;if(c.unk)u.kw.add('Unkillable');he.uid=u.uid;place(G,p,u,ln);L(G,(p.i?'Enemy':'You')+' play '+d.Name);
  fire(G,'OnPlayed',u,ctx);p.ln.slice().forEach(w=>w&&w!==u&&fire(G,'OnPlayed',w,{u,lis:1}));
  p.ln.slice().forEach(w=>w&&w!==u&&fire(G,'OnFriendlyUnitPlayed',w,{u}));G.p[1-p.i].ln.slice().forEach(w=>w&&fire(G,'OnEnemyUnitPlayed',w,{u}));resolve(G)}
 else{L(G,(p.i?'Enemy':'You')+' cast '+d.Name);const s={d,o:p.i,sp:1,lane:-1,uid:0};
  const twice=!!p.dw;if(twice){p.dw=0;L(G,'Dual Wield - '+d.Name+' is played twice')}
  fire(G,'OnPlayed',s,ctx);resolve(G);
  if(twice&&!G.over){
   const c2=Object.assign({},ctx);delete c2.sac;delete c2.sacd;delete c2.last;if(c2.t&&!c2.t.h&&(c2.t.gone||c2.t.hp<=0))delete c2.t;
   fire(G,'OnPlayed',{d,o:p.i,sp:1,lane:-1,uid:0},c2);resolve(G)}
  if(s.give&&G.p[1-p.i].hand.length<8){const cc=s.giveA&&s.giveA.CostChange;G.p[1-p.i].hand.push({uid:UID++,id:c.id,...(cc?{red:(c.red||0)-cc}:{})});gained(G,G.p[1-p.i],'gift')}else p.disc.push({uid:UID++,id:c.id});
  p.ln.forEach(w=>w&&fire(G,'OnFriendlyActionPlayed',w,{}));fireHand(G,'OnFriendlyActionPlayed',p,{})}
 return true}
function botPick(G,p,k,ex){const val=u=>u.atk*2+u.hp,ts=req(G,p,k,null,ex);
 if(k=='L'){const op=G.p[1-p.i];return shuf(ts.slice()).sort((a,b)=>(op.ln[a]?1:0)-(op.ln[b]?1:0))[0]}
 if(k=='M')return[];
 if(k=='C')return(p.deck.length<2&&p.disc.length>=2)?1:0;
 if(k=='D')return ts.slice().sort((a,b)=>CD[b.id].Cost-CD[a.id].Cost)[0];
 if(k=='S')return ts.slice().sort((a,b)=>val(a)-val(b))[0];
 if(k=='f')return ts.slice().sort((a,b)=>val(b)-val(a))[0];
 const un=ts.filter(x=>!x.h&&x.o!=p.i).sort((a,b)=>val(b)-val(a));
 return un[0]||ts.find(x=>x.h)||ts[0]}
function botPlanBasic(G,p){const op=G.p[1-p.i];
 const order=p.hand.map((c,i)=>({c,i,k:cost(G,p,c)})).sort((a,b)=>b.k-a.k);
 for(const {c,i} of order){const d=CD[c.id];if(!playable(G,p,i))continue;
  const pick=ln=>{const pk=[];for(let n=0;n<8;n++){const ks=apicks(G,p,d,pk,ln);if(ks.length<=pk.length)break;const kk=ks[pk.length];pk.push(botPick(G,p,kk,kk=='L'?(ln!=null?[ln]:[]).concat(pk.filter((_,j)=>ks[j]=='L')):null))}return pk};
  if(d.Type=='Spell'){
   if(picks(d).includes('S')&&units(p).length<2)continue;
   if((d.Effects||[]).some(e=>e.Trigger=='OnPlayed'&&e.Actions.some(a=>['AllEnemyUnits','AllUnitsOnBoard'].includes(a.Target)&&['DealDamage','DestroyUnit','Silence','BuffStats','ApplyStatus'].includes(a.Type)))&&units(op).length<2)continue;
   if((d.Effects||[]).some(e=>e.Actions.some(a=>a.Type=='Reanimate'&&!(p.disc.some(x=>CD[x.id].Type=='Unit'&&cardOK(CD[x.id],a.Filter))&&p.ln.some(x=>!x)))))continue;
   return{ci:i,ln:null,pk:pick(),sp:1,id:c.id}}
  const free=[0,1,2,3].filter(x=>!p.ln[x]);
  const sc=x=>{const e=op.ln[x];return(e?(d.Attack||0)>=e.hp?3:0:(d.Attack||0)>0?4:0)+R(100)/100};
  const ln0=free.sort((a,b)=>sc(b)-sc(a))[0];return{ci:i,ln:ln0,pk:pick(ln0),id:c.id}}
 return null}
function botStep(G,p){const m=botPlan(G,p);return m?play(G,p,m.ci,m.ln,m.pk):false}
let BOTMODE='smart';
