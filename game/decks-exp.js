
const DECKS_EXP = [
 {
  "n": "AlphaWolfMidrange",
  "c": [
   1,
   8,
   15,
   15,
   24,
   29,
   31,
   31,
   31,
   34,
   34,
   41,
   41,
   45,
   45,
   49,
   58,
   59,
   59,
   63,
   63,
   66,
   75,
   84,
   85,
   88,
   88,
   88,
   92,
   100
  ]
 }
]
;(function(){
  if(!window.RJ_EXP||!DECKS_EXP.length)return;
  DECKS.length=0;
  DECKS_EXP.forEach(function(d){DECKS.push(d)});
})();
