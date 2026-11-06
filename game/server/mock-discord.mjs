import http from 'http';
const users={alice:{id:'111',username:'alice_d',global_name:'Alice D'},bob:{id:'222',username:'bob_d'}};
http.createServer((q,r)=>{let b='';q.on('data',d=>b+=d);q.on('end',()=>{
 if(q.url=='/api/oauth2/token'){const p=new URLSearchParams(b);if(p.get('client_secret')!='testsecret'||!users[p.get('code')]){r.statusCode=400;return r.end('{}')}r.end(JSON.stringify({access_token:'tok-'+p.get('code')}))}
 else if(q.url=='/api/users/@me'){const u=users[(q.headers.authorization||'').slice(11)];if(!u){r.statusCode=401;return r.end('{}')}r.end(JSON.stringify(u))}
 else{r.statusCode=404;r.end()}})}).listen(9999);
