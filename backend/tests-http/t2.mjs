import {call,login,setTok} from './h.mjs';
let pass=0,fail=[]; const t=(n,c,d='')=>{ if(c) pass++; else fail.push(n+(d?'  -> '+d:'')); };
const D=r=>r.s+' '+JSON.stringify(r.j).slice(0,170); const rnd=Math.random().toString(36).slice(2,6).toUpperCase();
const A=await login('admin@ndao-hifanosika.org','admin'); const adm=A.j.data.accessToken; setTok(adm); const myId=Number(A.j.data.user.id);
const g=(r,...ks)=>{for(const k of ks){const v=r.j?.[k]??r.j?.data?.[k]; if(v) return v;} return r.j?.data;};

// ---- ZONES
let r=await call('POST','/zones',{name:'Zone '+rnd,latitude:-21.45,longitude:47.08,region:'HM'}); t('zone create',r.s===201,D(r)); const zid=g(r,'zone')?.id??r.j?.data?.id;
r=await call('POST','/zones',{name:'Zone '+rnd,latitude:-21.45,longitude:47.08}); t('zone doublon = 409',r.s===409,D(r));
r=await call('POST','/zones',{name:'Z2'+rnd,latitude:'abc',longitude:47}); t('zone lat non numérique = 400',r.s===400,D(r));
r=await call('POST','/zones',{name:'Z3'+rnd,latitude:10,longitude:500}); t('zone lng hors limites = 400',r.s===400,D(r));
r=await call('PUT',`/zones/${zid}`,{name:'Zone '+rnd,latitude:-21.5,longitude:47.1,isHeadquarters:true}); t('zone update + siège',r.s===200,D(r));
r=await call('GET','/zones/999999'); t('zone inconnue = 404',r.s===404,D(r));
r=await call('PUT','/zones/999999',{name:'x',latitude:1,longitude:1}); t('zone update inconnue = 404',r.s===404,D(r));
r=await call('GET','/lookups/zones'); t('lookups zones contient la zone',(r.j.data||[]).some(z=>z.id===zid),D(r));

// ---- DEPARTEMENT + PROJETS
r=await call('POST','/departements',{name:'D'+rnd,code:'C'+rnd}); const did=r.j?.department?.id;
const proj={code:'P'+rnd,name:'Projet '+rnd,description:'desc',status:'ACTIVE',startDate:'2026-01-01',endDate:'2026-12-31',budget:5000,departmentId:did};
r=await call('POST','/projects',proj); t('projet create',r.s===201,D(r)); const pid=g(r,'project')?.id;
r=await call('POST','/projects',proj); t('projet code doublon = 409',r.s===409,D(r));
r=await call('POST','/projects',{...proj,code:'Q'+rnd,status:'BIDON'}); t('projet statut invalide = 400',r.s===400,D(r));
r=await call('POST','/projects',{...proj,code:'R'+rnd,startDate:'2026-12-31',endDate:'2026-01-01'}); t('projet fin avant début = 400',r.s===400,D(r));
r=await call('POST','/projects',{...proj,code:'S'+rnd,budget:-10}); t('projet budget négatif = 400',r.s===400,D(r));
r=await call('POST','/projects',{...proj,code:'T'+rnd,departmentId:999999}); t('projet département inexistant = 400/404/409',[400,404,409].includes(r.s),D(r));
r=await call('GET',`/projects/${pid}`); t('projet get',r.s===200,D(r));
r=await call('GET','/projects/999999'); t('projet inconnu = 404',r.s===404,D(r));
r=await call('GET','/projects?status=ACTIVE&search='+proj.name.split(' ')[1]); t('projet filtre+recherche',r.s===200,D(r));
for(const st of ['SUSPENDED','COMPLETED','CANCELLED','DRAFT','ACTIVE']){ r=await call('PUT',`/projects/${pid}`,{...proj,status:st}); t('projet statut '+st,r.s===200,D(r)); }
r=await call('PUT','/projects/999999',proj); t('projet update inconnu = 404',r.s===404,D(r));

// ---- ACTIVITES
const act={projectId:pid,title:'Act '+rnd,description:'d',status:'PLANNED',startDate:'2026-02-01',endDate:'2026-03-01',budget:100};
r=await call('POST','/activities',act); t('activité create',r.s===201,D(r)); const aid=g(r,'activity')?.id;
r=await call('POST','/activities',{...act,projectId:undefined}); t('activité sans projet = 400',r.s===400,D(r));
r=await call('POST','/activities',{...act,projectId:999999}); t('activité projet inexistant = 400/404',[400,404].includes(r.s),D(r));
r=await call('POST','/activities',{...act,title:''}); t('activité sans titre = 400',r.s===400,D(r));
r=await call('POST','/activities',{...act,status:'XX'}); t('activité statut invalide = 400',r.s===400,D(r));
r=await call('POST','/activities',{...act,startDate:'2026-05-01',endDate:'2026-04-01'}); t('activité fin avant début = 400',r.s===400,D(r));
for(const st of ['IN_PROGRESS','COMPLETED','CANCELLED']){ r=await call('PUT',`/activities/${aid}`,{...act,status:st}); t('activité statut '+st,r.s===200,D(r)); }
r=await call('GET','/activities/999999'); t('activité inconnue = 404',r.s===404,D(r));
r=await call('GET',`/activities?projectId=${pid}`); t('activités filtre projet',r.s===200,D(r));

// ---- JALONS
const ms={projectId:pid,title:'Jalon '+rnd,dueDate:'2026-06-01'};
r=await call('POST','/milestones',ms); t('jalon create',r.s===201,D(r)); const mid=g(r,'milestone')?.id;
r=await call('POST','/milestones',{...ms,title:''}); t('jalon sans titre = 400',r.s===400,D(r));
r=await call('POST','/milestones',{...ms,projectId:999999}); t('jalon projet inexistant = 404',r.s===404,D(r));
r=await call('POST','/milestones',{...ms,dueDate:'pas-une-date'}); t('jalon date invalide = 400',r.s===400,D(r));
r=await call('POST','/milestones',{projectId:pid,title:'Sans date'}); t('jalon sans date accepté',r.s===201,D(r)); const mid2=g(r,'milestone')?.id;
r=await call('PUT',`/milestones/${mid}`,{...ms,completedAt:new Date().toISOString()}); t('jalon complété',r.s===200,D(r));
r=await call('GET','/milestones/999999'); t('jalon inconnu = 404',r.s===404,D(r));

// ---- BENEFICIAIRES
const ben={projectId:pid,firstName:'Rakoto',lastName:'Jean',gender:'MALE',age:30,zoneId:zid,vulnerable:true,homeLatitude:-21.46,homeLongitude:47.09,householdSize:6,monthlyIncome:50000,childrenUnder5:2,hasDisability:false,locality:'Ambalavao'};
r=await call('POST','/beneficiaries',ben); t('bénéficiaire create (avec zone)',r.s===201,D(r)); const bid=g(r,'beneficiary')?.id;
r=await call('POST','/beneficiaries',{...ben,projectId:undefined}); t('bénéficiaire sans projet = 400',r.s===400,D(r));
r=await call('POST','/beneficiaries',{...ben,projectId:999999}); t('bénéficiaire projet inexistant = 404',r.s===404,D(r));
r=await call('POST','/beneficiaries',{...ben,zoneId:999999}); t('bénéficiaire zone inexistante = 400/404/409 (pas 500)',[400,404,409].includes(r.s),D(r));
r=await call('POST','/beneficiaries',{...ben,gender:'XX'}); t('bénéficiaire genre invalide = 400',r.s===400,D(r));
r=await call('POST','/beneficiaries',{...ben,age:-5}); t('bénéficiaire âge négatif = 400',r.s===400,D(r));
r=await call('POST','/beneficiaries',{...ben,homeLatitude:200}); t('bénéficiaire latitude hors limites = 400',r.s===400,D(r));
r=await call('GET',`/beneficiaries/${bid}`); t('bénéficiaire get',r.s===200,D(r));
r=await call('GET','/beneficiaries/999999'); t('bénéficiaire inconnu = 404',r.s===404,D(r));
r=await call('GET','/beneficiaries?vulnerable=true&search=Rakoto'); t('bénéficiaire filtre',r.s===200,D(r));
r=await call('PUT',`/beneficiaries/${bid}`,{...ben,vulnerable:false}); t('bénéficiaire update',r.s===200,D(r));
r=await call('DELETE',`/zones/${zid}`); t('zone avec bénéficiaires: suppression propre (200/409, pas 500)',[200,204,409].includes(r.s),D(r));

console.log(`PASS ${pass}  FAIL ${fail.length}`); fail.forEach(f=>console.log(' ✗',f));
globalThis.ctx={pid,bid,did,zid};
// persistance des champs ménage
const gb=await call('GET',`/beneficiaries/${ctx.bid}`); const b=gb.j?.data??gb.j?.beneficiary;
console.log('champs ménage relus:',JSON.stringify({locality:b?.locality,homeLatitude:b?.homeLatitude,householdSize:b?.householdSize,monthlyIncome:b?.monthlyIncome,childrenUnder5:b?.childrenUnder5,zoneId:b?.zoneId}));
