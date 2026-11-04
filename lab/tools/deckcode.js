const fs=require('fs');
const B32='0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const rng=s=>()=>{s=(s+0x6D2B79F5)|0;let t=Math.imul(s^(s>>>15),1|s);t=(t+Math.imul(t^(t>>>7),61|t))^t;return((t^(t>>>14))>>>0)/4294967296};
const ckOf=ents=>{let k=ents.length+11;ents.forEach(([id,q])=>{k=(k*31+id*4+q)%251});return k};
function encode(ids){
 const m={};ids.forEach(id=>{m[id]=(m[id]||0)+1});
 const ents=Object.keys(m).map(Number).filter(id=>m[id]>0).sort((a,b)=>a-b).map(id=>[id,Math.min(3,m[id])]);
 if(!ents.length)return'';
 const ck=ckOf(ents),bits=[],put=(v,n)=>{for(let i=n-1;i>=0;i--)bits.push((v>>i)&1)};
 put(ck,8);put(1,4);put(ents.length,6);ents.forEach(([id,q])=>{put(id,12);put(q,2)});
 const r=rng(ck*7919+12345);for(let i=8;i<bits.length;i++)bits[i]^=(r()*2)|0;
 while(bits.length%5)bits.push((r()*2)|0);
 let s='';for(let i=0;i<bits.length;i+=5)s+=B32[bits[i]*16+bits[i+1]*8+bits[i+2]*4+bits[i+3]*2+bits[i+4]];
 return s.match(/.{1,5}/g).join('-')}
function decode(txt){
 const s=String(txt||'').toUpperCase().replace(/[^0-9A-Z]/g,'').replace(/O/g,'0').replace(/[IL]/g,'1').replace(/U/g,'V'),BAD='not a valid deck code';
 if(s.length<8)throw new Error(BAD);
 const bits=[];for(const ch of s){const v=B32.indexOf(ch);if(v<0)throw new Error(BAD);for(let i=4;i>=0;i--)bits.push((v>>i)&1)}
 let p=0;const get=n=>{if(p+n>bits.length)throw new Error(BAD);let v=0;for(let i=0;i<n;i++)v=v*2+bits[p++];return v};
 const ck=get(8),r=rng(ck*7919+12345);for(let i=8;i<bits.length;i++)bits[i]^=(r()*2)|0;
 if(get(4)!=1)throw new Error('deck code from a different version of the game');
 const n=get(6);if(!n||n>30)throw new Error(BAD);const ents=[];for(let i=0;i<n;i++){const id=get(12),q=get(2);if(!q)throw new Error(BAD);ents.push([id,q])}
 if(bits.length-p>4||ckOf(ents)!=ck)throw new Error(BAD+' (checksum)');
 const out=[];ents.forEach(([id,q])=>{for(let i=0;i<q;i++)out.push(id)});return out}
function readDecks(file){
 const txt=fs.readFileSync(file,'utf8');
 if(/^\s*[\[{]/.test(txt)){const j=JSON.parse(txt);return(Array.isArray(j)?j:[j]).map((d,i)=>({n:d.n||'Deck '+(i+1),c:d.c.map(Number)}))}
 const out=[];txt.split(/\r?\n/).forEach((raw,ln)=>{const line=raw.trim();if(!line||line[0]=='#'||line.startsWith('//'))return;
  const mm=line.match(/^(?:(.*?)\s*[:=\t]\s*|(.*\S)\s+)?([0-9A-Za-z]{5}(?:-[0-9A-Za-z]{2,5})+)\s*$/);
  if(!mm)throw new Error(file+' line '+(ln+1)+': no deck code found in "'+line.slice(0,60)+'"');
  let c;try{c=decode(mm[3])}catch(e){throw new Error(file+' line '+(ln+1)+': '+e.message)}
  out.push({n:(mm[1]||mm[2]||'Deck '+(out.length+1)).trim(),c})});
 if(!out.length)throw new Error(file+': no decks found');return out}
module.exports={encode,decode,readDecks};
