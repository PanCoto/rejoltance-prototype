const B='http://localhost:8787',W='ws://localhost:8787';
const j=async(p,o={},a)=>{const r=await fetch(B+p,{...o,headers:{'content-type':'application/json',...(a?{authorization:'Bearer '+a.uid+'.'+a.key}:{})}});return{s:r.status,b:await r.json()}};
const reg=async n=>(await j('/api/register',{method:'POST',body:JSON.stringify({name:n})})).b;
const queue=(a,mode,v='t')=>new Promise((res,rej)=>{const ws=new WebSocket(W+'/api/queue');const t=setTimeout(()=>rej(new Error('timeout '+a.name)),15000);
 ws.onopen=()=>ws.send(JSON.stringify({t:'join',uid:a.uid,key:a.key,mode,v}));
 ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.t=='match'){clearTimeout(t);res(m)}if(m.t=='err'){clearTimeout(t);rej(new Error(m.msg))}}});
const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)process.exitCode=1};
const A=await reg('Alice'),Bo=await reg('Bob'),C=await reg('Cara'),D=await reg('Dan');
ok(A.uid&&A.key,'register');
ok((await j('/api/me',{method:'POST'},{uid:A.uid,key:'wrong'})).s==401,'bad key rejected');
ok((await j('/api/me',{method:'POST'},A)).b.rating==1000,'profile');
// ranked pair
let [m1,m2]=await Promise.all([queue(A,'ranked'),queue(Bo,'ranked')]);
ok(m1.code==m2.code&&m1.id==m2.id&&m1.role!=m2.role,'ranked pairing roles/code '+m1.role+'/'+m2.role);
ok(m1.opp.name=='Bob'&&m2.opp.name=='Alice','opponent info');
// both report: Alice wins
let r=await j('/api/report',{method:'POST',body:JSON.stringify({id:m1.id,r:'win'})},A);ok(r.b.st=='open','first report pending');
r=await j('/api/report',{method:'POST',body:JSON.stringify({id:m1.id,r:'loss'})},Bo);ok(r.b.st=='done'&&r.b.delta<0,'both reports -> done, Bob delta '+r.b.delta);
let pa=(await j('/api/me',{method:'POST'},A)).b,pb=(await j('/api/me',{method:'POST'},Bo)).b;
ok(pa.rating==1020&&pb.rating==980&&pa.wins==1&&pb.losses==1,'elo update '+pa.rating+'/'+pb.rating);
ok((await j('/api/match?id='+m1.id,{},A)).b.delta==20,'match poll');
// dispute: both claim win
[m1,m2]=await Promise.all([queue(C,'ranked'),queue(D,'ranked')]);
await j('/api/report',{method:'POST',body:JSON.stringify({id:m1.id,r:'win'})},C);
r=await j('/api/report',{method:'POST',body:JSON.stringify({id:m1.id,r:'win'})},D);ok(r.b.st=='void','conflicting reports void');
// abort
[m1,m2]=await Promise.all([queue(C,'ranked'),queue(D,'ranked')]);
r=await j('/api/report',{method:'POST',body:JSON.stringify({id:m1.id,r:'abort'})},C);ok(r.b.st=='void','abort voids');
// outsider can't report
const E=await reg('Eve');[m1,m2]=await Promise.all([queue(C,'ranked'),queue(D,'ranked')]);
r=await j('/api/report',{method:'POST',body:JSON.stringify({id:m1.id,r:'win'})},E);ok(r.b.st=='none','non-participant ignored');
// casual + version isolation
[m1,m2]=await Promise.all([queue(A,'casual'),queue(Bo,'casual')]);ok(m1.code==m2.code&&m1.id=='','casual pairing (no match record)');
// rating window: far-apart ratings do not pair instantly
// leaderboard
const lb=(await j('/api/leaderboard')).b;ok(lb[0].name=='Alice'&&lb[0].rank==1&&lb.length==2,'leaderboard '+JSON.stringify(lb.map(x=>x.name+x.rating)));

const q=await j('/api/ping');console.log('ping',JSON.stringify(q.b));
// same pair limit: play 3 more ranked games A vs Bo -> 4th unrated
for(let i=0;i<4;i++){const [x]=await Promise.all([queue(A,'ranked'),queue(Bo,'ranked')]);
 await j('/api/report',{method:'POST',body:JSON.stringify({id:x.id,r:'win'})},A);const y=await j('/api/report',{method:'POST',body:JSON.stringify({id:x.id,r:'loss'})},Bo);console.log(' game',i+2,y.b.st,y.b.delta)}
process.exit(process.exitCode||0);
