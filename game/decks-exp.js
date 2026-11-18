const DECKS_EXP = [
 {
    "n": "MachineSwarm2x",
    "c": [
      2,
      2,
      7,
      8,
      21,
      21,
      42,
      42,
      44,
      44,
      45,
      45,
      50,
      52,
      52,
      54,
      54,
      55,
      61,
      61,
      62,
      62,
      81,
      91,
      94,
      97,
      97,
      98,
      103,
      103
    ]
  }
  ,{
    "n": "SacrificeZoo2x",
    "c": [
      7,
      10,
      11,
      12,
      12,
      13,
      13,
      18,
      18,
      39,
      39,
      45,
      48,
      48,
      49,
      63,
      63,
      64,
      64,
      65,
      65,
      67,
      68,
      76,
      77,
      77,
      78,
      78,
      100,
      110
    ]
  }
  ,{
    "n": "MarkHunters2x",
    "c": [
      4,
      4,
      7,
      7,
      8,
      8,
      19,
      22,
      24,
      24,
      25,
      25,
      26,
      26,
      32,
      32,
      37,
      37,
      45,
      45,
      49,
      51,
      51,
      53,
      66,
      86,
      86,
      95,
      95,
      111
    ]
  }
  ,{
    "n": "BurnControl2x",
    "c": [
      7,
      7,
      8,
      8,
      13,
      14,
      16,
      16,
      17,
      17,
      28,
      37,
      37,
      38,
      38,
      44,
      44,
      45,
      45,
      49,
      50,
      58,
      62,
      67,
      85,
      86,
      86,
      88,
      88,
      98
    ]
  }
  ,{
    "n": "AberrationRush2x",
    "c": [
      3,
      3,
      6,
      7,
      9,
      29,
      35,
      35,
      36,
      38,
      38,
      43,
      43,
      45,
      45,
      50,
      59,
      59,
      79,
      87,
      87,
      101,
      101,
      105,
      112,
      112,
      114,
      119,
      119,
      120
    ]
  }
]
;(function(){
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