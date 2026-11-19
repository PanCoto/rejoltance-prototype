const DECKS_EXP = 
[
{
  n: "OG C.",
  c: [
    1, 1, 5, 5, 6, 8, 8, 15, 16, 17,
    18, 18, 19, 19, 31, 31, 34, 34, 45, 45,
    47, 47, 86, 92, 93, 112, 112, 114, 114, 121
  ]
},
{
  n: "OG P.",
  c: [
    2, 2, 6, 6, 14, 14, 30, 30, 33, 33,
    41, 41, 42, 42, 44, 44, 129, 129, 81, 81,
    91, 91, 97, 97, 103, 103, 117, 117, 118, 118
  ]
},
{
  n: "OG B.",
  c: [
    3, 3, 5, 5, 6, 6, 13, 14, 14, 18,
    18, 27, 27, 29, 29, 35, 35, 36, 36, 39,
    45, 51, 51, 74, 74, 9, 89, 89, 121, 121
  ]
},
{
  n: "OG. M",
  c: [
    4, 4, 7, 7, 8, 8, 13, 15, 16, 21,
    24, 24, 25, 25, 26, 26, 31, 31, 32, 34,
    37, 37, 45, 53, 53, 86, 92, 92, 112, 113
  ]
}
];
(function(){
  if(!window.RJ_EXP||!DECKS_EXP.length)return;
  DECKS.length=0;
  DECKS_EXP.forEach(function(d){DECKS.push(d)});
})();

/* Max-copies rule (experimental build only).
   RJ_MAXC = most copies of one card a player-built deck may have (3 normally, 2 on the experimental build).
   Premade decks (DECKS) are exempt from the limit.
   RJ_MAX2_DEFAULT : the limit is ON by default on the experimental build.
   RJ_MAX2_TOGGLE  : set to true to show the "Max 2 copies per card" checkbox in Settings again
                     (the player's choice is then stored in localStorage 'rj_max2'; while it is false the setting is fixed to the default). */
window.RJ_MAX2_DEFAULT=true;
window.RJ_MAX2_TOGGLE=false;
window.RJ_MAXC=(window.RJ_EXP&&(function(){
  if(!window.RJ_MAX2_TOGGLE)return window.RJ_MAX2_DEFAULT;
  try{var v=localStorage.getItem('rj_max2');return v===null?window.RJ_MAX2_DEFAULT:v==='1'}catch(e){return window.RJ_MAX2_DEFAULT}
})())?2:3;
