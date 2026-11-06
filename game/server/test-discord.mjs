const B='http://localhost:8787',W='ws://localhost:8787';
const j=async(p,o={},a)=>{const r=await fetch(B+p,{...o,headers:{'content-type':'application/json',...(a?{authorization:'Bearer '+a.uid+'.'+a.key}:{})}});return{s:r.status,b:await r.json()}};
const post=(p,b,a)=>j(p,{method:'POST',body:JSON.stringify(b)},a);
const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)process.exitCode=1};
// simulate: begin -> (Discord) -> callback -> redirect fragment
async function flow(code,nonce,acct,tamperState){
 const b=await post('/api/discord/begin',{n:nonce},acct);if(b.s!=200)return{err:b};
 const st=new URL(b.b.url).searchParams.get('state');
 const r=await fetch(B+'/auth/discord/callback?code='+code+'&state='+(tamperState||st),{redirect:'manual'});
 const loc=r.headers.get('location')||'';return{b:b.b,status:r.status,frag:loc.split('#')[1]||'',loc}}
const claim=(frag,n)=>post('/api/discord/claim',{code:new URLSearchParams(frag).get('dc'),n});
const N1='a'.repeat(20),N2='b'.repeat(20),N3='c'.repeat(20);
// 1 login, first time -> new account
let f=await flow('alice',N1);ok(f.status==302&&f.loc.startsWith('http://localhost:8080/game/#dc='),'callback redirects to GAME_URL with one-time code');
ok(f.b.mode=='login'&&new URL(f.b.url).searchParams.get('client_id')=='testid','begin(login) builds Discord URL');
let c=await claim(f.frag,'x'.repeat(20));ok(c.s==400,'claim with wrong nonce rejected');
f=await flow('alice',N1);c=await claim(f.frag,N1);ok(c.s==200&&c.b.key&&c.b.discord=='Alice D'&&c.b.name=='Alice D','claim ok: new account named from Discord');
const A=c.b;let r=await claim(f.frag,N1);ok(r.s==400,'code is single use');
ok((await j('/api/me',{method:'POST'},{uid:A.uid,key:A.key})).b.discord=='Alice D','session key authenticates');
// 2 login again on "another device" -> same account, different key, both work
f=await flow('alice',N2);c=await claim(f.frag,N2);ok(c.b.uid==A.uid&&c.b.key!=A.key,'second device gets same account, new key');
const A2=c.b;ok((await j('/api/me',{method:'POST'},{uid:A.uid,key:A.key})).s==200&&(await j('/api/me',{method:'POST'},{uid:A2.uid,key:A2.key})).s==200,'both device keys valid');
// 3 bad state / denied
f=await flow('alice',N3,null,'nonsense');ok(f.frag=='dcerr=state','unknown state rejected');
let b=await post('/api/discord/begin',{n:N3});let st=new URL(b.b.url).searchParams.get('state');
let rr=await fetch(B+'/auth/discord/callback?error=access_denied&state='+st,{redirect:'manual'});ok((rr.headers.get('location')||'').endsWith('#dcerr=denied'),'user denied -> dcerr=denied');
f=await flow('badcode',N3);ok(f.frag=='dcerr=failed','token exchange failure -> dcerr=failed');
// 4 link guest to discord
const G=(await post('/api/register',{name:'Guesty'})).b;
f=await flow('bob',N3,G);ok(f.b.mode=='link','begin with auth = link mode');c=await claim(f.frag,N3);ok(c.s==200&&c.b.key==null&&c.b.uid==G.uid&&c.b.discord=='bob_d','link keeps guest account/key');
ok((await j('/api/me',{method:'POST'},G)).b.discord=='bob_d','guest key still works after linking');
// 5 conflict: alice's discord into another guest
const H=(await post('/api/register',{name:'Other'})).b;f=await flow('alice',N1,H);ok(f.frag=='dcerr=taken','discord already linked elsewhere -> taken');
// 6 ranked requires discord
const q=(a)=>new Promise(res=>{const ws=new WebSocket(W+'/api/queue');ws.onopen=()=>ws.send(JSON.stringify({t:'join',uid:a.uid,key:a.key,mode:'ranked',v:'t'}));ws.onmessage=e=>{const m=JSON.parse(e.data);res(m.t+(m.code?':'+m.code:''));ws.close()}});
ok(await q(H)=='err:discord','ranked refused without discord');ok(await q(G)=='queued','ranked allowed with discord');
// 7 delete
ok((await post('/api/delete',{},H)).b.ok==1&&(await j('/api/me',{method:'POST'},H)).s==401,'delete account');
ok((await post('/api/discord/begin',{n:'short'})).s==400,'bad nonce rejected');
const p=(await j('/api/ping')).b;ok(p.discord===true,'ping reports discord');
process.exit(process.exitCode||0)
