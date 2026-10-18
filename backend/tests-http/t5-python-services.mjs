import {call,login,setTok} from './h.mjs';
let pass=0,fail=[]; const t=(n,c,d='')=>{ if(c) pass++; else fail.push(n+(d?'  -> '+d:'')); };
const D=r=>r.s+' '+JSON.stringify(r.j).slice(0,300);
const A=await login('admin@ndao-hifanosika.org','admin'); setTok(A.j.data.accessToken);
let r=await call('GET','/ai/health'); t('ai/health sonde réellement les services',r.s===200&&r.j.data.services.every(s=>s.status==='online'),D(r));
console.log('health:',JSON.stringify(r.j.data.services.map(s=>[s.name,s.status,s.latencyMs])));
r=await call('GET','/vulnerability/zones'); t('zones: source ml-service',r.s===200&&r.j.mlSource==='ml-service',D(r)); console.log('mlSource:',r.j?.mlSource, JSON.stringify(r.j?.data?.slice(0,2).map(z=>[z.name,z.score,z.mlScore,z.finalScore])));
r=await call('POST','/ai/train'); t('ai/train natif + ml-service',r.s===200&&r.j.mlService&&!r.j.mlService.error,D(r)); console.log('train mlService:',JSON.stringify(r.j?.mlService).slice(0,300));
r=await call('POST','/ai/train',null,'',{}); 
