(function(){
  var KEY='rj_live_cache';
  var q=(location.search.match(/[?&]live=([^&]+)/)||[])[1];
  var url=q?decodeURIComponent(q):(window.RJ_LIVE||{}).url;
  if(!url)return;
  var data=null;
  try{
    var x=new XMLHttpRequest();
    x.open('GET',url+(url.indexOf('?')<0?'?':'&')+'t='+Date.now(),false);
    x.send();
    if(x.status>=200&&x.status<300){data=JSON.parse(x.responseText);try{localStorage.setItem(KEY,x.responseText)}catch(e){}}
  }catch(e){}
  if(!data){try{data=JSON.parse(localStorage.getItem(KEY))}catch(e){}}
  if(!data||!data.cards)return;
  Object.keys(data.cards).forEach(function(id){
    var c=CARDS.find(function(k){return k.Id==id});
    if(c)Object.assign(c,data.cards[id]);
    else CARDS.push(Object.assign({Id:+id},data.cards[id]));
  });
  window.RJ_LIVE_VERSION=data.version;
})();
