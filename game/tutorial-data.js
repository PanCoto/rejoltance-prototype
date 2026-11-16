/* ============================================================================================
   TUTORIAL DATA - everything the guided tutorial (tutorial.js) plays with.

   The tutorial is 100% deterministic: fixed cards, fixed draw order, fixed opponent moves.
   Its cards are PRIVATE COPIES of real cards (ids 9001+), so balance patches to cards.js can
   never break the lesson. The copies only exist while the tutorial runs. If you want the
   tutorial to follow a balance change, edit the numbers here (and the texts in tutorial.js).

   Verified outcome (see the 'Script check' comment at the bottom):
     Round 1  you play BoomBot; enemy passes (nothing costs 1)      -> enemy hero 8 -> 7
     Round 2  enemy Goat; you: Scout (marks) + Dagger Throw kill it -> enemy hero 7 -> 5
     Round 3  you: Gargoyle, enemy Knight, you: Magic Touch         -> enemy hero 5 -> 0, you 20 -> 18
   ============================================================================================ */
const TUTDATA=(()=>{
 const ID={boom:9001,scout:9002,dagger:9003,knight:9004,garg:9005,touch:9006,goat:9007};
 // art: which existing card image each copy uses (card Id in cards.js)
 const ART={boom:2,scout:4,dagger:45,knight:8,garg:59,touch:50,goat:64};
 const CARDS={
  [ID.boom]:{Id:ID.boom,Name:'BoomBot',Type:'Unit',Subtypes:['Machine'],Cost:1,Attack:1,Health:1,
   Description:'When Destroyed: Deal 2 damage to the Enemy Hero.',
   Effects:[{Trigger:'OnDeath',Actions:[{Type:'DealDamage',Target:'EnemyHero',Amount:2}]}]},
  [ID.scout]:{Id:ID.scout,Name:'Scout',Type:'Unit',Subtypes:['Human'],Cost:1,Attack:1,Health:1,
   Description:'When Played: Mark an Enemy Unit.',
   Effects:[{Trigger:'OnPlayed',Actions:[{Type:'ApplyStatus',Target:'TargetEnemyUnit',StatusKeyword:'Marked'}]}]},
  [ID.dagger]:{Id:ID.dagger,Name:'Dagger Throw',Type:'Spell',Cost:1,
   Description:'Deal 2 Damage to a Unit.',
   Effects:[{Trigger:'OnPlayed',Actions:[{Type:'DealDamage',Target:'TargetEnemyUnit',Amount:2}]}]},
  [ID.knight]:{Id:ID.knight,Name:'Knight',Type:'Unit',Subtypes:['Human','Machine'],Cost:3,Attack:2,Health:3,
   Keywords:['Armored'],KeywordParams:{Armored:1},Description:''},
  [ID.garg]:{Id:ID.garg,Name:'Gargoyle',Type:'Unit',Subtypes:['Aberration','Animal'],Cost:2,Attack:2,Health:1,
   Keywords:['Flying'],Description:''},
  [ID.touch]:{Id:ID.touch,Name:'Magic Touch',Type:'Spell',Cost:1,
   Description:'A Friendly Unit gets +1/+3.',
   Effects:[{Trigger:'OnPlayed',Targeting:'TargetFriendlyUnit',Actions:[{Type:'BuffStats',Target:'SelectedTarget',BuffAtk:1,BuffHp:3}]}]},
  [ID.goat]:{Id:ID.goat,Name:'Black Goat',Type:'Unit',Subtypes:['Animal'],Cost:2,Attack:0,Health:4,
   Keywords:['Taunt'],Description:''}
 };
 const fill=(head,pool,n)=>{const d=head.slice();for(let i=0;d.length<n;i++)d.push(pool[i%pool.length]);return d};
 const I=ID;
 return{
  ID,ART,CARDS,
  // Draw order = list order. The first 4 cards are the opening hand, then 1 card per round from round 2.
  playerDeck:fill([I.boom,I.scout,I.dagger,I.knight, I.garg, I.touch],[I.boom,I.garg,I.knight,I.scout,I.dagger,I.touch],30),
  // The opponent's deck has NO 1-cost card, so in round 1 it truly cannot play anything.
  enemyDeck:fill([I.goat,I.knight,I.garg,I.goat],[I.garg,I.goat,I.knight],30),
  enemyHp:8,
  // Scripted opponent: 'round:step' -> cards it plays (in order) and the lane it puts them in.
  // step 0 = Units phase of the starting player, 1 = Unit and Actions phase of the other player.
  enemyPlan:{'2:0':[{id:I.goat,ln:1}],'3:1':[{id:I.knight,ln:0}]}
 };
})();

/* Script check (headless): run `node tools/check_tutorial.js` after editing this file or the engine.
   It replays the whole tutorial with the real engine and fails if the outcome above changes. */
